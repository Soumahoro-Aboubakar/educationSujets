import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Receipt } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import ActionButton from '../../components/ui/ActionButton';
import StatusPill from '../../components/ui/StatusPill';
import StateView from '../../components/ui/StateView';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { AccountScroll, Row, Section } from '../../components/account/AccountLayout';
import { useEntitlements, useSubscription } from '../../hooks/useAccount';
import { useWebCheckout } from '../../hooks/useWebCheckout';
import { formatAmount, formatDate, formatLongDate } from '../../utils/format';
import theme from '../../theme/tokens';

const { brand } = theme;

const TITLES = {
  ACTIVE: 'Abonnement actif',
  EXPIRED: 'Abonnement expiré',
  PENDING: 'Paiement en cours',
  NONE: 'Aucun abonnement',
};

const KIND_LABELS = { initial: 'Abonnement', monthly: 'Mensualité' };

const SubscriptionScreen = ({ navigation }) => {
  const { data, isLoading, isError, refetch, isRefetching } = useSubscription();
  const { data: entitlements } = useEntitlements();
  const checkout = useWebCheckout();
  const canCheckout = entitlements?.checkout?.mobileWebCheckout !== false;

  const status = data?.status || 'NONE';
  const subtitle = status === 'ACTIVE'
    ? `Expire le ${formatLongDate(data.currentPeriodEnd)}`
    : status === 'EXPIRED'
      ? `Expiré depuis le ${formatLongDate(data.currentPeriodEnd)}`
      : status === 'PENDING'
        ? 'Nous attendons la confirmation de ton paiement.'
        : 'Abonne-toi pour télécharger les sujets et corrigés.';

  const ctaLabel = status === 'ACTIVE' ? 'Prolonger mon accès' : status === 'EXPIRED' ? 'Renouveler' : 'S’abonner';

  const renderBody = () => {
    if (isLoading) return <SkeletonRows count={4} />;
    if (isError) {
      return (
        <StateView
          icon={Receipt}
          title="Connexion impossible"
          description="Ton abonnement n’a pas pu être chargé."
          onRetry={refetch}
        />
      );
    }

    const next = data.nextPayment;
    return (
      <>
        <Section title="Détails">
          {data.firstActivatedAt ? <Row label="Membre depuis" value={formatDate(data.firstActivatedAt)} /> : null}
          {data.currentPeriodEnd ? <Row label="Accès jusqu’au" value={formatDate(data.currentPeriodEnd)} /> : null}
          {data.renewalDate ? <Row label="Renouvellement annuel" value={formatDate(data.renewalDate)} /> : null}
          <Row
            label="Prochain paiement"
            hint={next.kind === 'initial' ? 'Abonnement (période initiale)' : 'Mensualité'}
            value={formatAmount(next.amount)}
            isLast
          />
        </Section>

        {canCheckout ? (
          <ActionButton
            title={ctaLabel}
            onPress={() => checkout.open(entitlements?.checkout?.webCheckoutUrl)}
            loading={checkout.opening}
            style={styles.cta}
          />
        ) : null}

        <Section title="Historique des paiements">
          {data.payments.length ? data.payments.map((payment, index) => (
            <Row
              key={payment.id}
              label={`${KIND_LABELS[payment.kind] || 'Paiement'} · ${formatAmount(payment.amount)}`}
              hint={`${formatDate(payment.createdAt)} · ${payment.methodLabel}`}
              trailing={<StatusPill status={payment.status} />}
              isLast={index === data.payments.length - 1}
            />
          )) : (
            <Text variant="body" style={styles.empty}>Aucun paiement pour le moment.</Text>
          )}
        </Section>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        eyebrow="Mon abonnement"
        title={TITLES[status]}
        subtitle={isLoading ? undefined : subtitle}
      >
        {data ? <View style={styles.pill}><StatusPill status={status} /></View> : null}
      </ScreenHeader>
      <AccountScroll refreshing={isRefetching} onRefresh={refetch}>
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
  pill: {
    marginTop: theme.spacing.md,
  },
  cta: {
    marginBottom: theme.spacing.xl,
  },
  empty: {
    padding: theme.spacing.base,
    color: brand.inkSoft,
    fontSize: 14,
  },
});

export default SubscriptionScreen;
