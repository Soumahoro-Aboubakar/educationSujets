import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, ExternalLink, Loader2, Tag, XCircle } from 'lucide-react';
import { Button, Card, Container, Field, InfoRow, Spinner, cx } from '../components/ui';
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
      <li key={item} className="flex items-center gap-3"><Check size={16} strokeWidth={2.5} className="shrink-0 text-gold-ink" />{item}</li>
    ))}
  </ul>
);

/** Identifiant unique d'une tentative : rejouer la même tentative ne crée jamais une seconde transaction. */
const newAttemptId = () => (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9_-]/g, '');

const formatPhone = (value) => value.replace(/\D/g, '').replace(/(\d{2})(?=\d)/g, '$1 ');

const SummaryRows = ({ rows }) => (
  <dl className="divide-y divide-line rounded-xl border border-line">
    {rows.filter(([, value]) => value).map(([label, value]) => (
      <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
        <dt className="text-ink-soft">{label}</dt>
        <dd className="font-semibold text-ink">{value}</dd>
      </div>
    ))}
  </dl>
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
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  const { status } = payment;

  if (status === 'SUCCEEDED') {
    return (
      <div className="animate-fade-up text-center">
        <CheckCircle2 size={56} strokeWidth={1.5} className="mx-auto text-emerald-500" />
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-ink">Paiement réussi</h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          {payment.periodEnd ? `Votre abonnement est actif jusqu’au ${formatLongDate(payment.periodEnd)}.` : 'Votre abonnement est actif.'}
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
      <div className="animate-fade-up text-center">
        <XCircle size={56} strokeWidth={1.5} className="mx-auto text-rose-500" />
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-ink">{titles[status]}</h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">{payment.failureReason || 'Aucun montant n’a été débité.'}</p>
        <Button size="lg" className="mt-8 w-full" onClick={onEdit}>Réessayer</Button>
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
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={20} strokeWidth={3} /></span>
        <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">Paiement initié</h2>
      </div>

      <div className="mt-5">
        <SummaryRows rows={[['Opérateur', <OperatorName method={payment} />], ['Numéro', payment.phone], ['Montant', formatAmount(payment.amount)]]} />
      </div>

      <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-gold-ink">Dernière étape</h3>
      <ol className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step} className="flex items-center gap-3 rounded-xl bg-paper-dim px-4 py-3 font-semibold text-ink">
            <span aria-hidden>👉</span>{step}
          </li>
        ))}
      </ol>
      {isRedirect && payment.redirectUrl ? (
        <Button as="a" href={payment.redirectUrl} size="lg" className="mt-4 w-full" icon={ExternalLink}>{`Ouvrir la page ${payment.methodLabel}`}</Button>
      ) : null}

      <p className="mt-5 flex items-center justify-center gap-2 text-sm text-ink-soft" role="status">
        <Loader2 size={15} className="animate-spin" />
        {status === 'PROCESSING' ? 'Confirmation en cours…' : 'En attente de votre confirmation…'}
        <span className="font-mono text-xs text-ink-muted">{formatElapsed(elapsed)}</span>
      </p>

      {!isRedirect && elapsed >= HELP_AFTER_SECONDS ? (
        <div className="mt-4 rounded-xl border border-line p-4 text-sm">
          <p className="font-semibold text-ink">Un problème ?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
            <li>{`Vérifiez que le ${payment.phone} est bien votre numéro ${payment.methodLabel}.`}</li>
            <li>Assurez-vous que votre solde couvre le montant.</li>
            <li>Si le code ne fonctionne pas, modifiez puis relancez le paiement.</li>
          </ul>
        </div>
      ) : null}

      {status !== 'PROCESSING' ? (
        <Button variant="ghost" size="sm" className="mt-5 w-full" loading={cancelling} onClick={edit}>Modifier l’opérateur ou le numéro</Button>
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

  if (authLoading || handoffState === 'pending') {
    return <Container className="flex justify-center py-24"><Spinner /></Container>;
  }

  const plan = plans.data;
  const current = entitlements.data?.subscription;
  const sandbox = plan?.sandbox;
  const simulated = plan?.simulated;

  return (
    <Container className="grid gap-10 py-10 md:py-14 lg:grid-cols-[1fr_440px] lg:gap-16">
      {/* Offre */}
      <section className="animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-ink">Abonnement Fatafalta</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.035em] text-ink md:text-5xl">Préparez vos concours avec tous les sujets.</h1>
        {plan ? (
          <div className="mt-8">
            <p className="text-5xl font-extrabold tracking-[-0.04em] text-ink">{formatAmount(plan.initial.amount)}</p>
            <p className="mt-2 text-ink-soft">{`${plan.initial.months} mois d’accès, puis ${formatAmount(plan.monthly.amount)} par mois jusqu’au renouvellement annuel.`}</p>
            <p className="mt-1 text-sm font-medium text-gold-ink">{`${formatAmount(plan.promo.discountedInitialAmount)} avec un code promotionnel, pour un premier abonnement.`}</p>
          </div>
        ) : <div className="mt-8 h-24 w-64 animate-pulse rounded-xl bg-paper-dim" />}
        <div className="mt-8"><Benefits downloadsPerDay={plan?.downloadsPerDay} /></div>
        {handoffState === 'failed' ? (
          <p className="mt-8 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Le lien depuis l’application a expiré. Connectez-vous pour continuer.</p>
        ) : null}
      </section>

      {/* Paiement */}
      <section>
        <Card className="p-6 shadow-soft md:p-8">
          {!user ? (
            <div className="text-center">
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
                <SummaryRows rows={[['Opérateur', <OperatorName method={attempt.method} />], ['Numéro', attempt.phone ? formatPhone(attempt.phone) : null], ['Montant', formatAmount(attempt.amount)]]} />
              </div>
              {formError ? <p className="mt-4 text-sm text-rose-600" role="alert">{formError}</p> : null}
              <Button size="lg" className="mt-6 w-full" loading={submitting} onClick={confirm} icon={ArrowRight}>
                {submitting ? 'Paiement en cours…' : `Confirmer et payer ${formatAmount(attempt.amount)}`}
              </Button>
              <Button variant="ghost" size="sm" className="mt-2 w-full" disabled={submitting} onClick={backToForm}>Modifier</Button>
              <p className="mt-3 text-center text-xs text-ink-muted">
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
                <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  {`Votre abonnement est actif jusqu’au ${formatLongDate(current.currentPeriodEnd)}. Ce paiement prolongera votre accès.`}
                </p>
              ) : null}

              <h2 className="text-lg font-bold text-ink">Récapitulatif</h2>
              <div className="mt-3">
                {quote.data ? (
                  <>
                    <InfoRow label={quote.data.kind === 'initial' ? `Abonnement · ${plan?.initial.months || 4} mois` : 'Mensualité · 1 mois'} value={formatAmount(quote.data.baseAmount)} />
                    {quote.data.discount ? <InfoRow label={`Code ${quote.data.promoCode}`} value={`− ${formatAmount(quote.data.discount)}`} /> : null}
                    <div className="flex items-baseline justify-between pt-4">
                      <span className="font-semibold text-ink">Total</span>
                      <span className="text-2xl font-extrabold tracking-[-0.03em] text-ink">{formatAmount(quote.data.amount)}</span>
                    </div>
                  </>
                ) : quote.error ? (
                  <p className="text-sm text-rose-600">{errorMessage(quote.error)}</p>
                ) : <div className="h-24 animate-pulse rounded-xl bg-paper-dim" />}
              </div>

              {quote.data?.kind === 'initial' ? (
                <div className="mt-6">
                  {promoApplied ? (
                    <div className="flex items-center justify-between rounded-xl bg-gold-wash px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-2 font-semibold text-gold-ink"><Tag size={15} /> {promoApplied}</span>
                      <button type="button" className="text-ink-soft hover:text-ink" onClick={() => { setPromoApplied(''); setPromoInput(''); }}>Retirer</button>
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
                <p className="mt-3 rounded-xl bg-paper-dim p-4 text-sm text-ink-soft">Aucun moyen de paiement n’est disponible pour le moment. Réessayez un peu plus tard.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Moyen de paiement">
                  {methods.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={method === item.id}
                      onClick={() => setMethod(item.id)}
                      className={cx('flex h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold transition-colors disabled:opacity-60', method === item.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-line-strong')}
                    >
                      <PaymentMethodLogo method={item} inverted={method === item.id} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {needsPhone ? (
                <Field
                  className="mt-4"
                  label="Numéro Mobile Money"
                  type="tel"
                  inputMode="tel"
                  placeholder="07 01 02 03 04"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  hint={simulated ? 'Démo : un numéro finissant par 00 simule un refus, 11 une annulation.' : undefined}
                />
              ) : null}

              {sandbox && !simulated ? (
                <p className="mt-4 rounded-xl bg-gold-wash px-4 py-3 text-xs font-medium text-gold-ink">Mode test GeniusPay : aucune somme réelle ne sera débitée.</p>
              ) : null}

              {formError ? <p className="mt-4 text-sm text-rose-600" role="alert">{formError}</p> : null}

              <Button type="submit" size="lg" className="mt-6 w-full" disabled={!quote.data || !methods.length} icon={ArrowRight}>Continuer</Button>
            </form>
          )}
        </Card>
        {user && !activePayment && !attempt ? (
          <p className="mt-4 text-center text-sm text-ink-soft">
            <Link to="/compte/abonnement" className="font-medium text-burgundy hover:underline">Voir mon abonnement</Link>
          </p>
        ) : null}
      </section>
    </Container>
  );
};

export default SubscribePage;
