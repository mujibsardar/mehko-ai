# 🚀 Production Server AI Guide - Single-Server Migration

## 📋 **Quick Summary for Production AI**

**What Changed:** MEHKO AI has been migrated from a dual-server architecture (Node.js + Python) to a **single Python FastAPI backend**.

## ✅ **Migration Status: COMPLETED**

### **Before (Old Architecture):**
```
Frontend → API Gateway (Port 3001) → Node.js (Port 3000) + Python (Port 8000)
```

### **After (New Architecture):**
```
Frontend → Python FastAPI (Port 8000) [All services unified]
```

## 🔧 **What You Need to Know**

### **1. Backend Services (All on Python Port 8000):**
- **AI Chat** - `/api/ai-chat` (with full context support)
- **AI PDF Analysis** - `/api/ai-analyze-pdf`
- **Admin Functions** - `/api/admin/*`
- **Form Management** - `/api/save-progress`, `/api/form-fields`, `/api/download-pdf`
- **PDF Processing** - `/api/fill-pdf`, `/api/apps/*`

### **2. Production Deployment:**
- **Docker Compose** - Only `fastapi-worker` service needed
- **Caddy** - Direct proxy to `fastapi-worker:8000`
- **Environment** - `OPENAI_API_KEY` in `fastapi-worker` service

### **3. Frontend Configuration:**
- **Production:** `VITE_API_URL=https://api.mehko.ai`
- **Development:** `VITE_API_URL=http://127.0.0.1:8000`

## 🚨 **Critical Changes Made**

### **Removed Services:**
- ❌ Node.js server (`server.js`)
- ❌ API Gateway (`scripts/api-gateway.js`)
- ❌ Port 3000 and 3001 dependencies

### **Updated Services:**
- ✅ Python FastAPI - Now handles ALL backend functionality
- ✅ Frontend - All API calls use `/api` prefix
- ✅ Scripts - Updated for single-server architecture

## 📁 **Key Files Changed**

### **Backend:**
- `python/server/main.py` - Unified FastAPI app
- `python/server/ai_routes.py` - AI chat with full context
- `python/server/admin_routes.py` - Admin functions
- `docker-compose.yml` - Single service configuration
- `Caddyfile` - Direct proxy to FastAPI

### **Frontend:**
- `src/config/api.js` - All endpoints use Python backend
- `src/lib/apiBase.js` - Updated API base URLs
- All components updated to use `/api` prefix

### **Scripts:**
- `scripts/start-all-services.sh` - Single-server startup
- `scripts/stop-all-services.sh` - Updated service stopping
- `scripts/status-all-services.sh` - Single-server status

## 🔍 **Testing Checklist**

### **Development Testing:**
1. ✅ Start Python backend: `cd python && uvicorn server.main:app --reload`
2. ✅ Test AI chat: `curl -X POST http://127.0.0.1:8000/api/ai-chat`
3. ✅ Test PDF loading: `curl http://127.0.0.1:8000/api/apps/.../pdf`
4. ✅ Test frontend integration

### **Production Testing:**
1. ✅ Deploy with updated `docker-compose.yml`
2. ✅ Verify Caddy proxy to FastAPI
3. ✅ Test all endpoints on production domain
4. ✅ Verify AI chat functionality

## 🚀 **Deployment Commands**

### **Local Development:**
```bash
# Start single backend
cd python && uvicorn server.main:app --host 127.0.0.1 --port 8000 --reload

# Start frontend
npm run dev
```

### **Production:**
```bash
# Deploy with Docker
docker-compose up -d

# Check status
docker-compose ps
```

## ⚠️ **Important Notes**

1. **No More Node.js** - All backend functionality is now in Python
2. **API Prefix** - All endpoints now use `/api` prefix
3. **Full Context** - AI chat now has complete application context
4. **Simplified Architecture** - Easier to maintain and deploy

## 🆘 **Troubleshooting**

### **Common Issues:**
- **404 Errors** - Check if endpoints use `/api` prefix
- **AI Chat Issues** - Verify OpenAI API key in environment
- **PDF Loading** - Check if Python backend is running on port 8000

### **Health Checks:**
- Backend: `curl http://localhost:8000/health`
- AI Status: `curl http://localhost:8000/api/ai-status`
- Apps API: `curl http://localhost:8000/api/apps`

---

**🎉 The migration is complete! The system is now running on a single, unified Python backend with full functionality preserved and enhanced.**
