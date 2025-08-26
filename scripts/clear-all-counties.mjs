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
 * Firebase Collections Cleaned:
 * - applications (main county applications)
 * - applications/{appId}/comments (comments on county apps)
 * - users/{userId}/applicationProgress (user progress for counties)
 * - users/{userId}/pinnedApplications (user's pinned counties)
 * - users/{userId}/aiChats (AI chat messages for counties)
 * - users/{userId}/formProgress (form progress for counties)
 * - reports (reports related to county apps)
 * - stepFeedback (feedback on county app steps)
 * 
 * USE WITH CAUTION - This will delete ALL county data and related user data!
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync, unlinkSync, rmdirSync, readdirSync, writeFileSync, lstatSync } from "fs";
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
      const appIds = [];
      const skippedApps = [];

      snapshot.forEach((doc) => {
        const appId = doc.id;
        console.log(`  🔍 Checking application: ${appId}`);
        
        // More comprehensive check for county/MEHKO applications
        const isCountyApp = appId.includes("county") || 
                           appId.includes("mehko") || 
                           appId.includes("_county") ||
                           appId.includes("county_") ||
                           appId.includes("_mehko") ||
                           appId.includes("mehko_");
        
        if (isCountyApp) {
          batch.delete(doc.ref);
          deletedCount++;
          appIds.push(appId);
          console.log(`  🗑️  Marked for deletion: ${appId}`);
        } else {
          skippedApps.push(appId);
          console.log(`  ⏭️  Skipped (not a county app): ${appId}`);
        }
      });

      if (deletedCount > 0) {
        console.log(`\n💾 Committing batch deletion of ${deletedCount} applications...`);
        await batch.commit();
        console.log(`✅ Successfully deleted ${deletedCount} county applications from Firebase`);
        
        if (skippedApps.length > 0) {
          console.log(`ℹ️  Skipped ${skippedApps.length} non-county applications: ${skippedApps.join(', ')}`);
        }
        
        // Now clean up related collections
        await this.clearRelatedCollections(appIds);
        
        // Verify deletion was successful
        console.log("\n🔍 Verifying deletion...");
        const verifySnapshot = await applicationsRef.get();
        const remainingApps = [];
        verifySnapshot.forEach(doc => {
          const appId = doc.id;
          if (appId.includes("county") || appId.includes("mehko")) {
            remainingApps.push(appId);
          }
        });
        
        if (remainingApps.length === 0) {
          console.log("✅ Verification successful: All county applications removed from Firebase");
        } else {
          console.log(`⚠️  Warning: ${remainingApps.length} county applications still remain: ${remainingApps.join(', ')}`);
          this.errors.push(`Verification failed: ${remainingApps.length} county apps still exist`);
        }
      } else {
        console.log("ℹ️  No county applications found in Firebase");
        if (skippedApps.length > 0) {
          console.log(`ℹ️  All ${skippedApps.length} applications were skipped: ${skippedApps.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.error("❌ Error clearing Firebase:", error.message);
      this.errors.push(`Firebase: ${error.message}`);
    }
  }

  async clearRelatedCollections(appIds) {
    if (appIds.length === 0) return;
    
    try {
      console.log("\n🧹 Clearing related Firebase collections...");
      
      // 1. Clear comments on county applications
      console.log("  📝 Clearing comments on county applications...");
      for (const appId of appIds) {
        const commentsRef = this.db.collection("applications", appId, "comments");
        const commentsSnapshot = await commentsRef.get();
        if (!commentsSnapshot.empty) {
          const batch = this.db.batch();
          commentsSnapshot.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          console.log(`    🗑️  Deleted ${commentsSnapshot.size} comments from ${appId}`);
        }
      }

      // 2. Clear user progress for county applications
      console.log("  📊 Clearing user progress for county applications...");
      const usersRef = this.db.collection("users");
      const usersSnapshot = await usersRef.get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const progressRef = this.db.collection("users", userId, "applicationProgress");
        const progressSnapshot = await progressRef.get();
        
        if (!progressSnapshot.empty) {
          const batch = this.db.batch();
          let progressDeleted = 0;
          
          progressSnapshot.forEach(doc => {
            if (appIds.includes(doc.id)) {
              batch.delete(doc.ref);
              progressDeleted++;
            }
          });
          
          if (progressDeleted > 0) {
            await batch.commit();
            console.log(`    🗑️  Deleted ${progressDeleted} progress records for user ${userId}`);
          }
        }
      }

      // 3. Clear pinned applications for counties
      console.log("  📌 Clearing pinned county applications...");
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const pinnedRef = this.db.collection("users", userId, "pinnedApplications");
        const pinnedSnapshot = await pinnedRef.get();
        
        if (!pinnedSnapshot.empty) {
          const batch = this.db.batch();
          let pinnedDeleted = 0;
          
          pinnedSnapshot.forEach(doc => {
            if (appIds.includes(doc.id)) {
              batch.delete(doc.ref);
              pinnedDeleted++;
            }
          });
          
          if (pinnedDeleted > 0) {
            await batch.commit();
            console.log(`    🗑️  Deleted ${pinnedDeleted} pinned applications for user ${userId}`);
          }
        }
      }

      // 4. Clear reports related to county applications
      console.log("  📋 Clearing reports related to county applications...");
      const reportsRef = this.db.collection("reports");
      const reportsSnapshot = await reportsRef.get();
      
      if (!reportsSnapshot.empty) {
        const batch = this.db.batch();
        let reportsDeleted = 0;
        
        reportsSnapshot.forEach(doc => {
          const reportData = doc.data();
          if (reportData.applicationId && appIds.includes(reportData.applicationId)) {
            batch.delete(doc.ref);
            reportsDeleted++;
          }
        });
        
        if (reportsDeleted > 0) {
          await batch.commit();
          console.log(`    🗑️  Deleted ${reportsDeleted} reports related to county applications`);
        }
      }

      // 5. Clear step feedback for county applications
      console.log("  💬 Clearing step feedback for county applications...");
      const stepFeedbackRef = this.db.collection("stepFeedback");
      const stepFeedbackSnapshot = await stepFeedbackRef.get();
      
      if (!stepFeedbackSnapshot.empty) {
        const batch = this.db.batch();
        let feedbackDeleted = 0;
        
        stepFeedbackSnapshot.forEach(doc => {
          const feedbackData = doc.data();
          if (feedbackData.applicationId && appIds.includes(feedbackData.applicationId)) {
            batch.delete(doc.ref);
            feedbackDeleted++;
          }
        });
        
        if (feedbackDeleted > 0) {
          await batch.commit();
          console.log(`    🗑️  Deleted ${feedbackDeleted} step feedback records for county applications`);
        }
      }

      // 6. Clear AI chat messages for county applications
      console.log("  🤖 Clearing AI chat messages for county applications...");
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const aiChatsRef = this.db.collection("users", userId, "aiChats");
        const aiChatsSnapshot = await aiChatsRef.get();
        
        if (!aiChatsSnapshot.empty) {
          const batch = this.db.batch();
          let chatDeleted = 0;
          
          aiChatsSnapshot.forEach(doc => {
            if (appIds.includes(doc.id)) {
              batch.delete(doc.ref);
              chatDeleted++;
            }
          });
          
          if (chatDeleted > 0) {
            await batch.commit();
            console.log(`    🗑️  Deleted ${chatDeleted} AI chat records for user ${userId}`);
          }
        }
      }

      // 7. Clear form progress for county applications
      console.log("  📝 Clearing form progress for county applications...");
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const formProgressRef = this.db.collection("users", userId, "formProgress");
        const formProgressSnapshot = await formProgressRef.get();
        
        if (!formProgressSnapshot.empty) {
          const batch = this.db.batch();
          let formProgressDeleted = 0;
          
          formProgressSnapshot.forEach(doc => {
            if (appIds.includes(doc.id)) {
              batch.delete(doc.ref);
              formProgressDeleted++;
            }
          });
          
          if (formProgressDeleted > 0) {
            await batch.commit();
            console.log(`    🗑️  Deleted ${formProgressDeleted} form progress records for user ${userId}`);
          }
        }
      }

      console.log("✅ Related collections cleanup completed");
      
    } catch (error) {
      console.error("❌ Error clearing related collections:", error.message);
      this.errors.push(`Related collections: ${error.message}`);
    }
  }

  clearLocalCountyFiles() {
    try {
      console.log("\n📁 Clearing local county files...");
      
      // PROTECTED FILES - These should NEVER be deleted
      const protectedFiles = [
        "county-template.json",
        "example-county.json", 
        "county-targets.md",
        "README.md"
      ];
      
      // Clear data directory county files - dynamically find them
      const allDataFiles = readdirSync(DATA_DIR);
      const countyFiles = allDataFiles.filter(filename => {
        // Only delete files that look like county data (contain 'county' or 'mehko' and end with .json)
        const isCountyFile = (filename.includes('county') || filename.includes('mehko')) && 
                           filename.endsWith('.json') &&
                           !protectedFiles.includes(filename);
        
        if (isCountyFile) {
          console.log(`  🔍 Found county file: ${filename}`);
        }
        
        return isCountyFile;
      });

      countyFiles.forEach(filename => {
        const filepath = join(DATA_DIR, filename);
        if (existsSync(filepath)) {
          unlinkSync(filepath);
          console.log(`  🗑️  Deleted: ${filename}`);
          this.deletedCounties.push(filename);
        }
      });

      // Clear applications directory - dynamically find county directories
      if (existsSync(APPLICATIONS_DIR)) {
        const allAppDirs = readdirSync(APPLICATIONS_DIR);
        const countyDirs = allAppDirs.filter(dirname => {
          // Only delete directories that look like county applications
          const isCountyDir = (dirname.includes('county') || dirname.includes('mehko')) &&
                            dirname !== 'test'; // Protect test directory
          
          if (isCountyDir) {
            console.log(`  🔍 Found county directory: ${dirname}`);
          }
          
          return isCountyDir;
        });

        countyDirs.forEach(dirname => {
          const dirpath = join(APPLICATIONS_DIR, dirname);
          if (existsSync(dirpath)) {
            this.deleteDirectoryRecursive(dirpath);
            console.log(`  🗑️  Deleted directory: ${dirname}`);
            this.deletedCounties.push(dirname);
          }
        });
      }

      // Clear applications.json files (these are generated, safe to delete)
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

      // Reset manifest to empty array (this is safe to reset)
      const manifestPath = join(DATA_DIR, "manifest.json");
      if (existsSync(manifestPath)) {
        const emptyManifest = "[]\n";
        writeFileSync(manifestPath, emptyManifest);
        console.log("  🔄 Reset manifest.json to empty array");
      }
      
      // Log what was protected
      console.log("  🛡️  Protected template files:");
      protectedFiles.forEach(file => {
        if (existsSync(join(DATA_DIR, file))) {
          console.log(`    • ${file}`);
        }
      });
      
    } catch (error) {
      console.error("❌ Error clearing local files:", error.message);
      this.errors.push(`Local files: ${error.message}`);
    }
  }

  deleteDirectoryRecursive(dirPath) {
    if (existsSync(dirPath)) {
      const files = readdirSync(dirPath);
      
      files.forEach(file => {
        const curPath = join(dirPath, file);
        
        if (lstatSync(curPath).isDirectory()) {
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
      
      // Show what will be protected
      console.log("🛡️  PROTECTED FILES (will NOT be deleted):");
      console.log("   • county-template.json - County creation template");
      console.log("   • example-county.json - Example county structure");
      console.log("   • county-targets.md - County documentation");
      console.log("   • README.md - Data directory documentation");
      console.log("   • test/ - Test directory");
      console.log("");
      
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

