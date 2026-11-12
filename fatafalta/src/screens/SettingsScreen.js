import useAsyncAction from '../hooks/useAsyncAction';
import { getErrorMessage } from '../utils/userMessages';
import Pressable from '../components/ui/FeedbackPressable';
import { lightTheme, nightTheme, useTheme, useThemePreference, createThemedStyles } from '../theme/ThemeProvider';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Switch, TextInput, useWindowDimensions, View } from 'react-native';
import { Check, Moon, Sun } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import Text from '../components/ui/Text';
import AuthContext from '../context/AuthContext';
import useCorrectionPromptPreference from '../hooks/useCorrectionPromptPreference';
import { usePreferences } from '../context/PreferencesContext';
import usePrep from '../prep/store';
import ScreenHeader from '../components/ui/ScreenHeader';
import { AccountScroll } from '../components/account/AccountLayout';
import { PrepButton } from '../prep/ui/primitives';

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
  const p = await readPdfPrefs();
  p[key] = value;
  await FileSystem.writeAsStringAsync(PDF_PREFS, JSON.stringify(p));
};

const Group = ({ title, children }) => {
  const { styles } = useStyles();
  return (<View style={styles.group}>
    <Text variant="h2" accessibilityRole="header" style={styles.groupTitle}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>);
};

const ToggleRow = ({ label, help, value, onChange, disabled, busy, last }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  return (<View style={[styles.row, !last && styles.hair]}>
    <View style={{ flex: 1 }}>
      <Text variant="bodyMedium" style={styles.ink}>{label}</Text>
      {help ? <Text variant="caption" style={styles.muted}>{help}</Text> : null}
    </View>
    <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }} trackColor={{ false: brand.lineStrong, true: brand.burgundy }} thumbColor={brand.onInk} style={{ minHeight: 44, minWidth: 44 }} accessibilityLabel={label} />
  </View>);
};

const ChoiceRow = ({ label, options, value, onChange, last }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  return (<View style={[styles.row, styles.choiceRow, !last && styles.hair]}>
    <Text variant="bodyMedium" style={styles.ink}>{label}</Text>
    <View style={styles.choices}>
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[styles.choice, value === v && styles.choiceOn]} accessibilityLabel={`${label} : ${l}`} accessibilityRole="radio" accessibilityState={{ checked: value === v }}>
          <Text variant="caption" style={[styles.choiceText, value === v && { color: brand.onInk }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  </View>);
};

/** Deux copies miniatures : l'aperçu reste visible dans chacun des thèmes. */
const AppearanceChoice = () => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const { mode, setMode, isReady, saveError } = useThemePreference();
  const requestedMode = React.useRef(mode);
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 260;
  return <View style={styles.appearance}>
    <Text variant="body" style={styles.muted}>Choisis la lumière de ta copie.</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel="Apparence" style={[styles.appearanceControl, stacked && styles.appearanceStack]}>
      {[["light", "Clair", Sun, lightTheme], ["dark", "Sombre", Moon, nightTheme]].map(([value, label, Icon, palette]) => {
        const selected = mode === value;
        return <Pressable key={value} onPress={() => { requestedMode.current = value; return setMode(value); }} disabled={!isReady}
          accessibilityRole="radio" accessibilityLabel={`Thème ${label.toLocaleLowerCase()}`}
          accessibilityState={{ checked: selected, disabled: !isReady }}
          style={({ pressed }) => [styles.appearanceOption, selected && styles.appearanceSelected, pressed && styles.appearancePressed]}>
          <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[styles.preview, { backgroundColor: palette.brand.paper, borderColor: palette.brand.line }]}>
            <View style={[styles.previewHeader, { backgroundColor: palette.brand.night }]} />
            <View style={styles.previewBody}>
              <View style={[styles.previewMargin, { borderColor: palette.brand.burgundy }]} />
              <View style={[styles.previewTitle, { backgroundColor: palette.brand.ink }]} />
              {[0, 1, 2].map((line) => <View key={line} style={[styles.previewLine, { backgroundColor: palette.brand.lineStrong }]} />)}
              <View style={[styles.previewAction, { backgroundColor: palette.brand.action }]} />
            </View>
          </View>
          <View style={styles.appearanceLabel}>
            <Icon size={19} strokeWidth={2} color={selected ? brand.burgundy : brand.inkSoft} />
            <Text variant="bodyMedium" style={[styles.appearanceText, selected && { color: brand.burgundy }]}>{label}</Text>
            <View style={styles.appearanceCheck}>{selected ? <Check size={18} strokeWidth={2.2} color={brand.burgundy} /> : null}</View>
          </View>
        </Pressable>;
      })}
    </View>
    {saveError ? <View accessibilityLiveRegion="polite" style={styles.appearanceError}>
      <Text variant="caption" style={styles.muted}>{getErrorMessage(saveError, 'enregistrement')}</Text>
      <PrepButton title="Réessayer l’enregistrement" variant="link" compact onPress={() => setMode(requestedMode.current)} />
    </View> : null}
  </View>;
};

/** Moi › Paramètres (§ 23). */
const SettingsScreen = () => {
  const { styles } = useStyles();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useContext(AuthContext);
  const admin = isAuthenticated && ['admin', 'sub-admin'].includes(user?.role);
  const { enabled, setEnabled, isLoaded, saving: savingPrompt } = useCorrectionPromptPreference();
  const { updatePreferences } = usePreferences();
  const prefs = usePrep((s) => s.prefs);
  const setPrefs = usePrep((s) => s.setPrefs);
  const resetOnboarding = usePrep((s) => s.resetOnboarding);
  const [runPdf, savingPdf] = useAsyncAction();
  const [pdfReady, setPdfReady] = useState(false);
  const savedFooterText = React.useRef('Fatafalta · Téléchargez plus de documents sur www.fatafalta.com');
  const [watermark, setWatermark] = useState(true);
  const [footer, setFooter] = useState(false);
  const [footerText, setFooterText] = useState('Fatafalta · Téléchargez plus de documents sur www.fatafalta.com');

  useEffect(() => {
    readPdfPrefs().then((p) => {
      if (p['pdf.addWatermark'] !== undefined) setWatermark(Boolean(p['pdf.addWatermark']));
      if (p['pdf.addFooter'] !== undefined) setFooter(Boolean(p['pdf.addFooter']));
      if (p['pdf.footerText']) { setFooterText(String(p['pdf.footerText'])); savedFooterText.current = String(p['pdf.footerText']); }
      setPdfReady(true);
    });
  }, []);

  const savePdf = (key, value, previous, setter) => runPdf(async () => {
    setter(value);
    try {
      await writePdfPref(key, value);
      if (key === 'pdf.footerText') savedFooterText.current = value;
    } catch (error) {
      setter(previous);
      throw error;
    }
  });

  const replayWelcome = async () => {
    resetOnboarding();
    await updatePreferences({ hasCompletedOrientation: false });
    navigation.reset({ index: 0, routes: [{ name: 'Orientation' }] });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Paramètres" onBack={() => navigation.goBack()} />
      <AccountScroll>
        <Group title="Apparence"><AppearanceChoice /></Group>
        <Group title="Préparation">
          <ChoiceRow label="Objectif quotidien" value={prefs.objectif} onChange={(v) => setPrefs({ objectif: v })} options={[[5, '5 min'], [10, '10 min'], [20, '20 min']]} />
          <ChoiceRow label="Taille du texte des leçons" value={prefs.tailleTexte} onChange={(v) => setPrefs({ tailleTexte: v })} options={[[15, 'A−'], [17, 'A'], [19, 'A+'], [21, 'A++']]} last />
        </Group>

        <Group title="Documents PDF">
          <ToggleRow label="Ajouter un filigrane" value={watermark} disabled={!pdfReady || savingPdf} busy={savingPdf} onChange={(v) => savePdf('pdf.addWatermark', v, watermark, setWatermark)} />
          <ToggleRow label="Ajouter un pied de page" value={footer} disabled={!pdfReady || savingPdf} busy={savingPdf} onChange={(v) => savePdf('pdf.addFooter', v, footer, setFooter)} last={!admin} />
          {admin ? (
            <View style={styles.row}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="bodyMedium" style={styles.ink}>Texte du pied de page</Text>
                {savingPdf ? <Text variant="caption" style={styles.muted} accessibilityLiveRegion="polite">Enregistrement…</Text> : null}
                <TextInput value={footerText} onChangeText={setFooterText} editable={pdfReady && !savingPdf} onEndEditing={() => savePdf('pdf.footerText', footerText, savedFooterText.current, setFooterText)} multiline style={styles.input} accessibilityLabel="Texte du pied de page" />
              </View>
            </View>
          ) : null}
        </Group>

        <Group title="Corrections">
          <ToggleRow label="Proposer automatiquement les corrigés" help="Après le téléchargement d’un sujet." value={enabled} disabled={!isLoaded || savingPrompt} busy={savingPrompt} onChange={setEnabled} last />
        </Group>

        <PrepButton title="Revoir l’écran d’accueil" variant="secondary" onPress={replayWelcome} />
      </AccountScroll>
    </View>
  );
};

export default SettingsScreen;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    container: { ...theme.layout.readingFrame, flex: 1, backgroundColor: brand.paper },

    ink: { color: brand.ink },
    muted: { color: brand.inkSoft, marginTop: 2 },
    group: { gap: 12, marginBottom: 28 },
    groupTitle: { color: brand.ink, fontFamily: theme.fontFamily.serif },
    card: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: brand.line },
    row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 0, paddingVertical: 18 },
    choiceRow: { flexDirection: 'column', alignItems: 'flex-start' },
    hair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { minWidth: 56, minHeight: 44, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paperDim },
    choiceOn: { backgroundColor: brand.burgundySolid },
    choiceText: { color: brand.ink, fontFamily: theme.fontFamily.semiBold },
    input: { minHeight: 72, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: brand.line, color: brand.ink, fontFamily: theme.fontFamily.regular, textAlignVertical: 'top' },
    appearance: { paddingVertical: 18, gap: 16 },
    appearanceControl: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 20, backgroundColor: brand.paperDim, borderWidth: 1, borderColor: brand.lineStrong },
    appearanceStack: { flexDirection: 'column' },
    appearanceOption: { flex: 1, minWidth: 0, padding: 10, gap: 12, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
    appearanceSelected: { backgroundColor: brand.sheet, borderColor: brand.burgundy },
    appearancePressed: { opacity: 0.85 },
    appearanceLabel: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
    appearanceText: { flex: 1, color: brand.ink, textAlign: 'center' },
    appearanceCheck: { width: 18 },
    appearanceError: { gap: 12 },
    preview: { alignSelf: 'stretch', height: 100, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
    previewHeader: { height: 22 },
    previewBody: { flex: 1, paddingHorizontal: 20, paddingVertical: 10, gap: 5 },
    previewMargin: { position: 'absolute', left: 10, top: 0, bottom: 0, width: 4, borderLeftWidth: 1, borderRightWidth: 1 },
    previewTitle: { width: '65%', height: 5, borderRadius: 2, marginBottom: 3 },
    previewLine: { height: StyleSheet.hairlineWidth },
    previewAction: { marginTop: 3, height: 12, width: '70%', borderRadius: 4 },
  });
  return { styles };
});
