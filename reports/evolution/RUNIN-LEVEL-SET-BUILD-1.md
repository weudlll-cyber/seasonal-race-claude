# RUNIN-LEVEL-SET-BUILD-1 — the owner's rule, built with the repair that makes it work

**Date:** 2026-08-25 · **Branch:** `feat/runin-level-set-1` (off `master` at `b80377ba`) ·
**BUILT, NOT MERGED. His eye decides.**

**THE RULE, his words on 2026-08-24:** any racer at most ONE RACER LENGTH behind the leader ALONG
THE TRACK must be in frame, however far to the side he is running.

**IT IS BUILT, AND ON THE BUILT CODE IT HOLDS ALL TWELVE OF HIS RACES: 568 winner-off frames → 0.**
Every top-five finisher in those races too, and the finish line is unchanged.

**ONE COST IS NEW, IT WAS NOT IN THE MEASUREMENT, AND IT IS THE THING TO WATCH FOR.** The width can
move a long way in a SINGLE FRAME when a racer arrives at the boundary — up to 0.67 ln on river-run
against master's 0.061, and **26 of 1,260 races carry a step over 0.4 ln** (a shot that changes size
by half again in one frame). That is the shape of the hopping three earlier blocks removed. It is
measured, reported, and **deliberately not repaired here** — §8.

| | |
| --- | --- |
| his twelve races | **12 of 12 held** |
| river-run seed 49 | **0 winner-off frames**, both edges held |
| finish line | **85.7% of frames — identical to master** |
| forward view | room ahead never shrinks, frame by frame |
| world / world-off fingerprints | **UNMOVED**, as required |
| camera / render fingerprints | **MOVED, expected** — §6, not re-minted |
| tests | 881 camera tests green, 17 of them new, every one with its sabotage |

---

## 1. THE PIN-OR-LIVE DECISION — **LIVE**, and why

**WHAT TODAY'S PIN IS FOR, established at source.** `_photoFinishContenders` is captured once at the
PHOTO_FINISH transition and never re-sorted (`CameraDirector.js:1622`, *"CAPTURED ONCE, NEVER
RE-SORTED — that is what FINISH-PAIR-1 bought"*). The reason is legible in what that set is used
for: it is the **framing set**, and the PHOTO_FINISH anchor is the **pair midpoint**. Re-sorting the
set moves the anchor, and moving the anchor is **steering** — the thing Lesson 192 forbids a
guarantee from doing. The pin protects the SUBJECT from changing mid-shot.

**THE NEW SET IS LIVE, and the pin's reason does not reach it.** This set never touches the anchor:
`_levelCeiling` returns a width and nothing else, and the anchor is chosen exactly where it was
before. So the hazard the pin exists to prevent cannot occur here.

**And a pinned set would fail the rule by construction.** A racer who closes to within one length
AFTER the pin could never be admitted — and a racer arriving late alongside the leader is precisely
the case the owner is describing. A pin would deliver a rule that is right in principle and silent in
the only situation it was written for.

**THE CHURN RISK IS REAL AND IT IS ABSORBED, not ignored.** A racer hovering at exactly one body
length joins and leaves the set repeatedly. The mechanism:

- **Admitting is instant.** He must not be cut while the camera thinks about it.
- **Releasing is eased**, over `runInOpenMs` — the owner's own 1–1.5 s, which already paces the
  opening glide and already times `_contentionWeight`'s release of a racer who has left contention.
  **No new constant.** The ease is the same `3u² − 2u³` the schedule uses, in log space.
- The release targets **the shot that would otherwise be**, so the term arrives at exactly
  non-binding and hands back without a step.

**PROVED BY TEST, and the proof caught a bug.** The churn test drives a racer across the boundary
every six frames. My first cut returned `Infinity` the moment the set fell below two — which threw
away the release state, so the guarantee snapped off and on and **the ease never ran at all**: the
worst single-frame move was as large as with no ease whatsoever. The test failed, the cause was that
short-circuit, and the fix is in `_levelCeiling`'s comment. With the ease running, the largest
single-frame move and the total width travel both fall by more than a third against raw membership.

---

## 2. WHAT WAS BUILT

**(a) THE REPAIR — `pairGuarantee` gets the anchor.**
`presenceCeilingFrom` in `framingRule.js` measures ONE subject against the room the frame actually
has from where the anchor sits. `pairGuarantee` and `contenderGuarantee` take `anchorWorld` /
`anchorAt`; **`null` is today's behaviour exactly**, so every existing caller runs the unchanged
pairwise span code and nothing outside the run-in moves — asserted by a test.

**HOW I ESTABLISHED THE TWO ARE THE SAME SHAPE, rather than asserting it.** `halfCorridorCeiling` —
the arm `corridorGuarantee` received under CAMERA-ANCHOR-TRUTH-1 — does four things, and
`presenceCeilingFrom` does the same four in the same order:

| | `halfCorridorCeiling` | `presenceCeilingFrom` |
| --- | --- | --- |
| the direction it measures along | the corridor perpendicular | anchor → this subject |
| the extent that must fit | half a track width | the subject's own displacement |
| the room it divides by | `roomFromPointAlong(at, dir)` | `roomFromPointAlong(at, dir)` — the same helper |
| a side with zero room | **skipped**, not returned as a ceiling of 0 | **skipped**, identically |

Only the vector differs — which is precisely how `zoomCeilingToFit` already relates the corridor and
the pair today. The padding is added along the displacement in world px, the same construction
`pairGuarantee` uses on the separation.

**(b) THE MEMBERSHIP — `_levelContenders`.** `_abreastContenders` condition 1 alone. Its condition 2
is the **free-lane** test, which is an across-track condition the owner has explicitly excluded, and
it stays where it is and keeps deciding the PHOTO_FINISH framing set.

**THE UNIT IS DEFINED ONCE.** `CameraDirector.contactLengthBetween(a, b)` is the expression the two
shipped call sites already carried, written out at `:2611` and `:2719`; this block added a third that
had to agree with both, so it is now stated once and read three times. **No second definition, no
key, no threshold of mine.**

**(c) THE COMPOSITION — widen-only, applied last.** `_levelCeiling` returns a cam.zoom **ceiling**,
composed with `Math.min`. It can widen and has no way to tighten. Scoped to the run-in: `Infinity`
whenever the run-in is not composing, so every earlier frame is untouched.

**WHERE IT SITS IN `_setTargets`, and why that is deliberate.** After the ratchet, and **below
`_runInBinding`**:

- **After the ratchet** because the ratchet is requirement 3 — once the close begins the shot never
  re-opens — and it is computed from and stored as the SCHEDULE's own width. Composing after it
  leaves that curve intact, so when the guarantee releases the shot returns to the schedule rather
  than to something the guarantee moved. What it does mean is that **a racer who would be cut can
  re-open the delivered picture, and requirement 3 yields to him.** That precedence is not new and
  not mine: `_corridorWidthCap` already states it in the same file — **THE CONTENDERS WIN IF THEY
  CONFLICT**, *"his first rule is that ALL participants must be visible."*
- **Below `_runInBinding`** because that flag means "the schedule is what the width authorities
  settled on" and `update()` reads it to choose an anchor. Composing above it flipped it false on
  every widening frame and moved the anchor — a side effect nobody asked for, caught by an existing
  test going red.

**AND WHERE NOBODY IS LEVEL, THE RULE CONSTRAINS NOTHING.** With fewer than two members the term is
`Infinity` and today's shot stands. That is the owner's rule working, and it settles the gap two
previous blocks flagged. **A test asserted it and the first build failed it**: the leader sits ON the
anchor, so his own body padding still constrained, and the term was quietly widening races with
nobody in contention at all.

---

## 3. HIS TWELVE, ON THE BUILT CODE

Not the counterfactual — the shot the director actually composes, measured with LATE-LEAD-HUNT-1's
own visibility test on the delivered `zoom` and `offset`.

| race | frames | **winner OFF: master → BUILT** | top-5 off | line in frame | the rule binds | mean set |
| --- | --- | --- | --- | --- | --- | --- |
| **river-run 20, seed 49** | 364 | **99 → 0** | **0** | 85.2% | 82.1% | 3.94 |
| river-run 20, seed 23 | 336 | **92 → 0** | **0** | 85.4% | 78.9% | 3.62 |
| river-run 40, seed 30 | 338 | **81 → 0** | **0** | 85.5% | 95.9% | 4.00 |
| river-run 20, seed 32 | 415 | **77 → 0** | **0** | 86.5% | 69.4% | 3.00 |
| mountainstreet 20, seed 13 | 344 | **59 → 0** | **0** | 84.3% | 77.3% | 4.00 |
| river-run 40, seed 23 | 417 | **37 → 0** | **0** | 86.8% | 56.4% | 3.66 |
| **luger-hill 40, seed 11** | 462 | **35 → 0** | **0** | 82.3% | 50.0% | 2.00 |
| river-run 20, seed 55 | 444 | **30 → 0** | **0** | 85.4% | 61.9% | 3.89 |
| mountainstreet 20, seed 34 | 333 | **26 → 0** | **0** | 85.3% | 52.0% | 5.00 |
| seatrack 20, seed 5 | 334 | **26 → 0** | **0** | 82.9% | 66.5% | 4.90 |
| luger-hill 20, seed 51 | 421 | **5 → 0** | **0** | 86.7% | 55.8% | 3.78 |
| seatrack 20, seed 11 | 331 | **1 → 0** | **0** | 82.8% | 64.0% | 4.08 |
| **TOTAL** | | **568 → 0 · 12 races → 0** | | | | |

**luger-hill 40 seed 11 is the one the span reading could never fix** — RUNIN-LEVEL-SET-1 measured it
at 35 off-frames under span and 0 under presence. The built code delivers 0. **That race is the
repair's whole justification, and it is now a passing case rather than an argument.**

---

## 4. THE HARNESS RE-RUN, AND WHERE THE BUILD DIFFERS FROM THE MEASUREMENT

Same 1,260 races, 521,320 run-in frames, same seeds.

| | RUNIN-LEVEL-SET-1 predicted | **the built code delivers** |
| --- | --- | --- |
| his twelve | 12 of 12 | **12 of 12** ✓ |
| seed 49 | 0 off-frames | **0** ✓ |
| finish line in frame | 85.7% → 85.8% | **85.7% — identical to master** ✓ |
| races with the winner off frame | 126 → 33 | **126 → 91** ✗ |
| races with any top-5 off | 663 → 548 | 663 → **561** ≈ |
| the rule binds | 9.4% of frames | **15.3%** |
| mean set size | 2.42 | 2.42 ✓ |

**THE HEADLINE REPRODUCES; ONE FIGURE DOES NOT, AND IT IS A FINDING RATHER THAN A ROUNDING.** The
measurement said 33 races would still have the winner off frame; the build gives 91. **Two causes,
both identified:**

1. **THE MEASUREMENT USED HINDSIGHT AND THE BUILD CANNOT.** Its set was the level set **∪ {the
   winner}** — the requirement's "or who wins" clause applied with the finishing order already known.
   RUNIN-LEVEL-SET-1 reported the winner is in the level set on 96.7% of frames; on the other 3.3% he
   is more than a length back and the build has no way to know he will win. **That is not a defect in
   the build — it is the price of the rule being buildable**, and the report that measured it said so
   in its own limits section.
2. **THE COUNTERFACTUAL HAD NO SMOOTHER.** It froze the anchor's screen position and changed only the
   zoom. The real camera re-derives the pan every frame and smooths it, so during a large width move
   the delivered frame is neither the old one nor the new one.

**The rule binds on 15.3% of frames against a predicted 9.4% for the same reason the churn test
exists**: the measurement asked the question instantaneously, and the build holds the guarantee
through its eased release. A term that is on more often but moves less is the trade the ease buys.

---

## 5. WHAT IT COSTS — measured against master on matched seeds

Master here is an **archived tree** (`git archive`, no worktree registration) with the same harness
copied into it, which is the method LATE-LEAD-HUNT-1 used for its then-versus-now test.

| track (60 seeds, 20 racers) | winner-off races | top-5-off races | line in frame | re-open frames | mean re-open | **worst single-frame step** | total width travel per race |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **river-run** | **5 → 1** | **41 → 21** | 84.6% → **85.0%** | 15.4% → 19.9% | 0.0135 → **0.0090** | **0.061 → 0.670 ln** | 2.19 → **1.70** |
| **mountainstreet** | **2 → 1** | **35 → 13** | 83.9% → **84.2%** | 16.9% → 19.2% | 0.0155 → **0.0105** | **0.078 → 0.859 ln** | 2.53 → **1.76** |
| dirt-oval | 0 → 0 | 16 → 16 | 87.9% → 87.9% | 12.6% → 14.9% | 0.0232 → **0.0194** | 0.322 → 0.322 | 3.54 → **3.27** |

**THE GOOD NEWS IS IN THE LAST COLUMN.** The shot's **total** travel across a race goes DOWN on all
three tracks, and the average re-open gets SMALLER. A shot that holds a width instead of closing to
one it must then abandon moves less overall, which is the opposite of what "it re-opens more often"
suggests on its own.

**DIRT-OVAL — the track he will watch — IS UNCHANGED**: same winner-off races, same top-5-off races,
same finish line to a tenth of a point. An earlier draft of this section reported it regressing badly;
that was **my comparison error**, matching 60 master races against 240 built ones because dirt-oval
carries four times the seeds. Recorded because the number was wrong before it was right.

---

## 6. FINGERPRINTS — every value against the record

**Let `verify`'s routing decide** was the instruction, and it did: 13 guards selected, 11 skipped.

| role | recorded | now | verdict |
| --- | --- | --- | --- |
| **world** | `dc4647be0f55ebdb` | **`dc4647be0f55ebdb`** | **UNMOVED — required, and it holds** |
| **world-off** | `854018ee5d3d83e1` | **`854018ee5d3d83e1`** | **UNMOVED — required, and it holds** |
| camera | `0434cd0385eacc7b` | **`738fd0a6a928ab7a`** | **MOVED — EXPECTED** |
| render | `57b2eb101d806b22` | **`6a086a0e7747f387`** | **MOVED — expected** |

**THE CAMERA VALUE MOVED BECAUSE THIS BLOCK CHANGES THE DIRECTOR'S DECISIONS**, which is exactly what
that instrument hashes: a new width authority composes into `_setTargets` during the run-in, so the
delivered zoom differs on the frames it fires. **The render value follows it** — the draw call
sequence is drawn through the camera's transform, so a changed width changes the frame. Neither is a
surprise and neither is a fault.

**NOT RE-MINTED, and that is the ceremony rather than an omission.** `CLAUDE.md`: *never mint a
fingerprint on your own authority; a visible change needs the owner's eye first.* This change is
visible by construction — it is a change to the picture — so the record stays as it is until he has
seen it. **`docs/fingerprints.json` is untouched by this branch.**

**Routing skipped world and world-off**, and I ran both anyway rather than resting on that: the two
values above are measurements, not a closure argument. Nothing here touches the race — the diff is
two camera files and a test — and the measurement agrees.

| guard | result |
| --- | --- |
| `client-suite` (194.7s, ran alone) · `camera-fingerprint` · `render-fingerprint` · `check-runin-frame` · `script-suite` · `fingerprint-containment` · `check-config-keys` · `check-fallback-agreement` · `ceremony-counts` · `check-language-closed` · `check-measured-stamps` · `check-writable` · `check-hooks-installed` | **PASS 13 · FAIL 0 · SKIP 11** |

---

## 7. THE TESTS, AND THEIR SABOTAGES

17 new tests in `client/src/modules/camera/levelSet.test.js`. **881 camera tests pass in total.** Each
sabotage is in the test body next to the assertion it justifies.

| the test | its sabotage, and what the sabotage proves |
| --- | --- |
| a member far to the side is held | the same race with `_levelCeiling` stubbed to `Infinity` — **cut on some frames without the rule, zero with it** |
| two members on opposite sides both held (seed 49 in miniature) | same stub — **cut without, zero with** |
| a racer more than one length behind is NOT admitted | `contactLengthBetween` stubbed four times larger — **he is admitted, and the assertion inverts** |
| the anchored guarantee holds a pair the span lets slip | the span ceiling is computed beside it: **at the span-derived zoom a member is off frame, at the presence-derived zoom both are in** |
| one subject constrains under presence, not under span | the span arm returns `Infinity` for a lone racer — the blindness, directly |
| the ceiling never tightens | delivered ≤ pre-level on every composing frame, **plus an assertion that it does bind somewhere**, or the first is vacuous |
| every frame before the run-in is unchanged | compared frame by frame against the stubbed run, **plus an assertion that they DO diverge later**, or a build that does nothing would pass |
| passing no anchor is today's behaviour exactly | equality against the un-anchored call |
| the forward view is untouched | room ahead asserted ≥ the stubbed run's, frame by frame |
| a live set does not pump the width | the same churn with the ease removed (`runInOpenMs` 0): **max single-frame move and total travel both more than 3× larger** |
| admitting is instant | a racer appearing at the boundary is on screen from that frame |
| where nobody is level, today's shot stands | zoom equality against the stubbed run, every frame |

**ONE TEST FOUND A BUG IN THE SUITE'S OWN METHOD, not in the build.** The before-the-run-in
comparison passed alone and failed in the file. The cause: **the director draws its own
`Math.random()` camera seed per construction**, so two runs of the "same" race diverge on the
director's own jitter. Every harness in this project pins that seed and the new test now does too.

---

## 8. THE ONE COST THIS BUILD ADDS, AND WHY IT IS NOT REPAIRED HERE

**THE WIDTH CAN LEAP IN A SINGLE FRAME WHEN A RACER ARRIVES AT THE BOUNDARY.** Admitting is instant
by design — a racer must not be cut while the camera thinks — so the ceiling drops to whatever holds
him on the frame he qualifies.

- worst single-frame step: **0.061 → 0.670 ln** on river-run, **0.078 → 0.859 ln** on mountainstreet
- **26 of 1,260 races (2.1%) carry a step over 0.4 ln** — a shot changing size by half again in one
  frame
- the largest in the corpus is **1.467 ln** on space-sprint 20 seed 1

**That is the shape of the hopping ZOOM-PACE-5 and ENDGAME-SCHEDULE-2 spent two blocks removing**, and
it would be dishonest to file it as a detail.

**IT IS NOT REPAIRED HERE, deliberately.** Every candidate — easing the admit, rate-limiting it,
predicting the arrival — is a **third mechanism whose visible consequence nobody has measured**, and
this project has thrown away two run-in builds for exactly that. Easing the admit also trades
directly against the rule itself: a racer eased into the frame is a racer cut for the length of the
ease. **The measurement comes first; §11 proposes it. What the owner should watch for is in the
hand-off.**

---

## 9. WHAT THE BUILD COULD NOT SETTLE

- **NOTHING HERE SAYS THE SHOT LOOKS RIGHT.** Every number is geometric. That is the whole reason
  this is handed over rather than merged.
- **THE SINGLE-FRAME LEAP IS UNJUDGED** (§8). 2.1% of races carry one; whether it reads as a snap or
  passes unnoticed is an eye question.
- **THE "OR WHO WINS" CLAUSE IS NOT BUILDABLE AND IS NOT BUILT.** §4: the winner is in the level set
  on 96.7% of frames and the build holds him on those; on the rest it cannot know.
- **ON A CLOSED TRACK THE RULE CANNOT TELL "LEVEL" FROM "EXACTLY ONE LAP BEHIND."**
  `shortestArcDeltaT` is lap-normalised, so a lapped racer at the same point on the road is admitted.
  It costs nothing today — he is at the same world position, so holding him is free — and it is
  **pre-existing**: `_abreastContenders` uses the same function. Named because a later reader will
  meet it.
- **THE PLACEMENT DRIFT IS BOUNDED, NOT ABSENT.** The leader's position in frame moves by up to
  0.037 of the frame width against master, because the forward bias is a screen displacement
  converted to world at the current zoom and the pan smoother lags a further-travelled target. **The
  requirement — room ahead in world px — is asserted strictly and holds.**
- **Against the world edge the placement moves more**, because a wider frame reaches the pan clamp
  sooner. Measured, asserted, and given its own test; the room ahead still never shrinks.
- **`garden-path` remains unmeasured** — no finishing order in 0 of 120 races, a seventh consecutive
  sweep. Every corpus figure rests on nine tracks. **This is now its own night piece.**
- Everything headless, fixed camera seed, consecutive-integer seeds, unequal track weighting.

---

## 10. SOURCE HYGIENE, AND VERIFICATION

**THREE PRODUCTION FILES**, and the diff is small: `framingRule.js` (the anchored arm and
`presenceCeilingFrom`), `CameraDirector.js` (the unit, the set, the ceiling, the composition, four
probe fields), and the new test file. **No config key was added, no default moved,
`docs/fingerprints.json` is untouched, and `_guaranteeCeiling` and the endgame schedule are
unchanged.**

**Machine and pool:** `os.cpus().length` read at launch = **14 logical cores**; pool
`min(16, cores − 2)` = **12**. 1,260 races on the built code in two phases, plus 180 on the archived
master tree.

**The probe fields are diagnostic only** — `levelCeiling`, `levelBound`, `levelSetSize`,
`levelPreWidth` — read by nothing in the camera, and `_binding` now names `level` when the term
produced the delivered width. That is RUNIN-CONTENDER-GUARANTEE-1's proposal 4 applied to the one
term this block adds, so the next diagnosis is not left to an argmin.

---

## 11. BUILD VS SPEC — conformity

| the spec asked | status |
| --- | --- |
| build BOTH halves or neither | **done** — the repair and the membership ship together |
| (a) give `pairGuarantee` the anchor as `corridorGuarantee` has it; reuse, do not write a second | **done** — same helper, same skip rule; §2's table is how it was established |
| (b) membership = `_abreastContenders` condition 1 alone | **done** |
| (b) use the tree's own `contactLength`; no second definition, no key, no threshold of yours | **done** — one definition, three readers |
| (c) widen-only ceiling on top of the terms already there | **done** — `Math.min`, asserted by test |
| before the run-in, every frame unchanged to the pixel | **done** — asserted frame by frame against a stubbed run |
| the forward view must not shrink | **done** — room ahead asserted ≥ master's, frame by frame |
| where nobody is level, today's shot stands | **done** — and the first build FAILED this; §2 |
| establish what the pin is for; decide pinned or live; say which and why | **done** — §1, LIVE |
| if live, prove by test that an oscillating racer does not oscillate the width | **done** — §1 and §7, and the test caught a real bug |
| tests, each proved able to fail by sabotage | **done** — §7, 17 tests |
| camera fingerprint expected to move; report, do not re-mint quietly | **done** — §6, values stated, record untouched |
| world and world-off must NOT move; if world moves, stop and report | **done** — both UNMOVED, measured not argued |
| render may move; say so | **done** — §6 |
| let verify's routing decide; report every value against the record | **done** — §6, 13 PASS / 11 SKIP |
| re-run the RUNIN-LEVEL-SET-1 harness against the built code; a difference is a finding | **done** — §4, headline reproduces, one figure does not, both causes named |
| read the core count and size the pool | **done** — §10, 14 → 12 |
| dev server on this branch as a production build; report the badge | **done** — §12 |
| DO NOT MERGE; push the branch | **done** — pushed, not merged |
| report, INDEX in the same commit, pin decision, tests, fingerprints, harness re-run, hygiene, conformity, proposals | **this document** |

**Two things the spec did not anticipate, flagged rather than absorbed.** The build introduces a
single-frame width leap that the measurement could not have seen (§8), and the 33-races figure does
not reproduce because it rested on hindsight the build cannot have (§4).

---

## 12. HAND-OFF — what the owner is being asked to judge

**THE DEV SERVER IS RUNNING THIS BRANCH AS A PRODUCTION BUILD.**

| | |
| --- | --- |
| where | **`http://localhost:4173`** — the preview server, on the project's standing port |
| API | `http://localhost:4000`, already up |
| **the badge** | **`6078cd6a`** · branch `feat/runin-level-set-1` · **`dirty: false`** · `reason: null` |

It is a real production bundle (`vite build`, then `vite preview`), not the dev server: the build
identity is read once at build time and ships with the bundle, which is why the badge can be trusted
here in a way a long-running dev server's cannot (BUILD-TRUTH-1). **`dirty: false` means the bundle
was built from a clean tree at exactly the commit named** — the report he is reading and the code he
is watching are the same thing.

**WHAT NO MEASUREMENT CAN ANSWER: does the wider frame look right?** Every number in this report is
geometry.

**WATCH THESE, in this order:**

1. **`river-run`, 20 racers, seed 49** — the case the whole thread came from: the winner leaves over
   the top and fourth place over the bottom. On master both are cut; here both are held for all 364
   closing frames. The rule binds on 82% of them, so this is the shot at its most active.
2. **`dirt-oval`, 20 racers** — his own reference. **It is unchanged**: same visibility, same finish
   line. If it looks different, that is a finding and this report is wrong about it.
3. **AND WATCH FOR ONE SPECIFIC THING (§8): a shot that changes size in a single frame.** It happens
   in about one race in fifty. If he sees it, the admit needs shaping before this merges; if he does
   not, §11's proposal 1 can be measured at leisure.

**NOTHING IS MERGED.** The branch is pushed. His eye decides.

---

## 13. PROPOSALS — none ordered

**1. Measure the single-frame leap before shaping it, and shape it only if he sees it.** §8 gives the
size and the rate. The candidates are an eased admit, a rate limit, and predicting the arrival one
`runInOpenMs` early from the same projection `_updateContention` already computes — **the third is
the only one that does not trade against the rule**, because it widens BEFORE the racer qualifies
rather than after. **Cost of the first two: a racer cut for the length of the ease**, which is the
fault this block exists to remove.

**2. The "or who wins" clause is worth one more measurement, not a build.** (Mine.) §4: 91 races
still show the winner off frame and the gap to the measurement's 33 is hindsight. The predictive test
in `_updateContention` — already running, already shipped — admits a racer who is *projected* to be
level at the line. **Whether that closes the 91 to something near 33 is a sweep, not a design**, and
it would answer whether the owner's rule wants the present tense or the future one.

**3. The probe should carry what every width authority asked for, not only the one that won.**
(Mine.) `_framingProbe.wouldHave` does this for the three the schedule stands down, and this block
adds `levelCeiling` beside it. **The set is now inconsistent** — some terms report their demand, some
do not — and the next diagnosis will trip on exactly the term that does not. Cheap, diagnostic-only.

**4. `check-runin-frame` should learn this rule.** It already counts frames with no racer on screen
during the run-in and it passed here. It does not yet assert the owner's rule — that a racer within
one length is in frame — which is now a shipped promise and therefore a guardable one. **Cost:** one
guard, and it would have caught the first build's two bugs before the tests did.

**5. The lap-normalised gap deserves a decision, not a note.** (Mine.) §9: on a closed track a racer
exactly one lap behind is "level". It is free today and it is pre-existing, but the rule is now
written in the owner's words and his words mean the racer beside him, not the one a lap down. **Cost
of leaving it: nothing measurable. Cost of finding out: a signed-lap comparison in one place.**

**6. river-run and mountainstreet are the standing eye-test pair for width work.** (Mine.) They take
20.1% and 16.3% of the corpus's widening between them, the fault they carry is the one the owner
reported, and dirt-oval is the control that must not move. **Cost: none; it is a viewing order.**

---

## 14. THE WIDTH STEP — THE HIT LIST (added 2026-08-25)

**§8 gave the size and the rate and named no seeds, so watching for it meant starting races at random.
This section is the seeds.** The ranking comes from the built-code sweep already on disk; **the "when"
did not, and is the one thing that needed re-running** — the sweep stored per-race aggregates only, so
it could rank the steps and could not say where in the race they fall. **Only the 26 races on the hit
list were re-run**, plus dirt-oval's own worst and two counter-cases.

### WATCH THIS ONE FIRST — `river-run`, 20 racers, **seed 13**

**What he will see:** at **97% of the way through the closing move** — the last half-second before the
line — **the shot suddenly widens.** The visible world goes from **198 to 386 px across the frame in
ONE frame**: everything on screen — racers, road, the finish gate — **drops to 51% of its size between
two frames.** There is no glide; it is a cut.

**And it does not come back.** The release is eased, but the race ends first: the shot holds the new
width through the crossing. **He should expect the finish to be watched from twice as far out as the
approach was.**

**Why it happens, measured rather than inferred:** on that exact frame the level set grows from **2
members to 3** — a third racer comes within one racer length of the leader, the guarantee admits him
instantly so he cannot be cut, and the width it needs arrives in a single step.

### THE COUNTER-CASE — `river-run`, 20 racers, **seed 49**

**The race he has already watched**, and the one to compare against. Same track, same field size, and
the rule is working just as hard — it binds on **82%** of the closing frames against seed 13's 96%.
**Its largest single-frame move is 5%** (388 → 406 px), which is below what an eye separates.

**So the difference is not "the rule is on" versus "the rule is off" — it is on in both.** Seed 49 is
what the guarantee looks like when it widens smoothly; seed 13 is what it looks like when a racer
arrives late. **If seed 49 reads as fine and seed 13 does not, the admit is the thing to shape and
nothing else is.**

### THE FULL HIT LIST — 26 races, ranked by the size of the single-frame step

`×width` is what the visible world width is multiplied by; **`shrinks to` is what everything on screen
becomes in one frame.** `u` is the run-in's own parameter — 0 when the closing window opens, 1 at the
line.

| # | track | n | seed | step (ln) | shot goes | ×width | shrinks to | at u | recovers? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | space-sprint | 20 | **1** | 1.47 | 228 → 988 px | ×4.34 | 23% | 0.000 | 4.45 s |
| 2 | seatrack | 20 | **53** | 1.35 | 172 → 661 px | ×3.84 | 26% | 0.000 | 5.10 s |
| 3 | mountainstreet | 20 | **32** | 0.86 | 157 → 370 px | ×2.36 | 42% | 0.821 | **never** |
| 4 | mountainstreet | 20 | **24** | 0.85 | 121 → 283 px | ×2.35 | 43% | 0.980 | **never** |
| 5 | luger-hill | 40 | **33** | 0.85 | 165 → 385 px | ×2.33 | 43% | 0.000 | 4.35 s |
| 6 | seatrack | 20 | **16** | 0.83 | 215 → 492 px | ×2.29 | 44% | 0.000 | 3.63 s |
| 7 | luger-hill | 40 | **47** | 0.78 | 126 → 273 px | ×2.17 | 46% | 0.942 | **never** |
| 8 | seatrack | 20 | **35** | 0.72 | 373 → 769 px | ×2.06 | 49% | 0.000 | 4.93 s |
| **9** | **river-run** | **20** | **13** | **0.67** | **198 → 386 px** | **×1.95** | **51%** | **0.972** | **never** |
| 10 | mountainstreet | 20 | **15** | 0.59 | 165 → 298 px | ×1.81 | 55% | 0.825 | **never** |
| 11 | river-run | 20 | **8** | 0.58 | 215 → 385 px | ×1.79 | 56% | 0.000 | 3.32 s |
| 12 | seatrack | 20 | **7** | 0.57 | 213 → 379 px | ×1.78 | 56% | 0.994 | **never** |
| 13 | river-run | 20 | **18** | 0.57 | 350 → 198 px | ×0.57 | **177% — it TIGHTENS** | 0.981 | **never** |
| 14 | seatrack | 40 | **13** | 0.56 | 183 → 320 px | ×1.75 | 57% | 0.000 | 3.75 s |
| 15 | city-circuit | 20 | **7** | 0.55 | 153 → 265 px | ×1.73 | 58% | 0.978 | **never** |
| 16 | ice-track | 20 | **22** | 0.54 | 207 → 121 px | ×0.58 | **171% — it TIGHTENS** | 0.979 | **never** |
| 17 | searound | 40 | **56** | 0.50 | 380 → 231 px | ×0.61 | **165% — it TIGHTENS** | 0.926 | **never** |
| 18 | river-run | 20 | **23** | 0.49 | 173 → 281 px | ×1.63 | 62% | 0.000 | **never** |
| 19 | mountainstreet | 20 | **25** | 0.47 | 156 → 249 px | ×1.60 | 63% | 0.986 | **never** |
| 20 | luger-hill | 40 | **21** | 0.47 | 168 → 268 px | ×1.59 | 63% | 0.799 | 0.70 s |
| 21 | city-circuit | 20 | **34** | 0.45 | 124 → 195 px | ×1.56 | 64% | 0.950 | **never** |
| 22 | searound | 20 | **45** | 0.44 | 150 → 233 px | ×1.56 | 64% | 0.922 | **never** |
| 23 | seatrack | 20 | **18** | 0.44 | 201 → 130 px | ×0.65 | **155% — it TIGHTENS** | 0.977 | **never** |
| 24 | searound | 20 | **54** | 0.44 | 154 → 239 px | ×1.55 | 65% | 0.836 | **never** |
| 25 | river-run | 20 | **1** | 0.42 | 262 → 397 px | ×1.52 | 66% | 0.965 | **never** |
| 26 | river-run | 20 | **58** | 0.41 | 130 → 196 px | ×1.50 | 67% | 0.898 | **never** |

### THE WORST ON EACH TRACK — because dirt-oval and river-run are the ones he watches

| track | n | seed | ×width | shot goes | at u | recovers? |
| --- | --- | --- | --- | --- | --- | --- |
| space-sprint | 20 | 1 | ×4.34 | 228 → 988 px | 0.000 | 4.45 s |
| seatrack | 20 | 53 | ×3.84 | 172 → 661 px | 0.000 | 5.10 s |
| mountainstreet | 20 | 32 | ×2.36 | 157 → 370 px | 0.821 | never |
| luger-hill | 40 | 33 | ×2.33 | 165 → 385 px | 0.000 | 4.35 s |
| **river-run** | 20 | **13** | **×1.95** | 198 → 386 px | 0.972 | never |
| city-circuit | 20 | 7 | ×1.73 | 153 → 265 px | 0.978 | never |
| ice-track | 20 | 22 | ×0.58 | 207 → 121 px | 0.979 | never |
| searound | 40 | 56 | ×0.61 | 380 → 231 px | 0.926 | never |
| **dirt-oval** | 20 | **171** | **×0.69** | 229 → 159 px | 0.957 | never |

**ON DIRT-OVAL — the track he watches most — THIS DOES NOT HAPPEN AT THE REPORTABLE SIZE.** Not one
of its 240 swept races reaches the 0.4 ln threshold. Its worst is seed 171 at **×0.69**, and it is a
TIGHTENING rather than a widening. **If he watches only dirt-oval he will not see this at all**, which
is worth knowing before he concludes it is not there.

### WHAT THE RE-RUN CORRECTS IN §8

**§8 said the width can leap "when a racer arrives at the boundary". That is right, and now it is
measured rather than inferred — but it is not the whole set.**

- **19 of the 22 widenings land on the exact frame the level set GAINS a member.** The instant-admit
  is the cause, confirmed.
- **Four of the 26 are TIGHTENINGS, not widenings** (rows 13, 16, 17, 23), and three of those four
  land on the frame the set LOSES a member. §8 described only the widening half.
- **Eight of the 26 happen at u ≈ 0**, on the first frames of the closing window rather than at a late
  arrival, and **those are the ones that recover** — a median of 4.35 s, comfortably inside the race.
- **The other 18 happen late — median u = 0.965 — and 17 of them NEVER recover before the line.**
  §8 said the release is eased over the run-in's own span; that is true of the mechanism and mostly
  false of what is seen, **because the race ends before the ease finishes.**

**So the honest one-line description of the risk is narrower and worse than §8's:** not "the width can
leap", but **"in about one race in fifty the shot cuts to a new width in the last few percent before
the line, and stays there through the finish."**

### SOURCE HYGIENE FOR THIS SECTION

**The ranking used no new races** — it is `maxStepLn` from the built-code sweep already on disk (1,260
races). **What that data could NOT answer is the whole of what he needed:** it stores per-race
aggregates and no per-frame series, so it has the SIZE of the worst step and not its PLACE, its
before-and-after width, or whether it recovers. **Those required re-running, and only the listed races
were re-run** — the 26, plus dirt-oval's own worst and two counter-cases, 29 in total, by
`scripts/diag/level-step-when.mjs`.

**One correction made in the writing of this section.** The first summary of the direction was
inverted: it read the sign of the change in cam.zoom as the sign of the change in WIDTH, and a rising
zoom is a tightening shot. It reported 4 widenings and 22 tightenings; measuring the visible world
width directly gives **22 widenings and 4 tightenings**. Recorded because the two would have sent him
looking for the opposite thing on screen.

---

## 15. THE BROWSER AGAINST THE HARNESS, FOR THE RACE HE RAN (added 2026-08-25)

**He ran `river-run`, 20 racers, seed 13 through Quick Test on the served build and saw nothing
unusual.** §14 says that race steps ×1.95 in one frame at 97% of the closing move. **The second
possibility was checked first: that the browser is not running the race the harness measured.**

### THE COMPARISON, BEFORE ANY CONCLUSION

Column A is the payload the running app actually built, dumped from `sessionStorage.activeRace` after
a real Quick Test on the isolated e2e instance. Column B is what `scripts/lib/raceDriver.mjs` feeds
the same race.

| field | **the browser (Quick Test)** | **the harness** | |
| --- | --- | --- | --- |
| track id | `river-run` | `river-run` | same |
| geometry id | `custom-dea6b35a-…f58eec` | `custom-dea6b35a-…f58eec` | same |
| racer type | `duck` | `duck` | same |
| race mode / laps | `time`, `targetLaps` null | open ⇒ `laps: 1` + requested seconds | same in effect |
| target duration | 60 s | 60 s | same |
| **realized duration** | **59.99999999999999 s** | **59.99999999999999 s** | **same to the last digit** |
| race plan enabled | `true` | `true` | same |
| race plan seed | **13** | **13** | same |
| race action stage | `quiet` | not passed ⇒ engine default, `quiet` | same in effect |
| field size | 20 | 20 | same |
| **name list** | Turbo, Blaze, Rocket, Flash, Speedy, Thunder, Nitro, Drift … | **identical** | **same** |
| **CAMERA SEED** | **`cameraSeedForRace(13)` = 2246822502** | **1439767152** | **DIFFERENT** |

**THE RACE IS THE SAME RACE.** Every field that feeds the physics agrees, including the name list —
which matters because a racer's NAME is an engine input — and the realized duration agrees to the
last decimal place.

**ONE FIELD DIFFERS, AND IT IS THE CAMERA'S SEED.** Since the owner's decision of 2026-08-23 the
browser derives it from the race seed (`RaceScreen/index.jsx:610`, `cameraSeedForRace(racePlanSeed)`).
**`resolveIdentity` in the shared harness driver still defaults to the pre-decision constant
1439767152** — a value the product cannot produce for any race. **So by the owner's own rule, the
difference is the finding and the step is unproven.**

### WHAT THAT DIFFERENCE ACTUALLY DOES — measured, not assumed

The 29 races were re-run with the camera seed derived the way the browser derives it.

| | over 0.4 ln under the harness seed | still over under the **browser** seed |
| --- | --- | --- |
| **steps at u ≈ 0** (tied to when the run-in ENGAGES) | 8 | **3** |
| **steps late in the closing stretch** (a racer arrives at the boundary) | 18 | **17** |
| total | 26 | **20** |

**Six of the twenty-six evaporate**, and five of those six are the u ≈ 0 kind:

| race | u | harness | browser |
| --- | --- | --- | --- |
| space-sprint 20 seed 1 — **§14's number one** | 0.000 | 1.47 | **0.04** |
| luger-hill 40 seed 33 | 0.000 | 0.85 | **0.03** |
| seatrack 20 seed 16 | 0.000 | 0.83 | **0.08** |
| seatrack 20 seed 35 | 0.000 | 0.72 | **0.09** |
| searound 40 seed 56 | 0.926 | 0.50 | **0.04** |
| river-run 20 seed 23 | 0.000 | 0.49 | **0.04** |

**That split has a mechanism and it is not a coincidence.** A step at u ≈ 0 is the run-in engaging,
and WHEN it engages depends on the width the camera happens to be at — which is a camera-seed
property. A late step is a racer crossing the one-racer-length boundary, which is a property of the
RACE, and the race is identical. **So the early steps are camera-seed artefacts and the late ones are
not.**

**§14's headline number is one of the casualties.** Its rank 1 — space-sprint 20 seed 1 at ×4.34 —
is **×0.96 under the seeding the product uses**, i.e. nothing at all. §14's table and its
worst-per-track table must be read with this section beside them.

### AND YET, FOR THE RACE HE RAN, IT CHANGES NOTHING

| river-run 20 seed 13 | step | ×width | at u |
| --- | --- | --- | --- |
| harness camera seed 1439767152 | 0.670 ln | ×1.95 | 0.972 |
| **browser camera seed 2246822502** | **0.670 ln** | **×1.95** | **0.972** |

**Identical.** The one field that differs does not differ for this race's outcome, so the
camera-seed finding — real, and larger than this step — **does not explain what he saw.**

### SO NEITHER OF THE TWO POSSIBILITIES IS ESTABLISHED, AND THE PLEASANT ONE IS NOT ASSUMED

- **"The browser is not running the race the harness measured" — NOT established for seed 13.** Every
  race field matches, and the step reproduces exactly under the browser's own camera seeding.
- **"The step happens but is too brief to notice" — NOT established either, and the data points the
  other way.** It does not recover: `recoverFrames` is null, meaning the shot holds the new width
  from u 0.972 **through the crossing**. It is not a flicker; it is the last stretch of the race
  watched from twice as far out.

**What remains is unexplained, and it is on the browser side.** Three candidates, none of them
resolvable from here, listed so he can eliminate them rather than so one can be chosen:

1. **WHICH BUILD WAS ON 4173 WHEN HE RAN IT.** Port 4173 has served three different bundles today:
   `d73ec6a9` (the garden-path branch, which does **not** contain the level-set guarantee at all),
   then `074c12ef`, then `c0cef7b8` (both of which do). **A run against `d73ec6a9` would show no step
   because the feature is not in it.** The badge is on the HUD and settles it in one glance.
2. **WHETHER THE SEED FIELD ACTUALLY CARRIED 13.** `quickTestSeed.js` is explicit: *"Empty field =
   draw a fresh random seed per race."* **Quick Test does not take a seed from anywhere else** — the
   number has to be typed into the race-seed field before pressing it. **§14 named seeds and never
   said this**, which is an omission in that section rather than a fact about the build.
3. **FRAME TIMING, which no harness reproduces.** The harness runs a fixed 60 Hz clock; the browser
   runs `requestAnimationFrame` with a physics accumulator capped at two catch-up steps per frame, so
   the camera samples the race at different instants under load. `cameraSeed.js` records the measured
   size of this class of divergence: *"two runs of race seed 9 differing only in the camera seed
   diverged at physics step 967 with 165 steps running a DIFFERENT STATE."* **Same seed is not the
   same frame sequence.**

### THE FINDING THAT OUTLIVES THIS STEP

**Every camera measurement this project has taken through the shared harness since 2026-08-23 has run
a camera seed the product cannot produce.** The owner's decision that day tied the camera's seed to
the race's; `resolveIdentity` was never updated and still defaults to the constant that decision
replaced. **Here that changed 6 of 26 results and removed the largest one.**

It does not invalidate everything: measurements that compare two arms under the *same* fixed seed
remain internally valid, and the fingerprints deliberately pin a constant because they exist to be
compared with themselves. **What it invalidates is any harness claim about what a particular race
LOOKS LIKE to the owner**, because that race's camera in his browser is seeded from its race seed and
the harness's is not. §14 was exactly such a claim.

**Nothing is changed and nothing is proposed here.** The harness default is left as it is.
