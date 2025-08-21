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
if ! check_port 8000; then exit 1; fi  # Python FastAPI (PDF service)
if ! check_port 3000; then exit 1; fi  # Node.js server (AI chat)
if ! check_port 5173; then exit 1; fi  # React dev server (frontend)
echo -e "${GREEN}✅ All ports are available${NC}"
echo -e "${BLUE}💡 Note: Frontend now configured to use FastAPI on port 8000${NC}"
echo ""

# Start Python FastAPI server
echo -e "${YELLOW}🐍 Starting Python FastAPI server...${NC}"
cd python
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Install requirements if needed
echo -e "${YELLOW}📦 Installing/updating Python dependencies...${NC}"
pip install -r requirements.txt

# Start FastAPI server in background
echo -e "${GREEN}🚀 Starting FastAPI server on port 8000...${NC}"
uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload &
PYTHON_PID=$!
cd ..

# Wait a moment for Python server to start
sleep 3

# Start Node.js server
echo -e "${YELLOW}🟢 Starting Node.js server...${NC}"
echo -e "${GREEN}🚀 Starting Node.js server on port 3000...${NC}"
node server.js &
NODE_PID=$!

# Wait a moment for Node server to start
sleep 2

# Start React dev server
echo -e "${YELLOW}⚛️  Starting React dev server...${NC}"
echo -e "${GREEN}🚀 Starting React dev server on port 5173...${NC}"
npm run dev &
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

# Check Node server (assuming it has a health endpoint or just check if port is listening)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${GREEN}✅ Node.js server is running on port 3000${NC}"
else
    echo -e "${RED}❌ Node.js server failed to start${NC}"
fi

# Check React dev server
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${GREEN}✅ React dev server is running on http://localhost:5173${NC}"
else
    echo -e "${RED}❌ React dev server failed to start${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All services have been started!${NC}"
echo ""
echo -e "${BLUE}📱 Services running:${NC}"
echo -e "  • Python FastAPI: ${GREEN}http://localhost:8000${NC}"
echo -e "  • Node.js Server: ${GREEN}http://localhost:3000${NC}"
echo -e "  • React App:      ${GREEN}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}💡 To stop all services, run: ${NC}./scripts/stop-all-services.sh"
echo -e "${YELLOW}💡 To restart all services, run: ${NC}./scripts/restart-all-services.sh"
echo -e "${YELLOW}💡 To watch logs, run: ${NC}./scripts/watch-logs.sh"
echo -e "${YELLOW}💡 Or manually kill PIDs: ${NC}Python: $PYTHON_PID, Node: $NODE_PID, React: $REACT_PID"
echo ""
echo -e "${GREEN}🚀 You're all set! Happy coding! 🚀${NC}"

# Save PIDs to a file for easy stopping
echo "$PYTHON_PID $NODE_PID $REACT_PID" > .service-pids

# Return to terminal
exec $SHELL
