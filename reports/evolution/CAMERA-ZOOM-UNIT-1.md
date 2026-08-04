# CAMERA-ZOOM-UNIT-1 — one framing rule, one unit: track widths

Branch `camera-refactor`. Camera-only: **no simulation file in the diff**, no engine ceremony, no
fingerprint. Return tag `pre/zoom-unit` (`2488124f`), registered in [TAGS.md](../../docs/TAGS.md) in
the same step. **The picture deliberately changes** — that is the agreed premise, and the tag is the
only way back to the old framing.

---

## 1. BUILD-VS-SPEC CONFORMITY

| Spec part | Status | Note |
|---|---|---|
| **A** — five states onto ONE rule, parameter in track widths | **DONE** — `camera/zoomUnit.js`, one call site in the director | |
| **A** — same number, same view, every track, any resolution | **DONE** — §4 table: **zero spread on all ten tracks**, by algebra not calibration | |
| **A** — remove the racer-count division `2×W_ref/racersPerRow` | **DONE** — no racer count and no sprite size remain in any zoom path | |
| **A** — confirm the sprite-size coupling is gone | **DONE** (§5), with one correction: a *separate* render floor exists and stays (per your instruction) | |
| **B** — full track width as a GUARANTEE that widens, never steers | **DONE** — `guaranteeCamZoom`, applied with `Math.min`; exactly `n ≥ 1` on every track | |
| **B** — say what becomes of "Min racers visible", leave it | **DONE** (§7) — left in place, unimplemented recommendation given | |
| **C** — clean round defaults, ordering OVERVIEW ≫ LEADER > BATTLE/COMEBACK | **DONE** — 4 / 2 / 2 / 1.5 / 1.5 | |
| **C** — schema bump + deep-merge migration | **DONE** — v18, `migrateV17toV18`, deep merge (Lesson 193) | |
| **D** — hygiene: no orphan keys, sliders, labels or tooltips | **DONE** (§6) — 3 keys and 2 sliders removed, 2 tooltips rewritten | |
| **D** — extract a helper where the change isolates one | **DONE** — `zoomUnit.js` (140 lines), pure | |
| **D** — tests adapted AND extended | **DONE** — 62 obsolete deleted, ~20 adapted, **25 new** incl. 4 failure proofs | |
| **E** — do name tags scale with zoom? | **DONE** (§8) — and the answer is *not* the clean one; read it before the eye test | |
| **VERIFY** — three tests with numbers | **DONE** (§3) | |
| **VERIFY** — per-state, per-track table | **DONE** (§4) | |

**Deviations declared.** Three, all small:

1. **`MAX_CAM_ZOOM` raised 10 → 24.** Not in the spec, but the block fails without it: BATTLE at 1.5
   track widths on Searound needs `cam.zoom` 10.42, so the old ceiling silently delivered **1.56**
   track widths instead of the 1.5 asked for — the exact "same number means different things on
   different tracks" defect this block exists to remove. It is now an absurdity backstop only; the
   meaningful tight-end bound is the guarantee, which is expressed in the owner's own unit.
2. **The countdown moved onto the unit too** (`countdownStartZoomSpritePx` → `countdownStartTrackWidths`,
   default 8). It was the sixth zoom formula and was measured in sprite pixels; leaving it would have
   left one orphan unit behind on the surface being rebuilt.
3. **Two test assertions were re-stated rather than re-numbered**, and both are flagged for the
   framing block: the LEAD_CHANGE entry snap now closes 94.8% of the distance (the containment clamp
   runs after the snap at the tighter zoom) and the min-visible floor tests had to open
   `leaderMinZoomFraction`. Neither is a zoom defect; both are the framing block's territory. §7.

---

## 2. THE UNIT, AND WHY IT IS ON THE SHORT AXIS

```
camZoom  = canvasH / (n × trackWidthPx × axisY)
effY     = camZoom × axisY = canvasH / (n × trackWidthPx)
visibleH = canvasH / effY  = n × trackWidthPx        ← the world size cancels
```

`n` = **how many track widths of world are visible across the frame**, measured on the SHORT screen
axis. Resolution- and topology-invariance is not calibrated; it falls out of the algebra.

**The short axis is not an arbitrary pick, and the next person will assume it was.** The track's
orientation on screen **rotates**: on an oval, "across the track" is horizontal at the top of the lap
and vertical at the ends. The owner's guarantee — two racers side by side stay in frame — has to hold
in *every* orientation, and only the short screen axis guarantees that. Putting the parameter on that
same axis makes the guarantee exactly `n ≥ 1`: his sentence *is* the number, on every track, with no
per-topology threshold to remember. (Had the unit gone on the long axis the guarantee would bind at
1.50 on closed tracks and 1.78 on open — two numbers, and BATTLE at 1.5 would have tripped its own
guarantee at default. Real, but secondary to the rotation argument.)

The long axis is reported, never set: it follows from each projection's aspect ratio (1.50× the
short-axis count on closed tracks, 1.78× on open — an 18.5% anisotropy that predates this block and
is inherent to the shipped closed-track projection scaling X and Y differently).

---

## 3. THE THREE LOAD-BEARING TESTS, WITH NUMBERS

All in `zoomUnit.test.js` (25 tests), each with a **failure proof** computing what the OLD unit gave
for the same question — because a test that can only pass tells you nothing, which is the lesson the
×0.8 ceiling taught this project.

**1. Same setting, any world → same track widths.** Five tracks spanning both topologies and 3072 →
6144 px worlds, at n ∈ {1, 1.5, 2, 4, 8}: every one returns the setting to 9 decimal places, and the
max−min across all five at n = 2 is **< 1e-9**.
*Failure proof:* the same question under `spriteScale` 1.81 gives **2.36 track widths on
Mountainstreet and 5.40 on Searound — a 2.3× spread**.

**2. A larger setting is a wider shot, in every state.** All five states asserted individually, plus
the commensurability the old code could not offer: at the shipped defaults the five numbers read
4.00 / 2.00 / 2.00 / 1.50 / 1.50 exactly, in the owner's ordering.
*Failure proof:* OVERVIEW's old number and LEADER's old number were **not on one scale** (one
multiplied a target sprite size, the other *was* a screen scale), and OVERVIEW's moved with the racer
count — asserted as `not.toBeCloseTo` in both directions.

**3. The guarantee holds at every setting, including the extremes.** n ∈ {0.01, 0.25, 0.5, 0.99, 1,
1.5, 2, 4, 50, 1000} on all five tracks: `min(across, along) ≥ 1` every time. A too-tight setting is
widened to exactly 1.000; a legal one is returned untouched; corrupt input (`NaN`, `0`, `-3`,
`'wide'`, `undefined`) falls back to 2 rather than producing NaN.
*Failure proof:* without the `Math.min`, n = 0.25 on Searound puts **0.25 of a corridor** on screen.

Plus: **the racer count is gone** — the same setting resolves to `cam.zoom` identical to 12 decimal
places for 6, 20, 40 and 60 racers.

---

## 4. TRACK WIDTHS VISIBLE, PER STATE, PER TRACK, AT THE PROPOSED DEFAULTS

| track | open | TW px | OVERVIEW | LEADER | LEAD_CH | BATTLE | COMEBACK | along @LEADER | guarantee |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| city-circuit | no | 197 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.00 | 1.00 |
| dirt-oval | no | 178 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.00 | 1.00 |
| garden-path | no | 198 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.00 | 1.00 |
| ice-track | no | 211 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.00 | 1.00 |
| luger-hill | yes | 250 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.56 | 1.00 |
| mountainstreet | yes | 300 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.56 | 1.00 |
| river-run | yes | 300 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.56 | 1.00 |
| searound | no | 131 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.00 | 1.00 |
| seatrack | yes | 300 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.56 | 1.00 |
| space-sprint | yes | 300 | 4.00 | 2.00 | 2.00 | 1.50 | 1.50 | 3.56 | 1.00 |

**Spread across all ten tracks: 0.000 in every state.** For comparison, the same table before this
block: OVERVIEW 4.34 on nine tracks but **8.69** on Searound and **2.17** at 40 racers on the big open
worlds; LEADER 2.36–5.40; BATTLE 1.52–3.48; COMEBACK 3.07–7.03.

**The proposed defaults, with the measured old numbers beside them:**

| state | new | old range (measured) | why |
|---|---|---|---|
| OVERVIEW | **4** | 4.34 (9/10 tracks), 8.69 searound, 2.17 @N=40 | clearly widest, ~2× LEADER, as described |
| LEADER_ZOOM | **2** | 2.36 – 5.40 | the reference shot; new value sits inside the old range |
| LEAD_CHANGE | **2** | 2.36 – 5.40 | same framing as LEADER — only the subject differs |
| BATTLE_ZOOM | **1.5** | 1.52 – 3.48 | tighter than LEADER; lands on the old *tight* end |
| COMEBACK_ZOOM | **1.5** | 3.07 – 7.03 | tighter than LEADER — this one **moves the most**, from wider-than-LEADER to tighter, per the stated ordering |

All five sit above the guarantee (1.0), so nothing is clamped at rest.

---

## 5. THE SPRITE-SIZE COUPLING — confirmed gone, with the correction you asked for

**Gone.** Nothing in any zoom path reads a sprite size or a racer count. OVERVIEW's
`(overviewTargetScreenPx × ovScale) / (drawnBodyWidthRefPx × axisX)` is deleted;
`drawnBodyWidthRefPx` no longer reaches the zoom rule at all (it survives only in OVERVIEW-FRAMING-1's
group-fit floor, which is the framing block's). `overviewMinEffZoom` — the last open/closed branch in
the SCALE path — is deleted with it. Grep for `spriteScale` in the camera zoom path returns nothing.

**The correction.** The planner told the owner there is no drawing-time floor. There is:
`autoSpriteScale.computeRenderDisplayScale` does `Math.max(proportionalScreenPx, minTargetScreenPx)`,
fed by `cameraConfig.overviewTargetScreenPx` (default 28) plus a per-type override and a
`maxTargetScreenPx` ceiling. That is exactly what the owner described when he said sprites should just
scale — and a negative grep was not a proof of its absence. Per your instruction it stays out of this
block and gets its own small block and its own eye test **immediately after this one**; its config key
survives for that reason, with its Dev Screen label and tooltip rewritten to say what it actually is
(a render floor, not a camera setting).

---

## 6. HYGIENE

**Removed — key, slider, label and tooltip together, in the same commit:**

- **`overviewClosedTrackZoom`** — dead in code since 2026-06-04 while its tooltip still described
  "zoom multiplier for OVERVIEW on closed tracks… 1.3 = 30% zoom-in giving pan room". Named in the
  spec; gone from `defaults.js`, `cameraTimingComputation.js`, the migration and the Dev Screen.
- **`overviewMinEffZoom`** — an open-track-only second zoom bound on the surface being rebuilt, and
  the last quarantined open/closed branch in the scale path.
- **`countdownStartZoomSpritePx`** — replaced by `countdownStartTrackWidths` (the sixth formula).
- **`spriteScale`** — the per-state field itself, replaced by `trackWidths`.
- **`_computeZoomForSpriteScale`**, `DEFAULT_SPRITE_SCALE`, `_overviewSpriteScale`,
  `_overviewTargetScreenPx`, and the legacy `spritePctOfCanvas` zoom conversion in
  `_computeZoomLevels` — deleted, not commented out. The tag is what keeps things.

**Extracted:** `client/src/modules/camera/zoomUnit.js` (140 lines) — the unit, the guarantee and the
inverse, pure and importable, so both the director and the tests read the same definition.

### Line counts

| file | before | after |
|---|---:|---:|
| `camera/CameraDirector.js` | 2887 | **2873** |
| `camera/CameraDirector.test.js` | 6952 | **6321** |
| `camera/cameraTimingComputation.js` | 365 | 365 |
| `camera/projection.js` | 154 | 165 |
| `cameraConfig.js` | 348 | 360 |
| `cameraConfig.test.js` | 947 | 1016 |
| `cameraMigrations.js` | 333 | 378 |
| `storage/defaults.js` | 710 | 714 |
| `screens/RaceScreen/index.jsx` | 1624 | 1627 |
| `screens/DevScreen/sections/CameraAdvancedSection.jsx` | 1528 | **1500** |
| `camera/zoomUnit.js` | — | 140 (new) |
| `camera/zoomUnit.test.js` | — | 205 (new) |

Net **−645 lines** across the touched set. The director and the Dev Screen both shrank, which is the
trend the owner asked to be able to see.

### Tests

62 obsolete tests deleted (they tested `_computeZoomForSpriteScale`, the legacy `spritePctOfCanvas`
conversion, OVERVIEW's sprite-size derivation and its count normalisation, and the open/closed
OVERVIEW split — all deleted code; adapting them would have meant inventing assertions for a
mechanism that no longer exists). ~20 adapted, most of them improved: assertions that hard-coded a
zoom now read the rule (`visibleTrackWidths`) or derive from the director instead of restating a
magic number. **25 added**, including the 4 failure proofs. Full client suite green.

### Noticed and deliberately left — input to the hygiene phase

1. **`leaderMinZoomFraction` is a RELATIVE bound** (the min-visible floor may not relax below this
   fraction of the LEADER zoom). It was tuned against the old unit and now binds sooner; three tests
   had to open it to keep testing the floor rather than the interaction. It belongs with the floor,
   in the framing block.
2. **`overviewFrameRacers` / `overviewMinSpriteFrac`** (OVERVIEW-FRAMING-1) still derive an OVERVIEW
   zoom from "fit leader + N racers" with a sprite-size floor. That is a *framing guarantee* — who is
   in frame — and is explicitly the next block's. It now consumes the new setting as its ceiling.
3. **The LEAD_CHANGE entry snap closes 94.8%, not 100%** — the containment clamp runs after the snap
   and holds the offset slightly short at the tighter zoom. Asserted as snap-not-glide; re-tightening
   is the framing block's call.
4. **`FALLBACK_REFERENCE_SPRITE_SIZE`** in `CameraDirector.js` now has one remaining consumer. Small,
   but it is a leftover of the retired unit.
5. **`cameraMigrations.js` still carries the whole v5→v17 chain** including three migrations whose
   output v17→v18 immediately discards. Correct today (a v5 config must still climb), but the chain
   is the obvious candidate for collapsing once the owner's stored config is known to be v18.
6. **The render sprite floor** (§5) — the immediate next block, by your instruction.

---

## 7. "MIN RACERS VISIBLE" — what I would do, and did not do

Under the new unit **how many racers you see is an OUTCOME, not an input**: you set how much world is
on screen, and the field's spread decides how many of them fit. So `minRacersVisible` is no longer a
zoom *input* in any meaningful sense — it is a second, differently-phrased zoom authority that fights
the setting, and it steers (it reduces zoom based on where racers are), which Lesson 192 says a
guarantee must not do.

**What I would do, unimplemented:** delete `minRacersVisible`, `leaderMinZoomFraction` and
`leaderMinZoom` together, and replace them with nothing — the full-track-width guarantee already
prevents the failure they were built for. If the owner still wants "don't lose the pack", the honest
form is a *framing* guarantee (widen until the leader plus N are inside the inner frame), which is
exactly what OVERVIEW-FRAMING-1 already does for OVERVIEW and which the framing block should
generalise. That is one mechanism instead of three, and it belongs to that block, not this one.

**Left untouched here**, as instructed. **For the eye test, set "Min racers visible" to 0** so it
cannot relax the zoom underneath you — otherwise you are reading its floor, not this block's rule.

---

## 8. PART E — do name tags scale with zoom?

**Not cleanly: tags are constant on screen only while effective zoom ≤ ~1.375; above that a rounding
floor (`Math.max(8, round(11 / effZoom))` world px) makes them GROW with zoom — and at the new
defaults that floor binds on every closed track.**

| track @ LEADER 2 | effective zoom | tag on screen |
|---|---:|---:|
| mountainstreet (open) | 1.20 | 11 px (constant) |
| luger-hill (open) | 1.44 | 12 px |
| ice-track (closed) | 2.02 | 16 px |
| dirt-oval (closed) | 2.40 | 19 px |
| searound (closed) | 3.26 | **26 px** |

So on Searound a name tag is ~2.4× the size it is on Mountainstreet at the *same* zoom setting. **Your
eye test will be confounded by this if you compare tracks**, and it will look like the zoom is
inconsistent when it is not — the table in §4 shows the zoom is identical to three decimals. Tags are
a later block and were not touched. Judge the *world* in frame, not the labels.

---

## 9. THE OWNER'S EYE — what to check

The acceptance test is **not** "it looks like before" — it cannot, by construction. It is: **does the
zoom match what you wrote down?**

1. **The full track width is always visible.** Drag any state's "Track widths visible" slider to its
   minimum (1.0) and confirm you can still see the whole corridor — two racers side by side both stay
   in frame, at every point of the lap, including the ends of an oval where the track runs vertically.
2. **OVERVIEW is clearly wider than LEADER** — 4 against 2, so twice as much world across the frame.
3. **The same setting feels the same on Dirt Oval and on Mountainstreet.** This is the one that was
   impossible before (2.3× apart). Ignore the name tags while you do it — §8.
4. **Moving a slider does what its number says.** 2 → 4 shows twice as much; every state uses the same
   scale, so LEADER 2 and BATTLE 2 are the same shot of different subjects.

**Before you start:** set **Min racers visible = 0** (§7), or its floor will relax the zoom underneath
you and you will be reading it instead of this block.

**Not this block:** who the camera is on, who is guaranteed in frame, and where in the frame the
subject sits. That is the framing block, next. If the *subject* looks wrong — off-centre, wrong racer,
leaving the frame — that is not this change, and reporting it as one costs a round.

And you can press **M** and send me the line instead of describing what you see.
