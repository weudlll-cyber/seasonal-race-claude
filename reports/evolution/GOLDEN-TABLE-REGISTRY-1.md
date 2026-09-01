# GOLDEN-TABLE-REGISTRY-1 — the five drifted rows are corrected, three golden cases now run the real body, and nothing went red

**Built and merged. No golden re-pinned, no fingerprint minted, no recorded expectation touched.**
The owner's decision, implemented: `scripts/parity/goldenRunner.mjs`'s `RACER_CONFIGS` now agrees
with the racer-type registry on all ten types.

---

## 1. THE COST, ESTABLISHED AT THE SOURCE BEFORE ANYTHING WAS CHANGED

SPRITE-TABLE-DRIFT-1 claimed the only pinned outcomes were `REAL_ARM_WINNERS` on searound/manta. **An
absence claim from a report is exactly what has gone wrong twice here, so it was re-established by
enumerating every assertion in the parity suite** — `toBe(`, `toEqual(`, `toMatchObject(`,
`toMatchInlineSnapshot` across all seven files — rather than trusted.

**Four pinned expectations exist. Every one depends on a type that already agreed.**

| pinned expectation | file | identity | type | agreed before? |
|---|---|---|---|---|
| `REAL_ARM_WINNERS = {1:13, 7:38, 42:13}` | `goldenRealArm.test.js:57` | searound/manta/40 | **manta** | **yes** |
| `r.order[0] === 'Breeze'`, `r.order[2] === 'Surge'` | `replay.test.js:85-86` | searound/manta/40/seed 7 | **manta** | **yes** |
| identity-drift detection | `replay.test.js:103` | dirt-oval/horse/20/seed 42 | **horse** | **yes** |
| `m.slowdownActive === true` | `goldenCoverage.test.js:63` | `CASES[3]` seatrack/dolphin | **dolphin** | **yes** |

`goldenNegative.test.js` uses `CASES[0]` and `realArmCase` — both searound/manta. Everything else in
the suite is a **live comparison between the two arms** (`expect(a.hash).toBe(b.hash)`, or
browserModel-vs-simModel field equality), which pins nothing.

**So the repair could proceed: it changes which races run and touches no recorded expectation.** Had
any pinned value depended on the five, this piece would have stopped — it did not need to.

**Also checked, and out of scope for a reason rather than by omission:** `speedMultiplier` agrees on
all ten already, and `surfaceClasses` differs on six but is **never read from this table** (verified
by grep — the only occurrences are the definitions themselves). The registry's `surfaceClasses` means
"which surfaces this type may race on"; the soak's one-tag-per-track field is a different question.
Left alone deliberately, and the comment now says so.

## 2. WHAT WAS CHANGED

Five rows, three fields each, to the registry's values:

| type | was | now (registry) |
|---|---|---|
| snail | 44 / 0.75 / 0.5 | **35 / 0.727 / 0.938** |
| motorbike | 44 / 0.35 / 0.8 | **42 / 0.4 / 0.8** |
| duck | 44 / 0.5 / 0.75 | **36 / 0.875 / 0.875** |
| luge | 50 / 0.3 / 0.85 | **80 / 0.313 / 0.641** |
| boarder | 48 / 0.4 / 0.8 | **40 / 0.398 / 0.719** |

Verified after the edit by comparing every entry against `getRacerTypeById(id).config`:
**all ten agree.**

The comment's *"do not fix this table as a drive-by"* warning is **removed**, as instructed — leaving
it would tell the next reader the numbers are deliberate. It is replaced by the invariant (this table
matches the registry; change the racer type, not this) plus the history of why the drift happened.

## 3. WHAT ACTUALLY MOVED — the races changed, and the control did not

The correction is only worth something if the goldens now run different races. Measured by computing
`simArm` hashes with the corrected table and again with the stale values restored in memory:

| case | corrected | stale | changed? |
|---|---|---|---|
| river-run/duck/open-in-range/n=20/seed=3 (`CASES[2]`) | `fca3655a` | `fd754945` | **YES** |
| river-run/duck/open-in-range/n=20/seed=7 (`SPREAD_CASES[1]`) | `b7f32407` | `aa4eb1d6` | **YES** |
| city-circuit/motorbike/closed/n=20/seed=1 (`SPREAD_CASES[0]`) | `2abce6db` | `27928f7f` | **YES** |
| **searound/manta/closed/n=20/seed=1 (`CASES[0]`, control)** | `7f023abd` | `7f023abd` | **no** |

**Three cases now run a different body; the control is untouched to the digit.** That is the
coverage the owner's reasoning bought, and here is the body itself:

| duck at n=20 | bodyNarrow | drawnLength | **aspect** |
|---|---|---|---|
| stale 44 / 0.5 / 0.75 | 28.500 | 42.750 | **1.500** |
| registry 36 / 0.875 / 0.875 | 28.500 | 28.500 | **1.000** |

The auto-scale had equalised the narrow axis either way — which is why the drift was invisible in
width — and the whole error lived in the aspect ratio, exactly where SPRITE-PREMISE-1 said the shape
information survives. **river-run's golden was proving parity for a duck half again too long.**

**snail, luge and boarder are corrected but run in no golden case.** The suite's cases use only
manta, horse, duck, dolphin and motorbike; those three are reachable only through `soak.mjs`, which
takes types as arguments. Their correction is hygiene and future-proofing, not coverage bought today —
stated so it is not counted twice.

## 4. THE SUITE — 50/50, AND NOTHING WENT RED

| run | files | tests | result |
|---|---|---|---|
| **baseline, before the change** | 7 | 50 | **all pass** (46.25 s) |
| **after the correction** | 7 | 50 | **all pass** (53.03 s) |

**No case went red.** The brief was right that a red case would have been a finding rather than a
failure — an aspect-dependent divergence the stale table had been hiding. **There was none**, and
that is a real if quiet result: the browser core and the sim agree on the duck's true square body as
exactly as they agreed on the false elongated one. The equality assertions held because both arms read
the one table and moved together, which is what §1 predicted and what makes the repair safe.

## 5. NO FINGERPRINT IS IN REACH — established by the tool, not asserted

```
$ node scripts/engine-reach.mjs --check scripts/parity/goldenRunner.mjs
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): scripts/parity/goldenRunner.mjs
```

**`engine-reach --check` selected nothing to run**, and named the reason: the file is outside the
engine hull. The product reads the racer-type registry; this table is a harness copy that no shipped
code imports. So the world, world-off, camera and render fingerprints cannot move, and the 80-race
sheet's answer is unchanged. What the change *can* reach is the parity suite, which is why that was
run in full, twice, either side of the edit.

**Browser gate: not applicable** — no client source, no rendering path, no config.

## PROPOSALS

**P1 — the guard, which is GOLDEN-TABLE-REGISTRY-2's whole job.** With the table correct, it needs no
allowlist. That ordering was the owner's and it was the right one.

**P2 (mine) — `surfaceClasses` in this table is dead weight and mildly misleading.** It is never read,
and it disagrees with the registry field of the same name on six of ten types, which invites exactly
the misreading this arc has already paid for twice. Deleting it would remove a false-looking fact; it
is not proposed here because it is unrelated to the coverage this piece is about.

**P3 (mine) — `TRACK_TYPES` (goldenRunner.mjs:90) has no readers.** Grep finds no consumer anywhere in
`scripts/` or `client/src/`. It pairs each track with a type and looks authoritative. Same class as
the table this piece just fixed: a plausible-looking constant nothing checks.
