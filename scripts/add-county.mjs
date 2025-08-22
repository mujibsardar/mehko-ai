#!/usr/bin/env node
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * Add a new county application to manifest.json
 * Usage: node scripts/add-county.mjs <county-json-file>
 */
async function addCounty() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error("Usage: node scripts/add-county.mjs <county-json-file>");
    console.error(
      "Example: node scripts/add-county.mjs generated_orange_county_mehko.json"
    );
    console.error("Note: Generated files are in the 'generated/' directory");
    process.exit(1);
  }

  let countyFile = args[0];

  // If just filename provided, assume it's in generated/ directory
  if (!countyFile.includes("/") && !countyFile.includes("\\")) {
    countyFile = path.join(__dirname, "../generated", countyFile);
  }

  const manifestPath = path.join(__dirname, "../data/manifest.json");

  try {
    // Read the county JSON file
    const countyData = JSON.parse(fs.readFileSync(countyFile, "utf8"));

    // Read the current manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    // Check if county already exists
    const existingIndex = manifest.findIndex((app) => app.id === countyData.id);

    if (existingIndex >= 0) {
      console.log(`⚠️  County ${countyData.id} already exists. Updating...`);
      manifest[existingIndex] = countyData;
    } else {
      console.log(`➕ Adding new county: ${countyData.id}`);
      manifest.push(countyData);
    }

    // Write back to manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(
      `✅ Successfully ${existingIndex >= 0 ? "updated" : "added"} ${
        countyData.id
      } to manifest.json`
    );
    console.log(`📝 Total counties in manifest: ${manifest.length}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

addCounty();
