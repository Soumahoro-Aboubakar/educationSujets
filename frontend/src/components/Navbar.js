import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, User, LogOut, Home, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: '/', label: 'Accueil', icon: Home },
    ...(user
      ? [{ to: '/dashboard', label: 'Tableau de bord', icon: User }]
      : []),
  ];

  return (
    <>
      {/* ─── Desktop & Mobile Top Bar ─── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled
            ? 'glass shadow-md'
            : 'bg-white/0'
          }`}
        style={{ height: 64 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            style={{ textDecoration: 'none' }}
          >
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              }}
            >
              <BookOpen className="text-white" size={18} strokeWidth={2.5} />
            </div>
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
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
                  className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-default"
                  style={{
                    color: active
                      ? 'var(--color-primary)'
                      : 'var(--color-text-secondary)',
                    backgroundColor: active
                      ? 'var(--color-primary-50)'
                      : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              );
            })}

            <div
              className="mx-2"
              style={{
                width: 1,
                height: 24,
                backgroundColor: 'var(--color-border)',
              }}
            />

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-default"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-lg text-sm font-medium transition-default"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-default"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                    color: 'white',
                    boxShadow: '0 1px 3px rgba(99,102,241,.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(99,102,241,.3)';
                  }}
                >
                  Inscription
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex items-center justify-center rounded-lg transition-default"
            style={{
              width: 40,
              height: 40,
              color: 'var(--color-text-primary)',
              backgroundColor: mobileOpen ? 'var(--color-primary-50)' : 'transparent',
            }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ─── Mobile Drawer Overlay ─── */}
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
              style={{ backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
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
                backgroundColor: 'var(--color-surface)',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.08)',
              }}
            >
              {/* Drawer Header */}
              <div
                className="flex items-center justify-between px-5"
                style={{
                  height: 64,
                  borderBottom: '1px solid var(--color-border-light)',
                }}
              >
                <span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Navigation
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 36,
                    height: 36,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link, idx) => {
                    const Icon = link.icon;
                    const active = isActive(link.to);
                    return (
                      <motion.div
                        key={link.to}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06 }}
                      >
                        <Link
                          to={link.to}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-default"
                          style={{
                            color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            backgroundColor: active ? 'var(--color-primary-50)' : 'transparent',
                          }}
                        >
                          <Icon size={18} />
                          {link.label}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer */}
              <div
                className="px-4 py-4"
                style={{ borderTop: '1px solid var(--color-border-light)' }}
              >
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-default"
                    style={{
                      color: '#ef4444',
                      backgroundColor: '#fef2f2',
                    }}
                  >
                    <LogOut size={16} />
                    Déconnexion
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-default"
                      style={{
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      Connexion
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white transition-default"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
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

      {/* Spacer to prevent content from going under fixed nav */}
      <div style={{ height: 64 }} />
    </>
  );
};

export default Navbar;
