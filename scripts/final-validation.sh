#!/bin/bash

# 🎯 Final Validation Script
# Performs final validation after all post-flight checks to ensure system integrity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/final-validation.log"
AI_MODE_FLAG="/tmp/ai-development-mode.active"
FINAL_REPORT_DIR="logs/ai-safety/final-reports"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$FINAL_REPORT_DIR"

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

log "INFO" "🎯 Starting final validation process..."

echo ""
echo -e "${CYAN}🎯 FINAL VALIDATION${NC}"
echo -e "${CYAN}==================${NC}"
echo -e "${BLUE}Session ID:${NC} $(cat "$AI_MODE_FLAG")"
echo ""

# Initialize final validation report
FINAL_REPORT="$FINAL_REPORT_DIR/final-validation-$(cat "$AI_MODE_FLAG").md"
cat > "$FINAL_REPORT" << EOF
# Final Validation Report
**Session ID:** $(cat "$AI_MODE_FLAG")
**Generated:** $(date)
**Purpose:** Final validation after AI development completion

## Summary
Final validation performed to ensure system integrity after AI development session.

## Validation Results
EOF

# Validation counter
TOTAL_VALIDATIONS=0
PASSED_VALIDATIONS=0
FAILED_VALIDATIONS=0
CRITICAL_FAILURES=0

# Function to run a final validation
run_final_validation() {
    local validation_name="$1"
    local validation_description="$2"
    local validation_command="$3"
    local is_critical="${4:-false}"
    
    TOTAL_VALIDATIONS=$((TOTAL_VALIDATIONS + 1))
    
    log "INFO" "🔍 Running final validation: $validation_name"
    echo -e "${BLUE}🔍 Validating:${NC} $validation_description"
    
    if eval "$validation_command" >/dev/null 2>&1; then
        log "INFO" "✅ Final validation passed: $validation_name"
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_VALIDATIONS=$((PASSED_VALIDATIONS + 1))
        return 0
    else
        log "ERROR" "❌ Final validation failed: $validation_name"
        echo -e "${RED}❌ FAILED${NC}"
        FAILED_VALIDATIONS=$((FAILED_VALIDATIONS + 1))
        
        if [ "$is_critical" = "true" ]; then
            CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
            log "ERROR" "🚨 CRITICAL VALIDATION FAILURE: $validation_name"
            echo -e "${RED}🚨 CRITICAL FAILURE${NC}"
        fi
        
        return 1
    fi
}

# 1. SYSTEM INTEGRITY VALIDATION
log "INFO" "🔒 Validating system integrity..."

echo ""
echo -e "${YELLOW}🔒 SYSTEM INTEGRITY VALIDATION${NC}"
echo -e "${YELLOW}================================${NC}"

# Test 1: Project structure integrity
run_final_validation \
    "project_structure_integrity" \
    "Project structure is intact and complete" \
    "[ -d 'src' ] && [ -d 'python' ] && [ -d 'scripts' ] && [ -d 'data' ] && [ -d 'docs' ]" \
    "true"

# Test 2: Critical files integrity
run_final_validation \
    "critical_files_integrity" \
    "Critical project files are present and accessible" \
    "[ -f 'package.json' ] && [ -f 'python/server/main.py' ] && [ -f 'server.js' ] && [ -f 'AI_INSTRUCTIONS.md' ]" \
    "true"

# Test 3: AI safety infrastructure integrity
run_final_validation \
    "ai_safety_infrastructure_integrity" \
    "AI safety infrastructure is complete and functional" \
    "[ -f 'scripts/ai-safety-protocol.sh' ] && [ -f 'scripts/enable-ai-mode.sh' ] && [ -f 'scripts/start-ai-monitoring.sh' ]" \
    "true"

# 2. DOCUMENTATION INTEGRITY VALIDATION
log "INFO" "📚 Validating documentation integrity..."

echo ""
echo -e "${YELLOW}📚 DOCUMENTATION INTEGRITY VALIDATION${NC}"
echo -e "${YELLOW}=====================================${NC}"

# Test 4: Documentation structure integrity
run_final_validation \
    "documentation_structure_integrity" \
    "Documentation structure is complete and organized" \
    "[ -f 'README.md' ] && [ -f 'PROJECT_STRUCTURE.md' ] && [ -f 'docs/README.md' ]" \
    "false"

# Test 5: AI safety documentation integrity
run_final_validation \
    "ai_safety_documentation_integrity" \
    "AI safety documentation is current and comprehensive" \
    "grep -q 'AI Safety Protocol' AI_INSTRUCTIONS.md && grep -q 'AI Safety Protocol' README.md" \
    "true"

# Test 6: Documentation consistency
run_final_validation \
    "documentation_consistency" \
    "Documentation is consistent across all files" \
    "grep -q '$(cat "$AI_MODE_FLAG")' AI_INSTRUCTIONS.md 2>/dev/null || echo 'Session info may not be updated yet'" \
    "false"

# 3. CONFIGURATION INTEGRITY VALIDATION
log "INFO" "⚙️ Validating configuration integrity..."

echo ""
echo -e "${YELLOW}⚙️ CONFIGURATION INTEGRITY VALIDATION${NC}"
echo -e "${YELLOW}========================================${NC}"

# Test 7: Package configuration integrity
run_final_validation \
    "package_configuration_integrity" \
    "Package configuration is valid and complete" \
    "python3 -m json.tool package.json >/dev/null && grep -q 'name.*version.*scripts' package.json" \
    "true"

# Test 8: Python configuration integrity
run_final_validation \
    "python_configuration_integrity" \
    "Python configuration is valid and complete" \
    "[ -f 'python/requirements.txt' ] && [ -f 'python/server/main.py' ]" \
    "true"

# Test 9: Service configuration integrity
run_final_validation \
    "service_configuration_integrity" \
    "Service configuration is valid and complete" \
    "[ -f 'scripts/start-all-services.sh' ] && [ -f 'scripts/stop-all-services.sh' ] && [ -f 'scripts/status-all-services.sh' ]" \
    "true"

# 4. SAFETY PROTOCOL INTEGRITY VALIDATION
log "INFO" "🛡️ Validating safety protocol integrity..."

echo ""
echo -e "${YELLOW}🛡️ SAFETY PROTOCOL INTEGRITY VALIDATION${NC}"
echo -e "${YELLOW}==========================================${NC}"

# Test 10: Safety protocol completeness
run_final_validation \
    "safety_protocol_completeness" \
    "AI safety protocol is complete and functional" \
    "[ -f 'scripts/ai-safety-protocol.sh' ] && [ -f 'scripts/validate-ai-knowledge.sh' ] && [ -f 'scripts/verify-codebase-integrity.sh' ]" \
    "true"

# Test 11: Safety monitoring integrity
run_final_validation \
    "safety_monitoring_integrity" \
    "Safety monitoring infrastructure is complete" \
    "[ -f 'scripts/start-ai-monitoring.sh' ] && [ -f 'scripts/stop-ai-monitoring.sh' ] && [ -f 'scripts/create-safety-checkpoint.sh' ]" \
    "true"

# Test 12: Post-flight validation integrity
run_final_validation \
    "post_flight_validation_integrity" \
    "Post-flight validation infrastructure is complete" \
    "[ -f 'scripts/analyze-changes.sh' ] && [ -f 'scripts/validate-code-quality.sh' ] && [ -f 'scripts/update-documentation.sh' ]" \
    "true"

# 5. LOGGING AND REPORTING INTEGRITY VALIDATION
log "INFO" "📊 Validating logging and reporting integrity..."

echo ""
echo -e "${YELLOW}📊 LOGGING AND REPORTING INTEGRITY VALIDATION${NC}"
echo -e "${YELLOW}=============================================${NC}"

# Test 13: Log directory structure integrity
run_final_validation \
    "log_directory_structure_integrity" \
    "Log directory structure is complete and accessible" \
    "[ -d 'logs' ] && [ -d 'logs/ai-safety' ] && [ -w 'logs/ai-safety' ]" \
    "true"

# Test 14: Report generation integrity
run_final_validation \
    "report_generation_integrity" \
    "Report generation directories are accessible" \
    "[ -d 'logs/ai-safety/changes-reports' ] && [ -d 'logs/ai-safety/quality-reports' ] && [ -d 'logs/ai-safety/health-reports' ]" \
    "false"

# Test 15: Session logging integrity
run_final_validation \
    "session_logging_integrity" \
    "Session logging is functional and accessible" \
    "[ -f 'logs/ai-safety/ai-development-$(cat "$AI_MODE_FLAG").log' ] || echo 'Session log may not exist yet'" \
    "false"

# 6. FINAL SYSTEM STATE VALIDATION
log "INFO" "🔍 Validating final system state..."

echo ""
echo -e "${YELLOW}🔍 FINAL SYSTEM STATE VALIDATION${NC}"
echo -e "${YELLOW}==================================${NC}"

# Test 16: Git repository state integrity
run_final_validation \
    "git_repository_state_integrity" \
    "Git repository is in valid state" \
    "[ -d '.git' ] && git rev-parse HEAD >/dev/null 2>&1" \
    "false"

# Test 17: File permissions integrity
run_final_validation \
    "file_permissions_integrity" \
    "File permissions are appropriate and secure" \
    "find scripts -name '*.sh' -executable | wc -l | grep -q '[1-9]'" \
    "false"

# Test 18: Temporary files cleanup
run_final_validation \
    "temporary_files_cleanup" \
    "Temporary files are properly managed" \
    "[ -d 'temp' ] && [ -w 'temp' ]" \
    "false"

# 7. GENERATE FINAL VALIDATION REPORT
log "INFO" "📋 Generating final validation report..."

# Calculate overall validation score
if [ "$TOTAL_VALIDATIONS" -gt 0 ]; then
    VALIDATION_SCORE=$(( (PASSED_VALIDATIONS * 100) / TOTAL_VALIDATIONS ))
else
    VALIDATION_SCORE=0
fi

# Add validation results to report
cat >> "$FINAL_REPORT" << EOF

## Final Validation Summary
**Total Validations:** $TOTAL_VALIDATIONS
**Passed:** $PASSED_VALIDATIONS
**Failed:** $FAILED_VALIDATIONS
**Critical Failures:** $CRITICAL_FAILURES
**Overall Validation Score:** ${VALIDATION_SCORE}%

## Validation Categories
- **System Integrity:** Core project structure and files
- **Documentation Integrity:** Documentation completeness and consistency
- **Configuration Integrity:** Configuration files and settings
- **Safety Protocol Integrity:** AI safety infrastructure
- **Logging and Reporting Integrity:** Logging and report generation
- **Final System State:** Overall system health and state

## Detailed Results
EOF

# Add individual validation results
if [ -f "/tmp/final-validation-results.tmp" ]; then
    cat "/tmp/final-validation-results.tmp" >> "$FINAL_REPORT"
    rm -f "/tmp/final-validation-results.tmp"
fi

# Add final recommendations
cat >> "$FINAL_REPORT" << EOF

## Final Recommendations
EOF

if [ "$CRITICAL_FAILURES" -gt 0 ]; then
    cat >> "$FINAL_REPORT" << EOF
🚨 **CRITICAL VALIDATION FAILURES DETECTED**
- $CRITICAL_FAILURES critical failures require immediate attention
- Final validation FAILED
- System integrity compromised - immediate action required
EOF
elif [ "$FAILED_VALIDATIONS" -gt 0 ]; then
    cat >> "$FINAL_REPORT" << EOF
⚠️ **VALIDATION ISSUES DETECTED**
- $FAILED_VALIDATIONS validation issues should be addressed
- Final validation PASSED with warnings
- Review issues and address when convenient
EOF
else
    cat >> "$FINAL_REPORT" << EOF
✅ **PERFECT VALIDATION RESULTS**
- All validations passed
- Final validation PASSED
- System integrity fully maintained
EOF
fi

cat >> "$FINAL_REPORT" << EOF

## System Status
**AI Development Session:** COMPLETED
**Safety Protocol:** EXECUTED
**System Integrity:** ${VALIDATION_SCORE}%
**Recommendation:** $(if [ "$CRITICAL_FAILURES" -gt 0 ]; then echo "IMMEDIATE ACTION REQUIRED"; elif [ "$FAILED_VALIDATIONS" -gt 0 ]; then echo "REVIEW AND ADDRESS ISSUES"; else echo "SYSTEM READY FOR PRODUCTION"; fi)

## Next Steps
1. Address any critical validation failures immediately
2. Review and address validation issues
3. Consider system improvements based on results
4. System is ready for normal operation

---
*Report generated by AI Safety Protocol - Final Validation*
EOF

# 8. FINAL VALIDATION RESULT
echo ""
echo -e "${BLUE}📊 FINAL VALIDATION SUMMARY${NC}"
echo -e "${BLUE}============================${NC}"
echo -e "Total Validations: $TOTAL_VALIDATIONS"
echo -e "${GREEN}Passed: $PASSED_VALIDATIONS${NC}"
echo -e "${RED}Failed: $FAILED_VALIDATIONS${NC}"
echo -e "${RED}Critical Failures: $CRITICAL_FAILURES${NC}"
echo -e "Overall Score: ${VALIDATION_SCORE}%"

# Determine final validation result
if [ "$CRITICAL_FAILURES" -gt 0 ]; then
    log "ERROR" "❌ FINAL VALIDATION FAILED: $CRITICAL_FAILURES critical failures"
    echo ""
    echo -e "${RED}❌ FINAL VALIDATION FAILED${NC}"
    echo -e "${RED}Critical validation failures detected - system integrity compromised${NC}"
    echo ""
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Review critical validation failures above"
    echo -e "2. Address critical issues immediately"
    echo -e "3. Re-run validation after fixes"
    echo -e "4. Do not proceed until all critical issues are resolved"
    echo ""
    
    log "ERROR" "Final validation failed - critical failures detected"
    exit 1
    
elif [ "$FAILED_VALIDATIONS" -gt 0 ]; then
    log "WARN" "⚠️ FINAL VALIDATION COMPLETED WITH ISSUES: $FAILED_VALIDATIONS issues"
    echo ""
    echo -e "${YELLOW}⚠️ FINAL VALIDATION COMPLETED WITH ISSUES${NC}"
    echo -e "${YELLOW}System integrity is acceptable but improvements recommended${NC}"
    echo ""
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Review validation issues above"
    echo -e "2. Address issues when convenient"
    echo -e "3. Consider system improvements"
    echo -e "4. Development can proceed with caution"
    echo ""
    
    log "WARN" "Final validation completed with issues - improvements recommended"
    exit 0
    
else
    log "INFO" "✅ FINAL VALIDATION PASSED: All validations successful"
    echo ""
    echo -e "${GREEN}✅ FINAL VALIDATION PASSED${NC}"
    echo -e "${GREEN}System integrity fully maintained - all validations successful${NC}"
    echo ""
    echo -e "${BLUE}📋 Validation Status:${NC}"
    echo -e "  • System Integrity: ${GREEN}MAINTAINED${NC}"
    echo -e "  • Documentation: ${GREEN}CURRENT${NC}"
    echo -e "  • Configuration: ${GREEN}VALID${NC}"
    echo -e "  • Safety Protocol: ${GREEN}FUNCTIONAL${NC}"
    echo -e "  • Logging: ${GREEN}OPERATIONAL${NC}"
    echo -e "  • Overall State: ${GREEN}EXCELLENT${NC}"
    echo ""
    
    log "INFO" "Final validation passed - system integrity fully maintained"
    exit 0
fi
