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
const create = async (user, platform = 'unknown', sid = crypto.randomUUID()) => {
  const session = new AuthSession({ sid, user: user._id, platform: ['web', 'mobile'].includes(platform) ? platform : 'unknown',
    tokenVersion: user.tokenVersion || 0, expiresAt: new Date(Date.now() + 30 * 86400000) });
  const pair = tokens(user, session);
  session.refreshHash = hash(pair.refreshToken);
  await session.save();
  return { ...pair, session };
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
  const pair = tokens(user, session);
  const changed = await AuthSession.updateOne({ _id: session._id, revokedAt: null, refreshHash: hash(raw) },
    { $set: { refreshHash: hash(pair.refreshToken) } });
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
module.exports = { create, rotate, resolveAccess, revokeAll, revokeToken };
