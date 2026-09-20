# BREAKAWAY-LEVER-1 — the racer in second is braked to his drawn place, and the command arrives

Branch `diag/breakaway-lever-1`. Date: 2026-09-19.
**A MEASUREMENT ONLY. No behaviour change, no new config key, no tuning, nothing minted.**

> **THE QUESTION.** BREAKAWAY-GROWTH-1 established that a breakaway lead grows mostly because the
> racer in SECOND slows, not because the leader speeds up. This asks the follow-up: *while that gap is
> growing, what is happening to the racer in second, and which of four mechanisms is the binding
> constraint?*

---

## ★★★ THE ONE LINE

> **The racer in second is almost never the racer the plan drew to be second — his drawn place is a
> median 4th — so the rank servo spends 86.5% of the growing frames commanding him SLOWER.**
>
> ★★ **And it is not a delivery fault: the command ARRIVES.** When the servo asks for 0.92458 the
> multiplier actually in force is 0.92368. The ease is restarted on 5.8% of frames and the median
> forward command, on the 13.5% of frames it exists, is **1.00037** — four hundredths of one percent.
>
> ★ **The one mechanism trying to help him is the gap re-roll tilt**, whose condition would push him
> UP on 79.8% of growing frames. It is swamped.

---

## 1 · WHAT WAS REUSED, AND WHY THE PARENT HARNESS WAS COPIED RATHER THAN EXTENDED

Both named harnesses were read before a line was written.

| harness | what it already does | verdict |
|---|---|---|
| `reports/night/breakaway-growth-data/breakaway-growth.mjs` | drives `stepRacePhysics` directly, ranks on PRE-STEP positions, defines the episode and the growing frames, identifies leader and second | ★ **its machinery is reused wholesale** |
| `scripts/exp-runaway-leader.mjs` | defines a runaway, aggregates per track and per arm, reads the tilt counters out of `collectTelemetry()` | **not used** — see below |

★★ **THE PARENT WAS COPIED, NOT EDITED, AND THAT IS A DELIBERATE REFUSAL OF THE CHEAPER ROUTE.**
`breakaway-growth.mjs`'s own header says it is *"EVIDENCE for one report, not tooling"*, and it is the
artifact that produced BREAKAWAY-GROWTH-1's 59.5%. Adding columns to it would change the file that
backs a published number. What is reused is its logic — the driving loop, the PRE-STEP ranking, the
episode rule (first in-window step above the brake's allowance → the in-window peak) and the
growing-frame rule (gap greater than the previous step's) — taken line for line into
`reports/night/breakaway-lever-data/breakaway-lever.mjs`. **What is new is only the per-frame record
of the second-place racer.**

★ **`exp-runaway-leader.mjs` was not extended**, for a reason that is about the question rather than
about the file: it aggregates per ARM over a config sweep, and this block has one arm — the shipped
config — and needs per-FRAME rows, not per-race aggregates. Its `--smallg-diag` block reads the tilt
counters at race level, which is exactly the granularity this question cannot use.

### ★★ WHERE IT SAMPLES

**On the physics step.** Positions and finished flags are snapshotted BEFORE `stepRacePhysics` —
which is what the controller ranked and measured gaps on — and the servo fields are read AFTER it,
because they are written during it and are the values that step used. It is never sampled from a
`runRace` frame callback: a callback can cover two physics steps and reads every gap one step late,
which is a defect this project has already paid for once.

---

## 2 · THE FIXTURE

| | stage 1 | stage 2 |
|---|---|---|
| tracks | ten | ten |
| seeds | 1, 2, 3 | 1–30 |
| races | **30** | **300** |
| racers | 40 | 40 |
| roster | `QUICK_TEST_NAMES` | `QUICK_TEST_NAMES` |
| action stage | `wild` | `wild` |
| races with a breakaway episode | **24** | **238** |
| ★ **GROWING FRAMES** | ★ **6,150** | ★ **59,999** |

Stage 2 re-runs **row A alone**, as the brief directs, because row A dominates at N=30.

---

## 3 · ★★★ THE TABLE — ROWS A–D OVER THE GROWING FRAMES

**All shares are of the 6,150 growing frames at N=30 unless a cell says otherwise.**

| | mechanism | FAILING to help him | HELPING him | median magnitude when it helped |
|---|---|---|---|---|
| **A** | **the rank servo** | ★★ **85.8%** commanded SLOWER (median **0.85019**) | 14.2% commanded forward | ★ **1.00017** — four hundredths of one percent |
| **B** | **drafting** | 79.6% — boost not active | **20.4%** — boost active | ×**1.04** (`draftingBoost`) |
| **C** | **the gap re-roll tilt** | 18.8% would tilt DOWN | ★ **79.8%** would tilt UP | gapAhead **2.327 L** against G = 0.5 L |
| **D** | **his own ceiling** | — | — | ★ **not a constraint** — see below |

### A · THE RANK SERVO — and the mechanism is the drawn place, not the servo

| | N=30 | ★ N=300 |
|---|---|---|
| commands him **SLOWER** | **85.8%** | ★★ **86.5%** |
| commands him **forward** | 14.2% | 13.5% |
| median command when slower | **0.85019** | **0.92458** |
| median command when forward | 1.00017 (p90 1.00053) | 1.00037 |
| at `minMult` 0.85 **exactly** | 41.6% | 30.0% |
| ★ **in force** when commanded slower | **0.85019** | **0.92368** |
| ease restarted | 5.8% (median travel 0.032) | — |
| his **drawn place**, median | **5th** | **4th** |

★★★ **THE CROSS-TAB IS THE WHOLE ANSWER**, at N=30:

| his drawn place | growing frames | share commanded SLOWER |
|---|---|---|
| **2nd** | 271 | ★ **0.0%** |
| 1st | 1,163 | 48.0% |
| **3rd or worse** | **4,716** | ★★ **100.0%** |

At N=300, 67.2% of growing frames have him drawn 3rd or worse, and on **99.8%** of those the servo
commands him slower. **He is second on the track and the plan wants him 4th, 12th, 40th.** The servo
is not misbehaving; it is doing exactly its job, and its job is to put him back.

★★ **THE COMMAND ARRIVES, WHICH QUALIFIES SERVO-FAULT-1 RATHER THAN CONFIRMING IT HERE.** That
finding measured the servo's own noise re-triggering the 1000 ms ease on most rewrites. On these
frames it does not bite: the ease is restarted on **5.8%** of them, and when it is, it had travelled a
median of **0.032** — so the restart discards almost nothing. Commanded and in-force medians agree to
the fourth decimal on both stages. **Whatever is holding him back, it is not undelivered command.**

★ **The magnitude is the one number that does NOT hold between the stages**, and it is reported rather
than smoothed: at N=30 the median command sits exactly on the `minMult` floor (0.850) and at N=300 it
is 0.925. The 30-race sample was harder-braked than the population. **The SHARE holds to 0.7 points;
the DEPTH does not**, and a reader quoting 0.850 as a population figure would be quoting the small
sample.

### B · DRAFTING

| | N=30 |
|---|---|
| inside `draftingMaxDistance` (80 px) | **53.3%** |
| boost actually ACTIVE | **20.4%** |
| median gap to the leader | **77.7 px** (median when in range 62.0) |

★ **The brake's allowance is 56 px and drafting reaches 80**, so there is a band — 56 to 80 px — in
which the gap is officially a breakaway and he is still in the slipstream. He spends half the growing
frames in it. But the boost is active on only a fifth, so **being in range is not being helped**, and
the maximum it could contribute is ×1.04 against a servo asking for ×0.85.

### C · THE GAP RE-ROLL TILT — the one mechanism on his side

| | N=30 |
|---|---|
| would tilt **UP** (faster) | ★ **79.8%** — median gapAhead **2.327 L** |
| would tilt **DOWN** (slower) | 18.8% — median gapBehind 3.155 L |
| no tilt | 1.4% |
| median gapAhead / gapBehind | 2.233 L / 0.705 L (G = **0.5 L**) |

★★ **THIS IS A RECONSTRUCTION OF THE CONDITION, NOT AN OBSERVATION OF A ROLL, and the distinction is
load-bearing.** The tilt applies only at a SCHEDULED re-roll; what is recorded here is what the branch
at `racePlanner.js:1695` would decide about him on each growing frame, recomputed in the law's own
units (`arcT(...) × lenScale`, racer lengths) rather than converted from px. **The cross-check is the
race-level counter**, and it agrees in direction: over the 24 episode races `collectTelemetry()`
reports **2,002 window rolls, 456 UP tilts and 420 DOWN tilts** — more UP than DOWN, as the frame
condition says.

### D · HIS OWN CEILING — not a constraint, and the zero is A's shadow

| | N=30 |
|---|---|
| commanded AT `maxMult` 1.1 | **0.0%** |
| commanded BELOW `maxMult` | 100.0% (median 0.900) |
| he is a HELD hero — the arrival-ceiling population | **11.1%** |

★ **"100% below the clamp" is not evidence of a ceiling.** Nothing is capping him: the servo is
*commanding* 0.9, and a command below the clamp needs no ceiling to explain it. The arrival ceiling
(`racePlanner.js:516`) applies only to held heroes, and he is one on **11.1%** of frames. **D is a
restatement of A, not a fourth mechanism**, and is reported as such rather than counted twice.

---

## 4 · ★★★ THE BINDING CONSTRAINT

> **The rank servo is the binding constraint, and the cause is upstream of it: the racer who is
> second on the track is not the racer the plan drew to be second.** On 86.5% of growing frames at
> N=300 the servo commands him slower, on 99.8% of the frames where his drawn place is 3rd or worse,
> and the command is delivered in full. Drafting reaches him on a fifth of frames at ×1.04; the
> re-roll tilt is trying to push him up on four frames in five and cannot outvote a ×0.85 command;
> nothing is tightening his ceiling.

★ **What this does NOT say.** It does not say the servo is wrong — putting a racer back toward his
drawn place is the servo's stated job, and the fairness case for it is not reopened here. It does not
propose a change, a key or a value. It says which mechanism is binding, which is what was asked.

---

## 5 · THE `--smallg-diag` TIE CASE — EVIDENCE FOR A LATER DECISION

The cleanup block left one question open: `_gapDownAheadGtBehind` reads 0 by construction since the
branch priority fix, and the TIE case (`gapBehind` **exactly** equal to `gapAhead`, which still takes
the DOWN branch at `racePlanner.js:1695`) is the one path through that branch the fix deliberately
left alone.

> ★★ **It never occurs. 0 of 6,150 growing frames at N=30, and 0 of 59,999 at N=300.**

Not once, on either stage, on any track, does the second-place racer sit at an exact tie with both
gaps above G — which is what one would expect of an equality between two floating-point arc distances.
The race-level counter agrees: `gapDownAheadGtBehind` is **0** across all 24 episode races.

★ **Nothing was changed.** The column, the counter and the diagnostic are untouched, as instructed.
This is evidence that the tie branch is not merely rare but unobserved, for whoever decides what to do
about `--smallg-diag`.

---

## 6 · GUARDS

### ★★ THE FIRST `engine-reach --check` WAS A FALSE CLEARANCE, AND THIS IS A SECOND FORM OF THE TRAP

Run with all six paths passed EXPLICITLY, from the working tree on the branch, while the new files
were still UNTRACKED, it said:

```
ENGINE REACH: none of 6 path(s) carry a change that can reach the race engine.
  6 outside the hull (cannot reach the engine at all): …breakaway-lever.mjs, …
```

★★ **That is wrong, and the harness imports `raceCore` on its second line of imports.** `engine-reach`
builds the hull from **`git ls-files`** (`scripts/engine-reach.mjs:246`), so a file git does not track
is invisible to the hull walk and is reported as unable to reach the engine. After committing, the
SAME command with the SAME paths says the opposite:

```
ENGINE REACH: 1 of 4 path(s) can change the race:
  reports/night/breakaway-lever-data/breakaway-lever.mjs
```

★ **The brief warned that running it without paths reports "none of 0 paths" and is not a clearance.
Running it WITH paths that git cannot see reports "none of N paths" just as cheerfully**, and the
number in the message looks like evidence that something was checked. The rule that follows is:
`engine-reach --check` can only speak about TRACKED files, so a new file must be committed before it
is asked about. Its parent harness says in its own header that it is in the hull; that is how the
discrepancy was noticed.

### THE FOUR FINGERPRINTS — the guard asked, and all four are unmoved

| role | record | measured on the branch |
|---|---|---|
| **world** | `b6cfd1daf1756f61` | ★ **matches** |
| **world-off** | `744bec11644978bb` | ★ **matches** |
| **camera** | `0102dd2eab95b71f` | ★ **matches** |
| **render** | `ec817639269a8a4e` | ★ **matches** |

★ **Nothing minted, and the expectation was written down before the run.** The harness is a new file
that nothing in the product imports, so it can no more change a race than this report can — but the
hull counts it, so it was measured rather than argued about.

★ **One piece of noise, named rather than left to be discovered:** the render instrument prints
`[warmup] motorbike FAILED: Image is not defined` for three sprites. That is its ordinary headless
warmup — there is no DOM `Image` under node — and it still produced the recorded hash, so it is not a
failure of this run.


---

## 7 · SOURCE HYGIENE

Reported per file, as asked.

| file | before → after | what it is |
|---|---|---|
| `reports/night/breakaway-lever-data/breakaway-lever.mjs` | — → **235** | **NEW.** The harness. Its driving loop, PRE-STEP ranking, episode rule and growing-frame rule are `breakaway-growth.mjs`'s (520 lines) taken line for line; what is new is the per-frame record of the second-place racer |
| `reports/night/breakaway-lever-data/agg-lever.mjs` | — → **67** | **NEW.** The reduction to the A–D table. Deliberately a separate file so the two can be re-run independently |
| `reports/night/breakaway-lever-data/lever-frames.json` | — → 2.4 MB | **NEW.** Stage 1's per-frame data, 30 races / 6,150 growing frames, committed beside the harness as its parent's data is |
| `reports/night/breakaway-lever-data/stage2-n300-rowA.json` | — → 675 B | **NEW.** Stage 2 reduced. The 24 MB per-frame file is NOT committed; this carries the command to reproduce it |
| `reports/night/BREAKAWAY-LEVER-1.md` | — → **212** | **NEW.** This report |
| `reports/night/INDEX.md` | +9 | the index entry |

**NO ENGINE SOURCE WAS TOUCHED.** No new guard, no new key, no new config, no new helper.

### What was REUSED rather than rebuilt

| needed | already existed | used |
|---|---|---|
| a race driven on the physics step | `breakaway-growth.mjs`'s loop over `stepRacePhysics` via `raceDriver.buildRace` | ★ **copied whole** |
| "what is a breakaway episode" and "what is a growing frame" | the same file's episode/growing rules | ★ **copied whole**, so the two reports' frames mean the same thing |
| the racer-length unit for the tilt law | `raceLengths.js` → `arcT`, `lenScaleFrom`, `meanDrawnBodyLen` | **imported**, never re-derived — a second expression of that conversion is what `raceLengths.js`'s own header calls "the next lie" |
| `maxMult`, the allowance, G, the drafting distance | `DEFAULT_CONTROLLER_PARAMS` and the world object | **read**, never restated as literals |
| the cross-check on the reconstructed tilt | `collectTelemetry()`'s roll and tilt counters | **read once per race, at the end** |

### ★ NOTICED AND DELIBERATELY LEFT

1. **`engine-reach` cannot judge an untracked file and says nothing about it.** Recorded in §6 above
   as the finding it is; repairing the guard is not this block's work and would be a change to a
   guard, which this block is forbidden.
2. **The 56–80 px band** — the brake's allowance is 56 px and `draftingMaxDistance` is 80, so a gap
   can be officially a breakaway while the racer behind is still in the slipstream. Measured here at
   53.3% of growing frames in range. It is a fact about two numbers that were chosen separately;
   whether they should relate is a design question, not a measurement.
3. **`--smallg-diag`'s headline column** is still unanswerable by its own instrument. §5 adds the tie
   evidence and changes nothing, as instructed.
4. **`breakaway-growth.mjs` was left untouched**, which is the point of §1.

