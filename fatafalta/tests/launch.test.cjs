const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./helpers/themeHarness.cjs');

// Logique pure de l'expérience de lancement : chronologie, état, géométrie générée.
const harness = createHarness();
const timeline = harness.load('src/launch/launchTimeline.js');
const state = harness.load('src/launch/launchState.js');
const geometry = harness.load('src/launch/launchGeometry.js').default;
const { logo } = harness.load('src/theme/brand.js');

const allDone = { preferences: true, fonts: true, downloads: true, prep: true, navigation: true };

test('chronologie : la séquence complète reste courte et ordonnée', () => {
  const { FULL, CALM, EXIT } = timeline;
  assert.ok(FULL.gate <= 1800, 'l’ouverture ne retient jamais l’utilisateur plus de 1,8 s');
  assert.ok(CALM.gate <= 800, 'variante calme : moins de 0,8 s');
  assert.ok(FULL.trace[0] >= 180, 'le tracé commence après le fondu du splash natif (180 ms)');
  assert.ok(FULL.trace[1] <= FULL.ignite[1], 'la feuille s’allume quand les traits se rejoignent');
  assert.ok(FULL.traceFade[1] <= FULL.fold[0] + (FULL.fold[1] - FULL.fold[0]) / 2, 'le tracé est éteint avant que le revers n’apparaisse');
  assert.ok(FULL.fold[0] >= FULL.ignite[0], 'le coin ne se corne qu’une fois la feuille allumée');
  const lastLetter = FULL.word + FULL.letterDelays.at(-1) + FULL.letter;
  assert.ok(lastLetter <= FULL.gate && FULL.tagline[1] <= FULL.gate, 'nom et signature sont posés avant la sortie');
  assert.equal(FULL.letterDelays.length, geometry.wordmark.glyphs.length);
  const gaps = FULL.letterDelays.slice(1).map((delay, index) => delay - FULL.letterDelays[index]);
  assert.ok(gaps.every((gap, index) => index === 0 || gap < gaps[index - 1]), 'écarts décroissants : une vague, pas un métronome');
  assert.equal(CALM.motion, false);
  for (const [from, to] of Object.values(EXIT)) assert.ok(from >= 0 && to <= 1 && from < to);
  assert.equal(EXIT.veil[1], 1, 'l’encre est la dernière à s’effacer');
  assert.ok(Math.max(EXIT.text[1], EXIT.atmosphere[1], EXIT.halo[1], EXIT.mark[1]) < 1, 'rien ne flotte au-dessus de l’accueil');
  // Périodes d'ambiance : toutes divisent la boucle, qui ne se voit donc pas.
  for (const period of [6, 8, 10, 12, 15, 20, 24, 2.4]) assert.ok(Math.abs((timeline.ENGINE.lifeSpan / period) % 1) < 1e-9, `période ${period}`);
});

test('courbes : bornées, monotones là où il le faut', () => {
  const { span, easeOut, easeOutSoft, easeInOut, easeInOutSoft, spring, bump, sample, mix } = timeline;
  assert.equal(span(5, 10, 20), 0);
  assert.equal(span(25, 10, 20), 1);
  assert.equal(span(15, 10, 20), 0.5);
  assert.equal(span(0, 0, 0), 1, 'piste vide : état final immédiat (variante calme)');
  for (const ease of [easeOut, easeOutSoft, easeInOut, easeInOutSoft]) {
    assert.equal(ease(0), 0);
    assert.equal(ease(1), 1);
    let previous = 0;
    for (let p = 0; p <= 1.0001; p += 0.05) { const value = ease(Math.min(1, p)); assert.ok(value >= previous - 1e-9); previous = value; }
  }
  assert.equal(spring(0), 0);
  assert.equal(spring(1), 1);
  let peak = 0;
  for (let p = 0; p <= 1; p += 0.01) peak = Math.max(peak, spring(p));
  assert.ok(peak > 1.05 && peak < 1.3, `ressort discret (dépassement ${peak.toFixed(3)})`);
  assert.equal(bump(0, 0.25), 0);
  assert.equal(bump(1, 0.25), 0);
  assert.ok(Math.abs(bump(0.25, 0.25) - 1) < 1e-9);
  assert.equal(sample([0, 10, 20], 0.25), 5);
  assert.equal(sample([0, 10, 20], 1), 20);
  assert.equal(mix(2, 4, 0.5), 3);
});

test('poussières : peu nombreuses, déterministes, hors du symbole et du texte', () => {
  const { buildParticles, clearOfLockup, QUIET_ZONE } = timeline;
  const motes = buildParticles();
  assert.ok(motes.length <= 12, 'quelques poussières, jamais une pluie');
  assert.equal(JSON.stringify(buildParticles()), JSON.stringify(motes));
  for (const reach of [320, 360, 390, 430, 768]) {
    for (const mote of motes) {
      const [x, y] = clearOfLockup(Math.cos(mote.angle) * mote.radius * reach, Math.sin(mote.angle) * mote.radius * reach * 1.25);
      assert.ok(Math.abs(x) >= QUIET_ZONE.halfWidth || y <= QUIET_ZONE.top || y >= QUIET_ZONE.bottom, `poussière dans le texte (${reach})`);
    }
  }
});

test('géométrie : le tracé suit le contour officiel, du pied au coin corné', () => {
  const [left, right] = geometry.traces;
  for (const trace of [left, right]) {
    assert.equal(`${trace.xs[0]},${trace.ys[0]}`, geometry.foot.join(','));
    assert.equal(`${trace.xs.at(-1)},${trace.ys.at(-1)}`, geometry.meet.join(','));
    assert.equal(trace.xs.length, trace.ys.length);
    // Chaque échantillon reste dans l'emprise du F (31–75 × 18–82 du cadre).
    trace.xs.forEach((x) => assert.ok(x >= 31 && x <= 75));
    trace.ys.forEach((y) => assert.ok(y >= 18 && y <= 82));
  }
  assert.ok(Math.abs(left.length + right.length - 242.96) < 0.5, 'les deux traits couvrent tout le périmètre');
  assert.ok(logo.bodyUnfolded.startsWith('M34 18H72'), 'contour officiel inchangé : régénérer la géométrie sinon');
  assert.equal(geometry.wordmark.glyphs.length, 'Fatafalta'.length);
  assert.ok(geometry.tagline.plain.length > 100 && geometry.tagline.accent.length > 100);
});

test('état : l’application s’ouvre sans attendre le réseau', () => {
  const { resolveLaunch, launchProgress, LAUNCH_STEPS } = state;
  assert.equal(launchProgress({}), 0);
  assert.equal(launchProgress({ preferences: true, fonts: true }), 2 / LAUNCH_STEPS.length);
  assert.equal(launchProgress(allDone), 1);
  const base = { steps: allDone, painted: true, prepSettled: false, networkExpired: false, bootFailed: false, stalled: false };
  // Réseau en cours : on patiente le temps de l'ouverture, pas davantage.
  assert.equal(resolveLaunch(base).ready, false);
  assert.equal(resolveLaunch({ ...base, networkExpired: true }).ready, true);
  assert.equal(resolveLaunch({ ...base, prepSettled: true }).ready, true);
  // L'arbre se monte dès que le local est prêt, avant la navigation.
  const mounting = resolveLaunch({ ...base, steps: { ...allDone, navigation: false }, painted: false });
  assert.equal(mounting.core, true);
  assert.equal(mounting.ready, false);
  assert.equal(resolveLaunch({ ...base, painted: false, prepSettled: true }).ready, false, 'premier écran pas encore dessiné');
});

test('état : un échec ou un blocage est dit, jamais masqué par une attente sans fin', () => {
  const { resolveLaunch, LAUNCH_COPY, LAUNCH_WAIT } = state;
  const stuck = { steps: { ...allDone, prep: false, navigation: false }, painted: false, prepSettled: true, networkExpired: true, bootFailed: false, stalled: false };
  assert.equal(resolveLaunch(stuck).fault, null);
  assert.equal(resolveLaunch({ ...stuck, bootFailed: true }).fault, 'error');
  assert.equal(resolveLaunch({ ...stuck, stalled: true }).fault, 'stalled');
  assert.equal(resolveLaunch({ ...stuck, bootFailed: true }).ready, false);
  // Délai dépassé mais application prête : aucune alerte.
  assert.equal(resolveLaunch({ steps: allDone, painted: true, prepSettled: true, networkExpired: true, bootFailed: false, stalled: true }).fault, null);
  assert.ok(LAUNCH_WAIT.network < LAUNCH_WAIT.slow && LAUNCH_WAIT.slow < LAUNCH_WAIT.stall);
  for (const key of ['error', 'stalled']) assert.ok(LAUNCH_COPY[key].title && LAUNCH_COPY[key].body);
  assert.doesNotMatch(JSON.stringify(LAUNCH_COPY), /bundl|module|JS|%/i, 'aucun jargon technique ni pourcentage');
});

test('niveau : mouvement réduit, redémarrage à chaud et appareils modestes', () => {
  const { pickLaunchTier, LITE_BOOT_COST } = state;
  assert.equal(pickLaunchTier({ os: 'android', osVersion: 34, bootCost: 300 }), 'full');
  assert.equal(pickLaunchTier({ os: 'ios', osVersion: '26.3' }), 'full');
  assert.equal(pickLaunchTier({ reduceMotion: true, os: 'android', osVersion: 34 }), 'calm');
  assert.equal(pickLaunchTier({ warm: true, os: 'ios' }), 'calm');
  assert.equal(pickLaunchTier({ os: 'android', osVersion: 28 }), 'lite');
  assert.equal(pickLaunchTier({ os: 'android', osVersion: 34, bootCost: LITE_BOOT_COST }), 'lite');
  assert.equal(pickLaunchTier({ os: 'web', deviceMemory: 2 }), 'lite');
  assert.equal(pickLaunchTier({ os: 'web', deviceMemory: 8 }), 'full');
});
