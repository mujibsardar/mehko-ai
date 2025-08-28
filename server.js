import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
// Firebase Admin SDK for Firestore
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
// import { PDFDocument } from "pdf-lib";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import OpenAI from "openai";
import multer from "multer";
dotenv.config();
// Initialize Firebase Admin with service account
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "config/serviceAccountKey.json";
const serviceAccount = require(path.resolve(serviceAccountPath));
initializeApp({
  credential: cert(serviceAccount),
});
// Initialize Firestore
const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Admin endpoint for processing county JSON files
app.post("/api/admin/process-county", upload.none(), async (req, res) => {
  try {
    // Handle FormData - parse the multipart form data
    const countyData = req.body.countyData;
    const filename = req.body.filename;
    if (!countyData) {
      return res.status(400).json({ error: "No county data provided" });
    }
    // Parse and validate the county data
    let county;
    try {
      county = JSON.parse(countyData);
    } catch (error) {
      return res.status(400).json({ error: "Invalid JSON format" });
    }
    // Validate required fields
    const required = [
      "id",
      "title",
      "description",
      "rootDomain",
      "supportTools",
      "steps",
    ];
    const missing = required.filter((field) => !county[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    if (!Array.isArray(county.steps) || county.steps.length === 0) {
      return res
        .status(400)
        .json({ error: "County must have at least one step" });
    }
    // Validate PDF steps
    const pdfSteps = county.steps.filter((step) => step.type === "pdf");
    for (const step of pdfSteps) {
      if (!step.formId || !step.pdfUrl) {
        return res.status(400).json({
          error: `PDF step ${step.id} missing formId or pdfUrl`,
        });
      }
    }
    // Save county JSON to data directory
    const dataDir = path.resolve("data");
    const countyFile = path.join(dataDir, `${county.id}.json`);
    await fs.promises.writeFile(countyFile, JSON.stringify(county, null, 2));
    // Load and update manifest
    const manifestFile = path.join(dataDir, "manifest.json");
    let manifest = [];
    if (fs.existsSync(manifestFile)) {
      const manifestContent = await fs.promises.readFile(manifestFile, "utf8");
      manifest = JSON.parse(manifestContent);
    }
    // Check if county already exists
    const existingIndex = manifest.findIndex((c) => c.id === county.id);
    if (existingIndex !== -1) {
      console.log(
        `⚠️  County ${county.id} already exists in manifest, updating...`
      );
      manifest[existingIndex] = county;
    } else {
      console.log(`➕ Adding ${county.id} to manifest...`);
      manifest.push(county);
    }
    // Save updated manifest
    await fs.promises.writeFile(
      manifestFile,
      JSON.stringify(manifest, null, 2)
    );
    // Create application directory
    const applicationsDir = path.resolve("applications");
    const countyDir = path.join(applicationsDir, county.id);
    const formsDir = path.join(countyDir, "forms");
    await fs.promises.mkdir(countyDir, { recursive: true });
    await fs.promises.mkdir(formsDir, { recursive: true });
    console.log(`✅ Created application directory: ${countyDir}`);
    // Download PDF forms
    let downloadedCount = 0;
    for (const step of pdfSteps) {
      try {
        const formDir = path.join(formsDir, step.formId);
        await fs.promises.mkdir(formDir, { recursive: true });
        // Create meta.json for the form
        const metaData = {
          id: step.formId,
          title: step.title,
          type: "pdf",
          appId: county.id,
          stepId: step.id,
          pdfUrl: step.pdfUrl,
          createdAt: new Date().toISOString(),
        };
        await fs.promises.writeFile(
          path.join(formDir, "meta.json"),
          JSON.stringify(metaData, null, 2)
        );
        // Download the PDF
        console.log(`📥 Downloading PDF for ${step.title}...`);
        const response = await fetch(step.pdfUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const pdfBuffer = await response.arrayBuffer();
        await fs.promises.writeFile(
          path.join(formDir, "form.pdf"),
          Buffer.from(pdfBuffer)
        );
        console.log(
          `✅ Downloaded ${step.title} (${Math.round(
            pdfBuffer.byteLength / 1024
          )}KB)`
        );
        downloadedCount++;
      } catch (error) {
        console.error(`❌ Failed to download ${step.title}:`, error.message);
        // Continue with other forms even if one fails
      }
    }
    console.log(
      `✅ PDF download process completed (${downloadedCount}/${pdfSteps.length} forms)`
    );
    // Insert county data into Firestore
    try {
      console.log(`🗄️  Inserting ${county.title} into Firestore...`);
      // Add to applications collection
      await db
        .collection("applications")
        .doc(county.id)
        .set({
          ...county,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active",
          source: "admin-upload",
        });
      // Add each step to the steps subcollection
      for (const step of county.steps) {
        await db
          .collection("applications")
          .doc(county.id)
          .collection("steps")
          .doc(step.id)
          .set({
            ...step,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
      }
    } catch (dbError) {
      console.error(`❌ Failed to insert into Firestore:`, dbError.message);
      // Don't fail the entire request if DB insertion fails
    }
    res.json({
      success: true,
      message: `Successfully processed ${county.title}`,
      countyId: county.id,
      title: county.title,
      steps: county.steps.length,
      pdfForms: pdfSteps.length,
      downloadedForms: downloadedCount,
      files: {
        countyJson: countyFile,
        manifest: manifestFile,
        applicationDir: countyDir,
      },
    });
  } catch (error) {
    console.error("💥 County processing failed:", error);
    res.status(500).json({
      error: "Failed to process county",
      details: error.message,
    });
  }
});
const CACHE_PATH = path.resolve("form-label-cache.json");
// Load cache from file
// function loadFieldCache() {
//   if (fs.existsSync(CACHE_PATH)) {
//     return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
//   }
//   return {};
// }
// // Save cache to file
// function saveFieldCache(cache) {
//   fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
// }
// function extractNearbyText(fieldName, fullText, radius = 100) {
//   const cleanField = fieldName.replace(/[_\-]/g, " ").toLowerCase();
//   const cleanText = fullText.replace(/[\n\r]/g, " ").toLowerCase();
//   const index = cleanText.indexOf(cleanField);
//   if (index === -1) return fullText.slice(0, radius * 2); // fallback to first snippet
//   const start = Math.max(index - radius, 0);
//   const end = Math.min(index + cleanField.length + radius, fullText.length);
//   return fullText.slice(start, end).replace(/\s+/g, " ").trim();
// }
// function extractJsonFromMarkdown(content) {
//   const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
//   return match ? match[1] : content;
// }
app.post("/api/ai-chat", async (req, res) => {
  const { messages = [], applicationId = "unknown", context = {} } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }
  try {
    const formSection = Object.entries(context.forms || {})
      .map(([stepId, fields]) => {
        const step = (context.steps || []).find((s) => s.id === stepId);
        return step
          ? `Step: ${step.title} (${
              step.formName || "Unknown PDF"
            })\nFields:\n${fields.map((f) => `- ${f}`).join("\n")}`
          : null;
      })
      .filter(Boolean)
      .join("\n\n");
    // Enhanced system prompt with form-specific context
    let systemPrompt = `
      You are an AI assistant helping users apply for a MEHKO permit. You are knowledgeable, patient, and provide practical guidance.
      IMPORTANT: For PDF type steps, users fill out forms within the app and then download the completed PDF to submit. Some forms may need to be downloaded from external sources.
      Application: ${context.application?.title || "MEHKO Permit"}
      Source: ${context.application?.rootDomain || "Government"}
      Available Steps:
      ${(context.steps || [])
        .map(
          (s, i) =>
            `Step ${i + 1}: ${s.title} (${s.type})${
              s.action_required ? " - ACTION REQUIRED" : ""
            }`
        )
        .join("\n")}
      User's Progress:
      - Completed Steps: ${
        (context.completedStepIds || []).join(", ") || "None"
      }
      - Current Step: ${context.currentStep?.title || "Not specified"}
      Form Completion Steps:
${(context.steps || [])
  .filter((s) => s.type === "pdf")
  .map(
    (s, i) =>
      `- Step ${i + 1}: ${s.title} (${s.formId}) - Complete the form here`
  )
  .join("\n")}
      Form Field Information:
      ${formSection || "No form fields data available"}
      User's Saved Form Data:
      ${
        Object.entries(context.formData || {})
          .map(
            ([formId, data]) =>
              `- ${formId}: ${Object.keys(data).length} fields filled`
          )
          .join("\n") || "No saved form data"
      }
      Community Insights:
      ${
        (context.comments || []).map((c) => `- ${c.text || c}`).join("\n") ||
        "No community comments yet"
      }`;
    // Add form-specific context if selectedForm exists
    if (context.selectedForm) {
      const formStep = (context.steps || []).find(
        (s) => s.formId === context.selectedForm.formId
      );
      if (formStep) {
        const stepIndex =
          (context.steps || []).findIndex((s) => s.id === formStep.id) + 1;
        systemPrompt += `
          FORM-SPECIFIC CONTEXT:
          - Selected Form: ${context.selectedForm.title}
          - Form Type: ${context.selectedForm.formId}
          - Complete This Form In: Step ${stepIndex}: ${formStep.title}
          - Form Status: ${
            (context.completedStepIds || []).includes(formStep.id)
              ? "COMPLETED"
              : "NOT STARTED"
          }
          - User's Progress: ${
            Object.keys(context.formData?.[context.selectedForm.formId] || {})
              .length
          } fields filled`;
      }
    }
    systemPrompt += `
      GUIDANCE PRINCIPLES:
      - For PDF type steps: Guide users to complete forms within the app, then download the filled PDF for submission
      - For external forms: Help users find and download required PDFs from government websites when needed
      - Reference specific step numbers when mentioning forms (e.g., "Complete the SOP form in Step 4")
      - Explain what each form step accomplishes in the overall application process
      - Be clear about which forms are filled in-app vs. downloaded externally
      WHAT NOT TO SAY (AVOID THESE STATEMENTS):
      - "Remember, you can schedule the inspections directly within the app"
      - "Keep in mind that you don't have to download any forms as PDFs"
      - "All forms can be completed directly in the application steps"
      - "Be sure to save your progress as you go along"
      - "Forms are NOT downloaded as PDFs"
      - "Users complete forms directly within the application steps"
      GENERAL GUIDELINES:
      - Be concise but thorough
      - Use bullet points for step-by-step instructions
      - Explain unfamiliar terms and requirements
      - Provide practical examples when helpful
      - Direct users to relevant application steps
      - Be encouraging and supportive
      Remember: You're helping someone navigate a government permit application. Some forms are filled out in the app and downloaded, others may need to be downloaded from external sources. Be clear, accurate, and helpful.`.trim();
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 1000,
    });
    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ error: "AI failed to respond" });
  }
});
app.post("/api/save-progress", async (req, res) => {
  const userId = req.headers["x-user-id"] || "guest";
  const { applicationId, formData } = req.body;
  console.log(`Saving progress for user: ${userId}`);
  console.log(`: ${applicationId}`);
  console.log("Form Data:", formData);
  // TODO: Save to database or file storage later
  res.status(200).json({ success: true, userId, applicationId });
});
app.get("/api/form-fields", async (req, res) => {
  const { applicationId, formName } = req.query;
  if (!applicationId || !formName) {
    return res.status(400).json({ error: "Missing applicationId or formName" });
  }
  const jsonPath = path.resolve(
    "python",
    applicationId,
    formName.replace(".pdf", ".json")
  );
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "Form JSON not found" });
  }
  try {
    const mergedFields = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    return res.json({ fields: mergedFields });
  } catch (err) {
    console.error("Failed to load merged fields JSON:", err);
    return res.status(500).json({ error: "Failed to load form fields" });
  }
});
app.post("/api/fill-pdf", async (req, res) => {
  try {
    const pyRes = await fetch("http://localhost:8000/fill-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await pyRes.json();
    res.json(data);
  } catch (err) {
    console.error("Error calling Python /fill-pdf:", err);
    res.status(500).json({ error: "Failed to fill PDF" });
  }
});
// AI PDF Field Analysis endpoint
app.post("/api/ai-analyze-pdf", upload.single("pdf"), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }
    console.log(
      "Processing PDF upload:",
      req.file.originalname,
      "Size:",
      req.file.size
    );
    const pdfFile = req.file;
    // File type is already validated by multer
    // Convert PDF to images for Vision API analysis
    const pdfImages = await convertPDFToImages(pdfFile.buffer);
    console.log("Converted PDF to", pdfImages.length, "images");
    // Analyze each page with AI
    const allFields = [];
    for (let pageIndex = 0; pageIndex < pdfImages.length; pageIndex++) {
      try {
        const imageBuffer = pdfImages[pageIndex];
        // Convert buffer to base64 for OpenAI
        const base64Image = imageBuffer.toString("base64");
        console.log(`Analyzing page ${pageIndex + 1}/${pdfImages.length}`);
        // Analyze with OpenAI Vision API
        const pageFields = await analyzePageWithAI(base64Image, pageIndex);
        allFields.push(...pageFields);
        console.log(
          `Page ${pageIndex + 1} returned ${pageFields.length} fields`
        );
      } catch (pageError) {
        console.error(`Error analyzing page ${pageIndex + 1}:`, pageError);
        // Continue with other pages instead of crashing
      }
    }
    // Post-process and validate fields
    const processedFields = postProcessFields(allFields);
    console.log("Total processed fields:", processedFields.length);
    res.json({
      success: true,
      fields: processedFields,
      totalPages: pdfImages.length,
      totalFields: processedFields.length,
    });
  } catch (error) {
    console.error("AI PDF analysis error:", error);
    // Return a graceful error response instead of crashing
    res.status(500).json({
      error: "Failed to analyze PDF",
      details: error.message,
      fallback: "Please try again or contact support",
    });
  }
});
// PDF Download endpoint
app.post("/api/download-pdf", async (req, res) => {
  const { url, appId, formId } = req.body;
  if (!url || !appId || !formId) {
    return res
      .status(400)
      .json({ error: "Missing required fields: url, appId, formId" });
  }
  try {
    // Validate appId format
    if (!/^[a-z0-9_]+$/.test(appId)) {
      return res.status(400).json({
        error:
          "Invalid appId format. Use only lowercase letters, numbers, and underscores.",
      });
    }
    // Validate formId format
    if (!/^[A-Za-z0-9_-]+$/.test(formId)) {
      return res.status(400).json({
        error:
          "Invalid formId format. Use only letters, numbers, hyphens, and underscores.",
      });
    }
    // Create directory structure
    const appDir = path.join(process.cwd(), "applications", appId);
    const formsDir = path.join(appDir, "forms");
    const formDir = path.join(formsDir, formId);
    // Ensure directories exist
    await fs.promises.mkdir(appDir, { recursive: true });
    await fs.promises.mkdir(formsDir, { recursive: true });
    await fs.promises.mkdir(formDir, { recursive: true });
    // Download PDF from URL
    console.log(`Downloading PDF from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download PDF: ${response.status} ${response.statusText}`
      );
    }
    // Check if response is actually a PDF
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/pdf")) {
      console.warn(
        `Warning: Response may not be a PDF. Content-Type: ${contentType}`
      );
    }
    // Save PDF to local filesystem
    const pdfPath = path.join(formDir, "form.pdf");
    const pdfBuffer = await response.arrayBuffer();
    await fs.promises.writeFile(pdfPath, Buffer.from(pdfBuffer));
    // Create basic meta.json if it doesn't exist
    const metaPath = path.join(formDir, "meta.json");
    if (!fs.existsSync(metaPath)) {
      const meta = {
        name: formId,
        type: "pdf",
        downloadedAt: new Date().toISOString(),
        sourceUrl: url,
        size: pdfBuffer.byteLength,
      };
      await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2));
    }
    console.log(`PDF saved to: ${pdfPath}`);
    res.json({
      success: true,
      message: "PDF downloaded successfully",
              path: `data/applications/${appId}/forms/${formId}/form.pdf`,
      size: pdfBuffer.byteLength,
    });
  } catch (error) {
    console.error("Error downloading PDF:", error);
    res.status(500).json({
      error: "Failed to download PDF",
      detail: error.message,
    });
  }
});
// Helper function to convert PDF to images
async function convertPDFToImages(pdfBuffer) {
  try {
    console.log("Converting PDF to images using pdf2pic...");
    // Import pdf2pic dynamically since we're in ES module
    const { fromPath } = await import("pdf2pic");
    // Create a temporary PDF file
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    // Write PDF buffer to temp file
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    // Configure pdf2pic options
    const options = {
      density: 300, // Higher DPI for better quality
      saveFilename: "page", // Base filename for pages
      savePath: tempDir, // Save to temp directory
      format: "png", // Output format
      width: 2048, // Max width
      height: 2048, // Max height
    };
    // Convert PDF to images
    const convert = fromPath(tempPdfPath, options);
    const pageCount = await convert.bulk(-1); // Convert all pages
    console.log(`PDF converted to ${pageCount.length} pages`);
    console.log("Page count result:", pageCount);
    // Read the generated images and convert to buffers
    const imageBuffers = [];
    // pdf2pic creates files with names like "page.1.png", "page.2.png", etc.
    for (let i = 0; i < pageCount.length; i++) {
      // Try different possible filename patterns - pdf2pic uses dots, not underscores
      const possibleNames = [
        `page.${i + 1}.png`, // Actual format: page.1.png, page.2.png
        `page.${i + 1}.jpg`,
        `page.${i + 1}.jpeg`,
        `page_${i + 1}.png`, // Fallback formats
        `page_${i + 1}.jpg`,
        `page${i + 1}.png`,
        `page${i + 1}.jpg`,
      ];
      let imageFound = false;
      for (const filename of possibleNames) {
        const imagePath = path.join(tempDir, filename);
        console.log(`Checking for image: ${imagePath}`);
        if (fs.existsSync(imagePath)) {
          console.log(`Found image: ${imagePath}`);
          const imageBuffer = fs.readFileSync(imagePath);
          imageBuffers.push(imageBuffer);
          // Clean up temp image file
          fs.unlinkSync(imagePath);
          imageFound = true;
          break;
        }
      }
      if (!imageFound) {
        console.log(
          `No image found for page ${i + 1}, checking temp directory contents:`
        );
        const tempFiles = fs.readdirSync(tempDir);
        const imageFiles = tempFiles.filter(
          (f) =>
            f.includes("page") &&
            (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg"))
        );
        console.log("Available image files:", imageFiles);
      }
    }
    // Clean up temp PDF file
    fs.unlinkSync(tempPdfPath);
    console.log(
      `Successfully converted ${imageBuffers.length} pages to images`
    );
    return imageBuffers;
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    // Fallback: return a simple test image if conversion fails
    console.log("Falling back to test image...");
    const testImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );
    return [testImageBuffer];
  }
}
// Helper function to analyze page with OpenAI Vision API
async function analyzePageWithAI(base64Image, pageIndex) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this PDF page and identify all form fields. For each field, provide:
              1. Field type (text, checkbox, radio, select, etc.)
              2. Field label/name (what the field is for)
              3. Precise position and size (x, y, width, height coordinates)
              4. Confidence level (0.0-1.0)
              5. Reasoning for your classification
              CRITICAL: Return ONLY a JSON object with a "fields" array. If no fields are visible, return {"fields": []}. No commentary, no code fences, no additional text.
              IMPORTANT: For coordinates, use the format [x, y, width, height] where:
              - x, y = top-left corner of the field
              - width, height = actual dimensions of the field
              - All coordinates should be relative to the image dimensions
              - Focus on the actual input area size, not just the label
              Structure:
              {
                "fields": [
                  {
                    "type": "text",
                    "label": "Full Name",
                    "rect": [x, y, width, height],
                    "confidence": 0.95,
                    "reasoning": "This appears to be a text input field labeled 'Full Name' with dimensions approximately 200x25 pixels"
                  }
                ]
              }
              When unsure or no fields visible → return {"fields": []}. Focus on identifying fillable form fields, not static text or labels.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0,
      response_format: { type: "json_object" },
    });
    const content = response.choices[0].message.content;
    // Harden JSON parsing with multiple fallbacks
    let fields = [];
    try {
      // First attempt: Parse the entire content as JSON
      const parsed = JSON.parse(content);
      if (parsed && parsed.fields && Array.isArray(parsed.fields)) {
        fields = parsed.fields;
      } else if (Array.isArray(parsed)) {
        fields = parsed;
      }
    } catch (parseError) {
      console.log("Direct JSON parse failed, trying fallbacks...");
      // Fallback 1: Extract fenced JSON blocks
      const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        try {
          const parsed = JSON.parse(jsonBlockMatch[1]);
          if (parsed && parsed.fields && Array.isArray(parsed.fields)) {
            fields = parsed.fields;
          } else if (Array.isArray(parsed)) {
            fields = parsed;
          }
        } catch (blockError) {
          console.log("JSON block parse failed");
        }
      }
      // Fallback 2: Extract array substring
      if (fields.length === 0) {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const parsed = JSON.parse(arrayMatch[0]);
            if (Array.isArray(parsed)) {
              fields = parsed;
            }
          } catch (arrayError) {
            console.log("Array substring parse failed");
          }
        }
      }
      // If all parsing attempts failed, log for debugging and return empty array
      if (fields.length === 0) {
        console.log(
          "All JSON parsing attempts failed. Content preview (first 300 chars):",
          content.substring(0, 300)
        );
        console.log("Parse error details:", parseError.message);
        return []; // Don't throw, return empty array
      }
    }
    // Add page information and normalize coordinates
    return fields.map((field) => ({
      ...field,
      page: pageIndex,
      rect: normalizeAICoordinates(field.rect),
      confidence: field.confidence || 0.5,
      reasoning: field.reasoning || "AI detected form field",
    }));
  } catch (error) {
    console.error(`Error analyzing page ${pageIndex}:`, error);
    return [];
  }
}
// Helper function to normalize AI coordinates from [x, y, width, height] to [x1, y1, x2, y2]
function normalizeAICoordinates(rect) {
  if (!Array.isArray(rect) || rect.length < 4) {
    return [0, 0, 100, 20]; // Default rectangle
  }
  // Handle both formats: [x, y, width, height] and [x1, y1, x2, y2]
  let [x, y, width, height] = rect.map((coord) => Number(coord) || 0);
  // If the coordinates look like they're already in [x1, y1, x2, y2] format
  // (i.e., if width/height are very large), convert them
  if (width > 1000 || height > 1000) {
    // Already in [x1, y1, x2, y2] format
    return [x, y, width, height];
  }
  // Convert from [x, y, width, height] to [x1, y1, x2, y2]
  return [x, y, x + width, y + height];
}
// Helper function to post-process AI field suggestions
function postProcessFields(fields) {
  return fields
    .filter((field) => field.confidence > 0.3) // Filter out low-confidence fields
    .map((field, index) => ({
      ...field,
      id: `ai_field_${index + 1}`,
      type: normalizeFieldType(field.type),
      rect: normalizeRectangle(field.rect),
      fontSize: field.fontSize || 11,
      align: field.align || "left",
      shrink: field.shrink !== false,
      // Add metadata for better coordinate handling
      originalRect: field.rect,
      confidence: field.confidence || 0.5,
    }))
    .sort((a, b) => {
      // Sort by page, then by Y position (top to bottom)
      if (a.page !== b.page) return a.page - b.page;
      return a.rect[1] - b.rect[1];
    });
}
// Helper function to normalize field types
function normalizeFieldType(type) {
  const typeMap = {
    text: "text",
    input: "text",
    string: "text",
    checkbox: "checkbox",
    check: "checkbox",
    radio: "radio",
    select: "select",
    dropdown: "select",
    textarea: "textarea",
    area: "textarea",
  };
  // Harden the function to handle missing/odd values
  if (!type || typeof type !== "string") {
    return "text"; // Default fallback
  }
  const normalized = typeMap[type.toLowerCase()] || "text";
  return normalized;
}
// Helper function to normalize rectangle coordinates with better scaling
function normalizeRectangle(rect) {
  if (!Array.isArray(rect) || rect.length !== 4) {
    return [0, 0, 100, 20]; // Default rectangle
  }
  // Ensure coordinates are numbers and in correct order
  let [x1, y1, x2, y2] = rect.map((coord) => Number(coord) || 0);
  // Ensure proper order (x1 < x2, y1 < y2)
  if (x1 > x2) [x1, x2] = [x2, x1];
  if (y1 > y2) [y1, y2] = [y1, y2];
  // Apply minimum size constraints for better usability
  const minWidth = 50;
  const minHeight = 20;
  if (x2 - x1 < minWidth) {
    const centerX = (x1 + x2) / 2;
    x1 = centerX - minWidth / 2;
    x2 = centerX + minWidth / 2;
  }
  if (y2 - y1 < minHeight) {
    const centerY = (y1 + y2) / 2;
    y1 = centerY - minHeight / 2;
    y2 = centerY + minHeight / 2;
  }
  return [x1, y1, x2, y2];
}
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🧠 Mock AI server running on http://localhost:${PORT}`);
});
// Global error handler for unhandled errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't crash the server, just log the error
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't crash the server, just log the error
});