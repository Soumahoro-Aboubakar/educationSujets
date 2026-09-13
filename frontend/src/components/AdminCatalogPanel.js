import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Building2, Info, Plus, RefreshCw, Save } from 'lucide-react';
import DynamicDocumentWizard from './DynamicDocumentWizard';
import DocumentManagementPanel from './DocumentManagementPanel';

const emptyOrganisme = { nom: '', logo: '', description: '' };
const errorMessage = (error, fallback) => error.response?.data?.error || fallback;
const levelsWithOrder = (levels) => levels.map((level, index) => ({ ...level, ordre: index + 1 }));

const AdminCatalogPanel = () => {
  const [mode, setMode] = useState('configuration');
  const [organismes, setOrganismes] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [structure, setStructure] = useState(null);
  const [levels, setLevels] = useState([]);
  const [nodeCount, setNodeCount] = useState(0);
  const [form, setForm] = useState(emptyOrganisme);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selected = useMemo(() => organismes.find((item) => item._id === selectedId), [organismes, selectedId]);
  const hasNodes = nodeCount > 0;

  const loadOrganismes = async (preferred = '') => {
    setLoading(true); setError('');
    try {
      const response = await axios.get('/api/organismes', { params: { limit: 100 } });
      const data = response.data.data || [];
      setOrganismes(data); setSelectedId(preferred || selectedId || data[0]?._id || '');
    } catch (requestError) { setError(errorMessage(requestError, 'Impossible de charger les organismes.')); }
    finally { setLoading(false); }
  };

  const loadStructure = async (id) => {
    if (!id) { setStructure(null); setLevels([]); setNodeCount(0); return; }
    setLoading(true);
    try {
      const response = await axios.get(`/api/structures/${id}`);
      const data = response.data.data || {};
      setStructure(data.structure || null); setLevels(data.structure?.niveaux || []); setNodeCount(data.nodeCount || 0);
    } catch (requestError) {
      if (requestError.response?.status === 404) { setStructure(null); setLevels([]); setNodeCount(0); }
      else setError(errorMessage(requestError, 'Impossible de charger le gabarit.'));
    } finally { setLoading(false); }
  };

  useEffect(() => { loadOrganismes(); }, []);
  useEffect(() => { loadStructure(selectedId); }, [selectedId]);

  const createOrganisme = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await axios.post('/api/organismes', form);
      setForm(emptyOrganisme);
      await loadOrganismes(response.data.data._id);
      setNotice('Organisme créé. Définissez son gabarit avant la saisie.');
    }
    catch (requestError) { setError(errorMessage(requestError, 'Impossible de créer cet organisme.')); }
    finally { setSaving(false); }
  };

  const saveStructure = async (event) => {
    event.preventDefault(); if (!selectedId || !levels.length) return; setSaving(true); setError('');
    try {
      const response = await axios.post(`/api/structures/${selectedId}`, { niveaux: levelsWithOrder(levels) });
      setStructure(response.data.data);
      setLevels(response.data.data.niveaux || []);
      setNotice('Gabarit enregistré.');
    }
    catch (requestError) { setError(errorMessage(requestError, 'Impossible d’enregistrer le gabarit.')); }
    finally { setSaving(false); }
  };

  const deriveStructureType = (lvls) => {
    if (!lvls || lvls.length === 0) return '';
    if (lvls.length === 1 && lvls[0].type === 'annee') return 'aucun';
    if (lvls.length === 2 && lvls[0].type === 'cycle' && lvls[1].type === 'annee') return 'cycle';
    if (lvls.length === 2 && lvls[0].type === 'concours' && lvls[1].type === 'annee') return 'concours';
    return 'personnalise';
  };

  const handleStructureTypeChange = (type) => {
    if (type === 'aucun') {
      setLevels([{ type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' }]);
    } else if (type === 'cycle') {
      setLevels([
        { type: 'cycle', libelleSingulier: 'Cycle', libellePluriel: 'Cycles' },
        { type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' }
      ]);
    } else if (type === 'concours') {
      setLevels([
        { type: 'concours', libelleSingulier: 'Concours', libellePluriel: 'Concours' },
        { type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' }
      ]);
    }
  };

  const currentType = deriveStructureType(levels);

  const configuration = (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Catalogue dynamique</p>
            <h2 className="text-2xl font-black text-slate-800">Configuration des structures</h2>
          </div>
          <button type="button" onClick={() => { loadOrganismes(selectedId); loadStructure(selectedId); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">
            <RefreshCw size={16} /> Actualiser
          </button>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <form onSubmit={createOrganisme} className="rounded-2xl bg-slate-50 p-4">
            <h3 className="font-black text-slate-800">Nouvel organisme</h3>
            <div className="mt-3 space-y-3">
              <input required value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} placeholder="Nom de l’organisme" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
              <input value={form.logo} onChange={(event) => setForm({ ...form, logo: event.target.value })} placeholder="URL du logo (optionnelle)" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description (optionnelle)" rows={2} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                <Plus size={16} /> Créer
              </button>
            </div>
          </form>
          <div className="rounded-2xl border border-slate-200 p-4">
            <label htmlFor="organisme-config" className="text-xs font-bold uppercase tracking-wide text-slate-500">Organisme à configurer</label>
            <select id="organisme-config" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">
              <option value="">Sélectionner un organisme</option>
              {organismes.map((item) => <option key={item._id} value={item._id}>{item.nom}</option>)}
            </select>
            {selected && <p className="mt-3 text-sm text-slate-500">Actif : <strong>{selected.nom}</strong></p>}
          </div>
        </div>
      </div>

      {selectedId && (
        <form onSubmit={saveStructure} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <Building2 size={17} /> {selected?.nom}
              </div>
              <h3 className="mt-2 text-xl font-black text-slate-800">Structure de navigation</h3>
            </div>
            <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">{nodeCount} nœud{nodeCount > 1 ? 's' : ''} configué(s)</span>
          </div>

          {hasNodes && (
            <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              <Info size={18} />
              <p>Des sujets ou nœuds existent déjà. Vous ne pouvez plus modifier le type de structure.</p>
            </div>
          )}

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">Chargement…</p>
          ) : (
            <div className="mt-5 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Structure intermédiaire</label>
              <select
                disabled={hasNodes}
                value={currentType}
                onChange={(e) => handleStructureTypeChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold disabled:bg-slate-100 disabled:opacity-70"
              >
                <option value="" disabled>Sélectionner une structure</option>
                <option value="aucun">Aucune (Organisme → Année → Matière)</option>
                <option value="cycle">Cycle (Organisme → Cycle → Année → Matière)</option>
                <option value="concours">Concours (Organisme → Concours → Année → Matière)</option>
                <option value="personnalise" disabled={currentType !== 'personnalise'}>
                  Personnalisée (Modification avancée non supportée)
                </option>
              </select>

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Aperçu de la navigation</p>
                <div className="flex flex-wrap gap-2 items-center text-sm font-medium text-slate-600">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg">{selected?.nom}</span>
                  {levels.map((lvl, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-slate-300">→</span>
                      <span className="px-3 py-1 bg-slate-100 rounded-lg">{lvl.libelleSingulier}</span>
                    </React.Fragment>
                  ))}
                  <span className="text-slate-300">→</span>
                  <span className="px-3 py-1 bg-slate-100 rounded-lg">Matière</span>
                  <span className="text-slate-300">→</span>
                  <span className="px-3 py-1 bg-slate-100 rounded-lg">Sujets</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
            <button disabled={saving || loading || !levels.length || currentType === ''} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              <Save size={16} /> Enregistrer la configuration
            </button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {(error || notice) && (
        <div role={error ? 'alert' : 'status'} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || notice}
        </div>
      )}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button type="button" onClick={() => setMode('configuration')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${mode === 'configuration' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Configuration</button>
        <button type="button" onClick={() => setMode('wizard')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${mode === 'wizard' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Saisie de contenu</button>
        <button type="button" onClick={() => setMode('documents')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${mode === 'documents' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Documents existants</button>
      </div>
      {mode === 'configuration' && configuration}
      {mode === 'wizard' && <DynamicDocumentWizard onNeedStructure={() => setMode('configuration')} />}
      {mode === 'documents' && <DocumentManagementPanel />}
    </div>
  );
};

export default AdminCatalogPanel;
