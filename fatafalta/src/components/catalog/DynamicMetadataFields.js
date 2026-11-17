import { useQueryClient } from '@tanstack/react-query';
import { useServerQuery, useServerQueries } from '../../hooks/useServerQuery';
import { catalogQueries, useParcours } from '../../hooks/useCatalog';
import { queryKeys } from '../../services/queryKeys';
import { upsertEntity } from '../../services/queryCache';
import { useTheme } from '../../theme/ThemeProvider';
import { getErrorMessage } from '../../utils/userMessages';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MetadataSelect from '../ui/MetadataSelect';
import Text from '../ui/Text';

import { createCatalogNode, createMatiere, createOrganisme, createParcoursType } from '../../services/dynamicCatalog';

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
  const { theme } = useTheme();
  const [createdOrganisme, setCreatedOrganisme] = useState(null);
  const [createdParcoursType, setCreatedParcoursType] = useState(null);
  const [createdMatiere, setCreatedMatiere] = useState(null);
  const [createdNodes, setCreatedNodes] = useState({});

  const organisme = value?.organisme || null;
  const path = value?.path || [];
  const client = useQueryClient();
  const organismsQuery = useServerQuery(catalogQueries.organismes());
  const structureQuery = useServerQuery(catalogQueries.structure(organisme?._id));
  const parcoursQuery = useParcours(organisme?._id);
  const mattersQuery = useServerQuery(catalogQueries.matieres(organisme?._id));
  const organismes = organismsQuery.data || [];
  const structure = structureQuery.data;
  const parcoursTypes = (parcoursQuery.data?.data || []).map(normalize);
  const matieres = mattersQuery.data || [];
  const levels = useMemo(() => structure?.niveaux || [], [structure]);
  const nodeParams = levels.slice(0, Math.min(levels.length, path.length + 1)).map((level, index) => ({
    organismeId: organisme?._id, parentId: index ? path[index - 1]?._id : null, type: level.type,
  }));
  const nodeQueries = useServerQueries(nodeParams.map(catalogQueries.nodes));
  const nodesByLevel = nodeQueries.map((query) => query.data || []);
  const organismesLoading = organismsQuery.isLoading;
  const loading = structureQuery.isLoading || parcoursQuery.isLoading || mattersQuery.isLoading;
  const nodesLoading = nodeQueries.some((query) => query.isLoading);
  const failure = [organismsQuery, structureQuery, parcoursQuery, mattersQuery, ...nodeQueries].find((query) => query.error && !query.data)?.error;
  const catalogError = failure ? getErrorMessage(failure, 'catalogue', 'vous') : null;
  useEffect(() => {
    if (structure && value.structureLength !== levels.length) onChange({ ...value, structureLength: levels.length });
  }, [structure, levels.length, value, onChange]);
  useEffect(() => {
    const current = organismes.find((item) => item._id === organisme?._id);
    if (current && current.name !== organisme.name) onChange({ ...value, organisme: current });
  }, [organismsQuery.data, organisme?._id, organisme?.name]);

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
    client.setQueryData(queryKeys.nodes(nodeParams[index]), (items) => upsertEntity(items, created));
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
          client.setQueryData(queryKeys.organismes(), (items) => upsertEntity(items, created));
          setCreatedOrganisme(created);
          return created;
        }}
        disabled={organismesLoading}
        loading={organismesLoading}
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
                    client.setQueryData(queryKeys.parcours(organisme._id), (data) => ({ ...data, data: upsertEntity(data?.data, created) }));
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
              loading={nodesLoading || loading}
              disabled={nodesLoading || loading || (index > 0 && !path[index - 1])}
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
                client.setQueryData(queryKeys.matieres(organisme._id), (items) => upsertEntity(items, created));
                setCreatedMatiere(created);
                return created;
              }}
              error={error?.matiere}
            />
          )}
        </>
      )}

      {(loading || nodesLoading || organismesLoading) && <ActivityIndicator size="small" color={theme.colors.primary} />}
      {catalogError && <Text variant="caption" color={theme.colors.error}>{catalogError}</Text>}
    </View>
  );
};

export { getPathFromLeaf };
export default DynamicMetadataFields;
