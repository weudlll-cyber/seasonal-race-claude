# LARGE-FIELD-PERF-1 — frame timing of large fields, in real browser races

**2026-10-04. Measurement only — no product code changed, no fingerprint can move.** The owner's fact
of the same day framed the field sizes: **closed tracks run at most 40 racers; 80 racers exist only on
open tracks.**

## How it was measured

| | |
| --- | --- |
| **the build** | the production build of master `61910164` (badge clean), served with the API from one origin on port 4620, an isolated data folder, a fresh account. Shipped defaults: nothing was changed in any setting. |
| **the races** | real browser races started with **Quick Test**, each with a **random seed** set through the Quick Test seed (listed below), so each race can be repeated |
| **the browser** | Playwright's Chromium, **headed**, maximized on the machine's own display; occlusion and background throttling switched off so a covered window could not slow the race |
| **the instrument** | the project's existing frame-timing probe, **`client/src/modules/rAFProbe.js`** (switched on by `?perfprobe=1`, here through its sessionStorage flag). Each frame records the time since the previous frame (rAF to rAF) and the camera state. The probe keeps the last 600 frames; the harness read it every 2 s and stitched the race together, counting frames with an rAF callback of its own to know how many were new. **Lost frames: 0 in all 90 races.** |
| **the machine** | Intel Core Ultra 7 165U, integrated Intel graphics, 31 GB, display 1920×1200 at **60 Hz**, on mains power, the balanced power plan. Nothing else was run during the measured races. |
| **the harness** | outside the repository: `C:\tmp\vod\perf\perf-run.mjs` (the runner) and `analyse.mjs` (the tables), with the raw frames per race in `.jsonl` files beside them |

**What a normal frame is here.** Chromium on this machine delivers frames every **17.5–17.6 ms** (median
in every group) — about 57 per second — not 16.7. That is this machine's cadence; nothing below is
measured against 16.7. One missed frame therefore shows as a frame of **about 35 ms**.

**Segments.** *startup* is the first 2 s after the race screen mounts; *ending* is the last 10 % of the
race screen's time (the finish and the hold after it); *running* is everything between. The camera
state is the probe's own, per frame.

## Stage 1 — 10 races per field size: Dirt Oval (closed) and River Run (open)

| group | races | frames | p50 ms | p95 ms | p99 ms | max ms | frames >33 ms | share | frames >50 ms | >33 ms per race (median / worst) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| closed, 20 | 10 | 67,385 | 17.6 | 18.2 | 18.6 | 776.2 | 38 | 0.06 % | 8 | 1 / 22 |
| closed, 40 | 10 | 68,489 | 17.6 | 18.2 | 18.6 | 53.5 | 41 | 0.06 % | 1 | 2 / 19 |
| open, 20 | 10 | 50,591 | 17.5 | 18.2 | 18.6 | 969.5 | 20 | 0.04 % | 14 | 2 / 3 |
| open, 40 | 10 | 51,439 | 17.5 | 18.2 | 18.6 | 479.5 | 137 | 0.27 % | 13 | 3 / 106 |
| open, **70** (see below) | 10 | 52,148 | 17.6 | 18.3 | 20.2 | 1004.1 | 503 | 0.96 % | 24 | 50 / 82 |
| open, **80** | 10 | 52,014 | 17.6 | 18.3 | **35.3** | 477.9 | **1,031** | **1.98 %** | 39 | **122** / 128 |

| group | >33 ms by segment | >33 ms by camera state | >50 ms by segment |
| --- | --- | --- | --- |
| closed, 20 | ending 21, startup 14, running 3 | OVERVIEW 34, PHOTO_FINISH 2, LEADER_ZOOM 2 | startup 5, running 2, ending 1 |
| closed, 40 | ending 29, startup 12 | OVERVIEW 41 | startup 1 |
| open, 20 | startup 20 | OVERVIEW 20 | startup 14 |
| open, 40 | ending 106, startup 19, running 12 | OVERVIEW 125, LEADER_ZOOM 5, PHOTO_FINISH 4, COMEBACK_ZOOM 3 | startup 12, ending 1 |
| open, 70 | ending 280, running 202, startup 21 | OVERVIEW 382, LEADER_ZOOM 121 | startup 16, ending 7, running 1 |
| open, 80 | running 527, ending 478, startup 26 | OVERVIEW 684, LEADER_ZOOM 341, COMEBACK_ZOOM 5, LEAD_CHANGE 1 | startup 17, running 13, ending 9 |

★ **The first "80-racer" races ran with 70.** Quick Test fills the field from its name list, and the
default list (`current`) holds **70 names**; asking for 80 started 70 and the button still read
"Quick Test (80)". Found by checking every race's real field size. The ten were run again with the
same seeds and the 100-name `long` list — the only way Quick Test reaches 80 — and the harness now
refuses a race whose field differs from the plan. The 70-racer runs are kept as their own row. Names
are physics, so the 80-racer races are not the same races as the 70-racer ones with ten added.

## Stage 2 — every track at its largest field, 3 races each

Closed tracks at 40, open tracks at 80 (the `long` name list).

| track | races | p50 ms | p95 ms | p99 ms | max ms | frames >33 ms | share | frames >50 ms | >33 ms per race (median / worst) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| City Circuit (closed), 40 | 3 | 17.5 | 18.2 | 18.6 | 87.8 | 57 | 0.30 % | 4 | 19 / 32 |
| Dirt Oval (closed), 40 | 3 | 17.6 | 18.2 | 18.6 | 53.1 | 30 | 0.15 % | 1 | 7 / 22 |
| Garden Path (closed), 40 | 3 | 17.6 | 18.2 | 18.6 | 36.4 | 22 | 0.12 % | 0 | 6 / 15 |
| Ice Track (closed), 40 | 3 | 17.6 | 18.2 | 18.6 | 52.8 | 3 | 0.02 % | 1 | 1 / 1 |
| Searound (closed), 40 | 3 | 17.5 | 18.2 | 18.6 | 47.0 | 25 | 0.15 % | 0 | 7 / 16 |
| Luger hill (open), 80 | 3 | 17.6 | 18.4 | 35.9 | 87.1 | 472 | 3.16 % | 95 | 127 / 220 |
| **Mountainstreet (open), 80** | 3 | 17.6 | **35.1** | 36.0 | 160.3 | **1,047** | **6.96 %** | 56 | **339** / 411 |
| River Run (open), 80 | 3 | 17.6 | 18.3 | 35.1 | 157.0 | 248 | 1.58 % | 6 | 80 / 98 |
| Seatrack (open), 80 | 3 | 17.6 | 18.2 | 19.5 | 430.0 | 148 | 0.94 % | 6 | 57 / 64 |
| Space Sprint (open), 80 | 3 | 17.6 | 18.2 | 18.6 | 695.4 | 84 | 0.39 % | 6 | 30 / 34 |

| track | >33 ms by segment | >33 ms by camera state |
| --- | --- | --- |
| City Circuit, 40 | ending 29, running 21, startup 7 | OVERVIEW 38, LEADER_ZOOM 19 |
| Dirt Oval, 40 | ending 26, startup 4 | OVERVIEW 30 |
| Garden Path, 40 | ending 19, startup 3 | OVERVIEW 22 |
| Ice Track, 40 | startup 3 | OVERVIEW 3 |
| Searound, 40 | running 16, ending 6, startup 3 | PHOTO_FINISH 15, OVERVIEW 10 |
| Luger hill, 80 | running 259, ending 208, startup 5 | OVERVIEW 425, LEADER_ZOOM 47 |
| Mountainstreet, 80 | running 865, ending 175, startup 7 | OVERVIEW 559, LEADER_ZOOM 484, LEAD_CHANGE 2, COMEBACK_ZOOM 2 |
| River Run, 80 | ending 154, running 88, startup 6 | OVERVIEW 206, LEADER_ZOOM 42 |
| Seatrack, 80 | ending 83, running 54, startup 11 | OVERVIEW 130, LEADER_ZOOM 15, LEAD_CHANGE 3 |
| Space Sprint, 80 | ending 78, startup 3, running 3 | OVERVIEW 81, PHOTO_FINISH 3 |

## What the slow frames are

- **Almost all are single missed frames.** Of 3,403 frames over 33 ms in stages 1 and 2, **3,147 were
  33–40 ms** (one frame late), 6 were 40–50, 197 were 50–100 and 53 over 100.
- **The frames over 100 ms are the race screen starting: 47 of the 53** fall in the first 2 s after it
  mounts, and 6 while the race runs. They are where the maxima of 400–1000 ms come from.
- **A closed track at 40 is as smooth as at 20.** Under 0.3 % of frames late on every closed track;
  the late ones sit mostly in the ending's wide shot.
- **Open tracks at 80 are where it is not smooth**, and the field size, not the track type, drives it:
  River Run went 0.04 % (20) → 0.27 % (40) → 0.96 % (70) → 1.98 % (80) of frames late.
  **Mountainstreet is the worst: 7 % of frames late, p95 35.1 ms** — at least one frame in twenty was
  missed, mostly while the race runs, in both the wide shot and the leader shot.
- **The longest stretches are in the ending's wide shot on an open track at 80.** Nine stretches of 20
  or more late frames in a row, all OVERVIEW, all 80–86 s into the race (the ending): **Luger hill had
  one in all three races — 95, 84 and 68 frames in a row, about 2–3 s at half the frame rate**;
  Mountainstreet four (32–39 frames), River Run one (38). This is the stretch a viewer would see as a
  stutter rather than an odd hitch.

## Is any of this over the project's smoothness threshold?

**The project has no smoothness threshold.** Searched: `docs/` (including `ARCHITECTURE.md`,
`CAMERA_DIRECTOR.md`, `FAIRNESS.md`), `client/src/modules/storage/defaults.js` and the performance
reports (`reports/perf/`, `reports/evolution/FRAME-GAP-1..3`, `PERF-INVENTORY-1`, `PERF-CLEAR-1`).
The closest is a past result in `docs/ARCHITECTURE.md:1166-1168` ("OVERVIEW p90 = 16.7 ms, drop rate
≈ 1%" after a fix) — an outcome recorded once, not a bar anything is held to. The probe itself counts
frames over 20 and over 33 ms but sets no limit. **So, by the brief, no BACKLOG row is added.** Whether
one should exist — for instance "no more than N % of frames late at the largest field, and no run of
late frames longer than M" — is the owner's decision; the numbers above are what such a bar would be
set against, and Luger hill and Mountainstreet at 80 are what it would decide about first.

## Limits

- **One machine.** An integrated-graphics laptop at 60 Hz. A faster or slower machine moves every
  number; the ranking between tracks and field sizes is the transferable part.
- **The window.** Maximized at 1920×1200. FRAME-GAP-1 found the browser's share of a frame grows with
  window area, so a full-screen race on a larger display may do worse.
- **Quick Test races**, which race the same engine as a hosted race with a different start path; the
  80-racer races use the `long` name list because no other Quick Test list has 80 names.
- **Three races per track in stage 2.** Enough to rank the tracks; not enough to compare two tracks
  that are close.

## Seeds

**Stage 1** (Quick Test seed):
- closed, 20: 145513, 128151, 88777, 880119, 183738, 927645, 350039, 465712, 518009, 337027
- closed, 40: 749006, 108745, 755079, 696664, 676862, 850213, 324219, 76065, 247987, 860883
- open, 20: 557464, 364038, 466482, 503742, 839475, 220839, 95597, 351884, 306493, 104486
- open, 40: 630156, 633307, 918230, 357064, 289099, 565826, 22681, 90163, 252853, 449482
- open, 70 and open, 80 (the same seeds): 322030, 554403, 930744, 531891, 610725, 432872, 964408, 596934, 430700, 396993

**Stage 2:**
- City Circuit: 607818, 61695, 888642 · Dirt Oval: 270829, 673895, 298739 · Garden Path: 684404, 642716, 983444
- Ice Track: 467874, 587037, 193838 · Searound: 444269, 534067, 65917
- Luger hill: 755351, 772970, 364024 · Mountainstreet: 485986, 285761, 62354 · River Run: 226825, 192630, 878199
- Seatrack: 857711, 633601, 123873 · Space Sprint: 774446, 30927, 219042
