/**
 * Piedra a Piedra — client app
 * Vistas: timeline | sidebar | kanban
 */

const STORAGE_KEY = "piedra-progress-v1";
const VIEW_KEY = "piedra-view-v1";
const ACTIVE_KEY = "piedra-active-stone-v1";
const FILTER_KEY = "piedra-filters-v2";
const BOARD_KEY = "piedra-board-v1";
const UNASSIGNED = "__none__";
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 7000];

const VIEWS = new Set(["timeline", "sidebar", "kanban"]);

// ── state ───────────────────────────────────────────────────────────────────
let model = null;
/** @type {Record<string, boolean>} */
let progress = {};
/** @type {"timeline" | "sidebar" | "kanban"} */
let viewMode = (() => {
  let v = localStorage.getItem(VIEW_KEY) || "timeline";
  if (v === "flow") v = "kanban";
  return VIEWS.has(v) ? v : "timeline";
})();
/** @type {string | null} */
let activeStoneId = localStorage.getItem(ACTIVE_KEY) || null;
/** @type {string | null} */
let selectedTaskKey = null;
/** stone id to keep open after timeline re-render */
let keepOpenId = null;

/** @type {{ members: string[], incompleteOnly: boolean, showAll: boolean }} */
let filters = loadFilters();
/** @type {string | null} */
let dragKey = null;

// ── utils ───────────────────────────────────────────────────────────────────
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function toast(msg, kind = "xp") {
  const host = $("#toasts");
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.innerHTML = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "0.3s";
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

function levelFromXp(xp) {
  let lvl = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
  }
  const cur = LEVEL_THRESHOLDS[lvl - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[lvl] ?? cur + 1000;
  const pct = Math.min(100, ((xp - cur) / Math.max(1, next - cur)) * 100);
  return { level: lvl, cur, next, pct, xp };
}

function taskKey(stoneId, taskId) {
  return `${stoneId}::${taskId}`;
}

function isDone(stone, task) {
  const k = taskKey(stone.id, task.id);
  if (k in progress) return !!progress[k];
  return !!task.done;
}

function loadLocalProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function loadFilters() {
  try {
    const raw = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
    // incompletas ON por defecto (solo columna TODO en kanban)
    const incompleteOnly = Object.prototype.hasOwnProperty.call(raw, "incompleteOnly")
      ? !!raw.incompleteOnly
      : true;
    return {
      members: Array.isArray(raw.members) ? raw.members.map(String) : [],
      incompleteOnly,
      showAll: !!raw.showAll, // OFF por defecto: filtrar por fecha activa
    };
  } catch {
    return { members: [], incompleteOnly: true, showAll: false };
  }
}

function saveFilters() {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
}

function teamMap() {
  /** @type {Record<string, any>} */
  const map = {};
  for (const m of model?.team || []) map[m.id] = m;
  return map;
}

// ── fechas del plan (start + semanas / días) ─────────────────────────────────
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return startOfDay(x);
}

function parseProjectStart() {
  const raw = model?.meta?.start || model?.meta?.inicio || model?.meta?.fecha || "";
  if (!raw) return startOfDay(new Date());
  // YYYY-MM-DD or DD/MM/YYYY
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return startOfDay(new Date(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
  if (m) return startOfDay(new Date(+m[3], +m[2] - 1, +m[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? startOfDay(new Date()) : startOfDay(d);
}

function normalizeDashes(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[−–—]/g, "-");
}

/** @returns {{ startWeek: number, endWeek: number } | null} */
function parseWeekRange(text) {
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

/** @returns {{ startDay: number, endDay: number } | null} */
function parseDayRange(text) {
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

/** día 1 del periodo = offset 0; negativos/0 se usan como offset directo */
function dayNumberToOffset(n) {
  if (n > 0) return n - 1;
  return n;
}

/**
 * Ventana de la piedra a partir de `periodo` (semanas desde start del proyecto).
 * semana 0–6 → [start + 0w, start + fin de semana 6]
 */
function stoneDateWindow(stone) {
  const projectStart = parseProjectStart();
  const wr =
    parseWeekRange(stone.period) ||
    parseWeekRange(stone.time) ||
    parseWeekRange(stone.description || "");
  if (!wr) return null;
  const from = addDays(projectStart, wr.startWeek * 7);
  const to = addDays(projectStart, (wr.endWeek + 1) * 7 - 1);
  return { from, to, projectStart };
}

/**
 * Ventana de la tarea: `días N–M` relativos al inicio de la piedra.
 * Si no hay días, hereda la ventana de la piedra.
 */
function taskDateWindow(stone, task) {
  const stoneWin = stoneDateWindow(stone);
  const base = stoneWin ? stoneWin.from : parseProjectStart();
  const dr = parseDayRange(task.period);
  if (!dr) return stoneWin;
  const from = addDays(base, dayNumberToOffset(dr.startDay));
  const to = addDays(base, dayNumberToOffset(dr.endDay));
  return { from, to, projectStart: stoneWin?.projectStart || parseProjectStart() };
}

function isTodayInRange(from, to, today = startOfDay(new Date())) {
  return today.getTime() >= from.getTime() && today.getTime() <= to.getTime();
}

function isStoneActiveByDate(stone) {
  if (filters.showAll) return true;
  const win = stoneDateWindow(stone);
  if (!win) return true; // sin periodo parseable → no ocultar
  return isTodayInRange(win.from, win.to);
}

function isTaskActiveByDate(stone, task) {
  if (filters.showAll) return true;
  if (!isStoneActiveByDate(stone)) return false;
  const win = taskDateWindow(stone, task);
  if (!win) return true;
  return isTodayInRange(win.from, win.to);
}

function filtersActive() {
  return (
    filters.members.length > 0 ||
    !filters.showAll ||
    (viewMode !== "kanban" && filters.incompleteOnly)
  );
}

/** En kanban: incompleteOnly solo controla columnas TODO/DONE, no oculta tarjetas DONE del modelo. */
function taskMatchesFilters(stone, task) {
  if (!isTaskActiveByDate(stone, task)) return false;
  const done = isDone(stone, task);
  if (viewMode !== "kanban" && filters.incompleteOnly && done) return false;
  if (filters.members.length) {
    const asg = task.assignees || [];
    const wantsNone = filters.members.includes(UNASSIGNED);
    const hitMember = asg.some((id) => filters.members.includes(id));
    const hitNone = wantsNone && asg.length === 0;
    if (!hitMember && !hitNone) return false;
  }
  return true;
}

function filteredTasks(stone) {
  return (stone.tasks || []).filter((t) => taskMatchesFilters(stone, t));
}

function filteredStones() {
  return model.stones.filter((s) => {
    if (!isStoneActiveByDate(s)) return false;
    // con filtros de miembro / incompletas: solo piedras con al menos una tarea visible
    if (filters.members.length || (viewMode !== "kanban" && filters.incompleteOnly)) {
      return filteredTasks(s).length > 0;
    }
    // filtro solo por fecha: mostrar piedra aunque hoy no haya subtareas en rango
    // (si showAll false y stone active, show column; tasks inside still date-filtered)
    return true;
  });
}

function filterCounts() {
  let total = 0;
  let shown = 0;
  for (const s of model.stones) {
    for (const t of s.tasks) {
      total += 1;
      if (taskMatchesFilters(s, t)) shown += 1;
    }
  }
  return { total, shown };
}

function formatShortDate(d) {
  try {
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderAssigneeChips(assigneeIds, { compact = false } = {}) {
  const map = teamMap();
  const ids = assigneeIds || [];
  if (!ids.length) {
    return compact
      ? `<span class="assignee-chip none" title="Sin asignar">—</span>`
      : `<span class="assignee-chip none">Sin asignar</span>`;
  }
  return ids
    .map((id) => {
      const m = map[id] || { id, name: id, color: "#666" };
      const tip = m.role ? `${m.name} · ${m.role}` : m.name;
      if (compact) {
        return `<span class="assignee-avatar" style="--m-color:${esc(m.color)}" title="${esc(tip)}">${esc(initials(m.name))}</span>`;
      }
      return `<span class="assignee-chip" style="--m-color:${esc(m.color)}" title="${esc(tip)}">
        <span class="assignee-avatar sm">${esc(initials(m.name))}</span>
        <span class="assignee-name">${esc(m.name)}</span>
      </span>`;
    })
    .join("");
}

function renderFilterBar() {
  const team = model.team || [];
  const { total, shown } = filterCounts();
  const allActive = filters.members.length === 0;
  const start = parseProjectStart();
  const today = startOfDay(new Date());

  const memberChips = team
    .map((m) => {
      const on = filters.members.includes(m.id);
      return `<button type="button" class="filter-chip member ${on ? "active" : ""}"
        data-filter-member="${esc(m.id)}" style="--m-color:${esc(m.color)}"
        title="${esc(m.role || m.name)}">
        <span class="assignee-avatar sm">${esc(initials(m.name))}</span>
        ${esc(m.name)}
      </button>`;
    })
    .join("");

  const noneOn = filters.members.includes(UNASSIGNED);
  const incompleteHint =
    viewMode === "kanban"
      ? filters.incompleteOnly
        ? "Solo columna TODO"
        : "Columnas TODO + DONE"
      : "Ocultar hechas";

  return `
    <div class="filter-bar" role="search" aria-label="Filtros">
      <div class="filter-row">
        <span class="filter-label">Equipo</span>
        <div class="filter-chips">
          <button type="button" class="filter-chip ${allActive ? "active" : ""}" data-filter-member="*">Todos</button>
          ${memberChips}
          <button type="button" class="filter-chip ${noneOn ? "active" : ""}" data-filter-member="${UNASSIGNED}">Sin asignar</button>
        </div>
      </div>
      <div class="filter-row filter-row-end">
        <label class="filter-toggle" title="Desactivado: solo piedras/tareas en su ventana de fechas (desde start del proyecto)">
          <input type="checkbox" id="filter-show-all" ${filters.showAll ? "checked" : ""} />
          <span class="filter-toggle-ui"></span>
          <span>Mostrar todo</span>
        </label>
        <label class="filter-toggle" title="${esc(incompleteHint)}">
          <input type="checkbox" id="filter-incomplete" ${filters.incompleteOnly ? "checked" : ""} />
          <span class="filter-toggle-ui"></span>
          <span>Solo incompletas</span>
        </label>
        <span class="filter-count ${shown !== total || !filters.showAll ? "active" : ""}">
          <strong>${shown}</strong> / ${total}
          ${!filters.showAll ? ` · activo ${formatShortDate(today)}` : ""}
          <span class="filter-start" title="Inicio del proyecto"> · start ${formatShortDate(start)}</span>
        </span>
        ${
          filters.members.length || filters.showAll || !filters.incompleteOnly
            ? `<button type="button" class="filter-clear" data-filter-clear title="Restablecer filtros">Reset</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function bindFilterEvents() {
  $$("[data-filter-member]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.filterMember;
      if (id === "*") {
        filters.members = [];
      } else if (filters.members.includes(id)) {
        filters.members = filters.members.filter((x) => x !== id);
      } else {
        filters.members = [...filters.members, id];
      }
      saveFilters();
      render();
    });
  });

  const showAll = $("#filter-show-all");
  if (showAll) {
    showAll.addEventListener("change", () => {
      filters.showAll = !!showAll.checked;
      saveFilters();
      render();
    });
  }

  const inc = $("#filter-incomplete");
  if (inc) {
    inc.addEventListener("change", () => {
      filters.incompleteOnly = !!inc.checked;
      saveFilters();
      render();
    });
  }

  $$("[data-filter-clear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      filters = { members: [], incompleteOnly: true, showAll: false };
      saveFilters();
      render();
    });
  });
}

async function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  try {
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(progress),
    });
  } catch {
    /* offline ok */
  }
}

function setViewMode(mode) {
  if (mode === "flow") mode = "kanban";
  if (!VIEWS.has(mode)) return;
  viewMode = mode;
  localStorage.setItem(VIEW_KEY, viewMode);
  document.body.dataset.view = viewMode;
  render();
}

function setActiveStone(id) {
  activeStoneId = id;
  localStorage.setItem(ACTIVE_KEY, id || "");
}

function resolveActiveStone(stats) {
  const candidates = model.stones.filter(
    (s) => isStoneActiveByDate(s) && (filteredTasks(s).length > 0 || filters.showAll)
  );
  if (activeStoneId && candidates.some((s) => s.id === activeStoneId)) {
    return activeStoneId;
  }
  const firstOpen = candidates.find((s) => {
    const i = model.stones.indexOf(s);
    return !stats.perStone[i]?.complete;
  });
  const id = firstOpen?.id || candidates[0]?.id || model.stones[0]?.id || null;
  if (id) setActiveStone(id);
  return id;
}

// ── confetti ────────────────────────────────────────────────────────────────
function burstConfetti(colors = ["#f59e0b", "#8b5cf6", "#10b981", "#06b6d4", "#fbbf24"]) {
  const canvas = $("#confetti");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  ctx.scale(dpr, dpr);

  const W = window.innerWidth;
  const H = window.innerHeight;
  const parts = Array.from({ length: 80 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 120,
    y: H / 2 + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 12 - 4,
    g: 0.22 + Math.random() * 0.1,
    size: 4 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1,
  }));

  let frame;
  const tick = () => {
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.012;
      if (p.life <= 0) continue;
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (alive) frame = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, W, H);
  };
  cancelAnimationFrame(frame);
  tick();
}

// ── stats ───────────────────────────────────────────────────────────────────
function computeStats() {
  let total = 0;
  let done = 0;
  let totalXp = 0;
  let earnedXp = 0;
  const perStone = model.stones.map((s) => {
    const t = s.tasks.length;
    const d = s.tasks.filter((task) => isDone(s, task)).length;
    const tx = s.tasks.reduce((a, task) => a + (task.xp || 0), 0);
    const ex = s.tasks
      .filter((task) => isDone(s, task))
      .reduce((a, task) => a + (task.xp || 0), 0);
    total += t;
    done += d;
    totalXp += tx;
    earnedXp += ex;
    return { id: s.id, total: t, done: d, pct: t ? (d / t) * 100 : 0, complete: t > 0 && d === t };
  });
  return {
    total,
    done,
    totalXp,
    earnedXp,
    pct: total ? (done / total) * 100 : 0,
    perStone,
    level: levelFromXp(earnedXp),
  };
}

// ── render shells ───────────────────────────────────────────────────────────
function renderViewToggle() {
  return `
    <div class="view-toggle" role="group" aria-label="Vista">
      <button type="button" class="view-btn ${viewMode === "timeline" ? "active" : ""}" data-view="timeline" title="Vista timeline">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
        Timeline
      </button>
      <button type="button" class="view-btn ${viewMode === "sidebar" ? "active" : ""}" data-view="sidebar" title="Vista panel">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="7" height="16" rx="1.5"/><path d="M13 7h8M13 12h8M13 17h5"/></svg>
        Panel
      </button>
      <button type="button" class="view-btn ${viewMode === "kanban" ? "active" : ""}" data-view="kanban" title="Vista kanban">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>
        Kanban
      </button>
    </div>
  `;
}

function renderHero(stats, compact = false) {
  const lvl = stats.level;
  return `
    <header class="hero ${compact ? "hero-compact" : ""}">
      <div class="hero-top">
        <div>
          <div class="hero-badge-row">
            <div class="badge">🪨 Piedra a Piedra</div>
            ${renderViewToggle()}
          </div>
          <h1>${esc(model.title)}</h1>
          ${!compact && model.subtitle ? `<p class="hero-sub">${esc(model.subtitle)}</p>` : ""}
        </div>
        <div class="xp-panel">
          <div class="xp-row">
            <span class="level-tag">LVL ${lvl.level}</span>
            <span class="xp-nums">${stats.earnedXp} / ${stats.totalXp} XP</span>
          </div>
          <div class="xp-bar"><div class="xp-fill" style="width:${lvl.pct}%"></div></div>
          <div class="xp-meta">
            <span><strong>${stats.done}</strong> / ${stats.total} tareas</span>
            <span><strong>${stats.perStone.filter((s) => s.complete).length}</strong> piedras</span>
          </div>
        </div>
      </div>
      <div class="progress-strip">
        <div class="overall-bar"><div class="overall-fill" id="overall-fill" style="width:${stats.pct}%"></div></div>
        <div class="overall-label">${stats.pct.toFixed(0)}%</div>
      </div>
      ${renderFilterBar()}
    </header>
  `;
}

function renderFooter() {
  return `
    <p class="footer-note">
      Edita <code>${esc(model.source || "modelo.stones")}</code> y recarga ·
      Imágenes en <code>images/</code> ·
      Progreso guardado en este navegador
    </p>
  `;
}

function render() {
  const app = $("#app");
  const stats = computeStats();
  document.body.dataset.view = viewMode;

  if (viewMode === "sidebar") {
    renderSidebarView(app, stats);
  } else if (viewMode === "kanban") {
    renderKanbanView(app, stats);
  } else {
    renderTimelineView(app, stats);
  }

  bindEvents();
  animateBars(stats);
}

function animateBars(stats) {
  requestAnimationFrame(() => {
    $$(".stone-bar-fill, .nav-bar-fill, .kanban-col-bar-fill").forEach((el) => {
      el.style.width = (el.dataset.pct || "0") + "%";
    });
    const of = $("#overall-fill");
    if (of) of.style.width = stats.pct + "%";
    const xf = $(".xp-fill");
    if (xf) xf.style.width = stats.level.pct + "%";
  });
}

// ── timeline view ───────────────────────────────────────────────────────────
function renderTimelineView(app, stats) {
  app.className = "";
  const visibleStones = model.stones
    .map((s, i) => ({ s, st: stats.perStone[i], i, tasks: filteredTasks(s) }))
    .filter((x) => isStoneActiveByDate(x.s) && (x.tasks.length > 0 || (filters.showAll && !filters.members.length && !filters.incompleteOnly)));

  app.innerHTML = `
    ${renderHero(stats)}
    <main class="path" id="path">
      ${
        visibleStones.length
          ? visibleStones.map(({ s, st, i, tasks }) => renderStoneTimeline(s, st, i, tasks)).join("")
          : `<div class="empty-filter"><p>Ninguna tarea coincide con los filtros.</p></div>`
      }
    </main>
    ${renderFooter()}
  `;

  const openId =
    keepOpenId ||
    visibleStones.find((x) => !x.st.complete)?.s.id ||
    visibleStones[0]?.s.id ||
    model.stones[0]?.id;
  keepOpenId = null;
  if (openId) {
    const el = app.querySelector(`.stone[data-id="${openId.replace(/"/g, '\\"')}"]`);
    if (el) {
      el.classList.add("open");
      const head = el.querySelector(".stone-head");
      if (head) head.setAttribute("aria-expanded", "true");
    }
  }
}

function renderStoneTimeline(stone, st, index, tasksOverride) {
  const color = stone.color || "#f59e0b";
  const delay = Math.min(index * 0.06, 0.4);
  const tasks = tasksOverride || filteredTasks(stone);
  const visDone = tasks.filter((t) => isDone(stone, t)).length;
  return `
    <article class="stone ${st.complete ? "complete" : ""}" data-id="${esc(stone.id)}"
      style="--stone-color:${color}; animation-delay:${delay}s">
      <div class="stone-marker">
        <div class="stone-orb" title="Piedra ${stone.number}">${stone.icon || "🪨"}</div>
      </div>
      <div class="stone-body">
        <div class="stone-head" role="button" tabindex="0" aria-expanded="false">
          <div>
            <div class="stone-num">Piedra ${stone.number}</div>
            <h2 class="stone-title">${esc(stone.title)}</h2>
            ${stone.description ? `<p class="stone-desc">${esc(stone.description)}</p>` : ""}
          </div>
          <div class="stone-chips">
            ${stone.time ? `<span class="chip time">⏱ ${esc(stone.time)}</span>` : ""}
            ${stone.period ? `<span class="chip">📅 ${esc(stone.period)}</span>` : ""}
            <span class="chip"><strong>${filtersActive() ? `${visDone}/${tasks.length}` : `${st.done}/${st.total}`}</strong>${filtersActive() ? " filtradas" : ""}</span>
            <span class="chevron" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </span>
          </div>
        </div>
        <div class="stone-progress">
          <div class="stone-bar"><div class="stone-bar-fill" data-pct="${st.pct}"></div></div>
          <div class="stone-progress-label">
            <span>${st.complete ? "✓ Completada" : "En progreso"}</span>
            <span>${st.pct.toFixed(0)}%</span>
          </div>
        </div>
        <div class="tasks">
          ${renderTasksList(stone, tasks)}
        </div>
      </div>
    </article>
  `;
}

// ── sidebar view ────────────────────────────────────────────────────────────
function renderSidebarView(app, stats) {
  const activeId = resolveActiveStone(stats);
  const idx = model.stones.findIndex((s) => s.id === activeId);
  const stone = model.stones[idx] || model.stones[0];
  const st = stats.perStone[idx] || stats.perStone[0];
  const color = stone?.color || "#f59e0b";
  const prev = idx > 0 ? model.stones[idx - 1] : null;
  const next = idx < model.stones.length - 1 ? model.stones[idx + 1] : null;

  app.className = "app-sidebar";
  app.innerHTML = `
    <aside class="side-nav" aria-label="Piedras del plan">
      <div class="side-nav-head">
        <div class="badge">🪨 Piedra a Piedra</div>
        ${renderViewToggle()}
        <div class="side-nav-title">${esc(model.title)}</div>
        <div class="side-nav-progress">
          <div class="overall-bar"><div class="overall-fill" id="overall-fill" style="width:${stats.pct}%"></div></div>
          <div class="side-nav-progress-meta">
            <span class="level-tag">LVL ${stats.level.level}</span>
            <span>${stats.pct.toFixed(0)}% · ${stats.done}/${stats.total}</span>
          </div>
        </div>
        ${renderFilterBar()}
      </div>
      <nav class="side-nav-list" role="listbox" aria-label="Lista de piedras">
        ${model.stones
          .map((s, i) => {
            if (!isStoneActiveByDate(s)) return "";
            const vis = filteredTasks(s);
            if (!vis.length && (filters.members.length || filters.incompleteOnly || !filters.showAll)) return "";
            return renderNavItem(s, stats.perStone[i], s.id === activeId, vis.length);
          })
          .join("")}
      </nav>
    </aside>

    <div class="side-main">
      <div class="side-main-top">
        <div class="xp-panel xp-panel-inline">
          <div class="xp-row">
            <span class="level-tag">LVL ${stats.level.level}</span>
            <span class="xp-nums">${stats.earnedXp} / ${stats.totalXp} XP</span>
          </div>
          <div class="xp-bar"><div class="xp-fill" style="width:${stats.level.pct}%"></div></div>
        </div>
      </div>

      ${
        stone
          ? `
      <article class="side-panel" style="--stone-color:${color}" data-id="${esc(stone.id)}">
        <header class="side-panel-head">
          <div class="side-panel-orb">${stone.icon || "🪨"}</div>
          <div class="side-panel-meta">
            <div class="stone-num">Piedra ${stone.number} de ${model.stones.length}</div>
            <h1 class="side-panel-title">${esc(stone.title)}</h1>
            <div class="stone-chips" style="justify-content:flex-start;margin-top:10px">
              ${stone.time ? `<span class="chip time">⏱ ${esc(stone.time)}</span>` : ""}
              ${stone.period ? `<span class="chip">📅 ${esc(stone.period)}</span>` : ""}
              <span class="chip"><strong>${st.done}</strong>/${st.total} tareas</span>
              <span class="chip">${st.complete ? "✓ Completada" : "En progreso"}</span>
            </div>
          </div>
        </header>

        ${stone.description ? `<p class="side-panel-desc">${esc(stone.description)}</p>` : ""}

        <div class="stone-progress side-panel-progress">
          <div class="stone-bar"><div class="stone-bar-fill" data-pct="${st.pct}"></div></div>
          <div class="stone-progress-label">
            <span>${st.pct.toFixed(0)}% de esta piedra</span>
            <span>${st.done} hechas</span>
          </div>
        </div>

        <div class="tasks tasks-always">
          ${renderTasksList(stone, filteredTasks(stone))}
        </div>

        <footer class="side-panel-nav">
          <button type="button" class="nav-arrow" data-goto="${prev ? esc(prev.id) : ""}" ${prev ? "" : "disabled"}>
            <span class="nav-arrow-label">← Anterior</span>
            <span class="nav-arrow-name">${prev ? `${prev.icon || ""} ${esc(prev.title)}` : "—"}</span>
          </button>
          <button type="button" class="nav-arrow next" data-goto="${next ? esc(next.id) : ""}" ${next ? "" : "disabled"}>
            <span class="nav-arrow-label">Siguiente →</span>
            <span class="nav-arrow-name">${next ? `${next.icon || ""} ${esc(next.title)}` : "—"}</span>
          </button>
        </footer>
      </article>
      `
          : `<div class="error-box"><h2>Sin piedras</h2></div>`
      }

      ${renderFooter()}
    </div>
  `;

  requestAnimationFrame(() => {
    const active = $(".nav-item.active");
    active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const main = $(".side-main");
    if (main) main.scrollTop = 0;
  });
}

function renderNavItem(stone, st, isActive, visibleCount) {
  const color = stone.color || "#f59e0b";
  const meta =
    visibleCount != null && filtersActive()
      ? `${visibleCount} filtradas · ${st.done}/${st.total}`
      : `${st.done}/${st.total}${st.complete ? " · ✓" : ""}`;
  return `
    <button type="button"
      class="nav-item ${isActive ? "active" : ""} ${st.complete ? "complete" : ""}"
      data-stone-id="${esc(stone.id)}"
      role="option"
      aria-selected="${isActive}"
      style="--stone-color:${color}">
      <span class="nav-item-orb">${stone.icon || "🪨"}</span>
      <span class="nav-item-body">
        <span class="nav-item-num">Piedra ${stone.number}</span>
        <span class="nav-item-title">${esc(stone.title)}</span>
        <span class="nav-item-bar"><span class="nav-bar-fill" data-pct="${st.pct}"></span></span>
        <span class="nav-item-meta">${meta}</span>
      </span>
    </button>
  `;
}

// ── kanban view ─────────────────────────────────────────────────────────────

function slugify(text) {
  return String(text || "item")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function uniqueTaskId(stone, title) {
  let base = slugify(title);
  let id = base;
  let n = 2;
  const used = new Set((stone.tasks || []).map((t) => t.id));
  while (used.has(id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

function findTaskByKey(key) {
  if (!key || !key.includes("::")) return null;
  const [stoneId, taskId] = key.split("::");
  const stone = model.stones.find((s) => s.id === stoneId);
  if (!stone) return null;
  const task = stone.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  return { stone, task, stoneId, taskId, key };
}

function applyBoardSnapshot() {
  let snap = null;
  try {
    snap = JSON.parse(localStorage.getItem(BOARD_KEY) || "null");
  } catch {
    snap = null;
  }
  if (!snap && progress && progress.__board) snap = progress.__board;
  if (snap && Array.isArray(snap.stones) && snap.stones.length) {
    model.stones = snap.stones;
  }
}

async function saveBoard() {
  const snap = { stones: model.stones, savedAt: Date.now() };
  localStorage.setItem(BOARD_KEY, JSON.stringify(snap));
  progress.__board = snap;
  await saveProgress();
}

/**
 * Mueve / reasigna estado de una tarea.
 * @param {string} fromKey
 * @param {string} toStoneId
 * @param {boolean} toDone
 * @param {string | null} beforeTaskId insertar antes de este task id (mismo lane)
 */
async function placeTask(fromKey, toStoneId, toDone, beforeTaskId = null) {
  const found = findTaskByKey(fromKey);
  if (!found) return;
  const { stone: fromStone, task, stoneId: fromStoneId, taskId } = found;
  const toStone = model.stones.find((s) => s.id === toStoneId);
  if (!toStone) return;

  const xp = task.xp || 0;
  const wasDone = isDone(fromStone, task);
  const oldKey = fromKey;

  // quitar de origen
  fromStone.tasks = fromStone.tasks.filter((t) => t.id !== taskId);

  // id único si cambia de piedra y colisiona
  let newTaskId = taskId;
  if (fromStoneId !== toStoneId) {
    const clash = toStone.tasks.some((t) => t.id === taskId);
    if (clash) {
      newTaskId = uniqueTaskId(toStone, task.title);
      task.id = newTaskId;
    }
  }

  // insertar en destino
  const destTasks = toStone.tasks;
  let insertAt = destTasks.length;
  if (beforeTaskId) {
    const idx = destTasks.findIndex((t) => t.id === beforeTaskId);
    if (idx >= 0) insertAt = idx;
  } else {
    // agrupar: TODOs al inicio relativo / DONEs al final del grupo
    // insertamos al final de la lista de ese estado lógico
    const sameStateIds = destTasks
      .map((t, i) => ({ t, i, done: isDone(toStone, t) }))
      .filter((x) => x.done === toDone);
    if (sameStateIds.length) {
      insertAt = sameStateIds[sameStateIds.length - 1].i + 1;
    } else if (toDone) {
      insertAt = destTasks.length;
    } else {
      insertAt = destTasks.findIndex((t) => isDone(toStone, t));
      if (insertAt < 0) insertAt = destTasks.length;
    }
  }
  destTasks.splice(insertAt, 0, task);

  // progress keys
  const newKey = taskKey(toStoneId, newTaskId);
  if (oldKey !== newKey) {
    delete progress[oldKey];
  }
  progress[newKey] = !!toDone;
  task.done = !!toDone;

  await saveBoard();

  if (toDone && !wasDone) {
    toast(`<span>✨</span> <span>+${xp} XP · movida a DONE</span>`, "xp");
    const stats = computeStats();
    const st = stats.perStone.find((s) => s.id === toStoneId);
    if (st?.complete) {
      toast(
        `<span>${toStone.icon || "🪨"}</span> <span>¡Piedra «${toStone.title}» completada!</span>`,
        "stone"
      );
      burstConfetti([toStone.color || "#10b981", "#f59e0b", "#fff"]);
    }
  } else if (!toDone && wasDone) {
    toast(`<span>↩</span> <span>Tarea de vuelta a TODO</span>`, "xp");
  } else if (fromStoneId !== toStoneId) {
    toast(
      `<span>↔</span> <span>Movida a «${esc(toStone.title)}»</span>`,
      "stone"
    );
  }

  selectedTaskKey = newKey;
  setActiveStone(toStoneId);
  render();
}

async function addTaskToStone(stoneId, title) {
  const stone = model.stones.find((s) => s.id === stoneId);
  if (!stone) return;
  const clean = (title || "").trim() || "Nueva tarea";
  const task = {
    id: uniqueTaskId(stone, clean),
    title: clean,
    done: false,
    period: "",
    xp: 50,
    notes: "",
    img: "",
    assignees: [],
  };
  // insert among TODOs
  const firstDone = stone.tasks.findIndex((t) => isDone(stone, t));
  if (firstDone < 0) stone.tasks.push(task);
  else stone.tasks.splice(firstDone, 0, task);
  progress[taskKey(stoneId, task.id)] = false;
  await saveBoard();
  selectedTaskKey = taskKey(stoneId, task.id);
  toast(`<span>＋</span> <span>Tarea creada</span>`, "xp");
  render();
}

async function updateTaskFields(key, fields) {
  const found = findTaskByKey(key);
  if (!found) return;
  const { stone, task, stoneId, taskId } = found;
  if (fields.title != null) task.title = String(fields.title).trim() || task.title;
  if (fields.notes != null) task.notes = String(fields.notes);
  if (fields.period != null) task.period = String(fields.period);
  if (fields.xp != null) {
    const n = parseInt(fields.xp, 10);
    if (!Number.isNaN(n)) task.xp = Math.max(0, n);
  }
  if (fields.img != null) task.img = String(fields.img).split(/[/\\]/).pop();
  if (Array.isArray(fields.assignees)) task.assignees = fields.assignees;
  if (typeof fields.done === "boolean") {
    progress[taskKey(stoneId, taskId)] = fields.done;
    task.done = fields.done;
  }
  await saveBoard();
  render();
}

async function deleteTask(key) {
  const found = findTaskByKey(key);
  if (!found) return;
  const { stone, taskId } = found;
  stone.tasks = stone.tasks.filter((t) => t.id !== taskId);
  delete progress[key];
  if (selectedTaskKey === key) selectedTaskKey = null;
  await saveBoard();
  toast(`<span>🗑</span> <span>Tarea eliminada</span>`, "stone");
  render();
}

function renderKanbanView(app, stats) {
  // Solo incompletas ON → solo TODO; OFF → TODO + DONE
  const showTodo = true;
  const showDone = !filters.incompleteOnly;
  const dual = showTodo && showDone;
  const stones = model.stones
    .map((s, i) => ({ s, st: stats.perStone[i], i }))
    .filter(({ s }) => isStoneActiveByDate(s));

  app.className = "app-kanban";
  app.innerHTML = `
    <div class="kb-chrome">
      <div class="kb-chrome-top">
        <div class="kb-chrome-left">
          <div class="badge">🪨 Piedra a Piedra</div>
          ${renderViewToggle()}
          <div class="kb-chrome-title">${esc(model.title)}</div>
        </div>
        <div class="kb-chrome-right">
          <div class="xp-panel xp-panel-inline">
            <div class="xp-row">
              <span class="level-tag">LVL ${stats.level.level}</span>
              <span class="xp-nums">${stats.earnedXp}/${stats.totalXp} XP · ${stats.pct.toFixed(0)}%</span>
            </div>
            <div class="xp-bar"><div class="xp-fill" style="width:${stats.level.pct}%"></div></div>
          </div>
        </div>
      </div>
      <div class="kb-chrome-filters">${renderFilterBar()}</div>
    </div>

    <div class="kb-board-wrap">
      <div class="kb-board ${dual ? "dual" : "single"}" id="kb-board">
        ${
          stones.length
            ? stones.map(({ s, st }) => renderKanbanColumn(s, st, showTodo, showDone)).join("")
            : `<div class="empty-filter kb-empty-board"><p>No hay piedras activas en esta fecha.</p><p class="kb-inspector-tip">Activa «Mostrar todo» o revisa <code>start</code> / periodos en el .stones</p></div>`
        }
      </div>
    </div>

    <aside class="kb-inspector ${selectedTaskKey ? "open" : ""}" id="kb-inspector">
      ${selectedTaskKey ? renderKanbanInspector(selectedTaskKey, stats) : `
        <div class="kb-inspector-empty">
          <div class="kb-inspector-empty-icon">☰</div>
          <p>Arrastra tarjetas entre TODO y DONE, o entre piedras.</p>
          <p class="kb-inspector-tip">Clic en una tarjeta para editarla · + para crear</p>
        </div>
      `}
    </aside>
  `;
}

function renderKanbanColumn(stone, st, showTodo, showDone) {
  const color = stone.color || "#f59e0b";
  const tasks = filteredTasks(stone);
  const todos = tasks.filter((t) => !isDone(stone, t));
  const dones = tasks.filter((t) => isDone(stone, t));
  const dual = showTodo && showDone;

  return `
    <section class="kb-col ${st.complete ? "complete" : ""}" data-stone-id="${esc(stone.id)}"
      style="--stone-color:${color}">
      <header class="kb-col-head">
        <span class="kb-col-orb">${stone.icon || "🪨"}</span>
        <div class="kb-col-meta">
          <span class="kb-col-num">Piedra ${stone.number}</span>
          <h2 class="kb-col-title" title="${esc(stone.title)}">${esc(stone.title)}</h2>
        </div>
        <span class="kb-col-count">${st.done}/${st.total}</span>
      </header>
      <div class="kb-col-bar"><span class="kanban-col-bar-fill" data-pct="${st.pct}"></span></div>
      ${stone.time || stone.period ? `
        <div class="kb-col-chips">
          ${stone.time ? `<span class="chip time">⏱ ${esc(stone.time)}</span>` : ""}
          ${stone.period ? `<span class="chip">📅 ${esc(stone.period)}</span>` : ""}
        </div>` : ""}

      <div class="kb-lanes ${dual ? "dual" : "single"}">
        ${showTodo ? renderKanbanLane(stone, "todo", todos) : ""}
        ${showDone ? renderKanbanLane(stone, "done", dones) : ""}
      </div>

      <button type="button" class="kb-add" data-add-stone="${esc(stone.id)}">+ Nueva tarea</button>
    </section>
  `;
}

function renderKanbanLane(stone, lane, tasks) {
  const label = lane === "todo" ? "TODO" : "DONE";
  return `
    <div class="kb-lane kb-lane-${lane}"
      data-lane="${lane}"
      data-stone-id="${esc(stone.id)}"
      data-drop-lane="1">
      <div class="kb-lane-head">
        <span class="kb-lane-label">${label}</span>
        <span class="kb-lane-n">${tasks.length}</span>
      </div>
      <div class="kb-lane-cards">
        ${
          tasks.length
            ? tasks.map((t) => renderKanbanCard(stone, t)).join("")
            : `<div class="kb-lane-empty">Suelta aquí</div>`
        }
      </div>
    </div>
  `;
}

function renderKanbanCard(stone, task) {
  const done = isDone(stone, task);
  const key = taskKey(stone.id, task.id);
  const selected = selectedTaskKey === key;
  return `
    <article class="kb-card ${done ? "done" : ""} ${selected ? "selected" : ""}"
      draggable="true"
      data-key="${esc(key)}"
      data-stone="${esc(stone.id)}"
      data-task="${esc(task.id)}"
      style="--stone-color:${stone.color || "#f59e0b"}">
      <div class="kb-card-top">
        <span class="kb-card-grip" title="Arrastrar" aria-hidden="true">⋮⋮</span>
        <div class="kb-card-title">${esc(task.title)}</div>
      </div>
      ${task.notes ? `<p class="kb-card-notes">${esc(task.notes)}</p>` : ""}
      <div class="kb-card-meta">
        ${task.period ? `<span class="meta-pill">⏱ ${esc(task.period)}</span>` : ""}
        <span class="meta-pill xp">+${task.xp || 0}</span>
      </div>
      <div class="kb-card-foot">
        <div class="kb-card-assignees">${renderAssigneeChips(task.assignees || [], { compact: true })}</div>
        ${task.img ? `<span class="kb-card-img" title="${esc(task.img)}">🖼</span>` : ""}
      </div>
    </article>
  `;
}

function renderKanbanInspector(key, stats) {
  const found = findTaskByKey(key);
  if (!found) {
    return `<div class="kb-inspector-empty"><p>Tarea no encontrada.</p></div>`;
  }
  const { stone, task, stoneId } = found;
  const done = isDone(stone, task);
  const st = stats.perStone.find((s) => s.id === stoneId);
  const team = model.team || [];
  const asg = new Set(task.assignees || []);

  const teamOpts = team
    .map(
      (m) => `
      <label class="kb-asg-opt" style="--m-color:${esc(m.color)}">
        <input type="checkbox" data-asg-id="${esc(m.id)}" ${asg.has(m.id) ? "checked" : ""} />
        <span class="assignee-avatar sm">${esc(initials(m.name))}</span>
        <span>${esc(m.name)}</span>
      </label>`
    )
    .join("");

  const stoneOpts = model.stones
    .map(
      (s) =>
        `<option value="${esc(s.id)}" ${s.id === stoneId ? "selected" : ""}>${esc(s.icon || "")} ${esc(s.title)}</option>`
    )
    .join("");

  const img = task.img
    ? `<img class="kb-insp-img" src="/images/${encodeURIComponent(task.img)}" alt=""
         data-full="/images/${encodeURIComponent(task.img)}"
         onerror="this.style.display='none'" />`
    : "";

  return `
    <div class="kb-insp" style="--stone-color:${stone.color || "#f59e0b"}" data-edit-key="${esc(key)}">
      <button type="button" class="kb-insp-close" data-kb="close-insp" aria-label="Cerrar">×</button>
      <div class="kb-insp-kicker">${stone.icon || "🪨"} Piedra ${stone.number} · ${esc(stone.title)}</div>

      <label class="kb-field">
        <span>Título</span>
        <input type="text" data-field="title" value="${esc(task.title)}" />
      </label>
      <label class="kb-field">
        <span>Notas</span>
        <textarea data-field="notes" rows="3">${esc(task.notes || "")}</textarea>
      </label>
      <div class="kb-field-row">
        <label class="kb-field">
          <span>Periodo</span>
          <input type="text" data-field="period" value="${esc(task.period || "")}" placeholder="días 1–3" />
        </label>
        <label class="kb-field">
          <span>XP</span>
          <input type="number" data-field="xp" min="0" step="10" value="${task.xp || 0}" />
        </label>
      </div>
      <label class="kb-field">
        <span>Imagen (nombre en images/)</span>
        <input type="text" data-field="img" value="${esc(task.img || "")}" placeholder="captura.png" />
      </label>
      ${img}

      <div class="kb-field">
        <span>Asignado a</span>
        <div class="kb-asg-list">${teamOpts || "<p class='task-notes'>Sin equipo en @team</p>"}</div>
      </div>

      <label class="kb-field">
        <span>Piedra</span>
        <select data-field="stone">${stoneOpts}</select>
      </label>

      <div class="kb-insp-actions">
        <button type="button" class="kb-btn primary" data-kb="save">Guardar</button>
        <button type="button" class="kb-btn" data-kb="toggle-done">${done ? "→ TODO" : "→ DONE"}</button>
        <button type="button" class="kb-btn danger" data-kb="delete">Eliminar</button>
      </div>
      ${st ? `<div class="kb-insp-prog">Progreso piedra: ${st.done}/${st.total} (${st.pct.toFixed(0)}%)</div>` : ""}
    </div>
  `;
}

function bindKanban() {
  // select card
  $$(".kb-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button, input, a")) return;
      const key = card.dataset.key;
      selectedTaskKey = selectedTaskKey === key ? null : key;
      if (card.dataset.stone) setActiveStone(card.dataset.stone);
      render();
    });

    card.addEventListener("dragstart", (e) => {
      dragKey = card.dataset.key;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragKey || "");
      // delay so drag image paints
      requestAnimationFrame(() => card.classList.add("dragging-ghost"));
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging", "dragging-ghost");
      dragKey = null;
      $$(".kb-lane.drag-over").forEach((l) => l.classList.remove("drag-over"));
    });
  });

  $$("[data-drop-lane]").forEach((lane) => {
    lane.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      lane.classList.add("drag-over");
    });
    lane.addEventListener("dragleave", (e) => {
      if (!lane.contains(e.relatedTarget)) lane.classList.remove("drag-over");
    });
    lane.addEventListener("drop", async (e) => {
      e.preventDefault();
      lane.classList.remove("drag-over");
      const key = dragKey || e.dataTransfer.getData("text/plain");
      if (!key) return;
      const toStoneId = lane.dataset.stoneId;
      const toDone = lane.dataset.lane === "done";
      // drop on another card?
      const overCard = e.target.closest?.(".kb-card");
      const beforeId =
        overCard && overCard.dataset.stone === toStoneId ? overCard.dataset.task : null;
      await placeTask(key, toStoneId, toDone, beforeId);
    });
  });

  $$("[data-add-stone]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const stoneId = btn.dataset.addStone;
      const title = window.prompt("Título de la nueva tarea:");
      if (title === null) return;
      await addTaskToStone(stoneId, title);
    });
  });

  // inspector
  const insp = $("#kb-inspector");
  if (!insp) return;

  insp.querySelector('[data-kb="close-insp"]')?.addEventListener("click", () => {
    selectedTaskKey = null;
    render();
  });

  insp.querySelector('[data-kb="save"]')?.addEventListener("click", async () => {
    const root = insp.querySelector(".kb-insp");
    if (!root) return;
    const key = root.dataset.editKey;
    const title = root.querySelector('[data-field="title"]')?.value;
    const notes = root.querySelector('[data-field="notes"]')?.value;
    const period = root.querySelector('[data-field="period"]')?.value;
    const xp = root.querySelector('[data-field="xp"]')?.value;
    const img = root.querySelector('[data-field="img"]')?.value;
    const assignees = [...root.querySelectorAll("[data-asg-id]:checked")].map(
      (el) => el.dataset.asgId
    );
    const newStone = root.querySelector('[data-field="stone"]')?.value;
    await updateTaskFields(key, { title, notes, period, xp, img, assignees });
    // move stone if changed
    const found = findTaskByKey(selectedTaskKey || key);
    if (found && newStone && newStone !== found.stoneId) {
      await placeTask(selectedTaskKey || key, newStone, isDone(found.stone, found.task));
    } else {
      toast(`<span>💾</span> <span>Cambios guardados</span>`, "xp");
    }
  });

  insp.querySelector('[data-kb="toggle-done"]')?.addEventListener("click", async () => {
    const found = findTaskByKey(selectedTaskKey);
    if (!found) return;
    const done = isDone(found.stone, found.task);
    await placeTask(selectedTaskKey, found.stoneId, !done);
  });

  insp.querySelector('[data-kb="delete"]')?.addEventListener("click", async () => {
    if (!selectedTaskKey) return;
    if (!window.confirm("¿Eliminar esta tarea?")) return;
    await deleteTask(selectedTaskKey);
  });
}

// ── shared task render ──────────────────────────────────────────────────────
function renderTasksList(stone, tasks) {
  const list = tasks || filteredTasks(stone);
  if (!list.length) {
    return `<p class="task-notes" style="padding:12px">${
      filtersActive() ? "Ninguna tarea con estos filtros." : "Sin tareas definidas."
    }</p>`;
  }
  return list.map((t) => renderTask(stone, t)).join("");
}

function renderTask(stone, task) {
  const done = isDone(stone, task);
  const key = taskKey(stone.id, task.id);
  const img = task.img
    ? `<img class="task-img" src="/images/${encodeURIComponent(task.img)}" alt="${esc(task.title)}"
         data-full="/images/${encodeURIComponent(task.img)}" loading="lazy"
         onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'task-img missing',textContent:'sin img\\n${esc(task.img)}'}))" />`
    : "";

  return `
    <div class="task ${done ? "done" : ""}" data-key="${esc(key)}">
      <label class="task-check">
        <input type="checkbox" ${done ? "checked" : ""} data-key="${esc(key)}" data-xp="${task.xp || 0}" data-stone="${esc(stone.id)}" />
        <span class="box">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
      </label>
      <div class="task-main">
        <div class="task-title">${esc(task.title)}</div>
        ${task.notes ? `<p class="task-notes">${esc(task.notes)}</p>` : ""}
        <div class="task-meta">
          ${task.period ? `<span class="meta-pill">⏱ ${esc(task.period)}</span>` : ""}
          <span class="meta-pill xp">+${task.xp || 0} XP</span>
        </div>
        <div class="task-assignees">${renderAssigneeChips(task.assignees)}</div>
      </div>
      <div class="task-side">${img}</div>
    </div>
  `;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── events ──────────────────────────────────────────────────────────────────
function bindEvents() {
  bindFilterEvents();

  $$(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.view;
      if (mode && mode !== viewMode) setViewMode(mode);
    });
  });

  $$(".stone-head").forEach((head) => {
    const stone = head.closest(".stone");
    const toggle = () => {
      stone.classList.toggle("open");
      head.setAttribute("aria-expanded", stone.classList.contains("open"));
    };
    head.addEventListener("click", (e) => {
      if (e.target.closest("a, button, input, label")) return;
      toggle();
    });
    head.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });

  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.stoneId;
      if (id && id !== activeStoneId) {
        setActiveStone(id);
        render();
      }
    });
  });

  $$(".nav-arrow[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.goto;
      if (!id || btn.disabled) return;
      setActiveStone(id);
      render();
    });
  });

  $$('input[type="checkbox"][data-key]').forEach((input) => {
    input.addEventListener("change", async () => {
      const key = input.dataset.key;
      const xp = parseInt(input.dataset.xp || "0", 10);
      const wasDone = !!progress[key];
      const nowDone = input.checked;
      const stoneId = input.dataset.stone;

      progress[key] = nowDone;
      await saveProgress();

      const before = levelFromXp(
        computeStats().earnedXp - (nowDone ? xp : 0) + (wasDone && !nowDone ? xp : 0)
      );
      const stats = computeStats();
      const after = stats.level;

      if (nowDone && !wasDone) {
        toast(`<span>✨</span> <span>+${xp} XP · tarea completada</span>`, "xp");
        if (after.level > before.level) {
          toast(`<span>⚡</span> <span>¡Subiste a nivel ${after.level}!</span>`, "level");
          burstConfetti();
        }
        const stoneStat = stats.perStone.find((s) => s.id === stoneId);
        if (stoneStat?.complete) {
          const st = model.stones.find((s) => s.id === stoneId);
          toast(
            `<span>${st?.icon || "🪨"}</span> <span>¡Piedra «${st?.title}» completada!</span>`,
            "stone"
          );
          burstConfetti([st?.color || "#10b981", "#f59e0b", "#fff"]);
        }
      }

      if (viewMode === "timeline") keepOpenId = stoneId;
      if ((viewMode === "sidebar" || viewMode === "kanban") && stoneId) setActiveStone(stoneId);
      if (viewMode === "kanban") selectedTaskKey = key;
      render();
    });
  });

  $$(".task-img[data-full], .kb-insp-img[data-full]").forEach((img) => {
    img.addEventListener("click", () => openLightbox(img.dataset.full, img.alt));
  });

  if (viewMode === "kanban") {
    bindKanban();
  }
}

function openLightbox(src, alt) {
  const lb = $("#lightbox");
  const im = $("#lightbox-img");
  im.src = src;
  im.alt = alt || "";
  lb.hidden = false;
}

function closeLightbox() {
  const lb = $("#lightbox");
  lb.hidden = true;
  $("#lightbox-img").src = "";
}

function navigateSidebar(delta) {
  if (viewMode !== "sidebar" || !model) return;
  const idx = model.stones.findIndex((s) => s.id === activeStoneId);
  const next = model.stones[idx + delta];
  if (next) {
    setActiveStone(next.id);
    render();
  }
}

// ── boot ────────────────────────────────────────────────────────────────────
async function boot() {
  progress = loadLocalProgress();
  document.body.dataset.view = viewMode;

  try {
    const res = await fetch("/api/model");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    model = await res.json();
    if (model.error) throw new Error(model.error);

    if (model.progress && typeof model.progress === "object") {
      progress = { ...progress, ...model.progress };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }

    applyBoardSnapshot();

    for (const s of model.stones) {
      for (const t of s.tasks) {
        const k = taskKey(s.id, t.id);
        if (!(k in progress) && t.done) progress[k] = true;
      }
    }

    document.title = `${model.title} · Piedra a Piedra`;
    render();
  } catch (err) {
    $("#app").innerHTML = `
      <div class="error-box">
        <h2>No se pudo cargar el modelo</h2>
        <p>${esc(err.message)}</p>
        <p style="margin-top:12px">¿Está corriendo <code>python server.py</code>?</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const lb = $("#lightbox");
  lb?.addEventListener("click", (e) => {
    if (e.target === lb || e.target.classList.contains("lightbox-close")) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (viewMode === "kanban" && selectedTaskKey) {
        selectedTaskKey = null;
        render();
        return;
      }
      closeLightbox();
    }
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;

    if (viewMode === "sidebar") {
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        navigateSidebar(1);
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        navigateSidebar(-1);
      }
    }
  });
  boot();
});
