# 🚀 MEHKO AI Hosting Architecture Guide

## 📋 **Document Purpose**
This document provides comprehensive information about the MEHKO AI application architecture to assist with hosting decisions and deployment planning.

---

## 🏗️ **Application Architecture Overview**

MEHKO AI is a **multi-service microservices application** with the following components:

### **Service Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│                        MEHKO AI Application                    │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Layer  │  API Gateway  │  Backend Services          │
│  ┌─────────────┐ │ ┌───────────┐ │ ┌─────────────┐ ┌─────────┐ │
│  │ React SPA   │ │ │Node.js    │ │ │Python      │ │Node.js  │ │
│  │ (Port 5173) │ │ │Gateway    │ │ │FastAPI     │ │AI      │ │
│  │             │ │ │(Port 3001)│ │ │(Port 8000) │ │Server  │ │
│  └─────────────┘ │ └───────────┘ │ └─────────────┘ │(Port 3000)│ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 **Repository Layout & Paths**

### **1. React Frontend Application**
- **Root Path**: `/src/`
- **Build Output**: `/dist/`
- **Entry Point**: `/src/main.jsx`
- **Main Component**: `/src/App.jsx`
- **Static Assets**: `/public/`
- **Configuration**: `vite.config.js`

**Key Directories:**
```
src/
├── components/          # React components (72 files)
├── providers/          # Context providers
├── hooks/             # Custom React hooks
├── helpers/           # Utility functions
├── firebase/          # Firebase configuration
├── styles/            # SCSS/CSS styling
└── utils/             # Utility functions
```

**Build Configuration:**
- **Framework**: Vite + React 18
- **CSS Preprocessor**: SCSS with Tailwind CSS
- **Development Port**: 5173
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`

### **2. Node.js API Gateway**
- **Root Path**: `/scripts/api-gateway.js`
- **Port**: 3001 (production), configurable via `PORT` env var
- **Purpose**: Reverse proxy and request routing

**Key Features:**
- Routes `/api/apps/*` → Python FastAPI (port 8000)
- Routes `/api/ai-chat/*` → Node.js AI Server (port 3000)
- Serves static files from `dist/` directory
- Handles CORS and request forwarding

**Dependencies:**
- Express.js 5.1.0
- CORS middleware
- Static file serving
- Request forwarding logic

### **3. Python FastAPI Worker**
- **Root Path**: `/python/`
- **Main Server**: `/python/server/main.py`
- **Port**: 8000
- **Purpose**: PDF processing, county data management

**Key Directories:**
```
python/
├── server/            # FastAPI application
│   ├── main.py       # Main server entry point
│   ├── apps_routes.py # Application endpoints
│   ├── overlay_routes.py # PDF overlay endpoints
│   └── pdf_routes.py # PDF processing endpoints
├── ingestion/         # Data ingestion scripts
├── overlay/          # PDF overlay processing
└── requirements.txt  # Python dependencies
```

**API Endpoints:**
- `/apps/*` - County application management
- `/fill-overlay` - PDF form filling
- `/extract-pdf-content` - PDF content extraction
- `/health` - Health check

**Dependencies:**
- FastAPI 0.116.1
- Uvicorn 0.35.0
- PDF processing libraries (PyMuPDF, PyPDF2)
- Firebase Admin SDK

### **4. Node.js AI Server**
- **Root Path**: `/scripts/` (various AI-related scripts)
- **Port**: 3000
- **Purpose**: AI chat, PDF analysis, form field detection

**Key Scripts:**
- AI chat functionality
- PDF analysis and processing
- Form field detection
- Admin operations

---

## 🔧 **Development Environment Setup**

### **Port Configuration**
```
React Dev Server: 5173 (Vite)
Node.js AI Server: 3000
Python FastAPI: 8000
API Gateway: 3001
```

### **Environment Variables**
```bash
# Required for production
PORT=3001                    # API Gateway port
OPENAI_API_KEY=xxx          # OpenAI API access
FIREBASE_PROJECT_ID=xxx     # Firebase project
FIREBASE_PRIVATE_KEY=xxx    # Firebase service account
FIREBASE_CLIENT_EMAIL=xxx   # Firebase service account
```

---

## 🚀 **Production Deployment Considerations**

### **1. Frontend (React SPA)**
- **Build Command**: `npm run build`
- **Output**: Static files in `dist/` directory
- **Serving**: Can be served by any static file server
- **CDN**: Suitable for CDN deployment
- **Framework**: Vite builds optimized production bundle

### **2. API Gateway (Node.js)**
- **Runtime**: Node.js 18+
- **Process Manager**: PM2, Docker, or cloud-native
- **Scaling**: Horizontal scaling with load balancer
- **Static Files**: Serves React build output
- **Reverse Proxy**: Routes requests to appropriate backends

### **3. Python FastAPI Worker**
- **Runtime**: Python 3.8+
- **WSGI Server**: Uvicorn (ASGI)
- **Process Manager**: Gunicorn + Uvicorn workers
- **Scaling**: Multiple worker processes
- **Dependencies**: Heavy PDF processing libraries

### **4. Node.js AI Server**
- **Runtime**: Node.js 18+
- **Process Manager**: PM2, Docker, or cloud-native
- **Scaling**: Horizontal scaling
- **AI Integration**: OpenAI API calls

---

## 🌐 **Hosting Platform Recommendations**

### **Option 1: Traditional VPS/Cloud**
- **Frontend**: Nginx/Apache serving `dist/` files
- **API Gateway**: Node.js process on port 3001
- **Python Worker**: Python process on port 8000
- **AI Server**: Node.js process on port 3000
- **Load Balancer**: Nginx for routing

### **Option 2: Containerized (Docker)**
- **Frontend**: Nginx container serving static files
- **API Gateway**: Node.js container
- **Python Worker**: Python container
- **AI Server**: Node.js container
- **Orchestration**: Docker Compose or Kubernetes

### **Option 3: Serverless/Cloud Functions**
- **Frontend**: Vercel, Netlify, or S3 + CloudFront
- **API Gateway**: AWS API Gateway + Lambda
- **Python Worker**: AWS Lambda or Google Cloud Functions
- **AI Server**: AWS Lambda or Google Cloud Functions

### **Option 4: Platform as a Service**
- **Frontend**: Vercel, Netlify, or Heroku
- **API Gateway**: Heroku, Railway, or Render
- **Python Worker**: Heroku, Railway, or Render
- **AI Server**: Heroku, Railway, or Render

---

## 📊 **Resource Requirements**

### **Memory Requirements**
- **React Frontend**: 50-100MB (static files)
- **API Gateway**: 100-200MB
- **Python Worker**: 500MB-1GB (PDF processing)
- **AI Server**: 200-400MB

### **CPU Requirements**
- **Frontend**: Minimal (static serving)
- **API Gateway**: Low (routing only)
- **Python Worker**: High (PDF processing intensive)
- **AI Server**: Medium (AI API calls)

### **Storage Requirements**
- **Application Code**: ~100MB
- **Dependencies**: ~500MB (Python), ~200MB (Node.js)
- **Runtime Data**: Variable (PDF processing, logs)
- **Static Assets**: ~50MB (images, CSS, JS)

---

## 🔒 **Security Considerations**

### **Environment Variables**
- All API keys must be environment variables
- Firebase service account keys are sensitive
- OpenAI API key must be secured

### **CORS Configuration**
- Currently configured for localhost development
- Must be updated for production domains
- Consider implementing proper CORS policies

### **Firebase Security**
- Service account keys must be secured
- Firestore security rules must be configured
- Authentication must be properly implemented

---

## 📝 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Build React application (`npm run build`)
- [ ] Test all services locally
- [ ] Verify environment variables
- [ ] Check Firebase configuration
- [ ] Validate API endpoints

### **Deployment Steps**
- [ ] Deploy static frontend files
- [ ] Deploy Python FastAPI worker
- [ ] Deploy Node.js AI server
- [ ] Deploy API Gateway
- [ ] Configure load balancer/reverse proxy
- [ ] Update CORS settings
- [ ] Configure SSL certificates

### **Post-Deployment**
- [ ] Verify health check endpoints
- [ ] Test all API routes
- [ ] Monitor service logs
- [ ] Check performance metrics
- [ ] Validate PDF processing
- [ ] Test AI functionality

---

## 🆘 **Troubleshooting Common Issues**

### **Port Conflicts**
- Ensure all services use different ports
- Check for existing processes using required ports
- Use environment variables for port configuration

### **CORS Issues**
- Update CORS origins for production domains
- Verify API Gateway CORS configuration
- Check browser console for CORS errors

### **PDF Processing Failures**
- Verify Python dependencies are installed
- Check available memory for large PDFs
- Validate PDF file formats

### **AI Service Issues**
- Verify OpenAI API key and quota
- Check network connectivity to OpenAI
- Monitor API response times

---

## 📚 **Additional Resources**

- **Project README**: `/README.md`
- **Project Structure**: `/PROJECT_STRUCTURE.md`
- **AI Instructions**: `/AI_INSTRUCTIONS.md`
- **Development Scripts**: `/scripts/README.md`
- **Python Requirements**: `/python/requirements.txt`
- **Package Configuration**: `/package.json`

---

## 🤝 **Support & Questions**

For additional information about this application architecture or hosting requirements, refer to:
- Project documentation in `/docs/` directory
- Configuration files in project root
- Service startup scripts in `/scripts/` directory
- Environment configuration examples
