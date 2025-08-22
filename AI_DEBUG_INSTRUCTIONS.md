# 🚨 MEHKO Agent Debug Instructions for New AI Instance

## **CRITICAL PROBLEM SUMMARY**

**The Issue:** Our enhanced MEHKO agent successfully extracts content from county websites (8,822 characters from 3 PDFs) and performs web searches (5 additional sources), but the AI still generates generic, unhelpful content instead of specific, actionable information.

**What Users Need vs What They Get:**
- ❌ **Need**: "Application fee: $150, Annual permit: $300"
- ❌ **Get**: "Submit required fees (see fee schedule)"
- ❌ **Need**: "Complete Food Handler Certification at County College, $25, valid 3 years"
- ❌ **Get**: "Complete required training programs"
- ❌ **Need**: "Processing time: 10-15 business days"
- ❌ **Get**: "Timeline may vary based on your operation"

**Root Cause:** The AI is not effectively using the extracted PDF content and web search results to provide concrete details. Despite having 19 sources of information, it falls back to generic descriptions.

## **FILES TO EXAMINE**

### **1. Main Agent File: `scripts/mehko-agent-enhanced.mjs`**
- **Lines 1-100**: Class definition, initialization, main processing flow
- **Lines 1400-1500**: PDF content preprocessing and extraction methods  
- **Lines 1600-1700**: Enhanced prompt with mandatory requirements and examples
- **Lines 1700+**: Content truncation and validation methods

### **2. Generated Output: `generated/generated_san_diego_mehko.json`**
- **Current poor quality output** showing generic content despite having 19 sources
- **Examples of what NOT to generate**: "may vary based on your operation", "visit this page for more information"

### **3. Reference Quality: `data/manifest.json` (LA County)**
- **Shows what GOOD content looks like**: specific fees ($597), concrete requirements, actionable steps
- **Examples of what TO generate**: "Pay $597 review fee", "Processing typically takes 2-4 weeks"

## **CURRENT IMPLEMENTATION ANALYSIS**

### **What's Working:**
- ✅ PDF content extraction (8,822 characters from 3 PDFs)
- ✅ Web search integration (5 additional sources)
- ✅ Content preprocessing with key info extraction
- ✅ Enhanced prompts with examples
- ✅ Token management and truncation

### **What's Broken:**
- ❌ AI ignores extracted PDF content despite mandatory instructions
- ❌ AI generates generic phrases instead of specific details
- ❌ AI doesn't use the `extractedKeyInfo` data effectively
- ❌ Content quality is worse than the reference LA County example

## **DEBUGGING APPROACH**

### **Step 1: Verify Content Extraction**
Check if the agent is actually extracting the right information:
```bash
node scripts/mehko-agent-enhanced.mjs "https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/homekitchenoperations.html" "San Diego"
```

Look for these logs:
- `🔍 Pre-processed PDF content - Found:`
- `💰 Fees: X`, `📋 Requirements: X`, etc.
- `📊 Content size after truncation: X characters`

### **Step 2: Examine the Prompt**
The current prompt has strong instructions but the AI isn't following them. Look at:
- Lines 1600-1700 in the agent file
- The `MANDATORY:` sections
- The examples of good vs bad content

### **Step 3: Check Content Flow**
Verify that `extractedKeyInfo` is being passed to the AI:
- PDF content → `preprocessPDFContent()` → `extractedKeyInfo` → AI prompt
- Web search results → relevance scoring → AI prompt

### **Step 4: Test with Minimal Content**
Try running with just the main page content (no PDFs) to see if the issue is:
- Content overload (too many sources confusing the AI)
- PDF processing problems
- Prompt engineering issues

## **POTENTIAL SOLUTIONS TO TRY**

### **Option 1: Aggressive AI Constraints**
- Add validation that rejects generic responses
- Force retries if content isn't specific enough
- Add more examples of good vs bad content

### **Option 2: Simplify Content Processing**
- Reduce the number of sources sent to AI
- Focus on 2-3 most important PDFs instead of all sources
- Prioritize content by relevance score

### **Option 3: Restructure the Prompt**
- Make the prompt more focused and less verbose
- Use a step-by-step approach instead of one large prompt
- Add specific validation rules for each step

### **Option 4: Content Validation**
- Add post-processing to check if AI response contains specific details
- If not, automatically retry with simplified content
- Use regex patterns to validate specific information (fees, phone numbers, etc.)

## **SUCCESS CRITERIA**

The AI should generate content that:
- ✅ Includes specific dollar amounts for fees
- ✅ Lists exact requirements and documents needed
- ✅ Provides specific contact information (names, phone numbers, emails)
- ✅ States operational limits and restrictions clearly
- ✅ Includes processing timelines and deadlines
- ✅ Makes PDF form references clear and actionable

## **IMMEDIATE NEXT STEPS**

1. **Run the agent** and examine the logs to see what content is being extracted
2. **Compare the generated output** with the reference LA County example
3. **Identify the specific failure point** in the content processing pipeline
4. **Implement the most promising solution** from the options above
5. **Test with San Diego** to validate the fix

## **KEY INSIGHT**

**The problem isn't that we don't have the information - it's that the AI isn't using it effectively.** We need to either:
- Force the AI to use the extracted content more effectively, OR
- Simplify the content to make it easier for the AI to process

The goal is to get the AI to generate content as specific and actionable as the LA County example, not just generic references to "visit this page for more information."
