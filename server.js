import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

// Ensure worker is bundled correctly
import {
  getDocument,
  GlobalWorkerOptions,
  setVerbosityLevel,
  VerbosityLevel,
} from "pdfjs-dist";
import { createRequire } from "module";
setVerbosityLevel(VerbosityLevel.ERROR); // Only show serious errors
const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = require.resolve(
  "pdfjs-dist/build/pdf.worker.mjs"
);

import OpenAI from "openai";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

const CACHE_PATH = path.resolve("form-label-cache.json");

// Load cache from file
function loadFieldCache() {
  if (fs.existsSync(CACHE_PATH)) {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  }
  return {};
}

// Save cache to file
function saveFieldCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function extractNearbyText(fieldName, fullText, radius = 100) {
  const cleanField = fieldName.replace(/[_\-]/g, " ").toLowerCase();
  const cleanText = fullText.replace(/[\n\r]/g, " ").toLowerCase();
  const index = cleanText.indexOf(cleanField);

  if (index === -1) return fullText.slice(0, radius * 2); // fallback to first snippet

  const start = Math.max(index - radius, 0);
  const end = Math.min(index + cleanField.length + radius, fullText.length);
  return fullText.slice(start, end).replace(/\s+/g, " ").trim();
}

function extractJsonFromMarkdown(content) {
  const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return match ? match[1] : content;
}

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

    const systemPrompt = `
You are an AI assistant helping users apply for a MEHKO permit.

Application Title: ${context.title}
Source: ${context.rootDomain}

Steps:
${(context.steps || [])
  .map((s, i) => `Step ${i + 1}: ${s.title} (${s.type})`)
  .join("\n")}

Completed Steps:
${(context.completedStepIds || []).join(", ") || "None"}

Community Comments:
${(context.comments || []).map((c) => `- ${c.text || c}`).join("\n") || "None"}

Form Fields:
${formSection || "None"}

Be concise, accurate, and helpful. Explain unfamiliar fields and help users complete the application.
`.trim();

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
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

// --- Inside your Express app:
app.get("/api/form-fields", async (req, res) => {
  const { applicationId, formName } = req.query;
  if (!applicationId || !formName) {
    return res.status(400).json({ error: "Missing applicationId or formName" });
  }

  const cacheKey = `${applicationId}/${formName}`;
  const cache = loadFieldCache();
  if (cache[cacheKey]) {
    console.log(`Cache hit for ${cacheKey}`);
    return res.json({ fields: cache[cacheKey] });
  }

  const pdfPath = path.resolve("src/data/forms", applicationId, formName);
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ error: "PDF not found" });
  }

  try {
    const pdf = await getDocument({
      data: new Uint8Array(fs.readFileSync(pdfPath)),
    }).promise;

    const pageTexts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str).join(" ");
      pageTexts.push(text);
    }

    // Load raw field names with pdf-lib
    const { PDFDocument } = await import("pdf-lib");
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const rawFieldNames = form.getFields().map((f) => f.getName());

    // Build context entries
    const fieldContexts = rawFieldNames.map((fieldName) => ({
      name: fieldName,
      context: extractNearbyText(fieldName, pageTexts.join(" "), 200),
    }));

    // Split into batches of 10 to avoid token limits
    const chunkSize = 10;
    const fieldChunks = [];

    for (let i = 0; i < fieldContexts.length; i += chunkSize) {
      fieldChunks.push(fieldContexts.slice(i, i + chunkSize));
    }

    let allFields = [];

    for (const chunk of fieldChunks) {
      const prompt = `
          You are a form assistant. For each item below, generate:
          - a short user-friendly "label"
          - a short helpful "description" (1 sentence)

          Only return raw valid JSON — no code block, no markdown, no explanation.

          Return format:
          [
            { "name": "...", "label": "...", "description": "..." },
            ...
          ]

          Items:
          ${JSON.stringify(chunk, null, 2)}
            `.trim();

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4-1106-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that outputs only valid JSON. No markdown.",
            },
            { role: "user", content: prompt },
          ],
        });

        const raw = response.choices[0].message.content;

        function extractJsonFromMarkdown(text) {
          const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
          return match ? match[1] : text;
        }

        const clean = extractJsonFromMarkdown(raw);
        const parsed = JSON.parse(clean);

        if (Array.isArray(parsed)) {
          allFields.push(...parsed);
        } else {
          console.warn("GPT returned non-array:", raw);
        }
      } catch (err) {
        console.error("GPT chunk failed:", err);
      }
    }

    // ✅ Save + respond
    cache[cacheKey] = allFields;
    saveFieldCache(cache);

    res.json({ fields: allFields });
  } catch (err) {
    console.error("Form extraction failed:", err);
    res.status(500).json({ error: "Failed to extract fields" });
  }
});

app.post("/api/fill-pdf", async (req, res) => {
  const { applicationId, formName, formData } = req.body;
  const filePath = path.resolve("src/data/forms", applicationId, formName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "PDF form not found" });
  }

  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    Object.entries(formData).forEach(([key, value]) => {
      const field = form.getTextField(key);
      if (field) field.setText(String(value));
    });

    const filledPdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=filled-form.pdf"
    );
    res.send(Buffer.from(filledPdfBytes));
  } catch (err) {
    console.error("Error filling PDF:", err);
    res.status(500).json({ error: "Failed to fill PDF" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🧠 Mock AI server running on http://localhost:${PORT}`);
});
