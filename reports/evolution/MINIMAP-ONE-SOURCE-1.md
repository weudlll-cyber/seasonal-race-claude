# MINIMAP-ONE-SOURCE-1 + PHOTO-FINISH-STATE-1

**2026-08-19 · branch `feat/minimap-one-source` · NOTHING MINTED · awaiting the owner's eye on the
minimap**

Three commits: `0d61f6f1` PHOTO-FINISH-STATE-1, `30cee205` MINIMAP-ONE-SOURCE-1, and a third,
docs-only one at the branch tip that resolves the tracking-lag stamp onto `30cee205`. The third
exists because **a commit cannot name its own SHA** — the stamp goes in as PENDING and is resolved
afterwards, which is this repo's established two-step, and commit 2 then moved another file under
the same `depends=` directory. It carries no code, and it is deliberately not named by hash here
for the same reason it exists.

Two blocks with one shape between them: a list that was short by one, and a ribbon that was drawn
two different ways. Both defects are the same class — **one thing described in two places, where the
second place is allowed to disagree silently** — and both were invisible because the disagreement
resolves to a fallback rather than to an error.

| | commit 1 · PHOTO-FINISH-STATE-1 | commit 2 · MINIMAP-ONE-SOURCE-1 |
| --- | --- | --- |
| what was doubled | `CAM_STATE` vs `ALL_STATES` | `getEdgePoints` vs `getPosition` |
| how it failed | `map[state] ?? fallback` — a missing key takes another state's number | two parameterisations of one ribbon — a sliver between them |
| CAMERA | `f64c2ae531f14253` → **unmoved** | out of closure — cannot move |
| RENDER | `a8c59ef5002716f1` → **unmoved** | `a8c59ef5002716f1` → **`7d553406f41ff176`** |
| WORLD / WORLD-OFF | untouched (closure) | untouched (closure) |

**The owner's eye is owed on commit 2 only,** on an open track (where the tail is) and on a closed
one. Commit 1 changes no picture and is measured to change none.

---

## Closure, first, because both claims below rest on it

`scripts/lib/routing.mjs` `closureOf`, resolved over each instrument's declared `reach` entries:

| instrument | files | `cameraTimingComputation.js` | `Minimap.js` | `rAFProbe.js` |
| --- | --- | --- | --- | --- |
| world / world-off | 22 | out | out | out |
| camera | 38 | **IN** | out | out |
| render | 58 | **IN** | **IN** | out |

So: **WORLD and WORLD-OFF cannot move** — no file either commit touches is among their 22, and
`defaults.js`, the file that usually forces a measurement here, is not edited by either commit.
Commit 1 can reach CAMERA and RENDER. Commit 2 can reach RENDER only. `rAFProbe.js` is in no
instrument's closure, which is why the third fix in commit 1 is free.

---

# COMMIT 1 · the state list was short by one

## The count: twelve lists, three short

`CAM_STATE` in `CameraDirector.js` is the source. Every other place that enumerates camera states,
found by searching rather than by trusting a count:

| # | list | file | verdict |
| --- | --- | --- | --- |
| 1 | `CAM_STATE` | `camera/CameraDirector.js` | **the source** — 6 states |
| 2 | `ALL_STATES` | `camera/cameraTimingComputation.js` | **SHORT** → fixed |
| 3 | `_STATE_IDX` / `_STATE_NAME` | `rAFProbe.js` | **SHORT** → fixed |
| 4 | `STATE_CONFIG` | `RaceScreen/CameraStateHUD.jsx` | **SHORT** → reported, not fixed |
| 5 | `ALL_FRAMED_STATES` | `camera/framingConfig.js` | complete |
| 6 | `DEFAULT_CORRIDORS` | `camera/framingConfig.js` | complete |
| 7 | `FRAMING` | `camera/framingRule.js` | complete |
| 8 | `DEFAULT_MAX_ENTRY_DURATION_MS` | `camera/cameraTimingComputation.js` | **SHORT** → fixed with #2 |
| 9 | `CAM_STATES_FOR_PROFILES` / `STATE_LABELS` | `DevScreen/sections/CameraAdvancedSection.jsx` | complete |
| 10 | `cameraStateProfiles` | `storage/defaults.js` | complete |
| 11 | `getPanTarget` switch | `camera/panTarget.js` | **by design** — the director passes `BATTLE_ZOOM` explicitly for the pair states |
| 12 | `OVERLAY_TEMPLATES` + its allow-list in `RaceScreen/index.jsx` | `stateOverlayTemplates.js` | **by design** — absence means "no overlay text", and LEADER_ZOOM is absent for the same reason |

Counting #8 separately from #2 (they live in one file but are two literals) gives **three short
lists across twelve, two of them in the same file**. #11 and #12 were each checked and are
deliberate absences, not oversights — worth saying, because "six lists are short" would have been
the answer from a grep alone.

## What was actually falling back

`ALL_STATES` declares itself a mirror of `CAM_STATE`. **It cannot import it** — `CameraDirector.js`
imports this module, so a second arrow would be a cycle, and the module header says so. Nothing else
compared the two. Every read in the director is `map[state] ?? fallback`, so a missing key never
throws; it silently substitutes.

| map | PHOTO_FINISH got | its own profile says |
| --- | --- | --- |
| `minStateHoldByState` | OVERVIEW's value | its own, much shorter |
| `maxStateDurationByState` | OVERVIEW's value | its own, much longer |
| `maxEntryDurationByState` | a module constant | its own |
| `leadAheadEnabledByState` | `true` | `false` |
| `leadOutEnabledByState` | `true` | `false` |
| `phasedByState` | nothing at all | zero lead-in, zero lead-out |

(The values themselves are deliberately not written here — `defaults.js` is their one home.)

**Six maps, not the three the task named.** `minStateHoldByState` and `maxStateDurationByState` were
not built from the list at all: they were hand-written five-key object literals. They went missing
the same way without going missing for the same reason, which is exactly why counting from the list
alone would have under-reported it.

## The fix is the class, not the instance

Every per-state map is now built by iterating `ALL_STATES`. **Twenty hand-written keys and twenty
per-state scalars are gone.** A list can be short in one place; twenty literals can be short in any
of twenty, and were.

**Two borrowings are preserved exactly, because flattening them would have been a behaviour change
wearing a tidy-up's clothes:**

- PHOTO_FINISH fell back to BATTLE's **resolved** time constant, not to the module constant beside
  it. A config that retimes the battle shot therefore retimed the photo finish with it. That is kept
  as an explicit `TC_BORROWS_FROM` rather than folded into the fallback table, which would have
  quietly changed it.
- LEAD_CHANGE fell back to the **constant**. It is deliberately not in that map. Making the two
  agree would have been a second, unasked change.

## What moved: nothing — and here is why that is a finding rather than a shrug

**CAMERA `f64c2ae531f14253` and RENDER `a8c59ef5002716f1`, both unmoved,** measured fresh before and
after (67–70 s each). The temptation is to stop there. Three checks say what the null result means:

**1. The state is genuinely reached.** Under the camera fingerprint's own identity, PHOTO_FINISH
runs **206–279 frames on nine of the ten tracks**, held 3.4–4.7 s. Only garden-path never enters it.
So "unmoved" is not "never exercised".

**2. The new values are genuinely read.** Forcing PHOTO_FINISH's cap down to 2000 ms changes the
director's transition-reason counts on city-circuit — `hold-elapsed` 89 → 159,
`finish-drama-forced` 60 → 0, `held` 129 → 119 — and the same on ice-track. Before this commit those
counts could not have moved at all, because the key was absent from the map. The profile is
reaching the hold gate.

**3. And the picture is identical anyway.** With that forced cap, the per-frame `(state, zoom,
cam.x)` digest is **byte-identical** on both tracks. The reason is structural: during PHOTO_FINISH
`finishPhase.js` keeps returning PHOTO_FINISH, so every transition is a **self-transition**, and
`_transition` does its entry work only when `nextState !== prevState`. A different hold gate changes
only which bypass wins the race to produce the same no-op.

> **THE FINDING, and it is for the owner.** The three Dev Screen controls on the PHOTO_FINISH row —
> Min state hold, Max state duration, Max entry duration — are now **WIRED and still cannot move
> this shot.** What ends the photo finish is `finishPhase.js`, not the hold gate. They were dead;
> they are now live-but-inert, which is a better state to be in only because it is now *visible*.
> Two further reasons they cannot bite, both worth knowing before anyone tunes them:
> `holdGate = Math.max(minHold, stateCap)`, so **lowering the min hold can never shorten anything** —
> it only matters when it exceeds the cap. And the shot's observed 3.4–4.7 s is shorter than the
> entry-duration timeout either way.

## The tracking-lag stamp: re-measured, not re-stamped

`cameraTimingComputation.js` is inside the stamp's `depends=` directory and this commit genuinely
changes what the director reads, so an argument would have been the wrong instrument.
`node scripts/tracking-lag.mjs` was re-run in full: **every figure identical to the digit**, frame
counts and both percentiles. The table and the reason are written into `docs/CAMERA_DIRECTOR.md`.

## Not fixed, and why: the dev HUD says the wrong thing

`STATE_CONFIG` in `CameraStateHUD.jsx` has six entries but **not the same six**. It carries `FINISH`
and lacks both `PHOTO_FINISH` and `FINISH_OVERVIEW` — two values the `hudState` getter really
returns. The lookup ends `?? STATE_CONFIG.OVERVIEW`, so **the dev HUD reads "OVERVIEW 👁" during a
photo finish**, which is the moment someone would most likely have the HUD open.

It is left alone deliberately: filling it in means inventing a label, an icon and a colour. That is
the owner's call, not a mirror repair, and this branch already owes him one decision. See PROPOSAL 1.

---

# COMMIT 2 · one source for the minimap

## Which source, and why

**`getPosition(t, ±0.5)`.** Three reasons, in order of weight:

1. **It is what the world uses.** The finish gate the racers actually cross is drawn at
   `getPosition(ft, 0)` extruded by half the track width. A mark built from anything else can drift
   from the line it claims to be.
2. **It is the only one that can say where the tail starts.** The tail begins at `finishT`, an
   arbitrary t and not a sample index. `getEdgePoints` can only return whole samples, so it could
   never have drawn the tail's first cross-section. **That is why two parameterisations existed at
   all** — not by anyone's choice.
3. **It is the finer of the two.** Inside `EditorShape`, `getEdgePoints` resolves t through `_idx`,
   which `Math.round`s to the nearest stored sample; `getPosition` interpolates between the two it
   lies between. The sliver *is* that quantisation, seen edge-on.

**What `getEdgePoints` provided that the survivor must still provide** — checked, not assumed:

- both edges of the whole track at a chosen density → `crossSection` at `t = i/TRACK_SAMPLES` gives
  the same 81 pairs at the same spacing;
- which side is which → `getPosition` clamps its offset to `[-0.5, +0.5]` and maps `-0.5` to the
  inner edge, `+0.5` to the outer, so the naming carries over exactly;
- the closed-track wrap → at `t = 1` a closed shape wraps to `t = 0`, so the walk's last pair *is*
  its first and `closePath()` still closes on a point rather than across a gap.

## Lines, and the four walks

| | before | after |
| --- | --- | --- |
| ribbon walks inside `renderMinimap` | **4** (fill-outer, fill-inner, edge-outer, edge-inner) | **1** |
| call sites that sample the shape | 4 (`getEdgePoints` ×1, `getPosition` ×3) | **2**, and both are the two edges of one `crossSection` |
| code lines (comments and blanks excluded) | 194 | 198 |
| total lines | 332 | 418 |

The code is four lines longer and the file is 86 lines longer, essentially all of it the two comment
blocks recording why `getPosition` won and why the grid is shared. That is the intended trade here:
the defect was that nobody could see the two parameterisations were two.

## One source was not enough — one GRID was needed

Switching the band and edges to `getPosition` took the worst sliver from **1.886 px to 1.472 px**,
not to zero. Two polylines through the same curve at *different sample points* are not the same
polyline: each is a run of chords, and where one cuts a corner the other does not.

So `ribbonTs` gives every stretch the band's own grid — its own first sample at `t0`, then every
band sample after it, instead of re-dividing its span evenly. **Density unchanged; only the phase.**
Every tail vertex after the first is now a band vertex, and the sliver closes.

## Measured on all ten tracks

`node scripts/minimap-truth.mjs` — new in this commit. It drives the **real `renderMinimap`** with a
recording context and reads the paths it actually emitted, rather than recomputing its arithmetic;
open tracks are swept over eight finish positions and the worst reported, because the sliver's width
depends on where the tail begins.

| track | open | sliver before | **sliver after** | mark→band before | **after** | seam before | **after** | combined mark |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| city-circuit | no | — | — | 0.000 | 0.000 | — | — | 0.000 → 0.000 |
| dirt-oval | no | — | — | 0.000 | 0.000 | — | — | 0.000 → 0.000 |
| garden-path | no | — | — | 0.001 | **0.000** | — | — | 0.000 → 0.000 |
| ice-track | no | — | — | 0.017 | **0.000** | — | — | 0.000 → 0.000 |
| luger-hill | yes | 0.751 | **0.000** | 0.157 | **0.000** | 0.000 | 0.000 | — |
| mountainstreet | yes | 1.354 | **0.000** | 0.919 | **0.000** | 0.000 | 0.000 | — |
| river-run | yes | 0.732 | **0.000** | 0.701 | **0.000** | 0.000 | 0.000 | — |
| searound | no | — | — | 0.001 | **0.000** | — | — | 0.000 → 0.000 |
| seatrack | yes | 0.585 | **0.000** | 0.531 | **0.000** | 0.000 | 0.000 | — |
| space-sprint | yes | **1.886** | **0.000** | 0.724 | **0.000** | 0.000 | 0.000 | — |

All figures in panel pixels on the fixed 1280×720 store.

- **Sliver: worst 1.886 → 0.000.** (MINIMAP-TAIL-1 recorded 1.74 px; the sweep here finds a slightly
  worse finish position on space-sprint. Same defect, one more decimal of honesty.)
- **Mark-to-band gap: worst 0.919 → 0.000, on all ten tracks including the five closed ones,** which
  the tail measurement cannot speak to. This is the number that retires the file's own
  "within 1.5 panel px" tolerance — that tolerance was the defect written down as a spec.
- **Seam: 0.000 before and after, exactly.** It must not move and it did not.
- **Marks: identical to the digit** — every bar midpoint, every length, every cell count.
- **Closed-track combined mark: still ONE mark** — a green plate (1 segment) under a 4-cell checker
  sharing its centre to 0.000 px, on all five closed tracks.

## What moved that is NOT the sliver — and the honest way to say it

`minimap-truth.mjs --baseline` compares every drawn vertex before and after. It reports **two**
numbers, because they have different answers and quoting either alone misleads:

| track | band/edges vertex | band/edges **outline** | tail outline | marks |
| --- | --- | --- | --- | --- |
| garden-path | 5.275 | 0.199 | 0.000 | 0.000 |
| city-circuit | 6.435 | 0.228 | 0.000 | 0.000 |
| dirt-oval | 6.779 | 0.314 | 0.000 | 0.000 |
| ice-track | 16.939 | 0.382 | 0.000 | 0.000 |
| searound | 11.759 | 0.672 | 0.000 | 0.000 |
| seatrack | 12.200 | 0.680 | 0.712 | 0.000 |
| river-run | 13.593 | 0.813 | 0.179 | 0.000 |
| luger-hill | **38.332** | 1.030 | 0.119 | 0.000 |
| mountainstreet | 17.859 | 1.367 | 0.954 | 0.000 |
| **space-sprint** | 18.783 | **2.021** | 1.472 | 0.000 |

**`vertex` compares point *i* to point *i*.** Up to 38.3 px on luger-hill — and that is a
**re-parameterisation**, the vertices sliding *along* the same curve, not the curve moving. It is
the panel-pixel face of the 502-world-px index disagreement this file already had written down.
Quoting it as "the band moved 38 px" would be alarming and wrong.

**`outline` is the symmetric point-to-polyline distance** — how far the drawn *shape* moved, which
is the only one of the two a viewer can see.

> **SO THE HONEST HEADLINE IS NOT "behaviour unchanged except the sliver".** The band edge and both
> outlines moved by up to **2.021 panel px** (space-sprint), over a pixel on three tracks
> (space-sprint 2.02, mountainstreet 1.37, luger-hill 1.03). By the task's own bar — *anything that
> moves by more than a pixel is a finding, not a rounding* — **this is a finding.**
>
> It moved **onto the true curve** and off the rounded-sample approximation, which is the correct
> direction and the whole point. But it is a real, visible change to the band outline on three
> tracks, and the owner should be told that rather than have it filed under "the sliver".

**The track that changed most: `space-sprint`** — worst sliver before (1.886 px) and largest outline
move (2.021 px). `mountainstreet` is second on both. Those are the two to look at.

## RENDER moved, and that is expected

`Minimap.js` is inside RENDER's 58-file closure and the minimap is drawn on every sampled frame, so
a change to its draw-call sequence must move this hash. Measured at the branch tip:
**`a8c59ef5002716f1` → `7d553406f41ff176`**.

**CAMERA is `f64c2ae531f14253` at the branch tip — unmoved from master**, measured rather than
argued from the closure walk, and that is the check this commit owes: `Minimap.js` is not in
CAMERA's 38 files, so a move there would have meant the change reached further than it claims to.

**NOTHING IS MINTED.** The render hash above is what the owner's eye is being asked about; it is
recorded here, in the lab journal, and not written into `docs/fingerprints.json`.

---

## Tests, and what breaks if each is deleted

**Commit 1 — `cameraTimingComputation.test.js`, the mirror.**

- *every per-state map mirrors `CAM_STATE`* (3 config paths: null, shipped profiles, legacy flat).
  **Deleted:** a seventh camera state can be added to the director, wired into its state machine and
  given a profile, and every per-state timing map will quietly hand it another state's numbers.
  Nothing else in the tree compares the two lists — that is the hole PHOTO_FINISH sat in for its
  whole life. Neither the states nor the set of maps is written down: the states come from
  `CAM_STATE`, the maps from every returned key ending in `ByState`. **This replaced two tests that
  wrote the key list out by hand, once per map — one listed five states, the other six, they
  disagreed with each other, and the five-state one was GREEN. It was pinning the bug.**
- *PHOTO_FINISH reads its own profile* and *an omitted profile falls back to BATTLE's timing*.
  **Deleted:** the borrowing could be flattened into the fallback table — which reads like a
  simplification and silently changes what a config that retimes BATTLE does to the photo finish.

**Commit 2 — `Minimap.test.js`, seven new tests. The mock's `getEdgePoints` now throws.**

- *reads the track through `getPosition` only*. **Deleted:** the whole block can be undone by one
  convenient line, and the band goes back to being 1.9 px off the tail — visible on the panel,
  invisible to every other test.
- *band fill and both edges are the same walk*. **Deleted:** the band could be sampled once per
  drawing again. Three walks of one ribbon is how the file acquired two parameterisations: each
  drawing owned its own sampling, so one could drift without the others.
- *the band is sampled at `TRACK_SAMPLES + 1` cross-sections*. **Deleted:** the density could change
  unnoticed — and it is not free, since the tail shares this grid.
- *every tail vertex after the first IS a band vertex*. **Deleted:** the tail can go back to
  re-dividing its own span, which is still one source and still leaves 1.472 px.
- *both mark bars land ON the band edges*. **Deleted:** a mark could drift off the band while every
  other test stayed green — which is exactly what 0.919 px was.
- *tail drawn AFTER the band fill and BEFORE the edges*, and *the drawing order is unchanged*.
  **Deleted:** the wash could be painted over, or could dim the cyan edge so the tail reads as "the
  track ends here" — the opposite of true, and the one misreading this addition could cause.

**Both mutations were run, not assumed.** Reverting the tail to an evenly re-divided span fails
*every tail vertex is a band vertex*; reintroducing `getEdgePoints` fails all 19.

**One vacuity was caught and fixed.** The grid test first passed under mutation: the mock's
`finishT` of 0.6 is exactly 48/80, so an evenly re-divided tail lands on the grid *anyway*. The test
now uses an off-grid finish (`0.633`), and a constant beside it records why.

---

## PROPOSALS

**1. Give `CameraStateHUD` the two states its own `hudState` getter can return.** It is short by
`PHOTO_FINISH` and `FINISH_OVERVIEW`, and the `?? STATE_CONFIG.OVERVIEW` fallback means the dev HUD
announces the wrong shot at the most dramatic moment in the race. Concretely: PHOTO_FINISH as
"PHOTO FINISH" with the existing finish gold, and FINISH_OVERVIEW as "FINISH — OVERVIEW". **This is
not done here because it invents a label, an icon and a colour, and this repo puts those in front of
the owner.** The same test shape as commit 1's would then bind it: every value `hudState` can return
must have an entry. Its `STATE_CASES` list already claims "all 6 states" while testing a different
six, so it would need the same class treatment.

**2. Decide what the PHOTO_FINISH profile's three duration keys are FOR.** They are now wired and
provably inert: `finishPhase.js` owns when this shot ends, and `holdGate = Math.max(minHold,
stateCap)` means the min hold can never shorten anything. Three honest options, in the order I would
take them: **(a)** retire the three fields from the PHOTO_FINISH row in the Dev Screen, since a
control that cannot move the picture is worse than no control — this is what DEV-CONTROLS-HONEST-1
already decided for three other controls on 2026-08-21; **(b)** give the shot a real cap by letting
the hold gate pre-empt `finishPhase`, which is a behaviour change and needs his eye; **(c)** leave
them and write the inertness into `docs/CAMERA_DIRECTOR.md` so the next reader does not spend an
afternoon on it. **(a)** is the smallest and matches the precedent.

**3. `stateOverlayTemplates.js` should say that a missing state means "no text".** It is checked
and correct — LEADER_ZOOM, COUNTDOWN and the finish states are absent on purpose, and
`RaceScreen/index.jsx` carries a four-state allow-list that has to agree with it. But the agreement
is unguarded, and that is the identical shape as this branch's two defects: two lists that must
match, and nothing making them. A one-line test asserting the allow-list equals
`Object.keys(OVERLAY_TEMPLATES)` minus the winner key would close it.

**4. `scripts/minimap-truth.mjs` should be run before the next minimap change, not after.** It
exists now and its `--baseline` mode reports what moved. MINIMAP-MARKS-1 and MINIMAP-TAIL-1 both
measured by hand and both recorded a number this run improves on; a standing instrument would have
made the 0.919 px mark gap visible when the marks were added, rather than two blocks later.

---

## Reproducing

```
node scripts/minimap-truth.mjs                        # the ten-track table
node scripts/minimap-truth.mjs --json > before.json   # on master
node scripts/minimap-truth.mjs --baseline before.json # on the branch — what moved
node scripts/camera-fingerprint.mjs --quiet           # ~70 s
node scripts/render-fingerprint.mjs --quiet           # ~70 s
node scripts/tracking-lag.mjs                         # the re-measured stamp
```

---

# THE SHIP — SHIP-MINIMAP-ONE-SOURCE, 2026-08-22

**The owner judged the minimap on a production build on 2026-08-22 and accepted it.** That is the
fact this section exists to record; everything below is what was done on the strength of it.

## What the merge put on master

`git diff --name-only master...feat/minimap-one-source` — **nine files, read before merging, and
nothing rode along**:

| | file |
| --- | --- |
| production (3) | `client/src/modules/camera/Minimap.js`, `client/src/modules/camera/cameraTimingComputation.js`, `client/src/modules/rAFProbe.js` |
| tests (2) | `Minimap.test.js`, `cameraTimingComputation.test.js` |
| doc (1) | `docs/CAMERA_DIRECTOR.md` |
| report (2) | this file, and its `INDEX.md` line |
| instrument (1) | `scripts/minimap-truth.mjs` |

**No catch-up merge was needed, and that is worth saying** because THE SHIP ORDER's whole premise
rests on it: `master` was already an ancestor of the branch, so step 1 was a no-op and the branch
tip's tree *is* the merged tree — literally, not approximately. Every fingerprint below was measured
on that tree and then re-measured on the merge commit itself.

## Which instruments could move, and which were measured

Decided by walking `scripts/lib/routing.mjs` `closureOf` from each instrument's own declared reach,
not by argument:

| instrument | closure | contains a changed file? | action |
| --- | --- | --- | --- |
| world | 22 files | **no** | cannot move — not run |
| world-off | 22 files | **no** | cannot move — not run |
| camera | 38 files | yes — `cameraTimingComputation.js` | **MEASURED** |
| render | 58 files | yes — `Minimap.js`, `cameraTimingComputation.js` | **MEASURED** |
| tracking-lag | 8 files | **no** — but its stamp's `depends=` is the *directory* | **RE-MEASURED** |

`rAFProbe.js`, the third production file, is in no instrument's closure at all — which is why that
fix was free.

## The fingerprints, before and after

| role | before | after | minted? |
| --- | --- | --- | --- |
| **render** | `a8c59ef5002716f1` | **`7d553406f41ff176`** | **YES** |
| **camera** | `f64c2ae531f14253` | `f64c2ae531f14253` | **no — it did not move** |
| world | `dc4647be0f55ebdb` | not run (closure) | no |
| world-off | `854018ee5d3d83e1` | not run (closure) | no |

**CAMERA was measured and NOT minted, and that is the rule rather than an omission: a mint records a
MOVEMENT.** Writing an unchanged value back into the record with a new `mintedBy` would claim this
ship moved something it did not, and would overwrite START-ONE-WINDOW-1's account of why that hash is
what it is.

**The null result is load-bearing, and the mint text says so**, because a later reader finding
"PHOTO-FINISH-STATE-1 shipped, CAMERA unmoved" could reasonably conclude the fix did nothing. It did
not do nothing: the state is reached on nine of the ten fingerprint tracks for 206–279 frames, and
the profile *is* read — forcing its cap moves the transition-reason counts. The picture is identical
because during PHOTO_FINISH every transition resolves back to PHOTO_FINISH, and `_transition` does
its entry work only when the state actually changes, so a self-transition is a deliberate no-op.

**The minted RENDER value was measured twice** — on the branch tip and again on the merge commit —
rather than carried across, which is what the ship asked for.

## Tracking lag: re-measured, not re-stamped

Two merged files sit under the stamp's `depends=` directory, so the guard asks. It was **re-run**:
every frame count and both percentiles identical to the digit. The argument that would have excused
it was available and deliberately not used — `Minimap.js` is not in `tracking-lag.mjs`'s 8-file load
closure, and the unmoved CAMERA hash independently says the director's decisions did not change — but
both are arguments, and the ship called for a measurement.

## The open items this ship leaves behind — written, not fixed

**1. The three PHOTO_FINISH Dev Screen controls are now wired and still inert.** Min state hold, max
state duration and max entry duration on that row can now be read — they could not be before — and
still cannot change the shot. `finishPhase.js` owns when the photo finish ends, and
`holdGate = Math.max(minHold, stateCap)` means a *lower* minimum can never shorten anything; it only
matters when it exceeds the cap. **A separate decision the owner has not made**, and the honest
options are to retire the three fields, to let the hold gate pre-empt `finishPhase`, or to write the
inertness down. Nothing here presumes which.

**2. Two threads opened by SPRITE-SIZE-OVERVIEW-1, neither touched here.** The owner sees NAME labels
where the shipped configuration offers none — `labelNamesWhenRoom` ships false, and turning it on
still yields zero names in a crowded frame — so the room check does not hold at his resolution. And
the drawn racer is pinned at **32.4 px on any shot wider than about 285 world px**, which is what
makes the wide shot unreadable. Both are new threads and neither is opened here; see
[SPRITE-SIZE-OVERVIEW-1](SPRITE-SIZE-OVERVIEW-1.md).

## PROPOSALS

**1. THE SHIP ORDER's `PENDING` placeholder cannot be used on a measured stamp, and this ship found
it by trying.** The stamp regex requires a hex SHA, so `PENDING` does not match — and an unmatched
stamp is not reported, it is silently *dropped from the guarded set*. In `CAMERA_DIRECTOR.md` that
means ZERO parseable stamps, which trips the guard's own loud-failure rule and takes `script-suite`
down with it. **It was avoided here by stamping `30cee205`** — the commit that actually changed the
files under `depends=` — which is both parseable and more honest than a merge SHA, since that is the
tree the numbers were measured on. **The proposal:** either teach the regex to accept the placeholder
and report it as pending, or say plainly in THE SHIP ORDER that a MEASURED stamp is stamped at the
commit that moved its dependency and never at the merge. **Cost:** one alternation, or one sentence.
**What it prevents:** the next ship spending a verify cycle discovering this, as this one did.

**2. Let `minimap-truth.mjs` earn its keep as a guard.** It exists now, it runs in about a second,
and it measures four numbers that must stay at zero. It is not wired into `npm run verify`, so the
next minimap change gets the same hand-measurement this one did. **Cost:** a `GUARD` declaration
block and a threshold assertion. **What it prevents:** the sliver coming back unnoticed — which is
exactly how it arrived, since MINIMAP-MARKS-1 and MINIMAP-TAIL-1 both measured by hand and both
recorded a number this ship improved on.

**3. Give the fingerprint record a machine-readable "measured and held" field.** CAMERA was measured
at this ship and not minted, and the only place that fact survives is prose inside RENDER's
`mintedBy`. A later reader asking "was CAMERA checked at this ship?" has to read a paragraph about a
different role. **Cost:** one optional array per role — the ships at which it was measured and held.
**What it prevents:** the next ship re-deriving the closure walk because it cannot tell whether the
last one already did.
