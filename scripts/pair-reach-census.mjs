// ============================================================
// File:        scripts/pair-reach-census.mjs
// Project:     RaceArena — PAIR-REACH-ANALYSIS
//
// WHAT THIS IS. A read-only census of the main avoidance pair loop's reach. For a real race it
// counts, at sampled steps, how many of the N(N-1)/2 pairs fall inside the derived interaction
// bound — the number the implementing block would be buying.
//
// WHAT IT IS NOT. It is not a timer and it does not touch the engine. It imports `buildRace` and
// `stepRacePhysics` exactly as the bench harnesses do, steps the race, and reads `st.racers[]`
// between steps. NO ENGINE FILE IS EDITED, and no measurement here is a duration — the per-step
// cost in the report comes from the raw data PHYS-BENCH-1 and SIDE-FREE-CULL-1 already wrote.
//
// THE BOUND IT COUNTS AGAINST is derived in the report, and re-stated here in one line because a
// number in a tool that disagrees with its document is worse than no tool:
//
//     dT_max(pair) = (contactLength / pathLength) x max(speedBrakeTMultiplier, 1 + avoidanceBufferPct)
//
// with contactLength = (bodyLength_A + bodyLength_B)/2 summed as half-lengths. Every effect the pair
// loop can have is nested inside one of two gates, and both reduce to that expression. The FIELD
// bound replaces contactLength with the largest body in the field, which is what an implementation
// would use to prefilter before it knows the pair.
//
// USAGE
//   node scripts/pair-reach-census.mjs [--tracks=a,b] [--racers=30,70,100] [--samples=24] [--json=path]
// ============================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveIdentity, loadTracks, buildRace } from "./lib/raceDriver.mjs";
import { DEFAULT_CAMERA_CONFIG } from "../client/src/modules/storage/defaults.js";
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from "../client/src/modules/storage/defaults.js";
import { stepRacePhysics } from "../client/src/modules/raceCore.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};

const RACER_COUNTS = arg("racers", "30,70,100").split(",").map(Number);
const SAMPLES = Number(arg("samples", "24"));
const SECONDS = Number(arg("seconds", "60"));
const SEED = Number(arg("seed", "1"));
const ONLY = arg("tracks", "");
const JSON_OUT = arg("json", "");

// The two multipliers the gates use. Read from the shipped defaults rather than typed, so this tool
// cannot drift from the config the way the 2026-06 T_WINDOW derivation drifted from its gate.
const T_MULT = Math.max(
  DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeTMultiplier,
  1 + DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceBufferPct,
);
const Y_MULT = 1 + DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceBufferPct;

/** Lap-normalised shortest arc, the same comparison the pair loop makes. */
function shortestArcDeltaT(a, b) {
  let d = Math.abs(a - b) % 1;
  return d > 0.5 ? 1 - d : d;
}

const tracks = loadTracks(ONLY ? { only: ONLY } : {});
const rows = [];

for (const geo of tracks) {
  for (const racers of RACER_COUNTS) {
    const identity = resolveIdentity({
      racers,
      raceSeed: SEED,
      racerType: "track-default",
      seconds: SECONDS,
      note: `PAIR-REACH-ANALYSIS census n=${racers}`,
    });
    const race = buildRace(geo, identity, structuredClone(DEFAULT_CAMERA_CONFIG));
    const st = race.st;

    // Field geometry is fixed at construction: read it once.
    const pathLengthPx = st.racers[0]?.pathLengthPx ?? 0;
    const trackWidthPx = st.racers[0]?.trackWidthPx ?? 0;
    const bodyLens = st.racers.map((r) => r.drawnBodyLengthPx ?? r.frameSizePx ?? 0);
    const bodyWids = st.racers.map((r) => r.drawnBodyWidthPx ?? r.frameSizePx ?? 0);
    const maxBodyLen = Math.max(...bodyLens);
    const maxBodyWid = Math.max(...bodyWids);
    // FIELD bound: the widest pair this field can produce, so it is a superset of every pair bound.
    const fieldBoundT = pathLengthPx > 0 ? (maxBodyLen / pathLengthPx) * T_MULT : 0;
    const fieldBoundY =
      trackWidthPx > 0 ? (maxBodyWid / (trackWidthPx / 2)) * Y_MULT : 0;

    const totalSteps = Math.max(1, Math.round(SECONDS * 60));
    const every = Math.max(1, Math.floor(totalSteps / SAMPLES));
    let sampled = 0;
    let pairsTotal = 0;
    let pairsInT = 0;
    let pairsInTY = 0;
    let pairsInBoth = 0; // the exact per-pair bound, not the field one
    let tSpreadSum = 0;
    let worstInT = 0;

    for (let step = 0; step < totalSteps; step++) {
      stepRacePhysics(st, race.raceCfg);
      if (step % every !== 0) continue;
      const active = st.racers.filter((r) => !r.finished);
      const n = active.length;
      if (n < 2) continue;
      sampled++;
      let inT = 0;
      let inTY = 0;
      let inExact = 0;
      let minT = Infinity;
      let maxT = -Infinity;
      for (const r of active) {
        const tf = ((r.t % 1) + 1) % 1;
        if (tf < minT) minT = tf;
        if (tf > maxT) maxT = tf;
      }
      tSpreadSum += maxT - minT;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const rA = active[i];
          const rB = active[j];
          const dT = shortestArcDeltaT(rA.t, rB.t);
          const dY = Math.abs(rA.physicalY - rB.physicalY);
          if (dT <= fieldBoundT) {
            inT++;
            if (dY <= fieldBoundY) inTY++;
          }
          // The EXACT per-pair bound both gates reduce to.
          const frameA = rA.frameSizePx ?? 0;
          const frameB = rB.frameSizePx ?? 0;
          const contactLength = ((rA.drawnBodyLengthPx ?? frameA) + (rB.drawnBodyLengthPx ?? frameB)) / 2;
          const contactWidth = ((rA.drawnBodyWidthPx ?? frameA) + (rB.drawnBodyWidthPx ?? frameB)) / 2;
          const pairPL = Math.max(rA.pathLengthPx ?? 0, rB.pathLengthPx ?? 0);
          const pairTW = Math.max(rA.trackWidthPx ?? 0, rB.trackWidthPx ?? 0);
          const exactT = pairPL > 0 ? (contactLength / pairPL) * T_MULT : 0;
          const exactY = pairTW > 0 ? (contactWidth / (pairTW / 2)) * Y_MULT : 0;
          if (dT <= exactT && dY <= exactY) inExact++;
        }
      }
      const pairs = (n * (n - 1)) / 2;
      pairsTotal += pairs;
      pairsInT += inT;
      pairsInTY += inTY;
      pairsInBoth += inExact;
      if (pairs > 0 && inT / pairs > worstInT) worstInT = inT / pairs;
    }

    rows.push({
      track: geo.id ?? geo.name ?? "?",
      racers,
      pathLengthPx: Math.round(pathLengthPx),
      trackWidthPx,
      maxBodyLen: +maxBodyLen.toFixed(2),
      maxBodyWid: +maxBodyWid.toFixed(2),
      fieldBoundT: +fieldBoundT.toFixed(6),
      fieldBoundY: +fieldBoundY.toFixed(4),
      samples: sampled,
      meanTSpread: sampled ? +(tSpreadSum / sampled).toFixed(4) : 0,
      pairsTotal,
      pctInT: pairsTotal ? +((100 * pairsInT) / pairsTotal).toFixed(2) : 0,
      pctInTY: pairsTotal ? +((100 * pairsInTY) / pairsTotal).toFixed(2) : 0,
      pctExact: pairsTotal ? +((100 * pairsInBoth) / pairsTotal).toFixed(2) : 0,
      worstStepPctInT: +(100 * worstInT).toFixed(2),
    });
    const r = rows[rows.length - 1];
    console.log(
      `${String(r.track).padEnd(16)} n=${String(racers).padStart(3)}  boundT=${r.fieldBoundT.toFixed(5)}  ` +
        `boundY=${r.fieldBoundY.toFixed(3)}  inT=${String(r.pctInT).padStart(6)}%  ` +
        `inT&Y=${String(r.pctInTY).padStart(6)}%  exact=${String(r.pctExact).padStart(6)}%  ` +
        `worstStep=${String(r.worstStepPctInT).padStart(6)}%  tSpread=${r.meanTSpread}`,
    );
  }
}

if (JSON_OUT) {
  const out = isAbsolute(JSON_OUT) ? JSON_OUT : join(ROOT, JSON_OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ tMult: T_MULT, yMult: Y_MULT, rows }, null, 2));
  console.log(`\nwrote ${out}`);
}
