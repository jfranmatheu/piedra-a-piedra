import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  PencilLine,
  Square,
  Trash2,
  X,
  XSquare,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  buildReviewSections,
  countAcceptedChanges,
} from "../lib/stonesDiff";
import { diffLines } from "../lib/textDiff";

function AcceptToggle({ accepted, onChange, disabled, labelOn, labelOff }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!accepted)}
      className={[
        "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
        accepted
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
          : "border-border bg-black/30 text-mute",
        disabled ? "cursor-not-allowed opacity-40" : "hover:border-white/20",
      ].join(" ")}
    >
      {accepted ? <Check size={12} /> : <Square size={12} />}
      {accepted ? labelOn : labelOff}
    </button>
  );
}

function FieldPills({ changes, t }) {
  if (!changes?.length) return null;
  const labels = {
    title: t("ai.fieldTitle"),
    description: t("ai.fieldDescription"),
    notes: t("ai.fieldNotes"),
    xp: "XP",
    done: t("ai.fieldDone"),
    period: t("ai.fieldPeriod"),
    time: t("ai.fieldTime"),
    icon: t("ai.fieldIcon"),
    color: t("ai.fieldColor"),
    dateStart: t("ai.fieldDateStart"),
    dateEnd: t("ai.fieldDateEnd"),
    img: t("ai.fieldImg"),
    number: t("ai.fieldNumber"),
    start: t("ai.fieldStart"),
    end: t("ai.fieldEnd"),
    subtitle: t("ai.fieldSubtitle"),
  };
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {changes.map((c) => (
        <span
          key={c.field}
          className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-100/90"
          title={`${c.before ?? "∅"} → ${c.after ?? "∅"}`}
        >
          {labels[c.field] || c.field}
        </span>
      ))}
    </div>
  );
}

/** Vista unificada de líneas add/del/same */
function UnifiedDiffView({ beforeText, afterText, mode }) {
  // mode: 'new' | 'removed' | 'changed'
  if (mode === "new") {
    const lines = String(afterText || "").split("\n");
    return (
      <pre className="max-h-56 overflow-auto rounded-xl border border-emerald-500/25 bg-emerald-950/30 p-3 font-mono text-[11px] leading-relaxed text-emerald-100/90">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <span className="w-4 shrink-0 select-none text-emerald-500/70">+</span>
            <span className="min-w-0 whitespace-pre-wrap break-all">{line || " "}</span>
          </div>
        ))}
      </pre>
    );
  }
  if (mode === "removed") {
    const lines = String(beforeText || "").split("\n");
    return (
      <pre className="max-h-56 overflow-auto rounded-xl border border-rose-500/25 bg-rose-950/30 p-3 font-mono text-[11px] leading-relaxed text-rose-100/90">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <span className="w-4 shrink-0 select-none text-rose-500/70">−</span>
            <span className="min-w-0 whitespace-pre-wrap break-all line-through opacity-90">
              {line || " "}
            </span>
          </div>
        ))}
      </pre>
    );
  }

  const lines = diffLines(beforeText, afterText);
  const onlyChanges = lines.filter((l) => l.type !== "same");
  // Si hay pocas líneas, mostrar contexto completo; si no, solo cambios + un poco de same
  const show =
    lines.length <= 24
      ? lines
      : (() => {
          const out = [];
          for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (l.type !== "same") {
              // 1 same before
              if (i > 0 && lines[i - 1].type === "same" && out[out.length - 1] !== lines[i - 1]) {
                out.push(lines[i - 1]);
              }
              out.push(l);
              if (i + 1 < lines.length && lines[i + 1].type === "same") {
                out.push(lines[i + 1]);
              }
            }
          }
          return out.length ? out : onlyChanges;
        })();

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-rose-300/80">
          Antes
        </div>
        <pre className="max-h-64 overflow-auto rounded-xl border border-rose-500/20 bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed">
          {show
            .filter((l) => l.type === "same" || l.type === "del")
            .map((l, i) => (
              <div
                key={`b-${i}`}
                className={[
                  "flex gap-1.5 rounded-sm px-0.5",
                  l.type === "del" ? "bg-rose-500/15 text-rose-200" : "text-mute",
                ].join(" ")}
              >
                <span className="w-3 shrink-0 select-none opacity-60">
                  {l.type === "del" ? "−" : " "}
                </span>
                <span className="min-w-0 whitespace-pre-wrap break-all">
                  {l.text || " "}
                </span>
              </div>
            ))}
        </pre>
      </div>
      <div>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300/80">
          Después
        </div>
        <pre className="max-h-64 overflow-auto rounded-xl border border-emerald-500/20 bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed">
          {show
            .filter((l) => l.type === "same" || l.type === "add")
            .map((l, i) => (
              <div
                key={`a-${i}`}
                className={[
                  "flex gap-1.5 rounded-sm px-0.5",
                  l.type === "add"
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "text-mute",
                ].join(" ")}
              >
                <span className="w-3 shrink-0 select-none opacity-60">
                  {l.type === "add" ? "+" : " "}
                </span>
                <span className="min-w-0 whitespace-pre-wrap break-all">
                  {l.text || " "}
                </span>
              </div>
            ))}
        </pre>
      </div>
    </div>
  );
}

function ReviewCard({
  entry,
  t,
  accepted,
  onToggle,
  disabled,
  mode,
}) {
  const [open, setOpen] = useState(true);
  const item = entry.item;
  const beforeText = item.beforeText || "";
  const afterText = item.afterText || "";

  return (
    <div
      className={[
        "rounded-xl border p-3",
        mode === "new"
          ? "border-emerald-500/25 bg-emerald-500/[0.06]"
          : mode === "removed"
            ? "border-rose-500/25 bg-rose-500/[0.06]"
            : "border-amber-500/25 bg-amber-500/[0.05]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <span className="mt-0.5 text-mute">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={[
                  "rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
                  entry.type === "stone"
                    ? "border-white/10 bg-black/30 text-dim"
                    : entry.type === "project"
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
                      : "border-white/10 bg-black/20 text-mute",
                ].join(" ")}
              >
                {entry.type === "stone"
                  ? t("ai.entityStone")
                  : entry.type === "task"
                    ? t("ai.entityTask")
                    : t("ai.entityProject")}
              </span>
              <span className="text-sm font-semibold text-text">{entry.label}</span>
            </div>
            {mode === "changed" && <FieldPills changes={item.changes} t={t} />}
          </div>
        </button>
        <AcceptToggle
          accepted={accepted}
          onChange={onToggle}
          disabled={disabled}
          labelOn={t("ai.include")}
          labelOff={t("ai.exclude")}
        />
      </div>

      {open && (
        <div className="mt-3">
          <UnifiedDiffView
            beforeText={beforeText}
            afterText={afterText}
            mode={mode}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  accent,
  children,
  empty,
}) {
  if (count === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={15} className={accent} />
        <h3 className="text-sm font-bold tracking-tight text-text">{title}</h3>
        <span className="rounded-full border border-border bg-black/30 px-2 py-0.5 font-mono text-[10px] text-mute">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-mute">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
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
  const [showFull, setShowFull] = useState(false);

  const acceptedCount = useMemo(() => countAcceptedChanges(diff), [diff]);
  const sections = useMemo(() => buildReviewSections(diff), [diff]);

  const setProjectAccepted = (v) => {
    onChangeDiff({
      ...diff,
      project: { ...diff.project, accepted: v },
    });
  };

  const setStoneAccepted = (stoneId, accepted) => {
    onChangeDiff({
      ...diff,
      stones: diff.stones.map((s) => {
        if (s.id !== stoneId) return s;
        if (s.kind === "added") {
          return {
            ...s,
            accepted,
            taskDiffs: (s.taskDiffs || []).map((td) =>
              td.kind === "added" ? { ...td, accepted } : td
            ),
          };
        }
        if (s.kind === "removed") {
          return {
            ...s,
            accepted,
            taskDiffs: (s.taskDiffs || []).map((td) => ({ ...td, accepted })),
          };
        }
        // modified: solo campos de piedra
        return { ...s, accepted };
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
        accepted:
          s.kind === "unchanged"
            ? false
            : s.kind === "modified"
              ? s.stoneFieldsChanged
                ? accepted
                : s.accepted
              : accepted,
        taskDiffs: (s.taskDiffs || []).map((td) => ({
          ...td,
          accepted: td.kind === "unchanged" ? false : accepted,
        })),
      })),
    });
  };

  const totalItems =
    sections.neu.length + sections.changed.length + sections.removed.length;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-2 backdrop-blur-md sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-elev shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              NVIDIA NIM · .stones
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              {t("ai.reviewTitle")}
            </h2>
            <p className="mt-1 text-xs text-dim">{t("ai.reviewLead")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              {sections.neu.length > 0 && (
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                  +{sections.neu.length} {t("ai.sectionNew")}
                </span>
              )}
              {sections.changed.length > 0 && (
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-200">
                  ~{sections.changed.length} {t("ai.sectionChanged")}
                </span>
              )}
              {sections.removed.length > 0 && (
                <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-rose-300">
                  −{sections.removed.length} {t("ai.sectionRemoved")}
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

        {/* Toolbar */}
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
          <button
            type="button"
            onClick={() => setShowFull((v) => !v)}
            className="ml-auto text-[11px] text-mute underline-offset-2 hover:text-dim hover:underline"
          >
            {showFull ? t("ai.hideFullDiff") : t("ai.showFullDiff")}
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {totalItems === 0 && (
            <p className="py-10 text-center text-sm text-mute">
              {t("ai.noChanges")}
            </p>
          )}

          {showFull && diff?.fullBeforeText != null && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-text">{t("ai.fullFileDiff")}</h3>
              <p className="text-[11px] text-mute">{t("ai.fullFileDiffHint")}</p>
              <UnifiedDiffView
                beforeText={diff.fullBeforeText}
                afterText={diff.fullAfterText}
                mode="changed"
              />
            </section>
          )}

          <Section
            icon={FilePlus2}
            title={t("ai.sectionNew")}
            count={sections.neu.length}
            accent="text-emerald-400"
            empty={t("ai.sectionNewEmpty")}
          >
            {sections.neu.map((entry) => (
              <ReviewCard
                key={entry.id}
                entry={entry}
                t={t}
                mode="new"
                accepted={!!entry.item.accepted}
                onToggle={(v) => {
                  if (entry.type === "stone") setStoneAccepted(entry.id, v);
                  else if (entry.type === "task")
                    setTaskAccepted(entry.stoneId, entry.id, v);
                }}
              />
            ))}
          </Section>

          <Section
            icon={PencilLine}
            title={t("ai.sectionChanged")}
            count={sections.changed.length}
            accent="text-amber-300"
            empty={t("ai.sectionChangedEmpty")}
          >
            {sections.changed.map((entry) => (
              <ReviewCard
                key={entry.id}
                entry={entry}
                t={t}
                mode="changed"
                accepted={!!entry.item.accepted}
                onToggle={(v) => {
                  if (entry.type === "project") setProjectAccepted(v);
                  else if (entry.type === "stone") setStoneAccepted(entry.id, v);
                  else if (entry.type === "task")
                    setTaskAccepted(entry.stoneId, entry.id, v);
                }}
              />
            ))}
          </Section>

          <Section
            icon={Trash2}
            title={t("ai.sectionRemoved")}
            count={sections.removed.length}
            accent="text-rose-400"
            empty={t("ai.sectionRemovedEmpty")}
          >
            {sections.removed.map((entry) => (
              <ReviewCard
                key={entry.id}
                entry={entry}
                t={t}
                mode="removed"
                accepted={!!entry.item.accepted}
                onToggle={(v) => {
                  if (entry.type === "stone") setStoneAccepted(entry.id, v);
                  else if (entry.type === "task")
                    setTaskAccepted(entry.stoneId, entry.id, v);
                }}
              />
            ))}
          </Section>
        </div>

        {/* Footer */}
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
