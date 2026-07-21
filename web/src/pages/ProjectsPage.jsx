import { Bell, LogOut, Plus, Settings, Shield, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import PlatformInviteModal from "../components/PlatformInviteModal";
import ProfileSettingsModal from "../components/ProfileSettingsModal";
import ProjectSettingsModal from "../components/ProjectSettingsModal";

export default function ProjectsPage() {
  const {
    profile,
    isPlatformAdmin,
    canInviteToPlatform,
    invitesRemaining,
    signOut,
  } = useAuth();
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

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-elev/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/"
              className="text-lg font-extrabold tracking-tight hover:text-accent"
            >
              🪨 Piedra a Piedra
            </Link>
            <div className="text-sm text-dim">
              Hola,{" "}
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="font-semibold text-text underline-offset-2 hover:underline"
                title="Editar username"
              >
                @{profile?.username}
              </button>
              {isPlatformAdmin && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  <Shield size={10} /> admin
                </span>
              )}
              {!isPlatformAdmin && invitesRemaining > 0 && (
                <span className="ml-2 font-mono text-[10px] text-mute">
                  {invitesRemaining} inv.
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showInviteBtn && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-accent/35 bg-accent/15 px-3 py-2 text-sm font-semibold text-text hover:bg-accent/25"
              >
                <UserPlus size={14} /> Invitaciones
              </button>
            )}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-dim hover:bg-white/5"
              title="Perfil y username"
            >
              <Settings size={14} /> Perfil
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-dim hover:bg-white/5"
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        {pendingInvites.length > 0 && (
          <section className="rounded-2xl border border-border bg-elev p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Bell size={16} className="text-accent" /> Invitaciones a proyectos
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
                      Aceptar
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-dim"
                      onClick={async () => {
                        await api.declineProjectInvite(n.data.invite_id);
                        await load();
                      }}
                    >
                      Rechazar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Tus proyectos</h2>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold"
            >
              <Plus size={16} /> Nuevo
            </button>
          </div>

          {loading ? (
            <p className="text-dim">Cargando…</p>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-dim">
              Aún no tienes proyectos. Crea uno o acepta una invitación.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group relative rounded-2xl border border-border bg-elev p-5 transition hover:border-accent/40 hover:bg-elev/80"
                >
                  <Link to={`/p/${p.id}`} className="block pr-10">
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-mute">
                      {p.myRole}
                    </div>
                    <div className="text-lg font-bold tracking-tight">{p.name}</div>
                    {p.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-dim">
                        {p.description}
                      </p>
                    )}
                    {p.start_date && (
                      <p className="mt-2 font-mono text-[11px] text-mute">
                        start {p.start_date}
                      </p>
                    )}
                  </Link>
                  <button
                    type="button"
                    title="Gestionar proyecto"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setManageProject(p);
                    }}
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl border border-border bg-black/30 text-mute opacity-80 transition hover:border-accent/40 hover:text-text group-hover:opacity-100"
                  >
                    <Settings size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <form
              onSubmit={create}
              className="w-full max-w-md rounded-2xl border border-border bg-elev p-6"
            >
              <h3 className="mb-4 text-lg font-bold">Nuevo proyecto</h3>
              <label className="mb-3 block text-xs text-mute">
                Nombre
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="mb-4 block text-xs text-mute">
                Fecha de inicio
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl px-3 py-2 text-sm text-dim"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent/20 px-3 py-2 text-sm font-semibold text-accent"
                >
                  Crear
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
