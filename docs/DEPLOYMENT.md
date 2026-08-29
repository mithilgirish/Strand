# Deployment Guide

This guide covers deploying STRAND to production environments.

---

## Option 1 — Render (Recommended for Quick Deploy)

STRAND ships with a [`render.yaml`](../render.yaml) configuration for one-click deployment on [Render.com](https://render.com).

1. Fork the repository.
2. Create a new Render account and connect your GitHub.
3. Click **New Blueprint** and select your fork.
4. Render will automatically read `render.yaml` and create the backend service.
5. Set the following environment variables in the Render dashboard (marked `sync: false` for security):
   - `GROQ_API_KEY`
   - `NEO4J_URI`, `NEO4J_PASSWORD`
   - `SUPABASE_URL`, `SUPABASE_JWT_SECRET`
   - `API_KEY`

---

## Option 2 — Docker Compose (Self-Hosted)

For a full self-hosted stack including Neo4j and Redis:

```bash
git clone https://github.com/mithilgirish/Strand.git
cd Strand
cp backend/.env.example backend/.env    # Fill in your API keys
docker compose up -d
```

Services:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Neo4j Browser**: http://localhost:7474
- **Redis**: localhost:6379

To view logs:
```bash
docker compose logs -f backend
```

To stop:
```bash
docker compose down
```

---

## Option 3 — Vercel + Render (Production Split)

This is the recommended production architecture for teams:

| Service | Host | Notes |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | Connect the `/frontend` directory |
| **Backend API** | [Render](https://render.com) | Use `render.yaml` |
| **Neo4j** | [Neo4j AuraDB Free Tier](https://neo4j.com/cloud/aura/) | Free up to 200K nodes |
| **Redis** | [Upstash](https://upstash.com) | Free tier, serverless |
| **Auth** | [Supabase](https://supabase.com) | Free tier |

### Frontend Environment Variables (Vercel)

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## Environment Variables Reference

| Variable | Description | Required |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Groq LLM API key | ✅ |
| `NEO4J_URI` | Neo4j Bolt URI (`bolt://` or `neo4j+s://`) | ✅ |
| `NEO4J_USERNAME` | Neo4j username (default: `neo4j`) | ✅ |
| `NEO4J_PASSWORD` | Neo4j password | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) | ✅ |
| `REDIS_URL` | Redis connection URL | ❌ (falls back to in-memory) |
| `DEMO_MODE` | Set to `True` to use mock data | ❌ |
| `API_KEY` | Static API key for unauthenticated routes | ❌ |
| `LLM_MODEL` | LLM model name (default: `llama-3.3-70b-versatile`) | ❌ |

---

## Health Check

Once deployed, verify all services are healthy:

```bash
curl https://your-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "neo4j": "connected",
  "chromadb": "connected",
  "version": "1.0.0"
}
```
