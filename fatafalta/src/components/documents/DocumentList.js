import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import DocumentCard from './DocumentCard';
import Skeleton from '../ui/Skeleton';
import Text from '../ui/Text';
import useDownloadStore from '../../store/useDownloadStore';
import theme from '../../theme/tokens';

const NAVY = '#0D1B32';
const SOFT = '#4F5E72';
const BURGUNDY = '#6C2838';
const LINE = '#DED8CC';

const DocumentList = ({ documents = [], isLoading = false, isFetchingNextPage = false, hasNextPage = false, onLoadMore, onRefresh, isRefreshing = false, onDocumentPress, emptyStateTitle, emptyStateDescription, ListHeaderComponent }) => {
  const { activeDownloads, isDownloaded } = useDownloadStore();
  const renderItem = ({ item }) => <DocumentCard document={item} onPress={() => onDocumentPress?.(item)} isDownloading={!!activeDownloads[item._id]?.downloading} downloadProgress={activeDownloads[item._id]?.progress || 0} isDownloaded={isDownloaded(item._id)} />;
  const skeleton = <View style={styles.skeletonContainer}>{[1, 2, 3, 4].map((key) => <View key={key} style={styles.skeletonRow}><View style={styles.skeletonTop}><Skeleton width={46} height={11} /><Skeleton width={68} height={11} /></View><Skeleton width="78%" height={21} style={styles.skeletonTitle} /><Skeleton width="52%" height={14} /></View>)}</View>;
  const empty = <View style={styles.empty}><FileText size={31} color={BURGUNDY} strokeWidth={1.45} /><Text variant="h3" style={styles.emptyTitle} align="center">{emptyStateTitle}</Text><Text variant="body" style={styles.emptyDescription} align="center">{emptyStateDescription}</Text></View>;
  if (isLoading && !documents.length) return <View style={styles.container}><View style={styles.list}>{ListHeaderComponent}{skeleton}</View></View>;
  return <FlatList data={documents} keyExtractor={(item) => item._id} renderItem={renderItem} contentContainerStyle={[styles.list, !documents.length && styles.emptyContent]} ListHeaderComponent={ListHeaderComponent} ListEmptyComponent={empty} ListFooterComponent={isFetchingNextPage ? <View style={styles.footer}><ActivityIndicator size="small" color={BURGUNDY} /><Text variant="caption" style={styles.footerText}>Chargement des sujets…</Text></View> : null} onEndReached={hasNextPage ? onLoadMore : null} onEndReachedThreshold={.45} refreshControl={onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[BURGUNDY]} tintColor={BURGUNDY} /> : undefined} showsVerticalScrollIndicator={false} />;
};

const styles = StyleSheet.create({
  container: { flex: 1 }, list: { flexGrow: 1, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing['4xl'] }, emptyContent: { flexGrow: 1 }, skeletonContainer: { paddingTop: theme.spacing.sm }, skeletonRow: { paddingVertical: theme.spacing.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE }, skeletonTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }, skeletonTitle: { marginBottom: theme.spacing.sm }, empty: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.xl }, emptyTitle: { marginTop: theme.spacing.base, color: NAVY }, emptyDescription: { maxWidth: 285, marginTop: theme.spacing.sm, color: SOFT }, footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl }, footerText: { color: SOFT },
});

export default DocumentList;
