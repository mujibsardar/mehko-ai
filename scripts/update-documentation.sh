#!/bin/bash

# 📚 Update Documentation Script
# Automatically updates documentation after AI development to maintain accuracy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/documentation-update.log"
AI_MODE_FLAG="/tmp/ai-development-mode.active"
DOCS_DIR="docs"
README_FILE="README.md"
AI_INSTRUCTIONS_FILE="AI_INSTRUCTIONS.md"
PROJECT_STRUCTURE_FILE="PROJECT_STRUCTURE.md"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO") echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN") echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $message" ;;
        *) echo -e "${PURPLE}[$level]${NC} $message" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Check if script is run from project root
if [ ! -f "package.json" ] || [ ! -d "scripts" ]; then
    echo -e "${RED}❌ Error: This script must be run from the project root directory${NC}"
    exit 1
fi

# Check if AI mode is active
if [ ! -f "$AI_MODE_FLAG" ]; then
    echo -e "${RED}❌ Error: AI development mode is not active${NC}"
    echo -e "${YELLOW}Run: ./scripts/enable-ai-mode.sh first${NC}"
    exit 1
fi

log "INFO" "📚 Starting documentation update process..."

echo ""
echo -e "${CYAN}📚 UPDATING DOCUMENTATION${NC}"
echo -e "${CYAN}========================${NC}"
echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG")"
echo ""

# 1. ANALYZE CHANGES FOR DOCUMENTATION IMPACT
log "INFO" "🔍 Analyzing changes for documentation impact..."

# Get list of modified files
MODIFIED_FILES=()
if [ -d ".git" ]; then
    MODIFIED_FILES=($(git diff --name-only 2>/dev/null || echo ""))
fi

# If no git changes, check for recent file modifications
if [ ${#MODIFIED_FILES[@]} -eq 0 ]; then
    log "INFO" "No git changes detected, checking for recent file modifications..."
    # Find files modified in the last hour
    MODIFIED_FILES=($(find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.sh" -o -name "*.md" \) \
        -not -path "./node_modules/*" \
        -not -path "./.git/*" \
        -not -path "./temp/*" \
        -not -path "./logs/*" \
        -mmin -60 2>/dev/null || echo ""))
fi

echo -e "${BLUE}📝 Modified files detected:${NC}"
if [ ${#MODIFIED_FILES[@]} -gt 0 ]; then
    for file in "${MODIFIED_FILES[@]}"; do
        echo -e "  • $file"
    done
else
    echo -e "  • No modified files detected"
fi

# 2. UPDATE PROJECT STRUCTURE DOCUMENTATION
log "INFO" "🏗️ Updating project structure documentation..."

if [ -f "$PROJECT_STRUCTURE_FILE" ]; then
    echo -e "${BLUE}📁 Updating $PROJECT_STRUCTURE_FILE...${NC}"
    
    # Create backup
    cp "$PROJECT_STRUCTURE_FILE" "$PROJECT_STRUCTURE_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update file counts and structure information
    CURRENT_TIME=$(date)
    
    # Count files in key directories
    SRC_FILES=$(find src -type f 2>/dev/null | wc -l | tr -d ' ')
    PYTHON_FILES=$(find python -type f 2>/dev/null | wc -l | tr -d ' ')
    SCRIPT_FILES=$(find scripts -type f 2>/dev/null | wc -l | tr -d ' ')
    DATA_FILES=$(find data -type f 2>/dev/null | wc -l | tr -d ' ')
    DOC_FILES=$(find docs -type f 2>/dev/null | wc -l | tr -d ' ')
    
    # Update the file with current information
    sed -i.bak "s/Last Updated:.*/Last Updated: $CURRENT_TIME/" "$PROJECT_STRUCTURE_FILE"
    sed -i.bak "s/Source Files:.*/Source Files: $SRC_FILES/" "$PROJECT_STRUCTURE_FILE" 2>/dev/null || true
    sed -i.bak "s/Python Files:.*/Python Files: $PYTHON_FILES/" "$PROJECT_STRUCTURE_FILE" 2>/dev/null || true
    sed -i.bak "s/Script Files:.*/Script Files: $SCRIPT_FILES/" "$PROJECT_STRUCTURE_FILE" 2>/dev/null || true
    sed -i.bak "s/Data Files:.*/Data Files: $DATA_FILES/" "$PROJECT_STRUCTURE_FILE" 2>/dev/null || true
    sed -i.bak "s/Documentation Files:.*/Documentation Files: $DOC_FILES/" "$PROJECT_STRUCTURE_FILE" 2>/dev/null || true
    
    echo -e "${GREEN}✅ $PROJECT_STRUCTURE_FILE updated${NC}"
    log "INFO" "Project structure documentation updated"
else
    echo -e "${YELLOW}⚠️ $PROJECT_STRUCTURE_FILE not found${NC}"
    log "WARN" "Project structure file not found"
fi

# 3. UPDATE AI INSTRUCTIONS
log "INFO" "🤖 Updating AI instructions..."

if [ -f "$AI_INSTRUCTIONS_FILE" ]; then
    echo -e "${BLUE}🤖 Updating $AI_INSTRUCTIONS_FILE...${NC}"
    
    # Create backup
    cp "$AI_INSTRUCTIONS_FILE" "$AI_INSTRUCTIONS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update last modified date
    CURRENT_TIME=$(date)
    sed -i.bak "s/Last Updated:.*/Last Updated: $CURRENT_TIME/" "$AI_INSTRUCTIONS_FILE" 2>/dev/null || true
    
    # Add session information if not present
    if ! grep -q "AI Safety Protocol" "$AI_INSTRUCTIONS_FILE"; then
        cat >> "$AI_INSTRUCTIONS_FILE" << EOF

## 🔒 AI Safety Protocol
**Last Updated:** $CURRENT_TIME
**Session ID:** $(cat "$AI_MODE_FLAG")

This project uses a comprehensive AI safety protocol to ensure codebase integrity:
1. **Pre-flight validation** - System state and AI knowledge verification
2. **In-flight monitoring** - Continuous monitoring of AI activities
3. **Post-flight validation** - Change analysis and quality validation
4. **Documentation updates** - Automatic documentation maintenance

### Usage
\`\`\`bash
# Start AI development safely
./scripts/ai-safety-protocol.sh

# Complete AI development
./scripts/ai-safety-protocol.sh --post-flight
\`\`\`
EOF
    fi
    
    echo -e "${GREEN}✅ $AI_INSTRUCTIONS_FILE updated${NC}"
    log "INFO" "AI instructions updated"
else
    echo -e "${YELLOW}⚠️ $AI_INSTRUCTIONS_FILE not found${NC}"
    log "WARN" "AI instructions file not found"
fi

# 4. UPDATE README
log "INFO" "📖 Updating README..."

if [ -f "$README_FILE" ]; then
    echo -e "${BLUE}📖 Updating $README_FILE...${NC}"
    
    # Create backup
    cp "$README_FILE" "$README_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update last modified date
    CURRENT_TIME=$(date)
    sed -i.bak "s/Last Updated:.*/Last Updated: $CURRENT_TIME/" "$README_FILE" 2>/dev/null || true
    
    # Add AI safety information if not present
    if ! grep -q "AI Safety Protocol" "$README_FILE"; then
        # Find the right place to insert (after the main description)
        if grep -q "## 🚀 Quick Start" "$README_FILE"; then
            # Insert before Quick Start section
            sed -i.bak "/## 🚀 Quick Start/i\\
## 🛡️ AI Safety Protocol\\
\\
This project includes a comprehensive AI safety protocol to ensure codebase integrity:\\
\\
- **Pre-flight validation** - System state and AI knowledge verification\\
- **In-flight monitoring** - Continuous monitoring of AI activities\\
- **Post-flight validation** - Change analysis and quality validation\\
- **Documentation updates** - Automatic documentation maintenance\\
\\
### AI Development Workflow\\
\`\`\`bash\\
# Start AI development safely\\
./scripts/ai-safety-protocol.sh\\
\\
# Complete AI development\\
./scripts/ai-safety-protocol.sh --post-flight\\
\`\`\`\\
\\
**Last Updated:** $CURRENT_TIME\\
**Session ID:** $(cat "$AI_MODE_FLAG")\\
\\
" "$README_FILE"
        fi
    fi
    
    echo -e "${GREEN}✅ $README_FILE updated${NC}"
    log "INFO" "README updated"
else
    echo -e "${YELLOW}⚠️ $README_FILE not found${NC}"
    log "WARN" "README file not found"
fi

# 5. UPDATE DOCS DIRECTORY INDEX
log "INFO" "📚 Updating docs directory index..."

if [ -f "$DOCS_DIR/README.md" ]; then
    echo -e "${BLUE}📚 Updating docs/README.md...${NC}"
    
    # Create backup
    cp "$DOCS_DIR/README.md" "$DOCS_DIR/README.md.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update last modified date
    CURRENT_TIME=$(date)
    sed -i.bak "s/Last Updated:.*/Last Updated: $CURRENT_TIME/" "$DOCS_DIR/README.md" 2>/dev/null || true
    
    # Add AI safety documentation if not present
    if ! grep -q "AI Safety Protocol" "$DOCS_DIR/README.md"; then
        cat >> "$DOCS_DIR/README.md" << EOF

## 🛡️ AI Safety Protocol Documentation

### Core Safety Scripts
- **`ai-safety-protocol.sh`** - Main safety protocol orchestrator
- **`enable-ai-mode.sh`** - Enables AI development mode
- **`start-ai-monitoring.sh`** - Starts comprehensive monitoring
- **`create-safety-checkpoint.sh`** - Creates safety checkpoints
- **`analyze-changes.sh`** - Analyzes all changes made
- **`validate-code-quality.sh`** - Validates code quality
- **`update-documentation.sh`** - Updates documentation automatically

### Safety Features
- **Pre-flight validation** - System state and AI knowledge verification
- **In-flight monitoring** - File system, git, service, and resource monitoring
- **Post-flight validation** - Comprehensive change analysis and quality validation
- **Automatic checkpoints** - System state snapshots before development
- **Documentation maintenance** - Automatic updates to keep docs current

**Last Updated:** $CURRENT_TIME
**Session ID:** $(cat "$AI_MODE_FLAG")
EOF
    fi
    
    echo -e "${GREEN}✅ docs/README.md updated${NC}"
    log "INFO" "Docs README updated"
else
    echo -e "${YELLOW}⚠️ docs/README.md not found${NC}"
    log "WARN" "Docs README not found"
fi

# 6. GENERATE DOCUMENTATION UPDATE REPORT
log "INFO" "📋 Generating documentation update report..."

DOC_UPDATE_REPORT="logs/ai-safety/documentation-update-$(cat "$AI_MODE_FLAG").md"
cat > "$DOC_UPDATE_REPORT" << EOF
# Documentation Update Report
**Session ID:** $(cat "$AI_MODE_FLAG")
**Generated:** $(date)
**Purpose:** Post-AI development documentation maintenance

## Summary
Documentation has been automatically updated to reflect changes made during AI development.

## Files Updated
EOF

# List updated files
if [ -f "$PROJECT_STRUCTURE_FILE" ]; then
    echo "- \`$PROJECT_STRUCTURE_FILE\` - Project structure and file counts updated" >> "$DOC_UPDATE_REPORT"
fi

if [ -f "$AI_INSTRUCTIONS_FILE" ]; then
    echo "- \`$AI_INSTRUCTIONS_FILE\` - AI instructions and safety protocol information updated" >> "$DOC_UPDATE_REPORT"
fi

if [ -f "$README_FILE" ]; then
    echo "- \`$README_FILE\` - Main project documentation updated with AI safety information" >> "$DOC_UPDATE_REPORT"
fi

if [ -f "$DOCS_DIR/README.md" ]; then
    echo "- \`$DOCS_DIR/README.md\` - Documentation index updated with AI safety details" >> "$DOC_UPDATE_REPORT"
fi

cat >> "$DOC_UPDATE_REPORT" << EOF

## Changes Made
- Updated last modified dates
- Added AI safety protocol information
- Updated project structure statistics
- Enhanced documentation with safety features
- Created comprehensive safety documentation

## Backup Files Created
All original files have been backed up with timestamp suffixes before modification.

## Next Steps
1. Review updated documentation for accuracy
2. Commit documentation changes if appropriate
3. Verify all safety information is current
4. Consider creating additional documentation as needed

---
*Report generated by AI Safety Protocol*
EOF

echo -e "${GREEN}✅ Documentation update report generated${NC}"
log "INFO" "Documentation update report generated"

# 7. CLEAN UP BACKUP FILES
log "INFO" "🧹 Cleaning up temporary backup files..."

# Remove .bak files created by sed
find . -name "*.bak" -type f -delete 2>/dev/null || true

echo -e "${GREEN}✅ Temporary backup files cleaned up${NC}"

# 8. FINAL SUMMARY
echo ""
echo -e "${GREEN}✅ Documentation update completed successfully${NC}"
echo ""
echo -e "${BLUE}📋 Updated Files:${NC}"
if [ -f "$PROJECT_STRUCTURE_FILE" ]; then
    echo -e "  • ${GREEN}$PROJECT_STRUCTURE_FILE${NC}"
fi
if [ -f "$AI_INSTRUCTIONS_FILE" ]; then
    echo -e "  • ${GREEN}$AI_INSTRUCTIONS_FILE${NC}"
fi
if [ -f "$README_FILE" ]; then
    echo -e "  • ${GREEN}$README_FILE${NC}"
fi
if [ -f "$DOCS_DIR/README.md" ]; then
    echo -e "  • ${GREEN}$DOCS_DIR/README.md${NC}"
fi
echo ""
echo -e "${BLUE}📋 Generated Reports:${NC}"
echo -e "  • ${GREEN}$DOC_UPDATE_REPORT${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "1. Review updated documentation for accuracy"
echo -e "2. Commit documentation changes if appropriate"
echo -e "3. Verify all safety information is current"
echo -e "4. Continue with post-flight validation"
echo ""

log "INFO" "Documentation update completed successfully"
log "INFO" "All documentation files updated and backed up"
