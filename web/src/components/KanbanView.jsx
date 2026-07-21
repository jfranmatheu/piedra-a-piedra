import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Pencil, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { notify } from "../lib/toast";
import { taskKey } from "../lib/utils";
import { ProgressBar } from "./ui";
import FilterBar from "./FilterBar";
import ViewToggle from "./ViewToggle";
import NewTaskModal from "./NewTaskModal";
import StoneEditModal from "./StoneEditModal";
import { CARD_W, KanbanCardFace, SortableKanbanCard } from "./KanbanCard";

const ADD_COL_W = 220;

function laneId(stoneId, lane) {
  return `lane::${stoneId}::${lane}`;
}

function buildLanes(stones, filteredTasks, isDone, showDone) {
  const lanes = {};
  const cardMap = {};
  for (const s of stones) {
    const todo = [];
    const doneArr = [];
    for (const t of filteredTasks(s)) {
      const key = taskKey(s.id, t.id);
      const d = isDone(s, t);
      cardMap[key] = { task: t, stone: s, done: d };
      if (d) doneArr.push(key);
      else todo.push(key);
    }
    lanes[laneId(s.id, "todo")] = todo;
    if (showDone) lanes[laneId(s.id, "done")] = doneArr;
  }
  return { lanes, cardMap };
}

function Lane({
  id,
  title,
  colorClass,
  cardIds,
  cardMap,
  showExpiry,
  meta,
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "lane" } });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[180px] flex-col rounded-xl bg-black/25 transition ${
        isOver ? "bg-accent/10 ring-1 ring-accent/40" : ""
      }`}
      style={{ width: CARD_W + 16 }}
    >
      <div className="flex items-center justify-between px-2.5 pb-1 pt-2">
        <span className={`font-mono text-[10px] font-semibold tracking-widest ${colorClass}`}>
          {title}
        </span>
        <span className="font-mono text-[10px] text-mute">{cardIds.length}</span>
      </div>
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col items-center gap-2 px-2 pb-2.5">
          {cardIds.length === 0 ? (
            <div
              className="kb-placeholder flex items-center justify-center text-[11px] text-mute"
              style={{ width: CARD_W }}
            >
              Suelta aquí
            </div>
          ) : (
            cardIds.map((cid) => {
              const data = cardMap[cid];
              if (!data) return null;
              return (
                <SortableKanbanCard
                  key={cid}
                  id={cid}
                  task={data.task}
                  stone={data.stone}
                  done={data.done}
                  showExpiry={showExpiry}
                  meta={meta}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanView() {
  const {
    model,
    stats,
    filters,
    visibleStones,
    filteredTasks,
    isDone,
    commitKanbanLanes,
    addTask,
    editingStoneId,
    setEditingStoneId,
    NEW_STONE_ID,
  } = useApp();

  const showDone = !filters.incompleteOnly;
  const showExpiry = !filters.showAll;
  const [activeId, setActiveId] = useState(null);
  const [lanes, setLanes] = useState({});
  const [cardMap, setCardMap] = useState({});
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;
  const [newTaskStone, setNewTaskStone] = useState(null);
  const [creatingTask, setCreatingTask] = useState(false);

  const rebuildFromModel = () => {
    const b = buildLanes(visibleStones, filteredTasks, isDone, showDone);
    setLanes(b.lanes);
    setCardMap(b.cardMap);
    lanesRef.current = b.lanes;
  };

  useEffect(() => {
    if (activeId) return;
    rebuildFromModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleStones, filteredTasks, isDone, showDone, activeId, model]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const findLaneOf = (id, map = lanesRef.current) => {
    if (map[id]) return id;
    for (const [lid, ids] of Object.entries(map)) {
      if (ids.includes(id)) return lid;
    }
    return null;
  };

  const onDragStart = ({ active }) => setActiveId(active.id);

  const onDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    setLanes((prev) => {
      const activeLane = findLaneOf(active.id, prev);
      let overLane = findLaneOf(over.id, prev);
      if (!overLane && prev[over.id]) overLane = over.id;
      if (!activeLane || !overLane) return prev;

      if (activeLane === overLane) {
        const list = [...(prev[activeLane] || [])];
        const oldIndex = list.indexOf(active.id);
        const newIndex = list.indexOf(over.id);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
        const next = { ...prev, [activeLane]: arrayMove(list, oldIndex, newIndex) };
        lanesRef.current = next;
        return next;
      }

      const from = [...(prev[activeLane] || [])];
      const to = [...(prev[overLane] || [])];
      const fromIndex = from.indexOf(active.id);
      if (fromIndex < 0) return prev;
      from.splice(fromIndex, 1);

      const overIsLaneContainer = !!prev[over.id];
      let toIndex = to.length;
      if (!overIsLaneContainer) {
        const oi = to.indexOf(over.id);
        if (oi >= 0) toIndex = oi;
      }
      to.splice(toIndex, 0, active.id);

      const next = { ...prev, [activeLane]: from, [overLane]: to };
      lanesRef.current = next;
      return next;
    });
  };

  const onDragEnd = ({ over }) => {
    const finalLanes = lanesRef.current;
    setActiveId(null);
    if (!over) {
      rebuildFromModel();
      return;
    }
    commitKanbanLanes(finalLanes);
  };

  const onDragCancel = () => {
    setActiveId(null);
    rebuildFromModel();
  };

  const activeData = activeId ? cardMap[activeId] : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-[rgba(10,10,16,0.95)] px-4 py-2.5 backdrop-blur-md">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#1a1a24] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
              🪨 Piedra a Piedra
            </span>
            <ViewToggle />
            <span className="truncate text-sm font-bold tracking-tight">{model.title}</span>
          </div>
          <div className="min-w-[200px] rounded-xl border border-border bg-black/30 px-3 py-2">
            <div className="mb-1 flex justify-between font-mono text-[11px]">
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">
                LVL {stats.level.level}
              </span>
              <span className="text-dim">
                {stats.earnedXp}/{stats.totalXp} XP · {stats.pct.toFixed(0)}%
              </span>
            </div>
            <ProgressBar pct={stats.level.pct} />
          </div>
        </div>
        <div className="min-h-[92px]">
          <FilterBar />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="flex min-h-full w-max gap-3.5 pb-3">
            {visibleStones.length === 0 && (
              <div className="m-2 flex w-[min(420px,90vw)] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center text-dim">
                {model?.stones?.length === 0 ? (
                  <>
                    <p className="text-base font-semibold text-text">Este proyecto no tiene piedras</p>
                    <p className="mt-2 text-sm">
                      Crea la primera piedra del roadmap para empezar a añadir tareas.
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingStoneId(NEW_STONE_ID)}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/20 px-4 py-2.5 text-sm font-semibold text-text hover:bg-accent/30"
                    >
                      <Plus size={16} /> Nueva piedra
                    </button>
                  </>
                ) : (
                  <>
                    <p>No hay piedras activas en esta fecha.</p>
                    <p className="mt-2 font-mono text-xs text-mute">
                      Activa «Mostrar todo» o revisa fechas / periodos
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingStoneId(NEW_STONE_ID)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-dim hover:border-accent/40 hover:text-text"
                    >
                      <Plus size={14} /> Nueva piedra
                    </button>
                  </>
                )}
              </div>
            )}

            {visibleStones.map((s) => {
              const st = stats.perStone.find((p) => p.id === s.id) || {
                done: 0,
                total: 0,
                pct: 0,
              };
              const todoLid = laneId(s.id, "todo");
              const doneLid = laneId(s.id, "done");
              const colW = showDone ? CARD_W * 2 + 16 * 2 + 8 + 20 : CARD_W + 16 + 20;
              return (
                <section
                  key={s.id}
                  className="flex shrink-0 flex-col overflow-hidden rounded-2xl border shadow-xl"
                  style={{
                    width: colW,
                    borderColor: `color-mix(in srgb, ${s.color} 35%, rgba(255,255,255,0.07))`,
                    background: `linear-gradient(165deg, color-mix(in srgb, ${s.color} 10%, transparent), transparent 50%), rgba(14,14,22,0.9)`,
                  }}
                >
                  <header className="group relative flex items-center gap-2.5 px-3.5 pb-2 pt-3.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-lg"
                      style={{
                        borderColor: `color-mix(in srgb, ${s.color} 50%, transparent)`,
                        background: "rgba(0,0,0,0.35)",
                      }}
                    >
                      {s.icon || "🪨"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-mono text-[10px] font-medium uppercase tracking-widest"
                        style={{ color: s.color }}
                      >
                        Piedra {s.number}
                      </div>
                      <h2 className="truncate text-[15px] font-bold tracking-tight">
                        {s.title}
                      </h2>
                    </div>
                    <span className="rounded-full border border-border bg-black/30 px-2 py-0.5 font-mono text-[11px] text-dim">
                      {st.done}/{st.total}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingStoneId(s.id)}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-mute opacity-0 transition group-hover:opacity-100 hover:bg-black/40 hover:text-text"
                      title="Editar / borrar piedra"
                    >
                      <Pencil size={14} />
                    </button>
                  </header>
                  <div className="px-3.5 pb-2">
                    <ProgressBar pct={st.pct} color={s.color} />
                  </div>
                  {(s.time || s.period) && (
                    <div className="flex flex-wrap gap-1.5 px-3.5 pb-2">
                      {s.time && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            color: s.color,
                            borderColor: `${s.color}44`,
                            background: `${s.color}18`,
                          }}
                        >
                          ⏱ {s.time}
                        </span>
                      )}
                      {s.period && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-dim">
                          📅 {s.period}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-1 justify-center gap-2 px-2.5">
                    <Lane
                      id={todoLid}
                      title="TODO"
                      colorClass="text-amber-300"
                      cardIds={lanes[todoLid] || []}
                      cardMap={cardMap}
                      showExpiry={showExpiry}
                      meta={model.meta}
                    />
                    {showDone && (
                      <Lane
                        id={doneLid}
                        title="DONE"
                        colorClass="text-emerald-400"
                        cardIds={lanes[doneLid] || []}
                        cardMap={cardMap}
                        showExpiry={showExpiry}
                        meta={model.meta}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewTaskStone(s)}
                    className="mx-2.5 mb-3 mt-2 flex items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong py-2 text-xs font-semibold text-dim transition hover:border-accent/40 hover:bg-accent/10 hover:text-text"
                  >
                    <Plus size={14} /> Nueva tarea
                  </button>
                </section>
              );
            })}

            {/* Always-visible column to add stones */}
            {(visibleStones.length > 0 || (model?.stones?.length ?? 0) > 0) && (
              <button
                type="button"
                onClick={() => setEditingStoneId(NEW_STONE_ID)}
                className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong bg-black/15 px-4 text-dim transition hover:border-accent/45 hover:bg-accent/10 hover:text-text"
                style={{ width: ADD_COL_W, minHeight: 280 }}
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-black/30 text-2xl">
                  🪨
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                  <Plus size={16} /> Nueva piedra
                </span>
                <span className="max-w-[11rem] text-center font-mono text-[10px] text-mute">
                  Milestone del roadmap
                </span>
              </button>
            )}
          </div>

          <DragOverlay dropAnimation={{ duration: 160, easing: "ease" }}>
            {activeData ? (
              <div className="kb-drag-overlay">
                <KanbanCardFace
                  task={activeData.task}
                  stone={activeData.stone}
                  done={activeData.done}
                  showExpiry={showExpiry}
                  meta={model.meta}
                  overlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {editingStoneId && (
        <StoneEditModal stoneId={editingStoneId} onClose={() => setEditingStoneId(null)} />
      )}

      <NewTaskModal
        open={!!newTaskStone}
        stoneTitle={newTaskStone?.title}
        busy={creatingTask}
        onClose={() => {
          if (!creatingTask) setNewTaskStone(null);
        }}
        onSubmit={async ({ title, xp }) => {
          if (!newTaskStone) return;
          setCreatingTask(true);
          try {
            await addTask(newTaskStone.id, { title, xp });
            notify.success("Tarea creada");
            setNewTaskStone(null);
          } catch (e) {
            notify.error(e.message || "No se pudo crear la tarea");
          } finally {
            setCreatingTask(false);
          }
        }}
      />
    </div>
  );
}
