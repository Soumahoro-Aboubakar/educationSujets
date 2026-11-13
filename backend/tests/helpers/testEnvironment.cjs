// Préchargé par les suites : interdit la lecture implicite du .env du développeur.
require('dotenv').config = () => ({ parsed: {} });
if (process.env.TEST_MONGODB_URI && !/^mongodb:\/\/(127\.0\.0\.1|localhost):27017\/[a-z0-9-]*test[a-z0-9-]*$/.test(process.env.TEST_MONGODB_URI)) {
  throw new Error('TEST_MONGODB_URI doit désigner une base locale jetable contenant test');
}
Object.assign(process.env, {
  NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:27017/fatafalta-dev', PAYMENT_MODE: 'mock',
  SELF_URL: '', RENDER_EXTERNAL_URL: '', FRONTEND_DEPLOY_HOOK_URL: '', INDEXNOW_KEY: '',
  STORAGE_FOLDER: 'dev-local', PORT: '5055', PAYMENT_RECONCILE_INTERVAL_SECONDS: '0',
  JWT_SECRET: 'test-only-access', JWT_REFRESH_SECRET: 'test-only-refresh',
  // Les tests de compatibilité créent des JWT legacy ; pas de dépendance au calendrier réel.
  AUTH_LEGACY_UNTIL: '2099-01-01T00:00:00Z',
});
