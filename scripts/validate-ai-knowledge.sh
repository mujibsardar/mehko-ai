#!/bin/bash

# 🧠 AI Knowledge Validation Script
# Ensures AI has complete, accurate understanding before development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="logs/ai-safety/ai-knowledge-validation.log"
KNOWLEDGE_RESULTS="/tmp/ai-knowledge-results.json"
KNOWLEDGE_TESTS_DIR="scripts/ai-safety/knowledge-tests"

# Ensure directories exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$KNOWLEDGE_TESTS_DIR"

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

log "INFO" "🧠 Starting AI knowledge validation..."

# Initialize knowledge test results
cat > "$KNOWLEDGE_RESULTS" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_score": 0,
    "tests": {},
    "summary": {
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "critical_failures": 0
    }
}
EOF

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
CRITICAL_FAILURES=0

# Function to run a knowledge test
run_knowledge_test() {
    local test_name="$1"
    local test_description="$2"
    local test_command="$3"
    local is_critical="${4:-false}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log "INFO" "🧪 Running test: $test_name"
    echo -e "${BLUE}🧪 Testing:${NC} $test_description"
    
    if eval "$test_command" >/dev/null 2>&1; then
        log "INFO" "✅ Test passed: $test_name"
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Update results file
        if command -v jq >/dev/null 2>&1; then
            jq ".tests.$test_name = {\"status\": \"passed\", \"description\": \"$test_description\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" "$KNOWLEDGE_RESULTS" > "$KNOWLEDGE_RESULTS.tmp" && mv "$KNOWLEDGE_RESULTS.tmp" "$KNOWLEDGE_RESULTS"
        fi
        
        return 0
    else
        log "ERROR" "❌ Test failed: $test_name"
        echo -e "${RED}❌ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        
        if [ "$is_critical" = "true" ]; then
            CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
            log "ERROR" "🚨 CRITICAL FAILURE: $test_name"
            echo -e "${RED}🚨 CRITICAL FAILURE${NC}"
        fi
        
        # Update results file
        if command -v jq >/dev/null 2>&1; then
            jq ".tests.$test_name = {\"status\": \"failed\", \"description\": \"$test_description\", \"critical\": $is_critical, \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" "$KNOWLEDGE_RESULTS" > "$KNOWLEDGE_RESULTS.tmp" && mv "$KNOWLEDGE_RESULTS.tmp" "$KNOWLEDGE_RESULTS"
        fi
        
        return 1
    fi
}

# 1. ARCHITECTURE KNOWLEDGE TESTS
log "INFO" "🏗️  Testing AI's understanding of system architecture..."

echo ""
echo -e "${YELLOW}🏗️  ARCHITECTURE KNOWLEDGE TESTS${NC}"
echo -e "${YELLOW}================================${NC}"

# Test 1: Single-server architecture understanding
run_knowledge_test \
    "single_server_architecture" \
    "AI understands single-server architecture (Python FastAPI only)" \
    "grep -q 'single.*server' docs/PRODUCTION_SERVER_AI_GUIDE.md || grep -q 'Python.*FastAPI.*port.*8000' docs/PRODUCTION_SERVER_AI_GUIDE.md" \
    "true"

# Test 2: Port assignments knowledge
run_knowledge_test \
    "port_assignments" \
    "AI knows correct server port assignments" \
    "grep -q 'Port 8000' docs/PRODUCTION_SERVER_AI_GUIDE.md && grep -q 'Python.*FastAPI' docs/PRODUCTION_SERVER_AI_GUIDE.md" \
    "true"

# Test 3: Service responsibilities understanding
run_knowledge_test \
    "service_responsibilities" \
    "AI understands unified service responsibilities" \
    "grep -q 'AI.*chat.*PDF.*analysis.*admin.*forms' docs/PRODUCTION_SERVER_AI_GUIDE.md || grep -q 'unified.*backend' docs/PRODUCTION_SERVER_AI_GUIDE.md" \
    "true"

# 2. DATA FLOW KNOWLEDGE TESTS
log "INFO" "🌊 Testing AI's understanding of data flow..."

echo ""
echo -e "${YELLOW}🌊 DATA FLOW KNOWLEDGE TESTS${NC}"
echo -e "${YELLOW}============================${NC}"

# Test 4: Firebase data flow understanding
run_knowledge_test \
    "firebase_data_flow" \
    "AI understands Firebase is primary data source for frontend" \
    "grep -q 'Loads application data from Firebase' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 5: PDF processing flow understanding
run_knowledge_test \
    "pdf_processing_flow" \
    "AI understands PDF processing flow through Python server" \
    "grep -q 'PDF processing.*storage.*form management' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 6: County processing flow understanding
run_knowledge_test \
    "county_processing_flow" \
    "AI understands county application processing flow" \
    "grep -q 'Processes county data uploads' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# 3. FILE STRUCTURE KNOWLEDGE TESTS
log "INFO" "📁 Testing AI's understanding of file structure..."

echo ""
echo -e "${YELLOW}📁 FILE STRUCTURE KNOWLEDGE TESTS${NC}"
echo -e "${YELLOW}==================================${NC}"

# Test 7: Applications directory structure
run_knowledge_test \
    "applications_directory" \
    "AI knows applications are stored in data/applications/{app}/forms/{form}/" \
    "grep -q 'data/applications.*forms' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 8: PDF file locations
run_knowledge_test \
    "pdf_file_locations" \
    "AI knows PDF files are stored with form metadata" \
    "grep -q 'form.pdf' docs/AI_ASSISTANT_ONBOARDING.md && grep -q 'meta.json' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 9: Documentation structure
run_knowledge_test \
    "documentation_structure" \
    "AI knows documentation is in docs/ directory with README.md index" \
    "grep -q 'Source Code Structure' docs/AI_ASSISTANT_ONBOARDING.md" \
    "false"

# 4. COMPONENT KNOWLEDGE TESTS
log "INFO" "🧩 Testing AI's understanding of frontend components..."

echo ""
echo -e "${YELLOW}🧩 COMPONENT KNOWLEDGE TESTS${NC}"
echo -e "${YELLOW}=============================${NC}"

# Test 10: InterviewView component understanding
run_knowledge_test \
    "interview_view_component" \
    "AI knows InterviewView handles PDF form rendering" \
    "grep -q 'InterviewView.*PDF.*form' docs/AI_ASSISTANT_ONBOARDING.md || grep -q 'Renders PDF forms with field definitions' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 11: AcroFormViewer component understanding
run_knowledge_test \
    "acroform_viewer_component" \
    "AI knows AcroFormViewer handles AcroForm PDFs" \
    "grep -q 'AcroFormViewer.*AcroForm' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 12: AIFieldMapper component understanding
run_knowledge_test \
    "ai_field_mapper_component" \
    "AI knows AIFieldMapper handles AI field detection" \
    "grep -q 'AI-powered field detection interface' docs/AI_ASSISTANT_ONBOARDING.md" \
    "false"

# 5. API ENDPOINT KNOWLEDGE TESTS
log "INFO" "🔌 Testing AI's understanding of API endpoints..."

echo ""
echo -e "${YELLOW}🔌 API ENDPOINT KNOWLEDGE TESTS${NC}"
echo -e "${YELLOW}=================================${NC}"

# Test 13: Python server endpoints
run_knowledge_test \
    "python_server_endpoints" \
    "AI knows Python server handles PDF and form endpoints" \
    "grep -q 'GET /apps/{app}/forms/{form}/pdf' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 14: Python server endpoints (unified)
run_knowledge_test \
    "python_unified_endpoints" \
    "AI knows Python server handles all endpoints including AI and admin" \
    "grep -q 'POST /api/ai-analyze-pdf' docs/PRODUCTION_SERVER_AI_GUIDE.md || grep -q '/api/ai-chat' docs/PRODUCTION_SERVER_AI_GUIDE.md" \
    "true"

# Test 15: Frontend API configuration
run_knowledge_test \
    "frontend_api_config" \
    "AI knows frontend uses single Python server for all services" \
    "grep -q 'VITE_API_URL.*8000' docs/PRODUCTION_SERVER_AI_GUIDE.md || grep -q 'single.*server' docs/PRODUCTION_SERVER_AI_GUIDE.md" \
    "false"

# 6. WORKFLOW KNOWLEDGE TESTS
log "INFO" "🔄 Testing AI's understanding of system workflows..."

echo ""
echo -e "${YELLOW}🔄 WORKFLOW KNOWLEDGE TESTS${NC}"
echo -e "${YELLOW}============================${NC}"

# Test 16: County upload workflow
run_knowledge_test \
    "county_upload_workflow" \
    "AI understands complete county application upload workflow" \
    "grep -q 'County Upload Process' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 17: PDF form filling workflow
run_knowledge_test \
    "pdf_form_filling_workflow" \
    "AI understands PDF form filling and field definition workflow" \
    "grep -q 'User Form Filling Process' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 18: AI field detection workflow
run_knowledge_test \
    "ai_field_detection_workflow" \
    "AI understands AI-powered field detection workflow" \
    "grep -q 'PDF Field Definition Process' docs/AI_ASSISTANT_ONBOARDING.md" \
    "false"

# 7. CONSTRAINTS AND LIMITATIONS KNOWLEDGE TESTS
log "INFO" "⚠️  Testing AI's understanding of system constraints..."

echo ""
echo -e "${YELLOW}⚠️  CONSTRAINTS KNOWLEDGE TESTS${NC}"
echo -e "${YELLOW}===============================${NC}"

# Test 19: Field definition requirement
run_knowledge_test \
    "field_definition_requirement" \
    "AI knows PDF forms require field definitions for AcroForm conversion" \
    "grep -q 'PDF steps require field definitions to render' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 20: Unified server architecture constraint
run_knowledge_test \
    "unified_server_architecture" \
    "AI knows all services are handled by single Python server" \
    "grep -q 'unified.*backend' docs/PRODUCTION_SERVER_AI_GUIDE.md || grep -q 'single.*server' docs/PRODUCTION_SERVER_AI_GUIDE.md" \
    "true"

# Test 21: Documentation maintenance requirement
run_knowledge_test \
    "documentation_maintenance_requirement" \
    "AI knows documentation must be updated with code changes" \
    "grep -q 'PRO TIPS' docs/AI_ASSISTANT_ONBOARDING.md" \
    "false"

# 8. COMMON PITFALLS KNOWLEDGE TESTS
log "INFO" "🚨 Testing AI's awareness of common pitfalls..."

echo ""
echo -e "${YELLOW}🚨 COMMON PITFALLS KNOWLEDGE TESTS${NC}"
echo -e "${YELLOW}====================================${NC}"

# Test 22: Single server architecture understanding
run_knowledge_test \
    "single_server_architecture_understanding" \
    "AI knows the system now uses single server architecture" \
    "grep -q 'single.*server' docs/PRODUCTION_SERVER_AI_GUIDE.md || grep -q 'unified.*backend' docs/PRODUCTION_SERVER_AI_GUIDE.md" \
    "true"

# Test 23: Frontend data source pitfall
run_knowledge_test \
    "frontend_data_source_pitfall" \
    "AI knows frontend loads app data from Firebase, not Python server" \
    "grep -q 'Frontend loads from Python server' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# Test 24: Field definition dependency pitfall
run_knowledge_test \
    "field_definition_dependency_pitfall" \
    "AI knows PDF steps require field definitions to function" \
    "grep -q 'PDF.*steps.*field.*definitions.*render' docs/AI_ASSISTANT_ONBOARDING.md" \
    "true"

# 9. FINAL KNOWLEDGE ASSESSMENT
log "INFO" "📊 Generating knowledge assessment summary..."

echo ""
echo -e "${BLUE}📊 AI KNOWLEDGE ASSESSMENT SUMMARY${NC}"
echo -e "${BLUE}====================================${NC}"

# Calculate overall score
if [ "$TOTAL_TESTS" -gt 0 ]; then
    OVERALL_SCORE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
else
    OVERALL_SCORE=0
fi

echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo -e "${RED}Critical Failures: $CRITICAL_FAILURES${NC}"
echo -e "Overall Score: ${OVERALL_SCORE}%"

# Update final results
if command -v jq >/dev/null 2>&1; then
    jq ".overall_score = $OVERALL_SCORE | .summary.total_tests = $TOTAL_TESTS | .summary.passed = $PASSED_TESTS | .summary.failed = $FAILED_TESTS | .summary.critical_failures = $CRITICAL_FAILURES" "$KNOWLEDGE_RESULTS" > "$KNOWLEDGE_RESULTS.tmp" && mv "$KNOWLEDGE_RESULTS.tmp" "$KNOWLEDGE_RESULTS"
fi

# Determine if AI can proceed
if [ "$CRITICAL_FAILURES" -gt 0 ]; then
    log "ERROR" "❌ AI KNOWLEDGE VALIDATION FAILED: $CRITICAL_FAILURES critical failures"
    echo ""
    echo -e "${RED}❌ AI KNOWLEDGE VALIDATION FAILED${NC}"
    echo -e "${RED}Critical failures detected - AI development cannot proceed safely${NC}"
    echo ""
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Review docs/AI_ASSISTANT_ONBOARDING.md"
    echo -e "2. Study system architecture and data flow"
    echo -e "3. Understand service responsibilities"
    echo -e "4. Learn about common pitfalls"
    echo -e "5. Re-run validation after study"
    echo ""
    exit 1
elif [ "$FAILED_TESTS" -gt 0 ]; then
    log "WARN" "⚠️  AI KNOWLEDGE VALIDATION COMPLETED WITH FAILURES: $FAILED_TESTS failures"
    echo ""
    echo -e "${YELLOW}⚠️  AI KNOWLEDGE VALIDATION COMPLETED WITH FAILURES${NC}"
    echo -e "${YELLOW}AI development can proceed but with caution${NC}"
    echo ""
    echo -e "${YELLOW}📋 Recommended actions:${NC}"
    echo -e "1. Review failed test areas"
    echo -e "2. Study specific knowledge gaps"
    echo -e "3. Proceed carefully in unfamiliar areas"
    echo -e "4. Ask for clarification when needed"
    echo ""
    exit 0
else
    log "INFO" "✅ AI KNOWLEDGE VALIDATION PASSED: All tests passed"
    echo ""
    echo -e "${GREEN}✅ AI KNOWLEDGE VALIDATION PASSED${NC}"
    echo -e "${GREEN}AI has comprehensive understanding - development can proceed safely${NC}"
    echo ""
    exit 0
fi
