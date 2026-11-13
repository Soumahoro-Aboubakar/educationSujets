// Lot 5 — file d'actions de la préparation : acquittements individuels, erreurs temporaires,
// file longue sans perte, compactage des reprises, lecture des progressions d'un autre appareil.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const core = (() => {
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', fs.readFileSync(path.join(root, 'src/prep/shared/prepCore.js'), 'utf8'))(module, module.exports);
  return module.exports;
})();

/** Charge le store avec un faux serveur ; les minuteries sont capturées pour être déclenchées à la main. */
function makeStore(server) {
  const filename = path.join(root, 'src/prep/store.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  let state;
  const timers = [];
  const snapshots = [];
  const exports = {};
  const mocks = {
    react: { useMemo: (f) => f() },
    zustand: { create: (factory) => { state = factory((patch) => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; }, () => state); return { getState: () => state }; } },
    'zustand/react/shallow': { useShallow: (f) => f },
    './shared/prepCore': core,
    './storage': { saveState: (s) => snapshots.push(s), loadState: async () => null, loadToken: async () => null, saveToken: async () => true },
    './device': { deviceIdentifiers: async () => ({ appareilId: 'tel-1' }) },
    './api': { __esModule: true, default: server, setPrepToken: () => {} },
    './content': { getExercise: () => null, getLesson: () => null, getModule: () => null, getProgramme: () => null, moduleVersions: () => ['fr'], publishedModuleDefs: () => [] },
    './contentRepo': { needsServerGrading: () => false },
    './contentSync': { hydrateContent: async () => {}, releaseContent: async () => {}, syncContent: async () => ({}) },
  };
  vm.runInNewContext(code, {
    exports, Date, Math, JSON, Promise, Set, Map, Object, Array, Number, String, __DEV__: false, process: { env: {} },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    require: (name) => { if (!(name in mocks)) throw new Error(`Mock manquant : ${name}`); return mocks[name]; },
  });
  const store = exports.default;
  store.getState().token = 'jeton';
  return { store, timers, snapshots, get: () => store.getState() };
}

const plain = (x) => JSON.parse(JSON.stringify(x)); // tableaux créés dans le contexte vm
const ack = (statut, extra = {}) => (a) => ({ cle: a.cle, ok: statut !== 'rejected' && statut !== 'retry', statut, ...extra });

test('acquittement partiel : seules les actions traitées quittent la file, les erreurs temporaires restent', async () => {
  const sent = [];
  const { store, get, timers } = makeStore({
    sync: async (actions) => {
      sent.push(actions.map((a) => a.cle));
      return {
        resultats: actions.map((a, i) => (i === 1 ? ack('retry')(a) : i === 2 ? { ...ack('rejected')(a), erreur: 'LECON', message: 'Leçon inconnue' } : ack('applied')(a))),
        droits: { essai: { jours: [] } }, progressions: {},
      };
    },
  });
  ['a', 'b', 'c', 'd'].forEach((cle) => store.getState().enqueue({ cle, type: 'minutes', programme: 'P', minutes: 1 }));
  await get().flush();
  assert.deepEqual(plain(get().queue.map((a) => a.cle)), ['b'], 'temporaire gardée, refus et acquittées retirés');
  assert.equal(get().rejets.length, 1);
  assert.equal(get().rejets[0].erreur, 'LECON');
  // Nouvel essai programmé avec un délai croissant (pas de boucle serrée).
  const retry = timers.filter((t) => t.ms >= 1000).at(-1);
  assert.ok(retry, 'nouvel essai programmé');
});

test('réponse sans statut (ancien serveur) : comportement historique conservé', async () => {
  const { store, get } = makeStore({ sync: async (actions) => ({ resultats: actions.map((a) => ({ cle: a.cle, ok: true })), droits: {}, progressions: { P: { etat: { marque: 'serveur' } } } }) });
  store.getState().enqueue({ cle: 'x', type: 'minutes', programme: 'P', minutes: 1 });
  await get().flush();
  assert.equal(get().queue.length, 0);
  assert.equal(get().progressions.P.marque, 'serveur', 'file vide : état serveur de référence');
});

test('panne réseau : rien n’est retiré ; file longue envoyée par paquets jusqu’au vidage, sans troncature', async () => {
  let online = false;
  const batches = [];
  const { store, get, timers } = makeStore({
    sync: async (actions) => {
      if (!online) throw new Error('Network Error');
      batches.push(actions.length);
      return { resultats: actions.map(ack('applied')), droits: {}, progressions: {} };
    },
  });
  for (let i = 0; i < 2600; i += 1) store.getState().enqueue({ cle: `k${i}`, type: 'minutes', programme: 'P', minutes: 0.1 });
  assert.equal(get().queue.length, 2600, 'aucune troncature à 2 000');
  await get().flush();
  assert.equal(get().queue.length, 2600);
  assert.equal(get().online, false);
  online = true;
  for (let i = 0; i < 20 && get().queue.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await get().flush();
    timers.length = 0;
  }
  assert.equal(get().queue.length, 0);
  assert.equal(batches.reduce((a, b) => a + b, 0), 2600);
  assert.ok(batches.every((n) => n <= 200));
});

test('reprise : une seule reprise non envoyée par programme, réponses jamais compactées', async () => {
  const { store, get } = makeStore({ sync: async () => { throw new Error('hors ligne'); } });
  await get().ensureIdentity();
  get().shareResume('P', { type: 'lecon', lecon: 'L1', position: 0.2 });
  get().enqueue({ cle: 't1', type: 'tentative', programme: 'P', exercice: 'E1' });
  get().shareResume('P', { type: 'lecon', lecon: 'L1', position: 0.6 });
  get().shareResume('Q', { type: 'lecon', lecon: 'M1', position: 0.1 });
  get().enqueue({ cle: 't2', type: 'tentative', programme: 'P', exercice: 'E1' });
  const reprises = get().queue.filter((a) => a.type === 'reprise');
  assert.equal(reprises.length, 2);
  assert.equal(reprises.find((a) => a.programme === 'P').cible.position, 0.6);
  assert.deepEqual(plain(get().queue.filter((a) => a.type === 'tentative').map((a) => a.cle)), ['t1', 't2']);
  // Séquence croissante de l'appareil et version serveur connue (`vu`).
  assert.ok(reprises[1].seq > reprises[0].seq);
  assert.equal(reprises[0].appareil, 'tel-1');
  assert.equal(reprises[0].vu, 0);
});

test('second appareil : le parcours serveur est récupéré sans action locale, jamais pendant une file en attente', async () => {
  const etatServeur = { ...core.emptyProgress(), derniereReprise: { type: 'lecon', lecon: 'L3', position: 0.4, appareil: 'web', version: 3 } };
  const { store, get } = makeStore({ progressions: async () => ({ progressions: { P: { etat: etatServeur, revision: 7 } }, complet: true }) });
  await get().pullProgress();
  assert.equal(get().progressions.P.derniereReprise.lecon, 'L3');
  // Une action locale non envoyée : la copie locale n'est pas écrasée par la lecture.
  const { store: other, get: get2 } = makeStore({ progressions: async () => ({ progressions: { P: { etat: etatServeur } }, complet: true }), sync: async () => { throw new Error('hors ligne'); } });
  other.getState().progressions = { P: { ...core.emptyProgress(), local: true } };
  other.getState().enqueue({ cle: 'loc', type: 'minutes', programme: 'P', minutes: 2 });
  await get2().pullProgress();
  assert.equal(get2().progressions.P.local, true);
  assert.ok(store);
});

test('le jeton d’identité n’est plus écrit dans le fichier JSON de l’état', () => {
  const source = fs.readFileSync(path.join(root, 'src/prep/store.js'), 'utf8');
  const persisted = source.match(/const PERSISTED = \[([^\]]*)\]/)[1];
  assert.doesNotMatch(persisted, /'token'/);
  assert.match(fs.readFileSync(path.join(root, 'src/prep/storage.js'), 'utf8'), /SecureStore\.setItemAsync\(TOKEN_KEY, token\)/);
});
