# System rescue — open proposals for the late race — CC ideation

**Report-only. Author: CC. Master `26b2c34`. No code changed, no sims run.** Ideation round — bold by
invitation. Grounded in the wall the two Evolution acts hit (LESSONS 178/180/181/182) and what the shipped
world actually measures (REBASELINE / GS-CONFIRM-GATE). Written without reference to the Copilot file.

## The wall, stated precisely (so no proposal re-walks it)

Three facts bound the solution space:

1. **Fairness and contest are the same static-slot force** (L181). The servo produces band-reach AND the
   finale comeback from one `rankError` pull toward the frozen assignment. *Weakening* that pull (following
   the field, blending toward live rank) kills both. So a rescue must **ADD** contest energy, never subtract
   from the steering force.
2. **Sparse late-window dice cannot reach the finish** (L182). A scheduled-dice tilt in `[0.80,0.90]` fires
   a handful of times and then the last ~10% — open re-expands (long run-out), closed churns (bunched laps)
   — plays out untouched. Anything acting only at roll boundaries in the finale window is exhausted.
3. **Action is AUTHORED, not liberated** (L178). Steering racers along authored curves CREATES top-5 churn
   (B2-attackers: +21% action, fairness clean); *freeing* the servo SETTLES the field. The one shipped
   mechanism that reliably makes late action is choreography.

The synthesis those three force: **the rescue must add DENSE (every-tick, physics-or-servo, not sparse
dice) contest energy that is AUTHORED (not liberated) and layered ON TOP of the intact restoring force,
reaching all the way to the line.** Every proposal below is measured against that sentence, plus the four
hard requirements and the exclusion list.

One more load-bearing fact the reports establish and every proposal exploits: **band-reach only scores BAND
membership, not intra-band RANK, and the actual winner is already the honest B1 run-out (winnerRacerId is a
frozen *reporting* label, not the steered outcome).** So the intra-B1 finishing order is *already* free to
be contested without touching band-reach — the finale is dead not because the winner is pre-decided, but
because the front arrives *spread and settled*. That is the seam to attack.

---

## Proposal 1 — Authored Convergence Finale ("Photo Finish"): kill the release, hold the front to the line

**Core mechanism.** Extend the existing hero-choreography subsystem (the B2-attacker "Attack & Fall"
generator that already authors climb-then-fall curves) so that, in the OUTCOME phase, the 3–5 front-band
heroes are authored to *converge* — their curves steer them toward a tight neck-and-neck cluster (say within
~1 racer length) by ~0.92 — and then the choreographed steering is **held to the finish line instead of
released** (`choreoReleaseProgress`, currently ~0.97, is what today lets the front let go and re-spread,
which L178 says settles the field). The honest run-out among the converged cluster then decides a genuine
multi-way photo finish. The winner is whichever converged racer's honest late spread edges ahead by a
fraction of a length — undecided until the line, fair over many races because the *cluster membership* is
the fairness-assigned front band.

**Why it clears the wall.** It is DENSE (the servo steers every tick, so it reaches the last 10% that sparse
dice could not — the direct answer to L182), AUTHORED (fixed convergence curves decided at plan time, the
proven L178 model, *not* following the live field so L181's force is untouched — the curves ARE the servo's
steering, aimed at a pre-authored converging endpoint), and it ADDS energy on top of the restoring force
rather than subtracting. It is track-agnostic by construction: on open tracks it *counters* the last-10%
re-expansion by not releasing; on closed tracks it holds the front tight *without* bleeding anyone into the
pack.

**Four hard requirements.** *Fair:* band steering is unchanged → band-reach ≥70% held; the converged cluster
is the fairness-assigned front band, and the winner-among-cluster is uniform-ish over races (as fair as
today's arbitrary frozen winner, plausibly fairer). *Physical:* convergence is honest-band curve-following
(the same `[0.85,1.10]` trajectory ceiling the heroes already obey) — the risk is sustained near-ceiling
steering *looking* like braking, which the decisive test measures. *No overlap:* the lateral/overlap gate is
untouched; a photo finish is racers side-by-side within lane tolerance, and the convergence target must be
clamped to respect the overlap gate (never authored tighter than the lane geometry allows). *Action:* a
multi-way converging photo finish is the most exciting finale the engine can produce.

**Survives / dies.** *Survives:* static slot assignment, the servo, the entire hero-choreography generator,
the phase structure, all physics. *Dies:* the OUTCOME "release to natural run-out" (`choreoReleaseProgress`
becomes "hold to line"); and the finale's current identity as a settled run-out.

**Cost class + first prototype.** Overlay-plus on the current world (it reuses `heroCurveGenerator` +
`sampleHeroCurve` + the servo). First sim-only prototype: author front-band curves whose OUTCOME segment
converges to a ±1 L band by ~0.92 and hold steering to `finishT`; add a "finish spread" observer
(top-3 gap at the line, lengths) and a "finale lead-changes in [0.9,1.0]" observer. ~1 generator change +
2 observers.

**Biggest risk + cheapest decisive test.** Risk: the convergence needs speeds outside the honest band, or
*looks* like a visible hand slowing the leader (the physical-correctness failure). Decisive sim-first
SCREEN (experiment branch, sim-reachable only): CONTROL vs CONVERGENCE on luger-hill + searound, N per arm;
kill if band-reach breaks the 70% floor, OR the mean finale trajectoryMult sits pinned at the ceiling
(unnatural steering proxy), OR finish-spread does not tighten with lead-changes up on BOTH tracks. Wire the
browser only after a positive SCREEN + owner eye-test on the "does it look natural" question the sim can't
answer.

**Prior art.** Real photo finishes; the last-lap sprint in track cycling / the final straight in horse
racing — the field is authored (by tactics) to converge and the winner is decided in the last meters. Every
racing broadcast's "here they come together for the line."

**Recommendation (1):** the strongest lead — it is the L178 authoring model pushed into the exact window the
dice couldn't reach, with the restoring force fully intact.

---

## Proposal 2 — Late-Race Environmental Contest: honest, fairness-neutral track physics that reshuffle the front

**Core mechanism.** Add a physical, everyone-experiences-it environmental effect active in the final stretch
that *physically* compresses/reshuffles the front — the shipped drafting/slipstream subsystem, amplified in
the OUTCOME phase, is the simplest instance: a trailing racer within a draft distance of the one ahead gets
a real, continuous aerodynamic speed gain, so chasers close and slingshot past through physics, densely,
all the way to the line. More generally: a "run-in" feature — a final-stretch terrain/draft/aero zone,
defined by ONE track-agnostic rule (e.g. "the last X% is a draft-amplified zone") — that acts on the field
as an environment, not as steering aimed at any racer.

**Why it clears the wall.** It is DENSE and CONTINUOUS (physics acts every tick, reaching the last 10% —
the L182 answer via a completely different route than dice), it touches the servo/target not at all (L181
safe), and it is fairness-neutral by construction (the environment is identical for every racer). It is a
physics ADD, not a steering subtract.

**Four hard requirements.** *Fair:* the effect is the same for all racers and independent of their assigned
rank, so band steering (and band-reach) is untouched; it must be tuned so it cannot shove a racer across a
band edge (a bounded speed gain, not a teleport). *Physical:* it IS physics — real slipstream/terrain,
already shipped and honest. *No overlap:* the lateral gate is unchanged; drafting closes longitudinal gaps,
the overlap gate still forbids co-location. *Action:* continuous slingshot passes at the line.

**Survives / dies.** *Survives:* everything structural — this is a physics-parameter/zone change.
*Dies:* nothing; the finale run-out becomes draft-contested.

**Cost class + first prototype.** Overlay on the current world (a phase-scoped strength on the existing
drafting force, or a track-length-fraction "run-in zone" scalar). First prototype: OUTCOME-scoped draft
amplification + a "finale overtakes in [0.9,1.0]" observer + the finish-spread observer from Proposal 1.

**Biggest risk + cheapest decisive test.** Risk — it is *adjacent to the vetoed "P2-lift"*: the owner may
read amplified drafting as an artificial chaser boost dressed in physics. The honest distinction (physical,
multi-racer, distance-gated, already shipped, available to all, not aimed at P2) must survive the eye, not
just the argument. Second risk: slipstream only KEEPS a tight front tight — it cannot RE-gather a
re-expanded open front (the chaser must already be in the draft), so on open tracks it may need Proposal 1's
convergence to feed it a tight front (the two compose). Decisive SCREEN: CONTROL vs DRAFT-AMP on both
tracks; kill if band-reach breaks, if open-track finale action does not move (confirming it can't re-gather),
or on the owner's eye-test of the P2-lift-adjacency question.

**Prior art.** Mario Kart / F-Zero slipstream, F1 DRS + tow, NASCAR drafting packs, speed-skating and cycling
pelotons, downhill draft in luge/skiing (directly relevant to luger-hill). All make late passes *through
honest shared physics* — the canonical "keep the pack together for a finish" solution in shipped games.

**Recommendation (2):** strong and cheap, but its standalone reach is limited on open tracks and it must
clear the P2-lift-adjacency eye-test — best as Proposal 1's physical partner rather than a solo rescue.

---

## Proposal 3 — Ensemble Fairness: the season is fair, the race is a contest (a foundation swap)

**Core mechanism.** Move the fairness guarantee OUT of within-race steering and INTO an across-race
scheduler. Today every single race is made fair by steering each racer to its assigned band — which is
exactly the force that also pre-settles the finale (L181). Instead: run each race with drastically REDUCED
servo steering (a genuine, mostly-physics contest where the front is honestly undecided), and guarantee
fairness over a rolling window of races via a seeded scheduler that shapes each racer's *starting
conditions* (grid, matchups) so that, across the window, every racer gets its fair share of favorable draws
and its band-reach-equivalent holds **at the season level**. A single race becomes a real contest; the
promise "everyone gets their fair outcomes" is kept over the set, not the instance.

**Why it clears the wall.** It doesn't fight L181/L182 — it *dissolves* them: with the steering force
largely removed from the finale, there is no pre-settled outcome to make contested, because the outcome was
never pre-decided. The contest is the honest physics; fairness lives elsewhere.

**Four hard requirements.** *Fair:* this is the hard one — it satisfies fairness *as an ensemble* (season
band-reach ≥ today, owner mark measured over the window), which is *at least as strong* but *different in
kind* from per-race fairness; it requires the owner to accept that a single race may be lopsided while the
season is provably fair. *Physical:* MORE physical than today (less steering = more honest motion).
*No overlap:* unchanged. *Action:* each race is a genuine, minimally-steered contest — maximally
action-loaded.

**Survives / dies.** *Survives:* physics, overlap, racer identities, the grid/assignment machinery (repurposed
as the scheduler's lever). *Dies:* heavy within-race servo steering (kept only as a soft band-containment
floor); the per-race fairness contract as the primary promise.

**Cost class + first prototype.** New foundation (the biggest of the three). First sim-only prototype: run a
simulated "season" of N races with reduced steering + a seeded fairness scheduler, and measure (a) season
band-reach vs today, (b) per-race action, (c) per-race unfairness variance (the thing the owner would watch).

**Biggest risk + cheapest decisive test.** Risk: "fair over the season" is a weaker felt promise — a viewer
watches ONE race, and a visibly lopsided single race may read as unfair regardless of season stats; and the
scheduler may have to constrain start conditions so much that races become predictable (re-introducing the
settle). Decisive SCREEN: a simulated season on both tracks measuring season band-reach AND the distribution
of per-race fairness — kill if season fairness needs enough scheduling to make individual races predictable,
or if per-race unfairness variance is too high for the owner's eye. This one needs an owner decision on the
fairness *definition* before any build.

**Prior art.** Sports leagues/seasons (a season is fair, a single game is a contest), tournament brackets,
matchmaking systems, and casino/party games where the house edge is fair over many plays while each play is
exciting — the standard way real systems reconcile "fair" with "thrilling."

**Recommendation (3):** the highest ceiling and the cleanest escape from L181, but it trades the per-race
fairness contract — pursue only if the owner will re-open the fairness *definition*.

---

## Bonus (one line, orthogonal, cheapest of all)

**A viewing/prediction layer** — pre-race "who reaches the front" prediction + live commentary/odds framing
(horse-race-betting / party-predictor prior art) makes even a settled finish exciting to WATCH without
touching physics or fairness at all; it does not fix the OUTCOME dynamics the owner named, but it is the
cheapest lever on "exciting to watch" and composes with any of the above.

---

## Closing line

**Build Proposal 1 (Authored Convergence Finale) first — it is the one rescue that adds DENSE, AUTHORED
contest energy reaching the actual finish line while leaving the fairness/restoring force completely intact,
i.e. the only candidate that satisfies all three lessons at once; Proposal 2 (physical slipstream) is its
natural partner to hold the convergence together, and Proposal 3 (ensemble fairness) is the bigger swing to
hold only if the owner will re-open what "fair" means.**
