#!/usr/bin/env node

/**
 * AI Rules Verification Script
 *
 * This script helps AI assistants verify they've read and understood
 * the project rules before making any changes.
 *
 * USAGE: node scripts/verify-ai-rules.mjs
 */

import fs from "fs";
import path from "path";

const RULES_DIR = ".cursor/rules";
const REQUIRED_FILES = [
  "README.md",
  "01-file-organization.md",
  "02-git-workflow.md",
  "03-state-checking.md",
  "04-server-management.md",
  "05-code-changes.md",
];

console.log("🤖 AI RULES VERIFICATION");
console.log("========================\n");

// Check if rules directory exists
if (!fs.existsSync(RULES_DIR)) {
  console.error("❌ ERROR: .cursor/rules directory not found!");
  console.error("   This project requires specific AI assistant rules.");
  process.exit(1);
}

console.log("📚 VERIFYING RULES COMPLIANCE...\n");

let allRulesRead = true;

// Check each required rule file
for (const file of REQUIRED_FILES) {
  const filePath = path.join(RULES_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Found`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allRulesRead = false;
  }
}

console.log("\n📋 RULES SUMMARY:");
console.log("================");

if (allRulesRead) {
  console.log("✅ All required rule files are present");
  console.log("\n🚨 CRITICAL REMINDERS:");
  console.log("   • ALWAYS ask permission before making changes");
  console.log("   • ALWAYS explain what you plan to change");
  console.log("   • ALWAYS wait for user approval");
  console.log("   • NEVER create files in project root");
  console.log("   • NEVER use git add . immediately");
  console.log("\n📖 Please read ALL rule files before proceeding:");
  console.log("   - .cursor/rules/README.md");
  console.log("   - .cursor/rules/05-code-changes.md");
  console.log("   - .cursor/rules/02-git-workflow.md");
  console.log("\n❓ Have you read and understood these rules?");
  console.log('   Type "YES" to confirm you will follow them:');
} else {
  console.log("❌ Some rule files are missing");
  console.log("   Please ensure all .cursor/rules files are present");
  process.exit(1);
}

// Wait for user confirmation
process.stdin.once("data", (data) => {
  const input = data.toString().trim().toUpperCase();
  if (input === "YES") {
    console.log("\n✅ CONFIRMED: You will follow the project rules");
    console.log("🚀 You may now proceed with your work");
    console.log("   Remember: Always ask permission first!");
    process.exit(0);
  } else {
    console.log("\n❌ RULES NOT CONFIRMED");
    console.log("   You must read and confirm the rules before proceeding");
    process.exit(1);
  }
});
