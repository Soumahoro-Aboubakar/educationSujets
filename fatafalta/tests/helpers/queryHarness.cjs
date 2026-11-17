const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '../..');

// No application bootstrap, native modules, Babel config or environment file.
function createQueryHarness(mocks = {}) {
  const modules = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (modules.has(filename)) return modules.get(filename);
    const output = { exports: {} };
    modules.set(filename, output.exports);
    const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
      filename, configFile: false, babelrc: false,
      plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    });
    vm.runInNewContext(code, {
      module: output, exports: output.exports, Set, Map, Date, Promise,
      require: (name) => {
        if (name in mocks) return mocks[name];
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.js`));
        if (name === '@tanstack/react-query') return require(name);
        throw new Error(`Unexpected module: ${name}`);
      },
    });
    return output.exports;
  }
  return { load };
}
module.exports = { createQueryHarness };
