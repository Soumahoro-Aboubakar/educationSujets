import React, { useContext } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  CreditCard,
  Download,
  Gift,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import ActionButton from '../../components/ui/ActionButton';
import StatusPill from '../../components/ui/StatusPill';
import { AccountScroll, Row, Section } from '../../components/account/AccountLayout';
import { SkeletonRows } from '../../components/ui/Skeleton';
import AuthContext from '../../context/AuthContext';
import { useEntitlements, useWallet } from '../../hooks/useAccount';
import { formatAmount, formatDate } from '../../utils/format';
import theme from '../../theme/tokens';

const { brand } = theme;

const GuestAccount = ({ navigation }) => (
  <View style={styles.container}>
    <ScreenHeader eyebrow="Mon espace" title="Ton compte Fatafalta" />
    <View style={styles.guest}>
      <View style={styles.guestIcon}>
        <UserRound size={24} color={brand.ink} strokeWidth={1.7} />
      </View>
      <Text variant="h3" align="center" style={styles.guestTitle}>Explore librement, télécharge avec un compte</Text>
      <Text variant="body" align="center" style={styles.guestText}>
        Ton compte te permet de télécharger les sujets, de suivre ton abonnement et de parrainer tes amis.
      </Text>
      <View style={styles.guestActions}>
        <ActionButton title="Créer un compte" onPress={() => navigation.navigate('Register')} />
        <ActionButton title="Se connecter" variant="secondary" onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  </View>
);

/**
 * Tableau de bord personnel : un résumé par sujet (abonnement, code, portefeuille),
 * le détail est à un appui. Les réglages secondaires restent dans Paramètres.
 */
const AccountScreen = ({ navigation }) => {
  const { user, isAuthenticated, logout, isAdmin } = useContext(AuthContext);
  const entitlements = useEntitlements();
  const wallet = useWallet();

  if (!isAuthenticated) return <GuestAccount navigation={navigation} />;

  const data = entitlements.data;
  const subscription = data?.subscription;
  const downloads = data?.downloads;
  const refreshing = entitlements.isRefetching || wallet.isRefetching;

  const subscriptionHint = subscription?.status === 'ACTIVE'
    ? `Expire le ${formatDate(subscription.currentPeriodEnd)}`
    : subscription?.status === 'EXPIRED'
      ? `Expiré le ${formatDate(subscription.currentPeriodEnd)}`
      : 'Débloque tous les sujets et corrigés';

  const confirmLogout = () => {
    Alert.alert('Se déconnecter', 'Tes documents téléchargés restent disponibles sur cet appareil.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader eyebrow="Mon espace" title={user?.name || 'Mon compte'} subtitle={user?.email} titleLines={1} />
      <AccountScroll
        refreshing={refreshing}
        onRefresh={() => {
          entitlements.refetch();
          wallet.refetch();
        }}
      >
        {!data && entitlements.isLoading ? <SkeletonRows count={4} /> : (
          <>
            <Section>
              <Row
                icon={CreditCard}
                label="Abonnement"
                hint={subscriptionHint}
                trailing={subscription ? <StatusPill status={subscription.status} /> : null}
                onPress={() => navigation.navigate('Subscription')}
              />
              <Row
                icon={Gift}
                label="Code promotionnel"
                hint={data?.promoCode?.code}
                trailing={data?.promoCode ? <StatusPill status={data.promoCode.status} /> : null}
                onPress={() => navigation.navigate('PromoCode')}
              />
              <Row
                icon={Wallet}
                label="Portefeuille"
                hint="Solde disponible"
                value={wallet.data ? formatAmount(wallet.data.balances.available) : '—'}
                onPress={() => navigation.navigate('Wallet')}
                isLast={!downloads || downloads.unlimited}
              />
              {downloads && !downloads.unlimited ? (
                <Row
                  icon={Download}
                  label="Téléchargements du jour"
                  hint="Renouvelés chaque jour à minuit"
                  value={`${downloads.used} / ${downloads.limit}`}
                  isLast
                />
              ) : null}
            </Section>

            <Section>
              {isAdmin() ? (
                <Row icon={ShieldCheck} label="Administration" onPress={() => navigation.navigate('AdminTab')} />
              ) : null}
              <Row icon={Settings} label="Paramètres" onPress={() => navigation.navigate('Settings')} />
              <Row icon={LogOut} label="Se déconnecter" onPress={confirmLogout} danger isLast />
            </Section>
          </>
        )}
      </AccountScroll>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.paper,
  },
  guest: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['2xl'],
    paddingBottom: theme.spacing['3xl'],
  },
  guestIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
    borderRadius: theme.radius.full,
    backgroundColor: brand.paperDim,
  },
  guestTitle: {
    maxWidth: 300,
    color: brand.ink,
  },
  guestText: {
    maxWidth: 310,
    marginTop: theme.spacing.sm,
    color: brand.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  guestActions: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
});

export default AccountScreen;
