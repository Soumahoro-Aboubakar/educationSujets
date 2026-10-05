const normalizeText = require('./normalizeText');

/**
 * Alias d'URL lisible : minuscules, sans accents ; chaque mot garde uniquement lettres et
 * chiffres, les mots sont reliés par des tirets.
 *   « INP-HB » → « inphb » · « Exploitation en Aéronautique Civile » → « exploitation-en-aeronautique-civile »
 * La même règle est appliquée par le site web (frontend/src/lib/slug.js) : les deux doivent rester identiques.
 */
const slugify = (value = '') => normalizeText(value)
  .split(' ')
  .map((word) => word.replace(/[^a-z0-9]/g, ''))
  .filter(Boolean)
  .join('-');

/** Forme compacte, pour reconnaître « inp-hb » et « inphb » comme le même alias. */
const compactSlug = (value = '') => slugify(value).replace(/-/g, '');

module.exports = { slugify, compactSlug };
