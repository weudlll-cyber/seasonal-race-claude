# CONTENTION-WATCH-1 — the camera keeps asking who can still win

**Branch:** `exp/endgame-schedule`. **Not merged. Nothing minted.**
**Behind `contentionWatch`, default `false` — today's behaviour is what ships until your eye says otherwise.**

---

## 0. Lead — the three numbers

> **1 — HOW OFTEN A RACER DROPS OUT.**
> **76 of 80 races see at least one; 4 see no change at all.** 5327 releases in total across those
> 80 races — most of them racers the framing never held, since a 100-strong field is almost entirely
> out of contention by 95%. The drop happens at race progress **0.9525 (min) / 0.9586 (median) /
> 0.9836 (max)** — i.e. right at the top of the window, which is where the question first has an
> answer. **0 to 38 checks per race.**
>
> **2 — THE 14 FRAMES ON SPACE-SPRINT SEED 9 WITH NO FINISH LINE ON CANVAS.**
> **0% → 72.5% of the band visible** (min 71.1%, max 74.1%). **That is the test of whether this is
> the cause, and it passes.**
>
> **3 — THE LARGEST SINGLE-FRAME ZOOM STEP.**
> **0.0792 → 0.0561 ln** (worst of nine tracks, shipped defaults). It **improves**; it does not cost.

---

## 1. The design, and where each part comes from

**The question, asked on a cadence:** can this racer still WIN, judged from what is visible on track?

```
remaining     = (finishT - leader.t) × pathLengthPx      world px the leader has left
msToLine      = remaining / leaderSpeed                  at the speed he is running
projectedGap  = gapNow + (leaderSpeed - racerSpeed) × msToLine
out           ⟺  projectedGap > one body length
```

`pathLengthPx`, `drawnBodyLengthPx` and `t` are all quantities **the race** puts on a racer, and "one
body length" is `pairContact`'s own along-track touch distance — **the identical expression
`_abreastContenders` already uses** for "nearly level with the leader".

**It never reads the race plan.** Your instruction, and the reason is not caution: the plan knows the
outcome, and a camera that drops a racer who still looks close on screen would be spoiling the
result. Every quantity above is visible to the viewer too. An estimate that is occasionally wrong
because somebody rallies is the correct trade.

### Why it cannot oscillate — structurally, not by observation

**The verdict is ONE-WAY.** `_contentionOut` is a Set that is only ever added to, cleared only when a
new race resets the director. A racer's state can change **at most once per race**, from in to out.
Flicker is not a shape this can take — not because it was measured not to, but because **there is no
code path that removes a member**. FINISH-PAIR-1's pin is preserved rather than re-litigated: the
pair is still pinned, and this only ever *removes* from it.

**A release needs the verdict twice running.** One-way means a single bad estimate is permanent, so a
racer judged out waits in `_contentionPending` and is released only if the next check agrees. A racer
who recovers in between simply falls out of pending — the one place this design is two-way, and safe
because it decides nothing on its own.

### The one new number, named rather than buried

**`contentionCheckMs = 250`.** It is the cadence *and* the interval the speed estimate is measured
over, so it was chosen against the estimate's own stability. Measured on space-sprint seed 9, the
coefficient of variation of a trailing racer's rate:

| interval | 33 ms | 200 ms | 400 ms | 1067 ms |
| --- | ---: | ---: | ---: | ---: |
| CV | 26.5% | 12.2% | 6.9% | 2.9% |

Below ~200 ms the estimate is dominated by the physics' own per-frame jitter — the same jitter
ENDGAME-SCHEDULE-2 measured at 2.0× the median advance in a single frame. Above ~500 ms the window
(~4–5 s) affords only a handful of checks. **250 ms sits between them and gives ~17 checks per
window.** Cost: one O(n) pass per check, 0–38 checks per race, and one comparison per frame outside
the window.

**Nothing else is new.** The release ease uses `runInOpenMs` — the owner's own 1–1.5 s, the span the
endgame's opening move already occupies — and the ease is the same smoothstep the schedule uses, so
the rate is continuous at both ends and nothing steps. That is requirement 6 applied to this move
rather than restated for it.

### The gradual shift — one blend moves both things

A released racer is not dropped from the set; his **framing position eases to the leader's**. At
weight 0 he is the leader in every respect the camera can see, so he constrains nothing and pulls
nothing, while the race's own copy of him is untouched.

> **THE FIRST CUT EASED `x` AND `y` AND MOVED NOTHING** — the picture was byte-identical with the
> watch on. `getPanTarget` computes a pair's midpoint from **`t`**: `shape.getPosition((r0.t + r1.t)
> / 2, 0)`, deliberately, so the point stays on the racing line instead of cutting across the
> infield. The pan never saw the blend. The ease now covers every field the framing reads — `t` for
> the pan and the heading, `x`/`y` for the contender guarantee, `physicalY` for the lateral one.

**Scope:** 95% to the crossing. `_contentionEased` is the identity outside it, so every earlier
battle, lead change and leader shot is untouched.

---

## 2. Before and after — 80 races, ten tracks, both field sizes, both configs, seeds 1/2/3/9

Real browser, production build, browser's own camera seed.

| | **switch OFF (today)** | **switch ON** |
| --- | ---: | ---: |
| **invariant 3** — frames outside the region | **13540** | **9718** |
| worst margin | 229 px | 231 px |
| races with no violation at all | 14 of 80 | **21 of 80** |
| per race | — | **47 better, 4 worse, 29 unchanged** |
| **invariant 1** — course in shot | 0 | **0** |
| **invariant 2** — leader in shot | 4 | **0** |
| **invariant 4** — width step / pan step | 0 / 0 | **0 / 0** |
| **invariant 5** — width band | 0 | **0** |

**Nothing that had to hold gave way, and invariant 2 improved** — the four leader-off frames the OFF
arm still carried are gone.

### The regression measures, headless, shipped defaults

| track | largest step OFF → ON | arrival | monotonic |
| --- | ---: | ---: | :---: |
| city-circuit | 0.0338 → 0.0376 | 0% | ok |
| dirt-oval | 0.0373 → 0.0373 | 0% | ok |
| **ice-track** | **0.0370 → 0.0190** | 0% | ok |
| luger-hill | 0.0175 → 0.0175 | 0% | ok |
| mountainstreet | 0.0148 → 0.0148 | 0% | ok |
| river-run | 0.0183 → 0.0183 | 0% | ok |
| **searound** | **0.0340 → 0.0157** | 0% | ok |
| seatrack | 0.0192 → 0.0192 | 0% | ok |
| **space-sprint** | **0.0792 → 0.0561** | 0% | ok |
| **worst of nine** | **0.0792 → 0.0561** | **0%** | **9/9** |

Arrival at the leader-view or photo-finish factor is **0% error on every track, both arms**. Widest
frame unchanged. Clipping falls on five tracks. **city-circuit is the one track whose step gets
slightly worse** — 0.0338 → 0.0376, which is 24 screen px at the frame edge against 22.

---

## 3. The trade this exposes, stated rather than smoothed over

On space-sprint seed 9 the switch **fixes the 14 frames it was aimed at** — 0% → 72.5% of the band —
and **costs 11 frames slightly earlier**, at 99.3–99.5%, which go from 82–100% visible to 0%.

**The mechanism, measured:** the anchor barely moves (647 → 650 px). What changes is the **width**.
With #38 released, the contender guarantee no longer has to hold him, so the shot is free to close
sooner: 1.73 → 1.12 corridors with the switch off, 1.27 → 0.78 with it on. A tighter shot shows less
of the band.

**So the band's visibility in that stretch is a WIDTH question, and the schedule's floor does not
govern it** — the floor guarantees the line's *centre point* inside the region, which permits the
band's ends to be off canvas. Net on that race: 244 → 215 frames outside the region, 14 → 11 with
nothing of the band on screen. Net across 80 races: a 28% reduction. **A clear improvement, not a
clean sweep.**

---

## 4. The repair that rode along, and what it changed

`check-runin-frame`'s band sampler multiplied a **normalised** half-offset by `trackWidthPx` —
`shape.getPosition(t, lateral)` takes a track-relative half-offset, as `raceCore`'s
`getPosition(t, r.physicalY / 2)` shows, so the corridor edges are −0.5 and +0.5. It was walking a
segment **300× too long** and taking the best point of a line that mostly does not exist, which made
its OFF-CANVAS column far too lenient.

**Fixed.** On the repaired guard, space-sprint's off-canvas count reads **16**, not the 27 the broken
sampler reported. Nine of ten tracks are clean with 0 off canvas; space-sprint is the one failure.

**The band-visible table in ENDGAME-WHO-AND-HOWMUCH needed no recomputation** — that table was
produced by the probe *after* I corrected the same bug inside that block, and re-running it here
reproduces it: 204 frames at 100%, median 100%, 14 at 0%. The guard was the copy left unfixed.

---

## 5. What is not established

- **Whether 250 ms is the right cadence for his eye.** It is right for the *estimate*; whether the
  shift begins at a moment that reads well is a question only he can answer.
- **Whether the 11 frames the switch costs matter more or less than the 14 it gains.** They are at
  different moments — the loss is at 99.3%, the gain at 99.7–99.9%, closer to the line.
- **Whether the width should be held wider through that stretch.** That would be a change to the
  schedule's floor — guaranteeing some share of the *band* rather than the line's centre point — and
  it is not built here.

---

## 6. Fingerprints, tests, hygiene

**Default is `false`, so no behaviour changes and no fingerprint can move. All four measured to
confirm rather than asserted:**

| role | recorded | measured | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unmoved |
| world-off | `854018ee5d3d83e1` | `854018ee5d3d83e1` | unmoved |
| camera | `9190967072af639e`¹ | `9190967072af639e` | unmoved |
| render | `2e8eae1d5ef7c7be`¹ | `2e8eae1d5ef7c7be` | unmoved |

¹ the values VIEWER-INVARIANTS-2 measured and did not mint; `docs/fingerprints.json` still records
the pre-branch pair, and nothing on this branch has been minted.

**Camera suite 894 passing.** The two new keys are read in `cameraTimingComputation.js`, which is the
whitelist a key must appear in to reach the director at all — a key that is only in `defaults.js`
never arrives, which is how the first build of this ran with the switch silently off.
