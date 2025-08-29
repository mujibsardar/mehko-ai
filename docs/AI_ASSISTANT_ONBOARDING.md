# 🚀 **MEHKO AI SYSTEM ONBOARDING GUIDE**

## 📋 **WELCOME TO THE PROJECT**

Welcome to the MEHKO AI system! This document will get you up to speed on the architecture, codebase structure, and development patterns. Read this carefully to avoid common rookie mistakes and understand how everything fits together.

## 🏗️ **SYSTEM ARCHITECTURE OVERVIEW**

### **Dual-Server Architecture (This is Critical!)**

The system uses **TWO separate servers** with distinct responsibilities. This is a fundamental design decision that new developers often misunderstand.

#### **🐍 Python FastAPI Server (Port 8000)**
**Purpose**: PDF processing, storage, and form management microservice

**What it DOES**:
- Stores and serves PDF files
- Creates and manipulates AcroForm PDFs
- Fills PDFs with user data (both overlay and AcroForm methods)
- Manages form templates and field definitions
- Extracts PDF text for AI analysis

**What it DOESN'T do**:
- ❌ Serve application data with steps
- ❌ Sync data to Firebase
- ❌ Handle AI chat or analysis
- ❌ Process county uploads

**Key Endpoints**:
- `GET /apps/{app}/forms/{form}/pdf` - Serve PDF files
- `GET /apps/{app}/forms/{form}/acroform-pdf` - Serve AcroForm PDFs
- `POST /apps/{app}/forms/{form}/create-acroform` - Convert PDFs to AcroForm
- `GET /apps/{app}/forms/{form}/acroform-definition` - Get field definitions
- `POST /apps/{app}/forms/{form}/fill` - Fill PDFs with user data

#### **🟢 Node.js Server (Port 3000)**
**Purpose**: AI services, Firebase sync, and admin functions

**What it DOES**:
- Processes county data uploads
- Syncs data to Firebase (applications collection + steps subcollection)
- Provides AI-powered PDF field detection
- Handles admin interface backend
- Manages AI chat and analysis services

**What it DOESN'T do**:
- ❌ Serve PDF files
- ❌ Handle PDF processing or filling
- ❌ Create AcroForm PDFs

**Key Endpoints**:
- `POST /api/admin/process-county` - Process county applications
- `POST /api/ai-analyze-pdf` - AI field detection
- `POST /api/download-pdf` - PDF download management

### **⚛️ React Frontend (Port 5173)**
**Purpose**: User interface and PDF form rendering

**What it DOES**:
- Loads application data from Firebase (Node.js server's responsibility)
- Renders PDF steps using InterviewView component
- Manages form data and user interactions
- Provides admin interface for field mapping

**What it DOESN'T do**:
- ❌ Load application data from Python server
- ❌ Process PDFs directly
- ❌ Handle AI analysis

## 🔄 **DATA FLOW ARCHITECTURE**

### **County Upload Process**:
```
1. Admin uploads county JSON → Node.js server
2. Node.js validates and saves to data/ directory
3. Node.js updates manifest.json
4. Node.js downloads PDFs to data/applications/{app}/forms/{formId}/
5. Node.js syncs data to Firebase (applications collection + steps subcollection)
6. Python server can access PDFs for processing
```

### **PDF Field Definition Process**:
```
1. Admin uses AI Field Mapper → Uploads PDF to Node.js server
2. Node.js converts PDF to images and analyzes with AI
3. AI returns field coordinates and types
4. Admin reviews and selects fields
5. Field definitions saved as overlay.json or acroform-definition.json
6. Python server can now process PDFs with field definitions
```

### **User Form Filling Process**:
```
1. Frontend loads app data from Firebase (Node.js server's responsibility)
2. Frontend detects PDF step (step.type === "pdf")
3. Frontend renders InterviewView component
4. InterviewView loads field definitions from Python server
5. InterviewView renders AcroFormViewer or fallback form
6. User fills form and submits
7. Python server fills PDF and returns filled version
```

## 🧠 **AI FIELD DETECTION SYSTEM**

### **Technology Stack**:
- **PDF Processing**: `pdf-poppler` for PDF-to-image conversion
- **AI Analysis**: OpenAI Vision API (GPT-4o-mini)
- **Field Detection**: Custom prompt engineering for form field identification
- **Coordinate Normalization**: Custom algorithms for coordinate system conversion

### **AI Prompt Strategy**:
The system uses a sophisticated prompt that:
- Analyzes PDF pages for form fields
- Identifies field types (text, checkbox, radio, select)
- Extracts precise coordinates [x, y, width, height]
- Provides confidence scores and reasoning
- Returns structured JSON for processing

### **Field Type Support**:
- **Text fields**: Single-line and multi-line input
- **Checkboxes**: Boolean selection fields
- **Radio buttons**: Single-choice selection
- **Dropdowns**: Selection from predefined options
- **Textareas**: Multi-line text input
- **Signature fields**: Digital signature capture

## 📁 **FILE STRUCTURE & ORGANIZATION**

### **Data Directory Structure**:
```
data/
├── applications/
│   ├── {app_id}/
│   │   └── forms/
│   │       └── {form_id}/
│   │           ├── form.pdf                    # Original PDF
│   │           ├── form_acroform.pdf          # AcroForm version (if created)
│   │           ├── overlay.json               # Field overlay definition (legacy)
│   │           ├── acroform-definition.json  # Modern field definition
│   │           └── meta.json                 # Form metadata
├── manifest.json                              # All county applications
└── {county_id}.json                          # Individual county data
```

### **Source Code Structure**:
```
src/
├── components/
│   ├── admin/                 # Admin interface components
│   ├── ai/                    # AI field mapping components
│   ├── applications/          # Application management
│   ├── dashboard/             # Main dashboard
│   ├── forms/                 # Form components
│   ├── overlay/               # PDF overlay handling
│   └── shared/                # Common components
├── config/                    # API configuration
├── firebase/                  # Firebase integration
├── hooks/                     # Custom React hooks
└── providers/                 # Context providers
```

### **Python Backend Structure**:
```
python/
├── server/
│   ├── apps_routes.py         # Application endpoints
│   ├── overlay_routes.py      # PDF overlay endpoints
│   ├── pdf_routes.py          # PDF processing endpoints
│   └── main.py                # FastAPI application
├── overlay/
│   ├── acroform_handler.py    # AcroForm PDF handling
│   ├── fill_overlay.py        # PDF overlay filling
│   └── signature_utils.py     # Signature field utilities
└── requirements.txt            # Python dependencies
```

## 🚨 **COMMON ROOKIE MISTAKES TO AVOID**

### **1. Server Confusion**
**❌ WRONG**: "The Python server should serve application data"
**✅ CORRECT**: Python server handles PDFs, Node.js server handles Firebase sync

**❌ WRONG**: "Both servers serve the same data"
**✅ CORRECT**: Each server has distinct responsibilities

### **2. Data Source Assumptions**
**❌ WRONG**: "Frontend loads from Python server"
**✅ CORRECT**: Frontend loads app data from Firebase, PDF metadata from Python server

**❌ WRONG**: "PDF files are the only issue"
**✅ CORRECT**: Field definitions (overlay.json/acroform-definition.json) are often the missing piece

### **3. Architecture Misunderstandings**
**❌ WRONG**: "We need to merge the two servers"
**✅ CORRECT**: The dual-server architecture is intentional and well-designed

**❌ WRONG**: "The Python server is missing an endpoint"
**✅ CORRECT**: Check if the endpoint is actually needed or if it's a data issue

## 🔧 **DEVELOPMENT PATTERNS**

### **Adding New Endpoints**:
1. **Python Server**: Add to appropriate router in `python/server/`
2. **Node.js Server**: Add to `server.js` with proper error handling
3. **Frontend**: Update API configuration in `src/config/api.js`

### **PDF Processing Workflow**:
1. **Upload**: PDF goes to Node.js server for AI analysis
2. **Storage**: PDF saved to `data/applications/{app}/forms/{formId}/`
3. **Processing**: Python server handles PDF manipulation
4. **Serving**: Python server serves processed PDFs

### **Field Definition Creation**:
1. **AI Detection**: Use `/api/ai-analyze-pdf` endpoint
2. **Review**: Admin reviews AI suggestions
3. **Save**: Create overlay.json or acroform-definition.json
4. **Test**: Verify PDF rendering works

## 📚 **KEY COMPONENTS TO UNDERSTAND**

### **InterviewView Component** (`src/components/overlay/Interview.jsx`):
- Renders PDF forms with field definitions
- Loads field data from Python server
- Handles form submission and PDF filling
- **Requires field definitions to work properly**

### **AcroFormViewer Component** (`src/components/forms/AcroFormViewer.jsx`):
- Modern PDF form viewer with iframe integration
- Automatically tries to create AcroForm PDFs
- Falls back to regular PDF if AcroForm creation fails

### **AIFieldMapper Component** (`src/components/ai/AIFieldMapper.jsx`):
- AI-powered field detection interface
- Uploads PDFs for AI analysis
- Processes AI suggestions into field definitions
- **Currently not integrated into admin interface**

### **Admin Component** (`src/components/admin/Admin.jsx`):
- County data management
- PDF step configuration
- Application creation and editing
- **Missing integration with AI Field Mapper**

## 🧪 **TESTING & DEBUGGING**

### **Testing PDF Endpoints**:
```bash
# Test Python server PDF serving
curl "http://localhost:8000/apps/{app}/forms/{form}/pdf"

# Test Node.js server AI analysis
curl -X POST "http://localhost:3000/api/ai-analyze-pdf" \
  -F "pdf=@path/to/test.pdf"
```

### **Common Debug Points**:
1. **PDF not loading**: Check if field definitions exist
2. **Field mapping failed**: Verify AI analysis endpoint is working
3. **Form submission error**: Check Python server PDF filling
4. **Data sync issues**: Verify Firebase connection and Node.js server

### **Log Locations**:
- **Python server**: `python/fastapi.log`
- **Node.js server**: `logs/node.log`
- **Frontend**: Browser console and `logs/react.log`

## 🚀 **GETTING STARTED**

### **1. Understand the Architecture**
- Read this document completely
- Study the dual-server design
- Understand data flow between components

### **2. Explore the Codebase**
- Start with `src/components/dashboard/DashboardApp.jsx`
- Follow the PDF rendering flow
- Examine the server endpoints

### **3. Test the System**
- Upload a test county application
- Use AI field detection on a PDF
- Verify the complete workflow

### **4. Common First Tasks**
- Fix field definition issues
- Integrate AI Field Mapper into admin interface
- Improve error handling and user feedback
- Add missing field definition templates

## 💡 **PRO TIPS**

### **Always Check Both Servers**:
When debugging an issue, verify:
1. **Node.js server**: Is the data in Firebase?
2. **Python server**: Are the PDFs accessible?
3. **Frontend**: Can it load from both sources?

### **Field Definitions Are Key**:
- PDF steps require field definitions to render
- Use AI detection to create field definitions
- Test with both overlay.json and acroform-definition.json

### **Coordinate Systems Matter**:
- AI returns [x, y, width, height]
- System converts to [x1, y1, x2, y2]
- PDF rendering uses normalized coordinates

### **Error Handling Patterns**:
- Python server: HTTPException with detailed messages
- Node.js server: Graceful fallbacks and error logging
- Frontend: User-friendly error messages with retry options

---

**Remember: This system is well-architected but complex. Take time to understand the dual-server design before making changes. When in doubt, trace the data flow from Firebase → Frontend → Python Server to identify where issues occur.**
