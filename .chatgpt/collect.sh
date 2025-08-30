#!/usr/bin/env bash
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CFG="$ROOT/.chatgpt/handoff.config.json"
OUT="$ROOT/.chatgpt/handoff.md"
RULES="$ROOT/.chatgpt/redact.rules"

strip() {
  if [ -f "$RULES" ]; then
    tmpfile="$(mktemp)"
    cat > "$tmpfile"   # capture stdin to a temp file
    # Apply each non-empty, non-comment rule safely
    while IFS= read -r rule; do
      # skip blanks and comments
      [[ -z "$rule" || "$rule" =~ ^[[:space:]]*# ]] && continue
      # apply rule, replacing matches with [REDACTED]
      perl -0777 -pe "s/$rule/[REDACTED]/g" -i "$tmpfile"
    done < "$RULES"
    cat "$tmpfile"
    rm -f "$tmpfile"
  else
    cat
  fi
}

ISSUE=$(jq -r .issue "$CFG"); ASK=$(jq -r .ask "$CFG")

{
  echo "# Handoff"
  echo "**Issue:** $ISSUE"
  echo "**Ask:** $ASK"
  echo -e "\n## Repro"
  if [ -f "$ROOT/.chatgpt/repro.sh" ]; then
    echo '```bash'; sed -n '1,200p' "$ROOT/.chatgpt/repro.sh"; echo '```'
  else
    echo "_Add .chatgpt/repro.sh_"
  fi
  echo -e "\n## Env & Checks"
} > "$OUT"

# ✅ Preserve full commands (no word-splitting)
while IFS= read -r cmd; do
  [ -z "$cmd" ] && continue
  {
    echo '```bash'
    echo "$ $cmd"
    bash -lc "$cmd" 2>&1 | head -n 200
    echo '```'
  } >> "$OUT"
done < <(jq -r '.extra[]?' "$CFG")

echo -e "\n## Key files (truncated)\n" >> "$OUT"
jq -c '.include[]' "$CFG" | while read -r spec; do
  P=$(jq -r .path <<<"$spec"); L=$(jq -r .max_lines <<<"$spec")
  git ls-files -- "$P" | while read -r f; do
    {
      printf "\n**%s** (first %s lines)\n" "$f" "$L"
      echo '```'
      sed -n "1,${L}p" "$f" | strip
      echo '```'
    } >> "$OUT"
  done
done

echo "Wrote $OUT"
