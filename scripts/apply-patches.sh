#!/bin/bash
set -e

OUT_FILE="agent-output/agent-output.json"

# Extract unified diffs
jq -r '
  if has("choices") then
    .choices[0].message.content | fromjson | .patches
  else
    .patches
  end
  | map(select(.unified_diff and (.unified_diff|type=="string") and (.unified_diff|length>0)) | .unified_diff)
  | .[]
' "$OUT_FILE" > agent-output/patch.diff || { echo "Failed to extract diffs"; exit 1; }

if [ ! -s agent-output/patch.diff ]; then
  echo "⚠️  No valid patches found in $OUT_FILE"
  exit 0
fi

echo "Applying patches..."
git apply --reject --whitespace=fix agent-output/patch.diff || true

rej_count=$(find . -name "*.rej" | wc -l | tr -d ' ')
if [ "$rej_count" != "0" ]; then
  echo "⚠️  $rej_count hunks rejected. Check *.rej files."
else
  echo "✅ All patches applied cleanly."
fi
