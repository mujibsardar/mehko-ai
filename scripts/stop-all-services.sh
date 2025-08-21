#!/bin/bash

# MEHKO AI Services Stop Script
# This script stops all running services

set -e  # Exit on any error

echo "🛑 Stopping all services..."
echo "============================"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Function to safely kill a process
safe_kill() {
    local pid=$1
    local service_name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo "🔄 Stopping $service_name (PID: $pid)..."
        
        # Try graceful shutdown first
        kill "$pid" 2>/dev/null || true
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Check if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  Graceful shutdown failed, force killing..."
            kill -9 "$pid" 2>/dev/null || true
            sleep 1
        fi
        
        # Verify it's stopped
        if kill -0 "$pid" 2>/dev/null; then
            echo "❌ Failed to stop $service_name (PID: $pid)"
        else
            echo "✅ $service_name stopped"
        fi
    else
        echo "ℹ️  $service_name not running"
    fi
}

# Stop services using saved PIDs
echo ""
echo "🔍 Stopping services using saved PIDs..."
if [ -f ".service-pids" ]; then
    while IFS= read -r pid; do
        if [ -n "$pid" ] && [ "$pid" -gt 0 ]; then
            # Get process name for better identification
            process_name=$(ps -p "$pid" -o comm= --no-headers 2>/dev/null || echo "Unknown")
            
            case "$process_name" in
                *python*|*uvicorn*)
                    safe_kill "$pid" "Python FastAPI server"
                    ;;
                *node*)
                    safe_kill "$pid" "Node.js server"
                    ;;
                *npm*|*vite*)
                    safe_kill "$pid" "React dev server"
                    ;;
                *)
                    safe_kill "$pid" "Process ($process_name)"
                    ;;
            esac
        fi
    done < .service-pids
    
    # Remove the PIDs file
    rm -f .service-pids
    echo "🗑️  Service PIDs file removed"
else
    echo "ℹ️  No saved PIDs found, checking ports directly..."
fi

# Final cleanup - check for any remaining processes
echo ""
echo "🧹 Final cleanup - checking for any remaining processes..."

# Check Python FastAPI (port 8000)
if lsof -ti:8000 >/dev/null 2>&1; then
    PYTHON_PIDS=$(lsof -ti:8000)
    echo "🔫 Force killing remaining process on port 8000 (PID: $PYTHON_PIDS)"
    echo "$PYTHON_PIDS" | xargs -r kill -9 2>/dev/null || true
fi

# Check Node.js (port 3000)
if lsof -ti:3000 >/dev/null 2>&1; then
    NODE_PIDS=$(lsof -ti:3000)
    echo "🔫 Force killing remaining process on port 3000 (PID: $NODE_PIDS)"
    echo "$NODE_PIDS" | xargs -r kill -9 2>/dev/null || true
fi

# Check React (port 5173)
if lsof -ti:5173 >/dev/null 2>&1; then
    REACT_PIDS=$(lsof -ti:5173)
    echo "🔫 Force killing remaining process on port 5173 (PID: $REACT_PIDS)"
    echo "$REACT_PIDS" | xargs -r kill -9 2>/dev/null || true
fi

# Wait a moment for cleanup
sleep 2

# Final verification
echo ""
echo "🔍 Final verification..."
REMAINING_COUNT=0

if lsof -ti:8000 >/dev/null 2>&1; then
    echo "⚠️  Port 8000 still in use"
    REMAINING_COUNT=$((REMAINING_COUNT + 1))
fi

if lsof -ti:3000 >/dev/null 2>&1; then
    echo "⚠️  Port 3000 still in use"
    REMAINING_COUNT=$((REMAINING_COUNT + 1))
fi

if lsof -ti:5173 >/dev/null 2>&1; then
    echo "⚠️  Port 5173 still in use"
    REMAINING_COUNT=$((REMAINING_COUNT + 1))
fi

if [ $REMAINING_COUNT -eq 0 ]; then
    echo "🎉 All services have been stopped!"
else
    echo "⚠️  $REMAINING_COUNT ports still in use - manual cleanup may be needed"
fi

echo ""
echo "💡 To start all services again, run: ./scripts/start-all-services.sh"
