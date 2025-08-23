#!/bin/bash

# Quick System Maintenance Access
# Run this script to access all system maintenance tools

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛠️  System Maintenance Quick Access${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

echo -e "${CYAN}Available Commands:${NC}"
echo -e "${GREEN}1.${NC} ./scripts/prevent-cpu-spikes.sh  - Daily prevention check"
echo -e "${GREEN}2.${NC} ./scripts/auto-cleanup.sh       - Automated CPU cleanup"
echo -e "${GREEN}3.${NC} ./docs/CPU_PREVENTION_GUIDE.md  - Prevention guide"
echo ""

echo -e "${YELLOW}Current CPU Status:${NC}"
# Quick CPU check
TOTAL_CPU=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
echo -e "   Total CPU Usage: ${TOTAL_CPU:-0}%"

if [ "$TOTAL_CPU" -gt 20 ]; then
    echo -e "${RED}⚠️  High CPU usage detected!${NC}"
    echo -e "${YELLOW}💡 Run: ./scripts/auto-cleanup.sh${NC}"
elif [ "$TOTAL_CPU" -gt 10 ]; then
    echo -e "${YELLOW}⚠️  Moderate CPU usage${NC}"
    echo -e "${YELLOW}💡 Run: ./scripts/prevent-cpu-spikes.sh${NC}"
else
    echo -e "${GREEN}✅ CPU usage normal${NC}"
fi

echo ""
echo -e "${CYAN}Quick Actions:${NC}"
echo -e "${GREEN}•${NC} Daily check: ${CYAN}./scripts/prevent-cpu-spikes.sh${NC}"
echo -e "${GREEN}•${NC} Fix issues: ${CYAN}./scripts/auto-cleanup.sh${NC}"
echo -e "${GREEN}•${NC} Read guide: ${CYAN}open ./docs/CPU_PREVENTION_GUIDE.md${NC}"
echo ""
echo -e "${BLUE}💡 Tip: Add ~/system-maintenance to your PATH for global access${NC}"
