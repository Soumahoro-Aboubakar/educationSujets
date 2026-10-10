import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, Eye, EyeOff, Loader2, RotateCcw, X } from 'lucide-react';

/*
 * Kit d'interface Fatafalta (web). Mêmes intentions que le mobile :
 * une seule action primaire (encre) par vue, contours pour les alternatives,
 * bordeaux réservé aux liens et interactions secondaires, or pour les statuts discrets.
 * Mouvement : transform et opacity uniquement, courbe « emphasized », réduit si l'utilisateur
 * le demande (index.css).
 */

const cx = (...classes) => classes.filter(Boolean).join(' ');

// Survol réservé aux appareils qui en ont un : sur écran tactile, aucun état « collé » après un appui.
const BUTTON_VARIANTS = {
  primary: 'bg-ink text-white shadow-soft [@media(hover:hover)]:hover:bg-[#16284A] [@media(hover:hover)]:hover:shadow-lift [@media(hover:hover)]:hover:-translate-y-px',
  secondary: 'border border-line-strong bg-white text-ink [@media(hover:hover)]:hover:border-ink/30 [@media(hover:hover)]:hover:bg-paper',
  ghost: 'text-ink [@media(hover:hover)]:hover:bg-ink/[0.05]',
  gold: 'bg-gold-light text-ink [@media(hover:hover)]:hover:bg-[#EBD5AC] [@media(hover:hover)]:hover:-translate-y-px',
  danger: 'border border-burgundy/30 text-burgundy [@media(hover:hover)]:hover:bg-burgundy-wash',
};

const BUTTON_SIZES = {
  sm: 'h-10 px-4 text-sm rounded-xl',
  md: 'h-11 px-5 text-[15px] rounded-xl',
  lg: 'h-[52px] px-6 text-base rounded-2xl',
};

export const Button = ({ as, to, variant = 'primary', size = 'md', icon: Icon, iconPosition = 'start', loading, disabled, className, children, ...props }) => {
  const classes = cx(
    'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.01em]',
    'transition-[transform,background-color,border-color,box-shadow,color,opacity] duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
    'active:translate-y-0 active:scale-[0.97] active:duration-75',
    'disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none',
    iconPosition === 'end' && 'flex-row-reverse',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
  const iconNode = loading
    ? <Loader2 size={17} className="animate-spin" aria-hidden />
    : Icon ? <Icon size={17} strokeWidth={2} aria-hidden className={iconPosition === 'end' ? 'transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5' : undefined} /> : null;
  const content = <>{iconNode}{children}</>;

  if (to) return <Link to={to} className={cx('group/btn', classes)} {...props}>{content}</Link>;
  const Component = as || 'button';
  return (
    <Component className={cx('group/btn', classes)} disabled={Component === 'button' ? disabled || loading : undefined} aria-busy={loading || undefined} {...props}>
      {content}
    </Component>
  );
};

/** Petit libellé au-dessus d'un titre (« Concours · Examens »). */
export const Eyebrow = ({ className, children, tone = 'gold' }) => (
  <p className={cx('text-xs font-semibold uppercase tracking-[0.16em]', tone === 'gold' ? 'text-gold-ink' : 'text-ink-muted', className)}>{children}</p>
);

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

export const Spinner = ({ className, label = 'Chargement' }) => (
  <span role="status" className="inline-flex">
    <Loader2 className={cx('animate-spin text-ink-muted', className)} size={22} aria-hidden />
    <span className="sr-only">{label}</span>
  </span>
);

export const Skeleton = ({ className, ...props }) => <div className={cx('skeleton rounded-lg', className)} aria-hidden {...props} />;

export const SkeletonRows = ({ count = 4, className }) => (
  <div className={cx('divide-y divide-line', className)} aria-busy="true" aria-label="Chargement" role="status">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center gap-4 py-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 rounded" style={{ width: `${70 - (index % 3) * 12}%` }} />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, onRetry, action, className }) => (
  <div className={cx('flex animate-fade-up flex-col items-center px-6 py-14 text-center', className)}>
    {Icon ? (
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-dim ring-8 ring-paper-dim/40">
        <Icon size={26} strokeWidth={1.6} className="text-ink-soft" aria-hidden />
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

/** Message d'erreur placé sous un formulaire ou une action, annoncé aux lecteurs d'écran. */
export const ErrorNote = ({ children, className }) => (children ? (
  <p className={cx('flex animate-fade-up items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700', className)} role="alert">
    <AlertCircle size={17} className="mt-px shrink-0" aria-hidden />
    <span>{children}</span>
  </p>
) : null);

/**
 * Champ de formulaire : libellé, aide et erreur reliés au champ (lecteurs d'écran).
 * `trailing` : bouton placé dans le champ, à droite (ex. afficher le mot de passe).
 */
export const Field = ({ label, error, hint, className, inputClassName, trailing, as: Component = 'input', id: idProp, ...props }) => {
  const autoId = useId();
  const id = idProp || autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx('block', className)}>
      {label ? <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label> : null}
      <div className="relative">
        <Component
          id={id}
          className={cx(
            'h-12 w-full rounded-xl border bg-white px-4 text-base text-ink placeholder:text-ink-muted sm:text-[15px]',
            'transition-[border-color,box-shadow] duration-200 ease-out',
            'focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-paper-dim disabled:text-ink-soft',
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-line hover:border-line-strong focus:border-ink/50 focus:ring-ink/[0.06]',
            trailing && 'pr-12',
            inputClassName,
          )}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {trailing ? <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div> : null}
      </div>
      {error ? (
        <span id={`${id}-error`} className="mt-1.5 flex animate-fade-up items-center gap-1.5 text-sm text-rose-600" aria-live="polite">
          <AlertCircle size={14} aria-hidden /> {error}
        </span>
      ) : hint ? <span id={`${id}-hint`} className="mt-1.5 block text-sm text-ink-muted">{hint}</span> : null}
    </div>
  );
};

/** Mot de passe avec bouton « afficher / masquer », intégré au champ. */
export const PasswordField = (props) => {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={(
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          className="flex h-12 w-12 items-center justify-center rounded-r-xl text-ink-muted transition-colors hover:text-ink"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    />
  );
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Fenêtre modale : feuille ancrée en bas sur mobile, boîte centrée sur ordinateur.
 * Échap et clic sur le fond ferment ; le défilement de la page est bloqué ; le focus est placé
 * dans la fenêtre, y reste (Tab), puis revient sur l'élément d'origine à la fermeture.
 */
export const Modal = ({ open, onClose, title, children, className, dismissible = true }) => {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
      const timer = setTimeout(() => {
        setRendered(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestClose = useCallback(() => {
    if (dismissible) onClose?.();
  }, [dismissible, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector(FOCUSABLE);
      (first || panel)?.focus({ preventScroll: true });
    }, 30);
    const onKey = (event) => {
      if (event.key === 'Escape') requestClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    };
  }, [open, requestClose]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <span id={titleId} className="sr-only">{title}</span>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer"
        className={cx('absolute inset-0 bg-ink/45 backdrop-blur-[3px]', closing ? 'animate-fade-out' : 'animate-fade-in')}
        onClick={requestClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cx(
          'relative w-full max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[28px] bg-paper p-6 pb-safe shadow-lift focus:outline-none sm:max-w-md sm:rounded-3xl sm:pb-6',
          closing ? 'animate-sheet-down' : 'animate-sheet-up',
          className,
        )}
      >
        <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        {dismissible ? (
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink">
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
    <span className="shrink-0 text-sm text-ink-soft">{label}</span>
    <span className="min-w-0 text-right text-sm font-semibold text-ink">{children || value}</span>
  </div>
);

/**
 * Fil d'Ariane : une seule ligne défilante sur mobile (calée sur la position actuelle),
 * retour à la ligne sur ordinateur. `crumbs` : [{ label, to, leading }] ; le dernier est la page.
 */
export const Breadcrumbs = ({ crumbs, currentIsLink = false }) => {
  const ref = useRef(null);
  useEffect(() => {
    const list = ref.current;
    if (list) list.scrollLeft = list.scrollWidth;
  }, [crumbs.length]);
  return (
    <nav aria-label="Fil d’Ariane" className="-mx-4 sm:mx-0">
      <ol ref={ref} className="fade-x scrollbar-none flex items-center gap-1 overflow-x-auto whitespace-nowrap px-4 text-sm sm:flex-wrap sm:overflow-visible sm:whitespace-normal sm:px-0 sm:[mask-image:none]">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex shrink-0 items-center gap-1">
              {index > 0 ? <ChevronRight size={14} className="shrink-0 text-ink-muted/70" aria-hidden /> : null}
              {last && !currentIsLink ? (
                <span className="inline-flex items-center gap-1.5 py-2 font-medium text-ink" aria-current="page">{crumb.leading}{crumb.label}</span>
              ) : (
                <Link to={crumb.to} className="inline-flex items-center gap-1.5 rounded-md py-2 text-ink-soft transition-colors hover:text-burgundy">
                  {crumb.leading}{crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const Container = ({ className, children }) => (
  <div className={cx('mx-auto w-full max-w-site px-4 sm:px-6 lg:px-8', className)}>{children}</div>
);

export { cx };
