import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// import { PDFDocument } from "pdf-lib";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import OpenAI from "openai";
import multer from "multer";
dotenv.config();

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
      
      IMPORTANT: Forms are NOT downloaded as PDFs. Users complete forms directly within the application steps.
      
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
      - ALWAYS direct users to complete forms within the application steps, not as PDF downloads
      - Reference specific step numbers when mentioning forms (e.g., "Complete the SOP form in Step 4")
      - Emphasize that forms are interactive and can be filled out directly in the app
      - Guide users to the correct step for form completion
      - Explain what each form step accomplishes in the overall application process
      
      GENERAL GUIDELINES:
      - Be concise but thorough
      - Use bullet points for step-by-step instructions
      - Explain unfamiliar terms and requirements
      - Provide practical examples when helpful
      - Encourage users to save their progress
      - Direct users to relevant application steps
      - Be encouraging and supportive
      
      Remember: You're helping someone navigate a government permit application within this app. Forms are completed in steps, not downloaded. Be clear, accurate, and helpful.`.trim();

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

    console.log("Processing PDF upload:", req.file.originalname, "Size:", req.file.size);

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
        
        console.log(`Page ${pageIndex + 1} returned ${pageFields.length} fields`);
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
      fallback: "Please try again or contact support"
    });
  }
});

// Helper function to convert PDF to images
async function convertPDFToImages(pdfBuffer) {
  try {
    console.log("Converting PDF to images using pdf2pic...");
    
    const { fromBuffer } = require('pdf2pic');
    const sharp = require('sharp');
    const fs = require('fs');
    
    // Ensure temp directory exists
    if (!fs.existsSync('./temp')) {
      fs.mkdirSync('./temp', { recursive: true });
      console.log("Created temp directory");
    }
    
    // Configure pdf2pic options
    const options = {
      density: 300,        // High resolution for better AI analysis
      saveFilename: "page",
      savePath: "./temp",
      format: "png",
      width: 2048,         // Max width for OpenAI Vision API
      height: 2048         // Max height for OpenAI Vision API
    };
    
    // Use fromBuffer instead of fromPath
    const convert = fromBuffer(pdfBuffer, options);
    
    // Get all pages at once
    const pages = await convert.bulk(-1); // -1 means all pages
    console.log(`PDF has ${pages.length} pages`);
    
    const imageBuffers = [];
    
    // Process each page result
    for (let i = 0; i < pages.length; i++) {
      try {
        const page = pages[i];
        console.log(`Processing page ${i + 1}, path: ${page.path}`);
        
        if (page && page.path && fs.existsSync(page.path)) {
          // Read the image file into a buffer
          const imageBuffer = fs.readFileSync(page.path);
          console.log(`Page ${i + 1} image size: ${imageBuffer.length} bytes`);
          
          // Process with sharp to ensure proper format and size
          const processedImage = await sharp(imageBuffer)
            .png()
            .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
            .toBuffer();
          
          imageBuffers.push(processedImage);
          console.log(`Page ${i + 1} converted successfully`);
          
          // Clean up the temp image file immediately
          try {
            fs.unlinkSync(page.path);
            console.log(`Page ${i + 1} temp file cleaned up`);
          } catch (cleanupError) {
            console.log(`Warning: Could not clean up page ${i + 1} temp file:`, cleanupError.message);
          }
        } else {
          console.log(`Page ${i + 1} missing path or file doesn't exist`);
        }
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError);
        // Continue with other pages
      }
    }
    
    console.log(`Successfully converted ${imageBuffers.length} pages to images`);
    return imageBuffers;
    
  } catch (error) {
    console.error("PDF conversion error:", error);
    // Fallback: return empty array instead of crashing
    return [];
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
              3. Approximate position (x, y coordinates)
              4. Confidence level (0.0-1.0)
              5. Reasoning for your classification
              
              CRITICAL: Return ONLY a JSON object with a "fields" array. If no fields are visible, return {"fields": []}. No commentary, no code fences, no additional text.
              
              Structure:
              {
                "fields": [
                  {
                    "type": "text",
                    "label": "Full Name",
                    "rect": [x1, y1, x2, y2],
                    "confidence": 0.95,
                    "reasoning": "This appears to be a text input field labeled 'Full Name'"
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

    // Add page information to each field
    return fields.map((field) => ({
      ...field,
      page: pageIndex,
      rect: field.rect || [0, 0, 100, 20], // Default rectangle if not provided
      confidence: field.confidence || 0.5,
      reasoning: field.reasoning || "AI detected form field",
    }));
  } catch (error) {
    console.error(`Error analyzing page ${pageIndex}:`, error);
    return [];
  }
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

// Helper function to normalize rectangle coordinates
function normalizeRectangle(rect) {
  if (!Array.isArray(rect) || rect.length !== 4) {
    return [0, 0, 100, 20]; // Default rectangle
  }

  // Ensure coordinates are numbers and in correct order
  const [x1, y1, x2, y2] = rect.map((coord) => Number(coord) || 0);

  return [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.max(x1, x2),
    Math.max(y1, y2),
  ];
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🧠 Mock AI server running on http://localhost:${PORT}`);
});

// Global error handler for unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't crash the server, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash the server, just log the error
});
