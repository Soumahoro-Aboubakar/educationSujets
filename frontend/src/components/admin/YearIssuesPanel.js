import React from 'react';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAsync from '../../hooks/useAsync';
import { downloads, errorMessage } from '../../lib/api';

/*
 * Sujets publiés dont l'année est indéterminable. Par prudence, ils ne sont jamais gratuits
 * (traités comme récents). Correction : rattacher le sujet à une année dans « Documents
 * existants », ou renommer le niveau d'année du catalogue (« 2021 »).
 */
const YearIssuesPanel = () => {
  const issues = useAsync(() => downloads.yearIssues(), []);
  const data = issues.data;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Gratuité des anciens sujets</p>
          <h2 className="mt-1 text-2xl font-black text-slate-800">Années à vérifier</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {`Les sujets de ${data?.freeUntilYear || 2010} et avant sont gratuits. Sans année lisible, un sujet n’est jamais gratuit : rattachez-le à une année (onglet « Documents existants ») ou corrigez le nom du niveau d’année.`}
          </p>
        </div>
        <button type="button" onClick={issues.reload} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      {issues.loading && !data ? <p className="py-10 text-center text-sm text-slate-500">Chargement…</p> : null}
      {issues.error ? <p role="alert" className="mt-4 text-sm font-semibold text-rose-600">{errorMessage(issues.error, 'Liste indisponible.')}</p> : null}
      {data && !data.total ? <p className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Tous les sujets publiés ont une année lisible.</p> : null}
      {data?.total ? (
        <>
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-amber-700"><AlertTriangle size={16} /> {`${data.total} sujet${data.total > 1 ? 's' : ''} sans année lisible`}</p>
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {data.data.map((item) => (
              <li key={item._id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-800">{item.title}</p>
                  <p className="truncate text-slate-500">{[item.organisme?.nom, item.parcoursType?.nom, ...(item.path || []), item.matiere?.nom].filter(Boolean).join(' › ') || item.reason}</p>
                  <p className="text-xs text-amber-700">{item.reason}</p>
                </div>
                <Link to={`/sujets/document/${item._id}`} target="_blank" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-600"><ExternalLink size={14} /> Fiche</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
};

export default YearIssuesPanel;
