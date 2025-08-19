#!/bin/bash
set -e

# Build a combined patch from either:
#  A) chat completion shape (.choices[0].message.content -> JSON string)
#  B) merged output shape ({ "patches": [...] })
jq -r '
  if has("choices") then
    .choices[0].message.content | fromjson | .patches
  else
    .patches
  end
  # keep only valid unified_diffs
  | map(select(.unified_diff and (.unified_diff|type=="string") and (.unified_diff|length>0)) | .unified_diff)
  | .[]
' agent-output.json > patch.diff || { echo "Failed to extract diffs"; exit 1; }

if [ ! -s patch.diff ]; then
  echo "No valid patches found in agent-output.json"
  exit 0
fi

echo "Applying patches..."
git apply --reject --whitespace=fix patch.diff || true

# Report any rejects
rej_count=$(find . -name "*.rej" | wc -l | tr -d ' ')
if [ "$rej_count" != "0" ]; then
  echo "⚠️  $rej_count hunks rejected. See *.rej files to resolve manually."
else
  echo "✅ All patches applied cleanly."
fi
