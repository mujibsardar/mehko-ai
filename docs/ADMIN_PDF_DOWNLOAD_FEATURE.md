# Admin PDF Download Feature

## Overview

The Admin PDF Download feature allows administrators to download PDF forms from external URLs (like county websites) directly to the local `applications/{county}` folder structure. This is essential for:

- **Setting up new counties** with their actual PDF forms
- **Using the mapper tool** to extract form fields
- **Maintaining local copies** of official forms
- **Creating proper directory structures** for new applications

## How It Works

### 1. Admin Dashboard Integration

- **New Tab**: "PDF Download" tab in the admin dashboard
- **Simple Form**: Three fields for appId, formId, and PDF URL
- **Automatic Directory Creation**: Creates the proper folder structure
- **File Validation**: Ensures the downloaded file is actually a PDF

### 2. Backend API Endpoint

- **Route**: `POST /api/download-pdf`
- **Input**: `{ url, appId, formId }`
- **Output**: PDF saved to `applications/{appId}/forms/{formId}/form.pdf`

### 3. Directory Structure Creation

```
applications/
  {appId}/
    forms/
      {formId}/
        form.pdf          # Downloaded PDF
        meta.json         # Metadata about the download
```

## Usage

### Step-by-Step Process

1. **Go to Admin Dashboard** → **PDF Download** tab
2. **Enter Application ID**: The county identifier (e.g., "sonoma_county_mehko")
3. **Enter Form ID**: The form identifier (e.g., "MEHKO_SOP-English")
4. **Enter PDF URL**: Direct link to the PDF file
5. **Click "Download PDF"**: PDF will be downloaded and saved locally
6. **Use Mapper Tool**: Extract form fields from the downloaded PDF

### Example Workflow

**Setting up Sonoma County:**

1. **Application ID**: `sonoma_county_mehko`
2. **Form ID**: `MEHKO_SOP-English`
3. **PDF URL**: `https://sonomacounty.ca.gov/forms/mehko-sop.pdf`
4. **Result**: PDF saved to `applications/sonoma_county_mehko/forms/MEHKO_SOP-English/form.pdf`

**Setting up Permit Application:**

1. **Application ID**: `sonoma_county_mehko`
2. **Form ID**: `MEHKO_PermitApplication`
3. **PDF URL**: `https://sonomacounty.ca.gov/forms/mehko-permit.pdf`
4. **Result**: PDF saved to `applications/sonoma_county_mehko/forms/MEHKO_PermitApplication/form.pdf`

## Technical Details

### Frontend Implementation

#### Admin.jsx

- **New Tab**: Added "PDF Download" tab to admin dashboard
- **State Management**: Form fields and download status
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Clear confirmation of successful downloads

#### Admin.scss

- **Responsive Design**: Works on all screen sizes
- **Modern UI**: Clean, professional appearance
- **Status Indicators**: Visual feedback for success/error states

### Backend Implementation

#### server.js

- **New Endpoint**: `POST /api/download-pdf`
- **Input Validation**: Checks appId and formId formats
- **Directory Creation**: Automatically creates folder structure
- **File Download**: Fetches PDF from external URL
- **File Saving**: Saves PDF to local filesystem
- **Metadata Creation**: Generates meta.json with download info

### API Endpoint Details

```javascript
POST /api/download-pdf
Content-Type: application/json

{
  "url": "https://county.gov/forms/mehko-sop.pdf",
  "appId": "sonoma_county_mehko",
  "formId": "MEHKO_SOP-English"
}
```

**Response:**

```json
{
  "success": true,
  "message": "PDF downloaded successfully",
  "path": "applications/sonoma_county_mehko/forms/MEHKO_SOP-English/form.pdf",
  "size": 245760
}
```

## Validation Rules

### Application ID Format

- **Pattern**: `^[a-z0-9_]+$`
- **Examples**: `sonoma_county_mehko`, `los_angeles_mehko`
- **Restrictions**: Lowercase letters, numbers, underscores only

### Form ID Format

- **Pattern**: `^[A-Za-z0-9_-]+$`
- **Examples**: `MEHKO_SOP-English`, `Permit_Application`
- **Restrictions**: Letters, numbers, hyphens, underscores

### URL Validation

- **Must be valid URL**: Properly formatted HTTP/HTTPS URL
- **Must be accessible**: Server must be able to reach the URL
- **Should be PDF**: Content-Type should indicate PDF (warning if not)

## Error Handling

### Common Errors

1. **Missing Fields**: All three fields are required
2. **Invalid Format**: appId or formId doesn't match pattern
3. **Network Error**: Can't reach the PDF URL
4. **File Error**: Can't save to local filesystem
5. **Not a PDF**: URL doesn't return a PDF file

### User Feedback

- **Success**: Green status message with file path
- **Error**: Red status message with specific error details
- **Validation**: Immediate feedback for format issues

## Integration with Mapper Tool

### Workflow

1. **Download PDF** using admin dashboard
2. **Navigate to Mapper Tool** for the specific form
3. **Extract Fields** from the downloaded PDF
4. **Create overlay.json** with field mappings
5. **Test Form Filling** with extracted fields

### File Structure

After downloading, the mapper tool can access:

```
applications/{appId}/forms/{formId}/
  ├── form.pdf          # Downloaded PDF (ready for mapping)
  ├── meta.json         # Download metadata
  └── overlay.json      # Will be created by mapper tool
```

## Testing

### Test Script

Run the test script to verify the API works:

```bash
node scripts/test-pdf-download-api.mjs
```

### Manual Testing

1. Start your development server
2. Go to Admin → PDF Download
3. Enter test data and download a PDF
4. Verify file is created in correct location
5. Check that mapper tool can access the PDF

## Security Considerations

### Input Validation

- **appId/formId**: Regex validation prevents path traversal
- **URL Validation**: Basic URL format checking
- **File Type**: Warning if response isn't a PDF

### File System

- **Directory Creation**: Uses `fs.promises.mkdir` with `recursive: true`
- **Path Joining**: Uses `path.join()` for safe path construction
- **File Writing**: Writes to specific, validated paths only

## Future Enhancements

### Potential Improvements

- **Batch Downloads**: Download multiple PDFs at once
- **Progress Indicators**: Show download progress for large files
- **File Size Limits**: Prevent extremely large downloads
- **Duplicate Detection**: Check if PDF already exists
- **Version Control**: Track different versions of the same form

### Integration Opportunities

- **Bulk Import**: Integrate with county JSON bulk import
- **Form Validation**: Auto-detect if downloaded PDF matches expected form
- **Field Extraction**: Automatically run mapper tool after download
- **Update Notifications**: Check for updated versions of forms

## Troubleshooting

### Common Issues

1. **PDF not downloading**: Check URL accessibility and format
2. **Directory not created**: Verify appId and formId formats
3. **File not saved**: Check file system permissions
4. **Network errors**: Verify URL is reachable from server

### Debug Steps

1. Check server console for error messages
2. Verify URL returns a PDF file
3. Check file system permissions
4. Test with simple, known-good URLs first

## Conclusion

The Admin PDF Download feature provides a robust, user-friendly way to populate the local applications folder with official PDF forms from county websites. This enables administrators to:

- **Quickly set up new counties** with their actual forms
- **Use the mapper tool effectively** with real PDFs
- **Maintain proper directory structures** automatically
- **Streamline the county onboarding process**

This feature is essential for the mapper tool workflow and makes it much easier to add new counties to the MEHKO system.
