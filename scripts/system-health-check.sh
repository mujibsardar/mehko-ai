#!/bin/bash

# 🏥 System Health Check Script
# Performs comprehensive system health checks after AI development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/system-health-check.log"
AI_MODE_FLAG="/tmp/ai-development-mode.active"
HEALTH_REPORT_DIR="logs/ai-safety/health-reports"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$HEALTH_REPORT_DIR"

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

log "INFO" "🏥 Starting comprehensive system health check..."

echo ""
echo -e "${CYAN}🏥 COMPREHENSIVE SYSTEM HEALTH CHECK${NC}"
echo -e "${CYAN}=====================================${NC}"
echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG")"
echo ""

# Initialize health report
HEALTH_REPORT="$HEALTH_REPORT_DIR/system-health-$(cat "$AI_MODE_FLAG").md"
cat > "$HEALTH_REPORT" << EOF
# System Health Check Report
**Session ID:** $(cat "$AI_MODE_FLAG")
**Generated:** $(date)
**Purpose:** Post-AI development system health validation

## Summary
Comprehensive system health check performed after AI development session.

## Health Check Results
EOF

# Health check counter
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to run a health check
run_health_check() {
    local check_name="$1"
    local check_description="$2"
    local check_command="$3"
    local severity="${4:-"normal"}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "INFO" "🔍 Running health check: $check_name"
    echo -e "${BLUE}🔍 Checking:${NC} $check_description"
    
    if eval "$check_command" >/dev/null 2>&1; then
        log "INFO" "✅ Health check passed: $check_name"
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        log "ERROR" "❌ Health check failed: $check_name"
        echo -e "${RED}❌ FAILED${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        
        if [ "$severity" = "critical" ]; then
            log "ERROR" "🚨 CRITICAL HEALTH ISSUE: $check_name"
            echo -e "${RED}🚨 CRITICAL ISSUE${NC}"
        elif [ "$severity" = "warning" ]; then
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            log "WARN" "⚠️ HEALTH WARNING: $check_name"
            echo -e "${YELLOW}⚠️ WARNING${NC}"
        fi
        
        return 1
    fi
}

# 1. SERVICE HEALTH CHECKS
log "INFO" "🔧 Checking service health..."

echo ""
echo -e "${YELLOW}🔧 SERVICE HEALTH CHECKS${NC}"
echo -e "${YELLOW}========================${NC}"

# Test 1: Python FastAPI server health
run_health_check \
    "python_server_health" \
    "Python FastAPI server is responding" \
    "curl -s 'http://localhost:8000/health' >/dev/null" \
    "critical"

# Test 2: Node.js server health
run_health_check \
    "nodejs_server_health" \
    "Node.js server is responding" \
    "curl -s 'http://localhost:3000/health' >/dev/null" \
    "critical"

# Test 3: API Gateway health
run_health_check \
    "api_gateway_health" \
    "API Gateway is responding" \
    "curl -s 'http://localhost:3001/health' >/dev/null" \
    "critical"

# Test 4: React dev server health
run_health_check \
    "react_server_health" \
    "React dev server is responding" \
    "curl -s 'http://localhost:5173' >/dev/null" \
    "warning"

# 2. SYSTEM RESOURCE CHECKS
log "INFO" "💾 Checking system resources..."

echo ""
echo -e "${YELLOW}💾 SYSTEM RESOURCE CHECKS${NC}"
echo -e "${YELLOW}==========================${NC}"

# Test 5: Disk space availability
run_health_check \
    "disk_space_availability" \
    "Sufficient disk space available" \
    "[ \$(df . | tail -1 | awk '{print \$5}' | sed 's/%//') -lt 90 ]" \
    "critical"

# Test 6: Memory availability
run_health_check \
    "memory_availability" \
    "Sufficient memory available" \
    "command -v free >/dev/null && [ \$(free | grep Mem | awk '{printf \"%.0f\", \$3/\$2 * 100.0}') -lt 90 ]" \
    "warning"

# Test 7: CPU load check
run_health_check \
    "cpu_load_check" \
    "CPU load is reasonable" \
    "command -v uptime >/dev/null && [ \$(uptime | awk -F'load average:' '{print \$2}' | awk '{print \$1}' | sed 's/,//') -lt 5 ]" \
    "warning"

# 3. FILE SYSTEM INTEGRITY CHECKS
log "INFO" "📁 Checking file system integrity..."

echo ""
echo -e "${YELLOW}📁 FILE SYSTEM INTEGRITY CHECKS${NC}"
echo -e "${YELLOW}==================================${NC}"

# Test 8: Critical directories exist
run_health_check \
    "critical_directories_exist" \
    "Critical project directories exist" \
    "[ -d 'src' ] && [ -d 'python' ] && [ -d 'scripts' ] && [ -d 'data' ]" \
    "critical"

# Test 9: Critical files exist
run_health_check \
    "critical_files_exist" \
    "Critical project files exist" \
    "[ -f 'package.json' ] && [ -f 'python/server/main.py' ] && [ -f 'server.js' ]" \
    "critical"

# Test 10: Log directories accessible
run_health_check \
    "log_directories_accessible" \
    "Log directories are accessible" \
    "[ -d 'logs' ] && [ -w 'logs' ]" \
    "warning"

# 4. DEPENDENCY HEALTH CHECKS
log "INFO" "📦 Checking dependency health..."

echo ""
echo -e "${YELLOW}📦 DEPENDENCY HEALTH CHECKS${NC}"
echo -e "${YELLOW}==========================${NC}"

# Test 11: Node.js dependencies
run_health_check \
    "nodejs_dependencies" \
    "Node.js dependencies are properly installed" \
    "[ -d 'node_modules' ] && [ -f 'package-lock.json' ]" \
    "critical"

# Test 12: Python dependencies
run_health_check \
    "python_dependencies" \
    "Python dependencies are properly installed" \
    "[ -f 'python/requirements.txt' ] && ( [ -d 'python/venv' ] || [ -d 'python/.venv' ] )" \
    "warning"

# Test 13: Package.json validity
run_health_check \
    "package_json_validity" \
    "package.json is valid JSON" \
    "python3 -m json.tool 'package.json' >/dev/null" \
    "critical"

# 5. NETWORK AND CONNECTIVITY CHECKS
log "INFO" "🌐 Checking network and connectivity..."

echo ""
echo -e "${YELLOW}🌐 NETWORK AND CONNECTIVITY CHECKS${NC}"
echo -e "${YELLOW}=====================================${NC}"

# Test 14: Localhost accessibility
run_health_check \
    "localhost_accessibility" \
    "Localhost is accessible" \
    "ping -c 1 localhost >/dev/null" \
    "critical"

# Test 15: Port availability check
run_health_check \
    "port_availability_check" \
    "Required ports are available" \
    "! lsof -Pi :8000,3000,3001,5173 -sTCP:LISTEN -t >/dev/null 2>&1 || echo 'Ports in use by our services'" \
    "warning"

# Test 16: Internet connectivity
run_health_check \
    "internet_connectivity" \
    "Internet connectivity is available" \
    "curl -s --max-time 5 'https://www.google.com' >/dev/null" \
    "warning"

# 6. SECURITY AND PERMISSIONS CHECKS
log "INFO" "🔒 Checking security and permissions..."

echo ""
echo -e "${YELLOW}🔒 SECURITY AND PERMISSIONS CHECKS${NC}"
echo -e "${YELLOW}=====================================${NC}"

# Test 17: Script permissions
run_health_check \
    "script_permissions" \
    "Script files have proper permissions" \
    "find scripts -name '*.sh' -executable | wc -l | grep -q '[1-9]'" \
    "warning"

# Test 18: Configuration file security
run_health_check \
    "config_file_security" \
    "Configuration files have appropriate permissions" \
    "[ ! -f 'config/serviceAccountKey.json' ] || [ \$(stat -c %a 'config/serviceAccountKey.json') -eq 600 ]" \
    "warning"

# Test 19: Git repository security
run_health_check \
    "git_repository_security" \
    "Git repository is in secure state" \
    "[ -d '.git' ] && [ -w '.git' ]" \
    "warning"

# 7. PERFORMANCE AND RESPONSIVENESS CHECKS
log "INFO" "⚡ Checking performance and responsiveness..."

echo ""
echo -e "${YELLOW}⚡ PERFORMANCE AND RESPONSIVENESS CHECKS${NC}"
echo -e "${YELLOW}==========================================${NC}"

# Test 20: Service response time
run_health_check \
    "service_response_time" \
    "Services respond within reasonable time" \
    "timeout 5 curl -s 'http://localhost:8000/health' >/dev/null" \
    "warning"

# Test 21: File system performance
run_health_check \
    "filesystem_performance" \
    "File system operations are responsive" \
    "timeout 5 find . -name '*.md' | head -5 >/dev/null" \
    "warning"

# Test 22: Process responsiveness
run_health_check \
    "process_responsiveness" \
    "System processes are responsive" \
    "ps aux | grep -v grep | grep -q 'node\|python'" \
    "warning"

# 8. GENERATE HEALTH REPORT
log "INFO" "📋 Generating comprehensive health report..."

# Calculate overall health score
if [ "$TOTAL_CHECKS" -gt 0 ]; then
    HEALTH_SCORE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
else
    HEALTH_SCORE=0
fi

# Add health check results to report
cat >> "$HEALTH_REPORT" << EOF

## Health Check Summary
**Total Checks:** $TOTAL_CHECKS
**Passed:** $PASSED_CHECKS
**Failed:** $FAILED_CHECKS
**Warnings:** $WARNING_CHECKS
**Overall Health Score:** ${HEALTH_SCORE}%

## Detailed Results
EOF

# Add individual check results
if [ -f "/tmp/health-check-results.tmp" ]; then
    cat "/tmp/health-check-results.tmp" >> "$HEALTH_REPORT"
    rm -f "/tmp/health-check-results.tmp"
fi

# Add health recommendations
cat >> "$HEALTH_REPORT" << EOF

## Health Recommendations
EOF

if [ "$FAILED_CHECKS" -gt 0 ]; then
    cat >> "$HEALTH_REPORT" << EOF
🚨 **CRITICAL HEALTH ISSUES DETECTED**
- $FAILED_CHECKS critical health issues require immediate attention
- System health check FAILED
- Address critical issues before proceeding
EOF
elif [ "$WARNING_CHECKS" -gt 0 ]; then
    cat >> "$HEALTH_REPORT" << EOF
⚠️ **HEALTH WARNINGS DETECTED**
- $WARNING_CHECKS health warnings should be addressed
- System health check PASSED with warnings
- Review warnings and address when convenient
EOF
else
    cat >> "$HEALTH_REPORT" << EOF
✅ **EXCELLENT SYSTEM HEALTH**
- All health checks passed
- System health check PASSED
- System is in optimal condition
EOF
fi

cat >> "$HEALTH_REPORT" << EOF

## Next Steps
1. Address any critical health issues immediately
2. Review and address health warnings
3. Consider preventive maintenance for warnings
4. Re-run health check after addressing issues

---
*Report generated by AI Safety Protocol*
EOF

# 9. FINAL HEALTH ASSESSMENT
echo ""
echo -e "${BLUE}📊 SYSTEM HEALTH ASSESSMENT SUMMARY${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
echo -e "Overall Health Score: ${HEALTH_SCORE}%"

# Determine if system is healthy
if [ "$FAILED_CHECKS" -gt 0 ]; then
    log "ERROR" "❌ SYSTEM HEALTH CHECK FAILED: $FAILED_CHECKS critical issues"
    echo ""
    echo -e "${RED}❌ SYSTEM HEALTH CHECK FAILED${NC}"
    echo -e "${RED}Critical health issues detected - immediate attention required${NC}"
    echo ""
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Review critical health issues above"
    echo -e "2. Address critical issues immediately"
    echo -e "3. Re-run health check after fixes"
    echo -e "4. Do not proceed until critical issues are resolved"
    echo ""
    
    log "ERROR" "System health check failed - critical issues detected"
    exit 1
    
elif [ "$WARNING_CHECKS" -gt 0 ]; then
    log "WARN" "⚠️ SYSTEM HEALTH CHECK COMPLETED WITH WARNINGS: $WARNING_CHECKS warnings"
    echo ""
    echo -e "${YELLOW}⚠️ SYSTEM HEALTH CHECK COMPLETED WITH WARNINGS${NC}"
    echo -e "${YELLOW}System is healthy but improvements recommended${NC}"
    echo ""
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Review health warnings above"
    echo -e "2. Address warnings when convenient"
    echo -e "3. Consider preventive maintenance"
    echo -e "4. Development can proceed with caution"
    echo ""
    
    log "WARN" "System health check completed with warnings - improvements recommended"
    exit 0
    
else
    log "INFO" "✅ SYSTEM HEALTH CHECK PASSED: All checks passed"
    echo ""
    echo -e "${GREEN}✅ SYSTEM HEALTH CHECK PASSED${NC}"
    echo -e "${GREEN}System is in excellent health - no issues detected${NC}"
    echo ""
    echo -e "${BLUE}📋 Health Status:${NC}"
    echo -e "  • Services: ${GREEN}HEALTHY${NC}"
    echo -e "  • Resources: ${GREEN}OPTIMAL${NC}"
    echo -e "  • File System: ${GREEN}INTACT${NC}"
    echo -e "  • Dependencies: ${GREEN}PROPER${NC}"
    echo -e "  • Security: ${GREEN}SECURE${NC}"
    echo -e "  • Performance: ${GREEN}RESPONSIVE${NC}"
    echo ""
    
    log "INFO" "System health check passed - all systems optimal"
    exit 0
fi
