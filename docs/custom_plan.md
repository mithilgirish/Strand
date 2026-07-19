# STRAND: AI Custom Dashboard & Unified Auth Architecture Specification
**Master Reference Guide & Implementation Blueprint (Senior Engineering Specification)**

This document specifies the technical architecture, security protocols, schema designs, and implementation roadmap for the **AI-Powered Custom Dashboard Builder** and the **Unified Multi-Tenant Authentication System (RBAC)** using Supabase Auth and Supabase DB across the STRAND Web (Next.js 16) and Mobile (React Native/Expo) platforms.

---

## 1. System Architecture Overview

```mermaid
graph TD
    %% Client Tier
    subgraph Client Tier (Web & Mobile)
        Web[Next.js Web Client]
        Mobile[React Native Expo Mobile]
    end

    %% Gateway & Security
    subgraph API Gateway & Authentication
        GW[FastAPI Router]
        SupabaseAuth[Supabase Auth Service]
        JWT[FastAPI JWT Verification via Supabase JWKS]
        RBAC[RBAC Dependency Checker]
    end

    %% Storage & Memory Tier
    subgraph Hybrid Storage Layer
        SupabaseDB[(Supabase Postgres DB)]
        Neo4j[(Neo4j Aura PKG)]
    end

    %% Session & Data Flows
    Web -->|HTTPS + JWT Cookie| GW
    Mobile -->|HTTPS + Bearer Token| GW
    Web <-->|Authentication| SupabaseAuth
    Mobile <-->|Authentication| SupabaseAuth
    GW --> JWT
    JWT --> RBAC
    RBAC -->|Save Configs / Profile| SupabaseDB
    RBAC -->|Query/Mutate Graph| Neo4j
    SupabaseAuth -.->|Sync Profiles| SupabaseDB
```

---

## 2. Part 1: Unified Authentication with Supabase Auth & DB

We leverage **Supabase Auth** as our Identity Provider (IDP) and **Supabase DB (Postgres)** for relational configurations, user profiles, and saved schemas. **Neo4j** remains the source of truth for the core Parametric Knowledge Graph (PKG).

### 2.0 User Roles & Permissions Matrix
Every user profile carries a single, flat `role` string column. Below is the granular capabilities matrix defined as an AI-interpretable specification. This structure allows code generators, routers, and agents to read or enforce authorization limits dynamically.

```json
{
  "rbac_rules": {
    "super-admin": {
      "scope": "global",
      "allowed_routes": ["/api/v1/*"],
      "neo4j_permissions": { "labels": ["*"], "actions": ["READ", "WRITE"] },
      "dashboard_builder_access": true,
      "custom_fields_provisioning": true
    },
    "admin": {
      "scope": "tenant",
      "allowed_routes": [
        "/api/v1/auth/*",
        "/api/v1/dashboards/*",
        "/api/v1/custom-fields/*",
        "/api/v1/guardian/*",
        "/api/v1/scheduler/*",
        "/api/v1/oracle/*",
        "/api/v1/brain/*"
      ],
      "neo4j_permissions": {
        "labels": ["ContractClause", "VendorSubmittal", "NCR", "Supplier", "Shipment", "TestStep", "Zone"],
        "actions": ["READ", "WRITE"]
      },
      "dashboard_builder_access": true,
      "custom_fields_provisioning": true
    },
    "client-owner": {
      "scope": "tenant",
      "allowed_routes": [
        "/api/v1/dashboards/view/*",
        "/api/v1/guardian/violations",
        "/api/v1/scheduler/risks",
        "/api/v1/oracle/shipments"
      ],
      "neo4j_permissions": {
        "labels": ["ContractClause", "VendorSubmittal", "NCR", "Supplier", "Shipment", "TestStep", "Zone"],
        "actions": ["READ"]
      },
      "dashboard_builder_access": false,
      "custom_fields_provisioning": false
    },
    "manager": {
      "scope": "project",
      "allowed_routes": [
        "/api/v1/dashboards/*",
        "/api/v1/guardian/*",
        "/api/v1/scheduler/*",
        "/api/v1/oracle/*",
        "/api/v1/brain/*"
      ],
      "neo4j_permissions": {
        "labels": ["ContractClause", "VendorSubmittal", "NCR", "Supplier", "Shipment", "TestStep", "Zone"],
        "actions": ["READ", "WRITE"]
      },
      "dashboard_builder_access": true,
      "custom_fields_provisioning": false
    },
    "qa-inspector": {
      "scope": "project",
      "allowed_routes": [
        "/api/v1/guardian/*",
        "/api/v1/inspector/*",
        "/api/v1/brain/*"
      ],
      "neo4j_permissions": {
        "labels": ["ContractClause", "VendorSubmittal", "NCR", "TestStep", "Zone"],
        "actions": ["READ", "WRITE"]
      },
      "dashboard_builder_access": false,
      "custom_fields_provisioning": false
    },
    "engineer": {
      "scope": "task",
      "allowed_routes": [
        "/api/v1/inspector/ncr",
        "/api/v1/scheduler/tasks"
      ],
      "neo4j_permissions": {
        "labels": ["NCR", "TestStep", "Zone"],
        "actions": ["READ", "WRITE"]
      },
      "dashboard_builder_access": false,
      "custom_fields_provisioning": false
    },
    "subcontractor": {
      "scope": "vendor",
      "allowed_routes": [
        "/api/v1/documents/upload",
        "/api/v1/guardian/violations"
      ],
      "neo4j_permissions": {
        "labels": ["VendorSubmittal", "Shipment"],
        "actions": ["READ", "WRITE"]
      },
      "dashboard_builder_access": false,
      "custom_fields_provisioning": false
    },
    "viewer": {
      "scope": "project",
      "allowed_routes": [
        "/api/v1/dashboards/view/*"
      ],
      "neo4j_permissions": {
        "labels": ["*"],
        "actions": ["READ"]
      },
      "dashboard_builder_access": false,
      "custom_fields_provisioning": false
    }
  }
}
```


### 2.1 Supabase Database (Postgres) Schema Design
We use the Supabase database to manage user metadata, roles, and dashboard structures. The core graph data remains decoupled in Neo4j, references mapped via UUID strings (`user_id`, `tenant_id`).

##### Profiles & Roles Schema
Supabase Auth users are automatically created in the `auth.users` schema. We create a public `profiles` table to map roles and tenancy directly:

```sql
-- Create custom profiles table mapped to Supabase Auth
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
```

#### Saved AI Dashboards Table
Instead of storing layout schemas in Neo4j, we store the layout configuration in Supabase Postgres:

```sql
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
```

### 2.2 Syncing Roles & Tenancy to JWT Claims
To enable stateless token verification on our FastAPI backend, we map `role` and `tenant_id` directly into the Supabase JWT using a custom Database Trigger:

```sql
-- Map profiles to custom JWT claims
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
```

### 2.3 Backend (FastAPI) JWT Verification Pipeline
Because Supabase tokens are standard JWTs signed with asymmetric cryptography, FastAPI verifies the token *statelessly* by fetching Supabase's JWKS (JSON Web Key Sets) endpoint. No database call is made during standard API requests.

```python
# backend/deps.py
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel

security = HTTPBearer()

# Replace with your Supabase URL
SUPABASE_URL = "https://your-project.supabase.co"
JWKS_URL = f"{SUPABASE_URL}/auth/v1/user"  # Or your direct JWKS URL

class CurrentUser(BaseModel):
    id: str
    email: str
    tenant_id: str
    role: str  # Single active role for the tenant session

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate Supabase credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Fetch the JWKS from Supabase and decode/validate the JWT
        # In production, cache the JWKS keys to avoid querying on every request
        payload = jwt.decode(
            token, 
            key=settings.SUPABASE_JWT_SECRET,  # For local decoding using Supabase JWT secret
            algorithms=["HS256"]
        )
        
        user_id: str = payload.get("sub")
        app_metadata = payload.get("app_metadata", {})
        tenant_id: str = app_metadata.get("tenant_id")
        role: str = app_metadata.get("role")
        email: str = payload.get("email")
        
        if not user_id or not tenant_id or not role:
            raise credentials_exception
            
        return CurrentUser(id=user_id, email=email, tenant_id=tenant_id, role=role)
    except JWTError:
        raise credentials_exception
```

---

## 3. Part 2: AI Custom BI Dashboard Implementation

### 3.1 The AI Workflow
1.  **User Request:** *"Create a dashboard showing our max R0 score and current generator shipping delays."*
2.  **AI Query Translation:** The `DashboardAgent` (`agents/dashboard.py`) maps the prompt into a secure read-only Neo4j Cypher query, scoped to the current user's `tenant_id`.
3.  **Layout Generation:** The LLM outputs the UI JSON schema.
4.  **Save Config:** The system stores the generated configuration in Supabase DB under `public.custom_dashboards`.

### 3.2 Dynamic Query Execution & Safety
The FastAPI endpoint `/api/v1/dashboards/query` receives the dynamic Cypher query. It must enforce read-only execution:

```python
# backend/routers/dashboards.py
from fastapi import APIRouter, Depends
from backend.deps import get_current_user, CurrentUser
from backend.graph.client import get_neo4j_driver
from backend.r0.sanitizer import sanitize_and_inject_tenant

router = APIRouter()

@router.post("/dashboards/query")
async def execute_dashboard_query(
    query_payload: dict, 
    user: CurrentUser = Depends(get_current_user)
):
    cypher_raw = query_payload.get("query")
    
    # 1. Enforce tenant isolation and block mutators (AST Sanitizer)
    secured_cypher = sanitize_and_inject_tenant(cypher_raw, user.tenant_id)
    
    # 2. Execute with a read-only database transaction
    driver = get_neo4j_driver()
    with driver.session(default_access_mode="READ") as session:
        result = session.run(secured_cypher, tenant_id=user.tenant_id).data()
        
    return {"data": result}
```

---

## 4. Part 3: Next.js & Mobile Client Integration

### 4.1 Next.js 16 Integration
*   Use `@supabase/supabase-js` on the client.
*   Enforce Next.js Middleware (`middleware.ts`) to intercept routes like `/custom-dashboards` and redirect unauthorized roles.

```ts
// frontend/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && req.nextUrl.pathname.startsWith('/custom-dashboards')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  return res
}
```

### 4.2 React Native Expo Integration
*   Use `@supabase/supabase-js` along with `expo-secure-store` to keep the authentication session persisted natively on devices.
*   The mobile app fetches the dashboard configurations from `public.custom_dashboards` and renders them with Native mobile widgets.

---

## 5. Part 4: Admin & Super-Admin Console

To govern users, audit AI activity, and configure workspace settings, STRAND implements a dual-tier Administrative Console at `/app/admin/page.tsx`. The interface dynamically morphs based on the user's validated JWT role claim.

### 5.1 RBAC UI & Option Splitting
The layout uses tabbed navigation to isolate regular tenant admin tasks from global system admin tasks:

```
┌────────────────────────────────────────────────────────┐
│  STRAND ADMIN CONSOLE                                  │
├────────────────────────────────────────────────────────┤
│  Tabs: [User Directory]  [Audit Logs]                  │
│        [Tenant Provisioning]*  [System Telemetry]*     │
│                                                        │
│  * (Visible to super-admin only)                       │
└────────────────────────────────────────────────────────┘
```

#### Shared Tabs (Visible to `admin` and `super-admin`)
1.  **User Management (`/api/v1/admin/users`)**: 
    *   *Scope:* `admin` can invite, update, or remove users within their own `tenant_id`. `super-admin` can manage all users globally across all tenants.
2.  **Audit Logs (`/api/v1/admin/logs`)**:
    *   *Scope:* Displays a timeline of submittals, configuration updates, and AI query sanitization triggers. Scoped locally for `admin` and globally for `super-admin`.

#### Super-Admin Exclusive Tabs (Hidden if `role !== 'super-admin'`)
1.  **Tenant Provisioning (`/api/v1/admin/tenants`)**:
    *   Action: Creates a new client organization. Assigns their unique `tenant_id` and registers the baseline project entities in the databases.
2.  **Global Templates**:
    *   Action: Defines baseline Spec-DNA rules (e.g. default temperature limits for cooling towers) inherited by all new construction projects.
3.  **System Telemetry**:
    *   Action: Displays live stats of Redis cache hits, Neo4j query execution times, and OpenAI/Anthropic API token consumption.

---

### 5.2 Next.js Admin Page Component Skeletons
We implement route-level permission checks both in Next.js middleware and in the dashboard component.

```tsx
// frontend/app/admin/page.tsx
"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext"; // Custom hook referencing Supabase session JWT
import UserDirectory from "@/components/admin/UserDirectory";
import AuditLogs from "@/components/admin/AuditLogs";
import TenantProvisioning from "@/components/admin/TenantProvisioning";
import SystemTelemetry from "@/components/admin/SystemTelemetry";

export default function AdminConsole() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  if (loading) return <div className="text-on-surface font-mono p-8">AUTHENTICATING...</div>;
  
  // Enforce page entry limits
  if (!user || (user.role !== "admin" && user.role !== "super-admin")) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="border border-tertiary rounded-lg p-6 bg-glass-fill backdrop-blur-md max-w-md">
          <h2 className="headline-md text-tertiary mb-2 uppercase">Access Denied</h2>
          <p className="body-md text-on-surface-variant">
            You do not possess the required security clearances to access the STRAND Command Console.
          </p>
        </div>
      </div>
    );
  }

  const isSuper = user.role === "super-admin";

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface p-8">
      <header className="mb-8 border-b border-outline-variant pb-4">
        <h1 className="display-lg tracking-tight">STRAND Command Console</h1>
        <p className="mono-data text-xs text-on-surface-variant uppercase mt-1">
          Security Level: {user.role} // Tenant ID: {user.tenant_id}
        </p>
      </header>

      {/* Glassmorphic Tab Bar */}
      <div className="flex gap-2 p-1.5 bg-surface-container rounded-lg max-w-2xl mb-8 border border-outline-variant">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-md label-caps transition-all ${activeTab === "users" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
        >
          User Directory
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 rounded-md label-caps transition-all ${activeTab === "logs" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
        >
          Audit Logs
        </button>
        
        {/* Dynamic Super-Admin Rendering */}
        {isSuper && (
          <>
            <button
              onClick={() => setActiveTab("tenants")}
              className={`px-4 py-2 rounded-md label-caps border border-dashed border-outline transition-all ${activeTab === "tenants" ? "bg-secondary text-on-secondary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              Tenant Provisioning
            </button>
            <button
              onClick={() => setActiveTab("telemetry")}
              className={`px-4 py-2 rounded-md label-caps border border-dashed border-outline transition-all ${activeTab === "telemetry" ? "bg-secondary text-on-secondary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              System Telemetry
            </button>
          </>
        )}
      </div>

      {/* Dynamic Pane Rendering */}
      <main className="flex-1 bg-glass-fill backdrop-blur-md border border-outline-variant rounded-lg p-6 min-h-[500px]">
        {activeTab === "users" && <UserDirectory tenantId={user.tenant_id} isSuper={isSuper} />}
        {activeTab === "logs" && <AuditLogs tenantId={user.tenant_id} isSuper={isSuper} />}
        {activeTab === "tenants" && isSuper && <TenantProvisioning />}
        {activeTab === "telemetry" && isSuper && <SystemTelemetry />}
      </main>
    </div>
  );
}
```

---

### 5.3 Backend API Security Checks
To protect the backend from client-side spoofing, FastAPI router dependencies verify the JWT claims on the incoming request:

```python
# backend/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, status
from backend.deps import get_current_user, CurrentUser, RoleChecker

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Management"])

# Endpoint accessible by both admins and super-admins
@router.get("/users")
async def get_admin_users(
    user: CurrentUser = Depends(RoleChecker(["admin", "super-admin"]))
):
    if user.role == "super-admin":
        # Return all users globally
        return {"users": await fetch_all_users()}
    else:
        # Return users strictly matching user's own tenant
        return {"users": await fetch_users_by_tenant(user.tenant_id)}

# Endpoints strictly locked to super-admins
@router.post("/tenants")
async def provision_new_tenant(
    tenant_payload: dict,
    user: CurrentUser = Depends(RoleChecker(["super-admin"]))
):
    new_tenant_id = tenant_payload.get("tenant_id")
    await create_tenant_db_records(new_tenant_id)
    return {"status": "success", "tenant_id": new_tenant_id}

@router.get("/telemetry")
async def get_system_telemetry(
    user: CurrentUser = Depends(RoleChecker(["super-admin"]))
):
    return {"metrics": await gather_system_metrics()}
```

---

## 6. Security & Multi-Tenancy Assurances

1.  **Read-Only Database Sessions:** All queries generated by the AI must be executed against a Neo4j session configured with **Read Access mode** only. Write access routes must use separate credentials entirely.
2.  **Cypher Injection Mitigation:** Inputs parsed from user prompts are strictly checked for special operators and parameter-bound when querying graph nodes.
3.  **Strict Token Verification:** The mobile app and Next.js backend validation routines check signing keys, token expiration, and company tenancy context on every network roundtrip. No exceptions.

---

## 6. Appendix: The AI Copilot System Prompt

The Dashboard Agent (LLM) must be initialized with the following system prompt to generate compliant configuration schemas:

```markdown
You are a senior EPC business intelligence AI agent for STRAND (Hyperscale Data Center Risk Platform).
Your job is to translate human requests into a single structured JSON object conforming to the STRAND Dashboard JSON Schema.

You must only return a valid JSON object. Do not include markdown formatting or explanations.

### AVAILABLE WIDGETS
1. R0Gauge: Represents the current maximum R0 risk score (float 0.0 - 10.0). Expects a single numerical result.
2. PredictiveTrendChart: Expects time-series rows with columns `date`, `value`, and `predicted`.
3. FormulaCard: Displays a single calculated value.
4. DataGrid: Displays a clean list of records.

### NEO4J SCHEMA CONTEXT
Nodes:
- (c:ContractClause {spec_dna_id, section, parameter_name, parameter_value, unit})
- (s:VendorSubmittal {submittal_id, equipment_tag, status, r0_score, violation_count})
- (sh:Shipment {shipment_id, equipment_tag, current_status, delay_days, risk_flag})

Edges:
- (s)-[:VIOLATES]->(c)
- (sh)-[:FULFILLED_BY]->(po)

### DATA ACCESS RULES
Every query MUST match on nodes containing `{tenant_id: $tenant_id}`.
Never generate write keywords (CREATE, MERGE, SET, DELETE, DETACH).
```
