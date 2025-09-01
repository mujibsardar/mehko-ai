#!/bin/bash

# 🚀 MEHKO AI Deployment Script
# This script deploys the MEHKO AI application to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="mehko-ai"
DOMAIN="api.mehko.ai"
FRONTEND_DOMAIN="mehko.ai"

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO") echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN") echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $message" ;;
        *) echo -e "${BLUE}[$level]${NC} $message" ;;
    esac
}

# Error handling
error_exit() {
    log "ERROR" "Deployment failed: $1"
    exit 1
}

# Check if script is run from project root
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    error_exit "This script must be run from the project root directory"
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    log "WARN" "Production environment file not found"
    log "INFO" "Please copy env.production.example to .env.production and configure it"
    error_exit "Missing .env.production file"
fi

# Main deployment function
main() {
    log "INFO" "🚀 Starting MEHKO AI deployment"
    log "INFO" "=================================="
    
    # PHASE 1: Pre-deployment checks
    log "INFO" "📋 PHASE 1: Pre-deployment checks"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed"
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error_exit "Docker Compose is not installed"
    fi
    
    # Check if we're on the deployment branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "deployment/mehko-ai" ]; then
        log "WARN" "Not on deployment branch (current: $CURRENT_BRANCH)"
        log "INFO" "Consider switching to deployment/mehko-ai branch"
    fi
    
    # PHASE 2: Build frontend
    log "INFO" "📦 PHASE 2: Building frontend"
    
    log "INFO" "Installing frontend dependencies..."
    npm ci || error_exit "Failed to install frontend dependencies"
    
    log "INFO" "Building React application..."
    npm run build || error_exit "Failed to build React application"
    
    # PHASE 3: Deploy with Docker Compose
    log "INFO" "🐳 PHASE 3: Deploying with Docker Compose"
    
    log "INFO" "Stopping existing containers..."
    docker-compose down || true
    
    log "INFO" "Building Docker images..."
    docker-compose build --no-cache || error_exit "Failed to build Docker images"
    
    log "INFO" "Starting services..."
    docker-compose up -d || error_exit "Failed to start services"
    
    # PHASE 4: Health checks
    log "INFO" "🏥 PHASE 4: Health checks"
    
    log "INFO" "Waiting for services to start..."
    sleep 30
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        error_exit "Services failed to start"
    fi
    
    log "INFO" "Checking service health..."
    
    # Check Caddy health
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log "INFO" "✅ Caddy reverse proxy is healthy"
    else
        log "WARN" "⚠️  Caddy health check failed"
    fi
    
    # Check FastAPI unified backend health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log "INFO" "✅ FastAPI unified backend is healthy"
    else
        log "WARN" "⚠️  FastAPI unified backend health check failed"
    fi
    
    # Check AI service health
    if curl -f http://localhost:8000/api/ai-status > /dev/null 2>&1; then
        log "INFO" "✅ AI service is healthy"
    else
        log "WARN" "⚠️  AI service health check failed"
    fi
    
    # Check apps API health
    if curl -f http://localhost:8000/api/apps > /dev/null 2>&1; then
        log "INFO" "✅ Apps API is healthy"
    else
        log "WARN" "⚠️  Apps API health check failed"
    fi
    
    # PHASE 5: Post-deployment
    log "INFO" "🎉 PHASE 5: Post-deployment"
    
    log "INFO" "Deployment completed successfully!"
    log "INFO" ""
    log "INFO" "📋 Service URLs:"
    log "INFO" "   • API: https://$DOMAIN"
    log "INFO" "   • Health: https://$DOMAIN/health"
    log "INFO" ""
    log "INFO" "📋 Next steps:"
    log "INFO" "   1. Configure DNS:"
    log "INFO" "      - Point $DOMAIN to this server's IP"
    log "INFO" "      - Point $FRONTEND_DOMAIN to Cloudflare Pages"
    log "INFO" "   2. Deploy frontend to Cloudflare Pages"
    log "INFO" "   3. Test all functionality"
    log "INFO" "   4. Set up monitoring"
    log "INFO" ""
    log "INFO" "📋 Useful commands:"
    log "INFO" "   • View logs: docker-compose logs -f"
    log "INFO" "   • Stop services: docker-compose down"
    log "INFO" "   • Restart services: docker-compose restart"
    log "INFO" "   • Update deployment: ./scripts/deploy.sh"
}

# Show help
show_help() {
    echo -e "${BLUE}🚀 MEHKO AI Deployment Script${NC}"
    echo -e "${BLUE}==============================${NC}"
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  ./scripts/deploy.sh                    # Deploy the application"
    echo "  ./scripts/deploy.sh --help             # Show this help"
    echo ""
    echo -e "${BLUE}Prerequisites:${NC}"
    echo "  • Docker and Docker Compose installed"
    echo "  • .env.production file configured"
    echo "  • Domain DNS configured"
    echo "  • Server access and permissions"
    echo ""
    echo -e "${BLUE}What it does:${NC}"
    echo "  • Builds React frontend"
    echo "  • Builds and starts Docker containers (single FastAPI backend)"
    echo "  • Performs health checks on unified backend"
    echo "  • Provides deployment status"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
esac
