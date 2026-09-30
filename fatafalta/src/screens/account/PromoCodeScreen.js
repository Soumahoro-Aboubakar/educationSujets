import React, { useState } from 'react';
import { LayoutAnimation, Pressable, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Check, ChevronDown, Copy, Gift, Share2 } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import StatusPill from '../../components/ui/StatusPill';
import StateView from '../../components/ui/StateView';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { AccountScroll, Metric, Row, Section } from '../../components/account/AccountLayout';
import { usePromoCode } from '../../hooks/useAccount';
import { formatAmount, formatDate } from '../../utils/format';
import theme from '../../theme/tokens';

const { brand } = theme;

// Liste des filleuls repliée par défaut : le résumé suffit dans la plupart des cas.
const PREVIEW_COUNT = 3;

const PromoCodeScreen = ({ navigation }) => {
  const { data, isLoading, isError, refetch, isRefetching } = usePromoCode();
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(data.code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const share = () => Share.share({
    message: `Prépare tes concours avec Fatafalta : anciens sujets et corrigés. Avec mon code ${data.code}, ton abonnement passe à ${formatAmount(data.terms.discountedPrice)}.`,
  }).catch(() => {});

  const toggle = (setter) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((value) => !value);
  };

  const renderBody = () => {
    if (isLoading) return <SkeletonRows count={4} />;
    if (isError) {
      return <StateView icon={Gift} title="Connexion impossible" description="Ton code n’a pas pu être chargé." onRetry={refetch} />;
    }

    const isActive = data.status === 'ACTIVE';
    const referrals = showAll ? data.referrals : data.referrals.slice(0, PREVIEW_COUNT);

    return (
      <>
        {!isActive ? (
          <View style={styles.notice}>
            <Text variant="body" style={styles.noticeText}>
              Ton code promotionnel est actuellement inactif. Active ton abonnement pour bénéficier des commissions générées par les nouveaux utilisateurs utilisant ton code.
            </Text>
          </View>
        ) : null}

        <Section>
          <View style={styles.metrics}>
            <Metric compact label="Mes gains" value={formatAmount(data.stats.earned)} />
            <View style={styles.metricDivider} />
            <Metric compact label="Filleuls" value={String(data.stats.referrals)} />
          </View>
        </Section>

        <Section title="Utilisateurs ayant utilisé mon code">
          {referrals.length ? referrals.map((referral, index) => (
            <Row
              key={referral.id}
              label={referral.name}
              hint={formatDate(referral.date)}
              value={formatAmount(referral.amount)}
              trailing={<StatusPill status={referral.status} />}
              isLast={index === referrals.length - 1 && data.referrals.length <= PREVIEW_COUNT}
            />
          )) : (
            <Text variant="body" style={styles.empty}>Personne n’a encore utilisé ton code.</Text>
          )}
          {data.referrals.length > PREVIEW_COUNT ? (
            <Pressable onPress={() => toggle(setShowAll)} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
              <Text variant="bodyMedium" style={styles.moreLabel}>
                {showAll ? 'Réduire' : `Voir les ${data.referrals.length} filleuls`}
              </Text>
            </Pressable>
          ) : null}
        </Section>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showHelp }}
          onPress={() => toggle(setShowHelp)}
          style={styles.helpToggle}
        >
          <Text variant="bodyMedium" style={styles.helpTitle}>Comment ça marche ?</Text>
          <ChevronDown size={18} color={brand.inkSoft} style={showHelp && styles.chevronOpen} />
        </Pressable>
        {showHelp ? (
          <Text variant="body" style={styles.helpText}>
            {`Ton ami saisit ton code lors de son premier abonnement et le paie ${formatAmount(data.terms.discountedPrice)}. Tu reçois ${formatAmount(data.terms.commission)} sur ce premier paiement, disponibles dans ton portefeuille après un court délai de sécurité. ${data.alwaysActive ? 'En tant que partenaire, ton code reste actif en permanence.' : 'Ton code n’est actif que pendant ton abonnement.'}`}
          </Text>
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={() => navigation.goBack()} eyebrow="Mon code promotionnel" title={data?.code || 'Code promotionnel'} titleLines={1}>
        {data ? (
          <View style={styles.headerRow}>
            <StatusPill status={data.status} />
            <View style={styles.headerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Copier le code" onPress={copy} style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}>
                {copied ? <Check size={15} color={brand.ink} strokeWidth={2.4} /> : <Copy size={15} color={brand.ink} strokeWidth={2} />}
                <Text style={styles.headerButtonLabel}>{copied ? 'Copié' : 'Copier'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Partager le code" onPress={share} style={({ pressed }) => [styles.headerIcon, pressed && styles.headerButtonPressed]}>
                <Share2 size={16} color={brand.onInk} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        ) : null}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.base,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    backgroundColor: brand.onInkAccent,
  },
  headerButtonPressed: {
    opacity: 0.8,
  },
  headerButtonLabel: {
    color: brand.ink,
    fontFamily: theme.fontFamily.semiBold,
    fontSize: 13,
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  notice: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.base,
    borderRadius: theme.radius.md,
    backgroundColor: brand.paperDim,
  },
  noticeText: {
    color: brand.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  metrics: {
    flexDirection: 'row',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: brand.line,
  },
  empty: {
    padding: theme.spacing.base,
    color: brand.inkSoft,
    fontSize: 14,
  },
  more: {
    minHeight: theme.layout.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.line,
  },
  moreLabel: {
    color: brand.burgundy,
    fontSize: 14,
  },
  pressed: {
    backgroundColor: brand.pressed,
  },
  helpToggle: {
    minHeight: theme.layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpTitle: {
    color: brand.ink,
    fontSize: 15,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  helpText: {
    color: brand.inkSoft,
    fontSize: 14,
    lineHeight: 21,
  },
});

export default PromoCodeScreen;
