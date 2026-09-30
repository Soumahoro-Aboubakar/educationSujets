import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import DocumentCard from './DocumentCard';
import Skeleton from '../ui/Skeleton';
import StateView from '../ui/StateView';
import useDownloadStore from '../../store/useDownloadStore';
import theme from '../../theme/tokens';

const { brand } = theme;

// Squelette calqué sur DocumentCard (vignette + titre + méta).
export const DocumentSkeleton = () => (
  <View accessible accessibilityLabel="Chargement des sujets">
    {['82%', '64%', '74%', '58%'].map((width, index) => (
      <React.Fragment key={index}>
        {index > 0 ? <Separator /> : null}
        <View style={styles.skeletonRow}>
          <Skeleton width={40} height={50} borderRadius={6} style={styles.skeletonTone} />
          <View style={styles.skeletonBody}>
            <Skeleton width={width} height={15} borderRadius={4} style={styles.skeletonTone} />
            <Skeleton width="30%" height={11} borderRadius={4} style={[styles.skeletonTone, styles.skeletonMeta]} />
          </View>
        </View>
      </React.Fragment>
    ))}
  </View>
);

const DocumentList = ({
  documents = [],
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  onLoadMore,
  onRefresh,
  isRefreshing = false,
  onDocumentPress,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateIcon = FileText,
  ListHeaderComponent,
  dimmed = false,
}) => {
  const { activeDownloads, isDownloaded } = useDownloadStore();

  const renderItem = ({ item }) => (
    <DocumentCard
      document={item}
      onPress={() => onDocumentPress?.(item)}
      isDownloading={!!activeDownloads[item._id]?.downloading}
      downloadProgress={activeDownloads[item._id]?.progress || 0}
      isDownloaded={isDownloaded(item._id)}
    />
  );

  if (isLoading && !documents.length) {
    return (
      <View style={styles.list}>
        {ListHeaderComponent}
        <DocumentSkeleton />
      </View>
    );
  }

  return (
    <FlatList
      data={documents}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      style={dimmed && styles.dimmed}
      contentContainerStyle={[styles.list, !documents.length && styles.emptyContent]}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={(
        <StateView icon={emptyStateIcon} title={emptyStateTitle} description={emptyStateDescription} />
      )}
      ListFooterComponent={isFetchingNextPage ? (
        <ActivityIndicator size="small" color={brand.inkMuted} style={styles.footer} />
      ) : null}
      onEndReached={hasNextPage ? onLoadMore : null}
      onEndReachedThreshold={0.45}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={onRefresh ? (
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[brand.ink]}
          tintColor={brand.ink}
        />
      ) : undefined}
      showsVerticalScrollIndicator={false}
    />
  );
};

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  list: {
    flexGrow: 1,
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.spacing['4xl'],
  },
  emptyContent: {
    flexGrow: 1,
  },
  dimmed: {
    opacity: 0.55,
  },
  separator: {
    marginLeft: 54,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.line,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: theme.spacing.base,
  },
  skeletonBody: {
    flex: 1,
    paddingTop: 2,
  },
  skeletonTone: {
    backgroundColor: brand.skeleton,
  },
  skeletonMeta: {
    marginTop: 10,
  },
  footer: {
    paddingVertical: theme.spacing.xl,
  },
});

export default DocumentList;
