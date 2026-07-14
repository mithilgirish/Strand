-- SCOPED: Only promote the primary dev user to super-admin.
-- This is intentionally left blank — developer should set role via Supabase Dashboard:
-- Dashboard → Table Editor → profiles → Find your row → Set role = 'super-admin'
-- 
-- The wide UPDATE from the previous migration (20260713170234_force_super_admin.sql)
-- was a development shortcut and must not be applied in production.
SELECT 1; -- no-op placeholder
