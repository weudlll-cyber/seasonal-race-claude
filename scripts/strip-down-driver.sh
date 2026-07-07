#!/usr/bin/env bash
# Strip-down staged driver (read-only sim harness). Runs one (stage x variant x track) combo per
# invocation of sim-fairness.mjs, logging wall time to a progress file. Usage:
#   bash scripts/strip-down-driver.sh <STAGE_ID> "<STAGE_FLAGS>"
# Combos: 2 closed (searound/manta 40, garden-path/snail 40) + 2 open (mountainstreet/boarder 60,
# seatrack/dolphin 60). Both re-roll variants. All: dur 60, 30 races, seed 1, rubber-band off,
# owner re-roll settings (variation 75 / transition 3 / divisor 10 / lastPos 95).
set -u
cd "$(dirname "$0")/.."
STAGE_ID="$1"; STAGE_FLAGS="$2"
LOG="results/strip-down/progress.log"
mkdir -p results/strip-down
CMN="--dur=60 --races=30 --seed=1 --rubber-band=false --reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 --strip-metrics"
# track:racer:racers:topo
TRACKS="searound:manta:40:closed garden-path:snail:40:closed mountainstreet:boarder:60:open seatrack:dolphin:60:open"
for V in 1 2; do
  for TR in $TRACKS; do
    IFS=':' read -r TID RACER NR TOPO <<< "$TR"
    LABEL="${STAGE_ID}-v${V}-${TID}"
    s=$(date +%s)
    echo "[$(date +%H:%M:%S)] START $LABEL" >> "$LOG"
    node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" \
      $CMN $STAGE_FLAGS --rerollVariant=$V \
      --out="client/tmp/sd/$LABEL" --diagLabel="$LABEL" > "client/tmp/sd-$LABEL.stdout" 2>&1
    rc=$?
    echo "[$(date +%H:%M:%S)] DONE  $LABEL rc=$rc ($(($(date +%s)-s))s)" >> "$LOG"
  done
done
echo "[$(date +%H:%M:%S)] STAGE $STAGE_ID COMPLETE" >> "$LOG"
