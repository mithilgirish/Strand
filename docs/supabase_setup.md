# Supabase Database Setup Guide

This document outlines the steps to initialize the unified authentication and database schemas for STRAND.

## Prerequisites

1.  A [Supabase](https://supabase.com/) project.
2.  Access to the Supabase **SQL Editor** in your project dashboard.

## 1. Run the Schema SQL

The core database schema, including Row-Level Security (RLS) policies and Role-Based Access Control (RBAC) triggers, is located in the `db` directory.

1.  Open the file: `../supabase/supabase_schema.sql`
2.  Copy the entire content of the file.
3.  Go to the **SQL Editor** in your Supabase Dashboard.
4.  Paste the SQL script and click **Run**.

### What this script does:

*   **Profiles Table:** Creates the `public.profiles` table linked to Supabase's `auth.users`, storing `tenant_id`, `role`, `full_name`, and `email`.
*   **Custom Dashboards Table:** Creates the `public.custom_dashboards` table to store AI-generated layouts and Cypher queries.
*   **RLS Policies:** Enforces Tenant Isolation and restricts users to only viewing their own profiles and their tenant's dashboards.
*   **JWT Claims Trigger:** Creates a Postgres trigger (`handle_user_claims`) that automatically maps a user's `role` and `tenant_id` into their JWT token (`raw_app_meta_data`). This allows for stateless verification in the FastAPI backend without needing database lookups on every request.

## 2. Next Steps (Part 2)

Once the SQL has been successfully run, the database is prepared. The next steps will involve integrating the backend router logic to verify the stateless JWTs, executing dynamic AI Cypher queries, and building out the Next.js client for the custom dashboards.
