import React, { useCallback, useEffect, useState } from 'react';
import { prepAdmin, errorMessage } from '../../lib/api';

const array = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
const display = value => typeof value === 'string' || typeof value === 'number' ? value : value == null ? '' : JSON.stringify(value);
const field = 'w-full rounded-xl border border-slate-200 p-3 text-sm';
const button = 'rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
const empty = kind => kind === 'programme'
  ? { code: '', titre: '', description: '', organisme: { sigle: '', recherche: [] }, organismeId: null, parcoursTypeId: null, parcoursType: '', matieres: [{ nom: '', modules: [] }] }
  : { code: '', titre: '', resume: '', matiere: '', notions: [], lecons: [], exercices: [] };
const refKey = row => `${row.kind}:${row.code}`;

// Aperçu éditorial : texte React échappé, jamais de HTML fourni par un auteur.
export function ContentPreview({ payload }) {
  if (!payload) return null;
  return <article aria-label="Aperçu du contenu" className="rounded-2xl bg-slate-50 p-4 space-y-3">
    <h3 className="font-bold">{display(payload.titre)}</h3><p>{display(payload.resume || payload.description)}</p>
    {array(payload.matieres).map((m, i) => <div key={i}><strong>{display(m.nom)}</strong><p>{array(m.modules).map(r => display(r.code)).join(' · ')}</p></div>)}
    {array(payload.lecons).map(l => <section key={l.code}><h4 className="font-bold">{display(l.titre)} · {display(l.duree)} min</h4>
      {array(l.blocs).map((b, i) => <div key={i} className="my-2 rounded-xl bg-white p-3">
        {b.titre && <strong>{display(b.titre)}</strong>}
        {Object.entries(b).filter(([k]) => k !== 'type' && k !== 'titre').map(([k, value]) => <div key={k} className="whitespace-pre-wrap">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</div>)}
      </div>)}
    </section>)}
    {array(payload.exercices).map(ex => <details key={display(ex.code)}><summary>{display(ex.code)} · {display(ex.type)} · {display(ex.consigne)}</summary><pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(ex, null, 2)}</pre></details>)}
  </article>;
}

export default function AdminPrepContent() {
  const [listing, setListing] = useState({ data: [], generation: 0, history: [], pagination: { pages: 0 } });
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('programme');
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [part, setPart] = useState('');
  const [partText, setPartText] = useState('');
  const [batch, setBatch] = useState([]);
  const [rollback, setRollback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => setListing(await prepAdmin.list({ page, limit: 20 })), [page]);
  useEffect(() => { load().catch(e => setError(errorMessage(e))); }, [load]);
  const run = async task => {
    setBusy(true); setError(''); setNotice('');
    try { await task(); } catch (e) {
      const details = e.response?.data?.details;
      setError([errorMessage(e, e instanceof SyntaxError ? 'JSON invalide : vérifie la saisie.' : 'Impossible de terminer cette action.'), ...(Array.isArray(details) ? details : [])].join('\n'));
    } finally { setBusy(false); }
  };
  const edit = async row => {
    const value = await prepAdmin.get(row.kind, row.code);
    setSelected(value); setKind(value.kind); setText(JSON.stringify(value.payload, null, 2)); setPart('');
  };
  const queue = row => setBatch(items => [...items.filter(i => refKey(i) !== refKey(row)), { kind: row.kind, code: row.code, revision: row.revision }]);
  let payload = null;
  try { payload = JSON.parse(text); } catch { /* L'erreur reste locale jusqu'à l'enregistrement. */ }
  const save = async () => {
    const value = JSON.parse(text);
    const row = selected ? await prepAdmin.save(kind, selected.code, value, selected.revision) : await prepAdmin.create({ kind, code: value.code, payload: value });
    setSelected(row); queue(row); await load(); setNotice('Brouillon enregistré et ajouté à la publication groupée.');
  };
  const parts = payload ? (kind === 'programme' ? array(payload.matieres).map((m, i) => ({ key: `matieres:${i}`, label: `Matière : ${display(m.nom)}` }))
    : [...array(payload.lecons).map((l, i) => ({ key: `lecons:${i}`, label: `Leçon : ${display(l.titre)}` })), ...array(payload.exercices).map((e, i) => ({ key: `exercices:${i}`, label: `Exercice : ${e.code}` }))]) : [];
  return <div className="space-y-5">
    <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
      <h2 className="text-2xl font-bold">Préparation</h2>
      <p>Publication {listing.generation}. Les brouillons restent privés jusqu’à la publication groupée.</p>
      {error && <p role="alert" className="whitespace-pre-wrap text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-emerald-700">{notice}</p>}
      <div className="flex gap-3"><select aria-label="Type de contenu" className={field} value={kind} onChange={e => setKind(e.target.value)} disabled={Boolean(selected)}><option value="programme">Programme</option><option value="module">Module</option></select>
        <button className={button} onClick={() => { setSelected(null); setText(JSON.stringify(empty(kind), null, 2)); setPart(''); }}>Nouveau contenu</button>
        <button className={button} disabled={busy} onClick={() => run(load)}>Actualiser</button></div>
      <ul className="divide-y">{listing.data.map(row => <li key={`${refKey(row)}:${row.revision}`} className="py-2 flex gap-3 items-center">
        <button className="text-indigo-700 font-semibold" disabled={busy} onClick={() => run(() => edit(row))}>{row.code}</button>
        <span>{row.kind} · révision {row.revision} · {row.active ? 'Publiée' : row.withdrawn ? 'Retirée' : row.status === 'published' ? 'Historique' : row.status === 'draft' ? 'Brouillon' : 'Supprimée'}</span>
        {row.status !== 'archived' && <button className="text-indigo-700" onClick={() => queue(row)}>Ajouter à la publication</button>}
      </li>)}</ul>
      <div className="flex gap-3"><button disabled={page <= 1 || busy} onClick={() => setPage(p => p - 1)}>Précédent</button><span>Page {page} / {listing.pagination.pages || 1}</span><button disabled={page >= listing.pagination.pages || busy} onClick={() => setPage(p => p + 1)}>Suivant</button></div>
    </div>
    {text && <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
      <h3 className="font-bold">{selected ? `${selected.code} · révision ${selected.revision}` : 'Nouveau brouillon'}</h3>
      {selected?.dependencies?.length > 0 && <p role="note">Module partagé avec : {selected.dependencies.join(', ')}. La publication affectera ces programmes.</p>}
      <label className="block">Contenu JSON<textarea aria-label="Contenu JSON" className={`${field} font-mono`} rows={16} value={text} onChange={e => setText(e.target.value)} /></label>
      <p className="text-sm text-slate-500">Programme → matières → références des modules. Module → leçons → blocs et exercices. Les codes existants restent stables ; les traductions se renseignent dans versionCible.</p>
      {parts.length > 0 && <><select aria-label="Élément à modifier" className={field} value={part} onChange={e => { setPart(e.target.value); const [key, i] = e.target.value.split(':'); setPartText(e.target.value ? JSON.stringify(payload[key][i], null, 2) : ''); }}><option value="">Choisir une matière, une leçon ou un exercice</option>{parts.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
        {part && <><textarea aria-label="Élément JSON" className={`${field} font-mono`} rows={8} value={partText} onChange={e => setPartText(e.target.value)} /><button className={button} onClick={() => run(async () => { const next = JSON.parse(text); const [key, i] = part.split(':'); next[key][i] = JSON.parse(partText); setText(JSON.stringify(next, null, 2)); })}>Appliquer à ce brouillon</button></>}</>}
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={() => run(save)}>Enregistrer le brouillon</button>
        {selected && <><button className={button} disabled={busy} onClick={() => run(async () => { await prepAdmin.validate(kind, selected.code, selected.revision); setNotice('Révision enregistrée valide dans la publication actuelle.'); })}>Valider la révision enregistrée</button>
          <button disabled={busy} onClick={() => run(async () => { await prepAdmin.archive(kind, selected.code, listing.generation); await load(); setNotice('Contenu retiré. Les historiques sont conservés.'); })}>Archiver</button>
          {selected.status === 'draft' && <button disabled={busy} onClick={() => run(async () => { await prepAdmin.remove(kind, selected.code, selected.revision); setSelected(null); setText(''); setBatch(items => items.filter(i => refKey(i) !== refKey(selected))); await load(); })}>Supprimer le brouillon</button>}</>}
      </div>
      <ContentPreview payload={payload} />
    </div>}
    <div className="rounded-2xl border border-indigo-200 bg-white p-5 space-y-3">
      <h3 className="font-bold">Publication groupée</h3>
      <p>Vérifie les révisions sélectionnées. Les références et les traductions seront contrôlées ensemble.</p>
      {batch.map(row => <p key={refKey(row)}>{row.code} · révision {row.revision} <button aria-label={`Retirer ${row.code}`} onClick={() => setBatch(items => items.filter(i => refKey(i) !== refKey(row)))}>Retirer</button></p>)}
      <button className={button} disabled={busy || !batch.length} onClick={() => run(async () => { await prepAdmin.publish({ expectedGeneration: listing.generation, revisions: batch }); setBatch([]); await load(); setNotice('Publication disponible immédiatement.'); })}>Publier les révisions sélectionnées</button>
      <div className="flex gap-3"><select className={field} aria-label="Publication à restaurer" value={rollback} onChange={e => setRollback(e.target.value)}><option value="">Choisir une ancienne publication</option>{listing.history.filter(h => h.generation !== listing.generation).map(h => <option key={h.generation} value={h.generation}>Publication {h.generation}</option>)}</select>
        <button disabled={busy || !rollback} onClick={() => run(async () => { await prepAdmin.publish({ expectedGeneration: listing.generation, rollbackGeneration: Number(rollback) }); setRollback(''); await load(); setNotice('Ancienne publication restaurée dans une nouvelle génération.'); })}>Restaurer cette publication</button></div>
    </div>
  </div>;
}
