/**
 * Download Store (Zustand) — manages offline downloaded documents
 */

import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { DOWNLOAD_DIR } from '../types/constants';

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}${DOWNLOAD_DIR}/`;
const METADATA_FILE = `${DOWNLOADS_DIR}metadata.json`;

/**
 * Ensure the downloads directory exists
 */
const ensureDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
};

/**
 * Persist metadata to disk
 */
const persistMetadata = async (downloads) => {
  await ensureDir();
  await FileSystem.writeAsStringAsync(
    METADATA_FILE,
    JSON.stringify(downloads),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
};

/**
 * Load metadata from disk
 */
const loadMetadata = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(METADATA_FILE);
    if (!fileInfo.exists) return {};

    const content = await FileSystem.readAsStringAsync(METADATA_FILE, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(content);
  } catch {
    return {};
  }
};

const useDownloadStore = create((set, get) => ({
  /** @type {Object.<string, { document: Object, localUri: string, downloadedAt: string }>} */
  downloads: {},

  /** @type {Object.<string, { progress: number, downloading: boolean }>} */
  activeDownloads: {},

  /** Whether the store has been hydrated from disk */
  hydrated: false,

  /**
   * Hydrate from persisted metadata on app start
   */
  hydrate: async () => {
    const downloads = await loadMetadata();

    // Verify files still exist
    const verified = {};
    for (const [id, entry] of Object.entries(downloads)) {
      try {
        const info = await FileSystem.getInfoAsync(entry.localUri);
        if (info.exists) {
          verified[id] = entry;
        }
      } catch {
        // File missing — skip
      }
    }

    set({ downloads: verified, hydrated: true });
    if (Object.keys(verified).length !== Object.keys(downloads).length) {
      await persistMetadata(verified);
    }
  },

  /**
   * Check if a document is downloaded
   * @param {string} documentId
   * @returns {boolean}
   */
  isDownloaded: (documentId) => {
    return !!get().downloads[documentId];
  },

  /**
   * Get local URI for a downloaded document
   * @param {string} documentId
   * @returns {string|null}
   */
  getLocalUri: (documentId) => {
    return get().downloads[documentId]?.localUri || null;
  },

  /**
   * Start downloading a document
   * @param {string} documentId
   * @param {string} downloadUrl - Signed URL from backend
   * @param {Object} document - Document metadata to persist
   * @param {string} fileName - File name for local storage
   * @returns {Promise<string>} - Local URI
   */
  startDownload: async (documentId, downloadUrl, document, fileName) => {
    await ensureDir();

    const localUri = `${DOWNLOADS_DIR}${documentId}_${fileName}`;

    set((state) => ({
      activeDownloads: {
        ...state.activeDownloads,
        [documentId]: { progress: 0, downloading: true },
      },
    }));

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localUri,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;

          set((state) => ({
            activeDownloads: {
              ...state.activeDownloads,
              [documentId]: { progress, downloading: true },
            },
          }));
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (result?.uri) {
        const newDownloads = {
          ...get().downloads,
          [documentId]: {
            document,
            localUri: result.uri,
            downloadedAt: new Date().toISOString(),
          },
        };

        set((state) => ({
          downloads: newDownloads,
          activeDownloads: {
            ...state.activeDownloads,
            [documentId]: { progress: 1, downloading: false },
          },
        }));

        await persistMetadata(newDownloads);
        return result.uri;
      }

      throw new Error('Download failed — no URI returned');
    } catch (error) {
      set((state) => {
        const updated = { ...state.activeDownloads };
        delete updated[documentId];
        return { activeDownloads: updated };
      });
      throw error;
    }
  },

  /**
   * Remove a downloaded document
   * @param {string} documentId
   */
  removeDownload: async (documentId) => {
    const entry = get().downloads[documentId];
    if (!entry) return;

    try {
      await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
    } catch {
      // File may already be gone
    }

    const newDownloads = { ...get().downloads };
    delete newDownloads[documentId];

    set({ downloads: newDownloads });
    await persistMetadata(newDownloads);
  },

  /**
   * Get all downloaded documents as array (sorted by most recent)
   * @returns {Array}
   */
  getDownloadedDocuments: () => {
    return Object.entries(get().downloads)
      .map(([id, entry]) => ({
        id,
        ...entry,
      }))
      .sort((a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt));
  },
}));

export default useDownloadStore;
