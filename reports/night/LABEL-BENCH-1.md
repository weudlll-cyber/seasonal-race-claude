# LABEL-BENCH-1 — the drawing side of "number or name?"

**Branch:** `feat/label-bench-1`, off `feat/phys-bench-1`.
**Nothing minted. Nothing merged. No engine file edited** — `engine-reach --check` says so, below.
**MEASURE, DO NOT FIX.** Nothing here is fixed, and nothing here needs to be.

---

## THE ANSWER IN THREE LINES

1. **The label layout is not a performance concern.** At 100 racers it costs **0.021 ms** a frame
   with numbers and **0.036–0.040 ms** with names on. A physics step at the same field size is
   **3.47 ms** (PHYS-BENCH-1). The whole labelling decision is **about 1 % of one physics step and
   about 0.24 % of a 16.7 ms frame.**
2. **Short, long and mixed names cost the same.** 0.0398 / 0.0362 / 0.0390 ms at n=100 — a 10 %
   band against a 9–18 % run-to-run spread. There is no length effect to find here.
3. **And the reason matters more than the milliseconds: long names are granted FEWER names.**
   3.4 of 16.5 labels carry a name with the long roster against 5.5 with the short one. Long text is
   not cheap — it is **rationed**. But the characters that do get drawn go **up**, not down: 91.6 per
   frame for long against 51.4 for short.

**So the honest sentence is: the LAYOUT does not care how long the names are; what changes is how
many names the owner gets. The cost of the letters themselves is not in this table — see the
limitation below, which is the most important paragraph in this report.**

---

## THE CONTROL — WHY THIS IS A CLEAN COMPARISON

A racer's name is physics. If each arm ran its own race, the arms would differ in **where the racers
are**, and "long names cost more" would be indistinguishable from "that race bunched differently".

So the frame inputs are **captured once from one real race and replayed into the layout under every
arm.** Only the label TEXT changes between arms. The engine-side half of the owner's question is
already answered in PHYS-BENCH-1 Q5 rather than smuggled in here.

The inputs are taken, not invented: the race runs through `scripts/lib/raceDriver.mjs` — the same
boot path and the same 60 Hz loop the fingerprint and label harnesses drive — with the camera
running, so `effX/effY/offsetX/offsetY`, the drawn racer size and the anchor all come out of the
real director on real frames. Every 4th frame is kept, RACING window only (the start formation
labels everyone by design and exercises a different branch).

**The master arm replays the SAME captured frames**, handed to it as a file. It does not drive its
own race: master's camera is not the chain's, and comparing two layouts on two different pictures
would measure the pictures.

---

## ⚠ THE LIMITATION, AND IT IS NOT A FOOTNOTE

There is no canvas in node, so text width uses the 0.5-per-character-per-px approximation the other
label harnesses use. **That approximation is O(1) in the string length; a real `ctx.measureText` is
not.** So every millisecond below **isolates the placement geometry** and deliberately excludes the
two costs that live in the browser:

1. **`ctx.measureText`** — called once per label per frame, and it does scale with the text.
2. **`fillText`** — actually drawing the glyphs, which is where long names would cost most of all.

**This harness cannot supply that multiplier and will not invent one.** What it does supply is the
**multiplicand**, reported per arm: `measureCalls` per frame and `charsDrawn` per frame. If the
owner ever wants the real number, those two columns are what a browser measurement would multiply,
and the browser is the only place it can be taken.

The practical consequence: **the "no length effect" result above is a statement about the LAYOUT
only.** On the real canvas, `names-long` draws 91.6 characters a frame against `names-short`'s 51.4
— 1.8× the glyphs — and this bench is blind to what that costs.

---

## THE MATRIX

Median of 7 measured rounds per arm, after 3 discarded warm-up rounds. Round-major ordering, so an
arm's repeats are spread across the block rather than taken back to back — the drift lesson from
PHYS-BENCH-1. `spread` is the max-to-min range of the 7 round medians.

```
tree    n     arm            reps   layout p50   layout p90   spread    hold p50   placed   named   name%   chars/f
chain    30   numbers           7      0.0108      0.0161    15.7%     0.0009     11.0     0.0    0.0%      18.6
chain    30   names-short       7      0.0179      0.0256     9.5%     0.0016     11.0     6.2   56.4%      40.8
chain    30   names-long        7      0.0173      0.0248     9.8%     0.0014     11.0     3.7   34.0%      87.5
chain    30   names-mixed       7      0.0172      0.0258      14%     0.0015     11.0     5.6   51.2%      53.4
chain    70   numbers           7      0.0128      0.0399    21.1%     0.0007     13.0     0.0    0.0%      24.9
chain    70   names-short       7      0.0201      0.0768     6.5%     0.0012     13.0     4.1   31.4%      37.8
chain    70   names-long        7      0.0192      0.0712    12.5%     0.0011     13.0     2.5   19.2%      68.0
chain    70   names-mixed       7      0.0189      0.0726    12.7%     0.0011     13.0     3.2   24.7%      43.6
chain   100   numbers           7      0.0209      0.0413    10.5%     0.0012     16.5     0.0    0.0%      32.9
chain   100   names-short       7      0.0398      0.0767    17.6%     0.0020     16.5     5.5   33.1%      51.4
chain   100   names-long        7      0.0362      0.0704     9.1%     0.0018     16.5     3.4   20.7%      91.6
chain   100   names-mixed       7      0.0390      0.0800     8.7%     0.0020     16.5     4.6   27.8%      65.6
master  100   master-names      7      0.0120      0.0246      10%     0.0002     16.2    16.2  100.0%      88.5
```

`hold` is `advanceLabelForms` — timed separately because it is a different question, and at
0.0002–0.002 ms it is not one worth asking again.

### Reading the table

**Turning names ON roughly doubles the layout.** n=100: 0.0209 → 0.0362–0.0398, so **+0.018 ms a
frame**. That is the price of the occlusion criterion — the layout must build every racer's drawn
box and test each candidate name against all of them, work it does not do when the label is only a
number.

**Length does not matter to the layout.** At every field size the three rosters land inside a 10 %
band, well inside the run spread. A wider box changes WHICH names are granted, not how long the
decision takes.

**`placed` is identical across arms at every field size** (11.0 / 13.0 / 16.5). The number of
LABELS never changes — the name/number choice only decides what goes inside them. That is the
design working: the wide form is offered inside a placement that was already made.

**Only 16.5 of 100 racers carry a label at all.** The rest are off-canvas or decluttered. So the
layout's cost tracks the visible field, not the entered field — which is why 30 → 100 racers costs
1.9× here and 9.9× in the physics.

---

## MASTER'S LAYOUT, THE ONE COMPARISON POINT

At n=100, on the same frames:

| | master | chain, numbers | chain, names on |
|---|---|---|---|
| layout p50 | **0.0120 ms** | 0.0209 ms | 0.0362–0.0398 ms |
| labels placed | 16.2 | 16.5 | 16.5 |
| labels with a name | **16.2 (100 %)** | 0 | 3.4–5.5 (21–33 %) |
| characters drawn / frame | 88.5 | 32.9 | 51.4–91.6 |
| hold p50 | 0.0002 ms | 0.0012 ms | 0.0020 ms |

**Yes, what we built costs more than what was there — 1.7× with names off, 3.0–3.3× with names on —
and it is buying something specific.** Master's layout has one form: the label IS the name, every
label, always. It never asks whether that name lands on a racer, which is precisely the defect
LABEL-OCCLUSION-1 was written to end. The chain's extra 0.018–0.028 ms a frame is the
racer-box occlusion pass and the two-form decision.

**In absolute terms the whole difference is 0.028 ms — 0.17 % of a 16.7 ms frame, and 0.8 % of one
physics step.** The trade is a fifth of a percent of a frame for names that never sit on a racer.
Master also draws MORE characters per frame (88.5) than the chain does with short names (51.4),
because it grants every label a name.

---

## WHAT WAS BUILT

| file | lines | what |
|---|---|---|
| `scripts/label-bench.mjs` | 0 → 432 | captures real frame inputs from one headless race, then replays them into `computeTagLayout` under each label-content arm and times every call. Also drives `advanceLabelForms` between frames, timed separately, because a layout run with `wideForms: null` on every frame is a state the game never reaches. `--replay=` runs one arm against a capture file, which is how master's layout is reached. |
| `scripts/label-bench-matrix.mjs` | 0 → 188 | three field sizes × four arms, plus master at 100 on the same captured frames. One process per field size. |

Both are new files; nothing was removed from any existing file. No test file covers them and none
was added — they are measurement harnesses, and the block's verification section asked for the tests
covering what changed.

### Reused rather than rebuilt

`resolveIdentity` / `loadTracks` / `buildRace` / `runRace` from `scripts/lib/raceDriver.mjs`, and the
frame-input derivation (`effectiveZoom`, `computeRenderDisplayScale`, `drawnRacerScreenPx`,
`frameCameraInputs`'s anchor) exactly as `scripts/label-occlusion-truth.mjs` already derives it. The
layout, the hold and the race-number labels are the REAL modules, called the way `renderRaceFrame`
calls them — not re-typed geometry.

**One script cannot import two layouts** (the module graph is keyed by path and both trees export
`computeTagLayout`), so the matrix copies `label-bench.mjs` into the master worktree, runs it there
with `--replay=`, and removes the copy in a `finally`. The master tree was verified clean afterwards.

### Noticed but left

- **`--sample=4` keeps every 4th frame** — 878–930 frames per arm, 15 samples a second. More would
  not move a p90 and would have made the capture file, already 7.7 MB at n=100, awkward to hand to
  the other tree.
- **The captured frames are an intermediate, not a result**, so they live in scratch
  (`%TEMP%/racearena-scratch/label-bench-1/`) and are NOT committed. They regenerate exactly from
  the seed. Only the timings are in the repo.
- **`p90` does not grow monotonically with field size** — n=70 reads 0.0768 and n=100 reads 0.0767
  on the short-name arm. Unexplained, small, and it does not touch any conclusion here.
- **The first round is V8 still optimising** and read 161 % slower than the second when the warm-up
  was one round. Three rounds settles it; the master block needed all three because it runs a single
  arm and so warms up a third as much per round. That is in the script's own comments so the next
  person does not rediscover it.

---

## RACE IDENTITY

```
track=searound (closed, default racer = manta)   raceSeed=5601   60 s   1280x720
n = 30 / 70 / 100   fontPx=15.84   labelMarginPx=6   showRpStartRow=false (pinned)
frames kept: 878 (n=30) / 919 (n=70) / 930 (n=100), every 4th, RACING window only
node v24.14.0   win32-x64
```

The same identity PHYS-BENCH-1 and the label harnesses use, so these numbers sit beside theirs.
`showRpStartRow` is pinned off rather than assumed: it appends `" (R3)"` to every label and would
have made every width in the table a measurement of a different string.

---

## WHERE THE RAW DATA LANDED

**`reports/perf/label-bench-1/`**, 956 KB:

```
matrix.json         the summary table plus every round of every arm
chain-n30.json      28 runs (4 arms x 7 rounds), every per-frame layout nanosecond sample
chain-n70.json      28 runs
chain-n100.json     28 runs
master-n100.json    7 runs
```

Every per-frame sample is in those files, so a different percentile or a different window is
recomputed rather than re-measured.

Reproduce:

```
node scripts/label-bench-matrix.mjs --master=C:/ra-wt-nanoid --repeats=7 --warm-rounds=3
```

---

## VERIFICATION

```
$ node scripts/engine-reach.mjs --check scripts/label-bench.mjs scripts/label-bench-matrix.mjs \
    reports/perf/label-bench-1
ENGINE REACH: none of 3 path(s) can reach the race engine.
```

No test file covers what changed. No full client suite, no `verify`, no fingerprint script. The dev
server was **not** restarted.

## TIMING LEDGER

| item | wall |
|---|---|
| **bench runs — first full matrix (13 cells, 5 rounds)** | **154 s** |
| **bench runs — final matrix (13 cells, 3 warm + 7 rounds)** | **196 s** |
| *bench subtotal* | *350 s* |
| smoke runs while building the harness | ~40 s |
| `engine-reach --check` | <1 s |
| everything else — reading `renderRaceFrame`'s call site on both trees, writing the two scripts, this report | the remainder |
