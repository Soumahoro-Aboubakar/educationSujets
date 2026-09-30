import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';

/*
 * Petits éléments communs aux onglets d'administration (utilisateurs, paiements, parrainage).
 * Style aligné sur le tableau de bord existant (slate / indigo) pour rester cohérent.
 */

export const adminApi = {
  get: (url, params) => axios.get(`/api/admin${url}`, { params }).then((response) => response.data),
  post: (url, body) => axios.post(`/api/admin${url}`, body).then((response) => response.data.data),
  patch: (url, body) => axios.patch(`/api/admin${url}`, body).then((response) => response.data.data),
};

export const apiError = (error) => error?.response?.data?.error || 'Une erreur est survenue.';

/** Liste paginée avec filtres ; recharge quand les filtres changent (recherche débouncée). */
export const useAdminList = (url, filters) => {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ data: [], pagination: null, loading: true, error: null });
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(filters);

  useEffect(() => {
    setPage(1);
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const response = await adminApi.get(url, { ...filters, page, limit: 20 });
        if (!cancelled) setState({ data: response.data, pagination: response.meta?.pagination || response.pagination, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setState((current) => ({ ...current, loading: false, error: apiError(error) }));
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [url, key, page, version]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, page, setPage, reload: () => setVersion((value) => value + 1) };
};

export const Panel = ({ title, description, action, children }) => (
  <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-800">{title}</h2>
        {description ? <p className="mt-1 text-sm font-medium text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
    {children}
  </div>
);

export const Box = ({ className = '', children }) => (
  <div className={`rounded-3xl border border-slate-100 bg-white shadow-sm ${className}`}>{children}</div>
);

export const SearchBox = ({ value, onChange, placeholder }) => (
  <div className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
    <Search size={16} className="text-slate-400" />
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-full flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none" />
  </div>
);

export const Select = ({ value, onChange, options, label }) => (
  <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-indigo-300 focus:outline-none">
    {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
  </select>
);

export const AdminButton = ({ variant = 'primary', loading, className = '', children, ...props }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/20',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  return (
    <button type="button" disabled={loading || props.disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : null}
      {children}
    </button>
  );
};

export const Pager = ({ pagination, page, setPage }) => {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <span>{`${pagination.total} résultat${pagination.total > 1 ? 's' : ''}`}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Page précédente" disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="font-semibold text-slate-700">{`${page} / ${pagination.pages}`}</span>
        <button type="button" aria-label="Page suivante" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
};

export const TableState = ({ loading, error, empty, colSpan }) => {
  if (!loading && !error && !empty) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-slate-400">
        {loading ? <Loader2 size={20} className="mx-auto animate-spin" /> : error || 'Aucun résultat.'}
      </td>
    </tr>
  );
};

export const Th = ({ children, className = '' }) => <th className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 ${className}`}>{children}</th>;
export const Td = ({ children, className = '' }) => <td className={`px-5 py-3.5 text-sm text-slate-700 ${className}`}>{children}</td>;
