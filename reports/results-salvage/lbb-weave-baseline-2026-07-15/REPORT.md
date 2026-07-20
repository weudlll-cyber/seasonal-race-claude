# LBB-WEAVE-BASELINE — STOP-AND-REPORT: the named measurement tools are not on this branch

**On `trace/lbb-weave`. Nothing committed, pushed, or merged. No physics change, no fix.** Read-only
verification only. The task's own guardrails require stopping and reporting when the rig cannot deliver
("If either [fingerprint] differs, the rig has drifted — stop and report"; "the --lbb-diag per-frame counts
must reproduce the earlier runs. If not, stop and report"). That condition is met here — not by a drifted
number, but because **the tools named to produce the baseline do not exist on this branch in a form that can
produce it**, and completing them would be the "new instrumentation" the Constraints forbid.

I did not run the sweep, because the sweep the task describes cannot be assembled from the named tools
without building new instrumentation. Below is exactly what I verified, what is missing (named precisely),
and what remains possible.

---

## What I verified by EXECUTION (the rig check that IS possible)

**Costume anchor mechanism — sound.** The WITH-(d)/WITHOUT-(d) fingerprints in the task are the
`scripts/fingerprint-default.mjs` combined hashes (its own header cites `fa4e3796e1e5f1a5` as the Stage-1
AFTER reference = WITH-(d)). I ran it on the current working tree:

```
COMBINED 0259ea6c3e75efc3 (seed=1 races=3 dur=60, 10 tracks, default config)
```

- **`0259ea6c3e75efc3` = the WITHOUT-(d) anchor.** So the current tree is the WITHOUT-(d) costume — the
  removal (`b11230c`, "remove the look-before-brake lateral-progress condition") is applied. Consistent with
  source: the gate commits on `if (dir !== 0)` with no `&& vLatToward >= 0` term.
- The anchor-check mechanism therefore works, and the current branch state is confirmed. This is the only
  part of the requested rig that is intact.

**Rig note on the costume toggle.** The Constraints describe switching costume as "toggling the
`&& vLatToward >= 0` term." On this branch that is not a one-term toggle: `b11230c` deleted BOTH the term AND
the `vLatToward = physicalYVelocity * dir` declaration that feeds it. Restoring WITH-(d) means re-adding the
declaration and the term (two lines), then confirming `fingerprint-default.mjs` prints `fa4e3796e1e5f1a5`.
Small, but the toggle is not the single-character edit the brief assumes.

---

## Why the baseline CANNOT be produced with the named tools (verified at source)

The task says: "Run `scripts/lbb-weave-report.mjs` (already on this branch) plus `--lbb-diag` … on [4 tracks],
50 races, 60 s, seed=1, `--jobs=8`." Neither named tool does this, and the gap is structural, not cosmetic.

### 1. `lbb-weave-report.mjs` is a single-race post-processor, not a sweep

It is hard-wired to two files — `results/lbb-trace-2-2026-07-15/raw-nod.json` and `raw-withd.json` — which
are the trace-2 dump: **one track (mountainstreet), one race, one seed.** It takes no arguments, loops no
tracks/costumes/races, and reads a ~65 MB raw per-frame dump that exists for exactly that one race. There is
no `--races`, no `--track`, no `--jobs` — those are `sim-fairness.mjs` flags, and `sim-fairness.mjs` neither
calls the weave detector nor knows the costume.

This is precisely the "anecdote" the task set out to replace ("the visible-weave detector has only ever been
run on one track, one race, one seed"). Upgrading it to a 50-race × 4-track × 2-costume baseline needs a tool
that does not exist — see item 3.

### 2. `--lbb-diag` has no handler on this branch

- No script on `trace/lbb-weave` parses `--lbb-diag`. The flag, its wiring, and the observer
  `scripts/sim/observers/look-before-brake.mjs` live on a **different branch** (`e06890e`, `5b3ef65`,
  `264fbb6`, `c32cc61`). Verified: `c32cc61` is **NOT an ancestor of HEAD**, and the observer file has
  **never appeared in this branch's history**. So `brakeThenDodge` (deliverable 4) cannot be produced here.
- The `frameHook` plumbing in `sim-fairness.mjs` still exists, but nothing attaches an LBB observer to it on
  this branch — the attaching flag is the off-branch `--lbb-diag`.
- Even the off-branch observer computes only `brakeThenDodge` / outcome attribution. It does **not** compute
  the visible-weave legs, `honestOverlapRate`, or `zigzagScore`. So no single existing tool yields
  deliverables 1, 2, 3, or 6.

### 3. The visible-weave count at population scale has no tool at all

The leg/weave/zigzag detector exists ONLY inside the single-race post-processor `lbb-weave-report.mjs`. A
search of `scripts/sim/` for the detector's logic (`alternating`, `MIN_LEG`, `legs(`) returns nothing —
there is no in-sim weave observer. Producing the visible-weave count over 50 races therefore requires one of:
- dumping raw per-frame `physicalY`/`physicalYVelocity` for every racer across 50 races × 4 tracks × 2
  costumes — roughly 3 GB per track/costume (~24 GB), via the `LBB_TRACE=1` path, which is a **single-race
  throwaway buffer**, not a sweep; or
- building a **new in-sim observer** that runs the legs/weaves logic per racer per race and aggregates
  counts (deliverables 1–3, 6).

Both are new instrumentation. The Constraints say: "No new instrumentation, no fix" and "Measurement only."

### 4. What IS available on-branch (but is not the baseline)

- `honestOverlapRate` (deliverable 5) is computed by `scripts/sim/observers/report.mjs` and is reachable
  through `sim-fairness.mjs`. It could be produced for 4 tracks × 2 costumes on-branch.
- The costume toggle + `fingerprint-default.mjs` anchor check (shown above).

That is 1 of 6 deliverables plus the anchor check. Delivering only those, while items 1–4 and 6 require
forbidden new instrumentation, would not be the baseline the task defines — and presenting a partial as the
baseline is the exact anecdote-dressed-as-data failure this task exists to prevent. So I did not.

---

## Deliverables status

| # | Deliverable | Producible on `trace/lbb-weave` with named tools? |
|---|---|---|
| — | Costume anchors (fingerprint check) | **Yes** — verified: current tree = WITHOUT-(d) `0259ea6c3e75efc3` |
| 1 | Visible-weave count (50 races × 4 tracks × 2 costumes) | **No** — detector is single-race post-process only; no sweep tool exists |
| 2 | Concentration (share of racers, worst racer) | **No** — depends on #1 |
| 3 | Leg-length distribution (full population) | **No** — depends on #1 |
| 4 | `brakeThenDodge` median braked frames + count | **No** — `--lbb-diag` observer is off-branch, absent here |
| 5 | `honestOverlapRate` | Partial — computable via `report.mjs`/`sim-fairness.mjs`, but not the baseline alone |
| 6 | `zigzagScore` alongside | **No** — lives only in the single-race post-processor |

---

## What building the baseline would require (for Plan-Claude to authorize as a separate, scoped step)

Not a fix, not proposed here as work I should silently do — stated so the decision is explicit, since it
crosses the "no new instrumentation" line:

1. **Restore the `--lbb-diag` harness** onto this branch from `c32cc61` (the observer
   `look-before-brake.mjs` + the `sim-fairness.mjs` flag wiring to `frameHook`). This recovers deliverable 4
   (`brakeThenDodge`) and the blockdist attribution.
2. **Add a multi-race visible-weave observer** (deliverables 1–3, 6): the `legs`/`weaves`/`zigzag` logic from
   `lbb-weave-report.mjs`, run per racer per race inside the sweep and aggregated — because dumping raw
   frames at 50-race scale is infeasible (~24 GB) and the trace path is single-race.
3. **Confirm the costume toggle** by re-adding the `vLatToward` declaration + `&& vLatToward >= 0` term and
   checking `fingerprint-default.mjs` prints `fa4e3796e1e5f1a5` (WITH-(d)) and `0259ea6c3e75efc3`
   (WITHOUT-(d)).
4. **Determinism guard**: the restored `--lbb-diag` per-frame counts must reproduce
   `results/lbb-blockdist/` before any new numbers are trusted (the task's own stated check).

Steps 1–2 are "new instrumentation" as the Constraints define it. I have not done them. Per the task's
guardrails and the discipline that has governed this investigation — a missing capability is a finding, not
something to approximate — I am stopping here and reporting the gap.

---

## Hygiene (reported separately)

- The Constraints assume a rig ("Run `lbb-weave-report.mjs` plus `--lbb-diag`") that is not present on
  `trace/lbb-weave`: the weave detector is a single-race post-processor, and `--lbb-diag` is on another
  branch. The two throwaway scaffoldings from earlier steps (the trace/dump path and the off-branch diag
  sweep) were never the same tool, and neither is the multi-race weave baseline the task needs. Any re-issue
  should name the exact scripts to restore (from `c32cc61`) and the new observer to add, rather than assume
  the baseline is a run away.
- Confirmed by execution, not assumption: current tree costume = WITHOUT-(d) (`0259ea6c3e75efc3`). The one
  piece of the rig that is intact — the fingerprint anchor — works.
