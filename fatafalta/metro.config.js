// Configuration Metro par défaut d'Expo, plus un correctif limité au web.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Aperçu web (expo start --web) : pdf-lib dépend de tslib 1.x, dont l'export par défaut est
// mal interprété par le bundle web (« Cannot destructure property '__extends' »). On sert la
// version ES de tslib sur le web uniquement ; Android et iOS ne sont pas concernés.
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Aperçu web : SecureStore n'existe pas dans le navigateur → équivalent localStorage.
  if (platform === 'web' && moduleName === 'expo-secure-store') {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'web-shims/secure-store.js') };
  }
  if (platform === 'web' && moduleName === 'tslib') {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'node_modules/tslib/tslib.es6.js') };
  }
  return (defaultResolve || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
