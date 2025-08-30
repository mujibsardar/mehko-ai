#!/usr/bin/env node

/**
 * Utility script to set admin role for users
 * This script helps set up admin roles in Firebase
 *
 * Usage:
 * 1. Set admin role via custom claims (most secure):
 *    node scripts/set-admin-role.mjs --email=user@example.com --method=claims
 *
 * 2. Set admin role via Firestore document:
 *    node scripts/set-admin-role.mjs --email=user@example.com --method=firestore
 *
 * 3. Remove admin role:
 *    node scripts/set-admin-role.mjs --email=user@example.com --remove
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const email = args.find((arg) => arg.startsWith("--email="))?.split("=")[1];
const method =
  args.find((arg) => arg.startsWith("--method="))?.split("=")[1] || "claims";
const remove = args.includes("--remove");

if (!email) {
  console.error("❌ Error: Email is required");
  console.log(
    "Usage: node scripts/set-admin-role.mjs --email=user@example.com [--method=claims|firestore] [--remove]"
  );
  process.exit(1);
}

// Initialize Firebase Admin
try {
  // Try to load service account from common locations
  let serviceAccountPath;
  const possiblePaths = [
    join(__dirname, "..", "config", "serviceAccountKey.json"), // User's existing location
    join(__dirname, "..", "firebase-service-account.json"),
    join(__dirname, "..", "config", "firebase-service-account.json"),
    join(__dirname, "..", ".firebase", "service-account.json"),
    join(process.env.HOME, ".firebase", "service-account.json"),
  ];

  for (const path of possiblePaths) {
    try {
      const fs = await import("fs");
      if (fs.existsSync(path)) {
        serviceAccountPath = path;
        break;
      }
    } catch (_e) {
      // Continue to next path
    }
  }

  if (!serviceAccountPath) {
    console.error("❌ Error: Firebase service account file not found");
    console.log(
      "Please place your firebase-service-account.json file in one of these locations:"
    );
    possiblePaths.forEach((path) => console.log(`  - ${path}`));
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

  initializeApp({
    credential: cert(serviceAccount),
  });

  const auth = getAuth();
  const db = getFirestore();

  async function setAdminRole() {
    try {
      // Get user by email
      const userRecord = await auth.getUserByEmail(email);
      console.log(
        `✅ Found user: ${userRecord.email} (UID: ${userRecord.uid})`
      );

      if (remove) {
        // Remove admin role
        if (method === "claims") {
          await auth.setCustomUserClaims(userRecord.uid, { admin: false });
          console.log("✅ Removed admin custom claims");
        } else {
          await db
            .collection("users")
            .doc(userRecord.uid)
            .update({ role: "user" });
          console.log('✅ Updated Firestore role to "user"');
        }
        console.log(`✅ Admin role removed from ${email}`);
      } else {
        // Set admin role
        if (method === "claims") {
          await auth.setCustomUserClaims(userRecord.uid, { admin: true });
          console.log("✅ Set admin custom claims");
        } else {
          await db.collection("users").doc(userRecord.uid).set(
            {
              role: "admin",
              email: email,
              updatedAt: new Date(),
            },
            { merge: true }
          );
          console.log('✅ Updated Firestore role to "admin"');
        }
        console.log(`✅ Admin role set for ${email}`);
      }

      console.log("\n📝 Next steps:");
      if (method === "claims") {
        console.log(
          "1. User needs to sign out and sign back in for custom claims to take effect"
        );
        console.log(
          "2. Custom claims are the most secure method for role management"
        );
      } else {
        console.log(
          "1. Firestore role is set and will be checked on next authentication"
        );
        console.log(
          "2. Consider using custom claims for production environments"
        );
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  }

  setAdminRole();
} catch (error) {
  console.error("❌ Error initializing Firebase Admin:", error.message);
  console.log("\n📝 Make sure you have:");
  console.log("1. Firebase service account JSON file");
  console.log("2. Proper Firebase Admin SDK permissions");
  process.exit(1);
}
