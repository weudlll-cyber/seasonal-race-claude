# GAP-BRAKE-WINDOW-1 — the largest lead from the window start to the line

**Read-only.** No source file was changed, nothing built, nothing minted, nothing merged. Measured on
`feat/gap-leader-brake` at `dde2a280`. Date: 2026-09-14. **The owner's store was not opened at all.**

**Settings, identical to GAP-BRAKE-SWEEP-1 and used verbatim:** `gapBrakeEnabled: true`,
`gapBrakeAllowedGapPx: 124`, `gapBrakeWindowEnd: 0.95`. The window start is not a setting — it is
bound to the outcome-phase boundary at
[racePlanner.js:174-176](../../client/src/modules/racePlanner.js#L174-L176) and the engine resolved
it to **0.600** in every race. Ten tracks × seeds 1–30 × two arms = **600 races, 0 failed**.

---

## STEP 1 — I RE-RACED, AND WHY

GAP-BRAKE-SWEEP-1's raw output survives: **20 JSON files at `C:/tmp/sweep/out`**, one per track per
arm, 117–122 KB each. I checked them first. **They cannot answer this question**, for three reasons:

1. The per-race maxima they kept (`peakPx`, `peakPxAtP`) are **whole-race**. That is precisely the
   column the owner has set aside.
2. The one window-restricted figure in them, `brake.maxGapPxInWindow`, **exists on the ON arm only**.
   On the OFF arm `_computeGapLeaderBrake` returns at
   [racePlanner.js:721](../../client/src/modules/racePlanner.js#L721) —
   `if (!plan._gapBrakeEnabled) return null;` — before any counter is touched, so the OFF column is
   structurally `0`. Verified in the files: OFF `windowFrames` = 0, `maxGapPxInWindow` = 0.
3. Nothing in them tracks the **0.95 → finish** segment on either arm.

So, per the decision rule, **the identical sweep was re-raced** — same ten tracks, same seeds 1–30,
40 racers, the owner's roster, `wild`, same settings, window start resolved from the outcome
quantity. Five independent checkouts of `249b61df`, each running its tracks sequentially;
parallelism never shared a tree. **Every number in this report comes from that re-race. None is
mixed with GAP-BRAKE-SWEEP-1's figures.**

---

## THE NOISE FLOOR — it is exactly zero

**221 of 300 race pairs never saw the brake fire. All 221 are byte-identical between the arms** —
same 40 names, same 40 finishing times, and the window-restricted maximum agrees to the last bit.
Largest difference among them: **0.000000 px**.

★ **So the floor is 0.** Any nonzero movement below is a real consequence of the brake, not
measurement noise. That is a stronger footing than the decision rule required, and it is what makes
the −0.0 and +0.0 entries below meaningful rather than rounding.

---

## STEP 2 — THE WINDOW-RESTRICTED MAXIMUM

Primary unit is **world px**. Per-race figure = the largest leader→2nd gap in that segment, taken
before the first finisher. N=30 per track per arm.

### 0.600 → finish — **the owner's question**

| track | med OFF → ON | Δ | p90 OFF → ON | Δ | max OFF → ON | Δ | Δ% on max |
|---|---|---|---|---|---|---|---|
| city-circuit | 113.2 → 113.2 | +0.0 | 173.8 → 174.5 | +0.7 | 208.1 → 208.1 | −0.1 | −0.0% |
| dirt-oval | 106.3 → 106.3 | +0.0 | 178.7 → 179.7 | +1.0 | 242.9 → 242.6 | −0.4 | −0.2% |
| garden-path | 96.5 → 96.5 | +0.0 | 159.7 → 159.7 | +0.0 | 182.3 → 182.3 | −0.0 | −0.0% |
| ice-track | 81.0 → 81.0 | +0.0 | 177.5 → 178.4 | +0.9 | 205.9 → **211.9** | **+6.0** | **+2.9%** |
| luger-hill | 99.9 → 99.9 | +0.0 | 162.0 → 162.0 | −0.0 | 244.4 → **246.2** | **+1.8** | +0.7% |
| mountainstreet | 73.1 → 73.1 | +0.0 | 133.0 → 133.0 | +0.0 | 160.2 → 160.2 | +0.0 | +0.0% |
| river-run | 66.7 → 66.7 | +0.0 | 150.3 → 150.3 | +0.0 | 157.5 → 157.5 | +0.0 | +0.0% |
| searound | 107.0 → 107.0 | +0.0 | 191.1 → 191.1 | −0.0 | 216.4 → 216.3 | −0.0 | −0.0% |
| seatrack | 87.8 → 87.8 | +0.0 | 184.7 → 186.2 | +1.5 | 207.1 → **210.3** | **+3.3** | +1.6% |
| space-sprint | 112.3 → 112.3 | +0.0 | 170.3 → 172.2 | +1.8 | 196.5 → **227.3** | **+30.8** | **+15.7%** |

**Not one median moved.** Not one p90 improved; six got slightly worse.

### 0.600 → 0.95 — where the brake has authority

| track | med OFF → ON | Δ | p90 OFF → ON | Δ | max OFF → ON | Δ |
|---|---|---|---|---|---|---|
| city-circuit | 96.2 → 96.2 | +0.0 | 173.8 → 174.5 | +0.7 | 208.1 → 208.1 | −0.1 |
| dirt-oval | 104.6 → 104.6 | +0.0 | 178.7 → 179.7 | +1.0 | 242.9 → 242.6 | −0.4 |
| garden-path | 87.9 → 87.9 | +0.0 | 158.9 → 158.8 | −0.1 | 182.3 → 182.3 | −0.0 |
| ice-track | 79.7 → 79.7 | +0.0 | 177.5 → 178.4 | +0.9 | 205.9 → 211.9 | +6.0 |
| luger-hill | 93.0 → 93.0 | +0.0 | 162.0 → 162.0 | −0.0 | 244.4 → 246.2 | +1.8 |
| mountainstreet | 73.1 → 73.1 | +0.0 | 130.9 → 130.9 | +0.0 | 147.2 → 147.2 | +0.0 |
| river-run | 61.6 → 61.6 | +0.0 | 150.3 → 150.3 | +0.0 | 157.5 → 157.5 | +0.0 |
| searound | 107.0 → 107.0 | +0.0 | 184.2 → **178.8** | **−5.4** | 216.4 → 216.3 | −0.0 |
| seatrack | 81.4 → 81.4 | +0.0 | 184.7 → 186.2 | +1.5 | 207.1 → 210.3 | +3.3 |
| space-sprint | 103.4 → 103.4 | +0.0 | 170.3 → 172.2 | +1.8 | 196.5 → 227.3 | +30.8 |

### 0.95 → finish — the run-out the brake deliberately leaves alone

| track | med OFF → ON | Δ | p90 OFF → ON | Δ | max OFF → ON | Δ |
|---|---|---|---|---|---|---|
| city-circuit | 48.1 → 49.4 | +1.3 | 123.7 → 123.7 | +0.0 | 164.3 → **160.3** | **−4.0** |
| dirt-oval | 48.0 → 48.0 | +0.0 | 106.2 → 109.2 | +3.0 | 116.3 → **151.1** | **+34.8** |
| garden-path | 47.6 → 47.6 | +0.0 | 138.1 → 138.1 | +0.0 | 169.3 → 169.7 | +0.4 |
| ice-track | 53.0 → 53.0 | +0.0 | 117.2 → 117.4 | +0.2 | 138.9 → **169.1** | **+30.2** |
| luger-hill | 52.3 → 52.3 | +0.0 | 115.3 → 127.5 | +12.2 | 148.0 → 147.5 | −0.5 |
| mountainstreet | 38.6 → 38.6 | +0.0 | 133.0 → 133.0 | +0.0 | 160.2 → 160.2 | +0.0 |
| river-run | 43.7 → 43.7 | +0.0 | 80.5 → 80.5 | +0.0 | 134.2 → 134.2 | +0.0 |
| searound | 57.2 → **53.7** | **−3.4** | 152.7 → 152.7 | +0.0 | 191.1 → 191.1 | −0.0 |
| seatrack | 41.9 → 41.9 | +0.0 | 94.1 → 94.1 | +0.0 | 172.2 → 172.2 | +0.0 |
| space-sprint | 65.2 → 64.2 | −1.0 | 157.0 → **131.6** | **−25.4** | 163.0 → 163.0 | +0.0 |

★ **The brake pushes some peaks past its own window end.** On dirt-oval the run-out maximum rises
**+34.8 px** and on ice-track **+30.2 px** — the leader is held inside 0.95 and reaches his biggest
gap just after the brake lets go.

### Canvas widths, as a secondary column — and why it cannot be the primary one

| track | max px OFF → ON | px/width at the OFF peak | px/width at the ON peak | max widths OFF → ON |
|---|---|---|---|---|
| city-circuit | 208.1 → 208.1 | 225.0 | 225.0 | 0.925 → 0.925 |
| dirt-oval | 242.9 → 242.6 | 165.0 | 165.0 | 1.472 → 1.470 |
| garden-path | 182.3 → 182.3 | 165.0 | 165.0 | 1.105 → 1.105 |
| ice-track | 205.9 → **211.9** | 165.0 | **355.1** | 1.248 → **0.597** |
| luger-hill | 244.4 → 246.2 | 165.0 | 165.0 | 1.481 → 1.492 |
| mountainstreet | 160.2 → 160.2 | 120.0 | 120.0 | 1.334 → 1.334 |
| river-run | 157.5 → 157.5 | 165.0 | 165.0 | 0.954 → 0.954 |
| searound | 216.4 → 216.3 | 165.0 | 165.0 | 1.311 → 1.311 |
| seatrack | 207.1 → 210.3 | 165.0 | 165.0 | 1.255 → 1.275 |
| space-sprint | 196.5 → **227.3** | 165.0 | **661.7** | 1.191 → **0.343** |

★★ **Read the ice-track and space-sprint rows carefully.** In world px both got **worse** (+6.0 and
+30.8). In canvas widths both look dramatically **better** (1.248 → 0.597; 1.191 → 0.343) — purely
because the camera happened to be pulled far out at the ON-arm peak (355 and 662 px per width against
165). The same event measured in the owner's unit reverses its sign. This is why world px is the
primary column and why a single conversion factor would have been a misrepresentation.

---

## STEP 3 — WHEN IT HAPPENS, AND WHETHER IT CLOSES

| track | progress of the max, med OFF → ON | worst race OFF → ON | races with max > 124 px OFF → ON | of those, still open at the line OFF → ON |
|---|---|---|---|---|
| city-circuit | 0.754 → 0.754 | 0.714 → 0.714 | 12 → 12 | 1 → 1 |
| dirt-oval | 0.810 → 0.810 | 0.755 → 0.755 | 9 → 9 | 0 → 0 |
| garden-path | 0.834 → 0.834 | 0.729 → 0.729 | 10 → 10 | 3 → 3 |
| ice-track | 0.793 → 0.793 | 0.769 → **0.927** | 7 → 7 | 0 → 0 |
| luger-hill | 0.835 → 0.835 | 0.847 → 0.847 | 11 → 11 | 1 → 1 |
| mountainstreet | 0.815 → 0.815 | 1.000 → 1.000 | 4 → 4 | 3 → 3 |
| river-run | 0.843 → 0.843 | 0.781 → 0.781 | 4 → 4 | 1 → 1 |
| searound | 0.837 → 0.837 | 0.815 → 0.815 | 11 → 11 | **4 → 3** |
| seatrack | 0.808 → 0.809 | 0.808 → 0.809 | 9 → 9 | 2 → 2 |
| space-sprint | 0.858 → 0.858 | 0.762 → **0.858** | 12 → 12 | **5 → 4** |

**The restricted maximum lands at a median progress of 0.754–0.858 — squarely inside the brake's
window — and the brake does not move that timing on any track.**

**Races whose restricted maximum exceeds the allowance: 89 → 89 of 300 — unchanged.** Of those, the
lead is **still above the allowance at the line in 20 → 18**. That is the only figure in this report
that improves in the direction the brake was built for: **two races out of 300** end with the lead
closed that previously did not (one on searound, one on space-sprint).

---

## HOW REPRESENTATIVE IS THE REST

| track | races with no in-window lead above the allowance | brake never fired |
|---|---|---|
| city-circuit | 19 of 30 | 19 of 30 |
| dirt-oval | 21 of 30 | 21 of 30 |
| garden-path | 23 of 30 | 23 of 30 |
| ice-track | 23 of 30 | 23 of 30 |
| luger-hill | 19 of 30 | 19 of 30 |
| mountainstreet | 27 of 30 | 27 of 30 |
| river-run | 27 of 30 | 27 of 30 |
| searound | 21 of 30 | 21 of 30 |
| seatrack | 21 of 30 | 21 of 30 |
| space-sprint | 20 of 30 | 20 of 30 |

**221 of 300 races (73.7%) never open a lead above the allowance inside the window — the brake has
nothing to do in three-quarters of all races.** The two columns agree exactly on every track, which
is the mechanism behaving as specified: it fires when and only when the gap exceeds the allowance
inside the window. Everything else in this report is about the remaining **79 races**.

---

## STEP 4 — DID IT GET BETTER, IN PLAIN WORDS

Judged against a floor of **0.000000 px**:

| track | max OFF → ON | Δ px | verdict |
|---|---|---|---|
| city-circuit | 208.1 → 208.1 | −0.1 | better, negligibly |
| dirt-oval | 242.9 → 242.6 | −0.4 | better, negligibly |
| garden-path | 182.3 → 182.3 | −0.0 | better, negligibly |
| searound | 216.4 → 216.3 | −0.0 | better, negligibly |
| mountainstreet | 160.2 → 160.2 | +0.0 | unchanged |
| river-run | 157.5 → 157.5 | +0.0 | unchanged |
| luger-hill | 244.4 → 246.2 | **+1.8** | **worse** |
| seatrack | 207.1 → 210.3 | **+3.3** | **worse** |
| ice-track | 205.9 → 211.9 | **+6.0** | **worse** |
| space-sprint | 196.5 → 227.3 | **+30.8** | **worse** |

**Pooled over all 300 race pairs:**

| segment | median OFF → ON | p90 OFF → ON | max OFF → ON |
|---|---|---|---|
| 0.600 → finish | **88.3 → 88.3** | **163.0 → 163.0** | 244.4 → **246.2** |
| 0.600 → 0.95 | 83.8 → 83.8 | 159.3 → 159.3 | 244.4 → **246.2** |
| 0.95 → finish | 47.7 → 47.7 | 115.3 → **110.5** | 191.1 → 191.1 |

### The one sentence

**The number the owner asked about has not improved at all** — pooled median and p90 are unchanged to
the tenth of a pixel, four tracks improved by a fraction of a pixel, two are unchanged and four got
worse, the worst by 30.8 px; across the 79 races where the brake actually fired the restricted
maximum fell by a total of **12.1 px** and rose by a total of **133.3 px**, a **net +121.2 px in the
wrong direction**.

---

## THE RACES THAT GOT WORSE

Of the 79 races in which the brake fired: **45 ended with the restricted maximum unchanged to the
last bit, 16 fell, 18 rose.**

| track | seed | 0.600→finish max OFF → ON | holder | brake |
|---|---|---|---|---|
| space-sprint | 2 | 170.3 → **227.3** (+57.0) | 20 → 20, **same** | fired 592 frames, in-window peak p=0.858 |
| dirt-oval | 2 | 181.4 → **225.7** (+44.2) | 20 → 20, **same** | fired 741 frames, in-window peak p=0.905 |
| ice-track | 3 | 196.6 → 211.9 (+15.3) | 16 → 16, same | fired 535 frames, p=0.927 |
| space-sprint | 14 | 196.5 → 199.8 (+3.3) | 32 → 32, same | fired 559 frames, p=0.762 |
| ice-track | 25 | 205.9 → 209.2 (+3.3) | 15 → 15, same | fired 312 frames, p=0.770 |
| seatrack | 2 | 207.1 → 210.3 (+3.3) | 17 → 17, same | fired 440 frames, p=0.809 |
| luger-hill | 24 | 244.4 → 246.2 (+1.8) | 3 → 3, same | fired 570 frames, p=0.847 |
| seatrack | 13 | 184.7 → 186.2 (+1.5) | 34 → 34, same | fired 433 frames, p=0.857 |
| dirt-oval | 13 | 178.7 → 179.7 (+1.0) | 37 → 37, same | fired 430 frames, p=0.865 |
| ice-track | 26 | 177.5 → 178.4 (+0.9) | 36 → 36, same | fired 270 frames, p=0.729 |
| city-circuit | 19 | 173.8 → 174.5 (+0.7) | 17 → 17, same | fired 326 frames, p=0.927 |
| garden-path | 3 | 169.3 → 169.7 (+0.4) | 38 → 38, same | fired 122 frames, p=0.950 |
| searound | 18 | 150.0 → 150.2 (+0.2) | 29 → 29, same | fired 193 frames, p=0.703 |
| searound | 7 | 199.5 → 199.6 (+0.1) | 39 → 39, same | fired 461 frames, p=0.808 |
| dirt-oval | 16 | 176.3 → 176.3 (+0.1) | 4 → 4, same | fired 509 frames, p=0.842 |
| city-circuit | 12 | 156.9 → 156.9 (+0.1) | 14 → 14, same | fired 210 frames, p=0.754 |
| city-circuit | 6 | 168.1 → 168.1 (+0.0) | 3 → 3, same | fired 236 frames, p=0.701 |
| space-sprint | 1 | 172.2 → 172.2 (+0.0) | 38 → 38, same | fired 361 frames, p=0.782 |

★ **In all 18, the bigger lead is held by the SAME racer as in the OFF arm — not one hand-over.** The
sweep's conclusion survives the restriction to this window: this is the brake being **outrun**, not
the lead passing to somebody it was not watching. On the two that matter it pulled for **592 and 741
frames** — 9.5 s and 11.9 s — and the gap grew regardless.

For contrast, the 16 improvements are all small: the largest is **−5.4 px** (searound seed 11), and
eleven of the sixteen are under 0.1 px.

---

## IF THE ANALYSIS POINTS AT A SETTING

**It does not point at either of the owner's two keys:** the peaks already land inside the window
(median progress 0.754–0.858), the brake already fires on them for 300–740 frames, and the gap grows
anyway — so the binding constraint is the correction's depth, floored at `minMult` 0.85
([racePlanner.js:99-104](../../client/src/modules/racePlanner.js#L99-L104)), which is not a setting
he has. Nothing was changed.

---

## WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **The OFF arm would have used its own 0.92 window.** The committed default `gapBrakeWindowEnd` is
  0.92 while the owner's setting is 0.95, so the instrument pins the window to 0.95 on *both* arms;
  otherwise the two columns would have been answering different questions.
- **`brake.maxGapPxInWindow` is ON-arm-only**, by the early return at
  [racePlanner.js:721](../../client/src/modules/racePlanner.js#L721). That is correct for a
  mechanism that must be inert when off, but it means the telemetry can never produce its own
  baseline — any before/after on it has to come from an external observer, as here. Not changed.
- The stale comments recorded in BRAKE-CENSUS-1 (`racePlanner.js:1235` "SIM-ONLY",
  `raceCore.js:578` "default OFF", the four stale windows in `docs/FORCE-MAP.md`) are still there.
- GAP-BRAKE-SWEEP-1's raw output at `C:/tmp/sweep/out` is scratch, outside the repository, and was
  left in place rather than deleted.
