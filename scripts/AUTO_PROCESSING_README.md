# 🚀 Automated County Processing System

This system automatically processes uploaded county JSON files and handles everything including PDF downloads, manifest updates, and directory setup.

## 📋 **What It Does Automatically**

1. **✅ Validates JSON Structure** - Ensures all required fields are present
2. **✅ Updates Manifest** - Adds/updates county in the main manifest
3. **✅ Creates Directories** - Sets up application folder structure
4. **✅ Downloads PDFs** - Automatically downloads all required forms
5. **✅ Handles Errors** - Continues processing even if some PDFs fail

## 🛠️ **Available Scripts**

### **1. Single County Upload**
```bash
# Process a single county
node scripts/upload-county.mjs <county-id>

# Examples:
node scripts/upload-county.mjs lake_county_mehko
node scripts/upload-county.mjs orange_county_mehko
```

### **2. Bulk Process All Counties**
```bash
# Process ALL county JSON files at once
node scripts/bulk-process-counties.mjs
```

### **3. Programmatic Usage**
```javascript
import CountyProcessor from './scripts/auto-process-county.mjs';

const processor = new CountyProcessor();
await processor.processCounty('lake_county_mehko');
```

## 📁 **File Structure Created**

For each county, the system creates:
```
applications/
└── county_name_mehko/
    └── forms/
        ├── FORM_ID_1/
        │   ├── form.pdf          # Downloaded PDF
        │   └── meta.json         # Form metadata
        └── FORM_ID_2/
            ├── form.pdf          # Downloaded PDF
            └── meta.json         # Form metadata
```

## 🔧 **How to Use**

### **Step 1: Upload JSON File**
Place your county JSON file in the `data/` directory:
```
data/
├── manifest.json
├── county-template.json
├── lake_county_mehko.json      # ← Your new county
└── other_counties.json
```

### **Step 2: Run the Processor**
```bash
# For a single county
node scripts/upload-county.mjs lake_county_mehko

# For all counties
node scripts/bulk-process-counties.mjs
```

### **Step 3: Done!**
The system automatically:
- ✅ Validates your JSON
- ✅ Adds county to manifest
- ✅ Downloads all PDF forms
- ✅ Sets up directories
- ✅ Makes county available in UI

## 📊 **Example Output**

```
🚀 Processing county: lake_county_mehko
==================================================
✅ Loaded manifest with 5 counties
✅ Loaded county data for Lake County MEHKO
✅ County data validation passed (10 steps, 2 PDF forms)
✅ Manifest updated successfully
✅ Created application directory: applications/lake_county_mehko/
📚 Downloading 2 PDF forms...
📥 Downloading PDF for Standard Operating Procedures (SOP)...
✅ Downloaded Standard Operating Procedures (SOP) (679KB)
📥 Downloading PDF for Health Permit Application...
✅ Downloaded Health Permit Application (245KB)
✅ PDF download process completed
🎉 Successfully processed Lake County MEHKO!
```

## ⚠️ **Requirements**

### **JSON File Must Have:**
- ✅ `id` - Unique county identifier
- ✅ `title` - Human-readable county name
- ✅ `description` - County description
- ✅ `rootDomain` - County website domain
- ✅ `supportTools` - AI and comments settings
- ✅ `steps` - Array of application steps

### **PDF Steps Must Have:**
- ✅ `type: "pdf"`
- ✅ `formId` - Unique form identifier
- ✅ `pdfUrl` - Accessible PDF download URL

## 🚨 **Error Handling**

The system handles errors gracefully:
- **PDF Download Fails** → Continues with other forms
- **Invalid JSON** → Shows specific validation errors
- **Network Issues** → Retries and shows clear error messages
- **Missing Fields** → Lists exactly what's missing

## 🔄 **Updating Existing Counties**

To update an existing county:
1. **Modify the JSON file** in `data/`
2. **Run the processor again** - it will update the existing entry
3. **PDFs will be re-downloaded** if URLs changed
4. **Manifest will be updated** automatically

## 📈 **Benefits**

- **🚀 Zero Manual Work** - Just upload JSON and run script
- **✅ Automatic Validation** - Catches errors before processing
- **📚 Complete PDF Downloads** - Gets all required forms
- **🔄 Easy Updates** - Modify JSON and reprocess
- **📁 Organized Structure** - Consistent directory layout
- **🛡️ Error Resilient** - Continues even if some parts fail

## 🎯 **Perfect For**

- **AI-Generated Counties** - Process multiple counties at once
- **Manual Updates** - Modify existing counties easily
- **Bulk Operations** - Process entire county batches
- **Development** - Test new county structures quickly
- **Production** - Deploy new counties automatically

---

**🎉 Now you can just upload a JSON file and the system handles everything else!**
