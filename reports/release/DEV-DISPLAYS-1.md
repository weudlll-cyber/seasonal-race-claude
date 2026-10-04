# DEV-DISPLAYS-1 — every developer-only display and control, before delivery

**2026-10-04, survey only — nothing was changed.** For the BACKLOG row *BEFORE DELIVERY: SWITCH OFF
THE DEVELOPER-ONLY DISPLAYS* (owner, 2026-10-02). Read on master `fe5c4a6e`. Paths are under
`client/src/` unless written in full.

**Two facts that hold for every item:**
- **Nothing here is limited to the development server.** No item is gated on
  `import.meta.env.DEV`; all of them ship in the production build.
- **The race-screen settings are per browser.** They are read from that browser's storage on top of
  `defaults.js` (`modules/cameraConfig.js:83-90`). So a debug display an admin switches on shows to
  everyone watching that browser's race screen, and a browser that once stored a value keeps it
  until its settings are reset. Changing a default does not change a browser that has stored the key.

## A. On by default — everyone watching the race or the result sees it

| # | what | where it is drawn | the default | the one switch |
| --- | --- | --- | --- | --- |
| 1 | **Build badge** — the "build `<commit>` · `<branch>`" pill, amber when dirty or unknown (owner's item) | `screens/RaceScreen/renderRaceFrame.js:535-545` (the gate at `:478`, `showRest && buildBadge`); data `screens/RaceScreen/index.jsx:1275` | no setting: shown on every race after the countdown | **none exists** — a code change is needed at `renderRaceFrame.js:478`/`:537` or `index.jsx:1275` |
| 2 | **Settings badge** — "cfg `<hash>` · defaults" or "· N race / M cosmetic", red when a race setting is off-default (owner's item) | `renderRaceFrame.js:503-517` (gate `:476`, `showRest`) | no setting: always after the countdown | **none exists** |
| 3 | **"Race Plan: ON seed:N"** pill | `renderRaceFrame.js:496-501` (gate `:472`) | shown whenever the race plan runs | **none exists** |
| 4 | **Hero rings** — green on a choreographed hero, red on a B2 attacker (owner's item, "rings") | `screens/RaceScreen/drawing/racerRendering.js:188-201` | `modules/storage/defaults.js:340` `highlightHeroes: true` (ON since 2026-10-01) | `defaults.js:340` → `false`; also Dev Screen → Camera Advanced (admin) |
| 5 | **Camera-state pill** — "👁 OVERVIEW / 👑 FOLLOWING LEADER / …", and "▸ `<name>`" when the camera follows a racer | `screens/RaceScreen/CameraStateHUD.jsx:86-110`, mounted at `index.jsx:1551-1555` | `defaults.js:302` `showCameraStateHud: true` | `defaults.js:302` → `false` (the name label has no switch of its own) |
| 6 | **Click to skip the ceremony** — a click on the picture during the countdown jumps a beat ("TEST AID") | `screens/RaceScreen/index.jsx:1480-1492` | `defaults.js:327` `ceremonySkipOnClick: true` | `defaults.js:327` → `false` |
| 7 | **M key: camera marker** — copies a marker line and shows "MARK copied ✓" for 2.5 s | `screens/RaceScreen/CameraMarkerHUD.jsx:44-101` (`MARKER_KEY = 'm'`, `:26`), mounted unconditionally at `index.jsx:1566` | always live, by design (its header: "a config toggle would be one more thing to have switched off") | **none exists** — the mount at `index.jsx:1566` |
| 8 | **Result screen "Seed N" and "Action: `<stage>`"** pills | `screens/ResultScreen/index.jsx:271-274` (branded) and `:283-286` | seed when it is > 0; the stage always | **none exists** |

**The "dots" of the owner's item.** Nothing draws a dot on a director-steered racer at shipped
defaults. The only dots in the code are the **battle diagnostics**: a dot on the leader, one above
the leader's name and one at the camera's centre (`screens/RaceScreen/drawing/battleDiagRendering.js:57-80`,
called from `renderRaceFrame.js:353-364`). They are drawn in **every BATTLE shot**, with no switch of
their own (not even `showBattleDiag`). **The BATTLE shot ships off** (`defaults.js:472`
`battleWeight: 0`), so at shipped defaults they never appear; they come back with the shot. **Two other
candidates for what he saw:**
- the **hero rings** (item 4);
- the **comeback marker**: a green ring and a green name tag on the racer the comeback shot follows
  (`racer-types/SpriteRacerType.js:348-356`, `screens/RaceScreen/drawing/racerRendering.js:83`). It has
  no switch, and it is arguably part of the product rather than a developer display.

**Which one he means is his to say.**

## B. On the setup screen — every signed-in user

| # | what | where | the default | the one switch |
| --- | --- | --- | --- | --- |
| 9 | **Quick Test** — the track switcher, racer type, name set, field size, seed field and "⚡ Quick Test (N)" (owner's item) | `screens/SetupScreen/SetupScreen.jsx:1572-1778` | shown to everyone on the setup screen | **none exists** |
| 10 | **The gear icon** to the Dev Panel ("always visible") | `SetupScreen.jsx:1130-1145` | shown | **none exists**. `/dev` needs a sign-in but no role; non-admins get the operator tier |
| 11 | **Seed, key and identifier tools** — the field, the copy row, "Last race: N · run it again", the build-mismatch alert | `screens/SetupScreen/RaceSettings.jsx:96-240` | shown | **none exists**. Borderline: this is also how a race is run again by its key, which is a feature |

## C. In the Track Editor — signed-in users, through the Dev Panel

| # | what | where | the one switch |
| --- | --- | --- | --- |
| 12 | **"Test race"** button | `screens/TrackEditor/TrackEditor.jsx:1463-1474` | **none exists** |

## D. Off by default — an admin switches them on, per browser

Each is drawn by the race screen and read from the camera settings. **The switch is its `defaults.js`
key, which is already `false`.** The checkboxes are in Dev Screen → Camera Advanced
(`screens/DevScreen/sections/CameraAdvancedSection.jsx:2017-2097`, admin-only); the gap marker is in
Race Tuning.

| # | what | where | key and default |
| --- | --- | --- | --- |
| 13 | Camera diagnostics panel (and, while it is open, **R** resets the battle log) | `screens/RaceScreen/CameraDiagnosticsHUD.jsx:245` | `showCameraDiagnostics` — `defaults.js:303` `false` |
| 14 | "RP DIAG" race-plan panel | `CameraDiagnosticsHUD.jsx:401-421` | `showRpDiag` — `:304` `false` |
| 15 | B1 winner list | `screens/RaceScreen/RacePlanHUD.jsx:81` | `showRpWinnerList` — `:305` `false` |
| 16 | Minimap hero badges | `modules/camera/Minimap.js:211`, `:226-230` | `showRpMinimapBadges` — `:306` `false` |
| 17 | Start-row suffix on name tags (" (R`n`)") | `screens/RaceScreen/drawing/racerRendering.js:255-256` | `showRpStartRow` — `:307` `false` |
| 18 | Top-10 speed monitor | `RacePlanHUD.jsx:104` | `showTop10SpeedMonitor` — `:308` `false` |
| 19 | Camera frame-log HUD | `screens/RaceScreen/CameraFrameLogHUD.jsx:84` | `enableFrameLog` — `:309` `false` |
| 20 | Perf-log HUD, with JSON export | `screens/RaceScreen/PerfLogHUD.jsx:166` | `enablePerfLog` — `:328` `false` |
| 21 | BATTLE diagnostics HUD | `screens/RaceScreen/BattleDiagHUD.jsx:72` | `showBattleDiag` — `:329` `false` |
| 22 | COMEBACK diagnostics HUD | `screens/RaceScreen/ComebackDiagHUD.jsx:56` | `showComebackDiag` — `:330` `false` |
| 23 | LEAD_CHANGE diagnostics HUD | `screens/RaceScreen/LeadChangeDiagHUD.jsx:47` | `showLeadChangeDiag` — `:331` `false` |
| 24 | GOVERNOR diagnostics HUD | `screens/RaceScreen/GovernorDiagHUD.jsx:173` | `showGovernorDiag` — `:332` `false` |
| 25 | Gap re-roll marker (a fading cyan ring) | `racerRendering.js:202-219` | `gapRerollDevMarker` — `defaults.js:1212` `false` |

## E. Switched on from the address bar or storage

| # | what | where | who | the one switch |
| --- | --- | --- | --- | --- |
| 26 | **`?constSpeed=1`** — changes the race's PHYSICS (constant speed), shown only as "[CONST SPEED]" inside item 13 | read at `screens/RaceScreen/index.jsx:411` | anyone who edits the address | **none exists** |
| 27 | **`/diagnose-verteilung`** — a distribution simulator page, linked from nowhere | route at `App.jsx:120-127` | admins only (`requiredRole="admin"`) | the route |

**Console-only probes** — nothing on screen, listed so the sweep is complete: `?perfprobe=1`
(`modules/rAFProbe.js`), `?viewerprobe=1` (`modules/viewerProbe.js`), and the storage flags
`racearena:raceInputsProbe` (`index.jsx:499`) and `racearena:holdProbe`
(`screens/RaceScreen/raceLoopDiagnostics.js:69`).

## Checked and NOT developer displays

- The result screen's click or key to skip the build-up (`screens/ResultScreen/index.jsx:164-182`) —
  a deliberate product escape.
- Full screen, Cancel Race, the countdown and the "Finished ✓" badges (`index.jsx:1610-1638`).
- `finishedSplashEnabled` (`defaults.js:580`, off) — a product option.
- The Track Editor's Ctrl+Z / Ctrl+Y (`TrackEditor.jsx:503-520`) — undo and redo.

## What this means for the row

- **Three items that are on by default can be switched off by a default alone:** 4, 5 and 6. The
  thirteen in D are already off. A default reaches only a browser that never stored the key.
- **Ten have no switch at all**, and switching them off is a code change each: 1, 2, 3, 7, 8, 9, 10,
  11, 12, 26 — plus the battle dots, if the BATTLE shot is ever switched back on.
- **Decisions that are the owner's:**
  - what "the dots" are;
  - whether the camera-state pill (5), the seed and identifier tools (11) and the result screen's
    seed and stage (8) are developer displays or product;
  - whether Quick Test (9) goes away, or goes behind the admin role.

**verify (for the row):** each display is checked by its own line above. A delivery build passes
when the items he chooses are absent on a fresh browser profile. No such check exists yet.

## Decided 2026-10-04 — one test-aids switch

The owner decided the design on 2026-10-04. Item numbers are this report's. **Nothing is built yet;
the switch is built last, after every other open row** (the BACKLOG row *BEFORE DELIVERY: SWITCH OFF
THE DEVELOPER-ONLY DISPLAYS*).

| | items |
| --- | --- |
| **The switch** | ONE for the whole installation, **stored on the server** (not per browser), flipped by **admins only**, shipped **OFF** |
| **Hidden while OFF** | 1, 2, 3, **4** (the red and green hero rings — these are the "dots" of the row), 7, **9** (Quick Test), **13–25**, 26 (`?constSpeed`), 27 (`/diagnose-verteilung`), and the console-only probes |
| **Locked while OFF** | items 13–25 cannot be switched on in the Dev Screen either |
| **Admin-only, regardless of the switch** | all of item 11 — the seed field, the copy row, the run-it-again line, the build-mismatch alert |
| **Always shown, not on the switch** | 5, 6, 8; **10**, the gear (admins see everything, other signed-in users the operator tier, as today); **12**, Test race, for anyone allowed to edit a track; and the green comeback marker |

**B6** (a race on non-default settings is not flagged) is folded into the same row: item 2, the
settings badge, is hidden while the switch is OFF, and nothing else flags such a race in production.
