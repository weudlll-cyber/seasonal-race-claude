# RUNIN-CONTENDER-GUARANTEE-1 — the shape of "everyone who can still win stays in frame"

**Date:** 2026-08-24 · **Branch:** `diag/runin-contender-guarantee-1` (off `master` at `34bd608b`) ·
**MEASURE ONLY. Nothing is built. No camera code, no default and no rule is changed.**
**1,260 races · 521,320 run-in frames · the same seeds and tracks as LATE-LEAD-HUNT-1.**

**IT WORKS FOR HIS CASE, AND ONE REPAIR IS NEEDED FOR IT TO WORK COMPLETELY.**

- Of the **12 races where the winner is outside the picture at the line**, the guarantee as the
  mechanism stands today would have kept him in frame in **11**. The twelfth fails for a reason that
  is diagnosable, already known to this project, and already fixed once elsewhere: **the contender
  guarantee measures the set's SPAN, not the set's PRESENCE.** Measured from the anchor instead — the
  identical repair CAMERA-ANCHOR-TRUTH-1 made to `corridorGuarantee` — it is **12 of 12**.
- **It is not the fallback in different clothes.** Taken as a width in its own right it is **TIGHTER
  than today's shot on 59.8% of frames and wider on 3.3%** — a race decided early does end up closer.
- **AND IT CANNOT BE THE SOLE AUTHOR OF THE WIDTH.** As a pure demand it loses the finish line: on
  the four tracks that matter the line is in frame on **14.5–32.7%** of frames against **83–85%**
  today. It must stay a guarantee — widen-only, composed with the terms already there. Said plainly
  because the brief asked to be told if the approach cannot work as posed: **this part of it cannot.**

---

## 1. HIS TWELVE, AND THE WORKED EXAMPLE — answered per race

Every race LATE-LEAD-AXIS-1 found with the winner off frame **across the track at the line**. The
shipped column reproduces that report's own frame counts exactly, which is the check that this
harness is reading the same races.

| race | closing frames | **winner OFF: shipped → guarantee** | any top-5 off | across-track room, world px |
| --- | --- | --- | --- | --- |
| **river-run 20, seed 49** | 364 | **99 → 0** | 99 → 0 | 345 → 380 |
| river-run 20, seed 23 | 336 | **92 → 0** | 92 → 0 | 264 → 280 |
| river-run 40, seed 30 | 338 | **81 → 0** | 81 → 0 | 281 → 293 |
| river-run 20, seed 32 | 415 | **77 → 0** | 77 → 0 | 384 → 393 |
| mountainstreet 20, seed 13 | 344 | **59 → 0** | 62 → 0 | 397 → 419 |
| river-run 40, seed 23 | 417 | **37 → 0** | 37 → 0 | 384 → 398 |
| **luger-hill 40, seed 11** | 462 | **35 → 35 — THE ONE FAILURE** | 35 → 35 | 512 → 512 |
| river-run 20, seed 55 | 444 | **30 → 0** | 89 → 12 | 376 → 393 |
| mountainstreet 20, seed 34 | 333 | **26 → 0** | 70 → 0 | 337 → 360 |
| seatrack 20, seed 5 | 334 | **26 → 0** | 26 → 0 | 788 → 801 |
| luger-hill 20, seed 51 | 421 | **5 → 0** | 5 → 0 | 463 → 466 |
| seatrack 20, seed 11 | 331 | **1 → 0** | 1 → 0 | 769 → 784 |
| **TOTAL** | | **568 → 35 frames** · **12 races → 1** | | |

### `river-run` seed 49 — the worked example, and the both-axis question answered

**Yes. A both-axis guarantee holds both.** LATE-LEAD-AXIS-1 found the winner leaving over the top
edge and the fourth-place finisher over the bottom — opposite sides of the road in one race. Under
the guarantee **both are in frame on every one of the 364 closing frames**: the winner's 99 off-frames
go to 0 and so do the race's 99 top-5 off-frames.

The mechanism is visible in the numbers. Across the whole race the **across-track axis is the binding
one on 364 of 364 frames**; the set's along-track extent is a mean 19 world px against 49 across. At
the line the shipped shot holds **126 world px across a road 300 wide**; the guarantee asks for
**253**. The set is three racers, the winner is in it on 349 of 364 frames, and the required ceiling
sits at roughly half the shipped zoom for the whole last quarter.

### The one failure, diagnosed — and it is the same defect twice

On **luger-hill 40 seed 11** the guarantee changes nothing at all: the required ceiling is *tighter*
than the shipped zoom on every frame, so a widen-only rule never fires. The winner is in the set on
all 35 off-frames and the set has two members whose separation is only about 46 world px.

**The set fits; the set is not in the picture.** `pairGuarantee` (`framingRule.js`) fits the vector
BETWEEN two racers, so it guarantees the SPAN. It takes no anchor. A pair running wide *together* has
a small span and a large **common offset from the anchor** — and the anchor is the pair's midpoint
taken **on the racing line** (`getPanTarget` uses `shape.getPosition((r0.t + r1.t) / 2, 0)`,
deliberately, so the point stays on the road rather than cutting across the infield). That common
offset is structurally invisible to a span.

Measured on this race: the set sits a **mean 105.8 world px from the anchor, worst 143**, while the
frame holds ±64 across. Re-measured from the anchor — each member against the room the frame actually
has from where the anchor sits, which is exactly what `corridorGuarantee` was repaired to do by
CAMERA-ANCHOR-TRUTH-1 and what `pairGuarantee` never received — **the 35 off-frames become 0.**

**Over all 480 races on the four tracks that carry this fault:**

| | races with the winner off frame at all |
| --- | --- |
| shipped today | **60 of 480** |
| the span guarantee (the mechanism as it stands) | 49 |
| **the same guarantee measured FROM THE ANCHOR** | **7** |

The set sits a mean **78.3 world px** from its own anchor (worst 521), and the anchor-measured
ceiling is tighter than the span ceiling on **60.2% of frames**. **The span reading is not a small
approximation of the anchor reading; it is a different quantity.**

**And the code already names this failure.** `lateralShiftToFit` — the across-track *steering* half —
carries the line: *"Unsatisfiable: no shift fits everyone, which means the ZOOM guarantee should have
widened and did not."* That is his case, written down before it was measured.

---

## 2. (a) THE SET — how "can still win" is decided today

**THERE ARE TWO RULES IN THE TREE, and only one of them can ever admit anybody.**

**RULE 1 — `_abreastContenders` (`CameraDirector.js:2689`), the one that shapes the shot.** A racer
is a contender if he is **within one body length of the leader along the track right now**
(`contactLength` = the two half-lengths, `pairContact`'s own touch distance) **and on a free lane** —
not blocked across the track by somebody already admitted. It is **captured once, at the instant
PHOTO_FINISH is entered, and never re-sorted** (`:1622`, "CAPTURED ONCE, NEVER RE-SORTED"). It is
therefore a snapshot of an instant, not a live membership.

**RULE 2 — `_updateContention` (`:2570`), which is predictive and can only ever REMOVE.** It projects
the gap forward — `projected = gapNow + (vLeader − vR) × msToLine` — and where the projection exceeds
one body length the racer is eased out of the framing over the run-in's own opening span. It never
admits anyone.

**So today's answer to "who can still win" is: the two or three racers who happened to be level at
one instant, minus anyone the projection later rules out.**

### What the shipped rule admits, over 521,320 frames

| set size | 2 | 3 | 4 | 5 | 6+ |
| --- | --- | --- | --- | --- | --- |
| share of frames | **77.2%** | 17.8% | 4.2% | 0.9% | 0.0% |

**It is a pair rule in practice** — exactly two on better than three-quarters of frames, which is what
RUNIN-CONTENDERS-1 found from the other direction. It does not admit *almost nobody*; it admits
almost exactly two, always, whatever the race is doing. **That is the property that makes it unable
to express the owner's requirement**: the set does not widen when five are still in it.

### A defensible alternative reading — MINE, NOT HIS

**Marked as mine.** The tree already contains a predictive "can still win" test — rule 2 above. My
reading applies **that same test as an ADMISSION test, every frame, over the whole field**, instead of
only ever as a release. **It introduces no constant:** the projection, the cadence and the one-body-
length threshold are all the director's own.

| set size | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8+ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| share of frames | **37.4%** | 25.4% | 14.3% | 9.6% | 6.1% | 3.3% | 1.7% | 2.3% |

**That is the shape the owner described**: on 37.4% of frames nobody but the leader can still win — a
race already decided — and on 37.2% of frames three or more are still in it. A sensitivity ladder at
2×, 3× and 5× the contact length is in the harness output; at 5× the median set is nine, which is a
different picture and not one anybody has asked for.

**THE HINDSIGHT IN "OR WHO WINS" IS ALMOST FREE, which matters because a buildable rule cannot know
the winner:**

| quarter of the closing stretch | mean size, shipped | mean size, mine | **winner already in the shipped set** | **winner already in mine** |
| --- | --- | --- | --- | --- |
| 0.00–0.25 | 2.29 | 2.82 | 85.7% | 93.7% |
| 0.25–0.50 | 2.30 | 2.63 | 92.7% | 98.4% |
| 0.50–0.75 | 2.30 | 2.38 | 96.5% | 99.8% |
| **0.75–1.00** | 2.26 | 2.22 | **99.2%** | **100.0%** |

**In the last quarter of the closing stretch the eventual winner is in the predictive set on 100.0%
of frames.** "Or who wins" is not a second rule to build; it is a consequence of the first.

The predictive rule is not evaluable on **3.6%** of frames — no rate estimate yet — and the harness
falls back to the shipped set there.

---

## 3. (b) BOTH AXES — the guarantee is NOT along-track only

**ESTABLISHED AT SOURCE, and the hypothesis in the brief is FALSE.** `pairGuarantee` computes
`dx = b.x − a.x`, `dy = b.y − a.y` and hands the whole 2-D vector to `zoomCeilingToFit`, which fits it
against `frameExtentAlong` — the rectangle's true chord in that direction. **It is exact on every
heading, both axes, and always has been.** `contenderGuarantee` is that function over every pair in
the set, so a set spread across the road is bounded on the across axis by construction.

**THE REAL ANSWER IS THE ONE IN §1, and it is a finding in its own right.** The guarantee spans both
axes but **measures the chord through the frame's CENTRE and takes no anchor**. `corridorGuarantee`
takes `anchorAt` and honours each half separately, because CAMERA-ANCHOR-TRUTH-1 measured the old
form breaking its own promise on 69.0% of corridor frames. **`pairGuarantee` never received that
repair.** So widening it has never fixed his case not because it is blind to the across axis, but
because it is blind to WHERE the set is.

**The across-track steering exists and is separate.** `_applyLateralGuarantee` (`:2232`) shifts the
pan off the centreline to bring the corridor edges and the pair inside — and it *shifts*, it never
widens. Its own comment states the failure mode quoted in §1.

### What the two axes actually demand — measured

**ACROSS-TRACK is the binding axis on 79.1% of all frames**, along-track on 20.9%. The set's mean
extent is **39.8 world px across against 28.7 along**.

| track | across-track binds | mean along, px | mean across, px | widest across seen | road, px |
| --- | --- | --- | --- | --- | --- |
| **river-run** | **97.4%** | 19.1 | 48.7 | 222 | 300 |
| **mountainstreet** | **95.2%** | 27.1 | 47.4 | 230 | 300 |
| **luger-hill** | **94.5%** | 31.9 | 43.9 | 193 | 250 |
| dirt-oval | 90.1% | 30.0 | 38.8 | 145 | 178 |
| searound | 89.7% | 24.2 | 27.4 | 111 | 131 |
| city-circuit | 89.5% | 26.5 | 30.5 | 146 | 197 |
| ice-track | 70.3% | 26.2 | 31.6 | 168 | 211 |
| seatrack | 39.1% | 31.3 | 43.6 | 198 | 300 |
| **space-sprint** | **17.3%** | 39.3 | 52.8 | 225 | 300 |

**space-sprint's 17.3% is the exception that confirms the reading.** Its road runs down the screen, so
the across direction is the frame's LONG axis and there is far more room there — the same arithmetic
that gave it zero across-track departures in LATE-LEAD-AXIS-1. The three tracks where across binds
hardest are three of the four whose leader shot is narrower than their road.

---

## 4. (c) and (d) THE WIDTH IT WOULD DEMAND, and how often it is TIGHTER

Taken as a width in its own right, against the width shipped, over all 521,320 frames:

| | share of frames |
| --- | --- |
| **TIGHTER than today** | **59.8%** |
| WIDER than today | **3.3%** |
| no demand at all — the set holds one racer | **36.9%** |

Mean `ln(required / shipped)` = **+0.866** — the contender width is typically a good deal tighter.
Worst single frame: **1.115 ln wider**, 3.836 ln tighter.

**(d) IS ANSWERED YES: a race decided early does end up closer.** That is the property that makes
this different in kind from the fallback rather than merely different in value — and §6 is the price.

**THE 36.9% IS NOT A ROUNDING DETAIL AND IT IS REPORTED AS A GAP.** When only the leader can still
win, `contenderGuarantee` returns Infinity — fewer than two points constrain nothing. **The
requirement as worded says nothing about the width on more than a third of the closing stretch.** A
build would need a second term for that case; the director already has one in the state's own zoom.

### Per track — how much wider, how often, and against the road

| track | wider | tighter | across-track room, shipped → guarantee (world px) | **× the road**, shipped → guarantee | full road held, shipped → guarantee |
| --- | --- | --- | --- | --- | --- |
| **river-run** | **8.7%** | 50.8% | 335 → 341 | 1.12 → 1.14 | 51.5% → 52.9% |
| **mountainstreet** | **8.6%** | 56.0% | 364 → 370 | 1.21 → 1.23 | 56.2% → 57.9% |
| **luger-hill** | **5.0%** | 60.2% | 420 → 422 | 1.68 → 1.69 | 68.8% → 69.7% |
| seatrack | 3.9% | 59.6% | 945 → 948 | 3.15 → 3.16 | 76.9% → 77.3% |
| dirt-oval | 2.0% | 64.1% | 551 → 552 | 3.10 → 3.10 | 85.9% → 86.5% |
| space-sprint | 1.6% | 69.6% | 1303 → 1304 | 4.34 → 4.35 | 90.9% → 91.0% |
| city-circuit | 1.5% | 54.8% | 523 → 524 | 2.65 → 2.66 | 83.1% → 83.5% |
| ice-track | 1.5% | 56.6% | 652 → 653 | 3.09 → 3.09 | 82.4% → 82.4% |
| searound | 1.0% | 57.2% | 501 → 501 | 3.82 → 3.82 | 100.0% → 100.0% |

**The widening is concentrated exactly where LATE-LEAD-AXIS-1 said the fault is** — river-run,
mountainstreet and luger-hill take five to nine times more widening than the tracks whose shot
already exceeds their road. **In aggregate the shot barely moves** (a mean 6 world px across on
river-run), because it fires on one frame in twelve. **That is what a guarantee should look like:
absent almost always, decisive when it fires.**

---

## 5. (e) HIS SPECIFIC CASE — two contenders level, on opposite sides

Two set members within one body length along the track AND separated across it. "Opposite sides" is
not a number he gave, so it is reported as a curve rather than chosen:

| "opposite sides" read as | frames | share | races |
| --- | --- | --- | --- |
| ≥ 0.3 of the road apart | 131,766 | 25.3% | 535 of 1,260 |
| ≥ 0.4 of the road apart | 79,357 | 15.2% | 378 of 1,260 |
| **≥ 0.5 of the road apart** | **41,955** | **8.0%** | **238 of 1,260 (18.9%)** |

**So the case he describes occurs in about one race in five**, on the strictest reading of "opposite
sides", and the widest such separation seen is **230 world px**. On those frames the guarantee asks
for a wider shot than today on **16.1%** — five times its overall rate of 3.3%, which is the check
that the metric is picking out the right frames.

---

## 6. (g) AGAINST THE FALLBACK — and this is where the approach has a real limit

For the four tracks whose leader shot is narrower than their road, each width computed as the demand
**that term alone** makes, on frames where the set actually holds two or more:

| track | across-track room: **contender** / **full road** | empty road on screen: contender / road | **finish line in frame: contender / road / shipped today** | road demands the wider shot |
| --- | --- | --- | --- | --- |
| mountainstreet | 137 / 300 | 0.6% / 0.0% | **24.2% / 57.8% / 85.1%** | 94.2% |
| river-run | 158 / 300 | 0.4% / 0.0% | **32.7% / 71.3% / 84.9%** | 95.2% |
| seatrack | 188 / 300 | 2.3% / 0.0% | **14.5% / 26.2% / 83.0%** | 87.4% |
| luger-hill | 133 / 250 | 0.7% / 0.0% | **18.8% / 39.2% / 83.9%** | 92.9% |

Pooled, `ln(road demand / contender demand)` = **−0.792**: **the road asks for the wider shot on more
than nine frames in ten.**

**TWO CONCLUSIONS, and they point opposite ways.**

**The contender rule is the better GUARANTEE.** It is tight when the race is decided and wide exactly
when contenders are spread — the drama the owner asked for — and the empty-road column shows it
almost never shows more road than there is road: 0.4–2.3% empty against the fallback's 0.0%-by-
construction. There is no wasted picture in it.

**The contender rule is a WORSE SOLE AUTHOR, and by a margin nobody should absorb quietly.** On its
own it holds 133–188 world px across a 250–300 px road, and **the finish line falls out of frame on
two-thirds to five-sixths of frames** against 83–85% today. **That breaks his own requirement 5 — the
viewer must know where the line is.** The fallback does better on the line and still worse than
today.

**So the honest reading is: this is a CEILING to compose with what is already there, not a
replacement for it.** The director already computes the line's own demand (`_ceilings.line`) and the
state's own width; a contender ceiling belongs beside them under `Math.min`, which is the shape every
other guarantee in the file already has.

---

## 7. (h) WHAT IT COSTS THE FORWARD VIEW

**Measured: essentially nothing, and the reason is structural rather than lucky.**

| | shipped | under the guarantee |
| --- | --- | --- |
| fraction of the frame ahead of the leader | 0.534 | **0.534 — identical** |
| room ahead of the leader, world px | 395 | **397** |
| leader's drawn body, as a fraction of frame height | 0.1240 | 0.1215 |

**The forward placement is a FRACTION of the frame** (`_forwardFracNow`, which interpolates from the
mirror to the state's own answer across the run-in's sweep). **A guarantee widens and never steers —
Lesson 192 — so it cannot move that fraction.** Everything in the frame scales together: a wider shot
gives the leader MORE world ahead of him, not less. His requirement is untouched, and on these
numbers it is very slightly better served.

**The cost that does exist is readability, and it is small.** The leader's drawn body falls from
12.40% to 12.15% of the frame height — a 2% relative shrink, an order of magnitude above the
readability floor the render path applies (`minDrawnFrameFrac` in `defaults.js`). **Nothing here
approaches it.**

---

## 8. THE VERDICT, in one place

| the question | the answer |
| --- | --- |
| would it fix his twelve? | **11 of 12 as the mechanism stands; 12 of 12 measured from the anchor** |
| does it hold both racers in seed 49? | **yes — 99 off-frames to 0, both edges** |
| is it different from the fallback? | **yes — tighter on 59.8% of frames, and it asks for width only where the fault is** |
| does a decided race end up closer? | **yes** |
| can it be the sole author of the width? | **NO — the finish line drops out of frame on two-thirds to five-sixths of frames** |
| does it cost the forward view? | **no — the placement is a fraction, and it is untouched** |
| is the hindsight in "or who wins" buildable? | **yes — the winner is already in the predictive set on 100.0% of last-quarter frames** |
| is anything missing from the requirement as worded? | **yes — it says nothing about the width on the 36.9% of frames where only one racer can still win** |

---

## 9. WHAT THE DATA COULD NOT SUPPORT

- **THE COUNTERFACTUAL IS A ZOOM ABOUT THE ANCHOR, and its one omission is stated rather than
  buried.** `anchorScreenPoint` takes no zoom, so holding the anchor's screen position while changing
  width is exactly what `_applyLeaderForwardBias` does — the counterfactual is not an approximation
  there. What it omits is `_applyLateralGuarantee`'s additional shift, which a real build would still
  apply. **That omission can only help**, so every "still off frame" above is conservative and every
  "now in frame" is honest.
- **THE ANCHOR-MEASURED CEILING IS MY CONSTRUCTION AND IS NOT IN THE TREE.** It is built from the
  tree's own `roomFromPointAlong` and mirrors what `corridorGuarantee` does, but no shipped code path
  computes it. Its 12-of-12 result is a measurement of a thing that does not exist yet.
- **NOTHING HERE SAYS THE WIDER SHOT LOOKS RIGHT.** Every number is geometric. Whether a shot that
  opens when five are in contention and closes when one is reads as drama or as restlessness is an
  eye question, and this project's own record — two run-in blocks built and thrown away — is why it
  is being asked before anything is built rather than after.
- **THE PREDICTIVE SET IS MY READING OF HIS WORDS, not his rule.** It introduces no constant, but
  "can still win" is a judgement and one body length of projected gap is the tree's answer to a
  different question. The 2×/3×/5× ladder is reported so the choice stays visible.
- **THE SET IS SILENT ON 36.9% OF FRAMES** (§4). Every aggregate above that mixes those frames in —
  the "equal" share, the mean ln — carries them as "no opinion", not as agreement.
- **`garden-path` produced no finishing order in 0 of 120 races**, a fifth consecutive sweep. Every
  figure rests on nine tracks.
- **Everything is headless, on a fixed camera seed, with consecutive-integer seeds** rather than a
  random sample and unequal track weighting — the same limits LATE-LEAD-HUNT-1 recorded, carried
  forward because it is deliberately the same corpus.
- **The body bound is a circle on the larger drawn dimension**, which makes "off frame" conservative.
- **The corridor CAP is not modelled.** `_corridorWidthCap` imposes a lower bound on zoom — never
  wider than the road — scoped to PHOTO_FINISH and stood down during the scheduled endgame. A build
  would have to decide how it composes with a contender ceiling that sometimes asks for more than a
  road width; the code says the contenders win, but that has never been exercised against this rule.

---

## 10. SOURCE HYGIENE, AND VERIFICATION

**MEASURE ONLY.** No production file was touched. `_abreastContenders` and `_headingAt` are called
read-only on the live director; nothing computed here is fed back into the shot. The diff is this
report, its INDEX line, and four diagnostics under `scripts/diag/`.

**Machine and pool:** `os.cpus().length` read at launch = **14 logical cores**; pool sized at
`min(16, cores − 2)` = **12**, the project's own convention. 1,260 races across two phases, then a
second pass of 480 races on the four tracks §1 and §6 turn on.

**Nothing is reconstructed.** The set is the director's own method, the anchor is
`_framingProbe.afterLateral`, the heading is `_headingAt`, the width authorities are
`contenderGuarantee` / `zoomCeilingToFit` / `frameExtentAlong` / `roomFromPointAlong` imported from
the shipped modules, and the shipped zoom and offset are read off the director each frame. **The
shipped-column frame counts in §1 reproduce LATE-LEAD-AXIS-1's exactly** — 99, 92, 81, 77, 59, 37,
35, 30, 26, 26, 5, 1 — which is the check that this is the same corpus and the same visibility test.

**NO FINGERPRINTS, NO BROWSER GATE, NO CLIENT SUITE — a reason, not an omission.** Nothing changed
that any of them can see: the four instruments hash the race, the director's decisions and the draw
call sequence from the shipped defaults, and this block alters none of those. It adds no config key
and moves no default.

| guard | result |
| --- | --- |
| `check-doc-links` · `check-index` · `check-config-claims` · `check-language-closed` · `script-suite` | PASS |

---

## 11. BUILD VS SPEC — conformity

| the spec asked | status |
| --- | --- |
| measure only; build nothing; change no code, default or rule | **done** |
| do not touch `_guaranteeCeiling` or the endgame schedule; add no config key | **done** |
| (a) establish at source how "can still win" is decided today and state it | **done** — §2, and there are TWO rules, only one of which can admit |
| (a) distribution per frame, not a mean, and how it changes toward the line | **done** — §2, both tables |
| (a) if the shipped rule admits almost nobody, give a defensible alternative, marked as yours | **done** — §2; it admits almost exactly TWO, always, which is the same problem |
| (b) establish at source whether the guarantee is along-track only or both axes | **done** — §3: **both axes**, the hypothesis is false; the real defect is that it is anchor-blind |
| (b) across-track spread beside along-track, which binds, and the share | **done** — §3 table |
| (c) width demanded vs shipped, per track and per race, in schedule units and road fractions | **done** — §4 |
| (d) how often it would be TIGHTER | **done** — §4: 59.8%, and the 36.9% silent share is flagged |
| (e) two contenders level and on opposite sides: how often, how wide, against the shipped width | **done** — §5, as a curve over three readings |
| (f) his twelve, per race and not in aggregate; and seed 49 as the worked example | **done** — §1, FIRST |
| (g) against the fallback on the four tracks: empty road and finish-line findability | **done** — §6, and it is where the approach has a real limit |
| (h) what it costs the forward view, in the run-in's own terms | **done** — §7: nothing, structurally |
| say plainly if the approach cannot work | **done** — §6 and the header: it cannot be the SOLE author; as a guarantee it can |
| read the core count and size the pool from it | **done** — §10, 14 → 12 |
| no fingerprints, browser gate or client suite, with the reason | **done** — §10 |
| his twelve and seed 49 FIRST, then distributions, both axes, fallback, limits, hygiene, conformity, proposals | **done** — this order |
| push the branch; merge the report only | **done** |

**One correction to the brief's framing, flagged rather than absorbed.** It asks whether the guarantee
"spans only along-track", and suggests that would explain why widening has never fixed his case. **It
does not span only along-track** — it has been both-axis since it was written. The explanation is
different and is §1's: it guarantees a SPAN and not a PRESENCE, so it is blind to where the set sits
relative to the anchor. That is a repair this project has already made once, to the other guarantee.

---

## 12. PROPOSALS — candidates, none of them ordered

**His requirement that the leader drifts back behind the middle is NOT under revision, and §7 shows
this approach does not touch it.**

**1. If anything is built, the first thing to build is the ANCHOR-MEASURED ceiling, not the set.**
§1's numbers are unambiguous: the membership rule changes 60 races to 49, and the anchor measurement
changes 49 to 7. **The cheaper half is also the larger half.** It is the same repair
CAMERA-ANCHOR-TRUTH-1 already made to `corridorGuarantee`, in the same file, with the same helper —
`pairGuarantee` simply never received it. **Cost against the forward view: none.**

**2. The contender ceiling belongs beside the existing terms, never instead of them.** §6 is the
argument and it is not close: as a sole author it loses the finish line on two-thirds to five-sixths
of frames. **Cost of ignoring this:** a shot that satisfies the new requirement by breaking his
requirement 5, which is the shape of failure this strand has already produced twice.

**3. The requirement needs a second sentence for the decided race, and only he can supply it.**
(Mine.) On 36.9% of frames nobody but the leader can still win, and "everyone who can still win is in
frame" then constrains nothing at all. The tightest honest reading of "no closer zoom than that" is
that the shot should be the state's own — which is what ships today — but that is a reading, not his
word. **Cost of asking: one question.**

**4. The set should be live, not pinned.** (Mine.) `_abreastContenders` is captured once at the
PHOTO_FINISH transition and never re-sorted, and the contention watch can only remove. So a racer who
closes onto the leader inside the last second can never join the set that decides the width — and the
across-track case is precisely a racer arriving alongside. The predictive test that would admit him
is already in the file and is already running; it is pointed the other way. **Cost:** the pinning was
bought by FINISH-PAIR-1 to stop the set re-sorting mid-shot, so this trades a known stability
property for a membership one, and it would need that block's own tests re-run before anyone believes
it.

**5. "How far is the guaranteed set from its own anchor" should be a standing number.** (Mine.) It is
the quantity that separates a guarantee that promises from one that delivers, it is 78.3 world px on
average and 521 at worst, and no instrument in this project reports it. `_framingProbe` already
carries the anchor and the pair; this is a subtraction. **Cost:** none to the picture — the probe is
read by nothing in the camera.

**6. river-run and mountainstreet are the eye-test pair, and seed 49 is the first race to watch.**
(Mine.) They take the most widening (8.7% and 8.6% of frames), across-track binds on 97.4% and 95.2%
of their frames, and seed 49 is the case where both edges of the road lose a top-five finisher in one
race. **Cost: none; it is a viewing order.**

**7. The one number that would settle the membership question is not in this report.** (Mine.) Every
figure above is geometric — how wide, how often, who is in frame. Nobody has measured **how often the
set the camera is guaranteeing is the set the viewer is actually watching.** That is what his eye is
computing when he says a finish felt wrong, and it is the one thing a sweep cannot produce.
