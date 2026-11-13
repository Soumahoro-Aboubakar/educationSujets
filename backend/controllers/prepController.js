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


// ETag calculé sur la représentation exacte (langue et associations vidéo comprises).
const sendVersioned = (req, res, data, meta = {}, privateContent = false) => {
  const body = { success: true, data, meta: { generation: content.load().manifest.generation, schemaVersion: 1, ...meta } };
  const etag = `"${require('../services/prep/publicationService').hash(body)}"`;
  res.set('Cache-Control', privateContent ? 'private, no-cache' : 'public, max-age=0, must-revalidate');
  res.set('ETag', etag);
  if (privateContent) res.vary('Authorization').vary('X-Prep-Token');
  if (req.headers['if-none-match']?.split(',').map(v => v.trim()).includes(etag)) return res.status(304).end();
  return res.json(body);
};
exports.getManifest = asyncHandler(async (req, res) => sendVersioned(req, res, content.load().manifest));

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
  const { identite, retour } = await identity.declare(req.body || {}, req.user, req.headers['x-prep-token']);
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
  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, data: { droits: await progress.rights(identite, req.user), serveurJour: progress.today() } });
});

// GET /api/prep/catalogue — chaque cycle porte la vidéo de présentation du concours (ou null)
exports.getCatalogue = asyncHandler(async (req, res) => {
  const [catalogue, index] = await Promise.all([content.catalogue(), videos.index()]);
  const data = catalogue.map((org) => ({
    ...org,
    cycles: org.cycles.map((cycle) => ({ ...cycle, video: videos.find(index, 'concours', cycle.programme, 'fr', content.getProgramme(cycle.programme)?.revision) })),
  }));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 100));
  sendVersioned(req, res, data.slice((page - 1) * limit, page * limit), { pagination: { page, limit, total: data.length, pages: Math.ceil(data.length / limit) } });
});

// GET /api/prep/videos — index compact des vidéos publiées (lecture seule ; écriture : script local)
exports.getVideos = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, data: videos.forSnapshot(await videos.index(), content.load()) });
});

// GET /api/prep/programmes/:code
exports.getProgramme = asyncHandler(async (req, res) => {
  const programme = await content.historical('programme', req.params.code, req.query.revision);
  if (!programme) throw new AppError('Programme introuvable', 404);
  const index = await videos.index();
  const modules = {};
  const linkedModules = await content.programmeModules(programme, req.query.revision);
  content.publishedModules(programme).forEach((code) => {
    const m = linkedModules[code];
    if (!m) return;
    modules[code] = {
      code, revision: m.revision || 0, hash: m.hash, titre: m.titre, resume: m.resume, matiere: m.matiere, duree: m.duree, stats: m.stats,
      versions: core.moduleVersions(m),
      // Vidéo explicative de chaque leçon (version par défaut) ; null sans vidéo.
      lecons: m.lecons.map((l) => ({ code: l.code, titre: l.titre, duree: l.duree, video: videos.find(index, 'lecon', l.code, 'fr', m.revision) })),
    };
  });
  sendVersioned(req, res, { programme: { ...programme, video: videos.find(index, 'concours', programme.code, 'fr', programme.revision) }, modules });
});

// GET /api/prep/modules/:code?version=en — chaque leçon porte sa vidéo (null sans vidéo)
exports.getModule = asyncHandler(async (req, res) => {
  const mod = await content.historical('module', req.params.code, req.query.revision);
  if (!mod) throw new AppError('Module introuvable', 404);
  const identite = await requireIdentity(req);
  const droits = await progress.rights(identite, req.user);
  if (!droits.accesPreparation) throw new AppError('Accès à la préparation indisponible', 403);
  res.set('Cache-Control', 'private, no-store');
  const data = content.publicModule(mod, versionOf(req.query.version));
  const index = await videos.index();
  sendVersioned(req, res, { ...data, lecons: data.lecons.map((l) => ({ ...l, video: videos.find(index, 'lecon', l.code, data.version, mod.revision) })) }, {}, true);
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

// GET /api/prep/progressions?depuis=ISO&limit=50 — états privés de l'identité (lot 5, lecture seule)
exports.getProgressions = asyncHandler(async (req, res) => {
  const identite = await requireIdentity(req);
  const out = await progress.listProgress(identite, { since: typeof req.query.depuis === 'string' && !Number.isNaN(Date.parse(req.query.depuis)) ? req.query.depuis : null, limit: parseInt(req.query.limit, 10) || 50 });
  res.set('Cache-Control', 'private, no-store');
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
  if (!droits.accesPreparation || (!droits.abonne && droits.essai.iaRestantes <= 0)) {
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
    // Écriture conditionnelle (lot 5) : un conflit avec un autre appareil se rejoue une fois.
    try { await progress.finalize(doc); } catch (error) {
      if (error.code !== 'CONFLIT_REVISION') throw error;
      const fresh = await progress.loadProgress(identite, doc.programme);
      if (verdict.verdict === 'exact') fresh.etat.compteurs.raisonnementsValides += 1;
      else fresh.etat = core.markFragile(fresh.etat, req.params.code, (found.exercice.notions || [])[0], jour);
      await progress.finalize(fresh);
    }
  }
  res.json({ success: true, data: { disponible: true, ...verdict, ...reference, droits: await progress.rights(identite, req.user) } });
});

// GET /api/prep/programmes/:code/classement?periode=semaine|mois|tout
exports.ranking = asyncHandler(async (req, res) => {
  const identite = await identity.fromRequest(req);
  const { periode, limite, apres, avant, autour } = req.query;
  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, data: await progress.ranking(identite, req.params.code, { periode, limite, apres, avant, autour }) });
});

// GET /api/prep/programmes/:code/candidats?q=préfixe
exports.searchCandidates = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, data: await progress.searchCandidates(req.params.code, req.query.q, { periode: req.query.periode }) });
});

// GET /api/prep/programmes/:code/candidats/:identite
exports.candidate = asyncHandler(async (req, res) => {
  if (!/^[a-f0-9]{24}$/.test(req.params.identite)) throw new AppError('Candidat introuvable', 404);
  const viewer = await identity.fromRequest(req);
  const profil = await progress.candidateProfile(req.params.code, req.params.identite, { periode: req.query.periode, viewer });
  res.set('Cache-Control', 'private, no-store');
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
  // Charge aussi une fusion interrompue afin de pouvoir la reprendre.
  const id = identity.verifyToken(req.headers['x-prep-token']);
  const source = id && await PrepIdentite.findById(id);
  if (!source) throw new AppError('Identité de préparation invalide', 401);
  const identite = await identity.attach(source, req.user);
  res.json({ success: true, data: { token: identity.issueToken(String(identite._id)), identite: publicIdentity(identite), fusion: String(source._id) !== String(identite._id) } });
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
  // Invalide aussi les pseudonymes/avatars publics mémorisés dans la première page.
  progress.invalidateRanking();
  res.json({ success: true, data: publicIdentity(identite) });
});
