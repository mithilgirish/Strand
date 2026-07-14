-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    sender TEXT CHECK (sender IN ('user', 'brain')) NOT NULL,
    text TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    confidence TEXT CHECK (confidence IN ('High', 'Medium', 'Low')),
    response_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant-isolated access
CREATE POLICY chat_sessions_tenant_policy ON public.chat_sessions
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY chat_messages_tenant_policy ON public.chat_messages
    FOR ALL
    TO authenticated
    USING (
        session_id IN (
            SELECT id FROM public.chat_sessions 
            WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
    );
