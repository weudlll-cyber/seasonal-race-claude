// ============================================================
// breakaway-growth.mjs — BREAKAWAY-GROWTH-1
//
// WHAT IT ANSWERS: for the races that open a lead bigger than the brake's own allowance inside the
// brake's own window, where does the GROWTH of that lead come from — the leader speeding up, the
// racer behind him slowing down, or a speed difference that was there all along and was simply
// never closed.
//
// HOW IT MEASURES, and why it needs no instrumented build:
//   * the race is driven by `stepRacePhysics` directly (no camera — the physics never reads one),
//     through `scripts/lib/raceDriver.mjs`'s `buildRace`, so the world, roster and track record are
//     the product's own;
//   * every factor of the t-update (`raceStep.js:115-133`) is READ off the live racer AFTER the
//     step that used it, except the two flags `applyRacerBehavior` rewrites after the advance
//     (`raceCore.js:735`) — those are snapshotted BEFORE the step, which is when the step reads
//     them;
//   * the reconstruction is CHECKED on every racer of every step: baseSpeed x boost x brake x
//     rowEnv x traj x area x gov must equal the observed dt, and any step where it does not is
//     counted and reported rather than quietly averaged in.
//
// The gap is the brake's own expression — `(leader.t - second.t) * pathLengthPx`, racePlanner.js:901
// — read on PRE-STEP positions, which is where the controller reads it. The peak is cross-checked
// against the controller's own `getGapBrakeStats().maxGapPxInWindow`.
// ============================================================

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// The repo root. This file lives at reports/night/breakaway-growth-data/, three levels down, so the
// default resolves correctly wherever the repository is checked out; `RA_ROOT` overrides it when the
// harness is run from a scratchpad against a different tree (which is how the two arms were driven).
const ROOT = process.env.RA_ROOT ?? join(HERE, "..", "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const RD = await import(u("scripts/lib/raceDriver.mjs"));
const { stepRacePhysics } = await import(u("client/src/modules/raceCore.js"));
const { computeRowEnvMult } = await import(u("client/src/modules/raceStep.js"));
const { computeEffectiveBrakeFactor } = await import(
  u("client/src/modules/raceBehaviorConfig.js")
);
const { QUICK_TEST_NAMES } = await import(u("client/src/modules/racerNames.js"));
const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const SEEDS = Number(arg("seeds", 30));
const OUT = arg("out", HERE);

// ── THE FIXTURE, stated once ────────────────────────────────────────────────────────────────────
const RACERS = 40;
const SECONDS = 60;
const STAGE = "wild";
const WORLD = RD.worldForActionStage(STAGE);
const ALLOWED_PX = WORLD.raceDynamicsConfig.gapBrakeAllowedGapPx; // 56 on shipped defaults
const WINDOW_END = WORLD.raceDynamicsConfig.gapBrakeWindowEnd;

// ── THE BASELINE RULE, named here because it is the one judgement call in the decomposition ─────
// "Before the gap opened" is taken literally: the most recent run of steps, anywhere earlier in the
// race, at which the gap was no more than HALF the allowance. A fixed number of seconds before the
// episode would silently include the opening of a slowly-growing gap and charge it to
// "never closed"; a threshold cannot.
const BASE_GAP_PX = ALLOWED_PX / 2;
const BASE_MAX_STEPS = 600; // 10 s at FIXED_DT — the most recent ones
const BASE_MIN_STEPS = 60; // 1 s; below this the race gets no baseline and is counted as such
const GROWTH_MIN_STEPS = 5;

const FACTORS = [
  "baseSpeed",
  "boost",
  "brake",
  "rowEnvMult",
  "trajectoryMult",
  "areaBonusMult",
  "governorMult",
];
const NF = FACTORS.length;

/**
 * One race, driven step by step, every racer recorded on every step.
 *
 * Per step the layout is one Float64Array of n*(NF+1): the seven factors then the realized advance
 * in world px, per racer. A finished racer records NaN — his advance is the run-out decay, which is
 * not the t-update and must never enter a speed mean.
 */
function measureRace(geo, seed) {
  const identity = RD.resolveIdentity({
    racers: RACERS,
    raceSeed: seed,
    seconds: SECONDS,
    racerType: RD.TRACK_DEFAULT_RACER,
    roster: QUICK_TEST_NAMES,
    note: "BREAKAWAY-GROWTH-1",
  });
  const race = RD.buildRace(geo, identity, DEFAULT_CAMERA_CONFIG, WORLD);
  const { st, raceCfg } = race;
  const ctl = raceCfg.racePlanController;
  const pathPx = geo.pathLengthPx ?? 0;
  const behaviorConfig = raceCfg.behaviorConfig;
  const rowPhaseCfg = raceCfg.rowPhaseCfg;
  const isOpen = raceCfg.isOpenTrack;
  const n = st.racers.length;
  // seven factors, then the realized advance, then the PUSH residual (the eighth term).
  const W = NF + 2;

  const pT = new Float64Array(n);
  const pFin = new Uint8Array(n);
  const pBoostOn = new Uint8Array(n);
  const pAvoidOn = new Uint8Array(n);
  const pBrakeMatch = new Float64Array(n);

  const rows = []; // per-step scalars
  const data = []; // per-step Float64Array(n*W)
  let reconMismatch = 0;
  let sampled = 0;
  // Not a DNF. The loop stops when fewer than two racers are still running because a LEAD needs
  // two, and the brake's window closes at 0.97 — long before that. Named rather than reported as
  // "unfinished", which is what an earlier pass of this harness called it and is not true.
  let stopReason = "all-finished";
  const CEILING_STEPS = 200 * 60 * 4;
  let k = 0;
  const windowStart = ctl.getGapBrakeStats().windowStart;

  while (st.finishedCount < n && k < CEILING_STEPS) {
    for (let i = 0; i < n; i++) {
      const r = st.racers[i];
      pT[i] = r.t;
      pFin[i] = r.finished ? 1 : 0;
      pBoostOn[i] = r.draftingBoostActive ? 1 : 0;
      pAvoidOn[i] = r.avoidanceActive ? 1 : 0;
      pBrakeMatch[i] = r.brakeMatchFactor ?? NaN;
    }
    stepRacePhysics(st, raceCfg);
    k++;

    // The controller ranked PRE-STEP positions among the racers unfinished at that moment.
    let li = -1;
    let si = -1;
    for (let i = 0; i < n; i++) {
      if (pFin[i]) continue;
      if (li < 0 || pT[i] > pT[li]) {
        si = li;
        li = i;
      } else if (si < 0 || pT[i] > pT[si]) {
        si = i;
      }
    }
    if (li < 0 || si < 0) {
      stopReason = "fewer-than-two-running";
      break;
    }

    const prog = st.raceProgress; // written at the TOP of the step; this is the value it used
    const effBrake = computeEffectiveBrakeFactor(behaviorConfig, isOpen, st.physicsTs);
    const buf = new Float64Array(n * W);
    let fieldSum = 0;
    let fieldN = 0;
    for (let i = 0; i < n; i++) {
      const o = i * W;
      if (pFin[i]) {
        for (let f = 0; f < W; f++) buf[o + f] = NaN;
        continue;
      }
      const r = st.racers[i];
      const boost = pBoostOn[i] ? behaviorConfig.draftingBoost : 1.0;
      const bm = pBrakeMatch[i];
      const brake = pAvoidOn[i] ? Math.min(effBrake, Number.isNaN(bm) ? effBrake : bm) : 1.0;
      const rowEnvMult = rowPhaseCfg.smooth
        ? (r._rowEnvSm ?? computeRowEnvMult(r.rawRowBonus, prog, rowPhaseCfg))
        : computeRowEnvMult(r.rawRowBonus, prog, rowPhaseCfg);
      buf[o] = r.baseSpeed;
      buf[o + 1] = boost;
      buf[o + 2] = brake;
      buf[o + 3] = rowEnvMult;
      buf[o + 4] = r.trajectoryMult;
      buf[o + 5] = r.areaBonusMult;
      buf[o + 6] = r.governorMult ?? 1.0;
      const adv = (r.t - pT[i]) * pathPx;
      buf[o + 7] = adv;
      fieldSum += adv;
      fieldN++;
      // ── THE EIGHTH TERM, and it is NOT a multiplier ─────────────────────────────────────────
      // `applyRacerBehavior` writes `r.t` directly after the advance (raceBehavior.js:1414-1415,
      // the non-penetration push), so the realized step is the seven-factor product PLUS an
      // additive term. It is recorded here rather than tolerated as noise: a residual nobody
      // measures is how a decomposition comes to describe something other than the race.
      let prod = pathPx;
      for (let f = 0; f < NF; f++) prod *= buf[o + f];
      buf[o + 8] = adv - prod;
      sampled++;
      if (!(Math.abs(adv - prod) <= 1e-7 * Math.max(1, Math.abs(adv)))) reconMismatch++;
    }

    const bs = ctl.getGapBrakeStats();
    rows.push({
      k,
      prog,
      inWindow: prog >= windowStart && prog <= WINDOW_END,
      gapPx: (pT[li] - pT[si]) * pathPx,
      li,
      si,
      dField: fieldN ? fieldSum / fieldN : 0,
      fieldN,
      bEngaged: bs.engaged === true,
      bStrength: bs.strength ?? 0,
      bBinding: bs.bindingIdx,
    });
    data.push(buf);
  }

  return {
    track: geo.id,
    seed,
    finished: st.finishedCount >= n,
    stopReason: k >= CEILING_STEPS ? "step-ceiling" : stopReason,
    n,
    W,
    rows,
    data,
    bstats: ctl.getGapBrakeStats(),
    roles: ctl.getHeroRoles(),
    targetRankOf: (i) => ctl.getTargetRank(i),
    reconMismatch,
    sampled,
    windowStart,
  };
}

/** Reduce one measured race to the numbers the report reads. */
function summarise(m) {
  const { rows, data, W } = m;
  const out = {
    track: m.track,
    seed: m.seed,
    finished: m.finished,
    stopReason: m.stopReason,
    steps: rows.length,
    reconMismatch: m.reconMismatch,
    sampled: m.sampled,
    maxGapPxInWindow: m.bstats.maxGapPxInWindow,
    brakeFiredFrames: m.bstats.firedFrames,
    brakeWindowFrames: m.bstats.windowFrames,
    brakeMinMult: m.bstats.minMultCommanded,
    brakeMaxStrength: m.bstats.maxStrength,
    brakeMinEngageGapPx: Number.isFinite(m.bstats.minEngageGapPx)
      ? m.bstats.minEngageGapPx
      : null,
    isBreakaway: m.bstats.maxGapPxInWindow > ALLOWED_PX,
  };
  if (!out.isBreakaway || rows.length === 0) return out;

  let peak = -Infinity;
  let peakAt = -1;
  for (let j = 0; j < rows.length; j++) {
    if (rows[j].inWindow && rows[j].gapPx > peak) {
      peak = rows[j].gapPx;
      peakAt = j;
    }
  }
  out.peakGapPx = peak;
  // The harness and the controller must have read the SAME gap. If they have not, everything below
  // is measuring something else and the race says so rather than reporting a number.
  out.peakAgreesWithBrake = Math.abs(peak - m.bstats.maxGapPxInWindow) < 1e-6;

  let start = -1;
  for (let j = 0; j <= peakAt; j++) {
    if (rows[j].inWindow && rows[j].gapPx > ALLOWED_PX) {
      start = j;
      break;
    }
  }
  if (start < 0) {
    out.category = "no-episode";
    return out;
  }
  out.episodeStartProg = rows[start].prog;
  out.episodePeakProg = rows[peakAt].prog;
  out.episodeStartGapPx = rows[start].gapPx;

  // WHO — the leader and the second at the PEAK step, followed by INDEX from there on.
  const L = rows[peakAt].li;
  const S2 = rows[peakAt].si;
  out.leaderIdx = L;
  out.secondIdx = S2;
  out.leaderRole = m.roles ? (m.roles.get(L) ?? null) : null;
  out.secondRole = m.roles ? (m.roles.get(S2) ?? null) : null;
  out.leaderTargetRank = m.targetRankOf(L);
  out.secondTargetRank = m.targetRankOf(S2);
  out.leaderLedAtStart = rows[start].li === L;
  out.secondWasSecondAtStart = rows[start].si === S2;

  // THE BASELINE — see BASE_GAP_PX above.
  const baseIdx = [];
  for (let j = start - 1; j >= 0 && baseIdx.length < BASE_MAX_STEPS; j--) {
    if (rows[j].gapPx <= BASE_GAP_PX) baseIdx.push(j);
    else if (baseIdx.length > 0) break; // the run ended; do not jump across the opening gap
  }
  baseIdx.reverse();
  const growIdx = [];
  for (let j = start + 1; j <= peakAt; j++) {
    if (rows[j].gapPx > rows[j - 1].gapPx) growIdx.push(j);
  }
  out.baselineSteps = baseIdx.length;
  out.growthSteps = growIdx.length;
  out.baselineStartProg = baseIdx.length ? rows[baseIdx[0]].prog : null;
  out.baselineEndProg = baseIdx.length ? rows[baseIdx[baseIdx.length - 1]].prog : null;
  out.gapGrowthPx = rows[peakAt].gapPx - rows[start].gapPx;

  const adv = (j, i) => data[j][i * W + 7];
  const meanAdv = (idxs, i) => {
    let s = 0;
    let c = 0;
    for (const j of idxs) {
      const v = adv(j, i);
      if (!Number.isFinite(v)) continue;
      s += v;
      c++;
    }
    return c ? s / c : null;
  };

  if (baseIdx.length < BASE_MIN_STEPS || growIdx.length < GROWTH_MIN_STEPS) {
    out.category = "no-baseline";
    return out;
  }

  const vL_B = meanAdv(baseIdx, L);
  const vL_G = meanAdv(growIdx, L);
  const vS_B = meanAdv(baseIdx, S2);
  const vS_G = meanAdv(growIdx, S2);
  if (vL_B == null || vL_G == null || vS_B == null || vS_G == null) {
    out.category = "no-baseline";
    return out;
  }
  const vF_B = baseIdx.reduce((s, j) => s + rows[j].dField, 0) / baseIdx.length;
  const vF_G = growIdx.reduce((s, j) => s + rows[j].dField, 0) / growIdx.length;
  Object.assign(out, {
    vL_B,
    vL_G,
    vS_B,
    vS_G,
    vF_B,
    vF_G,
    leaderRelB: vL_B / vF_B,
    leaderRelG: vL_G / vF_G,
    secondRelB: vS_B / vF_B,
    secondRelG: vS_G / vF_G,
  });

  // ── THE DECOMPOSITION, and it is EXACT, not a model ─────────────────────────────────────────
  // Over the nG growing steps the gap grows by nG*(vL_G - vS_G), and that is identically
  //     nG*(vL_G - vL_B)  +  nG*(vS_B - vS_G)  +  nG*(vL_B - vS_B)
  // = "the leader got faster" + "the one behind got slower" + "a difference already there".
  const nG = growIdx.length;
  const tLead = nG * (vL_G - vL_B);
  const tSecond = nG * (vS_B - vS_G);
  const tPre = nG * (vL_B - vS_B);
  const total = tLead + tSecond + tPre;
  Object.assign(out, {
    termLeaderPx: tLead,
    termSecondPx: tSecond,
    termPreExistingPx: tPre,
    termTotalPx: total,
    growthAcrossGrowingStepsPx: growIdx.reduce((s, j) => s + (adv(j, L) - adv(j, S2)), 0),
  });
  // How much of the growth across the growing steps is the PUSH rather than the multipliers.
  const pushDiff = growIdx.reduce((s, j) => s + (data[j][L * W + 8] - data[j][S2 * W + 8]), 0);
  const advDiff = out.growthAcrossGrowingStepsPx;
  out.pushDiffPx = pushDiff;
  out.pushShareOfGrowth = advDiff !== 0 ? pushDiff / advDiff : null;

  const share = (x) => (total !== 0 ? x / total : 0);
  out.shareLeader = share(tLead);
  out.shareSecond = share(tSecond);
  out.sharePre = share(tPre);
  const ranked = [
    ["leader-accelerates", tLead],
    ["field-decelerates", tSecond],
    ["never-closed", tPre],
  ].sort((a, b) => b[1] - a[1]);
  out.dominantTerm = ranked[0][0];
  out.category = total > 0 && ranked[0][1] / total > 0.5 ? ranked[0][0] : "unattributed";

  // ── THE MULTIPLIER SPLIT ────────────────────────────────────────────────────────────────────
  // Speed is a PRODUCT, so log(vL/vS) is the SUM of the seven log-ratios: an exact additive split
  // of the leader's speed advantage into the seven named factors, averaged over the growing steps.
  const sums = new Float64Array(NF);
  let logTotal = 0;
  let logN = 0;
  // The same split for the leader against HIMSELF at baseline — which factor he changed.
  const selfSums = new Float64Array(NF);
  let selfN = 0;
  const selfSums2 = new Float64Array(NF);
  let selfN2 = 0;
  const baseLogMean = (idx) => {
    const out2 = new Float64Array(NF);
    const c = new Float64Array(NF);
    for (const j of baseIdx) {
      for (let f = 0; f < NF; f++) {
        const v = data[j][idx * W + f];
        if (Number.isFinite(v) && v > 0) {
          out2[f] += Math.log(v);
          c[f]++;
        }
      }
    }
    for (let f = 0; f < NF; f++) out2[f] = c[f] ? out2[f] / c[f] : NaN;
    return out2;
  };
  const baseMeanFactor = baseLogMean(L);
  const baseMeanFactor2 = baseLogMean(S2);
  for (const j of growIdx) {
    const oa = L * W;
    const ob = S2 * W;
    let t = 0;
    let ok = true;
    for (let f = 0; f < NF; f++) {
      const a = data[j][oa + f];
      const b = data[j][ob + f];
      if (!(a > 0) || !(b > 0)) {
        ok = false;
        break;
      }
      t += Math.log(a / b);
    }
    if (!ok) continue;
    for (let f = 0; f < NF; f++) sums[f] += Math.log(data[j][oa + f] / data[j][ob + f]);
    logTotal += t;
    logN++;
    let selfOk = true;
    for (let f = 0; f < NF; f++) {
      if (!(data[j][oa + f] > 0) || !Number.isFinite(baseMeanFactor[f])) selfOk = false;
    }
    if (selfOk) {
      for (let f = 0; f < NF; f++) selfSums[f] += Math.log(data[j][oa + f]) - baseMeanFactor[f];
      selfN++;
    }
    let selfOk2 = true;
    for (let f = 0; f < NF; f++) {
      if (!(data[j][ob + f] > 0) || !Number.isFinite(baseMeanFactor2[f])) selfOk2 = false;
    }
    if (selfOk2) {
      for (let f = 0; f < NF; f++) selfSums2[f] += Math.log(data[j][ob + f]) - baseMeanFactor2[f];
      selfN2++;
    }
  }
  out.logRatioSteps = logN;
  out.logRatioTotal = logN ? logTotal / logN : null;
  out.logRatioByFactor = Object.fromEntries(
    FACTORS.map((f, i) => [f, logN ? sums[i] / logN : null]),
  );
  out.leaderSelfLogByFactor = Object.fromEntries(
    FACTORS.map((f, i) => [f, selfN ? selfSums[i] / selfN : null]),
  );
  out.leaderSelfLogSteps = selfN;
  out.secondSelfLogByFactor = Object.fromEntries(
    FACTORS.map((f, i) => [f, selfN2 ? selfSums2[i] / selfN2 : null]),
  );
  out.secondSelfLogSteps = selfN2;

  // ── THE BRAKE AT THOSE FRAMES. The 56 px threshold is the brake's OWN allowance, so its firing
  // state there is part of the answer rather than a neutral marker.
  out.growthStepsBrakeEngaged = growIdx.filter((j) => rows[j].bEngaged).length;
  out.growthStepsBrakeBindingLeader = growIdx.filter((j) => rows[j].bBinding === L).length;
  out.growthStepsBrakeBindingAny = growIdx.filter((j) => rows[j].bBinding >= 0).length;
  out.growthMeanBrakeStrength =
    growIdx.reduce((s, j) => s + rows[j].bStrength, 0) / growIdx.length;
  out.growthMeanGovernorLeader =
    growIdx.reduce((s, j) => s + data[j][L * W + 6], 0) / growIdx.length;
  out.baseMeanGovernorLeader =
    baseIdx.reduce((s, j) => s + data[j][L * W + 6], 0) / baseIdx.length;

  // The plan's steering, as a rank question: the leader's DRAWN place against his live place.
  let liveRankSum = 0;
  for (const j of growIdx) {
    let rank = 1;
    const tL = data[j][L * W + 7];
    void tL;
    // live rank at that step = 1 + how many live racers were ahead of him PRE-step; the row already
    // knows the top two, so recompute from the stored advance is not possible — use the row's
    // leader/second identity, which is all the rank information this row carries.
    rank = rows[j].li === L ? 1 : rows[j].si === L ? 2 : 3;
    liveRankSum += rank;
  }
  out.growthMeanLiveRankLeader = liveRankSum / growIdx.length;
  out.growthStepsLeaderLeading = growIdx.filter((j) => rows[j].li === L).length;
  return out;
}

// ── RUN ─────────────────────────────────────────────────────────────────────────────────────────
const tracks = RD.loadTracks({ only: ONLY });
mkdirSync(OUT, { recursive: true });
const all = [];
const t0 = Date.now();
for (const geo of tracks) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const s = summarise(measureRace(geo, seed));
    all.push(s);
    process.stderr.write(
      `${geo.id} seed=${seed} max=${s.maxGapPxInWindow.toFixed(1)}px ` +
        `${s.isBreakaway ? (s.category ?? "?") : "-"} recon=${s.reconMismatch}/${s.sampled}\n`,
    );
    writeFileSync(join(OUT, `races-${ONLY ?? "all"}.json`), JSON.stringify(all, null, 1));
  }
}
process.stderr.write(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${OUT}\n`);
