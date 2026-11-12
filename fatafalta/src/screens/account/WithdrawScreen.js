import { SkeletonRows } from '../../components/ui/Skeleton';
import StateView from '../../components/ui/StateView';
import { getUserMessage } from '../../utils/userMessages';
import Pressable from '../../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useContext, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { AccountField } from '../../components/account/AccountPresentation';
import { Metric } from '../../components/account/AccountLayout';
import * as Haptics from 'expo-haptics';
import { CheckCircle2 } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { PrepButton as ActionButton } from '../../prep/ui/primitives';
import Sheet from '../../components/ui/Sheet';
import { AccountScroll, Row, Section } from '../../components/account/AccountLayout';
import AuthContext from '../../context/AuthContext';
import { useRefreshAccount, useWallet } from '../../hooks/useAccount';
import { getErrorMessage, requestWithdrawal } from '../../services/billing';
import { formatAmount } from '../../utils/format';

const Field = ({ label, error, ...props }) => {
  const { styles } = useStyles();
  return (<View style={styles.field}><AccountField label={label} error={error} {...props} /></View>);
};

const splitName = (name = '') => {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  return { firstName: first, lastName: rest.join(' ') };
};

/**
 * Demande de retrait en deux temps : saisie, puis récapitulatif à confirmer.
 * Le serveur revalide tout (solde, opérateur, numéro) : ce formulaire n'est qu'un guide.
 */
const WithdrawScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { styles } = useStyles();
  const { user } = useContext(AuthContext);
  const { data, isLoading, isError, error: loadError, refetch } = useWallet();
  const refreshAccount = useRefreshAccount();
  const [form, setForm] = useState(() => ({ operator: null, phone: user?.phone || '', amount: '', ...splitName(user?.name) }));
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [done, setDone] = useState(null);

  const available = data?.balances.available || 0;
  const rules = data?.withdrawalRules;

  useEffect(() => {
    if (data && !form.amount) setForm((current) => ({ ...current, amount: String(available) }));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const next = {};
    const amount = Number(form.amount);
    if (!form.operator) next.operator = 'Opérateur requis. Choisis ton opérateur Mobile Money.';
    if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, ''))) next.phone = 'Numéro à vérifier. Saisis 10 chiffres, par exemple 07 01 02 03 04.';
    if (!form.firstName.trim()) next.firstName = 'Prénom requis. Saisis ton prénom pour continuer.';
    if (!form.lastName.trim()) next.lastName = 'Nom requis. Saisis ton nom pour continuer.';
    if (!Number.isInteger(amount) || amount <= 0) next.amount = 'Montant à vérifier. Saisis un montant entier supérieur à zéro.';
    else if (rules && amount < rules.minAmount) next.amount = `Montant trop faible. Choisis au moins ${formatAmount(rules.minAmount)}.`;
    else if (amount > available) next.amount = `Solde insuffisant. Choisis un montant inférieur ou égal à ${formatAmount(available)}.`;
    setErrors(next);
    return !Object.keys(next).length;
  };

  const review = () => {
    setServerError(null);
    if (validate()) setConfirming(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setServerError(null);
    try {
      const withdrawal = await requestWithdrawal({ ...form, phone: form.phone.replace(/\s/g, ''), amount: Number(form.amount) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setConfirming(false);
      setDone(withdrawal);
      refreshAccount();
    } catch (error) {
      setServerError(getErrorMessage(error, 'retrait'));
    } finally {
      setSubmitting(false);
    }
  };

  const operatorLabel = rules?.operators.find((operator) => operator.id === form.operator)?.label;

  if (!data) {
    return <View style={styles.container}>
      <ScreenHeader title="Retirer mes gains" onBack={() => navigation.goBack()} />
      {isLoading ? <SkeletonRows count={5} /> : isError ? <StateView title={getUserMessage(loadError, 'portefeuille').title} description={getUserMessage(loadError, 'portefeuille').message} onRetry={refetch} /> : null}
    </View>;
  }

  if (done) {
    return (
      <View style={styles.container}>
        <ScreenHeader onBack={() => navigation.goBack()} eyebrow="Portefeuille" title="Demande envoyée" />
        <View style={styles.success}>
          <CheckCircle2 size={44} color={theme.colors.success} strokeWidth={2} />
          <Text variant="h2" align="center" style={styles.successTitle}>{formatAmount(done.amount)}</Text>
          <Text variant="body" align="center" style={styles.successText}>
            {`Ton retrait vers ${done.operatorLabel} (${done.phone}) est en attente de traitement. Tu peux suivre son statut dans ton portefeuille.`}
          </Text>
          <ActionButton title="Retour au portefeuille" onPress={() => navigation.goBack()} style={styles.successButton} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        title="Retirer mes gains"
      />
      <AccountScroll>
        <Metric paper label="Solde disponible" value={formatAmount(available)} />
        <Text variant="h2" style={styles.label}>Opérateur</Text>
        <View style={styles.operators}>
          {(rules?.operators || []).map((operator) => {
            const selected = form.operator === operator.id;
            return (
              <Pressable
                key={operator.id}
                accessibilityRole="radio"
                accessibilityLabel={operator.label}
                accessibilityState={{ checked: selected }}
                onPress={() => set('operator')(operator.id)}
                style={[styles.operator, selected && styles.operatorSelected]}
              >
                <Text variant="bodyMedium" style={[styles.operatorLabel, selected && styles.operatorLabelSelected]}>{operator.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {errors.operator ? <Text variant="caption" style={styles.fieldError}>{errors.operator}</Text> : null}

        <Field label="Numéro Mobile Money" keyboardType="phone-pad" placeholder="07 01 02 03 04" value={form.phone} onChangeText={set('phone')} error={errors.phone} />
        <View style={styles.inline}>
          <View style={styles.inlineItem}>
            <Field label="Prénom" value={form.firstName} onChangeText={set('firstName')} error={errors.firstName} autoCapitalize="words" />
          </View>
          <View style={styles.inlineItem}>
            <Field label="Nom" value={form.lastName} onChangeText={set('lastName')} error={errors.lastName} autoCapitalize="words" />
          </View>
        </View>
        <Field label="Montant (FCFA)" keyboardType="number-pad" value={form.amount} onChangeText={set('amount')} error={errors.amount} />

        <Text variant="caption" style={styles.notice}>
          Les frais de transfert éventuels de l’opérateur sont à ta charge. Le nom doit correspondre au titulaire du compte Mobile Money.
        </Text>

        <ActionButton title="Vérifier mon retrait" onPress={review} disabled={!data} style={styles.submit} />
      </AccountScroll>

      <Sheet visible={confirming} onClose={() => !submitting && setConfirming(false)}>
        <Text variant="h2" style={styles.sheetTitle}>Confirmer le retrait</Text>
        <Section>
          <Row label="Montant" value={formatAmount(Number(form.amount))} />
          <Row label="Opérateur" value={operatorLabel} />
          <Row label="Numéro" value={form.phone} />
          <Row label="Bénéficiaire" value={`${form.firstName} ${form.lastName}`} isLast />
        </Section>
        {serverError ? <Text variant="caption" accessibilityLiveRegion="polite" style={styles.serverError}>{serverError}</Text> : null}
        <View style={styles.sheetActions}>
          <ActionButton title="Confirmer" onPress={submit} loading={submitting} />
          <ActionButton title="Modifier" variant="secondary" onPress={() => setConfirming(false)} disabled={submitting} />
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
};

export default WithdrawScreen;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    container: { ...theme.layout.readingFrame,
      flex: 1,
      backgroundColor: brand.paper,
    },
    label: {
      marginBottom: theme.spacing.sm,
      color: brand.inkSoft,
    },
    operators: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    operator: {
      minHeight: theme.layout.touch,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.base,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: brand.lineStrong,
      backgroundColor: theme.colors.surface,
    },
    operatorSelected: {
      borderColor: brand.burgundy,
      backgroundColor: brand.burgundySolid,
    },
    operatorLabel: {
      color: brand.ink,
      fontSize: 14,
    },
    operatorLabelSelected: {
      color: brand.onInk,
    },
    field: {
      marginTop: theme.spacing.lg,
    },

    fieldError: {
      marginTop: 4,
      color: theme.colors.error,
      fontFamily: theme.fontFamily.regular,
    },
    inline: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    inlineItem: {
      flex: 1,
      minWidth: 130,
    },
    notice: {
      marginTop: theme.spacing.lg,
      color: brand.inkSoft,
      fontFamily: theme.fontFamily.regular,
      lineHeight: 18,
    },
    submit: {
      marginTop: theme.spacing.xl,
    },
    sheetTitle: {
      marginBottom: theme.spacing.base,
      color: brand.ink,
    },
    serverError: {
      marginTop: -theme.spacing.sm,
      marginBottom: theme.spacing.md,
      color: theme.colors.error,
    },
    sheetActions: {
      gap: theme.spacing.sm,
    },
    success: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing['2xl'],
    },
    successTitle: {
      marginTop: theme.spacing.base,
      color: brand.ink,
    },
    successText: {
      maxWidth: 320,
      marginTop: theme.spacing.sm,
      color: brand.inkSoft,
      fontSize: 14,
      lineHeight: 20,
    },
    successButton: {
      alignSelf: 'stretch',
      marginTop: theme.spacing.xl,
    },
  });
  return { styles };
});
