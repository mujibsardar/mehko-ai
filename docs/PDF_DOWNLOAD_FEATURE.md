# PDF Download Feature

## Overview

The PDF download feature allows users to download the original PDF form templates for any PDF step in a MEHKO application. This is essential for users who want to:

- View forms offline
- Print forms for reference
- Have a backup copy
- Share forms with others

## How It Works

### 1. Frontend Integration

- **InfoStep Component**: Automatically detects PDF steps and shows download button
- **Download Button**: Appears below the step title for any step with `type: "pdf"`
- **User Experience**: Clear button with helpful description

### 2. API Endpoint

- **Route**: `/api/apps/{applicationId}/forms/{formId}/pdf`
- **Method**: GET
- **Response**: PDF file with proper headers for download

### 3. File Storage

- **Location**: `applications/{appId}/forms/{formId}/form.pdf`
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
    const response = await fetch(
      `/api/apps/${applicationId}/forms/${step.formId}/pdf`
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
    border-radius: 6px;
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 8px;

    &:hover {
      background: var(--accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }
}
```

## Usage

### For Users

1. Navigate to any PDF step in a MEHKO application
2. Click the "📄 Download PDF Template" button
3. PDF will automatically download to your device
4. You can still fill out the form in the application

### For Developers

1. Ensure PDF steps have `type: "pdf"` and valid `formId`
2. PDF files must be stored in `applications/{appId}/forms/{formId}/form.pdf`
3. The download endpoint automatically serves the correct file

## Testing

### Test Script

Run the test script to verify the PDF download endpoint works:

```bash
node scripts/test-pdf-download.mjs
```

### Manual Testing

1. Start your development server
2. Navigate to a PDF step in any MEHKO application
3. Click the download button
4. Verify PDF downloads correctly

## Requirements

### PDF Steps Must Have

- `type: "pdf"`
- `formId` field with valid form identifier
- PDF file stored at correct path

### File Structure

```
applications/
  {appId}/
    forms/
      {formId}/
        form.pdf          # The actual PDF file
        overlay.json      # Form field mapping
        meta.json         # Metadata
```

## Error Handling

### Frontend Errors

- Network errors show user-friendly alert
- Invalid formId prevents download attempt
- Console logging for debugging

### Backend Errors

- 404 if PDF file doesn't exist
- Proper HTTP status codes
- Content-Type headers for PDF files

## Future Enhancements

### Potential Improvements

- **Progress indicator** for large PDF downloads
- **Preview functionality** before download
- **Batch download** for multiple forms
- **Download history** tracking
- **File size display** before download

### Integration Opportunities

- **AI Chat**: Help users understand downloaded forms
- **Form Filling**: Reference downloaded PDFs while filling
- **Progress Tracking**: Track which PDFs have been downloaded

## Security Considerations

### Access Control

- PDFs are publicly accessible (no authentication required)
- Consider adding authentication if forms contain sensitive information
- Validate formId to prevent directory traversal attacks

### File Validation

- Ensure only PDF files are served
- Validate file paths to prevent unauthorized access
- Consider file size limits for very large PDFs

## Troubleshooting

### Common Issues

1. **PDF not downloading**: Check if file exists at correct path
2. **Wrong file downloaded**: Verify formId matches file structure
3. **Download button not showing**: Ensure step has `type: "pdf"` and `formId`
4. **Network errors**: Check server status and API endpoint

### Debug Steps

1. Check browser console for errors
2. Verify PDF file exists in file system
3. Test API endpoint directly
4. Check network tab for failed requests

## Conclusion

The PDF download feature provides essential functionality for MEHKO applications, allowing users to access original form templates while maintaining the ability to fill them out digitally. This feature enhances user experience and provides flexibility in how users interact with application forms.
