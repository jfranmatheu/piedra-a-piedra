import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import * as api from "../lib/api";
import {
  isStoneActiveByDate,
  isTaskActiveByDate,
  periodLabelFromDates,
} from "../lib/dates";
import { levelFromXp, parseTaskKey, taskKey } from "../lib/utils";
import { publicAssetUrl } from "../lib/supabase";

const FILTER_KEY = "piedra-filters-v2";
const VIEW_KEY = "piedra-view-v1";
const UNASSIGNED = "__none__";

const AppContext = createContext(null);

function loadFilters() {
  try {
    const raw = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
    const incompleteOnly = Object.prototype.hasOwnProperty.call(raw, "incompleteOnly")
      ? !!raw.incompleteOnly
      : true;
    return {
      members: Array.isArray(raw.members) ? raw.members.map(String) : [],
      incompleteOnly,
      showAll: !!raw.showAll,
    };
  } catch {
    return { members: [], incompleteOnly: true, showAll: false };
  }
}

function loadView() {
  let v = localStorage.getItem(VIEW_KEY) || "kanban";
  if (v === "flow") v = "kanban";
  if (!["timeline", "sidebar", "kanban"].includes(v)) v = "kanban";
  return v;
}

export function AppProvider({ children }) {
  const { projectId } = useParams();
  const [model, setModel] = useState(null);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [viewMode, setViewModeState] = useState(loadView);
  const [filters, setFiltersState] = useState(loadFilters);
  const [selectedTaskKey, setSelectedTaskKey] = useState(null);
  const [editingStoneId, setEditingStoneId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  const toast = useCallback((msg, kind = "xp") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setBootError(null);
      try {
        const board = await api.loadProjectBoard(projectId);
        if (cancelled) return;
        setProject(board.project);
        setMembers(board.members);
        setModel({
          title: board.title,
          subtitle: board.subtitle,
          meta: board.meta,
          team: board.team,
          stones: board.stones,
          source: "supabase",
        });
        document.title = `${board.title} · Piedra a Piedra`;
      } catch (e) {
        if (!cancelled) setBootError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadTick]);

  const setViewMode = useCallback((mode) => {
    const m = mode === "flow" ? "kanban" : mode;
    setViewModeState(m);
    localStorage.setItem(VIEW_KEY, m);
  }, []);

  const setFilters = useCallback((updater) => {
    setFiltersState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem(FILTER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isDone = useCallback((_stone, task) => !!task.done, []);

  const stats = useMemo(() => {
    if (!model) return null;
    let total = 0;
    let done = 0;
    let totalXp = 0;
    let earnedXp = 0;
    const perStone = model.stones.map((s) => {
      const t = s.tasks.length;
      const d = s.tasks.filter((task) => task.done).length;
      const tx = s.tasks.reduce((a, task) => a + (task.xp || 0), 0);
      const ex = s.tasks
        .filter((task) => task.done)
        .reduce((a, task) => a + (task.xp || 0), 0);
      total += t;
      done += d;
      totalXp += tx;
      earnedXp += ex;
      return {
        id: s.id,
        total: t,
        done: d,
        pct: t ? (d / t) * 100 : 0,
        complete: t > 0 && d === t,
      };
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
  }, [model]);

  const taskMatchesFilters = useCallback(
    (stone, task) => {
      if (!model) return false;
      if (!isTaskActiveByDate(stone, task, model.meta, filters.showAll)) return false;
      if (viewMode !== "kanban" && filters.incompleteOnly && task.done) return false;
      if (filters.members.length) {
        const asg = task.assignees || [];
        const wantsNone = filters.members.includes(UNASSIGNED);
        const hitMember = asg.some((id) => filters.members.includes(id));
        const hitNone = wantsNone && asg.length === 0;
        if (!hitMember && !hitNone) return false;
      }
      return true;
    },
    [model, filters, viewMode]
  );

  const filteredTasks = useCallback(
    (stone) => (stone.tasks || []).filter((t) => taskMatchesFilters(stone, t)),
    [taskMatchesFilters]
  );

  const visibleStones = useMemo(() => {
    if (!model) return [];
    return model.stones.filter((s) =>
      isStoneActiveByDate(s, model.meta, filters.showAll)
    );
  }, [model, filters.showAll]);

  const findTask = useCallback(
    (key) => {
      if (!model || !key) return null;
      const i = key.indexOf("::");
      if (i < 0) return null;
      const stoneId = key.slice(0, i);
      const taskId = key.slice(i + 2);
      const stone = model.stones.find((s) => s.id === stoneId);
      if (!stone) return null;
      const task = stone.tasks.find((t) => t.id === taskId);
      if (!task) return null;
      return { stone, task, stoneId, taskId, key };
    },
    [model]
  );

  const updateTask = useCallback(
    async (key, fields) => {
      const found = findTask(key);
      if (!found) return;
      const { stoneId, taskId, task, stone } = found;

      // optimistic local
      setModel((prev) => {
        if (!prev) return prev;
        const stones = structuredClone(prev.stones);
        const s = stones.find((x) => x.id === stoneId);
        const t = s?.tasks.find((x) => x.id === taskId);
        if (!t) return prev;
        Object.assign(t, {
          ...(fields.title != null ? { title: fields.title } : {}),
          ...(fields.notes != null ? { notes: fields.notes } : {}),
          ...(fields.xp != null ? { xp: parseInt(fields.xp, 10) || 0 } : {}),
          ...(fields.done != null ? { done: fields.done } : {}),
          ...(fields.period != null ? { period: fields.period } : {}),
          ...(fields.dateStart != null ? { dateStart: fields.dateStart } : {}),
          ...(fields.dateEnd != null ? { dateEnd: fields.dateEnd } : {}),
          ...(fields.img !== undefined
            ? { img: fields.img || "", imagePath: fields.img || "" }
            : {}),
          ...(fields.imagePath !== undefined
            ? { img: fields.imagePath || "", imagePath: fields.imagePath || "" }
            : {}),
          ...(Array.isArray(fields.assignees) ? { assignees: fields.assignees } : {}),
        });
        if (fields.dateStart != null || fields.dateEnd != null) {
          t.period = periodLabelFromDates(t.dateStart, t.dateEnd);
        }
        if (fields.stoneId && fields.stoneId !== stoneId) {
          s.tasks = s.tasks.filter((x) => x.id !== taskId);
          const dest = stones.find((x) => x.id === fields.stoneId);
          if (dest) dest.tasks.push(t);
        }
        return { ...prev, stones };
      });

      try {
        const payload = { ...fields };
        if (fields.stoneId !== undefined) payload.stoneId = fields.stoneId;
        // Explicit clear: keep img: null so updateTaskDb sets image_path = null
        if (fields.img !== undefined) payload.img = fields.img;
        await api.updateTaskDb(taskId, payload);
        if (fields.done === true && !task.done) {
          toast(`✨ +${task.xp || 0} XP`, "xp");
        } else if (fields.title != null || fields.notes != null) {
          /* silent */
        } else {
          toast("💾 Guardado", "xp");
        }
      } catch (e) {
        toast(`Error: ${e.message}`, "stone");
        reload();
      }
    },
    [findTask, toast, reload]
  );

  const moveTask = useCallback(
    async (fromKey, toStoneId, toDone, toIndex = null) => {
      const found = findTask(fromKey);
      if (!found || !projectId) return fromKey;
      const { stoneId: fromStoneId, taskId, task } = found;
      const wasDone = task.done;

      setModel((prev) => {
        if (!prev) return prev;
        const stones = structuredClone(prev.stones);
        const from = stones.find((s) => s.id === fromStoneId);
        const to = stones.find((s) => s.id === toStoneId);
        if (!from || !to) return prev;
        const idx = from.tasks.findIndex((t) => t.id === taskId);
        if (idx < 0) return prev;
        const [moved] = from.tasks.splice(idx, 1);
        moved.done = !!toDone;
        let insertAt = toIndex == null ? to.tasks.length : toIndex;
        if (fromStoneId === toStoneId && idx < insertAt) insertAt -= 1;
        insertAt = Math.max(0, Math.min(insertAt, to.tasks.length));
        to.tasks.splice(insertAt, 0, moved);
        // renumber sort_order
        to.tasks.forEach((t, i) => {
          t.sort_order = i;
        });
        return { ...prev, stones };
      });

      try {
        await api.updateTaskDb(taskId, {
          done: !!toDone,
          stoneId: toStoneId,
          sort_order: toIndex ?? 0,
        });
        // persist order of destination stone
        const dest = model?.stones.find((s) => s.id === toStoneId);
        // reload for consistency after multi-move
        if (toDone && !wasDone) toast(`✨ +${task.xp || 0} XP · DONE`, "xp");
        else if (!toDone && wasDone) toast("↩ TODO", "xp");
      } catch (e) {
        toast(`Error: ${e.message}`, "stone");
        reload();
      }
      return taskKey(toStoneId, taskId);
    },
    [findTask, projectId, model, toast, reload]
  );

  const commitKanbanLanes = useCallback(
    async (lanesMap) => {
      if (!model || !projectId) return;
      const stones = structuredClone(model.stones);
      const byId = Object.fromEntries(
        stones.flatMap((s) => s.tasks.map((t) => [taskKey(s.id, t.id), { ...t, origin: s.id }]))
      );
      const used = new Set();

      for (const s of stones) s.tasks = [];

      const place = (stone, keys, done) => {
        for (const key of keys) {
          const entry = byId[key];
          if (!entry || used.has(key)) continue;
          used.add(key);
          const { origin, ...task } = entry;
          task.done = !!done;
          stone.tasks.push(task);
        }
      };

      for (const s of stones) {
        place(s, lanesMap[`lane::${s.id}::todo`] || [], false);
        place(s, lanesMap[`lane::${s.id}::done`] || [], true);
      }

      // leftover (filtered)
      for (const s of model.stones) {
        for (const t of s.tasks) {
          const k = taskKey(s.id, t.id);
          if (used.has(k)) continue;
          const dest = stones.find((x) => x.id === s.id);
          if (dest) dest.tasks.push({ ...t });
        }
      }

      setModel((prev) => (prev ? { ...prev, stones } : prev));

      try {
        // persist each task done + stone + sort
        const ops = [];
        for (const s of stones) {
          s.tasks.forEach((t, i) => {
            ops.push(
              api.updateTaskDb(t.id, {
                done: !!t.done,
                stoneId: s.id,
                sort_order: i,
              })
            );
          });
        }
        await Promise.all(ops);
      } catch (e) {
        toast(`Error al guardar tablero: ${e.message}`, "stone");
        reload();
      }
    },
    [model, projectId, toast, reload]
  );

  const updateStone = useCallback(
    async (stoneId, fields) => {
      setModel((prev) => {
        if (!prev) return prev;
        const stones = structuredClone(prev.stones);
        const s = stones.find((x) => x.id === stoneId);
        if (!s) return prev;
        Object.assign(s, fields);
        if (fields.dateStart != null || fields.dateEnd != null) {
          s.period = periodLabelFromDates(s.dateStart, s.dateEnd);
        }
        return { ...prev, stones };
      });
      try {
        await api.updateStoneDb(stoneId, fields);
        toast("🪨 Piedra actualizada", "stone");
      } catch (e) {
        toast(`Error: ${e.message}`, "stone");
        reload();
      }
    },
    [toast, reload]
  );

  const addStone = useCallback(
    async (fields = {}) => {
      if (!projectId) return null;
      try {
        const row = await api.createStone(projectId, fields);
        const stone = {
          id: row.id,
          number: row.number,
          title: row.title,
          description: row.description || "",
          icon: row.icon || "🪨",
          color: row.color || "#f59e0b",
          time: row.time_label || "",
          period:
            row.period ||
            periodLabelFromDates(row.date_start || "", row.date_end || ""),
          dateStart: row.date_start || "",
          dateEnd: row.date_end || "",
          sort_order: row.sort_order,
          tasks: [],
        };
        setModel((prev) => {
          if (!prev) return prev;
          return { ...prev, stones: [...prev.stones, stone] };
        });
        toast("🪨 Piedra creada", "stone");
        return stone;
      } catch (e) {
        toast(`Error al crear piedra: ${e.message}`, "stone");
        return null;
      }
    },
    [projectId, toast]
  );

  const deleteStone = useCallback(
    async (stoneId) => {
      if (!stoneId) return false;
      const prevSnapshot = model?.stones;
      setModel((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stones: prev.stones.filter((s) => s.id !== stoneId),
        };
      });
      if (editingStoneId === stoneId) setEditingStoneId(null);
      if (parseTaskKey(selectedTaskKey)?.stoneId === stoneId) setSelectedTaskKey(null);
      try {
        await api.deleteStoneDb(stoneId);
        toast("🗑 Piedra eliminada", "stone");
        return true;
      } catch (e) {
        if (prevSnapshot) {
          setModel((prev) => (prev ? { ...prev, stones: prevSnapshot } : prev));
        } else {
          reload();
        }
        toast(`Error al borrar piedra: ${e.message}`, "stone");
        return false;
      }
    },
    [model?.stones, editingStoneId, selectedTaskKey, toast, reload]
  );

  const addTask = useCallback(
    async (stoneId, fields = {}) => {
      if (!projectId) return null;
      const payload =
        typeof fields === "string"
          ? { title: fields }
          : {
              title: fields.title || "Nueva tarea",
              notes: fields.notes || "",
              xp: fields.xp ?? 50,
              period: fields.period || "",
              dateStart: fields.dateStart || "",
              dateEnd: fields.dateEnd || "",
              img: fields.img || fields.imagePath || null,
              assignees: Array.isArray(fields.assignees)
                ? fields.assignees
                : [],
            };
      try {
        const row = await api.createTaskDb(projectId, stoneId, payload);
        setModel((prev) => {
          if (!prev) return prev;
          const stones = structuredClone(prev.stones);
          const s = stones.find((x) => x.id === stoneId);
          if (!s) return prev;
          s.tasks.push({
            id: row.id,
            title: row.title,
            notes: row.notes || payload.notes || "",
            xp: row.xp ?? payload.xp,
            done: false,
            period: row.period || payload.period || "",
            dateStart: row.date_start || payload.dateStart || "",
            dateEnd: row.date_end || payload.dateEnd || "",
            img: row.image_path || payload.img || "",
            imagePath: row.image_path || payload.img || "",
            assignees: payload.assignees || [],
          });
          return { ...prev, stones };
        });
        toast("＋ Tarea creada", "xp");
        return row;
      } catch (e) {
        toast(`Error: ${e.message}`, "stone");
        throw e;
      }
    },
    [projectId, toast]
  );

  const deleteTask = useCallback(
    async (key) => {
      const found = findTask(key);
      if (!found) return;
      setModel((prev) => {
        if (!prev) return prev;
        const stones = structuredClone(prev.stones);
        const s = stones.find((x) => x.id === found.stoneId);
        if (s) s.tasks = s.tasks.filter((t) => t.id !== found.taskId);
        return { ...prev, stones };
      });
      try {
        await api.deleteTaskDb(found.taskId);
        toast("🗑 Eliminada", "stone");
      } catch (e) {
        toast(`Error: ${e.message}`, "stone");
        reload();
      }
    },
    [findTask, toast, reload]
  );

  const resolveImgUrl = useCallback((task) => {
    if (!task?.img && !task?.imagePath) return null;
    const p = task.imagePath || task.img;
    if (p.startsWith("http")) return p;
    // path may be full storage path or just filename for legacy
    if (p.includes("/")) return publicAssetUrl(p);
    if (projectId) return publicAssetUrl(`${projectId}/${p}`);
    return publicAssetUrl(p);
  }, [projectId]);

  const value = {
    model,
    project,
    projectId,
    members,
    stats,
    viewMode,
    setViewMode,
    filters,
    setFilters,
    selectedTaskKey,
    setSelectedTaskKey,
    editingStoneId,
    setEditingStoneId,
    toasts,
    toast,
    loading,
    bootError,
    isDone,
    filteredTasks,
    visibleStones,
    taskMatchesFilters,
    findTask,
    moveTask,
    commitKanbanLanes,
    updateTask,
    deleteTask,
    addTask,
    addStone,
    deleteStone,
    updateStone,
    reload,
    resolveImgUrl,
    UNASSIGNED,
    NEW_STONE_ID: "__new__",
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}
