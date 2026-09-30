import React from 'react';
import { Link } from 'react-router-dom';

/** Monogramme : une page cornée et un filet or — le document, soigneusement archivé. */
export const LogoMark = ({ className = 'h-8 w-8' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden>
    <rect width="32" height="32" rx="9" fill="#0D1B32" />
    <path d="M10 8.5h8.5L23 13v10.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" fill="#FCFAF5" />
    <path d="M18.5 8.5V13H23" fill="#E4C997" />
    <path d="M12 17h8M12 20.5h5" stroke="#0D1B32" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const Logo = ({ inverted }) => (
  <Link to="/" className="flex items-center gap-2.5" aria-label="Fatafalta, accueil">
    <LogoMark />
    <span className={`text-[19px] font-bold tracking-[-0.03em] ${inverted ? 'text-white' : 'text-ink'}`}>Fatafalta</span>
  </Link>
);

export default Logo;
