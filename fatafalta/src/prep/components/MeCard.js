import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Crown, Sparkles } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import usePrep, { useRights } from '../store';
import { type } from '../theme';
import { Avatar, Badge, PrepButton } from '../ui/primitives';

/**
 * Onglet Moi, partie préparation (E39) : identité automatique (§ 25.1) et état de l'essai
 * ou de l'abonnement (§ 23). L'identité n'est modifiable qu'après inscription (§ 25.6).
 */
const MeCard = ({ navigation, email }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const identite = usePrep((s) => s.identite);
  const rights = useRights();
  if (!identite) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Avatar name={identite.pseudonyme} tint={identite.avatarTeinte || 0} size={56} />
          <View style={{ flex: 1, minWidth: 130 }}>
            <Text variant="h2" style={styles.ink}>{identite.pseudonyme}</Text>
            <Text variant="caption" style={styles.muted}>{email ? email.replace(/(.{2}).*(@.*)/, '$1•••$2') : 'Visiteur · identité automatique'}</Text>
          </View>
          {rights.abonne ? <Badge label="Premium" tone="gold" icon={Crown} /> : null}
        </View>
        {!rights.abonne ? (
          <View style={styles.trial}>
            <View style={styles.friseRow} accessibilityLabel={`Essai gratuit : ${rights.essai.joursUtilises} jour${rights.essai.joursUtilises > 1 ? 's' : ''} utilisé${rights.essai.joursUtilises > 1 ? 's' : ''} sur 7`}>
              {Array.from({ length: 7 }, (_, i) => <View key={i} style={[styles.day, i < rights.essai.joursUtilises && styles.dayUsed]} />)}
              <Text variant="caption" style={[styles.muted, type.tabular]}>{`Essai gratuit : ${rights.essai.joursUtilises} jour${rights.essai.joursUtilises > 1 ? 's' : ''} sur 7 utilisé${rights.essai.joursUtilises > 1 ? 's' : ''}`}</Text>
            </View>
            <View style={styles.rowSmall}>
              <Sparkles size={15} color={brand.goldInk} />
              <Text variant="caption" style={styles.muted}>{`${rights.essai.iaRestantes} vérification${rights.essai.iaRestantes > 1 ? 's' : ''} IA offerte${rights.essai.iaRestantes > 1 ? 's' : ''}`}</Text>
            </View>
            <PrepButton title="S’abonner" variant="gold" onPress={() => navigation.navigate('PrepSubscription')} />
            {!email ? <PrepButton title="Créer mon compte" variant="link" onPress={() => navigation.navigate('Register', { returnTo: 'back' })} compact style={{ alignSelf: 'center' }} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default MeCard;

const useStyles = createThemedStyles(({ brand }) => {
  const styles = StyleSheet.create({
    wrap: { marginTop: 8, marginBottom: 28 },
    card: { padding: 24, paddingLeft: 28, borderRadius: 20, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, gap: 14 },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
    rowSmall: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ink: { color: brand.ink },
    muted: { color: brand.inkSoft },
    trial: { gap: 16 },
    friseRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: brand.line },
    day: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: brand.lineStrong },
    dayUsed: { backgroundColor: brand.burgundySolid, borderColor: brand.burgundy },
  });
  return { styles };
});
