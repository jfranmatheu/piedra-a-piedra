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

6. Copia de **Project Settings → [API Keys](https://supabase.com/dashboard/project/_/settings/api-keys/)**  
   (claves nuevas, no las JWT legacy):
   - Project URL → `VITE_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_…`) → `VITE_SUPABASE_PUBLISHABLE_KEY` (cliente)
   - **Secret key** (`sb_secret_…`) → `SUPABASE_SECRET_KEY` (**solo server**, nunca `VITE_*`)

   Docs: https://supabase.com/docs/guides/getting-started/api-keys

## 3. Deploy en Vercel

1. Importa el repo en Vercel.
2. **Root Directory:** vacío (raíz del repo), no `web`.
3. Framework: **Vite** u **Other**.
4. Comandos (también en `vercel.json`):
   - Install: `cd web && npm install`
   - Build: `cd web && npm run build`
   - Output: `dist`
5. **Environment Variables** (Settings → Environment Variables).  
   Marca **Production** (y Preview si quieres).  
   Los nombres deben llevar el prefijo `VITE_` para el cliente:

| Name | Value | Scope |
|------|--------|--------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Production (+ Preview) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Production |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` (**sin** `VITE_`) | Production |
| `APP_URL` | `https://tu-app.vercel.app` | Production |

6. **Redeploy obligatorio** después de crear/cambiar env vars:  
   Deployments → ⋮ en el último deploy → **Redeploy**  
   (Vite embebe `VITE_*` en el build; si no redespliegas, el JS sigue vacío.)

7. La función `api/invite-user.js` invita usuarios por email (solo platform admin).  
   El `installCommand` de Vercel instala dependencias de **raíz** (`@supabase/supabase-js` para la API) y de `web/`.

### Si `POST /api/invite-user` devuelve 500

1. Vercel → **Settings → Environment Variables**: debe existir `SUPABASE_SECRET_KEY` (`sb_secret_…`) en **Production** (no solo en el build del front).
2. `APP_URL` = URL real de la app (`https://piedra-a-piedra.vercel.app`, sin barra final).
3. Supabase → **Authentication → URL Configuration**:
   - Site URL = tu `APP_URL`
   - Redirect URLs incluye `https://tu-app.vercel.app/**` y en particular `…/join` (alta por invitación)
4. Tu usuario debe tener `is_platform_admin = true` en `profiles` (script `004_setup_admin.sql`).
5. Redeploy con el código nuevo (raíz con `package.json` + `@supabase/supabase-js`).
6. Logs: Vercel → Deployments → función → **Logs** / Runtime Logs; el body JSON del 500 ahora incluye el motivo.

### Si ves “Faltan VITE_SUPABASE_…”

1. Comprueba que las variables existen en **Production** (no solo Development).
2. Nombres exactos: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Redeploy con el código más reciente del repo.
4. Hard refresh del navegador (Ctrl+F5).

## 4. Deploy en Netlify

1. Importa el repo; usa `netlify.toml`.
2. Mismas env vars que arriba.
3. Para invitaciones por email en Netlify, copia la lógica de `web/api/invite-user.js` a `netlify/functions/invite-user.js` (o usa solo invitaciones de proyecto por username y crea usuarios en el dashboard).

## 5. Flujo de uso

1. Admin inicia sesión.
2. **Invitar a la plataforma** (email) → el usuario recibe el mail de Supabase y define contraseña.
3. El invitado abre el enlace del email → `/join`: elige **@username** + **contraseña** (o rechaza y se borra de Auth). Luego entra al dashboard.
4. Cualquier usuario **crea proyectos**.
5. Owner/admin del proyecto **invita por @username** (el email sigue privado).
6. El invitado ve la notificación y acepta → entra al proyecto.
7. Username editable en cualquier momento desde **Perfil** en el hub de proyectos.
8. Kanban / Timeline / Panel por proyecto; assets en bucket `project-assets`.

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

- Usa **publishable** en el cliente y **secret** solo en el servidor (función invite).
- Nunca expongas `SUPABASE_SECRET_KEY` / `service_role` con prefijo `VITE_*`.
- Sign-up público desactivado.
- RLS: solo miembros del proyecto ven/editan sus piedras y tareas.

Las claves JWT legacy (`anon` / `service_role`) siguen funcionando en paralelo hasta que las desactives en el dashboard; el código acepta fallback legacy si hace falta.
