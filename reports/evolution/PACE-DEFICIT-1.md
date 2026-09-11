# PACE-DEFICIT-1 — six to eight percent for thirty-four seconds, and the gate is pricing the wrong shape

2026-09-12 · branch `night/2026-09-12` · **measurement only. No config key, no default, nothing built
to ship. The arm is REMOVED and the removal proved. Nothing minted.**

★ **A NOTE ON PROVENANCE, FIRST.** This answers **ADDENDUM 2 to COMEBACK-BUDGET-1**. ★ **The parent
brief never reached me** — there is no `COMEBACK-BUDGET-1` file, commit, or mention anywhere in the
tree, and no branch for it. The addendum defines its own measurements and defines outcomes **(c)** and
**(e)** inline, so it was treated as self-contained. **What I cannot do is choose among (a), (b) and
(d)**, whose definitions were in the parent; where the answer is one of those, this report describes
the finding instead of naming a letter.

---

## 0 · THE ANSWERS, IN THE ORDER THE ADDENDUM ASKS FOR THEM

| question | answer |
|---|---|
| the available window | **0.55 of the race — 33.5 seconds** at the shipped 60 s duration, at every field size |
| how much slower | ★ **5–8%**, sustained |
| against the clamp (`minMult` 0.85 = 15%) | ★ **roughly half the allowance — far inside it** |
| would it look natural | **5–8% off the field for 34 s.** Nearer the invisible end than the given-up end. **His call, not mine.** |
| is the climb what breaks the budget? | ★ **NO — outcome (c) does NOT stand.** The climb is the easy half. |
| can the gate express "how gently in the time I have"? | ★ **No — and the repair is NOT that question.** §4. |

---

## 1 · THE WINDOW — READ, NOT ASSUMED

Its start is the planner's own `pulkStart` via `getPhaseFractions()`; its length in seconds is the
race's realised clock, per field size.

| N | from | window (fraction) | median window (s) | median race (s) |
|---|---|---|---|---|
| 20 | 0.15 | **0.55** | **33.94** | 60 |
| 40 | 0.15 | **0.55** | **33.58** | 60 |
| 60 | 0.15 | **0.55** | **33.55** | 60 |
| 100 | 0.15 | **0.55** | **33.47** | 60 |

★ **He is right that it is a lot of time: more than half the race, and about thirty-four seconds.**

---

## 2 · ★ HOW MUCH SLOWER — MEASURED ON RACES

**Method.** A temporary arm holds ONE racer — the one at the FRONT after the chaos phase, found by a
discovery pass because the boundary has not happened at the start line — at a **constant** pace
multiplier from the choreo boundary to 0.70. It passes through the same `_setTarget` slew every other
racer uses. ★ **The harness REFUSES any multiplier below `controllerParams.minMult`, read from the
planner rather than retyped** — proved by trying 0.80 and being turned away. **No limit was relaxed.**
10 tracks × 4 field sizes × 12 multipliers × 2 seeds = **960 measured races.**

★ **The comparison is clean because the rest of the field is pinned to exactly 1.0 before OUTCOME**
(`racePlanner.js`, the pre-OUTCOME pin), so a multiplier of 0.94 really is six percent off the field.

**Median rank at 0.70, by sustained multiplier:**

| N | staging | 1.00 | 0.99 | 0.98 | 0.97 | 0.96 | 0.95 | 0.94 | 0.93 | 0.92 | 0.90 | 0.87 | 0.85 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 20 | 12 | 3 | 2 | 5 | 10 | 11 | 11 | **14** | 15 | 17 | 18 | 20 | 20 |
| 40 | 24 | 2 | 4 | 5 | 5 | 12 | 16 | 20 | 23 | **26** | 31 | 38 | 40 |
| 60 | 36 | 19 | 23 | 28 | 30 | 33 | **38** | 41 | 48 | 52 | 59 | 60 | 60 |
| 100 | 50 | 9 | 10 | 17 | 19 | 22 | 28 | 38 | 44 | **55** | 80 | 93 | 99 |

**The shallowest deficit that reaches the staging band:**

| N | staging rank | multiplier | ★ deficit | median rank at 0.70 | races |
|---|---|---|---|---|---|
| 20 | 12 | 0.94 | ★ **6%** | 14 | 20 |
| 40 | 24 | 0.92 | ★ **8%** | 26 | 20 |
| 60 | 36 | 0.95 | ★ **5%** | 38 | 20 |
| 100 | 50 | 0.92 | ★ **8%** | 55 | 20 |

### ★ AGAINST THE CLAMP

`racePlanner.js:98-99` — `minMult: 0.85`, a **15%** allowance. The required deficit is **5–8%**:
**about half of what the controller may already command, at every field size.**

★ **So nothing is being asked that the director cannot already do.** The shape the owner describes is
inside the shipped speed limits with room to spare, and the refusal is therefore **not** a physical
one.

### ★ WOULD IT LOOK NATURAL — the number, not a verdict

The addendum's own yardstick is that 2% is invisible and 15% is a racer who has given up. **The
measured requirement is 5–8% for thirty-four seconds** — between the two and nearer the invisible
end. **That is reported rather than judged, because it is what he judges.**

★ **One honest caveat about the control column.** At multiplier **1.00** the front racer already
drifts to rank 3, 2, 19 and 9 — he is an unsteered pack racer while the field is steered toward its
drawn ranks, so some of the fall is not the deficit's doing. The deficits above are therefore an
**upper bound** on what a real comebacker would need.

---

## 3 · ★ THE CLIMB IS THE EASY HALF — SO OUTCOME (c) DOES NOT STAND

The addendum says that if the CLIMB breaks the budget, outcome (c) stands and nothing is repaired.
**It does not.** After the release at 0.70, the same racer reverts to ordinary pack steering and has
only 0.30 of the race left:

| N | mult | rank at 0.70 | **median finish** | ★ places regained | best finish |
|---|---|---|---|---|---|
| 40 | 0.92 | 26 | **8** | ★ **+18** | 2 |
| 60 | 0.92 | 52 | **10** | ★ **+41** | 2 |
| 100 | 0.92 | 55 | **15** | ★ **+40** | 2 |
| 100 | 0.90 | 80 | **11** | ★ **+64** | 1 |

★ **A racer dropped to 52nd of 60 finishes tenth. One dropped to 80th of 100 finishes eleventh.** The
climb is not merely possible — it happens unforced, in less than a third of a race, with best
finishes of first and second across the board.

★ **AND NOTE WHAT HE IS CLIMBING TOWARD.** These racers revert to *their own drawn rank*, which is
not top-5 by design. A racer actually drawn into the top 5 would be steered there. **So this is a
floor on the climb, not a ceiling.**

---

## 4 · ★ THE MODELLING QUESTION — ESTABLISHED AT SOURCE, AND THE ADDENDUM'S INFERENCE IS WRONG

### What the gate can and cannot express

`heroCurveGenerator.js:205-207`:

```js
const span1 = (config.minJerkPeakFactor * Math.abs(anchorRank - peakRank)) / maxRankRate;
const span2 = (config.minJerkPeakFactor * Math.abs(peakRank  - finalRank)) / maxRankRate;
if (ap + span1 + span2 + 0.06 > bc) return null;
```

★ **`maxRankRate` is an INPUT and is never solved for.** Established by reading every use: it is
produced once, at `racerFeasibility` (`:137`), and thereafter only **consumed** — as a divisor at
`:205`, `:206`, `:226`, `:227` and as a ceiling at `:319` and `:333`. There is no branch, no search
and no clamp anywhere that asks "what rate would fit the time available".

★ **So the first half of the addendum is right: the gate can compute "how long at the given rate" and
compare, and it can only refuse.**

### ★ BUT THE REPAIR IT INFERS DOES NOT FOLLOW, AND THIS IS THE CORRECTION

`maxRankRate` is a **ceiling** — `(ahead + behind) / remaining`, where the counts come from the
`speedBudgetFrac` t-shift. So `span` is already a **minimum** duration. **Asking the same question
more gently cannot help: gentler is strictly slower.** "Ask whether the time available is enough at a
gentler rate" would return the same refusal.

### ★ WHERE THE ERROR ACTUALLY IS — located by putting the measurement beside the constant

At N=40 the race drops the racer **24 ranks in 0.55 of the race** — an effective **43.6 ranks per unit
progress**, against a `maxRankRate` of **45.88** measured on that same race. ★ **The rate in the model
is right. The racer really does descend at about the full budget.**

What the model then charges is `1.7 × 23 / 45.88 = 0.852` for that same leg — because
**`minJerkPeakFactor: 1.7`** prices the move as a **min-jerk excursion**, allocating time against the
curve's instantaneous PEAK slope so it never exceeds the ceiling.

★ **The owner is not describing a min-jerk excursion. He is describing a CONSTANT small deficit — a
shape whose peak rate EQUALS its average, and which therefore needs no 1.7 premium at all.** Applied
to both legs, that premium is the factor-of-two refusal, on its own.

★ **THAT IS A MODELLING ERROR — outcome (e) in substance — but not the one the addendum names.** The
gate is not failing to ask about a gentler rate; **it is pricing a shape the owner is not asking
for.** The repair is to let the gate express a sustained constant deficit, not to widen the rate and
not to ask the rate question differently.

★ **AND IT IS NOT ARITHMETIC STANDING IN FOR EVIDENCE.** The evidence is §2 and §3 — 960 races in
which the whole round trip happens comfortably inside one race. The constant above is only where that
measured gap is *located* in the code.

---

## 5 · CHECKS

★ **THE ARM IS REMOVED AND THE REMOVAL PROVED.** `client/src/modules/racePlanner.js` is
**byte-identical to HEAD** (`git diff HEAD -- client scripts` is empty) and a tracked-source grep for
`setPaceArm`, `_paceArm`, `paceActive` and `pace-deficit` returns **zero**.

| role | record | measured, arm removed | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | **matches** |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | **matches** |
| camera | `92ab7120a80af8ed` | `92ab7120a80af8ed` | **matches** |
| render | `5e5fdc3fb6656d68` | `5e5fdc3fb6656d68` | **matches** |

**Golden races: PASS.** ★ **It was also proved inert while PRESENT BUT UNARMED**, before any number
was taken from it — world fingerprint and golden races both clean with the arm in the file.

★ **`scripts/diag/pace-deficit.mjs` is DELETED with the arm.** It refuses to run without `setPaceArm`,
so keeping it would leave a harness that exits 2 on every invocation. Its method and its refusal
behaviour are in this report, which is the record.

**`git stash` was not used. `--no-verify` was not used. The sweep output stayed in the scratchpad.**

---

## 6 · WHAT IS OPEN, AND IT IS HIS

1. ★ **Is 5–8% for thirty-four seconds the picture he wants?** That is the one question the
   measurement cannot answer.
2. ★ **Should `feasibleTiming` be able to price a sustained constant deficit?** Today it prices every
   move as a min-jerk excursion and charges 1.7×. Nothing was changed.
3. **The parent brief, COMEBACK-BUDGET-1, never arrived** — if its step 1 asks for anything beyond
   this addendum, it has not been done.
