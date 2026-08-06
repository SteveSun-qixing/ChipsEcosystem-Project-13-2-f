import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { Client } from "chips-sdk";
import { chipsClient } from "../runtime/chips-client";
import { CommunityPreferencesProvider } from "../community/contexts/PreferencesContext";
import { AuthProvider, useAuth } from "../community/contexts/AuthContext";
import { SiteHeader } from "../community/components/SiteHeader";
import { SiteFooter } from "../community/components/SiteFooter";
import HomePage from "../community/pages/HomePage";
import AboutPage from "../community/pages/AboutPage";
import LoginPage from "../community/pages/LoginPage";
import RegisterPage from "../community/pages/RegisterPage";
import ProfilePage from "../community/pages/ProfilePage";
import WorkspacePage from "../community/pages/WorkspacePage";
import AdminRedirectPage from "../community/pages/AdminRedirectPage";
import SettingsPage from "../community/pages/SettingsPage";
import { getPostAuthPath } from "../community/lib/ui";
import {
  COMMUNITY_REFRESH_TOKEN_REF,
  configureCommunityApiBaseUrl,
  loadCommunityServerUrl,
  setRefreshTokenReader,
} from "../runtime/community-runtime";
import { useAppText } from "../i18n/useAppText";
import { useAppCommands } from "../commands/useAppCommands";
import { APP_COMMAND_HANDLER_IDS } from "../commands/app-commands";

function CommandRouterBridge() {
  const navigate = useNavigate();
  const commands = useAppCommands();
  const handledInvocationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!commands.lastInvoked) {
      return;
    }

    const invocationKey =
      commands.lastInvoked.invocationId ??
      `${commands.lastInvoked.commandId}:${commands.lastInvoked.source}`;
    if (handledInvocationRef.current === invocationKey) {
      return;
    }
    handledInvocationRef.current = invocationKey;

    if (commands.lastInvoked.handlerId === APP_COMMAND_HANDLER_IDS.openWorkspace) {
      navigate("/workspace");
    }
    if (commands.lastInvoked.handlerId === APP_COMMAND_HANDLER_IDS.openSettings) {
      navigate("/settings");
    }
  }, [commands.lastInvoked, navigate]);

  return null;
}

function isProfileRoute(pathname: string): boolean {
  return /^\/@[^/]+\/?$/.test(pathname);
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { text: t } = useAppText();
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="page-loader">{t("common.loading")}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { text: t } = useAppText();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="page-loader">{t("common.loading")}</div>;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getPostAuthPath(user)} replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { text: t } = useAppText();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="page-loader">{t("common.loading")}</div>;
  }

  if (isAuthenticated && user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={`/@${user.username}`} replace />;
  }

  return <HomePage />;
}

function NotFoundPage() {
  const { text: t } = useAppText();

  return (
    <div className="page-container">
      <section className="panel empty-panel">
        <h1>404</h1>
        <p>{t("detail.notFound")}</p>
      </section>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const shouldShowFooter = !isProfileRoute(location.pathname);

  return (
    <div className="app-shell">
      <SiteHeader />
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
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {shouldShowFooter ? <SiteFooter /> : null}
    </div>
  );
}

function CommunityBootstrap({ children }: { children: ReactNode }) {
  const client: Client = chipsClient;
  const { text: t } = useAppText();
  const [ready, setReady] = useState(false);
  const bootstrapRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!bootstrapRef.current) {
      bootstrapRef.current = (async () => {
        const baseUrl = await loadCommunityServerUrl(client);
        configureCommunityApiBaseUrl(baseUrl);
        setRefreshTokenReader(() => client.credential.get(COMMUNITY_REFRESH_TOKEN_REF));
      })().catch((error) => {
        bootstrapRef.current = null;
        throw error;
      });
    }

    void bootstrapRef.current
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client]);

  if (!ready) {
    return <div className="page-loader">{t("common.loading")}</div>;
  }

  return <>{children}</>;
}

export function AppShell() {
  const client: Client = chipsClient;
  const { text: t } = useAppText();

  const shell = useMemo(
    () => (
      <CommunityBootstrap>
        <AuthProvider client={client}>
          <HashRouter>
            <CommunityPreferencesProvider>
              <CommandRouterBridge />
              <AppRoutes />
            </CommunityPreferencesProvider>
          </HashRouter>
        </AuthProvider>
      </CommunityBootstrap>
    ),
    [client, t],
  );

  return shell;
}
