# 📁 MEHKO AI Project Structure

## 🎯 **Overview**
This document describes the organized directory structure for the MEHKO AI project, making it easier to navigate and maintain.

## 📂 **Directory Organization**

### **Root Level**
- **`src/`** - React frontend source code
- **`public/`** - Static assets and public files
- **`python/`** - Python backend and FastAPI server
- **`scripts/`** - Utility and automation scripts
- **`data/`** - Application data and configuration
- **`docs/`** - Project documentation
- **`logs/`** - Service log files
- **`config/`** - Configuration files
- **`temp/`** - Temporary runtime files
- **`data/applications/`** - County application forms and data
- **`tools/`** - Development and utility tools

### **Key Directories Explained**

#### **`logs/`** - Service Logs
```
logs/
├── fastapi.log      # Python FastAPI server logs
├── node.log         # Node.js server logs
└── react.log        # React development server logs
```

#### **`docs/`** - Documentation
```
docs/
├── ENHANCED_AGENT_FEATURES.md    # AI agent capabilities
├── AI_AGENT_INSTRUCTIONS.md      # Agent usage instructions
├── AI_PDF_IMPLEMENTATION_GUIDE.md # PDF processing guide
└── AI_PDF_MAPPING_RESEARCH.md    # PDF mapping research
```

#### **`config/`** - Configuration Files
```
config/
└── serviceAccountKey.json        # Firebase service account (gitignored)
```

#### **`temp/`** - Temporary Runtime Files
```
temp/
└── .service-pids                 # Service process IDs (gitignored)
```

#### **`scripts/`** - Automation Scripts
```
scripts/
├── start-all-services.sh         # Start all services
├── stop-all-services.sh          # Stop all services
├── watch-logs.sh                 # Monitor service logs
├── mehko-agent-enhanced.mjs     # Enhanced AI agent
├── test-enhanced-agent.mjs       # Agent testing
└── ...                          # Other utility scripts
```

#### **`data/`** - Application Data
```
data/
├── manifest.json                 # Master application database
├── county-batch.json            # Batch processing configuration
├── county-targets.md            # County targeting strategy
├── applications/                 # County application forms
│   ├── san_diego_county_mehko/ # San Diego county data
│   │   └── forms/               # PDF forms and metadata
│   └── los_angeles_county_mehko/ # LA county data
│       └── forms/               # PDF forms and metadata
└── ...                          # Other data files
```

## 🔧 **Benefits of This Structure**

### **1. Cleaner Root Directory**
- **Easier navigation** - find files quickly
- **Better organization** - logical grouping of related files
- **Professional appearance** - clean, organized project structure

### **2. Improved Maintenance**
- **Centralized logs** - all service logs in one place
- **Organized docs** - easy to find documentation
- **Separated config** - sensitive files isolated and protected

### **3. Better Development Experience**
- **Clear separation** of concerns
- **Easier debugging** with organized logs
- **Simplified deployment** with clear file locations

### **4. Enhanced Security**
- **Sensitive files** in config/ directory
- **Runtime files** in temp/ directory
- **Proper .gitignore** patterns for each directory

## 🚀 **Usage Examples**

### **Starting Services**
```bash
./scripts/start-all-services.sh
# Logs will be created in logs/ directory
# Service PIDs saved to temp/.service-pids
```

### **Monitoring Logs**
```bash
./scripts/watch-logs.sh
# Opens separate terminals for each log file in logs/ directory
```

### **Stopping Services**
```bash
./scripts/stop-all-services.sh
# Reads PIDs from temp/.service-pids
# Cleans up temporary files
```

### **AI Agent Processing**
```bash
node scripts/mehko-agent-enhanced.mjs "https://county.gov/mehko" "County Name"
# County applications stored in data/applications/ directory
```

## 📝 **File Path Updates**

### **Updated Scripts**
All scripts have been updated to use the new directory structure:
- **Log files**: `logs/fastapi.log`, `logs/node.log`, `logs/react.log`
- **Service PIDs**: `temp/.service-pids`
- **Configuration**: `config/serviceAccountKey.json`

### **Backward Compatibility**
- **Existing functionality** preserved
- **Same script interfaces** maintained
- **Improved organization** without breaking changes

## 🔮 **Future Enhancements**

### **Planned Improvements**
- **Centralized configuration** management
- **Log rotation** and archival
- **Environment-specific** configurations
- **Automated cleanup** of temporary files

---

**This organized structure makes the project more professional, maintainable, and developer-friendly! 🎉**
