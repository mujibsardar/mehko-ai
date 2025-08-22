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

    // Store county name for web search
    this.currentCountyName = countyName || this.extractCountyFromUrl(url);

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
            "main, .content, .main-content, article, .page-content",
            ".text-content, .body-content, .post-content",
            ".entry-content, .content-area, .main-text",
            "p, .description, .summary, .overview",
          ];

          let content = "";
          for (const selector of contentSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              content = Array.from(elements)
                .map((el) => el.textContent.trim())
                .join(" ");
              break;
            }
          }

          return content.length > 1000
            ? content.substring(0, 1000) + "..."
            : content;
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

      // Step 2: Discover and crawl additional pages within the same root domain
      console.log("🔍 Discovering additional pages within root domain...");
      const rootDomainPages = await this.discoverRootDomainPages(
        url,
        mainPageContent.forms
      );

      // Debug: Show what we discovered
      if (rootDomainPages.length > 0) {
        console.log(`📊 Root domain pages discovered:`);
        rootDomainPages.forEach((page, index) => {
          console.log(
            `  ${index + 1}. ${page.title || "Untitled"} (${page.url})`
          );
          console.log(`     Content: ${page.mainContent.substring(0, 100)}...`);
          console.log(`     Forms: ${page.forms.length} links found`);
        });
      } else {
        console.log("⚠️  No additional root domain pages discovered");
      }

      // Step 2.5: Extract specific information from key pages
      console.log("💰 Extracting specific information from key pages...");
      const keyPageInfo = await this.extractKeyPageInformation(rootDomainPages);

      if (keyPageInfo.fees.length > 0) {
        console.log(
          `  💰 Fee information found: ${keyPageInfo.fees.join(", ")}`
        );
      }
      if (keyPageInfo.contact.length > 0) {
        console.log(
          `  📞 Contact information found: ${keyPageInfo.contact.join(", ")}`
        );
      }

      // Step 3: Extract content from PDFs and important external links
      console.log("🔗 Extracting content from PDFs and external links...");
      const externalContent = await this.extractExternalContent(
        mainPageContent.forms
      );

      // Step 4: Combine all content from multiple sources
      const combinedContent = {
        ...mainPageContent,
        rootDomainPages: rootDomainPages,
        keyPageInfo: keyPageInfo,
        externalContent: externalContent,
        totalSources: 1 + rootDomainPages.length + externalContent.length,
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

  async discoverRootDomainPages(baseUrl, initialLinks) {
    const rootDomain = new URL(baseUrl).hostname;
    const visitedUrls = new Set();
    const pagesToVisit = [];
    const discoveredPages = [];

    // Prioritize links by importance and type
    const prioritizedLinks = this.prioritizeLinks(initialLinks, rootDomain);

    // Add prioritized links to the queue
    pagesToVisit.push(...prioritizedLinks.map((link) => link.href));

    // Limit the number of pages to visit to prevent excessive crawling
    const maxPagesToVisit = 8; // Reasonable limit for cost control
    let pagesVisited = 0;

    console.log(
      `🔍 Will visit up to ${maxPagesToVisit} pages within ${rootDomain}`
    );

    while (pagesToVisit.length > 0 && pagesVisited < maxPagesToVisit) {
      const currentUrl = pagesToVisit.shift();
      if (visitedUrls.has(currentUrl)) {
        continue;
      }
      visitedUrls.add(currentUrl);
      pagesVisited++;

      try {
        console.log(
          `  📄 Visiting page ${pagesVisited}/${maxPagesToVisit}: ${currentUrl}`
        );

        await this.page.goto(currentUrl, {
          waitUntil: "networkidle2",
          timeout: 15000,
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const currentPageContent = await this.page.evaluate(() => {
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
              .slice(0, 20);
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
            const contentSelectors = [
              "main, .content, .main-content, article, .page-content",
              ".text-content, .body-content, .post-content",
              ".entry-content, .content-area, .main-text",
              "p, .description, .summary, .overview",
            ];

            let content = "";
            for (const selector of contentSelectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                content = Array.from(elements)
                  .map((el) => el.textContent.trim())
                  .join(" ");
                break;
              }
            }

            return content.length > 1000
              ? content.substring(0, 1000) + "..."
              : content;
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

        discoveredPages.push(currentPageContent);

        // Add new high-priority links to the queue, but don't exceed our limit
        const newLinks = currentPageContent.forms
          .filter(
            (link) =>
              link.type === "pdf" ||
              link.type === "form" ||
              link.type === "guide" ||
              link.type === "requirements" ||
              link.type === "fees"
          )
          .map((link) => link.href)
          .filter(
            (href) =>
              !visitedUrls.has(href) && pagesToVisit.length < maxPagesToVisit
          );

        pagesToVisit.push(...newLinks);

        // Be respectful with delays
        if (pagesToVisit.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log(`  ⚠️  Failed to visit ${currentUrl}: ${error.message}`);
        // Continue with other sources
      }
    }

    console.log(
      `✅ Discovered ${discoveredPages.length} pages within root domain`
    );
    return discoveredPages;
  }

  async extractKeyPageInformation(pages) {
    const keyInfo = {
      fees: [],
      contact: [],
      requirements: [],
      forms: [],
    };

    for (const page of pages) {
      // Extract fees from fee-related pages
      if (
        page.title.toLowerCase().includes("fee schedule") ||
        page.title.toLowerCase().includes("fees")
      ) {
        const feeText = page.mainContent;
        const feePatterns = [
          /\$[\d,]+(?:\.\d{2})?/g,
          /fee[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?/gi,
          /cost[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?/gi,
        ];
        feePatterns.forEach((pattern) => {
          const matches = feeText.match(pattern);
          if (matches) {
            keyInfo.fees.push(...matches);
          }
        });
      }

      // Extract contact information from contact-related pages
      if (
        page.title.toLowerCase().includes("contact") ||
        page.title.toLowerCase().includes("hours")
      ) {
        const contactText = page.mainContent;
        const contactPatterns = [
          /[\d\-\(\)\s]{10,}/g, // Phone number patterns
          /[\w\.\-@]+\@[\w\.\-]+\.[a-zA-Z]{2,}/g, // Email patterns
          /address[:\s]+[^\.]+/gi, // Address patterns
        ];
        contactPatterns.forEach((pattern) => {
          const matches = contactText.match(pattern);
          if (matches) {
            keyInfo.contact.push(...matches);
          }
        });
      }

      // Extract requirements from requirement-related pages
      if (
        page.title.toLowerCase().includes("requirements") ||
        page.title.toLowerCase().includes("documentation")
      ) {
        const requirementPatterns = [
          /required\s+documents?/gi,
          /must\s+include/gi,
          /shall\s+provide/gi,
          /documentation\s+required/gi,
        ];
        requirementPatterns.forEach((pattern) => {
          const matches = page.mainContent.match(pattern);
          if (matches) {
            keyInfo.requirements.push(...matches);
          }
        });
      }

      // Extract form information from form-related pages
      if (
        page.title.toLowerCase().includes("forms") ||
        page.title.toLowerCase().includes("application")
      ) {
        // Use the forms array that was already extracted during page crawling
        if (page.forms && page.forms.length > 0) {
          keyInfo.forms.push(...page.forms);
        }
      }
    }

    return keyInfo;
  }

  prioritizeLinks(links, rootDomain) {
    // Score links based on importance and relevance
    const scoredLinks = links.map((link) => {
      let score = 0;

      // Type-based scoring
      switch (link.type) {
        case "pdf":
          score += 10; // PDFs are very valuable
          break;
        case "form":
          score += 8; // Forms are highly important
          break;
        case "fees":
          score += 7; // Fee information is crucial
          break;
        case "requirements":
          score += 6; // Requirements are important
          break;
        case "guide":
          score += 5; // Guides are helpful
          break;
        case "contact":
          score += 3; // Contact info is useful
          break;
        default:
          score += 1;
      }

      // Domain-based scoring (prioritize same root domain)
      if (link.href.includes(rootDomain)) {
        score += 5;
      }

      // Text-based scoring
      const lowerText = link.text.toLowerCase();
      if (lowerText.includes("mehko") || lowerText.includes("home kitchen")) {
        score += 4;
      }
      if (lowerText.includes("application") || lowerText.includes("permit")) {
        score += 3;
      }
      if (lowerText.includes("fee") || lowerText.includes("cost")) {
        score += 3;
      }

      return { ...link, score };
    });

    // Sort by score (highest first) and return top links
    return scoredLinks.sort((a, b) => b.score - a.score).slice(0, 10); // Limit to top 10 most promising links
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
          console.log(`    ✅ Extracted ${content.fullText.length} characters`);
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

    // Add web search results for missing specific information
    console.log("🌐 Performing web search for additional MEHKO information...");
    const webSearchResults = await this.performWebSearch(
      this.currentCountyName
    );
    if (webSearchResults && webSearchResults.length > 0) {
      externalContent.push(...webSearchResults);
      console.log(`✅ Added ${webSearchResults.length} web search results`);
    }

    return externalContent;
  }

  async extractPDFContent(pdfUrl) {
    try {
      console.log(`    📄 Attempting to extract PDF content from: ${pdfUrl}`);

      // First try using our Python backend for PDF extraction
      const pythonExtraction = await this.extractPDFWithPython(pdfUrl);
      if (pythonExtraction && pythonExtraction.fullText.length > 100) {
        console.log(
          `    ✅ Successfully extracted ${pythonExtraction.fullText.length} characters using Python backend`
        );
        return pythonExtraction;
      }

      console.log(
        `    ⚠️  Python extraction failed, falling back to browser method`
      );

      // Fallback to browser-based extraction
      await this.page.goto(pdfUrl, {
        waitUntil: "networkidle2",
        timeout: 15000,
      });

      // Wait for PDF to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Enhanced PDF text extraction
      const pdfContent = await this.page.evaluate(() => {
        // Try multiple approaches to extract text from PDF
        const extractTextFromElements = () => {
          // Look for text in various PDF viewer elements
          const textSelectors = [
            'embed[type="application/pdf"]',
            'object[type="application/pdf"]',
            'iframe[src*=".pdf"]',
            ".pdf-viewer",
            ".pdf-content",
            "canvas",
            'div[role="document"]',
            "body",
          ];

          let extractedText = "";

          for (const selector of textSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              if (element.textContent && element.textContent.trim()) {
                const text = element.textContent.trim();
                if (text.length > 100) {
                  // Only use substantial content
                  extractedText += text + " ";
                }
              }
            }
          }

          return extractedText.trim();
        };

        // Try to extract text from the entire document
        let pdfText = extractTextFromElements();

        // If we got substantial text, clean and structure it
        if (pdfText.length > 200) {
          // Clean up the text
          pdfText = pdfText
            .replace(/\s+/g, " ") // Normalize whitespace
            .replace(/\n+/g, " ") // Replace newlines with spaces
            .replace(/\t+/g, " ") // Replace tabs with spaces
            .trim();

          // Extract key information patterns
          const extractKeyInfo = (text) => {
            const info = {
              fees: [],
              requirements: [],
              contact: [],
              timelines: [],
              limits: [],
            };

            // Look for fee patterns
            const feePatterns = [
              /\$[\d,]+(?:\.\d{2})?/g, // $123.45 or $1,234.56
              /fee[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?/gi,
              /cost[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?/gi,
              /payment[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?/gi,
            ];

            feePatterns.forEach((pattern) => {
              const matches = text.match(pattern);
              if (matches) {
                info.fees.push(...matches);
              }
            });

            // Look for requirement patterns
            const requirementPatterns = [
              /required\s+documents?/gi,
              /must\s+include/gi,
              /shall\s+provide/gi,
              /documentation\s+required/gi,
            ];

            requirementPatterns.forEach((pattern) => {
              const matches = text.match(pattern);
              if (matches) {
                info.requirements.push(...matches);
              }
            });

            // Look for contact patterns
            const contactPatterns = [
              /phone\s*:?\s*[\d\-\(\)\s]+/gi,
              /email\s*:?\s*[\w\.\-@]+/gi,
              /address\s*:?\s*[^\.]+/gi,
              /hours\s*:?\s*[^\.]+/gi,
            ];

            contactPatterns.forEach((pattern) => {
              const matches = text.match(pattern);
              if (matches) {
                info.contact.push(...matches);
              }
            });

            // Look for timeline patterns
            const timelinePatterns = [
              /\d+\s+(?:days?|weeks?|months?)/gi,
              /within\s+\d+\s+(?:days?|weeks?|months?)/gi,
              /processing\s+time/gi,
              /response\s+time/gi,
            ];

            timelinePatterns.forEach((pattern) => {
              const matches = text.match(pattern);
              if (matches) {
                info.timelines.push(...matches);
              }
            });

            // Look for limit patterns
            const limitPatterns = [
              /maximum\s+[\d,]+/gi,
              /limit\s+of\s+[\d,]+/gi,
              /up\s+to\s+[\d,]+/gi,
              /not\s+exceed\s+[\d,]+/gi,
            ];

            limitPatterns.forEach((pattern) => {
              const matches = text.match(pattern);
              if (matches) {
                info.limits.push(...matches);
              }
            });

            return info;
          };

          const keyInfo = extractKeyInfo(pdfText);

          return {
            fullText: pdfText.substring(0, 3000), // Limit full text
            keyInfo: keyInfo,
            extractedAt: new Date().toISOString(),
          };
        }

        return {
          fullText: pdfText.substring(0, 500),
          keyInfo: {},
          extractedAt: new Date().toISOString(),
        };
      });

      if (pdfContent.fullText && pdfContent.fullText.length > 100) {
        console.log(
          `    ✅ Successfully extracted ${pdfContent.fullText.length} characters from PDF`
        );
        if (Object.keys(pdfContent.keyInfo).length > 0) {
          console.log(`    🔍 Key information found:`, pdfContent.keyInfo);
        }
        return pdfContent;
      } else {
        console.log(
          `    ⚠️  Limited PDF content extracted, treating as regular page`
        );
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

        // Enhanced extraction for forms pages
        const extractFormsPageInfo = () => {
          const info = {
            fees: [],
            contact: [],
            requirements: [],
            forms: [],
          };

          // Look for fee information
          const feeText = extractText("body", 2000);
          const feePatterns = [
            /\$[\d,]+(?:\.\d{2})?/g,
            /fee[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?/gi,
            /cost[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?/gi,
          ];

          feePatterns.forEach((pattern) => {
            const matches = feeText.match(pattern);
            if (matches) {
              info.fees.push(...matches);
            }
          });

          // Look for contact information
          const contactSelectors = [
            ".contact, .contact-info, address",
            '[class*="contact"], [class*="phone"], [class*="email"]',
            'p:contains("phone"), p:contains("email"), p:contains("address")',
          ];

          contactSelectors.forEach((selector) => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach((el) => {
                const text = el.textContent.trim();
                if (
                  text.includes("@") ||
                  text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)
                ) {
                  info.contact.push(text);
                }
              });
            } catch (e) {
              // Ignore selector errors
            }
          });

          // Look for form links and descriptions
          const formLinks = document.querySelectorAll(
            'a[href*=".pdf"], a[href*="form"]'
          );
          info.forms = Array.from(formLinks).map((link) => ({
            text: link.textContent.trim(),
            href: link.href,
            description: link.title || link.textContent.trim(),
          }));

          return info;
        };

        return {
          title:
            document
              .querySelector("h1, .title, .page-title")
              ?.textContent?.trim() || "",
          mainContent: extractText("body", 800),
          formsPageInfo: extractFormsPageInfo(),
          extractedAt: new Date().toISOString(),
        };
      });

      await externalPage.close();
      return content;
    } catch (error) {
      console.log(`    ⚠️  Web page extraction failed: ${error.message}`);
      return null;
    }
  }

  async generateCompleteApplication(rawContent, url, countyName) {
    console.log("🤖 Generating application with GPT-4...");

    const prompt = this.buildEnhancedPrompt(rawContent, url, countyName);

    // Estimate tokens before sending to OpenAI
    const estimatedTokens = this.estimateTokenCount(prompt);
    console.log(`📊 Estimated tokens: ${estimatedTokens.toLocaleString()}`);

    if (estimatedTokens > 6000) {
      console.log(`⚠️  Warning: High token count may cause rate limiting`);
    }

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
        max_tokens: 1500, // Reduced to stay within context limits
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

  estimateTokenCount(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a conservative estimate to stay under limits
    return Math.ceil(text.length / 3.5);
  }

  async extractPDFWithPython(pdfUrl) {
    try {
      // Use our Python backend to extract PDF content
      const response = await fetch(
        "http://localhost:8000/extract-pdf-content",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pdf_url: pdfUrl,
            extract_key_info: true,
          }),
          timeout: 30000, // 30 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`Python extraction failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.text && result.text.length > 50) {
        // Structure the response similar to browser extraction
        return {
          fullText: result.text.substring(0, 3000), // Limit for token management
          keyInfo: {
            fees: this.extractPatterns(result.text, [
              /\$[\d,]+(?:\.\d{2})?/g,
              /fee[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?/gi,
              /cost[s]?\s*:?\s*\$?[\d,]+(?:\.\d{2})?/gi,
            ]),
            requirements: this.extractPatterns(result.text, [
              /required\s+documents?/gi,
              /must\s+include/gi,
              /shall\s+provide/gi,
              /documentation\s+required/gi,
            ]),
            contact: this.extractPatterns(result.text, [
              /phone\s*:?\s*[\d\-\(\)\s]{10,}/gi,
              /email\s*:?\s*[\w\.\-@]+@[\w\.\-]+/gi,
              /address\s*:?\s*[^\.]{10,}/gi,
            ]),
            timelines: this.extractPatterns(result.text, [
              /\d+\s+(?:days?|weeks?|months?)/gi,
              /within\s+\d+\s+(?:days?|weeks?|months?)/gi,
              /processing\s+time[^\.]{0,50}/gi,
            ]),
            limits: this.extractPatterns(result.text, [
              /maximum\s+[\d,]+/gi,
              /limit\s+of\s+[\d,]+/gi,
              /up\s+to\s+[\d,]+/gi,
              /not\s+exceed\s+[\d,]+/gi,
            ]),
          },
          extractedAt: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      console.log(`    ⚠️  Python PDF extraction failed: ${error.message}`);
      return null;
    }
  }

  extractPatterns(text, patterns) {
    const results = [];
    patterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        results.push(...matches);
      }
    });
    return [...new Set(results)]; // Remove duplicates
  }

  async performWebSearch(countyName = "San Diego") {
    try {
      const searchQueries = [
        `${countyName} County MEHKO permit fees 2024`,
        `${countyName} County MEHKO requirements training`,
        `${countyName} County MEHKO application process timeline`,
        `${countyName} County MEHKO meal limits revenue caps`,
        `${countyName} County MEHKO contact phone email`,
      ];

      const searchResults = [];

      for (const query of searchQueries) {
        console.log(`  🔍 Searching: "${query}"`);

        try {
          // Use DuckDuckGo search (no API key needed)
          const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(
            query
          )}`;

          // Create a new page for search to avoid conflicts
          const searchPage = await this.browser.newPage();
          await searchPage.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          );

          await searchPage.goto(searchUrl, {
            waitUntil: "networkidle2",
            timeout: 15000,
          });

          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Extract search results
          const results = await searchPage.evaluate(() => {
            const links = Array.from(document.querySelectorAll(".result__a"));
            const snippets = Array.from(
              document.querySelectorAll(".result__snippet")
            );

            return links.slice(0, 3).map((link, index) => ({
              title: link.textContent.trim(),
              url: link.href,
              snippet: snippets[index]
                ? snippets[index].textContent.trim()
                : "",
            }));
          });

          // Calculate relevance after extracting results
          const resultsWithRelevance = results.map((result) => ({
            ...result,
            relevance: this.calculateRelevance(result.title, result.snippet)
          }));

          // Filter and add relevant results
          const relevantResults = resultsWithRelevance
            .filter((result) => result.relevance > 0.3) // Only add if relevance > 30%
            .map((result) => ({
              source: `Web Search: ${query}`,
              url: result.url,
              content: {
                fullText: result.snippet,
                title: result.title,
                url: result.url,
              },
              extractedAt: new Date().toISOString(),
              relevance: result.relevance,
            }));

          searchResults.push(...relevantResults);

          await searchPage.close();

          // Be respectful with delays
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.log(
            `    ⚠️  Web search failed for "${query}": ${error.message}`
          );
        }
      }

      // Sort by relevance and limit results
      const sortedResults = searchResults
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5); // Top 5 most relevant results

      console.log(
        `  📊 Web search completed: ${sortedResults.length} relevant results found`
      );
      return sortedResults;
    } catch (error) {
      console.log(`  ⚠️  Web search failed: ${error.message}`);
      return [];
    }
  }

  calculateRelevance(title, snippet) {
    const text = `${title} ${snippet}`.toLowerCase();
    let score = 0;

    // Keywords that indicate relevant MEHKO information
    const relevantKeywords = [
      "mehko",
      "microenterprise",
      "home kitchen",
      "permit",
      "fee",
      "cost",
      "requirement",
      "training",
      "certification",
      "timeline",
      "deadline",
      "meal limit",
      "revenue cap",
      "inspection",
      "contact",
      "phone",
      "email",
    ];

    relevantKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        score += 0.1;
      }
    });

    // Bonus for specific information
    if (/\$\d+/.test(text)) score += 0.2; // Contains dollar amounts
    if (/\d+\s*(?:days?|weeks?|months?)/.test(text)) score += 0.2; // Contains timelines
    if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) score += 0.2; // Contains phone numbers

    return Math.min(score, 1.0); // Cap at 1.0
  }

  extractCountyFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Extract county name from common patterns
      if (hostname.includes('sandiego')) return 'San Diego';
      if (hostname.includes('lacounty') || hostname.includes('lacounty.gov')) return 'Los Angeles';
      if (hostname.includes('orangecounty') || hostname.includes('ocgov.com')) return 'Orange';
      if (hostname.includes('riverside') || hostname.includes('rivco.org')) return 'Riverside';
      if (hostname.includes('sanbernardino') || hostname.includes('sbcounty.gov')) return 'San Bernardino';
      if (hostname.includes('ventura') || hostname.includes('ventura.org')) return 'Ventura';
      if (hostname.includes('kern') || hostname.includes('kerncounty.com')) return 'Kern';
      if (hostname.includes('fresno') || hostname.includes('co.fresno.ca.us')) return 'Sacramento';
      if (hostname.includes('sacramento') || hostname.includes('saccounty.net')) return 'Sacramento';
      if (hostname.includes('alameda') || hostname.includes('acgov.org')) return 'Alameda';
      
      // Default fallback
      return 'County';
    } catch (error) {
      return 'County';
    }
  }

  preprocessPDFContent(rawContent) {
    // Extract and structure key information from PDFs before sending to AI
    const extractedInfo = {
      fees: [],
      requirements: [],
      contact: [],
      limits: [],
      timelines: [],
      documents: [],
    };

    // Process external content (PDFs)
    if (rawContent.externalContent && rawContent.externalContent.length > 0) {
      rawContent.externalContent.forEach((content) => {
        if (
          content.type === "pdf" &&
          content.content &&
          typeof content.content === "string"
        ) {
          const text = content.content;

          // Extract fees
          const feeMatches = text.match(/\$[\d,]+(?:\.\d{2})?/g);
          if (feeMatches) {
            extractedInfo.fees.push(...feeMatches);
          }

          // Extract requirements
          const reqMatches = text.match(
            /(?:required|must|shall)\s+[^\.]{10,100}/gi
          );
          if (reqMatches) {
            extractedInfo.requirements.push(...reqMatches);
          }

          // Extract contact info
          const phoneMatches = text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g);
          if (phoneMatches) {
            extractedInfo.contact.push(...phoneMatches);
          }

          const emailMatches = text.match(
            /[\w\.\-@]+@[\w\.\-]+\.[a-zA-Z]{2,}/g
          );
          if (emailMatches) {
            extractedInfo.contact.push(...emailMatches);
          }

          // Extract limits
          const limitMatches = text.match(
            /(?:maximum|limit|up to|not exceed)\s+[\d,]+[^\.]{0,50}/gi
          );
          if (limitMatches) {
            extractedInfo.limits.push(...limitMatches);
          }

          // Extract timelines
          const timeMatches = text.match(
            /\d+\s+(?:days?|weeks?|months?)[^\.]{0,50}/gi
          );
          if (timeMatches) {
            extractedInfo.timelines.push(...timeMatches);
          }

          // Extract document names
          const docMatches = text.match(
            /(?:form|application|document|checklist|guide)[^\.]{0,100}/gi
          );
          if (docMatches) {
            extractedInfo.documents.push(...docMatches);
          }
        }
      });
    }

    // Remove duplicates and clean up
    Object.keys(extractedInfo).forEach((key) => {
      extractedInfo[key] = [...new Set(extractedInfo[key])].slice(0, 5); // Limit to top 5
    });

    // Add extracted info to rawContent for the AI to use
    rawContent.extractedKeyInfo = extractedInfo;

    console.log(`🔍 Pre-processed PDF content - Found:`);
    console.log(`  💰 Fees: ${extractedInfo.fees.length}`);
    console.log(`  📋 Requirements: ${extractedInfo.requirements.length}`);
    console.log(`  📞 Contact: ${extractedInfo.contact.length}`);
    console.log(`  ⚠️  Limits: ${extractedInfo.limits.length}`);
    console.log(`  ⏰ Timelines: ${extractedInfo.timelines.length}`);
    console.log(`  📄 Documents: ${extractedInfo.documents.length}`);

    return rawContent;
  }

  buildEnhancedPrompt(rawContent, url, countyName) {
    // Truncate content to stay under token limits
    const truncatedContent = this.truncateContentForPrompt(rawContent);

    console.log(
      `📊 Content size after truncation: ${
        JSON.stringify(truncatedContent).length
      } characters`
    );

    return `Create a complete MEHKO application JSON for ${
      countyName || "this county"
    } website. Use ALL the information provided from the main page, root domain pages, AND external sources.

WEBSITE CONTENT:
${JSON.stringify(truncatedContent, null, 2)}

REQUIRED OUTPUT:
Generate a JSON object with this EXACT structure:

{
  "id": "county_name_mehko",
  "title": "County Name MEHKO",
  "description": "Brief description with key details like meal limits, revenue caps, and any unique requirements",
  "rootDomain": "county.gov", // Must be clean domain without protocol or www
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
- Use information from ALL sources: main page, root domain pages, AND external sources
- Prioritize information from root domain pages (same county website) as most authoritative
- Prioritize information from external sources (PDFs, guides, forms) when available
- Extract SPECIFIC details like fees, meal limits, revenue caps, contact info, requirements
- MANDATORY: Avoid generic phrases like "Please refer to the official website" - provide actual information
- MANDATORY: Include direct links to forms, PDFs, and important resources
- MANDATORY: If specific fee amounts are found, include them exactly (e.g., "$150 application fee")
- MANDATORY: If meal limits are found, specify them (e.g., "maximum 30 meals per day")
- MANDATORY: If revenue caps are found, state them (e.g., "annual gross sales not to exceed $50,000")
- MANDATORY: Include specific contact numbers, email addresses, and office hours when available
- MANDATORY: List specific required documents, not just "required documents"
- If specific information is missing from county sources, use California state-level information as fallback
- Make content actionable and specific - users should be able to take immediate action

QUALITY STANDARDS:
- Each step should contain concrete, actionable information
- Include specific dollar amounts, timeframes, and limits whenever available
- Provide direct download links for forms and documents
- Include complete contact information (phone, email, address, hours)
- State specific requirements rather than general categories

CONTENT GUIDELINES:
- For fees: Include specific dollar amounts, payment methods, and any discounts
- For requirements: List specific documents, training programs, and qualifications needed
- For contact info: Include phone numbers, email addresses, office hours, and locations
- For forms: Provide direct download links and specific instructions for completion
- For timelines: Include specific timeframes for processing, inspections, and approvals
- For limits: Specify meal limits, revenue caps, and any other operational restrictions

PDF CONTENT UTILIZATION - HIGHEST PRIORITY:
- MANDATORY: PDF content contains the most detailed and authoritative information
- MANDATORY: If PDF content includes fees, use EXACT amounts (e.g., "$150 application fee", not "pay fees")
- MANDATORY: If PDF content includes requirements, list them SPECIFICALLY (e.g., "Submit: 1) Application form, 2) Site diagram, 3) Food handler certificate")
- MANDATORY: If PDF content includes contact info, use EXACT details (e.g., "Contact: John Smith at (555) 123-4567, email: mehko@county.gov")
- MANDATORY: If PDF content includes limits, state them EXACTLY (e.g., "Maximum 30 meals per day", "Annual revenue cap: $50,000")
- MANDATORY: If PDF content includes timelines, use EXACT timeframes (e.g., "Processing time: 10-15 business days")
- MANDATORY: Prioritize PDF content over website content when both are available
- MANDATORY: Use PDF content to fill in ALL missing details in the application steps

SOURCE PRIORITY:
1. Root domain pages (same county website) - Most authoritative
2. PDFs and forms from county website - Most detailed (use extracted content!)
3. Main page content - Good overview
4. External sources - Supplementary information
5. California state information - Fallback for missing details

Remember: The goal is to create an application that users can actually use to get their MEHKO permit, not just a list of links to visit. Extract and synthesize the actual information they need. Use the PDF content we've extracted to provide specific, actionable details.

CRITICAL INSTRUCTION - GENERATE ACTIONABLE CONTENT:
Before generating the application, carefully analyze ALL PDF content provided. Look for:
1. Specific dollar amounts (fees, costs, payments)
2. Exact requirements and documents needed
3. Specific contact information (names, phone numbers, emails)
4. Operational limits and restrictions (meal limits, revenue caps)
5. Processing timelines and deadlines

If you find this information in PDFs, use it EXACTLY. Do not paraphrase or generalize. Users need to know exactly what to do, how much to pay, and who to contact.

MANDATORY: Use the "extractedKeyInfo" data that has been pre-processed from PDFs. This contains:
- Specific fees found in PDFs
- Exact requirements extracted from PDFs  
- Contact information found in PDFs
- Operational limits found in PDFs
- Timelines found in PDFs
- Document names found in PDFs

DO NOT generate generic content when specific information is available in extractedKeyInfo!

CONTENT STRUCTURE REQUIREMENTS:
- Planning Overview: List SPECIFIC requirements, limits, allowed foods, NOT generic legal references
- Approvals & Training: Explain the ACTUAL process, not just reference forms
- Prepare Docs: List EXACT documents needed, reference the PDF steps clearly
- PDF Steps: Make it clear these are the forms users actually fill out
- Submit Application: Include specific fees, submission methods, contact info
- Inspection: Include specific requirements, checklist, follow-up process
- Receive Permit: Include specific timeline, delivery method
- Operate & Comply: Include specific limits, renewal requirements, compliance rules

EXAMPLES OF GOOD VS BAD CONTENT:

BAD (Generic): "You will need to pay fees as outlined in the fee schedule."
GOOD (Specific): "Application fee: $150. Annual permit fee: $300. Late renewal penalty: $50."

BAD (Vague): "Complete the required training programs."
GOOD (Specific): "Complete Food Handler Certification ($15, available online at county.gov/food-safety). Valid for 3 years."

BAD (Unhelpful): "Contact the department for more information."
GOOD (Actionable): "Contact: Jane Smith at (555) 123-4567, email: mehko@county.gov. Office hours: Mon-Fri 8am-5pm."

BAD (General): "Submit required documents."
GOOD (Specific): "Required documents: 1) Completed application form, 2) Food handler certificate, 3) Site diagram showing kitchen layout, 4) Standard Operating Procedures (SOP) form."

BAD (Confusing): "You will need to obtain a Health Permit from the Department."
GOOD (Clear): "Complete the Health Permit Application form (Step 5) and Standard Operating Procedures form (Step 4). Submit both forms with payment to receive your permit."

BAD (Unclear): "Prepare the necessary documents for your application."
GOOD (Specific): "Required documents: 1) Health Permit Application (complete in Step 5), 2) Standard Operating Procedures (complete in Step 4), 3) Food handler certificate, 4) Site diagram"

Extract this level of detail from the provided content!`;
  }

  truncateContentForPrompt(rawContent) {
    // Target: Keep content under 12,000 characters to stay well under GPT-4's 8,192 token limit
    const MAX_CONTENT_SIZE = 12000;

    // Pre-process PDF content to extract key information
    const processedContent = this.preprocessPDFContent(rawContent);

    // Start with essential main page content
    const truncated = {
      mainPage: {
        title: rawContent.title || "",
        mainContent: this.truncateText(rawContent.mainContent || "", 2000),
        forms: rawContent.forms || [],
        contact: rawContent.contact || "",
        fees: rawContent.fees || "",
        requirements: rawContent.requirements || "",
        regulations: rawContent.regulations || "",
        url: rawContent.url || "",
        domain: (rawContent.domain || "")
          .replace(/^www\./, "")
          .replace(/^https?:\/\//, ""),
      },
      keyInformation: {
        fees: rawContent.keyPageInfo?.fees || [],
        contact: rawContent.keyPageInfo?.contact || [],
        requirements: rawContent.keyPageInfo?.requirements || [],
        forms: rawContent.keyPageInfo?.forms || [],
      },
      rootDomainPages: [],
      externalContent: [],
      totalSources: rawContent.totalSources || 1,
    };

    // Add root domain pages (prioritize by importance)
    if (rawContent.rootDomainPages && rawContent.rootDomainPages.length > 0) {
      const prioritizedPages = this.prioritizePagesForPrompt(
        rawContent.rootDomainPages
      );

      for (const page of prioritizedPages) {
        const pageContent = {
          title: page.title || "",
          url: page.url || "",
          mainContent: this.truncateText(page.mainContent || "", 800),
          forms: page.forms || [],
          contact: page.contact || "",
          fees: page.fees || "",
          requirements: page.requirements || "",
        };

        truncated.rootDomainPages.push(pageContent);

        // Check if we're approaching the limit
        if (JSON.stringify(truncated).length > MAX_CONTENT_SIZE * 0.8) {
          console.log(
            `⚠️  Content approaching limit, truncating root domain pages`
          );
          break;
        }
      }
    }

    // Add external content (prioritize PDFs and forms)
    if (rawContent.externalContent && rawContent.externalContent.length > 0) {
      const prioritizedExternal = this.prioritizeExternalForPrompt(
        rawContent.externalContent
      );

      for (const content of prioritizedExternal) {
        const externalContent = {
          url: content.url || "",
          type: content.type || "web",
          title: content.title || "",
          content: this.truncateText(
            content.content || "",
            content.type === "pdf" ? 1200 : 600
          ),
          keyInfo: content.keyInfo || {},
        };

        truncated.externalContent.push(externalContent);

        // Check if we're approaching the limit
        if (JSON.stringify(truncated).length > MAX_CONTENT_SIZE * 0.9) {
          console.log(
            `⚠️  Content approaching limit, truncating external content`
          );
          break;
        }
      }
    }

    const finalSize = JSON.stringify(truncated).length;
    console.log(
      `📊 Content truncated from ${
        JSON.stringify(rawContent).length
      } to ${finalSize} characters`
    );

    if (finalSize > MAX_CONTENT_SIZE) {
      console.log(
        `⚠️  Content still too large, applying aggressive truncation`
      );
      return this.aggressiveTruncation(truncated, MAX_CONTENT_SIZE);
    }

    return truncated;
  }

  prioritizePagesForPrompt(pages) {
    // Sort pages by importance for the prompt
    return pages.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Higher priority for pages with specific content
      if (a.fees && a.fees.length > 0) scoreA += 10;
      if (b.fees && b.fees.length > 0) scoreB += 10;

      if (a.requirements && a.requirements.length > 0) scoreA += 8;
      if (b.requirements && b.requirements.length > 0) scoreB += 8;

      if (a.contact && a.contact.length > 0) scoreA += 6;
      if (b.contact && b.contact.length > 0) scoreB += 6;

      if (a.forms && a.forms.length > 0) scoreA += 5;
      if (b.forms && b.forms.length > 0) scoreB += 5;

      // Higher priority for pages with longer content (more information)
      scoreA += Math.min(a.mainContent?.length || 0, 1000) / 100;
      scoreB += Math.min(b.mainContent?.length || 0, 1000) / 100;

      return scoreB - scoreA; // Higher scores first
    });
  }

  prioritizeExternalForPrompt(externalContent) {
    // Sort external content by importance - PDFs get absolute priority
    return externalContent.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // PDFs get absolute highest priority - they contain the most detailed info
      if (a.type === "pdf") scoreA += 50;
      if (b.type === "pdf") scoreB += 50;

      // Forms get high priority
      if (a.type === "form") scoreA += 25;
      if (b.type === "form") scoreB += 25;

      // Content with key info gets priority
      if (a.keyInfo && Object.keys(a.keyInfo).length > 0) scoreA += 20;
      if (b.keyInfo && Object.keys(b.keyInfo).length > 0) scoreB += 20;

      // Content length gets priority (but less than type)
      scoreA += Math.min(a.content?.length || 0, 800) / 200;
      scoreB += Math.min(b.content?.length || 0, 800) / 200;

      return scoreB - scoreA; // Higher scores first
    });
  }

  truncateText(text, maxLength) {
    // Ensure text is a string and handle edge cases
    if (!text) return "";
    if (typeof text !== "string") {
      text = String(text);
    }
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  aggressiveTruncation(content, maxSize) {
    // If content is still too large, apply aggressive truncation
    const aggressive = { ...content };

    // Truncate main content more aggressively
    if (aggressive.mainPage.mainContent.length > 1000) {
      aggressive.mainPage.mainContent =
        aggressive.mainPage.mainContent.substring(0, 1000) + "...";
    }

    // Limit root domain pages to top 3
    if (aggressive.rootDomainPages.length > 3) {
      aggressive.rootDomainPages = aggressive.rootDomainPages.slice(0, 3);
    }

    // Limit external content to top 2
    if (aggressive.externalContent.length > 2) {
      aggressive.externalContent = aggressive.externalContent.slice(0, 2);
    }

    // Truncate all text fields more aggressively
    aggressive.rootDomainPages.forEach((page) => {
      page.mainContent = this.truncateText(page.mainContent, 400);
      page.contact = this.truncateText(page.contact, 200);
      page.fees = this.truncateText(page.fees, 200);
      page.requirements = this.truncateText(page.requirements, 300);
    });

    aggressive.externalContent.forEach((content) => {
      content.content = this.truncateText(content.content, 300);
    });

    const finalSize = JSON.stringify(aggressive).length;
    console.log(`📊 Aggressive truncation: ${finalSize} characters`);

    return aggressive;
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
