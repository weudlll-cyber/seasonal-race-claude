# LADDER-VALIDATION-1 — the middle stage, on every track the game ships

**Branch:** `diag/ladder-validation-1` off master. **Measurement only.** No default moved, no key
wired, no dial designed. **NIGHT-2026-08-23, piece 1.**

Two arms: **SHIPPED** and **MIDDLE STAGE** (`pulkLeaderBrake` at its shipped value plus
`pulkChallengerBoost=0.12`). **All 10 shipped tracks at their own default racer, N=100, 80 racers on
open tracks and 40 on closed. 20 cells, all completed.**

---

## 1. The answer

**THE MIDDLE STAGE HOLDS EVERYWHERE. It is not a two-track result.**

- **ACTION IS UP ON ALL TEN TRACKS, ON BOTH FRONT CUTS, AND EVERY CELL IS OUTSIDE ITS INTERVAL.**
  Leading-group pair swaps **+10.2% to +21.8%**; changes of first place **+13.9% to +26.3%**.
  **20 of 20 action cells significant** on those two cuts. Whole-field churn is up on 9 of 10.
- **IT COSTS NO MEASURABLE BAND ARRIVAL ANYWHERE.** **All ten cells UNDECIDED**, at intervals of
  **±0.99 to ±1.75pp** — much tighter than the screen's ±2.2–3.0pp. The largest movement in either
  direction is **1.38pp**.
- **AND IT IS NATURALNESS-FREE AT DOUBLE THE FIELD, which was the open question.** **0 of 100 races
  below the 0.80 floor on every track, in both arms, at both field sizes**, and **0.0% of racer-frames
  at the brake's floor.** The brief's specific worry — that a crowded field is exactly where this
  could change — **is answered: it does not change.**
- **THE START-ROW WATCHDOG CANNOT SPEAK ON 8 OF 10 TRACKS, and that is a finding about the SHIPPED
  world rather than about this arm.** The shipped baseline itself trips on eight tracks at N=100. Only
  **city-circuit** and **ice-track** have a clean baseline — **and the middle stage stays clean on
  both.**

**What this does NOT establish is the top stage.** This run measures the middle stage against shipped.
It says nothing about `brake 0.15 + boost 0.12`, which WILD-STAGE-1 measured on two tracks and found
**breaches the naturalness floor**. **The ladder's top rung is still a two-track result.**

---

## 2. Field size — and a confound that has to be said first

**THE DESIGN CONFOUNDS FIELD SIZE WITH TOPOLOGY, BY CONSTRUCTION.** Every closed track ran 40 racers
and every open track ran 80, as the brief specified. **So the closed-vs-open difference below cannot
be attributed to either variable**, and I am not going to attribute it:

| group | leading-group swaps | changes of first place |
| --- | --- | --- |
| **CLOSED — 40 racers** (5 tracks) | mean **+16.5%** (range +10.2 … +21.8) | mean **+20.5%** |
| **OPEN — 80 racers** (5 tracks) | mean **+12.8%** (range +10.8 … +14.4) | mean **+14.6%** |

**The effect is smaller in the 80-racer group. Whether that is the field size or the topology, this
grid cannot say.**

**BUT ONE CLEAN WITHIN-TRACK TEST EXISTS, and it answers the brief's question directly.** `river-run`
was measured at **40 racers** by WILD-STAGE-1 and at **80 racers** here — same track, same arm, same
lever:

| | leading-group swaps |
| --- | --- |
| river-run, **40 racers** (WILD-STAGE-1, N=30) | 36.433 → 41.067 = **+12.7%** |
| river-run, **80 racers** (this run, N=100) | 38.80 → 43.60 = **+12.4%** |

**The effect HOLDS when the field doubles on the same track — +12.7% against +12.4%.** That is the
only comparison in the record that varies field size while holding topology, and **it says the size
is not what moves the number.**

**`dirt-oval` is the other track both runs share, and it stayed at 40 racers in both**, so it tests N
rather than field size: +22.6% at N=30 against **+18.9% at N=100**. Same direction, smaller at the
larger sample — **which is the ordinary behaviour of an effect measured at a screen N and then
properly.**

**NO TRACK REVERSES.** Nowhere does the 40-racer answer differ in sign from the 80-racer one.

---

## 3. The measurements

**N=100 throughout, seed 1, `--dur=60`, each track at its own `defaultRacerTypeId`. Every arm compared
ONLY against the shipped baseline of the SAME track at the SAME N.** Field size by topology, read from
source: `EditorShape.js:25` sets `isOpen = !track.closed`, and `closed` is a field in each track's own
JSON — so the split is the game's, not a guess from the names.

### a) Band arrival — READ from `computeZoneSuccessRate` via `--hero-map`, never re-derived

| track | field | shipped | middle | Δ | 95% CI | verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| dirt-oval | 40 | 87.63% | 89.00% | +1.38pp | ±1.51pp | **UNDECIDED** |
| city-circuit | 40 | 89.72% | 89.83% | +0.10pp | ±1.62pp | **UNDECIDED** |
| garden-path | 40 | 90.40% | 90.15% | −0.25pp | ±1.75pp | **UNDECIDED** |
| ice-track | 40 | 90.18% | 88.80% | −1.38pp | ±1.50pp | **UNDECIDED** |
| searound | 40 | 89.25% | 89.18% | −0.07pp | ±1.54pp | **UNDECIDED** |
| luger-hill | 80 | 88.81% | 88.48% | −0.34pp | ±1.10pp | **UNDECIDED** |
| mountainstreet | 80 | 89.85% | 89.92% | +0.08pp | ±1.08pp | **UNDECIDED** |
| river-run | 80 | 88.15% | 88.25% | +0.10pp | ±1.14pp | **UNDECIDED** |
| seatrack | 80 | 90.18% | 89.44% | −0.74pp | ±1.07pp | **UNDECIDED** |
| space-sprint | 80 | 90.48% | 90.25% | −0.23pp | ±0.99pp | **UNDECIDED** |

**Ten of ten inside interval.** Two cells (dirt-oval, ice-track) sit close to their edge in opposite
directions, which is what ten independent draws around zero look like.

### b) Action — all three cuts, absolute counts beside the percentages

| track | field | n=1 · leader changes | **top 5 · pair swaps** | whole field · churn/frame |
| --- | ---: | --- | --- | --- |
| dirt-oval | 40 | +19.0% (8.05→9.58) | **+18.9% (27.52→32.71)** | +11.4% |
| city-circuit | 40 | +18.6% (12.40→14.71) | **+14.5% (37.61→43.06)** | +17.8% |
| garden-path | 40 | +26.3% (12.58→15.89) | **+21.8% (35.26→42.94)** | +17.7% |
| ice-track | 40 | +16.0% (12.10→14.04) | **+10.2% (37.57→41.39)** | +16.4% |
| searound | 40 | +22.6% (8.61→10.56) | **+17.1% (29.18→34.17)** | +16.0% |
| luger-hill | 80 | +14.8% (12.09→13.88) | **+13.5% (39.26→44.56)** | +6.2% |
| mountainstreet | 80 | +13.9% (13.75→15.66) | **+14.4% (39.21→44.86)** | +2.7% |
| river-run | 80 | +16.1% (13.00→15.09) | **+12.4% (38.80→43.60)** | +2.9% *(ns)* |
| seatrack | 80 | +14.0% (13.55→15.45) | **+10.8% (40.39→44.75)** | +3.3% |
| space-sprint | 80 | +14.3% (12.77→14.60) | **+12.7% (39.16→44.13)** | +4.6% |

**Every cell is outside its interval except the one marked *(ns)*** — river-run's whole-field churn.
**Both front cuts are significant on all ten tracks**, and **they agree in sign everywhere**, which is
the thing BRAKE-CURVE-1 found they do NOT do for the brake past 0.15.

### c) Naturalness — per-race minimum realised speed factor, and races below the 0.80 floor

| track | field | shipped meanMin | races < 0.80 | middle meanMin | races < 0.80 | frames at floor | middle maxSF |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| dirt-oval | 40 | 0.8579 | **0/100** | 0.8457 | **0/100** | 0.0% | 1.1816 |
| city-circuit | 40 | 0.8517 | **0/100** | 0.8409 | **0/100** | 0.0% | 1.1819 |
| garden-path | 40 | 0.8462 | **0/100** | 0.8348 | **0/100** | 0.0% | 1.1819 |
| ice-track | 40 | 0.8505 | **0/100** | 0.8417 | **0/100** | 0.0% | 1.1818 |
| searound | 40 | 0.8570 | **0/100** | 0.8439 | **0/100** | 0.0% | 1.1818 |
| luger-hill | 80 | 0.8518 | **0/100** | 0.8421 | **0/100** | 0.0% | 1.1819 |
| mountainstreet | 80 | 0.8495 | **0/100** | 0.8417 | **0/100** | 0.0% | 1.1817 |
| river-run | 80 | 0.8565 | **0/100** | 0.8479 | **0/100** | 0.0% | 1.1816 |
| seatrack | 80 | 0.8506 | **0/100** | 0.8375 | **0/100** | 0.0% | 1.1817 |
| space-sprint | 80 | 0.8482 | **0/100** | 0.8405 | **0/100** | 0.0% | 1.1817 |

**2000 races. Not one dips below the floor.** The middle stage costs about **0.010 of mean minimum
speed factor** — real, consistent, and an order of magnitude away from the line. **80 racers changes
nothing**, which is the specific question the brief raised.

**The fast side sits at the effective cap, exactly as ENVELOPE-ONE-SIDED-1 predicted.** Every
middle-stage cell reads **1.1816–1.1819** against the computed ceiling of ≈1.1813 — the boost is
pinned at its clamp on every track, and the small excess is the area-bonus and trajectory multipliers
riding outside the clamp's reach, which that report established at source last night.

### d) The start-row watchdog — and whether it can speak

| track | field | shipped | middle | can it speak? |
| --- | ---: | --- | --- | --- |
| city-circuit | 40 | unfair=false (p 1.00) | unfair=false (p 1.00) | **YES — and the arm is clean** |
| ice-track | 40 | unfair=false (p 0.38) | unfair=false (p 1.00) | **YES — and the arm is clean** |
| dirt-oval | 40 | unfair=**true** (p 0.02) | unfair=true (p 0.02) | **NO — baseline trips** |
| garden-path | 40 | unfair=**true** (p 0.04) | unfair=true (p 0.02) | **NO — baseline trips** |
| searound | 40 | unfair=**true** (p 0.02) | unfair=true (p 0.02) | **NO — baseline trips** |
| luger-hill | 80 | unfair=**true** (p 0.02) | unfair=true (p 0.02) | **NO — baseline trips** |
| mountainstreet | 80 | unfair=**true** (p 0.02) | unfair=true (p 0.02) | **NO — baseline trips** |
| river-run | 80 | unfair=**true** (p 0.02) | unfair=true (p 0.04) | **NO — baseline trips** |
| seatrack | 80 | unfair=**true** (p 0.02) | unfair=true (p 0.02) | **NO — baseline trips** |
| space-sprint | 80 | unfair=**true** (p 0.02) | unfair=true (p 0.02) | **NO — baseline trips** |

**THE WATCHDOG IS SILENT ON EIGHT OF TEN TRACKS, and it is the shipped world that silences it.** This
is not new in kind — ACTION-FAIRNESS-1 recorded it for dirt-oval and FAIRNESS.md documents a
pre-existing start-row gradient — **but the scale is new: at N=100 it is eight tracks, not one.**
**Where it CAN speak, it says the arm is clean**, and on ice-track it reads cleaner under the arm
(0.38 → 1.00), which at this N is noise and not an improvement.

**This says nothing bad about the middle stage** — an arm cell carries no information where the
baseline already trips. **It says the fairness instrument the project relies on cannot currently
answer the start-row question on most of the game.**

---

## 4. What the N could not support

- **The watchdog question is now the weakest part of the fairness picture, and N will not fix it.**
  Eight baselines trip at N=100. Raising N makes the Holm test MORE sensitive, so it would trip on
  more tracks, not fewer. **This needs a different instrument or a decision that the gradient is
  accepted — not a bigger sample.**
- **Band arrival is UNDECIDED everywhere, and at ±1.0–1.75pp that is a real result rather than a
  shrug.** A cost of 2pp would have been visible on every track. **What remains invisible is a
  systematic ~0.5pp**, which ten tracks scattering around zero argues against but does not exclude.
- **The top stage is untouched by this run.** `brake 0.15 + boost 0.12` was measured on two tracks
  only, and it **breached** the naturalness floor there. **Nothing here extends that to ten tracks,
  and nothing here should be read as validating it.**
- **Field size and topology are confounded**, §2. One within-track comparison exists and it is
  river-run's.

---

## 5. Source hygiene

**Band arrival is READ, never re-derived** — `--hero-map`'s `fairness.bandReach`, resolving through
`computeZoneSuccessRate`. **Only the intervals are computed here**, from per-race rates produced by
**importing that same shipped function** and feeding it one race at a time.

**The action cuts are FRONT-ACTION-TRUTH-1's**, unchanged: `leadChangesPulk`, `heldTop5Overtakes`,
`rankChurn/frames`, all from the `--action-metrics` window.

**Naturalness is `--brake-depth`**, carried from `diag/brake-curve-1` into the sweep's worktree for
the run. **Piece 9 merges that observer to master properly**; this run did not need it merged.

**Topology established at source, not assumed from names:** `EditorShape.js:25` — `this.isOpen =
!track.closed` — consumed at `sim-fairness.mjs:4339`. Each track's `closed` flag was read from its own
JSON. **Closed: city-circuit, dirt-oval, garden-path, ice-track, searound. Open: luger-hill,
mountainstreet, river-run, seatrack, space-sprint.**

**Per-cell isolation:** one output directory and one `--diagLabel` per cell, so no two workers could
overwrite each other's dump — the collision FRONT-ACTION-TRUTH-1 recorded. **A completed cell is
skipped and never recomputed**, so the grid was resumable at a whole-cell boundary throughout.

**Ran in its own git worktree** (`c:/tmp/night-sweep`), so the main tree could be checked out, edited
and merged by the night's five documents-only pieces without ever switching a tree the measurement was
reading.

**20 cells, all `exit=0`, 86.4 minutes wall clock on 8 workers.** Cell times: 2853–3218 s for 80-racer
cells, 654–1653 s for 40-racer cells.

---

## 6. Build-vs-spec conformity

1. **THE SWEEP WAS NEVER SLOW AND I SAID THREE TIMES THAT IT WAS.** I reported "2h20m with zero cells"
   and later "5 hours, zero cells", diagnosed a contention problem, published two ETAs, withdrew both,
   and told the owner that closing his browser was the single biggest thing that would speed it up.
   **He closed it. It changed nothing — 154.7 core-seconds per 20 s before, 157.1 after.**
   **The whole grid took 86 minutes, start to finish.** My elapsed-time claims were estimates from the
   shape of the conversation rather than readings of a clock, and they were wrong by roughly 4×.
   **There was no anomaly to explain, and I produced two confident explanations for it anyway.**
   The lesson is not about probes: **it is that I asserted a measurement — elapsed time — that I had
   never actually measured**, while being careful about every measurement the harness produced.
2. **8 workers on 14 cores was too cautious**, and the reasoning was built on the same phantom: the
   resident processes were using under 5% of the machine, so about six cores were idle for the whole
   run. **12 workers would have been right.**
3. **Field size and topology are confounded and the brief's design is why** — stated in §2 rather than
   quietly reported as a field-size effect, which is what the numbers superficially look like.
4. **R15 — what was run and why.** No default moved and no product code changed; the only source
   difference in the sweep's worktree was the flag-gated `--brake-depth` observer, whose inertness
   BRAKE-CURVE-1 proved by fingerprint and which this run did not re-prove. **No client suite, no
   browser gate and no fingerprint were run for this piece**: it changes no file any of them reads,
   and its branch carries the report only.
5. **Nothing is proposed as a change.** No default moved, no key wired, no dial designed, no mapping
   suggested.

---

## 7. Proposals

**P1 — THE START-ROW WATCHDOG IS THE THING TO FIX NEXT, AND THIS RUN IS THE ARGUMENT.** It is silent
on **8 of 10 tracks** because the shipped world trips it, and **more races will make that worse rather
than better.** The project's fairness gate has two halves and one of them currently cannot answer on
most of the game. **Three routes exist and this block does not choose between them:** accept the
gradient explicitly and gate on the other half; find and remove the Layer-1 cause; or replace the Holm
test with one whose null is the shipped world rather than a uniform prior. **What should not happen is
another block reporting "watchdog clean where it can speak" as though that were most of the game.**

**P2 — THE MIDDLE STAGE IS NOW BETTER EVIDENCED THAN THE TOP STAGE BY AN ORDER OF MAGNITUDE, AND THE
LADDER SHOULD PROBABLY BE BUILT FROM THE BOTTOM.** This arm has 10 tracks × 100 races, two field
sizes, all three action cuts, and a clean naturalness sheet. **The top stage has two tracks × 30 races
and a floor breach.** **If a three-stage dial has to ship before the top rung is validated, the honest
shape is quiet / medium / medium-plus-something-measured** rather than a wild stage resting on a
two-track screen. **This is an observation about the evidence, not a design proposal.**

**P3 — MEASURE THE TOP STAGE ON THIS GRID BEFORE IT IS DESIGNED IN.** The same 20-cell shape with
`brake 0.15 + boost 0.12` as the second arm would answer, on every track, the question WILD-STAGE-1
could only answer on two: **does the combination breach the naturalness floor everywhere, or only on
dirt-oval and river-run?** **Cost is known now rather than guessed: 86 minutes on 8 workers, and about
half that on 12.** It is the cheapest remaining question in the whole dial design.

**P4 — RUN THE GRID WITH `--racers` HELD CONSTANT ONCE, TO UNCONFOUND §2.** Ten tracks at 40 racers,
or ten at 80, would separate topology from field size — which this design cannot. **It is not urgent**,
because the one within-track comparison available says the effect holds at double the field, **but the
closed-vs-open gap in §2 will otherwise keep being read as a field-size finding by anyone who skims
the table.**
