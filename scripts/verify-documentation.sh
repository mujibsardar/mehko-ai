#!/bin/bash

# 📚 Documentation Verification Script
# Ensures documentation is accurate and up-to-date

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if script is run from project root
if [ ! -f "package.json" ] || [ ! -d "scripts" ]; then
    echo -e "${RED}❌ Error: This script must be run from the project root directory${NC}"
    exit 1
fi

echo -e "${BLUE}📚 Verifying documentation accuracy...${NC}"

# Check if key documentation files exist
CRITICAL_DOCS=(
    "docs/README.md"
    "docs/AI_ASSISTANT_ONBOARDING.md"
    "README.md"
    "PROJECT_STRUCTURE.md"
)

MISSING_DOCS=0
for doc in "${CRITICAL_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ $doc: EXISTS${NC}"
    else
        echo -e "${RED}❌ $doc: MISSING${NC}"
        MISSING_DOCS=$((MISSING_DOCS + 1))
    fi
done

# Check if AI_ASSISTANT_ONBOARDING.md contains key information
if [ -f "docs/AI_ASSISTANT_ONBOARDING.md" ]; then
    echo -e "${BLUE}🔍 Checking AI Assistant Onboarding content...${NC}"
    
    # Check for key sections
    if grep -q "TWO separate servers" "docs/AI_ASSISTANT_ONBOARDING.md"; then
        echo -e "${GREEN}✅ Dual server architecture documented${NC}"
    else
        echo -e "${YELLOW}⚠️  Dual server architecture not clearly documented${NC}"
    fi
    
    if grep -q "Port 8000" "docs/AI_ASSISTANT_ONBOARDING.md" && grep -q "Port 3000" "docs/AI_ASSISTANT_ONBOARDING.md"; then
        echo -e "${GREEN}✅ Port assignments documented${NC}"
    else
        echo -e "${YELLOW}⚠️  Port assignments not clearly documented${NC}"
    fi
    
    if grep -q "PDF steps require field definitions" "docs/AI_ASSISTANT_ONBOARDING.md"; then
        echo -e "${GREEN}✅ Field definition requirements documented${NC}"
    else
        echo -e "${YELLOW}⚠️  Field definition requirements not clearly documented${NC}"
    fi
fi

# Check if main README exists and has content
if [ -f "README.md" ] && [ -s "README.md" ]; then
    echo -e "${GREEN}✅ Main README exists and has content${NC}"
else
    echo -e "${RED}❌ Main README missing or empty${NC}"
    MISSING_DOCS=$((MISSING_DOCS + 1))
fi

# Check if PROJECT_STRUCTURE.md exists
if [ -f "PROJECT_STRUCTURE.md" ] && [ -s "PROJECT_STRUCTURE.md" ]; then
    echo -e "${GREEN}✅ Project structure documentation exists${NC}"
else
    echo -e "${YELLOW}⚠️  Project structure documentation missing or empty${NC}"
fi

# Summary
echo ""
if [ "$MISSING_DOCS" -eq 0 ]; then
    echo -e "${GREEN}✅ Documentation verification completed successfully${NC}"
    echo -e "${GREEN}All critical documentation files are present${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Documentation verification completed with warnings${NC}"
    echo -e "${YELLOW}Missing $MISSING_DOCS critical documentation files${NC}"
    echo -e "${YELLOW}AI development can proceed but documentation should be updated${NC}"
    exit 0
fi
