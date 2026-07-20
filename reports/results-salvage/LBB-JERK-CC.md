# LBB-JERK — CC: why the overtaking lane-change still looks jerky, even at 0.005

Read-only. Author: CC. I did not read the Copilot file. Verified at source (`raceBehavior.js`,
`RaceScreen/index.jsx`, `drawing/racerRendering.js`, `storage/defaults.js`) and measured against the existing
`results/lbb-trace-3-2026-07-15/raw-nod.json` dump. What I ran, and why, is stated inline. No new sweep.

## What I ran

1. **Read the whole decision→pixel chain** (scope was explicitly wide): the fixed-timestep physics accumulator
   and the render-interpolation in `RaceScreen/index.jsx`, the draw path in `drawing/racerRendering.js`, and the
   lateral integrator in `raceBehavior.js`. Reason: three prior fixes all lived in the physics and failed, so I
   had to rule the renderer in or out first.
2. **Three targeted measurements on the existing dump** (no new run — the dump already has per-frame `physicalY`,
   `physicalYVelocity`, `branch` (pass/soft) and `targetUsed` for all 40 racers): (a) lateral-velocity
   sign-reversal rate; (b) branch-flip rate and per-frame `targetUsed` jump distribution during lateral motion;
   (c) a frame-by-frame print of the single longest sustained pass. Reason: to see the actual SHAPE of the
   motion rather than reason about it. Caveat carried throughout: this dump is the (d)-removed costume WITHOUT
   the launch-ramp or flip-glide; it shows the mechanism, not the exact current branch — see "what I did NOT
   check".

## 1. The cause, at source

**The lateral integrator has almost no inertia, so it reproduces every step-discontinuity in the steering
force as an instantaneous change in on-screen velocity. The jerk is in the TRANSITIONS, not the cruise.**

Two facts combine:

- **The integrator is nearly memoryless.** Each frame the lateral velocity is rebuilt as
  `lateralDamping · (previous velocity + force)`, with `lateralDamping = 0.16`. Only 16% of the previous
  velocity survives one frame; ~2.5% survives two. So the racer carries essentially no lateral momentum: its
  velocity each frame is ≈ 0.16 × the current spring force. A real inertial body would let momentum carry it
  smoothly through a brief change in force; here there is nothing to carry. The lateral velocity is a near-
  instantaneous follower of the force.
- **The force is full of steps.** The lateral spring's target and strength jump discretely at the events that
  bracket an overtake: the **onset** (the branch switches from soft steering, strength 0.03, to the pass spring,
  strength 0.5 — a ~16× strength step onto a target one contact-width to the side), the **end** (it drops back
  to soft), a **target re-aim** whenever the leader or the most-constraining neighbour moves or changes
  identity, and a **side flip**. A memoryless follower turns each of these into a one-frame velocity step —
  i.e. a jerk (a spike in the rate-of-change of acceleration).

The dump shows exactly this split:

- **A clean, sustained pass is smooth.** The longest single pass in the trace (racer 20, 97 consecutive pass
  frames) is a textbook exponential approach: the per-frame lateral step falls smoothly from its onset value to
  zero as it reaches the target, no stutter. So the machinery, left undisturbed, glides.
- **The abruptness is entirely at the transitions.** That same pass BEGINS with a ~10× one-frame jump in the
  lateral step (the soft→pass onset) and ENDS with the target snapping ~0.11 in a single frame (pass→soft). And
  across the field, per-frame `targetUsed` is smooth 82% of the time but has a hard tail — ~4% of lateral-active
  frames re-aim the target by ≥0.05, and ~3.4% by ≥0.15, in ONE frame. Each such re-aim, fed through the
  memoryless follower, is a visible snap.

So the perceived "jerk" is the population of these transition-snaps. The eye reads instantaneous velocity
changes as jerk regardless of how large the velocity is — which is the whole point of the next section.

**The renderer is not the cause** (I checked, because the brief said not to assume `raceBehavior.js`).
`RaceScreen/index.jsx` steps physics on a fixed 16 ms timestep and interpolates the racer's WORLD position
between the two bracketing steps (`renderInterpolation`, default on, verified reaching the draw path); the
sprite's facing is the track TANGENT, not its velocity, so a dodge does not rotate the sprite. The per-step
world-position snapshot and the lerp are textbook-correct. Interpolation smooths WITHIN a step; it cannot invent
momentum the physics never produced, so a physics velocity that steps at a transition still renders as a step.
The renderer faithfully shows a jerk that is authored upstream.

**Ranking.** The memoryless integrator is the ROOT enabler — it is what converts force-steps into visible
jerks; a normally-damped integrator would smear them into gradual velocity changes. The force-steps
(onset/end/re-aim/flip) are the triggers. The dominant single trigger for the OVERTAKE specifically is the
soft→pass onset step (it happens on essentially every pass — "almost always", in the Owner's words); the
re-aim tail and flips add the rest.

## 2. Why the three failed attempts failed — and why this explanation requires them to

A correct diagnosis must explain why cutting the speed cap 5.6× changed nothing perceptible. This one does,
because **the cap governs cruise speed, not the transitions where the jerk lives.**

- **Lowering `maxLateralSpeedPerStep` 0.028 → 0.005.** The cap clamps the peak per-frame step. But the jerk is
  the STEP CHANGE in velocity at a transition, not the velocity's magnitude. Onset still goes from ~0 to the
  (now smaller) value in one frame; the end still collapses to zero in ~2 frames (0.16 damping kills it almost
  instantly whatever the cap); every re-aim still snaps. Lowering the cap makes the jerks smaller in amplitude
  but exactly as abrupt in time — and abruptness, not amplitude, is what reads as jerky. (It also made cruise
  6× slower, which is why it now looks slow AND jerky rather than fast AND jerky.) Note too: most real dodges
  are spring-limited, not cap-limited — the pass spring only saturates 0.028 for moves larger than ~0.35
  physicalY — so for the common dodge the cap was barely the operative limit in the first place.
- **The launch ramp (`fix/lbb-launch-ramp`).** It softens ONE transition — a fresh onset — by ramping the cap
  up over five frames. But (a) it only bites when the onset would exceed one-fifth of the cap, so the many
  small-move onsets are untouched; and (b) it does nothing for the other three transition types (end, re-aim,
  mid-pass flip) or for a re-onset after a one-frame gate gap. The memoryless integrator still snaps at all of
  those. Smoothing one event out of four leaves the motion looking just as jerky.
- **Gliding the target on a side flip (`fix/lbb-glide-on-flip`).** It eases the target across a flip — one more
  single transition type. Same limitation: onset, end and re-aim churn still step, and the integrator still
  carries no momentum between them.

The through-line: **each fix smoothed one force-event's target/onset, but the integrator itself has no memory,
so every other force-event still snaps.** You cannot fix a per-event jerk by smoothing events one at a time
while the thing that converts events into jerks — the near-zero lateral inertia — is untouched.

## 3. What I did NOT check (marked, not filled in from memory)

- **I did not reproduce the Owner's exact on-screen jerk on `fix/lbb-launch-ramp` and tie a specific visible
  snap to a specific frame event.** My trajectory evidence is from the (d)-removed dump WITHOUT the ramp/glide.
  I am inferring that the same transition-snaps persist on the current branch because none of those branches
  touch the integrator's inertia; I did not trace the current branch to confirm it frame-for-frame. A short
  targeted trace on `fix/lbb-launch-ramp` (same seed, one overtaking racer) would confirm or refute this — I did
  not run it because the mechanism is visible in existing data and a new capture is a heavier step; flag it as
  the obvious next confirmation.
- **I did not measure the display/refresh interaction on the Owner's actual machine.** Render interpolation is
  on by default and correct in source, so I concluded the renderer is not the cause — but I did not verify the
  Owner has it enabled, nor his monitor's refresh vs the 62.5 Hz physics. If he has toggled `renderInterpolation`
  off in the Dev Screen, the position would snap at physics-step boundaries and beat against the display — a
  DIFFERENT, simpler cause. I consider this unlikely (default on) but did not confirm it for his session.
- **I did not isolate a single micro-twitching racer frame-by-frame** (see §4) — my twitch evidence is
  field-level, not a per-twitch trace.
- **I did not quantify the perceptual threshold** — i.e. prove that a one-frame velocity step of a given size is
  above the eye's jerk-detection threshold at the render frame rate. I am asserting abruptness reads as jerk;
  that is a standard perceptual fact, not something I measured here.

## 4. The micro-twitches — same cause, different (weaker) trigger

**Same root mechanism, different force source.** The micro-twitches ("extremely fast left-right, but not far")
are the same memoryless-follower behaviour applied to the SOFT-steering path rather than the pass path. Soft
steering aims one contact-width beside the most-constraining neighbour; in a dense pack that neighbour's
identity and position change frame-to-frame, so the soft target churns side to side. With no lateral inertia,
the racer's velocity immediately follows each churn. The amplitude is small because the soft spring is weak
(0.03 vs the pass spring's 0.5) — "not far" — but each reversal is immediate — "extremely fast left-right".

Supporting data (field-level, from the dump): soft steering is 85% of all lateral-active frames; the same
hard tail of large one-frame `targetUsed` re-aims that snaps the pass dodge also snaps the soft path (the
sustained pass above ENDED into exactly such a soft re-aim, ~0.11 in one frame). So the dodge-jerk and the
micro-twitch are two readings of one defect — a memoryless integrator faithfully reproducing a churning force
— at two force strengths. **Caveat:** I did not isolate one twitching racer and confirm the neighbour-identity
churn per frame; the causal link is consistent with the data and the mechanism, not directly traced.

## 5. Confidence

**Moderate-to-high on the mechanism; lower on "this is the ONLY thing the Owner sees".**

High that (i) the lateral integrator is near-memoryless (verified at source: 16% velocity retention per frame),
(ii) the renderer is not introducing the jerk (verified: correct per-step interpolation, tangent facing), and
(iii) clean sustained passes are smooth while transitions snap (measured directly). These three together
explain the cap-independence, which was the decisive test, and explain why three event-by-event fixes failed.

Lower that I have named the complete perceived phenomenon. I have not tied a specific on-screen snap on the
current branch to a specific frame event (§3), and "almost always too fast" could also carry a component I
have not separated — e.g. the onset step being genuinely large for real (bigger) overtake moves even before
any churn. If I had to spend one more step to raise confidence to high, it would be a short frame-level trace
of one overtaking racer on `fix/lbb-launch-ramp`, same seed, correlating each visible lateral snap to its
force event (onset / end / re-aim / flip) — that would either confirm the transition-snap account or expose a
residual I have missed. Ten hypotheses have died here; I am putting this one forward as a mechanism the data
supports and the cap-test corroborates, not as a certainty, and I have marked exactly what would settle it.

## Hygiene (reported separately, not folded into the findings)

- The `maxLateralSpeedPerStep` source comment (already corrected once this week to stop claiming the cap
  "caps the jump into a glide") is still an incomplete description of the feel model: the cap governs cruise,
  but nothing in the lateral model governs the RATE of velocity change at a transition. That the model has a
  position clamp and a speed clamp but no acceleration/jerk limiting is the structural gap behind this whole
  investigation; worth stating plainly wherever the lateral feel model is documented.
- `lateralDamping = 0.16` is labelled a damping constant but functions as a near-total per-frame velocity
  reset; its value sits two decades away from what "damping" usually implies (0.9-0.98). Anyone reading it as
  "gentle damping" will mis-model the lateral feel, as this investigation repeatedly did.
