#!/usr/bin/env bash
# ============================================================
# Byte-identical verifier for the race-dynamics stage cleanup.
#
# Runs the shipped winning PULK-action config on one closed + one open track at a fixed
# seed and SHA-256-fingerprints the deterministic race output (the `combos` array of the
# strip-metrics dumps only — NOT `meta`, which echoes config keys that legitimately change
# as mechanisms are removed). The fingerprint must stay byte-identical through the whole
# cleanup and reproduce from a clean checkout of origin.
#
# Usage (from anywhere; resolves the repo root from its own location):
#     bash scripts/verify-winning.sh
#
# Requires: node + the tracked harness scripts/sim-fairness.mjs (no other dependency).
# Exit 0 = fingerprint matches the reference; exit 1 = mismatch.
# ============================================================
set -u
cd "$(dirname "$0")/.." || exit 2

# Re-baselined 2026-07-10 (INFRA sim-trust). The historical Stage-0 reference (72cfbdb4…) died at
# INFRA step 4 (shared t-update / rowEnvMult) — a parity REPAIR, not a regression — so the winning-
# config output legitimately moved to the value below. INFRA step 5A (shared areaBonus phase-split)
# is byte-identical to this re-baselined value: the sim now applies the shipped split (early 1.0 /
# pulk 0 / post 1.0) NATIVELY via the controller, so the explicit --areaBonus* flags below became
# inert and were removed. (Prior reference kept for the record: 72cfbdb4…31a1760862fa4423819834cb.)
REFERENCE="fcf4f8e8c7d453857756a3d14fd1ace3b842a3a5b27a14050402893f2ea09270"

# The shipped winning config, expressed as explicit sim flags (the sim is a flag-driven
# harness). Flags for removed mechanisms (--pulkSurgeEnabled / --rubber-band) are inert now
# and kept only so this command reproduces the reference exactly. The areaBonus phase-split is now
# applied natively from the shipped dynamics config (INFRA 5A), so no --areaBonus* flags are passed.
WIN="--reRollVariationPercent=75 --reRollTransitionDuration=3 --reRollIntervalDivisor=10 --reRollLastPositionPercent=95 \
--pulkSurgeEnabled=false --strip-metrics --rerollVariant=1 \
--rowBonusEarly=1 --rowBonusPulk=0 --rowBonusPost=1 \
--rubber-band=false --governorDirectorEnabled=true --governorDirectorLeaderBrake=0.10 --governorDirectorChallengerBoost=0.06 \
--directorCeilingCap=auto --directorFrontPool=8 --directorBoostOncePerRace=on --directorLingerBrake=0.6"

run () { # trackid racer nr label
  node scripts/sim-fairness.mjs --track="$1" --racer="$2" --racers="$3" --dur=60 --races=6 --seed=1 \
    $WIN --diagLabel="$4" > /dev/null 2>&1
}

run searound manta 40 vwin-closed
run mountainstreet boarder 60 vwin-open

# Fingerprint: the combos array (race output) of both strip files, order-stable.
FINGERPRINT="$(node -e '
const fs=require("fs");
const files=["results/strip-down/strip-vwin-closed.json","results/strip-down/strip-vwin-open.json"];
const crypto=require("crypto");
const h=crypto.createHash("sha256");
for(const f of files){const j=JSON.parse(fs.readFileSync(f,"utf8"));h.update(JSON.stringify(j.combos));}
process.stdout.write(h.digest("hex"));
')"

echo "WINNING-CONFIG-FINGERPRINT $FINGERPRINT"
echo "REFERENCE                  $REFERENCE"
if [ "$FINGERPRINT" = "$REFERENCE" ]; then
  echo "RESULT: MATCH (byte-identical to the reference)"
  exit 0
else
  echo "RESULT: MISMATCH — the winning-config race output changed"
  exit 1
fi
