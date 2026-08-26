# RUNIN-CHANCE-SET-1 — the chance test was already in the tree; moving membership onto it removes twelve of the thirty worst steps and costs no width

**Date:** 2026-08-26 · **Branch:** `diag/runin-chance-set-1` (off `master`, with `feat/runin-level-set-1`
merged in so the code under study is present) · **Verdict:** MEASURE ONLY. Nothing built, nothing
changed, no config key added, no default moved, no fingerprint minted. The report is merged to
`master`; the branch carries the instruments and is pushed unmerged.

**Corpus:** 1,140 races (19 track×field-size combinations × 60 seeds), **449,545 run-in frames per
arm**, four arms per race, browser camera seeding throughout. Pool of 12 from 14 cores, 56 minutes.

---

## SEED 13 FIRST, IN PLAIN LANGUAGE

**The race:** `river-run`, 20 racers, seed 13 — the one the owner watched. **#7 Drift** leads, **#16
Flare** is level and wide to the left, **#5 Thunder** is the racer who crossed the one-length boundary
by a tenth of a pixel 0.15 s from the line and cut the shot from 198 px to 386 px in a single frame.

**Under a chance test Thunder is not a late arrival at all. He is a member from 8% of the way through
the closing move** — because he is closing, and the rule can see him closing. The last half-second
before the line, which is where the owner's eye caught the cut, becomes smooth: the shot drifts from
391 px to 387 px with no step in it anywhere.

**And a cut of nearly the same size opens at 73% instead.** ×1.80 against ×1.95, at u = 0.734 instead
of u = 0.972. **The step moved. It did not go away.**

**Why the warning bought nothing.** The chance rule saw Thunder **82 frames — 1.37 seconds — before**
the frame the one-length rule would have admitted him. That is real warning and it is exactly what
the brief hoped for. It changed nothing about the picture because **the width does not ease onto a
new member: it admits him instantly and jumps by his whole demand.** RUNIN-SEED13-ANATOMY-1 already
measured why — Thunder's demand stood at 386 px while he was still outside the set, because he is
107 px from the camera's actual subject whether anyone is listening to him or not. A membership rule
decides *when* that jump happens. It cannot decide *whether*.

**So on this race the honest verdict is: the cut he complained about is gone, an earlier one of
similar size takes its place, and the last quarter of the race is watched from much further out.**

| `river-run` 20 seed 13 | mean width, whole closing stretch | mean over the LAST QUARTER | at the line |
| --- | --- | --- | --- |
| `off` — master, no level guarantee | 267 px | 139 px | 120 px |
| `len` — the one-length build | 350 px | 231 px | 386 px |
| **`chance`** | **411 px** | **396 px** | 387 px |

**But seed 13 is the worst case for this route, not the typical one** — §3 shows the population does
not pay that width, and §5 shows twelve races have their step removed outright.

---

## 1. (a) WHAT EXISTS ALREADY — the chance test is in the tree, shipped and switched on

**The requirement is not unimplemented. It is implemented, live, and pointed the wrong way.**

`_updateContentionWatch` (`client/src/modules/camera/CameraDirector.js:2574-2633`) asks the owner's
question every 250 ms from the 95% mark to the first crossing:

```js
const msToLine  = ((raceState.finishT - leader.t) * pathLen) / vLeader;   // :2609
const gapNow    = shortestArcDeltaT(leader.t, r.t) * pathLen;             // :2616
const projected = gapNow + (vLeader - vR) * msToLine;                     // :2619
if (projected > contactLength) { /* release him */ }                      // :2620
```

The gap **extrapolated to the line at the current closing rate**, against one racer length. The
speeds are a finite difference over the check cadence (`:2599-2603`), so the estimator's window IS
`contentionCheckMs`. It never reads the race plan — deliberately (`:2547-2549`).

**Its own config entry states the requirement in the owner's terms** (`defaults.js:593-617`): *"the
camera keeps asking whether a racer still has a chance to WIN"*, and *"THE JUDGEMENT COMES FROM WHAT
IS VISIBLE ON TRACK — the gap and the speed difference carried forward over the distance that
remains"*. `contentionWatch` defaults to **`true`**. This is shipped behaviour, not a proposal.

**AND IT CAN ONLY EVER REMOVE.** `_contentionOut` only grows (`:2613`, `:2622`), the verdict is
confirmed over two consecutive checks (`:2621-2626`) and never reversed. It feeds `_contentionWeight`
(`:2646`) and `_contentionEased` (`:2670`), which ease a released racer's framing position toward the
leader so he stops constraining the shot. **Nothing anywhere admits on it.**

Every membership rule in the tree is pure current state:

| rule | file:line | the test | uses a rate? | live or pinned |
| --- | --- | --- | --- | --- |
| `withinOneLength` | `CameraDirector.js:2712` | `arcGap ≤ contactLength` | **no** | pure |
| `_levelContenders` — **the level set** | `:2738` | leader + everyone `withinOneLength` | **no** | live |
| `_abreastContenders` | `:2877` | `arcGap ≤ contactLength` **and** a free lane across | **no** | **pinned** at PHOTO_FINISH entry (`:1628`) |
| `evaluatePhotoFinishGate` | `finishPhase.js:235` | `arcGap(P1,P2) ≤ 0.03` lap | **no**, despite the name | one-shot latch |
| `_updateContentionWatch` | `:2574` | **`gapNow + (vLeader−vR)·msToLine ≤ contactLength`** | **YES** | latched, one-way |

### AND THIS IS THE THIRD TIME IT HAS BEEN FOUND

The brief asked this block to correct the planner's record: the one-length rule *"came only on the
evening of 2026-08-24 … he offered it as a simplification, not as the requirement"*. That is true —
**and the correction runs deeper, because the tree already held the chance test at that moment and
two earlier reports had already located it and said so:**

- **RUNIN-CONTENDER-GUARANTEE-1 §2** established it at source, headed the section *"how 'can still
  win' is decided today"*, called it *"predictive and can only ever REMOVE"*, and used the same
  expression as its own reading of the requirement.
- **RUNIN-LEVEL-SET-1** measured its membership distribution beside the one-length rule's, under the
  name *"the previous block's predictive set"*, and recorded the convergence: *"Two sentences of his,
  derived independently, converge on nearly the same set … their last-quarter winner capture is
  identical at 100.0%."* A second copy of the expression still sits in that block's harness
  (`scripts/diag/runin-level-set.mjs:146`).

**So the one-length rule was adopted as the buildable form of the requirement while the tree already
contained the requirement's own test, documented twice, in two consecutive reports.** The
simplification was not unreasonable — §2 shows the one-length rule is the chance test's
zero-closing-rate case — but nobody connected the two, three blocks running. **That is the record
correction, and it is larger than the one the brief asked for.**

---

## 2. (b) THE CHANCE, DEFINED — and it is not mine to define

**THE PREDICATE IS THE TREE'S, TAKEN VERBATIM.** A racer can still win when

> **`gapNow + (leaderSpeed − racerSpeed) × msToLine  ≤  one racer length`**

with `msToLine = (finishT − leader.t) × pathLength / leaderSpeed`, the speeds from the director's own
250 ms finite difference, and `one racer length` = `CameraDirector.contactLengthBetween(leader, r)`.
That is `CameraDirector.js:2619` with the comparison read the other way: the shipped code releases
when `projected > contactLength`, so membership is `projected ≤ contactLength`.

**IT FOLLOWS FROM HIS SENTENCE IN BOTH HALVES.** *"A racer closing fast can still win from further
back"* — a negative `(vLeader − vR)` shrinks the projected gap, so a closing racer is admitted from
beyond one length. *"A racer holding station cannot win from close"* — a positive difference grows
it, so a racer level now but dropping back is **dropped**. The rule is two-sided; one-length is
one-sided, and §5 shows the removal half does real work.

**WHAT IS MINE, MARKED AS MINE.** The formula is the tree's; **the decision to ask it about MEMBERSHIP
as well as about release is my reading of his requirement.** He has not specified a formula and must
not be handed one as if he had. No constant is introduced — `contentionCheckMs`,
`contactLengthBetween` and `runInOpenMs` all exist and all already carry this meaning.

**THE ONE-LENGTH RULE IS ITS ZERO-RATE CASE.** Set `vR = vLeader` and the predicate collapses to
`gapNow ≤ contactLength`, which is `withinOneLength` exactly. The evening of 2026-08-24 did not
replace the requirement with something else; it replaced it with the special case in which nobody is
closing.

### WHAT WAS REJECTED

- **The engine's own `r.vt`** (`raceCore.js:645`) — an instantaneous per-step speed needing no window
  at all, which looked ideal. **Measured and rejected.** Against the director's 250 ms difference on
  river-run seed 13 it gives a pooled Pearson **r = 0.207** (n = 5,120), with only **56.3%** of racers
  in the same speed-rank position. It is one physics step, so it carries every boost/brake re-roll as
  noise; a noisier rate means a flickering membership, the opposite of what this block is looking for.
  *(`vt` also omits `governorMult`, which `advanceRacerT:131` applies — but that factor is uniform
  across the field at any instant, so it cannot explain the disagreement, and is recorded only so a
  later reader does not chase it.)*
- **A new look-ahead constant** — "admit anyone within 1.5 lengths and closing". Rejected: it needs a
  number the project does not have, and the tree's expression needs none.
- **The race plan.** Walled off on purpose (`:2547-2549`). Not revisited.

### HOW IT WAS MEASURED — four arms, one difference

Every arm runs the **shipped** `_levelCeiling` — its instant admit, its eased release, its hold state,
its place in the composition order. Only `_levelContenders` is overridden at runtime. **So any
difference in the delivered width is a difference of membership and of nothing else.**

| arm | membership |
| --- | --- |
| `off` | the level guarantee never binds — master's shot, since the feature is unmerged |
| `len` | the shipped one-length rule — `feat/runin-level-set-1` as built |
| `chance` | the director's own chance test, applied to membership |
| `union` | chance **or** one-length — the inclusive reading, which can only ADD |

---

## 3. (d) THE WIDTH AND THE STEP — the number this block exists to move

### THE LARGEST SINGLE-FRAME STEP, over 1,140 races

| arm | mean | median | **p95** | max | **races over 0.4 ln** | races over 0.2 ln |
| --- | --- | --- | --- | --- | --- | --- |
| `off` | 0.055 | 0.051 | 0.092 | 0.927 | 1 | 5 |
| `len` | 0.076 | 0.052 | **0.211** | 1.539 | **30** | 61 |
| **`chance`** | **0.069** | 0.051 | **0.164** | 1.539 | **18** | 46 |
| `union` | 0.070 | 0.051 | 0.180 | 1.539 | 20 | 51 |

**Races carrying a visible cut fall from 30 to 18 — a 40% reduction — and p95 falls 22%.** The mean
barely moves, because the mean is dominated by the frames where nothing steps at all.

**THE WORST CASE IS UNCHANGED AT 1.539 ln.** `searound-20-4` steps ×4.66 under every arm including
`chance`. Whatever produces that is not membership, and this route does not reach it.

**AND ONE RACE IS MADE MATERIALLY WORSE.** `space-sprint-20-18` steps **0.046 ln under one-length and
0.852 under chance** — a race with no visible step acquires the largest new one in the corpus. It is
the only such race, and it is the honest counterweight to the twelve that are fixed.

### HOW MUCH WIDER — and the surprise is that it is not

| arm | mean set size | max set | mean ln(cam.zoom) | **wider than `off` by** |
| --- | --- | --- | --- | --- |
| `off` | 0.00 | 0 | 0.9338 | ×1.00 |
| `len` | 2.27 | 13 | 0.8853 | **×1.05** |
| **`chance`** | 2.29 | 14 | **0.8848** | **×1.05** |
| `union` | 2.48 | 14 | 0.8828 | ×1.05 |

**Across the population a chance-based set costs no more width than the one-length set** — 0.8848
against 0.8853, a difference of one part in two thousand, and if anything marginally tighter. That is
not because it admits nobody extra: its mean set is slightly larger and its maximum reaches 14. **It
is because the rule is two-sided.** What it adds by admitting racers who are closing, it gives back
by dropping racers who are level but fading. On seed 13 the chance test excludes a currently-level
racer on **23.8%** of frames.

**Seed 13's 71%-wider last quarter is therefore a property of that race, not of the rule.** Anyone
reading §0 alone would conclude this route is expensive. Over 1,140 races it is free.

---

## 4. (c) DOES MEMBERSHIP ARRIVE GRADUALLY? — yes, and it does not help

Measured over the 37 traced races (his twelve plus §14's hit list), for every join under the chance
rule: how many frames before the frame the shipped one-length rule would have admitted the same racer.

| | |
| --- | --- |
| joins under the chance rule | **81** |
| …that precede a one-length crossing (i.e. carry warning) | **22 (27.2%)** |
| warning, frames | min 9 · p25 68 · **median 137** · p75 243 · max 352 |
| **median warning in seconds at 60 Hz** | **2.28 s** |
| …for a racer who NEVER gets within one length | **20** |
| …that themselves land on a visible cut (> 0.2 ln) | **8** |
| joins by quarter of the closing stretch | **[48, 17, 7, 9]** |

**The warning is real and it is long.** Where a chance join precedes a one-length crossing, the median
lead is 137 frames — **2.28 seconds**, which is nearly twice `runInOpenMs` (1,250 ms), the span the
run-in already uses for every eased move it makes.

**But warning is not gradualness, and this is the finding that decides the piece.** Only 8 of 81 joins
land on a visible cut — yet those 8 are as abrupt as the one they replace, because the width admits
instantly. **Membership arrives gradually; the width does not.** Nothing in the level ceiling consumes
the 2.28 seconds the rule just bought.

**Most joins are early.** 48 of 81 fall in the first quarter of the closing stretch, where the shot is
still wide from the run-in's opening glide and a new member costs almost nothing. That is why the mean
step barely moves while the tail moves a lot.

---

## 5. (e) THE THIRTY RACES WITH A VISIBLE STEP, one by one

Every race whose one-length step exceeds 0.4 ln, re-derived under the browser camera seed rather than
taken from §14's harness-seeded list.

| race | `len` | **`chance`** | `union` | verdict |
| --- | --- | --- | --- | --- |
| searound-20-4 | 1.539 | 1.539 | 1.539 | no better |
| seatrack-20-53 | 1.346 | 1.346 | 1.346 | no better |
| searound-40-18 | 0.927 | 0.927 | 0.927 | no better — **and `off` is 0.927 too; not this feature's step at all** |
| ice-track-20-55 | 0.888 | 0.888 | 0.888 | no better |
| **mountainstreet-20-32** | 0.856 | **0.013** | 0.013 | **GONE** |
| mountainstreet-20-24 | 0.853 | 0.407 | 0.407 | smaller, still over |
| **luger-hill-40-47** | 0.788 | **0.015** | 0.015 | **GONE** |
| **river-run-20-13** | 0.670 | 0.587 | 0.587 | smaller, still over |
| seatrack-40-13 | 0.599 | 0.599 | 0.599 | no better |
| river-run-20-8 | 0.583 | 0.583 | 0.583 | no better |
| space-sprint-20-19 | 0.580 | 0.580 | 0.580 | no better |
| **mountainstreet-20-15** | 0.578 | **0.045** | 0.045 | **GONE** |
| seatrack-20-7 | 0.575 | 0.578 | 0.578 | no better |
| **river-run-20-18** | 0.571 | **0.013** | 0.571 | **GONE — and only the removal half does it** |
| **city-circuit-20-7** | 0.549 | **0.024** | 0.024 | **GONE** |
| **ice-track-20-22** | 0.538 | **0.053** | 0.538 | **GONE — removal half again** |
| luger-hill-20-33 | 0.521 | 0.521 | 0.521 | no better |
| space-sprint-20-53 | 0.501 | 0.501 | 0.501 | no better |
| luger-hill-40-59 | 0.497 | 0.497 | 0.497 | no better |
| ice-track-20-2 | 0.480 | 0.480 | 0.480 | no better |
| **mountainstreet-20-25** | 0.469 | **0.032** | 0.032 | **GONE** |
| **luger-hill-40-21** | 0.467 | **0.085** | 0.095 | **GONE** |
| **searound-20-45** | 0.457 | **0.064** | 0.064 | **GONE** |
| **city-circuit-20-34** | 0.447 | **0.319** | 0.319 | **GONE** |
| **seatrack-20-18** | 0.437 | **0.043** | 0.437 | **GONE — removal half again** |
| **searound-20-54** | 0.437 | **0.263** | 0.263 | **GONE** |
| space-sprint-40-13 | 0.435 | 0.435 | 0.435 | no better |
| river-run-20-1 | 0.416 | 0.445 | 0.445 | no better — slightly worse |
| **river-run-20-58** | 0.405 | **0.027** | 0.027 | **GONE** |
| garden-path-40-46 | 0.401 | 0.401 | 0.401 | no better |

**Of 30: thirteen drop under 0.4, two shrink but stay over, fifteen are untouched.** Plus one new
entrant (`space-sprint-20-18`), giving the net 30 → 18.

**Three of the thirteen are fixed by the REMOVAL half alone** — `river-run-20-18`, `ice-track-20-22`
and `seatrack-20-18` all keep their step under `union` and lose it under `chance`. In those races the
step is a racer who is level but fading, and the one-length rule cannot see him fade. **That is a
result nobody predicted, and it argues that if only one half of the chance test were adopted, the
removal half is the one that pays.**

### SEED 13 IN THIS TABLE

`river-run-20-13` is one of the two that shrink without clearing the bar: **0.670 → 0.587**. §0 gives
the frame detail. **The cut at the line is gone; a cut at 73% replaces it.** For the owner's specific
complaint that is an improvement; for the metric it is not a pass.

---

## 6. (g) DOES IT STILL KEEP HIS TWELVE? — yes, all twelve, on every arm

| race | `off` | `len` | **`chance`** | `union` | line in frame (`len` / `chance`) |
| --- | --- | --- | --- | --- | --- |
| river-run 20 seed 49 | 66 | 0 | **0** | 0 | 85.2% / 85.2% |
| river-run 20 seed 23 | 57 | 0 | **0** | 0 | 82.7% / 82.7% |
| river-run 40 seed 30 | 42 | 0 | **0** | 0 | 85.5% / 85.5% |
| river-run 20 seed 32 | 77 | 0 | **0** | 0 | 86.5% / 86.5% |
| mountainstreet 20 seed 13 | 0 | 0 | **0** | 0 | 83.3% / 83.3% |
| river-run 40 seed 23 | 37 | 0 | **0** | 0 | 86.8% / 86.8% |
| **luger-hill 40 seed 11** | 35 | 0 | **0** | 0 | 82.5% / 82.5% |
| river-run 20 seed 55 | 0 | 0 | **0** | 0 | 85.6% / 85.6% |
| mountainstreet 20 seed 34 | 26 | 0 | **0** | 0 | 84.0% / 84.0% |
| seatrack 20 seed 5 | 26 | 0 | **0** | 0 | 82.9% / 82.9% |
| luger-hill 20 seed 51 | 5 | 0 | **0** | 0 | 84.1% / 84.1% |
| seatrack 20 seed 11 | 1 | 0 | **0** | 0 | 83.3% / 83.3% |
| **TOTAL** | **372** | **0** | **0** | **0** | |

**All twelve hold, and the finish line is in frame on the same share of frames to one decimal place.**
The chance test's removal half — which drops a level racer on a quarter of seed 13's frames, and was
the live risk to this section — **never once drops a racer whose absence costs a winner.**

Population-wide, over all 1,140 races:

| arm | races with the winner off frame | winner-off frames | races with a top-5 racer off frame |
| --- | --- | --- | --- |
| `off` | 113 | 2,582 | 629 |
| `len` | **89** | **1,890** | 523 |
| **`chance`** | **89** | **1,890** | 523 |
| `union` | 89 | 1,890 | 520 |

**Identical to the one-length build on every visibility measure.** Two membership rules that disagree
on tens of thousands of frames deliver the same racers in frame — which is RUNIN-LEVEL-SET-1's own
convergence finding, now measured on the delivered picture rather than on the set.

---

## 7. (f) WHAT IT COSTS — the racers who fade

The brief's question: does a chance-based set admit racers who then fade, holding the shot wide for
nothing? Every racer ever held by each arm, paired with his finish rank at the moment he is counted.

| arm | distinct members per race | member-frames | finished 1st–3rd | 4th–5th | **6th or worse / DNF** |
| --- | --- | --- | --- | --- | --- |
| `len` | 3.01 | 1,018,311 | 82.0% | 13.6% | **4.5%** |
| **`chance`** | **3.67** | 1,034,838 (+1.6%) | 80.8% | 13.3% | **5.8%** |
| `union` | 3.67 | 1,117,422 (+9.7%) | 78.7% | 14.9% | **6.4%** |

**The price is real and it is small.** A chance set holds **22% more distinct racers per race** (3.67
against 3.01) for **1.6% more member-frames**, and the share of that width spent on a racer who
finishes sixth or worse rises from **4.5% to 5.8%** — an extra 1.3 points, about 13,000 frames in
449,545.

**The `union` arm is the one to refuse on this evidence.** It buys nothing the chance arm does not
(same twelve, worse step count, 20 races over 0.4 against 18) and costs 9.7% more member-frames with
6.4% of them on racers out of the top five. **Admitting on a chance and never removing is the worst of
the three readings**, which is worth knowing because it is the intuitively safe one.

*The `off` row is omitted from this table deliberately: that arm frames nobody by construction, so it
has no membership to price. See source hygiene — the instrument records a misleading value there and
it must not be read.*

---

## 8. WHAT COULD NOT BE ESTABLISHED

- **Whether a chance-based admit is the right thing to build.** This block measured membership only.
  §4 shows the step that survives is a property of the **instant admit**, not of the membership rule,
  and §9's proposals A and B are two different answers to that. **Choosing between them is his.**
- **What any of this looks like on screen.** Every number here is the camera's own geometry. No frame
  was rendered and no browser was driven. The one race with an eye-witness is seed 13, and what he
  witnessed was the arm this block proposes changing.
- **The worst step in the corpus.** `searound-20-4` at 1.539 ln is untouched by every arm and was not
  diagnosed. It is not a membership defect; beyond that this block cannot say what it is.
- **The new failure at `space-sprint-20-18`** (0.046 → 0.852) is reported and not explained. One race
  in 1,140, and it deserves the same frame-by-frame treatment seed 13 received before anyone builds
  on this route.
- **dirt-oval at 20 racers is absent from this corpus.** RUNIN-LEVEL-SET-BUILD-1 swept it at 240 seeds;
  this sweep covers 19 combinations at 60 seeds each and excludes it, so **every population figure here
  is over a different corpus from that report's 1,260** and the two counts should not be subtracted
  from one another. dirt-oval at 40 racers is included.
- **Whether the 250 ms estimator is the right window.** It is the shipped one and this block reused it
  rather than tuning it. §2 rejects one alternative with a number; it does not survey the space.

---

## 9. PROPOSALS — none ordered, each with its cost

### A — MINE: adopt the REMOVAL half only, and leave the admit alone

Keep `withinOneLength` as the admit and add the chance test as a **release**: a member who is level now
but whose projected gap at the line exceeds one length leaves the set. This is what the shipped code
already does for the framing pair (`_contentionOut`), extended to the level set.

**What it buys, measured:** three of §5's thirteen fixes come from this half alone
(`river-run-20-18`, `ice-track-20-22`, `seatrack-20-18` — all keep their step under `union` and lose
it under `chance`). It cannot cost a winner: §6 shows the removal half never drops a racer whose
absence costs one. It adds **no** members, so §7's price is not paid at all.

**Cost:** it is the smaller half of the effect — three races of thirty rather than thirteen — and it
does nothing for seed 13, the race he actually watched. It also needs the two-strike confirm the
shipped watch already carries, or a racer who dips for one check flickers out of the set.

### B — MINE: the membership already buys 2.28 seconds; spend it on the WIDTH

§4 is the finding this proposal rests on. A chance-based membership gives a **median 2.28 s of warning**
before a racer would cross the one-length line — nearly twice `runInOpenMs`. The level ceiling
currently throws all of it away by admitting instantly.

**So ease the ADMIT toward the new member's demand over `runInOpenMs`, the exact mirror of the release
ease already in `_levelCeiling`.** RUNIN-SEED13-ANATOMY-1's proposal A rejected an eased admit outright,
and correctly: under the one-length rule a racer arriving at the boundary would be cropped for up to
1.25 s at the line — fatal, because the boundary crossing IS the last moment. **Under a chance-based
admit that objection dissolves, because the racer is admitted 2.28 s early and the ease finishes before
the one-length moment arrives.**

**This is the only combination in which either half works.** A chance membership alone moves the step
(§0); an eased admit alone crops racers at the line. Together the warning pays for the ease.

**Cost, and it is not small.** Two changes at once to a term whose visible consequence has already cost
this project two discarded builds. The 2.28 s is a **median** — 22 of 81 joins carry warning at all,
and the p25 is 68 frames (1.13 s), just under `runInOpenMs`, so the shortest-warning cases would still
be mid-ease at the line. It needs its own measurement before it is built, and it must be measured on
the delivered picture, not on the set.

### C — MINE: refuse the `union` reading explicitly, and write down why

§7 shows the inclusive reading — admit on either rule, remove on neither — is dominated on every axis:
same twelve, more steps over 0.4 (20 vs 18), 9.7% more member-frames, and the largest share spent on
racers out of the top five. **It is also the reading anyone would reach for first**, because it looks
like the safe superset.

**Cost of adopting this proposal: none — it forbids rather than builds.** Cost of NOT writing it down:
the next block re-derives it, as three blocks in a row have now re-derived the chance test itself.

### D — the step that membership cannot reach

Fifteen of thirty races are untouched by every arm, and one (`searound-40-18`, 0.927 ln) steps just as
hard with the guarantee **off**. **At least some of the width steps attributed to this feature are not
this feature's.** Before any more work is aimed at the level set, the fifteen should be attributed —
otherwise a membership change will keep being judged against a population half of which it was never
aimed at, which is the error RUNIN-LEVEL-SET-1 §7 already warned about in the same words.

### E — bound what one member may add

From RUNIN-SEED13-ANATOMY-1, restated because this block's data supports it: let the level guarantee
widen to at most some multiple of the shot that would otherwise be, and record the cut racer when it
cannot. **Cost:** it makes his rule conditional, which is a decision about the rule and is his, not
mine. What it buys is a bounded worst picture — and §3 shows the worst case (1.539 ln) is exactly what
no membership rule reaches.

---

## 10. SOURCE HYGIENE, AND VERIFICATION

**The instruments** (`scripts/diag/chance-set.mjs`, `chance-set-run.mjs`, `chance-set-sum.mjs`,
`chance-set-joins.mjs`) are new on this branch and run on the shared `raceDriver.mjs`, so the races
they build are the races every other camera harness builds.

**No formula is re-derived.** The predicate is `contenderGuarantee`'s sibling at
`CameraDirector.js:2619`; the gap unit is `shortestArcDeltaT` imported from `client/src/utils/mathUtils.js`;
the one-length answer is obtained by calling `CameraDirector.withinOneLength` itself; and the rate is
captured from the director's own estimator by wrapping `_updateContentionWatch` to read the window it
used, on the frame it used it. **Only `_levelContenders` is overridden**, so all four arms run the
shipped `_levelCeiling` and every difference is a difference of membership.

**The camera seed is the browser's** — `cameraSeedForRace(raceSeed)` — throughout, per
RUNIN-LEVEL-SET-BUILD-1 §15. No figure here is measured under the harness default.

**A KNOWN WRONG VALUE IN THE OUTPUT, named rather than left to be found.** The instrument records an
`held` (ever-member) list per arm from `probe.chance ?? probe.len`. On the `off` arm both are absent,
so it falls back to the one-length set — which that arm never framed. **`off`'s membership figures are
meaningless and are omitted from §7**; the code carries a comment saying so. The `len`, `chance` and
`union` rows are correct because each records what it actually returned.

**A CORRECTION TO A STANDING NOTE.** `garden-path` was expected to yield nothing, on the standing
finding that it never finishes inside the harness's 200 s ceiling. **It yielded full data — 120 races,
a mean of 412–418 run-in frames each, and one entry on §5's hit list.** Reaching the endgame window and
finishing every racer are different things, and the note conflated them. Recorded because a report that
had assumed the zero would have reported a corpus of 1,020 and never noticed.

**Machine:** 14 cores, read before launching; pool of 12. 1,140 races × 4 arms in 56 minutes.

**What was NOT run, and why (R15).**

- **No fingerprints.** No file the camera or renderer reads was modified, so no fingerprint's answer
  can have changed. Minting one would also breach the ceremony's rule that a visible change needs his
  eye first — and there is no change.
- **No browser gate.** Nothing is built; there is no candidate shot to look at. The limit this imposes
  is stated in §8 rather than hidden.
- **No client suite.** No client source file was modified. The four new files are diagnostics that no
  test imports and no product code reaches.

---

## 11. CONFORMITY — what was asked against what was delivered

| the brief asked | delivered |
| --- | --- |
| Branch `diag/runin-chance-set-1` off current master; code under study `feat/runin-level-set-1` | Yes — branched off master, feature merged in |
| MEASURE ONLY; build nothing, change nothing, add no key | Yes — four diagnostic scripts; no product file, key or default touched |
| (a) establish at source every existing "can still win" notion; **reuse, do not invent** | §1 — one predictive rule exists, and the report measures **it** |
| correct the planner's record on the one-length rule | §1 — and the correction goes further: two prior reports had already found the chance test |
| (b) a chance defined plainly, using closing RATE and remaining distance; say what was rejected; **mark it as yours** | §2 — the formula is the tree's, the application to membership is marked as mine, three rejections with a number for the main one |
| (c) the set per frame, when each joins, **whether membership arrives gradually**, warning frames per join | §4 — 81 joins, median warning 2.28 s, and the finding that warning ≠ gradualness |
| (d) width against both the shipped shot and the one-length build; **the largest single-frame step** | §3 — three-way comparison; 30 → 18 races over 0.4 ln |
| (d) if a chance set still steps, say so | §0 and §3 — **it does**; stated as the headline, not buried |
| (e) seed 13 worked example: when, how wide, does the cut vanish or move | §0 — it moves, u 0.972 → 0.734, ×1.95 → ×1.80 |
| (e) answer for the other late-step races, at least the 17 that never recover | §5 — **all 30** races over 0.4 ln, re-derived under the browser seed rather than reusing §14's harness-seeded list |
| (f) does it admit racers who fade; how often a member never finishes near the front | §7 — 4.5% → 5.8% of member-frames on racers finishing 6th or worse |
| (g) does it still keep his twelve | §6 — all twelve, 372 → 0, on every arm |
| browser camera seeding, not the harness default | §10 |
| keep the ±20% naturalness envelope and the forward-view requirement out of revision | Untouched — neither is read or altered anywhere in this block |
| do not touch the one-length build; do not propose replacing it before the numbers say so | The build is unmodified. §9 proposes **no replacement**: A is additive, B is conditional on a further measurement, C forbids |
| read the core count before launching | §10 — 14 |
| read-only: no fingerprints, no browser gate, no client suite, with the reason | §10 |
| seed 13 answered FIRST in plain language | §0 |
| PROPOSALS with at least two of your own | §9 — three of the five are mine (A, B, C) |
| report registered in the INDEX in the same commit; push the branch; merge the report only | Done |

**One departure, named.** The brief asked for *"at least the 17 that never recover"* from §14's hit
list. **That list was measured under the harness camera seed**, which §15 of the same report
established the product cannot produce — six of its twenty-six entries evaporate under the browser's
seeding. Reusing it would have imported a known-void population into this block's headline. **The hit
list here is re-derived from this sweep's own `len` arm under the browser seed**, and comes to 30
races. It covers the brief's request and is not the same set.

---

## WHAT OUTLIVES THIS REPORT

**The requirement was implemented before it was asked for, and pointed backwards.** `_updateContentionWatch`
has been computing "can this racer still win" every 250 ms of every endgame this project has shipped,
and using the answer only to stop framing people. Three reports in a row have now found it. **The next
membership question anyone asks should start there rather than at a gap threshold.**

**A membership rule cannot fix a step, and this block is the proof.** Thirteen of thirty steps do fall
away, and the one race with an eye-witness keeps a cut of nearly the same size, moved earlier. The
width admits a new member instantly and jumps by his whole demand; **when that happens is a membership
question, whether it happens is not.** The route worth measuring next is not a better set — it is the
2.28 seconds of warning a chance set buys, spent on an eased admit that the one-length rule could never
afford.
