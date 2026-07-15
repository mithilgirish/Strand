# STRAND Integration Hub Setup & Architecture

This document outlines the architecture, security patterns, and setup instructions for the four primary third-party integrations in STRAND: Autodesk Construction Cloud, Procore, Oracle Primavera P6, and IBM Maximo.

---

## Architecture & Security Patterns

### 1. Global vs. Tenant Secrets
- **Global Application Secrets:** OAuth Client IDs and Client Secrets belong to the STRAND application itself. These must **never** be entered by the user in the frontend UI. They are strictly loaded from the backend `.env` file (e.g., `AUTODESK_CLIENT_ID`, `PROCORE_CLIENT_ID`, `PRIMAVERA_CLIENT_ID`).
- **Tenant-Specific Configurations:** Some integrations (like Primavera and Maximo) are deployed on customer-specific domains. For these, the tenant must configure their specific `Base URL` via the Integrations Hub UI.

### 2. Encryption at Rest (`crypto_utils.py`)
To comply with enterprise security standards, STRAND never stores raw third-party credentials or API keys in plaintext in the database.
- The `update_integrations_config` route intercepts sensitive payloads (like passwords or API keys).
- It passes them through `_encrypt_token()`, which uses AES-256 symmetric encryption powered by the global server `API_KEY`.
- At runtime, integration clients (e.g., `maximo_client.py`) pull the encrypted string from Supabase/Redis and call `_decrypt_token()` in memory before making external HTTP requests.

---

## 1. Autodesk Construction Cloud (ACC)
Autodesk Construction Cloud (ACC) and BIM 360 are integrated via Autodesk Platform Services (formerly Forge).

### Flow:
1. User clicks "Connect" on the Autodesk card in the Integrations Hub.
2. The STRAND backend (`/autodesk/authorize`) generates a secure redirect URL targeting `developer.api.autodesk.com`.
3. The URL includes the `tenant_id` safely encoded in the OAuth `state` parameter to prevent CSRF.
4. The user logs in on Autodesk's site and grants permissions to STRAND.
5. Autodesk redirects to STRAND's `/autodesk/callback` with a short-lived `code`.
6. STRAND backend exchanges the code for Access and Refresh tokens.
7. Tokens are encrypted using `crypto_utils.py` and saved to the `tenant_integrations` table in Supabase.

### Environment Setup (`.env`):
```env
AUTODESK_CLIENT_ID="your_autodesk_client_id"
AUTODESK_CLIENT_SECRET="your_autodesk_client_secret"
```

---

## 2. Procore
Procore is the industry-standard construction management platform. It uses a strict 3-legged OAuth Authorization Code Grant.

### Flow:
1. User clicks "Connect" on the Procore card in the UI.
2. The STRAND backend (`/procore/authorize`) generates a redirect URL targeting `login.procore.com`.
3. The `tenant_id` is encoded in the `state` parameter to map the session back to the correct tenant on callback.
4. The user logs in via Procore and authorizes the STRAND application.
5. Procore redirects to STRAND's `/procore/callback` with a short-lived authorization `code`.
6. The backend exchanges the code for an Access Token and Refresh Token.
7. The tokens are immediately encrypted via AES-256 (`crypto_utils.py`) and saved to Supabase.

### Environment Setup (`.env`):
```env
PROCORE_CLIENT_ID="your_procore_client_id"
PROCORE_CLIENT_SECRET="your_procore_client_secret"
```

---

## 3. Oracle Primavera P6 EPPM
Unlike ACC/Procore, Primavera instances are deployed per-customer. We implemented a 3-legged OAuth flow that dynamically targets the customer's identity domain.

### Flow:
1. User enters their Primavera `Base URL` in the UI config.
2. User clicks "Authenticate with Oracle".
3. Backend retrieves the `Base URL`, appends `/oauth2/v1/authorize`, and redirects the user.
4. User logs in via Oracle Identity Cloud Service (IDCS).
5. Callback exchanges the code for tokens and encrypts them.

### Demo Mode:
If `DEMO_MODE=True` in `.env`, the `/primavera/authorize` route will redirect the user to a mock HTML page at `/primavera/mock-oracle-login`. This perfectly simulates the Oracle SSO experience without requiring an actual $50k enterprise license.

### Environment Setup (`.env`):
```env
PRIMAVERA_CLIENT_ID="your_oracle_confidential_app_id"
PRIMAVERA_CLIENT_SECRET="your_oracle_confidential_app_secret"
```

---

## 4. IBM Maximo Application Suite (MAS)
IBM Maximo does not natively expose a 3-legged Authorization Code flow for external REST APIs. IBM's official best practice (Maximo 7.6.1.2+) is **API Key Authentication** for OSLC REST endpoints.

### Flow:
1. User enters their `Base URL` and `API Key` in the UI config.
2. The `/config` endpoint instantly encrypts the `API Key` and saves it.
3. User clicks "Connect Now".
4. `maximo_client.py` decrypts the key in memory and pings `${base_url}/maximo/oslc/whoami` using the `apikey: <key>` request header.
5. If a `200 OK` is returned, status is marked as `connected`.

### Demo Mode:
If `DEMO_MODE=True` in `.env`, entering `tokenspark_maximo` as the API Key in the UI will bypass the real HTTP request and instantly connect the integration, revealing the AI Sync UI block.

### Environment Setup (`.env`):
*(No global Client ID required. Relies on Tenant API keys).*

---

## Verification & Sync UI
Once connected, the STRAND frontend (`page.tsx`) automatically detects the `connected` status from the `/status` API and renders specific feature blocks:
- **Autodesk:** "Fetch Latest Models" (Syncs drawings for Vision AI checking).
- **Maximo:** "Sync Work Orders" (Syncs asset history for Predictive Maintenance).

These UI actions trigger the unified `/api/integrations/{id}/sync` endpoint on the backend.
