# COMEBACK-HOLD-MEASURE-1 — how the comeback shot ends today

**2026-10-02. Measurement only: no product file was changed, nothing was minted or merged.** Branch
`ship/owner-cosmetic-defaults` (its defaults: the owner's camera settings of 2026-10-01, with
`comebackMinDuration` 8 s), measured at `46a79cdd`.

**The decision this measurement serves — the owner, 2026-10-02:** the comeback shot holds at least
8 s and may hold longer while the catch-up is still in progress. On this branch it holds exactly 8 s:
the COMEBACK_ZOOM profile's `maxStateDuration` is 8000 (`client/src/modules/storage/defaults.js:202`)
and the minimum hold is `comebackMinDuration` × 1000 (`client/src/modules/camera/cameraTimingComputation.js:336-338`),
and the hold gate is the larger of the two (`CameraDirector.js:1035`). That is not changed here.

## The short version

- **10 comeback shots in 30 races. All 10 were ended by the 8 s cap**, each lasting 8.0 s. None was
  ended by anything else, and none was extended by the director re-choosing the same shot.
- **By the brief's definition the remaining catch-up after the cap is 0.0 s in 10 of 10**, because
  every one of the 10 racers was already AT OR PAST his drawn finishing place when the shot ended.
- **But 6 of the 10 went on gaining places after the cut**, beyond their drawn place: gaining-only
  time after the cut, sorted, 0 / 0 / 0 / 0 / 0.1 / 4.3 / 7.9 / 9.4 / 13.5 / 13.9 s — median 2.2 s,
  p90 13.5 s, max 13.9 s (N=10).
- **If the cap were raised, the shot would rarely be ended by anything else first:** before 12 s,
  0 of 10; before 15 s, 1 of 10; before 20 s, 2 of 10 (derived from the same runs, not driven).
- **There is no "comeback finished" signal that ends a shot.** The plan has one candidate — each
  comebacker's `resolve` beat — but it is used only to decide when a shot may START, and only when a
  switch that ships OFF is on. In these 30 races it sat at progress 0.70 for every comebacker, and
  all 10 shots were cut after it while 6 racers were still gaining — so it does not mark the end of
  the actual catch-up.

## 1 · Every condition that can end a COMEBACK_ZOOM shot, at source

The decision is `decideTransition` (`client/src/modules/camera/transitionDecision.js:68-133`), called
once per frame from `CameraDirector.update` (`CameraDirector.js:1036-1056`); its reason is recorded
in `_lastTransitionReason` (`:1057`). Its branches, and whether each can fire **while the shot is
COMEBACK_ZOOM**:

| # | condition | where | can it end a comeback shot? |
| --- | --- | --- | --- |
| 1 | **the hold gate elapses** — `stateAge >= max(minHold, maxStateDuration)` = 8 s here | `transitionDecision.js:117`; gate `CameraDirector.js:1035` | **yes — the only one that fired in this run (10 of 10)** |
| 2 | **the first racer finishes** → the finish sequence is forced, whatever is on screen | `finishPhase.js:281` (`forceFinishDrama`), `transitionDecision.js:123` | yes, at any age of the shot |
| 3 | **the photo-finish gate** — a close finish detected at the lead-progress threshold, entered frame-exact | `CameraDirector.js:1010-1025`, `transitionDecision.js:126` | yes, at any age of the shot |
| 4 | the finish drama expiring / the photo finish ending | `finishPhase.js:278`, `:283`; `transitionDecision.js:120`, `:129` | no — only inside the finish states |
| 5 | a lead change interrupting | `transitionDecision.js:98` | no — LEADER_ZOOM only |
| 6 | the comeback precedence (another comeback cut) | `transitionDecision.js:110`; offer refused in COMEBACK_ZOOM at `CameraDirector.js:879` | no |
| 7 | a battle group dispersing / drifting | `transitionDecision.js:84`, `:91` | no — BATTLE_ZOOM only (and BATTLE ships off) |

★ **What happens AFTER condition 1 fires.** The director picks the next state in `_pickNextState`.
If it picks COMEBACK_ZOOM again, that is a same-state REPEAT (`CameraDirector.js:1924`): the shot
continues with a hold of 0 (`:1928`), so it can end on any later frame. **This already lets a
comeback run past 8 s on the ordinary path. It happened in 0 of the 10 shots here.**

**Not an end condition:** losing the comeback racer. If he cannot be found, the camera falls back
to the third-placed racer for its target (`CameraDirector.js:1108-1114`) and stays in COMEBACK_ZOOM.

## 2 · The 30 races

**Instrument.** `scripts/diag/comeback-hold-measure.mjs` — **a throwaway script, written because no
existing instrument records what ended a shot or the racer's ranks after it.** It reuses the shared
driver `scripts/lib/raceDriver.mjs` (which delivers the race plan the product's way through
`scripts/lib/cameraPlanDelivery.mjs`) and the browser's outcome-phase flag exactly as
`scripts/diag/comeback-beats.mjs` (COMEBACK-BEATS-1) supplies it. It reads the director's own
`_lastTransitionReason` and the planner's drawn place (`racePlanner.js:1930`, `getTargetRank`).

**The races.** The 10 shipped tracks × Quick-Test seeds 1, 2, 3 = **N=30**, 20 racers (the Quick-Test
field), each track's default racer type, this branch's shipped config. Race length is the shared
driver's, as in every earlier comeback measurement. The camera is updated once per physics frame
rather than off a wall clock, so a browser run can place a shot a frame or two differently (see the
header of `client/e2e/comeback-precedence.spec.js`). **The run is deterministic: three runs gave
byte-identical shot lists.**

**Definitions.**
- *Race time* — seconds from the race start. *Lead* — the director's leader progress
  (`leader t / finishT`).
- *Remaining catch-up* (the brief's) — from the shot's end until the racer either reaches his best
  rank for the rest of his race or reaches his drawn finishing place, whichever comes first.
- *Gaining-only* (a variant, labelled) — the same, ignoring the drawn place: how long after the cut
  he went on taking places at all.

| track | seed | drawn place | start (s) / lead | end (s) / lead | ended by | rank start → end | remaining | gaining-only |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| city-circuit | 1 | 4 | 52.9 / 0.679 | 60.9 / 0.774 | 8 s cap | 8 → 1 | 0.0 s | 0.0 s |
| city-circuit | 3 | 5 | 48.0 / 0.626 | 56.0 / 0.723 | 8 s cap | 5 → 3 | 0.0 s | 13.9 s |
| dirt-oval | 1 | 4 | 53.7 / 0.618 | 61.7 / 0.706 | 8 s cap | 7 → 3 | 0.0 s | 9.4 s |
| dirt-oval | 3 | 5 | 60.3 / 0.693 | 68.3 / 0.775 | 8 s cap | 6 → 3 | 0.0 s | 0.0 s |
| garden-path | 1 | 4 | 48.5 / 0.686 | 56.5 / 0.804 | 8 s cap | 7 → 3 | 0.0 s | 13.5 s |
| ice-track | 1 | 2 | 50.3 / 0.688 | 58.3 / 0.792 | 8 s cap | 9 → 1 | 0.0 s | 0.0 s |
| ice-track | 3 | 3 | 46.9 / 0.644 | 54.9 / 0.746 | 8 s cap | 10 → 3 | 0.0 s | 4.3 s |
| river-run | 3 | 5 | 35.8 / 0.615 | 43.8 / 0.737 | 8 s cap | 7 → 4 | 0.0 s | 0.1 s |
| searound | 1 | 3 | 44.0 / 0.704 | 52.0 / 0.830 | 8 s cap | 6 → 2 | 0.0 s | 0.0 s |
| seatrack | 1 | 4 | 42.8 / 0.740 | 50.8 / 0.869 | 8 s cap | 5 → 3 | 0.0 s | 7.9 s |

The other 20 of 30 races produced no comeback shot; the race plan reached the camera in all 30. Why
those 20 had none is not this report's question.

## 3 · Summary

| | N=10 shots |
| --- | --- |
| ended by the 8 s cap | **10 of 10** |
| ended by the cap while still short of the drawn place | **0 of 10** — all were at or past it at the cut |
| remaining catch-up after the cap (brief's definition) | median **0.0 s**, p90 **0.0 s**, max **0.0 s** |
| still gaining places at the cut (gaining-only) | **6 of 10** |
| gaining-only time after the cut | median **2.2 s**, p90 **13.5 s**, max **13.9 s** |

**If the cap were raised — DERIVED from these runs, not driven.** The two conditions that could end
the shot first are the photo-finish gate and the first finisher (§1, rows 2-3). For each shot, the
earlier of the two came this long after the shot started: median **21.7 s**, p90 **27.9 s**, min
**14.4 s**, max **32.1 s** (N=10; the photo-finish gate in 9, the first finisher in 1).

| cap | ended by another condition before the cap | gaining-only finished before the cap |
| --- | --- | --- |
| 12 s | 0 of 10 | 5 of 10 |
| 15 s | 1 of 10 | 6 of 10 |
| 20 s | 2 of 10 | 8 of 10 |

★ **Read the derived table with its limit.** It holds the race fixed and moves only the cap. A
longer comeback shot delays every later shot, and the director's later picks would differ. Those
picks were not driven.

## 4 · Is there a "comeback finished" signal a longer hold could end on?

**No signal that ends a shot exists today.** Candidates in the code, none wired as an exit:

- **The plan's `resolve` beat** — each comebacker's curve ends on a beat with event `resolve`
  (`client/src/modules/heroCurveGenerator.js:791`). The detector stores its progress per racer
  (`client/src/modules/camera/comebackDetector.js:108-117`) but uses it only as an ENTRY gate, and only
  when `comebackUseBeats` is on (`comebackDetector.js:225-240`), which ships off. **Measured here: it
  sat at progress 0.70 for all 10 shot racers; all 10 shots were cut after it, and 6 racers were still
  gaining.** So it does not mark the end of the real catch-up.
- **The drawn finishing place** — `racePlanController.getTargetRank(index)` (`racePlanner.js:1930`).
  Here every racer was already at or past it when the 8 s cap fired.
- **The detector's own rank-gain test** — `best()` needs `comebackMinPositionsGained` places gained
  inside `comebackWindowSec` (`comebackDetector.js`, `best()`). It is an ENTRY test; nothing asks it
  during a running shot.

## Noticed and left

- In 20 of 30 races no comeback shot appeared, although the plan reached the camera in all 30.
  Whether those races cast a comebacker was not recorded; not investigated.
- `docs/` describes the comeback hold in several places. None were checked or changed here: no
  product value moved in this block.
