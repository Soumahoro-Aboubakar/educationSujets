// À poser avant tout contrôle susceptible de renvoyer un quota ou un jeton dans une erreur.
module.exports = (_req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
};
