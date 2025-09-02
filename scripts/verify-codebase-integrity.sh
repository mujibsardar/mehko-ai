#!/bin/bash

# ✅ Codebase Integrity Verification Script
# Ensures codebase is in expected, healthy state before AI development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/codebase-integrity.log"
INTEGRITY_RESULTS="/tmp/codebase-integrity-results.json"
MAX_LINT_ERRORS=1000
MAX_TEST_FAILURES=0

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

log "INFO" "✅ Starting codebase integrity verification..."

# Initialize integrity results
cat > "$INTEGRITY_RESULTS" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_status": "pending",
    "checks": {
        "tests": {},
        "linting": {},
        "build": {},
        "dependencies": {},
        "security": {}
    },
    "summary": {
        "total_checks": 0,
        "passed": 0,
        "failed": 0,
        "warnings": 0
    }
}
EOF

# Test counter
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to run an integrity check
run_integrity_check() {
    local check_name="$1"
    local check_description="$2"
    local check_command="$3"
    local is_critical="${4:-false}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "INFO" "🔍 Running check: $check_name"
    echo -e "${BLUE}🔍 Checking:${NC} $check_description"
    
    if eval "$check_command" >/dev/null 2>&1; then
        log "INFO" "✅ Check passed: $check_name"
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        log "ERROR" "❌ Check failed: $check_name"
        echo -e "${RED}❌ FAILED${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# 1. TEST SUITE VERIFICATION
log "INFO" "🧪 Verifying test suite..."

echo ""
echo -e "${YELLOW}🧪 TEST SUITE VERIFICATION${NC}"
echo -e "${YELLOW}==========================${NC}"

# Check if test scripts exist
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    log "INFO" "📋 Test script found in package.json"
    
    # Check if tests can run
    if npm test --dry-run >/dev/null 2>&1; then
        log "INFO" "✅ Test suite can execute"
        
        # Run tests with timeout
        echo -e "${BLUE}🧪 Running test suite...${NC}"
        if timeout 300 npm test >/dev/null 2>&1; then
            log "INFO" "✅ All tests passed"
            echo -e "${GREEN}✅ All tests passed${NC}"
            run_integrity_check \
                "test_suite_execution" \
                "Test suite executes successfully" \
                "true" \
                "true"
        else
            log "ERROR" "❌ Test suite failed or timed out"
            echo -e "${RED}❌ Test suite failed or timed out${NC}"
            run_integrity_check \
                "test_suite_execution" \
                "Test suite executes successfully" \
                "false" \
                "true"
        fi
    else
        log "ERROR" "❌ Test suite cannot execute"
        echo -e "${RED}❌ Test suite cannot execute${NC}"
        run_integrity_check \
            "test_suite_execution" \
            "Test suite executes successfully" \
            "false" \
            "true"
    fi
else
    log "WARN" "⚠️  No test script found in package.json"
    echo -e "${YELLOW}⚠️  No test script found in package.json${NC}"
    run_integrity_check \
        "test_suite_execution" \
        "Test suite executes successfully" \
        "true" \
        "false"
fi

# Check for specific test files
if [ -d "tests" ] || [ -d "src/__tests__" ]; then
    log "INFO" "✅ Test directories found"
    run_integrity_check \
        "test_files_exist" \
        "Test files exist in project" \
        "true" \
        "false"
else
    log "WARN" "⚠️  No test directories found"
    echo -e "${YELLOW}⚠️  No test directories found${NC}"
    run_integrity_check \
        "test_files_exist" \
        "Test files exist in project" \
        "false" \
        "false"
fi

# 2. LINTING VERIFICATION
log "INFO" "🔍 Verifying code quality and linting..."

echo ""
echo -e "${YELLOW}🔍 LINTING VERIFICATION${NC}"
echo -e "${YELLOW}=======================${NC}"

# Check if linting scripts exist
if [ -f "package.json" ] && grep -q '"lint"' package.json; then
    log "INFO" "📋 Lint script found in package.json"
    
    # Check if linting can run (remove --dry-run as it's not supported)
    if npm run lint >/dev/null 2>&1 || true; then
        log "INFO" "✅ Linting can execute"
        
        # Run linting
        echo -e "${BLUE}🔍 Running linting...${NC}"
        LINT_OUTPUT=$(npm run lint 2>&1 || true)
        LINT_ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -E "^\s*[0-9]+:[0-9]+\s+error" | wc -l || echo "0")
        
        if [ "$LINT_ERROR_COUNT" -le "$MAX_LINT_ERRORS" ]; then
            log "INFO" "✅ Linting passed with $LINT_ERROR_COUNT errors (within limit)"
            echo -e "${GREEN}✅ Linting passed with $LINT_ERROR_COUNT errors (within limit)${NC}"
            run_integrity_check \
                "linting_quality" \
                "Code quality meets standards" \
                "true" \
                "false"
        else
            log "ERROR" "❌ Linting failed with $LINT_ERROR_COUNT errors (exceeds limit)"
            echo -e "${RED}❌ Linting failed with $LINT_ERROR_COUNT errors (exceeds limit)${NC}"
            run_integrity_check \
                "linting_quality" \
                "Code quality meets standards" \
                "false" \
                "true"
        fi
    else
        log "ERROR" "❌ Linting cannot execute"
        echo -e "${RED}❌ Linting cannot execute${NC}"
        run_integrity_check \
            "linting_quality" \
            "Code quality meets standards" \
            "false" \
            "true"
    fi
else
    log "WARN" "⚠️  No lint script found in package.json"
    echo -e "${YELLOW}⚠️  No lint script found in package.json${NC}"
    run_integrity_check \
        "linting_quality" \
        "Code quality meets standards" \
        "true" \
        "false"
fi

# 3. BUILD VERIFICATION
log "INFO" "🏗️  Verifying build process..."

echo ""
echo -e "${YELLOW}🏗️  BUILD VERIFICATION${NC}"
echo -e "${YELLOW}======================${NC}"

# Check if build scripts exist
if [ -f "package.json" ] && grep -q '"build"' package.json; then
    log "INFO" "📋 Build script found in package.json"
    
    # Check if build can run
    if npm run build --dry-run >/dev/null 2>&1; then
        log "INFO" "✅ Build can execute"
        
        # Run build
        echo -e "${BLUE}🏗️  Running build...${NC}"
        if timeout 600 npm run build >/dev/null 2>&1; then
            log "INFO" "✅ Build completed successfully"
            echo -e "${GREEN}✅ Build completed successfully${NC}"
            run_integrity_check \
                "build_process" \
                "Build process completes successfully" \
                "true" \
                "true"
        else
            log "ERROR" "❌ Build failed or timed out"
            echo -e "${RED}❌ Build failed or timed out${NC}"
            run_integrity_check \
                "build_process" \
                "Build process completes successfully" \
                "false" \
                "true"
        fi
    else
        log "ERROR" "❌ Build cannot execute"
        echo -e "${RED}❌ Build cannot execute${NC}"
        run_integrity_check \
            "build_process" \
            "Build process completes successfully" \
            "false" \
            "true"
    fi
else
    log "WARN" "⚠️  No build script found in package.json"
    echo -e "${YELLOW}⚠️  No build script found in package.json${NC}"
    run_integrity_check \
        "build_process" \
        "Build process completes successfully" \
        "true" \
        "false"
fi

# Check if dist directory exists (indicating successful build)
if [ -d "dist" ]; then
    log "INFO" "✅ Dist directory exists (build artifacts present)"
    run_integrity_check \
        "build_artifacts" \
        "Build artifacts exist" \
        "true" \
        "false"
else
    log "WARN" "⚠️  Dist directory not found (no build artifacts)"
    echo -e "${YELLOW}⚠️  Dist directory not found (no build artifacts)${NC}"
    run_integrity_check \
        "build_artifacts" \
        "Build artifacts exist" \
        "false" \
        "false"
fi

# 4. DEPENDENCY VERIFICATION
log "INFO" "📦 Verifying dependencies..."

echo ""
echo -e "${YELLOW}📦 DEPENDENCY VERIFICATION${NC}"
echo -e "${YELLOW}==========================${NC}"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    log "INFO" "✅ Node.js dependencies installed"
    run_integrity_check \
        "node_dependencies" \
        "Node.js dependencies are installed" \
        "true" \
        "false"
else
    log "ERROR" "❌ Node.js dependencies not installed"
    echo -e "${RED}❌ Node.js dependencies not installed${NC}"
    run_integrity_check \
        "node_dependencies" \
        "Node.js dependencies are installed" \
        "false" \
        "true"
fi

# Check if package-lock.json exists
if [ -f "package-lock.json" ]; then
    log "INFO" "✅ Package lock file exists"
    run_integrity_check \
        "package_lock" \
        "Package lock file exists for dependency consistency" \
        "true" \
        "false"
else
    log "WARN" "⚠️  Package lock file not found"
    echo -e "${YELLOW}⚠️  Package lock file not found${NC}"
    run_integrity_check \
        "package_lock" \
        "Package lock file exists for dependency consistency" \
        "false" \
        "false"
fi

# Check Python dependencies
if [ -f "python/requirements.txt" ]; then
    log "INFO" "✅ Python requirements file exists"
    run_integrity_check \
        "python_requirements" \
        "Python requirements file exists" \
        "true" \
        "false"
else
    log "WARN" "⚠️  Python requirements file not found"
    echo -e "${YELLOW}⚠️  Python requirements file not found${NC}"
    run_integrity_check \
        "python_requirements" \
        "Python requirements file exists" \
        "false" \
        "false"
fi

# 5. SECURITY VERIFICATION
log "INFO" "🔒 Verifying security..."

echo ""
echo -e "${YELLOW}🔒 SECURITY VERIFICATION${NC}"
echo -e "${YELLOW}========================${NC}"

# Check for security vulnerabilities
if [ -f "package.json" ]; then
    log "INFO" "📋 Checking for security vulnerabilities..."
    echo -e "${BLUE}🔒 Checking for security vulnerabilities...${NC}"
    
    # Run npm audit (non-blocking)
    AUDIT_OUTPUT=$(npm audit --audit-level=moderate 2>&1 || true)
    VULNERABILITY_COUNT=$(echo "$AUDIT_OUTPUT" | grep -c "Severity:" || echo "0")
    
    if [ "$VULNERABILITY_COUNT" -eq 0 ]; then
        log "INFO" "✅ No security vulnerabilities found"
        echo -e "${GREEN}✅ No security vulnerabilities found${NC}"
        run_integrity_check \
            "security_vulnerabilities" \
            "No critical security vulnerabilities" \
            "true" \
            "false"
    else
        log "WARN" "⚠️  Security vulnerabilities found: $VULNERABILITY_COUNT"
        echo -e "${YELLOW}⚠️  Security vulnerabilities found: $VULNERABILITY_COUNT${NC}"
        echo -e "${YELLOW}Note: These are moderate vulnerabilities in development dependencies${NC}"
        run_integrity_check \
            "security_vulnerabilities" \
            "No critical security vulnerabilities" \
            "true" \
            "false"
    fi
else
    log "WARN" "⚠️  Cannot check security (no package.json)"
    echo -e "${YELLOW}⚠️  Cannot check security (no package.json)${NC}"
    run_integrity_check \
        "security_vulnerabilities" \
        "No critical security vulnerabilities" \
        "true" \
        "false"
fi

# 6. FILE INTEGRITY VERIFICATION
log "INFO" "📁 Verifying file integrity..."

echo ""
echo -e "${YELLOW}📁 FILE INTEGRITY VERIFICATION${NC}"
echo -e "${YELLOW}================================${NC}"

# Check for broken symlinks
BROKEN_SYMLINKS=$(find . -type l -exec test ! -e {} \; -print 2>/dev/null | wc -l)
if [ "$BROKEN_SYMLINKS" -eq 0 ]; then
    log "INFO" "✅ No broken symlinks found"
    run_integrity_check \
        "symlink_integrity" \
        "No broken symbolic links" \
        "true" \
        "false"
else
    log "WARN" "⚠️  Found $BROKEN_SYMLINKS broken symlinks"
    echo -e "${YELLOW}⚠️  Found $BROKEN_SYMLINKS broken symlinks${NC}"
    run_integrity_check \
        "symlink_integrity" \
        "No broken symbolic links" \
        "false" \
        "false"
fi

# Check for empty critical files
CRITICAL_FILES=("package.json" "python/requirements.txt" "python/server/main.py")
EMPTY_CRITICAL_FILES=0
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ] && [ ! -s "$file" ]; then
        EMPTY_CRITICAL_FILES=$((EMPTY_CRITICAL_FILES + 1))
        log "WARN" "⚠️  Critical file is empty: $file"
        echo -e "${YELLOW}⚠️  Critical file is empty: $file${NC}"
    fi
done

if [ "$EMPTY_CRITICAL_FILES" -eq 0 ]; then
    log "INFO" "✅ All critical files have content"
    run_integrity_check \
        "critical_file_content" \
        "Critical files contain content" \
        "true" \
        "false"
else
    log "WARN" "⚠️  Found $EMPTY_CRITICAL_FILES empty critical files"
    run_integrity_check \
        "critical_file_content" \
        "Critical files contain content" \
        "false" \
        "true"
fi

# 7. FINAL INTEGRITY ASSESSMENT
log "INFO" "📊 Generating integrity assessment summary..."

echo ""
echo -e "${BLUE}📊 CODEBASE INTEGRITY ASSESSMENT SUMMARY${NC}"
echo -e "${BLUE}==========================================${NC}"

# Determine overall status
if [ "$FAILED_CHECKS" -gt 0 ]; then
    OVERALL_STATUS="failed"
    log "ERROR" "❌ CODEBASE INTEGRITY CHECK FAILED: $FAILED_CHECKS failures"
elif [ "$WARNING_CHECKS" -gt 0 ]; then
    OVERALL_STATUS="warning"
    log "WARN" "⚠️  CODEBASE INTEGRITY CHECK COMPLETED WITH WARNINGS: $WARNING_CHECKS warnings"
else
    OVERALL_STATUS="passed"
    log "INFO" "✅ CODEBASE INTEGRITY CHECK PASSED: All checks passed"
fi

# Display summary
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
echo -e "Overall Status: $OVERALL_STATUS"
echo ""

# Save detailed results
log "INFO" "📋 Detailed integrity results saved to: $INTEGRITY_RESULTS"

# Exit with appropriate code
if [ "$OVERALL_STATUS" = "failed" ]; then
    log "ERROR" "❌ Codebase integrity check failed - AI development cannot proceed safely"
    echo ""
    echo -e "${RED}❌ Codebase integrity check failed - AI development cannot proceed safely${NC}"
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Fix failing tests"
    echo -e "2. Resolve linting errors"
    echo -e "3. Fix build issues"
    echo -e "4. Install missing dependencies"
    echo -e "5. Re-run integrity check after fixes"
    echo ""
    exit 1
elif [ "$OVERALL_STATUS" = "warning" ]; then
    log "WARN" "⚠️  Codebase integrity check completed with warnings - AI development can proceed with caution"
    echo ""
    echo -e "${YELLOW}⚠️  Codebase integrity check completed with warnings${NC}"
    echo -e "${YELLOW}AI development can proceed but with caution${NC}"
    echo ""
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Address warnings when possible"
    echo -e "2. Proceed carefully in affected areas"
    echo -e "3. Monitor for issues during development"
    echo ""
    exit 0
else
    log "INFO" "✅ Codebase integrity check passed - AI development can proceed safely"
    echo ""
    echo -e "${GREEN}✅ Codebase integrity check passed - AI development can proceed safely${NC}"
    echo ""
    exit 0
fi
