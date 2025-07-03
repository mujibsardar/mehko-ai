import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

import OpenAI from "openai";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

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

  const pdfPath = path.resolve("src/data/forms", applicationId, formName);
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ error: "PDF not found" });
  }

  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields().map((f) => f.getName());

    res.json({ fields });
  } catch (err) {
    console.error("Error extracting form fields:", err);
    res.status(500).json({ error: "Failed to extract form fields" });
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
