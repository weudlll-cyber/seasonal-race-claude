# LEADER-LATERAL-BUILD-1 — the leader joins the subjects, and the camera steps aside

**Built, measured, NOT merged.** Branch `feat/leader-lateral-minimal-1`, off master. Before and after
are ten races on each of the ten tracks at shipped settings, browser Quick-Test path, camera seed
derived from the race seed — **140,740 `LEADER_ZOOM` mid-race frames per arm**, one instrument, two
arms, identical filters.

---

## THE TWO NUMBERS THAT DECIDE IT

### 1. The clip rate — 4.18% → 1.29% pooled, 69.1% of clipped frames removed

| track | frames | BEFORE | AFTER | change |
|---|---|---|---|---|
| **space-sprint** | 17,503 | **15.4%** | **3.3%** | **−12.16 pp** |
| seatrack | 13,311 | 6.5% | 2.2% | −4.27 pp |
| river-run | 16,335 | 4.6% | 0.3% | −4.31 pp |
| mountainstreet | 18,402 | 4.4% | 0.8% | −3.61 pp |
| city-circuit | 13,254 | 1.4% | 1.4% | — |
| dirt-oval | 16,210 | 1.1% | 1.1% | — |
| ice-track | 11,504 | 1.1% | 1.1% | — |
| searound | 10,659 | 1.1% | 1.1% | — |
| garden-path | 11,186 | 0.7% | 0.7% | — |
| luger-hill | 12,376 | 0.6% | 0.6% | −0.02 pp |
| **POOLED** | **140,740** | **4.18%** | **1.29%** | **5,886 → 1,820 frames** |

The four tracks that carried the defect are the four that improve. The six calm tracks are unchanged
**because their clipping was never sideways** — it is the along-track residual, which this piece does
not touch by design.

### 2. The picture's largest single-frame movement — unchanged. No clip was traded for a jolt.

| track | median B/A | p99 B/A | worst B/A | races ≥120 px B/A |
|---|---|---|---|---|
| city-circuit | 9.45 / 9.45 | 149.9 / 149.9 | 776.4 / 776.4 | 10 / 10 |
| dirt-oval | 9.17 / 9.17 | 170.1 / 170.1 | 780.9 / 780.9 | 9 / 9 |
| garden-path | 7.97 / 7.97 | 161.4 / 161.4 | 685.9 / 685.9 | 9 / 9 |
| ice-track | 10.12 / 10.12 | 127.7 / 127.7 | 218.2 / 218.2 | 9 / 9 |
| luger-hill | 8.80 / 8.81 | 113.0 / 113.0 | 192.8 / 192.3 | 7 / 7 |
| mountainstreet | 8.07 / 8.08 | 188.9 / 188.9 | 832.5 / 832.5 | 10 / 10 |
| river-run | 6.96 / 6.97 | 156.1 / 156.1 | 229.7 / 230.2 | 10 / 10 |
| searound | 10.11 / 10.11 | 163.4 / 163.4 | 712.0 / 712.0 | 9 / 9 |
| seatrack | 9.39 / 9.41 | 205.3 / 205.1 | 1280.0 / 1280.0 | 10 / 10 |
| space-sprint | 10.07 / **10.15** | 180.9 / 180.9 | 487.4 / 487.4 | 10 / 10 |

**93 of 100 races carry a ≥120 px single-frame movement in BOTH arms** — that is pre-existing pan
motion, not something this piece added. At 200 px it is 54 / 54; at 500 px, 13 / 13. **At 300 px it is
22 → 23: one race in a hundred gains a single-frame movement above that threshold.** That is the whole
measured cost.

The largest median change anywhere is space-sprint's **10.07 → 10.15 px** — eight hundredths of a
pixel per frame.

**AND THAT ANSWERS THE EASING QUESTION, WHICH TURNED OUT NOT TO NEED ANSWERING.** The brief expected
the easing to be the new work, on the strength of LEADER-LATERAL-MINIMAL-1's measured 130.6 world px
raw step. That measurement was of the offset the rule would HOLD — the pan **target**. The target is
not the picture: it is chased by the existing first-order pan smoother, which is what turns a step in
the target into a travel on screen. So no easing was added, and **adding one would have been the
second smoother on one quantity that this project has twice had to undo**. The table above is the
evidence that none is needed.

---

## WHAT WAS ACTUALLY BUILT, AND WHY (a) ALONE WAS NOT ENOUGH

The brief's (a) said: add the leader to the subject list, let the existing machinery do the rest, and
if that is not enough, say exactly what else was needed **before** adding anything. It was not enough.
Here is the measurement, taken before a line of the fix was written.

I replicated `_applyLateralGuarantee`'s computation in a probe and validated it against the director's
own `_lastLateralShift`: **it matched on 2,019 of 2,019 frames.** Then I added the leader — body
included — to the offsets list. **The answer changed on 0 of 2,019 frames.** Two independent reasons,
either fatal on its own:

1. **The corridor edges are always in that list**, and `lateralShiftToFit` intersects intervals, so
   only the EXTREMES decide. The leader lies inside the corridor on **0 of 2,019** frames outside it —
   his interval is a superset of theirs, so he can never narrow it.
2. **The corridor does not fit the frame** — on **100%** of `LEADER_ZOOM` frames, because the shot is
   deliberately narrower than the road (it holds 0.78 of the corridor on space-sprint, 0.55 on
   river-run). The helper is therefore permanently in its "split the difference" branch, which
   averages `lo` and `hi` and is again decided by the extremes alone.

So the leader gets **his own interval** — `lateralAdmissibleForBody`, solved on his four drawn body
corners against the real frame — and the corridor's answer is **clamped into it**. When `d` already
keeps him whole the clamp is inert and the picture is untouched; when it does not, the camera moves the
least that fixes it. That ordering is the owner's rule exactly, and it needed one new function, not a
new mechanism: `lateralShiftToFit` is untouched and still runs first.

### The margin, and the mistake that produced it

The first working version reduced space-sprint seed 6 from 616 clipped frames to **only 608**. The
diagnosis: on **383 of the 394** frames that still clipped, the rule computed that he *fits* —
correctly, at the pan **target**. The delivered picture trails that target by the pan smoother's
residual (a median 61 px on clipped frames, LEADER-LAG-TRUTH-1), so a guarantee written exactly at the
frame edge is broken before it is drawn.

`leaderLateralMarginPx` is that budget. It is the same job `innerFramePct` already does for every other
subject in this design, sized for this one from the measured trailing. Read off the sweep:

| margin | space-sprint:6 | river-run:9 | seatrack:3 | city-circuit:4 |
|---|---|---|---|---|
| 0 | 608 | 38 | 83 | 15 |
| 30 | 413 | 2 | 22 | 15 |
| 60 | 159 | 0 | 18 | 15 |
| **90 (shipped)** | **71** | **0** | **18** | **15** |
| 120 | 68 | 0 | 17 | 15 |

**90 is the knee** — from 616 to 71 on the worst race in the corpus, and 120 buys three more frames.
city-circuit does not move at any value, which is the along-track residual behaving as it should.

### The bound — measured to cost nothing, and load-bearing anyway

| bound | space-sprint:6 | river-run:9 | seatrack:3 | mountainstreet:2 |
|---|---|---|---|---|
| 40 | 185 | 0 | 18 | 16 |
| **70 (shipped)** | **71** | **0** | **18** | **16** |
| 110 | 71 | 0 | 18 | 16 |
| 200 | 71 | 0 | 18 | 16 |
| unbounded | 71 | 0 | 18 | 16 |

**70 world px is identical to unbounded on all four tracks — it costs nothing — while 40 costs 114
frames.** It sits at the knee, and it is close to LEADER-LATERAL-MINIMAL-1's measured p95 need of 68.6.

It is not decoration. `lateralShiftToFit`'s own note records that a screen-rectangle test was this
mechanism's **first defect**: a diagonal perpendicular has a component on both screen axes, so a
rectangle test will happily rescue a subject lost ALONG the track by sliding a very long way sideways,
and it once drove the camera **500 world px** off the centreline doing exactly that. My helper's empty
interval catches the case where he cannot be fitted at all, but **not** the case where he can be at an
absurd price. The bound is what catches that. Past it **he stays partly clipped, deliberately** —
partial clipping is the lesser evil against a camera that swings.

### (c) The release margin — decided by number, and NOT shipped

I built the hysteresis first: engage the moment he does not fit, release only once he fits with room to
spare, latched — the shape `_contentionEased` and the run-in's membership threshold both use. Then I
measured whether it was needed, and **it was not**, so it was removed rather than kept as insurance.

The reason is that `lateralShiftToFit` is **continuous at the engage boundary** by construction: as the
geometry moves so that `lo` crosses zero, the returned shift grows from zero rather than stepping to
it. There is no boundary to chatter across. The 130.6 px raw step that motivated the proposal comes
from the discontinuous cases — a lead change, a feasible↔infeasible flip — which a release margin does
not address. Shipping one would have been a second latch guarding a boundary that is already smooth,
and a third number to explain. **The always-applied margin does the job the release margin was proposed
for, and it does it for a reason that can be stated.**

---

## 3. HOLDS THE CENTRE — 90.27% pooled

| track | after | | track | after |
|---|---|---|---|---|
| city-circuit | 100.0% | | mountainstreet | 84.6% |
| dirt-oval | 100.0% | | river-run | 88.3% |
| searound | 99.3% | | luger-hill | 90.4% |
| ice-track | 99.4% | | seatrack | 81.1% |
| garden-path | 99.2% | | **space-sprint** | **71.4%** |

The measurement predicted 95.82%; the built rule holds the centre on **90.27%**. It leaves the centre
more often than predicted, and the reason is the margin: the rule now steps aside slightly earlier
than a bare fitting test would, to budget for the trailing. That is a difference in the **right**
direction — it buys the clip rate above — but it is a real cost against the owner's rule and it is
stated rather than buried.

## 4. THE ALONG-TRACK RESIDUAL — unchanged, exactly as required

**830 → 830 frames**, and unchanged on every individual track (city-circuit 115, dirt-oval 136,
garden-path 44, ice-track 63, luger-hill 22, mountainstreet 56, river-run 0, searound 78, seatrack 109,
space-sprint 207). The rule declines these frames rather than inventing a shift for them, which is the
helper's empty-interval branch doing its job.

## FINGERPRINTS — measured, NOT minted

I have no standing permission to write the record and did not write it. `docs/fingerprints.json` is
untouched on this branch (`git diff` on it is empty).

| role | record | engine on this branch | |
|---|---|---|---|
| **camera** | `4aef03dc22ab08b3` | **`6dfded25dd656977`** | moved — expected |
| **render** | `ee4f4b016051a1e6` | **`4819e3b0f8e61c23`** | moved — expected; the render fp covers what reaches the canvas, and the camera decides that |
| world | `bc01b74fd4f3cfc8` | unchanged | **did not move** |
| world-off | `daf78ff18eca83c6` | unchanged | **did not move** |

All four roles were checked in one run (`check-fingerprints --mint` reports every role, it does not
stop at the first). World and world-off are absent from the failure list, which is the proof required.

## TESTS

`client/src/modules/camera/leaderLateral.test.js` — **12 tests, all green**; the camera directory is
**897 passed (25 files)**.

**Every test carries a sabotage arm**, because the defect this piece repairs was a rule that was
*present and inert* — a test asserting only the shipped path would have passed on the inert version
too. The arms turn off the body size, the margin, the bound, or the anchor racer, and assert the
answer changes.

Four of them are the director itself rather than a replica of its arithmetic, including the one the
brief named: **a leader who fits from the centreline is untouched — the rule contributes exactly
zero.** That test found a real fault in its own fixture: the first version used a sprite so large that
at the fixture's zoom no sideways move could fit it, so the rule correctly declined — which is
indistinguishable from the rule being inert. **The sabotage arm caught it.** The fixture now states its
own scale and why it matters.

## ONE TEST FIXED THAT IS NOT MINE, AND WHY IT HAD TO BE

`scripts/engine-reach.test.mjs` — *"the negative message separates NOT-IN-THE-HULL from
IN-THE-HULL-BUT-UNCHANGED"* — went red on this branch without engine-reach being touched. The cause is
a fragile fixture, not this change: `--check` with no base reads the **working tree** against the
branch point, so `client/src/modules/storage/defaults.js` counts as CHANGED on **any** branch that
legitimately edits a default. The tool then correctly answers exit 0 (a real positive) and the test,
which wants the IN-THE-HULL-BUT-**UNCHANGED** case, reads that as a regression.

Pinning the comparison with `--base=HEAD` produces the intended scenario deterministically — the path
is in the hull and byte-identical against HEAD whatever the branch is doing. Both assertions then hold
for the reason they were written. **This would have gone red for the next block to ship a default
too**, which is why it is repaired here rather than noted and left.

## SOURCE HYGIENE — including what I noticed and left

- `lateralShiftToFit` is **unchanged**. The new helper sits beside it in `framingRule.js` so lateral
  geometry keeps one home, and its note points at the other's recorded defect.
- The rule is scoped at the **call site**, by state, not by anchor kind — OVERVIEW shares the `leader`
  anchor and is explicitly not in this piece. Keying off the anchor would have widened it silently.
- Two keys added, both in the `LEADER_ZOOM` profile, both resolved through `resolveFramingConfig` so a
  stored config written before they existed still reaches the director with shipped values. No schema,
  no version bump, no migration, per the standing rule. Out-of-band values fall back to the default
  rather than to 0 — a 0 bound would silently disable the thing that stops the along-track chase.
- **LEFT, NOT FIXED, AND WORTH A LATER LOOK: the corridor's own room is measured from the wrong point.**
  `_applyLateralGuarantee` computes `roomPlus`/`roomMinus` from `anchorScreenPoint` — where the framing
  rule *wants* the anchor — but `resolveCamera` and `_offsetYFor` both **centre** the pan target and
  clamp it to the world bounds. Those are not the same place; the discrepancy measured a median
  **132 px**. My leader path uses the centred, clamped placement and is correct; the corridor path
  still uses `at`. I did not change it because it is pre-existing behaviour outside this brief and
  moving it would move the corridor guarantee on every track and every state at once. **It is the first
  thing I would look at next.**
- Diagnostic `_lastLeaderLateralExtra` added beside the existing `_lastLateralShift`, read by nothing
  in the camera, so a trace can separate this rule's contribution from the corridor's.
- No leftover fields: the release latch (`_lateralEngaged`) and its key were built, measured, found
  unnecessary and **removed** — not left in place set to a no-op value.

## CONFORMITY

- **"A guarantee widens, it never steers" (Lesson 192).** The lateral guarantee is the documented
  exception and CAMERA-LATERAL-1 established it. Adding a subject stays inside that exception.
- **One mechanism, one home.** No second smoother; the existing pan smoother is the travel. No new
  duration constant — none was needed once the target/picture distinction was measured.
- **UI-configurable**: both numbers are config keys with defaults, changeable without a code edit.
- The run-in, LEAD_CHANGE, OVERVIEW, the naturalness envelope, the finish line and fairness are
  untouched; world and world-off fingerprints prove the last of those.

## PROPOSALS

**P1 — the along-track residual, on the ZOOM.** 830 frames, and the majority of the defect on the six
calm tracks. Do not build a second pan mechanism; one was reverted for exactly that. The overflow means
the zoom was too tight for the sprite at that moment, and the guarantee stack already widens without
steering. **Unbuilt, and recorded as the candidate.**

**P2 — `visibleCorridors` may now be re-examinable.** The shot is narrower than the road on 100% of
frames, which is what forced the split-the-difference branch. That was a reasonable place to be when
nothing protected the leader; now that something does, the corridor setting is answering a question it
no longer has to answer alone.

**P3 (mine) — fix the corridor's reference point, on its own branch and with its own before/after.**
The 132 px discrepancy above is a live inconsistency in a shipped guarantee: it is measuring room from
a point the camera does not use. It is very likely worth real width on every track. It deserves a piece
of its own precisely because it moves everything at once, and it should not have been smuggled in here.

**P4 (mine) — put the margin on a measured footing rather than a swept one.** 90 px was read off a
knee, and knees move when the thing underneath them moves. The quantity it is actually budgeting for is
the pan smoother's residual trailing, which is *computable* from `trackingTC` and the target's screen
speed — the closed form is in LEADER-LAG-TRUTH-1. A margin derived from that would track the camera's
own settings instead of needing a re-sweep whenever `trackingTC` moves, and would remove one of the two
numbers this piece added.

**P5 (mine) — the space-sprint sprite is the real outlier and nobody has priced changing it.** Its
half-length is 2.9× river-run's and the aim leaves it 41% less room, giving it a tolerance 3.1× tighter
than any other track (LEADER-LAG-TRUTH-1). That single fact is why it needed a 12 pp repair when no
other track needed more than 4.3. Shrinking that sprite, or widening that one shot, would attack the
cause rather than the symptom — and it is a smaller change than anything in this report.

## LEDGER — the wrong answers, all three caught before they reached a conclusion

1. **The probe's placement model was wrong**, reconstructing the camera as "anchor at
   `anchorScreenPoint`". Validated against the director's own offsets: off by a median **132 px**. It
   would have made every number in this report wrong. Replaced by solving from the frame as drawn.
2. **The jolt gate was wrong on its first cut** — it differenced `camStep` against the previous
   *recorded* row, which can be many frames and a state transition away, so it read deliberate cuts as
   6,000–10,000 px jolts and declared all 100 races loud in **both** arms. Fixed to consecutive frames
   in the same state; the corrected gate is the table above.
3. **The first test fixture's sprite was too large for its own fixture**, so the rule declined and the
   test passed for the wrong reason. The sabotage arm caught it.

**And two verify failures that were NOT findings, checked rather than assumed.** `client-suite` and
`script-suite` both failed under verify's parallelism, and the harness labels that "a finding, not a
flake". A *different* test failed on each of two runs — `raceActionStage`, then `raceSeed` timing out
at 5,000 ms — and both pass alone, which is the contention signature. Run alone the client suite is
**228 files / 4,314 tests green** (227/4,302 before, plus this block's one file and 12 tests). The
script suite alone left exactly one real failure, which is the engine-reach fixture above — a genuine
finding that the parallel run's noise would have hidden.

One further correction to the brief's premise, made in the open: `_easeLogToward` does not exist on
master — it was extracted during LEADER-WHOLE-SETBACK-BUILD-1, which was reverted and never merged.
What exists is `_levelEaseTo`, which eases in **log** space for a zoom ceiling and is undefined at the
zero-crossing a signed lateral offset passes through. It was the wrong tool, and in the end no easing
was needed at all.
