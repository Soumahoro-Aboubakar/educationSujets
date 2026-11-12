import useAsyncAction from '../../hooks/useAsyncAction';
import { createThemedStyles } from '../../theme/ThemeProvider';
import { getUserMessage } from '../../utils/userMessages';
import { getErrorAlert } from '../../utils/userMessages';
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { PrepButton as ActionButton } from '../../prep/ui/primitives';
import StatusPill from '../../components/ui/StatusPill';
import StateView from '../../components/ui/StateView';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { AccountScroll, Metric, Row, Section } from '../../components/account/AccountLayout';
import { useRefreshAccount, useWallet } from '../../hooks/useAccount';
import { cancelWithdrawal } from '../../services/billing';
import { formatAmount, formatDate } from '../../utils/format';

const WalletScreen = ({ navigation }) => {
  const { styles } = useStyles();
  const { data, isLoading, isError, refetch, isRefetching, error: loadError } = useWallet();
  const refreshAccount = useRefreshAccount();
  const [runCancel, cancelling] = useAsyncAction();
  const [cancellingId, setCancellingId] = React.useState(null);

  const askCancel = (entry) => {
    Alert.alert('Annuler ce retrait ?', `${formatAmount(entry.amount)} seront de nouveau disponibles dans ton solde.`, [
      { text: 'Garder', style: 'cancel' },
      {
        text: 'Annuler le retrait',
        style: 'destructive',
        onPress: () => runCancel(async () => {
          setCancellingId(entry.id);
          try {
            await cancelWithdrawal(entry.id);
            refreshAccount();
          } catch (error) {
            Alert.alert(...getErrorAlert(error, 'retrait', 'tu'));
          }
        }),
      },
    ]);
  };

  const renderBody = () => {
    if (isLoading) return <SkeletonRows count={4} />;
    if (isError) {
      return <StateView icon={Wallet} title={getUserMessage(loadError, 'portefeuille').title} description={getUserMessage(loadError, 'portefeuille').message} onRetry={refetch} />;
    }

    const { balances, history, withdrawalRules } = data;
    const pending = balances.onHold + balances.pendingWithdrawal;
    const canWithdraw = balances.available >= withdrawalRules.minAmount;

    return (
      <>
        <Metric paper label="Solde disponible" value={formatAmount(balances.available)} />
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
                loading={cancelling && cancellingId === entry.id}
                disabled={cancelling}
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
      <ScreenHeader onBack={() => navigation.goBack()} title="Mes gains" />
      <AccountScroll refreshing={isRefetching} onRefresh={refetch}>
        {renderBody()}
      </AccountScroll>
    </View>
  );
};

export default WalletScreen;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    container: { ...theme.layout.readingFrame,
      flex: 1,
      backgroundColor: brand.paper,
    },
    metrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
      color: brand.inkSoft,
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
  return { styles };
});
