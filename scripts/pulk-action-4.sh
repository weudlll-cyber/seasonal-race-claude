#!/usr/bin/env bash
# PULK-action-4: recover the stranded worst-case winner via areaBonus in CHAOS. Winner cell N8/D0.6
# unchanged; ONLY --areaBonusEarly added (1.0 / 2.0). Re-test the 3 fairness-failing tracks. Read-only.
set -u; cd "$(dirname "$0")/.."
OUTDIR="results/pulk-action-4"; LOG="$OUTDIR/progress.log"
CMN="--dur=60 --races=30 --seed=1 --reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 --pulkSurgeEnabled=false --strip-metrics --front-action --rerollVariant=1 --rowBonusEarly=1 --rowBonusPulk=0 --rowBonusPost=1 --areaBonusPulk=0 --areaBonusPost=2.0 --rubber-band=false --governorDirectorEnabled=true --governorDirectorLeaderBrake=0.10 --governorDirectorChallengerBoost=0.06 --directorCeilingCap=auto --directorFrontPool=8 --directorBoostOncePerRace=on --directorLingerBrake=0.6"
TRACKS="searound:manta:40 city-circuit:motorbike:40 luger-hill:luge:60"
echo "[$(date +%H:%M:%S)] PULK-action-4 launch: 3 tracks x early{1.0,2.0}" >> "$LOG"
for E in 1.0 2.0; do EL=$(echo $E | tr -d '.'); for TR in $TRACKS; do
  IFS=':' read -r TID RACER NR <<< "$TR"; LABEL="e${EL}-${TID}"
  ( node scripts/sim-fairness.mjs --track="$TID" --racer="$RACER" --racers="$NR" $CMN --areaBonusEarly=$E \
      --out="client/tmp/pa4/${LABEL}" --diagLabel="${LABEL}" > "client/tmp/pa4-${LABEL}.stdout" 2>&1
    mv -f "results/strip-down/strip-${LABEL}.json" "$OUTDIR/" 2>/dev/null
    echo "[$(date +%H:%M:%S)] DONE  ${LABEL}" >> "$LOG" ) &
done; done
wait; echo "[$(date +%H:%M:%S)] PULK-action-4 COMPLETE" >> "$LOG"
