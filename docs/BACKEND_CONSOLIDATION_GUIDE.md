# MEHKO AI — Single-Server Consolidation (COMPLETED ✅)

**Status:** ✅ **COMPLETED** - Successfully consolidated from dual-server to single Python FastAPI backend.

**Architecture:** One Python FastAPI backend behind Caddy at **api.mehko.ai**. Frontend (Cloudflare Pages) calls the API directly.

## ✅ **Migration Completed - What Changed**

### **Backend Services Migrated:**
- ✅ **AI Chat** - Full context support with application, steps, form data, PDF text
- ✅ **AI PDF Analysis** - PDF field detection and analysis
- ✅ **Admin Functions** - County processing and management
- ✅ **Form Management** - Save progress, form fields, PDF download
- ✅ **PDF Processing** - Fill PDF, overlay management

### **Frontend Updates:**
- ✅ **API Configuration** - All endpoints now use `/api` prefix
- ✅ **Component Updates** - All components updated to use Python backend
- ✅ **Script Updates** - Start/stop/status scripts updated for single-server

### **Infrastructure:**
- ✅ **Docker Compose** - Updated to single Python service
- ✅ **Caddyfile** - Direct proxy to FastAPI
- ✅ **Environment** - Simplified configuration

---

## 1) Final Production Shape

- **Frontend:** Cloudflare Pages → `https://mehko.ai`
- **API (only backend):** Hetzner VPS (Docker) → `https://api.mehko.ai`
- **DNS (Cloudflare):**
  - `A  api  <VPS_IP>` → **DNS only (gray cloud)**
  - Root domain handled by Pages; do not add A records for `mehko.ai`
- **TLS:** Caddy obtains certs (Let’s Encrypt/ZeroSSL).

```
mehko.ai (Pages) ──► browser
                       │
                       ▼
api.mehko.ai ──► Caddy ──► FastAPI (uvicorn, :8000)
```

---

## 2) Frontend Config (no gateway)

- **Prod:** Pages → Project → **Environment variables**
  - `VITE_API_URL=https://api.mehko.ai`
  - Firebase keys (`VITE_FIREBASE_*`) as before
- **Local:** `.env.local`
  - `VITE_API_URL=http://127.0.0.1:8000` *(if you run FastAPI directly)* or `http://127.0.0.1:3001` *(if using old gateway temporarily)*
- **In code (single source of truth):**
```js
// src/lib/apiBase.js
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (location.hostname === 'localhost' ? 'http://127.0.0.1:8000' : 'https://api.mehko.ai');
```

**Optional safety on Pages:** Redirect `/api/*` → `https://api.mehko.ai/api/:splat` (307).

---

## 3) Docker Compose (trimmed)

**Remove** `ai-server` and `api-gateway` services. Keep only **caddy** and **fastapi-worker**.

```yaml
# docker-compose.yml (relevant bits)
services:
  fastapi-worker:
    build:
      context: .
      dockerfile: Dockerfile.fastapi
    environment:
      PYTHONPATH: /app/python
      FIREBASE_SERVICE_ACCOUNT_PATH: /app/config/serviceAccountKey.json
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:8000/health || exit 1"]
      interval: 10s
      timeout: 3s
      retries: 5

  caddy:
    image: caddy:2-alpine
    depends_on:
      - fastapi-worker
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
volumes:
  caddy-data:
```

---

## 4) Caddyfile (point directly to FastAPI)

```caddy
{
  email admin@mehko.ai
}

api.mehko.ai {
  @health path /health
  header @health Content-Type application/json
  respond @health "{"ok":true}" 200

  reverse_proxy http://fastapi-worker:8000
}
```

**Apply:** `docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile`

---

## 5) FastAPI (unified routers)

Keep existing paths working to avoid frontend churn. You can introduce new canonical paths, but **add 307 redirects** so old routes continue to function.

```py
# server/main.py (sketch)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.routers import ai_routes, admin_routes, apps_routes, overlay_routes

app = FastAPI(title="MEHKO AI Unified Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://mehko.ai",
        "https://api.mehko.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(apps_routes.router, prefix="/api/apps")
app.include_router(admin_routes.router, prefix="/api/admin")
app.include_router(ai_routes.router,    prefix="/api")        # handles /api/ai-chat, /api/ai-analyze-pdf, etc.
app.include_router(overlay_routes.router, prefix="/api")      # /api/fill-pdf, etc.

@app.get("/health")
def health():
    return {"ok": True}
```

**Defer renames** (`/api/ai-chat` → `/api/ai/chat`) until after prod parity; then add redirects.

---

## 6) Deploy / Restart (now simpler)

```bash
cd ~/mehko-ai
git pull

# Build only what changed
docker-compose up -d --build fastapi-worker
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Or rebuild everything (safe catch-all)
docker-compose up -d --build
```

---

## 7) Health Checks

```bash
# Caddy host
curl -s https://api.mehko.ai/health

# Example app route
curl -i https://api.mehko.ai/api/apps/health | head
```

If cert failed earlier (pre-DNS), just `caddy reload` after DNS is correct.

---

## 8) Cleanup Plan

1) Remove services: `ai-server`, `api-gateway` from compose + repo.  
2) Remove gateway-specific code/vars.  
3) Ensure **all** FE calls use `API_BASE`.  
4) Keep legacy API paths working; add redirects only after parity.  
5) Update docs (`DEPLOYMENT.md`, `INFRA_PLAN.md`) to reflect single-backend.  

---

## 9) Common Pitfalls

- **Unexpected token '<'**: You hit `mehko.ai/api/...` (Pages HTML). Use `API_BASE` or Pages redirect.  
- **Firebase `auth/invalid-api-key`**: Missing/incorrect `VITE_FIREBASE_*` on Pages; add domains in Firebase Auth (`mehko.ai`, `*.pages.dev`).  
- **CORS**: Make sure `mehko.ai` and `localhost` are in `allow_origins`.  

---

## 10) Summary for Agents

- There is **no Node** and **no API Gateway** in prod.  
- All backend lives in **FastAPI on :8000**, fronted by **Caddy** at `api.mehko.ai`.  
- Frontend must use **`VITE_API_URL=https://api.mehko.ai`**.  
- Preserve existing API paths first; refactor paths later with redirects.
