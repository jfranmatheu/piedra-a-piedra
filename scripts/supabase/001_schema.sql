-- Piedra a Piedra — Schema
-- Ejecutar en Supabase SQL Editor (en orden 001 → 004)
-- o: supabase db push / psql -f ...

create extension if not exists "pgcrypto";

-- ── Profiles (1:1 con auth.users) ───────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  email text,
  display_name text,
  avatar_url text,
  is_platform_admin boolean not null default false,
  -- false hasta que el usuario elige username en onboarding (ver 006)
  username_setup_done boolean not null default false,
  -- invitaciones a la plataforma que aún puede enviar (admin = ilimitado en API)
  platform_invites_remaining integer not null default 0
    check (platform_invites_remaining >= 0),
  created_at timestamptz not null default now(),
  constraint profiles_username_key unique (username),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,32}$')
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_email_idx on public.profiles (email);

-- ── Invitaciones a la plataforma (solo admin) ───────────────────────────────
create table if not exists public.platform_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  -- cupo de invitaciones que recibirá el invitado al crear su cuenta
  grants_quota integer not null default 3
    check (grants_quota >= 0 and grants_quota <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists platform_invites_email_idx on public.platform_invites (lower(email));

-- ── Proyectos ───────────────────────────────────────────────────────────────
create type public.project_role as enum ('owner', 'admin', 'member');

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  start_date date,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects (owner_id);

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.project_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_idx on public.project_members (user_id);

-- Invitaciones a proyecto (por usuario existente en la plataforma)
create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  invited_user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  role public.project_role not null default 'member',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create unique index if not exists project_invites_pending_unique
  on public.project_invites (project_id, invited_user_id)
  where status = 'pending';

-- ── Notificaciones ──────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- ── Piedras (milestones) ────────────────────────────────────────────────────
create table if not exists public.stones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  number int not null default 1,
  title text not null,
  description text not null default '',
  icon text not null default '🪨',
  color text not null default '#f59e0b',
  time_label text not null default '',
  period text not null default '',
  date_start date,
  date_end date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stones_project_idx on public.stones (project_id, sort_order);

-- ── Tareas ──────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stone_id uuid not null references public.stones (id) on delete cascade,
  title text not null,
  notes text not null default '',
  xp int not null default 50,
  done boolean not null default false,
  period text not null default '',
  date_start date,
  date_end date,
  image_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_stone_idx on public.tasks (stone_id, sort_order);
create index if not exists tasks_project_idx on public.tasks (project_id);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (task_id, user_id)
);

-- ── Helpers ─────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Profile al crear usuario en Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  n int := 0;
  v_quota int := 0;
begin
  base_username := lower(regexp_replace(
    split_part(coalesce(new.email, new.id::text), '@', 1),
    '[^a-z0-9_]', '', 'g'
  ));
  if length(base_username) < 3 then
    base_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  if base_username in ('admin', 'root', 'system', 'support', 'moderator', 'api')
     or base_username ~ '^(admin|root|system|mod|staff)' then
    base_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  base_username := left(base_username, 28);
  final_username := base_username;

  while exists (select 1 from public.profiles p where p.username = final_username) loop
    n := n + 1;
    final_username := base_username || n::text;
  end loop;

  select pi.grants_quota into v_quota
  from public.platform_invites pi
  where lower(pi.email) = lower(new.email)
    and pi.status = 'pending'
  order by pi.created_at desc
  limit 1;
  if v_quota is null then
    v_quota := 0;
  end if;

  insert into public.profiles (
    id, username, email, display_name,
    username_setup_done, platform_invites_remaining
  )
  values (
    new.id,
    final_username,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', final_username),
    false,
    v_quota
  );

  update public.platform_invites
  set status = 'accepted'
  where lower(email) = lower(new.email)
    and status = 'pending';

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Al crear proyecto, el owner entra como member role owner
create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- Notificación al invitar a proyecto
create or replace function public.handle_project_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pname text;
  inviter text;
begin
  if new.status <> 'pending' then
    return new;
  end if;
  select name into pname from public.projects where id = new.project_id;
  select username into inviter from public.profiles where id = new.invited_by;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.invited_user_id,
    'project_invite',
    'Invitación a proyecto',
    coalesce(inviter, 'Alguien') || ' te ha invitado a «' || coalesce(pname, 'proyecto') || '»',
    jsonb_build_object(
      'project_id', new.project_id,
      'invite_id', new.id,
      'invited_by', new.invited_by
    )
  );
  return new;
end;
$$;

drop trigger if exists on_project_invite on public.project_invites;
create trigger on_project_invite
  after insert on public.project_invites
  for each row execute function public.handle_project_invite();

-- Aceptar invitación a proyecto
create or replace function public.accept_project_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.project_invites%rowtype;
begin
  select * into inv from public.project_invites where id = invite_id for update;
  if not found then
    raise exception 'Invitación no encontrada';
  end if;
  if inv.invited_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;
  if inv.status <> 'pending' then
    raise exception 'Invitación no pendiente';
  end if;

  update public.project_invites set status = 'accepted' where id = invite_id;

  insert into public.project_members (project_id, user_id, role)
  values (inv.project_id, inv.invited_user_id, inv.role)
  on conflict (project_id, user_id) do update set role = excluded.role;

  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and type = 'project_invite'
    and data->>'invite_id' = invite_id::text
    and read_at is null;
end;
$$;

create or replace function public.decline_project_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.project_invites%rowtype;
begin
  select * into inv from public.project_invites where id = invite_id for update;
  if not found or inv.invited_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;
  update public.project_invites set status = 'declined' where id = invite_id;
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and data->>'invite_id' = invite_id::text
    and read_at is null;
end;
$$;
