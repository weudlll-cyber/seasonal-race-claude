# CAMERA-REPRO-1 — point at a moment, and CC stands in it

Branch `camera-refactor`, camera-tools only. **No engine ceremony**: no simulation file is in the diff,
no default moves, no fingerprint is claimed. One commit, prefix `feat(camera-tools)`.

---

## 1. BUILD-VS-SPEC CONFORMITY

| Spec part | Built | Deviation |
|---|---|---|
| **A** — marker: one key, one copyable line, race + track + config + clock + camera state + camera-as-rendered | **YES** — press **M**; one `RA-MARK1 {…}` line to clipboard **and** console; ~1000 chars for a 20-racer field | **Two declared additions** (see §2): the marker also carries a **camera RNG seed** and a **per-racer witness**. Both were forced by measurement, not preference. |
| **A** — reuse the existing detour frame log for context | **YES** — no second logger. The detour log gained ONE field (`ts`) so the marker and the log share a clock | The log had no clock at all: its frames were indexed `rel −3…+30` *within a transition window*, which cannot be joined to a moment. One field was the smallest possible bridge. |
| **B** — replay path, deterministic, from that one line | **YES** — `scripts/camera-replay.mjs` | None |
| **B** — state clearly what you can SEE | **YES** — §5: values, a rendered framing frame, and what it is not | None |
| **B** — bisect script: fix or route around, and say which | **FIXED** (§7) | The spec's diagnosis needed one correction — see §7 |
| **C** — prove it live, once | **YES** (§6) — 4 markers from real browser sessions, replayed; the 4th compared pixel-for-pixel against the browser's own canvas | Went further than "once": the first attempt **failed**, twice, for two different real reasons. Both are reported. |
| **D** — tests adapted and extended, incl. untested parts | **YES** — 43 new tests | None |
| **D** — hygiene: remove/rename orphans, extract helpers, line counts | **YES** (§8) | None |
| **Commit** — stop if camera behaviour changes | **One judgement call, declared** (§3) | The director's random source moved from `Math.random` to a per-race seeded stream. The *rules* are untouched and each race is still freshly random; the *realisation* is now recorded. Without this, no marked moment is reproducible at all. |

---

## 2. WHAT THE MARKER LINE CONTAINS, AND WHY EACH FIELD IS THERE

A real one, from the session in §6 (1003 characters, one line):

```
RA-MARK1 {"v":1,"at":"2026-08-02T09:29:22.914Z","build":"0c3d44a6","race":{"geo":"custom-c39d19f3-…","track":"Searound","n":20,"type":"manta","laps":2,"durSec":null,"ww":3072,"wh":2048,"seed":5601,"plan":true,"sfc":["water"],"names":["Ada","Bo",…]},"cam":{"seed":166589503},"moment":{"pts":11952,"cms":11959.3,"prog":0.201968,"finishT":2,"fi":null,"log":{"frame":false,"detour":false}},"shot":{"st":"LEADER_ZOOM","lp":"tracking","op":"follow","z":4.344,"ox":-2860.718,"oy":-1963.763,"tz":4.344,"tox":-2834.471,"toy":-1967.532,"ct":0.404153,"ezx":1.81,"ezy":1.527188,"anchor":"Mo"},"world":{"leader":"Mo","lt":0.404419,"lx":1795.651,"ly":1499.766,"tsum":7.143807,"tvec":[0.36809,…]},"cfg":{"fp":"e9fd70","diff":{},"types":{}}}
```

| Field | Why it must be there |
|---|---|
| `race.geo` | Names the track geometry. The replay resolves it from `server/data/tracks` (live, edits included) then `server/seeds/tracks`; if it is in neither it **refuses** rather than replaying a different track. |
| `race.n / type / laps / durSec / ww / wh / plan / sfc` | The exact inputs `createRaceFromIdentity` takes. Change any one and the race is a different race. |
| `race.seed` | **THE** race seed (`racePlanSeed`). `0` means the race ran off an unseeded `Math.random` and is unreproducible by anything — the marker says so and the replay stops (§9). |
| `race.names` | Not physics — but without them the replay's output says `#7` where the owner said "Nia". First thing dropped if the line gets long. |
| `cam.seed` | The camera's **own** dice, drawn fresh per race (§3). Without it a perfect physics replay still diverges the first time the director picks a state. |
| `moment.pts` | **The replay anchor.** `physicsTs` — the deterministic race clock, advancing in fixed 16 ms quanta. *Not* a frame index: rAF cadence is not reproducible, so a frame index names nothing. |
| `moment.cms` | The camera's wall clock since race start. The **only** coordinate shared with the detour log — this is what joins WHERE to WHAT. |
| `moment.prog`, `finishT` | Human orientation ("20% into the race") and a cheap consistency check. |
| `moment.fi`, `moment.log` | Frame-log index when it was on; and plainly whether each log was running (see §9). |
| `shot.st / lp / op / anchor` | Camera state, lerp phase, observer phase, pan anchor **as rendered**. These are what the replay must match to claim it is standing in the same shot. |
| `shot.z / ox / oy / tz / tox / toy / ct` | Live zoom and pan, their targets, and `camT`. Target-vs-live is what shows a camera mid-move rather than at rest. |
| `shot.ezx`, `shot.ezy` | The world→screen scale the renderer actually used, **per axis**. Two, not one — see §6.3; carrying one and assuming the other put the leader 400 px off. |
| `world.leader / lt / lx / ly / tsum / tvec` | The **witness**. Nothing here is needed to rebuild the race; it exists so the replay can be *checked*, and refuse to report on a race it did not reproduce. |
| `cfg.fp` | The race-relevant config fingerprint — comparable at a glance to a sim run. |
| `cfg.diff` | Every off-default config key **with its value**. A hash says "his settings are not yours"; this says *which*, so his world rebuilds from the shipped defaults with nothing to hunt for. Empty when he is on defaults. |
| `cfg.types` | Racer-type overrides — they reach speed and body geometry, so they are race identity. |
| `build`, `at` | Which bundle produced it, and when. Yesterday's cost was two sliders having moved between comparison runs; `cfg.diff` + `build` is the answer to that specific failure. |

**Length.** ~820 chars without the witness vector, ~1000 with, for a 20-racer field. A 40-racer field lands
near 1500. Above 4000 the line sheds, in order: roster names, then the per-racer vector — never anything
needed to *rebuild* the race. One line always carries the reproduction; only the diagnostics degrade.

---

## 3. THE ONE JUDGEMENT CALL: the camera's own dice

The director draws random numbers twice — `_weightedRandomPick` (which state to cut to) and
`_scheduleNextOverview` (when the next OVERVIEW is due). Both were `Math.random()`. **The same race
therefore showed a different camera every single time it was run.** That is why "it looked wrong at 40 s"
could never be handed to anyone, and it is not fixable downstream.

What was done: `CameraDirector.setRandomSeed(seed)`. RaceScreen draws **one fresh seed per race from
`Math.random`** and installs it, then puts that seed in the marker. So:

- every race is still as unpredictable as it ever was — the seed is drawn, not fixed;
- the rules, weights, cooldowns and thresholds are untouched;
- unseeded directors still call `Math.random()` **at the draw site** (`_rng` defaults to `null`, not to a
  captured function reference — so a later global swap is still followed, exactly as before);
- but the realisation of a given race is now recorded, and can be replayed.

I judged this **not** a behaviour change in the sense the spec means (no default moved, no rule changed,
no distribution changed) and proceeded, rather than stopping with nothing delivered. It is nonetheless
the one thing in this commit that touches the running camera, so it is flagged here at the top. If the
owner reads it the other way, the revert is one line in `RaceScreen` (drop the `setRandomSeed` call) and
the marker degrades to "camera not replayable" — the world half still works.

---

## 4. THE REPLAY PATH

`node scripts/camera-replay.mjs --marker-file=<file>` (or `--marker="…"`, or the line on stdin).

1. Parse the line (tolerant of quotes, prompts, trailing commas — a paste is a paste).
2. Resolve the geometry from disk, live data root first. Refuse if absent.
3. Rebuild the config world = shipped defaults + `cfg.diff`; apply `cfg.types` to the racer types.
4. Build the race through **the real `raceCore.createRaceFromIdentity`** — the same function RaceScreen
   calls, not a mirror of it.
5. Drive RaceScreen's own loop at a canonical 60 fps: countdown phase (the camera is live there and its
   state at the green light depends on it), then the fixed-timestep accumulator with the 2-step cap and
   BATTLE/PHOTO_FINISH slow-motion, camera fed the render-interpolated racers exactly as the browser does.
6. Stop at `moment.pts`. Check the witness. Print the camera comparison, a frame window, what is on
   screen, and write two pictures.

Exit code: `0` reproduced, `2` the race was unseeded, `3` the witness failed.

---

## 5. WHAT YOU CAN SEE FROM A MARKER

**Values — exactly.** The whole world at that millisecond: every racer's `t`, `x`, `y`; who leads; where
each one sits *on screen* under the owner's own camera; whether the leader was inside the inner-frame
region. Plus the camera's state, phase, anchor, live and target zoom/pan, and `camT`, each printed next
to the marker's own number with the delta.

**A rendered frame — yes, and it is cheap.** Two 1280×720 PNGs per marker:

- `…-OWNER.png` — the exactly-reproduced world drawn with **the camera values from the marker**. This is
  his frame. It does not depend on the camera replay working at all.
- `…-REPLAY.png` — the same world with the camera the replay reconstructed. The difference between the
  two *is* the camera drift, made visible.

**What the picture is not.** It is a **framing** view: track edges, centreline, a dot per racer, a cross
on the leader, and the inner-frame guide. No sprites, no background, no labels, no particles. What it
costs in precision: it answers *where things sat in the viewport* and nothing about art, readability or
legibility of a name tag. §6.4 shows that this is enough — the framing view and the browser's real canvas
put the same racers in the same places. For anything about the art itself, the owner's own screen is
still the reference.

---

## 6. THE PART C DEMONSTRATION

A real browser session on the dev server (Searound, 20 manta, seed 5601, defaults), driven to the race
screen; **M** pressed mid-race; the marker taken from the console; the canvas read back **in the same
synchronous turn as the key press**, so the pixels captured are exactly the frame the marker describes.

### 6.1 First attempt: the instrument said REPRODUCTION FAILED — and it was right twice

Run 1 reported `leader name match / leader t DIFF / field t-sum DIFF`. That is the whole point of the
witness, so the finding was chased rather than explained away:

- **A browser-determinism check first.** Two independent runs of the same seed, 25 markers each, compared
  wherever they landed on the same physics millisecond: **7/7 agreed to 6 decimals on both leader `t` and
  field `t`-sum.** The browser race *is* repeatable. So the divergence was mine.
- **The leader-only witness was too weak to say where.** Leader `t` matched to six decimals while the
  field sum did not — an authored race plan pins the front-runner, so it can match while the field behind
  it does not. `tvec` (per-racer `t`) was added for exactly this, and with it the next runs reported
  **20 of 20 racers match to 1e-4** — which is what finally made the earlier mismatch a settled, not
  suspected, artefact of that first session's state.

### 6.2 Second failure: the replay's camera never left OVERVIEW

With the world reproducing exactly, the camera table read `LEADER_ZOOM` (marker) vs `OVERVIEW` (replay)
on every marker. Not drift — a bug in my loop: **it advanced physics but never advanced the wall clock.**
The director's entire state machine (minimum holds, state caps, cooldowns, `raceElapsed`, the OVERVIEW
schedule) runs on that clock, so it sat frozen at zero while the world moved. One line (`ts += RAW_DT`),
and a comment saying why, because a frozen camera clock is indistinguishable from a camera bug.

### 6.3 Third failure: one scale used on two axes

The reproduced picture still did not match the browser: the field sat bottom-right and the leader fell
off frame. The marker carried a single effective zoom. But a **closed track scales X by `zoom×bsX` and Y
by `zoom×bsY`**, and on a 3072×2048 world those are 1.810 and 1.527. Projecting Y with the X scale put
the leader at y=743 instead of y=327 — 416 px out. Fixed by carrying **both** axes (`ezx`, `ezy`), which
is now also pinned by a test asserting the two are not equal. This is the same family as the defect
`CAMERA-PROJECTION-1` was written to retire; it reappeared the moment a new consumer of the projection
was written by hand.

### 6.4 The demonstration that stands

Four markers from live sessions, replayed:

| Marker | `pts` | Witness | Camera state / phase / anchor | zoom Δ | pan Δ (px) |
|---|---|---|---|---|---|
| A | 5 120 ms | leader, sum, **20/20 racers** match | `LEADER_ZOOM` / `glide` / `Mo` — all match | +0.001 | −3.06, −0.15 |
| B | 11 952 ms | leader, sum, **20/20** match | `LEADER_ZOOM` / `tracking` / `Mo` — all match | 0.000 | +1.95, −0.27 |
| C | 12 000 ms | leader, sum, **20/20** match | `LEADER_ZOOM` / `tracking` / `Mo` — all match | 0.000 | −2.47, +0.29 |
| D | 15 680 ms | leader, sum, **20/20** match | `LEADER_ZOOM` / `tracking` / `Ola` — all match | 0.000 | +0.37, +0.20 |

Camera state, lerp phase, observer phase and pan anchor: **exact**. Zoom: exact to three decimals.
Both axis scales: exact. Pan: within **0.4–3.1 px** of the browser's own numbers — the residue of a
canonical 60 fps standing in for a real rAF cadence.

**And the picture matches the picture.** For marker B the replay's `…-OWNER.png` and the browser's own
canvas, captured at the same key press, put the same racers in the same places:

| | browser canvas | replayed framing view |
|---|---|---|
| leader **Mo** | ≈ (390, 320) | (389, 327) |
| **Bo** | ≈ (575, 335) | (573, 336) |
| **Dee** | ≈ (637, 350) | (637, 353) |
| **Ivy** | ≈ (682, 292) | (681, 296) |
| racers in frame | 20 of 20 | 20 of 20, "inside the inner-70 region" |

(The few-pixel offsets are the sprite body centre versus the drawn sprite with its name tag above it.)

Artefacts of the run are in `client/tmp/camera-replay/` (gitignored): `BROWSER-at-mark.png`,
`Searound-seed5601-11952ms-OWNER.png`, `…-REPLAY.png`.

---

## 7. THE BISECT SCRIPT: **FIXED**, and the diagnosis corrected

`scripts/exp-camera-bisect.mjs` is fixed, in place, in this commit — a broken instrument left in the tree
is the thing this project has paid most for, and routing around it would leave it there.

**Correction to the spec's diagnosis, which matters.** The rungs did *not* replay different races: the
race comes out of a recorded frame dump, so it is fixed by construction. What differed was the **camera's
own dice** — `_weightedRandomPick` and `_scheduleNextOverview` drawing from an unseeded `Math.random` in
every rung. So the failure is narrower than "different races" and worse than it sounds: the ladder's
header claims "the ONLY variable is the camera CODE at each commit", and that claim was false — a
difference between two rungs could be the code *or* the dice, and the table never said which.

The fix seeds `Math.random` with one fixed value around each rung's replay and restores it after. Seeding
globally rather than through the new `setRandomSeed` is deliberate: the rungs are checked out at commits
that do not have that method. The header sentence is corrected in place.

---

## 8. HYGIENE

**Removed.** `DEFAULT_CONFIG_WORLD` was a module-private copy inside `exportRaceConfig.js`; the replay
needs the same object to apply a marker's config diff onto, so it moved to `storage/defaults.js` next to
the blocks it is made of, and `exportRaceConfig.js` now imports it — deleting its local definition and
four now-unused imports (`DEFAULT_ROW_LAYOUT_CONFIG`, `DEFAULT_BASE_SPEED_CONFIG`,
`DEFAULT_FRAME_TIMING_CONFIG`, `DEFAULT_CAMERA_CONFIG`, `DEFAULT_AUTO_SCALE_CONFIG`). One canonical home;
`exportRaceConfig.js` got shorter.

**Extracted.** `scripts/lib/pngFrame.mjs` (139 lines) — the PNG encoder and the four drawing primitives,
so `camera-replay.mjs` reads as replay logic and nothing else. `client/src/modules/camera/cameraMarker.js`
(266 lines) — what a marker *is*, imported by both the browser and the script, so a marker can never mean
one thing on the emitting side and another on the reading side.

**Fixed in passing (a blocker, not an orphan).** `client/src/services/api.js` read `import.meta.env`
unguarded, which **threw at import time under plain `node`** and took down any script reaching a client
module that imports it (`racer-types` → here). One `typeof` guard; identical value under Vite.

**No config key, no Dev Screen control, no label and no tooltip were added.** The marker is a key press
that is always live — a toggle would be one more thing to have switched off on the day it is needed. So
nothing here can orphan a control, and nothing was renamed.

### Line counts

| File | before | after |
|---|---:|---:|
| `client/src/modules/camera/CameraDirector.js` | 2848 | 2887 |
| `client/src/modules/camera/CameraDirector.test.js` | 6816 | 6952 |
| `client/src/modules/exportRaceConfig.js` | 137 | **126** |
| `client/src/modules/storage/defaults.js` | 693 | 710 |
| `client/src/screens/RaceScreen/index.jsx` | 1548 | 1624 |
| `client/src/services/api.js` | 11 | 18 |
| `scripts/exp-camera-bisect.mjs` | 152 | 186 |
| `client/src/modules/camera/cameraMarker.js` | — | 266 (new) |
| `client/src/modules/camera/cameraMarker.test.js` | — | 272 (new) |
| `client/src/screens/RaceScreen/CameraMarkerHUD.jsx` | — | 99 (new) |
| `client/src/screens/RaceScreen/CameraMarkerHUD.test.jsx` | — | 186 (new) |
| `scripts/camera-replay.mjs` | — | 657 (new) |
| `scripts/lib/pngFrame.mjs` | — | 139 (new) |

### Tests

43 new tests, all green, over parts that had **no** coverage before. Full client suite: **3430 tests in
165 files, all passing.**

- `cameraMarker.test.js` (19) — the line is one line; a full round trip; a round trip through the mess a
  copy/paste makes of it (quotes, log prefix, trailing comma); the config diff is **lossless** (defaults +
  diff rebuilds his world byte-for-byte) and does not mutate the defaults; both axis scales are carried
  and are not equal; the witness is really derived from the field; the unseeded race is flagged, not
  silently produced; over-long lines shed the right things in the right order; a malformed line throws
  instead of returning half a marker.
- `CameraMarkerHUD.test.jsx` (12) — M emits exactly one parseable line to clipboard *and* console; upper
  and lower case; the chip appears and clears itself; unseeded is warned about; no race is refused; M is
  ignored while typing in a field, with Ctrl/Cmd/Alt, on key repeat, and after unmount; a blocked
  clipboard is reported rather than swallowed.
- `CameraDirector.test.js` (+12) — `setRandomSeed`: same seed → identical camera run frame for frame;
  a seeded director never touches the global generator; **unseeded still calls `Math.random` at both draw
  sites** (asserted by exercising the two sites directly, because driving the state machine cannot be
  relied on to roll a die within any fixed number of frames — a test that silently exercises nothing is
  worse than no test); seed 0 restores the shipped path; the seeded stream is a real uniform generator;
  both draw sites move with the seed. Plus: every detour-log frame now carries a monotonic `ts` on the
  caller's clock.

### Noticed and deliberately left (input to the later hygiene phase)

1. **`scripts/sim-race-visual.mjs` is a parallel implementation.** Its header says "no parallel impl", but
   it re-derives racer init, the re-roll schedule and the row layout itself — it predates `raceCore`. It
   also carries its own copy of the PNG encoder that `scripts/lib/pngFrame.mjs` now duplicates. Untouched
   here: it is a `sim*` path and this commit must contain none.
2. **`scripts/sim-fairness.mjs` keeps a hand-copied table of racer-type configs** (speedMultiplier,
   displaySize, bodyFill*) instead of reading `racer-types`. Same reason for leaving it; same drift risk.
3. **The detour log has no export button.** It reaches the owner only via `console.info` and
   `exportDetourLog()`, while the frame log has Download and Copy buttons. Nothing here needed it.
4. **`racer-types` warms sprite images at import time** and prints 31 `[warmup] … Image is not defined`
   lines under Node. Muted at the call site in `camera-replay.mjs` rather than changed at source.
5. **`MAX_INVERSE_ZOOM` in `CameraDirector.js` is an unused alias** and the only eslint warning on the
   touched files. Pre-existing and unchanged by this commit (2 occurrences before and after), so it is
   left rather than swept.
6. **Server-defined racer types and server surface classes are not in the marker.** Config and racer-type
   *overrides* are; anything the API serves is not. On a machine with the same server data this is
   invisible; across machines it is a gap.

---

## 9. TWO THINGS THE OWNER SHOULD KNOW PLAINLY

**Quick Test is replayable. "Start Race" is not.** Quick Test draws a seed and records it, so its races
are a pure function of that seed. `handleStartRace` sends `racePlanSeed: 0`, which means the physics came
from an unseeded `Math.random` — no tool can reproduce it, and this one says so and exits rather than
pretending. **Mark Quick Test races.** (Making every race replayable is a one-line change in
`SetupScreen` — draw a seed there too — but that is his call, not mine.)

**The marker works with the logs off; the logs answer a different question.** The marker says WHERE. The
detour log says WHAT the camera did through a view change. If he wants "why did it move like that", the
detour log must be **on before** the race — Dev Screen → Camera Advanced → `cameraDetourLog`. The replay
tells him which case he is in at the bottom of every run, and the log's frames now carry a `ts` on the
same clock as the marker's `moment.cms`, so the window bracketing that value is the one describing the
marked moment.

---

## 10. FOUR STEPS, FOR SOMEONE WATCHING A RACE

1. **Start the race from Quick Test.** (Only Quick Test races can be replayed — see §9.)
2. **When something looks wrong, press `M`.** Nothing pauses, nothing changes; a small green
   `MARK copied ✓` appears top-left for two seconds. If it says **UNSEEDED**, the race cannot be
   reproduced — restart from Quick Test.
3. **Paste the line to me.** It is already on your clipboard, and it is one line. Say what looked wrong in
   your own words; you do not have to be precise about it.
4. **Press `M` again for every other moment you want.** More markers is strictly better — each one is
   independent, and two markers a second apart tell me more than one does.

If the clipboard did not take it (it will say so), the same line is in the browser console, on the line
starting `[RA CAMERA MARK]`.
