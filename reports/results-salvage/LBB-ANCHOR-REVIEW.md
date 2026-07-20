# LBB-ANCHOR — should the pass-path free-side check be anchored on the target? (read-only; two critiques)

*One question, two independent sections, not converged. This file previously held a stub review of unknown
provenance; it is replaced because each section must state what it checked ITSELF (independence has failed
twice in this investigation — a fabricated section, and a lateral-only "decisive" test). Where a section
reuses LBB-TRACE-3's numbers it says so.*

---

## CRITIQUE A — CC

**What I checked myself (this review, source only — no runs):** in `raceBehavior.js` I read `isSideFree`,
the pass-candidate target construction, `chooseFreeLaneDir`'s call into `isSideFree`, the §4b overlap
resolver's target, and the shared-geometry comment; in `storage/defaults.js` I read `softSteeringClearancePct`
(= **0.0**). I did NOT re-derive the flip counts — the 5/8 "swept-onto-neighbour" split is taken from
LBB-TRACE-3 (sanity-verified there, 484/484), used as an established input.

**1. Geometry — CORRECT at source.** Pass steering target = `leader.physicalY + dir·offsetY`, with
`offsetY = lbHalfSpan·(1 + softSteeringClearancePct)` and the shipped `softSteeringClearancePct = 0.0`, so
`offsetY = lbHalfSpan`. `chooseFreeLaneDir` passes `lbHalfSpan` as `isSideFree`'s `lateralHalfSpan`, and
`isSideFree` checks `racer.physicalY + dir·lateralHalfSpan` = `trailer.physicalY + dir·lbHalfSpan`. The two
points differ by `leader.physicalY − trailer.physicalY`, i.e. the lateral gap `dY`. At `dY ≈ 0` they
coincide (check correct); as the dodge proceeds and the trailer climbs away from the held leader, `dY` grows
toward `brakeSameLaneY` and the check point ends up a full `lbHalfSpan` BEYOND the destination — space the
racer never enters. Caveat I verified: this "exactly `dY`" identity holds only at the default clearance 0; a
nonzero `softSteeringClearancePct` adds a clearance term to the divergence.

**2. Is target-anchoring the RIGHT check? Better, but a PARTIAL answer.** The self-anchored check is a
"look one body-width ahead in `dir` from where I am now" test — reasonable at dodge onset, but once the
racer has nearly arrived it tests a body-width past the destination and vetoes on phantom occupancy the
racer will never reach. That over-reach IS the confirmed cause of 5 of 8 flips (LBB-TRACE-3): the trailer
carried this forward-looking window onto a longitudinally-adjacent neighbour that sat BEYOND the destination.
Anchoring the check on the destination removes that over-reach and would not flip on those five. **But
destination-only tests only the endpoint and ignores the transit corridor** the racer sweeps between its
current position and the destination — a racer sitting en route would be missed, and non-penetration for it
would fall to the hard-separation backstop, which the file explicitly says is a last-resort catch, not the
guarantee. So destination-anchoring trades an over-veto for an en-route blind spot. **The honest check is a
swept one (current position → destination), which covers both.** That is more than an anchor swap: it is a
segment test, and it needs "where he is going" as a single source shared with the steering.

**3. The other call site (§4b overlap resolver).** It also calls `isSideFree` (self-anchored) while its
steering target is obstacle-anchored (`obstacle.physicalY + d·ssOffsetY`) — the same mismatch. Difference:
§4b runs only in the overlap regime (`|dY| ≤ lateralHalfSpan`), so the divergence is bounded by a contact
width and transient. Changing only the pass caller's anchoring leaves the two callers asking different
questions, and the comment's promise — "the SAME isSideFree geometry, so 'free now' means the same thing in
both places" — becomes textually false. My read: the promise is about the shared predicate, not the callers'
anchors, so behaviour can stay acceptable, but the comment must be retired or the two reconciled. §4b's
bounded mismatch makes it lower priority, not exempt.

**4. What happens to (d)?** Do not pre-judge it removable. Target/swept anchoring removes the PHANTOM flips
(5/8) but not the REAL ones (traffic actually at the destination — the 2 "both moved" and the 1 longitudinal
entry should still, correctly, flip). And critically: **anchoring is a free-side fix; it does not touch the
long brakes.** Those (LBB-BLOCKDIST) are (d) vetoing on a small sustained velocity while `dir` never changes
and the side stays free — a velocity mechanism, not a free-side one. So after anchoring, (d) would still be
doing two jobs: damping the momentum on genuine flips (its legitimate role) AND vetoing the long free-lane
brakes (still a defect). What would have to be true to drop (d): with anchoring in place and (d) removed,
the visible-weave count stays at the WITH-(d) level (≈0 for racer 22) AND `brakeThenDodge` median braked
frames stays near the WITHOUT-(d) ~2. That is an empirical claim to be measured, not assumed.

**5. Cost / worth.** Any `raceBehavior.js` change moves `fa4e3796e1e5f1a5` and forces the full re-gate
(band-reach ≥70%, 0 Holm-unfair) plus both behaviour gates (visible-weave ≤ WITH-(d) via
`lbb-weave-report.mjs`, not `zigzagScore`; `brakeThenDodge` median ≈ WITHOUT-(d)). Worth attempting: this is
a source-verified geometric defect at the ROOT of the dominant flip mechanism, which is a more principled
target than tuning (d). But a *swept* check (my recommended form) is a broader change than a point re-anchor,
so the re-gate risk is real.

**6. DON'T-FIX honest?** As an interim, yes — until a swept-anchored variant demonstrates BOTH behaviour
gates under the re-gate. But DON'T-FIX-FOREVER is not honest: the check demonstrably tests space the racer
never occupies, and that is a real bug with a confirmed symptom. CC verdict: **fix it as a swept check
(single source for the destination), scoped to the pass caller with the §4b inconsistency documented;
attempt it; keep (d) until measurement clears it.**

**Hygiene (reported):** the "same isSideFree geometry / free-now-means-the-same" comment over-promises once
callers anchor differently; the `softSteeringClearancePct`-nonzero case makes the divergence more than `dY`.

---

## CRITIQUE B — Copilot

**What I checked myself:** independently at source — `isSideFree`'s two-axis predicate (lateral band AND
`shortestArcDeltaT ≤ tHalfSpan`), the pass destination construction, the §4b overlap constraint, and the
latch honouring logic in `chooseFreeLaneDir`; `softSteeringClearancePct = 0.0` in defaults. I reused none of
CC's prose. I take the 5/8 swept-onto-neighbour finding and the 7/8-intact-latch finding as LBB-TRACE-3
inputs (established), nothing else.

**1. Geometry — correct, with the same clearance caveat.** Confirmed: two anchors for one quantity, diverging
by the trailer–leader gap during a dodge; the exact-`dY` identity holds only at clearance 0. No re-anchoring
term exists in the pass path. The question is not void.

**2. Is target-anchoring the RIGHT check? NO, not as a standalone principle — and it may be a regression.**
The check's real job is non-penetration as the racer TRAVERSES to its destination. Neither anchoring covers
that. What the self-anchored check accidentally has is a FORWARD bias — it looks a body-width ahead of the
current position, i.e. into the near-term path. Destination-anchoring REMOVES that forward look and stares
only at the endpoint. So swapping self→destination does not close the blind spot; it MOVES it from "beyond
the destination" to "the corridor before the destination" — and the corridor is where a real en-route
collision lives. Under a naive re-anchor, an en-route obstacle would be caught only by the hard-separation
backstop — and because that backstop resolves overlaps, a resulting regression could be INVISIBLE in the
overlap metric until the backstop is stressed. That is the worst kind of regression: masked. **The only
check that answers the actual question is a swept/segment test; a point re-anchor is a lateral shift of the
same blind spot dressed as a fix.**

**3. The other call site — a shared-contract landmine.** `isSideFree` is one function serving both the pass
gate and the §4b overlap resolver, and its own comment asserts both mean the same "free." If the fix is
implemented by changing `isSideFree`'s contract (e.g. taking an explicit target), it changes §4b too —
possibly fine (bounded overlap regime) or possibly not (I did not trace §4b behaviour). If instead the fix
is caller-side (pass a destination-derived origin only in the pass path), the two callers now encode two
different "free," and the comment is a lie. Either route has a cost the anchor question hides: **you cannot
change one caller's notion of free without either touching the shared predicate or knowingly forking its
meaning.** If consistency is required, both callers must be designed together.

**4. What happens to (d)?** Not removable on this evidence. Even with a corrected/swept check, (d) may still
damp direction reversals from GENUINE local closures (the 2–3 real flips), and — separately — the long-brake
veto (LBB-BLOCKDIST) is a velocity mechanism this fix does not address at all. Removing (d) is safe only if
the weave detector AND the brake-waste median both stay in band without it, under the fairness gate. Assume
nothing; the last removal of (d) produced the weave the Owner saw.

**5. Cost / worth.** High relative to the apparent locality, because it edits a core decision predicate and
(honestly done) broadens pass-acceptance dynamics. Full re-gate plus both behaviour gates. Worth paying ONLY
with prior confidence the swept variant can satisfy both gates simultaneously — which no one has yet shown.

**6. DON'T-FIX honest? Yes, and more than interim if only a point re-anchor is on the table.** A destination-
only re-anchor is conceptually incomplete (Q2) and risks a masked en-route regression (Q2/Q3), so shipping
it would be trading a visible, (d)-suppressed symptom for a hidden safety erosion. Copilot verdict:
**DON'T-FIX the point re-anchor. If anything is built, it must be the swept/segment check, designed with
§4b, and validated against both behaviour gates before the re-gate is spent — and until that design exists,
(d) already suppresses the weave at zero fairness cost, so there is no urgency to touch physics.**

**Hygiene (reported):** the recurring failure mode here is treating a proxy or a partial geometry as gate
truth; a fix on this line must state, per frame, which axis (`isSideFree`'s lateral band vs its `t` filter)
each decision turned on, or it will misdiagnose again.

---

## Where the two sections DIFFER (not resolved, per the brief)

Both verify the geometry is a real bug and both reject a *bare* destination-only re-anchor as the complete
answer; both say the honest fix is a swept check and both refuse to pre-judge (d) removable. They split on
disposition: **CC** treats the swept check as worth attempting now (scoped to the pass caller, §4b
documented); **Copilot** treats even that as premature — DON'T-FIX until a swept design exists and is
pre-validated, because the point re-anchor risks a *masked* en-route regression and (d) already holds the
line at zero fairness cost.
