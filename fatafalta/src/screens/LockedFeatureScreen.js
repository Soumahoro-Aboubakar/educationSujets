import { useTheme, createThemedStyles } from '../theme/ThemeProvider';
import React, { useContext } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Lock, LogIn, UserPlus } from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import { useNavigation } from '@react-navigation/native';
import AuthContext from '../context/AuthContext';

/**
 * Locked screen - displayed when unauthenticated users try to access admin features
 */
const LockedFeatureScreen = ({ title, description, feature }) => {
  const { theme } = useTheme();
  const { styles } = useStyles();
  const navigation = useNavigation();
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.content}>
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
              Cette fonctionnalité vous permet :
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
      </ScrollView>
    </View>
  );
};

export default LockedFeatureScreen;

const useStyles = createThemedStyles(({ theme }) => {
  const styles = StyleSheet.create({
    container: { ...theme.layout.readingFrame,
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    content: {
      flexGrow: 1, justifyContent: 'center', paddingVertical: 24,
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
      borderLeftWidth: 1,
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
      minHeight: 56,
    },
  });
  return { styles };
});
