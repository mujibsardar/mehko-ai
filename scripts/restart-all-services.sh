#!/bin/bash

# MEHKO AI Services Restart Script
# This script stops all services and then starts them fresh

set -e  # Exit on any error

echo "🔄 Restarting all services for MEHKO AI..."
echo "=========================================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Step 1: Stop all services
echo ""
echo "🛑 Step 1: Stopping all services..."
if [ -f "./scripts/stop-all-services.sh" ]; then
    ./scripts/stop-all-services.sh
else
    echo "❌ Stop script not found!"
    exit 1
fi

# Step 2: Wait a moment for cleanup
echo ""
echo "⏳ Step 2: Waiting for cleanup..."
sleep 3

# Step 3: Start all services
echo ""
echo "🚀 Step 3: Starting all services..."
if [ -f "./scripts/start-all-services.sh" ]; then
    ./scripts/start-all-services.sh
else
    echo "❌ Start script not found!"
    exit 1
fi

echo ""
echo "🎉 Restart completed successfully!"
echo "💡 All services should now be running fresh"
echo ""
echo "📱 Quick commands:"
echo "   Status:    ./scripts/status-all-services.sh"
echo "   Stop:      ./scripts/stop-all-services.sh"
echo "   Start:     ./scripts/start-all-services.sh"
echo "   Restart:   ./scripts/restart-all-services.sh"
