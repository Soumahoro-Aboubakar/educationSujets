import React, { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { cx } from '../ui';

/*
 * Saisie d'un code à 6 chiffres reçu par e-mail, et bouton « Renvoyer le code ».
 * Le renvoi attend 60 s entre deux demandes et affiche les envois restants du jour (3 au plus).
 */
export const CodeField = ({ value, onChange, autoFocus = true, error }) => (
  <label className="block">
    <span className="text-sm font-semibold text-ink">Code reçu par e-mail</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      autoFocus={autoFocus}
      placeholder="••••••"
      aria-invalid={Boolean(error) || undefined}
      className={cx(
        'mt-1.5 h-14 w-full rounded-xl border bg-white px-4 text-center text-[26px] font-bold tracking-[0.5em] text-ink tabular-nums placeholder:text-line-strong',
        'focus:outline-none focus:ring-2 focus:ring-ink/15',
        error ? 'border-burgundy' : 'border-line focus:border-ink/40',
      )}
    />
  </label>
);

const COOLDOWN = 60;

export const ResendCode = ({ onResend, remaining, startCooldown = true }) => {
  const [seconds, setSeconds] = useState(startCooldown ? COOLDOWN : 0);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  const exhausted = remaining === 0;
  const resend = async () => {
    setSending(true);
    try {
      const ok = await onResend();
      if (ok !== false) setSeconds(COOLDOWN);
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
      <button
        type="button"
        onClick={resend}
        disabled={exhausted || seconds > 0 || sending}
        className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold text-burgundy transition-opacity hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
      >
        <RotateCw size={15} className={sending ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden />
        {seconds > 0 ? `Renvoyer le code (${seconds} s)` : 'Renvoyer le code'}
      </button>
      {typeof remaining === 'number' ? (
        <span className="text-ink-muted" aria-live="polite">
          {exhausted ? 'Limite atteinte aujourd’hui : réessayez demain.' : `${remaining} envoi${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''} aujourd’hui`}
        </span>
      ) : null}
    </div>
  );
};
