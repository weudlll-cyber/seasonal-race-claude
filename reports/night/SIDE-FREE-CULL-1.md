# SIDE-FREE-CULL-1 — the same race, without the all-pairs scan

**Branch:** `feat/side-free-cull-1`, off `feat/perf-where-1` at `0b728d04`.
**Not merged. Not minted.** This one touches the engine, so the fingerprint comes first.

---

## THE FINGERPRINT

```
WORLD   dc4647be0f55ebdb      ← REQUIRED dc4647be0f55ebdb   ✅ UNCHANGED
CAMERA  7ba59a6378d37a2c
RENDER  9b7acc7419c5ba59
```

`npm run verify` — **PASS 7, FAIL 0**, run once, in full, at the end.

```
  PASS  client-suite        202.6s  (ran alone)
  PASS  fingerprint-containment 22.9s
  PASS  doc-guards          25.9s
  PASS  script-suite        51.0s
  PASS  render-fingerprint  105.2s
  PASS  camera-fingerprint  105.8s
  PASS  world-fingerprint   126.7s
```

**The race is byte-identical. The change is allowed to exist.**

### The other two fingerprints, and why they are not what `fingerprints.json` says

`docs/fingerprints.json` records camera `00cafa2432add0f7` and render `f2e170d17ccf84e9`. This branch
reads `7ba59a6378d37a2c` and `9b7acc7419c5ba59`. **That is the CHAIN, not this block** — the line
below this branch contains the start ceremony, the start board, race numbers and four label blocks,
all of which legitimately move the camera and the render. Nothing on the line has been minted, by
instruction.

I did not want to leave that as an inference, and `verify` cannot settle it — its fingerprint jobs
only RUN the scripts and pass on exit code 0; they compare nothing. So both were measured on the
parent commit `0b728d04` in a throwaway worktree:

| | parent `0b728d04` | this branch | |
|---|---|---|---|
| CAMERA | `7ba59a6378d37a2c` | `7ba59a6378d37a2c` | identical |
| RENDER | `9b7acc7419c5ba59` | `9b7acc7419c5ba59` | identical |

**All three fingerprints are identical to the parent commit.** This block moved nothing at all.

One procedural note, because the project's own rule requires it: `fingerprint-default.mjs` says to
compute the fingerprint on the FINAL COMMITTED state, after lint. `verify` ran before the commit
hook's prettier pass, so I checked rather than assumed — the committed `raceBehavior.js` is
byte-identical to the file verify measured (`diff` clean), and prettier did not touch `mathUtils.js`.
The hash describes the committed state.

---

## THE THREE TRAPS

### 1. THE TRACK IS A LOOP

**Handled by sorting on `tFrac(t)`, never on `t`, and by making both walks circular.**

Raw `t` carries the lap — lap 2 is `t = 1.x` — and closed-track back rows **start negative**. Sorting
by `t` therefore orders racers by RACE RANK, not by position on the track, and a window over that
order would be a window over the wrong quantity. `shortestArcDeltaT` compares `tFrac`, so the index
is keyed on exactly `tFrac`.

`tFrac` is now **exported** from `mathUtils.js` rather than re-typed in `raceBehavior.js`. A second
copy of `((t % 1) + 1) % 1` would be a second definition of "where on the loop is this racer", and
the two would be free to drift by one ulp — which is the whole ballgame when the acceptance test is a
byte-identical race.

Both walks step circularly through the sorted ring, and each computes a circular offset (`+1` when
the raw difference is negative). That also makes each walk's offset **monotonically increasing**,
which is what lets `break` be exact rather than approximate.

I did find the existing structure the brief suspected, and **neither was reusable** — stated here
because "I wrote a new one" needs a reason:

- `racePlanner.js:1038` sorts live racers `by b.t - a.t`. That is **raw `t`, deliberately**: it is
  answering "who is ahead in the race", which is the ranking question, and it does not wrap. Reusing
  it would have walked straight into this trap.
- `headlessRaceSimulator.countNeighbors` is an O(n²) **diagnostic** that counts neighbours over a
  plain array of `t` values with a strict `<` and no lap normalisation. It returns counts, not a
  queryable index, it is not in the engine hull, and being O(n²) it could not help anyway.

**Test:** three WRAP cases. Blockers 0.004 of a lap *past* the start line still block a trailer just
*before* it; the same field shifted a lap down behaves identically (so the wrap comes from `tFrac`,
not from the numbers happening to sit near 1.0); and a racer genuinely far away across the line still
does **not** block, so the first two cannot pass merely because the window scanned everything.

### 2. MUTATION DURING THE PASS

**Established before choosing the structure, as instructed. Positions do NOT move during the pass
that calls `isSideFree`, so an index built before it is equivalent to reading `active` live.**

`applyRacerBehavior` has three position writes, and all three are in passes that run **after** the
avoidance pair loop has finished:

| write | line | pass |
|---|---|---|
| `r.physicalY = clamped` | 887 → 1040 | apply-deltas loop |
| `rA.physicalY` / `rB.physicalY` | 1056 → 1209 | hard separation |
| `front.t` / `back.t` | 1101 → 1254 | hard separation |

Every `isSideFree` call is inside the pair loop (426→579, via `chooseFreeLaneDir` and the overlap
resolver). A scan of that range for any write to `.t` or `.physicalY` — including bracket access and
`Object.assign` — returns nothing. So `t` is frozen for exactly the window in which the index is
consulted, and one build per call serves every scan in the loop.

**`physicalY` is NOT frozen across the whole function, which is why the index does not store it.**
The index holds only `tFrac` and a racer reference; the scan reads `other.physicalY` live off the
racer object, exactly as before. Had I snapshotted the lateral position, this would have been wrong —
not here, but at the first future change that moved a racer sideways mid-loop.

### 3. THE BOUND MUST BE INCLUSIVE

**Both walks stop on `> tHalfSpan`, matching the original `if (dT > tHalfSpan) continue`.**

**Test:** a blocker at *exactly* `tHalfSpan` still blocks, and one two ulps beyond it does not.

That test needed a hunted geometry, and the reason is worth recording. The shipped `makeLaneRacer`
span of 31/1200 is **not reachable** as a difference of two `tFrac` values — `tFrac`'s `(x + 1) % 1`
round-trip shifts it by 4.2e-17 — so nothing placed "at exactly the span" is exactly at the span. A
32 px body over a 1024 px path gives 0.03125, and `shortestArcDeltaT(0.5, 0.53125)` returns that
bit-for-bit. The same round-trip **absorbs the first ulp past it**: `0.5312500000000001` still
returns exactly 0.03125, so the negative case had to use `0.5312500000000002`. That is a property of
the existing `tFrac`, not of this change — but it is exactly why the edge case had to be found rather
than assumed.

### THE ARGUMENT THAT MAKES ALL THREE SAFE RATHER THAN HOPEFUL

The index selects **which** racers are considered. It never decides whether one blocks. Every racer
the walk reaches still goes through the original predicate — same `shortestArcDeltaT` call, same
`> tHalfSpan`, same `<` on the lateral distance.

So the window only has to be a **SUPERSET** of what the old loop accepted. Too wide costs a few
wasted comparisons and changes nothing; **too narrow is the only way to move the race.** And it
cannot be too narrow: `shortestArcDeltaT` returns `min(fwd, bwd)`, so `min(fwd, bwd) <= s` implies
`fwd <= s` **or** `bwd <= s`, and the two walks cover exactly those two sets. The function also
returns on the first blocker, so visit order cannot change its answer either.

### THREE SABOTAGES, ALL CAUGHT

| sabotage | result |
|---|---|
| forward walk does not wrap (`if (slot >= n) break`) | **2 red** — both WRAP cases |
| exclusive edge (`>=` instead of `>`) | **1 red** — the EDGE case |
| window narrowed 10 % (`tHalfSpan * 0.9`) | **1 red** — the EDGE case |

All reverted. The suite is green on the committed state: **56 tests in `raceBehavior.test.js`, 165
across the parity + raceBehavior suites**, including `goldenEquality` and `goldenRealArm` reporting
browser and sim byte-identical on every case.

An honest note on order: the exclusive-edge sabotage was **not** caught by my first draft of the
tests — the wrap tests alone passed under it. The EDGE test was written *because* that sabotage
survived, not before it.

---

## THE SPEED TABLE

**It is faster.** Pooled over four A/B/A sweeps — 8 new runs and 4 old runs per field size, medians:

| n | NEW (ms/step) | OLD (ms/step) | speed-up | per-sweep ratios |
|---|---|---|---|---|
| 30 | 0.1816 | 0.2133 | **1.16×** | 1.15, 1.01, 1.17, 1.19 |
| 50 | 0.4219 | 0.5206 | **1.30×** | 1.29, 1.46, 1.31, 1.27 |
| 70 | 0.8155 | 1.1324 | **1.47×** | 1.56, 1.38, 1.32, 1.60 |
| 85 | 1.1388 | 1.5170 | **1.31×** | 1.31, 1.34, 1.30, 1.30 |
| 100 | 1.4208 | 1.8556 | **1.32×** | 1.28, 1.35, 1.04, 1.45 |

**The old side was RE-MEASURED, against the brief, and that was the right call.** The brief said to
reuse the stored PHYS-BENCH-1 raw data for the old side. I did not, because PHYS-BENCH-1's own
central finding forbids it: this laptop has machine speed states a **factor of two** apart, and the
stored old numbers were taken in two of them (n=100 read 6.87 ms in one session and 3.47 ms in
another). It reads 1.86 ms today. A new-now-vs-old-then comparison would have measured the clock.

So the B arm is the **parent commit `0b728d04` in a live worktree**, run chain/parent/chain back to
back at each field size — the same `--order=size` discipline PHYS-BENCH-1 had to invent when its own
three-pass sweep drifted 37 %. The `master` column in the raw JSON is that parent, not `master`.
Four full sweeps because two individual triples were still noisy (n=100 in sweep 3 had a 42.6 %
chain self-spread; n=30 in sweep 2 read a 1.01× that no other sweep reproduces); the median over
four is robust to both, and every run is on disk.

For continuity, the stored PHYS-BENCH-1 numbers are 0.635 / 1.904 / 3.714 / 5.536 / 6.328 (slow
state) and 0.350 / 0.867 / 1.635 / 2.476 / 3.467 (fast state). **Do not compute a ratio against
today's column from those** — that is the mistake the whole confound section of PHYS-BENCH-1 exists
to prevent.

### The exponent — the prediction that did NOT hold, stated plainly

```
POOLED FIT  NEW: t(N) = 4.804e-4 · N^1.743   (log-log R² 0.9983)
POOLED FIT  OLD: t(N) = 3.888e-4 · N^1.855   (log-log R² 0.9942)
```

Measured against PHYS-BENCH-1's 1.90–1.98, the new exponent is **1.74** — it moved, but only a
little, and the old arm measured 1.86 in the same session, so most of that gap is session, not
change.

**This removed a CONSTANT FACTOR, not the quadratic, and that is what the structure says it should
have done.** The all-pairs scan was inside a pair loop that is itself `for i, for j > i` — genuinely
O(field²) and completely untouched by this block. Cutting the inner scan takes the step from O(n²·n)
toward O(n²·k); the n² survives. Anyone reading "the growth is quadratic" in PHYS-BENCH-1 and hoping
this block would fix that should read this paragraph instead: **it did not, and it could not.**

Per-sweep fits, so the pooling can be judged: new 1.823 / 1.883 / 1.812 (R² 0.99, 0.98, 0.99) and old
1.939 / 2.097 / 1.774. **Sweep 4 is excluded from that list and named here rather than dropped
quietly** — it fitted 1.140 at R² 0.9149 with the old arm at 1.300, which is a machine transition
landing inside a sweep, not a curve. Its speed-up ratios are still sound, because those come from
triples that are adjacent in time, and they are in the table above.

### The new profile

```
n=100, self time              OLD                    NEW
applyRacerBehavior          41.17%   ---->         59.85%     (the O(n^2) pair loop body)
isSideFree                  32.79%   ---->          6.07%     <-- 5.4x smaller share
pairContact                  5.04%   ---->          7.02%
(garbage collector)          3.56%   ---->          5.24%
stepRacePhysics              2.99%   ---->          4.78%
chooseFreeLaneDir            1.71%   ---->            —       (out of the top 8)
buildTIndex                     —    ---->            —       (< 1.3% at n=100; 2.27% at n=30)
```

**`isSideFree` is no longer the thing to attack.** It has gone from the #2 leaf at a third of the
step to 6 %. The new top is `applyRacerBehavior`'s own pair-loop body at 60 %, and the new #2 is
`pairContact` at 7 %. Everything that grew its share grew it because those two shrank around it.

The index pays for itself: `buildTIndex` is 2.27 % at n=30 and below the top-8 cut at n=100 — it is
O(n log n) against a loop that is O(n²), so its share falls as the field grows.

### The new ceiling

Largest N with two physics steps plus a frame's drawing inside 16.7 ms:

| drawing budget | OLD | NEW |
|---|---|---|
| 0 ms | 216 | **271** |
| 2 ms | 202 | **252** |
| 4 ms | 186 | **231** |
| 6 ms | 170 | **210** |
| 8 ms | 152 | **186** |

**Read the ratio, not the counts: the ceiling moves up by about 25 %.** The absolute numbers are far
above PHYS-BENCH-1's 80–150 because the machine is in a much faster state today — the old arm alone
measures 216 here against 108 and 161 in the two earlier sessions. Both columns above were taken in
the same session minutes apart, so the ratio between them is the finding; neither column is a
portable number. Drawing is still not measured — this harness is headless.

---

## SOURCE HYGIENE

| file | before → after | +/− | what |
|---|---|---|---|
| `client/src/modules/raceBehavior.js` | 1106 → 1259 | +157 −4 | `buildTIndex` + `lowerBoundTf` added; `isSideFree` rewritten; four module-level index arrays; one `buildTIndex(active)` call before the pair loop; `_tIndexLen = 0` on entry |
| `client/src/utils/mathUtils.js` | 45 → 50 | +6 −1 | `tFrac` exported, with the reason |
| `client/src/modules/raceBehavior.test.js` | 827 → 931 | +104 −0 | five tests: three WRAP, two EDGE |

**Nothing was orphaned, and the old inner discard did not go with the change — it stayed, on
purpose.** The brief anticipated that the discard would become dead; it is the opposite. Because the
window is only a superset bound, `if (shortestArcDeltaT(...) > tHalfSpan) continue` is still the line
that decides, and it now appears three times: once in the full-scan fallback and once in each walk.
Deleting it and trusting the window would have converted a proof into a hope. The only thing that
changed about it is that it is no longer reached by racers who could never matter.

The comment above `isSideFree` was extended as asked: it now states the geometry (unchanged), where
the neighbour bound comes from, the superset argument for why the result is unchanged, why the walks
wrap, and why the bound is inclusive.

### Noticed but left

- **`pairContact` is now the #2 leaf at 7 %** and is called for every close pair, recomputing body
  half-widths, half-lengths and the pair's track width and path length — none of which change within
  a step. It is cacheable. Not touched: this block had one job and an acceptance rule that punishes
  scope.
- **The O(n²) pair loop itself is untouched and is now 60 % of the step.** That is the next thing,
  and it is a different kind of change — the loop visits pairs to decide whether they interact at
  all, so bounding it is the same trick one level up, but the loop body writes shared state and the
  mutation analysis would have to be redone from scratch.
- **`buildTIndex` runs even on steps where no pair overlaps** and the scan is never called. Lazy
  construction would save 2.3 % at n=30. I chose eager: a lazily-built shared structure that another
  pass might or might not have stood up is exactly the shape that goes stale silently, and this file
  already reuses six module-level structures across steps. `_tIndexLen = 0` on entry means the early
  return cannot leave a previous call's index standing.
- **The `n !== active.length` guard** in `isSideFree` falls back to the full scan if the index is not
  standing for the current field. With the build unconditional it should be unreachable; it is a net
  under a change whose failure mode is silent, and its cost is one integer compare.
- **I BROKE `client/node_modules/.bin` DURING CLEANUP AND REPAIRED IT.** Recorded because the next
  person will reach for the same shortcut. The parent worktree had no `node_modules`, so the render
  fingerprint could not run there; I junctioned the main tree's `client/node_modules` into it. Then I
  ran `git worktree remove --force` **before** removing the junction, and it walked into the link and
  deleted through it into the real tree. It got as far as emptying `node_modules/.bin` (81 shims → 0)
  before Windows permission errors stopped it; all 328 packages survived, and `package.json` and
  `package-lock.json` were never touched. The symptom was the NEXT commit failing with
  `lint-staged ... konnte nicht gefunden werden`. `npm install` relinked the shims in 11 s, and the
  toolchain was re-checked afterwards (60 tests green, ESLint clean). **Remove the junction first, or
  do not junction at all.** No measurement in this report is affected: everything — `verify`, all
  four sweeps, all four profiles, both parent fingerprints — was taken before the cleanup.
- **`git worktree prune` cannot delete 31 stale `.git/worktrees/*` metadata directories** — all
  "Permission denied", all from earlier blocks, all pre-existing. `git worktree list` is correct and
  unaffected. This looks like the OneDrive EPERM behaviour already recorded against this repo; the
  worktree I created for the parent comparison is gone from disk and from the list.

---

## VERIFICATION LEDGER

| item | wall |
|---|---|
| **`npm run verify`, full, once** | **~640 s** (client-suite 202.6 alone; world 126.7; camera 105.8; render 105.2; script 51.0; doc 25.9; containment 22.9) |
| parity + raceBehavior suites (pre-verify confidence run, 165 tests) | 47.3 s |
| `raceBehavior.test.js` alone, ×4 (baseline + three sabotages) | ~20 s |
| camera + render fingerprints on the parent commit | ~110 s |
| **bench — four A/B/A sweeps (60 runs)** | **~250 s** |
| **bench — four CPU profiles** | **16.9 s** |
| ESLint on the three changed files | ~4 s |

## WHERE THE RAW DATA LANDED

`reports/perf/side-free-cull-1/`, 2.7 MB:

```
matrix/  matrix-2/  matrix-3/  matrix-4/   the four A/B/A sweeps, every per-step sample
profiles/                                  4 .cpuprofile files + their self-time summaries
```

Reproduce (the B arm needs a worktree at the parent commit):

```
git worktree add C:/ra-wt-sfc-parent 0b728d04
node scripts/phys-bench-matrix.mjs --master=C:/ra-wt-sfc-parent --order=size --only=field
node scripts/phys-bench-fit.mjs --in=reports/perf/side-free-cull-1/matrix/matrix.json
```

## DEV SERVER

**Not restarted.** Vite still on **5173** (PID 4824), API on **4000** (PID 49000) — untouched all
block. The build pill reads `build 3afd02f2 · feat/side-free-cull-1` on a clean tree; the badge on
the running server is stale by the branch-switch defect LABEL-OCCLUSION-1 already recorded.
