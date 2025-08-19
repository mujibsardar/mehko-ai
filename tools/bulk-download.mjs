#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = new Map(
  process.argv
    .slice(2)
    .map((v, i, a) => (i % 2 ? [a[i - 1], v] : null))
    .filter(Boolean)
);
const inPath = args.get("--manifest") || "manifest-with-pdfs.json";
const root = path.resolve(process.cwd(), "applications");

const rows = JSON.parse(await fs.readFile(inPath, "utf8"));
for (const { appId, pdfs = [] } of rows) {
  for (const { pdfUrl, pdfId } of pdfs) {
    const dir = path.join(root, appId, pdfId);
    const pdfPath = path.join(dir, "form.pdf");
    const metaPath = path.join(dir, "meta.json");
    await fs.mkdir(dir, { recursive: true });

    const res = await fetch(pdfUrl);
    if (!res.ok) {
      console.error(`❌ ${appId}/${pdfId}: ${res.status} ${res.statusText}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    let skip = false;
    try {
      const old = JSON.parse(await fs.readFile(metaPath, "utf8"));
      if (old.sha256 === sha256) {
        console.log(`⏭️  ${appId}/${pdfId} unchanged`);
        skip = true;
      }
    } catch {}
    if (skip) continue;

    await fs.writeFile(pdfPath, buf);
    await fs.writeFile(
      metaPath,
      JSON.stringify({ url: pdfUrl, sha256, size: buf.length }, null, 2)
    );
    console.log(`✅ Saved applications/${appId}/${pdfId}/form.pdf`);
  }
}
