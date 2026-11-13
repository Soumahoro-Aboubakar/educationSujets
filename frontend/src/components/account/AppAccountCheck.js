import React, { useContext } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Info, TriangleAlert } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { Button } from '../ui';

/**
 * Arrivée depuis l'application (« Voir mon abonnement ») : vérifie, avant tout paiement, que le
 * site est connecté au MÊME compte que l'application. L'application joint au lien une empreinte
 * non réversible du compte (`compte`) ; le site la compare à celle du compte connecté.
 *  - autre compte : avertissement + « Changer de compte » (le paiement serait rattaché à ce compte) ;
 *  - lien expiré (`lien=expire`) sans empreinte vérifiable : rappel d'utiliser le même compte.
 */
const AppAccountCheck = ({ className = '' }) => {
  const { user, logout } = useContext(AuthContext);
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fromApp = params.get('source') === 'app';
  const hint = params.get('compte');
  const expired = params.get('lien') === 'expire';
  if (!fromApp || !user) return null;

  const mismatch = Boolean(hint && user.accountHint && hint !== user.accountHint);
  const unverified = expired && !(hint && user.accountHint && hint === user.accountHint);
  if (!mismatch && !unverified) return null;

  const switchAccount = () => {
    const next = `${location.pathname}${location.search}`;
    logout();
    navigate(`/login?${new URLSearchParams({ next, raison: 'autre-compte' }).toString()}`, { replace: true });
  };

  if (mismatch) {
    return (
      <div role="alert" className={`flex flex-col gap-4 rounded-2xl border border-burgundy/25 bg-burgundy-wash p-5 sm:flex-row sm:items-center sm:justify-between ${className}`}>
        <div className="flex gap-3">
          <TriangleAlert size={20} className="mt-0.5 shrink-0 text-burgundy" aria-hidden />
          <div>
            <p className="font-semibold text-burgundy">Ce n’est pas le compte de ton application</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {`Le site est connecté au compte ${user.email}. Un abonnement pris maintenant serait rattaché à ce compte, pas à celui que tu utilises dans l’application.`}
            </p>
          </div>
        </div>
        <Button variant="danger" onClick={switchAccount} className="shrink-0">Changer de compte</Button>
      </div>
    );
  }

  return (
    <div role="status" className={`flex gap-3 rounded-2xl border border-gold/30 bg-gold-wash p-5 ${className}`}>
      <Info size={20} className="mt-0.5 shrink-0 text-gold-ink" aria-hidden />
      <div>
        <p className="font-semibold text-ink">Le lien depuis l’application a expiré</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          {`Vérifie que ${user.email} est bien le compte que tu utilises dans l’application : ton abonnement y sera rattaché.`}
        </p>
        <button type="button" onClick={switchAccount} className="mt-2 text-sm font-semibold text-burgundy underline-offset-4 hover:underline">Changer de compte</button>
      </div>
    </div>
  );
};

export default AppAccountCheck;
