# Git Workflow Rules

## Branch Management
- **ALWAYS** create a new branch for changes unrelated to current work
- **NEVER** make changes directly on `main` branch
- **ALWAYS** ask before creating new branches
- Use descriptive branch names: `feature/description` or `fix/description`

## Before Making Code Changes
1. **ALWAYS** ask permission before making any code changes
2. **ALWAYS** explain what changes you're about to make
3. **ALWAYS** check current git status first
4. **NEVER** assume changes are approved

## Committing Rules
- **NEVER** use `git add .` immediately after making changes
- **ALWAYS** pause after making changes and ask: "Are you ready to commit these changes?"
- **ALWAYS** wait for user confirmation before committing
- **ALWAYS** commit frequently with meaningful messages
- **NEVER** commit API keys, secrets, or sensitive information

## Preferred Git Flow (One-Liner)
Use this exact sequence when merging feature branches:
```bash
git add . && git commit -m "descriptive message" && git push origin feature-branch && git checkout main && git merge feature-branch && git push origin main
```

## Complete Git Workflow Example
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes (with permission)
3. Ask: "Are you ready to commit these changes?"
4. Wait for confirmation
5. Execute one-liner: `git add . && git commit -m "Add new feature" && git push origin feature/new-feature && git checkout main && git merge feature/new-feature && git push origin main`
6. Clean up: `git branch -d feature/new-feature`

## Security Rules
- **NEVER** commit API keys, passwords, or secrets
- **ALWAYS** check `.gitignore` before committing
- **ALWAYS** verify no sensitive data in `dist/` or build directories
- **ALWAYS** use environment variables for sensitive configuration

## Commit Frequency
- Commit after each logical change
- Don't wait to accumulate many changes
- Each commit should represent one complete thought or feature
- Use descriptive commit messages that explain the "why", not just the "what"
