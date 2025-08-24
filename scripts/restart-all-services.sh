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

echo -e "${BLUE}🔄 Restarting all services for MEHKO AI...${NC}"
echo ""

# Close all external terminals first
echo -e "${YELLOW}🔄 Closing all external terminal windows...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - close Terminal.app windows with specific titles
    osascript << 'EOF'
tell application "Terminal"
    repeat with w in windows
        if name of w contains "React Dev Server Logs" or name of w contains "Node.js Server Logs" or name of w contains "Python FastAPI Logs" or name of w contains "CPU Performance Monitor" then
            close w
        end if
    end repeat
end tell
EOF
    echo -e "${GREEN}✅ Closed all MEHKO AI terminal windows${NC}"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - try to close terminal windows (this is more complex on Linux)
    echo -e "${YELLOW}💡 Linux detected - manually close terminal windows if needed${NC}"
    echo -e "${YELLOW}   The restart will continue anyway...${NC}"
else
    echo -e "${YELLOW}💡 OS not fully supported for auto-closing terminals${NC}"
fi

echo ""
echo -e "${YELLOW}⏳ Waiting for terminals to close...${NC}"
sleep 2

# Stop all services first
echo -e "${YELLOW}🛑 Stopping all services...${NC}"
./scripts/stop-all-services.sh

echo ""
echo -e "${YELLOW}⏳ Waiting for services to fully stop...${NC}"
sleep 3

echo ""
echo -e "${YELLOW}🚀 Starting all services...${NC}"
./scripts/start-all-services.sh

echo ""
echo -e "${GREEN}✅ All services have been restarted!${NC}"
echo -e "${CYAN}💡 Your existing log monitoring windows should automatically refresh${NC}"
echo -e "${CYAN}   If you need new monitoring windows, run: ./scripts/watch-logs.sh${NC}"
