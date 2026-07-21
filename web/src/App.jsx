import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectWorkspace from "./pages/ProjectWorkspace";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-dim">Cargando…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireConfig({ children }) {
  const ok =
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!ok) {
    return (
      <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <h1 className="mb-2 text-xl font-bold text-amber-200">Configura Supabase</h1>
        <p className="text-sm text-dim">
          Define <code className="text-text">VITE_SUPABASE_URL</code> y{" "}
          <code className="text-text">VITE_SUPABASE_ANON_KEY</code> en{" "}
          <code className="text-text">web/.env.local</code> o en Vercel/Netlify.
        </p>
        <p className="mt-3 text-xs text-mute">
          Ver <code>DEPLOY.md</code> y <code>scripts/README.md</code>.
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
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
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
