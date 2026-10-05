import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CreditCard } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import PaymentMethodLogo from '../../components/payments/PaymentMethodLogo';
import ScreenHeader from '../../components/ui/ScreenHeader';
import StateView from '../../components/ui/StateView';
import { AccountScroll, Section } from '../../components/account/AccountLayout';
import AuthContext from '../../context/AuthContext';
import { fetchAdminPaymentMethods, getErrorMessage, updateAdminPaymentMethod } from '../../services/billing';
import theme from '../../theme/tokens';

const { brand } = theme;

/**
 * Moyens de paiement (super administrateur). Même configuration serveur que l'administration
 * web : un changement ici s'applique immédiatement au site et à l'application.
 */
const PaymentMethodsAdminScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      setMethods(await fetchAdminPaymentMethods());
      setLoadError(null);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Impossible de charger les moyens de paiement.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggle = async (method, enabled) => {
    setBusy(method.code);
    setActionError(null);
    // Affichage immédiat, annulé si le serveur refuse.
    setMethods((current) => current.map((item) => (item.code === method.code ? { ...item, enabled } : item)));
    try {
      const updated = await updateAdminPaymentMethod(method.code, { enabled });
      setMethods((current) => current.map((item) => (item.code === method.code ? updated : item)));
    } catch (error) {
      setMethods((current) => current.map((item) => (item.code === method.code ? method : item)));
      setActionError(getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const enabledCount = methods.filter((method) => method.enabled).length;

  const renderBody = () => {
    if (user?.role !== 'admin') {
      return <StateView icon={CreditCard} title="Accès réservé" description="Seul le super administrateur gère les moyens de paiement." />;
    }
    if (loading) return <View style={styles.loading}><ActivityIndicator color={brand.ink} /></View>;
    if (loadError) return <StateView icon={CreditCard} title="Connexion impossible" description={loadError} onRetry={load} />;

    return (
      <>
        {!enabledCount ? (
          <Text variant="caption" style={styles.warning}>Aucun moyen n’est activé : les abonnés ne peuvent plus payer.</Text>
        ) : null}
        {actionError ? <Text variant="caption" style={styles.error} accessibilityLiveRegion="polite">{actionError}</Text> : null}
        <Section title="Méthodes de paiement">
          {methods.map((method, index) => (
            <View key={method.code} style={[styles.row, index === methods.length - 1 && styles.rowLast]}>
              <PaymentMethodLogo code={method.code} label={method.label} logoUrl={method.logoUrl} size={36} />
              <View style={styles.copy}>
                <Text variant="bodyMedium" style={styles.label} numberOfLines={1}>{method.label}</Text>
                <Text variant="caption" style={styles.code} numberOfLines={1}>{method.code}</Text>
                <Text variant="caption" style={[styles.status, method.enabled ? styles.statusOn : styles.statusOff]}>
                  {method.enabled ? '✓ Activé' : '✕ Désactivé'}
                </Text>
                {method.availableAtProvider === false ? (
                  <Text variant="caption" style={styles.closed}>Fermé chez GeniusPay : non proposé aux abonnés</Text>
                ) : null}
              </View>
              {busy === method.code ? <ActivityIndicator size="small" color={brand.inkMuted} style={styles.spinner} /> : null}
              <Switch
                value={method.enabled}
                disabled={busy === method.code}
                onValueChange={(value) => toggle(method, value)}
                trackColor={{ false: brand.line, true: theme.colors.success }}
                thumbColor={theme.colors.surface}
                accessibilityLabel={`${method.enabled ? 'Désactiver' : 'Activer'} ${method.label}`}
              />
            </View>
          ))}
        </Section>
        <Text variant="caption" style={styles.notice}>
          Seuls les moyens activés sont proposés aux abonnés, sur le site comme sur l’application. Le serveur refuse tout paiement avec un moyen désactivé. Pour ajouter un moyen ou modifier son logo, utilisez l’administration web.
        </Text>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        eyebrow="Administration"
        title="Paiements"
        subtitle={methods.length ? `${enabledCount} moyen${enabledCount > 1 ? 's' : ''} activé${enabledCount > 1 ? 's' : ''} sur ${methods.length}` : undefined}
      />
      <AccountScroll refreshing={refreshing} onRefresh={user?.role === 'admin' ? refresh : undefined}>
        {renderBody()}
      </AccountScroll>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.paper,
  },
  loading: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.line,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: brand.ink,
    fontSize: 15,
  },
  code: {
    marginTop: 1,
    color: brand.inkMuted,
    fontFamily: theme.fontFamily.regular,
    fontSize: 12,
  },
  status: {
    marginTop: 2,
    fontSize: 12,
  },
  statusOn: {
    color: theme.colors.success,
  },
  statusOff: {
    color: brand.inkSoft,
  },
  closed: {
    marginTop: 2,
    color: brand.goldInk,
    fontSize: 12,
  },
  spinner: {
    marginRight: theme.spacing.xs,
  },
  warning: {
    marginBottom: theme.spacing.base,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: brand.goldWash,
    color: brand.goldInk,
  },
  error: {
    marginBottom: theme.spacing.base,
    color: theme.colors.error,
  },
  notice: {
    color: brand.inkSoft,
    fontFamily: theme.fontFamily.regular,
    lineHeight: 18,
  },
});

export default PaymentMethodsAdminScreen;
