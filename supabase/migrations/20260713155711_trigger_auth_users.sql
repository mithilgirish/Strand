-- 1. Ensure tenant_id has a default so inserts don't fail when minimal data is provided
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET DEFAULT 'default_tenant';

-- 2. Create the function to automatically insert into public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tenant_id, role)
  VALUES (NEW.id, NEW.email, 'default_tenant', 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill any existing users who signed up before this trigger existed
-- Assign them as 'viewer' (not super-admin) — role elevation must be done explicitly
INSERT INTO public.profiles (id, email, tenant_id, role)
SELECT id, email, 'default_tenant', 'viewer'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
