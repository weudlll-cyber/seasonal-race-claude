#!/usr/bin/env bash
# ============================================================
# MEASUREMENT-ONLY sweep: full re-roll in PULK vs cohesion (find the mid-band).
# Director OFF; sweep pulkBiasGain 2.0 / 1.0 / 0.5 / 0.25 / 0.0. Phase-split at the shipped
# setting (area 1.0/0/1.0, row 1/0/1). --action-metrics emits whole-field PULK-window movement
# metrics + per-racer rows to results/action-metrics/ (gitignored). No game-module change.
#
# Usage:  bash scripts/action-sweep-driver.sh [RACES]      (default RACES=20)
# Then:   node scripts/action-sweep-analyze.mjs
# ============================================================
set -u
cd "$(dirname "$0")/.." || exit 2
RACES="${1:-20}"
MAXPAR=5   # parallel invocations

# track:racer:racers:topo
TRACKS="searound:manta:40:closed garden-path:snail:40:closed seatrack:dolphin:60:open luger-hill:luge:60:open mountainstreet:boarder:60:mid"
LEVELS="2.0 1.0 0.5 0.25 0.0"

COMMON="--dur=60 --races=$RACES --seed=1 --race-plan=true --governorDirectorEnabled=false \
--reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 \
--areaBonusEarly=1.0 --areaBonusPulk=0 --areaBonusPost=1.0 --rowBonusEarly=1 --rowBonusPulk=0 --rowBonusPost=1 \
--action-metrics"

mkdir -p client/tmp/action-sweep results/action-metrics
echo "[$(date +%H:%M:%S)] action sweep START (races=$RACES, 5 tracks x 5 levels)"
n=0
for LV in $LEVELS; do
  LVTAG="g${LV//./_}"   # 2.0 -> g2_0
  for TR in $TRACKS; do
    IFS=':' read -r TID RACER NR TOPO <<< "$TR"
    LABEL="${LVTAG}-${TID}"
    ( node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" \
        $COMMON --pulkBiasGain="$LV" --diagLabel="$LABEL" \
        > "client/tmp/action-sweep/${LABEL}.stdout" 2>&1
      echo "[$(date +%H:%M:%S)] done ${LABEL}" ) &
    n=$((n+1)); [ $((n % MAXPAR)) -eq 0 ] && wait
  done
done
wait
echo "[$(date +%H:%M:%S)] action sweep COMPLETE — analyze with: node scripts/action-sweep-analyze.mjs"
