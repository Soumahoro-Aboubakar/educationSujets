import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArchiveRestore, Edit3, Eye, RefreshCw, Save, Search, Trash2 } from 'lucide-react';

const reasonLabels = {
  manual: 'Suppression manuelle',
  'correction-replaced': 'Correction remplacée',
  'parent-subject-deleted': 'Supprimé avec le sujet parent',
};

const statusLabels = { draft: 'Brouillon', pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
const labelOf = (item) => item?.nom || item?.title || item?.titre || item?.name || '';
const messageOf = (error, fallback) => error.response?.data?.error || fallback;

const DocumentManagementPanel = () => {
  const [documents, setDocuments] = useState([]);
  const [trash, setTrash] = useState([]);
  const [organismes, setOrganismes] = useState([]);
  const [filters, setFilters] = useState({ search: '', organismeId: '', type: '', status: '' });
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [replacementFile, setReplacementFile] = useState(null);
  const [view, setView] = useState('active');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [documentsResponse, organismsResponse] = await Promise.all([
        axios.get('/api/documents/my', { params: { page: 1, limit: 100, search: filters.search } }),
        axios.get('/api/organismes', { params: { limit: 100 } }),
      ]);
      setDocuments(documentsResponse.data.data || []);
      setOrganismes(organismsResponse.data.data || []);
      if (view === 'trash') {
        const trashResponse = await axios.get('/api/documents/trash', { params: { page: 1, limit: 100 } });
        setTrash(trashResponse.data.data || []);
      }
    } catch (requestError) {
      setError(messageOf(requestError, 'Impossible de charger les documents.'));
    } finally {
      setLoading(false);
    }
  };

  // The loader intentionally follows the selected view; its identity is local to this panel.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => { load(); }, [view]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const visibleDocuments = useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase();
    return documents.filter((document) => {
      const text = [document.title, document.titre, document.originalFileName].filter(Boolean).join(' ').toLocaleLowerCase();
      const organismId = document.organismeId?._id || document.organismeId || document.noeudId?.organismeId || document.institution?._id || document.institution;
      const type = document.type || (document.documentType === 'corrige' ? 'correction' : 'sujet');
      return (!query || text.includes(query)) && (!filters.organismeId || organismId === filters.organismeId) && (!filters.type || type === filters.type) && (!filters.status || document.status === filters.status);
    });
  }, [documents, filters]);

  const edit = (document) => { setEditing(document._id); setEditTitle(document.title || document.titre || document.originalFileName || ''); setReplacementFile(null); };
  const saveEdit = async (documentId) => {
    try {
      await axios.put(`/api/documents/${documentId}`, { title: editTitle.trim(), titre: editTitle.trim() });
      if (replacementFile) {
        const formData = new FormData();
        formData.append('file', replacementFile, replacementFile.name);
        await axios.put(`/api/documents/${documentId}/file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setEditing(null);
      setNotice('Document mis à jour.');
      await load();
    } catch (requestError) { setError(messageOf(requestError, 'Impossible de modifier le document.')); }
  };

  const preview = async (document) => {
    try {
      const response = await axios.get(`/api/documents/${document._id}/download`);
      const url = response.data?.data?.url || response.data?.url;
      if (url) window.open(url, '_blank');
    } catch (requestError) { setError(messageOf(requestError, 'Prévisualisation indisponible.')); }
  };

  const remove = async (document) => {
    if (!window.confirm(`Mettre « ${labelOf(document)} » dans la corbeille ?`)) return;
    try {
      await axios.delete(`/api/documents/${document._id}`);
      setNotice('Document placé dans la corbeille.');
      await load();
    } catch (requestError) { setError(messageOf(requestError, 'Suppression impossible.')); }
  };

  const restore = async (document) => {
    const cascade = document.deletionReason === 'parent-subject-deleted' || document.type === 'sujet' || document.documentType === 'sujet';
    const text = cascade ? 'La restauration de ce sujet restaurera aussi sa correction associée. Continuer ?' : 'Restaurer ce document ?';
    if (!window.confirm(text)) return;
    try {
      await axios.put(`/api/documents/trash/${document._id}/restore`);
      setNotice(cascade ? 'Sujet et correction associée restaurés.' : 'Document restauré.');
      await load();
    } catch (requestError) { setError(messageOf(requestError, 'Restauration impossible.')); }
  };

  const list = view === 'trash' ? trash : visibleDocuments;

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Administration</p><h2 className="text-2xl font-black text-slate-800">Gestion des documents</h2></div><button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600"><RefreshCw size={16} /> Actualiser</button></div>
        <div className="mt-5 flex gap-2 border-b border-slate-100 pb-3"><button type="button" onClick={() => setView('active')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === 'active' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Documents actifs</button><button type="button" onClick={() => setView('trash')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === 'trash' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>Corbeille</button></div>
        {view === 'active' && <div className="mt-4 grid gap-3 md:grid-cols-4"><label className="relative md:col-span-2"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Rechercher un titre" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm" /></label><select value={filters.organismeId} onChange={(event) => setFilters({ ...filters, organismeId: event.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><option value="">Tous les organismes</option>{organismes.map((item) => <option key={item._id} value={item._id}>{labelOf(item)}</option>)}</select><select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><option value="">Tous les types</option><option value="sujet">Sujets</option><option value="correction">Corrections</option></select><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>}
      </div>
      <div className="space-y-3">{loading ? <div className="rounded-2xl bg-white p-10 text-center text-sm font-semibold text-slate-500">Chargement…</div> : !list.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Aucun document trouvé.</div> : list.map((document) => <div key={document._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-800">{labelOf(document)}</h3><span className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold uppercase text-indigo-700">{(document.type || (document.documentType === 'corrige' ? 'correction' : 'sujet'))}</span>{document.status && <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{statusLabels[document.status] || document.status}</span>}{view === 'trash' && <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${document.deletionReason === 'correction-replaced' ? 'bg-purple-50 text-purple-700' : document.deletionReason === 'parent-subject-deleted' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{reasonLabels[document.deletionReason] || 'Suppression manuelle'}</span>}</div><p className="mt-2 text-xs text-slate-500">{document.matiereId?.nom || 'Matière non renseignée'} · {document.noeudId?.nom || 'Niveau non renseigné'} · {document.createdAt ? new Date(document.createdAt).toLocaleDateString() : ''}</p></div><div className="flex flex-wrap gap-2">{view === 'active' ? <><button type="button" onClick={() => preview(document)} className="rounded-xl bg-slate-100 p-2 text-slate-600" title="Prévisualiser"><Eye size={16} /></button><button type="button" onClick={() => edit(document)} className="rounded-xl bg-indigo-50 p-2 text-indigo-600" title="Modifier"><Edit3 size={16} /></button><button type="button" onClick={() => remove(document)} className="rounded-xl bg-rose-50 p-2 text-rose-600" title="Mettre à la corbeille"><Trash2 size={16} /></button></> : <button type="button" onClick={() => restore(document)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"><ArchiveRestore size={16} /> Restaurer</button>}</div></div>{editing === document._id && <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /><button type="button" onClick={() => saveEdit(document._id)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"><Save size={15} /> Sauvegarder</button></div>}</div>)}</div>
    </div>
  );
};

export default DocumentManagementPanel;
