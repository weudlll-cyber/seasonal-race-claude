// ============================================================
// File:        action-arms.mjs
// Path:        reports/night/breakaway-action-data/action-arms.mjs
// Project:     RaceArena — BREAKAWAY-ACTION-CHAIN (pieces 1, 2 and the data piece 3a reads)
// Description: Eight arms, one fixture, four groups of numbers per race: the LAST-30% breakaway, the
//              lead changes, the fairness gate, and whether the racer who held that lead was cast.
//
//              Evidence for one report, so it lives beside its data under reports/. It imports
//              raceCore, so `engine-reach` counts it inside the race hull once it is TRACKED;
//              nothing in the product imports it, so it can no more change a race than a report can.
//
// ── ★★ WHERE IT SAMPLES ────────────────────────────────────────────────────────────────────────
// ON THE PHYSICS STEP. Positions and finished flags are snapshotted BEFORE `stepRacePhysics` —
// which is what the controller ranked and measured gaps on — and everything else is read after it.
// Never from a `runRace` frame callback: a callback can cover two physics steps and reads every gap
// one step late, which this project has already paid for once.
//
// ── ★★★ THE HEADLINE WINDOW IS FIXED AT [0.70, finish] AND DOES NOT MOVE WITH THE ARM ──────────
// OWNER DECISION 2026-09-20: the gap that matters is the one in the LAST 30% of the race.
// `W70_START` is the same number for every arm, on purpose. A window written as
// [choreoOutcomeStart, finish] spans 0.40 of the race at cos 0.60 and 0.30 at cos 0.70, so a
// shorter window shows a smaller maximum BY CONSTRUCTION and the arms cannot be compared at all.
// The arm-relative window is still recorded, as `armWin*`, and the report labels it NOT COMPARABLE.
//
// ★ THE WHOLE-RACE MAXIMUM IS CONTEXT, NEVER A SEPARATOR. Measured here: it falls at about progress
// 0.15 and was IDENTICAL to the millipixel across four arms, because `pulkStartFrac` is 0.15 and the
// peak is the CHAOS spread — a phase no arm touches (`governorPhaseWeight` is 0 outside
// [pulkStart, corrStart), raceGovernor.js:95).
//
// ★ UNITS: world pixels, `(leader.t - second.t) * pathLengthPx` — this family's own expression,
// read on PRE-STEP positions. A canvas-width figure divides by the settled LEADER_ZOOM 225 and by no
// per-frame zoom; that divisor once made a breakaway count read 71 of 100 where the truth was 20.
//
// ── WHAT IS REUSED, NOT REBUILT ────────────────────────────────────────────────────────────────
//   the driving loop + PRE-STEP ranking  `breakaway-lever.mjs`, from `breakaway-growth.mjs`
//   the gap expression                   the same family's, unchanged
//   band arrival                         `bandOfRank` (heroCurveGenerator.js:135)
//   the start-row gate                   `computeFairnessStats` (scripts/sim/observers/fairness-stats.mjs:18)
//   the cast test for piece 3a           the plan's own role map, as SHAPE-CENSUS-1 reads it
// ★ `sim-fairness.mjs` owns the gate and was the first choice; it was TIMED at 353 s for 2 races on
// one track (~176 s/race), which is tens of hours for eight arms, so the two functions it itself
// calls are called here instead. §D of the brief authorises exactly this, and the report validates
// the cheap route against the real one on one track before trusting it.
//
// ── ★★ THE ARMS PIN ALL THREE KEYS EXPLICITLY ──────────────────────────────────────────────────
// `RACE_ACTION_STAGES` (defaults.js:1277) IS the pulk-lever pair: quiet 0.10/0.06, medium 0.10/0.12,
// wild 0.15/0.12. Pinning all three keys per arm means the stage name and the lever values can never
// drift apart in the table, and arm D — 0.15/0.06, which no stage produces — sits in the same frame.
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
const { bandOfRank } = await import(u("client/src/modules/heroCurveGenerator.js"));

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const SEEDS = Number(arg("seeds", 3));
const ARM_FILTER = arg("arm", null);
const OUT = arg("out", HERE);
const TAG = arg("tag", "stage1");

const RACERS = 40;
const SECONDS = 60;
const W70_START = 0.7; // ★ the owner's window, fixed for every arm
const BASE = RD.worldForActionStage("quiet"); // the SHIPPED stage (defaults.js:47)
const ALLOWED_PX = BASE.raceDynamicsConfig.gapBrakeAllowedGapPx; // 56

// Eight distinct arms, no duplicates. `stage` is the RACE ACTION STAGE the lever pair IS, so a
// reader can never mistake a stage figure for an invented pair or the reverse.
const ARMS = [
  { id: "Q60", piece: "1", stage: "quiet", cos: 0.6, brake: 0.1, boost: 0.06, note: "★ THE SHIPPED WORLD — primary control" },
  { id: "Q65", piece: "1", stage: "quiet", cos: 0.65, brake: 0.1, boost: 0.06, note: "" },
  { id: "Q70", piece: "1", stage: "quiet", cos: 0.7, brake: 0.1, boost: 0.06, note: "the B3 wall" },
  { id: "W60", piece: "1", stage: "wild", cos: 0.6, brake: 0.15, boost: 0.12, note: "the fixture control of the earlier runs" },
  { id: "W65", piece: "1", stage: "wild", cos: 0.65, brake: 0.15, boost: 0.12, note: "" },
  { id: "W70", piece: "1", stage: "wild", cos: 0.7, brake: 0.15, boost: 0.12, note: "the B3 wall" },
  { id: "M60", piece: "2", stage: "medium", cos: 0.6, brake: 0.1, boost: 0.12, note: "" },
  { id: "D60", piece: "2", stage: "(none)", cos: 0.6, brake: 0.15, boost: 0.06, note: "a pair NO stage produces — separates brake from boost" },
];

const worldFor = (arm) => ({
  ...BASE,
  raceDynamicsConfig: {
    ...BASE.raceDynamicsConfig,
    choreoOutcomeStart: arm.cos,
    pulkLeaderBrake: arm.brake,
    pulkChallengerBoost: arm.boost,
  },
});

/** One race → the per-race row the report reads. */
function measureRace(geo, seed, arm, world) {
  const identity = RD.resolveIdentity({
    racers: RACERS, raceSeed: seed, seconds: SECONDS,
    racerType: RD.TRACK_DEFAULT_RACER, roster: QUICK_TEST_NAMES,
    note: `BREAKAWAY-ACTION ${arm.id}`,
  });
  const race = RD.buildRace(geo, identity, DEFAULT_CAMERA_CONFIG, world);
  const { st, raceCfg } = race;
  const ctl = raceCfg.racePlanController;
  const pathPx = geo.pathLengthPx ?? 0;
  const n = st.racers.length;

  const pT = new Float64Array(n);
  const pFin = new Uint8Array(n);
  // ★ the fixed [0.70, finish] window — the headline
  let w70Max = -Infinity, w70Leader = -1, w70LC = 0, w70Prev = -1;
  const w70Leaders = new Set();
  // context only: the whole race, and the arm-relative window (NOT comparable across arms)
  let allMax = -Infinity, allMaxProg = null;
  let armMax = -Infinity, armLC = 0, armPrev = -1;
  const armLeaders = new Set();
  let lc = 0, prevP1 = -1;
  const leaders = new Set();
  let firstFinishSeen = false, leadAtFirstFinishPx = null;
  const CEILING = 200 * 60 * 4;
  let k = 0;

  while (st.finishedCount < n && k < CEILING) {
    for (let i = 0; i < n; i++) { pT[i] = st.racers[i].t; pFin[i] = st.racers[i].finished ? 1 : 0; }
    const prog = st.raceProgress; // written at the top of the step: the value this step used
    stepRacePhysics(st, raceCfg);
    k++;
    let li = -1, si = -1;
    for (let i = 0; i < n; i++) {
      if (pFin[i]) continue;
      if (li < 0 || pT[i] > pT[li]) { si = li; li = i; }
      else if (si < 0 || pT[i] > pT[si]) { si = i; }
    }
    if (li < 0) break;
    leaders.add(li);
    if (prevP1 >= 0 && li !== prevP1) lc++;
    prevP1 = li;
    const gap = si >= 0 ? (pT[li] - pT[si]) * pathPx : null;
    if (gap != null) {
      if (gap > allMax) { allMax = gap; allMaxProg = prog; }
      if (!firstFinishSeen && st.finishedCount > 0) { firstFinishSeen = true; leadAtFirstFinishPx = gap; }
    }
    // ★ THE HEADLINE WINDOW. Fixed at 0.70 for every arm; `firstFinishSeen` closes it at the finish.
    if (prog >= W70_START && !firstFinishSeen) {
      w70Leaders.add(li);
      if (w70Prev >= 0 && li !== w70Prev) w70LC++;
      w70Prev = li;
      if (gap != null && gap > w70Max) { w70Max = gap; w70Leader = li; }
    }
    // Secondary, and NOT comparable across arms — its width is 1 - cos.
    if (prog >= arm.cos && !firstFinishSeen) {
      armLeaders.add(li);
      if (armPrev >= 0 && li !== armPrev) armLC++;
      armPrev = li;
      if (gap != null && gap > armMax) armMax = gap;
    }
  }

  // ── THE FAIRNESS GATE, from the project's own functions ────────────────────────────────────
  const roles = ctl.getHeroRoles();
  const rows = st.racers.map((r) => ({ startRowIndex: r.startRowIndex, finalRank: r.finishRank }));
  let arrived = 0, counted = 0, b3Arrived = 0, b3Counted = 0;
  for (const r of st.racers) {
    const drawn = ctl.getTargetRank(r.index);
    if (drawn == null || r.finishRank == null) continue;
    const dBand = bandOfRank(drawn);
    const ok = dBand === bandOfRank(r.finishRank);
    counted++; if (ok) arrived++;
    // B3 is band index 2 (ranks 16–25 on BAND_EDGES [5,15,25,40]) — reported separately because
    // `choreoResolveB3` is a fixed 0.70, so at cos 0.70 its settling window is zero wide.
    if (dBand === 2) { b3Counted++; if (ok) b3Arrived++; }
  }
  const w70Role = roles && w70Leader >= 0 ? (roles.get(w70Leader) ?? null) : null;

  return {
    arm: arm.id, stage: arm.stage, cos: arm.cos, track: geo.id, seed, steps: k,
    // ★ headline, fixed window
    w70MaxPx: Number.isFinite(w70Max) ? +w70Max.toFixed(3) : null,
    w70Exceeds: Number.isFinite(w70Max) ? w70Max > ALLOWED_PX : null,
    w70LeadChanges: w70LC, w70DistinctLeaders: w70Leaders.size,
    neverReeledIn: leadAtFirstFinishPx != null ? leadAtFirstFinishPx > ALLOWED_PX : null,
    leadAtFirstFinishPx: leadAtFirstFinishPx != null ? +leadAtFirstFinishPx.toFixed(3) : null,
    // context
    allMaxPx: Number.isFinite(allMax) ? +allMax.toFixed(3) : null,
    allMaxProg: allMaxProg != null ? +allMaxProg.toFixed(4) : null,
    leadChanges: lc, distinctLeaders: leaders.size,
    // secondary, NOT comparable across arms
    armWinMaxPx: Number.isFinite(armMax) ? +armMax.toFixed(3) : null,
    armWinLeadChanges: armLC, armWinDistinctLeaders: armLeaders.size,
    // gate
    bandArrived: arrived, bandCounted: counted, b3Arrived, b3Counted, rows,
    // piece 3a — was the racer who held the last-30% lead cast at all?
    w70Leader, w70Role, w70Uncast: w70Leader >= 0 ? w70Role == null : null,
  };
}

const geos = RD.loadTracks({ only: ONLY });
const arms = ARM_FILTER ? ARMS.filter((a) => ARM_FILTER.split(",").includes(a.id)) : ARMS;
const out = [];
for (const arm of arms) {
  const world = worldFor(arm);
  for (const geo of geos) for (let seed = 1; seed <= SEEDS; seed++) out.push(measureRace(geo, seed, arm, world));
}
mkdirSync(OUT, { recursive: true });
const name = `action-${TAG}.json`;
writeFileSync(join(OUT, name), JSON.stringify({ arms, allowedPx: ALLOWED_PX, w70Start: W70_START, racers: RACERS, seeds: SEEDS, rows: out }));
console.error(`${out.length} races over ${arms.length} arm(s) -> ${join(OUT, name)}`);
