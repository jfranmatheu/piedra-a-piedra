import { supabase, publicAssetUrl } from "./supabase";

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
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

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listMyProjects() {
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
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || [])
    .filter((r) => r.project)
    .map((r) => ({ ...r.project, myRole: r.role }));
}

export async function createProject({ name, description, start_date }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

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
  if (error) throw error;
  return data;
}

export async function getProject(projectId) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (error) throw error;
  return data;
}

export async function listProjectMembers(projectId) {
  const { data, error } = await supabase
    .from("project_members")
    .select(
      `
      role,
      user:profiles ( id, username, display_name, email, avatar_url )
    `
    )
    .eq("project_id", projectId);
  if (error) throw error;
  return (data || []).map((r) => ({
    role: r.role,
    ...r.user,
  }));
}

export async function inviteToProject(projectId, username, role = "member") {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (pErr) throw pErr;
  if (!profile) throw new Error(`Usuario @${username} no encontrado`);
  if (profile.id === user?.id) throw new Error("No puedes invitarte a ti mismo");

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
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function invitePlatformUser(email, accessToken) {
  const res = await fetch("/api/invite-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ email }),
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

  const tasksByStone = {};
  for (const t of tasksRes.data || []) {
    const assignees = (t.task_assignees || []).map((a) => a.user_id);
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
  const { count } = await supabase
    .from("stones")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data, error } = await supabase
    .from("stones")
    .insert({
      project_id: projectId,
      number: (count || 0) + 1,
      title: fields.title || "Nueva piedra",
      description: fields.description || "",
      icon: fields.icon || "🪨",
      color: fields.color || "#f59e0b",
      time_label: fields.time || "",
      period: fields.period || "",
      date_start: fields.dateStart || null,
      date_end: fields.dateEnd || null,
      sort_order: count || 0,
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
  if (fields.img != null) patch.image_path = fields.img || null;
  if (fields.imagePath != null) patch.image_path = fields.imagePath || null;
  if (fields.stoneId != null) patch.stone_id = fields.stoneId;
  if (fields.sort_order != null) patch.sort_order = fields.sort_order;

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;

  if (Array.isArray(fields.assignees)) {
    await supabase.from("task_assignees").delete().eq("task_id", taskId);
    if (fields.assignees.length) {
      const rows = fields.assignees.map((user_id) => ({ task_id: taskId, user_id }));
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
