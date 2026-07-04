const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const { extractToken } = require('../utils/request');

const resolveUser = async (token) => {
  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return User.findById(decoded.id);
};

const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new AppError('Non autorise a acceder a cette ressource', 401);
  }

  const user = await resolveUser(token);

  if (!user) {
    throw new AppError('Utilisateur introuvable ou session invalide', 401);
  }

  req.user = user;
  next();
});

const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const user = await resolveUser(token);
    req.user = user || null;
    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentification requise', 401));
  }

  if (!roles.includes(req.user.role)) {
    return next(new AppError(`Le role ${req.user.role} n'est pas autorise a acceder a cette ressource`, 403));
  }

  return next();
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
};
