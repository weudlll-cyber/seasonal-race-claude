// ============================================================
// File:        group-brake-sweep.mjs
// Path:        reports/night/group-brake-data/group-brake-sweep.mjs
// Project:     RaceArena — GROUP-GAP-BRAKE-1, the sweep
// Description: The control against three allowance candidates and one ablation, on the fixture
//              BREAKAWAY-COUNT-2 used, so the numbers are comparable to its 16.0%.
//
//              Evidence for one report, so it lives beside its data under reports/. It imports
//              raceCore, so `engine-reach` counts it inside the race hull once TRACKED; nothing in
//              the product imports it.
//
// ── WHAT IS REUSED, UNCHANGED ──────────────────────────────────────────────────────────────────
// The driving loop, the PRE-STEP ranking and the gap expression
// `(ahead.t - behind.t) * pathLengthPx` are `breakaway-count.mjs`'s, which took them from
// `action-arms.mjs` ← `breakaway-lever.mjs` ← `breakaway-growth.mjs`. The breakaway DEFINITION is
// that file's too and does NOT change here: the largest of the consecutive gaps inside the front
// band, group cap 5, his 157.05 px threshold, fixed [0.70, finish] window. ★ That cap is the
// owner's definition of the PHENOMENON and is deliberately NOT the brake's limit of four — the
// baseline must not be "fixed" to match the mechanism or the control stops being a control.
//
// ── WHAT IS NEW HERE AND NOWHERE ELSE IN THE TREE ──────────────────────────────────────────────
//   · the ARM LOOP, overriding `gapBrakeGroupEnabled` and `gapBrakeGroupAllowedGapPx` per arm;
//   · ★★ POSITION CHANGES INSIDE THE LEADING GROUP while the brake is engaged, SPLIT by whether any
//     member sat at `minMult` that frame. That split is the point: the engine's 15% floor comes
//     first, so a member already at the floor cannot be separated further by a proportional brake,
//     and the owner's parade question has a different answer above the floor than at it.
//
// ── ★★ WHERE IT SAMPLES ────────────────────────────────────────────────────────────────────────
// ON THE PHYSICS STEP. Positions and finished flags are snapshotted BEFORE `stepRacePhysics` — what
// the controller ranked and measured gaps on — and the commanded multipliers are read AFTER it,
// because that is when the step wrote them. Never a `runRace` frame callback, which can cover two
// physics steps and read every gap one step late.
// ============================================================

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.RA_ROOT ?? join(HERE, "..", "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const RD = await import(u("scripts/lib/raceDriver.mjs"));
const { stepRacePhysics } = await import(u("client/src/modules/raceCore.js"));
const { QUICK_TEST_NAMES } = await import(u("client/src/modules/racerNames.js"));
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { BAND_EDGES, DEFAULT_CONTROLLER_PARAMS, bandOfRank } = await import(
  u("client/src/modules/racePlanner.js")
).then(async (m) => ({
  ...m,
  bandOfRank: (await import(u("client/src/modules/heroCurveGenerator.js"))).bandOfRank,
}));

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
const BASE = RD.worldForActionStage("quiet"); // the shipped stage, defaults.js:47
const THRESHOLD_PX = 157.05; // ★ HIS lead — BREAKAWAY-RECOUNT-2:20
const W70_START = 0.7;
const FRONT_BAND = BAND_EDGES[0]; // 5 — the DETECTION cap, the owner's phenomenon
const MIN_MULT = DEFAULT_CONTROLLER_PARAMS.minMult; // the engine's 15% floor

// The three candidates are the p50/p65/p80 of BREAKAWAY-COUNT-2's in-window maximum breakaway gap
// at N=300 — derived from the measured distribution, never invented. ABL is §D(5): the same input,
// braking ONLY the leader, to find out whether the simpler mechanism does as well.
const ARMS = [
  { id: "CONTROL", on: false, allowed: null, leaderOnly: false, note: "today's shipped race" },
  { id: "A50", on: true, allowed: 111.2, leaderOnly: false, note: "p50" },
  { id: "A65", on: true, allowed: 124.9, leaderOnly: false, note: "p65" },
  { id: "A80", on: true, allowed: 146.7, leaderOnly: false, note: "p80" },
  { id: "ABL", on: true, allowed: 124.9, leaderOnly: true, note: "ablation — leader only, p65" },
];

const worldFor = (arm) => ({
  ...BASE,
  raceDynamicsConfig: {
    ...BASE.raceDynamicsConfig,
    gapBrakeGroupEnabled: arm.on,
    ...(arm.allowed != null ? { gapBrakeGroupAllowedGapPx: arm.allowed } : {}),
  },
});

function measureRace(geo, seed, arm, world) {
  const identity = RD.resolveIdentity({
    racers: RACERS, raceSeed: seed, seconds: SECONDS,
    racerType: RD.TRACK_DEFAULT_RACER, roster: QUICK_TEST_NAMES,
    note: `GROUP-GAP-BRAKE-1 ${arm.id}`,
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
  let crossProg = null, crossSize = null;
  let firstFinishSeen = false, packAtFinish = null;
  let dtMs = null;
  // lead changes
  let lc = 0, prevP1 = -1, wLc = 0, wPrev = -1;
  // ★ in-group position changes while the brake is ENGAGED, split by the floor
  let inGroupSwapsFree = 0, inGroupSwapsFloor = 0;
  let engagedFrames = 0, floorFrames = 0;
  const commandedWhenEngaged = [];
  let prevGroupOrder = null;
  const CEILING = 200 * 60 * 4;
  let k = 0;

  while (st.finishedCount < n && k < CEILING) {
    for (let i = 0; i < n; i++) { pT[i] = st.racers[i].t; pFin[i] = st.racers[i].finished ? 1 : 0; }
    const prog = st.raceProgress;
    const tsBefore = st.physicsTs;
    stepRacePhysics(st, raceCfg);
    if (dtMs == null) dtMs = st.physicsTs - tsBefore;
    k++;

    // live order on PRE-STEP positions — what the controller ranked on
    const order = [];
    for (let i = 0; i < n; i++) if (!pFin[i]) order.push(i);
    order.sort((a, b) => pT[b] - pT[a]);
    if (order.length < 2) break;
    if (!firstFinishSeen && st.finishedCount > 0) firstFinishSeen = true;

    const li = order[0];
    if (prevP1 >= 0 && li !== prevP1) lc++;
    prevP1 = li;

    // the owner's breakaway gap — DETECTION, cap FRONT_BAND, unchanged from BREAKAWAY-COUNT-2
    let bestGap = -Infinity, cut = -1;
    const maxCut = Math.min(FRONT_BAND, order.length - 1);
    for (let c = 1; c <= maxCut; c++) {
      const g = (pT[order[c - 1]] - pT[order[c]]) * pathPx;
      if (g > bestGap) { bestGap = g; cut = c; }
    }

    if (prog >= W70_START && !firstFinishSeen) {
      if (wPrev >= 0 && li !== wPrev) wLc++;
      wPrev = li;
      if (Number.isFinite(bestGap)) {
        winPack.push(bestGap);
        if (bestGap > packMax) packMax = bestGap;
        if (crossProg == null && bestGap >= THRESHOLD_PX) { crossProg = prog; crossSize = cut; }
      }
      packAtFinish = bestGap;
    }

    // ── ★★ THE PARADE MEASUREMENT ────────────────────────────────────────────────────────────
    // While the brake is ENGAGED, does the order INSIDE the leading group still change? The group
    // is read from the same gap scan; the commands are read AFTER the step because that is when the
    // controller wrote them. The split is on whether ANY member sat at the engine's floor.
    const bs = ctl.getGapBrakeStats();
    if (bs.engaged === true && cut >= 2) {
      engagedFrames++;
      const grp = order.slice(0, cut);
      const cmds = grp.map((i) => st.racers[i].trajectoryMultTarget ?? 1);
      const atFloor = cmds.some((c) => c <= MIN_MULT + 1e-12);
      if (atFloor) floorFrames++;
      for (const c of cmds) commandedWhenEngaged.push(c);
      if (prevGroupOrder && prevGroupOrder.length === grp.length) {
        let swapped = false;
        for (let i = 0; i < grp.length; i++) if (grp[i] !== prevGroupOrder[i]) swapped = true;
        if (swapped) { if (atFloor) inGroupSwapsFloor++; else inGroupSwapsFree++; }
      }
      prevGroupOrder = grp;
    } else {
      prevGroupOrder = null;
    }
  }

  // ── the fairness gate, from the project's own function ────────────────────────────────────
  let arrived = 0, counted = 0;
  for (const r of st.racers) {
    const drawn = ctl.getTargetRank(r.index);
    if (drawn == null || r.finishRank == null) continue;
    counted++;
    if (bandOfRank(drawn) === bandOfRank(r.finishRank)) arrived++;
  }
  let heldSteps = 0;
  if (Number.isFinite(packMax) && packMax > 0) for (const g of winPack) if (g >= packMax / 2) heldSteps++;
  const bs = ctl.getGapBrakeStats();

  return {
    arm: arm.id, track: geo.id, seed,
    packMaxPx: Number.isFinite(packMax) ? +packMax.toFixed(3) : null,
    breakaway: Number.isFinite(packMax) ? packMax >= THRESHOLD_PX : false,
    groupSize: crossSize, crossProg,
    heldAboveHalfSec: dtMs ? +((heldSteps * dtMs) / 1000).toFixed(3) : null,
    neverClosed: packAtFinish != null ? packAtFinish >= THRESHOLD_PX : null,
    leadChanges: lc, winLeadChanges: wLc,
    inGroupSwapsFree, inGroupSwapsFloor, engagedFrames, floorFrames,
    medCommandEngaged: commandedWhenEngaged.length
      ? +commandedWhenEngaged.sort((a, b) => a - b)[commandedWhenEngaged.length >> 1].toFixed(5)
      : null,
    brakeFiredFrames: bs.firedFrames ?? null,
    bandArrived: arrived, bandCounted: counted,
  };
}

const geos = RD.loadTracks({ only: ONLY });
const arms = ARM_FILTER ? ARMS.filter((a) => ARM_FILTER.split(",").includes(a.id)) : ARMS;
const rows = [];
for (const arm of arms) {
  const world = worldFor(arm);
  for (const geo of geos) for (let seed = 1; seed <= SEEDS; seed++) rows.push(measureRace(geo, seed, arm, world));
  console.error(`  ${arm.id} done (${rows.length} races so far)`);
}
mkdirSync(OUT, { recursive: true });
const name = `sweep-${TAG}.json`;
writeFileSync(join(OUT, name), JSON.stringify({ arms, thresholdPx: THRESHOLD_PX, minMult: MIN_MULT, frontBand: FRONT_BAND, seeds: SEEDS, rows }));
console.error(`${rows.length} races over ${arms.length} arm(s) -> ${join(OUT, name)}`);
