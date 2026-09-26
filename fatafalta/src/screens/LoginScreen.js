import React, { useContext, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import Text from '../components/ui/Text';
import FormInput from '../components/ui/FormInput';
import AuthContext from '../context/AuthContext';
import theme from '../theme/tokens';

const NAVY = '#0D1B32';
const NAVY_SOFT = '#4F5E72';
const SURFACE = '#FCFAF5';
const GOLD = '#B48A48';
const BURGUNDY = '#6C2838';
const LINE = '#DED8CC';

const LoginScreen = ({ navigation }) => {
  const { login, user, isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    navigation.reset({
      index: 0,
      routes: [
        user?.role === 'admin' || user?.role === 'sub-admin'
          ? { name: 'MainTabs', params: { screen: 'AdminTab' } }
          : { name: 'MainTabs' },
      ],
    });
  }, [authLoading, isAuthenticated, navigation, user?.role]);

  const validateForm = () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Email invalide';
    if (!password) nextErrors.password = 'Mot de passe requis';
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
        setError(result.error || 'Erreur lors de la connexion');
        return;
      }
      navigation.reset({
        index: 0,
        routes: [result.user?.role === 'admin' || result.user?.role === 'sub-admin'
          ? { name: 'MainTabs', params: { screen: 'AdminTab' } }
          : { name: 'MainTabs' }],
      });
    } catch (requestError) {
      setError('Erreur inattendue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim() && password.length > 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={theme.hitSlop} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <ArrowLeft size={21} color="#FFFFFF" strokeWidth={1.9} />
            </Pressable>
            <View style={styles.brandLockup}>
              <View style={styles.brandRule} />
              <Text variant="overline" style={styles.brandName}>Éducation CI</Text>
            </View>
          </View>
          <Text variant="overline" style={styles.eyebrow}>Votre espace</Text>
          <Text variant="h1" style={styles.title}>Se connecter</Text>
          <Text variant="body" style={styles.introduction}>Retrouve tes documents, tes téléchargements et ton espace personnel.</Text>
        </View>

        <View style={styles.formArea}>
          <View style={styles.sectionHeader}>
            <Text variant="overline" style={styles.sectionEyebrow}>Identifiants</Text>
            <View style={styles.sectionRule} />
          </View>
          {error ? <View style={styles.errorBanner}><Text variant="bodyMedium" style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.form}>
            <FormInput label="Adresse email" placeholder="votre@email.com" value={email} onChangeText={(text) => { setEmail(text); if (errors.email) setErrors({ ...errors, email: null }); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} icon={Mail} error={errors.email} editable={!loading} />
            <View>
              <FormInput label="Mot de passe" placeholder="••••••••" value={password} onChangeText={(text) => { setPassword(text); if (errors.password) setErrors({ ...errors, password: null }); }} secureTextEntry={!showPassword} autoCapitalize="none" icon={Lock} error={errors.password} editable={!loading} />
              <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowPassword((value) => !value)} style={styles.showPasswordButton}>
                {showPassword ? <EyeOff size={18} color={NAVY_SOFT} strokeWidth={1.8} /> : <Eye size={18} color={NAVY_SOFT} strokeWidth={1.8} />}
              </Pressable>
            </View>
          </View>
          <Pressable disabled={loading || !isFormValid} onPress={handleLogin} style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryPressed, (loading || !isFormValid) && styles.disabled]}>
            <Text variant="bodyMedium" style={styles.primaryLabel}>{loading ? 'Connexion en cours…' : 'Accéder à mon espace'}</Text>
            {!loading ? <ArrowUpRight size={18} color="#FFFFFF" strokeWidth={1.8} /> : null}
          </Pressable>
          <View style={styles.registerLink}><Text variant="body" style={styles.linkPrefix}>Pas encore de compte ?</Text><Pressable onPress={() => navigation.navigate('Register')}><Text variant="bodyMedium" style={styles.linkLabel}>S’inscrire</Text></Pressable></View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  scrollContent: { flexGrow: 1 },
  hero: { paddingTop: 58, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xl, backgroundColor: NAVY },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  brandRule: { width: 18, height: 2, backgroundColor: GOLD },
  brandName: { color: '#F4E6C8', fontSize: 10, letterSpacing: 1.25 },
  eyebrow: { marginTop: theme.spacing.xl, color: GOLD, fontSize: 10, letterSpacing: 1.05 },
  title: { marginTop: theme.spacing.sm, color: '#FFFFFF', fontSize: 29, lineHeight: 35, letterSpacing: -0.8 },
  introduction: { maxWidth: 320, marginTop: theme.spacing.sm, color: 'rgba(255,255,255,0.68)', fontSize: 14, lineHeight: 20 },
  formArea: { flex: 1, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing['3xl'] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  sectionEyebrow: { color: NAVY_SOFT, fontSize: 10, letterSpacing: 1.05 },
  sectionRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: LINE },
  form: { gap: theme.spacing.lg },
  errorBanner: { marginBottom: theme.spacing.lg, padding: theme.spacing.md, borderLeftWidth: 2, borderLeftColor: BURGUNDY, backgroundColor: '#F8EDEF' },
  errorText: { color: BURGUNDY, fontSize: 13 },
  showPasswordButton: { position: 'absolute', right: theme.spacing.md, top: 43, padding: theme.spacing.xs },
  primaryAction: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xl, backgroundColor: NAVY, borderRadius: theme.radius.sm },
  primaryPressed: { opacity: 0.86 },
  disabled: { opacity: 0.45 },
  primaryLabel: { color: '#FFFFFF', fontSize: 15 },
  registerLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xl },
  linkPrefix: { color: NAVY_SOFT, fontSize: 14 },
  linkLabel: { color: BURGUNDY, fontSize: 14 },
  pressed: { opacity: 0.62 },
});

export default LoginScreen;
