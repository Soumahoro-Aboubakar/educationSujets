const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// Charge src/prep/contentRepo.js (logique pure, sans React Native).
const repo = (() => {
  const { code } = babel.transformSync(read('src/prep/contentRepo.js'), {
    filename: 'contentRepo.js', babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('module', 'exports', code)(module, module.exports); // même contexte : deepEqual fiable
  return module.exports;
})();

const pack = JSON.parse(read('src/prep/content/pack.json'));
const sha = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bundle = { modules: pack.modules, programmes: pack.programmes.map((p) => p.code), empreintes: pack.empreintes.modules };
const [MOD_A, MOD_B] = Object.keys(pack.modules);
const PROG = pack.programmes[0];

/** Manifeste identique au pack embarqué (état juste après l'import du lot 3). */
const baseManifest = (generation = 1) => ({
  generation,
  schemaVersion: 1,
  entries: [
    ...Object.keys(pack.modules).map((code) => ({ kind: 'module', code, revision: 1, hash: pack.empreintes.modules[code], schemaVersion: 1 })),
    ...pack.programmes.map((p) => ({ kind: 'programme', code: p.code, revision: 1, hash: `p-${p.code}`, schemaVersion: 1 })),
  ],
});
const programmesFetched = Object.fromEntries(pack.programmes.map((p) => [p.code, p]));
const publicCopy = (mod, patch = {}) => ({
  ...mod, ...patch, distant: true,
  exercices: mod.exercices.map(({ cle, explication, raisonnement, ...rest }) => ({ ...rest, raisonnement: { actif: false } })),
});

test('le pack embarqué porte l’empreinte de chaque module, calculée comme le registre de publication', () => {
  assert.equal(Object.keys(pack.empreintes.modules).length, Object.keys(pack.modules).length);
  for (const [code, mod] of Object.entries(pack.modules)) assert.equal(pack.empreintes.modules[code], sha(mod), code);
});

test('manifeste identique au pack : aucun module téléchargé, correction locale conservée', () => {
  const plan = repo.planUpdate(repo.emptyCache(), baseManifest(), bundle);
  assert.equal(plan.action, 'appliquer');
  assert.equal(plan.fetchModules.length, 0);
  assert.equal(plan.bundleModules.length, Object.keys(pack.modules).length);
  const cache = repo.applyPlan(repo.emptyCache(), plan, { programmes: programmesFetched });
  const resolved = repo.resolveModule(cache, bundle, MOD_A);
  assert.equal(resolved.distant, false);
  assert.ok(resolved.module.exercices.some((ex) => 'cle' in ex), 'clés embarquées disponibles hors ligne');
});

test('nouveau programme absent du bundle et module partagé : disponibles sans nouvelle version de l’app', () => {
  const manifest = baseManifest(2);
  const nouveau = { ...PROG, code: 'NOUVEAU-PROG', titre: 'Nouveau concours', organisme: { sigle: 'NOUV', recherche: ['NOUV'] } };
  const nouveauModule = publicCopy(pack.modules[MOD_A], { code: 'NOUV-MOD', titre: 'Module inédit' });
  nouveau.matieres = [{ nom: 'Tronc', teinte: 0, modules: [{ code: 'NOUV-MOD', publie: true }, { code: MOD_B, publie: true }] }];
  manifest.entries.push({ kind: 'programme', code: 'NOUVEAU-PROG', revision: 1, hash: 'p-new', schemaVersion: 1 });
  manifest.entries.push({ kind: 'module', code: 'NOUV-MOD', revision: 1, hash: 'm-new', schemaVersion: 1 });
  const plan = repo.planUpdate(repo.emptyCache(), manifest, bundle);
  assert.deepEqual(plan.fetchModules.map((e) => e.code), ['NOUV-MOD']);
  const cache = repo.applyPlan(repo.emptyCache(), plan, { programmes: { ...programmesFetched, 'NOUVEAU-PROG': nouveau }, modules: { 'NOUV-MOD': { fr: nouveauModule } } });
  assert.equal(repo.resolveProgramme(cache, pack.programmes, 'NOUVEAU-PROG').titre, 'Nouveau concours');
  assert.ok(repo.listProgrammes(cache, pack.programmes).some((p) => p.code === 'NOUVEAU-PROG'));
  assert.equal(repo.resolveModule(cache, bundle, 'NOUV-MOD').module.titre, 'Module inédit');
  // Le module partagé reste celui du pack (même empreinte), utilisé par les deux programmes.
  assert.equal(repo.resolveModule(cache, bundle, MOD_B).distant, false);
});

test('mise à jour d’exercice : la nouvelle révision remplace l’ancienne, sans clé de correction notée', () => {
  const manifest = baseManifest(2);
  const entry = manifest.entries.find((e) => e.code === MOD_A);
  Object.assign(entry, { revision: 2, hash: 'modifie' });
  const plan = repo.planUpdate(repo.emptyCache(), manifest, bundle);
  assert.deepEqual(plan.fetchModules.map((e) => [e.code, e.revision]), [[MOD_A, 2]]);
  const updated = publicCopy(pack.modules[MOD_A]);
  updated.exercices[0] = { ...updated.exercices[0], consigne: 'Consigne corrigée' };
  const cache = repo.applyPlan(repo.emptyCache(), plan, { programmes: programmesFetched, modules: { [MOD_A]: { fr: updated } } });
  const resolved = repo.resolveModule(cache, bundle, MOD_A);
  assert.equal(resolved.revision, 2);
  assert.equal(resolved.module.exercices[0].consigne, 'Consigne corrigée');
  // Absence de correction embarquée notée : la correction viendra du serveur.
  assert.ok(resolved.module.exercices.every((ex) => repo.needsServerGrading(ex)));
  assert.equal(repo.needsServerGrading(pack.modules[MOD_A].exercices[0]), false);
});

test('nouvelle traduction : chaque version téléchargée est servie, repli sur le français', () => {
  const manifest = baseManifest(2);
  Object.assign(manifest.entries.find((e) => e.code === MOD_A), { revision: 2, hash: 'traduit' });
  const plan = repo.planUpdate(repo.emptyCache(), manifest, bundle);
  const fr = publicCopy(pack.modules[MOD_A], { version: 'fr', versions: ['fr', 'en'] });
  const en = publicCopy(pack.modules[MOD_A], { version: 'en', versions: ['fr', 'en'], titre: 'English title' });
  const cache = repo.applyPlan(repo.emptyCache(), plan, { programmes: programmesFetched, modules: { [MOD_A]: { fr, en } } });
  assert.equal(repo.resolveModule(cache, bundle, MOD_A, 'en').module.titre, 'English title');
  assert.equal(repo.resolveModule(cache, bundle, MOD_A, 'es').module.version, 'fr');
});

test('retrait : un programme ou module retiré disparaît, même du pack embarqué', () => {
  const manifest = baseManifest(3);
  manifest.entries = manifest.entries.filter((e) => e.code !== MOD_A && e.code !== PROG.code);
  const plan = repo.planUpdate(repo.emptyCache(), manifest, bundle);
  const cache = repo.applyPlan(repo.emptyCache(), plan, { programmes: programmesFetched });
  assert.equal(repo.resolveModule(cache, bundle, MOD_A), null);
  assert.equal(repo.resolveProgramme(cache, pack.programmes, PROG.code), null);
  assert.ok(!repo.listProgrammes(cache, pack.programmes).some((p) => p.code === PROG.code));
});

test('manifeste incompatible ou illisible : le cache précédent reste utilisé', () => {
  const cache = repo.applyPlan(repo.emptyCache(), repo.planUpdate(repo.emptyCache(), baseManifest(1), bundle), { programmes: programmesFetched });
  assert.equal(repo.planUpdate(cache, { ...baseManifest(2), schemaVersion: 2 }, bundle).action, 'ignorer');
  const futur = baseManifest(2);
  futur.entries[0].schemaVersion = 3;
  assert.equal(repo.planUpdate(cache, futur, bundle).action, 'ignorer');
  assert.equal(repo.planUpdate(cache, { generation: 'x' }, bundle).action, 'ignorer');
  assert.equal(repo.planUpdate(cache, { ...baseManifest(2), entries: [{ kind: 'module' }] }, bundle).action, 'ignorer');
  // Serveur encore sur le pack historique : rien à changer.
  assert.equal(repo.planUpdate(cache, { generation: 0, entries: [] }, bundle).action, 'ignorer');
});

test('deux générations arrivées dans le désordre : la plus ancienne est ignorée', () => {
  const g5 = repo.applyPlan(repo.emptyCache(), repo.planUpdate(repo.emptyCache(), baseManifest(5), bundle), { programmes: programmesFetched });
  const plan = repo.planUpdate(g5, baseManifest(4), bundle);
  assert.equal(plan.action, 'ignorer');
  assert.equal(repo.applyPlan(g5, plan).generation, 5);
});

test('cache tronqué ou corrompu : les entrées illisibles sont écartées sans erreur', () => {
  assert.deepEqual(repo.sanitizeCache(null), repo.emptyCache());
  assert.deepEqual(repo.sanitizeCache({ format: 99 }), repo.emptyCache());
  const good = publicCopy(pack.modules[MOD_A]);
  const raw = {
    format: 1, generation: 4, majLe: 1,
    modules: {
      [MOD_A]: { revision: 2, hash: 'h', source: 'remote', versions: { fr: good } },
      [MOD_B]: { revision: 2, hash: 'h', source: 'remote', versions: { fr: { code: MOD_B, titre: 'tronqué' } } },
      X: { revision: 'deux' },
    },
    programmes: { [PROG.code]: { revision: 1, hash: 'p', data: PROG }, Y: { revision: 1, hash: 'p', data: { code: 'Y' } } },
    retraits: { programmes: ['Z', 3], modules: 'oops' },
  };
  const clean = repo.sanitizeCache(raw);
  assert.deepEqual(Object.keys(clean.modules), [MOD_A]);
  assert.deepEqual(Object.keys(clean.programmes), [PROG.code]);
  assert.deepEqual(clean.retraits, { programmes: ['Z'], modules: [] });
  // Un module écarté est simplement retéléchargé à la prochaine synchronisation.
  const manifest = baseManifest(5);
  Object.assign(manifest.entries.find((e) => e.code === MOD_B), { revision: 2, hash: 'h' });
  assert.ok(repo.planUpdate(clean, manifest, bundle).fetchModules.some((e) => e.code === MOD_B));
});

test('panne réseau pendant le téléchargement : l’ancienne révision reste lisible', () => {
  const v2 = baseManifest(2);
  Object.assign(v2.entries.find((e) => e.code === MOD_A), { revision: 2, hash: 'v2' });
  const cache2 = repo.applyPlan(repo.emptyCache(), repo.planUpdate(repo.emptyCache(), v2, bundle), { programmes: programmesFetched, modules: { [MOD_A]: { fr: publicCopy(pack.modules[MOD_A], { titre: 'v2' }) } } });
  const v3 = baseManifest(3);
  Object.assign(v3.entries.find((e) => e.code === MOD_A), { revision: 3, hash: 'v3' });
  const cache3 = repo.applyPlan(cache2, repo.planUpdate(cache2, v3, bundle), { programmes: {} });
  assert.equal(repo.resolveModule(cache3, bundle, MOD_A).module.titre, 'v2');
  assert.equal(repo.resolveModule(cache3, bundle, MOD_A).revision, 2);
  // Le prochain plan redemande la révision 3.
  assert.deepEqual(repo.planUpdate(cache3, v3, bundle).fetchModules.map((e) => e.revision), [3]);
});

test('session en cours : pas de mélange de révisions, la mise à jour attend la fin de la session', () => {
  const v2 = baseManifest(2);
  Object.assign(v2.entries.find((e) => e.code === MOD_A), { revision: 2, hash: 'v2' });
  const cache2 = repo.applyPlan(repo.emptyCache(), repo.planUpdate(repo.emptyCache(), v2, bundle), { programmes: programmesFetched, modules: { [MOD_A]: { fr: publicCopy(pack.modules[MOD_A], { titre: 'v2' }) } } });
  const v3 = baseManifest(3);
  Object.assign(v3.entries.find((e) => e.code === MOD_A), { revision: 3, hash: 'v3' });
  const during = repo.applyPlan(cache2, repo.planUpdate(cache2, v3, bundle), { programmes: {}, modules: { [MOD_A]: { fr: publicCopy(pack.modules[MOD_A], { titre: 'v3' }) } } }, [MOD_A]);
  assert.equal(repo.resolveModule(during, bundle, MOD_A).module.titre, 'v2', 'la session garde sa révision');
  assert.equal(repo.releaseDeferred(during, [MOD_A]), during, 'toujours en cours');
  const after = repo.releaseDeferred(during, []);
  assert.equal(repo.resolveModule(after, bundle, MOD_A).module.titre, 'v3');
  // Un module retiré mais utilisé par une session reste lisible jusqu'à la fin.
  const retire = baseManifest(4);
  retire.entries = retire.entries.filter((e) => e.code !== MOD_A);
  const kept = repo.applyPlan(after, repo.planUpdate(after, retire, bundle), { programmes: {} }, [MOD_A]);
  assert.ok(repo.resolveModule(kept, bundle, MOD_A));
});

test('catalogue : pagination fusionnée, cycles publiés ajoutés, cycles retirés masqués', () => {
  const local = [
    { sigle: 'A', nom: 'A', cycles: [{ programme: 'A1' }, { programme: 'A2' }] },
    { sigle: 'B', nom: 'B', cycles: [{ programme: 'B1' }] },
  ];
  const remote = [
    { sigle: 'A', nom: 'Organisme A', cycles: [{ programme: 'A1', parcoursTypeId: 'pt1' }, { programme: 'A3' }] },
    { sigle: 'C', nom: 'Nouveau', cycles: [{ programme: 'C1' }] },
  ];
  const merged = repo.mergeCatalogue(local, remote);
  assert.deepEqual(merged.map((o) => o.sigle), ['A', 'C']);
  assert.deepEqual(merged[0].cycles.map((c) => c.programme), ['A1', 'A3']);
  assert.equal(merged[0].cycles[0].parcoursTypeId, 'pt1');
  assert.equal(merged[0].nom, 'Organisme A');
  assert.equal(repo.mergeCatalogue(local, null), local, 'hors ligne : catalogue local');
});

test('mobile : la correction d’un exercice téléchargé n’est jamais calculée sur l’appareil', () => {
  const store = read('src/prep/store.js');
  assert.match(store, /if \(needsServerGrading\(found\)\) \{[\s\S]*?return \{ pending: true, cle \};/);
  const session = read('src/prep/screens/SessionScreen.js');
  assert.match(session, /if \(!server\) return \{ pending: true, correct: false, score: 0, points: 0 \};/);
  assert.match(session, /correction=\{mode === 'blanc' \|\| !item\.final \|\| item\.result\?\.pending \? null : item\.result\}/);
});
