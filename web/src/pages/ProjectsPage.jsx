import {
  Bell,
  Crown,
  FileUp,
  LogOut,
  Plus,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";
import PlatformInviteModal from "../components/PlatformInviteModal";
import ProfileSettingsModal from "../components/ProfileSettingsModal";
import ProjectSettingsModal from "../components/ProjectSettingsModal";
import { ProgressBar } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import * as api from "../lib/api";
import { parseStones } from "../lib/stonesFormat";
import { notify, notifyPromise } from "../lib/toast";
import { levelFromXp } from "../lib/utils";

const ROLE_META = {
  owner: { color: "#f59e0b", labelKey: "roleOwner" },
  admin: { color: "#a78bfa", labelKey: "roleAdmin" },
  member: { color: "#34d399", labelKey: "roleMember" },
};

function ProjectCard({ project, t, onManage }) {
  const st = project.stats || {
    taskTotal: 0,
    taskDone: 0,
    totalXp: 0,
    earnedXp: 0,
    stoneCount: 0,
    pct: 0,
  };
  const lvl = levelFromXp(st.earnedXp || 0);
  const role = ROLE_META[project.myRole] || ROLE_META.member;
  const complete = st.taskTotal > 0 && st.taskDone === st.taskTotal;

  return (
    <div className="group relative rounded-2xl border border-border bg-elev p-5 transition hover:border-white/15 hover:bg-[#12121c]">
      <button
        type="button"
        title={t("projects.manageProject")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onManage(project);
        }}
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg border border-border text-mute opacity-70 transition hover:border-border-strong hover:text-text group-hover:opacity-100"
      >
        <Settings size={14} />
      </button>

      <Link to={`/p/${project.id}`} className="block pr-9">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
            style={{
              color: role.color,
              background: `${role.color}18`,
            }}
          >
            {project.myRole === "owner" && <Crown size={10} />}
            {t(`projects.${role.labelKey}`)}
          </span>
          {complete && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <Sparkles size={10} /> {t("projects.complete")}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold tracking-tight text-text">
          {project.name}
        </h3>
        {project.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-dim">
            {project.description}
          </p>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
              {t("projects.level", { n: lvl.level })}
            </div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-amber-200/90">
              {st.earnedXp}
              <span className="text-mute"> / {st.totalXp || 0} XP</span>
            </div>
          </div>
          <div className="text-right font-mono text-2xl font-bold tabular-nums text-text">
            {st.pct}
            <span className="text-sm text-mute">%</span>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-[11px] text-mute">
            <span>{t("projects.progress")}</span>
            <span>
              {st.taskTotal
                ? t("projects.tasksDone", {
                    done: st.taskDone,
                    total: st.taskTotal,
                  })
                : t("projects.noTasksYet")}
            </span>
          </div>
          <ProgressBar pct={st.pct} color={role.color} className="h-1.5" />
          <div className="mt-1.5 font-mono text-[10px] text-mute">
            {t("projects.stones", { n: st.stoneCount })}
            {project.start_date || project.end_date
              ? ` · ${project.start_date || "…"} → ${project.end_date || "…"}`
              : ""}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function ProjectsPage() {
  const {
    profile,
    isPlatformAdmin,
    canInviteToPlatform,
    invitesRemaining,
    signOut,
  } = useAuth();
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageProject, setManageProject] = useState(null);
  const [importing, setImporting] = useState(false);
  const importRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, n] = await Promise.all([
        api.listMyProjects(),
        api.listNotifications(),
      ]);
      setProjects(p);
      setNotifications(n);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (startDate && endDate && endDate < startDate) {
      notify.error("La fecha fin no puede ser anterior al inicio");
      return;
    }
    try {
      const p = await api.createProject({
        name: name.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
      });
      notify.success("Proyecto creado");
      setShowCreate(false);
      setName("");
      setStartDate("");
      setEndDate("");
      await load();
      window.location.href = `/p/${p.id}`;
    } catch (err) {
      setError(err.message);
      notify.error(err.message);
    }
  };

  const pendingInvites = notifications.filter(
    (n) => n.type === "project_invite" && !n.read_at
  );
  const showInviteBtn = canInviteToPlatform || isPlatformAdmin;

  const onImportStones = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseStones(text);
      if (!parsed.stones?.length && !parsed.title) {
        throw new Error("El archivo .stones no tiene contenido reconocible");
      }
      const project = await notifyPromise(api.importProjectFromStones(parsed), {
        loading: "Importando .stones…",
        success: (p) => `Proyecto «${p.name}» importado`,
        error: (err) => err.message || "Error al importar",
      });
      await load();
      window.location.href = `/p/${project.id}`;
    } catch (err) {
      if (err?.message) notify.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-elev/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/"
              className="text-lg font-extrabold tracking-tight hover:text-accent"
            >
              🪨 Piedra a Piedra
            </Link>
            <div className="mt-0.5 text-sm text-dim">
              {t("projects.hello")}{" "}
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="font-semibold text-text underline-offset-2 hover:underline"
                title={t("projects.editUsername")}
              >
                @{profile?.username}
              </button>
              {isPlatformAdmin && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  <Shield size={10} /> {t("common.admin")}
                </span>
              )}
              {!isPlatformAdmin && invitesRemaining > 0 && (
                <span className="ml-2 font-mono text-[10px] text-mute">
                  {invitesRemaining} {t("projects.invShort")}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher />
            {showInviteBtn && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-accent/35 bg-accent/15 px-3 py-2 text-sm font-semibold hover:bg-accent/25"
              >
                <UserPlus size={14} /> {t("common.invitations")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-dim hover:bg-white/5"
              title={t("common.profile")}
            >
              <Settings size={14} /> {t("common.profile")}
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-dim hover:bg-white/5"
            >
              <LogOut size={14} /> {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        {pendingInvites.length > 0 && (
          <section className="rounded-2xl border border-border bg-elev p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Bell size={15} className="text-accent" />
              {t("projects.projectInvites")}
            </h2>
            <ul className="space-y-2">
              {pendingInvites.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-black/20 px-3 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="text-xs text-dim">{n.body}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300"
                      onClick={async () => {
                        await api.acceptProjectInvite(n.data.invite_id);
                        await load();
                      }}
                    >
                      {t("projects.accept")}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-dim"
                      onClick={async () => {
                        await api.declineProjectInvite(n.data.invite_id);
                        await load();
                      }}
                    >
                      {t("projects.reject")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {t("projects.yourProjects")}
              </h1>
              <p className="text-sm text-mute">{t("projects.hubSubtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={importRef}
                type="file"
                accept=".stones,text/plain"
                className="hidden"
                onChange={onImportStones}
              />
              <button
                type="button"
                disabled={importing}
                onClick={() => importRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5 disabled:opacity-50"
              >
                <FileUp size={16} />
                {importing ? "…" : "Importar .stones"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold hover:bg-accent/30"
              >
                <Plus size={16} /> {t("projects.new")}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-12 text-center text-dim">{t("common.loading")}</p>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
              <p className="font-semibold text-text">{t("projects.empty")}</p>
              <p className="mt-1 text-sm text-mute">{t("projects.emptyCta")}</p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/20 px-4 py-2 text-sm font-semibold"
              >
                <Plus size={16} /> {t("projects.new")}
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  t={t}
                  onManage={setManageProject}
                />
              ))}
            </div>
          )}
        </section>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <form
              onSubmit={create}
              className="w-full max-w-md rounded-2xl border border-border bg-elev p-6 shadow-2xl"
            >
              <h3 className="mb-4 text-lg font-bold">
                {t("projects.newProject")}
              </h3>
              <label className="mb-3 block text-xs text-mute">
                {t("common.name")}
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
                />
              </label>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <label className="block text-xs text-mute">
                  {t("common.startDate")}
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
                  />
                </label>
                <label className="block text-xs text-mute">
                  {t("common.endDate")}
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl px-3 py-2 text-sm text-dim"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="rounded-xl border border-accent/40 bg-accent/20 px-4 py-2 text-sm font-semibold"
                >
                  {t("common.create")}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {profileOpen && (
        <ProfileSettingsModal onClose={() => setProfileOpen(false)} />
      )}
      {inviteOpen && (
        <PlatformInviteModal onClose={() => setInviteOpen(false)} />
      )}
      {manageProject && (
        <ProjectSettingsModal
          projectId={manageProject.id}
          project={manageProject}
          myRole={manageProject.myRole}
          onClose={() => setManageProject(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}
