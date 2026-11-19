import React, { Suspense, lazy, useContext, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import AuthContext, { AuthProvider, isStaff } from './context/AuthContext';
import PwaHelper from './components/site/PwaHelper';
import SiteHeader from './components/site/SiteHeader';
import SiteFooter from './components/site/SiteFooter';
import { Button, Container, EmptyState, Spinner } from './components/ui';
import useSeo from './hooks/useSeo';
import { PAGES_SEO } from './lib/pagesSeo';
import { trackPageView } from './lib/analytics';
import { trackArrival } from './lib/visitSource';
import Home from './pages/Home';
import ExplorePage from './pages/ExplorePage';
import DocumentPage from './pages/DocumentPage';

// Pages d'arrivée depuis les moteurs (accueil, catalogue, fiches) : dans le paquet principal.
// Le reste n'est téléchargé qu'à l'ouverture : premier affichage plus léger sur réseau mobile.
const SearchPage = lazy(() => import('./pages/SearchPage'));
const BulkDownloadPage = lazy(() => import('./pages/BulkDownloadPage'));
const SubscribePage = lazy(() => import('./pages/SubscribePage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'));
const accountPages = () => import('./pages/account/AccountPages');
const AccountDownloads = lazy(() => accountPages().then((m) => ({ default: m.AccountDownloads })));
const AccountOverview = lazy(() => accountPages().then((m) => ({ default: m.AccountOverview })));
const AccountProfile = lazy(() => accountPages().then((m) => ({ default: m.AccountProfile })));
const AccountPromoCode = lazy(() => accountPages().then((m) => ({ default: m.AccountPromoCode })));
const AccountSubscription = lazy(() => accountPages().then((m) => ({ default: m.AccountSubscription })));
const AccountWallet = lazy(() => accountPages().then((m) => ({ default: m.AccountWallet })));

// L'administration (graphiques, éditeurs) n'est chargée que par l'équipe.
const Dashboard = lazy(() => import('./pages/Dashboard'));
// Préparation aux concours (lot 6) : chargée seulement quand on l'ouvre.
const prepPages = () => import('./pages/prep/PrepPages');
const PrepHomePage = lazy(() => prepPages().then((m) => ({ default: m.PrepHomePage })));
const PrepProgrammePage = lazy(() => prepPages().then((m) => ({ default: m.PrepProgrammePage })));
const PrepLessonPage = lazy(() => prepPages().then((m) => ({ default: m.PrepLessonPage })));
const PrepSessionPage = lazy(() => prepPages().then((m) => ({ default: m.PrepSessionPage })));
const prepSessions = () => import('./pages/prep/PrepSessions');
const PrepReviewsPage = lazy(() => prepSessions().then((m) => ({ default: m.PrepReviewsPage })));
const PrepMockPage = lazy(() => prepSessions().then((m) => ({ default: m.PrepMockPage })));
const PrepPlacementPage = lazy(() => prepSessions().then((m) => ({ default: m.PrepPlacementPage })));
const PrepRankingPage = lazy(() => prepSessions().then((m) => ({ default: m.PrepRankingPage })));
const Lazy = ({ children }) => <Suspense fallback={<Container className="flex justify-center py-24"><Spinner /></Container>}>{children}</Suspense>;

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
const SiteLayout = () => {
  // Espace d'étude d'un programme : outil de travail plein écran (onglets en bas sur mobile), sans pied de page.
  const studying = /^\/preparation\/[^/]+/.test(useLocation().pathname);
  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">
      <SiteHeader />
      <main id="contenu" className="flex-1 focus:outline-none" tabIndex={-1}>
        <Outlet />
      </main>
      {studying ? null : <SiteFooter />}
      <PwaHelper />
    </div>
  );
};

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
  // Provenance de la visite (une fois par session) : tableau de bord « Provenance ».
  useEffect(() => { trackArrival(); }, []);
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
            <Route path="/recherche" element={<Page seo="search"><Lazy><SearchPage /></Lazy></Page>} />
            <Route path="/telecharger" element={<Lazy><BulkDownloadPage /></Lazy>} />
            <Route path="/abonnement" element={<Page seo="subscribe"><Lazy><SubscribePage /></Lazy></Page>} />
            <Route path="/preparation" element={<Lazy><PrepHomePage /></Lazy>} />
            <Route path="/preparation/:programme" element={<Lazy><PrepProgrammePage /></Lazy>} />
            <Route path="/preparation/:programme/revisions" element={<Lazy><PrepReviewsPage /></Lazy>} />
            <Route path="/preparation/:programme/concours-blanc" element={<Lazy><PrepMockPage /></Lazy>} />
            <Route path="/preparation/:programme/test-de-niveau" element={<Lazy><PrepPlacementPage /></Lazy>} />
            <Route path="/preparation/:programme/classement" element={<Lazy><PrepRankingPage /></Lazy>} />
            <Route path="/preparation/:programme/:module/lecon/:lecon" element={<Lazy><PrepLessonPage /></Lazy>} />
            <Route path="/preparation/:programme/:module/niveau/:niveau" element={<Lazy><PrepSessionPage /></Lazy>} />
            <Route path="/login" element={<Page seo="login"><Lazy><Login /></Lazy></Page>} />
            <Route path="/register" element={<Page seo="register"><Lazy><Register /></Lazy></Page>} />
            <Route path="/compte" element={<Page seo="account"><Lazy><AccountLayout /></Lazy></Page>}>
              <Route index element={<Lazy><AccountOverview /></Lazy>} />
              <Route path="abonnement" element={<Lazy><AccountSubscription /></Lazy>} />
              <Route path="telechargements" element={<Lazy><AccountDownloads /></Lazy>} />
              <Route path="code-promo" element={<Lazy><AccountPromoCode /></Lazy>} />
              <Route path="portefeuille" element={<Lazy><AccountWallet /></Lazy>} />
              <Route path="profil" element={<Lazy><AccountProfile /></Lazy>} />
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
