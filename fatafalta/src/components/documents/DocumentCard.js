import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Download, FileText } from 'lucide-react-native';
import Card from '../ui/Card';
import Text from '../ui/Text';
import Badge from '../ui/Badge';
import DocumentMeta from './DocumentMeta';
import { getFileIcon } from '../../utils/fileIcons';
import { formatDate } from '../../utils/format';
import theme from '../../theme/tokens';
import ProgressBar from '../ui/ProgressBar';

/**
 * Document card component for lists
 */
const DocumentCard = ({
  document,
  onPress,
  isDownloading,
  downloadProgress,
  isDownloaded,
}) => {
  const fileConfig = getFileIcon(document.fileType || document.extension);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
      <Card onPress={onPress} style={styles.card} shadow="sm">
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Badge
                label={fileConfig.label}
                color={fileConfig.color}
                backgroundColor={fileConfig.bgColor}
                icon={<FileText size={12} color={fileConfig.color} />}
              />
              {document.correction ? (
                <Badge
                  label="Corrigé"
                  color={theme.colors.success}
                  backgroundColor={theme.colors.successWash}
                  style={styles.correctionBadge}
                />
              ) : null}
            </View>
            <Text variant="caption" color={theme.colors.textMuted}>
              {formatDate(document.createdAt)}
            </Text>
          </View>

          <Text variant="h3" style={styles.title} numberOfLines={2}>
            {document.title || document.originalFileName || (document.documentType === 'corrige' ? 'Corrigé' : 'Document PDF')}
          </Text>

          {document.description ? (
            <Text variant="body" color={theme.colors.textSecondary} style={styles.description} numberOfLines={2}>
              {document.description}
            </Text>
          ) : null}

          <DocumentMeta document={document} style={styles.meta} />

          <View style={styles.footer}>
            <View style={styles.stats}>
              <Download size={14} color={theme.colors.textMuted} />
              <Text variant="caption" color={theme.colors.textMuted} style={styles.statText}>
                {document.downloads || 0}
              </Text>
            </View>

            {isDownloaded && (
              <Text variant="caption" color={theme.colors.success} style={styles.statusText}>
                Hors ligne
              </Text>
            )}

            {isDownloading && (
              <View style={styles.downloadingContainer}>
                <Text variant="caption" color={theme.colors.primary} style={styles.statusText}>
                  Téléchargement...
                </Text>
              </View>
            )}
          </View>
        </View>

        {isDownloading && (
          <ProgressBar progress={downloadProgress} style={styles.progress} />
        )}
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  description: {
    marginBottom: theme.spacing.md,
  },
  meta: {
    marginBottom: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: theme.spacing.xs,
  },
  statusText: {
    fontWeight: '600',
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 0,
  },
  correctionBadge: {
    marginLeft: theme.spacing.sm,
  },
});

export default DocumentCard;
