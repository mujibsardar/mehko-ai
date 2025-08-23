# State Checking Rules

## Before Starting Any Work
**ALWAYS** check the current state of the project before making changes or suggestions.

## Git State Check
Before making any changes, run these commands and report the status:
```bash
git status
git branch
git log --oneline -5
```

## Server State Check
When working with server-related changes, check:
```bash
# Check if servers are running
ps aux | grep -E "(node|python|server)" | grep -v grep

# Check server logs
tail -n 20 logs/*.log 2>/dev/null || echo "No log files found"

# Check server status using project scripts
./scripts/status-all-services.sh
```

## File System State Check
Before creating, modifying, or deleting files:
1. Check if target directories exist
2. Check current file permissions
3. Check if files are tracked by git
4. Check for any existing similar files

## Environment State Check
When applicable, check:
- Current working directory
- Node/npm versions
- Python versions
- Environment variables
- Running processes

## Example State Check Workflow
```
1. "Let me check the current project state first..."
2. Run: git status
3. Run: ls -la
4. Run: ./scripts/status-all-services.sh
5. Report findings: "Current state: [summary]"
6. Ask: "Based on this state, should I proceed with [proposed changes]?"
```

## When State Checking is Required
- Before creating new files
- Before modifying existing code
- Before running scripts
- Before suggesting changes
- Before committing code
- When troubleshooting issues
- When starting new features

## State Check Output Format
Always provide a clear summary:
```
📊 PROJECT STATE SUMMARY:
├── Git: [clean/dirty, current branch, last commit]
├── Files: [new/modified/deleted files count]
├── Servers: [running/stopped services]
└── Environment: [working directory, relevant versions]
```
