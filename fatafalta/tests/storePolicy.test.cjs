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

test('« Voir mon abonnement » : piloté par le serveur, coupable sans republication', () => {
  for (const os of ['android', 'ios', 'web']) {
    const policy = loadPolicy(os);
    assert.equal(policy.canOpenAccount({ webAccountUrl: 'https://exemple.test/compte/abonnement' }), true, os);
    assert.equal(policy.canOpenAccount({ webAccountUrl: 'https://exemple.test/compte/abonnement', mobileAccountLink: false }), false, os);
    assert.equal(policy.canOpenAccount({}), false, `${os} : ancien serveur sans adresse`);
    assert.equal(policy.canOpenAccount(undefined), false, os);
  }
});

test('« Voir mon abonnement » : aucun prix ni mot d’achat dans l’app, jeton jamais dans l’adresse', () => {
  const hook = read('src/hooks/useAccountLink.js');
  assert.match(hook, /createWebHandoff\(\)/);
  assert.doesNotMatch(hook.replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, ''), /token|prix|payer|paiement|abonne-toi|S’abonner/i);
  for (const file of ['src/screens/account/SubscriptionScreen.js', 'src/prep/screens/ExtraScreens.js', 'src/components/access/AccessSheet.js']) {
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      if (!/Voir mon abonnement/.test(line)) return;
      const context = lines.slice(Math.max(0, i - 8), i + 1).join('\n');
      assert.match(context, /accountLink\.available|showAccount/, `${file}:${i + 1} bouton non protégé par l’interrupteur serveur`);
    });
  }
});

test('tous les boutons « Voir mon abonnement » de la préparation passent par l’action commune (site direct)', () => {
  const hook = read('src/hooks/useAccountLink.js');
  assert.match(hook, /if \(!PURCHASE_FLOW_AVAILABLE && link\.available\) link\.open\(\);/);
  for (const file of ['src/prep/screens/PrepHomeScreen.js', 'src/prep/screens/ReviewsScreen.js', 'src/prep/screens/SessionScreen.js', 'src/prep/screens/ModuleLessonScreens.js']) {
    const source = read(file);
    assert.match(source, /useOpenSubscription\(navigation\)/, `${file} doit utiliser l’action commune`);
    source.split('\n').forEach((line, i) => {
      if (/navigat\w*\.(navigate|replace)\('PrepSubscription'\)/.test(line)) {
        assert.match(line, /PURCHASE_FLOW_AVAILABLE \?/, `${file}:${i + 1} ouverture directe de l’écran interne sur build store`);
      }
    });
  }
});

test('« Voir mon abonnement » sans compte : création de compte puis ouverture automatique du site', () => {
  const hook = read('src/hooks/useAccountLink.js');
  assert.match(hook, /navigation\.navigate\('Register', \{ returnTo: 'back', then: THEN_SUBSCRIPTION \}\)/);
  const redirect = read('src/hooks/useAuthRedirect.js');
  assert.match(redirect, /route\?\.params\?\.then === THEN_SUBSCRIPTION\) setTimeout\(\(\) => \{ openAccountPageAfterAuth\(\); \}/);
  // Le passage entre « Créer un compte » et « Se connecter » conserve la demande.
  for (const file of ['src/screens/LoginScreen.js', 'src/screens/RegisterScreen.js']) {
    assert.match(read(file), /navigation\.replace\('(Register|Login)', route\.params\)/, file);
  }
});

test('feuille d’accès d’un sujet : « Voir mon abonnement » seulement si le serveur fournit l’adresse, « Se connecter » sans compte', () => {
  const sheet = read('src/components/access/AccessSheet.js');
  // Connecté : bouton conditionné à l'adresse fournie par le serveur (aucun écran de repli).
  assert.match(sheet, /signedIn\s*\?\s*\(accountLink\.available\s*\?\s*<ActionButton title=\{SUBSCRIPTION_BUTTON_LABEL\}/);
  assert.match(sheet, /:\s*null\)\s*:\s*onLogin \? <ActionButton title="Se connecter" onPress=\{onLogin\} \/>/);
  assert.match(sheet, /<ActionButton title="J’ai compris" variant="secondary" onPress=\{onClose\} \/>/);
  // L'action est celle de tous les autres boutons « Voir mon abonnement ».
  assert.match(read('src/hooks/useDocumentAccess.js'), /useOpenSubscription\(navigation\)/);
});

test('téléchargement : un événement de progression tardif ne remet jamais le document en « Téléchargement… 100 % »', () => {
  const store = read('src/store/useDownloadStore.js');
  assert.match(store, /if \(finished \|\| !get\(\)\.activeDownloads\[documentId\]\?\.downloading\) return;/);
  assert.match(store, /await downloadResumable\.downloadAsync\(\);\n\s*finished = true;/);
  // Fin du téléchargement : ouverture automatique ; sur iOS, lecteur PDF intégré.
  const hook = read('src/hooks/useDownload.js');
  assert.match(hook, /if \(openWhenDone\) openDownloadedFile\(document, \{ getLocalUri, removeDownload, navigation \}\);/);
  assert.match(hook, /navigation\.navigate\('PdfViewer', \{ document, uri: localUri \}\)/);
});

test('préparation : une identité refusée (compte déconnecté, PREP_OWNER) est rétablie au lieu d’afficher « Connexion internet requise »', () => {
  const store = read('src/prep/store.js');
  assert.match(store, /return status === 401 \|\| \(status === 403 && code === 'PREP_OWNER'\);/);
  // Échec de la file : réponse du serveur = en ligne ; identité refusée → identité invitée puis renvoi.
  assert.match(store, /recoverIdentity = isIdentityRefused\(error\);/);
  assert.match(store, /if \(recoverIdentity && !refreshingIdentity\) \{[\s\S]*?await get\(\)\.resetIdentity\(\);/);
  // Téléchargement des modules : PREP_OWNER n'est pas un verrou d'abonnement.
  assert.match(read('src/prep/contentSync.js'), /error\?\.response\?\.data\?\.code === 'PREP_OWNER'\) \{ identityRejected = true; break; \}/);
});
