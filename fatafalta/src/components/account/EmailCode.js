import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { KeyRound, RotateCw } from 'lucide-react-native';
import Text from '../ui/Text';
import { AccountField } from './AccountPresentation';
import { InlineAction } from '../../prep/ui/primitives';
import { createThemedStyles } from '../../theme/ThemeProvider';
import { remainingLabel } from '../../services/emailAuth';

/** Champ du code à 6 chiffres : pavé numérique, remplissage automatique depuis l'e-mail (iOS). */
export const CodeField = ({ value, onChangeText, error, editable = true, autoFocus = false, onSubmitEditing }) => {
  const { styles } = useStyles();
  return (
    <AccountField
      label="Code reçu par e-mail"
      placeholder="••••••"
      icon={KeyRound}
      value={value}
      onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
      maxLength={6}
      autoFocus={autoFocus}
      editable={editable}
      error={error}
      returnKeyType="done"
      onSubmitEditing={onSubmitEditing}
      style={styles.code}
    />
  );
};

/**
 * « Renvoyer le code » : attente de 60 s entre deux envois, puis indication des envois restants
 * aujourd'hui (3 par jour au plus).
 */
export const ResendCode = ({ onResend, remaining, cooldownFrom }) => {
  const { styles } = useStyles();
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cooldownFrom) return undefined;
    const tick = () => setLeft(Math.max(0, 60 - Math.floor((Date.now() - cooldownFrom) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [cooldownFrom]);

  const exhausted = remaining !== null && remaining !== undefined && remaining <= 0;
  const disabled = busy || left > 0 || exhausted;
  const label = left > 0 ? `Renvoyer le code (${left} s)` : 'Renvoyer le code';
  const press = async () => {
    setBusy(true);
    try { await onResend(); } finally { setBusy(false); }
  };

  return (
    <View style={styles.resend}>
      <InlineAction title={busy ? 'Envoi…' : label} icon={RotateCw} onPress={press} disabled={disabled} accessibilityLabel={label} />
      {remainingLabel(remaining) ? <Text variant="caption" style={styles.remaining}>{remainingLabel(remaining)}</Text> : null}
    </View>
  );
};

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    code: { fontFamily: theme.fontFamily.semiBold, fontSize: 22, letterSpacing: 8, fontVariant: ['tabular-nums'] },
    resend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 20 },
    remaining: { color: brand.inkSoft },
  });
  return { styles };
});
