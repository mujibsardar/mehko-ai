#!/usr/bin/env node
import puppeteer from "puppeteer";
import fs from "fs";
import OpenAI from "openai";
import path from "path";
import url from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

class EnhancedMEHKOAgent {
  constructor(openaiApiKey) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.browser = null;
    this.page = null;
    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      totalCost: 0,
    };
  }

  async initialize() {
    console.log("🚀 Initializing Enhanced MEHKO Agent...");
    this.browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();

    // Set user agent to avoid blocking
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log("✅ Agent initialized successfully");
  }

  async processCounty(url, countyName = null) {
    console.log(`\n🕷️ Processing county: ${countyName || url}`);

    try {
      // Step 1: Extract raw content efficiently
      const rawContent = await this.extractRawContent(url);

      // Step 2: Generate application JSON
      const countyJson = await this.generateCompleteApplication(
        rawContent,
        url,
        countyName
      );

      // Step 3: Validate the generated JSON
      const validationResult = this.validateApplication(countyJson);
      if (!validationResult.isValid) {
        throw new Error(
          `Validation failed: ${validationResult.errors.join(", ")}`
        );
      }

      // Step 4: Save the result
      const filename = `generated_${countyJson.id}.json`;
      const outputPath = path.join(__dirname, "..", "generated", filename);

      // Ensure generated directory exists
      const generatedDir = path.dirname(outputPath);
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(countyJson, null, 2));

      this.stats.successful++;
      console.log(`✅ Successfully processed ${countyName || url}`);
      console.log(`📁 Saved to: ${filename}`);
      console.log(`💰 Estimated cost: ~$0.06-0.12`);

      return {
        success: true,
        data: countyJson,
        filename: filename,
        path: outputPath,
      };
    } catch (error) {
      this.stats.failed++;
      console.error(
        `❌ Failed to process ${countyName || url}:`,
        error.message
      );

      return {
        success: false,
        error: error.message,
        url: url,
      };
    } finally {
      this.stats.processed++;
    }
  }

  async processBatch(counties) {
    console.log(
      `🚀 Starting batch processing of ${counties.length} counties...`
    );

    const results = [];

    for (let i = 0; i < counties.length; i++) {
      const county = counties[i];
      console.log(`\n📊 Progress: ${i + 1}/${counties.length}`);

      const result = await this.processCounty(county.url, county.name);
      results.push(result);

      // Add delay between requests to be respectful
      if (i < counties.length - 1) {
        console.log("⏳ Waiting 2 seconds before next request...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    this.printBatchSummary(results);
    return results;
  }

  async extractRawContent(url) {
    console.log(`🌐 Navigating to: ${url}`);

    try {
      await this.page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait a bit for dynamic content
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("📄 Extracting main page content...");

      const mainPageContent = await this.page.evaluate(() => {
        const extractText = (selector, maxLength = 500) => {
          const elements = document.querySelectorAll(selector);
          let text = Array.from(elements)
            .map((el) => el.textContent.trim())
            .join(" ");
          return text.length > maxLength
            ? text.substring(0, maxLength) + "..."
            : text;
        };

        const extractLinks = () => {
          const links = document.querySelectorAll(
            'a[href*=".pdf"], a[href*="form"], a[href*="application"], a[href*="permit"], a[href*="guide"], a[href*="checklist"], a[href*="requirements"]'
          );
          return Array.from(links)
            .map((link) => ({
              text: link.textContent.trim().substring(0, 100),
              href: link.href,
              isDownload:
                link.href.includes(".pdf") || link.href.includes("download"),
              type: categorizeLink(link.href, link.textContent),
            }))
            .slice(0, 20); // Increased limit for better coverage
        };

        const extractForms = () => {
          const forms = document.querySelectorAll(
            'form, [class*="form"], [id*="form"]'
          );
          return Array.from(forms)
            .map((form) => ({
              action: form.action || "",
              method: form.method || "GET",
              fields: Array.from(
                form.querySelectorAll("input, select, textarea")
              )
                .map((field) => ({
                  type: field.type || "text",
                  name: field.name || "",
                  placeholder: field.placeholder || "",
                }))
                .slice(0, 10),
            }))
            .slice(0, 5);
        };

        // Helper function to categorize links
        const categorizeLink = (href, text) => {
          const lowerHref = href.toLowerCase();
          const lowerText = text.toLowerCase();

          if (lowerHref.includes(".pdf")) return "pdf";
          if (lowerText.includes("form") || lowerText.includes("application"))
            return "form";
          if (lowerText.includes("guide") || lowerText.includes("manual"))
            return "guide";
          if (
            lowerText.includes("checklist") ||
            lowerText.includes("requirements")
          )
            return "requirements";
          if (
            lowerText.includes("fee") ||
            lowerText.includes("cost") ||
            lowerText.includes("payment")
          )
            return "fees";
          if (
            lowerText.includes("contact") ||
            lowerText.includes("phone") ||
            lowerText.includes("email")
          )
            return "contact";
          return "other";
        };

        // Enhanced content extraction with better selectors
        const extractEnhancedContent = () => {
          // Try multiple selectors for different content types
          const contentSelectors = [
            'main, .content, .main-content, article, .page-content',
            '.text-content, .body-content, .post-content',
            '.entry-content, .content-area, .main-text',
            'p, .description, .summary, .overview'
          ];
          
          let content = '';
          for (const selector of contentSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              content = Array.from(elements)
                .map(el => el.textContent.trim())
                .join(' ');
              break;
            }
          }
          
          return content.length > 1000 ? content.substring(0, 1000) + '...' : content;
        };

        return {
          title:
            document
              .querySelector("h1, .title, .page-title, .main-title")
              ?.textContent?.trim() || "",
          mainContent: extractEnhancedContent(),
          forms: extractLinks(),
          formElements: extractForms(),
          contact: extractText(
            '.contact, .contact-info, address, [class*="contact"], [class*="phone"], [class*="email"]',
            400
          ),
          fees: extractText(
            '.fees, .cost, .payment, [class*="fee"], [class*="cost"], [class*="price"]',
            300
          ),
          requirements: extractText(
            '.requirements, .checklist, .steps, [class*="requirement"], [class*="checklist"]',
            500
          ),
          regulations: extractText(
            '.regulations, .rules, .guidelines, [class*="regulation"], [class*="rule"]',
            400
          ),
          url: window.location.href,
          domain: window.location.hostname,
          lastUpdated:
            document
              .querySelector("time, .date, .updated")
              ?.textContent?.trim() || "",
        };
      });

      console.log(
        `📊 Main page content extracted: ${
          JSON.stringify(mainPageContent).length
        } characters`
      );

      // Step 2: Extract content from PDFs and important external links
      console.log("🔗 Extracting content from PDFs and external links...");
      const externalContent = await this.extractExternalContent(
        mainPageContent.forms
      );

      // Step 3: Combine all content
      const combinedContent = {
        ...mainPageContent,
        externalContent: externalContent,
        totalSources: 1 + externalContent.length,
      };

      console.log(
        `📊 Combined content: ${
          JSON.stringify(combinedContent).length
        } characters from ${combinedContent.totalSources} sources`
      );
      return combinedContent;
    } catch (error) {
      throw new Error(`Failed to extract content: ${error.message}`);
    }
  }

  async extractExternalContent(links) {
    const externalContent = [];
    const maxExternalSources = 5; // Limit to prevent excessive processing

    // Filter for most relevant links
    const relevantLinks = links
      .filter(
        (link) =>
          link.type === "pdf" ||
          link.type === "form" ||
          link.type === "guide" ||
          link.type === "requirements"
      )
      .slice(0, maxExternalSources);

    console.log(`🔍 Processing ${relevantLinks.length} external sources...`);

    for (let i = 0; i < relevantLinks.length; i++) {
      const link = relevantLinks[i];
      console.log(
        `  📄 Processing ${i + 1}/${relevantLinks.length}: ${link.text} (${
          link.type
        })`
      );

      try {
        let content = null;

        if (link.type === "pdf") {
          content = await this.extractPDFContent(link.href);
        } else {
          content = await this.extractWebPageContent(link.href);
        }

        if (content) {
          externalContent.push({
            source: link.text,
            type: link.type,
            url: link.href,
            content: content,
            extractedAt: new Date().toISOString(),
          });
          console.log(`    ✅ Extracted ${content.length} characters`);
        }

        // Be respectful with delays
        if (i < relevantLinks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log(
          `    ⚠️  Failed to extract from ${link.text}: ${error.message}`
        );
        // Continue with other sources
      }
    }

    return externalContent;
  }

  async extractPDFContent(pdfUrl) {
    try {
      console.log(`    📄 Attempting to extract PDF content from: ${pdfUrl}`);

      // Navigate to PDF URL
      await this.page.goto(pdfUrl, {
        waitUntil: "networkidle2",
        timeout: 15000,
      });

      // Check if it's actually a PDF
      const contentType = await this.page.evaluate(() => {
        const meta = document.querySelector('meta[http-equiv="Content-Type"]');
        return meta ? meta.content : "";
      });

      if (contentType.includes("application/pdf")) {
        // For PDFs, we'll try to extract text if possible
        // Note: This is limited by browser PDF rendering capabilities
        const pdfText = await this.page.evaluate(() => {
          // Try to extract text from PDF viewer
          const textElements = document.querySelectorAll("*");
          let text = "";

          for (const element of textElements) {
            if (element.textContent && element.textContent.trim()) {
              text += element.textContent.trim() + " ";
            }
          }

          return text.substring(0, 2000); // Limit PDF content
        });

        return pdfText || "PDF content (text extraction limited)";
      } else {
        // Not a PDF, treat as regular page
        return await this.extractWebPageContent(pdfUrl);
      }
    } catch (error) {
      console.log(`    ⚠️  PDF extraction failed: ${error.message}`);
      return null;
    }
  }

  async extractWebPageContent(url) {
    try {
      // Create a new page for external content to avoid conflicts
      const externalPage = await this.browser.newPage();
      await externalPage.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      await externalPage.goto(url, {
        waitUntil: "networkidle2",
        timeout: 15000,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const content = await externalPage.evaluate(() => {
        const extractText = (selector, maxLength = 800) => {
          const elements = document.querySelectorAll(selector);
          let text = Array.from(elements)
            .map((el) => el.textContent.trim())
            .join(" ");
          return text.length > maxLength
            ? text.substring(0, maxLength) + "..."
            : text;
        };

        return {
          title:
            document
              .querySelector("h1, .title, .page-title")
              ?.textContent?.trim() || "",
          mainContent: extractText(
            "main, .content, .main-content, article, .page-content, .text-content",
            800
          ),
          fees: extractText(
            '.fees, .cost, .payment, [class*="fee"], [class*="cost"], [class*="price"]',
            300
          ),
          requirements: extractText(
            '.requirements, .checklist, .steps, [class*="requirement"], [class*="checklist"]',
            400
          ),
          contact: extractText(
            '.contact, .contact-info, address, [class*="contact"], [class*="phone"], [class*="email"]',
            300
          ),
        };
      });

      await externalPage.close();

      // Combine the extracted content
      const combinedText = [
        content.title,
        content.mainContent,
        content.fees,
        content.requirements,
        content.contact,
      ]
        .filter(Boolean)
        .join(" ");

      return combinedText;
    } catch (error) {
      console.log(`    ⚠️  Web page extraction failed: ${error.message}`);
      return null;
    }
  }

  async generateCompleteApplication(rawContent, url, countyName) {
    console.log("🤖 Generating application with GPT-4...");

    const prompt = this.buildEnhancedPrompt(rawContent, url, countyName);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert at creating MEHKO application JSON files for California counties. Generate a complete, accurate county application following the exact structure provided. Use ONLY the information from the website content.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 2000, // Increased for more detailed content
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const response = completion.choices[0].message.content;

      // Estimate cost (GPT-4 pricing)
      const estimatedCost = (completion.usage.total_tokens / 1000) * 0.03;
      this.stats.totalCost += estimatedCost;

      console.log(
        `💡 Tokens used: ${
          completion.usage.total_tokens
        }, Estimated cost: $${estimatedCost.toFixed(4)}`
      );

      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No valid JSON found in response");
        }
      } catch (error) {
        throw new Error(`Failed to parse GPT response: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  buildEnhancedPrompt(rawContent, url, countyName) {
    return `Create a complete MEHKO application JSON for ${
      countyName || "this county"
    } website. Use ALL the information provided from the main page AND external sources.

WEBSITE CONTENT:
${JSON.stringify(rawContent, null, 2)}

REQUIRED OUTPUT:
Generate a JSON object with this EXACT structure:

{
  "id": "county_name_mehko",
  "title": "County Name MEHKO",
  "description": "Brief description with key details like meal limits, revenue caps, and any unique requirements",
  "rootDomain": "county.gov",
  "supportTools": { "aiEnabled": true, "commentsEnabled": true },
  "steps": [
    {
      "id": "planning_overview",
      "title": "Plan Your MEHKO",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "Planning content with official resource links and requirements"
    },
    {
      "id": "approvals_training",
      "title": "Approvals & Training", 
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "Required approvals, training programs, licensing, and certifications"
    },
    {
      "id": "prepare_docs",
      "title": "Prepare Required Documents",
      "type": "info", 
      "action_required": true,
      "fill_pdf": false,
      "content": "List of required documents, where to get them, and any specific requirements"
    },
    {
      "id": "sop_form",
      "title": "Standard Operating Procedures (SOP)",
      "type": "pdf",
      "formId": "COUNTY_SOP-English",
      "appId": "county_name_mehko",
      "action_required": true,
      "fill_pdf": true,
      "content": "SOP form instructions with download link and specific requirements"
    },
    {
      "id": "permit_application_form",
      "title": "Health Permit Application",
      "type": "pdf",
      "formId": "COUNTY_PERMIT-Form", 
      "appId": "county_name_mehko",
      "action_required": true,
      "fill_pdf": true,
      "content": "Main permit application instructions with download link and fee information"
    },
    {
      "id": "submit_application",
      "title": "Submit Application & Fees",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "Submission process, fees, payment methods, and contact information"
    },
    {
      "id": "inspection",
      "title": "Schedule & Pass Inspection",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "Inspection process, requirements, checklist, and follow-up procedures"
    },
    {
      "id": "receive_permit",
      "title": "Receive Permit",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "Timeline and process for receiving permit, any additional requirements"
    },
    {
      "id": "operate_comply",
      "title": "Operate & Stay Compliant",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "Ongoing compliance requirements, renewal process, and operational guidelines"
    },
    {
      "id": "contact",
      "title": "Contact Info",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "Program contact information including phone, email, website, hours, and office locations"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Use information from BOTH the main page AND external sources (PDFs, guides, forms)
- Prioritize information from external sources when available (they often contain more detailed requirements)
- Generate unique formId values (e.g., COUNTY_SOP-English, COUNTY_PERMIT-Form)
- Include actual fees, limits, and requirements found in ANY source
- Make appId match the generated id field exactly
- Ensure all 10 steps are complete and accurate
- Use real contact information and official links from ANY source
- If information is missing, use reasonable defaults based on typical MEHKO programs
- Include any unique requirements or restrictions specific to this county
- Make sure the county name in the title and id matches the actual county
- Cross-reference information between sources for accuracy
- Pay special attention to fees, requirements, and contact info from PDFs and external pages

INFORMATION PRIORITY:
1. **External sources (PDFs, guides, forms)** - Most detailed and accurate
2. **Main page content** - General overview and navigation
3. **Inferred information** - Reasonable defaults when specific info is missing

CONTENT GUIDELINES:
- If main page content is available, use it to provide meaningful descriptions
- If external sources contain specific information (fees, requirements, contact), prioritize that
- For missing information, provide helpful, actionable content based on typical MEHKO programs
- Always include the actual forms and links found on the website
- Make content specific to the county when possible, generic when necessary

Return ONLY the JSON object, no other text.`;
  }

  validateApplication(app) {
    const errors = [];

    // Required fields
    if (!app.id || !app.title || !app.description) {
      errors.push("Missing required fields: id, title, or description");
    }

    // ID format validation
    if (app.id && !app.id.includes("_mehko")) {
      errors.push("ID must end with '_mehko'");
    }

    // Steps validation
    if (!app.steps || !Array.isArray(app.steps)) {
      errors.push("Steps must be an array");
    } else if (app.steps.length !== 10) {
      errors.push(`Expected 10 steps, got ${app.steps.length}`);
    }

    // Required step IDs
    const requiredStepIds = [
      "planning_overview",
      "approvals_training",
      "prepare_docs",
      "sop_form",
      "permit_application_form",
      "submit_application",
      "inspection",
      "receive_permit",
      "operate_comply",
      "contact",
    ];

    const actualStepIds = app.steps.map((step) => step.id);
    const missingSteps = requiredStepIds.filter(
      (id) => !actualStepIds.includes(id)
    );

    if (missingSteps.length > 0) {
      errors.push(`Missing required steps: ${missingSteps.join(", ")}`);
    }

    // Form validation
    const formSteps = app.steps.filter((step) => step.type === "pdf");
    formSteps.forEach((step) => {
      if (!step.formId || !step.appId) {
        errors.push(`Form step '${step.id}' missing formId or appId`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  printBatchSummary(results) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 BATCH PROCESSING SUMMARY");
    console.log("=".repeat(60));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`💰 Total Estimated Cost: $${this.stats.totalCost.toFixed(4)}`);

    if (successful.length > 0) {
      console.log("\n📁 Generated Files:");
      successful.forEach((result) => {
        console.log(`  • ${result.filename}`);
      });
    }

    if (failed.length > 0) {
      console.log("\n❌ Failed URLs:");
      failed.forEach((result) => {
        console.log(`  • ${result.url}: ${result.error}`);
      });
    }

    console.log("\n💡 Next Steps:");
    console.log("  1. Review generated JSON files");
    console.log("  2. Add to manifest: node scripts/add-county.mjs <filename>");
    console.log("  3. Test applications in the system");
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  // Load environment variables from .env file
  dotenv.config();

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      "Usage: node scripts/mehko-agent-enhanced.mjs <county-url> [county-name]"
    );
    console.error(
      "   OR: node scripts/mehko-agent-enhanced.mjs --batch <batch-file>"
    );
    console.error(
      'Example: node scripts/mehko-agent-enhanced.mjs "https://example.gov/mehko" "Orange County"'
    );
    console.error(
      "Example: node scripts/mehko-agent-enhanced.mjs --batch data/county-batch.json"
    );
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not found");
    console.error("Create a .env file in your project root with:");
    console.error("OPENAI_API_KEY=your_api_key_here");
    process.exit(1);
  }

  const agent = new EnhancedMEHKOAgent(apiKey);

  try {
    await agent.initialize();

    if (args[0] === "--batch") {
      if (args.length !== 2) {
        console.error("Batch mode requires a batch file: --batch <file>");
        process.exit(1);
      }

      const batchFile = args[1];
      const batchPath = path.join(__dirname, "..", batchFile);

      if (!fs.existsSync(batchPath)) {
        console.error(`Batch file not found: ${batchPath}`);
        process.exit(1);
      }

      const counties = JSON.parse(fs.readFileSync(batchPath, "utf8"));
      await agent.processBatch(counties);
    } else {
      const url = args[0];
      const countyName = args[1] || null;

      const result = await agent.processCounty(url, countyName);

      if (result.success) {
        console.log(
          `\n🎉 Successfully created application for ${countyName || url}`
        );
        console.log(`📁 File: ${result.filename}`);
        console.log(`💰 Cost: ~$0.06-0.12`);
      } else {
        console.error(`\n❌ Failed to create application: ${result.error}`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("❌ Agent failed:", error.message);
    process.exit(1);
  } finally {
    await agent.close();
  }
}

// ES module main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { EnhancedMEHKOAgent };
