import { useServerQueries } from '../../hooks/useServerQuery';
import { useQueryClient } from '@tanstack/react-query';
import { catalogQueries } from '../../hooks/useCatalog';
import { queryKeys } from '../../services/queryKeys';
import { upsertEntity } from '../../services/queryCache';
import { useTheme } from '../../theme/ThemeProvider';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MetadataSelect from '../ui/MetadataSelect';
import Text from '../ui/Text';

import { createCatalogNode } from '../../services/institutions';

const labelFor = (type) => String(type || '')
  .replace(/[-_]/g, ' ')
  .replace(/^./, (letter) => letter.toUpperCase());

/**
 * Renders a configured institution path one level at a time. Options are fetched
 * only for the selected parent, which keeps large catalogs off the device.
 */
const TaxonomyPathFields = ({ institution, value = [], onChange, error, disabled = false }) => {
  const { theme } = useTheme();
  const structure = useMemo(() => institution?.navigationStructure || [], [institution]);
  const client = useQueryClient();
  const params = institution?._id ? structure.slice(0, Math.min(structure.length, value.length + 1)).map((type, index) => ({
    institution: institution._id, parent: index ? value[index - 1] : 'root', type, limit: 100,
  })) : [];
  const queries = useServerQueries(params.map(catalogQueries.institutionNodes));
  const optionsByLevel = queries.map((query) => query.data?.data || []);
  const isLoading = queries.some((query) => query.isLoading);
  useEffect(() => {
    for (let index = 0; index < queries.length; index += 1) {
      if (!queries[index].data) break;
      if (value[index] && !queries[index].data.data.some((option) => option._id === value[index])) {
        onChange(value.slice(0, index));
        break;
      }
    }
  }, [queries, value, onChange]);

  if (!institution?._id) return null;

  const handleSelect = (index, selectedId) => {
    const nextPath = selectedId ? [...value.slice(0, index), selectedId] : value.slice(0, index);
    onChange(nextPath);
  };

  const createAtLevel = (index) => async (name) => {
    const node = await createCatalogNode({
      institution: institution._id,
      parent: index === 0 ? null : value[index - 1],
      type: structure[index],
      name,
    });
    client.setQueryData(queryKeys.institutionNodes(params[index]), (data) => ({
      ...data, data: upsertEntity(data?.data, node).sort((a, b) => a.name.localeCompare(b.name)),
    }));
    return node;
  };

  return (
    <View>
      <Text variant="bodyMedium" color={theme.colors.textSecondary} style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xs }}>
        Structure de {institution.name}
      </Text>
      {structure.map((type, index) => (
        <MetadataSelect
          key={`${institution._id}-${type}`}
          label={labelFor(type)}
          placeholder={`Sélectionner ou créer ${labelFor(type).toLowerCase()}`}
          options={optionsByLevel[index] || []}
          value={value[index] || null}
          onChange={(selectedId) => handleSelect(index, selectedId)}
          onCreate={createAtLevel(index)}
          loading={isLoading}
          disabled={disabled || isLoading || (index > 0 && !value[index - 1])}
          error={index === structure.length - 1 ? error : undefined}
        />
      ))}
      {isLoading ? (
        <View style={{ paddingVertical: theme.spacing.xs, alignItems: 'flex-start' }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

export default TaxonomyPathFields;
