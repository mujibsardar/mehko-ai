#!/bin/bash

# MEHKO AI Log Watcher Script
# This script opens a new terminal window with three tabs, each tailing a different service log

set -e  # Exit on any error

echo "📱 Opening log watcher in new terminal window..."
echo "================================================"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if we're on macOS (for osascript support)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS detected - opening Terminal.app with tabs..."
    
    # Create the AppleScript to open Terminal with three tabs
    osascript <<EOF
tell application "Terminal"
    activate
    
    -- Create first tab for Python FastAPI logs
    set pythonTab to do script "cd '$PROJECT_DIR' && echo '🐍 Python FastAPI Logs (Port 8000)' && echo '================================' && tail -f fastapi.log"
    set custom title of pythonTab to "Python FastAPI"
    
    -- Create second tab for Node.js logs
    set nodeTab to do script "cd '$PROJECT_DIR' && echo '🟢 Node.js Server Logs (Port 3000)' && echo '================================' && tail -f node.log"
    set custom title of nodeTab to "Node.js Server"
    
    -- Create third tab for React logs
    set reactTab to do script "cd '$PROJECT_DIR' && echo '⚛️  React Dev Server Logs (Port 5173)' && echo '================================' && tail -f react.log"
    set custom title of reactTab to "React Dev Server"
    
    -- Wait a moment for tabs to open
    delay 1
    
    -- Select the first tab
    set selected of pythonTab to true
end tell
EOF

    echo "✅ Terminal window opened with 3 tabs:"
    echo "   📱 Tab 1: Python FastAPI (Port 8000)"
    echo "   📱 Tab 2: Node.js Server (Port 3000)" 
    echo "   📱 Tab 3: React Dev Server (Port 5173)"
    echo ""
    echo "💡 Each tab is now tailing its respective log file"
    echo "💡 Close the terminal window when you're done watching logs"
    
else
    echo "❌ This script currently only supports macOS Terminal.app"
    echo "💡 For other systems, you can manually run these commands:"
    echo ""
    echo "   # Terminal 1 - Python FastAPI:"
    echo "   cd '$PROJECT_DIR' && tail -f fastapi.log"
    echo ""
    echo "   # Terminal 2 - Node.js:"
    echo "   cd '$PROJECT_DIR' && tail -f node.log"
    echo ""
    echo "   # Terminal 3 - React:"
    echo "   cd '$PROJECT_DIR' && tail -f react.log"
fi

echo ""
echo "🎯 Quick Commands:"
echo "   Start services: ./scripts/start-all-services.sh"
echo "   Stop services:  ./scripts/stop-all-services.sh"
echo "   Watch logs:     ./scripts/watch-logs.sh"
echo "   Check status:   ./scripts/status-all-services.sh"
