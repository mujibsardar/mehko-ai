# 🚀 MEHKO AI Production Deployment Context

## 📋 **Quick Overview**
MEHKO AI is a **single-server architecture** application that helps users fill out county health permit applications using AI-powered form field detection and PDF processing.

**Architecture:**
- **Frontend**: React SPA on Cloudflare Pages (`https://mehko.ai`)
- **Backend**: Python FastAPI on Hetzner VPS (`https://api.mehko.ai`)
- **Database**: Firebase Firestore
- **Storage**: Local filesystem (PDFs included in Git)

## 🏗️ **Current Production Setup**

### **Services:**
- **Python FastAPI** (Port 8000) - Unified backend handling ALL services:
  - AI Chat & Analysis (`/api/ai-chat`, `/api/ai-analyze-pdf`)
  - PDF Processing (`/api/fill-pdf`, `/api/extract-pdf-content`)
  - Admin Functions (`/api/admin/*`)
  - Form Management (`/api/form-fields`, `/api/save-progress`)
  - County Applications (`/api/apps/*`)

### **Key Files:**
- `python/server/main.py` - Main FastAPI application
- `python/server/apps_routes.py` - County applications and PDF endpoints
- `python/server/ai_routes.py` - AI chat and analysis
- `docker-compose.yml` - Production deployment (single FastAPI service)
- `Caddyfile` - Reverse proxy configuration
- `scripts/single_server_golive_checklist.sh` - Production validation

## 🔧 **Common Production Issues & Solutions**

### **1. PDF 404 Errors (CURRENT ISSUE)**
**Problem**: PDFs return 404 on production
**Likely Causes:**
- PDF files not deployed to production server
- Incorrect file paths in Docker container
- Missing volume mounts in docker-compose.yml
- File permissions issues

**Debugging Steps:**
```bash
# Check if PDFs exist in container
docker-compose exec fastapi-worker ls -la /app/data/applications/alameda_county_mehko/forms/MEHKO_APP_SOP/

# Check specific PDF endpoint
curl -I https://api.mehko.ai/api/apps/alameda_county_mehko/forms/MEHKO_APP_SOP/pdf

# Check container logs
docker-compose logs fastapi-worker | grep -i "pdf\|404\|error"

# Verify volume mounts
docker-compose exec fastapi-worker mount | grep data
```

**Quick Fixes:**
```bash
# Rebuild with fresh data
cd ~/mehko-ai
docker-compose down
docker-compose up -d --build fastapi-worker

# Check file permissions
docker-compose exec fastapi-worker chmod -R 755 /app/data/
```

### **2. AI Chat Not Working**
**Debug:**
```bash
# Check AI service status
curl -s https://api.mehko.ai/api/ai-status | jq .

# Check OpenAI API key
docker-compose exec fastapi-worker env | grep OPENAI

# Test AI endpoint
curl -X POST https://api.mehko.ai/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","context":{}}'
```

### **3. CORS Issues**
**Check CORS configuration in `python/server/main.py`:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mehko.ai",           # Production frontend
        "https://api.mehko.ai"        # Production API
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **4. SSL Certificate Issues**
```bash
# Check certificate status
echo | openssl s_client -servername api.mehko.ai -connect api.mehko.ai:443 2>/dev/null | openssl x509 -noout -dates

# Reload Caddy if needed
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## 🚀 **Deployment Commands**

### **Full Deployment:**
```bash
cd ~/mehko-ai
git pull origin main
./scripts/deploy.sh
```

### **Quick Updates:**
```bash
# Rebuild only FastAPI
docker-compose up -d --build fastapi-worker
docker-compose logs -f fastapi-worker

# Restart all services
docker-compose restart

# Check status
./scripts/status-all-services.sh
```

### **Production Validation:**
```bash
# Run comprehensive checklist
API_HOST=https://api.mehko.ai bash scripts/single_server_golive_checklist.sh
```

## 📁 **File Structure & Key Paths**

### **PDF Storage:**
```
data/applications/{county_id}/forms/{form_id}/
├── form.pdf                    # Original PDF
├── form_acroform.pdf          # AcroForm version
├── acroform-definition.json   # Field definitions
├── overlay.json               # Legacy overlay format
└── meta.json                  # Form metadata
```

### **API Endpoints:**
```
GET  /api/apps/{county}/forms/{form}/pdf                    # Download PDF
GET  /api/apps/{county}/forms/{form}/acroform-pdf          # Download AcroForm PDF
GET  /api/apps/{county}/forms/{form}/acroform-definition   # Get field definitions
GET  /api/apps/{county}/forms/{form}/text                  # Get PDF text
POST /api/apps/{county}/forms/{form}/fill                  # Fill PDF with data
```

## 🔍 **Debugging Tools**

### **Health Checks:**
```bash
# Basic health
curl -s https://api.mehko.ai/health | jq .

# AI service
curl -s https://api.mehko.ai/api/ai-status | jq .

# Apps list
curl -s https://api.mehko.ai/api/apps | jq .
```

### **Log Monitoring:**
```bash
# All services
docker-compose logs -f

# FastAPI only
docker-compose logs -f fastapi-worker

# Caddy only
docker-compose logs -f caddy
```

### **Container Access:**
```bash
# Shell into FastAPI container
docker-compose exec fastapi-worker bash

# Check file system
docker-compose exec fastapi-worker ls -la /app/data/
docker-compose exec fastapi-worker find /app/data -name "*.pdf" | head -10
```

## ⚠️ **Critical Configuration**

### **Environment Variables:**
```bash
# Required in .env.production
OPENAI_API_KEY=sk-proj-...
FIREBASE_PROJECT_ID=mehko-ai
FIREBASE_SERVICE_ACCOUNT_PATH=/app/config/serviceAccountKey.json
```

### **Docker Compose Volume Mounts:**
```yaml
volumes:
  - ./data:/app/data:ro                    # PDF data (read-only)
  - ./config:/app/config:ro                # Firebase config
  - ./config/serviceAccountKey.json:/app/config/serviceAccountKey.json:ro
```

### **Caddy Configuration:**
```caddy
api.mehko.ai {
  reverse_proxy http://fastapi-worker:8000
}
```

## 🆘 **Emergency Procedures**

### **Complete Restart:**
```bash
cd ~/mehko-ai
docker-compose down
docker-compose up -d --build
sleep 30
curl -s https://api.mehko.ai/health
```

### **Rollback:**
```bash
# Rollback to previous commit
git log --oneline -5
git checkout <previous-commit-hash>
docker-compose up -d --build
```

### **Data Recovery:**
```bash
# Check if data exists
ls -la data/applications/
docker-compose exec fastapi-worker ls -la /app/data/applications/

# Restore from backup if needed
# (Backup location: TBD)
```

## 📞 **Quick Reference**

### **Service URLs:**
- **Frontend**: https://mehko.ai
- **API**: https://api.mehko.ai
- **Health**: https://api.mehko.ai/health
- **API Docs**: https://api.mehko.ai/docs

### **Key Counties:**
- `alameda_county_mehko`
- `san_diego_county_mehko`
- `los_angeles_county_mehko`
- `riverside_county_mehko`

### **Common Form IDs:**
- `MEHKO_APP_SOP`
- `mehkosop.pdf`
- `publications_permitapp152.pdf`

---

**🎯 Current Priority**: Fix PDF 404 errors on production
**📋 Next Steps**: Debug file paths and volume mounts in Docker container
**🔧 Tools**: Use debugging commands above to identify root cause
