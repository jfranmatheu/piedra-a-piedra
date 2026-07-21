/**
 * Normalización canónica de modelos .stones para comparar sin falsos positivos
 * (ids UUID, assignees, rutas de imagen, colores por defecto del parser, etc.).
 */
import { serializeStones } from "./stonesFormat";

export function basenameImg(v) {
  if (v == null || v === "") return "";
  return String(v).split(/[/\\]/).pop() || "";
}

export function normText(v) {
  return String(v ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normTitle(v) {
  return normText(v).replace(/\s+/g, " ");
}

/** Solo comparar color si ambos lados lo definen. */
export function colorsEqual(a, b) {
  const ca = String(a || "").trim().toLowerCase();
  const cb = String(b || "").trim().toLowerCase();
  if (!ca || !cb) return true;
  return ca === cb;
}

export function canonicalizeTask(t) {
  if (!t) return null;
  const xpRaw = t.xp;
  const xp =
    xpRaw == null || xpRaw === ""
      ? 50
      : Number.parseInt(String(xpRaw).replace(/[^\d-]/g, ""), 10) || 50;
  return {
    title: normTitle(t.title),
    notes: normText(t.notes),
    xp,
    done: !!t.done,
    period: normText(t.period),
    dateStart: normText(t.dateStart).slice(0, 10),
    dateEnd: normText(t.dateEnd).slice(0, 10),
    img: basenameImg(t.img || t.imagePath),
  };
}

export function canonicalizeStone(s) {
  if (!s) return null;
  return {
    number: Number(s.number) || 0,
    title: normTitle(s.title),
    description: normText(s.description),
    icon: normText(s.icon) || "🪨",
    color: String(s.color || "").trim().toLowerCase(),
    time: normText(s.time),
    period: normText(s.period),
    dateStart: normText(s.dateStart).slice(0, 10),
    dateEnd: normText(s.dateEnd).slice(0, 10),
    tasks: (s.tasks || []).map(canonicalizeTask),
  };
}

export function canonicalizeModel(model) {
  const meta = model?.meta || {};
  return {
    title: normTitle(model?.title),
    subtitle: normText(model?.subtitle),
    meta: {
      start: normText(meta.start || meta.inicio).slice(0, 10),
      end: normText(meta.end || meta.fin).slice(0, 10),
    },
    stones: (model?.stones || []).map(canonicalizeStone),
  };
}

/**
 * Serializa un modelo a .stones “limpio” (sin team/assignees) para diff visual.
 */
export function serializeCanonical(model) {
  const c = canonicalizeModel(model);
  return serializeStones({
    title: c.title || "Sin título",
    subtitle: c.subtitle,
    meta: {
      ...(c.meta.start ? { start: c.meta.start } : {}),
      ...(c.meta.end ? { end: c.meta.end } : {}),
    },
    stones: c.stones.map((s) => ({
      ...s,
      // serialize omite campos vacíos parcialmente; dejamos strings
      color: s.color || "",
      tasks: s.tasks.map((t) => ({ ...t, assignees: [] })),
    })),
  });
}

/** Fragmento .stones de una sola piedra (con sus tareas). */
export function serializeStoneSnippet(stone) {
  if (!stone) return "";
  const c = canonicalizeStone(stone);
  const text = serializeStones({
    title: "_",
    subtitle: "",
    meta: {},
    stones: [
      {
        ...c,
        color: c.color || "",
        tasks: c.tasks.map((t) => ({ ...t, assignees: [] })),
      },
    ],
  });
  // Quitar cabecera # Modelo: _
  return text
    .replace(/^#\s*Modelo\s*:\s*_\s*\n+/i, "")
    .replace(/^\n+/, "")
    .trim();
}

/** Fragmento de una tarea suelta. */
export function serializeTaskSnippet(task) {
  if (!task) return "";
  const t = canonicalizeTask(task);
  const lines = [`- [${t.done ? "x" : " "}] ${t.title || "Tarea"}`];
  if (t.period) lines.push(`  periodo: ${t.period}`);
  if (t.xp != null) lines.push(`  xp: ${t.xp}`);
  if (t.notes) lines.push(`  notas: ${t.notes.replace(/\n/g, " ")}`);
  if (t.dateStart) lines.push(`  date_start: ${t.dateStart}`);
  if (t.dateEnd) lines.push(`  date_end: ${t.dateEnd}`);
  if (t.img) lines.push(`  img: ${t.img}`);
  return lines.join("\n");
}

export function tasksEqual(a, b) {
  const ca = canonicalizeTask(a);
  const cb = canonicalizeTask(b);
  if (!ca || !cb) return ca === cb;
  return (
    ca.title === cb.title &&
    ca.notes === cb.notes &&
    ca.xp === cb.xp &&
    ca.done === cb.done &&
    ca.period === cb.period &&
    ca.dateStart === cb.dateStart &&
    ca.dateEnd === cb.dateEnd &&
    ca.img === cb.img
  );
}

export function stonesMetaEqual(a, b) {
  const ca = canonicalizeStone(a);
  const cb = canonicalizeStone(b);
  if (!ca || !cb) return ca === cb;
  // color se ignora: el parser rellena palette si la IA omite color → falsos positivos
  const iconA = ca.icon || "🪨";
  const iconB = cb.icon || "🪨";
  return (
    ca.number === cb.number &&
    ca.title === cb.title &&
    ca.description === cb.description &&
    iconA === iconB &&
    ca.time === cb.time &&
    ca.period === cb.period &&
    ca.dateStart === cb.dateStart &&
    ca.dateEnd === cb.dateEnd
  );
}

export function fieldChangesCanonical(before, after, keys, opts = {}) {
  const changes = [];
  for (const k of keys) {
    let bv = before?.[k] ?? "";
    let av = after?.[k] ?? "";
    if (k === "img" || k === "imagePath") {
      bv = basenameImg(bv);
      av = basenameImg(av);
    }
    if (k === "color") {
      if (colorsEqual(bv, av)) continue;
    }
    if (k === "xp") {
      const nb = Number(bv) || 50;
      const na = Number(av) || 50;
      if (nb === na) continue;
      changes.push({ field: k, before: nb, after: na });
      continue;
    }
    if (k === "done") {
      if (!!bv === !!av) continue;
      changes.push({ field: k, before: !!bv, after: !!av });
      continue;
    }
    if (k === "description" || k === "notes" || k === "title") {
      bv = k === "title" ? normTitle(bv) : normText(bv);
      av = k === "title" ? normTitle(av) : normText(av);
    } else {
      bv = normText(bv);
      av = normText(av);
    }
    if (bv !== av) {
      changes.push({
        field: k,
        before: bv,
        after: av,
        label: opts.labels?.[k] || k,
      });
    }
  }
  return changes;
}

/**
 * Copia ids de DB del board original al modelo parseado (match por número/título).
 */
export function attachDbIds(parsedModel, boardWithIds) {
  const stones = (parsedModel.stones || []).map((ps) => {
    const match =
      (boardWithIds.stones || []).find(
        (bs) =>
          bs.number != null &&
          ps.number != null &&
          Number(bs.number) === Number(ps.number)
      ) ||
      (boardWithIds.stones || []).find(
        (bs) => normTitle(bs.title) === normTitle(ps.title)
      );

    const tasks = (ps.tasks || []).map((pt) => {
      const bt = (match?.tasks || []).find(
        (x) => normTitle(x.title) === normTitle(pt.title)
      );
      return bt?.id ? { ...pt, id: bt.id, assignees: bt.assignees || [] } : { ...pt };
    });

    return match?.id
      ? { ...ps, id: match.id, tasks }
      : { ...ps, tasks };
  });

  return {
    ...parsedModel,
    stones,
    team: boardWithIds.team,
    project: boardWithIds.project,
  };
}
