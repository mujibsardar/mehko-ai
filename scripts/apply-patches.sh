#!/bin/bash
set -euo pipefail

OUT_FILE="agent-output/agent-output.json"
PATCH_FILE="agent-output/patch.diff"

# Extract unified diffs from agent-output.json
jq -r '
  if has("choices") then
    .choices[0].message.content | fromjson | .patches
  else
    .patches
  end
  | map(select(.unified_diff and (.unified_diff|type=="string") and (.unified_diff|length>0)) | .unified_diff)
  | .[]
' "$OUT_FILE" > "$PATCH_FILE" || { echo "❌ Failed to extract diffs"; exit 1; }

if [ ! -s "$PATCH_FILE" ]; then
  echo "⚠️  No valid patches found in $OUT_FILE"
  exit 0
fi

echo "Applying patches with 3-way merge..."
if ! git apply --3way --whitespace=fix "$PATCH_FILE"; then
  echo "⚠️  Some hunks failed with 3-way. Falling back to reject mode..."
  git apply --reject --whitespace=fix "$PATCH_FILE" || true
fi

# Check for rejects
rej_count=$(find . -name "*.rej" | wc -l | tr -d ' ')
if [ "$rej_count" != "0" ]; then
  echo "⚠️  $rej_count hunks rejected. Check *.rej files."
else
  echo "✅ All patches applied cleanly."
fi

# Run analyzer at the end
echo
./scripts/analyze.sh
