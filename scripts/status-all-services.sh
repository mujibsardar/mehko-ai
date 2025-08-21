#!/bin/bash

# MEHKO AI Services Status Check Script
# This script checks the status of all running services

set -e  # Exit on any error

echo "🔍 MEHKO AI Services Status Check"
echo "=========================================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Check Python FastAPI Server
echo ""
echo "🐍 Python FastAPI Server (PDF Service)"
echo "----------------------------------------"
if lsof -ti:8000 >/dev/null 2>&1; then
    PYTHON_PID=$(lsof -ti:8000 | head -1)
    if [ -n "$PYTHON_PID" ]; then
        PROCESS_INFO=$(ps -p $PYTHON_PID -o pid,comm,etime --no-headers 2>/dev/null || echo "Process info unavailable")
        START_TIME=$(ps -p $PYTHON_PID -o lstart --no-headers 2>/dev/null || echo "Start time unavailable")
        
        echo "✅ Python FastAPI is RUNNING"
        echo "   Port: 8000"
        echo "   PID: $PYTHON_PID"
        echo "   Process: $PROCESS_INFO"
        
        # Check health endpoint
        if curl -s --max-time 5 http://localhost:8000/health >/dev/null 2>&1; then
            echo "   Health: ✓ Healthy"
        else
            echo "   Health: ⚠️  Port open but health check failed"
        fi
        
        echo "   Started: $START_TIME"
    else
        echo "❌ Port 8000 is in use but process info unavailable"
    fi
else
    echo "❌ Python FastAPI is NOT RUNNING"
fi

# Check Node.js Server
echo ""
echo "🟢 Node.js Server (AI Chat & API)"
echo "----------------------------------------"
if lsof -ti:3000 >/dev/null 2>&1; then
    NODE_PID=$(lsof -ti:3000 | head -1)
    if [ -n "$NODE_PID" ]; then
        PROCESS_INFO=$(ps -p $NODE_PID -o pid,comm,etime --no-headers 2>/dev/null || echo "Process info unavailable")
        START_TIME=$(ps -p $NODE_PID -o lstart --no-headers 2>/dev/null || echo "Start time unavailable")
        
        echo "✅ Node.js Server is RUNNING"
        echo "   Port: 3000"
        echo "   PID: $NODE_PID"
        echo "   Process: $PROCESS_INFO"
        
        # Check health endpoint
        if curl -s --max-time 5 http://localhost:3000/health >/dev/null 2>&1; then
            echo "   Health: ✓ Healthy"
        else
            echo "   Health: ⚠️  Port open but health check failed"
        fi
        
        echo "   Started: $START_TIME"
    else
        echo "❌ Port 3000 is in use but process info unavailable"
    fi
else
    echo "❌ Node.js Server is NOT RUNNING"
fi

# Check React Dev Server
echo ""
echo "⚛️  React Dev Server (Frontend)"
echo "----------------------------------------"
if lsof -ti:5173 >/dev/null 2>&1; then
    REACT_PID=$(lsof -ti:5173 | head -1)
    if [ -n "$REACT_PID" ]; then
        PROCESS_INFO=$(ps -p $REACT_PID -o pid,comm,etime --no-headers 2>/dev/null || echo "Process info unavailable")
        START_TIME=$(ps -p $REACT_PID -o lstart --no-headers 2>/dev/null || echo "Start time unavailable")
        
        echo "✅ React Dev Server is RUNNING"
        echo "   Port: 5173"
        echo "   PID: $REACT_PID"
        echo "   Process: $PROCESS_INFO"
        
        # Check if server responds
        if curl -s --max-time 5 http://localhost:5173 >/dev/null 2>&1; then
            echo "   Health: ✓ Healthy"
        else
            echo "   Health: ⚠️  Port open but server not responding"
        fi
        
        echo "   Started: $START_TIME"
    else
        echo "❌ Port 5173 is in use but process info unavailable"
    fi
else
    echo "❌ React Dev Server is NOT RUNNING"
fi

# Additional checks
echo ""
echo "🔧 Additional Services"
echo "----------------------------------------"

# Database connection check
echo "📊 Database Connection"
if curl -s --max-time 5 http://localhost:3000/health >/dev/null 2>&1; then
    echo "   AI Chat API: ✓ Accessible"
else
    echo "   AI Chat API: ❌ Not accessible"
fi

# Environment variables check
echo "🔑 Environment Variables"
if [ -f ".env" ]; then
    if grep -q "OPENAI_API_KEY" .env 2>/dev/null; then
        echo "   OpenAI API Key: ✓ Configured"
    else
        echo "   OpenAI API Key: ❌ Not found in .env"
    fi
else
    echo "   .env file: ❌ Not found"
fi

if [ -f "python/.env" ]; then
    echo "   Python .env: ✓ Configured"
else
    echo "   Python .env: ❌ Not found"
fi

# Summary
echo ""
echo "📊 Summary"
echo "=========="

RUNNING_COUNT=0
if lsof -ti:8000 >/dev/null 2>&1; then RUNNING_COUNT=$((RUNNING_COUNT + 1)); fi
if lsof -ti:3000 >/dev/null 2>&1; then RUNNING_COUNT=$((RUNNING_COUNT + 1)); fi
if lsof -ti:5173 >/dev/null 2>&1; then RUNNING_COUNT=$((RUNNING_COUNT + 1)); fi

if [ $RUNNING_COUNT -eq 3 ]; then
    echo "🎉 All services are running! ($RUNNING_COUNT/3)"
elif [ $RUNNING_COUNT -gt 0 ]; then
    echo "⚠️  Some services are running ($RUNNING_COUNT/3)"
else
    echo "❌ No services are running (0/3)"
fi

echo ""
echo "💡 Quick Commands:"
echo "   Start all: ./scripts/start-all-services.sh"
echo "   Stop all:  ./scripts/stop-all-services.sh"
echo "   Restart:   ./scripts/restart-all-services.sh"
echo "   Status:    ./scripts/status-all-services.sh"
