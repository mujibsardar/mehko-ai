#!/bin/bash

# MEHKO AI Services Start Script
# This script starts all required services for development

set -e  # Exit on any error

echo "🚀 Starting all services for MEHKO AI..."
echo "=========================================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Check if ports are already in use
echo "🔍 Checking port availability..."

# Check if services are already running
if lsof -ti:8000 >/dev/null 2>&1 || lsof -ti:3000 >/dev/null 2>&1 || lsof -ti:5173 >/dev/null 2>&1; then
    echo "⚠️  Some ports are already in use. Stopping existing services first..."
    if [ -f "./scripts/stop-all-services.sh" ]; then
        ./scripts/stop-all-services.sh
        sleep 2
    fi
fi

echo "✅ All ports are available"
echo "💡 Note: Frontend now configured to use FastAPI on port 8000"

# Start Python FastAPI server
echo ""
echo "🐍 Starting Python FastAPI server..."
echo "📦 Installing/updating Python dependencies..."

# Use timeout to prevent hanging
timeout 60s bash -c '
    cd python
    source venv/bin/activate
    pip install -r requirements.txt
' || {
    echo "⚠️  Pip install took too long, continuing anyway..."
}

echo "🚀 Starting FastAPI server on port 8000..."
cd python
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../fastapi.log 2>&1 &
FASTAPI_PID=$!
cd ..

# Save PID
echo $FASTAPI_PID > .service-pids

# Start Node.js server
echo ""
echo "🟢 Starting Node.js server..."
echo "🚀 Starting Node.js server on port 3000..."
nohup node server.js > node.log 2>&1 &
NODE_PID=$!

# Save PID
echo $NODE_PID >> .service-pids

# Start React dev server
echo ""
echo "⚛️  Starting React dev server..."
echo "🚀 Starting React dev server on port 5173..."
cd frontend
nohup npm run dev > ../react.log 2>&1 &
REACT_PID=$!
cd ..

# Save PID
echo $REACT_PID >> .service-pids

# Wait for services to start
echo ""
echo "⏳ Waiting for all services to start..."
sleep 5

# Verify services are running
echo ""
echo "🔍 Verifying all services are running..."

# Check Python FastAPI
if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Python FastAPI server is running on http://localhost:8000"
else
    echo "❌ Python FastAPI server failed to start"
fi

# Check Node.js server
if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ Node.js server is running on port 3000"
else
    echo "❌ Node.js server failed to start"
fi

# Check React dev server
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "✅ React dev server is running on http://localhost:5173"
else
    echo "❌ React dev server failed to start"
fi

echo ""
echo "🎉 All services have been started!"
echo ""
echo "📱 Services running:"
echo "  • Python FastAPI: http://localhost:8000"
echo "  • Node.js Server: http://localhost:3000"
echo "  • React App:      http://localhost:5173"
echo ""
echo "💡 To stop all services, run: ./scripts/stop-all-services.sh"
echo "💡 Or manually kill PIDs: Python: $FASTAPI_PID, Node: $NODE_PID, React: $REACT_PID"
echo ""
echo "🚀 You're all set! Happy coding! 🚀"
