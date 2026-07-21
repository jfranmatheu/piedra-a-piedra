-- Piedra a Piedra — Storage buckets + policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {project_id}/{filename}

drop policy if exists project_assets_select on storage.objects;
create policy project_assets_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-assets'
    and public.is_project_member((storage.foldername(name))[1]::uuid)
  );

-- Public read if bucket is public (anon can read via public URL)
drop policy if exists project_assets_public_read on storage.objects;
create policy project_assets_public_read on storage.objects
  for select to anon
  using (bucket_id = 'project-assets');

drop policy if exists project_assets_insert on storage.objects;
create policy project_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-assets'
    and public.is_project_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists project_assets_update on storage.objects;
create policy project_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-assets'
    and public.is_project_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists project_assets_delete on storage.objects;
create policy project_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-assets'
    and public.is_project_member((storage.foldername(name))[1]::uuid)
  );
