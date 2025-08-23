# Bulk Import Guide for County Applications

This guide explains how to use the new **Bulk Import** feature in the Admin Dashboard to efficiently create multiple county MEHKO applications from JSON files.

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
3. **`pdf`**: PDF-based steps requiring `formId`

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

### Step 1: Prepare JSON Files

1. Create JSON files for each county following the template structure
2. Ensure each file has a unique `id` field
3. Validate JSON syntax (use tools like JSONLint if needed)
4. **Use the simplified structure** - no complex nesting or subSteps

### Step 2: Upload Files

**Option A: Drag and Drop**
- Drag JSON files directly onto the upload area
- Multiple files can be dropped simultaneously

**Option B: File Selection**
- Click "Select Files" button
- Choose one or more JSON files from your file system

### Step 3: Preview and Validate

1. Click the **"Preview"** button to validate uploaded files
2. Review the preview results:
   - ✅ Green: Valid JSON structure
   - ❌ Red: Invalid JSON or missing required fields
3. Check the preview shows correct application details

### Step 4: Process Applications

1. Click **"Import [X] Applications"** button
2. Monitor progress in the status bar
3. Wait for completion message

## Validation Rules

The system validates each JSON file for:

- Valid JSON syntax
- Required fields: `id`, `title`, `steps`
- `steps` must be an array
- Each step must have `id`, `title`, and `type`
- PDF steps must have `formId`
- Form steps must have `formName`
- **No complex nesting** - content should be in the main `content` field

## Processing Details

When processing applications, the system:

1. **Backend Setup**: Creates necessary folder structure via `/api/apps` endpoint
2. **Firestore Storage**: Saves application data to Firestore database
3. **Duplicate Handling**: Updates existing applications if ID matches
4. **Error Handling**: Continues processing other files if one fails
5. **Status Updates**: Shows real-time progress and results

## Example Workflow

### Creating Multiple Counties

1. **Prepare Files**:
   - `orange_county_mehko.json`
   - `riverside_county_mehko.json`
   - `san_bernardino_county_mehko.json`

2. **Upload**: Drag all three files to the upload area

3. **Preview**: Click "Preview" to validate all files

4. **Import**: Click "Import 3 Applications" to process

5. **Monitor**: Watch progress and see completion status

### Updating Existing Counties

1. **Modify JSON**: Update the JSON file with new content
2. **Re-upload**: Upload the modified file
3. **Process**: The system will update the existing application

## Troubleshooting

### Common Issues

**"Invalid JSON structure"**
- Check JSON syntax with a validator
- Ensure all required fields are present
- Verify `steps` is an array
- **Remove any complex nesting** - use simple structure

**"Backend failed"**
- Check server connectivity
- Verify API endpoint is working
- Check server logs for specific errors

**"Duplicate ID"**
- This is normal - existing applications will be updated
- Ensure the ID matches exactly what you want to update

### Best Practices

1. **Test First**: Use the preview feature before processing
2. **Backup**: Keep original JSON files as backups
3. **Small Batches**: Process 5-10 counties at a time for better error handling
4. **Validation**: Use the template structure as a starting point
5. **Naming**: Use consistent naming conventions for IDs and formIds
6. **Keep It Simple**: Avoid complex nested structures - use inline search terms

## File Management

### Supported Formats
- `.json` files
- `application/json` MIME type

### File Size Limits
- Individual files: No strict limit (reasonable JSON size)
- Total batch: No strict limit (reasonable for browser memory)

### File Cleanup
- Files are automatically cleared after successful import
- Manual cleanup available via "Clear All" button
- Individual file removal via "Remove" buttons

## Integration with Existing System

The bulk import feature integrates seamlessly with:

- **Admin Dashboard**: Applications appear in the Applications tab
- **Backend API**: Creates necessary folder structures
- **Firestore**: Stores application data for frontend use
- **Existing Workflows**: New applications work with all existing features

## Security Considerations

- Only accessible to admin users
- File content is validated before processing
- No file storage on server (processed in memory)
- Input sanitization for all JSON data

## Performance Notes

- Processing is sequential to avoid conflicts
- Large batches may take several minutes
- Progress updates every application
- Memory usage scales with file size and count

## Support

For issues or questions about the bulk import feature:

1. Check the validation messages for specific errors
2. Review the JSON structure against the template
3. Check browser console for detailed error logs
4. Verify server connectivity and API endpoints

---

**Note**: This feature is designed to streamline the process of adding new counties to the MEHKO system. **Always use the simplified JSON structure** with inline search terms instead of complex nested subSteps. Use the template in `data/county-template.json` as a starting point.
