import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppPreferencesProvider, useAppPreferences } from './contexts/AppPreferencesContext';
import { GlobalNav } from './components/GlobalNav';
import './styles/tokens.css';

// 懒加载页面
const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const SpacePage = React.lazy(() => import('./pages/SpacePage'));
const CardUploadPage = React.lazy(() => import('./pages/CardUploadPage'));
const RoomPage = React.lazy(() => import('./pages/RoomPage'));
const CardDetailPage = React.lazy(() => import('./pages/CardDetailPage'));
const BoxDetailPage = React.lazy(() => import('./pages/BoxDetailPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { t } = useAppPreferences();
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="loading-screen">{t('common.loading')}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function GlobalLayout() {
  const { t } = useAppPreferences();

  return (
    <>
      <GlobalNav />
      <main className="page-content">
        <React.Suspense fallback={<div className="container loading-screen">{t('common.loading')}</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/cards/:cardId" element={<CardDetailPage />} />
            <Route path="/boxes/:boxId" element={<BoxDetailPage />} />
            <Route path="/@:username" element={<SpacePage />} />
            <Route path="/@:username/rooms/:roomSlug" element={<RoomPage />} />

            <Route path="/dashboard/*" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />

            <Route path="/upload" element={
              <ProtectedRoute>
                <CardUploadPage />
              </ProtectedRoute>
            } />
            <Route path="/upload/card" element={<Navigate to="/upload" replace />} />
            
            <Route
              path="*"
              element={
                <div className="container stack-lg centered-state">
                  <h2>404</h2>
                  <p>{t('detail.notFound')}</p>
                </div>
              }
            />
          </Routes>
        </React.Suspense>
      </main>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppPreferencesProvider>
        <AuthProvider>
          <GlobalLayout />
        </AuthProvider>
      </AppPreferencesProvider>
    </BrowserRouter>
  );
}

export default App;
