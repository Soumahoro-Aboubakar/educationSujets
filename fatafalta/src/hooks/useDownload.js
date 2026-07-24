import { useState, useCallback } from 'react';
import { Alert, Share } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDownloadUrl } from '../services/documents';
import useDownloadStore from '../store/useDownloadStore';

export const openDownloadedFile = async (document, { getLocalUri, removeDownload }) => {
  const documentId = document?._id;
  if (!documentId) return;

  const localUri = getLocalUri(documentId);
  if (!localUri) {
    Alert.alert('Fichier introuvable', 'Ce document n’est pas encore disponible localement.');
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) {
      await removeDownload(documentId);
      Alert.alert('Fichier introuvable', 'Le fichier a été supprimé du stockage local.');
      return;
    }

    const contentUri = await FileSystem.getContentUriAsync(localUri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1,
      type: document.mimeType || '*/*',
    });
  } catch (error) {
    console.error('Open error:', error);
    Alert.alert(
      'Erreur d’ouverture',
      'Impossible d’ouvrir le fichier. Vérifiez qu’une application compatible est installée.'
    );
  }
};

export const shareDownloadedFile = async (document, { getLocalUri }) => {
  const documentId = document?._id;
  if (!documentId) return;

  const localUri = getLocalUri(documentId);
  if (!localUri) {
    Alert.alert('Fichier introuvable', 'Ce document n’est pas encore disponible localement.');
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) {
      Alert.alert('Fichier introuvable', 'Le fichier a été supprimé du stockage local.');
      return;
    }

    await Sharing.shareAsync(localUri, {
      UTI: document.mimeType || 'application/pdf',
      mimeType: document.mimeType || 'application/pdf',
      dialogTitle: `Partager ${document.title}`,
    });
  } catch (error) {
    console.error('Share error:', error);
    Alert.alert('Erreur de partage', 'Impossible de partager ce document pour le moment.');
  }
};

/**
 * Hook to manage downloading and opening a document
 * @param {Object} document
 * @returns
 */
export const useDownload = (document) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const { startDownload, isDownloaded, getLocalUri, activeDownloads, removeDownload } =
    useDownloadStore();

  const id = document?._id;
  const isCurrentlyDownloading = activeDownloads[id]?.downloading;
  const progress = activeDownloads[id]?.progress || 0;
  const downloaded = isDownloaded(id);

  const handleDownload = useCallback(async () => {
    if (!id || isCurrentlyDownloading) return;

    try {
      setIsInitializing(true);
      const { url } = await getDownloadUrl(id);

      if (!url) {
        throw new Error('Impossible de récupérer le lien de téléchargement');
      }

      const fileName = document.originalFileName || document.file;
      await startDownload(id, url, document, fileName);
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Erreur de téléchargement',
        error.message || 'Une erreur est survenue lors du téléchargement'
      );
    } finally {
      setIsInitializing(false);
    }
  }, [id, document, isCurrentlyDownloading, startDownload]);

  const handleOpen = useCallback(async () => {
    if (!id || !downloaded) return;
    await openDownloadedFile(document, { getLocalUri, removeDownload });
  }, [id, downloaded, getLocalUri, document, removeDownload]);

  const handleShare = useCallback(async () => {
    if (!id || !downloaded) return;
    await shareDownloadedFile(document, { getLocalUri });
  }, [id, downloaded, getLocalUri, document]);

  return {
    isInitializing,
    isDownloading: isCurrentlyDownloading,
    progress,
    isDownloaded: downloaded,
    download: handleDownload,
    open: handleOpen,
    share: handleShare,
  };
};
