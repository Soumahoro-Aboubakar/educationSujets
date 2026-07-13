import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, BookOpen, Download, User, LogOut, Home as HomeIcon, Menu, X, ChevronDown, LayoutDashboard, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';

const C = {
  ink: '#0E1A2B',
  inkSoft: '#5C6A7D',
  inkFaint: '#8B96A6',
  paper: '#F6F4EF',
  paperDim: '#EFECE3',
  navy: '#16273F',
  navyDeep: '#0A1524',
  gold: '#B98A3B',
  goldSoft: '#F3E7D2',
  line: '#DCD5C6',
  lineSoft: '#E8E3D6',
  lineStrong: 'rgba(14,26,43,0.12)',
  danger: '#B3392C',
  dangerSoft: '#F7E6E2',
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setAvatarOpen(false);
  }, [location.pathname]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    setAvatarOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Main nav links
  const navLinks = [
    { to: '/', label: 'Accueil', icon: HomeIcon },
    { to: '/ressources', label: 'Ressources', icon: Download },
    { to: '/simulateur-admission', label: 'Simulateur', icon: BarChart3 },
    { to: '/orientation-v2', label: 'Orientation V2', icon: Compass },
  ];

  const isDashboardRoute = location.pathname.startsWith('/dashboard');
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
  if (isDashboardRoute || isAuthRoute) return null;

  // Get user initial
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      {/* ─── Floating Glassmorphism Navbar ─── */}
      <nav
        className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none"
        style={{ paddingTop: 12, paddingLeft: 16, paddingRight: 16 }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
          className="pointer-events-auto w-full max-w-6xl rounded-2xl border transition-all duration-500"
          style={{
            background: scrolled
              ? 'rgba(255, 255, 255, 0.85)'
              : 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderColor: scrolled
              ? C.lineStrong
              : 'transparent',
            boxShadow: scrolled
              ? '0 8px 32px rgba(14,26,43,0.06), 0 0 0 1px rgba(255,255,255,0.7) inset'
              : '0 4px 16px rgba(14,26,43,0.04), 0 0 0 1px rgba(255,255,255,0.4) inset',
          }}
        >
          <div className="flex items-center justify-between h-16 px-5 sm:px-6">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="flex items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-105"
                style={{
                  width: 32,
                  height: 32,
                  background: C.gold,
                }}
              >
                <BookOpen className="text-white" size={17} strokeWidth={2.5} />
              </div>
              <span className="text-[17px] font-bold tracking-tight transition-colors" style={{ color: C.ink }}>
                Éducation CI
              </span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-300"
                    style={{
                      color: active ? C.ink : C.inkSoft,
                      backgroundColor: active ? 'rgba(185,138,59,0.1)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'rgba(14,26,43,0.04)';
                        e.currentTarget.style.color = C.ink;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = C.inkSoft;
                      }
                    }}
                  >
                    <Icon size={14} />
                    {link.label}
                    {active && (
                      <motion.div
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          border: `1px solid ${C.gold}40`,
                          zIndex: -1,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}

              {/* Separator */}
              <div
                className="mx-3"
                style={{
                  width: 1,
                  height: 20,
                  background: C.line,
                }}
              />

              {user ? (
                /* ── Avatar Dropdown ── */
                <div className="relative" ref={avatarRef}>
                  <button
                    onClick={() => setAvatarOpen(!avatarOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-300"
                    style={{
                      backgroundColor: avatarOpen ? 'rgba(14,26,43,0.06)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!avatarOpen) e.currentTarget.style.backgroundColor = 'rgba(14,26,43,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!avatarOpen) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full text-white font-bold text-xs shadow-sm"
                      style={{
                        width: 32,
                        height: 32,
                        background: C.navyDeep,
                        border: '2px solid rgba(255,255,255,0.6)',
                      }}
                    >
                      {userInitial}
                    </div>
                    <ChevronDown
                      size={14}
                      className="transition-transform duration-300"
                      style={{
                        color: C.inkSoft,
                        transform: avatarOpen ? 'rotate(180deg)' : 'rotate(0)',
                      }}
                    />
                  </button>

                  <AnimatePresence>
                    {avatarOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden"
                        style={{
                          background: 'rgba(255, 255, 255, 0.98)',
                          backdropFilter: 'blur(24px)',
                          border: `1px solid ${C.line}`,
                          boxShadow: '0 16px 48px rgba(14,26,43,0.12)',
                        }}
                      >
                        {/* User info */}
                        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.lineSoft}` }}>
                          <p className="text-sm font-semibold truncate" style={{ color: C.ink }}>{user.name || 'Utilisateur'}</p>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: C.inkFaint }}>{user.email || ''}</p>
                        </div>

                        <div className="py-1.5">
                          <Link
                            to="/dashboard"
                            onClick={() => setAvatarOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-semibold transition-colors"
                            style={{ color: C.inkSoft }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(14,26,43,0.03)';
                              e.currentTarget.style.color = C.ink;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = C.inkSoft;
                            }}
                          >
                            <LayoutDashboard size={15} />
                            Tableau de bord
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-semibold transition-colors"
                            style={{ color: C.danger }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(179,57,44,0.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <LogOut size={15} />
                            Déconnexion
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3.5 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-300"
                    style={{ color: C.inkSoft }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = C.ink;
                      e.currentTarget.style.backgroundColor = 'rgba(14,26,43,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = C.inkSoft;
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-300 shadow-sm"
                    style={{
                      backgroundColor: C.navyDeep,
                      color: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(10,21,36,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(10,21,36,0.05)';
                    }}
                  >
                    Inscription
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              className="md:hidden flex items-center justify-center rounded-xl transition-all duration-300"
              style={{
                width: 38,
                height: 38,
                color: C.inkSoft,
                backgroundColor: mobileOpen ? 'rgba(14,26,43,0.05)' : 'transparent',
              }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </motion.div>
      </nav>

      {/* ─── Mobile Drawer Overlay (Side Bar) ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ backgroundColor: 'rgba(14,26,43,0.3)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 md:hidden flex flex-col"
              style={{
                width: '80%',
                maxWidth: 320,
                backgroundColor: 'rgba(246, 244, 239, 0.98)', /* Beige clair comme le Home */
                backdropFilter: 'blur(24px)',
                boxShadow: '-10px 0 60px rgba(14,26,43,0.15)',
              }}
            >
              {/* Drawer Header */}
              <div
                className="flex items-center justify-between px-5"
                style={{
                  height: 64,
                  borderBottom: `1px solid ${C.line}`,
                }}
              >
                <span className="text-[14px] font-bold uppercase tracking-wider" style={{ color: C.ink }}>
                  Éducation CI
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center rounded-xl transition-colors hover:bg-black/5"
                  style={{
                    width: 36,
                    height: 36,
                    color: C.inkSoft,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="flex flex-col gap-2">
                  {navLinks.map((link, idx) => {
                    const Icon = link.icon;
                    const active = isActive(link.to);
                    return (
                      <motion.div
                        key={link.to}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Link
                          to={link.to}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14.5px] font-semibold transition-all"
                          style={{
                            color: active ? C.ink : C.inkSoft,
                            backgroundColor: active ? 'rgba(185,138,59,0.1)' : 'transparent',
                            border: active ? `1px solid ${C.gold}40` : '1px solid transparent',
                          }}
                        >
                          <Icon size={18} style={{ color: active ? C.gold : C.inkFaint }} />
                          {link.label}
                        </Link>
                      </motion.div>
                    );
                  })}

                  {user && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: navLinks.length * 0.05 }}
                    >
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14.5px] font-semibold transition-all mt-1"
                        style={{
                          color: isActive('/dashboard') ? C.ink : C.inkSoft,
                          backgroundColor: isActive('/dashboard') ? 'rgba(185,138,59,0.1)' : 'transparent',
                          border: isActive('/dashboard') ? `1px solid ${C.gold}40` : '1px solid transparent',
                        }}
                      >
                        <LayoutDashboard size={18} style={{ color: isActive('/dashboard') ? C.gold : C.inkFaint }} />
                        Tableau de bord
                      </Link>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div
                className="px-5 py-5"
                style={{ borderTop: `1px solid ${C.lineSoft}` }}
              >
                {user ? (
                  <div>
                    <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl" style={{ backgroundColor: 'rgba(14,26,43,0.03)', border: `1px solid ${C.lineSoft}` }}>
                      <div
                        className="flex items-center justify-center rounded-full text-white font-bold text-sm"
                        style={{
                          width: 36,
                          height: 36,
                          background: C.navyDeep,
                        }}
                      >
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold truncate" style={{ color: C.ink }}>{user.name || 'Utilisateur'}</p>
                        <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: C.inkFaint }}>{user.email || ''}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13.5px] font-semibold transition-all"
                      style={{
                        color: C.danger,
                        backgroundColor: 'rgba(179,57,44,0.06)',
                        border: '1px solid rgba(179,57,44,0.12)',
                      }}
                    >
                      <LogOut size={16} />
                      Déconnexion
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="w-full flex items-center justify-center px-4 py-3.5 rounded-xl text-[13.5px] font-bold transition-all shadow-sm"
                      style={{
                        border: `1px solid ${C.lineStrong}`,
                        backgroundColor: '#FFFFFF',
                        color: C.ink,
                      }}
                    >
                      Connexion
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="w-full flex items-center justify-center px-4 py-3.5 rounded-xl text-[13.5px] font-bold transition-all shadow-md"
                      style={{
                        backgroundColor: C.navyDeep,
                        color: '#FFFFFF',
                      }}
                    >
                      Inscription
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for floating nav — skip on home which has its own padding */}
      {location.pathname !== '/' && location.pathname !== '/simulateur-admission' && <div style={{ height: 80 }} />}
    </>
  );
};

export default Navbar;
