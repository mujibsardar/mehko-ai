#!/usr/bin/env node
import puppeteer from "puppeteer";
import fs from "fs";
import OpenAI from "openai";
import path from "path";
import url from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

class CostEffectiveMEHKOAgent {
  constructor(openaiApiKey) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({ headless: true });
    this.page = await this.browser.newPage();
  }

  async generateCountyApplication(url) {
    console.log(`🕷️ Crawling: ${url}`);

    try {
      // Step 1: Extract raw content efficiently
      const rawContent = await this.extractRawContent(url);

      // Step 2: Single GPT-4 call to generate complete application
      const countyJson = await this.generateCompleteApplication(
        rawContent,
        url
      );

      return countyJson;
    } catch (error) {
      console.error("❌ Agent failed:", error.message);
      throw error;
    }
  }

  async extractRawContent(url) {
    await this.page.goto(url, { waitUntil: "networkidle2" });

    // Extract focused, relevant content to stay within token limits
    const content = await this.page.evaluate(() => {
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
          'a[href*=".pdf"], a[href*="form"], a[href*="application"]'
        );
        return Array.from(links)
          .map((link) => ({
            text: link.textContent.trim().substring(0, 100),
            href: link.href,
          }))
          .slice(0, 10); // Limit to 10 most relevant links
      };

      return {
        title:
          document
            .querySelector("h1, .title, .page-title")
            ?.textContent?.trim() || "",
        mainContent: extractText("main, .content, .main-content, article", 800),
        forms: extractLinks(),
        contact: extractText(
          ".contact, .contact-info, address, [class*='contact']",
          300
        ),
        fees: extractText(
          ".fees, .cost, .payment, [class*='fee'], [class*='cost']",
          200
        ),
        requirements: extractText(
          ".requirements, .checklist, .steps, [class*='requirement']",
          400
        ),
        url: window.location.href,
        domain: window.location.hostname,
      };
    });

    return content;
  }

  async generateCompleteApplication(rawContent, url) {
    // Single GPT-4 call to generate the complete application
    const prompt = this.buildEfficientPrompt(rawContent, url);

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating MEHKO application JSON files. Generate a complete, accurate county application following this exact structure.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 1500,
    });

    const response = completion.choices[0].message.content;

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
  }

  buildEfficientPrompt(rawContent, url) {
    return `Create a complete MEHKO application JSON for this county website. Use ONLY the information provided.

WEBSITE CONTENT:
${JSON.stringify(rawContent, null, 2)}

REQUIRED OUTPUT:
Generate a JSON object with this EXACT structure:

{
  "id": "county_name_mehko",
  "title": "County Name MEHKO",
  "description": "Brief description with key details like meal limits, revenue caps",
  "rootDomain": "county.gov",
  "supportTools": { "aiEnabled": true, "commentsEnabled": true },
  "steps": [
    {
      "id": "planning_overview",
      "title": "Plan Your MEHKO",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "Planning content with official resource links"
    },
    {
      "id": "approvals_training",
      "title": "Approvals & Training", 
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "Required approvals, training programs, licensing"
    },
    {
      "id": "prepare_docs",
      "title": "Prepare Required Documents",
      "type": "info", 
      "action_required": true,
      "fill_pdf": false,
      "content": "List of required documents and where to get them"
    },
    {
      "id": "sop_form",
      "title": "Standard Operating Procedures (SOP)",
      "type": "pdf",
      "formId": "UNIQUE_FORM_ID",
      "appId": "county_name_mehko",
      "action_required": true,
      "fill_pdf": true,
      "content": "SOP form instructions with download link"
    },
    {
      "id": "permit_application_form",
      "title": "Health Permit Application",
      "type": "pdf",
      "formId": "UNIQUE_PERMIT_FORM_ID", 
      "appId": "county_name_mehko",
      "action_required": true,
      "fill_pdf": true,
      "content": "Main permit application instructions with download link"
    },
    {
      "id": "submit_application",
      "title": "Submit Application & Fees",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "Submission process, fees, and payment methods"
    },
    {
      "id": "inspection",
      "title": "Schedule & Pass Inspection",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "Inspection process and requirements"
    },
    {
      "id": "receive_permit",
      "title": "Receive Permit",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "Timeline and process for receiving permit"
    },
    {
      "id": "operate_comply",
      "title": "Operate & Stay Compliant",
      "type": "info",
      "action_required": true,
      "fill_pdf": false,
      "content": "Ongoing compliance and renewal requirements"
    },
    {
      "id": "contact",
      "title": "Contact Info",
      "type": "info",
      "action_required": false,
      "fill_pdf": false,
      "content": "Program contact information including phone, email, website, hours"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Use ONLY information from the website content provided
- Generate unique formId values (e.g., COUNTY_SOP-English, COUNTY_PERMIT-Form)
- Include actual fees, limits, and requirements found on the site
- Make appId match the generated id field
- Ensure all 10 steps are complete and accurate
- Use real contact information and official links from the site
- If information is missing, use reasonable defaults based on typical MEHKO programs

Return ONLY the JSON object, no other text.`;
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

  if (args.length !== 1) {
    console.error("Usage: node scripts/mehko-agent.mjs <county-url>");
    console.error(
      'Example: node scripts/mehko-agent.mjs "https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/homekitchenoperations.html"'
    );
    process.exit(1);
  }

  const url = args[0];
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not found");
    console.error("Create a .env file in your project root with:");
    console.error("OPENAI_API_KEY=your_api_key_here");
    process.exit(1);
  }

  const agent = new CostEffectiveMEHKOAgent(apiKey);

  try {
    console.log("🚀 Starting MEHKO AI Agent...");
    await agent.initialize();

    const countyJson = await agent.generateCountyApplication(url);

    // Save the generated JSON to generated/ directory
    const filename = `generated_${countyJson.id}.json`;
    const outputPath = path.join(__dirname, "..", "generated", filename);
    fs.writeFileSync(outputPath, JSON.stringify(countyJson, null, 2));

    console.log(`✅ Generated: ${filename}`);
    console.log(`🏛️ County: ${countyJson.title}`);
    console.log(`🆔 ID: ${countyJson.id}`);
    console.log(`💰 Cost: ~$0.06-0.12 per county (single GPT-4 call)`);
    console.log(`📁 File saved to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Agent failed:", error.message);
    process.exit(1);
  } finally {
    await agent.close();
  }
}

// ES module main execution
main();

export { CostEffectiveMEHKOAgent };
