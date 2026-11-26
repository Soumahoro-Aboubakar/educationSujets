import React, { useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { AccountScroll } from '../../components/account/AccountLayout';
import { AccountField } from '../../components/account/AccountPresentation';
import { PrepButton } from '../../prep/ui/primitives';
import { createThemedStyles } from '../../theme/ThemeProvider';
import AuthContext from '../../context/AuthContext';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/userMessages';
import { openLegal } from '../../utils/legalLinks';

const EFFACE = [
  'ton nom, ton adresse e-mail et ton mot de passe ;',
  'ta progression, tes réponses et ton classement dans la préparation ;',
  'tes appareils connectés et tes notifications.',
];
const CONSERVE = 'Les paiements, abonnements et commissions restent archivés sans ton nom, le temps exigé par la loi (comptabilité, litiges).';

/** Suppression du compte par son titulaire (exigence Google Play et App Store). */
const DeleteAccountScreen = ({ navigation }) => {
  const { styles } = useStyles();
  const { logout } = useContext(AuthContext);
  const [motDePasse, setMotDePasse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const supprimer = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/me/suppression-compte', { motDePasse });
      await logout();
      navigation.popToTop();
    } catch (requestError) {
      const status = requestError?.response?.status;
      setError(status === 401 ? 'Mot de passe incorrect.' : (requestError?.response?.data?.message || getErrorMessage(requestError, 'suppression du compte', 'tu')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Supprimer mon compte" onBack={() => navigation.goBack()} />
      <AccountScroll>
        <Text variant="h2" accessibilityRole="header" style={styles.title}>Cette action est définitive</Text>
        <Text variant="body" style={styles.body}>La suppression efface :</Text>
        {EFFACE.map((item) => (
          <View key={item} style={styles.item}><View style={styles.dot} /><Text variant="body" style={styles.itemText}>{item}</Text></View>
        ))}
        <Text variant="body" style={[styles.body, styles.spaced]}>{CONSERVE}</Text>
        <Text variant="body" style={styles.body}>
          Un abonnement en cours prend fin, même s’il te restait du temps payé. Tes droits légaux restent applicables.{' '}
          <Text variant="body" style={styles.link} accessibilityRole="link" onPress={() => openLegal('conditions-vente')}>Conditions d’abonnement</Text>
        </Text>
        <View style={styles.form}>
          <AccountField label="Confirme avec ton mot de passe" placeholder="••••••••" value={motDePasse} onChangeText={(t) => { setMotDePasse(t); setError(null); }} secureTextEntry autoCapitalize="none" icon={Lock} error={error} editable={!loading} />
        </View>
        <PrepButton title="Supprimer définitivement" loading={loading} disabled={loading || !motDePasse} onPress={supprimer} />
        <View style={styles.cancel}>
          <PrepButton variant="secondary" title="Garder mon compte" disabled={loading} onPress={() => navigation.goBack()} />
        </View>
      </AccountScroll>
    </View>
  );
};

export default DeleteAccountScreen;

const useStyles = createThemedStyles(({ brand, theme }) => ({
  styles: StyleSheet.create({
    container: { ...theme.layout.readingFrame, flex: 1, backgroundColor: brand.paper },
    title: { color: brand.ink, marginBottom: 12 },
    body: { color: brand.inkSoft, lineHeight: 22 },
    spaced: { marginTop: 12, marginBottom: 8 },
    item: { flexDirection: 'row', gap: 10, marginTop: 6, paddingRight: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.burgundy, marginTop: 9 },
    itemText: { flex: 1, color: brand.ink, lineHeight: 22 },
    link: { color: brand.burgundy, fontWeight: '600', textDecorationLine: 'underline' },
    form: { marginTop: 24, marginBottom: 20 },
    cancel: { marginTop: 12 },
  }),
}));
