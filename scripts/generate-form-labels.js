// scripts/generate-form-labels.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { PDFDocument } from "pdf-lib";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { createRequire } from "module";
import OpenAI from "openai";
import admin from "firebase-admin";

dotenv.config();
const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = require.resolve(
  "pdfjs-dist/build/pdf.worker.mjs"
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔥 Firebase Admin Init
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// 🔍 Load PDF Text
async function extractTextFromPDF(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await getDocument({ data }).promise;

  let allText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    allText += content.items.map((item) => item.str).join(" ") + " ";
  }
  return allText;
}

// 🔧 Extract fields with context
function extractNearbyText(fieldName, fullText, radius = 100) {
  const cleanName = fieldName.replace(/[_\-]/g, " ").toLowerCase();
  const index = fullText.toLowerCase().indexOf(cleanName);
  if (index === -1) return fullText.slice(0, radius * 2);
  const start = Math.max(index - radius, 0);
  const end = Math.min(index + cleanName.length + radius, fullText.length);
  return fullText.slice(start, end).replace(/\s+/g, " ").trim();
}

// 🧠 Generate labels via GPT
async function labelFieldsWithOpenAI(fieldContexts) {
  const chunkSize = 10;
  const chunks = [];
  for (let i = 0; i < fieldContexts.length; i += chunkSize) {
    chunks.push(fieldContexts.slice(i, i + chunkSize));
  }

  let allLabeledFields = [];

  for (const chunk of chunks) {
    const prompt = `
You are a form assistant. For each field below, generate:
- a short user-friendly "label"
- a short helpful "description" (1 sentence)

Only return valid JSON (no markdown, no explanations).

Format:
[
  { "name": "...", "label": "...", "description": "..." },
  ...
]

Fields:
${JSON.stringify(chunk, null, 2)}
  `.trim();

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
      });

      const content = response.choices[0].message.content;
      const clean = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (Array.isArray(parsed)) {
        allLabeledFields = allLabeledFields.concat(parsed);
      } else {
        console.warn("GPT returned non-array for a chunk");
      }
    } catch (err) {
      console.error(`❌ GPT chunk failed:`, err.message);
    }
  }
  return allLabeledFields;
}

// 🏁 Main loop
async function processForms() {
  const formsDir = path.resolve("src/data/forms");
  const applications = fs
    .readdirSync(formsDir)
    .filter((entry) => fs.statSync(path.join(formsDir, entry)).isDirectory());

  for (const appId of applications) {
    const appPath = path.join(formsDir, appId);
    const formFiles = fs.readdirSync(appPath).filter((f) => f.endsWith(".pdf"));

    for (const formName of formFiles) {
      const formPath = path.join(appPath, formName);
      const cacheKey = `${appId}_${formName}`;
      const docRef = db.collection("formLabels").doc(cacheKey);

      const existing = await docRef.get();
      if (existing.exists) {
        console.log(`✅ Skipping cached: ${cacheKey}`);
        continue;
      }

      console.log(`🧠 Processing ${cacheKey}...`);

      try {
        const rawText = await extractTextFromPDF(formPath);

        const pdfBytes = fs.readFileSync(formPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fieldNames = form.getFields().map((f) => f.getName());

        const fieldContexts = fieldNames.map((name) => {
          const context = extractNearbyText(name, rawText, 150);
          return {
            name,
            context: context.slice(0, 300), // limit per field to ~300 characters
          };
        });

        const labeledFields = await labelFieldsWithOpenAI(fieldContexts);

        await docRef.set({
          fields: labeledFields,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Saved ${labeledFields.length} fields for ${cacheKey}`);
      } catch (err) {
        console.error(`❌ Failed on ${cacheKey}:`, err.message);
      }
    }
  }

  console.log("🏁 Done.");
}

processForms();
