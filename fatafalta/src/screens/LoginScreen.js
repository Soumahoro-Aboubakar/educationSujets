import React, { useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react-native';

import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import AuthContext from '../context/AuthContext';
import theme from '../theme/tokens';

const LoginScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email invalide';
    }

    if (!password) {
      newErrors.password = 'Mot de passe requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      if (!result.success) {
        console.error('Login failed:', result);
        setError(result.error || 'Erreur lors de la connexion');
        return;
      }

      if (result.user?.role === 'admin' || result.user?.role === 'sub-admin') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'AdminTab' } }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Erreur inattendue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim() && password.length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="h1" align="center" style={styles.title}>
            Se connecter
          </Text>
          <Text
            variant="body"
            color={theme.colors.textSecondary}
            align="center"
            style={styles.subtitle}
          >
            Accédez à vos documents et à toutes les fonctionnalités.
          </Text>
        </View>

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

          <Button
            title="Connexion"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || !isFormValid}
            variant="primary"
            icon={<LogIn size={16} color={theme.colors.textInverse} />}
            style={styles.loginButton}
          />

          <View style={styles.registerLink}>
            <Text variant="body" color={theme.colors.textSecondary}>
              Pas encore de compte ?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text
                variant="bodyMedium"
                color={theme.colors.primary}
                style={{ fontWeight: '600' }}
              >
                S'inscrire
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
    padding: theme.spacing['2xl'],
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing['3xl'],
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    maxWidth: 360,
    alignSelf: 'center',
    lineHeight: 24,
  },
  form: {
    width: '100%',
    gap: theme.spacing.md,
  },
  errorBanner: {
    backgroundColor: theme.colors.errorWash || 'rgba(220, 38, 38, 0.1)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  showPasswordBtn: {
    position: 'absolute',
    right: 16,
    top: 46,
    padding: theme.spacing.xs,
  },
  loginButton: {
    marginTop: theme.spacing.lg,
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
});

export default LoginScreen;
