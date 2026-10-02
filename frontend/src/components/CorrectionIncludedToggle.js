import React from 'react';

/*
 * Indique que le PDF du sujet contient aussi son corrigé :
 * aucun second fichier n'est alors attendu pour ce sujet.
 */
const CorrectionIncludedToggle = ({ checked, onChange, disabled, className = '' }) => (
  <label className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-slate-800">Corrigé inclus dans le même PDF</span>
      <span className="mt-0.5 block text-xs font-medium text-slate-500">Activez si ce fichier contient le sujet suivi de son corrigé.</span>
    </span>
    <input
      type="checkbox"
      role="switch"
      className="peer sr-only"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300" />
  </label>
);

export default CorrectionIncludedToggle;
