// ============================================================
// tef.mjs — DORMANT EXPERIMENT (sim-only, flag-gated, NOT shipped).
// TEF ("target envelope feedback" v3): a rear-row start bonus that decays as the racer
// closes the tStart gap to Row-0. Off by default → contributes bit-exact 1.0 to the
// t-update and null to the construction bonus (byte-identical to a no-flag run).
//
// INFRA STEP 1c-1 — REFACTOR (not a move): the logic below is relocated verbatim from
// scripts/sim-fairness.mjs. The module READS race state passed in and RETURNS numbers;
// it never writes race state (the core owns every assignment). Flags:
//   --tefActive=true            enable
//   --tefBaseBonusOverride=<n>  rear-row construction bonus (null → TEF inert even if active)
//   --tefIsOpenOnly=false       also act on closed tracks (default: open only)
//   --tefAlpha / --tefMaxGap    vestigial v3 knobs (banner only; do NOT affect forces)
// ============================================================

export function createTefExperiment(argVal) {
  const active   = argVal('tefActive', null) === 'true';
  const alpha    = Number(argVal('tefAlpha', '0.03'));
  const maxGap   = Number(argVal('tefMaxGap', '0.015'));
  const openOnly = argVal('tefIsOpenOnly', 'true') !== 'false';
  const baseBonusOverride = argVal('tefBaseBonusOverride', null);
  const baseBonus = baseBonusOverride !== null ? Number(baseBonusOverride) : null;

  // The construction / mean / mult paths gate on this; initGap gates WITHOUT baseBonus!==null
  // (mirrors sim-fairness.mjs:782 vs :693/:1651/:1667 exactly).
  const appliesTo   = (isOpen) => active && baseBonus !== null && (!openOnly || isOpen);
  const initApplies = (isOpen) => active && (!openOnly || isOpen);

  const api = {
    active, alpha, maxGap, openOnly, baseBonus,

    // Construction ternary arm (sim-fairness.mjs:693-694). Returns the bonus this experiment
    // imposes, or null when it does not override (→ core falls through to the next arm).
    constructionBonus(isOpen, isRearRowOpen) {
      return (appliesTo(isOpen) && isRearRowOpen) ? baseBonus : null;
    },

    // Per-race initialGap setup guard + value (sim-fairness.mjs:782-786). Pure; core assigns.
    initApplies,
    initGap(r, tStartRow0) { return Math.max(0, tStartRow0 - r.tStart); },

    // Per-frame Row-0 mean t (sim-fairness.mjs:1650-1656). Reads racers, returns a number.
    meanT0(racers, isOpen) {
      if (!appliesTo(isOpen)) return 0;
      const row0Live = racers.filter((q) => q.startRowIndex === 0 && !q.finished);
      return row0Live.length > 0 ? row0Live.reduce((s, q) => s + q.t, 0) / row0Live.length : 0;
    },

    // Per-frame speed multiplier (sim-fairness.mjs:1666-1672). Bit-exact 1.0 when dormant.
    frameMult(r, meanT0, isOpen) {
      if (!(appliesTo(isOpen) && r.initialGap > 0)) return 1.0;
      const curGap   = meanT0 - r.t;
      const gapRatio = Math.max(0, Math.min(1, curGap / r.initialGap));
      const targetBonusMult = 1.0 + (r.initialSpeedBonusMult - 1.0) * gapRatio;
      return targetBonusMult / r.initialSpeedBonusMult;
    },
  };

  // In-code assertion of the dormant invariant: when off, frameMult is bit-exact 1.0
  // for any racer state (not merely "structurally 1.0").
  if (!active) {
    const probe = api.frameMult({ initialGap: 0.5, initialSpeedBonusMult: 1.2, t: 0.1 }, 0.3, true);
    if (probe !== 1.0) throw new Error(`TEF dormant invariant violated: frameMult=${probe} (expected 1.0)`);
  }

  return api;
}
