#!/bin/bash

# MEHKO AI Quick CPU Usage Check
# Provides a quick overview of service performance and system resources

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MEHKO AI - Quick CPU Usage Check${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if services are running
echo -e "${YELLOW}🔍 Checking MEHKO AI services...${NC}"

# Python FastAPI (Port 8000)
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PYTHON_PID=$(lsof -ti:8000)
    PYTHON_CPU=$(ps -p $PYTHON_PID -o %cpu= 2>/dev/null | tr -d ' ')
    PYTHON_MEM=$(ps -p $PYTHON_PID -o %mem= 2>/dev/null | tr -d ' ')
    echo -e "${GREEN}✅ Python FastAPI (Port 8000)${NC}"
    echo -e "   PID: $PYTHON_PID | CPU: ${PYTHON_CPU:-0}% | Memory: ${PYTHON_MEM:-0}%"
else
    echo -e "${RED}❌ Python FastAPI (Port 8000) - Not Running${NC}"
fi

# Node.js Server (Port 3000)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    NODE_PID=$(lsof -ti:3000)
    NODE_CPU=$(ps -p $NODE_PID -o %cpu= 2>/dev/null | tr -d ' ')
    NODE_MEM=$(ps -p $NODE_PID -o %mem= 2>/dev/null | tr -d ' ')
    echo -e "${GREEN}✅ Node.js Server (Port 3000)${NC}"
    echo -e "   PID: $NODE_PID | CPU: ${NODE_CPU:-0}% | Memory: ${NODE_MEM:-0}%"
else
    echo -e "${RED}❌ Node.js Server (Port 3000) - Not Running${NC}"
fi

# React Dev Server (Port 5173)
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    REACT_PID=$(lsof -ti:5173)
    REACT_CPU=$(ps -p $REACT_PID -o %cpu= 2>/dev/null | tr -d ' ')
    REACT_MEM=$(ps -p $REACT_PID -o %mem= 2>/dev/null | tr -d ' ')
    echo -e "${GREEN}✅ React Dev Server (Port 5173)${NC}"
    echo -e "   PID: $REACT_PID | CPU: ${REACT_CPU:-0}% | Memory: ${REACT_MEM:-0}%"
else
    echo -e "${RED}❌ React Dev Server (Port 5173) - Not Running${NC}"
fi

echo ""

# Overall system stats
echo -e "${YELLOW}💻 System Overview:${NC}"
TOTAL_CPU=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
TOTAL_MEM=$(top -l 1 | grep "PhysMem" | awk '{print $2}' | sed 's/[A-Z]//')
echo -e "   Total CPU Usage: ${TOTAL_CPU:-0}%"
echo -e "   Total Memory Usage: ${TOTAL_MEM:-0}%"

echo ""

# High CPU processes
echo -e "${YELLOW}🔥 High CPU Processes (>5%):${NC}"
ps aux | awk '$3 > 5.0 {print $3 "%", $11}' | head -10 | while read line; do
    echo -e "   $line"
done

echo ""

# Recommendations
echo -e "${CYAN}💡 Recommendations:${NC}"
if [ ! -z "$PYTHON_CPU" ] && [ "$PYTHON_CPU" -gt 50 ]; then
    echo -e "   ⚠️  Python FastAPI using high CPU (${PYTHON_CPU}%) - consider restarting"
fi

if [ ! -z "$NODE_CPU" ] && [ "$NODE_CPU" -gt 50 ]; then
    echo -e "   ⚠️  Node.js Server using high CPU (${NODE_CPU}%) - consider restarting"
fi

if [ ! -z "$REACT_CPU" ] && [ "$REACT_CPU" -gt 50 ]; then
    echo -e "   ⚠️  React Dev Server using high CPU (${REACT_CPU}%) - consider restarting"
fi

if [ "$TOTAL_CPU" -gt 80 ]; then
    echo -e "   ⚠️  High overall CPU usage (${TOTAL_CPU}%) - system may be under stress"
fi

echo ""
echo -e "${BLUE}💡 For continuous monitoring: python scripts/monitor-server.py --continuous${NC}"
echo -e "${BLUE}💡 For detailed analysis: ./scripts/watch-logs.sh${NC}"
