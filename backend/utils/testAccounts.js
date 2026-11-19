const { isProduction } = require('../config/environment');

/*
 * Comptes de test : utilisables en développement et dans les tests, jamais en production.
 * Reconnus par le marqueur `isTestAccount` ou par une adresse sur un domaine réservé aux tests
 * (RFC 2606 / 6761 : example.com/.net/.org, .test, .invalid, .localhost, .example), qui ne peut
 * appartenir à aucun vrai utilisateur.
 */
const RESERVED = /@([a-z0-9-]+\.)*(example\.(com|net|org)|[a-z0-9-]+\.(test|invalid|localhost|example))$/i;

const isReservedEmail = (email = '') => RESERVED.test(String(email).trim());
const isTestAccount = (user) => Boolean(user && (user.isTestAccount || isReservedEmail(user.email)));

/** Vrai si ce compte doit être refusé dans l'environnement courant. */
const blockedHere = (user) => isProduction() && isTestAccount(user);

module.exports = { isReservedEmail, isTestAccount, blockedHere };
