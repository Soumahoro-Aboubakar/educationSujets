/**
 * Suppression du compte à la demande de son titulaire (exigée par Google Play et l’App Store ;
 * droit d’effacement de la loi n° 2013-450). Politique de confidentialité, section « Supprimer son compte ».
 *
 * - SUPPRIMÉ : préparation (identités, progression, tentatives, actions, signalements), notifications,
 *   codes e-mail, liens de connexion temporaires, sessions.
 * - ANONYMISÉ : le compte (nom, e-mail, téléphone, mot de passe) et le journal des téléchargements
 *   (utilisateur, adresse IP, navigateur).
 * - CONSERVÉ (obligations comptables et preuve des transactions) : paiements, abonnements,
 *   commissions et retraits, rattachés à un compte désormais anonyme.
 * Refusé tant qu’un retrait d’argent est en cours de traitement.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const AppError = require('../../utils/errors');
const log = require('../security/securityLogger');
const sessions = require('../auth/sessionService');

const model = (name) => require(`../../models/${name}`); // eslint-disable-line global-require

const deleteAccount = async (userId, password) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError('Compte introuvable', 404);
  if (['admin', 'sub-admin'].includes(user.role) || user.isSuperAdmin) {
    throw new AppError('Un compte d’administration ne peut pas être supprimé depuis cet écran.', 403);
  }
  if (!password || !user.password || !(await bcrypt.compare(String(password), user.password))) {
    throw new AppError('Mot de passe incorrect', 401);
  }
  if (await model('Withdrawal').exists({ user: user._id, status: 'PENDING' })) {
    throw new AppError('Un retrait est en cours de traitement. Attends sa fin, ou annule-le, avant de supprimer ton compte.', 409);
  }

  const identites = await model('PrepIdentite').find({ user: user._id }).select('_id').lean();
  const ids = identites.map((i) => i._id);
  if (ids.length) {
    await Promise.all([
      model('PrepProgression').deleteMany({ identite: { $in: ids } }),
      model('PrepTentative').deleteMany({ identite: { $in: ids } }),
      model('PrepAction').deleteMany({ identite: { $in: ids } }),
      model('PrepSignalement').deleteMany({ identite: { $in: ids } }),
    ]);
    await model('PrepIdentite').deleteMany({ _id: { $in: ids } });
  }
  await Promise.all([
    model('PushSubscription').deleteMany({ user: user._id }),
    model('EmailCode').deleteMany({ user: user._id }),
    model('AuthHandoff').deleteMany({ user: user._id }),
    model('DownloadLog').updateMany({ user: user._id }, { $set: { user: null, ip: null, userAgent: null } }),
  ]);
  await sessions.revokeAll(user._id);

  const id = String(user._id);
  user.set({
    name: 'Compte supprimé', firstName: 'Compte', lastName: 'supprimé',
    email: `supprime-${id}@supprime.invalid`, phone: undefined,
    password: crypto.randomBytes(32).toString('hex'),
    isVerified: false, verificationToken: undefined, verificationExpire: undefined,
    resetPasswordToken: undefined, resetPasswordExpire: undefined,
    accountStatus: 'DISABLED', statusReason: 'Supprimé à la demande du titulaire',
    isPremium: false,
  });
  user.$locals.skipNotify = true;
  await user.save({ validateBeforeSave: false });
  log.info('account.deleted', { userId: id });
  return { supprime: true };
};

module.exports = { deleteAccount };
