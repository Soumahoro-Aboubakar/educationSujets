import React from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import theme from '../theme/tokens';
import useCorrectionPromptPreference from '../hooks/useCorrectionPromptPreference';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { enabled, setEnabled, isLoaded } = useCorrectionPromptPreference();

  const handleToggleCorrections = async (value) => {
    await setEnabled(value);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          icon={<ArrowLeft size={22} color={theme.colors.textPrimary} />}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <Text variant="h3" style={styles.headerTitle}>
          Paramètres
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <SettingsIcon size={20} color={theme.colors.primary} />
            </View>
            <Text variant="h4">Corrections</Text>
          </View>

          <Text variant="body" color={theme.colors.textSecondary} style={styles.sectionDescription}>
            Gérez si l'application doit proposer automatiquement le téléchargement du corrigé après chaque sujet téléchargé.
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text variant="bodyMedium">Proposer automatiquement les corrections</Text>
              <Text variant="caption" color={theme.colors.textMuted} style={styles.settingHelp}>
                Activez pour recevoir l'invite après un téléchargement de sujet.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleCorrections}
              disabled={!isLoaded}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={enabled ? theme.colors.surface : theme.colors.surface}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  content: {
    padding: theme.spacing.lg,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionIconBox: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  sectionDescription: {
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  settingText: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingHelp: {
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
});

export default SettingsScreen;
