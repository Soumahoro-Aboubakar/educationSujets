import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import ActionButton from '../../components/ui/ActionButton';
import StatusPill from '../../components/ui/StatusPill';
import StateView from '../../components/ui/StateView';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { AccountScroll, Metric, Row, Section } from '../../components/account/AccountLayout';
import { useRefreshAccount, useWallet } from '../../hooks/useAccount';
import { cancelWithdrawal, getErrorMessage } from '../../services/billing';
import { formatAmount, formatDate } from '../../utils/format';
import theme from '../../theme/tokens';

const { brand } = theme;

const WalletScreen = ({ navigation }) => {
  const { data, isLoading, isError, refetch, isRefetching } = useWallet();
  const refreshAccount = useRefreshAccount();

  const askCancel = (entry) => {
    Alert.alert('Annuler ce retrait ?', `${formatAmount(entry.amount)} seront de nouveau disponibles dans ton solde.`, [
      { text: 'Garder', style: 'cancel' },
      {
        text: 'Annuler le retrait',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelWithdrawal(entry.id);
            refreshAccount();
          } catch (error) {
            Alert.alert('Retrait', getErrorMessage(error));
          }
        },
      },
    ]);
  };

  const renderBody = () => {
    if (isLoading) return <SkeletonRows count={4} />;
    if (isError) {
      return <StateView icon={Wallet} title="Connexion impossible" description="Ton portefeuille n’a pas pu être chargé." onRetry={refetch} />;
    }

    const { balances, history, withdrawalRules } = data;
    const pending = balances.onHold + balances.pendingWithdrawal;
    const canWithdraw = balances.available >= withdrawalRules.minAmount;

    return (
      <>
        <Section>
          <View style={styles.metrics}>
            <Metric compact label="Gains générés" value={formatAmount(balances.earned)} />
            <View style={styles.divider} />
            <Metric compact label="Déjà retiré" value={formatAmount(balances.withdrawn)} />
          </View>
          {pending > 0 ? (
            <View style={styles.pendingRow}>
              <Text variant="caption" style={styles.pendingText}>
                {`${formatAmount(pending)} en attente (délai de sécurité ou retrait en cours)`}
              </Text>
            </View>
          ) : null}
        </Section>

        <ActionButton
          title="Retirer mes gains"
          icon={ArrowUpRight}
          disabled={!canWithdraw}
          onPress={() => navigation.navigate('Withdraw')}
        />
        {!canWithdraw ? (
          <Text variant="caption" align="center" style={styles.hint}>
            {`Retrait possible à partir de ${formatAmount(withdrawalRules.minAmount)} disponibles.`}
          </Text>
        ) : null}

        <Section title="Historique" style={styles.history}>
          {history.length ? history.map((entry, index) => {
            const isWithdrawal = entry.type === 'WITHDRAWAL';
            return (
              <Row
                key={`${entry.type}-${entry.id}`}
                icon={isWithdrawal ? ArrowUpRight : ArrowDownLeft}
                label={isWithdrawal ? `Retrait ${entry.operatorLabel}` : 'Commission de parrainage'}
                hint={formatDate(entry.date)}
                value={`${isWithdrawal ? '−' : '+'}${formatAmount(entry.amount)}`}
                trailing={<StatusPill status={entry.status} />}
                onPress={isWithdrawal && entry.status === 'PENDING' ? () => askCancel(entry) : undefined}
                isLast={index === history.length - 1}
              />
            );
          }) : (
            <Text variant="body" style={styles.empty}>
              Tes commissions apparaîtront ici dès qu’un ami s’abonnera avec ton code.
            </Text>
          )}
        </Section>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={() => navigation.goBack()} eyebrow="Portefeuille" title="Mes gains">
        {data ? <Metric label="Solde disponible" value={formatAmount(data.balances.available)} /> : null}
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
  metrics: {
    flexDirection: 'row',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: brand.line,
  },
  pendingRow: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.line,
  },
  pendingText: {
    color: brand.goldInk,
    fontFamily: theme.fontFamily.regular,
  },
  hint: {
    marginTop: theme.spacing.sm,
    color: brand.inkMuted,
    fontFamily: theme.fontFamily.regular,
  },
  history: {
    marginTop: theme.spacing.xl,
  },
  empty: {
    padding: theme.spacing.base,
    color: brand.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default WalletScreen;
