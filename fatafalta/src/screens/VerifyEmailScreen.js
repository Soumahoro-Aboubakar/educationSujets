import Pressable from '../components/ui/FeedbackPressable';
import StatusBar from '../theme/ThemeStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import Text from '../components/ui/Text';
import { AccountPaper, useAuthStyles } from '../components/account/AccountPresentation';
import { CodeField, ResendCode } from '../components/account/EmailCode';
import ScreenHeader from '../components/ui/ScreenHeader';
import { PrepButton } from '../prep/ui/primitives';
import { haptic } from '../prep/feedback';
import AuthContext from '../context/AuthContext';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { emailAuth, emailErrorMessage } from '../services/emailAuth';
import { createThemedStyles, useTheme } from '../theme/ThemeProvider';

// Envoi automatique une seule fois par compte et par lancement de l'app (pas de second e-mail au retour).
const autoSent = new Set();

/**
 * Vérification de l'adresse e-mail par un code à 6 chiffres.
 * - Après l'inscription (`afterAuth`) : le premier code part tout seul ; « Plus tard » mène à l'app.
 * - Depuis « Mon compte » : l'utilisateur demande le code lui-même.
 */
const VerifyEmailScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useAuthStyles();
  const { styles: own } = useStyles();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useContext(AuthContext);
  const afterAuth = Boolean(route?.params?.afterAuth);
  const redirectAfterAuth = useAuthRedirect(navigation, route);

  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [cooldownFrom, setCooldownFrom] = useState(null);
  const [verified, setVerified] = useState(Boolean(user?.isVerified));
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const finish = useCallback(() => {
    if (afterAuth) redirectAfterAuth(user);
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs', { screen: 'AccountTab' });
  }, [afterAuth, navigation, redirectAfterAuth, user]);

  const send = useCallback(async () => {
    setError(null);
    setSending(true);
    try {
      const data = await emailAuth.sendVerification();
      if (!mounted.current) return;
      if (data?.alreadyVerified) { updateUser({ isVerified: true }); setVerified(true); return; }
      setSent(true);
      setRemaining(data?.remaining ?? null);
      setCooldownFrom(Date.now());
    } catch (requestError) {
      if (!mounted.current) return;
      setError(emailErrorMessage(requestError));
      haptic.error?.();
    } finally {
      if (mounted.current) setSending(false);
    }
  }, [updateUser]);

  useEffect(() => {
    if (!user?._id && !user?.id) return;
    if (user.isVerified) return;
    const id = String(user._id || user.id);
    if (route?.params?.autoSend && !autoSent.has(id)) {
      autoSent.add(id);
      send();
    } else {
      emailAuth.quota().then((data) => { if (mounted.current) setRemaining(data?.remaining ?? null); }).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = async () => {
    if (code.length !== 6) { setError('Saisis les 6 chiffres reçus par e-mail.'); return; }
    setError(null);
    setVerifying(true);
    try {
      await emailAuth.verify(code);
      updateUser({ isVerified: true });
      haptic.success?.();
      setVerified(true);
    } catch (requestError) {
      setError(emailErrorMessage(requestError));
      haptic.error?.();
    } finally {
      setVerifying(false);
    }
  };

  const bottom = { paddingBottom: Math.max(insets.bottom, 16) + 24 };

  if (verified) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ScreenHeader title="Adresse vérifiée" onBack={afterAuth ? undefined : () => navigation.goBack()} />
        <AccountPaper style={[styles.formArea, bottom]}>
          <View style={own.done}>
            <View style={own.doneMark}><CheckCircle2 size={30} color={theme.colors.success} strokeWidth={2} /></View>
            <Text variant="h2" style={own.doneTitle}>C’est confirmé</Text>
            <Text variant="body" style={own.doneText}>{user?.email} est bien ton adresse. Tu pourras l’utiliser pour retrouver ton compte.</Text>
          </View>
          <View style={styles.submit}><PrepButton title="Continuer" onPress={finish} /></View>
        </AccountPaper>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Vérifier ton e-mail" onBack={afterAuth ? undefined : () => navigation.goBack()} />
        <AccountPaper style={[styles.formArea, bottom]}>
          <Text variant="body" style={styles.introduction}>
            {sent || route?.params?.autoSend
              ? `Un code à 6 chiffres a été envoyé à ${user?.email || 'ton adresse'}. Pense à regarder dans les courriers indésirables.`
              : `Reçois un code à 6 chiffres sur ${user?.email || 'ton adresse'} pour confirmer qu’elle t’appartient.`}
          </Text>
          {error ? <View style={styles.errorBanner}><Text variant="bodyMedium" accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text></View> : null}

          {sent || route?.params?.autoSend ? (
            <>
              <CodeField value={code} onChangeText={(text) => { setCode(text); if (error) setError(null); }} editable={!verifying} onSubmitEditing={verify} />
              <ResendCode onResend={send} remaining={remaining} cooldownFrom={cooldownFrom} />
            </>
          ) : null}

          <View style={styles.submit}>
            {sent || route?.params?.autoSend
              ? <PrepButton title="Vérifier" loading={verifying} disabled={verifying || sending || code.length !== 6} onPress={verify} />
              : <PrepButton title="Recevoir le code" loading={sending} disabled={sending || remaining === 0} onPress={send} />}
          </View>
          {afterAuth ? (
            <View style={styles.registerLink}>
              <Pressable onPress={finish} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.8 }]}>
                <Text variant="bodyMedium" style={styles.linkLabel}>Plus tard</Text>
              </Pressable>
            </View>
          ) : null}
        </AccountPaper>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default VerifyEmailScreen;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    done: { alignItems: 'flex-start', gap: 12, marginTop: 8 },
    doneMark: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.successWash },
    doneTitle: { color: brand.ink },
    doneText: { color: brand.inkSoft, lineHeight: 23 },
  });
  return { styles };
});
