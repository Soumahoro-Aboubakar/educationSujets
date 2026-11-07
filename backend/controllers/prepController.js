const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const PrepIdentite = require('../models/PrepIdentite');
const PrepProgression = require('../models/PrepProgression');
const PrepSignalement = require('../models/PrepSignalement');
const identity = require('../services/prep/identityService');
const progress = require('../services/prep/progressService');
const content = require('../services/prep/contentService');
const reasoning = require('../services/prep/reasoningService');
const videos = require('../services/prep/videoService');
const core = require('../services/prep/shared/prepCore');

/** Version linguistique demandée (?version=en) ; « fr » par défaut. */
const versionOf = (value) => (typeof value === 'string' && /^[a-z]{2}$/.test(value) ? value : core.VERSION_PAR_DEFAUT);

/** API de la préparation aux concours — cahier des charges § 29. */

const requireIdentity = async (req) => {
  const identite = await identity.fromRequest(req);
  if (!identite) throw new AppError('Identité de préparation absente ou invalide', 401, undefined, 'PREP_IDENTITE');
  return identite;
};

const publicIdentity = (identite) => ({
  id: String(identite._id),
  pseudonyme: identite.pseudonyme,
  avatarTeinte: identite.avatarTeinte,
  visibleClassement: identite.visibleClassement,
  compte: Boolean(identite.user),
});

// POST /api/prep/appareils
exports.declareDevice = asyncHandler(async (req, res) => {
  const { identite, retour } = await identity.declare(req.body || {});
  // Un utilisateur connecté qui déclare son appareil y rattache l'identité (§ 25.5).
  if (req.user && !identite.user) { identite.user = req.user._id; await identite.save(); }
  const droits = await progress.rights(identite, req.user);
  const progressions = await PrepProgression.find({ identite: identite._id }).select('programme etat score').lean();
  res.json({
    success: true,
    data: {
      token: identity.issueToken(String(identite._id)),
      identite: publicIdentity(identite),
      retour,
      droits,
      progressions: Object.fromEntries(progressions.map((p) => [p.programme, { etat: p.etat, score: p.score }])),
      serveurJour: progress.today(),
    },
  });
});

// GET /api/prep/droits
exports.getRights = asyncHandler(async (req, res) => {
  const identite = await requireIdentity(req);
  res.json({ success: true, data: { droits: await progress.rights(identite, req.user), serveurJour: progress.today() } });
});

// GET /api/prep/catalogue — chaque cycle porte la vidéo de présentation du concours (ou null)
exports.getCatalogue = asyncHandler(async (req, res) => {
  const [catalogue, index] = await Promise.all([content.catalogue(), videos.index()]);
  const data = catalogue.map((org) => ({
    ...org,
    cycles: org.cycles.map((cycle) => ({ ...cycle, video: videos.find(index, 'concours', cycle.programme) })),
  }));
  res.json({ success: true, data });
});

// GET /api/prep/videos — index compact des vidéos publiées (lecture seule ; écriture : script local)
exports.getVideos = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, data: await videos.index() });
});

// GET /api/prep/programmes/:code
exports.getProgramme = asyncHandler(async (req, res) => {
  const programme = content.getProgramme(req.params.code);
  if (!programme) throw new AppError('Programme introuvable', 404);
  const index = await videos.index();
  const modules = {};
  content.publishedModules(programme).forEach((code) => {
    const m = content.getModule(code);
    modules[code] = {
      code, titre: m.titre, resume: m.resume, matiere: m.matiere, duree: m.duree, stats: m.stats,
      versions: core.moduleVersions(m),
      // Vidéo explicative de chaque leçon (version par défaut) ; null sans vidéo.
      lecons: m.lecons.map((l) => ({ code: l.code, titre: l.titre, duree: l.duree, video: videos.find(index, 'lecon', l.code) })),
    };
  });
  res.json({ success: true, data: { programme: { ...programme, video: videos.find(index, 'concours', programme.code) }, modules } });
});

// GET /api/prep/modules/:code?version=en — chaque leçon porte sa vidéo (null sans vidéo)
exports.getModule = asyncHandler(async (req, res) => {
  const mod = content.getModule(req.params.code);
  if (!mod) throw new AppError('Module introuvable', 404);
  const data = content.publicModule(mod, versionOf(req.query.version));
  const index = await videos.index();
  res.json({ success: true, data: { ...data, lecons: data.lecons.map((l) => ({ ...l, video: videos.find(index, 'lecon', l.code, data.version) })) } });
});

// POST /api/prep/exercices/:code/tentative — correction en ligne immédiate
exports.attempt = asyncHandler(async (req, res) => {
  const identite = await requireIdentity(req);
  const { programme, reponse, essai, indices, contexte, session, jour, cle, duree } = req.body || {};
  const out = await progress.ingest(identite, req.user, [{ type: 'tentative', programme, exercice: req.params.code, reponse, essai, indices, contexte, session, jour, cle, duree }]);
  const r = out.resultats[0];
  if (!r.ok) throw new AppError(r.message, r.erreur === 'ESSAI_EPUISE' ? 402 : 400, undefined, r.erreur);
  res.json({ success: true, data: { ...r, droits: out.droits, progression: out.progressions[programme] } });
});

// POST /api/prep/sync — actions faites hors ligne (§ 22)
exports.sync = asyncHandler(async (req, res) => {
  const identite = await requireIdentity(req);
  const actions = Array.isArray(req.body?.actions) ? req.body.actions : [];
  const out = await progress.ingest(identite, req.user, actions);
  res.json({ success: true, data: { ...out, serveurJour: progress.today() } });
});

// POST /api/prep/exercices/:code/raisonnement (§ 13)
exports.reasoning = asyncHandler(async (req, res) => {
  const identite = await requireIdentity(req);
  const found = content.getExercise(req.params.code);
  if (!found || !found.exercice.raisonnement?.actif) throw new AppError('Cet exercice ne propose pas de vérification du raisonnement', 400);
  const texte = String(req.body?.texte || '').trim();
  if (texte.length < 10) throw new AppError('Explique ton raisonnement en quelques phrases.', 400);

  const droits = await progress.rights(identite, req.user);
  if (!droits.abonne && droits.essai.iaRestantes <= 0) {
    throw new AppError('Vérification réservée aux abonnés', 402, undefined, 'IA_ABONNES');
  }
  // Cours de langue : la référence est celle de la version lue par l'élève (fr ou langue étudiée).
  const exercice = content.exerciseIn(found, versionOf(req.body?.version));
  const reference = { reference: exercice.raisonnement.reference, etapesCles: exercice.raisonnement.etapesCles };
  const verdict = await reasoning.verify({ exercice, texte });
  if (!verdict) {
    // Service indisponible : on montre la démarche de référence, sans décompter (§ 13.4).
    return res.json({ success: true, data: { disponible: false, ...reference, droits } });
  }
  if (!droits.abonne) {
    identite.essai.iaUtilisees += 1;
    await identite.save();
  }
  const jour = progress.today();
  const doc = await progress.loadProgress(identite, req.body?.programme || identite.programmeActif || '');
  if (doc.programme) {
    if (verdict.verdict === 'exact') doc.etat.compteurs.raisonnementsValides += 1;
    else doc.etat = core.markFragile(doc.etat, req.params.code, (found.exercice.notions || [])[0], jour);
    doc.markModified('etat');
    await doc.save();
  }
  res.json({ success: true, data: { disponible: true, ...verdict, ...reference, droits: await progress.rights(identite, req.user) } });
});

// GET /api/prep/programmes/:code/classement?periode=semaine|mois|tout
exports.ranking = asyncHandler(async (req, res) => {
  const identite = await identity.fromRequest(req);
  const periode = ['semaine', 'mois', 'tout'].includes(req.query.periode) ? req.query.periode : 'tout';
  res.json({ success: true, data: await progress.ranking(identite, req.params.code, { periode }) });
});

// GET /api/prep/programmes/:code/candidats/:identite
exports.candidate = asyncHandler(async (req, res) => {
  if (!/^[a-f0-9]{24}$/.test(req.params.identite)) throw new AppError('Candidat introuvable', 404);
  const profil = await progress.candidateProfile(req.params.code, req.params.identite);
  if (!profil) throw new AppError('Candidat introuvable', 404);
  res.json({ success: true, data: profil });
});

// POST /api/prep/signalements
exports.report = asyncHandler(async (req, res) => {
  const identite = await requireIdentity(req);
  const { element, motif, texte } = req.body || {};
  if (!element || !['enonce', 'reponse', 'verdict', 'pseudonyme', 'autre'].includes(motif)) throw new AppError('Signalement incomplet', 400);
  await PrepSignalement.create({ identite: identite._id, element: String(element).slice(0, 80), motif, texte: String(texte || '').slice(0, 1000) });
  res.status(201).json({ success: true });
});

// POST /api/prep/rattachement (compte requis) — § 25.5
exports.attach = asyncHandler(async (req, res) => {
  const identite = await requireIdentity(req);
  const existing = await PrepIdentite.findOne({ user: req.user._id, _id: { $ne: identite._id }, fusionneeDans: null });
  if (existing) {
    // Le compte possède déjà une identité : on fusionne l'essai de l'appareil dans celle du compte.
    const docs = await PrepProgression.find({ identite: identite._id });
    for (const doc of docs) {
      // eslint-disable-next-line no-await-in-loop
      const target = await PrepProgression.findOne({ identite: existing._id, programme: doc.programme });
      if (!target) { doc.identite = existing._id; await doc.save(); continue; } // eslint-disable-line no-await-in-loop
      const a = target.etat; const b = doc.etat;
      ['questions', 'erreurs', 'erreursCorrigees', 'secondesChancesReussies', 'raisonnementsValides'].forEach((k) => { a.compteurs[k] += b.compteurs[k] || 0; });
      [1, 2, 3].forEach((n) => { a.premierCoup[n] = [a.premierCoup[n][0] + b.premierCoup[n][0], a.premierCoup[n][1] + b.premierCoup[n][1]]; });
      Object.entries(b.scores || {}).forEach(([m, niv]) => { a.scores[m] = a.scores[m] || {}; Object.entries(niv).forEach(([n, v]) => { a.scores[m][n] = Math.max(a.scores[m][n] || 0, v); }); });
      a.modulesValides = [...new Set([...(a.modulesValides || []), ...(b.modulesValides || [])])];
      Object.assign(a.erreurs, b.erreurs); Object.assign(a.revisions, b.revisions); Object.assign(a.lecons, { ...b.lecons, ...a.lecons });
      a.joursActifs = [...new Set([...a.joursActifs, ...b.joursActifs])].sort();
      a.blancs = [...a.blancs, ...b.blancs];
      target.markModified('etat');
      await target.save(); // eslint-disable-line no-await-in-loop
      await doc.deleteOne(); // eslint-disable-line no-await-in-loop
    }
    existing.essai.jours = [...new Set([...existing.essai.jours, ...identite.essai.jours])].sort();
    existing.essai.iaUtilisees = Math.max(existing.essai.iaUtilisees, identite.essai.iaUtilisees);
    await existing.save();
    identite.fusionneeDans = existing._id;
    await identite.save();
    return res.json({ success: true, data: { token: identity.issueToken(String(existing._id)), identite: publicIdentity(existing), fusion: true } });
  }
  identite.user = req.user._id;
  await identite.save();
  res.json({ success: true, data: { token: identity.issueToken(String(identite._id)), identite: publicIdentity(identite), fusion: false } });
});

// PATCH /api/prep/profil-public (compte requis) — § 25.6
const MOTS_INTERDITS = /(^|[^\p{L}])(con|connard|pute|merde|salope?|enculé|nazi|fuck|shit|bitch)([^\p{L}]|$)/iu;
exports.updatePublicProfile = asyncHandler(async (req, res) => {
  const identite = await requireIdentity(req);
  if (!identite.user || String(identite.user) !== String(req.user._id)) throw new AppError('Crée ton compte pour modifier ton identité', 403);
  const { pseudonyme, avatarTeinte, visibleClassement } = req.body || {};
  if (pseudonyme !== undefined) {
    const p = String(pseudonyme).trim();
    if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{2,23}$/u.test(p) || MOTS_INTERDITS.test(p)) throw new AppError('Pseudonyme invalide (3 à 24 caractères, sans mot inapproprié)', 400);
    if (await PrepIdentite.exists({ pseudonyme: p, _id: { $ne: identite._id } })) throw new AppError('Ce pseudonyme est déjà pris', 409);
    identite.pseudonyme = p;
  }
  if (avatarTeinte !== undefined) identite.avatarTeinte = Math.max(0, Math.min(5, Number(avatarTeinte) || 0));
  if (visibleClassement !== undefined) identite.visibleClassement = Boolean(visibleClassement);
  await identite.save();
  res.json({ success: true, data: publicIdentity(identite) });
});
