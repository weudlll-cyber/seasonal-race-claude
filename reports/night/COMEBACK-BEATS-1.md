# COMEBACK-BEATS-1 — the plan writes the comeback, and the camera is somewhere else

**2026-09-05.** Branch `feat/playable-four-1`, piece A of PLAYABLE-FOUR-1, run first and alone on the
untouched tree. **A MEASUREMENT. Nothing was changed** — no gate, no threshold, no plan, no
detector — **and the beats were not passed through.** No fingerprint moved and nothing was minted.

**N = 40 races**: ten tracks × seeds 1–4, race plan ON, shipped defaults, forty racers.
Instrument: `scripts/diag/comeback-beats.mjs` (new, this piece).

**The two stages the brief required, and what happened between them.** Stage 1 ran at **N = 30**
(ten tracks × seeds 1–3): 55 comebackers written, **1** comeback shown. That is a readable
difference by any reading, so it went larger. ★ **Stage 1 ran before the method finding below**, on
the shared driver's outcome flag — its 1-in-55 is the control arm's number, not the answer, and it
is quoted here only to record why the corpus was widened. Every figure in this report is the N = 40
browser arm unless it says otherwise.

---

## THE ANSWER IN ONE PARAGRAPH

The plan named **74 comebackers** across the forty races and wrote **215 beats** for them. The camera
showed **11 comebacks**. It never once pointed at the wrong racer — **0 of 11** were on somebody the
plan had not named — and it was never late: **all 11 were EARLY**, by a median of **0.134 of the
race** against the beat where the authored climb lands. **63 of 74 written comebackers were never
shown at all, and 29 of the 40 races contained no comeback shot whatsoever.** The camera is not
misreading the plan. It is watching the right people, catching the climb in flight, and missing the
landing — and five times out of six it is looking somewhere else entirely.

---

## ★ FIRST, THE METHOD FINDING THAT DECIDES WHICH NUMBERS ARE REAL

**The shared driver's camera is not the browser's camera for this shot**, and measuring on it would
have produced a confident wrong answer. Both arms were run; the difference is an order of magnitude.

`scripts/lib/raceDriver.mjs:501` hands the director **`isOutcomePhase: false`, a hard-coded
literal**. The browser hands it `diagDataRef.current.rpPhase === 'OUTCOME'`
(`client/src/screens/RaceScreen/index.jsx:1417`), and that field is written on every physics frame
the plan is on — the guard above it is `if (racePlanController)` (`:1170`), **not** a diagnostics
flag, so this is normal play and not an instrumented mode.

It decides this measurement because the comeback shot is offered only when
`raceState?.isOutcomePhase || leaderProgress > outcomePhaseThreshold`
(`client/src/modules/camera/cameraDirector.js:1711-1715`). With the flag false the window is the
internal fallback alone; with the browser's flag it is the **plan's own OUTCOME phase**, which
`client/src/modules/racePlanner.js:526-530` opens at `corridorStart` — much earlier. The driver's
window is a strict subset of the browser's.

| | races with an offer-window overlap | comebacks SHOWN |
| --- | --- | --- |
| **browser flag** (`--outcome=browser`, the answer) | **35 of 40** | **11** |
| driver flag as it stands (`--outcome=driver`, the control) | 3 of 40 | 1 |

**Every number in this report is the browser arm.** The shared driver was **not edited** — the
instrument wraps its own race's `cd.update` locally to supply the field, and keeps the control arm
behind a flag so the divergence stays visible rather than becoming a private correction.

**How far this reaches, counted rather than guessed:** 78 scripts import `raceDriver.mjs`; 9 files
name `isOutcomePhase` at all. Of those, **`scripts/camera-replay.mjs:408` alone does it the
browser's way**; `scripts/exp-camera-bisect.mjs:168` uses a third rule of its own; and
`camera-fingerprint.mjs:270`, `render-fingerprint.mjs:579`, `check-ending-frame.mjs:293`,
`exp-anchor-truth-ab.mjs:224`, `finish-band-truth.mjs:320` and the shared driver all hard-code
false. **★ The camera fingerprint is therefore taken with the comeback offer window closed**, and is
blind to changes inside it. That is recorded here as an observation; **nothing was changed about it,
and no fingerprint was touched.**

---

## WHAT THE PLAN WRITES

`buildCameraPlan` (`client/src/modules/heroCurveGenerator.js:505-519`) gives every hero an `index`, a
`role`, a `finalRank` and a `beats` array — `{progress, event}`, the first `anchor`, the last
`resolve`, the rest `peak`, taken from the authored curve's own waypoints.

| | n | min | median | max |
| --- | --- | --- | --- | --- |
| comebackers per race | 40 | 1 | 2 | 3 |
| beats per comebacker | 74 | 2 | — | 3 |
| **anchor** beat, race progress | 74 | 0.15 | 0.15 | 0.15 |
| **peak** beat, race progress | 67 | 0.18 | 0.528 | 0.676 |
| **resolve** beat, race progress | 74 | 0.78 | 0.78 | 0.914 |

The anchor is fixed and the resolve is nearly so: it is the band checkpoint from `resolveForBand`
(`heroCurveGenerator.js:114-116`), which is why one value repeats. **The plan therefore states, per
comebacker, exactly where its climb starts, peaks and lands.**

## WHAT THE CAMERA CONSUMES

`comebackDetector.setPlan` (`client/src/modules/camera/comebackDetector.js:64-75`) keeps **one thing**:
the index of each hero whose role is `comebacker`, into `_cast`. That set is read at exactly one
place — `:130`, as the candidate pool for `best()` in place of the B1 roster. **`beats` and
`finalRank` are discarded on arrival.** `best()` (`:122-149`) then finds the moment itself, from
rank history over a rolling window.

So the plan says WHO and the camera decides WHEN, and this is the measurement of what that costs.

---

## PER WRITTEN BEAT: DID THE CAMERA SHOW IT, WAS IT THE SAME RACER, HOW FAR APART

| | |
| --- | --- |
| comebackers written | **74** (215 beats) |
| camera comebacks shown | **11** |
| written comebackers the camera showed | **11 of 74 — 14.9%** |
| ★ camera comebacks on a racer the plan did NOT name | **0 of 11** |
| races with a written comebacker and no comeback shot at all | **29 of 40** |

**The subject is never wrong, and that is by construction, not by luck:** `_cast` replaces the
candidate pool, so once a plan has arrived the detector can only ever return a named comebacker.

**The timing is wrong in one direction only.** Distance from the camera's entry to each beat kind,
over the same 11 matches:

| measured against | signed median | median abs | camera EARLY |
| --- | --- | --- | --- |
| the **anchor** beat | +0.496 | 0.496 | 0 of 11 |
| the **peak** beat | +0.143 | 0.143 | 0 of 11 |
| ★ the **resolve** beat | **−0.134** | 0.134 | **11 of 11** |

*(p90 |Δ| against resolve 0.171, max 0.260.)*

**In time, which is the unit the brief asked for and the unit a viewer experiences:** the camera's
entry comes a **median 9.90 s** before the frame the race reaches the resolve beat — p90 **13.63 s**,
max **15.00 s**, and **early in 11 of 11**. Progress and seconds are not interchangeable (a race does
not cover progress at a constant rate), so both are given; the instrument records the crossing time
as it happens rather than reconstructing it afterwards.

**The camera's moment falls in the gap between the plan's peak and its landing** — a seventh of the
race after the peak, a seventh before the resolve — and it lands there every single time. That is
what a detector reading a rolling rank GAIN has to do: the gain is largest while the climb is
happening, and it has decayed by the time the climb is complete. **The camera catches the climb in
flight and is never present for the arrival the story wrote.**

The eleven, in full:

| track | seed | racer | resolve beat | camera entry | Δ |
| --- | --- | --- | --- | --- | --- |
| city-circuit | 2 | #9 | 0.78 | 0.7715 | −0.009 |
| city-circuit | 3 | #36 | 0.78 | 0.6472 | −0.133 |
| dirt-oval | 2 | #20 | 0.78 | 0.6616 | −0.118 |
| garden-path | 2 | #20 | 0.78 | 0.6465 | −0.134 |
| garden-path | 4 | #15 | 0.78 | 0.6327 | −0.147 |
| ice-track | 3 | #36 | 0.78 | 0.6093 | −0.171 |
| luger-hill | 3 | #36 | 0.803 | 0.6898 | −0.113 |
| mountainstreet | 4 | #10 | 0.78 | 0.6107 | −0.169 |
| river-run | 2 | #20 | 0.78 | 0.7079 | −0.072 |
| seatrack | 4 | #10 | 0.877 | 0.6166 | −0.260 |
| space-sprint | 4 | #15 | 0.78 | 0.6214 | −0.159 |

Per track, all four seeds: `searound` wrote nine comebackers and showed **none**; `city-circuit` and
`garden-path` showed two each; the other seven showed one each.

---

## ★ WHERE THE BEATS DIE — THE THREE GATES, SEPARATED

A bare count of shots cannot tell a lost contest from a camera that never had the chance, so the
instrument splits them. `best()` is a pure read — it sorts a copy, consults history, returns a racer,
mutates nothing and rolls nothing — so the harness calls it a second time per frame to see who was
available, without touching the race.

| gate | result |
| --- | --- |
| **1 · the DETECTOR** — did `best()` ever return anybody? | **40 of 40 races**, on 49,239 frames |
| **2a · the OFFER WINDOW** — was one of those inside the outcome phase? | **35 of 40 races**, 7,510 frames |
| **2b · the DIRECTOR'S CONTEST** — did that become a shot? | **11 of 35 races** |

**The detector is never the constraint, and the offer window is rarely it.** The beats die in the
contest at `cameraDirector.js:1717-1735`: the comeback is one weighted candidate among
BATTLE_ZOOM, LEAD_CHANGE and OVERVIEW, decided by `_weightedRandomPick` and then by `_acceptsOffer`,
and the contest only runs at all on frames where the hold gate has released the current shot
(`:956-989`).

**During the 7,510 frames when a comeback was there for the taking, the camera was showing:**

| | frames | |
| --- | --- | --- |
| BATTLE_ZOOM | 2,579 | 34.3% |
| COMEBACK_ZOOM | 1,907 | 25.4% |
| LEADER_ZOOM | 1,606 | 21.4% |
| LEAD_CHANGE | 973 | 13.0% |
| OVERVIEW | 445 | 5.9% |

**Three quarters of the time a named comeback was live and offerable, the camera was on something
else.** Over the whole corpus COMEBACK_ZOOM is 3.07% of 172,013 frames, against LEADER_ZOOM 41.5%,
BATTLE_ZOOM 22.2%, LEAD_CHANGE 15.3%, OVERVIEW 12.8% and PHOTO_FINISH 5.1%.

## ONE CLAIM CHECKED RATHER THAN BELIEVED — and it holds

`comebackDetector.js`'s header states: *"Every cast comebacker is drawn from the B1 pool, so case 1
is always already rank-tracked."* It matters because `recordRanks` keeps history for B1 members only
(`:104`), while `best()` iterates the cast — so a cast comebacker outside B1 would have no history
and be skipped at `:128` **forever**, silently. Measured: **0 of 74 cast comebackers fell outside the
B1 pool.** The claim is true on this corpus.

Two more facts the run settles, both of which would have been fair suspects:

- **The plan arrives in time.** It reached the detector at race progress 0.150–0.151 in all forty
  races, long before any comeback. Late delivery is not the cause.
- **The plan arrived at all, in 40 of 40 races** — the harness never measured a race whose detector
  was running on the fallback roster instead.

---

## WHAT THIS DOES NOT SAY

- **It does not say the camera is wrong to be early.** Catching a climb in progress may well be the
  better picture; that is the owner's eye to decide, not this measurement's. What is established is
  that the camera is *systematically* early against the authored landing, in every one of 11 cases,
  and that nothing in the code intends that — it falls out of a rank-gain window meeting a resolve
  checkpoint.
- **It does not measure the browser.** This is the headless director with the browser's outcome flag
  supplied. The camera seed is the harness's fixed one, and the browser derives its own; a race's
  shot sequence will differ. The *rates* are what this corpus supports, not any single race.
- **It proposes nothing.** No gate, threshold, plan or detector was changed, and the beats were not
  passed through. Per the brief, that is the next decision and it is the owner's.

## CHECKS

- **`node scripts/engine-reach.mjs --check`** — verbatim in the PLAYABLE-FOUR-1 evolution report; the
  piece adds one file under `scripts/diag/` and one report, neither inside the engine hull.
- **`npm run verify`** and the client suite — recorded in the PLAYABLE-FOUR-1 evolution report.
- **No fingerprint was measured or minted.** Nothing this piece touches is read by any of the four
  roles.
