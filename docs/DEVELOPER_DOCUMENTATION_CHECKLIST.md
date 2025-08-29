# 📋 **Developer Documentation Checklist**

## 🚨 **Before Every Commit**

**Ask yourself these questions before committing any code changes:**

### **❓ Does this change affect...**

- [ ] **API endpoints** (new, modified, or removed)?
- [ ] **File paths or directory structures**?
- [ ] **Configuration values** (ports, env vars, settings)?
- [ ] **User workflows** or procedures?
- [ ] **Admin processes** or management tasks?
- [ ] **Error messages** or user feedback?
- [ ] **Data formats** or structures?
- [ ] **Authentication** or permissions?

**If you answered YES to ANY of these questions, you MUST update documentation before committing!**

## 🔄 **Quick Documentation Update Process**

### **Step 1: Find Affected Documents**
```bash
# Search for references to what you're changing
grep -r "old_endpoint_name" docs/
grep -r "old_file_path" docs/
grep -r "old_feature_name" docs/
```

### **Step 2: Update Documentation**
- [ ] **Replace outdated information** with current details
- [ ] **Add new information** for new features
- [ ] **Remove references** to deleted features
- [ ] **Update examples** to reflect current code

### **Step 3: Test Documentation**
- [ ] **Verify endpoints** work as documented
- [ ] **Test procedures** function correctly
- [ ] **Check file paths** exist and are accessible
- [ ] **Confirm examples** execute properly

### **Step 4: Update Index**
- [ ] **Add new documents** to `docs/README.md`
- [ ] **Remove deleted documents** from index
- [ ] **Update document descriptions** if needed

## 📝 **Common Documentation Updates**

### **API Changes**
```markdown
## Before (Old)
- `GET /api/old-endpoint` - Returns old data

## After (New)
- `GET /api/new-endpoint` - Returns new data structure
- `POST /api/new-endpoint` - Creates new resource
```

### **File Path Changes**
```markdown
## Before (Old)
- PDFs stored in `applications/{app}/forms/{form}/`

## After (New)
- PDFs stored in `data/applications/{app}/forms/{form}/`
```

### **Configuration Changes**
```markdown
## Before (Old)
- Server runs on port 3001

## After (New)
- Python server runs on port 8000
- Node.js server runs on port 3000
```

## 🧪 **Documentation Testing Commands**

### **Test API Endpoints**
```bash
# Test all documented Python server endpoints
grep -r "localhost:8000" docs/ | grep -o "/[^ ]*" | sort | uniq | \
xargs -I {} curl -s -o /dev/null -w "%{http_code} {}\n" "http://localhost:8000{}"
```

### **Test File Paths**
```bash
# Check if documented file paths exist
grep -r "data/applications" docs/ | grep -o "data/[^ ]*" | sort | uniq | \
xargs -I {} test -e {} || echo "Missing path: {}"
```

### **Validate Markdown**
```bash
# Check markdown syntax
npm install -g markdownlint-cli
markdownlint docs/*.md
```

## 🚨 **Documentation Red Flags**

### **❌ Never Commit These**
- [ ] **Outdated API endpoints** that no longer exist
- [ ] **Wrong file paths** that don't match reality
- [ ] **Deprecated features** that have been removed
- [ ] **Examples that don't work** with current code
- [ ] **Procedures that fail** when followed
- [ ] **Configuration values** that are incorrect

### **✅ Always Verify These**
- [ ] **All endpoints exist** and return expected responses
- [ ] **All file paths are correct** and accessible
- [ ] **All procedures work** step-by-step
- [ ] **All examples execute** without errors
- [ ] **All configuration values** are current

## 🔧 **Quick Fix Commands**

### **Find and Replace Across All Docs**
```bash
# Replace old server port references
find docs/ -name "*.md" -exec sed -i 's/old_port:3001/new_port:8000/g' {} \;

# Replace old endpoint references
find docs/ -name "*.md" -exec sed -i 's/old_endpoint/new_endpoint/g' {} \;

# Replace old file path references
find docs/ -name "*.md" -exec sed -i 's/old_path/new_path/g' {} \;
```

### **Search for Specific Patterns**
```bash
# Find all references to deprecated features
grep -r "deprecated" docs/

# Find all API endpoint references
grep -r "localhost:8000\|localhost:3000" docs/

# Find all file path references
grep -r "data/applications\|applications/" docs/
```

## 📅 **Daily Documentation Tasks**

### **Morning (5 minutes)**
- [ ] **Check for documentation issues** reported overnight
- [ ] **Verify documentation matches** current codebase
- [ ] **Update any obvious errors** found

### **During Development**
- [ ] **Update docs immediately** when making changes
- [ ] **Test documentation accuracy** before committing
- [ ] **Keep documentation index** current

### **End of Day (5 minutes)**
- [ ] **Review documentation changes** made today
- [ ] **Verify all updates** are accurate
- [ ] **Plan any major updates** needed tomorrow

## 💡 **Pro Tips**

### **Documentation as Code**
- **Treat documentation like code** - test it thoroughly
- **Include documentation updates** in every pull request
- **Review documentation changes** during code review
- **Version documentation** with your code releases

### **Automation**
- **Use scripts** to find outdated references
- **Automate testing** of documented procedures
- **Set up alerts** for documentation inconsistencies
- **Integrate documentation checks** into CI/CD pipeline

### **Team Collaboration**
- **Share documentation updates** with the team
- **Review documentation changes** together
- **Establish documentation standards** everyone follows
- **Regular documentation reviews** as a team

## 🎯 **Success Metrics**

### **Documentation Quality**
- [ ] **0 outdated endpoints** referenced in documentation
- [ ] **0 broken file paths** mentioned in guides
- [ ] **0 non-working examples** in documentation
- [ ] **100% procedure accuracy** when followed

### **Maintenance Efficiency**
- [ ] **Documentation updated** with every code change
- [ ] **Testing completed** before documentation commits
- [ ] **Index kept current** and accurate
- [ ] **Cross-references** working correctly

---

**Remember: Good documentation is not a luxury - it's a requirement for maintainable systems. Every code change that affects users, developers, or administrators must include corresponding documentation updates.**

**Use this checklist daily to keep documentation accurate, current, and useful! 📚✨**
