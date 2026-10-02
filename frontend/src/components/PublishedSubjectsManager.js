import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, Eye, ExternalLink,
  FileText, Loader2, Pencil, RefreshCw, RotateCcw, Save, Trash2, X,
} from 'lucide-react';
import DynamicMetadataFields from './DynamicMetadataFields';
import CorrectionIncludedToggle from './CorrectionIncludedToggle';
import { AdminButton, Box, Panel, SearchBox, Select, Td, Th } from './admin/adminKit';
import useDebounce from '../hooks/useDebounce';
import { errorMessage } from '../lib/api';
import { correctionOf, documentTitle, formatDate, formatFileSize, hasIncludedCorrection, labelOf, nodeChain } from '../lib/format';

/*
 * Gestion des sujets publiés : recherche, filtres, pagination côté serveur,
 * édition des métadonnées et mise à la corbeille.
 */

const EMPTY_FILTERS = { search: '', organismeId: '', dateFrom: '', dateTo: '', sort: 'recent' };

const SORT_OPTIONS = [
  ['recent', 'Plus récents'],
  ['oldest', 'Plus anciens'],
  ['title', 'Titre (A → Z)'],
  ['views', 'Plus consultés'],
  ['downloads', 'Plus téléchargés'],
];

const PAGE_SIZES = [10, 20, 50];

const LEGACY_FIELDS = [
  ['university', 'Université', 'universities'],
  ['department', 'Département', 'departments'],
  ['level', 'Niveau', 'levels'],
  ['semester', 'Session', 'semesters'],
  ['category', 'Catégorie', 'categories'],
  ['contestType', 'Type de concours', 'contestTypes'],
];

const idOf = (value) => value?._id || value || '';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

// Les bornes couvrent la journée entière dans le fuseau de l'administrateur.
const dayBound = (day, end) => new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString();

const classificationOf = (document) => {
  const chain = nodeChain(document.noeudId).map(labelOf);
  if (chain.length) return { path: chain.join(' › '), subject: labelOf(document.matiereId) };
  const legacy = [document.university, document.department, document.level, document.semester].map(labelOf).filter(Boolean);
  return { path: legacy.join(' › '), subject: labelOf(document.category) };
};

const pageWindow = (page, pages) => {
  const wanted = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...wanted].filter((value) => value >= 1 && value <= pages).sort((a, b) => a - b);
  return list.flatMap((value, index) => (index && value - list[index - 1] > 1 ? ['…', value] : [value]));
};

const Dialog = ({ title, subtitle, onClose, busy, wide, children }) => {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, busy]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fermer" className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-[2px]" onClick={busy ? undefined : onClose} />
      <div className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-black tracking-tight text-slate-800">{title}</h3>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fermer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const EditDialog = ({ document: doc, filtersData, onClose, onSaved }) => {
  const [form, setForm] = useState({ title: documentTitle(doc), description: doc.description || '' });
  const [legacy, setLegacy] = useState(() => Object.fromEntries(LEGACY_FIELDS.map(([key]) => [key, idOf(doc[key])])));
  const [catalog, setCatalog] = useState(() => {
    const chain = nodeChain(doc.noeudId);
    const organismeId = idOf(chain.at(-1)?.organismeId);
    if (!organismeId) return { organisme: null, path: [], matiere: null, hasParcoursType: null, parcoursType: null, isNewOrganisme: false };
    return {
      organisme: { _id: organismeId, nom: 'Organisme actuel' },
      path: chain,
      matiere: doc.matiereId?._id ? doc.matiereId : null,
      hasParcoursType: Boolean(doc.parcoursTypeId),
      parcoursType: doc.parcoursTypeId?._id ? doc.parcoursTypeId : null,
      isNewOrganisme: false,
    };
  });
  const [catalogDirty, setCatalogDirty] = useState(false);
  const [correctionIncluded, setCorrectionIncluded] = useState(Boolean(doc.correctionIncludedInPdf));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Le nœud peuplé ne porte que l'identifiant de l'organisme : on récupère son nom pour l'affichage.
  const initialOrganismeId = catalog.organisme?.nom === 'Organisme actuel' ? catalog.organisme._id : null;
  useEffect(() => {
    if (!initialOrganismeId) return undefined;
    let active = true;
    axios.get(`/api/structures/${initialOrganismeId}`)
      .then((response) => {
        const organisme = response.data.data?.organisme;
        if (!active || !organisme) return;
        setCatalog((current) => (current.organisme?._id === initialOrganismeId ? { ...current, organisme } : current));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [initialOrganismeId]);

  const hasLegacyValues = LEGACY_FIELDS.some(([key]) => idOf(doc[key]));

  const submit = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError('Le titre est obligatoire.');
      return;
    }

    const payload = { title, description: form.description.trim(), correctionIncludedInPdf: correctionIncluded };
    LEGACY_FIELDS.forEach(([key]) => {
      if (legacy[key] !== idOf(doc[key])) payload[key] = legacy[key];
    });

    if (catalogDirty && catalog.organisme) {
      if (!catalog.path.at(-1)?._id || !catalog.matiere?._id) {
        setError('Complétez tous les niveaux du catalogue ainsi que la matière.');
        return;
      }
      if (catalog.hasParcoursType === null) {
        setError('Indiquez si cet organisme possède un type de parcours.');
        return;
      }
      if (catalog.hasParcoursType && !catalog.parcoursType?._id) {
        setError('Sélectionnez ou créez un type de parcours.');
        return;
      }
      payload.noeudId = catalog.path.at(-1)._id;
      payload.matiereId = catalog.matiere._id;
      payload.hasParcoursType = String(catalog.hasParcoursType);
      if (catalog.parcoursType?._id) payload.parcoursTypeId = catalog.parcoursType._id;
    }

    setSaving(true);
    setError('');
    try {
      const response = await axios.put(`/api/documents/${doc._id}`, payload);
      onSaved(response.data.data);
    } catch (requestError) {
      setError(errorMessage(requestError, "Impossible d'enregistrer les modifications."));
      setSaving(false);
    }
  };

  return (
    <Dialog title="Modifier le sujet" subtitle={doc.originalFileName} onClose={onClose} busy={saving} wide>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className={labelClass}>Titre</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={inputClass}
              placeholder="Ex : Épreuve de Mathématiques 2024"
              autoFocus
            />
          </label>
          <label className="block">
            <span className={labelClass}>Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={`${inputClass} resize-none`}
              placeholder="Résumé du contenu (facultatif)"
            />
          </label>

          <CorrectionIncludedToggle checked={correctionIncluded} onChange={setCorrectionIncluded} className="bg-white" />

          <div className="grid">
            <DynamicMetadataFields
              value={catalog}
              onChange={(value) => {
                setCatalog(value);
                setCatalogDirty(true);
              }}
            />
          </div>

          {filtersData ? (
            <details open={hasLegacyValues} className="rounded-2xl border border-slate-200 px-4 py-3">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-500">Référentiels classiques</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {LEGACY_FIELDS.map(([key, label, optionsKey]) => (
                  <label key={key} className="block">
                    <span className={labelClass}>{label}</span>
                    <select value={legacy[key]} onChange={(event) => setLegacy({ ...legacy, [key]: event.target.value })} className={inputClass}>
                      <option value="">Non renseigné</option>
                      {(filtersData[optionsKey] || []).map((option) => (
                        <option key={option._id} value={option._id}>{option.displayName || option.name}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </details>
          ) : null}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm sm:grid-cols-4">
            {[
              ['Publié le', formatDate(doc.createdAt)],
              ['Taille', formatFileSize(doc.fileSize) || '—'],
              ['Vues', doc.views || 0],
              ['Téléchargements', doc.downloads || 0],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-xs font-medium text-slate-400">{term}</dt>
                <dd className="font-semibold text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          {error ? (
            <p role="alert" className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-600">
              <AlertTriangle size={15} className="shrink-0" /> {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <AdminButton variant="secondary" onClick={onClose} disabled={saving}>Annuler</AdminButton>
            <AdminButton type="submit" loading={saving}>
              {saving ? null : <Save size={15} />} Enregistrer
            </AdminButton>
          </div>
        </div>
      </form>
    </Dialog>
  );
};

const DeleteDialog = ({ document: doc, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const hasCorrection = Boolean(correctionOf(doc));

  const confirm = async () => {
    setDeleting(true);
    setError('');
    try {
      await axios.delete(`/api/documents/${doc._id}`);
      onDeleted(doc);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Suppression impossible.'));
      setDeleting(false);
    }
  };

  return (
    <Dialog title="Supprimer ce sujet ?" onClose={onClose} busy={deleting}>
      <div className="space-y-4 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Trash2 size={18} />
          </div>
          <div className="min-w-0 text-sm text-slate-600">
            <p className="break-words font-bold text-slate-800">{documentTitle(doc)}</p>
            <p className="mt-1 leading-relaxed">
              Le sujet ne sera plus visible par les utilisateurs
              {hasCorrection ? ', ainsi que son corrigé associé' : ''}. Il est placé dans la corbeille, d'où un
              super administrateur peut encore le restaurer pendant quelques jours avant sa suppression définitive.
            </p>
          </div>
        </div>
        {error ? <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p> : null}
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={deleting}>Annuler</AdminButton>
        <button type="button" onClick={confirm} disabled={deleting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50">
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Supprimer
        </button>
      </div>
    </Dialog>
  );
};

const IconButton = ({ icon: Icon, label, tone = 'slate', loading, ...props }) => {
  const tones = {
    slate: 'hover:bg-slate-100 hover:text-slate-800',
    indigo: 'hover:bg-indigo-50 hover:text-indigo-600',
    rose: 'hover:bg-rose-50 hover:text-rose-600',
  };
  return (
    <button type="button" title={label} aria-label={label} disabled={loading} className={`flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors disabled:opacity-50 ${tones[tone]}`} {...props}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
    </button>
  );
};

const PublishedSubjectsManager = ({ filtersData }) => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ data: [], pagination: null, loading: true, error: '' });
  const [organismes, setOrganismes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [notice, setNotice] = useState(null);

  const search = useDebounce(filters.search.trim(), 350);
  const { organismeId, dateFrom, dateTo, sort } = filters;
  const invalidRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const updateFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  useEffect(() => {
    axios.get('/api/organismes', { params: { limit: 100 } })
      .then((response) => setOrganismes(response.data.data || []))
      .catch(() => setOrganismes([]));
  }, []);

  useEffect(() => {
    if (invalidRange) return undefined;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: '' }));
    axios.get('/api/documents/manage', {
      params: {
        page,
        limit,
        sort,
        search: search || undefined,
        organismeId: organismeId || undefined,
        dateFrom: dateFrom ? dayBound(dateFrom, false) : undefined,
        dateTo: dateTo ? dayBound(dateTo, true) : undefined,
      },
    })
      .then((response) => {
        if (cancelled) return;
        const pagination = response.data.meta?.pagination || null;
        // La page courante peut disparaître après une suppression ou un filtre plus strict.
        if (pagination && pagination.pages > 0 && page > pagination.pages) {
          setPage(pagination.pages);
          return;
        }
        setState({ data: response.data.data || [], pagination, loading: false, error: '' });
      })
      .catch((requestError) => {
        if (!cancelled) setState((current) => ({ ...current, loading: false, error: errorMessage(requestError, 'Impossible de charger les sujets.') }));
      });
    return () => { cancelled = true; };
  }, [page, limit, sort, search, organismeId, dateFrom, dateTo, invalidRange, version]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const preview = async (doc) => {
    setPreviewing(doc._id);
    try {
      const response = await axios.get(`/api/documents/${doc._id}/download`);
      const url = response.data?.data?.url || response.data?.url;
      if (url) window.open(url, '_blank', 'noopener');
      else setNotice({ tone: 'error', text: 'Aperçu indisponible pour ce fichier.' });
    } catch (requestError) {
      setNotice({ tone: 'error', text: errorMessage(requestError, 'Aperçu indisponible pour ce fichier.') });
    } finally {
      setPreviewing(null);
    }
  };

  const handleSaved = (updated) => {
    setEditing(null);
    setState((current) => ({ ...current, data: current.data.map((item) => (item._id === updated._id ? updated : item)) }));
    setNotice({ tone: 'success', text: 'Modifications enregistrées.' });
  };

  const handleDeleted = (doc) => {
    setDeleting(null);
    setNotice({ tone: 'success', text: `« ${documentTitle(doc)} » a été placé dans la corbeille.` });
    reload();
  };

  const { data, pagination, loading, error } = state;
  const total = pagination?.total || 0;
  const pages = pagination?.pages || 0;
  const hasActiveFilters = Boolean(filters.search || organismeId || dateFrom || dateTo);
  const firstRow = total ? (page - 1) * limit + 1 : 0;
  const lastRow = Math.min(page * limit, total);
  const organismeOptions = useMemo(
    () => [['', 'Tous les organismes'], ...organismes.map((item) => [item._id, labelOf(item)])],
    [organismes],
  );

  return (
    <Panel
      title="Sujets publiés"
      description="Corrigez les informations d'un sujet en ligne ou retirez-le de la plateforme."
      action={(
        <AdminButton variant="secondary" onClick={reload} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser
        </AdminButton>
      )}
    >
      {notice ? (
        <div role="status" className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice.tone === 'error' ? <AlertTriangle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="shrink-0" />}
          <span className="min-w-0 flex-1 break-words">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer le message" className="shrink-0 opacity-60 hover:opacity-100"><X size={15} /></button>
        </div>
      ) : null}

      <Box className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-full flex-1 sm:min-w-[260px]">
            <SearchBox value={filters.search} onChange={(value) => updateFilters({ search: value })} placeholder="Rechercher par titre ou nom de fichier…" />
          </div>
          <Select label="Organisme" value={organismeId} onChange={(value) => updateFilters({ organismeId: value })} options={organismeOptions} />
          <Select label="Trier par" value={sort} onChange={(value) => updateFilters({ sort: value })} options={SORT_OPTIONS} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-500"><CalendarDays size={16} className="text-slate-400" /> Publié</span>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            du
            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => updateFilters({ dateFrom: event.target.value })} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            au
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => updateFilters({ dateTo: event.target.value })} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none" />
          </label>
          {hasActiveFilters ? (
            <button type="button" onClick={() => updateFilters({ ...EMPTY_FILTERS, sort })} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <RotateCcw size={14} /> Réinitialiser
            </button>
          ) : null}
        </div>
        {invalidRange ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">La date de début doit précéder la date de fin.</p> : null}
      </Box>

      <Box className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
          <span>
            <strong className="font-bold text-slate-800">{total}</strong> sujet{total > 1 ? 's' : ''} publié{total > 1 ? 's' : ''}
            {hasActiveFilters ? ' pour ces critères' : ''}
          </span>
          {loading && data.length ? <Loader2 size={16} className="animate-spin text-slate-400" /> : null}
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <AdminButton variant="secondary" onClick={reload}><RotateCcw size={15} /> Réessayer</AdminButton>
          </div>
        ) : loading && !data.length ? (
          <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Chargement">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-5 py-4">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : !data.length ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
              <FileText size={24} className="text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-800">{hasActiveFilters ? 'Aucun sujet ne correspond' : 'Aucun sujet publié'}</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {hasActiveFilters ? 'Modifiez la recherche ou élargissez la période.' : 'Les sujets apparaîtront ici dès leur publication.'}
            </p>
          </div>
        ) : (
          <table className={`w-full table-fixed transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <Th>Sujet</Th>
                <Th className="hidden w-[30%] lg:table-cell">Classement</Th>
                <Th className="hidden w-32 md:table-cell">Publié le</Th>
                <Th className="hidden w-28 xl:table-cell">Audience</Th>
                <Th className="w-[124px] text-right"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((doc) => {
                const classification = classificationOf(doc);
                return (
                  <tr key={doc._id} className="hover:bg-slate-50/60">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800" title={documentTitle(doc)}>{documentTitle(doc)}</p>
                          <p className="truncate text-xs text-slate-400" title={doc.originalFileName}>
                            {[doc.originalFileName, formatFileSize(doc.fileSize)].filter(Boolean).join(' · ')}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500 md:hidden">{formatDate(doc.createdAt)}</p>
                          {correctionOf(doc) ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 size={11} /> Corrigé lié
                            </span>
                          ) : hasIncludedCorrection(doc) ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 size={11} /> Corrigé inclus
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden lg:table-cell">
                      {classification.path || classification.subject ? (
                        <>
                          <p className="truncate font-medium text-slate-700" title={classification.subject}>{classification.subject || '—'}</p>
                          <p className="truncate text-xs text-slate-400" title={classification.path}>{classification.path}</p>
                        </>
                      ) : <span className="text-slate-400">Non classé</span>}
                    </Td>
                    <Td className="hidden md:table-cell">
                      <p className="whitespace-nowrap">{formatDate(doc.createdAt)}</p>
                      <p className="truncate text-xs text-slate-400">{doc.uploadedBy?.name}</p>
                    </Td>
                    <Td className="hidden xl:table-cell">
                      <p className="flex items-center gap-1.5 tabular-nums"><Eye size={13} className="text-slate-400" /> {doc.views || 0}</p>
                      <p className="flex items-center gap-1.5 text-xs tabular-nums text-slate-400"><Download size={13} /> {doc.downloads || 0}</p>
                    </Td>
                    <Td className="px-2 sm:px-5">
                      <div className="flex items-center justify-end gap-0.5">
                        <IconButton icon={ExternalLink} label="Ouvrir le fichier" loading={previewing === doc._id} onClick={() => preview(doc)} />
                        <IconButton icon={Pencil} label="Modifier les informations" tone="indigo" onClick={() => setEditing(doc)} />
                        <IconButton icon={Trash2} label="Supprimer" tone="rose" onClick={() => setDeleting(doc)} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {total > 0 && !error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <span className="tabular-nums">{`${firstRow}–${lastRow} sur ${total}`}</span>
              <label className="flex items-center gap-2">
                <span className="hidden sm:inline">Par page</span>
                <select
                  value={limit}
                  onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}
                  aria-label="Sujets par page"
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 focus:border-indigo-300 focus:outline-none"
                >
                  {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            </div>
            {pages > 1 ? (
              <nav className="flex items-center gap-1" aria-label="Pagination">
                <button type="button" aria-label="Page précédente" disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
                {pageWindow(page, pages).map((item, index) => (item === '…' ? (
                  <span key={`gap-${index}`} className="px-1 text-slate-400">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    aria-current={item === page ? 'page' : undefined}
                    className={`h-8 min-w-[2rem] rounded-lg px-2 text-sm font-semibold tabular-nums ${item === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {item}
                  </button>
                )))}
                <button type="button" aria-label="Page suivante" disabled={page >= pages} onClick={() => setPage(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={16} /></button>
              </nav>
            ) : null}
          </div>
        ) : null}
      </Box>

      {editing ? <EditDialog key={editing._id} document={editing} filtersData={filtersData} onClose={closeEdit} onSaved={handleSaved} /> : null}
      {deleting ? <DeleteDialog document={deleting} onClose={closeDelete} onDeleted={handleDeleted} /> : null}
    </Panel>
  );
};

export default PublishedSubjectsManager;
