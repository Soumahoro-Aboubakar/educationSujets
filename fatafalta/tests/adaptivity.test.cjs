const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');
const { createHarness } = require('./helpers/themeHarness.cjs');

// Exécute les vrais composants. Seules les frontières natives et les hooks sont simulés :
// ces tests protègent les contrats de rendu, sans prétendre mesurer les pixels natifs.
function presentationHarness() {
  const themeHarness = createHarness();
  const palette = themeHarness.load('src/theme/ThemeProvider.js').lightTheme;
  const cells = [];
  let cursor = 0;
  let dimensions = { width: 375, height: 667, fontScale: 1, scale: 2 };
  const state = (initial) => {
    const i = cursor++;
    if (!Object.hasOwn(cells, i)) cells[i] = typeof initial === 'function' ? initial() : initial;
    return [cells[i], (value) => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }];
  };
  const react = { ...React, useState: state, useRef: (value) => state({ current: value })[0], useEffect: () => {}, useMemo: (fn) => fn(), useCallback: (fn) => fn };
  const modules = {
    react,
    'react-native': { Text: 'native-text', View: 'native-view', Pressable: 'native-pressable', StyleSheet: { create: (styles) => styles }, useWindowDimensions: () => dimensions },
    'react-native-reanimated': { default: { View: 'animated-view' }, __esModule: true, useSharedValue: (value) => state({ value })[0] },
    'react-native-gesture-handler': { Gesture: {}, GestureDetector: 'gesture' },
    'react-native-worklets': { scheduleOnRN: (fn, ...args) => fn(...args) },
    'react-native-svg': { default: 'svg', __esModule: true, Circle: 'circle', Path: 'path' },
    'lucide-react-native': { ArrowDown: 'down', ArrowUp: 'up', GripVertical: 'grip' },
    '../../theme/ThemeProvider': { useTheme: () => palette, createThemedStyles: (factory) => () => factory(palette) },
    '../../components/ui/Text': 'text',
    '../../components/ui/FeedbackPressable': 'native-pressable',
    '../theme': { type: {}, motion: {} },
    '../feedback': { haptic: { select: () => {} }, useReduceMotion: () => true },
    './kit': { useShuffled: (items) => items, isCorrected: (phase) => phase === 'corrected' || phase === 'readonly' },
  };
  function load(file) {
    const module = { exports: {} };
    const code = babel.transformSync(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
      configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
    }).code;
    vm.runInNewContext(code, { require: (name) => {
      if (!Object.hasOwn(modules, name)) throw new Error(`Unexpected module: ${name}`);
      return modules[name];
    }, module, exports: module.exports });
    return module.exports;
  }
  return { load, render: (Component, props, nextDimensions) => { cursor = 0; dimensions = { ...dimensions, ...nextDimensions }; return Component(props); } };
}
function descendants(node) {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(descendants)];
}

test('grand texte : titres, libellés et montants restent entiers sans réduction automatique', () => {
  const h = presentationHarness();
  const Text = h.load('src/components/ui/Text.js').default;
  for (const fontScale of [1.3, 1.5, 2]) {
    const element = h.render(Text, { children: 'Institut national de formation professionnelle · 125 000 FCFA', numberOfLines: 1, adjustsFontSizeToFit: true, accessibilityLabel: 'Montant du retrait', accessibilityRole: 'header' }, { fontScale });
    assert.equal(element.props.numberOfLines, undefined);
    assert.equal(element.props.adjustsFontSizeToFit, false);
    assert.notEqual(element.props.allowFontScaling, false);
    assert.equal(element.props.accessibilityLabel, 'Montant du retrait');
    assert.equal(element.props.accessibilityRole, 'header');
    assert.match(element.props.children, /125 000 FCFA/);
  }
  const standard = h.render(Text, { numberOfLines: 3, children: 'Une copie' }, { fontScale: 1 });
  assert.equal(standard.props.numberOfLines, 3);
});

test('tri : mesurer et redimensionner les lignes ne modifie jamais la réponse ; les flèches gardent leur contrat', () => {
  const h = presentationHarness();
  const { OrdreRenderer } = h.load('src/prep/exercises/OrderMatch.js');
  const value = Object.freeze({ ordre: Object.freeze(['a', 'b', 'c']) });
  const changes = [];
  const props = { exercice: { contenu: { elements: ['a', 'b', 'c'].map((id) => ({ id, texte: `Proposition ${id} : un libellé complet qui tient sur plusieurs lignes` })) } }, value, onChange: (next) => changes.push(JSON.parse(JSON.stringify(next))), phase: 'answer', seed: 'unchanged' };
  const first = h.render(OrdreRenderer, props);
  const measurements = descendants(first).filter((node) => node.props.onLayout);
  measurements.forEach((node, i) => node.props.onLayout({ nativeEvent: { layout: { height: 110 + i * 30 } } }));
  const measured = h.render(OrdreRenderer, props);
  const rows = descendants(measured).filter((node) => node.type.name === 'OrderRow');
  assert.equal(rows.length, 3);
  assert(rows.every((node) => node.props.rowHeight >= 170));
  assert.deepEqual(changes, []);
  h.render(OrdreRenderer, props, { width: 768, height: 1024, fontScale: 2 });
  assert.deepEqual(changes, []);
  rows[1].props.onMove('b', -1);
  assert.deepEqual(changes, [{ ordre: ['b', 'a', 'c'] }]);
  rows[0].props.positions.value = { a: 2, b: 0, c: 1 };
  rows[0].props.onDrop();
  assert.deepEqual(changes.at(-1), { ordre: ['b', 'c', 'a'] });
  assert.deepEqual(value.ordre, ['a', 'b', 'c']);
});
