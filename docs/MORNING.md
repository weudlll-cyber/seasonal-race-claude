# MORNING SHEET — night of 2026-09-14 → 15

Branch `feat/gap-leader-brake`. **Nothing merged, nothing minted, no shipped source changed all
night.** Every variant lives in an instrumented copy (`C:/tmp/srv`) that was proved byte-inert when
switched off before any number was read from it.

---

## ★ NEEDS YOUR WORD

1. **The servo CAN be fixed narrowly, and the narrow fix is invisible.** `V1` — the restart decision
   ignores the noise, **no new number** — takes the leader's arrival from **55.8% to 79.7%**, small
   corrections from 57.8% to 74.1%, halves the wrong-side share, cuts the overshoot, and improves the
   in-window lead at **both** the median (81.4 → 70.9 px) **and** the maximum (244.4 → 239.3 px), at
   **1.01×** the largest single-step multiplier move. For contrast the blunt "deliver everything" arm
   sat at **21.3×**. **It is a full re-baseline** (0/300 byte-identical, 190/300 winner changes, all
   four fingerprints). → [SERVO-NARROW-1](../reports/night/SERVO-NARROW-1.md)
2. **Applied literally, V1 misses the bar by two hairs** — a rank-error point estimate +0.006 worse
   with **t = 0.19** (indistinguishable from zero; its exact-place hits go *up*), and a largest
   single-step move **0.8%** larger. Whether that is a fair price for +24 points of leader arrival is
   a judgement, not a measurement, so it is left to you.
3. **`feat/remove-prestaging-comebacker` is the other branch carrying product code** and removes a
   mechanism. → [BRANCH-INVENTORY-1](../reports/night/BRANCH-INVENTORY-1.md)
4. **Breakaways are rarer again on the third reading** — see below; this is the number you have now
   been told three different values for.

---

## THE STATE OF THE CHAIN

| piece | what it is | state |
|---|---|---|
| 1 | SERVO-FAULT-1 — why the leader and the fine corrections fail; the blunt counterfactual's cost | **DONE**, pushed |
| 2 | The narrow variants V1–V4 (the night's purpose) | **DONE**, pushed |
| 3 | The brake's rate window, 200 / 400 / 1000 ms | **RUNNING** |
| 4 | The big fairness run — **gated** on Piece 2 or 3 beating today | pending Piece 3 |
| 5 | BREAKAWAY-FREQUENCY-1 recount on a fixed divisor | **measured**, write-up pending |
| 6 | Branch inventory | **DONE**, pushed |

---

## WHAT WAS FOUND

**Piece 1 — the mechanism, settled.** The ±0.0008 noise alone could have caused **86.1%** of all
target rewrites (**95.0%** for the leader); the command's own movement only 15.2%. The "small ask is
near the threshold" idea is **refuted** — a 1–2-rank ask is 50× the threshold. The separating variable
is **the clamp**: racers 16+ ranks off their place are **100% pinned**, which clips the noise away so
their command stops moving and arrives (94.6%); racers 1–2 ranks off are **1.0% clamped** (56.8%). The
leader is **0% clamped while leading** and his command has reversed sign, so he is on the wrong side
of natural speed on 57.6% of those steps.
→ [SERVO-FAULT-1](../reports/night/SERVO-FAULT-1.md)

**Piece 1 — the blunt counterfactual is not a candidate.** It arrives (69.3% → 99.9%) but changes the
winner in 198/300 races, moves all four fingerprints, reddens a golden race, makes the rank error the
servo exists to reduce **worse** (2.595 → 2.881), and is visible at 21× on every race. Its four red
parity tests are a **moved input, not a broken guarantee** — real and sim both change and both land on
`fe3f4861`; what fails is the pinned winner.

**Piece 1 — the brake would still have work.** With the servo arriving it fires in 89/300 races
instead of 137/300, but takes **−81.5 px (−25.2%)** off the worst race against **−16.8 px (−6.9%)**
today.

**Piece 6 — two merge hazards.** `report/brake-census-1` adds a report with **no index line**, so
merging it alone reddens `check-index` on master; `night/2026-09-14-history` is **13 commits behind**
and carries its own `docs/MORNING.md`.

---

## DECISIONS I TOOK WITHOUT ASKING

- **V2's cadence.** The plan carries the re-roll *transition duration*, not the re-roll *interval*
  (which lives in `raceCore.js` and is never handed to the planner). I used the field the plan already
  has, because it changes less than threading a new one through. V2 is therefore a faithful
  "slow-varying noise" arm but not literally the re-roll cadence. Named in the report.
- **The fairness instrument was killed, not shortened.** `scripts/sim-fairness.mjs` at
  `--races=5 --racers=40 --track-defaults` burned **925 s of CPU with zero output** and was stopped so
  the night's main work could run. It is reported as **not run** rather than presented as a short run.
- **Piece 5's scope.** The whole-race maximum is taken only while the whole field is still racing
  (`finishedCount === 0`), so a straggler pair after the leaders have finished cannot masquerade as a
  lead. This is why my p90 differs slightly from the previous recount's while the median and the
  maximum reproduce it exactly.

---

## HAZARD FOR ANY CLEANUP

`C:/tmp/srv` holds **junctions** to the main tree's `node_modules` (root, `client`, `server`). A
recursive delete would delete **through** them and hollow out the real `node_modules`. Remove each
junction with `rmdir` (no `/S`) first, confirm with `dir /AL` that none remain, and only then remove
the worktree.
