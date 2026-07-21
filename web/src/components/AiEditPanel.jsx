import {
  AtSign,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useI18n } from "../i18n";
import { applyBoardToDatabase } from "../lib/applyStonesBoard";
import { nimEditStones } from "../lib/nimClient";
import { DEFAULT_NIM_MODEL, NIM_MODELS } from "../lib/nimModels";
import {
  getNimSettings,
  hasNimApiKey,
  setNimSettings,
  subscribeNimSettings,
} from "../lib/nimSettings";
import {
  buildAcceptedBoard,
  diffStonesModels,
  serializeCanonical,
} from "../lib/stonesDiff";
import { parseStones } from "../lib/stonesFormat";
import { notify, notifyPromise } from "../lib/toast";
import AiDiffReviewModal from "./AiDiffReviewModal";

function buildMentionItems(stones) {
  const items = [];
  for (const s of stones || []) {
    const sn = s.number ?? 0;
    items.push({
      type: "stone",
      id: `stone-${s.id || sn}`,
      stone: s,
      task: null,
      insert: `@piedra${sn}`,
      label: `Piedra ${sn} · ${s.title}`,
      search: `piedra${sn} ${s.title} ${s.number}`.toLowerCase(),
    });
    for (const t of s.tasks || []) {
      const slug = String(t.title || "")
        .toLowerCase()
        .replace(/[^\wáéíóúñ]+/gi, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      items.push({
        type: "task",
        id: `task-${t.id || slug}`,
        stone: s,
        task: t,
        insert: `@piedra${sn}#${t.title}`,
        label: `P${sn} · ${t.title}`,
        search: `piedra${sn} ${s.title} ${t.title}`.toLowerCase(),
      });
    }
  }
  return items;
}

function resolveMentionsContext(prompt, stones) {
  const lines = [];
  const re = /@piedra(\d+)(?:#([^\s@]+(?:\s+[^\s@#]+)*))?/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(prompt))) {
    const num = parseInt(m[1], 10);
    const taskPart = (m[2] || "").trim();
    const stone = (stones || []).find((s) => s.number === num);
    if (!stone) continue;
    const key = `${num}:${taskPart}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!taskPart) {
      lines.push(
        `- Piedra ${num} "${stone.title}": ${stone.description || "(sin descripción)"} · ${stone.tasks?.length || 0} tareas`
      );
    } else {
      const task = (stone.tasks || []).find(
        (t) =>
          String(t.title).toLowerCase().includes(taskPart.toLowerCase()) ||
          taskPart.toLowerCase().includes(String(t.title).toLowerCase())
      );
      if (task) {
        lines.push(
          `- Piedra ${num}#tarea "${task.title}" (done=${!!task.done}, xp=${task.xp ?? 50}): ${task.notes || ""}`
        );
      } else {
        lines.push(`- Referencia @piedra${num}#${taskPart} (no resuelta con exactitud)`);
      }
    }
  }
  return lines.join("\n");
}

export default function AiEditPanel({ open, onClose }) {
  const { t, lang } = useI18n();
  const { model, project, projectId, members, reload } = useApp();
  const [settings, setSettings] = useState(getNimSettings);
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(
    () => getNimSettings().model || DEFAULT_NIM_MODEL
  );
  const [busy, setBusy] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [diff, setDiff] = useState(null);
  const [beforeSnapshot, setBeforeSnapshot] = useState(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIdx, setMentionIdx] = useState(0);
  const taRef = useRef(null);

  useEffect(() => subscribeNimSettings(setSettings), []);

  useEffect(() => {
    if (open) {
      setModelId(getNimSettings().model || DEFAULT_NIM_MODEL);
    }
  }, [open]);

  const mentionItems = useMemo(
    () => buildMentionItems(model?.stones),
    [model?.stones]
  );

  const filteredMentions = useMemo(() => {
    const q = mentionQuery.toLowerCase().trim();
    if (!q) return mentionItems.slice(0, 12);
    return mentionItems
      .filter((it) => it.search.includes(q) || it.insert.toLowerCase().includes(q))
      .slice(0, 12);
  }, [mentionItems, mentionQuery]);

  const keyReady = hasNimApiKey() || !!settings.apiKey;

  const insertMention = (item) => {
    const ta = taRef.current;
    const value = prompt;
    const caret = ta?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const at = before.lastIndexOf("@");
    const head = at >= 0 ? before.slice(0, at) : before;
    const next = `${head}${item.insert} ${after}`;
    setPrompt(next);
    setMentionOpen(false);
    setMentionQuery("");
    requestAnimationFrame(() => {
      if (!ta) return;
      const pos = (head + item.insert + " ").length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  };

  const onPromptChange = (e) => {
    const v = e.target.value;
    setPrompt(v);
    const caret = e.target.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([^\s@]*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQuery(m[1] || "");
      setMentionIdx(0);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  };

  const runAi = async () => {
    if (!model || !prompt.trim() || busy) return;
    if (!keyReady) {
      notify.error(t("ai.needKey"));
      return;
    }

    setBusy(true);
    try {
      const board = {
        title: model.title,
        subtitle: model.subtitle,
        meta: model.meta || {
          start: project?.start_date || "",
          end: project?.end_date || "",
        },
        stones: model.stones,
        team: (members || []).map((m) => ({
          id: m.id,
          username: m.username,
          name: m.display_name || m.username,
        })),
        project,
      };
      // Export limpio (sin assignees) para que el round-trip con la IA sea comparable
      const stonesText = serializeCanonical(board);
      const mentionsContext = resolveMentionsContext(prompt, model.stones);

      const result = await notifyPromise(
        nimEditStones({
          stonesText,
          userPrompt: prompt.trim(),
          mentionsContext,
          model: modelId,
          apiKey: settings.apiKey,
          lang,
        }),
        {
          loading: t("ai.generating"),
          success: t("ai.generated"),
          error: (err) => err.message || t("ai.generateFailed"),
        }
      );

      setNimSettings({ model: modelId });

      // After: parse de la respuesta IA
      const afterParsed = parseStones(result.stonesText);

      // Before: board real con ids DB (fuente de verdad para aplicar)
      const beforeModel = {
        title: board.title,
        subtitle: board.subtitle,
        meta: board.meta,
        stones: board.stones,
        team: board.team,
        project: board.project,
      };

      const afterModel = {
        title: afterParsed.title,
        subtitle: afterParsed.subtitle,
        meta: afterParsed.meta,
        stones: afterParsed.stones,
      };

      // Diff canónico + snippets .stones (export enviado vs respuesta IA)
      const d = diffStonesModels(beforeModel, afterModel, {
        beforeText: stonesText,
        afterText: result.stonesText,
      });
      const has =
        d.summary.stonesAdded +
          d.summary.stonesRemoved +
          d.summary.stonesModified +
          d.summary.tasksAdded +
          d.summary.tasksRemoved +
          d.summary.tasksModified +
          (d.summary.projectChanged ? 1 : 0) >
        0;

      if (!has) {
        notify.info(t("ai.noChangesDetected"));
        return;
      }

      setBeforeSnapshot(beforeModel);
      setDiff(d);
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const confirmApply = async () => {
    if (!diff || !beforeSnapshot || !projectId || applyBusy) return;
    setApplyBusy(true);
    try {
      const target = buildAcceptedBoard(beforeSnapshot, diff);
      await notifyPromise(
        applyBoardToDatabase(projectId, beforeSnapshot, target, {
          updateProject: !!(diff.project?.accepted),
        }),
        {
          loading: t("ai.applying"),
          success: t("ai.applied"),
          error: (err) => err.message || t("ai.applyFailed"),
        }
      );
      setDiff(null);
      setBeforeSnapshot(null);
      setPrompt("");
      onClose?.();
      reload();
    } catch {
      /* toast */
    } finally {
      setApplyBusy(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[95] border-t border-border bg-elev/98 p-3 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <Sparkles size={16} className="text-accent" />
              {t("ai.panelTitle")}
              <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] font-normal text-mute">
                NVIDIA NIM
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10"
              aria-label={t("common.close")}
            >
              <X size={16} />
            </button>
          </div>

          {!keyReady ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {t("ai.needKeyInline")}{" "}
              <Link to="/projects" className="font-semibold underline">
                {t("ai.openSettings")}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-mute sm:flex-none">
                  <span className="shrink-0">{t("ai.model")}</span>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    disabled={busy}
                    className="max-w-full rounded-lg border border-border bg-black/40 px-2 py-1.5 text-xs text-text outline-none focus:border-accent/50"
                  >
                    {NIM_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} · {m.blurb}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="hidden text-[10px] text-mute sm:inline">
                  <AtSign size={10} className="mr-0.5 inline" />
                  {t("ai.mentionHint")}
                </span>
              </div>

              <div className="relative">
                {mentionOpen && filteredMentions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 z-10 mb-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-[rgba(18,18,28,0.98)] py-1 shadow-xl">
                    {filteredMentions.map((it, i) => (
                      <button
                        key={it.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMention(it);
                        }}
                        className={[
                          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs",
                          i === mentionIdx
                            ? "bg-accent/15 text-text"
                            : "text-dim hover:bg-white/5",
                        ].join(" ")}
                      >
                        <span className="font-mono text-[10px] text-accent">
                          {it.type === "stone" ? "P" : "T"}
                        </span>
                        <span className="truncate">{it.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  ref={taRef}
                  value={prompt}
                  onChange={onPromptChange}
                  disabled={busy}
                  rows={3}
                  placeholder={t("ai.promptPlaceholder")}
                  onKeyDown={(e) => {
                    if (mentionOpen && filteredMentions.length) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setMentionIdx(
                          (i) => (i + 1) % filteredMentions.length
                        );
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setMentionIdx(
                          (i) =>
                            (i - 1 + filteredMentions.length) %
                            filteredMentions.length
                        );
                        return;
                      }
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        insertMention(filteredMentions[mentionIdx]);
                        return;
                      }
                      if (e.key === "Escape") {
                        setMentionOpen(false);
                        return;
                      }
                    }
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      runAi();
                    }
                  }}
                  className="w-full resize-y rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm text-text outline-none focus:border-accent/50 disabled:opacity-60"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-mute">{t("ai.safeNote")}</p>
                <button
                  type="button"
                  disabled={busy || !prompt.trim()}
                  onClick={runAi}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 text-sm font-semibold text-text disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t("ai.generating")}
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      {t("ai.send")}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {diff && (
        <AiDiffReviewModal
          diff={diff}
          onChangeDiff={setDiff}
          onConfirm={confirmApply}
          onCancel={() => {
            if (!applyBusy) {
              setDiff(null);
              setBeforeSnapshot(null);
            }
          }}
          busy={applyBusy}
        />
      )}
    </>
  );
}
