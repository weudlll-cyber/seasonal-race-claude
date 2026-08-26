# ALONG-RESIDUAL-1 — the residual is EPISODES, it is one track, and the margin makes three quarters of it

**Measure only. No mechanism, no key, no build.** Corpus: ten tracks × ten races, `LEADER_ZOOM`
mid-race frames, shipped settings, browser Quick-Test path with the camera seed derived from the race
seed.

**WHAT WAS NOT RUN.** No browser gate, no client suite, no fingerprint run — nothing outside
`scripts/diag/` and this report changed, so none of them could return a different answer.

---

## FIRST, THERE ARE TWO RESIDUALS AND THEY ARE NOT THE SAME SIZE

The brief names 830 frames. That number is real and this piece reproduces it **exactly** — but it is
not the number the shipped director declines on, and the difference is the most useful thing here.

`lateralAdmissibleForBody` is called by the director **with the shipped 90 px margin**. The 830 came
from the same solve with **no margin at all**. Both are honest; they answer different questions.

| track | shipped margin (90) | bare box (0) | **the margin's share** |
|---|---|---|---|
| **space-sprint** | **2,048** | 207 | **1,841** |
| seatrack | 256 | 109 | 147 |
| dirt-oval | 247 | 136 | 111 |
| city-circuit | 209 | 115 | 94 |
| searound | 149 | 78 | 71 |
| mountainstreet | 148 | 56 | 92 |
| ice-track | 114 | 63 | 51 |
| garden-path | 84 | 44 | 40 |
| luger-hill | 47 | 22 | 25 |
| river-run | 28 | **0** | 28 |
| **POOLED** | **3,330** | **830** | **2,500** |

**The bare-box column is 830, and matches LEADER-LATERAL-BUILD-1 track by track** — 115 / 136 / 44 /
63 / 22 / 56 / 0 / 78 / 109 / 207. That agreement is the cross-check that this probe measures the
same thing the earlier one did, and it is why the rest of the numbers can be trusted.

**THREE QUARTERS OF WHAT THE DIRECTOR DECLINES IS THE MARGIN, NOT THE GEOMETRY.** 2,500 of 3,330
frames are ones where a sideways move *would* fit his body in the frame — just not with 90 px to
spare. **And 1,841 of those 2,500 are space-sprint alone**, whose sprite is the largest in the game.

That is a design consequence nobody had seen: the margin that makes the lateral rule *work* — it was
the difference between removing 8 clipped frames and removing 545 — is also what makes most of the
residual it leaves behind. **The same number does both jobs, and the second job is invisible.**

## (a) WHERE AND WHEN

| track | residual (shipped) | u median | u p10 | u p90 | corridors on screen now |
|---|---|---|---|---|---|
| space-sprint | **2,048** | 0.46 | 0.17 | 0.66 | 1.33 |
| seatrack | 256 | 0.51 | 0.18 | 0.90 | 1.16 |
| dirt-oval | 247 | 0.62 | 0.22 | 0.89 | 1.48 |
| city-circuit | 209 | 0.70 | 0.22 | 0.88 | 1.35 |
| searound | 149 | 0.75 | 0.21 | 0.90 | 2.03 |
| mountainstreet | 148 | 0.66 | 0.42 | 0.86 | 1.05 |
| ice-track | 114 | 0.61 | 0.18 | 0.79 | 1.27 |
| garden-path | 84 | 0.78 | 0.27 | 0.92 | 1.33 |
| luger-hill | 47 | 0.72 | 0.66 | 0.81 | 1.22 |
| river-run | 28 | 0.44 | 0.43 | 0.79 | 1.02 |

**It is one track.** space-sprint is 61% of the whole residual and 8× the next worst. **And it is not
the endgame** — the pooled `u` median is **0.498**, dead middle of the race, with space-sprint's own
p90 at 0.66. This is not a closing-phase problem that the run-in work could have been extended to
cover; it is spread through the middle of a normal race.

## (b) HOW MUCH WIDTH WOULD FIT HIM

Solved exactly per frame, not searched: widening by `k` scales every offset from the frame centre by
`1/k`, so the smallest sufficient `k` is the largest corner offset measured in half-frames.

| | median | p75 | p95 | worst |
|---|---|---|---|---|
| **width factor** | **1.21** | 1.52 | 2.46 | **3.64** |

**In the unit he has already rejected a change in** — corridors of road across the screen — the median
frame would go from **1.33 corridors to 1.61**, and the p95 frame from 1.33 to 3.27.

## (c) WHAT THAT WIDTH WOULD COST THE SHOT HE JUST ACCEPTED

This is the part that decides whether a zoom-side rule is worth designing, and the answer is
uncomfortable.

**LEADER-CORRIDORS-DEFAULT-1 swept `visibleCorridors` and found no setting reaches zero clipping.**
The shot he accepted shows about **1.33 corridors** of road on the median frame. Serving the median
residual frame means **1.61**; serving 95% of them means **3.27** — two and a half times the width of
the picture he has just approved, on a frame in the middle of the race.

**And it would not be a constant widening.** These frames are 2.4% of `LEADER_ZOOM`, so a guarantee
that widened for them would open the shot *only during them* — a zoom excursion in the middle of a
race, in a state that has just been through three rounds of work to make its motion calm. **The
mechanism that fixes the residual is, by construction, the thing that reintroduces motion.**

## (d) EPISODES OR SCATTERED FRAMES — episodes, decisively

| | value |
|---|---|
| episodes | **150** |
| median length | **18 frames (0.30 s)** |
| p95 length | 62 frames (1.03 s) |
| longest | **107 frames (1.78 s)** |
| single-frame episodes | **1 of 150 (0.7%)** |
| episodes ≥ 12 frames (0.2 s) | **111 of 150 (74%)** |

**This is not noise.** Essentially every residual frame belongs to a run of frames long enough to see
— three quarters of the episodes last at least a fifth of a second, and the worst is nearly two
seconds of a leader who is not whole in frame. **A mechanism that fixed it would be fixing something
visible**, which is the one argument in favour of doing anything here at all.

## THE HONEST SUMMARY

- It is **one track** (space-sprint, 61%), in the **middle of the race** (u ≈ 0.5), in **episodes of
  about a third of a second**.
- **Three quarters of it is the margin**, not unreachable geometry. The true no-lateral-move-fits-him
  count is 830, and on river-run it is **zero**.
- Fixing it with width costs **1.21× at the median and 2.46× at p95**, against a shot he has just
  accepted and a corridor setting he has already declined to widen.

## PROPOSALS — one recommendation, and it is not a zoom rule

**P1 (the recommendation) — attack the SPRITE, not the shot.** space-sprint is 61% of this residual
and 1,841 of the 2,500 margin-made frames, for one reason already measured in LEADER-LAG-TRUTH-1: its
sprite is **2.9× river-run's** and the aim leaves it **41% less room**, giving it a tolerance 3.1×
tighter than any other track. **The residual is not evenly distributed because the cause is not
evenly distributed.** Shrinking that one sprite, or widening that one track's shot, would take most
of this without touching the guarantee stack, without a new mechanism, and without opening the shot
on the other nine tracks. It is also the smallest change proposed anywhere in this strand.

**P2 (mine) — before any zoom rule, ask whether the MARGIN should be per-track.** 90 px was read off
a knee measured mostly on space-sprint, and it is now doing two jobs: buying the lateral rule its
effectiveness, and creating 2,500 residual frames. On river-run the bare-box residual is **zero** and
the shipped-margin residual is 28 — every one of those 28 is the margin's doing. A margin derived from
each track's own measured pan trailing, rather than one number for all ten, would shrink the residual
without any new guarantee at all. **This is cheaper than a zoom rule and nobody has costed it.**

**P3 (mine) — if a zoom rule is built anyway, it must be measured on EPISODES, not frames.** The
residual is 150 episodes, not 3,330 independent events. A rule evaluated per frame will look like it
fires constantly; the same rule evaluated per episode fires 150 times over 100 races — about 1.5 times
a race. **Those two framings would lead to opposite design decisions**, and this strand has twice
built a mechanism whose visible consequence nobody had measured first.

**P4 — what is NOT proposed.** No mechanism, no key, no build, per the brief. In particular the
obvious "widen when the leader does not fit" is **not** recommended: the cost section above is why,
and the fact that these frames sit at u ≈ 0.5 rather than in the closing phase means it would be
opening the shot in the middle of an ordinary race.
