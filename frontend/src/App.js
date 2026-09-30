import React, { Suspense, lazy, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AuthContext, { AuthProvider, isStaff } from './context/AuthContext';
import SiteHeader from './components/site/SiteHeader';
import SiteFooter from './components/site/SiteFooter';
import { Container, Spinner } from './components/ui';
import Home from './pages/Home';
import ExplorePage from './pages/ExplorePage';
import DocumentPage from './pages/DocumentPage';
import SearchPage from './pages/SearchPage';
import SubscribePage from './pages/SubscribePage';
import Login from './pages/Login';
import Register from './pages/Register';
import AccountLayout from './pages/account/AccountLayout';
import {
  AccountDownloads,
  AccountOverview,
  AccountProfile,
  AccountPromoCode,
  AccountSubscription,
  AccountWallet,
} from './pages/account/AccountPages';

// L'administration (graphiques, éditeurs) n'est chargée que par l'équipe.
const Dashboard = lazy(() => import('./pages/Dashboard'));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/** Pages publiques et espace personnel : en-tête et pied de page du site. */
const SiteLayout = () => (
  <div className="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">
    <SiteHeader />
    <main className="flex-1">
      <Outlet />
    </main>
    <SiteFooter />
  </div>
);

/** L'administration garde sa propre interface ; accès réservé à l'équipe. */
const StaffOnly = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <Container className="flex justify-center py-24"><Spinner /></Container>;
  if (!user) return <Navigate to="/login?next=%2Fdashboard" replace />;
  if (!isStaff(user)) return <Navigate to="/compte" replace />;
  return <Suspense fallback={<Container className="flex justify-center py-24"><Spinner /></Container>}>{children}</Suspense>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/sujets" element={<ExplorePage />} />
            <Route path="/sujets/document/:id" element={<DocumentPage />} />
            <Route path="/recherche" element={<SearchPage />} />
            <Route path="/abonnement" element={<SubscribePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/compte" element={<AccountLayout />}>
              <Route index element={<AccountOverview />} />
              <Route path="abonnement" element={<AccountSubscription />} />
              <Route path="telechargements" element={<AccountDownloads />} />
              <Route path="code-promo" element={<AccountPromoCode />} />
              <Route path="portefeuille" element={<AccountWallet />} />
              <Route path="profil" element={<AccountProfile />} />
            </Route>
            {/* Anciennes adresses */}
            <Route path="/ressources" element={<Navigate to="/sujets" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="/dashboard" element={<StaffOnly><Dashboard /></StaffOnly>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
