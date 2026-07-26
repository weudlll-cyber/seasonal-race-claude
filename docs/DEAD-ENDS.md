# DEAD-ENDS — approaches already tried, and why they were dropped

**Purpose.** One exclusion list so no ideation round (Plan-Claude, CC, Copilot, owner) re-proposes
a mechanism the project already built, measured, and retired. **Read this before proposing any
race-mechanism change, and before any diagnosis — the git history is the first source, not the
last resort.** Distilled from the full git history (997 commits, 2026-04-19 … 07-26),
docs/LESSONS.md (183 lessons), and reports/. Living document — append, never silently drop.

## The frame (read first)
- **The servo is NOT a failure.** The shipped servo world (`@ce73592`) is the ONLY working solution
  to date: fair (band-reach ≥70%, zero Holm-unfair rows), *some* action, physics envelope respected.
  Every attempt to replace or substantially improve it has so far produced nothing measurably better.
  It stays shipped until something beats it on a measurement. The goal is to IMPROVE it, not disprove it.
- **The pillars (non-negotiable).** Identical racers (one type per race). Simultaneous mass start from
  staggered start rows. Fair = equal win-chance from every start row, provable per race. Action = real
  position fights incl. honest blocking. Continuous honest motion, zero overlap. One rule set for all
  tracks. Simple and clean.
- **The core hard problem.** With identical racers a lucky early leader on clear track cannot be caught
  by an equal-speed pack, so it escapes and the front row wins — unless something stops that. The servo
  stops it by secretly steering each racer to a random target rank: fair, but scripted (Lessons 181/182).

## STRUCTURAL FINDING — some of the unfairness is in the TRACK, not the mechanism
The M1/M2 sweep (2026-07-11) found the fairness-gate blocker on luger-hill and searound is a
**pre-existing baseline start-row bias built into those track geometries — not the action mechanism
on top.** Consequence: any new concept must be measured for start-row fairness on BOTH an open and a
closed track, because a mechanism can look fair on one geometry and fail on another for reasons that
have nothing to do with the mechanism. This is the same open/closed split that later killed Evolution
Act 2 (Lesson 182).

---

## A. Overlap / traffic physics — WORKS, shipped, the honest-motion base (not a dead end)
Took many iterations to get right; listed so nobody rebuilds it. This is the reusable foundation for
any concept: continuous motion, zero pass-through.
- **brake-to-match-and-hold** (2026-06-05) replaced the fixed-% speed brake — a racer matches the
  speed of the one ahead and holds station rather than braking blindly.
- **Geometric gate + body-based speed-brake** (2026-06-08) — non-penetration in real body units, both axes.
- **hard separation as pure backstop** (2026-06-25) — L4/L5 hard separation kept active by default;
  fixed an open-track fairness regression.
- **OVL-C sustained-overlap escape** (2026-06-20) — a free-side lateral impulse so a locked pair
  separates from both sides at once.
- **look-before-brake / look-ahead lane-change** (2026-07-03/04) — take a free lane and pass at speed
  instead of braking first; brake only when no lane is free. Clearance-coupled, non-penetration structural.
  **This is exactly the honest blocking/overtake behaviour the pillars want** — reuse it.

## B. Servo-internal ACTION mechanisms built, measured, and REMOVED
Each was a real, shipped-capable lever, swept, found NOT to be the winning mechanism, and deleted
(recoverable in git). Do not re-propose without new reasoning.
- **Rubber-band (elastic pull to field median)** — early version removed 2026-07-07 Stage 1. A later
  **"cap-the-lead" redesign** (median-gap proportional brake on the leader, 2026-06-30) was also
  built and did not become the answer.
- **PULK-surge** (forward surge pass for the pack) — shipped ON briefly, then removed 2026-07-07
  Stage 2; the cohesion bias already did the work.
- **Show-target / Rank-Proto** (rank-space controller, 2026-07-06) — removed Stage 3. Steering RANK
  not position is a dead end (Lesson 172).
- **Governor family** — multiple variants built and retired: progressive rubber-band field, dead-zoned
  edge-limiter, ahead-median cohesion **leader-brake** (retired Stage C 2026-07-05), **TAIL-LIFT**
  (removed Stage 4). A limiter/cap cannot create a contest (Lesson 160).
- **contest-injector (rank-blind director spotlight)** (Stage A1, 2026-07-05, default OFF) — did not win.
- **Classic reactive director** (removed 2026-07-13 S4) — replaced by hero choreography.
- **M1 PulkFrontContest + M2 pack-spring** (2026-07-11) — M1 feasible-but-not-winning, **M2 pack-spring
  NOT feasible**; both removed CLEANUP S1. ("Pack-spring" = a spring binding the pack — note for anyone
  re-proposing "just hold the field together with a spring": already found infeasible.)
- **PulkRaceDirector** (predecessor group-contest engine) — removed CLEANUP S2 2026-07-13.
- **Lead rotation, pack release, universal band-arrival, Carousel** (removed 2026-07-23) — front
  lead-swap engine, pack-release servo branch, universal band-arrival force, role-biased front rotation.
  All proven dead, fingerprints unchanged. Carousel recoverable at archive/carousel-sweep-final.
- **Comebacker pre-arm** (removed 2026-07-15).
- **Front-distance Leash** (sim-only 2026-07-20, never shipped, REJECTED) — continuously braking the
  leader to the floor. Made runaway WORSE (braked leader dumped into pack, fresh escapee promoted).
  **Owner's deeper reason: braking "the leader" also brakes the 2nd-place racer, himself a leader vs the
  rest — it brakes the whole front, not just the breakaway.** Do not re-propose continuous leader braking.

## C. Start-row / dormant experiments deleted (2026-07-09)
Built behind flags to make the start row fair by direct manipulation, none won, all deleted:
**TEF**, **ROW_SPLIT**, **V4 start-row** (startRowBoostMult), **tier2**. Direct start-row boosting was
tried and did not produce provable row-fairness.

## D. Greenfield replacements tried and dropped (2026-07-25/26)
- **EVOLUTION Act 1 — assignment-follows-field** (reverted). Target rank follows the live field. Broke
  the fairness floor AND deadened the finale. **Lesson 181:** fairness and finale contest are the SAME
  static-slot restoring force — weakening the pull removes both.
- **EVOLUTION Act 2 — finale front-compression, fixed + adaptive** (reverted). Scheduled-dice front
  tightening in the finale window. Same global dose did OPPOSITE things open vs closed. **Lesson 182:**
  no single track-agnostic finale-dice law lifts both topologies (structural physics — open re-expands,
  closed churns).
- **Handicap-Pursuit** (greenfield, retired). Stagger grid by ability. **Moot: racers are identical.**
  Reusable asset proven: overlap-free 2D traffic core (0 violations). **Lesson 183.** Recoverable at
  archive/handicap-pursuit-089c7d2.

## E. Ideas killed by owner experience BEFORE rebuild (2026-07-26)
- **Time-staggered / pursuit start** — REJECTED: opposite of action; released apart, each runs clear
  track alone. Mass simultaneous start is mandatory.
- **Different abilities / any handicap** — moot; identical racers.
- **Drafting / slipstream to bind the pack** — **ALREADY BUILT and shipped** (`draftingBoost`/cone/
  max-distance in raceBehavior.js) and it did NOT solve it. Reason (owner): draft acts only a few metres
  behind the leader (finite range) — once a breakaway is GONE there is no draft to pull chasers up, so
  **the draft cannot catch a breakaway.** It keeps an already-tight pack tight; it cannot re-gather an
  escaped leader. Draft was present FIRST, before the servo, and still did not suffice.

## F. The deepest walls (constraints behind the specific failures)
- **Lesson 160** — a limiter/cap cannot CREATE a contest, only bound one.
- **Lesson 172** — steer position, never rank.
- **Lesson 178** — action lives in ORCHESTRATION, not liberation; freeing the servo just settles the field.
- **Lessons 181 / 182 / 183** — (above).
- **New (2026-07-26, owner + code-verified)** — with identical racers, a breakaway once formed cannot be
  reeled in by ANY continuous physical force (draft has finite range; braking the leader brakes the whole
  front). A solution must PREVENT a breakaway (hard coupling / format) or make it IRRELEVANT to the result
  (elimination = drama at the back; sector scoring = many finish lines; re-pack/restart = reset the field)
  — NOT catch it after the fact.
- **Project Principle 9** — the camera is not a solution; action must exist in the physics.

## What this leaves open (not tried, not excluded)
Formats that make a breakaway irrelevant rather than catching it: **elimination** (last-at-call out of
contention), **sector / intermediate scoring** (winner = best across several lines), a **mandatory
re-pack / neutralization** that re-randomizes release order (start-row memory erased), or a **mandatory
detour** each racer must pay. All unproven; each must be measured against **equal win-chance by start
row**, on BOTH an open and a closed track (see the structural finding above), from one global rule.
