import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Share2 } from 'lucide-react-native';
import ScreenHeader, { HeaderIconButton } from '../components/ui/ScreenHeader';
import StateView from '../components/ui/StateView';
import { useTheme, createThemedStyles } from '../theme/ThemeProvider';
import useDownloadStore from '../store/useDownloadStore';
import { shareDownloadedFile } from '../hooks/useDownload';

/**
 * Lecture d'un PDF téléchargé, directement dans l'application (iOS : rendu natif du PDF par WebKit).
 * Le fichier est local : aucune connexion nécessaire. « Partager » ouvre la feuille système
 * (enregistrer dans Fichiers, imprimer, envoyer…).
 */
const PdfViewerScreen = ({ navigation, route }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const { document, uri } = route.params || {};
  const getLocalUri = useDownloadStore((state) => state.getLocalUri);
  const [failed, setFailed] = useState(false);
  const title = document?.title || document?.titre || 'Document';
  // Accès en lecture limité au dossier des téléchargements de l'application.
  const folder = uri ? uri.slice(0, uri.lastIndexOf('/') + 1) : undefined;

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        title={title}
        titleLines={2}
        sheet={false}
        right={<HeaderIconButton icon={Share2} label="Partager le document" onPress={() => shareDownloadedFile(document, { getLocalUri })} />}
      />
      <View style={styles.page}>
        {failed || !uri ? (
          <StateView title="Lecture impossible" description="Ce fichier ne peut pas être affiché ici. Utilise « Partager » pour l’ouvrir avec une autre application." />
        ) : (
          <WebView
            source={{ uri }}
            originWhitelist={['file://*']}
            allowingReadAccessToURL={folder}
            allowFileAccess
            startInLoadingState
            renderLoading={() => <View style={styles.loading}><ActivityIndicator color={brand.burgundy} /></View>}
            onError={() => setFailed(true)}
            style={styles.webview}
            accessibilityLabel={`Contenu du document ${title}`}
          />
        )}
      </View>
    </View>
  );
};

export default PdfViewerScreen;

const useStyles = createThemedStyles(({ theme, brand }) => {
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    page: { flex: 1, backgroundColor: brand.paper || theme.colors.background },
    webview: { flex: 1, backgroundColor: 'transparent' },
    loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  });
  return { styles };
});
