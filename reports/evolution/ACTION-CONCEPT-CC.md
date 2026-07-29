# ACTION INTO A FAIR GAME — split-and-script, developed — CC

**Report-only. Independent (no coordination). No code, no sims.** Deliverable for the joint-design round.
Grounded in what THIS branch measured: FRONT-AUTOPSY-1 (the enemy) and DRAMA-1 (what breaks), plus the
standing walls (two-sided envelope, closed-track lane scarcity, L160/178/181/182).

## The one reframing that should drive the whole design

Three measured facts must sit at the centre, because they overturn the naïve reading of the split:

1. **The servo's rank-steering IS the action engine, not (only) its enemy** (DRAMA-1, N=100). Freeing the
   front — by release *or* band-hold — REDUCED lead-changes on every track. The lead-changes are *made* by the
   servo continuously steering racers past each other toward their targets. **Corollary for the split:** the
   action cohort must be given DIVERGENT TARGETS THAT THE SERVO THEN EXECUTES — never be *freed* from the
   servo. Action = re-aiming the engine, not disabling it.
2. **The front is never fuel-starved** (autopsy: DRIVE = 0% of dead finales; fuelSpread ≈ 0.15–0.18; the
   ±width is used ~⅓ of the time). **Corollary:** do NOT add speed to manufacture passes. The fuel exists;
   only its *direction* is wrong (everyone aimed at a fixed rank ⇒ passes cancel into a settle).
3. **The envelope is used asymmetrically.** The autopsy's clamp-usage is dominated by the *bonus* (fast)
   side — climbers pinned at 1.10. The *malus* (slow) side has headroom. **Corollary — my central claim:**
   the cheapest legal action lives on the MALUS side. Braking the momentary leader briefly (down toward 0.85)
   compresses the field; the racers behind, at NORMAL speed, close and pass — real overtakes bought entirely
   from the *underused* half of the envelope, with zero boost. This is exactly the owner's whole-race
   brake-beat, and the autopsy explains *why it is the right primitive*: you have headroom to brake, you do
   not have headroom to boost.

So the design I argue for is not "70% fair + 30% dramatic arcs." It is: **one servo, given a per-race SCRIPT
of short, outcome-neutral, mostly-malus target excursions that fill the race's quiet windows — every excursion
budgeted so the finish is provably unchanged.** The split is real but it is a *target-authoring* split, not a
separate action subsystem fighting the sorter.

## 1. Critique + hardening of the split/script system

**Where it is right.** Separating band-delivery (Layer A) from watchable action (Layer B) is correct, and the
B15 substrate genuinely earns Layer A (4/4 band-reach vs ship 3/4 at far lower complexity). Short-range
excursions (B2-attacker template) are the only proven-legal drama domain (DRAMA-1).

**Where it breaks, and the fix:**

- **"30% steered for action" mis-locates the action.** The brake-beats (braking the momentary leader) create
  passes among the racers *behind* regardless of cohort — the action is not confined to a 30% subset. Harden:
  define the split as *which racers get THEATRICAL intermediate targets* (the arc-scripts), while the
  *compression* scripts act on whoever currently leads. Two different Layer-B primitives, one budget.
- **Unbudgeted arcs break band-reach — this is DRAMA-1's exact failure, not a hypothetical.** Deep hold-then-
  return arcs could not be undone within ±10% in the remaining distance (0/4 at every resolve). Harden with
  the missing piece (my N2 below): a **per-arc reachability budget** derived from the envelope × remaining
  distance. Every scripted excursion must fit its racer's remaining catch-up budget or it is shrunk/rejected
  at compile time. Without this the slider is unsafe; with it, band-reach is invariant by construction.
- **The slider is non-monotonic if scripts stack on the same moment** (more blockers → more dead finales, a
  real inversion). Harden: the slider drives a **gap-filling budget**, not a script count. Scripts are placed
  into the race's predicted *quiet windows* (the Longest-Actionless-Window signal), never on top of an
  in-progress resolution. Slider ↑ = fill more gaps with cheaper beats. Because every beat is outcome-neutral
  and short-range, the fairness-relevant quantity (finish band) is invariant to slider position ⇒
  monotonic-action / flat-fairness by construction, not by tuning.
- **Closed tracks will invert compression scripts into jams-without-resolution** (lane scarcity, the autopsy's
  28%-closed SPACE, the L182 wall). Harden: every compression beat carries a **mandatory lane-availability
  precondition and a max-dwell release** in progress-space (one global rule). If no lane is open, the beat
  does not fire (it is skipped, its budget returned to the pool) rather than jamming. See Risk 1.

## 2. My own proposals (≥2 new mechanisms, within the rules)

### N1 — THE ACCORDION (malus-side momentary-leader compression) — my flagship

**Mechanism.** At a seeded beat (any phase, gun-to-line), the *current* front racer of a chosen group eases
DOWN toward the malus floor (0.85) over a short window; the 2–4 racers immediately behind, running at NORMAL
speed, compress and pass; the braked racer then eases back UP to normal and re-joins, now chasing. The target
curve is a shallow V in speed-space (down, hold briefly, up) — pure min-jerk, no step. Repeatable through the
race on different momentary leaders / different bands.

**Why it adds action the list doesn't.** It is the only primitive that manufactures *genuine normal-speed
overtakes from the underused half of the envelope* (fact 3). P2 (Jam & Burst) is the same family but scoped to
an authored blocker mid-pack; the Accordion generalises it to *whoever leads, any phase* — which is exactly
the owner's whole-race brake-beat, and it is cheap enough to run as the always-on "something is always being
contested" thread. It also directly attacks the autopsy's finding that the front settles: braking the
momentary leader is the one move that *reliably* produces multiple front passes without boost.

**Fairness + the Leash distinction (owner asked).** Outcome-neutral: the braked racer's DRAWN place is
untouched; the V resolves (eases back up) and the chain checkpoint re-plan restores its path to the fixed
draw well before the finish. The **retired Leash (DEAD-ENDS §B)** was a *continuous physics rule* braking the
current leader to the floor to prevent escapes — it (a) ran every frame, (b) had no resolution, (c) promoted a
fresh escapee (it braked the whole front, and the dumped leader restructured the field), and (d) targeted the
*outcome* (cap the lead). The Accordion is (a) BRIEF (a bounded window), (b) SEEDED (drawn from the pool, not
always-on), (c) SELF-RESOLVING (eases back; the field re-normalises; no permanent restructure because it is
short-range), and (d) targets a *moment* (author one overtake story), never the finish. The distinction is
categorical: continuous-cap-of-the-outcome vs brief-scripted-compression-that-resolves. The measurable proof
it is not a Leash: after each beat the field's rank-set returns to its pre-beat trajectory toward the draw
(assert via the checkpoint re-plan), and the leader-escape / runaway metrics do not move.

**Leaks + guards.** Leak: braking a drawn-winner delays its B1 arrival → guard: budget + early release + the
re-plan (its remaining distance always suffices to re-reach). Leak: closed-track jam (no lane for the
compressed pack) → guard: the lane-availability precondition (skip if no lane). Leak: same racer braked every
race → guard: per-racer beat-exposure cap + seeded selection.

### N2 — THE REACHABILITY ACCOUNTANT (the piece DRAMA-1 was missing) — enabling mechanism

**Mechanism.** Not a story pattern but the *legality engine* that makes every story pattern safe and the
slider monotonic. At compile time, each racer has a **remaining catch-up budget** in ranks =
`0.25 × v0 × (1 − progress) × T / g` (the two-sided envelope integrated over the remaining distance — the same
number that governs whether the servo can reach a target). Every scripted excursion (fallbacker depth,
comebacker hold, accordion V) is checked against the budget of *every racer it displaces*; if an arc would
leave any racer unable to return to its drawn band by the finish, the compiler **shrinks the arc depth or its
hold-duration** (never the endpoint) until it fits, or drops it and returns its budget to the pool.

**Why it matters.** DRAMA-1 broke band-reach precisely because arcs were unbudgeted (deep holds couldn't be
undone in ±10%). The Accountant turns the inviolable envelope from a *wall you hit* into a *budget you spend* —
it is what lets the pool contain aggressive-looking scripts *and* guarantee ≥70% reach on all four tracks. It
is also what makes the slider provably monotone-fair: the slider spends more budget, but the Accountant never
lets total spend exceed reachability, so the finish is invariant. **This is my most important contribution:
without it the whole system is the DRAMA-1 failure re-run; with it, the pool is safe by construction.**

**Fairness.** It is the fairness guarantee itself: reach is invariant because no arc is admitted that a racer
cannot undo. Leak: budget mis-estimate on closed tracks (lap geometry) → guard: compute `g` and `T` from the
same shared duration/length model the servo uses (one source, closed-track-safe), and add a safety margin.

### N3 — THE MIGRATING DUEL (one sustained contest that travels the field)

**Mechanism.** Rather than scheduling many discrete swaps, author ONE sustained duel — two seeded band-local
racers that trade a position repeatedly over a long window — and make the duel *migrate*: it lives in a back
band early, a middle band at mid-race, and reaches B1 near the finish (seeded which bands, which racers). The
migration means the *front* contest arrives naturally late (the duel climbs into B1 for the finale) while the
*whole race* has a live contest somewhere at all times.

**Why it adds action the list doesn't.** P1 (Story Relay) schedules discrete stories to avoid gaps; the
Migrating Duel is a single cheap always-on thread that *guarantees* "one contest in progress" with far less
scheduling machinery, and it solves the hardest timing problem (front action late) as a side effect of
migration. It is also more physically legible than many simultaneous scripts (one duel the eye can follow),
which mitigates the scripted-look risk.

**Fairness.** Both duellists are band-local (they share a band → each reaches its own band → reach
unaffected) and outcome-neutral (drawn places restored). Migration is seeded, row-blind. Leak: the duel's B1
arrival collides with the drawn winner → guard: the duel *is* among the eventual B1 racers late (they are
drawn there), so no displacement; mid-race bands host different duellists, each returning to its draw.

## 3. The script pool (broad, whole-race, seeded, measurable)

**Phases:** SORT (0–~0.25, the field opens from the grid), BODY (~0.25–0.7), FINALE (~0.7–1.0). Scripts fire
in any phase — action spans the whole race (owner).

**Pool (aim for breadth; each is short-range + outcome-neutral + budgeted):**
- *Sort-phase:* START-JOSTLE (accordion on the gun-leader so the grid compresses immediately), EARLY-FLARE (a
  racer takes a brief visible lead, then is compressed back — a false dawn).
- *Body:* MIGRATING-DUEL (N3), BAND-DUEL-PAIRS (P4, 1–2 swaps in *every* band so the whole field lives),
  CORKSCREW-CASCADE (a short adjacent 3–4 ladder crossing in sequence), FALLBACKER-SETUP (a false leader
  climbs to the front).
- *Finale:* COMEBACKER (shallow hold → late climb into B1), FALLBACKER-RESOLVE (the false leader falls back to
  its draw), INTRA-B1-ROTATION (the B1 group trades the lead from ~0.7, seeded order), PHOTO-FINISH-FAN (P3:
  deliver B1 tightly fanned, honest physics decides — *one* script in the pool, not every race),
  ACCORDION-AT-THE-FRONT (a late momentary-leader brake for a final scramble).
- *Whole-race:* ACCORDION beats (N1), STORY-RELAY glue (P1).

**Per-race draw (seeded, row-blind):**
1. `scriptSeed = hash(raceSeed, globalSalt)` — track-independent; **never reads startRowIndex** (uses only
   drawn band + racer index).
2. Draw a **budget** B from the slider (B = malus-seconds + theatrical-cohort-size).
3. Sample a *timeline* of beats to spend B: quotas per phase (each phase gets a minimum), per band (every band
   gets ≥1 beat so the whole field lives), and a FINALE floor (guarantee a front contest late). Beat *types*
   are drawn with slider-weighted family probabilities.
4. Compile against constraints: non-overlap in the front-view, the Reachability Accountant (N2), per-racer
   exposure caps, left/right parity, and the **Longest-Actionless-Window ceiling** (no predicted front-view
   gap longer than a global threshold — insert the cheapest legal beat into any gap that exceeds it).
5. Deterministic bounded re-draw if constraints fail.

**Variety measurement (no recognizable repetition across seeds):**
- **Script-type entropy** `H` over the per-race type multiset — require near-max.
- **Timeline-collision rate** `C` — fraction of seeds whose beat-timeline hash is a near-duplicate of another —
  require low.
- **Onset-autocorrelation** `P` of beat starts — the eye detects *rhythm*; require no periodic peak (this is
  the metric the count-based ones miss).
- **Role-uniformity** — over seeds, P(racer index i plays role r) must be flat (no "index 3 is always the
  comebacker"), a direct row-blind/seed-fairness check.
- **Longest-Actionless-Window** distribution (p50/p90) — the product metric; must fall vs ship AND B15.
Variety passes iff `H` high, `C` low, `P` flat, role-uniform, and L-actionless improved.

## 4. Fairness argument, per mechanism class

**The universal carrier.** The FIXED DRAW is the terminal contract; every script is OUTCOME-NEUTRAL
(endpoint = drawn place) and the chain checkpoint re-plan (L181-safe) restores any unresolved excursion toward
the draw. **Therefore the FINISH band is invariant to all mid-race theatrics** ⇒ overall band-reach ≥70% and
per-row Holm are unchanged *by construction* — the gate is not "hopefully survived," it is untouched, because
what it measures (the finish) is exactly what the scripts never alter.

**Named leaks + guards:**
- **L-reach** (an arc doesn't resolve; racer off its band at the line): the Reachability Accountant (N2) admits
  no such arc; the re-plan absorbs the rest.
- **L-winner** (a brake/hold delays a drawn-B1 racer past reachability): budget + early release + re-plan
  guarantee re-arrival; assert per-race that every drawn-B1 racer's remaining budget ≥ its displacement.
- **L-row** (action correlates with start row): selection is seeded on drawn-band+index only; audit with the
  standing per-row Holm on band-reach — it will flag any leak.
- **L-saturation** (same racers pinned at a bound across a race): per-racer saturation cooldown before
  re-eligibility.
- **L-leash** (leader-brake beats degenerate into the retired continuous Leash): the categorical distinction in
  N1 — brief, seeded, self-resolving, moment-targeted — plus the assertion that runaway/escape metrics do not
  move and the field's post-beat trajectory returns to the draw.
- **L-closed** (lane scarcity turns compression into a jam that strands racers): the lane-availability
  precondition + max-dwell release; and the mandatory open-AND-closed gate (a mechanism that only passes open
  is a KILL, per L182).

## 5. Feasibility

**Carries directly:** the chain substrate + checkpoints (target authoring + re-plan); the hero-curve
primitives (`makeHeroCurve`/`anchorHeroCurve`/`sampleHeroCurve`, min-jerk) — the accordion V and every arc are
just waypoint curves; the servo actuator + the two-sided clamp (unchanged — the engine we re-aim); the
overlap-free traffic core (lane changes, honest blocking); and the observers — band-reach, runaway-parade,
outcome-front-battle, and crucially the **FRONT-AUTOPSY observer already measures front-group closing/gaps**,
so the Longest-Actionless-Window observer is a small extension of code that exists.

**New:** the script compiler/scheduler (draw → quota → timeline → constraint-compile → re-draw); the
Reachability Accountant (N2); the malus-side beat executor (the V-curve target + the lane precondition); the
variety-metrics pipeline; the Longest-Actionless-Window observer.

**Honest cost class:** a *race-direction subsystem addition* on top of B15 — reusing the actuator, curves,
clamp, and traffic core. Bigger than a flag, smaller than a core rebuild. The riskiest new code is the
compiler's constraint-satisfaction (keep it a bounded seeded greedy fill, not a solver).

## 6. Cheapest decisive sim plan

**Screen: 4 tracks (2 open, 2 closed) × N=20, paired vs BOTH ship AND plain B15.** Run the cheapest,
highest-signal arm first — the malus thesis is the whole bet, so test it alone before the compiler exists:

1. **B15 + ACCORDION only** (hand-scheduled beats, not the full compiler), slider ∈ {low, mid, high}. This
   tests: (a) does malus-side compression produce passes at all, (b) does it hold band-reach, (c) slider
   monotonicity, (d) the open/closed split (does it die on closed for lack of lanes?). If the Accordion fails
   here, the whole system is in doubt — fail fast.
2. **B15 + budgeted short arcs** (fallbacker/comebacker via N2), no accordion — isolates the arc family.
3. **B15 + Migrating Duel** — isolates the always-on-contest thread.
4. **B15 + full compiler pool** — the integrated system.

**Pre-registered kill criteria (screen; ALL must hold every track):**
- band-reach ≥70%; per-row Holm no worse than B15; strict-phase overlaps = 0; envelope-clamp violations = 0.
- **Action beats BOTH comparators:** lead-changes > ship AND > B15; dead-finale < ship AND < B15;
  **Longest-Actionless-Window p50 AND p90 < ship AND < B15** (the eye metric is the real bar).
- **Slider monotone:** action score non-decreasing across {low,mid,high}; fairness metrics flat within a guard
  band (no drift).
- **Story-success rate** per active family above a floor (a scheduled beat that never materialises is noise).
- **Closed not inverted:** the primary action metrics must not be open-good/closed-bad (L182 tripwire).
Pre-registered KILLs: any fairness/overlap/envelope breach · action not beating BOTH comparators · slider
non-monotone · closed-track inversion · a per-track value needed.

**Gate (N=100 × 4):** winning arms only. Confirm the hard gates, slider monotonicity at N, variety metrics
stable (entropy/collision/onset-autocorr/role-uniformity), and no topology inversion. Report the
Longest-Actionless-Window curves vs both comparators as the headline.

## 7. Risks — the two or three ways this most likely dies (blunt)

1. **Closed-track lane scarcity kills the Accordion (most likely).** Braking the momentary leader compresses
   the pack, but on searound/dirt there are few lanes for the compressed pack to pass THROUGH — so the beat
   produces a jam, not overtakes, and the finale goes *deader*. This is the autopsy's own closed-track SPACE
   secondary (28%) and the L182 open/closed wall. The lane-precondition (skip if no lane) protects fairness
   but means the Accordion may simply *not fire* on closed tracks → action rises on open, flat on closed →
   topology inversion → KILL. The whole malus thesis is strongest exactly where lanes are scarcest is worst.
2. **The servo already wins (DRAMA-1's ghost).** The scripts add *visible* beats, but the aggregate
   lead-change count may not exceed the servo's own churn — the beats and the servo compete for the same
   envelope and the same lanes, and DRAMA-1 showed the servo is already near-optimal for action-under-
   fairness. Outcome: metrics clean, Longest-Actionless-Window barely improved, "numerically fine, visually
   the same." The Longest-Actionless-Window metric is the one that could still show a real win here (the eye
   watches pauses, not counts) — which is why it must be the headline, not lead-change count.
3. **Scripted-look at the eye (the un-measurable wall).** A pool of authored beats, however seeded and varied,
   may read as staged — the variety metrics pass, the owner's eye rejects "they're being told what to do."
   The Accordion and Migrating Duel are the most *physical* primitives (compression and a single followable
   duel are how real racing looks), so lead with them; the more simultaneous authored micro-swaps you add, the
   higher this risk. A sim PASS is necessary, not sufficient — the eye-test is the terminal gate, and it can
   veto a metrically perfect pool.

## Closing line

**Build the ACCORDION first, on top of B15, gated by the Reachability Accountant, and judge it by the
Longest-Actionless-Window — because the autopsy proved the fuel is already there and the envelope's cheap half
(braking) is the one unused lever, and DRAMA-1 proved that anything unbudgeted breaks reach; the Accordion is
the smallest mechanism that turns the one measured, unused, legal resource (malus-side compression of the
momentary leader) into whole-race overtakes, and it will either clear the closed-track lane-scarcity wall or
name it precisely — which is the one thing we still need to know before committing the full script compiler.**
