const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

// Charge src/prep/rateLimitRetry.js (logique pure, sans React Native).
const { withRateLimitRetry } = (() => {
  const { code } = babel.transformSync(fs.readFileSync(path.join(__dirname, '..', 'src/prep/rateLimitRetry.js'), 'utf8'), {
    filename: 'rateLimitRetry.js', babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('module', 'exports', code)(module, module.exports);
  return module.exports;
})();

const tooMany = (retryAfter) => Object.assign(new Error('429'), { response: { status: 429, headers: retryAfter ? { 'retry-after': String(retryAfter) } : {} } });

test('429 : attend (Retry-After, 10 s au plus) puis reprend le téléchargement', async () => {
  const waits = [];
  let calls = 0;
  const out = await withRateLimitRetry(async () => { calls += 1; if (calls < 3) throw tooMany(calls === 1 ? 4 : 60); return 'module'; }, async (ms) => { waits.push(ms); });
  assert.equal(out, 'module');
  assert.deepEqual(waits, [4000, 10000]);
});

test('429 répétés : abandon après 3 nouveaux essais ; autres erreurs propagées sans attendre', async () => {
  let calls = 0;
  await assert.rejects(withRateLimitRetry(async () => { calls += 1; throw tooMany(); }, async () => {}), /429/);
  assert.equal(calls, 4);
  const waits = [];
  await assert.rejects(withRateLimitRetry(async () => { throw Object.assign(new Error('403'), { response: { status: 403 } }); }, async (ms) => { waits.push(ms); }), /403/);
  assert.deepEqual(waits, []);
});
