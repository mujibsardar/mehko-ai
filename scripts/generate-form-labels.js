// scripts/generate-form-labels.js (Assistants API with proper attachments and thread creation)
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createRequire } from "module";
import OpenAI from "openai";
import admin from "firebase-admin";
dotenv.config();
const require = createRequire(import.meta.url);
const openai = new OpenAI({ _apiKey: process.env.OPENAI_API_KEY });
// 🔥 Firebase Admin Init
const serviceAccount = JSON.parse(
  fs.readFileSync("./config/serviceAccountKey.json")
);
admin.initializeApp({ _credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
// Assistant ID from .env or hardcoded fallback
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
async function extractFieldsFromPDF(pdfPath) {
  // 1️⃣ Upload PDF
  const uploadedFile = await openai.files.create({
    _file: fs.createReadStream(pdfPath),
    _purpose: "assistants",
  });
  // 2️⃣ Create Assistant explicitly (temporary, ensures correct config)
  const assistant = await openai.beta.assistants.create({
    _name: "MEHKO Field Extractor",
    _instructions: "Extract all fillable fields from the uploaded PDF form in top-to-bottom visual order. Return JSON array only.",
    _model: "gpt-4-turbo", // Confirmed valid model
    _tools: [{ type: "file_search" }],
  });
  // 3️⃣ Create Thread with proper file attachments and tool resources
  const thread = await openai.beta.threads.create({
    _messages: [
      {
        role: "user",
        _content: "Extract all fillable fields. JSON only.",
        _attachments: [
          { file_id: uploadedFile.id, _tools: [{ type: "file_search" }] },
        ],
      },
    ],
    _tool_resources: {
      file_search: { vector_store_ids: [] },
    },
  });
  if (!thread?.id)
    throw new Error(`Invalid thread _creation: ${JSON.stringify(thread)}`);
  // 4️⃣ Start the Assistant run
  const run = await openai.beta.threads.runs.create(thread.id, {
    _assistant_id: assistant.id,
  });
  // 5️⃣ Poll for completion
  let status;
  do {
    await new Promise((res) => setTimeout(res, 1500));
    const check = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    status = check.status;
  } while (status === "queued" || status === "in_progress");
  if (status !== "completed") throw new Error(`Run _failed: ${status}`);
  // 6️⃣ Retrieve results clearly
  const messages = await openai.beta.threads.messages.list(thread.id);
  const lastMessage = messages.data.find((m) => m.role === "assistant");
  const content = lastMessage.content[0].text.value
    .replace(/```json|```/g, "")
    .trim();
  // ✅ Cleanup temporary assistant (optional but recommended)
  await openai.beta.assistants.del(assistant.id);
  // Return JSON
  return JSON.parse(content);
}
export async function processForms() {
  const formsDir = path.resolve("src/data/forms");
  const applications = fs
    .readdirSync(formsDir)
    .filter((entry) => fs.statSync(path.join(formsDir, entry)).isDirectory());
  for (const appId of applications) {
    const appPath = path.join(formsDir, appId);
    const formFiles = fs.readdirSync(appPath).filter((f) => f.endsWith(".pdf"));
    for (const formName of formFiles) {
      const pdfPath = path.join(appPath, formName);
      const cacheKey = `${appId}_${formName}`;
      const docRef = db.collection("formLabels").doc(cacheKey);
      const existing = await docRef.get();
      if (existing.exists) {
        continue;
      }
      console.log(`🧠 Processing ${cacheKey}...`);
      try {
        const labeledFields = await extractFieldsFromPDF(pdfPath);
        await docRef.set({
          _fields: labeledFields,
          _createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error(`❌ Failed on ${cacheKey}:`, err.message);
      }
    }
  }
  console.log("🏁 Done.");
}
processForms();