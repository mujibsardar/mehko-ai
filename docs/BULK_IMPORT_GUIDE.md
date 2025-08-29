# Bulk Import Guide for County Applications

This guide explains how to use the **Bulk Import** feature in the Admin Dashboard to efficiently create multiple county MEHKO applications from JSON files.

## 🏗️ **System Architecture**

The Bulk Import feature works with our **dual-server architecture**:

- **Node.js Server (Port 3000)**: Handles county data processing and Firebase sync
- **Python Server (Port 8000)**: Handles PDF processing and storage
- **Frontend**: Loads from Firebase, processes through Node.js server

## Overview

The Bulk Import feature allows administrators to:
- Upload multiple JSON files simultaneously
- Preview and validate JSON structure before processing
- Create new applications in both backend and Firestore
- Update existing applications if they have the same ID
- Process multiple counties in a single operation

## Accessing the Feature

1. Navigate to the Admin Dashboard (`/admin`)
2. Click on the **"Bulk Import"** tab in the left sidebar
3. The interface will show upload instructions and file management tools

## JSON File Structure

Each county JSON file must follow this **simplified structure** (see `data/county-template.json` for reference):

```json
{
  "id": "county_name_mehko",
  "title": "County Name MEHKO",
  "description": "Brief description of the county's MEHKO program",
  "rootDomain": "county.gov",
  "supportTools": {
    "aiEnabled": true,
    "commentsEnabled": true
  },
  "steps": [
    {
      "id": "step_id",
      "title": "Step Title",
      "type": "info|form|pdf",
      "action_required": true|false,
      "fill_pdf": true|false,
      "content": "Step content with inline search terms",
      "formId": "FORM_ID_HERE", // Required for PDF steps
      "formName": "FORM_NAME_HERE", // Required for form steps
      "pdfUrl": "https://county.gov/forms/form.pdf", // Required for PDF steps
      "appId": "county_name_mehko" // Should match the main ID
    }
  ]
}
```

### Required Fields

- **`id`**: Unique identifier for the application (e.g., `orange_county_mehko`)
- **`title`**: Human-readable name (e.g., "Orange County MEHKO")
- **`steps`**: Array of step objects defining the application flow

### Step Types

1. **`info`**: Informational steps with content
2. **`form`**: Form-based steps requiring `formName`
3. **`pdf`**: PDF-based steps requiring `formId` and `pdfUrl`

### Content Structure

Each step's `content` should follow this simple format:

```
**What to do:** [Clear action description]

**Why it matters:** [Brief explanation of importance]

**What you need:**
- ☐ [Requirement 1]
- ☐ [Requirement 2]
- ☐ [Requirement 3]

**Where/how:** [Instructions on how to complete]

**Cost & time:** [Cost] · [Time estimate]

**Ready when:** [Clear completion criteria]

**Search terms for unclear parts:**
*Search:* [effective search phrase 1]
*Search:* [effective search phrase 2]
```

### Search Terms Integration

For any unclear or complex parts, add inline search suggestions using this format:

```
**CFPM Certificate:** Take an ANSI-CFP Food Protection Manager course.
*Search:* 'ANSI-CFP Food Protection Manager [County Name]'

**Property Approval:** Get landlord/HOA permission if applicable.
*Search:* '[County Name] renter permission MEHKO'
```

## Using the Bulk Import Feature

### Step 1: Prepare Your JSON Files

1. **Create county JSON files** following the structure above
2. **Validate JSON syntax** using a JSON validator
3. **Test with one file** before bulk processing
4. **Ensure PDF URLs are accessible** and working

### Step 2: Upload Files

1. **Drag & drop** JSON files into the upload zone
2. **Or click** to select files from your computer
3. **Review the file list** and remove any unwanted files
4. **Verify file names** match your county IDs

### Step 3: Preview and Validate

1. **Click "Preview Files"** to validate JSON structure
2. **Review validation results** for each file
3. **Fix any errors** before proceeding
4. **Confirm file count** and processing order

### Step 4: Process Counties

1. **Click "Import All"** to start processing
2. **Monitor progress** with real-time status updates
3. **View results** for each county processed
4. **Check for any errors** or warnings

## 🔄 **Processing Pipeline**

### What Happens During Import

```
1. File Upload → JSON validation and parsing
2. County Creation → Directory structure and file storage
3. PDF Download → Fetch PDFs from URLs in steps
4. Firebase Sync → Create documents in Firestore
5. Manifest Update → Update data/manifest.json
6. Completion → All counties ready for use
```

### File Structure Created

For each county, the system creates:

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
├── manifest.json                      # Updated with new counties
└── county_name_mehko.json            # County data file
```

## 🚨 **Error Handling**

### Common Validation Errors

- **Missing required fields**: Clear indication of what's missing
- **Invalid ID format**: Must match regex `/^[a-z0-9_]+$/`
- **PDF step issues**: Missing `formId` or `pdfUrl`
- **Content format**: Improper step content structure

### Processing Errors

- **PDF download failures**: Individual PDF status reporting
- **Firebase sync issues**: Clear error messages and retry options
- **File system errors**: Directory creation and permission issues

### Recovery Options

- **Individual retry**: Retry failed counties one by one
- **Batch retry**: Retry all failed counties at once
- **Manual processing**: Process individual files if needed

## 🧪 **Testing and Validation**

### Test County Data

Use the provided test county data in `data/` directory:

- `data/example-county.json` - Basic county structure
- `data/county-template.json` - Template with all required fields

### Validation Testing

1. **Upload valid county JSON** - Should process successfully
2. **Upload invalid JSON** - Should show clear error messages
3. **Test PDF downloads** - Verify PDFs are accessible
4. **Check Firebase sync** - Verify data appears in admin dashboard

### Performance Testing

- **Small batch** (1-5 counties): Test with minimal files first
- **Medium batch** (5-20 counties): Test with moderate load
- **Large batch** (20+ counties): Test with maximum expected load

## 🔧 **Troubleshooting**

### Common Issues

1. **PDF Download Failures**
   - Check if PDF URLs are accessible
   - Verify PDF URLs are direct links (not redirects)
   - Ensure PDFs are publicly accessible

2. **Firebase Sync Issues**
   - Check Firebase connection
   - Verify admin permissions
   - Check Firestore rules

3. **File System Errors**
   - Ensure write permissions to data/ directory
   - Check available disk space
   - Verify directory structure exists

### Debug Information

The system provides detailed logging:

- **Upload status**: File validation and parsing results
- **Processing status**: Individual county processing steps
- **Error details**: Specific error messages and recovery suggestions
- **Completion summary**: Final results and statistics

## 🔮 **Future Enhancements**

### Planned Features

- **AI-powered validation** of county data
- **Template-based county creation** for common patterns
- **County comparison tools** for quality assurance
- **Export functionality** for backup and sharing
- **Processing history** and audit trails

### Integration Points

- **AI Field Mapper**: Automatic field detection for PDFs
- **Form Builder**: Create custom forms for counties
- **Analytics Dashboard**: Track county usage and performance

## 💡 **Best Practices**

### File Preparation

1. **Use consistent naming** for county IDs
2. **Validate JSON syntax** before upload
3. **Test PDF URLs** to ensure accessibility
4. **Follow content templates** for consistency

### Processing Strategy

1. **Start small** with 1-2 counties
2. **Validate results** before bulk processing
3. **Monitor progress** during large imports
4. **Keep backups** of original JSON files

### Quality Assurance

1. **Review processed counties** in admin dashboard
2. **Test PDF accessibility** for all forms
3. **Verify Firebase sync** completed successfully
4. **Check manifest updates** include new counties

---

**The Bulk Import feature provides an efficient, reliable way to add multiple counties to the MEHKO AI system while maintaining data quality and system integrity.**
