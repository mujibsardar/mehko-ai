#!/bin/bash

# Script hardening - exit on any error
set -euo pipefail

# Function to check if a service is running
check_service() {
    local port=$1
    local service_name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not running on port $port${NC}"
        return 1
    fi
}

# Function to create log file if it doesn't exist
create_log_file() {
    local log_file=$1
    local service_name=$2
    if [ ! -f "$log_file" ]; then
        echo -e "${YELLOW}📝 Creating $log_file for $service_name...${NC}"
        touch "$log_file"
        echo "$(date): $service_name log file created" > "$log_file"
    fi
}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📺 Opening three separate terminal windows/tabs for each service log...${NC}"

# Check service status first
echo -e "${YELLOW}🔍 Checking service status...${NC}"
check_service 8000 "Python FastAPI" || echo -e "${YELLOW}💡 FastAPI not running - logs will be minimal${NC}"
check_service 3000 "Node.js Server" || echo -e "${YELLOW}💡 Node.js not running - logs will be minimal${NC}"
check_service 5173 "React Dev Server" || echo -e "${YELLOW}💡 React not running - logs will be minimal${NC}"

# Create log files if they don't exist
echo -e "${YELLOW}📝 Ensuring log files exist...${NC}"
create_log_file "logs/fastapi.log" "Python FastAPI"
create_log_file "logs/node.log" "Node.js Server"
create_log_file "logs/react.log" "React Dev Server"

echo ""

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${GREEN}🍎 macOS detected - opening three Terminal.app windows${NC}"
    
    PROJECT_DIR=$(pwd)
    
    # Create three separate temporary scripts for each service
    REACT_SCRIPT=$(mktemp)
    NODE_SCRIPT=$(mktemp)
    FASTAPI_SCRIPT=$(mktemp)
    
    # React Dev Server log script
    cat > "$REACT_SCRIPT" << EOF
#!/bin/bash
cd "$PROJECT_DIR"
echo "🚀 MEHKO AI - React Dev Server Logs"
echo "==================================="
echo "📱 Monitoring: logs/react.log"
echo "📍 Port: 5173"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "Starting React log monitoring..."
echo ""

if [ ! -f "logs/react.log" ]; then
    echo "❌ logs/react.log not found in $(pwd)"
    echo "💡 Make sure React dev server is running: ./scripts/start-all-services.sh"
    echo ""
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

echo "✅ Found logs/react.log - starting monitoring..."
echo ""
tail -f logs/react.log
# Keep the script running
while true; do sleep 1; done
EOF

    # Node.js Server log script
    cat > "$NODE_SCRIPT" << EOF
#!/bin/bash
cd "$PROJECT_DIR"
echo "🚀 MEHKO AI - Node.js Server Logs"
echo "================================="
echo "🔧 Monitoring: logs/node.log"
echo "📍 Port: 3000"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "Starting Node.js log monitoring..."
echo ""

if [ ! -f "logs/node.log" ]; then
    echo "❌ logs/node.log not found in $(pwd)"
    echo "💡 Make sure Node.js server is running: ./scripts/start-all-services.sh"
    echo ""
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

echo "✅ Found logs/node.log - starting monitoring..."
echo ""
tail -f logs/node.log
# Keep the script running
while true; do sleep 1; done
EOF

    # Python FastAPI log script
    cat > "$FASTAPI_SCRIPT" << EOF
#!/bin/bash
cd "$PROJECT_DIR"
echo "🚀 MEHKO AI - Python FastAPI Logs"
echo "================================="
echo "🐍 Monitoring: logs/fastapi.log"
echo "📍 Port: 8000"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "Starting FastAPI log monitoring..."
echo ""

if [ ! -f "logs/fastapi.log" ]; then
    echo "❌ logs/fastapi.log not found in $(pwd)"
    echo "💡 Make sure FastAPI server is running: ./scripts/start-all-services.sh"
    echo ""
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

echo "✅ Found logs/fastapi.log - starting monitoring..."
echo ""
tail -f logs/fastapi.log
# Keep the script running
while true; do sleep 1; done
EOF

    chmod +x "$REACT_SCRIPT" "$NODE_SCRIPT" "$FASTAPI_SCRIPT"
    
    # Open three separate terminal windows
    echo -e "${CYAN}📱 Opening React Dev Server log window...${NC}"
    osascript << EOF
tell application "Terminal"
    do script "bash '$REACT_SCRIPT'"
    set custom title of front window to "React Dev Server Logs"
    activate
end tell
EOF

    sleep 1
    
    echo -e "${GREEN}🔧 Opening Node.js Server log window...${NC}"
    osascript << EOF
tell application "Terminal"
    do script "bash '$NODE_SCRIPT'"
    set custom title of front window to "Node.js Server Logs"
    activate
end tell
EOF

    sleep 1
    
    echo -e "${YELLOW}🐍 Opening Python FastAPI log window...${NC}"
    osascript << EOF
tell application "Terminal"
    do script "bash '$FASTAPI_SCRIPT'"
    set custom title of front window to "Python FastAPI Logs"
    activate
end tell
EOF

    # Clean up temp scripts after a longer delay to ensure they're executed
    (sleep 30 && rm -f "$REACT_SCRIPT" "$NODE_SCRIPT" "$FASTAPI_SCRIPT") &

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "${GREEN}🐧 Linux detected - opening three terminal windows${NC}"
    
    PROJECT_DIR=$(pwd)
    
    # Try different terminal emulators
    if command -v gnome-terminal &> /dev/null; then
        echo -e "${CYAN}📱 Opening React Dev Server log tab...${NC}"
        gnome-terminal --tab --title="React Dev Server Logs" -- bash -c "cd '$PROJECT_DIR'; echo '🚀 MEHKO AI - React Dev Server Logs'; echo '==================================='; echo '📱 Monitoring: react.log'; echo '📍 Port: 5173'; echo ''; echo 'Press Ctrl+C to stop monitoring'; echo ''; echo 'Starting React log monitoring...'; echo ''; if [ ! -f 'react.log' ]; then echo '❌ react.log not found'; echo '💡 Make sure React dev server is running: ./scripts/start-all-services.sh'; read -n 1; exit 1; fi; echo '✅ Found react.log - starting monitoring...'; echo ''; tail -f react.log; exec bash"
        
        echo -e "${GREEN}🔧 Opening Node.js Server log tab...${NC}"
        gnome-terminal --tab --title="Node.js Server Logs" -- bash -c "cd '$PROJECT_DIR'; echo '🚀 MEHKO AI - Node.js Server Logs'; echo '================================='; echo '🔧 Monitoring: node.log'; echo '📍 Port: 3000'; echo ''; echo 'Press Ctrl+C to stop monitoring'; echo ''; echo 'Starting Node.js log monitoring...'; echo ''; if [ ! -f 'node.log' ]; then echo '❌ node.log not found'; echo '💡 Make sure Node.js server is running: ./scripts/start-all-services.sh'; read -n 1; exit 1; fi; echo '✅ Found node.log - starting monitoring...'; echo ''; tail -f node.log; exec bash"
        
        echo -e "${YELLOW}🐍 Opening Python FastAPI log tab...${NC}"
        gnome-terminal --tab --title="Python FastAPI Logs" -- bash -c "cd '$PROJECT_DIR'; echo '🚀 MEHKO AI - Python FastAPI Logs'; echo '================================='; echo '🐍 Monitoring: fastapi.log'; echo '📍 Port: 8000'; echo ''; echo 'Press Ctrl+C to stop monitoring'; echo ''; echo 'Starting FastAPI log monitoring...'; echo ''; if [ ! -f 'fastapi.log' ]; then echo '❌ fastapi.log not found'; echo '💡 Make sure FastAPI server is running: ./scripts/start-all-services.sh'; read -n 1; exit 1; fi; echo '✅ Found fastapi.log - starting monitoring...'; echo ''; tail -f fastapi.log; exec bash"
        
    elif command -v konsole &> /dev/null; then
        echo -e "${CYAN}📱 Opening React Dev Server log tab...${NC}"
        konsole --new-tab --title "React Dev Server Logs" -e bash -c "cd '$PROJECT_DIR'; echo '🚀 MEHKO AI - React Dev Server Logs'; echo '==================================='; echo '📱 Monitoring: react.log'; echo '📍 Port: 5173'; echo ''; echo 'Press Ctrl+C to stop monitoring'; echo ''; echo 'Starting React log monitoring...'; echo ''; if [ ! -f 'react.log' ]; then echo '❌ react.log not found'; echo '💡 Make sure React dev server is running: ./scripts/start-all-services.sh'; read -n 1; exit 1; fi; echo '✅ Found react.log - starting monitoring...'; echo ''; tail -f react.log; exec bash"
        
        echo -e "${GREEN}🔧 Opening Node.js Server log tab...${NC}"
        konsole --new-tab --title "Node.js Server Logs" -e bash -c "cd '$PROJECT_DIR'; echo '🚀 MEHKO AI - Node.js Server Logs'; echo '================================='; echo '🔧 Monitoring: node.log'; echo '📍 Port: 3000'; echo ''; echo 'Press Ctrl+C to stop monitoring'; echo ''; echo 'Starting Node.js log monitoring...'; echo ''; if [ ! -f 'node.log' ]; then echo '❌ node.log not found'; echo '💡 Make sure Node.js server is running: ./scripts/start-all-services.sh'; read -n 1; exit 1; fi; echo '✅ Found node.log - starting monitoring...'; echo ''; tail -f node.log; exec bash"
        
        echo -e "${YELLOW}🐍 Opening Python FastAPI log tab...${NC}"
        konsole --new-tab --title "Python FastAPI Logs" -e bash -c "cd '$PROJECT_DIR'; echo '🚀 MEHKO AI - Python FastAPI Logs'; echo '================================='; echo '🐍 Monitoring: fastapi.log'; echo '📍 Port: 8000'; echo ''; echo 'Press Ctrl+C to stop monitoring'; echo ''; echo 'Starting FastAPI log monitoring...'; echo ''; if [ ! -f 'fastapi.log' ]; then echo '❌ fastapi.log not found'; echo '💡 Make sure FastAPI server is running: ./scripts/start-all-services.sh'; read -n 1; exit 1; fi; echo '✅ Found fastapi.log - starting monitoring...'; echo ''; tail -f fastapi.log; exec bash"
        
    else
        echo -e "${CYAN}⚠️  No supported terminal emulator found. Running in current terminal instead.${NC}"
        echo -e "${BLUE}📺 Starting all log monitoring in current terminal...${NC}"
        echo -e "${GREEN}🚀 MEHKO AI Service Logs Monitor${NC}"
        echo "================================"
        echo ""
        echo -e "${CYAN}📱 React Dev Server:${NC}"
        echo -e "${GREEN}🔧 Node.js Server:${NC}"
        echo -e "${YELLOW}🐍 Python FastAPI:${NC}"
        echo ""
        echo "Press Ctrl+C to stop monitoring"
        echo ""
        echo "Starting log monitoring..."
        echo ""
        tail -f logs/react.log logs/node.log logs/fastapi.log
    fi
else
    echo -e "${CYAN}⚠️  Unsupported OS. Running in current terminal instead.${NC}"
    echo -e "${BLUE}📺 Starting all log monitoring in current terminal...${NC}"
    echo -e "${GREEN}🚀 MEHKO AI Service Logs Monitor${NC}"
    echo "================================"
    echo ""
    echo -e "${CYAN}📱 React Dev Server:${NC}"
    echo -e "${GREEN}🔧 Node.js Server:${NC}"
    echo -e "${YELLOW}🐍 Python FastAPI:${NC}"
    echo ""
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    echo "Starting log monitoring..."
    echo ""
            tail -f logs/react.log logs/node.log logs/fastapi.log
fi

echo ""
echo -e "${GREEN}✅ Three separate log monitoring windows/tabs have been opened!${NC}"
echo -e "${CYAN}💡 Each window/tab monitors a single service:${NC}"
echo -e "  📱 React Dev Server (Port 5173) - logs/react.log"
echo -e "  🔧 Node.js Server (Port 3000) - logs/node.log"
echo -e "  🐍 Python FastAPI (Port 8000) - logs/fastapi.log"
echo ""
if ! check_service 8000 "Python FastAPI" >/dev/null 2>&1 || ! check_service 3000 "Node.js Server" >/dev/null 2>&1 || ! check_service 5173 "React Dev Server" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Some services are not running. To start all services:${NC}"
    echo -e "${YELLOW}   ./scripts/start-all-services.sh${NC}"
    echo ""
    echo -e "${CYAN}💡 The log windows will show minimal output until services start.${NC}"
    echo -e "${CYAN}   Start the services and the logs will automatically populate!${NC}"
else
    echo -e "${GREEN}🎉 All services are running! Logs should be active.${NC}"
fi
