import pack from './content/pack.json';
import core from './shared/prepCore';

/**
 * Accès au contenu de préparation embarqué (pack hors ligne, § 22). Le pack est produit et
 * validé côté serveur par « npm run prep:pack » ; l'API sert exactement le même contenu.
 */
const exercises = new Map();
const lessons = new Map();
Object.values(pack.modules).forEach((mod) => {
  mod.exercices.forEach((ex) => exercises.set(ex.code, { exercice: ex, module: mod }));
  mod.lecons.forEach((lecon, index) => lessons.set(lecon.code, { lecon, module: mod, index }));
});

export const programmes = pack.programmes;
export const getProgramme = (code) => pack.programmes.find((p) => p.code === code) || null;
export const getModule = (code) => pack.modules[code] || null;
export const getExercise = (code) => exercises.get(code) || null;
export const getLesson = (code) => lessons.get(code) || null;

/** Organismes → cycles (même forme que GET /api/prep/catalogue, sans logos). */
export const localCatalogue = () => {
  const groups = new Map();
  pack.programmes.forEach((p) => {
    const key = p.organisme.sigle;
    if (!groups.has(key)) groups.set(key, { sigle: key, nom: key, logo: null, organismeId: null, cycles: [] });
    groups.get(key).cycles.push({
      programme: p.code, nom: p.titre, parcoursType: p.parcoursType, matieres: p.matieres.length,
      modulesPublies: p.stats.modulesPublies, modulesTotal: p.stats.modulesTotal, publie: p.stats.modulesPublies > 0,
    });
  });
  return [...groups.values()];
};

/** Modules d'un programme, avec matière et teinte ; les modules partagés n'apparaissent qu'une fois. */
export const programmeModules = (programme) => {
  if (!programme) return [];
  const seen = new Set();
  const list = [];
  programme.matieres.forEach((matiere) => {
    matiere.modules.forEach((ref) => {
      if (seen.has(ref.code)) return;
      seen.add(ref.code);
      const mod = ref.publie ? pack.modules[ref.code] : null;
      list.push({
        code: ref.code,
        titre: mod ? mod.titre : ref.titre,
        resume: mod ? mod.resume : ref.notions.map((n) => n.libelle).join(' · '),
        matiere: matiere.nom,
        teinte: matiere.teinte,
        publie: Boolean(ref.publie),
        module: mod,
      });
    });
  });
  return list.map((item, index) => ({ ...item, numero: index + 1 }));
};

export const publishedModuleDefs = (programme) => programmeModules(programme).filter((m) => m.publie).map((m) => m.module);

/** Exercices d'un niveau d'un module (§ 7.2) ; le niveau 2 mélange les notions du module. */
export const levelExercises = (mod, niveau) => mod.exercices.filter((ex) => ex.niveau === niveau);

/**
 * Sélection pour un concours blanc ou un test de positionnement, déterministe pour une graine.
 * Blanc : niveaux 2 et 3 majoritairement (§ 17). Test : niveaux variés, toutes matières (§ 16).
 */
export const pickAcrossProgramme = (programme, { nombre, mode, graine }) => {
  const mods = publishedModuleDefs(programme);
  const pools = mods.map((m) => core.seededShuffle(
    m.exercices.filter((ex) => (mode === 'blanc' ? ex.niveau >= 2 : true)),
    `${graine}:${m.code}`,
  ));
  const picked = [];
  let round = 0;
  while (picked.length < nombre && pools.some((p) => p.length > round)) {
    pools.forEach((pool) => { if (picked.length < nombre && pool[round]) picked.push(pool[round].code); });
    round += 1;
  }
  return core.seededShuffle(picked, `${graine}:ordre`);
};

export const packInfo = { version: pack.version, genereLe: pack.genereLe, provenance: pack.provenance };
export default pack;
