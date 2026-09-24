# VIEWER-INVARIANT-SABOTAGE-1 — the five old invariants each have a sabotage arm now, and every one of them can drive its own invariant red at the gate's scope

**Branch `night/2026-09-25`, off master `03f0177a`. 2026-09-25.**

## THE LOOSE END THIS CLOSES

`docs/SHIP-CEREMONY.md` carried a known gap after INVARIANT-6-RUNIN-LEADER-1: the five OLD window
invariants (1 course, 2 leader, 3 line, 4 step, 5 width) had **no sabotage arm**. They had never been
observed red at the gate's scope, and an instrument nobody has seen react is not yet an instrument
(Lesson 209). Invariant 6 now has one (`--sabotage-corner`, in the probe since 2026-09-25); this
report gives the five older ones the same treatment.

## WHAT WAS ADDED — five arms, same shape as `--sabotage-corner`

Five new flags on `scripts/viewer-invariants.mjs`, each read by
`client/src/modules/viewerProbe.js` at `beginViewerProbe` through the same sessionStorage channel
`--sabotage-corner` uses. Each arm forces its invariant across the threshold **at the check itself**,
so the machinery on either side (spine scan, canvas test, band scan, step compute, width compute)
still runs on every armed frame — an arm that could only fire by short-circuiting the machinery
would prove nothing about the machinery.

| flag                    | invariant  | how it trips |
| ----------------------- | ---------- | ------------ |
| `--sabotage-course`     | 1-course   | force `courseIn = false` after the spine loop has run in full |
| `--sabotage-leader`     | 2-leader   | displace the leader off canvas at the check only, so 6's frame-fraction test sees the true point |
| `--sabotage-line`       | 3-line     | force the finish band's best margin negative after the projection scan has run in full |
| `--sabotage-panstep`    | 4-panstep  | force the pan step to `canvasWidth + 1` after the real hypot is computed |
| `--sabotage-toowide`    | 5-toowide  | force the tested width above the world width; the "too wide" half is the weaker of the two |

**One arm per invariant.** Invariant 4 has two events (`widthstep`, `panstep`) and invariant 5 has
two events (`tootight`, `toowide`); each has one arm. Aiming at one event per invariant is what
the ceremony gap names.

## WHAT THE GATE DID, PER ARM — two races (city-circuit + space-sprint at seed 9, shipped arm)

Every one of the six runs used the same `--gate` two-race scope, the same isolated stack, and the
same virtual clock. Nothing about the invariant grading was weakened: the arms were added, the
threshold was not moved.

| arm                     | exit | races red | violations | which invariant | worst by | wall clock |
| ----------------------- | :--: | :-------: | ---------: | --------------- | -------: | ---------: |
| `--sabotage-course`     |   1  | 2 of 2    |     12 650 | 1-course        | 0.0      |     170 s  |
| `--sabotage-leader`     |   1  | 2 of 2    |        737 | 2-leader        | 1000 px  |     172 s  |
| `--sabotage-line`       |   1  | 2 of 2    |        737 | 3-line          | 100 px   |     167 s  |
| `--sabotage-panstep`    |   1  | 2 of 2    |     12 648 | 4-panstep       | 1281 px  |     171 s  |
| `--sabotage-toowide`    |   1  | 2 of 2    |     12 651 | 5-toowide       | 1000 wpx |     171 s  |
| **CLEAN (revert)**      | **0**| **0 of 2**|        **0**| (every kind 0) | —        | **172 s**  |

**What the counts describe.** Invariants 1, 4 and 5 run on every frame — 12 650 is the two races'
frame budget minus the "no previous frame" edge for the 4-panstep case. Invariants 2 and 3 are
scoped to the run-in window, and their 737 is that window on these two races. Both shapes match the
existing `--sabotage-corner` count (739) at the same scope.

**The CLEAN run PROVES REVERT.** With no arm on the command line, the same build produces zero
violations of any invariant and exits 0. So the arms only ever make the guard FAIL — never pass —
and the default state of this branch is bit-identical to master's gate verdict.

## THE FOUR DECISION RULES, ONE BY ONE

- **No product change was needed for any arm to fire.** The sabotage lives in the probe (which
  already housed `--sabotage-corner`) and the harness flag; the invariants themselves were not
  weakened, tightened or rescoped.
- **No arming arm reddened a DIFFERENT invariant.** Every "VIOLATIONS PER INVARIANT" line shows zero
  everywhere except the invariant being sabotaged. Invariant 6's `6-leaderedge` count was 0 in every
  arm — because `--sabotage-leader` puts the leader off canvas at invariant 2's check ONLY, keeping
  the true `LX/LY` for invariant 6's frame-fraction test as designed.
- **The default gate still exits 0.** Proven by the CLEAN row above. Nothing was reverted between
  runs.
- **Not one arm needed a workaround.** Each one fires cleanly on frame 0 or the first in-window
  frame, whichever comes first.

## WHAT THIS DOES NOT DO

- It does not tighten any invariant. Bounds are unchanged; the wide bound of invariant 5 is still
  "wider than the world", the sanity bound its own header calls weak. The `--sabotage-toowide` arm
  drives that same bound — a **stronger** wide bound would still need to be argued and adopted.
- It does not add a widthstep or tootight arm. One arm per invariant is what the ceremony gap
  names, and the two chosen events are the ones easiest to trip from AT-check substitution without
  fabricating a prior-frame history.
- The arms exercise the **event path** and the **check machinery**. They do not exercise the
  window-scoping logic itself — an arm that fired only inside the window would prove that path too,
  but nothing did so tonight.

## FILES TOUCHED

- `client/src/modules/viewerProbe.js` — five `_sab...` variables, five sessionStorage reads at
  `beginViewerProbe`, five at-check substitutions (one per invariant).
- `scripts/viewer-invariants.mjs` — five `SAB_...` flags, passed to the page through the same
  `addInitScript` payload that carries `--sabotage-corner`.
- `docs/SHIP-CEREMONY.md` — the known-gap paragraph is updated to name what closed and what remains.

## THE ONE GAP THAT REMAINS

The gate's own **regression-net** property still stands: at the gate's own scope
(seed 9, shipped arm, city-circuit + space-sprint), the shipped world produces **0 events** of any
old-invariant kind. Every violation the two full 80-race sweeps found sits at seed 2, which the
gate does not run. So the arms prove the machinery reacts on demand; they do not manufacture a
real-world red where none exists at this scope, and they should not.
