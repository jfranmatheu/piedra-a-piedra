-- ═══════════════════════════════════════════════════════════════════════════
-- Setup del ADMIN de plataforma (completo)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- El admin NO entra por el enlace de invitación. Se crea a mano en Supabase
-- con email + contraseña, y luego se le da el flag is_platform_admin.
--
-- ── Paso A — Crear usuario en Authentication (obligatorio) ─────────────────
--
-- 1. Supabase Dashboard → Authentication → Users
-- 2. Botón "Add user" → "Create new user"
-- 3. Rellena:
--      • Email:     el email del admin (ej. admin@tu-dominio.com)
--      • Password:  una contraseña fuerte (mín. 8 caracteres; la que usarás
--                   en la pantalla /login de la app)
-- 4. Activa "Auto Confirm User" (si aparece) para que pueda entrar ya
--    sin confirmar email.
-- 5. Create user
--
-- Eso crea la fila en auth.users. El trigger handle_new_user debería crear
-- automáticamente una fila en public.profiles. Si no existe (creaste el
-- usuario ANTES de ejecutar 001_schema.sql), recrea el usuario o inserta
-- el perfil a mano (ver abajo).
--
-- ── Paso B — Comprobar perfil y marcar admin ───────────────────────────────
--
-- Sustituye el email y el username deseado, y ejecuta TODO el bloque.

-- 1) ¿Existe el perfil?
-- select id, email, username, is_platform_admin, username_setup_done
-- from public.profiles
-- where lower(email) = lower('admin@tu-dominio.com');

-- 2) Marcar como platform admin + username definitivo + saltar /join
--    (el admin ya tiene contraseña de Auth; no necesita el flujo de invitado)

update public.profiles
set
  is_platform_admin = true,
  username = 'admin_tu_nombre',   -- cámbialo: solo a-z 0-9 _  (3–32), NO uses "admin" solo
  display_name = 'Admin',
  username_setup_done = true,     -- evita la pantalla /join de invitado
  platform_invites_remaining = 9999  -- opcional; el admin es ilimitado en la API
where lower(email) = lower('admin@tu-dominio.com');

-- Si el UPDATE no tocó ninguna fila, el perfil no existe. Crea el usuario
-- en Auth DESPUÉS de 001_schema, o inserta el perfil con el mismo UUID:
--
--   -- Authentication → Users → copia el User UID
--   insert into public.profiles (
--     id, username, email, display_name,
--     is_platform_admin, username_setup_done
--   ) values (
--     'PEGAR-UUID-DEL-USER-AQUI',
--     'admin_tu_nombre',
--     'admin@tu-dominio.com',
--     'Admin',
--     true,
--     true
--   );

-- 3) Verificar
-- select id, email, username, is_platform_admin, username_setup_done
-- from public.profiles
-- where is_platform_admin = true;

-- ── Paso C — Iniciar sesión en la app ──────────────────────────────────────
--
-- 1. Abre https://tu-app.vercel.app/login  (o http://localhost:5173/login)
-- 2. Email = el del Paso A
-- 3. Password = la del Paso A (la que pusiste en "Add user")
-- 4. Entrar → deberías ver el hub de proyectos y el badge "admin"
-- 5. Desde ahí: "Invitar a la plataforma" (otros usuarios van a /join)
--
-- Si falla el login:
--   • Authentication → Users → el usuario existe y "Confirmed" = sí
--   • Contraseña correcta (puedes "Reset password" / "Send password recovery"
--     o borrar y recrear el user con otra password)
--   • VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY del mismo proyecto
--
-- Si te manda a /join pidiendo username+password otra vez:
--   username_setup_done sigue en false → vuelve a ejecutar el UPDATE del Paso B
--   con username_setup_done = true.
--
-- ── Cambiar la contraseña del admin más adelante ─────────────────────────────
--
-- Opción 1: App — no hay UI de "cambiar password" aún; usa el dashboard:
--   Authentication → Users → (usuario) → … → Reset password / Send recovery
-- Opción 2: Authentication → Users → editar usuario → nueva password
-- Opción 3: En la app, "olvidé contraseña" solo si habilitas un flujo recovery
--   (no está implementado; usa el dashboard).
