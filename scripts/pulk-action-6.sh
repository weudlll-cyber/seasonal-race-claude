#!/usr/bin/env bash
set -u; cd "$(dirname "$0")/.."
OUTDIR="results/pulk-action-6"; LOG="$OUTDIR/progress.log"; MAX=8
CMN="--dur=60 --races=30 --seed=1 --reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 --pulkSurgeEnabled=false --strip-metrics --front-action --rerollVariant=1 --areaBonusEarly=2.0 --areaBonusPulk=0 --areaBonusPost=1.0 --rowBonusEarly=1 --rowBonusPulk=0 --rowBonusPost=1 --rubber-band=false --governorDirectorEnabled=true --governorDirectorLeaderBrake=0.10 --governorDirectorChallengerBoost=0.06 --directorCeilingCap=auto --directorFrontPool=8 --directorBoostOncePerRace=on --directorLingerBrake=0.6"
TRACKS="searound:manta:40 garden-path:snail:40 dirt-oval:horse:40 ice-track:snowmobile:40 city-circuit:motorbike:40 mountainstreet:boarder:60 seatrack:dolphin:60 luger-hill:luge:60 space-sprint:rocket:60 river-run:duck:60"
echo "[$(date +%H:%M:%S)] PULK-action-6 launch: owner profile (early2.0/pulk0/post1.0), 10 tracks" >> "$LOG"
n=0
for TR in $TRACKS; do IFS=':' read -r TID RACER NR <<< "$TR"; L="p6-${TID}"
  ( node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" $CMN \
      --out="client/tmp/pa6/${L}" --diagLabel="${L}" > "client/tmp/pa6-${L}.stdout" 2>&1
    mv -f "results/strip-down/strip-${L}.json" "$OUTDIR/" 2>/dev/null
    echo "[$(date +%H:%M:%S)] DONE ${L}" >> "$LOG" ) &
  n=$((n+1)); [ $((n % MAX)) -eq 0 ] && wait
done; wait; echo "[$(date +%H:%M:%S)] PULK-action-6 COMPLETE" >> "$LOG"
