import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useI18n } from "./i18n";
import { supabaseConfig } from "./lib/supabase";
import DocsIndexPage from "./pages/DocsIndexPage";
import DocsStartPage from "./pages/DocsStartPage";
import DocsStonesPage from "./pages/DocsStonesPage";
import DocsTeamPage from "./pages/DocsTeamPage";
import DocsWorkspacePage from "./pages/DocsWorkspacePage";
import JoinPage from "./pages/JoinPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectWorkspace from "./pages/ProjectWorkspace";

function RequireAuth({ children }) {
  const { user, loading, needsUsernameSetup } = useAuth();
  const { t } = useI18n();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-dim">
        {t("common.loading")}
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (needsUsernameSetup) return <Navigate to="/join" replace />;
  return children;
}

function RequireConfig({ children }) {
  const { t } = useI18n();
  if (!supabaseConfig.isConfigured) {
    return (
      <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-left">
        <h1 className="mb-2 text-center text-xl font-bold text-amber-200">
          {t("config.missingTitle")}
        </h1>
        <p className="mb-4 text-sm text-dim">{t("config.missingBody")}</p>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <RequireConfig>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<DocsIndexPage />} />
            <Route path="/docs/start" element={<DocsStartPage />} />
            <Route path="/docs/stones" element={<DocsStonesPage />} />
            <Route path="/docs/workspace" element={<DocsWorkspacePage />} />
            <Route path="/docs/team" element={<DocsTeamPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/onboarding" element={<Navigate to="/join" replace />} />
            <Route
              path="/projects"
              element={
                <RequireAuth>
                  <ProjectsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/p/:projectId/*"
              element={
                <RequireAuth>
                  <ProjectWorkspace />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </RequireConfig>
    </BrowserRouter>
  );
}
