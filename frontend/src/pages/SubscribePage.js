import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Loader2, Smartphone, Tag, XCircle } from 'lucide-react';
import { Button, Card, Container, Field, InfoRow, Spinner, cx } from '../components/ui';
import AuthContext from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import useEntitlements from '../hooks/useEntitlements';
import { errorCode, errorMessage, payments } from '../lib/api';
import { formatAmount, formatLongDate } from '../lib/format';
import { safeNext } from '../lib/redirect';

const POLL_INTERVAL_MS = 2500;
const OPEN_STATUSES = ['INITIATED', 'PENDING'];

// Retour vers l'application mobile : seuls ses schémas sont acceptés (pas de redirection ouverte).
const safeReturnUrl = (value) => (value && /^(fatafalta|exp|exps):\/\//i.test(value) ? value : null);

const Benefits = ({ downloadsPerDay }) => (
  <ul className="space-y-3 text-[15px] text-ink">
    {['Tous les sujets et leurs corrigés', `Jusqu’à ${downloadsPerDay || 15} téléchargements par jour`, 'Accès identique sur le site et l’application'].map((item) => (
      <li key={item} className="flex items-center gap-3"><Check size={16} strokeWidth={2.5} className="shrink-0 text-gold-ink" />{item}</li>
    ))}
  </ul>
);

/** Suivi d'un paiement Mobile Money : attente de validation sur le téléphone, puis issue. */
const PaymentProgress = ({ paymentId, instructions, onDone, onRetry, returnUrl, next }) => {
  const [payment, setPayment] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const doneRef = useRef(false);

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

  const cancel = async () => {
    setCancelling(true);
    try {
      setPayment(await payments.cancel(paymentId));
    } finally {
      setCancelling(false);
    }
  };

  const status = payment?.status || 'PENDING';

  if (status === 'SUCCEEDED') {
    return (
      <div className="animate-fade-up text-center">
        <CheckCircle2 size={56} strokeWidth={1.5} className="mx-auto text-emerald-500" />
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-ink">Abonnement activé</h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          {payment.periodEnd ? `Votre accès est ouvert jusqu’au ${formatLongDate(payment.periodEnd)}.` : 'Votre accès est ouvert.'}
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
    const titles = { FAILED: 'Paiement refusé', CANCELLED: 'Paiement annulé', EXPIRED: 'Délai dépassé' };
    return (
      <div className="animate-fade-up text-center">
        <XCircle size={56} strokeWidth={1.5} className="mx-auto text-rose-500" />
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-ink">{titles[status]}</h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          {payment?.failureReason || 'Aucun montant n’a été débité.'}
        </p>
        <Button size="lg" className="mt-8 w-full" onClick={onRetry}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-gold-wash" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gold-wash"><Smartphone size={26} className="text-ink" /></span>
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-[-0.02em] text-ink">Confirmez sur votre téléphone</h2>
      <p className="mx-auto mt-2 max-w-sm text-ink-soft">{instructions || 'Une demande de paiement a été envoyée à votre numéro.'}</p>
      {payment ? (
        <Card className="mx-auto mt-6 max-w-sm px-5 text-left">
          <InfoRow label="Montant" value={formatAmount(payment.amount)} />
          <InfoRow label="Moyen" value={payment.methodLabel} />
        </Card>
      ) : null}
      <p className="mt-6 inline-flex items-center gap-2 text-sm text-ink-muted"><Loader2 size={15} className="animate-spin" /> En attente de confirmation…</p>
      <div>
        <Button variant="ghost" size="sm" className="mt-4" loading={cancelling} onClick={cancel}>Annuler le paiement</Button>
      </div>
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
  const [activePayment, setActivePayment] = useState(null);

  // Arrivée depuis l'application : connexion transparente par code à usage unique.
  useEffect(() => {
    const code = params.get('handoff');
    if (!code) return;
    const nextParams = new URLSearchParams(params);
    nextParams.delete('handoff');
    setParams(nextParams, { replace: true });
    exchangeHandoff(code).then((result) => setHandoffState(result.success ? 'done' : 'failed'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const pay = async (event) => {
    event.preventDefault();
    setFormError(null);
    if (!method) {
      setFormError('Choisissez un moyen de paiement.');
      return;
    }
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, ''))) {
      setFormError('Entrez un numéro à 10 chiffres, par exemple 07 01 02 03 04.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await payments.initiate({
        method,
        phone: phone.replace(/\s/g, ''),
        promoCode: promoApplied || undefined,
        channel: returnUrl ? 'mobile' : 'web',
      });
      setActivePayment({ id: result.payment.id, instructions: result.instructions });
    } catch (error) {
      const paymentId = error.response?.data?.details?.paymentId;
      if (errorCode(error) === 'PAYMENT_IN_PROGRESS' && paymentId) {
        setActivePayment({ id: paymentId, instructions: 'Un paiement est déjà en cours pour votre compte.' });
      } else {
        setFormError(errorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = React.useCallback(() => entitlements.reload(), [entitlements.reload]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || handoffState === 'pending') {
    return <Container className="flex justify-center py-24"><Spinner /></Container>;
  }

  const plan = plans.data;
  const current = entitlements.data?.subscription;
  const sandbox = plan?.sandbox;

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
              paymentId={activePayment.id}
              instructions={activePayment.instructions}
              onDone={handleDone}
              onRetry={() => setActivePayment(null)}
              returnUrl={returnUrl}
              next={next}
            />
          ) : (
            <form onSubmit={pay} noValidate>
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

              <h2 className="mt-8 text-lg font-bold text-ink">Moyen de paiement</h2>
              <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Moyen de paiement">
                {(plan?.methods || []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={method === item.id}
                    onClick={() => setMethod(item.id)}
                    className={cx('h-12 rounded-xl border px-3 text-sm font-semibold transition-colors', method === item.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-line-strong')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <Field
                className="mt-4"
                label="Numéro Mobile Money"
                type="tel"
                inputMode="tel"
                placeholder="07 01 02 03 04"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                hint={sandbox ? 'Démo : un numéro finissant par 00 simule un refus, 11 une annulation.' : undefined}
              />

              {formError ? <p className="mt-4 text-sm text-rose-600" role="alert">{formError}</p> : null}

              <Button type="submit" size="lg" className="mt-6 w-full" loading={submitting} disabled={!quote.data} icon={ArrowRight}>
                {quote.data ? `Payer ${formatAmount(quote.data.amount)}` : 'Payer'}
              </Button>
              <p className="mt-3 text-center text-xs text-ink-muted">
                Vous confirmerez le paiement sur votre téléphone. Aucun débit sans votre validation.
              </p>
            </form>
          )}
        </Card>
        {user && !activePayment ? (
          <p className="mt-4 text-center text-sm text-ink-soft">
            <Link to="/compte/abonnement" className="font-medium text-burgundy hover:underline">Voir mon abonnement</Link>
          </p>
        ) : null}
      </section>
    </Container>
  );
};

export default SubscribePage;
