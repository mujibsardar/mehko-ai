# AI Agent Instructions: Creating County MEHKO Applications

## Overview

You are tasked with creating JSON application files for California counties' MEHKO (Microenterprise Home Kitchen Operations) programs. Each county will have its own application structure that follows our established schema.

## What You Need to Do

### 1. Input

- **Source URL**: You will receive a county MEHKO program website URL
- **Example**: `https://www.sacramento-county.gov/mehko`

### 2. Output

- **Single JSON file** for the county (e.g., `sacramento_mehko.json`)
- **File structure** must match our template exactly

## Required Information to Extract

### Basic Details

- **County name** and program title
- **Program description** including key limits (meals/day, meals/week, revenue caps)
- **Root domain** (e.g., `sacramento-county.gov`)

### Step-by-Step Process

You must create these 10 steps in order:

1. **planning_overview** - Initial planning resources, guides, checklists
2. **approvals_training** - Required approvals, training programs, licensing
3. **prepare_docs** - List of required documents and where to get them
4. **sop_form** - Standard Operating Procedures form (PDF type)
5. **permit_application_form** - Main permit application (PDF type)
6. **submit_application** - Submission process, fees, payment methods
7. **inspection** - Inspection requirements and process
8. **receive_permit** - Timeline for receiving permit
9. **operate_comply** - Ongoing compliance and renewal requirements
10. **contact** - Program contact information (phone, email, website, hours)

### PDF Forms

- **SOP Form**: Find the Standard Operating Procedures template
- **Permit Application**: Find the main health permit application form
- **formId**: Create a unique identifier (e.g., `SACRAMENTO_SOP-English`)
- **appId**: Must match the county ID (e.g., `sacramento_mehko`)

## JSON Schema Requirements

### Required Fields

```json
{
  "id": "county_name_mehko",
  "title": "County Name MEHKO",
  "description": "Detailed description with key program details",
  "rootDomain": "county.gov",
  "supportTools": { "aiEnabled": true, "commentsEnabled": true },
  "steps": [
    /* 10 steps as described above */
  ]
}
```

### Step Structure

```json
{
  "id": "step_identifier",
  "title": "Step Title",
  "type": "info|pdf",
  "action_required": true|false,
  "fill_pdf": true|false,
  "content": "Step content with links and instructions",
  "formId": "FORM_ID", // Only for PDF type
  "appId": "county_id" // Only for PDF type
}
```

## Validation Rules

- `id` must match regex `/^[a-z0-9_]+$/`
- All required fields must be present
- At least one "info" and one "pdf" step required
- PDF steps must have `formId` and `appId`
- Each step must have unique `id`

## Example Output

Create a file like `sacramento_mehko.json` with the complete application structure.

## Integration Process

1. **You create** the county JSON file
2. **User runs** `node scripts/add-county.mjs sacramento_mehko.json`
3. **Script adds** the county to `data/manifest.json`
4. **User seeds** to Firestore with `node seed/seed-apps.mjs --file data/manifest.json`

## Key Files to Reference

- `data/county-template.json` - Template structure
- `data/manifest.json` - Current applications (for reference)
- `data/README.md` - Detailed documentation

## Important Notes

- **Focus on accuracy** - extract real information from official sources
- **Maintain consistency** - follow the exact step structure
- **Include all links** - official documents, forms, and resources
- **Be specific** - include actual fees, limits, and requirements
- **No PDF field mapping** - just the application structure and form links
