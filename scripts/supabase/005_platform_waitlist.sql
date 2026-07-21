-- Piedra a Piedra — Lista de espera para invitaciones a la plataforma
-- Ejecutar en SQL Editor (después de 008).

create table if not exists public.platform_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'invited', 'revoked')),
  note text not null default '',
  created_at timestamptz not null default now(),
  invited_at timestamptz,
  invited_by uuid references public.profiles (id) on delete set null
);

create unique index if not exists platform_waitlist_email_pending_uidx
  on public.platform_waitlist (lower(email))
  where status = 'pending';

create index if not exists platform_waitlist_pending_created_idx
  on public.platform_waitlist (created_at asc)
  where status = 'pending';

alter table public.platform_waitlist enable row level security;

-- Solo platform admin lee/gestiona (altas públicas vía API con secret key)
drop policy if exists waitlist_admin_select on public.platform_waitlist;
create policy waitlist_admin_select on public.platform_waitlist
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists waitlist_admin_all on public.platform_waitlist;
create policy waitlist_admin_all on public.platform_waitlist
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant select, insert, update, delete on public.platform_waitlist to authenticated;
-- service_role / secret key bypass RLS for public join + batch
