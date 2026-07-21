import { AtSign, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import {
  sanitizeUsernameInput,
  USERNAME_HELP,
  validateUsername,
} from "../lib/username";

export default function ProfileSettingsModal({ onClose }) {
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  useEffect(() => {
    setUsername(profile?.username || "");
    setDisplayName(profile?.display_name || "");
  }, [profile?.username, profile?.display_name]);

  const localError = useMemo(() => {
    if (!username) return "Elige un username";
    if (username === profile?.username) return null;
    return validateUsername(username);
  }, [username, profile?.username]);

  const save = async (e) => {
    e.preventDefault();
    if (!user) return;
    const v = validateUsername(username);
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await api.setUsername(user.id, username, {
        displayName: displayName.trim() || username,
      });
      await refreshProfile();
      setOk("Perfil actualizado");
    } catch (err) {
      setError(err.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <form
        className="w-full max-w-md rounded-2xl border border-border bg-elev p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Perfil
            </div>
            <h2 className="text-lg font-bold tracking-tight">Tu username</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-black/25 p-3 text-xs text-dim">
          <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-text">
            <AtSign size={12} className="text-accent" />
            {USERNAME_HELP.title}
          </div>
          <ul className="list-inside list-disc space-y-1 text-mute">
            {USERNAME_HELP.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <label className="mb-3 block text-xs font-medium text-mute">
          Username
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-mute">
              @
            </span>
            <input
              required
              spellCheck={false}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
              className="w-full rounded-xl border border-border bg-black/40 py-2.5 pl-8 pr-3 font-mono text-sm outline-none focus:border-accent/50"
            />
          </div>
          <p className="mt-1 text-[11px] text-mute">
            Solo letras minúsculas, números y _ · sin espacios · no «admin» ni similares
          </p>
          {localError && username !== profile?.username && (
            <p className="mt-1 text-[11px] text-amber-300/90">{localError}</p>
          )}
        </label>

        <label className="mb-4 block text-xs font-medium text-mute">
          Nombre visible
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
          />
        </label>

        {profile?.email && (
          <p className="mb-4 text-[11px] text-mute">
            Email (privado):{" "}
            <span className="text-dim">{profile.email}</span>
          </p>
        )}

        {error && (
          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}
        {ok && (
          <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {ok}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5"
          >
            Cerrar
          </button>
          <button
            type="submit"
            disabled={busy || !!localError}
            className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold text-text disabled:opacity-50"
          >
            {busy ? "…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
