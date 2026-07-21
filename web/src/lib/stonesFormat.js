/**
 * Formato .stones (texto natural) — export / import
 *
 * Compatible con el parser original (parser.py):
 *
 *   # Modelo: Título
 *   > subtítulo
 *
 *   @meta
 *   start: 2026-07-20
 *   end: 2026-12-31
 *
 *   ═══════════════════════════════════
 *   PIEDRA 1 · Título
 *   tiempo: 2–4 semanas
 *   periodo: semana 1–4
 *   icon: 🪨
 *   color: #f59e0b
 *   ═══════════════════════════════════
 *
 *   Descripción libre…
 *
 *   ### Tareas
 *   - [ ] Título
 *     periodo: días 1–3
 *     xp: 100
 *     notas: …
 *     img: archivo.png
 *     date_start: 2026-07-20
 *     date_end: 2026-07-25
 */

const RE_MODEL = /^#\s*Modelo\s*:\s*(.+)$/i;
const RE_SUBTITLE = /^>\s*(.+)$/;
const RE_META_START = /^@meta\s*$/i;
const RE_KV = /^([a-zA-ZáéíóúñÁÉÍÓÚÑ_][\wáéíóúñÁÉÍÓÚÑ_]*)\s*:\s*(.+)$/;
const RE_BANNER = /^[═\-=─━]{3,}\s*$/;
const RE_SEP = /^[─\-═━]{3,}\s*$/;
const RE_STONE_TITLE =
  /^(?:PIEDRA|Piedra|##\s*Piedra)\s*(\d+)\s*[·:\-–—]\s*(.+)$/i;
const RE_STONE_MD = /^##\s*(?:Piedra\s*)?(\d+)\s*[·:\-–—]\s*(.+)$/i;
const RE_TASKS_HEADER = /^###?\s*Tareas\s*$/i;
const RE_TASK = /^[-*]\s*\[([ xX])\]\s*(.+)$/;
const RE_SECTION = /^###?\s+(.+)$/;

const STONE_KV = new Set([
  "tiempo",
  "time",
  "periodo",
  "period",
  "icon",
  "icono",
  "color",
  "colour",
  "id",
  "date_start",
  "date_end",
  "datestart",
  "dateend",
]);

function slug(text) {
  const s = String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\-]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "item";
}

function parseKvBlock(lines, start) {
  const data = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    const m = RE_KV.exec(line.trim());
    if (!m) break;
    data[m[1].toLowerCase()] = m[2].trim();
    i += 1;
  }
  return [data, i];
}

function applyStoneKv(stone, kv) {
  if (!stone || !kv) return;
  for (const [k0, v] of Object.entries(kv)) {
    const k = k0.toLowerCase();
    if (k === "tiempo" || k === "time") stone.time = v;
    else if (k === "periodo" || k === "period") stone.period = v;
    else if (k === "icon" || k === "icono") stone.icon = v;
    else if (k === "color" || k === "colour") stone.color = v;
    else if (k === "id") stone.id = v;
    else if (k === "date_start" || k === "datestart") stone.dateStart = v;
    else if (k === "date_end" || k === "dateend") stone.dateEnd = v;
  }
}

function applyTaskKv(task, key, val) {
  const k = key.toLowerCase();
  if (["periodo", "period", "tiempo", "time"].includes(k)) task.period = val;
  else if (k === "xp") {
    const n = parseInt(String(val).replace(/[^\d]/g, "") || "50", 10);
    task.xp = Number.isFinite(n) ? n : 50;
  } else if (
    ["notas", "notes", "nota", "desc", "descripcion", "descripción"].includes(k)
  ) {
    task.notes = val;
  } else if (["img", "image", "imagen", "foto"].includes(k)) {
    task.img = val.split(/[/\\]/).pop() || val;
  } else if (["date_start", "datestart", "inicio"].includes(k)) {
    task.dateStart = val;
  } else if (["date_end", "dateend", "fin"].includes(k)) {
    task.dateEnd = val;
  } else if (["assignees", "asignados", "asignado"].includes(k)) {
    task.assignees = val
      .split(/[,;]/)
      .map((s) => s.trim().replace(/^@/, ""))
      .filter(Boolean);
  } else {
    task[k] = val;
  }
}

/**
 * Parse .stones text → { title, subtitle, meta, stones[] }
 */
export function parseStones(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const model = {
    title: "Sin título",
    subtitle: "",
    meta: {},
    stones: [],
  };

  let i = 0;
  let currentStone = null;
  let descBuf = [];
  let inTasks = false;
  let currentTask = null;

  const closeTask = () => {
    if (currentTask && currentStone) {
      currentStone.tasks.push(currentTask);
      currentTask = null;
    }
  };

  const closeStone = () => {
    closeTask();
    if (currentStone) {
      if (descBuf.length) {
        currentStone.description = descBuf.join("\n").trim();
        descBuf = [];
      }
      if (!currentStone.id) {
        currentStone.id = slug(
          `piedra-${currentStone.number || 0}-${currentStone.title || ""}`
        );
      }
      model.stones.push(currentStone);
      currentStone = null;
    }
    inTasks = false;
  };

  const startStone = (number, title) => {
    closeStone();
    currentStone = {
      number: parseInt(number, 10) || model.stones.length + 1,
      title: title.trim(),
      id: slug(`piedra-${number}-${title}`),
      time: "",
      period: "",
      icon: "🪨",
      color: "",
      description: "",
      dateStart: "",
      dateEnd: "",
      tasks: [],
    };
    descBuf = [];
    inTasks = false;
    currentTask = null;
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, "");
    const stripped = line.trim();

    if (!stripped) {
      if (!inTasks && currentStone && !currentTask) {
        if (descBuf.length && descBuf[descBuf.length - 1] !== "") descBuf.push("");
      }
      i += 1;
      continue;
    }

    let m = RE_MODEL.exec(stripped);
    if (m && !currentStone) {
      model.title = m[1].trim();
      i += 1;
      continue;
    }

    m = RE_SUBTITLE.exec(stripped);
    if (m && !currentStone) {
      model.subtitle = m[1].trim();
      i += 1;
      continue;
    }

    if (RE_META_START.test(stripped)) {
      i += 1;
      const [meta, next] = parseKvBlock(lines, i);
      Object.assign(model.meta, meta);
      i = next;
      continue;
    }

    if (RE_BANNER.test(stripped) || (RE_SEP.test(stripped) && stripped.length >= 10)) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j += 1;
      if (j < lines.length) {
        const sm =
          RE_STONE_TITLE.exec(lines[j].trim()) || RE_STONE_MD.exec(lines[j].trim());
        if (sm) {
          startStone(sm[1], sm[2]);
          i = j + 1;
          if (
            i < lines.length &&
            (RE_BANNER.test(lines[i].trim()) || RE_SEP.test(lines[i].trim()))
          ) {
            i += 1;
          }
          const [kv, next] = parseKvBlock(lines, i);
          applyStoneKv(currentStone, kv);
          i = next;
          continue;
        }
      }
      if (currentStone && stripped.length < 20) {
        closeTask();
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }

    m = RE_STONE_TITLE.exec(stripped) || RE_STONE_MD.exec(stripped);
    if (m) {
      startStone(m[1], m[2]);
      i += 1;
      const [kv, next] = parseKvBlock(lines, i);
      applyStoneKv(currentStone, kv);
      i = next;
      continue;
    }

    if (RE_TASKS_HEADER.test(stripped)) {
      if (currentStone && descBuf.length) {
        currentStone.description = descBuf.join("\n").trim();
        descBuf = [];
      }
      closeTask();
      inTasks = true;
      i += 1;
      continue;
    }

    m = RE_TASK.exec(stripped);
    if (m && currentStone) {
      closeTask();
      inTasks = true;
      currentTask = {
        title: m[2].trim(),
        done: m[1].toLowerCase() === "x",
        period: "",
        xp: 50,
        notes: "",
        img: "",
        dateStart: "",
        dateEnd: "",
        assignees: [],
      };
      i += 1;
      while (i < lines.length) {
        const tl = lines[i];
        if (!tl.trim()) break;
        if (tl.startsWith(" ") || tl.startsWith("\t") || RE_KV.test(tl.trim())) {
          const km = RE_KV.exec(tl.trim());
          if (km) applyTaskKv(currentTask, km[1], km[2].trim());
          else {
            currentTask.notes = [currentTask.notes, tl.trim()]
              .filter(Boolean)
              .join(" ");
          }
          i += 1;
        } else break;
      }
      continue;
    }

    if (currentStone && !inTasks && !currentTask) {
      const km = RE_KV.exec(stripped);
      if (km && STONE_KV.has(km[1].toLowerCase())) {
        applyStoneKv(currentStone, { [km[1].toLowerCase()]: km[2].trim() });
        i += 1;
        continue;
      }
      if (RE_SECTION.test(stripped) && !RE_TASKS_HEADER.test(stripped)) {
        i += 1;
        continue;
      }
      if (!RE_SEP.test(stripped)) descBuf.push(stripped);
      i += 1;
      continue;
    }

    i += 1;
  }

  closeStone();

  const palette = [
    "#f59e0b",
    "#06b6d4",
    "#8b5cf6",
    "#10b981",
    "#ef4444",
    "#ec4899",
    "#3b82f6",
  ];
  model.stones.forEach((s, idx) => {
    if (!s.color) s.color = palette[idx % palette.length];
  });

  return model;
}

function banner() {
  return "═══════════════════════════════════════════════════════════════";
}

/**
 * Board model (from loadProjectBoard / app model) → .stones text
 */
export function serializeStones(board) {
  const title = board.title || board.project?.name || "Proyecto";
  const subtitle = board.subtitle || board.project?.description || "";
  const meta = { ...(board.meta || {}) };
  if (board.project?.start_date && !meta.start) meta.start = board.project.start_date;
  if (board.project?.end_date && !meta.end) meta.end = board.project.end_date;
  if (board.meta?.start) meta.start = board.meta.start;
  if (board.meta?.end) meta.end = board.meta.end;

  const lines = [];
  lines.push(`# Modelo: ${title}`);
  if (subtitle) lines.push(`> ${subtitle}`);
  lines.push("");

  const metaKeys = Object.keys(meta).filter(
    (k) => meta[k] != null && String(meta[k]).trim() !== ""
  );
  if (metaKeys.length) {
    lines.push("@meta");
    for (const k of metaKeys) {
      lines.push(`${k}: ${meta[k]}`);
    }
    lines.push("");
  }

  const stones = board.stones || [];
  stones.forEach((s, idx) => {
    if (idx > 0) {
      lines.push("---");
      lines.push("");
    }
    lines.push(banner());
    lines.push(`PIEDRA ${s.number ?? idx + 1} · ${s.title || "Piedra"}`);
    if (s.time) lines.push(`tiempo: ${s.time}`);
    if (s.period) lines.push(`periodo: ${s.period}`);
    if (s.icon) lines.push(`icon: ${s.icon}`);
    if (s.color) lines.push(`color: ${s.color}`);
    if (s.dateStart) lines.push(`date_start: ${s.dateStart}`);
    if (s.dateEnd) lines.push(`date_end: ${s.dateEnd}`);
    lines.push(banner());
    lines.push("");
    if (s.description) {
      lines.push(s.description.trim());
      lines.push("");
    }
    lines.push("### Tareas");
    lines.push("");
    for (const t of s.tasks || []) {
      lines.push(`- [${t.done ? "x" : " "}] ${t.title || "Tarea"}`);
      if (t.period) lines.push(`  periodo: ${t.period}`);
      if (t.xp != null) lines.push(`  xp: ${t.xp}`);
      if (t.notes) lines.push(`  notas: ${String(t.notes).replace(/\n/g, " ")}`);
      if (t.dateStart) lines.push(`  date_start: ${t.dateStart}`);
      if (t.dateEnd) lines.push(`  date_end: ${t.dateEnd}`);
      const img = t.img || t.imagePath;
      if (img) {
        const name = String(img).split(/[/\\]/).pop();
        lines.push(`  img: ${name}`);
      }
      if (Array.isArray(t.assignees) && t.assignees.length && board.team) {
        const names = t.assignees
          .map((id) => {
            const m = board.team.find((x) => x.id === id);
            return m?.username ? `@${m.username}` : null;
          })
          .filter(Boolean);
        if (names.length) lines.push(`  assignees: ${names.join(", ")}`);
      }
      lines.push("");
    }
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

/** Download text as .stones file in the browser */
export function downloadStonesFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".stones") ? filename : `${filename}.stones`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function safeStonesFilename(name) {
  const base = String(name || "proyecto")
    .toLowerCase()
    .replace(/[^\w\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "proyecto"}.stones`;
}
