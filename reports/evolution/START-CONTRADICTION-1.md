# START-CONTRADICTION-1 — neither account is wrong, and the overlay is what fused them

**Branch:** `docs/start-contradiction-1`, off master `9f245cf9`. **INVESTIGATION ONLY.** No fix, no
camera change, no new mechanism. The only edit outside the report is three flags on the committed
diag `scripts/diag/start-frame-capture.mjs` — the config source, the anchor table, and the
`panProgress` reference — because the table this brief asks for is one nothing printed.

## THE ANSWER, FIRST

**Neither account is wrong. They are about different quantities, and `pan 100%` is why they looked
like one.** OVERVIEW-AIM-1 described the **anchor**. Your screenshots show the **delivered picture**.
In the window you photographed those two are up to **138 world px apart**, and the overlay's `pan`
said they were not.

**But OVERVIEW-AIM-1 answered a question about a different moment, and that part does not survive.**
Its headline event is at 3.0 s. **Your screenshots are of the first 700 ms**, where it reported
"the camera moves 0.1 world px at the gun" — true of the first frame only, and it left the reader
with "nothing happens at the gun". **Within 400 ms the camera centre travels 187 world px.** That
number was never reported. It is now.

## 1 · THE CONFIGURATION — A REAL HAZARD, AND NOT THE CAUSE HERE

**The harness builds from `DEFAULT_CAMERA_CONFIG`.** It has no browser storage and never reads any.
That is now printed by the tool itself rather than left to be assumed.

**It is not the divergence, and that is measured rather than argued.** A config carrying the thirteen
cosmetic keys you named — `postStartHoldMs: 7000`, the whole ceremony beat set, the overlay keys —
produces a table **identical to the last digit**, every row, every column.

Why it cannot matter, in the source:

| your key                    | what it can reach in this window                                        |
| --------------------------- | ------------------------------------------------------------------------ |
| the ceremony beat set        | **when the gun fires in wall-clock, not `raceElapsed`** — which restarts at the gun in the browser (`RaceScreen/index.jsx:891`, `st.raceStart = ts`) exactly as in the harness |
| `postStartHoldMs: 7000`      | which STATE is chosen **after** 3000 ms. It is also the shipped default.  |
| the overlay/cosmetic keys    | nothing in the camera                                                     |
| **`OVERVIEW.minStateHold`**  | **the one key that reaches this window** — it sets the 4983 ms hand-over. It does not touch the anchor. |

**`START_PHASE_DURATION` is a hard constant** (`CameraDirector.js:122`) and no config key reaches it.

**The hazard is still live and worth keeping:** a stored config beats `defaults.js` per key, forever.
It simply is not what made these two accounts differ.

## 2 · THE FRAME TABLE — dirt-oval, seed 9, 20 racers, race plan ON

`resid` is the distance between the anchor the director **recorded on its own probe** and the named
code path's candidate point — so the path is checked, not asserted. `cam-tgt` is world px.

```
   ms anchor path               resid   field centroid      pan target   camera centre          leader    cam-tgt   lag(px)  pan%  panRef   zoom camT
    0 start-phase centroid        0.0       (1498,436)      (1498,436)      (1509,440)      (1525,520)         11      -8,0  100%       0  8.383 null
  100 start-phase centroid        0.0       (1512,436)      (1512,436)      (1584,461)      (1541,519)         71    195,61  100%       0  7.963 null
  200 start-phase centroid        0.0       (1527,436)      (1527,436)      (1641,477)      (1557,517)        114   330,103  100%       0  7.620 null
  300 start-phase centroid        0.0       (1541,436)      (1541,436)      (1680,487)      (1572,512)        138   401,127  100%       0  7.361 null
  400 start-phase centroid        0.0       (1558,435)      (1558,435)      (1696,489)      (1591,505)        138   402,134  100%       0  7.202 null
  500 start-phase centroid        0.0       (1572,435)      (1572,435)      (1689,485)      (1607,500)        117   346,125  100%       0  7.148 null
  600 start-phase centroid        0.0       (1586,435)      (1586,435)      (1672,477)      (1622,496)         86   258,107  100%       0  7.155 null
  700 start-phase centroid        0.0       (1600,435)      (1600,435)      (1655,470)      (1638,493)         55    168,89  100%       0  7.182 null
 1000 start-phase centroid        0.0       (1642,435)      (1642,435)      (1641,456)      (1688,493)         -1     -5,54  100%       0  7.202 null
 1400 start-phase centroid        0.0       (1698,434)      (1698,434)      (1652,445)      (1754,492)        -46   -137,28   97%       0  7.222 null
```

**This is your race.** Your CAM DIAG against these rows:

| reading | your build (583–683 ms) | this run                                  |
| ------- | ----------------------- | ----------------------------------------- |
| `tgt`   | (1558, 429) / (1546, 422) | **(1558, 435)** at 400 ms                 |
| `cam`   | (1682, 481) / (1662, 473) | **(1689, 485)** at 500 ms, (1672,477) at 600 |
| `lag`   | (302, 116) / (205, 96)    | (346, 125) at 500 ms, **(258, 107)** at 600 |
| `pan`   | 100%                      | **100%**                                  |

**Every number lands inside a two-frame window of the harness's.** The harness and your build are
running the same race.

## 3 · THE ONE SENTENCE

**At 600 ms the camera is NOT on the field centroid: the ANCHOR is the centroid exactly — residual
0.0 world px — while the camera's centre sits 86 world px past it, and 138 px past it at 400 ms, so
the camera is not "on" any subject at all; it is a lerped position still chasing a target offset that
the easing zoom keeps moving.**

That is why the field is at your start line and the camera is up the track: the field is drawn around
the anchor, which is ~300 screen px left of frame centre at that zoom.

## 4 · THE THREE NUMBERS — TWO ARE THE SAME, ONE IS MISLABELLED

**`lag (302,116) px`** — `targetOffsetX/Y − offsetX/Y` (`CameraDiagnosticsHUD.jsx:100-101`), in
**screen/offset px**. The real gap.

**`Δ = cam − tgt = −124 px`** — **the same gap, in WORLD px.** `tgt` is
`(CANVAS_W/2 − targetOffsetX) / targEffZoom` (`:237`) and `cam` is that with the live zoom. 302 screen
px ÷ effZoomX ≈ 124 world px. **They do not disagree; they are one quantity in two units**, and the
small residual is that `tgt` divides by the TARGET zoom while `cam` divides by the LIVE one — which
differ precisely while the zoom is easing, as it is here.

**`pan 100%` — NOT AN ARRIVAL INDICATOR, AND THIS IS THE FINDING.** `panProgress`
(`CameraDirectorDiag.js:244-252`) is

```
min(1,  |offset − _transitionStartOffset|  /  |targetOffset − _transitionStartOffset| )
```

— a ratio of distances measured **from the last STATE TRANSITION**. `_transitionStartOffsetX` is
written only under `state !== prevState` (`CameraDirector.js:891`) and initialised to **0** in the
constructor (`:261`). **There is no state change anywhere in the start window**, so it is still 0 —
measured, not deduced: the `panRef` column above reads `0` on every frame. The ratio is therefore
`|offset| / |targetOffset|`, two numbers of order 10³, and it reads **100% while the real gap is
402 px**.

**`pan` reads as "the pan has arrived". It means "the camera has travelled as far as the current
state's first frame asked for", clamped to 1, against a reference this window never sets.** You and I
both read it as arrival. It is the single reason the two accounts looked contradictory, and it is
worth fixing in the overlay before either of us reads it again.

## 5 · WHICH EARLIER CONCLUSIONS SURVIVE, AND WHICH DO NOT

**SURVIVE — and are now confirmed on your exact seed, under both configs:**

- The anchor from the gun to 3000 ms is **the field's centroid** — residual **0.0 world px** against
  the director's own probe, on every frame.
- It switches to **the leader** at 3000 ms.
- `_camT` is **null** for the whole window (the `camT` column), so the entry-phase T-space smoothing
  branch cannot run — OVERVIEW-AIM-1's central finding.
- `leaderForwardFrac` does not act in this window.
- The world-centre reading stays **refuted**.

**WITHDRAWN:**

- **"The camera moves 0.1 world px at the gun."** True of the FIRST FRAME only, and measured on a
  different seed (5601) with `gun-window-truth`, which reports **ALONG-track travel since the last
  ceremony frame** — not stillness. **The impression it left, that nothing happens at the gun, is
  withdrawn: the camera centre travels 187 world px within 400 ms.**
- **"The step is at 3.0 s."** Downgraded from *the* step to *a* step. There are two, and the earlier
  one is the one you photographed. The 3 s event is real — the `lag` spike is in both accounts — but
  naming it *the* forward rush was wrong.

**NOT OFFERED, because the brief forbids a fourth mechanism and I have not earned one:** the pan
excursion and the zoom excursion occupy the same frames — the zoom eases 8.383 → 7.148 and back to
7.222 exactly while `cam-tgt` runs 11 → 138 → −1. **That is a correlation in one table on one track,
not a cause**, and what would settle it is a single run with the zoom held fixed. I have not run it.

## FINGERPRINTS

**Nothing that can move a fingerprint changed.** The only non-report edit is
`scripts/diag/start-frame-capture.mjs`, and the closure walk puts it inside **none** of the four
instruments (WORLD/WORLD-OFF 36, CAMERA 36, RENDER 53). **Nothing minted.** The build on 4173 was not
touched.

## PROPOSALS

1. **Relabel or repair `pan%` in the CAM DIAG.** Either reset `_transitionStartOffset` when the
   ceremony hands over, or rename it to what it measures. It is the only number on that overlay that
   can be read as "arrived" while the camera is 402 px away, and it has now misled two readings in a
   row.
