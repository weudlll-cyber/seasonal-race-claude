# BATTLE-TRIGGER-RANGE-1 — fine-grained Pulk Closeness / Isolation control

**Base: `origin/master` @2cd3f65. Author: CC.** Presentation-only (a DevScreen slider re-scale); fingerprint
`ded0a126048e4cdb` stays IDENTICAL.

The battle-trigger proximity controls were too coarse for the dense COMBO15 field (Pulk Closeness stepped 0.5%
from a 1.0% floor), so both sliders now cover the sub-1% zone: **Pulk Closeness** (`battlePulkThresholdT`) range
**0.1%–2.0%**, and **Isolation** (`battleIsolationThresholdT`) range **0.0%–2.0%**, both step **0.1%**, one-decimal
display — the stored value stays a plain lap-fraction float (no unit change). Persisted in-range values load
unchanged, a stored value above 2.0% (e.g. the 5% default) has its slider thumb pin at the max while the display
still shows the true stored value and the config is preserved until the owner moves the slider, and defaults are
untouched so the shipped game is byte-compatible (fingerprint identical, 3332 tests green).

## TESTS (new `CameraAdvancedSection.test.jsx`, 5 tests)
Pulk Closeness slider min/max/step = 0.001/0.02/0.001 · Isolation = 0/0.02/0.001 · a persisted in-range value
loads exactly (0.005 → "0.5%", 0.012 → "1.2%") · display is one decimal ("0.1%", "2.0%") · a stored 0.05 (5%)
is preserved in the display ("5.0%").

## VERIFY
Fingerprint `ded0a126048e4cdb` IDENTICAL · full suite 162 files / **3332 tests green** · eslint + build clean.
(Owner: reload the Dev Screen → Camera Advanced → BATTLE; the Pulk Closeness / Isolation sliders now step in
0.1% increments across 0.1%–2.0%.)

## PROPOSALS (≥2)
1. **One-time heal of a persisted out-of-range value on the first slider move.** Today a stored 5% stays 5%
   until the owner drags the slider (then it snaps into ≤2%). If that surprises anyone, a tiny "reset to
   default" affordance next to the control (or a load-time clamp with a note) would make the transition
   explicit rather than implicit — but only if the owner wants it; the current preserve-until-touched behavior
   is the safest default.
2. **Surface the live battle-trigger evaluation in the camera HUD.** Since the owner is tuning Pulk Closeness
   for COMBO15, a HUD line showing the current top-10 max-gap vs the threshold ("closest 3: 0.8% ≤ 1.0% → would
   fire") would turn slider tuning into a measured loop instead of guess-and-watch, mirroring the LEADER-MINVIS
   HUD proposal.
3. **Add a matching fine-grained step to any sibling lap-% thresholds.** If other camera triggers (lead-change
   min gap, comeback start gap) are also stored as lap fractions and stepped coarsely, giving them the same
   0.1% granularity would keep the whole Camera Advanced panel consistent for the dense field.

---
**Presentation-layer only** (`CameraAdvancedSection.jsx` slider bounds + its new test). Shipped fingerprint
`ded0a126048e4cdb` unchanged.
