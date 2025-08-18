# Firestore Seeding (applications)

## Commands

### Emulator

export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
node seed/seed-apps.mjs --path seed/apps --emulator --dry-run
node seed/seed-apps.mjs --path seed/apps --emulator

### Prod

export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccount.json
node seed/seed-apps.mjs --path seed/apps
node seed/seed-apps.mjs --file seed/apps/sierra_county_mehko.json --only sierra_county_mehko

## Flags

--file <json> | --path <dir>
--dry-run
--emulator
--only <id>

## JSON Shape

See `seed/apps/*.json`. Validation enforces:

- id /^[a-z0-9_]+$/; title, description, rootDomain strings
- supportTools.{aiEnabled,commentsEnabled} booleans
- steps[] required; unique steps[].id
- includes ≥1 "info" and ≥1 "pdf"
- form: requires formName
- pdf: requires formId & appId
