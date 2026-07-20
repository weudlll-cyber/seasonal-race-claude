# LBB-FLIPGATE — CC critique: "ask (d) only when the side just flipped"

Read-only. Author: CC. Verified at source (`raceBehavior.js`, the removal commit `b11230c`) and against
existing data (`results/lbb-blockdist/`, `results/lbb-trace-3-2026-07-15/`, and my own LBB-TWOCHECK replay).
No runs. Anything I could not check from source or existing data is marked **not checked**.

**Verdict up front: the concept is dead.** It is built on a misdiagnosis (it calls (d) a transition-momentum
damper; the data shows the Owner's blocks are a sustained ambient force, not decaying momentum), its support
is a tautology (the population was DEFINED as `dir`-constant; the rule skips (d) on `dir`-constant frames), it
is unbuildable on the current latch, and its one retained job — damping a real flip — needs more than the
single evaluation it allows. Every alternative below dominates it, and the simplest (finish grading the
removal already on this branch) dominates it hardest.

---

## Facts I re-verified at source (the concept collapses if any is wrong; none is)

- **(d) as shipped on master.** In the look-before-brake gate the brake is suppressed only when
  `dir !== 0` AND `vLatToward >= 0`, where `vLatToward = physicalYVelocity * dir`. `dir` is
  `chooseFreeLaneDir`'s freshly chosen side THIS frame; `physicalYVelocity` is last frame's post-damping
  value. Confirmed in the removal diff (`b11230c`) — the branch I am on has already deleted this line, so the
  concept is a proposal to bring (d) back in a gated form, not to edit a live line.
- **(d) reads a pre-intent velocity (the chicken-and-egg is real).** The pass spring that would move the
  trailer toward the free side is applied only AFTER the gate passes, from the recorded pass candidate. So on
  the frame (d) is asked, `physicalYVelocity` carries only the racer's own lane-keeping / ambient force from
  before any intent to pass existed. The removal commit says this in its own words ("gated on luck, not on
  safety"); I confirmed the ordering in the apply-deltas path.
- **The latch is cleared on every non-committing frame.** `passLeaderIndex`/`passDir` are written only when
  a pass candidate exists for that racer this frame; with no candidate they are reset to `-1`/`0`. A brake
  produces no candidate. So through the Owner's 0.6–0.8 s brake the committed side is repeatedly wiped to
  `0` — the memory the concept needs is destroyed by exactly the event the concept must detect.
- **The pass target is intentionally NOT eased** (`easeMs = 0`), and the code states easing it "inflated
  passThroughCount/overlap." Relevant to alternative C.
- **Damping and cap:** `lateralDamping = 0.16` (keeps ~16%, sheds ~84% of lateral velocity per frame);
  `maxLateralSpeedPerStep = 0.028` (= the 2.8e-2 dodge cap). Both confirmed in defaults.
- **Population definition (blockdist).** The isolated (d)-block is DEFINED with "`dir` does not change (the
  free side stays the same one)"; the analyzer segments runs on any `dir` change. Confirmed in the blockdist
  report and the analysis code.

---

## 1. Verdict on the concept, at source

**It does not do what it claims, and it cannot be built as written.**

The claim is that (d) is one switch doing two jobs — a legitimate transition damper (swing the other way,
let momentum bleed off) and an illegitimate every-frame veto on ambient jitter — and that "evaluate (d) only
when the committed side changes" cleanly splits the two. Two independent source facts break this before any
measurement:

1. **The discriminator's input does not exist when it is needed.** "Did the committed side change" is read
   from `passDir`, and `passDir` is cleared to `0` on every braked frame. During the Owner's sustained brake
   there is no prior committed side to compare against — it was erased the previous frame. So the rule cannot
   distinguish "unchanged" from "no memory" in precisely the regime it targets. As written it is unbuildable
   (see §5).

2. **The signal (d) reads is pre-intent ambient velocity, not transition momentum.** Because the pass spring
   is applied after the gate, the velocity (d) inspects has nothing to do with any swing toward the new side
   — it is last frame's lane-keeping. So "keep (d) on the flip frame to damp the transition" keeps a test
   that is not measuring the transition. It is measuring noise on the flip frame just as it does on every
   other frame.

The concept is therefore a re-timing of a test whose reading is wrong and whose gating state is unavailable.

---

## 2. The circularity — the support is an artefact, and the data cannot rescue it

**The support is tautological.** The Owner's population is DEFINED as the runs where (d) is the sole blocker
AND `dir` never changes. The proposed rule skips (d) exactly when `dir` does not change. So "the rule removes
the Owner's population" is true by construction of the population, not by any evidence that skipping (d) on
those frames is correct. Plan-Claude's objection is right and is the decisive one.

**Can the existing data break the circle?** The sharpest test — *are there LONG spurious brakes where `dir`
DOES change, which the rule would not fix?* — **is not decidable from this data.** The blockdist analyzer
builds blocks as maximal CONSTANT-`dir` runs; any brake in which `dir` oscillates is chopped into several
short constant-`dir` blocks and never appears as a single long dir-changing brake. The instrument was
constructed to exclude the very population that would falsify the rule. So I can neither confirm nor deny
long dir-changing brakes from `results/lbb-blockdist/` — **not decidable here; it needs a re-run that groups
blocks across `dir` changes, which is out of scope.**

**What the data CAN say, and it is worse for the concept.** The vetoing velocity in the long constant-`dir`
blocks is **flat**: mean frame-to-frame change 1.2–1.5% of its own median, with median |vLatToward|
2.5e-4…7.9e-4, sustained over 35–780 frames. Under 84%/frame damping a decaying momentum would be gone in
~3–4 frames; a velocity that stays flat for hundreds of frames can only be a force **re-applied every
frame**. So in the Owner's population there is no "transition momentum to bleed off" at all — there was never
a transition. The concept's mental model (momentum from a side-swing) simply does not describe these blocks.
That means the "two jobs, one switch" story is false for the majority case: the long veto is not a
mis-timed damper, it is a threshold-less test amplifying a standing ambient force into a permanent veto.

**And the discriminator is orthogonal to amplitude.** The brief's own datum — the pre-flip velocity at the
zigzag flip (racer 30/33) is −3.4e-4, the same noise scale as the Owner's blocks (2.5e-4) — means "side
changed" carries no information about whether real momentum is present. The rule sorts frames by a label
(`dir` changed y/n) that does not correlate with the physical quantity (d) purports to police.

---

## 3. The transition case — one evaluation of (d) is not enough

The concept keeps (d) on the single frame the side changes and skips it thereafter. At the traced flip, (d)
held for **4** frames while a tiny velocity (−3.4e-4) decayed and reversed — i.e. the damping needed
multiple frames even at noise amplitude. A once-only evaluation releases after one frame. Two regimes, both
bad:

- **High-velocity flip (moving at the 2.8e-2 cap toward the old side).** On the flip frame `dir` is the new
  side, `vLatToward = physicalYVelocity * dir < 0` → (d) vetoes → one braked frame. One frame of 0.84
  shedding still leaves ~4.5e-3 of velocity pointed at the OLD side. The next frame `dir` is unchanged → the
  rule skips (d) → the decisive pass spring (`lookBeforeBrakePassStrength`, far stronger than soft steering)
  is applied toward the NEW side against that residual. The momentum is not damped; it is overpowered — a
  yank, which is exactly the behaviour (d) was retained to prevent. So the concept does NOT trade the Owner's
  brake for a longer brake; it trades it for an **under-damped snap**. (Direction certain from the damping
  math; the resulting visible-weave count is **not measured** — cannot run.)

- **Noise-amplitude flip (the racer-22 weave).** Master suppresses racer 22's 8 flips to 0 by braking
  THROUGH each contested transition for several frames until the swing dies. A one-frame (d) does not hold
  through the transition, so the suppression that keeping (d) was supposed to preserve is the part the
  concept discards. The likely result is the weave returns. (**Plausible, not measured.**)

Either way, "keep (d) on the flip frame" preserves the *name* of the damper, not its function.

---

## 4. Second-order risk — the rule can INCREASE braking and weaving

(d) currently vetoes in 67–85% of `brakeThenDodge` encounters, and the frames it vetoes are overwhelmingly
the constant-`dir` majority the rule now waves through. So the rule releases most of that population to dodge.
My LBB-TWOCHECK replay established the feedback that follows in a dense field: more dodging fills more
destinations, more destinations occupied means more sides closing, more closures mean more flips. Every new
flip is a frame where the concept KEEPS (d) — and, per §3, damps it for only one frame. So the rule pushes
the field from the WITH-(d) regime (racer 22: 0 flips) toward the WITHOUT-(d) regime (8 flips) on the exact
tracks where the Owner races, while handing each new flip an under-powered damper. The plausible net is MORE
weaving and, through the extra one-frame flip-brakes, not obviously less braking. (Directional inference from
existing data — blockdist shares + the twocheck cluster dynamics; **the net sign is not measured**.)

---

## 5. The prerequisite — unbuildable without a latch change, and the latch is the better first step

The rule's input (`passDir`, the committed side) is cleared on every braked frame, so the rule cannot read
"did the side change" during the Owner's brake. To build the concept at all you must FIRST make the latch
persist the intended side through a brake. That is not a detail; it is a separate behaviour change with its
own fingerprint move and its own re-gate.

Given that, ask the obvious question: **if the latch must change anyway, is the latch repair alone a better
first step?** Partly. A latch that holds the committed side through brakes directly attacks the zigzag/weave
(the side stops being re-decided every frame; `chooseFreeLaneDir` keeps choosing the held side), which is
the ONLY thing (d) was kept for. It does nothing for the Owner's straight-line over-brake — but the Owner's
over-brake is already addressed by the removal on this branch. So a plausible clean pairing is **latch-persist
(kills weave) + (d) removed (kills over-brake)**, with no new permission-gate logic and no `dir`-change
discriminator at all. That pairing is strictly simpler than the concept and targets each symptom with the
mechanism suited to it. The concept, by contrast, needs the latch repair AND a new gated (d) AND still fails
§3.

---

## 6. Alternatives (required)

Ordered best-first. Each still moves `fa4e3796e1e5f1a5` and owes the full re-gate; none is free.

**A. Finish grading the removal already on this branch (do this first, invents nothing).** (d) is already
gone here. The only open question is whether WITHOUT-(d) passes the visible-weave gate (`lbb-weave-report`, not
`zigzagScore`). If it does, ship the removal — it fixes the Owner's complaint at the root (no ambient-velocity
veto, `brakeThenDodge` median → ~2) with zero new mechanism, and the concept is moot. If it does NOT, the
concept — which behaves like the removal on the 67–85% constant-`dir` majority — will not save the weave
either. Either outcome dominates the concept. This is the honest next step, and it is not a new sweep of the
concept; it is the eye-test/gate the removal already owes.

**B. Latch-persist + keep (d) removed (§5).** Repair the latch to hold the committed side through brakes so
the weave is damped by side-stability, and leave (d) deleted so the Owner's over-brake stays fixed. Attacks
each symptom with the right tool; no permission-gate hack; no `dir`-change test. Preferred if A fails the
weave gate.

**C. Damp the transition in the SPRING, not the permission gate.** If the weave is the pass spring snapping
the racer to the new side on a flip, ease the pass target (`smoothLaneTarget`) ONLY on a side-flip
(`dir != heldPassDir`), letting the racer glide across so momentum bleeds through spring dynamics while the
pass stays at speed — the longitudinal brake is never touched, so the Owner's complaint is untouched too.
This damps the transition where the transition physically lives (lateral), not in a longitudinal veto.
**Caveat, verified at source:** the pass target is deliberately un-eased because easing it inflated
overlap/passThrough — but that was easing EVERY pass; easing only on a flip (rare) is a far smaller exposure.
Also needs latch-persist (to know `heldPassDir`), so it pairs with B. Riskier than B; keep as the fallback if
side-stability alone under-damps.

**D. Do nothing.** Not honest as a permanent answer: the Owner's complaint is the MAJORITY of the false-brake
population (67–85% of `brakeThenDodge`, 27–47 encounters/race, ~0.7 s each, room already there in 81–87%). It
is a pervasive feel bug, not a corner case. DON'T-FIX-**this-concept** is honest; DON'T-FIX-**the-symptom** is
not.

**Which existing mechanism already does the job?** For the weave: the **latch** (side stability) — that is
its stated purpose; it is simply broken by the clear-on-brake. For the over-brake: **condition (a)** already
carries the entire non-penetration guarantee (the "SOLE protector"), so nothing else is needed to make
suppression safe once (d) is gone. No new mechanism is required by either symptom; the concept invents one
the system does not need.

---

## 7. Acceptance criteria and whether the complaint is worth it

Both behaviour gates, pulling opposite ways, plus the fairness re-gate:
- **visible-weave** (`lbb-weave-report.mjs`, not `zigzagScore` — ρ 0.53/0.12) **no worse than WITH-(d)**;
- **`brakeThenDodge` median braked frames near the WITHOUT-(d) value (~2)**, not 35–50;
- **band-reach ≥ 70%, 0 Holm-unfair**, since any `raceBehavior.js` edit moves `fa4e3796e1e5f1a5`.

Is the complaint worth that spend? **Yes — but not on this concept.** The complaint is the dominant slice of
the false-brake population, so a fix that clears both gates is worth the fingerprint move and the re-gate. The
concept is unlikely to clear them (§3 under-damp; §4 second-order weave) and cannot even be built without a
prior latch change (§5). So spend the re-gate on **A** (grade the removal) and, if needed, **B**
(latch-persist + removed (d)) — mechanisms that have a path through both gates — not on a `dir`-change
re-timing of a test whose input is the wrong signal read at the wrong time.

---

## Hygiene (reported separately, not folded into the findings)

- The recurring failure mode remains **defining the population by the same predicate the candidate fix keys
  on** (here: "`dir` never changes"). Any future test of a `dir`-change rule must group brakes ACROSS `dir`
  changes, or it will confirm the rule tautologically — the same shape that produced the earlier false
  confirmations this investigation is trying to stop.
- The blockdist report's own closing caveat is worth carrying forward: it measured the veto INPUT (the small
  sustained velocity), not the force's SOURCE. The concept assumed that input was transition momentum; the
  data says it is a standing force of unidentified origin. Naming that source (soft-steering pull toward a
  third racer, boundary repulsion, brake-to-match interaction) is the measurement that would actually advance
  this, and it has not been done.
- I did not read the Copilot file; this critique is independent by construction of the filename.
