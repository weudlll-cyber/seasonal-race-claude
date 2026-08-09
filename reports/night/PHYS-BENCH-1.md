# PHYS-BENCH-1 — what a physics step costs, and what moves it

**Branch:** `feat/phys-bench-1`, off `feat/verify-cost-3` at `37bb9f17`.
**Nothing minted. Nothing merged. No engine file edited** — `engine-reach --check` says so, below.

---

## THE ONE-LINE ANSWERS

| # | Question | Answer |
|---|---|---|
| Q1 | Did our work slow the engine? | **No.** At n=100, three back-to-back runs read 3.4683 / 3.4621 / 3.4649 ms — chain vs master **0.1 %**, and the chain's own repeat differs by the same 0.1 %. The commits are indistinguishable. |
| Q2 | How does cost grow with field size? | **Quadratically.** Four independent fits give exponents 1.899 / 1.951 / 1.964 / 1.975, R² 0.993–0.9997. |
| Q3 | How much does pack density move it? | **Almost nothing, and not in the direction expected.** Bunched vs spread is 0.93×–1.09× at n ≥ 50. It does **not** explain 3 vs 7.7 ms. |
| Q4 | Where does the time go? | `applyRacerBehavior` + `isSideFree` = **56 % at n=30, 79 % at n=100**. `isSideFree` alone moves **+16.4 pp**. That is the growth, and it names the thing to attack. |
| Q5 | Does the name set change it? | At n=100, **−1.2 % to +0.0 %** — nothing. At n=70, long +3.4 % / mixed +5.3 %, against a within-arm spread of 0.7–1.9 %. See the caveat: this measures the race a roster produces, not the cost of letters. |

**Q1 says the two commits do not differ, so this block does not go looking for a cause.**
The chain edits no engine file, and the measurement agrees.

---

## THE PREMISE, PROVEN BEFORE ANYTHING WAS TIMED

A chain-vs-master timing comparison is meaningless unless both trees run **the same race**. They do:

- Hash of all 100 racers' `t`, `physicalY` and `lap` after 600 steps: `4ee108f494c6d288` on **both** trees.
- `DEFAULT_CONFIG_WORLD` differs between them, but **only inside its nested `cameraConfig`** — ten
  camera keys added, two removed. Not one physics-bearing key differs.
- The two engine-hull files the chain touches are additive and camera-scoped:
  `autoSpriteScale.js` gains one new exported function (`drawnRacerScreenPx`) and changes nothing
  existing; `defaults.js` moves only the camera keys above.

So the race is byte-identical and the comparison is like-for-like. Had it not been, every number
below would have been a comparison of two different races wearing the same seed.

---

## THE INSTRUMENT, AND HOW IT FAILED FIRST

**The naive A/B/A did not work, and that is worth more than a clean table would have been.**

`--order=pass` runs the whole field sweep three times — chain, master, chain. On this machine the
first sweep came out systematically slower than the third:

```
   n     A chain    B master   A2 chain   |  chain A/A2 self-spread
   50     1.8128     1.7363     1.4824   |  20.1%
   70     3.4508     3.5078     2.7982   |  20.9%
  100     6.3076     4.8851     4.3372   |  37.0%
```

A/B/A cancels a **constant** offset. It does not cancel a **monotone trend** spread over five
minutes, and 37 % of drift is far more than any difference between the commits could be. Part of
the trend was my own tool calls competing for the CPU during passes A and B.

**`--order=size` fixes it** by making the three runs adjacent in time: for each field size, chain,
master, chain, back to back. Same three runs, same A/B/A order; only the outer loop changed. A drift
slow enough to matter over five minutes moves all three of a triple almost equally. The self-spread
collapses to 0.1–3.7 %.

The roster arms got the same treatment as a **palindrome** — `current, long, mixed, mixed, long,
current` — so each arm has two runs placed symmetrically about the block's middle and a linear drift
cancels out of the pair mean. The first roster table, taken during the drifting window, read
**long +27 % and mixed +35 % at n=100**. That was the clock warming up. It is 0.8 % and 1.2 % the
other way once the order is right. **Both tables are on disk; the drifted one is kept as the record
of how badly a naive sweep lies.**

### This machine has two speed states, differing by a factor of two

Intel Core Ultra 7 165U, 1.7 GHz base, 12 cores, with Discord / Chrome / VS Code / OneDrive /
Creative Cloud resident and a **45 % baseline load**. Every field size came out ~2× faster in the
later blocks than the earlier ones — uniformly, at every n:

| n | slow state (ms) | fast state (ms) | ratio |
|---|---|---|---|
| 30 | 0.635 | 0.350 | 1.81× |
| 50 | 1.904 | 0.867 | 2.20× |
| 70 | 3.714 | 1.635 | 2.27× |
| 85 | 5.536 | 2.476 | 2.24× |
| 100 | 6.328 | 3.467 | 1.83× |

**The scale is machine state; the shape is not.** The exponent is 1.964 in the slow state and 1.899
in the fast one. So every RATIO in this report is trustworthy and every ABSOLUTE millisecond is
quoted with its state named. Two triples (n=70 and n=85) had a state transition land inside them and
were **re-run rather than averaged in** — the disturbed attempts stay on disk.

---

## Q1 — CHAIN vs MASTER

Fast state, `--order=size`, all runs kept, none averaged away:

```
   n     A chain    B master   A2 chain   |  master vs chain-mean   (chain self-spread)
   30     0.3590     0.3167     0.3418   |   -9.6%                  (4.9%)
   50     0.8666     0.8753     0.8675   |   +1.0%                  (0.1%)
   70     1.6069     1.6468     1.6622   |   +0.7%                  (3.4%)
   85     2.4300     2.4597     2.5211   |   -0.6%                  (3.7%)
  100     3.4683     3.4621     3.4649   |   -0.1%                  (0.1%)
```

Slow state, same order, for the second opinion: +5.7 / −1.3 / +2.5 / −5.4 / +8.6 %.

**The verdict.** In both states the master-vs-chain delta is **smaller than or comparable to the
chain's own repeat spread**, and **its sign flips** across field sizes. At the two sizes where the
instrument is tightest (n=50 and n=100 in the fast state, self-spread 0.1 %) the delta is 1.0 % and
0.1 %. There is no engine slowdown to find. The n=30 −9.6 % is the noisiest cell in the table —
the smallest field, the shortest runs, the largest relative jitter — and it reverses in the slow
state (+5.7 %).

**The owner's 3 ms vs 7.7 ms is not this.**

---

## Q2 — THE CURVE

Fitted in log-log space; the residuals are printed so the fit can be judged rather than believed.

```
Fast state:  t(N) = 5.324e-4 · N^1.899    log-log R² = 0.9985
   n    measured    fitted   residual
   30     0.3504    0.3400    +3.1%
   50     0.8671    0.8970    -3.3%
   70     1.6345    1.6995    -3.8%
   85     2.4756    2.4573    +0.7%
  100     3.4666    3.3458    +3.6%

Slow state:  t(N) = 8.384e-4 · N^1.964    log-log R² = 0.9928
```

Four independent fits — chain and master, in each machine state — give **1.899, 1.951, 1.964,
1.975**. The cost of a physics step is **quadratic in the field size**. That is the arithmetic
signature of an all-pairs loop, and Q4 finds the loop.

---

## Q3 — DENSITY

First fifth of the run (field bunched) vs last fifth (field strung out), same race, same run.
**No racer finished in any run** — 3000 steps is 48 s of a 60 s race — so the last fifth is a full
field genuinely spread out, not a thinned one.

```
   n    first5th   last5th   last/first     (fast state)
   30     0.3950    0.2702      0.68x
   50     0.8600    0.7980      0.93x
   70     1.5603    1.5786      1.01x
   85     2.2748    2.4889      1.09x
  100     3.1256    3.4195      1.09x
```

**Density is not the lever, and above n=50 it points the wrong way** — the *spread* field costs
slightly *more*. The largest effect anywhere in the table is 1.09×. To produce the owner's 2.57×
gap, density would have to move it by 2.57×; it moves it by nine per cent.

The n=30 0.68× reproduces in both machine states, so it is real: at a small field the opening
bunch genuinely costs more than the strung-out end. It stops mattering by n=50.

**Q3 therefore does NOT answer Q1 by arithmetic.** It rules density out.

### What the two recordings most likely are

Since density is out and the commits are equal, the curve is asked what **field size** produces each
number. The absolute answer depends on machine state, but the **ratio does not**, because the state
is a uniform scale factor:

- 7.7 / 3.0 = 2.57× in cost → **1.6× in field size** (2.57^(1/1.93)).
- Fast state: 3 ms ↔ ~94 racers, 7.7 ms ↔ ~155 racers.
- Slow state: 3 ms ↔ ~64 racers, 7.7 ms ↔ ~104 racers.

**Read the ratio, not the counts.** The counts are this laptop on `searound`, not his browser on his
track. The statement worth keeping is: *two recordings 2.57× apart are consistent with a field
1.6× larger, and inconsistent with the same field measured at two densities.*

---

## Q4 — WHERE THE TIME GOES

Node's own sampling CPU profiler, at n=30 and n=100, on both commits. **The engine is not
instrumented** — that was the constraint and it is why the profiler is the sampling one.

```
chain:  SELF-TIME SHARE, n=30 -> n=100
    n=30     n=100    delta   function
   35.12%   41.47%   +6.35pp   applyRacerBehavior  client/src/modules/raceBehavior.js:386
   20.92%   37.30%  +16.38pp   isSideFree          client/src/modules/raceBehavior.js:287
    2.90%    4.07%   +1.17pp   pairContact         client/src/modules/raceBehavior.js:261
    0.00%    1.92%   +1.92pp   chooseFreeLaneDir   client/src/modules/raceBehavior.js:311
    5.52%    2.71%   -2.81pp   (garbage collector)
    7.07%    2.39%   -4.68pp   stepRacePhysics     client/src/modules/raceCore.js:421
    2.58%    1.07%   -1.51pp   update              client/src/modules/racePlanner.js:518
```

Master's profile is the same picture to within 2 pp on every row (`isSideFree` +18.52 pp there) —
another independent statement of Q1's answer.

**The shape of the growth, in one sentence:** two functions take 56 % of the step at n=30 and 79 %
at n=100, and **`isSideFree` at `raceBehavior.js:287` is the one that nearly doubles its share**.
Everything that shrinks — `stepRacePhysics`'s own body, the planner, the GC — shrinks only because
those two grow around it.

**The thing to attack is `isSideFree`, called from `applyRacerBehavior`'s pair loop.** It is
consistent with the quadratic exponent and with Q3: an all-pairs scan that does not cull by
distance would cost the same whether the field is bunched or spread, which is exactly what Q3
measured. **This block stops here — proposing the fix is the next decision and it is the owner's.**

---

## Q5 — THE NAME SET

**State this first, because the table means nothing without it.** A racer's name is physics:
`stablePairBit` hashes `r.name` into the avoidance tie-break. So `--roster=long` at the same seed is
a **different race** with a different traffic pattern, not the same race with longer strings. This
measures **the race a roster produces**. It cannot measure the cost of the letters and does not
claim to. The drawing-side half of the owner's question is LABEL-BENCH-1's.

Palindrome order, chain head, two runs per arm:

```
   n    roster    runs    mean p50   within-arm spread   vs current
   70   current    2       1.6267        1.4%              +0.0%
   70   long       2       1.6816        1.9%              +3.4%
   70   mixed      2       1.7125        0.7%              +5.3%
  100   current    2       3.4524        0.5%              +0.0%
  100   long       2       3.4233        0.9%              -0.8%
  100   mixed      2       3.4102        0.8%              -1.2%
```

**At n=100 there is nothing** — 1.2 % across three different races, against a within-arm spread of
0.8 %. At n=70 the two alternative rosters are 3.4 % and 5.3 % slower with tighter within-arm
spreads, which is above the noise and is most plausibly one race happening to run slightly more
traffic than another. **It is one seed on one track; do not generalise it into "long names are
slower".** Racers built by `createRaceFromIdentity` carry no name at all, so the harness assigns
them the same way the browser does (`ROSTER[index % ROSTER.length]`).

---

## THE PRODUCT ANSWER — THE CEILING IN RACERS

Largest N where two physics steps plus a frame's drawing still fit in 16.7 ms:

| drawing budget | fast state | slow state |
|---|---|---|
| 0 ms | 161 | 108 |
| 2 ms | 151 | 101 |
| 4 ms | 140 | 94 |
| 6 ms | 128 | 86 |
| 8 ms | 114 | 77 |

**It is a table and not a number, deliberately, and the honest reading is the conservative column.**
This harness is headless: it has **not measured a drawing cost** and will not invent one, and the
machine's own factor-of-two makes any single figure fragile. What survives both caveats:

> **Today's engine supports a field somewhere between 80 and 150 racers before physics alone
> stops fitting in a 60 Hz frame — and because the growth is quadratic, buying the next 40 %
> of field size costs twice the work, not 40 % more.**

The shipped default field is far below that. The ceiling matters for where the product could go, not
for what it does now.

---

## WHAT WAS BUILT

| file | lines | what |
|---|---|---|
| `scripts/phys-bench.mjs` | 0 → 233 | one headless run: build via the shared `raceDriver` boot path, warm up on a **throwaway** race, then time each `stepRacePhysics` from the outside. Median and p90 only — never a mean. Writes every raw per-step nanosecond sample. |
| `scripts/phys-bench-matrix.mjs` | 0 → 287 | the matrix across two working trees, `--order=pass\|size`, `--only=`, `--sizes=`, the roster palindrome, and the CPU profiles + their self-time summaries. One process per run. |
| `scripts/phys-bench-fit.mjs` | 0 → 226 | every derived answer, recomputed from `matrix.json`. Nothing here re-measures. |

All three are new files; nothing was removed from any existing file.

**No file outside `scripts/` and `reports/` was touched.** No test file covers these three, and none
was added: they are measurement harnesses whose output is checked by its own printed residuals and
by the A/B/A control, and the block's verification section asked for the tests covering what
changed — there are none.

### Reused rather than rebuilt

`scripts/lib/raceDriver.mjs` (`resolveIdentity` / `loadTracks` / `buildRace`) is the boot path the
label and camera harnesses already drive — ONE-DRIVER-1. `buildRace` constructs a `CameraDirector`
because it is the shared path and this block will not fork a second way to start a race; that
director is **never updated**, and construction happens before the first timer starts. What is timed
is `stepRacePhysics(st, cfg)` and nothing else.

### Noticed but left

- **`--order=pass` is kept even though it is the worse instrument.** It is the literal reading of
  A/B/A and it is the evidence for why the interleave exists. Deleting it would delete the finding.
- **The `[ra-build]` terminal line still does not follow a branch switch** — already captured as a
  defect by LABEL-OCCLUSION-1. This block switched the main worktree from detached-master to
  `feat/phys-bench-1` under a running dev server and did not restart it, so the badge on 5173 is
  stale by exactly that defect. Not fixed here.
- **`stablePairBit` is 1.1–1.4 % of self time.** It hashes a string on every tie-break, every step.
  Small, and only worth naming because Q5 made someone look at it.
- The n=30 `last/first` = 0.68× is real and reproduces in both machine states. Unexplained; it stops
  mattering by n=50.

---

## RACE IDENTITY — ONE TRACK, ONE SEED, THROUGHOUT

```
track=searound (closed, default racer = manta)   raceSeed=5601   60 s requested
canvas 1280x720   steps=3000 (= 48 s of physics)   warmup=300 on a discarded race
node v24.14.0   win32-x64   Intel Core Ultra 7 165U
```

`searound` because it is the closed track that bunches the field into a repeating pack — the case
that works the pair loop hardest — and because the label harnesses already use this identity, so
these numbers sit beside theirs.

---

## HOW BOTH TREES WERE OBTAINED

- **chain** — the main worktree, `c:/Users/weudl/OneDrive/Dokumente/Seasonal race claude`, checked
  out from detached-master onto the new branch `feat/phys-bench-1` at `37bb9f17`.
- **master** — `C:/ra-wt-nanoid`, the leftover worktree that already holds the `master` branch at
  `8547640d`. It was clean, it has `client/node_modules`, and **git will not check `master` out a
  second time while that worktree holds it**. Nothing in it was modified: the matrix runner copies
  `scripts/phys-bench.mjs` in, runs it from there so every `../client/src/...` specifier resolves
  inside that tree, and removes the copy in a `finally`. Verified clean afterwards.

One script importing two engines cannot work — the module graph is keyed by path and both trees
export the same names — which is why it is a copy and a second process.

---

## WHERE THE RAW DATA LANDED

Everything under **`reports/perf/phys-bench-1/`**, 2.3 MB, all text:

```
matrix.json                     the pass-order sweep (drifted; kept as the record)
raw/*.json                      15 runs, every per-step nanosecond sample
profiles/                       4 .cpuprofile files + their .selftime.json summaries
interleaved/                    field sweep, --order=size, SLOW machine state
interleaved-2/                  field sweep, --order=size, FAST machine state
interleaved-2-n70/, -n85/       the two triples re-run after a state transition hit them
roster-palindrome/              Q5, six runs per field size
derived-passorder.txt           what the drifted data says
derived-interleaved.txt         slow-state derived answers
derived-interleaved-2.txt       fast-state derived answers  <- the ones quoted above
```

**Every raw per-step sample is in those files**, so a later question about a different percentile, a
different window, a different outlier rule, a different frame target or a different drawing budget
is answered by re-running `phys-bench-fit.mjs` in a second. That was the point of the block.

Reproduce:

```
node scripts/phys-bench-matrix.mjs --master=C:/ra-wt-nanoid --order=size --only=field
node scripts/phys-bench-fit.mjs --in=reports/perf/phys-bench-1/interleaved-2/matrix.json \
  --also=reports/perf/phys-bench-1/interleaved-2-n70/matrix.json,reports/perf/phys-bench-1/interleaved-2-n85/matrix.json
```

---

## VERIFICATION

```
$ node scripts/engine-reach.mjs --check scripts/phys-bench.mjs scripts/phys-bench-matrix.mjs \
    scripts/phys-bench-fit.mjs reports/perf/phys-bench-1
ENGINE REACH: none of 4 path(s) can reach the race engine.
```

No test file covers what changed (see above). No full client suite, no `verify`, no fingerprint
script. The dev server was **not** restarted.

## TIMING LEDGER

| item | wall |
|---|---|
| **bench + profile runs — pass-order sweep (15 runs + 4 profiles)** | **326.2 s** |
| **bench runs — interleaved field sweep, slow state (15 runs)** | **189.3 s** |
| **bench runs — roster palindrome (12 runs)** | **122.8 s** |
| **bench runs — interleaved field sweep, fast state (15 runs)** | **123.7 s** |
| **bench runs — n=85 triple re-run (3 runs)** | **29.8 s** |
| **bench runs — n=70 triple re-run (3 runs)** | **21.0 s** |
| *bench + profile subtotal (63 runs, 4 profiles)* | *812.8 s* |
| premise check — same-race hash on both trees | ~6 s |
| `engine-reach --check` | <1 s |
| everything else — reading the boot path, writing the three scripts, this report | the remainder |
