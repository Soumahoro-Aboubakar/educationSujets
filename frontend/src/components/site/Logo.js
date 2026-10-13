import React from 'react';
import { Link } from 'react-router-dom';

/*
 * Symbole officiel Fatafalta, identique à l'application mobile : le « F corné » (lettre F dessinée
 * comme une feuille au coin replié, revers or). Tracés repris de fatafalta/src/theme/brand.js.
 */
export const LogoMark = ({ className = 'h-8 w-8' }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden>
    <rect width="100" height="100" rx="22" fill="#0D1B32" />
    <path d="M34 18H63L75 30V31A3 3 0 0 1 72 34H47V44H62A3 3 0 0 1 65 47V55A3 3 0 0 1 62 58H47V79A3 3 0 0 1 44 82H34A3 3 0 0 1 31 79V21A3 3 0 0 1 34 18Z" fill="#FCFAF5" />
    <path d="M63 18L75 30H65.5A2.5 2.5 0 0 1 63 27.5Z" fill="#E4C997" />
  </svg>
);

const Logo = ({ inverted }) => (
  <Link to="/" className="flex items-center gap-2.5" aria-label="Fatafalta, accueil">
    <LogoMark />
    <span className={`text-[19px] font-bold tracking-[-0.03em] ${inverted ? 'text-white' : 'text-ink'}`}>Fatafalta</span>
  </Link>
);

export default Logo;
