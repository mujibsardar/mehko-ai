#!/bin/bash

# Simple script to watch Docker Compose logs
# Much simpler than the old watch-logs.sh script

echo "🐳 Watching MEHKO AI Docker Compose logs..."
echo "Press Ctrl+C to stop"
echo ""

# Follow logs from all services
docker-compose logs -f
