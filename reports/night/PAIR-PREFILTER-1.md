# PAIR-PREFILTER-1 — a two-axis field bound in front of the pair loop

**Branch:** `feat/pair-prefilter-1`, off `feat/pair-dedup-1`. **One engine file and its test.**
Acceptance was mechanical: WORLD `dc4647be0f55ebdb` unchanged. It is, on all ten per-track hashes.

---

## THE ANSWER IN FOUR LINES

1. **The cull is in and it is a proven superset.** Two `continue`s at the top of the pair body,
   against one O(n) bound computed once per step. The world fingerprint is byte-identical, which is
   the strongest statement available that no pair changed its fate.
2. **It works: `pairContact`'s share of the step falls from 4.19 % to 1.37 % at n=100** — the census
   predicted 96.6 % of pairs would be skipped, and roughly two thirds of that call's cost is gone.
3. **The race is measurably cheaper to compute: the world fingerprint, a fixed 10-track workload,
   runs in 128 s against 153 s.** That is the instrument I trust tonight and the one the handover
   quotes.
4. **The design brief named three safety conditions; there was a FOURTH and it was live.** The flat
   `0.014` brake fallback is per-PAIR, not per-field, and on a long track it is six times wider than
   the geometric bound — so the cull as designed would have skipped pairs gate A still brakes.
   Found by building the test, closed before the fingerprint was ever run.

---

## 1. WHAT WAS BUILT

Once per step, one pass over `active`:

```
boundT = (max body LENGTH in field / MIN path length in field)  x max(speedBrakeTMultiplier, 1 + avoidanceBufferPct)
boundY = (max body WIDTH  in field / (MIN track width in field / 2)) x max(1, 1 + avoidanceBufferPct)
```

then, before any geometry:

```js
const dT = shortestArcDeltaT(rA.t, rB.t);
if (dT > boundT) continue;
const dY = rA.physicalY - rB.physicalY;
if (dY > boundY || dY < -boundY) continue;
```

**MINIMUM path length and MINIMUM track width, not "the" path length.** Both per-pair metrics are a
`Math.max` of the two racers, so they are at least the field minimum; substituting the minimum can
only widen the bound. The same argument with `contactLength = hlA + hlB <= max body length` on the
other axis. Widening is what makes the cull a superset, and a superset is the whole safety argument.

**The original gates stay.** `dynamicBrakeT` and the gate-B triggers still decide. The bound never
replaces a gate — the same shape SIDE-FREE-CULL-1 used, where
`shortestArcDeltaT(...) > tHalfSpan` still decides inside the culled `isSideFree`.

**The `for i, for j > i` order over `active` stays**, and that is load-bearing rather than
conservative. Three tie-breaks in the loop are order-sensitive: `brakeMatchCaps` updates on strict
`<` so the first-found leader wins, `_ssForceMag` compares `<=` in §4a and `>=` in §4b, and
`_ssObstacleNext` records the last writer. A prefilter that only SKIPS leaves the relative order of
the survivors untouched, so none of those three can change hands. Iterating the t-index instead
would have raised all three at once for no extra saving — the bound needs two scalars, not an index.

## 2. THE FOURTH CONDITION — the one the brief did not name

The brief listed three: guard the degenerate fallbacks, write the uniform-track-width expiry at the
bound, keep the bound inclusive. All three are in the code. A fourth turned up while writing the
tests, and it was a real superset violation:

> `dynamicBrakeT` falls back to a flat `0.014` when **the pair's `contactLength` is 0** — not only
> when `pathLength` is 0. That needs two zero-length racers, which the field metrics do not see:
> `pathLength` is fine, so the geometric bound is computed, is finite, and on a long track is
> **smaller** than the fallback. On space-sprint a 31 px body over 19 772 px gives 0.0024 against
> the fallback's 0.014 — **six times tighter**. The cull would have skipped pairs gate A still
> brakes, silently.

Closed by folding the fallback in whenever the field's smallest body length is 0. The literal itself
was written twice in the pair loop as a bare `0.014`; the bound would have been a third copy, and
three copies of a number that must agree is how a bound and a gate drift apart. It is now
`DEGENERATE_BRAKE_T`, declared once, read in all three places.

**Its lateral twin does NOT exist, and that was checked rather than assumed:** `contactWidth === 0`
makes `brakeSameLaneY` 0, and `|dY| < 0` can never hold, so a pair with no width cannot fire on gate
A at all — which is also why the first version of the test, using a fully bodiless pair, correctly
failed. The case that bites is width WITHOUT length.

## 3. THE TESTS, AND WHAT EACH ONE IS FOR

Seven, in `raceBehavior.test.js`. Every one was sabotaged and each is caught by exactly one:

| test | sabotage that must fail it | caught |
|---|---|---|
| CONDITION 1a — no track width falls through unculled | — (documents the 0.18 fallback path) | — |
| CONDITION 1b — zero-LENGTH pair falls through | drop the `DEGENERATE_BRAKE_T` fold | ✓ |
| CONDITION 1b — the geometric bound really is tighter here | (guards 1b against going vacuous) | — |
| CONDITION 2 — field MINIMUM track width | `min` → `max` on track width | ✓ |
| CONDITION 3 — the outermost firing pair is never culled | drop the `x1.5` multiplier | ✓ |
| field MAXIMUM body (mixed field, both axes) | `max` → `min` on body length; and on body width | ✓ ✓ |
| field MINIMUM path length | `min` → `max` on path length | ✓ |

**Removing the prefilter entirely still passes all seven, deliberately.** They assert the SUPERSET
property — that nothing is lost — not that the cull exists. The cull's existence is a performance
claim and is measured, not asserted.

**CONDITION 3 is weaker than the brief asked for, and that is stated rather than hidden.** The brief
wanted a test that a pair sitting exactly ON the bound is still evaluated. It cannot be observed:
**both gates are strict on both axes**, so a pair exactly on the bound is rejected by the gate
whether the prefilter culls it or not — `>=` passes the test too, which I checked. The `>` is kept
anyway, because `>=` would make the cull depend on two differently-written float expressions being
bit-identical, and the test was rewritten to pin the property that IS observable: the outermost pair
a gate can still act on, one representable step inside the bound, must fire.

## 4. ACCEPTANCE

| | |
|---|---|
| WORLD | `dc4647be0f55ebdb` — **unchanged**, all ten per-track hashes identical |
| engine tests | 257 pass (behaviour, brake-match, warmup ramp, raceStep, headless sim) |
| hull | 20 files, unchanged — no new import, so the generated block in `docs/SIM.md` is untouched (`gen-engine-reach-doc --check`: current) |

The per-track hashes matter more than the combined one: ten matching hashes cannot be two
compensating errors.

## 5. THE MEASUREMENT — and which instrument to believe

### 5a. The one that answers it: fixed work, the world fingerprint

The world fingerprint is ten tracks x three races of pure engine work in one process, and it reports
its own elapsed time. Same work every run, so wall time IS the comparison — no percentile, no
sampling. Interleaved A/B/C so drift moves all three arms alike. Every run produced the same hash.

| pass | prefilter | piece 1 (dedup) | master `24d1ed2c` |
|---|---|---|---|
| 1 | 126.1 s | 158.1 s | 163.6 s |
| 2 | 130.5 s | 147.1 s | 157.1 s |
| **mean** | **128.3 s** | **152.6 s** | **160.4 s** |

- **prefilter vs piece 1: 0.84 — the race costs 16 % less to compute.**
- **prefilter vs master: 0.80 — 20 % less.**
- piece 1 vs master: 0.95, i.e. the dedup contributed ~5 %, at the edge of this instrument's spread
  and consistent with PAIR-DEDUP-1's finding that V8 had already removed that duplicate.

Arm-to-arm spread is 3.5 % (prefilter), 7 % (piece 1) and 4 % (master), so a 16 % separation is
outside it and a 20 % one comfortably so. **All six runs produced `dc4647be0f55ebdb`**, which is the
same acceptance evidence collected six more times.

### 5b. Why it works: the profile

Self-time share at n=100, `--cpu-prof`, prefilter against piece 1:

| | piece 1 | prefilter |
|---|---|---|
| `pairContact` self | 4.19 % | **1.37 %** |
| `applyRacerBehavior` self | 67.85 % | 69.67 % |

`pairContact` loses two thirds of its cost — the census predicted 96.6 % of pairs would be skipped at
n=100 and this is that prediction landing. `applyRacerBehavior`'s share RISES, which is not a
regression: share is normalised against a total that fell, so the work that remains is a larger
fraction of a smaller step. **This is why share is the wrong instrument for a change that reduces
total time, and why §5a is the headline** — the opposite of PAIR-DEDUP-1, where the total did not
move and share was exactly the right tool.

### 5c. The one that could not answer it: `phys-bench-matrix`

Five A/B/A sessions at n=30/70/100, and it does not resolve this change either. Its own control —
identical code compared with itself — reports **+9 % to +14 %**, and the fixed-work totals from the
same raw samples carry ±9 % to ±25 % spread per arm.

| n | fixed-work per-step, prefilter ÷ piece 1 | spread on the two arms |
|---|---|---|
| 30 | 0.94 | ±12 % / ±18 % |
| 70 | 1.06 | ±26 % / ±18 % |
| 100 | 0.95 | ±9 % / ±14 % |

PAIR-DEDUP-1 measured this harness's noise floor at 5–30 % on this machine; tonight it is at the top
of that range, and n=70 comes out the wrong way round. Nothing here should be quoted.

### 5d. THE CEILING TABLE IS NOT RE-DERIVED, and here is why

SIDE-FREE-CULL-1's table — the largest field with two physics steps plus a frame's drawing inside
16.7 ms — needs per-step cost at several field sizes, and the only instrument that produces that is
the one in §5c. Fitting a quadratic through those three points and solving gives +5 % to +7 %, which
is **inside the ±9–26 % of its own inputs**, so it would be a number with no information in it. It
is left unstated rather than printed with a caveat nobody would carry.

**What would answer it**, named so the next block does not rediscover the problem: the fixed-work
form of §5a at several field sizes — a fixed step count run to a fixed end in ONE process per arm,
reporting total wall time, rather than percentiles over 3 000 steps in a fresh process each time.
That is a change to `phys-bench.mjs`, not a longer sweep. Against a ~16 % whole-workload saving the
ceiling has certainly moved up; by how much is not measured.

---

## SOURCE HYGIENE

| file | what |
|---|---|
| `client/src/modules/raceBehavior.js` | the field scan + two `continue`s; `DEGENERATE_BRAKE_T` named and its two bare literals replaced |
| `client/src/modules/raceBehavior.test.js` | seven tests, all sabotage-checked |
| `reports/perf/pair-prefilter-1/**` | five A/B/A sessions + one profile pass per arm, raw |

`engine-reach --check` selects `raceBehavior.js`, as it must. WORLD minted and unchanged, so nothing
is owed to `docs/fingerprints.json`.

### Noticed but left

- **The bound is loosest exactly where the field is densest.** At the start line every pair is within
  a body length and the cull saves nothing — PAIR-REACH-ANALYSIS measured 100 % of pairs inside the
  bound on three tracks at the grid. This is a mid- and late-race win by construction.
- **`boundY`'s expiry condition is live.** `getTrackWidthAtTpx` carries the extension comment for
  non-uniform tracks; the day it lands, the field MINIMUM stops being a bound on what a pair sees
  and `boundY` must be re-derived against the track's narrowest point. Written at the bound.
- **The drafting loop (n(n−1), world-space, `draftingMaxDistance` 80 px) is untouched** and is now
  the largest quadratic left. It is bounded, but in a different metric, so it needs its own analysis.
- **`isSideFree` is ~6.4 % of the step** and is the next-largest named callee.
