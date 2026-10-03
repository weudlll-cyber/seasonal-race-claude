# BROWSER-SPECS-RECHECK-1 — the two failing production-arm specs, run ten times each

**2026-10-03, on master `3e4457d4`, measurement only. No product or test change.** Branch
`measure/browser-specs-recheck`.

**How they were run.**
- The production build, with
  `npx playwright test --config=playwright.prod.config.js e2e/<spec> --retries=0`.
- One invocation per run, sequentially, ten runs per spec.
- Nothing else ran on the machine. `--retries=0`, so no retry hides a failure.

## Results

| run | `comeback-precedence` | `garden-path-finishes` |
| --- | --- | --- |
| 1 | FAIL `:178` | FAIL `:46` (6.7 s) |
| 2 | FAIL `:178` | FAIL `:46` (6.7 s) |
| 3 | FAIL `:178` | pass (first crossing within 1.7 min) |
| 4 | FAIL `:178` | FAIL `:64` (1.6 min) |
| 5 | FAIL `:178` | pass |
| 6 | FAIL `:178` | pass |
| 7 | FAIL `:178` | pass |
| 8 | FAIL `:178` | FAIL `:64` (1.6 min) |
| 9 | FAIL `:178` | FAIL `:46` (6.5 s) |
| 10 | FAIL `:178` | FAIL `:64` (1.6 min) |
| **pass rate** | **0 of 10** | **4 of 10** |

### `comeback-precedence` — every run fails at `client/e2e/comeback-precedence.spec.js:178`

*"the race never cut to a comeback at all"*: the trace has no COMEBACK_ZOOM. Run 1's camera trace
(page clock, ms):

    OVERVIEW 1077 · LEADER_ZOOM 19381 · OVERVIEW 34588 · LEADER_ZOOM 39535 · LEAD_CHANGE 51885 ·
    LEADER_ZOOM 59986 · LEAD_CHANGE 69707 · LEADER_ZOOM 77658 · OVERVIEW 98950 · LEAD_CHANGE 103891 ·
    LEADER_ZOOM 111974 · PHOTO_FINISH 114757 · FINISH 117592 · FINISH_OVERVIEW 119250

All ten runs report the same empty list of comeback entries.

### `garden-path-finishes` — two failures, both reads that do not wait

- **`:46`, *"the scoreboard must be rendering a field"*, received 0** (3 runs, about 6.6 s in). The
  count is taken once with `.count()`, which does not wait, right after `window.__viewerProbe`
  appears (`:38-42`). The scoreboard was not filled yet at that instant.
- **`:64`, *"a crossing must put a finish time on the board"*, received 0** (3 runs, about 1.6
  min in). The probe's crossing latch had fired (`:51-56`). `.sb-finish-time` is counted once, in
  the same instant, and the board had not shown the time yet.

In every run that failed at `:64`, the race crossed the line. Neither failure is a race that did
not run or did not finish. Both are a single `.count()` racing the render. Changing the test is
not part of this piece.

## Did the comeback changes of 2026-10-02 change what these specs check?

**`garden-path-finishes`: no.** It asserts that a field is on the board (`:46`) and that a finish
time appears (`:64`). The 2026-10-02 changes are camera-only, and the world fingerprint did not move
at that ship (SHIP-OWNER-COSMETIC-1), so the race this spec watches is the same race.

**`comeback-precedence`: yes, in two ways, measured.** Three runs each:

| build | comeback entries | result |
| --- | --- | --- |
| master BEFORE the ship (`000db6e8`) | one, out of LEADER_ZOOM, held 4.6 / 5.3 / 6.9 s | **3 of 3 pass** |
| master, `comebackCutDelayMs` set to 0 locally (not committed) | one, out of LEADER_ZOOM, held **18.9 / 13.1 / 11.4 s** | 3 of 3 FAIL at `:201` |
| master as shipped (delay 1500 ms) | none | 10 of 10 FAIL at `:178` |

1. **The cut delay removes this fixture's comeback shot.** The setting is `comebackCutDelayMs`
   (`client/src/modules/storage/defaults.js:400`); the wait starts in `CameraDirector.js`, on the
   precedence route. With the delay the browser never cuts. Set to 0, it cuts in all three runs. This
   is the loss COMEBACK-CUT-DELAY-1 measured: in 20-racer fields about 40% of comeback shots are
   dropped, because the detector no longer offers the racer when the wait ends. This spec's race is a
   Quick Test of 20. Headless, the same race keeps its shot (one precedence cut out of LEADER_ZOOM);
   the browser places camera decisions a frame or two differently and loses it.
2. **The spec's precedence signature no longer reads from the camera-state display.** The spec
   counts a cut as forced when the state it left had been on screen for less than that state's hold,
   8000 ms for LEADER_ZOOM (`:190-193`). With the delay at 0, the cut comes out of a LEADER_ZOOM on
   screen for 11–19 s. The display shows only state changes, and a LEADER_ZOOM longer than its own
   hold has been re-picked without a visible change. So "on screen" is no longer "in this hold".
   This fits the owner's cosmetic defaults of 2026-10-01: with the BATTLE shot off
   (`battleWeight`), the leader shot is re-picked more often. **It is consistent with that, not
   proven**: the display cannot show a same-state re-pick, and no run here logged the director's
   own transitions.

## Not done

No product or test change, as the brief says. Each finding needs a decision, not a measurement:
- whether this fixture should keep a comeback shot under the delay;
- how the spec should recognise a forced cut when the display cannot see a re-pick;
- whether the two garden-path reads should wait.
