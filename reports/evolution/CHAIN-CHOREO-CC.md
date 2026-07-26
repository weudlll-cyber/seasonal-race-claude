# Chain choreography — concept development — CC

**Report-only. Author: CC. Master `58b9b8f`. No code, no sims.** Hardening the owner's chain-choreography
concept (develop, do not replace). Grounded in DEAD-ENDS.md, Lessons 172/178/181/182, and the shipped
hero-curve generator + servo + overlap traffic. Written without reference to the Copilot file.

## The reframing that makes the concept precise (and the risk sharp)

One observation reshapes the whole design. **The shipped servo already moves the entire field from the
start order to the fair-draw final — the full reordering happens today.** It is DEAD not because the field
doesn't reorder, but because it reorders *monotonically and diffusely*: each racer heads straight for its
assigned slot and, once near it, holds — the crossings are spread thin and look like a settle, never a
duel. **Chain choreography does not add net motion; it RE-SHAPES the same net reordering into punctuated,
clustered, visible overtakes** — staged at checkpoints, plus a small number of deliberate round-trip
crossings for extra duels. This is exactly Lesson 178 (orchestration makes the crossings; the crossings are
where curves cross) generalized from 2–4 heroes to the whole field, in stages.

The consequence for feasibility is precise: the **net** reordering is already proven feasible (it is what
ships). The new cost is only (a) the **clustering rate** — packing a segment's crossings into a short window
demands more instantaneous displacement than a smooth settle — and (b) the **extra round-trip crossings**.
Both are budgetable; the whole design lives or dies on keeping them inside the honest envelope and the
track's lanes.

---

## 1. Mechanism design (concrete)

**Formations are POSITION formations, not rank labels** (Lesson 172). A formation `F_k` assigns every racer
a target *place on the track* (longitudinal arc-position + lane) at checkpoint `k`. `F_final` is the shipped
**fair random draw** — each racer's assigned finishing place, uniform-random and start-row-independent,
decided once at plan time and never changed.

**Checkpoint count, duration-scaled (no hardcoded progress constant).** `K = clamp(round(duration_sec /
SEG_SEC), K_min, K_max)` with `SEG_SEC` a target *segment duration in seconds* (the same duration-scaled
pattern the shipped re-roll uses via `reRollIntervalDivisor`). A 30 s race gets a few segments, a 300 s race
gets many — so **crossings-per-second (action density) is constant across durations**, which a fixed
checkpoint COUNT would not achieve.

**The crossing schedule (how a segment plans its crossings).** Let `π` be the fair-draw permutation
(start order → `F_final`). Its **inversions are the necessary crossings** — the real overtakes required to
realize the fair result. Decompose `π` into a sequence of adjacent transpositions and **distribute them
across the `K` segments**, then **add a small budget `m_extra` of round-trip pairs** per segment — a
transposition `(i,j)` this segment, its inverse `(j,i)` a later segment — which net to identity (do NOT
change the outcome) but manufacture extra visible duels where `π`'s own crossings are sparse. Each segment's
`F_{k+1}` is `F_k` with that segment's transpositions applied. **Action becomes constructed and countable:
each segment has a known number of authored crossings.**

**Per-racer trajectory + steering.** Each racer gets a curve through its checkpoint places to `F_final`,
built with the shipped **minimum-jerk / quintic-Hermite waypoint generator** so each authored crossing is a
smooth swap (two racers' position-curves crossing = a natural-looking overtake, exactly the hero mechanism).
The servo steers each racer toward the *current sample of its own curve* (a track position), in position
space, inside the honest speed envelope — the shipped actuator, generalized from heroes to all `N`.

**At a checkpoint (re-plan mechanics).** Read the actual field state; regenerate the remaining trajectories
(section 2). Nothing snaps; the curves are simply re-anchored to reality and re-aimed at the fixed final.

---

## 2. The adaptation rule (L181-safe by construction)

> **At each checkpoint, read the actual place of every racer, `A_k`. For each racer i, rebuild its remaining
> trajectory as a minimum-jerk curve that STARTS at its actual place `A_k(i)` and ENDS at the FIXED place
> `F_final(i)` (its plan-time fair-draw slot, never altered), passing through the remaining intermediate
> formations regenerated from (seed, `A_k`, remaining crossing budget). The racer always steers toward a
> point on this curve that lies AHEAD of it toward `F_final` — never toward `A_k`, never a blend toward the
> live order.**

This is a **GPS reroute**: miss a turn and it re-routes from *where you are* to the *fixed destination* — it
never changes the destination to "wherever you are." The reviewer's L181 check is a one-liner: *is any
target equal to, or blended toward, the live field order?* No — the live order is only the **start** of the
re-authored curve; the **attractor is the fixed `F_final`**, so the restoring force toward the fair result
is fully alive in every segment, and the error toward the final is never zeroed by the live state (the AFF
failure, L181). A miss is **absorbed** (continue from reality toward final), never **forced** (no snap-back
to the intended intermediate). Round-trip action-pairs that were missed are simply dropped from the
remaining budget — they were outcome-neutral, so dropping them costs nothing.

---

## 3. Start-row fairness argument

`F_final` is the shipped fair draw ⇒ `P(assigned finishing place | start row)` is uniform ⇒ equal
win-chance by row — **the shipped fairness, unchanged**, provided every racer actually *reaches* its
assigned final place. Since the attractor and restoring force are the shipped ones, reachability is the
shipped guarantee **plus** whatever the intermediate crossings cost.

**Where bias could leak, and the guard.** A back-row racer drawn to WIN must travel back-to-front — a long
path with many crossings; a front-row racer drawn to win has a short path. If long paths are *less reliably
completed within the envelope/lanes*, back-row-assigned-to-win racers reach place 1 less often ⇒ bias
against back rows. **But the NET travel back-to-front is already what the shipped servo does feasibly and
row-fairly** (band-reach ≥70%, zero Holm-unfair rows). The only NEW reachability cost is the *clustering* of
crossings and the *round-trip extras* — so the design stays row-neutral **iff the extra clustering + extras
are budgeted small enough that every path, including the longest, still completes within the envelope over
the race** (section 6). The named leak is therefore a *density* budget, and it must be verified on **both an
open and a closed track** — because DEAD-ENDS records that some track geometries carry a *baseline* start-row
bias independent of the mechanism, and a density that is fine on a wide track can jam a narrow one and skew
its rows.

---

## 4. The re-roll question

**Remove the scheduled re-roll; spend the reclaimed envelope on executing the choreography.** Argument:
the re-roll's only job (per DEAD-ENDS) was to inject randomness so an otherwise-uniform field spreads at
all. Chain choreography makes the field spread and cross *by authored design*, so the re-roll's function is
subsumed. Worse, keeping it **underneath** would push racers off their authored curves, forcing the servo to
spend envelope correcting the dice instead of executing crossings — the two mechanisms fight, and the duels
blur. So the scheduled dice **go**. I would retain, at most, a *tiny* continuous per-racer texture-noise
(far below the shipped re-roll amplitude) purely so the crossings do not look mechanically clean — a
naturalness knob subordinate to the choreography, not a spreading mechanism, and the first thing cut if it
competes for envelope. Primary position: **re-roll out.**

---

## 5. Scripted-look risk + a measurable diversity check

The danger: whole-field authored trajectories reading as coordinated "waves" — the owner's "on rails" veto.
Guards: (a) the crossing SCHEDULE (which pairs cross, in which segment, with which swap shape) is generated
from the seed, so it differs every race; (b) the round-trip extras are placed with per-seed variety, never a
fixed "big shuffle at segment 3" signature; (c) the re-plan injects real per-race divergence from the actual
field state; (d) crossings within a segment are *staggered* in time, not simultaneous, so no synchronized
wave.

**Measurable diversity check — per-checkpoint position-occupancy entropy across seeds.** For each checkpoint
`k` and each track place `p`, over many seeds, look at the distribution of *which racer occupies `p`*;
compute its Shannon entropy and require it near the maximum (`≈ log N`, i.e. any racer can be anywhere by
mid-race). A low-entropy checkpoint = a recognizable template = on-rails. Pair it with a **crossing-schedule
diversity** metric (entropy of the multiset of crossing pairs/timings across seeds). Both near-max ⇒
statistically not on rails. (Caveat: the eye can still reject a statistically-diverse-but-coordinated look;
this metric is necessary, not sufficient — the owner eye-test remains the final gate, section 8.)

---

## 6. Feasibility on the existing machinery

- **heroCurveGenerator.js** — the waypoint / minimum-jerk / quintic-Hermite curve core and its anchoring
  carry directly; the generalization is (i) generate for all `N`, not 2–4, (ii) multi-waypoint (checkpoints)
  not single-endpoint, (iii) the seed-driven crossing schedule. Moderate extension of existing code.
- **The servo (racePlanner.update)** — the actuator (steer toward a target within the `[0.85,1.10]`
  envelope) carries; the target switches from a rank to a **position** on the curve (Lesson 172-correct).
  Moderate.
- **Traffic / overlap (raceBehavior.js + the proven overlap-free core)** — carries **directly**: authored
  crossings execute as honest lane-change overtakes under the no-co-location gate (0 overlap). This is the
  hardest part and it already exists.
- **New:** the multi-checkpoint formation generator, the re-plan, position-space whole-field targeting, and
  removing the re-roll. **Cost class: subsystem replacement of the plan + servo-target generation, reusing
  the curve generator, the servo actuator, and the traffic core.** Not a full rebuild — the physics and the
  proven pieces survive.

## 7. Cheapest decisive sim-first prototype (exp/chain-choreo, sim-only)

Whole-field chain choreography: seed-generated intermediate formations toward the fixed fair draw, `K`
duration-scaled checkpoints, authored crossings per segment (net + small extras), position-space servo in
the envelope, re-plan at checkpoints, the overlap-free traffic core, **re-roll OFF** — one global rule set,
no per-track values. Measure on **luger-hill (open) + searound (closed)**, ~200 seeds each.

**Pre-registered kill criteria — KILL if ANY:**
- `P(win | start row)` is not statistically equal across rows on **EITHER** track (row bias leaks — measure
  both, per the DEAD-ENDS structural finding);
- action does not beat the shipped baseline (executed overtakes per segment ≈ authored count; lead-changes
  up; dead-finale rate below the shipped ~10%) — i.e. the authored crossings don't materialize;
- any overlap violation (> 0);
- reachability fails — racers cannot complete their paths within the envelope/lanes, so the winner is not the
  fair-draw assignee often enough (a band-reach-equivalent break);
- restoring fairness or action would need a **per-track** value (crossing budget that fits searound wastes
  luger, or vice-versa).

## 8. Risks — the two or three ways this most likely dies

1. **Clustering exceeds the envelope (the capacity wall).** Packing a segment's crossings into a short
   window demands instantaneous displacement beyond `[0.85,1.10]`; to stay honest you thin the clustering,
   at which point it looks like the shipped settle again — no action gained. The narrow envelope is the same
   wall the project keeps hitting; chain choreography must find a clustering rate that is both *visible* and
   *feasible*, and that window may be empty.
2. **Traffic lanes on narrow tracks (the open/closed wall, proto-2 / Lesson 182 again).** Authored crossings
   assume racers can swap, but the overlap-free core *blocks* when no lane is open; searound (few lanes for a
   full field) cannot execute many simultaneous crossings, so the choreography jams, misses cascade, and the
   re-plan chases — breaking fairness or action on the closed track while the open track is fine. A crossing
   budget that respects the narrowest track is per-track-shaped, which is barred; a single global budget must
   fit both, and may not exist. **This is the most likely killer.**
3. **On-rails feel (the eye, not the metric).** The very authoring that guarantees countable action is what
   risks a coordinated, scripted look; the entropy check can pass while the owner's eye still rejects
   "they're on a track." This can only be settled by an eye-test, so a sim PASS is necessary but not
   sufficient, and the concept can die at the browser even after clearing every number.

---

## Closing line

**Chain choreography is the most principled rescue attempt yet — it keeps the shipped fair final and its
restoring force fully alive (L181-safe by the GPS-reroute adaptation), steers position not rank (L172),
uses servo choreography not dice (L182), and generalizes the one measured-working mechanism (L178) — so it
should be prototyped; but build it knowing the decisive test is not fairness (that is inherited) but whether
a SINGLE global crossing-density can be both feasible in the narrow honest envelope AND executable in the
lanes of a closed track, because that open/closed capacity wall is where it most likely dies.**
