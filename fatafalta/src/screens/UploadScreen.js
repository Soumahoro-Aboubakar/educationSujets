import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
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
import { FileText, Image as ImageIcon, X, UploadCloud, Eye, Save, CircleCheck, CircleAlert } from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import MetadataSelect from '../components/ui/MetadataSelect';
import TaxonomyPathFields from '../components/catalog/TaxonomyPathFields';
import DynamicMetadataFields, { getPathFromLeaf } from '../components/catalog/DynamicMetadataFields';
import Card from '../components/ui/Card';
import AuthContext from '../context/AuthContext';
import LockedFeatureScreen from './LockedFeatureScreen';
import useMetadataOptions from '../hooks/useMetadataOptions';
import useDrafts from '../hooks/useDrafts';
import theme from '../theme/tokens';
import { generatePdfFromImages, applyWatermarkToExistingPdf, cleanTempDirectory, MAX_IMPORTED_PDF_SIZE_BYTES } from '../services/pdfService';
import { uploadDocument, updateDocumentMetadata, validateDocumentStatus, getDownloadUrl } from '../services/documents';
import ImageEditorModal from '../components/documents/ImageEditorModal';

const BATCH_STATUS_LABELS = {
  pending: 'En attente',
  processing: 'Préparation du PDF…',
  uploading: 'Envoi en cours…',
  publishing: 'Publication…',
  success: 'Terminé',
  error: 'Échec',
};

const isPdfAsset = (asset) => {
  const mimeType = (asset?.mimeType || '').toLowerCase();
  const name = (asset?.name || '').toLowerCase();
  return mimeType === 'application/pdf' || name.endsWith('.pdf');
};

const titleFromFileName = (name) => (name || '').replace(/\.pdf$/i, '').trim();

// Message renvoyé par l'API (express-validator, AppError) plutôt que le message axios générique.
const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  return (
    data?.message
    || data?.error
    || (Array.isArray(data?.errors) && data.errors[0]?.msg)
    || error?.message
    || fallback
  );
};

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

  // Import multiple : chaque PDF est préparé puis envoyé l'un après l'autre.
  // { id, uri, name, size, title, status, error, documentId }
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const batchRunningRef = useRef(false);
  const isBatchMode = batchFiles.length > 0;

  const isAndroid = Platform.OS === 'android';

  // Metadata state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [institution, setInstitution] = useState(null);
  const [taxonomyNodes, setTaxonomyNodes] = useState([]);
  const [dynamicMetadata, setDynamicMetadata] = useState({
    organisme: null,
    path: [],
    matiere: null,
    hasParcoursType: null,
    parcoursType: null,
  });

  // UI state
  const [step, setStep] = useState('choose'); // 'choose' | 'preview' | 'metadata'
  const [uploading, setUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOnlyRequiredFields, setShowOnlyRequiredFields] = useState(true);
  const [errors, setErrors] = useState({});
  const selectedInstitution = useMemo(
    () => options.institutions.find((item) => item._id === institution) || null,
    [institution, options.institutions]
  );

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
    if (!result || result.canceled || result.type === 'cancel') return [];
    if (Array.isArray(result.assets)) return result.assets.filter((asset) => asset?.uri);
    if (result.uri) return [result];
    return [];
  };

  const handleOpenPreview = async () => {
    if (isAndroid) {
      if (!pdfIntentUri) return;

      try {
        if (pdfIntentUri.startsWith('http')) {
          await Linking.openURL(pdfIntentUri);
          return;
        }
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

  const loadDraftData = async (draft) => {
    setTitle(draft.title || '');
    setDescription(draft.description || '');
    setInstitution(draft.institution?._id || draft.institution || null);
    setTaxonomyNodes((draft.taxonomyNodes || []).map((node) => node?._id || node).filter(Boolean));
    const dynamicNode = draft.noeudId?._id ? draft.noeudId : null;
    const organisme = dynamicNode?.organismeId
      ? (typeof dynamicNode.organismeId === 'object' ? dynamicNode.organismeId : { _id: dynamicNode.organismeId })
      : null;
    setDynamicMetadata({
      organisme,
      path: getPathFromLeaf(dynamicNode),
      matiere: draft.matiereId?._id ? draft.matiereId : null,
      hasParcoursType: draft.parcoursTypeId ? true : null,
      parcoursType: draft.parcoursTypeId?._id ? draft.parcoursTypeId : null,
    });

    // Create a mock pdfFile for UI preview
    setPdfFile(draft.pdfFile || {
      name: draft.originalFileName || draft.file || 'Document PDF',
      isServerFile: true
    });

    try {
      const downloadData = await getDownloadUrl(draft._id || draft.id);
      if (downloadData && downloadData.url) {
        setPdfWebViewUri(downloadData.url);
        setPdfLocalUri(downloadData.url);
        setPdfIntentUri(downloadData.url);
      }
    } catch (e) {
      console.log('Could not fetch preview url', e);
    }
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
      setImages((prev) => [...prev, ...newImages]);
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
    if (isProcessing || batchRunningRef.current) return;

    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        base64: false,
        multiple: true,
      });
    } catch (error) {
      console.error('DocumentPicker error:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier PDF.');
      return;
    }

    const assets = normalizeDocumentPickerResult(result);
    if (assets.length === 0) {
      if (result && !result.canceled) {
        console.warn('DocumentPicker result without a valid file asset:', result);
      }
      return;
    }

    // Vérification précoce côté UI (type, taille, doublons)
    const maxMb = Math.round(MAX_IMPORTED_PDF_SIZE_BYTES / (1024 * 1024));
    const rejected = [];
    const seen = new Set();
    const files = [];
    assets.forEach((asset) => {
      const name = asset.name || 'Document PDF';
      const key = `${name}:${asset.size ?? ''}`;
      if (!isPdfAsset(asset)) {
        rejected.push(`${name} : ce n'est pas un fichier PDF`);
      } else if (typeof asset.size === 'number' && asset.size > MAX_IMPORTED_PDF_SIZE_BYTES) {
        const sizeMb = (asset.size / (1024 * 1024)).toFixed(1);
        rejected.push(`${name} : ${sizeMb} Mo (maximum ${maxMb} Mo)`);
      } else if (seen.has(key)) {
        rejected.push(`${name} : sélectionné plusieurs fois`);
      } else {
        seen.add(key);
        files.push(asset);
      }
    });

    if (rejected.length > 0) {
      Alert.alert(
        files.length > 0 ? 'Certains fichiers ont été ignorés' : 'Fichier refusé',
        rejected.join('\n')
      );
    }
    if (files.length === 0) return;

    if (files.length === 1) {
      const fileUri = files[0].uri;
      if (isAndroid) {
        setIsProcessing(true);
        setTimeout(() => processExistingPDF(fileUri), 500);
      } else {
        await processExistingPDF(fileUri);
      }
      return;
    }

    // Plusieurs PDFs : métadonnées communes, titre propre à chaque fichier.
    // Le filigrane est appliqué au moment de l'envoi, fichier par fichier,
    // pour ne jamais garder plusieurs PDFs lourds en mémoire.
    setErrors({});
    setBatchFiles(files.map((asset, index) => ({
      id: `${Date.now()}_${index}`,
      uri: asset.uri,
      name: asset.name || `Document ${index + 1}.pdf`,
      size: asset.size,
      title: titleFromFileName(asset.name),
      status: 'pending',
      error: null,
      documentId: null,
    })));
    setStep('metadata');
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
      if (isBatchMode) {
        batchFiles.forEach((file) => {
          if (file.status !== 'success' && !file.title.trim()) {
            newErrors[`title_${file.id}`] = 'Titre requis';
          }
        });
      } else if (!title.trim()) {
        newErrors.title = 'Titre requis';
      }

      if (institution && taxonomyNodes.length !== selectedInstitution?.navigationStructure?.length) {
        newErrors.taxonomy = 'Sélectionnez tous les niveaux de la structure';
      }

      if (dynamicMetadata.organisme) {
        if (dynamicMetadata.path.length === 0) newErrors.path = 'Sélectionnez l’année et les niveaux du sujet';
        if (dynamicMetadata.structureLength && dynamicMetadata.path.length !== dynamicMetadata.structureLength) {
          newErrors.path = 'Sélectionnez tous les niveaux du sujet';
        }
        if (!dynamicMetadata.matiere) newErrors.matiere = 'Sélectionnez une matière';
        if (dynamicMetadata.hasParcoursType === null) newErrors.parcoursType = 'Indiquez si un type de parcours est utilisé';
        if (dynamicMetadata.hasParcoursType && !dynamicMetadata.parcoursType) newErrors.parcoursType = 'Sélectionnez un type de parcours';
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      Alert.alert('Formulaire incomplet', 'Veuillez corriger les champs signalés avant de continuer.');
    }
    return isValid;
  };

  const hasCompleteDynamicMetadata = () => Boolean(
    dynamicMetadata.path.at(-1)?._id
    && dynamicMetadata.matiere?._id
    && dynamicMetadata.hasParcoursType !== null
  );

  const buildUploadFormData = (file, documentTitle, publish) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/pdf',
    });

    if (documentTitle) formData.append('title', documentTitle);
    if (description) formData.append('description', description);
    if (institution) formData.append('institution', institution);
    formData.append('taxonomyNodes', JSON.stringify(taxonomyNodes));
    if (hasCompleteDynamicMetadata()) {
      formData.append('noeudId', dynamicMetadata.path.at(-1)._id);
      formData.append('matiereId', dynamicMetadata.matiere._id);
      formData.append('hasParcoursType', String(dynamicMetadata.hasParcoursType));
      if (dynamicMetadata.parcoursType?._id) formData.append('parcoursTypeId', dynamicMetadata.parcoursType._id);
    }

    formData.append('documentType', 'sujet');
    formData.append('metadataStatus', publish ? 'true' : 'false');
    return formData;
  };

  const getUploadedDocumentId = (uploadResult) => (
    uploadResult?.data?._id || uploadResult?.data?.id || uploadResult?._id || uploadResult?.id
  );

  const handleSaveDraft = async () => {
    if (isBatchMode) {
      await handleBatchUpload(false);
      return;
    }
    await handleUpload(false);
  };

  const updateBatchFile = (id, patch) => {
    setBatchFiles((prev) => prev.map((file) => (file.id === id ? { ...file, ...patch } : file)));
  };

  // Envoi séquentiel : le PDF suivant n'est traité qu'une fois le précédent
  // entièrement terminé (filigrane → envoi → publication). Un échec est
  // enregistré sur le fichier concerné sans interrompre les suivants.
  const handleBatchUpload = async (publish = true) => {
    if (batchRunningRef.current) return;
    if (!validateForm(!publish)) return;

    const queue = batchFiles.filter((file) => file.status !== 'success');
    if (queue.length === 0) return;

    batchRunningRef.current = true;
    setBatchRunning(true);
    queue.forEach((file) => updateBatchFile(file.id, { status: 'pending', error: null }));

    let successCount = 0;
    const failures = [];

    for (let index = 0; index < queue.length; index += 1) {
      const file = queue[index];
      setBatchProgress({ current: index + 1, total: queue.length });
      let processedUri = null;
      // Si un essai précédent a créé le document mais échoué à la publication,
      // on ne le renvoie pas (évite les doublons) : on retente seulement la publication.
      let documentId = file.documentId;

      try {
        if (!documentId) {
          updateBatchFile(file.id, { status: 'processing' });
          const processed = await applyWatermarkToExistingPdf(file.uri);
          processedUri = processed.uri;

          updateBatchFile(file.id, { status: 'uploading' });
          const uploadResult = await uploadDocument(
            buildUploadFormData(processed, file.title.trim(), publish)
          );
          documentId = getUploadedDocumentId(uploadResult);
          if (documentId) updateBatchFile(file.id, { documentId });
        }

        if (publish) {
          if (!documentId) {
            throw new Error('Le document créé ne possède pas d’identifiant');
          }
          updateBatchFile(file.id, { status: 'publishing' });
          await validateDocumentStatus(documentId, 'approved');
        }

        updateBatchFile(file.id, { status: 'success', error: null });
        successCount += 1;
      } catch (error) {
        console.error(`Batch upload failed for ${file.name}:`, error);
        let message = getErrorMessage(error, "Erreur lors de l'envoi du document");
        if (documentId && publish) {
          message = `Document envoyé en brouillon mais non publié : ${message}`;
        }
        updateBatchFile(file.id, { status: 'error', error: message });
        failures.push(`${file.name} : ${message}`);
      } finally {
        if (processedUri) {
          await FileSystem.deleteAsync(processedUri, { idempotent: true }).catch(() => {});
        }
      }
    }

    setBatchProgress({ current: 0, total: 0 });
    batchRunningRef.current = false;
    setBatchRunning(false);

    if (failures.length === 0) {
      Alert.alert(
        'Succès',
        publish
          ? `${successCount} document(s) publié(s) avec succès`
          : `${successCount} document(s) enregistré(s) en brouillon`
      );
      await cleanTempDirectory();
      resetForm();
      setStep('choose');
      return;
    }

    Alert.alert(
      successCount > 0 ? 'Envoi partiellement terminé' : "Échec de l'envoi",
      `${successCount} réussi(s), ${failures.length} échec(s).\n\n${failures.join('\n')}\n\nCorrigez si besoin puis relancez : seuls les fichiers en échec seront renvoyés.`
    );
  };

  const removeBatchFile = (id) => {
    if (batchRunningRef.current) return;
    setBatchFiles((prev) => {
      const next = prev.filter((file) => file.id !== id);
      if (next.length === 0) setStep('choose');
      return next;
    });
    setErrors((prev) => ({ ...prev, [`title_${id}`]: null }));
  };

  const handleCancel = async () => {
    if (uploading || batchRunningRef.current) return;
    if (isDraftMode) {
      navigation.goBack();
      return;
    }
    await cleanTempDirectory();
    resetForm();
    setStep('choose');
  };

  const handleUpload = async (publish = true) => {
    if (uploading) return;
    if (!isDraftMode && !pdfFile?.uri) {
      Alert.alert('Erreur', 'Aucun fichier PDF à envoyer.');
      return;
    }
    if (!validateForm(!publish)) return;

    setUploading(true);
    let createdDocumentId = null;
    try {
      if (isDraftMode) {
        // Update existing document metadata
        const payload = {
          title: title || undefined,
          description: description || undefined,
          institution: institution || undefined,
          taxonomyNodes,
          metadataStatus: publish ? 'true' : 'false',
        };
        if (hasCompleteDynamicMetadata()) {
          payload.noeudId = dynamicMetadata.path.at(-1)._id;
          payload.matiereId = dynamicMetadata.matiere._id;
          payload.hasParcoursType = String(dynamicMetadata.hasParcoursType);
          if (dynamicMetadata.parcoursType?._id) payload.parcoursTypeId = dynamicMetadata.parcoursType._id;
        }

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
        const uploadResult = await uploadDocument(buildUploadFormData(pdfFile, title, publish));

        if (publish) {
          createdDocumentId = getUploadedDocumentId(uploadResult);
          if (!createdDocumentId) {
            throw new Error('Le document créé ne possède pas d’identifiant');
          }
          await validateDocumentStatus(createdDocumentId, 'approved');
        }

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
      const message = getErrorMessage(error, "Erreur lors de l'envoi du document");
      if (createdDocumentId) {
        // Le document existe déjà côté serveur : on évite un second envoi (doublon).
        Alert.alert(
          'Publication incomplète',
          `Le document a été enregistré en brouillon mais n'a pas pu être publié : ${message}\nVous pourrez le publier depuis vos brouillons.`
        );
        await cleanTempDirectory();
        resetForm();
        setStep('choose');
      } else {
        Alert.alert('Erreur', message);
      }
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setBatchFiles([]);
    setBatchProgress({ current: 0, total: 0 });
    setTitle('');
    setDescription('');
    setInstitution(null);
    setTaxonomyNodes([]);
    setDynamicMetadata({ organisme: null, path: [], matiere: null, hasParcoursType: null, parcoursType: null });
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
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            {isProcessing && images.length === 0
              ? <ActivityIndicator color={theme.colors.primary} />
              : <FileText color={theme.colors.primary} size={32} />}
          </View>
          <Text variant="h3" style={styles.actionTitle}>Importer des PDF</Text>
          <Text variant="caption" color={theme.colors.textMuted}>
            {isProcessing && images.length === 0 ? 'Préparation…' : 'Un ou plusieurs fichiers'}
          </Text>
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

      {isBatchMode ? renderBatchFiles() : (
        /* PDF Preview Card */
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
      )}

      {/* Metadata Form */}
      <View style={styles.formSection} pointerEvents={batchRunning ? 'none' : 'auto'}>
        {isBatchMode ? (
          <Text variant="caption" color={theme.colors.textMuted}>
            Les informations ci-dessous seront appliquées à tous les documents sélectionnés.
          </Text>
        ) : (
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
        )}

        <FormInput
          label="Description"
          placeholder="Brève description du contenu..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={{ height: 100 }}
        />

        {/* Champs legacy temporairement désactivés : catégorie, université, département, niveau et semestre. */}

        <DynamicMetadataFields
          value={dynamicMetadata}
          onChange={setDynamicMetadata}
          error={errors}
        />

        <MetadataSelect
          label="Institution"
          placeholder="Sélectionner une institution"
          options={options.institutions}
          value={institution}
          onChange={(value) => {
            setInstitution(value);
            setTaxonomyNodes([]);
            if (errors.taxonomy) setErrors({ ...errors, taxonomy: null });
          }}
          onCreate={(name) => createOption('institutions', 'institutions', name)}
        />

        <TaxonomyPathFields
          institution={selectedInstitution}
          value={taxonomyNodes}
          onChange={(path) => {
            setTaxonomyNodes(path);
            if (errors.taxonomy) setErrors({ ...errors, taxonomy: null });
          }}
          error={errors.taxonomy}
        />

        {!showOnlyRequiredFields && (
          <>
            {/* Champs legacy temporairement désactivés : université, département, niveau et semestre. */}
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
          onPress={handleCancel}
          disabled={busy}
          style={styles.actionButton}
        />
        <Button
          title={hasBatchFailures ? 'Réessayer en brouillon' : 'Enregistrer en Brouillon'}
          icon={Save}
          variant="ghost"
          onPress={handleSaveDraft}
          disabled={busy}
          style={styles.actionButton}
        />
        <Button
          title={hasBatchFailures ? 'Réessayer la publication' : isBatchMode ? `Publier (${pendingBatchCount})` : 'Publier'}
          icon={UploadCloud}
          variant="primary"
          onPress={() => (isBatchMode ? handleBatchUpload(true) : handleUpload(true))}
          loading={busy}
          disabled={busy}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );

  const busy = uploading || batchRunning;
  const pendingBatchCount = batchFiles.filter((file) => file.status !== 'success').length;
  const hasBatchFailures = batchFiles.some((file) => file.status === 'error');

  const renderBatchFiles = () => {
    const doneCount = batchFiles.filter((file) => file.status === 'success').length;
    const failedCount = batchFiles.filter((file) => file.status === 'error').length;
    const progressCount = doneCount + failedCount;
    const currentFile = batchRunning
      ? batchFiles.find((file) => ['processing', 'uploading', 'publishing'].includes(file.status))
      : null;

    return (
      <Card style={styles.batchCard}>
        <View style={styles.previewHeader}>
          <Text variant="h3">PDF sélectionnés</Text>
          <Text variant="bodyMedium" color={theme.colors.primary}>
            {batchFiles.length}
          </Text>
        </View>

        {(batchRunning || progressCount > 0) && (
          <View style={styles.batchProgress}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round((progressCount / batchFiles.length) * 100)}%` },
                ]}
              />
            </View>
            <Text variant="caption" color={theme.colors.textSecondary}>
              {batchRunning && currentFile
                ? `Fichier ${batchProgress.current} sur ${batchProgress.total} · ${currentFile.name}`
                : `${doneCount} réussi(s) · ${failedCount} échec(s)`}
            </Text>
          </View>
        )}

        {batchFiles.map((file) => {
          const active = ['processing', 'uploading', 'publishing'].includes(file.status);
          const statusColor = file.status === 'success'
            ? theme.colors.success
            : file.status === 'error'
              ? theme.colors.error
              : active ? theme.colors.primary : theme.colors.textMuted;
          const locked = batchRunning || file.status === 'success' || Boolean(file.documentId);

          return (
            <View key={file.id} style={styles.batchItem}>
              <View style={styles.batchItemHeader}>
                {active ? <ActivityIndicator size="small" color={theme.colors.primary} />
                  : file.status === 'success' ? <CircleCheck size={20} color={theme.colors.success} />
                    : file.status === 'error' ? <CircleAlert size={20} color={theme.colors.error} />
                      : <FileText size={20} color={theme.colors.textMuted} />}
                <View style={styles.pdfCardInfo}>
                  <Text variant="bodyMedium" numberOfLines={1}>{file.name}</Text>
                  <Text variant="caption" color={statusColor}>
                    {BATCH_STATUS_LABELS[file.status]}
                    {typeof file.size === 'number' ? ` · ${(file.size / (1024 * 1024)).toFixed(1)} Mo` : ''}
                  </Text>
                </View>
                {!batchRunning && file.status !== 'success' && (
                  <TouchableOpacity
                    onPress={() => removeBatchFile(file.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Retirer ${file.name}`}
                  >
                    <X size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <FormInput
                placeholder="Titre du document"
                value={file.title}
                editable={!locked}
                onChangeText={(text) => {
                  updateBatchFile(file.id, { title: text });
                  if (errors[`title_${file.id}`]) setErrors((prev) => ({ ...prev, [`title_${file.id}`]: null }));
                }}
                error={errors[`title_${file.id}`]}
              />
              {file.error ? (
                <Text variant="caption" color={theme.colors.error} style={styles.batchError}>
                  {file.error}
                </Text>
              ) : null}
            </View>
          );
        })}
      </Card>
    );
  };

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
  batchCard: {
    padding: 16,
    marginBottom: 24,
  },
  batchProgress: {
    gap: 6,
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceRaised,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  batchItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 8,
  },
  batchItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  batchError: {
    marginTop: 2,
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
