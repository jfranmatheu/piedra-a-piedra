-- Marcar un usuario existente como platform admin
-- 1) Crea el usuario en Authentication → Users (email + strong password)
-- 2) Sustituye el email y ejecuta:

-- update public.profiles
-- set is_platform_admin = true
-- where lower(email) = lower('admin@tu-dominio.com');

-- Ejemplo (descomenta y edita):
-- update public.profiles
-- set is_platform_admin = true, display_name = 'Admin'
-- where lower(email) = lower('admin@example.com');
