import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Text from '../ui/Text';

import { CopyMargin } from '../../prep/components/StudyPresentation';

/** La marge appartient au papier ; elle ne porte aucune donnée du compte. */
export const AccountPaper = ({ children, style }) => {
  const { styles } = useStyles();
  return (<View style={[styles.paper, style]}>
    <CopyMargin style={styles.margin} />
    {children}
  </View>);
};

/** Champ autonome : libellé, saisie et erreur restent groupés en grand texte. */
export const AccountField = ({ label, icon: Icon, error, trailing, style, ...props }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  return (<View style={styles.field}>
    <Text variant="bodyMedium" style={styles.label}>{label}</Text>
    <View style={[styles.inputRow, error && styles.inputError]}>
      {Icon ? <Icon size={19} color={brand.inkSoft} strokeWidth={1.9} /> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error || undefined}
        placeholderTextColor={brand.inkSoft}
        selectionColor={brand.burgundy}
        style={[styles.input, style]}
        {...props}
      />
      {trailing}
    </View>
    {error ? <Text variant="caption" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  </View>);
};

export const useAuthStyles = createThemedStyles(({ theme, brand }) => StyleSheet.create({
  container: { ...theme.layout.readingFrame, flex: 1, backgroundColor: brand.paper },
  scrollContent: { flexGrow: 1 },
  formArea: { flexGrow: 1, flexShrink: 0, paddingTop: 12, paddingBottom: 32 },
  introduction: { color: brand.inkSoft, marginBottom: 28, lineHeight: 23 },
  form: { gap: 20 },
  errorBanner: { padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.error, borderRadius: 12, backgroundColor: theme.colors.errorWash },
  errorText: { color: theme.colors.error },
  showPasswordButton: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: brand.paperDim },
  submit: { marginTop: 'auto', paddingTop: 32 },
  registerLink: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  loginLink: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  linkPrefix: { color: brand.inkSoft, fontSize: 14 },
  linkLabel: { color: brand.burgundy, fontFamily: theme.fontFamily.semiBold, fontSize: 14 },
  linkButton: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 22, backgroundColor: brand.burgundyWash },
  requirements: { gap: 10, marginTop: 20, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: brand.line },
  requirement: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requirementMark: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: brand.lineStrong, borderRadius: 9 },
  requirementMarkMet: { backgroundColor: theme.colors.successSolid, borderColor: theme.colors.success },
  requirementLabel: { flex: 1, color: brand.inkSoft, fontSize: 13 },
  requirementLabelMet: { color: brand.ink },
}));

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    paper: { paddingHorizontal: 28 },
    margin: { left: 10 },
    field: { gap: 8 },
    label: { color: brand.ink, fontSize: 15 },
    inputRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 4, borderRadius: 14, borderWidth: 1, borderColor: brand.lineStrong, backgroundColor: brand.sheet },
    inputError: { borderColor: theme.colors.error },
    input: { flex: 1, minWidth: 0, minHeight: 56, paddingVertical: 14, paddingRight: 10, color: brand.ink, fontFamily: theme.fontFamily.regular, fontSize: 16 },
    error: { color: theme.colors.error },
  });
  return { styles };
});
