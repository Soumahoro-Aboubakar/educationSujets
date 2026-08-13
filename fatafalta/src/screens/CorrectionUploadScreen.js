import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Search,
  UploadCloud,
  X,
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ImageEditorModal from '../components/documents/ImageEditorModal';
import AuthContext from '../context/AuthContext';
import LockedFeatureScreen from './LockedFeatureScreen';
import { fetchDocuments, uploadCorrectionDocument, getDownloadUrl } from '../services/documents';
import {
  applyWatermarkToExistingPdf,
  cleanTempDirectory,
  generatePdfFromImages,
  MAX_IMPORTED_PDF_SIZE_BYTES,
} from '../services/pdfService';
import { formatDate, formatFileSize } from '../utils/format';
import theme from '../theme/tokens';

const isPdfDocument = (document) => {
  const extension = String(document?.extension || '').replace('.', '').toLowerCase();
  return document?.mimeType === 'application/pdf' || document?.fileType === 'PDF' || extension === 'pdf';
};

const getApiErrorMessage = (error) =>
  error.response?.data?.error || error.response?.data?.message || error.message || 'Erreur lors de l’association du corrigé';

const CorrectionUploadScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const isAndroid = Platform.OS === 'android';
  const canManageCorrections = user?.role === 'admin';

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [inputMode, setInputMode] = useState(null);
  const [images, setImages] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLocalUri, setPdfLocalUri] = useState(null);
  const [pdfIntentUri, setPdfIntentUri] = useState(null);
  const [pdfWebViewUri, setPdfWebViewUri] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [webviewAvailable, setWebviewAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [displayLimit, setDisplayLimit] = useState(6);
  const [loadingPreviewId, setLoadingPreviewId] = useState(null);

  const withTimeout = async (promise, timeoutMs, errorMessage) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const getIntentUri = async (fileUri) => {
    if (!isAndroid) return fileUri;
    if (fileUri?.startsWith('content://')) return fileUri;

    try {
      return await withTimeout(
        FileSystem.getContentUriAsync(fileUri),
        10000,
        'Création de l’URI Android trop longue'
      );
    } catch (error) {
      console.warn('Unable to create Android content URI:', error);
      return null;
    }
  };

  const normalizeDocumentPickerResult = (result) => {
    if (!result || result.canceled || result.type === 'cancel') return null;
    if (Array.isArray(result.assets) && result.assets.length > 0) return result.assets[0];
    if (result.uri) return result;
    return null;
  };

  const resetCorrectionFile = () => {
    setPdfFile(null);
    setPdfLocalUri(null);
    setPdfIntentUri(null);
    setPdfWebViewUri(null);
    setShowPdfPreview(false);
  };

  const resetAll = () => {
    setSelectedSubject(null);
    setInputMode(null);
    setImages([]);
    resetCorrectionFile();
  };

  const loadSubjects = useCallback(async () => {
    if (!canManageCorrections) return;

    try {
      setLoadingSubjects(true);
      const result = await fetchDocuments({ search: debouncedSearch, limit: 100 });
      const pdfSubjects = (result.data || []).filter((document) => {
        return isPdfDocument(document) && document.documentType !== 'corrige';
      });
      setSubjects(pdfSubjects);
    } catch (error) {
      console.warn('Unable to load documents for correction:', error);
      Alert.alert('Erreur', 'Impossible de charger les documents');
    } finally {
      setLoadingSubjects(false);
    }
  }, [canManageCorrections, debouncedSearch]);

  useEffect(() => {
    try {
      // eslint-disable-next-line global-require
      require('react-native-webview');
      setWebviewAvailable(true);
    } catch (err) {
      setWebviewAvailable(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubjects();
    setRefreshing(false);
  };

  const handleSelectSubject = (document) => {
    if (document.correction) {
      Alert.alert('Corrigé déjà lié', 'Ce document possède déjà une proposition de correction.');
      return;
    }
    setSelectedSubject(document);
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      setInputMode('images');
      resetCorrectionFile();
      const newImages = result.assets.map((asset) => asset.uri);
      setImages((previous) => [...previous, ...newImages]);
    }
  };

  const pickPdf = async () => {
    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        base64: false,
        multiple: false,
      });
    } catch (error) {
      console.error('DocumentPicker error:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier PDF.');
      return;
    }

    const file = normalizeDocumentPickerResult(result);
    if (!file?.uri) {
      if (result && !result.canceled) {
        console.warn('DocumentPicker result without a valid file asset:', result);
      }
      return;
    }

    if (typeof file.size === 'number' && file.size > MAX_IMPORTED_PDF_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const maxMb = Math.round(MAX_IMPORTED_PDF_SIZE_BYTES / (1024 * 1024));
      Alert.alert('Fichier trop volumineux', `Ce PDF fait ${sizeMb} Mo. La taille maximale acceptée est ${maxMb} Mo.`);
      return;
    }

    setInputMode('pdf');
    setImages([]);
    
    // Un léger délai permet à l'UI de se mettre à jour (ex: fermeture du sélecteur DocumentPicker) 
    // avant d'entamer le décodage lourd qui bloque le thread JS. 
    // Ceci empêche le crash/rebuild d'Expo Go constaté sur certains appareils Android.
    setTimeout(() => {
      processLocalPdf(file.uri);
    }, 500);
  };

  const processLocalPdf = async (fileUri) => {
    setIsProcessing(true);
    try {
      const result = await applyWatermarkToExistingPdf(fileUri);
      setPdfFile(result);
      setPdfLocalUri(result.uri);
      setPdfIntentUri(await getIntentUri(result.uri));
      setPdfWebViewUri(isAndroid ? null : result.uri);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', error.message || 'Erreur lors du traitement du PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (index) => {
    setImages((previous) => previous.filter((_, imageIndex) => imageIndex !== index));
  };

  const generatePDF = async () => {
    if (images.length === 0) {
      Alert.alert('Images requises', 'Sélectionnez au moins une image.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await generatePdfFromImages(images);
      setPdfFile(result);
      setPdfLocalUri(result.uri);
      setPdfIntentUri(await getIntentUri(result.uri));
      setPdfWebViewUri(isAndroid ? null : result.uri);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', error.message || 'Erreur lors de la création du PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenPreview = async () => {
    if (isAndroid) {
      if (!pdfIntentUri) return;

      try {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: pdfIntentUri,
          flags: 1,
          type: 'application/pdf',
        });
      } catch (error) {
        console.warn('Unable to open Android preview intent:', error);
        Alert.alert('Erreur', "Impossible d'ouvrir le fichier");
      }
      return;
    }

    if (!pdfLocalUri) return;
    Linking.openURL(pdfLocalUri).catch(() => {
      Alert.alert('Erreur', "Impossible d'ouvrir le fichier");
    });
  };

  const submitCorrection = async () => {
    if (!selectedSubject) {
      Alert.alert('Document requis', 'Sélectionnez le document principal.');
      return;
    }

    if (!pdfFile?.uri) {
      Alert.alert('PDF requis', 'Ajoutez ou générez le PDF de correction.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: pdfFile.uri,
        name: pdfFile.name || `corrige_${Date.now()}.pdf`,
        type: pdfFile.mimeType || 'application/pdf',
      });

      await uploadCorrectionDocument(selectedSubject._id, formData);
      await cleanTempDirectory();
      await loadSubjects();
      Alert.alert('Succès', 'Le corrigé a été associé au document.');
      resetAll();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewSubject = async (document) => {
    try {
      setLoadingPreviewId(document._id);
      const downloadData = await getDownloadUrl(document._id);
      if (downloadData && downloadData.url) {
        Linking.openURL(downloadData.url).catch(() => {
          Alert.alert("Erreur", "Impossible d'ouvrir le lien dans le navigateur.");
        });
      }
    } catch (e) {
      console.warn("Erreur de prévisualisation du sujet", e);
      Alert.alert("Erreur", "Impossible d'obtenir le lien du sujet.");
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const renderSubjectCard = (document) => {
    const selected = selectedSubject?._id === document._id;
    const hasCorrection = !!document.correction;

    return (
      <Card
        key={document._id}
        onPress={() => handleSelectSubject(document)}
        style={[styles.subjectCard, selected && styles.subjectCardSelected, hasCorrection && styles.subjectCardDisabled]}
        shadow="sm"
      >
        <View style={styles.subjectHeader}>
          <View style={styles.subjectIconBox}>
            <FileText size={20} color={theme.colors.primary} strokeWidth={2.2} />
          </View>
          <View style={styles.subjectInfo}>
            <Text variant="bodyMedium" numberOfLines={2} style={styles.subjectTitle}>
              {document.title || document.originalFileName || 'Document PDF'}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
              {formatDate(document.createdAt)} · {formatFileSize(document.fileSize)}
            </Text>
          </View>
          {selected ? (
            <CheckCircle2 size={22} color={theme.colors.success} strokeWidth={2.2} />
          ) : null}
        </View>
        <View style={styles.subjectFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Badge
              label={hasCorrection ? 'Corrigé lié' : 'Sans corrigé'}
              color={hasCorrection ? theme.colors.success : theme.colors.primary}
              backgroundColor={hasCorrection ? theme.colors.successWash : theme.colors.primaryWash}
              icon={hasCorrection ? <CheckCircle2 size={12} color={theme.colors.success} /> : <Link2 size={12} color={theme.colors.primary} />}
            />
            
            <TouchableOpacity 
              style={styles.previewSubjectButton} 
              onPress={() => handlePreviewSubject(document)}
              disabled={loadingPreviewId === document._id}
            >
              {loadingPreviewId === document._id ? (
                 <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Eye size={14} color={theme.colors.primary} />
                  <Text variant="caption" color={theme.colors.primary} style={{ marginLeft: 4, fontWeight: '600' }}>
                    Voir le sujet
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  if (!canManageCorrections) {
    return (
      <LockedFeatureScreen
        title="Correction réservée"
        description="Seuls les administrateurs peuvent associer une proposition de correction."
        feature="Associer un PDF corrigé à un document existant"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          icon={<ArrowLeft size={22} color={theme.colors.textPrimary} />}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <View style={styles.headerText}>
          <Text variant="h3" numberOfLines={1}>Associer un corrigé</Text>
          <Text variant="caption" color={theme.colors.textMuted} numberOfLines={1}>Admin</Text>
        </View>
        <TouchableOpacity style={styles.headerIconButton} onPress={handleRefresh} disabled={loadingSubjects}>
          <RefreshCw size={20} color={theme.colors.primary} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text variant="h3">Document principal</Text>
          <Text variant="caption" color={theme.colors.textMuted}>{subjects.length} PDF</Text>
        </View>

        <View style={styles.searchBox}>
          <Search size={18} color={theme.colors.textMuted} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un sujet"
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={theme.hitSlop}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loadingSubjects && !refreshing ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : subjects.length === 0 ? (
          <EmptyState title="Aucun PDF" description="Aucun document PDF disponible pour cette recherche." />
        ) : (
          <View>
            <View style={styles.subjectList}>
              {subjects.slice(0, displayLimit).map(renderSubjectCard)}
            </View>
            {subjects.length > displayLimit && (
              <Button 
                title="Voir plus" 
                variant="ghost" 
                onPress={() => setDisplayLimit((prev) => prev + 20)}
                style={{ marginTop: 12 }} 
              />
            )}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text variant="h3">PDF de correction</Text>
          <Text variant="caption" color={theme.colors.textMuted}>{inputMode === 'images' ? 'Images' : inputMode === 'pdf' ? 'PDF local' : 'Non choisi'}</Text>
        </View>

        <View style={styles.sourceRow}>
          <TouchableOpacity
            style={[styles.sourceButton, inputMode === 'images' && styles.sourceButtonActive]}
            onPress={pickImages}
            activeOpacity={0.8}
          >
            <ImageIcon size={24} color={inputMode === 'images' ? theme.colors.textInverse : theme.colors.primary} strokeWidth={2.2} />
            <Text variant="bodyMedium" color={inputMode === 'images' ? theme.colors.textInverse : theme.colors.primary} style={styles.sourceLabel}>
              Images
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceButton, inputMode === 'pdf' && styles.sourceButtonActive]}
            onPress={pickPdf}
            activeOpacity={0.8}
          >
            <FileText size={24} color={inputMode === 'pdf' ? theme.colors.textInverse : theme.colors.primary} strokeWidth={2.2} />
            <Text variant="bodyMedium" color={inputMode === 'pdf' ? theme.colors.textInverse : theme.colors.primary} style={styles.sourceLabel}>
              PDF local
            </Text>
          </TouchableOpacity>
        </View>

        {images.length > 0 ? (
          <Card style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text variant="bodyMedium">Images sélectionnées</Text>
              <Text variant="caption" color={theme.colors.primary}>{images.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip}>
              {images.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.imageWrapper}>
                  <TouchableOpacity onPress={() => setEditingIndex(index)} activeOpacity={0.8}>
                    <Image source={{ uri }} style={styles.previewImage} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                    <X size={14} color={theme.colors.textInverse} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <Button
              title={pdfFile ? 'Regénérer le PDF' : 'Générer le PDF'}
              icon={<FileText size={16} color={theme.colors.textInverse} />}
              onPress={generatePDF}
              loading={isProcessing}
              style={styles.fullButton}
            />
          </Card>
        ) : null}

        {pdfFile ? (
          <Card style={styles.pdfCard}>
            <View style={styles.pdfHeader}>
              <View style={styles.pdfIconBox}>
                <FileText size={22} color={theme.colors.primary} strokeWidth={2.2} />
              </View>
              <View style={styles.pdfInfo}>
                <Text variant="bodyMedium" numberOfLines={1}>{pdfFile.name || 'Correction PDF'}</Text>
                <Text variant="caption" color={theme.colors.textMuted}>Filigrane appliqué</Text>
              </View>
            </View>
            <Button
              title="Prévisualiser"
              variant="secondary"
              icon={<Eye size={16} color={theme.colors.primary} />}
              onPress={() => setShowPdfPreview(true)}
              style={styles.fullButton}
            />
          </Card>
        ) : null}

        <Button
          title="Associer le corrigé"
          icon={<UploadCloud size={18} color={theme.colors.textInverse} />}
          onPress={submitCorrection}
          loading={uploading}
          disabled={!selectedSubject || !pdfFile || isProcessing}
          style={styles.submitButton}
        />
      </ScrollView>

      <ImageEditorModal
        visible={editingIndex !== null}
        imageUri={editingIndex !== null ? images[editingIndex] : null}
        onCancel={() => setEditingIndex(null)}
        onSave={(newUri) => {
          setImages((previous) => previous.map((uri, index) => (index === editingIndex ? newUri : uri)));
          resetCorrectionFile();
          setEditingIndex(null);
        }}
      />

      <Modal visible={showPdfPreview} transparent animationType="fade" onRequestClose={() => setShowPdfPreview(false)}>
        <SafeAreaView style={styles.previewModal}>
          <View style={styles.previewModalHeader}>
            <Text variant="h3">Prévisualisation</Text>
            <TouchableOpacity onPress={() => setShowPdfPreview(false)}>
              <X size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {webviewAvailable && pdfWebViewUri ? (
            // eslint-disable-next-line global-require
            (() => {
              const { WebView } = require('react-native-webview');
              return <WebView source={{ uri: pdfWebViewUri }} originWhitelist={["*"]} allowFileAccess allowUniversalAccessFromFileURLs style={{ flex: 1 }} />;
            })()
          ) : (
            <View style={styles.previewPlaceholder}>
              <FileText size={64} color={theme.colors.textMuted} />
              <Button title="Ouvrir la prévisualisation" onPress={handleOpenPreview} style={styles.previewOpenButton} />
            </View>
          )}
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.sm,
    width: 44,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryWash,
  },
  content: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  searchBox: {
    height: 52,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: theme.spacing.sm,
    fontFamily: theme.fontFamily.medium,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  loadingBlock: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  subjectList: {
    gap: theme.spacing.sm,
  },
  subjectCard: {
    padding: theme.spacing.md,
  },
  subjectCardSelected: {
    borderColor: theme.colors.success,
    borderWidth: 1.5,
  },
  subjectCardDisabled: {
    opacity: 0.72,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectIconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectTitle: {
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  subjectFooter: {
    marginTop: theme.spacing.md,
  },
  previewSubjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.primaryWash,
    borderRadius: theme.radius.sm,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sourceButton: {
    flex: 1,
    minHeight: 88,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  sourceButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sourceLabel: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  previewCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  imageStrip: {
    marginHorizontal: -4,
    marginBottom: theme.spacing.md,
  },
  imageWrapper: {
    position: 'relative',
    marginHorizontal: 4,
  },
  previewImage: {
    width: 78,
    height: 108,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceRaised,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullButton: {
    height: 46,
  },
  pdfCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pdfIconBox: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  pdfInfo: {
    flex: 1,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    height: 50,
  },
  previewModal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  previewModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  previewOpenButton: {
    marginTop: theme.spacing.lg,
  },
});

export default CorrectionUploadScreen;
