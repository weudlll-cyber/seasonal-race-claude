// ============================================================
// fairness-stats.mjs — INSTRUMENTS (observers). Read-only fairness statistics.
// PURE MOVE (INFRA STEP 1) out of scripts/sim-fairness.mjs — computation unchanged,
// character-for-character. These functions read race RESULTS and return numbers; they
// never touch race state. Depends only on BAND_EDGES (same source the race core imports).
// ============================================================
import { BAND_EDGES } from "../../../client/src/modules/racePlanner.js";

// ── Statistics ────────────────────────────────────────────────────────────────
/**
 * Aggregate fairness statistics over a series of races.
 *
 * @param {Array<Array<{startRowIndex,finalRank}>>} raceResults  one entry per race
 * @param {number} totalRows
 * @param {number[]|null} rowSizes  racer count per row; if null, uniform distribution assumed
 * @returns {{ nRaces, totalRows, rowStats, chiSq, df, pValue }}
 */
export function computeFairnessStats(raceResults, totalRows, rowSizes = null) {
  const nRaces = raceResults.length;
  const winsByRow = new Array(totalRows).fill(0);
  const ranksByRow = Array.from({ length: totalRows }, () => []);

  for (const race of raceResults) {
    const winner = race.reduce((best, r) =>
      r.finalRank < best.finalRank ? r : best,
    );
    if (winner.startRowIndex < totalRows) winsByRow[winner.startRowIndex]++;
    for (const r of race) {
      if (r.startRowIndex < totalRows)
        ranksByRow[r.startRowIndex].push(r.finalRank);
    }
  }

  // Weighted expected wins: proportional to row size; fall back to uniform if no sizes given
  const totalRacers = rowSizes
    ? rowSizes.reduce((s, v) => s + v, 0)
    : totalRows;
  const expectedWinsByRow = Array.from({ length: totalRows }, (_, i) =>
    rowSizes ? (nRaces * rowSizes[i]) / totalRacers : nRaces / totalRows,
  );

  const rowStats = Array.from({ length: totalRows }, (_, rowIdx) => {
    const ranks = ranksByRow[rowIdx];
    const n = ranks.length;
    const wins = winsByRow[rowIdx];
    const avgRank = n > 0 ? ranks.reduce((s, v) => s + v, 0) / n : null;
    const variance =
      n > 1 ? ranks.reduce((s, v) => s + (v - avgRank) ** 2, 0) / (n - 1) : 0;
    return {
      rowIndex: rowIdx,
      wins,
      winRate: wins / nRaces,
      expectedWinRate: expectedWinsByRow[rowIdx] / nRaces,
      n,
      avgRank,
      stdRank: Math.sqrt(variance),
    };
  });

  // Chi-square goodness-of-fit with weighted expectations
  const chiSq = winsByRow.reduce((s, obs, i) => {
    const exp = expectedWinsByRow[i];
    return exp > 0 ? s + (obs - exp) ** 2 / exp : s;
  }, 0);
  const df = totalRows - 1;
  const pValue = chiSqPValue(chiSq, df);

  return { nRaces, totalRows, rowStats, chiSq, df, pValue };
}

/**
 * Compute per-zone success rate using the real game zone boundaries (B1–B5)
 * from racePlanner.js getAreaBounds() with bonusStrengthMultiplier=2.0.
 *
 * @param {Array<{result: object[], targetRankMap: Map<number,number>}>} raceEntries
 * @returns {{ zones: object[], overall: object }}
 */
export function computeZoneSuccessRate(raceEntries) {
  const ZONES = [
    { zone: "B1", lo: 1, hi: 5, bonus: "+6%" },
    { zone: "B2", lo: 6, hi: 15, bonus: "+4%" },
    { zone: "B3", lo: 16, hi: 25, bonus: "+2%" },
    { zone: "B4", lo: 26, hi: 40, bonus: "±0%" },
    { zone: "B5", lo: 41, hi: Infinity, bonus: "−2%" },
  ];

  function getZoneIdx(rank) {
    for (let i = 0; i < BAND_EDGES.length; i++) {
      if (rank <= BAND_EDGES[i]) return i;
    }
    return BAND_EDGES.length;
  }

  const hits = [0, 0, 0, 0, 0];
  const total = [0, 0, 0, 0, 0];
  let overallHits = 0,
    overallTotal = 0;

  for (const { result, targetRankMap } of raceEntries) {
    for (const racer of result) {
      const targetRank = targetRankMap?.get(racer.racerIndex);
      if (targetRank == null) continue;
      const tz = getZoneIdx(targetRank);
      const fz = getZoneIdx(racer.finalRank);
      total[tz]++;
      overallTotal++;
      if (fz === tz) {
        hits[tz]++;
        overallHits++;
      }
    }
  }

  return {
    zones: ZONES.map((z, i) => ({
      ...z,
      hits: hits[i],
      total: total[i],
      rate: total[i] > 0 ? hits[i] / total[i] : null,
    })),
    overall: {
      hits: overallHits,
      total: overallTotal,
      rate: overallTotal > 0 ? overallHits / overallTotal : null,
    },
  };
}

// ── BS-1: Extended fairness statistics ─────────────────────────────────────────
// Adds: top-3-by-row screening, per-band Spearman ordinal trend (permutation p),
// within-band emergence metric, band-integrity gate, Holm/BH correction.

/**
 * Holm-Bonferroni step-down correction (controls FWER).
 * Use for confirmatory family: per-track × (top3-by-row + per-band ordinal).
 * @param {number[]} pValues raw p-values
 * @returns {number[]} adjusted p-values in the same order as input
 */
function holmCorrect(pValues) {
  const n = pValues.length;
  if (n === 0) return [];
  const idx = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const adj = new Array(n);
  let runMax = 0;
  for (let k = 0; k < n; k++) {
    runMax = Math.max(runMax, Math.min(1, (n - k) * idx[k].p));
    adj[idx[k].i] = runMax;
  }
  return adj;
}

/**
 * Benjamini-Hochberg step-up correction (controls FDR).
 * Use for exploratory drill-down outputs only — never for pass/fail decisions.
 * @param {number[]} pValues raw p-values
 * @returns {number[]} adjusted p-values in the same order as input
 */
function bhCorrect(pValues) {
  const n = pValues.length;
  if (n === 0) return [];
  const idx = pValues.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const adj = new Array(n);
  let runMin = 1;
  for (let k = 0; k < n; k++) {
    runMin = Math.min(runMin, Math.min(1, (n / (n - k)) * idx[k].p));
    adj[idx[k].i] = runMin;
  }
  return adj;
}

/** Convert values to average ranks (1-indexed; ties share the average rank). */
function rankArray(arr) {
  const sorted = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(arr.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1][0] === sorted[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[sorted[k][1]] = avg;
    i = j + 1;
  }
  return out;
}

function pearsonOfRanks(rx, ry) {
  const n = rx.length;
  if (n < 2) return 0;
  const mx = rx.reduce((s, v) => s + v, 0) / n;
  const my = ry.reduce((s, v) => s + v, 0) / n;
  let num = 0,
    dx2 = 0,
    dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - mx,
      dy = ry[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  return dx2 > 0 && dy2 > 0 ? num / Math.sqrt(dx2 * dy2) : 0;
}

/** Spearman rank-correlation coefficient. */
function spearman(xs, ys) {
  return pearsonOfRanks(rankArray(xs), rankArray(ys));
}

/**
 * Two-tailed permutation p-value for |Spearman r| (xs are shuffled).
 * Returns 1 when n < 4 (too few data points for a meaningful test).
 */
function spearmanPermP(xs, ys, observedR, nPerm, prng) {
  if (xs.length < 4) return 1;
  let count = 0;
  const pxs = [...xs];
  for (let p = 0; p < nPerm; p++) {
    for (let i = pxs.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      const tmp = pxs[i];
      pxs[i] = pxs[j];
      pxs[j] = tmp;
    }
    if (Math.abs(spearman(pxs, ys)) >= Math.abs(observedR)) count++;
  }
  return (count + 1) / (nPerm + 1);
}

/**
 * Band-integrity gate: non-inferiority check on zone success rate.
 * Flags OK iff pooledRate >= baselineRate − marginPP AND no per-track rate
 * is worse by more than 2 × marginPP relative to its track baseline.
 *
 * @param {number}   pooledRate       current pooled zone success rate (0–1)
 * @param {number}   baselineRate     rate at bandStrictness 1.0
 * @param {number[]} [trackRates]     per-track current rates (same order as trackBaselines)
 * @param {number[]} [trackBaselines] per-track baseline rates
 * @param {number}   [marginPP=0.02]  allowed drop as a fraction (0.02 = 2 pp)
 * @returns {{ ok: boolean, pooledOK: boolean, tracksFailed: number }}
 */
export function bandIntegrityOK(
  pooledRate,
  baselineRate,
  trackRates = [],
  trackBaselines = [],
  marginPP = 0.02,
) {
  const pooledOK = pooledRate >= baselineRate - marginPP;
  const tracksFailed = trackRates.filter((r, i) => {
    const base = trackBaselines[i] ?? baselineRate;
    return r < base - 2 * marginPP;
  }).length;
  return { ok: pooledOK && tracksFailed === 0, pooledOK, tracksFailed };
}

/**
 * Extended fairness statistics for bandStrictness sweep analysis.
 *
 * Each entry represents one racer in one race. Required fields:
 *   startRowIndex {number}      0-based row index
 *   finalRank     {number}      1-based final position
 *   targetBandIdx {number}      0-based band index (0=B1 … 4=B5)
 *   targetRank    {number|null} exact target rank (required for emergence metric)
 *   raceKey       {string}      unique race identifier (e.g. `${trackId}-${seed}-${raceIdx}`)
 *   trackId       {string}      track identifier (for per-track stratification)
 *
 * Callers mapping from rawData: raceKey = `${e.trackId}-${e.seed}-${e.raceIdx}`,
 * targetBandIdx = e.sollBereich - 1, targetRank = e.sollRank.
 *
 * @param {object[]} entries   per-racer per-race records (see above)
 * @param {number[]} rowSizes  racer count per row
 * @param {object}  [opts]
 * @param {number[]}  [opts.bandEdges]  split points; defaults to BAND_EDGES
 * @param {number}   [opts.nPerm=499]  permutations for Spearman p-value
 * @param {Function} [opts.prng]        PRNG for permutations; defaults to Math.random
 * @returns {{ pooled, perTrack, confirmatory, exploratory, anyConfirmatoryFlagged }}
 */
export function computeExtendedFairnessStats(entries, rowSizes, opts = {}) {
  const bandEdges = opts.bandEdges ?? BAND_EDGES;
  const nBands = bandEdges.length + 1;
  const nPerm = opts.nPerm ?? 499;
  const prng = opts.prng ?? Math.random;

  const totalRacers = rowSizes.reduce((s, v) => s + v, 0);
  const nRows = rowSizes.length;
  const trackIds = [...new Set(entries.map((e) => e.trackId ?? "unknown"))];

  // ── 1. Top-3-by-row (screening stat) ──────────────────────────────────────
  // NOTE: top-3 within a race are correlated — treat as a signal, not an independence proof.
  // Use per-band ordinal tests for confirmation.
  function computeTop3ByRow(subset) {
    const nR = new Set(subset.map((e) => e.raceKey)).size;
    const obs = new Array(nRows).fill(0);
    for (const e of subset) {
      if (e.finalRank <= 3 && e.startRowIndex < nRows) obs[e.startRowIndex]++;
    }
    const exp = rowSizes.map((sz) => (nR * 3 * sz) / totalRacers);
    let chiSq = 0;
    for (let i = 0; i < nRows; i++)
      if (exp[i] > 0) chiSq += (obs[i] - exp[i]) ** 2 / exp[i];
    return {
      obs,
      exp,
      chiSq,
      df: nRows - 1,
      pRaw: chiSqPValue(chiSq, nRows - 1),
      nRaces: nR,
    };
  }

  // ── 2. Per-band Spearman ordinal trend ─────────────────────────────────────
  // For each target band: tests whether start-row-index predicts within-band finishing position.
  // Permutation p avoids expected-cell-count assumptions that plague small-n chi-square cells.
  function computePerBandOrdinal(subset) {
    return Array.from({ length: nBands }, (_, bi) => {
      const band = subset.filter((e) => e.targetBandIdx === bi);
      if (band.length < 4)
        return { bandIdx: bi, n: band.length, r: null, pRaw: 1 };

      const byRace = new Map();
      for (const e of band) {
        if (!byRace.has(e.raceKey)) byRace.set(e.raceKey, []);
        byRace.get(e.raceKey).push(e);
      }
      const startRows = [],
        withinPos = [];
      for (const group of byRace.values()) {
        const sorted = [...group].sort((a, b) => a.finalRank - b.finalRank);
        sorted.forEach((e, pos) => {
          startRows.push(e.startRowIndex);
          withinPos.push(pos + 1);
        });
      }
      const r = spearman(startRows, withinPos);
      return {
        bandIdx: bi,
        n: band.length,
        r,
        pRaw: spearmanPermP(startRows, withinPos, r, nPerm, prng),
      };
    });
  }

  // ── 3. Within-band emergence metric ────────────────────────────────────────
  // Mean |Δ within-band position| between target-rank order and actual final-rank order.
  // ~0 at bandStrictness=1.0 (controller enforces exact rank); rises as strictness falls.
  // Matched by targetRank (unique per racer per race since targetRanks form a permutation).
  function computeWithinBandEmergence(subset) {
    return Array.from({ length: nBands }, (_, bi) => {
      const band = subset.filter(
        (e) => e.targetBandIdx === bi && e.targetRank != null,
      );
      if (band.length < 2) return { bandIdx: bi, n: 0, meanAbsDelta: null };

      const byRace = new Map();
      for (const e of band) {
        if (!byRace.has(e.raceKey)) byRace.set(e.raceKey, []);
        byRace.get(e.raceKey).push(e);
      }
      let totalDelta = 0,
        totalN = 0;
      for (const group of byRace.values()) {
        if (group.length < 2) continue;
        const byTarget = [...group].sort((a, b) => a.targetRank - b.targetRank);
        const byActual = [...group].sort((a, b) => a.finalRank - b.finalRank);
        const targetPos = new Map(
          byTarget.map((e, i) => [e.targetRank, i + 1]),
        );
        const actualPos = new Map(
          byActual.map((e, i) => [e.targetRank, i + 1]),
        );
        for (const [tr, tp] of targetPos) {
          const ap = actualPos.get(tr);
          if (ap != null) {
            totalDelta += Math.abs(tp - ap);
            totalN++;
          }
        }
      }
      return {
        bandIdx: bi,
        n: totalN,
        meanAbsDelta: totalN > 0 ? totalDelta / totalN : null,
      };
    });
  }

  // ── Pooled + per-track ─────────────────────────────────────────────────────
  const pooled = {
    top3: computeTop3ByRow(entries),
    ordinal: computePerBandOrdinal(entries),
    emergence: computeWithinBandEmergence(entries),
  };

  const perTrack = trackIds.map((tid) => {
    const sub = entries.filter((e) => (e.trackId ?? "unknown") === tid);
    return {
      trackId: tid,
      top3: computeTop3ByRow(sub),
      ordinal: computePerBandOrdinal(sub),
      emergence: computeWithinBandEmergence(sub),
    };
  });

  // ── 4. Multiple-testing corrections ────────────────────────────────────────
  // Confirmatory family: per-track × (top3 + per-band ordinal) — these tests drive pass/fail.
  // Holm controls FWER at α=0.05; a flagged test survives family-wise correction.
  const confirmatory = [];
  for (const tr of perTrack) {
    confirmatory.push({
      label: `${tr.trackId}|top3`,
      p: tr.top3.pRaw,
      trackId: tr.trackId,
      test: "top3",
      r: null,
    });
    for (const b of tr.ordinal) {
      confirmatory.push({
        label: `${tr.trackId}|B${b.bandIdx + 1}|ordinal`,
        p: b.pRaw,
        trackId: tr.trackId,
        test: "ordinal",
        bandIdx: b.bandIdx,
        r: b.r,
      });
    }
  }
  const holmAdj = holmCorrect(confirmatory.map((c) => c.p));
  confirmatory.forEach((c, i) => {
    c.pHolm = holmAdj[i];
  });

  // Exploratory: pooled + all confirmatory, BH-corrected (drill-down only — not for pass/fail).
  const exploratory = [
    { label: "pooled|top3", p: pooled.top3.pRaw },
    ...pooled.ordinal.map((b) => ({
      label: `pooled|B${b.bandIdx + 1}|ordinal`,
      p: b.pRaw ?? 1,
    })),
    ...confirmatory.map((c) => ({ label: c.label, p: c.p })),
  ];
  const bhAdj = bhCorrect(exploratory.map((e) => e.p));
  exploratory.forEach((e, i) => {
    e.pBH = bhAdj[i];
  });

  return {
    pooled,
    perTrack,
    confirmatory,
    exploratory,
    anyConfirmatoryFlagged: confirmatory.some((c) => c.pHolm < 0.05),
  };
}

/**
 * Synthetic validation (--selfcheck mode).
 * Builds synthetic race results and confirms the metrics fire on injected unfairness.
 *
 * Conditions:
 *   A) FAIR          — finalRank independent of startRowIndex → all tests clear after Holm.
 *   B) UNFAIR        — row order determines final rank → top-3 and ordinal flag.
 *   C) WITHIN-BAND   — band assignment proportional; within-band positions ordered by row →
 *                       ordinal flags; zoneSuccessRate stays 100%.
 */

function chiSqPValue(x, k) {
  if (k <= 0 || x < 0) return 1;
  const mu = 1 - 2 / (9 * k);
  const sig = Math.sqrt(2 / (9 * k));
  const z = ((x / k) ** (1 / 3) - mu) / sig;
  return 1 - normalCDF(z);
}

// Abramowitz & Stegun normal CDF approximation (max error 7.5e-8)
function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const phi = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  return z >= 0 ? phi : 1 - phi;
}

// ── Report generation ─────────────────────────────────────────────────────────

// Re-export the internal helpers the race core references directly.
export { spearman, chiSqPValue };
