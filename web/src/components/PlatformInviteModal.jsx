import { ListOrdered, Loader2, Mail, Shield, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import * as api from "../lib/api";
import { notify, notifyPromise } from "../lib/toast";

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
  const { t } = useI18n();

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
    if (busy) return;
    setInviteMsg(null);
    setBusy(true);
    const email = inviteEmail.trim();
    try {
      const opts = isPlatformAdmin
        ? { grantQuota: Number(inviteGrantQuota) || 0 }
        : {};
      const res = await notifyPromise(
        api.invitePlatformUser(email, session.access_token, opts),
        {
          loading: "Enviando invitación…",
          success: (r) =>
            t("platformInvite.sent", {
              email,
              grant: r.grantQuota ?? inviteGrantQuota,
            }),
          error: (err) => err.message || "Error al invitar",
        }
      );
      setInviteMsg(
        t("platformInvite.sent", {
          email,
          grant: res.grantQuota ?? inviteGrantQuota,
        }) +
          (res.unlimited
            ? ""
            : res.invitesRemaining != null
              ? t("platformInvite.left", { n: res.invitesRemaining })
              : "")
      );
      setInviteEmail("");
      await refreshProfile();
    } catch {
      /* toast shown */
    } finally {
      setBusy(false);
    }
  };

  const assignQuota = async (e) => {
    e.preventDefault();
    if (busy) return;
    setQuotaMsg(null);
    const raw = quotaTarget.trim();
    if (!raw) {
      setQuotaMsg(t("platformInvite.indicateEmailUser"));
      notify.error(t("platformInvite.indicateEmailUser"));
      return;
    }
    const isEmail = raw.includes("@") && !raw.startsWith("@");
    setBusy(true);
    try {
      const res = await notifyPromise(
        api.setPlatformInviteQuota(
          {
            quota: Number(quotaValue) || 0,
            ...(isEmail ? { email: raw } : { username: raw.replace(/^@/, "") }),
          },
          session.access_token
        ),
        {
          loading: "Asignando cupo…",
          success: (r) =>
            t("platformInvite.quotaSet", {
              user: r.user?.username || raw,
              n: r.user?.platform_invites_remaining,
            }),
          error: (err) => err.message || "Error",
        }
      );
      setQuotaMsg(
        t("platformInvite.quotaSet", {
          user: res.user?.username || raw,
          n: res.user?.platform_invites_remaining,
        }) +
          (res.previousQuota != null
            ? t("platformInvite.before", { n: res.previousQuota })
            : "")
      );
      setQuotaTarget("");
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const runBatch = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBatchMsg(null);
    setBusy(true);
    try {
      const res = await notifyPromise(
        api.batchInviteWaitlist(
          {
            count: Number(batchCount) || 1,
            grantQuota: Number(batchQuota) || 0,
          },
          session.access_token
        ),
        {
          loading: "Enviando invitaciones…",
          success: (r) =>
            t("platformInvite.batchResult", {
              ok: r.invited,
              req: r.requested,
            }),
          error: (err) => err.message || "Error en batch",
        }
      );
      const fails = (res.results || []).filter((r) => !r.ok);
      setBatchMsg(
        t("platformInvite.batchResult", {
          ok: res.invited,
          req: res.requested,
        }) +
          (fails.length
            ? t("platformInvite.fails", {
                list: fails.map((f) => f.email).join(", "),
              })
            : "")
      );
      await loadWaitlist();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    ...(canInviteToPlatform ? ["invite"] : []),
    ...(isPlatformAdmin ? ["quota", "waitlist"] : []),
  ];
  const tabLabel = {
    invite: t("platformInvite.tabInvite"),
    quota: t("platformInvite.tabQuota"),
    waitlist: t("platformInvite.tabWaitlist"),
  };

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
            <h2 className="text-lg font-bold tracking-tight">
              {t("platformInvite.title")}
            </h2>
            {!isPlatformAdmin && canInviteToPlatform && (
              <p className="text-xs text-mute">
                {t("platformInvite.remaining", { n: invitesRemaining })}
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
            {tabs.map((tabId) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setTab(tabId)}
                className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition ${
                  tab === tabId
                    ? "bg-white/5 text-accent"
                    : "text-mute hover:text-dim"
                }`}
              >
                {tabLabel[tabId]}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "invite" && canInviteToPlatform && (
            <form onSubmit={invitePlatform} className="space-y-3">
              <p className="text-xs text-mute">
                {isPlatformAdmin
                  ? t("platformInvite.adminUnlimited")
                  : t("platformInvite.userConsume", { n: invitesRemaining })}
              </p>
              <label className="block text-xs text-mute">
                {t("common.email")}
                <input
                  type="email"
                  required
                  disabled={busy}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50 disabled:opacity-50"
                  placeholder="name@email.com"
                />
              </label>
              {isPlatformAdmin && (
                <label className="block text-xs text-mute">
                  {t("platformInvite.inviteeQuota")}
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    disabled={busy}
                    value={inviteGrantQuota}
                    onChange={(e) => setInviteGrantQuota(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none disabled:opacity-50"
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
                disabled={busy || !inviteEmail.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/20 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Enviando invitación…
                  </>
                ) : (
                  <>
                    <Mail size={14} /> {t("platformInvite.sendInvite")}
                  </>
                )}
              </button>
            </form>
          )}

          {tab === "quota" && isPlatformAdmin && (
            <form onSubmit={assignQuota} className="space-y-3">
              <p className="text-xs text-mute">{t("platformInvite.quotaHelp")}</p>
              <label className="block text-xs text-mute">
                {t("platformInvite.emailOrUser")}
                <input
                  required
                  disabled={busy}
                  value={quotaTarget}
                  onChange={(e) => setQuotaTarget(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none disabled:opacity-50"
                  placeholder="user@mail.com or @user"
                />
              </label>
              <label className="block text-xs text-mute">
                {t("platformInvite.numInvites")}
                <input
                  type="number"
                  min={0}
                  max={1000}
                  disabled={busy}
                  value={quotaValue}
                  onChange={(e) => setQuotaValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none disabled:opacity-50"
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
                {busy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    …
                  </>
                ) : (
                  <>
                    <Shield size={14} /> {t("platformInvite.assignQuota")}
                  </>
                )}
              </button>
            </form>
          )}

          {tab === "waitlist" && isPlatformAdmin && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-black/25 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ListOrdered size={14} className="text-accent" />
                  {t("platformInvite.waiting", { n: pendingCount })}
                </div>
                <p className="mt-1 text-[11px] text-mute">
                  {t("platformInvite.waitOrder")}
                </p>
              </div>

              <form onSubmit={runBatch} className="flex flex-wrap items-end gap-2">
                <label className="w-24 text-xs text-mute">
                  {t("platformInvite.howMany")}
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
                  {t("platformInvite.quotaEach")}
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
                  {t("platformInvite.batchInvite")}
                </button>
              </form>
              {batchMsg && (
                <p className="rounded-lg border border-border bg-black/25 px-3 py-2 text-sm text-dim">
                  {batchMsg}
                </p>
              )}

              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                {waitlist.length === 0 ? (
                  <li className="text-mute">{t("platformInvite.listEmpty")}</li>
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
                          ? new Date(r.created_at).toLocaleDateString()
                          : ""}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {!canInviteToPlatform && !isPlatformAdmin && (
            <p className="text-sm text-dim">{t("platformInvite.noQuota")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
