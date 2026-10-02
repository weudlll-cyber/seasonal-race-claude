# HARNESS-EMPTY-SCOPE-1 — every `--tracks` tool refuses an empty scope through one place

**Date:** 2026-10-02 · **Branch:** `fix/harness-empty-scope` (off `master` `a96c9762`) · **Verdict:**
BUILT. Closes the BACKLOG row *"A sweep that asks for races and gets none still prints a table and
exits 0"*, whose design is in [HARNESS-LOUD-ZERO-1](HARNESS-LOUD-ZERO-1.md) and whose earlier
narrowings are [TRACKSCOPE-DIAG-REACH-1](TRACKSCOPE-DIAG-REACH-1.md) and WORKBENCH-THREE.

## 1. What was reused, and what was not added

The shared place already existed: `scripts/lib/trackScope.mjs`, with two doors —
`resolveTrackScope` (returns geometries) and `resolveTrackScopeIds` (returns names, in the order
asked). **No second helper was written.** The registry read is `loadTracks()` from
`scripts/lib/raceDriver.mjs`, also reused. Two changes to the shared place itself:

- **An EMPTY `--tracks=` is refused**, no longer read as "every track". Only an ABSENT flag (`null`)
  means every track. This matches the wording's origin, `viewer-invariants.mjs`, which always
  refused it.
- **`resolveTrackScopeIds` accepts the raw flag string** and splits it, so callers stop carrying
  their own `.split(",").map(trim).filter(Boolean)`.

## 2. The census — every tool that takes `--tracks`

Found by searching the tree for a `tracks` flag read (`arg("tracks", …)`, `argVal`, `ARG`, or a
literal `"--tracks="` match), not from a remembered list. **30 tools.** The same search is the census
test (§4), so the list cannot go stale without a red test.

| state | tools |
| --- | --- |
| **already on the shared place (7)** | `line-visible-truth`, `pan-lag-account`, `endgame-width-truth`, `diag/company-ceiling-who`, `diag/company-under-floor`, `diag/endgame-spec`, `diag/sprite-premise` |
| **wired here (21)** | `company-bind-truth`, `company-spread-sweep`, `label-degrade-truth`, `label-occlusion-truth`, `sim-race-visual`, `viewer-invariants`, `exp-fair-arrival`, `exp-roster-matrix`, and 13 under `diag/`: `aim-levers-sum`, `corridor-default-sum`, `headcount-price-sum`, `leader-lag-sum`, `leader-lag-tc`, `leader-lateral-ba`, `leader-lateral-sum`, `leader-setback-sum`, `margin-both-axes-sum`, `midrace-clip-by-state`, `midrace-clip-sum`, `room-floor-estimate`, `runin-track-sweep` |
| **left, by rule (2)** | `outcome-phase-window`, `pair-reach-census` — see §3 |

Four of the seven already-wired tools (`line-visible-truth`, `pan-lag-account`, `endgame-width-truth`,
`diag/endgame-spec`) were touched only so an absent flag reaches the shared place as `null` and an
empty one as `""`.

**What each wired tool did before, on master:** the 13 `-sum`/`diag` analysers with `--tracks`
omitted printed every table header over zero rows and exited 0 (measured on `midrace-clip-sum`);
`company-bind-truth`, `label-degrade-truth` and `label-occlusion-truth` skipped an unknown name with a
stderr line and exited 0; `company-spread-sweep`'s private guard compared found-count to asked-count,
so `--tracks=` (0 of 0) passed it and the sweep ran nothing; `sim-race-visual` skipped every name
whose file was missing; `exp-fair-arrival` and `exp-roster-matrix` swept zero tracks on `--tracks=`.
Where a tool's own skip (`if (!geo) continue`) became unreachable after validation, it was removed.

**Proven after wiring:** all 28 were run with `--tracks=all` and with `--tracks=` — **every one exits
2, names what was asked and what exists, and writes 0 bytes to stdout.** (`viewer-invariants` needs
`server/data/tracks`, which a fresh clone lacks; it was run against a temporary copy of the seeds and
gave the same refusal, word for word, as its old private guard.) A valid scope still runs: the 12 file
analysers given `--tracks=river-run,space-sprint` exit with the same codes as master.

## 3. The two left, and why — measured, not assumed

The first build wired all 30. `node scripts/engine-reach.mjs --check` then answered **"3 of 34
path(s) can change the race"**: `outcome-phase-window.mjs`, `pair-reach-census.mjs` and
`scripts/lib/trackScope.mjs`. Both tools import `client/src/modules/raceCore.js` directly, so they are
race-hull DRIVERS and the hull includes their whole import closure; importing the shared place pulled
it in, which would have made every later edit of the refusal a race-reaching change with a fingerprint
bill. **Both were reverted to master**, and the hull answer returned to *none of 30 paths*.

- `outcome-phase-window` already refuses an empty scope (exit 2) and an unknown name (exit 2) on its
  own. No silent zero.
- ★ **`pair-reach-census` IS a silent zero and stays one.** Its header documents `--tracks=a,b`, but
  the value goes to `loadTracks({ only })`, which matches ONE exact id — so any multi-track scope
  (and `--tracks=all`) prints nothing and exits 0. Measured on master. Fixing it with its own copy of
  the refusal would be a second home; fixing it through the shared place puts the shared place in the
  hull. **Named, not fixed.**

## 4. Tests, and the sabotage of each

`scripts/lib/trackScope.test.mjs` (5 added, beside the 7 existing) and the new
`scripts/lib/trackScopeWiring.test.mjs` (6). Both are `*.test.mjs` under `scripts/`, so
`scripts/verify.mjs` discovers them. Each new test was broken once against a SEMANTIC mutation (the
assertion failed on a status or message, never on a crash), shown red, and restored:

| test | sabotage | result |
| --- | --- | --- |
| refuses an explicit empty `--tracks=` | `""` read as omitted again | red: exit 0 |
| absent flag (`null`) is every track | `null` no longer counted as omitted | red: exit 2 |
| raw comma string, trimmed, asked order kept | string input dropped | red: refused |
| raw empty string refused | the "names nothing" limb removed | red: exit 0 |
| one unknown name in a raw string | only the first name checked | red: exit 0 |
| census: every non-hull `--tracks` reader imports the shared place | `diag/leader-lag-tc.mjs` reverted to master | red: names that file |
| the shared place stays outside the race hull | `outcome-phase-window.mjs` made to import it | red |
| `-sum` analyser with `--tracks` omitted refuses (end to end) | `diag/midrace-clip-sum.mjs` reverted to master | red: exit 0 |
| `company-bind-truth --tracks=all` refuses (end to end) | file reverted to master | red: exit 0 |
| `company-spread-sweep --tracks=` refuses (end to end) | file reverted to master | red: exit 0 |
| a known name passes the check (end to end) | the unknown-name filter inverted | red: exit 2 |

The census exempts hull drivers by computing `raceHull()`, never by a hand-kept list. It costs about
10 s, almost all of it the hull walk.

## 5. Noticed and left

- **`pair-reach-census`'s multi-track scope** — §3.
- **The data half.** A valid scope pointed at a `--dir` with no files still prints "NO FILE" rows (or
  an empty table) and exits 0 on most `-sum` analysers. That is a different question from the scope
  and the closed row never claimed it.
- **`--track` (singular) tools** — `gun-window-truth`, `straggler-truth`, `zoom-rate-truth`,
  `phys-bench`, `diag/line-ceiling-terms`, `diag/width-authority` and others — take one name, and
  most already fail loudly on an unknown one. Not in this row's scope; `sim-fairness.mjs` (inside the
  hull) mentions `--tracks=` only in a comment.
- **`viewer-invariants`' empty-registry message** now comes from the shared place, which says
  "falling back to server/seeds/tracks"; this harness reads `server/data/tracks` only and throws
  before that point when the directory is missing, so the sentence is slightly wrong for it and was
  left.

## 6. What was not run

No `npm run verify`, no premerge, no client suite, no browser gate, no fingerprint run — by brief;
the coordinator runs those. `engine-reach --check` over every changed path: **none can reach the race
engine** (all outside the hull). Run: the two test files, `check-index`, `check-doc-links`,
`check-config-claims`.
