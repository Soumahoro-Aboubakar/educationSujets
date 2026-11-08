// Chargement Babel/vm comme prepRanking.test.cjs ; aucune dépendance ajoutée.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const filename = path.join(root, 'src/utils/userMessages.js');
const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, configFile: false, babelrc: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
const output = {};
vm.runInNewContext(code, { exports: output });
const { getUserMessage, getErrorMessage, getErrorAlert, createUserError } = output;
const http = (status, data = {}) => ({ response: { status, data } });
const technical = /serveur|\bservice\b|\bAPI\b|réseau|status code|Network Error|timeout|undefined|raison inconnue|\b[45]\d\d\b|stack|TypeError|password_hash|ECONNABORTED/i;
function safe(result) {
  assert.equal(typeof result.title, 'string'); assert.ok(result.title);
  assert.equal(typeof result.message, 'string'); assert.ok(result.message);
  assert.doesNotMatch(`${result.title} ${result.message}`, technical);
}
test('hors ligne et absence de réponse : consigne de connexion internet', () => {
  for (const error of [{ isConnected: false }, { code: 'ERR_NETWORK' }, { request: {} }, new Error('Network Error'), new Error('Network request failed'), new Error('Failed to fetch')]) {
    const result = getUserMessage(error, 'telechargement'); safe(result);
    assert.equal(result.title, 'Connexion internet indisponible');
    assert.match(result.message, /Vérifie ta connexion internet/);
  }
});
test('délai dépassé distingué de la déconnexion', () => {
  for (const error of [{ code: 'ECONNABORTED', request: {} }, { code: 'ETIMEDOUT' }, new Error('timeout of 12000ms exceeded'), createUserError('attente')]) {
    const result = getUserMessage(error); safe(result);
    assert.equal(result.title, 'L’attente a été trop longue');
  }
});
test('session expirée et identifiants incorrects', () => {
  const session = getUserMessage(http(401)); safe(session);
  assert.match(session.message, /Connecte-toi à nouveau/);
  const login = getUserMessage(http(401), 'connexion', 'vous'); safe(login);
  assert.match(login.message, /Vérifiez vos identifiants/);
});
test('accès refusé : aucun détail reçu affiché', () => {
  const result = getUserMessage(http(403, { error: 'Forbidden password_hash' })); safe(result);
  assert.equal(result.title, 'Accès réservé');
});
test('ressource introuvable, classement et recherche indisponibles', () => {
  for (const context of ['pdf', 'recherche', 'classement', 'profil']) safe(getUserMessage(http(404), context));
  assert.equal(getUserMessage(http(404), 'recherche').title, 'Recherche momentanément indisponible');
  assert.equal(getUserMessage(http(404), 'recherche').message, 'Tu peux parcourir le classement en attendant. Réessaie un peu plus tard.');
});
test('erreurs temporaires : titre adapté au contexte', () => {
  for (const status of [500, 502, 503, 504]) {
    const result = getUserMessage(http(status, { error: 'Network Error serveur API 503' }), 'telechargement'); safe(result);
    assert.equal(result.title, 'Téléchargement interrompu');
    assert.equal(result.message, 'Réessaie dans quelques instants.');
  }
});
test('saisie invalide : liste fermée de messages reformulés', () => {
  for (const status of [400, 422]) {
    for (const data of [{ error: 'Email invalide' }, { message: 'Email invalide' }, { errors: [{ msg: 'Email invalide' }] }]) {
      const result = getUserMessage(http(status, data)); safe(result);
      assert.match(result.message, /adresse e-mail/);
    }
    for (const error of ['password_hash is required', 'Le serveur est indisponible', 'Veuillez corriger api_token.', '<html>502</html>', 'Texte inconnu mais lisible.', '__proto__', 'constructor', { message: 'Network Error' }]) {
      const result = getUserMessage(http(status, { error })); safe(result);
      assert.equal(result.message, 'Vérifie les informations saisies, puis réessaie.');
    }
  }
});
test('paiement refusé, conflit et tentatives rapprochées', () => {
  const result = getUserMessage(http(402), 'paiement'); safe(result);
  assert.equal(result.title, 'Paiement refusé'); assert.match(result.message, /moyen de paiement/);
  safe(getUserMessage(http(409))); safe(getUserMessage(http(429)));
});
test('exceptions JS et valeurs manquantes : aucune fuite technique', () => {
  for (const error of [new Error('TypeError undefined password_hash API 500'), 'Network Error', undefined, null, {}, { message: 'serveur API timeout', response: { status: 503 } }]) {
    safe(getUserMessage(error)); assert.doesNotMatch(getErrorMessage(error), technical);
  }
});
test('vouvoiement dans chaque scénario', () => {
  for (const error of [http(400, { error: 'Cet email est déjà utilisé' }), http(401), http(403), http(404), http(500), { code: 'ERR_NETWORK' }, new Error('JS')]) {
    const result = getUserMessage(error, 'recherche', 'vous'); safe(result);
    assert.doesNotMatch(result.message, /\bTu\b|\bta\b|\bton\b|Réessaie\b|Vérifie\b|Connecte-toi/);
  }
});
test('erreurs PDF locales : consignes maîtrisées et objets non fiables ignorés', () => {
  for (const reason of ['pdf_taille', 'pdf_pages', 'pdf_format', 'pdf_lecture', 'pdf_images', 'pdf_preparation']) {
    const result = getUserMessage(createUserError(reason), 'pdf', 'vous'); safe(result);
    assert.match(result.message, /Choisissez|Sélectionnez|Réessayez/);
  }
  const timeout = createUserError('attente');
  assert.equal(getUserMessage(createUserError('pdf_format', timeout), 'pdf').title, 'L’attente a été trop longue');
  assert.equal(getUserMessage({ userMessage: 'serveur', reason: 'pdf_format' }, 'pdf').title, 'Préparation du PDF interrompue');
});
test('adaptateurs pour alertes et messages en ligne', () => {
  const error = http(503); const result = getUserMessage(error, 'telechargement');
  assert.equal(getErrorMessage(error, 'telechargement'), `${result.title}. ${result.message}`);
  assert.equal(getErrorAlert(error, 'telechargement').join('|'), `${result.title}|${result.message}`);
});
function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sources(file);
    return entry.name.endsWith('.js') && !file.endsWith('/prep/shared/prepCore.js') ? [file] : [];
  });
}
test('syntaxe de toutes les sources et portée des références de messages', () => {
  for (const file of sources(path.join(root, 'src'))) {
    const ast = babel.parseSync(fs.readFileSync(file, 'utf8'), { filename: file, configFile: false, babelrc: false, parserOpts: { sourceType: 'module', plugins: ['jsx'] } });
    babel.traverse(ast, { CallExpression(p) {
      if (!['getUserMessage', 'getErrorMessage', 'getErrorAlert', 'createUserError'].includes(p.node.callee.name)) return;
      assert.ok(p.scope.hasBinding(p.node.callee.name), `${file}: fonction non importée`);
      for (const argument of p.node.arguments) {
        if (argument?.type === 'Identifier' && argument.name !== 'undefined') assert.ok(p.scope.hasBinding(argument.name), `${file}: erreur hors de portée ${argument.name}`);
      }
    } });
  }
});
