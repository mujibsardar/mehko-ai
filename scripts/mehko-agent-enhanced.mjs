#!/usr/bin/env node
/* global console, setTimeout, process, document, window, URL, fetch */
import puppeteer from "puppeteer";
import fs from "fs";
import OpenAI from "openai";
import path from "path";
import url from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

class EnhancedMEHKOAgent {
  constructor(openaiApiKey, options = {}) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.browser = null;
    this.page = null;
    this.options = {
      enableWebSearch: options.enableWebSearch || false,
      maxPagesToVisit: options.maxPagesToVisit || 5,
      ...options,
    };
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
            .slice(0, 20);
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

      // Step 3: Extract content from PDFs and important external links
      console.log("🔗 Extracting content from PDFs and external links...");
      const externalContent = await this.extractExternalContent(
        mainPageContent.forms
      );

      // Step 4: Combine all content from multiple sources
      const combinedContent = {
        ...mainPageContent,
        rootDomainPages: rootDomainPages,
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
    const maxPagesToVisit = this.options.maxPagesToVisit;
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
    return scoredLinks.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  async extractExternalContent(links) {
    const externalContent = [];
    const maxExternalSources = 3; // Limit to prevent excessive processing

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
          console.log(
            `    ✅ Extracted ${
              (content.fullText || content.mainContent || "").length
            } characters`
          );
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

    // Add web search results if enabled
    if (this.options.enableWebSearch) {
      console.log(
        "🌐 Performing web search for additional MEHKO information..."
      );
      const webSearchResults = await this.performWebSearch();
      if (webSearchResults && webSearchResults.length > 0) {
        externalContent.push(...webSearchResults);
        console.log(`✅ Added ${webSearchResults.length} web search results`);
      }
    }

    return externalContent;
  }

  async extractPDFContent(pdfUrl) {
    try {
      console.log(`    📄 Attempting to extract PDF content from: ${pdfUrl}`);

      // Try using our Python backend for PDF extraction
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
                  extractedText += text + " ";
                }
              }
            }
          }

          return extractedText.trim();
        };

        let pdfText = extractTextFromElements();

        if (pdfText.length > 200) {
          pdfText = pdfText
            .replace(/\s+/g, " ")
            .replace(/\n+/g, " ")
            .replace(/\t+/g, " ")
            .trim();

          return {
            fullText: pdfText.substring(0, 3000),
            extractedAt: new Date().toISOString(),
          };
        }

        return {
          fullText: pdfText.substring(0, 500),
          extractedAt: new Date().toISOString(),
        };
      });

      if (pdfContent.fullText && pdfContent.fullText.length > 100) {
        console.log(
          `    ✅ Successfully extracted ${pdfContent.fullText.length} characters from PDF`
        );
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

        return {
          title:
            document
              .querySelector("h1, .title, .page-title")
              ?.textContent?.trim() || "",
          mainContent: extractText("body", 800),
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

  async extractPDFWithPython(pdfUrl) {
    try {
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
          timeout: 30000,
        }
      );

      if (!response.ok) {
        throw new Error(`Python extraction failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.text && result.text.length > 50) {
        return {
          fullText: result.text.substring(0, 3000),
          extractedAt: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      console.log(`    ⚠️  Python PDF extraction failed: ${error.message}`);
      return null;
    }
  }

  async performWebSearch() {
    if (!this.options.enableWebSearch) {
      return [];
    }

    try {
      console.log(
        "🌐 Performing web search for additional MEHKO information..."
      );

      // Simple DuckDuckGo search implementation
      const searchQueries = [
        "Orange County MEHKO permit fees 2024",
        "Orange County MEHKO requirements training",
        "Orange County MEHKO application process timeline",
      ];

      const searchResults = [];

      for (const query of searchQueries) {
        try {
          const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(
            query
          )}`;
          const searchPage = await this.browser.newPage();

          await searchPage.goto(searchUrl, {
            waitUntil: "networkidle2",
            timeout: 15000,
          });

          await new Promise((resolve) => setTimeout(resolve, 2000));

          const results = await searchPage.evaluate(() => {
            const links = Array.from(document.querySelectorAll(".result__a"));
            const snippets = Array.from(
              document.querySelectorAll(".result__snippet")
            );

            return links.slice(0, 2).map((link, index) => ({
              title: link.textContent.trim(),
              url: link.href,
              snippet: snippets[index]
                ? snippets[index].textContent.trim()
                : "",
            }));
          });

          searchResults.push(
            ...results.map((result) => ({
              source: `Web Search: ${query}`,
              url: result.url,
              content: {
                fullText: result.snippet,
                title: result.title,
                url: result.url,
              },
              extractedAt: new Date().toISOString(),
            }))
          );

          await searchPage.close();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.log(
            `    ⚠️  Web search failed for "${query}": ${error.message}`
          );
        }
      }

      return searchResults.slice(0, 3);
    } catch (error) {
      console.log(`  ⚠️  Web search failed: ${error.message}`);
      return [];
    }
  }

  // ---------- FACT HARVEST (HEURISTICS) ----------
  collectAllTexts(raw) {
    const blobs = [];
    const push = (url, title, text) => {
      if (!text) return;
      blobs.push({
        url: url || "",
        title: title || "",
        text: String(text).slice(0, 4000),
      });
    };

    push(raw.url, raw.title, raw.mainContent);
    (raw.rootDomainPages || []).forEach((p) =>
      push(p.url, p.title, p.mainContent)
    );
    (raw.externalContent || []).forEach((ec) => {
      const t =
        ec?.content?.fullText || ec?.content?.mainContent || ec?.text || "";
      push(ec.url, ec.title || ec.source, t);
    });
    return blobs;
  }

  mineFactsHeuristics(allTexts) {
    const join = allTexts.map((t) => t.text).join(" \n ");
    const uniq = (arr) =>
      Array.from(new Set(arr.filter(Boolean).map((s) => s.trim())));

    // Money near MEHKO/permit words
    const feeCtx = [];
    allTexts.forEach(({ text, url }) => {
      const rx =
        /(?:MEHKO|permit|application|inspection|renewal|plan check)[^$.]{0,50}(\$[\d,]+(?:\.\d{2})?)/gi;
      let m;
      while ((m = rx.exec(text))) feeCtx.push(`${m[1]} @ ${url}`);
    });

    // Generic dollars too (fallback)
    const dollars = uniq(join.match(/\$[\d,]+(?:\.\d{2})?/g) || []);

    // Phones, emails, hours, address (rough)
    const phones = uniq(
      join.match(/\b(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g) || []
    );
    const emails = uniq(
      join.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []
    );
    const hours =
      (join.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\w\s\-\–:;,]+(?:AM|PM)/i) ||
        [])[0] || "";
    const address =
      (join.match(
        /\d{2,5}\s+[A-Za-z0-9.\- ]+,\s*(San\s*Diego|CA)[^.\n]{0,80}/i
      ) || [])[0] || "";

    // Limits (state-level pattern often appears inside county PDFs)
    const perDay =
      (join.match(
        /\b(?:max(?:imum)?\s*)?(?:up\s*to\s*)?(?:\d{1,3})\s*(?:meals?)\s*(?:per|\/)\s*day\b/i
      ) || [])[0] || "";
    const perWeek =
      (join.match(/\b(?:\d{1,3})\s*(?:meals?)\s*(?:per|\/)\s*week\b/i) ||
        [])[0] || "";
    const revenue =
      (join.match(
        /\$\s?[\d,]{2,}\b[^a-zA-Z]{0,10}(?:per\s*year|annually|annual)/i
      ) || [])[0] || "";

    // Timelines
    const timelines = uniq(
      join.match(
        /\b(?:\d{1,2}\s*(?:business\s*)?days?|[12-9]\d\s*days?)\b/gi
      ) || []
    );

    // Signals for forms
    const hasSOP = /standard operating procedures|SOP/i.test(join);
    const hasPermit = /public health permit|health permit application/i.test(
      join
    );

    // Doc names
    const docNames = uniq(
      join.match(
        /\b(?:application|checklist|SOP|standard operating procedures|self[-\s]inspection|fee schedule|plan|menu|diagram|water test|well test)[^.,;\n)]{0,40}/gi
      ) || []
    );

    return {
      fees_raw: uniq(feeCtx).slice(0, 8),
      dollars: dollars.slice(0, 12),
      contacts: {
        phones: phones.slice(0, 5),
        emails: emails.slice(0, 5),
        office_hours: hours || "",
        address: address || "",
      },
      limits_raw: {
        per_day: perDay || "",
        per_week: perWeek || "",
        revenue: revenue || "",
      },
      timelines,
      forms: { sop: hasSOP, permit_application: hasPermit },
      documents: docNames.slice(0, 10),
      sources: allTexts.map((t) => ({ url: t.url, title: t.title })),
    };
  }

  // ---------- FACT HARVEST (LLM NORMALIZATION via function call) ----------
  async extractFacts(rawContent) {
    const allTexts = this.collectAllTexts(rawContent);
    const heur = this.mineFactsHeuristics(allTexts);

    const tool = {
      type: "function",
      function: {
        name: "record_facts",
        description:
          "Normalize and label facts for MEHKO from provided county content. Use ONLY given text. No guesses.",
        parameters: {
          type: "object",
          properties: {
            fees: {
              type: "object",
              additionalProperties: { type: "string" },
              description:
                'Map labels to exact dollar strings (e.g., application_fee: "$150").',
            },
            meal_limits: {
              type: "object",
              properties: {
                per_day: { type: "number" },
                per_week: { type: "number" },
              },
              additionalProperties: false,
            },
            revenue_cap: {
              type: "string",
              description:
                'E.g., "$100,000/year" if present, else empty string.',
            },
            timelines: { type: "array", items: { type: "string" } },
            contacts: {
              type: "object",
              properties: {
                phones: { type: "array", items: { type: "string" } },
                emails: { type: "array", items: { type: "string" } },
                office_hours: { type: "string" },
                address: { type: "string" },
              },
            },
            forms: {
              type: "object",
              properties: {
                sop: { type: "boolean" },
                permit_application: { type: "boolean" },
              },
            },
            documents: { type: "array", items: { type: "string" } },
            notes: { type: "string" },
          },
          required: ["fees", "contacts", "forms"],
        },
      },
    };

    const textBundle = JSON.stringify({
      pages: allTexts.slice(0, 20), // cap for token safety
      heuristics: heur,
    });

    try {
      const resp = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // better JSON/tooling; cheap
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Extract facts only from the provided text. If unknown, leave empty string/empty array. Never invent.",
          },
          {
            role: "user",
            content: `CONTENT (site & PDFs only):\n${textBundle}`,
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "record_facts" } },
      });

      const call = resp.choices[0].message.tool_calls?.[0];
      const llmFacts = call ? JSON.parse(call.function.arguments) : null;

      // Merge: model overrides labels; heuristics fill gaps
      const merged = {
        fees: llmFacts?.fees || {},
        meal_limits: llmFacts?.meal_limits || {},
        revenue_cap: llmFacts?.revenue_cap || heur.limits_raw.revenue || "",
        timelines: llmFacts?.timelines?.length
          ? llmFacts.timelines
          : heur.timelines,
        contacts: {
          phones: llmFacts?.contacts?.phones?.length
            ? llmFacts.contacts.phones
            : heur.contacts.phones,
          emails: llmFacts?.contacts?.emails?.length
            ? llmFacts.contacts.emails
            : heur.contacts.emails,
          office_hours:
            llmFacts?.contacts?.office_hours ||
            heur.contacts.office_hours ||
            "",
          address: llmFacts?.contacts?.address || heur.contacts.address || "",
        },
        forms: llmFacts?.forms || heur.forms,
        documents: llmFacts?.documents?.length
          ? llmFacts.documents
          : heur.documents,
        sources: heur.sources,
      };

      // Sensible defaults for statewide limits if present in PDFs (often are)
      const pd = merged.meal_limits?.per_day;
      const pw = merged.meal_limits?.per_week;
      if (
        !pd &&
        /30\s*meals\s*per\s*day/i.test(allTexts.map((t) => t.text).join(" "))
      )
        merged.meal_limits.per_day = 30;
      if (!pw && /90\s*per\s*week/i.test(allTexts.map((t) => t.text).join(" ")))
        merged.meal_limits.per_week = 90;

      if (
        !merged.revenue_cap &&
        /\$100,?000/i.test(allTexts.map((t) => t.text).join(" "))
      ) {
        merged.revenue_cap = "$100,000/year";
      }

      return merged;
    } catch (e) {
      console.log(
        "⚠️ LLM facts extraction failed, using heuristics only.",
        e.message
      );
      // degrade gracefully
      return {
        fees: {},
        meal_limits: {},
        revenue_cap: heur.limits_raw.revenue || "",
        timelines: heur.timelines,
        contacts: heur.contacts,
        forms: heur.forms,
        documents: heur.documents,
        sources: heur.sources,
      };
    }
  }

  // ---------- RENDER JSON FROM FACTS (DETERMINISTIC) ----------
  renderApplicationFromFacts(facts, domain, countyName) {
    const id = `${(countyName || "county")
      .toLowerCase()
      .replace(/\s+/g, "_")}_mehko`;
    const title = `${countyName || "County"} MEHKO`;

    const limitsLine = [
      facts.meal_limits?.per_day
        ? `up to ${facts.meal_limits.per_day} meals/day`
        : "",
      facts.meal_limits?.per_week ? `${facts.meal_limits.per_week}/week` : "",
      facts.revenue_cap ? `${facts.revenue_cap}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const phone = facts.contacts.phones?.[0] || "UNKNOWN";
    const email = facts.contacts.emails?.[0] || "UNKNOWN";
    const hours = facts.contacts.office_hours || "UNKNOWN";

    // Fees synthesized into a readable list
    const feeLines = [];
    for (const [k, v] of Object.entries(facts.fees)) {
      if (/\$\d/.test(v)) feeLines.push(`- ${k.replace(/_/g, " ")}: ${v}`);
    }
    if (feeLines.length === 0) feeLines.push("- Fees: UNKNOWN");

    // Timelines
    const timeline =
      facts.timelines && facts.timelines.length
        ? `Typical timing: ${facts.timelines.join(", ")}.`
        : "Typical timing: UNKNOWN.";

    // Documents (non-form)
    const docList = (facts.documents || []).slice(0, 6).map((d) => `- ${d}`);

    // Steps content
    const steps = [
      {
        id: "planning_overview",
        title: "Plan Your MEHKO",
        type: "info",
        action_required: false,
        fill_pdf: false,
        content: [
          `MEHKO limits: ${limitsLine || "UNKNOWN limits."}`,
          `Review allowed foods and storage, ensure your home kitchen meets sanitation and equipment standards.`,
          facts.revenue_cap
            ? `Annual gross sales cap: ${facts.revenue_cap}.`
            : "",
          `Keep a simple menu appropriate for a home kitchen and plan your workflow and temperature controls.`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        id: "approvals_training",
        title: "Approvals & Training",
        type: "info",
        action_required: true,
        fill_pdf: false,
        content: [
          `If renting, obtain landlord approval.`,
          `Complete required food safety training/certification as specified by the county (CFH/CFPM where applicable).`,
          `Check city business license and seller's permit (CDTFA) if required.`,
        ].join("\n"),
      },
      {
        id: "prepare_docs",
        title: "Prepare Required Documents",
        type: "info",
        action_required: true,
        fill_pdf: false,
        content: [
          `Prepare these items for submission:`,
          `- Standard Operating Procedures (complete in Step 4)`,
          `- Public Health Permit Application (complete in Step 5)`,
          ...docList,
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        id: "sop_form",
        title: "Standard Operating Procedures (SOP)",
        type: "pdf",
        formId: `${(countyName || "COUNTY").toUpperCase()}_SOP-English`,
        appId: id,
        action_required: true,
        fill_pdf: true,
        content: `Complete your SOP here. (You'll fill this form in-app; no download needed.)`,
      },
      {
        id: "permit_application_form",
        title: "Health Permit Application",
        type: "pdf",
        formId: `${(countyName || "COUNTY").toUpperCase()}_PERMIT-Form`,
        appId: id,
        action_required: true,
        fill_pdf: true,
        content: `Complete your Health Permit Application here. (Filled in-app; no download needed.)`,
      },
      {
        id: "submit_application",
        title: "Submit Application & Fees",
        type: "info",
        action_required: true,
        fill_pdf: false,
        content: [
          `Submit the completed SOP (see Step 4) and Health Permit Application (see Step 5).`,
          `Fees (exact amounts from county sources):`,
          ...feeLines,
          `Payment: follow county instructions (online/mail/in-person where specified).`,
          timeline,
        ].join("\n"),
      },
      {
        id: "inspection",
        title: "Schedule & Pass Inspection",
        type: "info",
        action_required: false,
        fill_pdf: false,
        content: [
          `Environmental Health will contact you to schedule your home kitchen inspection after review.`,
          `Use the self-inspection checklist from county materials to prepare (food protection, handwash sink access, sanitizer, thermometer, storage).`,
          `Correct any deficiencies and complete any required follow-up.`,
        ].join("\n"),
      },
      {
        id: "receive_permit",
        title: "Receive Permit",
        type: "info",
        action_required: false,
        fill_pdf: false,
        content: [
          `After passing inspection and fee clearance, your Public Health Permit will be issued.`,
          timeline,
        ].join("\n"),
      },
      {
        id: "operate_comply",
        title: "Operate & Stay Compliant",
        type: "info",
        action_required: false,
        fill_pdf: false,
        content: [
          `Operate within approved menu and your SOP (see Step 4).`,
          limitsLine
            ? `Stay within limits: ${limitsLine}.`
            : `Stay within county/state MEHKO limits.`,
          `Maintain food safety (time/temperature, cross-contamination control, allergen awareness).`,
          `Renew permit annually and update SOP/menu if changes occur.`,
        ].join("\n"),
      },
      {
        id: "contact",
        title: "Contact Info",
        type: "info",
        action_required: false,
        fill_pdf: false,
        content: [
          `Phone: ${phone}`,
          `Email: ${email}`,
          `Hours: ${hours}`,
          facts.contacts.address ? `Address: ${facts.contacts.address}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ];

    return {
      id,
      title,
      description: `${countyName || "County"} MEHKO${
        limitsLine ? ` — ${limitsLine}` : ""
      }.`,
      rootDomain: (domain || "").replace(/^www\./, ""),
      supportTools: { aiEnabled: true, commentsEnabled: true },
      steps,
    };
  }

  normalizePdfSteps(app) {
    const idx = Object.fromEntries(app.steps.map((s, i) => [s.id, i + 1]));
    const repl = (txt) =>
      txt
        .replace(/download [^)\n]+\.pdf/gi, "see the dedicated form step")
        .replace(
          /(Standard Operating Procedures|SOP)/gi,
          `$1 (see Step ${idx["sop_form"] || "4"})`
        )
        .replace(
          /(Health Permit Application)/gi,
          `$1 (see Step ${idx["permit_application_form"] || "5"})`
        );

    app.steps = app.steps.map((s) => {
      if (s.type === "pdf") {
        return {
          ...s,
          content: `Complete this form here. (Filled in-app; no download needed.)`,
        };
      }
      if (s.type === "info" && typeof s.content === "string") {
        return { ...s, content: repl(s.content) };
      }
      return s;
    });
    return app;
  }

  qualityGateStrict(app) {
    const errs = [];
    const get = (id) => app.steps.find((s) => s.id === id)?.content || "";

    if (!/\$\s?\d/.test(get("submit_application")))
      errs.push("submit_application lacks explicit $ fees");
    if (
      !(
        /@/.test(get("contact")) ||
        /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(get("contact"))
      )
    )
      errs.push("contact missing phone/email");
    if (
      !/(meals\/?day|meals per day|30|90|100,?000|\$100,?000)/i.test(
        get("planning_overview") + get("operate_comply") + app.description
      )
    )
      errs.push("limits/revenue cap missing");
    return { ok: errs.length === 0, errs };
  }

  async generateCompleteApplication(rawContent, url, countyName) {
    console.log("🤖 Extracting facts + rendering JSON...");
    const facts = await this.extractFacts(rawContent);
    let app = this.renderApplicationFromFacts(
      facts,
      rawContent.domain,
      countyName || this.extractCountyFromUrl(url)
    );

    // normalize PDF step copy
    app = this.normalizePdfSteps(app);

    // strict quality gate
    let q = this.qualityGateStrict(app);
    if (q.ok) {
      console.log("✅ Quality gate passed (deterministic).");
      return app;
    }

    // Focused retry: ask the model to fill ONLY the missing fields using PDFs + facts
    console.warn("❗ Quality gate failed:", q.errs);
    try {
      const focus = {
        facts,
        top_pdfs: (rawContent.externalContent || [])
          .filter((x) => x.type === "pdf")
          .slice(0, 3)
          .map((x) => ({
            url: x.url,
            text: x?.content?.fullText || x.text || "",
          })),
      };

      const fix = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Fill ONLY the missing concrete values (fees, limits, contacts, timelines) from PDFs/facts. JSON only.",
          },
          {
            role: "user",
            content: JSON.stringify(
              { need: q.errs, app_draft: app, focus },
              null,
              2
            ),
          },
        ],
        response_format: { type: "json_object" },
      });

      const patch = JSON.parse(fix.choices[0].message.content);
      // shallow patch of critical fields
      if (patch?.steps) {
        const byId = Object.fromEntries(app.steps.map((s) => [s.id, s]));
        patch.steps.forEach((s) => {
          if (s?.id && s.content) byId[s.id].content = s.content;
        });
        app.steps = Object.values(byId);
      }
      if (patch?.description) app.description = patch.description;

      app = this.normalizePdfSteps(app);
      q = this.qualityGateStrict(app);
      if (q.ok) console.log("✅ Quality gate passed after focused retry.");
      else console.warn("⚠️ Still missing:", q.errs);
    } catch (e) {
      console.warn("⚠️ Focused retry failed:", e.message);
    }

    return app;
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

  extractCountyFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Extract county name from common patterns
      if (hostname.includes("orange")) return "Orange County";
      if (hostname.includes("lacounty") || hostname.includes("lacounty.gov"))
        return "Los Angeles";
      if (hostname.includes("orangecounty") || hostname.includes("ocgov.com"))
        return "Orange";
      if (hostname.includes("riverside") || hostname.includes("rivco.org"))
        return "Riverside";
      if (
        hostname.includes("sanbernardino") ||
        hostname.includes("sbcounty.gov")
      )
        return "San Bernardino";
      if (hostname.includes("ventura") || hostname.includes("ventura.org"))
        return "Ventura";
      if (hostname.includes("kern") || hostname.includes("kerncounty.com"))
        return "Kern";
      if (hostname.includes("fresno") || hostname.includes("co.fresno.ca.us"))
        return "Sacramento";
      if (hostname.includes("sacramento") || hostname.includes("saccounty.net"))
        return "Sacramento";
      if (hostname.includes("alameda") || hostname.includes("acgov.org"))
        return "Alameda";

      // Default fallback
      return "County";
    } catch (error) {
      return "County";
    }
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
      "Usage: node scripts/mehko-agent-enhanced.mjs <county-url> [county-name] [--web-search]"
    );
    console.error(
      "   OR: node scripts/mehko-agent-enhanced.mjs --batch <batch-file> [--web-search]"
    );
    console.error(
      'Example: node scripts/mehko-agent-enhanced.mjs "https://example.gov/mehko" "Orange County"'
    );
    console.error(
      "Example: node scripts/mehko-agent-enhanced.mjs --batch data/county-batch.json --web-search"
    );
    console.error("\nOptions:");
    console.error(
      "  --web-search    Enable web search for additional information"
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

  // Parse options
  const options = {
    enableWebSearch: args.includes("--web-search"),
    maxPagesToVisit: 5,
  };

  // Remove option flags from args
  const cleanArgs = args.filter((arg) => !arg.startsWith("--"));

  const agent = new EnhancedMEHKOAgent(apiKey, options);

  try {
    await agent.initialize();

    if (cleanArgs[0] === "--batch") {
      if (cleanArgs.length !== 2) {
        console.error("Batch mode requires a batch file: --batch <file>");
        process.exit(1);
      }

      const batchFile = cleanArgs[1];
      const batchPath = path.join(__dirname, "..", batchFile);

      if (!fs.existsSync(batchPath)) {
        console.error(`Batch file not found: ${batchPath}`);
        process.exit(1);
      }

      const counties = JSON.parse(fs.readFileSync(batchPath, "utf8"));
      console.log(`🚀 Processing ${counties.length} counties...`);

      for (let i = 0; i < counties.length; i++) {
        const county = counties[i];
        console.log(`\n📊 Progress: ${i + 1}/${counties.length}`);

        const result = await agent.processCounty(county.url, county.name);

        if (result.success) {
          console.log(`✅ Success: ${county.name || county.url}`);
        } else {
          console.log(
            `❌ Failed: ${county.name || county.url} - ${result.error}`
          );
        }

        // Add delay between requests
        if (i < counties.length - 1) {
          console.log("⏳ Waiting 2 seconds before next request...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } else {
      const url = cleanArgs[0];
      const countyName = cleanArgs[1] || null;

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
