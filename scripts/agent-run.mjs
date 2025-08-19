import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Read analyzer log
const analyzerLog = fs.readFileSync("analyzer.log", "utf8");

// Split into chunks (to avoid token overflow)
function chunkText(text, size = 4000) {
  const lines = text.split("\n");
  const chunks = [];
  let current = [];
  let length = 0;

  for (const line of lines) {
    length += line.length;
    current.push(line);
    if (length > size) {
      chunks.push(current.join("\n"));
      current = [];
      length = 0;
    }
  }
  if (current.length) chunks.push(current.join("\n"));
  return chunks;
}

const prompt = `
You are a code cleanup + patch generator.

Input: ESLint error logs.

Task:
- Fix ALL errors (unused vars, undefined globals like window/document/console/fetch/etc.).
- Respond ONLY with valid JSON:

{
  "patches": [
    { "path": "relative/file/path.jsx", "unified_diff": "..." }
  ],
  "comments": []
}

Rules:
- Only touch files mentioned in the logs.
- Safe, mechanical fixes only (no API changes).
- Always valid JSON.
`;

const chunks = chunkText(analyzerLog, 2000);
const allPatches = [];

for (let i = 0; i < chunks.length; i++) {
  console.log(`Processing chunk ${i + 1} of ${chunks.length}...`);
  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: chunks[i] },
      ],
      max_tokens: 1200,
    });

    const content = resp.choices[0].message.content;
    const parsed = JSON.parse(content); // might fail

    if (parsed.patches) {
      allPatches.push(...parsed.patches);
    }
  } catch (err) {
    console.error(
      `❌ Chunk ${i + 1} failed JSON parse, skipping...`,
      err.message
    );
  }
}

const output = { patches: allPatches, comments: [] };
fs.writeFileSync("agent-output.json", JSON.stringify(output, null, 2));
console.log(`✅ Agent output saved with ${allPatches.length} patches`);
