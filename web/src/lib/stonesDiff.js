/**
 * Diff estructural entre dos modelos parseados .stones (before/after).
 * Produce cambios granulares en piedras y tareas con ids estables de revisión.
 */

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stoneKey(s) {
  if (s?.id && String(s.id).length > 8) return `id:${s.id}`;
  if (s?.number != null) return `n:${s.number}`;
  return `t:${norm(s?.title)}`;
}

function taskKey(t) {
  return norm(t?.title);
}

function stoneFieldsEqual(a, b) {
  const keys = [
    "title",
    "description",
    "icon",
    "color",
    "time",
    "period",
    "dateStart",
    "dateEnd",
    "number",
  ];
  return keys.every((k) => String(a?.[k] ?? "") === String(b?.[k] ?? ""));
}

function taskFieldsEqual(a, b) {
  const keys = [
    "title",
    "notes",
    "xp",
    "done",
    "period",
    "dateStart",
    "dateEnd",
    "img",
  ];
  if (!keys.every((k) => String(a?.[k] ?? "") === String(b?.[k] ?? ""))) {
    return false;
  }
  const aa = (a?.assignees || []).map(String).sort().join(",");
  const bb = (b?.assignees || []).map(String).sort().join(",");
  return aa === bb;
}

function fieldChanges(before, after, keys) {
  const changes = [];
  for (const k of keys) {
    const bv = before?.[k] ?? "";
    const av = after?.[k] ?? "";
    if (String(bv) !== String(av)) {
      changes.push({ field: k, before: bv, after: av });
    }
  }
  return changes;
}

function matchPairs(beforeList, afterList, keyFn) {
  const afterUsed = new Set();
  const pairs = [];
  const beforeUnmatched = [];

  for (const b of beforeList) {
    const bk = keyFn(b);
    let idx = afterList.findIndex((a, i) => !afterUsed.has(i) && keyFn(a) === bk);
    if (idx < 0) {
      // fuzzy: same title if key was number-based
      idx = afterList.findIndex(
        (a, i) => !afterUsed.has(i) && norm(a.title) === norm(b.title)
      );
    }
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
    taskKey
  );
  const out = [];
  let n = 0;

  for (const b of beforeUnmatched) {
    out.push({
      id: `${stoneDiffId}-t-rm-${n++}`,
      kind: "removed",
      before: b,
      after: null,
      accepted: true,
      changes: [],
    });
  }
  for (const a of afterUnmatched) {
    out.push({
      id: `${stoneDiffId}-t-add-${n++}`,
      kind: "added",
      before: null,
      after: a,
      accepted: true,
      changes: [],
    });
  }
  for (const { before, after } of pairs) {
    const equal = taskFieldsEqual(before, after);
    out.push({
      id: `${stoneDiffId}-t-mod-${n++}`,
      kind: equal ? "unchanged" : "modified",
      before,
      after: { ...after, id: before.id },
      accepted: !equal,
      changes: equal
        ? []
        : fieldChanges(before, after, [
            "title",
            "notes",
            "xp",
            "done",
            "period",
            "dateStart",
            "dateEnd",
            "img",
          ]),
    });
  }
  return out;
}

/**
 * @returns {{ project, stones, summary }}
 */
export function diffStonesModels(beforeModel, afterModel) {
  const beforeStones = beforeModel?.stones || [];
  const afterStones = afterModel?.stones || [];

  const projectChanges = fieldChanges(
    {
      title: beforeModel?.title,
      subtitle: beforeModel?.subtitle,
      start: beforeModel?.meta?.start,
      end: beforeModel?.meta?.end,
    },
    {
      title: afterModel?.title,
      subtitle: afterModel?.subtitle,
      start: afterModel?.meta?.start,
      end: afterModel?.meta?.end,
    },
    ["title", "subtitle", "start", "end"]
  );

  const project = {
    id: "project-meta",
    kind: projectChanges.length ? "modified" : "unchanged",
    changes: projectChanges,
    accepted: projectChanges.length > 0,
    before: {
      title: beforeModel?.title,
      subtitle: beforeModel?.subtitle,
      meta: { ...(beforeModel?.meta || {}) },
    },
    after: {
      title: afterModel?.title,
      subtitle: afterModel?.subtitle,
      meta: { ...(afterModel?.meta || {}) },
    },
  };

  const { pairs, beforeUnmatched, afterUnmatched } = matchPairs(
    beforeStones,
    afterStones,
    stoneKey
  );

  const stones = [];
  let sn = 0;

  for (const b of beforeUnmatched) {
    const id = `stone-rm-${sn++}`;
    stones.push({
      id,
      kind: "removed",
      before: b,
      after: null,
      accepted: true,
      changes: [],
      taskDiffs: (b.tasks || []).map((t, i) => ({
        id: `${id}-t-${i}`,
        kind: "removed",
        before: t,
        after: null,
        accepted: true,
        changes: [],
      })),
    });
  }

  for (const a of afterUnmatched) {
    const id = `stone-add-${sn++}`;
    stones.push({
      id,
      kind: "added",
      before: null,
      after: a,
      accepted: true,
      changes: [],
      taskDiffs: (a.tasks || []).map((t, i) => ({
        id: `${id}-t-${i}`,
        kind: "added",
        before: null,
        after: t,
        accepted: true,
        changes: [],
      })),
    });
  }

  for (const { before, after } of pairs) {
    const id = `stone-mod-${sn++}`;
    const taskDiffs = diffTasks(before.tasks || [], after.tasks || [], id);
    const stoneEqual = stoneFieldsEqual(before, after);
    const tasksChanged = taskDiffs.some((t) => t.kind !== "unchanged");
    const kind = stoneEqual && !tasksChanged ? "unchanged" : "modified";
    stones.push({
      id,
      kind,
      before,
      after: { ...after, id: before.id },
      accepted: kind !== "unchanged",
      changes: stoneEqual
        ? []
        : fieldChanges(before, after, [
            "title",
            "description",
            "icon",
            "color",
            "time",
            "period",
            "dateStart",
            "dateEnd",
            "number",
          ]),
      taskDiffs,
    });
  }

  // Orden legible: removed, modified, added, unchanged last collapsed
  const order = { removed: 0, modified: 1, added: 2, unchanged: 3 };
  stones.sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9));

  const summary = {
    stonesAdded: stones.filter((s) => s.kind === "added").length,
    stonesRemoved: stones.filter((s) => s.kind === "removed").length,
    stonesModified: stones.filter((s) => s.kind === "modified").length,
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

  return { project, stones, summary };
}

export function countAcceptedChanges(diff) {
  if (!diff) return 0;
  let n = 0;
  if (diff.project?.kind === "modified" && diff.project.accepted) n += 1;
  for (const s of diff.stones || []) {
    if (s.kind !== "unchanged" && s.accepted) n += 1;
    for (const t of s.taskDiffs || []) {
      if (t.kind !== "unchanged" && t.accepted) n += 1;
    }
  }
  return n;
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
        stone.tasks = (s.taskDiffs || [])
          .filter((t) => t.kind === "added" && t.accepted)
          .map((t) => structuredClone(t.after));
        stonesOut.push(stone);
      }
      continue;
    }
    // modified
    const base = structuredClone(s.before);
    if (s.accepted && s.after) {
      Object.assign(base, {
        title: s.after.title,
        description: s.after.description,
        icon: s.after.icon,
        color: s.after.color,
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
          });
        } else {
          tasks.push(structuredClone(t.before));
        }
      }
    }
    base.tasks = tasks;
    stonesOut.push(base);
  }

  // Preserve relative order by number when possible
  stonesOut.sort(
    (a, b) => (a.number ?? 0) - (b.number ?? 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  let title = beforeModel.title;
  let subtitle = beforeModel.subtitle;
  let meta = { ...(beforeModel.meta || {}) };
  if (diff.project?.kind === "modified" && diff.project.accepted && diff.project.after) {
    title = diff.project.after.title ?? title;
    subtitle = diff.project.after.subtitle ?? subtitle;
    meta = { ...meta, ...(diff.project.after.meta || {}) };
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
