<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-12, after piece 3 of the 2026-09-12 chain.

**Where the code is.** Master is `b6d77637`, **CI green**. `night/2026-09-12b` is branched off it and
is **NOT merged** — it carries the new comebacker. Both older night branches are gone from origin:
`night/2026-09-12` was merged into master, and `night/2026-09-10` is preserved as the annotated tag
**`archive/night-2026-09-10`** because shipped source cites its HOLD-GRID-1 report by name.

---

## ★ THE COMEBACKER NOW WORKS — AND THERE IS ONE REASON NOT TO MERGE IT

He asked for a racer who is held back through the first half and then races to the front. It had
never once happened: the curve was authored as a **round trip** — down to a staging rank and back up
— and that needs **1.66× the runway that exists**. It fired in 0 of 180 races, then 9 of 200.

**The shape changed, not the limits.** He is now held on ONE authored leg down to a staging rank
ending at **0.70**, where the curve simply **ends** and he climbs back by racing the last 30%.

| | before | after |
|---|---|---|
| cast at all | 0 of 180 | ★ **52–70% of races** |
| places gained (N=20/40/60/100) | −3 / −9 / −15 / −25 | ★ **+1 / +6 / +10 / +25** |
| reaches the top 5 at N=100 | 10% | ★ **30%** |
| other heroes (attacker / faller / sovereign) | 578 / 61 / 68 | ★ **unchanged, to the race** |

★ **A browser test watched one**: held from 6th back to 11th, released at 0.70 in 8th, **second by
the end**, in a real Chromium.

★★ **BUT `check-runin-frame` FAILS on luger-hill at 100 racers** — the camera loses the finish line
off the top of the canvas near the end. It is green on master (verified in a worktree), so it is this
change's doing: the camera is reacting to a race that now runs differently. **That is the reason not
to merge tonight, even if the comeback pleases you.**

**Nothing was minted. No golden race was re-recorded.** All four fingerprints moved, as designed —
world `bdf4a3c8ce6e0316`, world-off `cadd1d4b2391a2a6`, camera `3df640a42e934312`,
render `6a84085e79535dd6`.

**The sim-browser parity rule held.** The client suite's three reds are all *recorded* outcomes; the
live `real == sim` byte-identity passed in every one of them.

---

## What is waiting for you

1. ★ **Is this the picture you want?** Held to a third of the field, then racing back — at 100 racers
   a median 33rd → 11th. Only you can answer it.
2. ★ **The luger-hill camera red above.** Fix the camera, or accept it, or reject the shape.
3. **52–70% cast, not the large majority the brief asked for.** At the gate alone the shape fits in
   83–100%; the rest is lost to slot competition with the other roles. Raising it means giving the
   comebacker precedence over another role — a design decision.
4. **At 20 racers it gains only +1 place** and top-5 reach slips slightly. The floor for casting is
   currently twenty; the measurement suggests thirty is the honest floor.
5. **`holdReleaseProgress` is not on the Dev Screen yet.** Named as owed.

---

## Where the night stopped

Pieces **1**, **2** and **3** are done and pushed. **Pieces 4 and 5 were not started** — piece 2's
build and its four sweeps took most of the night. The fall order in the brief was 5, then 4, then 3,
so what remains is exactly what the brief itself ranked as most droppable:

- **PIECE 3 — DONE.** ★ Only **three** of the six could be fixed by the shared helper, and they were;
  the other three are blind **structurally** — one runs the countdown only, one replays recorded
  frames, one builds no race plan at all. ★ **`exp-anchor-truth-ab` moved on 3 of 10 tracks**, so any
  anchor conclusion from city-circuit, garden-path or luger-hill predates the camera seeing the cast.
  `check-ending-frame` (a verify guard) is byte-identical and still passes.
  See [INSTRUMENT-PLAN-2](../reports/evolution/INSTRUMENT-PLAN-2.md).
- **PIECE 4** — `BAND_EDGES` is a 40-racer table and `docs/FAIRNESS.md` never says so. **Not started.**
  ★ Tonight's fairness run is consistent with the concern: band-reach is 83–95% at 40 racers.
- **PIECE 5** — the `/api/health` build id, the e2e geometry flake, `check-image-starts` in CI.
  **Not started.** ★ The geometry flake **reproduced tonight** during the browser test — six of ten
  track geometries failed to cache with `Failed to fetch`, without failing the run.

<!-- END CHAIN STATUS -->

## Reports from this chain

- [DIRECTION-AUTHORITY-1](../reports/evolution/DIRECTION-AUTHORITY-1.md) — piece 2: the build and its
  measurements.
- [COMEBACK-CONSTANT-DEFICIT-1](../reports/evolution/COMEBACK-CONSTANT-DEFICIT-1.md) — why the
  min-jerk premium was never the wall, which is what sent piece 2 at the shape instead.
- [COMEBACK-STAGED-1](../reports/evolution/COMEBACK-STAGED-1.md) — the round trip, and the scissors.
- [PACE-DEFICIT-1](../reports/evolution/PACE-DEFICIT-1.md) — the window, and the climb that the
  release at 0.70 relies on.
