const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || res.statusCode || 500;
  let message = err.message || 'Erreur serveur';
  let details = err.details;

  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Ressource introuvable avec l'id ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Une ressource avec cette valeur existe deja';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation des donnees echouee';
    details = Object.values(err.errors).map((validationError) => ({
      field: validationError.path,
      message: validationError.message,
    }));
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session invalide ou expiree';
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'Le fichier depasse la taille maximale autorisee';
  }

  if (statusCode < 400) {
    statusCode = 500;
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  const payload = {
    success: false,
    error: message,
  };

  if (details) {
    payload.details = details;
  }

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
