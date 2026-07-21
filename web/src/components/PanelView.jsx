import { useState } from "react";
import { useApp } from "../context/AppContext";
import { taskKey } from "../lib/utils";
import { AssigneeChips, ProgressBar } from "./ui";
import FilterBar from "./FilterBar";
import ViewToggle from "./ViewToggle";

export default function PanelView() {
  const {
    model,
    stats,
    visibleStones,
    filteredTasks,
    isDone,
    moveTask,
  } = useApp();

  const stones = visibleStones.filter(
    (s) => filteredTasks(s).length > 0 || true
  );
  const [activeId, setActiveId] = useState(stones[0]?.id || null);
  const active = stones.find((s) => s.id === activeId) || stones[0];
  const st = active && stats.perStone.find((p) => p.id === active.id);
  const tasks = active ? filteredTasks(active) : [];

  return (
    <div className="grid h-dvh grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]">
      <aside className="flex flex-col border-b border-border bg-[rgba(10,10,16,0.92)] md:border-b-0 md:border-r">
        <div className="border-b border-border p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">
            🪨 Piedra a Piedra
          </div>
          <ViewToggle />
          <div className="mt-3 text-sm font-bold">{model.title}</div>
          <div className="mt-3">
            <ProgressBar pct={stats.pct} />
            <div className="mt-1 font-mono text-[10px] text-mute">
              LVL {stats.level.level} · {stats.pct.toFixed(0)}%
            </div>
          </div>
          <div className="mt-3 min-h-[120px]">
            <FilterBar />
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {stones.map((s) => {
            const pst = stats.perStone.find((p) => p.id === s.id);
            const on = s.id === active?.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`flex w-full items-start gap-2 rounded-xl border p-2.5 text-left transition ${
                  on
                    ? "border-white/15 bg-white/5"
                    : "border-transparent hover:bg-white/[0.03]"
                }`}
                style={on ? { boxShadow: `inset 3px 0 0 ${s.color}` } : undefined}
              >
                <span className="text-lg">{s.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[10px]" style={{ color: s.color }}>
                    Piedra {s.number}
                  </span>
                  <span className="block truncate text-sm font-semibold">{s.title}</span>
                  <span className="font-mono text-[10px] text-mute">
                    {pst?.done}/{pst?.total}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="overflow-y-auto p-5">
        {active ? (
          <article
            className="rounded-2xl border border-border bg-card/80 p-6"
            style={{
              background: `linear-gradient(145deg, color-mix(in srgb, ${active.color} 8%, transparent), transparent 45%), rgba(18,18,28,0.8)`,
            }}
          >
            <div className="mb-4 flex gap-4">
              <span
                className="grid h-16 w-16 place-items-center rounded-2xl border-2 text-3xl"
                style={{ borderColor: active.color }}
              >
                {active.icon}
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: active.color }}>
                  Piedra {active.number}
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">{active.title}</h1>
                {active.description && (
                  <p className="mt-1 whitespace-pre-line text-sm text-dim">{active.description}</p>
                )}
              </div>
            </div>
            <ProgressBar pct={st?.pct || 0} color={active.color} className="mb-4 h-2" />
            <div className="space-y-2">
              {tasks.map((t) => {
                const done = isDone(active, t);
                const key = taskKey(active.id, t.id);
                return (
                  <div
                    key={key}
                    className={`grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-border bg-black/20 p-3 ${done ? "opacity-70" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={(e) => moveTask(key, active.id, e.target.checked)}
                      className="mt-1 h-5 w-5 accent-amber-500"
                    />
                    <div>
                      <div className={`font-semibold ${done ? "line-through text-dim" : ""}`}>
                        {t.title}
                      </div>
                      {t.notes && <p className="text-sm text-dim">{t.notes}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <AssigneeChips ids={t.assignees} />
                        <span className="font-mono text-[10px] text-amber-300">+{t.xp || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ) : (
          <p className="text-dim">Sin piedras visibles.</p>
        )}
      </main>
    </div>
  );
}
