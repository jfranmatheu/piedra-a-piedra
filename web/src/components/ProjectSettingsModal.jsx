import {
  AlertTriangle,
  Crown,
  Download,
  Loader2,
  LogOut,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../hooks/useConfirm";
import * as api from "../lib/api";
import {
  downloadStonesFile,
  safeStonesFilename,
} from "../lib/stonesFormat";
import { notify, notifyPromise } from "../lib/toast";
import { sanitizeUsernameInput } from "../lib/username";

const ROLE_LABEL = {
  owner: "Owner",
  admin: "Admin",
  member: "Miembro",
};

/**
 * @param {{
 *   projectId: string,
 *   project?: { id: string, name: string, description?: string, start_date?: string, end_date?: string, owner_id?: string } | null,
 *   myRole?: string | null,
 *   onClose: () => void,
 *   onChanged?: () => void,
 * }} props
 */
export default function ProjectSettingsModal({
  projectId,
  project: projectProp,
  myRole: myRoleProp,
  onClose,
  onChanged,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { confirm, ConfirmHost } = useConfirm();

  const [project, setProject] = useState(projectProp || null);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState(myRoleProp || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // General
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Invite
  const [inviteUser, setInviteUser] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Leave / transfer / delete
  const [transferTo, setTransferTo] = useState("");
  const [leaveTransferTo, setLeaveTransferTo] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeletePanel, setShowDeletePanel] = useState(false);

  const isOwner = myRole === "owner" || project?.owner_id === user?.id;
  const canManage = isOwner || myRole === "admin";

  const otherMembers = useMemo(
    () => members.filter((m) => m.id !== user?.id),
    [members, user?.id]
  );

  const transferCandidates = useMemo(
    () => members.filter((m) => m.id !== user?.id && m.role !== "owner"),
    [members, user?.id]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, m] = await Promise.all([
        api.getProject(projectId),
        api.listProjectMembers(projectId),
      ]);
      setProject(p);
      setMembers(m);
      setName(p.name || "");
      setDescription(p.description || "");
      setStartDate(p.start_date || "");
      setEndDate(p.end_date || "");
      const mine = m.find((x) => x.id === user?.id);
      setMyRole(mine?.role || (p.owner_id === user?.id ? "owner" : myRoleProp) || null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.id, myRoleProp]);

  useEffect(() => {
    reload();
  }, [reload]);

  const flash = (text, isErr = false) => {
    if (isErr) {
      setError(text);
      setMsg(null);
      notify.error(text);
    } else {
      setMsg(text);
      setError(null);
      notify.success(text);
    }
  };

  const afterMutation = async (okMessage) => {
    await reload();
    onChanged?.();
    if (okMessage) flash(okMessage);
  };

  const saveGeneral = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    const n = name.trim();
    if (!n) {
      flash("El nombre no puede estar vacío", true);
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      flash("La fecha fin no puede ser anterior al inicio", true);
      return;
    }
    setBusy(true);
    try {
      await api.updateProject(projectId, {
        name: n,
        description,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      await afterMutation("Proyecto actualizado");
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!canManage || inviting) return;
    const uname = inviteUser.trim();
    if (!uname) return;
    setInviting(true);
    setError(null);
    try {
      await notifyPromise(
        api.inviteToProject(projectId, uname, inviteRole),
        {
          loading: "Enviando invitación…",
          success: `Invitación enviada a @${uname.replace(/^@/, "")}`,
          error: (err) => err.message || "No se pudo invitar",
        }
      );
      setInviteUser("");
      await reload();
      onChanged?.();
    } catch {
      /* toast already shown */
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (memberId, role) => {
    if (!canManage) return;
    setBusy(true);
    try {
      await api.setProjectMemberRole(projectId, memberId, role);
      await afterMutation("Rol actualizado");
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const kick = async (memberId, username) => {
    if (!canManage) return;
    const ok = await confirm({
      title: "Expulsar miembro",
      message: `¿Expulsar a @${username} del proyecto? Se quitarán sus asignaciones en las tareas.`,
      confirmLabel: "Expulsar",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.removeProjectMember(projectId, memberId);
      await afterMutation(`@${username} expulsado`);
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const doTransfer = async () => {
    if (!isOwner || !transferTo) return;
    const target = members.find((m) => m.id === transferTo);
    const ok = await confirm({
      title: "Transferir propiedad",
      message: `¿Transferir la propiedad a @${target?.username}? Pasarás a ser admin del proyecto.`,
      confirmLabel: "Transferir",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.transferProjectOwnership(projectId, transferTo);
      setTransferTo("");
      await afterMutation("Propiedad transferida");
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const doLeave = async () => {
    if (isOwner) {
      if (!leaveTransferTo) {
        flash("Como owner debes elegir a quién transferir la propiedad", true);
        return;
      }
      const ok = await confirm({
        title: "Transferir y salir",
        message:
          "Vas a transferir la propiedad y salir del proyecto. ¿Continuar?",
        confirmLabel: "Transferir y salir",
        danger: true,
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: "Salir del proyecto",
        message: "¿Salir de este proyecto? Dejarás de verlo y sus tareas.",
        confirmLabel: "Salir",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      if (isOwner) {
        await api.leaveProject(projectId, leaveTransferTo);
      } else {
        await api.leaveProject(projectId, null);
      }
      notify.success("Has salido del proyecto");
      onChanged?.();
      onClose();
      navigate("/projects", { replace: true });
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!isOwner) return;
    if (deleteConfirm.trim() !== (project?.name || "")) {
      flash("Escribe el nombre exacto del proyecto para confirmar", true);
      return;
    }
    const ok = await confirm({
      title: "Borrar proyecto",
      message:
        "Esta acción es irreversible. Se eliminarán piedras, tareas e invitaciones.",
      confirmLabel: "Borrar definitivamente",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteProject(projectId);
      notify.success("Proyecto eliminado");
      onChanged?.();
      onClose();
      navigate("/projects", { replace: true });
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const canChangeRoleOf = (m) => {
    if (!canManage || m.id === user?.id || m.role === "owner") return false;
    if (isOwner) return true;
    // admin: only members
    return m.role === "member";
  };

  const canKick = (m) => {
    if (!canManage || m.id === user?.id || m.role === "owner") return false;
    if (isOwner) return true;
    return m.role === "member";
  };

  const exportStones = async () => {
    setExporting(true);
    try {
      const { text, name: pname } = await notifyPromise(
        api.exportProjectToStonesText(projectId),
        {
          loading: "Exportando .stones…",
          success: "Archivo listo",
          error: (e) => e.message || "Error al exportar",
        }
      );
      downloadStonesFile(safeStonesFilename(pname), text);
    } catch {
      /* toast */
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(920px,94dvh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-elev shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Proyecto
            </div>
            <h2 className="truncate text-lg font-bold tracking-tight">
              {project?.name || "Ajustes"}
            </h2>
            <p className="text-xs text-mute">
              Tu rol:{" "}
              <span className="font-semibold text-dim">
                {ROLE_LABEL[myRole] || myRole || "—"}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-dim hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-dim">Cargando…</p>
          ) : (
            <>
              {error && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {error}
                </p>
              )}
              {msg && (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  {msg}
                </p>
              )}

              {/* ── General ── */}
              <section>
                <h3 className="mb-2 text-sm font-bold">General</h3>
                {canManage ? (
                  <form onSubmit={saveGeneral} className="space-y-3">
                    <label className="block text-xs text-mute">
                      Nombre
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent/50"
                      />
                    </label>
                    <label className="block text-xs text-mute">
                      Descripción
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="mt-1 w-full resize-y rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent/50"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs text-mute">
                        Fecha de inicio
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent/50"
                        />
                      </label>
                      <label className="block text-xs text-mute">
                        Fecha fin / límite
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || undefined}
                          className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent/50"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-xl border border-border bg-black/20 px-3 py-3 text-sm text-dim">
                    <div className="font-semibold text-text">{project?.name}</div>
                    {project?.description && (
                      <p className="mt-1 text-xs">{project.description}</p>
                    )}
                    {(project?.start_date || project?.end_date) && (
                      <p className="mt-2 font-mono text-[11px] text-mute">
                        {project.start_date || "—"}
                        {" → "}
                        {project.end_date || "—"}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-mute">
                      Solo owner o admin pueden renombrar el proyecto.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  disabled={exporting}
                  onClick={exportStones}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5 disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Exportar .stones
                </button>
                <p className="mt-1.5 text-[11px] text-mute">
                  Descarga el roadmap en texto natural (compatible con el formato
                  clásico .stones).
                </p>
              </section>

              {/* ── Members ── */}
              <section>
                <h3 className="mb-2 text-sm font-bold">
                  Miembros ({members.length})
                </h3>
                <ul className="mb-3 space-y-2">
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-black/25 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          {m.role === "owner" && (
                            <Crown size={12} className="shrink-0 text-amber-400" />
                          )}
                          <span className="truncate">
                            {m.display_name || m.username}
                          </span>
                          {m.id === user?.id && (
                            <span className="text-[10px] font-normal text-mute">
                              (tú)
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-mute">
                          @{m.username}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {canChangeRoleOf(m) ? (
                          <select
                            value={m.role}
                            disabled={busy}
                            onChange={(e) => changeRole(m.id, e.target.value)}
                            className="rounded-lg border border-border bg-black/40 px-2 py-1 text-[11px] outline-none"
                          >
                            <option value="member">Miembro</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-dim">
                            {ROLE_LABEL[m.role] || m.role}
                          </span>
                        )}
                        {canKick(m) && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => kick(m.id, m.username)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-dim hover:border-rose-500/40 hover:text-rose-300"
                            title="Expulsar"
                          >
                            <UserMinus size={12} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {canManage && (
                  <form
                    onSubmit={sendInvite}
                    className="rounded-xl border border-dashed border-border-strong p-3"
                  >
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                      <UserPlus size={12} className="text-accent" />
                      Invitar por username
                    </div>
                    <p className="mb-2 text-[11px] text-mute">
                      Solo usuarios ya en la plataforma. El email no se comparte.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <div className="relative min-w-[140px] flex-1">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-mute">
                          @
                        </span>
                        <input
                          value={inviteUser}
                          disabled={inviting}
                          onChange={(e) =>
                            setInviteUser(sanitizeUsernameInput(e.target.value))
                          }
                          placeholder="username"
                          className="w-full rounded-xl border border-border bg-black/40 py-2 pl-7 pr-2 font-mono text-sm outline-none disabled:opacity-50"
                        />
                      </div>
                      <select
                        value={inviteRole}
                        disabled={inviting}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="rounded-xl border border-border bg-black/40 px-2 py-2 text-xs outline-none disabled:opacity-50"
                      >
                        <option value="member">Miembro</option>
                        {isOwner && <option value="admin">Admin</option>}
                      </select>
                      <button
                        type="submit"
                        disabled={inviting || !inviteUser.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        {inviting ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Enviando…
                          </>
                        ) : (
                          "Invitar"
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* ── Transfer ownership ── */}
              {isOwner && transferCandidates.length > 0 && (
                <section className="rounded-xl border border-border bg-black/20 p-3">
                  <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold">
                    <Crown size={14} className="text-amber-400" />
                    Transferir propiedad
                  </h3>
                  <p className="mb-2 text-[11px] text-mute">
                    El nuevo owner debe ser ya miembro. Tú pasarás a admin.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="min-w-[160px] flex-1 rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none"
                    >
                      <option value="">Elegir miembro…</option>
                      {transferCandidates.map((m) => (
                        <option key={m.id} value={m.id}>
                          @{m.username} ({ROLE_LABEL[m.role]})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy || !transferTo}
                      onClick={doTransfer}
                      className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50"
                    >
                      Transferir
                    </button>
                  </div>
                </section>
              )}

              {/* ── Leave ── */}
              <section className="rounded-xl border border-border bg-black/20 p-3">
                <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold">
                  <LogOut size={14} />
                  Salir del proyecto
                </h3>
                {isOwner ? (
                  <>
                    <p className="mb-2 text-[11px] text-mute">
                      Eres el owner: antes de salir debes transferir la propiedad a
                      otro miembro.
                    </p>
                    {transferCandidates.length === 0 ? (
                      <p className="text-xs text-amber-200/90">
                        No hay otros miembros. Invita a alguien y transfiere, o borra
                        el proyecto.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={leaveTransferTo}
                          onChange={(e) => setLeaveTransferTo(e.target.value)}
                          className="min-w-[160px] flex-1 rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none"
                        >
                          <option value="">Nuevo owner…</option>
                          {transferCandidates.map((m) => (
                            <option key={m.id} value={m.id}>
                              @{m.username}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busy || !leaveTransferTo}
                          onClick={doLeave}
                          className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5 disabled:opacity-50"
                        >
                          Transferir y salir
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-[11px] text-mute">
                      Dejarás de ver el proyecto y sus tareas.
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={doLeave}
                      className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5 disabled:opacity-50"
                    >
                      Salir del proyecto
                    </button>
                  </>
                )}
              </section>

              {/* ── Delete danger ── */}
              {isOwner && (
                <section className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3">
                  <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-rose-200">
                    <Trash2 size={14} />
                    Zona de peligro
                  </h3>
                  <p className="mb-2 text-[11px] leading-relaxed text-rose-100/80">
                    Borrar el proyecto es <strong>irreversible</strong>: se eliminan
                    piedras, tareas, invitaciones y archivos asociados.
                    {otherMembers.length > 0 && (
                      <>
                        {" "}
                        Hay <strong>{otherMembers.length}</strong> miembro
                        {otherMembers.length === 1 ? "" : "s"} más. Si solo quieres
                        irte, usa <em>Salir del proyecto</em> y transfiere la
                        propiedad en lugar de borrar.
                      </>
                    )}
                  </p>
                  {!showDeletePanel ? (
                    <button
                      type="button"
                      onClick={() => setShowDeletePanel(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100"
                    >
                      <AlertTriangle size={14} />
                      Borrar proyecto…
                    </button>
                  ) : (
                    <div className="space-y-2 rounded-xl border border-rose-500/30 bg-black/30 p-3">
                      <p className="text-xs text-rose-100/90">
                        Escribe el nombre del proyecto para confirmar:{" "}
                        <span className="font-mono font-semibold text-rose-50">
                          {project?.name}
                        </span>
                      </p>
                      <input
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="Nombre exacto"
                        className="w-full rounded-xl border border-rose-500/30 bg-black/40 px-3 py-2 text-sm outline-none focus:border-rose-400/50"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeletePanel(false);
                            setDeleteConfirm("");
                          }}
                          className="rounded-xl border border-border px-3 py-2 text-sm text-dim"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={
                            busy || deleteConfirm.trim() !== (project?.name || "")
                          }
                          onClick={doDelete}
                          className="rounded-xl border border-rose-500/50 bg-rose-600/40 px-3 py-2 text-sm font-bold text-rose-50 disabled:opacity-40"
                        >
                          Borrar definitivamente
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
      <ConfirmHost />
    </div>
  );
}
