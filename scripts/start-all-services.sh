#!/bin/bash

# Script hardening - exit on any error
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting all services for MEHKO AI...${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Port $1 is already in use!${NC}"
        return 1
    fi
    return 0
}

# Check if ports are available
echo -e "${YELLOW}🔍 Checking port availability...${NC}"
if ! check_port 8000; then exit 1; fi  # Python FastAPI (unified backend)
if ! check_port 5173; then exit 1; fi  # React dev server (frontend)
echo -e "${GREEN}✅ All ports are available${NC}"
echo -e "${BLUE}💡 Note: Single-server architecture - all backend services on Python (port 8000)${NC}"
echo ""

# Start Python FastAPI server
echo -e "${YELLOW}🐍 Starting Python FastAPI server...${NC}"

# Check if virtual environment exists and create if needed
if [ ! -d "python/.venv" ] && [ ! -d "python/venv" ]; then
    echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
    cd python
    python3 -m venv .venv
    cd ..
fi

# Install requirements if needed
echo -e "${YELLOW}📦 Installing/updating Python dependencies...${NC}"
cd python
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi
pip install -r requirements.txt
cd ..

# Start FastAPI server in background with logging
echo -e "${GREEN}🚀 Starting unified Python backend on port 8000...${NC}"
echo -e "${BLUE}   • AI Chat & Analysis${NC}"
echo -e "${BLUE}   • PDF Processing${NC}"
echo -e "${BLUE}   • Admin Functions${NC}"
echo -e "${BLUE}   • Form Management${NC}"
# Start uvicorn from the project root, specifying the python directory for module resolution
(cd python && source .venv/bin/activate && uvicorn server.main:app --host 0.0.0.0 --port 8000 --workers 1 --limit-concurrency 100 --limit-max-requests 1000 > ../logs/fastapi.log 2>&1) &
PYTHON_PID=$!

# Wait a moment for Python server to start
sleep 5

# Start React dev server
echo -e "${YELLOW}⚛️  Starting React dev server...${NC}"
echo -e "${GREEN}🚀 Starting React dev server on port 5173...${NC}"
npm run dev > logs/react.log 2>&1 &
REACT_PID=$!

# Wait for all services to start
echo ""
echo -e "${YELLOW}⏳ Waiting for all services to start...${NC}"
sleep 5

# Check if all services are running
echo ""
echo -e "${YELLOW}🔍 Verifying all services are running...${NC}"

# Check Python server
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✅ Python FastAPI server is running on http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Python FastAPI server failed to start${NC}"
fi

# Check AI Chat endpoint
if curl -s http://localhost:8000/api/ai-status > /dev/null; then
    echo -e "${GREEN}✅ AI Chat service is running${NC}"
else
    echo -e "${RED}❌ AI Chat service failed to start${NC}"
fi

# Check React dev server
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${GREEN}✅ React dev server is running on http://localhost:5173${NC}"
else
    echo -e "${RED}❌ React dev server failed to start${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All services have been started!${NC}"
echo -e "${BLUE}💡 Services are running in the background.${NC}"
echo -e "${BLUE}💡 Use './scripts/watch-logs.sh' to monitor the logs${NC}"
echo -e "${BLUE}💡 Use './scripts/stop-all-services.sh' to stop all services${NC}"
echo ""
echo -e "${BLUE}📱 Services running:${NC}"
echo -e "  • Python Backend: ${GREEN}http://localhost:8000${NC} (AI, PDF, Admin, Forms)"
echo -e "  • React App:      ${GREEN}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}💡 To restart all services, run: ${NC}./scripts/restart-all-services.sh"
echo -e "${YELLOW}💡 To watch logs, run: ${NC}./scripts/watch-logs.sh"
echo -e "${YELLOW}💡 Or manually kill PIDs: ${NC}Python: $PYTHON_PID, React: $REACT_PID"
echo ""
echo -e "${GREEN}🚀 Single-server architecture is running! 🚀${NC}"

# Save PIDs to a file for easy stopping
echo "$PYTHON_PID $REACT_PID" > temp/.service-pids
