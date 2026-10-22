import React from 'react';
import { Check, Clock, Lock, ShieldOff } from 'lucide-react';
import { Button, Modal } from '../ui';
import useAsync from '../../hooks/useAsync';
import { payments } from '../../lib/api';
import { formatAmount, formatRenewal } from '../../lib/format';

const Header = ({ icon: Icon, title, description }) => (
  <div className="mb-6 text-center">
    <div className="mx-auto mb-4 flex h-16 w-16 animate-pop-in items-center justify-center rounded-2xl bg-gold-wash ring-8 ring-gold-wash/40">
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
  const freeUntilYear = limitInfo?.freeUntilYear || entitlements?.downloads?.freeUntilYear || 2009;
  const freeQuotaUntilYear = limitInfo?.freeQuotaUntilYear || entitlements?.downloads?.freeQuotaUntilYear || 2020;
  // Quota gratuit à vie (sans abonnement) : épuisé, il ne se renouvelle pas.
  const lifetime = Boolean(limitInfo?.lifetime);
  const renewal = formatRenewal(limitInfo?.nextRenewalAt || limitInfo?.resetsAt);
  const windowHours = limitInfo?.windowHours || 24;
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
          title={isRenewal ? 'Votre abonnement a expiré' : 'Sujet réservé aux abonnés'}
          description={`Ce sujet est réservé aux utilisateurs disposant d’un abonnement valide. Sans abonnement, les sujets de ${freeUntilYear} et avant sont gratuits et illimités, et vous pouvez télécharger jusqu’à ${entitlements?.downloads?.limits?.free || 3} sujets de ${freeUntilYear + 1} à ${freeQuotaUntilYear}.`}
        />
        {plans.data ? (
          <div className="mb-5 text-center">
            <p className="tabular text-4xl font-extrabold tracking-[-0.04em] text-ink">
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
          {['Tous les sujets et leurs corrigés, y compris les plus récents', `Jusqu’à ${plans.data?.downloadPolicy?.recentLimits?.subscriber || plans.data?.downloadsPerDay || 20} sujets par période de ${plans.data?.downloadPolicy?.windowHours || 24} heures`, 'Paiement Mobile Money sécurisé'].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-wash"><Check size={13} className="text-gold-ink" strokeWidth={3} /></span>{item}
            </li>
          ))}
        </ul>
        <Button to={`/abonnement?next=${nextParam}`} size="lg" className="w-full">{isRenewal ? 'Renouveler mon abonnement' : 'Prendre mon abonnement'}</Button>
        <p className="mt-3 text-center text-xs text-ink-muted">Un code promotionnel peut être saisi à l’étape suivante.</p>
      </>
    ),
    DAILY_LIMIT_REACHED: (
      <>
        <Header
          icon={Clock}
          title={limitInfo?.sharedConnection ? 'Limite atteinte pour cette connexion' : lifetime ? 'Téléchargements gratuits utilisés' : 'Quota de sujets récents atteint'}
          description={limitInfo?.sharedConnection
            ? 'Plusieurs visiteurs partagent cette connexion et ont utilisé tous les téléchargements disponibles. Créez un compte gratuit pour disposer de votre propre quota.'
            : lifetime
              ? `Vous avez utilisé vos ${limitInfo?.limit || 3} téléchargements gratuits. Souscrivez à un abonnement pour continuer à télécharger des sujets.`
              : `Vous avez utilisé ${limitInfo?.limit ? `vos ${limitInfo.limit} téléchargements` : 'tous vos téléchargements'} de sujets récents sur les dernières ${windowHours} heures.`}
        />
        <ul className="mb-6 space-y-3 rounded-2xl border border-line bg-white p-4 text-[15px] text-ink">
          {lifetime && !limitInfo?.sharedConnection ? null : (
            <li className="flex items-start gap-3">
              <Clock size={16} className="mt-0.5 shrink-0 text-gold-ink" aria-hidden />
              {renewal ? `Prochain téléchargement possible à partir du ${renewal}.` : `Chaque téléchargement sort du décompte ${windowHours} heures après avoir été fait.`}
            </li>
          )}
          <li className="flex items-start gap-3">
            <Check size={16} className="mt-0.5 shrink-0 text-gold-ink" strokeWidth={3} aria-hidden />
            {`Les sujets de ${freeUntilYear} et avant restent gratuits et illimités, dès maintenant.`}
          </li>
        </ul>
        <div className="grid gap-2">
          {limitInfo?.canSubscribe ? <Button to={`/abonnement?next=${nextParam}`} size="lg">Prendre mon abonnement</Button> : null}
          {limitInfo?.sharedConnection ? <Button to={`/register?next=${nextParam}`} size="lg" variant="secondary">Créer un compte gratuit</Button> : null}
          {entitlements ? <Button to="/compte/telechargements" variant="secondary" size="lg">Voir mes téléchargements</Button> : null}
          <Button onClick={onClose} variant={limitInfo?.canSubscribe ? 'ghost' : 'primary'} size="lg">Compris</Button>
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
