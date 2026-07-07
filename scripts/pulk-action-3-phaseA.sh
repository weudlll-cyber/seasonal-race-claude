#!/usr/bin/env bash
# PULK-action-3 Phase A sweep (read-only sim). Smart two-sided contest: ceiling-capped boost 0.06 +
# leaderBrake 0.10 + front-pool N ∈ {5,8,12} + once-per-race + linger-brake D ∈ {0.3,0.6,1.0 s}, plus a
# whole-field / D=0 BASELINE. All: cap=auto, B3, chaos row-bonus full, PULK bonuses 0, rubber-band OFF,
# **surge OFF**, tail-lift OFF, variant-1, dwell 0.08. 10 cells × 4 tracks × 30 races = 40 runs, executed
# with a concurrency cap of MAX parallel node processes (14-core box).
set -u
cd "$(dirname "$0")/.."
OUTDIR="results/pulk-action-3"; LOG="$OUTDIR/progress.log"; MAX=12
mkdir -p "$OUTDIR" client/tmp/pa3 results/strip-down
CMN="--dur=60 --races=30 --seed=1 --reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 --pulkSurgeEnabled=false --strip-metrics --rerollVariant=1 --areaBonusPulk=0 --rowBonusEarly=1 --rowBonusPulk=0 --areaBonusPost=2.0 --rowBonusPost=1 --rubber-band=false --governorDirectorEnabled=true --governorDirectorLeaderBrake=0.10 --governorDirectorChallengerBoost=0.06 --directorCeilingCap=auto"
TRACKS="searound:manta:40 garden-path:snail:40 mountainstreet:boarder:60 seatrack:dolphin:60"
launch() { # $1=cell label  $2=extra flags  $3=track spec
  IFS=':' read -r TID RACER NR <<< "$3"
  ( node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" $CMN $2 \
      --out="client/tmp/pa3/${1}-${TID}" --diagLabel="${1}-${TID}" > "client/tmp/pa3-${1}-${TID}.stdout" 2>&1
    mv -f "results/strip-down/strip-${1}-${TID}.json" "$OUTDIR/" 2>/dev/null
    echo "[$(date +%H:%M:%S)] DONE  ${1}-${TID}" >> "$LOG" ) &
}
echo "[$(date +%H:%M:%S)] PHASE A launch (surge OFF, ${MAX}-way parallel): 40 runs" >> "$LOG"
# Build the flat (cell,flags) list, then fan out all tracks with a concurrency cap.
CELLS=("base|")
for N in 5 8 12; do for D in 03 06 10; do DS="0.${D}"; [ "$D" = 10 ] && DS="1.0"
  CELLS+=("N${N}D${D}|--directorFrontPool=$N --directorBoostOncePerRace=on --directorLingerBrake=$DS"); done; done
for entry in "${CELLS[@]}"; do
  CELL="${entry%%|*}"; FLAGS="${entry#*|}"
  for TR in $TRACKS; do
    while [ "$(jobs -r | wc -l)" -ge "$MAX" ]; do wait -n 2>/dev/null || sleep 2; done
    launch "$CELL" "$FLAGS" "$TR"
  done
done
wait
echo "[$(date +%H:%M:%S)] PHASE A COMPLETE" >> "$LOG"
