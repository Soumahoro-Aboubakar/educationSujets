import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Clock, Lock, ShieldOff } from 'lucide-react-native';
import Text from '../ui/Text';
import Sheet from '../ui/Sheet';
import ActionButton from '../ui/ActionButton';
import { usePlans } from '../../hooks/useAccount';
import { formatAmount } from '../../utils/format';
import theme from '../../theme/tokens';

const { brand } = theme;

const Benefit = ({ children }) => (
  <View style={styles.benefit}>
    <Check size={16} color={brand.goldInk} strokeWidth={2.2} />
    <Text variant="body" style={styles.benefitText}>{children}</Text>
  </View>
);

const Header = ({ icon: Icon, title, description }) => (
  <View style={styles.header}>
    <View style={styles.icon}>
      <Icon size={22} color={brand.ink} strokeWidth={1.8} />
    </View>
    <Text variant="h2" align="center" style={styles.title}>{title}</Text>
    {description ? <Text variant="body" align="center" style={styles.description}>{description}</Text> : null}
  </View>
);

/**
 * Explique pourquoi un document n'est pas téléchargeable et propose l'étape suivante.
 * `reason` est le code renvoyé par le serveur : l'interface ne décide jamais seule des droits.
 */
const AccessSheet = ({ reason, visible, onClose, onLogin, onRegister, onSubscribe, subscribing, entitlements, limitInfo, onOpenDownloads }) => {
  const { data: plans } = usePlans();
  const canCheckout = entitlements?.checkout?.mobileWebCheckout !== false;
  const amount = entitlements?.nextPayment?.amount ?? plans?.initial?.amount;
  const isRenewal = entitlements?.subscription?.status === 'EXPIRED';

  const renderContent = () => {
    switch (reason) {
      case 'AUTH_REQUIRED':
        return (
          <>
            <Header
              icon={Lock}
              title="Document réservé aux membres"
              description="Connecte-toi ou crée ton compte. Nous vérifierons ensuite ton accès automatiquement."
            />
            <View style={styles.actions}>
              <ActionButton title="Créer un compte" onPress={onRegister} />
              <ActionButton title="J’ai déjà un compte" variant="secondary" onPress={onLogin} />
            </View>
          </>
        );

      case 'SUBSCRIPTION_REQUIRED':
        return (
          <>
            <Header
              icon={Lock}
              title={isRenewal ? 'Ton abonnement a expiré' : 'Débloque tous les sujets'}
              description="Ton compte n’a pas encore accès aux téléchargements."
            />
            {/* Version store : ni prix ni appel à l'achat, l'application ne vend rien. */}
            {canCheckout && amount ? (
              <View style={styles.price}>
                <Text style={styles.priceValue}>{formatAmount(amount)}</Text>
                {plans && entitlements?.nextPayment?.kind !== 'monthly' ? (
                  <Text variant="caption" style={styles.priceNote}>
                    {`${plans.initial.months} mois d’accès, puis ${formatAmount(plans.monthly.amount)} par mois`}
                  </Text>
                ) : (
                  <Text variant="caption" style={styles.priceNote}>pour un mois d’accès</Text>
                )}
              </View>
            ) : null}
            <View style={styles.benefits}>
              <Benefit>Tous les sujets et leurs corrigés</Benefit>
              <Benefit>{`Jusqu’à ${plans?.downloadsPerDay || entitlements?.downloads?.limit || 15} téléchargements par jour`}</Benefit>
              <Benefit>Consultation hors ligne après téléchargement</Benefit>
            </View>
            {canCheckout ? (
              <>
                <ActionButton title={isRenewal ? 'Renouveler mon abonnement' : 'S’abonner'} onPress={onSubscribe} loading={subscribing} />
                <Text variant="caption" align="center" style={styles.footnote}>
                  Le paiement se fait sur le site Fatafalta (Wave), où tu seras déjà connecté. Reviens ensuite ici : ton accès s’active tout seul.
                </Text>
              </>
            ) : (
              <>
                <Text variant="body" align="center" style={styles.footnote}>
                  Les téléchargements se débloquent automatiquement dès que ton compte dispose d’un abonnement actif.
                </Text>
                <ActionButton title="Compris" variant="secondary" onPress={onClose} />
              </>
            )}
          </>
        );

      case 'DAILY_LIMIT_REACHED':
        return (
          <>
            <Header
              icon={Clock}
              title="Limite du jour atteinte"
              description={`Tu as utilisé tes ${limitInfo?.limit || entitlements?.downloads?.limit || ''} téléchargements d’aujourd’hui. Ton quota sera renouvelé à minuit.`}
            />
            <View style={styles.actions}>
              <ActionButton title="Voir mes téléchargements" variant="secondary" onPress={onOpenDownloads} />
              <ActionButton title="Compris" onPress={onClose} />
            </View>
          </>
        );

      case 'ACCOUNT_DISABLED':
        return (
          <>
            <Header
              icon={ShieldOff}
              title="Compte désactivé"
              description="Ton compte ne permet plus de télécharger. Contacte le support Fatafalta pour en savoir plus."
            />
            <ActionButton title="Fermer" variant="secondary" onPress={onClose} />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      {renderContent()}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  icon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
    borderRadius: theme.radius.full,
    backgroundColor: brand.goldWash,
  },
  title: {
    color: brand.ink,
  },
  description: {
    maxWidth: 320,
    marginTop: 6,
    color: brand.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  price: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  priceValue: {
    color: brand.ink,
    fontFamily: theme.fontFamily.extraBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  priceNote: {
    marginTop: 2,
    color: brand.inkSoft,
    fontFamily: theme.fontFamily.regular,
  },
  benefits: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.base,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  benefitText: {
    flex: 1,
    color: brand.ink,
    fontSize: 14,
  },
  footnote: {
    marginTop: theme.spacing.md,
    color: brand.inkMuted,
    fontFamily: theme.fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
  },
});

export default AccessSheet;
