import React from 'react';
import { Check, FileText, Lock, Search } from 'lucide-react';

/*
 * Visuel du hero : une composition en HTML/CSS (nette à toutes les tailles, sans image lourde)
 * qui montre le produit lui-même — un sujet, son corrigé, et l'accès protégé.
 */

const Paper = ({ className, children }) => (
  <div className={`absolute rounded-2xl border border-line bg-white shadow-lift ${className}`}>{children}</div>
);

const Line = ({ w, strong }) => <div className={`h-2 rounded-full ${strong ? 'bg-ink/80' : 'bg-paper-dim'}`} style={{ width: w }} />;

const HeroVisual = () => (
  <div className="relative mx-auto aspect-[5/4] w-full max-w-[520px] select-none" aria-hidden>
    {/* Halo discret */}
    <div className="absolute inset-[8%] rounded-[40%] bg-gradient-to-br from-gold-wash via-paper-dim to-burgundy-wash blur-2xl" />

    {/* Sujet de fond, incliné */}
    <Paper className="left-[6%] top-[14%] w-[52%] -rotate-6 p-5 opacity-90">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-paper-dim" />
        <Line w="45%" />
      </div>
      <div className="space-y-2.5">
        <Line w="90%" />
        <Line w="75%" />
        <Line w="82%" />
        <Line w="60%" />
      </div>
    </Paper>

    {/* Sujet principal */}
    <Paper className="left-[24%] top-[8%] w-[58%] p-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-ink">Concours · Session 2024</span>
        <FileText size={16} className="text-ink-muted" />
      </div>
      <p className="mt-3 text-[15px] font-bold leading-snug tracking-tight text-ink">Culture générale</p>
      <p className="text-xs text-ink-soft">Épreuve écrite · 3 heures</p>
      <div className="mt-5 space-y-2.5">
        <Line w="100%" strong />
        <Line w="88%" />
        <Line w="94%" />
        <Line w="70%" />
        <Line w="84%" />
      </div>
      <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gold-wash px-2.5 py-1 text-[11px] font-semibold text-gold-ink">
        <Check size={12} strokeWidth={3} /> Corrigé disponible
      </div>
    </Paper>

    {/* Carte d'accès protégé */}
    <Paper className="bottom-[10%] right-[2%] w-[48%] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-wash">
          <Lock size={17} className="text-ink" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">Réservé aux membres</p>
          <p className="truncate text-[11px] text-ink-soft">Accès inclus dans l’abonnement</p>
        </div>
      </div>
    </Paper>

    {/* Recherche */}
    <Paper className="bottom-[26%] left-0 flex w-[46%] items-center gap-2 rounded-full px-4 py-3">
      <Search size={15} className="text-ink-muted" />
      <span className="truncate text-[12px] text-ink-soft">Mathématiques 2023…</span>
    </Paper>
  </div>
);

export default HeroVisual;
