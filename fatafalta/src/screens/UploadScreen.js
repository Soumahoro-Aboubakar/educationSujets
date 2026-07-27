import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { FileText, Image as ImageIcon, X, UploadCloud, Eye, Save } from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import MetadataSelect from '../components/ui/MetadataSelect';
import Card from '../components/ui/Card';
import AuthContext from '../context/AuthContext';
import LockedFeatureScreen from './LockedFeatureScreen';
import useMetadataOptions from '../hooks/useMetadataOptions';
import useDrafts from '../hooks/useDrafts';
import theme from '../theme/tokens';
import { generatePdfFromImages, applyWatermarkToExistingPdf, cleanTempDirectory,MAX_IMPORTED_PDF_SIZE_BYTES } from '../services/pdfService';
import { uploadDocument, updateDocumentMetadata, validateDocumentStatus } from '../services/documents';
import ImageEditorModal from '../components/documents/ImageEditorModal';

const UploadScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const { isAdmin, isAuthenticated } = useContext(AuthContext);
  const { options, loading: metadataLoading, createOption } = useMetadataOptions();
  const { saveDraft, getDraftById } = useDrafts();
  const [editingIndex, setEditingIndex] = useState(null);

  // Document file state
  const [images, setImages] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLocalUri, setPdfLocalUri] = useState(null);
  const [pdfIntentUri, setPdfIntentUri] = useState(null);
  const [pdfWebViewUri, setPdfWebViewUri] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [webviewAvailable, setWebviewAvailable] = useState(false);

  const isAndroid = Platform.OS === 'android';

  // Metadata state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [university, setUniversity] = useState(null);
  const [department, setDepartment] = useState(null);
  const [level, setLevel] = useState(null);
  const [semester, setSemester] = useState(null);
  const [category, setCategory] = useState(null);

  // UI state
  const [step, setStep] = useState('choose'); // 'choose' | 'preview' | 'metadata'
  const [uploading, setUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOnlyRequiredFields, setShowOnlyRequiredFields] = useState(true);
  const [errors, setErrors] = useState({});

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

  const handleOpenPreview = async () => {
    if (isAndroid) {
      if (!pdfIntentUri) return;

      try {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: pdfIntentUri,
          flags: 1,
          type: 'application/pdf',
        });
        return;
      } catch (error) {
        console.warn('Unable to open Android preview intent:', error);
        Alert.alert('Erreur', "Impossible d'ouvrir le fichier");
        return;
      }
    }

    if (!pdfLocalUri) return;

    Linking.openURL(pdfLocalUri).catch(() => {
      Alert.alert('Erreur', "Impossible d'ouvrir le fichier");
    });
  };

  // Draft mode
  const draftId = route?.params?.draftId;
  const [isDraftMode, setIsDraftMode] = useState(false);

  // Load draft on mount
  useEffect(() => {
    // Detect if react-native-webview is available at runtime
    try {
      // eslint-disable-next-line global-require
      require('react-native-webview');
      setWebviewAvailable(true);
    } catch (err) {
      setWebviewAvailable(false);
    }

    if (draftId) {
      const draft = getDraftById(draftId);
      if (draft) {
        loadDraftData(draft);
        setIsDraftMode(true);
        setStep('metadata'); // Skip choose step since file is on server
      }
    }
  }, [draftId]);

  const loadDraftData = (draft) => {
    setTitle(draft.title || '');
    setDescription(draft.description || '');
    setUniversity(draft.university || null);
    setDepartment(draft.department || null);
    setLevel(draft.level || null);
    setSemester(draft.semester?._id || draft.semester || null);
    setCategory(draft.category?._id || draft.category || null);
    
    // Create a mock pdfFile for UI preview
    setPdfFile(draft.pdfFile || {
      name: draft.originalFileName || draft.file || 'Document PDF',
      isServerFile: true
    });
  };

  // ─────────────────────────────────────────────────────────────
  // PDF Generation & Processing
  // ─────────────────────────────────────────────────────────────

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };
/*
  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      const file = result.assets[0];
      await processExistingPDF(file.uri);
    }
  }; */

    const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: false, // <-- TRÈS IMPORTANT : Mettre à false
    });
    
    if (!result.canceled) {
      const file = result.assets[0];

      // Vérification précoce côté UI
      if (typeof file.size === 'number' && file.size > MAX_IMPORTED_PDF_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const maxMb = Math.round(MAX_IMPORTED_PDF_SIZE_BYTES / (1024 * 1024));
        Alert.alert(
          'Fichier trop volumineux',
          `Ce PDF fait ${sizeMb} Mo. La taille maximale acceptée est ${maxMb} Mo.`
        );
        return;
      }

      await processExistingPDF(file.uri);
    }
  };

/*
  const pickDocument = async () => {
  let result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  if (!result.canceled) {
    const file = result.assets[0];

    // Vérification précoce côté UI : évite même de lancer le traitement
    // si le fichier est visiblement trop lourd. `applyWatermarkToExistingPdf`
    // refait aussi le contrôle en interne (défense en profondeur), mais
    // le faire ici permet un message immédiat sans passer par le state
    // `isProcessing`.
    if (typeof file.size === 'number' && file.size > MAX_IMPORTED_PDF_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const maxMb = Math.round(MAX_IMPORTED_PDF_SIZE_BYTES / (1024 * 1024));
      Alert.alert(
        'Fichier trop volumineux',
        `Ce PDF fait ${sizeMb} Mo. La taille maximale acceptée est ${maxMb} Mo.`
      );
      return;
    }

    await processExistingPDF(file.uri);
  }
};
*/
const processExistingPDF = async (fileUri) => {
  setIsProcessing(true);
  try {
    const result = await applyWatermarkToExistingPdf(fileUri);
    setPdfFile(result);
    setPdfLocalUri(result.uri);
    setPdfIntentUri(await getIntentUri(result.uri));
    setPdfWebViewUri(isAndroid ? null : result.uri);
    setStep('metadata');
  } catch (e) {
    console.error(e);
    // On remonte le message précis (taille, fichier corrompu, etc.)
    // plutôt qu'un message générique, pour que l'utilisateur comprenne
    // pourquoi ça a échoué.
    Alert.alert('Erreur', e.message || 'Erreur lors du traitement du PDF');
  } finally {
    setIsProcessing(false);
  }
};
  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const generatePDF = async () => {
    setIsProcessing(true);
    try {
      const result = await generatePdfFromImages(images);
      setPdfFile(result);
      setPdfLocalUri(result.uri);
      setPdfIntentUri(await getIntentUri(result.uri));
      setPdfWebViewUri(isAndroid ? null : result.uri);
      setImages([]);
      setStep('metadata');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Erreur lors de la création du PDF');
    } finally {
      setIsProcessing(false);
    }
  };
/*
  const processExistingPDF = async (fileUri) => {
    setIsProcessing(true);
    try {
      const result = await applyWatermarkToExistingPdf(fileUri);
      setPdfFile(result);
      setPdfLocalUri(result.uri);
      setPdfIntentUri(await getIntentUri(result.uri));
      setPdfWebViewUri(isAndroid ? null : result.uri);
      setStep('metadata');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Erreur lors du traitement du PDF');
    } finally {
      setIsProcessing(false);
    }
  };
*/
  // ─────────────────────────────────────────────────────────────
  // Validation & Submission
  // ─────────────────────────────────────────────────────────────

  const validateForm = (isDraft) => {
    const newErrors = {};
    
    if (!isDraft) {
      if (!title.trim()) {
        newErrors.title = 'Titre requis';
      }
      
      if (!category) {
        newErrors.category = 'Catégorie requise';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    await handleUpload(false);
  };

  const handleUpload = async (publish = true) => {
    if (!validateForm(!publish)) return;

    setUploading(true);
    try {
      if (isDraftMode) {
        // Update existing document metadata
        const payload = {
          title: title || undefined,
          description: description || undefined,
          university: university || undefined,
          department: department || undefined,
          level: level || undefined,
          semester: semester || undefined,
          category: category || undefined,
        };

        await updateDocumentMetadata(draftId, payload);
        
        if (publish) {
          await validateDocumentStatus(draftId, 'approved');
        }

        Alert.alert(
          'Succès',
          publish ? 'Brouillon publié avec succès' : 'Brouillon mis à jour'
        );
      } else {
        // New document upload
        const formData = new FormData();
        formData.append('file', {
          uri: pdfFile.uri,
          name: pdfFile.name,
          type: pdfFile.mimeType || 'application/pdf',
        });

        if (title) formData.append('title', title);
        if (description) formData.append('description', description);
        if (university) formData.append('university', university);
        if (department) formData.append('department', department);
        if (level) formData.append('level', level);
        if (semester) formData.append('semester', semester);
        if (category) formData.append('category', category);

        formData.append('metadataStatus', publish ? 'true' : 'false');

        await uploadDocument(formData);
        
        Alert.alert(
          'Succès',
          publish ? 'Document publié avec succès' : 'Document enregistré en brouillon'
        );
      }

      await cleanTempDirectory();
      resetForm();
      if (isDraftMode) {
        navigation.goBack();
      } else {
        setStep('choose');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Erreur lors de l'envoi du document");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setUniversity(null);
    setDepartment(null);
    setLevel(null);
    setSemester(null);
    setCategory(null);
    setPdfFile(null);
    setPdfLocalUri(null);
    setPdfIntentUri(null);
    setPdfWebViewUri(null);
    setImages([]);
    setErrors({});
  };

  // ─────────────────────────────────────────────────────────────
  // Render Steps
  // ─────────────────────────────────────────────────────────────

  const renderChooseStep = () => (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stepHeader}>
        <Text variant="h1" style={styles.stepTitle}>Créer un Document</Text>
        <Text variant="body" color={theme.colors.textSecondary}>
          Convertissez vos images en PDF ou importez un document existant
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={pickImage}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            <ImageIcon color={theme.colors.primary} size={32} />
          </View>
          <Text variant="h3" style={styles.actionTitle}>Images vers PDF</Text>
          <Text variant="caption" color={theme.colors.textMuted}>Depuis la galerie</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={pickDocument}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            <FileText color={theme.colors.primary} size={32} />
          </View>
          <Text variant="h3" style={styles.actionTitle}>Importer un PDF</Text>
          <Text variant="caption" color={theme.colors.textMuted}>Fichier existant</Text>
        </TouchableOpacity>
      </View>

      {images.length > 0 && (
        <Card style={styles.imagesPreviewCard}>
          <View style={styles.previewHeader}>
            <Text variant="h3">Images sélectionnées</Text>
            <Text variant="bodyMedium" color={theme.colors.primary}>
              {images.length}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
           {images.map((uri, index) => (
  <View key={index} style={styles.imageWrapper}>
    <TouchableOpacity onPress={() => setEditingIndex(index)} activeOpacity={0.8}>
      <Image source={{ uri }} style={styles.previewImage} />
    </TouchableOpacity>
    <TouchableOpacity 
      style={styles.removeImageButton} 
      onPress={() => removeImage(index)}
    >
      <X size={14} color={theme.colors.textInverse} />
    </TouchableOpacity>
  </View>
))}
          </ScrollView>

          <Button
            title="Générer le PDF"
            onPress={generatePDF}
            loading={isProcessing}
            variant="primary"
            style={styles.generateButton}
          />
        </Card>
      )}
    </ScrollView>
  );

  const renderMetadataStep = () => (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stepHeader}>
        <Text variant="h1" style={styles.stepTitle}>Informations du Document</Text>
        <Text variant="body" color={theme.colors.textSecondary}>
          Remplissez les détails pour votre document
        </Text>
      </View>

      {/* PDF Preview Card */}
      <Card style={styles.pdfCard}>
        <View style={styles.pdfCardHeader}>
          <FileText size={24} color={theme.colors.primary} />
          <View style={styles.pdfCardInfo}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {pdfFile?.name || 'Document PDF'}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              Prêt pour l'envoi
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.previewButton}
          onPress={() => setShowPdfPreview(true)}
        >
          <Eye size={18} color={theme.colors.primary} />
          <Text variant="bodyMedium" color={theme.colors.primary}>
            Prévisualiser
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Metadata Form */}
      <View style={styles.formSection}>
        <FormInput
          label="Titre"
          placeholder="Ex: Examen de Mathématiques 2024"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.title) setErrors({ ...errors, title: null });
          }}
          error={errors.title}
        />

        <FormInput
          label="Description"
          placeholder="Brève description du contenu..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={{ height: 100 }}
        />

        <MetadataSelect
          label="Catégorie"
          placeholder="Sélectionner une catégorie"
          options={options.categories}
          value={category}
          onChange={setCategory}
          onCreate={(name) => createOption('categories', 'categories', name)}
          error={errors.category}
        />

        {!showOnlyRequiredFields && (
          <>
            <MetadataSelect
              label="Université"
              placeholder="Sélectionner une université"
              options={options.universities}
              value={university}
              onChange={setUniversity}
              onCreate={(name) => createOption('universities', 'universities', name)}
            />

            <MetadataSelect
              label="Département"
              placeholder="Sélectionner un département"
              options={options.departments}
              value={department}
              onChange={setDepartment}
              onCreate={(name) => createOption('departments', 'departments', name)}
            />

            <MetadataSelect
              label="Niveau"
              placeholder="Sélectionner un niveau"
              options={options.levels}
              value={level}
              onChange={setLevel}
              onCreate={(name) => createOption('levels', 'levels', name)}
            />

            <MetadataSelect
              label="Semestre"
              placeholder="Sélectionner un semestre"
              options={options.semesters}
              value={semester}
              onChange={setSemester}
              onCreate={(name) => createOption('semesters', 'semesters', name)}
            />
          </>
        )}

        {/* Show More Fields Toggle */}
        <TouchableOpacity 
          style={styles.toggleMoreFields}
          onPress={() => setShowOnlyRequiredFields(!showOnlyRequiredFields)}
        >
          <Text variant="bodyMedium" color={theme.colors.primary}>
            {showOnlyRequiredFields ? '+ Ajouter plus de champs' : '- Masquer les champs supplémentaires'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title="Annuler"
          variant="secondary"
          onPress={() => {
            resetForm();
            setStep('choose');
          }}
          style={styles.actionButton}
        />
        <Button
          title="Enregistrer en Brouillon"
          icon={Save}
          variant="ghost"
          onPress={handleSaveDraft}
          style={styles.actionButton}
        />
        <Button
          title="Publier"
          icon={UploadCloud}
          variant="primary"
          onPress={() => handleUpload(true)}
          loading={uploading}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );

  // Main render
  if (metadataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    // Restrict upload UI to admins only
    !isAdmin() ? (
      <LockedFeatureScreen
        title="Création de documents réservée"
        description="Seuls les administrateurs peuvent créer et envoyer des documents."
        feature="Créer, sauvegarder en brouillon et publier des documents PDF"
      />
    ) : (
    <View style={styles.container}>
      {step === 'choose' && renderChooseStep()}
      {step === 'metadata' && renderMetadataStep()}
      <ImageEditorModal
  visible={editingIndex !== null}
  imageUri={editingIndex !== null ? images[editingIndex] : null}
  onCancel={() => setEditingIndex(null)}
  onSave={(newUri) => {
    setImages((prev) => prev.map((uri, i) => (i === editingIndex ? newUri : uri)));
    setEditingIndex(null);
  }}
/>
      {/* PDF Preview Modal */}
      <Modal
        visible={showPdfPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPdfPreview(false)}
      >
        <SafeAreaView style={styles.previewModal}>
          <View style={styles.previewModalHeader}>
            <Text variant="h3">Prévisualisation</Text>
            <TouchableOpacity onPress={() => setShowPdfPreview(false)}>
              <X size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {webviewAvailable && pdfWebViewUri ? (
            // Use WebView if available and not on Android, because Android WebView cannot reliably display local PDFs.
            // eslint-disable-next-line global-require
            (() => {
              const { WebView } = require('react-native-webview');
              return (
                <View style={{ flex: 1 }}>
                  <WebView
                    source={{ uri: pdfWebViewUri }}
                    originWhitelist={["*"]}
                    allowFileAccess
                    allowUniversalAccessFromFileURLs
                    style={{ flex: 1 }}
                  />
                </View>
              );
            })()
          ) : (
            <View style={styles.previewPlaceholder}>
              <FileText size={64} color={theme.colors.textMuted} />
              <Text variant="body" color={theme.colors.textMuted} style={{ marginTop: 16 }}>
                Prévisualisation PDF disponible
              </Text>
              {pdfIntentUri ? (
                <Button
                  title="Ouvrir la prévisualisation"
                  onPress={handleOpenPreview}
                  style={{ marginTop: 16 }}
                />
              ) : (
                <Text variant="body" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
                  Le fichier n'est pas encore prêt pour la prévisualisation.
                </Text>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  ));
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  stepContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  stepHeader: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryWash,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  imagesPreviewCard: {
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageScroll: {
    marginHorizontal: -4,
    marginBottom: 12,
  },
  imageWrapper: {
    marginHorizontal: 4,
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 110,
    borderRadius: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButton: {
    marginTop: 12,
  },
  pdfCard: {
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfCardHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pdfCardInfo: {
    flex: 1,
  },
  previewButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryWash,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formSection: {
    gap: 16,
    marginBottom: 24,
  },
  toggleMoreFields: {
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    height: 48,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UploadScreen;
