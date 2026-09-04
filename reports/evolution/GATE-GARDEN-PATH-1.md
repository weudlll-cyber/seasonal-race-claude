# GATE-GARDEN-PATH-1 — the two failures are neither the instrument's nor the track's, and the gate stays as it is

> **STOPPED, under your own decision rule.** You said: if a failure is the instrument's or a
> threshold's, fix it and take the track in; **if it is genuinely the track's, stop — that is a
> picture question and it is yours.** Both failures are real picture faults. **Garden-path is not
> added to the gate. The gate is UNCHANGED — neither stricter nor wider.**
>
> ★ **But neither failure belongs to garden-path.** It **passes item 9 at three of four seeds** and
> item 10 at two of four. Both are **camera behaviours that occur on particular RACES**, on more
> than one track — and garden-path seed 9 is simply where both land at once.
>
> ★ **So what the exclusion costs is not a track. It is two behaviours the gate cannot see** — and
> the lever for covering them is **which race the gate runs, not which track.** §5.
>
> ★ **And garden-path is not the only excluded track that fails.** Two others fail an item nobody had
> named. §6.
>
> **16 races measured. The harness reproduces exactly** — two independent ten-track runs agree row
> for row.

---

## 1. THE CORPUS

| | |
| --- | --- |
| all ten tracks, seed 9, shipped arm | **twice**, 593 s and 589 s — **identical row for row** |
| garden-path and dirt-oval, seeds 1, 2, 3, 9 | 517 s |
| **distinct races** | **16** |

Reproducibility was checked rather than assumed, because the camera is known to diverge on any
frame-timing change and every claim below is a comparison between runs.

---

## 2. ITEM 9 — "THE WINNER IS NEVER CUT"

**WHAT IT MEASURES.** At the crossing and for 1250 ms after it — while the director stays in the
same state — the winner's position in the frame must stay inside the subject's inner region.
`innerFramePct` is 0.7, so the bound is **[0.15, 0.85] on both axes**.

**THE FIRST THING I CHECKED WAS WHETHER THIS IS THE INSTRUMENT'S**, because a graded window that
truncates when the state changes would silently grade some tracks on fewer frames than others. **It
does not**: all ten tracks are graded on exactly **77 frames**, with **zero state changes** inside
the window. The window is fair. *(That hypothesis is recorded because it was tested and disproved —
not as a finding.)*

**WHY GARDEN-PATH FAILS AT SEED 9.** The mechanism is visible in one line:

| | binding at the crossing | camZoom → photoFinishZoom | winner fy: at → max |
| --- | --- | --- | --- |
| **garden-path seed 9** | `level` | **9.22 → 17.06** | 0.695 → **0.855** |
| dirt-oval seed 9 | `level` | 9.97 → 17.06 | 0.684 → 0.811 |
| city-circuit seed 9 | `state` | 17.06 → 17.06 | 0.453 → 0.453 |

**The photo-finish shot has not arrived when the winner crosses.** The camera is still on the LEVEL
binding, less than halfway through a zoom to `photoFinishZoom`, and it keeps tightening *under* the
winner for the next 1.25 s. He slides down the frame by **0.160** and breaches the bound by **0.005**
on 4 of 77 frames. On the eight tracks where the zoom has already arrived, the winner does not move
at all — travel of 0.000 to 0.032.

**WHOSE FAILURE IT IS.**

- **Not the instrument's** — the window is identical for all ten (above).
- **Not a threshold calibrated on the nine** — 0.85 is `framingRule.js`'s own `innerFramePct`,
  which exists so the subject does not cling to the edge. It was not fitted to anything.
- **AND NOT THE TRACK'S.** Garden-path **passes item 9 at seeds 1, 2 and 3**, with headroom of
  +0.435, +0.110 and +0.359. A property that appears at one seed in four is not a property of the
  track.

**It is the RACE's** — a real camera behaviour, and the corpus says where it lives: `binding: level`
at the crossing occurs on **garden-path seeds 1, 2 and 9 and dirt-oval seed 9**, and how far the
winner slides is set by how much of the zoom is left. **dirt-oval seed 9 comes within 0.039 of the
same failure.**

---

## 3. ITEM 10 — "THE WALK"

**WHAT IT MEASURES, AND IT IS NOT A QUALITY TEST.** `leadFrac` is the leader's position along the
direction of travel as a fraction of the frame's chord; **0.5 is frame centre**. Item 10 asks whether
the leader is **ever behind centre** during the endgame window. It is a **presence** test for the
run-in's deliberate walk-back, there to catch a change that removes it.

**WHY GARDEN-PATH FAILS.** Minimum `leadFrac` **0.52** at seed 9 and **0.503** at seed 2 — the leader
never gets behind centre, so the walk did not happen.

**WHOSE FAILURE IT IS.**

- **Not the threshold's.** At seed 9 the other nine tracks reach **0.344 to 0.45** — they clear the
  line by 0.05 to 0.16 while garden-path misses it by 0.02. **The gap between garden-path and the
  nearest passer (0.07) is larger than its own miss**, so 0.5 is not a line everything is crowded
  against. It is also frame centre, which is not an arbitrary number.
- **Not the track's.** Garden-path **passes at seeds 1 (0.375) and 3 (0.353)**.

**THE SEPARATOR IS THE BATTLE SHOT, not the track.** Across all 16 races:

| endgame window | min `leadFrac` |
| --- | --- |
| **contains a `BATTLE_ZOOM`** | 0.38, 0.45, **0.503**, **0.52** |
| does not | 0.343, 0.344, 0.345, 0.347, 0.350, 0.352, 0.353, 0.354, 0.362, 0.367, 0.375, 0.401 |

A battle shot frames **the battle**, not the leader, so the leader is held forward and never walks
back. Both item-10 failures are in the first group; the highest non-battle race (seatrack, 0.401) is
the one overlap. **n = 16 with one overlap: a strong signal, not a proof.** What would settle it is
the same measurement over the nightly sweep's forty seeds, which is a day's data rather than an hour's.

---

## 4. ★ THE DECISION, AND IT IS YOUR RULE APPLIED RATHER THAN OVERRIDDEN

You authorised **(a) — take garden-path in** — conditional on the diagnosis, and gave the rule:
*"if a failure is genuinely the TRACK'S — the picture is worse there — STOP. Do not widen the gate
around it and do not adjust a threshold to make it pass."*

**Both failures are real.** The winner genuinely does end up at 85.5% of frame height 1.25 s after
winning with the shot still tightening; the walk genuinely does not happen. **Neither is an artefact,
and neither can be made to pass without moving a number that was not chosen to be moved.**

**THE GATE RUNS SEED 9 AND NOTHING ELSE**, and seed 9 is precisely the race where garden-path fails
both. So adding it would make the gate **red on the day it was widened** — which is the outcome your
own brief names as the way a gate stops gating.

**SO: GARDEN-PATH IS NOT ADDED. THE GATE IS UNCHANGED — neither stricter nor wider.**

**And the two failures are reported rather than repaired**, because both are picture questions:

1. **Should the photo-finish shot be required to have ARRIVED by the crossing?** Today it has not, on
   3 of 10 tracks at seed 9, and on garden-path that carries the winner to the edge of frame.
2. **Should the leader's walk survive a battle shot?** Today a `BATTLE_ZOOM` in the endgame window
   suppresses it.

---

## 5. ★ WHAT THE EXCLUSION ACTUALLY COSTS — AND IT IS NOT A TRACK

This is the finding worth more than the widening would have been.

**Both gate tracks are in the easy group at seed 9.** space-sprint and city-circuit both cross with
`binding: state` and the camera already at `photoFinishZoom`; city-circuit has a battle but still
reaches 0.45. So the gate is **structurally blind** to both behaviours above — not because
garden-path is missing, but because **neither of its two races exhibits them.**

**The lever is therefore WHICH RACE the gate runs, not which track.** Adding garden-path at seed 9
would import a red; adding a track whose seed-9 race is in the easy group would import nothing. That
is a real choice and it is yours; naming it is as far as this piece goes.

---

## 6. ★ GARDEN-PATH IS NOT THE ONLY EXCLUDED TRACK THAT FAILS

The brief said garden-path fails two of twelve. True — and it is **not the only one.** At seed 9,
across all ten:

| item | failing tracks |
| --- | --- |
| **2** — the shot is at one of the director's own two factors | **luger-hill (0.2585) and dirt-oval (0.0913)** — both outside the 0.02 tolerance |
| **9** | garden-path |
| **10** | garden-path |
| 1, 4, 5, 6, 7, 11 | none |

**Item 2's failures share item 9's mechanism**: luger-hill and dirt-oval are exactly the other two
tracks crossing on the `level` binding with the zoom still in flight. So **three excluded tracks fail
something at seed 9, on two items, from one underlying behaviour** — and the gate sees none of it.

*(Garden-path passes item 2 at 0.0135, and honestly: its camZoom sits on the **leader** factor at the
crossing, which is one of the two the item accepts.)*

---

## 7. WHAT THIS DOES NOT COVER

- **Four seeds per track, not forty.** Every "passes at seeds 1, 2, 3" above is n=1 per seed. The
  nightly sweep runs all ten at forty seeds and would settle both the item-10 battle hypothesis and
  how often the late photo-finish occurs.
- **One arm.** Everything here is the `shipped` arm; nothing was measured against `his`.
- **It does not say the picture is BAD** — only that it differs, measurably, in the two ways named.
  Whether either is worth repairing is the question this piece hands back.
- **Nothing was changed.** No threshold moved, no track was added, no code path was touched apart
  from the comment in `viewer-invariants.mjs` that recorded this as an open question.
