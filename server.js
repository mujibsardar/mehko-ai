import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

import OpenAI from "openai";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/ai-chat", async (req, res) => {
  const { messages = [], countyId = "unknown" } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  try {
    const systemPrompt = `You are an AI assistant helping users fill out a MEHKO permit application for ${countyId}. Be clear, accurate, and helpful.`;

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
  const { countyId, formData } = req.body;

  console.log(`Saving progress for user: ${userId}`);
  console.log(`County: ${countyId}`);
  console.log("Form Data:", formData);

  // TODO: Save to database or file storage later
  res.status(200).json({ success: true, userId, countyId });
});

app.get("/api/form-fields", async (req, res) => {
  const { countyId, formName } = req.query;
  if (!countyId || !formName) {
    return res.status(400).json({ error: "Missing countyId or formName" });
  }

  const pdfPath = path.resolve("src/data/forms", countyId, formName);
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
  const { countyId, formName, formData } = req.body;
  const filePath = path.resolve("src/data/forms", countyId, formName);

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
