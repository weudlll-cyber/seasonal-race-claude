# ARRIVAL-STEERED-AGAIN-1 — clause 2 comes back, and his reasoning holds

**Branch** `night/2026-09-12b` · **not merged** · **nothing minted** · **no golden race re-recorded**.

★ **NOTHING WAS BUILT. THIS IS A DELETION.** The owner said so and he is right: master carries
`strictness = isHero ? 1.0` and **zero** occurrences of any unsteered path. Steering a comebacker to
his drawn place is the behaviour that always existed; "unsteered inside his block" was an override
the arrival work added. This piece removes the override — **22 insertions, 81 deletions** — and
returns him to master's steering. The ceiling, which governs the approach, is untouched.

---

## 1 · ★★ CLAUSE 2 — WHY THIS EXISTS

The comebacker's peak gap to second while leading, in CANVAS WIDTHS. Same frozen instrument, same
seeds, same ten tracks, ~22–41 races where he actually led per cell.

| N | pre-shape baseline | unsteered + ceiling | ★ **STEERED + ceiling** | vs baseline |
|---|---|---|---|---|
| 20 | 0.107 | 0.357 (3.3×) | ★ **0.178** | 1.7× |
| 40 | 0.126 | 0.245 (1.9×) | ★ **0.141** | **1.1×** |
| 60 | 0.172 | 0.146 | ★ **0.146** | **0.85×** |
| 100 | 0.163 | 0.211 | ★ **0.163** | ★ **1.00× — exactly baseline** |

Worst case, same order: 1.223 / 1.375 / 0.727 / 0.631 against a baseline of 1.164 / 1.210 / 1.375 /
0.631.

★★ **AT A HUNDRED RACERS IT RETURNS TO THE PRE-SHAPE FIGURE IDENTICALLY** — 0.163 median, 0.481 p90,
0.631 max, every one the baseline number. That follows rather than surprises: the ceiling never binds
at N=100 (ARRIVAL-SOLVE-1 §3), so with the override gone the race IS the pre-shape race.

★ **THE REST OF THE FIELD STAYS CLEAN.** "Alone by more than a canvas width" at the finish, any racer:

| N | pre-shape | unsteered | ★ STEERED |
|---|---|---|---|
| 20 | 12% | 13% | 13% |
| 40 | 7% | 7% | ★ **3%** |
| 60 | 15% | 8% | ★ **8%** |
| 100 | 5% | 5% | 5% |

★ **WHAT IS NOT FULLY RESTORED:** twenty racers, 0.178 against 0.107 — **1.7×, down from 3.3× but not
back**. Stated rather than averaged into the pooled figure.

---

## 2 · ★★ HIS REASONING, MEASURED

He argued the brake would take hold FASTER because there is less to shed. **Both arms are the same
code on the same seeds** — the reference is this build with the ceiling turned off, which is exactly
"an untapered arrival with the brake". N=40, ten tracks, 41 comebackers each.

| arm | arrived at | ★ on screen | ★ sheds the overspeed in | ★ brake depth | needed NO brake |
|---|---|---|---|---|---|
| ceiling OFF — untapered | 1.0937 | 79.9 px/s | **1 392 ms** | −9.97% | 7% |
| ★ **ceiling ON — shipped** | **1.0328** | ★ **28.0 px/s** | ★ **992 ms** | −9.07% | ★ **12%** |

★★ **HIS ARGUMENT HOLDS: the overspeed is shed 29% faster** (992 ms against 1 392 ms), and **12% of
comebackers now need no brake at all** rather than 7%.

★ **TWO REFINEMENTS TO THE REASONING, because the numbers are more specific than the argument was.**
The overspeed to shed is about **a third**, not a half — 0.033 against 0.094. But the DEPTH the brake
eventually reaches is nearly unchanged, −9.07% against −9.97%, because depth is set by **how far past
his place he drifts**, not by how fast he arrived. So *"it takes hold faster"* is right and measured;
*"there is half as much to shed"* understates the overspeed gap and overstates the depth gap.

---

## 3 · WHAT MUST NOT REGRESS — AND ONE THING THAT DID

### ★ The arrival is untouched: **no regression**

| N | ARRIVAL-SOLVE-1 | ★ now | on screen |
|---|---|---|---|
| 20 | 1.033 | **1.033** | 28 px/s |
| 40 | 1.051 | **1.051** | 44 px/s |
| 60 | 1.037 | **1.037** | 32 px/s |
| 100 | 1.048 | **1.048** | 41 px/s |

**Identical to four decimal places**, which follows: the ceiling governs the approach and this piece
touched only what happens after. Against 85 px/s untapered, still at or below "halves the rush".

### ★ Band-reach: **MET**, 1 200 races per arm

| N | shipped world | ★ now | delta | gate margin |
|---|---|---|---|---|
| 20 | 91.3% | **91.7%** | +0.4 pp | 21.7 pp |
| 40 | 89.7% | **89.6%** | −0.1 pp | 19.6 pp |
| 60 | 86.9% | **86.8%** | −0.1 pp | 16.8 pp |
| 100 | 88.9% | **88.9%** | 0.0 pp | 18.9 pp |

**No field size approaches the 70% gate.**

### ★★ Two figures from the last report that DO NOT SURVIVE, corrected here

★ **HOLM IS 0 / 2 / 3 / 7 — exactly today's shipped world, NOT better.** ARRIVAL-SOLVE-1 reported
0/1/3/5 and called it better than the shipped game. **That improvement came from the override**, and
removing the override returns Holm to master's numbers. The claim is withdrawn.

★ **THE BLOCK RATE FALLS ~3 POINTS.** Pooled **85.0%** (n=717) against the unsteered arm's 87.9% —
by field size 88.9 / 86.5 / 88.6 / 74.2 against 93.7 / 89.9 / 89.8 / 76.1. **Still above the 84%
baseline, so clause 3 holds**, but steering him to his EXACT drawn rank is stricter than letting him
settle anywhere inside the block, and some of those corrections carry him out of the top five.
**That is the price of clause 2 and it is stated beside the win, not under it.**

Drift after arrival: median **1 / 0 / 0 / 0** places, worst 7. The other roles are untouched — nothing
outside `heldFree` was changed.

---

## 4 · SABOTAGE

Both bite, on `arrivalShape.test.js` (10 tests):

- **(a) restore the unsteered path** (`if (arrived) strictness = 0`): **exactly the one test** that
  says he is braked back toward his drawn place goes red — the tripled gap's mechanism returns.
- **(b) remove the ceiling** (`arrivalCeiling` returns `maxMult`): **5 red**, including both
  servo-level tests and the observation that records where it bound — the 1.10 arrival comes back,
  and §2's reference arm measures it at 1.0937.

---

## 5 · THE NEW VALUES — REPORTED, NOT MINTED

`verify` plain: **PASS 25 · FAIL 5.** Red: the world, camera and render fingerprints (**by design** —
the race changed), the golden parity pins inside `client-suite`, and `check-runin-frame` on
`luger-hill` at 100, **carried forward from `983d9201` and not this piece's**.

★ `golden-races` and `script-suite` **PASS** — those races are 12 and 6 racers, below
`STAGED_COMEBACK.MIN_FIELD` (20), so no comebacker is cast and the shape never fires there.

**World fingerprint `b35cf477c09a1116`.** Per track: city-circuit `e7892d5e2af7` · dirt-oval
`fcc5ff32690e` · garden-path `1547a1c74ee7` · ice-track `a7479a60f6e0` · luger-hill `40b3708513fa` ·
mountainstreet `4d6806ad7360` · river-run `1c1b63b9b65b` · searound `51b0a1eb844c` · seatrack
`b18640daf688` · space-sprint `a6e33ec01973`.

**Nothing is minted and no golden race is re-recorded.**
