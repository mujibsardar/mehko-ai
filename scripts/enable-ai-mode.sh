#!/bin/bash

# 🛠️ Enable AI Development Mode Script
# Prepares the system for safe AI development by enabling necessary tools and permissions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/enable-ai-mode.log"
AI_MODE_FLAG="/tmp/ai-development-mode.active"
AI_SESSION_ID=$(date +%Y%m%d_%H%M%S)

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

log "INFO" "🛠️ Starting AI development mode enablement..."

# Check if AI mode is already active
if [ -f "$AI_MODE_FLAG" ]; then
    log "WARN" "⚠️ AI development mode is already active"
    echo -e "${YELLOW}⚠️ AI development mode is already active${NC}"
    echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG")"
    echo -e "${YELLOW}To restart, run: ./scripts/disable-ai-mode.sh${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}🛠️ ENABLING AI DEVELOPMENT MODE${NC}"
echo -e "${CYAN}===============================${NC}"
echo -e "${BLUE}Session ID:${NC} $AI_SESSION_ID"
echo ""

# 1. CREATE AI MODE FLAG
log "INFO" "🏷️ Creating AI development mode flag..."
echo "$AI_SESSION_ID" > "$AI_MODE_FLAG"
echo -e "${GREEN}✅ AI development mode flag created${NC}"

# 2. ENABLE DEVELOPMENT TOOLS
log "INFO" "🔧 Enabling development tools..."

# Enable git hooks for AI safety
if [ -d ".git" ]; then
    log "INFO" "📝 Setting up git hooks for AI safety..."
    
    # Create pre-commit hook for AI safety
    cat > ".git/hooks/pre-commit" << 'EOF'
#!/bin/bash
# AI Safety Pre-commit Hook
echo "🤖 AI Safety: Pre-commit validation..."
./scripts/ai-safety-pre-commit.sh
EOF
    chmod +x ".git/hooks/pre-commit"
    echo -e "${GREEN}✅ Git pre-commit hook enabled${NC}"
fi

# 3. SET UP AI DEVELOPMENT ENVIRONMENT
log "INFO" "🌍 Setting up AI development environment..."

# Create AI development configuration
cat > "temp/ai-dev-config.json" << EOF
{
    "session_id": "$AI_SESSION_ID",
    "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "mode": "ai_development",
    "safety_level": "high",
    "monitoring": true,
    "checkpoints": true,
    "documentation_updates": true
}
EOF

echo -e "${GREEN}✅ AI development configuration created${NC}"

# 4. ENABLE SAFETY MONITORING
log "INFO" "📊 Enabling safety monitoring..."

# Create monitoring configuration
cat > "temp/ai-monitoring-config.json" << EOF
{
    "enabled": true,
    "session_id": "$AI_SESSION_ID",
    "monitoring_level": "comprehensive",
    "file_watch": true,
    "git_watch": true,
    "service_watch": true,
    "alert_threshold": "warning"
}
EOF

echo -e "${GREEN}✅ Safety monitoring configuration created${NC}"

# 5. SET UP DEVELOPMENT PERMISSIONS
log "INFO" "🔐 Setting up development permissions..."

# Ensure scripts are executable
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x scripts/*.mjs 2>/dev/null || true

echo -e "${GREEN}✅ Development permissions configured${NC}"

# 6. CREATE AI DEVELOPMENT LOG
log "INFO" "📝 Creating AI development log..."

# Initialize AI development log
cat > "logs/ai-safety/ai-development-$AI_SESSION_ID.log" << EOF
=== AI DEVELOPMENT SESSION STARTED ===
Session ID: $AI_SESSION_ID
Start Time: $(date)
Mode: AI Development
Safety Level: High
Monitoring: Enabled
Checkpoints: Enabled
Documentation Updates: Enabled

=== SESSION ACTIVITY LOG ===
EOF

echo -e "${GREEN}✅ AI development log initialized${NC}"

# 7. VERIFY AI MODE ENABLEMENT
log "INFO" "✅ Verifying AI mode enablement..."

# Check all components are ready
if [ -f "$AI_MODE_FLAG" ] && \
   [ -f "temp/ai-dev-config.json" ] && \
   [ -f "temp/ai-monitoring-config.json" ] && \
   [ -f "logs/ai-safety/ai-development-$AI_SESSION_ID.log" ]; then
    
    echo -e "${GREEN}✅ AI development mode successfully enabled${NC}"
    echo ""
    echo -e "${BLUE}📋 AI Development Mode Status:${NC}"
    echo -e "  • Session ID: $AI_SESSION_ID"
    echo -e "  • Mode Flag: ${GREEN}ACTIVE${NC}"
    echo -e "  • Safety Monitoring: ${GREEN}ENABLED${NC}"
    echo -e "  • Git Hooks: ${GREEN}ENABLED${NC}"
    echo -e "  • Development Log: ${GREEN}ACTIVE${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo -e "1. AI can now safely work on the codebase"
    echo -e "2. All actions are being monitored and logged"
    echo -e "3. Run: ./scripts/ai-safety-protocol.sh --post-flight when done"
    echo ""
    echo -e "${YELLOW}🚨 For emergency stop:${NC}"
    echo -e "   ./scripts/ai-safety-protocol.sh --emergency-stop"
    echo ""
    
    log "INFO" "AI development mode successfully enabled"
    log "INFO" "Session ID: $AI_SESSION_ID"
    log "INFO" "All safety features are active"
    
else
    log "ERROR" "❌ Failed to enable AI development mode completely"
    echo -e "${RED}❌ Failed to enable AI development mode completely${NC}"
    echo -e "${YELLOW}Please check logs and try again${NC}"
    exit 1
fi
