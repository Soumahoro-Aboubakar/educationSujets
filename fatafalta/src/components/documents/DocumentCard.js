import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight, Download } from 'lucide-react-native';
import Text from '../ui/Text';
import DocumentMeta from './DocumentMeta';
import { getFileIcon } from '../../utils/fileIcons';
import { formatDate } from '../../utils/format';
import theme from '../../theme/tokens';
import ProgressBar from '../ui/ProgressBar';

const NAVY = '#0D1B32';
const SOFT = '#4F5E72';
const BURGUNDY = '#6C2838';
const GOLD = '#B48A48';
const LINE = '#DED8CC';

const DocumentCard = ({ document, onPress, isDownloading, downloadProgress, isDownloaded }) => {
  const fileConfig = getFileIcon(document.fileType || document.extension);
  const fade = useRef(new Animated.Value(0)).current;
  const title = document.title || document.titre || document.originalFileName || (document.documentType === 'corrige' ? 'Corrigé' : 'Document PDF');

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${title}`} android_ripple={{ color: 'rgba(13,27,50,.05)' }} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.topline}>
          <View style={styles.kind}><View style={[styles.kindRule, { backgroundColor: fileConfig.label === 'PDF' ? BURGUNDY : GOLD }]} /><Text variant="overline" style={styles.kindLabel}>{fileConfig.label}</Text>{document.correction ? <Text variant="overline" style={styles.correction}>Corrigé</Text> : null}</View>
          <Text variant="caption" style={styles.date}>{formatDate(document.createdAt)}</Text>
        </View>
        <Text variant="h3" style={styles.title} numberOfLines={2}>{title}</Text>
        {document.description ? <Text variant="body" style={styles.description} numberOfLines={2}>{document.description}</Text> : null}
        <DocumentMeta document={document} style={styles.meta} />
        <View style={styles.footer}><View style={styles.downloads}><Download size={14} color={SOFT} strokeWidth={1.8} /><Text variant="caption" style={styles.downloadText}>{document.downloads || 0}</Text></View><View style={styles.footerAction}>{isDownloaded ? <Text variant="caption" style={styles.offline}>Hors ligne</Text> : isDownloading ? <Text variant="caption" style={styles.downloading}>Téléchargement…</Text> : <Text variant="caption" style={styles.open}>Ouvrir</Text>}<ArrowUpRight size={16} color={isDownloaded ? GOLD : BURGUNDY} strokeWidth={1.85} /></View></View>
        {isDownloading ? <ProgressBar progress={downloadProgress} color={BURGUNDY} style={styles.progress} /> : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { position: 'relative', paddingVertical: theme.spacing.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE }, pressed: { backgroundColor: 'rgba(13,27,50,.035)' }, topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }, kind: { flexDirection: 'row', alignItems: 'center', gap: 6 }, kindRule: { width: 12, height: 2 }, kindLabel: { color: BURGUNDY, fontSize: 10, letterSpacing: 1.05 }, correction: { color: GOLD, fontSize: 10, letterSpacing: .9 }, date: { color: SOFT, fontSize: 11 }, title: { color: NAVY, fontFamily: theme.fontFamily.semiBold, fontSize: 17, lineHeight: 22 }, description: { marginTop: theme.spacing.xs, color: SOFT, fontSize: 13, lineHeight: 19 }, meta: { marginTop: theme.spacing.md }, footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.md, paddingTop: theme.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE }, downloads: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }, downloadText: { color: SOFT, fontSize: 11 }, footerAction: { flexDirection: 'row', alignItems: 'center', gap: 6 }, offline: { color: GOLD, fontFamily: theme.fontFamily.semiBold, fontSize: 11 }, downloading: { color: BURGUNDY, fontFamily: theme.fontFamily.semiBold, fontSize: 11 }, open: { color: BURGUNDY, fontFamily: theme.fontFamily.semiBold, fontSize: 11 }, progress: { position: 'absolute', right: 0, bottom: 0, left: 0, height: 2, borderRadius: 0 },
});

export default DocumentCard;
