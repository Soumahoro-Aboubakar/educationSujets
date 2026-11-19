import React, { useContext, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { CreditCard, Download, Gift, LayoutDashboard, UserRound, Wallet } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { Container, Spinner, cx } from '../../components/ui';
import { SIDEBAR_SHORTCUT, SidebarTip, SidebarToggleIcon, sidebarToggleLabel, useSidebar } from '../../components/site/Sidebar';

const LINKS = [
  { to: '/compte', label: 'Aperçu', icon: LayoutDashboard, end: true },
  { to: '/compte/abonnement', label: 'Abonnement', icon: CreditCard },
  { to: '/compte/telechargements', label: 'Téléchargements', icon: Download },
  { to: '/compte/code-promo', label: 'Code promo', icon: Gift },
  { to: '/compte/portefeuille', label: 'Portefeuille', icon: Wallet },
  { to: '/compte/profil', label: 'Profil', icon: UserRound },
];

/** Espace personnel : navigation latérale (repliable, ⌘B) sur ordinateur, onglets défilants sur mobile. */
const AccountLayout = () => {
  const { user, loading, exchangeHandoff } = useContext(AuthContext);
  const { collapsed, toggle } = useSidebar();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  // Arrivée depuis l'application (« Voir mon abonnement ») : connexion transparente par code à
  // usage unique, retiré aussitôt de l'adresse. Le jeton de session n'apparaît jamais dans l'URL.
  const [handoff, setHandoff] = useState(params.get('handoff') ? 'pending' : 'none');
  useEffect(() => {
    const code = params.get('handoff');
    if (!code) return;
    const next = new URLSearchParams(params);
    next.delete('handoff');
    setParams(next, { replace: true });
    exchangeHandoff(code).then((result) => {
      // Lien expiré ou déjà utilisé : on le signale (connexion, puis vérification du compte).
      if (!result.success) { next.set('lien', 'expire'); setParams(next, { replace: true }); }
      setHandoff('done');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || handoff === 'pending') return <Container className="flex justify-center py-24"><Spinner /></Container>;
  // Page protégée : connexion, puis retour exact à la page demandée (chemin et paramètres).
  if (!user) {
    const fromApp = new URLSearchParams(location.search).get('source') === 'app';
    return <Navigate to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}${fromApp ? '&raison=lien-app' : ''}`} replace />;
  }

  return (
    <Container className="py-8 md:py-12">
      <div className={cx('lg:grid lg:gap-12 lg:transition-[grid-template-columns] lg:duration-300 lg:ease-emphasized motion-reduce:transition-none', collapsed ? 'lg:grid-cols-[44px_1fr]' : 'lg:grid-cols-[220px_1fr]')}>
        <aside id="menu-compte" className="lg:flex lg:flex-col">
          <div className="mb-4 hidden lg:block">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls="menu-compte"
            aria-label={sidebarToggleLabel(collapsed)}
            title={collapsed ? undefined : `${sidebarToggleLabel(collapsed)} (${SIDEBAR_SHORTCUT})`}
            className={cx('group relative flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink', collapsed && 'gap-0')}
          >
            <SidebarToggleIcon collapsed={collapsed} size={16} className="shrink-0" />
            <span className={cx('min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-200', collapsed && 'opacity-0')}>Réduire le menu</span>
            <SidebarTip show={collapsed}>{`Ouvrir le menu · ${SIDEBAR_SHORTCUT}`}</SidebarTip>
          </button>
          </div>
          <div className={cx('mb-6 hidden h-10 min-w-0 transition-opacity duration-200 lg:block', collapsed && 'opacity-0')} aria-hidden={collapsed || undefined}>
            <p className="truncate whitespace-nowrap text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate whitespace-nowrap text-sm text-ink-muted">{user.email}</p>
          </div>
          <nav aria-label="Mon compte" className="fade-x scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:[mask-image:none]">
            {LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                aria-label={collapsed ? label : undefined}
                className={({ isActive }) => cx(
                  'group relative flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium transition-[background-color,color] duration-200',
                  collapsed && 'lg:gap-0',
                  isActive ? 'bg-ink text-white shadow-soft' : 'border border-line bg-white text-ink-soft hover:text-ink lg:border-transparent lg:bg-transparent lg:hover:bg-ink/[0.04]',
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span className={cx('whitespace-nowrap lg:min-w-0 lg:overflow-hidden lg:transition-opacity lg:duration-200', collapsed && 'lg:opacity-0')}>{label}</span>
                <SidebarTip show={collapsed} className="hidden lg:block">{label}</SidebarTip>
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
      <h1 className="text-title font-bold text-ink">{title}</h1>
      {description ? <p className="mt-1 text-ink-soft">{description}</p> : null}
    </div>
    {action}
  </div>
);

export default AccountLayout;
