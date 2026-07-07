# PULK-action-6 — owner bonus profile (chaos 2.0 / pulk 0 / post 1.0) + winner journey

**Harness HEAD `76f7f18`** (feat/race-action), anchor `pre/pulk-action-6` @ `b76a6f1`. Read-only, sim-only,
OUTCOME untouched, default byte-identical, 147/147 tests green, naturalness +8.1% (1.081) on every track.
Added winner-rank samples at 0.25 / 0.50 (alongside 0.55 / finish). Cell N8/D0.6 unchanged; bonuses
areaBonusEarly=2.0 / areaBonusPulk=0 / areaBonusPost=1.0, rowBonus 1/0/1. 10 tracks × 30 races.

## Verdict: 7/10 fair+action. Gains city-circuit vs the 6/10 baseline. searound / luger-hill / river-run still fail.

## Winner journey — assigned-winner on-track rank, mean(worst) at each stage

| track | 0.25 | 0.50 | 0.55 | finish | fair? |
|---|---|---|---|---|:--:|
| garden-path | 15(33) | 17(38) | 16(38) | **2(13)** | ✅ |
| dirt-oval | 11(35) | 13(36) | 13(38) | **2(10)** | ✅ |
| ice-track | 16(36) | 17(38) | 17(38) | **2(7)** | ✅ |
| city-circuit | 14(38) | 18(34) | 18(33) | **2(7)** | ✅ |
| mountainstreet | 16(40) | 23(46) | 23(47) | **3(13)** | ✅ |
| seatrack | 18(44) | 25(56) | 25(56) | **3(13)** | ✅ |
| space-sprint | 17(52) | 24(55) | 23(53) | **6(42)** | ✅ |
| searound | 17(38) | 18(39) | 18(38) | 4(**17**) | ❌ |
| river-run | 11(47) | 16(52) | 17(53) | 2(**8**) | ❌ |
| luger-hill | 28(56) | 32(59) | 32(58) | 5(**21**) | ❌ |

**What the journey shows (the owner's key question):**
- The +6% early cushion does **NOT** keep the winner high on the hard tracks. On searound he is already
  rank 17 (worst 38) at 0.25; on luger-hill rank **28 (worst 56)** at 0.25 — deep **before** the contest.
  On a fast/spread geometry a +6% chaos bonus over one quarter-race can't overcome a bad draw / front-row
  start. So the stranding on those tracks is a **bad-draw-at-0.25** problem, not a PULK-scramble problem.
- On the tracks that pass, the PULK contest still pushes him **~5–7 deeper** (e.g. mountainstreet 16→23,
  seatrack 18→25, space-sprint 17→24) — but OUTCOME reels the mean back to P2–6. It's the **worst-case
  draw** (parenthesised) that strands: worst-finish 17 (searound), 21 (luger-hill), 8 (river-run).

## Action / fairness / naturalness / unpredictability

| track | HELD ov | dP1 | band-reach | worst 0.55→fin | corrP1 | srow Holm | peak |
|---|--:|--:|---|---|--:|--:|--:|
| dirt-oval | 19.5 | 5.0 | 84/87/82 | 38→1 | 0.20 | 0.76 | 1.081 |
| ice-track | 18.1 | 4.5 | 85/87/82 | 38→3 | 0.16 | 0.76 | 1.081 |
| city-circuit | 17.0 | 4.4 | 87/86/81 | 33→4 | 0.20 | 0.52 | 1.081 |
| garden-path | 15.1 | 5.1 | 81/88/81 | 38→1 | 0.23 | 0.77 | 1.081 |
| space-sprint | 10.6 | 5.0 | 79/78/78/82 | 53→1 | 0.20 | 0.52 | 1.081 |
| river-run | 10.6 | 4.6 | 78/84/79/79 | 53→8 | 0.25 | 0.30 | 1.081 |
| mountainstreet | 10.2 | 4.8 | 77/87/80/82 | 47→3 | 0.21 | 0.27 | 1.081 |
| seatrack | 10.1 | 4.5 | 81/84/79/83 | 56→3 | 0.19 | 0.52 | 1.081 |
| luger-hill | 10.1 | 4.1 | 69/86/80/78 | 58→14 | 0.13 | 0.86 | 1.081 |
| searound | 13.5 | 4.1 | 76/83/77 | 38→7 | 0.12 | 0.24 | 1.081 |

- **PULK action unchanged / high** everywhere (held 10–19.5, dP1 ≥4) — bonuses stay 0 in PULK. ✅
- **Naturalness +8.1% on all 10.** ✅
- **post=1.0 did NOT hurt fairness**: all 6 previously-passing tracks still pass, and city-circuit now
  passes (33→4). Halving post (vs 2.0) is safe here — the stronger early=2.0 compensates, and OUTCOME
  does less last-half correction (better feel). **None of the 7 broke.**
- **corrP1 cost of the +6% early cushion**: unpredictability rose to **0.20–0.25** (vs ~0.05–0.09 at
  early=0/1.0). Still low (<0.3) but a real, mild tradeoff — the assigned winner leads PULK a bit more
  with the strong early bonus. river-run highest (0.25).

## Honest comparison: chaos=2.0/post=1.0 vs earlier early=1.0/post=2.0

**Mixed — not clearly better.** Both profiles yield **7/10** (both fix city-circuit, neither fixes
searound/luger-hill/river-run). chaos=2.0 costs more unpredictability (corrP1 0.20–0.25 vs 0.05–0.09);
post=1.0 is a nice gentler choice with no fairness loss. The three hold-outs are **not** an early-bonus
problem — the journey proves the winner is already deep at 0.25 on searound/luger-hill regardless of the
cushion. They need **track-specific handling** (gentler front-pool/linger on luger-hill; searound's known
geometry). A likely sweet spot to try next: **early=1.0 / post=1.0** (recovers city-circuit, keeps corrP1
low, gentle post) — untested here.
