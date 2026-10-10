import React from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../ui';
import Logo from './Logo';

const GROUPS = [
  { title: 'Explorer', links: [['/sujets', 'Sujets'], ['/recherche', 'Recherche'], ['/abonnement', 'Abonnement']] },
  { title: 'Mon compte', links: [['/compte', 'Tableau de bord'], ['/compte/telechargements', 'Téléchargements'], ['/compte/code-promo', 'Parrainage']] },
];

const SiteFooter = () => (
  <footer className="mt-auto border-t border-line bg-paper-dim/50">
    <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:py-14">
      <div className="col-span-2 max-w-xs md:col-span-1">
        <Logo />
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Les anciens sujets de concours, tests et corrigés, réunis au même endroit.
        </p>
      </div>
      {GROUPS.map(({ title, links }) => (
        <nav key={title} aria-label={title}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{title}</p>
          <ul className="mt-3">
            {links.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="inline-block py-1.5 text-[15px] text-ink-soft transition-colors hover:text-ink">{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </Container>
    <Container className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-5 pb-safe text-xs text-ink-muted">
      <span>© {new Date().getFullYear()} Fatafalta</span>
      <span>Côte d’Ivoire</span>
    </Container>
  </footer>
);

export default SiteFooter;
