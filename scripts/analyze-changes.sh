#!/bin/bash

# 📊 Analyze Changes Script
# Analyzes all changes made during AI development and generates a comprehensive report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/analyze-changes.log"
AI_MODE_FLAG="/tmp/ai-development-mode.active"
CHECKPOINT_DIR="temp/ai-safety-checkpoints"
CHANGES_REPORT_DIR="logs/ai-safety/changes-reports"
LATEST_CHECKPOINT=""

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$CHANGES_REPORT_DIR"

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

log "INFO" "📊 Starting changes analysis..."

echo ""
echo -e "${CYAN}📊 ANALYZING AI DEVELOPMENT CHANGES${NC}"
echo -e "${CYAN}====================================${NC}"
echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG")"
echo ""

# 1. FIND LATEST CHECKPOINT
log "INFO" "🔍 Finding latest safety checkpoint..."

if [ -d "$CHECKPOINT_DIR" ]; then
    LATEST_CHECKPOINT=$(ls -t "$CHECKPOINT_DIR" | head -1 2>/dev/null || echo "")
    
    if [ -n "$LATEST_CHECKPOINT" ]; then
        echo -e "${GREEN}✅ Found latest checkpoint: $LATEST_CHECKPOINT${NC}"
        log "INFO" "Found latest checkpoint: $LATEST_CHECKPOINT"
    else
        echo -e "${YELLOW}⚠️ No checkpoints found${NC}"
        log "WARN" "No checkpoints found for comparison"
    fi
else
    echo -e "${YELLOW}⚠️ Checkpoint directory not found${NC}"
    log "WARN" "Checkpoint directory not found"
fi

# 2. ANALYZE GIT CHANGES
log "INFO" "📝 Analyzing git changes..."

GIT_CHANGES_REPORT="$CHANGES_REPORT_DIR/git-changes-$(cat "$AI_MODE_FLAG").md"
cat > "$GIT_CHANGES_REPORT" << EOF
# Git Changes Report
**Session ID:** $(cat "$AI_MODE_FLAG")
**Generated:** $(date)
**Checkpoint:** ${LATEST_CHECKPOINT:-"None"}

## Summary
EOF

if [ -d ".git" ]; then
    # Get current git status
    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    echo -e "${BLUE}📝 Current Git State:${NC}"
    echo -e "  • Branch: $CURRENT_BRANCH"
    echo -e "  • Commit: $CURRENT_COMMIT"
    
    # Check for uncommitted changes
    if ! git diff --quiet 2>/dev/null; then
        UNCOMMITTED_COUNT=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
        echo -e "  • Uncommitted changes: $UNCOMMITTED_COUNT files"
        
        # Add to report
        cat >> "$GIT_CHANGES_REPORT" << EOF

## Uncommitted Changes
**Total files modified:** $UNCOMMITTED_COUNT

### Modified Files
EOF
        
        git diff --name-only 2>/dev/null | while read -r file; do
            echo "- \`$file\`" >> "$GIT_CHANGES_REPORT"
        done
        
        # Add diff summary
        cat >> "$GIT_CHANGES_REPORT" << EOF

### Change Summary
\`\`\`bash
git diff --stat
\`\`\`

\`\`\`
$(git diff --stat 2>/dev/null || echo "No diff available")
\`\`\`
EOF
        
        echo -e "${GREEN}✅ Git changes analyzed and logged${NC}"
        log "INFO" "Git changes analyzed: $UNCOMMITTED_COUNT files modified"
        
    else
        echo -e "  • Uncommitted changes: None"
        cat >> "$GIT_CHANGES_REPORT" << EOF

## Uncommitted Changes
**Status:** No uncommitted changes detected
EOF
        
        echo -e "${GREEN}✅ No git changes detected${NC}"
        log "INFO" "No git changes detected"
    fi
    
    # Add commit history
    cat >> "$GIT_CHANGES_REPORT" << EOF

## Recent Commit History
\`\`\`bash
git log --oneline -10
\`\`\`

\`\`\`
$(git log --oneline -10 2>/dev/null || echo "No recent commits")
\`\`\`
EOF
    
else
    echo -e "${YELLOW}⚠️ No git repository found${NC}"
    cat >> "$GIT_CHANGES_REPORT" << EOF

## Git Repository
**Status:** No git repository found
EOF
    
    log "WARN" "No git repository found"
fi

# 3. ANALYZE FILE SYSTEM CHANGES
log "INFO" "📁 Analyzing file system changes..."

FILE_CHANGES_REPORT="$CHANGES_REPORT_DIR/file-changes-$(cat "$AI_MODE_FLAG").md"
cat > "$FILE_CHANGES_REPORT" << EOF
# File System Changes Report
**Session ID:** $(cat "$AI_MODE_FLAG")
**Generated:** $(date)
**Checkpoint:** ${LATEST_CHECKPOINT:-"None"}

## Summary
EOF

if [ -n "$LATEST_CHECKPOINT" ] && [ -f "$CHECKPOINT_DIR/$LATEST_CHECKPOINT/file-manifest.txt" ]; then
    echo -e "${BLUE}📁 Comparing with checkpoint: $LATEST_CHECKPOINT${NC}"
    
    # Create current file manifest
    CURRENT_MANIFEST="/tmp/current-file-manifest.txt"
    find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.sh" -o -name "*.md" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" \) \
        -not -path "./node_modules/*" \
        -not -path "./.git/*" \
        -not -path "./python/venv/*" \
        -not -path "./python/.venv/*" \
        -not -path "./temp/*" \
        -not -path "./logs/*" \
        -not -path "./dist/*" \
        -exec sha256sum {} \; > "$CURRENT_MANIFEST" 2>/dev/null || true
    
    # Compare manifests
    if [ -f "$CURRENT_MANIFEST" ]; then
        CHANGED_FILES=$(diff "$CHECKPOINT_DIR/$LATEST_CHECKPOINT/file-manifest.txt" "$CURRENT_MANIFEST" 2>/dev/null | grep "^>" | wc -l | tr -d ' ')
        MODIFIED_FILES=$(diff "$CHECKPOINT_DIR/$LATEST_CHECKPOINT/file-manifest.txt" "$CURRENT_MANIFEST" 2>/dev/null | grep "^<" | wc -l | tr -d ' ')
        
        echo -e "${BLUE}📊 File Changes Detected:${NC}"
        echo -e "  • New/Modified: $CHANGED_FILES files"
        echo -e "  • Deleted: $MODIFIED_FILES files"
        
        # Add to report
        cat >> "$FILE_CHANGES_REPORT" << EOF

## File Changes Detected
**New/Modified files:** $CHANGED_FILES
**Deleted files:** $MODIFIED_FILES

### Detailed Changes
\`\`\`bash
diff $CHECKPOINT_DIR/$LATEST_CHECKPOINT/file-manifest.txt $CURRENT_MANIFEST
\`\`\`

\`\`\`
$(diff "$CHECKPOINT_DIR/$LATEST_CHECKPOINT/file-manifest.txt" "$CURRENT_MANIFEST" 2>/dev/null || echo "No differences found")
\`\`\`
EOF
        
        echo -e "${GREEN}✅ File system changes analyzed${NC}"
        log "INFO" "File system changes analyzed: $CHANGED_FILES new/modified, $MODIFIED_FILES deleted"
        
        # Clean up
        rm -f "$CURRENT_MANIFEST"
        
    else
        echo -e "${YELLOW}⚠️ Failed to create current file manifest${NC}"
        cat >> "$FILE_CHANGES_REPORT" << EOF

## File Changes Analysis
**Status:** Failed to create current file manifest
EOF
        
        log "ERROR" "Failed to create current file manifest"
    fi
    
else
    echo -e "${YELLOW}⚠️ No checkpoint found for file comparison${NC}"
    cat >> "$FILE_CHANGES_REPORT" << EOF

## File Changes Analysis
**Status:** No checkpoint found for comparison
EOF
    
    log "WARN" "No checkpoint found for file comparison"
fi

# 4. ANALYZE SERVICE CHANGES
log "INFO" "🔧 Analyzing service changes..."

SERVICE_CHANGES_REPORT="$CHANGES_REPORT_DIR/service-changes-$(cat "$AI_MODE_FLAG").md"
cat > "$SERVICE_CHANGES_REPORT" << EOF
# Service Changes Report
**Session ID:** $(cat "$AI_MODE_FLAG")
**Generated:** $(date)
**Checkpoint:** ${LATEST_CHECKPOINT:-"None"}

## Summary
EOF

# Check current service status
echo -e "${BLUE}🔧 Current Service Status:${NC}"

# Python server
PYTHON_STATUS="not_running"
if curl -s "http://localhost:8000/health" >/dev/null 2>&1; then
    PYTHON_STATUS="running"
fi

# Node.js server
FASTAPI_STATUS="not_running"
if curl -s "http://localhost:8000/health" >/dev/null 2>&1; then
    FASTAPI_STATUS="running"
fi

# Caddy Reverse Proxy
CADDY_STATUS="not_running"
if curl -s "http://localhost/health" >/dev/null 2>&1; then
    CADDY_STATUS="running"
fi

echo -e "  • Python server (8000): $PYTHON_STATUS"
echo -e "  • Node.js server (3000): $NODE_STATUS"
echo -e "  • Caddy reverse proxy: $CADDY_STATUS"

# Add to report
cat >> "$SERVICE_CHANGES_REPORT" << EOF

## Current Service Status
| Service | Port | Status |
|---------|------|--------|
| Python FastAPI | 8000 | \`$PYTHON_STATUS\` |
| Node.js Server | 3000 | \`$NODE_STATUS\` |
| Caddy Reverse Proxy | 80/443 | \`$CADDY_STATUS\` |

## Service Health Checks
EOF

# Test each service
for service in "python" "node" "gateway"; do
    case $service in
        "python")
            port=8000
            name="Python FastAPI"
            ;;
        "node")
            port=3000
            name="Node.js Server"
            ;;
        "gateway")
            port=80
            name="Caddy Reverse Proxy"
            ;;
    esac
    
    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
        echo -e "  • $name: ${GREEN}HEALTHY${NC}"
        cat >> "$SERVICE_CHANGES_REPORT" << EOF
### $name (Port $port)
**Status:** Healthy ✅
**Response:** Available
EOF
    else
        echo -e "  • $name: ${RED}UNHEALTHY${NC}"
        cat >> "$SERVICE_CHANGES_REPORT" << EOF
### $name (Port $port)
**Status:** Unhealthy ❌
**Response:** Not available
EOF
    fi
done

echo -e "${GREEN}✅ Service changes analyzed${NC}"
log "INFO" "Service changes analyzed"

# 5. GENERATE COMPREHENSIVE REPORT
log "INFO" "📋 Generating comprehensive changes report..."

COMPREHENSIVE_REPORT="$CHANGES_REPORT_DIR/comprehensive-changes-$(cat "$AI_MODE_FLAG").md"
cat > "$COMPREHENSIVE_REPORT" << EOF
# Comprehensive AI Development Changes Report
**Session ID:** $(cat "$AI_MODE_FLAG")
**Generated:** $(date)
**Checkpoint:** ${LATEST_CHECKPOINT:-"None"}

## Executive Summary
This report summarizes all changes made during AI development session $(cat "$AI_MODE_FLAG").

## Reports Generated
- [Git Changes](./git-changes-$(cat "$AI_MODE_FLAG").md)
- [File System Changes](./file-changes-$(cat "$AI_MODE_FLAG").md)
- [Service Changes](./service-changes-$(cat "$AI_MODE_FLAG").md)

## Key Findings
EOF

# Add key findings based on analysis
if [ -d ".git" ] && ! git diff --quiet 2>/dev/null; then
    UNCOMMITTED_COUNT=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
    cat >> "$COMPREHENSIVE_REPORT" << EOF
- **Git Changes:** $UNCOMMITTED_COUNT files have uncommitted changes
EOF
fi

if [ -n "$LATEST_CHECKPOINT" ]; then
    cat >> "$COMPREHENSIVE_REPORT" << EOF
- **File System:** Changes detected compared to checkpoint $LATEST_CHECKPOINT
EOF
fi

cat >> "$COMPREHENSIVE_REPORT" << EOF
- **Services:** Current service health status documented

## Recommendations
1. Review all changes before committing
2. Test affected functionality
3. Update documentation if needed
4. Consider creating a new checkpoint

## Next Steps
1. Review detailed reports above
2. Test system functionality
3. Commit changes if appropriate
4. Run post-flight validation: \`./scripts/ai-safety-protocol.sh --post-flight\`

---
*Report generated by AI Safety Protocol*
EOF

echo -e "${GREEN}✅ Comprehensive changes report generated${NC}"
log "INFO" "Comprehensive changes report generated"

# 6. FINAL SUMMARY
echo ""
echo -e "${GREEN}✅ Changes analysis completed successfully${NC}"
echo ""
echo -e "${BLUE}📋 Generated Reports:${NC}"
echo -e "  • Git Changes: ${GREEN}$GIT_CHANGES_REPORT${NC}"
echo -e "  • File System: ${GREEN}$FILE_CHANGES_REPORT${NC}"
echo -e "  • Service Status: ${GREEN}$SERVICE_CHANGES_REPORT${NC}"
echo -e "  • Comprehensive: ${GREEN}$COMPREHENSIVE_REPORT${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "1. Review the generated reports"
echo -e "2. Test any affected functionality"
echo -e "3. Commit changes if appropriate"
echo -e "4. Run post-flight validation"
echo ""
echo -e "${YELLOW}📋 To view reports:${NC}"
echo -e "   open $CHANGES_REPORT_DIR"
echo ""

log "INFO" "Changes analysis completed successfully"
log "INFO" "Generated 4 detailed reports"
