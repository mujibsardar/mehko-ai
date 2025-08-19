#!/bin/bash
set -euo pipefail

OUT_FILE="agent-output/agent-output.json"
PATCH_DIR="agent-output/patches"

mkdir -p "$PATCH_DIR"
rm -f "$PATCH_DIR"/*.patch

# Split patches per file
jq -c '
  if has("choices") then
    .choices[0].message.content | fromjson | .patches
  else
    .patches
  end
  | map(select(.path and .unified_diff))
  | .[]
' "$OUT_FILE" | while read -r patch; do
  path=$(echo "$patch" | jq -r .path)
  diff=$(echo "$patch" | jq -r .unified_diff)

  safe_name=$(echo "$path" | sed 's#[/ ]#_#g')
  patch_file="$PATCH_DIR/$safe_name.patch"

  {
    echo "diff --git a/$path b/$path"
    echo "--- a/$path"
    echo "+++ b/$path"
    echo "$diff"
  } > "$patch_file"
done

echo "Applying patches sequentially..."
ok=0
fail=0
for f in "$PATCH_DIR"/*.patch; do
  echo "→ $f"
  if git apply --3way --whitespace=fix "$f"; then
    ((ok++))
  else
    echo "⚠️  $f failed, falling back to --reject"
    git apply --reject --whitespace=fix "$f" || true
    ((fail++))
  fi
done

echo "✅ $ok applied, ⚠️ $fail failed"
./scripts/analyze.sh
