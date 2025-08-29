#!/bin/bash

# ✅ Validate Code Quality Script
# Validates code quality after AI development to ensure no breaking changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/code-quality-validation.log"
AI_MODE_FLAG="/tmp/ai-development-mode.active"
QUALITY_REPORT_DIR="logs/ai-safety/quality-reports"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$QUALITY_REPORT_DIR"

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

log "INFO" "✅ Starting code quality validation..."

echo ""
echo -e "${CYAN}✅ VALIDATING CODE QUALITY${NC}"
echo -e "${CYAN}==========================${NC}"
echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG")"
echo ""

# Initialize quality report
QUALITY_REPORT="$QUALITY_REPORT_DIR/code-quality-$(cat "$AI_MODE_FLAG").md"
cat > "$QUALITY_REPORT" << EOF
# Code Quality Validation Report
**Session ID:** $(cat "$AI_MODE_FLAG")
**Generated:** $(date)
**Purpose:** Post-AI development code quality validation

## Summary
EOF

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
CRITICAL_FAILURES=0

# Function to run a quality test
run_quality_test() {
    local test_name="$1"
    local test_description="$2"
    local test_command="$3"
    local is_critical="${4:-false}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log "INFO" "🧪 Running quality test: $test_name"
    echo -e "${BLUE}🧪 Testing:${NC} $test_description"
    
    if eval "$test_command" >/dev/null 2>&1; then
        log "INFO" "✅ Quality test passed: $test_name"
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        log "ERROR" "❌ Quality test failed: $test_name"
        echo -e "${RED}❌ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        
        if [ "$is_critical" = "true" ]; then
            CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
            log "ERROR" "🚨 CRITICAL FAILURE: $test_name"
            echo -e "${RED}🚨 CRITICAL FAILURE${NC}"
        fi
        
        return 1
    fi
}

# 1. SYNTAX VALIDATION TESTS
log "INFO" "🔍 Running syntax validation tests..."

echo ""
echo -e "${YELLOW}🔍 SYNTAX VALIDATION TESTS${NC}"
echo -e "${YELLOW}==========================${NC}"

# Test 1: JavaScript/JSX syntax validation
run_quality_test \
    "javascript_syntax" \
    "JavaScript/JSX files have valid syntax" \
    "find src -name '*.js' -o -name '*.jsx' | xargs -I {} node -c {}" \
    "true"

# Test 2: Python syntax validation
run_quality_test \
    "python_syntax" \
    "Python files have valid syntax" \
    "find python -name '*.py' | xargs -I {} python3 -m py_compile {}" \
    "true"

# Test 3: JSON syntax validation
run_quality_test \
    "json_syntax" \
    "JSON files have valid syntax" \
    "find . -name '*.json' -not -path './node_modules/*' -not -path './.git/*' | xargs -I {} python3 -m json.tool {} >/dev/null" \
    "false"

# Test 4: Shell script syntax validation
run_quality_test \
    "shell_syntax" \
    "Shell scripts have valid syntax" \
    "find scripts -name '*.sh' | xargs -I {} bash -n {}" \
    "false"

# 2. BUILD VALIDATION TESTS
log "INFO" "🏗️ Running build validation tests..."

echo ""
echo -e "${YELLOW}🏗️ BUILD VALIDATION TESTS${NC}"
echo -e "${YELLOW}==========================${NC}"

# Test 5: Node.js dependencies validation
run_quality_test \
    "node_dependencies" \
    "Node.js dependencies are properly installed" \
    "[ -d 'node_modules' ] && [ -f 'package-lock.json' ]" \
    "true"

# Test 6: Python dependencies validation
run_quality_test \
    "python_dependencies" \
    "Python dependencies are properly installed" \
    "[ -f 'python/requirements.txt' ] && ( [ -d 'python/venv' ] || [ -d 'python/.venv' ] )" \
    "false"

# Test 7: Package.json validation
run_quality_test \
    "package_json_validity" \
    "package.json is valid and complete" \
    "python3 -m json.tool package.json >/dev/null && grep -q 'name.*version.*scripts' package.json" \
    "true"

# 3. CODE STRUCTURE TESTS
log "INFO" "🏛️ Running code structure tests..."

echo ""
echo -e "${YELLOW}🏛️ CODE STRUCTURE TESTS${NC}"
echo -e "${YELLOW}========================${NC}"

# Test 8: Critical directories exist
run_quality_test \
    "critical_directories" \
    "Critical project directories exist" \
    "[ -d 'src' ] && [ -d 'python' ] && [ -d 'scripts' ] && [ -d 'data' ]" \
    "true"

# Test 9: Critical files exist
run_quality_test \
    "critical_files" \
    "Critical project files exist" \
    "[ -f 'package.json' ] && [ -f 'python/server/main.py' ] && [ -f 'server.js' ]" \
    "true"

# Test 10: Documentation structure
run_quality_test \
    "documentation_structure" \
    "Documentation structure is intact" \
    "[ -d 'docs' ] && [ -f 'README.md' ] && [ -f 'AI_INSTRUCTIONS.md' ]" \
    "false"

# 4. CONFIGURATION VALIDATION TESTS
log "INFO" "⚙️ Running configuration validation tests..."

echo ""
echo -e "${YELLOW}⚙️ CONFIGURATION VALIDATION TESTS${NC}"
echo -e "${YELLOW}==================================${NC}"

# Test 11: Environment configuration
run_quality_test \
    "environment_configuration" \
    "Environment configuration is valid" \
    "[ -f '.env' ] || [ -f 'config/serviceAccountKey.json' ]" \
    "false"

# Test 12: AI safety configuration
run_quality_test \
    "ai_safety_configuration" \
    "AI safety configuration is present" \
    "[ -f '.cursor/rules/README.md' ] && [ -f 'scripts/ai-safety-protocol.sh' ]" \
    "true"

# Test 13: Service configuration
run_quality_test \
    "service_configuration" \
    "Service configuration files are valid" \
    "[ -f 'scripts/start-all-services.sh' ] && [ -f 'scripts/stop-all-services.sh' ]" \
    "true"

# 5. INTEGRITY VALIDATION TESTS
log "INFO" "🔒 Running integrity validation tests..."

echo ""
echo -e "${YELLOW}🔒 INTEGRITY VALIDATION TESTS${NC}"
echo -e "${YELLOW}================================${NC}"

# Test 14: Git repository integrity
run_quality_test \
    "git_integrity" \
    "Git repository is in valid state" \
    "[ -d '.git' ] && git rev-parse HEAD >/dev/null 2>&1" \
    "false"

# Test 15: File permissions
run_quality_test \
    "file_permissions" \
    "Script files have proper permissions" \
    "find scripts -name '*.sh' -executable | wc -l | grep -q '[1-9]'" \
    "false"

# Test 16: Log directory structure
run_quality_test \
    "log_directory_structure" \
    "Log directory structure is intact" \
    "[ -d 'logs' ] && [ -d 'logs/ai-safety' ]" \
    "false"

# 6. GENERATE QUALITY REPORT
log "INFO" "📋 Generating code quality report..."

# Calculate overall score
if [ "$TOTAL_TESTS" -gt 0 ]; then
    OVERALL_SCORE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
else
    OVERALL_SCORE=0
fi

# Add test results to report
cat >> "$QUALITY_REPORT" << EOF

## Test Results
**Total Tests:** $TOTAL_TESTS
**Passed:** $PASSED_TESTS
**Failed:** $FAILED_TESTS
**Critical Failures:** $CRITICAL_FAILURES
**Overall Score:** ${OVERALL_SCORE}%

## Test Details
EOF

# Add individual test results
if [ -f "/tmp/quality-test-results.tmp" ]; then
    cat "/tmp/quality-test-results.tmp" >> "$QUALITY_REPORT"
    rm -f "/tmp/quality-test-results.tmp"
fi

# Add recommendations
cat >> "$QUALITY_REPORT" << EOF

## Recommendations
EOF

if [ "$CRITICAL_FAILURES" -gt 0 ]; then
    cat >> "$QUALITY_REPORT" << EOF
🚨 **CRITICAL ISSUES DETECTED**
- $CRITICAL_FAILURES critical failures require immediate attention
- Code quality validation FAILED
- AI development should not proceed until issues are resolved
EOF
elif [ "$FAILED_TESTS" -gt 0 ]; then
    cat >> "$QUALITY_REPORT" << EOF
⚠️ **QUALITY ISSUES DETECTED**
- $FAILED_TESTS quality issues should be addressed
- Code quality validation PASSED with warnings
- Review failed tests and address issues before production
EOF
else
    cat >> "$QUALITY_REPORT" << EOF
✅ **EXCELLENT CODE QUALITY**
- All quality tests passed
- Code quality validation PASSED
- AI development maintained high standards
EOF
fi

cat >> "$QUALITY_REPORT" << EOF

## Next Steps
1. Review failed tests (if any)
2. Address quality issues
3. Re-run validation if needed
4. Proceed with post-flight validation

---
*Report generated by AI Safety Protocol*
EOF

# 7. FINAL VALIDATION RESULT
echo ""
echo -e "${BLUE}📊 CODE QUALITY VALIDATION SUMMARY${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo -e "${RED}Critical Failures: $CRITICAL_FAILURES${NC}"
echo -e "Overall Score: ${OVERALL_SCORE}%"

# Determine if validation passed
if [ "$CRITICAL_FAILURES" -gt 0 ]; then
    log "ERROR" "❌ CODE QUALITY VALIDATION FAILED: $CRITICAL_FAILURES critical failures"
    echo ""
    echo -e "${RED}❌ CODE QUALITY VALIDATION FAILED${NC}"
    echo -e "${RED}Critical failures detected - immediate attention required${NC}"
    echo ""
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Review critical failures above"
    echo -e "2. Fix critical issues immediately"
    echo -e "3. Re-run validation after fixes"
    echo -e "4. Do not proceed until all critical issues are resolved"
    echo ""
    
    log "ERROR" "Code quality validation failed - critical failures detected"
    exit 1
    
elif [ "$FAILED_TESTS" -gt 0 ]; then
    log "WARN" "⚠️ CODE QUALITY VALIDATION COMPLETED WITH ISSUES: $FAILED_TESTS failures"
    echo ""
    echo -e "${YELLOW}⚠️ CODE QUALITY VALIDATION COMPLETED WITH ISSUES${NC}"
    echo -e "${YELLOW}Code quality is acceptable but improvements recommended${NC}"
    echo ""
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Review failed tests above"
    echo -e "2. Address quality issues when convenient"
    echo -e "3. Consider re-running validation after improvements"
    echo -e "4. Development can proceed with caution"
    echo ""
    
    log "WARN" "Code quality validation completed with issues - improvements recommended"
    exit 0
    
else
    log "INFO" "✅ CODE QUALITY VALIDATION PASSED: All tests passed"
    echo ""
    echo -e "${GREEN}✅ CODE QUALITY VALIDATION PASSED${NC}"
    echo -e "${GREEN}Code quality is excellent - no issues detected${NC}"
    echo ""
    echo -e "${BLUE}📋 Quality Status:${NC}"
    echo -e "  • Syntax: ${GREEN}VALID${NC}"
    echo -e "  • Structure: ${GREEN}INTACT${NC}"
    echo -e "  • Configuration: ${GREEN}VALID${NC}"
    echo -e "  • Integrity: ${GREEN}MAINTAINED${NC}"
    echo ""
    
    log "INFO" "Code quality validation passed - all tests successful"
    exit 0
fi
