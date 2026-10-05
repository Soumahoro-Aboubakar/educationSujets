const log = require('../services/security/securityLogger');

/**
 * Réponses d'erreur cohérentes et sans fuite : un message n'est renvoyé tel quel que s'il a été
 * écrit pour l'utilisateur (AppError). Toute autre erreur (base de données, bibliothèque,
 * fournisseur) devient « Erreur serveur » ; le détail reste dans les logs, retrouvable grâce
 * au `requestId` renvoyé au client. La stack n'est exposée qu'en développement explicite.
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    // Réponse déjà partie (ex. délai dépassé) : seule la trace serveur reste utile.
    if (process.env.NODE_ENV !== 'test') console.error(`[${req.id || '-'}] after response:`, err.message);
    return undefined;
  }

  let statusCode = err.statusCode || err.status || 500;
  // Erreur client (4xx) : message destiné à l'appelant. Erreur serveur non prévue : générique.
  let message = err.isOperational || (statusCode >= 400 && statusCode < 500) ? err.message || 'Requete invalide' : 'Erreur serveur';
  let details = err.isOperational ? err.details : undefined;
  let code = err.errorCode;

  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Ressource introuvable';
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Une ressource avec cette valeur existe deja';
  }

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation des donnees echouee';
    details = Object.values(err.errors).map((validationError) => ({
      field: validationError.path,
      message: validationError.message,
    }));
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Session invalide ou expiree';
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'Le fichier depasse la taille maximale autorisee';
  }

  // Erreurs du parseur de corps (body-parser).
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Requete trop volumineuse';
    code = 'PAYLOAD_TOO_LARGE';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Corps de requete invalide (JSON mal forme)';
    code = 'INVALID_JSON';
  } else if (err.type === 'parameters.too.many') {
    statusCode = 413;
    message = 'Trop de parametres dans la requete';
    code = 'TOO_MANY_PARAMETERS';
  } else if (typeof err.type === 'string' && err.type.startsWith('encoding.')) {
    statusCode = 415;
    message = 'Encodage de requete non pris en charge';
  }

  if (statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  if (statusCode >= 500) {
    // Détail complet côté serveur uniquement.
    if (process.env.NODE_ENV !== 'test') console.error(`[${req.id || '-'}]`, err);
    if (!err.isOperational) message = 'Erreur serveur';
  } else if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  if (statusCode === 401 || statusCode === 413) {
    log.info(statusCode === 401 ? 'auth.unauthorized' : 'request.too_large', {
      requestId: req.id, method: req.method, path: req.originalUrl.split('?')[0], status: statusCode, errorCode: code,
    });
  }

  const payload = {
    success: false,
    error: message,
  };

  if (code) {
    payload.code = code;
  }

  if (details) {
    payload.details = details;
  }

  // Plafond atteint ou service indisponible : le client sait quand réessayer.
  if (Number.isFinite(err.retryAfter) && (statusCode === 429 || statusCode === 503)) {
    res.setHeader('Retry-After', String(err.retryAfter));
    payload.retryAfter = err.retryAfter;
  }

  if (req.id) {
    payload.requestId = req.id;
  }

  if (process.env.NODE_ENV === 'development' && err.stack) {
    payload.stack = err.stack;
  }

  return res.status(statusCode).json(payload);
};

module.exports = errorHandler;
