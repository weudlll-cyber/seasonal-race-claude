#!/usr/bin/env bash
# ============================================================
# File:        ab-arm.sh
# Path:        reports/release/SOAK-1/ab-arm.sh
# Project:     RaceArena
# Created:     2026-10-07
# Description: SOAK-1 step 4 — ONE arm of an A/B soak: a fresh volume filled from the same starting
#              copy of the soak's data, the given image, the soak's load and sampler for <hours>,
#              then the arm's container and volume removed. Arms run one after the other, never two
#              at once.
#
# Usage: bash ab-arm.sh <arm> <image> <port> <hours> <rawRoot> <baseData>
#   <baseData> is a copy of the soak volume's /app/data on the host (it carries the soak's accounts,
#   whose credentials are in <rawRoot>/../B/accounts.json and die with the throwaway data).
# ============================================================
set -euo pipefail
ARM=$1 IMAGE=$2 PORT=$3 HOURS=$4 RAW_ROOT=$5 BASE=$6
HERE=$(cd "$(dirname "$0")" && pwd)
RAW="$RAW_ROOT/ab-$ARM"
PROJECT="ra-ab-$ARM"
mkdir -p "$RAW"
cp "$RAW_ROOT/B/accounts.json" "$RAW_ROOT/B/race-templates.json" "$RAW/"

# The volume is filled BEFORE compose starts, so the server's first start sees the soak's data.
docker volume create "${PROJECT}_data" >/dev/null
docker run --rm --user root --entrypoint sh -v "${PROJECT}_data:/app/data" -v "$BASE:/src:ro" "$IMAGE" \
  -c 'cp -a /src/. /app/data/ && chown -R node:node /app/data'

export SOAK_IMAGE="$IMAGE" SOAK_PORT="$PORT"
export SOAK_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export SOAK_BOOTSTRAP_TOKEN=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
docker compose -p "$PROJECT" -f "$HERE/compose.soak.yml" up -d
# process.exitCode, never process.exit right after a fetch: on Windows that crashes node (libuv).
until node -e "fetch('http://127.0.0.1:$PORT/api/health').then(r=>{process.exitCode=r.ok?0:1}).catch(()=>{process.exitCode=1})"; do sleep 2; done

date -u +%FT%TZ > "$RAW/started.txt"
MINUTES=$(node -e "console.log(Math.round($HOURS*60)+1)")
node "$HERE/sample.mjs" "${PROJECT}-server-1" "$RAW/samples.jsonl" "$MINUTES" > "$RAW/sampler.out" 2>&1 &
SAMPLER=$!
node "$HERE/load.mjs" run "http://127.0.0.1:$PORT" "$RAW" "$HOURS" > "$RAW/load.out" 2>&1
wait "$SAMPLER" || true
docker inspect --format '{{.RestartCount}} {{.State.Status}} {{.State.OOMKilled}}' "${PROJECT}-server-1" > "$RAW/final-state.txt"
docker logs "${PROJECT}-server-1" > "$RAW/container.log" 2>&1
docker compose -p "$PROJECT" -f "$HERE/compose.soak.yml" down -v
echo "arm $ARM done"
