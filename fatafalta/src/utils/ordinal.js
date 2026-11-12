/** Ordinal français : milliers séparés par une espace fine insécable. */
export const ordinal = (n, { feminine = false } = {}) => {
  const value = Number(n);
  const number = value.toLocaleString('fr-FR').replace(/[\u00a0\u0020]/g, '\u202f');
  return `${number}${value === 1 ? (feminine ? 'ʳᵉ' : 'ᵉʳ') : 'ᵉ'}`;
};

export default ordinal;
