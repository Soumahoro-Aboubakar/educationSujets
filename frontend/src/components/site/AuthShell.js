import React from 'react';
import { BookOpenCheck, FileCheck, Smartphone } from 'lucide-react';
import { LogoMark } from './Logo';

const POINTS = [
  { icon: BookOpenCheck, text: 'Les anciens sujets classés par organisme, année et matière' },
  { icon: FileCheck, text: 'Les corrigés, dès qu’ils sont publiés' },
  { icon: Smartphone, text: 'Le même compte sur le site et l’application' },
];

/**
 * Cadre des pages de connexion et d'inscription : formulaire seul sur mobile (rien à faire
 * défiler avant le premier champ), panneau de marque à côté sur grand écran.
 */
const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-site lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-10 lg:px-8 lg:py-10">
    <div className="flex items-start justify-center px-4 pb-14 pt-8 sm:items-center sm:py-12">
      <div className="w-full max-w-[420px] animate-rise-in sm:rounded-3xl sm:border sm:border-line sm:bg-white sm:p-10 sm:shadow-soft">
        <LogoMark className="h-11 w-11" />
        <h1 className="mt-6 text-title font-bold text-ink">{title}</h1>
        {subtitle ? <p className="mt-2 text-ink-soft">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
        {footer ? <p className="mt-8 border-t border-line pt-6 text-center text-sm text-ink-soft">{footer}</p> : null}
      </div>
    </div>

    <aside className="relative hidden min-h-[560px] overflow-hidden rounded-[28px] bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between lg:self-center" aria-hidden>
      {/* Pages empilées, en filigrane : rappel discret du document archivé du logo. */}
      <div className="absolute -right-16 -top-10 h-72 w-56 rotate-12 rounded-3xl border border-white/10 bg-white/[0.03]" />
      <div className="absolute -right-4 top-10 h-72 w-56 rotate-[4deg] rounded-3xl border border-white/10 bg-white/[0.04]" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.16em] text-gold-light">Fatafalta</p>
      <div className="relative">
        <p className="max-w-xs text-[28px] font-bold leading-tight tracking-[-0.03em]">Préparez vos concours avec les vrais sujets.</p>
        <ul className="mt-8 space-y-4">
          {POINTS.map(({ icon: Icon, text }, index) => (
            <li key={text} className="flex animate-rise-in items-center gap-3.5 text-[15px] text-white/80" style={{ animationDelay: `${200 + index * 90}ms` }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-gold-light"><Icon size={17} /></span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  </div>
);

export default AuthShell;
