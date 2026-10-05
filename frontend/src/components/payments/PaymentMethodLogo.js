import React from 'react';

// Logos fournis avec le site. Un logo saisi dans l'administration (logoUrl) reste prioritaire.
const BUNDLED_LOGOS = {
  wave: '/payment-logos/wave.png',
};

const SIZES = { sm: 'h-5 w-5 rounded', md: 'h-6 w-6 rounded-md', lg: 'h-9 w-9 rounded-lg' };

/** Logo d'un moyen de paiement, ou son initiale s'il n'en a pas. */
const PaymentMethodLogo = ({ method, size = 'md', inverted = false }) => {
  const code = method?.code || method?.method || method?.id;
  const src = method?.logoUrl || BUNDLED_LOGOS[code];
  const label = method?.label || method?.methodLabel || '';
  const box = SIZES[size] || SIZES.md;

  if (src) {
    return <img src={src} alt="" className={`${box} shrink-0 bg-white object-contain`} />;
  }
  return (
    <span className={`${box} flex shrink-0 items-center justify-center text-xs font-bold ${inverted ? 'bg-white/15 text-white' : 'bg-paper-dim text-ink'}`} aria-hidden>
      {label.charAt(0)}
    </span>
  );
};

export default PaymentMethodLogo;
