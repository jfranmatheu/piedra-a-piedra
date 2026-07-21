import { cn, initials } from "../lib/utils";
import { useApp } from "../context/AppContext";

export function AssigneeChips({ ids, compact = false }) {
  const { model } = useApp();
  const team = model?.team || [];
  const map = Object.fromEntries(team.map((m) => [m.id, m]));
  if (!ids?.length) {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-mute">
        {compact ? "—" : "Sin asignar"}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {ids.map((id) => {
        const m = map[id] || { id, name: id, color: "#666" };
        if (compact) {
          return (
            <span
              key={id}
              title={m.role ? `${m.name} · ${m.role}` : m.name}
              className="inline-grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] font-bold text-bg"
              style={{ background: m.color }}
            >
              {initials(m.name)}
            </span>
          );
        }
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold"
            style={{
              borderColor: `${m.color}55`,
              background: `${m.color}22`,
            }}
          >
            <span
              className="inline-grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-bg"
              style={{ background: m.color }}
            >
              {initials(m.name)}
            </span>
            {m.name}
          </span>
        );
      })}
    </span>
  );
}

export function Toggle({ checked, onChange, label, title }) {
  return (
    <label
      className="inline-flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-dim"
      title={title}
    >
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="absolute inset-0 rounded-full border border-border bg-white/10 transition peer-checked:border-accent/50 peer-checked:bg-accent/30" />
        <span className="absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-mute transition peer-checked:translate-x-4 peer-checked:bg-accent" />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </label>
  );
}

export function Chip({ children, active, onClick, style, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
        active
          ? "border-accent/40 bg-accent/15 text-text"
          : "border-border bg-white/[0.03] text-dim hover:border-border-strong hover:text-text",
        className
      )}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ pct, color, className }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/5", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, pct || 0)}%`,
          background: color || "var(--color-accent)",
        }}
      />
    </div>
  );
}
