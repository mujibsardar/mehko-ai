#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

const args = new Map(
  process.argv
    .slice(2)
    .map((v, i, a) => (i % 2 ? [a[i - 1], v] : null))
    .filter(Boolean)
);
const inPath = args.get("--manifest") || "manifest-with-pdfs.json";
const outDir = args.get("--out") || "seed/apps";
await fs.mkdir(outDir, { recursive: true });

const rows = JSON.parse(await fs.readFile(inPath, "utf8"));
for (const row of rows) {
  const { appId, title, rootDomain, pdfs = [] } = row;
  if (!pdfs.length) {
    console.warn(`⚠️  ${appId} has no PDFs; skipping`);
    continue;
  }

  const steps = [
    {
      id: "eligibility",
      title: "Verify Eligibility",
      type: "info",
      content:
        "Operate from your private home kitchen. MEHKO permit required. County must authorize MEHKOs. Hold a Food Protection Manager Certification.",
    },
    ...pdfs.map(({ pdfId }) => ({
      id: `pdf_${pdfId}`.slice(0, 64),
      title: "Official MEHKO Application",
      type: "pdf",
      formId: pdfId,
      appId: appId,
      content:
        "Complete and submit the county MEHKO application and required documents.",
    })),
  ];

  const appDoc = {
    id: appId,
    title,
    description: `${title} information and official application materials.`,
    rootDomain,
    supportTools: { aiEnabled: true, commentsEnabled: true },
    steps,
  };

  const outPath = path.join(outDir, `${appId}.json`);
  await fs.writeFile(outPath, JSON.stringify(appDoc, null, 2));
  console.log(`✅ Wrote ${outPath}`);
}
