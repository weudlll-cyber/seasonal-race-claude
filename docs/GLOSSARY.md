# GLOSSARY — the words this project uses that no outsider would guess

**What this document owns:** the vocabulary. Every private term in the RaceArena codebase and
documents, defined once, with a pointer to the document that owns the subject.

**Why it exists.** This project has heavy private jargon, and a newcomer fails on the WORDS long
before the details. One real sentence from `BACKLOG.md`, unedited:

> _"extra choreographed heroes cast from FRONT-post-chaos B2-finishers that climb to ~rank 5 mid-race
> then fall back and free-reorder in B2 (band-arrival release: the servo frees them the moment they
> re-enter B2 on the way down)"_

Nine private terms in one sentence. Every one is below.

**What it is NOT for:** definitions of the mechanisms themselves, and never a value. This says what a
word MEANS and where the subject lives. Numbers live in `client/src/modules/storage/defaults.js` and
nowhere else; the current fingerprints live in [fingerprints.json](fingerprints.json) and nowhere
else. That is the one-canonical-home rule, and it applies to this file too.

---

## ⚠️ Three words that mean two different things each

Read these first. They are the traps, and nothing else in the documents warns you.

| word         | meaning A                                                                                     | meaning B                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **corridor** | **Camera:** the zoom UNIT. One corridor = one standard track width; a state's zoom is set in corridors. | **Race:** the OUTCOME band-steering window (`corridorStart` … `corridorEnd`), a slice of race progress. |
| **band**     | **Plan:** a target-FINISHING-PLACE band — B1 is the front group, B5 the back. What a racer is steered toward. | **Speed:** the natural speed band, the min–max range a racer's random speed draw comes from.          |
| **pulk**     | **Race:** the PULK PHASE, the middle third of a race.                                           | **Camera:** the pulk/battle GROUP — the clump of racers the camera detects to trigger a battle shot.    |

They are unrelated. A sentence about "the corridor" is about the camera or about the race planner and
you have to know which from context. Nothing in the code disambiguates them.

---

## The race, roughly in the order a race happens

**t / t-space** — a racer's position along the track as a number, not as pixels. `r.t` runs from 0 at
the start line upward; on a closed track it passes 1.0 each lap. Nearly all race logic is in t-space,
which is why "distance" in this project usually is not measured in pixels.

**progress** — how far through the RACE we are, 0 → 1. Distinct from `t`: progress is the clock, `t`
is the place. Phase boundaries are expressed in progress.

**start row** — the grid. Racers are placed in rows across the track corridor; row 0 is the front.
Rear rows start further back and get a speed bonus calibrated to cancel the distance. Owned by
`rowLayout.js`; the fairness promise about rows is in [FAIRNESS.md](FAIRNESS.md).

**phase** — a race runs **CHAOS → PULK → OUTCOME**. There is a fourth branch named TRANSITION in the
code and it is **zero-width and unreachable** — a dead branch, not a live phase. The boundaries and
everything calibrated against them are owned by [PHASE-CONTRACT.md](PHASE-CONTRACT.md).

- **CHAOS** (also `PRE_PULK`) — the opening. The field is still a block; the draw has not yet been
  imposed. Heroes are cast at its end.
- **PULK** — the middle. The pack runs loosely; the front contest is staged here.
- **OUTCOME** — the last stretch. The servo steers each racer toward the place it drew.

**spread factor** — a racer's individual random speed multiplier, drawn from the natural speed band.
This is the luck.

**re-roll** — the spread factor is re-drawn periodically during the race. Re-rolls are where the race
gets its texture; the project's standing position is that action comes from re-rolls, not from
wobble. Owned by [FORCE-MAP.md](FORCE-MAP.md).

**race plan** — the pre-race draw. Before the gun, every racer is assigned a **target rank** (a
finishing place) by a shuffle that is blind to its start row. The race then delivers it. This is the
heart of the design and the reason "fair" here does not mean "may the fastest win" — every racer is
identical, so fairness is about the DRAW being row-blind. [FAIRNESS.md](FAIRNESS.md) is canonical.

**target rank / band (B1…B5)** — the place a racer drew, and the group that place falls in. B1 is the
front band, B5 the back. A racer "reaches its band" if it finishes inside the band of its drawn place.

**band-reach / band arrival** — the share of racers that finish in the band of their drawn place.
**This is the fairness headline number.** [FAIRNESS.md](FAIRNESS.md) is the only document that states
its threshold.

**servo** — the controller that steers a racer toward its target rank during OUTCOME. It brakes an
overshooting racer and boosts a falling one, continuously — it does not switch off once the racer
first arrives.

**strictness** — how tightly the servo holds a racer to its band. Low strictness = a loose pack.

**hero / choreographed hero** — a racer given an AUTHORED curve rather than being left to the servo,
so that something dramatic happens on purpose. Cast at the CHAOS→PULK boundary. Roles:

- **comebacker** — starts deep, climbs. ★ Since 2026-09-18 this means the **STAGED** one only: held at
  a staging rank and released to climb back (`heroCurveGenerator.js:688`). ★★ **Since 2026-09-19 he is
  the only cast role the camera will take a COMEBACK_ZOOM shot on, and with nobody cast as one there
  is no comeback shot at all** — the owner's decision: *a comeback is shown when one was PLANNED, not
  when one happens*. Measured over 300 races, he is the only cast racer still outside the front group
  when the camera's outcome window opens (13.9% in the top three at progress 0.8, 62.7% by 0.9).
- **pursuer** — the **unstaged** front-group chaser (`heroCurveGenerator.js:722`). Same steering as a
  comebacker and the same authored final rank (capped at the top of B1), but **never held and with
  nothing to come back from**: measured over 300 races he leads in 66% of them, holds the race's peak
  gap in only 10%, and finishes top-5 in 89%, a median of one place behind the racer holding the gap.
  ★ **The camera does NOT take a comeback shot on him** — that is the difference the two names carry.
- **sovereign** — leads. ★ Since 2026-09-19 the **drawn winner is always `sovereign-lead`**
  (`heroCurveGenerator.js:648`), whether or not he is already at the front when the cast is made. He
  used to be `comebacker` when he was not, and that string was the reason the camera forced a comeback
  shot on him. Re-measured over the same 300 races, the two arms are one racer either side of one
  threshold: he **leads in 90.7%** of races and **holds the race's peak gap in 30.2%** — against the
  pursuer's 64.2% and 8.9% — and sits at median rank 2 at progress 0.8 in both arms.
- **faller** — starts high, drops.
- **attacker-B2** — climbs to near the front mid-race, then falls back and re-sorts inside B2. This is
  the "Attack & Fall" mechanic.

★ **TWO SENSES OF "comebacker", AND THIS FILE EXISTS FOR EXACTLY THIS.** The four names above are the
**cast role strings** the plan writes. The **sim observers** use the word for something else — a
racer whose anchor rank is behind his target by more than `ROLE_MARGIN_RANKS`, *derived from the
curve's geometry and never from the role string* (`scripts/sim/observers/hero-adherence.mjs`). A
`pursuer` still counts as a "comebacker" in that second sense. **When a number is quoted, ask which
sense it is in.**

**release / band-arrival release** — the moment the servo lets go of a hero and lets it re-sort
freely. "Band-arrival" release = the servo frees it as soon as it re-enters its band on the way down.

**area bonus / row bonus** — early-race speed multipliers that compensate track geometry and start
row. Both are gated on phase boundaries. See [PHASE-CONTRACT.md](PHASE-CONTRACT.md).

**governor / PulkLeadRotation** — the rank-blind front contest staged during PULK. Owned by
`raceGovernor.js`; described in [ARCHITECTURE.md](ARCHITECTURE.md).

**soft steering / hard separation** — the two live lateral layers. Soft steering is a single target
spring (the only lateral FORCE); hard separation is a positional anti-penetration backstop. Everything
else you may read about — home force, free-lane separation, the priority system — is **removed**. See
[FORCE-MAP.md](FORCE-MAP.md), and treat anything in [archive/](archive/README.md) about lateral forces
as history.

**drafting** — a speed bonus for running behind another racer.

### Failure modes with names

**runaway** — the leader breaks away and wins unchallenged, with nobody within reach. The main enemy
of layer 2 of the fairness definition.

**parade** — the field finishes in essentially its running order with nothing happening.

**dead finale** — the closing stretch has no contest.

**escapee** — a racer that gets clear of the pack.

**breakaway** — ★ **the owner's own word, and his definition is the one that counts.** Recorded here
as dated facts because it has been refined twice and a measurement that uses the wrong version
answers the wrong question.

- **2026-09-20 — what it IS.** A racer alone at the front, OR a group leading together, FAR from the
  **front of the chasing field**. The distance runs from the back of the leading group to the front
  of the field — the beginning of the pack, never its middle, and no mean, median or centroid.
  Window **`[0.70, finish]`**; threshold **157.05 world px**. The leading group is bounded by the
  game's own front band (`BAND_EDGES[0]`), so a "group" is 1–5 racers.
- **2026-09-20 — the upper bound.** More than four racers at the front are **not to be braked at
  all**: a group that size already contains enough fighting for the lead.
- ★ **2026-09-23 — NEW, and it narrows what he objects to.** A large gap held by a group of **THREE**
  is **acceptable** to him and is not the picture he is complaining about. Established by his own
  eye-test on the shipped `quiet` stage, `city-circuit` quick-test seed 30 — a 349 px gap, the
  largest in 600 measured races, held by three racers.
- ★★ **A group of TWO is UNDEFINED. It has never been ruled on, and nothing here implies a
  threshold.** Three points (solo objectionable, three acceptable, more-than-four not to be braked)
  do not interpolate, and guessing the fourth would put a number in his mouth. **Any measurement that
  needs the pair case asks him first.**

★ **What the 2026-09-23 refinement does to the numbers — and what it does NOT do.** The measured
rates are **unchanged as measurements**: 7.3% of races at `quiet` and 1.7% at `wild` still cross his
threshold (CHASE-REMAINDER-1, N=300 per stage). **What narrowed is the acceptance criterion, not the
instrument.** Of the 22 remaining `quiet` breakaways, **12 are groups of three or more** — acceptable
under the refinement — leaving **solo-plus-pairs at 10 of 300 (3.3%)** and **solo alone at 3 of 300
(1.0%)**. At `wild`, 2 of the 5 are groups of three or more, leaving solo-plus-pairs at **3 of 300
(1.0%)** and solo alone at **1 of 300 (0.3%)**. ★ A report quoting 7.3% and a report quoting 3.3% are
not in conflict; they are counting different things, and both must say which.

Owned by the measurements in [reports/evolution/CHASE-REMAINDER-1.md](../reports/evolution/CHASE-REMAINDER-1.md)
(the remainder after the chase shipped) and `reports/night/BREAKAWAY-RECOUNT-2.md` (where 157.05 px
comes from). ★ The threshold was calibrated on LEADER-TO-SECOND, which is not the quantity the
definition above describes — it is his only anchor, and the sensitivity pair 112.5 / 225.0 px travels
with every count for that reason.

**P1 contest** — a sustained battle for the lead. Measured; rare.

---

## The camera

Its architecture is owned by [CAMERA_DIRECTOR.md](CAMERA_DIRECTOR.md).

**framing rule** — the single rule every camera state obeys: a state says only WHO the camera is on;
three things describe it — **anchor**, **guarantee**, **zoom**. Frame position is derived, never a
setting.

**anchor** — who the shot is built around.

**guarantee** — what must stay in frame. A guarantee WIDENS the shot; it never steers it.

- **corridor guarantee** — the full track width stays visible, measured across the heading.
- **pair guarantee** — two named racers both stay in frame. **It is the n = 2 case of the contender
  guarantee below, not a separate rule** — at two points the two are identical to the bit.
- **contender guarantee** — every racer in the CONTENDER SET stays in frame. Shipped 2026-08-14
  (CONTENDER-ZOOM-1, default ON via `contenderZoom`).
- **contender set** — who the photo-finish shot is about, and **it is not the top two**. A racer is a
  contender when BOTH conditions hold: nearly level with the leader (within one body length, the
  engine's own `pairContact` distance) AND on a free lane (no racer ahead overlapping across the
  track). Captured ONCE at entry and never re-sorted; 2, 3 or 4 racers in practice. Before this it
  was `ordered.slice(0, 2)` — a pair, always.
- **corridor CAP** — the opposite of the corridor guarantee and easy to confuse with it. **A
  guarantee is a floor on how much world is in shot; the cap is a CEILING** — the photo-finish shot
  is never WIDER than the road. It is composed with `Math.max` on the zoom where every guarantee is
  composed with `Math.min`, arrives over `corridorCapArriveMs` rather than in one frame, and is
  gated by `contenderZoom` along with the set. **The corridor FLOOR — never TIGHTER than the road —
  is a different mechanism, was never shipped, and is retired**; see DEAD-ENDS §N.
- **company guarantee** — enough of the field stays in frame that the shot has tension. This one is
  dramaturgical, not geometric: it protects against showing a leader alone in an empty frame.

**corridor (zoom unit)** — see the trap table above. Zoom is expressed in track widths.

**forward framing** — the subject sits ahead of centre so the frame carries the action behind it. Used
when nothing worth seeing is ahead of the subject.

**battle / pulk group** — the clump of racers that triggers a battle shot.

**photo finish · drama pulse · lookback** — the closing sequence: the shot on the line, the beat after
it, and the camera settling back to take in the finish.

**name tag** — a racer's on-screen label. At the start formation ALL of them are shown, deliberately,
so a viewer can find their racer once.

---

## Verification, and the ceremony around it

**fingerprint** — a hash over what the code DOES, used to prove a change did or did not move the
picture. Three of them, and they answer different questions:

- **world** — did the RACE change (physics, plan, outcome)?
- **camera** — did the DIRECTOR's decisions change?
- **render** — did the DRAW CALL SEQUENCE change?

Current values live in [fingerprints.json](fingerprints.json) and in no document.

**mint** — to record a new fingerprint value as the official one. Only done deliberately, as part of
the ceremony, and never on an agent's own authority.

**ship ceremony** — the checklist a behaviour-moving change must follow. Owned by
[SHIP-CEREMONY.md](SHIP-CEREMONY.md).

**engine reach** — the transitive closure of what `raceCore.js` imports. If your change touches a file
inside it, the race can see your change and the world fingerprint must be run. Ask the repo rather
than guessing: `node scripts/engine-reach.mjs --check <paths>`. **It answers about the paths you
GIVE it — it reads no diff of its own** — so exit `2` means it was asked nothing and is never a
clearance; `1` is the real negative.

**guard** — a script that checks a rule and fails loudly. **verify** — `npm run verify`, which picks
the guards that can possibly have something to say about your diff. Both owned by
[VERIFY-RULES.md](VERIFY-RULES.md).

**sim** — the headless simulator. Shares its physics modules with the browser so its answers transfer.
Owned by [SIM.md](SIM.md); the measurement stack around it is [SWEEP-HARNESS.md](SWEEP-HARNESS.md).

**parity** — browser and sim producing the same race from the same seed. Not automatic; hard-won.

**sweep** — running many races across tracks and settings to get a number that is not noise.

**observer** — a hook that watches a simulated race and records one metric.

**gate** — a measurement a change must pass before it can ship.

**Holm** — the Holm correction, applied to per-start-row win chi-squared tests so that testing ten
rows does not manufacture a false positive. "Holm-unfair" = a start row that fails after correction.

**eye test** — the owner watching a race and judging how it LOOKS. A fingerprint cannot answer that,
and an eye cannot certify that nothing else moved. They answer different questions; see
[VERIFY-RULES.md](VERIFY-RULES.md) R5.

**Quick Test** — the seeded in-browser race used for reproducible eye tests.
See [EYE-TEST-SEEDS.md](EYE-TEST-SEEDS.md) for what a seed does and does not guarantee.

**return tag** — a git tag marking a state worth being able to come back to. Registered in
[TAGS.md](TAGS.md), which a guard checks.

**sabotage** — deliberately breaking the thing a new test claims to protect, to prove the test fails.
A test that has never failed has not been shown to work.

---

## Two words about the words

**A racer's NAME is physics.** `stablePairBit` hashes `r.name` into a tie-break, so renaming a racer
can change who wins. Never "just rename" a roster. Recorded in `racerNames.js`'s own header.

**PULK is a loanword** and it is the one term here with no English gloss anywhere in the repo. In use
it means the main pack — the bunched field. It survives as a phase name.
