# File Organization Rules

## NEVER Create Files in Project Root
- **DO NOT** create documentation, logs, output files, or any new files in the project root directory
- **DO NOT** create temporary files, test outputs, or generated content in the root
- **ALWAYS** use appropriate subdirectories for new content

## Proper File Placement
- **Documentation**: Place in `docs/` directory
- **Logs**: Place in `logs/` directory  
- **Generated content**: Place in `generated/` directory
- **Temporary files**: Place in `temp/` directory
- **Scripts**: Place in `scripts/` directory
- **Configuration**: Place in `config/` directory

## Before Creating Any File
1. Check if an appropriate directory already exists
2. If not, suggest creating the directory first
3. Ask for permission before creating new directories
4. Always use descriptive, organized file names

## Example of Good Organization
```
docs/
  ├── new-feature-guide.md
  └── troubleshooting.md

logs/
  ├── server.log
  └── ai-chat.log

generated/
  ├── form-outputs/
  └── reports/
```

## Example of BAD Organization (NEVER DO THIS)
```
mehko-ai/
├── new-documentation.md  ❌
├── output.log           ❌
├── temp-data.json       ❌
└── generated-report.pdf ❌
```
