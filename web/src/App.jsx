import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabaseConfig } from "./lib/supabase";
import JoinPage from "./pages/JoinPage";
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
  // Alta incompleta (invitación): username + contraseña en /join
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
          Vite embebe las variables <code className="text-text">VITE_*</code> en el{" "}
          <strong>build</strong>. Hay que definirlas en Vercel y{" "}
          <strong>volver a desplegar</strong> (Redeploy).
        </p>
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-dim">
          <li>
            URL:{" "}
            <code className="text-text">
              {supabaseConfig.hasUrl ? "OK" : "FALTA VITE_SUPABASE_URL"}
            </code>
          </li>
          <li>
            Publishable key:{" "}
            <code className="text-text">
              {supabaseConfig.hasPublishableKey
                ? `OK (${supabaseConfig.keySource})`
                : "FALTA VITE_SUPABASE_PUBLISHABLE_KEY"}
            </code>
          </li>
        </ul>
        <div className="rounded-xl border border-border bg-black/30 p-3 font-mono text-[11px] text-mute">
          Vercel → Settings → Environment Variables
          <br />
          VITE_SUPABASE_URL=https://xxx.supabase.co
          <br />
          VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
          <br />
          Environments: Production (y Preview si aplica)
          <br />
          Luego: Deployments → ⋮ → Redeploy
        </div>
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
            <Route path="/join" element={<JoinPage />} />
            {/* Compat: antigua ruta de onboarding */}
            <Route path="/onboarding" element={<Navigate to="/join" replace />} />
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
