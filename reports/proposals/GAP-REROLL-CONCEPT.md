# CONCEPT — Gap-Aware Re-Roll: pull the escaped leader back through the existing cohesion mechanism

## MEASURED FOUNDATION (all committed: f40a7a6 baseline, b4a1327 formation, 9b51380 speed-source)
- 23.5% of races end as a runaway; the decisive 3.0L gap forms LATE (median progress 0.783).
- The escape speed is NATURAL: the leader's spreadFactor sits at the band ceiling (median
  1.080, headroom ~0), chasers at 1.031 — a ~5% edge the rank-space servo cannot overcome
  (it already brakes the leader, trajectoryMult 0.952). All post-bonuses exonerated
  (areaBonusMult, rowEnvMult, boost/brake, governor = 1.000 in [0.70, 0.95]).
- Behind the escapee the field is DENSE: P2–P15 all within <1L of each other; in runaway
  races a median of 0 racers sit within 3.0L of P1 at 0.90 (non-runaway: 2).
- Owner constraints (binding): no accelerating chasers (most run near max anyway); no
  manufactured 2-racer duel; the leader must not run away AND multiple racers must fight.
- Prior art: leader-brake counter-force tested and FAILED (Phase 1a: runaway worsened to
  29–34.5%); P2-lift vetoed by owner before build.

## MECHANISM (WAS)
Make the EXISTING cohesion mechanism gap-aware. CONCEPT-COHESION.md establishes the
biased periodic speed re-roll as the game's cohesion instrument; spreadFactor — the
measured source of the escape — is exactly what it re-draws. Proposal: while the current
rank-1 racer's leader→P2 gap exceeds gapRerollThresholdLengths (inside the activation
window defined in the OWNER CONSTRAINTS section below), its NEXT periodic re-roll draws
from a downward-weighted / ceiling-capped distribution instead of the full band; once the
gap is back under threshold − hysteresis, re-rolls return to the normal distribution.
No brake, no boost, no new force — the same randomness that produced the outlier pulls it
back. Proposed flags: gapRerollEnabled (default OFF, byte-identical),
gapRerollThresholdLengths, gapRerollBias (shape/strength), window offset params if needed.
Determinism: the bias must be a pure function of race state using the existing per-race
seeded RNG — no new entropy, bit-identical browser vs sim.

## OWNER CONSTRAINTS (2026-07-20 — binding for the design)
1. NO absolute progress constants. The activation window START must be DERIVED at
   runtime from the live choreoOutcomeStart config value — never hardcoded to 0.60.
   If the OUTCOME boundary moves again (it already moved 0.5 → 0.6 once, and hardcoded
   absolute checkpoints colliding with that move was verified root cause #1 of the
   OUTCOME investigation), this mechanism must follow automatically, with zero edits.
   The window END must likewise be derived from the re-roll schedule itself (the last
   scheduled roll position, currently reRollLastPositionPercent), not from a second
   hardcoded number.
2. NO assumptions about the re-roll cadence. The roll count and timing are config
   (reRollIntervalDivisor, reRollLastPositionPercent, reRollTransitionDuration) and may
   be changed by the owner at any time. The mechanism must therefore be defined as a
   pure property of WHICHEVER rolls happen to fall inside the window while the gap
   condition holds ("bias any draw that occurs while engaged"), never as "the Nth roll"
   or "K rolls before the finish". It must degrade gracefully at any cadence — including
   very few rolls (fewer chances to act = weaker effect, acceptable) and very many.

## OPEN QUESTIONS (answer independently, numbered)
1. Bias shape: hard ceiling cap for the biased draw (e.g. at the chaser median / band
   midpoint) vs a downward-shifted distribution vs strength proportional to excess gap —
   which reads most natural on screen and is least parade-prone?
2. Cadence: what IS the re-roll schedule in source, and is the expected latency (gap
   crossing → next scheduled roll) small enough for a gap whose median formation
   progress is 0.783? Assess explicitly against OWNER CONSTRAINT 2: the design must stay
   correct at ANY cadence — is a triggered early re-roll ever acceptable, or does that
   break the cohesion concept and read as an artificial brake?
3. Scope: rank-1 only — or any escaped front group? Owner rule forbids a manufactured
   duel; if TWO racers break away together, should the mechanism pull the duo back to
   the pack as well (and how is "escaped group" defined cleanly)?
4. Code home & parity: where does the periodic re-roll live (shared raceStep path?),
   and can the gap input reuse the controller's existing shared length plumbing from
   Phase 1a bit-identically in browser and sim?
5. Interactions: the late leader may be a released B2-Hero (band-arrival) or a
   front-contest hero released at 0.97 — any conflict with those release semantics, or
   with the servo that already brakes the leader mildly?
6. Window derivation & fairness: given OWNER CONSTRAINT 1, the window is
   [choreoOutcomeStart, last scheduled roll] — is starting EXACTLY at choreoOutcomeStart
   right, or is a config-relative offset needed? Does pulling the leader's draw down
   ever endanger B1 band-reach, and is a rank floor (as in the leash, disengage at live
   rank ≥ 3) needed here too?
7. Naturalness: what guarantees no visible speed step at the biased re-roll (existing
   re-roll smoothing? reRollTransitionDuration?), so the pull-back reads as racing, not
   as a hand on the racer?

## SUCCESS CRITERIA (for the later sweep)
- runawayWinnerRate 23.5% → <10% overall, ≤15% per track.
- NEW product metric: racers within 3.0L of P1 at progress 0.90 — runaway-race median
  must rise from 0 toward the non-runaway level (≥2); this is the "multiple racers in a
  real fight" number and a first-class gate, not a nice-to-have.
- paradeFinishRate ≤ 2% baseline; top-5 OUTCOME action Δ ≥ 0 (the shipped +21% survives).
- B1/B2 band-reach ≥70% all tracks; Holm ≤2/4.
- Flag OFF → fingerprint byte-identical to 72c3360fb75225ef.
- Measurement: runaway-parade observer + exp-runaway-leader, SAME f40a7a6 seeds.

## REVIEW DELIVERABLE
Feasibility in the current re-roll/cohesion architecture (name files and integration
points), risks and edge cases (parade compression, cadence latency, hero-release
interplay, determinism), your answers to the numbered questions, anything this concept
misses, and a clear recommendation: build as proposed / build modified (how) / reject (why).
