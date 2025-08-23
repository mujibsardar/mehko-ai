# AI Application JSON Generation Guide

## Overview

This guide provides instructions for AI agents to generate JSON files for new county MEHKO applications. Follow the exact structure below to create working applications.

## ⚠️ CRITICAL: PDF STEPS ARE REQUIRED

**Every MEHKO application MUST have PDF steps for forms users need to fill out.**

## JSON Structure (Follow Exactly)

```json
{
  "id": "county_name_mehko",
  "title": "County Name MEHKO",
  "description": "Brief description with key limits and fees",
  "rootDomain": "county.gov",
  "supportTools": { "aiEnabled": true, "commentsEnabled": true },
  "steps": [
    {
      "id": "step_id",
      "title": "Step Title",
      "type": "info|pdf",
      "action_required": true|false,
      "fill_pdf": true|false,
      "content": "Step content in plain text",
      "searchTerms": ["search phrase 1", "search phrase 2"],
      "formId": "FORM_ID_HERE", // Required for PDF steps only
      "pdfUrl": "https://county.gov/forms/form.pdf", // Required for PDF steps only
      "appId": "county_name_mehko" // Must match the main ID
    }
  ]
}
```

## Content Guidelines

### Step Content Structure (Plain Text Only)

```
What to do: [Clear action description]

Why it matters: [Brief explanation of importance]

What you need:
- ☐ [Requirement 1]
- ☐ [Requirement 2]
- ☐ [Requirement 3]

Where/how: [Instructions on how to complete - can include website references]

Cost & time: [Cost] · [Time estimate]

Ready when: [Clear completion criteria]
```

**Note:** For "Where/how" sections, you can include statements like "Visit [County Name]'s MEHKO webpage" or "Check the county website for current fees." The frontend will automatically detect these references and provide action buttons for visiting the website and searching for more information.

### Search Terms

- **Use `searchTerms` array** - never put search terms in content
- **Include county name** for local specificity
- **Keep phrases under 60 characters**
- **Focus on what users would actually search for**

## Step Types

### 1. Info Steps

- **Purpose:** Provide information and instructions
- **Content:** Use the standard structure above
- **fill_pdf:** Always false
- **Required fields:** id, title, type, action_required, fill_pdf, content, searchTerms, appId
- **Optional fields:** None

### 2. PDF Steps ⚠️ REQUIRED

- **Purpose:** Forms users need to fill out
- **Content:** Explain what the form is for
- **fill_pdf:** Always true
- **Required fields:** id, title, type, action_required, fill_pdf, content, searchTerms, appId, formId, pdfUrl

## ⚠️ REQUIRED PDF STEPS

### Every Application Must Have:

1. **SOP Form Step:**

   ```json
   {
     "id": "sop_form",
     "title": "Standard Operating Procedures (SOP)",
     "type": "pdf",
     "formId": "[COUNTY]_MEHKO_SOP-English",
     "pdfUrl": "https://county.gov/forms/mehko-sop.pdf",
     "appId": "[county_name_mehko]",
     "action_required": true,
     "fill_pdf": true,
     "content": "What to do: Complete the MEHKO SOP form covering menu, preparation, storage, and sanitation.\n\nWhy it matters: This shows the county how you will keep food safe at home.\n\nWhat you need:\n- ☐ Menu and ingredients list\n- ☐ Prep/cooking/cooling/holding details\n- ☐ Cleaning/sanitizing plan; handwashing setup\n\nWhere/how: Complete the SOP form in this step.\n\nCost & time: $0 · 30–60 minutes\n\nReady when: SOP is complete and consistent with your operation.",
     "searchTerms": [
       "[County Name] MEHKO SOP template",
       "[County Name] food safety SOP requirements"
     ]
   }
   ```

2. **Permit Application Step:**
   ```json
   {
     "id": "permit_application_form",
     "title": "Health Permit Application",
     "type": "pdf",
     "formId": "[COUNTY]_MEHKO_PermitApplication",
     "pdfUrl": "https://county.gov/forms/mehko-permit.pdf",
     "appId": "[county_name_mehko]",
     "action_required": true,
     "fill_pdf": true,
     "content": "What to do: Complete the county Health Permit Application for a Microenterprise Home Kitchen Operation.\n\nWhy it matters: This is the official request to operate a MEHKO.\n\nWhat you need:\n- ☐ Owner contact and site address\n- ☐ CFPM certificate details\n- ☐ SOP (see Step sop_form)\n\nWhere/how: Complete the application in this step.\n\nCost & time: $0 to fill · 15–30 minutes\n\nReady when: Application is complete and matches your SOP.",
     "searchTerms": [
       "[County Name] MEHKO permit application",
       "[County Name] Health Permit Application form"
     ]
   }
   ```

## Required Fields

### Application Level

- **id:** county identifier (e.g., "orange_county_mehko") - lowercase, underscores only
- **title:** human-readable name (e.g., "Orange County MEHKO")
- **description:** brief overview with key details (meal limits, fees, restrictions)
- **rootDomain:** county website domain without protocol (e.g., "orangecounty.gov")
- **supportTools:** keep exactly as shown above

### Step Level (All Steps)

- **id:** unique step identifier (e.g., "planning_overview", "sop_form")
- **title:** clear step title
- **type:** "info" or "pdf"
- **action_required:** true if user must do something, false if informational only
- **fill_pdf:** true for PDF steps, false for info steps
- **content:** step content in plain text (no markdown, no bold/italic)
- **searchTerms:** array of search phrases (never empty)
- **appId:** must exactly match the main application ID

### PDF Steps Only (Additional Required Fields)

- **formId:** form identifier (e.g., "MEHKO_SOP-English", "MEHKO_PermitApplication")
- **pdfUrl:** direct link to download the PDF from county website

## Common Step Sequence

1. **Planning Overview** (info) - Understand requirements and limits
2. **Approvals & Training** (info) - Get certifications and permissions
3. **SOP Form** (pdf) ⚠️ REQUIRED - Complete Standard Operating Procedures
4. **Permit Application** (pdf) ⚠️ REQUIRED - Fill out main application
5. **Submit & Pay** (info) - Submit application and fees
6. **Inspection** (info) - Schedule and pass inspection
7. **Receive Permit** (info) - Get final approval
8. **Operate & Comply** (info) - Stay within rules and renew
9. **Contact Info** (info) - County contact information

## ⚠️ VALIDATION CHECKLIST

Before finalizing, ensure ALL of these are true:

- [ ] **2 PDF steps included** (SOP + Permit Application)
- [ ] **All PDF steps have `pdfUrl`** (direct download link that works)
- [ ] **All PDF steps have `formId`** (form identifier)
- [ ] **All PDF steps have `fill_pdf: true`**
- [ ] **All info steps have `fill_pdf: false`**
- [ ] **Content uses plain text only** (no markdown, no **bold**)
- [ ] **Search terms in array** (not embedded in content)
- [ ] **appId matches exactly** in all steps
- [ ] **No missing required fields** for any step type

## Example Complete Info Step

```json
{
  "id": "approvals_training",
  "title": "Approvals & Training",
  "type": "info",
  "action_required": true,
  "fill_pdf": false,
  "content": "**What to do:** Get your Certified Food Protection Manager (CFPM) credential and any needed property approvals.\n\n**Why it matters:** Food safety certification is required and property rules may apply.\n\n**What you need:**\n- ☐ CFPM certificate (ANSI-CFP recognized)\n- ☐ Landlord/HOA OK if applicable\n- ☐ City business license if required\n\n**Where/how:** Take an ANSI-approved CFPM course; check local business license rules. Visit the county website for approved course providers.\n\n**Cost & time:** ~$60–$90 · 1–2 days total\n\n**Ready when:** You have a CFPM certificate and any property/business approvals.",
  "searchTerms": [
    "ANSI-CFP Food Protection Manager [County Name]",
    "[County Name] renter permission MEHKO",
    "[County Name] business license home food operation"
  ],
  "appId": "county_name_mehko"
}
```

**Note:** The "Where/how" section includes "Visit the county website for approved course providers" - the frontend will automatically detect this and provide action buttons for website access and search functionality.

## Research Requirements

### What to Research for Each County:

- **Meal limits:** Daily and weekly maximums
- **Annual fees:** Current permit costs
- **Restrictions:** What's not allowed (e.g., signage, delivery, raw milk)
- **Requirements:** Specific certifications or approvals needed
- **Contact info:** Phone numbers, office locations, website
- **PDF forms:** Direct download links for SOP and permit applications
- **External references:** Website mentions, FAQ references, and other resources users can visit

### Where to Find Information:

- County Environmental Health website
- County Public Health department
- MEHKO program pages
- Fee schedules
- Contact directories

### How to Handle External References:

When writing "Where/how" sections, you can include statements like:
- "Visit [County Name]'s MEHKO webpage and FAQ"
- "Check the county website for current fee schedules"
- "Go to the Environmental Health department website for forms"

**The frontend will automatically detect these references and provide:**
- 🌐 **Visit Website** button (opens county website)
- 🔍 **Search Google** button (searches for more information)

This keeps your JSON simple while providing users with actionable ways to get more information.

## Common Mistakes to Avoid

- **Missing PDF steps** - Every application needs them
- **Generic content** - Make it county-specific
- **Broken links** - Test pdfUrl links before including
- **Wrong field types** - Use correct boolean values (true/false, not "true"/"false")
- **Missing appId** - Every step must have it
- **Markdown in content** - Use plain text only
- **Empty searchTerms** - Always include relevant search phrases

## Notes

- **Keep it simple:** No complex nesting, subSteps, or advanced features
- **PDF steps required:** Every application needs SOP and Permit Application steps
- **Include working download links:** Users need to access actual forms
- **Plain text content:** No markdown, no special formatting, no bold/italic
- **Follow the template exactly:** Use the structure shown above
- **Validate thoroughly:** Use the checklist before providing final JSON

**Remember: PDF steps are not optional - they are essential for a functional MEHKO application. Without them, users cannot complete the required forms.**
