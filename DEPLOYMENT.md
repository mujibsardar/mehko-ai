# 🚀 MEHKO AI Deployment Guide

## 📋 Overview

This guide walks you through deploying MEHKO AI to production using:
- **Frontend**: Cloudflare Pages (mehko.ai)
- **Backend**: Hetzner VPS with Docker Compose (api.mehko.ai)
- **Database**: Firebase Firestore (existing)
- **Cache**: Upstash Redis (free tier)
- **Storage**: AWS S3 (back-channel-media bucket)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MEHKO AI Production                    │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Cloudflare Pages)  │  Backend (Hetzner VPS)        │
│  ┌─────────────────────────┐ │ ┌─────────────────────────────┐ │
│  │ mehko.ai               │ │ │ Caddy (Reverse Proxy)      │ │
│  │ React SPA (Static)     │ │ │ ├─ api.mehko.ai            │ │
│  │ Build: /dist/          │ │ │ ├─ Node AI Server (3000)   │ │
│  │ CDN: Cloudflare        │ │ │ ├─ Python FastAPI (8000)   │ │
│  │                        │ │ │ └─ API Gateway (3001)      │ │
│  └─────────────────────────┘ │ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### 1. Domain Configuration
- **Primary Domain**: mehko.ai (registered on Spaceship)
- **API Subdomain**: api.mehko.ai
- **DNS Setup Required**:
  - mehko.ai → Cloudflare Pages
  - api.mehko.ai → VPS IP address

### 2. External Services
- **Firebase Firestore**: Uses existing Firebase project
- **Upstash Redis**: Create Redis instance and get connection string
- **AWS S3**: Ensure back-channel-media bucket exists
- **Firebase**: Service account key configured
- **OpenAI**: API key for AI functionality

### 3. Server Requirements
- **VPS**: Hetzner CX22 (2 vCPU, 4GB RAM, 40GB SSD)
- **OS**: Ubuntu 22.04 LTS
- **Software**: Docker, Docker Compose, Git

## 🚀 Deployment Steps

### Step 1: Server Setup

1. **Create Hetzner VPS**:
   ```bash
   # Choose Hetzner CX22
   # Location: US East (Nuremberg)
   # OS: Ubuntu 22.04 LTS
   ```

2. **Install Docker and Docker Compose**:
   ```bash
   # SSH into your VPS
   ssh root@your-vps-ip
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Create deployment user**:
   ```bash
   # Create user
   adduser mehko
   usermod -aG docker mehko
   
   # Switch to user
   su - mehko
   ```

### Step 2: Application Deployment

1. **Clone repository**:
   ```bash
   git clone https://github.com/mujibsardar/mehko-ai.git
   cd mehko-ai
   git checkout deployment/mehko-ai
   ```

2. **Configure environment**:
   ```bash
   # Copy environment template
   cp env.production.example .env.production
   
   # Edit with your actual values
   nano .env.production
   ```

3. **Deploy application**:
   ```bash
   # Run deployment script
   ./scripts/deploy.sh
   ```

### Step 3: Domain Configuration

1. **Configure DNS**:
   - **Spaceship DNS** → Point api.mehko.ai to your VPS IP
   - **Cloudflare** → Add mehko.ai and point to Cloudflare Pages

2. **SSL Certificate**:
   - Caddy will automatically obtain SSL certificates
   - No manual configuration needed

### Step 4: Frontend Deployment

1. **Build frontend**:
   ```bash
   # On your local machine
   npm run build
   ```

2. **Deploy to Cloudflare Pages**:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Set root directory: `/`
   - Deploy

3. **Configure environment variables**:
   - Set `VITE_API_URL=https://api.mehko.ai` in Cloudflare Pages

## 🔧 Configuration Files

### Environment Variables (.env.production)
```bash
# Domain Configuration
DOMAIN=api.mehko.ai

# Node.js Services
NODE_ENV=production
PORT=3001

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Firebase Private Key Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email@your_project.iam.gserviceaccount.com

# Database Configuration (Firebase Firestore)
# Uses existing Firebase project - no additional configuration needed

# Redis Configuration (Upstash)
REDIS_URL=redis://username:password@host:port

# S3 Configuration (for file storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-west-1
S3_BUCKET=back-channel-media
```

### Docker Compose (docker-compose.yml)
- **4 services**: Caddy, API Gateway, AI Server, FastAPI Worker
- **Automatic restart**: All services restart on failure
- **Health checks**: Built-in health monitoring
- **Volume mounts**: Persistent data and configuration

### Caddy Configuration (Caddyfile)
- **SSL termination**: Automatic HTTPS certificates
- **Reverse proxy**: Routes requests to appropriate services
- **Health endpoint**: `/health` for monitoring
- **Logging**: JSON format logs

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Check health endpoints
curl https://api.mehko.ai/health
```

### Updates
```bash
# Pull latest changes
git pull origin deployment/mehko-ai

# Redeploy
./scripts/deploy.sh
```

### Backup
```bash
# Backup data directory
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Backup environment
cp .env.production backup-env-$(date +%Y%m%d)
```

## 🔒 Security Considerations

### Environment Variables
- All sensitive data stored in `.env.production`
- Never commit environment files to Git
- Use strong, unique secrets

### Network Security
- Only ports 80 and 443 exposed
- Internal services communicate via Docker network
- Caddy handles SSL termination

### Access Control
- Firebase authentication for user access
- API rate limiting configured
- CORS properly configured for production domains

## 🆘 Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   # Check logs
   docker-compose logs
   
   # Check environment variables
   docker-compose config
   ```

2. **SSL certificate issues**:
   ```bash
   # Check Caddy logs
   docker-compose logs caddy
   
   # Verify DNS configuration
   nslookup api.mehko.ai
   ```

3. **Firebase connection issues**:
   ```bash
   # Test Firebase connection
   docker-compose exec fastapi-worker python -c "from firebase_admin import firestore; print('Firebase OK')"
   ```

### Performance Optimization

1. **Resource monitoring**:
   ```bash
   # Check resource usage
   docker stats
   
   # Monitor logs
   docker-compose logs -f --tail=100
   ```

2. **Scaling considerations**:
   - Upgrade VPS if CPU/RAM usage is high
   - Add more FastAPI workers for PDF processing
   - Consider separate VPS instances for different services

## 📈 Scaling Path

### Phase 1: Current Setup
- Single VPS with all services
- Suitable for MVP and initial users

### Phase 2: Service Separation
- Separate VPS instances for different services
- Load balancer for high availability

### Phase 3: Cloud-Native
- Kubernetes cluster
- Auto-scaling based on demand
- Multi-region deployment

## 📞 Support

For deployment issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify configuration: `docker-compose config`
3. Test health endpoints: `curl https://api.mehko.ai/health`
4. Review this documentation
5. Check the infrastructure plan: `docs/INFRA_PLAN.md`

---

**Last Updated**: August 31, 2025
**Version**: 1.0.0
