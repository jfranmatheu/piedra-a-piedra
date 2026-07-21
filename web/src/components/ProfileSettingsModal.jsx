import {
  AtSign,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import * as api from "../lib/api";
import { DEFAULT_NIM_MODEL, NIM_MODELS } from "../lib/nimModels";
import {
  clearNimApiKey,
  getNimSettings,
  maskNimApiKey,
  NIM_API_KEYS_URL,
  NIM_SIGNIN_URL,
  setNimSettings,
} from "../lib/nimSettings";
import {
  sanitizeUsernameInput,
  USERNAME_HELP,
  validateUsername,
} from "../lib/username";

export default function ProfileSettingsModal({ onClose }) {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState(profile?.username || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const [nimKey, setNimKey] = useState(() => getNimSettings().apiKey);
  const [nimModel, setNimModel] = useState(
    () => getNimSettings().model || DEFAULT_NIM_MODEL
  );
  const [showKey, setShowKey] = useState(false);
  const [nimOk, setNimOk] = useState(null);

  useEffect(() => {
    setUsername(profile?.username || "");
    setDisplayName(profile?.display_name || "");
  }, [profile?.username, profile?.display_name]);

  useEffect(() => {
    const s = getNimSettings();
    setNimKey(s.apiKey);
    setNimModel(s.model || DEFAULT_NIM_MODEL);
  }, []);

  const localError = useMemo(() => {
    if (!username) return t("profile.pickUsername");
    if (username === profile?.username) return null;
    return validateUsername(username);
  }, [username, profile?.username, t]);

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
      setOk(t("profile.updated"));
    } catch (err) {
      setError(err.message || t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const saveNim = () => {
    setNimSettings({ apiKey: nimKey.trim(), model: nimModel });
    setNimOk(t("nim.saved"));
    setTimeout(() => setNimOk(null), 2500);
  };

  const removeNim = () => {
    clearNimApiKey();
    setNimKey("");
    setNimOk(t("nim.cleared"));
    setTimeout(() => setNimOk(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-elev p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              {t("profile.section")}
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              {t("profile.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={save}>
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
            {t("common.username")}
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-mute">
                @
              </span>
              <input
                required
                spellCheck={false}
                autoComplete="username"
                value={username}
                onChange={(e) =>
                  setUsername(sanitizeUsernameInput(e.target.value))
                }
                className="w-full rounded-xl border border-border bg-black/40 py-2.5 pl-8 pr-3 font-mono text-sm outline-none focus:border-accent/50"
              />
            </div>
            <p className="mt-1 text-[11px] text-mute">
              {t("profile.usernameRules")}
            </p>
            {localError && username !== profile?.username && (
              <p className="mt-1 text-[11px] text-amber-300/90">{localError}</p>
            )}
          </label>

          <label className="mb-4 block text-xs font-medium text-mute">
            {t("profile.displayName")}
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
            />
          </label>

          {profile?.email && (
            <p className="mb-4 text-[11px] text-mute">
              {t("profile.emailPrivate")}{" "}
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

          <div className="mb-6 flex justify-end gap-2">
            <button
              type="submit"
              disabled={busy || !!localError}
              className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold text-text disabled:opacity-50"
            >
              {busy ? "…" : t("common.save")}
            </button>
          </div>
        </form>

        {/* NVIDIA NIM */}
        <section className="border-t border-border pt-5">
          <div className="mb-3 flex items-start gap-2">
            <KeyRound size={16} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <h3 className="text-sm font-bold text-text">{t("nim.title")}</h3>
              <p className="mt-1 text-xs leading-relaxed text-dim">
                {t("nim.lead")}
              </p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <a
              href={NIM_SIGNIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-black/30 px-3 py-2 text-xs font-semibold text-dim hover:border-white/20 hover:text-text"
            >
              <ExternalLink size={12} />
              {t("nim.signIn")}
            </a>
            <a
              href={NIM_API_KEYS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent/35 bg-accent/15 px-3 py-2 text-xs font-semibold text-text hover:bg-accent/25"
            >
              <KeyRound size={12} />
              {t("nim.getKey")}
            </a>
          </div>

          <label className="mb-3 block text-xs font-medium text-mute">
            {t("nim.apiKey")}
            <div className="relative mt-1">
              <input
                type={showKey ? "text" : "password"}
                value={nimKey}
                onChange={(e) => setNimKey(e.target.value)}
                placeholder="nvapi-…"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-black/40 py-2.5 pl-3 pr-10 font-mono text-sm outline-none focus:border-accent/50"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-mute hover:text-text"
                title={showKey ? t("nim.hideKey") : t("nim.showKey")}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {nimKey && (
              <p className="mt-1 font-mono text-[10px] text-mute">
                {maskNimApiKey(nimKey)}
              </p>
            )}
            <p className="mt-1 text-[11px] text-mute">{t("nim.keyLocal")}</p>
          </label>

          <label className="mb-3 block text-xs font-medium text-mute">
            {t("nim.defaultModel")}
            <select
              value={nimModel}
              onChange={(e) => setNimModel(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
            >
              {NIM_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.blurb}
                </option>
              ))}
            </select>
          </label>

          {nimOk && (
            <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {nimOk}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {nimKey && (
              <button
                type="button"
                onClick={removeNim}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
              >
                <Trash2 size={12} />
                {t("nim.clear")}
              </button>
            )}
            <button
              type="button"
              onClick={saveNim}
              className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold text-text"
            >
              {t("nim.save")}
            </button>
          </div>
        </section>

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
