# LABEL-DEGRADE-1 — a label shows the NAME when there is room

**Branch** `feat/label-degrade-1` off `feat/start-board-2` · 2026-08-09 ·
**built, measured, DEFAULT OFF on my own numbers · NOT minted, NOT merged**

---

## 1. Conformity, element by element — before any numbers

| the spec asked | done | where |
| --- | --- | --- |
| **(a)** reuse the exact overlap trigger from the archived label work, do not re-type it | yes | §3 — and it turned out to be *already in* the live file |
| **(b)** flicker governed by incumbency / hysteresis / cadence / one-way bias — choose and justify | yes | §4 — the existing asymmetry, extended to a second tenure |
| **(b)** MEASURE it: switches per label per race, two contrasting tracks, 40 and 100 | yes | §5 |
| **(c)** cascade: evaluate in a fixed order, once per decision cycle; say what order | yes | §6 |
| **(d)** a Dev toggle | yes | §7 |
| **(d)** default it OFF if the switching is busy, and say so | **OFF — but the switching is NOT why** | §7, and it is the one place I depart from the spec's reasoning |
| RENDER expected to move; CAMERA and WORLD must not | **none moved — and that is the correct outcome** | §8 |
| `engine-reach --check` on the actual diff, run what it says is owed | yes | §8 |
| DO NOT mint, DO NOT merge | held | §8 |
| verify ONCE, at the end; `--cheap` for wiring checks | held | §8 |
| Tests exercise the paths a race actually takes | yes | §9 |
| Source hygiene | yes | §10 |
| Two proposals | yes | §12 |

---

## 2. What was built, in one paragraph

During the race, each label is offered its racer's **name** first. If the name's box lands on free
pixels it is drawn; if it does not, the label falls back to the **number**, which is what ships
today. The decision is made inside the existing decluttering pass, in the existing priority order,
once per label per frame. It is behind a Dev toggle and **ships OFF**.

---

## 3. (a) The overlap trigger — reused, and it was already here

The archived work (`archive/label-stagger-1`, commit `ae688dd5`) established the trigger as an
**axis-aligned box intersection**, and its header is explicit about why that shape and not the
"compare row separation against label height" the specification originally asked for: measured over
ten tracks at every field size, the height test **fires 153 times where nothing overlapped** and the
centre-distance test **misses 120 real overlaps**. The box test is *exact by construction* — the
predicate IS the condition rather than a proxy for it.

**The live `computeTagLayout` already contains that predicate**, as the intrusion accumulation in its
first-fit pass — the same rectangle overlap, integrated to an area so an incumbent can be given a
budget. So reusing it meant **not adding a second occlusion test at all**: the name is offered to the
existing `fits()` check as a wider candidate box. There is one overlap test in the file, and the
name/number choice is a candidate handed to it.

Re-typing `boxesIntersect` from the archive would have recreated exactly the duplication the cleanup
removed, and would have left the file with two subtly different ideas of "overlap" (a boolean and an
area budget). It is one.

---

## 4. (b) Flicker — what governs the switch, and why that

**The existing asymmetry, extended to a second tenure. No new timer, no cadence, no one-way bias.**

`nameTagLayout.js` already carries two hysteresis mechanisms, both measured into existence: edge
hysteresis (a racer must be inside the frame to gain a label, and keeps it until it is outside) and
the **decisive-intrusion budget** (a newcomer needs completely free pixels; an incumbent yields only
when the intrusion exceeds `yieldOverlapFrac` of its own box). Together they took label churn from
12.06/s to 5.45/s.

The switch is governed by the **same budget, applied to the wide box**: a racer *not* showing its
name must find its wide box completely free to gain one; a racer *already* showing its name keeps it
until the intrusion is decisive. That is Lesson 190 — a decision changes when the change is decisive,
never on a clock — applied to a second decision rather than reimplemented for it.

**The one thing that is new is a second tenure set.** Name tenure (`wideIncumbents`) is tracked
separately from label tenure (`incumbents`), because **a racer can hold its label while losing the
room for its name** — those are two claims on two different boxes. Conflating them would let a
number's tenure buy a name's, which is a test in §9.

I chose this over a slow cadence because a cadence is a timer, and over a one-way bias (names only
ever gained within a shot) because it would make the form depend on when the camera cut, which is
invisible to the viewer and would read as arbitrary.

---

## 5. (b) The measurement

`node scripts/label-degrade-truth.mjs` — a new committed harness that drives the **real**
`computeTagLayout` with the same inputs `renderRaceFrame` gives it, over whole races, threading
incumbency exactly as the component does. Two contrasting tracks: **searound** (closed, bunches the
field into a repeating pack) and **river-run** (open, strings it out). 60 s races, seed 5601.

| track | n | names | labels | name % | switches | **/label/race** | /label/s | churn/s | worst label |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| searound | 40 | OFF | 14.1 | 0.0 | 0 | 0.00 | 0.000 | 3.45 | 0 |
| searound | 40 | **ON** | 13.7 | 99.3 | 17 | **1.24** | 0.284 | **3.76** | 3 |
| searound | 100 | OFF | 19.4 | 0.0 | 0 | 0.00 | 0.000 | 9.68 | 0 |
| searound | 100 | **ON** | 18.5 | 93.3 | 49 | **2.64** | 0.792 | **10.55** | 4 |
| river-run | 40 | OFF | 26.0 | 0.0 | 0 | 0.00 | 0.000 | 3.93 | 0 |
| river-run | 40 | **ON** | 25.1 | 96.8 | 39 | **1.55** | 0.700 | **5.04** | 5 |
| river-run | 100 | OFF | 43.3 | 0.0 | 0 | 0.00 | 0.000 | 10.99 | 0 |
| river-run | 100 | **ON** | 40.4 | 92.4 | 157 | **3.89** | 2.842 | **14.56** | 7 |

A **switch** is counted only while a label stayed on screen; a label that vanishes and returns in the
other form is churn, not a switch — counting it as both would double-charge the same event to the
feature. `churn/s` is the **control**, measured on the same run with the feature off and on.

**Reading it honestly, three findings:**

1. **The switching is CALM.** 1.24–3.89 changes per label per race is one change every 15–48 seconds
   of a label's life. The worst single label in the worst case changed 7 times in 60 s. This is not a
   strobe, and the hysteresis is why.
2. **But it costs labels.** The field loses 3–7 % of its labels (43.3 → 40.4 on river-run at 100),
   because a wide box that fits displaces neighbours a narrow one would not have.
3. **And it costs churn — up to 32 %.** river-run at 100: **10.99 → 14.56 changes per second**. That
   is a third of what the stability work bought, spent. Churn is labels appearing and disappearing,
   which the owner's own measurement identified as the thing that makes a name unreadable.

**The fourth finding is the one that decided it: the name fits 92–99 % of the time.** This is not
"the name when there is room" in practice — it is *names instead of numbers, nearly always*.

---

## 6. (c) Cascade — the order, and why there cannot be one

**One decision per label per cycle, in the existing priority order: incumbents first, then race
position (highest `t` first).**

I did not invent an order. That ordering already exists — it is how the decluttering decides who gets
offered pixels first — and reusing it means the name decision and the label decision cannot disagree
about who matters.

**The cascade cannot occur, by construction rather than by tuning.** The pass is a single sweep: a
label is decided, its chosen box is placed, and the next label sees it. **No label is revisited.** So
the sequence the owner described — A widens, displaces B, B frees room, A widens again — has no step
at which A is asked a second time.

The test pins the interesting case rather than the trivial one. Three racers 40 px apart:

- racer 0 takes its **name** (highest priority, free pixels)
- racer 1 cannot fit a name beside it and falls back to its **number** — a much narrower box
- racer 2 now has room *because 1 went narrow*, and takes its **name**

…and 1 is never reconsidered. That third line is the cascade's first step, and the test's point is
what does not happen after it. (I had this test's expectation wrong at first — I asserted one name
and the code produced two. The code was right.)

---

## 7. (d) The toggle, and the default

`labelNamesWhenRoom`, in `defaults.js`, with a Dev Screen checkbox under **0 · Eye-test** carrying
the numbers in its tooltip.

**It ships OFF — and the switching is not the reason.** The spec's criterion was "if the switching is
busy, default it off". By that criterion it would ship on: 1.2–3.9 switches per label per race is
calm. I am departing from the criterion, not the instruction, and here is the argument:

1. **The collateral is a measured regression in what the stability work bought.** Up to **32 % more
   label churn** and 3–7 % fewer labels. The feature makes labels *less* stable overall while making
   the form stable — which is a strange trade to make by default.
2. **A 92–99 % name share means this is not the feature that was described.** "Show the name when it
   fits" implies the name is the exception. Measured, it is the rule. Shipping it on would silently
   revert **RACE-NUMBERS-1** — the accepted design whose finding was that a 170 px name *points at
   nothing a viewer can check* — in almost every frame, without that being anyone's decision.
3. **Two of my four numbers are approximations.** Text width is measured with a per-character ruler
   because node has no canvas (§5). The relative question is preserved, but the exact name share on
   the real font is his eye's to settle, not mine.

Shipping it on against points 1 and 2 would have been the wrong call. The toggle is there so his eye
can overrule my arithmetic, which is the one thing it can legitimately do.

---

## 8. Fingerprints

`node scripts/engine-reach.mjs --check` on the 8 changed paths named exactly one —
`client/src/modules/storage/defaults.js` (the new key) — so the world fingerprint was **owed and
run**.

| role | before | after | expected? |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | must not move — it did not |
| camera | `3af58f4d7b0b073f` | `3af58f4d7b0b073f` | must not move — it did not |
| render | `58476ade8198fb90` | `58476ade8198fb90` | **the spec expected a move; it did not, and that is correct** |

**Why RENDER did not move, and why that is the right answer.** The feature ships OFF, so
`wideLabelOf` is `null` and the layout is byte-for-byte what it was. **That is the proof that "off"
is the absence of the feature rather than a second code path** — which is exactly what makes the
owner's A/B comparison meaningful.

**The toggle does reach the picture, and I proved it cheaply rather than asserting it:** flipping the
default and re-running `render-fingerprint --cheap` moves city-circuit from `d2323508df86253c` to
`f39d03eb28aa0386`. Three seconds, not two minutes. The default was reverted immediately.

**NOT MINTED, NOT MERGED.**

**Cost discipline:** `npm run verify` run **once**, at the end. Every wiring check used `--cheap`
(three of them). The client suite was teed and read once.

**One guard tripped and I re-stamped deliberately rather than re-measuring**, which is its own
documented escape: `check-measured-stamps` reported the tracking-lag figures stale because
`client/src/modules/camera/` changed after the stamp — but the change was
`startCeremony.**test**.js`, reformatted by the pre-commit hook in Part 1's *report* commit. A test
file is not read by `tracking-lag.mjs`; it cannot move the numbers. Re-stamped at `a5780f4e` with
the reason in the commit. §12.2 proposes fixing the guard.

---

## 9. Tests

**Added: 11** (`nameTagLayout.degrade.test.js`, new). **Deleted: 0.** Client suite: **190 files,
3759 tests, all green.**

They drive the real `computeTagLayout` with a ruler for text measurement — the same call
`renderRaceFrame` makes, with the same incumbency threading — rather than a state assigned by hand.

| test | what breaks if deleted | what goes unnoticed if it is missing |
| --- | --- | --- |
| a lone racer with room gets its NAME | the feature; nothing else asserts a name is ever chosen | a wired toggle that never widens — indistinguishable from "the names never fit" |
| two too close: the second keeps its NUMBER | the other half; a rule that always widens is not "when there is room" | names overlapping each other — the thing RACE-NUMBERS-1 replaced |
| `wideLabelOf: null` reproduces the old layout | the toggle's meaning | the OFF state drifting, which would make the A/B comparison meaningless |
| a racer with no name never gets a wide form | — | an empty label box where a name should be |
| a name narrower than the number is not a "widening" | — | the feature claiming credit for a decision it did not make |
| a shown name SURVIVES an intrusion that would have prevented it | the owner's main risk — the asymmetry itself | a rule that reads as correct and looks like a strobe |
| label tenure alone does NOT buy name tenure | the separation of the two claims | a name persisting because its *number* was on screen |
| the result is a function of the input | the cascade guarantee | an order-dependent layout that no measurement would attribute correctly |
| the fixed order is priority order | the ORDER | a reordering that hands names to the back of the field |
| a widened label displaces its neighbour ONCE | the cascade's actual first step | oscillation inside one frame — which slowing the cadence would not fix |
| `showAll` labels everyone and chooses no wide form | the roll call | the board and the on-track roll call disagreeing about what a label is |

---

## 10. Hygiene

**Lines.** `nameTagLayout.js` 289 → 341 · `racerRendering.js` +11 · `renderRaceFrame.js` +9 ·
`index.jsx` +6 · `defaults.js` +10 · `CameraAdvancedSection.jsx` +24. New:
`nameTagLayout.degrade.test.js` 213, `scripts/label-degrade-truth.mjs` 232.

**Removed, because this change orphaned it:** **nothing.** This block adds a candidate to an existing
decision; it displaces no value, key, slider, label or helper. The one thing it *could* have
orphaned — a second overlap predicate — was never created, because the existing one was reused (§3).

**Restructured rather than removed:** the placement loop's inline intrusion accumulation became a
`fits(box, hasTenure)` closure, because it is now asked twice per label (wide first, then narrow)
instead of once. Same arithmetic, same budget rule; it is called rather than repeated.

**Moved out:** nothing.

**Noticed and deliberately left:**

- **`CameraDirector._ceremonyBeat` is still write-only.** Fourth block to walk past it. Not orphaned
  by this change; still not mine to take.
- **The measurement's text width is an approximation** (§7.3). Making it exact needs a canvas in
  node, which is the same limitation that makes the render fingerprint blind to sprite blits. Named,
  not solved.
- **`labelBoxWidth` pads by a constant 8 px** for both forms. Correct today; if a name form ever
  wanted different padding, that constant is the one home to change.
- **The 92–99 % name share suggests the label font is small relative to the space available.** That
  is a finding about the *label size*, not about this feature, and it belongs to whoever next looks
  at `nameTagFrameFrac`.

---

## 11. Decisions made alone

1. **Reused the live intrusion test rather than importing the archived `boxesIntersect`.** §3 — the
   archive's predicate is already here in a strictly more capable form (area, with a budget).
2. **A second tenure set rather than one.** §4 — a racer can hold its label and lose the room for
   its name; conflating them would be a silent hysteresis leak.
3. **The existing priority order, not a new one.** §6.
4. **Default OFF, against the spec's stated criterion but on my own numbers.** §7. This is the
   decision I would most want him to overrule if his eye disagrees, and the toggle exists for that.
5. **Counted a vanish-and-return as churn, not as a switch.** Counting it as both would have charged
   the same event to the feature twice and inflated the headline number I then used to decide.
6. **Measured with the feature OFF and ON on the same run** so the churn column is a control rather
   than a memory of an older measurement.
7. **Re-stamped the tracking lag rather than re-measuring it.** §8 — a `.test.js` edit cannot move it.

---

## 12. Two proposals of my own

**12.1 — If he wants names, the honest version is a WIDTH BUDGET, not a fit test.** The measurement
says the name almost always fits, so "when there is room" is not doing the work anyone expected — the
labels are simply sparse. If what he actually wants is *names where they help and numbers where they
would crowd*, the lever is a **cap on how much of the frame labels may occupy**: sort by priority,
spend the budget on names from the front, and give the rest numbers. That makes the trade explicit
and tunable with one slider, where the current rule's behaviour is an emergent property of how spread
the field happens to be. It would also make the 100-racer case behave differently from the 40-racer
case *on purpose* rather than by accident.

**12.2 — `check-measured-stamps` should ignore test files.** It tripped this block because a
`*.test.js` file inside `client/src/modules/camera/` was reformatted by the commit hook, and a test
file is not read by any measurement the stamps cover. The fix is one line in the guard's `depends`
resolution — exclude `*.test.*` — and it removes a class of false positive that costs a re-measure or
a deliberate re-stamp every time the formatter touches a test. It is the same shape as the
`inertChange` rule VERIFY-COST-2 added for comments: a change that provably cannot move the number
should not demand the number be re-taken.

---

## 13. What I did NOT do, and why

- **Did not ship it on.** §7 — my own numbers.
- **Did not add a cadence or a one-way bias.** §4 — a timer is what Lesson 190 exists against, and a
  shot-scoped bias makes the form depend on something invisible.
- **Did not touch the start formation.** The roll call shows every name already; the wide decision
  lives inside the decluttering, which `showAll` bypasses. Asserted.
- **Did not change the label font or the box padding.** §10 — a finding for a different block.
- **Did not mint. Did not merge.**

---

## 14. How to see it

**5173 is on this branch**, `feat/label-degrade-1`. The build pill names the branch.

**To compare:** Dev Screen → Camera Advanced → **0 · Eye-test** → *"Track labels show the NAME when
it fits"*. Off is what ships today (numbers). On is the feature. river-run at 100 is where my numbers
say it is busiest — 3.89 switches per label per race and 32 % more churn — so that is the run that
should settle it.

**What I would watch for:** not the switching, which is calm, but whether **more labels disappearing**
is a worse experience than **numbers instead of names**. That is the trade, and it is a taste
question my measurement cannot answer.
