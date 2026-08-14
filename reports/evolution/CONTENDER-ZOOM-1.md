# CONTENDER-ZOOM-1 — the corridor is the wrong quantity in BOTH directions

**Branch:** `feat/contender-zoom`, off master `5d4079c3`. **Not merged. Nothing minted.**

**The verdict in one line:** the guarantee half is built and the membership half is **blocked on a
number this project does not have**; and the corridor cap — the part the rule is most explicit about
— **ships OFF, because it measurably costs participants.**

---

## 0. Three things that change the shape of the task, found before building

**1. `endgameCorridorFloor` IS NOT ON MASTER.** It exists only on the unmerged `feat/front-group`.
So there is no floor here to "turn round": on master the corridor has never bounded the finish shot
at all. What FRONT-GROUP-6 built is superseded by this work and should not now be merged.

**2. The crossing shot is ALREADY at the ordinary zoom.** §3 expected "with two contenders the
crossing shot should be at or near the ordinary photo-finish zoom again". On master it already is —
**median 100%, mean 92%** over 27 photo finishes. The 52% / 38% / 93% figures in the brief are the
FLOOR's, and the floor never shipped. There is nothing to restore.

**3. The pair is already well framed.** Graded on the two racers the shot actually pins, master
loses one on **12.0%** of photo-finish frames. The shot keeps the promise it makes. The failure is
entirely about the participants beyond those two.

## 1. Can `_photoFinishContenders` hold more than two? No — and it matters a great deal

**How the set is formed**, all three steps hard-coded to two:

| step | code | what it does |
| --- | --- | --- |
| the gate | `evaluatePhotoFinishGate` | `shortestArcDeltaT(ord[0].t, ord[1].t) <= closeThresholdT` — a predicate on the **top two only** |
| the capture | `CameraDirector.js` | `ordered.slice(0, 2)` — **exactly two, always** |
| the consumer | `_photoFinishFramingPair` | returns `[a, b]`, feeding `pairGuarantee`, which takes **two points** |

**Measured — 20 racers, ten tracks, three seeds (27 photo finishes):**

| | |
| --- | --- |
| photo finishes with MORE than two racers level at entry | **26 of 27** |
| level-set size: median | **12** |
| level-set size: range | 2 – **20 of 20** |
| the director captured | **2**, in every one |

On river-run seed 2814 the top six are within **0.0010** of the leader — a wall of racers arriving
together. Three genuinely level racers are not participants today: the shot cannot represent them.

## 2. What widening the set would need — and why I stopped

**"Level" was measured with `photoFinishCloseThresholdT` (0.03), the entry gate's own number, asked
of every racer instead of second place alone. That is not a membership rule and does not behave like
one:** at 0.03 it admits a median of 12 and, on four races, the entire field of 20. Guaranteeing 20
racers whole is the "show the full width where nobody races" failure several times over.

**The other existing candidate is worse, not better.** `battlePulkThresholdT` — the camera's
established answer to "are these racers together" — is **0.05**, larger still.

**So there is no existing number that means what the rule needs, and I did not invent one.** What a
new number would be compensating for, stated precisely:

> **The project has no measure of ABREAST.** Both existing thresholds answer "is a contest
> happening" and are sized for that. Neither distinguishes racers contesting the SAME MOMENT at the
> line from racers merely within a third of a lap of it. The owner's words are "three abreast" — a
> lateral, same-instant notion — and nothing in the codebase computes it.

Three candidate rules and why each fails without a number: *everyone still racing* → the whole field
on a strung-out race; *everyone within an arc threshold* → the measurements above; *everyone who
crosses inside the shot* → only knowable after the shot must already be sized.

**This is the piece's open decision and it is his, not mine.**

## 3. What was built

**`contenderGuarantee(pts, …)`** — `pairGuarantee` over every pair, minimum wins, so the binding
constraint is the widest separation in the set. **At n = 2 it is `pairGuarantee` exactly**, same
arguments, same result — which is why the shipped picture cannot move until the capture widens, and
is proved rather than asserted (§6). Not a bounding box: that would assume the worst orientation,
which `pairGuarantee` exists to avoid.

**The corridor as a maximum WIDTH** — a lower bound on zoom, composed with `max`. Every other term
in that function is a ceiling on zoom composed with `min`, so this could not be another `_ceilings`
entry without silently meaning the opposite of every line beside it. **The contenders win if the two
conflict**, because his first rule is that all participants stay visible.

**What survives untouched, and was right:** the screen-relative anchor point, the per-axis projection
of the perpendicular that makes an angled corridor ask for more than a flat one, and the body
padding. `corridorGuarantee` is reused unchanged.

**Whole, not by centres:** the padding is `_drawnBodyWidthRefPx` and already was. **What it still
leaves uncovered:** that is the NARROW reference and covers a **median 44.6%** of the drawn sprite,
so a contender at the very edge can be clipped by the remainder — it just cannot be half out of
frame. Closing it needs the DRAWN size, which depends on the zoom being solved for; the sprite sits
at its screen cap on only **23.4%** of endgame frames, so there is no closed form for the other 77%.

## 4. Why the cap ships OFF

| pooled, 7441 photo-finish frames | master | cap ON |
| --- | --- | --- |
| level set — cut | 36.5% | **51.6%** |
| level set — fully outside | 51.9% | **61.9%** |
| **level set — NOT WHOLE** | **57.3%** | **81.7%** |
| pinned pair — not whole | 12.0% | 12.2% |
| crossing vs ordinary (median) | 100% | 100% |
| empty frames | 18 | 18 |

**The cap is not inert — it moved the delivered zoom on 3955 of 7441 frames.** It does exactly what
the rule asks, and it costs 24.4 points of participants-whole.

**WHY, and it is FRONT-GROUP-7's finding from the other side.** A corridor bound only ever
constrains ACROSS the track, but a zoom change moves BOTH directions. The participants are strung
out ALONG the road, so tightening to the road's width takes away the very room that was holding
them. **"Showing the whole width certainly shows everyone" is false in this geometry** — the finish
shot's binding dimension is longitudinal, and no width-based quantity can see it.

Taken together with FRONT-GROUP-7 — where forcing the shot OPEN to a corridor width helped, but by
accident, because it bought longitudinal room — **the corridor width is the wrong quantity in both
directions.**

**The two named races.** ice-track seed 9 does **not** regress: 10.9% / 22.6% / 27.0% on both arms,
identical, though the cap bound on 170 of its 274 frames. river-run seed 2814 regresses slightly,
74.5% → 75.0% cut, and its lane use is **69%** of the corridor — there is not much empty road there
to reclaim.

## 5. One implementation error, recorded because it nearly shipped

The cap was first scoped by `GUARANTEE.PAIR`, which **looks** equivalent to "the finish" and is not:
BATTLE_ZOOM and LEAD_CHANGE are pair states too, and they are mid-race shots the rule says nothing
about. With the cap reaching them, **`check-runin-frame` went RED — 14 frames with no racer on
screen at all on searound, the narrowest corridor, in BATTLE_ZOOM.** Scoped to `PHOTO_FINISH`, the
guard is green on both halves with 0 empty frames. The guard caught it; the measurement would not
have.

## 6. Fingerprints — measured fresh, NOT minted

| role | master | key OFF (ships) | key ON |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | — |
| camera | `d7a8fe54072df6d7` | **`d7a8fe54072df6d7`** | `09dd14b16579402d` |
| render | `d1c9d5d0da6a964f` | **`d1c9d5d0da6a964f`** | `cc6d755c29fee248` |

**The OFF column is byte-identical to master on all three** — which is also the proof that
`contenderGuarantee` reduces to `pairGuarantee` exactly at two, since it is on the live path in both
arms. WORLD was run rather than argued: `engine-reach` selects `defaults.js` (it is in the hull), and
the key it adds is a camera key.

`npm run verify`: **PASS 15 FAIL 0 SKIP 5**. `check-runin-frame` PASS on both halves, 0 empty frames.

## 7. Source hygiene

- **Added:** `contenderGuarantee` (framingRule.js), `_corridorWidthCap`, one key, and
  `scripts/contender-truth.mjs`.
- **Added to the probe:** `corridorCap` and `capBound`, diagnostic only, read by nothing in the
  camera — so "the corridor is the ceiling" is a measurable frequency rather than a claim.
- **Tests: 8 added, 0 deleted.** Five pin `contenderGuarantee` — the load-bearing one being that at
  n = 2 it IS `pairGuarantee` to the bit. Three pin the key's two positions (L203) and that the
  contenders still win when the cap conflicts.
- **Not built:** the membership widening. §2.

## 8. For his eye

**river-run seed 2814** — the shot at the line is already the ordinary photo-finish zoom, and the
racers you cannot see are behind the leaders ALONG the road rather than beside them, which is why
capping the width does not bring them back. **ice-track seed 9** — unchanged from master in every
measured respect, and it is the race that shows the cap can bind hard (170 of 274 frames) while
costing nothing, because there the field is genuinely abreast.
