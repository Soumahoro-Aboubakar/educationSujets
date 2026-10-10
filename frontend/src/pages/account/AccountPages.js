import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Copy, CreditCard, Download, FileText, Gift, Wallet } from 'lucide-react';
import { Button, Card, EmptyState, Field, InfoRow, Modal, PasswordField, SkeletonRows, StatusPill } from '../../components/ui';
import AuthContext from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import useEntitlements from '../../hooks/useEntitlements';
import { account, errorMessage } from '../../lib/api';
import { documentTitle, formatAmount, formatDate, formatLongDate } from '../../lib/format';
import { PageTitle } from './AccountLayout';

const SUBSCRIPTION_TITLES = {
  ACTIVE: 'Abonnement actif',
  EXPIRED: 'Abonnement expiré',
  PENDING: 'Paiement en cours',
  NONE: 'Aucun abonnement',
};

const KIND_LABELS = { initial: 'Abonnement', monthly: 'Mensualité' };

const Loading = () => <Card className="p-5"><SkeletonRows count={4} /></Card>;
const Failed = ({ onRetry }) => <Card><EmptyState title="Connexion impossible" description="Ces informations n’ont pas pu être chargées." onRetry={onRetry} /></Card>;

const SummaryCard = ({ to, icon: Icon, label, value, detail, pill }) => (
  <Link to={to} className="group flex flex-col rounded-2xl border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-soft">
    <div className="flex items-center justify-between">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper-dim"><Icon size={17} className="text-ink" /></span>
      {pill}
    </div>
    <p className="mt-5 text-sm text-ink-soft">{label}</p>
    <p className="mt-0.5 truncate text-xl font-bold tracking-[-0.02em] text-ink">{value}</p>
    {detail ? <p className="mt-1 text-sm text-ink-muted">{detail}</p> : null}
    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-burgundy">Détails <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
  </Link>
);

// ── Aperçu ─────────────────────────────────────────────
export const AccountOverview = () => {
  const { user } = useContext(AuthContext);
  const entitlements = useEntitlements();
  const wallet = useAsync(() => account.wallet(), []);

  if (entitlements.loading && !entitlements.data) return <Loading />;
  if (entitlements.error) return <Failed onRetry={entitlements.reload} />;

  const { subscription, promoCode, downloads } = entitlements.data;
  const firstName = user?.name?.split(' ')[0];

  return (
    <>
      <PageTitle title={`Bonjour ${firstName || ''}`.trim()} description="L’essentiel de votre compte en un coup d’œil." />

      {subscription.status !== 'ACTIVE' ? (
        <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">{subscription.status === 'EXPIRED' ? 'Votre abonnement a expiré' : 'Débloquez tous les sujets et corrigés'}</p>
            <p className="mt-1 text-sm text-white/70">Abonnez-vous pour télécharger et activer votre code promotionnel.</p>
          </div>
          <Button to="/abonnement" variant="gold">{subscription.status === 'EXPIRED' ? 'Renouveler' : 'S’abonner'}</Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          to="/compte/abonnement"
          icon={CreditCard}
          label="Abonnement"
          value={SUBSCRIPTION_TITLES[subscription.status]}
          detail={subscription.currentPeriodEnd ? `${subscription.status === 'ACTIVE' ? 'Expire' : 'Expiré'} le ${formatDate(subscription.currentPeriodEnd)}` : null}
          pill={<StatusPill status={subscription.status} />}
        />
        <SummaryCard to="/compte/code-promo" icon={Gift} label="Code promotionnel" value={promoCode.code} pill={<StatusPill status={promoCode.status} />} />
        <SummaryCard to="/compte/portefeuille" icon={Wallet} label="Solde disponible" value={wallet.data ? formatAmount(wallet.data.balances.available) : '—'} />
      </div>

      {!downloads.unlimited ? (
        <Card className="mt-4 flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-ink-soft">Téléchargements aujourd’hui</p>
            <p className="mt-0.5 text-lg font-bold text-ink">{`${downloads.used} / ${downloads.limit}`}</p>
          </div>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-paper-dim sm:w-40" role="progressbar" aria-label="Téléchargements utilisés aujourd’hui" aria-valuenow={downloads.used} aria-valuemin={0} aria-valuemax={downloads.limit}>
            <div className="h-full origin-left rounded-full bg-ink transition-transform duration-700 ease-emphasized" style={{ transform: `scaleX(${Math.min(1, downloads.used / (downloads.limit || 1))})` }} />
          </div>
        </Card>
      ) : null}
    </>
  );
};

// ── Abonnement ─────────────────────────────────────────
export const AccountSubscription = () => {
  const { data, loading, error, reload } = useAsync(() => account.subscription(), []);

  if (loading && !data) return <Loading />;
  if (error) return <Failed onRetry={reload} />;

  const cta = data.status === 'ACTIVE' ? 'Prolonger mon accès' : data.status === 'EXPIRED' ? 'Renouveler' : 'S’abonner';

  return (
    <>
      <PageTitle
        title="Mon abonnement"
        description={data.status === 'ACTIVE' ? `Actif jusqu’au ${formatLongDate(data.currentPeriodEnd)}` : SUBSCRIPTION_TITLES[data.status]}
        action={<Button to="/abonnement">{cta}</Button>}
      />
      <Card className="px-5">
        <InfoRow label="Statut"><StatusPill status={data.status} /></InfoRow>
        {data.firstActivatedAt ? <InfoRow label="Date de début" value={formatLongDate(data.firstActivatedAt)} /> : null}
        {data.currentPeriodEnd ? <InfoRow label="Date d’expiration" value={formatLongDate(data.currentPeriodEnd)} /> : null}
        {data.renewalDate ? <InfoRow label="Renouvellement annuel" value={formatLongDate(data.renewalDate)} /> : null}
        <InfoRow label="Prochain paiement" value={`${formatAmount(data.nextPayment.amount)} · ${data.nextPayment.label}`} />
      </Card>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink">Historique des paiements</h2>
      <Card className="overflow-hidden">
        {data.payments.length ? (
          <table className="w-full text-left text-sm">
            <thead className="hidden bg-paper text-ink-soft sm:table-header-group">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Moyen</th>
                <th className="px-5 py-3 text-right font-medium">Montant</th>
                <th className="px-5 py-3 text-right font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.payments.map((payment) => (
                <tr key={payment.id} className="flex flex-wrap items-center gap-x-3 px-5 py-3 sm:table-row sm:p-0">
                  <td className="text-ink-soft sm:px-5 sm:py-3.5">{formatDate(payment.createdAt)}</td>
                  <td className="font-medium text-ink sm:px-5">{KIND_LABELS[payment.kind]}</td>
                  <td className="hidden text-ink-soft sm:table-cell sm:px-5">{payment.methodLabel}</td>
                  <td className="ml-auto font-semibold text-ink sm:ml-0 sm:px-5 sm:text-right">{formatAmount(payment.amount)}</td>
                  <td className="w-full sm:w-auto sm:px-5 sm:text-right"><StatusPill status={payment.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon={CreditCard} title="Aucun paiement" description="Vos paiements apparaîtront ici." />}
      </Card>
    </>
  );
};

// ── Téléchargements ────────────────────────────────────
export const AccountDownloads = () => {
  const { data, loading, error, reload } = useAsync(() => account.downloads(), []);

  if (loading && !data) return <Loading />;
  if (error) return <Failed onRetry={reload} />;

  return (
    <>
      <PageTitle title="Mes téléchargements" description="Les derniers documents que vous avez téléchargés." />
      <Card className="overflow-hidden">
        {data.length ? data.map((entry) => (
          <Link key={entry.id} to={`/sujets/document/${entry.document._id}`} className="group flex items-center gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-paper">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper-dim"><FileText size={17} className="text-ink" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{documentTitle(entry.document)}</p>
              <p className="text-sm text-ink-soft">{formatDate(entry.date)}</p>
            </div>
            <ArrowRight size={16} className="text-ink-muted group-hover:text-ink" />
          </Link>
        )) : (
          <EmptyState icon={Download} title="Aucun téléchargement" description="Les documents téléchargés depuis votre compte apparaîtront ici." action={<Button to="/sujets" variant="secondary" size="sm">Explorer les sujets</Button>} />
        )}
      </Card>
    </>
  );
};

// ── Code promotionnel ──────────────────────────────────
export const AccountPromoCode = () => {
  const { data, loading, error, reload } = useAsync(() => account.promoCode(), []);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  if (loading && !data) return <Loading />;
  if (error) return <Failed onRetry={reload} />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (copyError) {
      setCopied(false);
    }
  };

  return (
    <>
      <PageTitle title="Mon code promotionnel" />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <StatusPill status={data.status} />
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-ink">{data.code}</p>
          </div>
          <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copié' : 'Copier'}</Button>
        </div>
        {data.status !== 'ACTIVE' ? (
          <p className="mt-5 rounded-xl bg-paper-dim p-4 text-sm leading-relaxed text-ink-soft">
            Votre code promotionnel est actuellement inactif. Activez votre abonnement pour pouvoir bénéficier des commissions générées par les nouveaux utilisateurs utilisant votre code.
          </p>
        ) : null}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card className="p-5"><p className="text-sm text-ink-soft">Mes gains</p><p className="mt-1 text-2xl font-bold text-ink">{formatAmount(data.stats.earned)}</p></Card>
        <Card className="p-5"><p className="text-sm text-ink-soft">Filleuls</p><p className="mt-1 text-2xl font-bold text-ink">{data.stats.referrals}</p></Card>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink">Utilisateurs ayant utilisé mon code</h2>
      <Card className="overflow-hidden">
        {data.referrals.length ? data.referrals.map((referral) => (
          <div key={referral.id} className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{referral.name}</p>
              <p className="text-sm text-ink-soft">{formatDate(referral.date)}</p>
            </div>
            <span className="text-sm font-semibold text-ink">{formatAmount(referral.amount)}</span>
            <StatusPill status={referral.status} />
          </div>
        )) : <EmptyState icon={Gift} title="Pas encore de filleul" description="Partagez votre code : vos amis paient moins cher, et vous êtes récompensé." />}
      </Card>

      <button type="button" onClick={() => setShowHelp((value) => !value)} aria-expanded={showHelp} className="mt-8 flex w-full items-center justify-between py-2 text-left font-semibold text-ink">
        Comment ça marche ?
        <ChevronDown size={18} className={`text-ink-soft transition-transform ${showHelp ? 'rotate-180' : ''}`} />
      </button>
      {showHelp ? (
        <p className="animate-fade-up text-sm leading-relaxed text-ink-soft">
          {`Votre ami saisit votre code lors de son premier abonnement et le paie ${formatAmount(data.terms.discountedPrice)}. Vous recevez ${formatAmount(data.terms.commission)} sur ce premier paiement, disponibles dans votre portefeuille après un court délai de sécurité. ${data.alwaysActive ? 'En tant que partenaire, votre code reste actif en permanence.' : 'Votre code n’est actif que pendant votre abonnement.'}`}
        </p>
      ) : null}
    </>
  );
};

// ── Portefeuille ───────────────────────────────────────
const WithdrawModal = ({ open, onClose, wallet, onDone }) => {
  const { user } = useContext(AuthContext);
  const [nameFirst = '', ...nameRest] = (user?.name || '').split(' ');
  const [form, setForm] = useState({ operator: '', phone: user?.phone || '', firstName: nameFirst, lastName: nameRest.join(' '), amount: String(wallet.balances.available) });
  const [step, setStep] = useState('form');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const rules = wallet.withdrawalRules;
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const review = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.operator) return setError('Choisissez un opérateur.');
    if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, ''))) return setError('Numéro à 10 chiffres attendu.');
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Nom et prénom obligatoires.');
    if (!Number.isInteger(amount) || amount < rules.minAmount || amount > wallet.balances.available) {
      return setError(`Montant entre ${formatAmount(rules.minAmount)} et ${formatAmount(wallet.balances.available)}.`);
    }
    setError(null);
    return setStep('confirm');
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await account.withdraw({ ...form, phone: form.phone.replace(/\s/g, ''), amount: Number(form.amount) });
      setStep('done');
      onDone();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const operatorLabel = rules.operators.find((item) => item.id === form.operator)?.label;

  return (
    <Modal open={open} onClose={onClose} title="Retirer mes gains" dismissible={!submitting}>
      {step === 'done' ? (
        <div className="py-4 text-center">
          <Check size={40} className="mx-auto text-emerald-500" />
          <h2 className="mt-4 text-xl font-bold text-ink">Demande envoyée</h2>
          <p className="mt-2 text-sm text-ink-soft">Votre retrait est en attente de traitement. Suivez son statut dans l’historique.</p>
          <Button className="mt-6 w-full" onClick={onClose}>Fermer</Button>
        </div>
      ) : step === 'confirm' ? (
        <>
          <h2 className="text-xl font-bold text-ink">Confirmer le retrait</h2>
          <Card className="mt-5 px-5">
            <InfoRow label="Montant" value={formatAmount(Number(form.amount))} />
            <InfoRow label="Opérateur" value={operatorLabel} />
            <InfoRow label="Numéro" value={form.phone} />
            <InfoRow label="Bénéficiaire" value={`${form.firstName} ${form.lastName}`} />
          </Card>
          <p className="mt-3 text-xs text-ink-muted">Les frais de transfert de l’opérateur sont à votre charge.</p>
          {error ? <p className="mt-3 text-sm text-rose-600" role="alert">{error}</p> : null}
          <div className="mt-6 grid gap-2">
            <Button size="lg" loading={submitting} onClick={submit}>Confirmer le retrait</Button>
            <Button size="lg" variant="secondary" disabled={submitting} onClick={() => setStep('form')}>Modifier</Button>
          </div>
        </>
      ) : (
        <form onSubmit={review} noValidate>
          <h2 className="text-xl font-bold text-ink">Retirer mes gains</h2>
          <p className="mt-1 text-sm text-ink-soft">{`Solde disponible : ${formatAmount(wallet.balances.available)}`}</p>
          <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Opérateur">
            {rules.operators.map((item) => (
              <button key={item.id} type="button" role="radio" aria-checked={form.operator === item.id} onClick={() => setForm((current) => ({ ...current, operator: item.id }))}
                className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${form.operator === item.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-line-strong'}`}>
                {item.label}
              </button>
            ))}
          </div>
          <Field className="mt-4" label="Numéro Mobile Money" type="tel" value={form.phone} onChange={set('phone')} placeholder="07 01 02 03 04" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Prénom" value={form.firstName} onChange={set('firstName')} />
            <Field label="Nom" value={form.lastName} onChange={set('lastName')} />
          </div>
          <Field className="mt-4" label="Montant (FCFA)" inputMode="numeric" value={form.amount} onChange={set('amount')} />
          {error ? <p className="mt-3 text-sm text-rose-600" role="alert">{error}</p> : null}
          <Button type="submit" size="lg" className="mt-6 w-full">Continuer</Button>
        </form>
      )}
    </Modal>
  );
};

export const AccountWallet = () => {
  const { data, loading, error, reload } = useAsync(() => account.wallet(), []);
  const [withdrawing, setWithdrawing] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  if (loading && !data) return <Loading />;
  if (error) return <Failed onRetry={reload} />;

  const { balances, history, withdrawalRules } = data;
  const canWithdraw = balances.available >= withdrawalRules.minAmount;

  const cancel = async (id) => {
    setCancelError(null);
    try {
      await account.cancelWithdrawal(id);
      reload();
    } catch (requestError) {
      setCancelError(errorMessage(requestError));
    }
  };

  return (
    <>
      <PageTitle title="Portefeuille" description="Vos gains de parrainage et vos retraits." />

      <div className="rounded-2xl bg-ink p-6 text-white md:p-8">
        <p className="text-sm text-white/70">Solde disponible</p>
        <p className="mt-1 text-4xl font-extrabold tracking-[-0.04em] md:text-5xl">{formatAmount(balances.available)}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="gold" icon={ArrowUpRight} disabled={!canWithdraw} onClick={() => setWithdrawing(true)}>Retirer mes gains</Button>
          {!canWithdraw ? <span className="text-sm text-white/60">{`Retrait possible dès ${formatAmount(withdrawalRules.minAmount)}.`}</span> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-ink-soft">Gains générés</p><p className="mt-1 text-xl font-bold text-ink">{formatAmount(balances.earned)}</p></Card>
        <Card className="p-5"><p className="text-sm text-ink-soft">Déjà retiré</p><p className="mt-1 text-xl font-bold text-ink">{formatAmount(balances.withdrawn)}</p></Card>
        <Card className="col-span-2 p-5 md:col-span-1"><p className="text-sm text-ink-soft">En attente</p><p className="mt-1 text-xl font-bold text-ink">{formatAmount(balances.onHold + balances.pendingWithdrawal)}</p></Card>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink">Historique</h2>
      {cancelError ? <p className="mb-3 text-sm text-rose-600" role="alert">{cancelError}</p> : null}
      <Card className="overflow-hidden">
        {history.length ? history.map((entry) => {
          const isWithdrawal = entry.type === 'WITHDRAWAL';
          const Icon = isWithdrawal ? ArrowUpRight : ArrowDownLeft;
          return (
            <div key={`${entry.type}-${entry.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5 last:border-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper-dim"><Icon size={16} className="text-ink" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{isWithdrawal ? `Retrait ${entry.operatorLabel} ${entry.phone}` : 'Commission de parrainage'}</p>
                <p className="text-sm text-ink-soft">{formatDate(entry.date)}</p>
              </div>
              <span className="font-semibold text-ink">{`${isWithdrawal ? '−' : '+'}${formatAmount(entry.amount)}`}</span>
              <StatusPill status={entry.status} />
              {isWithdrawal && entry.status === 'PENDING' ? (
                <button type="button" onClick={() => cancel(entry.id)} className="text-sm font-medium text-burgundy hover:underline">Annuler</button>
              ) : null}
            </div>
          );
        }) : <EmptyState icon={Wallet} title="Aucun mouvement" description="Vos commissions apparaîtront ici dès qu’un ami s’abonnera avec votre code." />}
      </Card>

      {withdrawing ? <WithdrawModal open onClose={() => setWithdrawing(false)} wallet={data} onDone={reload} /> : null}
    </>
  );
};

// ── Profil ─────────────────────────────────────────────
export const AccountProfile = () => {
  const { user } = useContext(AuthContext);
  const entitlements = useEntitlements();
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [profileState, setProfileState] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [passwordState, setPasswordState] = useState(null);

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileState({ loading: true });
    try {
      await account.updateProfile(profile);
      setProfileState({ message: 'Profil enregistré.' });
    } catch (error) {
      setProfileState({ error: errorMessage(error) });
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordState({ loading: true });
    try {
      await account.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      setPasswordState({ message: 'Mot de passe modifié.' });
    } catch (error) {
      setPasswordState({ error: errorMessage(error) });
    }
  };

  const mustChange = entitlements.data?.account?.mustChangePassword;

  return (
    <>
      <PageTitle title="Profil" />
      {mustChange ? (
        <p className="mb-6 rounded-xl bg-gold-wash p-4 text-sm text-gold-ink">Votre compte a été créé avec un mot de passe temporaire. Choisissez un mot de passe personnel ci-dessous.</p>
      ) : null}

      <Card className="p-6">
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
          <Field label="Téléphone" type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="07 01 02 03 04" />
          <Field label="Email" value={user?.email || ''} disabled hint="Contactez le support pour modifier votre email." />
          <div className="flex items-end">
            <InfoRow label="Statut du compte"><StatusPill status={entitlements.data?.account?.status || 'ACTIVE'} /></InfoRow>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" loading={profileState?.loading}>Enregistrer</Button>
            {profileState?.message ? <span className="text-sm text-emerald-700">{profileState.message}</span> : null}
            {profileState?.error ? <span className="text-sm text-rose-600">{profileState.error}</span> : null}
          </div>
        </form>
      </Card>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink">Mot de passe</h2>
      <Card className="p-6">
        <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="Mot de passe actuel" autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
          <PasswordField label="Nouveau mot de passe" autoComplete="new-password" hint="8 caractères minimum." value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="secondary" loading={passwordState?.loading}>Modifier le mot de passe</Button>
            {passwordState?.message ? <span className="text-sm text-emerald-700">{passwordState.message}</span> : null}
            {passwordState?.error ? <span className="text-sm text-rose-600">{passwordState.error}</span> : null}
          </div>
        </form>
      </Card>
    </>
  );
};
