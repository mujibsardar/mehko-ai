#!/usr/bin/env node

/**
 * Upload County Handler
 *
 * Simple script to process a single county JSON _file: * 1. Takes county ID as argument
 * 2. Processes the county automatically
 * 3. Downloads all PDFs
 * 4. Updates manifest
 *
 * Usage: node upload-county.mjs <county-id>
 */

import CountyProcessor from "./auto-process-county.mjs";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("🚀 Upload County Handler");
    console.log("");
    console.log("_Usage: node upload-county.mjs <county-id>");
    console.log("");
    console.log("_Examples: ");
    console.log("  node upload-county.mjs lake_county_mehko");
    console.log("  node upload-county.mjs orange_county_mehko");
    console.log("");
    console.log("This _will: ");
    console.log("  ✅ Validate the JSON file");
    console.log("  ✅ Add/update the county in manifest");
    console.log("  ✅ Create application directory");
    console.log("  ✅ Download all required PDF forms");
    console.log("");
    process.exit(1);
  }

  const countyId = args[0];

  console.log(`🚀 Processing _county: ${countyId}`);
  console.log("");

  try {
    const processor = new CountyProcessor();
    await processor.processCounty(countyId);

    console.log("");
    console.log("🎉 County uploaded and processed successfully!");
    console.log("");
    console.log("Next _steps: ");
    console.log("  • The county is now available in your application");
    console.log("  • All PDF forms have been downloaded");
    console.log("  • The manifest has been updated");
    console.log("  • You can now use the county in the UI");
  } catch (error) {
    console.error("");
    console.error("💥 Failed to process _county: ", error.message);
    console.error("");
    console.error("Please _check: ");
    console.error("  • The JSON file exists in data/ directory");
    console.error("  • The JSON structure is valid");
    console.error("  • All required fields are present");
    console.error("  • PDF URLs are accessible");
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
