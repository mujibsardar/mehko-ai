# Data Structure Documentation

## Overview
This directory contains the application data for the MEHKO system. Applications are stored in `manifest.json` and seeded into Firebase Firestore.

## File Structure
- `manifest.json` - Main application manifest (array of county applications)
- `pdf-urls.json` - PDF document mappings for each application
- `county-template.json` - Template for creating new county applications

## Adding New Counties

### 1. Create County JSON
Use `county-template.json` as a starting point. Each county needs:
- Unique `id` (format: `county_name_mehko`)
- Accurate `title` and `description`
- Correct `rootDomain`
- Complete `steps` array with all required information

### 2. Update manifest.json
Add the new county JSON object to the `manifest.json` array.

### 3. Update pdf-urls.json
Add PDF mappings for the new county's forms.

### 4. Seed to Firestore
Run the seeding script:
```bash
# Dry run first
node seed/seed-apps.mjs --file data/manifest.json --dry-run

# Then seed to emulator or production
node seed/seed-apps.mjs --file data/manifest.json --emulator
```

## Required Steps Structure
Each county application must include these steps:
1. **planning_overview** - Initial planning and resources
2. **approvals_training** - Required approvals and training
3. **prepare_docs** - Document preparation
4. **sop_form** - Standard Operating Procedures (PDF type)
5. **permit_application_form** - Main permit application (PDF type)
6. **submit_application** - Submission process and fees
7. **inspection** - Inspection requirements
8. **receive_permit** - Permit receipt timeline
9. **operate_comply** - Ongoing compliance
10. **contact** - Program contact information

## Validation Rules
- `id` must match regex `/^[a-z0-9_]+$/`
- `title`, `description`, `rootDomain` are required strings
- `supportTools.aiEnabled` and `supportTools.commentsEnabled` must be booleans
- `steps` array must contain at least one "info" and one "pdf" type
- Each step must have unique `id`, `title`, `type`, and `content`
- PDF steps require `formId` and `appId`
