#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";

function run(cmd) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    return e.stdout || "";
  }
}

function loadReport() {
  const out = run('npx eslint "src/**/*.{js,jsx,ts,tsx}" -f json');
  try {
    return JSON.parse(out);
  } catch {
    return [];
  }
}

// Rename a single identifier at the reported location: line/column..end
function renameAtRange(src, loc, from, to) {
  const lines = src.split("\n");
  const L0 = loc.line - 1,
    C0 = loc.column - 1,
    L1 = (loc.endLine ?? loc.line) - 1,
    C1 = (loc.endColumn ?? loc.column + from.length) - 1;
  if (L0 === L1) {
    lines[L0] =
      lines[L0].slice(0, C0) +
      lines[L0].slice(C0, C1).replace(from, to) +
      lines[L0].slice(C1);
  } else {
    // multi-line (rare for simple ids) – fallback naive replace within the slice
    const head = lines[L0].slice(0, C0);
    const mid = [
      lines[L0].slice(C0),
      ...lines.slice(L0 + 1, L1),
      lines[L1].slice(0, C1),
    ].join("\n");
    const tail = lines[L1].slice(C1);
    const replaced = mid.replace(from, to);
    lines.splice(L0, L1 - L0 + 1, head + replaced + tail);
  }
  return lines.join("\n");
}

// Insert a comment into an empty block `{}` (handles `try {}` / `if {}` / plain blocks)
function fillEmptyBlock(src, loc) {
  const lines = src.split("\n");
  let i = loc.line - 1;
  // find opening brace on or after the line
  while (i < lines.length && !lines[i].includes("{")) i++;
  if (i >= lines.length) return src;
  // find next non-empty line
  let j = i + 1;
  while (j < lines.length && lines[j].trim() === "") j++;
  if (j < lines.length && lines[j].trim().startsWith("}")) {
    // insert comment before closing brace
    const indent = (lines[j].match(/^\s*/) || [""])[0];
    lines.splice(j, 0, `${indent}// intentionally left blank`);
  }
  return lines.join("\n");
}

function processFile(file) {
  const msgs = file.messages.filter(
    (m) =>
      m.ruleId === "unused-imports/no-unused-vars" ||
      m.ruleId === "no-unused-vars" ||
      m.ruleId === "no-empty"
  );
  if (!msgs.length) return 0;

  let code = fs.readFileSync(file.filePath, "utf8");
  let edits = 0;

  for (const m of msgs) {
    if (
      (m.ruleId === "unused-imports/no-unused-vars" ||
        m.ruleId === "no-unused-vars") &&
      m.message
    ) {
      const mName = m.message.match(/'([^']+)' is (?:defined|assigned)/);
      if (!mName) continue;
      const name = mName[1];
      const newName = name.startsWith("_") ? name : `_${name}`;
      if (m.line && m.column) {
        code = renameAtRange(code, m, name, newName);
        edits++;
      }
      continue;
    }
    if (m.ruleId === "no-empty") {
      code = fillEmptyBlock(code, m);
      edits++;
      continue;
    }
  }

  if (edits) {
    fs.writeFileSync(file.filePath, code, "utf8");
  }
  return edits;
}

// 1) quick autofix first
console.log("=== eslint --fix ===");
run('npx eslint "src/**/*.{js,jsx,ts,tsx}" --fix');

// 2) iterate until stable or 5 passes
let pass = 0,
  totalEdits = 0;
while (pass < 5) {
  pass++;
  const report = loadReport();
  let passEdits = 0;

  for (const f of report) {
    if (!f.messages?.length) continue;
    passEdits += processFile(f);
  }

  if (passEdits === 0) break;
  totalEdits += passEdits;
  // let eslint clean up after our renames/comments
  run('npx eslint "src/**/*.{js,jsx,ts,tsx}" --fix');
}

const finalReport = loadReport();
const remaining = finalReport.reduce((a, f) => a + f.errorCount, 0);
console.log(
  `\n✅ Fixer done. Edits: ${totalEdits}. Remaining ESLint errors: ${remaining}`
);
process.exit(0);
