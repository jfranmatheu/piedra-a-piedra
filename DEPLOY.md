# Deploy — Piedra a Piedra (Supabase + Vercel/Netlify)

Guía para **fork → Supabase → Vercel o Netlify** (plan free).

## 1. Fork del repositorio

Haz fork en GitHub/GitLab y clona tu copia.

## 2. Proyecto Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (free tier).
2. **SQL Editor** → ejecuta en orden:
   - `scripts/supabase/001_schema.sql`
   - `scripts/supabase/002_rls.sql`
   - `scripts/supabase/003_storage.sql`
3. **Authentication → Providers → Email**
   - Enable Email
   - **Disable “Enable sign ups”** (solo invitación)
4. **Authentication → Users → Add user**
   - Email + contraseña fuerte (admin)
5. SQL Editor → marca admin (ver `scripts/supabase/004_setup_admin.sql`):

```sql
update public.profiles
set is_platform_admin = true
where lower(email) = lower('TU_ADMIN@email.com');
```

6. Copia de **Project Settings → API**:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` → `VITE_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**solo server**, nunca en el cliente)

## 3. Deploy en Vercel

1. Importa el repo en Vercel.
2. Framework: Vite / Other.  
   - Build: `cd web && npm install && npm run build`  
   - Output: `dist` (o usa `vercel.json` del repo)
3. Environment variables:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role |
| `APP_URL` | `https://tu-app.vercel.app` |

4. La función `web/api/invite-user.js` invita usuarios por email (solo platform admin).

## 4. Deploy en Netlify

1. Importa el repo; usa `netlify.toml`.
2. Mismas env vars que arriba.
3. Para invitaciones por email en Netlify, copia la lógica de `web/api/invite-user.js` a `netlify/functions/invite-user.js` (o usa solo invitaciones de proyecto por username y crea usuarios en el dashboard).

## 5. Flujo de uso

1. Admin inicia sesión.
2. **Invitar a la plataforma** (email) → el usuario recibe el mail de Supabase y define contraseña.
3. Cualquier usuario **crea proyectos**.
4. Owner/admin del proyecto **invita por @username**.
5. El invitado ve la notificación y acepta → entra al proyecto.
6. Kanban / Timeline / Panel por proyecto; assets en bucket `project-assets`.

## 6. Desarrollo local

```bash
cd web
cp .env.example .env.local
# rellena VITE_SUPABASE_*
npm install
npm run dev
```

Para probar `/api/invite-user` en local, usa `vercel dev` desde la raíz o un proxy a la función.

## Seguridad

- Nunca expongas `service_role` en variables `VITE_*`.
- Sign-up público desactivado.
- RLS: solo miembros del proyecto ven/editan sus piedras y tareas.
