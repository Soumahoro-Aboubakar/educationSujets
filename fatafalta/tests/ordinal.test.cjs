const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/ordinal.js'), 'utf8');
const utility = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('ordinal français : seul 1 prend le suffixe premier', async () => {
  const { ordinal } = await utility;
  for (const [value, expected] of [[1, '1ᵉʳ'], [2, '2ᵉ'], [21, '21ᵉ'], [101, '101ᵉ']]) {
    assert.equal(ordinal(value), expected);
  }
});

test('milliers séparés par une espace fine insécable', async () => {
  const { ordinal } = await utility;
  assert.equal(ordinal(1001), '1\u202f001ᵉ');
  assert.equal(ordinal(1000000), '1\u202f000\u202f000ᵉ');
});

test('première au féminin, autres ordinaux inchangés', async () => {
  const { ordinal } = await utility;
  assert.equal(ordinal(1, { feminine: true }), '1ʳᵉ');
  assert.equal(ordinal(2, { feminine: true }), '2ᵉ');
});
