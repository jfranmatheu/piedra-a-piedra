-- Piedra a Piedra — Al salir / expulsar de un proyecto, quitar asignaciones de tareas
-- Ejecutar en Supabase SQL Editor.
--
-- Problema: project_members se borra pero task_assignees conserva user_id →
-- iconos fantasma y UUID en la UI.
--
-- Solución: trigger AFTER DELETE en project_members + limpieza de huérfanos.

-- ── Helper: borrar assignees de un usuario en las tareas de un proyecto ─────
create or replace function public.purge_user_task_assignees(
  p_project_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.task_assignees ta
  using public.tasks t
  where ta.task_id = t.id
    and t.project_id = p_project_id
    and ta.user_id = p_user_id;
end;
$$;

revoke all on function public.purge_user_task_assignees(uuid, uuid) from public;
grant execute on function public.purge_user_task_assignees(uuid, uuid) to authenticated;

-- ── Trigger: cualquier baja de miembro limpia assignees ───────────────────
create or replace function public.on_project_member_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.purge_user_task_assignees(old.project_id, old.user_id);
  return old;
end;
$$;

drop trigger if exists on_project_member_deleted on public.project_members;
create trigger on_project_member_deleted
  after delete on public.project_members
  for each row execute function public.on_project_member_deleted();

-- ── Limpieza one-shot de filas huérfanas ya existentes ─────────────────────
-- Asignaciones cuyo user ya no es miembro del proyecto de esa tarea
delete from public.task_assignees ta
using public.tasks t
where ta.task_id = t.id
  and not exists (
    select 1
    from public.project_members m
    where m.project_id = t.project_id
      and m.user_id = ta.user_id
  );

-- (Opcional) asegurar que leave_project / remove_project_member existen y
-- siguen borrando de project_members (el trigger hace el resto).
-- Si esas RPC no están en tu proyecto, re-aplica el script de gestión de
-- proyectos o usa solo DELETE en project_members (dispara el trigger).
