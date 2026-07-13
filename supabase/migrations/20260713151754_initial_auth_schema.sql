-- ==========================================
-- STRAND: Supabase Authentication & Schema
-- Part 1: Unified Authentication Setup
-- ==========================================

-- 1. Create custom profiles table mapped to Supabase Auth
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('super-admin', 'admin', 'client-owner', 'manager', 'qa-inspector', 'engineer', 'subcontractor', 'viewer')),
  full_name TEXT,
  email TEXT
);

-- Row-Level Security (RLS) policies for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- 2. Saved AI Dashboards Table
-- Instead of storing layout schemas in Neo4j, we store the layout configuration in Supabase Postgres
CREATE TABLE public.custom_dashboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  dashboard_name VARCHAR(255) NOT NULL,
  layout JSONB NOT NULL,       -- Stores grid sizes and widget positions
  queries JSONB NOT NULL,      -- Stores dynamic Cypher query mappings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.custom_dashboards ENABLE ROW LEVEL SECURITY;

-- Allow users to see dashboards belonging to their tenant
CREATE POLICY "Tenant isolation for dashboards" 
  ON public.custom_dashboards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id = custom_dashboards.tenant_id
    )
  );

-- 3. Syncing Roles & Tenancy to JWT Claims
-- To enable stateless token verification on our backend, we map `role` and `tenant_id` 
-- directly into the Supabase JWT using a custom Database Trigger.
CREATE OR REPLACE FUNCTION public.handle_user_claims()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    raw_app_meta_data || 
    jsonb_build_object('role', NEW.role, 'tenant_id', NEW.tenant_id)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_update
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_claims();
