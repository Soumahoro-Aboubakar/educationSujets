import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as IntentLauncher from 'expo-intent-launcher';
import { FileText, X, UploadCloud, Eye, Save } from 'lucide-react-native';

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
import { updateDocumentMetadata, validateDocumentStatus, getDownloadUrl } from '../services/documents';

const EditDraftScreen = ({ navigation, route }) => {
  const { isAdmin } = useContext(AuthContext);
  const { options, loading: metadataLoading, createOption } = useMetadataOptions();
  const { getDraftById, loadDrafts } = useDrafts();

  const draftId = route?.params?.draftId;

  // Metadata state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [university, setUniversity] = useState(null);
  const [department, setDepartment] = useState(null);
  const [level, setLevel] = useState(null);
  const [semester, setSemester] = useState(null);
  const [category, setCategory] = useState(null);

  // PDF Preview State
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLocalUri, setPdfLocalUri] = useState(null);
  const [pdfIntentUri, setPdfIntentUri] = useState(null);
  const [pdfWebViewUri, setPdfWebViewUri] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [webviewAvailable, setWebviewAvailable] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  // UI State
  const [uploading, setUploading] = useState(false);
  const [showOnlyRequiredFields, setShowOnlyRequiredFields] = useState(true);
  const [errors, setErrors] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const isAndroid = Platform.OS === 'android';

  useEffect(() => {
    try {
      // eslint-disable-next-line global-require
      require('react-native-webview');
      setWebviewAvailable(true);
    } catch (err) {
      setWebviewAvailable(false);
    }

    if (draftId && !isDataLoaded) {
      const draft = getDraftById(draftId);
      if (draft) {
        setIsDataLoaded(true);
        loadDraftData(draft);
      }
    }
  }, [draftId, getDraftById, isDataLoaded]);

  const loadDraftData = async (draft) => {
    setTitle(draft.title || '');
    setDescription(draft.description || '');
    setUniversity(draft.university || null);
    setDepartment(draft.department || null);
    setLevel(draft.level || null);
    setSemester(draft.semester?._id || draft.semester || null);
    setCategory(draft.category?._id || draft.category || null);
    
    setPdfFile({
      name: draft.originalFileName || draft.file || 'Document PDF',
    });

    try {
      setIsLoadingPreview(true);
      console.log("avant devoici le download data");
      const downloadData = await getDownloadUrl(draft._id || draft.id);
      console.log("voici le download data", downloadData);
      if (downloadData && downloadData.url) {
        setPdfWebViewUri(isAndroid ? null : downloadData.url);
        setPdfLocalUri(downloadData.url);
        setPdfIntentUri(downloadData.url);  
      }
    } catch (e) {
      console.log('Could not fetch preview url', e);
    } finally {
      setIsLoadingPreview(false); 
    }
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

  const validateForm = (isPublishing) => {
    const newErrors = {};
    if (isPublishing) {
      if (!title.trim()) newErrors.title = 'Titre requis';
      if (!category) newErrors.category = 'Catégorie requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async (publish = true) => {
    if (!validateForm(publish)) return;

    setUploading(true);
    try {
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
      
      // Refresh drafts list before going back
      await loadDrafts();
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Erreur lors de la mise à jour du document");
    } finally {
      setUploading(false);
    }
  };

  if (metadataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAdmin()) {
    return (
      <LockedFeatureScreen
        title="Mise à jour réservée"
        description="Seuls les administrateurs peuvent modifier les brouillons."
        feature="Modifier et publier des brouillons"
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.stepHeader}>
          <Text variant="h1" style={styles.stepTitle}>Modifier le Brouillon</Text>
          <Text variant="body" color={theme.colors.textSecondary}>
            Mettez à jour les informations et publiez le document
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
                Fichier enregistré sur le serveur
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
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
          />
          <Button
            title="Sauvegarder"
            icon={Save}
            variant="ghost"
            onPress={() => handleUpdate(false)}
            loading={uploading}
            style={styles.actionButton}
          />
          <Button
            title="Publier"
            icon={UploadCloud}
            variant="primary"
            onPress={() => handleUpdate(true)}
            loading={uploading}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>

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
              {isLoadingPreview ? (
                <>
                  <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
                  <Text variant="body" color={theme.colors.textMuted} style={{ marginTop: 16 }}>
                    Génération du lien sécurisé...
                  </Text>
                </>
              ) : pdfIntentUri ? (
                <>
                  <Text variant="body" color={theme.colors.textMuted} style={{ marginTop: 16 }}>
                    Prévisualisation PDF disponible
                  </Text>
                  <Button
                    title="Ouvrir la prévisualisation"
                    onPress={handleOpenPreview}
                    style={{ marginTop: 16 }}
                  />
                </>
              ) : (
                <Text variant="body" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
                  Le fichier n'est pas encore prêt ou est introuvable.
                </Text>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
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
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 24,
  },
  pdfCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pdfCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: theme.colors.primaryWash,
    borderRadius: 8,
  },
  formSection: {
    gap: 16,
    marginBottom: 32,
  },
  toggleMoreFields: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'column',
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
  previewModal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  previewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

export default EditDraftScreen;
