// ============================================================
// File:        cast-split.mjs
// Path:        reports/evolution/breakaway-cast-split-data/cast-split.mjs
// Project:     RaceArena — BREAKAWAY-CAST-SPLIT-1
// Description: Does a race that CASTS shape X break away more often than a race that does not?
//              A read-only OBSERVATIONAL SPLIT. It changes no source, adds no key, proposes nothing.
//
// ★★ PARENT: reports/night/breakaway-count-data/breakaway-count.mjs, COPIED AND EXTENDED. The
// measurement is NOT re-derived: the threshold, the sensitivity pair, the window, the front band,
// the owner's largest-consecutive-gap definition, the physics-step sampling and the fixture are all
// the parent's, byte-for-byte where untouched. CHECK A in the report proves it — the quiet run must
// reproduce `count-v2n300.json` race for race, 48 of 300.
//
// ★ WHAT IS NEW, and it is deliberately almost nothing:
//   (A) THE FULL CAST PER RACE, not just the roles inside the breakaway group: `cast`, `castCounts`
//       and `nRoled`, read from the plan's OWN maps (`getHeroRoles` / `getHeldRelease`) via the
//       parent's `roleAt`. A role is never guessed from the race.
//   (B) A STAGE ARG, `--stage=quiet|wild`. The parent hard-codes "quiet"; the owner tests at WILD,
//       so both are measured. ★ The stage MUST NOT move the cast — SHAPE-CENSUS-1 §3 proved the cast
//       byte-identical across stages and `heroCurveGenerator.js` names no stage key. CHECK C
//       re-proves it here, and a difference STOPS the block.
//   (C) ★ IN-WINDOW ACTION — lead changes, overtakes, and the top-5 spread at 0.90. A JUDGEMENT
//       CALL, recorded in the report: the brief says "exactly two things are new", and the analysis
//       step then requires BOTH HALVES (a split that buys fewer breakaways by killing front movement
//       must be labelled as failing). Those three quantities are not in the parent's output and
//       cannot be derived from it, so they are added as PURE OBSERVERS: they read the same
//       `order`/`pT` the parent already computes, touch no RNG and no physics, and cannot move a
//       single parent field. CHECK A is what proves that claim rather than my word for it.
//
// ★ The top-5 spread here is a WORLD-PX CHECKPOINT — leader to 5th at the first step past progress
// 0.90 — NOT ACTION-LEVERS-1's seconds-based finish-order `top5Spread` (scripts/sim/observers/
// gap-metrics.mjs:117). Different quantity, different units; the two must not be read as one number.
//
//              Evidence for one report, so it lives beside its data under reports/. It imports
//              raceCore, so `engine-reach` counts it inside the race hull once TRACKED; nothing in
//              the product imports it.
//
// ── ★★★ THE DISTANCE IS THE OWNER'S, AND IT IS NOT LEADER-TO-SECOND (BREAKAWAY-COUNT-2) ────────
// His definition, 2026-09-20: a racer running ALONE at the front, or a small GROUP leading together,
// FAR from the chasing field — and the distance that matters runs from the BACK OF THAT GROUP to the
// FRONT OF THE FIELD. The beginning of the pack, never its middle.
//
// ★ SO NO MEAN, MEDIAN OR CENTROID IS COMPUTED ANYWHERE IN THIS FILE. He said such a figure tells
// him nothing and is not what he sees.
//
// HOW IT IS COMPUTED, per physics step, over live racers ordered by position:
//   · the consecutive gaps 1-2, 2-3, 3-4, 4-5, 5-6;
//   · the BREAKAWAY GAP is the LARGEST of those five;
//   · the GROUP SIZE is how many racers sit ahead of that gap (1..5).
// ★ THE 5 IS NOT A NEW NUMBER: it is `BAND_EDGES[0]` (racePlanner.js:56), the game's own front band,
// IMPORTED rather than restated. A leading group larger than the front band is not a breakaway
// group, it is the field.
//
// ★★ AND LEADER-TO-SECOND IS KEPT BESIDE IT, because the difference between the two definitions is
// the point: when second sits on the leader's wheel while 3..40 are far back, leader-to-second
// reports NO breakaway and the owner sees a lone leader.
//
// ── ★★ THE THRESHOLD IS HIS, RECOVERED FROM THE RECORD, NOT CHOSEN HERE ────────────────────────
// "A racer running at least as far ahead as the one he photographed" =
//   **0.698 canvas widths = 157.05 world px**
// from `reports/night/BREAKAWAY-RECOUNT-2.md:20`, which is the THIRD and final reading. The 71 → 44
// → 20 sequence was two corrections:
//   reading 1  0.349 widths, per-frame `visibleWorldPx` divisor  → 71 in 100
//   reading 2  0.698 widths, per-frame divisor                   → 44 in 100
//   reading 3  0.698 widths, ★ FIXED 225 px/width (the settled LEADER_ZOOM) → 20 in 100
// ★ World px is primary here because it is divisor-free. 225 is used only to say what 157.05 px is
// in widths; no per-frame zoom is used anywhere.
// ★ The gap brake's 56 px allowance is NOT used as a threshold — it is a mechanism's number, not his.
//
// ★★★ AND THE RECORD SAYS WHICH QUANTITY THAT THRESHOLD WAS CALIBRATED ON. `BREAKAWAY-RECOUNT-1.md:25`
// quotes the original harness verbatim:
//     C:/tmp/breakaway.mjs:79   const frac = s.finishT > 0 ? (live[0].t - live[1].t) / s.finishT : 0;
// `live[0].t - live[1].t` is LEADER MINUS SECOND. So 157.05 px measures the leader-to-second distance
// in his photograph — the very quantity his 2026-09-20 definition says is not what he means. The
// count is still reported at 157.05 because it is his only anchor, and a SENSITIVITY pair at 0.5 and
// 1.0 canvas widths (112.5 and 225.0 px) is reported beside it so the answer does not hang on it.
//
// ── ★★ THE WINDOW IS FIXED AT [0.70, finish] ───────────────────────────────────────────────────
// The owner's requirement of 2026-09-20 is about the LAST 30% of the race. `W70_START` is one number
// for every race and does not move with any config.
//
// ── ★★ WHERE IT SAMPLES ────────────────────────────────────────────────────────────────────────
// ON THE PHYSICS STEP. Positions and finished flags are snapshotted BEFORE `stepRacePhysics` — what
// the controller ranked and measured gaps on — and the role map is read after. Never a `runRace`
// frame callback, which can cover two physics steps and reads every gap one step late.
//
// ── WHAT IS REUSED, NOT REBUILT ────────────────────────────────────────────────────────────────
// The driving loop, the PRE-STEP ranking and the gap expression `(leader.t - second.t) * pathLengthPx`
// are `action-arms.mjs`'s, which took them from `breakaway-lever.mjs` and its parent
// `breakaway-growth.mjs`. The role detection is SHAPE-CENSUS-1's — the plan's own role map via
// `getHeroRoles()`, never guessed from the race.
// ★ WHY THIS IS A NEW FILE AND NOT A FLAG ON `action-arms.mjs`: that file is committed evidence for
// BREAKAWAY-ACTION-2026-09-20, and it answers a different question (a lever grid against the brake's
// 56 px allowance). Three things here do not exist there — the owner's 157.05 px threshold, the
// hold-above-half-peak duration, and the role at the CROSSING moment rather than at the peak.
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
const { BAND_EDGES } = await import(u("client/src/modules/racePlanner.js"));

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const SEEDS = Number(arg("seeds", 3));
const OUT = arg("out", HERE);
const TAG = arg("tag", "n30");
// (B) the stage. The parent hard-codes "quiet"; the owner tests at wild. CHECK C proves the cast is
// identical across the two, which is what makes a per-stage split of the SAME cast meaningful.
const STAGE = arg("stage", "quiet");
if (STAGE !== "quiet" && STAGE !== "wild") {
  throw new Error(`--stage must be quiet or wild, got ${STAGE}`);
}

// ── THE FIXTURE: today's SHIPPED world, unchanged ──────────────────────────────────────────────
const RACERS = 40;
const SECONDS = 60;
const WORLD = RD.worldForActionStage(STAGE); // (B) quiet = the shipped stage, defaults.js:47
const THRESHOLD_PX = 157.05; // ★ HIS lead — BREAKAWAY-RECOUNT-2:20
const WIDTH_PX = 225; // the settled LEADER_ZOOM value, used only to express px as widths
const W70_START = 0.7;
// ★ the game's own front band, ranks 1..5 — imported, never restated.
const FRONT_BAND = BAND_EDGES[0];
// The sensitivity pair, so the headline does not rest on one number.
const SENS_PX = [112.5, 225.0]; // 0.5 and 1.0 canvas widths against the settled 225

function measureRace(geo, seed) {
  const identity = RD.resolveIdentity({
    racers: RACERS, raceSeed: seed, seconds: SECONDS,
    racerType: RD.TRACK_DEFAULT_RACER, roster: QUICK_TEST_NAMES, note: "BREAKAWAY-COUNT-1",
  });
  const race = RD.buildRace(geo, identity, DEFAULT_CAMERA_CONFIG, WORLD);
  const { st, raceCfg } = race;
  const ctl = raceCfg.racePlanController;
  const pathPx = geo.pathLengthPx ?? 0;
  const n = st.racers.length;

  const pT = new Float64Array(n);
  const pFin = new Uint8Array(n);
  const winGaps = []; // every in-window LEADER-TO-SECOND gap (the old definition)
  const winPack = []; // ★ every in-window BREAKAWAY GAP (the owner's definition)
  let w70Max = -Infinity, allMax = -Infinity;
  let packMax = -Infinity, packAllMax = -Infinity;
  let crossLeader = -1, crossProg = null; // the FIRST moment leader-to-second reaches his threshold
  // ★ the first moment the OWNER'S gap qualifies: the group, its size, and the roles in it
  let packCrossProg = null, packCrossSize = null, packCrossGroup = null;
  const packSensCross = SENS_PX.map(() => false);
  let firstFinishSeen = false, leadAtFirstFinishPx = null;
  let dtMs = null;
  // ── (C) PURE OBSERVERS. They read the order the parent already builds and write nothing back.
  let winLeadChanges = 0, winOvertakes = 0, winPrevP1 = -1, winPrevOrder = null;
  let top5SpreadAt90Px = null;
  const CEILING = 200 * 60 * 4;
  let k = 0;

  while (st.finishedCount < n && k < CEILING) {
    for (let i = 0; i < n; i++) { pT[i] = st.racers[i].t; pFin[i] = st.racers[i].finished ? 1 : 0; }
    const prog = st.raceProgress;
    const tsBefore = st.physicsTs;
    stepRacePhysics(st, raceCfg);
    if (dtMs == null) dtMs = st.physicsTs - tsBefore; // the fixed physics step, read not assumed
    k++;
    let li = -1, si = -1;
    for (let i = 0; i < n; i++) {
      if (pFin[i]) continue;
      if (li < 0 || pT[i] > pT[li]) { si = li; li = i; }
      else if (si < 0 || pT[i] > pT[si]) { si = i; }
    }
    if (li < 0 || si < 0) break;
    const gap = (pT[li] - pT[si]) * pathPx;
    if (gap > allMax) allMax = gap;
    if (!firstFinishSeen && st.finishedCount > 0) { firstFinishSeen = true; leadAtFirstFinishPx = gap; }
    // ── ★★★ THE OWNER'S GAP: back of the leading group → front of the field ────────────────────
    // The live order, then the largest of the five consecutive gaps inside the front band. No mean,
    // no median, no centroid — the FRONT of the pack is `order[cut]`, the racer immediately behind
    // the gap, and nothing further back is consulted.
    const order = [];
    for (let i = 0; i < n; i++) if (!pFin[i]) order.push(i);
    order.sort((a, b) => pT[b] - pT[a]);
    let packGap = -Infinity, cut = -1;
    const maxCut = Math.min(FRONT_BAND, order.length - 1);
    for (let c = 1; c <= maxCut; c++) {
      const g = (pT[order[c - 1]] - pT[order[c]]) * pathPx;
      if (g > packGap) { packGap = g; cut = c; }
    }
    if (packGap > packAllMax) packAllMax = packGap;
    if (prog >= W70_START && !firstFinishSeen) {
      winGaps.push(gap);
      if (gap > w70Max) w70Max = gap;
      if (crossLeader < 0 && gap >= THRESHOLD_PX) { crossLeader = li; crossProg = prog; }
      if (Number.isFinite(packGap)) {
        winPack.push(packGap);
        if (packGap > packMax) packMax = packGap;
        if (packCrossProg == null && packGap >= THRESHOLD_PX) {
          packCrossProg = prog;
          packCrossSize = cut; // racers AHEAD of the gap: 1..FRONT_BAND
          packCrossGroup = order.slice(0, cut);
        }
        for (let q = 0; q < SENS_PX.length; q++) if (packGap >= SENS_PX[q]) packSensCross[q] = true;
      }
      // ── (C) IN-WINDOW ACTION, on the SAME pre-step order the gap above was read from ────────
      // LEAD CHANGES: the racer lying first changed.
      if (winPrevP1 >= 0 && order[0] !== winPrevP1) winLeadChanges++;
      winPrevP1 = order[0];
      // OVERTAKES: adjacent transpositions between consecutive samples. For every pair that was
      // adjacent last sample, count it if the pair has since swapped. Adjacent-only, so a racer
      // sweeping past four others is four overtakes and not one — and it stays O(n).
      if (winPrevOrder) {
        const rank = new Map();
        for (let i = 0; i < order.length; i++) rank.set(order[i], i);
        for (let i = 0; i + 1 < winPrevOrder.length; i++) {
          const a = rank.get(winPrevOrder[i]), b = rank.get(winPrevOrder[i + 1]);
          if (a != null && b != null && b < a) winOvertakes++;
        }
      }
      winPrevOrder = order.slice();
    }
    // TOP-5 SPREAD AT 0.90: leader to 5th in world px, at the FIRST step past 0.90. Outside the
    // window branch because 0.90 is its own checkpoint and must be taken whether or not a racer has
    // already finished.
    if (top5SpreadAt90Px == null && prog >= 0.9 && order.length >= 5) {
      top5SpreadAt90Px = +((pT[order[0]] - pT[order[4]]) * pathPx).toFixed(3);
    }
  }

  // ── HOW LONG IT IS HELD, in seconds above HALF its own peak, inside the window ───────────────
  // "How often" alone misleads — BREAKAWAY-FREQUENCY-1 says so itself — so the duration travels
  // with the count. Half the peak is the report's own shape measure, not a new threshold.
  let heldSteps = 0;
  if (Number.isFinite(w70Max) && w70Max > 0) for (const g of winGaps) if (g >= w70Max / 2) heldSteps++;
  let packHeldSteps = 0;
  if (Number.isFinite(packMax) && packMax > 0) for (const g of winPack) if (g >= packMax / 2) packHeldSteps++;
  // Did the field ever close the OWNER'S gap before the finish? Read at the first crossing of the line.
  const packAtFinish = winPack.length ? winPack[winPack.length - 1] : null;
  const roles = ctl.getHeroRoles();
  const held = ctl.getHeldRelease();
  const heldSet = new Set(held ? [...held.keys()] : []);
  const roleAt = (i) => {
    if (i < 0) return null;
    const r = roles ? (roles.get(i) ?? null) : null;
    if (r === "comebacker") return heldSet.has(i) ? "comebacker(staged)" : "comebacker";
    return r; // null == uncast
  };

  // ── (A) THE FULL CAST, from the plan's own maps. Never guessed from the race. ──────────────
  const cast = [];
  if (roles) {
    for (const [index] of roles) {
      const role = roleAt(index);
      if (role == null) continue;
      cast.push({ index, role, staged: heldSet.has(index) });
    }
    cast.sort((a, b) => a.index - b.index);
  }
  const castCounts = {};
  for (const c of cast) castCounts[c.role] = (castCounts[c.role] ?? 0) + 1;

  return {
    track: geo.id, seed, steps: k, dtMs,
    // (A)
    cast, castCounts, nRoled: cast.length,
    // (C)
    winLeadChanges, winOvertakes, top5SpreadAt90Px,
    w70MaxPx: Number.isFinite(w70Max) ? +w70Max.toFixed(3) : null,
    allMaxPx: Number.isFinite(allMax) ? +allMax.toFixed(3) : null,
    // ★ the two headline booleans, both at HIS threshold
    w70Breakaway: Number.isFinite(w70Max) ? w70Max >= THRESHOLD_PX : false,
    allBreakaway: Number.isFinite(allMax) ? allMax >= THRESHOLD_PX : false,
    heldAboveHalfSec: dtMs ? +((heldSteps * dtMs) / 1000).toFixed(3) : null,
    neverReeledIn: leadAtFirstFinishPx != null ? leadAtFirstFinishPx >= THRESHOLD_PX : null,
    leadAtFirstFinishPx: leadAtFirstFinishPx != null ? +leadAtFirstFinishPx.toFixed(3) : null,
    crossLeader, crossProg: crossProg != null ? +crossProg.toFixed(4) : null,
    crossRole: roleAt(crossLeader),
    // ★★ the owner's definition
    packMaxPx: Number.isFinite(packMax) ? +packMax.toFixed(3) : null,
    packAllMaxPx: Number.isFinite(packAllMax) ? +packAllMax.toFixed(3) : null,
    packBreakaway: Number.isFinite(packMax) ? packMax >= THRESHOLD_PX : false,
    packAllBreakaway: Number.isFinite(packAllMax) ? packAllMax >= THRESHOLD_PX : false,
    packSens: SENS_PX.map((v, i) => ({ px: v, hit: packSensCross[i] })),
    packGroupSize: packCrossSize,
    packCrossProg: packCrossProg != null ? +packCrossProg.toFixed(4) : null,
    packGroupRoles: packCrossGroup ? packCrossGroup.map(roleAt) : null,
    packHeldAboveHalfSec: dtMs ? +((packHeldSteps * dtMs) / 1000).toFixed(3) : null,
    packNeverClosed: packAtFinish != null ? packAtFinish >= THRESHOLD_PX : null,
  };
}

const rows = [];
for (const geo of RD.loadTracks({ only: ONLY })) {
  for (let seed = 1; seed <= SEEDS; seed++) rows.push(measureRace(geo, seed));
}
mkdirSync(OUT, { recursive: true });
const name = `cast-${TAG}.json`;
writeFileSync(join(OUT, name), JSON.stringify({
  thresholdPx: THRESHOLD_PX, widthPx: WIDTH_PX, w70Start: W70_START, frontBand: FRONT_BAND, sensPx: SENS_PX,
  stage: STAGE, racers: RACERS, seeds: SEEDS, rows,
}));
console.error(`${rows.length} races -> ${join(OUT, name)}`);
