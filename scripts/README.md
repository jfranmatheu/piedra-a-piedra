# Scripts — Supabase setup

Configura la base de datos y el storage de Supabase para **Piedra a Piedra**.

## Orden de ejecución

En el [SQL Editor](https://supabase.com/dashboard) de tu proyecto, ejecuta en orden:

1. `supabase/001_schema.sql`
2. `supabase/002_rls.sql`
3. `supabase/003_storage.sql`
4. `supabase/004_setup_admin.sql` (tras crear el usuario admin en Auth)

## CLI (opcional)

```bash
# Con Supabase CLI instalada y proyecto linkeado
supabase db execute -f scripts/supabase/001_schema.sql
supabase db execute -f scripts/supabase/002_rls.sql
supabase db execute -f scripts/supabase/003_storage.sql
```

O desde la raíz del repo (PowerShell):

```powershell
.\scripts\apply-supabase.ps1
```

(requiere `SUPABASE_DB_URL` o pegar SQL manualmente)

## Auth (importante)

En Supabase → **Authentication → Providers → Email**:

- ✅ Enable Email provider  
- ❌ **Disable** “Enable sign ups” (solo invitación)  
- Opcional: confirmar email

## Crear admin

1. Authentication → Users → **Add user** → email + contraseña fuerte  
2. Ejecuta el `UPDATE` de `004_setup_admin.sql` con ese email  
3. El admin inicia sesión en la app e invita usuarios por email (vía función serverless)

## Variables de entorno

Ver `.env.example` en la raíz y en `web/`.

| Variable | Tipo de key | Dónde |
|----------|-------------|--------|
| `VITE_SUPABASE_URL` | Project URL | Cliente |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Cliente |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | Solo server (`/api/invite-user`) |

Docs: https://supabase.com/docs/guides/getting-started/api-keys
