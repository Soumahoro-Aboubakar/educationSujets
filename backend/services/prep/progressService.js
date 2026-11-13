const PrepProgression = require('../../models/PrepProgression');
const PrepTentative = require('../../models/PrepTentative');
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

const finalize = async (doc) => {
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
  doc.markModified('etat');
  await doc.save();
  leaderboard.invalidateRanking(doc.programme);
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
      if (!droits.accesPreparation) throw Object.assign(new Error('Accès à la préparation indisponible'), { code: 'ESSAI_EPUISE' });
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

module.exports = { rights, ingest: (...args) => content.withSnapshot(() => ingest(...args)), gradeAttempt, ...leaderboard, loadProgress, finalize: (...args) => content.withSnapshot(() => finalize(...args)), trustedDay, today };
