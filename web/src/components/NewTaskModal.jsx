import { ImageIcon, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { periodLabelFromDates } from "../lib/dates";
import { publicAssetUrl } from "../lib/supabase";
import { initials } from "../lib/utils";
import { useI18n } from "../i18n";
import ImagePickerModal from "./ImagePickerModal";

/**
 * Modal completo para crear una tarea.
 */
export default function NewTaskModal({
  open,
  stoneTitle,
  busy = false,
  onSubmit,
  onClose,
}) {
  const { t } = useI18n();
  const { model, projectId } = useApp();
  const team = model?.team || [];

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [xp, setXp] = useState(50);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [imagePath, setImagePath] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setNotes("");
      setXp(50);
      setDateStart("");
      setDateEnd("");
      setAssignees([]);
      setImagePath(null);
      setPickerOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const imgPreview = imagePath
    ? publicAssetUrl(
        imagePath.includes("/")
          ? imagePath
          : projectId
            ? `${projectId}/${imagePath}`
            : imagePath
      )
    : null;

  const toggleAssignee = (id) => {
    setAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    const period = periodLabelFromDates(dateStart, dateEnd);
    onSubmit({
      title: trimmed,
      notes: notes.trim(),
      xp: Number.isFinite(Number(xp)) ? Math.max(0, parseInt(xp, 10) || 0) : 50,
      dateStart: dateStart || "",
      dateEnd: dateEnd || "",
      period,
      img: imagePath || null,
      assignees: [...assignees],
    });
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md sm:p-4"
      onClick={busy ? undefined : onClose}
    >
      <form
        className="flex max-h-[min(920px,94dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-elev shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              {t("views.newTask")}
            </div>
            <h3 className="text-lg font-bold tracking-tight">
              {stoneTitle || t("views.newTask")}
            </h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <label className="block text-xs font-medium text-mute">
            {t("common.name")}
            <input
              required
              autoFocus
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("views.taskTitlePrompt")}
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50 disabled:opacity-50"
            />
          </label>

          <label className="block text-xs font-medium text-mute">
            Descripción / notas
            <textarea
              value={notes}
              disabled={busy}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Detalles de la tarea…"
              className="mt-1 w-full resize-y rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50 disabled:opacity-50"
            />
          </label>

          <label className="block text-xs font-medium text-mute">
            XP
            <input
              type="number"
              min={0}
              max={9999}
              disabled={busy}
              value={xp}
              onChange={(e) => setXp(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50 disabled:opacity-50"
            />
          </label>

          <div>
            <div className="mb-1.5 text-xs font-medium text-mute">Periodo</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-mute">
                Inicio
                <input
                  type="date"
                  disabled={busy}
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent/50 disabled:opacity-50"
                />
              </label>
              <label className="block text-[11px] text-mute">
                Fin
                <input
                  type="date"
                  disabled={busy}
                  value={dateEnd}
                  min={dateStart || undefined}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent/50 disabled:opacity-50"
                />
              </label>
            </div>
            {(dateStart || dateEnd) && (
              <p className="mt-1.5 font-mono text-[10px] text-mute">
                {periodLabelFromDates(dateStart, dateEnd)}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-mute">
              <Users size={12} /> Asignado a
            </div>
            {team.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-mute">
                No hay miembros en el proyecto todavía.
              </p>
            ) : (
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-border bg-black/25 p-2">
                {team.map((m) => {
                  const on = assignees.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-white/5 ${
                        on ? "bg-white/[0.04]" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={busy}
                        onChange={() => toggleAssignee(m.id)}
                        className="accent-amber-500"
                      />
                      <span
                        className="inline-grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-bg"
                        style={{ background: m.color }}
                      >
                        {initials(m.name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {m.name}
                        <span className="ml-1 font-mono text-[10px] text-mute">
                          @{m.username}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-mute">Imagen</div>
            {imgPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={imgPreview}
                  alt=""
                  className="h-28 w-full object-cover"
                />
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPickerOpen(true)}
                    className="rounded-lg border border-white/20 bg-black/60 px-2 py-1 text-[11px] font-semibold text-white hover:bg-black/80"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setImagePath(null)}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-rose-400/40 bg-black/60 text-rose-200 hover:bg-rose-500/40"
                    title="Quitar imagen"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPickerOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong py-6 text-sm text-dim transition hover:border-accent/40 hover:bg-accent/5 hover:text-text disabled:opacity-50"
              >
                <ImageIcon size={16} /> Elegir o subir imagen
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-xl border border-accent/40 bg-accent/20 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("common.create")}
          </button>
        </div>
      </form>

      <ImagePickerModal
        open={pickerOpen}
        current={imagePath}
        onClose={() => setPickerOpen(false)}
        onSelect={(path) => {
          setImagePath(path || null);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
