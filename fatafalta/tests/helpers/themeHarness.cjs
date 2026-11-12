const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');

// Exécute les vrais jetons et le contexte avec seulement les frontières natives simulées.
function createHarness() {
  let scheme = 'light';
  let preferences = {};
  const preferenceUpdates = [];
  let writePreference = async () => {};
  const storage = new Map();
  const appearanceCalls = [];
  const cache = new Map();
  const root = path.resolve(__dirname, '../..');
  const native = {
    Platform: { OS: 'android' },
    Appearance: { setColorScheme: (value) => appearanceCalls.push(value) },
    useColorScheme: () => scheme,
    StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
    StatusBar: (props) => React.createElement('status-bar', props),
  };
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file);
    const output = { exports: {} };
    const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
      configFile: false, babelrc: false,
      plugins: [require.resolve('@babel/plugin-transform-modules-commonjs'), [require.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'classic' }]],
    }).code;
    const requireModule = (name) => {
      if (name === 'react') return React;
      if (name === 'react-native') return native;
      if (name === 'react-native-reanimated') return { Easing: { bezier: () => () => 0 } };
      if (name === '../context/PreferencesContext') return { usePreferences: () => ({
        preferences, isPreferencesReady: true,
        updatePreferences: async (updates) => { preferenceUpdates.push(updates); preferences = { ...preferences, ...updates }; await writePreference(updates); },
      }) };
      if (name === 'expo-secure-store') return {
        getItemAsync: async (key) => storage.get(key),
        setItemAsync: async (key, value) => storage.set(key, value),
        deleteItemAsync: async (key) => storage.delete(key),
      };
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), `${name}.js`));
      throw new Error(`Unexpected module: ${name}`);
    };
    vm.runInNewContext(code, { require: requireModule, module: output, exports: output.exports });
    cache.set(file, output.exports);
    return output.exports;
  }
  return { load, appearanceCalls, preferenceUpdates, setWritePreference: (fn) => { writePreference = fn; }, setAppearance: (value) => { preferences = { appearance: value }; }, setScheme: (value) => { scheme = value; } };
}

const channels = (hex) => hex.slice(1).match(/../g).map((c) => parseInt(c, 16) / 255);
function contrast(foreground, background) {
  const luminance = (hex) => channels(hex).reduce((sum, c, i) => sum + (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
module.exports = { createHarness, contrast };
