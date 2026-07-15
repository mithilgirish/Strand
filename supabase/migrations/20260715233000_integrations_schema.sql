-- ============================================================
-- STRAND Integrations Schema Migration
-- Adds: tenant_integrations table to persist configurations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_id VARCHAR(50) NOT NULL, -- 'autodesk', 'procore', 'primavera', 'maximo'
  status VARCHAR(20) DEFAULT 'disconnected',
  config JSONB DEFAULT '{}'::jsonb, -- stores client_id, etc.
  credentials JSONB DEFAULT '{}'::jsonb, -- stores oauth tokens
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, integration_id)
);

ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

-- Admins and Super Admins manage integrations
CREATE POLICY "Admins manage tenant integrations"
  ON public.tenant_integrations FOR ALL
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'tenant_admin', 'super-admin')
    AND (
      auth.jwt() -> 'app_metadata' ->> 'role' = 'super-admin'
      OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
    )
  );

-- Users can read integrations
CREATE POLICY "Users read tenant integrations"
  ON public.tenant_integrations FOR SELECT
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super-admin'
    OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tenant_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_integrations_updated_at
BEFORE UPDATE ON public.tenant_integrations
FOR EACH ROW
EXECUTE FUNCTION update_tenant_integrations_updated_at();
