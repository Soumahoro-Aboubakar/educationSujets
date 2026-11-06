import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, ChevronRight, FileText } from 'lucide-react-native';
import Text from '../ui/Text';
import DocumentMeta from './DocumentMeta';
import ProgressBar from '../ui/ProgressBar';
import { formatDate } from '../../utils/format';
import { getDocumentTitle, getExtensionLabel, hasCorrection as documentHasCorrection } from '../../utils/document';
import theme from '../../theme/tokens';

const { brand } = theme;

/**
 * Ligne de sujet. Hiérarchie : le titre d'abord (ce que l'on cherche),
 * puis ce qui aide à décider de l'ouvrir (corrigé, disponibilité hors ligne).
 * Les compteurs de téléchargement, peu utiles à l'étudiant, ne sont plus affichés ici.
 */
const DocumentCard = ({ document, onPress, isDownloading, downloadProgress, isDownloaded }) => {
  const title = getDocumentTitle(document);
  const hasCorrection = documentHasCorrection(document);
  const date = formatDate(document.dateAjout || document.createdAt);

  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}${hasCorrection ? ', corrigé disponible' : ''}`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.tile}>
          {hasCorrection ? <View style={styles.tileFold} /> : null}
          <FileText size={18} color={brand.burgundy} strokeWidth={1.7} />
          <Text style={styles.tileLabel}>{getExtensionLabel(document)}</Text>
          {isDownloaded ? (
            <View style={styles.tileBadge}>
              <Check size={9} color={brand.onInk} strokeWidth={3} />
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text variant="h3" style={styles.title} numberOfLines={3} textBreakStrategy="balanced">{title}</Text>
          {document.description ? (
            <Text variant="caption" style={styles.description} numberOfLines={1}>{document.description}</Text>
          ) : null}
          <DocumentMeta document={document} style={styles.legacyMeta} />
          <View style={styles.meta}>
            {hasCorrection ? <Tag label="Corrigé" tone="gold" /> : null}
            {isDownloading ? (
              <Text variant="caption" style={styles.metaText}>Téléchargement… {Math.round((downloadProgress || 0) * 100)} %</Text>
            ) : isDownloaded ? (
              <Text variant="caption" style={styles.metaText}>Hors ligne</Text>
            ) : date ? (
              <Text variant="caption" style={styles.metaText}>{date}</Text>
            ) : null}
          </View>
          {isDownloading ? (
            <ProgressBar progress={downloadProgress} color={brand.burgundy} style={styles.progress} />
          ) : null}
        </View>

        <View style={styles.chevron}><ChevronRight size={16} color={brand.burgundy} strokeWidth={2.4} /></View>
      </Pressable>
    </Animated.View>
  );
};

export const Tag = ({ label, tone = 'neutral' }) => (
  <View style={[styles.tag, tone === 'gold' && styles.tagGold]}>
    <Text style={[styles.tagLabel, tone === 'gold' && styles.tagLabelGold]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: brand.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
    ...theme.shadows.soft,
  },
  pressed: {
    backgroundColor: brand.paperDim,
    transform: [{ scale: 0.985 }],
  },
  tileFold: {
    position: 'absolute',
    top: -StyleSheet.hairlineWidth,
    right: -StyleSheet.hairlineWidth,
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderLeftWidth: 12,
    borderTopColor: brand.paper,
    borderLeftColor: brand.goldLight,
    borderTopRightRadius: 6,
  },
  tile: {
    width: 44,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: brand.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.lineStrong,
    borderRadius: 8,
  },
  tileLabel: {
    color: brand.inkSoft,
    fontFamily: theme.fontFamily.semiBold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  tileBadge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: brand.paper,
    backgroundColor: brand.gold,
  },
  body: {
    flex: 1,
  },
  title: {
    color: brand.ink,
    fontFamily: theme.fontFamily.semiBold,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.15,
  },
  description: {
    marginTop: 2,
    color: brand.inkSoft,
    fontFamily: theme.fontFamily.regular,
    fontSize: 13,
  },
  legacyMeta: {
    marginTop: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 6,
  },
  metaText: {
    color: brand.inkMuted,
    fontFamily: theme.fontFamily.regular,
    fontSize: 12,
  },
  progress: {
    height: 2,
    marginTop: theme.spacing.sm,
    backgroundColor: brand.line,
  },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.burgundyWash,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: brand.paperDim,
  },
  tagGold: {
    backgroundColor: brand.goldWash,
  },
  tagLabel: {
    color: brand.inkSoft,
    fontFamily: theme.fontFamily.semiBold,
    fontSize: 11,
    lineHeight: 15,
  },
  tagLabelGold: {
    color: brand.goldInk,
  },
});

export default DocumentCard;
