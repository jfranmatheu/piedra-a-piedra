import { AlertTriangle, X } from "lucide-react";
import { useI18n } from "../i18n";

/**
 * Confirmación in-app (reemplazo de window.confirm).
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   message: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   danger?: boolean,
 *   busy?: boolean,
 *   onConfirm: () => void | Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-elev p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {danger && (
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-300">
                <AlertTriangle size={16} />
              </span>
            )}
            <div>
              <h3 id="confirm-title" className="text-base font-bold tracking-tight">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-dim">{message}</p>
            </div>
          </div>
          {!busy && (
            <button
              type="button"
              onClick={onCancel}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-dim hover:bg-white/10"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5 disabled:opacity-50"
          >
            {cancelLabel || t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
              danger
                ? "border-rose-500/45 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                : "border-accent/40 bg-accent/20 text-text hover:bg-accent/30"
            }`}
          >
            {busy ? "…" : confirmLabel || t("common.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
