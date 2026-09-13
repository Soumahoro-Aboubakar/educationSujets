
const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI est manquant dans le fichier .env');
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const isAuthenticationError = error.codeName === 'AuthenticationFailed'
      || /bad auth|authentication failed/i.test(error.message);
    const message = isAuthenticationError
      ? 'Authentification MongoDB refusee. Verifiez l utilisateur, le mot de passe, les droits Atlas et l encodage du mot de passe dans MONGODB_URI.'
      : `Connexion MongoDB impossible: ${error.message}`;
    throw new Error(message, { cause: error });
  }
};

module.exports = connectDB;
