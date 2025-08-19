#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import fetch from "node-fetch";

const manifest = JSON.parse(await fs.readFile("data/manifest.json", "utf8"));
const urlMap = JSON.parse(await fs.readFile("data/pdf-urls.json", "utf8"));

for (const app of manifest) {
  const appId = app.id;
  const urlsForApp = urlMap[appId] || {};
  const pdfSteps = (app.steps || []).filter((s) => s.type === "pdf");
  for (const s of pdfSteps) {
    const formId = s.formId;
    const url = urlsForApp[formId];
    if (!url) {
      console.warn(`⚠️  missing URL for ${appId}/${formId}`);
      continue;
    }

    const dir = path.join("applications", appId, formId);
    await fs.mkdir(dir, { recursive: true });

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`❌ ${appId}/${formId}: ${res.status} ${res.statusText}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const sha = crypto.createHash("sha256").update(buf).digest("hex");

    await fs.writeFile(path.join(dir, "form.pdf"), buf);
    await fs.writeFile(
      path.join(dir, "meta.json"),
      JSON.stringify({ url, sha256: sha, size: buf.length }, null, 2)
    );
    console.log(`✅ applications/${appId}/${formId}/form.pdf`);
  }
}
