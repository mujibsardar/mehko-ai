#!/bin/bash

# 🔍 System State Verification Script
# Verifies the system is in a known, stable state before AI development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/system-state-verification.log"
VERIFICATION_RESULTS="/tmp/system-verification-results.json"

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

# Initialize verification results
init_verification_results() {
    cat > "$VERIFICATION_RESULTS" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_status": "pending",
    "checks": {
        "services": {},
        "database": {},
        "file_system": {},
        "configuration": {},
        "dependencies": {}
    },
    "summary": {
        "total_checks": 0,
        "passed": 0,
        "failed": 0,
        "warnings": 0
    }
}
EOF
}

# Update verification results
update_verification_result() {
    local category="$1"
    local check_name="$2"
    local status="$3"
    local message="$4"
    
    # Update JSON results using jq if available, otherwise use sed
    if command -v jq >/dev/null 2>&1; then
        # Escape forward slashes in category names for jq
        local escaped_category=$(echo "$category" | sed 's/\//\\\//g')
        local escaped_check_name=$(echo "$check_name" | sed 's/\//\\\//g')
        
        jq ".checks.\"$escaped_category\".\"$escaped_check_name\" = {\"status\": \"$status\", \"message\": \"$message\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" "$VERIFICATION_RESULTS" > "$VERIFICATION_RESULTS.tmp" && mv "$VERIFICATION_RESULTS.tmp" "$VERIFICATION_RESULTS"
    else
        # Simple sed replacement for basic JSON updates
        sed -i.bak "s/\"$check_name\": {},/\"$check_name\": {\"status\": \"$status\", \"message\": \"$message\"},/" "$VERIFICATION_RESULTS" 2>/dev/null || true
    fi
}

# Check if script is run from project root
if [ ! -f "package.json" ] || [ ! -d "scripts" ]; then
    echo -e "${RED}❌ Error: This script must be run from the project root directory${NC}"
    exit 1
fi

log "INFO" "🔍 Starting system state verification..."

# Initialize verification results
init_verification_results

# 1. SERVICE STATUS VERIFICATION
log "INFO" "🔧 Verifying service status..."

# Check Python FastAPI server (Port 8000)
if curl -s "http://localhost:8000/health" >/dev/null 2>&1; then
    log "INFO" "✅ Python FastAPI server (Port 8000): RUNNING"
    update_verification_result "services" "python_server" "passed" "Python FastAPI server is running on port 8000"
else
    log "ERROR" "❌ Python FastAPI server (Port 8000): NOT RUNNING"
    update_verification_result "services" "python_server" "failed" "Python FastAPI server is not responding on port 8000"
fi

# Check Node.js server (Port 3000)
if curl -s "http://localhost:3000/health" >/dev/null 2>&1; then
    log "INFO" "✅ Node.js server (Port 3000): RUNNING"
    update_verification_result "services" "nodejs_server" "passed" "Node.js server is running on port 3000"
else
    log "ERROR" "❌ Node.js server (Port 3000): NOT RUNNING"
    update_verification_result "services" "nodejs_server" "failed" "Node.js server is not responding on port 3000"
fi

# Check React frontend (Port 5173)
if curl -s "http://localhost:5173" >/dev/null 2>&1; then
    log "INFO" "✅ React frontend (Port 5173): RUNNING"
    update_verification_result "services" "react_frontend" "passed" "React frontend is running on port 5173"
else
    log "WARN" "⚠️  React frontend (Port 5173): NOT RUNNING (may be optional for AI development)"
    update_verification_result "services" "react_frontend" "warning" "React frontend is not running on port 5173"
fi

# 2. DATABASE VERIFICATION
log "INFO" "🗄️  Verifying database connectivity..."

# Check if Firebase configuration exists
if [ -f "config/serviceAccountKey.json" ]; then
    log "INFO" "✅ Firebase configuration: FOUND"
    update_verification_result "database" "firebase_config" "passed" "Firebase service account key found"
else
    log "ERROR" "❌ Firebase configuration: MISSING"
    update_verification_result "database" "firebase_config" "failed" "Firebase service account key not found"
fi

# Check if manifest.json exists and is valid JSON
if [ -f "data/manifest.json" ]; then
    if python3 -m json.tool "data/manifest.json" >/dev/null 2>&1; then
        log "INFO" "✅ Manifest.json: VALID"
        update_verification_result "database" "manifest_json" "passed" "Manifest.json exists and contains valid JSON"
    else
        log "ERROR" "❌ Manifest.json: INVALID JSON"
        update_verification_result "database" "manifest_json" "failed" "Manifest.json contains invalid JSON"
    fi
else
    log "ERROR" "❌ Manifest.json: MISSING"
    update_verification_result "database" "manifest_json" "failed" "Manifest.json file not found"
fi

# 3. FILE SYSTEM VERIFICATION
log "INFO" "📁 Verifying file system integrity..."

# Check critical directories exist
CRITICAL_DIRS=("data/applications" "python/server" "src/components" "docs" "scripts")
for dir in "${CRITICAL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log "INFO" "✅ Directory $dir: EXISTS"
        update_verification_result "file_system" "dir_$dir" "passed" "Directory $dir exists"
    else
        log "ERROR" "❌ Directory $dir: MISSING"
        update_verification_result "file_system" "dir_$dir" "failed" "Directory $dir is missing"
    fi
done

# Check critical files exist
CRITICAL_FILES=("package.json" "python/requirements.txt" "python/server/main.py" "server.js")
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        log "INFO" "✅ File $file: EXISTS"
        update_verification_result "file_system" "file_$file" "passed" "File $file exists"
    else
        log "ERROR" "❌ File $file: MISSING"
        update_verification_result "file_system" "file_$file" "failed" "File $file is missing"
    fi
done

# 4. CONFIGURATION VERIFICATION
log "INFO" "⚙️  Verifying configuration files..."

# Check package.json is valid
if python3 -m json.tool "package.json" >/dev/null 2>&1; then
    log "INFO" "✅ package.json: VALID"
    update_verification_result "configuration" "package_json" "passed" "package.json contains valid JSON"
else
    log "ERROR" "❌ package.json: INVALID JSON"
    update_verification_result "configuration" "package_json" "failed" "package.json contains invalid JSON"
fi

# Check Python requirements.txt exists
if [ -f "python/requirements.txt" ]; then
    log "INFO" "✅ Python requirements.txt: EXISTS"
    update_verification_result "configuration" "python_requirements" "passed" "Python requirements.txt exists"
else
    log "ERROR" "❌ Python requirements.txt: MISSING"
    update_verification_result "configuration" "python_requirements" "failed" "Python requirements.txt is missing"
fi

# 5. DEPENDENCY VERIFICATION
log "INFO" "📦 Verifying dependencies..."

# Check Node.js dependencies
if [ -d "node_modules" ]; then
    log "INFO" "✅ Node.js dependencies: INSTALLED"
    update_verification_result "dependencies" "node_modules" "passed" "Node.js dependencies are installed"
else
    log "WARN" "⚠️  Node.js dependencies: NOT INSTALLED"
    update_verification_result "dependencies" "node_modules" "warning" "Node.js dependencies are not installed"
fi

# Check Python virtual environment
if [ -d "python/venv" ] || [ -d "venv" ]; then
    log "INFO" "✅ Python virtual environment: EXISTS"
    update_verification_result "dependencies" "python_venv" "passed" "Python virtual environment exists"
else
    log "WARN" "⚠️  Python virtual environment: NOT FOUND"
    update_verification_result "dependencies" "python_venv" "warning" "Python virtual environment not found"
fi

# 6. SYSTEM RESOURCES VERIFICATION
log "INFO" "💾 Verifying system resources..."

# Check available disk space
DISK_SPACE=$(df . | awk 'NR==2 {print $4}')
DISK_SPACE_MB=$((DISK_SPACE / 1024))
if [ "$DISK_SPACE_MB" -gt 1000 ]; then
    log "INFO" "✅ Available disk space: ${DISK_SPACE_MB}MB (SUFFICIENT)"
    update_verification_result "system_resources" "disk_space" "passed" "Available disk space: ${DISK_SPACE_MB}MB"
else
    log "WARN" "⚠️  Available disk space: ${DISK_SPACE_MB}MB (LOW)"
    update_verification_result "system_resources" "disk_space" "warning" "Available disk space: ${DISK_SPACE_MB}MB (low)"
fi

# Check available memory
if command -v free >/dev/null 2>&1; then
    MEMORY_AVAILABLE=$(free -m | awk 'NR==2 {print $7}')
    if [ "$MEMORY_AVAILABLE" -gt 500 ]; then
        log "INFO" "✅ Available memory: ${MEMORY_AVAILABLE}MB (SUFFICIENT)"
        update_verification_result "system_resources" "memory" "passed" "Available memory: ${MEMORY_AVAILABLE}MB"
    else
        log "WARN" "⚠️  Available memory: ${MEMORY_AVAILABLE}MB (LOW)"
        update_verification_result "system_resources" "memory" "warning" "Available memory: ${MEMORY_AVAILABLE}MB (low)"
    fi
else
    log "WARN" "⚠️  Cannot check memory (free command not available)"
    update_verification_result "system_resources" "memory" "warning" "Cannot check memory"
fi

# 7. FINAL VERIFICATION SUMMARY
log "INFO" "📊 Generating verification summary..."

# Count results (simple approach without jq)
TOTAL_CHECKS=$(grep -c "status" "$VERIFICATION_RESULTS" 2>/dev/null || echo "0")
PASSED_CHECKS=$(grep -c '"status": "passed"' "$VERIFICATION_RESULTS" 2>/dev/null || echo "0")
FAILED_CHECKS=$(grep -c '"status": "failed"' "$VERIFICATION_RESULTS" 2>/dev/null || echo "0")
WARNING_CHECKS=$(grep -c '"status": "warning"' "$VERIFICATION_RESULTS" 2>/dev/null || echo "0")

# Determine overall status
if [ "$FAILED_CHECKS" -gt 0 ]; then
    OVERALL_STATUS="failed"
    log "ERROR" "❌ SYSTEM VERIFICATION FAILED: $FAILED_CHECKS critical failures"
elif [ "$WARNING_CHECKS" -gt 0 ]; then
    OVERALL_STATUS="warning"
    log "WARN" "⚠️  SYSTEM VERIFICATION COMPLETED WITH WARNINGS: $WARNING_CHECKS warnings"
else
    OVERALL_STATUS="passed"
    log "INFO" "✅ SYSTEM VERIFICATION PASSED: All critical checks passed"
fi

# Display summary
echo ""
echo -e "${BLUE}📊 SYSTEM VERIFICATION SUMMARY${NC}"
echo -e "${BLUE}==============================${NC}"
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
echo -e "Overall Status: $OVERALL_STATUS"
echo ""

# Save detailed results
log "INFO" "📋 Detailed verification results saved to: $VERIFICATION_RESULTS"

# Exit with appropriate code
if [ "$OVERALL_STATUS" = "failed" ]; then
    log "ERROR" "❌ System verification failed - AI development cannot proceed safely"
    exit 1
elif [ "$OVERALL_STATUS" = "warning" ]; then
    log "WARN" "⚠️  System verification completed with warnings - AI development can proceed with caution"
    exit 0
else
    log "INFO" "✅ System verification passed - AI development can proceed safely"
    exit 0
fi
