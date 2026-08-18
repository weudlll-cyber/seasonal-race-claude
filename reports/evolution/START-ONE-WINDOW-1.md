# START-ONE-WINDOW-1 — one clock, one rule, ten seconds

**Branch:** `feat/start-one-window-1`, based on `fix/zoom-pivot-start-1` @ `f20ca387` — the state he is
judging. **NOT MERGED, NOT MINTED.**

**Served on 4173, built from this branch’s tip — the pill reads `<tip> · feat/start-one-window-1`
with no `+dirty`, and the tip is named in the hand-over message rather than here so the two cannot
drift apart.** The difference is largest on **dirt-oval at 40
racers**, which is the field size his report came from.

## THE SHAPE

Three clocks were stacked in the start window. **Two are gone.**

| was | now |
| --- | --- |
| 3000 ms of forced OVERVIEW, hard-coded, anchored on the field's CENTROID | — |
| `postStartHoldMs` (7000 ms) of forced LEADER, counted ON TOP of the 3000 | — |
| OVERVIEW's ~5000 ms minimum display blocking every transition inside both | **kept — it is general** |
| — | **`startWindowMs` = 10000: one window, one number, today's sum** |

Inside it, one rule: **the shot opens where it stands and does not pan; the moment the leader reaches
the place in frame he holds for the rest of the race, the camera follows him, with the ordinary time
constant and `leaderForwardFrac` placing him.** For the whole ten seconds nothing else takes the
picture.

## THE ONE THING ESTABLISHED BEFORE DELETING — `minStateHold` IS GENERAL, SO IT STAYS

Read from the callers, not assumed. It is a **per-state** value with six entries in `defaults.js`,
resolved per state in `cameraTimingComputation.js:182-188`, and read in **three** places:

- `CameraDirector.js:814` — the transition hold gate, for **whatever state is running**, every frame;
- `:1495` — stored for each newly entered state;
- `:3505` — the **phased observer's lead-out** trigger, for every state.

**General ⇒ not deleted, and not touched.** The start window owns the state instead: it returns a
state on every frame of the window, and the ONE transition it needs — the hand-over — is released by
the **existing per-entry override** `_activeStateMinHoldMs = 0`, the same idiom a same-state repeat
already uses. It self-heals: that transition is not a repeat, so `_transition` restores the new
state's own minimum on the next frame. **Nothing outside the window changes.**

## WHAT WAS REMOVED

1. **`START_PHASE_DURATION`** (3000, hard-coded) — retired. Its half of the window was unreachable
   from any slider.
2. **`postStartHoldMs`** — retired, not renamed. The loader rebuilds the live config key by key, so a
   stored value disappears by itself and cannot shadow the new key. (`racePlanner.js` had already
   dropped its second, 3000-ms-adrift reading at POST-START-HOLD-UNIFY.)
3. **The field-centroid anchor exception** in `_setTargets` — replaced by the frozen point. The
   centroid moves the instant the race does, which is what panned.
4. **`feat/start-handover-mark-1`'s Dev Screen switch** — deliberately not carried over. The
   condition came across; the toggle did not, because a settled behaviour with an option beside it is
   a second live mechanism.
5. **The Dev Screen's "Post-Start LEADER Hold"** control — now **"Start Window (ms)"**.

## MEASURED — TEN TRACKS, seed 9, TWENTY AND FORTY RACERS, BEFORE AND AFTER

`out` / `p2out` = frames the leader / the second-placed racer is outside the canvas, inside the
window. `ahead` = the furthest the delivered centre gets **ahead** of its target along that target's
own direction of travel — the forward-rush test; negative means it never passes it. `owns` = ms for
which nothing but the start framing held the picture.

### FORTY RACERS — the field he watched

| track | out | p2out | minOn | hand@ | pan<1s | ahead |
| ----- | --- | ----- | ----- | ----- | ------ | ----- |
| city-circuit | **42 → 0** | 0 → 0 | 5 → 5/40 | — → 0 | 75.4 → 186.6 | −5.8 → **−13.4** |
| dirt-oval | **55 → 0** | **14 → 0** | 4 → 4/40 | — → 0 | 74.3 → 170.3 | −4.1 → **−51.7** |
| garden-path | 0 → 0 | 0 → 0 | 39 → 39/40 | — → 550 | 22.7 → 33.6 | −1.6 → −54.0 |
| ice-track | 0 → 0 | 0 → 0 | 9 → 9/40 | — → 0 | 145.2 → 191.7 | −4.6 → −55.1 |
| searound | 0 → 0 | 0 → 0 | 5 → 5/40 | — → 0 | 152.0 → 227.6 | −4.7 → −53.1 |
| luger-hill | 0 → 0 | 0 → 0 | 17 → 17/40 | — → 317 | 87.6 → 207.0 | **+63.9 → −65.8** |
| mountainstreet | 0 → 0 | 0 → 0 | 30 → 30/40 | — → 650 | 73.6 → 93.3 | **+3.5 → −66.4** |
| river-run | 0 → 0 | 0 → 0 | 29 → 29/40 | — → 1933 | 31.4 → 0.0 | **+166.1 → −64.3** |
| seatrack | 0 → 0 | 0 → 0 | 12 → 12/40 | — → 400 | 94.4 → 147.6 | −5.5 → −52.1 |
| space-sprint | 0 → 0 | 0 → 0 | 10 → 10/40 | — → 450 | 95.0 → 179.3 | **+19.3 → −53.4** |

**HIS CASE IS FIXED.** dirt-oval: the leader was outside for **55 frames** and the second man for
**14**; both are now **0**. city-circuit: **42 → 0**. Nothing else gains a single out-frame at either
field size.

### TWENTY RACERS

| track | out | p2out | minOn | hand@ | pan<1s | ahead |
| ----- | --- | ----- | ----- | ----- | ------ | ----- |
| city-circuit | 0 → 0 | 0 → 0 | 4 → 4/20 | — → 233 | 76.6 → 131.7 | −5.7 → −32.4 |
| dirt-oval | 0 → 0 | 0 → 0 | 10 → 10/20 | — → 267 | 74.7 → 121.5 | −4.1 → −54.0 |
| garden-path | 0 → 0 | 0 → 0 | 20 → 20/20 | — → 933 | 22.2 → 1.3 | −2.1 → −54.0 |
| ice-track | 0 → 0 | 0 → 0 | 17 → 17/20 | — → 300 | 83.2 → 136.1 | −5.0 → −56.4 |
| searound | **20 → 0** | 0 → 0 | 7 → 7/20 | — → 0 | 87.0 → 203.1 | −5.1 → −65.5 |
| luger-hill | 0 → 0 | **0 → 9** | 11 → 11/20 | — → 483 | 56.1 → 169.5 | **+40.7 → −66.8** |
| mountainstreet | 0 → 0 | 0 → 0 | 18 → 18/20 | — → 783 | 67.2 → 31.5 | **+11.9 → −83.1** |
| river-run | 0 → 0 | 0 → 0 | 16 → 16/20 | — → 2100 | 30.4 → 0.0 | **+177.1 → −64.3** |
| seatrack | 0 → 0 | 0 → 0 | 5 → 5/20 | — → 450 | 94.5 → 157.1 | −5.4 → −52.1 |
| space-sprint | 0 → 0 | 0 → 0 | 5 → 5/20 | — → 383 | 105.8 → 175.2 | −4.4 → −53.4 |

**`minOn` is identical on every track at both field sizes.** Nothing is lost from the picture.

### THE FIVE ANSWERS THE BRIEF ASKED FOR

**Where the leader sits at the hand-over, and how far he drifts before it.** He is handed over
**at 0.653–0.660** — the mark is 0.66 — on every track where the hand-over has anything to wait for.
**He never drifts past it.**

**The forward rush does not return.** `ahead` is **negative on all ten tracks at both field sizes**.
It was positive on four before (river-run +177.1, luger-hill +63.9, space-sprint +19.3,
mountainstreet +11.9) — those were the world-edge clamp cases `ZOOM-PIVOT-START-1` could not reach,
and freezing the pan removes them too.

**`pan<1s` rises on seven of ten, and that is FOLLOWING, not drift.** The camera is stationary until
the hand-over and then follows a moving leader; on most tracks the hand-over falls inside the first
second, so the first second now contains real following. The discriminator is `ahead`, and it says
the camera never passes its target on any track. It **falls** where the hand-over is late —
river-run **30.4 → 0.0**, garden-path 22.2 → 1.3, mountainstreet 67.2 → 31.5.

**The start framing is on screen for 9983 ms on every track, at both field sizes, with no
intruders** — before and after. Ten seconds, and nothing else takes the picture.

**The August defect on river-run** — and this is the one number that moves the wrong way:

| | recorded | before | after |
| --- | --- | --- | --- |
| ALONG travel, first second | 6.4 | 6.4 | **0.0** |
| field centre y at 1 s | 0.486 | 0.486 | **0.565** |

Travel goes to **zero** — the defect it describes cannot exist while the camera does not move. But
the field centre sits **0.065 from mid-frame instead of 0.014**, on the opposite side from the
original defect (which was 0.427). The field drifts down the frame because the camera holds still
while the field runs. **NOT TUNED — he chose this shape and he judges it.**

## WHAT IS WORSE, NAMED

1. **luger-hill at 20 racers: the second-placed racer is outside for 9 frames**, where he was outside
   for 0. The leader stays in. At 40 racers it is 0.
2. **river-run's field centre y, 0.486 → 0.565**, above.
3. **On four closed tracks at 40 racers the still phase is ZERO** (city-circuit, dirt-oval,
   ice-track, searound: `hand@ 0`). The ceremony's framing fits the formation, so the leader is
   already past his mark when the gun fires and the camera follows from the first frame. **That is
   the specification working exactly as written** — "as soon as the leader reaches the place" — but
   it means the "camera stands still" phase he pictured is not visible on those four at that field
   size. searound does it at 20 racers too.

## TESTS

**Ten director tests** (`client/src/modules/camera/startWindow.test.js`) on a real director, a real
shape and a real countdown, with the racers advancing **along the racing line** — a field that moves
across it can never reach a mark measured along a heading, and a fixture that gets this wrong looks
like the rule failing. Each carries what breaks if it is deleted.

**Sabotage-proven:**

| sabotage | result |
| -------- | ------ |
| remove the frozen anchor | **2 red** — the anchor is the leader again, and the camera pans |
| the window never hands to the racing shot | **1 red** — _"nothing but the start framing holds the picture"_ |

**Eight existing tests were updated, none weakened.** Six used a `raceElapsed` of 5000 to obtain
LEADER_ZOOM — inside the old post-start hold, which forced it — and now use 12000, past the window,
which is what "after the start" means. One asserted `_postStartHoldMs`; it asserts `_startWindowMs`.
One asserted the ceremony hold is _"released at the first view change"_: **that contract is
deliberately replaced** — the hold now ends at the hand-over — and the test says so in place rather
than being relaxed. The BATTLE-suppression test keeps both its assertions and gains a third.

**Client suite: 213 files, 4139 tests, green.**

## FINGERPRINTS — MEASURED FRESH, NOTHING MINTED

Closures walked through `closureOf`:

| instrument | closure | changed inside | value | vs base `f20ca387` |
| ---------- | ------- | -------------- | ----- | ------------------ |
| WORLD | 36 | `defaults.js` | `dc4647be0f55ebdb` | **unmoved** |
| WORLD-OFF | 36 | `defaults.js` | `854018ee5d3d83e1` | **unmoved** |
| CAMERA | 36 | 3 files | **`f64c2ae531f14253`** | moved from `ce3475ecaf0926fe` |
| RENDER | 53 | 3 files | **`a8c59ef5002716f1`** | moved from `64e413d28c0072f0` |

**WORLD and WORLD-OFF were RUN, not argued** — `defaults.js` is inside their closure, so only a
measurement can say a retired camera key left the race alone.

**The tracking-lag frame counts moved, and that is the point**: this is the first camera block in
this sequence that changes the state SEQUENCE rather than only the framing. BATTLE_ZOOM 9701 →
10935, LEAD_CHANGE 7786 → 9378, COMEBACK_ZOOM 644 → 162. **The per-state lag is steady or better
everywhere it moved.**

## WHAT HE SHOULD SEE IN THE FIRST TWO SECONDS

**dirt-oval at 40 racers.** Today the leader and the man behind him leave the picture. **They do not
any more** — 55 and 14 frames outside, both now zero.

**The shot opens over the grid without sliding.** On garden-path and river-run — where the hand-over
is latest — the camera visibly stands still while the shot widens, then picks the leader up. On
city-circuit, dirt-oval, ice-track and searound at 40 racers the leader is already at his place when
the gun fires, so the camera follows immediately and **there is no still phase to see**. That is the
rule as specified, and whether the four tracks want something else is his call.

## PROPOSALS

1. **The still phase is zero wherever the ceremony's framing fits the formation**, because a frame
   sized to the field puts the leader at its leading edge. If he wants that phase to be visible on
   every track, the lever is the ceremony's ARRIVAL framing — a shot slightly wider than the
   formation would put the leader behind his mark at the gun on all ten — and that is a change to
   the ceremony, which this block was told not to touch.
2. **river-run's field centre at 1 s is the only number that moved the wrong way**, and it is a
   consequence of holding still on a track whose start sits against the world edge. It is worth one
   measurement of what the world-edge clamp costs at a start before anyone treats it as a defect.
