#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing API Gateway...${NC}"
echo "================================"
echo ""

# Test gateway health
echo -e "${YELLOW}1. Testing Gateway Health...${NC}"
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ Gateway is healthy${NC}"
else
    echo -e "${RED}❌ Gateway health check failed${NC}"
    exit 1
fi

# Test AI chat routing
echo -e "${YELLOW}2. Testing AI Chat Routing...${NC}"
if curl -s -X POST http://localhost:3001/api/ai-chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"test"}]}' > /dev/null; then
    echo -e "${GREEN}✅ AI Chat routing works${NC}"
else
    echo -e "${RED}❌ AI Chat routing failed${NC}"
fi

# Test Python backend routing
echo -e "${YELLOW}3. Testing Python Backend Routing...${NC}"
if curl -s http://localhost:3001/api/apps > /dev/null; then
    echo -e "${GREEN}✅ Python backend routing works${NC}"
else
    echo -e "${RED}❌ Python backend routing failed${NC}"
fi

# Test form fields routing
echo -e "${YELLOW}4. Testing Form Fields Routing...${NC}"
if curl -s "http://localhost:3001/api/form-fields?applicationId=test&formName=test" > /dev/null; then
    echo -e "${GREEN}✅ Form fields routing works${NC}"
else
    echo -e "${RED}❌ Form fields routing failed${NC}"
fi

echo ""
echo -e "${GREEN}🎉 API Gateway test completed!${NC}"
echo ""
echo -e "${BLUE}📱 Frontend URL: http://localhost:3001${NC}"
echo -e "${BLUE}💡 Health Check: http://localhost:3001/health${NC}"
echo ""
echo -e "${YELLOW}💡 If all tests pass, your API Gateway is working correctly!${NC}"
