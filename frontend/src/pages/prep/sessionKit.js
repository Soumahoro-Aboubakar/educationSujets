import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RichText } from '../../prep/LessonBlocks';

/* Éléments communs aux sessions (niveau, révisions, concours blanc, test de niveau). */

/**
 * Cadre d'une session : mode concentration. Pas de navigation du site à l'écran, une barre
 * fine (quitter, module, progression segmentée) et la question au centre.
 */
export const SessionFrame = ({ back, title, done, total, items = [], right, children }) => (
  <div className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
    <div className="flex items-center gap-4">
      <Link to={back} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[14px] font-semibold text-ink transition-colors hover:border-ink" aria-label="Quitter la session">
        <ArrowLeft size={15} />
        Quitter
      </Link>
      <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink-soft">{title}</p>
      {right || <p className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">{`${done}/${total}`}</p>}
    </div>
    <div className="mt-4 flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, k) => {
        const it = items[k];
        const tone = !it?.final ? (k < done ? 'bg-ink' : 'bg-line') : it.result?.correct ? 'bg-gold' : it.result?.pending ? 'bg-line-strong' : 'bg-ink';
        return <span key={k} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${tone}`} />;
      })}
    </div>
    <div className="mt-8">{children}</div>
  </div>
);


export const Feedback = ({ tone, title, body, children }) => {
  const tones = { good: 'bg-emerald-50 text-emerald-950', bad: 'bg-burgundy-wash text-burgundy', wait: 'bg-gold-wash text-gold-ink' };
  return (
    <div className={`rounded-2xl p-5 ${tones[tone]}`} role="status">
      <p className="font-semibold">{title}</p>
      {body ? <div className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{typeof body === 'string' ? <RichText md={body} /> : body}</div> : null}
      {children}
    </div>
  );
};

