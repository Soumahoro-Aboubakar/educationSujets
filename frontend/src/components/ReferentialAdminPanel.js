import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Database, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const MODULES = [
  { key: 'cities', label: 'Villes', description: 'Gérer les villes et leur disponibilité' },
  { key: 'regions', label: 'Régions', description: 'Gérer les régions géographiques' },
  { key: 'bac-series', label: 'Séries BAC', description: 'Gérer les séries du baccalauréat' },
  { key: 'bac-subjects', label: 'Matières', description: 'Gérer les matières avec coefficients et séries' },
  { key: 'formations', label: 'Catalogues', description: 'Gérer les catalogues de formations' },
];

const emptyForm = (module) => {
  switch (module) {
    case 'cities':
      return { name: '', region: '', description: '', active: true };
    case 'regions':
      return { name: '', description: '', active: true };
    case 'bac-series':
      return { code: '', name: '', description: '', order: 0, active: true };
    case 'bac-subjects':
      return { name: '', coefficient: 1, category: '', description: '', active: true, series: [] };
    case 'formations':
      return {
        id: '',
        nomEtablissement: '',
        filiere: '',
        typeEtablissement: '',
        ville: '',
        region: '',
        modeAcces: '',
        prix: 0,
        duree: 0,
        ageLimite: 0,
        conditions: { bacsAcceptes: [], notesMinimales: {} },
        debouches: [],
        scoreWeights: {},
        bourses: { disponible: false, montant: 0 },
        logement: false,
        alternance: false,
        taux_employabilite: 0,
        partenaires: [],
        stages: '',
        active: true,
      };
    default:
      return {};
  }
};

const ReferentialAdminPanel = () => {
  const [activeModule, setActiveModule] = useState('cities');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm('cities'));
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, variant = 'success') => {
    setToast({ message, variant });
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const loadSeries = async () => {
      try {
        const res = await axios.get('/api/referentials/bac-series?limit=200');
        setSeriesOptions(res.data.data || []);
      } catch (error) {
        console.error(error);
      }
    };
    loadSeries();
  }, []);

  const fetchItems = async (module, page = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/referentials/${module}`, {
        params: { search, active: showActiveOnly ? 'true' : undefined, page, limit: 8 },
      });
      setItems(res.data.data || []);
      setPagination(res.data.meta?.pagination || null);
    } catch (error) {
      console.error(error);
      showToast('Impossible de charger les données', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFormData(emptyForm(activeModule));
    setEditingId(null);
    fetchItems(activeModule, 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule, search, showActiveOnly]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedFieldChange = (parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  const resetForm = () => {
    setFormData(emptyForm(activeModule));
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    if (activeModule === 'bac-subjects') {
      setFormData({
        ...item,
        series: item.series?.map((entry) => entry?._id || entry) || [],
      });
      return;
    }
    setFormData({
      ...item,
      conditions: {
        bacsAcceptes: item.conditions?.bacsAcceptes || [],
        notesMinimales: item.conditions?.notesMinimales || {},
      },
      bourses: item.bourses || { disponible: false, montant: 0 },
      debouches: item.debouches || [],
      partenaires: item.partenaires || [],
      scoreWeights: item.scoreWeights || {},
    });
  };

  const serializeArray = (value) => (Array.isArray(value) ? value : value.split(',').map((entry) => entry.trim()).filter(Boolean));

  const normalizePayload = (payload) => {
    if (activeModule === 'formations') {
      return {
        ...payload,
        prix: Number(payload.prix || 0),
        duree: Number(payload.duree || 0),
        ageLimite: Number(payload.ageLimite || 0),
        taux_employabilite: Number(payload.taux_employabilite || 0),
        conditions: {
          bacsAcceptes: serializeArray(payload.conditions?.bacsAcceptes || []),
          notesMinimales: payload.conditions?.notesMinimales && typeof payload.conditions.notesMinimales === 'string'
            ? JSON.parse(payload.conditions.notesMinimales || '{}')
            : payload.conditions?.notesMinimales || {},
        },
        debouches: serializeArray(payload.debouches || []),
        scoreWeights: payload.scoreWeights && typeof payload.scoreWeights === 'string'
          ? JSON.parse(payload.scoreWeights || '{}')
          : payload.scoreWeights || {},
        bourses: {
          disponible: Boolean(payload.bourses?.disponible),
          montant: Number(payload.bourses?.montant || 0),
        },
        partenaires: serializeArray(payload.partenaires || []),
      };
    }

    if (activeModule === 'bac-subjects') {
      return {
        ...payload,
        coefficient: Number(payload.coefficient || 1),
        series: payload.series || [],
      };
    }

    if (activeModule === 'bac-series') {
      return {
        ...payload,
        order: Number(payload.order || 0),
      };
    }

    if (activeModule === 'cities') {
      return { ...payload, region: payload.region || null };
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = normalizePayload(formData);
      if (editingId) {
        await axios.put(`/api/referentials/${activeModule}/${editingId}`, payload);
        showToast('Référentiel mis à jour', 'success');
      } else {
        await axios.post(`/api/referentials/${activeModule}`, payload);
        showToast('Référentiel créé', 'success');
      }
      resetForm();
      fetchItems(activeModule, 1);
    } catch (error) {
      const message = error.response?.data?.message || 'Une erreur est survenue';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm('Confirmer la suppression ?');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/referentials/${activeModule}/${item._id}`);
      showToast('Référentiel supprimé', 'success');
      fetchItems(activeModule, 1);
    } catch (error) {
      const message = error.response?.data?.message || 'Suppression impossible';
      showToast(message, 'error');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await axios.put(`/api/referentials/${activeModule}/${item._id}`, { active: !item.active });
      showToast('État mis à jour', 'success');
      fetchItems(activeModule, 1);
    } catch (error) {
      showToast('Impossible de modifier l’état', 'error');
    }
  };

  const tableColumns = useMemo(() => {
    switch (activeModule) {
      case 'cities':
        return ['Nom', 'Région', 'État'];
      case 'regions':
        return ['Nom', 'Description', 'État'];
      case 'bac-series':
        return ['Code', 'Nom', 'État'];
      case 'bac-subjects':
        return ['Nom', 'Coefficient', 'Catégorie', 'État'];
      case 'formations':
        return ['Identifiant', 'Établissement', 'Filière', 'État'];
      default:
        return ['Nom', 'État'];
    }
  }, [activeModule]);

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${toast.variant === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {toast.message}
        </div>
      )}

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Gestion des référentiels</p>
            <h3 className="text-2xl font-black text-slate-800">Administration avancée</h3>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            <Database size={16} /> Référentiels MongoDB
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {MODULES.map((module) => (
            <button
              key={module.key}
              type="button"
              onClick={() => setActiveModule(module.key)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${activeModule === module.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {module.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-slate-800">{MODULES.find((module) => module.key === activeModule)?.label}</h4>
              <p className="text-sm text-slate-500">{MODULES.find((module) => module.key === activeModule)?.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                <input type="checkbox" checked={showActiveOnly} onChange={() => setShowActiveOnly((prev) => !prev)} />
                Actifs uniquement
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search size={16} className="mr-2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Recherche" className="w-32 bg-transparent text-sm outline-none" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-sm font-semibold text-slate-500">
              <RefreshCw className="mr-2 animate-spin" size={16} /> Chargement...
            </div>
          ) : items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              Aucun élément trouvé pour ce référentiel.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {tableColumns.map((column) => (
                      <th key={column} className="px-3 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">{column}</th>
                    ))}
                    <th className="px-3 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {activeModule === 'cities' && item.name}
                        {activeModule === 'regions' && item.name}
                        {activeModule === 'bac-series' && item.code}
                        {activeModule === 'bac-subjects' && item.name}
                        {activeModule === 'formations' && item.id}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {activeModule === 'cities' && (item.region?.name || item.region || '-')}
                        {activeModule === 'regions' && (item.description || '-')}
                        {activeModule === 'bac-series' && item.name}
                        {activeModule === 'bac-subjects' && `${item.coefficient || 1}`}
                        {(activeModule === 'formations' && item.nomEtablissement) || '-'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {activeModule === 'bac-subjects' && (item.category || '-')}
                        {(activeModule === 'formations' && item.filiere) || '-'}
                        {['cities', 'regions', 'bac-series'].includes(activeModule) && (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {item.active ? 'Actif' : 'Inactif'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {activeModule === 'bac-subjects' || activeModule === 'formations' ? (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {item.active ? 'Actif' : 'Inactif'}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleToggleActive(item)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
                            {item.active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                          </button>
                          <button type="button" onClick={() => handleEdit(item)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
                            <Edit3 size={16} />
                          </button>
                          <button type="button" onClick={() => handleDelete(item)} className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => fetchItems(activeModule, Math.max(1, pagination.page - 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Précédent</button>
              <span className="text-sm font-semibold text-slate-500">Page {pagination.page}/{pagination.pages}</span>
              <button type="button" onClick={() => fetchItems(activeModule, Math.min(pagination.pages, pagination.page + 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Suivant</button>
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-black text-slate-800">{editingId ? 'Modifier' : 'Ajouter'}</h4>
              <p className="text-sm text-slate-500">Formulaire de saisie moderne</p>
            </div>
            <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
              Réinitialiser
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {activeModule === 'cities' && (
              <>
                <input value={formData.name || ''} onChange={(event) => handleFieldChange('name', event.target.value)} placeholder="Nom de la ville" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" required />
                <input value={formData.region || ''} onChange={(event) => handleFieldChange('region', event.target.value)} placeholder="Région (facultatif)" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <textarea value={formData.description || ''} onChange={(event) => handleFieldChange('description', event.target.value)} placeholder="Description" rows={3} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input type="checkbox" checked={Boolean(formData.active)} onChange={(event) => handleFieldChange('active', event.target.checked)} />
                  Ville active
                </label>
              </>
            )}

            {activeModule === 'regions' && (
              <>
                <input value={formData.name || ''} onChange={(event) => handleFieldChange('name', event.target.value)} placeholder="Nom de la région" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" required />
                <textarea value={formData.description || ''} onChange={(event) => handleFieldChange('description', event.target.value)} placeholder="Description" rows={3} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input type="checkbox" checked={Boolean(formData.active)} onChange={(event) => handleFieldChange('active', event.target.checked)} />
                  Région active
                </label>
              </>
            )}

            {activeModule === 'bac-series' && (
              <>
                <input value={formData.code || ''} onChange={(event) => handleFieldChange('code', event.target.value)} placeholder="Code de série (A1, C, G2...)" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" required />
                <input value={formData.name || ''} onChange={(event) => handleFieldChange('name', event.target.value)} placeholder="Nom de la série" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" required />
                <textarea value={formData.description || ''} onChange={(event) => handleFieldChange('description', event.target.value)} placeholder="Description" rows={3} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <input value={formData.order || 0} onChange={(event) => handleFieldChange('order', event.target.value)} type="number" placeholder="Ordre d'affichage" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input type="checkbox" checked={Boolean(formData.active)} onChange={(event) => handleFieldChange('active', event.target.checked)} />
                  Série active
                </label>
              </>
            )}

            {activeModule === 'bac-subjects' && (
              <>
                <input value={formData.name || ''} onChange={(event) => handleFieldChange('name', event.target.value)} placeholder="Nom de la matière" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" required />
                <input value={formData.coefficient || 1} onChange={(event) => handleFieldChange('coefficient', event.target.value)} type="number" placeholder="Coefficient" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <input value={formData.category || ''} onChange={(event) => handleFieldChange('category', event.target.value)} placeholder="Catégorie" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <textarea value={formData.description || ''} onChange={(event) => handleFieldChange('description', event.target.value)} placeholder="Description" rows={3} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <div className="rounded-2xl border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Séries associées</p>
                  <div className="flex flex-wrap gap-2">
                    {seriesOptions.map((entry) => {
                      const checked = (formData.series || []).includes(entry._id);
                      return (
                        <label key={entry._id} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${checked ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>
                          <input type="checkbox" className="mr-2" checked={checked} onChange={() => {
                            const current = formData.series || [];
                            const next = checked ? current.filter((value) => value !== entry._id) : [...current, entry._id];
                            handleFieldChange('series', next);
                          }} />
                          {entry.code}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input type="checkbox" checked={Boolean(formData.active)} onChange={(event) => handleFieldChange('active', event.target.checked)} />
                  Matière active
                </label>
              </>
            )}

            {activeModule === 'formations' && (
              <>
                <input value={formData.id || ''} onChange={(event) => handleFieldChange('id', event.target.value)} placeholder="Identifiant (ex. UAO-INFO)" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" required />
                <input value={formData.nomEtablissement || ''} onChange={(event) => handleFieldChange('nomEtablissement', event.target.value)} placeholder="Nom de l'établissement" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <input value={formData.filiere || ''} onChange={(event) => handleFieldChange('filiere', event.target.value)} placeholder="Filière" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <input value={formData.typeEtablissement || ''} onChange={(event) => handleFieldChange('typeEtablissement', event.target.value)} placeholder="Type d'établissement" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={formData.ville || ''} onChange={(event) => handleFieldChange('ville', event.target.value)} placeholder="Ville" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                  <input value={formData.region || ''} onChange={(event) => handleFieldChange('region', event.target.value)} placeholder="Région" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                </div>
                <input value={formData.modeAcces || ''} onChange={(event) => handleFieldChange('modeAcces', event.target.value)} placeholder="Mode d'accès" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <input value={formData.prix || 0} onChange={(event) => handleFieldChange('prix', event.target.value)} type="number" placeholder="Prix" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                  <input value={formData.duree || 0} onChange={(event) => handleFieldChange('duree', event.target.value)} type="number" placeholder="Durée" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                  <input value={formData.ageLimite || 0} onChange={(event) => handleFieldChange('ageLimite', event.target.value)} type="number" placeholder="Âge limite" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                </div>
                <textarea value={formData.conditions?.bacsAcceptes?.join(', ') || ''} onChange={(event) => handleNestedFieldChange('conditions', 'bacsAcceptes', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))} placeholder="Séries acceptées (séparées par des virgules)" rows={2} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <textarea value={JSON.stringify(formData.conditions?.notesMinimales || {}, null, 2)} onChange={(event) => handleNestedFieldChange('conditions', 'notesMinimales', JSON.parse(event.target.value || '{}'))} placeholder="Notes minimales (JSON)" rows={3} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <textarea value={(formData.debouches || []).join(', ')} onChange={(event) => handleFieldChange('debouches', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))} placeholder="Débouchés (séparés par des virgules)" rows={2} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <textarea value={JSON.stringify(formData.scoreWeights || {}, null, 2)} onChange={(event) => handleFieldChange('scoreWeights', JSON.parse(event.target.value || '{}'))} placeholder="Poids du score (JSON)" rows={3} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={Boolean(formData.bourses?.disponible)} onChange={(event) => handleNestedFieldChange('bourses', 'disponible', event.target.checked)} />
                    Bourses disponibles
                  </label>
                  <input value={formData.bourses?.montant || 0} onChange={(event) => handleNestedFieldChange('bourses', 'montant', Number(event.target.value))} type="number" placeholder="Montant de bourse" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={Boolean(formData.logement)} onChange={(event) => handleFieldChange('logement', event.target.checked)} />
                    Logement
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={Boolean(formData.alternance)} onChange={(event) => handleFieldChange('alternance', event.target.checked)} />
                    Alternance
                  </label>
                </div>
                <textarea value={formData.partenaires?.join(', ') || ''} onChange={(event) => handleFieldChange('partenaires', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))} placeholder="Partenaires (séparés par des virgules)" rows={2} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <input value={formData.stages || ''} onChange={(event) => handleFieldChange('stages', event.target.value)} placeholder="Stages" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <input value={formData.taux_employabilite || 0} onChange={(event) => handleFieldChange('taux_employabilite', Number(event.target.value))} type="number" placeholder="Taux d’employabilité" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input type="checkbox" checked={Boolean(formData.active)} onChange={(event) => handleFieldChange('active', event.target.checked)} />
                  Catalogue actif
                </label>
              </>
            )}

            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-70">
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
              {editingId ? 'Enregistrer les modifications' : 'Créer un référentiel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReferentialAdminPanel;
