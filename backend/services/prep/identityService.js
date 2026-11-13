const crypto = require('crypto');
const PrepIdentite = require('../../models/PrepIdentite');
const AppError = require('../../utils/errors');
const log = require('../security/securityLogger');
const core = require('./shared/prepCore');

/**
 * Identité appareil (§ 25.1, § 25.4). Jeton « p1.<id>.<signature> » signé HMAC : le client ne
 * peut pas en fabriquer, seulement réutiliser celui reçu. Transport : en-tête X-Prep-Token.
 *
 * Restauration après réinstallation : on retrouve l'identité par l'un des identifiants persistants
 * (Trousseau / SecureStore, ANDROID_ID, identifierForVendor). L'empreinte n'est jamais utilisée seule.
 * L'attestation de plateforme (DeviceCheck, Play Integrity) est prévue au § 25.4 : elle nécessite
 * une configuration native et des clés de plateforme, à ajouter avant la mise en production.
 */
const HEADER = 'x-prep-token';
const secret = () => process.env.PREP_TOKEN_SECRET || process.env.JWT_SECRET || 'fatafalta-dev-prep';
const sign = (id) => crypto.createHmac('sha256', secret()).update(`prep:${id}`).digest('base64url').slice(0, 24);

const issueToken = (id) => `p1.${id}.${sign(String(id))}`;

const verifyToken = (token) => {
  if (typeof token !== 'string' || token.length > 80) return null;
  const [version, id, signature] = token.split('.');
  if (version !== 'p1' || !/^[a-f0-9]{24}$/.test(id || '') || !signature) return null;
  const expected = sign(id);
  if (signature.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? id : null;
};

const clean = (value, max = 120) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

/**
 * Déclare ou restaure l'identité d'un appareil.
 * @returns {{ identite, retour: boolean }}
 */
const declare = async ({ appareilId, androidId, vendorId, empreinte }, user, token) => {
  if (token) {
    const existing = await fromRequest({ headers: { [HEADER]: token }, user });
    if (!existing) throw new AppError('Identité de préparation invalide', 401);
    return { identite: user ? await attach(existing, user) : existing, retour: true };
  }
  if (user) {
    const canonical = await canonicalFor(user);
    if (canonical) return { identite: canonical, retour: true };
  }
  const ids = { appareilId: clean(appareilId, 64), androidId: clean(androidId, 64), vendorId: clean(vendorId, 64) };
  if (!ids.appareilId) {
    const error = new Error('Identifiant d’appareil manquant');
    error.statusCode = 400;
    throw error;
  }
  const or = Object.entries(ids).filter(([, v]) => v).map(([k, v]) => ({ [`identifiants.${k}`]: v }));
  const candidats = await PrepIdentite.find({ $or: or, fusionneeDans: null, user: null, mergeTarget: null }).sort({ createdAt: 1 }).limit(5);

  if (candidats.length) {
    // Plusieurs identités possibles (identifiants divergents) : on retient le compteur le plus consommé (§ 25.4).
    const identite = candidats.reduce((best, c) => (c.essai.jours.length > best.essai.jours.length ? c : best), candidats[0]);
    let changed = false;
    Object.entries(ids).forEach(([k, v]) => {
      if (v && !identite.identifiants[k]) { identite.identifiants[k] = v; changed = true; }
    });
    if (empreinte && !identite.empreinte) { identite.empreinte = clean(empreinte, 300); changed = true; }
    if (changed) await identite.save();
    const retour = identite.identifiants.appareilId !== ids.appareilId || identite.essai.jours.length > 0;
    // Un identifiant d'appareil déclaré n'est pas une preuve pour rattacher ses données.
    if (user) throw new AppError('Jeton invité requis pour rattacher cet appareil', 409);
    return { identite, retour };
  }

  const previousTrials = await PrepIdentite.find({ $or: or, user: { $ne: null } }).select('essai').lean();
  const essai = { jours: [...new Set(previousTrials.flatMap((item) => item.essai?.jours || []))].sort(),
    iaUtilisees: Math.max(0, ...previousTrials.map((item) => item.essai?.iaUtilisees || 0)) };
  const identite = new PrepIdentite({ essai, identifiants: ids, empreinte: clean(empreinte, 300) || '', pseudonyme: 'tmp' });
  // Même graine que l'application : le pseudonyme affiché hors ligne est conservé.
  identite.pseudonyme = core.pseudonymFromSeed(ids.appareilId);
  identite.avatarTeinte = Math.floor(core.seededRandom(`avatar:${ids.appareilId}`)() * 6);
  await identite.save();
  return { identite: user ? await attach(identite, user) : identite, retour: false };
};

const assertOwner = (identite, user) => {
  if (identite.user && (!user || String(identite.user) !== String(user._id))) {
    throw new AppError('Connecte-toi au compte propriétaire de cette préparation', 403, undefined, 'PREP_OWNER');
  }
};
const fromRequest = async (req) => {
  const id = verifyToken(req.headers?.[HEADER]);
  if (!id) return null;
  let identite = await PrepIdentite.findById(id);
  if (!identite) return null;
  assertOwner(identite, req.user);
  if (identite.mergeTarget && !identite.fusionneeDans) {
    throw new AppError('Rattachement en cours, réessaie dans un instant', 409, undefined, 'PREP_MERGING');
  }
  if (identite.fusionneeDans) {
    identite = await PrepIdentite.findById(identite.fusionneeDans);
    if (!identite) return null;
    assertOwner(identite, req.user);
  }
  return identite;
};
const canonicalFor = async (user) => {
  const found = await PrepIdentite.findOne({ user: user._id, canonical: true, fusionneeDans: null });
  if (found) return found;
  const legacy = await PrepIdentite.findOne({ user: user._id, fusionneeDans: null, mergeTarget: null }).sort({ createdAt: 1, _id: 1 });
  if (!legacy) return null;
  try {
    return await PrepIdentite.findOneAndUpdate({ _id: legacy._id, fusionneeDans: null }, { $set: { canonical: true } }, { new: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return PrepIdentite.findOne({ user: user._id, canonical: true });
  }
};

// La propriété est réservée atomiquement AVANT toute fusion : A ne peut jamais devenir B.
const attach = async (source, user) => {
  assertOwner(source, user);
  const claimed = await PrepIdentite.findOneAndUpdate({ _id: source._id, $or: [{ user: null }, { user: user._id }] },
    { $set: { user: user._id } }, { new: true });
  if (!claimed) throw new AppError('Cette préparation appartient à un autre compte', 403);
  const target = await canonicalFor(user);
  if (String(target._id) === String(claimed._id)) return target;
  await PrepIdentite.updateOne({ _id: claimed._id, user: user._id }, { $set: { mergeTarget: target._id } });
  await require('./identityMerge').merge(claimed, target);
  await PrepIdentite.updateOne({ _id: claimed._id }, { $set: { fusionneeDans: target._id, canonical: false } });
  log.info('prep.identity_attached', { userId: user._id });
  return PrepIdentite.findById(target._id);
};
module.exports = { HEADER, issueToken, verifyToken, declare, fromRequest, attach, canonicalFor, assertOwner };
