#!/usr/bin/env bash
# PROBE-RECOVERY: measure OUTCOME's raw recovery of the assigned winner (NO position-gate) to DERIVE
# gate thresholds. Winning cell N8/D0.6, surge OFF, ceiling-cap on, chaos areaBonusEarly=1.0, PULK
# areaBonus OFF, post=1.0. 100 races × 4 tracks (3 unfair + 1 fair control). Read-only. Parallel.
set -u; cd "$(dirname "$0")/.."
OUTDIR="results/probe-recovery"; LOG="$OUTDIR/progress.log"
CMN="--dur=60 --races=100 --seed=1 --reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 --pulkSurgeEnabled=false --strip-metrics --rerollVariant=1 --areaBonusEarly=1.0 --areaBonusPulk=0 --areaBonusPost=1.0 --rowBonusEarly=1 --rowBonusPulk=0 --rowBonusPost=1 --rubber-band=false --governorDirectorEnabled=true --governorDirectorLeaderBrake=0.10 --governorDirectorChallengerBoost=0.06 --directorCeilingCap=auto --directorFrontPool=8 --directorBoostOncePerRace=on --directorLingerBrake=0.6"
TRACKS="searound:manta:40 luger-hill:luge:60 river-run:duck:60 garden-path:snail:40"
echo "[$(date +%H:%M:%S)] PROBE-RECOVERY launch: 4 tracks x 100 races (no gate)" >> "$LOG"
for TR in $TRACKS; do IFS=':' read -r TID RACER NR <<< "$TR"; L="pr-${TID}"
  ( node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" $CMN \
      --out="client/tmp/pr/${L}" --diagLabel="${L}" > "client/tmp/pr-${L}.stdout" 2>&1
    mv -f "results/strip-down/strip-${L}.json" "$OUTDIR/" 2>/dev/null
    echo "[$(date +%H:%M:%S)] DONE ${L}" >> "$LOG" ) &
done; wait
echo "[$(date +%H:%M:%S)] PROBE-RECOVERY COMPLETE" >> "$LOG"
