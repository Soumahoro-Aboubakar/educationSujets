import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft, Download, Eye, FileText, Building2, GraduationCap,
  Calendar, Layers, FolderOpen, Share2, CheckCircle2, Sparkles
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { useDocument } from '../hooks/useDocument';
import { useDownload } from '../hooks/useDownload';
import { getFileIcon } from '../utils/fileIcons';
import { formatDate, formatFileSize } from '../utils/format';
import theme from '../theme/tokens';

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon size={16} color={theme.colors.textMuted} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text variant="caption" color={theme.colors.textMuted}>{label}</Text>
        <Text variant="bodyMedium" color={theme.colors.textPrimary}>{value}</Text>
      </View>
    </View>
  );
};

const DocumentDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { documentId, document: initialDocument } = route.params;

  const { data: document = initialDocument } = useDocument(documentId);
  const { download, open, share, isDownloading, progress, isDownloaded, isInitializing } = useDownload(document);

  const fileConfig = getFileIcon(document?.fileType || document?.extension);

  if (!document) return null;

  const handleAction = () => {
    if (isDownloaded) {
      open();
    } else {
      download();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          icon={<ArrowLeft size={22} color={theme.colors.textPrimary} />}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <Text variant="h3" style={styles.headerTitle} numberOfLines={1}>
          Détail du document
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={[styles.iconBox, { backgroundColor: fileConfig.bgColor }]}> 
            <FileText size={36} color={fileConfig.color} />
          </View>
          <Badge
            label={fileConfig.label}
            color={fileConfig.color}
            backgroundColor={fileConfig.bgColor}
            style={styles.badge}
          />
          <Text variant="h2" align="center" style={styles.title}>
            {document.title}
          </Text>
          <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.date}>
            Ajouté le {formatDate(document.createdAt)}
          </Text>
          <View style={styles.heroPills}>
            <View style={styles.pill}>
              <Sparkles size={14} color={theme.colors.accent} />
              <Text variant="caption" color={theme.colors.textSecondary} style={styles.pillText}>Prêt mobile</Text>
            </View>
            <View style={styles.pill}>
              <Download size={14} color={theme.colors.primary} />
              <Text variant="caption" color={theme.colors.textSecondary} style={styles.pillText}>{document.downloads || 0} téléchargements</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Download size={18} color={theme.colors.primary} />
            <Text variant="h3" style={styles.statValue}>{document.downloads || 0}</Text>
            <Text variant="caption" color={theme.colors.textMuted}>Téléchargements</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Eye size={18} color={theme.colors.accent} />
            <Text variant="h3" style={styles.statValue}>{document.views || 0}</Text>
            <Text variant="caption" color={theme.colors.textMuted}>Vues</Text>
          </View>
        </View>

        {isDownloaded ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <CheckCircle2 size={22} color={theme.colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">Prêt à ouvrir</Text>
              <Text variant="body" color={theme.colors.textSecondary} style={styles.successText}>
                Ce PDF est disponible localement. Ouvrez-le, partagez-le ou revenez-y plus tard.
              </Text>
              <View style={styles.quickActions}>
                <Button
                  variant="primary"
                  title="Ouvrir"
                  icon={<FileText size={16} color={theme.colors.textInverse} />}
                  onPress={open}
                  style={styles.quickActionButton}
                />
                <Button
                  variant="secondary"
                  title="Partager"
                  icon={<Share2 size={16} color={theme.colors.primary} />}
                  onPress={share}
                  style={styles.quickActionButton}
                />
              </View>
            </View>
          </View>
        ) : null}

        {document.description ? (
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>Description</Text>
            <Text variant="body" color={theme.colors.textSecondary}>
              {document.description}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Informations</Text>
          <View style={styles.infoCard}>
            <InfoRow icon={Building2} label="Université" value={document.university?.name} />
            <InfoRow icon={Layers} label="Département" value={document.department?.name} />
            <InfoRow icon={GraduationCap} label="Niveau" value={document.level?.name} />
            <InfoRow icon={Calendar} label="Session" value={document.semester?.displayName || document.semester?.name} />
            <InfoRow icon={FolderOpen} label="Catégorie" value={document.category?.name} />
            <InfoRow icon={FileText} label="Taille" value={formatFileSize(document.fileSize)} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        {isDownloading && (
          <View style={styles.progressContainer}>
            <Text variant="caption" color={theme.colors.primary} style={styles.progressText}>
              Téléchargement en cours... {Math.round(progress * 100)}%
            </Text>
            <ProgressBar progress={progress} />
          </View>
        )}

        <Button
          variant={isDownloaded ? 'secondary' : 'accent'}
          title={isDownloaded ? 'Ouvrir le PDF' : 'Télécharger le PDF'}
          icon={isDownloaded ? <FileText size={18} color={theme.colors.primary} /> : <Download size={18} color={theme.colors.textInverse} />}
          onPress={handleAction}
          loading={isInitializing}
          disabled={isDownloading}
          style={styles.actionButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 140,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.md,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  badge: {
    marginBottom: theme.spacing.md,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  date: {
    marginBottom: theme.spacing.md,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryWash,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  pillText: {
    marginLeft: theme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.borderLight,
  },
  statValue: {
    marginTop: theme.spacing.xs,
    marginBottom: 2,
  },
  successCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.successWash,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  successIcon: {
    marginRight: theme.spacing.md,
    paddingTop: 2,
  },
  successText: {
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  quickActionButton: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl, // Safe area approx
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    ...theme.shadows.lg,
  },
  actionButton: {
    width: '100%',
  },
  progressContainer: {
    marginBottom: theme.spacing.sm,
  },
  progressText: {
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
});

export default DocumentDetailScreen;
