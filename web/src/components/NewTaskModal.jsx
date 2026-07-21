import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

/**
 * Modal para crear una tarea (reemplazo de window.prompt).
 */
export default function NewTaskModal({
  open,
  stoneTitle,
  busy = false,
  onSubmit,
  onClose,
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [xp, setXp] = useState(50);

  useEffect(() => {
    if (open) {
      setTitle("");
      setXp(50);
    }
  }, [open]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    onSubmit({
      title: trimmed,
      xp: Number.isFinite(Number(xp)) ? Math.max(0, parseInt(xp, 10) || 0) : 50,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={busy ? undefined : onClose}
    >
      <form
        className="w-full max-w-md rounded-2xl border border-border bg-elev p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              {t("views.newTask")}
            </div>
            <h3 className="text-lg font-bold tracking-tight">
              {stoneTitle || t("views.newTask")}
            </h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <label className="mb-3 block text-xs font-medium text-mute">
          {t("common.name")}
          <input
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("views.taskTitlePrompt")}
            className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
          />
        </label>

        <label className="mb-5 block text-xs font-medium text-mute">
          XP
          <input
            type="number"
            min={0}
            max={9999}
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-xl border border-accent/40 bg-accent/20 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("common.create")}
          </button>
        </div>
      </form>
    </div>
  );
}
