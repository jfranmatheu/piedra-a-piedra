# Deploy — Piedra a Piedra (Supabase + Vercel/Netlify)

**[Español →](../es/DEPLOY.md)** · **[README (EN)](./README.md)** · **[Docs index](../README.md)**

Guide for **fork → Supabase → Vercel or Netlify** (free tier).

## 1. Fork the repository

Fork on GitHub/GitLab and clone your copy.

## 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. **SQL Editor** → run in order (base schema):
   - `scripts/supabase/001_schema.sql`
   - `scripts/supabase/002_rls.sql`
   - `scripts/supabase/003_storage.sql`
3. **Authentication → Providers → Email**
   - Enable Email
   - **Disable “Enable sign ups”** (invite-only; admin is created manually in §2.1)
4. **Authentication → URL Configuration**
   - Site URL = your app URL (Vercel URL when you have it)
   - Redirect URLs: `https://your-app.vercel.app/**` (covers `/login` and `/join`)
5. **Create the full admin** (email **and** password) — §2.1 below.
6. From **Project Settings → [API Keys](https://supabase.com/dashboard/project/_/settings/api-keys/)** copy:
   - Project URL → `VITE_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_…`) → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** (`sb_secret_…`) → `SUPABASE_SECRET_KEY` (**server only**)

### 2.1 Full admin setup (email + password + flag)

The admin is **not** invited by email. Create them in the Auth dashboard with a password, then flag them in SQL.  
Commented script also in `scripts/supabase/004_setup_admin.sql`.

#### A) Create the user in Authentication (this sets the password)

1. Supabase → **Authentication → Users**
2. **Add user** → **Create new user**
3. Fields:
   - **Email** — admin email (e.g. `you@email.com`)
   - **Password** — strong password (≥ 8 characters). **This is what you use at `/login`.**
4. Enable **Auto Confirm User** if shown, so you can sign in without email confirmation.
5. **Create user**

The `handle_new_user` trigger creates a row in `public.profiles`.  
If you created the user *before* the schema, there will be no profile: delete the user and recreate them **after** `001_schema.sql`, or insert the profile (see `004_setup_admin.sql`).

#### B) Mark platform admin + username (SQL Editor)

Replace email and username, then run:

```sql
update public.profiles
set
  is_platform_admin = true,
  username = 'your_username',        -- a-z, 0-9, _ only (3–32); avoid the bare name "admin"
  display_name = 'Admin',
  username_setup_done = true         -- skip the guest /join flow
where lower(email) = lower('you@email.com');
```

Verify:

```sql
select email, username, is_platform_admin, username_setup_done
from public.profiles
where is_platform_admin = true;
```

#### C) Sign in to the app

1. Open `https://your-app.vercel.app/login` (or local `http://localhost:5173/login`)
2. **Email** = step A  
3. **Password** = step A (Auth “Create new user”)  
4. **Sign in** → projects hub + **admin** badge  
5. Invite everyone else from there (they use the invite email → `/join`)

#### If the admin cannot sign in

| Symptom | Check |
|---------|--------|
| Invalid login credentials | Email/password from step A; user exists and is **Confirmed** in Users |
| Redirected to `/join` | Re-run the `UPDATE` with `username_setup_done = true` |
| No admin badge / cannot invite | `is_platform_admin` is not `true` on `profiles` |
| Wrong env | `VITE_SUPABASE_URL` of the **same** project where you created the user |

#### Change the admin password later

**Authentication → Users** → the user → reset / edit password.  
(The app does not have a “change password” screen yet.)

## 3. Deploy on Vercel

1. Import the repo in Vercel.
2. **Root Directory:** empty (repo root), not `web`.
3. Framework: **Vite** or **Other**.
4. Commands (also in `vercel.json`):
   - Install: `cd web && npm install` (root `package.json` also installs API deps)
   - Build: `cd web && npm run build`
   - Output: `dist`
5. **Environment Variables** (Settings → Environment Variables).  
   Enable **Production** (and Preview if you want).  
   Client vars must use the `VITE_` prefix:

| Name | Value | Scope |
|------|--------|--------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Production (+ Preview) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Production |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` (**no** `VITE_`) | Production |
| `APP_URL` | `https://your-app.vercel.app` | Production |

6. **Redeploy is required** after creating/changing env vars:  
   Deployments → ⋮ on the latest deploy → **Redeploy**  
   (Vite embeds `VITE_*` at build time; without redeploy the JS stays empty.)

7. Function `api/invite-user.js` invites users by email (platform admin only).  
   Vercel’s `installCommand` installs root deps (`@supabase/supabase-js` for the API) and `web/`.

### If the invite link goes to `vercel.com/login`

That is **not** Piedra a Piedra or Supabase login. It is Vercel **Deployment Protection** (SSO): the deploy requires a Vercel account.

Typical final URL:

- `https://vercel.com/login?next=...sso-api...`
- sometimes also `error_code=otp_expired` (invite token expired or already used)

**Cause 1 — Protected preview / team URL**

Example:  
`https://piedra-a-piedra-….vercel.app` or `…-your-team.vercel.app`

1. Vercel → your project → **Settings → Deployment Protection**
2. For **Production**: disable **Vercel Authentication** (the app must be public; Supabase handles login).
3. Preview may stay protected; **do not use preview URLs in invites**.

**Cause 2 — Wrong `APP_URL` on Vercel**

1. Vercel → **Settings → Environment Variables → Production**
2. `APP_URL` = **public Production** domain, no trailing `/`, e.g.:
   - `https://piedra-a-piedra.vercel.app`  
   - or your custom domain  
   **Do not** use a single-deployment URL or a protected `…-projects.vercel.app` URL.
3. Redeploy after changing `APP_URL`.

**Cause 3 — Redirect URLs in Supabase**

Supabase → **Authentication → URL Configuration**:

| Field | Value |
|--------|--------|
| **Site URL** | `https://your-public-domain.vercel.app` (same as `APP_URL`) |
| **Redirect URLs** | `https://your-public-domain.vercel.app/**`  
| | and/or `https://your-public-domain.vercel.app/join` |

The invite email should use  
`redirect_to=https://your-public-domain.vercel.app/join`  
(not only `/` and not a Vercel login URL).

**Cause 4 — Expired token (`otp_expired`)**

Invite links are single-use and expire. Invite again from the app and open the **new** email in a private window (no Vercel session).

**Quick checklist**

1. Production **without** Vercel Authentication.  
2. `APP_URL` = public Production domain.  
3. Supabase Site URL + Redirect URLs aligned with `APP_URL` + `/join`.  
4. New invite → open in private window → should load **your app** at `/join`, not vercel.com.

### If `POST /api/invite-user` returns 500

1. Vercel → **Settings → Environment Variables**: `SUPABASE_SECRET_KEY` (`sb_secret_…`) must exist in **Production**.
2. `APP_URL` = public Production domain (see above).
3. Supabase Redirect URLs include `…/join`.
4. Your user has `is_platform_admin = true` (`004_setup_admin.sql`).
5. Redeploy; check the function Runtime Logs.

### If you see “Missing VITE_SUPABASE_…”

1. Confirm variables exist under **Production** (not only Development).
2. Exact names: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Redeploy with the latest repo code.
4. Hard refresh the browser (Ctrl+F5).

## 4. Deploy on Netlify

1. Import the repo; use `netlify.toml`.
2. Same env vars as above.
3. For email invites on Netlify, port `api/invite-user.js` to `netlify/functions/invite-user.js` (or use project invites by username only and create users in the dashboard).

## 5. Usage flow

1. **Admin** signs in at `/login` with the **email + password** from Authentication → Users (§2.1). They do not use the invite link.
2. Admin → **Invite to platform** (guest email only).
3. **Guest** opens the mail → `/join` → chooses **@username + password** (or declines and is removed from Auth) → dashboard.
4. Any user **creates projects**.
5. Project owner/admin **invites by @username** (email stays private).
6. Project invitee accepts the notification → enters the project.
7. Username editable in hub **Profile**.
8. Kanban / Timeline / Panel; assets in `project-assets`.
9. Optional: Profile → **NVIDIA NIM** API key → **Edit with AI** in a project.

## 6. Local development

```bash
cd web
cp .env.example .env.local
# fill VITE_SUPABASE_*
npm install
npm run dev
```

To exercise `/api/invite-user` or `/api/nim-chat` with full Vercel routing, use `vercel dev` from the repo root. NIM chat is also available via the Vite middleware in local `npm run dev`.

## Security

- Use **publishable** on the client and **secret** only on the server (invite / waitlist / related APIs).
- Never expose `SUPABASE_SECRET_KEY` / `service_role` with a `VITE_*` prefix.
- Public sign-up disabled.
- RLS: only project members see/edit their stones and tasks.
- NIM API keys stay in the user’s browser; the server proxies requests and does not persist them.

Legacy JWT keys (`anon` / `service_role`) still work in parallel until you disable them in the dashboard; the code accepts a legacy fallback if needed.
