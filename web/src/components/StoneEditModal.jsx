import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { periodLabelFromDates, resolveEditableRange } from "../lib/dates";

const DEFAULT_COLOR = "#f59e0b";

export default function StoneEditModal({ stoneId, onClose }) {
  const { model, updateStone, addStone, deleteStone, NEW_STONE_ID } = useApp();
  const isCreate = stoneId === NEW_STONE_ID || stoneId === "__new__";
  const stone = !isCreate ? model?.stones.find((s) => s.id === stoneId) : null;

  const range = stone
    ? resolveEditableRange(stone, null, model.meta)
    : { start: "", end: "" };

  const [title, setTitle] = useState(isCreate ? "Nueva piedra" : stone?.title || "");
  const [icon, setIcon] = useState(isCreate ? "🪨" : stone?.icon || "🪨");
  const [color, setColor] = useState(isCreate ? DEFAULT_COLOR : stone?.color || DEFAULT_COLOR);
  const [dateStart, setDateStart] = useState(range.start);
  const [dateEnd, setDateEnd] = useState(range.end);
  const [description, setDescription] = useState(isCreate ? "" : stone?.description || "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isCreate) {
      setTitle("Nueva piedra");
      setIcon("🪨");
      setColor(DEFAULT_COLOR);
      setDateStart("");
      setDateEnd("");
      setDescription("");
      setConfirmDelete(false);
      return;
    }
    if (!stone) return;
    setTitle(stone.title || "");
    setIcon(stone.icon || "🪨");
    setColor(stone.color || DEFAULT_COLOR);
    const r = resolveEditableRange(stone, null, model.meta);
    setDateStart(r.start);
    setDateEnd(r.end);
    setDescription(stone.description || "");
    setConfirmDelete(false);
  }, [stone, isCreate, model?.meta, stoneId]);

  if (!isCreate && !stone) return null;

  const taskCount = stone?.tasks?.length || 0;

  const save = async () => {
    const fields = {
      title: title.trim() || "Nueva piedra",
      icon: icon || "🪨",
      color: color || DEFAULT_COLOR,
      dateStart: dateStart || "",
      dateEnd: dateEnd || "",
      description: description || "",
      period: periodLabelFromDates(dateStart, dateEnd),
    };
    setBusy(true);
    try {
      if (isCreate) {
        const created = await addStone(fields);
        if (created) onClose();
      } else {
        await updateStone(stoneId, fields);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      const ok = await deleteStone(stoneId);
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-elev p-5 shadow-2xl"
        style={{ "--stone-color": color }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              {isCreate ? "Nueva piedra" : `Editar piedra ${stone.number}`}
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              {isCreate ? "Crear piedra" : "Piedra"}
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

        <label className="mb-3 block text-xs font-medium text-mute">
          Nombre
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-sm font-medium text-text outline-none focus:border-accent/50"
          />
        </label>

        <div className="mb-3 grid grid-cols-[80px_1fr] gap-2">
          <label className="text-xs font-medium text-mute">
            Icono
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-center text-lg outline-none"
            />
          </label>
          <label className="text-xs font-medium text-mute">
            Color
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full rounded-xl border border-border bg-black/35 px-3 py-2 font-mono text-sm outline-none"
              />
            </div>
          </label>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-mute">
            Inicio
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
          </label>
          <label className="text-xs font-medium text-mute">
            Fin
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
          </label>
        </div>

        <label className="mb-4 block text-xs font-medium text-mute">
          Descripción
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-y rounded-xl border border-border bg-black/35 px-3 py-2 text-sm outline-none focus:border-accent/50"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {!isCreate ? (
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                confirmDelete
                  ? "border-rose-500/50 bg-rose-500/20 text-rose-200"
                  : "border-border text-dim hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
              }`}
            >
              <Trash2 size={14} />
              {confirmDelete
                ? taskCount
                  ? `¿Borrar con ${taskCount} tarea${taskCount === 1 ? "" : "s"}?`
                  : "¿Confirmar borrado?"
                : "Eliminar"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold text-text disabled:opacity-50"
            >
              {busy ? "…" : isCreate ? "Crear" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
