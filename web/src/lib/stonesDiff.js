/**
 * Diff estructural entre dos modelos .stones.
 * Comparación canónica (sin falsos positivos) + snippets de texto para la UI.
 */
import { hasLineChanges } from "./textDiff";
import {
  attachDbIds,
  canonicalizeModel,
  fieldChangesCanonical,
  serializeCanonical,
  serializeStoneSnippet,
  serializeTaskSnippet,
  stonesMetaEqual,
  tasksEqual,
  normTitle,
} from "./stonesCanonical";

function stoneMatchKey(s) {
  // Solo número o título — nunca id (UUID vs slug del parser)
  if (s?.number != null && Number(s.number) > 0) return `n:${Number(s.number)}`;
  return `t:${normTitle(s?.title)}`;
}

function taskMatchKey(t) {
  return `t:${normTitle(t?.title)}`;
}

function matchPairs(beforeList, afterList, keyFn) {
  const afterUsed = new Set();
  const pairs = [];
  const beforeUnmatched = [];

  for (const b of beforeList) {
    const bk = keyFn(b);
    const idx = afterList.findIndex(
      (a, i) => !afterUsed.has(i) && keyFn(a) === bk
    );
    if (idx >= 0) {
      afterUsed.add(idx);
      pairs.push({ before: b, after: afterList[idx] });
    } else {
      beforeUnmatched.push(b);
    }
  }

  const afterUnmatched = afterList.filter((_, i) => !afterUsed.has(i));
  return { pairs, beforeUnmatched, afterUnmatched };
}

function diffTasks(beforeTasks = [], afterTasks = [], stoneDiffId) {
  const { pairs, beforeUnmatched, afterUnmatched } = matchPairs(
    beforeTasks,
    afterTasks,
    taskMatchKey
  );
  const out = [];
  let n = 0;

  for (const b of beforeUnmatched) {
    const afterText = "";
    const beforeText = serializeTaskSnippet(b);
    out.push({
      id: `${stoneDiffId}-t-rm-${n++}`,
      kind: "removed",
      section: "removed",
      before: b,
      after: null,
      accepted: true,
      changes: [],
      beforeText,
      afterText,
    });
  }
  for (const a of afterUnmatched) {
    const beforeText = "";
    const afterText = serializeTaskSnippet(a);
    out.push({
      id: `${stoneDiffId}-t-add-${n++}`,
      kind: "added",
      section: "new",
      before: null,
      after: a,
      accepted: true,
      changes: [],
      beforeText,
      afterText,
    });
  }
  for (const { before, after } of pairs) {
    const equal = tasksEqual(before, after);
    const beforeText = serializeTaskSnippet(before);
    const afterText = serializeTaskSnippet(after);
    // Doble check: si el texto canónico es idéntico, no hay cambio
    const textChanged = !equal && hasLineChanges(beforeText, afterText);
    const reallyChanged = !equal && textChanged;
    out.push({
      id: `${stoneDiffId}-t-mod-${n++}`,
      kind: reallyChanged ? "modified" : "unchanged",
      section: reallyChanged ? "changed" : "same",
      before,
      after: { ...after, id: before.id },
      accepted: reallyChanged,
      changes: reallyChanged
        ? fieldChangesCanonical(before, after, [
            "title",
            "notes",
            "xp",
            "done",
            "period",
            "dateStart",
            "dateEnd",
            "img",
          ])
        : [],
      beforeText,
      afterText,
    });
  }
  return out;
}

/**
 * @param {object} beforeModel board con ids (DB)
 * @param {object} afterModel parseado de la IA
 * @param {{ beforeText?: string, afterText?: string }} opts
 */
export function diffStonesModels(beforeModel, afterModel, opts = {}) {
  const beforeStones = beforeModel?.stones || [];
  const afterStones = afterModel?.stones || [];

  // Project meta — canónico
  const bMeta = canonicalizeModel(beforeModel).meta;
  const aMeta = canonicalizeModel(afterModel).meta;
  const projectChanges = fieldChangesCanonical(
    {
      title: beforeModel?.title,
      subtitle: beforeModel?.subtitle,
      start: bMeta.start,
      end: bMeta.end,
    },
    {
      title: afterModel?.title,
      subtitle: afterModel?.subtitle,
      start: aMeta.start,
      end: aMeta.end,
    },
    ["title", "subtitle", "start", "end"]
  );

  const projectBeforeText = [
    `# Modelo: ${normTitle(beforeModel?.title) || "Sin título"}`,
    beforeModel?.subtitle ? `> ${normTitle(beforeModel.subtitle)}` : null,
    bMeta.start || bMeta.end ? "@meta" : null,
    bMeta.start ? `start: ${bMeta.start}` : null,
    bMeta.end ? `end: ${bMeta.end}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const projectAfterText = [
    `# Modelo: ${normTitle(afterModel?.title) || "Sin título"}`,
    afterModel?.subtitle ? `> ${normTitle(afterModel.subtitle)}` : null,
    aMeta.start || aMeta.end ? "@meta" : null,
    aMeta.start ? `start: ${aMeta.start}` : null,
    aMeta.end ? `end: ${aMeta.end}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const project = {
    id: "project-meta",
    kind: projectChanges.length ? "modified" : "unchanged",
    section: projectChanges.length ? "changed" : "same",
    changes: projectChanges,
    accepted: projectChanges.length > 0,
    before: {
      title: beforeModel?.title,
      subtitle: beforeModel?.subtitle,
      meta: { ...(beforeModel?.meta || {}) },
      start: bMeta.start,
      end: bMeta.end,
    },
    after: {
      title: afterModel?.title,
      subtitle: afterModel?.subtitle,
      meta: { ...(afterModel?.meta || {}) },
      start: aMeta.start,
      end: aMeta.end,
    },
    beforeText: projectBeforeText,
    afterText: projectAfterText,
  };

  const { pairs, beforeUnmatched, afterUnmatched } = matchPairs(
    beforeStones,
    afterStones,
    stoneMatchKey
  );

  const stones = [];
  let sn = 0;

  for (const b of beforeUnmatched) {
    const id = `stone-rm-${sn++}`;
    const beforeText = serializeStoneSnippet(b);
    stones.push({
      id,
      kind: "removed",
      section: "removed",
      before: b,
      after: null,
      accepted: true,
      changes: [],
      beforeText,
      afterText: "",
      taskDiffs: (b.tasks || []).map((t, i) => ({
        id: `${id}-t-${i}`,
        kind: "removed",
        section: "removed",
        before: t,
        after: null,
        accepted: true,
        changes: [],
        beforeText: serializeTaskSnippet(t),
        afterText: "",
      })),
    });
  }

  for (const a of afterUnmatched) {
    const id = `stone-add-${sn++}`;
    const afterText = serializeStoneSnippet(a);
    stones.push({
      id,
      kind: "added",
      section: "new",
      before: null,
      after: a,
      accepted: true,
      changes: [],
      beforeText: "",
      afterText,
      taskDiffs: (a.tasks || []).map((t, i) => ({
        id: `${id}-t-${i}`,
        kind: "added",
        section: "new",
        before: null,
        after: t,
        accepted: true,
        changes: [],
        beforeText: "",
        afterText: serializeTaskSnippet(t),
      })),
    });
  }

  for (const { before, after } of pairs) {
    const id = `stone-mod-${sn++}`;
    const taskDiffs = diffTasks(before.tasks || [], after.tasks || [], id);
    const metaEqual = stonesMetaEqual(before, after);
    const stoneChanges = metaEqual
      ? []
      : fieldChangesCanonical(before, after, [
          "title",
          "description",
          "icon",
          // color omitido a propósito (defaults del parser)
          "time",
          "period",
          "dateStart",
          "dateEnd",
          "number",
        ]);

    const beforeText = serializeStoneSnippet(before);
    const afterText = serializeStoneSnippet(after);
    const tasksChanged = taskDiffs.some((t) => t.kind !== "unchanged");
    // Piedra “modificada” solo si cambian campos de la piedra (no solo tareas hijas)
    const stoneFieldsChanged =
      stoneChanges.length > 0 && hasLineChanges(beforeText, afterText);

    // Si solo cambian tareas, la piedra queda "container" modified light
    let kind = "unchanged";
    let section = "same";
    if (stoneFieldsChanged && tasksChanged) {
      kind = "modified";
      section = "changed";
    } else if (stoneFieldsChanged) {
      kind = "modified";
      section = "changed";
    } else if (tasksChanged) {
      kind = "modified"; // contenedor con tareas tocadas
      section = "changed";
    }

    stones.push({
      id,
      kind,
      section,
      before,
      after: { ...after, id: before.id },
      // Aceptar piedra solo si cambian sus campos; las tareas tienen su propio toggle
      accepted: stoneFieldsChanged,
      stoneFieldsChanged,
      tasksChanged,
      changes: stoneFieldsChanged ? stoneChanges : [],
      beforeText,
      afterText,
      taskDiffs,
    });
  }

  const summary = {
    stonesAdded: stones.filter((s) => s.kind === "added").length,
    stonesRemoved: stones.filter((s) => s.kind === "removed").length,
    stonesModified: stones.filter(
      (s) => s.kind === "modified" && s.stoneFieldsChanged
    ).length,
    tasksAdded: stones.reduce(
      (n, s) => n + s.taskDiffs.filter((t) => t.kind === "added").length,
      0
    ),
    tasksRemoved: stones.reduce(
      (n, s) => n + s.taskDiffs.filter((t) => t.kind === "removed").length,
      0
    ),
    tasksModified: stones.reduce(
      (n, s) => n + s.taskDiffs.filter((t) => t.kind === "modified").length,
      0
    ),
    projectChanged: project.kind === "modified",
  };

  // Textos completos opcionales (para vista global)
  const fullBefore =
    opts.beforeText ||
    serializeCanonical(beforeModel);
  const fullAfter = opts.afterText || serializeCanonical(afterModel);

  return {
    project,
    stones,
    summary,
    fullBeforeText: fullBefore,
    fullAfterText: fullAfter,
  };
}

export function countAcceptedChanges(diff) {
  if (!diff) return 0;
  let n = 0;
  if (diff.project?.kind === "modified" && diff.project.accepted) n += 1;
  for (const s of diff.stones || []) {
    if (s.kind === "added" && s.accepted) n += 1;
    if (s.kind === "removed" && s.accepted) n += 1;
    if (s.kind === "modified" && s.stoneFieldsChanged && s.accepted) n += 1;
    for (const t of s.taskDiffs || []) {
      if (t.kind !== "unchanged" && t.accepted) n += 1;
    }
  }
  return n;
}

/**
 * Lista plana para la UI: new / changed / removed
 */
export function buildReviewSections(diff) {
  const neu = [];
  const changed = [];
  const removed = [];

  if (diff?.project?.kind === "modified") {
    changed.push({
      type: "project",
      id: diff.project.id,
      label: "Proyecto",
      item: diff.project,
    });
  }

  for (const s of diff?.stones || []) {
    const num = s.after?.number ?? s.before?.number;
    const title = s.after?.title || s.before?.title || "Piedra";
    const stoneLabel = num != null ? `Piedra ${num} · ${title}` : title;

    if (s.kind === "added") {
      neu.push({
        type: "stone",
        id: s.id,
        label: stoneLabel,
        item: s,
      });
      continue;
    }
    if (s.kind === "removed") {
      removed.push({
        type: "stone",
        id: s.id,
        label: stoneLabel,
        item: s,
      });
      continue;
    }

    if (s.stoneFieldsChanged) {
      changed.push({
        type: "stone",
        id: s.id,
        label: stoneLabel,
        item: s,
      });
    }

    for (const td of s.taskDiffs || []) {
      if (td.kind === "unchanged") continue;
      const tt = td.after?.title || td.before?.title || "Tarea";
      const taskLabel = `${stoneLabel} → ${tt}`;
      if (td.kind === "added") {
        neu.push({
          type: "task",
          id: td.id,
          label: taskLabel,
          stoneId: s.id,
          item: td,
          stone: s,
        });
      } else if (td.kind === "removed") {
        removed.push({
          type: "task",
          id: td.id,
          label: taskLabel,
          stoneId: s.id,
          item: td,
          stone: s,
        });
      } else if (td.kind === "modified") {
        changed.push({
          type: "task",
          id: td.id,
          label: taskLabel,
          stoneId: s.id,
          item: td,
          stone: s,
        });
      }
    }
  }

  return { neu, changed, removed };
}

/**
 * Construye el board final aplicando solo cambios accepted sobre before.
 */
export function buildAcceptedBoard(beforeModel, diff) {
  const stonesOut = [];

  for (const s of diff.stones || []) {
    if (s.kind === "unchanged") {
      stonesOut.push(structuredClone(s.before));
      continue;
    }
    if (s.kind === "removed") {
      if (!s.accepted) stonesOut.push(structuredClone(s.before));
      continue;
    }
    if (s.kind === "added") {
      if (s.accepted) {
        const stone = structuredClone(s.after);
        // Si la piedra se acepta, incluir tareas accepted (o todas added accepted)
        stone.tasks = (s.taskDiffs || [])
          .filter((t) => t.kind === "added" && t.accepted)
          .map((t) => structuredClone(t.after));
        // Si no hay taskDiffs detallados, usar after.tasks
        if (!s.taskDiffs?.length && s.after?.tasks) {
          stone.tasks = structuredClone(s.after.tasks);
        }
        stonesOut.push(stone);
      }
      continue;
    }
    // modified container
    const base = structuredClone(s.before);
    if (s.stoneFieldsChanged && s.accepted && s.after) {
      Object.assign(base, {
        title: s.after.title,
        description: s.after.description,
        icon: s.after.icon,
        color: s.after.color || base.color,
        time: s.after.time,
        period: s.after.period,
        dateStart: s.after.dateStart,
        dateEnd: s.after.dateEnd,
        number: s.after.number ?? base.number,
      });
    }

    const tasks = [];
    for (const t of s.taskDiffs || []) {
      if (t.kind === "unchanged") {
        tasks.push(structuredClone(t.before));
      } else if (t.kind === "removed") {
        if (!t.accepted) tasks.push(structuredClone(t.before));
      } else if (t.kind === "added") {
        if (t.accepted) tasks.push(structuredClone(t.after));
      } else if (t.kind === "modified") {
        if (t.accepted) {
          tasks.push({
            ...structuredClone(t.before),
            ...structuredClone(t.after),
            id: t.before.id,
            // no pisar assignees del before si after no trae
            assignees: t.before.assignees || [],
          });
        } else {
          tasks.push(structuredClone(t.before));
        }
      }
    }
    base.tasks = tasks;
    stonesOut.push(base);
  }

  stonesOut.sort(
    (a, b) =>
      (a.number ?? 0) - (b.number ?? 0) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  let title = beforeModel.title;
  let subtitle = beforeModel.subtitle;
  let meta = { ...(beforeModel.meta || {}) };
  if (
    diff.project?.kind === "modified" &&
    diff.project.accepted &&
    diff.project.after
  ) {
    title = diff.project.after.title ?? title;
    subtitle = diff.project.after.subtitle ?? subtitle;
    meta = { ...meta, ...(diff.project.after.meta || {}) };
    if (diff.project.after.start != null) meta.start = diff.project.after.start;
    if (diff.project.after.end != null) meta.end = diff.project.after.end;
  }

  return {
    title,
    subtitle,
    meta,
    stones: stonesOut,
    team: beforeModel.team,
    project: beforeModel.project,
  };
}

export { attachDbIds, serializeCanonical };
