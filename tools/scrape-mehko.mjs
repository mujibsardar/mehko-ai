#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = new Map(
  process.argv
    .slice(2)
    .map((v, i, a) => (i % 2 ? [a[i - 1], v] : null))
    .filter(Boolean)
);
const inPath = args.get("--manifest") || "manifest.json";
const outPath = args.get("--out") || "manifest-with-pdfs.json";

const ensureAbs = (base, href) => new URL(href, base).toString();
const pdfIdFrom = (u) => {
  const url = new URL(u);
  const base = path.basename(url.pathname);
  return (
    base
      .replace(/\.[Pp][Dd][Ff]$/, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .toLowerCase() || "form"
  );
};

const manifest = JSON.parse(await fs.readFile(inPath, "utf8"));
const out = [];
for (const row of manifest) {
  const { mehkoPageUrl } = row;
  const html = await (await fetch(mehkoPageUrl)).text();
  const $ = cheerio.load(html);
  const pdfs = [];
  $("a[href$='.pdf'], a[href*='.pdf?']").each((_, a) => {
    const href = $(a).attr("href");
    if (!href) return;
    const url = ensureAbs(mehkoPageUrl, href);
    pdfs.push({ pdfUrl: url, pdfId: pdfIdFrom(url) });
  });
  // de-dupe by pdfId
  const seen = new Set();
  const uniq = [];
  for (const p of pdfs)
    if (!seen.has(p.pdfId)) {
      seen.add(p.pdfId);
      uniq.push(p);
    }
  out.push({ ...row, pdfs: uniq });
}
await fs.writeFile(outPath, JSON.stringify(out, null, 2));
console.log(`✅ Wrote ${outPath}`);
