const crypto = require('crypto');
const PrepIdentite = require('../../models/PrepIdentite');
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
const declare = async ({ appareilId, androidId, vendorId, empreinte }) => {
  const ids = { appareilId: clean(appareilId, 64), androidId: clean(androidId, 64), vendorId: clean(vendorId, 64) };
  if (!ids.appareilId) {
    const error = new Error('Identifiant d’appareil manquant');
    error.statusCode = 400;
    throw error;
  }
  const or = Object.entries(ids).filter(([, v]) => v).map(([k, v]) => ({ [`identifiants.${k}`]: v }));
  const candidats = await PrepIdentite.find({ $or: or, fusionneeDans: null }).sort({ createdAt: 1 }).limit(5);

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
    return { identite, retour };
  }

  const identite = new PrepIdentite({ identifiants: ids, empreinte: clean(empreinte, 300) || '', pseudonyme: 'tmp' });
  // Même graine que l'application : le pseudonyme affiché hors ligne est conservé.
  identite.pseudonyme = core.pseudonymFromSeed(ids.appareilId);
  identite.avatarTeinte = Math.floor(core.seededRandom(`avatar:${ids.appareilId}`)() * 6);
  await identite.save();
  return { identite, retour: false };
};

const fromRequest = async (req) => {
  const id = verifyToken(req.headers[HEADER]);
  if (!id) return null;
  const identite = await PrepIdentite.findById(id);
  if (!identite) return null;
  if (identite.fusionneeDans) return PrepIdentite.findById(identite.fusionneeDans);
  return identite;
};

module.exports = { HEADER, issueToken, verifyToken, declare, fromRequest };
