# LBB-DODGE-SPEED — how fast a racer actually moves sideways when overtaking

Throwaway branch `trace/lbb-dodge-speed` off `fix/lbb-launch-ramp`. Env-gated (`LBB_JERK=1`) per-frame capture,
extended with `pathLengthPx` so forward advance is MEASURED (Δt × path length), not assumed. Seed 1,
mountainstreet/boarder, 1 race, 60 s → 3601 frames, 139 508 rows. Track: path = 15665 px, width = 300 px, so
**1 physicalY unit = 150 px** laterally. Observation only; nothing committed or pushed.

**LOCK — inert:** `node scripts/fingerprint-default.mjs` with the instrumentation present prints
**`62f7ebeb37880765`** (unchanged). The capture does not perturb the physics.

Measurement only. Numbers reported as measured; not reconciled with the prediction.

## The 6 dodges measured

A dodge = a contiguous `pass`-branch run ≥ 12 frames with net lateral ≥ 0.015 physicalY (a real sideways move
past a slower leader). First 6 by start frame. Lateral px/frame = `ΔphysicalY × 150`; forward px/frame =
`Δt × 15665`; angle = `atan(lateral px ÷ forward px)` per frame.

| # | racer | leader | frames | len | peak lat px/f | mean lat px/f | peak lat px/s | cap-bound frames | mean fwd px/f | **peak angle°** | mean angle° | dur→10% (f/ms) | net px |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 25 | 38 | 91..113 | 23 | 0.76 | 0.14 | 48 | 0 | 2.17 | 19.6 | 3.7 | 23 / 368 | 3.2 |
| 2 | 30 | 33 | 251..394 | 144 | 0.41 | 0.07 | 25 | 0 | 2.43 | 9.2 | 1.7 | 60 / 960 | 4.4 |
| 3 | 20 | 24 | 442..537 | 96 | 0.73 | 0.06 | 46 | 0 | 2.17 | 18.6 | 1.6 | 96 / 1536 | 5.4 |
| 4 | 7 | 23 | 657..682 | 26 | 0.93 | 0.38 | 58 | 0 | 2.53 | 20.4 | 8.5 | 26 / 416 | 10.3 |
| 5 | 20 | 0 | 769..784 | 16 | 1.01 | 0.49 | 63 | 1 | 2.47 | 21.8 | 11.0 | 15 / 240 | 8.2 |
| 6 | 33 | 6 | 769..836 | 68 | **2.24** | 0.40 | **140** | 2 | 2.33 | **43.1** | 8.7 | 24 / 384 | 27.4 |

Peak lateral step in physicalY/frame: 0.00508, 0.00271, 0.00487, 0.00621, 0.00672, **0.01496**.

**1. Peak/mean lateral speed.** Peak lateral step ranges **0.41–2.24 px/frame** (0.0027–0.0150 physicalY),
i.e. **25–140 px/second**. Means are far lower (0.06–0.49 px/frame). The peak scales with the size of the
move: the small dodges (#2, #3; net 4–5 px) peak at 0.4–0.7 px/f; the big dodge (#6, net 27 px) peaks at
2.24 px/f.

**2. Did the cap bind?** The full cap `maxLateralSpeedPerStep = 0.028` (= 4.20 px/frame) **never bound** on any
of the 391 dodge frames. The only cap-binding frames (0, 0, 0, 0, 1, 2) are the **launch-ramp's** reduced cap
(`effVLatMax` = 0.0056/0.0112 on the first 1–2 onset frames); once the ramp opens past the spring's demand the
cap stops binding. So the 0.028 value is essentially inert for a dodge; what limits the onset is the ramp,
and after that the spring itself. (The Owner's 0.028→0.005 test is addressed under §5 below — 0.005 is BELOW
several measured peaks, so it would have bound.)

**3. Duration & distance.** Time to arrive within 10% of the target ranges **240–1536 ms** (15–96 frames) — the
short brisk dodges (#4, #5, #6) take 240–416 ms, the long shallow drifts (#2, #3) take ~1–1.5 s. Net lateral
distance 3.2–27.4 px.

**4. The angle (what the eye judges).** Peak per-frame angle ranges **9.2°–43.1°**; mean angles are 1.6°–11°.
Five of six dodges peak at **18–22°** (reads as steering). The big dodge (#6, racer 33) peaks at **43.1°** —
lateral motion nearly equal to forward motion, i.e. **sliding sideways**, not steering. The peak angle, like
the peak speed, scales with move size: the farther the target, the steeper the peak.

## 5. Soft-steering comparison (the field's ordinary lateral motion)

Non-dodging racers (pass < 5% of frames), over 74 628 soft-active frames (|Δy| > 1e-4):

| | peak lat px/f | mean lat px/f | peak angle° | mean angle° |
|---|---:|---:|---:|---:|
| **soft steering (non-dodgers)** | **4.20** (= the 0.028 cap) | 0.092 | **61.4** | 2.3 |
| dodges (range across the 6) | 0.41–2.24 | 0.06–0.49 | 9.2–43.1 | 1.6–11 |

Soft steering is gentler on average (mean 0.09 px/f, 2.3°) but its PEAK frames **hit the cap exactly**
(4.20 px/f) and reach **61°** — steeper than any measured dodge. So the cap DOES bind, just for soft-steering
onsets (a suddenly-appearing obstacle target driving a big spring step), not for the sustained dodge. The
0.028→0.005 test therefore acts on: (a) soft-steering peaks (4.20 → 0.75 px/f, 61° → 17°), and (b) the few
dodge frames whose spring demand exceeds 0.005 — the big dodges like #6 (peak 0.0150 physicalY > 0.005) would
be clamped from 2.24 px/f (43°) to 0.75 px/f (17°). It does NOT act on the small/medium dodges, whose spring
demand is already below 0.005.

## 6. The shape — profile of the fastest dodge (racer 33, #6)

| frame | branch | lat px/f | fwd px/f | angle° | cap? | effV(phys) | target | py |
|---:|:--:|---:|---:|---:|:--:|---:|---:|---:|
| 766–768 | soft | 0.01 | 2.27 | 0.3 | · | 0.0280 | 0.0000 | 0.012 |
| 769 | pass | 0.84 | 2.27 | 20.3 | **Y** | 0.0056 | −0.1691 | 0.007 |
| 770 | pass | 1.68 | 2.40 | 35.0 | **Y** | 0.0112 | −0.1691 | −0.004 |
| **771** | pass | **2.24** | 2.40 | **43.1** | · | 0.0168 | −0.1690 | −0.019 |
| 772 | pass | 2.15 | 2.40 | 41.9 | · | 0.0224 | −0.1690 | −0.034 |
| 773 | pass | 1.97 | 2.40 | 39.3 | · | 0.0280 | −0.1690 | −0.047 |
| 774 | pass | 1.78 | 2.40 | 36.6 | · | 0.0280 | −0.1690 | −0.059 |
| 776 | pass | 1.45 | 2.40 | 31.1 | · | 0.0280 | −0.1689 | −0.079 |
| 779 | pass | 1.07 | 2.40 | 24.0 | · | 0.0280 | −0.1689 | −0.103 |
| 782 | pass | 0.78 | 2.40 | 18.1 | · | 0.0280 | −0.1688 | −0.120 |
| 786 | pass | 0.52 | 2.40 | 12.2 | · | 0.0280 | −0.1688 | −0.137 |
| 790 | pass | 0.35 | 2.31 | 8.5 | · | 0.0280 | −0.1688 | −0.147 |
| 795 | pass | 0.21 | 2.31 | 5.1 | · | 0.0280 | −0.1687 | −0.156 |
| 800 | pass | 0.12 | 2.31 | 3.1 | · | 0.0280 | −0.1687 | −0.161 |

**Shape:** the target jumps to −0.169 at onset (frame 769). The lateral speed **ramps UP over 3 frames**
(0.84 → 1.68 → 2.24 px/f — the launch ramp, cap-bound on 769–770) to a **peak of 2.24 px/f / 43° at frame
771**, then **eases out exponentially** over ~30 frames (43° → 3°). It does NOT hold a plateau. The peak angle
is reached 2–3 frames after onset (the ramp delays but does not lower the natural spring peak), then decays.

## Measured vs Plan-Claude's recorded prediction (stated, not reconciled)

| quantity | predicted | measured (range across 6 dodges) |
|---|---|---|
| peak lateral step | 0.009 physicalY/f (1.35 px/f) | 0.0027–0.0150 physicalY/f (0.41–2.24 px/f) |
| cap binds? | never | full 0.028 never binds; launch-ramp cap binds 0–2 onset frames; soft-steering hits 0.028 |
| dodge duration | ~200 ms | 240–1536 ms |
| lateral-to-forward angle | ~17° | peak 9.2–43.1°, mean 1.6–11° |

## What I did NOT check (marked, not approximated)

- **Only seed 1 / mountainstreet / boarder, one race.** The peak angles, the number of dodges reaching 40°+,
  and the soft-steering peak are from this single race. A different seed/track/racer or denser traffic could
  shift them.
- **The forward advance uses each frame's own Δt × the racer's `pathLengthPx`** (captured, = 15665 for this
  track). On a curved open track the on-screen forward pixels between two frames follow the curve; I used the
  straight t-advance × path length, which is the along-track forward speed, not a screen-chord — the angle is
  therefore the along-track lateral-vs-forward angle, which is what the physics produces and the renderer maps.
- **The renderer is not in this measurement** (this is the sim; physics parity). The physicalY/frame values are
  what the browser interpolates onto the track, so the lateral px/frame are the on-track motion; I did not
  re-confirm the browser's screen mapping here.
- **The onset FLICKER** (pass/soft/pass/soft short bursts before a dodge commits, found in LBB-JERK-PROOF) is
  excluded by the "contiguous pass run ≥ 12 frames" definition; those 1-frame pass bursts are a separate
  population and are not part of these sustained-dodge numbers.
