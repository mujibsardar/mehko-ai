#!/bin/bash

# 🛡️ AI SAFETY PROTOCOL - Complete Codebase Protection System
# This script ensures AI agents can safely work with the codebase
# while maintaining integrity and preventing corruption
#
# Usage:
#   ./scripts/ai-safety-protocol.sh                    # Pre-flight validation + AI mode
#   ./scripts/ai-safety-protocol.sh --post-flight      # Post-flight validation + cleanup
#   ./scripts/ai-safety-protocol.sh --status           # Check current status
#   ./scripts/ai-safety-protocol.sh --emergency-stop   # Emergency stop all AI operations

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SAFETY_LOG_DIR="logs/ai-safety"
MONITORING_PID_FILE="/tmp/ai-monitoring.pid"
AI_SESSION_ID=$(date +%Y%m%d_%H%M%S)
SAFETY_LOG_FILE="$SAFETY_LOG_DIR/ai-safety-$AI_SESSION_ID.log"

# Ensure log directory exists
mkdir -p "$SAFETY_LOG_DIR"

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
    
    echo "[$timestamp] [$level] $message" >> "$SAFETY_LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "AI Safety Protocol failed: $1"
    log "ERROR" "Emergency stop initiated"
    emergency_stop
    exit 1
}

# Emergency stop function
emergency_stop() {
    log "WARN" "EMERGENCY STOP: Stopping all AI operations"
    
    # Stop monitoring
    if [ -f "$MONITORING_PID_FILE" ]; then
        local pid=$(cat "$MONITORING_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
        rm -f "$MONITORING_PID_FILE"
    fi
    
    # Kill any AI-related processes
    pkill -f "ai-safety" 2>/dev/null || true
    
    # Restore system to safe state
    ./scripts/restore-safe-state.sh 2>/dev/null || true
    
    log "INFO" "Emergency stop completed"
}

# Check if script is run from project root
if [ ! -f "package.json" ] || [ ! -d "scripts" ]; then
    echo -e "${RED}❌ Error: This script must be run from the project root directory${NC}"
    exit 1
fi

# Main function
main() {
    case "${1:-}" in
        "--post-flight")
            post_flight_validation
            ;;
        "--status")
            check_status
            ;;
        "--emergency-stop")
            emergency_stop
            exit 0
            ;;
        "--test-mode")
            test_mode_validation
            ;;
        "--help"|"-h")
            show_help
            exit 0
            ;;
        "")
            pre_flight_validation
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Pre-flight validation
pre_flight_validation() {
    log "INFO" "🛡️ AI SAFETY PROTOCOL INITIATED"
    log "INFO" "=================================="
    log "INFO" "Session ID: $AI_SESSION_ID"
    log "INFO" "Safety Log: $SAFETY_LOG_FILE"
    
    echo ""
    echo -e "${CYAN}🛡️  AI SAFETY PROTOCOL INITIATED${NC}"
    echo -e "${CYAN}==================================${NC}"
    echo -e "${BLUE}Session ID:${NC} $AI_SESSION_ID"
    echo -e "${BLUE}Safety Log:${NC} $SAFETY_LOG_FILE"
    echo ""
    
    # PHASE 1: PRE-FLIGHT VALIDATION
    echo -e "${YELLOW}📋 PHASE 1: PRE-FLIGHT VALIDATION${NC}"
    echo -e "${YELLOW}---------------------------------${NC}"
    
    # 1.1 System State Verification
    log "INFO" "🔍 Verifying system state..."
    echo -e "${BLUE}🔍 Verifying system state...${NC}"
    ./scripts/verify-system-state.sh || error_exit "System state verification failed"
    
    # 1.2 AI Knowledge Validation
    log "INFO" "🧠 Validating AI knowledge base..."
    echo -e "${BLUE}🧠 Validating AI knowledge base...${NC}"
    ./scripts/validate-ai-knowledge.sh || error_exit "AI knowledge validation failed"
    
    # 1.3 Codebase Integrity Check
    log "INFO" "✅ Checking codebase integrity..."
    echo -e "${BLUE}✅ Checking codebase integrity...${NC}"
    ./scripts/verify-codebase-integrity.sh || error_exit "Codebase integrity check failed"
    
    # 1.4 Documentation Accuracy Verification
    log "INFO" "📚 Verifying documentation accuracy..."
    echo -e "${BLUE}📚 Verifying documentation accuracy...${NC}"
    ./scripts/verify-documentation.sh || error_exit "Documentation accuracy verification failed"
    
    # PHASE 2: AI DEVELOPMENT MODE
    echo ""
    echo -e "${YELLOW}🤖 PHASE 2: AI DEVELOPMENT MODE${NC}"
    echo -e "${YELLOW}-------------------------------${NC}"
    
    # 2.1 Enable AI Development Tools
    log "INFO" "🛠️  Enabling AI development tools..."
    echo -e "${BLUE}🛠️  Enabling AI development tools...${NC}"
    ./scripts/enable-ai-mode.sh || error_exit "Failed to enable AI mode"
    
    # 2.2 Start Monitoring
    log "INFO" "📊 Starting development monitoring..."
    echo -e "${BLUE}📊 Starting development monitoring...${NC}"
    ./scripts/start-ai-monitoring.sh || error_exit "Failed to start monitoring"
    
    # 2.3 Create Safety Checkpoint
    log "INFO" "💾 Creating safety checkpoint..."
    echo -e "${BLUE}💾 Creating safety checkpoint...${NC}"
    ./scripts/create-safety-checkpoint.sh || error_exit "Failed to create safety checkpoint"
    
    echo ""
    echo -e "${GREEN}🎉 AI DEVELOPMENT MODE ACTIVATED${NC}"
    echo -e "${GREEN}AI agent can now safely work with the codebase${NC}"
    echo -e "${GREEN}All actions are being monitored and logged${NC}"
    echo ""
    echo -e "${YELLOW}📋 When development is complete, run:${NC}"
    echo -e "${CYAN}   ./scripts/ai-safety-protocol.sh --post-flight${NC}"
    echo ""
    echo -e "${YELLOW}🚨 For emergency stop, run:${NC}"
    echo -e "${RED}   ./scripts/ai-safety-protocol.sh --emergency-stop${NC}"
    echo ""
    
    log "INFO" "AI Development Mode activated successfully"
    log "INFO" "Session ID: $AI_SESSION_ID"
    log "INFO" "Safety Log: $SAFETY_LOG_FILE"
}

# Post-flight validation
post_flight_validation() {
    log "INFO" "🔍 POST-FLIGHT VALIDATION INITIATED"
    log "INFO" "Session ID: $AI_SESSION_ID"
    
    echo ""
    echo -e "${CYAN}🔍 POST-FLIGHT VALIDATION INITIATED${NC}"
    echo -e "${CYAN}====================================${NC}"
    echo -e "${BLUE}Session ID:${NC} $AI_SESSION_ID"
    echo ""
    
    # PHASE 3: POST-FLIGHT VALIDATION
    echo -e "${YELLOW}🔍 PHASE 3: POST-FLIGHT VALIDATION${NC}"
    echo -e "${YELLOW}----------------------------------${NC}"
    
    # 3.1 Stop Monitoring
    log "INFO" "⏹️  Stopping development monitoring..."
    echo -e "${BLUE}⏹️  Stopping development monitoring...${NC}"
    ./scripts/stop-ai-monitoring.sh || log "WARN" "Failed to stop monitoring gracefully"
    
    # 3.2 Change Analysis
    log "INFO" "📊 Analyzing changes made..."
    echo -e "${BLUE}📊 Analyzing changes made...${NC}"
    ./scripts/analyze-changes.sh || error_exit "Change analysis failed"
    
    # 3.3 Code Quality Validation
    log "INFO" "✅ Validating code quality..."
    echo -e "${BLUE}✅ Validating code quality...${NC}"
    ./scripts/validate-code-quality.sh || error_exit "Code quality validation failed"
    
    # 3.4 Documentation Update
    log "INFO" "📚 Updating documentation..."
    echo -e "${BLUE}📚 Updating documentation...${NC}"
    ./scripts/update-documentation.sh || error_exit "Documentation update failed"
    
    # 3.5 System Health Check
    log "INFO" "🏥 Performing system health check..."
    echo -e "${BLUE}🏥 Performing system health check...${NC}"
    ./scripts/system-health-check.sh || error_exit "System health check failed"
    
    # 3.6 Final Validation
    log "INFO" "🎯 Final validation..."
    echo -e "${BLUE}🎯 Final validation...${NC}"
    ./scripts/final-validation.sh || error_exit "Final validation failed"
    
    # 3.7 Cleanup
    log "INFO" "🧹 Cleaning up AI development artifacts..."
    echo -e "${BLUE}🧹 Cleaning up AI development artifacts...${NC}"
    ./scripts/cleanup-ai-artifacts.sh || log "WARN" "Cleanup failed, but continuing"
    
    echo ""
    echo -e "${GREEN}✅ POST-FLIGHT VALIDATION COMPLETE${NC}"
    echo -e "${GREEN}Codebase integrity verified and maintained${NC}"
    echo -e "${GREEN}Documentation updated and accurate${NC}"
    echo -e "${GREEN}System ready for production use${NC}"
    echo ""
    
    log "INFO" "Post-flight validation completed successfully"
    log "INFO" "Codebase integrity verified and maintained"
}

# Check current status
check_status() {
    echo -e "${CYAN}📊 AI SAFETY PROTOCOL STATUS${NC}"
    echo -e "${CYAN}============================${NC}"
    
    # Check if monitoring is active
    if [ -f "$MONITORING_PID_FILE" ]; then
        local pid=$(cat "$MONITORING_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}✅ AI Monitoring: ACTIVE (PID: $pid)${NC}"
        else
            echo -e "${RED}❌ AI Monitoring: INACTIVE (stale PID file)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  AI Monitoring: INACTIVE${NC}"
    fi
    
    # Check recent safety logs
    echo ""
    echo -e "${BLUE}📋 Recent Safety Logs:${NC}"
    if [ -d "$SAFETY_LOG_DIR" ]; then
        ls -la "$SAFETY_LOG_DIR" | tail -5
    else
        echo "No safety logs found"
    fi
    
    # Check system health
    echo ""
    echo -e "${BLUE}🏥 System Health:${NC}"
    ./scripts/quick-health-check.sh 2>/dev/null || echo "Health check failed"
}

# Test mode validation (for testing the protocol without running services)
test_mode_validation() {
    log "INFO" "🧪 TEST MODE: AI Safety Protocol validation"
    log "INFO" "Session ID: $AI_SESSION_ID"
    
    echo ""
    echo -e "${CYAN}🧪 TEST MODE: AI SAFETY PROTOCOL VALIDATION${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo -e "${BLUE}Session ID:${NC} $AI_SESSION_ID"
    echo -e "${BLUE}Safety Log:${NC} $SAFETY_LOG_FILE"
    echo ""
    echo -e "${YELLOW}⚠️  TEST MODE: Services not required to be running${NC}"
    echo ""
    
    # PHASE 1: BASIC VALIDATION (No service checks)
    echo -e "${YELLOW}📋 PHASE 1: BASIC VALIDATION (TEST MODE)${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    # 1.1 File System Verification (No service dependency)
    log "INFO" "📁 Verifying file system integrity (test mode)..."
    echo -e "${BLUE}📁 Verifying file system integrity (test mode)...${NC}"
    
    # Check critical directories exist
    CRITICAL_DIRS=("data/applications" "python/server" "src/components" "docs" "scripts")
    for dir in "${CRITICAL_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            log "INFO" "✅ Directory $dir: EXISTS"
            echo -e "${GREEN}✅ Directory $dir: EXISTS${NC}"
        else
            log "ERROR" "❌ Directory $dir: MISSING"
            echo -e "${RED}❌ Directory $dir: MISSING${NC}"
        fi
    done
    
    # Check critical files exist
    CRITICAL_FILES=("package.json" "python/requirements.txt" "python/server/main.py" "server.js")
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            log "INFO" "✅ File $file: EXISTS"
            echo -e "${GREEN}✅ File $file: EXISTS${NC}"
        else
            log "ERROR" "❌ File $file: MISSING"
            echo -e "${RED}❌ File $file: MISSING${NC}"
        fi
    done
    
    # 1.2 Configuration Verification
    log "INFO" "⚙️  Verifying configuration files (test mode)..."
    echo -e "${BLUE}⚙️  Verifying configuration files (test mode)...${NC}"
    
    # Check package.json is valid
    if python3 -m json.tool "package.json" >/dev/null 2>&1; then
        log "INFO" "✅ package.json: VALID"
        echo -e "${GREEN}✅ package.json: VALID${NC}"
    else
        log "ERROR" "❌ package.json: INVALID JSON"
        echo -e "${RED}❌ package.json: INVALID JSON${NC}"
    fi
    
    # Check if manifest.json exists and is valid JSON
    if [ -f "data/manifest.json" ]; then
        if python3 -m json.tool "data/manifest.json" >/dev/null 2>&1; then
            log "INFO" "✅ Manifest.json: VALID"
            echo -e "${GREEN}✅ Manifest.json: VALID${NC}"
        else
            log "ERROR" "❌ Manifest.json: INVALID JSON"
            echo -e "${RED}❌ Manifest.json: INVALID JSON${NC}"
        fi
    else
        log "ERROR" "❌ Manifest.json: MISSING"
        echo -e "${RED}❌ Manifest.json: MISSING${NC}"
    fi
    
    # 1.3 Documentation Verification
    log "INFO" "📚 Verifying documentation structure (test mode)..."
    echo -e "${BLUE}📚 Verifying documentation structure (test mode)...${NC}"
    
    if [ -f "docs/README.md" ]; then
        log "INFO" "✅ Documentation README: EXISTS"
        echo -e "${GREEN}✅ Documentation README: EXISTS${NC}"
    else
        log "ERROR" "❌ Documentation README: MISSING"
        echo -e "${RED}❌ Documentation README: MISSING${NC}"
    fi
    
    if [ -f "docs/AI_ASSISTANT_ONBOARDING.md" ]; then
        log "INFO" "✅ AI Assistant Onboarding: EXISTS"
        echo -e "${GREEN}✅ AI Assistant Onboarding: EXISTS${NC}"
    else
        log "ERROR" "❌ AI Assistant Onboarding: MISSING"
        echo -e "${RED}❌ AI Assistant Onboarding: MISSING${NC}"
    fi
    
    # PHASE 2: AI KNOWLEDGE VALIDATION (Test mode)
    echo ""
    echo -e "${YELLOW}🧠 PHASE 2: AI KNOWLEDGE VALIDATION (TEST MODE)${NC}"
    echo -e "${YELLOW}=============================================${NC}"
    
    log "INFO" "🧠 Validating AI knowledge base (test mode)..."
    echo -e "${BLUE}🧠 Validating AI knowledge base (test mode)...${NC}"
    
    # Run AI knowledge validation in test mode
    if [ -f "scripts/validate-ai-knowledge.sh" ]; then
        ./scripts/validate-ai-knowledge.sh || log "WARN" "AI knowledge validation had issues (continuing in test mode)"
    else
        log "ERROR" "❌ AI knowledge validation script not found"
        echo -e "${RED}❌ AI knowledge validation script not found${NC}"
    fi
    
    # PHASE 3: BASIC CODEBASE INTEGRITY (Test mode)
    echo ""
    echo -e "${YELLOW}✅ PHASE 3: BASIC CODEBASE INTEGRITY (TEST MODE)${NC}"
    echo -e "${YELLOW}===============================================${NC}"
    
    log "INFO" "✅ Checking basic codebase integrity (test mode)..."
    echo -e "${BLUE}✅ Checking basic codebase integrity (test mode)...${NC}"
    
    # Check for obvious issues without running tests
    if [ -d "node_modules" ]; then
        log "INFO" "✅ Node.js dependencies: INSTALLED"
        echo -e "${GREEN}✅ Node.js dependencies: INSTALLED${NC}"
    else
        log "WARN" "⚠️  Node.js dependencies: NOT INSTALLED"
        echo -e "${YELLOW}⚠️  Node.js dependencies: NOT INSTALLED${NC}"
    fi
    
    # Check for Python virtual environment
    if [ -d "python/venv" ] || [ -d "venv" ]; then
        log "INFO" "✅ Python virtual environment: EXISTS"
        echo -e "${GREEN}✅ Python virtual environment: EXISTS${NC}"
    else
        log "WARN" "⚠️  Python virtual environment: NOT FOUND"
        echo -e "${YELLOW}⚠️  Python virtual environment: NOT FOUND${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 TEST MODE VALIDATION COMPLETED${NC}"
    echo -e "${GREEN}Basic system structure verified${NC}"
    echo -e "${YELLOW}Note: This was test mode - services not verified${NC}"
    echo ""
    echo -e "${YELLOW}📋 For full validation, start services and run:${NC}"
    echo -e "${CYAN}   ./scripts/ai-safety-protocol.sh${NC}"
    echo ""
    
    log "INFO" "Test mode validation completed successfully"
    log "INFO" "Session ID: $AI_SESSION_ID"
}

# Show help
show_help() {
    echo -e "${CYAN}🛡️ AI SAFETY PROTOCOL - Help${NC}"
    echo -e "${CYAN}===============================${NC}"
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  ./scripts/ai-safety-protocol.sh                    # Pre-flight validation + AI mode"
    echo "  ./scripts/ai-safety-protocol.sh --post-flight      # Post-flight validation + cleanup"
    echo "  ./scripts/ai-safety-protocol.sh --status           # Check current status"
    echo "  ./scripts/ai-safety-protocol.sh --test-mode        # Test mode (no services required)"
    echo "  ./scripts/ai-safety-protocol.sh --emergency-stop   # Emergency stop all AI operations"
    echo "  ./scripts/ai-safety-protocol.sh --help             # Show this help"
    echo ""
    echo -e "${BLUE}What it does:${NC}"
    echo "  • Pre-flight: Validates system state and AI knowledge before development"
    echo "  • In-flight: Monitors AI actions and maintains system integrity"
    echo "  • Post-flight: Validates changes and updates documentation automatically"
    echo "  • Test mode: Validates basic structure without running services"
    echo ""
    echo -e "${BLUE}Safety Features:${NC}"
    echo "  • System state verification"
    echo "  • AI knowledge validation"
    echo "  • Codebase integrity checks"
    echo "  • Continuous monitoring"
    echo "  • Automatic documentation updates"
    echo "  • Emergency stop capability"
    echo ""
    echo -e "${YELLOW}⚠️  Always run pre-flight before AI development${NC}"
    echo -e "${YELLOW}⚠️  Always run post-flight after AI development${NC}"
    echo -e "${YELLOW}⚠️  Use emergency-stop if something goes wrong${NC}"
    echo -e "${YELLOW}⚠️  Use test-mode to validate structure without services${NC}"
}

# Trap signals for graceful shutdown
trap 'log "WARN" "Received interrupt signal"; emergency_stop; exit 1' INT TERM

# Run main function
main "$@"
