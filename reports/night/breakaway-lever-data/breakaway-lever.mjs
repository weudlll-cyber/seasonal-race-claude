// ============================================================
// File:        breakaway-lever.mjs
// Path:        reports/night/breakaway-lever-data/breakaway-lever.mjs
// Project:     RaceArena — BREAKAWAY-LEVER-1
// Description: BREAKAWAY-GROWTH-1 established that a breakaway lead grows mostly because the racer
//              in SECOND slows, not because the leader speeds up. This asks the follow-up: WHILE
//              THAT GAP IS GROWING, what is happening to the racer in second — and which of the four
//              mechanisms that could be pushing him is the binding constraint.
//
//              It is EVIDENCE for one report, like its parent, which is why it lives beside its data
//              under reports/ rather than in scripts/. It imports raceCore, so `engine-reach` counts
//              it inside the race hull; nothing in the product imports it, so it can no more change
//              a race than a report can.
//
// ── WHAT IS REUSED, AND IT IS MOST OF THE MACHINERY ────────────────────────────────────────────
// The driving loop, the baseline rule, the episode/growing-frame definitions and the leader/second
// identification are `breakaway-growth.mjs`'s, taken from it line for line:
//   * drive `stepRacePhysics` DIRECTLY through `raceDriver.buildRace` — no camera, the physics
//     never reads one;
//   * rank on PRE-STEP positions, because that is what the controller ranked on;
//   * an episode STARTS at the first in-window step whose gap exceeds the brake's allowance and
//     ENDS at the in-window peak; a GROWING step is one whose gap exceeds the previous step's.
//
// ★ IT IS A COPY, NOT AN EDIT OF THAT FILE, ON PURPOSE. `breakaway-growth.mjs` is the artifact that
// produced BREAKAWAY-GROWTH-1's 59.5%; editing it would change the evidence for a published number.
// What is NEW here is only the per-frame record of the second-place racer below.
//
// ── ★★ WHERE IT SAMPLES, STATED BECAUSE AN EARLIER INSTRUMENT GOT THIS WRONG ───────────────────
// ON THE PHYSICS STEP, never on a `runRace` frame callback — a callback can cover two physics steps
// and reads every gap one step late. Per step: positions and the finished flags are snapshotted
// BEFORE `stepRacePhysics` (the controller ranks and measures gaps on those), and the servo fields
// are read AFTER it (they are written during it, and are the values that step used).
//
// ── WHAT IS MEASURED, PER GROWING STEP, FOR THE RACER IN SECOND ────────────────────────────────
//   A  THE RANK SERVO — his drawn place, his live rank, the target COMMANDED and the multiplier
//      actually IN FORCE, and whether the 1000 ms ease was restarted this step and how far it had
//      travelled when it was (SERVO-FAULT-1: the servo's own noise re-triggers the ease).
//   B  DRAFTING — his gap to the leader in world px against `draftingMaxDistance`, and whether the
//      drafting boost was actually active.
//   C  THE GAP RE-ROLL TILT — see the block at `tiltWouldBe` below. ★ This is a RECONSTRUCTION of
//      the branch CONDITION, not an observation of a roll, and the report says so.
//   D  HIS OWN CEILING — the commanded target against `maxMult`, and whether he is a HELD hero, the
//      only population the arrival ceiling (racePlanner.js:516) applies to.
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
const { arcT, lenScaleFrom, meanDrawnBodyLen } = await import(u("client/src/modules/raceLengths.js"));
const { DEFAULT_CONTROLLER_PARAMS } = await import(u("client/src/modules/racePlanner.js"));

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const SEEDS = Number(arg("seeds", 3));
const OUT = arg("out", HERE);

// ── THE FIXTURE, stated once ────────────────────────────────────────────────────────────────────
const RACERS = 40;
const SECONDS = 60;
const STAGE = "wild";
const WORLD = RD.worldForActionStage(STAGE);
const ALLOWED_PX = WORLD.raceDynamicsConfig.gapBrakeAllowedGapPx; // 56 on shipped defaults
const WINDOW_END = WORLD.raceDynamicsConfig.gapBrakeWindowEnd;
const G_LENGTHS = WORLD.raceDynamicsConfig.gapRerollThresholdLengths; // 0.5
const REROLL_ON = WORLD.raceDynamicsConfig.gapRerollEnabled !== false;
const REROLL_MODE = WORLD.raceDynamicsConfig.gapRerollMode; // 'symmetric'
// Drafting is a BEHAVIOUR config, not a dynamics one: the world object carries it as
// `raceBehaviorConfig`, and the race builds its own `behaviorConfig` from it.
const DRAFT_MAX_PX = WORLD.raceBehaviorConfig.draftingMaxDistance; // 80
const MAX_MULT = DEFAULT_CONTROLLER_PARAMS.maxMult; // 1.1
const GROWTH_MIN_STEPS = 5;

/** One race, driven step by step. Returns the growing-step records for the racer in second. */
function measureRace(geo, seed) {
  const identity = RD.resolveIdentity({
    racers: RACERS,
    raceSeed: seed,
    seconds: SECONDS,
    racerType: RD.TRACK_DEFAULT_RACER,
    roster: QUICK_TEST_NAMES,
    note: "BREAKAWAY-LEVER-1",
  });
  const race = RD.buildRace(geo, identity, DEFAULT_CAMERA_CONFIG, WORLD);
  const { st, raceCfg } = race;
  const ctl = raceCfg.racePlanController;
  const pathPx = geo.pathLengthPx ?? 0;
  const isOpen = raceCfg.isOpenTrack;
  const ttDurMs = raceCfg.trajectoryTransitionDurationMs;
  const n = st.racers.length;
  const lenScale = lenScaleFrom(pathPx, meanDrawnBodyLen(st.racers));

  const pT = new Float64Array(n);
  const pFin = new Uint8Array(n);
  const prevTransStart = new Float64Array(n).fill(NaN);

  const rows = [];
  const CEILING_STEPS = 200 * 60 * 4;
  let k = 0;
  const windowStart = ctl.getGapBrakeStats().windowStart;
  let heldSet = null;

  while (st.finishedCount < n && k < CEILING_STEPS) {
    for (let i = 0; i < n; i++) {
      pT[i] = st.racers[i].t;
      pFin[i] = st.racers[i].finished ? 1 : 0;
    }
    const physicsTsBefore = st.physicsTs;
    stepRacePhysics(st, raceCfg);
    k++;
    if (heldSet === null) {
      const held = ctl.getHeldRelease();
      if (held) heldSet = new Set([...held.keys()]);
    }

    // The controller ranked PRE-STEP positions among the racers unfinished at that moment — the
    // first, second and third are what the gap and the tilt law were measured on.
    let li = -1, si = -1, ti = -1;
    for (let i = 0; i < n; i++) {
      if (pFin[i]) continue;
      if (li < 0 || pT[i] > pT[li]) { ti = si; si = li; li = i; }
      else if (si < 0 || pT[i] > pT[si]) { ti = si; si = i; }
      else if (ti < 0 || pT[i] > pT[ti]) { ti = i; }
    }
    if (li < 0 || si < 0) break;

    const r = st.racers[si];
    const gapAheadPx = (pT[li] - pT[si]) * pathPx;
    const gapBehindPx = ti >= 0 ? (pT[si] - pT[ti]) * pathPx : 0;
    // ── C · THE TILT LAW, RECONSTRUCTED IN ITS OWN UNITS ──────────────────────────────────────
    // `computeGapBiasedTarget` (racePlanner.js:1652) measures both gaps as
    // `arcT(...) * lenScale` — racer LENGTHS, not px — so they are recomputed that way here rather
    // than converted from px, which would introduce a second expression of the same quantity.
    // ★ THIS IS THE CONDITION, NOT AN OBSERVED ROLL. The tilt only applies at a SCHEDULED re-roll;
    // this records what the branch would decide about him on every growing step. The race-level
    // roll and tilt counts from `collectTelemetry()` are reported beside it as the cross-check.
    const gapAheadL = ti >= 0 || li >= 0 ? arcT(pT[li], pT[si], isOpen) * lenScale : 0;
    const gapBehindL = ti >= 0 ? arcT(pT[si], pT[ti], isOpen) * lenScale : 0;
    const down = REROLL_ON && gapBehindL > G_LENGTHS && gapBehindL >= gapAheadL;
    const up = REROLL_ON && !down && REROLL_MODE === "symmetric" && gapAheadL > G_LENGTHS;
    // The TIE the branch priority deliberately left alone: gapBehind EXACTLY equal to gapAhead
    // still takes the DOWN branch (racePlanner.js:1695, "Ties keep the old gapBehind-first
    // behaviour"). Recorded to find out whether it is reachable in practice at all.
    const tie = REROLL_ON && gapBehindL === gapAheadL && gapBehindL > G_LENGTHS;

    // ── A · THE SERVO. Read AFTER the step: these are the values it wrote and used. ────────────
    const easeRestarted = Number.isFinite(prevTransStart[si]) && r.trajectoryMultTransStart !== prevTransStart[si];
    const easeTravelled = easeRestarted && ttDurMs > 0
      ? Math.min(1, Math.max(0, (physicsTsBefore - prevTransStart[si]) / ttDurMs))
      : null;
    const drawn = ctl.getTargetRank(si);

    rows.push({
      k,
      prog: st.raceProgress,
      inWindow: st.raceProgress >= windowStart && st.raceProgress <= WINDOW_END,
      gapPx: gapAheadPx,
      si,
      liveRank: 2, // by construction: si is the second of the pre-step order
      drawnRank: drawn,
      // A
      tmTarget: r.trajectoryMultTarget,
      tmInForce: r.trajectoryMult,
      easeRestarted,
      easeTravelled,
      // B
      draftActive: !!r.draftingBoostActive,
      inDraftRange: gapAheadPx <= DRAFT_MAX_PX,
      // C
      gapAheadL,
      gapBehindL,
      gapBehindPx,
      tilt: down ? "DOWN" : up ? "UP" : "none",
      tie,
      // D — is anything tightening him below the shipped clamp at this moment?
      atMaxMult: r.trajectoryMultTarget >= MAX_MULT - 1e-9,
      isHeld: heldSet ? heldSet.has(si) : false,
    });
    for (let i = 0; i < n; i++) prevTransStart[i] = st.racers[i].trajectoryMultTransStart;
  }

  const bstats = ctl.getGapBrakeStats();
  const isBreakaway = bstats.maxGapPxInWindow > ALLOWED_PX;
  const out = { track: geo.id, seed, steps: rows.length, isBreakaway, maxGapPxInWindow: bstats.maxGapPxInWindow };
  if (!isBreakaway || rows.length === 0) return out;

  let peak = -Infinity, peakAt = -1;
  for (let j = 0; j < rows.length; j++) {
    if (rows[j].inWindow && rows[j].gapPx > peak) { peak = rows[j].gapPx; peakAt = j; }
  }
  let start = -1;
  for (let j = 0; j <= peakAt; j++) {
    if (rows[j].inWindow && rows[j].gapPx > ALLOWED_PX) { start = j; break; }
  }
  if (start < 0) { out.category = "no-episode"; return out; }
  const grow = [];
  for (let j = start + 1; j <= peakAt; j++) if (rows[j].gapPx > rows[j - 1].gapPx) grow.push(rows[j]);
  out.growthSteps = grow.length;
  if (grow.length < GROWTH_MIN_STEPS) { out.category = "no-episode"; return out; }
  out.category = "episode";
  out.peakGapPx = peak;
  // The whole-race counters, as the cross-check on the reconstruction in C.
  const tel = ctl.collectTelemetry();
  out.telemetry = {
    gapWindowRolls: tel.gapWindowRolls ?? null,
    gapDownTilts: tel.gapDownTilts ?? null,
    gapUpTilts: tel.gapUpTilts ?? null,
    gapDownAheadGtBehind: tel.gapDownAheadGtBehind ?? null,
  };
  out.frames = grow;
  return out;
}

const geos = RD.loadTracks({ only: ONLY });
const races = [];
for (const geo of geos) {
  for (let seed = 1; seed <= SEEDS; seed++) races.push(measureRace(geo, seed));
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "lever-frames.json"), JSON.stringify(races));
console.error(
  `${races.length} races, ${races.filter((r) => r.category === "episode").length} with an episode, ` +
    `${races.reduce((s, r) => s + (r.frames?.length ?? 0), 0)} growing frames -> ${join(OUT, "lever-frames.json")}`,
);
