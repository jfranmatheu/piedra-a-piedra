# Piedra a Piedra

Roadmap multi-proyecto (milestones + tareas) con **React**, **Supabase** (auth, DB, storage) y deploy gratuito en **Vercel / Netlify**.

> Ya no usa archivos locales `.stones` ni carpeta `images/`. Todo vive en Supabase.

## Características

- Login **solo por invitación** (sin sign-up público)
- Usuario **admin de plataforma** invita por email
- Cada usuario crea **proyectos** y ve a los que se unió
- Owner/admin de proyecto invita por **@username**
- **Notificaciones** de invitación
- Por proyecto: piedras, tareas, miembros, Kanban / Timeline / Panel
- Assets en **Supabase Storage**

## Quick start (local)

1. Crea proyecto Supabase y ejecuta SQL en `scripts/supabase/` (ver `scripts/README.md` y `DEPLOY.md`).
2. Configura env:

```bash
cd web
cp .env.example .env.local
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
npm install
npm run dev
```

3. Abre http://localhost:5173

## Deploy

Ver **[DEPLOY.md](./DEPLOY.md)** — fork → Supabase → Vercel/Netlify.

## Estructura

```
piedra-a-piedra/
├── web/                 # React (Vite + Tailwind + Lucide)
│   ├── src/
│   └── api/             # helper invite (también en /api)
├── api/invite-user.js   # Vercel serverless invite
├── scripts/supabase/    # SQL schema, RLS, storage
├── DEPLOY.md
└── dist/                # build output
```

## Scripts Supabase

```
scripts/supabase/001_schema.sql
scripts/supabase/002_rls.sql
scripts/supabase/003_storage.sql
scripts/supabase/004_setup_admin.sql
```

```powershell
.\scripts\apply-supabase.ps1
```

## Licencia

Uso libre para forks y self-hosting.
