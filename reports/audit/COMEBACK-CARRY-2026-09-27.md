# COMEBACK-CARRY-1 — the refuted cause taken off master, 2026-09-27

**From master `dc912fbd`, on `read/comeback-gates`.** Two documents and two test files. No behaviour
change, no fingerprint move, no guard added, no default touched.

★ **RE-CUT, NOT REBASED — and here is why, because the brief left the choice open.**
`read/comeback-gates` (`33a33970`) branched from `6b60edd8` and edited `docs/OPEN.md` and
`docs/BACKLOG.md`. DELIVERY-CLEAN-1 then **rewrote §11 of the report and re-derived `OPEN.md` from
scratch** over the same lines. A rebase would have replayed the branch's versions of exactly those
two files into a conflict, and the brief's rule — *take master's structure, carry only the
substance* — means I would have resolved every one of those hunks by discarding it. **Re-cutting
from master makes that rule mechanical instead of a judgment exercised inside a conflict
resolution.** The branch was re-created at `dc912fbd` and force-pushed over the old one.

---

## ★ EVERY ADDRESS IN THE BRIEF WAS VERIFIED, AND ALL FOUR ARE RIGHT

The brief asked to be contradicted where wrong. It is not wrong anywhere.

| the brief's claim | checked at the tree |
| --- | --- |
| the cast comebacker's first shot returns above the weighted draw, `CameraDirector.js:1816-1821` | ✓ the `if (this._comebackPrecedenceRacer?.index === _comebackRacer.index)` block returns `COMEBACK_ZOOM` at **:1816-1821** |
| …above `_weightedRandomPick` and `_acceptsOffer` | ✓ `_weightedRandomPick` is called at **:1840**, `_acceptsOffer` at **:1844** — both below it |
| `cameraSeedForRace` derives the stream from the race seed, `cameraSeed.js:72-78` | ✓ `return (s ^ CAMERA_SEED_SALT) >>> 0 \|\| 1` for `s > 0` |
| `RaceScreen/index.jsx:691`, `:701` | ✓ `:691` `const cameraRandomSeed = cameraSeedForRace(racePlanSeed)`; `:701` `camDirRef.current.setRandomSeed(cameraRandomSeed)` |
| catch-up capped at two steps per frame, `RaceScreen/index.jsx:1078` | ✓ `while (st.physicsAccum >= FIXED_DT && _catchupSteps++ < 2)` |

---

## THE FOUR DEFECTS

**1 · `docs/OPEN.md` row 6 stated the refuted cause.** Both halves false: the shot is not a coin
flip at `comebackWeight`, and the camera's stream is not unseeded. Replaced with the corrected
account — the forced first shot, the derived seed, and **where in the stream the draws land**
varying because the director is updated once per rendered frame off a wall-clock delta while the
physics runs in fixed 16 ms steps capped at two catch-up steps per frame. ★ Written, as the branch
wrote it, as **the mechanism that FITS and was not reproduced on demand**: ten probe runs produced
the shot 10 of 10, 17 of 19 across all runs, and no failing run was ever captured with the frame
counter installed.

★ **The trailing sentence went too** — *"the camera is not determined by the race seed"* was the
same false claim in shorter form. The RULE it carried (*assert a property, never a sequence*) is
kept and explicitly marked as surviving a correction to its reason.

**2 · `docs/BACKLOG.md`'s specs row carried the same refuted cause**, at `:1209-1213` on master.
★ **Not named in the brief's three, and repaired anyway** — the brief says master "still states the
cause we refuted" and scopes the work to "the two list files"; leaving it in the second list file
would have been the exact defect being fixed. The superseded paragraph is **kept, struck through
and flagged inline**, so the correction has something to point at and a skimmer cannot meet the
wrong reason first.

**3 · `docs/OPEN.md` §1 said "EMPTY — Nothing is waiting on his word"** while
`reports/audit/MORNING-2026-09-27.md:69` listed six that are. The morning sheet was right. All six
are now in §1, one line each with the reading he is choosing between and a pointer to the detail.
★ **Two of the six have no backlog row and the lines say so** rather than pointing at a row that
does not exist: B1 (the server accepting any structurally valid result) is described only inside
the closed B5 row, and the README question is about the audit's own judgment. The other four point
at *DELIVERY-CLEAN-1* B2 and B7, *Phases 5–7* TENANCY, and *Three production-arm specs fail*.
★ Item 4, the frame-starved-run question, **appeared nowhere on that page before today**.

**4 · The corrected spec header was stranded on the branch.**
`client/e2e/comeback-precedence.spec.js` taken **as it stands**, per the rule.

★ **AND A FIFTH FILE THE BRIEF DID NOT NAME, carried deliberately:**
`client/e2e/comeback-cast-probe.spec.js`. It is the instrumentation that produced the numbers the
corrected cause cites — the frame counter, `usedSeed`, and the gate tally. The brief scoped the job
to "two documents and one test header", but it also requires the branch to be **contained** before
it is deleted, and deleting it without this file would strand the only instrument that can re-run
the evidence. It is an opt-in probe (`RA_PROBE_SEEDS`), test-only, no product reach. **Named here
so it can be overruled.**

---

## THE COUNTS, BOTH STATED

| | |
| --- | --- |
| `docs/BACKLOG.md` PART ONE — non-audit subjects | **7** |
| PART ONE — *DELIVERY-CLEAN-1* open rows | **6** (plus 1 closed, B5) |
| **PART ONE total open subjects** | **13** |
| `docs/OPEN.md` section 0, the work list | **13** |
| `docs/OPEN.md` §1, questions for him | **6** |

★ **The two agree at 13, and §1's six do not change it** — §1 holds QUESTIONS and section 0 holds
WORK. The page now says that explicitly, because the sentence it used to carry (*"the list below
contains no questions at all"*) becomes false the moment §1 is populated.

---

## WHAT THIS DOES NOT ESTABLISH

- ★★ **The corrected cause is still a mechanism that FITS, not a demonstrated one.** Ten probe runs
  produced the shot ten times. Nothing here reproduced a failure on demand, and the probe renders
  two extra diagnostic panels per frame, which changes the very frame cost under test. **A reader
  who takes the frame-starvation account as proven is reading more than was measured.**
- The 17-of-19 figure pools runs made under different conditions on one fixture; it is a tally, not
  a rate with an interval.
- **Nothing was measured afresh for this carry.** It moves an existing, verified correction onto
  master and re-checks its addresses; it does not re-run the comeback investigation.
