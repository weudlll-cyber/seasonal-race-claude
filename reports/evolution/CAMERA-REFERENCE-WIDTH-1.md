# CAMERA-REFERENCE-WIDTH-1 — the program normalises, the owner types one number

Branch `camera-refactor`, one commit (`dcca55ba`). Camera-only: **no simulation file in the diff**, no
engine ceremony, no fingerprint. Return tag `pre/reference-width` (`1abc9383`), registered in
[TAGS.md](../../docs/TAGS.md) in the same step.

The sentence that decided it: **a racer's height on screen was `1.9 ÷ (racers per row)`**, on all ten
tracks, because the track width cancelled on *both* sides of the unit — the camera divided by it and
the start-grid packing sized the sprite from it. Searound is the extreme on both counts at once (the
narrowest corridor, 131 px, carrying the biggest animal), so only 6 fit in a row and its racer filled
31.7% of the frame against Mountainstreet's 9.5%. A 3.33× spread with no author behind it.

---

## 1. VERIFICATION — same setting, different corridor, same visible world

Through the real director, at the shipped defaults, 40 racers:

| track | corridor | OVERVIEW | **LEADER** | BATTLE | PHOTO | racer on screen |
|---|---:|---:|---:|---:|---:|---:|
| Searound (manta) | 131 | 450 | **225** | 165 | 120 | 18.4% |
| Dirt Oval (horse) | 178 | 450 | **225** | 165 | 120 | 15.0% |
| Garden Path (snail) | 198 | 450 | **225** | 165 | 120 | 11.9% |
| Luger hill (luge) | 250 | 450 | **225** | 165 | 120 | 26.4% |
| Mountainstreet | 300 | 450 | **225** | 165 | 120 | 12.7% |

**LEADER is 225.000 world px on all ten tracks** — from the 131 px corridor to the 300 px one. It was
262 … 600 before. Racer-on-screen spread falls **3.33× → 2.21×**, and that remainder is exactly the
authored creature spread: the manta stays bigger because it *is* bigger.

That property had **no test at all**. It now has four, plus a failure proof that computes the old
unit's 2.3× spread from the same inputs.

---

## 2. THE GUARANTEES — still on the real corridor

They read the **real** track width and the real subjects, untouched. What *did* go is the zoom unit's
own full-track-width clamp: it belonged to a unit whose number meant track widths, and under a
reference it would have silently re-pinned every narrow track to its own narrow corridor — the exact
unevenness this block removes. The orientation-aware corridor guarantee in `framingRule.js` was
already doing that job, so there is now **one place a shot is widened, not two**.

Guarded by three new director tests: a setting too tight for a 300 px corridor is widened, the same
setting on a 131 px corridor is honoured untouched, and the widening scales with the real corridor.

### The honest caveat, measured

At LEADER 0.75 the corridor guarantee still widens **9 of 10 tracks**. Searound gets its 225; the rest
land between 254 and 410, because the guarantee wants the corridor inside `innerFramePct` 0.7 and the
owner's preferred picture is *smaller than a 300 px corridor*.

| | old unit, LEADER 2 | new unit, LEADER 0.75 |
|---|---:|---:|
| what the setting asks | 262 … 600 px | **225 px everywhere** |
| what he actually sees | 262 … 600 px | 225 … 410 px |
| delivered spread | 2.29× | **1.82×** |

So the unit does its whole job and the guarantee then takes some of it back. Whether the *full*
corridor is still the right proxy for "two racers side by side stay visible" on a track carrying 20
racers per row is a separate question, and his. Nothing here pre-empts it.

---

## 3. THE NAME

`trackWidths` → **`visibleCorridors`**, labelled **"World in shot (corridors)"**. The tooltip teaches
the change instead of leaving it in a report: the same number now shows the same amount of world on
every track; it is *not* the old scale (0.75 ≈ what 2 used to be on a wide track); and racers still
differ in size between tracks because the animals do.

The reference gets its own control: **"Standard corridor (world px)"**, default 300, range 100–600
step 10, with a tooltip saying it rescales every shot on every track at once.

Applied as **`max(reference, actual width)`** — a track authored wider than the reference keeps its
own width, so its corridor is never asked to be cropped. On the ten tracks today the widest is exactly
300, so this is identical to a plain 300; it is insurance for the next track he draws. Without it, a
400 px track would show 0.75 of its corridor at 1.0 and hand every tight shot there to the guarantee.

---

## 4. THE RANGE AND STEP, re-derived

The old `min 1.0` was the corridor guarantee's threshold. The guarantee computes independently now, so
that floor had no meaning left and was not inherited.

**Tight end** — how much of the frame one racer fills:

| corridors | smallest creature | biggest creature |
|---:|---:|---:|
| 0.20 | 44.8% | 99.0% |
| **0.25** | 35.8% | **79.2%** |
| 0.40 | 22.4% | 49.5% |

At 0.25 the largest creature already fills 79% of the frame height. Below that a racer is a portrait,
not a shot. **min = 0.25.**

**Wide end** — the whole track in frame needs 4.55 corridors (Garden Path) to **12.55** (Seatrack).
**max = 13.**

**Step** — one step should be a change he can just about see, taken as 5% of the visible world:

| at setting | step 0.5 | step 0.1 | **step 0.05** | step 0.01 |
|---:|---:|---:|---:|---:|
| 0.75 (LEADER) | 67% | 13% | **7%** | 1% |
| 2.00 | 25% | 5% | **3%** | 1% |

**step = 0.05.** The old 0.5 was 67% of the shot at the working point — which is why he could not land
on a picture. 0.01 is finer than the eye separates and makes the field tedious. Below ~0.4 even 0.05
is coarse (12%); if he finds himself wanting a value between two steps down there, 0.025 is the
number to change.

---

## 5. THE DEFAULTS — a unit change, not a regression

**The old numbers and the new ones have nothing in common.** It is miles to kilometres: the old values
were multiples of each track's own corridor, these are multiples of a fixed 300 px. Nobody reading
this later should see 4 → 1.5 as a loss of shot.

Anchored on his own eye: he typed 1.67 on Searound, saw **219 world px** and called it good.

| state | old | **new** | world px | ratio to LEADER |
|---|---:|---:|---:|---:|
| OVERVIEW | 4 | **1.5** | 450 | 2.00 → 2.00 |
| LEADER_ZOOM | 2 | **0.75** | 225 | 1.00 → 1.00 |
| LEAD_CHANGE | 2 | **0.75** | 225 | 1.00 → 1.00 |
| BATTLE_ZOOM | 1.5 | **0.55** | 165 | 0.75 → 0.73 |
| COMEBACK_ZOOM | 1.5 | **0.55** | 165 | 0.75 → 0.73 |
| PHOTO_FINISH | 1 | **0.40** | 120 | 0.50 → 0.53 |

225 px is his 219, 2.7% wider — below what the eye separates and on the step grid. Every state keeps
the ratio to LEADER it had.

**Schema v21.** A stored v20 camera config is discarded, so his own saved values reset to these. That
is the intended behaviour for a unit change and it is why the defaults had to be right in this commit.

---

## 6. HYGIENE AND TESTS

**Removed with their callers, zero hits repo-wide:** `guaranteeCamZoom`, `_trackWidthGuaranteeZoom`
(already an orphan before this block), `resolveZoomForTrackWidths`, `trackWidthsForCamZoom`,
`visibleTrackWidths`, `DEFAULT_TRACK_WIDTHS`, `countdownStartTrackWidths`.

**Also removed:** PHOTO_FINISH's fallback to BATTLE's value. It existed for configs written before the
key existed; v21 discards those outright, and borrowing BATTLE's number is the defect CAMERA-FRAMING-1
was opened to fix.

**Left deliberately:** `autoScaleConfig.minTargetScreenPx` (pre-existing orphan in a race-relevant
config block — removing it moves the world hash and needs the engine ceremony) and
`photoFinishCloseThresholdT` (lap-normalised, a different class).

| file | before | after |
|---|---:|---:|
| `camera/zoomUnit.js` | 140 | **163** |
| `camera/zoomUnit.test.js` | 236 | **350** |
| `camera/CameraDirector.js` | 2753 | 2768 |
| `storage/defaults.js` | 727 | 739 |
| `DevScreen/sections/CameraAdvancedSection.jsx` | 1429 | 1456 |
| `cameraConfig.js` | 96 | 96 |

**3412 green.** Simulation paths treated as such and absent from the diff: `scripts/sim-fairness.mjs`,
`scripts/lib/**`, `scripts/exp-*.mjs`.

---

## 7. PARKED, BY THE OWNER'S DECISION

Normalising the racer types to one body size. It would erase the remaining 2.21×, but sprite size
drives `computeRacersPerRow` and therefore the start grid and every race — an **engine** change,
waiting for a block with the full ceremony.

---

## 8. THE OWNER'S EYE

**Start on Searound.** You have seen 219 px there and liked it; LEADER now ships at 225, so that is
the first thing to confirm — it should look like the picture you already approved.

**Then Dirt Oval.** The same 0.75 should now *feel the same*. Under the old unit its LEADER 2 was 356
px against Searound's 262; the horse should read as a bit smaller than the manta, and nothing else
should differ.

**Then a 300 px track** — Mountainstreet, River Run, Seatrack or Space Sprint. Those are the yardstick:
the unit does not change them at all. What you may notice is the opposite of before — they were the
tracks that looked *too wide*, and 225 px is a much closer shot than the 600 they used to get.

Watch for: the same number feeling the same everywhere, and the **manta still visibly bigger than the
horse** — that is deliberate and is the half that stays.

The control is **"World in shot (corridors)"** in Camera Advanced, and **"Standard corridor
(world px)"** right below the state profiles rescales everything at once if the whole game feels too
close or too far.

Press **M** and send the **whole** line.
