import React, { useState } from 'react';
import { Check, Lightbulb, TriangleAlert, X } from 'lucide-react';
import core from './shared/prepCore';
import { ExerciseInput, ExpectedAnswer } from './Exercises';
import { Button } from '../components/ui';

/** Gras minimal : **texte** → semi-gras souligné d'un trait or (même règle que le mobile). */
export const RichText = ({ md, className }) => {
  const parts = String(md ?? '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**')
        // eslint-disable-next-line react/no-array-index-key
        ? <strong key={i} className="font-semibold text-ink decoration-gold/60 decoration-2 underline-offset-4 [text-decoration-line:underline]">{p.slice(2, -2)}</strong>
        // eslint-disable-next-line react/no-array-index-key
        : <React.Fragment key={i}>{p}</React.Fragment>))}
    </span>
  );
};

/** Mini-question « Teste-toi » : non notée, corrigée tout de suite, sans seconde chance. */
const MiniQuestion = ({ exercice, seed }) => {
  const [value, setValue] = useState(null);
  const [result, setResult] = useState(null);
  const complete = core.isComplete(exercice, value);
  return (
    <section className="rounded-2xl border border-line bg-paper-dim/60 p-5 sm:p-6" aria-label="Teste-toi">
      <p className="text-sm font-semibold text-gold-ink">Teste-toi</p>
      <p className="mt-1.5 text-[17px] font-semibold leading-snug text-ink">{exercice.consigne}</p>
      <div className="mt-4">
        <ExerciseInput exercice={exercice} value={value} onChange={setValue} disabled={Boolean(result)} correction={result ? { cle: exercice.cle } : null} seed={seed} />
      </div>
      {result ? (
        <div className={`mt-4 flex gap-3 rounded-xl p-4 ${result.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-burgundy-wash text-burgundy'}`} role="status">
          {result.correct ? <Check size={18} className="mt-0.5 shrink-0" /> : <X size={18} className="mt-0.5 shrink-0" />}
          <div className="text-[15px] leading-relaxed">
            <p className="font-semibold">{result.correct ? 'Bien vu' : 'Pas tout à fait'}</p>
            {!result.correct ? <ExpectedAnswer exercice={exercice} cle={exercice.cle} /> : null}
            {exercice.explication ? <p className="mt-1 text-ink-soft">{exercice.explication}</p> : null}
          </div>
        </div>
      ) : (
        <Button className="mt-4" size="sm" disabled={!complete} onClick={() => setResult(core.validate(exercice, value))}>Vérifier</Button>
      )}
    </section>
  );
};

const Aside = ({ icon: Icon, title, children, tone }) => {
  const tones = {
    exemple: 'border-line bg-white',
    piege: 'border-burgundy/20 bg-burgundy-wash/60',
    aRetenir: 'border-gold/30 bg-gold-wash',
  };
  return (
    <aside className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">{Icon ? <Icon size={16} className={tone === 'piege' ? 'text-burgundy' : 'text-gold-ink'} /> : null}{title}</p>
      <div className="mt-2 text-[16px] leading-relaxed text-ink-soft">{children}</div>
    </aside>
  );
};

export const LessonBlock = ({ bloc, index }) => {
  switch (bloc.type) {
    case 'texte':
      return <p className="text-[17px] leading-[1.7] text-ink"><RichText md={bloc.md} /></p>;
    case 'exemple':
      return <Aside tone="exemple" title={bloc.titre || 'Exemple'}><RichText md={bloc.texte} /></Aside>;
    case 'piege':
      return <Aside tone="piege" icon={TriangleAlert} title={bloc.titre || 'Piège à éviter'}><RichText md={bloc.texte} /></Aside>;
    case 'aRetenir':
      return <Aside tone="aRetenir" icon={Lightbulb} title={bloc.titre || 'À retenir'}><RichText md={bloc.texte} /></Aside>;
    case 'formule':
      return (
        <figure className="rounded-2xl bg-ink px-5 py-4 text-white">
          <p className="text-center text-lg font-semibold tabular-nums tracking-[-0.01em]">{bloc.texte}</p>
          {bloc.legende ? <figcaption className="mt-2 text-center text-sm text-white/70">{bloc.legende}</figcaption> : null}
        </figure>
      );
    case 'tableau':
      return (
        <figure className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[420px] border-collapse text-left text-[15px]">
            <thead className="bg-paper-dim text-ink">
              <tr>{(bloc.entetes || []).map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {(bloc.lignes || []).map((row, r) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={r} className="border-t border-line">
                  {/* eslint-disable-next-line react/no-array-index-key */}
                  {row.map((cell, c) => <td key={c} className={`px-4 py-2.5 align-top ${c === 0 ? 'font-medium text-ink' : 'text-ink-soft'}`}><RichText md={cell} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {bloc.legende ? <figcaption className="border-t border-line px-4 py-2 text-sm text-ink-muted">{bloc.legende}</figcaption> : null}
        </figure>
      );
    case 'liste': {
      const Tag = bloc.ordonnee ? 'ol' : 'ul';
      return (
        <Tag className={`space-y-2 pl-6 text-[17px] leading-relaxed text-ink ${bloc.ordonnee ? 'list-decimal' : 'list-disc marker:text-gold'}`}>
          {/* eslint-disable-next-line react/no-array-index-key */}
          {(bloc.items || []).map((item, i) => <li key={i}><RichText md={item} /></li>)}
        </Tag>
      );
    }
    case 'recap':
      return (
        <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-label="Récapitulatif">
          <p className="text-base font-bold text-ink">L’essentiel</p>
          <ul className="mt-3 space-y-2.5">
            {(bloc.items || []).map((item, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={i} className="flex gap-3 text-[16px] leading-relaxed text-ink-soft"><Check size={16} className="mt-1 shrink-0 text-gold-ink" /><RichText md={item} /></li>
            ))}
          </ul>
        </section>
      );
    case 'miniQuestion':
      return bloc.exercice ? <MiniQuestion exercice={bloc.exercice} seed={`mini:${index}`} /> : null;
    default:
      return null;
  }
};
