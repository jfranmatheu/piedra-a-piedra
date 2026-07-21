import {
  Bell,
  Crown,
  LogOut,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Swords,
  UserPlus,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";
import PlatformInviteModal from "../components/PlatformInviteModal";
import ProfileSettingsModal from "../components/ProfileSettingsModal";
import ProjectSettingsModal from "../components/ProjectSettingsModal";
import { ProgressBar } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import * as api from "../lib/api";
import { levelFromXp } from "../lib/utils";

const ROLE_ACCENT = {
  owner: { bar: "#f59e0b", glow: "rgba(245,158,11,0.22)", labelKey: "roleOwner" },
  admin: { bar: "#a78bfa", glow: "rgba(167,139,250,0.2)", labelKey: "roleAdmin" },
  member: { bar: "#34d399", glow: "rgba(52,211,153,0.18)", labelKey: "roleMember" },
};

const CARD_TINTS = [
  "from-amber-500/15 via-transparent to-violet-500/10",
  "from-emerald-500/15 via-transparent to-sky-500/10",
  "from-violet-500/15 via-transparent to-rose-500/10",
  "from-sky-500/15 via-transparent to-amber-500/10",
  "from-rose-500/12 via-transparent to-emerald-500/10",
];

function roleMeta(role) {
  return ROLE_ACCENT[role] || ROLE_ACCENT.member;
}

function ProjectCard({ project, index, t, onManage }) {
  const st = project.stats || {
    taskTotal: 0,
    taskDone: 0,
    totalXp: 0,
    earnedXp: 0,
    stoneCount: 0,
    pct: 0,
  };
  const lvl = levelFromXp(st.earnedXp || 0);
  const accent = roleMeta(project.myRole);
  const tint = CARD_TINTS[index % CARD_TINTS.length];
  const complete = st.taskTotal > 0 && st.taskDone === st.taskTotal;

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${tint} from-elev to-[#0c0c14] p-5 shadow-xl transition duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-accent/10`}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full blur-3xl"
        style={{ background: accent.glow }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <button
        type="button"
        title={t("projects.manageProject")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onManage(project);
        }}
        className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/40 text-mute opacity-80 transition hover:border-accent/40 hover:text-text group-hover:opacity-100"
      >
        <Settings size={15} />
      </button>

      <Link to={`/p/${project.id}`} className="relative block pr-10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
            style={{
              color: accent.bar,
              borderColor: `${accent.bar}55`,
              background: `${accent.bar}18`,
            }}
          >
            {project.myRole === "owner" && <Crown size={10} />}
            {t(`projects.${accent.labelKey}`)}
          </span>
          {complete && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <Sparkles size={10} /> {t("projects.complete")}
            </span>
          )}
        </div>

        <h3 className="text-xl font-extrabold tracking-tight text-text">
          {project.name}
        </h3>
        {project.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-dim">
            {project.description}
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-mute/80">{t("projects.openBoard")} →</p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/8 bg-black/35 px-2.5 py-2 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
              {t("projects.level", { n: lvl.level })}
            </div>
            <div className="mt-0.5 text-lg font-black text-accent">{lvl.level}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/35 px-2.5 py-2 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
              {t("projects.xpLabel")}
            </div>
            <div className="mt-0.5 text-sm font-bold text-amber-200">
              {st.earnedXp}
              <span className="text-mute">/{st.totalXp || 0}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/35 px-2.5 py-2 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
              %
            </div>
            <div className="mt-0.5 text-lg font-black text-text">{st.pct}%</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-medium text-dim">{t("projects.progress")}</span>
            <span className="font-mono text-mute">
              {st.taskTotal
                ? t("projects.tasksDone", {
                    done: st.taskDone,
                    total: st.taskTotal,
                  })
                : t("projects.noTasksYet")}
            </span>
          </div>
          <ProgressBar pct={st.pct} color={accent.bar} className="h-2" />
          <div className="mt-1.5">
            <ProgressBar pct={lvl.pct} color="#fbbf24" className="h-1 opacity-80" />
            <div className="mt-1 flex justify-between font-mono text-[9px] text-mute">
              <span>
                LVL {lvl.level} → {lvl.next} XP
              </span>
              <span>{t("projects.stones", { n: st.stoneCount })}</span>
            </div>
          </div>
        </div>

        {project.start_date && (
          <p className="mt-3 font-mono text-[10px] text-mute">
            {t("projects.start")} {project.start_date}
          </p>
        )}
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageProject, setManageProject] = useState(null);

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
    try {
      const p = await api.createProject({
        name: name.trim(),
        start_date: startDate || null,
      });
      setShowCreate(false);
      setName("");
      await load();
      window.location.href = `/p/${p.id}`;
    } catch (err) {
      setError(err.message);
    }
  };

  const pendingInvites = notifications.filter(
    (n) => n.type === "project_invite" && !n.read_at
  );

  const showInviteBtn = canInviteToPlatform || isPlatformAdmin;

  const hubStats = useMemo(() => {
    let earned = 0;
    let total = 0;
    let done = 0;
    let tasks = 0;
    for (const p of projects) {
      const s = p.stats || {};
      earned += s.earnedXp || 0;
      total += s.totalXp || 0;
      done += s.taskDone || 0;
      tasks += s.taskTotal || 0;
    }
    return {
      earned,
      total,
      done,
      tasks,
      level: levelFromXp(earned),
      active: projects.length,
    };
  }, [projects]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-bg">
      {/* ambient */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[90px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-violet-600/10 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <header className="relative z-20 border-b border-white/5 bg-black/30 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight hover:text-accent"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/30 bg-accent/15 text-base">
                🪨
              </span>
              Piedra a Piedra
            </Link>
            <div className="mt-1 text-sm text-dim">
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-accent/35 bg-accent/15 px-3 py-2 text-sm font-semibold text-text hover:bg-accent/25"
              >
                <UserPlus size={14} /> {t("common.invitations")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-dim hover:bg-white/5"
              title={t("common.profile")}
            >
              <Settings size={14} /> {t("common.profile")}
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-dim hover:bg-white/5"
            >
              <LogOut size={14} /> {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl space-y-8 px-4 py-8">
        {/* Hero hub */}
        <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-elev via-[#12101a] to-[#0a0a12] p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
                <Swords size={11} /> HQ
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {t("projects.yourProjects")}
              </h1>
              <p className="mt-1 text-sm text-dim">{t("projects.hubSubtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent/20 px-4 py-2.5 text-sm font-bold shadow-lg shadow-amber-500/10 hover:bg-accent/30"
            >
              <Plus size={16} /> {t("projects.new")}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-mute">
                <Zap size={12} className="text-accent" /> LVL
              </div>
              <div className="mt-1 text-2xl font-black text-accent">
                {hubStats.level.level}
              </div>
              <ProgressBar pct={hubStats.level.pct} className="mt-2 h-1" />
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
                {t("projects.totalXpEarned")}
              </div>
              <div className="mt-1 text-2xl font-black text-amber-200">
                {hubStats.earned}
                <span className="text-sm font-semibold text-mute">
                  /{hubStats.total}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
                {t("projects.quests")}
              </div>
              <div className="mt-1 text-2xl font-black text-text">
                {hubStats.active}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
                {t("projects.progress")}
              </div>
              <div className="mt-1 text-2xl font-black text-emerald-300">
                {hubStats.tasks
                  ? Math.round((hubStats.done / hubStats.tasks) * 100)
                  : 0}
                %
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-mute">
                {hubStats.done}/{hubStats.tasks}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        {pendingInvites.length > 0 && (
          <section className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Bell size={16} className="text-accent" />{" "}
              {t("projects.projectInvites")}
            </h2>
            <ul className="space-y-2">
              {pendingInvites.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="text-xs text-dim">{n.body}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300"
                      onClick={async () => {
                        await api.acceptProjectInvite(n.data.invite_id);
                        await load();
                      }}
                    >
                      {t("projects.accept")}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-border px-3 py-1.5 text-xs text-dim"
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
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-dim">
              <div className="animate-bounce text-3xl">🪨</div>
              <p>{t("common.loading")}</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
              <div className="mb-3 text-4xl">🪨</div>
              <p className="text-base font-semibold text-text">
                {t("projects.empty")}
              </p>
              <p className="mt-2 text-sm text-mute">{t("projects.emptyCta")}</p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent/20 px-5 py-2.5 text-sm font-bold"
              >
                <Plus size={16} /> {t("projects.new")}
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((p, i) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  index={i}
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
              className="w-full max-w-md rounded-3xl border border-white/10 bg-elev p-6 shadow-2xl"
            >
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                + quest
              </div>
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
              <label className="mb-4 block text-xs text-mute">
                {t("common.startDate")}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
                />
              </label>
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
                  className="rounded-xl border border-accent/40 bg-accent/20 px-4 py-2 text-sm font-semibold text-text"
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
