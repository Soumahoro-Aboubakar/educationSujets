import React, { useContext, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { ArrowLeft, ArrowUpRight, Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
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

const RegisterScreen = ({ navigation }) => {
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

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    navigation.reset({
      index: 0,
      routes: [user?.role === 'admin' || user?.role === 'sub-admin'
        ? { name: 'MainTabs', params: { screen: 'AdminTab' } }
        : { name: 'MainTabs' }],
    });
  }, [authLoading, isAuthenticated, navigation, user?.role]);

  const passwordRequirements = [
    { key: 'length', label: 'Au moins 6 caractères', met: password.length >= 6 },
    { key: 'match', label: 'Les mots de passe correspondent', met: password === confirmPassword && password.length > 0 },
  ];

  const validateForm = () => {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Nom requis';
    if (!email.trim()) nextErrors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Email invalide';
    if (!password) nextErrors.password = 'Mot de passe requis';
    else if (password.length < 6) nextErrors.password = 'Minimum 6 caractères';
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await register(name.trim(), email.trim(), password);
      if (result.success) {
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        setError(result.error || 'Erreur lors de l’inscription');
      }
    } catch (requestError) {
      setError('Erreur inattendue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim() && email.trim() && password.length >= 6 && password === confirmPassword;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={theme.hitSlop} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><ArrowLeft size={21} color="#FFFFFF" strokeWidth={1.9} /></Pressable>
            <View style={styles.brandLockup}><View style={styles.brandRule} /><Text variant="overline" style={styles.brandName}>Éducation CI</Text></View>
          </View>
          <Text variant="overline" style={styles.eyebrow}>Nouveau compte</Text>
          <Text variant="h1" style={styles.title}>Créer un compte</Text>
          <Text variant="body" style={styles.introduction}>Garde tes ressources, tes téléchargements et tes préférences à portée de main.</Text>
        </View>

        <View style={styles.formArea}>
          <View style={styles.sectionHeader}><Text variant="overline" style={styles.sectionEyebrow}>Vos informations</Text><View style={styles.sectionRule} /></View>
          {error ? <View style={styles.errorBanner}><Text variant="bodyMedium" style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.form}>
            <FormInput label="Nom complet" placeholder="Jean Dupont" value={name} onChangeText={(text) => { setName(text); if (errors.name) setErrors({ ...errors, name: null }); }} icon={User} error={errors.name} editable={!loading} />
            <FormInput label="Adresse email" placeholder="votre@email.com" value={email} onChangeText={(text) => { setEmail(text); if (errors.email) setErrors({ ...errors, email: null }); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} icon={Mail} error={errors.email} editable={!loading} />
            <View>
              <FormInput label="Mot de passe" placeholder="••••••••" value={password} onChangeText={(text) => { setPassword(text); if (errors.password) setErrors({ ...errors, password: null }); }} secureTextEntry={!showPassword} autoCapitalize="none" icon={Lock} error={errors.password} editable={!loading} />
              <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowPassword((value) => !value)} style={styles.showPasswordButton}>{showPassword ? <EyeOff size={18} color={NAVY_SOFT} strokeWidth={1.8} /> : <Eye size={18} color={NAVY_SOFT} strokeWidth={1.8} />}</Pressable>
            </View>
            <View>
              <FormInput label="Confirmer le mot de passe" placeholder="••••••••" value={confirmPassword} onChangeText={(text) => { setConfirmPassword(text); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null }); }} secureTextEntry={!showConfirmPassword} autoCapitalize="none" icon={Lock} error={errors.confirmPassword} editable={!loading} />
              <Pressable accessibilityRole="button" accessibilityLabel={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowConfirmPassword((value) => !value)} style={styles.showPasswordButton}>{showConfirmPassword ? <EyeOff size={18} color={NAVY_SOFT} strokeWidth={1.8} /> : <Eye size={18} color={NAVY_SOFT} strokeWidth={1.8} />}</Pressable>
            </View>
          </View>
          <View style={styles.requirements}>
            {passwordRequirements.map((requirement) => (
              <View key={requirement.key} style={styles.requirement}>
                <View style={[styles.requirementMark, requirement.met && styles.requirementMarkMet]}>{requirement.met ? <Check size={12} color="#FFFFFF" strokeWidth={2.2} /> : null}</View>
                <Text variant="caption" style={[styles.requirementLabel, requirement.met && styles.requirementLabelMet]}>{requirement.label}</Text>
              </View>
            ))}
          </View>
          <Pressable disabled={loading || !isFormValid} onPress={handleRegister} style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryPressed, (loading || !isFormValid) && styles.disabled]}>
            <Text variant="bodyMedium" style={styles.primaryLabel}>{loading ? 'Création en cours…' : 'Créer mon compte'}</Text>
            {!loading ? <ArrowUpRight size={18} color="#FFFFFF" strokeWidth={1.8} /> : null}
          </Pressable>
          <View style={styles.loginLink}><Text variant="body" style={styles.linkPrefix}>Vous avez déjà un compte ?</Text><Pressable onPress={() => navigation.navigate('Login')}><Text variant="bodyMedium" style={styles.linkLabel}>Se connecter</Text></Pressable></View>
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
  requirements: { gap: theme.spacing.sm, marginTop: theme.spacing.lg, paddingVertical: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: LINE },
  requirement: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  requirementMark: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE, borderRadius: 8 },
  requirementMarkMet: { backgroundColor: GOLD, borderColor: GOLD },
  requirementLabel: { color: NAVY_SOFT, fontSize: 12 },
  requirementLabelMet: { color: NAVY, fontFamily: theme.fontFamily.medium },
  primaryAction: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xl, backgroundColor: NAVY, borderRadius: theme.radius.sm },
  primaryPressed: { opacity: 0.86 },
  disabled: { opacity: 0.45 },
  primaryLabel: { color: '#FFFFFF', fontSize: 15 },
  loginLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xl },
  linkPrefix: { color: NAVY_SOFT, fontSize: 14 },
  linkLabel: { color: BURGUNDY, fontSize: 14 },
  pressed: { opacity: 0.62 },
});

export default RegisterScreen;
