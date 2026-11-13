const PrepProgression = require('../../models/PrepProgression');
const PrepTentative = require('../../models/PrepTentative');
const PrepAction = require('../../models/PrepAction');
const { accessSnapshot } = require('../billing/subscriptionService');
const content = require('./contentService');
const core = require('./shared/prepCore');
const leaderboard = require('./rankingService');

/**
 * Application des actions de préparation, en ligne ou différées (§ 22, § 25.5).
 * Le mobile applique les mêmes réducteurs (prepCore) pour l'affichage immédiat ; le serveur
 * rejoue chaque action à partir du contenu de référence et fait foi pour les scores et le rang.
 */

const today = () => core.dayKey(new Date());

/** Date d'action proposée par le client, recalée sur l'horloge serveur (§ 25.8). */
const trustedDay = (jour) => {
  const t = today();
  if (typeof jour !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) return t;
  if (jour > core.addDays(t, 1)) return t; // date dans le futur : horloge manipulée
  if (jour < core.addDays(t, -45)) return t; // file hors ligne trop ancienne
  return jour;
};

const PREP_ACTIONS = new Set(['tentative', 'lecon', 'session', 'blanc']);

const rights = async (identite, user) => {
  const snapshot = await accessSnapshot(user);
  const owned = !identite?.user || (user && String(identite.user) === String(user._id));
  const blocked = !owned || snapshot.accessState !== 'enabled';
  const abonne = !blocked && snapshot.capabilities.premium;
  const essai = core.trialState(identite?.essai?.jours || [], identite?.essai?.iaUtilisees || 0, today());
  const accesPreparation = !blocked && Boolean(abonne || (identite && essai.actif));
  const endOfDay = new Date(`${core.addDays(today(), 1)}T00:00:00Z`);
  return {
    ...snapshot,
    validUntil: abonne ? snapshot.validUntil : accesPreparation ? endOfDay : snapshot.checkedAt,
    capabilities: { ...snapshot.capabilities, prep: accesPreparation },
    abonne: Boolean(abonne), admin: !blocked && snapshot.admin, compte: Boolean(user), essai,
    accesPreparation, iaDisponibles: blocked ? 0 : abonne ? null : essai.iaRestantes,
  };
};

const loadProgress = async (identite, programme) => {
  let doc = await PrepProgression.findOne({ identite: identite._id, programme });
  if (!doc) doc = new PrepProgression({ identite: identite._id, programme, etat: core.emptyProgress() });
  if (!doc.etat || !doc.etat.compteurs) doc.etat = core.emptyProgress();
  return doc;
};

const finalizeFields = async (doc) => {
  const prog = content.getProgramme(doc.programme);
  const total = prog ? content.publishedModules(prog).length : 0;
  const t = today();
  const semaine = core.addDays(t, -((new Date(`${t}T00:00:00Z`).getUTCDay() + 6) % 7));
  if (doc.semaineReference !== semaine) {
    // Début d'une nouvelle semaine : on mémorise le rang de référence pour la variation ▲ / ▼ (§ 19).
    doc.rangSemainePrecedente = doc.isNew ? null : (await PrepProgression.countDocuments({ programme: doc.programme, score: { $gt: doc.score } }).maxTimeMS(3000)) + 1;
    doc.scoreSemainePrecedente = doc.score;
    doc.semaineReference = semaine;
  }
  doc.score = core.rankingScore(core.rankingInput(doc.etat, total, t));
  doc.stats = { ...core.publicStats(doc.etat), serie: core.currentStreak(doc.etat, t) };
  doc.matieresFortes = prog ? prog.matieres.filter((m) => m.modules.some((x) => (doc.etat.modulesValides || []).includes(x.code))).map((m) => m.nom) : [];
  doc.derniereActivite = new Date();
  return doc;
};

/** Ancien point d'entrée (fusion d'identités, migrations) : calcul + écriture conditionnelle. */
const finalize = async (doc) => {
  if (!doc.appliquees) doc.appliquees = [];
  return saveProgress(doc);
};

/**
 * Corrige une tentative avec la clé du serveur. Renvoie la correction (clé et explication)
 * seulement quand la question est terminée : juste, ou fausse en seconde chance / concours blanc.
 */
const gradeAttempt = (exerciceCode, { reponse, essai = 1, indices = 0, contexte = 'niveau' }) => {
  const found = content.getExercise(exerciceCode);
  if (!found) return null;
  const { exercice, module } = found;
  const result = core.validate(exercice, reponse);
  const points = core.pointsTentative({ score: result.score, essai, indices });
  const terminee = result.correct || essai === 2 || contexte === 'blanc' || contexte === 'test';
  return {
    exercice, module, result, points, terminee,
    correction: terminee ? { cle: exercice.cle, explication: exercice.explication, raisonnement: exercice.raisonnement || null } : null,
    miniCours: !terminee ? exercice.miniCours : null,
  };
};

/** Erreurs définitives (l'action ne réussira jamais telle quelle) ; les autres sont temporaires. */
const DEFINITIVE = new Set(['ESSAI_EPUISE', 'PROGRAMME', 'EXERCICE', 'SESSION', 'ACTION', 'LECON', 'INVALIDE']);
const MAX_APPLIQUEES = 3000;
const MAX_TENTATIVES_CAS = 4;
const rejected = (code, message) => Object.assign(new Error(message), { code });

const lessonModule = (code) => Object.values(content.load().pack.modules).find((m) => m.lecons.some((l) => l.code === code)) || null;

/**
 * Reprise : dernière leçon ou session ouverte, partagée entre appareils (lot 5, section D).
 * Une action d'un appareil remplace la reprise si elle vient du même appareil avec une séquence
 * plus récente, ou d'un autre appareil qui avait déjà vu la reprise actuelle (`vu`). Sinon, conflit :
 * l'état serveur est renvoyé et le client garde sa branche locale (aucun écrasement silencieux).
 */
const applyResume = (etat, action) => {
  const cible = action.cible || {};
  if (!['lecon', 'session', 'module'].includes(cible.type)) throw rejected('INVALIDE', 'Reprise invalide');
  if (cible.type === 'lecon' && !lessonModule(cible.lecon)) throw rejected('LECON', 'Leçon inconnue');
  const current = etat.derniereReprise || null;
  const appareil = typeof action.appareil === 'string' ? action.appareil.slice(0, 80) : null;
  const seq = Number(action.seq) || 0;
  const sequences = { ...(etat.sequencesReprise || {}) };
  // Une séquence plus ancienne (ou égale) d'un même appareil ne remplace jamais une plus récente.
  const fresh = !appareil || seq > (sequences[appareil] || 0);
  const accept = fresh && (!current
    || (appareil && current.appareil === appareil ? true : Number(action.vu || 0) >= (current.version || 0)));
  if (!accept) return { etat, conflit: current };
  if (appareil) {
    sequences[appareil] = seq;
    const keys = Object.keys(sequences);
    if (keys.length > 20) keys.sort((x, y) => sequences[x] - sequences[y]).slice(0, keys.length - 20).forEach((k) => delete sequences[k]);
  }
  const propre = {
    type: cible.type,
    module: typeof cible.module === 'string' ? cible.module.slice(0, 60) : null,
    lecon: typeof cible.lecon === 'string' ? cible.lecon.slice(0, 80) : null,
    position: cible.position == null ? null : Math.max(0, Math.min(1, Number(cible.position) || 0)),
    session: typeof cible.session === 'string' ? cible.session.slice(0, 120) : null,
    mode: typeof cible.mode === 'string' ? cible.mode.slice(0, 20) : null,
    niveau: Number(cible.niveau) || null,
    index: Number.isInteger(cible.index) ? Math.max(0, Math.min(500, cible.index)) : null,
    total: Number.isInteger(cible.total) ? Math.max(0, Math.min(500, cible.total)) : null,
  };
  const reprise = { ...propre, appareil, seq, version: (current?.version || 0) + 1, le: new Date().toISOString() };
  return { etat: { ...etat, derniereReprise: reprise, sequencesReprise: sequences }, reprise };
};

/**
 * Applique une action à l'état chargé. Lève une erreur codée en cas de refus.
 * @returns {Promise<object>} résultat renvoyé au client
 */
const applyAction = async (identite, doc, action, jour) => {
  switch (action.type) {
    case 'tentative': {
      const graded = gradeAttempt(action.exercice, action);
      if (!graded) throw rejected('EXERCICE', 'Exercice inconnu');
      const prog = content.getProgramme(action.programme);
      if (prog && !content.publishedModules(prog).includes(graded.module.code)) throw rejected('EXERCICE', 'Exercice hors du programme');
      // Tentative déjà enregistrée par un traitement interrompu : réutilisée, jamais recréée.
      const existing = action.cle ? await PrepTentative.findOne({ identite: identite._id, cleClient: action.cle }).lean() : null;
      if (!existing) {
        try {
          await PrepTentative.create({
            identite: identite._id, programme: action.programme, module: graded.module.code, exercice: action.exercice,
            version: graded.module.revision || 1,
            niveau: graded.exercice.niveau, reponse: action.reponse, correct: graded.result.correct, score: graded.result.score,
            points: graded.points, essai: action.essai === 2 ? 2 : 1, indices: Number(action.indices) || 0,
            duree: Number(action.duree) || 0, contexte: action.contexte || 'niveau', session: action.session || null, jour, cleClient: action.cle || null,
          });
        } catch (error) {
          if (error?.code !== 11000) throw error;
        }
      }
      doc.etat = core.applyAttempt(doc.etat, {
        exercice: action.exercice, module: graded.module.code, niveau: graded.exercice.niveau,
        notion: (graded.exercice.notions || [])[0] || null, essai: action.essai === 2 ? 2 : 1,
        indices: action.indices, contexte: action.contexte, correct: graded.result.correct, jour,
      });
      return { correct: graded.result.correct, score: graded.result.score, detail: graded.result.detail, points: graded.points, correction: graded.correction, miniCours: graded.miniCours };
    }
    case 'lecon': {
      const mod = lessonModule(action.lecon);
      if (!mod) throw rejected('LECON', 'Leçon inconnue');
      doc.etat = core.refreshModule(core.applyLesson(doc.etat, action.lecon, action.position, action.terminee, jour), mod);
      return {};
    }
    case 'minutes':
      doc.etat = core.applyMinutes(doc.etat, jour, Math.min(180, Number(action.minutes) || 0));
      return {};
    case 'fragile':
      doc.etat = core.markFragile(doc.etat, action.exercice, action.notion, jour);
      return {};
    case 'objectif':
      doc.etat.objectifQuotidien = [5, 10, 20].includes(Number(action.minutes)) ? Number(action.minutes) : 10;
      return {};
    case 'reprise': {
      const out = applyResume(doc.etat, action);
      doc.etat = out.etat;
      return out.conflit ? { conflit: true, reprise: out.conflit } : { reprise: out.reprise };
    }
    case 'session': {
      const mod = content.getModule(action.module);
      if (!mod || !action.session) throw rejected('SESSION', 'Session invalide');
      // Score recalculé à partir des tentatives enregistrées de CETTE session et de CE module.
      const tentatives = await PrepTentative.find({ identite: identite._id, session: action.session, programme: action.programme, module: action.module }).select('exercice points').lean();
      const best = new Map();
      tentatives.forEach((t) => best.set(t.exercice, Math.max(best.get(t.exercice) || 0, t.points || 0)));
      const nb = Math.max(best.size, Number(action.nbQuestions) || 0, 1);
      const score = [...best.values()].reduce((a, b) => a + b, 0) / nb;
      doc.etat = core.applySessionResult(doc.etat, mod, Number(action.niveau), score);
      return { score };
    }
    case 'blanc': {
      const tentatives = await PrepTentative.find({ identite: identite._id, session: action.session, programme: action.programme, contexte: 'blanc' }).select('points').lean();
      const nb = Math.max(tentatives.length, Number(action.nbQuestions) || 0, 1);
      const note = (20 * tentatives.reduce((a, t) => a + (t.points || 0), 0)) / nb;
      doc.etat = core.applyMockExam(doc.etat, Math.round(note * 10) / 10, 20, jour, Number(action.duree) || 0);
      return { note };
    }
    default:
      throw rejected('ACTION', 'Action inconnue');
  }
};

/** Écriture conditionnelle de la progression : échoue si un autre traitement l'a modifiée entre-temps. */
const saveProgress = async (doc) => {
  await finalizeFields(doc);
  const fields = {
    etat: doc.etat, score: doc.score, stats: doc.stats, matieresFortes: doc.matieresFortes, derniereActivite: doc.derniereActivite,
    semaineReference: doc.semaineReference, scoreSemainePrecedente: doc.scoreSemainePrecedente, rangSemainePrecedente: doc.rangSemainePrecedente,
    appliquees: doc.appliquees.slice(-MAX_APPLIQUEES), schemaVersion: 2,
  };
  if (doc.isNew) {
    try {
      await PrepProgression.create({ _id: doc._id, identite: doc.identite, programme: doc.programme, ...fields, revision: 1 });
    } catch (error) {
      if (error?.code === 11000) throw rejected('CONFLIT_REVISION', 'Progression créée par une autre requête');
      throw error;
    }
    doc.revision = 1;
  } else {
    const saved = await PrepProgression.findOneAndUpdate(
      { _id: doc._id, revision: doc.revision || 0 },
      { $set: { ...fields, revision: (doc.revision || 0) + 1 } },
      { new: true },
    ).lean();
    if (!saved) throw rejected('CONFLIT_REVISION', 'Progression modifiée par une autre requête');
    doc.revision = saved.revision;
  }
  leaderboard.invalidateRanking(doc.programme);
  return doc;
};

/**
 * Rejoue une liste d'actions pour une identité (lot 5 : journal, déduplication, écriture conditionnelle).
 * Chaque résultat porte `statut` : applied | duplicate | rejected | retry | conflict.
 * @returns {{ resultats: Array, droits, progressions: Object }}
 */
const ingestOnce = async (identite, user, actions) => {
  const resultats = [];
  const docs = new Map();
  const journal = [];
  let droits = await rights(identite, user);
  let identiteModifiee = false;
  const essaiAvant = [...(identite.essai?.jours || [])];

  const progressFor = async (programme) => {
    if (!docs.has(programme)) docs.set(programme, await loadProgress(identite, programme));
    return docs.get(programme);
  };

  for (const action of actions.slice(0, 200)) {
    const jour = trustedDay(action.jour);
    const cle = typeof action.cle === 'string' && action.cle.length <= 80 ? action.cle : null;
    try {
      // Rejeu d'une action déjà traitée : même résultat, aucune nouvelle application.
      if (cle) {
        let entry = await PrepAction.findOne({ identite: identite._id, cle }).lean();
        if (entry && entry.statut !== 'reserve') {
          resultats.push({ ...(entry.resultat || {}), cle, doublon: true, statut: 'duplicate' });
          continue;
        }
        if (!entry) {
          try {
            entry = await PrepAction.create({
              identite: identite._id, cle, programme: action.programme || null, type: String(action.type || '').slice(0, 20) || 'inconnu',
              appareil: typeof action.appareil === 'string' ? action.appareil.slice(0, 80) : null,
              sequence: Number(action.seq) || null, contentRevision: Number(action.revision) || null,
            });
          } catch (error) {
            if (error?.code !== 11000) throw error; // réservée par une requête concurrente : traitée ci-dessous
          }
        }
      }
      if (!droits.accesPreparation) throw rejected('ESSAI_EPUISE', 'Accès à la préparation indisponible');
      if (!content.getProgramme(action.programme)) throw rejected('PROGRAMME', 'Programme inconnu');
      const doc = await progressFor(action.programme);
      // Déjà appliquée par un traitement interrompu juste après l'écriture de la progression.
      if (cle && doc.appliquees.includes(cle)) {
        const r = { cle, ok: true, doublon: true, statut: 'duplicate' };
        resultats.push(r); journal.push(r);
        continue;
      }
      if (PREP_ACTIONS.has(action.type) && !droits.abonne) {
        // Jour d'interaction (§ 25.3) : consommé à la première action de préparation du jour.
        const avant = identite.essai.jours.length;
        if (!core.trialState(identite.essai.jours, identite.essai.iaUtilisees, jour).actif) throw rejected('ESSAI_EPUISE', 'Essai terminé');
        identite.essai.jours = core.consumeTrialDay(identite.essai.jours, jour);
        if (identite.essai.jours.length !== avant) identiteModifiee = true;
      }
      const out = await applyAction(identite, doc, action, jour);
      if (cle) doc.appliquees.push(cle);
      const r = { cle, ok: true, statut: out.conflit ? 'conflict' : 'applied', ...out };
      resultats.push(r); journal.push(r);
    } catch (error) {
      if (error.code === 'CONFLIT_REVISION') throw error;
      const definitive = DEFINITIVE.has(error.code);
      const r = { cle, ok: false, statut: definitive ? 'rejected' : 'retry', erreur: error.code || 'ERREUR', message: definitive ? error.message : 'Erreur temporaire, nouvel essai plus tard' };
      resultats.push(r);
      if (definitive) journal.push(r);
    }
  }

  // Progression d'abord (avec le marqueur `appliquees`), journal ensuite : un crash entre les deux
  // laisse des actions « reserve » que le prochain envoi reconnaît comme déjà appliquées.
  for (const doc of docs.values()) await saveProgress(doc);
  if (identiteModifiee) {
    identite.derniereDateServeur = today();
    await identite.save();
    droits = await rights(identite, user);
  } else {
    identite.essai.jours = essaiAvant;
  }
  const writes = journal.filter((r) => r.cle).map((r) => ({
    updateOne: { filter: { identite: identite._id, cle: r.cle }, update: { $set: { statut: r.ok ? 'applique' : 'rejete', resultat: r } } },
  }));
  if (writes.length) await PrepAction.bulkWrite(writes, { ordered: false });
  const progressions = {};
  for (const [programme, doc] of docs) progressions[programme] = { etat: doc.etat, score: doc.score, revision: doc.revision };
  return { resultats, droits, progressions };
};

const ingest = async (identite, user, actions) => {
  for (let essai = 1; ; essai += 1) {
    try {
      return await ingestOnce(identite, user, actions);
    } catch (error) {
      // Écriture concurrente (deux appareils) : relecture de l'état et nouveau calcul.
      if (error.code !== 'CONFLIT_REVISION' || essai >= MAX_TENTATIVES_CAS) {
        if (error.code === 'CONFLIT_REVISION') {
          return { resultats: actions.slice(0, 200).map((a) => ({ cle: a.cle, ok: false, statut: 'retry', erreur: 'CONFLIT', message: 'Écriture concurrente, nouvel essai' })), droits: await rights(identite, user), progressions: {} };
        }
        throw error;
      }
      const fresh = await identite.constructor.findById(identite._id);
      if (fresh) identite.essai = fresh.essai;
    }
  }
};

/** Progressions privées de l'identité (lecture seule : ne modifie pas la dernière activité). */
const listProgress = async (identite, { since = null, limit = 50 } = {}) => {
  const filter = { identite: identite._id };
  if (since) filter.updatedAt = { $gt: new Date(since) };
  const docs = await PrepProgression.find(filter).sort({ updatedAt: 1, _id: 1 }).limit(Math.min(100, Math.max(1, limit)))
    .select('programme etat score revision updatedAt').lean();
  return {
    progressions: Object.fromEntries(docs.map((d) => [d.programme, { etat: d.etat, score: d.score, revision: d.revision || 0, majLe: d.updatedAt }])),
    curseur: docs.length ? docs[docs.length - 1].updatedAt.toISOString() : since,
    complet: docs.length < Math.min(100, Math.max(1, limit)),
  };
};

module.exports = { listProgress, applyResume, rights, ingest: (...args) => content.withSnapshot(() => ingest(...args)), gradeAttempt, ...leaderboard, loadProgress, finalize: (...args) => content.withSnapshot(() => finalize(...args)), trustedDay, today };
