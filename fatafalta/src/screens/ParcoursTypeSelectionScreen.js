import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { ArrowLeft, ChevronRight, Layers3 } from 'lucide-react-native';
import Text from '../components/ui/Text';
import EmptyState from '../components/ui/EmptyState';
import theme from '../theme/tokens';

const labelOf = (item) => item?.nom || item?.name || '';

const ParcoursTypeSelectionScreen = ({ navigation, route }) => {
  const organisme = route.params?.organisme || null;
  const parcoursTypes = route.params?.parcoursTypes || [];
  const [isSaving, setIsSaving] = useState(false);
  const title = useMemo(() => organisme?.nom || organisme?.name || 'Parcours types', [organisme]);

  const selectParcoursType = (parcoursType) => {
    if (isSaving) return;
    setIsSaving(true);
    navigation.replace('DynamicCatalog', { organisme, parcoursType });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text variant="overline" color={theme.colors.primary}>{title}</Text>
          <Text variant="h1">Choisir un parcours</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text variant="body" color={theme.colors.textSecondary}>Sélectionnez le parcours correspondant aux sujets recherchés.</Text>
        {parcoursTypes.map((item) => (
          <Pressable
            key={item._id}
            onPress={() => selectParcoursType(item)}
            accessibilityRole="button"
            accessibilityLabel={`Choisir ${labelOf(item)}`}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          >
            <View style={styles.icon}><Layers3 size={20} color={theme.colors.primary} /></View>
            <Text variant="h3" style={styles.optionText}>{labelOf(item)}</Text>
            <ChevronRight size={19} color={theme.colors.primary} />
          </Pressable>
        ))}
        {!parcoursTypes.length && <EmptyState icon={Layers3} title="Aucun parcours disponible" description="Cet organisme ne propose pas encore de parcours type." />}
        {isSaving && <ActivityIndicator color={theme.colors.primary} />}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFD', paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight },
  titleWrap: { flex: 1, marginLeft: theme.spacing.md },
  list: { flexGrow: 1, padding: theme.spacing.lg, gap: theme.spacing.md },
  option: { minHeight: 72, padding: theme.spacing.md, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight, flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.75 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary100 },
  optionText: { flex: 1, marginLeft: theme.spacing.md },
});

export default ParcoursTypeSelectionScreen;