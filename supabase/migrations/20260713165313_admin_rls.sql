-- Add RLS policy to allow admins and super-admins to view profiles
-- Idempotent: drop first so this migration is safe to re-run
DROP POLICY IF EXISTS "Admins can read tenant profiles" ON public.profiles;

CREATE POLICY "Admins can read tenant profiles"
  ON public.profiles FOR SELECT
  USING (
    -- Allow users to always read their own profile
    auth.uid() = id
    OR
    -- Super-admin sees all profiles globally
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'super-admin')
    OR 
    -- Admin sees only profiles within their tenant
    (
      auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' 
      AND auth.jwt() -> 'app_metadata' ->> 'tenant_id' = tenant_id
    )
  );
