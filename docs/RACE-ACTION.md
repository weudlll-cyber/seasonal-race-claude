# Race-Action

> **⚠️ Pre-unification baseline.** Absolute sim numbers in this document (band-reach, runaway, P1-contest, physics-tax, gate results) were measured before the plan-grid unification (parity step 2a, 2026-07-23) and are pending re-measurement — see [reports/BASELINE-INVALIDATED.md](../reports/BASELINE-INVALIDATED.md). They remain as history.

*Definitive reference for the shipped race-action mechanism (tip 68f71b5). Forward-looking: this document
describes only what exists today. It does not carry the historical rationale of the earlier concept notes.*

## 1. Quick overview

Race-Action is the system that creates genuine overtakes and lead changes during the race. Without it a
field of racers with fixed speeds would spread out once and hold formation to the line — technically a
race, but visually dead. Race-Action continuously reshapes who is where, so that the race *reads* as a
contest: positions cross, a leader is caught, a straggler surges through the pack, and the outcome stays in
doubt.

It matters because the product is a spectacle first. Players watch the race; they do not steer it. The only
thing that makes the watch worthwhile is believable, varied motion. Race-Action is the machinery that
manufactures that motion while never letting the race become unfair or unnatural.

The mechanism runs in two phases. In the **Chaos phase** the back of the field washes forward on its own,
producing an unscripted early shuffle. At the quarter mark the system casts a small set of **heroes** and
switches into the **Choreographed phase**, where two cooperating engines run to the finish: hero
choreography steers a handful of designated racers along authored position curves, and PulkLeadRotation
generates lead changes among the non-hero racers at the front. A final OUTCOME backstop tightens the field
near the end so the finish is close. Everything is deterministic from the race seed — the same seed always
produces the same race.

## 2. The three sacred properties

Three properties are ranked and non-negotiable. When they conflict, the higher one wins, always.

**Fairness is sacred.** The gate is band-reach of at least 70 percent (how many racers finish inside their
assigned fairness band) together with zero start-rows flagged unfair by the Holm test. No amount of
spectacle justifies a race that systematically advantages some racers over others. Fairness is measured, and
the measurement is the gate for shipping a change.

**Naturalness is sacred.** No racer's speed may exceed a ±20 percent envelope around its natural pace, and
motion must respect the per-frame slew limit — speed changes ramp smoothly frame to frame, never jerk. A
racer that teleports, snaps, or visibly rubber-bands has broken naturalness even if the numbers balance.

**Action is the goal.** Visible, varied, unpredictable racing is what the system exists to produce — but it
is the goal, not a sacred property. Action is always pursued *underneath* fairness and naturalness. If a
pass cannot be delivered without breaching the speed envelope, the pass is abandoned. A missed overtake is
always preferable to a physics breach.

The practical consequence: fairness and naturalness are hard constraints wired into the code; action is the
objective the code optimizes for within those constraints.

## 3. Phase structure

The race timeline is expressed as a progress fraction from 0 (start) to 1 (finish), driven by the leader's
progress rather than a wall clock, so the phases track the actual race.

**Chaos phase (0 to 0.25).** The opening quarter is deliberately unscripted. The natural spread of speeds,
combined with a mild forward wash for the back rows, lets the field reshuffle without any director
intervention. This is where the early, organic-looking movement comes from. During this phase each racer
also carries a small **area bonus** — a per-racer speed nudge tied to its target band — which helps the
early ordering settle toward a fair distribution.

At the 0.25 boundary — the *chaos boundary* — two things happen. Heroes are cast from the racers standing up
front, and their position curves are generated for the remainder of the race. From this instant the area
bonus is cut to neutral for every racer.

**Choreographed phase (0.25 to finish).** From the chaos boundary onward the race runs as one continuous
control window. Hero curves steer the 2–4 designated racers; PulkLeadRotation drives lead changes among the
non-hero front-runners; and from the 0.5 mark the OUTCOME backstop begins gently tightening the field so the
finish is close rather than strung out.

This two-phase shape is a deliberate collapse of an older four-phase structure (chaos, a separate PULK
contest window, a buffer, and OUTCOME). Those phases were merged into a single choreographed window with an
OUTCOME backstop layered on top. The most important consequence of the collapse is the area-bonus rule: the
bonus is neutralized across the entire choreographed phase. If it were left running it would keep nudging
racers by band and manufacture *false* leaders — racers who lead only because their bonus is high, not
because the race put them there. Cutting it at the chaos boundary means that, once choreography takes over,
position is earned by the choreography and the contest, not by a hidden per-racer handicap.

## 4. Choreography — hero casting and curves

Choreography is the authored spine of the race. It does not script every racer; it scripts a few and lets
the rest run loose around them.

**Casting.** Heroes are chosen dynamically at the chaos boundary from the racers who are standing near the
front at that moment, using each racer's band assignment. There is no fixed hero list decided before the
race; the cast emerges from how the chaos phase actually played out, which keeps every race different.

**Curves.** Each hero receives a target curve: a small set of waypoints mapping time to a position band,
interpolated with a minimum-jerk profile so the motion between waypoints is smooth. The curves are authored
to guarantee ordered positions with real separation between heroes. Overtakes are not commanded as discrete
events — they *emerge* where two heroes' curves cross. Because the curves are separated and smooth, the
crossings look like genuine passes rather than snaps.

**Loose field.** Only the 2–4 heroes are choreographed. Every other racer runs *loose within its band* under
a gentle constant-target controller that keeps it broadly where it belongs without pinning it to an exact
rank. This looseness is essential: it leaves the non-heroes room to weave, which is exactly the room
PulkLeadRotation uses to create front action.

The defining property of choreography is that it operates in **position space, not rank space**. The system
steers racers toward positions on the track; rank is simply what falls out when you sort those positions.
Steering positions rather than ranks is what keeps the motion physical — a racer is never yanked to "third
place," it is guided to a place on the track that happens to be third.

## 5. PulkLeadRotation — non-hero front action

Hero choreography produces the authored storyline; PulkLeadRotation produces the unscripted front fight
among the non-hero racers. It is the engine of genuine lead changes.

**Attacker slots.** One or two attacker slots each target the live second-place racer (and third place, when
two slots are active) and boost it forward until it *takes the lead*. Success is defined as taking the lead,
not merely closing the gap — a chase that stalls just behind the leader is not a success. When an attacker
succeeds, its slot advances to the new second-place racer and the pursuit begins again. This is what keeps
lead changes coming rather than producing a single pass and then stasis.

**Settle-brake set.** A racer that takes the lead is immediately placed under a flat, unconditional brake.
It stays braked until it has fallen a configured depth — `dropDepthLengths`, measured in racer lengths —
behind the *current* leader, at which point it is released. This is a membership set, not a single slot:
many former leaders can be braking at once, each easing back toward its own release depth. The settle-brake
is what turns raw churn into readable racing. Without it, a racer that just took the lead would immediately
be re-boosted or would drift, and the front would oscillate — the dreaded flicker where the lead changes
several times a second. The brake makes each pass settle before the next one begins.

**Outsider slot.** Alongside the attacker slots, one outsider slot reaches *outside* the front group and
boosts the deepest racer that can still plausibly reach the lead, again until it takes it. The outsider slot
never draws from the front group; its entire purpose is to inject fresh blood, so that the lead fight is not
always between the same two or three racers at the front.

**Depth lever.** The single most expressive control is `dropDepthLengths`, the settle-brake release depth.
Set it small and the rotation stays tight around the top group — leaders fall back only a length or two
before rejoining, giving a close, boiling front pack. Set it large and a dethroned leader drops much deeper
before it is released, so over a long race the lead migrates through the whole field rather than circulating
among the front few. The default reaches meaningfully into the field.

Together these pieces produce lead changes that look earned: an attacker works its way to the front, the
former leader settles back into the pack, and an outsider periodically arrives from deep to reset the fight.

## 6. Boost shape and ceiling

The forces PulkLeadRotation applies are shaped to stay natural.

Boost is **flat to full strength**, not scaled by how far behind the target is. A racer selected for a boost
is driven at the full challenger-boost value regardless of its distance to the leader. Distance-proportional
boosting was avoided because it starves the racers closest to the front — precisely the ones best placed to
complete a pass. All of the smoothness comes not from tapering the target but from the **per-frame slew
limit**: the applied boost ramps toward its full value a small step at a time, so the racer accelerates
smoothly into the boost rather than jumping to it.

A boost may carry a racer above its natural band maximum, but only through a controlled allowance called
**boost-headroom**, which is added to the band ceiling. The result is hard-clamped to the naturalness
ceiling of 1.20 — a racer's boosted speed can never exceed 20 percent above natural, no matter how the
headroom and band combine. As the band widens, the available headroom under the fixed ceiling automatically
shrinks, so the ±20 percent guarantee holds across all configurations.

The physics is never weakened to force a pass through. If an attacker simply cannot deliver the overtake
within the envelope — for example against a leader riding a strong draw — a **deadlock timeout** releases the
slot rather than pushing harder. This is the operational form of the third sacred property: the system
prefers a missed pass to a breach of naturalness.

## 7. Fairness gate and measurement

Fairness is defined by measurement, and the measurement is the gate.

**Band-reach of at least 70 percent.** Every racer is assigned a target fairness band by rank: band 1 is
ranks 1–5, band 2 is ranks 6–15, band 3 is ranks 16–25, band 4 is ranks 26–40, and band 5 is ranks 41 and
beyond. Band-reach is the fraction of racers that finish inside their assigned band. At least 70 percent must
land in-band for a configuration to be considered fair.

**Zero Holm-unfair start rows.** The starting grid must not systematically help or hurt racers by row. Each
start row's outcomes are tested for a significant advantage, with a Holm correction across rows to control
for multiple comparisons; any row flagged unfair fails the gate.

**The eye is the final gate.** The metrics are necessary but never sufficient. A configuration that passes
band-reach and the Holm test still fails if the race *reads* wrong — if it looks like a fairground ride, a scripted
parade, or a dead procession, no passing number rescues it. Conversely, if the eye says "this is real
racing," that judgment stands. Metrics exist to catch what the eye might miss over many races, not to
overrule it.

Measurement is done in **racer-lengths gap-space**, not rank-space. Rank-space is structurally blind to the
thing that matters most: it cannot tell a thrilling one-length battle from a dead race where the "second
place" racer is half a lap back, because both are simply "rank 2." Measuring the actual gaps between racers
in racer-lengths is what lets the tooling distinguish a live contest from a strung-out field.

Note that these are acceptance criteria applied to simulated races by the fairness tooling; they are the
standard a change must meet, evaluated outside the runtime rather than enforced as a runtime constant.

## 8. Configuration knobs

The following knobs, with their shipped defaults, control race-action behavior. All are configurable through
stored configuration; none require code changes to adjust.

- `choreoIntensity` (default 0.6) — how strongly the hero curves pull their heroes toward the authored
  position.
- `choreoOutcomeStart` (default 0.5) — the fraction at which the OUTCOME backstop begins. At the shipped 0.5
  the PULK contest window is open across the first half of the choreographed phase.
- `pulkLeaderBrake` (default 0.1) — the flat brake applied to the live leader, i.e. −10 percent.
- `pulkChallengerBoost` (default 0.06) — the forward boost strength applied to a catching challenger.
- `pulkFrontPool` (default 8) — how many front racers are scanned as candidate attackers.
- `pulkBoostHeadroom` (default 0.1) — the additive allowance above the band maximum for a boosted racer,
  hard-clamped so the resulting speed never exceeds 1.20 (the ±20 percent ceiling).
- `pulkLeadRotationDropDepthLengths` (default 8) — the settle-brake release depth in racer lengths; the depth
  lever described in section 5.

Supporting knobs include the PULK realism envelope (`pulkEnvelopeMaxEffect`, default 0.12, and
`pulkEnvelopeMaxStepPerFrame`, default 0.01, the slew limit), `pulkCeilingCap` (default on, capping a
boosted racer at the band maximum before headroom), the attacker-slot count
(`pulkLeadRotationAttackerSlots`, default 2), the outsider reach cap
(`pulkLeadRotationOutsiderMaxReachLengths`, default 15), the fresh-leader hold
(`pulkLeadRotationMinHoldMs`, default 750, which suppresses sub-750-millisecond lead flicker), and the
per-boost safety net (`pulkLeadRotationDeadlockTimeoutMs`, default 12000).

Some internals are pinned to constants rather than exposed as tuning knobs, on purpose. The naturalness
ceiling (1.20) and the phase-weight fade are fixed guarantees, not dials — exposing them would invite a
configuration that breaks a sacred property.

## 9. Phase discipline — how forces fade

Every force the director applies — hero pull, attacker boost, leader and settle brakes — is scaled by a
**phase weight** that fades cleanly to exactly zero at the OUTCOME boundary. Nothing the contest engine does
leaks past that boundary into the OUTCOME phase, where the backstop takes sole responsibility for tightening
the finish. This clean handoff is what prevents the two systems from fighting each other at the end of the
race.

The whole mechanism is deterministic. Every selection — which racer is an attacker, which is braking, which
outsider is chosen — is made from rank, signed track distance, and racer index. No randomness is drawn
during the race. Given the same seed, the same race unfolds identically every time, which is what makes the
fairness measurement reproducible and the behavior debuggable.

## 10. Known limitations and future work

**Chaos runaway on closed tracks (rare).** A racer that is already uncatchable at the start of the contest
window — far enough ahead that even a fully boosted, ceiling-limited challenger cannot reach it within the
envelope — is not reeled in by the director, because the director will not breach naturalness to force the
catch. The candidate remedy is a gap-scaled leader brake: today the leader brake is flat while the
challenger boost is already gap-aware, and making the brake reach further when the leader's lead is larger
would close this case without touching the boost side.

**Speed-clamp sprawl.** There are three independently-authored speed ceilings in the pipeline — the re-roll
variation band, the director envelope, and the OUTCOME tightening allowance. They are individually correct
but uncoordinated. The intended cleanup is to consolidate them into one documented ceiling with explicit,
justified deviations rather than three separate limits that must each be reasoned about.

**Finish-camera tuning.** The photo-finish camera profile — the zoom and timing of the closing moments — is
slated to get its own tuning surface in the developer screen. That work is deferred to a later phase; the
finish behavior today is functional but not yet independently tunable.

## 11. The single Action slider (vision, not yet built)

The intended endpoint for race-action tuning is a single **Action** slider on the setup screen, ranging from
0 to 100 percent, that a game master can use to make a race more or less eventful without any risk of
breaking fairness or naturalness. Rather than exposing the individual knobs above — which interact in ways
that are easy to get wrong — the slider would present one intuitive control.

Internally, the slider's primary lever is `pulkLeadRotationDropDepthLengths`: turning up Action reaches the
rotation deeper into the field for more sweeping lead changes, turning it down keeps the fight tight at the
front. Around that primary lever the slider would orchestrate the related knobs so that any position on the
slider remains inside the fairness and naturalness guarantees by construction.

This is a design target, not a shipped feature. The underlying depth lever exists and works, but the
developer-screen pinning of the supporting knobs and the setup-screen wiring of the slider itself are not yet
built. Until they are, race-action is tuned through the individual configuration knobs described in section
8.
