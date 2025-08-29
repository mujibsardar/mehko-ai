#!/bin/bash

# ⏹️ Stop AI Development Monitoring Script
# Gracefully stops all AI development monitoring processes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/ai-monitoring.log"
MONITORING_PID_FILE="/tmp/ai-monitoring.pid"
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

log "INFO" "⏹️ Starting AI development monitoring shutdown..."

echo ""
echo -e "${CYAN}⏹️ STOPPING AI DEVELOPMENT MONITORING${NC}"
echo -e "${CYAN}=====================================${NC}"

# Check if monitoring is running
if [ ! -f "$MONITORING_PID_FILE" ]; then
    echo -e "${YELLOW}⚠️ No AI monitoring is currently running${NC}"
    log "WARN" "No AI monitoring is currently running"
    exit 0
fi

# Get monitoring PIDs
MONITORING_PIDS=$(cat "$MONITORING_PID_FILE" 2>/dev/null || echo "")

if [ -z "$MONITORING_PIDS" ]; then
    echo -e "${YELLOW}⚠️ No monitoring PIDs found${NC}"
    rm -f "$MONITORING_PID_FILE"
    log "WARN" "No monitoring PIDs found, cleaned up PID file"
    exit 0
fi

echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG" 2>/dev/null || echo "unknown")"
echo ""

# 1. STOP MONITORING PROCESSES
log "INFO" "🛑 Stopping monitoring processes..."

STOPPED_PIDS=()
FAILED_PIDS=()

for pid in $MONITORING_PIDS; do
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${BLUE}🛑 Stopping process PID: $pid${NC}"
        
        # Try graceful shutdown first
        if kill -TERM "$pid" 2>/dev/null; then
            # Wait for graceful shutdown
            sleep 2
            
            # Check if process is still running
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${YELLOW}⚠️ Process $pid not responding to SIGTERM, forcing shutdown${NC}"
                kill -KILL "$pid" 2>/dev/null || true
                sleep 1
            fi
            
            # Final check
            if ! kill -0 "$pid" 2>/dev/null; then
                echo -e "${GREEN}✅ Process $pid stopped successfully${NC}"
                STOPPED_PIDS+=("$pid")
                log "INFO" "Process $pid stopped successfully"
            else
                echo -e "${RED}❌ Failed to stop process $pid${NC}"
                FAILED_PIDS+=("$pid")
                log "ERROR" "Failed to stop process $pid"
            fi
        else
            echo -e "${RED}❌ Failed to send SIGTERM to process $pid${NC}"
            FAILED_PIDS+=("$pid")
            log "ERROR" "Failed to send SIGTERM to process $pid"
        fi
    else
        echo -e "${YELLOW}⚠️ Process $pid is not running${NC}"
        log "WARN" "Process $pid is not running"
    fi
done

# 2. CLEAN UP MONITORING FILES
log "INFO" "🧹 Cleaning up monitoring files..."

# Remove PID file
rm -f "$MONITORING_PID_FILE"

# Clean up temporary monitoring state files
rm -f /tmp/ai-monitor-*-state.* 2>/dev/null || true

echo -e "${GREEN}✅ Monitoring files cleaned up${NC}"

# 3. LOG MONITORING SHUTDOWN
if [ -f "$AI_MODE_FLAG" ]; then
    echo "$(date): AI Development Monitoring Stopped" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log" 2>/dev/null || true
    echo "$(date): Stopped PIDs: ${STOPPED_PIDS[*]}" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log" 2>/dev/null || true
    
    if [ ${#FAILED_PIDS[@]} -gt 0 ]; then
        echo "$(date): Failed to stop PIDs: ${FAILED_PIDS[*]}" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log" 2>/dev/null || true
    fi
fi

# 4. VERIFY SHUTDOWN
log "INFO" "✅ Verifying monitoring shutdown..."

# Check if any monitoring processes are still running
STILL_RUNNING=()
for pid in $MONITORING_PIDS; do
    if kill -0 "$pid" 2>/dev/null; then
        STILL_RUNNING+=("$pid")
    fi
done

# 5. REPORT SHUTDOWN STATUS
echo ""
if [ ${#STILL_RUNNING[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ AI development monitoring successfully stopped${NC}"
    echo ""
    echo -e "${BLUE}📊 Shutdown Summary:${NC}"
    echo -e "  • Stopped: ${#STOPPED_PIDS[@]} processes"
    echo -e "  • Failed: ${#FAILED_PIDS[@]} processes"
    echo -e "  • Still running: 0 processes"
    echo ""
    
    log "INFO" "AI development monitoring successfully stopped"
    log "INFO" "Stopped ${#STOPPED_PIDS[@]} processes"
    
    if [ ${#FAILED_PIDS[@]} -gt 0 ]; then
        log "WARN" "Failed to stop ${#FAILED_PIDS[@]} processes"
    fi
    
else
    echo -e "${YELLOW}⚠️ AI development monitoring partially stopped${NC}"
    echo ""
    echo -e "${BLUE}📊 Shutdown Summary:${NC}"
    echo -e "  • Stopped: ${#STOPPED_PIDS[@]} processes"
    echo -e "  • Failed: ${#FAILED_PIDS[@]} processes"
    echo -e "  • Still running: ${#STILL_RUNNING[@]} processes"
    echo ""
    echo -e "${YELLOW}⚠️ Some monitoring processes are still running${NC}"
    echo -e "${YELLOW}PIDs: ${STILL_RUNNING[*]}${NC}"
    echo ""
    echo -e "${YELLOW}📋 To force stop remaining processes:${NC}"
    echo -e "   kill -KILL ${STILL_RUNNING[*]}"
    echo ""
    
    log "WARN" "AI development monitoring partially stopped"
    log "WARN" "Some processes still running: ${STILL_RUNNING[*]}"
    
    exit 1
fi

# 6. PROVIDE NEXT STEPS
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "1. AI development can continue without monitoring"
echo -e "2. To restart monitoring: ./scripts/start-ai-monitoring.sh"
echo -e "3. To exit AI mode: ./scripts/disable-ai-mode.sh"
echo -e "4. To run post-flight: ./scripts/ai-safety-protocol.sh --post-flight"
echo ""
