# PDF Download Feature

## Overview

The PDF download feature allows users to download the original PDF form templates for any PDF step in a MEHKO application. This is essential for users who want to:

- View forms offline
- Print forms for reference
- Have a backup copy
- Share forms with others

## 🏗️ **System Architecture**

The PDF download feature works with our **dual-server architecture**:

- **Python Server (Port 8000)**: Serves PDF files and handles PDF processing
- **Node.js Server (Port 3000)**: Handles Firebase sync and admin functions
- **Frontend**: Loads from Firebase, fetches PDFs from Python server

## How It Works

### 1. Frontend Integration

- **InfoStep Component**: Automatically detects PDF steps and shows download button
- **Download Button**: Appears below the step title for any step with `type: "pdf"`
- **User Experience**: Clear button with helpful description

### 2. API Endpoint

- **Route**: `GET /apps/{applicationId}/forms/{formId}/pdf`
- **Server**: Python FastAPI server (Port 8000)
- **Response**: PDF file with proper headers for download

### 3. File Storage

- **Location**: `data/applications/{appId}/forms/{formId}/form.pdf`
- **Format**: Standard PDF files
- **Access**: Public read access for authenticated users

## Implementation Details

### Frontend Changes

#### InfoStep.jsx

```javascript
// PDF Download Button for PDF Steps
{
  step.type === "pdf" && step.formId && (
    <div className="pdf-download-section">
      <button
        className="pdf-download-button"
        onClick={handlePdfDownload}
        title="Download the original PDF form template"
      >
        📄 Download PDF Template
      </button>
      <p className="pdf-download-note">
        Download the original PDF form to view offline or print. You can still
        fill out the form in this application.
      </p>
    </div>
  );
}
```

#### PDF Download Handler

```javascript
const handlePdfDownload = async () => {
  if (!step.formId || step.type !== "pdf") return;

  try {
    // Use Python server endpoint
    const response = await fetch(
      `http://localhost:8000/apps/${applicationId}/forms/${step.formId}/pdf`
    );
    if (!response.ok) throw new Error("Failed to download PDF");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${applicationId}_${step.formId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    alert("Failed to download PDF. Please try again.");
  }
};
```

### Styling (InfoStep.scss)

```scss
.pdf-download-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;

  .pdf-download-button {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background: var(--accent-color-dark);
    }
  }

  .pdf-download-note {
    margin-top: 12px;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.4;
  }
}
```

## 🔧 **Backend Implementation**

### Python Server Endpoint

The PDF download is handled by the Python FastAPI server in `python/server/apps_routes.py`:

```python
@router.get("/{app}/forms/{form}/pdf")
def download_pdf(app: str, form: str, inline: bool = False):
    p = form_dir(app, form) / "form.pdf"
    if not p.exists():
        raise HTTPException(404, f"missing PDF at {p}")
    disposition = "inline" if inline else "attachment"
    return FileResponse(
        path=str(p),
        media_type="application/pdf",
        filename=f"{app}_{form}.pdf",
        headers={"Content-Disposition": f'{disposition}; filename="{app}_{form}.pdf"'},
    )
```

### File Path Resolution

The system uses the `form_dir()` helper function to locate PDF files:

```python
def form_dir(app: str, form: str) -> Path:
    return APPS / app / "forms" / form

# Where APPS = ROOT / "data" / "applications"
```

## 📁 **File Structure**

### PDF Storage Location

```
data/
└── applications/
    └── {app_id}/
        └── forms/
            └── {form_id}/
                ├── form.pdf          # The actual PDF file
                ├── meta.json         # Form metadata
                ├── overlay.json      # Field definitions (if exists)
                └── acroform-definition.json  # Modern field definitions (if exists)
```

### File Naming Convention

- **PDF files**: `form.pdf` (standardized name)
- **Download filename**: `{app_id}_{form_id}.pdf`
- **Example**: `alameda_county_mehko_MEHKO_APP_SOP.pdf`

## 🔄 **Data Flow**

### Complete Download Process

```
1. User clicks PDF download button
2. Frontend checks step.type === "pdf" and step.formId exists
3. Frontend makes request to Python server: /apps/{app}/forms/{form}/pdf
4. Python server locates PDF file in data/applications/{app}/forms/{form}/form.pdf
5. Python server returns PDF with proper headers for download
6. Browser downloads PDF with filename {app}_{form}.pdf
```

### Error Handling

- **PDF not found**: 404 error with clear message
- **Invalid app/form**: 400 error for malformed requests
- **Server error**: 500 error with logging

## 🧪 **Testing**

### Manual Testing

```bash
# Test PDF endpoint directly
curl "http://localhost:8000/apps/alameda_county_mehko/forms/MEHKO_APP_SOP/pdf" \
  -o test.pdf

# Test with inline parameter
curl "http://localhost:8000/apps/alameda_county_mehko/forms/MEHKO_APP_SOP/pdf?inline=true"
```

### Frontend Testing

1. **Navigate to PDF step** in any MEHKO application
2. **Click download button** - should trigger download
3. **Verify filename** matches expected format
4. **Check file integrity** - PDF should open correctly

### Error Testing

1. **Invalid app ID** - should show 404 error
2. **Invalid form ID** - should show 404 error
3. **Missing PDF file** - should show clear error message

## 🚨 **Common Issues**

### PDF Not Found

- **Check file exists**: Verify `data/applications/{app}/forms/{form}/form.pdf`
- **Check permissions**: Ensure Python server can read the file
- **Check path resolution**: Verify `form_dir()` function works correctly

### Download Fails

- **Check network**: Ensure frontend can reach Python server
- **Check CORS**: Verify Python server allows frontend origin
- **Check headers**: Ensure proper Content-Disposition headers

### File Corruption

- **Check source PDF**: Verify original PDF is valid
- **Check storage**: Ensure no corruption during file operations
- **Check encoding**: Verify proper binary file handling

## 🔮 **Future Enhancements**

### Planned Features

- **PDF preview** before download
- **Multiple format support** (PDF, DOCX, etc.)
- **Compression options** for large files
- **Download progress** indicators
- **Batch download** for multiple forms

### Integration Points

- **AI Field Mapper**: Download PDFs for field detection
- **Form Builder**: Download templates for customization
- **Admin Interface**: Download forms for review and editing

## 💡 **Best Practices**

### File Management

1. **Use consistent naming** for form IDs
2. **Validate PDF files** before storing
3. **Keep file sizes reasonable** for download performance
4. **Maintain file organization** in applications directory

### User Experience

1. **Clear download buttons** with descriptive text
2. **Helpful error messages** when downloads fail
3. **Progress indicators** for large files
4. **File size information** before download

### Security

1. **Validate app/form IDs** to prevent path traversal
2. **Check file permissions** before serving
3. **Log download requests** for audit purposes
4. **Rate limit downloads** to prevent abuse

---

**The PDF Download feature provides users with easy access to official form templates while maintaining security and performance through our dual-server architecture.**
