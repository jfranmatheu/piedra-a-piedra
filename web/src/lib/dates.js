export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return startOfDay(x);
}

export function toISODate(d) {
  if (!d) return "";
  const x = startOfDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return startOfDay(new Date(+m[1], +m[2] - 1, +m[3]));
}

export function parseProjectStart(meta = {}) {
  const raw = meta.start || meta.inicio || meta.fecha || "";
  if (!raw) return startOfDay(new Date());
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return startOfDay(new Date(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (m) return startOfDay(new Date(+m[3], +m[2] - 1, +m[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? startOfDay(new Date()) : startOfDay(d);
}

function normalizeDashes(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[−–—]/g, "-");
}

export function parseWeekRange(text) {
  const t = normalizeDashes(text);
  if (!t) return null;
  let m = t.match(/semanas?\s*[·:]?\s*(-?\d+)\s*(?:-|a|al|a\s+la)\s*(-?\d+)/i);
  if (m) {
    let a = +m[1];
    let b = +m[2];
    if (a > b) [a, b] = [b, a];
    return { startWeek: a, endWeek: b };
  }
  m = t.match(/semanas?\s+(-?\d+)\b/i);
  if (m) return { startWeek: +m[1], endWeek: +m[1] };
  return null;
}

export function parseDayRange(text) {
  const t = normalizeDashes(text);
  if (!t) return null;
  let m = t.match(/d[ií]as?\s*[·:]?\s*([+\-]?\d+)\s*(?:-|a|al)\s*([+\-]?\d+)/i);
  if (m) {
    let a = +m[1];
    let b = +m[2];
    if (a > b) [a, b] = [b, a];
    return { startDay: a, endDay: b };
  }
  m = t.match(/d[ií]a\s*\+?\s*(\d+)\b/i);
  if (m) return { startDay: +m[1], endDay: +m[1] };
  m = t.match(/d[ií]a\s+([+\-]?\d+)\b/i);
  if (m) return { startDay: +m[1], endDay: +m[1] };
  return null;
}

function dayNumberToOffset(n) {
  if (n > 0) return n - 1;
  return n;
}

export function stoneDateWindow(stone, meta) {
  if (stone.dateStart && stone.dateEnd) {
    const from = parseISODate(stone.dateStart);
    const to = parseISODate(stone.dateEnd);
    if (from && to) return { from, to };
  }
  const projectStart = parseProjectStart(meta);
  const wr =
    parseWeekRange(stone.period) ||
    parseWeekRange(stone.time) ||
    parseWeekRange(stone.description || "");
  if (!wr) return null;
  const from = addDays(projectStart, wr.startWeek * 7);
  const to = addDays(projectStart, (wr.endWeek + 1) * 7 - 1);
  return { from, to, projectStart };
}

export function taskDateWindow(stone, task, meta) {
  if (task.dateStart && task.dateEnd) {
    const from = parseISODate(task.dateStart);
    const to = parseISODate(task.dateEnd);
    if (from && to) return { from, to };
  }
  const stoneWin = stoneDateWindow(stone, meta);
  const base = stoneWin ? stoneWin.from : parseProjectStart(meta);
  const dr = parseDayRange(task.period);
  if (!dr) return stoneWin;
  const from = addDays(base, dayNumberToOffset(dr.startDay));
  const to = addDays(base, dayNumberToOffset(dr.endDay));
  return { from, to };
}

export function isTodayInRange(from, to, today = startOfDay(new Date())) {
  return today.getTime() >= from.getTime() && today.getTime() <= to.getTime();
}

export function isStoneActiveByDate(stone, meta, showAll) {
  if (showAll) return true;
  const win = stoneDateWindow(stone, meta);
  if (!win) return true;
  return isTodayInRange(win.from, win.to);
}

export function isTaskActiveByDate(stone, task, meta, showAll) {
  if (showAll) return true;
  if (!isStoneActiveByDate(stone, meta, showAll)) return false;
  const win = taskDateWindow(stone, task, meta);
  if (!win) return true;
  return isTodayInRange(win.from, win.to);
}

export function formatShortDate(d) {
  if (!d) return "";
  try {
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return toISODate(d);
  }
}

/** Build human period label from ISO dates */
export function periodLabelFromDates(startISO, endISO) {
  if (!startISO && !endISO) return "";
  const a = parseISODate(startISO);
  const b = parseISODate(endISO);
  if (a && b) return `${formatShortDate(a)} → ${formatShortDate(b)}`;
  if (a) return `desde ${formatShortDate(a)}`;
  if (b) return `hasta ${formatShortDate(b)}`;
  return "";
}

/** Resolve editable date range for UI from stone/task */
export function resolveEditableRange(entity, parentStone, meta) {
  if (entity.dateStart || entity.dateEnd) {
    return {
      start: entity.dateStart || "",
      end: entity.dateEnd || "",
    };
  }
  const win =
    parentStone != null
      ? taskDateWindow(parentStone, entity, meta)
      : stoneDateWindow(entity, meta);
  if (!win) return { start: "", end: "" };
  return { start: toISODate(win.from), end: toISODate(win.to) };
}
