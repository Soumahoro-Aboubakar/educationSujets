import React, { useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from 'lucide-react-native';

import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import AuthContext from '../context/AuthContext';
import theme from '../theme/tokens';

const RegisterScreen = ({ navigation }) => {
  const { register } = useContext(AuthContext);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const passwordRequirements = [
    { key: 'length', label: 'Au moins 6 caractères', met: password.length >= 6 },
    { key: 'match', label: 'Les mots de passe correspondent', met: password === confirmPassword && password.length > 0 },
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nom requis';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Email invalide';
    }
    
    if (!password) {
      newErrors.password = 'Mot de passe requis';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        setError(result.error || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      setError('Erreur inattendue. Veuillez réessayer.');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim() && email.trim() && 
    password.length >= 6 && password === confirmPassword;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="h1" align="center" style={styles.title}>
            Créer un compte
          </Text>
          <Text 
            variant="body" 
            color={theme.colors.textSecondary} 
            align="center"
            style={styles.subtitle}
          >
            Rejoignez notre communauté d'étudiants
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error && (
            <View style={styles.errorBanner}>
              <Text 
                variant="bodyMedium" 
                color={theme.colors.error}
                align="center"
              >
                {error}
              </Text>
            </View>
          )}

          <FormInput
            label="Nom complet"
            placeholder="Jean Dupont"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: null });
            }}
            icon={User}
            error={errors.name}
            editable={!loading}
          />

          <FormInput
            label="Email"
            placeholder="votre@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: null });
            }}
            keyboardType="email-address"
            icon={Mail}
            error={errors.email}
            editable={!loading}
          />

          <View>
            <FormInput
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              secureTextEntry={!showPassword}
              icon={Lock}
              error={errors.password}
              editable={!loading}
            />
            <TouchableOpacity 
              style={styles.showPasswordBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={18} color={theme.colors.textMuted} />
              ) : (
                <Eye size={18} color={theme.colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          <View>
            <FormInput
              label="Confirmer le mot de passe"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) 
                  setErrors({ ...errors, confirmPassword: null });
              }}
              secureTextEntry={!showConfirmPassword}
              icon={Lock}
              error={errors.confirmPassword}
              editable={!loading}
            />
            <TouchableOpacity 
              style={styles.showPasswordBtn}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff size={18} color={theme.colors.textMuted} />
              ) : (
                <Eye size={18} color={theme.colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirements}>
            {passwordRequirements.map(req => (
              <View key={req.key} style={styles.requirement}>
                <CheckCircle2 
                  size={16} 
                  color={req.met ? theme.colors.success : theme.colors.border}
                />
                <Text 
                  variant="caption" 
                  color={req.met ? theme.colors.success : theme.colors.textMuted}
                  style={{ marginLeft: 8 }}
                >
                  {req.label}
                </Text>
              </View>
            ))}
          </View>

          <Button
            title="S'inscrire"
            onPress={handleRegister}
            loading={loading}
            disabled={loading || !isFormValid}
            variant="primary"
            style={styles.registerButton}
          />

          {/* Login Link */}
          <View style={styles.loginLink}>
            <Text variant="body" color={theme.colors.textSecondary}>
              Vous avez un compte?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text 
                variant="bodyMedium" 
                color={theme.colors.primary}
                style={{ fontWeight: '600' }}
              >
                Se connecter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 32,
    backgroundColor: theme.colors.background,
  },
  header: {
    marginBottom: 40,
    marginTop: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 20,
    flex: 1,
  },
  errorBanner: {
    backgroundColor: theme.colors.errorWash,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    padding: 12,
    marginBottom: 8,
  },
  showPasswordBtn: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -9 }],
  },
  requirements: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerButton: {
    marginTop: 8,
    height: 56,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
});

export default RegisterScreen;
