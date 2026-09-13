import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Building2, GraduationCap, Calendar, Layers } from 'lucide-react-native';
import theme from '../../theme/tokens';
import Text from '../ui/Text';

/**
 * Metadata tags for a document (University, Level, etc.)
 */
const DocumentMeta = ({ document, style }) => {
  const metaItems = [
    {
      value: document.institution?.abbreviation || document.institution?.name,
      icon: Building2,
    },
    {
      value: document.university?.abbreviation || document.university?.name,
      icon: Building2,
    },
    {
      value: document.level?.name,
      icon: GraduationCap,
    },
    {
      value: document.semester?.name,
      icon: Calendar,
    },
    {
      value: document.department?.name,
      icon: Layers,
    },
    ...(document.taxonomyNodes || []).map((node) => ({
      value: node?.name,
      icon: Layers,
    })),
  ].filter((item) => item.value);

  if (metaItems.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      {metaItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <View key={index} style={styles.tag}>
            <Icon size={12} color={theme.colors.textSecondary} />
            <Text variant="caption" color={theme.colors.textSecondary} style={styles.tagText} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    gap: theme.spacing.xs,
    maxWidth: '100%',
  },
  tagText: {
    fontSize: 11,
    flexShrink: 1,
  },
});

export default DocumentMeta;
