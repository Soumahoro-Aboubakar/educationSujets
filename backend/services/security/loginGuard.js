const LoginGuard = require('../../models/LoginGuard');
const securityConfig = require('../../config/security');
const log = require('./securityLogger');

/**
 * Verrouillage progressif d'un compte après des échecs de connexion répétés, quelle que soit
 * l'IP (attaque distribuée par force brute).
 *  - Tous les `failuresBeforeLock` échecs consécutifs, l'adresse est verrouillée : 15 min, puis
 *    30 min, 1 h… (doublement à chaque récidive), 24 h au plus.
 *  - Pendant le verrouillage, le mot de passe n'est même pas vérifié : aucune tentative n'aboutit.
 *  - Une connexion réussie ou un mot de passe réinitialisé par e-mail efface tout : le vrai
 *    titulaire a toujours un recours (« Mot de passe oublié »), même si un attaquant le verrouille.
 *  - 24 h sans nouvel échec : l'historique est purgé.
 */
const cfg = () => securityConfig.accountLock;
const DAY_MS = 24 * 60 * 60 * 1000;
const keyOf = (email) => log.hashEmail(String(email || '').trim().toLowerCase());

/** @returns {Promise<number>} millisecondes de verrouillage restantes (0 : connexion autorisée). */
const lockedFor = async (email) => {
  if (!securityConfig.enabled || !cfg().failuresBeforeLock) return 0;
  const guard = await LoginGuard.findOne({ emailHash: keyOf(email) }).select('lockedUntil').lean();
  const left = guard?.lockedUntil ? guard.lockedUntil.getTime() - Date.now() : 0;
  return Math.max(0, left);
};

/** Mot de passe faux. @returns {Promise<number>} durée du verrouillage déclenché (0 sinon). */
const recordFailure = async (email, context = {}) => {
  if (!securityConfig.enabled || !cfg().failuresBeforeLock) return 0;
  const emailHash = keyOf(email);
  const now = Date.now();
  const guard = await LoginGuard.findOneAndUpdate(
    { emailHash },
    { $inc: { failures: 1 }, $max: { expiresAt: new Date(now + DAY_MS) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (guard.failures < cfg().failuresBeforeLock) return 0;
  const lockMs = Math.min(cfg().baseLockMs * 2 ** guard.lockCount, cfg().maxLockMs);
  // Condition sur le compteur : deux échecs simultanés ne verrouillent qu'une fois.
  const locked = await LoginGuard.updateOne(
    { _id: guard._id, failures: { $gte: cfg().failuresBeforeLock } },
    {
      $set: { failures: 0, lockedUntil: new Date(now + lockMs), expiresAt: new Date(now + lockMs + DAY_MS) },
      $inc: { lockCount: 1 },
    },
  );
  if (!locked.modifiedCount) return 0;
  log.warn('auth.account_locked', { ...context, emailHash, blockMs: lockMs, count: guard.lockCount + 1 });
  return lockMs;
};

/** Connexion réussie ou mot de passe réinitialisé : l'historique de l'adresse est effacé. */
const clear = async (email) => {
  await LoginGuard.deleteOne({ emailHash: keyOf(email) });
};

module.exports = { lockedFor, recordFailure, clear };
