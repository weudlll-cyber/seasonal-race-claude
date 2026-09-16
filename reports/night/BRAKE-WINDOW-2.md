# BRAKE-WINDOW-2 — 200 ms against 1000 ms, re-run at his settings with V1 OFF, and what a viewer would see

Branch `feat/gap-leader-brake`. Date: 2026-09-16. **Read-only measurement: the shipped default was
not changed. Nothing minted, nothing merged.** The owner's store was not opened.

---

## ★ THE SHORT ANSWER

**200 ms is better, on every track, and it costs nothing a viewer can see. I would still put
1000 ms in front of him tonight** — because 1000 ms is a quantity the engine already holds and
200 ms is a number with no home, and tonight's decision is whether the brake lands at all.

★★ **The number 200 is NOT DERIVED.** 1000 ms is `trajectoryTransitionDuration × 1000` — the ease
every trajectory target in this engine already travels over
([racePlanner.js:414-416](../../client/src/modules/racePlanner.js#L414-L416)). 200 ms comes from a
measurement of physics jitter, not from any quantity the engine holds, and **it has no config key**:
the window is derived, so adopting 200 ms means inventing a constant *and* adding a key to carry it.

---

## HOW IT WAS MEASURED

Three arms, **10 tracks × seeds 1–30 = 300 races each**, 40 racers, owner's roster, action stage
`wild`, brake at his settings (**90 px / 0.95 / 10% / rate law**), **V1 OFF in all three**.

★ **How the window was varied, and why not the obvious way.** The plan derives the window from
`trajectoryTransitionDuration`, but that key **also** drives the trajectory ease itself
([raceCore.js:587](../../client/src/modules/raceCore.js#L587), `TT_DUR_MS`). Setting it to 0.2 would
change the servo as well and confound the comparison. So the 200 ms arm is a **probe copy** of the
tree with `_gapBrakeRateWindowMs` forced at that one line, and nothing else differs between the arms.
**The real tree was never patched.**

---

## THE NUMBERS

### Pooled, N = 300 races per arm

| arm | in-window max: median | p90 | **MAX** | largest single-step multiplier move | **largest one-frame speed change** | direction changes/s |
|---|---|---|---|---|---|---|
| brake OFF | 81.4 | 159.3 | **244.4 px** | 0.011762 | 206.62 px/s | 0.00 |
| **1000 ms** | 81.4 | 156.1 | **227.6 px** | **0.011762** | **206.62 px/s** | 0.29 |
| **200 ms** | 81.4 | **152.6** | **208.3 px** | **0.011762** | **206.62 px/s** | 0.44 |

★ This reproduces BRAKE-WINDOW-1's headline exactly — **244.4 → 208.3 px** — from an independently
written harness, which is the check that the instrument is wired right.

★★ **The median is unchanged on all three arms (81.4 px).** The brake does not touch the ordinary
race; the whole of its effect is in the tail, which is what a fallback brake should do.

### Per race, against brake OFF

| arm | better | **worse** |
|---|---|---|
| 1000 ms | 40 of 300 | **1** |
| **200 ms** | **56 of 300** | **0** |

### Per track — the worst race, which is the number the brake exists to reduce

| track | brake OFF | 1000 ms | **200 ms** |
|---|---|---|---|
| city-circuit | 208.1 | 201.5 | **195.9** |
| dirt-oval | 242.9 | 211.9 | **206.6** |
| garden-path | 182.3 | 178.9 | **174.1** |
| ice-track | 206.3 | 193.5 | **176.0** |
| luger-hill | **244.4** | 227.6 | **208.3** |
| mountainstreet | 147.2 | 147.2 | **146.5** |
| river-run | 157.5 | 156.8 | **154.8** |
| searound | 216.4 | 182.2 | **173.7** |
| seatrack | 207.1 | 201.9 | **189.6** |
| space-sprint | 196.5 | 178.0 | **170.3** |

★ **200 ms wins on 10 of 10 tracks. 1000 ms on 0. No ties.** It is monotone: every track improves as
the window shortens, exactly as measured before.
★ **mountainstreet is where 1000 ms does nothing at all** (147.2 → 147.2) — its worst race never
grows a gap the brake can hold.

### What the brake actually did

| | 1000 ms | 200 ms |
|---|---|---|
| races where it **commanded** | **137 / 300** | **137 / 300** |
| races where it was **obeyed** (its command was the one taken) | 59 / 300 | **66 / 300** |
| when obeyed: median / max duration | 4.40 s / 14.06 s | 4.40 s / 14.05 s |
| deepest strength reached | **0.1000** (the full ceiling) | **0.1000** |

★ **It commands in 137 races and is obeyed in 59–66.** The difference is the fold at
[racePlanner.js:1424-1427](../../client/src/modules/racePlanner.js#L1424-L1427): `Math.min` takes the
slower of the servo's target and the brake's, so the brake is often engaged and silent because the
leader's own servo is already pulling harder than the gap warrants. **A brake that is obeyed in one
race in five is a fallback, not a governor** — which is what it was asked to be.

---

## ★ WHAT A VIEWER WOULD SEE — NOTHING

| measure | brake OFF | 1000 ms | 200 ms |
|---|---|---|---|
| largest single-step multiplier move | 0.011762 | **0.011762** | **0.011762** |
| **largest one-frame speed change** | 206.62 px/s | **206.62 px/s** | **206.62 px/s** |

★★ **Identical to six decimals on all three arms, and identical on all ten tracks individually.** The
gap brake **alone** — at either window — does not move either abruptness measure at all. The largest
one-frame speed change in the whole 300-race set is set by mechanisms the brake never touches: the
game's own drafting boost (`1.04`, applied in one frame with no ease,
[raceCore.js:669](../../client/src/modules/raceCore.js#L669)) and avoidance brake (`0.945`,
[raceCore.js:676-678](../../client/src/modules/raceCore.js#L676-L678)).

★ **This is the opposite of the combined arm.** With V1 on, the pair reached 0.089471 — 7.6× the
shipped maximum (BRAKE-JERK-1). **The brake alone reaches 1.000×.** The danger was never the brake.

### The cost of the shorter window, stated plainly

**Direction changes rise from 0.29/s to 0.44/s — about +52%.** A shorter window chases the gap more
closely, so the brake's command reverses more often. It is not visible on either abruptness measure
above, but it is the one thing that genuinely gets busier, and it is the reason not to go shorter
still.

---

## ★ WHICH WINDOW I WOULD PUT IN FRONT OF HIM

**1000 ms — for tonight's decision.** Reasons, in order:

1. **It is derived and 200 ms is not.** 1000 ms *is* `trajectoryTransitionDuration`, the interval the
   brake's own command already travels over. 200 ms would be a constant with no home in the engine —
   the nearest existing 200 ms is `laneTargetEaseMs`, which belongs to lateral steering and would
   couple two unrelated mechanisms.
2. **It needs no new key.** The window is derived, so 200 ms cannot be configured — shipping it means
   a new config key, a dev-screen control, a validation rule and a default. That is a second decision
   bolted onto the first, and tonight's question is whether the brake lands at all.
3. **It already does the job**: worst race **244.4 → 227.6 px**, better on 40 races, worse on 1.
4. **The gap between the two is tail-only and invisible**: 19.3 px on the worst of 300 races, with
   both abruptness measures identical.

**And the honest other side:** on the evidence 200 ms is simply better — **10 of 10 tracks, better on
56 races and worse on 0**, against 1000 ms's 40-and-1. If he wants those 19 px, the measurement
supports it and the only cost is the magic number, the key, and 52% more direction changes. **That
trade is his to make; the shipped default is untouched.**

---

## WHAT THIS DOES NOT SETTLE

- N = 300 races per arm (10 tracks × seeds 1–30). The per-track worst race is a **single race** each;
  the 10-of-10 sweep is what carries the finding, not any one number.
- Only 200 ms and 1000 ms were run tonight. BRAKE-WINDOW-1 measured 400 ms too and found it between
  them; it is not re-measured here.
- "What a viewer would see" is measured as the largest one-frame speed change in world px/s. It is
  not an eye, and BRAKE-JERK-1's caveat stands: a percentile is not a viewer.
- The 200 ms arm is a probe copy, not a configuration. **There is no way to run 200 ms from the dev
  screen today.**
