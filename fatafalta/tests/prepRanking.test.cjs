// Sans nouvelle dépendance : Babel est déjà fourni par Expo. Aucun fichier d'environnement lu.
// Exécution : node tests/prepRanking.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
function load(relative, mocks, globals = {}) {
  const filename = path.join(root, relative);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports, AbortController, setTimeout, clearTimeout, __DEV__: false,
    require: (name) => { if (!(name in mocks)) throw new Error(`Mock manquant : ${name}`); return mocks[name]; },
    ...globals,
  });
  return exports;
}
const row = (id, rang) => ({ identite: id, rang, score: 100 - rang });
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
function pendingApi() {
  const calls = [];
  return {
    calls,
    ranking: (...args) => new Promise((resolve, reject) => { calls.push({ args, resolve, reject }); }),
  };
}
function hookHarness(api, mode = 'ranking', globals = {}) {
  let index = 0;
  const cells = [];
  let focus;
  let effects = [];
  const react = {
    useState: (initial) => {
      const i = index++;
      if (!(i in cells)) cells[i] = initial;
      return [cells[i], (v) => { cells[i] = typeof v === 'function' ? v(cells[i]) : v; }];
    },
    useRef: (initial) => { const i = index++; return cells[i] ||= { current: initial }; },
    // Comme React : même fonction tant que les dépendances ne changent pas.
    useCallback: (callback, deps) => {
      const i = index++;
      if (!cells[i] || deps.some((dep, k) => dep !== cells[i].deps[k])) cells[i] = { deps, callback };
      return cells[i].callback;
    },
    useEffect: (effect, deps) => {
      const i = index++;
      if (!cells[i] || deps.some((dep, k) => dep !== cells[i].deps[k])) {
        effects.push(() => { cells[i]?.cleanup?.(); cells[i] = { deps, cleanup: effect() }; });
      }
    },
  };
  const module = load('src/prep/components/useRanking.js', {
    react,
    '../api': { __esModule: true, default: api, isServiceMissing: (e) => e?.response?.status === 404 },
  }, globals);
  const render = (query = '') => {
    index = 0;
    const result = mode === 'search' ? module.useCandidateSearch('ENSEA-AS', 'mois', query) : module.useRanking('ENSEA-AS', 'mois');
    const pending = effects; effects = []; pending.forEach((fn) => fn());
    return result;
  };
  render();
  // Le chargement part au montage (useEffect) ; focus() renvoie le nettoyage de cet effet (sortie d'écran).
  focus = () => () => cells.find((cell) => cell && typeof cell.cleanup === 'function')?.cleanup();
  return { ...module, render, focus: () => focus() };
}

test('rangs réels, ex æquo, doublons et conservation des deux frontières', () => {
  const h = hookHarness(pendingApi());
  const current = { candidats: [row('b', 184532), row('c', 184532)], precedent: 'above', suivant: 'below' };
  const after = h.mergeRankingPage(current, { candidats: [row('c', 184532), row('d', 184534)], precedent: 'ignored', suivant: 'next' }, 'after');
  assert.equal(after.candidats.map((c) => c.identite).join(), 'b,c,d');
  assert.equal(after.candidats.map(h.candidateRank).join(), '184532,184532,184534');
  assert.equal(after.precedent, 'above'); assert.equal(after.suivant, 'next');
  const before = h.mergeRankingPage(after, { candidats: [row('a', 184531), row('b', 184532)], precedent: null, suivant: 'ignored' }, 'before');
  assert.equal(before.candidats.map((c) => c.identite).join(), 'a,b,c,d');
  assert.equal(before.precedent, null); assert.equal(before.suivant, 'next');
  assert.equal(h.candidateRank({ rang: 3, rangApprox: 5 }), 3);
  assert.equal(h.candidateRank({ rangApprox: 5 }), 5);
});

test('moi hors page / masqué conservé ; pagination concurrente verrouillée', async () => {
  const api = pendingApi(); const h = hookHarness(api); h.focus();
  const mine = { identite: 'me', visible: false, rang: 184532, stats: { questions: 100 } };
  api.calls[0].resolve({ candidats: [row('a', 1)], moi: mine, rang: 184532, total: 400000, suivant: 'opaque', precedent: null }); await tick();
  assert.equal(h.render().data.moi, mine);
  const a = h.render().loadPage('after'); const b = h.render().loadPage('after');
  assert.equal(api.calls.length, 2);
  assert.equal(api.calls[1].args[2].apres, 'opaque');
  assert.equal(api.calls[1].args[2].autour, undefined);
  api.calls[1].resolve({ candidats: [row('b', 2)], moi: mine, suivant: null, precedent: 'ignored' });
  await Promise.all([a, b]);
  assert.equal(h.render().data.candidats.length, 2);
  await h.render().loadPage('after'); assert.equal(api.calls.length, 2);
});

test('un rafraîchissement invalide la page en vol même si son transport ignore abort', async () => {
  const api = pendingApi(); const h = hookHarness(api); const cleanup = h.focus();
  api.calls[0].resolve({ candidats: [row('old', 1)], suivant: 'next' }); await tick();
  const paging = h.render().loadPage('after');
  const refreshing = h.render().load({ refresh: true });
  assert.equal(api.calls[1].args[2].signal.aborted, true);
  api.calls[2].resolve({ candidats: [row('fresh', 1)], suivant: null }); await refreshing;
  api.calls[1].resolve({ candidats: [row('stale', 2)], suivant: 'stale' }); await paging;
  assert.equal(h.render().data.candidats.map((c) => c.identite).join(), 'fresh');
  const late = h.render().load(); cleanup();
  api.calls[3].reject(new Error('late')); await late;
  assert.equal(h.render().error, null);
});

test('autour de moi, avant et nouvelle période ne mélangent pas les curseurs', async () => {
  const api = pendingApi(); const h = hookHarness(api);
  api.calls.shift(); // chargement du montage, remplacé (et invalidé) par « Me situer » ci-dessous
  const locating = h.render().load({ locate: true });
  assert.equal(api.calls[0].args[2].autour, 'moi');
  api.calls[0].resolve({ candidats: [row('me', 900)], precedent: 'previous', suivant: 'next', moi: { identite: 'me' } }); await locating;
  assert.equal(h.render().located, 1);
  const previous = h.render().loadPage('before');
  assert.equal(api.calls[1].args[2].avant, 'previous'); assert.equal(api.calls[1].args[2].autour, undefined);
  api.calls[1].resolve({ candidats: [row('above', 899)], precedent: 'higher', suivant: 'ignored' }); await previous;
  assert.equal(h.render().data.suivant, 'next');
  const freshScope = hookHarness(api); freshScope.focus();
  assert.equal(api.calls[2].args[2].avant, undefined); assert.equal(api.calls[2].args[2].apres, undefined);
  api.calls[2].resolve({ candidats: [], moi: null, total: 0 }); await tick();
});

test('ancien serveur sans suivant ; 404 et réseau récupérables', async () => {
  const api = pendingApi(); const h = hookHarness(api); h.focus();
  api.calls[0].resolve({ candidats: [row('legacy', 1)], moi: null }); await tick();
  await h.render().loadPage('after'); assert.equal(api.calls.length, 1);
  const missing = h.render().load(); api.calls[1].reject({ response: { status: 404 } }); await missing;
  assert.equal(h.render().error, 'missing');
  const offline = h.render().load(); api.calls[2].reject(new Error('offline')); await offline;
  assert.equal(h.render().error, 'network');
  const retry = h.render().load(); api.calls[3].resolve({ candidats: [], moi: null }); await retry;
  assert.equal(h.render().error, null);
});

test('client API : période, curseurs opaques, signal et timeouts conservés', async () => {
  const calls = [];
  const api = load('src/prep/api.js', { '../services/api': { get: (...args) => { calls.push(args); return Promise.resolve({ data: { data: { ok: true } } }); } } });
  api.setPrepToken('test-token'); const controller = new AbortController();
  await api.prepApi.ranking('ENSEA-AS', 'mois', { avant: 'opaque', signal: controller.signal });
  await api.prepApi.searchCandidates('ENSEA-AS', '1172', 'semaine', controller.signal);
  await api.prepApi.candidate('ENSEA-AS', 'child', 'semaine', controller.signal);
  for (const [, config] of calls) {
    assert.equal(config.timeout, 12000); assert.equal(config.signal, controller.signal);
    assert.equal(config.headers['X-Prep-Token'], 'test-token'); assert.equal(config.quietStatuses[0], 404);
  }
  assert.equal(calls[0][1].params.avant, 'opaque'); assert.equal(calls[0][1].params.periode, 'mois');
  assert.equal(calls[1][1].params.q, '1172'); assert.equal(calls[2][1].params.periode, 'semaine');
});

test('suivis locaux persistés par programme, idempotents, sans statistiques en cache', () => {
  let state; const snapshots = [];
  const store = load('src/prep/store.js', {
    react: { useMemo: (f) => f() },
    zustand: { create: (factory) => { state = factory((patch) => { state = { ...state, ...patch }; }, () => state); return { getState: () => state }; } },
    'zustand/react/shallow': { useShallow: (f) => f },
    './shared/prepCore': {}, './storage': { saveState: (s) => snapshots.push(s) },
    './device': {}, './api': {}, './content': {},
  }).default;
  store.getState().followCandidate('ENSEA-AS', { identite: 'child', pseudonyme: 'Cauri-1172', rang: 20, stats: { questions: 10 } });
  store.getState().followCandidate('ENSEA-AS', { identite: 'child', pseudonyme: 'Cauri-1172' });
  assert.equal(store.getState().candidatsSuivis['ENSEA-AS'].length, 1);
  assert.equal(snapshots.length, 1); assert.equal(snapshots[0].candidatsSuivis['ENSEA-AS'][0].rang, undefined);
  store.getState().followCandidate('OTHER', { identite: 'child', pseudonyme: 'Cauri-1172' });
  store.getState().unfollowCandidate('ENSEA-AS', 'child');
  assert.equal(store.getState().candidatsSuivis['ENSEA-AS'].length, 0);
  assert.equal(store.getState().candidatsSuivis.OTHER.length, 1);
  assert.equal(snapshots.at(-1).candidatsSuivis['ENSEA-AS'].length, 0);
});


test('recherche : seuil de 2 caractères, debounce 300 ms, réponses obsolètes et effacement', async () => {
  const calls = []; const timers = new Map(); let timerId = 0;
  const h = hookHarness({ searchCandidates: (...args) => new Promise((resolve, reject) => calls.push({ args, resolve, reject })) }, 'search', {
    setTimeout: (fn, delay) => { assert.equal(delay, 300); timers.set(++timerId, fn); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  const fire = () => { const ready = [...timers.values()]; timers.clear(); ready.forEach((fn) => fn()); };
  assert.equal(h.render('1').valid, false); fire(); assert.equal(calls.length, 0);
  h.render('11'); h.render('117'); h.render('1172');
  assert.equal(timers.size, 1); fire(); assert.equal(calls.length, 1);
  assert.equal(calls[0].args[1], '1172'); assert.equal(calls[0].args[2], 'mois');
  h.render('cauri'); fire(); assert.equal(calls[0].args[3].aborted, true);
  calls[1].resolve({ candidats: [row('new', 2)] }); await tick();
  calls[0].resolve({ candidats: [row('old', 1)] }); await tick();
  assert.equal(h.render('cauri').current.candidates[0].identite, 'new');
  assert.equal(h.render('another').current, null); fire();
  h.render(''); calls[2].resolve({ candidats: [row('late', 3)] }); await tick();
  assert.equal(h.render('').current, null); assert.equal(h.render('').valid, false);
});

test('recherche : 404 bientôt disponible, erreur réseau, vide et réessai', async () => {
  const calls = []; let timer;
  const h = hookHarness({ searchCandidates: (...args) => new Promise((resolve, reject) => calls.push({ args, resolve, reject })) }, 'search', {
    setTimeout: (fn) => { timer = fn; return 1; }, clearTimeout: () => { timer = null; },
  });
  h.render('404'); timer(); calls[0].reject({ response: { status: 404 } }); await tick();
  assert.equal(h.render('404').current.error, 'missing');
  h.render('404').retry(); h.render('404'); timer(); calls[1].reject(new Error('offline')); await tick();
  assert.equal(h.render('404').current.error, 'network');
  h.render('404').retry(); h.render('404'); timer(); calls[2].resolve({ candidats: [] }); await tick();
  assert.equal(h.render('404').current.candidates.length, 0);
});


test('syntaxe JSX des fichiers modifiés et composants référencés définis', () => {
  for (const file of ['src/prep/api.js', 'src/prep/store.js', 'src/prep/screens/ProgressScreens.js', 'src/prep/components/RankingScreens.js', 'src/prep/components/useRanking.js', 'src/prep/ui/primitives.js']) {
    const ast = babel.parseSync(fs.readFileSync(path.join(root, file), 'utf8'), {
      filename: file, configFile: false, babelrc: false, parserOpts: { sourceType: 'module', plugins: ['jsx'] },
    });
    babel.traverse(ast, { JSXIdentifier(p) {
      if (p.parent.type === 'JSXAttribute' || (p.parent.type === 'JSXMemberExpression' && p.key === 'property')) return;
      if (/^[A-Z]/.test(p.node.name)) assert.ok(p.scope.hasBinding(p.node.name), `${file}: composant non défini ${p.node.name}`);
    } });
  }
});
