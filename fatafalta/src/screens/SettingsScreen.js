import React, { useContext, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { ArrowLeft } from 'lucide-react-native';
import Text from '../components/ui/Text';
import AuthContext from '../context/AuthContext';
import useCorrectionPromptPreference from '../hooks/useCorrectionPromptPreference';
import { usePreferences } from '../context/PreferencesContext';
import usePrep from '../prep/store';
import { PrepButton } from '../prep/ui/primitives';
import theme from '../theme/tokens';

const { brand, colors } = theme;

// Réglages PDF (anciennement dans le tiroir, supprimé § 5.1) : même fichier et mêmes clés
// que services/pdfService.js.
const PDF_PREFS = `${FileSystem.documentDirectory}fatafalta_prefs.json`;
const readPdfPrefs = async () => {
  try {
    const info = await FileSystem.getInfoAsync(PDF_PREFS);
    return info.exists ? JSON.parse((await FileSystem.readAsStringAsync(PDF_PREFS)) || '{}') : {};
  } catch { return {}; }
};
const writePdfPref = async (key, value) => {
  try {
    const p = await readPdfPrefs();
    p[key] = value;
    await FileSystem.writeAsStringAsync(PDF_PREFS, JSON.stringify(p));
  } catch { /* stockage indisponible */ }
};

const Group = ({ title, children }) => (
  <View style={styles.group}>
    <Text variant="overline" style={styles.groupTitle}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

const ToggleRow = ({ label, help, value, onChange, disabled, last }) => (
  <View style={[styles.row, !last && styles.hair]}>
    <View style={{ flex: 1 }}>
      <Text variant="bodyMedium" style={styles.ink}>{label}</Text>
      {help ? <Text variant="caption" style={styles.muted}>{help}</Text> : null}
    </View>
    <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ false: brand.lineStrong, true: brand.gold }} thumbColor="#FFF" accessibilityLabel={label} />
  </View>
);

const ChoiceRow = ({ label, options, value, onChange, last }) => (
  <View style={[styles.row, styles.choiceRow, !last && styles.hair]}>
    <Text variant="bodyMedium" style={styles.ink}>{label}</Text>
    <View style={styles.choices}>
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[styles.choice, value === v && styles.choiceOn]} accessibilityRole="radio" accessibilityState={{ checked: value === v }}>
          <Text variant="caption" style={[styles.choiceText, value === v && { color: '#FFF' }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

/** Moi › Paramètres (§ 23). */
const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useContext(AuthContext);
  const admin = isAuthenticated && ['admin', 'sub-admin'].includes(user?.role);
  const { enabled, setEnabled, isLoaded } = useCorrectionPromptPreference();
  const { updatePreferences } = usePreferences();
  const prefs = usePrep((s) => s.prefs);
  const setPrefs = usePrep((s) => s.setPrefs);
  const resetOnboarding = usePrep((s) => s.resetOnboarding);
  const [watermark, setWatermark] = useState(true);
  const [footer, setFooter] = useState(false);
  const [footerText, setFooterText] = useState('Fatafalta · Téléchargez plus de documents sur www.fatafalta.com');

  useEffect(() => {
    readPdfPrefs().then((p) => {
      if (p['pdf.addWatermark'] !== undefined) setWatermark(Boolean(p['pdf.addWatermark']));
      if (p['pdf.addFooter'] !== undefined) setFooter(Boolean(p['pdf.addFooter']));
      if (p['pdf.footerText']) setFooterText(String(p['pdf.footerText']));
    });
  }, []);

  const replayWelcome = async () => {
    resetOnboarding();
    await updatePreferences({ hasCompletedOrientation: false });
    navigation.reset({ index: 0, routes: [{ name: 'Orientation' }] });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" style={styles.back}><ArrowLeft size={22} color={brand.ink} /></Pressable>
        <Text variant="h1" style={[styles.ink, { marginTop: 12 }]}>Paramètres</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 20 }}>
        <Group title="Préparation">
          <ChoiceRow label="Objectif quotidien" value={prefs.objectif} onChange={(v) => setPrefs({ objectif: v })} options={[[5, '5 min'], [10, '10 min'], [20, '20 min']]} />
          <ChoiceRow label="Taille du texte des leçons" value={prefs.tailleTexte} onChange={(v) => setPrefs({ tailleTexte: v })} options={[[15, 'A−'], [17, 'A'], [19, 'A+'], [21, 'A++']]} last />
        </Group>

        <Group title="Documents PDF">
          <ToggleRow label="Ajouter un filigrane" value={watermark} onChange={(v) => { setWatermark(v); writePdfPref('pdf.addWatermark', v); }} />
          <ToggleRow label="Ajouter un pied de page" value={footer} onChange={(v) => { setFooter(v); writePdfPref('pdf.addFooter', v); }} last={!admin} />
          {admin ? (
            <View style={styles.row}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="bodyMedium" style={styles.ink}>Texte du pied de page</Text>
                <TextInput value={footerText} onChangeText={setFooterText} onEndEditing={() => writePdfPref('pdf.footerText', footerText)} multiline style={styles.input} accessibilityLabel="Texte du pied de page" />
              </View>
            </View>
          ) : null}
        </Group>

        <Group title="Corrections">
          <ToggleRow label="Proposer automatiquement les corrigés" help="Après le téléchargement d’un sujet." value={enabled} disabled={!isLoaded} onChange={setEnabled} last />
        </Group>

        <PrepButton title="Revoir l’écran d’accueil" variant="secondary" onPress={replayWelcome} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.paper },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paperDim },
  ink: { color: brand.ink },
  muted: { color: brand.inkSoft, marginTop: 2 },
  group: { gap: 8 },
  groupTitle: { color: brand.inkSoft },
  card: { borderRadius: 16, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  choiceRow: { flexDirection: 'column', alignItems: 'flex-start' },
  hair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { minWidth: 56, height: 36, paddingHorizontal: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paperDim },
  choiceOn: { backgroundColor: brand.ink },
  choiceText: { color: brand.ink, fontFamily: theme.fontFamily.semiBold },
  input: { minHeight: 72, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: brand.line, color: brand.ink, fontFamily: theme.fontFamily.regular, textAlignVertical: 'top' },
});

export default SettingsScreen;
