/** Champs de recherche simples : regex préfixées sensibles à la casse sur des valeurs déjà normalisées. */
const normalizePseudonym = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pseudonymFields = (pseudonyme) => {
  const pseudonymeNormalise = normalizePseudonym(pseudonyme);
  return { pseudonymeNormalise, pseudonymeNumero: (pseudonymeNormalise.match(/\d+$/) || [''])[0] };
};
module.exports = { normalizePseudonym, escapeRegex, pseudonymFields };
