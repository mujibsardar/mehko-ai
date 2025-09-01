# 🚨 DEPLOYMENT ISSUE ANALYSIS: PDF Step Loading Problem

## 📋 **ISSUE SUMMARY**

**Problem**: When clicking on Alameda County (as a logged-in user) in the dashboard and then clicking on Step 2 (PDF step), the PDF doesn't load properly. Instead, it loads the root/dashboard page inside the step, creating a "website inside a website" effect.

**Affected Component**: PDF step rendering in the dashboard
**Application**: Alameda County MEHKO (Step 2: "Download & Fill MEHKO Application/SOP")
**Step Type**: PDF step with `formId: "MEHKO_APP_SOP"`

## 🔍 **ROOT CAUSE ANALYSIS**

### **1. Current System Architecture**
- **Frontend**: React SPA (Port 5173) → API Gateway (Port 3001) → Backend Services
- **Backend Services**:
  - Python FastAPI (Port 8000): PDF processing and form endpoints
  - Node.js Server (Port 3000): AI chat and admin endpoints
- **API Configuration**: `src/config/api.js` routes different endpoints to appropriate services

### **2. PDF Loading Flow**
```
DashboardApp.jsx → InterviewView.jsx → AcroFormViewer.jsx → iframe → Python FastAPI PDF endpoint
```

**Current Flow**:
1. User clicks PDF step in dashboard
2. `DashboardApp.jsx` renders `InterviewView` component
3. `InterviewView` renders `AcroFormViewer` component
4. `AcroFormViewer` creates iframe with URL: `${API_BASE}/apps/${app}/forms/${form}/pdf?inline=true`
5. API_BASE resolves to Python server (Port 8000)
6. Python server serves PDF file from `data/applications/alameda_county_mehko/forms/MEHKO_APP_SOP/form.pdf`

### **3. Verified Working Components**
✅ **Python FastAPI Server**: Running on Port 8000, serving PDFs correctly
✅ **PDF File**: Exists at `data/applications/alameda_county_mehko/forms/MEHKO_APP_SOP/form.pdf`
✅ **API Endpoint**: `http://localhost:8000/apps/alameda_county_mehko/forms/MEHKO_APP_SOP/pdf?inline=true` returns 200
✅ **PDF Content**: Binary PDF data is being served correctly

### **4. Suspected Issue Areas**

#### **A. API Configuration Mismatch**
- Recent deployment changes may have affected API routing
- `src/config/api.js` was modified but may not be correctly routing PDF requests
- Environment variables may not be properly set for production deployment

#### **B. CORS/Cross-Origin Issues**
- Iframe loading from different origins may be blocked
- Browser security policies preventing PDF display in iframe

#### **C. Content-Type/Response Headers**
- PDF may not be served with correct `Content-Type: application/pdf` header
- Missing `Content-Disposition: inline` header for iframe display

#### **D. Frontend Routing Issues**
- React Router may be intercepting iframe requests
- Dashboard component may be re-rendering and affecting iframe

## 🛠️ **INVESTIGATION STEPS FOR AI AGENT**

### **Step 1: Verify Current API Configuration**
```bash
# Check current API configuration
cat src/config/api.js

# Verify environment variables
echo $VITE_PYTHON_API
echo $VITE_NODE_API
echo $API_BASE
```

### **Step 2: Test PDF Endpoint Directly**
```bash
# Test PDF endpoint with proper headers
curl -v "http://localhost:8000/apps/alameda_county_mehko/forms/MEHKO_APP_SOP/pdf?inline=true" \
  -H "Accept: application/pdf" \
  -H "Accept-Encoding: gzip, deflate" \
  -o test.pdf

# Check if PDF is valid
file test.pdf
```

### **Step 3: Check Browser Network Tab**
1. Open browser developer tools
2. Go to Network tab
3. Click on Alameda County Step 2
4. Look for:
   - PDF request URL
   - Response status code
   - Response headers (especially Content-Type)
   - Any CORS errors

### **Step 4: Verify iframe Implementation**
Check `src/components/forms/AcroFormViewer.jsx` lines 140-150:
```javascript
<iframe
    ref={iframeRef}
    src={pdfUrl}
    className="pdf-iframe"
    title="PDF Form"
    onLoad={handleIframeLoad}
    onError={() => {
        console.error("PDF iframe failed to load");
        setError("Failed to load the PDF form. Please check your connection and try again.");
    }}
/>
```

### **Step 5: Check Python Server PDF Route**
Verify `python/server/apps_routes.py` has correct PDF serving logic:
```python
@router.get("/{app_id}/forms/{form_id}/pdf")
async def get_pdf(app_id: str, form_id: str, inline: bool = False):
    # Should return PDF with proper headers
    # Content-Type: application/pdf
    # Content-Disposition: inline; filename="form.pdf"
```

## 🔧 **LIKELY SOLUTIONS**

### **Solution 1: Fix API Configuration**
If API routing is incorrect, update `src/config/api.js`:
```javascript
const PYTHON_API_BASE = 
  (import.meta?.env?.VITE_PYTHON_API || '').trim() ||
  (API_BASE || '').trim() ||
  'http://127.0.0.1:8000';
```

### **Solution 2: Fix Python PDF Route Headers**
Ensure Python server returns correct headers:
```python
@router.get("/{app_id}/forms/{form_id}/pdf")
async def get_pdf(app_id: str, form_id: str, inline: bool = False):
    # ... existing logic ...
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={form_id}.pdf",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*"
        }
    )
```

### **Solution 3: Add iframe Sandbox Attributes**
Update iframe in `AcroFormViewer.jsx`:
```javascript
<iframe
    ref={iframeRef}
    src={pdfUrl}
    className="pdf-iframe"
    title="PDF Form"
    sandbox="allow-same-origin allow-scripts allow-forms"
    onLoad={handleIframeLoad}
    onError={() => {
        console.error("PDF iframe failed to load");
        setError("Failed to load the PDF form. Please check your connection and try again.");
    }}
/>
```

### **Solution 4: Use PDF.js Viewer**
If iframe issues persist, implement PDF.js viewer:
```javascript
// Instead of iframe, use PDF.js viewer
import { Document, Page } from 'react-pdf';
```

## 📊 **CURRENT SYSTEM STATE**

### **Services Status**
- ✅ Python FastAPI (Port 8000): Running
- ✅ Node.js Server (Port 3000): Running  
- ✅ React Frontend (Port 5173): Running
- ✅ API Gateway (Port 3001): Running

### **File Structure**
```
data/applications/alameda_county_mehko/forms/MEHKO_APP_SOP/
├── form.pdf (334KB) ✅
├── acroform-definition.json ✅
├── meta.json ✅
└── overlay.json ✅
```

### **Recent Changes**
- API configuration was modified for deployment
- Environment variables may have changed
- Deployment architecture uses API Gateway (Port 3001)

## 🎯 **RECOMMENDED APPROACH**

### **Phase 1: Quick Setup (5 minutes)**
1. **Read this document completely** - Understand the issue and system
2. **Run AI Safety Protocol** - Ensure safe development environment
   ```bash
   ./scripts/ai-safety-protocol.sh
   ```
3. **Verify current state** - Check if issue still exists

### **Phase 2: Investigation (10-15 minutes)**
1. **Start with API Configuration Check** - Most likely cause
2. **Test PDF endpoint directly** - Verify server response  
3. **Check browser network tab** - Identify exact failure point
4. **Fix headers/Content-Type** - Ensure proper PDF serving
5. **Test iframe implementation** - Verify iframe loading

### **Phase 3: Implementation (15-30 minutes)**
1. **Apply the most likely solution** from the solutions section
2. **Test the fix** in the browser
3. **Verify other PDF steps** work correctly
4. **Document the solution** for future reference

## 🚨 **EMERGENCY FIXES**

If immediate fix needed:
1. **Temporary**: Use direct PDF download instead of iframe
2. **Quick**: Add `target="_blank"` to open PDF in new tab
3. **Fallback**: Implement PDF.js viewer component

## 📝 **DEBUGGING COMMANDS**

### **Essential Commands (Run These First)**
```bash
# 1. Run AI Safety Protocol (REQUIRED)
./scripts/ai-safety-protocol.sh

# 2. Check all services status
./scripts/status-all-services.sh

# 3. Test PDF endpoint directly
curl -v "http://localhost:8000/apps/alameda_county_mehko/forms/MEHKO_APP_SOP/pdf?inline=true"
```

### **Additional Debugging Commands**
```bash
# Check Python server logs
tail -f logs/fastapi.log

# Check frontend logs  
tail -f logs/react.log

# Check API Gateway logs
tail -f logs/gateway.log

# Restart services if needed
./scripts/restart-all-services.sh

# Quick health check
./scripts/system-health-check.sh
```

### **Environment Variable Check**
```bash
# Verify API configuration
echo "VITE_PYTHON_API: $VITE_PYTHON_API"
echo "VITE_NODE_API: $VITE_NODE_API"
echo "API_BASE: $API_BASE"

# Check if .env files exist
ls -la .env*
ls -la python/.env*
```

---

## 🚀 **QUICK START FOR AI AGENT**

### **Step 1: Read & Understand (2 minutes)**
- Read this entire document to understand the issue
- Focus on the "Root Cause Analysis" and "Suspected Issue Areas" sections

### **Step 2: Run AI Safety Protocol (3 minutes)**
```bash
./scripts/ai-safety-protocol.sh
```
This ensures you have a safe development environment and all services are running.

### **Step 3: Verify Issue Still Exists (2 minutes)**
- Open browser to dashboard
- Click Alameda County → Step 2
- Confirm PDF still loads dashboard page instead of PDF

### **Step 4: Follow Investigation Steps**
Use the structured approach in the "Investigation Steps" section above.

---

**Created**: September 1, 2025  
**Issue Priority**: High (affects core PDF functionality)  
**Estimated Fix Time**: 30-60 minutes  
**Required Skills**: React, FastAPI, iframe handling, CORS configuration  
**AI Agent Setup Time**: 5 minutes (including AI safety protocol)
