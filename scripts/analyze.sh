#!/bin/bash
set -euo pipefail

echo "======================================="
echo "🚀 Analyzer Script Starting"
echo "======================================="

# Show latest changed files
echo
echo "=== Changed files (last commit) ==="
git diff --name-only HEAD~1 HEAD -- 'src/**.js*' 'src/**.ts*' || true

# Run ESLint with auto-fix first
echo
echo "=== ESLint (auto-fix pass) ==="
npx eslint "src/**/*.{js,jsx,ts,tsx}" --fix || true

# Run ESLint again (report only)
echo
echo "=== ESLint (post-fix report) ==="
npx eslint "src/**/*.{js,jsx,ts,tsx}" || true

# Run Vitest with summary
echo
echo "=== Vitest ==="
npx vitest run --reporter=dot --passWithNoTests || true

# Count problems left
echo
echo "=== Summary ==="
eslint_errors=$(npx eslint "src/**/*.{js,jsx,ts,tsx}" -f json | jq 'map(.errorCount + .warningCount) | add')
echo "Remaining ESLint problems: ${eslint_errors:-0}"

rej_count=$(find . -name "*.rej" | wc -l | tr -d ' ')
echo "Rejected patches (*.rej): $rej_count"

if [ "$eslint_errors" -eq 0 ] && [ "$rej_count" -eq 0 ]; then
  echo "✅ Clean run: no lint errors, no rejects."
else
  echo "⚠️ Issues remain. Fix manually or re-run agent."
fi

echo "======================================="
echo "🏁 Analyzer Script Finished"
echo "======================================="
