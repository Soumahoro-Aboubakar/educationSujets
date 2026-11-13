const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// Charge src/utils/storePolicy.js avec une plateforme simulée.
const loadPolicy = (os) => {
  const { code } = babel.transformSync(read('src/utils/storePolicy.js'), {
    filename: 'storePolicy.js', babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => {
    if (name === 'react-native') return { Platform: { OS: os } };
    throw new Error(`module inattendu : ${name}`);
  } });
  return module.exports;
};

test('builds natifs : aucun parcours d’achat, même si le serveur l’autorise ou ne répond pas', () => {
  for (const os of ['android', 'ios']) {
    const policy = loadPolicy(os);
    assert.equal(policy.PURCHASE_FLOW_AVAILABLE, false, os);
    for (const server of [true, undefined, null, false, 'true']) {
      assert.equal(policy.canOfferPurchase(server), false, `${os} / serveur=${server}`);
    }
  }
});

test('version Web : le parcours reste disponible sauf désactivation explicite du serveur', () => {
  const policy = loadPolicy('web');
  assert.equal(policy.canOfferPurchase(true), true);
  assert.equal(policy.canOfferPurchase(undefined), true);
  assert.equal(policy.canOfferPurchase(false), false);
});

test('le hook d’achat ne peut rien ouvrir sur un build natif', () => {
  const source = read('src/hooks/useWebCheckout.js');
  assert.match(source, /if \(!PURCHASE_FLOW_AVAILABLE \|\| !checkoutUrl\) return;/);
});

// Chaque libellé d'achat présent dans le code doit être sous la garde de la politique.
test('libellés d’achat : tous protégés par la politique des stores', () => {
  const files = [
    'src/components/access/AccessSheet.js',
    'src/screens/account/SubscriptionScreen.js',
    'src/screens/account/AccountScreen.js',
    'src/screens/account/PromoCodeScreen.js',
    'src/screens/BulkDownloadScreen.js',
    'src/prep/screens/ExtraScreens.js',
    'src/prep/screens/ModuleLessonScreens.js',
    'src/prep/components/Sheets.js',
    'src/prep/components/MeCard.js',
  ];
  const purchase = /S’abonner|Prendre mon abonnement|Renouveler mon abonnement|Prolonger mon accès|Débloquer avec l’abonnement|Voir l’abonnement|sur le site/;
  for (const file of files) {
    const lines = read(file).split('\n');
    assert.match(lines.join('\n'), /storePolicy/, `${file} doit importer la politique des stores`);
    lines.forEach((line, i) => {
      if (!purchase.test(line) || /^\s*(\/\/|\*)/.test(line)) return;
      // La garde doit apparaître sur la ligne ou dans les 12 lignes qui précèdent.
      const context = lines.slice(Math.max(0, i - 12), i + 1).join('\n');
      assert.match(context, /PURCHASE_FLOW_AVAILABLE|canCheckout/, `${file}:${i + 1} libellé d’achat non protégé`);
    });
  }
});
