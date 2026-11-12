const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { createHarness, contrast } = require('./helpers/themeHarness.cjs');

const harness = createHarness();
const { lightPalette, darkPalette } = harness.load('src/theme/tokens.js');
const { createPrepPalette } = harness.load('src/prep/theme.js');
const { ThemeProvider, useTheme, useThemePreference, createThemedStyles, lightTheme, nightTheme } = harness.load('src/theme/ThemeProvider.js');

test('apparence : clair par défaut même sur système sombre ; choix explicite, palettes stables', async () => {
  assert.deepEqual(harness.appearanceCalls, ['light']);
  harness.setScheme('dark');
  let calls = 0;
  const useStyles = createThemedStyles(({ brand }) => { calls += 1; return { color: brand.ink }; });
  const seen = [];
  let choice;
  function Probe() { seen.push({ theme: useTheme(), styles: useStyles() }); choice = useThemePreference(); return null; }
  for (const mode of [undefined, 'dark', 'dark', 'light', 'invalid']) {
    harness.setAppearance(mode);
    renderToStaticMarkup(React.createElement(ThemeProvider, null, React.createElement(Probe)));
  }
  assert.equal(calls, 2);
  assert.equal(seen[0].theme, lightTheme);
  assert.equal(seen[1].theme, nightTheme);
  assert.equal(seen[1].styles, seen[2].styles);
  assert.equal(seen[0].styles, seen[3].styles);
  assert.equal(seen[4].theme, lightTheme);
  assert.equal(lightPalette.brand.paper, '#FCFAF5');
  assert.equal(lightPalette.brand.ink, '#0D1B32');
  choice.setMode('dark');
  await Promise.resolve();
  assert.equal(harness.preferenceUpdates.at(-1).appearance, 'dark');
  renderToStaticMarkup(React.createElement(ThemeProvider, null, React.createElement(Probe)));
  assert.equal(seen.at(-1).theme, nightTheme);
  choice.setMode('system');
  assert.equal(harness.preferenceUpdates.length, 1);
});

test('des bascules rapides persistent dans l’ordre, même après une erreur de stockage', async () => {
  const local = createHarness();
  const { ThemeProvider: Provider, useThemePreference: usePreference } = local.load('src/theme/ThemeProvider.js');
  let preference;
  let finishFirst;
  const firstWrite = new Promise((resolve, reject) => { finishFirst = reject; });
  local.setWritePreference(() => local.preferenceUpdates.length === 1 ? firstWrite : Promise.resolve());
  function Probe() { preference = usePreference(); return null; }
  renderToStaticMarkup(React.createElement(Provider, null, React.createElement(Probe)));
  preference.setMode('dark');
  preference.setMode('light');
  await Promise.resolve();
  assert.equal(local.preferenceUpdates.length, 1);
  finishFirst(new Error('Stockage momentanément indisponible'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(local.preferenceUpdates.map((p) => p.appearance), ['dark', 'light']);
});

test('la préférence d’apparence survit à une relecture locale et préserve les autres préférences', async () => {
  const { getPreferences, savePreferences } = createHarness().load('src/services/preferences.js');
  const original = { ...(await getPreferences()), hasCompletedOrientation: true, establishment: 'test' };
  for (const appearance of ['dark', 'light']) {
    await savePreferences({ ...original, appearance });
    const restored = await getPreferences();
    assert.equal(restored.appearance, appearance);
    assert.equal(restored.hasCompletedOrientation, true);
    assert.equal(restored.establishment, 'test');
  }
});

test('Nuit : texte, liens, désactivés et chaque stop des boutons ≥ 4,5:1', () => {
  const { brand: b, colors: c } = darkPalette;
  const pairs = [];
  for (const surface of [b.paper, b.sheet, b.paperDim]) {
    for (const ink of [b.ink, b.inkSoft, b.inkMuted, b.burgundy, b.goldInk]) pairs.push([ink, surface]);
  }
  for (const surface of [b.action, b.actionBright, b.actionDeep]) pairs.push([b.onAction, surface]);
  pairs.push([b.burgundy, b.burgundyWash], [b.goldInk, b.goldWash], [b.onGold, b.gold], [b.onGold, b.goldLight], [b.onInk, b.burgundySolid], [b.onInk, b.night]);
  for (const semantic of ['success', 'error', 'warning']) {
    pairs.push([c[semantic], c[`${semantic}Wash`]], [b.onInk, c[`${semantic}Solid`]]);
    for (const surface of [b.paper, b.sheet]) pairs.push([c[semantic], surface]);
  }
  for (const { tint, wash, solid } of createPrepPalette(darkPalette).SUBJECT_TINTS) pairs.push([tint, wash], [b.onInk, solid]);
  for (const surface of b.avatarTints) pairs.push([b.onInk, surface]);
  for (const [foreground, background] of pairs) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} / ${background}: ${contrast(foreground, background).toFixed(2)}`);
  }
});

test('or et encre des moments conservés ; papier, cartes et filets conformes', () => {
  for (const key of ['gold', 'goldLight', 'night', 'inkDeep', 'inkGlow']) assert.equal(darkPalette.brand[key], lightPalette.brand[key]);
  assert.equal(darkPalette.brand.paper, '#0F1A2C');
  assert.equal(darkPalette.brand.sheet, '#16233A');
  assert.equal(darkPalette.brand.line, 'rgba(255,255,255,0.10)');
  const app = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app.json'), 'utf8'));
  assert.equal(app.expo.userInterfaceStyle, 'automatic');
});

test('StatusBar : texte clair sur Nuit, comportement historique conservé en clair', () => {
  const StatusBar = harness.load('src/theme/ThemeStatusBar.js').default;
  for (const [scheme, expected] of [['dark', 'light-content'], ['light', 'dark-content']]) {
    harness.setAppearance(scheme);
    const html = renderToStaticMarkup(React.createElement(ThemeProvider, null, React.createElement(StatusBar, { barStyle: 'dark-content' })));
    assert.ok(html.includes(expected));
  }
});

test('couverture : aucun écran ne capture une palette claire, aucune référence de thème hors portée', () => {
  const root = path.resolve(__dirname, '../src');
  const names = new Set(['theme', 'brand', 'colors', 'subjectTint', 'LEVELS', 'GRADIENTS', 'paperLines', 'STATE_COLORS']);
  for (const relative of fs.readdirSync(root, { recursive: true }).filter((f) => f.endsWith('.js') && /^(screens|components|navigation|prep\/(screens|components|exercises|ui|video))\//.test(f))) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, {
      ReferencedIdentifier(p) {
        if (names.has(p.node.name)) assert.ok(p.scope.hasBinding(p.node.name), `${relative}: ${p.node.name}`);
      },
      ImportDeclaration(p) {
        if (/brand\/(BrandMark|BrandIntro)\.js$/.test(relative) || relative === 'prep/exercises/kit.js') return;
        if (!/(theme\/tokens|(?:^|\/)theme)$/.test(p.node.source.value)) return;
        for (const specifier of p.node.specifiers) {
          assert.ok(!names.has(specifier.local.name), `${relative}: palette statique ${specifier.local.name}`);
        }
      },
    });
  }
});
