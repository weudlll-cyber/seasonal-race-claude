# TRACKSCOPE-DIAG-REACH-1 — one home, two doors

**What this reports:** the outcome of NIGHT-2026-09-26 PIECE 4. The refusal
`scripts/lib/trackScope.mjs` gave the measuring tools ONE home for refusing an empty or unknown
`--tracks=` scope. The `scripts/diag/*.mjs` tools were outside its reach because their calling
shape hands the resolver an already-split list of ids and looks each up per iteration through a
`Map.get(id) → geo`, rather than iterating geometries directly.

**What changed.** `scripts/lib/trackScope.mjs` grew a second entry point,
`resolveTrackScopeIds({tool, ids, all, flag})`. Same refusal wording, same exit code (2), same
provisions ("there is no 'all'", "refusing to run: a filter that matches nothing would report 0
rows and exit 0") — one home, two doors, not two homes. The rule stays: an empty or unknown scope
refuses loudly by name; a valid scope is passed through unchanged.

## The tools brought under the refusal

Five diag tools whose shape is `TRACKS = arg("tracks", <default>).split(",")` and whose scope
reaches a real `loadTracks()`:

| Tool | Flag | Default | Refactor |
| --- | --- | --- | --- |
| `diag/company-ceiling-who` | `--tracks` | `"space-sprint"` | now validated at boot |
| `diag/company-under-floor` | `--tracks` | `"space-sprint"` | now validated at boot |
| `diag/endgame-spec` | `--tracks` | `null` (all tracks) | when passed, validated at boot |
| `diag/headcount-price` | `--track` (singular) | `"space-sprint"` | now validated at boot; the `if (!geo)` early-exit at line 63 is removed as unreachable |
| `diag/sprite-premise` | `--tracks` | `"space-sprint,river-run"` | now validated at boot |

## Proof, per tool

For each refactored tool: the sabotage arm (`--tracks=nope` or `--track=nope`) refuses by name
with exit 2 and prints the ten known tracks; the valid arm produces real rows. Verified once per
tool:

```
$ node scripts/diag/company-ceiling-who.mjs --tracks=nope
diag/company-ceiling-who: --tracks names no such track: nope.
  asked for: nope
  this repository has: city-circuit, dirt-oval, garden-path, ice-track, luger-hill, mountainstreet, river-run, searound, seatrack, space-sprint
  There is no "all" — pass --tracks=<id>[,<id>...] with a KNOWN id to run.
  Refusing to run: a filter that matches nothing would report 0 rows and exit 0.
(exit 2)

$ node scripts/diag/company-ceiling-who.mjs --tracks=space-sprint --seeds=1 --racers=5
… produces a real table …
(exit 0)
```

The same shape holds for `company-under-floor`, `endgame-spec`, `headcount-price` (with
`--track=`) and `sprite-premise` — the sabotage arms all print the same refusal shape with exit 2,
and each tool's valid arm still produces rows.

## The tools NAMED and left alone

Named because their shape RESISTS being brought under the refusal without changing their calling
shape — per the brief: *"Any tool whose shape resists this is NAMED and left alone. Do not force
it."*

**File-based analysers** (they iterate whatever files exist in `--dir=`, not `loadTracks()`, so
they have no natural "known set" to validate against):

- `diag/corridor-default-sum`
- `diag/headcount-price-sum`
- `diag/leader-lag-sum`
- `diag/leader-lag-tc`
- `diag/leader-lateral-ba`
- `diag/leader-lateral-sum`
- `diag/leader-setback-sum`
- `diag/midrace-clip-by-state`
- `diag/midrace-clip-sum`
- `diag/runin-track-sweep`

Their `TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean)` still silently produces
nothing when the arg is empty — which is the exact defect this piece exists to catch. Naming them
here rather than leaving them silent: the reader who hits the defect will find this row.

**Hardcoded or computed scopes** (they do not accept `--tracks` at all):

- `diag/runin-contenders-run` — hardcoded `TRACKS = [...]`
- `diag/runin-level-set-sum` — computes scope from race data (`[...new Set(races.map(...))]`)

Not affected by this piece.

**Multi-line `TRACKS` builders** (would need a bespoke look; left for a later pass to keep this
piece narrow):

- `diag/aim-levers-sum`
- `diag/margin-both-axes-sum`
- `diag/room-floor-estimate`

## The helper's own test

`scripts/lib/trackScope.test.mjs` (new) — 7 tests, 7 passing:

- The second door refuses an unknown id, an empty list, and an empty tracks set (three arms).
- The second door returns the validated ids for a valid scope.
- The original first door still refuses an unknown `--tracks=` and an empty tracks set, and still
  returns the selected geo for a valid arg (regression net).

## What this piece does NOT do

- Does not touch any tool's output format.
- Does not add `--tracks` to a tool that doesn't already accept one.
- Does not change any tool's default scope where it currently runs (the default arg is validated;
  a valid default still validates and is passed through).
- Does not rewrite the file-based analysers' iteration model — that would be a shape change and is
  explicitly out of scope for this piece.

No fingerprint moved. No config value moved. No behaviour changed for the valid case.
