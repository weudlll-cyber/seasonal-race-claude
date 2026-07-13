#!/usr/bin/env bash
# Overnight PulkLeadRotation fairness + action sweep — the ONE live regression harness.
# Read-only measurement: results/ only, no default flipped, no commit, no tag.
# World: choreography + lead rotation are UNCONDITIONAL (shipped). PULK end choreoOutcomeStart=0.5,
#        pulkBoostHeadroom=0.10, pulkChallengerBoost=0.06 (shipped), other lead-rotation knobs
#        at shipped defaults.
# Configs per track: A0 (race-plan OFF — the mechanism-off floor: rotation + choreography are
#        unconditional now, so --race-plan=false is the only way to turn them off),
#        D2 (ON, dropDepth=2), D8 (ON, dropDepth=8).
# Clean tracks: 60s duration only (N=100). Borderline (searound, luger-hill): 30/60/120 (N=100).
set -u
cd "c:/Users/weudl/OneDrive/Dokumente/Seasonal race claude" || exit 1

OUTROOT="results/sweep-pulklr"
LOGDIR="$OUTROOT/logs"
mkdir -p "$LOGDIR"

# track -> default racer
TRACKS=(
  "city-circuit:motorbike"
  "dirt-oval:horse"
  "garden-path:snail"
  "ice-track:snowmobile"
  "luger-hill:luge"
  "mountainstreet:boarder"
  "river-run:duck"
  "searound:manta"
  "seatrack:dolphin"
  "space-sprint:rocket"
)
# Borderline tracks get the full 3-duration sweep (else 60s only).
is_borderline() { [ "$1" = "searound" ] || [ "$1" = "luger-hill" ]; }

# Common world flags. race-plan is set PER CONFIG (below), NOT here, because argVal takes the FIRST
# occurrence — A0 needs --race-plan=false while D2/D8 need --race-plan=true.
COMMON="--seed=1 --races=100 --choreoOutcomeStart=0.5 \
--pulkBoostHeadroom=0.10 --pulkChallengerBoost=0.06 --hero-map --action-metrics"

run_one() {
  local track="$1" racer="$2" cfgname="$3" cfgflags="$4" durflag="$5"
  local tag="${cfgname}__${track}"
  echo "PROGRESS start $tag $(date '+%H:%M:%S')"
  node scripts/sim-fairness.mjs --track="$track" --racer="$racer" $durflag $COMMON \
    $cfgflags --diagLabel="$tag" --out="$OUTROOT/$tag" > "$LOGDIR/$tag.log" 2>&1
  local rc=$?
  echo "PROGRESS done  $tag rc=$rc $(date '+%H:%M:%S')"
}

echo "SWEEP-BEGIN $(date '+%Y-%m-%d %H:%M:%S')"
for entry in "${TRACKS[@]}"; do
  track="${entry%%:*}"; racer="${entry##*:}"
  if is_borderline "$track"; then durflag=""; else durflag="--dur=60"; fi
  # A0 — mechanism-off floor (race-plan OFF → no rotation, no choreography). D2/D8 — mechanism ON.
  run_one "$track" "$racer" "A0" "--race-plan=false" "$durflag"
  run_one "$track" "$racer" "D2" "--race-plan=true --pulkLeadRotationDropDepthLengths=2" "$durflag"
  run_one "$track" "$racer" "D8" "--race-plan=true --pulkLeadRotationDropDepthLengths=8" "$durflag"
done
echo "SWEEP-END $(date '+%Y-%m-%d %H:%M:%S')"
