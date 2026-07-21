# Deploy — Piedra a Piedra (Supabase + Vercel/Netlify)

Guía para **fork → Supabase → Vercel o Netlify** (plan free).

## 1. Fork del repositorio

Haz fork en GitHub/GitLab y clona tu copia.

## 2. Proyecto Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (free tier).
2. **SQL Editor** → ejecuta en orden (schema base):
   - `scripts/supabase/001_schema.sql`
   - `scripts/supabase/002_rls.sql`
   - `scripts/supabase/003_storage.sql`
3. **Authentication → Providers → Email**
   - Enable Email
   - **Disable “Enable sign ups”** (solo invitación; el admin se crea a mano en §2.1)
4. **Authentication → URL Configuration**
   - Site URL = URL de tu app (la de Vercel cuando la tengas)
   - Redirect URLs: `https://tu-app.vercel.app/**` (cubre `/login` y `/join`)
5. **Crea el admin completo** (email **y** contraseña) — §2.1 abajo.
6. Copia de **Project Settings → [API Keys](https://supabase.com/dashboard/project/_/settings/api-keys/)**:
   - Project URL → `VITE_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_…`) → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** (`sb_secret_…`) → `SUPABASE_SECRET_KEY` (**solo server**)

### 2.1 Setup del admin al completo (email + contraseña + flag)

El admin **no** se invita por email. Se crea en el dashboard de Auth con contraseña y luego se marca en SQL.  
Guión comentado también en `scripts/supabase/004_setup_admin.sql`.

#### A) Crear el usuario en Authentication (aquí se define la contraseña)

1. Supabase → **Authentication → Users**
2. **Add user** → **Create new user**
3. Campos:
   - **Email** — el del admin (ej. `tu@email.com`)
   - **Password** — contraseña fuerte (≥ 8 caracteres). **Esta es la que usarás en `/login`.**
4. Marca **Auto Confirm User** (si aparece), para entrar sin confirmar el correo.
5. **Create user**

El trigger `handle_new_user` crea una fila en `public.profiles`.  
Si creaste el usuario *antes* del schema, no habrá perfil: borra el user y créalo **después** de `001_schema.sql`, o inserta el perfil (ver `004_setup_admin.sql`).

#### B) Marcar platform admin + username (SQL Editor)

Sustituye email y username y ejecuta:

```sql
update public.profiles
set
  is_platform_admin = true,
  username = 'tu_username',          -- solo a-z, 0-9, _ (3–32); evita el nombre "admin" solo
  display_name = 'Admin',
  username_setup_done = true         -- no te mande al flujo /join de invitados
where lower(email) = lower('tu@email.com');
```

Comprueba:

```sql
select email, username, is_platform_admin, username_setup_done
from public.profiles
where is_platform_admin = true;
```

#### C) Iniciar sesión en la app

1. Abre `https://tu-app.vercel.app/login` (o local `http://localhost:5173/login`)
2. **Email** = el del paso A  
3. **Password** = la del paso A (la de “Create new user” en Auth)  
4. **Entrar** → hub de proyectos + badge **admin**
5. Desde ahí invitas al resto (ellos sí usan el mail de invitación → `/join`)

#### Si el admin no puede entrar

| Síntoma | Qué mirar |
|---------|-----------|
| Invalid login credentials | Email/password del paso A; en Users el usuario existe y está **Confirmed** |
| Te manda a `/join` | Ejecuta de nuevo el `UPDATE` con `username_setup_done = true` |
| Sin badge admin / no puedes invitar | `is_platform_admin` no es `true` en `profiles` |
| Env incorrecto | `VITE_SUPABASE_URL` del **mismo** proyecto donde creaste el user |

#### Cambiar la contraseña del admin más adelante

**Authentication → Users** → el usuario → reset / editar password.  
(La app no tiene aún pantalla “cambiar contraseña”.)

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

### Si el enlace de invitación manda a `vercel.com/login`

Eso **no es** login de Piedra a Piedra ni de Supabase. Es **Deployment Protection** de Vercel (SSO): el deploy exige cuenta de Vercel.

Síntomas típicos en la URL final:

- `https://vercel.com/login?next=...sso-api...`
- a veces también `error_code=otp_expired` (token de invite caducado o ya usado)

**Causa 1 — URL de preview / equipo protegida**

Ejemplo problemático:  
`https://piedra-a-piedra-….vercel.app` o `…-jfmatheugs-projects.vercel.app`

1. Vercel → tu proyecto → **Settings → Deployment Protection**
2. Para **Production**: desactiva **Vercel Authentication** (la app debe ser pública; el login lo hace Supabase).
3. Preview puede seguir protegido si quieres; **no uses URLs de preview en las invitaciones**.

**Causa 2 — `APP_URL` incorrecta en Vercel**

1. Vercel → **Settings → Environment Variables → Production**
2. `APP_URL` = dominio **público de Production**, sin `/` final, por ejemplo:
   - `https://piedra-a-piedra.vercel.app`  
   - o tu dominio custom  
   **No** uses la URL de un deployment concreto ni la de `…-projects.vercel.app` si está protegida.
3. Redeploy después de cambiar `APP_URL`.

**Causa 3 — Redirect URLs en Supabase**

Supabase → **Authentication → URL Configuration**:

| Campo | Valor |
|--------|--------|
| **Site URL** | `https://tu-dominio-publico.vercel.app` (mismo que `APP_URL`) |
| **Redirect URLs** | `https://tu-dominio-publico.vercel.app/**`  
| | y/o `https://tu-dominio-publico.vercel.app/join` |

El mail de invite debe llevar  
`redirect_to=https://tu-dominio-publico.vercel.app/join`  
(no solo `/` y no una URL de Vercel login).

**Causa 4 — Token caducado (`otp_expired`)**

Los enlaces de invite son de un solo uso y caducan. Vuelve a invitar desde la app y abre el **correo nuevo** en una ventana de incógnito (sin sesión de Vercel).

**Checklist rápido**

1. Production **sin** Vercel Authentication.  
2. `APP_URL` = dominio público Production.  
3. Supabase Site URL + Redirect URLs alineados con `APP_URL` + `/join`.  
4. Nueva invitación → abrir en incógnito → debe cargar **tu app** en `/join`, no vercel.com.

### Si `POST /api/invite-user` devuelve 500

1. Vercel → **Settings → Environment Variables**: debe existir `SUPABASE_SECRET_KEY` (`sb_secret_…`) en **Production**.
2. `APP_URL` = dominio público de Production (ver arriba).
3. Supabase Redirect URLs incluyen `…/join`.
4. Tu usuario con `is_platform_admin = true` (`004_setup_admin.sql`).
5. Redeploy; revisa Runtime Logs de la función.

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

1. **Admin** inicia sesión en `/login` con el **email + contraseña** definidos en Authentication → Users (sección 2.1). No usa el enlace de invitación.
2. Admin → **Invitar a la plataforma** (solo email del invitado).
3. El **invitado** abre el mail → `/join` → elige **@username + contraseña** (o rechaza y se borra de Auth) → dashboard.
4. Cualquier usuario **crea proyectos**.
5. Owner/admin de proyecto **invita por @username** (email privado).
6. El invitado de proyecto acepta la notificación → entra al proyecto.
7. Username editable en **Perfil** del hub.
8. Kanban / Timeline / Panel; assets en `project-assets`.

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
