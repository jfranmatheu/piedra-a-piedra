import {
  Check,
  CheckCheck,
  Minus,
  Plus,
  Square,
  X,
  XSquare,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { countAcceptedChanges } from "../lib/stonesDiff";

const KIND_STYLE = {
  added: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  removed: "border-rose-500/35 bg-rose-500/10 text-rose-300",
  modified: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  unchanged: "border-border bg-black/20 text-mute",
};

function KindBadge({ kind, t }) {
  const label =
    kind === "added"
      ? t("ai.kindAdded")
      : kind === "removed"
        ? t("ai.kindRemoved")
        : kind === "modified"
          ? t("ai.kindModified")
          : t("ai.kindUnchanged");
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${KIND_STYLE[kind] || KIND_STYLE.unchanged}`}
    >
      {label}
    </span>
  );
}

function AcceptToggle({ accepted, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!accepted)}
      className={[
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition",
        accepted
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
          : "border-border bg-black/30 text-mute",
        disabled ? "opacity-40" : "hover:border-white/20",
      ].join(" ")}
    >
      {accepted ? <Check size={12} /> : <Square size={12} />}
      {accepted ? "ON" : "OFF"}
    </button>
  );
}

function FieldDiffList({ changes }) {
  if (!changes?.length) return null;
  return (
    <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-dim">
      {changes.map((c) => (
        <li key={c.field} className="flex flex-wrap gap-x-2 gap-y-0.5">
          <span className="text-mute">{c.field}:</span>
          <span className="text-rose-300/90 line-through">
            {String(c.before ?? "") || "∅"}
          </span>
          <span className="text-mute">→</span>
          <span className="text-emerald-300/90">
            {String(c.after ?? "") || "∅"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AiDiffReviewModal({
  diff,
  onChangeDiff,
  onConfirm,
  onCancel,
  busy,
}) {
  const { t } = useI18n();
  const [showUnchanged, setShowUnchanged] = useState(false);

  const acceptedCount = useMemo(() => countAcceptedChanges(diff), [diff]);

  const visibleStones = useMemo(() => {
    const list = diff?.stones || [];
    if (showUnchanged) return list;
    return list.filter((s) => s.kind !== "unchanged");
  }, [diff, showUnchanged]);

  const setStoneAccepted = (stoneId, accepted) => {
    onChangeDiff({
      ...diff,
      stones: diff.stones.map((s) => {
        if (s.id !== stoneId) return s;
        return {
          ...s,
          accepted,
          taskDiffs: (s.taskDiffs || []).map((td) =>
            td.kind === "unchanged" ? td : { ...td, accepted }
          ),
        };
      }),
    });
  };

  const setTaskAccepted = (stoneId, taskId, accepted) => {
    onChangeDiff({
      ...diff,
      stones: diff.stones.map((s) => {
        if (s.id !== stoneId) return s;
        return {
          ...s,
          taskDiffs: (s.taskDiffs || []).map((td) =>
            td.id === taskId ? { ...td, accepted } : td
          ),
        };
      }),
    });
  };

  const setAll = (accepted) => {
    onChangeDiff({
      ...diff,
      project:
        diff.project?.kind === "modified"
          ? { ...diff.project, accepted }
          : diff.project,
      stones: diff.stones.map((s) => ({
        ...s,
        accepted: s.kind === "unchanged" ? false : accepted,
        taskDiffs: (s.taskDiffs || []).map((td) => ({
          ...td,
          accepted: td.kind === "unchanged" ? false : accepted,
        })),
      })),
    });
  };

  const sm = diff?.summary || {};

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-3 backdrop-blur-md sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-elev shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              NVIDIA NIM
            </div>
            <h2 className="text-lg font-bold tracking-tight">{t("ai.reviewTitle")}</h2>
            <p className="mt-1 text-xs text-dim">{t("ai.reviewLead")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-mute">
              {sm.stonesAdded > 0 && (
                <span className="rounded-md border border-emerald-500/30 px-1.5 py-0.5 text-emerald-300">
                  +{sm.stonesAdded} {t("ai.stones")}
                </span>
              )}
              {sm.stonesRemoved > 0 && (
                <span className="rounded-md border border-rose-500/30 px-1.5 py-0.5 text-rose-300">
                  −{sm.stonesRemoved} {t("ai.stones")}
                </span>
              )}
              {sm.stonesModified > 0 && (
                <span className="rounded-md border border-amber-500/30 px-1.5 py-0.5 text-amber-200">
                  ~{sm.stonesModified} {t("ai.stones")}
                </span>
              )}
              {sm.tasksAdded > 0 && (
                <span className="rounded-md border border-emerald-500/30 px-1.5 py-0.5 text-emerald-300">
                  +{sm.tasksAdded} {t("ai.tasks")}
                </span>
              )}
              {sm.tasksRemoved > 0 && (
                <span className="rounded-md border border-rose-500/30 px-1.5 py-0.5 text-rose-300">
                  −{sm.tasksRemoved} {t("ai.tasks")}
                </span>
              )}
              {sm.tasksModified > 0 && (
                <span className="rounded-md border border-amber-500/30 px-1.5 py-0.5 text-amber-200">
                  ~{sm.tasksModified} {t("ai.tasks")}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-dim hover:text-text"
          >
            <CheckCheck size={12} /> {t("ai.acceptAll")}
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-dim hover:text-text"
          >
            <XSquare size={12} /> {t("ai.rejectAll")}
          </button>
          <label className="ml-auto flex items-center gap-1.5 text-[11px] text-mute">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
            />
            {t("ai.showUnchanged")}
          </label>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {diff?.project?.kind === "modified" && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KindBadge kind="modified" t={t} />
                  <span className="text-sm font-semibold">{t("ai.projectMeta")}</span>
                </div>
                <AcceptToggle
                  accepted={!!diff.project.accepted}
                  onChange={(v) =>
                    onChangeDiff({
                      ...diff,
                      project: { ...diff.project, accepted: v },
                    })
                  }
                />
              </div>
              <FieldDiffList changes={diff.project.changes} />
            </div>
          )}

          {visibleStones.length === 0 && (
            <p className="py-8 text-center text-sm text-mute">{t("ai.noChanges")}</p>
          )}

          {visibleStones.map((s) => {
            const title =
              s.after?.title || s.before?.title || t("ai.untitledStone");
            const num = s.after?.number ?? s.before?.number;
            const taskVisible = (s.taskDiffs || []).filter(
              (td) => showUnchanged || td.kind !== "unchanged"
            );
            return (
              <div
                key={s.id}
                className="rounded-xl border border-border bg-black/25 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <KindBadge kind={s.kind} t={t} />
                      <span className="text-sm font-semibold text-text">
                        {s.kind === "removed" ? (
                          <span className="inline-flex items-center gap-1 text-rose-300">
                            <Minus size={12} />
                            {num != null ? `P${num} · ${title}` : title}
                          </span>
                        ) : s.kind === "added" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <Plus size={12} />
                            {num != null ? `P${num} · ${title}` : title}
                          </span>
                        ) : (
                          <span>
                            {num != null ? `P${num} · ${title}` : title}
                          </span>
                        )}
                      </span>
                    </div>
                    <FieldDiffList changes={s.changes} />
                  </div>
                  {s.kind !== "unchanged" && (
                    <AcceptToggle
                      accepted={!!s.accepted}
                      onChange={(v) => setStoneAccepted(s.id, v)}
                    />
                  )}
                </div>

                {taskVisible.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2">
                    {taskVisible.map((td) => {
                      const tt =
                        td.after?.title ||
                        td.before?.title ||
                        t("ai.untitledTask");
                      return (
                        <div
                          key={td.id}
                          className="flex items-start justify-between gap-2 rounded-lg bg-black/30 px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <KindBadge kind={td.kind} t={t} />
                              <span className="truncate text-xs text-dim">
                                {tt}
                              </span>
                            </div>
                            <FieldDiffList changes={td.changes} />
                          </div>
                          {td.kind !== "unchanged" && (
                            <AcceptToggle
                              accepted={!!td.accepted}
                              disabled={s.kind === "removed" && s.accepted}
                              onChange={(v) => setTaskAccepted(s.id, td.id, v)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-mute">
            {t("ai.acceptedCount", { n: acceptedCount })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim hover:bg-white/5"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy || acceptedCount === 0}
              onClick={onConfirm}
              className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold text-text disabled:opacity-50"
            >
              {busy ? t("common.saving") : t("ai.confirmApply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
