// ============================================================
// rowSplit.mjs — DORMANT EXPERIMENT (sim-only, flag-gated, NOT shipped).
// ROW_SPLIT ("strip-down" start-row speed-bonus phase envelope): re-weights each racer's
// start-row bonus by a per-phase strength s (early / pulk / post) following the live plan
// phase fractions. baseSpeed bakes in the FULL bonus (1+rawRowBonus); this corrects it to
// (1 + rawRowBonus·s)/(1 + rawRowBonus). Off by default → contributes bit-exact 1.0.
//
// INFRA STEP 1c-2 — REFACTOR (not a move): logic relocated verbatim from sim-fairness.mjs.
// Reads race state passed in; returns a number; writes nothing. Flags:
//   --rowBonusEarly / --rowBonusPulk / --rowBonusPost  per-phase strength (any present → active)
// ============================================================

export function createRowSplitExperiment(argVal) {
  const earlyRaw = argVal('rowBonusEarly', null);
  const pulkRaw  = argVal('rowBonusPulk', null);
  const postRaw  = argVal('rowBonusPost', null);
  const active = earlyRaw !== null || pulkRaw !== null || postRaw !== null;
  const early = Number(earlyRaw ?? '1');
  const pulk  = Number(pulkRaw  ?? '1');
  const post  = Number(postRaw  ?? '1');

  const api = {
    active, early, pulk, post,

    // Per-frame multiplier (sim-fairness.mjs:1663-1668). Bit-exact 1.0 when dormant.
    frameMult(r, raceProgress, pulkStartLive, pulkEndLive) {
      if (!(active && r.rawRowBonus > 0)) return 1.0;
      const s = raceProgress < pulkStartLive ? early
              : raceProgress < pulkEndLive   ? pulk
              :                                post;
      return (1 + r.rawRowBonus * s) / (1 + r.rawRowBonus);
    },
  };

  if (!active) {
    const probe = api.frameMult({ rawRowBonus: 0.1 }, 0.1, 0.25, 0.5);
    if (probe !== 1.0) throw new Error(`ROW_SPLIT dormant invariant violated: frameMult=${probe} (expected 1.0)`);
  }
  return api;
}
