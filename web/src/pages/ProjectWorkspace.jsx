import { ArrowLeft, Loader2, Settings, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AiEditPanel from "../components/AiEditPanel";
import KanbanView from "../components/KanbanView";
import PanelView from "../components/PanelView";
import ProjectSettingsModal from "../components/ProjectSettingsModal";
import TimelineView from "../components/TimelineView";
import ViewToggle from "../components/ViewToggle";
import { ProgressBar } from "../components/ui";
import { AppProvider, useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import * as api from "../lib/api";
import {
  hasNimApiKey,
  subscribeNimSettings,
} from "../lib/nimSettings";
import { notifyPromise } from "../lib/toast";

function WorkspaceInner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const {
    loading,
    bootError,
    viewMode,
    toasts,
    project,
    members,
    projectId,
    toast,
    reload,
    stats,
  } = useApp();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [nimReady, setNimReady] = useState(() => hasNimApiKey());
  const [username, setUsername] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    setNimReady(hasNimApiKey());
    return subscribeNimSettings(() => setNimReady(hasNimApiKey()));
  }, []);

  const myMember = members?.find((m) => m.id === user?.id);
  const myRole =
    myMember?.role ||
    (project?.owner_id === user?.id ? "owner" : null);
  const canManage = myRole === "owner" || myRole === "admin";

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <div className="animate-bounce text-4xl">🪨</div>
        <p className="text-dim">{t("workspace.loading")}</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <h2 className="mb-2 text-lg font-bold text-rose-300">
          {t("workspace.loadFailed")}
        </h2>
        <p className="text-dim">{bootError}</p>
        <Link to="/projects" className="mt-4 inline-block text-sm text-accent">
          {t("workspace.backProjects")}
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Top bar: nav + views + LVL/XP + actions */}
      <div className="fixed left-0 right-0 top-0 z-[60] flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/80 bg-black/55 px-3 py-1.5 backdrop-blur-md">
        <Link
          to="/projects"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-mute hover:text-text"
        >
          <ArrowLeft size={14} /> {t("common.projects")}
        </Link>

        <ViewToggle />

        <span className="min-w-0 flex-1 truncate text-center text-xs font-semibold sm:text-sm">
          {project?.name}
        </span>

        {stats && (
          <div className="flex min-w-[9.5rem] max-w-[14rem] shrink-0 flex-col gap-0.5 rounded-lg border border-border bg-black/40 px-2 py-1">
            <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
              <span className="rounded bg-accent/15 px-1.5 py-0.5 font-semibold text-accent">
                LVL {stats.level.level}
              </span>
              <span className="truncate text-dim">
                {stats.earnedXp}/{stats.totalXp} XP · {stats.pct.toFixed(0)}%
              </span>
            </div>
            <ProgressBar pct={stats.level.pct} className="h-1" />
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          {nimReady && (
            <button
              type="button"
              onClick={() => setAiOpen((v) => !v)}
              className={[
                "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition",
                aiOpen
                  ? "border-accent/50 bg-accent/20 text-accent"
                  : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20",
              ].join(" ")}
              title={t("ai.editWithAi")}
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">{t("ai.editWithAi")}</span>
              <span className="sm:hidden">IA</span>
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-mute hover:text-text"
            >
              <UserPlus size={12} /> {t("common.invite")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-mute hover:text-text"
            title={t("workspace.settings")}
          >
            <Settings size={12} /> {t("workspace.settings")}
          </button>
        </div>
      </div>
      <div className={`pt-11 sm:pt-10 ${aiOpen ? "pb-52" : ""}`}>
        {viewMode === "timeline" && <TimelineView />}
        {viewMode === "sidebar" && <PanelView />}
        {viewMode === "kanban" && <KanbanView />}
      </div>

      <AiEditPanel open={aiOpen} onClose={() => setAiOpen(false)} />

      <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-xl border border-border-strong bg-[rgba(18,18,28,0.95)] px-4 py-3 text-sm font-medium shadow-xl"
          >
            {t.msg}
          </div>
        ))}
      </div>

      {inviteOpen && canManage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <form
            className="w-full max-w-sm rounded-2xl border border-border bg-elev p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (inviting) return;
              const uname = username.trim().toLowerCase().replace(/^@/, "");
              if (!uname) return;
              setInviting(true);
              try {
                await notifyPromise(
                  api.inviteToProject(projectId, uname),
                  {
                    loading: "Enviando invitación…",
                    success: `Invitación enviada a @${uname}`,
                    error: (err) => err.message || "Error al invitar",
                  }
                );
                setInviteOpen(false);
                setUsername("");
              } catch {
                /* toast */
              } finally {
                setInviting(false);
              }
            }}
          >
            <h3 className="mb-3 font-bold">{t("workspace.inviteProject")}</h3>
            <p className="mb-3 text-xs text-mute">
              {t("workspace.inviteByUsername")}{" "}
              {members.map((m) => `@${m.username}`).join(", ") || "—"}
            </p>
            <input
              required
              disabled={inviting}
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mb-3 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none disabled:opacity-50"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={inviting}
                onClick={() => setInviteOpen(false)}
                className="rounded-xl px-3 py-2 text-sm text-dim disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={inviting || !username.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent/20 px-3 py-2 text-sm font-semibold text-accent disabled:opacity-50"
              >
                {inviting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Enviando…
                  </>
                ) : (
                  t("common.invite")
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {settingsOpen && (
        <ProjectSettingsModal
          projectId={projectId}
          project={project}
          myRole={myRole}
          onClose={() => setSettingsOpen(false)}
          onChanged={() => reload()}
        />
      )}
    </>
  );
}

export default function ProjectWorkspace() {
  return (
    <AppProvider>
      <WorkspaceInner />
    </AppProvider>
  );
}
