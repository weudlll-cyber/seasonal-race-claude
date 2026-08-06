// ============================================================
// physics-tax.mjs — PHYSICS TAX observer (GREENFIELD P0, read-only baseline measurement).
//
// SIM-ONLY, read-only. Same shape as the rest of the observer family (runaway-parade.mjs,
// release-contest.mjs, outcome-front-battle.mjs): the per-frame COLLECTION lives in the sim
// (it needs the advanceRacerT call site), the DEFINITIONS live here so they are testable in
// isolation and recoverable from the raw record alone.
//
// THE QUESTION (GREENFIELD-CC §8.3): how much of the natural speed band does live physics
// already eat? A composer that authors a schedule out of the full band has nothing left to
// absorb avoidance braking with, and will be shredded by the first busy corner. The reserve
// it must NOT spend is called sigma.
//
// THE FACTOR CHAIN (client/src/modules/raceStep.js advanceRacerT), in its fixed order:
//   dT = baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult · dt
// Two of those factors are the physics layer:
//   `brake` < 1  — avoidance / brake-to-match (a LOSS of longitudinal distance)
//   `boost` > 1  — drafting                    (a GAIN of longitudinal distance)
// Everything else is the racer's own natural + authored speed. So define, per frame:
//
//   vFree  = baseSpeed · rowEnvMult · trajectoryMult · areaBonusMult · governorMult · dt
//   vAppl  = vFree · boost · brake                       (what the racer actually advanced)
//   brakeLoss = vFree · boost · (1 - brake)              (what braking removed, at the boost in force)
//   draftGain = vAppl · (1 - 1 / boost)                  (what drafting added, at the brake in force)
//
// brakeLoss is exactly the counterfactual "how much further would it have gone this frame with
// brake = 1, holding every other factor". By construction vAppl + brakeLoss = vFree · boost, so
//
//   lostFrac = sum(brakeLoss) / sum(vAppl + brakeLoss)
//
// is "the fraction of the distance this racer would have covered that braking took away".
//
// NORMALISING TO THE BAND — what sigma actually is.
// The natural speed band is the re-roll spread: spreadFactor in [min/mean, max/mean], so a racer
// can sustain at most `bandHalfWidth` = (max/mean - 1) fractional speed above the field mean
// (~0.0813 at the shipped 0.00096/0.00113 base-speed config). A racer that loses a fraction
// `lostFrac` of its distance over the whole race must sustain +lostFrac of extra speed over the
// whole race to get it back. So
//
//   sigma_racer = lostFrac / bandHalfWidth
//
// is the SHARE OF BAND AUTHORITY the physics tax consumes — a pure number in [0,1] where 1.0
// means physics alone eats the entire band and no schedule is deliverable. This is the reserve
// a composer must hold back; it may spend at most band x (1 - sigma).
//
// UNIFORM vs CONCENTRATED (GREENFIELD-CC §8.3: "concentrated is easier to plan around; uniform
// is more expensive"). The per-decile profile answers it. `concentration` below is the ratio of
// the worst decile's loss rate to the race's mean loss rate: 1.0 = perfectly uniform, and the
// larger it gets the more the tax is a few bad places rather than a constant drag.
//
// TAIL LOSS is the last decile (progress 0.9 -> 1.0). It is the number that sets `p_last`, the
// last re-plan checkpoint: after the final re-plan there is no further correction, so tier
// delivery rests on the reserve absorbing whatever physics does in that window alone.
// ============================================================

// Number of progress deciles in the profile. 10 = the "per-10%-of-progress profile" the
// proposal asks for; kept as a named constant so the record is self-describing.
export const PHYSICS_TAX_DECILES = 10;

export const PHYSICS_TAX_DEFAULTS = {
  deciles: PHYSICS_TAX_DECILES,
  // A racer is counted as "braking this frame" when brake < 1 - eps. The eps guards float noise
  // only; the sim sets brake to exactly 1.0 when avoidance is inactive, so this is not a threshold
  // choice that could move the number.
  brakeEps: 1e-9,
};

/**
 * Per-race physics-tax tracker. Allocated ONLY when the observer flag is on; never mutates race
 * state and never reads anything but the numbers handed to sample().
 *
 * @param {{deciles?:number, brakeEps?:number}} [opts]
 */
export function makePhysicsTaxTracker(opts = {}) {
  const nDec = opts.deciles ?? PHYSICS_TAX_DEFAULTS.deciles;
  const brakeEps = opts.brakeEps ?? PHYSICS_TAX_DEFAULTS.brakeEps;
  // index -> accumulators. Map (not array) because racer indices are not guaranteed dense here.
  const per = new Map();

  const slot = (index) => {
    let a = per.get(index);
    if (!a) {
      a = {
        index,
        applied: 0, // sum vAppl        (distance actually covered)
        brakeLoss: 0, // sum brakeLoss    (distance braking removed)
        draftGain: 0, // sum draftGain    (distance drafting added)
        frames: 0,
        brakeFrames: 0,
        decApplied: new Array(nDec).fill(0),
        decLoss: new Array(nDec).fill(0),
      };
      per.set(index, a);
    }
    return a;
  };

  // FIELD GEOMETRY (P1 support): the measured density the inversion audit needs. Sampled once per
  // frame from the whole live field — the full-field spread (pole rank → last live rank) in racer
  // lengths and the field mean speed in lengths/second — accumulated as a mean over the race so the
  // audit's "mean adjacent-rank gap" and "field speed" are measured, not assumed. Pure sums.
  const geom = {
    spreadLenSum: 0,
    spreadFrames: 0,
    speedLenPerSecSum: 0,
    speedFrames: 0,
    nLiveSum: 0,
  };

  return {
    /**
     * One racer, one frame, called at the advanceRacerT call site with the EXACT factors that
     * call is about to use. `vFree` is the chain WITHOUT boost and brake (already x dt).
     */
    sample(index, raceProgress, vFree, boost, brake) {
      if (!(vFree > 0)) return;
      const a = slot(index);
      const vAppl = vFree * boost * brake;
      const loss = vFree * boost * (1 - brake);
      a.applied += vAppl;
      a.brakeLoss += loss;
      a.draftGain += vAppl * (1 - 1 / boost);
      a.frames++;
      if (brake < 1 - brakeEps) a.brakeFrames++;
      let d = Math.floor(raceProgress * nDec);
      if (d < 0) d = 0;
      if (d >= nDec) d = nDec - 1;
      a.decApplied[d] += vAppl;
      a.decLoss[d] += loss;
    },

    /**
     * One frame, whole-field geometry. `spreadLen` = pole→last live-racer gap in racer lengths;
     * `fieldSpeedLenPerSec` = mean live-racer speed in lengths/second this frame; `nLive` = live
     * count. Called once per frame by the sim, which owns the lap-aware length conversion. All three
     * are accumulated as race means. A frame with < 2 live racers contributes nothing to the spread.
     */
    sampleField(spreadLen, fieldSpeedLenPerSec, nLive) {
      if (nLive >= 2 && spreadLen > 0) {
        geom.spreadLenSum += spreadLen;
        geom.spreadFrames++;
        geom.nLiveSum += nLive;
      }
      if (fieldSpeedLenPerSec > 0) {
        geom.speedLenPerSecSum += fieldSpeedLenPerSec;
        geom.speedFrames++;
      }
    },

    /** Race-mean field geometry — the measured density the P1 audit consumes. */
    fieldGeom() {
      const meanSpread =
        geom.spreadFrames > 0 ? geom.spreadLenSum / geom.spreadFrames : null;
      const meanNLive =
        geom.spreadFrames > 0 ? geom.nLiveSum / geom.spreadFrames : null;
      const r6 = (x) => (x == null ? null : +Number(x).toFixed(6));
      return {
        meanFullSpreadLen: r6(meanSpread),
        meanNLive: r6(meanNLive),
        // Mean adjacent-rank gap = full spread / (live count - 1). The density the audit divides by.
        meanRankGapLen:
          meanSpread != null && meanNLive > 1
            ? r6(meanSpread / (meanNLive - 1))
            : null,
        meanFieldSpeedLenPerSec:
          geom.speedFrames > 0
            ? r6(geom.speedLenPerSecSum / geom.speedFrames)
            : null,
      };
    },

    /**
     * Raw per-racer record for this race. Fractions only — no band normalisation here, because
     * bandHalfWidth is a config of the run and belongs in the record's meta, not in every row.
     */
    result() {
      const r6 = (x) => +Number(x).toFixed(6);
      const perRacer = [...per.values()]
        .sort((a, b) => a.index - b.index)
        .map((a) => {
          const denom = a.applied + a.brakeLoss;
          const decLostFrac = [];
          for (let i = 0; i < nDec; i++) {
            const dd = a.decApplied[i] + a.decLoss[i];
            decLostFrac.push(dd > 0 ? r6(a.decLoss[i] / dd) : null);
          }
          return {
            index: a.index,
            lostFrac: denom > 0 ? r6(a.brakeLoss / denom) : 0,
            draftGainFrac: a.applied > 0 ? r6(a.draftGain / a.applied) : 0,
            brakeFrameShare: a.frames > 0 ? r6(a.brakeFrames / a.frames) : 0,
            decLostFrac,
          };
        });
      return { deciles: nDec, perRacer };
    },
  };
}

// ── Aggregation (pure; consumed by the driver script) ───────────────────────────────────────

const asc = (a, b) => a - b;
export const pctl = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort(asc);
  const i = Math.min(
    s.length - 1,
    Math.max(0, Math.ceil((p / 100) * s.length) - 1),
  );
  return s[i];
};
export const mean = (a) =>
  a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

/**
 * Turn a set of raw per-race records into the three answers P0 must produce:
 *   sigma      — the band share the physics tax consumes (distribution across racers)
 *   tail       — the last-decile loss rate (sets p_last and the tier-boundary widening)
 *   uniformity — is the tax a constant drag or a few bad places?
 *
 * @param {Array<{physicsTax:{deciles:number, perRacer:Array}}>} races
 * @param {number} bandHalfWidth  (BASE_SPEED_MAX / BASE_SPEED_MEAN) - 1
 */
export function summarizePhysicsTax(races, bandHalfWidth) {
  const lost = [];
  const draft = [];
  const brakeShare = [];
  const nDec = races.length ? races[0].physicsTax.deciles : PHYSICS_TAX_DECILES;
  // Decile loss rates pooled over every racer of every race.
  const decLost = Array.from({ length: nDec }, () => []);

  for (const rec of races) {
    for (const p of rec.physicsTax.perRacer) {
      lost.push(p.lostFrac);
      draft.push(p.draftGainFrac);
      brakeShare.push(p.brakeFrameShare);
      for (let i = 0; i < nDec; i++)
        if (p.decLostFrac[i] != null) decLost[i].push(p.decLostFrac[i]);
    }
  }

  const sigmaOf = (x) => (bandHalfWidth > 0 ? x / bandHalfWidth : null);
  const decileMeans = decLost.map((a) => (a.length ? mean(a) : null));
  const present = decileMeans.filter((x) => x != null);
  const overallMean = mean(lost);
  const worst = present.length ? Math.max(...present) : null;

  return {
    nRacers: lost.length,
    bandHalfWidth,
    // The tax itself, as a fraction of distance.
    lostFrac: {
      mean: mean(lost),
      p50: pctl(lost, 50),
      p90: pctl(lost, 90),
      p95: pctl(lost, 95),
      max: lost.length ? Math.max(...lost) : null,
    },
    // The same thing expressed as band authority consumed — this is sigma.
    sigma: {
      mean: sigmaOf(mean(lost)),
      p50: sigmaOf(pctl(lost, 50)),
      p90: sigmaOf(pctl(lost, 90)),
      p95: sigmaOf(pctl(lost, 95)),
      max: lost.length ? sigmaOf(Math.max(...lost)) : null,
    },
    draftGainFrac: { mean: mean(draft), p95: pctl(draft, 95) },
    brakeFrameShare: {
      mean: mean(brakeShare),
      p50: pctl(brakeShare, 50),
      p95: pctl(brakeShare, 95),
    },
    decileMeanLostFrac: decileMeans,
    // Last decile — the residual exposure after the final re-plan.
    tailLostFrac: decileMeans.length
      ? decileMeans[decileMeans.length - 1]
      : null,
    tailSigma: decileMeans.length
      ? sigmaOf(decileMeans[decileMeans.length - 1])
      : null,
    // 1.0 = perfectly uniform drag; higher = concentrated in a few places.
    concentration:
      worst != null && overallMean > 0 ? worst / overallMean : null,
  };
}
