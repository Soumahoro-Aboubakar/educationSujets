import React from 'react';
import { LogoMark } from './Logo';

/** Cadre sobre des pages de connexion et d'inscription. */
const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-12 sm:items-center">
    <div className="w-full max-w-[400px] animate-fade-up">
      <LogoMark className="h-10 w-10" />
      <h1 className="mt-6 text-3xl font-bold tracking-[-0.03em] text-ink">{title}</h1>
      {subtitle ? <p className="mt-2 text-ink-soft">{subtitle}</p> : null}
      <div className="mt-8">{children}</div>
      {footer ? <p className="mt-8 text-center text-sm text-ink-soft">{footer}</p> : null}
    </div>
  </div>
);

export default AuthShell;
