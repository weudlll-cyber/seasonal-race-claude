# DOCS-TODO — Open-Track Overlap Rebuild

Append to this file as each step completes. Do NOT finalize until after Step 2
passes all gates. A docs-sync branch will land these changes once Step 2 is done.

---

## Step 1 implications (brake-to-match-and-hold)

### ARCHITECTURE.md

- **Brake mechanism change:** Replace the existing description of the fixed-5.5% speed brake
  (`speedBrakeFactor`) with the new brake-to-match model. The brake factor applied each frame
  is now `min(computeEffectiveBrakeFactor(...), r.brakeMatchFactor)` where `brakeMatchFactor`
  is a per-pair computed cap matching the leader's effective forward speed.

- **Leader effective speed formula:** Document the exact formula and the five multipliers:
  `baseSpeed × draftingBoost × trajectoryMult × areaBonusMult × rubberBandMult`. Note that
  the leader is never `avoidanceActive` (no brake term for the leader) by existing design.

- **Multi-leader rule:** When multiple leaders are in the brake zone simultaneously, the most
  constraining leader (lowest required cap) governs. Tie-break: first-found in pair-loop order
  (lower combined index pair).

- **Hold/release state model:** Document the four new per-racer fields (`brakeMatchLeaderIndex`,
  `brakeMatchFactor`, `brakeMatchFrames`, `brakeReleaseFrames`) and their semantics. Note the
  one-frame-lag cross-file pattern (written by `raceBehavior.js`, read by `index.jsx`).

- **Anti-trap mechanism:** Document the escape sequence: 90-frame hold limit → 15-frame forced
  release → 60-frame cooldown before re-lock. State that `brakeMatchFrames < 0` encodes
  escape/cooldown as a negative countdown.

- **Debounced release:** Document the 3-frame debounce on hold release (prevents false releases
  from single-frame gap events).

### defaults.js param block (PHYSICS PARAMETERS comment)

Add the six new params to the existing sweep documentation block:
- `speedMatchMinDifferential`, `speedMatchSafetyMargin`: jitter guard constants
- `brakeHoldTimeoutFrames`, `brakeHoldEscapeReleaseDurationFrames`,
  `brakeHoldEscapeCooldownFrames`, `brakeReleaseDebounceFrames`: anti-trap constants
- Note: these were NOT part of the 4020-race LHS sweep (that sweep preceded Step 1). They
  should be included in any future full physics resweep.

### BACKLOG or feature tracking

- **Step 1 done:** Brake-to-match-and-hold implemented (`1f43ee9`). Fairness regression
  on Luger Hill × dragon and Dirt Oval × dragon (both dragon-specific). STOP condition
  pending Step-2 resolution — expect Step 2 lateral escape to fix the back-row starvation.

- **Step 2 pending:** Avoid-first lateral commitment (proactive approach-zone lateral push,
  two-part side eligibility test). Design approved in report 05 (updated 2026-06-05). No code yet.

### LESSONS (candidate for engineering lessons doc)

- **Fixed-% brake cannot hold a faster trailer:** A 5.5% brake applied to a racer that is
  11–17% faster still leaves 5–11% speed excess. The brake slows the approach but cannot
  prevent pass-through. Confirmed by source analysis (report 04) and test coverage.

- **Step 1 without Step 2 creates starvation:** Brake-to-match without lateral escape traps
  faster comeback racers behind slow leaders, creating front-row bias. The brake-to-match +
  avoid-first combination is necessary — neither half alone is sufficient.

---

## Step 2 implications (to be filled after Step 2 passes)

*(Placeholder — fill after Step 2 is implemented and validated.)*

- Proactive approach-zone lateral push
- Two-part side eligibility test (adjacent clearance + forward clearance)
- Commitment stickiness and debounced re-evaluation
- Extended honest-body-width lateral trigger zone (Flag 1 from report 06)
- Updated sim instrumentation: `brakeMatchFailureCount`, `adjacentCollisionRate`
