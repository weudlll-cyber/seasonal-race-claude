# CAMERA-PICTURE-FIXES-1 — two measured defects, cleared before the framing block

Branch `camera-refactor`. Camera/render only: **no simulation file in the diff**, no engine ceremony,
no fingerprint. Return tag `pre/picture-fixes` (`854e2f87`), registered in
[TAGS.md](../../docs/TAGS.md) in the same step. Two commits, each with its own eye check.

---

## 1. BUILD-VS-SPEC CONFORMITY

| Spec part | Status | Note |
|---|---|---|
| **1** — fix the forward-bias span formula | **DONE** — `frameGeometry.frameExtentAlong()` | |
| **1** — pre-registered 16.0pp, axes AND diagonal | **MET** (§2) — exact on 6 named headings and a 360° sweep at 1° steps | |
| **1** — does anything else share the shape? | **YES, one site, reported not touched** (§4) | It is inside the min-visible floor, which the spec places in the framing block |
| **2** — remove the render sprite floor | **DONE** | |
| **2** — recommend: does the control go or stay? | **REMOVED** (§5), with the reasoning | |
| **2** — report where the floor bound, per track and state | **DONE** (§3) | |
| **HYGIENE** — `overviewOffsetPx` key, slider, default, migration | **DONE** (§6) | |
| **TESTS** — adapt and extend; diagonal specifically | **DONE** — 31 new in commit 1, 9 rewritten in commit 2 | |
| **NOT IN BLOCK** — forwardFrac/leadAhead, min-racers, containment clamp, PHOTO_FINISH | **UNTOUCHED** | The 65 px / 9pp tracking-lag observation is recorded in §7 and not acted on |

**Deviations declared.** Two, both small:

1. **A second config schema bump (v19).** The spec asked for the `overviewOffsetPx` key to be removed
   and stored configs to lose it cleanly. That needs a migration, and the same migration is the right
   place to drop `overviewTargetScreenPx`, which commit 2 orphans. One bump, two keys.
2. **A stale diagnostic test was deleted** (`trackCorridor.test.js`, the Block-Z sprite-size trace).
   It was a printout of a hypothesis chase about the floor — including the conclusion "floor IS
   active in OVERVIEW for both" — which is now false by construction. Not adaptable; deleted.

---

## 2. COMMIT 1 — the pre-registered 16.0pp

`_applyLeaderForwardBias` needs the frame's reach along the subject's heading. It used
`|cosθ|·W + |sinθ|·H` — a **blend of the two side lengths**, whose weights sum to `|cosθ| + |sinθ|`:
1 on an axis, up to √2 between them. The correct quantity is the rectangle's **chord through its
centre**, `min(W/|cosθ|, H/|sinθ|)`.

| heading | frame reach: blend | chord | over | displacement at frac 0.66 |
|---|---:|---:|---:|---:|
| horizontal | 1280.0 | 1280.0 | 1.000× | **16.0pp** |
| vertical | 720.0 | 720.0 | 1.000× | **16.0pp** |
| 30° | 1440.0 | 1440.0 | 1.000× | **16.0pp** |
| 45° | 1414.2 | 1018.2 | **1.389×** | **16.0pp** |
| 60° | 1069.3 | 831.4 | 1.286× | **16.0pp** |
| **owner's 74°** | **1091.4** | **759.9** | **1.436×** | **16.0pp** |

Before the fix the same 0.66 displaced **23.0pp** at his heading, which put the leader at 84.5% down
the frame — what his eye caught. The acceptance holds across a **full 360° sweep at 1° steps**, not
only the sampled headings.

**The axis cases are bit-unchanged.** That is the whole point: they were already right, which is why
an axis-only suite passed against the bug for as long as it existed. The new tests are
diagonal-first, and include a failure proof that recomputes the old blend and shows it giving 23.0pp.

Interesting property worth recording: the blend also agrees with the chord **on the corner heading**
(both equal the frame diagonal there) and never exceeds the diagonal. It is exact at three headings
per quadrant and wrong between them — which is a good deal of why it looked plausible.

---

## 3. COMMIT 2 — where the sprite floor bound, before removal

`computeRenderDisplayScale` applied `Math.max(proportionalScreenPx, minTargetScreenPx)` with
`minTargetScreenPx` = `cameraConfig.overviewTargetScreenPx` = **28 px**. Measured at the shipped
defaults, N=20, each track's own racer type:

| track | type | body px | OVERVIEW (4) | LEADER (2) | LEAD_CH (2) | BATTLE (1.5) | COMEB (1.5) |
|---|---|---:|---|---:|---:|---:|---:|
| city-circuit | motorbike | 18.7 | 20.3 → **28** | 40.5 | 40.5 | 54.0 | 54.0 |
| dirt-oval | horse | 16.9 | 20.3 → **28** | 40.5 | 40.5 | 54.0 | 54.0 |
| garden-path | snail | 18.8 | 20.3 → **28** | 40.5 | 40.5 | 54.0 | 54.0 |
| ice-track | snowmobile | 20.0 | 20.3 → **28** | 40.5 | 40.5 | 54.0 | 54.0 |
| luger-hill | luge | 23.8 | 17.1 → **28** | 34.2 | 34.2 | 45.6 | 45.6 |
| mountainstreet | boarder | 28.5 | 17.1 → **28** | 34.2 | 34.2 | 45.6 | 45.6 |
| river-run | duck | 28.5 | 17.1 → **28** | 34.2 | 34.2 | 45.6 | 45.6 |
| **searound** | manta | 24.9 | **40.5** | 81.1 | 81.1 | 108.1 | 108.1 |
| seatrack | dolphin | 28.5 | 17.1 → **28** | 34.2 | 34.2 | 45.6 | 45.6 |
| space-sprint | rocket | 28.5 | 17.1 → **28** | 34.2 | 34.2 | 45.6 | 45.6 |

**The floor bound in OVERVIEW on 9 of 10 tracks, and in no other state on any track.** Searound is
the exception: its manta is already 40.5 px at 4 track widths.

So removing it changes **OVERVIEW only**: racers shrink from a pinned 28 px to the 17.1–20.3 px the
zoom actually asks for — **27% to 39% smaller**. Everywhere else the picture is bit-identical, because
the floor was never binding there. No shipped racer type sets a per-type `minTargetScreenPx`
override; every track ran the global 28.

The **ceiling** (`maxTargetScreenPx`, 160 px) is kept — a different question, and one the owner has
not asked to change. It does not bind at any shipped default (the largest is 108.1 px). Its guard was
`maxTargetScreenPx > minTargetScreenPx`, which removing the floor would have silently disabled; it is
now a plain positive check, with a test pinning exactly that.

---

## 4. DOES ANYTHING ELSE SHARE THE AXES-RIGHT-DIAGONAL-WRONG SHAPE?

**One site, and it is not in this block's scope.** `_countVisibleRacers` (`CameraDirector.js:2165`)
and `_zoomFloorForMinVisible` (`:2187`) take a **single** `effZoom` and apply it to both axes:

```js
const sx = r.x * effZoom + this.offsetX;
const sy = r.y * effZoom + this.offsetY;     // ← the X scale, used on Y
```

Callers pass the X scale (`cd.zoom * cd._bsX`). On a closed track `effX / effY` = **1.185**, so screen
Y is over-stated by **18.5%** (dirt-oval, searound and ice-track all measure 1.1846–1.1852; open
tracks are unaffected because that mapping is uniform). The visible-racer count is therefore computed
against a mis-projected frame.

This is the bsX/bsY family rather than the diagonal-blend family, but it is the same underlying
mistake: *one number used where the geometry has two*. It feeds the **"Min racers visible" floor**,
which the spec explicitly places in the framing block and forbids touching here. **Reported, not
fixed**, and it should be the framing block's first item — that floor is already flagged in
CAMERA-ZOOM-UNIT-1 §7 for removal, and if it goes, this goes with it.

Everything else came back clean: no other `W`/`H` blend survives in the camera path; `panProgress` in
the diagnostics mixin uses `Math.sqrt(dx²+dy²)` but both terms are already canvas px, so it is a
ratio in one space; the BATTLE grouping was moved to lap-normalised arc distance in 15b and carries
no world-px radius; `_setOverviewGroupTargets` and `guaranteeCamZoom` both take a per-axis `min`,
which is correct for a box.

---

## 5. RECOMMENDATION — the minimum-sprite-size control: **REMOVED**

I removed it, and recommend it stays removed.

With the floor gone, `overviewTargetScreenPx` has **no remaining consumer anywhere**. Its camera use
disappeared in CAMERA-ZOOM-UNIT-1 (it was the OVERVIEW zoom's target sprite size); its render use was
the floor. Keeping it "with the floor defaulting to off" would mean shipping a slider that does
nothing until someone sets it, at which point it would re-introduce exactly the coupling the owner
asked to remove — sprite size becoming a second, silent zoom authority. The owner's rule is that a
control which does nothing must not survive, and this one would do nothing or do harm.

If a minimum ever becomes wanted, the honest form is not a render floor but a **framing guarantee**
("widen until the subject is at least N% of the frame"), which lives in the same family as the
full-track-width guarantee and belongs to the framing block.

---

## 6. HYGIENE

**Removed — key, control, label, tooltip, default and migration together:**

- **`overviewTargetScreenPx`** — orphaned by commit 2. Config key, Dev Screen slider, default (28),
  and the v17→v18 clause that preserved it. Stripped from stored configs by the new v18→v19.
- **`overviewOffsetPx`** — the confirmed orphan. Assigned at `CameraDirector.js:502` and **read
  nowhere** since OVERVIEW-FRAMING-1; a stored 150 has done nothing for weeks while its tooltip
  claimed a radial camera shift. Key, per-state profile field, Dev Screen control, both
  `DEFAULT_OVERVIEW_OFFSET_PX` constants (one in the director, one in the timing module), the
  `_overviewOffsetPx` assignment and the timing-module plumbing.
- **`getEffectiveMinTargetScreenPx`** — the floor's resolver, and its `minTargetScreenPx` parameter
  on `computeRenderDisplayScale`.

**Extracted:** `camera/frameGeometry.js` (56 lines) — the frame chord, named and testable instead of
inline arithmetic at the call site. Both members of the axes-right-diagonal-wrong family now live
behind named helpers.

### Line counts

| file | before | after |
|---|---:|---:|
| `camera/CameraDirector.js` | 2873 | 2875 |
| `camera/cameraTimingComputation.js` | 365 | **360** |
| `autoSpriteScale.js` | 123 | **105** |
| `autoSpriteScale.test.js` | 357 | **244** |
| `cameraConfig.js` | 360 | 372 |
| `cameraConfig.test.js` | 1016 | 1016 |
| `cameraMigrations.js` | 378 | 402 |
| `storage/defaults.js` | 714 | **712** |
| `screens/RaceScreen/index.jsx` | 1627 | **1624** |
| `DevScreen/sections/CameraAdvancedSection.jsx` | 1500 | **1479** |
| `diagnostics/trackCorridor.test.js` | 268 | **85** |
| `camera/frameGeometry.js` | — | 56 (new) |
| `camera/frameGeometry.test.js` | — | 180 (new) |

Net **−128 lines**, with the new helper and 31 new tests included. Full client suite green
(**3412 tests**, one file's stale diagnostic removed).

### Noticed and deliberately left

1. **`autoScaleConfig.minTargetScreenPx` (default 32) is a PRE-EXISTING orphan** — it has its own Dev
   Screen slider in `AutoScaleSection.jsx`, but nothing reads it: `computeRacerLayout` and
   `computeBodyNarrowRef` use only `minScale`/`maxScale`, and the render floor read the *camera* key,
   not this one. It was dead before this block and is not orphaned by it. **Left deliberately, and
   this one matters:** `autoScaleConfig` is in `RACE_RELEVANT_CONFIG_KEYS`, so removing the key would
   move the race-relevant world hash — a fingerprint change, which this block must not make. It needs
   a block that carries the ceremony.
2. **Per-type `minTargetScreenPx` in `TUNABLE_FIELDS`** (`racer-types/index.js:235`) — now unreadable
   by anything. No shipped type sets it. Same family as (1); left with it.
3. **`_countVisibleRacers` / `_zoomFloorForMinVisible` single-scale defect** (§4) — framing block.
4. **The v5→v19 migration chain** now carries several migrations whose output later steps discard.
   Correct today; the obvious candidate for collapsing once the owner's stored config is known.

---

## 7. RECORDED, NOT ACTED ON

At `trackWidths` 1 the camera lagged its own target by **65 px of a 720 px frame — 9pp** — with
`trackingTC` at 0.25. At tight zoom the tracking constant costs real screen fraction: the same TC
that is invisible at 4 track widths is a tenth of the frame at 1. That belongs to the framing block's
discussion of where the subject sits, not here.

---

## 8. THE OWNER'S EYE — two checks, one per commit

**Check 1 — the forward bias (commit `703eb457`).** Watch a LEADER shot where the track runs
**diagonally or steeply**, not along a screen axis — the ends of the oval, not the straights. The
leader should sit noticeably **less far forward** than before: at your 0.66 he should be about 66% of
the way along the direction he is travelling, where before he was at ~73%. On the straights nothing
changes at all — those were already correct, and if they move, that is a finding.

**Check 2 — sprite size (commit below).** Watch **OVERVIEW**, on any track except Searound. Racers
should now be **noticeably smaller — 27% to 39%** — because they are finally drawn at the size the
zoom implies instead of being held at 28 px. LEADER, BATTLE, COMEBACK and LEAD_CHANGE should be
**pixel-identical** to before; the floor never bound there. On Searound nothing changes in any state.

Both changes move the picture on purpose. Neither touches who the camera is on or where in the frame
it puts them — that is still the framing block.

Press **M** and send the line rather than describing it — and please send the **whole** line. The last
one was truncated before it reached me (`cfg` and the per-racer witness were missing, with no
`Omitted` counter, which is how I know it was cut rather than shed), and it cost the replay: I could
not reproduce his config or verify his field, and had to do the arithmetic analytically instead.
