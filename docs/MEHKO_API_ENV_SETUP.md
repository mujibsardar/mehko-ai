# MEHKO.ai — API & Environment Setup (Prod vs Dev)

## TL;DR
- Frontend must call the API via **API_BASE**.
- **Production API base:** `https://api.mehko.ai`
- **Local API base:** `http://127.0.0.1:3001`
- Do **not** call `https://mehko.ai/api/...` (that’s the Pages site; it returns HTML).

---

## 1) Hosts & DNS
**Production**
- App (frontend): `https://mehko.ai` (Cloudflare Pages)
- API: `https://api.mehko.ai` (Hetzner VPS behind Caddy)
- Cloudflare DNS:
  - `A  api  <VPS_IP>` → **DNS only (gray)**
  - Root `mehko.ai` managed by Pages (no manual A records)

**Local Dev**
- App: `http://localhost:5173` (Vite dev server) or `dist/` preview
- API Gateway (Docker): `http://127.0.0.1:3001`

---

## 2) Frontend config (Vite)
Set env vars (must start with **VITE_**).

**Production (Cloudflare Pages → Project → Settings → Environment variables):**
```
VITE_API_URL = https://api.mehko.ai

# Firebase (your web config)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...   # if used
```

**Local (.env.local – not committed):**
```
VITE_API_URL=http://127.0.0.1:3001
# plus your dev Firebase keys (or same project)
```

**Use it in code (single source of truth):**
```js
// src/lib/apiBase.js
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (location.hostname === 'localhost' ? 'http://127.0.0.1:3001' : 'https://api.mehko.ai');

// Example
const res = await fetch(`${API_BASE}/api/apps/...`);
```
**Tip:** grep for any direct uses of `/api/...` and change them to `${API_BASE}/api/...`.

---

## 3) Safety net redirect (Pages)
If the app ever calls `/api/*` on the web host, add this redirect:

**Pages → Project → Redirects → Add**
- **Source:** `/api/*`
- **Destination:** `https://api.mehko.ai/api/:splat`
- **Status:** `307`

---

## 4) Server layout (VPS via docker-compose)
Services:
- **caddy** (ports 80/443) → TLS + reverse proxy
- **api-gateway** (Node, port 3001)
- **fastapi-worker** (Uvicorn, port 8000)
- **ai-server** (Node, port 3000)

**Caddyfile (essentials):**
```caddy
{
  email admin@mehko.ai
}

api.mehko.ai {
  @health path /health
  header @health Content-Type application/json
  respond @health "{"ok":true}" 200

  reverse_proxy http://api-gateway:3001
}
```

**API Gateway (key routes):**
```js
// /scripts/api-gateway.js (high level)
app.get('/health', (_req, res) => res.json({ ok: true }));

// AI server proxies
app.use('/api/ai-chat',        (req,res)=>forwardRequest(AI_SERVER_URL, req, res));
app.use('/api/ai-analyze-pdf', (req,res)=>forwardRequest(AI_SERVER_URL, req, res));
app.use('/api/form-fields',    (req,res)=>forwardRequest(AI_SERVER_URL, req, res));
app.use('/api/fill-pdf',       (req,res)=>forwardRequest(AI_SERVER_URL, req, res));

// FastAPI proxies
app.use('/api/apps',           (req,res)=>forwardRequest(FASTAPI_URL, req, res));
app.use('/api/process-county', (req,res)=>forwardRequest(FASTAPI_URL, req, res));
```

---

## 5) Deploy / Restart cheatsheet (VPS)
After pulling changes, rebuild only what changed:

```bash
cd ~/mehko-ai
git pull

# If FastAPI changed
docker-compose up -d --build fastapi-worker && docker-compose logs -f fastapi-worker

# If API Gateway changed
docker-compose up -d --build api-gateway && docker-compose logs -f api-gateway

# If Caddyfile changed
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# All services (safe catch-all)
docker-compose up -d --build
```

**Pages (frontend):**
- Production branch builds automatically (`npm run build`, output `dist`).

---

## 6) Health checks
```bash
# API host (Caddy)
curl -s https://api.mehko.ai/health

# API through gateway/backends
curl -i https://api.mehko.ai/api/apps/health | head

# Sanity: Pages should NOT serve API
curl -I https://mehko.ai/api/ping   # should redirect to api.mehko.ai if redirect is set
```

---

## 7) Common errors
- **Unexpected token '<'**: You hit `https://mehko.ai/api/...`. Use `API_BASE` or the Pages redirect.
- **Firebase `auth/invalid-api-key`**: Missing/incorrect `VITE_FIREBASE_*` on Pages; also add domains in Firebase Auth → Authorized domains (`mehko.ai`, `www.mehko.ai`, `*.pages.dev`).
- **HTTPS not working**: Caddy tried ACME before DNS existed. Reload Caddy (or remove `/data/caddy/acme` & reload) to retry cert issuance.
- **503 Bad Gateway**: API Gateway can't reach backend services. Check:
  - Local dev: Ensure `FASTAPI_URL` and `AI_SERVER_URL` point to `127.0.0.1` (not Docker service names)
  - Production: Verify Docker containers are running and network connectivity
  - Check logs: `./scripts/watch-logs.sh` or individual service logs

---

## 8) Production Deployment Notes
**First Production Deployment:** September 1, 2025

### Deployment Checklist
- [x] Frontend deployed to Cloudflare Pages (`https://mehko.ai`)
- [x] API deployed to Hetzner VPS (`https://api.mehko.ai`)
- [x] All services running via Docker Compose
- [x] SSL certificates configured via Caddy
- [x] DNS configured for proper routing
- [x] Environment variables configured in Cloudflare Pages
- [x] Firebase Auth domains configured
- [x] Health checks passing

### Local Development Fixes
- **Issue**: 503 Bad Gateway when using AI chat in local development
- **Root Cause**: API Gateway trying to connect to Docker service names (`ai-server`, `fastapi-worker`) instead of localhost URLs
- **Solution**: 
  - Updated `scripts/api-gateway.js` to use `127.0.0.1` by default
  - Created `.env.local` with explicit local development URLs
  - Restart API Gateway after configuration changes

### Troubleshooting Commands
```bash
# Check service status
./scripts/status-all-services.sh

# Test API endpoints
curl http://localhost:3001/api/ai-chat/health
curl http://localhost:3001/api/apps/health

# Watch logs for errors
./scripts/watch-logs.sh

# Restart specific service
pkill -f "api-gateway.js" && node scripts/api-gateway.js > logs/gateway.log 2>&1 &
```
