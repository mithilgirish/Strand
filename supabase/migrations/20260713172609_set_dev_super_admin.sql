-- ============================================================
-- Promote the first registered user (the developer/owner) to super-admin.
-- This is safe because it only targets the OLDEST user account (the one
-- who set up the Supabase project) via a targeted subquery, not a blanket UPDATE.
--
-- After this runs, the developer should:
--  1. Log out of the app (to expire the old JWT)
--  2. Log back in (to receive a new JWT with super-admin claims)
-- ============================================================

UPDATE public.profiles
SET role = 'super-admin'
WHERE id = (
  SELECT id FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1
)
AND role != 'super-admin';  -- idempotent: no-op if already super-admin
