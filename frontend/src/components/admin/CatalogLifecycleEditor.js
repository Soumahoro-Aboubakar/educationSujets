import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { errorMessage } from '../../lib/api';

export default function CatalogLifecycleEditor({ organismeId }) {
  const [kind, setKind] = useState('noeuds');
  const [parents, setParents] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const parentId = parents[parents.length - 1]?._id;
  const load = useCallback(async () => {
    const path = kind === 'parcoursTypes' ? `/api/organismes/${organismeId}/parcours-types` : `/api/${kind}`;
    const response = await axios.get(path, { params: { organismeId, parentId, scope: 'admin', page, limit: 20 } });
    setRows(response.data.data); setPages(response.data.meta?.pagination?.pages || 1);
  }, [kind, organismeId, page, parentId]);
  useEffect(() => { load().catch(e => setError(errorMessage(e))); }, [load]);
  const save = async row => {
    setBusy(true); setError('');
    try { await axios.patch(`/api/${kind}/${row._id}`, { nom: row.nom, status: row.status }); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
    <h3 className="text-xl font-bold">Visibilité des niveaux, matières et parcours</h3>
    <p className="text-sm text-slate-500">Retire les sujets publiés et archive les descendants avant leur parent.</p>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    <select aria-label="Référentiel à modifier" className="rounded-xl border p-2" value={kind} onChange={e => { setKind(e.target.value); setParents([]); setPage(1); setError(''); }}><option value="noeuds">Niveaux et catégories</option><option value="matieres">Matières</option><option value="parcoursTypes">Types de parcours</option></select>
    {parents.length > 0 && <div><button onClick={() => { setParents(p => p.slice(0, -1)); setPage(1); }}>Retour au parent</button><span> · {parents.map(p => p.nom).join(' → ')}</span></div>}
    {rows.map((row, i) => <div key={row._id} className="flex flex-wrap items-center gap-3">
      <input aria-label={`Nom ${row._id}`} className="rounded-xl border p-2" value={row.nom} onChange={e => setRows(items => items.map((r, n) => n === i ? { ...r, nom: e.target.value } : r))} />
      <select aria-label={`Statut ${row._id}`} className="rounded-xl border p-2" value={row.status || 'published'} onChange={e => setRows(items => items.map((r, n) => n === i ? { ...r, status: e.target.value } : r))}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select>
      <button className="text-indigo-700 font-semibold" disabled={busy} onClick={() => save(row)}>Enregistrer</button>
      {kind === 'noeuds' && <button onClick={() => { setParents(p => [...p, row]); setPage(1); }}>Ouvrir les descendants</button>}
    </div>)}
    {!rows.length && <p>Aucun élément à ce niveau.</p>}
    <div className="flex gap-3"><button disabled={page <= 1 || busy} onClick={() => setPage(p => p - 1)}>Précédent</button><span>Page {page}</span><button disabled={page >= pages || busy} onClick={() => setPage(p => p + 1)}>Suivant</button></div>
  </section>;
}
