#!/usr/bin/env node
/**
 * Clears all local county application files and directories.
 * This script only handles local file cleanup, no Firestore operations.
 */

import {
  readFileSync, existsSync, unlinkSync, rmdirSync,
  readdirSync, writeFileSync, lstatSync
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR         = join(__dirname, "..", "data");
const APPLICATIONS_DIR = join(__dirname, "..", "applications");
const PUBLIC_DATA_DIR  = join(__dirname, "..", "public", "data");
const SRC_DATA_DIR     = join(__dirname, "..", "src", "data");
const DIST_DATA_DIR    = join(__dirname, "..", "dist", "data");

class CountyCleaner {
  constructor() {
    this.deletedFiles = [];
    this.errors = [];
  }

  // ---- Local file cleanup ----
  clearLocalCountyFiles() {
    console.log("\n📁 Clearing local generated county files…");
    const protectedFiles = ["county-template.json", "example-county.json", "county-targets.md", "README.md"];

    const deleteDirRecursive = (dirPath) => {
      if (!existsSync(dirPath)) return;
      for (const name of readdirSync(dirPath)) {
        const p = join(dirPath, name);
        lstatSync(p).isDirectory() ? deleteDirRecursive(p) : unlinkSync(p);
      }
      rmdirSync(dirPath);
    };

    // data/*.json that look like counties
    for (const name of readdirSync(DATA_DIR)) {
      if ((name.includes("county") || name.includes("mehko")) && name.endsWith(".json") && !protectedFiles.includes(name)) {
        unlinkSync(join(DATA_DIR, name));
        console.log(`   🗑️  data/${name}`);
        this.deletedFiles.push(`data/${name}`);
      }
    }

    // applications/<dir> that look like counties
    if (existsSync(APPLICATIONS_DIR)) {
      for (const name of readdirSync(APPLICATIONS_DIR)) {
        if ((name.includes("county") || name.includes("mehko")) && name !== "test") {
          deleteDirRecursive(join(APPLICATIONS_DIR, name));
          console.log(`   🗑️  applications/${name}`);
          this.deletedFiles.push(`applications/${name}`);
        }
      }
    }

    // generated manifests
    for (const p of [join(PUBLIC_DATA_DIR, "applications.json"),
                     join(SRC_DATA_DIR, "applications.json"),
                     join(DIST_DATA_DIR, "applications.json")]) {
      if (existsSync(p)) {
        unlinkSync(p);
        console.log(`   🗑️  ${p.replace(join(__dirname, ".."), "")}`);
        this.deletedFiles.push(p.replace(join(__dirname, ".."), ""));
      }
    }

    // reset manifest.json
    const manifestPath = join(DATA_DIR, "manifest.json");
    if (existsSync(manifestPath)) {
      writeFileSync(manifestPath, "[]\n");
      console.log("   🔄 data/manifest.json reset");
    }
  }

  async run() {
    console.log("🚨 COUNTY CLEANUP — LOCAL FILES ONLY");
    this.clearLocalCountyFiles();

    console.log("\n🎉 Done.");
    if (this.deletedFiles.length) {
      console.log(`   Removed _files: ${this.deletedFiles.join(", ")}`);
    }
    if (this.errors.length) {
      console.log(`\n⚠️  ${this.errors.length} issue(s):`);
      this.errors.forEach(e => console.log("   •", e));
      process.exitCode = 2;
    }
  }
}

// CLI
async function main() {
  const arg = process.argv[2];
  if (arg !== "--confirm") {
    console.log("_Usage: node clear-all-counties.mjs --confirm");
    process.exit(1);
  }
  const cleaner = new CountyCleaner();
  await cleaner.run();
}

if (import.meta.url === `_file: //${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}

export default CountyCleaner;
