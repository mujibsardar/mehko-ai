#!/bin/bash
# AI Safety Pre-commit Hook
# This script runs basic safety checks before allowing commits

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🤖 AI Safety: Pre-commit validation..."

# Check if we're in AI development mode
if [ -f "temp/ai-mode-flag" ]; then
    echo -e "${BLUE}📋 AI Development Mode: ACTIVE${NC}"
    SESSION_ID=$(cat "temp/ai-mode-flag")
    echo -e "${BLUE}📋 Session ID: $SESSION_ID${NC}"
else
    echo -e "${YELLOW}⚠️  AI Development Mode: NOT ACTIVE${NC}"
fi

# Basic file safety checks
echo "🔍 Running basic safety checks..."

# Check for any temporary or debug files
if git diff --cached --name-only | grep -E "\.(tmp|temp|log|debug)" > /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: Temporary/debug files detected in commit${NC}"
fi

# Check for large files (>10MB)
LARGE_FILES=$(git diff --cached --name-only | xargs -I {} ls -la {} 2>/dev/null | awk '$5 > 10485760 {print $9}')
if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠️  Warning: Large files detected (>10MB)${NC}"
    echo "$LARGE_FILES"
fi

# Check for sensitive files
SENSITIVE_FILES=$(git diff --cached --name-only | grep -E "(\.env|\.key|\.pem|\.p12|\.pfx|password|secret|token)" || true)
if [ -n "$SENSITIVE_FILES" ]; then
    echo -e "${RED}❌ ERROR: Potentially sensitive files detected in commit${NC}"
    echo "$SENSITIVE_FILES"
    echo -e "${RED}Please review these files before committing${NC}"
    exit 1
fi

# Check for AI safety rule violations
echo "📋 Checking AI safety rules..."

# Ensure AI rules are present
if [ ! -f ".cursor/rules/README.md" ]; then
    echo -e "${YELLOW}⚠️  Warning: AI rules directory not found${NC}"
fi

# Check if changes include documentation updates for significant changes
SIGNIFICANT_CHANGES=$(git diff --cached --name-only | grep -E "(\.js|\.jsx|\.ts|\.tsx|\.py|\.sh)" | grep -v "node_modules" | grep -v "\.test\." || true)
if [ -n "$SIGNIFICANT_CHANGES" ]; then
    DOC_CHANGES=$(git diff --cached --name-only | grep -E "(\.md|docs/)" || true)
    if [ -z "$DOC_CHANGES" ]; then
        echo -e "${YELLOW}⚠️  Warning: Code changes detected but no documentation updates${NC}"
        echo -e "${YELLOW}Consider updating relevant documentation${NC}"
    fi
fi

echo -e "${GREEN}✅ Pre-commit safety checks passed${NC}"

# Log the commit attempt
if [ -f "temp/ai-mode-flag" ]; then
    LOG_FILE="logs/ai-safety/ai-development-$SESSION_ID.log"
    echo "$(date): Pre-commit validation passed for commit" >> "$LOG_FILE"
fi

echo -e "${GREEN}🚀 Commit can proceed${NC}"
exit 0
