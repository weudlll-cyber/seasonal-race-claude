# LBB-CONCEPT — no zigzag AND no pointless brakes (read-only design review)

*Two INDEPENDENT concepts (CC's, then Copilot's — not deferring to CC). Deliberately NOT converged: the
Owner is comparing three concepts (Plan-Claude writes a third separately). No code, no commits. Every claim
below verified at source (`raceBehavior.js`) — this brief has been wrong before by reading a comment.*

---

## STEP 0 — measurement (done first, both concepts design against THIS)

Method: 2 open + 2 closed tracks × default racer, 50 races, 60 s, seed=1, `--jobs=8`. "WITH (d)" and
"WITHOUT (d)" were measured on the **diag branch** by toggling only the `&& vLatToward >= 0` in the gate,
with the diagnostics intact. Equivalence proven by fingerprint: **WITH (d) → `fa4e3796e1e5f1a5` = master**;
**WITHOUT (d) → `0259ea6c3e75efc3` = `fix/lbb-remove-lateral-progress` (b11230c)**. So these are exactly the
two branches the Owner compared. (btd = `brakeThenDodge`; zigzag = `zigzagScore`; overlap = `honestOverlapRate`.)

| Track | zigzag WITH(d) | zigzag WITHOUT(d) | Δ zigzag | overlap WITH(d) | overlap WITHOUT(d) | btd count WITH→WITHOUT | btd median frames WITH→WITHOUT |
|---|---:|---:|---:|---:|---:|---:|---:|
| river-run (open) | 0.000068 | 0.000099 | **+46%** | 3.54% | 3.54% | 1335 → 2941 | 43 → **2** |
| mountainstreet (open) | 0.000032 | 0.000051 | **+59%** | 1.99% | 1.93% | 1791 → 4682 | 35 → **2** |
| dirt-oval (closed) | 0.000057 | 0.000078 | **+37%** | 3.08% | 3.02% | 2369 → 6759 | 50 → **2** |
| searound (closed) | 0.000039 | 0.000095 | **+144%** | 4.61% | 4.62% | 1415 → 3955 | 41 → **2** |

Three facts every concept must honour:

1. **The zigzag is real and it scales.** `zigzagScore` rose on all four tracks (+37% to +144%, searound
   worst). This is the Owner's symptom 1, now a number with a target: a fix must bring it back **at or
   below the WITH(d) column**.
2. **Removing (d) did NOT raise overlap — the safety claim HOLDS empirically.** `honestOverlapRate` is
   flat within noise (two tracks slightly *down*: mountainstreet 1.99→1.93, dirt-oval 3.08→3.02; two flat).
   (d) was not protecting against penetration — (a)'s lag margin is. This is the empirical check the brief
   demanded, and it passed. Any concept that "restores safety by restoring (d)" is arguing against the data.
3. **The long pointless brakes are gone; the metric now measures the zigzag instead.** btd *median braked
   frames* collapsed 35–50 → **2** everywhere — the ~0.6–0.8 s wasted brakes (requirement 2) are genuinely
   fixed. But btd *count* ROSE 2–3×. Reading these together: removing (d) eliminated the long waste but
   introduced many 2-frame brake→dodge flickers — i.e. the btd count is now a second reading of the zigzag,
   not of the original waste. **Use median-braked-frames for requirement 2 and `zigzagScore`/btd-count for
   symptom 1.** A concept that drives btd count down by *re-lengthening* the brakes would be a regression.

Artifacts (gitignored): `results/lbb-withd/`, `results/lbb-nod/`, `client/tmp/{withd,nod}-<track>/`.

---

## Source verification (shared, factual — attacked, not taken on trust)

| Claim | Source | Verdict |
|---|---|---|
| `chooseGeometricDirection` is memoryless — any crossing of the leader's `physicalY` flips the side | raceBehavior.js:266–270 (`self.physicalY < other.physicalY ? -1 : > ? +1 : tieBit`) | **TRUE** |
| The pass side-choice uses that memoryless function for the both-sides-free case | `chooseFreeLaneDir`:310–311 → `chooseGeometricDirection` | **TRUE** |
| The `passLeaderIndex`/`passDir` latch is the only memory, and it is LEAKY | Written only when `_passCandidate` exists (830–832); the `else` branch clears it to -1/0 (843–844) on ANY frame the gate does not fire | **TRUE** — one non-firing frame wipes the commitment |
| (d) was de-facto hysteresis, not safety | Removing it did not raise overlap (STEP 0), and "only dodge the way you're already moving" is self-consistent frame to frame | **TRUE** (safety via STEP 0; hysteresis via the zigzag rise) |
| The file ALREADY has the anti-flip mechanism — but only on the soft-steering path | §4a soft target uses a **deadband**: `dir = |rel| >= softSteeringHysteresisY(0.04) ? sign(rel) : pairTieDir(self,obstacle)` (691–695). `pairTieDir` (210–215) gives a pair a STABLE opposite-sides split | **TRUE** — the pass path (`chooseFreeLaneDir`) does NOT use this deadband |
| Snap: the pass target is UN-eased and the strong spring saturates the vLatMax cap from rest | Pass target `smoothLaneTarget(...,0)` (840, easeMs=0, deliberately — "easing the pass target inflated overlap"); spring 0.5 (833); net step clamped to `vLatMax` 0.028 and velocity SET to it (877–881). The soft path IS eased (`laneTargetEaseMs` 200, line 855) | **TRUE** |
| `lateralDamping` 0.16 → `physicalYVelocity` ≈ last frame's ambient force, read before the pass spring | defaults.js:425; velocity `(v+delta)*0.16` (860) in apply-deltas, AFTER the gate reads it (551) | **TRUE** |

**One correction to the brief's framing:** the brief says (d)'s "comment claims it is a non-penetration
coupling, which it is not." Confirmed — but note the file lists it as coupling **(c)** in the comment block
(469–489), while the gate EVALUATES it as the 4th condition. The comment's coupling order ≠ the gate order.
A reader patching "condition (d)" must map this or edit the wrong line. (Reported; the merged fix branch
already corrects this comment.)

---

## CONCEPT A — CC

### Q1 — Why the zigzag (established at source)
Inside the pass path, once the trailer is level with its leader (`physicalY ≈ leader.physicalY`, the norm
when tucked in behind), `chooseFreeLaneDir` falls to `chooseGeometricDirection`, which flips the chosen
side the instant `physicalY` crosses the leader's by any epsilon. The latch that should hold the side is
**leaky**: any frame the gate does not fire (the trailer momentarily clears the same-lane filter, or (a)/(b)
blips) clears `passLeaderIndex`, so the next re-entry re-chooses the side geometrically — and flips. (d)
suppressed this because it additionally required the velocity to already point at the chosen side, which is
frame-to-frame self-consistent; remove it and the memoryless choice is exposed. **Loop: the pair loop
`chooseFreeLaneDir` + the apply-deltas latch clear (843).** The brief's reading survives falsification.

### Q2 — Why the snap
The pass target is set with `easeMs=0` (un-eased, by design — easing it historically inflated overlap), and
the 0.5 spring against a body-width target produces a step that exceeds `vLatMax` from a standstill, so the
integrator pins the step to `±vLatMax` and SETS velocity to it. Result: the lateral move starts at full cap
speed on frame 1 — a constant-velocity slab, no ease-in. With (d), the pass only committed once the trailer
was already gliding the right way (ambient), so the visible onset predated the commit and looked gradual.
**Verified — replacing the brief's "spring saturates from rest" with the precise cause: un-eased onset +
cap-saturation, made visible because the pass now fires from rest.**

### Q3 — Which existing mechanism already solves side-commitment, and why it is not enough
The **§4a soft-steering deadband** (`softSteeringHysteresisY` 0.04 + `pairTieDir`) already solves exactly
this for the soft-steering path: within 0.04 of the obstacle's centreline the side does not flip; it holds a
stable pair-split. And the **latch** was built to hold the pass side. Neither is enough today because: (i)
the pass path never calls the deadband — `chooseFreeLaneDir` uses the raw memoryless `chooseGeometricDirection`;
(ii) the latch is leaky (cleared on any non-firing frame, 843). So the anti-zigzag machinery exists in the
file but is not wired into the pass side-choice.

### Q4 — Smallest design (all four requirements)
Two small changes, both REUSING existing mechanisms, no new decision logic:
- **Wire the existing soft-steering deadband into the pass side-choice.** The pass path should choose its
  side with the SAME hysteresis the soft path already uses (`softSteeringHysteresisY` 0.04 + `pairTieDir`):
  within the deadband of the leader's centreline, keep the stable pair-split rather than flipping. Reuses a
  tuned constant — no new knob. Kills the memoryless flip (requirement 1) without touching (a)/(b)/(c), so
  non-penetration is unchanged (requirement 3, empirically confirmed flat in STEP 0).
- **Make the latch non-leaky.** Hold the committed `passDir` across brief gate misses instead of clearing it
  the first non-firing frame — mirror the brake-to-match **release debounce** (`brakeReleaseFrames`,
  899/945–951) that already exists for exactly this "don't drop a commitment on a one-frame blip" purpose.
  A short hold (a handful of frames) reuses that pattern; argue it is a CONSTANT (like `brakeReleaseDebounceFrames`
  3), not a DevScreen knob.
- **Snap:** give the pass ONSET a brief ease WITHOUT easing the safety commit — ramp `vLatMax` over the
  first few frames of a fresh pass (a soft launch) so the move accelerates into the cap instead of starting
  at it. This touches FEEL only (the cap already guarantees the clear-in-time math via `dTStart`), and it
  avoids the overlap regression the code comment warns about (which came from easing the *target*, not the
  launch speed). Requirement 4.

Cost/displacement: the deadband makes the trailer commit to ONE side and hold it — it will no longer take
the "instantaneously optimal" side each frame, which is the point. It slightly delays a genuine side-switch
when a third racer forces one (acceptable: (c) still re-checks freedom every frame, so a truly blocked side
still re-engages the brake). No new knobs (reuses `softSteeringHysteresisY`, the debounce pattern, `vLatMax`).

### Q5 — Verification (before build)
Re-run STEP 0's sweep. **Success:** `zigzagScore` ≤ the WITH(d) column on all four tracks; btd median-braked-frames
stays ≈2 (the waste stays fixed); btd count falls back toward the WITH(d) magnitude (the flicker is gone);
`honestOverlapRate` ≤ the WITHOUT(d) column (no penetration cost); then the full re-gate (band-reach ≥70%,
0 Holm-unfair). **Failure:** zigzag still above WITH(d); median-braked-frames climbs back toward 35–50 (brakes
re-lengthened); overlap rises above WITHOUT(d); or fairness regresses. Fairness cost is real and unavoidable:
any `raceBehavior.js` change moves the fingerprint off `fa4e3796e1e5f1a5` and needs the full re-gate.

### Q6 — Is DON'T-FIX honest?
No. The zigzag is real and scaled, the safety concern is empirically retired, and the fix is *reuse* of
mechanisms already in the file, not new machinery. DON'T-FIX would ship a known regression OR revert to the
known pointless-brake. It becomes the honest answer only if the deadband+latch cannot get `zigzagScore` back
to the WITH(d) baseline without a new knob — measure before concluding that.

**CC verdict:** BUILD — reuse the §4a deadband + a non-leaky latch for the pass side-choice, plus a soft
launch for the onset. Keep (d) removed (its de-facto hysteresis is replaced by the *correct* mechanism, which
does not gate on luck).

---

## CONCEPT B — Copilot (independent; does not defer to CC)

### Q1 — Why the zigzag
Agreed the flip is memoryless, but attack the location: the pass path is not the ONLY memoryless side-choice
in the file — the §4b overlap resolver (730–732) also uses `chooseGeometricDirection`. Could the zigzag be
soft-steering oscillation that (d) merely masked? STEP 0 falsifies that: `zigzagScore` rose *specifically*
when (d) was toggled, nothing else changed, so the driver is the pass path. **But the true root is the
DESIGN INTENT that was never delivered: the latch was explicitly built to be the anti-zigzag hold (its
comment at 296–301 says so), and it simply does not work — it is cleared every non-firing frame.** So this
is not "add a missing mechanism," it is "the intended mechanism is broken." That framing points at a smaller
fix than CC's.

### Q2 — Why the snap
Attack the brief's "spring fires from rest and saturates the cap." The cap ALWAYS clamps a strong pass step,
with or without (d) — so cap-saturation cannot be what (d) changed. What (d) changed is WHEN the pass starts:
from rest vs mid-glide. So the snap is not a force problem, it is a **launch-timing** problem — the move
begins at full cap velocity with zero ramp. That means the snap fix is orthogonal to the zigzag fix and must
not be conflated with it. Verified: the target easing the code comment forbids is a red herring here; the
issue is the first-frame velocity step, not the target discontinuity.

### Q3 — Existing mechanism, and why not enough
The **latch is the intended mechanism** and it is the answer — it is just leaky. `chooseFreeLaneDir` already
honours `passDir` when the leader matches and the side is still free (306–309); the only defect is that the
apply-deltas loop clears `passLeaderIndex`/`passDir` on every frame `_passCandidate` is absent (843). The
soft-steering deadband (CC's pick) is a SECOND, different mechanism; adding it to the pass path is more
surface than repairing the one that was designed for this job.

### Q4 — Smallest design (independent of CC)
**Repair the latch; do not add a deadband.**
- **Stop the latch leaking.** Persist `passDir`/`passLeaderIndex` across brief gate misses (do not clear on
  the first absent frame; clear only after a short debounce or when the leader is genuinely gone), reusing
  the brake-to-match release-debounce pattern already in the file. Once the trailer has committed a side, it
  holds it — that is the whole anti-zigzag contract, delivered by the mechanism built for it. Requirement 1.
- **Snap: a soft launch, not target easing.** Ramp the pass lateral speed over the first few frames (or
  equivalently ramp `vLatMax` for a fresh pass) so the onset accelerates instead of stepping to cap speed.
  Explicitly NOT the target-ease the comment warns against. Requirement 4.
- Requirement 2 is already met by removing (d) (median-braked-frames 2); requirement 3 is empirically met
  (overlap flat). So the ONLY new work is latch-repair + soft-launch.

**Independent divergence from CC — a second candidate to weigh, not merge:** instead of removing (d) and
repairing the latch, consider **fixing (d) rather than deleting it** — judge (d) on the velocity the pass
spring WILL produce (post-force), not last frame's ambient one. That keeps (d)'s frame-to-frame
self-consistency (which IS the hysteresis) while removing the luck-gating, so it could fix zigzag AND
pointless-brakes at the SAME site with no new mechanism. Risk: it couples the gate to the apply-deltas force
model (a duplication the project has paid for before), so it is only admissible single-sourced. Copilot
flags this as the higher-upside/higher-risk option; the latch-repair is the lower-risk one.

Cost/displacement: latch-repair makes a committed pass "sticky" — a trailer briefly holds a side even as
geometry wobbles, which is the desired behaviour but will occasionally hold a side half a beat longer than a
per-frame-optimal choice. No new knobs (a debounce constant, like the brake one).

### Q5 — Verification (before build)
Same sweep as STEP 0. **Success:** `zigzagScore` ≤ WITH(d) on all four tracks AND btd median-braked-frames
stays ≈2 AND btd count returns toward WITH(d); `honestOverlapRate` not above WITHOUT(d). Then the full
re-gate (band-reach ≥70%, 0 Holm-unfair) — mandatory, the fingerprint moves. **Additional Copilot guard:**
because latch-stickiness can hold a stale side, add a check that btd count does not *undershoot* by trapping
trailers on a now-worse side (watch `stableOvertakes` and the everFaster `dodged` rate do not fall). **Failure:**
zigzag above WITH(d); overlap up; fairness down; or overtakes fall (stickiness trapping racers).

### Q6 — Is DON'T-FIX honest?
Partly defensible, and it must be said: (d)'s removal is already the highest-risk edit in this subsystem, and
the SECOND edit (latch or predicted-(d)) compounds fingerprint churn and re-gate cost for a FEEL issue on a
small population. If the Owner's tolerance for the current master (long pointless brakes) is higher than for
the fix branch (zigzag), the honest interim answer is **do not merge the fix branch, keep master, and fix
the latch on a fresh branch only if the eye-test on the latch-repair is clearly better** — never ship the
bare (d)-removal that STEP 0 shows regresses zigzag. Copilot's bar: no merge until ONE branch shows
zigzag ≤ WITH(d) by eye AND by `zigzagScore`.

**Copilot verdict:** BUILD, but as a LATCH REPAIR (the intended mechanism, minimal), not a new deadband;
hold the predicted-(d) option as a higher-risk alternative; and gate hard on `zigzagScore` returning to
baseline before any merge — the bare (d)-removal must not ship.

---

## Where the two concepts differ (for the Owner's comparison — deliberately NOT resolved here)

- **CC** adds the §4a hysteresis deadband to the pass side-choice AND repairs the latch (two mechanisms).
- **Copilot** repairs ONLY the latch (the mechanism designed for this), and floats "fix (d) instead of
  deleting it" as a distinct alternative.
- Both agree: safety is empirically fine (overlap flat), the snap is a launch-timing issue fixable by a soft
  launch (not target-easing), requirement 2 is already met, and no new DevScreen knob is needed. Both refuse
  to ship the bare (d)-removal as-is.

## Hygiene found (reported, not folded in)
- The (d) coupling-comment numbering mismatch (comment (c) vs gate 4th) — corrected on the merged fix branch.
- `chooseGeometricDirection` is used memoryless in BOTH the pass path and the §4b overlap resolver; only §4a
  has the deadband. Whether §4b wants the same deadband is a separate question, out of scope.
- Out of scope (per brief): `noWindowEver`, `maxLateralSpeedPerStep`/`dTStart` tuning, the `blockedSlower`
  half, the dead `0.35` `lateralDamping` fallback.

---

## Copilot adjudication (GPT-5.3-Codex, source read on 2026-07-15)

Scope note: this section is independent of the earlier text in this file, including the section labeled
"Concept B — Copilot". I do not treat that section as mine. I disagree with its main prescription
("latch repair only"). The latch is real but not the root. The geometric off-switch loop is the root.

### 1. Verdict

Verdict: Diagnosis 2 is the primary diagnosis. Diagnosis 1 is a secondary amplifier, not the root.

What I checked in source:
- The pass target is built from `lbHalfSpan * (1 + softSteeringClearancePct)` in `applyRacerBehavior` and
  written as `targetY = leader.physicalY + dir * offsetY` (identifier: `offsetY`, `targetY`).
- The same-lane gate uses `Math.abs(dY) < brakeSameLaneY` where `brakeSameLaneY` is also built from
  `brakeContactWidth` through `pxToPhysicalY` (identifier: `brakeSameLaneY`).
- `lbHalfSpan` is built from the same `brakeContactWidth` through the same `pxToPhysicalY` conversion
  (identifier: `lbHalfSpan`).
- With default `softSteeringClearancePct: 0.0` (in defaults), pass target offset equals same-lane threshold.
- `_passCandidate` is produced only inside the brake-zone/same-lane branch, then consumed once in the apply
  loop; absent candidate clears `passLeaderIndex/passDir` immediately (identifiers: `_passCandidate`,
  `passLeaderIndex`, `passDir`).

Adjudication:
- Diagnosis 2 geometric claim is correct and load-bearing: default pass commit aims at the exact boundary of
  the branch that created it. When that boundary is reached, the pass branch naturally stops producing a
  candidate, latch clears, normal soft steering resumes, and the racer is pulled back toward lane/home target.
- Diagnosis 1 is also correct that the latch is leaky and `chooseGeometricDirection` is memoryless. But a
  stronger latch alone does not remove the boundary off-switch loop; it only controls which side is reused
  on re-entry.

Third reading (better causal layering):
- Root cause: geometric self-extinguish at zero clearance margin (Diagnosis 2).
- Amplifier: immediate latch clear on first non-candidate frame (Diagnosis 1).
- Visual symptom split: with (d) present this loop appears as brake stalls; without (d) it appears as
  repeated dodge flicker/zigzag.

### 2. Mechanism of the snap

Hypothesis tested: un-eased pass target plus strong pass spring from rest immediately saturates lateral cap.

Result: mostly true, with one addition.
- True part: pass branch uses `smoothLaneTarget(..., 0)` by design (no target easing), then applies
  `lookBeforeBrakePassStrength` default 0.5; integration then clamps net lateral step to `vLatMax`
  (`maxLateralSpeedPerStep` default 0.028) and writes velocity to that capped step.
- Added mechanism: branch toggling itself contributes to perceived snap. The pass branch runs decisive,
  uneased commit dynamics; the non-pass branch reverts to soft-steering/home dynamics. Fast alternation
  between those two regimes produces a visible flick/read as "snap" even when each branch is internally
  consistent.

Conclusion: snap is not a mystery force bug. It is expected from binary regime switching plus hard
first-frame commit speed.

### 3. Which existing mechanism already solves this

Required mechanisms evaluated:
- `softSteeringClearancePct`: ruled in as the key existing mechanism for the root loop. It already exists,
  defaults to 0, and directly controls whether pass target sits on the gate boundary or beyond it.
- `passLeaderIndex/passDir` latch: ruled in as a stabilizer only. Necessary for side persistence, not
  sufficient for the off-switch loop.
- `softSteeringHysteresisY` + `pairTieDir`: ruled out as primary fix. Useful for memoryless side ties, but
  it does not change branch extinction geometry.
- `smoothLaneTarget` / `laneTargetEaseMs`: ruled out for pass commit itself by existing source rationale and
  prior overlap regressions; can be used for non-safety return feel, not as the core fix.
- `stablePairBit`: ruled out as root fix; deterministic tie-break only.
- `vLatMax` cap: ruled in as snap shaper only; not root loop control.

Better third answer: the existing mechanism that solves the root is not new latch logic; it is existing
clearance margin (`softSteeringClearancePct`) applied so pass commitment does not terminate exactly at its
own trigger boundary.

### 4. Concept (WAS-level) for all four requirements

Concept name: Margin-held pass commitment.

Behavior intent:
- Keep (d) removed.
- Make pass commitment survive long enough to become a true lateral separation event, not a one-boundary
  touch that immediately self-cancels.

Design components:
1. Structural margin at pass target (primary): require positive pass-side clearance margin so pass target is
   outside same-lane threshold, not on it.
2. Short release debounce on pass state (secondary): clear pass commitment only after brief sustained
   non-candidate/non-valid state, not on first miss.
3. Keep non-penetration structural: retain current (a)+(c) per-frame checks and lag-safe re-engage logic as
   sole safety basis; do not reintroduce (d) as safety proxy.
4. Glide feel without tuning spree: onset should read as glide by avoiding rapid branch thrash; do not add
   new DevScreen knobs. Use constants where needed.

What this displaces:
- Displaces "latch-only" as the primary approach.
- Displaces "add new deadband wiring first" as primary approach.

Why this meets four requirements:
- (i) no zigzag: root loop removed (no immediate self-off), plus release debounce suppresses flicker.
- (ii) no pointless brakes: keeps the no-(d) benefit (median brake waste stays low), avoids re-locking into
  long brake stalls.
- (iii) structural non-penetration: unchanged authority remains (a)+(c)+lag margin, consistent with test and
  flat overlap measurement.
- (iv) dodge reads as glide: fewer regime flips and sustained commit reduce snap impression without unsafe
  pass-target easing.

No new DevScreen knobs justification:
- The needed control surface already exists (`softSteeringClearancePct`) and can be fixed as policy for pass
  commitment behavior. Additional user-facing knobs are not justified.

### 5. Acceptance criteria before build

Use your existing benchmark protocol and the given numbers as baseline.

Success thresholds:
- `zigzagScore`: per track <= 1.10 x WITH(d) baseline.
  - river-run <= 0.0000748
  - mountainstreet <= 0.0000352
  - dirt-oval <= 0.0000627
  - searound <= 0.0000429
- `honestOverlapRate`: per track <= max(WITH(d), WITHOUT(d)) + 0.10 percentage points.
- `brakeThenDodge` median braked frames: per track <= 4.
- `brakeThenDodge` count: per track <= 1.30 x WITH(d) baseline.
  - river-run <= 1736
  - mountainstreet <= 2328
  - dirt-oval <= 3080
  - searound <= 1840

Failure thresholds:
- Any track breaches any success threshold above.
- Any sign of trading down by re-lengthening brakes (median drifting back toward double digits) even if
  zigzag count improves.

Rationale for dual btd criteria:
- Median braked frames tracks wasted-brake severity.
- Count tracks flicker frequency.
- Both must pass; optimizing only one is invalid.

### 6. Honest cost

Cost is high relative to patch size:
- Any change in `raceBehavior.js` changes the fingerprint from `fa4e3796e1e5f1a5`.
- Full fairness re-gate remains mandatory (band reach >= 70%, Holm unfair = 0).

Is the complaint worth it:
- Yes, if and only if the above acceptance thresholds are met. Current choices are both visibly flawed:
  master wastes brakes; bare no-(d) zigzags. A root-cause fix that preserves structural safety is worth the
  re-gate. Anything weaker is not.

### 7. Is DON'T-FIX the honest answer

DON'T-FIX is honest if this concept cannot hit the thresholds without extra knobs or collateral fairness
loss.

Current recommendation:
- Do not ship bare removal of (d).
- Do not ship latch-only as final diagnosis.
- Attempt one root-cause pass based on margin-held commitment; if criteria fail, choose DON'T-FIX and keep
  current master while documenting that the measured alternatives remain worse.
