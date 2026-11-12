import Pressable from '../components/ui/FeedbackPressable';
import StatusBar from '../theme/ThemeStatusBar';
import { createThemedStyles } from '../theme/ThemeProvider';
import { getErrorMessage } from '../utils/userMessages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useContext, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import Text from '../components/ui/Text';
import { AccountField as FormInput, AccountPaper, useAuthStyles } from '../components/account/AccountPresentation';
import ScreenHeader from '../components/ui/ScreenHeader';
import { PrepButton } from '../prep/ui/primitives';
import AuthContext from '../context/AuthContext';
import { useAuthRedirect } from '../hooks/useAuthRedirect';

const LoginScreen = ({ navigation, route }) => {
  const { NAVY_SOFT } = useStyles();
  const styles = useAuthStyles();
  const insets = useSafeAreaInsets();
  const { login, user, isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const redirectAfterAuth = useAuthRedirect(navigation, route);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    redirectAfterAuth(user);
  }, [authLoading, isAuthenticated, redirectAfterAuth, user]);

  const validateForm = () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Saisis ton adresse e-mail.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Cette adresse e-mail n’est pas valide.';
    if (!password) nextErrors.password = 'Saisis ton mot de passe.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || getErrorMessage(null, 'connexion', 'tu'));
        return;
      }
      redirectAfterAuth(result.user);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'connexion', 'tu'));
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim() && password.length > 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Se connecter" onBack={() => navigation.goBack()} />
        <AccountPaper style={[styles.formArea, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
          <Text variant="body" style={styles.introduction}>Retrouve tes documents, tes téléchargements et ton espace personnel.</Text>
          {error ? <View style={styles.errorBanner}><Text variant="bodyMedium" accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.form}>
            <FormInput label="Adresse email" placeholder="toi@exemple.com" value={email} onChangeText={(text) => { setEmail(text); if (errors.email) setErrors({ ...errors, email: null }); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} icon={Mail} error={errors.email} editable={!loading} />
            <View>
              <FormInput label="Mot de passe" placeholder="••••••••" value={password} onChangeText={(text) => { setPassword(text); if (errors.password) setErrors({ ...errors, password: null }); }} secureTextEntry={!showPassword} autoCapitalize="none" icon={Lock} error={errors.password} editable={!loading} trailing={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowPassword((value) => !value)} style={styles.showPasswordButton}>
                {showPassword ? <EyeOff size={18} color={NAVY_SOFT} strokeWidth={2} /> : <Eye size={18} color={NAVY_SOFT} strokeWidth={2} />}
              </Pressable>} />
            </View>
          </View>
          <View style={styles.submit}>
            <PrepButton title="Accéder à mon espace" loading={loading} disabled={loading || !isFormValid} onPress={handleLogin} />
          </View>
          <View style={styles.registerLink}><Text variant="body" style={styles.linkPrefix}>Pas encore de compte ?</Text><Pressable onPress={() => (route?.params?.returnTo ? navigation.replace('Register', route.params) : navigation.navigate('Register'))} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.8 }]}><Text variant="bodyMedium" style={styles.linkLabel}>S’inscrire</Text></Pressable></View>
        </AccountPaper>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const useStyles = createThemedStyles(({ brand }) => {
  const NAVY_SOFT = brand.inkSoft;
  return { NAVY_SOFT };
});
