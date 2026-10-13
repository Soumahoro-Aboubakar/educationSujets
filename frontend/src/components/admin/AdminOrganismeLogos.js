import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import OrganismeLogo from '../catalog/OrganismeLogo';
import OrganismeLogoEditor from './OrganismeLogoEditor';
import { errorMessage } from '../../lib/api';

/**
 * Onglet « Logos des organismes » (administrateur) : tous les organismes avec leur logo actuel ;
 * un clic ouvre l'éditeur (ajout, remplacement, suppression, aperçu).
 */
const AdminOrganismeLogos = () => {
  const [organismes, setOrganismes] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await axios.get('/api/organismes', { params: { limit: 100 } });
      const data = response.data.data || [];
      setOrganismes(data);
      setSelectedId((current) => current || data[0]?._id || '');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Impossible de charger les organismes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => organismes.find((item) => item._id === selectedId), [organismes, selectedId]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Identité des organismes</p>
            <h2 className="text-2xl font-black text-slate-800">Logos des organismes</h2>
            <p className="mt-1 text-sm text-slate-500">Choisissez un organisme pour ajouter, remplacer ou supprimer son logo.</p>
          </div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">
            <RefreshCw size={16} /> Actualiser
          </button>
        </div>

        {error ? <p role="alert" className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}
        {loading && !organismes.length ? <p className="py-8 text-center text-sm text-slate-500">Chargement…</p> : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {organismes.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => setSelectedId(item._id)}
              aria-pressed={item._id === selectedId}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${item._id === selectedId ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <OrganismeLogo organisme={item} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-slate-800">{item.nom}</span>
                <span className="block text-xs text-slate-500">{item.logo ? 'Logo défini' : 'Sans logo (initiales)'}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <OrganismeLogoEditor
          organisme={selected}
          onSaved={(updated) => setOrganismes((items) => items.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)))}
        />
      ) : null}
    </div>
  );
};

export default AdminOrganismeLogos;
