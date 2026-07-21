import { supabase, publicAssetUrl } from "./supabase";
import { normalizeUsername, validateUsername } from "./username";

/** Map common PostgREST / Auth errors to actionable Spanish messages. */
function mapSupabaseError(error, fallback = "Error de Supabase") {
  if (!error) return new Error(fallback);
  const status = error.status || error.statusCode || error.code;
  const msg = (error.message || String(error)).toLowerCase();
  const code = String(error.code || "");

  if (
    status === 401 ||
    code === "PGRST301" ||
    msg.includes("jwt") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid claim")
  ) {
    return new Error(
      "Sesión no válida o expirada (401). Cierra sesión, vuelve a entrar y comprueba que VITE_SUPABASE_PUBLISHABLE_KEY sea la publishable (sb_publishable_…), no la secret. Si acabas de cambiar SQL, ejecuta scripts/supabase/005_fix_rls_grants.sql."
    );
  }
  if (
    status === 403 ||
    code === "42501" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("rls") ||
    msg.includes("forbidden")
  ) {
    return new Error(
      "Sin permiso (403 / RLS). Ejecuta en Supabase SQL Editor: scripts/supabase/005_fix_rls_grants.sql. Si creaste el usuario antes del schema, asegúrate de tener fila en profiles (el trigger handle_new_user)."
    );
  }
  if (code === "23503" || msg.includes("foreign key")) {
    return new Error(
      "Falta tu perfil en public.profiles (FK). En SQL: comprueba select * from profiles where id = auth.uid(); si está vacío, vuelve a crear el usuario o inserta el perfil."
    );
  }
  // Postgres RAISE EXCEPTION from RPCs (ownership, leave, roles…)
  if (error.message && !msg.startsWith("json") && error.message.length < 280) {
    return new Error(error.message);
  }
  return error instanceof Error ? error : new Error(error.message || fallback);
}

/** Ensure we have a live access token before REST calls. */
async function requireUser() {
  const { data: sessData, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) throw mapSupabaseError(sessErr);
  let session = sessData.session;
  if (!session?.access_token) {
    throw new Error("No hay sesión. Inicia sesión de nuevo.");
  }
  // Prefer getUser() to validate token with Auth (refreshes if needed)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw mapSupabaseError(userErr);
  if (!userData.user) throw new Error("No autenticado");
  return userData.user;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw mapSupabaseError(error);
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

const PASSWORD_MIN = 8;

export function validatePassword(password, confirm) {
  if (!password || password.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;
  }
  if (confirm != null && password !== confirm) {
    return "Las contraseñas no coinciden";
  }
  return null;
}

/**
 * Completa el alta tras invitación: contraseña + username público.
 * Tras esto la cuenta queda usable (dashboard).
 */
export async function completeInviteSignup({
  username,
  password,
  passwordConfirm,
  displayName,
}) {
  const user = await requireUser();
  const pwErr = validatePassword(password, passwordConfirm);
  if (pwErr) throw new Error(pwErr);

  const { error: authErr } = await supabase.auth.updateUser({ password });
  if (authErr) {
    throw new Error(
      authErr.message || "No se pudo establecer la contraseña"
    );
  }

  const profile = await setUsername(user.id, username, {
    displayName: displayName?.trim() || username,
  });

  // Asegurar invite de plataforma como accepted (por si el trigger no lo hizo)
  if (user.email) {
    await supabase
      .from("platform_invites")
      .update({ status: "accepted" })
      .eq("status", "pending")
      .ilike("email", user.email);
  }

  return profile;
}

/**
 * Rechaza la invitación: borra el usuario de Auth + rastro en platform_invites.
 * Solo válido si aún no completó el alta.
 */
export async function declinePlatformInvite(accessToken) {
  const res = await fetch("/api/decline-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: "{}",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  // Limpiar sesión local (el usuario ya no existe en Auth)
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* ignore */
  }
  return json;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw mapSupabaseError(error);
  return data;
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (error) {
    const code = String(error.code || "");
    const msg = (error.message || "").toLowerCase();
    if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
      throw new Error("Ese username ya está en uso. Prueba otro.");
    }
    if (code === "23514" || msg.includes("check") || msg.includes("username_format")) {
      throw new Error(
        "Username no válido: solo a-z, 0-9 y _ (3–32 caracteres)."
      );
    }
    throw mapSupabaseError(error);
  }
  return data;
}

/** True if username is free (or already owned by excludeUserId). */
export async function isUsernameAvailable(username, excludeUserId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (error) throw mapSupabaseError(error);
  if (!data) return true;
  return data.id === excludeUserId;
}

/**
 * Set public username (+ optional display name) and mark onboarding done.
 */
export async function setUsername(userId, username, { displayName } = {}) {
  const u = normalizeUsername(username);
  const err = validateUsername(u);
  if (err) throw new Error(err);

  const free = await isUsernameAvailable(u, userId);
  if (!free) throw new Error("Ese username ya está en uso. Prueba otro.");

  const patch = {
    username: u,
    username_setup_done: true,
  };
  if (displayName !== undefined) {
    patch.display_name = String(displayName ?? "").trim() || u;
  }

  return updateProfile(userId, patch);
}

export async function listMyProjects() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("project_members")
    .select(
      `
      role,
      project:projects (
        id, name, description, start_date, owner_id, created_at, updated_at
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw mapSupabaseError(error);

  const projects = (data || [])
    .filter((r) => r.project)
    .map((r) => ({ ...r.project, myRole: r.role }));

  if (!projects.length) return projects;

  const ids = projects.map((p) => p.id);

  // Stats de progreso + XP por proyecto (una query)
  const { data: tasks, error: tErr } = await supabase
    .from("tasks")
    .select("project_id, done, xp")
    .in("project_id", ids);
  if (tErr) throw mapSupabaseError(tErr);

  const { data: stones, error: sErr } = await supabase
    .from("stones")
    .select("project_id")
    .in("project_id", ids);
  if (sErr) throw mapSupabaseError(sErr);

  const byId = {};
  for (const id of ids) {
    byId[id] = {
      taskTotal: 0,
      taskDone: 0,
      totalXp: 0,
      earnedXp: 0,
      stoneCount: 0,
    };
  }
  for (const s of stones || []) {
    if (byId[s.project_id]) byId[s.project_id].stoneCount += 1;
  }
  for (const t of tasks || []) {
    const st = byId[t.project_id];
    if (!st) continue;
    const xp = t.xp ?? 0;
    st.taskTotal += 1;
    st.totalXp += xp;
    if (t.done) {
      st.taskDone += 1;
      st.earnedXp += xp;
    }
  }

  return projects.map((p) => {
    const st = byId[p.id] || {
      taskTotal: 0,
      taskDone: 0,
      totalXp: 0,
      earnedXp: 0,
      stoneCount: 0,
    };
    const pct = st.taskTotal
      ? Math.round((st.taskDone / st.taskTotal) * 100)
      : 0;
    return {
      ...p,
      stats: {
        ...st,
        pct,
        level: null, // filled client-side with levelFromXp if needed
      },
    };
  });
}

export async function createProject({ name, description, start_date }) {
  const user = await requireUser();

  // Fail early with a clear message if profile row is missing (FK owner_id → profiles)
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) throw mapSupabaseError(profileErr);
  if (!profile) {
    throw new Error(
      "No existe tu fila en public.profiles. Ejecuta el schema (001) y vuelve a crear el usuario, o inserta el perfil manualmente."
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      description: description || "",
      start_date: start_date || null,
      owner_id: user.id,
    })
    .select()
    .single();
  if (error) throw mapSupabaseError(error);
  return data;
}

export async function getProject(projectId) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (error) throw mapSupabaseError(error);
  return data;
}

export async function updateProject(projectId, fields) {
  const patch = {};
  if (fields.name != null) patch.name = String(fields.name).trim();
  if (fields.description != null) patch.description = String(fields.description);
  if (fields.start_date !== undefined) {
    patch.start_date = fields.start_date || null;
  }
  if (!Object.keys(patch).length) return getProject(projectId);

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .select()
    .maybeSingle();
  if (error) throw mapSupabaseError(error);
  if (!data) throw new Error("No se pudo actualizar el proyecto (¿sin permiso?)");
  return data;
}

export async function deleteProject(projectId) {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw mapSupabaseError(error);
}

export async function listProjectMembers(projectId) {
  const { data, error } = await supabase
    .from("project_members")
    .select(
      `
      role,
      created_at,
      user:profiles ( id, username, display_name, avatar_url )
    `
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw mapSupabaseError(error);
  return (data || []).map((r) => ({
    role: r.role,
    joinedAt: r.created_at,
    ...r.user,
  }));
}

export async function inviteToProject(projectId, username, role = "member") {
  const user = await requireUser();
  const uname = String(username || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!uname) throw new Error("Indica un username");

  if (role === "owner") {
    throw new Error("No se puede invitar como owner; usa transferir propiedad");
  }
  if (!["admin", "member"].includes(role)) {
    throw new Error("Rol de invitación no válido");
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", uname)
    .maybeSingle();
  if (pErr) throw mapSupabaseError(pErr);
  if (!profile) throw new Error(`Usuario @${uname} no encontrado en la plataforma`);
  if (profile.id === user.id) throw new Error("No puedes invitarte a ti mismo");

  const { data: existing } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (existing) throw new Error(`@${uname} ya es miembro del proyecto`);

  const { data, error } = await supabase
    .from("project_invites")
    .insert({
      project_id: projectId,
      invited_user_id: profile.id,
      invited_by: user.id,
      role,
      status: "pending",
    })
    .select()
    .single();
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (error.code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
      throw new Error(`Ya hay una invitación pendiente para @${uname}`);
    }
    throw mapSupabaseError(error);
  }
  return data;
}

export async function transferProjectOwnership(projectId, newOwnerId) {
  const { error } = await supabase.rpc("transfer_project_ownership", {
    p_project_id: projectId,
    p_new_owner_id: newOwnerId,
  });
  if (error) throw mapSupabaseError(error);
}

export async function leaveProject(projectId, newOwnerId = null) {
  const { error } = await supabase.rpc("leave_project", {
    p_project_id: projectId,
    p_new_owner_id: newOwnerId,
  });
  if (error) throw mapSupabaseError(error);
}

export async function setProjectMemberRole(projectId, userId, role) {
  const { error } = await supabase.rpc("set_project_member_role", {
    p_project_id: projectId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw mapSupabaseError(error);
}

export async function removeProjectMember(projectId, userId) {
  const { error } = await supabase.rpc("remove_project_member", {
    p_project_id: projectId,
    p_user_id: userId,
  });
  if (error) throw mapSupabaseError(error);
}

export async function acceptProjectInvite(inviteId) {
  const { error } = await supabase.rpc("accept_project_invite", {
    invite_id: inviteId,
  });
  if (error) throw error;
}

export async function declineProjectInvite(inviteId) {
  const { error } = await supabase.rpc("decline_project_invite", {
    invite_id: inviteId,
  });
  if (error) throw error;
}

export async function listNotifications() {
  await requireUser();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw mapSupabaseError(error);
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Invita a la plataforma por email.
 * @param {string} email
 * @param {string} accessToken
 * @param {{ grantQuota?: number }} [opts] — solo admin puede fijar cupo del invitado (default 3)
 */
export async function invitePlatformUser(email, accessToken, opts = {}) {
  const body = { email };
  if (opts.grantQuota != null) body.grantQuota = opts.grantQuota;
  const res = await fetch("/api/invite-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/**
 * Admin: asigna platform_invites_remaining a un usuario existente (email o username).
 */
export async function setPlatformInviteQuota(
  { email, username, quota },
  accessToken
) {
  const res = await fetch("/api/set-invite-quota", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ email, username, quota }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/** Público: lista de espera */
export async function joinWaitlist(email) {
  const res = await fetch("/api/waitlist-join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export async function listWaitlist(accessToken) {
  const res = await fetch("/api/waitlist-list", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/** Admin: invita a los N más antiguos de la waitlist */
export async function batchInviteWaitlist(
  { count, grantQuota },
  accessToken
) {
  const res = await fetch("/api/waitlist-batch-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ count, grantQuota }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/** Carga proyecto completo: stones + tasks + assignees */
export async function loadProjectBoard(projectId) {
  const [project, members, stonesRes, tasksRes] = await Promise.all([
    getProject(projectId),
    listProjectMembers(projectId),
    supabase
      .from("stones")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("tasks")
      .select("*, task_assignees(user_id)")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
  ]);

  if (stonesRes.error) throw stonesRes.error;
  if (tasksRes.error) throw tasksRes.error;

  // Solo assignees que siguen siendo miembros del proyecto
  const memberIds = new Set((members || []).map((m) => m.id));

  const tasksByStone = {};
  for (const t of tasksRes.data || []) {
    const assignees = (t.task_assignees || [])
      .map((a) => a.user_id)
      .filter((id) => memberIds.has(id));
    const mapped = {
      id: t.id,
      title: t.title,
      notes: t.notes || "",
      xp: t.xp ?? 50,
      done: !!t.done,
      period: t.period || "",
      dateStart: t.date_start || "",
      dateEnd: t.date_end || "",
      img: t.image_path || "",
      imagePath: t.image_path || "",
      assignees,
      sort_order: t.sort_order,
    };
    if (!tasksByStone[t.stone_id]) tasksByStone[t.stone_id] = [];
    tasksByStone[t.stone_id].push(mapped);
  }

  const stones = (stonesRes.data || []).map((s) => ({
    id: s.id,
    number: s.number,
    title: s.title,
    description: s.description || "",
    icon: s.icon || "🪨",
    color: s.color || "#f59e0b",
    time: s.time_label || "",
    period: s.period || "",
    dateStart: s.date_start || "",
    dateEnd: s.date_end || "",
    sort_order: s.sort_order,
    tasks: tasksByStone[s.id] || [],
  }));

  return {
    project,
    members,
    team: members.map((m) => ({
      id: m.id,
      name: m.display_name || m.username,
      username: m.username,
      role: m.role,
      color: colorFromId(m.id),
    })),
    stones,
    meta: {
      start: project.start_date || "",
    },
    title: project.name,
    subtitle: project.description || "",
  };
}

function colorFromId(id) {
  const palette = [
    "#0E9A5B",
    "#0F9BB0",
    "#D99000",
    "#6B4EA8",
    "#EE5B1F",
    "#3b82f6",
    "#ec4899",
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % palette.length;
  return palette[h];
}

export async function createStone(projectId, fields) {
  const { data: existing, error: listErr } = await supabase
    .from("stones")
    .select("number, sort_order")
    .eq("project_id", projectId);
  if (listErr) throw listErr;

  const nextNumber =
    (existing || []).reduce((m, s) => Math.max(m, s.number || 0), 0) + 1;
  const nextSort =
    (existing || []).reduce((m, s) => Math.max(m, s.sort_order ?? 0), -1) + 1;

  const { data, error } = await supabase
    .from("stones")
    .insert({
      project_id: projectId,
      number: nextNumber,
      title: fields.title || "Nueva piedra",
      description: fields.description || "",
      icon: fields.icon || "🪨",
      color: fields.color || "#f59e0b",
      time_label: fields.time || "",
      period: fields.period || "",
      date_start: fields.dateStart || null,
      date_end: fields.dateEnd || null,
      sort_order: nextSort,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStoneDb(stoneId, fields) {
  const patch = {};
  if (fields.title != null) patch.title = fields.title;
  if (fields.description != null) patch.description = fields.description;
  if (fields.icon != null) patch.icon = fields.icon;
  if (fields.color != null) patch.color = fields.color;
  if (fields.time != null) patch.time_label = fields.time;
  if (fields.period != null) patch.period = fields.period;
  if (fields.dateStart != null) patch.date_start = fields.dateStart || null;
  if (fields.dateEnd != null) patch.date_end = fields.dateEnd || null;
  if (fields.sort_order != null) patch.sort_order = fields.sort_order;

  const { data, error } = await supabase
    .from("stones")
    .update(patch)
    .eq("id", stoneId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStoneDb(stoneId) {
  // tasks cascade via FK on stone_id
  const { error } = await supabase.from("stones").delete().eq("id", stoneId);
  if (error) throw error;
}

export async function createTaskDb(projectId, stoneId, fields) {
  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("stone_id", stoneId);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      stone_id: stoneId,
      title: fields.title || "Nueva tarea",
      notes: fields.notes || "",
      xp: fields.xp ?? 50,
      done: !!fields.done,
      period: fields.period || "",
      date_start: fields.dateStart || null,
      date_end: fields.dateEnd || null,
      image_path: fields.img || fields.imagePath || null,
      sort_order: count || 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaskDb(taskId, fields) {
  const patch = {};
  if (fields.title != null) patch.title = fields.title;
  if (fields.notes != null) patch.notes = fields.notes;
  if (fields.xp != null) patch.xp = fields.xp;
  if (fields.done != null) patch.done = fields.done;
  if (fields.period != null) patch.period = fields.period;
  if (fields.dateStart != null) patch.date_start = fields.dateStart || null;
  if (fields.dateEnd != null) patch.date_end = fields.dateEnd || null;
  // Permitir borrar imagen: img: null | "" → image_path = null
  if (fields.img !== undefined) patch.image_path = fields.img || null;
  if (fields.imagePath !== undefined) patch.image_path = fields.imagePath || null;
  if (fields.stoneId != null) patch.stone_id = fields.stoneId;
  if (fields.sort_order != null) patch.sort_order = fields.sort_order;

  // Solo columnas de tasks: si solo cambian assignees, un UPDATE {} + .single()
  // devuelve 406 (Not Acceptable) en PostgREST.
  let data = null;
  if (Object.keys(patch).length > 0) {
    const { data: row, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", taskId)
      .select()
      .maybeSingle();
    if (error) throw error;
    data = row;
  }

  if (Array.isArray(fields.assignees)) {
    const { error: delErr } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId);
    if (delErr) throw delErr;

    const userIds = [
      ...new Set(
        fields.assignees
          .map((id) => (id == null ? null : String(id)))
          .filter(Boolean)
      ),
    ];
    if (userIds.length) {
      const rows = userIds.map((user_id) => ({ task_id: taskId, user_id }));
      const { error: aErr } = await supabase.from("task_assignees").insert(rows);
      if (aErr) throw aErr;
    }
  }
  return data;
}

export async function deleteTaskDb(taskId) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function uploadProjectImage(projectId, file) {
  const ext = file.name.split(".").pop() || "png";
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("project-assets")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return { path, url: publicAssetUrl(path) };
}

export async function listProjectImages(projectId) {
  const { data, error } = await supabase.storage
    .from("project-assets")
    .list(projectId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;
  return (data || [])
    .filter((f) => f.name && !f.name.endsWith("/"))
    .map((f) => {
      const path = `${projectId}/${f.name}`;
      return { name: f.name, path, url: publicAssetUrl(path) };
    });
}

export { publicAssetUrl };
