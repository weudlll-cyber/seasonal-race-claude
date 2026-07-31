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
- **New (2026-07-26, owner + code-verified; wording made precise 2026-07-29 after COMBO15 shipped)** — with
  identical racers, a breakaway once formed cannot be reeled in by ANY continuous physical force (draft has
  finite range; braking the leader brakes the whole front — STEER-CAP-1 reconfirmed this from the other side:
  capping the boost to close the gap WIDENED it, Lesson 189). That physical-force impossibility STANDS. What
  the original bullet under-enumerated is the *class of non-physical-force solutions*: a mechanism does not
  have to CATCH the breakaway or PREVENT it — it can make the breakaway **irrelevant to the FAIRNESS result**
  by shaping the re-roll DRAW so the finishing order lands each racer in the band of its drawn place
  regardless of who led the chaos. **This is the shipped answer (COMBO15, 2026-07-29):** the leader may still
  break away in chaos, but the band-aware draw bias redistributes the FINISH into drawn bands (arrival
  85–90%), so the escape stops deciding the race without ever being physically caught. So the precise wall is:
  PREVENT a breakaway (hard coupling / format), OR make it irrelevant to the result — either by FORMAT
  (elimination = drama at the back; sector scoring = many finish lines; re-pack/restart = reset the field) OR
  by DRAW (bias the re-roll toward the drawn band, the Cliff Law's correct sign, Lesson 184) — but NEVER by a
  continuous physical force that tries to catch it after the fact.
- **Project Principle 9** — the camera is not a solution; action must exist in the physics.

## G. The action / fair-arrival line (2026-07-27 … 07-29) — what died so COMBO15 could ship
The multi-week hunt that ended in the shipped COMBO15 world (chaos steer + band-aware re-roll bias + 0.15
chaos window, master `@175a475`, tag `v-ship-combo15`). These are the retired arms; the SHIPPED mechanism is
documented in [FAIRNESS.md](FAIRNESS.md) and [../reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md),
not here.
- **Admission-only action family (ACTION-BUILD-4 … 7 + ACTION-NIGHT-1) — FOUR kills, DEAD.** A series that
  tried to manufacture sustained P1 uncertainty from the ADMISSION side only (frozen runtime budget): authored
  traffic density, open-lane invariants, lane-conditional skips, proximity floors, authored cast/order. Each
  improved a fairness or continuity sub-metric but NONE bought sustained P1 uncertainty — the front stayed
  decided. **Why dead:** authored density/cast is still a decided race (Lesson 185); action needs a live
  undecided re-roll window, which the admission side cannot create without a runtime force. Proof:
  reports/evolution/ACTION-BUILD-4.md … ACTION-BUILD-7.md + ACTION-NIGHT-1.md (the overnight confirm).
- **Band-corridor / free-band family (ACTION-FREEBAND-1/2) — DEAD, preregistered closure honored.** Make
  racers reach their drawn band by a positional corridor: a HARD wall pinned the band but crushed the contest
  (frontContest 28–36% vs ship 42–68%) and still fell below ship arrival; a SOFT spring leaked arrival off a
  cliff (69→46%) without raising the contest. The dial is a **CLIFF, not a slope** (Lesson 184). **Why dead:**
  any post-dice positional force is an opponent force. The preregistered gate (arrival ≥ ship+10 with contest
  within 10pp and DEAD-BORING ≤ ship) was met by NO cell, so the line auto-closed. Proof:
  reports/evolution/ACTION-FREEBAND-1.md + ACTION-FREEBAND-2.md. (Superseded by the WORKING sign of the same
  goal: bias the DRAW, not the position — shipped as COMBO15.)
- **Choreo-release family (CHOREO-RELEASE-1/2) — DEAD, three confirmations.** Lift the frozen-budget
  constraint and RELEASE each racer to the ship's re-roll once it reaches home. Arrival-SAFE (band-hold worked,
  80/75% at AT90) but the finish stayed DEAD-BORING because the outcome was already decided; the time-curve ran
  the WRONG way (more dice time → more dead-boring), and a strong-steer variant confirmed it a third time.
  **Why dead:** a decided race is flat however its motion is released (Lesson 185). Proof:
  reports/evolution/CHOREO-RELEASE-1.md + CHOREO-RELEASE-2.md.
- **Boost-side steer cap (STEER-CAP-1) — DEAD, backfired 6/6.** Cap the chaos-steer upper clamp to shrink
  space-sprint's chaos hole. It WIDENED the gap on all three tracks at both caps. **Why dead:** the chaos
  P1–P2 gap is set by the chasers' climb, not the leader's knob — throttling the boost slows the pursuers
  (Lesson 189, the Wrong-Lever Law). The space-sprint residual (~1.6× ship) is documented as accepted, not
  chased with this lever. Proof: reports/evolution/STEER-CAP-1.md.
- **Blind A/B viewer (`?eye=A/B`) — DEAD tooling, replaced by the proof-of-live standard.** A coin-flip
  blind-mapping URL switch for owner eye-tests. It never armed twice: path-navigation dropped the query before
  mount, and the injected flags never passed raceCore's plan whitelist (silent no-op). **Why dead:** a viewer
  with no liveness assertion is indistinguishable from a no-op (Lesson 187); cost two evenings. Replaced by the
  proof-of-live triple (badge + console + runtime assertion) and, going forward, DevScreen presets over the
  real config keys — NOT a `?world`/`?eye` URL hack. Proof: reports/evolution/EYE-SETUP-2.md.

## H. Avoidance feel — proposals closed by owner (2026-07-31)
The RACER-FLAPPING / RACER-MOTION line shipped two keepers (margin hysteresis `softSteeringObstacleMargin` 0.5,
lateral acceleration cap `maxLateralAccelPerStep` 0.0005). Two related avoidance ideas are CLOSED:

- **Ease the hard-separation push (the "glide-apart" proposal) — CLOSED by owner decision, 2026-07-31.**
  RACER-MOTION-1 identified the hard-separation non-penetration pass (direct `physicalY` writes) as the dominant
  lateral-jerk source and proposed rate-limiting it so overlapping racers glide apart instead of stepping.
  **Why closed:** the owner declined the trade — *"without it we get far too many overlaps."* The non-penetration
  safety stays UNTOUCHED; the acceptable Sanftheit win (the integrator acceleration cap) was taken instead, and it
  is provably fairness-neutral (HOLM-300-COMBINED). Reopening the hard-separation trade is the **owner's call
  alone**. Proof: reports/evolution/RACER-MOTION-1.md, RACER-MOTION-2.md.
- **The 0.4 s fixed timer for avoidance commitment — EARNED KILL.** RACER-FLAPPING-1 shipped a 24-frame
  side-commit to stop the traffic left-right flap. **Why dead:** it fixed the one targeted racer (Arrow 17→0
  reversals) but synchronised the FIELD — dramatic flappers rose 1→6 — because a shared clock couples agents that
  must be independent. Replaced by per-agent geometric margin hysteresis (RACER-FLAPPING-2). Cross-reference
  **Lesson 190** (the Synchronization Law). Proof: reports/evolution/RACER-FLAPPING-1.md.

## What this leaves open (not tried, not excluded)
Formats that make a breakaway irrelevant rather than catching it: **elimination** (last-at-call out of
contention), **sector / intermediate scoring** (winner = best across several lines), a **mandatory
re-pack / neutralization** that re-randomizes release order (start-row memory erased), or a **mandatory
detour** each racer must pay. All unproven; each must be measured against **equal win-chance by start
row**, on BOTH an open and a closed track (see the structural finding above), from one global rule.
