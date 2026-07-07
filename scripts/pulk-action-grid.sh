#!/usr/bin/env bash
# PULK-action A×B grid driver (read-only sim). Axis1 = PULK action tool (A1 rubber-band / A2 two-sided
# contest / A3 both); Axis2 = OUTCOME bonus restore (B0 none / B1 area / B2 row / B3 both). Variant 1
# re-roll, PULK bonuses = 0, chaos row-bonus full, rubber-band/governor tools fade before corridorStart.
# 12 cells × 4 tracks × 30 races. Writes results/pulk-action/ and logs to progress.log.
set -u
cd "$(dirname "$0")/.."
LOG="results/pulk-action/progress.log"
mkdir -p results/pulk-action client/tmp/pa
CMN="--dur=60 --races=30 --seed=1 --reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 --strip-metrics --rerollVariant=1 --areaBonusPulk=0 --rowBonusEarly=1 --rowBonusPulk=0"
tool_flags() { case "$1" in
  a1) echo "--rubber-band=true --rbStartThreshold=0.25 --rbEndgameThreshold=0.55 --governorDirectorEnabled=false";;
  a2) echo "--rubber-band=false --governorDirectorEnabled=true --governorDirectorLeaderBrake=0.15 --governorDirectorChallengerBoost=0.10";;
  a3) echo "--rubber-band=true --rbStartThreshold=0.25 --rbEndgameThreshold=0.55 --governorDirectorEnabled=true --governorDirectorLeaderBrake=0.15 --governorDirectorChallengerBoost=0.10";;
esac; }
bonus_flags() { case "$1" in
  b0) echo "--areaBonusPost=0 --rowBonusPost=0";;
  b1) echo "--areaBonusPost=2.0 --rowBonusPost=0";;
  b2) echo "--areaBonusPost=0 --rowBonusPost=1";;
  b3) echo "--areaBonusPost=2.0 --rowBonusPost=1";;
esac; }
TRACKS="searound:manta:40 garden-path:snail:40 mountainstreet:boarder:60 seatrack:dolphin:60"
echo "[$(date +%H:%M:%S)] PULK-ACTION GRID launch: 12 cells × 4 tracks = 48 runs" >> "$LOG"
# A2/A3 first (most likely to produce front action), then A1.
for A in a2 a3 a1; do
  for B in b0 b1 b2 b3; do
    for TR in $TRACKS; do
      IFS=':' read -r TID RACER NR <<< "$TR"
      LABEL="${A}${B}-${TID}"
      s=$(date +%s)
      echo "[$(date +%H:%M:%S)] START $LABEL" >> "$LOG"
      node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" \
        $CMN $(tool_flags "$A") $(bonus_flags "$B") \
        --out="client/tmp/pa/$LABEL" --diagLabel="$LABEL" > "client/tmp/pa-$LABEL.stdout" 2>&1
      echo "[$(date +%H:%M:%S)] DONE  $LABEL rc=$? ($(($(date +%s)-s))s)" >> "$LOG"
    done
  done
done
echo "[$(date +%H:%M:%S)] PULK-ACTION GRID COMPLETE" >> "$LOG"
