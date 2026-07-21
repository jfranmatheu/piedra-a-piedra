import { AtSign, Lock, Shield, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import {
  sanitizeUsernameInput,
  USERNAME_HELP,
  validateUsername,
} from "../lib/username";

export default function OnboardingPage() {
  const { user, profile, loading, needsUsernameSetup, refreshProfile, signOut } =
    useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const localError = useMemo(
    () => (username ? validateUsername(username) : null),
    [username]
  );

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-dim">
        Cargando…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!needsUsernameSetup) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validateUsername(username);
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.setUsername(user.id, username, {
        displayName: displayName.trim() || username,
      });
      await refreshProfile();
    } catch (err) {
      setError(err.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🪨</div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            ¡Bienvenido a Piedra a Piedra!
          </h1>
          <p className="mt-1 text-sm text-dim">
            Elige tu username público para empezar
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-border bg-elev/80 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <AtSign size={16} className="text-accent" />
            {USERNAME_HELP.title}
          </h2>
          <ul className="space-y-2.5 text-sm text-dim">
            {USERNAME_HELP.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-black/25 px-3 py-2.5 text-center">
              <Lock size={14} className="mx-auto mb-1 text-accent" />
              <div className="text-[11px] font-semibold text-text">Email privado</div>
              <div className="text-[10px] text-mute">No se muestra a otros</div>
            </div>
            <div className="rounded-xl border border-border bg-black/25 px-3 py-2.5 text-center">
              <Users size={14} className="mx-auto mb-1 text-accent" />
              <div className="text-[11px] font-semibold text-text">Invitar con @</div>
              <div className="text-[10px] text-mute">A proyectos del equipo</div>
            </div>
            <div className="rounded-xl border border-border bg-black/25 px-3 py-2.5 text-center">
              <Shield size={14} className="mx-auto mb-1 text-accent" />
              <div className="text-[11px] font-semibold text-text">Identidad clara</div>
              <div className="text-[10px] text-mute">En tareas y el tablero</div>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-elev p-6 shadow-2xl"
        >
          <label className="mb-4 block text-xs font-medium text-mute">
            Username
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-mute">
                @
              </span>
              <input
                required
                autoFocus
                autoComplete="username"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                placeholder={profile?.username ? profile.username : "tu_nombre"}
                className="w-full rounded-xl border border-border bg-black/40 py-2.5 pl-8 pr-3 font-mono text-sm outline-none focus:border-accent/50"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-mute">
              3–32 caracteres · solo <code className="text-dim">a-z</code>,{" "}
              <code className="text-dim">0-9</code> y <code className="text-dim">_</code> ·
              sin espacios · no uses nombres como admin
            </p>
            {localError && (
              <p className="mt-1 text-[11px] text-amber-300/90">{localError}</p>
            )}
          </label>

          <label className="mb-4 block text-xs font-medium text-mute">
            Nombre para mostrar{" "}
            <span className="font-normal text-mute/70">(opcional)</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Cómo te verán en el tablero"
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
            />
          </label>

          {error && (
            <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !!localError || !username}
            className="w-full rounded-xl border border-accent/40 bg-accent/20 py-2.5 text-sm font-bold text-text hover:bg-accent/30 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Continuar"}
          </button>

          <p className="mt-4 text-center text-[11px] text-mute">
            Entraste con invitación · tu email no se comparte con otros usuarios
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-2 w-full text-center text-[11px] text-mute hover:text-dim"
          >
            Salir
          </button>
        </form>
      </div>
    </div>
  );
}
