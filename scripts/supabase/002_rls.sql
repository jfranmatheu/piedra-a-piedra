-- Piedra a Piedra — Row Level Security

-- Helpers
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_project_member(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = pid and m.user_id = auth.uid()
  );
$$;

create or replace function public.project_role(pid uuid)
returns public.project_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.project_members m
  where m.project_id = pid and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_manage_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = pid
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.platform_invites enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.notifications enable row level security;
alter table public.stones enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;

-- PROFILES
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true); -- usernames visibles para invitar

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- PLATFORM INVITES (solo platform admin)
drop policy if exists platform_invites_admin_all on public.platform_invites;
create policy platform_invites_admin_all on public.platform_invites
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- PROJECTS
drop policy if exists projects_select_member on public.projects;
create policy projects_select_member on public.projects
  for select to authenticated
  using (public.is_project_member(id));

drop policy if exists projects_insert_auth on public.projects;
create policy projects_insert_auth on public.projects
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists projects_update_manage on public.projects;
create policy projects_update_manage on public.projects
  for update to authenticated
  using (public.can_manage_project(id))
  with check (public.can_manage_project(id));

drop policy if exists projects_delete_owner on public.projects;
create policy projects_delete_owner on public.projects
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_platform_admin());

-- PROJECT MEMBERS
drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists project_members_insert on public.project_members;
create policy project_members_insert on public.project_members
  for insert to authenticated
  with check (
    public.can_manage_project(project_id)
    or (user_id = auth.uid() and role = 'owner') -- bootstrap via trigger/security definer
  );

drop policy if exists project_members_update on public.project_members;
create policy project_members_update on public.project_members
  for update to authenticated
  using (public.can_manage_project(project_id));

drop policy if exists project_members_delete on public.project_members;
create policy project_members_delete on public.project_members
  for delete to authenticated
  using (
    public.can_manage_project(project_id)
    or user_id = auth.uid()
  );

-- PROJECT INVITES
drop policy if exists project_invites_select on public.project_invites;
create policy project_invites_select on public.project_invites
  for select to authenticated
  using (
    invited_user_id = auth.uid()
    or public.can_manage_project(project_id)
  );

drop policy if exists project_invites_insert on public.project_invites;
create policy project_invites_insert on public.project_invites
  for insert to authenticated
  with check (
    public.can_manage_project(project_id)
    and invited_by = auth.uid()
  );

drop policy if exists project_invites_update on public.project_invites;
create policy project_invites_update on public.project_invites
  for update to authenticated
  using (
    invited_user_id = auth.uid()
    or public.can_manage_project(project_id)
  );

-- NOTIFICATIONS
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- STONES
drop policy if exists stones_select on public.stones;
create policy stones_select on public.stones
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists stones_write on public.stones;
create policy stones_write on public.stones
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- TASKS
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists tasks_write on public.tasks;
create policy tasks_write on public.tasks
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- TASK ASSIGNEES
drop policy if exists task_assignees_select on public.task_assignees;
create policy task_assignees_select on public.task_assignees
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_project_member(t.project_id)
    )
  );

drop policy if exists task_assignees_write on public.task_assignees;
create policy task_assignees_write on public.task_assignees
  for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_project_member(t.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_project_member(t.project_id)
    )
  );

-- Grants
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.accept_project_invite(uuid) to authenticated;
grant execute on function public.decline_project_invite(uuid) to authenticated;
