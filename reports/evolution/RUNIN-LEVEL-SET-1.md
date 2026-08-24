# RUNIN-LEVEL-SET-1 — the owner's rule of 2026-08-24, measured before it is built

**Date:** 2026-08-24 · **Branch:** `diag/runin-level-set-1` (off `master` at `27bce9b7`) ·
**MEASURE ONLY. Nothing is built. No camera code, no default, no key.**
**1,260 races · 521,320 run-in frames · the corpus RUNIN-CONTENDER-GUARANTEE-1 already used.**

**THE RULE HOLDS ALL TWELVE OF HIS RACES, AND IT COSTS THE FINISH LINE NOTHING.**

- **12 of 12.** Every race where the winner is outside the picture at the line: **568 winner-off
  frames → 0**. Every top-five finisher too, in all twelve.
- **THE FINISH LINE IS UNTOUCHED — 85.7% of frames today, 85.8% under the rule.** That is the
  question the previous block left open, and the answer is the opposite of the contender-sole
  reading, which lost the line on two-thirds to five-sixths of frames. Composed widen-only, this rule
  can only ever *help* the line.
- **IT DOES ADDRESS HIS FAULT AND NOT SOMETHING ELSE.** Of the frames where it widens the shot,
  **80.9% do so because the binding member is farther to the SIDE than behind.**
- **BUT IT NEEDS THE PRESENCE REPAIR TO DELIVER ANY OF IT.** As a SPAN guarantee — the mechanism as
  it stands — it removes **11 of 126** winner-off races. Measured from the anchor it removes **93**.
  **A rule that guarantees a span cannot keep a racer in frame**, and that is now a number rather
  than an argument.
- **It costs the forward view nothing** — the room ahead of the leader *grows*, 395 → 410 world px.

---

## 1. HIS RACES, one by one

The twelve LATE-LEAD-AXIS-1 found with the winner off frame across the track at the line. The shipped
column reproduces that report's frame counts exactly, which is the check that this is the same corpus
and the same visibility test.

| race | closing frames | **winner OFF: shipped → SPAN → PRESENCE** | top-5 off, shipped → presence | **finish line in frame, shipped → presence** | across-track room, world px |
| --- | --- | --- | --- | --- | --- |
| **river-run 20, seed 49** | 364 | **99 → 0 → 0** | 99 → **0** | 85.2% → 85.2% | 345 → 441 |
| river-run 20, seed 23 | 336 | **92 → 0 → 0** | 92 → **0** | 85.4% → 85.4% | 264 → 353 |
| river-run 40, seed 30 | 338 | **81 → 0 → 0** | 81 → **0** | 83.1% → 83.1% | 281 → 372 |
| river-run 20, seed 32 | 415 | **77 → 0 → 0** | 77 → **0** | 86.5% → 86.5% | 384 → 449 |
| mountainstreet 20, seed 13 | 344 | **59 → 0 → 0** | 62 → **0** | 84.3% → 84.3% | 397 → 470 |
| river-run 40, seed 23 | 417 | **37 → 0 → 0** | 37 → **0** | 86.8% → 86.8% | 384 → 423 |
| **luger-hill 40, seed 11** | 462 | **35 → 35 → 0** | 35 → **0** | 82.3% → 82.3% | 512 → 561 |
| river-run 20, seed 55 | 444 | **30 → 0 → 0** | 89 → **0** | 82.4% → 82.4% | 376 → 446 |
| mountainstreet 20, seed 34 | 333 | **26 → 0 → 0** | 70 → **0** | 85.3% → 85.3% | 337 → 412 |
| seatrack 20, seed 5 | 334 | **26 → 0 → 0** | 26 → **0** | 82.9% → 82.9% | 788 → 852 |
| luger-hill 20, seed 51 | 421 | **5 → 0 → 0** | 5 → **0** | 86.7% → 86.7% | 463 → 508 |
| seatrack 20, seed 11 | 331 | **1 → 0 → 0** | 1 → **0** | 82.5% → 82.5% | 769 → 844 |
| **TOTAL** | | **568 → 35 → 0** · **12 races → 1 → 0** | | **unchanged on every one** | |

### `river-run` seed 49 — the worked example

The race where the winner leaves over the top edge and the fourth-place finisher over the bottom,
opposite sides of the road in one closing move. **The rule holds both, on every one of the 364
frames** — the winner's 99 off-frames and the race's 99 top-five off-frames both go to zero.

The mechanism is legible in this one race. The rule's set is three to five racers where the shipped
set is two or three, and **the winner is in it on 364 of 364 frames against 301 shipped**. It widens
on 217 frames in two episodes, and **on every one of those 217 frames the binding member is farther
to the side than behind — 217 side, 0 behind.** The across-track room goes from 345 to 441 world px
on a road 300 wide. **The finish line is in frame on exactly the same 310 frames as today.**

### The one race the SPAN reading cannot fix, and why

**`luger-hill` 40 seed 11 is unchanged by the span guarantee — 35 → 35 — and fixed completely by the
presence reading, 35 → 0.** RUNIN-CONTENDER-GUARANTEE-1 diagnosed it: the set's two members are about
46 world px apart but sit a mean 105.8 world px *from the anchor*. Their SPAN fits the frame easily,
so a span guarantee never fires; their PRESENCE does not, because the anchor is the pair midpoint
taken on the racing line and the pair is running wide of it. **Widening the set does not help here —
the owner's rule admits the same racers — because the defect is not who is in the set. It is what the
guarantee measures.** §6 gives the number over the whole corpus.

---

## 2. (a) THE SET the rule produces

**THE UNIT, READ AT SOURCE AND NOT REDEFINED.** One racer length is `contactLength` =
`(leader.drawnBodyLengthPx + r.drawnBodyLengthPx) / 2` — the same expression at
`CameraDirector.js:2719` (`_abreastContenders`) and `:2611` (`_updateContention`), and exactly one
body length between two equal racers. No second definition, and no key.

**WHAT THE RULE CHANGES ABOUT MEMBERSHIP, precisely.** `_abreastContenders` carries **two**
conditions: (1) within one body length along the track, and (2) **on a free lane** — not laterally
close to a racer already admitted. **The owner's rule is condition 1 alone**, because condition 2 is
an across-track test and he has now said the across-track distance decides nothing about membership.
Two further differences fall out of the same sentence: the rule is evaluated **live every frame**,
where the shipped set is *captured once at the PHOTO_FINISH transition and never re-sorted* (`:1622`);
and it has **no minimum of two**, where the shipped rule falls back to the top pair when fewer than
two survive.

### The distribution, over 521,320 frames

| set size | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8+ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **the owner's rule** | **39.1%** | 23.7% | 13.9% | 11.5% | 6.8% | 2.9% | 1.1% | 0.9% |
| shipped `_abreastContenders` | — | **77.2%** | 17.8% | 4.2% | 0.9% | 0.0% | 0.0% | — |
| previous block's predictive set | 41.0% | 22.5% | 13.7% | 9.4% | 6.0% | 3.3% | 1.7% | 2.0% |

**This is the shape he described and the shipped rule cannot express.** On **39.1%** of frames nobody
is within a length of the leader — a race already decided — and on **37.2%** three or more are. The
shipped rule answers "two" on better than three-quarters of frames whatever the race is doing.

**It is not simply a wider set.** It differs from the shipped one on **71.6% of frames**, adding
271,066 memberships and **dropping 204,063** — the drops are the shipped minimum-of-two fallback,
which admits a second racer who is *not* within a length. **The owner's rule can return the leader
alone; the shipped one never can.**

**And it is very close to the previous block's predictive reading** — which is a useful convergence,
because the two were derived from different sentences of his. The predictive version admits a longer
tail (up to 17 against 13) because it projects forward; the level rule reads the present only.

### Toward the line

| quarter of the closing stretch | mean size, the rule | mean size, shipped | **winner already in the rule's set** |
| --- | --- | --- | --- |
| 0.00–0.25 | 2.45 | 2.29 | 91.6% |
| 0.25–0.50 | 2.50 | 2.30 | 97.6% |
| 0.50–0.75 | 2.46 | 2.30 | 99.5% |
| **0.75–1.00** | 2.28 | 2.26 | **100.0%** |

**In the last quarter the eventual winner is in the rule's set on 100.0% of frames** — over all 1,260
races, and 96.7% across the whole stretch against 93.0% for the shipped set. **A build needs no
hindsight**: the rule catches the winner without being told who he is.

---

## 3. (b) THE WIDTH IT DEMANDS

Against the width shipped today, over all 521,320 frames:

| | **PRESENCE reading** | SPAN reading |
| --- | --- | --- |
| **widens the shot** | **9.4%** of frames | 3.3% |
| tighter than today | — | 59.2% |
| **no demand at all** (the set holds one racer) | — | **37.6%** |
| mean `ln(demand / shipped)` | +1.058 | +0.905 |

**HOW LONG: 1,047 widening episodes across 1,260 races — a mean of 47 frames each, about
three-quarters of a second, longest 212.** So it is not a standing widening; it fires roughly once
per race and holds for under a second.

| track | **widens (presence)** | tighter (span) | across-track room, shipped → rule (world px) | **× the road** | mean set size | road, px |
| --- | --- | --- | --- | --- | --- | --- |
| **river-run** | **20.1%** | 49.5% | 335 → 359 | 1.20 | 2.18 | 300 |
| **mountainstreet** | **16.3%** | 55.0% | 364 → 386 | 1.29 | 2.43 | 300 |
| **luger-hill** | **13.7%** | 60.8% | 420 → 446 | 1.79 | 2.36 | 250 |
| seatrack | 9.8% | 58.0% | 945 → 1012 | 3.37 | 2.28 | 300 |
| searound | 7.3% | 52.9% | 501 → 525 | 4.01 | 1.95 | 131 |
| dirt-oval | 7.0% | 63.7% | 551 → 557 | 3.13 | 2.77 | 178 |
| ice-track | 6.6% | 58.6% | 652 → 701 | 3.32 | 2.15 | 211 |
| space-sprint | 5.9% | 70.1% | 1303 → 1378 | 4.59 | 2.65 | 300 |
| city-circuit | 5.7% | 54.5% | 523 → 529 | 2.69 | 2.24 | 197 |

**The widening lands exactly where LATE-LEAD-AXIS-1 said the fault is.** river-run, mountainstreet and
luger-hill — the three tracks whose leader shot is narrowest against their road — take three to four
times the widening of the tracks whose shot already exceeds their road.

**IT IS TIGHTER FAR MORE OFTEN THAN IT IS WIDER, which is what makes it better than a fixed cap.** On
**59.2%** of frames the set would allow a closer shot than ships today. A race decided early ends up
closer; a race with five still in it opens. That is the behaviour a width tied to the road cannot
produce, because a fixed width holds the same wide shot in a procession and in a photo finish alike.

**One caution on the worst-case figure.** The single widest frame is 7.52 ln under the presence
reading — a member very far from the anchor at a moment the anchor swings. **That is an outlier and
must not be read as typical**; the per-track across-room columns above are the robust measure, and
this report has no percentile for it (see §7).

---

## 4. (c) WHY IT WIDENS — the across-track share

**This is the measure of whether the rule addresses his fault or something else.** Of the **49,243
frames** where the rule widens the shot, classified by whether the binding member sits farther across
the track than along it, measured from the anchor against the leader's own heading:

| | frames | share |
| --- | --- | --- |
| **the binding member is farther to the SIDE** | **39,816** | **80.9%** |
| the binding member is farther BEHIND | 9,427 | 19.1% |

Mean offset of the binding member from the anchor: **along 41.8 world px, across 59.6 world px.**

| track | widening frames | **SIDE share** | mean along, px | mean across, px |
| --- | --- | --- | --- | --- |
| dirt-oval | 10,609 | **89.2%** | 30.2 | 49.6 |
| river-run | 8,755 | **87.5%** | 30.8 | 71.5 |
| mountainstreet | 7,090 | **85.8%** | 39.7 | 78.6 |
| city-circuit | 3,091 | 81.4% | 38.3 | 51.1 |
| seatrack | 4,262 | 79.6% | 48.7 | 64.9 |
| ice-track | 3,389 | 78.7% | 33.8 | 52.6 |
| luger-hill | 6,070 | 77.3% | 52.8 | 60.6 |
| searound | 3,367 | 64.3% | 72.9 | 34.5 |
| **space-sprint** | 2,610 | **44.6%** | 69.9 | 49.3 |

**Four frames in five are the case he described.** The rule is not quietly buying width for racers
trailing off the back — the along-track membership test has already excluded those, by construction.
**space-sprint's 44.6% is the exception that confirms the reading**: its road runs down the screen, so
the across direction is the frame's long axis and there is far more room there — the same arithmetic
that gave it zero across-track departures in LATE-LEAD-AXIS-1 and the lowest across-binding share in
RUNIN-CONTENDER-GUARANTEE-1.

---

## 5. (e) THE FINISH LINE — the previous block's open question, answered

**IT COSTS NOTHING. 85.7% of frames today, 85.8% under the rule.**

| track | shipped | span reading | **presence reading** |
| --- | --- | --- | --- |
| dirt-oval | 88.0% | 88.0% | 88.0% |
| ice-track | 87.4% | 87.4% | **87.6%** |
| city-circuit | 86.5% | 86.5% | **86.6%** |
| searound | 84.9% | 84.9% | **85.3%** |
| river-run | 84.6% | 84.6% | **84.7%** |
| mountainstreet | 83.8% | 83.8% | 83.8% |
| luger-hill | 83.6% | 83.6% | **83.9%** |
| seatrack | 82.9% | 82.9% | **83.1%** |
| space-sprint | 82.8% | 82.8% | **82.9%** |

**Not one track loses ground, and six gain slightly.** The reason is structural rather than lucky: a
**widen-only** ceiling composed on top of the terms already there can only ever make the frame larger,
and a larger frame can only ever make a fixed world point *easier* to contain. **The contrast with
RUNIN-CONTENDER-GUARANTEE-1 is the whole point** — that block measured a contender demand acting
**alone**, which both widens and tightens, and its tightening is what lost the line (14.5–32.7% of
frames). **Composed as a guarantee, the same family of rule costs the line nothing.**

**So the answer to (e) is that the rule needs no shaping on this account.** What it does need is §6.

---

## 6. (g) SPAN vs PRESENCE — the rule needs the repair, and here is the size of it

RUNIN-CONTENDER-GUARANTEE-1 established that `pairGuarantee` fits the vectors *between* members: it
guarantees the set's **span**, not its **presence**, and takes no anchor. `corridorGuarantee` received
`anchorAt` for exactly this reason under CAMERA-ANCHOR-TRUTH-1; `pairGuarantee` never did.

**Measured on this rule, over 1,260 races:**

| | **a member of the rule's own set is off frame** | **the WINNER is off frame** |
| --- | --- | --- |
| shipped today | 1.4% of frames — **189 races** | 0.8% — **126 races** |
| the rule as a **SPAN** guarantee | 0.8% — **131 races** | 0.7% — **115 races** |
| the rule as a **PRESENCE** guarantee | **0.2% — 40 races** | **0.1% — 33 races** |

**THE SPAN READING REMOVES 11 OF THE 126 WINNER-OFF RACES. THE PRESENCE READING REMOVES 93.** The
repair is not a refinement of the rule; **it is most of the rule's value.** Building the membership
change without it would deliver less than a tenth of what the owner asked for, and it would look like
the rule had failed.

**And the rule's own promise is only kept under the presence reading.** It says a qualifying racer
*must be in frame*. As a span guarantee a member of its own set is still outside the picture in 131
races. As a presence guarantee, 40. **A rule that guarantees a span cannot keep a racer in frame** —
now a measurement, in the same direction and the same magnitude as the previous block found from the
other end.

Any top-five finisher off frame falls from **9.4% of frames in 663 races to 7.8% in 548**. The
residual is the opening glide, which is a different fault — LATE-LEAD-AXIS-1's Group A, along-track
and at the window opening — and the owner's 2026-08-24 phase rule is what addresses that one.

---

## 7. (f) WHAT IT COSTS THE FORWARD VIEW

**Nothing, and it gives a little back.**

| | shipped | under the rule |
| --- | --- | --- |
| fraction of the frame ahead of the leader | 0.5340 | **0.5340 — identical** |
| **room ahead of the leader, world px** | 395 | **410** |
| leader's drawn body, as a fraction of frame height | 0.1240 | 0.1159 |

The forward placement is a **fraction** of the frame (`_forwardFracNow`), and a guarantee widens
without steering — Lesson 192 — so it cannot move that fraction. Everything scales together, and a
wider frame therefore gives the leader **more** world ahead of him. **His requirement is untouched and
very slightly better served.**

**The one real cost is readability, and it is small.** The leader's drawn body falls from 12.40% to
11.59% of frame height — a 6.5% relative shrink, still an order of magnitude above the render path's
readability floor (`minDrawnFrameFrac` in `defaults.js`). **Nothing here approaches it.**

---

## 8. WHAT THE DATA COULD NOT SUPPORT

- **NOTHING HERE SAYS THE SHOT LOOKS RIGHT.** Every number is geometric. A shot that opens for
  three-quarters of a second roughly once a race, and opens *most* on the three tracks he watches
  most, may read as responsive or as restless. **That is the question this block exists to put to him
  before anything is built**, and it is the one a sweep cannot answer.
- **THE PRESENCE CEILING IS MY CONSTRUCTION AND EXISTS IN NO SHIPPED PATH.** It is built from the
  tree's own `roomFromPointAlong` and mirrors what `corridorGuarantee` does, but nothing computes it
  today. Its 12-of-12 result measures a thing that would have to be written.
- **THE COUNTERFACTUAL IS A ZOOM ABOUT THE ANCHOR** — exact for the forward bias, since
  `anchorScreenPoint` takes no zoom — but it omits `_applyLateralGuarantee`'s additional shift, which
  a real build would still apply. That omission **can only help**, so every "still off frame" above is
  conservative.
- **THE WIDENING MAGNITUDE HAS NO PERCENTILE HERE.** The harness kept means, shares and a maximum, and
  the maximum is a 7.52-ln outlier. **The typical widening on a firing frame is not reported**, and it
  should be before anyone sizes anything from this — the per-track across-room means in §3 are over
  ALL frames, so they understate the move on the frames it actually fires.
- **THE RULE IS SILENT ON 37.6% OF FRAMES.** With one member, `contenderGuarantee` returns Infinity —
  fewer than two points constrain nothing — so the requirement says nothing about the width when only
  the leader is left. This is the same gap RUNIN-CONTENDER-GUARANTEE-1 flagged, and it is still his to
  close.
- **THE SET IS EVALUATED LIVE, WHICH IS A CHANGE THE OWNER DID NOT ASK FOR IN WORDS.** His rule names
  a condition, not a cadence; evaluating it every frame follows from "must be in frame" but the
  shipped pin was bought by FINISH-PAIR-1 to stop the set re-sorting mid-shot. **No stability metric
  is reported here** — how often membership churns frame to frame is not measured, and a set that
  flickers would move the width with it.
- **`garden-path` produced no finishing order in 0 of 120 races**, a sixth consecutive sweep. Every
  figure rests on nine tracks.
- **Everything is headless, on a fixed camera seed, with consecutive-integer seeds** and unequal track
  weighting — the corpus is deliberately the same as LATE-LEAD-HUNT-1's, so its limits carry forward.
  The body bound is a circle on the larger drawn dimension, which makes "off frame" conservative.
- **The corridor cap is not modelled.** `_corridorWidthCap` imposes a lower bound on zoom — never
  wider than the road — scoped to PHOTO_FINISH and stood down during the scheduled endgame. §3 shows
  this rule asking for more than a road width on river-run and mountainstreet, so a build would have
  to settle how the two compose. The code says the contenders win; that has never been exercised here.

---

## 9. SOURCE HYGIENE, AND VERIFICATION

**MEASURE ONLY.** No production file was touched, no key added, `_guaranteeCeiling` and the endgame
schedule untouched. `_abreastContenders` and `_headingAt` are called read-only on the live director;
nothing computed here is fed back into the shot. The diff is this report, its INDEX line, and three
diagnostics under `scripts/diag/`.

**Machine and pool:** `os.cpus().length` read at launch = **14 logical cores**; pool sized at
`min(16, cores − 2)` = **12**, the project's own convention. 1,260 races across two phases.

**Nothing is reconstructed.** The unit is the director's own `contactLength` expression; the
comparison set is the director's own method; the anchor is `_framingProbe.afterLateral`; the heading
is `_headingAt`; the width authorities are `contenderGuarantee`, `frameExtentAlong` and
`roomFromPointAlong` imported from the shipped modules; the shipped zoom and offset are read off the
director each frame. **§1's shipped column reproduces LATE-LEAD-AXIS-1 exactly** — 99, 92, 81, 77, 59,
37, 35, 30, 26, 26, 5, 1 — which is the check that this is the same corpus.

**NO FINGERPRINTS, NO BROWSER GATE, NO CLIENT SUITE — a reason, not an omission.** Nothing changed
that any of them can see: the four instruments hash the race, the director's decisions and the draw
call sequence from the shipped defaults, and this block alters none of those. It adds no config key
and moves no default.

| guard | result |
| --- | --- |
| `check-doc-links` · `check-index` · `check-config-claims` · `check-language-closed` · `script-suite` | PASS |

---

## 10. BUILD VS SPEC — conformity

| the spec asked | status |
| --- | --- |
| measure only; build nothing; change nothing; add no key | **done** |
| read "one racer length" at source and use THAT; no second definition | **done** — §2, `contactLength` at `:2719` / `:2611` |
| (a) the set per frame: distribution not a mean, and how it changes toward the line | **done** — §2, both tables |
| (a) beside the shipped set and the previous block's set | **done** — §2, all three in one table |
| (b) width demanded vs shipped: how much wider, how often, how long, per track | **done** — §3, incl. 1,047 episodes at a mean of 47 frames |
| (b) how often it is TIGHTER | **done** — §3: 59.2% |
| (c) of the widening frames, how many are because a member is far to the SIDE | **done** — §4: **80.9%** |
| (d) his twelve, one by one; and river-run seed 49 | **done** — §1, FIRST; 12 of 12 |
| (d) where it does not hold, say why | **done** — §1, luger-hill 40 seed 11 under the span reading |
| (e) the finish-line figure for THIS rule, composed widen-only | **done** — §5: 85.7% → 85.8%, no track loses |
| (f) what it costs the forward view, in the run-in's own terms | **done** — §7: nothing; room ahead grows |
| (g) does it need the CAMERA-ANCHOR-TRUTH-1 repair; numbers with and without | **done** — §6: **126 → 115 without, 126 → 33 with** |
| say plainly if it cannot hold the line or costs too much | **done** — §5 and §7: it does neither |
| read the core count and size the pool from it | **done** — §9, 14 → 12 |
| no fingerprints, browser gate or client suite, with the reason | **done** — §9 |
| his races FIRST, then distributions, across-track share, finish line, limits, hygiene, conformity, proposals | **done** — this order |
| push the branch; merge the report only | **done** |

**One thing the brief expected that the measurement does not show.** It anticipated that the rule
might cost the finish line and need shaping. **It does not** — §5. What it needs instead is the
presence repair, which the brief raised as a question (g) rather than as the rule's precondition, and
which turns out to carry **most of the rule's value**.

---

## 11. PROPOSALS — candidates, none of them ordered

**His forward-view requirement is not under revision, and §7 shows this rule does not touch it.**

**1. The presence repair is the build, and the membership change is the smaller half.** §6 is
unambiguous: membership alone takes 126 winner-off races to 115; the anchor measurement takes it to
33. **Building the set change first would look like the rule failing.** The repair is the one
CAMERA-ANCHOR-TRUTH-1 already made to `corridorGuarantee`, in the same file, with the same helper —
`pairGuarantee` simply never received it. **Cost against the forward view: none.**

**2. Membership stability should be measured before the set goes live.** (Mine.) The shipped set is
pinned at the PHOTO_FINISH transition, and FINISH-PAIR-1 bought that pin to stop it re-sorting
mid-shot. This rule evaluates every frame, and a racer hovering at exactly one body length would join
and leave repeatedly — moving the width with him. **§8 records that no churn metric exists.** The
director already carries the easing machinery for this: `_contentionEased` blends a released racer
toward the leader over the run-in's own span, so the tool to absorb churn is written and running.
**Cost:** one measurement, before anything is built.

**3. The typical widening, not the maximum, is the number an eye-test needs.** (Mine.) §3 reports the
share of frames and a mean over all frames; the honest quantity for "how much does the picture move"
is the distribution of the widening **on the frames it fires**, which this harness did not keep.
**Cost:** a re-run of the same sweep with percentiles — no new races needed conceptually, but the
frames were not stored.

**4. river-run is the eye-test track and seed 49 is the first race.** It takes the most widening
(20.1% of frames), 87.5% of that widening is the across-track case, and seed 49 is the race where both
edges of the road lose a top-five finisher. **Cost: none; it is a viewing order.**

**5. The "silent on 37.6%" gap should be closed by him in one sentence, not by a default.** (Mine.)
When only the leader is left the rule constrains nothing, and the tightest honest reading of his
words is that the shot should then be the state's own — which is what ships today. **But that is a
reading.** The same gap has now been recorded by two consecutive blocks; it is cheap for him to close
and expensive to guess.

**6. This rule and the 2026-08-24 phase rule address different faults and should not be scored
together.** (Mine.) §6's residual — 33 races with the winner still off frame — is the opening glide,
which is along-track, at the window opening, and untouched by any width guarantee. The BACKLOG already
carries his phase instruction for it. **Cost of ignoring this:** a width change judged on a population
half of which it was never aimed at, which is how this strand has been burned before.

**7. Two sentences of his, derived independently, converge on nearly the same set.** (Mine.) The
predictive reading in RUNIN-CONTENDER-GUARANTEE-1 came from "can still win"; this one comes from "at
most one racer length behind". Their distributions differ by a few points and their last-quarter
winner capture is identical at 100.0%. **That is worth noticing before anyone tunes:** the membership
question is far less sensitive than it looks, and the leverage is all in §6.
