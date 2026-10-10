import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, Lock, ShieldCheck, Smartphone, Tag, X } from 'lucide-react';
import { Button, Card, Container, ErrorNote, Eyebrow, Field, InfoRow, Skeleton, Spinner, cx } from '../components/ui';
import AuthContext from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import useEntitlements from '../hooks/useEntitlements';
import { errorCode, errorMessage, payments } from '../lib/api';
import { formatAmount, formatLongDate } from '../lib/format';
import { safeNext } from '../lib/redirect';
import PaymentMethodLogo from '../components/payments/PaymentMethodLogo';

const POLL_INTERVAL_MS = 2500;
const OPEN_STATUSES = ['INITIATED', 'PENDING', 'PROCESSING'];

// Retour vers l'application mobile : seuls ses schémas sont acceptés (pas de redirection ouverte).
const safeReturnUrl = (value) => (value && /^(fatafalta|exp|exps):\/\//i.test(value) ? value : null);

// Délai avant d'afficher l'aide « Rien reçu ? » sur une validation par téléphone.
const HELP_AFTER_SECONDS = 45;

const formatElapsed = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const withParams = (url, params) => `${url}${url.includes('?') ? '&' : '?'}${new URLSearchParams(params).toString()}`;

/** Opérateur affiché avec son logo, à côté de son nom. */
const OperatorName = ({ method }) => (
  <span className="inline-flex items-center gap-2"><PaymentMethodLogo method={method} size="sm" />{method.label || method.methodLabel}</span>
);

const Benefits = ({ downloadsPerDay }) => (
  <ul className="space-y-3 text-[15px] text-ink">
    {['Tous les sujets et leurs corrigés', `Jusqu’à ${downloadsPerDay || 15} téléchargements par jour`, 'Accès identique sur le site et l’application'].map((item) => (
      <li key={item} className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-wash"><Check size={13} strokeWidth={3} className="text-gold-ink" /></span>
        {item}
      </li>
    ))}
  </ul>
);

/** Identifiant unique d'une tentative : rejouer la même tentative ne crée jamais une seconde transaction. */
const newAttemptId = () => (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9_-]/g, '');

const formatPhone = (value) => value.replace(/\D/g, '').replace(/(\d{2})(?=\d)/g, '$1 ');

const SummaryRows = ({ rows, amount }) => (
  <dl className="overflow-hidden rounded-2xl border border-line bg-white">
    {rows.filter(([, value]) => value).map(([label, value]) => (
      <div key={label} className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 text-sm last:border-0">
        <dt className="text-ink-soft">{label}</dt>
        <dd className="tabular font-semibold text-ink">{value}</dd>
      </div>
    ))}
    {amount ? (
      <div className="flex items-baseline justify-between gap-4 bg-paper px-4 py-3.5">
        <dt className="text-sm font-semibold text-ink">Montant</dt>
        <dd className="tabular text-xl font-extrabold tracking-[-0.02em] text-ink">{amount}</dd>
      </div>
    ) : null}
  </dl>
);

const STEPS = ['Opérateur', 'Vérification', 'Validation'];

/** Où en est l'abonné : choix de l'opérateur → vérification → validation chez l'opérateur. */
const Stepper = ({ current }) => (
  <ol className="mb-7 flex items-center gap-2" aria-label="Étapes du paiement">
    {STEPS.map((label, index) => {
      const done = index < current;
      const active = index === current;
      return (
        <li key={label} className={cx('flex items-center gap-2', index < STEPS.length - 1 && 'min-w-0 flex-1')} aria-current={active ? 'step' : undefined}>
          <span className={cx(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-300',
            done ? 'bg-ink text-white' : active ? 'bg-gold-light text-ink ring-4 ring-gold-wash' : 'bg-paper-dim text-ink-muted',
          )}>
            {done ? <Check size={12} strokeWidth={3} /> : index + 1}
          </span>
          <span className={cx('shrink-0 text-xs font-semibold', active ? 'text-ink' : 'hidden text-ink-muted min-[480px]:inline')}>{label}</span>
          {index < STEPS.length - 1 ? (
            <span className="relative h-px min-w-3 flex-1 overflow-hidden bg-line" aria-hidden>
              <span className={cx('absolute inset-0 origin-left bg-ink transition-transform duration-500 ease-emphasized', done ? 'scale-x-100' : 'scale-x-0')} />
            </span>
          ) : null}
        </li>
      );
    })}
  </ol>
);

/** Pictogramme d'issue : coche dessinée (succès confirmé par le serveur) ou croix. */
const Outcome = ({ success }) => (
  <div className={cx('mx-auto flex h-20 w-20 animate-pop-in items-center justify-center rounded-full', success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
    {success ? (
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" className="draw-check" />
      </svg>
    ) : <X size={36} strokeWidth={2.2} aria-hidden />}
  </div>
);

/**
 * Suivi d'UNE transaction (le composant est recréé pour chaque transaction : aucun état d'une
 * tentative précédente ne peut s'afficher ici). Tout ce qui est montré vient du serveur et
 * correspond exactement à ce qui a été envoyé à l'opérateur. L'issue est vérifiée par le serveur.
 */
const PaymentProgress = ({ paymentId, onDone, onEdit, returnUrl, next }) => {
  const [payment, setPayment] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timer;
    let stopped = false;
    const poll = async () => {
      try {
        const current = await payments.get(paymentId);
        if (stopped) return;
        setPayment(current);
        if (OPEN_STATUSES.includes(current.status)) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        } else if (!doneRef.current) {
          doneRef.current = true;
          onDone(current);
        }
      } catch (error) {
        if (!stopped) timer = setTimeout(poll, POLL_INTERVAL_MS * 2);
      }
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [paymentId, onDone]);

  // Modifier = abandonner cette tentative (côté serveur aussi), puis revenir au formulaire.
  const edit = async () => {
    setCancelling(true);
    try {
      await payments.cancel(paymentId);
    } catch (error) {
      // Sans incidence : la prochaine tentative remplacera de toute façon celle-ci côté serveur.
    }
    onEdit();
  };

  if (!payment) {
    return <div className="flex justify-center py-16"><Spinner label="Chargement du paiement" /></div>;
  }

  const { status } = payment;

  if (status === 'SUCCEEDED') {
    return (
      <div className="animate-fade-up text-center" role="status">
        <Outcome success />
        <h2 className="mt-6 text-2xl font-bold tracking-[-0.02em] text-ink">Paiement réussi</h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          {payment.periodEnd ? `Votre abonnement est actif jusqu’au ${formatLongDate(payment.periodEnd)}.` : 'Votre abonnement est actif.'}
        </p>
        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-sm text-ink-soft">
          <span className="tabular font-semibold text-ink">{formatAmount(payment.amount)}</span> · <OperatorName method={payment} />
        </p>
        <div className="mt-8 grid gap-2">
          {returnUrl ? <Button as="a" href={returnUrl} size="lg">Retourner dans l’application</Button> : null}
          <Button to={next || '/sujets'} size="lg" variant={returnUrl ? 'secondary' : 'primary'}>
            {next ? 'Reprendre où j’en étais' : 'Explorer les sujets'}
          </Button>
        </div>
      </div>
    );
  }

  if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status)) {
    const titles = { FAILED: 'Paiement échoué', CANCELLED: 'Paiement annulé', EXPIRED: 'Paiement expiré' };
    return (
      <div className="animate-fade-up text-center" role="alert">
        <Outcome success={false} />
        <h2 className="mt-6 text-2xl font-bold tracking-[-0.02em] text-ink">{titles[status]}</h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">{payment.failureReason || 'Aucun montant n’a été débité.'}</p>
        <Button size="lg" className="mt-8 w-full" onClick={onEdit} icon={ArrowLeft}>Réessayer</Button>
        {returnUrl ? <Button as="a" href={returnUrl} size="lg" variant="ghost" className="mt-2 w-full">Retourner dans l’application</Button> : null}
      </div>
    );
  }

  const isRedirect = payment.flow === 'redirect';
  const steps = isRedirect
    ? [`Ouvrez la page ${payment.methodLabel}`, 'Scannez le QR code avec votre téléphone', 'Confirmez le paiement']
    : payment.confirmSteps;

  return (
    <div className="animate-fade-up">
      {/* Demande envoyée, rien n'est encore confirmé : pictogramme d'attente, jamais de coche verte. */}
      <div className="flex items-center gap-4">
        <span className="pulse-ring relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-wash text-gold">
          <Smartphone size={21} className="relative text-ink" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-[-0.02em] text-ink sm:text-xl">{isRedirect ? 'Finalisez le paiement' : 'Validez sur votre téléphone'}</h2>
          <p className="text-sm text-ink-soft">{`Demande envoyée à ${payment.methodLabel}. En attente de votre validation.`}</p>
        </div>
      </div>

      <div className="mt-6">
        <SummaryRows rows={[['Opérateur', <OperatorName method={payment} />], ['Numéro', payment.phone]]} amount={formatAmount(payment.amount)} />
      </div>

      <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Dernière étape</h3>
      <ol className="stagger mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 font-semibold text-ink">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      {isRedirect && payment.redirectUrl ? (
        <Button as="a" href={payment.redirectUrl} size="lg" className="mt-4 w-full" icon={ExternalLink}>{`Ouvrir la page ${payment.methodLabel}`}</Button>
      ) : null}

      <p className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-paper px-4 py-2.5 text-center text-sm text-ink-soft" role="status" aria-live="polite">
        <Loader2 size={15} className="animate-spin" aria-hidden />
        {status === 'PROCESSING' ? 'Confirmation en cours…' : 'En attente de votre confirmation…'}
        <span className="tabular font-mono text-xs text-ink-muted" aria-hidden>{formatElapsed(elapsed)}</span>
      </p>

      {!isRedirect && elapsed >= HELP_AFTER_SECONDS ? (
        <div className="mt-4 animate-fade-up rounded-xl border border-gold/30 bg-gold-wash/50 p-4 text-sm">
          <p className="font-semibold text-ink">Un problème ?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
            <li>{`Vérifiez que le ${payment.phone} est bien votre numéro ${payment.methodLabel}.`}</li>
            <li>Assurez-vous que votre solde couvre le montant.</li>
            <li>Si le code ne fonctionne pas, modifiez puis relancez le paiement.</li>
          </ul>
        </div>
      ) : null}

      {status !== 'PROCESSING' ? (
        <Button variant="ghost" size="sm" className="mt-4 w-full" loading={cancelling} onClick={edit} icon={ArrowLeft}>Modifier l’opérateur ou le numéro</Button>
      ) : null}
    </div>
  );
};

const SubscribePage = () => {
  const { user, loading: authLoading, exchangeHandoff } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const [handoffState, setHandoffState] = useState(params.get('handoff') ? 'pending' : 'none');
  const returnUrl = safeReturnUrl(params.get('return'));
  const next = safeNext(params.get('next'));

  const plans = useAsync(() => payments.plans(), []);
  const entitlements = useEntitlements();

  const [promoInput, setPromoInput] = useState(params.get('code') || '');
  const [promoApplied, setPromoApplied] = useState('');
  const [promoError, setPromoError] = useState(null);
  const [method, setMethod] = useState(null);
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Tentative en cours de vérification : valeurs figées au moment où l'abonné les a vérifiées.
  const [attempt, setAttempt] = useState(null);
  const [activePayment, setActivePayment] = useState(null);

  // Retour arrière depuis la page de l'opérateur (page restaurée par le navigateur) : la
  // tentative précédente est terminée pour cette page, on repart d'un formulaire propre.
  useEffect(() => {
    const onPageShow = (event) => {
      if (!event.persisted) return;
      setSubmitting(false);
      setAttempt(null);
      setActivePayment(null);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // Arrivée depuis l'application : connexion transparente par code à usage unique.
  useEffect(() => {
    const code = params.get('handoff');
    if (!code) return;
    const nextParams = new URLSearchParams(params);
    nextParams.delete('handoff');
    setParams(nextParams, { replace: true });
    exchangeHandoff(code).then((result) => setHandoffState(result.success ? 'done' : 'failed'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Retour depuis la page GeniusPay (success_url / error_url). Ce retour ne prouve rien :
  // l'issue réelle est toujours relue auprès du serveur, qui interroge GeniusPay.
  const returningPaymentId = params.get('payment');
  useEffect(() => {
    if (authLoading || !returningPaymentId || !/^[a-f0-9]{24}$/i.test(returningPaymentId)) return;
    if (returnUrl && !user) {
      // Venu de l'application mais plus connecté ici : on y retourne, elle relit l'état elle-même.
      window.location.replace(withParams(returnUrl, { payment: returningPaymentId }));
      return;
    }
    // On garde `return` : la confirmation proposera de revenir dans l'application.
    const nextParams = new URLSearchParams(params);
    ['payment', 'outcome'].forEach((key) => nextParams.delete(key));
    setParams(nextParams, { replace: true });
    setActivePayment({ id: returningPaymentId });
  }, [returningPaymentId, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const quote = useAsync(() => payments.quote(promoApplied), [promoApplied, user?._id || user?.id], { enabled: Boolean(user) });

  const applyPromo = async (event) => {
    event.preventDefault();
    setPromoError(null);
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    try {
      await payments.quote(code);
      setPromoApplied(code);
    } catch (error) {
      setPromoError(errorMessage(error, 'Code invalide.'));
    }
  };

  const methods = useMemo(() => plans.data?.methods || [], [plans.data]);
  const selectedMethod = methods.find((item) => item.id === method) || null;
  const needsPhone = selectedMethod ? selectedMethod.requiresPhone !== false : true;

  // Un moyen désactivé entre-temps n'est plus sélectionnable ; un moyen unique est présélectionné.
  useEffect(() => {
    if (!plans.data) return;
    if (method && !selectedMethod) setMethod(null);
    else if (!method && methods.length === 1) setMethod(methods[0].id);
  }, [method, plans.data, selectedMethod, methods]);

  // Étape 1 → 2 : contrôle du formulaire, puis récapitulatif à vérifier (rien n'est encore envoyé).
  const review = (event) => {
    event.preventDefault();
    setFormError(null);
    if (!selectedMethod) {
      setFormError('Choisissez un opérateur.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (needsPhone && !/^0\d{9}$/.test(digits)) {
      setFormError('Entrez un numéro à 10 chiffres, par exemple 07 01 02 03 04.');
      return;
    }
    // Nouvelle tentative : identifiant neuf et valeurs actuelles uniquement.
    setAttempt({
      id: newAttemptId(),
      method: selectedMethod,
      phone: needsPhone ? digits : null,
      amount: quote.data.amount,
      promoCode: promoApplied || undefined,
    });
  };

  // Retour au formulaire : la tentative vérifiée est abandonnée, la suivante sera neuve.
  const backToForm = () => {
    setAttempt(null);
    setActivePayment(null);
    setFormError(null);
    setSubmitting(false);
  };

  // Étape 2 → 3 : initiation avec EXACTEMENT les valeurs vérifiées.
  const confirm = async () => {
    if (!attempt || submitting) return;
    setFormError(null);
    setSubmitting(true);
    let redirecting = false;
    try {
      const result = await payments.initiate({
        method: attempt.method.id,
        phone: attempt.phone || undefined,
        promoCode: attempt.promoCode,
        // Ouvert depuis l'application : le retour de Wave ramène ici avec le lien vers l'app.
        channel: returnUrl ? 'mobile' : 'web',
        returnUrl: returnUrl || undefined,
        attemptId: attempt.id,
      });
      if (result.redirectUrl) {
        // Page de paiement sécurisée de l'opérateur ; le bouton reste bloqué jusqu'au départ.
        redirecting = true;
        window.location.assign(result.redirectUrl);
        return;
      }
      setAttempt(null);
      setActivePayment({ id: result.payment.id });
    } catch (error) {
      const processingId = error.response?.data?.details?.paymentId;
      if (errorCode(error) === 'PAYMENT_PROCESSING' && processingId) {
        // Un paiement est déjà en cours de validation chez l'opérateur : on le suit plutôt
        // que d'en lancer un second (risque de double débit).
        setAttempt(null);
        setActivePayment({ id: processingId });
      } else if (!error.response) {
        setFormError('Connexion impossible. Vérifiez votre réseau puis réessayez.');
      } else {
        setFormError(errorMessage(error));
      }
    } finally {
      if (!redirecting) setSubmitting(false);
    }
  };

  const handleDone = React.useCallback(() => entitlements.reload(), [entitlements.reload]); // eslint-disable-line react-hooks/exhaustive-deps

  // Changement d'étape : sur mobile, le panneau de paiement revient en vue s'il est hors de l'écran.
  const panelRef = useRef(null);
  const stepIndex = activePayment ? 2 : attempt ? 1 : 0;
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const top = panelRef.current?.getBoundingClientRect().top;
    if (top !== undefined && (top < 64 || top > window.innerHeight * 0.6)) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [stepIndex]);

  if (authLoading || handoffState === 'pending') {
    return <Container className="flex justify-center py-24"><Spinner /></Container>;
  }

  const plan = plans.data;
  const current = entitlements.data?.subscription;
  const sandbox = plan?.sandbox;
  const simulated = plan?.simulated;

  return (
    <Container className="grid grid-cols-1 items-start gap-8 py-8 md:py-14 lg:grid-cols-[1fr_460px] lg:gap-x-16 lg:gap-y-8">
      {/* Offre */}
      <section className="animate-rise-in lg:pt-4">
        <Eyebrow>Abonnement Fatafalta</Eyebrow>
        <h1 className="mt-3 text-title-lg font-extrabold text-ink lg:text-display">Préparez vos concours avec tous les sujets.</h1>
        {plan ? (
          <div className="mt-6 animate-fade-in md:mt-8">
            <p className="tabular text-[clamp(2.5rem,2rem+2.4vw,3.25rem)] font-extrabold leading-none tracking-[-0.04em] text-ink">{formatAmount(plan.initial.amount)}</p>
            <p className="mt-3 text-ink-soft">{`${plan.initial.months} mois d’accès, puis ${formatAmount(plan.monthly.amount)} par mois jusqu’au renouvellement annuel.`}</p>
            <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-gold-wash px-3 py-2 text-sm font-medium text-gold-ink">
              <Tag size={14} className="mt-[3px] shrink-0" aria-hidden />{`${formatAmount(plan.promo.discountedInitialAmount)} avec un code promotionnel, pour un premier abonnement.`}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3 md:mt-8">
            <Skeleton className="h-12 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        )}
        {handoffState === 'failed' ? (
          <ErrorNote className="mt-6">Le lien depuis l’application a expiré. Connectez-vous pour continuer.</ErrorNote>
        ) : null}
      </section>

      {/* Mobile : avantages sous le paiement (le formulaire arrive plus tôt) ; ordinateur : sous l'offre. */}
      <div className="order-last animate-rise-in border-t border-line pt-8 [animation-delay:120ms] lg:order-none lg:col-start-1 lg:row-start-2">
        <Benefits downloadsPerDay={plan?.downloadsPerDay} />
      </div>

      {/* Paiement */}
      <section ref={panelRef} className="scroll-mt-20 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <Card className="animate-rise-in p-5 shadow-lift [animation-delay:80ms] sm:p-8">
          {user ? <Stepper current={stepIndex} /> : null}
          {!user ? (
            <div className="text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-wash"><Lock size={22} className="text-ink" aria-hidden /></span>
              <h2 className="text-xl font-bold text-ink">Créez votre compte pour vous abonner</h2>
              <p className="mt-2 text-sm text-ink-soft">Votre abonnement est lié à votre compte, sur le site comme sur l’application.</p>
              <div className="mt-6 grid gap-2">
                <Button to={`/register?next=${encodeURIComponent('/abonnement')}`} size="lg">Créer un compte</Button>
                <Button to={`/login?next=${encodeURIComponent('/abonnement')}`} size="lg" variant="secondary">Se connecter</Button>
              </div>
            </div>
          ) : activePayment ? (
            <PaymentProgress
              key={activePayment.id}
              paymentId={activePayment.id}
              onDone={handleDone}
              onEdit={backToForm}
              returnUrl={returnUrl}
              next={next}
            />
          ) : attempt ? (
            <div className="animate-fade-up">
              <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">Vérifiez vos informations</h2>
              <p className="mt-1 text-sm text-ink-soft">Le paiement sera envoyé à cet opérateur et à ce numéro.</p>
              <div className="mt-5">
                <SummaryRows rows={[['Opérateur', <OperatorName method={attempt.method} />], ['Numéro', attempt.phone ? formatPhone(attempt.phone) : null], ['Code promotionnel', attempt.promoCode]]} amount={formatAmount(attempt.amount)} />
              </div>
              <ErrorNote className="mt-4">{formError}</ErrorNote>
              <Button size="lg" className="mt-6 w-full" loading={submitting} onClick={confirm} icon={ArrowRight}>
                {submitting ? 'Paiement en cours…' : `Confirmer et payer ${formatAmount(attempt.amount)}`}
              </Button>
              <Button variant="ghost" size="sm" className="mt-2 w-full" disabled={submitting} onClick={backToForm} icon={ArrowLeft}>Modifier</Button>
              <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs text-ink-muted">
                <ShieldCheck size={14} className="mt-px shrink-0" aria-hidden />
                {attempt.method.flow === 'redirect' && !simulated
                  ? `Vous serez redirigé vers la page sécurisée ${attempt.method.label}.`
                  : 'Vous confirmerez ensuite le paiement sur votre téléphone. Aucun débit sans votre validation.'}
              </p>
            </div>
          ) : (
            <form onSubmit={review} noValidate>
              {returnUrl ? (
                <p className="mb-6 rounded-xl bg-paper-dim p-4 text-sm text-ink-soft">
                  {'Paiement pour votre compte '}<span className="font-semibold text-ink">{user.name}</span>{user.email ? ` (${user.email})` : ''}
                  {'. Votre accès sera aussi actif dans l’application.'}
                </p>
              ) : null}
              {current?.status === 'ACTIVE' ? (
                <p className="mb-6 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden />
                  <span>{`Votre abonnement est actif jusqu’au ${formatLongDate(current.currentPeriodEnd)}. Ce paiement prolongera votre accès.`}</span>
                </p>
              ) : null}

              <h2 className="text-lg font-bold text-ink">Récapitulatif</h2>
              <div className="mt-3 rounded-2xl border border-line bg-paper/60 px-4 pb-4">
                {quote.data ? (
                  <div className="animate-fade-in">
                    <InfoRow label={quote.data.kind === 'initial' ? `Abonnement · ${plan?.initial.months || 4} mois` : 'Mensualité · 1 mois'} value={formatAmount(quote.data.baseAmount)} />
                    {quote.data.discount ? <InfoRow label={`Code ${quote.data.promoCode}`} value={`− ${formatAmount(quote.data.discount)}`} /> : null}
                    <div className="flex items-baseline justify-between pt-4">
                      <span className="font-semibold text-ink">Total</span>
                      <span key={quote.data.amount} className="tabular animate-pop-in text-2xl font-extrabold tracking-[-0.03em] text-ink">{formatAmount(quote.data.amount)}</span>
                    </div>
                  </div>
                ) : quote.error ? (
                  <div className="flex items-center justify-between gap-3 pt-4">
                    <p className="text-sm text-rose-600">{errorMessage(quote.error)}</p>
                    <Button type="button" variant="secondary" size="sm" onClick={quote.reload}>Réessayer</Button>
                  </div>
                ) : <div className="space-y-3 pt-4"><Skeleton className="h-4 w-full" /><Skeleton className="ml-auto h-7 w-1/2" /></div>}
              </div>

              {quote.data?.kind === 'initial' ? (
                <div className="mt-6">
                  {promoApplied ? (
                    <div className="flex animate-scale-in items-center justify-between rounded-xl border border-gold/30 bg-gold-wash px-4 py-1.5 text-sm">
                      <span className="inline-flex items-center gap-2 font-semibold text-gold-ink"><Tag size={15} /> {promoApplied} <span className="font-normal">appliqué</span></span>
                      <button type="button" className="-mr-2 rounded-lg px-2 py-2.5 font-medium text-ink-soft transition-colors hover:text-ink" onClick={() => { setPromoApplied(''); setPromoInput(''); }}>Retirer</button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Field
                        className="flex-1"
                        placeholder="Code promotionnel"
                        aria-label="Code promotionnel"
                        value={promoInput}
                        onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                        error={promoError}
                        autoCapitalize="characters"
                      />
                      <Button type="button" variant="secondary" className="h-12" onClick={applyPromo}>Appliquer</Button>
                    </div>
                  )}
                </div>
              ) : null}

              <h2 className="mt-8 text-lg font-bold text-ink">Choisir un opérateur</h2>
              {plan && !methods.length ? (
                <p className="mt-3 rounded-xl bg-paper-dim p-4 text-sm text-ink-soft" role="status">Aucun moyen de paiement n’est disponible pour le moment. Réessayez un peu plus tard.</p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Moyen de paiement">
                  {!plan ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-xl" />) : null}
                  {methods.map((item) => {
                    const checked = method === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => setMethod(item.id)}
                        className={cx(
                          'relative flex h-14 min-w-0 items-center gap-2.5 rounded-xl border bg-white px-3 text-left text-sm font-semibold text-ink',
                          'transition-[border-color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:opacity-60',
                          checked ? 'border-ink shadow-[0_0_0_1px_theme(colors.ink.DEFAULT)]' : 'border-line hover:border-line-strong',
                        )}
                      >
                        <PaymentMethodLogo method={item} size="lg" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200', checked ? 'border-ink bg-ink text-white' : 'border-line-strong')} aria-hidden>
                          {checked ? <Check size={12} strokeWidth={3} className="animate-pop-in" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {needsPhone ? (
                <Field
                  className="mt-5"
                  label={selectedMethod ? `Numéro ${selectedMethod.label}` : 'Numéro Mobile Money'}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="07 01 02 03 04"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  hint={simulated ? 'Démo : un numéro finissant par 00 simule un refus, 11 une annulation.' : undefined}
                />
              ) : null}

              {sandbox && !simulated ? (
                <p className="mt-4 rounded-xl bg-gold-wash px-4 py-3 text-xs font-medium text-gold-ink">Mode test GeniusPay : aucune somme réelle ne sera débitée.</p>
              ) : null}

              <ErrorNote className="mt-4">{formError}</ErrorNote>

              <Button type="submit" size="lg" className="mt-6 w-full" disabled={!quote.data || !methods.length} icon={ArrowRight} iconPosition="end">Continuer</Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
                <ShieldCheck size={14} className="shrink-0" aria-hidden /> Aucun débit sans votre validation.
              </p>
            </form>
          )}
        </Card>
        {user && !activePayment && !attempt ? (
          <p className="mt-4 text-center text-sm text-ink-soft">
            <Link to="/compte/abonnement" className="inline-block py-2 font-medium text-burgundy hover:underline">Voir mon abonnement</Link>
          </p>
        ) : null}
      </section>
    </Container>
  );
};

export default SubscribePage;
