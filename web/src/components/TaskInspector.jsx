import { ImageIcon, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { resolveEditableRange } from "../lib/dates";
import { initials } from "../lib/utils";
import ImagePickerModal from "./ImagePickerModal";

export default function TaskInspector() {
  const {
    selectedTaskKey,
    setSelectedTaskKey,
    findTask,
    updateTask,
    deleteTask,
    moveTask,
    isDone,
    model,
    stats,
  } = useApp();

  const found = findTask(selectedTaskKey);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [xp, setXp] = useState(50);
  const [img, setImg] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [stoneId, setStoneId] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  useEffect(() => {
    if (!found) return;
    const { task, stone } = found;
    setTitle(task.title || "");
    setNotes(task.notes || "");
    setXp(task.xp || 0);
    setImg(task.img || "");
    setAssignees([...(task.assignees || [])]);
    setStoneId(stone.id);
    const r = resolveEditableRange(task, stone, model.meta);
    setDateStart(r.start);
    setDateEnd(r.end);
  }, [found?.key, found?.task, found?.stone, model?.meta]);

  if (!selectedTaskKey || !found) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-dim">
        <div className="mb-2 text-2xl opacity-40">☰</div>
        <p>Selecciona o arrastra una tarjeta para editarla.</p>
        <p className="mt-2 font-mono text-[11px] text-mute">
          Imagen, fechas, asignados y más
        </p>
      </div>
    );
  }

  const { stone, task, key } = found;
  const done = isDone(stone, task);
  const st = stats?.perStone.find((s) => s.id === stone.id);
  const team = model.team || [];

  const save = () => {
    updateTask(key, {
      title,
      notes,
      xp,
      img,
      assignees,
      dateStart,
      dateEnd,
      stoneId: stoneId !== stone.id ? stoneId : undefined,
    });
  };

  const toggleAsg = (id) => {
    setAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="relative h-full overflow-y-auto p-5" style={{ "--sc": stone.color }}>
      <button
        type="button"
        onClick={() => setSelectedTaskKey(null)}
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10"
      >
        <X size={18} />
      </button>

      <div className="mb-3 pr-8 font-mono text-[10px] uppercase tracking-wider text-accent">
        {stone.icon} Piedra {stone.number} · {stone.title}
      </div>

      <label className="mb-3 block text-xs font-medium text-mute">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-sm font-semibold text-text outline-none focus:border-accent/40"
        />
      </label>

      <label className="mb-3 block text-xs font-medium text-mute">
        Notas
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-y rounded-xl border border-border bg-black/35 px-3 py-2 text-sm text-text outline-none focus:border-accent/40"
        />
      </label>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-mute">
          Inicio
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>
        <label className="text-xs font-medium text-mute">
          Fin
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>
      </div>

      <label className="mb-3 block text-xs font-medium text-mute">
        XP
        <input
          type="number"
          min={0}
          step={10}
          value={xp}
          onChange={(e) => setXp(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-sm outline-none focus:border-accent/40"
        />
      </label>

      {/* Image preview / picker */}
      <div className="mb-3">
        <div className="mb-1 text-xs font-medium text-mute">Imagen</div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="group relative w-full overflow-hidden rounded-xl border border-border bg-black/30"
        >
          {img ? (
            <img
              src={`/images/${encodeURIComponent(img)}`}
              alt=""
              className="max-h-40 w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-28 flex-col items-center justify-center gap-1 text-mute">
              <ImageIcon size={28} className="opacity-50" />
              <span className="text-xs">Clic para elegir</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent opacity-0 transition group-hover:opacity-100">
            <span className="mb-2 text-xs font-semibold">Cambiar imagen</span>
          </div>
        </button>
        {img && (
          <div className="mt-1 truncate font-mono text-[10px] text-mute">{img}</div>
        )}
      </div>

      <div className="mb-3">
        <div className="mb-1.5 text-xs font-medium text-mute">Asignado a</div>
        <div className="flex flex-col gap-1.5">
          {team.map((m) => {
            const on = assignees.includes(m.id);
            return (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl border px-2 py-1.5 text-sm"
                style={{
                  borderColor: on ? `${m.color}66` : "var(--color-border)",
                  background: on ? `${m.color}18` : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleAsg(m.id)}
                  className="accent-amber-500"
                />
                <span
                  className="inline-grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-bg"
                  style={{ background: m.color }}
                >
                  {initials(m.name)}
                </span>
                {m.name}
              </label>
            );
          })}
        </div>
      </div>

      <label className="mb-4 block text-xs font-medium text-mute">
        Piedra
        <select
          value={stoneId}
          onChange={(e) => setStoneId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-sm outline-none"
        >
          {model.stones.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.title}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => moveTask(key, stone.id, !done)}
          className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-white/5"
        >
          {done ? "→ TODO" : "→ DONE"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("¿Eliminar esta tarea?")) deleteTask(key);
          }}
          className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300"
        >
          <Trash2 size={14} /> Eliminar
        </button>
      </div>

      {st && (
        <div className="mt-4 font-mono text-[11px] text-mute">
          Progreso piedra: {st.done}/{st.total} ({st.pct.toFixed(0)}%)
        </div>
      )}

      <ImagePickerModal
        open={pickerOpen}
        current={img}
        onClose={() => setPickerOpen(false)}
        onSelect={(name) => setImg(name)}
      />
    </div>
  );
}
