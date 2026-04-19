#!/usr/bin/env bash
# ============================================================
# File:        deploy.sh
# Path:        scripts/deploy.sh
# Project:     RaceArena
# Created:     2026-04-19
# Description: Production deploy helper — builds client and restarts server
# ============================================================

set -euo pipefail

echo "==> Building client..."
cd "$(dirname "$0")/../client"
npm ci
npm run build

echo "==> Restarting server..."
cd ../server
npm ci --omit=dev
pm2 restart racearena-server || pm2 start src/index.js --name racearena-server

echo "==> Deploy complete."
