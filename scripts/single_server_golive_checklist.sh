#!/bin/bash
# MEHKO.ai — Single-Server Go-Live Checklist
# Usage: bash single_server_golive_checklist.sh
# Requires: docker-compose, curl, jq

set -euo pipefail

# Configuration
API_HOST="${API_HOST:-https://api.mehko.ai}"
APP_SLUG="${APP_SLUG:-alameda_county_mehko}"
FORM_ID="${FORM_ID:-MEHKO_APP_SOP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 0) Context =============================================${NC}"
echo "API_HOST=${API_HOST}"
echo "APP_SLUG=${APP_SLUG}"
echo "FORM_ID=${FORM_ID}"
echo -e "${BLUE}============================================================${NC}"
echo

echo -e "${BLUE}=== 1) Containers healthy ==================================${NC}"
# Try to find the project directory
PROJECT_DIR=""
if [[ -f "docker-compose.yml" ]]; then
    PROJECT_DIR="."
elif [[ -f "../docker-compose.yml" ]]; then
    PROJECT_DIR=".."
elif [[ -d "$HOME/mehko-ai" && -f "$HOME/mehko-ai/docker-compose.yml" ]]; then
    PROJECT_DIR="$HOME/mehko-ai"
else
    echo -e "${YELLOW}⚠️  Could not find project directory with docker-compose.yml${NC}"
    PROJECT_DIR="."
fi

( cd "$PROJECT_DIR" && docker-compose ps ) || true
echo

echo -e "${YELLOW}Last 40 lines of fastapi-worker logs:${NC}"
( cd "$PROJECT_DIR" && docker-compose logs --tail=40 fastapi-worker ) || true
echo

echo -e "${BLUE}=== 2) Public health checks ================================${NC}"
echo -e "${YELLOW}- /health (expect {\"ok\":true})${NC}"
if curl -fsS "${API_HOST}/health" | jq -e '.ok == true' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ /health OK${NC}"
else
    echo -e "${RED}❌ /health failed${NC}"
fi
echo

echo -e "${YELLOW}- /api/ai-status (expect operational status)${NC}"
if curl -fsS "${API_HOST}/api/ai-status" | jq -e '.status == "operational"' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ AI service operational${NC}"
else
    echo -e "${RED}❌ AI service not operational${NC}"
fi
echo

echo -e "${YELLOW}- /api/apps (expect list of counties)${NC}"
if curl -fsS "${API_HOST}/api/apps" | jq -e 'type == "array" and length > 0' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Apps API returning county list${NC}"
else
    echo -e "${RED}❌ Apps API failed${NC}"
fi
echo

echo -e "${BLUE}=== 3) Core endpoints (content types) ======================${NC}"
check_ct () {
  local url="$1"
  local expected_type="$2"
  printf -- "${YELLOW}URL: %s${NC}\n" "$url"
  
  # Use GET request with -D - -o /dev/null to get headers only (FastAPI doesn't support HEAD for these endpoints)
  local response=$(curl -s -D - -o /dev/null "$url" 2>/dev/null || echo "HTTP/1.1 000 Connection Failed")
  local http_status=$(echo "$response" | awk '/^HTTP/{print $2}' | head -1)
  local content_type=$(echo "$response" | awk 'BEGIN{IGNORECASE=1}/^content-type:/{print $2}' | head -1)
  
  if [[ "$http_status" =~ ^[23] ]]; then
    echo -e "  ${GREEN}-> HTTP $http_status${NC}"
    echo -e "  ${GREEN}-> Content-Type: $content_type${NC}"
    if [[ "$expected_type" && "$content_type" == *"$expected_type"* ]]; then
      echo -e "  ${GREEN}✅ Content type matches expected ($expected_type)${NC}"
    elif [[ "$expected_type" ]]; then
      echo -e "  ${YELLOW}⚠️  Content type doesn't match expected ($expected_type)${NC}"
    fi
  else
    echo -e "  ${RED}-> HTTP $http_status${NC}"
    echo -e "  ${RED}❌ Request failed${NC}"
  fi
  echo
}

check_ct "${API_HOST}/api/apps/${APP_SLUG}/forms/${FORM_ID}/acroform-definition" "application/json"
check_ct "${API_HOST}/api/apps/${APP_SLUG}/forms/${FORM_ID}/text" "application/json"
check_ct "${API_HOST}/api/apps/${APP_SLUG}/forms/${FORM_ID}/pdf" "application/pdf"
check_ct "${API_HOST}/api/apps/${APP_SLUG}/forms/${FORM_ID}/acroform-pdf" "application/pdf"

echo -e "${BLUE}=== 4) CORS preflight from mehko.ai ========================${NC}"
cors_response=$(curl -i -X OPTIONS "${API_HOST}/api/apps/${APP_SLUG}/forms/${FORM_ID}/acroform-definition" \
  -H 'Origin: https://mehko.ai' \
  -H 'Access-Control-Request-Method: GET' 2>/dev/null || echo "Connection failed")

if echo "$cors_response" | grep -qi "access-control-allow-origin.*mehko.ai"; then
    echo -e "${GREEN}✅ CORS preflight successful${NC}"
else
    echo -e "${RED}❌ CORS preflight failed${NC}"
fi

echo "$cors_response" | awk 'BEGIN{IGNORECASE=1}/^HTTP|access-control-allow-origin|access-control-allow-methods|access-control-allow-headers/'
echo

echo -e "${BLUE}=== 5) API functionality tests ==============================${NC}"

# Test apps list
echo -e "${YELLOW}Testing /api/apps endpoint:${NC}"
apps_response=$(curl -fsS "${API_HOST}/api/apps" 2>/dev/null || echo "[]")
if echo "$apps_response" | jq -e 'type == "array" and length > 0' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Apps list returned $(echo "$apps_response" | jq 'length') counties${NC}"
else
    echo -e "${RED}❌ Apps list failed${NC}"
fi

# Test specific app
echo -e "${YELLOW}Testing /api/apps/${APP_SLUG} endpoint:${NC}"
app_response=$(curl -fsS "${API_HOST}/api/apps/${APP_SLUG}" 2>/dev/null || echo "{}")
if echo "$app_response" | jq -e 'has("id")' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ App details returned for ${APP_SLUG}${NC}"
else
    echo -e "${RED}❌ App details failed for ${APP_SLUG}${NC}"
fi

# Test AI chat endpoint (basic)
echo -e "${YELLOW}Testing AI chat endpoint:${NC}"
ai_response=$(curl -fsS -X POST "${API_HOST}/api/ai-chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","context":{}}' 2>/dev/null || echo "{}")
if echo "$ai_response" | jq -e 'has("response") or has("error")' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ AI chat endpoint responding${NC}"
else
    echo -e "${RED}❌ AI chat endpoint failed${NC}"
fi
echo

echo -e "${BLUE}=== 6) SSL and Security =====================================${NC}"
echo -e "${YELLOW}Checking SSL certificate:${NC}"
if echo | openssl s_client -servername api.mehko.ai -connect api.mehko.ai:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
    echo -e "${GREEN}✅ SSL certificate valid${NC}"
else
    echo -e "${RED}❌ SSL certificate check failed${NC}"
fi
echo

echo -e "${BLUE}=== 7) Frontend integration test ============================${NC}"
echo -e "${YELLOW}Testing that Pages does NOT serve API routes:${NC}"
pages_api_response=$(curl -I https://mehko.ai/api/ping 2>/dev/null || echo "Connection failed")
if echo "$pages_api_response" | grep -qi "location.*api.mehko.ai"; then
    echo -e "${GREEN}✅ Pages correctly redirects API calls${NC}"
elif echo "$pages_api_response" | grep -qi "404\|not found"; then
    echo -e "${GREEN}✅ Pages correctly returns 404 for API routes${NC}"
else
    echo -e "${YELLOW}⚠️  Pages API route behavior unclear${NC}"
fi
echo "$pages_api_response" | awk '/^HTTP|^location|^content-type/'
echo

echo -e "${BLUE}=== 8) Troubleshooting quick commands ======================${NC}"
cat <<EOS
# Rebuild only FastAPI (if code changed)
cd $PROJECT_DIR
docker-compose up -d --build fastapi-worker
docker-compose logs -f fastapi-worker

# Reload Caddy (if Caddyfile changed or cert retry)
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Check service health
curl -s ${API_HOST}/health | jq .
curl -s ${API_HOST}/api/ai-status | jq .
curl -s ${API_HOST}/api/apps | jq .

# View all logs
docker-compose logs -f

# Restart all services
docker-compose restart

# Check container resource usage
docker stats --no-stream

# Test specific endpoints
curl -I ${API_HOST}/api/apps/${APP_SLUG}/forms/${FORM_ID}/pdf
curl -I ${API_HOST}/api/apps/${APP_SLUG}/forms/${FORM_ID}/acroform-definition
EOS
echo

echo -e "${BLUE}=== 9) Performance check ====================================${NC}"
echo -e "${YELLOW}Testing response times:${NC}"
for endpoint in "/health" "/api/ai-status" "/api/apps"; do
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "${API_HOST}${endpoint}" 2>/dev/null || echo "0")
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        echo -e "${GREEN}✅ ${endpoint}: ${response_time}s${NC}"
    else
        echo -e "${YELLOW}⚠️  ${endpoint}: ${response_time}s (slow)${NC}"
    fi
done
echo

echo -e "${GREEN}=== Done ====================================================${NC}"
echo -e "${GREEN}Single-server architecture validation complete!${NC}"
