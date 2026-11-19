/*
 * Environnement d'exécution : 'production' | 'development' | 'test'.
 *
 * APP_ENV le fixe explicitement. Sans APP_ENV : NODE_ENV=development ou test le donne ; sinon,
 * PRODUCTION. Le mode le plus strict est la valeur par défaut (« échec fermé ») : oublier une variable
 * sur le serveur ne doit jamais ouvrir les comptes de test ni les facilités de développement.
 */
const VALUES = ['production', 'development', 'test'];

const resolve = (env = process.env) => {
  const explicit = String(env.APP_ENV || '').trim().toLowerCase();
  if (explicit) return VALUES.includes(explicit) ? explicit : 'production';
  const node = String(env.NODE_ENV || '').trim().toLowerCase();
  return node === 'development' || node === 'test' ? node : 'production';
};

const appEnv = () => resolve();
const isProduction = () => appEnv() === 'production';

module.exports = { appEnv, isProduction, resolve, VALUES };
