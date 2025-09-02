# 🏠 MEHKO AI - Home Kitchen Operations Permit System

> **Streamlining the process of obtaining Home Kitchen Operations (MEHKO) permits across California counties through intelligent automation and AI-powered assistance.**

## 🤖 **AI ASSISTANT NOTICE - READ FIRST**

**⚠️ CRITICAL: Before making ANY changes to this project, AI assistants MUST:**

1. **📖 READ** `AI_INSTRUCTIONS.md` and `.cursor/rules/` directory
2. **❓ ASK PERMISSION** before any code changes
3. **📋 EXPLAIN CHANGES** before proceeding
4. **⏸️ WAIT FOR APPROVAL** before executing

**🚫 NEVER make changes without explicit permission!**

**📚 Required reading:** `AI_INSTRUCTIONS.md` | `.cursor/rules/README.md`

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docker.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)

## 🎯 **Project Overview**

MEHKO AI is a comprehensive web application that helps entrepreneurs navigate the complex process of obtaining Home Kitchen Operations permits. The system currently supports Los Angeles County and is designed to scale to 10+ California counties through AI-powered content extraction and intelligent form generation.

### **Key Features**

- 🏛️ **Multi-County Support** - Scalable architecture for California counties
- 🤖 **AI-Powered Content Extraction** - Intelligent crawling of official websites
- 📱 **Modern React Frontend** - Responsive, user-friendly interface
- 🔧 **Python FastAPI Backend** - High-performance PDF processing
- 📊 **Firebase Integration** - Real-time data and user management
- 🚀 **Automated Workflows** - Streamlined permit application process

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Caddy Reverse  │    │ Python FastAPI  │
│   (Port 5173)   │◄──►│   Proxy (80/443)│◄──►│   (Port 8000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Firebase      │    │   PDF Processing │    │   AI Agent      │
│   Firestore     │    │   & Overlays     │    │   Content Gen   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 **Quick Start**

### **Prerequisites**

- **Docker** and **Docker Compose**
- **Node.js** 18+ and **npm** (for React development)
- **Python** 3.8+ (for local development)
- **Firebase** project with Firestore enabled
- **OpenAI API** key for AI agent functionality

### **1. Clone & Setup**

```bash
git clone <repository-url>
cd mehko-ai

# Install dependencies
npm install
pip install -r python/requirements.txt

# Copy environment configuration
cp .env.example .env
# Edit .env with your API keys and Firebase config
```

### **2. Configuration**

Create a `.env` file in the root directory:

```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Firebase (if using service account)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

### **3. Start All Services**

```bash
# Start all services (Docker Compose + React)
docker-compose up -d
./scripts/dev.sh

# Monitor logs in separate terminals
./scripts/docker-logs.sh

# Stop all services
docker-compose down
```

### **4. Access Applications**

- **Frontend**: http://localhost:5173 (React dev server)
- **Backend API**: http://localhost/api (via Caddy reverse proxy)
- **API Docs**: http://localhost/api/docs (via Caddy reverse proxy)
- **Health Check**: http://localhost/health

## 📁 **Project Structure**

```
mehko-ai/
├── 📱 src/                    # React frontend source
├── 🐍 python/                 # Python backend & FastAPI
├── 🔧 scripts/                # Automation & utility scripts
├── 📊 data/                   # Application data & configuration
├── 📚 docs/                   # Project documentation
├── 📝 logs/                   # Service log files
├── ⚙️  config/                 # Configuration files
├── 🗂️  temp/                   # Temporary runtime files
├── 🤖 generated/              # AI-generated county applications
└── 🛠️  tools/                  # Development utilities
```

### **Key Directories Explained**

| Directory      | Purpose          | Key Files                        |
| -------------- | ---------------- | -------------------------------- |
| **`src/`**     | React frontend   | Components, hooks, providers     |
| **`python/`**  | Backend services | FastAPI server, PDF processing   |
| **`scripts/`** | Automation       | Service management, AI agent     |
| **`data/`**    | Application data | County manifests, configurations |
| **`docs/`**    | Documentation    | Guides, research, agent features |

## 🛠️ **Development Workflow**

### **Starting Development**

```bash
# Start all services in development mode
./scripts/start-all-services.sh

# Watch logs in separate terminals
./scripts/watch-logs.sh

# Make changes to code (hot reload enabled)
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
```

### **AI Agent Development**

```bash
# Test the enhanced AI agent
node scripts/test-enhanced-agent.mjs

# Process a new county
node scripts/mehko-agent-enhanced.mjs "https://county.gov/mehko" "County Name"

# Batch process multiple counties
node scripts/mehko-agent-enhanced.mjs --batch data/county-batch.json
```

### **Adding New Counties**

1. **Identify target county** and MEHKO page URL
2. **Run AI agent** to extract information
3. **Review generated JSON** in `generated/` directory
4. **Add to manifest** using `scripts/add-county.mjs`
5. **Test application** in the frontend

## 🤖 **AI Agent System**

### **Overview**

The AI agent system automatically crawls county websites to extract MEHKO permit information and generate structured JSON applications.

### **Key Capabilities**

- **Multi-Source Content Extraction** - Main page + PDFs + external links
- **Intelligent Link Categorization** - Forms, guides, requirements, fees
- **Content Credibility Scoring** - Source hierarchy and validation
- **Fallback Information Strategies** - Baseline + county-specific data
- **Batch Processing** - Multiple counties in sequence

### **Usage Examples**

```bash
# Single county processing
node scripts/mehko-agent-enhanced.mjs "https://www.ocgov.com/gov/health/eh/food/home-kitchen" "Orange County"

# Batch processing
node scripts/mehko-agent-enhanced.mjs --batch data/county-batch.json

# Test mode (no API calls)
node scripts/test-enhanced-agent.mjs
```

### **Output Structure**

Generated applications include:

- **County Information** - Name, contact details, website
- **Permit Requirements** - Eligibility, documentation needed
- **Fee Structure** - Application fees, renewal costs
- **Process Steps** - Application workflow, timeline
- **Contact Information** - Phone, email, office locations
- **Source Attribution** - Information credibility and sources

## 🔧 **Technical Stack**

### **Frontend**

- **React 18** - Modern component-based UI
- **SCSS** - Advanced CSS preprocessing
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework

### **Backend**

- **Python 3.8+** - Core backend language
- **FastAPI** - High-performance web framework
- **Uvicorn** - ASGI server with performance optimizations
- **PyMuPDF** - PDF processing and manipulation

### **AI & Automation**

- **OpenAI GPT-4** - Content generation and analysis
- **Puppeteer** - Web scraping and automation
- **Python Scripts** - Automation and data processing

### **Data & Storage**

- **Firebase Firestore** - Real-time database
- **JSON** - Configuration and data exchange
- **Git** - Version control and collaboration

## 📊 **Performance & Monitoring**

### **Service Management**

```bash
# Check service status
./scripts/status-all-services.sh

# Monitor CPU usage
./scripts/check-cpu.sh

# Watch all logs
./scripts/watch-logs.sh
```

### **Performance Optimization**

- **Uvicorn workers** - Optimized for production load
- **Concurrency limits** - Controlled resource usage
- **Request limits** - Prevent resource exhaustion
- **CPU monitoring** - Real-time performance tracking

## 🧪 **Testing & Quality**

### **Frontend Testing**

```bash
# Run unit tests
npm test

# Run smoke tests
npm run test:smoke

# Build for production
npm run build
```

### **Backend Testing**

```bash
# Python tests
cd python
python -m pytest

# API testing
curl http://localhost:8000/health
```

### **AI Agent Testing**

```bash
# Test agent functionality
node scripts/test-enhanced-agent.mjs

# Validate generated output
node scripts/validate-county.mjs generated/county_name.json
```

## 🚀 **Deployment**

### **Production Setup**

```bash
# Use production-optimized scripts
./scripts/start-production.sh

# Environment variables
export ENVIRONMENT=production
export NODE_ENV=production
```

### **Service Configuration**

- **Frontend**: Vite production build
- **Backend**: Uvicorn with workers and limits
- **Monitoring**: Log aggregation and performance tracking

## 🤝 **Contributing**

### **Development Guidelines**

1. **Create feature branches** for new work
2. **Follow existing patterns** for consistency
3. **Update documentation** for new features
4. **Test thoroughly** before committing
5. **Use conventional commits** for clear history

### **Branch Strategy**

- **`main`** - Production-ready code
- **`feature/*`** - New features and enhancements
- **`bugfix/*`** - Bug fixes and patches
- **`hotfix/*`** - Critical production fixes

### **Code Style**

- **JavaScript/React**: ESLint + Prettier
- **Python**: PEP 8 + Black
- **SCSS**: Consistent naming conventions
- **Shell**: POSIX-compliant scripts

## 📚 **Documentation**

### **Key Documents**

- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Directory organization
- **[docs/AI_AGENT_INSTRUCTIONS.md](./docs/AI_AGENT_INSTRUCTIONS.md)** - AI agent usage
- **[docs/ENHANCED_AGENT_FEATURES.md](./docs/ENHANCED_AGENT_FEATURES.md)** - Agent capabilities
- **[docs/AI_PDF_IMPLEMENTATION_GUIDE.md](./docs/AI_PDF_IMPLEMENTATION_GUIDE.md)** - PDF processing

### **API Documentation**

- **FastAPI Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Services Won't Start**

```bash
# Check if ports are in use
lsof -i :8000,3000,5173

# Kill existing processes
./scripts/stop-all-services.sh

# Check logs for errors
tail -f logs/*.log
```

#### **AI Agent Issues**

```bash
# Verify API key
echo $OPENAI_API_KEY

# Test agent connectivity
node scripts/test-enhanced-agent.mjs

# Check Puppeteer installation
node -e "console.log(require('puppeteer'))"
```

#### **Performance Issues**

```bash
# Monitor CPU usage
./scripts/check-cpu.sh

# Check service status
./scripts/status-all-services.sh

# Review log files
./scripts/watch-logs.sh
```

### **Getting Help**

1. **Check logs** in `logs/` directory
2. **Review documentation** in `docs/` directory
3. **Test individual components** using test scripts
4. **Check service status** using monitoring scripts

## 📈 **Roadmap**

### **Phase 1: Core Infrastructure** ✅

- [x] Multi-service architecture
- [x] AI agent foundation
- [x] Project organization
- [x] Performance monitoring

### **Phase 2: Enhanced AI Agent** 🚧

- [x] Multi-source content extraction
- [x] Credibility scoring system
- [x] Intelligent fallbacks
- [ ] Advanced PDF processing
- [ ] Content validation

### **Phase 3: County Expansion** 📋

- [ ] 10+ California counties
- [ ] Automated county discovery
- [ ] Content quality assurance
- [ ] User feedback integration

### **Phase 4: Advanced Features** 🔮

- [ ] Machine learning improvements
- [ ] Predictive analytics
- [ ] Mobile applications
- [ ] API marketplace

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **California Department of Public Health** for MEHKO program guidance
- **OpenAI** for GPT-4 API access
- **Firebase** for backend infrastructure
- **Open source community** for tools and libraries

---

**Ready to streamline MEHKO permit applications? Start with the [Quick Start](#-quick-start) guide above! 🚀**

_For detailed technical information, see the [docs/](./docs/) directory._
