// ============================================================
// hero-adherence.mjs — HERO STORY-ADHERENCE observer (SWEEP support, read-only, POST-RACE).
//
// SIM-ONLY, read-only. Pure functions. Consumes the RAW per-hero observations the sim already emits
// under --hero-map (results.heroObs → hero-map.json `perHero`); it adds ZERO per-frame sim code. The
// runner calls it on the collected perHero array. WHAT it measures, per the sweep spec's hero item:
//
//   (a) resolves into its assigned final band  → uses `reachedTargetBand` (already in heroObs; the sim
//       computes it as bandOf(finalRank) === bandOf(targetRank)).
//   (b) trajectory adherence  → PROXY: `climbFrac` (share of frames still climbing toward target) and
//       `reachedTargetProg` (when it first reached its target rank). The FULL rank-vs-curve deviation
//       distribution is NOT computed here — the sim does not sample the authored curve per frame, and
//       adding that collection would enlarge the byte-identity surface (reported as an enhancement, not
//       built for this sweep). climbFrac + reachedTargetProg + peak depth are the honest proxy.
//   (c) role realized  → inferred from anchor vs target vs final rank (the generator does not tag role
//       in heroObs): a COMEBACKER (anchor behind target) must reach its target depth at peak AND finish
//       in band; a FALLER (anchor ahead of target) must drop into a deeper band AND finish in band.
//
// Window: the hero's live span [anchorProgress, finish], exactly the frames the sim's hero-map observer
// ran (from cast at pulkStart to the line). No pinned constant — anchorProgress is per-hero live data.
// ============================================================

// Rank margin (ranks) that separates a role from a "hold" (anchor ≈ target). A hero whose anchor and
// target ranks are within this many places is treated as a HOLD (no required direction). Lives here.
export const ROLE_MARGIN_RANKS = 2;

// heroRole: infer the authored role from anchor vs target rank. Rank 1 = front (lower is better), so
// anchor > target ⇒ must CLIMB (comeback); anchor < target ⇒ must DROP (faller).
export function heroRole(h, margin = ROLE_MARGIN_RANKS) {
  if (h.anchorRank == null || h.targetRank == null) return 'unknown';
  if (h.anchorRank - h.targetRank > margin) return 'comeback';
  if (h.targetRank - h.anchorRank > margin) return 'faller';
  return 'hold';
}

// roleRealized: did the hero actually play its role AND finish in its assigned band?
//   comeback → reached at least its target depth at peak (bestRank <= targetRank) and finished in band.
//   faller   → finished deeper than it anchored (finalRank > anchorRank) and finished in band.
//   hold     → finished in band.
export function roleRealized(h, role = heroRole(h)) {
  const inBand = h.reachedTargetBand === true;
  if (!inBand) return false;
  if (role === 'comeback') return h.bestRank != null && h.targetRank != null && h.bestRank <= h.targetRank;
  if (role === 'faller') return h.finalRank != null && h.anchorRank != null && h.finalRank > h.anchorRank;
  return true; // hold
}

// adherenceForHero: the per-hero record used by the aggregate + report.
export function adherenceForHero(h) {
  const role = heroRole(h);
  return {
    index: h.index,
    role,
    reachedTargetBand: h.reachedTargetBand === true,
    roleRealized: roleRealized(h, role),
    climbFrac: h.frames > 0 ? h.climbFrames / h.frames : null, // trajectory-adherence proxy (b)
    reachedTargetProg: h.reachedTargetProg, // when it reached target (null = never)
    bestRank: h.bestRank,
    anchorRank: h.anchorRank,
    finalRank: h.finalRank,
  };
}

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const rate = (a) => (a.length ? a.filter(Boolean).length / a.length : null);

// summarizeHeroAdherence: aggregate over a flat array of raw heroObs (across all races of a cell).
// Returns rates + means; every field is null when there is nothing to average (never NaN).
export function summarizeHeroAdherence(perHero) {
  const recs = (perHero ?? []).map(adherenceForHero);
  const byRole = (r) => recs.filter((x) => x.role === r);
  const round = (v) => (v == null ? null : +v.toFixed(4));
  return {
    nHeroes: recs.length,
    resolvedBandRate: round(rate(recs.map((r) => r.reachedTargetBand))), // (a)
    roleRealizedRate: round(rate(recs.map((r) => r.roleRealized))),      // (c)
    meanClimbFrac: round(mean(recs.map((r) => r.climbFrac).filter((v) => v != null))), // (b) proxy
    meanReachedTargetProg: round(mean(recs.map((r) => r.reachedTargetProg).filter((v) => v != null))),
    comeback: { n: byRole('comeback').length, realizedRate: round(rate(byRole('comeback').map((r) => r.roleRealized))) },
    faller: { n: byRole('faller').length, realizedRate: round(rate(byRole('faller').map((r) => r.roleRealized))) },
    hold: { n: byRole('hold').length, realizedRate: round(rate(byRole('hold').map((r) => r.roleRealized))) },
  };
}
