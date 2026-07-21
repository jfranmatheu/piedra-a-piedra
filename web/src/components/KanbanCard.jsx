import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical, ImageIcon, Pencil, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import { useApp } from "../context/AppContext";
import { resolveEditableRange, startOfDay, taskDateWindow } from "../lib/dates";
import { publicAssetUrl } from "../lib/supabase";
import { initials, taskKey } from "../lib/utils";
import ImagePickerModal from "./ImagePickerModal";

export const CARD_W = 248;

function getExpiry(stone, task, meta) {
  const win = taskDateWindow(stone, task, meta);
  if (!win?.to) return null;
  const today = startOfDay(new Date());
  const end = startOfDay(win.to);
  const days = Math.round((end - today) / 86400000);
  return { days, expired: days < 0 };
}

function ExpiryBadge({ stone, task, meta, onClick }) {
  const info = getExpiry(stone, task, meta);
  if (!info) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-md border border-dashed border-border px-1.5 py-0.5 font-mono text-[10px] text-mute hover:border-border-strong hover:text-dim"
      >
        + periodo
      </button>
    );
  }
  if (info.expired) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-0.5 rounded-md border border-rose-500/35 bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-300 hover:brightness-110"
      >
        <Clock size={10} />
        Expirado
      </button>
    );
  }
  const label =
    info.days === 0 ? "Hoy" : info.days === 1 ? "1 día" : `${info.days} días`;
  const urgent = info.days <= 2;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold hover:brightness-110 ${
        urgent
          ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
          : "border-sky-500/30 bg-sky-500/10 text-sky-300"
      }`}
    >
      <Clock size={10} />
      {label}
    </button>
  );
}

function PeriodPopup({ task, stone, meta, onClose, onSave }) {
  const range = resolveEditableRange(task, stone, meta);
  const [start, setStart] = useState(range.start);
  const [end, setEnd] = useState(range.end);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-elev p-3 shadow-2xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-mute">
        Periodo
      </div>
      <label className="mb-2 block text-[11px] text-mute">
        Inicio
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="mt-0.5 w-full rounded-lg border border-border bg-black/40 px-2 py-1.5 text-xs text-text outline-none"
        />
      </label>
      <label className="mb-3 block text-[11px] text-mute">
        Fin
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="mt-0.5 w-full rounded-lg border border-border bg-black/40 px-2 py-1.5 text-xs text-text outline-none"
        />
      </label>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-[11px] text-dim hover:bg-white/5"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            onSave({ dateStart: start, dateEnd: end });
            onClose();
          }}
          className="rounded-lg bg-accent/20 px-2 py-1 text-[11px] font-semibold text-accent"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function AssigneeDropdown({ task, team, onChange, onClose }) {
  const teamIds = new Set((team || []).map((m) => m.id));
  const [selected, setSelected] = useState(
    () =>
      new Set((task.assignees || []).filter((id) => teamIds.has(id)))
  );
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onChange([...selected]);
        onClose();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [selected, onChange, onClose]);

  const toggle = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-1 max-h-48 w-52 overflow-y-auto rounded-xl border border-border bg-elev p-2 shadow-2xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-wider text-mute">
        Asignar a
      </div>
      {team.length === 0 ? (
        <p className="px-1 text-[11px] text-mute">Sin equipo en @team</p>
      ) : (
        team.map((m) => {
          const on = selected.has(m.id);
          return (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(m.id)}
                className="accent-amber-500"
              />
              <span
                className="inline-grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-bg"
                style={{ background: m.color }}
              >
                {initials(m.name)}
              </span>
              {m.name}
            </label>
          );
        })
      )}
      <button
        type="button"
        onClick={() => {
          onChange([...selected]);
          onClose();
        }}
        className="mt-1 w-full rounded-lg bg-accent/15 py-1.5 text-[11px] font-semibold text-accent"
      >
        Listo
      </button>
    </div>
  );
}

/**
 * Tarjeta editable inline (sin sidebar).
 * overlay=true → solo visual para DragOverlay
 */
export function KanbanCardFace({
  task,
  stone,
  done,
  dragHandleProps,
  setNodeRef,
  style,
  className,
  showExpiry,
  meta,
  taskKeyStr,
  overlay = false,
}) {
  const { updateTask, model, projectId } = useApp();
  const team = model?.team || [];
  const key = taskKeyStr || taskKey(stone.id, task.id);
  const imgSrc = task.imagePath || task.img
    ? publicAssetUrl(
        (task.imagePath || task.img).includes("/")
          ? task.imagePath || task.img
          : projectId
            ? `${projectId}/${task.imagePath || task.img}`
            : task.imagePath || task.img
      )
    : null;

  const [editTitle, setEditTitle] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");
  const [editXp, setEditXp] = useState(false);
  const [xp, setXp] = useState(task.xp || 0);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [asgOpen, setAsgOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragOverFile, setDragOverFile] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || "");
    setXp(task.xp || 0);
  }, [task.title, task.notes, task.xp, task.id]);

  const save = (fields) => {
    if (overlay) return;
    updateTask(key, fields);
  };

  const onFileDrop = async (e) => {
    if (overlay) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverFile(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const res = await api.uploadProjectImage(projectId, file);
      save({ img: res.path });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault?.();
  };

  return (
    <article
      ref={setNodeRef}
      style={{
        ...style,
        width: CARD_W,
        borderColor: dragOverFile
          ? "var(--color-accent)"
          : `color-mix(in srgb, ${stone.color} 28%, rgba(255,255,255,0.07))`,
      }}
      className={`relative box-border rounded-xl border bg-[rgba(22,22,32,0.95)] p-2.5 shadow-lg transition ${
        done ? "opacity-80" : ""
      } ${dragOverFile ? "ring-2 ring-accent/50 bg-accent/5" : ""} ${className || ""}`}
      onDragOver={(e) => {
        if (overlay) return;
        if ([...e.dataTransfer.types].includes("Files")) {
          e.preventDefault();
          e.stopPropagation();
          setDragOverFile(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOverFile(false);
      }}
      onDrop={onFileDrop}
    >
      {uploading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/50 text-xs font-semibold">
          Subiendo…
        </div>
      )}

      {/* Image thumbnail */}
      {imgSrc ? (
        <div className="group/img relative mb-2 overflow-hidden rounded-lg">
          <img
            src={imgSrc}
            alt=""
            className="h-20 w-full object-cover"
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          {!overlay && (
            <button
              type="button"
              onPointerDown={stop}
              onClick={(e) => {
                stop(e);
                setPickerOpen(true);
              }}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg border border-white/20 bg-black/60 text-white opacity-0 transition group-hover/img:opacity-100 hover:bg-black/80"
              title="Cambiar imagen"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      ) : (
        !overlay &&
        dragOverFile && (
          <div className="mb-2 flex h-16 items-center justify-center gap-1 rounded-lg border border-dashed border-accent/50 text-[11px] text-accent">
            <ImageIcon size={14} /> Soltar imagen
          </div>
        )
      )}

      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-mute active:cursor-grabbing"
          {...(dragHandleProps || {})}
        >
          <GripVertical size={14} />
        </button>

        {/* Title — double click to edit */}
        <div className="min-w-0 flex-1">
          {editTitle && !overlay ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                setEditTitle(false);
                if (title.trim() && title !== task.title) save({ title: title.trim() });
                else setTitle(task.title);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setTitle(task.title);
                  setEditTitle(false);
                }
              }}
              onPointerDown={stop}
              className="w-full rounded border border-accent/40 bg-black/50 px-1 py-0.5 text-[13px] font-semibold outline-none"
            />
          ) : (
            <div
              className={`cursor-text text-[13px] font-semibold leading-snug ${
                done ? "text-dim line-through decoration-mute" : ""
              }`}
              onDoubleClick={(e) => {
                if (overlay) return;
                e.stopPropagation();
                setEditTitle(true);
              }}
              title="Doble clic para editar"
            >
              {task.title}
            </div>
          )}
        </div>
      </div>

      {/* Notes — double click */}
      <div className="mt-1 pl-5">
        {editNotes && !overlay ? (
          <textarea
            autoFocus
            value={notes}
            rows={2}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              setEditNotes(false);
              if (notes !== (task.notes || "")) save({ notes });
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setNotes(task.notes || "");
                setEditNotes(false);
              }
            }}
            onPointerDown={stop}
            className="w-full resize-none rounded border border-accent/40 bg-black/50 px-1 py-0.5 text-[11px] text-dim outline-none"
          />
        ) : (
          <p
            className={`cursor-text text-[11px] leading-snug ${
              task.notes ? "line-clamp-2 text-dim" : "text-mute/60 italic"
            }`}
            onDoubleClick={(e) => {
              if (overlay) return;
              e.stopPropagation();
              setEditNotes(true);
            }}
            title="Doble clic para editar nota"
          >
            {task.notes || "Añadir nota…"}
          </p>
        )}
      </div>

      <div className="relative mt-2 flex flex-wrap items-center gap-1 pl-5">
        {/* Period / expiry */}
        {showExpiry ? (
          <div className="relative">
            <ExpiryBadge
              stone={stone}
              task={task}
              meta={meta}
              onClick={(e) => {
                if (overlay) return;
                e.stopPropagation();
                setPeriodOpen((v) => !v);
                setAsgOpen(false);
                setEditXp(false);
              }}
            />
            {periodOpen && !overlay && (
              <PeriodPopup
                task={task}
                stone={stone}
                meta={meta}
                onClose={() => setPeriodOpen(false)}
                onSave={(fields) => save(fields)}
              />
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                if (overlay) return;
                e.stopPropagation();
                setPeriodOpen((v) => !v);
              }}
              className="rounded-md border border-border bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-mute hover:text-dim"
            >
              ⏱ {task.period || "periodo"}
            </button>
            {periodOpen && !overlay && (
              <PeriodPopup
                task={task}
                stone={stone}
                meta={meta}
                onClose={() => setPeriodOpen(false)}
                onSave={(fields) => save(fields)}
              />
            )}
          </div>
        )}

        {/* XP — single click */}
        {editXp && !overlay ? (
          <input
            autoFocus
            type="number"
            min={0}
            step={10}
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            onBlur={() => {
              setEditXp(false);
              const n = parseInt(xp, 10);
              if (!Number.isNaN(n) && n !== task.xp) save({ xp: n });
              else setXp(task.xp || 0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setXp(task.xp || 0);
                setEditXp(false);
              }
            }}
            onPointerDown={stop}
            className="w-14 rounded border border-amber-500/40 bg-black/50 px-1 py-0.5 font-mono text-[10px] text-amber-300 outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              if (overlay) return;
              e.stopPropagation();
              setEditXp(true);
              setPeriodOpen(false);
              setAsgOpen(false);
            }}
            className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 hover:brightness-110"
            title="Clic para editar XP"
          >
            +{task.xp || 0}
          </button>
        )}
      </div>

      {/* Assignees */}
      <div className="relative mt-2 flex items-center justify-between gap-1 pl-5">
        <button
          type="button"
          onClick={(e) => {
            if (overlay) return;
            e.stopPropagation();
            setAsgOpen((v) => !v);
            setPeriodOpen(false);
            setEditXp(false);
          }}
          className="flex min-w-0 flex-wrap items-center gap-1 rounded-md px-0.5 py-0.5 hover:bg-white/5"
          title="Asignar miembros"
        >
          {(() => {
            // Solo avatares de miembros actuales (sin UUID fantasma de ex-miembros)
            const known = (task.assignees || [])
              .map((id) => team.find((t) => t.id === id))
              .filter(Boolean);
            if (!known.length) {
              return (
                <span className="inline-flex items-center gap-1 text-[10px] text-mute">
                  <Users size={11} /> Asignar
                </span>
              );
            }
            return known.map((m) => (
              <span
                key={m.id}
                title={m.name}
                className="inline-grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] font-bold text-bg"
                style={{ background: m.color }}
              >
                {initials(m.name)}
              </span>
            ));
          })()}
        </button>
        {asgOpen && !overlay && (
          <AssigneeDropdown
            task={task}
            team={team}
            onChange={(assignees) => save({ assignees })}
            onClose={() => setAsgOpen(false)}
          />
        )}

        {!imgSrc && !overlay && (
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              setPickerOpen(true);
            }}
            className="text-mute hover:text-dim"
            title="Añadir imagen"
          >
            <ImageIcon size={14} />
          </button>
        )}
      </div>

      {!overlay && (
        <ImagePickerModal
          open={pickerOpen}
          current={task.imagePath || task.img}
          onClose={() => setPickerOpen(false)}
          onSelect={(path) => save({ img: path })}
        />
      )}
    </article>
  );
}

export function SortableKanbanCard({
  id,
  task,
  stone,
  done,
  showExpiry,
  meta,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      data: { type: "card", stoneId: stone.id, lane: done ? "done" : "todo" },
    });

  return (
    <div className={isDragging ? "opacity-30" : ""}>
      <KanbanCardFace
        task={task}
        stone={stone}
        done={done}
        setNodeRef={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        dragHandleProps={{ ...attributes, ...listeners }}
        showExpiry={showExpiry}
        meta={meta}
        taskKeyStr={id}
      />
    </div>
  );
}
