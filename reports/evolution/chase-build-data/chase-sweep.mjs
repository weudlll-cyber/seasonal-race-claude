// ============================================================
// File:        chase-sweep.mjs
// Path:        reports/evolution/chase-build-data/chase-sweep.mjs
// Project:     RaceArena — CHASE-BUILD-1 (NIGHT-2026-09-23)
// Description: In the races that actually break away under the owner's definition, is there a racer
//              behind the gap who COULD close it before the finish, at the boost authority that
//              ALREADY EXISTS? A read-only FEASIBILITY measurement. It changes no source, adds no
//              key, builds nothing and proposes nothing.
//
// ★★ THE OWNER'S DESIGN CONSTRAINT, 2026-09-22, recorded because it is what these numbers are FOR
// and is NOT implemented here: extend ONLY the boost part past 0.6; do NOT move when the PULK phase
// ends and do NOT move the OUTCOME start. This file only asks whether such a build could work.
//
// ★ WHY THE QUESTION EXISTS (all five verified at the tree before this file was written):
//   1. the governor runs ONLY inside [pulkStart, pulkEnd) — raceGovernor.js:182-187; outside it every
//      racer is slewed to exactly 1.0 (:189-191).
//   2. pulkEnd IS choreoOutcomeStart — racePlanner.js:174, default 0.6 (defaults.js:1070).
//   3. a SECOND off-switch: governorPhaseWeight returns EXACTLY 0.0 at progress >= corrStart
//      (:92-97) and the force is `1 + w * director` (:375) — so the force is already zero AT the
//      boundary, and corrStart == pulkEnd (racePlanner.js:176).
//   4. the force's three branches are DISJOINT (:364-374) — braked / hero / boosting — which is why
//      "the boost part" is separable at all.
//   5. the owner's breakaway window is [0.70, finish], so the chase mechanism is off for ALL of it.
//
// ★★ PARENT: reports/night/breakaway-count-data/breakaway-count.mjs, reached by copying
// `reports/evolution/breakaway-cast-split-data/cast-split.mjs` — which IS that parent plus the
// `--stage` argument. The brief asked for the stage implementation to be REUSED rather than written
// a second time, and copying the file that already carries it is how that is done: the measurement
// core and the stage arg arrive together, already proven by CHECK A of BREAKAWAY-CAST-SPLIT-1.
// The cast fields (`cast`, `castCounts`, `nRoled`) come along and are kept — they are already-proven
// observers, they cost nothing, and they let a reader see WHO the chasers were. The
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
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.RA_ROOT ?? join(HERE, "..", "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const RD = await import(u("scripts/lib/raceDriver.mjs"));
const { stepRacePhysics } = await import(u("client/src/modules/raceCore.js"));
const { QUICK_TEST_NAMES } = await import(u("client/src/modules/racerNames.js"));
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
// ★ THE PRODUCTION PREDICATE, IMPORTED — never reimplemented. This is the same function the
// selector calls at raceGovernor.js:297.
const { directorReachable } = await import(u("client/src/modules/raceGovernor.js"));
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

function measureRace(geo, seed, world) {
  const identity = RD.resolveIdentity({
    racers: RACERS, raceSeed: seed, seconds: SECONDS,
    racerType: RD.TRACK_DEFAULT_RACER, roster: QUICK_TEST_NAMES, note: "BREAKAWAY-COUNT-1",
  });
  const race = RD.buildRace(geo, identity, DEFAULT_CAMERA_CONFIG, world);
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
  // ── ★★ CHASE-REACH-1. ENTIRELY OBSERVATION — nothing below is applied to any racer. ───────────
  const gcfg = raceCfg.pulkLeadRotCfg ?? {};       // the LIVE resolved config, never a literal
  const BOOST = gcfg.challengerBoost ?? 0;
  const CEIL = gcfg.ceilingCap ?? 0;
  const MAXEFF = gcfg.maxEffect ?? Infinity;
  const CFG_BRAKE = gcfg.leaderBrake ?? 0;
  const leadRot = () => raceCfg.dirState?.leadRot ?? null;
  let chaseSteps = 0;                // in-window steps with a breakaway gap open
  let reachAny0 = 0, reachAnyCfg = 0; // steps with >=1 reachable chaser (brake 0 / configured)
  // ★★ (B) AND (D) ARE COMPUTED TWICE, AND CHECK C IS WHY. The brief's model is that (A) SELECTS the
  // candidates and (B)/(D) then ask about "the best CANDIDATE" — so if `directorReachable` refuses
  // everyone, there is no candidate and CAN-CLOSE must be false. The first version of this file
  // computed (B)/(D) over every racer behind the gap, ignoring the predicate, and CHECK C caught it:
  // the reach counts collapsed under sabotage while CAN-CLOSE and (D) survived unchanged.
  //   *Reach  — restricted to racers the production predicate admits. THE BRIEF'S QUANTITY.
  //   *Any    — every racer behind the gap, whatever the predicate says. Kept beside it because the
  //             predicate is a FIRST-ORDER PROXY on `spreadFactor` that cannot see the OUTCOME
  //             servo's `trajectoryMult`, and the difference between the two columns measures what
  //             that proxy costs rather than leaving it asserted.
  let canCloseStepsReach = 0, canCloseStepsAny = 0;
  let bestRatioReach = Infinity, bestRatioAny = Infinity;
  let bestBoostReach = Infinity, bestBoostAny = Infinity;
  let bestBoostFeasibleReach = null, bestBoostFeasibleAny = null;
  let exHero = 0, exBrakeSet = 0, exCooldown = 0, exUnreachable = 0, exEligible = 0, exTotal = 0;
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

      // ── ★★ THE CHASE MEASUREMENT. Only while a breakaway gap is OPEN. ───────────────────────
      // ★ THE TARGET IS THE BACK OF THE LEADING GROUP, `order[cut-1]`, not P1. The owner's gap runs
      // from the back of that group to the front of the field, so that racer is what a chaser must
      // reach for the breakaway to stop being one. Stated because it is a judgement call.
      // ★★ "WHILE A BREAKAWAY GAP IS OPEN" MEANS THE GAP QUALIFIES AS ONE — packGap >= THRESHOLD_PX,
      // the owner's 157.05. The first version of this file used `packGap > 0`, which is EVERY
      // in-window step, so it measured ordinary racing: the smoke test returned chaseSteps = 1651 of
      // ~1651 and a NEGATIVE required boost (a chaser closing a 2 px gap needs no boost at all).
      // That is not the question. The question is about the races that actually break away.
      if (cut >= 1 && Number.isFinite(packGap) && packGap >= THRESHOLD_PX && dtMs) {
        const dtS = dtMs / 1000;
        const tgt = order[cut - 1];
        const tgtSpeed = ((st.racers[tgt].t - pT[tgt]) * pathPx) / dtS; // OBSERVED, px/s
        const tgtFactor = (st.racers[tgt].spreadFactor ?? 0) * (st.racers[tgt].governorMult ?? 1);
        // seconds the LEADER still needs, from ITS OWN observed rate — never an assumed 60 s.
        const remaining = tgtSpeed > 0 ? ((st.finishT - st.racers[tgt].t) * pathPx) / tgtSpeed : Infinity;
        chaseSteps++;
        const stg = leadRot();
        let anyReach0 = false, anyReachCfg = false;
        let sbRatioR = Infinity, sbBoostR = Infinity, sbFeasR = null;
        let sbRatioA = Infinity, sbBoostA = Infinity, sbFeasA = null;
        for (let ci = cut; ci < order.length; ci++) {
          const idx = order[ci];
          const r = st.racers[idx];
          const sf = r.spreadFactor ?? 0;
          exTotal++;
          // (A) REACHABILITY, as the code itself asks it. ★★ leaderBrake = 0 is the PRIMARY column:
          // past 0.6 nothing brakes the leader, so passing the configured brake would credit the
          // chaser with an advantage that does not exist there. The configured-brake call is kept
          // beside it so the SIZE of that error is visible rather than asserted.
          const reach0 = directorReachable(sf, tgtFactor, BOOST, CEIL, 0, MAXEFF);
          const reachCfg = directorReachable(sf, tgtFactor, BOOST, CEIL, CFG_BRAKE, MAXEFF);
          if (reach0) anyReach0 = true;
          if (reachCfg) anyReachCfg = true;
          // (C) WHO IS EXCLUDED TODAY, by the production test at raceGovernor.js:297.
          const isHeroR = r.isHeroChoreographed === true;
          const inBrakeSet = stg ? stg.brakeSet.has(idx) : false;
          const cooled = stg ? (stg.cooldownUntil.get(idx) ?? 0) > st.physicsTs : false;
          if (isHeroR) exHero++;
          else if (inBrakeSet) exBrakeSet++;
          else if (cooled) exCooldown++;
          else if (!reach0) exUnreachable++;
          else exEligible++;
          // (B) TIME, NOT A FLAG. The counterfactual the owner's constraint describes: the boost part
          // extended past 0.6, i.e. the force at w = 1. Mirrors raceGovernor.js:375-377 exactly.
          const chaserSpeed = ((r.t - pT[idx]) * pathPx) / dtS; // OBSERVED, px/s
          if (!(chaserSpeed > 0) || !(remaining > 0) || !Number.isFinite(remaining)) continue;
          const govAt = (boost) => {
            let t = Math.min(Math.max(1 + boost, 1 - MAXEFF), 1 + MAXEFF);
            if (CEIL > 0 && sf > 0) t = Math.min(t, CEIL / sf);
            return t;
          };
          const closing = chaserSpeed * govAt(BOOST) - tgtSpeed;
          if (closing > 0) {
            const ratio = packGap / closing / remaining;
            if (ratio < sbRatioA) sbRatioA = ratio;
            if (reach0 && ratio < sbRatioR) sbRatioR = ratio;
          }
          // (D) the SMALLEST boost that would have made CAN-CLOSE true, everything else as it is.
          // closing >= gap/remaining  =>  gov >= (tgtSpeed + gap/remaining) / chaserSpeed.
          const govNeeded = (tgtSpeed + packGap / remaining) / chaserSpeed;
          const boostNeeded = govNeeded - 1;
          const govCap = Math.min(1 + MAXEFF, CEIL > 0 && sf > 0 ? CEIL / sf : Infinity);
          if (boostNeeded < sbBoostA) { sbBoostA = boostNeeded; sbFeasA = govNeeded <= govCap; }
          if (reach0 && boostNeeded < sbBoostR) { sbBoostR = boostNeeded; sbFeasR = govNeeded <= govCap; }
        }
        if (anyReach0) reachAny0++;
        if (anyReachCfg) reachAnyCfg++;
        if (sbRatioR <= 1) canCloseStepsReach++;
        if (sbRatioA <= 1) canCloseStepsAny++;
        if (sbRatioR < bestRatioReach) bestRatioReach = sbRatioR;
        if (sbRatioA < bestRatioAny) bestRatioAny = sbRatioA;
        if (sbBoostR < bestBoostReach) { bestBoostReach = sbBoostR; bestBoostFeasibleReach = sbFeasR; }
        if (sbBoostA < bestBoostAny) { bestBoostAny = sbBoostA; bestBoostFeasibleAny = sbFeasA; }
      }
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
    // ★ THE RACE SIGNATURE — finishing order AND times. CHECK B compares this against a scratch copy
    // with the chase block stripped out: if the two differ, the instrument is touching the race and
    // every number in this file is void.
    sig: createHash("sha256")
      .update(st.racers.map((x) => `${x.index}:${x.finishRank}:${Math.round(x.finishTimeMs ?? -1)}`).join("|"))
      .digest("hex")
      .slice(0, 16),
    // ★★ CHASE-REACH-1
    gov: { boost: BOOST, ceilingCap: CEIL, maxEffect: MAXEFF, leaderBrake: CFG_BRAKE },
    chaseSteps, reachAny0, reachAnyCfg,
    canCloseStepsReach, canCloseStepsAny,
    canCloseReach: canCloseStepsReach > 0,
    canCloseAny: canCloseStepsAny > 0,
    bestRatioReach: Number.isFinite(bestRatioReach) ? +bestRatioReach.toFixed(4) : null,
    bestRatioAny: Number.isFinite(bestRatioAny) ? +bestRatioAny.toFixed(4) : null,
    bestBoostReach: Number.isFinite(bestBoostReach) ? +bestBoostReach.toFixed(5) : null,
    bestBoostAny: Number.isFinite(bestBoostAny) ? +bestBoostAny.toFixed(5) : null,
    bestBoostFeasibleReach, bestBoostFeasibleAny,
    excl: { hero: exHero, brakeSet: exBrakeSet, cooldown: exCooldown,
            unreachable: exUnreachable, eligible: exEligible, total: exTotal },
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

// ── ★★ THE ARMS. A0 is the key OFF — today. The rest cross the two selections with 2..5 slots.
// Each arm is a CONFIG OVERRIDE ONLY: the fixture, the measurement and the window are identical
// across arms, so a difference between two rows is the key and nothing else.
const ARMS = [
  { id: 'A0', on: false, sel: 'leader', slots: 2 },
  { id: 'L2', on: true, sel: 'leader', slots: 2 },
  { id: 'L3', on: true, sel: 'leader', slots: 3 },
  { id: 'L4', on: true, sel: 'leader', slots: 4 },
  { id: 'L5', on: true, sel: 'leader', slots: 5 },
  { id: 'G2', on: true, sel: 'gap', slots: 2 },
  { id: 'G3', on: true, sel: 'gap', slots: 3 },
  { id: 'G4', on: true, sel: 'gap', slots: 4 },
  { id: 'G5', on: true, sel: 'gap', slots: 5 },
];

const ARM_FILTER = arg('arm', null);
const arms = ARM_FILTER ? ARMS.filter((a) => ARM_FILTER.split(',').includes(a.id)) : ARMS;

const rows = [];
const geos = RD.loadTracks({ only: ONLY });
for (const arm of arms) {
  const armWorld = {
    ...WORLD,
    raceDynamicsConfig: {
      ...WORLD.raceDynamicsConfig,
      chaseAfterOutcomeEnabled: arm.on,
      chaseAfterOutcomeSelection: arm.sel,
      chaseAfterOutcomeSlots: arm.slots,
    },
  };
  for (const geo of geos) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      rows.push({ arm: arm.id, ...measureRace(geo, seed, armWorld) });
    }
  }
  console.error(`  ${arm.id} done (${rows.length} races so far)`);
}

// ★★ THE ARM-SIGNATURE GUARD. If an arm's every race hashes the same as A0's, the key did not
// reach the race and the arm is not a result. It WARNS per arm (a dead arm is a legitimate kill
// rule) but THROWS if EVERY arm matches A0 — that is the wiring trap, not a finding.
if (arms.length > 1 && arms.some((a) => a.id === 'A0')) {
  const byArm = new Map();
  for (const r of rows) {
    if (!byArm.has(r.arm)) byArm.set(r.arm, new Map());
    byArm.get(r.arm).set(`${r.track}#${r.seed}`, r.sig);
  }
  const base = byArm.get('A0');
  let identical = 0;
  let compared = 0;
  for (const [id, m] of byArm) {
    if (id === 'A0') continue;
    compared++;
    const keys = [...m.keys()].filter((k) => base.has(k));
    const same = keys.filter((k) => m.get(k) === base.get(k)).length;
    if (same === keys.length) {
      identical++;
      console.error(`  ★ ARM ${id} IS BYTE-IDENTICAL TO A0 on all ${keys.length} races — DEAD ARM.`);
    } else {
      console.error(`  ${id} vs A0: ${keys.length - same}/${keys.length} races differ`);
    }
  }
  if (compared > 0 && identical === compared) {
    throw new Error(
      '★★ EVERY ARM IS BYTE-IDENTICAL TO A0. The keys are not reaching the race. That is the ' +
        'wiring trap, not a result — STOP and fix it before reading any number from this run.',
    );
  }
}

mkdirSync(OUT, { recursive: true });
const name = `sweep-${TAG}.json`;
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
    arms,
    rows,
  }),
);
console.error(`${rows.length} races over ${arms.length} arm(s) -> ${join(OUT, name)}`);
