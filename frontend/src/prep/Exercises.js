import React, { useEffect, useId, useMemo } from 'react';
import { ArrowDown, ArrowUp, Check } from 'lucide-react';
import core from './shared/prepCore';

/**
 * Saisie des exercices de préparation en HTML natif (lot 6) : boutons, cases, listes déroulantes
 * et champs, utilisables au clavier et au lecteur d'écran. Même format de réponse que le mobile
 * (validé par prepCore côté serveur). `correction` (clé renvoyée par le serveur après correction)
 * met en évidence les bonnes réponses ; rien n'est révélé avant.
 */
const cx = (...c) => c.filter(Boolean).join(' ');
const optionClass = (selected, state) => cx(
  'flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[16px] leading-snug transition-colors',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  state === 'good' ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
    : state === 'bad' ? 'border-burgundy bg-burgundy-wash text-burgundy'
      : selected ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-ink [@media(hover:hover)]:hover:border-ink/40',
);
const toggle = (list, id, multiple) => (list.includes(id) ? list.filter((x) => x !== id) : multiple ? [...list, id] : [id]);
const selectClass = 'h-11 rounded-xl border border-line-strong bg-white px-3 text-[15px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-70';

const Choices = ({ items, value, onChange, multiple, disabled, good, label }) => {
  const ids = value?.ids || [];
  return (
    <div role={multiple ? 'group' : 'radiogroup'} aria-label={label} className="grid gap-2.5">
      {items.map((o) => {
        const selected = ids.includes(o.id);
        const state = good ? (good.includes(o.id) ? 'good' : selected ? 'bad' : null) : null;
        return (
          <button
            key={o.id}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange({ ids: toggle(ids, o.id, multiple) })}
            className={optionClass(selected, state)}
          >
            <span aria-hidden className={cx('flex h-5 w-5 shrink-0 items-center justify-center border', multiple ? 'rounded-md' : 'rounded-full', selected ? 'border-current' : 'border-line-strong')}>
              {selected ? <Check size={13} strokeWidth={3} /> : null}
            </span>
            <span>{o.texte}</span>
          </button>
        );
      })}
    </div>
  );
};

/** Ordre initial mélangé, déterministe pour la graine (comme le mobile). */
const useInitialOrder = (exercice, value, onChange, seed) => {
  const elements = exercice.contenu?.elements;
  const initial = useMemo(() => core.seededShuffle((elements || []).map((e) => e.id), `${seed}:ordre`), [elements, seed]);
  useEffect(() => { if (!value?.ordre) onChange({ ordre: initial }); }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps
  return value?.ordre || initial;
};

const Ordre = ({ exercice, value, onChange, disabled, correction, seed }) => {
  const c = exercice.contenu || {};
  const order = useInitialOrder(exercice, value, onChange, seed);
  const byId = Object.fromEntries((c.elements || []).map((e) => [e.id, e]));
  const expected = correction?.cle?.ordre;
  const move = (i, d) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange({ ordre: next });
  };
  return (
    <div>
      {c.libelleHaut ? <p className="mb-2 text-sm text-ink-muted">{c.libelleHaut}</p> : null}
      <ol className="grid gap-2.5" aria-label="Éléments à ordonner">
        {order.map((id, i) => {
          const state = expected ? (expected[i] === id ? 'good' : 'bad') : null;
          return (
            <li key={id} className={cx(optionClass(false, state), 'justify-between')}>
              <span className="flex items-center gap-3"><span className="w-5 text-sm font-semibold tabular-nums text-ink-muted">{i + 1}</span>{byId[id]?.texte}</span>
              <span className="flex shrink-0 gap-1">
                <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Monter « ${byId[id]?.texte} »`} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-ink/5 disabled:opacity-30"><ArrowUp size={16} /></button>
                <button type="button" disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Descendre « ${byId[id]?.texte} »`} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-ink/5 disabled:opacity-30"><ArrowDown size={16} /></button>
              </span>
            </li>
          );
        })}
      </ol>
      {c.libelleBas ? <p className="mt-2 text-sm text-ink-muted">{c.libelleBas}</p> : null}
    </div>
  );
};

const Glisser = ({ exercice, value, onChange, disabled, correction }) => {
  const c = exercice.contenu || {};
  const trous = value?.trous || {};
  const used = new Set(Object.values(trous));
  const label = (id) => (c.etiquettes || []).find((e) => e.id === id)?.texte || '';
  return (
    <p className="text-[17px] leading-[2.4] text-ink">
      {(c.segments || []).map((s, i) => {
        if (typeof s === 'string') return <React.Fragment key={`s${i}`}>{s}</React.Fragment>; // eslint-disable-line react/no-array-index-key
        const expected = correction?.cle?.trous?.[s.trou];
        const ok = expected ? expected.includes(trous[s.trou]) : null;
        return (
          <span key={s.trou} className="mx-1 inline-flex flex-col align-middle">
            <select
              aria-label={`Trou ${s.trou}`}
              value={trous[s.trou] || ''}
              disabled={disabled}
              onChange={(e) => onChange({ trous: { ...trous, [s.trou]: e.target.value || undefined } })}
              className={cx(selectClass, ok === true && 'border-emerald-600 bg-emerald-50', ok === false && 'border-burgundy bg-burgundy-wash')}
            >
              <option value="">Choisir…</option>
              {(c.etiquettes || []).map((e) => (
                <option key={e.id} value={e.id} disabled={!c.reutilisable && used.has(e.id) && trous[s.trou] !== e.id}>{e.texte}</option>
              ))}
            </select>
            {ok === false ? <span className="text-xs leading-tight text-emerald-800">{label(expected[0])}</span> : null}
          </span>
        );
      })}
    </p>
  );
};

const Pairs = ({ left, right, value, onChange, disabled, expected, field, prompt }) => {
  const map = value?.[field] || {};
  return (
    <div className="grid gap-3">
      {left.map((g) => {
        const ok = expected ? expected[g.id] === map[g.id] : null;
        const id = `${field}-${g.id}`;
        return (
          <div key={g.id} className={cx('grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_minmax(180px,40%)] sm:items-center', ok === true ? 'border-emerald-600 bg-emerald-50' : ok === false ? 'border-burgundy bg-burgundy-wash' : 'border-line bg-white')}>
            <label htmlFor={id} className="text-[16px] leading-snug text-ink">{g.texte}</label>
            <div>
              <select id={id} value={map[g.id] || ''} disabled={disabled} onChange={(e) => onChange({ [field]: { ...map, [g.id]: e.target.value || undefined } })} className={cx(selectClass, 'w-full')}>
                <option value="">{prompt}</option>
                {right.map((d) => <option key={d.id} value={d.id}>{d.texte || d.nom}</option>)}
              </select>
              {ok === false ? <p className="mt-1 text-xs text-emerald-800">{(right.find((d) => d.id === expected[g.id]) || {}).texte || (right.find((d) => d.id === expected[g.id]) || {}).nom}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const VraiFaux = ({ exercice, value, onChange, disabled, correction }) => {
  const valeurs = value?.valeurs || {};
  const base = useId();
  return (
    <div className="grid gap-3">
      {(exercice.contenu?.affirmations || []).map((a) => {
        const expected = correction?.cle?.valeurs?.[a.id];
        const ok = expected === undefined ? null : expected === valeurs[a.id];
        return (
          <fieldset key={a.id} className={cx('rounded-xl border p-4', ok === true ? 'border-emerald-600 bg-emerald-50' : ok === false ? 'border-burgundy bg-burgundy-wash' : 'border-line bg-white')}>
            <legend className="sr-only">{a.texte}</legend>
            <p className="text-[16px] leading-snug text-ink" aria-hidden>{a.texte}</p>
            <div className="mt-3 flex gap-2">
              {[[true, 'Vrai'], [false, 'Faux']].map(([v, l]) => (
                <label key={l} className={cx('inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-semibold', valeurs[a.id] === v ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-ink', disabled && 'cursor-default')}>
                  <input type="radio" className="sr-only" name={`${base}-${a.id}`} checked={valeurs[a.id] === v} disabled={disabled} onChange={() => onChange({ valeurs: { ...valeurs, [a.id]: v } })} />
                  {l}
                </label>
              ))}
            </div>
            {ok === false ? <p className="mt-2 text-sm text-emerald-800">{`Réponse attendue : ${expected ? 'vrai' : 'faux'}.`}</p> : null}
            {correction && a.explication ? <p className="mt-1 text-sm text-ink-soft">{a.explication}</p> : null}
          </fieldset>
        );
      })}
    </div>
  );
};

const Numerique = ({ exercice, value, onChange, disabled, correction }) => {
  const id = useId();
  const c = exercice.contenu || {};
  return (
    <div>
      {c.enonce ? <p className="mb-3 text-[16px] text-ink-soft">{c.enonce}</p> : null}
      <label htmlFor={id} className="text-sm font-medium text-ink">Ta réponse</label>
      <div className="mt-1.5 flex items-center gap-3">
        <input id={id} inputMode="decimal" autoComplete="off" value={value?.valeur ?? ''} disabled={disabled} onChange={(e) => onChange({ valeur: e.target.value })} className="h-12 w-48 rounded-xl border border-line-strong bg-white px-4 text-lg tabular-nums text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" />
        {c.unite ? <span className="text-ink-soft">{c.unite}</span> : null}
      </div>
      {correction?.cle?.valeur !== undefined ? <p className="mt-2 text-sm text-emerald-800">{`Valeur attendue : ${correction.cle.valeur}${c.unite ? ` ${c.unite}` : ''}`}</p> : null}
    </div>
  );
};

/** Champ de réponse d'un exercice, quel que soit son type. */
export const ExerciseInput = ({ exercice, value, onChange, disabled, correction, seed }) => {
  const c = exercice.contenu || {};
  switch (exercice.type) {
    case 'qcm':
      return (
        <>
          {c.enonce ? <p className="mb-3 text-[16px] text-ink-soft">{c.enonce}</p> : null}
          <Choices items={c.options || []} value={value} onChange={onChange} multiple={Boolean(c.multiple)} disabled={disabled} good={correction?.cle?.ids} label="Choix de réponse" />
        </>
      );
    case 'entourer':
      return (
        <>
          {c.afficherNombre && c.nombreAttendu ? <p className="mb-3 text-sm text-ink-muted">{`${c.nombreAttendu} réponses attendues`}</p> : null}
          <Choices items={c.elements || []} value={value} onChange={onChange} multiple disabled={disabled} good={correction?.cle?.ids} label="Éléments à sélectionner" />
        </>
      );
    case 'surligner': {
      const ids = value?.ids || [];
      const good = correction?.cle?.ids;
      return (
        <p className="text-[17px] leading-[2] text-ink">
          {(c.segments || []).map((s) => {
            const on = ids.includes(s.id);
            const tone = good ? (good.includes(s.id) ? 'bg-emerald-100 ring-1 ring-emerald-600' : on ? 'bg-burgundy-wash line-through' : '') : on ? 'bg-gold-light' : '';
            return (
              <button key={s.id} type="button" aria-pressed={on} disabled={disabled} onClick={() => onChange({ ids: toggle(ids, s.id, true) })} className={cx('rounded px-0.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink', tone, !disabled && '[@media(hover:hover)]:hover:bg-gold-wash')}>
                {s.texte}
              </button>
            );
          })}
        </p>
      );
    }
    case 'vraiFaux':
      return <VraiFaux exercice={exercice} value={value} onChange={onChange} disabled={disabled} correction={correction} />;
    case 'glisser':
      return <Glisser exercice={exercice} value={value} onChange={onChange} disabled={disabled} correction={correction} />;
    case 'ordre':
      return <Ordre exercice={exercice} value={value} onChange={onChange} disabled={disabled} correction={correction} seed={seed} />;
    case 'relier':
      return <Pairs left={c.gauche || []} right={c.droite || []} value={value} onChange={onChange} disabled={disabled} expected={correction?.cle?.paires} field="paires" prompt="Associer à…" />;
    case 'classer':
      return <Pairs left={c.cartes || []} right={c.categories || []} value={value} onChange={onChange} disabled={disabled} expected={correction?.cle?.cartes} field="cartes" prompt="Classer dans…" />;
    case 'numerique':
      return <Numerique exercice={exercice} value={value} onChange={onChange} disabled={disabled} correction={correction} />;
    default:
      return <p className="text-ink-soft">Ce type d’exercice n’est pas encore disponible sur le site.</p>;
  }
};

/** Réponse attendue en une ligne (mini-questions et bilan), à partir de la clé. */
export const ExpectedAnswer = ({ exercice, cle }) => {
  if (!cle) return null;
  const c = exercice.contenu || {};
  const text = (list, id) => (list || []).find((x) => x.id === id)?.texte;
  let answer = null;
  if (cle.ids) answer = cle.ids.map((id) => text(c.options || c.elements || c.segments, id)).filter(Boolean).join(' · ');
  else if (cle.valeur !== undefined) answer = String(cle.valeur);
  if (!answer) return null;
  return <p className="mt-1">{`Réponse attendue : ${answer}`}</p>;
};
