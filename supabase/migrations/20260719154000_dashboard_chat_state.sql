-- ============================================================
-- STRAND: Dashboard Chat State Table & Row-Level Security
-- Enables persistent chat history for custom dashboards per user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dashboard_chat_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id VARCHAR(100) NOT NULL DEFAULT public.get_current_tenant_id(),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.dashboard_chat_state ENABLE ROW LEVEL SECURITY;

-- Tenant & User Isolation RLS Policy
CREATE POLICY "Tenant and user isolation for dashboard chat state"
  ON public.dashboard_chat_state FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() AND
    tenant_id = public.get_current_tenant_id()
  );
