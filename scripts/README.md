# Scripts Supabase — Piedra a Piedra

Ejecutar en **Supabase → SQL Editor** (o `apply-supabase.ps1` si tienes `SUPABASE_DB_URL`).

## Orden recomendado (proyecto nuevo)

| # | Archivo | Qué hace |
|---|---------|----------|
| 1 | `001_schema.sql` | Tablas, triggers (perfil al crear user, owner al crear proyecto) |
| 2 | `002_rls.sql` | Row Level Security + grants |
| 3 | `003_storage.sql` | Bucket `project-assets` |
| 4 | **Auth: crear admin** | Dashboard → Users → Add user (**email + password**) |
| 5 | `004_setup_admin.sql` | Marca `is_platform_admin`, username, `username_setup_done` |

## Setup del admin (email + contraseña)

El admin **no** usa el flujo `/join` de invitados.

1. **Authentication → Users → Add user**
   - Email del admin  
   - **Password** (la del login en la app)  
   - Auto Confirm User = on  
2. Ejecuta el `UPDATE` de `004_setup_admin.sql` (email, username, `is_platform_admin`, `username_setup_done = true`).
3. App → `/login` con ese email y esa password.

Detalle paso a paso: raíz del repo → **DEPLOY.md** sección **2.1**.

## Variables de entorno

| Variable | Origen | Uso |
|----------|--------|-----|
| `VITE_SUPABASE_URL` | Project URL | Cliente |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Cliente |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | Solo server (`/api/invite-user`, `/api/decline-invite`) |
| `APP_URL` | URL de la app | Redirect de invitaciones → `/join` |
