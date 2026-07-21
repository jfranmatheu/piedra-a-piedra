import { useMemo, useState } from "react";

const DEMO_STONES = [
  {
    id: "s1",
    n: 1,
    title: "Cimientos",
    color: "#f59e0b",
    icon: "🪨",
    tasks: [
      { id: "t1", title: "Definir visión", done: true, xp: 40 },
      { id: "t2", title: "Equipo core", done: true, xp: 50 },
      { id: "t3", title: "Stack base", done: false, xp: 60 },
    ],
  },
  {
    id: "s2",
    n: 2,
    title: "MVP vivo",
    color: "#34d399",
    icon: "⚡",
    tasks: [
      { id: "t4", title: "Kanban usable", done: true, xp: 80 },
      { id: "t5", title: "Timeline", done: false, xp: 70 },
      { id: "t6", title: "Invites @user", done: false, xp: 55 },
    ],
  },
  {
    id: "s3",
    n: 3,
    title: "Escala",
    color: "#60a5fa",
    icon: "🚀",
    tasks: [
      { id: "t7", title: "Roles & ownership", done: false, xp: 90 },
      { id: "t8", title: "Waitlist batch", done: false, xp: 45 },
    ],
  },
];

function useDemoBoard() {
  const [stones, setStones] = useState(DEMO_STONES);
  const toggle = (stoneId, taskId) => {
    setStones((prev) =>
      prev.map((s) =>
        s.id !== stoneId
          ? s
          : {
              ...s,
              tasks: s.tasks.map((t) =>
                t.id === taskId ? { ...t, done: !t.done } : t
              ),
            }
      )
    );
  };
  const stats = useMemo(() => {
    const all = stones.flatMap((s) => s.tasks);
    const done = all.filter((t) => t.done).length;
    const xp = all.filter((t) => t.done).reduce((a, t) => a + t.xp, 0);
    const totalXp = all.reduce((a, t) => a + t.xp, 0);
    return {
      done,
      total: all.length,
      xp,
      totalXp,
      pct: all.length ? Math.round((done / all.length) * 100) : 0,
      level: 1 + Math.floor(xp / 100),
    };
  }, [stones]);
  return { stones, toggle, stats };
}

export function MiniKanban() {
  const { stones, toggle, stats } = useDemoBoard();
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
          Vista Kanban
        </span>
        <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-accent">
          LVL {stats.level} · {stats.pct}%
        </span>
      </div>
      <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto pb-1">
        {stones.map((s) => (
          <div
            key={s.id}
            className="flex w-[140px] shrink-0 flex-col rounded-xl border bg-black/40 p-2"
            style={{ borderColor: `${s.color}44` }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-sm">{s.icon}</span>
              <div className="min-w-0">
                <div
                  className="font-mono text-[9px] uppercase"
                  style={{ color: s.color }}
                >
                  P{s.n}
                </div>
                <div className="truncate text-[11px] font-bold">{s.title}</div>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              {s.tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(s.id, t.id)}
                  className={`rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5 text-left text-[10px] transition hover:border-white/15 ${
                    t.done ? "opacity-55 line-through" : ""
                  }`}
                >
                  <span className="mr-1">{t.done ? "✓" : "○"}</span>
                  {t.title}
                  <span className="mt-0.5 block font-mono text-[9px] text-amber-400/80">
                    +{t.xp} XP
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-mute">
        Clic en una tarjeta para marcar hecha / pendiente
      </p>
    </div>
  );
}

export function MiniTimeline() {
  const { stones, toggle, stats } = useDemoBoard();
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-sky-400">
          Vista Timeline
        </span>
        <span className="font-mono text-[10px] text-mute">
          {stats.done}/{stats.total} · {stats.xp} XP
        </span>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-0.5">
        {days.map((d) => (
          <div
            key={d}
            className="text-center font-mono text-[9px] text-mute"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {stones.map((s, si) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className="w-16 shrink-0 truncate text-[10px] font-semibold">
              {s.icon} {s.title}
            </div>
            <div className="relative h-7 flex-1 rounded-md bg-white/[0.03]">
              <div
                className="absolute top-1 bottom-1 rounded-md opacity-80"
                style={{
                  left: `${8 + si * 12}%`,
                  width: `${28 + si * 8}%`,
                  background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`,
                }}
              />
              {s.tasks.slice(0, 2).map((t, ti) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.title}
                  onClick={() => toggle(s.id, t.id)}
                  className={`absolute top-1.5 h-4 w-4 rounded-full border-2 border-bg text-[8px] ${
                    t.done ? "bg-emerald-400" : "bg-white/20"
                  }`}
                  style={{ left: `${14 + si * 12 + ti * 14}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] text-mute">
        Clic en los puntos para completar hitos
      </p>
    </div>
  );
}

export function MiniPanel() {
  const { stones, toggle, stats } = useDemoBoard();
  const [active, setActive] = useState(stones[0].id);
  const stone = stones.find((s) => s.id === active) || stones[0];
  return (
    <div className="flex h-full gap-2">
      <div className="w-[38%] space-y-1 overflow-y-auto border-r border-white/5 pr-2">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-violet-400">
          Panel
        </div>
        {stones.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] ${
              s.id === stone.id
                ? "bg-white/10 font-semibold"
                : "hover:bg-white/5"
            }`}
            style={
              s.id === stone.id
                ? { boxShadow: `inset 2px 0 0 ${s.color}` }
                : undefined
            }
          >
            <span>{s.icon}</span>
            <span className="truncate">{s.title}</span>
          </button>
        ))}
        <div className="pt-2 font-mono text-[9px] text-mute">
          XP {stats.xp}/{stats.totalXp}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xl">{stone.icon}</span>
          <div>
            <div
              className="font-mono text-[9px] uppercase"
              style={{ color: stone.color }}
            >
              Piedra {stone.n}
            </div>
            <div className="text-sm font-bold">{stone.title}</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {stone.tasks.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-black/25 px-2 py-1.5 text-[11px]"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(stone.id, t.id)}
                className="accent-amber-500"
              />
              <span className={t.done ? "text-dim line-through" : ""}>
                {t.title}
              </span>
              <span className="ml-auto font-mono text-[9px] text-amber-400">
                +{t.xp}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingPreviewStage() {
  const [mode, setMode] = useState("kanban");
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#12121c] via-[#0c0c14] to-[#15101a] p-4 shadow-2xl shadow-amber-500/5 sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />

      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full border border-white/10 bg-black/40 p-1">
          {[
            { id: "kanban", label: "Kanban" },
            { id: "timeline", label: "Timeline" },
            { id: "panel", label: "Panel" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                mode === m.id
                  ? "bg-accent/25 text-accent"
                  : "text-mute hover:text-dim"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10px] text-mute">demo interactiva</span>
      </div>

      <div className="relative min-h-[260px] sm:min-h-[280px]">
        {mode === "kanban" && <MiniKanban />}
        {mode === "timeline" && <MiniTimeline />}
        {mode === "panel" && <MiniPanel />}
      </div>
    </div>
  );
}
