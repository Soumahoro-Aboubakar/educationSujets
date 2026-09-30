const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un nom'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Veuillez ajouter un email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Veuillez ajouter un email valide'],
  },
  password: {
    type: String,
    required: [true, 'Veuillez ajouter un mot de passe'],
    minlength: 6,
    select: false,
  },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  phone: { type: String, trim: true },
  // 'contributor' est conservé pour les comptes historiques ; les nouveaux comptes sont 'user'.
  role: {
    type: String,
    enum: ['user', 'partner', 'contributor', 'sub-admin', 'admin'],
    default: 'user',
  },
  // Statut du compte, indépendant de l'abonnement et du code promotionnel.
  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'DISABLED', 'SUSPENDED'],
    default: 'ACTIVE',
  },
  statusReason: { type: String, trim: true },
  mustChangePassword: { type: Boolean, default: false },
  // Code promotionnel utilisé lors du premier paiement (fixé une seule fois, côté serveur).
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isPremium: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('save', async function handlePasswordHash(next) {
  if (this.role === 'admin') {
    this.isSuperAdmin = true;
  }

  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

UserSchema.methods.getSignedJwtToken = function getSignedJwtToken() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

UserSchema.methods.getRefreshToken = function getRefreshToken() {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
};

UserSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
