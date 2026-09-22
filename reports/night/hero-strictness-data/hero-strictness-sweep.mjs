// ============================================================
// File:        hero-strictness-sweep.mjs
// Path:        reports/night/hero-strictness-data/hero-strictness-sweep.mjs
// Project:     RaceArena — HERO-STRICTNESS-1, the sweep
// Description: Five values of `choreoHeroStrictness` on the fixture BREAKAWAY-COUNT-2 used, so the
//              control is comparable to its 16.0% and to GROUP-BRAKE-SWEEP-1's control, which
//              reproduced that figure to the digit.
//
//              Evidence for one report, so it lives beside its data under reports/. It imports
//              raceCore; nothing in the product imports it.
//
// ── WHAT IS REUSED, UNCHANGED ──────────────────────────────────────────────────────────────────
// The driving loop, the PRE-STEP ranking, the gap expression `(ahead.t - behind.t) * pathLengthPx`
// and the whole breakaway DEFINITION are `group-brake-sweep.mjs`'s (tag
// `archive/group-gap-brake-1`), which took them from `breakaway-count.mjs` ← `action-arms.mjs` ←
// `breakaway-lever.mjs`. The definition does NOT change here: largest of the consecutive gaps
// inside the front band, group cap 5, his 157.05 px threshold, fixed [0.70, finish] window.
// ★ Reused rather than rewritten so this sweep's CONTROL and the group brake's CONTROL are the
// same measurement of the same race, and the two blocks can be read against each other.
//
// ── WHAT IS NEW HERE ───────────────────────────────────────────────────────────────────────────
//   · the ARM LOOP over `choreoHeroStrictness`;
//   · ★★ THE IDENTICAL-ARM THROW (§C). Every arm's finishing order and times are hashed, and two
//     arms sharing a hash THROW rather than warn. Identical arms are not a result — they are an
//     unreachable mechanism, and that has happened twice in two days with numbers that looked
//     plausible both times.
//   · LONE-LEADER share, the metric the group brake died on;
//   · DISTANCE FROM THE DRAWN PLACE at the finish, median |finishRank − drawnRank|, split cast
//     against pack — the terms the draw is actually written in.
//
// ── ★★ WHERE IT SAMPLES ────────────────────────────────────────────────────────────────────────
// ON THE PHYSICS STEP. Positions and finished flags are snapshotted BEFORE `stepRacePhysics` —
// what the controller ranked and measured gaps on. Never a `runRace` frame callback, which can
// cover two physics steps and read every gap one step late.
// ============================================================

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.RA_ROOT ?? join(HERE, "..", "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const RD = await import(u("scripts/lib/raceDriver.mjs"));
const { stepRacePhysics } = await import(u("client/src/modules/raceCore.js"));
const { QUICK_TEST_NAMES } = await import(u("client/src/modules/racerNames.js"));
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { BAND_EDGES, bandOfRank } = await import(u("client/src/modules/racePlanner.js")).then(
  async (m) => ({
    ...m,
    bandOfRank: (await import(u("client/src/modules/heroCurveGenerator.js"))).bandOfRank,
  }),
);

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const SEEDS = Number(arg("seeds", 3));
const ARM_FILTER = arg("arm", null);
const OUT = arg("out", HERE);
const TAG = arg("tag", "n30");

const RACERS = 40;
const SECONDS = 60;
const BASE = RD.worldForActionStage("quiet"); // the shipped stage, defaults.js
const THRESHOLD_PX = 157.05; // ★ HIS lead — BREAKAWAY-RECOUNT-2:20
const W70_START = 0.7;
const FRONT_BAND = BAND_EDGES[0]; // 5 — the DETECTION cap, the owner's phenomenon

// S00 is the REFUTED anchor and is here to calibrate, not to compete: strictness 0 was shipped and
// removed on 2026-09-13 (ARRIVAL-STEERED-AGAIN-1, 3.3x the pre-shape gap at twenty racers).
const ARMS = [
  { id: "S100", strictness: 1.0, note: "today — the CONTROL" },
  { id: "S85", strictness: 0.85, note: "" },
  { id: "S70", strictness: 0.7, note: "" },
  { id: "S50", strictness: 0.5, note: "the pack's own value" },
  { id: "S00", strictness: 0.0, note: "the REFUTED anchor — calibration only" },
];

const worldFor = (arm) => ({
  ...BASE,
  raceDynamicsConfig: { ...BASE.raceDynamicsConfig, choreoHeroStrictness: arm.strictness },
});

function measureRace(geo, seed, arm, world) {
  const identity = RD.resolveIdentity({
    racers: RACERS,
    raceSeed: seed,
    seconds: SECONDS,
    racerType: RD.TRACK_DEFAULT_RACER,
    roster: QUICK_TEST_NAMES,
    note: `HERO-STRICTNESS-1 ${arm.id}`,
  });
  const race = RD.buildRace(geo, identity, DEFAULT_CAMERA_CONFIG, world);
  const { st, raceCfg } = race;
  const ctl = raceCfg.racePlanController;
  const pathPx = geo.pathLengthPx ?? 0;
  const n = st.racers.length;

  const pT = new Float64Array(n);
  const pFin = new Uint8Array(n);
  const winPack = [];
  let packMax = -Infinity;
  let crossProg = null,
    crossSize = null;
  let firstFinishSeen = false,
    packAtFinish = null;
  let dtMs = null;
  let lc = 0,
    prevP1 = -1,
    wLc = 0,
    wPrev = -1;
  // position changes inside the TOP 5 during the window — the churn Lesson 178 predicts falls
  let top5Swaps = 0,
    prevTop5 = null,
    top5Frames = 0;
  const CEILING = 200 * 60 * 4;
  let k = 0;

  while (st.finishedCount < n && k < CEILING) {
    for (let i = 0; i < n; i++) {
      pT[i] = st.racers[i].t;
      pFin[i] = st.racers[i].finished ? 1 : 0;
    }
    const prog = st.raceProgress;
    const tsBefore = st.physicsTs;
    stepRacePhysics(st, raceCfg);
    if (dtMs == null) dtMs = st.physicsTs - tsBefore;
    k++;

    const order = [];
    for (let i = 0; i < n; i++) if (!pFin[i]) order.push(i);
    order.sort((a, b) => pT[b] - pT[a]);
    if (order.length < 2) break;
    if (!firstFinishSeen && st.finishedCount > 0) firstFinishSeen = true;

    const li = order[0];
    if (prevP1 >= 0 && li !== prevP1) lc++;
    prevP1 = li;

    // the owner's breakaway gap — DETECTION, cap FRONT_BAND, unchanged from BREAKAWAY-COUNT-2
    let bestGap = -Infinity,
      cut = -1;
    const maxCut = Math.min(FRONT_BAND, order.length - 1);
    for (let c = 1; c <= maxCut; c++) {
      const g = (pT[order[c - 1]] - pT[order[c]]) * pathPx;
      if (g > bestGap) {
        bestGap = g;
        cut = c;
      }
    }

    if (prog >= W70_START && !firstFinishSeen) {
      if (wPrev >= 0 && li !== wPrev) wLc++;
      wPrev = li;
      if (Number.isFinite(bestGap)) {
        winPack.push(bestGap);
        if (bestGap > packMax) packMax = bestGap;
        if (crossProg == null && bestGap >= THRESHOLD_PX) {
          crossProg = prog;
          crossSize = cut;
        }
      }
      packAtFinish = bestGap;
      // top-5 churn, on the same pre-step order
      const t5 = order.slice(0, Math.min(5, order.length));
      if (prevTop5 && prevTop5.length === t5.length) {
        top5Frames++;
        for (let i = 0; i < t5.length; i++)
          if (t5[i] !== prevTop5[i]) {
            top5Swaps++;
            break;
          }
      }
      prevTop5 = t5;
    }
  }

  // ── the fairness gate, from the project's own function ────────────────────────────────────
  let arrived = 0,
    counted = 0;
  const perTrackArrived = {};
  // ── distance from the drawn place, in the terms the draw is written in ────────────────────
  const castErr = [],
    packErr = [];
  for (const r of st.racers) {
    const drawn = ctl.getTargetRank(r.index);
    if (drawn == null || r.finishRank == null) continue;
    counted++;
    if (bandOfRank(drawn) === bandOfRank(r.finishRank)) arrived++;
    (r.isHeroChoreographed ? castErr : packErr).push(Math.abs(r.finishRank - drawn));
  }
  perTrackArrived[geo.id] = { arrived, counted };

  let heldSteps = 0;
  if (Number.isFinite(packMax) && packMax > 0)
    for (const g of winPack) if (g >= packMax / 2) heldSteps++;

  // ★★ THE ARM HASH — finishing order AND times. Two arms sharing this are the same race.
  const rows = st.racers
    .map((r) => `${r.index}:${r.finishRank}:${Math.round(r.finishTimeMs ?? -1)}`)
    .join("|");

  return {
    arm: arm.id,
    track: geo.id,
    seed,
    hash: createHash("sha256").update(rows).digest("hex").slice(0, 16),
    packMaxPx: Number.isFinite(packMax) ? +packMax.toFixed(3) : null,
    breakaway: Number.isFinite(packMax) ? packMax >= THRESHOLD_PX : false,
    groupSize: crossSize,
    crossProg,
    heldAboveHalfSec: dtMs ? +((heldSteps * dtMs) / 1000).toFixed(3) : null,
    neverClosed: packAtFinish != null ? packAtFinish >= THRESHOLD_PX : null,
    leadChanges: lc,
    winLeadChanges: wLc,
    top5Swaps,
    top5Frames,
    castErrMed: median(castErr),
    packErrMed: median(packErr),
    castN: castErr.length,
    bandArrived: arrived,
    bandCounted: counted,
  };
}

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[s.length >> 1] : null;
}

const geos = RD.loadTracks({ only: ONLY });
const arms = ARM_FILTER ? ARMS.filter((a) => ARM_FILTER.split(",").includes(a.id)) : ARMS;
const rows = [];
for (const arm of arms) {
  const world = worldFor(arm);
  for (const geo of geos)
    for (let seed = 1; seed <= SEEDS; seed++) rows.push(measureRace(geo, seed, arm, world));
  console.error(`  ${arm.id} done (${rows.length} races so far)`);
}

// ── ★★ §C · THE IDENTICAL-ARM THROW. It THROWS, it does not warn. ─────────────────────────────
// Compared per RACE (track+seed), because two arms could differ on one race and agree on another
// and still be a real difference; what is forbidden is two arms agreeing on EVERY race, which is
// what an unreachable key produces.
if (arms.length > 1) {
  const byArm = new Map();
  for (const r of rows) {
    if (!byArm.has(r.arm)) byArm.set(r.arm, new Map());
    byArm.get(r.arm).set(`${r.track}#${r.seed}`, r.hash);
  }
  const ids = [...byArm.keys()];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = byArm.get(ids[i]),
        b = byArm.get(ids[j]);
      const keys = [...a.keys()].filter((k) => b.has(k));
      const same = keys.filter((k) => a.get(k) === b.get(k)).length;
      if (keys.length > 0 && same === keys.length) {
        throw new Error(
          `★★ ARMS ${ids[i]} AND ${ids[j]} ARE BYTE-IDENTICAL ON ALL ${keys.length} RACES. ` +
            `That is not a result — the key is not reaching the race. STOP and fix the wiring ` +
            `before reading any number from this run.`,
        );
      }
      console.error(`  ${ids[i]} vs ${ids[j]}: ${keys.length - same}/${keys.length} races differ`);
    }
  }
}

mkdirSync(OUT, { recursive: true });
const name = `sweep-${TAG}.json`;
writeFileSync(
  join(OUT, name),
  JSON.stringify({ arms, thresholdPx: THRESHOLD_PX, frontBand: FRONT_BAND, seeds: SEEDS, rows }),
);
console.error(`${rows.length} races over ${arms.length} arm(s) -> ${join(OUT, name)}`);
