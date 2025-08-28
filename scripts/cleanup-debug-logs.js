#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Patterns to remove (debug console.log statements)
const debugPatterns = [
  /console\.log\([^)]*Debug[^)]*\);/g,
  /console\.log\([^)]*🔄[^)]*\);/g,
  /console\.log\([^)]*📊[^)]*\);/g,
  /console\.log\([^)]*🖼️[^)]*\);/g,
  /console\.log\([^)]*📄[^)]*\);/g,
  /console\.log\([^)]*🔗[^)]*\);/g,
  /console\.log\([^)]*🧹[^)]*\);/g,
  /console\.log\([^)]*⏳[^)]*\);/g,
  /console\.log\([^)]*🎨[^)]*\);/g,
  /console\.log\([^)]*✅[^)]*\);/g,
  /console\.log\([^)]*⚠️[^)]*\);/g,
  /console\.log\([^)]*🔍[^)]*\);/g,
  /console\.log\([^)]*🏷️[^)]*\);/g,
  /console\.log\([^)]*📏[^)]*\);/g,
  /console\.log\([^)]*File selected[^)]*\);/g,
  /console\.log\([^)]*Starting PDF upload[^)]*\);/g,
  /console\.log\([^)]*Upload response status[^)]*\);/g,
  /console\.log\([^)]*Upload response ok[^)]*\);/g,
  /console\.log\([^)]*Analysis data received[^)]*\);/g,
  /console\.log\([^)]*Processed suggestions[^)]*\);/g,
  /console\.log\([^)]*High confidence fields[^)]*\);/g,
  /console\.log\([^)]*Sending request to[^)]*\);/g,
  /console\.log\([^)]*No existing overlay found[^)]*\);/g,
];
// Keep important console.log statements (errors, warnings)
const keepPatterns = [
  /console\.error/g,
  /console\.warn/g,
  /console\.log\([^)]*Error[^)]*\);/g,
  /console\.log\([^)]*Warning[^)]*\);/g,
];
function shouldKeepLog(line) {
  // Check if this line should be kept
  return keepPatterns.some(pattern => pattern.test(line));
}
function cleanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    const cleanedLines = lines.map(line => {
      // Check if this is a debug console.log that should be removed
      if (line.includes('console.log') && !shouldKeepLog(line)) {
        const shouldRemove = debugPatterns.some(pattern => pattern.test(line));
        if (shouldRemove) {
          modified = true;
          return ''; // Remove the line
        }
      }
      return line;
    });
    if (modified) {
      // Remove empty lines and write back
      const cleanedContent = cleanedLines.filter(line => line.trim() !== '').join('\n');
      fs.writeFileSync(filePath, cleanedContent);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  let totalCleaned = 0;
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', 'dist', 'build', '__pycache__', '.git'].includes(item)) {
        totalCleaned += processDirectory(fullPath);
      }
    } else if (item.endsWith('.jsx') || item.endsWith('.js')) {
      if (cleanFile(fullPath)) {
        totalCleaned++;
      }
    }
  }
  return totalCleaned;
}
// Start processing from the project root
const projectRoot = path.join(__dirname, '..');
console.log(`📁 Processing directory: ${projectRoot}`);
const cleanedCount = processDirectory(projectRoot);
console.log(`\n✨ Cleanup complete! Modified ${cleanedCount} files.`);
console.log('🔒 Important console.error and console.warn statements were preserved.');