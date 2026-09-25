# DEVSCREEN INVENTORY — every control the screen renders, and whether it still does what it says

**Owns:** what the Dev Panel actually renders, verified against source.

★★ **THIS IS A STOCK-TAKE, TAKEN 2026-09-25 (DEVSCREEN-STOCKTAKE). IT IS NOT A DESIGN.** It proposes
no layout, no grouping and no renaming, and it moves nothing. The owner commissioned the dev screen's
rework on 2026-09-25 (`B-UX2`, with `B-UX3` folded in) and **how** it should be organised is his
question, not this document's. What this document is for is the thing that has to exist before that
question can be answered: a list of what is there.

★★ **HIS SECOND REQUIREMENT, 2026-09-25: EVERYTHING IS CHECKED.** For each control this records
not only that it exists but whether it **still does what it promises** — the key traced from the
control to whatever consumes it, and the effect judged against what the label and tooltip claim. The
four verdicts are defined under *How to read a verdict* below. **A knob that lies is worse than a
dead one**, because it gets turned and then trusted, so `MISLEADING` is the verdict this stock-take
exists to surface.

★ **SOURCE TRACING ONLY.** No race was run to settle a knob. Where a control can only be settled by a
measurement, the verdict is `UNTRACED` with *needs a measured race*, and those are collected in one
list at the end. Nothing on that list was acted on.

## How completeness was checked, in both directions

**The section list came from what the screen MOUNTS, not from the folder.** `DevScreen.jsx` holds one
`SECTIONS` registry — sixteen entries, each with an `id`, a `label`, a `component` and a `tier` — and
that array is the only thing the screen renders. The list was extracted from it mechanically. A
reachability closure was then walked from `DevScreen.jsx` through every relative import: **24 files
under `sections/` are reachable and 0 are not**, so on this date the folder and the mount graph agree
and there is no orphan file pretending to be a section. `RaceTuningSection` is a **composite** — it
renders `DynamicsTuningSection` and `BehaviorTuningSection` — which is why sixteen registry entries
yield seventeen control-bearing files.

**Forward (nothing in the code is missing here):** each section's config keys were extracted
mechanically from the file's own setter idiom — the setter names are discovered from the source
(`function setXxx(key, val)`) rather than guessed, so a section that invents a new one is still
covered — and every extracted key appears below.

**Backward (nothing here is absent from the code):** every key this document names for a section was
searched for in that section's file. Both directions are re-runnable; the method is stated so a later
reader can repeat it rather than trust it.

★ **The durable identifiers are the label, the config key and the `data-testid`.** Line numbers are
deliberately not recorded — an inventory pinned to line numbers is stale on the next commit. That
convention is inherited from the 2026-07-23 version of this document, not invented here.

## How to read a verdict

| Verdict | Means |
| --- | --- |
| **MATCHES** | The reader does what the label says, and the reader is named. |
| **MISLEADING** | It IS read, but the effect is not what the label promises. How they differ is stated. |
| **SUSPECTED DEAD** | Nothing found reads the key, by an uncapped search of the whole repository. Recorded as SUSPECTED unless the absence is total, and what was searched is stated. |
| **UNTRACED** | The chain could not be followed from source with confidence. Where it was lost, and what would settle it, are stated. |

★ Counts are grouped by the project's own line between "changes the race" and "changes the picture":
`RACE_RELEVANT_CONFIG_KEYS` and `COSMETIC_CONFIG_KEYS` in
[`configFingerprint.js`](../client/src/modules/parity/configFingerprint.js). That split is reused, not
invented for this document.

## The sixteen sections the screen mounts, in registry order

| # | Tier | id | Label | Component |
| --- | --- | --- | --- | --- |
| 1 | operator | `defaults` | Race Defaults | `RaceDefaults.jsx` |
| 2 | operator | `password` | Change Password | `ChangePasswordSection.jsx` |
| 3 | operator | `groups` | Player Groups | `PlayerGroupsManager.jsx` |
| 4 | operator | `racers` | Racer Types | `RacerManager.jsx` (+ `RacerEditModal.jsx`) |
| 5 | operator | `tracks` | Tracks | `TrackManager.jsx` |
| 6 | operator | `branding` | Branding | `BrandingProfiles.jsx` |
| 7 | operator | `history` | Race History | `RaceHistory.jsx` |
| 8 | advanced | `race-tuning` | Race Tuning | `RaceTuningSection.jsx` → `DynamicsTuningSection.jsx` + `BehaviorTuningSection.jsx` |
| 9 | advanced | `sprite-size-range` | Sprite Size Range | `SpriteSizeRangeSection.jsx` |
| 10 | advanced | `camera-advanced` | Camera Advanced | `CameraAdvancedSection.jsx` |
| 11 | advanced | `nametag-visibility` | Name Tag Visibility | `NameTagVisibilitySection.jsx` |
| 12 | advanced | `autoscale` | Auto-Scale | `AutoScaleSection.jsx` |
| 13 | advanced | `surfaces` | Surface Classes | `SurfaceClassManager.jsx` |
| 14 | advanced | `config-export` | Export Race Config | `ConfigExportSection.jsx` |
| 15 | advanced | `system` | System | `SystemSettings.jsx` |
| 16 | advanced | `users` | User Management | `UserManagementSection.jsx` |

---

# 1 · RACE DEFAULTS (`RaceDefaults.jsx`) — operator tier

Backing store: `KEYS.RACE_DEFAULTS`, defaults in `DEFAULT_RACE_DEFAULTS` (`defaults.js`). One
card-level **Reset Defaults** button restores the whole block. Every control carries an
`InfoTooltip`. **COSMETIC/RACE split:** this block is in neither `RACE_RELEVANT_CONFIG_KEYS` nor
`COSMETIC_CONFIG_KEYS` — it is not part of the config world the fingerprint hashes at all. It is
*operator defaults*, and three of its eight controls turn out to reach nothing.

**8 controls.**

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Race Action (pills: Quiet / Medium / Wild) | `raceActionStage` | `'quiet'` | yes | **MATCHES** |
| Default Race Duration (pills: 30 / 60 / 90 / 120) | `duration` | 60 | yes | ★ **MISLEADING** |
| Default Number of Winners (Podium Spots) | `winners` | 3 | yes | **MATCHES** |
| Max Players — Closed Tracks | `maxPlayersClosed` | 40 | yes | **MATCHES** |
| Max Players — Open Tracks | `maxPlayersOpen` | 100 | yes | **MATCHES** |
| Auto-advance to Result Screen after race | `autoAdvance` | false | yes | ★ **SUSPECTED DEAD** |
| Delay (seconds) | `autoAdvanceDelay` | 5 | yes | ★ **SUSPECTED DEAD** |
| Sound effects | `soundEffects` | true | yes | ★ **SUSPECTED DEAD** |

**Readers, for the four that have one.** `raceActionStage` is normalised at the boundary
(`normalizeRaceActionStage`) into the race payload and travels with the race to the engine, and it is
one of the nine identifier inputs. `winners` reaches the payload and the result screen slices the
finish order by it. `maxPlayersClosed` / `maxPlayersOpen` are read by `fieldCap.js` (`fieldCapFor`),
which is the only limit on a field size.

### ★ MISLEADING — "Default Race Duration"

It **is** read, which is why it is not dead: `SetupScreen.jsx` seeds `raceSettings.duration` from it,
and `effectiveOpenTrackDuration` falls back to that value. **But it falls back to it only when
`openNaturalMaxSec` is 0**, which happens only when the selected track has no `pathLengthPx` — that
is, no geometry. A track with no geometry is **refused at start** (`selectedGeometryReady` gates
`canStart`, QUIET-FAILURES-1). So the one path that consumes this value cannot produce a race.

In every case that does start a race the value is ignored: a **closed** track's length is
`laps × pathLengthPx / normalSpeed` and the duration is derived, never chosen; an **open** track uses
the operator's own slider, or `trackDefaultSeconds(...)` from the track. The value also travels into
the race payload as `race.duration`, and **nothing reads that either** — `RaceScreen` and
`ResultScreen` never look at it, and the history entry's `duration` is the measured `elapsedTime`.

The label says *"Default Race Duration"* and the tooltip *"Default length of a race in seconds"*, of
settings *"applied to every new race"*. The effect is: applied to no race that can be started.
**Written down and left exactly as it is** — what to do about it is a decision, not a stock-take.

### ★ SUSPECTED DEAD — the three at the bottom of the card

`autoAdvance`, `autoAdvanceDelay` and `soundEffects` are written by their controls and read by
nothing.

**What was searched:** the whole repository, uncapped, for `autoAdvance`, `autoAdvanceDelay`,
`soundEffects`, and the snake-case spellings `auto_advance` and `sound_effects`, across `.js`,
`.jsx`, `.mjs`, `.json` and `.md`, excluding only `node_modules`, `.git` and build output. **Every
hit is one of three things:** the declaration in `defaults.js`, the control in `RaceDefaults.jsx`, or
one unrelated string in `DevScreen.raceAction.test.jsx`'s fixture. There is no consumer on the client,
none on the server, none in `shared/` and none in `scripts/`.

They are recorded as **SUSPECTED** rather than flatly dead for one reason only: absence of a hit is
not proof of absence of a reader, since a value could in principle be reached through a dynamic key.
Nothing in this codebase does that with this store — `useStorage(KEYS.RACE_DEFAULTS, …)` hands out a
plain object and every other consumer names its field — so the suspicion is thin. It is kept because
the rule is that only a total absence earns a flat DEAD, and "I could not construct the dynamic
access" is not the same as "it cannot exist".

★ **Auto-advance is a pair, and the pair is consistent:** the Delay stepper is rendered only when
`autoAdvance` is on, so a dead toggle hides a dead stepper. Neither is reachable by a race.

### Also in this block, with no control at all

`language: 'en'` sits in `DEFAULT_RACE_DEFAULTS` and has **no DevScreen control and no reader** —
searched the same way as the three above. It is not counted as a control below, because it is not one;
it is noted here so a later reader of `defaults.js` does not go looking for the missing UI.

---

# 2 · CHANGE PASSWORD (`ChangePasswordSection.jsx`) — operator tier

Not a config section: nothing here is persisted to a config store, and no key exists. Three fields,
all with tooltips, all consumed by one submit against the server.

**3 controls.**

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Current password | — (transient form state) | — | yes | **MATCHES** |
| New password | — (transient form state) | — | yes | **MATCHES** |
| Repeat new password | — (transient form state) | — | yes | **MATCHES** |

The three tooltips are unusually honest about where each field is checked — the current password is
verified by the server, the new one against the server's own password rule, and the repeat is stated
to be a browser-side typo guard the server has no concept of. **MATCHES** on all three: the reader is
the section's own submit handler and the server's password route.

---

# 3 · PLAYER GROUPS (`PlayerGroupsManager.jsx`) — operator tier

A CRUD manager over named rosters, stored on the server (`playerGroupApi`). Two editable fields per
group; everything else on the card is a list, a button or a confirmation.

**2 controls.**

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Group Name | `name` (per group) | — (new group is empty) | yes | **MATCHES** |
| Player Names (textarea) | `players` (per group) | — | yes | **MATCHES** |

Both are read back by the Setup Screen's group picker, which is what a saved roster is for.

---

# 4 · RACER TYPES (`RacerManager.jsx` + `RacerEditModal.jsx`) — operator tier

Two surfaces. The manager lists the types and carries **one** control; the editor modal, opened per
type, carries eleven. The eleven are per racer type, so the on-screen count multiplies by the number
of types — the inventory counts the distinct controls, not the instances.

## 4a · The manager card

**1 control.**

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Active (checkbox, per type) | `isActive` | per type, in the registry | no | **MATCHES** |

Read by `racer-types/index.js` and the Setup Screen, which offers only active types.

★ **The card also carries a four-item LEGEND** — *"Per type you can configure: Name · Sprite ·
Characters · Min Size"* — each with its own tooltip. **These are not controls**, they are pointers to
the Racer Editor, and they are not counted as such. They are noted because a reader counting
tooltips on this screen will find four here that belong to no knob.

## 4b · The Racer Editor modal

**11 controls**, all with tooltips (the three cloud parameters share one tooltip on their group).

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Speed Multiplier | `speedMultiplier` | per type | yes | **MATCHES** |
| Display Size (px) | `displaySize` | per type | yes | ★ **MISLEADING** |
| Anim Period (ms) | `basePeriodMs` | per type | yes | **MATCHES** |
| Leader Ring Color | `leaderRingColor` | per type | yes | **MATCHES** |
| Leader Ring Width (rx) | `leaderEllipseRx` | per type | yes | **MATCHES** |
| Leader Ring Height (ry) | `leaderEllipseRy` | per type | yes | **MATCHES** |
| Minimum on-screen diameter (slider) | `minTargetScreenPx` | per type | yes | **MATCHES** |
| Surface classes (pills) | `surfaceClasses` | per type | yes | **MATCHES** |
| Density | `surfaceEffectOverrides.spawnProbability` | per class | yes (group) | **MATCHES** |
| Cloud size (px) | `surfaceEffectOverrides.endSize` | per class | yes (group) | **MATCHES** |
| Lifetime (frames) | `surfaceEffectOverrides.lifetimeFrames` | per class | yes (group) | **MATCHES** |

The field list is not hand-written here: it is `TUNABLE_FIELDS` in `racer-types/index.js`, which the
modal filters into `STANDARD_FIELDS` plus the three handled specially. Readers, in order:
`durationModel.js` (`getSpeedMultiplier`), `autoSpriteScale.js`, the racer type classes themselves for
the animation period and the three leader-ring values, `autoSpriteScale.js` again for the minimum
diameter, the race's compatibility check for the classes, and
`surface-effects/trailResolver.js` → `generators/cloud.js` for the three cloud parameters.

### ★ MISLEADING — "Display Size (px)"

The tooltip says *"Sprite size in pixels. Default range 35–50 px."* That is true and it is not the
whole effect. **Setting this field at all turns AUTO-SCALING OFF for the race, and changes where every
racer starts.**

At `raceParams.js` the branch is `if (autoScaleConfig?.enabled && !hasDisplaySizeOverride)`. With an
override present the branch is skipped, so `displaySizeScale` stays `1` and `physicalSpriteSize` is the
raw `displaySize` rather than the value `computeRacerLayout` would have chosen for the field size and
the track width. `physicalSpriteSize` is **not a drawing quantity** — the file says so in its own
comment: it feeds `rowGapPx` and `rowCount`, which is the starting grid. So a control presented as
sprite sizing silently disables a whole subsystem and moves the start row.

★ **Not a new discovery, and that is part of the finding.** `B-UX4` recorded this in 2026-04-29 and the
owner **dropped** that row on 2026-09-25, so the behaviour is now settled and intended. What is
recorded here is narrower and still true: **the control does not say it.** Re-verified at the tree on
2026-09-25 rather than taken from the dropped row, because a closed row is not evidence.

---

# 5 · TRACKS (`TrackManager.jsx`) — operator tier

A CRUD manager over track records. The track's SHAPE is not edited here — that is the Track Geometry
Editor, a separate screen this card links to.

**8 controls** (the colour picker and its hex field are counted as two, see *Duplicates* at the end
of this document).

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Track name | `name` | — (new track empty) | yes | **MATCHES** |
| Icon | `icon` | — | no | **MATCHES** |
| Description | `description` | — | no | **MATCHES** |
| Colour (picker) | `color` | — | no | **MATCHES** |
| Colour (hex field) | `color` | — | no | **MATCHES** |
| Default racer type | `defaultRacerTypeId` | per track | no | **MATCHES** |
| Max racers | `maxRacers` | derived, overridable | no | **MATCHES** |
| Surface classes (pills) | `surfaceClasses` | `[]` | yes | **MATCHES** |

Readers: the Setup Screen's track card and picker for the first five; `fieldCap.js` and `rowLayout.js`
for `maxRacers`; the race's surface resolution for the classes.

★ **`maxRacersIsOverride` is form state, not a stored field** — it is stripped before save
(`const { maxRacersIsOverride: _drop, ...formData } = form`) and exists so the form can tell an
operator's chosen cap from the derived one. Correctly not counted as a control.

★ **This card carries a six-item LEGEND with tooltips and no controls** — *"Configured in the Track
Geometry Editor: Closed/Open · Laps · Background · Start · Finish · Width"*. Same pattern as the Racer
Types card. Not counted, noted so the tooltip count is not read as a control count.

---

# 6 · BRANDING (`BrandingProfiles.jsx`) — operator tier

Branding profiles, stored on the server (`brands.js`). One profile is active per session.

**11 controls** (two colours are a picker + hex pair each, counted as four).

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Profile name | `name` | — | yes | **MATCHES** |
| Event name | `eventName` | — | no | **MATCHES** |
| Subtitle | `subtitle` | — | no | **MATCHES** |
| Primary colour (picker) | `primaryColor` | — | yes | **MATCHES** |
| Primary colour (hex field) | `primaryColor` | — | yes | **MATCHES** |
| Secondary colour (picker) | `secondaryColor` | — | yes | **MATCHES** |
| Secondary colour (hex field) | `secondaryColor` | — | yes | **MATCHES** |
| Sponsor text | `sponsorText` | — | yes | **MATCHES** |
| Logo (file upload) | `logo` | — | yes | **MATCHES** |
| Logo max height | `logoMaxHeight` | 90 | no | **MATCHES** |
| Logo opacity | `logoOpacity` | 0.9 | no | **MATCHES** |

Readers: `BrandLogoOverlay.jsx` and `overlayGeometry.js` for the logo trio, `CeremonyBrandCard.jsx`
and the result screen for the text and colours, `SetupScreen.jsx` for the subtitle and sponsor text
that travel with the race.

★ **`logoCorner` has a reader and NO control.** It is in the profile's shape, defaults to
`'bottom-right'`, is persisted by `brands.js` and is read by `BrandLogoOverlay.jsx` — but nothing on
this screen sets it. This is the inverse of a dead knob: a live setting with no way to change it. Not
counted as a control, recorded because it is exactly the kind of thing a stock-take is for.

★ **Another two-item LEGEND with tooltips and no controls** — *"Also configurable per race: Sponsor
Overlay · Overlay Position"*.

---

# 7 · RACE HISTORY (`RaceHistory.jsx`) — operator tier

A viewer, not a config section. Two filters, both with tooltips; everything else is a table, a
paginator, an export button and a repeat action.

**2 controls.**

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Filter by Track | — (component state `filterTrack`) | none (All tracks) | yes | **MATCHES** |
| Filter by Date | — (component state `filterDate`) | none | yes | **MATCHES** |

Both are applied in one `filtered` memo over the local history and again over the team's server page,
and both do exactly what their labels say.

★ **Worth recording as the opposite of a MISLEADING control**, because it is the pattern the rest of
this screen could be measured against: the filters could hide a race silently, and the code refuses
to let them. `hiddenByFilters` recomputes the list without the filters and states the difference on
screen as a number, under a comment that says a filter may hide a race but may not hide that it is
hiding one. Nothing was changed here; it is named because a stock-take that only lists faults gives a
false picture of the screen.

---

# 8a · RACE TUNING → DYNAMICS (`DynamicsTuningSection.jsx`)

*This part predates the stock-take and is kept as it stood — it was written on 2026-07-23 and
re-verified since, and rewriting it would throw away work that is still correct. The verdicts for its
controls are added at the end of this part rather than folded into its tables, so the original text is
not disturbed.*

**Read-only inventory of what the DevScreen actually renders.** Rebuilt completely against
`client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx` as rendered (dead-mechanisms cleanup,
2026-07-23; re-checked after the DevScreen reorg the same day) — every control in the file appears below,
and nothing below is absent from the file.
Ground truth for the shells: `SubCard.jsx` (`SubCard` / `SubHeading`). Config keys + shipped defaults from
`client/src/modules/storage/defaults.js` (`DEFAULT_RACE_DYNAMICS_CONFIG`, `DEFAULT_BASE_SPEED_CONFIG`,
`DEFAULT_ROW_LAYOUT_CONFIG`, `DEFAULT_FRAME_TIMING_CONFIG`). The label + key + testId are the durable
identifiers; line numbers are deliberately not recorded.

> Choreography is **unconditional** — there is no enable toggle. The old "Director" section (the
> `governorDirector*` / `governorMax*` controls) and the separate "Hero choreography (v4)" section
> (`directorV4*`) are **gone**, along with the `RENAMED_KEY_MIGRATION` shim that once carried their
> persisted values into the `pulk*` / `choreo*` namespace (removed in `b4e1aba` — stale configs now fall
> back to defaults). See [RACE-ACTION.md](RACE-ACTION.md#8-configuration-knobs) for the live knobs.

---

## SECTION ORDER (as rendered — race timeline: global/technical first, then phases in temporal order)

The section renders five `SubCard`s. Cards 2, 3, and 5 hold multiple control groups separated by
`SubHeading`s, each with its own per-group Reset.

### 0. "Reset All Defaults" — the Race Tuning card-level button

The **Race Tuning** card (`RaceTuningSection.jsx`) wraps DynamicsTuningSection + BehaviorTuningSection and
carries one card-level **"Reset All Defaults"** button. Its semantics are aligned with the HUD badge's
race / cosmetic split (`configFingerprint.js`): it restores **exactly the five RACE-RELEVANT config
blocks** — `raceDynamicsConfig`, `raceBehaviorConfig`, `rowLayoutConfig`, `baseSpeedConfig`,
`autoScaleConfig` — to their shipped defaults, and **deliberately leaves the two COSMETIC blocks
(`cameraConfig`, `frameTimingConfig`) untouched** so an operator's dev camera overlays / frame-timing
tweaks survive a race-tuning reset. The reset targets are read from the single source of truth
`raceRelevantReset.js` (`RACE_RELEVANT_DEFAULTS`); `autoScaleConfig` lives in its own Auto-Scale tab and is
persisted directly by the master reset. Invariant pinned in `raceRelevantReset.test.js`: after this reset
`splitConfigDiffs(...).race.count === 0` — so the badge reads quiet grey "0 race" by construction, and the
button and the badge can never disagree. (Before 2026-07-24 the button reset `frameTimingConfig` — a
cosmetic block — and missed `autoScaleConfig` — a race block; both were corrected in the speed-150
re-baseline arc.)

### 1. Frame Timing — global / technical (not the race itself)

Card Reset: `reset-frame-timing`. Backing config: `frameTimingConfig`. COSMETIC — the card-level "Reset All
Defaults" does **not** touch it; only this per-card `reset-frame-timing` link resets it.

| Control                         | Config key            | Shipped default |
| ------------------------------- | --------------------- | --------------- |
| dt-Smoothing (EMA-Alpha)        | `dtSmoothingAlpha`    | 0.7             |
| Render Interpolation (checkbox) | `renderInterpolation` | true            |

Camera/render only — physics always runs fixed 16 ms steps, unaffected by this card.

### 2. Speed — four sub-headings

Card has no card-level Reset. Backing config: `baseSpeedConfig` (normal speed + range) +
`raceDynamicsConfig` (re-roll).

**Sub-heading "Normal Track Speed"** — Reset `reset-normal-speed` — ADDED by the speed/duration ship:

| Control             | Config key                              | Shipped default | Test id              |
| ------------------- | --------------------------------------- | --------------- | -------------------- |
| Normal Speed (px/s) | `normalSpeedPxPerSec` (baseSpeedConfig) | 150             | `normal-speed-input` |

THE pace of the game: world pixels a normal racer covers per second, identical for every track and
every racer class. Every race duration is derived from it — closed races last
`laps × pathLengthPx / normalSpeed`, and an open track's finish line is where a normal racer is
after the chosen time (see `client/src/modules/durationModel.js` and
[SIM.md](SIM.md) → _THE canonical speed/duration model_). Changing it rescales every derived
duration in the game at once and nothing else. 150 px/s is the owner's shipped pick (a calmer,
more readable pace; the earlier provisional 225 reproduced the pre-ship browser pace to within 1%).
See [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md) for the speed-150 baseline.

**Sub-heading "Speed Range"** — Reset `reset-speed-range`:

| Control   | Config key              | Shipped default |
| --------- | ----------------------- | --------------- |
| Min Speed | `min` (baseSpeedConfig) | 0.00096         |
| Max Speed | `max` (baseSpeedConfig) | 0.00113         |

These are the **spread only** — how far individual racers deviate from the normal speed. They no
longer set the absolute pace (that is Normal Track Speed above), and they no longer enter the pace
via an N-calibrated expected-minimum factor: the pace is defined by the mean racer, and the spread
widens the finishing field around it.

**Sub-heading "Speed Re-Roll"** — Reset `reset-speed-reroll`:

| Control                            | Config key                     | Shipped default |
| ---------------------------------- | ------------------------------ | --------------- |
| Variation Width (%)                | `reRollVariationPercent`       | 75              |
| Transition Smoothness (s)          | `reRollTransitionDuration`     | 3.0             |
| Trajectory Transition Duration (s) | `trajectoryTransitionDuration` | 1.0             |
| Re-Roll Frequency (÷ interval)     | `reRollIntervalDivisor`        | 10              |
| Last Roll Position (%)             | `reRollLastPositionPercent`    | 95              |

Also renders a read-only preview (`data-testid="reroll-preview"`).

**Sub-heading "Gap-Cap Re-Roll"** — Reset `reset-gap-reroll`. Moved here from the PULK card in the
DevScreen reorg (2026-07-23): it loads the very dice the Speed Re-Roll block above schedules, so this is
where it is findable. The shipped cohesion mechanism (default ON since 2026-07-22, retuned 2026-07-23 to
G = 0.75 / strength = 0.5, then **flipped 2026-07-26 to the confirmed candidate G = 0.5 / strength = 1.0**
after the ten-track confirm gate — see [reports/parity/GS-CONFIRM-GATE.md](../reports/parity/GS-CONFIRM-GATE.md));
turning the toggle OFF restores the pre-feature game byte-identically, which is the world every committed
baseline was measured in. Changes take effect on the next race. See [SIM.md](SIM.md).

| Control                                          | Config key                  | Shipped default | testid                        |
| ------------------------------------------------ | --------------------------- | --------------- | ----------------------------- |
| Gap-Reroll enabled (checkbox)                    | `gapRerollEnabled`          | true            | `gap-reroll-toggle`           |
| Gap-Reroll G (lengths) 0.5–4.0                   | `gapRerollThresholdLengths` | 0.5             | —                             |
| Gap-Reroll strength 0–1.5                        | `gapRerollStrength`         | 1.0             | —                             |
| Gap-Reroll mode symmetric/down-only              | `gapRerollMode`             | 'symmetric'     | `gap-reroll-mode`             |
| Gap-Reroll dev marker (rendering-only cyan ring) | `gapRerollDevMarker`        | false           | `gap-reroll-devmarker-toggle` |

### 3. Bonus — two sub-headings

Card has no card-level Reset. Backing config: `raceDynamicsConfig`.

**Sub-heading "Race Plan Bonus"** — Reset `reset-race-plan-bonus`:

| Control                      | Config key                        | Shipped default |
| ---------------------------- | --------------------------------- | --------------- |
| Race Plan Bonus Strength     | `racePlanBonusStrengthMultiplier` | 2.0             |
| Bonus active until (% race)  | `racePlanBonusTransitionEnd`      | 0.75            |
| Bonus fade duration (ms)     | `racePlanBonusFadeDuration`       | 1500            |
| P-Controller starts (% race) | `racePlanCorridorStart`           | 0.55            |
| P-Controller ends (% race)   | `racePlanCorridorEnd`             | 1.0             |
| Race Plan min duration (s)   | `racePlanMinDurationSec`          | 30              |

Carries the **timing warning** (`data-testid="race-plan-timing-warning"`): _"These timing values interact
closely with the 8 physics parameters (lateralForce, lateralDamping, etc.) and with the Race Plan bonus/malus
strength. Changing them may require re-tuning the physics parameters. Use the simulation sweep to validate any
changes."_ Keep the warning. (Also renders read-only preview text: `race-plan-timeline-hint`.)

**Sub-heading "Phase-Split Bonuses"** — Reset `reset-phase-split`:

| Control                                      | Config key               | Shipped default |
| -------------------------------------------- | ------------------------ | --------------- |
| Enable phase-split bonuses (master checkbox) | `phaseSplitBonusEnabled` | true            |
| Area bonus — EARLY                           | `areaBonusEarly`         | 1.0             |
| Area bonus — POST                            | `areaBonusPost`          | 1.0             |
| Row bonus — EARLY                            | `rowBonusEarly`          | 1               |
| Row bonus — POST                             | `rowBonusPost`           | 1               |

The master switch also gates the PULK-phase area/row bonuses, which live in the PULK Phase card (section 5).

### 4. Start — Row Start layout

Card Reset: `reset-row-start`. Backing config: `rowLayoutConfig`. Summary text: `row-start-summary`.

| Control             | Config key          | Shipped default |
| ------------------- | ------------------- | --------------- |
| Row Gap Multiplier  | `rowGapMultiplier`  | 1.5             |
| Speed Bonus Factor  | `speedBonusFactor`  | 1.0             |
| Max Capacity Factor | `maxCapacityFactor` | 0.3             |

### 5. PULK Phase — card controls, then "PULK bonuses" and "B2 Attackers" sub-headings

The mid-race window `[0.15, PULK end]` where the lead rotation stages the front contest (always live).
Backing config: `raceDynamicsConfig`. Groups run in temporal order: the card controls set the window and
its rotation, the PULK bonuses act inside it, and the B2 attackers resolve last (released into OUTCOME).

**Card-level controls** — Reset `reset-pulk` (resets exactly these six keys):

| Control                               | Config key                         | Shipped default |
| ------------------------------------- | ---------------------------------- | --------------- |
| PULK begin / CHAOS ends (0.10–0.60)   | `racePlanPulkStart`                | 0.15            |
| PULK end / OUTCOME begins (0.25–0.60) | `choreoOutcomeStart`               | 0.6             |
| Leader brake                          | `pulkLeaderBrake`                  | 0.1             |
| Challenger boost (cap)                | `pulkChallengerBoost`              | 0.06            |
| Ex-leader drop depth (lengths)        | `pulkLeadRotationDropDepthLengths` | 8               |
| Choreography intensity (0–1)          | `choreoIntensity`                  | 0.6             |

`racePlanPulkStart` (**PULK begin**, the CHAOS→PULK boundary) is now a surfaced control (HYGIENE-1): input
widget clamp [0.10, 0.60], validated config range **[0.10, 0.60]** (per the measured chain-world plateau);
shipped default **0.15** (COMBO15). It is part of the `raceDynamics` block, so the master **Reset All
Defaults** restores it and the HUD config badge counts it as race-relevant. The PULK-end control's input
widget clamp is **[0.25, 0.60]**, and **the top is the edge of what has been MEASURED, not a limit of
the mechanism** — the mechanism's wall is 0.70 (`choreoResolveB3`), and SWEEP 2 measured 0.70 as
holding, but SWEEP 2 predates the speed-150 re-baseline, COMBO15, gap-reroll's flip and the B2
attackers, so nothing above 0.60 has been measured on the tree that ships. *(Raised to 0.70 by
SLIDER-HEADROOM-1 on 2026-09-03 and REVERSED by the owner on 2026-09-04 for that reason.)*
*(LOADER-BOUND-060-1, 2026-09-04: **the loader's bound is 0.60 too, so the widget and the validator
now state one number rather than two.** It tolerated 0.70 deliberately until then — the slider stood
there for a day, so a stored 0.65 is reachable, and the validator discarded the WHOLE config on any
rejection, so tightening it would have cost an operator every other tuning to correct one key.
**PER-KEY-REJECT-1 removed that cost the same day**: a rejected key falls back to its own default
alone and the operator is told which one, so a stored 0.65 now costs the 0.65 and nothing else.)* *(CONTROL-BOUNDS-1, 2026-09-03: the
widget clamped at 0.55 while the shipped value is 0.60, so the control could not display or restore what
the game runs. The two numbers were recorded separately here — "the clamp" and "the validated range" — and
that separation is what let them disagree for 47 days: a widget clamp that is not the validated range is a
defect, not a second fact, so they are now stated once. Both surfaced controls in this card follow the same
rule.)*

**Sub-heading "PULK bonuses"** — Reset `reset-pulk-bonuses`. These act only inside the PULK window; the
area/row pair is gated by the Phase-Split master switch above:

| Control            | Config key      | Shipped default |
| ------------------ | --------------- | --------------- |
| Area bonus — PULK  | `areaBonusPulk` | 0               |
| Row bonus — PULK   | `rowBonusPulk`  | 0               |
| Cohesion bias gain | `pulkBiasGain`  | 2.0             |

**Sub-heading "B2 Attackers"** — Reset `reset-b2-attackers`. Grouped in the DevScreen reorg (2026-07-23):
the cast count and the release hysteresis are one mechanism, and they belong together rather than loose in
the card grid. Last group in the card because attackers resolve latest — cast at the choreo boundary,
peak mid-race, released into OUTCOME.

| Control                               | Config key             | Shipped default |
| ------------------------------------- | ---------------------- | --------------- |
| B2-attacker count (0–5)               | `b2AttackHeroes`       | 3               |
| Attacker re-steer threshold (0.5–3.0) | `packReSteerThreshold` | 1.0             |

`b2AttackHeroes` is SHIPPED ON at 3 (0 casts none and restores the pre-feature game).
`packReSteerThreshold` is the release hysteresis for a FREED attacker: how far past its band edge it may
drift before the servo re-engages at full pinning.

### 6. OUTCOME phase — the GAP LEADER BRAKE, and the servo's noise-blind restart

Added 2026-09-17. These controls were rendered from 2026-09-16 and this inventory did not list them,
which made the completeness claim at the top of this file false while they were missing.

The gap brake is the only mechanism in the engine that slows a racer for being too far AHEAD. Past the
PULK window the outcome servo steers every racer toward his DRAWN rank and cannot see a gap at all;
this is the fallback for that range. It acts on the GAP, never on rank — below its allowance it does
nothing whatsoever — and its strength follows the gap's CHANGE rather than its size, fading with the
gap so the leader is never released with a snap.

**Card-level controls** — Reset `reset-gap-brake` (resets these five keys, V1 included, because the
pair is what must not be on together):

| Control                          | Config key                | testId                      |
| -------------------------------- | ------------------------- | --------------------------- |
| Gap leader brake enabled         | `gapBrakeEnabled`         | `gap-brake-toggle`          |
| Allowed lead (canvas widths)     | `gapBrakeAllowedGapPx`    | —                           |
| Window end                       | `gapBrakeWindowEnd`       | —                           |
| Maximum authority                | `gapBrakeMaxAuthority`    | —                           |
| Servo ignores its own noise (V1) | `servoNoiseBlindEnabled`  | `servo-noise-blind-toggle`  |

★ **The shipped values are deliberately not repeated here** — they live in
`client/src/modules/storage/defaults.js`, which this file names as its ground truth, and each carries
the evidence for it in the comment above it.

★ **V1 ships OFF and must stay off while the brake is on.** Together the brake's release at the end of
its window lands in a single frame instead of being eased; apart they are both safe. The checkbox's
own tooltip says so.

---

## PINNED — config keys that EXIST but have NO DevScreen control

These live in `DEFAULT_RACE_DYNAMICS_CONFIG` (and are validated on load in `raceDynamicsConfig.js`) but are
surfaced by no control — pinned to their tuned defaults. They are intentional, not oversights.

| Key                                       | Shipped default        | What it pins                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chaosSteer`                              | true                   | COMBO15: continuous gentle chaos-phase pull toward each racer's drawn band                                                                                                                                                                                                                                                                                                                                                                                             |
| `chaosSteerGain`                          | 0.06                   | COMBO15: chaos-steer gain                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `bandBias`                                | true                   | COMBO15: band-aware re-roll DRAW bias (the fair-arrival win)                                                                                                                                                                                                                                                                                                                                                                                                           |
| `bandBiasR`                               | 0.6                    | COMBO15: progress from which the draw bias acts                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `bandBiasGain`                            | 0.1                    | COMBO15: draw-bias gain                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pulkEnvelopeMaxEffect`                   | 0.12                   | realism envelope: outer clamp on \|governorMult−1\| (±12%)                                                                                                                                                                                                                                                                                                                                                                                                             |
| `pulkEnvelopeMaxStepPerFrame`             | 0.01                   | realism envelope: per-frame slew limit                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pulkCeilingCap`                          | true                   | cap a boosted racer's speed at the natural band max                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pulkBoostHeadroom`                       | 0.1                    | additive headroom above band max for the pulk ceiling                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pulkFrontPool`                           | 8                      | front-N pool the rotation draws challengers from                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pulkLeadRotationAttackerSlots`           | 2                      | parallel attacker slots                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pulkLeadRotationOutsiderMaxReachLengths` | 15                     | outsider reachability cap (lengths)                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pulkLeadRotationDeadlockTimeoutMs`       | 12000                  | per-boost safety net                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pulkLeadRotationMinHoldMs`               | 750                    | fresh-P1 minimum hold (anti-flicker)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `choreoPackBandStrictness`                | 0.5                    | loose-pack strictness heroes weave through                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoReleaseProgress`                   | 0.97                   | B1 heroes released to natural speed for the finish                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `choreoResolveB2`                         | 0.8                    | B2 band-resolve checkpoint                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoResolveB3`                         | 0.7                    | B3 band-resolve checkpoint                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoResolveB4`                         | 0.65                   | B4 band-resolve checkpoint                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoResolveB5`                         | 0.6                    | B5 band-resolve checkpoint                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `choreoSuppressChaosBonusB1`              | false                  | Stage-1 B1 chaos-bonus spoiler switch (default OFF)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `contestWindowStart`                      | 0.8                    | front-act measurement window start (read by the sim's front-battle observer)                                                                                                                                                                                                                                                                                                                                                                                           |
| `enableRowEnvSmooth`                      | true                   | eases the start-row speed step at the PULK→OUTCOME boundary over 1 s instead of stepping. Had an A/B checkbox while the easing was being compared against the instant step; **retired to pinned in the DevScreen reorg (2026-07-23)** — the comparison was settled by the rowenv ship (measured fairness-neutral, flipped to default ON), so the toggle was only an invitation to re-open a closed question. Key and behaviour unchanged; `RaceScreen` still reads it. |
| `b2AttackPeakRank`                        | 5                      | attacker climb target                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `b2AttackFinalRank`                       | 7                      | attacker fall target (shapes the fall slope under band-arrival)                                                                                                                                                                                                                                                                                                                                                                                                        |
| `b2AttackProgress`                        | {start: 0.4, end: 0.7} | attacker peak-timing jitter window                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `b2AttackResolveProgress`                 | 0.85                   | attacker resolve checkpoint (hero-privilege, later than B2's 0.80)                                                                                                                                                                                                                                                                                                                                                                                                     |
| `b2AttackBandArrival`                     | true                   | release model: free on B2 re-entry (vs fixed-final)                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## REMOVED (must NOT appear anywhere)

- The whole old **Director section** and all `governorDirector*` / `governorMax*` controls.
- The separate **"Hero choreography (v4)"** section and all `directorV4*` keys.
- Any choreography **enable toggle** — choreography is unconditional now.
- The **"Pack release (eye-test)"** checkbox and its config key — removed in the dead-mechanisms cleanup
  (2026-07-23). The mechanism it gated was measured, shelved, and then deleted. `packReSteerThreshold`
  survives because the live B2-attacker release reads it, and its label/tooltip now say so.
- The **B1 lead rotation** config family and the **universal band-arrival** key — sim-only, never had a
  DevScreen control, removed entirely in the same cleanup.

Deliberately not named here: the retired key names. Git history is the archive — `git show 0555f9d`
has them, and repeating them in live docs is how a deleted mechanism gets half-resurrected.
*(CITATIONS-1, 2026-09-03: this named the tag `pre/dead-mechanisms-cleanup`, which the 2026-07-23
collapse deleted; `docs/TAGS.md` records it in the DELETED table. The commit is still reachable. The
same dead tag was standing as a recovery route in FIVE living documents.)*

The `RENAMED_KEY_MIGRATION` shim that once carried persisted values under the old keys forward
(`directorV4*` → `choreo*`, `governorDirector*` / `governorMax*` → `pulk*`) was **removed** (commit
`b4e1aba`); a stale config holding any of those old keys now falls back to defaults rather than migrating.
Removed keys are NOT rejected on load: `loadRaceDynamicsConfig()` merges stored over defaults and validates
only known keys, so a persisted config still carrying a retired key stays VALID — the owner's other
settings survive (no silent reset to defaults) and the retired key rides along inertly, because nothing
reads it any more. Pinned by a test in `raceDynamicsConfig.test.js`.

---

# 9 · SPRITE SIZE RANGE (`SpriteSizeRangeSection.jsx`) — advanced tier

A single-knob section. Backing config: `cameraConfig` (**COSMETIC** by
`configFingerprint.js`). Card reset `reset-sprite-size-cap`.

**1 control.**

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Maximum sprite size (px) | `maxTargetScreenPx` | 160 | yes | **MATCHES** |

Read by `autoSpriteScale.js` (the ceiling branch of `resolveDisplayScale`) and by
`renderRaceFrame.js`. The tooltip's claim — larger lets the camera zoom in close, smaller keeps more
of the field in frame — is the ceiling's actual effect.

★ **A whole section for one value.** Recorded as a fact about the screen's shape, not as a complaint:
counting sections is not the same as counting controls, and this is the clearest case of the two
diverging.

---

# 11 · NAME TAG VISIBILITY (`NameTagVisibilitySection.jsx`) — advanced tier

Backing config: `cameraConfig` (**COSMETIC**). Card reset `reset-nametag-visibility`.

**3 controls**, all with tooltips.

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Name size (% of frame) | `nameTagFrameFrac` | 0.022 | yes | **MATCHES** |
| Gap above racer (px) | `nameTagMarginPx` | 6 | yes | **MATCHES** |
| Show all names for (s) | `nameTagAllUntilMs` | 8000 | yes | **MATCHES** |

All three are read by `renderRaceFrame.js`. ★ **Two of the three controls present a different UNIT
from the one stored** — the size control shows a percentage and stores a fraction (`v / 100`), and the
duration shows seconds and stores milliseconds (`v * 1000`). Both conversions are at the control and
both are correct, so the verdict is MATCHES; it is recorded because the label and the key disagree
about units and a later reader comparing the two will think one of them is wrong.

---

# 12 · AUTO-SCALE (`AutoScaleSection.jsx`) — advanced tier

Backing config: `autoScaleConfig`, whose home is `autoSpriteScale.js`
(`DEFAULT_AUTO_SCALE_CONFIG`) — **RACE-RELEVANT**: it is one of the five blocks the Race Tuning
card's master reset restores, because it moves the starting grid.

**5 controls**, all with tooltips.

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Enabled | `enabled` | **true** | yes | ★ **MISLEADING** |
| Reference Value | `referenceValue` | 23 | yes | **MATCHES** |
| Min Scale | `minScale` | 0.65 | yes | **MATCHES** |
| Min Target Screen Px | `minTargetScreenPx` | 32 | yes | **MATCHES** |
| Max Scale | `maxScale` | 2.5 | yes | **MATCHES** |

Four of the five are read by `autoSpriteScale.js`, and `minScale` / `maxScale` also by
`rowLayout.js`.

### ★ MISLEADING — "Enabled"

The control's own tooltip opens: *"Disabled by default. When off, racer display size is unchanged
(1× factor). Enable to have sizes auto-adapt per race."*

**It is enabled by default.** `DEFAULT_AUTO_SCALE_CONFIG.enabled` is `true` at `autoSpriteScale.js`,
which is the key's one home. The toggle works and the rest of the sentence is accurate; the first
three words are false, and they are the three a reader acts on. Somebody reading this tooltip
concludes that auto-scaling is off unless they turn it on, when on a default install it has been
scaling every race all along.

★ **Recorded, NOT fixed.** This block changes no source file, and a one-word tooltip edit is still an
edit. It is named here and in the backlog row so the decision is somebody's rather than mine.

★ **And there is a name collision worth knowing before anybody edits either:** `minTargetScreenPx`
is the key of a control **here** (in `autoScaleConfig`, a floor for every racer) **and** of a
different control in the Racer Editor (per racer type). Same name, two stores, two scopes. See
*Duplicates* at the end.

---

# 13 · SURFACE CLASSES (`SurfaceClassManager.jsx`) — advanced tier

A CRUD manager over the palette a track paints its ground from. Stored on the server. **This is the
one section whose control count is not a fixed number**, and the inventory says so rather than
picking one.

**2 fixed controls, plus the selected generator's schema (3–8 more).**

| Control | Config key | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Display name | `label` (per class) | — | yes | **MATCHES** |
| Generator | `generatorId` (per class) | `particle` for a new class | yes | **MATCHES** |
| *…the chosen generator's fields* | `config.<key>` | per generator | no | **MATCHES** |

★ **The generator fields are RENDERED FROM A SCHEMA, not written out.** `GENERATORS[id].configSchema`
in `surface-effects/registry.js` drives the form, so the controls change when the generator does:

| Generator | Fields | Count |
| --- | --- | --- |
| `particle` | `color`, `sizeMin`, `sizeMax`, `lifetimeFrames`, `spawnProbability`, `drift`, `gravity` | 7 |
| `cloud` | `color`, `startSize`, `endSize`, `lifetimeFrames`, `spawnProbability`, `driftDirection` | 6 |
| `splash` | `color`, `count`, `sizeMin`, `sizeMax`, `lifetimeFrames`, `spawnProbability`, `gravity`, `spreadAngle` | 8 |
| `line` | `color`, `thickness`, `lifetimeFrames` | 3 |

So the card renders **5 controls at its thinnest and 10 at its widest**, and **24 schema fields exist
across the four generators** (14 distinct names, `color` and `lifetimeFrames` appearing in all four).
For the totals at the end of this document the card is counted as **2 + 7 = 9**, the `particle` case,
because that is what a new class opens with; the range is stated here so the number is not read as
exact.

**Verdict MATCHES for all of them**, and the reason is structural rather than one trace per field: a
schema-driven form cannot name a key its generator does not read, because the same `configSchema` the
form renders from is what the generator reads its parameters out of. That is the strongest
match-guarantee on the screen and it is worth naming as such.

★ **None of the generator fields has a tooltip** — the schema carries a key, a label, a range and a
default, and no description. That is 7 undescribed controls in the default case; see the
no-explanation count at the end.

---

# 14 · EXPORT RACE CONFIG (`ConfigExportSection.jsx`) — advanced tier

**0 controls.** The card is a read-out and two buttons: the world hash (`world-hash`), a deviation
banner, an unsimulatable banner, and the export action. Nothing here writes a config key.

Counted as a section with zero controls rather than left out, because "which sections hold knobs" is
one of the things a reader of this document will want to know.

---

# 15 · SYSTEM (`SystemSettings.jsx`) — advanced tier

**0 controls.** Four tooltips and no knobs: export, import, reset and a read-only build panel. The
one `<input>` in the file is a hidden `type="file"` that the Import button clicks — a file picker, not
a setting, and it is not counted.

★ **Its four tooltips are the most precise on the screen** about what an action touches — the import
is described as round-tripping every localStorage key, the reset as wiping every key and re-seeding
two of them. Noted as the standard the rest of the screen's copy could be held to; nothing is
proposed.

---

# 16 · USER MANAGEMENT (`UserManagementSection.jsx`) — admin only

Server-backed account administration. No config keys: everything here is a field of a user record or
of a create-user form.

**8 controls.**

| Control | Field | Shipped default | Tooltip | Verdict |
| --- | --- | --- | --- | --- |
| Team (per existing user) | `team` | — | no | **MATCHES** |
| Role (per existing user) | `role` | — | no | **MATCHES** |
| Reset password (per existing user) | — (transient) | — | no | **MATCHES** |
| New user — username | `username` | — | yes | **MATCHES** |
| New user — password | — (transient) | — | yes | **MATCHES** |
| New user — role | `role` | `operator` | yes | **MATCHES** |
| New user — team (picker) | `team` | — | yes | **MATCHES** |
| New user — new team name | `team` | — | yes | **MATCHES** |

All eight are consumed by the users routes on the server. ★ **The last two are a pair writing ONE
value**: the picker chooses an existing team or "New team", and the name field appears only in the
second case. Both end up as the account's `team`. Listed under *Duplicates* at the end as a
deliberate pair rather than a defect.

★ **The three per-user controls have no tooltip**; the five in the create-user form all do. The
tooltip on the role picker is the only place on the screen that states what the two roles see.

---

# 8a · RACE TUNING → DYNAMICS — the verdicts

*The tables for this section are above, unchanged. This is the verdict pass the stock-take adds.*

**35 config keys, 36 write sites** — `scoreboardIntervalMs` is the one key with two controls (a
preset row and a field), which is a presentation pair and not a duplicate of the kind named at the
end. Setters: `setDynamics`, `setRow`, `setSpeed`, `setFrameTiming`.

**Every one of the 35 has a behavioural reader in the shipped product** — not merely a mention in the
config plumbing. Established mechanically: each key was searched across `client/src`, `server/src` and
`shared/`, and hits in the config-plumbing files (`raceDynamicsConfig.js`, `frameTimingConfig.js`,
`configFingerprint.js`, `exportRaceConfig.js`, `raceIdentifier.js`, `raceConfigWorld.js`) were
discounted, because a key that only appears in the machinery that stores and hashes it is not being
acted on by anything. **0 keys were left with no reader.** The readers are `raceCore.js`,
`racePlanner.js`, `raceGovernor.js`, `rowLayout.js` and `renderRaceFrame.js`.

**Verdict: 33 MATCHES, 2 MISLEADING.**

### ★ MISLEADING ×2 — two tooltips state a default the game does not ship

Both were found mechanically, then pinned by hand to their own control before being written down.

| Control | Key | The tooltip says | `defaults.js` ships |
| --- | --- | --- | --- |
| Bonus active until (% race) | `racePlanBonusTransitionEnd` | *"Default: 67%"* | **0.75** — 75% |
| P-Controller starts (% race) | `racePlanCorridorStart` | *"Default: 67%"* | **0.55** — 55% |

**What is wrong is the CLAIM, not the mechanism.** Both keys are read by `racePlanner.js` and do what
their labels describe; an operator who reads the tooltip, decides the shipped value is fine and leaves
the control alone has been told the race turns at 67% when it turns at 75% in one case and 55% in the
other. The two neighbouring claims in the same block are correct — *"Default: 1500ms"* for
`racePlanBonusFadeDuration` (1500) and *"Default: 100%"* for `racePlanCorridorEnd` (1.0) — which is
what makes the two wrong ones read as trustworthy.

★ **And there is a structural reason this class exists.** `check-config-claims` holds **documents** to
the rule that they state no config values, precisely so a number cannot drift from `defaults.js`
unnoticed. **Tooltips are source, so they are outside that guard** — 38 tooltips across the screen
state a default, and nothing checks any of them. Recorded as an observation; proposing a guard is not
this block's business.

---

# 8b · RACE TUNING → BEHAVIOR (`BehaviorTuningSection.jsx`) — advanced tier

The second half of the Race Tuning composite. Backing config: `raceBehaviorConfig`
(**RACE-RELEVANT**). Setter: `setBehavior`.

**22 controls**, one per key, no key written twice. 22 `InfoTooltip`s in the file — this section is
fully described.

| Group | Controls | Keys |
| --- | --- | --- |
| Enable | 1 | `enabled` |
| Avoidance | 2 | `avoidanceBufferPct`, `avoidanceWarmupMs` |
| Comfort / lateral | 4 | `comfortThreshold`, `maxLateral`, `maxLateralSpeedPerStep`, `softRepulsionStrength` |
| Soft steering | 4 | `softSteeringClearancePct`, `softSteeringHysteresisY`, `softSteeringStrength`, `softSteeringSymmetric` |
| Drafting | 3 | `draftingBoost`, `draftingConeAngle`, `draftingMaxDistance` |
| Look-before-brake | 6 | `lookBeforeBrakeEnabled`, `lookBeforeBrakeLagFrames`, `lookBeforeBrakeMinDifferential`, `lookBeforeBrakePassStrength`, `lookBeforeBrakeReengageTMultiplier`, `lookBeforeBrakeRequireSlowerLeader` |
| Start / run-out | 2 | `startSpreadRange`, `runoutZone` |

**Verdict: 22 MATCHES, 0 otherwise.**

Every key has a behavioural reader, and for twenty of them it is the same file — `raceBehavior.js`,
which is the module the whole card is about. `runoutZone` is additionally read by `durationModel.js`
(it shortens the usable path, so it changes the derived duration) and `startSpreadRange` by
`raceCore.js`. The one numeric claim in the section's copy was checked and is correct:
*"0.005 = 0.5% (default…)"* against `lookBeforeBrakeMinDifferential: 0.005`.

★ **A drafting read-out, not a control:** `drafting-summary` is a computed testid, and it is not
counted among the 22.

---

# 10 · CAMERA ADVANCED (`CameraAdvancedSection.jsx`) — advanced tier

**The largest section on the screen by a wide margin, and the single fact most worth carrying out of
this stock-take.** 2116 lines, **77 config keys**, one control each, 39 `InfoTooltip`s, 25
`data-testid`s, 41 `<input>`s, 15 checkboxes, 2 selects and 1 range. Backing config: `cameraConfig`
(**COSMETIC** by `configFingerprint.js` — it changes the picture, not the race).

**77 controls.** They are not listed one per row here: the section is organised into named groups and
the group is the useful unit, with the key list per group as the durable identifier.

| Group | Count | Keys |
| --- | --- | --- |
| Battle shot | 12 | `battleCooldownMs`, `battleFocusDarkening`, `battleIsolationThresholdT`, `battleMaxGroupRankSpan`, `battleMaxGroupSize`, `battleMinDurationMs`, `battleMinTopN`, `battlePulkThresholdT`, `battleSlowmoFactor`, `battleSlowmoFadeDuration`, `battleSlowmoMinDuration`, `battleWeight` |
| Comeback shot | 8 | `comebackCooldownMs`, `comebackMaxCurrentRankPct`, `comebackMinDuration`, `comebackMinPositionsGained`, `comebackMinStartGap`, `comebackUseBeats`, `comebackWeight`, `comebackWindowSec` |
| Lead change | 5 | `leadChangeCooldownMs`, `leadChangeDebounceMs`, `leadChangeMinDuration`, `leadChangeMinGap`, `leadChangeWeight` |
| Overview | 4 | `overviewCooldownMs`, `overviewStartDelay`, `overviewTargetCount`, `overviewWeight` |
| Start ceremony | 8 | `ceremonyBrandMs`, `ceremonyEasing`, `ceremonyPushMs`, `ceremonySettledMs`, `ceremonySkipOnClick`, `ceremonyVenueMs`, `countdownDigitsMs`, `startBoardFloorMs`, `startBoardMsPerName`, `startWindowMs` *(10 keys; the card shows a computed total beside them)* |
| Finish & ending | 9 | `endgameThreshold`, `endingKeepsFinishShot`, `finishDramaDurationMs`, `finishHoldAfterLastMs`, `finishOverviewLookbackPx`, `finishOverviewZoomOutDurationMs`, `finishPauseMs`, `finishedSplashEnabled`, `podiumRevealBeatMs`, `winnerCardMs` |
| Photo finish | 5 | `photoFinishCloseThresholdT`, `photoFinishContenderFraming`, `photoFinishEnabled`, `photoFinishLeadProgress`, `photoFinishSlowmoFactor` |
| Run-in | 4 | `contenderZoom`, `contentionWatch`, `runInOpenMs`, `runInShot` |
| Framing & aim | 9 | `bandFloor`, `entryConvergencePx`, `entryConvergenceZoom`, `focalSmoothTc`, `glideDurationMs`, `leaderAimRoomFloorPx`, `leaderForwardFrac`, `minDrawnFrameFrac`, `minRacersVisible`, `referenceCorridorPx`, `transitionTConvergence`, `corridorCapArriveMs` |
| Labels & overlay | 5 | `labelFormHoldMs`, `labelNamesWhenRoom`, `stateOverlayDurationMs`, `stateOverlayEnabled`, `highlightHeroes` |
| Grammar / phase | 3 | `cameraTransitionGrammar`, `outcomePhaseThreshold`, `battleSlowmoFactor` *(listed once above)* |

*(The group sizes are indicative — the section's own sub-headings are the ground truth for which
control sits where. The KEY LIST is exhaustive and mechanically extracted; the grouping is a reading
aid.)*

**Verdict: 73 MATCHES, 4 MISLEADING, 0 SUSPECTED DEAD.**

### ★ MISLEADING ×4 — the four director weights, and it is the GROUP BLURB that is wrong

`battleWeight`, `comebackWeight`, `leadChangeWeight` and `overviewWeight` sit under a paragraph that
reads: *"Weighted random director: all active events enter the pool with their weights. Mandatory
states (Start, Endgame, Finish) are not in the pool."*

**Both sentences are contradicted by the code they describe**, and the code says so at length:

- **There is no pool.** `CameraDirector.js` states the design as an **absolute propensity, not a
  relative share**, and argues the point explicitly — a share *"promises something the camera cannot
  deliver"*. `_acceptsOffer(weight)` is a per-offer coin flip (`random() < weight`) on ONE candidate;
  a declined offer falls through to LEADER. Events do not compete with each other at all.
  ★ The same comment records what this costs a reader who believes the blurb: **eligibility decides
  about 90% of selections**, so raising `overviewWeight` 0.3 → 10, a 33× increase, moved OVERVIEW's
  share of the race by **1.8 percentage points**. *"That is why the dial appeared dead."*
- **The endgame IS weighted.** The blurb says mandatory states are outside the weighting; at the
  endgame exception the director calls `_acceptsOffer(this._leadChangeWeight)` before offering
  LEAD_CHANGE. CAMERA-WEIGHTS-1 put it there deliberately — the bypass it replaced produced
  LEAD_CHANGE at a weight of zero, measured at 1.8% of frames.

So an operator turning these four dials is working from a model of a lottery among competing shots,
when what each dial sets is one shot's own accept probability, inside gates that decide most of the
outcome anyway. **The four controls are counted as MISLEADING** because the description they are read
under is the thing that is wrong; each individual slider is read and does set the propensity its label
names.

**Every one of the 77 has a behavioural reader in the shipped product**, by the same discounted
search used for Dynamics. The readers are `CameraDirector.js` and `cameraTimingComputation.js` for the
great majority, `renderRaceFrame.js` and `racerRendering.js` for the drawn ones
(`battleFocusDarkening`), `startCeremony.js` for the ceremony group, and `RaceScreen/index.jsx` for
the three slow-motion values, which the screen applies rather than the director.

★ **All ten default-claiming tooltips in this section were checked against `defaults.js` and all ten
are correct** — the three `On (default)` and three `Off (default)` booleans, and
*"Default: 3500 ms"* for `stateOverlayDurationMs`. This is the section with the most claims and the
best record on them, which is worth stating beside the two wrong ones in Dynamics.

★ **What is NOT claimed: that 77 controls each do something a viewer can see.** This stock-take traced
each key to a reader and read what the reader does with it; it did not measure any of them. Several
of this section's values are known from earlier work to have narrow or conditional authority. Those
are listed under *Needs a measured race* at the end, and no verdict here rests on a measurement that
was not taken.

★ **38 of the 39 tooltips are attached to a control**; the odd one is the card-level description.
**39 tooltips for 77 controls means roughly half of this section is undescribed** — see the
no-explanation count at the end. That is the raw material `B-UX3` was folded in for, and this document
counts it without writing any of it.

---

# THE COUNTS — 2026-09-25

## Controls, per section

| # | Section | Controls | Tier | Block | Race / cosmetic |
| --- | --- | --- | --- | --- | --- |
| 1 | Race Defaults | 8 | operator | `RACE_DEFAULTS` | neither — not in the config world |
| 2 | Change Password | 3 | operator | — | neither |
| 3 | Player Groups | 2 | operator | server | neither |
| 4 | Racer Types (card 1 + editor 11) | 12 | operator | racer types | neither (per-type, outside both lists) |
| 5 | Tracks | 8 | operator | server | neither |
| 6 | Branding | 11 | operator | server | neither |
| 7 | Race History | 2 | operator | — (view state) | neither |
| 8a | Race Tuning → Dynamics | 35 | advanced | `raceDynamicsConfig`, `rowLayoutConfig`, `baseSpeedConfig`, `frameTimingConfig` | **race** (3 blocks) + cosmetic (1) |
| 8b | Race Tuning → Behavior | 22 | advanced | `raceBehaviorConfig` | **race** |
| 9 | Sprite Size Range | 1 | advanced | `cameraConfig` | cosmetic |
| 10 | Camera Advanced | 77 | advanced | `cameraConfig` | cosmetic |
| 11 | Name Tag Visibility | 3 | advanced | `cameraConfig` | cosmetic |
| 12 | Auto-Scale | 5 | advanced | `autoScaleConfig` | **race** |
| 13 | Surface Classes | 9 | advanced | server | neither |
| 14 | Export Race Config | 0 | advanced | — | — |
| 15 | System | 0 | advanced | — | — |
| 16 | User Management | 8 | admin | server | neither |
| | **TOTAL** | **206** | | | |

★★ **TWO HUNDRED AND SIX.** The owner's finding was that the dev screen has too many values spread
too widely, and the number is reported plainly because it is larger than the working figure anyone
has been using: `B-UX2` was written against *"30+ tunable values"* and the screen carries nearly
**seven times** that. **The figure that matters more is the shape:** one section holds **77 of the
206**, and three sections hold **134** between them, while five sections hold one control or none.

**Counting rules, so the number can be checked rather than believed.** A control is one thing a person
can change. A colour picker and its hex field are two (they are two widgets); a preset row and a
number field for the same key are two. Read-outs, previews, legends, reset links, export buttons and
the hidden file input behind *Import Settings* are not controls. Per-entity controls are counted once,
not once per entity — the Racer Editor's 11 are 11, not 11 × the number of types. Surface Classes is
counted at 9 (2 + the 7 fields of `particle`, what a new class opens with); it renders 5 at its
thinnest and 10 at its widest.

### By the project's own race / cosmetic line

Using `RACE_RELEVANT_CONFIG_KEYS` and `COSMETIC_CONFIG_KEYS` from `configFingerprint.js`:

| | Controls | Sections |
| --- | --- | --- |
| **RACE-RELEVANT** (`raceDynamicsConfig`, `raceBehaviorConfig`, `rowLayoutConfig`, `baseSpeedConfig`, `autoScaleConfig`) | **~60** | Dynamics (most of 35), Behavior (22), Auto-Scale (5) |
| **COSMETIC** (`cameraConfig`, `frameTimingConfig`) | **~83** | Camera Advanced (77), Name Tag (3), Sprite Size Range (1), Frame Timing within Dynamics (2) |
| **NEITHER** — outside the hashed config world entirely | **63** | Race Defaults, Password, Groups, Racer Types, Tracks, Branding, History, Surfaces, Users |

★ The race/cosmetic totals are given as *approximately* for one honest reason: Dynamics spans four
config blocks and its 35 controls are split across them by sub-heading, so an exact split would mean
attributing each of its controls to a block, which this pass did at the block level and not the
control level. The two figures are firm to within those two controls of Frame Timing.

★★ **The largest single fact in this table: the screen's biggest section is COSMETIC.** 77 of 206
controls change the picture and not the race, and they sit in one card. The race itself is tuned by
about 60 controls in two and a half cards.

## Duplicates

**No key is written by two different controls in a way that could disagree.** What exists is four
deliberate pairs and one name collision:

| Kind | What | Verdict |
| --- | --- | --- |
| Picker + hex field | `color` (Tracks), `primaryColor`, `secondaryColor` (Branding) | Deliberate. Two widgets, one value, same store. |
| Preset row + field | `scoreboardIntervalMs` (Dynamics) — the one key with two write sites | Deliberate. |
| Picker + name field | Team + new-team name (User Management) — both end as the account's `team` | Deliberate; the second appears only when the first says "New team". |
| ★ **Name collision** | **`minTargetScreenPx`** is a control in **Auto-Scale** (in `autoScaleConfig`, a floor for every racer) **and** a control in the **Racer Editor** (per racer type) | **Two different settings with one name, in two stores, at two scopes.** Not a duplicate of one value — worse, because a search for the key finds both and neither says which. |

## Groupings that no longer match

The existing part of this document records that the Dynamics card's order follows **the race
timeline** — global/technical first, then the phases in temporal order. That still holds within 8a,
and it is the only section with a stated ordering principle.

**Across the screen there is no ordering principle to have stopped holding.** The registry is two
tiers — operator, then advanced — and within each tier the order is neither alphabetical, nor by
size, nor by subject. Reported as the finding rather than as a fault: there is nothing to have
drifted.

Two controls sit under a heading they do not belong to, and both are recorded above:

- ★ **Frame Timing lives inside Race Tuning.** `dtSmoothingAlpha` and `renderInterpolation` are
  **COSMETIC** (`frameTimingConfig`) and sit in the card whose master reset restores the five
  RACE-RELEVANT blocks — and deliberately does not touch them. The card's own text explains this,
  which is why it is a grouping mismatch rather than a bug, but a reader looking for camera/render
  settings will not look here.
- ★ **Auto-Scale is a card of its own and is RACE-RELEVANT.** It moves the starting grid and is one of
  the five blocks the Race Tuning master reset restores — from another tab.

## Controls with no explanation

**59 of 206 controls have no tooltip and no written description anywhere.**

| Section | Controls | Undescribed |
| --- | --- | --- |
| Camera Advanced | 77 | **38** |
| Surface Classes | 9 | 7 (every generator-schema field) |
| Tracks | 8 | 6 |
| Branding | 11 | 4 |
| User Management | 8 | 3 |
| Racer Types (manager card) | 1 | 1 |
| *every other section* | 92 | **0** |

**Method, and its limits.** `<InfoTooltip>` sites were counted per file and set against the control
count, then corrected by hand in the three places where the crude count lies: the Racer Editor renders
one `<InfoTooltip text={meta.tooltip} />` inside a loop over six fields (so six are described by one
site), the three cloud parameters share one group tooltip, and three cards carry LEGENDS whose
tooltips belong to no control (Racer Types 4, Tracks 6, Branding 2) and were subtracted.

★ **This is `B-UX3`'s raw material and the count is all that is offered.** No explanation was written.

★ **The distribution is the useful part**: eleven of the eighteen surfaces are fully described, and
**two sections account for 45 of the 59** gaps. The screen is not uniformly undocumented — it has two
holes.

## Verdict tallies

| Verdict | Count | Share |
| --- | --- | --- |
| **MATCHES** | **194** | 94.2% |
| **MISLEADING** | **9** | 4.4% |
| **SUSPECTED DEAD** | **3** | 1.5% |
| **UNTRACED** | **0** | — |

### The nine MISLEADING, by name

| Control | Section | How the effect differs from the promise |
| --- | --- | --- |
| Default Race Duration | Race Defaults | Read only where the track has no geometry — which cannot start a race. Every path that can start one ignores it. |
| Display Size (px) | Racer Editor | Setting it turns auto-scaling OFF for the race and changes `physicalSpriteSize`, which feeds the starting grid. The tooltip says only "sprite size in pixels". |
| Enabled | Auto-Scale | Tooltip opens *"Disabled by default"*; the shipped default is `true`. |
| Bonus active until (% race) | Dynamics | Tooltip states *"Default: 67%"*; ships 0.75. |
| P-Controller starts (% race) | Dynamics | Tooltip states *"Default: 67%"*; ships 0.55. |
| BATTLE weight | Camera Advanced | The group blurb describes a pool of competing events; the implementation is a per-offer coin flip on one candidate, and eligibility decides ~90% of selections. |
| COMEBACK weight | Camera Advanced | as above |
| LEAD CHANGE weight | Camera Advanced | as above, and the blurb's claim that the endgame is unweighted is false — the endgame exception calls `_acceptsOffer` too. |
| OVERVIEW weight | Camera Advanced | as above; measured at 1.8 percentage points of share for a 33× change. |

★ **Five of the nine are a claim about a NUMBER that has drifted, not a broken mechanism.** That is a
class, and it has a structural cause: `check-config-claims` holds documents to stating no config
values; tooltips are source and outside it, and **38 tooltips state a default with nothing checking
them**.

### The three SUSPECTED DEAD, by name

`autoAdvance`, `autoAdvanceDelay` and `soundEffects`, all in **Race Defaults**.

**What was searched:** the whole repository, uncapped — every `.js`, `.jsx`, `.mjs`, `.json` and `.md`
outside `node_modules`, `.git` and build output — for each key and for the snake-case spellings
`auto_advance` and `sound_effects`. Every hit is the declaration in `defaults.js`, the control in
`RaceDefaults.jsx`, or one test fixture. No consumer in `client/`, `server/`, `shared/` or `scripts/`.

★ **They are the only dead controls on the screen.** Every one of the 143 keys in the six config-backed
tuning sections has a behavioural reader in the shipped product — established by searching each key
across `client/src`, `server/src` and `shared/` and discounting hits in the config plumbing that only
stores and hashes a value. **Zero keys were left without a reader.** The dead knobs are all in the
operator tier, in the one block that is outside the hashed config world.

## Needs a measured race — NOT a verdict, and nothing here was acted on

**UNTRACED is 0**: every control's chain was followed from source, so none is recorded as untraceable.
The list below is a different question — controls whose *magnitude* of effect cannot be known from
reading code, only from running races. Each already has a MATCHES verdict on the question this
stock-take asked, which is whether the reader does what the label says.

- **The four director weights** (`battleWeight`, `comebackWeight`, `leadChangeWeight`,
  `overviewWeight`) — how much of the shot mix each one actually moves. Partly answered already by
  CAMERA-WEIGHTS-1's measurement, which is quoted above; the other three have no equivalent figure.
- **`gapBrakeMaxAuthority`** — it is a ceiling the brake climbs toward, not a value it runs at, and how
  often the ceiling binds is a measurement.
- **`racePlanCorridorStart` / `racePlanBonusTransitionEnd`** — once their tooltips are believed rather
  than believed-wrong, what moving them does to the finish is a measured question.
- **`comebackUseBeats`** — ships off; what turning it on does to the comeback shot's timing is a
  measurement (the earlier finding is that the shot is a median 0.134 of the race early without it).
- **`referenceValue` / `minScale` / `maxScale`** (Auto-Scale) — the clamp bounds bind or do not bind
  per track and field size, which source cannot say.

**Nothing on this list was measured, and nothing on it is proposed.**
