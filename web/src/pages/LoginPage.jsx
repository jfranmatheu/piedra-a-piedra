import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, loading, signIn, needsUsernameSetup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    return (
      <Navigate to={needsUsernameSetup ? "/join" : "/"} replace />
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-elev p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🪨</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Piedra a Piedra</h1>
          <p className="mt-1 text-sm text-dim">Acceso por invitación</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-mute">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
            />
          </label>
          <label className="block text-xs font-medium text-mute">
            Contraseña
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
            />
          </label>
          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl border border-accent/40 bg-accent/20 py-2.5 text-sm font-bold text-text hover:bg-accent/30 disabled:opacity-50"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-mute">
          No hay registro público. Si te invitaron, usa el enlace del email para
          crear username y contraseña.
        </p>
      </div>
    </div>
  );
}
