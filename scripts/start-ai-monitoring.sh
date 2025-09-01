#!/bin/bash

# 📊 Start AI Development Monitoring Script
# Monitors AI development activities to maintain system integrity

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
MONITORING_CONFIG="temp/ai-monitoring-config.json"

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

# Check if monitoring is already running
if [ -f "$MONITORING_PID_FILE" ]; then
    pid=$(cat "$MONITORING_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}⚠️ AI monitoring is already running (PID: $pid)${NC}"
        echo -e "${YELLOW}To restart, run: ./scripts/stop-ai-monitoring.sh first${NC}"
        exit 0
    else
        # Clean up stale PID file
        rm -f "$MONITORING_PID_FILE"
    fi
fi

log "INFO" "📊 Starting AI development monitoring..."

echo ""
echo -e "${CYAN}📊 STARTING AI DEVELOPMENT MONITORING${NC}"
echo -e "${CYAN}=====================================${NC}"
echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG")"
echo ""

# 1. START FILE SYSTEM MONITORING
log "INFO" "📁 Starting file system monitoring..."

# Monitor critical directories for changes
(
    # File system monitoring loop
    while true; do
        # Check for changes in critical directories
        for dir in "src" "python" "scripts" "data" "docs"; do
            if [ -d "$dir" ]; then
                # Get current file list and modification times
                find "$dir" -type f -exec stat -c "%Y %n" {} \; > "/tmp/ai-monitor-$dir-state.tmp" 2>/dev/null || true
                
                # Compare with previous state
                if [ -f "/tmp/ai-monitor-$dir-state.prev" ]; then
                    if ! diff "/tmp/ai-monitor-$dir-state.prev" "/tmp/ai-monitor-$dir-state.tmp" >/dev/null 2>&1; then
                        log "INFO" "📝 File changes detected in $dir/"
                        echo "$(date): File changes in $dir/" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
                    fi
                fi
                
                # Update previous state
                mv "/tmp/ai-monitor-$dir-state.tmp" "/tmp/ai-monitor-$dir-state.prev" 2>/dev/null || true
            fi
        done
        
        sleep 5  # Check every 5 seconds
    done
) &
FILE_MONITOR_PID=$!

echo -e "${GREEN}✅ File system monitoring started (PID: $FILE_MONITOR_PID)${NC}"

# 2. START GIT MONITORING
log "INFO" "📝 Starting git monitoring..."

# Monitor git activity
(
    # Git monitoring loop
    while true; do
        # Check for uncommitted changes
        if [ -d ".git" ]; then
            if ! git diff --quiet 2>/dev/null; then
                log "INFO" "📝 Uncommitted changes detected"
                echo "$(date): Uncommitted changes detected" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
                
                # Log what files have changes
                git diff --name-only 2>/dev/null | while read -r file; do
                    echo "$(date): Modified: $file" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
                done
            fi
        fi
        
        sleep 10  # Check every 10 seconds
    done
) &
GIT_MONITOR_PID=$!

echo -e "${GREEN}✅ Git monitoring started (PID: $GIT_MONITOR_PID)${NC}"

# 3. START SERVICE MONITORING
log "INFO" "🔧 Starting service monitoring..."

# Monitor service health
(
    # Service monitoring loop
    while true; do
        # Check Python server
        if curl -s "http://localhost:8000/health" >/dev/null 2>&1; then
            echo "$(date): Python server healthy" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log" 2>/dev/null || true
        else
            log "WARN" "⚠️ Python server not responding"
            echo "$(date): Python server not responding" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log" 2>/dev/null || true
        fi
        
        # Check Node.js server
        if curl -s "http://localhost:3000/health" >/dev/null 2>&1; then
            echo "$(date): Node.js server healthy" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log" 2>/dev/null || true
        else
            log "WARN" "⚠️ Node.js server not responding"
            echo "$(date): Node.js server not responding" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log" 2>/dev/null || true
        fi
        
        sleep 30  # Check every 30 seconds
    done
) &
SERVICE_MONITOR_PID=$!

echo -e "${GREEN}✅ Service monitoring started (PID: $SERVICE_MONITOR_PID)${NC}"

# 4. START MEMORY AND RESOURCE MONITORING
log "INFO" "💾 Starting resource monitoring..."

# Monitor system resources
(
    # Resource monitoring loop
    while true; do
        # Check disk usage
        DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
        if [ "$DISK_USAGE" -gt 90 ]; then
            log "WARN" "⚠️ High disk usage: ${DISK_USAGE}%"
            echo "$(date): High disk usage: ${DISK_USAGE}%" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
        fi
        
        # Check memory usage
        if command -v free >/dev/null 2>&1; then
            MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
            if [ "$MEMORY_USAGE" -gt 90 ]; then
                log "WARN" "⚠️ High memory usage: ${MEMORY_USAGE}%"
                echo "$(date): High memory usage: ${MEMORY_USAGE}%" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
            fi
        fi
        
        sleep 60  # Check every minute
    done
) &
RESOURCE_MONITOR_PID=$!

echo -e "${GREEN}✅ Resource monitoring started (PID: $RESOURCE_MONITOR_PID)${NC}"

# 5. START AI ACTIVITY LOGGING
log "INFO" "🤖 Starting AI activity logging..."

# Log AI development session start
echo "$(date): AI Development Monitoring Started" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
echo "$(date): File monitoring PID: $FILE_MONITOR_PID" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
echo "$(date): Git monitoring PID: $GIT_MONITOR_PID" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
echo "$(date): Service monitoring PID: $SERVICE_MONITOR_PID" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
echo "$(date): Resource monitoring PID: $RESOURCE_MONITOR_PID" >> "logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"

# 6. SAVE MONITORING PIDS
log "INFO" "💾 Saving monitoring PIDs..."

echo "$FILE_MONITOR_PID $GIT_MONITOR_PID $SERVICE_MONITOR_PID $RESOURCE_MONITOR_PID" > "$MONITORING_PID_FILE"

# 7. VERIFY MONITORING STARTUP
log "INFO" "✅ Verifying monitoring startup..."

# Check if all monitoring processes are running
sleep 2
if [ -f "$MONITORING_PID_FILE" ]; then
    pids=$(cat "$MONITORING_PID_FILE")
    all_running=true
    
    for pid in $pids; do
        if ! kill -0 "$pid" 2>/dev/null; then
            all_running=false
            break
        fi
    done
    
    if [ "$all_running" = "true" ]; then
        echo -e "${GREEN}✅ AI development monitoring successfully started${NC}"
        echo ""
        echo -e "${BLUE}📊 Monitoring Status:${NC}"
        echo -e "  • File System: ${GREEN}ACTIVE${NC} (PID: $FILE_MONITOR_PID)"
        echo -e "  • Git Activity: ${GREEN}ACTIVE${NC} (PID: $GIT_MONITOR_PID)"
        echo -e "  • Services: ${GREEN}ACTIVE${NC} (PID: $SERVICE_MONITOR_PID)"
        echo -e "  • Resources: ${GREEN}ACTIVE${NC} (PID: $RESOURCE_MONITOR_PID)"
        echo ""
        echo -e "${BLUE}📋 Monitoring Features:${NC}"
        echo -e "  • File change detection"
        echo -e "  • Git activity tracking"
        echo -e "  • Service health monitoring"
        echo -e "  • Resource usage tracking"
        echo -e "  • Comprehensive activity logging"
        echo ""
        echo -e "${YELLOW}📋 To stop monitoring:${NC}"
        echo -e "   ./scripts/stop-ai-monitoring.sh"
        echo ""
        echo -e "${YELLOW}📋 To view logs:${NC}"
        echo -e "   tail -f logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log"
        echo ""
        
        log "INFO" "AI development monitoring successfully started"
        log "INFO" "All monitoring processes are active"
        
    else
        log "ERROR" "❌ Failed to start all monitoring processes"
        echo -e "${RED}❌ Failed to start all monitoring processes${NC}"
        echo -e "${YELLOW}Some monitoring may not be working properly${NC}"
        exit 1
    fi
else
    log "ERROR" "❌ Failed to create monitoring PID file"
    echo -e "${RED}❌ Failed to create monitoring PID file${NC}"
    exit 1
fi
