-- ============================================================
-- STRAND: Dashboard Prompt History Table & Row-Level Security
-- Enables persistent user prompt history per tenant & user in Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dashboard_prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL DEFAULT public.get_current_tenant_id(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  dashboard_name TEXT,
  widgets_count INT DEFAULT 4,
  status VARCHAR(50) DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.dashboard_prompt_history ENABLE ROW LEVEL SECURITY;

-- Tenant & User Isolation RLS Policy
CREATE POLICY "Tenant and user isolation for dashboard prompt history"
  ON public.dashboard_prompt_history FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() AND
    tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    user_id = auth.uid() AND
    tenant_id = public.get_current_tenant_id()
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_prompt_history_user_tenant 
  ON public.dashboard_prompt_history(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_prompt_history_created 
  ON public.dashboard_prompt_history(user_id, created_at DESC);
