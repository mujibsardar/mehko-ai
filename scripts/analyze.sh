#!/bin/bash
set -e
echo "=== Changed files ==="
git diff --name-only HEAD~1 HEAD -- 'src/**.js*' 'src/**.ts*'
echo
echo "=== ESLint ==="
npx eslint src || true
echo
echo "=== Tests ==="
npx vitest run || true
