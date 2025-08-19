import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// import { PDFDocument } from "pdf-lib";
import pkg from "pdfjs-dist";
const { getDocument, GlobalWorkerOptions } = pkg;
import { createRequire } from "module";
const require = createRequire(import.meta.url);

GlobalWorkerOptions.workerSrc = require.resolve(
  "pdfjs-dist/build/pdf.worker.js"
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🧠 Mock AI server running on http://localhost:${PORT}`);
});
