/**
 * Réglages réseau sortants, appliqués une fois au démarrage.
 *
 * Sur un hôte sans IPv6 fonctionnel, Node tente IPv6 puis IPv4 avec seulement 250 ms par
 * tentative : une connexion IPv4 un peu lente (GeniusPay répond en 1 à 4 s) est alors
 * abandonnée et l'appel échoue en ETIMEDOUT. On privilégie IPv4 et on laisse 10 s par tentative.
 */
const dns = require('dns');
const net = require('net');

const applyNetworkDefaults = () => {
  dns.setDefaultResultOrder('ipv4first');
  if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout === 'function') {
    net.setDefaultAutoSelectFamilyAttemptTimeout(10000);
  }
};

module.exports = { applyNetworkDefaults };
