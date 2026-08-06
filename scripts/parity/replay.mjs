// ============================================================
// File:        scripts/parity/replay.mjs
// Project:     RaceArena — sim replay entry (fix-plan step 4 / D-CONFIG).
//
// Pins the FULL race identity — seed, track, roster, racer count, laps|seconds, racePlanEnabled and the
// world hash — into one file, and replays exactly that race through the shared browser core. It reuses
// the golden-test identity helpers (buildIdentity / hashIdentity), so a replay is byte-identical to a
// browser Quick-Test on the same identity, and to the sim (they run the SAME stepRacePhysics).
//
// This is a SEPARATE entry rather than a `--replay` flag on sim-fairness.mjs on purpose: sim-fairness is
// the fairness-sweep combo loop, and a single-race replay has no business inside it (and must not touch
// the fingerprint path). Both consume the same step function, so a replay here IS a sim race.
//
// Usage:
//   # write a ready-to-use identity file for one race
//   node scripts/parity/replay.mjs --emit --track=searound --racer=manta --seed=7 --racers=40 \
//        --shape=closed [--laps=2] --out=identity.json
//
//   # emit from a golden/soak row label
//   node scripts/parity/replay.mjs --emit --from-label="searound/manta/closed/n=40/seed=7" --out=id.json
//
//   # replay a saved identity (real browser core vs the sim; asserts they agree)
//   node scripts/parity/replay.mjs --replay=identity.json
// ============================================================

import { readFileSync, writeFileSync } from "fs";
import {
  buildIdentity,
  realArm,
  simArm,
  RACER_NAMES,
} from "./goldenRunner.mjs";
import { hashIdentity } from "../../client/src/modules/parity/raceIdentity.js";

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const val = (k, d = null) => {
  const m = argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};

/** Parse a golden/soak row label "track/type/shape/n=N/seed=S[/laps=L]" into a case spec. */
export function specFromLabel(label) {
  const p = label.split("/");
  const trackId = p[0];
  const racerType = p[1];
  const shape = p[2];
  const spec = { trackId, racerType, shape, nRacers: 20, seed: 1 };
  for (const seg of p.slice(3)) {
    const [k, v] = seg.split("=");
    if (k === "n") spec.nRacers = Number(v);
    else if (k === "seed") spec.seed = Number(v);
    else if (k === "laps") spec.laps = Number(v);
  }
  return spec;
}

/** Build the case spec from CLI flags (or --from-label). */
function specFromArgs() {
  const fromLabel = val("from-label");
  if (fromLabel) return specFromLabel(fromLabel);
  const spec = {
    trackId: val("track"),
    racerType: val("racer"),
    seed: Number(val("seed", "1")),
    nRacers: Number(val("racers", "20")),
    shape: val("shape", "closed"),
  };
  if (val("laps") != null) spec.laps = Number(val("laps"));
  if (!spec.trackId || !spec.racerType) {
    throw new Error(
      "replay --emit needs --track and --racer (or --from-label=...)",
    );
  }
  return spec;
}

/** The serialized identity file: the spec + the content hashes that pin the world / geometry / roster. */
export function identityFileFor(spec) {
  const identity = buildIdentity(spec);
  return {
    spec,
    identityHash: hashIdentity(identity),
    worldHash: identity.worldHash,
    trackGeometryHash: identity.trackGeometryHash,
    rosterHash: identity.rosterHash,
    racePlanEnabled: identity.racePlanEnabled,
    isOpen: identity.isOpen,
    laps: identity.laps,
    requestedSeconds: identity.requestedSeconds,
    speedMultiplier: identity.speedMultiplier,
  };
}

/**
 * Rebuild a race from a saved identity file and run it through the real browser core + the sim.
 * Verifies the current build reproduces the SAME identity hash (guards against a drifted config world,
 * track geometry or roster), then that the two arms agree.
 */
export function replayIdentityFile(file) {
  const spec = file.spec;
  const identity = buildIdentity(spec);
  const nowHash = hashIdentity(identity);
  const identityMatches =
    file.identityHash == null || nowHash === file.identityHash;

  const roster = RACER_NAMES.slice(0, spec.nRacers);
  const real = realArm(identity);
  const sim = simArm(identity);
  const order = [...real.results]
    .sort((a, b) => a.finalRank - b.finalRank)
    .map((r) => roster[r.racerIndex] ?? `#${r.racerIndex}`);
  const winnerMs = real.results.find((r) => r.finalRank === 1)?.finishTime;
  const secondMs = real.results.find((r) => r.finalRank === 2)?.finishTime;
  return {
    spec,
    identityHash: nowHash,
    identityMatches,
    equal: real.hash === sim.hash,
    realHash: real.hash,
    simHash: sim.hash,
    order,
    winnerMarginSec:
      winnerMs != null && secondMs != null
        ? +(secondMs - winnerMs).toFixed(3)
        : null,
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────────────────────────
function main() {
  if (has("emit")) {
    const spec = specFromArgs();
    const file = identityFileFor(spec);
    const out = val("out", "identity.json");
    writeFileSync(out, JSON.stringify(file, null, 2));
    console.log(`identity → ${out}`);
    console.log(`  ${JSON.stringify(file.spec)}`);
    console.log(
      `  identityHash ${file.identityHash}   racePlanEnabled ${file.racePlanEnabled}`,
    );
    return;
  }
  const replayPath = val("replay");
  if (replayPath) {
    const file = JSON.parse(readFileSync(replayPath, "utf8"));
    const r = replayIdentityFile(file);
    console.log(`=== REPLAY ${replayPath} ===`);
    console.log(`  ${JSON.stringify(r.spec)}`);
    console.log(
      `  identity ${r.identityHash} ${r.identityMatches ? "(matches saved)" : "*** DRIFTED from saved " + file.identityHash + " ***"}`,
    );
    console.log(
      `  real ${r.realHash}   sim ${r.simHash}   ${r.equal ? "EQUAL" : "*** MISMATCH ***"}`,
    );
    console.log(`  winner ${r.order[0]}   margin ${r.winnerMarginSec}s`);
    console.log(`  order: ${r.order.join(", ")}`);
    if (!r.identityMatches || !r.equal) process.exitCode = 1;
    return;
  }
  console.log(
    "usage: --emit --track= --racer= [--seed= --racers= --shape= --laps=] --out=file",
  );
  console.log(
    '       --emit --from-label="track/type/shape/n=N/seed=S[/laps=L]" --out=file',
  );
  console.log("       --replay=file");
}

if (process.argv[1] && process.argv[1].endsWith("replay.mjs")) main();
