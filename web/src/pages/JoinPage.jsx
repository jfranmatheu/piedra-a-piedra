import { AtSign, Lock, Shield, Users, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import {
  sanitizeUsernameInput,
  USERNAME_HELP,
  validateUsername,
} from "../lib/username";

/**
 * Alta por invitación:
 * 1) Clic en el email de Supabase → aterriza aquí con sesión provisional
 * 2) Elige username + contraseña → cuenta activada → dashboard
 * 3) O rechaza → se borra el usuario de Auth y el rastro de invitación
 */
export default function JoinPage() {
  const {
    user,
    session,
    profile,
    loading,
    needsUsernameSetup,
    refreshProfile,
  } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  // Espera un momento a tokens en el hash (invite link)
  const [hashWait, setHashWait] = useState(() =>
    typeof window !== "undefined"
      ? /access_token|refresh_token|type=invite|type=signup|type=recovery/i.test(
          window.location.hash + window.location.search
        )
      : false
  );

  useEffect(() => {
    if (!hashWait) return;
    const t = setTimeout(() => setHashWait(false), 2500);
    return () => clearTimeout(t);
  }, [hashWait]);

  useEffect(() => {
    if (user && hashWait) setHashWait(false);
  }, [user, hashWait]);

  const userErr = useMemo(
    () => (username ? validateUsername(username) : null),
    [username]
  );
  const passErr = useMemo(
    () =>
      password || passwordConfirm
        ? api.validatePassword(password, passwordConfirm)
        : null,
    [password, passwordConfirm]
  );

  if (declined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-elev p-8 text-center shadow-2xl">
          <div className="mb-3 text-3xl">👋</div>
          <h1 className="text-xl font-extrabold">Invitación rechazada</h1>
          <p className="mt-2 text-sm text-dim">
            No se ha creado ninguna cuenta. Tu email ha sido eliminado del acceso
            a la plataforma.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-xl border border-border px-4 py-2 text-sm font-semibold text-dim hover:text-text"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  if (loading || hashWait) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-dim">
        <div className="animate-bounce text-3xl">🪨</div>
        <p>Preparando tu invitación…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-elev p-8 text-center">
          <h1 className="text-xl font-extrabold">Enlace de invitación</h1>
          <p className="mt-3 text-sm text-dim">
            Abre el enlace del email de invitación (puede caducar). Si ya tienes
            cuenta, inicia sesión con tu email y contraseña.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-xl border border-accent/40 bg-accent/20 px-4 py-2.5 text-sm font-bold"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  // Cuenta ya activada → hub de proyectos
  if (!needsUsernameSetup) {
    return <Navigate to="/projects" replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validateUsername(username);
    if (v) {
      setError(v);
      return;
    }
    const p = api.validatePassword(password, passwordConfirm);
    if (p) {
      setError(p);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.completeInviteSignup({
        username,
        password,
        passwordConfirm,
        displayName: displayName.trim() || username,
      });
      await refreshProfile();
      navigate("/projects", { replace: true });
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta");
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async () => {
    if (!confirmDecline) {
      setConfirmDecline(true);
      return;
    }
    setDeclining(true);
    setError(null);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Sesión no válida");
      await api.declinePlatformInvite(token);
      setDeclined(true);
    } catch (err) {
      setError(err.message || "No se pudo rechazar la invitación");
      setConfirmDecline(false);
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🪨</div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Crear tu cuenta
          </h1>
          <p className="mt-1 text-sm text-dim">
            Te han invitado a Piedra a Piedra
            {user.email ? (
              <>
                {" "}
                como{" "}
                <span className="font-medium text-text">{user.email}</span>
              </>
            ) : null}
          </p>
          <p className="mt-2 text-xs text-mute">
            Elige un username público y una contraseña. Tu email no se comparte
            con otros usuarios.
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
              <div className="text-[10px] text-mute">Solo para acceder</div>
            </div>
            <div className="rounded-xl border border-border bg-black/25 px-3 py-2.5 text-center">
              <Users size={14} className="mx-auto mb-1 text-accent" />
              <div className="text-[11px] font-semibold text-text">Invitar con @</div>
              <div className="text-[10px] text-mute">A proyectos</div>
            </div>
            <div className="rounded-xl border border-border bg-black/25 px-3 py-2.5 text-center">
              <Shield size={14} className="mx-auto mb-1 text-accent" />
              <div className="text-[11px] font-semibold text-text">Tu contraseña</div>
              <div className="text-[10px] text-mute">Solo tuya</div>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-elev p-6 shadow-2xl"
        >
          <label className="mb-3 block text-xs font-medium text-mute">
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
                placeholder={profile?.username || "tu_nombre"}
                className="w-full rounded-xl border border-border bg-black/40 py-2.5 pl-8 pr-3 font-mono text-sm outline-none focus:border-accent/50"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-mute">
              Solo <code className="text-dim">a-z</code>,{" "}
              <code className="text-dim">0-9</code> y <code className="text-dim">_</code> ·
              sin espacios · no «admin»
            </p>
            {userErr && (
              <p className="mt-1 text-[11px] text-amber-300/90">{userErr}</p>
            )}
          </label>

          <label className="mb-3 block text-xs font-medium text-mute">
            Nombre para mostrar{" "}
            <span className="font-normal text-mute/70">(opcional)</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Cómo te verán en el tablero"
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
            />
          </label>

          <label className="mb-3 block text-xs font-medium text-mute">
            Contraseña
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
            />
          </label>

          <label className="mb-4 block text-xs font-medium text-mute">
            Confirmar contraseña
            <input
              type="password"
              required
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              minLength={8}
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
            />
            {passErr && (
              <p className="mt-1 text-[11px] text-amber-300/90">{passErr}</p>
            )}
          </label>

          {error && (
            <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || declining || !!userErr || !!passErr || !username}
            className="w-full rounded-xl border border-accent/40 bg-accent/20 py-2.5 text-sm font-bold text-text hover:bg-accent/30 disabled:opacity-50"
          >
            {busy ? "Creando cuenta…" : "Crear cuenta y continuar"}
          </button>

          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-2 text-center text-[11px] text-mute">
              ¿No quieres unirte? Puedes rechazar la invitación y borraremos tu
              email de Authentication y de la lista de invitados.
            </p>
            <button
              type="button"
              disabled={busy || declining}
              onClick={onDecline}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                confirmDecline
                  ? "border-rose-500/50 bg-rose-500/20 text-rose-200"
                  : "border-border text-mute hover:border-rose-500/40 hover:text-rose-200"
              }`}
            >
              <XCircle size={14} />
              {declining
                ? "Eliminando…"
                : confirmDecline
                  ? "Confirmar: no crear cuenta"
                  : "No quiero crear una cuenta"}
            </button>
            {confirmDecline && !declining && (
              <button
                type="button"
                onClick={() => setConfirmDecline(false)}
                className="mt-2 w-full text-center text-[11px] text-mute hover:text-dim"
              >
                Cancelar rechazo
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
