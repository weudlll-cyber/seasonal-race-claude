# COMEBACK-PRECEDENCE-REPIN-1 — the fixture was RE-PINNED, and it STILL fails

**What this reports:** the outcome of NIGHT-2026-09-26 PIECE 3. The `comeback-precedence` spec's
old fixture (Garden Path seed 41000) was DEAD — the plan cast no comebacker at that seed on any of
the ten tracks, established by TWO-FAILING-SPECS-2 on 2026-09-25. This piece was asked to find a
fixture where the plan does cast one, and re-pin the spec to it without touching a single
assertion.

**Method, in the shape the brief asked for:** used the existing diagnostic
`scripts/diag/comeback-beats.mjs` rather than write a new sweep — the header of the diag names
space-sprint seeds 2, 3 and 5 among its known-good starting points. On this tree the diag reports
all three as CAST AND SHOWN on the harness's driver camera:

| Track | Seed | Written | Shown (driver camera) |
| --- | --- | --- | --- |
| space-sprint | 2 | `#9@resolve 0.7` | `#9@0.6001` |
| space-sprint | 3 | `#38@resolve 0.7` | `#38@0.6001` |
| space-sprint | 5 | `#15@resolve 0.7` | `#15@0.7137` |

All three are VALID fixtures for the spec — the plan casts a comebacker who climbs, and the
harness's driver believes the shot fires. That is the "prefer a seed that casts a comebacker AND is
stable across a few repeats" condition the brief names.

## What happened

**The spec was re-pinned to each of the three, run once each in the real Chromium prod arm, and
FAILED IDENTICALLY.** Three runs, three outcomes:

| Run | Fixture | Duration | Result |
| --- | --- | --- | --- |
| 1 | space-sprint seed 2 | 2.3 min | **failed** at line 101: `the race never cut to a comeback at all` |
| 2 | space-sprint seed 3 | 2.3 min | **failed** at line 101: `the race never cut to a comeback at all` |
| 3 | space-sprint seed 5 | 2.3 min | **failed** at line 101: `the race never cut to a comeback at all` |

Every run's camera-state trace was written to the test log by the spec's own `console.log`
(the spec prints its `trace` and `entries` on every run — that is why the trace is quotable
here). Not one of the traces contains a single `COMEBACK_ZOOM` state — the shot the spec waits for
was never taken on any of the three seeds.

Sample from Run 1 (space-sprint seed 2), abbreviated:

```
OVERVIEW → LEADER_ZOOM → BATTLE_ZOOM → LEADER_ZOOM → LEAD_CHANGE → OVERVIEW
→ BATTLE_ZOOM → LEAD_CHANGE → BATTLE_ZOOM → LEADER_ZOOM → BATTLE_ZOOM
→ LEADER_ZOOM → BATTLE_ZOOM → LEADER_ZOOM → BATTLE_ZOOM → LEADER_ZOOM
→ PHOTO_FINISH → FINISH → FINISH_OVERVIEW
```

No `COMEBACK_ZOOM` — comeback entries: `[]`.

## The finding, in the brief's own words

The brief said, verbatim: *"IF IT STILL FAILS with a valid fixture, that is the real finding and
it is bigger than a fixture: the precedence claim itself would be wrong. Do NOT touch the
assertion. Report it with the evidence, leave the spec red, and say so on the morning sheet under
NEEDS HIS WORD."*

**The fixtures ARE valid, and the spec still fails on every one.** The plan is casting a
comebacker, the harness's driver camera is taking the shot, and the browser's camera is not. The
gap between the two cameras is exactly the reason the spec exists — a headless sweep and a
browser run answer different questions, and this run says the answer diverges in the case the
harness believes is a clean cast.

## What is NOT known from this evidence

- **Why the browser's director declines.** The diag's own header warns that the driver's camera
  is not the browser's camera for this shot in particular (`raceDriver.mjs:500` hands the director
  `isOutcomePhase: false`, a hard-coded literal, and `--outcome=browser` mode wraps a local
  override of the flag rather than replaying the browser's RNG path). So the driver-camera's
  "shown" is a hopeful signal, not a promise. This piece cannot say whether the browser is
  choosing BATTLE / LEAD_CHANGE preferentially, whether the comeback's own gates (start-gap,
  current-rank-pct, positions-gained) reject the candidate in the browser's rank history, or
  whether the director's contest declines the offer on every frame it is made.
- **Whether the precedence's own hold-inside-the-gate logic works when triggered.** The spec's
  third assertion (a comeback cut inside the gate would prove the precedence forced the
  transition) never gets exercised, because the shot never appears at all.

Both are load-bearing owner questions and neither is the fixture's business, which is why they
stay on the sheet as NEEDS HIS WORD.

## What the spec now looks like

The spec is pinned to **space-sprint seed 2** — the first of the three the diag confirmed
casts — with a comment naming the re-pin and the previous fixture. No assertion changed. The
spec is RED on master when this piece closes; the row in `docs/BACKLOG.md` and the row in
`docs/OPEN.md` are updated to say so.

## What this piece does NOT do

- It does not touch a single assertion in the spec.
- It does not change any config default.
- It does not re-write the comeback detector, the director, or the plan.
- It does not add a new fixture-selection sweep. The existing diag is what was asked for, and
  the answer it returns is enough to know that the fixture is not the wall.
