import React, { useContext } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LogOut, User, LogIn } from 'lucide-react-native';
import Text from '../components/ui/Text';
import { useNavigation } from '@react-navigation/native';
import AuthContext from '../context/AuthContext';
import theme from '../theme/tokens';

/**
 * Header Account Component
 * Displays user info or login/register buttons based on auth state
 */
const HeaderAccount = () => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const navigation = useNavigation();

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={() => navigation.navigate('Login')}
        >
          <LogIn size={16} color={theme.colors.primary} />
          <Text variant="bodyMedium" color={theme.colors.primary} style={styles.buttonText}>
            Connexion
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.registerButton]}
          onPress={() => navigation.navigate('Register')}
        >
          <User size={16} color={theme.colors.textInverse} />
          <Text variant="bodyMedium" color={theme.colors.textInverse} style={styles.buttonText}>
            S'inscrire
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text variant="bodyMedium" color={theme.colors.textInverse} style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View>
          <Text variant="bodyMedium" style={styles.userName}>
            {user?.name}
          </Text>
          <Text variant="caption" color={theme.colors.textMuted}>
            {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={logout}
      >
        <LogOut size={18} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  button: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  loginButton: {
    backgroundColor: theme.colors.primaryWash,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginRight: 8,
  },
  registerButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '700',
  },
  userName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  logoutButton: {
    padding: 8,
  },
});

export default HeaderAccount;
