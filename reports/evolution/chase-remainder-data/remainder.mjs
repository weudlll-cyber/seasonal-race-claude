// ============================================================
// File:        remainder.mjs
// Path:        reports/evolution/chase-remainder-data/remainder.mjs
// Project:     RaceArena — CHASE-REMAINDER-1
// Description: What is LEFT after the chase shipped. Not "how often" — the ship already halved that
//              — but HOW BAD the worst remaining races get, WHO the governor boosted in them, and
//              WHICH races to put in front of the owner's eye.
//
//              Evidence for one report, so it lives beside its data under reports/. It imports
//              raceCore and the governor, so `engine-reach` counts it inside the race hull once
//              TRACKED; nothing in the product imports it.
//
// ── PARENT, AND WHAT IS UNCHANGED FROM IT ──────────────────────────────────────────────────────
// `reports/night/breakaway-count-data/breakaway-count.mjs`, the same lineage as CHASE-REACH-1 and
// BREAKAWAY-CAST-SPLIT-1. Copied and extended. Carried over UNTOUCHED, and deliberately not
// re-derived here:
//   · THRESHOLD_PX = 157.05 — HIS lead, BREAKAWAY-RECOUNT-2:20 — and the SENS_PX pair 112.5 / 225.0
//   · W70_START = 0.7, one number for every race, moved by no config
//   · FRONT_BAND = BAND_EDGES[0], IMPORTED from racePlanner.js, never restated
//   · THE OWNER'S GAP: the largest of the consecutive gaps inside the front band, the racer
//     immediately behind it being the front of the field. ★ NO MEAN, NO MEDIAN, NO CENTROID is
//     computed anywhere in this file — he said such a figure tells him nothing.
//   · SAMPLING ON THE PHYSICS STEP, positions snapshotted BEFORE `stepRacePhysics`
//   · the fixture: 40 racers, 60 s, TRACK_DEFAULT_RACER, QUICK_TEST_NAMES
//
// ★ THE `--stage` ARG IS REUSED, NOT REWRITTEN A THIRD TIME. The three lines below are
// `chase-sweep.mjs:151-154` verbatim (itself the second use of the pattern); the brief asked for the
// reuse and this comment is the record that it was done rather than reinvented.
//
// ── ★★★ THE WORLD IS THE SHIPPED WORLD. THIS FILE SETS NO KEY. ─────────────────────────────────
// The chase is a DEFAULT since CHASE-SHIP-1 (2026-09-23, merge 67817334), not an arm. `defaults.js`
// is read exactly as the parent reads it and the three chase keys appear nowhere below except in
// the CHECK-A echo, which PRINTS them and does not set them. An arm-style override here would
// measure a world the owner never approved.
//
// ── WHAT IS NEW, AND WHY ───────────────────────────────────────────────────────────────────────
// (A) HOW BAD, NOT ONLY HOW OFTEN. `packMaxPx` is recorded for EVERY race, not only the ones over
//     threshold. At wild only ~5 of 300 cross, so any claim about the worst case built on those
//     five would be worthless; the gap SIZE is measurable on all 300 and is the honest quantity.
//
// (B) WHO WAS BOOSTED, AND WHERE THEY ENDED UP — the test of a hypothesis that is MINE and is
//     labelled as mine, not as a finding: that the races the chase made worse are ones where the
//     chasers close the gap, OVERSHOOT, and form a NEW leading group that then runs away.
//
//     ★★ HOW THE BOOSTED SET IS READ, AND WHY IT IS THE REAL SET RATHER THAN A PROXY. The
//     `boosting` Set inside `applyPulkLeadRotation` is function-local and this block may not touch
//     client source to export it. It does not need to: the set is built from exactly two places,
//     `st.attackers[s].idx` and `st.outsider.idx` (raceGovernor.js:385-424), where `st` is
//     `dirState.leadRot` (`:285`) — and `dirState` is held on `raceCfg` (raceCore.js:498/562), so it
//     is readable from outside. The deadlock branch sets `.idx = -1` BEFORE the `boosting.add`, so
//     after the call `idx >= 0` is exactly membership for that frame. Read after `stepRacePhysics`
//     and attributed to that step. CHECK C sabotages this reader and every (B) number must vanish.
//
//     ★ "WAS HE EVER BOOSTED" IS VACUOUS AND IS NOT USED. The slots rotate every frame, so over a
//     ~2000-step window 35 of 40 racers are boosted at some point. What is recorded instead is
//     boost EXPOSURE — how many in-window steps each racer held a slot — split at the crossing, so
//     the leading group can be compared against the field it left behind.
//
// (C) THE SHORTLIST FOR HIS EYE: the ten worst remaining races per stage by in-window maximum gap,
//     as track + quick-test seed, so he can type them straight into the Quick Test.
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
const { DEFAULT_CAMERA_CONFIG, DEFAULT_RACE_DYNAMICS_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { BAND_EDGES } = await import(u("client/src/modules/racePlanner.js"));

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const SEEDS = Number(arg("seeds", 3));
const OUT = arg("out", HERE);
const TAG = arg("tag", "n30");
// ★★ CHECK C's SABOTAGE IS NOT HERE, DELIBERATELY. A first draft of this file carried a
// `--sabotage-blind-boost` flag that made the boosted-set reader return nothing. It was removed
// before the data was produced: the brief requires the sabotage to live in a SCRATCH COPY ONLY,
// never committed, and the reason is sound — a committed switch that silently blinds an instrument
// is a foot-gun, and anyone who passed it by accident would get a full, well-formed, empty-boost
// data file. CHECK C is run by copying this file to a scratch directory and patching the reader
// there; the report records the outcome.

// ── the stage arg, REUSED from chase-sweep.mjs:151-154 rather than written a third time ─────────
const STAGE = arg("stage", "quiet");
if (STAGE !== "quiet" && STAGE !== "wild") {
  throw new Error(`--stage must be quiet or wild, got ${STAGE}`);
}

// ── THE FIXTURE: the SHIPPED world, unchanged. No key is set here. ─────────────────────────────
const RACERS = 40;
const SECONDS = 60;
const WORLD = RD.worldForActionStage(STAGE);
const THRESHOLD_PX = 157.05; // ★ HIS lead — BREAKAWAY-RECOUNT-2:20
const WIDTH_PX = 225; // the settled LEADER_ZOOM value, used only to express px as widths
const W70_START = 0.7;
const FRONT_BAND = BAND_EDGES[0]; // ★ the game's own front band — imported, never restated
const SENS_PX = [112.5, 225.0]; // 0.5 and 1.0 canvas widths against the settled 225

function measureRace(geo, seed) {
  const identity = RD.resolveIdentity({
    racers: RACERS,
    raceSeed: seed,
    seconds: SECONDS,
    racerType: RD.TRACK_DEFAULT_RACER,
    roster: QUICK_TEST_NAMES,
    note: "CHASE-REMAINDER-1",
  });
  const race = RD.buildRace(geo, identity, DEFAULT_CAMERA_CONFIG, WORLD);
  const { st, raceCfg } = race;
  const ctl = raceCfg.racePlanController;
  const pathPx = geo.pathLengthPx ?? 0;
  const n = st.racers.length;

  const pT = new Float64Array(n);
  const pFin = new Uint8Array(n);
  const winPack = [];
  let packMax = -Infinity,
    packAllMax = -Infinity;
  let packCrossProg = null,
    packCrossSize = null,
    packCrossGroup = null;
  const packSensCross = SENS_PX.map(() => false);
  // (A) the peak's location, so a big gap can be told from a big gap that arrives at the line
  let packMaxProg = null;
  let firstFinishSeen = false;
  let dtMs = null;

  // ── (B) boost exposure, per racer, inside [0.70, finish] ─────────────────────────────────────
  const boostSteps = new Int32Array(n); // whole window
  const boostStepsPre = new Int32Array(n); // strictly before the crossing (null cross ⇒ == window)
  let winSteps = 0;
  // the front band at the FIRST in-window step — "who was leading when the window opened"
  let bandAtStart = null;

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
    if (!firstFinishSeen && st.finishedCount > 0) firstFinishSeen = true;

    const order = [];
    for (let i = 0; i < n; i++) if (!pFin[i]) order.push(i);
    order.sort((a, b) => pT[b] - pT[a]);
    // ★ CONTINUE, NEVER BREAK — and CHECK B is what caught this. The parent BREAKS here (a field of
    // one has no gap to measure), which is harmless there because it reports no race signature. This
    // file does report one, and breaking left the LAST racer unfinished: 39 of 40 home, its rank and
    // time unset, and the signature therefore different from a bare run of the same race. That read
    // as "the instrument is touching the race" on 4 of 5 seeds when the race was bit-identical. The
    // measured values were never affected — the window has already closed by then — but the check
    // that exists to catch a perturbation must not be tripped by the harness itself.
    if (order.length < 2) continue;
    let packGap = -Infinity,
      cut = -1;
    const maxCut = Math.min(FRONT_BAND, order.length - 1);
    for (let c = 1; c <= maxCut; c++) {
      const g = (pT[order[c - 1]] - pT[order[c]]) * pathPx;
      if (g > packGap) {
        packGap = g;
        cut = c;
      }
    }
    if (packGap > packAllMax) packAllMax = packGap;

    if (prog >= W70_START && !firstFinishSeen && Number.isFinite(packGap)) {
      winSteps++;
      if (bandAtStart == null) bandAtStart = order.slice(0, Math.min(FRONT_BAND, order.length));
      winPack.push(packGap);
      if (packGap > packMax) {
        packMax = packGap;
        packMaxProg = prog;
      }
      if (packCrossProg == null && packGap >= THRESHOLD_PX) {
        packCrossProg = prog;
        packCrossSize = cut;
        packCrossGroup = order.slice(0, cut);
      }
      for (let q = 0; q < SENS_PX.length; q++) if (packGap >= SENS_PX[q]) packSensCross[q] = true;

      // ★ the boosted set for THIS step, read from the governor's own slots (see the header).
      const lr = raceCfg.dirState?.leadRot;
      if (lr) {
        const hit = [];
        if (lr.attackers) for (const sl of lr.attackers) if (sl.idx >= 0) hit.push(sl.idx);
        if (lr.outsider && lr.outsider.idx >= 0) hit.push(lr.outsider.idx);
        for (const i of hit) {
          if (i >= 0 && i < n) {
            boostSteps[i]++;
            if (packCrossProg == null) boostStepsPre[i]++;
          }
        }
      }
    }
  }

  let packHeldSteps = 0;
  if (Number.isFinite(packMax) && packMax > 0)
    for (const g of winPack) if (g >= packMax / 2) packHeldSteps++;
  const packAtFinish = winPack.length ? winPack[winPack.length - 1] : null;

  const roles = ctl.getHeroRoles();
  const held = ctl.getHeldRelease();
  const heldSet = new Set(held ? [...held.keys()] : []);
  const roleAt = (i) => {
    if (i < 0) return null;
    const r = roles ? (roles.get(i) ?? null) : null;
    if (r === "comebacker") return (heldSet.has(i) ? "comebacker(staged)" : "comebacker");
    return r;
  };

  // ── (B) the verdict inputs, computed at the crossing moment ──────────────────────────────────
  // Everything here is null when the race never crosses — the hypothesis is only about races that
  // DID produce a breakaway, and a null must never be read as a zero.
  let bAhead = null;
  if (packCrossGroup && packCrossGroup.length) {
    const ahead = new Set(packCrossGroup);
    const startBand = new Set(bandAtStart ?? []);
    const behindIdx = [];
    for (let i = 0; i < n; i++) if (!ahead.has(i)) behindIdx.push(i);
    const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
    const aheadArr = [...ahead];
    bAhead = {
      // boost exposure BEFORE the crossing — "were they boosted earlier in that window"
      aheadBoostedPreCount: aheadArr.filter((i) => boostStepsPre[i] > 0).length,
      aheadCount: aheadArr.length,
      aheadMeanBoostStepsPre: +(sum(aheadArr, (i) => boostStepsPre[i]) / aheadArr.length).toFixed(2),
      behindMeanBoostStepsPre: behindIdx.length
        ? +(sum(behindIdx, (i) => boostStepsPre[i]) / behindIdx.length).toFixed(2)
        : null,
      aheadMeanBoostStepsWin: +(sum(aheadArr, (i) => boostSteps[i]) / aheadArr.length).toFixed(2),
      behindMeanBoostStepsWin: behindIdx.length
        ? +(sum(behindIdx, (i) => boostSteps[i]) / behindIdx.length).toFixed(2)
        : null,
      // ★ THE DIRECT TEST OF THE HYPOTHESIS: did the leading group CHANGE between the window
      // opening and the crossing? A "newcomer" is ahead of the gap now and was NOT in the front
      // band when the window opened. If the ugly races are chasers-who-overshot, newcomers should
      // be common AND boosted. If the group is the same racers who were already leading, the
      // hypothesis is refuted for that race.
      newcomers: aheadArr.filter((i) => !startBand.has(i)).length,
      newcomersBoostedPre: aheadArr.filter((i) => !startBand.has(i) && boostStepsPre[i] > 0).length,
      aheadIdx: aheadArr,
      aheadRoles: aheadArr.map(roleAt),
      aheadBoostStepsPre: aheadArr.map((i) => boostStepsPre[i]),
    };
  }

  return {
    track: geo.id,
    seed,
    stage: STAGE,
    steps: k,
    dtMs,
    winSteps,
    // ★ the signature CHECK B compares — the race itself, untouched by anything above
    sig: st.racers
      .map((x) => `${x.index}:${x.finishRank}:${Math.round(x.finishTimeMs ?? -1)}`)
      .join("|"),
    // (A) the size, on EVERY race
    packMaxPx: Number.isFinite(packMax) ? +packMax.toFixed(3) : null,
    packAllMaxPx: Number.isFinite(packAllMax) ? +packAllMax.toFixed(3) : null,
    packMaxProg: packMaxProg != null ? +packMaxProg.toFixed(4) : null,
    packBreakaway: Number.isFinite(packMax) ? packMax >= THRESHOLD_PX : false,
    packSens: SENS_PX.map((v, i) => ({ px: v, hit: packSensCross[i] })),
    packGroupSize: packCrossSize,
    packCrossProg: packCrossProg != null ? +packCrossProg.toFixed(4) : null,
    packGroupRoles: packCrossGroup ? packCrossGroup.map(roleAt) : null,
    packHeldAboveHalfSec: dtMs ? +((packHeldSteps * dtMs) / 1000).toFixed(3) : null,
    packNeverClosed: packAtFinish != null ? packAtFinish >= THRESHOLD_PX : null,
    // (B)
    boost: bAhead,
    boostTotalStepsWin: Array.from(boostSteps).reduce((s, x) => s + x, 0),
  };
}

const rows = [];
for (const geo of RD.loadTracks({ only: ONLY })) {
  for (let seed = 1; seed <= SEEDS; seed++) rows.push(measureRace(geo, seed));
}
mkdirSync(OUT, { recursive: true });
const name = `remainder-${STAGE}-${TAG}.json`;
writeFileSync(
  join(OUT, name),
  JSON.stringify({
    thresholdPx: THRESHOLD_PX,
    widthPx: WIDTH_PX,
    w70Start: W70_START,
    frontBand: FRONT_BAND,
    sensPx: SENS_PX,
    stage: STAGE,
    racers: RACERS,
    seeds: SEEDS,
    // ★ CHECK A's echo: the shipped keys are PRINTED, never set, so the data file records the world
    // it actually measured.
    shippedChase: {
      enabled: DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeEnabled,
      selection: DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeSelection,
      slots: DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeSlots,
    },
    rows,
  })
);
console.error(`${rows.length} races (${STAGE}) -> ${join(OUT, name)}`);
