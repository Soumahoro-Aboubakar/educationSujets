import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import core from './shared/prepCore';
import { loadState, saveState } from './storage';
import { deviceIdentifiers } from './device';
import prepApi, { setPrepToken } from './api';
import { getLesson, getModule, getProgramme, publishedModuleDefs } from './content';

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
let counter = 0;
const newKey = () => `${Date.now().toString(36)}-${(counter += 1).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const PERSISTED = ['identite', 'token', 'essai', 'droitsServeur', 'programme', 'programmesSuivis', 'progressions', 'queue', 'prefs', 'enCours', 'sessions', 'derniereDate', 'onboarding'];

const DEFAULT_PREFS = { objectif: 10, tailleTexte: 17, puce: {}, rythmeFait: false, testPropose: {}, notifications: true };

const usePrep = create((set, get) => ({
  ready: false,
  identite: null,
  token: null,
  essai: { jours: [], ia: 0 },
  droitsServeur: null,
  abonneLocal: false,
  programme: null,
  programmesSuivis: [],
  progressions: {},
  queue: [],
  prefs: DEFAULT_PREFS,
  enCours: {},
  sessions: {},
  online: null,
  derniereDate: null,
  horlogeSuspecte: false,
  retour: null,
  onboarding: { fait: false, choix: null },

  persist: () => {
    const s = get();
    const snapshot = {};
    PERSISTED.forEach((k) => { snapshot[k] = s[k]; });
    saveState(snapshot);
  },

  hydrate: async () => {
    const stored = await loadState();
    const today = todayKey();
    const patch = stored ? { ...stored, prefs: { ...DEFAULT_PREFS, ...(stored.prefs || {}) } } : {};
    // Manipulation de l'horloge (§ 25.8) : une date antérieure à la dernière connue est suspecte.
    const suspect = Boolean(stored?.derniereDate && today < stored.derniereDate);
    set({ ...patch, ready: true, horlogeSuspecte: suspect, derniereDate: suspect ? stored.derniereDate : today });
    if (patch.token) setPrepToken(patch.token);
    get().ensureIdentity();
  },

  /** Identité automatique, sans saisie (§ 25.1) ; restaurée après réinstallation (§ 25.4). */
  ensureIdentity: async () => {
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
    set({ queue: [...get().queue, { cle: newKey(), jour: todayKey(), ...action }].slice(-2000), derniereDate: todayKey() });
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
    try {
      const out = await prepApi.sync(batch);
      const sent = new Set(batch.map((a) => a.cle));
      const restant = get().queue.filter((a) => !sent.has(a.cle));
      const patch = { queue: restant, droitsServeur: out.droits, online: true };
      if (!restant.length) {
        patch.progressions = { ...get().progressions };
        Object.entries(out.progressions || {}).forEach(([code, p]) => { patch.progressions[code] = p.etat; });
      }
      const joursServeur = out.droits?.essai?.jours || [];
      patch.essai = { ...get().essai, jours: [...new Set([...get().essai.jours, ...joursServeur])].sort() };
      set(patch);
      get().persist();
      if (restant.length) setTimeout(() => get().flush(), 300);
    } catch (error) {
      set({ online: false });
    } finally {
      flushing = false;
    }
  },

  // ── Leçons (§ 9) ───────────────────────────────────────────────────────
  lessonProgress: (programme, lecon, position, terminee) => {
    const found = getLesson(lecon);
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

  setEnCours: (programme, value) => { set({ enCours: { ...get().enCours, [programme]: value } }); get().persist(); },

  // ── Sessions d'exercices (§ 10) ────────────────────────────────────────
  saveSession: (session) => { set({ sessions: { ...get().sessions, [session.id]: session } }); get().persist(); },
  dropSession: (id) => { const next = { ...get().sessions }; delete next[id]; set({ sessions: next }); get().persist(); },

  /** Tentative corrigée localement (validateur partagé) puis envoyée au serveur. */
  attempt: ({ programme, exercice, module, reponse, essai, indices, contexte, session, duree }) => {
    const found = getModule(module)?.exercices.find((e) => e.code === exercice);
    if (!found) return null;
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
