# 🧭 How To Generate a "Perfect" Application JSON From a Single URL

For a brand-new AI instance

## Goal

Turn one official source URL (e.g., a county department page) into a clean, complete, front-end–ready JSON that guides users step-by-step through an application (MEHKO today, any permit tomorrow). The JSON must be:

- **Accurate** (facts come from the source site and its own linked PDFs/pages).
- **Actionable** (fees, limits, contacts, timelines — not vague advice).
- **Compatible** with our existing renderer (LA JSON schema) while supporting optional UX upgrades.
- **Searchable** (each sub-step includes relevant search phrases for users to research further).

## Inputs You'll Receive

- **`source_url`** (required): the official landing page to start from.
- **`scope_policy`** (optional):
  - `"onsite_only"` (default) → Use only pages and PDFs linked from the source site (same root domain).
  - `"allow_search"` → If crucial facts are missing on-site, you may run a web search to reputable authorities (still prefer on-site when possible).
  - If unspecified, assume `onsite_only`.

## Output You Must Produce

A single JSON object conforming to our base schema (below), with optional enhancements.

**No generic boilerplate. Every step must include concrete, user-doable instructions with searchable sub-steps.**

### Base (Required) Schema (Back-compat)

```json
{
  "id": "sandiego_mehko",
  "title": "San Diego MEHKO",
  "description": "Short, concrete summary (e.g., daily/weekly/annual limits).",
  "rootDomain": "sandiegocounty.gov",
  "supportTools": { "aiEnabled": true, "commentsEnabled": true },
  "steps": [
    {
      "id": "planning_overview",
      "title": "...",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "...",
      "subSteps": [
        {
          "text": "**Operating limits:** Up to **30 meals/day** and **90/week**; **gross annual sales ≤ $100,000** (indexed to CPI).",
          "searchPhrases": [
            "San Diego County MEHKO daily meal limits",
            "MEHKO weekly meal restrictions San Diego",
            "San Diego MEHKO annual revenue cap $100000",
            "MEHKO CPI adjustment San Diego County"
          ]
        },
        {
          "text": "**Eligibility:** Must be a **non-profit organization** or **government entity** serving vulnerable populations.",
          "searchPhrases": [
            "San Diego MEHKO eligibility requirements",
            "MEHKO non-profit organization qualification",
            "San Diego County government entity MEHKO",
            "vulnerable populations MEHKO San Diego"
          ]
        }
      ]
    },
    {
      "id": "approvals_training",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "...",
      "subSteps": [
        {
          "text": "**CFPM Certificate:** Obtain Certified Food Protection Manager certification from ANSI-CFP provider.",
          "searchPhrases": [
            "ANSI-CFP Food Protection Manager San Diego",
            "CFPM certification providers San Diego County",
            "food safety manager course San Diego",
            "ANSI-CFP online course San Diego"
          ]
        },
        {
          "text": "**Landlord/HOA Approval:** Get written approval if operating from rental property or HOA-governed area.",
          "searchPhrases": [
            "San Diego County landlord approval MEHKO",
            "HOA approval food service San Diego",
            "zoning requirements MEHKO San Diego",
            "San Diego PDS zoning contact food service"
          ]
        }
      ]
    },
    {
      "id": "prepare_docs",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "...",
      "subSteps": [
        {
          "text": "**Business License:** Valid business license from your city or county.",
          "searchPhrases": [
            "San Diego business license application",
            "San Diego County business permit food service",
            "business license renewal San Diego",
            "San Diego business permit requirements"
          ]
        },
        {
          "text": "**Insurance Certificate:** General liability insurance with minimum $1M coverage.",
          "searchPhrases": [
            "general liability insurance food service San Diego",
            "business insurance $1M coverage San Diego",
            "food service liability insurance providers",
            "San Diego business insurance requirements"
          ]
        }
      ]
    },
    {
      "id": "sop_form",
      "title": "...",
      "type": "pdf",
      "formId": "SOP_ID",
      "appId": "sandiego_mehko",
      "action_required": true,
      "fill_pdf": true,
      "content": "...",
      "subSteps": [
        {
          "text": "**Standard Operating Procedures:** Complete SOP form with food safety protocols.",
          "searchPhrases": [
            "MEHKO SOP form San Diego County",
            "food safety SOP template San Diego",
            "standard operating procedures food service",
            "San Diego MEHKO SOP requirements"
          ]
        }
      ]
    },
    {
      "id": "permit_application_form",
      "title": "...",
      "type": "pdf",
      "formId": "APPLICATION_ID",
      "appId": "sandiego_mehko",
      "action_required": true,
      "fill_pdf": true,
      "content": "...",
      "subSteps": [
        {
          "text": "**Application Form 152:** Complete Health Permit Application with all required information.",
          "searchPhrases": [
            "San Diego MEHKO Form 152",
            "Health Permit Application San Diego County",
            "MEHKO application form download",
            "San Diego food service permit application"
          ]
        }
      ]
    },
    {
      "id": "submit_application",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "...",
      "subSteps": [
        {
          "text": "**Application Fee:** Pay $597 non-refundable application fee.",
          "searchPhrases": [
            "San Diego MEHKO application fee $597",
            "MEHKO permit fee San Diego County",
            "food service permit cost San Diego",
            "San Diego County permit application payment"
          ]
        },
        {
          "text": "**Submission Method:** Submit online through DEHQ portal or mail to Environmental Health.",
          "searchPhrases": [
            "San Diego DEHQ online portal",
            "Environmental Health submission San Diego",
            "MEHKO online application San Diego",
            "San Diego County permit submission methods"
          ]
        }
      ]
    },
    {
      "id": "inspection",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "...",
      "subSteps": [
        {
          "text": "**Site Inspection:** Schedule inspection within 10-15 business days of application approval.",
          "searchPhrases": [
            "San Diego MEHKO site inspection",
            "food service inspection scheduling San Diego",
            "MEHKO inspection timeline San Diego County",
            "San Diego Environmental Health inspection"
          ]
        }
      ]
    },
    {
      "id": "receive_permit",
      "title": "...",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "...",
      "subSteps": [
        {
          "text": "**Permit Issuance:** Receive permit within 2-3 business days after passing inspection.",
          "searchPhrases": [
            "San Diego MEHKO permit issuance",
            "food service permit timeline San Diego",
            "MEHKO permit delivery San Diego County",
            "San Diego permit processing time"
          ]
        }
      ]
    },
    {
      "id": "operate_comply",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "...",
      "subSteps": [
        {
          "text": "**Annual Renewal:** Renew permit annually with $150 renewal fee.",
          "searchPhrases": [
            "San Diego MEHKO annual renewal",
            "MEHKO renewal fee $150 San Diego",
            "food service permit renewal San Diego County",
            "San Diego permit renewal process"
          ]
        },
        {
          "text": "**Compliance Monitoring:** Maintain food safety standards and keep records for inspection.",
          "searchPhrases": [
            "San Diego MEHKO compliance requirements",
            "food safety standards San Diego County",
            "MEHKO record keeping San Diego",
            "San Diego food service compliance monitoring"
          ]
        }
      ]
    },
    {
      "id": "contact",
      "title": "Contact Info",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "...",
      "subSteps": [
        {
          "text": "**DEHQ Main Office:** (858) 505-6900, Monday-Friday 8:00 AM - 5:00 PM",
          "searchPhrases": [
            "San Diego DEHQ phone number",
            "Environmental Health San Diego County contact",
            "MEHKO program contact San Diego",
            "San Diego food service permit office"
          ]
        },
        {
          "text": "**Zoning Questions:** Contact PDS Zoning at (858) 565-5981",
          "searchPhrases": [
            "San Diego PDS zoning contact",
            "zoning questions food service San Diego",
            "San Diego County planning department",
            "MEHKO zoning requirements San Diego"
          ]
        }
      ]
    }
  ]
}
```

### Optional Enhancements (Renderer will ignore if absent)

- **`quickStart`**: compact top-of-page bullets (Apply → Pay → Inspect → Permit → Operate).
- **Per-step**: actions (AI / search buttons), badges (cost/time/where), conditions (IF renting…), mistakes (common pitfalls).
- **`meta.sourceMap`** (for audit): map of facts → URLs and page/PDF line hints.

## Step Content: Micro-Template (Use This Structure)

Every `step.content` must follow this structure (plain text/markdown):

```
**What to do:** <1 short sentence>
**Why it matters:** <1 short sentence>
**What you need:**
- ☐ item 1
- ☐ item 2
- ☐ item 3
**Where/how:** <one clear action or internal reference e.g., "see Step sop_form">
**Cost & time:** <$X> · <Y–Z time>
**Ready when:** <clear finish condition>
```

Use checkbox bullets (they drive completion in the UI).

If a PDF has its own step, do not link that PDF here — write "see Step <id>".

## Sub-Steps with Search Phrases: Enhanced Structure

Every step should include `subSteps` array with detailed, searchable content:

### Sub-Step Structure

```json
"subSteps": [
  {
    "text": "**Specific requirement or instruction** with key details and numbers.",
    "searchPhrases": [
      "primary search term jurisdiction application type",
      "secondary search term specific requirement",
      "tertiary search term location context",
      "alternative search term related concept"
    ]
  }
]
```

### Search Phrase Guidelines

- **Primary**: `[Jurisdiction] [Application Type] [Specific Requirement]`
- **Secondary**: `[Application Type] [Requirement] [Location]`
- **Tertiary**: `[Requirement] [Location] [Context]`
- **Alternative**: `[Related Concept] [Location] [Application Type]`

### Search Phrase Examples

For "Get CFPM Certificate":

- ✅ `"San Diego County MEHKO CFPM certification"`
- ✅ `"ANSI-CFP Food Protection Manager San Diego"`
- ✅ `"food safety manager course San Diego"`
- ❌ `"get certificate"` (too generic)
- ❌ `"food safety"` (too broad)

## Crawl → Extract → Synthesize: Your Process

### 1) Crawl (respect scope_policy)

- Load the `source_url`. Collect on-page text and all same-site links.
- Keep only same-root-domain links. Rank high-value links by text/href signals: `pdf`, `form`, `application`, `permit`, `fee`, `schedule`, `requirements`, `checklist`, `contact`.
- Visit up to N pages (e.g., 5–8) and N PDFs (e.g., 3–5), prioritizing PDFs.

### 2) Extract Facts (hard requirements)

From the site pages and linked PDFs, pull exact, verifiable details:

- **Fees** (application, annual, inspection, late/penalty).
- **Timelines** (review time, inspection scheduling, permit issuance).
- **Operational limits** (meals/day, meals/week, revenue caps, hours).
- **Eligibility/requirements** (training, certificates, water tests, landlord approval, zoning, insurance if stated).
- **Contacts** (program name, phone, email, hours, addresses).
- **Submission** (where/how to submit, online portal, email address, mailing instructions, payment methods).
- **Forms** (names, IDs, when to use; but PDFs get their own steps).

Prefer PDF text over page summaries when there's a conflict.

### 3) Synthesize Into Steps (micro-template)

- Convert each requirement into crisp, actionable bullets.
- Fill in numbers (e.g., $597, 30 meals/day, 10–15 business days).
- Keep sentences short. Avoid passive voice and legalese.

### 4) Generate Sub-Steps with Search Phrases

For each step, create 2-4 sub-steps that:

- **Break down complex requirements** into digestible pieces
- **Include specific numbers and details** (fees, limits, contacts)
- **Provide 3-4 search phrases** that users can use to research further
- **Cover different search angles** (jurisdiction-specific, general concept, location-based)

### 5) Fill Optional UX (when obvious)

- **`actions.search`** for tricky items (e.g., CFPM providers) — default engine DuckDuckGo.
- **`actions.ai`** with a targeted prompt (e.g., "Help me compare ANSI-CFP courses near San Diego under $90").
- **`badges`** for cost/time/where.
- **`conditions`** (IF private well…).
- **`mistakes`** (e.g., "Submitting Food Handler card instead of CFPM").

### 6) Validate (quality gates)

Reject and fix if any fail:

- Specific fees present in `submit_application` (look for `\$` + digits).
- Contact step includes phone or email.
- Limits appear in either `planning_overview` or `operate_comply` (e.g., 30/90/$100k for MEHKO, or the correct limits for the target application).
- PDF steps (`sop_form`, `permit_application_form`) include `formId` and `appId`.
- No generic phrases like "see the website" when a specific fact exists.
- `rootDomain` is a bare domain (no protocol, no www).
- **Each step has 2-4 sub-steps with relevant search phrases.**
- **Search phrases are specific and actionable (not generic terms).**

## Conflict & Missing Data Rules

- **Conflict**: Prefer latest dated PDF or the official fee schedule page. If still ambiguous, include the lowest common denominator and note in `operate_comply` ("Confirm with DEHQ if seasonal rates apply.").
- **Missing on-site facts** (`onsite_only`): Mark the field as unknown using clear text ("Fee not listed on site. Contact program.").
- **Missing on-site facts** (`allow_search`): Search only reputable sources (.gov/.us/.state domain); cite in `meta.sourceMap`.

## Naming & Formatting Conventions

- **`id`**: `<slug>_mehko` (or `<slug>_<app>` for non-MEHKO use).
- **`formId`**: short, stable handle (e.g., `SANDIEGO_SOP-English`).
- **`description`**: one line with marquee numbers (e.g., "Up to 30/day · 90/week · $100k cap").
- **Phone format**: `(###) ###-####`.
- Strip trailing ellipses; avoid "may vary" unless the site explicitly says so.
- **Search phrases**: Use title case, include jurisdiction and specific terms, avoid generic words.

## Example: One Step with Sub-Steps (good style)

```json
{
  "id": "approvals_training",
  "title": "Approvals & Training",
  "type": "info",
  "action_required": true,
  "fill_pdf": false,
  "content": "**What to do:** Get your Certified Food Protection Manager (CFPM) certificate.\n**Why it matters:** Proof of food safety competency is required before approval.\n**What you need:**\n- ☐ Enroll with an ANSI-CFP provider\n- ☐ Complete course + pass exam\n- ☐ Save certificate PDF for submission\n**Where/how:** Take an ANSI-CFP course online or in person (provider of your choice).\n**Cost & time:** ~$60–$90 · 4–8 hrs study + 2-hr exam\n**Ready when:** You have a PDF certificate ready to upload.",
  "subSteps": [
    {
      "text": "**CFPM Certificate:** Obtain Certified Food Protection Manager certification from ANSI-CFP provider.",
      "searchPhrases": [
        "ANSI-CFP Food Protection Manager San Diego",
        "CFPM certification providers San Diego County",
        "food safety manager course San Diego",
        "ANSI-CFP online course San Diego"
      ]
    },
    {
      "text": "**Landlord/HOA Approval:** Get written approval if operating from rental property or HOA-governed area.",
      "searchPhrases": [
        "San Diego County landlord approval MEHKO",
        "HOA approval food service San Diego",
        "zoning requirements MEHKO San Diego",
        "San Diego PDS zoning contact food service"
      ]
    },
    {
      "text": "**Water Source Verification:** Confirm your water source meets health department standards.",
      "searchPhrases": [
        "San Diego water source requirements MEHKO",
        "water quality standards food service San Diego",
        "MEHKO water source verification San Diego County",
        "San Diego Environmental Health water requirements"
      ]
    }
  ],
  "actions": [
    {
      "type": "ai",
      "label": "Ask AI about CFPM",
      "aiPrompt": "Find ANSI-CFP courses near San Diego under $90 and show fastest options."
    },
    {
      "type": "search",
      "label": "Search providers",
      "engine": "duckduckgo",
      "query": "ANSI-CFP Food Protection Manager course San Diego"
    }
  ],
  "mistakes": ["Submitting a Food Handler card instead of CFPM."]
}
```

## Source Mapping (optional but recommended)

Add a developer-only map so humans can audit facts:

```json
{
  "meta": {
    "sourceMap": {
      "fees.application": "https://sandiegocounty.gov/.../fee-schedule.pdf#p=2",
      "contact.email": "https://sandiegocounty.gov/.../contact.html",
      "limits.daily_meals": "https://sandiegocounty.gov/.../mehko-faq.pdf#p=3"
    }
  }
}
```

Renderer will ignore `meta`.

## Safety & Hallucination Controls

- Never invent fees, timelines, or contacts. If not on-site (and search is disallowed), say it's unknown and direct the user to Contact.
- Quote numbers exactly as written (rounding only if the site explicitly gives a range).
- Prefer PDFs over web pages when both exist.
- **Search phrases must be based on actual content found, not invented terms.**

## Final Checklist (before you return JSON)

- [ ] Steps use the micro-template (What/Why/Need/Where/Cost&Time/Ready).
- [ ] Fees are explicit ($ values present).
- [ ] Contact step has phone or email (ideally both + hours).
- [ ] Limits/eligibility clearly stated.
- [ ] PDF steps have `formId` + `appId`, and other steps reference them as "see Step <id>".
- [ ] `rootDomain` is clean (no protocol/www).
- [ ] Optional UX (`actions`, `badges`, `conditions`, `mistakes`, `quickStart`) included where helpful, omitted where unknown.
- [ ] (If provided) `meta.sourceMap` covers all critical numbers.
- [ ] **Each step has 2-4 sub-steps with detailed, actionable content.**
- [ ] **Sub-steps include 3-4 relevant search phrases that are specific and searchable.**
- [ ] **Search phrases follow the naming convention: [Jurisdiction] [Application Type] [Specific Requirement].**

## System Prompt Starter (if you need one)

> "You are an expert application content compiler. Given a single official URL, crawl only that site and its direct PDFs/pages (unless `allow_search` is explicitly enabled). Extract exact fees, timelines, limits, requirements, forms, submission instructions, and contacts. Prefer PDF facts. Synthesize into the JSON schema provided. Each step's content must follow the micro-template (What/Why/Need/Where/Cost&Time/Ready). **Each step must include 2-4 sub-steps with detailed content and 3-4 search phrases for user research.** Include concrete numbers. If a form has its own step, reference it as 'see Step <id>' instead of linking. Do not invent facts. Return JSON only."
