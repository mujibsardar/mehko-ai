#!/usr/bin/env node
import { execSync } from "child_process";
import { writeFileSync } from "fs";

const issue = process.argv[2] || "Describe the issue here";
const ask = process.argv[3] || "Return root cause + minimal patch.";

const search = (kw) =>
  execSync(`git grep -l "${kw}"`, { stdio: "pipe" }).toString().split("\n").filter(Boolean);

const files = [
  "package.json",
  "python/**/*.py",
  "src/**/*.(js|jsx|ts|tsx)"
];

// Always include basics
let include = files.map(p => ({ path: p, max_lines: 200 }));

// Add keyword hits (example)
["pdf", "overlay", "form"].forEach(kw => {
  search(kw).forEach(f => include.push({ path: f, max_lines: 260 }));
});

const config = {
  issue,
  ask,
  include,
  extra: [
    "git rev-parse --short HEAD",
    "git diff --unified=0"
  ]
};

writeFileSync(".chatgpt/handoff.config.json", JSON.stringify(config, null, 2));
console.log("Wrote config with", include.length, "entries");
