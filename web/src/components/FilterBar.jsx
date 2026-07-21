import { useApp } from "../context/AppContext";
import { formatShortDate, parseProjectStart, startOfDay } from "../lib/dates";
import { initials } from "../lib/utils";
import { Chip, Toggle } from "./ui";

export default function FilterBar() {
  const { model, filters, setFilters, filteredTasks, visibleStones, viewMode, UNASSIGNED } =
    useApp();
  const team = model?.team || [];
  const start = parseProjectStart(model?.meta);
  const today = startOfDay(new Date());

  let total = 0;
  let shown = 0;
  for (const s of model.stones) {
    for (const t of s.tasks) {
      total += 1;
    }
  }
  for (const s of visibleStones) {
    shown += filteredTasks(s).length;
  }

  const reset = () =>
    setFilters({ members: [], incompleteOnly: true, showAll: false });

  const showReset =
    filters.members.length > 0 || filters.showAll || !filters.incompleteOnly;

  return (
    <div className="flex flex-col gap-2.5 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-mute">
          Equipo
        </span>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <Chip
            active={!filters.members.length}
            onClick={() => setFilters((f) => ({ ...f, members: [] }))}
          >
            Todos
          </Chip>
          {team.map((m) => {
            const on = filters.members.includes(m.id);
            return (
              <Chip
                key={m.id}
                active={on}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    members: on
                      ? f.members.filter((x) => x !== m.id)
                      : [...f.members, m.id],
                  }))
                }
                style={
                  on
                    ? {
                        borderColor: `${m.color}66`,
                        background: `${m.color}22`,
                      }
                    : undefined
                }
              >
                <span
                  className="inline-grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-bg"
                  style={{ background: m.color }}
                >
                  {initials(m.name)}
                </span>
                {m.name}
              </Chip>
            );
          })}
          <Chip
            active={filters.members.includes(UNASSIGNED)}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                members: f.members.includes(UNASSIGNED)
                  ? f.members.filter((x) => x !== UNASSIGNED)
                  : [...f.members, UNASSIGNED],
              }))
            }
          >
            Sin asignar
          </Chip>
        </div>
      </div>

      {/* Fixed-height row to avoid toggle jump when columns change */}
      <div className="flex min-h-[36px] flex-wrap items-center gap-x-4 gap-y-2">
        <Toggle
          checked={filters.showAll}
          onChange={(v) => setFilters((f) => ({ ...f, showAll: v }))}
          label="Mostrar todo"
          title="Desactivado: solo piedras/tareas en su ventana de fechas"
        />
        <Toggle
          checked={filters.incompleteOnly}
          onChange={(v) => setFilters((f) => ({ ...f, incompleteOnly: v }))}
          label="Solo incompletas"
          title={
            viewMode === "kanban"
              ? filters.incompleteOnly
                ? "Solo columna TODO"
                : "Columnas TODO + DONE"
              : "Ocultar hechas"
          }
        />
        <span className="font-mono text-[11px] text-mute">
          <strong className="text-text">{shown}</strong> / {total}
          {!filters.showAll && (
            <span> · activo {formatShortDate(today)}</span>
          )}
          <span className="opacity-70"> · start {formatShortDate(start)}</span>
        </span>
        {showReset && (
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
