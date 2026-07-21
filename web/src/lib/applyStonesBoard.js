/**
 * Aplica un board objetivo (con ids donde existan) a Supabase
 * comparándolo con el board actual.
 */
import * as api from "./api";

function taskSig(t) {
  return [
    t.title,
    t.notes,
    t.xp,
    !!t.done,
    t.period,
    t.dateStart,
    t.dateEnd,
    t.img || t.imagePath || "",
  ].join("\u0001");
}

function stoneSig(s) {
  return [
    s.title,
    s.description,
    s.icon,
    s.color,
    s.time,
    s.period,
    s.dateStart,
    s.dateEnd,
    s.number,
  ].join("\u0001");
}

/**
 * @param {string} projectId
 * @param {object} beforeBoard - board con ids DB
 * @param {object} targetBoard - board deseado (ids preservados si existían)
 * @param {{ updateProject?: boolean }} opts
 */
export async function applyBoardToDatabase(
  projectId,
  beforeBoard,
  targetBoard,
  opts = {}
) {
  const beforeStones = beforeBoard.stones || [];
  const targetStones = targetBoard.stones || [];

  if (opts.updateProject) {
    const patch = {};
    if (
      targetBoard.title != null &&
      targetBoard.title !== beforeBoard.title
    ) {
      patch.name = targetBoard.title;
    }
    if ((targetBoard.subtitle || "") !== (beforeBoard.subtitle || "")) {
      patch.description = targetBoard.subtitle || "";
    }
    const nextStart = targetBoard.meta?.start || null;
    const nextEnd = targetBoard.meta?.end || null;
    const prevStart =
      beforeBoard.meta?.start || beforeBoard.project?.start_date || null;
    const prevEnd =
      beforeBoard.meta?.end || beforeBoard.project?.end_date || null;
    if ((nextStart || null) !== (prevStart || null)) {
      patch.start_date = nextStart || null;
    }
    if ((nextEnd || null) !== (prevEnd || null)) {
      patch.end_date = nextEnd || null;
    }
    if (Object.keys(patch).length) {
      await api.updateProject(projectId, patch);
    }
  }

  const beforeById = new Map(
    beforeStones.filter((s) => s.id).map((s) => [s.id, s])
  );
  const targetWithId = targetStones.filter(
    (s) => s.id && beforeById.has(s.id)
  );
  const targetNew = targetStones.filter(
    (s) => !s.id || !beforeById.has(s.id)
  );
  const targetIds = new Set(targetWithId.map((s) => s.id));

  for (const s of beforeStones) {
    if (s.id && !targetIds.has(s.id)) {
      await api.deleteStoneDb(s.id);
    }
  }

  for (const ts of targetWithId) {
    const bs = beforeById.get(ts.id);
    if (!bs) continue;

    if (stoneSig(bs) !== stoneSig(ts)) {
      await api.updateStoneDb(ts.id, {
        title: ts.title,
        description: ts.description || "",
        icon: ts.icon || "🪨",
        color: ts.color || "#f59e0b",
        time: ts.time || "",
        period: ts.period || "",
        dateStart: ts.dateStart || null,
        dateEnd: ts.dateEnd || null,
        number: ts.number ?? bs.number,
      });
    }

    const beforeTasks = bs.tasks || [];
    const targetTasks = ts.tasks || [];
    const beforeTaskById = new Map(
      beforeTasks.filter((t) => t.id).map((t) => [t.id, t])
    );
    const keepTaskIds = new Set(
      targetTasks
        .filter((t) => t.id && beforeTaskById.has(t.id))
        .map((t) => t.id)
    );

    for (const t of beforeTasks) {
      if (t.id && !keepTaskIds.has(t.id)) {
        await api.deleteTaskDb(t.id);
      }
    }

    let sort = 0;
    for (const tt of targetTasks) {
      if (tt.id && beforeTaskById.has(tt.id)) {
        const bt = beforeTaskById.get(tt.id);
        if (taskSig(bt) !== taskSig(tt) || bt.sort_order !== sort) {
          await api.updateTaskDb(tt.id, {
            title: tt.title,
            notes: tt.notes || "",
            xp: tt.xp ?? 50,
            done: !!tt.done,
            period: tt.period || "",
            dateStart: tt.dateStart || null,
            dateEnd: tt.dateEnd || null,
            img: tt.img || tt.imagePath || null,
            sort_order: sort,
          });
        }
      } else {
        await api.createTaskDb(projectId, ts.id, {
          title: tt.title || "Tarea",
          notes: tt.notes || "",
          xp: tt.xp ?? 50,
          done: !!tt.done,
          period: tt.period || "",
          dateStart: tt.dateStart || null,
          dateEnd: tt.dateEnd || null,
          img: tt.img || null,
        });
      }
      sort += 1;
    }
  }

  for (let i = 0; i < targetNew.length; i++) {
    const ts = targetNew[i];
    const row = await api.createStone(projectId, {
      title: ts.title || "Piedra",
      description: ts.description || "",
      icon: ts.icon || "🪨",
      color: ts.color || "#f59e0b",
      time: ts.time || "",
      period: ts.period || "",
      dateStart: ts.dateStart || null,
      dateEnd: ts.dateEnd || null,
    });
    await api.updateStoneNumber(row.id, ts.number ?? row.number, i);
    for (const tt of ts.tasks || []) {
      await api.createTaskDb(projectId, row.id, {
        title: tt.title || "Tarea",
        notes: tt.notes || "",
        xp: tt.xp ?? 50,
        done: !!tt.done,
        period: tt.period || "",
        dateStart: tt.dateStart || null,
        dateEnd: tt.dateEnd || null,
        img: tt.img || null,
      });
    }
  }
}
