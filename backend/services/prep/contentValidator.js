const core = require('./shared/prepCore');
const validCode = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value) && !['constructor', 'prototype', '__proto__'].includes(value);
const validateContent = (bibliotheque, programmes = []) => {
  const errors = [];
  const warn = [];
  const fail = (where, message) => errors.push(`${where} : ${message}`);

  /** Réponse « parfaite » construite depuis la clé, pour vérifier que le validateur l'accepte. */
  const perfectAnswer = (ex) => {
    const k = ex.cle;
    switch (ex.type) {
      case 'qcm': case 'entourer': case 'surligner': return { ids: k.ids };
      case 'vraiFaux': return { valeurs: k.valeurs };
      case 'glisser': return { trous: Object.fromEntries(Object.entries(k.trous).map(([t, ids]) => [t, ids[0]])) };
      case 'ordre': return { ordre: k.ordre };
      case 'relier': return { paires: k.paires };
      case 'classer': return { cartes: k.cartes };
      case 'numerique': return { valeur: k.valeur };
      default: return {};
    }
  };

  const checkPerfect = (ex, where) => {
    const result = core.validate(ex, perfectAnswer(ex));
    if (!result.correct || result.score !== 1) fail(where, 'la bonne réponse n’est pas acceptée par le validateur');
    if (!core.isComplete(ex, perfectAnswer(ex))) fail(where, 'la bonne réponse n’active pas « Vérifier »');
  };

  // ── Cours de langue étrangère : deux versions obligatoires ───────────────
  // Matières de langue étrangère : le cours est expliqué en français par défaut et doit aussi
  // exister entièrement dans la langue étudiée (module.versionCible).
  const MATIERES_LANGUE = { Anglais: 'en', Espagnol: 'es', Allemand: 'de', Arabe: 'ar', Portugais: 'pt', Italien: 'it', Chinois: 'zh', Russe: 'ru' };
  const CHAMPS_EXERCICE = new Set([...core.TRADUISIBLES.exercice, ...core.TRADUISIBLES.contenu]);

  const checkMiniQuestions = (blocs, where) => {
    (blocs || []).forEach((bloc) => {
      if (bloc.type !== 'miniQuestion') return;
      const ex = bloc.exercice;
      if (seenCodes.has(ex.code)) fail(ex.code, 'code de mini-question en double');
      seenCodes.add(ex.code);
      core.checkExercise({ ...ex, miniCours: ex.miniCours || { corps: 'non noté' } }).forEach((e) => fail(`${where} ${ex.code}`, e));
      checkPerfect(ex, ex.code);
    });
  };

  const checkVersionCible = (mod) => {
    const attendue = MATIERES_LANGUE[mod.matiere];
    if (attendue && mod.langueCible !== attendue) fail(mod.code, `cours de langue (${mod.matiere}) : déclarer langueCible « ${attendue} » et sa version cible`);
    if (!mod.langueCible) {
      if (mod.versionCible) fail(mod.code, 'versionCible sans langueCible');
      return;
    }
    const v = mod.versionCible;
    if (!/^[a-z]{2}$/.test(mod.langueCible) || mod.langueCible === core.VERSION_PAR_DEFAUT) fail(mod.code, `langueCible invalide : ${mod.langueCible}`);
    if (!v) { fail(mod.code, 'cours de langue : versionCible manquante (deux versions obligatoires)'); return; }
    if (v.langue !== mod.langueCible) fail(mod.code, 'versionCible.langue doit être égale à langueCible');
    if (!v.titre || !v.resume) fail(mod.code, 'versionCible : titre et résumé obligatoires');
    // Notions : toutes traduites, aucune inconnue.
    const notionCodes = mod.notions.map((n) => n.code);
    notionCodes.forEach((c) => { if (!v.notions?.[c]) fail(mod.code, `versionCible : notion ${c} non traduite`); });
    Object.keys(v.notions || {}).forEach((c) => { if (!notionCodes.includes(c)) fail(mod.code, `versionCible : notion inconnue ${c}`); });
    // Leçons : mêmes codes, chacune complète.
    const leconCodes = mod.lecons.map((l) => l.code);
    leconCodes.forEach((c) => {
      const l = v.lecons?.[c];
      if (!l) { fail(mod.code, `versionCible : leçon ${c} manquante`); return; }
      if (!l.titre || !(l.duree > 0) || !Array.isArray(l.blocs) || !l.blocs.length) fail(c, 'versionCible : titre, durée et blocs obligatoires');
      checkMiniQuestions(l.blocs, `${c} (${v.langue})`);
    });
    Object.keys(v.lecons || {}).forEach((c) => { if (!leconCodes.includes(c)) fail(mod.code, `versionCible : leçon inconnue ${c}`); });
    // Exercices : tous traduits ; seuls les textes pédagogiques peuvent changer.
    mod.exercices.forEach((ex) => {
      const trad = v.exercices?.[ex.code];
      if (!trad) { fail(ex.code, `versionCible : exercice non traduit (${v.langue})`); return; }
      Object.keys(trad).forEach((k) => { if (!CHAMPS_EXERCICE.has(k)) fail(ex.code, `versionCible : champ non traduisible « ${k} »`); });
      if (Array.isArray(trad.categories) && trad.categories.length !== (ex.contenu.categories || []).length) fail(ex.code, 'versionCible : catégories incomplètes');
      if (Array.isArray(trad.affirmations) && trad.affirmations.length !== (ex.contenu.affirmations || []).length) fail(ex.code, 'versionCible : affirmations incomplètes');
      const traduit = core.exerciseVersion(ex, trad);
      core.checkExercise(traduit).forEach((e) => fail(`${ex.code} (${v.langue})`, e));
      checkPerfect(traduit, `${ex.code} (${v.langue})`);
    });
    Object.keys(v.exercices || {}).forEach((c) => { if (!mod.exercices.some((ex) => ex.code === c)) fail(mod.code, `versionCible : exercice inconnu ${c}`); });
  };

  // ── Bibliothèque ─────────────────────────────────────────────────────────
  const modules = {};
  const seenCodes = new Set();
  bibliotheque.forEach((mod) => {
    try {
    if (modules[mod.code]) fail(mod.code, 'module en double');
    const notionCodes = mod.notions.map((n) => n.code);
    mod.lecons.forEach((lecon) => {
      if (seenCodes.has(lecon.code)) fail(lecon.code, 'code de leçon en double');
      seenCodes.add(lecon.code);
      lecon.blocs.forEach((bloc) => {
        if (bloc.type !== 'miniQuestion') return;
        const ex = bloc.exercice;
        if (!validCode(ex.code) || seenCodes.has(ex.code)) fail(ex.code, 'code de mini-question invalide ou dupliqué');
        seenCodes.add(ex.code);
        // Mini-question : non notée, sans mini-cours (§ 9.2).
        const errs = core.checkExercise({ ...ex, miniCours: ex.miniCours || { corps: 'non noté' } });
        errs.forEach((e) => fail(ex.code, e));
        checkPerfect(ex, ex.code);
      });
    });
    const parNiveau = { 1: 0, 2: 0, 3: 0 };
    mod.exercices.forEach((ex) => {
      if (seenCodes.has(ex.code)) fail(ex.code, 'code d’exercice en double');
      seenCodes.add(ex.code);
      if (!validCode(ex.code)) fail(ex.code, 'code d’exercice invalide');
      core.checkExercise(ex).forEach((e) => fail(ex.code, e));
      (ex.notions || []).forEach((n) => { if (!notionCodes.includes(n)) fail(ex.code, `notion inconnue ${n}`); });
      if (!ex.notions || !ex.notions.length) warn.push(`${ex.code} : aucune notion rattachée`);
      checkPerfect(ex, ex.code);
      parNiveau[ex.niveau] += 1;
    });
    [1, 2, 3].forEach((n) => { if (!parNiveau[n]) fail(mod.code, `aucun exercice de niveau ${n}`); });
    checkVersionCible(mod);
    modules[mod.code] = {
      ...mod,
      publie: true,
      duree: mod.lecons.reduce((sum, l) => sum + l.duree, 0),
      versions: core.moduleVersions(mod),
      stats: { lecons: mod.lecons.length, exercices: mod.exercices.length, parNiveau },
    };
    } catch (error) { fail(mod?.code || "module", "Structure invalide : " + error.message); }
  });


  const codes = new Set();
  const allowedBlocks = new Set(['texte', 'titre', 'exemple', 'piege', 'aRetenir', 'formule', 'liste', 'tableau', 'miniQuestion', 'recap']);
  // Types pris en charge par le lecteur mobile existant.
  for (const mod of bibliotheque) {
    if (!validCode(mod.code) || !mod.titre || !mod.matiere || !mod.lecons?.length) fail(mod.code, 'code, titre, matière et leçons obligatoires');
    for (const lesson of [...(mod.lecons || []), ...Object.values(mod.versionCible?.lecons || {}).map(l => ({ ...l, code: mod.code }))]) {
      if (!validCode(lesson.code) || !lesson.titre || !(lesson.duree > 0) || !Array.isArray(lesson.blocs) || !lesson.blocs.length) fail(lesson.code, 'leçon incomplète');
      for (const b of lesson.blocs || []) {
        if (!allowedBlocks.has(b.type)) fail(lesson.code, `type de bloc inconnu ${b.type}`);
        if (b.type === 'texte' && (typeof b.md !== 'string' || !b.md.trim())) fail(lesson.code, 'texte Markdown obligatoire');
        if (['titre', 'exemple', 'piege', 'aRetenir', 'formule'].includes(b.type) && (typeof b.texte !== 'string' || !b.texte.trim())) fail(lesson.code, 'texte de bloc obligatoire');
        if (['liste', 'recap'].includes(b.type) && (!Array.isArray(b.items) || !b.items.length || b.items.some(v => typeof v !== 'string'))) fail(lesson.code, 'liste de textes obligatoire');
        if (b.type === 'tableau' && (!Array.isArray(b.entetes) || b.entetes.some(v => typeof v !== 'string') || !Array.isArray(b.lignes) || b.lignes.some(row => !Array.isArray(row) || row.length !== b.entetes.length || row.some(v => typeof v !== 'string')))) fail(lesson.code, 'tableau invalide');
      }
    }
  }
  for (const p of programmes) {
    if (!validCode(p.code) || codes.has(p.code)) fail(p.code, 'code de programme invalide ou dupliqué');
    codes.add(p.code);
    if (!p.titre || !p.organisme?.sigle || !Array.isArray(p.matieres) || !p.matieres.length) { fail(p.code, 'programme incomplet'); continue; }
    for (const m of p.matieres) if (!m || typeof m.nom !== 'string' || !m.nom.trim() || !Array.isArray(m.modules)) fail(p.code, 'matière et liste de modules obligatoires');
    const refs = p.matieres.flatMap(m => m?.modules || []);
    if (!refs.some(ref => ref.publie)) fail(p.code, 'aucun module publié');
    for (const ref of refs) {
      if (typeof ref.publie !== 'boolean') fail(p.code, 'statut de référence invalide');
      if (!validCode(ref.code)) fail(p.code, 'code de module invalide');
      if (ref.publie && !modules[ref.code]) fail(p.code, `module inconnu ${ref.code}`);
    }
    p.stats = { modulesPublies: refs.filter(r => r.publie).length, modulesTotal: refs.length };
  }
  // Les textes fournis par l'éditeur doivent rester rendables par les clients existants.
  const textFields = new Set(['sigle', 'titre', 'resume', 'description', 'matiere', 'nom', 'consigne', 'explication', 'corps', 'md', 'texte', 'libelle', 'legende']);
  const checkText = (value, where) => {
    if (!value || typeof value !== 'object') return;
    for (const [field, child] of Object.entries(value)) {
      if (textFields.has(field) && child !== null && typeof child !== 'string') fail(where, `${field} doit être un texte`);
      checkText(child, where);
    }
  };
  [...bibliotheque, ...programmes].forEach(value => checkText(value, value.code));
  return { errors, warnings: warn, modules, programmes };
};
module.exports = { validateContent, validCode };
