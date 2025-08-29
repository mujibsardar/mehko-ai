# 🚀 Admin Dashboard County Processor

## Overview

The admin dashboard includes a **County Processor** tab that allows administrators to upload and process county JSON files directly through the web interface. This eliminates the need for command-line operations and provides a user-friendly way to manage county applications.

## 🏗️ **System Architecture**

The county processor works with our **dual-server architecture**:

- **Node.js Server (Port 3000)**: Handles county data processing and Firebase sync
- **Python Server (Port 8000)**: Handles PDF processing and storage
- **Frontend**: Loads from Firebase, processes through Node.js server

## ✨ **Features**

### **1. Drag & Drop Upload**

- **Drag & drop** JSON files directly into the interface
- **Click to select** files from your computer
- **Multiple file support** for batch processing
- **File validation** before processing

### **2. Automatic Processing**

- **JSON validation** with clear error messages
- **Manifest updates** automatically
- **Directory creation** for applications
- **PDF downloads** for all required forms
- **Real-time status** updates

### **3. User-Friendly Interface**

- **Visual feedback** during processing
- **Clear results** showing success/failure
- **Detailed information** about processed counties
- **Responsive design** for all devices

## 🎯 **How to Use**

### **Step 1: Access Admin Dashboard**

1. Navigate to `/admin` in your application
2. Ensure you have admin privileges
3. Click on the **"County Processor"** tab

### **Step 2: Upload County Files**

1. **Drag & drop** JSON files into the upload zone
2. **Or click** the upload zone to select files
3. **Review** the list of files to be processed
4. **Remove** any unwanted files if needed

### **Step 3: Process Counties**

1. Click the **"Process Counties"** button
2. **Watch real-time progress** as files are processed
3. **View results** for each county
4. **See detailed information** about what was created

## 📁 **What Gets Created**

For each processed county, the system automatically creates:

```
data/
├── applications/
│   └── county_name_mehko/
│       └── forms/
│           ├── FORM_ID_1/
│           │   ├── form.pdf          # Downloaded PDF
│           │   └── meta.json         # Form metadata
│           └── FORM_ID_2/
│               ├── form.pdf          # Downloaded PDF
│               └── meta.json         # Form metadata
├── manifest.json                      # Updated with new county
└── county_name_mehko.json            # County data file
```

## 🔧 **Backend Integration**

### **API Endpoint**

```
POST /api/admin/process-county
```

**Server**: Node.js server (Port 3000)

### **Request Format**

```json
{
  "countyData": "JSON string content",
  "filename": "county_name.json"
}
```

### **Response Format**

```json
{
  "success": true,
  "message": "Successfully processed County Name",
  "countyId": "county_name_mehko",
  "title": "County Name MEHKO",
  "steps": 10,
  "pdfForms": 2,
  "downloadedForms": 2,
  "configSaved": "data/county_name_mehko.json",
  "manifestUpdated": "data/manifest.json"
}
```

## 🔄 **Data Flow**

### **Processing Pipeline**

```
1. Admin uploads county JSON → Node.js server
2. Node.js validates JSON structure and content
3. Node.js saves county data to data/ directory
4. Node.js updates manifest.json
5. Node.js creates application directory structure
6. Node.js downloads PDFs from URLs in steps
7. Node.js syncs data to Firebase (applications collection)
8. Python server can now access PDFs for processing
```

### **Firebase Integration**

The Node.js server automatically creates:

- **Application document** in `applications/{countyId}` collection
- **Steps subcollection** with individual step documents
- **Metadata** including creation timestamps and source information

## 📋 **County JSON Requirements**

### **Required Structure**

```json
{
  "id": "county_name_mehko",
  "title": "County Name MEHKO",
  "description": "Brief description with key limits and fees",
  "rootDomain": "county.gov",
  "supportTools": {
    "aiEnabled": true,
    "commentsEnabled": true
  },
  "steps": [
    {
      "id": "step_id",
      "title": "Step Title",
      "type": "info|pdf",
      "action_required": true|false,
      "fill_pdf": true|false,
      "content": "Step content with markdown formatting",
      "searchTerms": ["search phrase 1", "search phrase 2"],
      "formId": "FORM_ID_HERE", // Required for PDF steps only
      "pdfUrl": "https://county.gov/forms/form.pdf", // Required for PDF steps only
      "appId": "county_name_mehko" // Must match the main ID
    }
  ]
}
```

### **Validation Rules**

- **ID format**: Must match regex `/^[a-z0-9_]+$/`
- **PDF steps**: Must have `formId` and `pdfUrl`
- **Step references**: Must use proper step reference format
- **Content structure**: Must follow established content template

## 🚨 **Error Handling**

### **Common Validation Errors**

- **Missing required fields**: Clear indication of what's missing
- **Invalid ID format**: Explanation of proper naming conventions
- **PDF step issues**: Validation of formId and pdfUrl
- **Content format**: Guidance on proper content structure

### **Processing Errors**

- **PDF download failures**: Individual PDF status reporting
- **Firebase sync issues**: Clear error messages and retry options
- **File system errors**: Directory creation and permission issues

## 🧪 **Testing**

### **Test County Data**

Use the provided test county data in `data/` directory:

- `data/example-county.json` - Basic county structure
- `data/county-template.json` - Template with all required fields

### **Validation Testing**

1. **Upload valid county JSON** - Should process successfully
2. **Upload invalid JSON** - Should show clear error messages
3. **Test PDF downloads** - Verify PDFs are accessible
4. **Check Firebase sync** - Verify data appears in admin dashboard

## 🔮 **Future Enhancements**

### **Planned Features**

- **Batch processing** for multiple counties
- **County data validation** with AI assistance
- **PDF field detection** integration
- **County comparison tools**
- **Export/import functionality**

### **Integration Points**

- **AI Field Mapper**: Automatic field detection for PDFs
- **Form Builder**: Create custom forms for counties
- **Analytics Dashboard**: Track county usage and performance

---

**The County Processor provides a robust, user-friendly way to add new counties to the MEHKO AI system while maintaining data integrity and proper system integration.**
