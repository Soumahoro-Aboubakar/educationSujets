import Pressable from '../components/ui/FeedbackPressable';
import StatusBar from '../theme/ThemeStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useContext, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import Text from '../components/ui/Text';
import { AccountField, AccountPaper, useAuthStyles } from '../components/account/AccountPresentation';
import { CodeField, ResendCode } from '../components/account/EmailCode';
import ScreenHeader from '../components/ui/ScreenHeader';
import { PrepButton } from '../prep/ui/primitives';
import { haptic } from '../prep/feedback';
import AuthContext from '../context/AuthContext';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { emailAuth, emailErrorMessage } from '../services/emailAuth';
import { useTheme } from '../theme/ThemeProvider';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mot de passe oublié, en deux temps : l'adresse, puis le code reçu et le nouveau mot de passe.
 * La réponse est la même qu'un compte existe ou non (rien n'est révélé). Après le changement,
 * toutes les sessions sont fermées par le serveur et l'utilisateur est connecté sur cet appareil.
 */
const ForgotPasswordScreen = ({ navigation, route }) => {
  const { brand } = useTheme();
  const styles = useAuthStyles();
  const insets = useSafeAreaInsets();
  const { login, user, isAuthenticated } = useContext(AuthContext);
  const redirectAfterAuth = useAuthRedirect(navigation, route);

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(route?.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [cooldownFrom, setCooldownFrom] = useState(null);

  useEffect(() => {
    if (step === 'done' && isAuthenticated) redirectAfterAuth(user);
  }, [step, isAuthenticated, redirectAfterAuth, user]);

  const request = async () => {
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) { setError('Cette adresse e-mail n’est pas valide.'); return false; }
    setError(null);
    try {
      const data = await emailAuth.forgot(address);
      setRemaining(data?.remaining ?? null);
      setCooldownFrom(Date.now());
      setStep('code');
      return true;
    } catch (requestError) {
      setError(emailErrorMessage(requestError));
      haptic.error?.();
      return false;
    }
  };

  const submitEmail = async () => {
    setLoading(true);
    try { await request(); } finally { setLoading(false); }
  };

  const reset = async () => {
    if (code.length !== 6) { setError('Saisis les 6 chiffres reçus par e-mail.'); return; }
    if (password.length < 6) { setError('Ton nouveau mot de passe doit contenir au moins 6 caractères.'); return; }
    setError(null);
    setLoading(true);
    const address = email.trim().toLowerCase();
    try {
      await emailAuth.reset(address, code, password);
      haptic.success?.();
      const result = await login(address, password);
      if (result.success) setStep('done');
      else navigation.replace('Login', { ...route?.params, email: address });
    } catch (requestError) {
      setError(emailErrorMessage(requestError, 'reset'));
      haptic.error?.();
    } finally {
      setLoading(false);
    }
  };

  const bottom = { paddingBottom: Math.max(insets.bottom, 16) + 24 };
  const address = email.trim();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title={step === 'email' ? 'Mot de passe oublié' : 'Nouveau mot de passe'} onBack={() => (step === 'code' ? (setStep('email'), setError(null)) : navigation.goBack())} />
        <AccountPaper style={[styles.formArea, bottom]}>
          <Text variant="body" style={styles.introduction}>
            {step === 'email'
              ? 'Saisis l’adresse de ton compte : tu recevras un code à 6 chiffres pour choisir un nouveau mot de passe.'
              : `Si un compte existe avec ${address}, un code à 6 chiffres vient d’y être envoyé. Pense aux courriers indésirables.`}
          </Text>
          {error ? <View style={styles.errorBanner}><Text variant="bodyMedium" accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text></View> : null}

          {step === 'email' ? (
            <View style={styles.form}>
              <AccountField label="Adresse email" placeholder="toi@exemple.com" value={email} onChangeText={(text) => { setEmail(text); if (error) setError(null); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" icon={Mail} editable={!loading} returnKeyType="send" onSubmitEditing={submitEmail} />
            </View>
          ) : (
            <View style={styles.form}>
              <CodeField value={code} onChangeText={(text) => { setCode(text); if (error) setError(null); }} editable={!loading} />
              <AccountField
                label="Nouveau mot de passe"
                placeholder="6 caractères au moins"
                value={password}
                onChangeText={(text) => { setPassword(text); if (error) setError(null); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                icon={Lock}
                editable={!loading}
                trailing={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowPassword((value) => !value)} style={styles.showPasswordButton}>
                  {showPassword ? <EyeOff size={18} color={brand.inkSoft} strokeWidth={2} /> : <Eye size={18} color={brand.inkSoft} strokeWidth={2} />}
                </Pressable>}
              />
            </View>
          )}
          {step === 'code' ? <ResendCode onResend={request} remaining={remaining} cooldownFrom={cooldownFrom} /> : null}

          <View style={styles.submit}>
            {step === 'email'
              ? <PrepButton title="Recevoir un code" loading={loading} disabled={loading || !EMAIL_RE.test(address)} onPress={submitEmail} />
              : <PrepButton title="Changer le mot de passe" loading={loading} disabled={loading || code.length !== 6 || password.length < 6} onPress={reset} />}
          </View>
          <View style={styles.registerLink}>
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.8 }]}>
              <Text variant="bodyMedium" style={styles.linkLabel}>Retour à la connexion</Text>
            </Pressable>
          </View>
        </AccountPaper>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
