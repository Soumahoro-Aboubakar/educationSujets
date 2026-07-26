import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Lock, LogIn, UserPlus } from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import { useNavigation } from '@react-navigation/native';
import AuthContext from '../context/AuthContext';
import theme from '../theme/tokens';

/**
 * Locked screen - displayed when unauthenticated users try to access admin features
 */
const LockedFeatureScreen = ({ title, description, feature }) => {
  const navigation = useNavigation();
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Lock size={48} color={theme.colors.primary} />
        </View>

        {/* Title & Description */}
        <Text variant="h2" style={styles.title} align="center">
          {title || 'Fonctionnalité Réservée'}
        </Text>
        <Text 
          variant="body" 
          color={theme.colors.textSecondary}
          style={styles.description}
          align="center"
        >
          {description || 'Vous devez être connecté pour accéder à cette fonctionnalité.'}
        </Text>

        {/* Feature Info */}
        {feature && (
          <View style={styles.featureBox}>
            <Text variant="bodyMedium" color={theme.colors.primary} style={{ fontWeight: '600', marginBottom: 4 }}>
              ✨ Cette fonctionnalité vous permet:
            </Text>
            <Text variant="body" color={theme.colors.textSecondary}>
              {feature}
            </Text>
          </View>
        )}

        {/* Actions */}
        {!isAuthenticated && (
          <View style={styles.actions}>
            <Button
              title="Se Connecter"
              icon={LogIn}
              variant="primary"
              onPress={() => navigation.navigate('Login')}
              style={styles.button}
            />
            <Button
              title="S'inscrire"
              icon={UserPlus}
              variant="secondary"
              onPress={() => navigation.navigate('Register')}
              style={styles.button}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primaryWash,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  featureBox: {
    backgroundColor: theme.colors.primaryWash,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  actions: {
    gap: 12,
    width: '100%',
  },
  button: {
    height: 56,
  },
});

export default LockedFeatureScreen;
