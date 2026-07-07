#!/usr/bin/env bash
# Re-run the D0.3 / D0.6 smart cells that the original driver mis-formatted (0.03 / 0.06). Correct
# linger mapping this time. base + D1.0 cells already valid, left untouched. Parallelism is proven safe
# (6 identical concurrent runs gave identical results); the throttle here is a plain 8-wide cap.
set -u
cd "$(dirname "$0")/.."
OUTDIR="results/pulk-action-3"; LOG="$OUTDIR/progress.log"; MAX=8
mkdir -p "$OUTDIR" client/tmp/pa3 results/strip-down
CMN="--dur=60 --races=30 --seed=1 --reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 --pulkSurgeEnabled=false --strip-metrics --rerollVariant=1 --areaBonusPulk=0 --rowBonusEarly=1 --rowBonusPulk=0 --areaBonusPost=2.0 --rowBonusPost=1 --rubber-band=false --governorDirectorEnabled=true --governorDirectorLeaderBrake=0.10 --governorDirectorChallengerBoost=0.06 --directorCeilingCap=auto"
TRACKS="searound:manta:40 garden-path:snail:40 mountainstreet:boarder:60 seatrack:dolphin:60"
echo "[$(date +%H:%M:%S)] RE-RUN D0.3/D0.6 (correct linger mapping), ${MAX}-way parallel: 24 runs" >> "$LOG"
n=0
for N in 5 8 12; do
  for D in 03 06; do
    case $D in 03) DS=0.3;; 06) DS=0.6;; esac   # FIX: explicit mapping (was "0.${D}" → 0.03/0.06)
    for TR in $TRACKS; do
      IFS=':' read -r TID RACER NR <<< "$TR"
      CELL="N${N}D${D}"
      ( node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" $CMN \
          --directorFrontPool=$N --directorBoostOncePerRace=on --directorLingerBrake=$DS \
          --out="client/tmp/pa3/${CELL}-${TID}" --diagLabel="${CELL}-${TID}" > "client/tmp/pa3-${CELL}-${TID}.stdout" 2>&1
        mv -f "results/strip-down/strip-${CELL}-${TID}.json" "$OUTDIR/" 2>/dev/null
        echo "[$(date +%H:%M:%S)] DONE  ${CELL}-${TID} (D=$DS)" >> "$LOG" ) &
      n=$((n+1)); [ $((n % MAX)) -eq 0 ] && wait
    done
  done
done
wait
echo "[$(date +%H:%M:%S)] RE-RUN D0.3/D0.6 COMPLETE" >> "$LOG"
