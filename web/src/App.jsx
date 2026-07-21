import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabaseConfig } from "./lib/supabase";
import JoinPage from "./pages/JoinPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectWorkspace from "./pages/ProjectWorkspace";

function RequireAuth({ children }) {
  const { user, loading, needsUsernameSetup } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-dim">
        Cargando…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (needsUsernameSetup) return <Navigate to="/join" replace />;
  return children;
}

function RequireConfig({ children }) {
  if (!supabaseConfig.isConfigured) {
    return (
      <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-left">
        <h1 className="mb-2 text-center text-xl font-bold text-amber-200">
          Supabase no configurado en este build
        </h1>
        <p className="mb-4 text-sm text-dim">
          Define <code className="text-text">VITE_*</code> en Vercel y haz Redeploy.
        </p>
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
