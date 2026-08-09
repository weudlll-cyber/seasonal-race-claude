# PAIR-REACH-ANALYSIS — is there a distance beyond which a pair cannot matter?

**Branch:** `feat/pair-reach-analysis`, off master `be4202c8`. **ANALYSIS ONLY — no engine code changed.**
One new read-only tool (`scripts/pair-reach-census.mjs`) and this report.

---

## THE ANSWER IN FOUR LINES

1. **YES, the bound exists, and it is tight.** Every effect the main pair loop can have is nested
   inside one of exactly two gates, and both reduce to the same expression. **No effect is unbounded.**
2. **The bound is two-axis, and the Y axis is where the culling is.** At n=100, the t-bound alone
   leaves 18 % of pairs; t AND y together leave **3.4 %**.
3. **The expected saving is ~12–18 % of the step at n=100 — NOT 60 %.** `applyRacerBehavior`'s 59.85 %
   self time contains **three** quadratic loops and this cull addresses one of them. Anyone reading
   "the pair loop is 60 % of the step" and expecting to remove 60 % should read §5.
4. **There is a cheaper win next to it that needs no bound argument at all:** the loop preamble and
   `pairContact` compute **the same six quantities twice for every pair, every step**. That is
   provable by reading, worth ≈ 7 %, and carries no superset proof obligation.

---

## 1. THE DERIVATION — every effect, and the largest dT at which it can fire

The main pair loop is `raceBehavior.js:579-934`. Its body has exactly **two** gates, and every write
it can make is nested inside one of them.

### Gate A — the speed-brake zone (line 619)

```js
if (Math.abs(dY) < brakeSameLaneY && dT < dynamicBrakeT) { … }
  dynamicBrakeT  = (brakeContactLength / pathLength) × config.speedBrakeTMultiplier
  brakeSameLaneY = pxToPhysicalY(brakeContactWidth, trackWidth)
```

Everything inside it: the speed brake (`speedBrakeSet.add`), the look-before-brake free-lane pass
(`_passCandidate`), and the brake-to-match cap (`brakeMatchCaps` / `brakeMatchLeaderIdxs`).

### Gate B — the geometric avoidance gate (line 795)

```js
if (latPx >= latTrigger || longPx >= longTrigger) continue;
  longPx = dT × pairPL      longTrigger = contactLength × (1 + avoidanceBufferPct)
  latPx  = |dY| × pairTW/2  latTrigger  = contactWidth  × (1 + avoidanceBufferPct)
```

Everything inside it: soft steering §4a (`assignSoftTarget`), and the overlap block §4b, which is
further gated by `dT <= tHalfSpan` — strictly tighter, so it adds no reach.

### They are the same geometry

`brakeContactLength === contactLength`, `brakeContactWidth === contactWidth`,
`trackWidth === pairTW`, `pathLength === pairPL` — the two sites compute them with identical
expressions (§6). So the union of the two gates is:

```
dT_max(pair) = (contactLength / pathLength) × max(speedBrakeTMultiplier, 1 + avoidanceBufferPct)
             = (contactLength / pathLength) × max(1.5, 1.2)  =  (contactLength / pathLength) × 1.5

dY_max(pair) = (contactWidth / (trackWidth/2)) × max(1, 1 + avoidanceBufferPct)
             = (contactWidth / (trackWidth/2)) × 1.2
```

**Nothing else in the loop can act.** A pair outside both bounds executes zero writes. The two
multipliers are read from `defaults.js`, not typed — the census tool reads them the same way, so the
tool cannot drift from the config the way the 2026-06 derivation drifted from its gate (§7).

### The FIELD bound, which is what an implementation can use

A prefilter must decide before it knows the pair's bodies. Replace `contactLength` with the largest
body in the field and `trackWidth` with the field's:

```
boundT = (max_i bodyLength_i / pathLength) × 1.5
boundY = (max_i bodyWidth_i  / (trackWidth/2)) × 1.2
```

`boundT >= dT_max(pair)` and `boundY >= dY_max(pair)` for every pair, so **skipping a pair outside
the field bound provably skips a pair both gates would have rejected.** That is the same superset
shape SIDE-FREE-CULL-1 used, and it is why this is safe.

### THREE conditions on that safety, all of them live

- **The degenerate fallbacks are NOT geometric.** When `trackWidth <= 0` the gate uses
  `config.speedBrakeYThreshold` (0.18) and when `pathLength <= 0` `dynamicBrakeT` falls back to a
  flat `0.014`. Neither is derivable from bodies, so a geometry-derived bound is **wrong** in that
  case. The prefilter must be guarded by `trackWidth > 0 && pathLength > 0` exactly as the
  look-before-brake gate already is (line 649), and fall through to the unculled path otherwise.
- **`boundY` assumes track width is UNIFORM along the track.** It is today — `getTrackWidthAtTpx`
  returns the constant `racer.trackWidthPx` — but the function carries an explicit extension comment:
  *"For non-uniform tracks (no `_centerWidth`): extend here with racer.t per-frame lookup."* The day
  that extension lands, `boundY` must become `max body width / (MIN track width / 2) × 1.2` or the
  cull stops being a superset. **This is a named expiry condition, not a hypothetical.**
- **Mixed racer types widen the field bound.** In the census every row has `exact == field bound`
  because `track-default` gives one racer type per track, so all bodies are identical. A mixed field
  makes the field bound looser than the per-pair bound — still safe (it is a superset), just less
  effective. The numbers below are therefore a best case for a homogeneous field; the safety argument
  is unaffected.

---

## 2. THE CENSUS — how many pairs actually fall inside

`node scripts/pair-reach-census.mjs --racers=30,70,100 --samples=24 --seconds=60`, all ten tracks,
raw output in [reports/perf/pair-reach-analysis/census.json](../perf/pair-reach-analysis/census.json).
Read-only: it builds a race with `buildRace`, steps it with `stepRacePhysics`, and reads `st.racers`
between steps. It is not a timer.

| field | mean pairs inside boundT | mean inside boundT **and** boundY | worst TRACK | worst single STEP (t only) |
|---|---|---|---|---|
| n=30 | 34.3 % | **8.8 %** | 18.5 % (garden-path) | 100 % |
| n=70 | 23.3 % | **4.8 %** | 10.2 % (garden-path) | 75.7 % |
| n=100 | 18.2 % | **3.4 %** | 8.0 % (garden-path) | 52.0 % |

**The t-axis alone is a weak filter and the Y-axis is the strong one.** That is the opposite of what
the 2026-06 attempt assumed, and it is why that attempt failed (§7): it built a sorted t-window and
nothing else.

**The worst single step is the START LINE**, where the field is in rows and every pair is within a
body length. At that moment the cull saves nothing — 100 % of pairs are inside the bound on
garden-path, seatrack and space-sprint. The cull is a mid-race and late-race win; it does not help
the grid.

Per-track detail (n=100), sorted by how much survives:

| track | inside t | inside t&y | path length px | boundT |
|---|---|---|---|---|
| garden-path | 34.3 % | 7.96 % | 4 773 | 0.00763 |
| searound | 11.5 % | 4.58 % | 5 147 | 0.00922 |
| river-run | 20.2 % | 3.80 % | 13 061 | 0.00262 |
| dirt-oval | 15.8 % | 2.97 % | 6 541 | 0.00703 |
| seatrack | 20.4 % | 2.96 % | 12 256 | 0.00453 |
| ice-track | 13.4 % | 2.61 % | 6 065 | 0.00689 |
| luger-hill | 12.8 % | 2.40 % | 10 347 | 0.00564 |
| space-sprint | 20.7 % | 2.35 % | 19 772 | 0.00249 |
| city-circuit | 14.4 % | 2.34 % | 6 130 | 0.00539 |
| mountainstreet | 18.2 % | 2.19 % | 15 665 | 0.00197 |

**Garden-path is the hard case** and it is the shortest track: a fixed body length is a larger
fraction of a 4 773 px lap than of a 19 772 px one, so its bound is the widest in lap-normalised
terms. Any acceptance threshold should be set on garden-path, not on the mean.

---

## 3. THE PRICE — and why it is not 60 %

From SIDE-FREE-CULL-1's stored profile at n=100 (`prof-chain-n100.selftime.json`, no re-measure):

```
applyRacerBehavior   59.85%     pairContact    7.02%     isSideFree   6.07%
stepRacePhysics       4.78%     (gc)           5.24%     stablePairBit 1.30%
normalizeAngle        1.15%     assignSoftTarget 1.15%   buildTIndex   0.83%
```

**`applyRacerBehavior`'s 59.85 % self time contains THREE quadratic loops**, all inline, all
attributed to the same frame:

| loop | iterations | this cull helps? |
|---|---|---|
| the avoidance pair loop (579-934) | n(n−1)/2 | **yes** |
| the DRAFTING loop (1120-1143) | n(n−1) ordered, world-space, bounded by `draftingMaxDistance` = 80 px | no — different metric |
| the HARD-SEPARATION pass (1177+) | n(n−1)/2, bounded by its own tolerance | no — separate pass, own gate |

The stored profiles are function-level only (`hitCount`, no `positionTicks`), so **the split between
those three is not resolvable from the data on disk, and I am not going to invent it.**

What *is* resolvable, by reading rather than timing:

- **`pairContact` = 7.02 %** and it is called exactly once per pair, for every pair, before gate B.
  A prefilter skips 96.6 % of those calls → **≈ 6.8 % of the step.**
- **The loop preamble (lines 590-599) computes the SAME six quantities as `pairContact`** — see §6.
  Same inputs, same expressions, same results, twice per pair. So the preamble costs about what
  `pairContact` costs: **≈ 7 %**, of which 96.6 % is skipped → **≈ 6.8 %.**
- `shortestArcDeltaT` (0.77 %) is needed by the prefilter itself, so it is not saved.
- The gate arithmetic, the trailer/leader determination and `dynamicBrakeT` add perhaps 1–3 %.

**Estimate: 12–18 % of the physics step at n=100.** Lower at n=30 (≈ 8–12 %, since 8.8 % of pairs
survive instead of 3.4 % and the constant costs are a larger share). This is a step saving, not a
frame saving — drawing is not in this harness.

**The one number this analysis cannot produce is the real one.** The implementing block must run the
existing `phys-bench-matrix.mjs` A/B/A against master and quote the ratio, because absolute
milliseconds on this machine are not portable (PHYS-BENCH-1 §confound).

---

## 4. THE CHEAPER WIN, and it needs no bound at all

Lines 590-599 and `pairContact` (line 270) compute the same six values from the same two racers:

| line 590-599 | `pairContact` | identical? |
|---|---|---|
| `getFrameSizePx(rA) / (rB)` | same two calls | yes |
| `hlA_b, hlB_b, hwA_b, hwB_b` | `hl_A, hl_B, hw_A, hw_B` | yes — same expressions |
| `brakeContactLength = hlA_b + hlB_b` | `contactLength = hl_A + hl_B` | yes |
| `brakeContactWidth = hwA_b + hwB_b` | `contactWidth = hw_A + hw_B` | yes |
| `trackWidth = max(getTrackWidthAtTpx…)` | `pairTW = max(getTrackWidthAtTpx…)` | yes |
| `pathLength = max(getPathLengthPx…)` | `pairPL = max(getPathLengthPx…)` | yes |

**Every pair pays for this twice, every step.** Computing it once and using it in both places is a
pure deduplication: no bound, no superset argument, no window, nothing to prove beyond "the two
expressions are the same", which the table above establishes by reading. Worth **≈ 7 %** of the step
and it is strictly less risky than the cull.

SIDE-FREE-CULL-1 already flagged `pairContact` as cacheable in its noticed-but-left. This is the same
observation with the duplicate named.

**Recommendation: do the deduplication FIRST, as its own block.** It is cheaper, it is provable by
inspection, and it makes the cull's measurement cleaner by removing a confound from the pair body.

---

## 5. THE DESIGN THE IMPLEMENTING BLOCK SHOULD USE

```js
// once per step, BEFORE the loop — O(n), not O(n²)
let maxBodyLen = 0, maxBodyWid = 0;
for (const r of active) { … }                       // one pass over the field
const boundT = pathLength > 0 ? (maxBodyLen / pathLength) * T_MULT : Infinity;
const boundY = trackWidth > 0 ? (maxBodyWid / (trackWidth / 2)) * Y_MULT : Infinity;

// first thing in the pair body, before ANY geometry
const dT = shortestArcDeltaT(rA.t, rB.t);
if (dT > boundT) continue;
const dY = rA.physicalY - rB.physicalY;
if (Math.abs(dY) > boundY) continue;
```

**KEEP THE EXISTING `for i, for j > i` ORDER OVER `active`.** Do not iterate the t-index instead.
Three tie-breaks in this loop are order-sensitive — `brakeMatchCaps` updates on strict `<` (first
found wins), `_ssForceMag` uses `<=` in §4a and `>=` in §4b, and `_ssObstacleNext` records the last
writer. A prefilter that only *skips* pairs leaves the relative order of the survivors untouched, so
no ordering question arises. Reordering the visit would raise all three at once, and that is exactly
the risk SIDE-FREE-CULL-1 avoided by leaving the original predicate in place.

**Keep the original gates.** The bound is a superset, not a replacement — `dynamicBrakeT` and the
gate-B triggers must still decide, exactly as `shortestArcDeltaT(...) > tHalfSpan` still decides
inside the culled `isSideFree`.

### The acceptance criterion

> **The world fingerprint must stay `dc4647be0f55ebdb`.** Camera `ad07c08ce5d8ae49` and render
> `752df7bc61ef0721` must also be unchanged, since neither should be reachable from this diff.
> If the world fingerprint moves, the cull is not a superset — stop and report the diff rather than
> hunting for a way to make it match.

Plus: the existing `raceBehavior.test.js` suite, and a new test per condition in §1 —
`trackWidth <= 0` falls through unculled, `pathLength <= 0` falls through unculled, and a pair sitting
exactly ON each bound is still evaluated (inclusive bound — the same trap SIDE-FREE-CULL-1 named).

---

## 6. THE HISTORY — this was tried in 2026-06 and it REGRESSED

`reports/perf/08-neighbor-pairloop.md` built exactly this idea and `fb988587` reverted it:

> Tier-2 neighbor-limited pair loop: built (report 08), measured against baseline frame log (70
> racers, Space Sprint), **REGRESSED**: mean +0.73 ms, P90 +2.35 ms, max +3.39 ms, worst spike run
> 16→43 frames. Root cause: **per-step sort + evalPair closure overhead not recouped in dense packs**
> (T-break fires on 0 pairs when t-spread < T_WINDOW=0.09).

**Three things have changed, and all three point the same way:**

1. **The sort is already paid for.** SIDE-FREE-CULL-1 added `buildTIndex`, which sorts the field by
   `tFrac` every step for `isSideFree`. It costs **0.83 % at n=100**. The 2026-06 attempt was charged
   for a sort; an implementation today is not — and in fact does not even need the index, because a
   prefilter that keeps the original loop order only needs two scalars.
2. **No closure.** The 2026-06 version wrapped the whole pair body in an `evalPair` closure to make
   the two-pass walk possible. A prefilter is two `continue`s inside the existing loop.
3. **The window is not the same window.** 2026-06 derived `T_WINDOW = avoidanceDistance / tWeight =
   0.090` from the mixed-unit gate, which **no longer exists** — `8292d9db` replaced it with the
   two-axis geometric gate. Today's bound is 0.002–0.010, i.e. **9–45× tighter**, and it comes with a
   Y-axis the old one did not have. The old window was so wide that in a pack it selected everything;
   the honest reading of the 2026-06 failure is that the window was ineffective, not that windowing
   is wrong.

**`reports/perf/11-y-rejection.md` + `12-y-rejection-sweep.md` shipped a Y-rejection at `8bd7180`
and it worked** (P90 21.86 → 16.69 ms, over-budget frames 71 % → 8 %, 65/66 fairness combos). That
rejection was written against the mixed-unit gate and went away with it. **The Y axis being the
strong filter is therefore not a new claim in this report — it is a re-discovery of something this
project already measured once and lost in a refactor.**

This is not in DEAD-ENDS.md. §9 proposes the entry.

---

## 7. IS ANY EFFECT UNBOUNDED? — no, and here is the check

I looked for the three shapes that would kill the idea:

- **An accumulation over all pairs** (a neighbour count, a density, a mean) that changes with far
  pairs. **None.** Every write is inside gate A or gate B.
- **A "nearest" selection over all pairs** whose answer could be a far pair. `_passCandidate` picks
  the lowest-`dT` leader and `brakeMatchCaps` the lowest cap — but both only consider pairs already
  inside gate A, so a far pair can never win. **Bounded.**
- **An effect keyed on something other than (dT, dY).** The drafting loop is exactly this — it is
  keyed on WORLD distance (`draftingMaxDistance` = 80 px) and the leader's heading, not on dT. It is
  bounded, but in a different metric, so **it needs its own tool and is out of scope for this cull.**
  Naming it because it is the second-largest quadratic left in the step.

`_computeBlockedMode` (report 08 §further-optimization) is also O(n²), called only when
`priorityExtras` is provided. Unchanged, unmeasured here.

---

## 8. WHAT I WOULD TELL THE OWNER TO DO

| order | block | risk | worth | proof needed |
|---|---|---|---|---|
| 1 | **Deduplicate the preamble and `pairContact`** | very low | ≈ 7 % | reading — the expressions are identical |
| 2 | **The two-axis prefilter** (§5) | low | ≈ 12–18 % at n=100 | superset argument + fingerprint |
| 3 | the drafting loop's own world-space cull | medium | unmeasured | its own analysis first |

Doing 1 before 2 also makes 2's measurement honest, because it removes a duplicate from the pair
body that would otherwise flatter the cull.

**If the answer had been "no bound", the ceiling would be the answer.** It is not: the bound exists,
it is derived from the bodies, and it is tight. What is NOT true is the hope that it removes the
quadratic — it removes a constant factor, exactly as SIDE-FREE-CULL-1 did. The loop is still
`for i, for j > i` and still O(n²). The ceiling in SIDE-FREE-CULL-1's table moves by roughly the
saving; it does not change shape.

---

## 9. PROPOSED DEAD-ENDS ENTRY (not written — this block changes nothing)

> **Neighbour-limited pair loop by sorted t-window (2026-06-06, reverted `fb988587`).** Built as
> report 08, measured, regressed (+0.73 ms mean at n=70). Cause: the per-step sort and the `evalPair`
> closure cost more than the window saved, because `T_WINDOW = 0.090` selected the whole field in a
> pack. **Do not conclude that windowing the pair loop is dead** — PAIR-REACH-ANALYSIS re-derived the
> bound against today's geometric gate at 0.002–0.010 (9–45× tighter), with a Y axis, and against a
> sort that `buildTIndex` already pays for. The 2026-06 result is evidence about that window and that
> implementation, not about the idea.

---

## SOURCE HYGIENE

| file | before → after | what |
|---|---|---|
| `scripts/pair-reach-census.mjs` | — → 176 | new, read-only; imports `buildRace`/`stepRacePhysics` only |
| `reports/perf/pair-reach-analysis/census.json` | — → new | raw census, 30 rows |
| `reports/night/PAIR-REACH-ANALYSIS.md` | — → new | this |

**No engine file was edited.** `engine-reach --check` result in the reply.

### Noticed but left

- **The census steps a real race to sample pair distances**, so it takes ~4 minutes for 30 rows. It
  samples 24 steps per race, which is enough for the means but coarse for the worst-step column; the
  100 % figures at the grid are certainly real, the 52 % mid-race worst is a sampled maximum and the
  true maximum is somewhere above it.
- **`stablePairBit` is 1.3 % of the step** and hashes `r.name` on every overlapping pair. It is a
  pure function of two names and could be memoised per pair — but a racer's NAME is physics here, so
  that is not a free change and it is not this block's call.
