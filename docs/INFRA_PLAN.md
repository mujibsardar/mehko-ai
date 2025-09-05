# 🏗️ MEHKO AI Hosting & Infra Plan

## 🎯 Goal
Deploy MEHKO AI with minimal cost + simple scaling.
- Frontend → Cloudflare Pages (static React build)
- Backend (Node API Gateway + Node AI Server + Python FastAPI) → 1 VPS (Hetzner CX22)
- Reverse proxy + HTTPS → Caddy
- DB → Neon (Postgres free tier)
- Cache/Queue → Upstash Redis free tier
- File storage → S3 bucket (`back-channel-media` us-west-1)

## 📂 Key Repo Paths
- React Frontend: `/src/` → build `/dist/`
- Node API Gateway: `/scripts/api-gateway.js`
- Node AI Server: `/scripts/`
- Python FastAPI Worker: `/python/server/main.py`

## 📝 Progress Log
- [x] Agreed on baseline infra (VPS + Docker Compose + Cloudflare Pages)
- [ ] Create `docker-compose.yml` (baseline written by ChatGPT)
- [ ] Add Dockerfiles for:
  - [ ] API Gateway
  - [ ] AI Server
  - [ ] FastAPI Worker
- [ ] Add `Caddyfile` for reverse proxy + SSL
- [ ] Deploy React build to Cloudflare Pages
- [ ] Configure domain (Spaceship → Cloudflare → VPS + Pages)
- [ ] Connect to Neon Postgres + Upstash Redis
- [ ] Test PDF jobs (10 concurrent) on VPS
- [ ] Add monitoring/logging (Sentry, health checks)

## 🔑 Notes
- Cursor AI + ChatGPT share/update this file.
- Keep log incremental (`- [x]` checkboxes when done).
- All infra config lives in root (`docker-compose.yml`, `Caddyfile`, `INFRA_PLAN.md`).

---
