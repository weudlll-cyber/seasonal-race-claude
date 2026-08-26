# ANCHOR-ROOM-GAP-1 — what the anchor-versus-centre gap costs: almost nothing, and the 132 px was mine and wrong

**Measure only.** No product file, default, key or fingerprint is touched. Corpus: ten tracks × five
races, **210,388 frames** across all six camera states. The replication of the shipped guarantee is
checked against the director's own `_lastLateralShift` on every comparable frame and is **exact:
124,310 / 124,310**.

**WHAT WAS NOT RUN.** No browser gate, no client suite, no fingerprint run — nothing outside
`scripts/diag/` and this report changed, so none of them could return a different answer.

---

## THE VERDICT: IT IS LATENT, HE HAS NEVER SEEN IT, AND IT IS NOT WORK

The gap changes the guarantee's **answer** on **2.99%** of frames. Where it does, the picture would
move a **median 3–12 px** and at worst **41.3 px**. It concentrates almost entirely in
`COMEBACK_ZOOM`, which is **1.9% of all frames**.

**Nothing here is worth doing on its own account.** It is an inconsistency, it is real, and it is
below the threshold at which anyone would see it. **Recorded so it stops being re-found, not proposed
as work.**

## AND A CORRECTION THAT COMES FIRST, BECAUSE IT IS MINE

**The "median 132 px" figure does not survive re-measurement, and I am the one who published it.**
LEADER-LATERAL-BUILD-1 recorded that the corridor guarantee "measures its room from
`anchorScreenPoint` while `resolveCamera` centres the pan target — a median 132 px apart", and this
chain's own brief repeats it.

That number was not the gap between the two room-measurement points. It was the distance between a
*reconstruction I had built* — anchor placed at `anchorScreenPoint` — and the director's
`targetOffset`, which additionally carries the forward bias having already moved the world target,
plus `resolveCamera`'s world-bounds clamp. It answered "how wrong was my model", which was the right
question in that block and is a different question from this one.

**Measured properly, as the distance between the two candidate points the rooms would be taken
from:**

| state | gap median | gap p95 | gap worst |
|---|---|---|---|
| COMEBACK_ZOOM | **10.9** | 15.1 | 74.2 |
| LEADER_ZOOM | **7.4** | 9.9 | 232.6 |
| BATTLE_ZOOM | 0.0 | 0.0 | 366.3 |
| OVERVIEW | 0.0 | 215.9 | 242.0 |
| LEAD_CHANGE | 0.0 | 0.0 | 234.9 |
| PHOTO_FINISH | 0.0 | 0.0 | 127.5 |
| **POOLED** | **0.0** | **12.6** | **366.3** |

**The pooled median is zero** — on most frames the two points are the same point, because without a
forward bias the anchor *is* the centred target. In `LEADER_ZOOM`, where the bias applies, the
typical gap is **7.4 px**, not 132.

## (a) HOW OFTEN IT CHANGES THE ANSWER, not the arithmetic

A wrong room only matters on a frame where it moves what `lateralShiftToFit` returns — that function
turns rooms into an interval and returns the *smallest shift that reaches it*, or 0 when 0 is
admissible. So every frame is classified by what the two room pairs actually produce:

| class | meaning | frames | share |
|---|---|---|---|
| **SILENT** | both answers are 0 — the centreline works either way | 99,391 | **47.2%** |
| **SIZE** | both engage, same direction, different magnitude | 104,706 | **49.8%** |
| **ANSWER** | one engages and the other does not, or the signs differ | **6,291** | **2.99%** |

Only the third class can put something on screen the framing rule did not intend. **Reporting the
input error instead would have overstated this by a factor of thirty.**

## (b) IN WHICH STATES — one state carries it

| state | frames | ANSWER | share of that state |
|---|---|---|---|
| **COMEBACK_ZOOM** | 3,993 | **3,157** | **79.06%** |
| OVERVIEW | 22,343 | 2,301 | 10.30% |
| LEADER_ZOOM | 86,078 | 823 | **0.96%** |
| BATTLE_ZOOM | 46,624 | 10 | 0.02% |
| LEAD_CHANGE | 39,895 | 0 | **0.00%** |
| PHOTO_FINISH | 11,455 | 0 | **0.00%** |

**`COMEBACK_ZOOM` is where this lives** — four frames in five. That is consistent with its geometry:
it is the one single-racer state that is `CENTRED` rather than `FORWARD`, and it has the largest
typical gap (10.9 px median) against a shot whose room is tight.

**`LEADER_ZOOM` — the state the recent work was all about — is 0.96%**, and `LEAD_CHANGE` and
`PHOTO_FINISH` are exactly zero. The two states where the pair guarantee does real work are untouched.

## (c) WHAT THE PICTURE WOULD DO if the guarantee measured from where the camera aims

| state | move median (engaged frames) | move p95 | on ANSWER frames: median / worst |
|---|---|---|---|
| COMEBACK_ZOOM | 3.0 | 13.0 | 3.0 / **30.9** |
| OVERVIEW | 0.0 | 41.3 | 12.2 / **41.3** |
| LEADER_ZOOM | 1.7 | 7.4 | 8.7 / **20.3** |
| BATTLE_ZOOM | 2.6 | 3.5 | 2.6 / 3.5 |
| **POOLED** | **0.9** | **7.5** | — / **41.3** |

**The whole correction is worth 41 pixels at its very worst**, on a 1280 px frame, on 3% of frames,
in a state that is 1.9% of the race. On a median engaged frame it is under one pixel.

For scale: this camera's own accepted per-frame pan motion has a median around 9 px and a p99 near
190 px. **The correction is smaller than the noise the picture already carries.**

## WHAT MADE THIS MEASURABLE — two exclusions, both asked of the director

The first cut of this probe reconstructed the guarantee's inputs from `_framingProbe` and disagreed
with the director on 262 OVERVIEW frames. Both causes were the probe's, and both are worth recording
because they are the shape of every replication error in this codebase:

1. **The function has five early returns** — no pan target, no shape, a degenerate heading, a
   degenerate scale, an empty subject list — and on any of them never reaches the line assigning
   `_lastLateralShift`. The probe was scoring decisions the director never made. Fixed with a
   sentinel: NaN in, still NaN out, the frame is excluded.
2. **The probe was reconstructing the inputs at all.** The pan target and heading are *replaced* when
   the entry-phase pan travels in T-space, so the probe's anchor was not what the function received.
   Rather than enumerate branches and get a third one wrong, the wrapper now records **exactly what
   was passed**.

After both, replication is exact on every comparable frame. **The numbers above are only worth
reading because of that check**, and a run whose replication did not match would have been reported
as unusable rather than believed.

## CONFORMITY

- Nothing built, no key, no default, no fingerprint.
- The verdict is stated as the brief asked: latent, never seen, **not proposed as work**.
- One published number of mine is corrected in the open rather than quietly dropped.

## PROPOSALS

**P1 — leave it alone, and this is the recommendation.** The inconsistency is real and costs 41 px at
worst on 3% of frames. Fixing it would move a shipped guarantee in every state at once to buy
something nobody can see. **The reason to record it is so the next reader who finds the two
measurement points does not have to price it again.**

**P2 (mine) — if it is ever touched, `COMEBACK_ZOOM` is the whole of it, and that scopes the risk.**
79% of the answer-changes are in one state that is 1.9% of frames. A change scoped to that state
would carry almost the entire correction while leaving `LEADER_ZOOM`, `LEAD_CHANGE` and
`PHOTO_FINISH` — the states that have just been through three rounds of repair — untouched. That is
a much smaller blast radius than "fix the guarantee", and it is worth knowing before anyone proposes
the larger version.

**P3 (mine) — the reason this took a correction is that a measurement was quoted out of its own
context, and that will happen again.** "A median 132 px apart" was true of what it measured and
became false the moment it was repeated as a property of the mechanism. It travelled from a report
into a brief into this piece's premise without ever being re-derived. **A number that names what it
compared — "my reconstruction vs the director's target", not "the gap" — cannot be repeated wrongly.**
Cheap discipline; this piece is what it costs when it is missing.
