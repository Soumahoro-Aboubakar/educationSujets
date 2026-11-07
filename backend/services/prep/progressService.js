const PrepProgression = require('../../models/PrepProgression');
const PrepTentative = require('../../models/PrepTentative');
const PrepIdentite = require('../../models/PrepIdentite');
const { isSubscriptionActive } = require('../billing/subscriptionService');
const content = require('./contentService');
const core = require('./shared/prepCore');

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
  const userId = user?._id || identite?.user || null;
  const abonne = Boolean(userId) && await isSubscriptionActive(userId);
  const admin = user && ['admin', 'sub-admin'].includes(user.role);
  const essai = core.trialState(identite?.essai?.jours || [], identite?.essai?.iaUtilisees || 0, today());
  return {
    abonne: abonne || Boolean(admin),
    admin: Boolean(admin),
    compte: Boolean(userId),
    essai,
    accesPreparation: abonne || Boolean(admin) || essai.actif,
    iaDisponibles: abonne || admin ? null : essai.iaRestantes,
  };
};

const loadProgress = async (identite, programme) => {
  let doc = await PrepProgression.findOne({ identite: identite._id, programme });
  if (!doc) doc = new PrepProgression({ identite: identite._id, programme, etat: core.emptyProgress() });
  if (!doc.etat || !doc.etat.compteurs) doc.etat = core.emptyProgress();
  return doc;
};

const finalize = async (doc) => {
  const prog = content.getProgramme(doc.programme);
  const total = prog ? content.publishedModules(prog).length : 0;
  const t = today();
  const semaine = core.addDays(t, -((new Date(`${t}T00:00:00Z`).getUTCDay() + 6) % 7));
  if (doc.semaineReference !== semaine) {
    // Début d'une nouvelle semaine : on mémorise le rang de référence pour la variation ▲ / ▼ (§ 19).
    doc.rangSemainePrecedente = doc.isNew ? null : (await PrepProgression.countDocuments({ programme: doc.programme, score: { $gt: doc.score } })) + 1;
    doc.scoreSemainePrecedente = doc.score;
    doc.semaineReference = semaine;
  }
  doc.score = core.rankingScore(core.rankingInput(doc.etat, total, t));
  doc.stats = { ...core.publicStats(doc.etat), serie: core.currentStreak(doc.etat, t) };
  doc.derniereActivite = new Date();
  doc.markModified('etat');
  await doc.save();
  return doc;
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

/**
 * Rejoue une liste d'actions pour une identité.
 * @returns {{ resultats: Array, droits, progressions: Object }}
 */
const ingest = async (identite, user, actions) => {
  const resultats = [];
  const docs = new Map();
  let droits = await rights(identite, user);
  let identiteModifiee = false;

  const progressFor = async (programme) => {
    if (!docs.has(programme)) docs.set(programme, await loadProgress(identite, programme));
    return docs.get(programme);
  };

  for (const action of actions.slice(0, 200)) {
    const jour = trustedDay(action.jour);
    try {
      if (!content.getProgramme(action.programme) && action.type !== 'jour') throw Object.assign(new Error('Programme inconnu'), { code: 'PROGRAMME' });

      if (PREP_ACTIONS.has(action.type) && !droits.abonne) {
        // Jour d'interaction (§ 25.3) : consommé à la première action de préparation du jour.
        const avant = identite.essai.jours.length;
        if (!core.trialState(identite.essai.jours, identite.essai.iaUtilisees, jour).actif) {
          throw Object.assign(new Error('Essai terminé'), { code: 'ESSAI_EPUISE' });
        }
        identite.essai.jours = core.consumeTrialDay(identite.essai.jours, jour);
        if (identite.essai.jours.length !== avant) identiteModifiee = true;
      }

      // eslint-disable-next-line no-await-in-loop
      const doc = await progressFor(action.programme);

      switch (action.type) {
        case 'tentative': {
          const graded = gradeAttempt(action.exercice, action);
          if (!graded) throw Object.assign(new Error('Exercice inconnu'), { code: 'EXERCICE' });
          if (action.cle) {
            // eslint-disable-next-line no-await-in-loop
            const exists = await PrepTentative.exists({ identite: identite._id, cleClient: action.cle });
            if (exists) { resultats.push({ cle: action.cle, ok: true, doublon: true }); continue; }
          }
          // eslint-disable-next-line no-await-in-loop
          await PrepTentative.create({
            identite: identite._id, programme: action.programme, module: graded.module.code, exercice: action.exercice,
            niveau: graded.exercice.niveau, reponse: action.reponse, correct: graded.result.correct, score: graded.result.score,
            points: graded.points, essai: action.essai === 2 ? 2 : 1, indices: Number(action.indices) || 0,
            duree: Number(action.duree) || 0, contexte: action.contexte || 'niveau', session: action.session || null, jour, cleClient: action.cle || null,
          });
          doc.etat = core.applyAttempt(doc.etat, {
            exercice: action.exercice, module: graded.module.code, niveau: graded.exercice.niveau,
            notion: (graded.exercice.notions || [])[0] || null, essai: action.essai === 2 ? 2 : 1,
            indices: action.indices, contexte: action.contexte, correct: graded.result.correct, jour,
          });
          resultats.push({ cle: action.cle, ok: true, correct: graded.result.correct, score: graded.result.score, detail: graded.result.detail, points: graded.points, correction: graded.correction, miniCours: graded.miniCours });
          break;
        }
        case 'lecon':
          doc.etat = core.applyLesson(doc.etat, action.lecon, action.position, action.terminee, jour);
          resultats.push({ cle: action.cle, ok: true });
          break;
        case 'minutes':
          doc.etat = core.applyMinutes(doc.etat, jour, Math.min(180, Number(action.minutes) || 0));
          resultats.push({ cle: action.cle, ok: true });
          break;
        case 'fragile':
          doc.etat = core.markFragile(doc.etat, action.exercice, action.notion, jour);
          resultats.push({ cle: action.cle, ok: true });
          break;
        case 'objectif':
          doc.etat.objectifQuotidien = [5, 10, 20].includes(Number(action.minutes)) ? Number(action.minutes) : 10;
          resultats.push({ cle: action.cle, ok: true });
          break;
        case 'session': {
          const mod = content.getModule(action.module);
          if (!mod || !action.session) throw Object.assign(new Error('Session invalide'), { code: 'SESSION' });
          // Score recalculé à partir des tentatives enregistrées (meilleurs points par question).
          // eslint-disable-next-line no-await-in-loop
          const tentatives = await PrepTentative.find({ identite: identite._id, session: action.session }).select('exercice points').lean();
          const best = new Map();
          tentatives.forEach((t) => best.set(t.exercice, Math.max(best.get(t.exercice) || 0, t.points || 0)));
          const nb = Math.max(best.size, Number(action.nbQuestions) || 0, 1);
          const score = [...best.values()].reduce((a, b) => a + b, 0) / nb;
          doc.etat = core.applySessionResult(doc.etat, mod, Number(action.niveau), score);
          resultats.push({ cle: action.cle, ok: true, score });
          break;
        }
        case 'blanc': {
          // eslint-disable-next-line no-await-in-loop
          const tentatives = await PrepTentative.find({ identite: identite._id, session: action.session, contexte: 'blanc' }).select('points').lean();
          const nb = Math.max(tentatives.length, Number(action.nbQuestions) || 0, 1);
          const note = (20 * tentatives.reduce((a, t) => a + (t.points || 0), 0)) / nb;
          doc.etat = core.applyMockExam(doc.etat, Math.round(note * 10) / 10, 20, jour, Number(action.duree) || 0);
          resultats.push({ cle: action.cle, ok: true, note });
          break;
        }
        default:
          throw Object.assign(new Error('Action inconnue'), { code: 'ACTION' });
      }
      // Recalcul du statut des modules (leçons terminées, niveau 2 atteint).
      if (action.type === 'lecon') {
        const mod = Object.values(content.load().pack.modules).find((m) => m.lecons.some((l) => l.code === action.lecon));
        if (mod) doc.etat = core.refreshModule(doc.etat, mod);
      }
    } catch (error) {
      resultats.push({ cle: action.cle, ok: false, erreur: error.code || 'ERREUR', message: error.message });
    }
  }

  if (identiteModifiee) {
    identite.derniereDateServeur = today();
    await identite.save();
    droits = await rights(identite, user);
  }
  const progressions = {};
  for (const [programme, doc] of docs) {
    // eslint-disable-next-line no-await-in-loop
    await finalize(doc);
    progressions[programme] = { etat: doc.etat, score: doc.score };
  }
  return { resultats, droits, progressions };
};

/** Rang « Xᵉ sur N » et liste des candidats du programme (§ 20). */
const ranking = async (identite, programme, { periode = 'tout', limit = 100 } = {}) => {
  const depuis = periode === 'semaine' ? new Date(Date.now() - 7 * 864e5) : periode === 'mois' ? new Date(Date.now() - 30 * 864e5) : null;
  const filter = { programme, ...(depuis ? { derniereActivite: { $gte: depuis } } : {}) };
  const total = await PrepProgression.countDocuments(filter);
  const mine = identite ? await PrepProgression.findOne({ identite: identite._id, programme }).lean() : null;
  const rang = mine ? (await PrepProgression.countDocuments({ ...filter, score: { $gt: mine.score } })) + 1 : null;

  const rows = await PrepProgression.find(filter).sort({ score: -1, updatedAt: 1 }).limit(Math.min(limit, 200))
    .populate('identite', 'pseudonyme avatarTeinte visibleClassement').lean();
  let position = 0;
  const candidats = rows
    .filter((r) => r.identite && (r.identite.visibleClassement || (identite && String(r.identite._id) === String(identite._id))))
    .map((r) => {
      position += 1;
      return {
        identite: String(r.identite._id),
        pseudonyme: r.identite.pseudonyme,
        avatarTeinte: r.identite.avatarTeinte,
        moi: Boolean(identite && String(r.identite._id) === String(identite._id)),
        score: r.score,
        stats: r.stats || {},
        rangApprox: position,
      };
    });
  return {
    total,
    rang,
    variation: mine && mine.rangSemainePrecedente && rang ? mine.rangSemainePrecedente - rang : 0,
    moi: mine ? { score: mine.score, stats: mine.stats, visible: identite.visibleClassement } : null,
    candidats,
  };
};

const candidateProfile = async (programme, identiteId) => {
  const identite = await PrepIdentite.findById(identiteId).select('pseudonyme avatarTeinte visibleClassement').lean();
  if (!identite || !identite.visibleClassement) return null;
  const doc = await PrepProgression.findOne({ identite: identiteId, programme }).lean();
  if (!doc) return null;
  const rang = (await PrepProgression.countDocuments({ programme, score: { $gt: doc.score } })) + 1;
  const prog = content.getProgramme(programme);
  const matieresFortes = prog ? prog.matieres.filter((m) => m.modules.some((x) => (doc.etat.modulesValides || []).includes(x.code))).map((m) => m.nom) : [];
  return { pseudonyme: identite.pseudonyme, avatarTeinte: identite.avatarTeinte, rang, score: doc.score, stats: doc.stats, matieresFortes };
};

module.exports = { rights, ingest, gradeAttempt, ranking, candidateProfile, loadProgress, trustedDay, today };
