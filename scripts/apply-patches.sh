#!/bin/bash
set -e
jq -r '.choices[0].message.content' agent-output.json > patch.diff
git apply --reject --whitespace=fix patch.diff || true
echo "Patches applied. Check *.rej files if there were conflicts."
