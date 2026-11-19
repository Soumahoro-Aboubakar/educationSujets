import core from './shared/prepCore';

/**
 * Plan d'étude et atlas du programme (espace de préparation web).
 *
 * Deux usages d'un même programme :
 * - « Mon plan » (débutant) : la plateforme choisit les tâches du jour, dans l'ordre conseillé, en
 *   alternant les matières pour ne pas rester bloqué sur une seule ;
 * - « Programme » (avancé) : l'atlas complet, par matière, avec l'état de chaque module, pour aller
 *   droit à la leçon ou au niveau voulu.
 *
 * Fonctions pures : elles ne lisent que le programme publié (titres, leçons, nombre d'exercices) et
 * la progression renvoyée par le serveur ; aucune note n'est calculée ici.
 */

export const SEUIL_NIVEAU = 0.7;

// Test de niveau (résultat gardé sur cet appareil, comme dans l'application).
const PLACEMENT_KEY = (programme) => `fatafalta.prep.placement.${programme}`;
export const savePlacement = (programme, value) => { try { window.localStorage.setItem(PLACEMENT_KEY(programme), JSON.stringify(value)); } catch (e) { /* rien */ } };
export const readPlacement = (programme) => { try { return JSON.parse(window.localStorage.getItem(PLACEMENT_KEY(programme)) || 'null'); } catch (e) { return null; } }; // un niveau est « réussi » à 70 % (même repère que la validation)

/** Modules publiés du programme, dans l'ordre des matières puis du programme, sans doublon. */
export const orderedModules = (data) => {
  const seen = new Set();
  const out = [];
  (data?.programme?.matieres || []).forEach((matiere, matiereIndex) => {
    (matiere.modules || []).forEach((ref) => {
      const mod = data.modules?.[ref.code];
      if (!mod || seen.has(ref.code)) return;
      seen.add(ref.code);
      out.push({ ...mod, code: ref.code, matiere: matiere.nom, matiereIndex });
    });
  });
  return out;
};

/** État d'un module pour l'affichage : leçons faites, scores par niveau, prochaine étape. */
export const moduleState = (mod, etat) => {
  const st = core.moduleStatus(mod, etat || core.emptyProgress());
  const scores = etat?.scores?.[mod.code] || {};
  const lessons = (mod.lecons || []).map((l, index) => {
    const p = etat?.lecons?.[l.code];
    const lu = p ? Math.max(p.derniere ?? 0, p.position ?? 0) : 0;
    return { ...l, index, progress: p, lu, state: p?.terminee ? 'done' : p ? 'progress' : 'todo' };
  });
  const nextLesson = lessons.find((l) => l.state !== 'done') || null;
  const parNiveau = mod.stats?.parNiveau || {};
  const niveaux = [1, 2, 3].map((n) => ({
    niveau: n,
    exercices: parNiveau[n] || 0,
    score: scores[n] || 0,
    reussi: (scores[n] || 0) >= SEUIL_NIVEAU,
    verrouille: n === 3 && !st.niveau3Debloque,
  }));
  return { ...st, lessons, nextLesson, niveaux, lastActivity: lastActivity(lessons) };
};

const lastActivity = (lessons) => lessons.reduce((best, l) => (l.progress?.le && l.progress.le > best ? l.progress.le : best), '');

const lessonTask = (programme, mod, lesson, reason) => ({
  kind: 'lecon',
  key: `lecon:${lesson.code}`,
  title: lesson.titre,
  subtitle: `${mod.titre} · leçon ${lesson.index + 1} sur ${mod.lecons.length}`,
  matiere: mod.matiere,
  minutes: lesson.duree || 4,
  video: lesson.video || null,
  progress: lesson.lu,
  reason,
  to: `/preparation/${programme}/${mod.code}/lecon/${lesson.code}`,
});

const sessionTask = (programme, mod, niveau, reason) => ({
  kind: 'session',
  key: `session:${mod.code}:${niveau.niveau}`,
  title: `Exercices · niveau ${niveau.niveau}`,
  subtitle: `${mod.titre} · ${niveau.exercices} exercice${niveau.exercices > 1 ? 's' : ''}`,
  matiere: mod.matiere,
  minutes: Math.max(4, Math.min(15, Math.round(niveau.exercices * 0.8))),
  score: niveau.score,
  reason,
  to: `/preparation/${programme}/${mod.code}/niveau/${niveau.niveau}`,
});

/** Prochaine tâche utile d'un module : leçon à finir, sinon premier niveau non réussi et ouvert. */
const nextTaskOf = (programme, mod, state, reason) => {
  if (state.nextLesson) return lessonTask(programme, mod, state.nextLesson, reason);
  const niveau = state.niveaux.find((n) => n.exercices && !n.reussi && !n.verrouille);
  return niveau ? sessionTask(programme, mod, niveau, reason) : null;
};

/**
 * Plan du jour : au plus 4 tâches, dans cet ordre :
 * 1. reprendre l'activité interrompue (leçon ou session) ;
 * 2. avancer dans le module conseillé (premier module non validé de la matière en cours) ;
 * 3. s'entraîner sur ce module dès qu'une leçon y est terminée ;
 * 4. changer de matière : la prochaine étape de la matière la moins travaillée récemment.
 */
export const buildPlan = (data, etat, { max = 4, placement = null } = {}) => {
  const programme = data?.programme?.code;
  const modules = orderedModules(data);
  if (!programme || !modules.length) return { tasks: [], focus: null };
  const states = new Map(modules.map((m) => [m.code, moduleState(m, etat)]));
  const tasks = [];
  const add = (task) => { if (task && !tasks.some((t) => t.key === task.key)) tasks.push(task); };

  const reprise = etat?.derniereReprise;
  const repriseModule = reprise?.module ? modules.find((m) => m.code === reprise.module) : null;
  if (repriseModule) {
    const st = states.get(repriseModule.code);
    const lesson = reprise.type === 'lecon' ? st.lessons.find((l) => l.code === reprise.lecon && l.state !== 'done') : null;
    if (lesson) add(lessonTask(programme, repriseModule, lesson, 'Reprendre là où tu t’es arrêté'));
    else if (reprise.type === 'session' && reprise.niveau) {
      const niveau = st.niveaux.find((n) => n.niveau === reprise.niveau);
      if (niveau && !niveau.reussi) add(sessionTask(programme, repriseModule, niveau, 'Reprendre ta session'));
    }
  }

  // Matière en cours : celle de la reprise, sinon celle du premier module non validé.
  const departs = new Map((placement?.resultats || []).filter((r) => r.depart).map((r) => [r.matiere, r.depart.code]));
  const openIn = (name) => {
    const depart = departs.get(name);
    const placed = depart && modules.find((m) => m.code === depart && !states.get(m.code).valide);
    return placed || modules.find((m) => m.matiere === name && !states.get(m.code).valide);
  };
  const firstOpen = modules.find((m) => !states.get(m.code).valide);
  const focusMatiere = repriseModule?.matiere || firstOpen?.matiere || modules[0].matiere;
  const focusModule = openIn(focusMatiere) || firstOpen;
  if (focusModule) {
    const st = states.get(focusModule.code);
    add(nextTaskOf(programme, focusModule, st, st.statut === 'nonCommence' ? 'Ton point de départ' : 'Suite conseillée'));
    // S'entraîner tôt : dès qu'une leçon est terminée, le niveau 1 consolide ce qui vient d'être lu.
    const n1 = st.niveaux[0];
    if (st.leconsFaites > 0 && n1.exercices && !n1.reussi) add(sessionTask(programme, focusModule, n1, 'Consolider ce que tu viens de lire'));
  }

  // Alternance : la matière la moins travaillée récemment (jamais commencée d'abord).
  const others = [...new Set(modules.map((m) => m.matiere))].filter((name) => name !== focusMatiere);
  const byRecency = others.map((name) => {
    const mods = modules.filter((m) => m.matiere === name);
    const recent = mods.reduce((best, m) => (states.get(m.code).lastActivity > best ? states.get(m.code).lastActivity : best), '');
    return { name, recent, mod: openIn(name) };
  }).filter((x) => x.mod).sort((a, b) => (a.recent < b.recent ? -1 : a.recent > b.recent ? 1 : 0));
  byRecency.slice(0, Math.max(0, max - tasks.length)).forEach(({ mod }) => add(nextTaskOf(programme, mod, states.get(mod.code), 'Change de matière')));

  return { tasks: tasks.slice(0, max), focus: focusModule || null, states };
};

/** Atlas : matières → modules avec leur état, et la part maîtrisée de chaque matière. */
export const buildAtlas = (data, etat) => {
  const modules = orderedModules(data);
  const groups = new Map();
  modules.forEach((m) => {
    const st = moduleState(m, etat);
    if (!groups.has(m.matiere)) groups.set(m.matiere, { nom: m.matiere, modules: [] });
    groups.get(m.matiere).modules.push({ ...m, state: st });
  });
  return [...groups.values()].map((g) => ({
    ...g,
    maitrise: g.modules.length ? g.modules.reduce((a, m) => a + m.state.pourcentage, 0) / g.modules.length : 0,
    valides: g.modules.filter((m) => m.state.valide).length,
  }));
};

/** Journée et semaine : minutes du jour, objectif, série, 7 derniers jours. */
export const dayStats = (etat, today) => {
  const s = etat || core.emptyProgress();
  const minutes = Math.round(core.minutesToday(s, today));
  const objectif = s.objectifQuotidien || 10;
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = core.addDays(today, i - 6);
    return { day, minutes: Math.round((s.minutesParJour || {})[day] || 0) };
  });
  return { minutes, objectif, atteint: minutes >= objectif, serie: core.currentStreak(s, today), week, stats: core.publicStats(s), revisions: core.dueReviews(s, today, 20) };
};
