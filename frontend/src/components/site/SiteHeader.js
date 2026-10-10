import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronRight, CreditCard, Download, Gift, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, Sparkles, UserRound, Wallet, X } from 'lucide-react';
import AuthContext, { isStaff } from '../../context/AuthContext';
import { Button, Container, cx } from '../ui';
import Logo from './Logo';

const PRIMARY_LINKS = [
  { to: '/sujets', label: 'Sujets', icon: BookOpen },
  { to: '/recherche', label: 'Recherche', icon: Search },
  { to: '/abonnement', label: 'Abonnement', icon: Sparkles },
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

// Lien actif : trait or sous le libellé, qui glisse à l'apparition.
const linkClass = ({ isActive }) => cx(
  'relative rounded-lg px-3 py-2 text-[15px] font-medium transition-colors',
  'after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-gold after:transition-transform after:duration-300 after:ease-emphasized',
  isActive ? 'text-ink after:scale-x-100' : 'text-ink-soft after:scale-x-0 hover:text-ink',
);

const Avatar = ({ user, className }) => (
  <span className={cx('flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white', className)}>
    {user.name?.charAt(0).toUpperCase() || 'F'}
  </span>
);

const AccountMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cx('flex items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-3 text-sm font-medium text-ink transition-[border-color,box-shadow] duration-200', open ? 'border-line-strong shadow-soft' : 'border-line hover:border-line-strong')}
      >
        <Avatar user={user} className="h-8 w-8 text-sm" />
        <span className="max-w-[120px] truncate">{user.name?.split(' ')[0]}</span>
        <ChevronDown size={15} className={cx('text-ink-muted transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-64 origin-top-right animate-scale-in rounded-2xl border border-line bg-white p-2 shadow-lift" role="menu">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>
          <div className="py-1">
            {ACCOUNT_LINKS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-paper" role="menuitem">
                <Icon size={16} className="text-ink-soft" /> {label}
              </Link>
            ))}
            {isStaff(user) ? (
              <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-paper" role="menuitem">
                <ShieldCheck size={16} className="text-ink-soft" /> Administration
              </Link>
            ) : null}
          </div>
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg border-t border-line px-3 py-2.5 text-sm text-burgundy transition-colors hover:bg-burgundy-wash" role="menuitem">
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
};

/**
 * Menu mobile : panneau sous la barre, ouvert et refermé en glissant (grid-rows 0fr → 1fr).
 * Fermé, il est `invisible` : hors du parcours clavier et des lecteurs d'écran.
 */
const MobileMenu = ({ open, user, authSuffix, onLogout, onClose }) => (
  <>
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onClose}
      className={cx('absolute inset-x-0 top-full h-[100dvh] bg-ink/30 backdrop-blur-[2px] transition-opacity duration-300 md:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
    />
    <div
      id="mobile-menu"
      className={cx(
        'absolute inset-x-0 top-full grid border-b border-line bg-paper shadow-lift transition-[grid-template-rows,visibility] duration-300 ease-emphasized md:hidden',
        open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <Container className={cx('max-h-[calc(100dvh-4rem)] overflow-y-auto pb-safe pt-3 transition-[opacity,transform] duration-300 ease-emphasized', open ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0')}>
          <nav className="flex flex-col" aria-label="Navigation mobile">
            {PRIMARY_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cx('flex min-h-[52px] items-center gap-3.5 rounded-xl px-3 text-[17px] font-semibold transition-colors', isActive ? 'bg-white text-ink shadow-soft' : 'text-ink active:bg-ink/[0.04]')}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper-dim"><Icon size={18} /></span>
                <span className="flex-1">{label}</span>
                <ChevronRight size={18} className="text-ink-muted" />
              </NavLink>
            ))}
          </nav>

          {user ? (
            <div className="mt-4 border-t border-line pt-4">
              <div className="flex items-center gap-3 px-3">
                <Avatar user={user} className="h-9 w-9 text-sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-xs text-ink-muted">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {ACCOUNT_LINKS.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/compte'}
                    className={({ isActive }) => cx('flex min-h-[48px] items-center gap-2.5 rounded-xl border px-3 text-sm font-medium transition-colors', isActive ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink')}
                  >
                    <Icon size={16} className="shrink-0" /> <span className="truncate">{label}</span>
                  </NavLink>
                ))}
                {isStaff(user) ? (
                  <NavLink to="/dashboard" className="col-span-2 flex min-h-[48px] items-center gap-2.5 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink">
                    <ShieldCheck size={16} /> Administration
                  </NavLink>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 pb-4">
            {user ? (
              <Button variant="danger" icon={LogOut} onClick={onLogout}>Se déconnecter</Button>
            ) : (
              <>
                <Button to={`/register${authSuffix}`} size="lg">Créer un compte</Button>
                <Button to={`/login${authSuffix}`} variant="secondary" size="lg">Se connecter</Button>
              </>
            )}
          </div>
        </Container>
      </div>
    </div>
  </>
);

const SiteHeader = () => {
  const { user, logout } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Connexion depuis n'importe quelle page : retour automatique à cette page ensuite.
  const here = `${location.pathname}${location.search}`;
  const authSuffix = ['/', '/login', '/register'].includes(location.pathname) ? '' : `?next=${encodeURIComponent(here)}`;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Menu ouvert : la page dessous ne défile plus ; Échap le referme.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    navigate('/');
  };

  return (
    <header className={cx('sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300', scrolled || mobileOpen ? 'border-line bg-paper/90 backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-paper')}>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Aller au contenu
      </a>
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
              <Button to={`/login${authSuffix}`} variant="ghost" size="sm">Se connecter</Button>
              <Button to={`/register${authSuffix}`} size="sm">Créer un compte</Button>
            </>
          )}
        </div>

        <div className="-mr-2 flex items-center gap-0.5 md:hidden">
          <Link to="/recherche" aria-label="Rechercher" className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors active:bg-ink/5">
            <Search size={20} />
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((value) => !value)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors active:bg-ink/5"
          >
            <Menu size={21} className={cx('absolute transition-[transform,opacity] duration-300 ease-emphasized', mobileOpen ? 'rotate-90 scale-50 opacity-0' : 'opacity-100')} />
            <X size={21} className={cx('absolute transition-[transform,opacity] duration-300 ease-emphasized', mobileOpen ? 'opacity-100' : '-rotate-90 scale-50 opacity-0')} />
          </button>
        </div>
      </Container>

      <MobileMenu open={mobileOpen} user={user} authSuffix={authSuffix} onLogout={handleLogout} onClose={() => setMobileOpen(false)} />
    </header>
  );
};

export default SiteHeader;
