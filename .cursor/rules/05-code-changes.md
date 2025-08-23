# Code Change Rules

## ALWAYS Ask Permission First
**NEVER** make code changes without explicit permission from the user.

## Before Making ANY Changes
1. **ALWAYS** explain what changes you're planning to make
2. **ALWAYS** ask: "May I proceed with these changes?"
3. **ALWAYS** wait for user confirmation
4. **NEVER** assume changes are approved

## Required Change Explanation Format
```
🔧 PROPOSED CHANGES:
├── File: [filename]
├── Action: [create/modify/delete]
├── Purpose: [why this change is needed]
├── Impact: [what this will affect]
└── Risk Level: [low/medium/high]

❓ May I proceed with these changes?
```

## Code Change Workflow
1. **Analyze** the current situation
2. **Explain** what needs to be changed and why
3. **Ask** for permission to proceed
4. **Wait** for user confirmation
5. **Execute** changes only after approval
6. **Verify** changes were applied correctly
7. **Ask** if user wants to test before committing

## Examples of Good Permission Requests
```
"I need to modify the server.js file to add error handling. 
This will improve the reliability of the AI chat API. 
May I proceed with these changes?"

"I found a bug in the authentication logic. I need to update 
the useAuth hook to fix the issue. This will affect user login. 
May I proceed with this fix?"
```

## Examples of BAD Behavior (NEVER DO THIS)
```
❌ "I'll fix this bug now..." [starts making changes]
❌ "Let me update the code..." [immediately modifies files]
❌ "I'm going to change..." [proceeds without waiting]
❌ "This needs to be fixed..." [makes changes automatically]
```

## After Making Changes
1. **ALWAYS** pause and ask: "Are you ready to commit these changes?"
2. **NEVER** use `git add .` immediately
3. **ALWAYS** wait for user to test changes first
4. **ALWAYS** explain what was changed
5. **ALWAYS** provide a summary of modifications

## Change Summary Format
```
✅ CHANGES COMPLETED:
├── Modified: [list of changed files]
├── Added: [list of new files]
├── Deleted: [list of removed files]
└── Summary: [brief description of changes]

⏸️  PAUSED: Waiting for your approval to commit
❓ Are you ready to commit these changes?
```

## Emergency Changes
Only in critical situations (like security vulnerabilities):
1. **ALWAYS** explain the urgency
2. **ALWAYS** ask for permission even in emergencies
3. **ALWAYS** explain the risks of not acting immediately
4. **ALWAYS** get explicit approval before proceeding
