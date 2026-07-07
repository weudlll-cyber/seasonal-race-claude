# PROBE-RECOVERY — verdict: derived gate + structural ceilings

**HEAD `25eee6d`** (= d0c4af5 + the naturalness-cap fix, which is on the gate path — this probe runs NO
gate, so behaviour is identical to d0c4af5). Anchor `pre/probe-recovery`. Read-only, sim-only, OUTCOME
untouched, 147/147 tests green. Winner rank@0.50/0.55 tracking already existed (pulk-action-6) — no
harness build. 100 races × 4 tracks, winning cell N8/D0.6, no position-gate.

## Derived thresholds (P(final ≤ P5) by winner rank at 0.55)

| track | gate_high (≥90% recoverable) | gate_low (recovery <50%) | natural landing mean/worst | P(≤P5) at 51–60 |
|---|--:|--:|---|--:|
| garden-path (fair control) | 20 | none (recovers everywhere) | 17 / 40 | — (never lands there) |
| river-run | 30 | 51 | 24 / 56 | 29% |
| searound | 15 | 31 | 17 / 40 | — (40-racer; 31–40 = 44%) |
| luger-hill | 15 | 51 | **29 / 60** | **29%** |

## Verdict

**A single data-derived global gate EXISTS: gate_high ≈ 15, gate_low ≈ 31** (rank ≤15 → no boost, keep
front unpredictable; 16–30 → half; >31 → full). This is the min-across-tracks envelope and it does NOT
disturb the fair control: garden-path recovers from *everywhere* (64% even at rank 31–40, never <50%),
so its winners rarely need the boost and the gate only adds a harmless floor. river-run and searound
benefit (their deep winners get washed forward before 0.55).

**But two genuine per-track limits, proven by the curves — not tuning misses:**

1. **luger-hill has a STRUCTURAL RECOVERY CEILING.** Its winner lands at rank **51–60 in 21% of races**
   (natural worst 60), and OUTCOME recovers only **29%** from there (mean final 11.4). The PULK wash
   lifts a deep racer only ~3–5 ranks (measured), nowhere near the ~25 needed to pull a rank-55 winner
   into the recoverable zone. On a long open downhill the winner physically cannot climb from the back in
   the OUTCOME window — **no PULK gate can save this fraction.** luger-hill is a real geometry limit.

2. **searound has WEAKER OUTCOME recovery (geometry).** At rank 31–40 it recovers only **44%** vs
   garden-path's 64% at the same ranks — OUTCOME reels in less effectively here. Its winner lands 31–40
   in 16% of races. The gate (full boost > rank 31) helps at the margin, but searound's OUTCOME ceiling
   means it will stay borderline. Its start-row geometry is a separate, long-known issue.

**river-run is the recoverable one** of the three: recovers ≥90% to rank 30, 70–80% to rank 50, only
collapsing at 51–60 (7% of races). The global gate (boost when deep) should push it fair.

## Bottom line
- One global gate (high 15 / low 31) covers **river-run** cleanly and **helps searound**, without touching
  the fair control. This is the data-derived answer to "what thresholds."
- **luger-hill is a structural ceiling**, not a threshold problem: the winner lands too deep too often and
  the downhill can't be climbed back. Honest recommendation: accept it as a per-track exception, or lower
  its front-pool/linger so the PULK contest scrambles the winner less (attack the *cause* — the deep
  landing — not the recovery).
- The fair tracks are fair **because** OUTCOME reels them in from far back (garden-path 64% even at rank
  40) — confirming a gentle gate won't disturb them.
