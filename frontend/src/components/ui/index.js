import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RotateCcw, X } from 'lucide-react';

/*
 * Kit d'interface Fatafalta (web). Mêmes intentions que le mobile :
 * une seule action primaire (encre) par vue, contours pour les alternatives,
 * bordeaux réservé aux liens et interactions secondaires, or pour les statuts discrets.
 */

const cx = (...classes) => classes.filter(Boolean).join(' ');

const BUTTON_VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink/90 shadow-soft',
  secondary: 'border border-line-strong text-ink hover:bg-ink/[0.04] bg-white',
  ghost: 'text-ink hover:bg-ink/[0.05]',
  gold: 'bg-gold-light text-ink hover:bg-gold-light/90',
  danger: 'border border-burgundy/30 text-burgundy hover:bg-burgundy-wash',
};

const BUTTON_SIZES = {
  sm: 'h-9 px-3.5 text-sm rounded-lg',
  md: 'h-11 px-5 text-[15px] rounded-xl',
  lg: 'h-[52px] px-6 text-base rounded-xl',
};

export const Button = ({ as, to, variant = 'primary', size = 'md', icon: Icon, loading, disabled, className, children, ...props }) => {
  const classes = cx(
    'inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.01em] transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy/40 focus-visible:ring-offset-2',
    'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
  const content = (
    <>
      {loading ? <Loader2 size={17} className="animate-spin" /> : Icon ? <Icon size={17} strokeWidth={2} /> : null}
      {children}
    </>
  );

  if (to) return <Link to={to} className={classes} {...props}>{content}</Link>;
  const Component = as || 'button';
  return (
    <Component className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </Component>
  );
};

const TONES = {
  positive: 'bg-emerald-50 text-emerald-700 [--dot:theme(colors.emerald.500)]',
  pending: 'bg-gold-wash text-gold-ink [--dot:theme(colors.gold.DEFAULT)]',
  negative: 'bg-rose-50 text-rose-700 [--dot:theme(colors.rose.500)]',
  neutral: 'bg-paper-dim text-ink-soft [--dot:theme(colors.ink.muted)]',
};

// Même table de statuts que l'application mobile (components/ui/StatusPill.js).
export const STATUS_LABELS = {
  ACTIVE: ['Actif', 'positive'],
  INACTIVE: ['Inactif', 'neutral'],
  EXPIRED: ['Expiré', 'negative'],
  PENDING: ['En attente', 'pending'],
  PROCESSING: ['En cours', 'pending'],
  NONE: ['Aucun abonnement', 'neutral'],
  SUCCEEDED: ['Réussi', 'positive'],
  INITIATED: ['Initié', 'pending'],
  FAILED: ['Échoué', 'negative'],
  CANCELLED: ['Annulé', 'neutral'],
  AVAILABLE: ['Disponible', 'positive'],
  REVERSED: ['Annulée', 'negative'],
  PROCESSED: ['Traité', 'positive'],
  DISABLED: ['Désactivé', 'negative'],
  SUSPENDED: ['Suspendu', 'negative'],
};

export const StatusPill = ({ status, label, tone, className }) => {
  const [defaultLabel, defaultTone] = STATUS_LABELS[status] || [status, 'neutral'];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', TONES[tone || defaultTone], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--dot)]" aria-hidden />
      {label || defaultLabel}
    </span>
  );
};

export const Spinner = ({ className }) => <Loader2 className={cx('animate-spin text-ink-muted', className)} size={22} />;

export const SkeletonRows = ({ count = 4 }) => (
  <div className="divide-y divide-line" aria-busy="true" aria-label="Chargement">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center gap-4 py-4">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-paper-dim" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-paper-dim" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-paper-dim" />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, onRetry, action, className }) => (
  <div className={cx('flex flex-col items-center px-6 py-14 text-center', className)}>
    {Icon ? (
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-paper-dim">
        <Icon size={24} strokeWidth={1.6} className="text-ink-soft" />
      </div>
    ) : null}
    <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
    {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p> : null}
    {onRetry ? (
      <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry} className="mt-5 rounded-full">Réessayer</Button>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export const Card = ({ className, children, ...props }) => (
  <div className={cx('rounded-2xl border border-line bg-white', className)} {...props}>{children}</div>
);

export const Field = ({ label, error, hint, className, inputClassName, as: Component = 'input', ...props }) => (
  <label className={cx('block', className)}>
    {label ? <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span> : null}
    <Component
      className={cx(
        'h-12 w-full rounded-xl border bg-white px-4 text-[15px] text-ink placeholder:text-ink-muted transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-burgundy/20',
        error ? 'border-rose-400 focus:border-rose-400' : 'border-line focus:border-ink/40',
        inputClassName,
      )}
      aria-invalid={Boolean(error) || undefined}
      {...props}
    />
    {error ? <span className="mt-1 block text-sm text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-sm text-ink-muted">{hint}</span> : null}
  </label>
);

/**
 * Fenêtre modale : feuille ancrée en bas sur mobile, boîte centrée sur ordinateur.
 * Échap et clic sur le fond ferment ; le défilement de la page est bloqué.
 */
export const Modal = ({ open, onClose, title, children, className, dismissible = true }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && dismissible) onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-[fade-up_200ms_ease-out_both]" onClick={dismissible ? onClose : undefined} />
      <div className={cx('relative w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-paper p-6 pb-8 shadow-lift animate-sheet-up sm:max-w-md sm:rounded-3xl sm:pb-6', className)}>
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line-strong sm:hidden" aria-hidden />
        {dismissible ? (
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 hidden h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5 sm:flex">
            <X size={18} />
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
};

/** Ligne clé/valeur des récapitulatifs (abonnement, retrait, paiement). */
export const InfoRow = ({ label, value, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-0">
    <span className="text-sm text-ink-soft">{label}</span>
    <span className="text-right text-sm font-semibold text-ink">{children || value}</span>
  </div>
);

export const Container = ({ className, children }) => (
  <div className={cx('mx-auto w-full max-w-site px-4 sm:px-6 lg:px-8', className)}>{children}</div>
);

export { cx };
