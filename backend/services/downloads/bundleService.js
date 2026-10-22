const crypto = require('crypto');
const fs = require('fs');
const { Readable } = require('stream');
const mongoose = require('mongoose');
const archiver = require('archiver');
const Document = require('../../models/Document');
const DownloadBundle = require('../../models/DownloadBundle');
const Organisme = require('../../models/Organisme');
const ParcoursType = require('../../models/ParcoursType');
const Matiere = require('../../models/Matiere');
const Noeud = require('../../models/Noeud');
const Structure = require('../../models/Structure');
const billingConfig = require('../../config/billing');
const storageConfig = require('../../config/storage');
const getStorageProvider = require('../../storage');
const AppError = require('../../utils/errors');
const { compactSlug } = require('../../utils/slug');
const quota = require('../billing/quotaService');
const { chargeRecent, getQuotaStatus, requiresSubscription, logDownload } = require('../billing/downloadGuard');
const { loadNodeChains, resolveAccessForDocuments, yearOfChain } = require('../access/documentYear');
const { resolveLegacyLocalPath } = require('../documentService');

/*
 * Téléchargement groupé. Un même parcours pour le web (archive ZIP) et le mobile (liens
 * individuels enregistrés dans l'application) :
 *   1. scope    : documents publiés d'un organisme, d'un cycle (type de parcours), d'une année,
 *                 de matières — avec année, gratuité et état du quota ;
 *   2. preview  : contrôle d'une sélection (même organisme, un seul cycle, quota) sans rien consommer ;
 *   3. create   : nouveau contrôle + réservation atomique du quota, lien à usage unique ;
 *   4. archive / files : livraison ; quota confirmé si livré, rendu sinon.
 */

const { downloads } = billingConfig;
const NO_CYCLE = 'none';
const MAX_SCOPE_DOCUMENTS = 500;

const id = (value) => (value?._id || value ? String(value?._id || value) : null);
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || '')) && /^[a-f0-9]{24}$/i.test(String(value));
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const publishedSubjectFilter = {
  status: 'approved',
  type: 'sujet',
  noeudId: { $ne: null },
  matiereId: { $ne: null },
  isDeleted: { $ne: true },
};

const correctionsOf = (subjectIds) => ({
  status: 'approved',
  isDeleted: { $ne: true },
  $or: [
    { type: 'correction', sujetParentId: { $in: subjectIds } },
    { documentType: 'corrige', correctionFor: { $in: subjectIds } },
  ],
});

const isCorrection = (document) => document?.type === 'correction' || document?.documentType === 'corrige';
const parentIdOf = (document) => id(document.sujetParentId || document.correctionFor);

/** Organisme désigné par son identifiant ou son alias d'URL (« inphb », « inp-hb », « concours-police »). */
const findOrganisme = async (value) => {
  const raw = String(value || '').trim();
  if (!raw) throw new AppError('Choisissez un organisme.', 400, undefined, 'ORGANISME_REQUIRED');
  if (isObjectId(raw)) {
    const byId = await Organisme.findById(raw).lean();
    if (byId) return byId;
  }
  const wanted = compactSlug(raw);
  const all = await Organisme.find({}).select('nom slug logo').lean();
  const match = all.find((item) => compactSlug(item.slug || item.nom) === wanted);
  if (!match) throw new AppError('Cet organisme est introuvable.', 404, undefined, 'ORGANISME_NOT_FOUND');
  return match;
};

/** Fiches des documents (sujets et corrigés) : titre, matière, année, chemin, cycle, gratuité. */
const describeDocuments = async (documents, { subjectsById = new Map() } = {}) => {
  const leafOf = (document) => id(document.noeudId) || id(subjectsById.get(parentIdOf(document))?.noeudId);
  const [access, { chainOf, nodesById }] = await Promise.all([
    resolveAccessForDocuments(documents),
    loadNodeChains(documents.map(leafOf)),
  ]);
  const matiereIds = [...new Set(documents.map((document) => id(document.matiereId) || id(subjectsById.get(parentIdOf(document))?.matiereId)).filter(Boolean))];
  const parcoursIds = [...new Set(documents.map((document) => id(document.parcoursTypeId) || id(subjectsById.get(parentIdOf(document))?.parcoursTypeId)).filter(Boolean))];
  const [matieres, parcoursTypes] = await Promise.all([
    Matiere.find({ _id: { $in: matiereIds } }).select('nom').lean(),
    ParcoursType.find({ _id: { $in: parcoursIds } }).select('nom').lean(),
  ]);
  const matiereById = new Map(matieres.map((item) => [id(item._id), item]));
  const parcoursById = new Map(parcoursTypes.map((item) => [id(item._id), item]));

  return documents.map((document) => {
    const parent = isCorrection(document) ? subjectsById.get(parentIdOf(document)) : null;
    const chain = chainOf(leafOf(document));
    const matiereId = id(document.matiereId) || id(parent?.matiereId);
    const parcoursTypeId = id(document.parcoursTypeId) || id(parent?.parcoursTypeId);
    const documentAccess = access.get(id(document._id));
    const subjectTitle = parent?.title || parent?.titre || parent?.originalFileName;
    return {
      _id: id(document._id),
      kind: isCorrection(document) ? 'corrige' : 'sujet',
      subjectId: isCorrection(document) ? parentIdOf(document) : null,
      title: isCorrection(document)
        ? `Corrigé — ${subjectTitle || document.originalFileName || 'sujet'}`
        : (document.title || document.titre || document.originalFileName),
      organismeId: chain.length ? id(chain[0].organismeId) : null,
      parcoursType: parcoursTypeId ? { _id: parcoursTypeId, nom: parcoursById.get(parcoursTypeId)?.nom || '' } : null,
      matiere: matiereId ? { _id: matiereId, nom: matiereById.get(matiereId)?.nom || '' } : null,
      path: chain.map((node) => node.nom),
      year: documentAccess.year,
      yearKnown: documentAccess.yearKnown,
      tier: documentAccess.tier,
      freeQuotaEligible: documentAccess.freeQuotaEligible,
      premiumOnly: requiresSubscription(document),
      correctionIncludedInPdf: Boolean(document.correctionIncludedInPdf),
      fileSize: document.fileSize || 0,
      extension: document.extension || '.pdf',
      available: Boolean(document.storageKey) || document.storageProvider === 'legacy-local',
      // Interne au serveur, jamais renvoyé au client (voir publicItem).
      leafId: leafOf(document),
      nodes: nodesById,
    };
  });
};

const publicItem = ({ leafId, nodes, ...item }) => item;

/**
 * Documents publiés d'un périmètre. Un organisme qui a des cycles (types de parcours) exige
 * d'en choisir un : un téléchargement groupé ne mélange jamais plusieurs cycles.
 */
const listScope = async ({ organisme: organismeRef, parcoursTypeId, annee, matiereIds, includeCorrections = true } = {}, actor) => {
  const organisme = await findOrganisme(organismeRef);
  const [structure, nodes, parcoursTypes] = await Promise.all([
    Structure.findOne({ organismeId: organisme._id }).lean(),
    Noeud.find({ organismeId: organisme._id }).select('_id').lean(),
    ParcoursType.find({ organismeId: organisme._id }).select('nom').sort('nom').lean(),
  ]);

  const baseFilter = { ...publishedSubjectFilter, noeudId: { $in: nodes.map((node) => node._id) } };
  const cycleCounts = await Document.aggregate([
    { $match: baseFilter },
    { $group: { _id: '$parcoursTypeId', count: { $sum: 1 } } },
  ]);
  const countByCycle = new Map(cycleCounts.map((row) => [row._id ? id(row._id) : NO_CYCLE, row.count]));
  const cycles = [
    ...parcoursTypes.filter((item) => countByCycle.has(id(item._id))).map((item) => ({ _id: id(item._id), nom: item.nom, subjectCount: countByCycle.get(id(item._id)) })),
    ...(countByCycle.has(NO_CYCLE) && parcoursTypes.length ? [{ _id: NO_CYCLE, nom: 'Sans cycle précisé', subjectCount: countByCycle.get(NO_CYCLE) }] : []),
  ];
  const requiresCycle = cycles.length > 1;
  const status = await getQuotaStatus(actor);
  const header = {
    organisme: { _id: id(organisme._id), nom: organisme.nom, slug: organisme.slug, logo: organisme.logo || null },
    levels: structure?.niveaux || [],
    cycles,
    requiresCycle,
    quota: publicQuota(status),
  };

  let cycle = null;
  if (parcoursTypeId) {
    cycle = cycles.find((item) => item._id === String(parcoursTypeId));
    if (!cycle) throw new AppError('Ce cycle n’existe pas pour cet organisme ou n’a pas de sujet publié.', 404, undefined, 'CYCLE_NOT_FOUND');
  } else if (requiresCycle) {
    return { ...header, cycle: null, documents: [], facets: { years: [], matieres: [] }, totals: { documents: 0, free: 0, recent: 0 } };
  } else if (cycles.length === 1) {
    [cycle] = cycles;
  }

  const filter = { ...baseFilter };
  if (cycle) filter.parcoursTypeId = cycle._id === NO_CYCLE ? null : cycle._id;
  const subjects = await Document.find(filter)
    .select('title titre originalFileName noeudId matiereId parcoursTypeId correctionIncludedInPdf fileSize extension storageKey storageProvider isPremmuim type documentType dateAjout')
    .sort({ dateAjout: -1, _id: -1 })
    .limit(MAX_SCOPE_DOCUMENTS)
    .lean();
  const subjectsById = new Map(subjects.map((subject) => [id(subject._id), subject]));
  const corrections = includeCorrections && subjects.length
    ? await Document.find(correctionsOf(subjects.map((subject) => subject._id)))
      .select('sujetParentId correctionFor originalFileName fileSize extension storageKey storageProvider isPremmuim type documentType noeudId matiereId parcoursTypeId')
      .lean()
    : [];

  const described = await describeDocuments([...subjects, ...corrections], { subjectsById });
  const facets = {
    years: [...new Set(described.map((item) => item.year).filter(Number.isInteger))].sort((a, b) => b - a),
    matieres: [...new Map(described.filter((item) => item.matiere).map((item) => [item.matiere._id, item.matiere])).values()]
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    hasUnknownYear: described.some((item) => !item.yearKnown),
  };

  const wantedYear = annee === undefined || annee === null || annee === '' ? null : String(annee);
  const wantedMatieres = new Set(String(matiereIds || '').split(',').map((value) => value.trim()).filter(Boolean));
  const visible = described
    .filter((item) => !wantedYear || (wantedYear === 'inconnue' ? !item.yearKnown : String(item.year) === wantedYear))
    .filter((item) => !wantedMatieres.size || wantedMatieres.has(item.matiere?._id))
    // Corrigé juste après son sujet ; sujets du plus récent au plus ancien, puis par matière.
    .sort((a, b) => (b.year || 0) - (a.year || 0)
      || (a.matiere?.nom || '').localeCompare(b.matiere?.nom || '', 'fr')
      || String(a.subjectId || a._id).localeCompare(String(b.subjectId || b._id))
      || (a.kind === 'sujet' ? -1 : 1))
    .map(publicItem);

  return {
    ...header,
    cycle,
    documents: visible,
    facets,
    totals: {
      documents: visible.length,
      free: visible.filter((item) => item.tier === 'free').length,
      recent: visible.filter((item) => item.tier === 'recent').length,
    },
  };
};

const publicQuota = ({ documentIds, ...status }) => status;

/**
 * Contrôle d'une sélection, sans rien consommer. Erreurs : sélection vide ou trop grande,
 * documents de plusieurs organismes ou de plusieurs cycles.
 */
const analyzeSelection = async (documentIds, actor) => {
  const ids = [...new Set((Array.isArray(documentIds) ? documentIds : []).map(String))];
  if (!ids.length) throw new AppError('Sélectionnez au moins un document.', 400, undefined, 'EMPTY_SELECTION');
  if (ids.length > downloads.bundleMaxDocuments) {
    throw new AppError(`Une opération est limitée à ${downloads.bundleMaxDocuments} documents. Réduisez votre sélection.`, 400, { max: downloads.bundleMaxDocuments }, 'BUNDLE_TOO_LARGE');
  }
  const validIds = ids.filter(isObjectId);
  const found = await Document.find({ _id: { $in: validIds }, status: 'approved', isDeleted: { $ne: true } }).lean();
  const parentIds = found.filter(isCorrection).map(parentIdOf).filter(Boolean);
  const parents = parentIds.length
    ? await Document.find({ _id: { $in: parentIds }, status: 'approved', isDeleted: { $ne: true } }).lean()
    : [];
  const subjectsById = new Map([...found.filter((item) => !isCorrection(item)), ...parents].map((item) => [id(item._id), item]));
  // Un corrigé dont le sujet n'est plus publié n'est pas livrable.
  const deliverable = found.filter((item) => !isCorrection(item) || subjectsById.has(parentIdOf(item)));
  const described = await describeDocuments(deliverable, { subjectsById });
  const items = described.filter((item) => item.organismeId);
  const unavailable = ids.filter((documentId) => !items.some((item) => item._id === documentId));

  if (!items.length) {
    throw new AppError('Aucun des documents sélectionnés n’est disponible.', 404, { unavailable }, 'SELECTION_UNAVAILABLE');
  }
  const organismes = new Set(items.map((item) => item.organismeId));
  if (organismes.size > 1) {
    throw new AppError('Une opération ne peut concerner qu’un seul organisme. Lancez un téléchargement par organisme.', 400, undefined, 'MIXED_ORGANISMES');
  }
  const cycles = new Set(items.map((item) => item.parcoursType?._id || NO_CYCLE));
  if (cycles.size > 1) {
    throw new AppError(
      'Votre sélection mélange plusieurs cycles. Un téléchargement groupé ne peut concerner qu’un seul cycle : choisissez-en un, puis lancez un autre téléchargement pour le suivant.',
      400,
      { cycles: [...new Map(items.map((item) => [item.parcoursType?._id || NO_CYCLE, item.parcoursType || { _id: NO_CYCLE, nom: 'Sans cycle précisé' }])).values()] },
      'MIXED_CYCLES'
    );
  }

  const status = await getQuotaStatus(actor);
  const granted = new Set(status.documentIds || []);
  const recent = items.filter((item) => item.tier === 'recent');
  // Sans abonnement : sujets >= 2021, d'année inconnue ou « premium » réservés aux abonnés.
  const blocked = actor.plan === 'subscriber' || actor.plan === 'unlimited' ? [] : recent.filter((item) => item.premiumOnly || !item.freeQuotaEligible);
  const chargeable = recent.filter((item) => !blocked.includes(item));
  const toCharge = status.unlimited ? [] : chargeable.filter((item) => !granted.has(item._id));
  const remaining = status.unlimited ? Infinity : status.remaining;
  const overflow = Math.max(0, toCharge.length - remaining);

  return {
    items,
    unavailable,
    blocked,
    toCharge,
    status,
    summary: {
      documents: items.map((item) => ({ ...publicItem(item), alreadyGranted: granted.has(item._id) })),
      unavailable,
      blocked: blocked.map((item) => item._id),
      counts: {
        total: items.length,
        free: items.filter((item) => item.tier === 'free').length,
        recent: recent.length,
        recentAlreadyGranted: recent.length - toCharge.length - blocked.length,
        recentToCharge: toCharge.length,
        blocked: blocked.length,
      },
      quota: publicQuota(status),
      overflow,
      canProceed: overflow === 0 && blocked.length === 0,
      organismeId: [...organismes][0],
      cycle: items[0].parcoursType,
    },
  };
};

const previewSelection = async (documentIds, actor) => (await analyzeSelection(documentIds, actor)).summary;

const selectionExceedsError = (summary, actor) => {
  const { counts, quota: status, overflow } = summary;
  const plural = (count, word) => `${count} ${word.split(' ').map((part) => `${part}${count > 1 ? 's' : ''}`).join(' ')}`;
  const subscriber = actor.plan === 'subscriber';
  // Sans abonnement, seuls les sujets 2010-2020 consomment le quota.
  const what = subscriber ? 'sujet récent' : 'sujet';
  const range = subscriber ? '' : ` de ${status.freeUntilYear + 1} à ${status.freeQuotaUntilYear}`;
  let message;
  if (status.remaining === 0) {
    message = subscriber
      ? `Votre quota de sujets récents est épuisé pour le moment. Retirez les ${plural(counts.recentToCharge, what)} de votre sélection pour télécharger les documents gratuits, ou attendez le renouvellement de votre quota.`
      : `Vous avez utilisé vos ${status.limit} téléchargements gratuits. Retirez les ${plural(counts.recentToCharge, what)}${range} de votre sélection pour télécharger les sujets de ${status.freeUntilYear} et avant, ou souscrivez à un abonnement pour continuer.`;
  } else {
    message = `Votre sélection contient ${plural(counts.recentToCharge, what)}${range}, mais il vous reste seulement ${plural(status.remaining, 'téléchargement')} ${subscriber ? 'pour le moment' : 'gratuits'}. Désélectionnez ${plural(overflow, what)}${range} pour continuer.${subscriber ? ' Les autres pourront être téléchargés lorsque votre quota sera renouvelé.' : ''}`;
  }
  return new AppError(message.replace(/\s+/g, ' '), 429, summary, 'SELECTION_EXCEEDS_QUOTA');
};

/** Valide, réserve le quota (atomique) et crée le lien à usage unique. */
const createBundle = async (documentIds, actor, { delivery = 'zip' } = {}) => {
  const analysis = await analyzeSelection(documentIds, actor);
  const { summary } = analysis;
  if (analysis.blocked.length) {
    throw new AppError(
      'Certains sujets de votre sélection sont réservés aux utilisateurs disposant d’un abonnement valide (sujets de 2021 et après, ou d’année inconnue). Retirez-les ou souscrivez à un abonnement.',
      403,
      summary,
      'SUBSCRIPTION_REQUIRED'
    );
  }
  if (summary.overflow > 0) throw selectionExceedsError(summary, actor);

  const op = crypto.randomUUID();
  const recentIds = analysis.items.filter((item) => item.tier === 'recent').map((item) => item._id);
  let charge = { subjects: [] };
  try {
    charge = await chargeRecent(actor, recentIds, { op, reserveMinutes: downloads.bundleTtlMinutes });
  } catch (error) {
    // Requête concurrente plus rapide : le quota a changé entre le contrôle et la réservation.
    if (error.errorCode === 'DAILY_LIMIT_REACHED') {
      throw selectionExceedsError((await analyzeSelection(documentIds, actor)).summary, actor);
    }
    throw error;
  }

  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + downloads.bundleTtlMinutes * 60 * 1000);
  const first = analysis.items[0];
  const organisme = await Organisme.findById(first.organismeId).select('nom slug').lean();
  const label = [organisme?.slug || organisme?.nom, first.parcoursType?.nom].filter(Boolean).join(' ');
  await DownloadBundle.create({
    tokenHash: hashToken(token),
    op,
    subjects: charge.subjects || [],
    user: actor.user?._id || null,
    visitor: actor.user ? null : actor.visitorId,
    plan: actor.plan,
    documents: analysis.items.map((item) => item._id),
    recentDocuments: recentIds,
    chargedDocuments: charge.charged || [],
    label,
    delivery,
    expiresAt,
  });

  return {
    token,
    delivery,
    expiresAt,
    archiveUrl: `/api/downloads/bundles/${token}/archive`,
    filesUrl: `/api/downloads/bundles/${token}/files`,
    count: analysis.items.length,
    unavailable: analysis.unavailable,
    counts: summary.counts,
  };
};

const logBundleItem = (bundle, item, req) => logDownload(
  { user: bundle.user ? { _id: bundle.user } : null, visitorId: bundle.visitor },
  { _id: item._id },
  req,
  {
    plan: bundle.plan,
    access: { tier: item.tier, year: item.year, organismeId: item.organismeId },
    charged: (bundle.chargedDocuments || []).some((documentId) => id(documentId) === item._id),
  }
);

/** Lien à usage unique : passe « ready » → « streaming » une seule fois. */
const claimBundle = async (token) => {
  const bundle = await DownloadBundle.findOneAndUpdate(
    { tokenHash: hashToken(token), status: 'ready', expiresAt: { $gt: new Date() } },
    { $set: { status: 'streaming' } },
    { new: true }
  ).lean();
  if (!bundle) {
    throw new AppError('Ce lien de téléchargement a expiré ou a déjà été utilisé. Relancez le téléchargement depuis votre sélection.', 410, undefined, 'BUNDLE_EXPIRED');
  }
  return bundle;
};

const confirmBundle = async (bundle, delivered, missing = []) => {
  if (missing.length) await Promise.all(bundle.subjects.map((subject) => quota.release(subject, bundle.op, missing)));
  await Promise.all(bundle.subjects.map((subject) => quota.confirm(subject, bundle.op)));
  await DownloadBundle.updateOne({ _id: bundle._id }, { $set: { status: 'done', delivered, missing } });
};

const failBundle = async (bundle) => {
  await Promise.all(bundle.subjects.map((subject) => quota.release(subject, bundle.op)));
  await DownloadBundle.updateOne({ _id: bundle._id }, { $set: { status: 'failed' } });
};

/** Nom de fichier sûr dans l'archive : ASCII, sans séparateurs ni caractères réservés. */
const safeFileName = (value, fallback = 'document') => {
  const cleaned = String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 110)
    .trim();
  return cleaned || fallback;
};

const uniqueName = (used, base, extension) => {
  let name = `${base}${extension}`;
  for (let index = 2; used.has(name.toLowerCase()); index += 1) name = `${base} (${index})${extension}`;
  used.add(name.toLowerCase());
  return name;
};

const archiveEntryName = (item) => [
  item.year || 'Annee inconnue',
  item.matiere?.nom,
  item.title,
].filter(Boolean).map((part) => safeFileName(part)).join(' - ');

/** Flux lisible du fichier d'un document (stockage objet via URL signée, ou ancien fichier local). */
const openDocumentStream = async (document) => {
  if (document.storageKey && document.storageProvider !== 'legacy-local') {
    const url = await getStorageProvider().generateSignedUrl(document.storageKey, 300, { contentType: document.mimeType });
    const response = await fetch(url, { signal: AbortSignal.timeout(60 * 1000) });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    return Readable.fromWeb(response.body);
  }
  const localPath = await resolveLegacyLocalPath(document);
  if (!localPath) throw new Error('fichier local introuvable');
  return fs.createReadStream(localPath);
};

/**
 * Archive ZIP servie en flux : un fichier à la fois, sans compression (PDF déjà compressés),
 * jamais l'archive entière en mémoire. Fichier indisponible : ignoré, listé dans LISEZ-MOI.txt
 * et non décompté. Interruption avant la fin : tout le quota de l'opération est rendu.
 */
const streamArchive = async (token, req, res) => {
  const bundle = await claimBundle(token);
  const documents = await Document.find({ _id: { $in: bundle.documents } }).lean();
  const byId = new Map(documents.map((document) => [id(document._id), document]));
  const parents = await Document.find({ _id: { $in: documents.filter(isCorrection).map(parentIdOf).filter(Boolean) } }).lean();
  const described = await describeDocuments(bundle.documents.map((documentId) => byId.get(id(documentId))).filter(Boolean), {
    subjectsById: new Map(parents.map((parent) => [id(parent._id), parent])),
  });

  const date = new Date().toISOString().slice(0, 10);
  const archiveName = `fatafalta-${safeFileName(bundle.label, 'sujets').toLowerCase().replace(/\s+/g, '-')}-${date}.zip`;
  res.status(200);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Bundle-Files', String(described.length));
  // En-têtes envoyés tout de suite : le navigateur affiche le téléchargement dès le début.
  res.flushHeaders();

  const archive = archiver('zip', { store: true });
  let finished = false;
  let aborted = false;
  res.on('close', () => {
    if (!finished) {
      aborted = true;
      archive.abort();
      failBundle(bundle).catch((error) => console.error(`[BUNDLE] Annulation impossible ${bundle._id}: ${error.message}`));
    }
  });
  archive.on('warning', (error) => console.warn(`[BUNDLE] ${bundle._id} ${error.message}`));
  archive.on('error', (error) => {
    console.error(`[BUNDLE] Archive ${bundle._id} interrompue : ${error.message}`);
    res.destroy(error);
  });
  archive.pipe(res);

  const usedNames = new Set();
  const delivered = [];
  const missing = [];
  for (const item of described) {
    if (aborted) return;
    const document = byId.get(item._id);
    try {
      const stream = await openDocumentStream(document);
      const entryDone = new Promise((resolve, reject) => {
        archive.once('entry', resolve);
        stream.once('error', reject);
      });
      archive.append(stream, { name: uniqueName(usedNames, archiveEntryName(item), item.extension || '.pdf') });
      await entryDone;
      delivered.push(item);
    } catch (error) {
      if (aborted) return;
      console.warn(`[BUNDLE] ${bundle._id} document=${item._id} indisponible : ${error.message}`);
      missing.push(item);
    }
  }

  if (missing.length) {
    archive.append([
      'Fatafalta — documents non inclus',
      '',
      'Ces documents étaient momentanément indisponibles. Ils ne sont pas décomptés de votre quota :',
      ...missing.map((item) => `- ${item.title}${item.year ? ` (${item.year})` : ''}`),
      '',
      'Vous pourrez les télécharger plus tard depuis leur fiche sur Fatafalta.',
    ].join('\r\n'), { name: uniqueName(usedNames, 'LISEZ-MOI', '.txt') });
  }

  res.once('finish', () => {
    finished = true;
    confirmBundle(bundle, delivered.length, missing.map((item) => item._id))
      .then(() => Promise.all(delivered.map(async (item) => {
        await Document.updateOne({ _id: item._id }, { $inc: { downloads: 1 } }, { timestamps: false });
        await logBundleItem(bundle, item, req);
      })))
      .catch((error) => console.error(`[BUNDLE] Confirmation impossible ${bundle._id}: ${error.message}`));
  });
  await archive.finalize();
};

/**
 * Livraison mobile : un lien signé par document, enregistré un par un dans l'application.
 * Les liens sont délivrés en une fois : le quota est confirmé à la remise.
 */
const deliverFiles = async (token, req) => {
  const bundle = await claimBundle(token);
  const documents = await Document.find({ _id: { $in: bundle.documents } }).lean();
  const byId = new Map(documents.map((document) => [id(document._id), document]));
  const parents = await Document.find({ _id: { $in: documents.filter(isCorrection).map(parentIdOf).filter(Boolean) } }).lean();
  const described = await describeDocuments(bundle.documents.map((documentId) => byId.get(id(documentId))).filter(Boolean), {
    subjectsById: new Map(parents.map((parent) => [id(parent._id), parent])),
  });

  const usedNames = new Set();
  const files = [];
  const missing = [];
  for (const item of described) {
    const document = byId.get(item._id);
    if (!document.storageKey || document.storageProvider === 'legacy-local') {
      missing.push(item);
      continue;
    }
    try {
      const fileName = uniqueName(usedNames, archiveEntryName(item), item.extension || '.pdf');
      const url = await getStorageProvider().generateSignedUrl(document.storageKey, storageConfig.downloadUrlExpiration, {
        contentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        contentType: document.mimeType,
      });
      files.push({ ...publicItem(item), url, fileName, mimeType: document.mimeType, originalFileName: document.originalFileName });
    } catch (error) {
      missing.push(item);
    }
  }

  if (!files.length) {
    await failBundle(bundle);
    throw new AppError('Les fichiers sont momentanément indisponibles. Votre quota n’a pas été utilisé.', 503, undefined, 'FILES_UNAVAILABLE');
  }
  await confirmBundle(bundle, files.length, missing.map((item) => item._id));
  await Promise.all(files.map((file) => Document.updateOne({ _id: file._id }, { $inc: { downloads: 1 } }, { timestamps: false })));
  await Promise.all(files.map((file) => logBundleItem(bundle, file, req)));
  return { files, missing: missing.map(publicItem), expiresIn: storageConfig.downloadUrlExpiration };
};

module.exports = {
  NO_CYCLE,
  findOrganisme,
  listScope,
  previewSelection,
  createBundle,
  streamArchive,
  deliverFiles,
  safeFileName,
  uniqueName,
  archiveEntryName,
};

/**
 * Administration : sujets publiés dont l'année est indéterminable (donc jamais gratuits).
 * Correction : rattacher le sujet à un nœud d'année, ou renommer le nœud (« 2021 »).
 */
const listYearIssues = async ({ limit = 200 } = {}) => {
  const subjects = await Document.find({ status: 'approved', isDeleted: { $ne: true }, type: { $ne: 'correction' }, documentType: { $ne: 'corrige' } })
    .select('title titre originalFileName noeudId matiereId parcoursTypeId createdAt')
    .sort('-createdAt')
    .limit(2000)
    .lean();
  const described = await describeDocuments(subjects);
  const issues = described.filter((item) => !item.yearKnown);
  const organismes = await Organisme.find({ _id: { $in: [...new Set(issues.map((item) => item.organismeId).filter(Boolean))] } }).select('nom').lean();
  const organismeName = new Map(organismes.map((item) => [id(item._id), item.nom]));
  return {
    total: issues.length,
    freeUntilYear: downloads.freeUntilYear,
    freeQuotaUntilYear: downloads.freeQuotaUntilYear,
    data: issues.slice(0, limit).map((item) => ({
      ...publicItem(item),
      organisme: item.organismeId ? { _id: item.organismeId, nom: organismeName.get(item.organismeId) || '' } : null,
      reason: item.organismeId ? 'Aucun niveau « Année » lisible dans son classement' : 'Sujet non rattaché au catalogue (ancien modèle)',
    })),
  };
};

module.exports.listYearIssues = listYearIssues;
