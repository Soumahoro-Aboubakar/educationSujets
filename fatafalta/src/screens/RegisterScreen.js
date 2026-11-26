import Pressable from '../components/ui/FeedbackPressable';
import StatusBar from '../theme/ThemeStatusBar';
import { useTheme, createThemedStyles } from '../theme/ThemeProvider';
import { getErrorMessage } from '../utils/userMessages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { openLegal } from '../utils/legalLinks';
import { Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import Text from '../components/ui/Text';
import { AccountField as FormInput, AccountPaper, useAuthStyles } from '../components/account/AccountPresentation';
import ScreenHeader from '../components/ui/ScreenHeader';
import { PrepButton } from '../prep/ui/primitives';
import AuthContext from '../context/AuthContext';
import { useAuthRedirect } from '../hooks/useAuthRedirect';

const RegisterScreen = ({ navigation, route }) => {
  const { brand } = useTheme();
  const { NAVY_SOFT, legal } = useStyles();
  const styles = useAuthStyles();
  const insets = useSafeAreaInsets();
  const { register, user, isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  // Case jamais cochée par défaut : l'acceptation des conditions est un geste explicite.
  const [accepte, setAccepte] = useState(false);

  const redirectAfterAuth = useAuthRedirect(navigation, route);
  // Inscription en cours : la suite est la vérification de l'adresse, pas la redirection habituelle.
  const justRegistered = useRef(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated || justRegistered.current) return;
    redirectAfterAuth(user);
  }, [authLoading, isAuthenticated, redirectAfterAuth, user]);

  const passwordRequirements = [
    { key: 'length', label: 'Au moins 6 caractères', met: password.length >= 6 },
    { key: 'match', label: 'Les mots de passe correspondent', met: password === confirmPassword && password.length > 0 },
  ];

  const validateForm = () => {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Saisis ton nom.';
    if (!email.trim()) nextErrors.email = 'Saisis ton adresse e-mail.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Cette adresse e-mail n’est pas valide.';
    if (!password) nextErrors.password = 'Saisis ton mot de passe.';
    else if (password.length < 6) nextErrors.password = 'Ton mot de passe doit contenir au moins 6 caractères.';
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Les deux mots de passe ne correspondent pas.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    justRegistered.current = true;
    try {
      const result = await register(name.trim(), email.trim(), password, accepte);
      if (result.success) {
        // Premier code envoyé tout seul ; « Plus tard » reprend la redirection habituelle.
        navigation.replace('VerifyEmail', { ...route?.params, autoSend: true, afterAuth: true });
      } else {
        justRegistered.current = false;
        setError(result.error || getErrorMessage(null, 'inscription', 'tu'));
      }
    } catch (requestError) {
      justRegistered.current = false;
      setError(getErrorMessage(requestError, 'inscription', 'tu'));
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim() && email.trim() && password.length >= 6 && password === confirmPassword && accepte;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Créer un compte" onBack={() => navigation.goBack()} />
        <AccountPaper style={[styles.formArea, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
          <Text variant="body" style={styles.introduction}>Garde tes ressources, tes téléchargements et tes préférences à portée de main.</Text>
          {error ? <View style={styles.errorBanner}><Text variant="bodyMedium" accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.form}>
            <FormInput label="Nom complet" placeholder="Jean Dupont" value={name} onChangeText={(text) => { setName(text); if (errors.name) setErrors({ ...errors, name: null }); }} icon={User} error={errors.name} editable={!loading} />
            <FormInput label="Adresse email" placeholder="toi@exemple.com" value={email} onChangeText={(text) => { setEmail(text); if (errors.email) setErrors({ ...errors, email: null }); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} icon={Mail} error={errors.email} editable={!loading} />
            <View>
              <FormInput label="Mot de passe" placeholder="••••••••" value={password} onChangeText={(text) => { setPassword(text); if (errors.password) setErrors({ ...errors, password: null }); }} secureTextEntry={!showPassword} autoCapitalize="none" icon={Lock} error={errors.password} editable={!loading} trailing={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowPassword((value) => !value)} style={styles.showPasswordButton}>{showPassword ? <EyeOff size={18} color={NAVY_SOFT} strokeWidth={2} /> : <Eye size={18} color={NAVY_SOFT} strokeWidth={2} />}</Pressable>} />
            </View>
            <View>
              <FormInput label="Confirmer le mot de passe" placeholder="••••••••" value={confirmPassword} onChangeText={(text) => { setConfirmPassword(text); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null }); }} secureTextEntry={!showConfirmPassword} autoCapitalize="none" icon={Lock} error={errors.confirmPassword} editable={!loading} trailing={<Pressable accessibilityRole="button" accessibilityLabel={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowConfirmPassword((value) => !value)} style={styles.showPasswordButton}>{showConfirmPassword ? <EyeOff size={18} color={NAVY_SOFT} strokeWidth={2} /> : <Eye size={18} color={NAVY_SOFT} strokeWidth={2} />}</Pressable>} />
            </View>
          </View>
          <View style={styles.requirements}>
            {passwordRequirements.map((requirement) => (
              <View key={requirement.key} style={styles.requirement}>
                <View style={[styles.requirementMark, requirement.met && styles.requirementMarkMet]}>{requirement.met ? <Check size={12} color={brand.onInk} strokeWidth={2.2} /> : null}</View>
                <Text variant="caption" style={[styles.requirementLabel, requirement.met && styles.requirementLabelMet]}>{requirement.label}</Text>
              </View>
            ))}
          </View>
          <View style={legal.row}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepte }}
              accessibilityLabel="J’accepte les conditions d’utilisation et les conditions d’abonnement, et j’ai lu la politique de confidentialité"
              onPress={() => setAccepte((value) => !value)}
              hitSlop={8}
              style={[legal.box, accepte && legal.boxOn]}
            >
              {accepte ? <Check size={14} color={brand.onInk} strokeWidth={2.6} /> : null}
            </Pressable>
            <Text variant="caption" style={legal.text}>
              J’accepte les{' '}
              <Text variant="caption" style={legal.link} onPress={() => openLegal('conditions-utilisation')} accessibilityRole="link">conditions d’utilisation</Text>
              {' '}et les{' '}
              <Text variant="caption" style={legal.link} onPress={() => openLegal('conditions-vente')} accessibilityRole="link">conditions d’abonnement</Text>
              . J’ai lu la{' '}
              <Text variant="caption" style={legal.link} onPress={() => openLegal('politique-confidentialite')} accessibilityRole="link">politique de confidentialité</Text>
              .
            </Text>
          </View>
          <View style={styles.submit}>
            <PrepButton title="Créer mon compte" loading={loading} disabled={loading || !isFormValid} onPress={handleRegister} />
          </View>
          <View style={styles.loginLink}><Text variant="body" style={styles.linkPrefix}>Tu as déjà un compte ?</Text><Pressable onPress={() => (route?.params?.returnTo ? navigation.replace('Login', route.params) : navigation.navigate('Login'))} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.8 }]}><Text variant="bodyMedium" style={styles.linkLabel}>Se connecter</Text></Pressable></View>
        </AccountPaper>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;

const useStyles = createThemedStyles(({ brand }) => {
  const NAVY_SOFT = brand.inkSoft;
  const legal = {
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 20 },
    box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: brand.lineStrong, backgroundColor: brand.sheet, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    boxOn: { backgroundColor: brand.burgundy, borderColor: brand.burgundy },
    text: { flex: 1, color: brand.inkSoft, lineHeight: 20 },
    link: { color: brand.burgundy, fontWeight: '600', textDecorationLine: 'underline' },
  };
  return { NAVY_SOFT, legal };
});
