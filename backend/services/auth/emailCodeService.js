const crypto = require('crypto');
const EmailCode = require('../../models/EmailCode');
const EmailQuota = require('../../models/EmailQuota');
const emailConfig = require('../../config/email');
const AppError = require('../../utils/errors');
const { sendEmail } = require('../email/mailer');
const { otpEmail } = require('../email/templates');

/*
 * Codes à 6 chiffres envoyés par e-mail : vérification d'adresse et mot de passe oublié.
 * - Au plus EMAIL_DAILY_LIMIT (3) e-mails par adresse et par jour, tous types confondus ;
 *   au-delà, refus jusqu'au lendemain (minuit, heure d'Abidjan = UTC).
 * - Un nouveau code remplace le précédent ; valable 15 minutes ; 5 essais au plus.
 * - Le code n'est jamais stocké en clair (HMAC), ni écrit dans les journaux.
 */
const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
const normalize = (email) => String(email || '').trim().toLowerCase();
const emailHashOf = (email) => crypto.createHash('sha256').update(normalize(email)).digest('hex');
const secret = () => process.env.JWT_SECRET || 'dev-only';
const hashCode = (userId, purpose, code) => crypto.createHmac('sha256', secret()).update(`${purpose}:${userId}:${code}`).digest('hex');
const tomorrow = () => { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d; };

const quotaError = (limit) => new AppError(
  `Vous avez atteint la limite de ${limit} e-mails pour aujourd’hui. Réessayez demain.`,
  429, { retryAt: tomorrow().toISOString() }, 'EMAIL_DAILY_LIMIT',
);

/** Réserve un envoi pour cette adresse aujourd'hui ; AppError 429 au-delà de la limite. Atomique. */
const reserve = async (email) => {
  const { dailyLimit } = emailConfig();
  const filter = { emailHash: emailHashOf(email), day: dayKey() };
  try {
    const doc = await EmailQuota.findOneAndUpdate(
      { ...filter, count: { $lt: dailyLimit } },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 3 * 86400000) } },
      { upsert: true, new: true },
    );
    return { remaining: Math.max(0, dailyLimit - doc.count), limit: dailyLimit };
  } catch (error) {
    // Document existant déjà à la limite : la condition échoue, l'insertion bute sur l'index unique.
    if (error?.code === 11000) throw quotaError(dailyLimit);
    throw error;
  }
};

/** Rend l'envoi réservé quand aucun fournisseur n'a pu l'accepter (panne de notre côté). */
const release = (email) => EmailQuota.updateOne({ emailHash: emailHashOf(email), day: dayKey(), count: { $gt: 0 } }, { $inc: { count: -1 } });

/** Envois encore possibles aujourd'hui pour cette adresse. */
const remainingToday = async (email) => {
  const { dailyLimit } = emailConfig();
  const doc = await EmailQuota.findOne({ emailHash: emailHashOf(email), day: dayKey() }).lean();
  return Math.max(0, dailyLimit - (doc?.count || 0));
};

/**
 * Crée un code et l'envoie. `user` absent (mot de passe oublié pour une adresse inconnue) : le
 * quota est consommé de la même façon et rien n'est envoyé, pour ne pas révéler quels comptes existent.
 * @returns {{ remaining: number, limit: number }}
 */
const issueCode = async ({ email, user, purpose }) => {
  const config = emailConfig();
  const quota = await reserve(email);
  if (!user) return quota;
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await EmailCode.findOneAndUpdate(
    { user: user._id, purpose },
    { $set: { codeHash: hashCode(user._id, purpose, code), attempts: 0, expiresAt: new Date(Date.now() + config.codeTtlMinutes * 60000) } },
    { upsert: true },
  );
  try {
    await sendEmail({ to: { email: normalize(email), name: user.name }, ...otpEmail({ purpose, code, name: user.name, minutes: config.codeTtlMinutes }) });
  } catch (error) {
    await release(email);
    await EmailCode.deleteOne({ user: user._id, purpose });
    throw error;
  }
  return quota;
};

const invalidCode = () => new AppError('Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.', 400, undefined, 'EMAIL_CODE_INVALID');

/** Vérifie et consomme un code ; AppError 400 sinon (même message dans tous les cas d'échec). */
const consumeCode = async ({ user, purpose, code }) => {
  const config = emailConfig();
  const clean = String(code || '').replace(/\D/g, '');
  if (!user || clean.length !== 6) throw invalidCode();
  const entry = await EmailCode.findOne({ user: user._id, purpose });
  if (!entry || entry.expiresAt < new Date() || entry.attempts >= config.maxAttempts) throw invalidCode();
  const expected = Buffer.from(entry.codeHash, 'hex');
  const given = Buffer.from(hashCode(user._id, purpose, clean), 'hex');
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    entry.attempts += 1;
    // Trop d'essais : le code est détruit, il faut en demander un nouveau.
    if (entry.attempts >= config.maxAttempts) await entry.deleteOne(); else await entry.save();
    throw invalidCode();
  }
  await entry.deleteOne();
  return true;
};

module.exports = { issueCode, consumeCode, remainingToday, normalize, dayKey };
