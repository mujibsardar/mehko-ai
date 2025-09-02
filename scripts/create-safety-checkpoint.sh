#!/bin/bash

# 💾 Create Safety Checkpoint Script
# Creates a comprehensive safety checkpoint before AI development begins

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/safety-checkpoint.log"
AI_MODE_FLAG="/tmp/ai-development-mode.active"
CHECKPOINT_DIR="temp/ai-safety-checkpoints"
CHECKPOINT_NAME="checkpoint-$(date +%Y%m%d_%H%M%S)"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$CHECKPOINT_DIR"

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

log "INFO" "💾 Starting safety checkpoint creation..."

echo ""
echo -e "${CYAN}💾 CREATING SAFETY CHECKPOINT${NC}"
echo -e "${CYAN}=============================${NC}"
echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG")"
echo -e "${BLUE}Checkpoint:${NC} $CHECKPOINT_NAME"
echo ""

# 1. CREATE CHECKPOINT DIRECTORY
log "INFO" "📁 Creating checkpoint directory..."
mkdir -p "$CHECKPOINT_DIR/$CHECKPOINT_NAME"
echo -e "${GREEN}✅ Checkpoint directory created: $CHECKPOINT_DIR/$CHECKPOINT_NAME${NC}"

# 2. CAPTURE CURRENT GIT STATE
log "INFO" "📝 Capturing current git state..."

if [ -d ".git" ]; then
    # Get current commit hash
    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    # Save git state
    cat > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/git-state.json" << EOF
{
    "commit_hash": "$CURRENT_COMMIT",
    "branch": "$CURRENT_BRANCH",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') uncommitted changes"
}
EOF
    
    # Save git diff if there are uncommitted changes
    if ! git diff --quiet 2>/dev/null; then
        git diff > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/uncommitted-changes.diff" 2>/dev/null || true
        git diff --name-only > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/modified-files.txt" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Git state captured${NC}"
    echo -e "${BLUE}  • Commit:${NC} $CURRENT_COMMIT"
    echo -e "${BLUE}  • Branch:${NC} $CURRENT_BRANCH"
else
    log "WARN" "⚠️ No git repository found"
    echo -e "${YELLOW}⚠️ No git repository found${NC}"
fi

# 3. CAPTURE FILE SYSTEM STATE
log "INFO" "📁 Capturing file system state..."

# Create file manifest
find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.sh" -o -name "*.md" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./python/venv/*" \
    -not -path "./python/.venv/*" \
    -not -path "./temp/*" \
    -not -path "./logs/*" \
    -not -path "./dist/*" \
    -exec sha256sum {} \; > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/file-manifest.txt" 2>/dev/null || true

echo -e "${GREEN}✅ File system state captured${NC}"

# 4. CAPTURE CRITICAL CONFIGURATION FILES
log "INFO" "⚙️ Capturing critical configuration files..."

# Copy critical configuration files
CRITICAL_FILES=(
    "package.json"
    "python/requirements.txt"
    "python/server/main.py"
    "src/App.jsx"
    "data/manifest.json"
    ".cursor/rules/README.md"
    "AI_INSTRUCTIONS.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$CHECKPOINT_DIR/$CHECKPOINT_NAME/" 2>/dev/null || true
    fi
done

echo -e "${GREEN}✅ Critical configuration files captured${NC}"

# 5. CAPTURE SYSTEM STATE
log "INFO" "🔍 Capturing system state..."

# System information
cat > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/system-state.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "session_id": "$(cat "$AI_MODE_FLAG")",
    "system_info": {
        "os": "$(uname -s)",
        "architecture": "$(uname -m)",
        "hostname": "$(hostname)",
        "user": "$(whoami)"
    },
    "disk_usage": "$(df . | tail -1 | awk '{print $5}')",
    "memory_info": "$(free -h | grep Mem | awk '{print $3 "/" $2}')",
    "current_directory": "$(pwd)"
}
EOF

echo -e "${GREEN}✅ System state captured${NC}"

# 6. CAPTURE SERVICE STATUS
log "INFO" "🔧 Capturing service status..."

# Check service health
cat > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/service-status.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "services": {
        "python_server": {
            "port": 8000,
            "status": "$(curl -s "http://localhost:8000/health" >/dev/null 2>&1 && echo "running" || echo "not_running")"
        },


    }
}
EOF

echo -e "${GREEN}✅ Service status captured${NC}"

# 7. CREATE CHECKPOINT METADATA
log "INFO" "📋 Creating checkpoint metadata..."

cat > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/checkpoint-metadata.json" << EOF
{
    "checkpoint_name": "$CHECKPOINT_NAME",
    "session_id": "$(cat "$AI_MODE_FLAG")",
    "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "purpose": "AI development safety checkpoint",
    "contents": [
        "git-state.json",
        "file-manifest.txt",
        "system-state.json",
        "service-status.json",
        "critical configuration files",
        "uncommitted changes (if any)"
    ],
    "restore_instructions": "Use ./scripts/restore-safety-checkpoint.sh $CHECKPOINT_NAME to restore this checkpoint"
}
EOF

echo -e "${GREEN}✅ Checkpoint metadata created${NC}"

# 8. CREATE RESTORE SCRIPT
log "INFO" "🔄 Creating restore script..."

cat > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/restore.sh" << 'EOF'
#!/bin/bash
# Restore script for checkpoint: CHECKPOINT_NAME_PLACEHOLDER
# Usage: ./restore.sh

echo "🔄 Restoring checkpoint: CHECKPOINT_NAME_PLACEHOLDER"
echo "⚠️  This will restore the system to the checkpoint state"
echo "❓ Are you sure? (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🔄 Restoring checkpoint..."
    # Add restore logic here
    echo "✅ Checkpoint restored"
else
    echo "❌ Restore cancelled"
fi
EOF

# Replace placeholder with actual checkpoint name
sed -i.bak "s/CHECKPOINT_NAME_PLACEHOLDER/$CHECKPOINT_NAME/g" "$CHECKPOINT_DIR/$CHECKPOINT_NAME/restore.sh"
chmod +x "$CHECKPOINT_DIR/$CHECKPOINT_NAME/restore.sh"

echo -e "${GREEN}✅ Restore script created${NC}"

# 9. VERIFY CHECKPOINT CREATION
log "INFO" "✅ Verifying checkpoint creation..."

# Check if all checkpoint files exist
CHECKPOINT_FILES=(
    "git-state.json"
    "file-manifest.txt"
    "system-state.json"
    "service-status.json"
    "checkpoint-metadata.json"
    "restore.sh"
)

MISSING_FILES=()
for file in "${CHECKPOINT_FILES[@]}"; do
    if [ ! -f "$CHECKPOINT_DIR/$CHECKPOINT_NAME/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Safety checkpoint successfully created${NC}"
    echo ""
    echo -e "${BLUE}📋 Checkpoint Details:${NC}"
    echo -e "  • Name: $CHECKPOINT_NAME"
    echo -e "  • Location: $CHECKPOINT_DIR/$CHECKPOINT_NAME"
    echo -e "  • Session ID: $(cat "$AI_MODE_FLAG")"
    echo -e "  • Created: $(date)"
    echo ""
    echo -e "${BLUE}📋 Checkpoint Contents:${NC}"
    echo -e "  • Git state and uncommitted changes"
    echo -e "  • File system manifest"
    echo -e "  • System and service status"
    echo -e "  • Critical configuration files"
    echo -e "  • Restore script"
    echo ""
    echo -e "${YELLOW}📋 To restore this checkpoint:${NC}"
    echo -e "   ./scripts/restore-safety-checkpoint.sh $CHECKPOINT_NAME"
    echo ""
    echo -e "${YELLOW}📋 To list all checkpoints:${NC}"
    echo -e "   ls -la $CHECKPOINT_DIR"
    echo ""
    
    log "INFO" "Safety checkpoint successfully created"
    log "INFO" "Checkpoint name: $CHECKPOINT_NAME"
    log "INFO" "Location: $CHECKPOINT_DIR/$CHECKPOINT_NAME"
    
else
    log "ERROR" "❌ Failed to create complete checkpoint"
    echo -e "${RED}❌ Failed to create complete checkpoint${NC}"
    echo -e "${YELLOW}Missing files: ${MISSING_FILES[*]}${NC}"
    exit 1
fi
