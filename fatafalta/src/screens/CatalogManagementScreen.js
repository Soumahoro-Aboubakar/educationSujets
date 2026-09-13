import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings2 } from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import FormInput from '../components/ui/FormInput';
import MetadataSelect from '../components/ui/MetadataSelect';
import TaxonomyPathFields from '../components/catalog/TaxonomyPathFields';
import AuthContext from '../context/AuthContext';
import LockedFeatureScreen from './LockedFeatureScreen';
import theme from '../theme/tokens';
import { createInstitution, fetchInstitutions, updateInstitution } from '../services/institutions';

const parseStructure = (value) => value
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const CatalogManagementScreen = () => {
  const { isAdmin } = useContext(AuthContext);
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState(null);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [structureText, setStructureText] = useState('year, subject');
  const [taxonomyPath, setTaxonomyPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution._id === institutionId) || null,
    [institutionId, institutions]
  );

  const hydrateForm = useCallback((institution) => {
    setInstitutionId(institution?._id || null);
    setName(institution?.name || '');
    setAbbreviation(institution?.abbreviation || '');
    setStructureText((institution?.navigationStructure || ['year', 'subject']).join(', '));
    setTaxonomyPath([]);
  }, []);

  const refreshInstitutions = useCallback(async (preferredId) => {
    setLoading(true);
    try {
      const items = await fetchInstitutions();
      setInstitutions(items);
      const next = items.find((item) => item._id === (preferredId || institutionId));
      if (next) hydrateForm(next);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les institutions.');
    } finally {
      setLoading(false);
    }
  }, [hydrateForm, institutionId]);

  useEffect(() => { refreshInstitutions(); }, [refreshInstitutions]);

  const validateStructure = () => {
    const navigationStructure = parseStructure(structureText);
    if (navigationStructure.length < 2 || navigationStructure.at(-1) !== 'subject') {
      Alert.alert('Structure invalide', 'Indiquez au moins deux niveaux et terminez par « subject ».');
      return null;
    }
    if (new Set(navigationStructure).size !== navigationStructure.length) {
      Alert.alert('Structure invalide', 'Chaque type de niveau doit être unique.');
      return null;
    }
    return navigationStructure;
  };

  const saveInstitution = async () => {
    const navigationStructure = validateStructure();
    if (!navigationStructure || !name.trim()) {
      if (!name.trim()) Alert.alert('Nom requis', 'Saisissez le nom de l’institution.');
      return;
    }

    setSaving(true);
    try {
      const payload = { name: name.trim(), abbreviation: abbreviation.trim(), navigationStructure };
      const saved = institutionId
        ? await updateInstitution(institutionId, payload)
        : await createInstitution(payload);
      await refreshInstitutions(saved._id);
      Alert.alert('Enregistré', institutionId ? 'Institution mise à jour.' : 'Institution créée et configurée.');
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible d’enregistrer cette structure.');
    } finally {
      setSaving(false);
    }
  };

  const createInlineInstitution = async (newName) => {
    const navigationStructure = validateStructure();
    if (!navigationStructure) throw new Error('Structure invalide');
    const created = await createInstitution({ name: newName, navigationStructure });
    await refreshInstitutions(created._id);
    return created;
  };

  if (!isAdmin()) {
    return (
      <LockedFeatureScreen
        title="Catalogue réservé"
        description="Seuls les administrateurs peuvent configurer le catalogue pédagogique."
        feature="Gérer les institutions et leur structure"
      />
    );
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <View style={styles.icon}><Settings2 size={22} color={theme.colors.primary} /></View>
          <View style={styles.headingCopy}>
            <Text variant="h2">Catalogue pédagogique</Text>
            <Text variant="body" color={theme.colors.textSecondary}>Configurez une structure une seule fois, puis ajoutez ses niveaux à la demande.</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <MetadataSelect
            label="Institution existante"
            placeholder="Créer ou sélectionner une institution"
            options={institutions}
            value={institutionId}
            onChange={(value) => hydrateForm(institutions.find((item) => item._id === value))}
            onCreate={createInlineInstitution}
          />
          <FormInput label="Nom" placeholder="Ex. ENA" value={name} onChangeText={setName} />
          <FormInput label="Abréviation (facultatif)" placeholder="Ex. ENA" value={abbreviation} onChangeText={setAbbreviation} />
          <FormInput
            label="Niveaux de navigation"
            placeholder="cycle, year, subject"
            value={structureText}
            onChangeText={setStructureText}
          />
          <Text variant="caption" color={theme.colors.textMuted} style={styles.help}>
            Séparez les types par une virgule. Le dernier doit être « subject » : par exemple « cycle, year, subject » ou « contest, year, subject ».
          </Text>
          <Button title={institutionId ? 'Enregistrer la structure' : 'Créer l’institution'} onPress={saveInstitution} loading={saving} />
        </Card>

        {selectedInstitution ? (
          <Card style={styles.card}>
            <Text variant="h3">Niveaux et matières</Text>
            <Text variant="caption" color={theme.colors.textMuted} style={styles.help}>
              Sélectionnez chaque parent. S’il manque un élément, recherchez son nom puis choisissez « Créer » : il sera relié au bon parent.
            </Text>
            <TaxonomyPathFields
              institution={selectedInstitution}
              value={taxonomyPath}
              onChange={setTaxonomyPath}
            />
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing['4xl'], gap: theme.spacing.lg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  heading: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  headingCopy: { flex: 1 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: theme.colors.primary100, alignItems: 'center', justifyContent: 'center' },
  card: { padding: theme.spacing.lg },
  help: { marginBottom: theme.spacing.md, lineHeight: 18 },
});

export default CatalogManagementScreen;
