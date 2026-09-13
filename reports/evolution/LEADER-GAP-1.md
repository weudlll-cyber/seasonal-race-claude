# LEADER-GAP-1 — the leader's restraint really did halve, and the gap did not grow

**What this owns:** the owner's report of 2026-09-13, watching build `1180c8f1` — that the LEADER
pulls far away and finishes alone, the opposite of the race action the work was for. Six questions,
answered in order, each with its measurement or a statement that it was not measured.

**What it deliberately does not do:** it builds nothing, repairs nothing and recommends nothing. §6
states a trade; it does not choose it. **`verify` was run plain afterwards and nothing moved.**

**Instrument.** `C:/tmp/leader-gap.mjs` — outside the repository on purpose, because it has to run at
three commits and a file committed on the branch vanishes on checkout. It drives races through the
shared `raceDriver`, and per frame records the LEADER's two multiplicative terms: the SERVO
(`r.trajectoryMult`) and TRAFFIC (`brake`, rebuilt from the racer's own `avoidanceActive` /
`brakeMatchFactor` and the **exported** `computeEffectiveBrakeFactor` — never a second copy of the
rule, `raceCore.js:659-661`). Canvas widths come from the camera's own `visibleWorldPx`. Order is
`finishRank` (crossing order), never a post-race sort by `t`.

★ **A LIMIT OF THE INSTRUMENT, STATED RATHER THAN HIDDEN.** It runs the HARNESS camera on the default
camera config. The owner watched his own browser under `cfg 8aed1e`. Every figure in COURSE FRACTION
is independent of the camera; every figure in CANVAS WIDTHS is not, and is comparable ACROSS these
arms but not directly to his screen.

---

## 1 · ★ IT REPRODUCES

Quick Test roster (`current` name set), City Circuit, seed 3, 40 racers, track default duration:

| commit | winner | 2nd by `finishRank` | gap at the crossing | in widths |
|---|---|---|---|---|
| `b6d77637` master | **Flare** (#16) | Raven | 1.058% of the race | 0.540 |
| `57db4669` before tonight | **Flare** (#16) | Raven | 0.747% | 0.382 |
| `1180c8f1` what he watched | **Flare** (#16) | Apex | **0.607%** | **0.310** |

★ **THE RACE IS HIS**: `Flare` wins, as his screenshot says. His `#22` and `#1` are display numbers,
not roster indices — `Flare` is index 16 in the shipped name set. The finishing SECOND changed on
this branch (`Raven` → `Apex`), so tonight's work did alter the race behind the leader.

★ **BUT THE GAP IN HIS OWN RACE IS THE SMALLEST OF THE THREE**, not the largest.

---

## 2 · ★★ IS IT NEW? NO — THE GAP DID NOT GROW

**Method.** 160 races: two tracks (city-circuit closed, searound open), N ∈ {20, 40, 60, 100}, seeds
1–10, before (`57db4669`) and after (`1180c8f1`). P1→P2 measured at the instant the winner crosses.

| N | arm | gap med | gap MAX | widths med | ★ alone by >1 width |
|---|---|---|---|---|---|
| 20 | before | 0.366% | 2.046% | 0.171 | **0%** |
| 20 | after | 0.443% | ★ **1.181%** | 0.205 | **0%** |
| 40 | before | 0.397% | 2.304% | 0.193 | **0%** |
| 40 | after | 0.410% | ★ **0.994%** | 0.196 | **0%** |
| 60 | before | 0.498% | 2.392% | 0.243 | **0%** |
| 60 | after | ★ **0.284%** | ★ **1.411%** | 0.145 | **0%** |
| 100 | before | 0.330% | 2.952% | 0.168 | **0%** |
| 100 | after | 0.312% | 2.952% | 0.138 | **0%** |

★★ **THE MEDIAN MOVES BOTH WAYS — up at twenty racers (+21%), down at sixty (−43%) — AND THE MAXIMUM
IS SMALLER OR EQUAL IN EVERY CELL.** There is no systematic increase to find.

And what a viewer actually watches, the gap over the last 30% rather than at the line:

| N | arm | in-race med | p90 | MAX | widths med | widths MAX |
|---|---|---|---|---|---|---|
| 20 | before → after | 0.277% → 0.368% | 0.688 → 0.719 | 2.045 → **1.800** | 0.083 → 0.085 | 0.572 → 0.602 |
| 40 | before → after | 0.423% → **0.332%** | 1.125 → **0.769** | 2.303 → **1.462** | 0.088 → 0.086 | 0.761 → **0.506** |
| 60 | before → after | 0.331% → 0.380% | 0.739 → 0.844 | 2.566 → **2.072** | 0.083 → 0.089 | 0.750 → **0.721** |
| 100 | before → after | 0.317% → **0.306%** | 0.642 → **0.603** | 2.949 → 2.949 | 0.079 → 0.078 | 0.771 → 0.771 |

★ **IN CANVAS WIDTHS THE PICTURE IS UNCHANGED**: the median leader gap is 0.08 widths in both arms at
every field size, and the worst is the same or smaller.

---

## 3 · ★★ IS IT THE SERVO? THE MECHANISM IS REAL — THE DEPTH HALVED, THE FREQUENCY DID NOT

The leader's own terms over the last 30% of the race:

| N | arm | braked frames | pace med | ★ SERVO cost |
|---|---|---|---|---|
| 20 | before | 88.9% | 0.9499 | **−5.04%** |
| 20 | after | 100.0% | 0.9801 | ★ **−1.96%** |
| 40 | before | 88.7% | 0.9602 | −3.60% |
| 40 | after | 94.5% | 0.9800 | ★ **−1.77%** |
| 60 | before | 91.0% | 0.9818 | −2.42% |
| 60 | after | 85.9% | 0.9805 | −1.59% |
| 100 | before | 89.9% | 0.9801 | −1.94% |
| 100 | after | 88.5% | 0.9802 | −1.84% |

★★ **HE IS RIGHT ABOUT THE MECHANISM.** A leader who has reached his drawn place has a small error,
and the new response corrects a small error far less: the servo's average hold on him **falls from
−5.04% to −1.96% at twenty racers** and from −3.60% to −1.77% at forty. It barely moves at a hundred,
which is exactly where the response barely changed.

★ **BUT IT IS THE DEPTH, NOT THE FREQUENCY.** He is braked in ~89% of late frames in BOTH arms — the
brake is applied as often as ever and simply pulls less hard. The "braked in 72% of frames" figure
that prompted the question was measured on a leading COMEBACKER, a different racer in a different
situation, and it does not transfer.

★ **HIS OWN RACE IS AN OUTLIER, AND THAT MATTERS.** In seed 3 at `1180c8f1` the leader is braked in
only **20.1%** of late frames (0.9999 median, servo cost −0.30%) against 92.9% before. That is far
from the ~89% aggregate. **The race he watched really did have a nearly unrestrained leader — it is
simply not the normal picture**, and even in that race the finishing gap was smaller than before.

---

## 4 · ★ THE OTHER CANDIDATE IS EXCLUDED BY MEASUREMENT, NOT BY ASSUMPTION

| N | arm | leader avoiding | TRAFFIC cost |
|---|---|---|---|
| every cell | before | **0.0%** | **0.00%** |
| every cell | after | **0.0%** | **0.00%** |

★★ **THE LEADER NEVER AVOIDS ANYBODY, IN ALL 160 RACES, IN BOTH ARMS.** `brake` is exactly 1.0 for
him throughout: a racer at the front has nobody in front to queue behind, so the traffic term is not
merely small, it is inert.

★ **SO THE PARITY WAS NEVER HIS.** The +0.80% traffic against −0.77% servo measured once before
cannot describe the leader, because his traffic side is zero and always was. **His entire restraint
is the servo, and that is the term that halved.** The parity is not "gone" — it never applied here.

---

## 5 · ★ HOW OFTEN DOES IT HAPPEN? NOT ONCE IN 160 RACES

★★ **THE LEADER IS ALONE BY MORE THAN A CANVAS WIDTH IN 0 OF 160 RACES — in both arms.** The largest
gap at any crossing, either arm, any field size, is **0.774 canvas widths**; the median is 0.14–0.21.

**He watched two races. The aggregate says he was unlucky rather than that this is the new normal** —
with the important qualification in §3 that his particular race genuinely did have a leader running
at 0.9999 while the median race has one at 0.980.

**And it is not a change in who wins.** The winner's cast role is essentially the same in both arms
(sovereign-lead 9 → 12, pack 40 → 37, comebacker 31 → 31, n=80 each):

★ **ONE NUMBER IS HEAD-ONLY AND IS NOT A COMPARISON.** At `1180c8f1` the winner is the racer DRAWN
first in 33% of races. The same figure cannot be produced at `57db4669` because `getTargetRank` did
not exist before tonight, so the "0%" an earlier draft of this instrument printed for the before arm
was an artefact of the instrument, not a finding. It is excluded rather than reported.

---

## 6 · WHAT IT COSTS TO UNDO — THE TRADE, NOT A CHOICE

`ec7130a0` is the servo commit. Reverting it restores the response that divides by field size.

| | keep the servo (today) | revert to the taper alone |
|---|---|---|
| comebacker arrival pace | **1.019** | 1.042 |
| comebackers arriving at pace | **30%** | 20% |
| leader's servo restraint, N=20 | −1.96% | **−5.04%** |
| leader's servo restraint, N=40 | −1.77% | **−3.60%** |
| field-wide band-reach, N=20 | 83.9% | **91.3%** |
| field-wide band-reach, N=40 | 85.5% | **89.7%** |
| P1→P2 gap at the finish | no systematic difference (§2) | no systematic difference (§2) |

★ **REVERTING BUYS BACK THE LEADER'S RESTRAINT AND ~7 POINTS OF SMALL-FIELD BAND-REACH, AND COSTS
ABOUT TWO HUNDREDTHS OF ARRIVAL PACE AND TEN POINTS OF "ARRIVED AT PACE".** It does not measurably
change the P1→P2 gap in either direction, because that gap did not change in the first place.

**No recommendation is made.** The one thing the measurement does say is that if the goal is to make
the leader more restrained, the servo is the term that moves it — and the finishing gap is not the
symptom that would show it.
