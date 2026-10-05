import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ExternalLink, Receipt } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import ActionButton from '../../components/ui/ActionButton';
import StatusPill from '../../components/ui/StatusPill';
import StateView from '../../components/ui/StateView';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { AccountScroll, Row, Section } from '../../components/account/AccountLayout';
import { useEntitlements, useSubscription } from '../../hooks/useAccount';
import { useWebCheckout } from '../../hooks/useWebCheckout';
import PaymentMethodLogo from '../../components/payments/PaymentMethodLogo';
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
  const canCheckout = entitlements?.checkout?.mobileWebCheckout !== false;
  const checkout = useWebCheckout();

  const status = data?.status || 'NONE';
  const subtitle = status === 'ACTIVE'
    ? `Expire le ${formatLongDate(data.currentPeriodEnd)}`
    : status === 'EXPIRED'
      ? `Expiré depuis le ${formatLongDate(data.currentPeriodEnd)}`
      : status === 'PENDING'
        ? 'Paiement en cours de confirmation. Cet écran se met à jour tout seul.'
        : canCheckout
          ? 'Abonne-toi pour télécharger les sujets et corrigés.'
          : 'Aucun abonnement actif sur ce compte.';

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
          {/* Version store : aucun prix à payer affiché dans l'application. */}
          {canCheckout ? (
            <Row
              label="Prochain paiement"
              hint={next.kind === 'initial' ? 'Abonnement (période initiale)' : 'Mensualité'}
              value={formatAmount(next.amount)}
              isLast
            />
          ) : (
            <Row label="Statut" value={TITLES[status] || TITLES.NONE} isLast />
          )}
        </Section>

        {canCheckout && status !== 'PENDING' ? (
          <View style={styles.webStep}>
            <Text variant="bodyMedium" style={styles.webStepTitle}>Le paiement se fait sur le site Fatafalta</Text>
            <Text variant="caption" style={styles.webStepLine}>1. Tu y seras connecté automatiquement, avec ce compte.</Text>
            <View style={styles.webStepRow}>
              <Text variant="caption" style={[styles.webStepLine, styles.inline]}>2. Paie avec</Text>
              <PaymentMethodLogo code="wave" label="Wave" size={18} />
              <Text variant="caption" style={[styles.webStepLine, styles.webStepStrong]}>Wave.</Text>
            </View>
            <Text variant="caption" style={styles.webStepLine}>3. Reviens ensuite dans l’application : ton accès s’active tout seul.</Text>
            <ActionButton
              title={`${ctaLabel} sur le site`}
              icon={ExternalLink}
              onPress={() => checkout.open(entitlements?.checkout?.webCheckoutUrl)}
              loading={checkout.opening}
              style={styles.cta}
            />
          </View>
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
    marginTop: theme.spacing.md,
  },
  webStep: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.base,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
    backgroundColor: theme.colors.surface,
  },
  webStepTitle: {
    marginBottom: theme.spacing.xs,
    color: brand.ink,
    fontSize: 15,
  },
  webStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  inline: {
    marginTop: 0,
  },
  webStepStrong: {
    marginTop: 0,
    color: brand.ink,
    fontFamily: theme.fontFamily.semiBold,
  },
  webStepLine: {
    marginTop: 4,
    color: brand.inkSoft,
    fontFamily: theme.fontFamily.regular,
    lineHeight: 18,
  },
  empty: {
    padding: theme.spacing.base,
    color: brand.inkSoft,
    fontSize: 14,
  },
});

export default SubscriptionScreen;
