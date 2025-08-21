#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping all services...${NC}"
echo ""

# Check if PID file exists
if [ ! -f ".service-pids" ]; then
    echo -e "${YELLOW}⚠️  No service PIDs file found. Trying to find and stop services manually...${NC}"
    
    # Try to stop services by port
    echo -e "${YELLOW}🔍 Looking for services on known ports...${NC}"
    
    # Stop Python FastAPI server (port 8000)
    PYTHON_PID=$(lsof -ti:8000)
    if [ ! -z "$PYTHON_PID" ]; then
        echo -e "${YELLOW}🐍 Stopping Python FastAPI server (PID: $PYTHON_PID)...${NC}"
        kill -TERM $PYTHON_PID 2>/dev/null || kill -KILL $PYTHON_PID 2>/dev/null
        echo -e "${GREEN}✅ Python FastAPI server stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️  No Python FastAPI server found on port 8000${NC}"
    fi
    
    # Stop Node.js server (port 3000)
    NODE_PID=$(lsof -ti:3000)
    if [ ! -z "$NODE_PID" ]; then
        echo -e "${YELLOW}🟢 Stopping Node.js server (PID: $NODE_PID)...${NC}"
        kill -TERM $NODE_PID 2>/dev/null || kill -KILL $NODE_PID 2>/dev/null
        echo -e "${GREEN}✅ Node.js server stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️  No Node.js server found on port 3000${NC}"
    fi
    
    # Stop React dev server (port 5173)
    REACT_PID=$(lsof -ti:5173)
    if [ ! -z "$REACT_PID" ]; then
        echo -e "${YELLOW}⚛️  Stopping React dev server (PID: $REACT_PID)...${NC}"
        kill -TERM $REACT_PID 2>/dev/null || kill -KILL $REACT_PID 2>/dev/null
        echo -e "${GREEN}✅ React dev server stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️  No React dev server found on port 5173${NC}"
    fi
    
else
    # Read PIDs from file
    read PYTHON_PID NODE_PID REACT_PID < .service-pids
    
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
    rm -f .service-pids
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
