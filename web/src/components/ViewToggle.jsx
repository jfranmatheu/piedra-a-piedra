import { Columns3, LayoutList, PanelLeft } from "lucide-react";
import { useApp } from "../context/AppContext";
import { cn } from "../lib/utils";

const VIEWS = [
  { id: "timeline", label: "Timeline", Icon: LayoutList },
  { id: "sidebar", label: "Panel", Icon: PanelLeft },
  { id: "kanban", label: "Kanban", Icon: Columns3 },
];

export default function ViewToggle() {
  const { viewMode, setViewMode } = useApp();
  return (
    <div className="inline-flex gap-0.5 rounded-full border border-border bg-black/35 p-0.5">
      {VIEWS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setViewMode(id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
            viewMode === id
              ? "bg-white/10 text-text shadow-sm"
              : "text-mute hover:text-dim"
          )}
        >
          <Icon size={14} strokeWidth={2} />
          {label}
        </button>
      ))}
    </div>
  );
}
