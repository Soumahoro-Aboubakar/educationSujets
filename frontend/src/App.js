import React, { Suspense, lazy, useContext, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import AuthContext, { AuthProvider, isStaff } from './context/AuthContext';
import SiteHeader from './components/site/SiteHeader';
import SiteFooter from './components/site/SiteFooter';
import { Button, Container, EmptyState, Spinner } from './components/ui';
import useSeo from './hooks/useSeo';
import { PAGES_SEO } from './lib/pagesSeo';
import { trackPageView } from './lib/analytics';
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

/** Métadonnées d'une page fixe (titre, description, indexation) : voir lib/pagesSeo.js. */
const Page = ({ seo, children }) => {
  useSeo(PAGES_SEO[seo]);
  return children;
};

const ScrollToTop = () => {
  const location = useLocation();
  const { pathname } = location;
  const firstPath = useRef(pathname);
  useEffect(() => {
    window.scrollTo(0, 0);
    // Première navigation : les pages suivantes ont leurs animations d'entrée (index.css, index.js).
    if (pathname !== firstPath.current) document.documentElement.removeAttribute('data-hydrating');
  }, [pathname]);
  // Mesure d'audience (facultative) : une page vue par adresse affichée.
  useEffect(() => {
    trackPageView(location);
  }, [location]);
  return null;
};

/** Pages publiques et espace personnel : en-tête et pied de page du site. */
const SiteLayout = () => (
  <div className="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">
    <SiteHeader />
    <main id="contenu" className="flex-1 focus:outline-none" tabIndex={-1}>
      <Outlet />
    </main>
    <SiteFooter />
  </div>
);

/**
 * Adresse inconnue : une vraie page « introuvable » plutôt qu'un renvoi silencieux à l'accueil,
 * qui ferait croire qu'un lien partagé fonctionne alors qu'il est erroné.
 */
const IndexAlias = () => {
  const { search, hash } = useLocation();
  return <Navigate to={`/${search}${hash}`} replace />;
};

const NotFound = () => (
  <Page seo="notFound">
    <Container className="py-16">
      <EmptyState
        icon={SearchX}
        title="Page introuvable"
        description="Ce lien ne correspond à aucune page de Fatafalta. Il est peut-être incomplet ou a été modifié."
        action={<Button to="/sujets" variant="secondary">Parcourir les sujets</Button>}
      />
    </Container>
  </Page>
);

/** L'administration garde sa propre interface ; accès réservé à l'équipe. */
const StaffOnly = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <Container className="flex justify-center py-24"><Spinner /></Container>;
  if (!user) return <Navigate to="/login?next=%2Fdashboard" replace />;
  if (!isStaff(user)) return <Navigate to="/compte" replace />;
  return <Suspense fallback={<Container className="flex justify-center py-24"><Spinner /></Container>}><Page seo="dashboard">{children}</Page></Suspense>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Page seo="home"><Home /></Page>} />
            <Route path="/sujets/document/:id" element={<DocumentPage />} />
            {/* /sujets, /sujets/inphb, /sujets/inphb/idsi/2025/… : un seul composant, qui garde ses listes en mémoire. */}
            <Route path="/sujets/*" element={<ExplorePage />} />
            <Route path="/recherche" element={<Page seo="search"><SearchPage /></Page>} />
            <Route path="/abonnement" element={<Page seo="subscribe"><SubscribePage /></Page>} />
            <Route path="/login" element={<Page seo="login"><Login /></Page>} />
            <Route path="/register" element={<Page seo="register"><Register /></Page>} />
            <Route path="/compte" element={<Page seo="account"><AccountLayout /></Page>}>
              <Route index element={<AccountOverview />} />
              <Route path="abonnement" element={<AccountSubscription />} />
              <Route path="telechargements" element={<AccountDownloads />} />
              <Route path="code-promo" element={<AccountPromoCode />} />
              <Route path="portefeuille" element={<AccountWallet />} />
              <Route path="profil" element={<AccountProfile />} />
            </Route>
            {/* Anciennes adresses */}
            <Route path="/ressources" element={<Navigate to="/sujets" replace />} />
            {/* Hébergeur qui sert /index.html explicitement : même page que l'accueil, paramètres conservés. */}
            <Route path="/index.html" element={<IndexAlias />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/dashboard" element={<StaffOnly><Dashboard /></StaffOnly>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
