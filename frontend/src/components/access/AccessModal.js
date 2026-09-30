import React from 'react';
import { Check, Clock, Lock, ShieldOff } from 'lucide-react';
import { Button, Modal } from '../ui';
import useAsync from '../../hooks/useAsync';
import { payments } from '../../lib/api';
import { formatAmount } from '../../lib/format';

const Header = ({ icon: Icon, title, description }) => (
  <div className="mb-6 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-wash">
      <Icon size={22} className="text-ink" strokeWidth={1.8} />
    </div>
    <h2 className="text-[22px] font-bold tracking-[-0.02em] text-ink">{title}</h2>
    {description ? <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">{description}</p> : null}
  </div>
);

/**
 * Explique un refus d'accès renvoyé par le serveur et propose l'étape suivante.
 * `reason` : AUTH_REQUIRED | SUBSCRIPTION_REQUIRED | DAILY_LIMIT_REACHED | ACCOUNT_DISABLED.
 */
const AccessModal = ({ reason, onClose, next, entitlements, limitInfo }) => {
  const plans = useAsync(() => payments.plans(), [], { enabled: reason === 'SUBSCRIPTION_REQUIRED' });
  const nextParam = encodeURIComponent(next || '/sujets');
  const isRenewal = entitlements?.subscription?.status === 'EXPIRED';

  const content = {
    AUTH_REQUIRED: (
      <>
        <Header icon={Lock} title="Document réservé aux membres" description="Connectez-vous ou créez votre compte. Nous vérifierons ensuite votre accès automatiquement." />
        <div className="grid gap-2">
          <Button to={`/register?next=${nextParam}`} size="lg">Créer un compte</Button>
          <Button to={`/login?next=${nextParam}`} variant="secondary" size="lg">J’ai déjà un compte</Button>
        </div>
      </>
    ),
    SUBSCRIPTION_REQUIRED: (
      <>
        <Header
          icon={Lock}
          title={isRenewal ? 'Votre abonnement a expiré' : 'Débloquez tous les sujets'}
          description="Votre compte n’a pas encore accès aux téléchargements."
        />
        {plans.data ? (
          <div className="mb-5 text-center">
            <p className="text-4xl font-extrabold tracking-[-0.04em] text-ink">
              {formatAmount(entitlements?.nextPayment?.amount ?? plans.data.initial.amount)}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {entitlements?.nextPayment?.kind === 'monthly'
                ? 'pour un mois d’accès'
                : `${plans.data.initial.months} mois d’accès, puis ${formatAmount(plans.data.monthly.amount)} par mois`}
            </p>
          </div>
        ) : null}
        <ul className="mb-6 space-y-3 rounded-2xl border border-line bg-white p-4 text-[15px] text-ink">
          {['Tous les sujets et leurs corrigés', `Jusqu’à ${plans.data?.downloadsPerDay || entitlements?.downloads?.limit || 15} téléchargements par jour`, 'Paiement Mobile Money sécurisé'].map((item) => (
            <li key={item} className="flex items-center gap-3"><Check size={16} className="shrink-0 text-gold-ink" strokeWidth={2.5} />{item}</li>
          ))}
        </ul>
        <Button to={`/abonnement?next=${nextParam}`} size="lg" className="w-full">{isRenewal ? 'Renouveler mon abonnement' : 'S’abonner'}</Button>
        <p className="mt-3 text-center text-xs text-ink-muted">Un code promotionnel peut être saisi à l’étape suivante.</p>
      </>
    ),
    DAILY_LIMIT_REACHED: (
      <>
        <Header
          icon={Clock}
          title="Limite du jour atteinte"
          description={`Vous avez utilisé vos ${limitInfo?.limit || entitlements?.downloads?.limit || ''} téléchargements d’aujourd’hui. Votre quota sera renouvelé à minuit.`}
        />
        <div className="grid gap-2">
          <Button to="/compte/telechargements" variant="secondary" size="lg">Voir mes téléchargements</Button>
          <Button onClick={onClose} size="lg">Compris</Button>
        </div>
      </>
    ),
    ACCOUNT_DISABLED: (
      <>
        <Header icon={ShieldOff} title="Compte désactivé" description="Votre compte ne permet plus de télécharger. Contactez le support Fatafalta." />
        <Button onClick={onClose} variant="secondary" size="lg" className="w-full">Fermer</Button>
      </>
    ),
  }[reason];

  return (
    <Modal open={Boolean(reason)} onClose={onClose} title="Accès au document">
      {content}
    </Modal>
  );
};

export default AccessModal;
