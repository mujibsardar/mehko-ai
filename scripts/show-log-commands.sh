#!/bin/bash

# MEHKO AI Log Commands Helper
# This script shows you the commands to manually tail logs in separate terminal tabs

echo "📱 Manual Log Watching Commands"
echo "================================"
echo ""
echo "🍎 For macOS Terminal.app, open 3 new tabs and run these commands:"
echo ""
echo "📱 Tab 1 - Python FastAPI (Port 8000):"
echo "   cd '$(pwd)' && tail -f fastapi.log"
echo ""
echo "📱 Tab 2 - Node.js Server (Port 3000):"
echo "   cd '$(pwd)' && tail -f node.log"
echo ""
echo "📱 Tab 3 - React Dev Server (Port 5173):"
echo "   cd '$(pwd)' && tail -f react.log"
echo ""
echo "💡 Alternative: Use the automated script:"
echo "   ./scripts/watch-logs.sh"
echo ""
echo "🎯 Other useful commands:"
echo "   Start services: ./scripts/start-all-services.sh"
echo "   Stop services:  ./scripts/stop-all-services.sh"
echo "   Check status:   ./scripts/status-all-services.sh"
echo "   Restart all:    ./scripts/restart-all-services.sh"
