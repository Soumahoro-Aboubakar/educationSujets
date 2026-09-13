import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2, Plus, Search } from 'lucide-react';

const SelectOrCreate = ({
  label,
  placeholder = 'Rechercher...',
  value,
  onSelect,
  search,
  create,
  getLabel = (item) => item.nom || item.name || item.title,
  canCreate = true,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!open || !search) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await search(query.trim());
        if (!cancelled) setItems(result || []);
      } catch (requestError) {
        if (!cancelled) setError(requestError.response?.data?.error || 'Recherche impossible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, search]);

  const selectedLabel = value ? getLabel(value) : '';
  const exact = items.some((item) => getLabel(item).trim().toLocaleLowerCase() === query.trim().toLocaleLowerCase());
  const options = canCreate && query.trim() && !exact ? [...items, { __create: true, label: query.trim() }] : items;

  const choose = async (item) => {
    if (item.__create) {
      setCreating(true);
      setError('');
      try {
        const created = await create(query.trim());
        await onSelect(created);
        setQuery('');
        setOpen(false);
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'Création impossible.');
      } finally {
        setCreating(false);
      }
      return;
    }
    await onSelect(item);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = async (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      await choose(options[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative z-20">
      <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <button type="button" disabled={disabled} onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left shadow-sm transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">
        <span className={selectedLabel ? 'font-semibold text-slate-800' : 'text-slate-400'}>{selectedLabel || placeholder}</span>
        {open ? <ChevronUp size={18} className="text-indigo-600" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="relative border-b border-slate-100 p-2">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }} onKeyDown={handleKeyDown} placeholder={placeholder} className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {loading && <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Recherche…</div>}
            {!loading && !items.length && !query.trim() && <p className="px-3 py-4 text-center text-sm text-slate-400">Saisissez une recherche.</p>}
            {!loading && !items.length && query.trim() && !canCreate && <p className="px-3 py-4 text-center text-sm text-slate-400">Aucun résultat.</p>}
            {!loading && items.map((item, index) => <button key={item._id} type="button" onClick={() => choose(item)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${activeIndex === index ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}><span>{getLabel(item)}</span>{value?._id === item._id && <Check size={16} className="text-indigo-600" />}</button>)}
            {!loading && canCreate && query.trim() && !exact && <button type="button" disabled={creating} onClick={() => choose({ __create: true })} className={`mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-3 py-2.5 text-left text-sm font-bold text-indigo-700 ${activeIndex === items.length ? 'ring-2 ring-indigo-300' : ''}`}><Plus size={16} /> Créer « {query.trim()} »</button>}
            {error && <p className="px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectOrCreate;
