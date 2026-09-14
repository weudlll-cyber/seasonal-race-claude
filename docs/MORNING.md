# MORNING SHEET — night of 2026-09-14 → 15

Branch `feat/gap-leader-brake`. **Nothing merged, nothing minted, no shipped source changed all
night.** Every variant below lives in an instrumented copy only.

Last updated: while Piece 1 was running.

---

## NEEDS YOUR WORD

*(filled in as the night produces them — see the bottom of this file for the live list)*

---

## THE STATE OF THE CHAIN

| piece | what it is | state |
|---|---|---|
| 1 | Finish SERVO-FAULT-1 — fairness on both arms, remaining guards, write-up | **RUNNING** |
| 2 | The narrow servo variants V1–V4 (the night's purpose) | open |
| 3 | The brake's rate window, 200 / 400 / 1000 ms | open |
| 4 | The big fairness run — **gated**, only if Piece 2 or 3 beats today | open |
| 5 | BREAKAWAY-FREQUENCY-1 recount on a fixed divisor | open |
| 6 | Branch inventory (read-only, nothing deleted) | open |

---

## WHAT IS ALREADY ESTABLISHED (built on, not re-litigated)

- The servo **delivers overall** — median delivered fraction 1.000 over 19,464,218 commanded
  racer-steps — but fails **the leader** (55.8% arrival) and **small corrections** (57.8% at 1–2 ranks
  off the drawn place), while **large, CLAMPED commands arrive** (93.3%, and that group is 100%
  clamped).
- The restart drivers are now **separated**: the ±0.0008 noise alone could have caused **86.1%** of
  all target rewrites (**95.0%** for the leader); the command's own movement only **15.2%**.
  A clamped command has its noise clipped away, stops moving, and the ease completes — which is
  exactly why the large corrections arrive.
- The blunt counterfactual (deliver every command) **arrives — 99.9%** — and is **not a candidate**:
  198/300 races change winner, 0/300 byte-identical, the rank error against the drawn plan gets
  **worse** (2.595 → 2.881), the largest single-step multiplier move goes **0.0117 → 0.2506 (21×, on
  300/300 races)**, all four fingerprints move, and a golden race moves.

---

## HAZARD FOR ANY CLEANUP

`C:/tmp/srv` holds **junctions** to the main tree's `node_modules` (root, client, server). A
recursive delete would delete **through** them and hollow out the real `node_modules`. Remove each
junction with `rmdir` (no `/S`) first, confirm with `dir /AL` that none remain, and only then remove
the worktree.

---

## DECISIONS I TOOK WITHOUT ASKING

*(the chain said to take the option that changes less and write it down — this is that list)*

- (none yet)
