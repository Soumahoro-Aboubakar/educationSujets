import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MetadataSelect from '../ui/MetadataSelect';
import Text from '../ui/Text';
import theme from '../../theme/tokens';
import { createCatalogNode, fetchNodes } from '../../services/institutions';

const labelFor = (type) => String(type || '')
  .replace(/[-_]/g, ' ')
  .replace(/^./, (letter) => letter.toUpperCase());

/**
 * Renders a configured institution path one level at a time. Options are fetched
 * only for the selected parent, which keeps large catalogs off the device.
 */
const TaxonomyPathFields = ({ institution, value = [], onChange, error, disabled = false }) => {
  const structure = useMemo(() => institution?.navigationStructure || [], [institution]);
  const [optionsByLevel, setOptionsByLevel] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPathOptions = async () => {
      if (!institution?._id || !structure.length) {
        if (active) setOptionsByLevel([]);
        return;
      }

      setIsLoading(true);
      const nextOptions = [];
      let nextPath = Array.isArray(value) ? value.filter(Boolean) : [];

      try {
        for (let index = 0; index < structure.length; index += 1) {
          const parent = index === 0 ? 'root' : nextPath[index - 1];
          if (index > 0 && !parent) break;

          const result = await fetchNodes({
            institution: institution._id,
            parent,
            type: structure[index],
            limit: 100,
          });
          const options = result.data || [];
          nextOptions[index] = options;

          if (!nextPath[index] || !options.some((option) => option._id === nextPath[index])) {
            nextPath = nextPath.slice(0, index);
            break;
          }
        }

        if (!active) return;
        setOptionsByLevel(nextOptions);
        if (nextPath.join('|') !== value.join('|')) onChange(nextPath);
      } catch (requestError) {
        if (active) setOptionsByLevel([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadPathOptions();
    return () => { active = false; };
  }, [institution?._id, onChange, structure, value]);

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
    setOptionsByLevel((current) => {
      const next = [...current];
      const options = next[index] || [];
      next[index] = [...options.filter((option) => option._id !== node._id), node]
        .sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
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
          disabled={disabled || (index > 0 && !value[index - 1])}
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
