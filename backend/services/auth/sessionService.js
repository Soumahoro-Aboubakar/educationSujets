const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AuthSession = require('../../models/AuthSession');
const User = require('../../models/User');
const AppError = require('../../utils/errors');
const log = require('../security/securityLogger');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const invalid = () => new AppError('Session invalide ou expirée', 401);
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

// Compatibilité bornée des JWT émis avant les sessions. Une date passée ferme la transition.
const legacyAllowed = (decoded, user) => Date.now() < Date.parse(process.env.AUTH_LEGACY_UNTIL || '2026-12-15T00:00:00Z')
  && (decoded.ver || 0) === (user.tokenVersion || 0);
const tokens = (user, session) => ({
  token: jwt.sign({ id: user._id, typ: 'access', sid: session.sid, ver: user.tokenVersion || 0 }, process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.AUTH_ACCESS_TTL || '15m', jwtid: crypto.randomUUID() }),
  refreshToken: jwt.sign({ id: user._id, typ: 'refresh', sid: session.sid, ver: user.tokenVersion || 0 }, refreshSecret(),
    { algorithm: 'HS256', expiresIn: Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)), jwtid: crypto.randomUUID() }),
});
/*
 * Durée de session : 30 jours sans visite (prolongée à chaque renouvellement), et au plus 180 jours
 * depuis la connexion, après quoi le mot de passe est redemandé.
 */
const DAY_MS = 86400000;
const IDLE_MS = 30 * DAY_MS;
const MAX_MS = 180 * DAY_MS;
const nextExpiry = (session) => {
  const started = session.createdAt ? session.createdAt.getTime() : Date.now();
  return new Date(Math.min(Date.now() + IDLE_MS, started + MAX_MS));
};
/*
 * Abonnement personnel (CGV) : un même titulaire peut utiliser plusieurs appareils, mais au-delà de
 * MAX_ACTIVE sessions actives la plus anciennement utilisée est fermée (limite douce, jamais de
 * blocage du compte). Chaque dépassement est journalisé pour repérer un éventuel partage.
 */
const MAX_ACTIVE = Math.max(1, Number.parseInt(process.env.AUTH_MAX_ACTIVE_SESSIONS, 10) || 5);
const active = (userId) => ({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } });
/** Libellé lisible et minimal (« Android · Chrome ») ; l’agent utilisateur complet n’est pas conservé. */
const deviceLabel = (userAgent = '', platform = 'unknown') => {
  const ua = String(userAgent);
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iPhone ou iPad' : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : '';
  const app = /okhttp|Expo|ReactNative|Dalvik/i.test(ua) || platform === 'mobile' ? 'Application Fatafalta'
    : /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
      : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return [os, app].filter(Boolean).join(' · ').slice(0, 80) || 'Appareil inconnu';
};
const enforceLimit = async (userId, keepSid) => {
  const sessionsActives = await AuthSession.find(active(userId)).sort({ dernierUsageAt: -1, createdAt: -1 }).select('sid').lean();
  const surplus = sessionsActives.filter((s) => s.sid !== keepSid).slice(MAX_ACTIVE - 1);
  if (!surplus.length) return 0;
  await AuthSession.updateMany({ sid: { $in: surplus.map((s) => s.sid) }, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'limite' } });
  log.warn('auth.session_limit', { userId, count: sessionsActives.length });
  return surplus.length;
};
const create = async (user, platform = 'unknown', sid = crypto.randomUUID(), userAgent = '') => {
  const session = new AuthSession({ sid, user: user._id, platform: ['web', 'mobile'].includes(platform) ? platform : 'unknown',
    tokenVersion: user.tokenVersion || 0, expiresAt: new Date(Date.now() + IDLE_MS),
    appareil: deviceLabel(userAgent, platform), dernierUsageAt: new Date() });
  const pair = tokens(user, session);
  session.refreshHash = hash(pair.refreshToken);
  await session.save();
  await enforceLimit(user._id, session.sid);
  return { ...pair, session };
};
/** Sessions actives du titulaire, pour la page « Mes appareils » (aucune donnée sensible). */
const list = async (userId, currentSid) => (await AuthSession.find(active(userId))
  .sort({ dernierUsageAt: -1, createdAt: -1 }).select('sid platform appareil createdAt dernierUsageAt').lean())
  .map((s) => ({ id: s.sid, plateforme: s.platform, appareil: s.appareil || 'Appareil inconnu', connecteLe: s.createdAt,
    dernierUsage: s.dernierUsageAt || s.createdAt, actuelle: s.sid === currentSid }));
/** Déconnexion à distance d’un seul appareil (uniquement parmi les sessions du titulaire). */
const revokeOne = async (userId, sid) => {
  const r = await AuthSession.updateOne({ sid, user: userId, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: 'utilisateur' } });
  if (r.modifiedCount) log.info('auth.session_revoked', { userId });
  return r.modifiedCount > 0;
};
const rotate = async (raw) => {
  let decoded;
  try { decoded = jwt.verify(raw, refreshSecret(), { algorithms: ['HS256'] }); } catch { throw invalid(); }
  if (decoded.typ !== 'refresh') throw invalid();
  const user = await User.findById(decoded.id);
  if (!user || (user.accountStatus && user.accountStatus !== 'ACTIVE')) throw invalid();
  if ((decoded.ver || 0) !== (user.tokenVersion || 0)) throw invalid();
  if (!decoded.sid) {
    if (!legacyAllowed(decoded, user)) throw invalid();
    // L'empreinte rend l'échange legacy à usage unique, y compris en concurrence.
    try { return { ...await create(user, 'unknown', `legacy-${hash(raw)}`), user }; }
    catch (error) {
      if (error.code !== 11000) throw error;
      await AuthSession.updateOne({ sid: `legacy-${hash(raw)}` }, { $set: { revokedAt: new Date() } });
      throw invalid();
    }
  }
  const session = await AuthSession.findOne({ sid: decoded.sid, user: user._id, revokedAt: null, expiresAt: { $gt: new Date() } });
  if (!session) throw invalid();
  // Session prolongée tant que l'utilisateur revient (plafond : 180 jours après la connexion).
  session.expiresAt = nextExpiry(session);
  const pair = tokens(user, session);
  const changed = await AuthSession.updateOne({ _id: session._id, revokedAt: null, refreshHash: hash(raw) },
    { $set: { refreshHash: hash(pair.refreshToken), expiresAt: session.expiresAt, dernierUsageAt: new Date() } });
  if (!changed.modifiedCount) {
    await AuthSession.updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } });
    log.warn('auth.refresh_replay', { userId: user._id });
    throw invalid();
  }
  return { ...pair, session, user };
};
const resolveAccess = async (raw) => {
  const decoded = jwt.verify(raw, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (decoded.typ === 'refresh') return null;
  const user = await User.findById(decoded.id);
  if (!user || (decoded.ver || 0) !== (user.tokenVersion || 0)) return null;
  // Compte de test : aucune session valable en production, même ouverte auparavant.
  if (require('../../utils/testAccounts').blockedHere(user)) return null;
  if (!decoded.sid) return legacyAllowed(decoded, user) ? user : null;
  const valid = await AuthSession.exists({ sid: decoded.sid, user: user._id, revokedAt: null, expiresAt: { $gt: new Date() }, tokenVersion: user.tokenVersion || 0 });
  return valid ? user : null;
};
const revokeAll = async (userId) => {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  await AuthSession.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  log.info('auth.sessions_revoked', { userId });
};
const revokeToken = async (raw, refresh = false) => {
  if (!raw) return;
  let decoded;
  try { decoded = jwt.verify(raw, refresh ? refreshSecret() : process.env.JWT_SECRET, { algorithms: ['HS256'], ignoreExpiration: true }); } catch { return; }
  if (decoded.sid) await AuthSession.updateOne({ sid: decoded.sid, user: decoded.id }, { $set: { revokedAt: new Date() } });
  else await revokeAll(decoded.id);
  log.info('auth.logout', { userId: decoded.id });
};
module.exports = { create, rotate, resolveAccess, revokeAll, revokeToken, list, revokeOne, deviceLabel, MAX_ACTIVE };
