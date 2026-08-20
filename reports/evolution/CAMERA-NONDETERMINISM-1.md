# CAMERA-NONDETERMINISM-1 — no, the camera is not deterministic, and there are two causes

**Branch:** `exp/endgame-schedule`. **Investigation. Nothing fixed, nothing merged, nothing minted.**

---

## 1. The answer to question 1

> # NO.
> The same race seed does **not** give the same camera — and the larger of the two causes is
> **deliberate and documented**: the camera draws its **own** random seed, fresh from
> `Math.random()`, for **every race**.

`client/src/screens/RaceScreen/index.jsx:595`

```js
const cameraRandomSeed = (Math.random() * 0x7fffffff) >>> 0 || 1;
camDirRef.current.setRandomSeed(cameraRandomSeed);
```

The comment above it says what it is for, and it is not an oversight — CAMERA-REPRO-1 made the
camera **replayable** (the drawn seed travels in the `M` marker) rather than **reproducible from the
race seed**. The two seeds are different seeds, and only one of them is yours to set.

**The director rolls that die at three sites** (`CameraDirector.js`):
| site | what it decides |
| --- | --- |
| `_acceptsOffer` (661) | whether a candidate state is taken at all |
| `_weightedRandomPick` (675) | **which state to cut to** |
| the OVERVIEW schedule (702) | `jitter = 0.8 + random × 0.4` — when the next OVERVIEW is due |

So the *shot selection itself* is random. Different camera seed ⇒ different shots ⇒ "the camera
behaved differently". That is what he saw across three runs.

### Measured, `scripts/diag/camera-determinism.mjs`

space-sprint, race seed 9, 100 racers, his config, **frame clock held at a constant 60 Hz**, only the
camera seed varied. Indexed by **physics step** — the race's own clock — because the race is
deterministic and only the camera is not.

| camera seed | 1st divergence @step | progress | maxΔzoom (ln) | maxΔcentre (px) | steps where the STATE differs |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1439767152 | — | — | 0.000000 | 0.0 | 0 |
| 1439767152 (control) | — | — | **0.000000** | **0.0** | **0** |
| 7 | 967 | 0.2934 | 0.035581 | 322.7 | 2 |
| 123456789 | 967 | 0.2934 | 0.138836 | 1583.1 | 156 |
| 2024 | 968 | 0.2937 | 0.210000 | 1914.9 | **165** |

**The control repeats exactly** — so the camera *is* deterministic once its seed is fixed, and the
instrument is sound. Change only the camera seed and the picture is a different picture: up to
0.21 ln of zoom, 1915 px of centre, and **165 physics steps on which a different state is running**.

---

## 2. The second cause: frame timing. Long-standing, and not from the endgame work.

Every instrument in this project runs the driver at a fixed 60 Hz, so this was invisible **by
construction**. `runRace` now takes `hooks.frameMs`; omitted it is 1000/60 and every existing caller
is byte-identical (proved: `endgame-spec` on ice-track reads the same with the old and new driver).

Same race seed, same camera seed, **only the frame clock varies**:

| frame clock | 1st divergence @step | progress | maxΔzoom (ln) | maxΔcentre (px) | state differs |
| --- | ---: | ---: | ---: | ---: | ---: |
| 60 Hz control | — | — | 0.000000 | 0.0 | 0 |
| 30 Hz | **30** | **0.0357** | 0.693147 | 6388.5 | 69 |
| jitter 12/22 ms | 31 | 0.0360 | 0.131594 | 632.6 | 4 |
| 60 Hz, one frame in 37 takes 50 ms | 42 | 0.0392 | 0.044378 | 307.0 | 0 |
| ramp 60 Hz → 20 Hz | 31 | 0.0360 | 1.003302 | 11958.7 | **612** |

**A single dropped frame in 37 is enough to diverge.** At 30 Hz the zoom differs by a factor of two
somewhere in the race, and 69 steps run a different state.

**This is not a regression from the endgame work, and that was checked rather than assumed.** The
same experiment on **master (`182fa3ac`)** gives the same first divergence at step 30 and the same
magnitudes (0.693 ln at 30 Hz; 612 differing states on the ramp clock). The first divergence is at
**3.6% of the race**, where the endgame does not exist.

---

## 3. Question 2 — what advances the schedule

**The ramp is parameterised by race progress, not by frame count** — `u ← 1 − (1−u)·(deadline−p)/
(deadline−pPrev)` telescopes exactly, so N frames or 2N frames over the same progress give the same
`u`. **But it only advances on frames where the segment can run**, and *which* frames those are
depends on the frame clock. So it is progress-parameterised and frame-set-dependent.

**Every wall-clock or frame-dependent read in the endgame path:**

| what | where | consequence |
| --- | --- | --- |
| `_progTrail` window trimmed by `ts − first.ts > runInOpenMs` | `_updateRunInScheduled` | the number of samples is frame-rate dependent |
| the least-squares fit over that trail | same | **the close's position** is frame-rate dependent |
| `msToDeadline = ((deadline−p)/dp)·dt` | engagement test | when the widen starts |
| `_beginRunInGlide(ts)`, `glideDurationActiveMs` | glide branch | wall-clock duration |
| `atActual = toScreen(point, this.zoom, offsetX, offsetY)` | demand sizing | reads the **previous frame's delivered camera** — path-dependent |
| `this.zoom <= demand` (`_runInWidenDone`) | widen completion | path-dependent |
| `_runInWidenInert` gating | widen | decides which frames advance `u` |
| state cooldowns, `minStateHold`, `maxStateDuration` | `_decideState` | all wall-clock; different frame timing ⇒ different transition moments |

**"Banks motion during a stall and releases it later" — not established as a live effect.** The
carried ramp cannot bank progress (it advances only on active frames, and by a progress ratio). The
*earlier* version could and did — that is ENDGAME-SCHEDULE-2's 0.22 ln jump — and it is gone.

---

## 4. Question 3 — the lead change: **NOT ESTABLISHED**

**I could not reproduce it, so I will not explain it.**

What I have is structural, from reading, and it is a hypothesis rather than a finding:

- The endgame explicitly lets LEAD_CHANGE through (`Priority 2.5 … Exception: LEAD_CHANGE is allowed
  through`).
- Its transition is a **hard cut** that writes the zoom directly:
  `this._lerpPhase = 'tracking'; this.zoom = this._leadChangeZoom; this.targetZoom = this._leadChangeZoom;`
- `_leadChangeZoom` is **0.55 corridors** — tighter than LEADER's 0.75, and tight enough to exclude
  the line.

That would produce a tight shot with no line, and it bypasses the schedule on the cut frame. **But
it is a reading, not a measurement.**

**The search, and what it found:** `scripts/diag/endgame-leadchange.mjs` scans for a race where the
lead swaps inside the endgame *and* the camera takes it. Over 24 race seeds on space-sprint it found
**one physics swap in the endgame — race seed 7 at progress 0.9875 — and the camera did not take
it**, on that camera seed or on six others I then tried. Whether LEAD_CHANGE fires is itself a random
draw (`_acceptsOffer`), gated further by `_leadChangeCooldownMs` and `_leadChangePending`.

**Open, and it is the next thing to do:** his run had **Race Plan ON** and a roster where the racers
are named Bolt and Zenith; my scan used the harness's default roster and 100 racers. A racer's NAME
is physics in this project, so that is not a cosmetic difference. The scan should be re-run against
his actual race context before anyone claims the mechanism.

---

## 5. The smallest fix for each cause, with its cost

**Nothing was built.** The brief allows building only what is unambiguous and provably local, and
neither of these is: both touch what a race looks like, and one of them is a deliberate design
decision of his that only he can reverse.

| cause | smallest fix | cost |
| --- | --- | --- |
| **camera seed drawn per race** | derive it from the race seed (`cameraSeed = f(raceSeed)`) instead of `Math.random()`, for **seeded Quick-Test races only** | Every seeded race becomes camera-reproducible. **It removes variety he may want**: two runs of a favourite seed would be identical shot for shot. It also moves the camera fingerprint. **This is his call, not a defect fix.** |
| **frame-timing dependence** | not small. The camera would have to advance on the physics clock rather than wall-clock, or every duration become progress-based | Large and invasive; it would move every camera fingerprint and change every shot's timing. **Not proposed.** A cheaper partial: make the endgame schedule's trail and fit progress-windowed rather than time-windowed, which removes the endgame's own contribution but not the state machine's. |
| **lead-change hard cut** | not proposed — see §4 |

---

## 6. A correction to the ENDGAME-SCHEDULE-2 hand-back

The before/after numbers I reported for that block were measured at commit `0a26dff7`, **one commit
before the final build**. The carried-ramp fix (`415a5e9e`) landed after them. Re-measured on
ice-track at the final build: **worst single zoom step 0.0146 → 0.0163 ln**, standstill 16% → 13%.
The direction and the conclusion are unchanged — the served build is still far better than the one
he judged — but the exact figures in that report are one commit early and should be read as such.

---

## 7. What was not done

- **The real browser build was not driven.** Question 1 asked for repeated runs in the browser; I
  found the cause in the source and confirmed the consequence headlessly with the same RNG the
  browser uses. The browser half is a code fact (`index.jsx:595`) plus a headless demonstration, not
  a browser measurement. **It should still be done**, and the e2e harness — which creates its own
  throwaway user on its own ports — is the way to do it without touching his data.
- **CPU throttling in a real browser** was not done; the frame-clock experiment is headless.
- **The lead change was not reproduced** (§4).
