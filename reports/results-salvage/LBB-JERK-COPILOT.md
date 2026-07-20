# LBB-JERK — Copilot diagnosis (read-only)

## Scope and constraints

This note is read-only and explains why overtaking lane-change can still look jerky even when `maxLateralSpeedPerStep = 0.005`.
No code changes, no fix proposals, no branch surgery.

## What I checked

1. Source path from decision to pixels:
- `client/src/modules/raceBehavior.js`
- `client/src/screens/RaceScreen/index.jsx`
- `client/src/screens/RaceScreen/drawing/racerRendering.js`
- `client/src/modules/storage/defaults.js`
- `client/src/modules/frameTimingConfig.js`

2. Existing trace artifacts for real flip cadence/context:
- `results/lbb-trace-3-2026-07-15/raw-nod.json`
- `results/lbb-trace-3-2026-07-15/REPORT.md`

3. Two focused read-only measurements (explicit):
- Measurement A (trace cadence): nearest-gate replay for racer 22 in `raw-nod.json`.
  Result: 8 dir flips over 484 evaluated frames, with 6 flips inside frames 2051..2080, median flip gap 7 frames, minimum gap 1 frame, and flip reasons only `onlyLeft/onlyRight`.
  Additional result: `takeFreeLane=false` on 393/484 evaluated frames; `takeFreeLane` toggled 7 times.
- Measurement B (cap-to-pixel conversion): derived lateral motion from cap values.
  `0.028 -> 0.005` is an 82.1% amplitude cut. For track widths 80..220 px, `0.005` implies only about 0.2..0.55 px per physics step (16 ms).

## Cause at source (ranked)

1. Fast regime switching in pass eligibility/free-side state, not raw lateral speed, is the dominant jerk source.
- In the pass path, direction can switch when the committed side closes (`onlyLeft/onlyRight`) and pass state can also drop out for brake frames.
- Existing trace cadence shows clustered flips (6 in 30 frames) and short flip gaps (down to 1 frame), i.e. high-frequency sign/regime changes.
- This creates visible "left-right-left" behavior even when each individual step is small.

2. Hard per-step cap + velocity synchronization produces cusp-like motion whenever direction changes.
- After spring+damping integration, step is hard-clamped to `effVLatMax` and `physicalYVelocity` is overwritten to the capped step.
- On sign changes, this yields non-smooth velocity transitions (piecewise/clipped profile), so motion reads as twitchy rather than gliding.
- Lowering the cap reduces step size but does not remove this nonlinearity.

3. Fixed-step physics cadence and catch-up limit preserve stepwise direction changes; render interpolation cannot hide decision-level toggles.
- Physics runs in fixed 16 ms steps with catch-up capped at 2 steps per rAF.
- Render interpolation linearly blends previous/current poses, but when direction/branch changes frequently, interpolation still presents a smoothed zigzag, not a true continuous glide.
- Therefore visual jerk persists as a cadence artifact of frequent policy/state changes.

## Why the three attempts under-delivered

### 1) Cap reduction to 0.005
- It primarily shrinks amplitude (confirmed: ~82% smaller per-step lateral movement).
- It does not reduce flip frequency or pass/brake regime toggling frequency.
- So the eye still catches direction reversals/cadence jitter, just at smaller displacement.

### 2) Launch ramp (`effVLatMax` ramp-in)
- It only affects fresh pass launch onset.
- It does not govern already-active oscillatory side changes in dense local traffic, and does not remove repeated side closures (`onlyLeft/onlyRight`).
- Therefore it can soften entry but not the dominant flip cadence once the local interaction loop starts.

### 3) Flip glide (target easing on detected side flip)
- It is conditional and scoped to specific flip detection context.
- It does not remove the underlying high-frequency free-side/availability toggling and pass-state drop/reacquire events.
- Net effect: some single-flip transitions can look softer, but clustered alternation still reads jerky.

## Micro-twitch: same mechanism or different?

Conclusion: mostly same family, with a different visual scale.

Evidence:
- Same family: both are driven by frequent side/regime reevaluation under local traffic closure, producing short-interval sign changes.
- Different scale: with `0.005`, per-step lateral displacement is subpixel-to-near-pixel on common widths, so what remains visible is less "big snap" and more high-frequency shimmer/twitch.
- Therefore micro-twitch is not a new independent mechanism; it is mainly the small-amplitude expression of the same cadence/flip mechanism.

## Explicitly not checked

- I did not run a new full simulation or sweep for the exact current owner repro scenario on this branch.
- I did not capture a fresh video-aligned trace at `0.005` with synchronized camera/HUD markers.
- I did not isolate camera-state transition contributions (battle/comeback/lead overlays) in a dedicated A/B run.
- I did not quantify perceptual thresholds by display refresh rate or monitor scaling.

## Confidence

Moderate-high for the ranked root cause ordering.

Reason:
- Source path is direct and consistent with observed behavior.
- Trace cadence evidence strongly supports high-frequency side/regime switching as the primary visual driver.
- Exact repro-scene weighting (camera mode, frame pacing, display conditions) was not re-measured in a fresh owner scenario, so residual uncertainty remains on contribution percentages.
