#!/usr/bin/env bash
# Run on VPS from repo root: bash scripts/rebuild-web-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KEY='AIzaSyBDFbcB6AQutIfOAY8DrNzYa3LSdYliYdw'
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating $ENV_FILE"
  touch "$ENV_FILE"
fi

if grep -q '^VITE_GOOGLE_MAPS_API_KEY=' "$ENV_FILE"; then
  sed -i.bak "s|^VITE_GOOGLE_MAPS_API_KEY=.*|VITE_GOOGLE_MAPS_API_KEY=$KEY|" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
else
  printf '\n# Google Maps (baked into web image at build time)\nVITE_GOOGLE_MAPS_API_KEY=%s\n' "$KEY" >> "$ENV_FILE"
fi

echo "VITE_GOOGLE_MAPS_API_KEY set in .env"
grep '^VITE_GOOGLE_MAPS_API_KEY=' "$ENV_FILE"

echo "Building web image (no cache)..."
docker compose build web --no-cache

echo "Restarting stack..."
docker compose up -d

echo "Done. Open Landlord → Add Property and confirm the map loads."
