import { Minus, Plus, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  addDays,
  parseProjectStart,
  startOfDay,
  stoneDateWindow,
  taskDateWindow,
  toISODate,
} from "../lib/dates";
import { taskKey } from "../lib/utils";
import { AssigneeChips, ProgressBar } from "./ui";
import FilterBar from "./FilterBar";
import ViewToggle from "./ViewToggle";

const LABEL_W = 260;
const ROW_H = 44;
const STONE_H = 36;
const HEADER_H = 56;
const MIN_VISIBLE = 7;
const MAX_VISIBLE = 31;
const DEFAULT_VISIBLE = 10;
const ZOOM_STEP = 3;
const MIN_PILL_DAYS = 1;

function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

function monthLabel(d) {
  return d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
}

function weekdayShort(d) {
  return d.toLocaleDateString("es-ES", { weekday: "narrow" });
}

function clampVisible(n) {
  return Math.min(MAX_VISIBLE, Math.max(MIN_VISIBLE, n));
}

/** Pastilla redimensionable con label que sigue el pan */
function TaskPill({
  row,
  rangeStart,
  dayW,
  totalDays,
  scrollLeft,
  chartViewportLeft,
  onResizeEnd,
}) {
  const color = row.stone.color || "#f59e0b";
  const key = taskKey(row.stone.id, row.task.id);

  // live resize override
  const [draft, setDraft] = useState(null);
  const from = draft?.from ?? row.from;
  const to = draft?.to ?? row.to;

  const start = daysBetween(rangeStart, from);
  const end = daysBetween(rangeStart, to);
  const left = start * dayW;
  const width = Math.max(dayW, (end - start + 1) * dayW);
  const pad = 2;
  const pillLeft = left + pad;
  const pillW = Math.max(dayW - pad * 2, width - pad * 2);

  // label sticky within pill based on scroll
  const pillAbsLeft = LABEL_W + pillLeft;
  const visibleLeft = scrollLeft + chartViewportLeft;
  const labelShift = Math.max(
    0,
    Math.min(pillW - 48, visibleLeft - pillAbsLeft + 6)
  );

  const dragRef = useRef(null);
  const draftRef = useRef(null);

  const beginDrag = (mode, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const origFrom = row.from;
    const origTo = row.to;
    // duración en días (inclusivo) — al mover se preserva
    const spanDays = daysBetween(origFrom, origTo);

    dragRef.current = { mode, startX, origFrom, origTo, spanDays };
    draftRef.current = null;

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dayDelta = Math.round(dx / dayW);
      let nextFrom = dragRef.current.origFrom;
      let nextTo = dragRef.current.origTo;

      if (dragRef.current.mode === "move") {
        // desplazar el bloque entero, snap a días, misma duración
        nextFrom = addDays(dragRef.current.origFrom, dayDelta);
        nextTo = addDays(nextFrom, dragRef.current.spanDays);
      } else if (dragRef.current.mode === "start") {
        nextFrom = addDays(dragRef.current.origFrom, dayDelta);
        if (nextFrom > nextTo) nextFrom = nextTo;
      } else {
        // end
        nextTo = addDays(dragRef.current.origTo, dayDelta);
        if (nextTo < nextFrom) nextTo = nextFrom;
      }

      const next = { from: nextFrom, to: nextTo };
      draftRef.current = next;
      setDraft(next);
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const mode = dragRef.current?.mode;
      dragRef.current = null;
      const final = draftRef.current;
      draftRef.current = null;
      setDraft(null);
      if (final) {
        const span = daysBetween(final.from, final.to) + 1;
        if (span >= MIN_PILL_DAYS) {
          onResizeEnd(key, final.from, final.to);
        }
      }
      void mode;
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const isMoving = draft && dragRef.current?.mode === "move";

  return (
    <div
      className={`group/pill absolute top-1.5 h-8 overflow-hidden rounded-full border shadow-md select-none ${
        row.done ? "opacity-65" : ""
      } ${draft ? "z-20 ring-2 ring-white/30" : ""} ${
        isMoving ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        left: pillLeft,
        width: pillW,
        background: `linear-gradient(135deg, ${color}dd, ${color}99)`,
        borderColor: color,
        boxShadow: `0 4px 14px -4px ${color}66`,
      }}
      title={`${row.task.title}\n${toISODate(from)} → ${toISODate(to)}\nArrastra para mover · extremos para redimensionar`}
      onPointerDown={(e) => {
        // solo botón principal; los handles paran la propagación
        if (e.button !== 0) return;
        beginDrag("move", e);
      }}
    >
      {/* resize handles (no mueven, redimensionan) */}
      <div
        onPointerDown={(e) => beginDrag("start", e)}
        className="absolute bottom-0 left-0 top-0 z-10 w-2.5 cursor-ew-resize opacity-0 transition group-hover/pill:opacity-100"
        style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.35), transparent)" }}
      >
        <span className="absolute left-0.5 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-white/80" />
      </div>
      <div
        onPointerDown={(e) => beginDrag("end", e)}
        className="absolute bottom-0 right-0 top-0 z-10 w-2.5 cursor-ew-resize opacity-0 transition group-hover/pill:opacity-100"
        style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.35), transparent)" }}
      >
        <span className="absolute right-0.5 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-white/80" />
      </div>

      {/* label that tracks pan, clipped inside pill */}
      <div
        className="pointer-events-none flex h-full max-w-full items-center gap-1.5 pr-3"
        style={{
          transform: `translateX(${labelShift}px)`,
          width: Math.max(40, pillW - labelShift),
        }}
      >
        <span className="truncate pl-2.5 text-[11px] font-bold text-white drop-shadow">
          {row.task.title}
        </span>
        {pillW - labelShift > 72 && (
          <span className="shrink-0 font-mono text-[9px] text-white/80">
            +{row.task.xp || 0}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TimelineView() {
  const {
    model,
    stats,
    filters,
    visibleStones,
    filteredTasks,
    isDone,
    updateTask,
  } = useApp();

  const scrollerRef = useRef(null);
  const [visibleDays, setVisibleDays] = useState(DEFAULT_VISIBLE);
  const [viewportW, setViewportW] = useState(1000);
  const [scrollLeft, setScrollLeft] = useState(0);
  /** Solo auto-scroll inicial una vez por rangeStart */
  const initialScrollDoneFor = useRef(null);
  /** Al hacer zoom, conservar el día centrado (offset fraccional) */
  const zoomAnchorDay = useRef(null);

  const today = startOfDay(new Date());
  const projectStart = parseProjectStart(model?.meta);

  // day width so ~visibleDays fit in chart area
  const chartViewportW = Math.max(200, viewportW - LABEL_W);
  const dayW = chartViewportW / visibleDays;

  const { rows, rangeStart, totalDays, months } = useMemo(() => {
    const stoneBlocks = visibleStones
      .map((s) => ({
        stone: s,
        st: stats.perStone.find((p) => p.id === s.id),
        tasks: filteredTasks(s),
      }))
      .filter((x) => x.tasks.length > 0 || filters.showAll);

    let minD = projectStart;
    let maxD = addDays(projectStart, 90);

    for (const block of stoneBlocks) {
      const sw = stoneDateWindow(block.stone, model.meta);
      if (sw) {
        if (sw.from < minD) minD = sw.from;
        if (sw.to > maxD) maxD = sw.to;
      }
      for (const t of block.tasks) {
        const tw = taskDateWindow(block.stone, t, model.meta);
        if (tw) {
          if (tw.from < minD) minD = tw.from;
          if (tw.to > maxD) maxD = tw.to;
        } else if (sw) {
          if (sw.from < minD) minD = sw.from;
          if (sw.to > maxD) maxD = sw.to;
        }
      }
    }

    minD = addDays(minD, -3);
    maxD = addDays(maxD, 7);
    // ensure range covers at least max zoom window
    if (daysBetween(minD, maxD) + 1 < MAX_VISIBLE) {
      maxD = addDays(minD, MAX_VISIBLE + 5);
    }
    const days = Math.max(MAX_VISIBLE, daysBetween(minD, maxD) + 1);

    const monthSegs = [];
    let i = 0;
    while (i < days) {
      const d = addDays(minD, i);
      const m = d.getMonth();
      const y = d.getFullYear();
      let len = 1;
      while (i + len < days) {
        const nd = addDays(minD, i + len);
        if (nd.getMonth() !== m || nd.getFullYear() !== y) break;
        len++;
      }
      monthSegs.push({ label: monthLabel(d), start: i, span: len });
      i += len;
    }

    const visualRows = [];
    for (const block of stoneBlocks) {
      const sw = stoneDateWindow(block.stone, model.meta);
      visualRows.push({
        type: "stone",
        stone: block.stone,
        st: block.st,
        from: sw?.from || minD,
        to: sw?.to || maxD,
      });
      for (const t of block.tasks) {
        const tw =
          taskDateWindow(block.stone, t, model.meta) ||
          sw || { from: projectStart, to: addDays(projectStart, 6) };
        visualRows.push({
          type: "task",
          stone: block.stone,
          task: t,
          from: tw.from,
          to: tw.to,
          done: isDone(block.stone, t),
        });
      }
    }

    return {
      rows: visualRows,
      rangeStart: minD,
      totalDays: days,
      months: monthSegs,
    };
  }, [
    visibleStones,
    filteredTasks,
    filters.showAll,
    model?.meta,
    stats,
    isDone,
    projectStart,
  ]);

  const todayOffset = daysBetween(rangeStart, today);
  const chartW = totalDays * dayW;

  // measure viewport (no tocar scroll)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? el.clientWidth;
      setViewportW((prev) => (Math.abs(prev - w) < 1 ? prev : w));
    });
    ro.observe(el);
    setViewportW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // scroll tracking for sticky labels only
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * Auto-scroll:
   * - una sola vez al cargar un rangeStart → centrar en hoy
   * - al cambiar zoom (visibleDays) → mantener el día que estaba en el centro
   * Nunca reescribir scroll en resize ni en cada re-render (peleaba con el pan)
   */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || dayW <= 0 || viewportW < 120) return;

    // Zoom: restaurar ancla del centro
    if (zoomAnchorDay.current != null) {
      const day = zoomAnchorDay.current;
      zoomAnchorDay.current = null;
      // no tocar initialScrollDoneFor
      requestAnimationFrame(() => {
        el.scrollLeft = Math.max(0, day * dayW - chartViewportW / 2);
      });
      return;
    }

    // Inicial por rangeStart (solo una vez)
    if (initialScrollDoneFor.current !== rangeStart.getTime()) {
      initialScrollDoneFor.current = rangeStart.getTime();
      requestAnimationFrame(() => {
        el.scrollLeft = Math.max(0, todayOffset * dayW - chartViewportW * 0.35);
      });
    }
    // Importante: NO depender de dayW/chartViewportW para re-centrar en hoy
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo rangeStart / visibleDays (zoom)
  }, [rangeStart, visibleDays, dayW, chartViewportW, todayOffset, viewportW]);

  const dayCells = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
  }, [totalDays, rangeStart]);

  const captureZoomAnchor = () => {
    const el = scrollerRef.current;
    if (!el || dayW <= 0) return;
    zoomAnchorDay.current = (el.scrollLeft + chartViewportW / 2) / dayW;
  };

  const zoomIn = () => {
    captureZoomAnchor();
    setVisibleDays((v) => clampVisible(v - ZOOM_STEP)); // fewer days = zoom in
  };
  const zoomOut = () => {
    captureZoomAnchor();
    setVisibleDays((v) => clampVisible(v + ZOOM_STEP));
  };

  // wheel zoom with ctrl/meta
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const onResizeEnd = useCallback(
    (key, from, to) => {
      // enforce min 1 day
      let a = startOfDay(from);
      let b = startOfDay(to);
      if (b < a) b = a;
      updateTask(key, {
        dateStart: toISODate(a),
        dateEnd: toISODate(b),
      });
    },
    [updateTask]
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-[rgba(10,10,16,0.95)] px-4 py-3 backdrop-blur-md">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-accent/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
                🪨 Piedra a Piedra
              </span>
              <ViewToggle />
            </div>
            <h1 className="truncate text-xl font-extrabold tracking-tight md:text-2xl">
              {model.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-black/30 p-1">
              <button
                type="button"
                onClick={zoomOut}
                disabled={visibleDays >= MAX_VISIBLE}
                className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10 disabled:opacity-30"
                title="Alejar (+3 días visibles)"
              >
                <Minus size={16} />
              </button>
              <span className="flex min-w-[4.5rem] items-center justify-center gap-1 font-mono text-[11px] text-dim">
                <ZoomIn size={12} />
                {visibleDays}d
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={visibleDays <= MIN_VISIBLE}
                className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10 disabled:opacity-30"
                title="Acercar (−3 días visibles)"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="min-w-[180px] rounded-xl border border-border bg-black/30 px-3 py-2">
              <div className="mb-1 flex justify-between font-mono text-[11px]">
                <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">
                  LVL {stats.level.level}
                </span>
                <span className="text-dim">{stats.pct.toFixed(0)}%</span>
              </div>
              <ProgressBar pct={stats.level.pct} />
            </div>
          </div>
        </div>
        <div className="min-h-[88px]">
          <FilterBar />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-mute">
          <span>
            {toISODate(rangeStart)} → {toISODate(addDays(rangeStart, totalDays - 1))}
          </span>
          <span>· vista {visibleDays} días</span>
          <span className="text-mute/70">(Ctrl+rueda para zoom)</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
            Hoy
          </span>
          <span className="text-mute/70">
            · Arrastra pastilla para mover · extremos para redimensionar
          </span>
        </div>
      </header>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative"
          style={{ width: LABEL_W + chartW, minHeight: "100%" }}
        >
          {/* sticky header */}
          <div
            className="sticky top-0 z-30 flex border-b border-border bg-[#0a0a10]/95 backdrop-blur-md"
            style={{ height: HEADER_H }}
          >
            <div
              className="sticky left-0 z-40 flex shrink-0 items-end border-r border-border bg-[#0a0a10] px-3 pb-2 font-mono text-[10px] uppercase tracking-widest text-mute"
              style={{ width: LABEL_W }}
            >
              Tarea / Piedra
            </div>
            <div className="relative" style={{ width: chartW }}>
              <div className="absolute left-0 right-0 top-0 flex h-6 border-b border-border/60">
                {months.map((m) => (
                  <div
                    key={`${m.label}-${m.start}`}
                    className="flex items-center border-r border-border/40 px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-dim"
                    style={{ width: m.span * dayW }}
                  >
                    {m.span * dayW > 36 ? m.label : ""}
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex h-8">
                {dayCells.map((d, dayIndex) => {
                  const isToday = daysBetween(d, today) === 0;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <button
                      type="button"
                      key={toISODate(d)}
                      title={`Ir a ${toISODate(d)}`}
                      onClick={() => {
                        const el = scrollerRef.current;
                        if (!el) return;
                        // Alinear este día al borde izquierdo del área visible del chart
                        el.scrollTo({
                          left: Math.max(0, dayIndex * dayW),
                          behavior: "smooth",
                        });
                      }}
                      className={`flex flex-col items-center justify-center border-r border-border/30 transition hover:bg-white/10 ${
                        isToday
                          ? "bg-rose-500/20"
                          : isWeekend
                            ? "bg-white/[0.02]"
                            : ""
                      }`}
                      style={{ width: dayW }}
                    >
                      {dayW >= 28 && (
                        <span className="text-[9px] text-mute">{weekdayShort(d)}</span>
                      )}
                      <span
                        className={`font-mono text-[11px] font-semibold ${
                          isToday ? "text-rose-300" : "text-dim"
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute bottom-0 top-0"
              style={{ left: LABEL_W, width: chartW }}
            >
              {dayCells.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={`g-${i}`}
                    className={`absolute top-0 bottom-0 border-r ${
                      isWeekend ? "border-border/40 bg-white/[0.015]" : "border-border/20"
                    }`}
                    style={{ left: i * dayW, width: dayW }}
                  />
                );
              })}
              {todayOffset >= 0 && todayOffset < totalDays && (
                <div
                  className="absolute top-0 bottom-0 z-10 w-0.5 bg-rose-400 shadow-[0_0_8px_#fb7185]"
                  style={{ left: todayOffset * dayW + dayW / 2 }}
                />
              )}
            </div>

            {rows.map((row) => {
              if (row.type === "stone") {
                const start = Math.max(0, daysBetween(rangeStart, row.from));
                const end = Math.min(totalDays - 1, daysBetween(rangeStart, row.to));
                const left = start * dayW;
                const width = Math.max(dayW, (end - start + 1) * dayW);
                return (
                  <div
                    key={`stone-${row.stone.id}`}
                    className="relative flex border-b border-border/50"
                    style={{ height: STONE_H }}
                  >
                    <div
                      className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-border bg-[#0c0c12] px-3"
                      style={{ width: LABEL_W }}
                    >
                      <span className="text-base">{row.stone.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-xs font-bold tracking-tight"
                          style={{ color: row.stone.color }}
                        >
                          {row.stone.number}. {row.stone.title}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-mute">
                        {row.st?.done}/{row.st?.total}
                      </span>
                    </div>
                    <div className="relative" style={{ width: chartW }}>
                      <div
                        className="absolute top-1.5 bottom-1.5 rounded-md opacity-25"
                        style={{ left, width, background: row.stone.color }}
                      />
                    </div>
                  </div>
                );
              }

              const key = taskKey(row.stone.id, row.task.id);
              return (
                <div
                  key={key}
                  className="group relative flex border-b border-border/30 hover:bg-white/[0.02]"
                  style={{ height: ROW_H }}
                >
                  <div
                    className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-border bg-[#0a0a0f] px-3 group-hover:bg-[#101018]"
                    style={{ width: LABEL_W }}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        row.done ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-[12px] font-semibold ${
                          row.done ? "text-dim line-through" : "text-text"
                        }`}
                      >
                        {row.task.title}
                      </div>
                      <div className="mt-0.5">
                        <AssigneeChips ids={row.task.assignees} compact />
                      </div>
                    </div>
                  </div>
                  <div className="relative" style={{ width: chartW, height: ROW_H }}>
                    <TaskPill
                      row={row}
                      rangeStart={rangeStart}
                      dayW={dayW}
                      totalDays={totalDays}
                      scrollLeft={scrollLeft}
                      chartViewportLeft={LABEL_W}
                      onResizeEnd={onResizeEnd}
                    />
                  </div>
                </div>
              );
            })}

            {rows.length === 0 && (
              <div className="flex h-40 items-center justify-center text-dim">
                No hay tareas que mostrar con los filtros actuales.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
