# AIM-ROOM-CEILING-1 — on the broken-promise frames, the fetter is the STATE's own zoom, and OVERVIEW does not set it

> **ONE QUESTION, MEASURED. Nothing built, no setting changed, no value swept, the ship branch
> untouched.** Measurement and documents only — **no fingerprint is in reach and the browser gate
> does not apply**, so neither was run; that is stated rather than performed. The residual measured
> here is the one AIM-ROOM-WIRING-1 leaves on the repaired build (`ship/aim-room-floor-1`).

**The answer, in one line: raising the OVERVIEW setting would recover essentially nothing, and the
reason is not the one the code's neighbourhood suggests.**

---

## 1. WHICH CEILING WON, on the frames where the promise is broken

A frame is a shortfall when fewer racers are in the **delivered** frame than `minRacersVisible`
promises **and** at least that many were still running. On those frames — not a sample of the race —
every term of `guaranteed = min(state, guarantee, company, field, line)` was recorded and the argmin
taken. Ten tracks, N=30, floor at the shipped value.

| track | unscheduled shortfall frames | **state** wins | **company** wins |
|---|---|---|---|
| space-sprint | 2,267 | **1,480 (65.3%)** | 787 (34.7%) |
| seatrack | 1,146 | 569 (49.7%) | **577 (50.4%)** |
| mountainstreet | 478 | **374 (78.2%)** | 104 (21.8%) |
| river-run | 316 | 121 (38.3%) | **195 (61.7%)** |
| luger-hill | 212 | **174 (82.1%)** | 38 (17.9%) |
| searound | 107 | 47 (43.9%) | **60 (56.1%)** |
| ice-track | 17 | **10 (58.8%)** | 7 (41.2%) |
| garden-path | 12 | 0 | **12 (100%)** |
| dirt-oval | 7 | **7 (100%)** | 0 |
| city-circuit | 0 | — | — |
| **pooled** | **4,562** | **2,782 (61.0%)** | **1,780 (39.0%)** |

**Only two terms ever win. `guarantee`, `field` and `line` never won a single frame on any track.**

**`company` was never `Infinity`** on any of those frames, so the company guarantee is live
throughout — it is not standing down and letting something else through.

Scheduled frames were counted separately and excluded from the argmin (80 of 4,642 across the ten):
while the endgame schedule composes, the other authorities stand down by design and "which ceiling
won" means something different there. `_framingProbe.binding` was recorded alongside the recomputed
argmin rather than trusted — a standing finding records that it lies on scheduled frames — and on
these unscheduled frames **the two agreed exactly, on every track.**

### How far apart the two are, where `state` is the fetter

`ln(company) − ln(winner)`, i.e. how much tighter the binding term is than company. Zero means
company *is* the winner.

| track | p50 | p90 | max |
|---|---|---|---|
| seatrack | 0.0000 | 0.5757 | 0.7417 |
| space-sprint | 0.0448 | 0.3140 | 0.6053 |
| mountainstreet | 0.0594 | 0.2941 | 0.5701 |
| luger-hill | 0.1463 | 0.2322 | 0.3018 |
| dirt-oval | 0.2242 | 0.2329 | 0.2329 |
| river-run | 0.0000 | 0.1930 | 0.2794 |
| searound | 0.0000 | 0.0599 | 0.1113 |
| ice-track | 0.0075 | 0.0372 | 0.0438 |

At the p90 on space-sprint the fetter sits **0.31 ln tighter than company asked for** — a shot about
a third narrower than the company guarantee wanted. That gap is the answer to "how far apart were
they": it is the room the company ceiling was asking for and did not get.

### The same fetter is there BEFORE the ship, which is worth knowing

Run on `master` — no room floor in the tree at all — space-sprint's own baseline shortfall is bound
by **`state` on 100% of its frames** (9 of 9 at a 3-seed spot check, 0.24% of frames). **The state
ceiling is the fetter both before and after the aim-room work.** The floor did not introduce this
term as the binding one; it made the frames it binds on more numerous. That is a further reason
OVERVIEW was never a candidate: the shortfall that predates the floor is bound by the same thing.

*(The instrument refuses `--floor=` with exit 2 on a tree whose config has no such key, rather than
silently reporting the unfloored picture under a floored label — the arm-becomes-a-copy trap this arc
has already hit twice.)*

**So both halves of the question have an answer, and they are different answers:**

- **On 39.0% of the frames, COMPANY IS the winner.** The shot is as wide as the company guarantee
  itself demands and the promise still breaks. **The geometry is short there and no setting recovers
  it** — the racers are simply further apart than a frame that also holds the leader can span.
- **On 61.0%, a different ceiling wins, and it is `state`.** That is the fetter.

---

## 2. WHAT `state` IS — and it is not OVERVIEW

`_ceilings.state` is `_scheduled ? _runInCeiling : stateZoom`, and on unscheduled frames it is
`stateZoom = this._stateCamZoom()`. Every frame measured above has `cd.state === 'LEADER_ZOOM'`,
and that switch's LEADER_ZOOM branch returns **`this._leaderZoom`**, built at construction from the
**LEADER_ZOOM** profile's own corridor setting.

`this._overviewStateZoom` is a **separate field**, returned only by the OVERVIEW branch of the same
switch.

**Where `_overviewStateZoom` appears at all, checked function by function rather than by grepping the
file:**

| function | OVERVIEW references in code |
|---|---|
| `_guaranteeCeiling` (lines 2527–2592) | **none** |
| `_companyCeiling` (lines 4060–4087) | **none** |
| `_fieldCeiling` (lines 4112–4152) | **one** — `if (!(ceiling >= this._overviewStateZoom))`, its retirement |
| `_computeZoomForCorridors` (lines 511–518) | **none** |

**The one place OVERVIEW's setting reaches a ceiling is `_fieldCeiling`'s retirement — and `field`
never won a single shortfall frame.** That retirement clause is precisely the thing that must not be
carried across to `_companyCeiling`: `_companyCeiling` has no retirement, and it has no reference to
OVERVIEW either.

---

## 3. MEASURED, NOT READ — does raising OVERVIEW reach these frames?

The code says no. The code was not trusted. OVERVIEW's own corridor setting was scaled by 1.5 — a
**multiplier, deliberately not a value**, because this is a causation test and not a search for a
better setting — and the same races re-run.

| | space-sprint shortfall | seatrack shortfall |
|---|---|---|
| OVERVIEW untouched | 2,345 of 38,666 (6.06%) | 1,148 of 38,526 (2.98%) |
| **OVERVIEW raised 50%** | **2,343 (6.06%)** | **1,137 (2.95%)** |
| recovered | **2 frames** | **11 frames** |

The `state` winner count on space-sprint is **identical** (1,480 both arms) and the gap quantiles are
identical to four decimal places. On space-sprint the total frame count itself moved by 2
(38,666 → 38,668), because OVERVIEW's width changes the shot *while the director is in OVERVIEW* and
that shifts state timing very slightly — so even those 2 frames are a knock-on from OVERVIEW's own
shots, not from any LEADER_ZOOM ceiling moving.

### The control, because a null result is worthless without one

A measurement that says "changing X does nothing" is indistinguishable from a measurement that
failed to change X. So the setting was proven to apply, directly:

```
_overviewStateZoom   mult=1.0 : 1.0666666666666667
_overviewStateZoom   mult=1.5 : 0.7111111111111111     <- CHANGED (a wider shot)
_leaderZoom          mult=1.0 : 2.1333333333333333
_leaderZoom          mult=1.5 : 2.1333333333333333     <- BIT-IDENTICAL
```

**The setting demonstrably works, and it demonstrably does not touch the term that binds 61% of the
broken-promise frames.**

---

## 4. WHAT RAISING OVERVIEW WOULD COST — and this corrects an earlier answer

**It widens OVERVIEW shots generally, and therefore the picture everywhere that state is used. It
does NOT widen the shots that break the promise.** Those are the two very different prices, and this
is the expensive one bought for nothing:

- It is **not** targeted. `_overviewStateZoom` is OVERVIEW's own state zoom; raising it changes
  every OVERVIEW shot in every race — the start ceremony's hold framing, the mid-race OVERVIEW cuts,
  and the finish lookback all read that value.
- It is **not** effective. The frames that break the promise are LEADER_ZOOM frames, and their
  binding term is LEADER_ZOOM's own zoom, which the measurement above shows is bit-identical under
  the change.

**An earlier answer to him said the opposite without checking.** It read `_fieldCeiling`'s
retirement — which genuinely does consult `_overviewStateZoom` — and carried it across to the
company guarantee. `_companyCeiling` has no such clause. That is corrected here, and the correction
is the reason this piece exists.

---

## 5. WHAT THE FETTER ACTUALLY IS, stated and not acted on

On the 61% where `state` binds, the ceiling is **LEADER_ZOOM's own corridor setting**. That is a
setting he owns and could raise, and it would be the targeted lever rather than the general one —
but it carries the same shape of price in the state he watches most: **LEADER_ZOOM is the dominant
mid-race shot, so raising it widens nearly every mid-race frame, not only the ones that break the
promise.** Whether that trade is worth it is a judgement about the picture, and no number here
settles it.

**No value was swept and none is recommended.** The question asked was which ceiling binds and
whether OVERVIEW sets it; both are answered. Sizing a change to LEADER_ZOOM's setting is a different
piece and would need his eye, because it moves the shot he sees most of the time.

**And on the other 39% no setting helps at all.** Where company is itself the winner, the shot is
already as wide as the promise asks and the racers still do not fit with the leader. That share is
the floor under this residual.

---

## Limits

**One instrument, one machine, N=30 on ten tracks.** space-sprint and seatrack carry 75% of the
pooled shortfall frames, so the pooled 61/39 split is dominated by two tracks; the per-track table is
the honest reading and it varies widely (dirt-oval 100% state, garden-path 100% company).

**The argmin is over the five terms as composed.** The corridor cap is applied *after* the `min` and
can loosen the result, and a level ceiling can overwrite the binding label further down; neither is
one of the five, so neither can appear as a winner here. On these frames the recomputed argmin and
the director's own label agreed exactly, which is evidence that nothing downstream re-authored the
result on them — but it is agreement, not proof.

**The causation test used one multiplier on one setting.** It establishes that OVERVIEW's corridor
setting does not reach these frames. It does not enumerate every other thing OVERVIEW's profile
carries; a different OVERVIEW key could in principle feed something else, and that was not swept.
