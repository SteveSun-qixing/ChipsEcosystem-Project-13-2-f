import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppPreferencesProvider, useAppPreferences } from './contexts/AppPreferencesContext';
import { SiteFooter } from './components/SiteFooter';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import WorkspacePage from './pages/WorkspacePage';
import CardDetailPage from './pages/CardDetailPage';
import BoxDetailPage from './pages/BoxDetailPage';
import AdminRedirectPage from './pages/AdminRedirectPage';
import { getPostAuthPath } from './lib/ui';
import './styles/runtime.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { t } = useAppPreferences();
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="page-loader">{t('common.loading')}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { t } = useAppPreferences();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="page-loader">{t('common.loading')}</div>;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getPostAuthPath(user)} replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { t } = useAppPreferences();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="page-loader">{t('common.loading')}</div>;
  }

  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={`/@${user.username}`} replace />;
  }

  return <HomePage />;
}

function NotFoundPage() {
  const { t } = useAppPreferences();

  return (
    <div className="page-container">
      <section className="panel empty-panel">
        <h1>404</h1>
        <p>{t('detail.notFound')}</p>
      </section>
    </div>
  );
}

function AppRoutes() {
  return (
    <main className="app-shell__main">
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route path="/:username" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminRedirectPage />} />
        <Route
          path="/workspace"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route path="/cards/:cardId" element={<CardDetailPage />} />
        <Route path="/boxes/:boxId" element={<BoxDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  );
}

function AppChrome() {
  const location = useLocation();
  const isContentDirectRoute =
    location.pathname.startsWith('/cards/') || location.pathname.startsWith('/boxes/');

  return (
    <div className="app-shell">
      <AppRoutes />
      {!isContentDirectRoute ? <SiteFooter /> : null}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppPreferencesProvider>
        <AuthProvider>
          <AppChrome />
        </AuthProvider>
      </AppPreferencesProvider>
    </BrowserRouter>
  );
}

export default App;
