#!/usr/bin/env bash
# PULK-action-2 Phase A calibration sweep (read-only sim). Two-sided contest with CEILING-CAPPED boost
# (naturalness). Sweep: challengerBoost {0.04,0.06,0.08} × leaderBrake {0.10,0.15} × cadence
# {fast=dwell0.08/cast3, slow=dwell0.16/cast2}. All: cap=auto, B3 (areaBonusPost 2.0 + rowBonusPost 1),
# chaos row-bonus full, PULK bonuses 0, rubber-band OFF, tail-lift/surge OFF, variant-1 re-roll.
# 12 cells × 4 tracks × 30 races. Writes results/pulk-action-2/ (moved from strip-down) + progress.log.
set -u
cd "$(dirname "$0")/.."
OUTDIR="results/pulk-action-2"; LOG="$OUTDIR/progress.log"
mkdir -p "$OUTDIR" client/tmp/pa2 results/strip-down
CMN="--dur=60 --races=30 --seed=1 --reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 --strip-metrics --rerollVariant=1 --areaBonusPulk=0 --rowBonusEarly=1 --rowBonusPulk=0 --areaBonusPost=2.0 --rowBonusPost=1 --rubber-band=false --governorDirectorEnabled=true --directorCeilingCap=auto"
TRACKS="searound:manta:40 garden-path:snail:40 mountainstreet:boarder:60 seatrack:dolphin:60"
echo "[$(date +%H:%M:%S)] PHASE A launch: 12 cells × 4 tracks = 48 runs (cap=auto, B3)" >> "$LOG"
for BOOST in 04 06 08; do
  for BRAKE in 10 15; do
    for CAD in fast slow; do
      if [ "$CAD" = fast ]; then DW=0.08; CS=3; else DW=0.16; CS=2; fi
      CELL="p${BOOST}br${BRAKE}${CAD}"
      for TR in $TRACKS; do
        IFS=':' read -r TID RACER NR <<< "$TR"
        LABEL="${CELL}-${TID}"
        s=$(date +%s)
        echo "[$(date +%H:%M:%S)] START $LABEL" >> "$LOG"
        node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" $CMN \
          --governorDirectorLeaderBrake=0.${BRAKE} --governorDirectorChallengerBoost=0.${BOOST} \
          --governorDirectorDwell=$DW --governorDirectorCastSize=$CS \
          --out="client/tmp/pa2/$LABEL" --diagLabel="$LABEL" > "client/tmp/pa2-$LABEL.stdout" 2>&1
        rc=$?
        mv -f "results/strip-down/strip-${LABEL}.json" "$OUTDIR/" 2>/dev/null
        echo "[$(date +%H:%M:%S)] DONE  $LABEL rc=$rc ($(($(date +%s)-s))s)" >> "$LOG"
      done
    done
  done
done
echo "[$(date +%H:%M:%S)] PHASE A COMPLETE" >> "$LOG"
