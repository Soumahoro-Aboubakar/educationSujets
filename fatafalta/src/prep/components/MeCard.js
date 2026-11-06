import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Crown, Sparkles } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import usePrep, { useRights } from '../store';
import { brand, colors, theme, type } from '../theme';
import { Avatar, Badge, PrepButton } from '../ui/primitives';

/**
 * Onglet Moi, partie préparation (E39) : identité automatique (§ 25.1) et état de l'essai
 * ou de l'abonnement (§ 23). L'identité n'est modifiable qu'après inscription (§ 25.6).
 */
const MeCard = ({ navigation, email }) => {
  const identite = usePrep((s) => s.identite);
  const rights = useRights();
  if (!identite) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Avatar name={identite.pseudonyme} tint={identite.avatarTeinte || 0} size={56} />
          <View style={{ flex: 1 }}>
            <Text variant="h2" style={styles.ink} numberOfLines={1}>{identite.pseudonyme}</Text>
            <Text variant="caption" style={styles.muted} numberOfLines={1}>{email ? email.replace(/(.{2}).*(@.*)/, '$1•••$2') : 'Visiteur · identité automatique'}</Text>
          </View>
          {rights.abonne ? <Badge label="Premium" tone="gold" icon={Crown} /> : null}
        </View>
        {!rights.abonne ? (
          <View style={styles.trial}>
            <View style={styles.friseRow} accessibilityLabel={`Essai : ${rights.essai.joursUtilises} jours utilisés sur 7`}>
              {Array.from({ length: 7 }, (_, i) => <View key={i} style={[styles.day, i < rights.essai.joursUtilises && styles.dayUsed]} />)}
              <Text variant="caption" style={[styles.muted, type.tabular]}>{`${rights.essai.joursUtilises} / 7 utilisés`}</Text>
            </View>
            <View style={styles.rowSmall}>
              <Sparkles size={15} color={brand.gold} />
              <Text variant="caption" style={styles.muted}>{`${rights.essai.iaRestantes} vérification${rights.essai.iaRestantes > 1 ? 's' : ''} IA offerte${rights.essai.iaRestantes > 1 ? 's' : ''}`}</Text>
            </View>
            <PrepButton title="S’abonner" variant="gold" onPress={() => navigation.navigate('PrepSubscription')} compact />
            {!email ? <PrepButton title="Créer mon compte" variant="link" onPress={() => navigation.navigate('Register', { returnTo: 'back' })} compact /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, marginTop: 16 },
  card: { padding: 18, borderRadius: 20, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, gap: 14, ...theme.shadows.soft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowSmall: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ink: { color: brand.ink },
  muted: { color: brand.inkSoft },
  trial: { gap: 10 },
  friseRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  day: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: brand.lineStrong },
  dayUsed: { backgroundColor: brand.burgundy, borderColor: brand.burgundy },
});

export default MeCard;
