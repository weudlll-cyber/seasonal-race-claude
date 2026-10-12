# DEVSCREEN-CHAPTERS-1 — the Plan D design: 348 rows (347 controls and one read-only box) in seven chapters, each placed once, an info text each

*(348 as designed and merged. On 2026-10-06 the test-aids switch added one (TEST-AIDS-1) and two winners settings were removed (REMOVE-WINNERS-SETTING-1); on 2026-10-09 the read-only admin status box added a 348th row
(AUDIT-1 D2) — see the last three sections.)*

**Owns:** the design of the Dev Screen rebuilt as chapters — which chapter every control goes into,
in which order, and the info text each one carries. **It is a design. Nothing in it is built**: no
product file was changed, no stored key was renamed, no default and no behaviour was touched.
**Built 2026-10-05 on `feat/devscreen-chapters` — see "Build, 2026-10-05" at the end.**

**The decision this answers.** Decided 2026-10-04: the Dev Screen is rebuilt as **Plan D, chapters**.
Everything that belongs together sits in one chapter; each chapter has a sensible order inside it;
every control has a fitting info text; nothing is left out; there is no "top ten" view. The earlier
candidate groupings A, B and C ([DEVSCREEN-GROUPINGS-1](DEVSCREEN-GROUPINGS-1.md)) were not taken.

**The three files of this design.**

- this document — the chapters, their order rules, the full placement table and the self-checks;
- [`DEVSCREEN-CHAPTERS-1/design.json`](DEVSCREEN-CHAPTERS-1/design.json) — the same table,
  machine-readable, one object per control, for a guard test to hold the build to;
- [`DEVSCREEN-CHAPTERS-1/count-controls.mjs`](DEVSCREEN-CHAPTERS-1/count-controls.mjs) — the
  mechanical count of every control the screen renders, re-runnable, read-only.

The stock-take this builds on is [docs/DEVSCREEN-INVENTORY.md](../../docs/DEVSCREEN-INVENTORY.md)
(205 controls, 2026-09-26). The source it was taken from is master at `c104c5b6`.

---

## 1 · The count — 348 controls, and why it is not 205

### How it is counted

`node reports/evolution/DEVSCREEN-CHAPTERS-1/count-controls.mjs` prints the count per source file and
the total; `--list` prints every control with its file, line and identity; `--json` prints the same
as data. **It is fully mechanical — no control is counted by hand.** The method, stated so the number
can be checked rather than believed:

1. **A control is one thing a person can change or trigger**: an input, a select, a textarea, a
   checkbox, a slider, a stepper, a pill row, or a button that acts — Save, Reset, Export, Delete,
   Run again, Verify race, Cancel, Close, page forward and back.
2. The script finds every opening tag of `<input>`, `<select>`, `<textarea>`, `<button>` and of the
   screen's own control helpers in `DevScreen.jsx`, `sections/*.jsx` and `components/*.jsx`, with
   comments blanked out first.
3. Tags **inside** a helper's own definition (`SliderRow`, `StateProfileBlock`, `ConfigFields`,
   `SubCard`, `SubHeading`, `RangeSlider`, `DefaultControls`, `VerifyCell`) are templates and are
   skipped; the helper is counted where it is **used**. A `SubCard` or `SubHeading` counts as one
   Reset button only when it is given `onReset`; `DefaultControls` counts as its two admin-only
   buttons; `VerifyCell` as the Verify race button.
4. Each control gets an **identity**: the config key it writes when a literal one is visible;
   otherwise its literal `data-testid`; otherwise the handler it calls. Controls are de-duplicated by
   identity within one file — so a pill row is one control, a −/+ stepper is one control, and a
   colour picker plus its hex field (both writing the same key) is one control.
5. A control rendered in a `.map()` over a list of fields, whose key is a variable, is expanded to one
   control per field. The lists are **read from source**: inline `{ key: '...' }` arrays, named
   arrays (`CLOUD_EFFECT_PARAMS`), `PROFILE_FIELDS` for the camera's zoom profiles, the keys of
   `FIELD_META` for the racer-type editor, and the `configSchema` of every surface-effect generator
   (`client/src/modules/surface-effects/generators/*.js`) for surface classes.
6. **Excluded, each by name:** the hidden `<input type="file">` behind Import and Upload (the visible
   button is the control), and the sidebar's section-navigation buttons (the structure Plan D
   replaces — they are not a control to place).

**Per-entity controls are counted once**, as the inventory counted them: the Edit button that appears
once per track is one control, the eleven zoom-profile fields that appear once per camera state are
eleven controls, not one per state. **A control that only some entries show** (Delete only on a racer
type you created, Default Laps only on a closed track, Default Duration only on an open one) is
counted, because it is rendered.

### The result, per file

| File | Controls | of which values | of which buttons that act |
| --- | ---: | ---: | ---: |
| `DevScreen.jsx` (the sidebar) | 5 | 0 | 5 |
| `sections/RaceDefaults.jsx` | 8 | 7 | 1 |
| `sections/ChangePasswordSection.jsx` | 4 | 3 | 1 |
| `sections/PlayerGroupsManager.jsx` | 10 | 2 | 8 |
| `sections/RacerManager.jsx` | 4 | 1 | 3 |
| `sections/RacerEditModal.jsx` | 17 | 10 | 7 |
| `sections/TrackManager.jsx` | 18 | 10 | 8 |
| `sections/BrandingProfiles.jsx` | 18 | 8 | 10 |
| `sections/RaceHistory.jsx` | 9 | 2 | 7 |
| `sections/PeriodEvaluation.jsx` | 6 | 4 | 2 |
| `sections/RaceTuningSection.jsx` | 1 | 0 | 1 |
| `sections/DynamicsTuningSection.jsx` | 61 | 49 | 12 |
| `sections/BehaviorTuningSection.jsx` | 29 | 22 | 7 |
| `sections/SpriteSizeRangeSection.jsx` | 2 | 1 | 1 |
| `sections/CameraAdvancedSection.jsx` | 103 | 102 | 1 |
| `sections/NameTagVisibilitySection.jsx` | 4 | 3 | 1 |
| `sections/AutoScaleSection.jsx` | 8 | 7 | 1 |
| `sections/SurfaceClassManager.jsx` | 22 | 16 | 6 |
| `sections/ConfigExportSection.jsx` | 2 | 0 | 2 |
| `sections/SystemSettings.jsx` | 4 | 0 | 4 |
| `sections/UserManagementSection.jsx` | 13 | 8 | 5 |
| **TOTAL** | **348** | **255** | **93** |

*"Buttons" here is the script's tag kind. Two buttons are really value controls the inventory counted
as values — the racer type's surface-class pills and the brand's Upload Logo button (the inventory
counted the file input behind it) — which is why they appear as −2 in the reconciliation below.*

Five files render no control of their own and are listed by the script as such:
`MinSpriteSizePreview.jsx`, `SurfaceClassPreview.jsx`, `RangeRejectionNotice.jsx` (read-outs) and
`SubCard.jsx`, `DefaultControls.jsx`, `RangeSlider.jsx` (helpers, counted where used).

### How 348 relates to the inventory's 205

| Section | Inventory | This count | What makes the difference |
| --- | ---: | ---: | --- |
| Race Defaults | 7 | 8 | +1 the Reset Defaults button |
| Change Password | 3 | 4 | +1 the Change password submit button |
| Player Groups | 2 | 10 | +8 buttons: New, Load to Setup, Edit, set/remove default, export seed, Delete, Save, Cancel |
| Racer Types (list + editor) | 12 | 21 | +3 list buttons (Edit in Racer Editor, Edit, Delete); +6 editor buttons (per-field Reset, size-floor Reset, surface-class Reset, cloud Reset, Reset all, Done/Close) |
| Tracks | 8 | 18 | −1 picker + hex counted once; **+3 value controls the inventory does not list** (Default Laps, Default Duration, Default Winners); +8 buttons |
| Branding | 11 | 18 | −2 two picker + hex pairs counted once; +1 Remove logo; +8 buttons (New, Preview, Edit, set/remove default, export seed, Delete, Save, Cancel) |
| Race History | 2 | 9 | +7 buttons, among them **Verify race, new on 2026-10-04** (admin only) |
| Period Evaluation | — | 6 | **the whole section is new on 2026-10-04** |
| Race Tuning card | 0 | 1 | +1 Reset All Defaults |
| Race Tuning → Dynamics | 35 | 61 | +12 resets; +14 value controls — the inventory's count line for this section says 35 while its own tables name 46 of these keys, and the three chase controls (`chaseAfterOutcomeEnabled`, `chaseAfterOutcomeSelection`, `chaseAfterOutcomeSlots`) are named nowhere in it |
| Race Tuning → Behavior | 22 | 29 | +7 resets |
| Sprite Size Range | 1 | 2 | +1 reset |
| Camera Advanced | 77 | 103 | **+11 zoom-profile fields and +1 Reset state** (the inventory's 77 lists no per-state field) and **+14 diagnostics switches** it does not list |
| Name Tag Visibility | 3 | 4 | +1 reset |
| Auto-Scale | 5 | 8 | +1 reset; +2 Formula Preview inputs (try-out only, nothing stored) |
| Surface Classes | 9 | 22 | +7 generator fields beyond the particle generator's seven (the inventory counted one generator's fields; this counts every distinct field of all four, `opacity` included, which the inventory's per-generator lists leave out); +6 buttons (class list, New, Save, Cancel, Delete, Reset to Default) |
| Export Race Config | 0 | 2 | +2 buttons (Export, refresh) |
| System | 0 | 4 | +4 buttons (Export, Import, Diagnostic Snapshot, Reset All) |
| User Management | 8 | 13 | +5 buttons (Refresh, Reset Password, Delete, Confirm, Add User) |
| Sidebar (`DevScreen.jsx`) | 0 | 5 | +5: Track Geometry Editor, Racer Editor, Log out, the View switch, Back to Setup |
| **Total** | **205** | **348** | **+143** |

**The +143, by kind:**

| Kind | Controls |
| --- | ---: |
| Buttons that act — excluded by the inventory's own rule ("reset links, export buttons … are not controls"); Verify race and Period Evaluation's two buttons are among them | +93 |
| Period Evaluation's value controls — new on 2026-10-04 | +4 |
| Camera Advanced value controls the inventory does not list (11 zoom-profile fields, 14 diagnostics switches) | +25 |
| Dynamics value controls beyond the inventory's count line (11 named in its tables but not counted, 3 chase controls named nowhere) | +14 |
| Surface-class generator fields beyond one generator's | +7 |
| Track race-length defaults (laps, duration, winners) | +3 |
| Auto-Scale Formula Preview inputs | +2 |
| Picker + hex pairs counted once here, twice there | −3 |
| Value controls the inventory counted that this count's tag kind lists as buttons (surface-class pills, Upload Logo) | −2 |
| **Total** | **+143** |

So of the 143, **7 are new since the inventory** (Period Evaluation's six and Verify race), **93 are
buttons** the inventory deliberately left out, and the rest are value controls it did not count.
**The re-check of the whole source found nothing else added since 2026-09-26** beyond those seven:
the files changed since then (`git log --since=2026-09-26 -- client/src/screens/DevScreen`) are the
Period Evaluation and Verify race work, and the removal of two comeback-state zoom-profile fields
(`b4e95ec7`), which the count reflects (the comeback state's block now offers nine fields, not
eleven; the eleven fields are counted once each because other states still offer them).

**Why the wider definition.** The decision says nothing is left out and every control has an info
text. A Delete, a Reset or a Verify race is something a person presses and then trusts, so it needs
a place and a text as much as a slider does. The inventory's narrower rule was right for its
question (does each *value* still do what it says); this design's question is where each *thing you
can press* goes.

---

## 2 · The chapters

Seven chapters, named for what their controls **do**. Each sentence pair below is the chapter's
intro text, written to sit at the top of the chapter on the rebuilt screen.

| # | Chapter | Controls | Operator view shows | Line |
| --- | --- | ---: | ---: | --- |
| 1 | The race | 100 | 5 | changes the race |
| 2 | Camera — start to ending | 84 | 1 | changes the picture |
| 3 | Look, labels and effects | 38 | 1 | changes the picture |
| 4 | Tracks, racers, brands and groups | 68 | 62 (+6 for an admin) | records and per-type settings |
| 5 | History and evaluation | 15 | 13 (+2 for an admin) | reads the record |
| 6 | Diagnostics and verification | 18 | 0 | changes neither |
| 7 | Accounts and system | 22 | 4 | changes neither |
| — | Sidebar (all chapters) | 3 | 2 (+1 for an admin) | the screen's frame |
| | **Total** | **348** | **88** (+9 for an admin) | |

### 1 · The race — 100

*Intro:* Everything that changes how a race runs, from the defaults a new race starts with to the
mechanisms that shape the finish. Every control here, except the operator defaults at the top, sits
in a config block the race fingerprint hashes, so changing one changes the race itself, not only the
picture. One reset at the top of the tuning part restores every block in this chapter.

*Why one chapter.* The project already draws the line between "changes the race" and "changes the
picture": `RACE_RELEVANT_CONFIG_KEYS` in `client/src/modules/parity/configFingerprint.js` — speed,
row layout, race dynamics, racer behaviour, auto-scale. The Race Tuning master reset restores
exactly those five blocks. Today they are spread over three cards (Race Tuning, Auto-Scale, and the
racer behaviour half of Race Tuning) and share one card with cosmetic Frame Timing. As one chapter,
**the chapter and the master reset finally cover the same set**, and the race-setup defaults an
operator touches (the Race Action stage first among them) open it.

### 2 · Camera — start to ending — 84

*Intro:* Everything the camera does, in the order a race unfolds: how it frames at all times, how it
chooses its shot, then the start, the battles and comebacks of the middle, the endgame, the finish
and the ending. None of it changes the race — only what you see of it.

*Why one chapter.* Camera Advanced is already written along the race timeline (its own description
says so). The chapter keeps that spine, lifts out what is not camera (labels, overlays, the drawing
floor, diagnostics), and takes in the one operator switch that belongs to the ending:
**"Go to the results on its own"**, whose own text points at the ending lengths. The ending's
lengths and the switch that decides whether the ending hands over by itself now sit in one sub-group.

### 3 · Look, labels and effects — 38

*Intro:* How the race is drawn, apart from where the camera points: how big racers appear, which
names and labels are shown, the short overlay texts, how smoothly the picture moves, sound, and the
ground effects racers kick up. Nothing here changes the race.

*Why one chapter.* These are the controls that change what is **drawn** without changing where the
camera looks: Sprite Size Range, Name Tag Visibility, the track-label switches and the overlay texts
that sit in Camera Advanced today, Frame Timing (cosmetic, today inside Race Tuning), the reserved
sound switch, and Surface Classes — the palette of ground effects tracks and racer types draw from.

### 4 · Tracks, racers, brands and groups — 68

*Intro:* The things a race is made of — who races, where, as what, and under which look. Each part
lists what exists, the actions on each entry, and then the form for creating or editing one. These
are records and per-type settings, not the race tuning of the first chapter.

*Why one chapter.* Four sections today, all operator tier, all the same shape (a list, per-row
actions, a form). Together they are what Race Setup picks from. The sidebar's two editor links
(Track Geometry Editor, Racer Editor) join the part they open.

### 5 · History and evaluation — 15

*Intro:* What has been raced: every race your team has run, which you can filter, export, run again
and — as an admin — verify on the server, and a table by name over any period you choose. Nothing
here changes a setting; it reads the record.

*Why one chapter.* Race History and Period Evaluation are already neighbours in the registry (Period
Evaluation was placed beside the history it reads from). Both read finished races; neither writes a
setting.

### 6 · Diagnostics and verification — 18

*Intro:* Tools for checking the game rather than running an event: overlays and logs that show what
the camera and the race plan are doing, and an export of the exact race configuration for
verification in the simulator. None of them changes a race. The test-aids switch at the top decides
whether the overlays, the logs and every other test aid are shown at all.

*Why one chapter.* Fourteen diagnostics switches and the hero highlight sit at the end of Camera
Advanced today, where they read as camera settings; Export Race Config is a card of its own. All of
them serve someone checking the game, none someone running an event.

### 7 · Accounts and system — 22

*Intro:* Who may use the screen and what it keeps: for an admin, first a read-only status of the
installation; then your own password, the race directors of the server, and backups of everything
this browser stores. *(The status clause added 2026-10-09, AUDIT-1 D2.)*

*Why one chapter.* Change Password, User Management and System are about access and storage, not
racing.

### The sidebar (all chapters) — 3

The view switch (admins only, directly under the "Dev Panel / Configuration" header), "← Back to
Setup" and "Log out" (directly under the list of chapters, for every signed-in user) stay in the
fixed sidebar and are reachable from every chapter. **The owner decided this on 2026-10-05**; the
design first placed them in chapter 7 as "You and this screen". Sidebar order, top to bottom: the
header, the view switch, the chapters, Back to Setup, Log out. It is a placement of its own in `design.json`
("Sidebar (all chapters)") and in the chapter guard.

### There is no "top ten" view

As decided: no control is promoted out of its chapter, and no chapter is a shortcut list. Every
control appears in exactly one chapter, once.

---

## 3 · The order inside each chapter, and its rule

**The rule.** Where controls act **at a moment of the race**, they follow the race timeline:
start → race → finish → ending. Where they do not (they act all race long, or are not about a race
at all), they go **general → specific**: a master switch before what it governs, a whole-race value
before a phase's value, a list before its per-entry actions before its form. Inside one chapter the
two combine: the general sub-groups come first, then the timed ones in race order, then the most
specific fine mechanics. A reset button sits at the head of the values it resets.

| Chapter | Sub-groups in order | How the rule was applied |
| --- | --- | --- |
| 1 · The race | Defaults for a new race → Reset of the whole tuning → Pace → Racers among each other → Start → Speed changes during the race → Race plan and bonuses → Mid-race contest (PULK) → Outcome — the gap leader brake | General first (the operator defaults, the one reset, pace and racer interaction act all race long), then the timeline: the start grid, the periodic re-rolls, the race-plan phases, the mid-race contest, the outcome brake. Inside "Racers among each other" the master switch (Race Behavior Enabled) comes first. |
| 2 · Camera | Framing — all race long → Choosing the shot → Start → Middle — battles → Middle — lead changes → Middle — comebacks → Endgame and run-in → Finish and photo finish → Ending — after the line → Zoom profiles per camera state | General (framing, the shot director) first, then the timeline exactly as a race runs, then the per-state fine mechanics. Inside Start the ceremony beats run in the order they play; inside Ending the phases run in the order they play, with the operator's hand-over switch last. |
| 3 · Look | Racer size on screen → Name tags and track labels → Overlay texts → Smoothness and live standings → Sound → Ground effects | General → specific: what every frame shows (size, names, overlays) before how frames are produced, then the per-class effect editor, the most specific. |
| 4 · Things a race is made of | Player groups → Tracks → Racer types → Brands | The order Race Setup asks for them: who races, where, as what, under which look. Inside each: the editor link, New, per-entry actions, the form fields, Save, Cancel. |
| 5 · History and evaluation | Race history → Period evaluation | General → specific: the full record before the summary built on it. Filters before the actions they feed. |
| 6 · Diagnostics | On-screen diagnostics → Logs → Race configuration export | What you see on screen while racing before what is written out afterwards. |
| 7 · Accounts and system | Installation status → Your password → Race directors → Backup and reset | General → specific, with the destructive reset last. |

---

## 4 · Duplicates and the `minTargetScreenPx` collision — resolved by placement and wording only

**No stored key is renamed. Nothing is resolved by changing a key, a default or a behaviour.**

- **`minTargetScreenPx`, two settings, one name** (`client/src/modules/autoSpriteScale.js:23`, in
  `autoScaleConfig`, and `client/src/racer-types/index.js:239`, per racer type). Resolved by
  **placement**: the global one goes to *The race → Start — grid and racer size* with the rest of its
  block (`autoScaleConfig`, which the race reset covers); the per-type one stays in the racer-type
  editor in *Tracks, racers, brands and groups → Racer types*. Resolved by **wording**: each label
  carries its scope — proposed *"Size floor — every racer type"* for the Auto-Scale one and *"Size
  floor — this racer type only"* for the editor one — and each info text names the other, says the
  global one is only the starting value for the per-type one, and says outright that they are two
  settings with one stored name.
- **Picker + hex pairs** (`color` on Tracks, `primaryColor` and `secondaryColor` on Brands,
  `leaderRingColor` in the racer-type editor, `color` in surface classes): one control each, one row
  each — one value, two widgets side by side.
- **Preset row + field for one key** (`scoreboardIntervalMs`): one control, one row.
- **Max Racers and its "Reset to auto" button** both write `maxRacers`: one row; the info text names
  the button.
- **Labels that repeat** ("Reset", "Edit", "Delete", "Cancel", "Enabled", "Slowmo factor", "Min.
  observation duration", "Lifetime (frames)"). In the table the label column shows today's label; a
  bracket after it is context this document adds so the rows can be told apart. In the rebuilt
  screen each sits under its sub-group heading, and the info text names what it acts on.
- **Resets whose scope spans chapters.** Race Defaults' **Reset Defaults** restores seven keys, two of
  which now sit elsewhere (`autoAdvance` in Camera → Ending, `soundEffects` in Look → Sound). Its
  scope is unchanged; its info text names the two. The Race Tuning **Reset All Defaults** now covers
  exactly its own chapter's tuning — the two layout/scope disagreements the inventory recorded
  (Frame Timing inside the race card, Auto-Scale outside it) are both resolved by placement.
- **The three admin buttons not in English today** (`components/DefaultControls.jsx`, the set/remove
  default and export-seed buttons, shown in Groups, Tracks and Brands). The design gives their
  English wording — *Set as default*, *Remove default*, *Export as seed*; see §8.

---

## 5 · The placement table — every control, once

Columns: **#** chapter.position (positions run on through the sub-groups of one chapter);
**Today: file** relative to `client/src/screens/DevScreen/`; **Today: label** as rendered, with a
bracket of added context where a label repeats; **Id (kind)** the identity the count script gives
it — a config key where the control writes one, else its `data-testid`, else its handler (a handler
joined with `+` names each call of one handler; every part is findable in the file); **Tier** —
`operator` (shown in the operator view), `advanced` (in a section the registry marks advanced, shown
only to admins in the All view), `admin` (gated by the signed-in user's role inside an operator
section or the sidebar); **Text** — NEW (no info text today), REWRITTEN (one exists and is replaced),
KEPT (the existing text, verbatim). **No info text states a config value**: there is no digit in any
of them. In `design.json` the same columns are the fields `chapter`, `position`, `subgroup`,
`section` (the file path above), `label`, `id`, `idKind`, `tier`, `infoText` and `textStatus`.

### 1 · The race — 100 controls

| # | Sub-group | Today: file | Today: label | Id (kind) | Tier | Info text | Text |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | Defaults for a new race | `RaceDefaults.jsx` | Race Action (Quiet / Medium / Wild) | `raceActionStage` (configKey) | operator | How eventful the racing is. Quiet is the shipped race. Medium and Wild push the front fight harder — the same fair finish, more of a contest getting there. The stage you pick here is stored with each race, so the result screen can tell you which one ran. | KEPT |
| 1.2 | Defaults for a new race | `RaceDefaults.jsx` | Default Race Duration | `duration` (configKey) | operator | Pre-fills the Duration field in Race Setup. The value that actually runs a race is derived by the track — closed tracks from laps and course length, open tracks from the setup slider or the track's own default — so this seed is not read once a race starts. | KEPT |
| 1.4 | Defaults for a new race | `RaceDefaults.jsx` | Max Players — Closed Tracks | `maxPlayersClosed` (configKey) | operator | The most player names Race Setup accepts for a closed-loop track. It is the only limit on field size for those tracks; a larger field is refused at setup, a smaller one is never padded. | REWRITTEN |
| 1.5 | Defaults for a new race | `RaceDefaults.jsx` | Max Players — Open Tracks | `maxPlayersOpen` (configKey) | operator | The most player names Race Setup accepts for an open, start-to-finish track. Open tracks hold larger fields than closed ones, which is why the two limits are separate. | REWRITTEN |
| 1.6 | Defaults for a new race | `RaceDefaults.jsx` | Reset Defaults | `handleReset` (handler) | operator | Puts every race default back to the shipped values — including the two that now sit in other chapters: “Go to the results on its own” (Camera, Ending) and “Sound effects” (Look, Sound). Nothing else on the screen is touched. | NEW |
| 1.7 | Reset of the whole tuning | `RaceTuningSection.jsx` | Reset All Defaults | `handleReset` (handler) | advanced | Puts every tuning value below it in this chapter back to shipped — not the race defaults above: speed, start layout, auto-scale, re-rolls, race plan, the mid-race contest, the gap brake and racer behaviour. Camera, look and smoothness settings are not touched. Use it when races feel wrong and you no longer know what was changed. | REWRITTEN |
| 1.8 | Pace — all race long | `DynamicsTuningSection.jsx` | Reset (Normal Track Speed) | `reset-normal-speed` (testId) | advanced | Puts the normal track speed back to shipped. | NEW |
| 1.9 | Pace — all race long | `DynamicsTuningSection.jsx` | Normal Speed (px/s) | `normalSpeedPxPerSec` (configKey) | advanced | How far a normal racer travels per second, the same on every track and for every racer type. It is the one pace control: every race duration in the game is derived from it, so raising it makes every race shorter and faster to watch. | REWRITTEN |
| 1.10 | Pace — all race long | `DynamicsTuningSection.jsx` | Reset (Speed Range) | `reset-speed-range` (testId) | advanced | Puts the slowest and fastest base speed back to shipped. | NEW |
| 1.11 | Pace — all race long | `DynamicsTuningSection.jsx` | Min Speed | `min` (configKey) | advanced | The slowest base speed a racer can be dealt. Lower it and the field strings out more, with the back markers falling further behind; the spread preview below shows the effect on a closed track. | REWRITTEN |
| 1.12 | Pace — all race long | `DynamicsTuningSection.jsx` | Max Speed | `max` (configKey) | advanced | The fastest base speed a racer can be dealt. Raise it and the quickest racers pull further ahead; it must stay above Min Speed. | REWRITTEN |
| 1.13 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Race Behavior Enabled | `enabled` (configKey) | advanced | Master switch for how racers react to each other. Off: racers run on their own lines with no avoidance and no slipstream, and every setting below in this group stops acting. On: the settings below apply. | REWRITTEN |
| 1.14 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Reset (Drafting / Slipstream) | `reset-drafting` (testId) | advanced | Puts the three slipstream settings back to shipped. | NEW |
| 1.15 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Max Distance (world px) | `draftingMaxDistance` (configKey) | advanced | How close behind another racer a racer must be to get the slipstream boost. Raise it and drafting works from further back and more racers benefit; lower it and only a tight follower gets the push. | REWRITTEN |
| 1.16 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Cone Angle (°) | `draftingConeAngle` (configKey) | advanced | How wide the slipstream zone behind each racer is. Wider means drafting still works when a follower is off to the side, for example on a bend; narrower means only a racer straight behind is pulled along. | REWRITTEN |
| 1.17 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Boost Factor | `draftingBoost` (configKey) | advanced | How strong the slipstream push is. Stronger makes overtakes on the straight easier to see but can glue whole packs together into a peloton; weaker keeps the field looser. | REWRITTEN |
| 1.18 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Reset (Comfort Zone) | `reset-comfort-zone` (testId) | advanced | Puts the comfort-zone settings back to shipped. | NEW |
| 1.19 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Comfort Threshold | `comfortThreshold` (configKey) | advanced | How early a racer reacts when another racer comes close. Higher = racers stay further apart, more spacious feel. Lower = racers tolerate close racing, denser packs. | KEPT |
| 1.20 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Soft Repulsion Strength | `softRepulsionStrength` (configKey) | advanced | How forcefully racers move away when crowded. Higher = visible swerve when crowded. Lower = subtle drift, racers barely react. | KEPT |
| 1.21 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Reset (Soft Avoidance) | `reset-soft-avoidance` (testId) | advanced | Puts the avoidance buffer and maximum sideways step back to shipped. | NEW |
| 1.22 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Avoidance Buffer (% of body size) | `avoidanceBufferPct` (configKey) | advanced | How early racers start steering apart before their bodies would touch, as a share of body size. Larger keeps more air between racers; smaller lets them come very close before anything pushes them apart. | REWRITTEN |
| 1.23 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Max Lateral | `maxLateral` (configKey) | advanced | Maximum sideways position deviation allowed during avoidance. Caps how far a racer can swerve from their lane to dodge another. | KEPT |
| 1.24 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Reset (Speed Brake) | `reset-speed-brake` (testId) | advanced | Puts the speed-brake warm-up back to shipped. | NEW |
| 1.25 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Avoidance Warmup (ms) | `avoidanceWarmupMs` (configKey) | advanced | Open tracks only. How long after the gun the brake behind a slower racer takes to reach full strength, which gives back-row racers a window to pass. Zero means full braking from the first moment. | REWRITTEN |
| 1.26 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Reset (Look Before You Brake) | `reset-look-before-brake` (testId) | advanced | Puts all seven look-before-you-brake settings back to shipped. | NEW |
| 1.27 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Enabled (Look Before You Brake) | `lookBeforeBrakeEnabled` (configKey) | advanced | On: a racer that catches a slower one and sees a free lane beside it moves over early and passes at speed. Off: it always brakes first behind a slower racer in its lane. Either way racers never overlap. | REWRITTEN |
| 1.28 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Pass Strength | `lookBeforeBrakePassStrength` (configKey) | advanced | How decisively a racer swerves into the free lane while passing. Higher = snappier, clears the slower racer sooner (more likely to pass at speed). Lower = gentler, and if it cannot clear in time the brake re-engages. Much stronger than the general Soft Steering spring by design. | KEPT |
| 1.29 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Re-engage Margin | `lookBeforeBrakeReengageTMultiplier` (configKey) | advanced | How much room a passing racer keeps before the brake comes back if it has not yet cleared into the free lane. Larger brings the brake back earlier — safer, fewer passes; smaller lets the racer commit longer to the pass. | REWRITTEN |
| 1.30 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Max Lateral Speed | `maxLateralSpeedPerStep` (configKey) | advanced | A cap on how fast any racer may move sideways, for dodging out and moving back alike. Lower gives a smooth glide instead of a sudden sideways jump, but racers must start dodging earlier and may brake and wait more. | REWRITTEN |
| 1.31 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Lag-Safety Frames | `lookBeforeBrakeLagFrames` (configKey) | advanced | Extra safety lead the brake keeps because it acts one frame after it is decided. It is the guarantee that a racer that fails to get past still brakes in time and never overlaps; lowering it trades that safety for more passes. | REWRITTEN |
| 1.32 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Only Pass Slower Racers | `lookBeforeBrakeRequireSlowerLeader` (configKey) | advanced | On: a racer only takes a free lane when the racer ahead is genuinely slower, so nobody weaves around traffic of the same speed. Off: any racer in the brake zone may switch lanes. | REWRITTEN |
| 1.33 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Min Overtake Differential | `lookBeforeBrakeMinDifferential` (configKey) | advanced | How much faster a racer must be than the one ahead before it takes a free lane. Higher means only clearly faster racers pass, so the midfield weaves less; lower means more lane changes. | REWRITTEN |
| 1.34 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Reset (Layer 1 — Soft Steering) | `reset-soft-steering` (testId) | advanced | Puts the four soft-steering settings back to shipped. | NEW |
| 1.35 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Symmetric (both yield) | `softSteeringSymmetric` (configKey) | advanced | Off: when two racers meet, only the one behind steers around; the one ahead holds its line. On: both steer away from each other. You see either one racer moving aside or both parting. | REWRITTEN |
| 1.36 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Strength (Soft Steering) | `softSteeringStrength` (configKey) | advanced | How quickly a racer moves toward the sideways position it is aiming for. Higher is snappier steering; lower is a gentler drift. | REWRITTEN |
| 1.37 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Clearance (% of body) | `softSteeringClearancePct` (configKey) | advanced | How much extra gap a racer aims to leave beside an obstacle, beyond just touching it. More clearance means wider, more visible passes. | REWRITTEN |
| 1.38 | Racers among each other — all race long | `BehaviorTuningSection.jsx` | Hysteresis Y | `softSteeringHysteresisY` (configKey) | advanced | A dead zone around the obstacle’s line inside which a racer keeps the side it already chose. It stops a racer swinging left and right when it sits almost exactly behind another. | REWRITTEN |
| 1.39 | Start — grid and racer size | `DynamicsTuningSection.jsx` | Reset (Start) | `reset-row-start` (testId) | advanced | Puts the three starting-row settings back to shipped. | NEW |
| 1.40 | Start — grid and racer size | `DynamicsTuningSection.jsx` | Row Gap Multiplier | `rowGapMultiplier` (configKey) | advanced | How much space is between starting rows. Higher = rows further apart, more spread out start. Lower = rows tightly packed, more compact start. | KEPT |
| 1.41 | Start — grid and racer size | `DynamicsTuningSection.jsx` | Speed Bonus Factor | `speedBonusFactor` (configKey) | advanced | How much extra speed back-row racers get to make up for starting further back. Full compensation gives every row a fair chance; none gives the front row a clear advantage. | REWRITTEN |
| 1.42 | Start — grid and racer size | `DynamicsTuningSection.jsx` | Max Capacity Factor | `maxCapacityFactor` (configKey) | advanced | How wide the starting rows are — controls how many racers fit in each row before adding another row. Higher = wider rows, fewer rows total. Lower = narrower rows, more rows. | KEPT |
| 1.43 | Start — grid and racer size | `BehaviorTuningSection.jsx` | Reset (Start Layout) | `reset-start-layout` (testId) | advanced | Puts the start spread and the run-out zone back to shipped. | NEW |
| 1.44 | Start — grid and racer size | `BehaviorTuningSection.jsx` | Start Spread Range | `startSpreadRange` (configKey) | advanced | How spread out racers are at the starting line, relative to the track. Higher = racers start more spread out across the track. Lower = racers start in a tighter cluster. | KEPT |
| 1.45 | Start — grid and racer size | `BehaviorTuningSection.jsx` | Runout Zone | `runoutZone` (configKey) | advanced | How much track is kept beyond the finish line for finishers to coast into. More room lets the finish breathe; less ends the race more abruptly at the line. It sits here because it shares a reset with the start spread. | REWRITTEN |
| 1.46 | Start — grid and racer size | `AutoScaleSection.jsx` | Reset Defaults (Auto-Scale) | `handleReset` (handler) | advanced | Puts the five auto-scale settings back to shipped. | NEW |
| 1.47 | Start — grid and racer size | `AutoScaleSection.jsx` | Enabled (Auto-Scale) | `enabled` (configKey) | advanced | On: racer size adapts to each race, from the track’s width and the number of racers, which also changes how the starting grid is laid out. Off: every racer is drawn at its type’s own size. A size set for a racer type in its editor always wins. | REWRITTEN |
| 1.48 | Start — grid and racer size | `AutoScaleSection.jsx` | Reference Value | `referenceValue` (configKey) | advanced | The track-width-per-racer at which racers are drawn at their normal size. A race with more room per racer than this draws them larger; a crowded race draws them smaller. | REWRITTEN |
| 1.49 | Start — grid and racer size | `AutoScaleSection.jsx` | Min Scale | `minScale` (configKey) | advanced | The smallest racers may be shrunk to on a crowded track, as a share of their normal size. | REWRITTEN |
| 1.50 | Start — grid and racer size | `AutoScaleSection.jsx` | Max Scale | `maxScale` (configKey) | advanced | The largest racers may be grown to on a roomy track, as a multiple of their normal size. | REWRITTEN |
| 1.51 | Start — grid and racer size | `AutoScaleSection.jsx` | Min Target Screen Px (Auto-Scale card — every racer type) | `minTargetScreenPx` (configKey) | advanced | The size floor every racer type starts from in the racer editor (Tracks, racers, brands and groups → Racer types); a type with its own floor keeps it. This is the setting for every type, not the per-type one, although both are stored under the same name. Neither changes the race picture: the floor the race draws with is “Minimum racer size (% of frame)” under Look, labels and effects. | REWRITTEN |
| 1.52 | Start — grid and racer size | `AutoScaleSection.jsx` | Formula Preview — Track Width | `setPreviewWidth` (handler) | advanced | Try-out only, nothing is saved: enter a track width to see the scale the settings above would give. | NEW |
| 1.53 | Start — grid and racer size | `AutoScaleSection.jsx` | Formula Preview — Racer Count | `setPreviewRacers` (handler) | advanced | Try-out only, nothing is saved: enter a number of racers to see the scale the settings above would give. | NEW |
| 1.54 | Speed changes during the race | `DynamicsTuningSection.jsx` | Reset (Speed Re-Roll) | `reset-speed-reroll` (testId) | advanced | Puts the five re-roll settings back to shipped. | NEW |
| 1.55 | Speed changes during the race | `DynamicsTuningSection.jsx` | Variation Width (%) | `reRollVariationPercent` (configKey) | advanced | How much a racer's speed can change per re-roll. Higher = dramatic position changes, faster races and slower races mix things up. Lower = subtle shifts, more predictable order. | KEPT |
| 1.56 | Speed changes during the race | `DynamicsTuningSection.jsx` | Transition Smoothness (s) | `reRollTransitionDuration` (configKey) | advanced | How smoothly the speed change happens (in seconds). Higher = cinematic slow shifts, looks dramatic. Lower = snappy reactive changes, feels more dynamic. | KEPT |
| 1.57 | Speed changes during the race | `DynamicsTuningSection.jsx` | Trajectory Transition Duration (s) | `trajectoryTransitionDuration` (configKey) | advanced | How smoothly Race Plan changes speed (controller transitions). Lower = snappier corrections, higher = gentler but slower rank adjustments. | KEPT |
| 1.58 | Speed changes during the race | `DynamicsTuningSection.jsx` | Re-Roll Frequency (÷ interval) | `reRollIntervalDivisor` (configKey) | advanced | How often racers are dealt a new speed during a race. Lower values mean more frequent changes and a more chaotic order; higher values mean fewer changes and calmer racing. | REWRITTEN |
| 1.59 | Speed changes during the race | `DynamicsTuningSection.jsx` | Last Roll Position (%) | `reRollLastPositionPercent` (configKey) | advanced | When during the race the last re-roll happens, as percentage of race duration. Higher = action keeps changing right until near the end. Lower = a calm final stretch where the leader can hold their position. | KEPT |
| 1.60 | Speed changes during the race | `DynamicsTuningSection.jsx` | Reset (Gap-Cap Re-Roll) | `reset-gap-reroll` (testId) | advanced | Puts the gap re-roll switch, its gap, strength, mode and marker back to shipped. | NEW |
| 1.61 | Speed changes during the race | `DynamicsTuningSection.jsx` | Gap-Reroll enabled | `gapRerollEnabled` (configKey) | advanced | Master switch for the gap re-roll: when a racer gets too far from its neighbour, its next speed draws are nudged to close the gap. On keeps the field together; off lets gaps grow freely. | REWRITTEN |
| 1.62 | Speed changes during the race | `DynamicsTuningSection.jsx` | Gap-Reroll G (lengths) | `gapRerollThresholdLengths` (configKey) | advanced | How big a gap to the neighbour, in racer lengths, before the re-roll starts nudging. Smaller acts sooner and keeps the field tighter; larger lets racers drift apart further first. | REWRITTEN |
| 1.63 | Speed changes during the race | `DynamicsTuningSection.jsx` | Gap-Reroll strength | `gapRerollStrength` (configKey) | advanced | How hard one nudge pulls. Stronger corrections close gaps faster but can be seen as braking; gentler ones close them over many small steps. | REWRITTEN |
| 1.64 | Speed changes during the race | `DynamicsTuningSection.jsx` | Gap-Reroll mode | `gapRerollMode` (configKey) | advanced | Symmetric: the racer who escaped is slowed and the racer who dropped back is helped, pulling both ends toward the pack. Down-only: only the escapee is slowed. | REWRITTEN |
| 1.65 | Speed changes during the race | `DynamicsTuningSection.jsx` | Gap-Reroll dev marker | `gapRerollDevMarker` (configKey) | advanced | A drawing aid only: a ring flashes on a racer at the moment its re-roll is nudged, so you can see where the gap re-roll acts. It does not change the race; it sits here, beside its mechanism, because it is stored with the race settings. | REWRITTEN |
| 1.66 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Reset (Race Plan Bonus) | `reset-race-plan-bonus` (testId) | advanced | Puts the six race-plan timing and bonus settings back to shipped. | NEW |
| 1.67 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Race Plan Bonus Strength | `racePlanBonusStrengthMultiplier` (configKey) | advanced | Scales the speed bonus the race plan gives racers who are behind where they should be. Higher makes the planned order assert itself sooner; lower leaves more to chance. | REWRITTEN |
| 1.68 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Bonus active until (% race) | `racePlanBonusTransitionEnd` (configKey) | advanced | The area speed bonus is applied at full strength from race start until this point, then fades out over the Bonus fade duration. | KEPT |
| 1.69 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Bonus fade duration (ms) | `racePlanBonusFadeDuration` (configKey) | advanced | How long the area bonus takes to fade out completely after “Bonus active until”. Longer fades are invisible; short ones can show as a sudden change of pace. | REWRITTEN |
| 1.70 | Race plan and bonuses | `DynamicsTuningSection.jsx` | P-Controller starts (% race) | `racePlanCorridorStart` (configKey) | advanced | The trajectory P-controller (OUTCOME phase) becomes active at this point and pushes each racer toward their assigned target rank. | KEPT |
| 1.71 | Race plan and bonuses | `DynamicsTuningSection.jsx` | P-Controller ends (% race) | `racePlanCorridorEnd` (configKey) | advanced | The point in the race where the controller stops steering racers toward their planned places and the final stretch runs free. It can never come before the start above; moving it earlier pulls the start with it. | REWRITTEN |
| 1.72 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Race Plan min duration (s) | `racePlanMinDurationSec` (configKey) | advanced | Races shorter than this run on raw physics with no race plan at all — no planned order and no fairness steering. | REWRITTEN |
| 1.73 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Reset (Phase-Split Bonuses) | `reset-phase-split` (testId) | advanced | Puts the phase-split switch and its four per-phase strengths back to shipped. | NEW |
| 1.74 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Enable phase-split bonuses | `phaseSplitBonusEnabled` (configKey) | advanced | Off: the area and row bonuses run at full strength all race. On: their strength follows the per-phase values below, early and late separately. | REWRITTEN |
| 1.75 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Area bonus — EARLY | `areaBonusEarly` (configKey) | advanced | Strength of the area speed bonus in the early part of the race, when phase-split bonuses are on. Zero switches it off for that phase. | REWRITTEN |
| 1.76 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Area bonus — POST | `areaBonusPost` (configKey) | advanced | Strength of the area speed bonus after the mid-race contest, when phase-split bonuses are on. Zero switches it off for that phase. | REWRITTEN |
| 1.77 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Row bonus — EARLY | `rowBonusEarly` (configKey) | advanced | Strength of the back-row catch-up bonus in the early part of the race, when phase-split bonuses are on. | REWRITTEN |
| 1.78 | Race plan and bonuses | `DynamicsTuningSection.jsx` | Row bonus — POST | `rowBonusPost` (configKey) | advanced | Strength of the back-row catch-up bonus after the mid-race contest, when phase-split bonuses are on. | REWRITTEN |
| 1.79 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Reset (PULK Phase) | `reset-pulk` (testId) | advanced | Puts the six PULK-phase settings and the chase settings back to shipped. | NEW |
| 1.80 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | PULK begin / CHAOS ends | `racePlanPulkStart` (configKey) | advanced | Where the open, unscripted opening ends and the mid-race contest at the front begins. Earlier gives a shorter scramble and a longer front fight. | REWRITTEN |
| 1.81 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | PULK end / OUTCOME begins | `choreoOutcomeStart` (configKey) | advanced | Where the mid-race contest ends and the race starts steering toward its outcome. Later gives a longer front fight and a shorter run to the finish. | REWRITTEN |
| 1.82 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Leader brake | `pulkLeaderBrake` (configKey) | advanced | How hard the current leader is slowed during the contest so a chaser can close in. It only ever slows; stronger makes lead changes more frequent and more visible. | REWRITTEN |
| 1.83 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Challenger boost (cap) | `pulkChallengerBoost` (configKey) | advanced | The most extra speed a chasing challenger may get to close on the leader during the contest. Higher makes challenges arrive faster. | REWRITTEN |
| 1.84 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Ex-leader drop depth (lengths) | `pulkLeadRotationDropDepthLengths` (configKey) | advanced | How far back a dethroned leader is held before being released. Small keeps the rotation inside a tight front group; large sends ex-leaders back through the field. | REWRITTEN |
| 1.85 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Chase: racers accelerated past the outcome | `chaseAfterOutcomeSlots` (configKey) | advanced | How many racers the chase keeps accelerating after the outcome phase begins. It acts only when the chase switch below is on. | REWRITTEN |
| 1.86 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Choreography intensity (0–1) | `choreoIntensity` (configKey) | advanced | Overall drama of the staged racer stories: low is calm, high gives deeper comebacks, more duels and later reveals. Each race clamps it so it cannot break fairness. | REWRITTEN |
| 1.87 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Chase after the outcome phase | `chaseAfterOutcomeEnabled` (configKey) | advanced | On: the chase keeps accelerating its racers after the outcome phase begins instead of releasing everyone to natural speed. Only the boost continues; nobody is slowed by this switch. | REWRITTEN |
| 1.88 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Chase: who is accelerated | `chaseAfterOutcomeSelection` (configKey) | advanced | Which racers the chase accelerates. From the gap: the front of the chasing field, behind the largest gap at the front. Behind the leader: the older rule, the racers directly behind the leader. | REWRITTEN |
| 1.89 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Reset (PULK bonuses) | `reset-pulk-bonuses` (testId) | advanced | Puts the three PULK bonus settings back to shipped. | NEW |
| 1.90 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Area bonus — PULK | `areaBonusPulk` (configKey) | advanced | Strength of the area speed bonus inside the mid-race contest. Acts only when phase-split bonuses are on; zero leaves the contest without it. | REWRITTEN |
| 1.91 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Row bonus — PULK | `rowBonusPulk` (configKey) | advanced | Strength of the back-row catch-up bonus inside the mid-race contest. Acts only when phase-split bonuses are on. | REWRITTEN |
| 1.92 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Cohesion bias gain | `pulkBiasGain` (configKey) | advanced | How strongly racers in the contest are pulled back toward the middle of the pack, so the field stays together instead of stringing out. Zero switches it off; higher keeps the pack tighter. | REWRITTEN |
| 1.93 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Reset (B2 Attackers) | `reset-b2-attackers` (testId) | advanced | Puts the attacker count and re-steer threshold back to shipped. | NEW |
| 1.94 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | B2-attacker count | `b2AttackHeroes` (configKey) | advanced | How many attacker heroes each race casts — racers from further back who mount a charge on the front late in the race. Zero casts none. | REWRITTEN |
| 1.95 | Mid-race contest (PULK) | `DynamicsTuningSection.jsx` | Attacker re-steer threshold | `packReSteerThreshold` (configKey) | advanced | How far, in places, a freed attacker may drift past its target band before it is steered back. Larger gives attackers more freedom; smaller keeps them on their planned places. | REWRITTEN |
| 1.96 | Outcome — the gap leader brake | `DynamicsTuningSection.jsx` | Reset (Gap Leader Brake) | `reset-gap-brake` (testId) | advanced | Puts all five gap-brake settings back to shipped, the servo switch included. | NEW |
| 1.97 | Outcome — the gap leader brake | `DynamicsTuningSection.jsx` | Gap leader brake enabled | `gapBrakeEnabled` (configKey) | advanced | Master switch for the brake on a runaway leader in the outcome phase. It is the only mechanism that slows a racer for being too far ahead. Off reproduces the race as it was before the brake existed. Do not switch the servo setting below on while this is on. | REWRITTEN |
| 1.98 | Outcome — the gap leader brake | `DynamicsTuningSection.jsx` | Servo ignores its own noise (V1) | `servoNoiseBlindEnabled` (configKey) | advanced | An experimental change to how the placement servo restarts its easing. Keep it off. Never switch it on together with the gap leader brake above: together, the brake’s release lands in a single frame instead of being eased. | REWRITTEN |
| 1.99 | Outcome — the gap leader brake | `DynamicsTuningSection.jsx` | Allowed lead (canvas widths) | `gapBrakeAllowedGapPx` (configKey) | advanced | How big a lead, leader to second, the leader may hold before the brake engages at all. Below it nothing slows the leader. Lower means the brake engages on smaller leads. The number is shown in canvas widths and stored in world pixels. | REWRITTEN |
| 1.100 | Outcome — the gap leader brake | `DynamicsTuningSection.jsx` | Brake window end | `gapBrakeWindowEnd` (configKey) | advanced | Where in the race the brake stops acting. Its start is fixed to the end of the mid-race contest, so the two brakes hand over without a gap. | REWRITTEN |
| 1.101 | Outcome — the gap leader brake | `DynamicsTuningSection.jsx` | Maximum authority (%) | `gapBrakeMaxAuthority` (configKey) | advanced | The hardest the brake may ever pull, as a share of natural speed. It is a ceiling: the pull grows only while the lead keeps growing and eases off as the gap closes. | REWRITTEN |

### 2 · Camera — start to ending — 84 controls

| # | Sub-group | Today: file | Today: label | Id (kind) | Tier | Info text | Text |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.1 | Framing — all race long | `CameraAdvancedSection.jsx` | Standard corridor (world px) | `referenceCorridorPx` (configKey) | advanced | The width every “World in shot” setting is measured in. Changing it rescales every shot on every track at once: raise it and the whole game pulls back, lower it and everything moves in. A track wider than this keeps its own width. | REWRITTEN |
| 2.2 | Framing — all race long | `CameraAdvancedSection.jsx` | Company — min racers in frame | `minRacersVisible` (configKey) | advanced | At least this many racers, counting the subject, stay in frame in the single-racer shots, so a tight leader shot never shows one racer alone on an empty track. The camera simply does not zoom in that far. Zero or one switches it off. | REWRITTEN |
| 2.3 | Framing — all race long | `CameraAdvancedSection.jsx` | Transition style | `cameraTransitionGrammar` (configKey) | advanced | How the camera moves from one shot to the next. Glide eases pan and zoom together; Cut jumps straight to the new framing. | REWRITTEN |
| 2.4 | Framing — all race long | `CameraAdvancedSection.jsx` | Glide duration (ms) | `glideDurationMs` (configKey) | advanced | How long a Glide between two shots takes. Longer is calmer; shorter feels more like a cut. Used only when the transition style is Glide. | REWRITTEN |
| 2.5 | Framing — all race long | `CameraAdvancedSection.jsx` | Leader forward-frame | `leaderForwardFrac` (configKey) | advanced | Where the leader sits in the frame along the direction of travel. Centred shows as much ahead as behind; pushed forward shows more of the pack behind him. | REWRITTEN |
| 2.6 | Framing — all race long | `CameraAdvancedSection.jsx` | Aim room floor (px) | `leaderAimRoomFloorPx` (configKey) | advanced | The least road the camera keeps visible ahead of the leader, by easing him back toward the centre where the frame is short in his direction. It matters on steep headings; the cost is seeing less of the pack behind. Takes effect on the next race; zero switches it off. | REWRITTEN |
| 2.7 | Framing — all race long | `CameraAdvancedSection.jsx` | Focal smooth TC | `focalSmoothTc` (configKey) | advanced | Smooths the camera’s aim while following a single racer in the leader and comeback shots, removing small shakes. Higher is smoother but trails the racer more; zero switches it off. | REWRITTEN |
| 2.8 | Choosing the shot | `CameraAdvancedSection.jsx` | BATTLE weight | `battleWeight` (configKey) | advanced | How likely the camera is to accept a battle shot each time one is offered. Low means battles are often passed over for the leader; high means nearly every offered battle is shown. Whether a battle is offered at all is decided by the battle settings. | REWRITTEN |
| 2.9 | Choosing the shot | `CameraAdvancedSection.jsx` | LEAD_CHANGE weight | `leadChangeWeight` (configKey) | advanced | How likely the camera is to accept a lead-change shot each time one is offered, including near the end of the race. | REWRITTEN |
| 2.10 | Choosing the shot | `CameraAdvancedSection.jsx` | COMEBACK weight | `comebackWeight` (configKey) | advanced | How likely the camera is to accept a comeback shot each time one is offered. | REWRITTEN |
| 2.11 | Choosing the shot | `CameraAdvancedSection.jsx` | OVERVIEW weight | `overviewWeight` (configKey) | advanced | How likely the camera is to accept a wide overview shot each time one is offered. | REWRITTEN |
| 2.12 | Choosing the shot | `CameraAdvancedSection.jsx` | OVERVIEW cooldown (ms) | `overviewCooldownMs` (configKey) | advanced | Minimum pause after OVERVIEW before OVERVIEW may appear again. | KEPT |
| 2.13 | Choosing the shot | `CameraAdvancedSection.jsx` | OVERVIEW target count | `overviewTargetCount` (configKey) | advanced | Target number of OVERVIEW cuts per race. | KEPT |
| 2.14 | Choosing the shot | `CameraAdvancedSection.jsx` | OVERVIEW start delay (s) | `overviewStartDelay` (configKey) | advanced | How long after the start before the first overview shot may be offered. | REWRITTEN |
| 2.15 | Start | `CameraAdvancedSection.jsx` | Click to end the current start beat | `ceremonySkipOnClick` (configKey) | advanced | On: a click on the race picture during the opening ends the beat you are watching and moves to the next; on the last one the gun fires. Nothing is cancelled and no beat changes length when you do not click. Off: the picture ignores clicks during the opening. | REWRITTEN |
| 2.16 | Start | `CameraAdvancedSection.jsx` | 1 · Brand screen (ms) | `ceremonyBrandMs` (configKey) | advanced | How long the opening card with the brand’s logo and the race name is shown. It only appears when a brand is active; with none, the opening begins directly on the track. | REWRITTEN |
| 2.17 | Start | `CameraAdvancedSection.jsx` | 2 · Track overview (ms) | `ceremonyVenueMs` (configKey) | advanced | How long the opening shot of the whole track is held still before the camera starts to move. Longer makes the whole opening longer by exactly that much. | REWRITTEN |
| 2.18 | Start | `CameraAdvancedSection.jsx` | · Push-in travel (ms) | `ceremonyPushMs` (configKey) | advanced | How long the camera takes to move in from the whole track to the starting formation. Where it arrives is worked out from the formation itself, not set here. | REWRITTEN |
| 2.19 | Start | `CameraAdvancedSection.jsx` | Push Easing | `ceremonyEasing` (configKey) | advanced | The shape of the push-in. Ease in-out starts and ends at rest, a ceremonial move; quint holds longer at both ends; ease out starts at full speed and feels like catching up; linear moves at one speed. | REWRITTEN |
| 2.20 | Start | `CameraAdvancedSection.jsx` | 3 · Starters board — floor (ms) | `startBoardFloorMs` (configKey) | advanced | The shortest time the board listing the starters is shown, however small the field. | REWRITTEN |
| 2.21 | Start | `CameraAdvancedSection.jsx` | 3 · Starters board — per name (ms) | `startBoardMsPerName` (configKey) | advanced | Reading time allowed per racer on the starters board; a big field keeps the board up longer, and the camera waits on the formation until it is done. The opening total below shows the result for several field sizes. | REWRITTEN |
| 2.22 | Start | `CameraAdvancedSection.jsx` | 4 · Starting formation (ms) | `ceremonySettledMs` (configKey) | advanced | A still look at the formation after the board has gone and before the countdown, so viewers can find on the track the number the board just showed them. It is added to the opening. | REWRITTEN |
| 2.23 | Start | `CameraAdvancedSection.jsx` | 5 · Countdown digits (ms) | `countdownDigitsMs` (configKey) | advanced | How long the countdown digits are on screen at the very end of the opening. The count still reaches zero exactly at the gun; this only sets how early the digits appear. | REWRITTEN |
| 2.24 | Start | `CameraAdvancedSection.jsx` | Start Window (ms) | `startWindowMs` (configKey) | advanced | How long after the gun the start owns the picture: no battle, comeback or lead-change shots until it ends. The camera starts following the leader as soon as he reaches his place in the frame. | REWRITTEN |
| 2.25 | Middle — battles | `CameraAdvancedSection.jsx` | Pulk Closeness (lap %) | `battlePulkThresholdT` (configKey) | advanced | How close together, as a share of a lap, several front runners must be before a battle shot is offered. Tighter means only real duels; looser offers battles more often. The same on every track. | REWRITTEN |
| 2.26 | Middle — battles | `CameraAdvancedSection.jsx` | Isolation (lap %) | `battleIsolationThresholdT` (configKey) | advanced | Turns down a battle when another racer outside the group is this close to it, so the shot does not cut a crowd in half. Zero switches the check off. | REWRITTEN |
| 2.27 | Middle — battles | `CameraAdvancedSection.jsx` | Max. group size | `battleMaxGroupSize` (configKey) | advanced | The most racers a battle shot will frame together. | REWRITTEN |
| 2.28 | Middle — battles | `CameraAdvancedSection.jsx` | Max. Rank-Span (Expansion) | `battleMaxGroupRankSpan` (configKey) | advanced | How far apart in places the racers of one battle may be. Smaller keeps a battle to neighbours; larger lets it span more of the field. | REWRITTEN |
| 2.29 | Middle — battles | `CameraAdvancedSection.jsx` | Top-N Required (minimum rank) | `battleMinTopN` (configKey) | advanced | At least one racer in a battle must be running at or above this place, so battles are about the front of the field. | REWRITTEN |
| 2.30 | Middle — battles | `CameraAdvancedSection.jsx` | BATTLE Min Hold (ms) | `battleMinDurationMs` (configKey) | advanced | The shortest time a battle shot stays on screen once chosen, even if the group breaks up. | REWRITTEN |
| 2.31 | Middle — battles | `CameraAdvancedSection.jsx` | BATTLE Cooldown (ms) | `battleCooldownMs` (configKey) | advanced | The least time after a battle shot before another battle may be shown. | REWRITTEN |
| 2.32 | Middle — battles | `CameraAdvancedSection.jsx` | Slowmo factor (battle) | `battleSlowmoFactor` (configKey) | advanced | How much the race slows down while a battle is on screen. Lower is slower motion; the full value means no slow motion. The race keeps its outcome; only the playback slows. | REWRITTEN |
| 2.33 | Middle — battles | `CameraAdvancedSection.jsx` | Min. duration (s) (battle slow motion) | `battleSlowmoMinDuration` (configKey) | advanced | The shortest time slow motion lasts once a battle has triggered it, even if the battle shot ends sooner. | REWRITTEN |
| 2.34 | Middle — battles | `CameraAdvancedSection.jsx` | Fade duration (s) (battle slow motion) | `battleSlowmoFadeDuration` (configKey) | advanced | How gradually slow motion fades in and out. Zero switches instantly. | REWRITTEN |
| 2.35 | Middle — battles | `CameraAdvancedSection.jsx` | Focus darkening | `battleFocusDarkening` (configKey) | advanced | How much the racers outside a battle are dimmed while it is on screen. None leaves everyone as they are; full turns them black. | REWRITTEN |
| 2.36 | Middle — lead changes | `CameraAdvancedSection.jsx` | Min. gap (T-space) | `leadChangeMinGap` (configKey) | advanced | How clearly the new leader must be ahead before a lead change counts. Larger ignores near-ties; smaller reacts to every swap. | REWRITTEN |
| 2.37 | Middle — lead changes | `CameraAdvancedSection.jsx` | Debounce (ms) | `leadChangeDebounceMs` (configKey) | advanced | Duration in ms the new leader must hold before the change is confirmed. | KEPT |
| 2.38 | Middle — lead changes | `CameraAdvancedSection.jsx` | Min. observation duration (s) (lead change) | `leadChangeMinDuration` (configKey) | advanced | Minimum time the camera stays on the new leader after LEAD_CHANGE entry. | KEPT |
| 2.39 | Middle — lead changes | `CameraAdvancedSection.jsx` | LEAD_CHANGE-Cooldown (ms) | `leadChangeCooldownMs` (configKey) | advanced | Minimum pause after LEAD_CHANGE before re-triggering is possible. | KEPT |
| 2.40 | Middle — comebacks | `CameraAdvancedSection.jsx` | Let the race plan say WHEN a comeback is shown | `comebackUseBeats` (configKey) | advanced | On: a racer the race plan has cast as a comebacker is only offered to the camera at the moments the plan sets for his charge. Off: the camera looks for comebacks from the rank changes alone. | REWRITTEN |
| 2.41 | Middle — comebacks | `CameraAdvancedSection.jsx` | Min. positions gained | `comebackMinPositionsGained` (configKey) | advanced | Minimum positions gained within the time window to trigger COMEBACK. | KEPT |
| 2.42 | Middle — comebacks | `CameraAdvancedSection.jsx` | Time window (s) | `comebackWindowSec` (configKey) | advanced | Look-back window for rank history. Positions gained = rank N seconds ago minus current rank. | KEPT |
| 2.43 | Middle — comebacks | `CameraAdvancedSection.jsx` | Min. starting gap | `comebackMinStartGap` (configKey) | advanced | How far back from the leader a racer must have been at the start of the look-back window to count as a comeback. Larger means only racers from deep in the field. | REWRITTEN |
| 2.44 | Middle — comebacks | `CameraAdvancedSection.jsx` | Max. current rank (lead-group filter) | `comebackMaxCurrentRankPct` (configKey) | advanced | Leaves out racers already in the leading group, so a comeback shot shows someone still working through the field. Larger excludes more of the front. | REWRITTEN |
| 2.45 | Middle — comebacks | `CameraAdvancedSection.jsx` | Outcome phase threshold | `outcomePhaseThreshold` (configKey) | advanced | How far the leader must be through the race before the camera starts looking for comebacks. | REWRITTEN |
| 2.46 | Middle — comebacks | `CameraAdvancedSection.jsx` | Min. observation duration (s) (comeback) | `comebackMinDuration` (configKey) | advanced | The shortest time the camera stays on a comeback racer once it has cut to him. | REWRITTEN |
| 2.47 | Middle — comebacks | `CameraAdvancedSection.jsx` | COMEBACK-Cooldown (ms) | `comebackCooldownMs` (configKey) | advanced | Minimum pause after COMEBACK before re-triggering is possible. | KEPT |
| 2.48 | Endgame and run-in | `CameraAdvancedSection.jsx` | Endgame Focus Threshold | `endgameThreshold` (configKey) | advanced | How far through the race the leader must be before the camera locks onto him for the endgame (lead changes may still cut in). The run-in framing below starts from the same point. | REWRITTEN |
| 2.49 | Endgame and run-in | `CameraAdvancedSection.jsx` | Frame the finish through the run-in | `runInShot` (configKey) | advanced | On: once the finish line can be framed without opening wider than an overview, the camera keeps it in view until the first racer crosses, tightening as the leader closes in. Off: the camera frames the leader only. | REWRITTEN |
| 2.50 | Endgame and run-in | `CameraAdvancedSection.jsx` | Run-in opening (ms) | `runInOpenMs` (configKey) | advanced | How long the camera takes to open the shot when the run-in begins. Faster shows the line sooner; slower is calmer but trails its subject more while it moves. | REWRITTEN |
| 2.51 | Endgame and run-in | `CameraAdvancedSection.jsx` | Drop racers who can no longer win | `contentionWatch` (configKey) | advanced | On: in the endgame the camera keeps checking who can still win, from what is visible on the track, and eases the framing off racers the race has already decided. Off: everyone in the group stays framed to the line. | REWRITTEN |
| 2.52 | Endgame and run-in | `CameraAdvancedSection.jsx` | Hold the finish line in the subject’s own region | `bandFloor` (configKey) | advanced | On: the endgame keeps the finish inside the subject’s own part of the frame, which needs a wider shot but keeps the line on screen. Off: the finish may sit nearer the edge and the shot stays tighter. | REWRITTEN |
| 2.53 | Finish and photo finish | `CameraAdvancedSection.jsx` | Enable photo-finish shot | `photoFinishEnabled` (configKey) | advanced | On: when the first finishers cross almost together, the camera shows a tight shot of them at the line. Off: a close finish gets the ordinary single-winner shot. | REWRITTEN |
| 2.54 | Finish and photo finish | `CameraAdvancedSection.jsx` | Lead-progress gate | `photoFinishLeadProgress` (configKey) | advanced | How close to the line the leader must be when the camera decides whether the finish will be close. Later decides nearer the line. | REWRITTEN |
| 2.55 | Finish and photo finish | `CameraAdvancedSection.jsx` | Closeness threshold (t) | `photoFinishCloseThresholdT` (configKey) | advanced | How close the leading finishers must be for a photo finish. Larger triggers it more often. | REWRITTEN |
| 2.56 | Finish and photo finish | `CameraAdvancedSection.jsx` | Slowmo factor (photo finish) | `photoFinishSlowmoFactor` (configKey) | advanced | How much the race slows down during the photo-finish shot. Lower is slower motion; the full value means none. | REWRITTEN |
| 2.57 | Finish and photo finish | `CameraAdvancedSection.jsx` | Frame the shot's own contenders | `photoFinishContenderFraming` (configKey) | advanced | On: the photo-finish shot keeps the racers it started on. Off: it follows whoever is in the top places right now, so the picture jumps when finished racers swap. | REWRITTEN |
| 2.58 | Finish and photo finish | `CameraAdvancedSection.jsx` | Photo finish frames everyone still abreast | `contenderZoom` (configKey) | advanced | On: the photo-finish shot frames every racer still level with the leader on a free lane, usually a handful. Off: it frames the top two only. This switch also enables the limit that keeps the shot no wider than the road. | REWRITTEN |
| 2.59 | Finish and photo finish | `CameraAdvancedSection.jsx` | Lane-cap arrival (ms) | `corridorCapArriveMs` (configKey) | advanced | How long the photo-finish shot takes to settle to the road-width limit, so it moves instead of jumping. Zero applies the limit at once. | REWRITTEN |
| 2.60 | Ending — after the line | `CameraAdvancedSection.jsx` | The ending keeps the finish shot | `endingKeepsFinishShot` (configKey) | advanced | On: the camera keeps composing while the ending runs, so the settled finish picture holds. Off: the older behaviour — the view resets the moment the last racer crosses, which can show an empty or shrunken picture. | REWRITTEN |
| 2.61 | Ending — after the line | `CameraAdvancedSection.jsx` | 1 · Hold on the winner, before the zoom-out (ms) | `finishDramaDurationMs` (configKey) | advanced | How long the camera stays on the winner after the first crossing before it zooms out to the finish overview. | REWRITTEN |
| 2.62 | Ending — after the line | `CameraAdvancedSection.jsx` | 2 · Zoom-out duration (ms) | `finishOverviewZoomOutDurationMs` (configKey) | advanced | How long the zoom-out to the finish overview takes. | REWRITTEN |
| 2.63 | Ending — after the line | `CameraAdvancedSection.jsx` | Lookback before finish (px) | `finishOverviewLookbackPx` (configKey) | advanced | Where the finish overview is aimed: on the line itself, or further back along the track so the arriving racers are in view. | REWRITTEN |
| 2.64 | Ending — after the line | `CameraAdvancedSection.jsx` | 3 · Hold on the finish picture, after the LAST crossing (ms) | `finishHoldAfterLastMs` (configKey) | advanced | Extra time on the settled finish picture after the last racer is home, before the pause below begins. It lengthens the look at the result; it cannot bring back arrivals already past. | REWRITTEN |
| 2.65 | Ending — after the line | `CameraAdvancedSection.jsx` | 4 · Pause before the result screen (ms) | `finishPauseMs` (configKey) | advanced | The last part of the ending, until the screen changes to the results. The winner card is shown inside this pause, so this is the lever for a longer read of it. | REWRITTEN |
| 2.66 | Ending — after the line | `CameraAdvancedSection.jsx` | Winner card (ms) | `winnerCardMs` (configKey) | advanced | How long the card naming the winner stays up at the end. It lives inside the pause above and can never make the ending longer; zero shows no card. | REWRITTEN |
| 2.67 | Ending — after the line | `CameraAdvancedSection.jsx` | 5 · Podium build-up beat (ms) | `podiumRevealBeatMs` (configKey) | advanced | The beat the result screen is built on: third, then second, then the winner, then the full ranking, one beat apart. Zero shows the complete screen at once. A click or key completes it early. | REWRITTEN |
| 2.68 | Ending — after the line | `CameraAdvancedSection.jsx` | Show the old "RACE FINISHED!" splash | `finishedSplashEnabled` (configKey) | advanced | On: brings back the old dark full-screen “race finished” cover over the ending. Off: the ending shows the race picture, the winner card and the podium uncovered. | REWRITTEN |
| 2.69 | Ending — after the line | `RaceDefaults.jsx` | Go to the results on its own | `autoAdvance` (configKey) | operator | On: the results screen appears by itself once the ending above has played. Off: the finish picture stays until you click it, so you can hold the moment for the room. The length of the ending is set above in this group; this switch does not change it. | REWRITTEN |
| 2.70 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Reset state | `resetProfileState` (handler) | advanced | Puts every setting of this one camera state back to shipped. Each state has its own reset. | NEW |
| 2.71 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | World in shot (corridors) | `visibleCorridors` (configKey) | advanced | How much of the world this camera state shows across the frame, in standard corridors. Higher is wider. The same number shows the same amount of world on every track. | REWRITTEN |
| 2.72 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Tracking TC (s) | `trackingTC` (configKey) | advanced | How quickly the camera follows its subject once the shot has settled. Higher lets the subject drift further before the camera catches up. | REWRITTEN |
| 2.73 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Entry TC (s) | `entryTC` (configKey) | advanced | How quickly the camera moves in the moments after this state begins, before it has settled on its subject. | REWRITTEN |
| 2.74 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Lead-in duration (s) | `leadInDuration` (configKey) | advanced | How long the camera shows the track ahead when this state begins. | REWRITTEN |
| 2.75 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Lead-out duration (s) | `leadOutDuration` (configKey) | advanced | How long before this state ends the camera starts slowing to a stop. | REWRITTEN |
| 2.76 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Inner frame % | `innerFramePct` (configKey) | advanced | The part of the frame the subject must stay inside. Smaller keeps the subject closer to the centre. | REWRITTEN |
| 2.77 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Max state duration (ms) | `maxStateDuration` (configKey) | advanced | The longest this state may stay on screen before the camera must move on. | REWRITTEN |
| 2.78 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Min state hold (ms) | `minStateHold` (configKey) | advanced | The shortest time this state stays on screen once chosen. | REWRITTEN |
| 2.79 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Max entry duration (ms) | `maxEntryDurationMs` (configKey) | advanced | The longest the camera may take to settle after this state begins; after it the camera treats the shot as settled anyway. | REWRITTEN |
| 2.80 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Lead-Ahead active | `leadAheadEnabled` (configKey) | advanced | On: this state shows more of the track ahead of the racer it follows. Only offered for the leader, battle and comeback states. | REWRITTEN |
| 2.81 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Lead-Out active | `leadOutEnabled` (configKey) | advanced | On: the camera eases to a stop over the lead-out time before this state ends. Only offered for the leader, battle and comeback states. | REWRITTEN |
| 2.82 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Convergence Zoom Threshold | `entryConvergenceZoom` (configKey) | advanced | For every state: how close the zoom must come to its target before a new shot counts as settled. Smaller waits for a closer match. | REWRITTEN |
| 2.83 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | Convergence Px Threshold | `entryConvergencePx` (configKey) | advanced | For every state: how close the camera’s position must come to its target before a new shot counts as settled. | REWRITTEN |
| 2.84 | Zoom profiles per camera state | `CameraAdvancedSection.jsx` | T-Space Convergence Threshold | `transitionTConvergence` (configKey) | advanced | For every state: how close along the track the camera must come to its subject before a new shot counts as settled. It must stay above the camera’s normal following distance or a shot never settles. | REWRITTEN |

### 3 · Look, labels and effects — 38 controls

| # | Sub-group | Today: file | Today: label | Id (kind) | Tier | Info text | Text |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1 | Racer size on screen | `SpriteSizeRangeSection.jsx` | Reset Sprite Size Cap | `reset-sprite-size-cap` (testId) | advanced | Puts the largest racer size back to shipped. | NEW |
| 3.2 | Racer size on screen | `SpriteSizeRangeSection.jsx` | Maximum sprite size (px) | `maxTargetScreenPx` (configKey) | advanced | The largest a racer may appear on screen. It holds the camera back from zooming in closer than this; lower it if racer animations look coarse when very large. | REWRITTEN |
| 3.3 | Racer size on screen | `CameraAdvancedSection.jsx` | Minimum racer size (% of frame) | `minDrawnFrameFrac` (configKey) | advanced | A readability floor: a racer is never drawn smaller than this share of the picture height, so it stays recognisable when the camera is far out. It affects the drawing only and never moves the camera. | REWRITTEN |
| 3.4 | Name tags and track labels | `NameTagVisibilitySection.jsx` | Reset Name Tag Visibility | `reset-nametag-visibility` (testId) | advanced | Puts the three name-tag settings back to shipped. | NEW |
| 3.5 | Name tags and track labels | `NameTagVisibilitySection.jsx` | Name size (% of frame) | `nameTagFrameFrac` (configKey) | advanced | How big a name tag is drawn, as a share of the picture height — the same size at every zoom and on every track. Bigger names are easier to read but overlap sooner, so fewer are shown at once. | REWRITTEN |
| 3.6 | Name tags and track labels | `NameTagVisibilitySection.jsx` | Gap above racer (px) | `nameTagMarginPx` (configKey) | advanced | The space between the top of a racer and its name tag. The rest of the distance follows the racer’s drawn size by itself. | REWRITTEN |
| 3.7 | Name tags and track labels | `NameTagVisibilitySection.jsx` | Show all names for (s) | `nameTagAllUntilMs` (configKey) | advanced | How long after the gun every name stays visible, so each viewer can find their racer once. After that, only tags with room are drawn. | REWRITTEN |
| 3.8 | Name tags and track labels | `CameraAdvancedSection.jsx` | Track labels show the NAME when it covers nothing | `labelNamesWhenRoom` (configKey) | advanced | On: during the race a label shows the racer’s name when the name would cover no other label and no racer, and the number otherwise. Off: labels show numbers. The racer the camera is on, and every racer at the photo finish, always show a name. | REWRITTEN |
| 3.9 | Name tags and track labels | `CameraAdvancedSection.jsx` | Track labels — wait before a name (ms) | `labelFormHoldMs` (configKey) | advanced | How long a label’s name must have been completely clear before it is shown. Lower means names appear sooner and switch more often. The switch back to a number is always immediate. | REWRITTEN |
| 3.10 | Overlay texts | `CameraAdvancedSection.jsx` | Enable overlay texts | `stateOverlayEnabled` (configKey) | advanced | Shows short overlay texts (e.g. 'Currently leading: Max') on entry into OVERVIEW, BATTLE and COMEBACK. | KEPT |
| 3.11 | Overlay texts | `CameraAdvancedSection.jsx` | Overlay duration (ms) | `stateOverlayDurationMs` (configKey) | advanced | How long each overlay text stays on screen. | REWRITTEN |
| 3.12 | Smoothness and live standings | `DynamicsTuningSection.jsx` | Reset (Frame Timing) | `reset-frame-timing` (testId) | advanced | Puts the three smoothness settings back to shipped. It is separate from the race reset on purpose: these change the picture, not the race. | NEW |
| 3.13 | Smoothness and live standings | `DynamicsTuningSection.jsx` | dt-Smoothing (EMA-Alpha) | `dtSmoothingAlpha` (configKey) | advanced | Smooths uneven browser frame times before they move the camera and effects. Higher is a smoother camera that reacts later to real frame-rate changes; zero uses the raw timing. The race itself is not affected. | REWRITTEN |
| 3.14 | Smoothness and live standings | `DynamicsTuningSection.jsx` | Render Interpolation | `renderInterpolation` (configKey) | advanced | Smooths racer and camera movement between the race’s fixed steps, removing rhythmic jitter on uneven frame rates. Off is the older look, kept for comparison. Takes effect at once. | REWRITTEN |
| 3.15 | Smoothness and live standings | `DynamicsTuningSection.jsx` | Live Standings update every | `scoreboardIntervalMs` (configKey) | advanced | How often the standings list beside the race is rebuilt. Faster reacts sooner to an overtake; slower drops fewer frames with large fields. Choose the slowest that still feels live. Takes effect at the next race start. | REWRITTEN |
| 3.16 | Sound | `RaceDefaults.jsx` | Sound effects | `soundEffects` (configKey) | operator | Reserved for race sounds. The switch is stored, but the game plays no sounds yet, so changing it has no effect today. | REWRITTEN |
| 3.17 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Class list (select a class) | `openClass` (handler) | advanced | Opens a surface class for editing, with a live preview. A badge tells you whether it is a built-in class, a built-in class you changed, or one you created. | REWRITTEN |
| 3.18 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | + New Surface Class | `handleNewClass` (handler) | advanced | Starts a new surface class from scratch. It appears in the list once saved and can then be chosen for tracks and racer types. | NEW |
| 3.19 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Label | `label` (configKey) | advanced | The name shown in the class list and in the track editor’s paint picker. The class keeps its internal id when you rename it. | REWRITTEN |
| 3.20 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Generator | `handleGeneratorChange` (handler) | advanced | Which effect draws this surface: particles, clouds, splashes or lines. Changing it replaces the settings below with the new effect’s own starting values. | REWRITTEN |
| 3.21 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Color | `color` (configKey) | advanced | The colour of the effect, by picker or hex code. | NEW |
| 3.22 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Start Size | `startSize` (configKey) | advanced | Cloud effect: how big each puff is when it appears. | NEW |
| 3.23 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | End Size | `endSize` (configKey) | advanced | Cloud effect: how big each puff has grown when it fades. | NEW |
| 3.24 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Lifetime (frames) | `lifetimeFrames` (configKey) | advanced | How long each particle, puff, splash or line stays visible before it fades. Longer leaves a longer trail. | NEW |
| 3.25 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Spawn Rate | `spawnProbability` (configKey) | advanced | How often a racer gives off a new particle, puff or splash. Higher is denser. | NEW |
| 3.26 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Drift Direction | `driftDirection` (configKey) | advanced | Cloud effect: whether puffs drift back behind the racer or in random directions. | NEW |
| 3.27 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Opacity | `opacity` (configKey) | advanced | How see-through the effect is, from invisible to solid. | NEW |
| 3.28 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Thickness | `thickness` (configKey) | advanced | Line effect: how thick the trail lines are. | NEW |
| 3.29 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Size Min | `sizeMin` (configKey) | advanced | Particle and splash effects: the smallest size a single particle can have. | NEW |
| 3.30 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Size Max | `sizeMax` (configKey) | advanced | Particle and splash effects: the largest size a single particle can have. | NEW |
| 3.31 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Drift | `drift` (configKey) | advanced | Particle effect: how far particles drift away from where they appear. | NEW |
| 3.32 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Gravity | `gravity` (configKey) | advanced | Particle and splash effects: how strongly particles fall after they appear. Zero lets them float. | NEW |
| 3.33 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Count | `count` (configKey) | advanced | Splash effect: how many droplets one splash throws. | NEW |
| 3.34 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Spread Angle | `spreadAngle` (configKey) | advanced | Splash effect: how wide the droplets of one splash fan out. | NEW |
| 3.35 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Save | `handleSave` (handler) | advanced | Stores the class on the server, so every track and racer type using it shows the new look. | NEW |
| 3.36 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Cancel | `handleCancel` (handler) | advanced | Closes the editor and discards changes not yet saved. | NEW |
| 3.37 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Delete | `handleDelete` (handler) | advanced | Deletes a class you created. Built-in classes cannot be deleted. | NEW |
| 3.38 | Ground effects (surface classes) | `SurfaceClassManager.jsx` | Reset to Default | `handleResetToDefault` (handler) | advanced | For a built-in class you changed: removes your change so the class looks as shipped again. | REWRITTEN |

### 4 · Tracks, racers, brands and groups — 68 controls

| # | Sub-group | Today: file | Today: label | Id (kind) | Tier | Info text | Text |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4.1 | Player groups | `PlayerGroupsManager.jsx` | + New Group | `setShowForm` (handler) | operator | Opens an empty form to save a new roster of player names. | NEW |
| 4.2 | Player groups | `PlayerGroupsManager.jsx` | ▶ Load to Setup | `handleLoad` (handler) | operator | Takes this group’s names into Race Setup, replacing the names entered there. | REWRITTEN |
| 4.3 | Player groups | `PlayerGroupsManager.jsx` | Edit (group) | `handleEdit` (handler) | operator | Opens this group in the form below to rename it or change its names. | NEW |
| 4.4 | Player groups | `PlayerGroupsManager.jsx` | Set as default / Remove default (group) — not in English today, see §8 | `handleSetDefault` (handler) | admin | Admin only. Marks this group as the one that comes with a fresh installation, or removes that mark. | NEW |
| 4.5 | Player groups | `PlayerGroupsManager.jsx` | Export as seed (group) — not in English today, see §8 | `handleExportSeed` (handler) | admin | Admin only. Downloads this group as a seed file, the form used to ship it with the game. | NEW |
| 4.6 | Player groups | `PlayerGroupsManager.jsx` | Delete (group) | `handleDelete` (handler) | operator | Deletes this group after you confirm. The races it was used in are not affected. | NEW |
| 4.7 | Player groups | `PlayerGroupsManager.jsx` | Group Name | `name` (configKey) | operator | What this group is called. Choose a short, recognizable name that you'll see in race setup. | KEPT |
| 4.8 | Player groups | `PlayerGroupsManager.jsx` | Player Names | `playersText` (configKey) | operator | The players in this group, separated by commas. The counter below shows how many names were recognised and how many a race allows. | REWRITTEN |
| 4.9 | Player groups | `PlayerGroupsManager.jsx` | Create Group / Save Changes | `handleSave` (handler) | operator | Stores the group on the server for your team. | NEW |
| 4.10 | Player groups | `PlayerGroupsManager.jsx` | Cancel (group form) | `handleCancel` (handler) | operator | Closes the form without saving. | NEW |
| 4.11 | Tracks | `DevScreen.jsx` | Track Geometry Editor → | `navigate('/track-editor')` (handler) | operator | Opens the Track Geometry Editor, where a track’s path, background, start, finish and width are drawn. | NEW |
| 4.12 | Tracks | `TrackManager.jsx` | + Add Track | `setShowForm` (handler) | operator | Opens an empty track form. Save the details first, then draw the path in the Track Geometry Editor. | NEW |
| 4.13 | Tracks | `TrackManager.jsx` | Edit (track) | `handleEdit` (handler) | operator | Opens this track in the form below. | NEW |
| 4.14 | Tracks | `TrackManager.jsx` | Set as default / Remove default (track) — not in English today, see §8 | `handleSetDefault` (handler) | admin | Admin only. Marks this track as one that comes with a fresh installation, or removes that mark. | NEW |
| 4.15 | Tracks | `TrackManager.jsx` | Export as seed (track) — not in English today, see §8 | `handleExportSeed` (handler) | admin | Admin only. Downloads this track as a seed file, the form used to ship it with the game. | NEW |
| 4.16 | Tracks | `TrackManager.jsx` | Delete from server (track) | `handleDelete` (handler) | operator | Deletes this track from the server after you confirm. | NEW |
| 4.17 | Tracks | `TrackManager.jsx` | Name (track) | `name` (configKey) | operator | What this track is called. Shown in race setup and in the race history. | KEPT |
| 4.18 | Tracks | `TrackManager.jsx` | Emoji Icon | `icon` (configKey) | operator | The small symbol shown next to the track’s name in setup and history. | NEW |
| 4.19 | Tracks | `TrackManager.jsx` | Description | `description` (configKey) | operator | A short line shown on the track’s card in Race Setup. | NEW |
| 4.20 | Tracks | `TrackManager.jsx` | Color (track) | `color` (configKey) | operator | The track’s accent colour on its card, by picker or hex code. | NEW |
| 4.21 | Tracks | `TrackManager.jsx` | Default Laps | `defaultLaps` (configKey) | operator | Closed tracks only: how many laps a race on this track starts with in Race Setup. The race length follows from the laps and the course length. | NEW |
| 4.22 | Tracks | `TrackManager.jsx` | Default Duration | `defaultDurationSec` (configKey) | operator | Open tracks only: how long a race on this track starts with in Race Setup. | NEW |
| 4.24 | Tracks | `TrackManager.jsx` | Edit Geometry / Draw Geometry | `track-geometry-btn` (testId) | operator | Opens this track in the Track Geometry Editor to draw or change its path. | REWRITTEN |
| 4.25 | Tracks | `TrackManager.jsx` | Default Racer Type | `defaultRacerTypeId` (configKey) | operator | The racer type Race Setup picks when this track is chosen. | NEW |
| 4.26 | Tracks | `TrackManager.jsx` | Surface Classes (track) | `surfaceClasses` (configKey) | operator | Which ground effects this track can show. At least one is required. Classes themselves are defined under Look, labels and effects. | REWRITTEN |
| 4.27 | Tracks | `TrackManager.jsx` | Max Racers (with Reset to auto) | `maxRacers` (configKey) | operator | The field size above which Race Setup warns for this track. It is worked out from the track’s geometry; type a number to override it, and use “Reset to auto” to go back to the computed value. | NEW |
| 4.28 | Tracks | `TrackManager.jsx` | Add Track / Save Changes | `handleSave` (handler) | operator | Stores the track details on the server. | NEW |
| 4.29 | Tracks | `TrackManager.jsx` | Cancel (track form) | `handleCancel` (handler) | operator | Closes the form without saving. | NEW |
| 4.30 | Racer types | `DevScreen.jsx` | Racer Editor → | `navigate('/racer-editor')` (handler) | operator | Opens the Racer Editor, where racer types are created and their images and characters are set. | NEW |
| 4.31 | Racer types | `RacerManager.jsx` | Edit in Racer Editor | `navigate(`/racer-editor` (handler) | operator | Opens this racer type in the Racer Editor. Offered for types you created. | REWRITTEN |
| 4.32 | Racer types | `RacerManager.jsx` | Edit (racer type tuning) | `setEditTypeId` (handler) | operator | Opens the tuning window for this racer type, with the settings listed below. | REWRITTEN |
| 4.33 | Racer types | `RacerManager.jsx` | Delete (racer type) | `handleDelete` (handler) | operator | Deletes a racer type you created, after you confirm. Built-in types cannot be deleted. | REWRITTEN |
| 4.34 | Racer types | `RacerManager.jsx` | Active (racer type) | `toggleActive` (handler) | operator | Whether this racer type can be chosen in Race Setup. Off hides it from setup without deleting it. | NEW |
| 4.35 | Racer types | `RacerEditModal.jsx` | Speed Multiplier | `speedMultiplier` (configKey) | operator | How fast this racer type moves compared with the normal speed. Below the neutral value races take longer, above it they are shorter. | REWRITTEN |
| 4.36 | Racer types | `RacerEditModal.jsx` | Display Size (px) | `displaySize` (configKey) | operator | Sprite size in pixels for this racer type. Setting it here skips auto-scaling for the race and feeds the starting grid (row gap and row count). | KEPT |
| 4.37 | Racer types | `RacerEditModal.jsx` | Anim Period (ms) | `basePeriodMs` (configKey) | operator | Duration of one full animation cycle in milliseconds. Low = fast flicker, high = slow and calm. | KEPT |
| 4.38 | Racer types | `RacerEditModal.jsx` | Leader Ring Color | `leaderRingColor` (configKey) | operator | The colour of the glow ring drawn around the leading racer of this type, by picker or hex code. | REWRITTEN |
| 4.39 | Racer types | `RacerEditModal.jsx` | Leader Ring Width (rx) | `leaderEllipseRx` (configKey) | operator | Horizontal radius of the leader ring ellipse in pixels. Increase for wider sprites. | KEPT |
| 4.40 | Racer types | `RacerEditModal.jsx` | Leader Ring Height (ry) | `leaderEllipseRy` (configKey) | operator | Vertical radius of the leader ring ellipse in pixels. Smaller values give a flatter ring. | KEPT |
| 4.41 | Racer types | `RacerEditModal.jsx` | Reset (per field) | `handleFieldReset` (handler) | operator | Appears beside a field you changed; puts that one field back to the type’s shipped value. | NEW |
| 4.42 | Racer types | `RacerEditModal.jsx` | Min Sprite Screen Size (racer-type editor — this type only) | `handleMinSizeChange` (handler) | operator | This racer type’s own size floor, shown in the animated preview beside it. It starts from the floor set for every type under The race → Start; a value set here belongs to this type alone. This is the per-type setting, not the one for every type, although both are stored under the same name. Neither changes the race picture: the floor the race draws with is “Minimum racer size (% of frame)” under Look, labels and effects. | REWRITTEN |
| 4.43 | Racer types | `RacerEditModal.jsx` | Reset (Min Sprite Screen Size) | `handleMinSizeReset` (handler) | operator | Removes this type’s own size floor so it follows the floor set for every type again. | NEW |
| 4.44 | Racer types | `RacerEditModal.jsx` | Surface Classes (racer type) | `handleSurfaceClassToggle` (handler) | operator | Which ground effects this racer type can show. In a race it shows the classes it shares with the track. At least one is required. | REWRITTEN |
| 4.45 | Racer types | `RacerEditModal.jsx` | Reset to default (surface classes) | `handleSurfaceClassesReset` (handler) | operator | Puts this type’s surface classes back to the shipped selection. | NEW |
| 4.46 | Racer types | `RacerEditModal.jsx` | Density (cloud effect) | `spawnProbability` (configKey) | operator | For this racer type’s cloud effects only: how many puffs it gives off. Overrides the class’s own value. | REWRITTEN |
| 4.47 | Racer types | `RacerEditModal.jsx` | Cloud size (px) | `endSize` (configKey) | operator | For this racer type’s cloud effects only: how big the puffs grow. | REWRITTEN |
| 4.48 | Racer types | `RacerEditModal.jsx` | Lifetime (frames) (cloud effect) | `lifetimeFrames` (configKey) | operator | For this racer type’s cloud effects only: how long each puff stays visible. | REWRITTEN |
| 4.49 | Racer types | `RacerEditModal.jsx` | Reset to class defaults | `handleEffectReset` (handler) | operator | Removes this type’s cloud overrides so its clouds look like the surface class again. | REWRITTEN |
| 4.50 | Racer types | `RacerEditModal.jsx` | Reset all to defaults | `handleResetAll` (handler) | operator | Puts every setting of this racer type back to shipped. | REWRITTEN |
| 4.51 | Racer types | `RacerEditModal.jsx` | Done / Close (✕) | `onClose` (handler) | operator | Closes the tuning window. Changes are already saved as you make them. | NEW |
| 4.52 | Brands | `BrandingProfiles.jsx` | + New Profile | `setShowForm` (handler) | operator | Opens an empty form for a new branding profile. | NEW |
| 4.53 | Brands | `BrandingProfiles.jsx` | Preview / Hide Preview | `setPreview` (handler) | operator | Shows how this brand looks — headline, subtitle, sponsor line and logo — without starting a race. | NEW |
| 4.54 | Brands | `BrandingProfiles.jsx` | Edit (brand) | `handleEdit` (handler) | operator | Opens this brand in the form below. | NEW |
| 4.55 | Brands | `BrandingProfiles.jsx` | Set as default / Remove default (brand) — not in English today, see §8 | `handleSetDefault` (handler) | admin | Admin only. Marks this brand as one that comes with a fresh installation, or removes that mark. | NEW |
| 4.56 | Brands | `BrandingProfiles.jsx` | Export as seed (brand) — not in English today, see §8 | `handleExportSeed` (handler) | admin | Admin only. Downloads this brand as a seed file, the form used to ship it with the game. | NEW |
| 4.57 | Brands | `BrandingProfiles.jsx` | Delete (brand) | `handleDelete` (handler) | operator | Deletes this branding profile after you confirm. | NEW |
| 4.58 | Brands | `BrandingProfiles.jsx` | Profile Name | `name` (configKey) | operator | What this branding profile is called. Pick a name that helps you recognize it — for example the event name or sponsor. | KEPT |
| 4.59 | Brands | `BrandingProfiles.jsx` | Event Name (headline) | `eventName` (configKey) | operator | The headline of the event, shown on the opening brand card and the result screen. | NEW |
| 4.60 | Brands | `BrandingProfiles.jsx` | Subtitle | `subtitle` (configKey) | operator | A second line under the headline. | NEW |
| 4.61 | Brands | `BrandingProfiles.jsx` | Primary Color | `primaryColor` (configKey) | operator | The main accent color used in race UI elements like the timer and headers. Pick something that fits your event's look. | KEPT |
| 4.62 | Brands | `BrandingProfiles.jsx` | Secondary Color | `secondaryColor` (configKey) | operator | A supporting color used for backgrounds and secondary UI parts. Should contrast well with the primary color so text stays readable. | KEPT |
| 4.63 | Brands | `BrandingProfiles.jsx` | Sponsor Text | `sponsorText` (configKey) | operator | A short sponsor line shown in the race intro and on the result screen. Keep it short so it fits on one line. | REWRITTEN |
| 4.64 | Brands | `BrandingProfiles.jsx` | Upload Logo | `fileRef.current?.click` (handler) | operator | Picks a logo image to show during races. A small image with a transparent background works best. | REWRITTEN |
| 4.65 | Brands | `BrandingProfiles.jsx` | Remove logo (✕) | `handleRemoveLogo` (handler) | operator | Removes the logo from this brand. | NEW |
| 4.66 | Brands | `BrandingProfiles.jsx` | Logo Size | `logoMaxHeight` (configKey) | operator | How tall the logo is drawn during races. | NEW |
| 4.67 | Brands | `BrandingProfiles.jsx` | Logo Opacity | `logoOpacity` (configKey) | operator | How see-through the logo is, from invisible to solid. | NEW |
| 4.68 | Brands | `BrandingProfiles.jsx` | Create Profile / Save Changes | `handleSave` (handler) | operator | Stores the brand on the server. A headline and a name are required. | NEW |
| 4.69 | Brands | `BrandingProfiles.jsx` | Cancel (brand form) | `handleCancel` (handler) | operator | Closes the form without saving. | NEW |

### 5 · History and evaluation — 15 controls

| # | Sub-group | Today: file | Today: label | Id (kind) | Tier | Info text | Text |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5.1 | Race history | `RaceHistory.jsx` | Filter by Track | `setFilterTrack` (handler) | operator | Show only races on the selected track. Pick 'All tracks' to see every race regardless of track. | KEPT |
| 5.2 | Race history | `RaceHistory.jsx` | Filter by Date | `setFilterDate` (handler) | operator | Show only the races run on the chosen day. | REWRITTEN |
| 5.3 | Race history | `RaceHistory.jsx` | Clear Filters | `setFilterTrack+setFilterDate` (handler) | operator | Removes both filters so every race is listed again. | NEW |
| 5.4 | Race history | `RaceHistory.jsx` | Export CSV | `handleExportCSV` (handler) | operator | Downloads the races shown, with the filters applied, as a spreadsheet file. | NEW |
| 5.5 | Race history | `RaceHistory.jsx` | Clear History | `handleClear` (handler) | operator | Deletes the races kept on this device, after you confirm. Your team’s races stored on the server are not deleted. | NEW |
| 5.6 | Race history | `RaceHistory.jsx` | Run again | `run-again` (testId) | operator | Runs this race again exactly as it ran, whatever this machine is set to now. | KEPT |
| 5.7 | Race history | `RaceHistory.jsx` | Verify race | `verify-race` (testId) | admin | Races this race again on the server from its own record and compares every position and every finishing time. Takes a few seconds. | KEPT |
| 5.8 | Race history | `RaceHistory.jsx` | ← Newer | `history-prev` (testId) | operator | Shows the previous page of stored races, nearer to today. | NEW |
| 5.9 | Race history | `RaceHistory.jsx` | Older → | `history-next` (testId) | operator | Shows the next page of stored races, further back in time. | NEW |
| 5.10 | Period evaluation | `PeriodEvaluation.jsx` | From | `from` (configKey) | operator | The first day of the period, counted whole. Days are UTC days, so everyone gets the same table. | KEPT |
| 5.11 | Period evaluation | `PeriodEvaluation.jsx` | To | `to` (configKey) | operator | The last day of the period, counted whole, in UTC. A race finished on this day is included. Very long periods are refused. | REWRITTEN |
| 5.12 | Period evaluation | `PeriodEvaluation.jsx` | Evaluate this period | `period-evaluation-load` (testId) | operator | Builds the table for the chosen days: races, wins, second and third places and podiums per name. Quick Tests are left out and only racers who finished count. | NEW |
| 5.13 | Period evaluation | `PeriodEvaluation.jsx` | Award points | `setDraftOn` (handler) | operator | On: the table adds a Points column from the ladder beside it and is ordered by points. Off: races, wins and podiums only. The rule is the same for everyone on this server; only an admin can change it. | REWRITTEN |
| 5.14 | Period evaluation | `PeriodEvaluation.jsx` | Points per place | `setLadderText` (handler) | operator | The points for each place, first place first, separated by commas. A place beyond the list scores nothing. Only an admin can change it. | REWRITTEN |
| 5.15 | Period evaluation | `PeriodEvaluation.jsx` | Save points rule | `points-rule-save` (testId) | admin | Admin only. Stores the points switch and ladder on the server for everyone. | NEW |

### 6 · Diagnostics and verification — 18 controls

| # | Sub-group | Today: file | Today: label | Id (kind) | Tier | Info text | Text |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6.0 | Test aids | `TestAidsSection.jsx` | Test aids for the whole installation | `test-aids-switch` (testId) | advanced | One switch for the whole installation, stored on the server. Off, as it ships: the build and settings badges, the race-plan pill, the hero rings, the camera marker, Quick Test, every diagnostic display and log below, the constant-speed address flag, the distribution page and the console probes are hidden or ignored for everyone, whatever a browser has stored. On: they all behave as they did before the switch existed. Admins only. | NEW |
| 6.1 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Highlight heroes | `highlightHeroes` (configKey) | advanced | Draws a ring around the racers the race plan has cast as heroes — green for an ordinary hero, red for an attacker — so you can follow them in an eye test. It does not change the race. | REWRITTEN |
| 6.2 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show camera state HUD | `showCameraStateHud` (configKey) | advanced | Shows the camera state indicator (OVERVIEW / BATTLE / etc.) in the top-left of the race canvas. | KEPT |
| 6.3 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show camera diagnostics | `showCameraDiagnostics` (configKey) | advanced | Diagnostics panel bottom-left: live zoom values. Logs state transitions to the browser console. | KEPT |
| 6.4 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show Race Plan diagnostics | `showRpDiag` (configKey) | advanced | Race plan diagnostics panel top-right: phase, re-roll status, spreadFactor. Only when Race Plan is active. | KEPT |
| 6.5 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show B1 Winner List | `showRpWinnerList` (configKey) | advanced | Lists the race plan’s favourites with their current place and how far they are from their planned place. | REWRITTEN |
| 6.6 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show Minimap Badges | `showRpMinimapBadges` (configKey) | advanced | Marks the race plan’s favourites in the minimap with a gold ring. | REWRITTEN |
| 6.7 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show Start-Row in Name Tags | `showRpStartRow` (configKey) | advanced | Adds each racer’s starting row to its name tag. | REWRITTEN |
| 6.8 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show Top-10 Speed Monitor | `showTop10SpeedMonitor` (configKey) | advanced | Shows the race plan’s speed corrections for the leading racers, with a warning when one oscillates. | REWRITTEN |
| 6.9 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show BATTLE diagnostics | `showBattleDiag` (configKey) | advanced | BATTLE status, involved racers, and pulk validity live in the canvas. | KEPT |
| 6.10 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show LEAD_CHANGE diagnostics | `showLeadChangeDiag` (configKey) | advanced | Current and previous leader, pending status, minGap and debounce. | KEPT |
| 6.11 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show COMEBACK diagnostics | `showComebackDiag` (configKey) | advanced | Shows the comeback detector live: whether the outcome phase has begun, which favourites are gaining places, and which racer the camera has locked onto. | REWRITTEN |
| 6.12 | On-screen diagnostics | `CameraAdvancedSection.jsx` | Show GOVERNOR diagnostics | `showGovernorDiag` (configKey) | advanced | Shows, top centre, the field governor before the outcome phase: its phase fade, its strength, and the gap and cohesion between leader and stragglers. | REWRITTEN |
| 6.13 | Logs | `CameraAdvancedSection.jsx` | Enable frame log | `enableFrameLog` (configKey) | advanced | Enables the per-frame camera ring buffer. An export button appears on the race screen. | KEPT |
| 6.14 | Logs | `CameraAdvancedSection.jsx` | Enable detour frame log (CAMERA-DETOUR-1) | `cameraDetourLog` (configKey) | advanced | Logs the frames around each change of view to the browser console, to diagnose a camera move in the wrong direction. It changes nothing on screen. Run a race, then copy the console lines. | REWRITTEN |
| 6.15 | Logs | `CameraAdvancedSection.jsx` | Enable perf log | `enablePerfLog` (configKey) | advanced | Measures how long each frame spends on physics, camera and drawing, and shows the live figures and the worst spikes on screen. Takes effect on the next race. | REWRITTEN |
| 6.16 | Race configuration export | `ConfigExportSection.jsx` | Export race config | `export-race-config` (testId) | advanced | Downloads world.json — the exact configuration the game reads when a race starts — so a simulator run can be checked against it, and copies it to the clipboard where it can. The hash beside it names that configuration. | REWRITTEN |
| 6.17 | Race configuration export | `ConfigExportSection.jsx` | ↻ refresh | `refresh` (handler) | advanced | Recomputes the configuration hash and the list of changed settings after you have changed something. | REWRITTEN |

### 7 · Accounts and system — 22 rows, and the sidebar's 3

Rows 7.1–7.3 are placed in **Sidebar (all chapters)** (the owner's decision of 2026-10-05); their
numbers are kept so earlier references still find them.

| # | Sub-group | Today: file | Today: label | Id (kind) | Tier | Info text | Text |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7.1 | Sidebar (all chapters) | `DevScreen.jsx` | View: All / Operator | `handleViewChange` (handler) | admin | Admin only. Operator shows only what is used on an event day; All adds every advanced setting. Your choice is remembered on this device. | REWRITTEN |
| 7.2 | Sidebar (all chapters) | `DevScreen.jsx` | ← Back to Setup | `navigate('/setup')` (handler) | operator | Leaves the Dev Screen and returns to Race Setup. Settings are already saved. | NEW |
| 7.3 | Sidebar (all chapters) | `DevScreen.jsx` | Log out | `logout` (handler) | operator | Signs you out of this browser. | NEW |
| 7.0 | Installation status | `AdminStatusSection.jsx` | Installation status (read-only) | `admin-status-box` (testId) | advanced | Read-only, admins only; nothing here changes anything. Build: the commit and branch this server was built from, the same answer its health check gives, or unknown with the reason. Newest backup: when the newest backup in the backup directory was taken, or “not visible from the app” when this server cannot see where backups are kept. Status: the checks of npm run status that the server can run on itself — free disk space, a writable data folder and, when backups are visible, the newest backup’s age and checksum; OK only when every one of them passed. Newer release: whether GitHub has a release newer than this build, asked by the server at most once a day; “unknown” when it could not be asked, and no comparison when this build’s version is not known. | NEW |
| 7.4 | Your password | `ChangePasswordSection.jsx` | Current password | `setCurrentPassword` (handler) | operator | Your existing password. Verified by the server; a wrong value returns the same error the login screen uses. | KEPT |
| 7.5 | Your password | `ChangePasswordSection.jsx` | New password | `setNewPassword` (handler) | operator | The password you want. The rule the server applies is the same one that governs new accounts; no extra rule is invented here. | KEPT |
| 7.6 | Your password | `ChangePasswordSection.jsx` | Repeat new password | `setConfirmPassword` (handler) | operator | Typo guard, checked in the browser only. The server has no concept of a confirmation; if these two do not match, the form refuses to submit. | KEPT |
| 7.7 | Your password | `ChangePasswordSection.jsx` | Change password | `handleSubmit` (handler) | operator | Changes the password of the account you are signed in as. Your other sessions are signed out. | NEW |
| 7.8 | Race directors | `UserManagementSection.jsx` | Refresh (user list) | `loadUsers` (handler) | advanced | Reloads the list of race directors from the server. | NEW |
| 7.9 | Race directors | `UserManagementSection.jsx` | Team (per user) | `handleTeamChange` (handler) | advanced | Moves this race director to another existing team. Their races are listed under the new team from then on. | NEW |
| 7.10 | Race directors | `UserManagementSection.jsx` | Role (per user) | `handleRoleChange` (handler) | advanced | Makes this race director an operator or an admin. Admins also see the advanced settings and admin-only actions. | NEW |
| 7.11 | Race directors | `UserManagementSection.jsx` | Reset Password (per user) | `openResetForm` (handler) | advanced | Opens a field to give this race director a new password. | NEW |
| 7.12 | Race directors | `UserManagementSection.jsx` | Delete (per user) | `handleDelete` (handler) | advanced | Deletes this race director’s account after you confirm. | NEW |
| 7.13 | Race directors | `UserManagementSection.jsx` | New password (per user reset) | `setResetPassword` (handler) | advanced | The new password for this race director, under the same rule as every account. | NEW |
| 7.14 | Race directors | `UserManagementSection.jsx` | Confirm (password reset) | `handlePasswordReset` (handler) | advanced | Sets the new password for this race director. | NEW |
| 7.15 | Race directors | `UserManagementSection.jsx` | Username | `setNewUsername` (handler) | advanced | The name the new user signs in with. Server-enforced uniqueness — a duplicate is refused. | KEPT |
| 7.16 | Race directors | `UserManagementSection.jsx` | Password | `setNewPassword` (handler) | advanced | Initial password for the new account. Same rule the server applies everywhere; the user can change it themselves later from this same screen. | KEPT |
| 7.17 | Race directors | `UserManagementSection.jsx` | Role | `setNewRole` (handler) | advanced | Operator sees the everyday Dev Screen; admin also sees the advanced settings, user management and every other admin-only action. | REWRITTEN |
| 7.18 | Race directors | `UserManagementSection.jsx` | Team | `setNewTeam` (handler) | advanced | The team the new account joins. The picker only lists teams that already exist — pick 'New team…' to found one, which is the only way to type a name. Guards against a typo silently splitting a team in two. | KEPT |
| 7.19 | Race directors | `UserManagementSection.jsx` | New team name | `setNewTeamName` (handler) | advanced | The name of the team you are founding. Only shown when you picked 'New team…'; the server tags this create request as an explicit new-team act so a typo cannot slip past. | KEPT |
| 7.20 | Race directors | `UserManagementSection.jsx` | Add User | `handleCreate` (handler) | advanced | Creates the account on the server. | NEW |
| 7.21 | Backup and reset | `SystemSettings.jsx` | ⬇ Export Settings JSON | `handleExport` (handler) | advanced | Downloads every setting this browser stores — tuning, camera, history and local overrides — as one file you can import later. | REWRITTEN |
| 7.22 | Backup and reset | `SystemSettings.jsx` | ⬆ Import Settings JSON | `importRef.current?.click` (handler) | advanced | Restores settings from an exported file. Settings the file does not contain are left as they are. | REWRITTEN |
| 7.23 | Backup and reset | `SystemSettings.jsx` | 🔬 Export Diagnostic Snapshot | `handleDiagnosticExport` (handler) | advanced | Downloads the browser’s complete stored state, to attach to a bug report so the problem can be reproduced elsewhere. | REWRITTEN |
| 7.24 | Backup and reset | `SystemSettings.jsx` | Reset All Settings to Defaults | `handleReset` (handler) | advanced | Wipes every setting this browser stores and starts again from shipped values. Tracks, brands and player groups live on the server and are not deleted; only local overrides of them are cleared. | REWRITTEN |

---

## 6 · What stays exactly as it is

Plan D moves controls between headings and replaces their explanations. **It changes nothing a
control stores or does.** For the build, held to as a contract:

- **Every stored key stays as it is**, in the store it is in today: `raceDefaults`,
  `raceDynamicsConfig`, `raceBehaviorConfig`, `rowLayoutConfig`, `baseSpeedConfig`,
  `autoScaleConfig`, `cameraConfig` (with `cameraStateProfiles`), `frameTimingConfig`, the racer-type
  overrides, and the server's tracks, brands, groups, surface classes, users and points rule. No key
  is renamed — `minTargetScreenPx` included — and no key moves between stores. A control moving to
  another chapter keeps the setter it has today.
- **Every default stays as it is.** `client/src/modules/storage/defaults.js` and the other default
  homes are not touched; no info text states a default, so none can go stale.
- **Every behaviour stays as it is**: input ranges, clamps, the reject-and-notice behaviour of
  Auto-Scale, every reset's scope (including Reset Defaults reaching the two race defaults that now
  sit in other chapters, and Reset All Defaults covering exactly the race blocks), confirmation
  dialogs, which controls appear only for some entries, and every `data-testid` the tests use.
  **No fingerprint moves**: the camera, render and world fingerprints are built from shipped defaults,
  and a layout change touches none.
- **Tiers stay exactly as they are**, control by control, as the table's Tier column records and the
  self-check below verifies against the registry: the 90 `operator` controls stay visible to every
  signed-in director; the 249 `advanced` controls stay visible only to an admin in the All view; the
  9 `admin` controls stay gated on the signed-in user's role (the six set/remove-default and
  export-seed buttons, Verify race, Save points rule, the View switch). Award points and Points per
  place stay visible to operators and editable only by an admin, as today.
- **The operator view still shows only operator-tier controls.** A chapter with no operator control
  (Diagnostics and verification) does not appear in the operator view at all; a chapter with some
  shows only those. Today's default-deny stays: anything not explicitly `operator` is admin-only.
- **The two editors, the result screen, Race Setup and the race itself are untouched.**

---

## 7 · Self-checks, each with its result

All four were run on the design as committed; the numbers are what `count-controls.mjs` and a
check of `design.json` against it returned.

**(1) Every control placed exactly once — PASS.** The table has **348** rows; the script's mechanical
count is **348**. Every `(file, id)` pair the script returns appears in `design.json` exactly once,
and every row in `design.json` matches one the script returns — checked in both directions, with
`idKind` taken from the script. **No `(file, id)` pair appears twice.** Bare id names do repeat
**across** files — 15 of them, all different stores or different handlers that share a name:
`handleReset` (Race Defaults, Race Tuning, Auto-Scale, System), `handleDelete` (six sections),
`handleSave`, `handleCancel` (four each), `setShowForm`, `handleEdit`, `handleSetDefault`,
`handleExportSeed`, `name` (three each), and `enabled` (racer behaviour, auto-scale), `color`
(tracks, surface classes), `endSize`, `lifetimeFrames`, `spawnProbability` (surface classes, the
racer type's cloud overrides), `setNewPassword` (your password, a new user's). That is why the
identity is the pair, not the bare name — the same reason the `minTargetScreenPx` collision exists
(its two controls carry the ids `minTargetScreenPx` and `handleMinSizeChange`).

**(2) No chapter over about forty controls without sub-groups — PASS.** Three chapters are larger
than forty — The race (101), Camera (84), Tracks, racers, brands and groups (69) — and all three are
split into sub-groups. The largest sub-group anywhere is *Racers among each other* (26); the next
are *Ground effects* and *Racer types* (22 each). Every other chapter is forty or fewer and is
sub-grouped anyway.

**(3) No cosmetic control in a race chapter, and no race control outside it — PASS.** The rule
applied is the project's own line, the one the inventory uses: a control is **race** if it writes
(or resets) a key in a block of `RACE_RELEVANT_CONFIG_KEYS` (`raceDynamicsConfig`,
`raceBehaviorConfig`, `rowLayoutConfig`, `baseSpeedConfig`, `autoScaleConfig`, plus the Race Tuning
master reset over them), and **cosmetic** if it writes a key in `COSMETIC_CONFIG_KEYS`
(`cameraConfig`, `frameTimingConfig`). Result: all **93** race-line controls sit in chapter 1; all
**113** cosmetic-line controls sit in chapters 2, 3 and 6; none crosses. The other **142** are on
neither line. Chapter 1's eight controls outside the race blocks are Race Defaults' six (the Race
Action stage travels with every race and is one of its identifier inputs, which is why it opens the
chapter) and the two Formula Preview inputs, which store nothing. Three edges, stated rather than
hidden:
- `gapRerollDevMarker` only draws a ring, but it is stored in `raceDynamicsConfig`, so by the rule it
  is race and stays beside its mechanism; its info text says it does not change the race.
- The two slow-motion factors (`battleSlowmoFactor`, `photoFinishSlowmoFactor`) are camera config,
  so cosmetic by the rule; the race screen applies them to playback, and the outcome does not change.
- The racer-type values (`speedMultiplier`, `displaySize`, and the rest of the editor) are per-type
  records outside both lists; they stay in chapter 4 with the type they belong to.

**(4) The tooltip-values rule — PASS.** `scripts/check-tooltip-values.mjs` reads source files, which
this design does not change (on this tree it reports 0 current claims). The info texts were checked
directly instead: **0 of 348 contain a digit**, and none contains "by default", "default is",
"defaults to" or a "shipped" followed by a number. The word "default" appears in two texts, neither
stating a value: Default Race Duration ("the track's own default" — kept verbatim) and Reset
Defaults ("back to the shipped values"). Where a text needs the live value, the control's own
read-out already shows it.

**Info texts, by status:** **104 NEW** (no explanation today), **194 REWRITTEN**, **50 KEPT**. KEPT
means the existing text is reused verbatim — checked character for character against the source
file; it was chosen only where the existing text is plain, accurate and carries no number. A text
was REWRITTEN wherever the existing one stated a value or a default, described a mechanism instead
of what you see, pointed at a place that moves under Plan D, or was out of date.

---

## 8 · Found while writing — recorded, not acted on

Nothing below was changed; each is a wording or count matter the build will meet.

- **Three admin buttons are not in English** (`client/src/screens/DevScreen/components/DefaultControls.jsx:89`,
  `:98`, `:107` — the remove-default, set-default and export-seed labels, rendered in Groups, Tracks
  and Brands). The language rule says no German in the codebase; the design gives the English
  labels *Remove default*, *Set as default*, *Export as seed*. The component's test
  (`DefaultControls.test.jsx`) asserts the current labels and moves with them.
- **The Gap Leader Brake card's subtitle says the brake ships off**
  (`client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx:842`), while the shipped default
  is on and the master switch's own tooltip says so. Under Plan D the subtitle becomes the sub-group
  heading's text; the design's info texts state no shipped state at all.
- **The System card's description says a reset restores the built-in tracks and racers**
  (`client/src/screens/DevScreen/sections/SystemSettings.jsx:154`), while its tooltip says tracks,
  brands and groups live on the server and are not re-seeded. The design's text for the reset
  follows the tooltip.
- **Sound effects is reserved**, stored and read by nothing (recorded in the inventory). Its old text
  promised sounds; the new one says plainly that it has no effect yet.
- **The tooltip guard's narrow shapes miss many stated values.** Existing texts such as "40 is a safe
  ceiling", "3 shows a classic podium", "Range 0.3 (Snail) to 1.25 (Rocket)" and most of the "N =
  shipped" phrasing in Race Tuning pass `check-tooltip-values` because the number is not next to the
  word "default". All of them are REWRITTEN here; a guard on the rebuilt screen could simply refuse
  any digit in an info text, which is the rule this design held itself to.
- **The inventory undercounts in two places**: Dynamics (its count line says 35 while its tables
  name 46 keys, and the three chase controls are not in it) and Camera Advanced (no zoom-profile
  field and no diagnostics switch is counted). Recorded here so the inventory's 205 is read as a
  count of the values it listed, not of the screen.
- **The operator view of chapters 2 and 3 holds one control each** ("Go to the results on its own"
  in Camera → Ending; "Sound effects" in Look → Sound). That is the price of placing each with what
  it belongs to; the alternative — leaving both among the race defaults — is listed below.

---

## 9 · Choices this design made that are open to revision

Each is a placement call, reversible in the table without touching any other row:

1. **"Go to the results on its own" sits with the ending** (Camera → Ending), not with the race
   defaults. Its text points at the ending lengths, and they are now one sub-group.
2. **"Sound effects" sits under Look → Sound**, not with the race defaults.
3. **Auto-Scale sits in The race → Start**, because its block moves the starting grid and the race
   reset covers it, although it reads as a picture setting.
4. **Frame Timing sits in Look → Smoothness**, out of the race card, because it is cosmetic and the
   race reset deliberately leaves it alone.
5. **Surface Classes sit in Look**, not with Tracks, because they define how effects look and both
   tracks and racer types draw from them.
6. **The Run-out Zone stays with the start spread** under The race → Start, because the two share
   one reset; moving it to a finish sub-group would split that reset.
7. **The chapter order** follows the examples given with the decision: race, camera, look, the things
   a race is made of, then history, diagnostics, accounts.

---

## Build, 2026-10-05

**Built on `feat/devscreen-chapters`, one commit per chapter** (plus a navigation skeleton first and
the two tests last). The design above is unchanged; this section records how it was built.

### What was built

- **Navigation by chapter.** `client/src/screens/DevScreen/devScreenChapters.js` is the new
  registry: seven chapters, each with its intro (§2, verbatim) and its sub-groups in the design's
  order (§3), each sub-group the section PARTS placed in it. `DevScreen.jsx` lists the chapters in
  the sidebar and renders the active one: heading, intro, then each sub-group as an `h2` with its
  parts. Tiers are per part and unchanged per control: the operator view keeps only `operator`
  parts and drops a sub-group or chapter left empty (Diagnostics disappears from it); non-admins
  always get the operator view; `isOperatorTier` and the persisted view switch are kept.
- **Parts, not rewrites.** Sections the design splits take a `part` prop and render only the named
  blocks, with their own state, handlers, keys and storage: `RaceDefaults` (race setup /
  auto-advance / sound), `RaceTuningSection` (`reset`), `DynamicsTuningSection` (pace, start,
  speed changes, race plan, PULK, gap brake, frame timing), `BehaviorTuningSection` (interaction,
  start layout), `CameraAdvancedSection` (the ten camera sub-groups plus drawing floor, track
  labels, overlay texts, on-screen diagnostics, logs). Without `part` a section renders everything,
  so its own tests are unchanged. The editor links, the view switch, Back to Setup and Log out are
  parts `DevScreen.jsx` renders itself.
- **Every control carries `data-control-id="<file>:<id>"`** exactly as `design.json` names it, on
  the control or its row, and **its design info text** through `InfoTooltip`. The texts have ONE
  home, `sections/controlInfo.js` (copied from `design.json`, text for text); `sections/ControlInfo.jsx`
  holds the two small helpers (`Info`, `Ctl`). `DefaultControls` takes a `controlSection` prop, so
  its two buttons carry each section's own id and text.
- **Wording only where the design gives it:** the size-floor pair ("Size floor — every racer type"
  / "Size floor — this racer type only", visible label and `aria-label`) and the three admin
  buttons ("Set as default", "Remove default", "Export as seed"). Every other label is today's.
- **Order inside sub-groups as the positions say**, which moved a few controls inside their
  section: the Race Defaults reset below the values; the Race Behavior master switch first; in the
  camera, Push Easing after the push travel and the Start Window after the beats, the endgame
  threshold before the run-in switches, the comeback controls and the diagnostics switches in the
  design's sequence; Auto-Scale's Max Scale before the size floor; Edit before the default buttons
  in a track row. Surface-class generator fields show in one shared field order (the design's) for
  every generator.

### One piece of wiring the split needs: `sections/useSyncedConfig.js`

A part holds its WHOLE config block, and the chapters mount several parts of one block at once
(six race-dynamics parts in The race, three camera parts in Look). Two copies with their own state
would overwrite each other's edits — measured: with the sync removed, an edit in Sprite Size was
lost to the next edit in Name Tags. The hook keeps every copy in step: a write goes through the
block's own saver (`storageSet` announces the key), every other copy re-reads it through the block's
own loader and does not write it back. Loaders, savers, keys and the save on mount are the
sections' own, unchanged. With it, the Race Tuning master reset writes the five race blocks to
storage directly (`resetRaceRelevantToDefault` in `raceRelevantReset.js`, same blocks, same values)
instead of reaching into two child sections through refs — the parts are no longer its children.
Removed with that: the `forwardRef` / `useImperativeHandle` / `resetAll` of the two tuning sections
and `resetAutoScaleToDefault`.

### The guard test — `client/src/screens/DevScreen/devScreenChapters.guard.test.jsx`

Renders the real Dev Screen as an admin in the All view, every section real, with the
server-backed lists mocked to one entry of each kind and shaped so every conditional control
appears (a closed and an open track, a custom racer type, stored overrides that show every Reset of
the racer editor, a modified and a custom surface class, a stored race with a short key, and so
on). It walks all seven chapters and opens every form, modal and editor by clicking (Edit on each
list, the class list and every generator, Reset Password, "New team…"); each state is a snapshot.
For every control it checks: listed in the design (EXTRA), in the design chapter and sub-group
(WRONG PLACE), in one part only (DUPLICATE — a per-entry control repeated down one list is one
control), carrying the design info text character for character, and in the design's position
order within the snapshot; after the walk every design row must have been seen (MISSING). **All
rows are checked by render; none by a source scan.** Rendered per chapter, as designed: 101 · 84 ·
38 · 69 · 15 · 17 · 24.

**Sabotaged twice, both red, both restored:** moving the overlay-texts part onto the logs (WRONG
PLACE, DUPLICATE and MISSING went red), and renaming one control id (EXTRA and MISSING went red).

### The saved-settings fixture — `devScreenChapters.savedSettings.test.jsx`

A realistic saved configuration is written under the existing keys by the app's own savers (race
defaults, base speed, row layout, race dynamics, racer behaviour, frame timing, auto-scale, camera
with a per-state profile override, sprite size and name tag inside it). The screen is rendered as
an admin and every chapter walked. It asserts the controls show the saved values, that every stored
JSON string is byte-identical afterwards, and that two parts of one block keep each other's edits.
**Sabotaged:** a camera part initialised from the defaults instead of its loader — the values test
and the byte test both went red (the camera store came back as an empty object); with the sync
listener removed, the third test went red.

### Lines before → after (touched source files)

`DevScreen.jsx` 319 → 184 · `DevScreen.module.css` 618 → 588 · `CameraAdvancedSection.jsx`
2127 → 2123 · `DynamicsTuningSection.jsx` 1730 → 1851 · `BehaviorTuningSection.jsx` 729 → 790 ·
`RaceDefaults.jsx` 254 → 283 · `RaceTuningSection.jsx` 61 → 61 · `AutoScaleSection.jsx` 235 → 268 ·
`SpriteSizeRangeSection.jsx` 97 → 99 · `NameTagVisibilitySection.jsx` 150 → 148 ·
`SurfaceClassManager.jsx` 529 → 578 · `PlayerGroupsManager.jsx` 337 → 349 · `TrackManager.jsx`
650 → 707 · `RacerManager.jsx` 238 → 247 · `RacerEditModal.jsx` 671 → 678 · `BrandingProfiles.jsx`
561 → 589 · `RaceHistory.jsx` 566 → 588 · `PeriodEvaluation.jsx` 362 → 379 ·
`ConfigExportSection.jsx` 127 → 127 · `SystemSettings.jsx` 196 → 196 · `ChangePasswordSection.jsx`
137 → 144 · `UserManagementSection.jsx` 472 → 487 · `SubCard.jsx` 103 → 115 · `DefaultControls.jsx`
112 → 122 · `raceRelevantReset.js` 41 → 50. New: `devScreenChapters.js` 250,
`sections/controlInfo.js` 657, `sections/ControlInfo.jsx` 33, `sections/useSyncedConfig.js` 58.

**Removed:** the 16-entry `SECTIONS` registry and the sidebar's buttons, tier divider and back
button (and their CSS); the camera section's numbered card headings (`SectionHeading`), replaced by
the sub-group headings; every inline tooltip text the design rewrote (the `tip` / `tooltip` fields
of the mapped field lists included); the tooltips the design's control texts replace (Race Tuning's
card tooltip and button title, System's three card tooltips, the surface-class list header's) and
the `title` attributes of buttons that now carry an info icon saying the same.

### Deviations from the design, each with its reason

1. **An "Advanced" tag on every admin-only part in the All view.** The old sidebar showed an admin
   which sections the operator view leaves out (its tier divider); chapters mix tiers, so the tag
   carries that per part. Not in the design.
2. **The racer editor's Done / Close (✕) is one control; its id and text sit on Done.** The header
   ✕ comes first in the DOM, before the fields, and would break the design's order; it stays an
   unmarked second way to the same action.
3. **Labels the design's "today" column prints differently are kept as rendered today** (for
   example "Chase: racers accelerated past 0.6", "B2-attacker count (0–5)", "Company: min racers in
   frame"); that column is today's label with context added, not new wording.
4. **Tests changed only in locators**, with three places where the locator is a text the design
   replaced: two tooltip-substring matches (Player Names, Filter by Date) match the new wording; the
   racer editor's tooltip count is scoped to the modal body (the footer's two buttons have their own
   icon now). In the tier-toggle test the two ORDER tests read the chapter order (the design puts
   the camera before the look, so "sprite size before camera" cannot hold), and "switch to Operator
   while on an advanced section" narrows the view by role, because the view switch itself now sits
   in an operator chapter. `DefaultControls.test.jsx` moved with the labels, as §8 says. Ten browser
   specs changed their chapter and heading locators only (not run here).

### Noticed and left

- Auto-Scale's size-floor info text (copied verbatim) names the editor control "Min Sprite Screen
  Size", the label the design itself renames to "Size floor — this racer type only".
- The Gap Leader Brake card subtitle still says it ships off; the System card text still says a
  reset restores built-in tracks and racers (both §8, recorded, not acted on).
- `count-controls.mjs` now prints 337, not 348: it reads source shapes, and three changed — the
  diagnostics switches moved into two named lists (−13), the shared Reset template in `SubCard.jsx`
  (+1), the view switch's buttons now call a prop (+1). The rendering guard is the count of record.
- The sections still save once on mount, as before; for a config in the app's own form that write is
  byte-identical, and a transient rewrite would be undone by the loaders' prune — the fixture checks
  the end state.

**Coordinator's follow-up, 2026-10-05.** The Auto-Scale size floor's info text named the editor
control by its old label; it now says "Size floor — this racer type only", the design's own wording,
in `controlInfo.js`, `design.json` and the table above. `count-controls.mjs` prints 337 on the built
tree because the source patterns it reads moved with the build; it counted the design's starting
point (348). **The guard test, `devScreenChapters.guard.test.jsx`, is now the count of record** — it
reaches all 348 controls by rendering.

---

## The sidebar frame — 2026-10-05

**What moved.** The owner decided on 2026-10-05 that "← Back to Setup", "Log out" and the admin-only
"View: All / Operator" switch leave chapter 7 for the fixed sidebar, so they can be reached from
every chapter; the rest of the Plan D screen is accepted as built. The view switch sits directly
under the "Dev Panel / Configuration" header, admins only, as on master before Plan D; Back to Setup
and Log out first sat at the foot of the sidebar for every signed-in user (see the next section for
where they sit now). Ids, handlers and info texts are unchanged; the styles are master's own
`.tierToggle` and `.backBtn`, restored verbatim. Chapter 7's
first sub-group is left with the password form and is now "Your password"; the chapter intro no
longer mentions the moved controls. Counts: chapter 7 has 21 controls (4 in the operator view), the
sidebar 3 (2, +1 for an admin); the total stays 348 and the operator view 90 (+9 for an admin).

**The guard.** `devScreenChapters.guard.test.jsx` reads the sidebar as a placement of its own in
every chapter state, so its three controls are checked exactly like the content's: placed once, in
the design's place, with the design's info text. Moving Log out back into chapter 7 turns it red
(WRONG PLACE, and the sidebar's own test).

**The 348 / 337 mismatch — the script was wrong, not the table.** `count-controls.mjs` printed 337
on the built tree while the rendering guard reached 348. Compared control by control with
`design.json`, the difference is exactly three defects in the script's reading of source shapes that
the build changed, not three changed controls:

| | effect | cause | fix in the script |
| --- | ---: | --- | --- |
| the on-screen diagnostics and log switches | −14 | the build renders them through one local function mapped over two named lists (`ON_SCREEN_DIAGNOSTICS.map(renderDiagToggle)`, `LOG_TOGGLES.map(renderDiagToggle)`); the script looks for the array at the nearest `.map(` before a control, and the template sits above both calls, so it saw one control, `set` | rule 4 also expands the template of a local render function into the keys of every named list mapped over it |
| `SubCard.jsx`'s shared Reset | +1 | the Reset template moved into a helper, `ResetButton`, which the script did not know as a template | `ResetButton` joins the template list; the Reset is counted where `onReset` is given, as before |
| the chapter navigation button | +1 | the script skipped `setActiveId(section.id)`, the old sidebar; the chapter buttons call `setActiveId(chapter.id)` | the skip reads the chapter button |

The design-time note above ("now prints 337 ... the view switch's buttons now call a prop (+1)")
named the third cause wrongly and the first as −13; the table here is the comparison's result. The
script now prints **348**, and its controls are the 348 rows of `design.json`, one for one. No control
changed.

## The sidebar buttons — 2026-10-05

**The owner decided on 2026-10-05** that "← Back to Setup" and "Log out" sit directly under the list
of chapters in the sidebar, not at its foot: the foot was too far down while a long chapter is open.
They now follow the last chapter entry, for every signed-in user; the view switch stays under the
header. What pushed them down is gone — the auto top margin on the first of them, and `.backBtn`'s
own `margin-top: auto`, which only ever acted when the button was a direct child of the sidebar.
Ids, handlers, info texts and the rest of `.backBtn` are unchanged. The chapter guard already reads
the sidebar in document order (view switch, Back to Setup, Log out) and is unchanged.

---

## TEST-AIDS-1 — control 349, the test-aids switch (2026-10-06)

The owner decided on 2026-10-04 that the developer displays and aids hang on ONE installation-wide
switch, set by admins and shipped OFF; it was built on 2026-10-06 on branch `feat/test-aids-switch`.
Its control is the first of *Diagnostics and verification*, in a sub-group of its own, *Test aids*
(row 6.0 above, position 0 so the chapter's other rows keep their numbers). Chapter 6 has 18 controls,
the screen 349; the operator view is unchanged (90, +9 for an admin), because the chapter is
admin-only. `count-controls.mjs` counts it by its literal test id and prints 349; the chapter guard
holds the 349 rows. While the switch is OFF the diagnostic and log switches of this chapter, and the
re-roll marker in *The race*, are locked with one line saying why — placement and info texts unchanged.

---

## Two winners settings removed — 2026-10-06 (REMOVE-WINNERS-SETTING-1)

The owner decided on 2026-10-06 that the number-of-winners setting is removed: the podium has three
places everywhere (`PODIUM_PLACES`, `shared/podium.mjs`). Two controls went, and their rows are gone
from the tables above (their numbers are not reused):

- **1.3** *Default Number of Winners (Podium Spots)* — `RaceDefaults.jsx`, `winners`. Its info text said
  the result screen celebrates that many winners; the result screen's podium was always three places
  and never read it.
- **4.23** *Default Winners* — `TrackManager.jsx`, `defaultWinners`, the same setting per track. Read by
  nothing at all; tracks that stored a value keep it, unread.

The setup screen's per-race stepper and the "Top N" in the start line went with them; they were never
Dev Screen controls. Counts: **The race 100** (operator view 5), **Tracks, racers, brands and groups
68** (62, +6 for an admin), the screen **346** (88, +9 for an admin). `count-controls.mjs` prints 346
and the chapter guard holds the 346 rows.

**Where the two meet** (`review/2026-10-06`): the switch's +1 and these −2 — **347 controls**, operator view 88 (+9 for an admin); `count-controls.mjs` prints 347 and the chapter guard holds the 347 rows.

---

## AUDIT-1 D2 — row 348, the admin status box (2026-10-09)

The owner asked for an admin-only, read-only box at the top of *Accounts and system* showing the
build identity, the newest backup time (or "not visible from the app"), the overall status by the
existing status logic, and whether a newer release tag exists on GitHub, checked by the server at
most once a day and "unknown" on any failure. Built on branch `feat/admin-status-box`.

**It is a row, not a control.** Nothing on it can be pressed or changed — it is a box of four lines
from `GET /api/admin/status`. It is in `design.json` (row 7.0 above, position 0 so the chapter's
other rows keep their numbers; sub-group *Installation status*, its own, first) because the owner
asked for it to carry an info text and to be held by the chapter guard like every control, and the
guard holds exactly the rows of the table. So the table and the guard hold **348 rows**, while
`count-controls.mjs` — which counts things a person can change or trigger — still prints **347**.
The difference is this one box, and it is deliberate.

**Visibility.** Advanced tier, so only the All view (admins) shows it; the component also renders
nothing for a non-admin, and the server refuses anyone but an admin (`ROUTE_POLICY`, the whole
`/api/admin` namespace). The operator view is unchanged: 88 (+9 for an admin). The chapter's intro
gained one clause naming the status.

**Where its facts come from.** The build: `server/src/buildIdentity.js`, the same answer as
`/api/health`. The backup and the status: `shared/statusChecks.mjs`, the checks `npm run status`
runs (extracted from `scripts/status.mjs` so both import them), without the API check. The release:
`server/src/releaseCheck.js`, only `v<major>.<minor>[.<patch>]` tags are releases.
