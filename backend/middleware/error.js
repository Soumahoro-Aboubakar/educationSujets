
const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  console.log(err.stack);

  if (err.name === 'CastError') {
    const message = `Ressource non trouvée avec l'id ${err.value}`;
    error = new Error(message);
    res.statusCode = 404;
  }

  if (err.code === 11000) {
    const message = 'Valeur dupliquée entrée';
    error = new Error(message);
    res.statusCode = 400;
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new Error(message);
    res.statusCode = 400;
  }

  res.status(res.statusCode || 500).json({
    success: false,
    error: error.message || 'Erreur serveur',
  });
};

module.exports = errorHandler;
