#!/bin/bash

# Script hardening - exit on any error
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 MEHKO AI Services Status Check${NC}"
echo "=========================================="
echo ""

# Function to check if a port is in use and get process info
check_port_status() {
    local port=$1
    local service_name=$2
    local health_url=$3
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null | head -1)
        local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "Unknown")
        
        echo -e "${GREEN}✅ $service_name is RUNNING${NC}"
        echo -e "   Port: ${CYAN}$port${NC}"
        echo -e "   PID: ${CYAN}$pid${NC}"
        echo -e "   Process: ${CYAN}$process_name${NC}"
        
        # Try to check health endpoint if provided
        if [ -n "$health_url" ]; then
            if curl -s --max-time 5 "$health_url" > /dev/null 2>&1; then
                echo -e "   Health: ${GREEN}✓ Healthy${NC}"
            else
                echo -e "   Health: ${YELLOW}⚠️  Unhealthy (endpoint not responding)${NC}"
            fi
        fi
        
        return 0
    else
        echo -e "${RED}❌ $service_name is NOT RUNNING${NC}"
        echo -e "   Port: ${CYAN}$port${NC}"
        return 1
    fi
}

# Function to check service uptime
get_uptime() {
    local pid=$1
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        local start_time=$(ps -p "$pid" -o lstart= 2>/dev/null)
        if [ -n "$start_time" ]; then
            echo -e "   Started: ${CYAN}$start_time${NC}"
        fi
    fi
}

# Check Python FastAPI server
echo -e "${YELLOW}🐍 Python FastAPI Server (PDF Service)${NC}"
echo "----------------------------------------"
if check_port_status 8000 "Python FastAPI" "http://localhost:8000/health"; then
    PYTHON_PID=$(lsof -Pi :8000 -sTCP:LISTEN -t 2>/dev/null | head -1)
    get_uptime "$PYTHON_PID"
fi
echo ""

# Check Node.js server
echo -e "${YELLOW}🟢 Node.js Server (AI Chat & API)${NC}"
echo "----------------------------------------"
if check_port_status 3000 "Node.js Server" "http://localhost:3000/api/ai-chat"; then
    NODE_PID=$(lsof -Pi :3000 -sTCP:LISTEN -t 2>/dev/null | head -1)
    get_uptime "$NODE_PID"
fi
echo ""

# Check API Gateway
echo -e "${YELLOW}🌐 API Gateway (Unified Frontend)${NC}"
echo "----------------------------------------"
if check_port_status 3001 "API Gateway" "http://localhost:3001/health"; then
    GATEWAY_PID=$(lsof -Pi :3001 -sTCP:LISTEN -t 2>/dev/null | head -1)
    get_uptime "$GATEWAY_PID"
fi
echo ""

# Check React dev server
echo -e "${YELLOW}⚛️  React Dev Server (Frontend)${NC}"
echo "----------------------------------------"
if check_port_status 5173 "React Dev Server" "http://localhost:5173"; then
    REACT_PID=$(lsof -Pi :5173 -sTCP:LISTEN -t 2>/dev/null | head -1)
    get_uptime "$REACT_PID"
fi
echo ""

# Check additional services
echo -e "${YELLOW}🔧 Additional Services${NC}"
echo "----------------------------------------"

# Check if MongoDB/Firebase is accessible (if applicable)
echo -e "${CYAN}📊 Database Connection${NC}"
if curl -s --max-time 5 "http://localhost:3000/api/ai-chat" > /dev/null 2>&1; then
    echo -e "   AI Chat API: ${GREEN}✓ Accessible${NC}"
else
    echo -e "   AI Chat API: ${RED}✗ Not accessible${NC}"
fi

# Check environment variables
echo -e "${CYAN}🔑 Environment Variables${NC}"
if [ -f ".env" ]; then
    if grep -q "OPENAI_API_KEY" .env; then
        echo -e "   OpenAI API Key: ${GREEN}✓ Configured${NC}"
    else
        echo -e "   OpenAI API Key: ${RED}✗ Missing${NC}"
    fi
else
    echo -e "   .env file: ${RED}✗ Not found${NC}"
fi

if [ -f "python/.env" ]; then
    if grep -q "OPENAI_API_KEY" python/.env; then
        echo -e "   Python .env: ${GREEN}✓ Configured${NC}"
    else
        echo -e "   Python .env: ${RED}✗ Missing${NC}"
    fi
else
    echo -e "   Python .env: ${YELLOW}⚠️  Not found${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}📊 Summary${NC}"
echo "=========="

# Count running services
RUNNING_COUNT=0
TOTAL_COUNT=3

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then RUNNING_COUNT=$((RUNNING_COUNT + 1)); fi
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then RUNNING_COUNT=$((RUNNING_COUNT + 1)); fi
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then RUNNING_COUNT=$((RUNNING_COUNT + 1)); fi

if [ $RUNNING_COUNT -eq $TOTAL_COUNT ]; then
    echo -e "${GREEN}🎉 All services are running! (${RUNNING_COUNT}/${TOTAL_COUNT})${NC}"
elif [ $RUNNING_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some services are running (${RUNNING_COUNT}/${TOTAL_COUNT})${NC}"
else
    echo -e "${RED}💥 No services are running (${RUNNING_COUNT}/${TOTAL_COUNT})${NC}"
fi

echo ""
echo -e "${CYAN}💡 Quick Commands:${NC}"
echo -e "   Start all:  ${BLUE}./scripts/start-all-services.sh${NC}"
echo -e "   Stop all:   ${BLUE}./scripts/stop-all-services.sh${NC}"
echo -e "   Restart all: ${BLUE}./scripts/restart-all-services.sh${NC}"
echo -e "   Watch logs:  ${BLUE}./scripts/watch-logs.sh${NC}"
echo -e "   Status:     ${BLUE}./scripts/status-all-services.sh${NC}"
echo ""

# Exit with appropriate code
if [ $RUNNING_COUNT -eq $TOTAL_COUNT ]; then
    exit 0  # All services running
elif [ $RUNNING_COUNT -gt 0 ]; then
    exit 1  # Some services running
else
    exit 2  # No services running
fi
