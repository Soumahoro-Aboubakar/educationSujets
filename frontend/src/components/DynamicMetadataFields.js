import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import SelectOrCreate from './SelectOrCreate';

// Shared by the regular upload and draft forms. Unlike the former "year"
// shortcut, this component follows every level declared by the organism.
const DynamicMetadataFields = ({ value, onChange }) => {
  const [structure, setStructure] = useState(null);
  const [error, setError] = useState('');
  const [parcoursTypes, setParcoursTypes] = useState([]);
  const organisme = value.organisme || null;
  const path = value.path || [];
  const matiere = value.matiere || null;
  const levels = useMemo(() => structure?.niveaux || [], [structure]);
  const canChooseMatiere = Boolean(levels.length && path.length === levels.length);
  const shouldAskForParcours = Boolean(organisme);
  const hasParcoursType = value.hasParcoursType === true;

  useEffect(() => {
    let active = true;
    if (!organisme?._id) {
      setStructure(null);
      setParcoursTypes([]);
      setError('');
      return undefined;
    }

    setStructure(null);
    setError('');
    axios.get(`/api/structures/${organisme._id}`)
      .then((response) => {
        if (!active) return;
        setStructure(response.data.data?.structure || null);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.response?.status === 404
          ? 'Cet organisme doit d’abord recevoir un gabarit.'
          : 'Impossible de charger le gabarit.');
      });

    axios.get(`/api/organismes/${organisme._id}/parcours-types`)
      .then((response) => {
        if (!active) return;
        const items = response.data.data || [];
        setParcoursTypes(items);
      })
      .catch(() => {
        if (active) setParcoursTypes([]);
      });

    return () => { active = false; };
  }, [organisme?._id]);

  const searchOrganismes = async (recherche) => {
    const response = await axios.get('/api/organismes', { params: { recherche, limit: 20 } });
    return response.data.data || [];
  };
  const createOrganisme = async (nom) => {
    const response = await axios.post('/api/organismes', { nom });
    return response.data.data;
  };
  const searchNodes = async (recherche, parentId) => {
    if (!organisme?._id) return [];
    const response = await axios.get('/api/noeuds', {
      params: { organismeId: organisme._id, parentId: parentId || undefined, recherche, limit: 30 },
    });
    return response.data.data || [];
  };
  const createNode = async (nom, parentId) => {
    const response = await axios.post('/api/noeuds/trouver-ou-creer', {
      organismeId: organisme._id,
      parentId: parentId || null,
      nom,
    });
    return response.data.data;
  };
  const searchMatieres = async (recherche) => {
    if (!organisme?._id) return [];
    const response = await axios.get('/api/matieres', { params: { organismeId: organisme._id, recherche, limit: 30 } });
    return response.data.data || [];
  };
  const createMatiere = async (nom) => {
    const response = await axios.post('/api/matieres/trouver-ou-creer', { organismeId: organisme._id, nom });
    return response.data.data;
  };

  const selectOrganisme = (item) => {
    const isNew = Boolean(item.__isNew);
    onChange({
      ...value,
      organisme: item,
      path: [],
      matiere: null,
      hasParcoursType: null,
      parcoursType: null,
      isNewOrganisme: isNew,
    });
  };
  const selectNode = (index, item) => {
    const nextPath = [...path.slice(0, index), item];
    onChange({ ...value, organisme, path: nextPath, matiere: null });
  };

  const searchParcoursTypes = async (recherche) => {
    if (!organisme?._id) return [];
    if (!recherche.trim()) return parcoursTypes;
    const response = await axios.get(`/api/organismes/${organisme._id}/parcours-types`);
    const items = response.data.data || [];
    return items.filter((item) => item.nom.toLowerCase().includes(recherche.trim().toLowerCase()));
  };

  const createParcoursType = async (nom) => {
    const response = await axios.post(`/api/organismes/${organisme._id}/parcours-types`, { nom, isDefault: true });
    const created = response.data.data;
    const nextValue = { ...value, hasParcoursType: true, parcoursType: created, isNewOrganisme: false };
    onChange(nextValue);
    return created;
  };

  return (
    <div className="sm:col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-700">Catalogue dynamique</p>
      <div className="grid gap-4 md:grid-cols-3">
        <SelectOrCreate
          label="Organisme"
          placeholder="Sélectionner ou créer"
          value={organisme}
          onSelect={selectOrganisme}
          search={searchOrganismes}
          create={async (nom) => {
            const response = await axios.post('/api/organismes', { nom });
            const created = response.data.data;
            return { ...created, __isNew: true };
          }}
        />
        {shouldAskForParcours && (
          <div className="rounded-2xl bg-white p-3 border border-slate-200 md:col-span-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Existe-t-il un type de parcours pour cet organisme ?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => onChange({ ...value, hasParcoursType: true, parcoursType: null })} className={`rounded-xl px-4 py-2 text-sm font-bold ${hasParcoursType ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Oui</button>
              <button type="button" onClick={() => onChange({ ...value, hasParcoursType: false, parcoursType: null, isNewOrganisme: false })} className={`rounded-xl px-4 py-2 text-sm font-bold ${value.hasParcoursType === false ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Non</button>
            </div>
          </div>
        )}
        {shouldAskForParcours && hasParcoursType && (
          <SelectOrCreate
            label="Type de parcours"
            placeholder="Sélectionner ou créer le type"
            value={value.parcoursType || null}
            onSelect={(item) => onChange({ ...value, hasParcoursType: true, parcoursType: item, isNewOrganisme: false })}
            search={searchParcoursTypes}
            create={createParcoursType}
            getLabel={(item) => item.nom || item.name}
          />
        )}
        {levels.map((level, index) => (
          <SelectOrCreate
            key={`${level.type}-${index}`}
            label={level.libelleSingulier}
            placeholder={organisme ? `Sélectionner ou créer ${level.libelleSingulier.toLowerCase()}` : 'Choisir un organisme d’abord'}
            value={path[index] || null}
            onSelect={(item) => selectNode(index, item)}
            search={(recherche) => searchNodes(recherche, path[index - 1]?._id)}
            create={(nom) => createNode(nom, path[index - 1]?._id)}
            disabled={!organisme || index > path.length}
          />
        ))}
        {canChooseMatiere && (
          <SelectOrCreate
            label="Matière"
            placeholder="Sélectionner ou créer une matière"
            value={matiere}
            onSelect={(item) => onChange({ ...value, organisme, path, matiere: item })}
            search={searchMatieres}
            create={createMatiere}
          />
        )}
      </div>
      {organisme && !structure && !error && <p className="mt-3 text-xs font-semibold text-slate-500">Chargement du gabarit…</p>}
      {error && <p className="mt-3 text-xs font-semibold text-amber-700">{error}</p>}
    </div>
  );
};

export default DynamicMetadataFields;
