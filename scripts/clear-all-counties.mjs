#!/usr/bin/env node

/**
 * Clear All Counties Script
 * 
 * This script completely removes all county applications from:
 * 1. Local data files
 * 2. Applications directories
 * 3. Firebase Firestore database
 * 4. Manifest files
 * 
 * USE WITH CAUTION - This will delete ALL county data!
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync, unlinkSync, rmdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DATA_DIR = join(__dirname, "..", "data");
const APPLICATIONS_DIR = join(__dirname, "..", "applications");
const PUBLIC_DATA_DIR = join(__dirname, "..", "public", "data");
const SRC_DATA_DIR = join(__dirname, "..", "src", "data");
const DIST_DATA_DIR = join(__dirname, "..", "dist", "data");

class CountyCleaner {
  constructor() {
    this.db = null;
    this.deletedCounties = [];
    this.errors = [];
  }

  async initializeFirebase() {
    try {
      console.log("🔥 Initializing Firebase Admin...");
      
      // Try to load service account from common locations
      let serviceAccountPath;
      const possiblePaths = [
        join(__dirname, "..", "config", "serviceAccountKey.json"),
        join(__dirname, "..", "firebase-service-account.json"),
        join(__dirname, "..", "config", "firebase-service-account.json"),
        join(__dirname, "..", ".firebase", "service-account.json"),
        join(process.env.HOME, ".firebase", "service-account.json"),
      ];

      for (const path of possiblePaths) {
        if (existsSync(path)) {
          serviceAccountPath = path;
          break;
        }
      }

      if (!serviceAccountPath) {
        throw new Error("Firebase service account file not found");
      }

      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      
      initializeApp({
        credential: cert(serviceAccount),
      });

      this.db = getFirestore();
      console.log("✅ Firebase Admin initialized successfully");
      
    } catch (error) {
      console.error("❌ Failed to initialize Firebase:", error.message);
      throw error;
    }
  }

  async clearFirebaseCounties() {
    try {
      console.log("\n🗄️  Clearing Firebase applications collection...");
      
      const applicationsRef = this.db.collection("applications");
      const snapshot = await applicationsRef.get();
      
      if (snapshot.empty) {
        console.log("ℹ️  No applications found in Firebase");
        return;
      }

      console.log(`📊 Found ${snapshot.size} applications in Firebase`);
      
      const batch = this.db.batch();
      let deletedCount = 0;

      snapshot.forEach((doc) => {
        const appId = doc.id;
        if (appId.includes("county") || appId.includes("mehko")) {
          batch.delete(doc.ref);
          deletedCount++;
          console.log(`  🗑️  Marked for deletion: ${appId}`);
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
        console.log(`✅ Deleted ${deletedCount} county applications from Firebase`);
      } else {
        console.log("ℹ️  No county applications found in Firebase");
      }
      
    } catch (error) {
      console.error("❌ Error clearing Firebase:", error.message);
      this.errors.push(`Firebase: ${error.message}`);
    }
  }

  clearLocalCountyFiles() {
    try {
      console.log("\n📁 Clearing local county files...");
      
      // Clear data directory county files
      const countyFiles = [
        "alameda_county_mehko.json",
        "lake_county_mehko.json", 
        "santabarbara_mehko.json",
        "test-county.json",
        "county-batch.json"
      ];

      countyFiles.forEach(filename => {
        const filepath = join(DATA_DIR, filename);
        if (existsSync(filepath)) {
          unlinkSync(filepath);
          console.log(`  🗑️  Deleted: ${filename}`);
          this.deletedCounties.push(filename);
        }
      });

      // Clear applications directory
      const countyDirs = [
        "alameda_county_mehko",
        "lake_county_mehko",
        "los_angeles_mehko", 
        "sandiego_mehko",
        "santabarbara_mehko",
        "sonoma_county_mehko"
      ];

      countyDirs.forEach(dirname => {
        const dirpath = join(APPLICATIONS_DIR, dirname);
        if (existsSync(dirpath)) {
          this.deleteDirectoryRecursive(dirpath);
          console.log(`  🗑️  Deleted directory: ${dirname}`);
          this.deletedCounties.push(dirname);
        }
      });

      // Clear applications.json files
      const appFiles = [
        join(PUBLIC_DATA_DIR, "applications.json"),
        join(SRC_DATA_DIR, "applications.json"),
        join(DIST_DATA_DIR, "applications.json")
      ];

      appFiles.forEach(filepath => {
        if (existsSync(filepath)) {
          unlinkSync(filepath);
          console.log(`  🗑️  Deleted: ${filepath.replace(join(__dirname, ".."), "")}`);
        }
      });

      // Reset manifest to empty array
      const manifestPath = join(DATA_DIR, "manifest.json");
      if (existsSync(manifestPath)) {
        const emptyManifest = "[]\n";
        require("fs").writeFileSync(manifestPath, emptyManifest);
        console.log("  🔄 Reset manifest.json to empty array");
      }
      
    } catch (error) {
      console.error("❌ Error clearing local files:", error.message);
      this.errors.push(`Local files: ${error.message}`);
    }
  }

  deleteDirectoryRecursive(dirPath) {
    if (existsSync(dirPath)) {
      const files = require("fs").readdirSync(dirPath);
      
      files.forEach(file => {
        const curPath = join(dirPath, file);
        
        if (require("fs").lstatSync(curPath).isDirectory()) {
          this.deleteDirectoryRecursive(curPath);
        } else {
          unlinkSync(curPath);
        }
      });
      
      rmdirSync(dirPath);
    }
  }

  async run() {
    try {
      console.log("🚨 COUNTY CLEANUP SCRIPT - USE WITH CAUTION!");
      console.log("=" .repeat(50));
      
      // Initialize Firebase
      await this.initializeFirebase();
      
      // Clear Firebase
      await this.clearFirebaseCounties();
      
      // Clear local files
      this.clearLocalCountyFiles();
      
      // Summary
      console.log("\n" + "=" .repeat(50));
      console.log("🎉 CLEANUP COMPLETE!");
      console.log("=" .repeat(50));
      
      if (this.deletedCounties.length > 0) {
        console.log(`✅ Deleted ${this.deletedCounties.length} counties:`);
        this.deletedCounties.forEach(county => {
          console.log(`   • ${county}`);
        });
      }
      
      if (this.errors.length > 0) {
        console.log(`\n⚠️  ${this.errors.length} errors occurred:`);
        this.errors.forEach(error => {
          console.log(`   • ${error}`);
        });
      }
      
      console.log("\n📝 Next steps:");
      console.log("1. All county data has been removed");
      console.log("2. Firebase applications collection cleared");
      console.log("3. Local files and directories cleaned");
      console.log("4. Ready for fresh county imports via admin dashboard");
      
    } catch (error) {
      console.error("💥 Cleanup failed:", error.message);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage: node clear-all-counties.mjs --confirm");
    console.log("This script will delete ALL county data. Use --confirm to proceed.");
    process.exit(1);
  }

  if (args[0] !== "--confirm") {
    console.log("❌ Please use --confirm to acknowledge this will delete all county data");
    process.exit(1);
  }

  const cleaner = new CountyCleaner();
  await cleaner.run();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default CountyCleaner;

