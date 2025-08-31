# 🏗️ MEHKO AI Hosting & Infra Plan

## 🎯 Goal
Deploy MEHKO AI with minimal cost + simple scaling.
- Frontend → Cloudflare Pages (static React build)
- Backend (Node API Gateway + Node AI Server + Python FastAPI) → 1 VPS (Hetzner CX22)
- Reverse proxy + HTTPS → Caddy
- DB → Firebase Firestore (existing)
- Cache/Queue → Upstash Redis free tier
- File storage → S3 bucket (`back-channel-media` us-west-1)

## 📂 Key Repo Paths
- React Frontend: `/src/` → build `/dist/`
- Node API Gateway: `/scripts/api-gateway.js`
- Node AI Server: `/server.js` (main AI server)
- Python FastAPI Worker: `/python/server/main.py`

## 🌐 Domain Configuration
- **Primary Domain**: mehko.ai (registered on Spaceship)
- **Frontend**: mehko.ai (Cloudflare Pages)
- **API**: api.mehko.ai (VPS with Caddy)
- **DNS Setup**: 
  - mehko.ai → Cloudflare Pages
  - api.mehko.ai → VPS IP (Hetzner)

## 📝 Progress Log
- [x] Agreed on baseline infra (VPS + Docker Compose + Cloudflare Pages)
- [x] Analyzed current service architecture
- [ ] Create `docker-compose.yml` (baseline written by ChatGPT)
- [ ] Add Dockerfiles for:
  - [ ] API Gateway
  - [ ] AI Server  
  - [ ] FastAPI Worker
- [ ] Add `Caddyfile` for reverse proxy + SSL
- [ ] Create production environment files
- [ ] Deploy React build to Cloudflare Pages
- [ ] Configure domain (Spaceship → Cloudflare → VPS + Pages)
- [ ] Connect to Firebase Firestore + Upstash Redis
- [ ] Test PDF jobs (10 concurrent) on VPS
- [ ] Add monitoring/logging (Sentry, health checks)

## 🔧 Service Architecture (Production)
```
┌─────────────────────────────────────────────────────────────────┐
│                        MEHKO AI Production                    │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Cloudflare Pages)  │  Backend (Hetzner VPS)        │
│  ┌─────────────────────────┐ │ ┌─────────────────────────────┐ │
│  │ mehko.ai               │ │ │ Caddy (Reverse Proxy)      │ │
│  │ React SPA (Static)     │ │ │ ├─ api.mehko.ai            │ │
│  │ Build: /dist/          │ │ │ ├─ Node AI Server (3000)   │ │
│  │ CDN: Cloudflare        │ │ │ ├─ Python FastAPI (8000)   │ │
│  │                        │ │ │ └─ API Gateway (3001)      │ │
│  └─────────────────────────┘ │ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🐳 Docker Configuration
- **API Gateway**: Node.js container (Port 3001)
- **AI Server**: Node.js container (Port 3000) 
- **FastAPI Worker**: Python container (Port 8000)
- **Reverse Proxy**: Caddy container (Port 80/443)
- **Orchestration**: Docker Compose

## 🔑 Environment Variables (Production)
```bash
# Node.js Services
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=xxx
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx

# Python FastAPI
PYTHONPATH=/app
# Firebase Firestore - uses existing Firebase project
REDIS_URL=redis://xxx

# Caddy
DOMAIN=api.mehko.ai
```

## 📊 Resource Requirements (Hetzner CX22)
- **CPU**: 2 vCPUs (sufficient for MVP)
- **RAM**: 4GB (adequate for all services)
- **Storage**: 40GB SSD (plenty for app + data)
- **Bandwidth**: 20TB (more than enough)

## 🚀 Deployment Strategy
1. **Phase 1**: Deploy to VPS with Docker Compose
2. **Phase 2**: Configure Cloudflare Pages for frontend
3. **Phase 3**: Set up domain and SSL
4. **Phase 4**: Connect external services (Firebase, Upstash, S3)
5. **Phase 5**: Monitoring and optimization

## 🔒 Security Considerations
- All API keys as environment variables
- Caddy handles SSL termination
- Firebase service account secured
- CORS configured for production domains
- Rate limiting on API endpoints

## 📈 Scaling Path
- **Current**: Single VPS with all services
- **Next**: Separate services to different VPS instances
- **Future**: Kubernetes cluster or cloud-native deployment

---

**Notes:**
- Cursor AI + ChatGPT share/update this file.
- Keep log incremental (`- [x]` checkboxes when done).
- All infra config lives in root (`docker-compose.yml`, `Caddyfile`, `INFRA_PLAN.md`).
- Monitor resource usage and upgrade VPS if needed.
