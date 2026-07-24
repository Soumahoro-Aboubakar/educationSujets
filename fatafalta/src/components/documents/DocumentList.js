import React from 'react';
import { FlatList, StyleSheet, View, RefreshControl } from 'react-native';
import DocumentCard from './DocumentCard';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import theme from '../../theme/tokens';
import useDownloadStore from '../../store/useDownloadStore';

/**
 * List of documents with loading, empty states, and infinite scroll
 */
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
  ListHeaderComponent,
}) => {
  const { activeDownloads, isDownloaded } = useDownloadStore();

  const renderItem = ({ item }) => {
    const isDownloading = !!activeDownloads[item._id]?.downloading;
    const progress = activeDownloads[item._id]?.progress || 0;
    const downloaded = isDownloaded(item._id);

    return (
      <DocumentCard
        document={item}
        onPress={() => onDocumentPress && onDocumentPress(item)}
        isDownloading={isDownloading}
        downloadProgress={progress}
        isDownloaded={downloaded}
      />
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map((key) => (
        <View key={key} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <Skeleton width={60} height={24} />
            <Skeleton width={80} height={16} />
          </View>
          <Skeleton width="90%" height={24} style={styles.skeletonTitle} />
          <Skeleton width="70%" height={16} style={styles.skeletonDesc} />
          <View style={styles.skeletonTags}>
            <Skeleton width={80} height={24} />
            <Skeleton width={100} height={24} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <Skeleton width={150} height={20} />
      </View>
    );
  };

  if (isLoading && documents.length === 0) {
    return (
      <View style={styles.container}>
        {ListHeaderComponent}
        {renderSkeleton()}
      </View>
    );
  }

  return (
    <FlatList
      data={documents}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      contentContainerStyle={[
        styles.listContent,
        documents.length === 0 && styles.emptyContent,
      ]}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <EmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
        />
      }
      ListFooterComponent={renderFooter}
      onEndReached={hasNextPage ? onLoadMore : null}
      onEndReachedThreshold={0.5}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing['4xl'],
  },
  emptyContent: {
    flexGrow: 1,
  },
  skeletonContainer: {
    padding: theme.spacing.md,
  },
  skeletonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  skeletonTitle: {
    marginBottom: theme.spacing.sm,
  },
  skeletonDesc: {
    marginBottom: theme.spacing.lg,
  },
  skeletonTags: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  footerLoader: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
});

export default DocumentList;
