# COMPANY-HEADCOUNT-1 — the guarantee asks whether its anchor is a racer, and a promise of five delivers five

> **REPAIRED, MEASURED, SABOTAGE-PROVEN — NOT MERGED, NOT MINTED.** Branch `fix/company-headcount-1`
> off `master`. `docs/fingerprints.json` untouched; camera and render moved and their values are
> written nowhere. **`ship/aim-room-floor-1` and `feat/aim-levers-1` are untouched** — candidate B is
> judged after this lands, on a correct baseline.

**No setting was changed.** `minRacersVisible`, LEADER_ZOOM's corridors and every other value are as
they were on master. The widening is absorbed by nothing; where the geometry cannot give what the
corrected guarantee asks, that is reported below rather than clamped.

---

## 1. THE REPAIR — the premise is asked, not asserted

```js
const need = Math.floor(minVisible) - (anchorIsRacer ? 1 : 0);
```

`anchorIsRacer` is set by the loop's own `dx === 0 && dy === 0` test — the line that already skipped
the anchor. **Its answer was being thrown away.** Nothing else changed: not the ranking, not the
room, not the clamp.

**WHY THIS SHAPE CANNOT SILENTLY REGRESS.** The premise is **derived, per call, from the same inputs
the function already walks.** There is no second place that states it — no parameter, no flag, and
now no comment asserting it — so **there is nothing left that can go stale when the anchor moves
again.** If a future change puts the anchor back on a racer, or moves it somewhere else again, the
deduction follows on the very next call without anyone remembering.

**A BOOLEAN PARAMETER WOULD HAVE REPRODUCED THE DEFECT ONE LEVEL UP.** The caller would assert the
premise; an anchor change would move it; the caller's assertion would still read true. That is
precisely what happened here — *a true statement left standing while its premise moved beneath it* —
so the fix must not create another statement to leave standing.

**The comment is rewritten**, because a comment documenting the old premise is what let this survive
a year of reading. The docblock now says `minVisible` counts **racers**, and that whether the anchor
is one of them is decided per call from the anchor itself.

**Two edges, stated because they are choices.** A **finished** racer standing on the anchor does not
count — it is skipped before the test, and it cannot be one of the live racers the promise is about.
And **exact equality is the right test**: where the anchor is a racer it is a *copy* of that racer's
coordinates, so equality holds; an anchor that merely converges near a racer reads as "not one of
them" and the guarantee asks for one **more** than strictly needed — it over-delivers, which is the
direction a guarantee should fail in.

### Sabotage-proven

Restoring the unconditional `- 1` turns **6 tests red**, including all four headcount cases and the
failure proof. New `companyHeadcount.test.js`, **15 assertions, deliberately behavioural**: at the
zoom the guarantee returns, *count* the racers actually inside the region it promises them inside.
**No existing test caught this because every one of them asserted the ceiling's arithmetic rather
than the headcount it buys** — which is why the new file asserts the headcount.

---

## 2. THE SECOND CALL SITE IS CORRECT, AND THAT WAS ESTABLISHED BY RUNNING BOTH VERSIONS

`_fieldCeiling` passes `racers.length + 1` to mean "everyone". **It has NOT been under-asking**, and
the reason is structural rather than lucky: that argument is a **sentinel** meaning *more than the
field can supply*, and the existing `Math.min(need, ceilings.length)` clamp turns any over-ask into
"take everything". The deduction was absorbed by that clamp and never reached the result.

Probed on both trees, both anchor cases, same fixture:

| | field site (`racers.length + 1`) | `minVisible = 5` |
|---|---|---|
| master, anchor **is** a racer | 0.9600 | 1.4400 |
| master, anchor **not** a racer | 0.9600 | **1.4400** ← the defect |
| fixed, anchor **is** a racer | 0.9600 | 1.4400 |
| fixed, anchor **not** a racer | 0.9600 | **1.1520** ← corrected |

**The field site is identical before and after in both cases. The repair is surgical**: it changes
exactly the case that was wrong and nothing else. Pinned by a test so the sentinel's behaviour cannot
drift out from under the clamp later.

---

## 3. THE PRICE — ten tracks, N=30, arms matched frame by frame

**FRAME COUNTS ARE IDENTICAL BETWEEN ARMS ON ALL TEN TRACKS.** This moves the picture and not the
race — the control the brief asked for, and it holds at both N.

| track | in-shot p50 / p10 | promise kept | centre% | step p99 | step max | corner overflow |
|---|---|---|---|---|---|---|
| space-sprint | 9 / 5 → 9 / **6** | 96.32% → **99.23%** | 69.77 → **70.81** | 184.7 → 192.0 | 586.8 → 586.8 | 1751 → **1743** |
| searound | 13 / 6 → 13 / **7** | 97.39% → **99.92%** | 99.48 → 99.48 | 162.3 → 162.4 | 721.7 → **717.3** | 407 → **406** |
| seatrack | 11 / 6 → 11 / **7** | 97.55% → **99.63%** | 79.21 → **79.25** | 206.2 → 206.2 | 1279.9 → 1279.9 | 663 → 663 |
| city-circuit | 12 / 7 → 12 / 7 | 98.20% → **99.80%** | 99.76 → 99.76 | 182.4 → **181.0** | 749.5 → 749.5 | 536 → 536 |
| ice-track | 14 / 7 → 14 / 7 | 98.20% → **99.39%** | 98.77 → 98.77 | 162.6 → 167.0 | 398.5 → 398.5 | 405 → 405 |
| dirt-oval | 12 / 8 → 12 / 8 | 99.22% → **99.95%** | 99.61 → 99.61 | 178.6 → **178.0** | 796.4 → 796.4 | 576 → 576 |
| river-run | 17 / 11 → 17 / 11 | 99.27% → **99.43%** | 90.17 → 90.17 | 167.1 → 167.8 | 744.3 → 744.3 | 274 → 274 |
| mountainstreet | 15 / 9 → 15 / 9 | 99.49% → **99.54%** | 81.13 → 81.13 | 185.0 → 187.0 | 843.4 → 843.4 | 534 → 534 |
| garden-path | 15 / 10 → 15 / 10 | 99.59% → **100.00%** | 99.71 → 99.71 | 154.0 → 154.6 | 670.7 → 670.7 | 165 → 165 |
| luger-hill | 14 / 10 → 14 / 10 | 99.70% → **99.80%** | 92.06 → 92.06 | 142.7 → 142.7 | 756.4 → 756.4 | 275 → 275 |

**The median shot does not change. The tail does.** `in-shot p50` is identical on all ten; `p10` rises
by one on the three tracks that were worst. That is the correct shape for this repair: it only bites
where the promise was being broken.

**The steadiness columns say the camera is not made restless.** Largest single-frame pan is
**identical on 9 of 10** and *improves* on searound. `step p99` is flat or better on four tracks and
rises by at most **7.3 px** (space-sprint) elsewhere. Centreline share is unchanged or better
everywhere. Corner overflow is unchanged on 9 of 10 and slightly better on space-sprint.

### How much wider, as a distribution

| track | frames WIDER | p50 | p75 | p90 | p99 | max |
|---|---|---|---|---|---|---|
| searound | 17.46% | 1.036× | 1.094× | 1.207× | 1.724× | 1.864× |
| space-sprint | 16.42% | 1.060× | 1.132× | 1.260× | 1.701× | 1.718× |
| city-circuit | 8.40% | 1.072× | 1.127× | 1.209× | 1.338× | 1.377× |
| ice-track | 7.53% | 1.036× | 1.084× | 1.165× | 1.357× | 1.388× |
| seatrack | 6.52% | 1.054× | 1.192× | 1.357× | 1.611× | 1.644× |
| dirt-oval | 4.36% | 1.026× | 1.094× | 1.257× | 1.308× | 1.311× |
| garden-path | 2.48% | 1.065× | 1.127× | 1.284× | 1.539× | 1.542× |
| mountainstreet | 2.32% | 1.024× | 1.062× | 1.095× | 1.140× | 1.161× |
| river-run | 1.54% | 1.031× | 1.073× | 1.110× | 1.152× | 1.153× |
| luger-hill | 1.26% | 1.015× | 1.099× | 1.161× | 1.198× | 1.199× |

**THE PRICE IS MUCH SMALLER THAN I QUOTED, AND THE EARLIER FIGURE SHOULD BE WITHDRAWN AS A GUIDE.**
AIM-ROOM-LOST-1 said a median **1.33×** and p90 **2.26×**. That was measured on a *subset* — the
broken-promise frames where `state` was the argmin — and reading it as the price of the repair was my
error. Across all frames the shot is untouched on **82.5–98.7%** of them, and where it does widen it
is a median **1.02–1.07×** and a p90 of **1.10–1.36×**.

### Stage 2 — 300 races on the four tracks that mattered

| track | promise kept | in-shot p50/p10 | frames wider | widening p50 / p90 / max | step max |
|---|---|---|---|---|---|
| space-sprint | 96.96% → **99.44%** | 10/6 → 10/6 | 12.94% | 1.048× / 1.293× / **2.798×** | 737.5 → 737.5 |
| seatrack | 97.51% → **98.84%** | 12/7 → 12/7 | 6.71% | 1.049× / 1.240× / 1.835× | 3863.2 → 3863.2 |
| ice-track | 98.54% → **99.73%** | 13/8 → 13/8 | 5.37% | 1.046× / 1.245× / 1.704× | 741.1 → 741.1 |
| searound | 99.13% → **99.99%** | 13/8 → 13/8 | 10.89% | 1.025× / 1.139× / 1.864× | 728.8 → 728.8 |

**Largest single-frame pan is identical on all four at N=300**, and corner overflow improves slightly
on all four. seatrack's 3863 px maximum is present in **both** arms and is not this repair's.

---

## 4. WHAT THE GEOMETRY STILL REFUSES — reported, not clamped

The promise is not kept everywhere, and the residual is **not** a further under-ask. On the frames
that remain short at N=300, the **company ceiling is itself the binding term**:

| track | residual short | company binding | deficit of exactly 1 |
|---|---|---|---|
| seatrack | 4,762 (1.16%) | 3,900 (81.9%) | 4,024 (84.5%) |
| space-sprint | 2,622 (0.56%) | 2,013 (76.8%) | 2,321 (88.5%) |
| ice-track | 978 (0.27%) | 784 (80.2%) | 970 (99.2%) |
| searound | 21 (0.01%) | 21 (100%) | 21 (100%) |

**The guarantee is asking and not getting.** It is the widest authority on those frames, the shot is
as wide as it demands, and it is still one racer short on 85–99% of them. That is consistent with the
anchor-miss defect recorded below — the room is computed from a screen position the delivered frame
does not have — and it is **not** consistent with the headcount still being wrong. **Nothing was
clamped and no setting was moved to hide it.**

---

## 5. RECORDED, NOT FIXED — every guarantee plans from a position the frame does not have

**The anchor misses the screen point every guarantee reasons from by a median 74 px** (p90 153.57,
max 542.12), on **100% of the frames** measured in AIM-ROOM-LOST-1. Decomposed but **not diagnosed**:
about 45 px is a pan target that was never going to put the anchor there (a clamp or a shift composed
after the guarantee), and about 59 px is the pan lerp not having arrived.

`companyGuarantee`, `corridorGuarantee`, `pointGuarantee`, `pairGuarantee` and `contenderGuarantee`
all measure their room from `anchorAt`. **Every one of them is therefore planning from a screen
position the delivered frame does not have.** This repair does not touch it, and the residual in §4
is the size of what it costs the company guarantee alone. **It is its own piece and its own decision.**

---

## Limits

**One instrument, one machine.** Ten tracks at N=30, four at N=300, 20 racers, track-default racers,
the harness's fixed camera seed. The two arms are the two **trees** — the instrument has no flag that
could switch the behaviour, deliberately, because a flag that silently reached nothing is the trap
this arc has hit twice — and frames are matched by `(seed, frame)`, which the identical frame counts
justify.

**`in-shot` counts racer centres on the canvas.** The guarantee promises them inside a tighter region
(`COMPANY_FRAME_PCT`), so this measure is *looser* than the guarantee's own: a frame counted as
keeping the promise here might still have a racer outside the promised region. It is the measure the
owner would use by eye, which is why it is the one reported.

**No eye test yet.** The camera fingerprint moved, so the picture genuinely changed; whether it looks
right is his, and that is what 4173 is for.
