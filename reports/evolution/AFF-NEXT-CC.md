# Assignment-follows-field (Evolution Act 1) — what to do after the SCREEN — CC opinion

**Report-only. Author: CC. Master `cd520e0`. No code changed, no sims run.** My independent read of the
NEGATIVE SCREEN ([AFF-SCREEN.md](AFF-SCREEN.md)) and what should happen next. Written without reference to
the Copilot opinion.

---

## 1. Diagnosis — why the SCREEN regressed

**The mechanism as built does not ADD contest; it SUBTRACTS the servo's within-band restoring force.**
That single fact explains every number in the SCREEN, and it is a *structural* consequence of the design,
not a tuning miss.

The servo steers each pack racer by `rankError = currentRank − targetRank`, blended with the band-edge
term: `error = strictness·rankError + (1−strictness)·bandError` at `strictness = choreoPackBandStrictness =
0.5` ([racePlanner.js](../../client/src/modules/racePlanner.js) servo pass). With the STATIC map the
`targetRank` is a **fixed attractor**: a racer that drifts ahead of its slot is braked, one that drifts
behind is boosted. That fixed attractor is simultaneously (a) the fairness engine — it pulls each racer
back toward its assigned finishing slot, which is what produces band-reach — and (b) the finale-contest
engine — it pulls the designated winner UP from behind (the comeback / lead change) and brakes escapees.

AFF replaces that fixed attractor with a target that **chases the live position**: the band's slot ranks
are handed to the pack in live order every OUTCOME tick. When a band sits in its natural contiguous global
rank range, live-order assignment makes `targetRank ≈ currentRank`, so **`rankError → 0` by construction**
and the `rankError` half of the servo goes silent. The only restoring force left is the half-strength
`bandError`, and `bandError` is **zero inside the band** — it engages only *after* a racer has already
crossed a band edge. So AFF converts a proactive, continuous slot attractor into a reactive, edge-only
containment at half strength. Within a band the field then free-floats on natural speed (spreadFactor).

Every SCREEN movement follows directly:

- **band-reach 71.1% → 66.8% (below the 70% floor).** With the `rankError` term neutralized, the fastest
  natural runner in a band drifts to the top edge and leaks UP before the weak edge term catches it; the
  slowest leaks DOWN. Band membership is measured at the finish, so edge leakage over the full race
  becomes wrong-band finishes. This is the **same failure family the project has already retired twice**:
  the B2 pack-strictness release and universal band-arrival both broke band-reach via endgame edge-leak,
  and the standing lesson from the B2-heroes work is *"action lives in ORCHESTRATION, not liberation —
  freeing the servo settles the field and breaks band-reach."* AFF is a within-band release, so it lands
  in that family.

- **dead finales 8→14%, runaway 14→18%, lead changes 2.24→1.80.** The comeback/brake force that the servo
  used to manufacture at the line is exactly the `rankError` term AFF silences. Remove it and the finale
  runs on natural speed: whoever drew the best spreadFactor pulls away unchallenged. AFF's *premise* was a
  livelier finale from "fighting for live positions," but a P-controller whose target equals the current
  position exerts no force — "following the field" is operationally identical to "stop correcting," which
  is the opposite of contest.

- **Per-track split confirms the mechanism, not noise.** The damage concentrates on **searound (closed):**
  band-reach −5.8pp (75.1→69.3, crossing the floor), dead finales **+16pp** (8→24), runaway +8pp (16→24).
  A closed track laps a bunched pack past the same edges many times, so within-band leakage compounds —
  precisely where a release should hurt most. **luger-hill (open)** is only mildly hurt on band-reach
  (68.4→65.1; note CONTROL was already <70% here) and its dead-finale move (8→4%) is 2 races vs 1 at
  N=25 — inside noise, and open tracks have a dynamic finish/run-out that muddies the finale signal. I do
  **not** read luger-hill as evidence AFF helps finales; I read the closed-track collapse as the signal.

- **Flap (8.79 swaps/racer/race at H=0.5) is a symptom, not the cause.** `affSwapThresholdLengths`
  interpolates the mechanism between the two ends: `H→0` tracks the live field exactly (`rankError→0`, full
  servo neutralization, max regression); `H→∞` never swaps (the static map, i.e. shipped). H=0.5 sits near
  the neutralized end. The 8.79 swaps are the *evidence* the target is tracking closely; damping them with
  a larger H does not add a restoring force — it just slides the mechanism back toward "shipped." **The
  regression is loss of correction, and cadence changes cannot restore a force that the design removed.**

**Bottom line of the diagnosis:** fairness (band-reach) and finale contest in this engine are *the same
force* — the static slot attractor. AFF removes it. Therefore AFF cannot improve either; whole-race AFF's
best attainable outcome is "≈ shipped" (at large H), and every H below that trades fairness away. The
SCREEN is behaving exactly as the architecture predicts.

---

## 2. Options, ranked

Ranked by expected value given the diagnosis (cheapest-decisive first). "Code site" = the one place a change
lands. All options keep the build default OFF / byte-identical until an explicit ship.

### #1 — Wider-hysteresis confirmation SCREEN (pre-registered kill test) — *no code*
- **Changes:** nothing in the engine; `affSwapThresholdLengths` is already a config knob. Re-run the
  existing `scripts/exp-aff-screen.mjs` across a small H sweep (e.g. H ∈ {1.0, 2.0, 3.0, 4.0}).
- **Cost:** ~4 H × 2 tracks × N=25 ≈ 200 races on existing tooling; no new code.
- **SCREEN evidence for/against:** H interpolates neutralized↔shipped, so this directly tests my "no
  sweet spot" prediction. **Against:** the prediction is that band-reach recovers only as the AFF effect
  vanishes, i.e. it will find "AFF that does nothing," not "AFF that helps."
- **Risk:** spends a small budget confirming the obvious. Its value is as a *pre-committed falsifier*: it
  converts my architectural argument into a measured kill decision instead of an assertion.

### #2 — End Act 1; shelve the flag-gated build (default OFF) — *no code*
- **Changes:** none. The build is already dormant and byte-identical; nothing to revert.
- **Cost:** zero.
- **SCREEN evidence for:** band-reach failed the hard floor for a structural reason that matches two
  previously-retired release mechanisms. **Against:** it's one SCREEN, one H, two tracks — thin if the
  owner wants a measured kill rather than a reasoned one (that gap is exactly what #1 closes cheaply).
- **Risk:** abandoning a mechanism that had an unmeasured *naturalness* rationale (fewer visible
  corrections) which the SCREEN never scored. But naturalness cannot buy back a hard-floor violation.

### #3 — Restructure: AFF only in the finale window, front band only — *code, one gate*
- **Changes:** gate `applyAssignmentFollowsField` on `phaseProgress ≥ contestWindowStart` (~0.8, an
  existing value) and restrict the reassigned pool to band 0. Code site: the AFF call + pool filter in
  `update()`.
- **Cost:** unit tests + fingerprint re-verify (still OFF → byte-identical) + a focused SCREEN.
- **SCREEN evidence for:** band-reach erodes over the *whole* race, so confining AFF to the last ~20%
  limits the fairness blast radius while still letting the front reorder in the owner-relevant window
  [0.8/0.9–1.0]. **Against:** the very window it releases is where the escapee-brake prevents runaway;
  searound's runaway got *worse* under AFF, so a finale-only B1 release could keep or amplify that.
- **Risk:** medium — it removes the finale restoring force in exactly the window that suppresses runaway,
  so it may relocate the regression rather than cure it. This is the only variant that could make AFF a
  *net positive*, but it is really a new mechanism and belongs to its own spec, not Act 1.

### #4 — Move cadence to scheduled roll boundaries (the SCREEN closing-line fallback) — *code, plumbing*
- **Changes:** evaluate AFF at scheduled roll boundaries instead of per tick (thread a roll-boundary flag
  into the planner). Honors "scheduled dice only."
- **Cost:** plumbing + re-verify + SCREEN.
- **SCREEN evidence for:** reduces the 8.79 flap. **Against:** flap is not the failure; sparser updates
  make the target *lag* the field — the same interpolation toward shipped as a larger H, achieved with
  more code. It treats the symptom the closing line named while band-reach (the actual failure) is
  untouched.
- **Risk:** spends engineering on the wrong variable and reads as progress without moving the floor.

### #5 — Reframe as an ADDITIVE contest term (keep the static pin) — *out of Act 1 scope*
- **Changes:** keep the static `rankError` attractor (fairness preserved) and ADD a separate small
  "chase the in-band racer ahead" boost in the finale. This is a *new* mechanism, not AFF.
- **Cost:** design + build + full verification + SCREEN — a new Act.
- **SCREEN evidence for:** the SCREEN shows the pin is what holds fairness, so any contest must be added
  *without* removing it — the "author, don't liberate" lesson. **Against:** the project already has
  authored finale contest (B2 heroes, pulk lead rotation); this overlaps them.
- **Risk:** scope creep. Correct family, wrong to bolt onto Act 1.

---

## Recommendation

**Run the wider-hysteresis confirmation SCREEN (#1) as a ≤200-race pre-registered gate; abandon AFF (#2)
if no H yields pooled band-reach ≥70% AND at least one finale guardrail strictly better than shipped on
BOTH tracks — a bar I expect it to miss, because in this engine fairness and finale contest are the same
static-slot force AFF removes.** I would only reopen the idea as the finale-only/front-band restructure
(#3) under its own spec, and only if the owner values finale liveliness enough to accept its runaway risk.
