#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping all services...${NC}"
echo ""

# Check if service PIDs file exists
if [ ! -f "temp/.service-pids" ]; then
    echo -e "${YELLOW}⚠️  No service PIDs file found.${NC}"
    echo -e "${YELLOW}💡 Services may not be running or were started manually.${NC}"
    echo ""
    echo -e "${BLUE}🔍 Checking for running services on expected ports...${NC}"
    
    # Check if services are running on expected ports
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}🐍 Found service running on port 8000 (Python FastAPI)${NC}"
        PYTHON_PID=$(lsof -ti:8000)
        echo -e "${YELLOW}   PID: $PYTHON_PID${NC}"
    fi
    
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}🟢 Found service running on port 3000 (Node.js)${NC}"
        NODE_PID=$(lsof -ti:3000)
        echo -e "${YELLOW}   PID: $NODE_PID${NC}"
    fi
    
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚛️  Found service running on port 5173 (React)${NC}"
        REACT_PID=$(lsof -ti:5173)
        echo -e "${YELLOW}   PID: $REACT_PID${NC}"
    fi
    
    if [ -z "$PYTHON_PID" ] && [ -z "$NODE_PID" ] && [ -z "$REACT_PID" ]; then
        echo -e "${GREEN}✅ No services found running on expected ports.${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${YELLOW}💡 To stop these services manually, use:${NC}"
    echo -e "${YELLOW}   kill $PYTHON_PID $NODE_PID $REACT_PID${NC}"
    echo ""
    read -p "Do you want to stop these services? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}💡 Services left running.${NC}"
        exit 0
    fi
else
    # Read PIDs from file
    read PYTHON_PID NODE_PID REACT_PID < temp/.service-pids
    
    echo -e "${YELLOW}🔍 Stopping services using saved PIDs...${NC}"
    
    # Stop Python FastAPI server
    if [ ! -z "$PYTHON_PID" ] && kill -0 $PYTHON_PID 2>/dev/null; then
        echo -e "${YELLOW}🐍 Stopping Python FastAPI server (PID: $PYTHON_PID)...${NC}"
        kill -TERM $PYTHON_PID 2>/dev/null || kill -KILL $PYTHON_PID 2>/dev/null
        echo -e "${GREEN}✅ Python FastAPI server stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️  Python FastAPI server not running or PID not found${NC}"
    fi
    
    # Stop Node.js server
    if [ ! -z "$NODE_PID" ] && kill -0 $NODE_PID 2>/dev/null; then
        echo -e "${YELLOW}🟢 Stopping Node.js server (PID: $NODE_PID)...${NC}"
        kill -TERM $NODE_PID 2>/dev/null || kill -KILL $NODE_PID 2>/dev/null
        echo -e "${GREEN}✅ Node.js server stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️  Node.js server not running or PID not found${NC}"
    fi
    
    # Stop React dev server
    if [ ! -z "$REACT_PID" ] && kill -0 $REACT_PID 2>/dev/null; then
        echo -e "${YELLOW}⚛️  Stopping React dev server (PID: $REACT_PID)...${NC}"
        kill -TERM $REACT_PID 2>/dev/null || kill -KILL $REACT_PID 2>/dev/null
        echo -e "${GREEN}✅ React dev server stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️  React dev server not running or PID not found${NC}"
    fi
    
    # Remove PID file
    rm -f temp/.service-pids
    echo -e "${GREEN}🗑️  Service PIDs file removed${NC}"
fi

# Additional cleanup - kill any remaining processes on our ports
echo ""
echo -e "${YELLOW}🧹 Final cleanup - checking for any remaining processes...${NC}"

# Kill any remaining processes on our ports
for port in 8000 3000 5173; do
    REMAINING_PID=$(lsof -ti:$port)
    if [ ! -z "$REMAINING_PID" ]; then
        echo -e "${YELLOW}🔫 Force killing remaining process on port $port (PID: $REMAINING_PID)...${NC}"
        kill -KILL $REMAINING_PID 2>/dev/null
    fi
done

echo ""
echo -e "${GREEN}🎉 All services have been stopped!${NC}"
echo -e "${BLUE}💡 To start all services again, run: ${NC}./scripts/start-all-services.sh"
echo -e "${BLUE}💡 To restart all services, run: ${NC}./scripts/restart-all-services.sh"
echo -e "${BLUE}💡 To watch logs, run: ${NC}./scripts/watch-logs.sh"
