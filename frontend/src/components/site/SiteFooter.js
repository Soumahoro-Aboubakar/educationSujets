import React from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../ui';
import Logo from './Logo';

const SiteFooter = () => (
  <footer className="mt-auto border-t border-line bg-paper">
    <Container className="flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between">
      <div className="max-w-xs">
        <Logo />
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Les anciens sujets de concours, tests et corrigés, réunis au même endroit.
        </p>
      </div>
      <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3" aria-label="Pied de page">
        <Link to="/sujets" className="text-ink-soft hover:text-ink">Sujets</Link>
        <Link to="/recherche" className="text-ink-soft hover:text-ink">Recherche</Link>
        <Link to="/abonnement" className="text-ink-soft hover:text-ink">Abonnement</Link>
        <Link to="/compte" className="text-ink-soft hover:text-ink">Mon compte</Link>
        <Link to="/compte/code-promo" className="text-ink-soft hover:text-ink">Parrainage</Link>
      </nav>
    </Container>
    <Container className="border-t border-line py-5 text-xs text-ink-muted">
      © {new Date().getFullYear()} Fatafalta
    </Container>
  </footer>
);

export default SiteFooter;
