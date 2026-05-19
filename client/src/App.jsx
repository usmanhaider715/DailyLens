import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { setAuthToken } from './services/api.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';
import { Spinner } from './components/common/Spinner.jsx';

const HomePage = lazy(() => import('./pages/HomePage.jsx').then((m) => ({ default: m.HomePage })));
const ArticlePage = lazy(() => import('./pages/ArticlePage.jsx').then((m) => ({ default: m.ArticlePage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage.jsx').then((m) => ({ default: m.CategoryPage })));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx').then((m) => ({ default: m.SearchPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage.jsx').then((m) => ({ default: m.AdminLoginPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx').then((m) => ({ default: m.NotFoundPage })));

const AdminLayout = lazy(() =>
  import('./components/admin/AdminLayout.jsx').then((m) => ({ default: m.AdminLayout }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage.jsx').then((m) => ({ default: m.AdminDashboardPage }))
);
const ArticleManager = lazy(() =>
  import('./components/admin/ArticleManager.jsx').then((m) => ({ default: m.ArticleManager }))
);
const BreakingNewsTrigger = lazy(() =>
  import('./components/admin/BreakingNewsTrigger.jsx').then((m) => ({ default: m.BreakingNewsTrigger }))
);
const AdManager = lazy(() => import('./components/admin/AdManager.jsx').then((m) => ({ default: m.AdManager })));
const AISettings = lazy(() => import('./components/admin/AISettings.jsx').then((m) => ({ default: m.AISettings })));
const HomepageSettings = lazy(() =>
  import('./components/admin/HomepageSettings.jsx').then((m) => ({ default: m.HomepageSettings }))
);
const ArticleEditor = lazy(() =>
  import('./components/admin/ArticleEditor.jsx').then((m) => ({ default: m.ArticleEditor }))
);

function RequireAuth({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  useEffect(() => {
    setAuthToken(token);
  }, [token]);
  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return children;
}

function SuspensePage({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <SuspensePage>
            <HomePage />
          </SuspensePage>
        }
      />
      <Route
        path="/article/:slug"
        element={
          <SuspensePage>
            <ArticlePage />
          </SuspensePage>
        }
      />
      <Route
        path="/category/:slug"
        element={
          <SuspensePage>
            <CategoryPage />
          </SuspensePage>
        }
      />
      <Route
        path="/search"
        element={
          <SuspensePage>
            <SearchPage />
          </SuspensePage>
        }
      />
      <Route
        path="/admin/login"
        element={
          <SuspensePage>
            <AdminLoginPage />
          </SuspensePage>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <SuspensePage>
              <AdminLayout />
            </SuspensePage>
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="articles" element={<ArticleManager />} />
        <Route path="articles/new" element={<ArticleEditor />} />
        <Route path="articles/edit/:id" element={<ArticleEditor />} />
        <Route path="breaking" element={<BreakingNewsTrigger />} />
        <Route path="ads" element={<AdManager />} />
        <Route path="ai" element={<AISettings />} />
        <Route path="homepage" element={<HomepageSettings />} />
      </Route>
      <Route
        path="*"
        element={
          <SuspensePage>
            <NotFoundPage />
          </SuspensePage>
        }
      />
    </Routes>
  );
}
