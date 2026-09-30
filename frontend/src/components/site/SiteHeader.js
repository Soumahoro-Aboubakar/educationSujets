import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, CreditCard, Download, Gift, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, UserRound, Wallet, X } from 'lucide-react';
import AuthContext, { isStaff } from '../../context/AuthContext';
import { Button, Container, cx } from '../ui';
import Logo from './Logo';

const PRIMARY_LINKS = [
  { to: '/sujets', label: 'Sujets' },
  { to: '/recherche', label: 'Recherche' },
  { to: '/abonnement', label: 'Abonnement' },
];

// Espace personnel : regroupé dans un menu pour ne pas surcharger la barre.
const ACCOUNT_LINKS = [
  { to: '/compte', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/compte/abonnement', label: 'Abonnement', icon: CreditCard },
  { to: '/compte/telechargements', label: 'Téléchargements', icon: Download },
  { to: '/compte/code-promo', label: 'Code promotionnel', icon: Gift },
  { to: '/compte/portefeuille', label: 'Portefeuille', icon: Wallet },
  { to: '/compte/profil', label: 'Profil', icon: UserRound },
];

const linkClass = ({ isActive }) => cx(
  'rounded-lg px-3 py-2 text-[15px] font-medium transition-colors',
  isActive ? 'text-ink' : 'text-ink-soft hover:text-ink',
);

const AccountMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-sm font-medium text-ink hover:border-line-strong"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
          {user.name?.charAt(0).toUpperCase() || 'F'}
        </span>
        <span className="max-w-[120px] truncate">{user.name?.split(' ')[0]}</span>
        <ChevronDown size={15} className={cx('text-ink-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-64 animate-fade-up rounded-2xl border border-line bg-white p-2 shadow-lift" role="menu">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>
          <div className="py-1">
            {ACCOUNT_LINKS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-paper" role="menuitem">
                <Icon size={16} className="text-ink-soft" /> {label}
              </Link>
            ))}
            {isStaff(user) ? (
              <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-paper" role="menuitem">
                <ShieldCheck size={16} className="text-ink-soft" /> Administration
              </Link>
            ) : null}
          </div>
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg border-t border-line px-3 py-2.5 text-sm text-burgundy hover:bg-burgundy-wash" role="menuitem">
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
};

const SiteHeader = () => {
  const { user, logout } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={cx('sticky top-0 z-50 border-b transition-colors', scrolled || mobileOpen ? 'border-line bg-paper/90 backdrop-blur-xl' : 'border-transparent bg-paper')}>
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {PRIMARY_LINKS.map((link) => <NavLink key={link.to} to={link.to} className={linkClass}>{link.label}</NavLink>)}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? <AccountMenu user={user} onLogout={handleLogout} /> : (
            <>
              <Button to="/login" variant="ghost" size="sm">Se connecter</Button>
              <Button to="/register" size="sm">Créer un compte</Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <Link to="/recherche" aria-label="Rechercher" className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-ink/5">
            <Search size={20} />
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-ink/5"
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </Container>

      {mobileOpen ? (
        <div className="animate-fade-up border-t border-line bg-paper md:hidden">
          <Container className="py-4">
            <nav className="flex flex-col" aria-label="Navigation mobile">
              {PRIMARY_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} className="border-b border-line py-3.5 text-[17px] font-medium text-ink">{link.label}</NavLink>
              ))}
              {user ? ACCOUNT_LINKS.map(({ to, label }) => (
                <NavLink key={to} to={to} className="border-b border-line py-3 text-[15px] text-ink-soft">{label}</NavLink>
              )) : null}
              {isStaff(user) ? <NavLink to="/dashboard" className="border-b border-line py-3 text-[15px] text-ink-soft">Administration</NavLink> : null}
            </nav>
            <div className="mt-4 grid gap-2">
              {user ? (
                <Button variant="danger" onClick={handleLogout}>Se déconnecter</Button>
              ) : (
                <>
                  <Button to="/register">Créer un compte</Button>
                  <Button to="/login" variant="secondary">Se connecter</Button>
                </>
              )}
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
};

export default SiteHeader;
