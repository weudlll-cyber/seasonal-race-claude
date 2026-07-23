# Field-cohesion concept — bound every gap with loaded dice

> **⚠️ Pre-unification baseline.** Absolute sim numbers in this document (band-reach, runaway, P1-contest, physics-tax, gate results) were measured before the plan-grid unification (parity step 2a, 2026-07-23) and are pending re-measurement — see [reports/BASELINE-INVALIDATED.md](../reports/BASELINE-INVALIDATED.md). They remain as history.

**Status:** design concept, not yet built. A concept in this repo is a promise to build it — everything
below is either verified at source (file:line) or tagged *inferred* / *needs-measurement*. Date: 2026-07-10.

**UPDATE 2026-07-20 — IMPLEMENTED flag-gated, sim-activatable (Phase-2 exploration).** The re-roll bias
is built as `computeGapBiasedTarget` in `client/src/modules/racePlanner.js` (a shared deterministic
transform beside `computePulkBiasedTarget`, whose behavior is untouched), activated ONLY from the sim
harness (`scripts/sim-fairness.mjs --gapRerollThresholdLengths / --gapRerollMode / --gapRerollStrength`);
config/flag absent → the browser and a default sim run are byte-identical (fingerprint `72c3360fb75225ef`
verified). **Owner fairness decision (binding): SCHEDULED ROLLS ONLY — never an off-schedule/early
re-roll.** The window is derived from config at runtime (`[choreoOutcomeStart, reRollLastPositionPercent·dur
− reRollTransitionDuration]`), zero hardcoded constants. Browser wiring + a DevScreen knob is a separate
later step after an owner ship decision. See docs/SIM.md and reports/proposals/GAP-REROLL-CONCEPT.md.

**NORMATIVE DIRECTION TABLE (canonical — supersedes any older §1/§4 phrasing):**
- A racer whose lap-aware arc gap **to the racer BEHIND** exceeds G (it has opened a hole behind itself)
  → its next re-roll draw is shifted toward the **SLOWER** end of its own honest ±8.1 % band.
- *symmetric mode only:* a racer whose gap **to the racer AHEAD** exceeds G (it has been dropped)
  → shifted toward the **FASTER** end — always within its own honest band, never above.
- All gaps ≤ G → **bit-exact no-op** (the draw passes through unchanged).

This is the FINAL concept, reconciled from three independent proposals (CC, Copilot, Plan-Claude) written
without seeing each other, plus a data challenge round. No threshold in it was chosen by optimising a
metric; every number is set by the owner's eye, in racer lengths.

---

## 0. FOR THE OWNER — read this first (two minutes)

- **Nothing in the race looks at gaps today.** A car's speed comes from its own dice-roll and a servo
  that only asks "am I in the right *place in the order*?" — never "how big is the hole in front of me?"
  So the field's spacing is nobody's job; it drifts. *Verified: racePlanner.js:566,577,579; raceStep.js.*
- **The field is not spreading evenly — it is a tight bunch with one or two cars broken off the front.**
  The typical gap between neighbours is about **one-tenth of a car length**; only ~1–2 gaps out of 39 are
  wide. The dead race you watched was a lone leader **seventeen car-lengths** up the road from a packed
  field. *Verified from the frozen data (§2, S1).*
- **The rule you chose is the right shape:** *no car may be more than G lengths behind the car ahead.* One
  number, one rule. A leader running away is one over-wide gap; a lead group breaking away is one over-wide
  gap behind the group; a rear detachment is one over-wide gap in the middle. Bound every gap ⇒ no part of
  the field can cut off from any other part. It cannot glue the field, because the rule does **nothing at
  all** below G (bit-exact): the target is "gaps at most G", never "gaps zero". Overtaking room survives.
- **How we enforce it: we load the dice the field already rolls.** A car that has opened a gap bigger than
  G draws its next natural speed from the slower end of its own honest ±8.1 % band; a car stuck in a hole
  draws from the faster end. Nobody is ever given a speed it could not have rolled anyway. On screen it
  looks like ordinary racing luck — not a brake, not a rubber band. *This is the whole point.*
- **The honest caveat, stated up front (not a footnote):** "no rubber band" is true of the *force* —
  every speed is one the car could have rolled — but a car that stays over the cap is pulled down again
  and again, and **repeated invisibility becomes visible**: on screen it looks held. So the correction's
  *duty cycle* is a first-class number we watch. If the leader is corrected most of the time, it reads as
  a spring and the concept has failed — that is a kill condition, not a detail.
- **The heroes obey the same rule.** They are not exempt (an earlier draft wrongly exempted them — see §8).
  It does not hurt their stories: their drama is about *rank* (who passes whom); the cap is about *gap*; a
  hero can be "rank 1" whether it leads by 3 lengths or 17. We only ever slow a car that is *opening* a
  hole, never one that is *closing* one — so cohesion and a comeback point the same way.
- **You set ONE number by eye: the gap cap G, in car-lengths.** Start around 3. Turn it down and the pack
  tightens; up and it loosens. A second, explained control trims how hard the dice are loaded. Nothing else.
- **The abort rule:** if, after you have set G by eye, you still see a dead race — **we discard this
  concept and do not keep tuning.** Three metrics have certified dead races; your eye has not been wrong once.

---

## 1. The core idea (one paragraph)

Bound the **gap between every pair of consecutive cars** to at most **G racer-lengths** (G is one number,
set by eye). Enforce it not with a brake but by **loading the periodic speed re-roll the field already
throws** (per the NORMATIVE DIRECTION table in §0): a car whose gap **to the car behind** exceeds G (it
has opened a hole behind itself) draws from the **slower** end of its own honest ±8.1 % band next time; in
symmetric correction a car whose gap **to the car ahead** exceeds G (it has been dropped) draws from the
**faster** end. Below G the dice are
untouched, so the tight bunch and its overtaking room are left exactly as today. The correction is slow
because the disease is slow (spread is the integral of tiny speed differences); where the ~9.5 s re-roll
interval is too slow to hold the cap, the same car is made to **re-draw early** (still the dice, ~3 s
response). A bounded brake exists only as a last-resort fallback if the eye still sees chasms.

Owner-facing name: **loaded dice within the honest range.** Mechanism name: **gap-cap re-roll bias.**

---

## 2. The central diagnosis — the field is BIMODAL (S1, verified from the frozen data)

Measured over all 12 frozen night-sweep cells (4 tracks × 3 arms, 100 races each, in racer lengths):

| | median gap (link) | p90 link | links > 3 L (of 39) |
|---|---|---|---|
| At the line, full field | **0.10–0.18 L** | 0.9–1.3 L | **~1–2** |
| Front-10, v4-OFF | 0.21–0.29 L | 1.1–1.5 L | few |
| Front-10, v4-ON | 0.26–0.43 L | 1.5–2.3 L | more |

**The field is a near-bumper-to-bumper bunch plus 1–2 cars broken off the front.** Consequences that
shaped this concept:
- **The owner's two worries are two different problems.** "The leader/lead-group runs away" is a *gap*
  problem at the front — cohesion's job. "The field tears apart from the middle back" is **not what the
  data shows**: the middle and rear are a *wall*, not torn. Whether that wall is "too tight to overtake"
  is a **lateral-lane** question (traffic), not a gap question — *needs-measurement* (traffic-braking
  fraction), and cohesion must **not** try to fix it. *Verified (link distribution); the "middle-back
  tears" premise is refuted by the data.*
- **An absolute cap is surgical, not a field-rebuild.** Because 37–38 of 39 links are already far below any
  sane G, the cap bites only the 1–2 chasms. A cap of 2 L would start biting ordinary front racing
  (front-10 p90 = 1.4–2.3 L); **3 L cleanly separates chasms from normal spacing — start there** (S2).
- **The dead race is legible now:** band-reach FAIR, and the winner 17 lengths clear
  (Arm C · mountainstreet · race #26; the 3.06 s at the line = ~17 lengths at that track's 5.7 lengths/s).

---

## 3. What quantity is controlled — and what must NOT be

**Controlled (owner's decision D1): the absolute gap between every pair of consecutive cars**, capped at G
lengths, as an **upper bound with a dead zone** — below G, the mechanism is a bit-exact no-op.

- This is deliberately simpler than the "local relative gap" an earlier draft proposed, and my own data
  (S1) shows the simpler absolute rule is enough: the field is bunched, so an absolute cap only ever
  touches the 1–2 chasms. Simpler rule, one knob (C6). I concede the point to the owner's framing.
- **It cannot glue the field:** the dead zone means sub-cap gaps are never touched. Equilibrium is "gaps ≤
  G", never "gaps → 0". The tight rear (median 0.1 L) is below any G, so it is untouched *by construction*
  (this answers the glue worry directly — D3).
- **On "(N−1)·G is a 117-length snake":** bounding each link ≤ G *permits* a long uniform snake in theory,
  but the field is bunched (S1), so total spread is never regulated and never approaches that — the cap
  only closes chasms. **Total spread is explicitly NOT controlled** (owner's ask): overtaking is local — a
  car gains a place by closing exactly one link.

**NOT controlled (§9 restated):** total field length; within-band finishing order (fairness is
endpoint-only; regulating order would flatten the rank-churn overtaking rides on); the rear wall's
tightness (that is lateral, not gaps); the lateral rule itself; the leader's mere existence at the front
(only a leader→P2 gap *over G*).

---

## 4. The mechanism and where it sits in the force chain

The per-frame advance is one shared function (raceStep.js), identical in browser and sim:
`t += baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult`.
The mechanism acts on **`baseSpeed` via `spreadFactor` (the re-roll)** — upstream of, and independent from,
the servo's `trajectoryMult`. It is an existing factor's *input distribution*, not a new factor (constraint
C3 satisfied for free).

**Three channels, in strict order of preference (owner's decision D2):**

1. **Re-roll bias — the primary mechanism.** At each re-roll the draw is
   `spreadFactor + U(−halfWidth, +halfWidth)` (halfWidth = 0.75·spreadRange, index.jsx:931,1083), eased to
   the new value over `reRollTransitionDuration = 3.0 s` (defaults.js:259; index.jsx:623,1109-1122), then
   clamped to `[spreadMin, spreadMax]` (±8.1 %). **Symmetric bias (D3) — per the NORMATIVE DIRECTION table
   in §0:** a car whose gap **to the racer behind** > G (it has opened a hole behind itself) tilts the draw
   **down** (slower); in symmetric mode a car whose gap **to the racer ahead** > G (it has been dropped)
   tilts it **up** (faster) — always inside the honest band. This is the
   generalisation of the existing `computePulkBiasedTarget` (racePlanner.js:615) from `slice(0,3)`/PULK
   (racePlanner.js:208) to the whole pack, whole race, with a dead zone. *Continuous, invisible, no new
   force.*
2. **Early re-draw — when the interval is too slow (S3/S7).** A band-edge car drifts **2.4–4.4 lengths per
   9.5 s interval** (0.081 × 3.1–5.7 L/s × 9.5 s; rollInterval verified index.jsx:535-540, defaults.js:260-261).
   That exceeds a 3 L cap between draws. Fix: a car over the cap re-draws **early** (biased down), so the
   response is ~3 s (the eased transition, verified) and the overshoot falls to ~0.8–1.4 lengths. Still the
   dice — no new force. The code already sets `spreadFactorTarget` + `transitionStartTime` + `nextRollTime`;
   an early trigger is one added condition. **Three things the owner's addendum forced to source, and their
   answers:**
   - **Everything it depends on is a LIVE, owner-tunable DevScreen control — read it live, never a literal
     and never a race-start snapshot** (this is the `corridorStart 0.55` lesson: a loose timing constant
     survived for months). All four shaping knobs are editable in `DynamicsTuningSection.jsx:108-111`
     (`reRollIntervalDivisor`, `reRollLastPositionPercent`, `reRollTransitionDuration`,
     `reRollVariationPercent`; e.g. transition editable 0.5–10 s, :444-447). State the behaviour **as a
     function of the knobs**: the achievable overshoot above the cap ≈ **bandEdge × lengthsPerSecond ×
     `reRollTransitionDuration`** — it scales with a slider the owner can move. **Double the transition
     duration and the cap holds twice as loosely.** *Verified: the four controls are live (DynamicsTuningSection);
     interval/overshoot arithmetic re-derived at source.*
   - **(a) An early re-draw is ADDITIONAL, not a consume.** Firing the block early resets
     `nextRollTime = raceTs + rollInterval + jOff` (sim-fairness.mjs:1086; index.jsx:1086), so a chronic
     offender receives **more total draws than the field**. *Verified.* Fairness argument: the endpoint is
     still owned by the servo (band-reach), and *which* car breaks away is transient and uncorrelated with
     start-row or identity over many races, so the extra draws are symmetric at the endpoint — **but this
     is endpoint-only fairness and must be MEASURED, not assumed** (kill condition (a)). And note the
     unification: a high rate of extra draws on the leader **IS** the duty-cycle rubber band (kill (d)) —
     the same failure counted two ways. *needs-measurement.*
   - **(b) The sim draws re-rolls from ONE shared seeded stream** — `Math.random = makePRNG(seed)`
     (sim-fairness.mjs:566-567), consumed at :1066-1067,1085. *Verified.* An early re-draw taking from that
     shared stream would shift **every** downstream draw for the whole field, so per the addendum's own
     rule the early re-draw **MUST draw from a dedicated per-racer stream**, or it cannot be built as
     designed. This is buildable and has a proven precedent: the governor already keys a `mulberry32`
     stream on `index ^ (seed ^ XOR)` without touching `Math.random` (raceGovernor.js:82). A per-racer
     early-draw stream keeps the shared stream — and therefore the exact regression diff every deletion
     depends on — untouched. **If that per-racer stream is not built, channel 2 is dropped and we fall to
     channel 3.** *Verified feasible via the governor precedent.*
   - **⚠ The S7 framing corrected:** "no rubber band" is true for the *force* (every value is drawable) but
     **not for the perception** — a car pinned over the cap re-draws down every ~3 s and sits near the floor
     for the run-in, which *looks* held. The early re-draw makes the correction faster; it does **not**
     exempt it from the duty-cycle failure (D7-d).
3. **Bounded brake — fallback ONLY (D2).** Dead-zoned, slew-limited, brake-only, faded before the release.
   Build this **only if the owner's eye still sees chasms after 1 and 2 are tuned.** The owner's judgement
   ("um eine Bremse werden wir nicht weg kommen") stands as the fallback, not the premise.

**Whatever fires, its DUTY CYCLE is a first-class reported number.** If the leader is corrected most of the
time, it is a spring and the concept has failed (D7-d, D6).

**Why the re-roll and not a per-frame brake as primary** (all three concepts converged here — the strongest
signal this project has produced): the disease is *slow drift*, so the medicine must be slow; a per-frame
brake is a fast tool for a slow problem and brings every failure mode we fear (rubber-band, concertina,
servo-fight, a new unbounded force). It is **not** a "rip-closer": a rip-closer brakes one car to close one
gap and relocates the gap; this is a distributed symmetric draw-tilt — the neighbourhood relaxes toward
≤ G, no single gap is shoved elsewhere.

---

## 5. The two failure modes — avoidance and detection

- **GLUED (dead field, no overtaking).** Avoided by the dead zone (sub-cap gaps untouched — the rear wall
  and its lanes are never compressed by cohesion) and by the ±8.1 % clamp. **Detect:** held overtakes/race
  (must not fall), adjacent-rank-swap rate (must not collapse), traffic-braking fraction (must not spike).
- **VISIBLE RUBBER BAND.** Avoided at the force level (no brake; ≤6 draws/race + early re-draws, all inside
  the band). **Detect:** the correction's **duty cycle** and **magnitude** per race, especially on the
  leader. The early-re-draw caveat (§4.2) makes this the *binding* detector, not a formality.

---

## 6. The concertina

A per-frame front-brake with a fast rear-closer makes a wall. This mechanism avoids it structurally: the
correction is slow (per-draw, eased over 3 s), **symmetric** (the car ahead of the hole eases down while the
car behind eases up — D3), and bounded to ±8.1 %. Closing a chasm is a mutual drift, not a front-brake — the
front does not stop, the rear does not ram. Any residual real proximity is owned by the **unchanged lateral
avoidance layer** (C1), which already guarantees no car passes through an occupied lane. **Detect:**
traffic-braking fraction and any avoidance-brake cluster around a closing chasm.

---

## 7. Interaction with the servo — and the actuator hierarchy (S5)

The servo owns **rank** (`trajectoryMult`), the mechanism owns **gap** (`spreadFactor`→`baseSpeed`) —
different quantities, different timescales (servo per-frame, bias per-draw). A leader eased down that keeps
rank 1 while P2 closes is exactly the win; they meet only when a rank actually flips — the race we want.

**But the hierarchy is load-bearing (S5, verified):** the servo clamp is `[0.85, 1.10]`
(racePlanner.js:74-75) — **more speed authority (−15 %/+10 %) than the ±8.1 % re-roll band.** Therefore:
- A gap the servo **actively drives** (a hero curve boosting a car toward the front at +10 %) **cannot be
  policed by the dice** — the re-roll is the weaker actuator. Only *drift* gaps can (a rank-1 leader gets
  servo ≈ 1.0, so its runaway is drift and the dice can hold it).
- ⇒ **The hero curves must be authored inside the cap** (§8). The re-roll can never police a servo-driven
  gap; the curve constraint is the only lever there.

**Named, not solved (D8): MEASURE it** — count frames where the mechanism pushes a car down while the servo
pushes it up. Rare ⇒ harmless. Constant ⇒ the servo must yield at the front, a separate decision.

---

## 8. Interaction with the heroes — NO exemption (D4/S4; corrects the earlier draft)

Heroes are cast from the B1 pool (`finalRanks.get(p.index) <= BAND_EDGES[0]`, heroCurveGenerator.js:407-408);
the winner sits at cluster rank 2 and rank 1 is left to the run-out (:378-382). **So the front band IS
heroes**, and the 17-length chasm is leader→P2 — *between two front-cluster heroes*. An earlier draft
exempted heroes from the reference; that would make the **motivating failure invisible**. **Withdrawn.**

Heroes are subject to the cap and count in the reference. This does **not** fight their stories, because the
cap is a *gap* rule and their drama is a *rank* rule: a hero satisfies "rank 1" at a 3-length or a 17-length
gap, so slowing it to close the gap does not break its curve. The mechanism only ever slows a car that is
*opening* a hole, never one *closing* one — so cohesion and a comeback point the same way. Where a curve
genuinely demands a gap over G (a servo-driven front break, §7/S5), **the constraint belongs on the curve**,
authored inside the cap — the dice cannot police it. *Not gameable by casting:* heroes are 2–4, bounded, and
must still finish in band; subjecting them to the cap means casting cannot open a protected hole.

---

## 9. What must NOT be controlled

Total field spread (owner's explicit ask); within-band order (endpoint-only fairness); the rear wall's
tightness (lateral, not gaps — cohesion must not touch it); the lateral rule; the leader's existence at the
front. Controlling any of these trades the owner's drama for a tidy metric — the mistake C7 forbids.

---

## 10. The four kill conditions — FALSIFIED if any holds (D7, verbatim)

- **(a)** band-reach < 70 % on any track — the bias moved endpoints, not just paths;
- **(b)** the frontmost-gap fraction-over-cap barely changes — too weak, or a rip-closer in disguise;
- **(c)** held overtakes collapse and traffic-braking spikes — the field is glued;
- **(d)** the leader's correction duty cycle is high or continuous — it will read as a rubber band.

The cheapest experiment is a *falsification*, not a confirmation: generalise the existing
`computePulkBiasedTarget` to the whole pack with a dead zone at one eye-chosen G, run 4 tracks × {v4 on/off},
seed=1, 100 races; any one of (a)–(d) kills it. The hook and every observer (gap-space + frontmost-gap +
band-reach, in lengths) already exist.

**The abort rule (D6, verbatim):** *"If, after calibration, the owner still sees a dead race — DISCARD THE
CONCEPT. Do not keep tuning."*

---

## 11. What I would NOT do, and what gets DELETED once this validates

- **NOT** a per-frame brake/spring as the primary mechanism; **NOT** regulate total spread; **NOT**
  resurrect the removed reactive director as a spreader; **NOT** a single-gap rip-closer; **NOT** band-strictness
  as a spreader.
- **DELETE / SUBSUME** once validated: `pulkRacerIds = shuffled.slice(0,3)` and the pool selection
  (racePlanner.js:208); the **PULK-phase gate inside `computePulkBiasedTarget`** (racePlanner.js:615, the
  `getPhase(...) !== 'PULK'` early return) — it becomes the general mechanism; **`pulkBiasGain` as a
  separate control** — folded into the one bias-strength trim (D5).
- **LEAVE ALONE:** the lateral layer; the servo's rank job; the hero curves' authorship (add an
  inside-the-cap constraint, do not rewrite them).

---

## 12. Staged build order — fairness gate + owner's eye at every visible stage

- **Stage 0 — instrument, no behaviour change.** Confirm the chasm/link distribution and baseline
  band-reach with the existing front-gap observer; **emit the hero flag per racer** so "the wide link is
  hero→hero" is *measured*, not inferred (converts the one remaining inference in §8). *Gate: band-reach
  recorded per track.*
- **Stage 1 — generalise the re-roll bias (channel 1), symmetric, small gain, dead zone at G.**
  `computePulkBiasedTarget` → whole pack, whole race, gap-cap reference, heroes included. *Gate: band-reach
  ≥ 70 % all tracks (fairness cannot regress); frontmost-gap fraction-over-G drops; held overtakes
  unchanged; duty cycle reported.* **Owner eye-test:** less torn without looking glued? If fairness breaks
  here, the whole approach is falsified — stop.
- **Stage 2 — add the early re-draw (channel 2)** for cars the interval cannot hold. **Build requirements
  (non-negotiable, from source):** it draws from a **dedicated per-racer PRNG stream**
  (its own seeded stream, separate from the shared re-roll stream) so the shared stream and the regression diff stay intact; it reads the four re-roll
  controls **live** (never a race-start snapshot). *Gate: same fairness; the exact regression diff still
  reproduces a no-feature race byte-for-byte; overshoot-over-G shrinks; duty cycle stays low (watch the
  leader — §4.2 caveat and the "additional draws" fairness measurement).* **Owner eye-test.** If the
  per-racer stream is not built, **drop channel 2 and go to Stage 5 (the brake fallback).**
- **Stage 3 — hero-curve constraint (author inside the cap; S5/§8), and the servo-conflict measurement
  (D8).** *Gate: fairness; heroes still complete their curves (comeback/duel intact); servo↔bias conflict
  frames rare.* **Owner eye-test:** do the heroes still weave and win?
- **Stage 4 — expose ONE Action knob (G) + a bias-strength trim (D5), with the duty-cycle/magnitude
  telemetry on the DevScreen.** *Gate: C6 — ≤ ~5 explained controls + 1 Action slider.* **Owner eye-test is
  the final judge; the abort rule (D6) applies.**
- **Only if the eye still sees chasms after Stages 1–2:** Stage 5 — the bounded brake fallback (channel 3).
- Until the owner's eye passes (C4), the abort rule reverts to the current shipped world (choreo +
  PulkLeadRotation) — there is no separate fallback mechanism to keep.

Every threshold here (G, gain, dead zone, window) is set by the **owner's eye in racer lengths**, never by
optimising a metric — the metrics have lied three times; the eye has not.
