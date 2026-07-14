-- ============================================================
-- STRAND Production Schema Migration
-- Adds: tenants table, audit_logs table, proper RLS, indexes,
--       invite tracking, user status, and role promotion utility
-- ============================================================

-- ── 1. TENANTS TABLE ────────────────────────────────────────
-- Source of truth for all active namespaces in the system.
-- Tenant dropdown in UserDirectory reads from this table.
CREATE TABLE IF NOT EXISTS public.tenants (
  id VARCHAR(100) PRIMARY KEY,                         -- e.g. "acme_corp_01"
  name TEXT NOT NULL,                                  -- e.g. "Acme Corporation"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  max_users INT DEFAULT 50,
  plan VARCHAR(50) DEFAULT 'standard' CHECK (plan IN ('trial', 'standard', 'enterprise'))
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Super-admins can do everything on tenants
CREATE POLICY "Super admins manage tenants"
  ON public.tenants FOR ALL
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'super-admin');

-- Admins and users can read their own tenant
CREATE POLICY "Users can read their own tenant"
  ON public.tenants FOR SELECT
  USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );

-- Seed the default tenant so existing users have a home
INSERT INTO public.tenants (id, name, plan)
VALUES ('default_tenant', 'STRAND Default Workspace', 'enterprise')
ON CONFLICT (id) DO NOTHING;


-- ── 2. AUDIT LOGS TABLE ──────────────────────────────────────
-- Immutable append-only log of all significant system events.
-- Indexed for fast tenant-scoped queries.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  action VARCHAR(100) NOT NULL,  -- e.g. 'USER_INVITED', 'TENANT_CREATED', 'ROLE_CHANGED'
  resource_type VARCHAR(100),    -- e.g. 'user', 'tenant', 'dashboard'
  resource_id TEXT,              -- e.g. the user id or tenant id acted upon
  metadata JSONB DEFAULT '{}'::JSONB,
  ip_address TEXT
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Prevent any UPDATE or DELETE — logs are immutable
CREATE POLICY "Audit logs are insert-only for system"
  ON public.audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- Super-admin can read all logs globally
CREATE POLICY "Super admins read all audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'super-admin');

-- Admins can only read logs for their own tenant
CREATE POLICY "Admins read tenant audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );

-- Index for fast tenant-scoped time-series queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON public.audit_logs (tenant_id, created_at DESC);


-- ── 3. INVITATIONS TABLE ─────────────────────────────────────
-- Tracks pending user invitations so we can display them in UserDirectory
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  tenant_id VARCHAR(100) NOT NULL REFERENCES public.tenants(id),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('super-admin', 'admin', 'client-owner', 'manager', 'qa-inspector', 'engineer', 'subcontractor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  is_pending BOOLEAN GENERATED ALWAYS AS (accepted_at IS NULL) STORED
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invitations in their tenant"
  ON public.invitations FOR ALL
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin')
    AND (
      auth.jwt() -> 'app_metadata' ->> 'role' = 'super-admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations (email);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON public.invitations (tenant_id);


-- ── 4. ADD is_active TO profiles ────────────────────────────
-- Allow admins to deactivate users without deleting them
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;


-- ── 5. FOREIGN KEY: profiles → tenants ────────────────────
-- Enforce referential integrity: every profile must belong to a valid tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_profiles_tenant'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;


-- ── 6. FUNCTION: promote_to_super_admin ─────────────────────
-- Safe utility function callable by super-admins to elevate a user.
-- Never used in migrations — only called via Supabase RPC in the backend.
CREATE OR REPLACE FUNCTION public.promote_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow callers with super-admin role in their JWT
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'super-admin' THEN
    RAISE EXCEPTION 'Insufficient privileges: super-admin required';
  END IF;

  -- Validate role is one of the allowed values
  IF new_role NOT IN ('super-admin', 'admin', 'client-owner', 'manager', 'qa-inspector', 'engineer', 'subcontractor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;

  -- The on_profile_update trigger will sync this to JWT automatically
END;
$$;


-- ── 7. INDEX: profiles for admin queries ────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role
  ON public.profiles (tenant_id, role);

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);
