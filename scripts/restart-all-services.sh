#!/bin/bash

# Script hardening - exit on any error
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Restarting all services for MEHKO AI...${NC}"
echo ""

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
echo -e "${CYAN}💡 Use './scripts/watch-logs.sh' to monitor the logs${NC}"
