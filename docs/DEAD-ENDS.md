# DEAD-ENDS — approaches already tried, and why they were dropped

**Purpose.** One exclusion list so no ideation round (Plan-Claude, CC, Copilot, owner) re-proposes
a mechanism the project already built, measured, and retired. **Read this before proposing any
race-mechanism change, and before any diagnosis — the git history is the first source, not the
last resort.** Distilled from the full git history (997 commits, 2026-04-19 … 07-26),
docs/LESSONS.md (183 lessons), and reports/. Living document — append, never silently drop.

## The frame (read first)

- **The servo is NOT a failure.** The shipped servo world (`@ce73592`) is the ONLY working solution
  to date: fair (band-reach and zero Holm-unfair rows, both to the gate in [FAIRNESS.md](FAIRNESS.md)), _some_ action, physics envelope respected.
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
  the original bullet under-enumerated is the _class of non-physical-force solutions_: a mechanism does not
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
  **Why closed:** the owner declined the trade — _"without it we get far too many overlaps."_ The non-penetration
  safety stays UNTOUCHED; the acceptable Sanftheit win (the integrator acceleration cap) was taken instead, and it
  is provably fairness-neutral (HOLM-300-COMBINED). Reopening the hard-separation trade is the **owner's call
  alone**. Proof: reports/evolution/RACER-MOTION-1.md, RACER-MOTION-2.md.
- **The 0.4 s fixed timer for avoidance commitment — EARNED KILL.** RACER-FLAPPING-1 shipped a 24-frame
  side-commit to stop the traffic left-right flap. **Why dead:** it fixed the one targeted racer (Arrow 17→0
  reversals) but synchronised the FIELD — dramatic flappers rose 1→6 — because a shared clock couples agents that
  must be independent. Replaced by per-agent geometric margin hysteresis (RACER-FLAPPING-2). Cross-reference
  **Lesson 190** (the Synchronization Law). Proof: reports/evolution/RACER-FLAPPING-1.md.

## I. The camera unit redefined as a fraction of each track's own width (2026-08-05)

**The idea, and it is a good one.** `visibleCorridors: 1.0` should mean "one width of _this_ road",
not "one fixed 300 px reference". It makes the number mean the same THING everywhere, it is what the
owner originally assumed it meant, and it removes the oddity that a narrow track shows more than two
of its own road widths at his LEADER 1.0.

**Built as a probe and measured.** No code change was even needed to test it — `referenceWidthFor`
returns `max(referenceCorridorPx, trackWidthPx)`, so setting the reference to each track's own width
IS his unit, expressed in the shipped config.

**KILLED BY THE OWNER'S EYE, for a reason no measurement here would have produced.** He ran it on
searound at the values his unit delivers (LEADER 0.62 / OVERVIEW 1.25) and rejected it: **a smaller
window means the world moves through it faster, and the picture became restless.** The fixed
reference has a virtue nobody had written down — a fixed amount of world means the same SENSE OF
CAMERA SPEED on all ten tracks. See Lesson 200.

**The measurements agreed with him afterwards, on a different axis:** under his unit the breathing
got _worse_ on every track (searound 1.000x -> 2.032x, and the corridor guarantee went from binding
0% of frames to 100%), and racer-size spread widened from 1.500x to 2.132x. But the measurements were
run because he had already rejected it; they did not find it.

**Why this is recorded rather than forgotten.** It is the obvious proposal, it will occur to the next
person within a month, and its flaw is invisible from the code — it lives entirely in how the result
FEELS. What shipped instead was Lesson 199's fix: keep the unit, and stop the road overruling him.

## J. Counting finished racers as company at the finish (2026-08-05)

**The idea, and it is a natural one — expect it to be proposed again.** `companyGuarantee` skips
finished racers (`if (!r || r.finished) continue;`). At the finish 32–38 of 39 are home, so a promise
named "do not show emptiness" computes against 1–7 racers while the screen is full, and widens the
shot for a single back-marker. The obvious repair is to let finished racers COUNT: then the promise
satisfies itself once enough are home, with no finish-specific special case.

**MEASURED, AND IT IS WORSE.** On the owner's marked race and on dirt-oval:

|                                  | widening frames |              widest |
| -------------------------------- | --------------: | ------------------: |
| baseline                         |         54 / 58 |     2.9752 / 2.9592 |
| finished racers count as company |     **55 / 59** | **2.8760 / 2.8443** |

**WHY, and this is the part to remember.** The anchor in FINISH_OVERVIEW is the FIXED lookback point
— `finishOverviewLookbackPx` behind the line — not the field. Finished racers run out _away_ from
that point exactly as stragglers fall _back_ from it, so including them adds more distant company
rather than nearer company. The idea assumes the anchor sits where the racers are; it deliberately
does not, and that is the whole reason the finish shot works.

**What was shipped instead** (FINISH-COMPANY-1, the owner's own proposal): the guarantee stops
applying once the leader plus `minRacersVisible` are home — 0 widening frames on both tracks.

## K. The corridor overlay — a Dev Screen picture to settle where the track is (2026-08-09)

**What was built.** `corridorOverlay.js`, a Dev Screen overlay (default OFF) that drew the LOGICAL
corridor and a cross on the frame centre, with its own `defaults.js` key, a Dev Screen toggle and a
hook in `renderRaceFrame`. The point was to answer a dispute the numbers could not settle: on
river-run, is the camera actually leaving the track, or does it only look that way?

**Why it was dropped.** It never delivered the deciding picture — the background did not blit in the
capture and the red edges still did not draw — so it claimed no verdict, and the owner dropped it
rather than spend another block making a diagnostic work. **The code is preserved at
`archive/corridor-overlay-1` (`4dbfba8c`) and nowhere else**; its findings are on master as
[CORRIDOR-OVERLAY-1](../reports/night/CORRIDOR-OVERLAY-1.md) and
[CEREMONY-REGRESSION-BISECT-1](../reports/night/CEREMONY-REGRESSION-BISECT-1.md).

**THE QUESTION IT WAS BUILT FOR IS STILL OPEN, and this is the part that matters.** It found a real
factor of two before it was dropped: `EditorShape.getPosition(t, offset)` treats the offset as
NORMALISED against `track.width`, so the same `width: 300` is a **FULL** width to the physics and the
camera (a racer at 0.5 sits 150 px out; the camera divides by two) and a **HALF** width to the code
that draws the track edges (`getPosition(0, 1.0)` reaches 300 px). **A guarantee expressed in track
widths may therefore be keeping a promise about a corridor the viewer cannot see** — which would make
every "world in shot" number mean one thing to the camera and another to the eye.

That is not a dead end; it is an unanswered question with a strong lead. **Whoever picks it up should
start from `archive/corridor-overlay-1`, not from scratch** — the overlay is 90 % of a working
instrument, and the two reports inventory what was already ruled out.

## L. Neighbour-limited pair loop by a sorted t-window (2026-06-06, reverted `fb988587`)

**What was built.** Report [08-neighbor-pairloop](../reports/perf/08-neighbor-pairloop.md): the pair
loop sorted the field by `t` each step and evaluated only pairs inside a window `T_WINDOW = 0.09`,
with the pair body wrapped in an `evalPair` closure so the walk could be done in two passes.

**Why it was dropped.** Measured against the baseline frame log at 70 racers on Space Sprint and it
**REGRESSED**: mean +0.73 ms, P90 +2.35 ms, max +3.39 ms, worst spike run 16 → 43 frames. The cause
was named at the time: the per-step sort and the closure cost more than the window saved, because in
a dense pack `T_WINDOW = 0.09` selected essentially the whole field, so the T-break fired on zero
pairs while every pair still paid for the machinery.

**DO NOT READ THIS AS "WINDOWING THE PAIR LOOP IS DEAD", and this is the whole reason the entry is
here.** It is evidence about THAT window and THAT implementation, and all three of its premises have
since changed:

- **The window was 9–45× too wide.** `T_WINDOW = 0.09` was derived from the mixed-unit avoidance
  metric, which **no longer exists** — `8292d9db` replaced it with the two-axis geometric gate. The
  bound re-derived against today's gate is 0.002–0.010 depending on track length.
- **It had no Y axis, and the Y axis is the strong one.** Measured in
  [PAIR-REACH-ANALYSIS](../reports/night/PAIR-REACH-ANALYSIS.md): at 100 racers the t-axis alone
  leaves 18 % of pairs, t AND y together leave 3.4 %. This project had in fact already shipped a
  Y-rejection once (`8bd7180`, reports 11 and 12) and lost it in the same refactor.
- **The sort is already paid for.** SIDE-FREE-CULL-1 builds a `tFrac`-sorted index every step for
  `isSideFree`, at 0.83 % of the step — and a prefilter that keeps the original loop order does not
  need the index at all, only two scalars and two `continue`s. No closure either.

**The successor SHIPPED the same night this entry was written** — see
[PAIR-PREFILTER-1](../reports/night/PAIR-PREFILTER-1.md), a two-axis field bound proven a strict
superset of both gates, world fingerprint byte-identical. A reader who finds the 2026-06 failure
must find this paragraph with it, which is why both are named here.

## M. A zoom CEILING that keeps the finish line in frame during the run-in (2026-08-12, `feat/finish-framed`, NEVER MERGED)

**The idea, and it is the obvious one — expect it to be proposed again.** The owner wants the finish
line in shot through the run-in, opening while it is far and tightening as the leader closes. Every
framing promise in this camera is already a zoom CEILING combined with `Math.min`, so the natural
move is one more ceiling: `pointGuarantee` with the line as the target, applied from
`endgameThreshold` to whatever state the camera happens to be in. No new state, no new zoom
authority, and it composes for free.

**It was built three times and failed three times.** The third failure is the informative one: it
emptied the frame of racers entirely for **51 consecutive frames** on Luger Hill seed 9, with the
camera centre still sitting a healthy 0.62 track widths from the spine. Two bounds were tried on it —
the field's own extent, then nothing — and neither addressed the cause.

**WHY, and this is the part to remember, because it is not about the finish line at all.** The pan
target was CORRECT on every one of those frames. The trace showed the delivered `offsetX` trailing
its own target by 535 → 1115 px while the ceiling RELEASED the zoom from 2.46 to 4.00 over forty
frames. A ceiling that releases delivers its zoom change inside the `tracking` phase, where pan and
zoom are two independent lerps; the correction that re-couples them — update()'s zoom-about-the-
anchor step (CAMERA-SIDEJUMP-1) — is skipped when `_focusAnchorRacer` returns null, and it returns
null for PHOTO_FINISH because a group shot has no single anchor. **So the rule is: a large zoom
change during `tracking` in an unanchored state loses the subject, and the amount it loses scales
with `|world position| x axis scale`** — which is why the same ceiling was harmless on Searound
(closed, axis 0.42, world centre ~1600) and fatal on Luger Hill (open, axis 1.5).

The diagnosis was confirmed before anything was rebuilt: pointing that one correction at the framing
anchor instead of the racer anchor took 51 empty frames to **0** with the ceiling itself untouched.

**Two lessons that outlive this entry.** First, **the glide is what makes a big zoom change safe** —
it moves pan and zoom on ONE ease, so the anchor is framed consistently by construction. On master
the identical 2.13 → 4.00 change happens at the PHOTO_FINISH transition and costs nothing, because
it happens in a glide. Deferring a zoom change PAST the glide is what broke. Second, **"the camera
centre is near the track" does not mean the camera is pointed at the race**: the excursion here was
ALONG the track, so the centre metric read 0.62 track widths while every racer was off screen.
`check-runin-frame`'s two halves exist for exactly that reason, and its never-empty half is the one
that caught this.

**What was shipped instead** (RUNIN-STATE-1): the run-in as its own STATE, `RUN_IN`, anchored on the
leader — so the correction is live for the whole shot — with the line as its GUARANTEE and LEADER's
own width, so at the line the run-in IS the leader shot and the handover into PHOTO_FINISH is the
glide the camera has always made there. Empty frames 0 across sixteen races, and the cam.zoom at the
crossing is bit-identical to the feature being off.

**Do not re-propose bounding somebody else's shot.** The branch survives as a quarry at
`feat/finish-framed` (`6e94a086`), honestly red; `pointGuarantee` was taken from it unchanged and is
the only part worth keeping.

## What this leaves open (not tried, not excluded)

Formats that make a breakaway irrelevant rather than catching it: **elimination** (last-at-call out of
contention), **sector / intermediate scoring** (winner = best across several lines), a **mandatory
re-pack / neutralization** that re-randomizes release order (start-row memory erased), or a **mandatory
detour** each racer must pay. All unproven; each must be measured against **equal win-chance by start
row**, on BOTH an open and a closed track (see the structural finding above), from one global rule.
