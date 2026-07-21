import { ListOrdered, Mail, Shield, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

const TABS = {
  invite: "Invitar",
  quota: "Asignar cupo",
  waitlist: "Lista de espera",
};

/**
 * Modal de invitaciones a la plataforma (header).
 */
export default function PlatformInviteModal({ onClose }) {
  const {
    session,
    isPlatformAdmin,
    canInviteToPlatform,
    invitesRemaining,
    refreshProfile,
  } = useAuth();

  const [tab, setTab] = useState("invite");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteGrantQuota, setInviteGrantQuota] = useState(3);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [quotaTarget, setQuotaTarget] = useState("");
  const [quotaValue, setQuotaValue] = useState(3);
  const [quotaMsg, setQuotaMsg] = useState(null);
  const [batchCount, setBatchCount] = useState(5);
  const [batchQuota, setBatchQuota] = useState(3);
  const [batchMsg, setBatchMsg] = useState(null);
  const [waitlist, setWaitlist] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const loadWaitlist = useCallback(async () => {
    if (!isPlatformAdmin || !session?.access_token) return;
    try {
      const data = await api.listWaitlist(session.access_token);
      setWaitlist(data.rows || []);
      setPendingCount(data.pendingCount ?? 0);
    } catch (e) {
      setBatchMsg(e.message);
    }
  }, [isPlatformAdmin, session?.access_token]);

  useEffect(() => {
    if (tab === "waitlist") loadWaitlist();
  }, [tab, loadWaitlist]);

  const invitePlatform = async (e) => {
    e.preventDefault();
    setInviteMsg(null);
    setBusy(true);
    try {
      const opts = isPlatformAdmin
        ? { grantQuota: Number(inviteGrantQuota) || 0 }
        : {};
      const res = await api.invitePlatformUser(
        inviteEmail,
        session.access_token,
        opts
      );
      const grant = res.grantQuota ?? inviteGrantQuota;
      setInviteMsg(
        `Enviado a ${inviteEmail} (cupo del invitado: ${grant})` +
          (res.unlimited
            ? ""
            : res.invitesRemaining != null
              ? ` · Te quedan ${res.invitesRemaining}`
              : "")
      );
      setInviteEmail("");
      await refreshProfile();
    } catch (err) {
      setInviteMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const assignQuota = async (e) => {
    e.preventDefault();
    setQuotaMsg(null);
    const raw = quotaTarget.trim();
    if (!raw) {
      setQuotaMsg("Indica email o @username");
      return;
    }
    const isEmail = raw.includes("@") && !raw.startsWith("@");
    setBusy(true);
    try {
      const res = await api.setPlatformInviteQuota(
        {
          quota: Number(quotaValue) || 0,
          ...(isEmail ? { email: raw } : { username: raw.replace(/^@/, "") }),
        },
        session.access_token
      );
      setQuotaMsg(
        `@${res.user?.username || raw} → ${res.user?.platform_invites_remaining} invitaciones` +
          (res.previousQuota != null ? ` (antes ${res.previousQuota})` : "")
      );
      setQuotaTarget("");
    } catch (err) {
      setQuotaMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const runBatch = async (e) => {
    e.preventDefault();
    setBatchMsg(null);
    setBusy(true);
    try {
      const res = await api.batchInviteWaitlist(
        {
          count: Number(batchCount) || 1,
          grantQuota: Number(batchQuota) || 0,
        },
        session.access_token
      );
      const fails = (res.results || []).filter((r) => !r.ok);
      setBatchMsg(
        `Invitados ${res.invited}/${res.requested}` +
          (fails.length
            ? `. Fallos: ${fails.map((f) => f.email).join(", ")}`
            : "")
      );
      await loadWaitlist();
    } catch (err) {
      setBatchMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    ...(canInviteToPlatform ? ["invite"] : []),
    ...(isPlatformAdmin ? ["quota", "waitlist"] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(880px,94dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-elev shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Plataforma
            </div>
            <h2 className="text-lg font-bold tracking-tight">Invitaciones</h2>
            {!isPlatformAdmin && canInviteToPlatform && (
              <p className="text-xs text-mute">
                Te quedan <span className="text-text">{invitesRemaining}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </header>

        {tabs.length > 1 && (
          <div className="flex shrink-0 gap-1 border-b border-border px-3 pt-2">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition ${
                  tab === t
                    ? "bg-white/5 text-accent"
                    : "text-mute hover:text-dim"
                }`}
              >
                {TABS[t]}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "invite" && canInviteToPlatform && (
            <form onSubmit={invitePlatform} className="space-y-3">
              <p className="text-xs text-mute">
                {isPlatformAdmin
                  ? "Invitación ilimitada. Elige cuántas invitaciones tendrá el nuevo usuario."
                  : `Consumes 1 de tus ${invitesRemaining}. El invitado recibe 3.`}
              </p>
              <label className="block text-xs text-mute">
                Email
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
                  placeholder="persona@email.com"
                />
              </label>
              {isPlatformAdmin && (
                <label className="block text-xs text-mute">
                  Cupo del invitado
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={inviteGrantQuota}
                    onChange={(e) => setInviteGrantQuota(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none"
                  />
                </label>
              )}
              {inviteMsg && (
                <p className="rounded-lg border border-border bg-black/25 px-3 py-2 text-sm text-dim">
                  {inviteMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/20 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                <Mail size={14} /> Enviar invitación
              </button>
            </form>
          )}

          {tab === "quota" && isPlatformAdmin && (
            <form onSubmit={assignQuota} className="space-y-3">
              <p className="text-xs text-mute">
                Usuario ya registrado. El número es absoluto (no se suma).
              </p>
              <label className="block text-xs text-mute">
                Email o @username
                <input
                  required
                  value={quotaTarget}
                  onChange={(e) => setQuotaTarget(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none"
                  placeholder="amigo@mail.com o @user"
                />
              </label>
              <label className="block text-xs text-mute">
                Nº de invitaciones
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={quotaValue}
                  onChange={(e) => setQuotaValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none"
                />
              </label>
              {quotaMsg && (
                <p className="rounded-lg border border-border bg-black/25 px-3 py-2 text-sm text-dim">
                  {quotaMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/20 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                <Shield size={14} /> Asignar cupo
              </button>
            </form>
          )}

          {tab === "waitlist" && isPlatformAdmin && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-black/25 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ListOrdered size={14} className="text-accent" />
                  {pendingCount} en espera
                </div>
                <p className="mt-1 text-[11px] text-mute">
                  Orden: más antiguos primero. El batch invita por fecha de
                  inscripción.
                </p>
              </div>

              <form onSubmit={runBatch} className="flex flex-wrap items-end gap-2">
                <label className="w-24 text-xs text-mute">
                  Cuántos (N)
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none"
                  />
                </label>
                <label className="w-28 text-xs text-mute">
                  Cupo cada uno
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={batchQuota}
                    onChange={(e) => setBatchQuota(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || pendingCount === 0}
                  className="rounded-xl border border-accent/40 bg-accent/20 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  Invitar batch
                </button>
              </form>
              {batchMsg && (
                <p className="rounded-lg border border-border bg-black/25 px-3 py-2 text-sm text-dim">
                  {batchMsg}
                </p>
              )}

              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                {waitlist.length === 0 ? (
                  <li className="text-mute">Lista vacía</li>
                ) : (
                  waitlist.map((r, i) => (
                    <li
                      key={r.id}
                      className="flex justify-between gap-2 rounded-lg border border-border/80 bg-black/20 px-2.5 py-1.5"
                    >
                      <span className="truncate font-mono text-dim">
                        <span className="text-mute">#{i + 1}</span> {r.email}
                      </span>
                      <span className="shrink-0 text-mute">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString("es-ES")
                          : ""}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {!canInviteToPlatform && !isPlatformAdmin && (
            <p className="text-sm text-dim">
              No tienes cupo de invitaciones. Pide al admin de la plataforma.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
