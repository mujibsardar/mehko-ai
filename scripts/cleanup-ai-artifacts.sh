#!/bin/bash

# 🧹 Cleanup AI Artifacts Script
# Cleans up AI development artifacts after post-flight validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/cleanup-ai-artifacts.log"
AI_MODE_FLAG="/tmp/ai-development-mode.active"

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
        *) echo -e "${BLUE}[$level]${NC} $message" ;;
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

log "INFO" "🧹 Starting AI artifacts cleanup..."

echo ""
echo -e "${CYAN}🧹 CLEANING UP AI DEVELOPMENT ARTIFACTS${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG")"
echo ""

# 1. CLEAN UP TEMPORARY FILES
log "INFO" "🗑️ Cleaning up temporary files..."

# Remove temporary monitoring state files
rm -f /tmp/ai-monitor-*-state.* 2>/dev/null || true

# Remove temporary AI development configs
rm -f temp/ai-dev-config.json 2>/dev/null || true
rm -f temp/ai-monitoring-config.json 2>/dev/null || true

echo -e "${GREEN}✅ Temporary files cleaned up${NC}"

# 2. CLEAN UP MONITORING PIDS
log "INFO" "📊 Cleaning up monitoring PIDs..."

# Remove monitoring PID file
rm -f /tmp/ai-monitoring.pid 2>/dev/null || true

echo -e "${GREEN}✅ Monitoring PIDs cleaned up${NC}"

# 3. CLEAN UP GIT HOOKS
log "INFO" "📝 Cleaning up git hooks..."

# Remove AI safety git hooks
if [ -f ".git/hooks/pre-commit" ]; then
    rm -f ".git/hooks/pre-commit"
    echo -e "${GREEN}✅ Git hooks cleaned up${NC}"
else
    echo -e "${YELLOW}⚠️ No git hooks to clean up${NC}"
fi

# 4. CLEAN UP AI MODE FLAG
log "INFO" "🏷️ Cleaning up AI mode flag..."

# Remove AI development mode flag
rm -f "$AI_MODE_FLAG"

echo -e "${GREEN}✅ AI mode flag cleaned up${NC}"

# 5. FINAL CLEANUP VERIFICATION
log "INFO" "✅ Verifying cleanup completion..."

# Check if cleanup was successful
if [ ! -f "$AI_MODE_FLAG" ] && [ ! -f "/tmp/ai-monitoring.pid" ]; then
    echo -e "${GREEN}✅ AI artifacts cleanup completed successfully${NC}"
    echo ""
    echo -e "${BLUE}📋 Cleanup Summary:${NC}"
    echo -e "  • Temporary files: ${GREEN}CLEANED${NC}"
    echo -e "  • Monitoring PIDs: ${GREEN}CLEANED${NC}"
    echo -e "  • Git hooks: ${GREEN}CLEANED${NC}"
    echo -e "  • AI mode flag: ${GREEN}CLEANED${NC}"
    echo ""
    echo -e "${YELLOW}📋 AI Development Mode:${NC}"
    echo -e "  • Status: ${GREEN}DEACTIVATED${NC}"
    echo -e "  • Session: ${GREEN}COMPLETED${NC}"
    echo -e "  • Cleanup: ${GREEN}SUCCESSFUL${NC}"
    echo ""
    
    log "INFO" "AI artifacts cleanup completed successfully"
    log "INFO" "AI development mode deactivated"
    
else
    log "ERROR" "❌ Failed to complete cleanup completely"
    echo -e "${RED}❌ Failed to complete cleanup completely${NC}"
    echo -e "${YELLOW}Some artifacts may still exist${NC}"
    exit 1
fi
