# 🤖 AI ASSISTANT RULES - READ FIRST!

## 🚨 CRITICAL: ALWAYS FOLLOW THESE RULES

**BEFORE making ANY changes to this project, you MUST:**

1. **📖 READ ALL RULES** in this directory
2. **❓ ASK PERMISSION** before any code changes
3. **📋 EXPLAIN CHANGES** before proceeding
4. **⏸️ WAIT FOR APPROVAL** before executing

## 🚫 NEVER DO THIS
- ❌ Make changes without permission
- ❌ Assume changes are approved
- ❌ Skip reading the rules
- ❌ Proceed without explanation
- ❌ Create files in project root

## 📋 Required Workflow

```
🔧 PROPOSED CHANGES:
├── File: [filename]
├── Action: [create/modify/delete]
├── Purpose: [why this change is needed]
├── Impact: [what this will affect]
└── Risk Level: [low/medium/high]

❓ May I proceed with these changes?
```

## Overview
This directory contains comprehensive rules and guidelines that AI assistants must follow when working in the Mehko AI project. These rules address common issues and ensure consistent, safe, and organized development practices.

## Rule Files
- **`01-file-organization.md`** - File organization and preventing project root clutter
- **`02-git-workflow.md`** - Git branching, committing, and preferred workflow
- **`03-state-checking.md`** - Checking project state before making changes
- **`04-server-management.md`** - Using existing server management scripts
- **`05-code-changes.md`** - Asking permission before making code changes

## How to Use These Rules
1. **AI Assistants**: Read and follow ALL rules before making any changes
2. **Developers**: Reference these rules when working with AI assistants
3. **Team Members**: Use as a reference for project standards

## Key Principles
1. **Always Ask Permission** - Never make changes without explicit approval
2. **Check State First** - Always verify current project state before working
3. **Use Existing Tools** - Leverage project scripts and established workflows
4. **Organize Properly** - Never create files in project root
5. **Follow Git Flow** - Use proper branching and commit practices
6. **Remember Scripts** - Always use project server management scripts

## Quick Reference Commands
```bash
# Server Management
./scripts/status-all-services.sh    # Check server status
./scripts/start-all-services.sh     # Start all servers
./scripts/stop-all-services.sh      # Stop all servers
./scripts/restart-all-services.sh   # Restart all servers

# Git Workflow (One-liner)
git add . && git commit -m "message" && git push origin branch && git checkout main && git merge branch && git push origin main
```

## Before Every Session
AI assistants should:
1. Read all rule files
2. Check current project state
3. Ask permission before any changes
4. Follow established workflows
5. Use project-specific tools and scripts

## Reporting Issues
If you find these rules unclear or incomplete, please update the relevant rule file and commit the changes following the established git workflow.
