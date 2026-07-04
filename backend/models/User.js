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
  role: {
    type: String,
    enum: ['contributor', 'sub-admin', 'admin'],
    default: 'admin',
  },
  isVerified: {
    type: Boolean,
    default: true,
  },
  verificationToken: String,
  verificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('save', async function handlePasswordHash(next) {
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
