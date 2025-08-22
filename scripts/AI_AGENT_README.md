# 🤖 MEHKO AI Agent System

## 🎯 **Overview**
The MEHKO AI Agent automatically crawls county government websites and generates structured JSON applications for Microenterprise Home Kitchen Operations (MEHKO) programs. This system can process multiple California counties efficiently and accurately.

## 🚀 **Quick Start**

### **Single County Processing**
```bash
# Process one county
node scripts/mehko-agent-enhanced.mjs "https://county.gov/mehko" "County Name"

# Example: Orange County
node scripts/mehko-agent-enhanced.mjs "https://www.ocgov.com/gov/health/eh/food/home-kitchen" "Orange County"
```

### **Batch Processing**
```bash
# Process multiple counties from batch file
node scripts/mehko-agent-enhanced.mjs --batch data/county-batch.json
```

## 📁 **Files & Structure**

### **Core Scripts**
- **`mehko-agent-enhanced.mjs`** - Enhanced AI agent with validation and batch processing
- **`mehko-agent.mjs`** - Original AI agent (simpler version)
- **`add-county.mjs`** - Utility to add generated JSON to manifest

### **Data Files**
- **`data/county-batch.json`** - Batch processing configuration
- **`data/county-targets.md`** - Strategic county targeting plan
- **`data/manifest.json`** - Master application database

### **Output Directory**
- **`generated/`** - AI-generated county JSON files

## 🔧 **Features**

### **Enhanced Content Extraction**
- **Smart selectors** for forms, links, and content
- **Dynamic content waiting** for JavaScript-heavy sites
- **Form detection** and field analysis
- **Contact information** extraction
- **Fee and requirement** identification

### **AI-Powered Generation**
- **GPT-4 integration** for intelligent content analysis
- **Structured output** following exact JSON schema
- **County-specific customization** based on website content
- **Validation** to ensure data quality

### **Batch Processing**
- **Multiple county processing** in sequence
- **Progress tracking** and error handling
- **Cost estimation** per county
- **Comprehensive reporting** and summaries

### **Quality Assurance**
- **JSON validation** against required schema
- **Required field checking** for all steps
- **Format validation** for IDs and structure
- **Error reporting** with specific details

## 📊 **Expected Results**

### **Success Rate by County Tier**
- **Tier 1 (Major Metro)**: 80-90% success rate
- **Tier 2 (Growing)**: 60-70% success rate  
- **Tier 3 (Smaller)**: 40-50% success rate

### **Processing Metrics**
- **Time per county**: 2-5 minutes
- **Cost per county**: $0.06-0.15
- **Content extraction**: 1000-2000 characters
- **Token usage**: 1500-2500 tokens

## 🎯 **Target Counties**

### **Priority 1 (High Population)**
1. **Orange County** - 3.2M population
3. **Riverside County** - 2.5M population
4. **Sacramento County** - 1.6M population
5. **Fresno County** - 1.0M population

### **Search Strategy**
- Look for MEHKO program pages
- Check health department sections
- Search for "home kitchen operations"
- Verify permit application forms

## 🛠️ **Technical Details**

### **Dependencies**
```json
{
  "puppeteer": "Web scraping and content extraction",
  "openai": "GPT-4 API integration",
  "dotenv": "Environment variable management"
}
```

### **Browser Configuration**
- **Headless mode** for server compatibility
- **User agent spoofing** to avoid blocking
- **Timeout handling** for slow-loading sites
- **Sandbox disabling** for container environments

### **API Configuration**
- **GPT-4 model** for best results
- **Low temperature** (0.1) for consistency
- **Token limits** optimized for cost efficiency
- **Presence/frequency penalties** for better output

## 📝 **Output Schema**

### **Required Structure**
```json
{
  "id": "county_name_mehko",
  "title": "County Name MEHKO",
  "description": "Program description with limits and requirements",
  "rootDomain": "county.gov",
  "supportTools": { "aiEnabled": true, "commentsEnabled": true },
  "steps": [
    // 10 required steps with specific IDs
  ]
}
```

### **Required Steps**
1. `planning_overview` - Planning and resources
2. `approvals_training` - Required approvals and training
3. `prepare_docs` - Document preparation
4. `sop_form` - Standard Operating Procedures
5. `permit_application_form` - Main permit application
6. `submit_application` - Submission process and fees
7. `inspection` - Inspection requirements
8. `receive_permit` - Permit issuance
9. `operate_comply` - Ongoing compliance
10. `contact` - Contact information

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Content Extraction Fails**
```bash
# Check if site is accessible
curl -I "https://county.gov/mehko"

# Verify JavaScript requirements
# Some sites require JavaScript for content
```

#### **AI Generation Fails**
```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Verify API quota
# Check OpenAI dashboard for usage limits
```

#### **Validation Errors**
```bash
# Review generated JSON manually
cat generated_county_name_mehko.json

# Check for missing required fields
# Ensure all 10 steps are present
```

### **Debug Mode**
```bash
# Run with verbose logging
DEBUG=* node scripts/mehko-agent-enhanced.mjs "url" "name"

# Check browser console
# Puppeteer can show page errors
```

## 📈 **Performance Optimization**

### **Cost Reduction**
- **Single GPT-4 call** per county
- **Efficient prompt engineering** to reduce tokens
- **Content filtering** to stay within limits
- **Batch processing** for volume discounts

### **Speed Improvements**
- **Parallel processing** (future enhancement)
- **Content caching** for repeated attempts
- **Smart retry logic** for failed requests
- **Connection pooling** for multiple sites

## 🔮 **Future Enhancements**

### **Planned Features**
- **Multi-language support** for diverse counties
- **PDF form analysis** and field mapping
- **Regional health department** detection
- **State-level guidance** integration
- **Automated testing** of generated applications

### **Scalability Improvements**
- **Distributed processing** across multiple agents
- **Queue management** for large batches
- **Progress persistence** for long-running jobs
- **Web interface** for monitoring and control

## 📚 **Examples**

### **Successful Generation**
```bash
# Process Orange County
node scripts/mehko-agent-enhanced.mjs "https://www.ocgov.com/gov/health/eh/food/home-kitchen" "Orange County"

# Output: generated_orange_county_mehko.json
# Add to manifest: node scripts/add-county.mjs generated_orange_county_mehko.json
```

### **Batch Processing**
```bash
# Process all priority counties
node scripts/mehko-agent-enhanced.mjs --batch data/county-batch.json

# Review results and add successful ones
# Check generated/ directory for output files
```

## 🎉 **Success Metrics**

### **Target Goals**
- **10+ counties** processed successfully
- **90%+ accuracy** compared to manual review
- **<5 minutes** processing time per county
- **<$0.15** cost per county
- **100% validation** pass rate

### **Quality Indicators**
- **Complete step coverage** (all 10 steps)
- **Accurate contact information**
- **Real fee amounts** and requirements
- **Proper form identification**
- **County-specific customization**

---

**Ready to scale MEHKO applications across California! 🚀**
