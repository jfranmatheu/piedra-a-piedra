import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { resolveEditableRange } from "../lib/dates";

export default function StoneEditModal({ stoneId, onClose }) {
  const { model, updateStone } = useApp();
  const stone = model?.stones.find((s) => s.id === stoneId);
  const range = stone ? resolveEditableRange(stone, null, model.meta) : { start: "", end: "" };
  const [title, setTitle] = useState(stone?.title || "");
  const [icon, setIcon] = useState(stone?.icon || "🪨");
  const [color, setColor] = useState(stone?.color || "#f59e0b");
  const [dateStart, setDateStart] = useState(range.start);
  const [dateEnd, setDateEnd] = useState(range.end);
  const [description, setDescription] = useState(stone?.description || "");

  useEffect(() => {
    if (!stone) return;
    setTitle(stone.title || "");
    setIcon(stone.icon || "🪨");
    setColor(stone.color || "#f59e0b");
    const r = resolveEditableRange(stone, null, model.meta);
    setDateStart(r.start);
    setDateEnd(r.end);
    setDescription(stone.description || "");
  }, [stone, model?.meta]);

  if (!stone) return null;

  const save = () => {
    updateStone(stoneId, {
      title,
      icon,
      color,
      dateStart,
      dateEnd,
      description,
    });
    onClose();
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
              Editar piedra {stone.number}
            </div>
            <h2 className="text-lg font-bold tracking-tight">Piedra</h2>
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

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold text-text"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
