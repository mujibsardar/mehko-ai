#!/usr/bin/env bash
set -euo pipefail

API_HOST="https://api.mehko.ai"

log(){ echo "[$(date +%H:%M:%S)] $*"; }

log "Pulling latest main..."
git fetch --all
git checkout main
git pull --ff-only

log "Rebuilding backend services without downtime..."
docker compose up -d --build fastapi-worker caddy

log "Reloading Caddy config (if changed)..."
docker compose exec caddy caddy fmt --overwrite /etc/caddy/Caddyfile || true
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile || true

log "Health checks via Caddy..."
if curl -fsSL "$API_HOST/api/health" >/dev/null; then
  log "API health OK"
else
  log "WARN: API health check failed"; exit 1
fi

# Quick endpoint smoke (headers)
APP="alameda_county_mehko"; FORM="MEHKO_APP_SOP"
curl -sSL -D - -o /dev/null "$API_HOST/api/apps/$APP/forms/$FORM/pdf" | awk 'BEGIN{IGNORECASE=1}/^HTTP|^content-type:/' || true

log "Done."


