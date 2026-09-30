import React, { useContext, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CheckCircle2 } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import ActionButton from '../../components/ui/ActionButton';
import Sheet from '../../components/ui/Sheet';
import { AccountScroll, Row, Section } from '../../components/account/AccountLayout';
import AuthContext from '../../context/AuthContext';
import { useRefreshAccount, useWallet } from '../../hooks/useAccount';
import { getErrorMessage, requestWithdrawal } from '../../services/billing';
import { formatAmount } from '../../utils/format';
import theme from '../../theme/tokens';

const { brand } = theme;

const Field = ({ label, error, ...props }) => (
  <View style={styles.field}>
    <Text variant="caption" style={styles.fieldLabel}>{label}</Text>
    <TextInput placeholderTextColor={brand.inkMuted} style={[styles.input, error && styles.inputError]} {...props} />
    {error ? <Text variant="caption" style={styles.fieldError}>{error}</Text> : null}
  </View>
);

const splitName = (name = '') => {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  return { firstName: first, lastName: rest.join(' ') };
};

/**
 * Demande de retrait en deux temps : saisie, puis récapitulatif à confirmer.
 * Le serveur revalide tout (solde, opérateur, numéro) : ce formulaire n'est qu'un guide.
 */
const WithdrawScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { data } = useWallet();
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
    if (!form.operator) next.operator = 'Choisis un opérateur';
    if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, ''))) next.phone = '10 chiffres, ex. 07 01 02 03 04';
    if (!form.firstName.trim()) next.firstName = 'Prénom requis';
    if (!form.lastName.trim()) next.lastName = 'Nom requis';
    if (!Number.isInteger(amount) || amount <= 0) next.amount = 'Montant invalide';
    else if (rules && amount < rules.minAmount) next.amount = `Minimum ${formatAmount(rules.minAmount)}`;
    else if (amount > available) next.amount = `Maximum ${formatAmount(available)}`;
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
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const operatorLabel = rules?.operators.find((operator) => operator.id === form.operator)?.label;

  if (done) {
    return (
      <View style={styles.container}>
        <ScreenHeader onBack={() => navigation.goBack()} eyebrow="Portefeuille" title="Demande envoyée" />
        <Animated.View entering={FadeIn.duration(300)} style={styles.success}>
          <CheckCircle2 size={44} color={theme.colors.success} strokeWidth={1.6} />
          <Text variant="h2" align="center" style={styles.successTitle}>{formatAmount(done.amount)}</Text>
          <Text variant="body" align="center" style={styles.successText}>
            {`Ton retrait vers ${done.operatorLabel} (${done.phone}) est en attente de traitement. Tu peux suivre son statut dans ton portefeuille.`}
          </Text>
          <ActionButton title="Retour au portefeuille" onPress={() => navigation.goBack()} style={styles.successButton} />
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        eyebrow="Retirer mes gains"
        title={formatAmount(available)}
        subtitle="Solde disponible"
      />
      <AccountScroll>
        <Text variant="overline" style={styles.label}>Opérateur</Text>
        <View style={styles.operators}>
          {(rules?.operators || []).map((operator) => {
            const selected = form.operator === operator.id;
            return (
              <Pressable
                key={operator.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
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

        <ActionButton title="Continuer" onPress={review} disabled={!data} style={styles.submit} />
      </AccountScroll>

      <Sheet visible={confirming} onClose={() => !submitting && setConfirming(false)}>
        <Text variant="h2" style={styles.sheetTitle}>Confirmer le retrait</Text>
        <Section>
          <Row label="Montant" value={formatAmount(Number(form.amount))} />
          <Row label="Opérateur" value={operatorLabel} />
          <Row label="Numéro" value={form.phone} />
          <Row label="Bénéficiaire" value={`${form.firstName} ${form.lastName}`} isLast />
        </Section>
        {serverError ? <Text variant="caption" style={styles.serverError}>{serverError}</Text> : null}
        <View style={styles.sheetActions}>
          <ActionButton title="Confirmer" onPress={submit} loading={submitting} />
          <ActionButton title="Modifier" variant="secondary" onPress={() => setConfirming(false)} disabled={submitting} />
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    borderColor: brand.ink,
    backgroundColor: brand.ink,
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
  fieldLabel: {
    marginBottom: 6,
    color: brand.inkSoft,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: brand.line,
    backgroundColor: theme.colors.surface,
    color: brand.ink,
    fontFamily: theme.fontFamily.medium,
    fontSize: 15,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  fieldError: {
    marginTop: 4,
    color: theme.colors.error,
    fontFamily: theme.fontFamily.regular,
  },
  inline: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  inlineItem: {
    flex: 1,
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

export default WithdrawScreen;
