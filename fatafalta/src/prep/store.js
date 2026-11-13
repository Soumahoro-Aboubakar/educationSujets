import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import core from './shared/prepCore';
import { loadState, loadToken, saveState, saveToken } from './storage';
import { deviceIdentifiers } from './device';
import prepApi, { setPrepToken } from './api';
import { getExercise, getLesson, getModule, getProgramme, moduleVersions, publishedModuleDefs } from './content';
import { needsServerGrading } from './contentRepo';
import { hydrateContent, releaseContent, syncContent } from './contentSync';

/**
 * État de la préparation (§ 25.5) : le serveur est la référence, le téléphone garde une copie
 * de travail pour l'affichage immédiat et le hors-ligne. Chaque action est appliquée localement
 * avec les mêmes réducteurs que le serveur (prepCore), puis mise en file et synchronisée.
 */

/** Jour calendaire dans le fuseau de l'appareil (Abidjan = UTC+0 par défaut). */
export const todayKey = () => core.dayKey(new Date(), -new Date().getTimezoneOffset());

const PREP_ACTIONS = new Set(['tentative', 'lecon', 'session', 'blanc']);
let flushTimer = null;
let flushing = false;
let retryDelay = 1000;
let appareilId = null;
let inFlight = new Set();
/** Réponses refusées définitivement : diagnostic conservé (les 20 dernières), jamais renvoyées. */
const MAX_REJETS = 20;
let counter = 0;
const newKey = () => `${Date.now().toString(36)}-${(counter += 1).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const PERSISTED = ['identite', 'sequence', 'rejets', 'essai', 'droitsServeur', 'programme', 'programmesSuivis', 'candidatsSuivis', 'progressions', 'queue', 'prefs', 'enCours', 'sessions', 'derniereDate', 'onboarding', 'videos'];

// versions : version choisie par cours de langue { [codeModule]: 'en' } ; « fr » par défaut.
const DEFAULT_PREFS = { objectif: 10, tailleTexte: 17, puce: {}, rythmeFait: false, testPropose: {}, notifications: true, versions: {} };

/**
 * Vidéos explicatives : index servi par GET /api/prep/videos, relu au plus toutes les 5 minutes
 * (une vidéo publiée apparaît sans nouvelle version de l'application). En développement,
 * EXPO_PUBLIC_VIDEOS_DEMO=1 ajoute des vidéos YouTube réelles pour tester l'interface.
 */
const VIDEOS_TTL = 5 * 60 * 1000;
// eslint-disable-next-line global-require
const DEMO_VIDEOS = __DEV__ && process.env.EXPO_PUBLIC_VIDEOS_DEMO === '1' ? require('./video/demo').default : null;
const withDemo = (index) => {
  const base = { lecons: index?.lecons || {}, concours: index?.concours || {} };
  return DEMO_VIDEOS ? {
    lecons: { ...base.lecons, ...DEMO_VIDEOS.lecons },
    concours: { ...base.concours, ...DEMO_VIDEOS.concours },
  } : base;
};
let videosRequest = null;

/**
 * Corrections attendues du serveur (exercices de modules téléchargés, dont la clé n'est pas
 * sur l'appareil) : clé d'action → résolveurs. Rien n'est noté côté client pour ces exercices.
 */
const waiters = new Map();
const settle = (cle, result) => {
  const list = waiters.get(cle);
  if (!list) return;
  waiters.delete(cle);
  list.forEach((resolve) => resolve(result));
};

/** Identifiant de cet appareil (reprise partagée) ; null avant la déclaration. */
export const currentDevice = () => appareilId;

/** Modules utilisés par une session non terminée : leur mise à jour attend la fin de la session. */
export const busyModules = (sessions) => {
  const out = new Set();
  Object.values(sessions || {}).forEach((session) => {
    if (!session || session.termine) return;
    if (session.module) out.add(session.module);
    (session.codes || []).forEach((code) => { const found = getExercise(code); if (found) out.add(found.module.code); });
  });
  return [...out];
};

const usePrep = create((set, get) => ({
  ready: false,
  identite: null,
  token: null,
  essai: { jours: [], ia: 0 },
  droitsServeur: null,
  abonneLocal: false,
  programme: null,
  programmesSuivis: [],
  candidatsSuivis: {},
  progressions: {},
  queue: [],
  prefs: DEFAULT_PREFS,
  enCours: {},
  sequence: 0,
  rejets: [],
  sessions: {},
  online: null,
  derniereDate: null,
  horlogeSuspecte: false,
  retour: null,
  onboarding: { fait: false, choix: null },
  videos: { index: withDemo(null), majLe: 0 },
  videosEnLigne: null,

  /** Relit l'index des vidéos (au plus toutes les 5 min) ; hors ligne, la copie locale reste. */
  loadVideos: (force = false) => {
    const { videos } = get();
    if (!force && Date.now() - (videos.majLe || 0) < VIDEOS_TTL && get().videosEnLigne !== false) return videosRequest || Promise.resolve();
    if (videosRequest) return videosRequest;
    videosRequest = prepApi.videos()
      .then((index) => {
        if (index && index.concours) {
          set({ videos: { index: withDemo(index), majLe: Date.now() }, videosEnLigne: true });
          get().persist();
        }
      })
      // Une réponse d'erreur du serveur (ex. 404 : API pas encore déployée) prouve qu'on est en ligne.
      .catch((error) => { set({ videosEnLigne: Boolean(error?.response) }); })
      .finally(() => { videosRequest = null; });
    return videosRequest;
  },

  /** Version d'un cours de langue (« fr » = explications en français, par défaut). */
  setModuleVersion: (moduleCode, version) => {
    const s = get();
    set({ prefs: { ...s.prefs, versions: { ...(s.prefs.versions || {}), [moduleCode]: version } } });
    get().persist();
  },

  persist: () => {
    const s = get();
    const snapshot = {};
    PERSISTED.forEach((k) => { snapshot[k] = s[k]; });
    saveState(snapshot);
  },

  // Un suivi appartient à un programme. Aucun rang ni statistique privée n'est conservé.
  followCandidate: (programme, candidat) => {
    if (!programme || !candidat?.identite) return;
    const suivis = get().candidatsSuivis || {};
    const liste = suivis[programme] || [];
    if (liste.some((c) => c.identite === candidat.identite)) return;
    set({ candidatsSuivis: { ...suivis, [programme]: [...liste, { identite: candidat.identite, pseudonyme: candidat.pseudonyme }] } });
    get().persist();
  },
  unfollowCandidate: (programme, identite) => {
    const suivis = get().candidatsSuivis || {};
    set({ candidatsSuivis: { ...suivis, [programme]: (suivis[programme] || []).filter((c) => c.identite !== identite) } });
    get().persist();
  },

  hydrate: async () => {
    // Contenus publiés déjà téléchargés : disponibles hors ligne avant même le réseau.
    await hydrateContent();
    const stored = await loadState();
    const today = todayKey();
    const patch = stored ? { ...stored, prefs: { ...DEFAULT_PREFS, ...(stored.prefs || {}) } } : {};
    if (stored?.videos) patch.videos = { index: withDemo(stored.videos.index), majLe: stored.videos.majLe || 0 };
    // Manipulation de l'horloge (§ 25.8) : une date antérieure à la dernière connue est suspecte.
    const suspect = Boolean(stored?.derniereDate && today < stored.derniereDate);
    set({ ...patch, ready: true, horlogeSuspecte: suspect, derniereDate: suspect ? stored.derniereDate : today });
    // Jeton d'identité : SecureStore (lot 5) ; reprise de l'ancien emplacement dans le fichier JSON.
    const token = (await loadToken()) || stored?.token || null;
    if (stored?.token) { await saveToken(stored.token); get().persist(); }
    if (token) { set({ token }); setPrepToken(token); }
    await get().ensureIdentity();
    get().pullProgress();
    get().refreshContent(true);
  },

  /**
   * Relit les progressions du serveur (lot 5) : un deuxième appareil retrouve le parcours sans
   * action locale. Tant que des actions locales attendent, la copie locale est gardée : elle
   * sera remplacée par l'état serveur après leur envoi.
   */
  pullProgress: async () => {
    if (!get().token) return;
    try {
      const recu = {};
      let depuis;
      for (let page = 0; page < 10; page += 1) {
        // eslint-disable-next-line no-await-in-loop
        const out = await prepApi.progressions(depuis);
        Object.assign(recu, out?.progressions || {});
        if (!out || out.complet || !out.curseur) break;
        depuis = out.curseur;
      }
      if (get().queue.length || !Object.keys(recu).length) return;
      const progressions = { ...get().progressions };
      Object.entries(recu).forEach(([code, p]) => { if (p?.etat) progressions[code] = p.etat; });
      set({ progressions, online: true });
      get().persist();
    } catch (error) {
      if (!error?.response) set({ online: false });
    }
  },

  /**
   * Reprise partagée entre appareils : dernière leçon ou session ouverte. `vu` est la version de
   * reprise serveur connue ; le serveur refuse d'écraser une reprise plus récente d'un autre appareil.
   */
  shareResume: (programme, cible) => {
    if (!programme || !cible || !appareilId) return;
    const sequence = (get().sequence || 0) + 1;
    set({ sequence });
    const vu = get().progressions[programme]?.derniereReprise?.version || 0;
    get().enqueue({ type: 'reprise', programme, appareil: appareilId, seq: sequence, vu, cible });
  },

  /**
   * Met à jour les contenus publiés (nouveaux programmes, modules, leçons, exercices) sans
   * nouvelle version de l'app. Hors connexion, le cache précédent reste utilisé.
   */
  refreshContent: (force = false) => {
    const s = get();
    const programmes = [...new Set([...(s.programmesSuivis || []), s.programme].filter(Boolean))];
    return syncContent({ programmes, busy: busyModules(s.sessions), force });
  },

  /** Identité automatique, sans saisie (§ 25.1) ; restaurée après réinstallation (§ 25.4). */
  ensureIdentity: async () => {
    if (!appareilId) appareilId = (await deviceIdentifiers()).appareilId;
    const s = get();
    if (!s.identite) {
      // Pseudonyme local immédiat (même graine que le serveur) : rien n'attend le réseau.
      const ids = await deviceIdentifiers();
      set({ identite: { id: null, pseudonyme: core.pseudonymFromSeed(ids.appareilId), avatarTeinte: Math.floor(core.seededRandom(`avatar:${ids.appareilId}`)() * 6), visibleClassement: true, compte: false, local: true } });
      get().persist();
    }
    if (get().token) { get().flush(); return; }
    try {
      const ids = await deviceIdentifiers();
      const out = await prepApi.declare(ids);
      setPrepToken(out.token);
      await saveToken(out.token);
      const local = get();
      const progressions = { ...local.progressions };
      // Données retrouvées sur le serveur (réinstallation) : elles priment si la copie locale est vide.
      Object.entries(out.progressions || {}).forEach(([code, p]) => {
        const mine = progressions[code];
        if (!mine || (mine.compteurs?.questions || 0) <= (p.etat?.compteurs?.questions || 0)) progressions[code] = p.etat;
      });
      const joursServeur = out.droits?.essai?.jours || [];
      set({
        token: out.token,
        identite: out.identite,
        droitsServeur: out.droits,
        essai: { jours: [...new Set([...local.essai.jours, ...joursServeur])].sort(), ia: Math.max(local.essai.ia, 3 - (out.droits?.essai?.iaRestantes ?? 3)) },
        progressions,
        online: true,
        retour: out.retour && !local.programme ? { droits: out.droits, progressions: out.progressions } : null,
        programme: local.programme || Object.keys(out.progressions || {})[0] || null,
      });
      get().persist();
      get().flush();
    } catch (error) {
      set({ online: false });
    }
  },

  setAbonneLocal: (value) => { if (get().abonneLocal !== Boolean(value)) set({ abonneLocal: Boolean(value) }); },

  /** Droits affichés : le serveur fait foi ; à défaut, calcul local identique (§ 25.8). */
  rights: () => { const s = get(); return computeRights(s.essai, s.droitsServeur, s.abonneLocal); },

  chooseProgramme: (code) => {
    const s = get();
    const suivis = s.programmesSuivis.includes(code) ? s.programmesSuivis : [...s.programmesSuivis, code];
    set({ programme: code, programmesSuivis: suivis, progressions: { ...s.progressions, [code]: s.progressions[code] || core.emptyProgress(s.prefs.objectif) } });
    get().persist();
    // Programme publié après la sortie de l'app : ses modules sont téléchargés maintenant.
    get().refreshContent(true);
  },

  completeOnboarding: (choix) => { set({ onboarding: { fait: true, choix } }); get().persist(); },
  resetOnboarding: () => { set({ onboarding: { fait: false, choix: null } }); get().persist(); },

  setPrefs: (patch) => {
    const s = get();
    set({ prefs: { ...s.prefs, ...patch } });
    if (patch.objectif && s.programme) {
      const etat = { ...(s.progressions[s.programme] || core.emptyProgress()), objectifQuotidien: patch.objectif };
      set({ progressions: { ...get().progressions, [s.programme]: etat } });
      get().enqueue({ type: 'objectif', programme: s.programme, minutes: patch.objectif });
    }
    get().persist();
  },

  progress: (code) => get().progressions[code || get().programme] || core.emptyProgress(get().prefs.objectif),

  /**
   * Point d'entrée de toute action de préparation. Consomme le jour d'essai (§ 25.3),
   * applique le réducteur local, met l'action en file.
   * @returns {{ ok: boolean, locked?: boolean }}
   */
  act: (action, reducer) => {
    const s = get();
    const jour = todayKey();
    if (PREP_ACTIONS.has(action.type)) {
      const r = s.rights();
      if (!r.abonne) {
        if (!core.trialState(r.essai.jours, s.essai.ia, jour).actif) return { ok: false, locked: true };
        set({ essai: { ...s.essai, jours: core.consumeTrialDay([...new Set([...s.essai.jours, ...r.essai.jours])].sort(), jour) } });
      }
    }
    if (reducer) {
      const current = get().progress(action.programme);
      set({ progressions: { ...get().progressions, [action.programme]: reducer(current, jour) } });
    }
    get().enqueue({ ...action, jour });
    return { ok: true };
  },

  enqueue: (action) => {
    // Aucune troncature silencieuse (lot 5) : seules les reprises non envoyées d'un même programme
    // sont compactées (la plus récente suffit). Réponses et soumissions ne sont jamais compactées.
    const base = action.type === 'reprise'
      ? get().queue.filter((a) => !(a.type === 'reprise' && a.programme === action.programme && !inFlight.has(a.cle)))
      : get().queue;
    set({ queue: [...base, { cle: action.cle || newKey(), jour: todayKey(), ...action }], derniereDate: todayKey() });
    get().persist();
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => get().flush(), 1500);
  },

  /** Envoi de la file au serveur ; le serveur recalcule et renvoie l'état de référence. */
  flush: async () => {
    const s = get();
    if (flushing || !s.token || !s.queue.length) return;
    flushing = true;
    const batch = s.queue.slice(0, 200);
    inFlight = new Set(batch.map((a) => a.cle));
    let retryLater = false;
    try {
      const out = await prepApi.sync(batch);
      // Acquittement individuel (lot 5) : appliquée, doublon, refus définitif ou conflit → retirée ;
      // « retry » ou sans réponse → gardée et renvoyée plus tard (délai croissant).
      const byKey = new Map((out.resultats || []).filter((r) => r?.cle).map((r) => [r.cle, r]));
      const acked = (a) => byKey.has(a.cle) && byKey.get(a.cle).statut !== 'retry';
      const sent = new Set(batch.filter(acked).map((a) => a.cle));
      retryLater = sent.size < batch.length;
      byKey.forEach((r, cle) => { if (r.statut !== 'retry') settle(cle, r); });
      const refus = batch.filter((a) => sent.has(a.cle) && byKey.get(a.cle).ok === false)
        .map((a) => ({ cle: a.cle, type: a.type, programme: a.programme, erreur: byKey.get(a.cle).erreur || 'ERREUR', message: byKey.get(a.cle).message || '', le: new Date().toISOString() }));
      const restant = get().queue.filter((a) => !sent.has(a.cle));
      const patch = { queue: restant, droitsServeur: out.droits, online: true };
      if (refus.length) patch.rejets = [...(get().rejets || []), ...refus].slice(-MAX_REJETS);
      if (!restant.length) {
        patch.progressions = { ...get().progressions };
        Object.entries(out.progressions || {}).forEach(([code, p]) => { patch.progressions[code] = p.etat; });
      }
      const joursServeur = out.droits?.essai?.jours || [];
      patch.essai = { ...get().essai, jours: [...new Set([...get().essai.jours, ...joursServeur])].sort() };
      set(patch);
      get().persist();
      if (retryLater) {
        setTimeout(() => get().flush(), retryDelay);
        retryDelay = Math.min(60000, retryDelay * 2);
      } else {
        retryDelay = 1000;
        if (restant.length) setTimeout(() => get().flush(), 300);
      }
    } catch (error) {
      set({ online: false });
    } finally {
      inFlight = new Set();
      flushing = false;
    }
  },

  // ── Leçons (§ 9) ───────────────────────────────────────────────────────
  lessonProgress: (programme, lecon, position, terminee) => {
    const found = getLesson(lecon);
    if (found && !terminee) get().shareResume(programme, { type: 'lecon', module: found.module.code, lecon, position });
    return get().act({ type: 'lecon', programme, lecon, position, terminee }, (etat, jour) => {
      let next = core.applyLesson(etat, lecon, position, terminee, jour);
      if (found) next = core.refreshModule(next, found.module);
      return next;
    });
  },

  addMinutes: (programme, minutes) => {
    if (!programme || minutes <= 0) return;
    const jour = todayKey();
    const etat = core.applyMinutes(get().progress(programme), jour, minutes);
    set({ progressions: { ...get().progressions, [programme]: etat } });
    get().enqueue({ type: 'minutes', programme, minutes: Math.round(minutes * 100) / 100 });
  },

  setEnCours: (programme, value) => {
    const previous = get().enCours[programme];
    set({ enCours: { ...get().enCours, [programme]: value } });
    get().persist();
    // Session : la reprise est partagée au changement de question (pas à chaque geste).
    if (value?.type === 'session' && (previous?.id !== value.id || previous?.index !== value.index)) {
      get().shareResume(programme, { type: 'session', module: value.module || null, session: value.id, mode: value.mode, niveau: value.niveau || null, index: value.index, total: value.total });
    }
  },

  // ── Sessions d'exercices (§ 10) ────────────────────────────────────────
  saveSession: (session) => { set({ sessions: { ...get().sessions, [session.id]: session } }); get().persist(); },
  dropSession: (id) => {
    const next = { ...get().sessions };
    delete next[id];
    set({ sessions: next });
    get().persist();
    releaseContent(busyModules(next));
  },

  /**
   * Tentative corrigée localement (validateur partagé) puis envoyée au serveur.
   * Exercice d'un module téléchargé (clé absente de l'appareil) : aucune note n'est calculée
   * ici ; renvoie { pending, cle } et la correction arrive avec awaitResult().
   */
  attempt: ({ programme, exercice, module, reponse, essai, indices, contexte, session, duree }) => {
    const found = getModule(module)?.exercices.find((e) => e.code === exercice);
    if (!found) return null;
    if (needsServerGrading(found)) {
      const cle = newKey();
      const ok = get().act({ cle, type: 'tentative', programme, exercice, reponse, essai, indices, contexte, session, duree }, null);
      if (!ok.ok) return { locked: true };
      get().flush();
      return { pending: true, cle };
    }
    const result = core.validate(found, reponse);
    const ok = get().act(
      { type: 'tentative', programme, exercice, reponse, essai, indices, contexte, session, duree },
      (etat, jour) => core.applyAttempt(etat, {
        exercice, module, niveau: found.niveau, notion: (found.notions || [])[0] || null,
        essai, indices, contexte, correct: result.correct, jour,
      }),
    );
    if (!ok.ok) return { locked: true };
    return { ...result, points: core.pointsTentative({ score: result.score, essai, indices }) };
  },

  finishSession: ({ programme, module, niveau, session, score, nbQuestions }) => {
    const mod = getModule(module);
    if (!mod) return;
    get().act({ type: 'session', programme, module, niveau, session, nbQuestions }, (etat) => core.applySessionResult(etat, mod, niveau, score));
  },

  finishMockExam: ({ programme, session, note, nbQuestions, duree }) => {
    get().act({ type: 'blanc', programme, session, nbQuestions, duree }, (etat, jour) => core.applyMockExam(etat, note, 20, jour, duree));
  },

  markFragile: (programme, exercice, notion) => {
    const jour = todayKey();
    set({ progressions: { ...get().progressions, [programme]: core.markFragile(get().progress(programme), exercice, notion, jour) } });
    get().enqueue({ type: 'fragile', programme, exercice, notion });
  },

  savePlacement: (programme, resultat) => {
    const etat = { ...get().progress(programme), test: resultat };
    set({ progressions: { ...get().progressions, [programme]: etat } });
    get().persist();
  },

  /**
   * Attend la correction serveur d'une tentative en file. `null` au-delà du délai (hors
   * connexion) : la réponse reste en file et sera corrigée à la prochaine synchronisation.
   */
  awaitResult: (cle, delai = 8000) => new Promise((resolve) => {
    const timer = setTimeout(() => {
      const list = (waiters.get(cle) || []).filter((r) => r !== done);
      if (list.length) waiters.set(cle, list); else waiters.delete(cle);
      resolve(null);
    }, delai);
    function done(result) { clearTimeout(timer); resolve(result); }
    waiters.set(cle, [...(waiters.get(cle) || []), done]);
    if (get().online === false) get().flush();
  }),

  useIA: () => { set({ essai: { ...get().essai, ia: get().essai.ia + 1 } }); get().persist(); },

}));

/** Droits (fonction pure, réutilisée par les hooks). */
export const computeRights = (essaiLocal, droitsServeur, abonneLocal) => {
  const today = todayKey();
  const serverJours = droitsServeur?.essai?.jours || [];
  const jours = [...new Set([...(essaiLocal?.jours || []), ...serverJours])];
  const essai = core.trialState(jours, essaiLocal?.ia || 0, today);
  const abonne = Boolean(droitsServeur?.abonne || abonneLocal);
  return { abonne, essai, peutEtudier: abonne || essai.actif, iaRestantes: abonne ? null : essai.iaRestantes };
};

/** Synthèse pour l'affichage (en-tête Prépa, Progrès, Abonnement) — fonction pure. */
export const computeSummary = (code, etatStored, objectifPref) => {
  const programme = getProgramme(code);
  if (!programme) return null;
  const etat = etatStored || core.emptyProgress(objectifPref);
  const mods = publishedModuleDefs(programme);
  const today = todayKey();
  const statuses = mods.map((m) => core.moduleStatus(m, etat));
  return {
    programme,
    etat,
    pourcentage: mods.length ? statuses.reduce((sum, st) => sum + st.pourcentage, 0) / mods.length : 0,
    modulesValides: statuses.filter((st) => st.valide).length,
    modulesTotal: mods.length,
    serie: core.currentStreak(etat, today),
    minutesJour: core.minutesToday(etat, today),
    objectif: etat.objectifQuotidien || objectifPref || 10,
    reviews: core.dueReviews(etat, today),
    stats: core.publicStats(etat),
  };
};

/**
 * Version lue d'un cours de langue : [version, choisir(version), versions disponibles].
 * « fr » (explications en français) par défaut ; une seule version pour les autres modules.
 */
export const useModuleVersion = (moduleCode) => {
  const choisie = usePrep((s) => s.prefs.versions?.[moduleCode]);
  const setModuleVersion = usePrep((s) => s.setModuleVersion);
  const versions = useMemo(() => moduleVersions(getModule(moduleCode)), [moduleCode]);
  const version = versions.includes(choisie) ? choisie : versions[0];
  return [version, (v) => setModuleVersion(moduleCode, v), versions];
};

/** Hooks sûrs : sélection de valeurs stables, calcul mémorisé (zustand v5 exige des sélecteurs stables). */
export const useRights = () => {
  const [essai, droits, abonneLocal] = usePrep(useShallow((s) => [s.essai, s.droitsServeur, s.abonneLocal]));
  return useMemo(() => computeRights(essai, droits, abonneLocal), [essai, droits, abonneLocal]);
};

export const useSummary = (code) => {
  const [programme, progressions, objectif] = usePrep(useShallow((s) => [code || s.programme, s.progressions, s.prefs.objectif]));
  const etat = progressions[programme];
  return useMemo(() => (programme ? computeSummary(programme, etat, objectif) : null), [programme, etat, objectif]);
};

export const useProgress = (code) => {
  const [programme, progressions, objectif] = usePrep(useShallow((s) => [code || s.programme, s.progressions, s.prefs.objectif]));
  const etat = progressions[programme];
  return useMemo(() => etat || core.emptyProgress(objectif), [etat, objectif]);
};

export default usePrep;
