import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MetadataSelect from '../ui/MetadataSelect';
import Text from '../ui/Text';
import theme from '../../theme/tokens';
import {
  createCatalogNode,
  createMatiere,
  createOrganisme,
  createParcoursType,
  fetchCatalogNodes,
  fetchMatieres,
  fetchOrganismeStructure,
  fetchOrganismes,
  fetchParcoursTypes,
} from '../../services/dynamicCatalog';

const labelFor = (level) => level?.libelleSingulier || level?.type || 'Niveau';
const normalize = (item) => (item ? { ...item, name: item.name || item.nom } : item);

const getPathFromLeaf = (leaf) => {
  const path = [];
  let current = leaf;
  while (current) {
    path.unshift(normalize(current));
    current = current.parentId && typeof current.parentId === 'object' ? current.parentId : null;
  }
  return path;
};

const DynamicMetadataFields = ({ value, onChange, error }) => {
  const [organismes, setOrganismes] = useState([]);
  const [structure, setStructure] = useState(null);
  const [parcoursTypes, setParcoursTypes] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [nodesByLevel, setNodesByLevel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const [createdOrganisme, setCreatedOrganisme] = useState(null);
  const [createdParcoursType, setCreatedParcoursType] = useState(null);
  const [createdMatiere, setCreatedMatiere] = useState(null);
  const [createdNodes, setCreatedNodes] = useState({});

  const organisme = value?.organisme || null;
  const path = value?.path || [];
  const levels = useMemo(() => structure?.niveaux || [], [structure]);

  useEffect(() => {
    let active = true;
    fetchOrganismes()
      .then((items) => {
        if (!active) return;
        setOrganismes(items);
        if (organisme?._id) {
          const current = items.find((item) => item._id === organisme._id);
          if (current && current.name !== organisme.name) onChange({ ...value, organisme: current });
        }
      })
      .catch(() => active && setCatalogError('Impossible de charger les organismes.'));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!organisme?._id) {
      setStructure(null);
      setParcoursTypes([]);
      setMatieres([]);
      setNodesByLevel([]);
      return undefined;
    }

    setLoading(true);
    setCatalogError(null);
    Promise.all([
      fetchOrganismeStructure(organisme._id),
      fetchParcoursTypes(organisme._id),
      fetchMatieres(organisme._id),
    ])
      .then(([nextStructure, nextParcoursTypes, nextMatieres]) => {
        if (!active) return;
        setStructure(nextStructure);
        setParcoursTypes(nextParcoursTypes);
        setMatieres(nextMatieres);
        if (value.structureLength !== (nextStructure?.niveaux || []).length) {
          onChange({ ...value, structureLength: (nextStructure?.niveaux || []).length });
        }
      })
      .catch(() => active && setCatalogError('Impossible de charger le catalogue de cet organisme.'))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [organisme?._id]);

  useEffect(() => {
    let active = true;
    const loadNodes = async () => {
      if (!organisme?._id || !levels.length) return;
      const nextOptions = [];
      try {
        for (let index = 0; index < levels.length; index += 1) {
          const parentId = index ? path[index - 1]?._id : null;
          if (index && !parentId) break;
          nextOptions[index] = await fetchCatalogNodes({
            organismeId: organisme._id,
            parentId,
            type: levels[index].type,
          });
        }
        if (active) setNodesByLevel(nextOptions);
      } catch (requestError) {
        if (active) setCatalogError('Impossible de charger les niveaux du catalogue.');
      }
    };
    loadNodes();
    return () => { active = false; };
  }, [organisme?._id, levels, path]);

  const selectOrganisme = (organismeId, created) => {
    const selected = organismes.find((item) => item._id === organismeId)
      || created
      || (createdOrganisme?._id === organismeId ? createdOrganisme : null);
    onChange({ organisme: selected, path: [], matiere: null, hasParcoursType: null, parcoursType: null });
  };

  const selectPath = (index, nodeId, created) => {
    const selected = (nodesByLevel[index] || []).find((item) => item._id === nodeId)
      || created
      || (createdNodes[index]?._id === nodeId ? createdNodes[index] : null);
    onChange({ ...value, path: selected ? [...path.slice(0, index), selected] : path.slice(0, index), matiere: null });
  };

  const handleCreateNode = (index) => async (nom) => {
    const created = await createCatalogNode({
      organismeId: organisme._id,
      parentId: index ? path[index - 1]?._id : null,
      nom,
    });
    setNodesByLevel((current) => {
      const next = [...current];
      next[index] = [...(next[index] || []), created];
      return next;
    });
    setCreatedNodes((current) => ({ ...current, [index]: created }));
    return created;
  };

  const selectedLeaf = path.length === levels.length && path.length ? path[path.length - 1] : null;

  return (
    <View>
      <Text variant="h3" style={{ marginTop: theme.spacing.sm }}>Catalogue du sujet</Text>
      <Text variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 4, marginBottom: theme.spacing.sm }}>
        Les niveaux, dont l'année, dépendent de l'organisme sélectionné.
      </Text>

      <MetadataSelect
        label="Organisme"
        placeholder="Sélectionner ou créer un organisme"
        options={organismes}
        value={organisme?._id || null}
        onChange={selectOrganisme}
        onCreate={async (name) => {
          const created = await createOrganisme(name);
          setOrganismes((current) => [...current, created]);
          setCreatedOrganisme(created);
          return created;
        }}
        error={error?.organisme}
      />

      {organisme && (
        <>
          <Text variant="bodyMedium" color={theme.colors.textSecondary} style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
            Type de parcours
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <MetadataSelect
              label=""
              placeholder="Oui / Non"
              options={[{ _id: 'true', name: 'Oui' }, { _id: 'false', name: 'Non' }]}
              value={value.hasParcoursType === null ? null : String(value.hasParcoursType)}
              onChange={(selected) => onChange({ ...value, hasParcoursType: selected === 'true', parcoursType: null })}
              error={error?.parcoursType}
            />
            {value.hasParcoursType === true && (
              <View style={{ flex: 2 }}>
                <MetadataSelect
                  label=""
                  placeholder="Sélectionner ou créer"
                  options={parcoursTypes}
                  value={value.parcoursType?._id || null}
                  onChange={(selected, created) => onChange({
                    ...value,
                    parcoursType: parcoursTypes.find((item) => item._id === selected)
                      || created
                      || (createdParcoursType?._id === selected ? createdParcoursType : null),
                  })}
                  onCreate={async (name) => {
                    const created = await createParcoursType(organisme._id, name);
                    setParcoursTypes((current) => [...current, created]);
                    setCreatedParcoursType(created);
                    return created;
                  }}
                />
              </View>
            )}
          </View>

          {levels.map((level, index) => (
            <MetadataSelect
              key={`${organisme._id}-${level.type}`}
              label={labelFor(level)}
              placeholder={`Sélectionner ou créer ${labelFor(level).toLowerCase()}`}
              options={nodesByLevel[index] || []}
              value={path[index]?._id || null}
              onChange={(selected) => selectPath(index, selected)}
              onCreate={handleCreateNode(index)}
              disabled={index > 0 && !path[index - 1]}
              error={index === levels.length - 1 ? error?.path : undefined}
            />
          ))}

          {selectedLeaf && (
            <MetadataSelect
              label="Matière"
              placeholder="Sélectionner ou créer une matière"
              options={matieres}
              value={value.matiere?._id || null}
              onChange={(selected, created) => onChange({
                ...value,
                matiere: matieres.find((item) => item._id === selected)
                  || created
                  || (createdMatiere?._id === selected ? createdMatiere : null),
              })}
              onCreate={async (name) => {
                const created = await createMatiere(organisme._id, name);
                setMatieres((current) => [...current, created]);
                setCreatedMatiere(created);
                return created;
              }}
              error={error?.matiere}
            />
          )}
        </>
      )}

      {loading && <ActivityIndicator size="small" color={theme.colors.primary} />}
      {catalogError && <Text variant="caption" color={theme.colors.error}>{catalogError}</Text>}
    </View>
  );
};

export { getPathFromLeaf };
export default DynamicMetadataFields;