# DEVSCREEN-GROUPINGS-1 — three ways to lay out 205 controls, for the owner to choose from

**Written for the owner. Nothing in this report was built and nothing was moved. It is what you
are looking at to decide how to organise your dev screen — three candidate groupings side by
side.**

You have 205 controls on the dev screen today. Three of them do the work of most of the picture,
and five of them hold one control or none. One card is nearly a third of the whole screen. That
shape is not the fault of any one row — it is what happens when a screen grows organically over
sixteen sections. What this report offers is three ways to re-arrange the whole thing, from
cheapest to most ambitious, so you can weigh what each fixes against what each costs.

**The stock-take numbers this report weighs candidates against.** All measured on 2026-09-26.

- 205 controls across 16 sections
- Camera Advanced alone holds 77 controls; three sections hold 134 between them; five sections
  hold one control or none
- The two-tier order (operator, then advanced) is not alphabetical, not by size, not by subject
- Two controls sit under a heading they do not belong to (Frame Timing is cosmetic under Race
  Tuning; Auto-Scale is race-relevant in a card of its own)
- 59 of 205 controls have no explanation anywhere, 45 of those 59 in two sections
- One name collision: `minTargetScreenPx` names two different settings in two stores

---

## Candidate A — THE CHEAP ONE. Re-tag, do not move

**One-sentence principle: keep every stored key exactly where it lives; move nothing; add a live
TAG on each section that says how the master reset will treat it.**

**Sections produced: 16, unchanged.** Every current section stays. Each grows a small badge in its
header, plain text, one of four labels:

- **RACE-RELEVANT** — the master reset covers it
- **COSMETIC** — the master reset deliberately leaves it alone
- **OPERATOR** — outside the config world altogether (Race Defaults, Racer Types, Tracks,
  Branding, etc.)
- **NOT CONFIG** — a viewer (History) or an action (System, User Management, Export)

This is the fingerprint's own line, drawn on the screen. A reader inside Auto-Scale sees at a
glance that the button in Race Tuning IS going to reach it; a reader inside Frame Timing sees at
a glance that the same button will not. The two mismatches PIECE 5 established are resolved not by
moving anything but by naming what the layout does not tell you.

- Fixes: the reset-scope mismatch (visible to a reader inside every section); the operator-vs-
  advanced tier line, which today is invisible until you scroll.
- Costs: **nothing that touches a stored key.** Text-only changes across 16 files. A day of work.
- Does not fix: the shape (Camera Advanced still holds 77 controls); the name collision on
  `minTargetScreenPx`; the 59 undescribed controls; the tier order.
- **Risk: low.** No behaviour changes. Every existing muscle memory keeps working.

---

## Candidate B — RE-GROUP BY WHAT MOVES, WHAT WATCHES, AND WHO SETS

**One-sentence principle: three top-level groups on the tier — What Moves the Race, What Watches
It, and Who Sets It Up — with each existing section slotted into one and only one.**

**Sections produced: 16, in three groups.** No section is split. Each is placed under one banner:

- **What Moves the Race** — 4 sections, ~65 controls: Race Tuning (Dynamics + Behavior),
  Auto-Scale.
- **What Watches It** — 4 sections, ~93 controls: Camera Advanced, Sprite Size Range, Name Tag
  Visibility, and a NEW Frame Timing card lifted OUT of Race Tuning into this group. This lift is
  the one structural change — Frame Timing today is cosmetic living under Race Tuning; here it
  moves to the group whose reset scope it actually shares (Camera Advanced's).
- **Who Sets It Up** — 8 sections, ~47 controls: Race Defaults, Change Password, Player Groups,
  Racer Types, Tracks, Branding, Race History, Surface Classes, Export Race Config, System, User
  Management. These are the operator concerns — none of them enter the config-fingerprint world.

**Reuse the project's own line.** The RACE-RELEVANT / COSMETIC split from
`configFingerprint.js` maps almost directly onto the first two groups; the third is everything
that is neither. The taxonomy is not invented for this report — it is the fingerprint's own line
shown to the reader.

- Fixes: the reset-scope mismatch (the visual layout now matches the reset scope); the shape at
  the group level (you see the 4-4-8 split, not the 1-of-16 flatness); an entry point for
  someone looking for camera-related tuning (they now look under What Watches It, and Frame
  Timing is there beside Camera Advanced).
- Costs: **Frame Timing moves from inside Race Tuning to its own top-level card under What
  Watches It.** No stored key changes (`frameTimingConfig` keeps its name and its store); the
  `reset-frame-timing` sub-heading link becomes a card-level Reset in the new location. Two to
  three days of work: the mount registry (`DevScreen.jsx`), the composite RaceTuningSection, and
  the header of the moved card.
- Does not fix: the size of Camera Advanced (77 controls, still one card — splitting that is a
  design decision that has been on the backlog since B-UX2 and not settled here); the name
  collision on `minTargetScreenPx`; the 59 undescribed controls.
- **Risk: low-medium.** No stored key renames. A muscle-memory reader who reaches for Frame Timing
  under Race Tuning will find it in a new place, but neither its behaviour nor its text changes.

---

## Candidate C — CUT CAMERA ADVANCED INTO WHAT THE CAMERA IS DOING RIGHT NOW

**One-sentence principle: apply Candidate B, and ALSO split the 77-control Camera Advanced card
into named phases along the race timeline the camera itself is composed of.**

**Sections produced: 16 → 22.** Everything in Candidate B, plus Camera Advanced is split into six
smaller cards, each holding the keys for one moment the camera plays through. The sub-headings
Camera Advanced already carries are the natural cuts:

- **Camera / Start ceremony** — 10 controls (`ceremonyBrandMs`, `startWindowMs`, etc.)
- **Camera / Battle** — 12 controls (`battleWeight`, `battleMaxGroupSize`, slowmo, focus
  darkening)
- **Camera / Lead change** — 5 controls (`leadChangeWeight`, cooldown, min-duration, debounce, gap)
- **Camera / Comeback** — 8 controls (`comebackWeight`, min-positions, min-start-gap,
  max-current-rank-pct, cooldown, window, beats)
- **Camera / Overview** — 4 controls (`overviewWeight`, cooldown, start-delay, target-count)
- **Camera / Finish and ending** — 14 controls (endgame threshold, finish overview lookback,
  drama, hold-after-last, photo-finish's 5 keys, podium reveal, winner card)

Two supporting cards absorb the rest:

- **Camera / Framing and aim** — 12 controls (`bandFloor`, `leaderForwardFrac`, `minRacersVisible`,
  `referenceCorridorPx`, `entryConvergencePx/Zoom`, `focalSmoothTc`, `glideDurationMs`,
  `corridorCapArriveMs`, `leaderAimRoomFloorPx`, `minDrawnFrameFrac`, `transitionTConvergence`)
- **Camera / Labels and overlay** — 5 controls (`labelFormHoldMs`, `labelNamesWhenRoom`,
  `stateOverlayDurationMs`, `stateOverlayEnabled`, `highlightHeroes`)
- **Camera / Grammar** — 3 controls (`cameraTransitionGrammar`, `outcomePhaseThreshold`,
  Run-in group — the run-in group is small and cleanly separable but sits here to keep the count
  down)

**Why the timeline is the cut.** The Dynamics card already orders its controls by the race
timeline (§8a records it as the only ordering principle currently in force on the screen). Camera
Advanced's own sub-headings already correspond to the states the director cuts between. Splitting
along that line is not a taxonomy invented here — it is the taxonomy the code and the existing
sub-headings already state.

- Fixes: the SHAPE — no single card holds a third of the screen; a reader looking for the finish
  or the photo-finish reaches a card labelled for their subject rather than page-scrolling through
  77 rows; the reset scope stops being all-77-at-once (Camera Advanced's per-group Reset links
  become per-card, so a reader restoring the ending does not restore battle timing).
- Costs: **NO stored key changes** (all keys stay under `cameraConfig`; only which card mounts
  which keys moves); the Dev Screen mounts six new sections plus the ones from Candidate B —
  the registry (`SECTIONS`) grows from 16 to 22 entries; **`data-testid`s change on the moved
  controls** if they were named for their group, and every browser spec that used them needs to
  re-target — a bounded, mechanical cost, but one to name. About a week of work.
- Does not fix: the name collision on `minTargetScreenPx`; the 59 undescribed controls (though it
  makes the two-section hole more visible: 38 of the 59 today are inside Camera Advanced, and the
  split lets any documentation pass proceed one card at a time).
- **Risk: medium.** Test-id churn is the concrete hazard. Muscle-memory readers who reach Camera
  Advanced by scrolling are now reaching six shorter cards named for what they do. Adding a stored
  key rename would raise the cost sharply; this candidate stays clear of that.

---

## Side by side — pick from this table

| Question | Candidate A (Re-tag) | Candidate B (Three groups) | Candidate C (Split Camera Advanced) |
| --- | --- | --- | --- |
| Controls moved between cards | 0 | 2 (frame-timing pair) | 79 (frame-timing pair + 77 camera controls into 6 new cards) |
| Sections mounted | 16 | 16 | 22 |
| Stored key renames | 0 | 0 | 0 |
| Reset-scope mismatch (PIECE 5b) fixed | badge only | yes | yes |
| Name collision on `minTargetScreenPx` fixed | no | no | no |
| The Camera Advanced size problem addressed | no | no | yes |
| 59 undescribed controls addressed | no | no | narrower (per-card doc passes possible) |
| Muscle-memory disruption | none | small (Frame Timing lifts) | medium (Camera Advanced splits, test-ids change) |
| Rough work | a day | 2-3 days | about a week |
| Test-id churn | none | none | non-trivial (browser specs that name Camera Advanced controls need re-target) |
| Fingerprint risk | none — text only | none — no config default moves | none — no config default moves |

**One factual note on cost, not advice.** A is by far the cheapest and touches no code that
matters to a race. C is the only candidate that addresses the size problem the stock-take flagged
as "the single fact most worth carrying out of this stock-take" (§10, top of card).

You choose. This report names no recommendation — those are the tradeoffs, in one table, for you
to weigh against how much of an evening you want to spend on it.
