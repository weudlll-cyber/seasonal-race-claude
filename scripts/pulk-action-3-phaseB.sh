#!/usr/bin/env bash
# PULK-action-3 Phase B broad confirmation (read-only sim). Winning cell N8/D0.6 (front-pool 8, linger
# 0.6 s, boost 0.06, leaderBrake 0.10, ceiling cap ON) across ALL 10 tracks × 30 races. Surge OFF,
# tail-lift OFF, rubber-band OFF, PULK bonuses 0, chaos row-bonus full, B3 restore, variant-1. Parallel.
set -u
cd "$(dirname "$0")/.."
OUTDIR="results/pulk-action-3"; LOG="$OUTDIR/progress.log"; MAX=8
mkdir -p "$OUTDIR" client/tmp/pa3 results/strip-down
CMN="--dur=60 --races=30 --seed=1 --reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 --pulkSurgeEnabled=false --strip-metrics --rerollVariant=1 --areaBonusPulk=0 --rowBonusEarly=1 --rowBonusPulk=0 --areaBonusPost=2.0 --rowBonusPost=1 --rubber-band=false --governorDirectorEnabled=true --governorDirectorLeaderBrake=0.10 --governorDirectorChallengerBoost=0.06 --directorCeilingCap=auto --directorFrontPool=8 --directorBoostOncePerRace=on --directorLingerBrake=0.6"
# track:racer:racers  (5 closed/40 + 5 open/60)
TRACKS="searound:manta:40 garden-path:snail:40 dirt-oval:horse:40 ice-track:snowmobile:40 city-circuit:motorbike:40 mountainstreet:boarder:60 seatrack:dolphin:60 luger-hill:luge:60 space-sprint:rocket:60 river-run:duck:60"
echo "[$(date +%H:%M:%S)] PHASE B launch (N8/D0.6, surge OFF): 10 tracks × 30 races" >> "$LOG"
n=0
for TR in $TRACKS; do
  IFS=':' read -r TID RACER NR <<< "$TR"
  LABEL="pb-${TID}"
  ( node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" $CMN \
      --out="client/tmp/pa3/${LABEL}" --diagLabel="${LABEL}" > "client/tmp/pa3-${LABEL}.stdout" 2>&1
    mv -f "results/strip-down/strip-${LABEL}.json" "$OUTDIR/" 2>/dev/null
    echo "[$(date +%H:%M:%S)] DONE  ${LABEL}" >> "$LOG" ) &
  n=$((n+1)); [ $((n % MAX)) -eq 0 ] && wait
done
wait
echo "[$(date +%H:%M:%S)] PHASE B COMPLETE" >> "$LOG"
