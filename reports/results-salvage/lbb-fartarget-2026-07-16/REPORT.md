# LBB-FARTARGET — why is the dodge target ever far away?

Read-only analysis of the existing `results/lbb-dodge-speed-2026-07-16/raw.json` (seed 1, mountainstreet/
boarder, `fix/lbb-launch-ramp`; fingerprint `62f7ebeb37880765`, inert). No new capture needed — the dump has
`target`, `physIn`, `leader` (index per frame), `branch`, `velFinal`, `capBound`, `effVLatMax`, and leader
positions are recoverable by cross-lookup. Nothing committed. No fix.

**Answer, up front: the far target does not exist.** Over 4156 pass frames the largest `|target − physicalY|`
is **0.1899** — the arithmetic bound `offsetY + |dY| ≤ 0.19` exactly, to four decimals. Zero frames exceed
0.19; zero approach 0.285. Per the brief's Step 1, the 0.285 premise is void and the far-target hunt is dead.
The 43° comes from a spring distance that legitimately reaches ~0.19, and `v = 0.095 × distance` holds
almost exactly. Plan-Claude's 17° was wrong because it assumed the distance is `offsetY` (0.095) and **dropped
the `dY` term** — the trailer starts on the far side of the leader, so the real distance is up to 2× that.

## Step 1 — the distribution of `|target − physicalY|` over pass frames (the spring distance)

| statistic | value |
|---|---:|
| median | 0.0126 |
| p90 | 0.0732 |
| p99 | 0.1679 |
| **max** | **0.1899** |
| frames > 0.19 | **0** |
| frames > 0.285 | **0** |

Nothing exceeds 0.19. The far target the 43° was attributed to **is not in the data**. (This being the
decisive check, the rest is the "why is it *not* far, and where does 43° come from" that Step 4 answers.)

## Step 2/3 — decomposition of the 12 farthest targets (all ≈ 0.19)

`leaderPY` = leader's physicalY the gate saw (start-of-frame). `dY = trailer − leader`. `offsetY = |target −
leaderPY|`. Every far target decomposes exactly as `offsetY (0.0950) + |dY| (≈0.095)`.

| frame | racer | leader | trailer | leaderPY | dY | offsetY | dir | target | \|tgt−phys\| |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1915 | 14 | 17 | −0.1320 | −0.2269 | +0.0949 | 0.0950 | −1 | −0.3219 | 0.1899 |
| 2084 | 26 | 16 | −0.3199 | −0.4146 | +0.0948 | 0.0950 | −1 | −0.5096 | 0.1898 |
| 1544 | 4 | 33 | −0.1071 | −0.2018 | +0.0947 | 0.0950 | −1 | −0.2968 | 0.1897 |
| 2009 | 14 | 8 | −0.3117 | −0.4063 | +0.0946 | 0.0950 | −1 | −0.5013 | 0.1896 |
| 1285 | 7 | 37 | +0.4252 | +0.5193 | −0.0941 | 0.0950 | +1 | +0.6143 | 0.1891 |
| 1701 | 9 | 34 | +0.0952 | +0.1893 | −0.0940 | 0.0950 | +1 | +0.2843 | 0.1890 |
| 1469 | 20 | 2 | +0.2565 | +0.3502 | −0.0937 | 0.0950 | +1 | +0.4452 | 0.1887 |
| 1338 | 13 | 39 | −0.0737 | +0.0183 | −0.0921 | 0.0950 | +1 | +0.1133 | 0.1871 |
| 2996 | 36 | 23 | +0.1946 | +0.2863 | −0.0916 | 0.0950 | +1 | +0.3813 | 0.1866 |
| 1198 | 20 | 23 | +0.2465 | +0.3373 | −0.0908 | 0.0950 | +1 | +0.4323 | 0.1858 |

**Which term is large? None is anomalous.** `offsetY` is the constant **0.0950**. The distance is large only
when **`dY` and `dir` have opposite signs** — the trailer sits ~one contact-width on the OPPOSITE side of the
leader from where it is dodging (e.g. frame 1915: trailer +0.095 above leader, dodging `dir=−1` down), so it
must cross its own `|dY|` PLUS the `offsetY` on the far side. `|dir·offsetY − dY| = offsetY + |dY| → 0.19`.
This is exactly the arithmetic in the brief, reached at its ceiling, not exceeded.

## Step 3 — the candidates, tested against the first 6 dodges (all dead)

| dodge@ | racer | frames | distinct leaders | leader switches | dir flips | offsetY min/med/max |
|---|---:|---:|---:|---:|---:|---:|
| 91 | 25 | 91..113 | 2 | 1 | 0 | 0.0950/0.0950/0.0950 |
| 251 | 30 | 251..394 | 1 | 0 | 0 | 0.0484/0.0867/0.0950 |
| 442 | 20 | 442..537 | 1 | 0 | 0 | 0.0950/0.0950/0.0950 |
| 657 | 7 | 657..682 | 1 | 0 | 0 | 0.0950/0.0950/0.0950 |
| 769 | 20 | 769..784 | 1 | 0 | 0 | 0.0950/0.0950/0.0950 |
| 769 | 33 | 769..836 | 1 | 0 | 0 | 0.0950/0.0950/0.0950 |

- **Leader switch — dead.** Five of six dodges have ONE leader and ZERO switches; one has two leaders and a
  single switch. The leader-switching story does not happen (the Owner was right).
- **Side flip — dead.** ZERO dir flips across all six dodges. (A flip would have re-aimed the target by
  `2·offsetY ≈ 0.19`, but no flip occurs, and a re-aim is not a distance regardless.)
- **`offsetY` — constant 0.0950**, i.e. `softSteeringClearancePct = 0` and `lbHalfSpan = 0.095` exactly as
  the derivation assumed. (Dodge 251 dips below only because the geometry there gives `|target − leaderPY|`
  slightly under the full span on some frames; its max is still 0.0950.)
- **Stale target — not present.** Every far target equals fresh geometry `leaderPY + dir·offsetY` to four
  decimals (Step 2/3 table), so nothing is being carried from an earlier frame.
- **Not the pass path — no.** All far-target frames are `branch = pass`; these are pass targets, not §4a/§4b.

## Step 4 — the actual relationship: `velFinal` vs `(target − physicalY)`

Over the pass frames, the ratio `velFinal / (target − physIn)`:

| population | n | median | p10 | p90 |
|---|---:|---:|---:|---:|
| all pass frames | 4121 | **0.0965** | 0.0871 | 0.0978 |
| uncapped only | 4000 | **0.0965** | 0.0921 | 0.0978 |

The predicted steady-state is `v = 0.19 × 0.5 × distance = 0.095 × distance`. **The measured ratio is 0.0965 —
the relationship holds almost exactly.** So the lateral speed IS target-distance-driven, precisely as the
proportional-spring model says; nothing exotic intervenes.

**The 43° frame itself (racer 33, frame 771):** target −0.1690, physIn −0.0044, **distance −0.1646**,
`velFinal −0.01496`, **ratio 0.0909**, cap not bound, leader 6 at −0.0740, `dY 0.0696`, `offsetY 0.0950`. So
distance = `offsetY 0.095 + dY 0.070 = 0.165`; `v = 0.091 × 0.165 = 0.0150` physicalY = 2.24 px; forward
2.40 px → `atan(2.24 / 2.40) = 43°`. Every step is inside the bound.

## The plain finding (no interpretation beyond the tables)

- The dodge target is **never far**: max `|target − physicalY| = 0.19`, the arithmetic ceiling, 0 exceedances.
- The 43° is produced by a spring distance of ~0.16–0.19 — **within** that ceiling — and `v ≈ 0.095 × distance`
  holds to within a few percent.
- The distance reaches ~0.19 (double the `offsetY` Plan-Claude assumed) whenever the trailer is dodging to the
  **opposite side of the leader from where it currently sits**, so the crossing is `offsetY + |dY|`.
- Leader-switch, side-flip, stale-target, wrong-path, and non-zero clearance are all **absent** in the data.

## What I did NOT check (marked)

- **One seed / one race / one track.** The 0.19 ceiling and the 0.0965 ratio are from this run; a different
  seed/track (different `offsetY` and `brakeSameLaneY`) would shift the numeric ceiling but not the
  `offsetY + |dY|` structure.
- **The `dY`-opposes-`dir` labelling** in my Step 2/3 script printed the sign test inverted; I read the actual
  `dY`/`dir` sign columns directly (they are opposite at every far frame), so the conclusion is from the raw
  values, not the derived flag.
- **The onset-flicker frames** (short pass bursts, from LBB-JERK-PROOF) are included in the 4156 pass frames
  but not separated here; their targets obey the same 0.19 ceiling (they are in the distribution).
