import React, { useContext } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { CreditCard, Download, Gift, LayoutDashboard, UserRound, Wallet } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { Container, Spinner, cx } from '../../components/ui';

const LINKS = [
  { to: '/compte', label: 'Aperçu', icon: LayoutDashboard, end: true },
  { to: '/compte/abonnement', label: 'Abonnement', icon: CreditCard },
  { to: '/compte/telechargements', label: 'Téléchargements', icon: Download },
  { to: '/compte/code-promo', label: 'Code promo', icon: Gift },
  { to: '/compte/portefeuille', label: 'Portefeuille', icon: Wallet },
  { to: '/compte/profil', label: 'Profil', icon: UserRound },
];

/** Espace personnel : navigation latérale sur ordinateur, onglets défilants sur mobile. */
const AccountLayout = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) return <Container className="flex justify-center py-24"><Spinner /></Container>;
  // Page protégée : connexion, puis retour exact à la page demandée (chemin et paramètres).
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />;

  return (
    <Container className="py-8 md:py-12">
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <aside>
          <p className="hidden truncate text-sm font-semibold text-ink lg:block">{user.name}</p>
          <p className="mb-6 hidden truncate text-sm text-ink-muted lg:block">{user.email}</p>
          <nav aria-label="Mon compte" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cx(
                  'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
                )}
              >
                <Icon size={16} /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div key={location.pathname} className="mt-6 min-w-0 animate-fade-up lg:mt-0">
          <Outlet />
        </div>
      </div>
    </Container>
  );
};

export const PageTitle = ({ title, description, action }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink md:text-3xl">{title}</h1>
      {description ? <p className="mt-1 text-ink-soft">{description}</p> : null}
    </div>
    {action}
  </div>
);

export default AccountLayout;
