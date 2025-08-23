# 🧭 How To Generate a "Perfect" Application JSON From a Single URL

For a brand-new AI instance

## Goal

Turn one official source URL (e.g., a county department page) into a clean, complete, front-end–ready JSON that guides users step-by-step through an application (MEHKO today, any permit tomorrow). The JSON must be:

- **Accurate** (facts come from the source site and its own linked PDFs/pages).
- **Actionable** (fees, limits, contacts, timelines — not vague advice).
- **Compatible** with our existing renderer (LA JSON schema) while supporting optional UX upgrades.

## Inputs You'll Receive

- **`source_url`** (required): the official landing page to start from.
- **`scope_policy`** (optional):
  - `"onsite_only"` (default) → Use only pages and PDFs linked from the source site (same root domain).
  - `"allow_search"` → If crucial facts are missing on-site, you may run a web search to reputable authorities (still prefer on-site when possible).
  - If unspecified, assume `onsite_only`.

## Output You Must Produce

A single JSON object conforming to our base schema (below), with optional enhancements.

**No generic boilerplate. Every step must include concrete, user-doable instructions.**

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
      "content": "..."
    },
    {
      "id": "approvals_training",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "..."
    },
    {
      "id": "prepare_docs",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "..."
    },
    {
      "id": "sop_form",
      "title": "...",
      "type": "pdf",
      "formId": "SOP_ID",
      "appId": "sandiego_mehko",
      "action_required": true,
      "fill_pdf": true,
      "content": "..."
    },
    {
      "id": "permit_application_form",
      "title": "...",
      "type": "pdf",
      "formId": "APPLICATION_ID",
      "appId": "sandiego_mehko",
      "action_required": true,
      "fill_pdf": true,
      "content": "..."
    },
    {
      "id": "submit_application",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "..."
    },
    {
      "id": "inspection",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "..."
    },
    {
      "id": "receive_permit",
      "title": "...",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "..."
    },
    {
      "id": "operate_comply",
      "title": "...",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "..."
    },
    {
      "id": "contact",
      "title": "Contact Info",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "..."
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

### 4) Fill Optional UX (when obvious)

- **`actions.search`** for tricky items (e.g., CFPM providers) — default engine DuckDuckGo.
- **`actions.ai`** with a targeted prompt (e.g., "Help me compare ANSI-CFP courses near San Diego under $90").
- **`badges`** for cost/time/where.
- **`conditions`** (IF private well…).
- **`mistakes`** (e.g., "Submitting Food Handler card instead of CFPM").

### 5) Validate (quality gates)

Reject and fix if any fail:

- Specific fees present in `submit_application` (look for `\$` + digits).
- Contact step includes phone or email.
- Limits appear in either `planning_overview` or `operate_comply` (e.g., 30/90/$100k for MEHKO, or the correct limits for the target application).
- PDF steps (`sop_form`, `permit_application_form`) include `formId` and `appId`.
- No generic phrases like "see the website" when a specific fact exists.
- `rootDomain` is a bare domain (no protocol, no www).

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

## Example: One Step (good style)

```json
{
  "id": "approvals_training",
  "title": "Approvals & Training",
  "type": "info",
  "action_required": true,
  "fill_pdf": false,
  "content": "**What to do:** Get your Certified Food Protection Manager (CFPM) certificate.\n**Why it matters:** Proof of food safety competency is required before approval.\n**What you need:**\n- ☐ Enroll with an ANSI-CFP provider\n- ☐ Complete course + pass exam\n- ☐ Save certificate PDF for submission\n**Where/how:** Take an ANSI-CFP course online or in person (provider of your choice).\n**Cost & time:** ~$60–$90 · 4–8 hrs study + 2-hr exam\n**Ready when:** You have a PDF certificate ready to upload.",
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

## Final Checklist (before you return JSON)

- [ ] Steps use the micro-template (What/Why/Need/Where/Cost&Time/Ready).
- [ ] Fees are explicit ($ values present).
- [ ] Contact step has phone or email (ideally both + hours).
- [ ] Limits/eligibility clearly stated.
- [ ] PDF steps have `formId` + `appId`, and other steps reference them as "see Step <id>".
- [ ] `rootDomain` is clean (no protocol/www).
- [ ] Optional UX (`actions`, `badges`, `conditions`, `mistakes`, `quickStart`) included where helpful, omitted where unknown.
- [ ] (If provided) `meta.sourceMap` covers all critical numbers.

## System Prompt Starter (if you need one)

> "You are an expert application content compiler. Given a single official URL, crawl only that site and its direct PDFs/pages (unless `allow_search` is explicitly enabled). Extract exact fees, timelines, limits, requirements, forms, submission instructions, and contacts. Prefer PDF facts. Synthesize into the JSON schema provided. Each step's content must follow the micro-template (What/Why/Need/Where/Cost&Time/Ready). Include concrete numbers. If a form has its own step, reference it as 'see Step <id>' instead of linking. Do not invent facts. Return JSON only."
