# COMEBACK-LEAD-GAP-1 — how the lead is produced, and the picture I could not reproduce

2026-09-12 · branch `night/2026-09-12b` · **ESTABLISH ONLY. Nothing was built, nothing was changed,
nothing is recommended. The repository is byte-identical — the instrument for this piece lives in the
scratchpad on purpose, so `verify` has nothing to move.**

---

## ★ 0 · BEFORE THE FIVE ANSWERS — A DEFECT IN NUMBERS I ALREADY GAVE YOU

★★ **THE "finish", "places gained" AND "top 5" COLUMNS IN DIRECTION-AUTHORITY-1 ARE WRONG.** They are
computed from a post-race sort by `t`, and that is not the finishing order.

**At source, exactly:**

- `raceCore.js:632` — `if (!r.finished) { r.t = advanceRacerT(...) }`. A racer that has finished
  **stops advancing**, so its `t` freezes at whatever OVERSHOOT past the line its last step happened
  to produce.
- `raceCore.js:670-671` — `r.finished = true; r.finishRank = ++st.finishedCount;`. **That** is the
  finishing order.
- `scripts/diag/comeback-band.mjs:81-85` defines `rankOf` as a sort by `t`, and **line 172** uses it
  after the race: `const finish = rankOf(race.st.racers, h.index)`. So it ranks finishers by how far
  past the line they overshot.

**Measured, 154 comebackers over 120 races on this branch:**

| | |
|---|---|
| the `t`-sort disagrees with `finishRank` | ★ **139 of 154 (90%)** |
| median error when it disagrees | ★ **9 places** |
| worst error | ★ **71 places** |

A worked case, `dirt-oval` seed 41003 at 20 racers: the `t`-sort's top five are **4, 0, 9, 18, 1**;
the real finishing order is **18, 11, 4, 0, 1**. The racer the sort calls the winner finished third.

★ **WHAT THIS DOES AND DOES NOT INVALIDATE.** `postChaosRank`, `deepestRank` and `rankAtMark` are
read MID-RACE, where a `t`-sort IS the running order, and they stand. **Everything derived from the
finishing position does not**: `finish`, `placesGained`, `gainedFromPostChaos` and `top5`, in both
the treatment and the control, in DIRECTION-AUTHORITY-1 §3 and in COMEBACK-CONSTANT-DEFICIT-1 §7.

★ **THE DEFECT IS OLDER THAN MY PIECES** — `rankOf` and its post-race use came in with COMEBACK-BAND-1
— **but I reported its numbers as sound and that is mine.**

### ★ ONE COLUMN CAN BE CORRECTED FROM THIS PIECE'S OWN DATA, AND IT MOVES A LONG WAY THE OTHER WAY

Top-5 reach needs only the finishing rank, so it can be recomputed here. Held comebackers, 82 of them:

| N | held | ★ top 5 by the REAL `finishRank` | top 5 by the `t`-sort (what I reported) |
|---|---|---|---|
| 20 | 27 | ★ **26/27 (96%)** | 14/27 (52%) |
| 40 | 17 | ★ **16/17 (94%)** | 9/17 (53%) |
| 60 | 18 | ★ **12/18 (67%)** | 6/18 (33%) |
| 100 | 20 | ★ **15/20 (75%)** | 4/20 (20%) |
| **all** | **82** | ★ **69/82 (84%)** | **33/82 (40%)** |

★★ **THE ERROR WAS MAKING THE BUILD LOOK WORSE THAN IT IS, ROUGHLY BY HALF.**

★ **AND THERE IS AN INDEPENDENT CROSS-CHECK I SHOULD HAVE NOTICED AT THE TIME.** `sim-fairness`
measured B1 band-reach — the share of racers DRAWN into the top five who finish there — at **83–89%**
per track. The held comebacker is drawn into B1, so **84% is exactly what that predicts, and the 40% I
reported contradicted it.** Two of my own measurements disagreed by a factor of two and I did not put
them side by side.

★ **WHAT STILL CANNOT BE CORRECTED HERE.** `placesGained` needs the rank at 0.70 as well as the
finish, and this piece's sweep did not record the mark for every comebacker. **So the headline "the
sign flips at every field size" remains NOT ESTABLISHED** — neither confirmed nor refuted — and a
corrected before/after needs both arms re-run. **It is not re-run here**, because this piece was told
to change nothing and a control needs the old engine. `comeback-band.mjs` is left exactly as it is,
defect included, rather than quietly edited.

---

## 1 · WHAT THE HERO CURVE DOES AT AND AFTER ITS FINAL WAYPOINT

**It ends. It does not continue and it is not extrapolated.**

`heroChoreography.js:149` — `if (progress >= pts[pts.length - 1].progress) return pts[pts.length - 1].rank;`
Past its last control point the curve returns that point's rank forever, flat.

★ **BUT FOR A HELD COMEBACKER THE CURVE IS NOT CONSULTED AT ALL AFTER THE RELEASE.**
`racePlanner.js:838-845`:

```js
const heldFree = heldReleaseAt != null && phaseProgress >= heldReleaseAt;
const targetRank = released
  ? currentRank
  : isHero && !heldFree
    ? sampleHeroCurve(heroCurve, phaseProgress)
    : (plan._racerTargetRank.get(r.index) ?? currentRank);
```

From `holdReleaseProgress` onwards his target is his **DRAWN rank** — the Fisher-Yates number, not the
cluster rank the cast recorded. (`phaseProgress` is the leader-progress fraction, `racePlanner.js:529`,
so 0.70 is genuinely 70% of the race.)

### ★ WHAT THE SERVO RECEIVES AT, AND AHEAD OF, THE DRAWN RANK

`racePlanner.js:847` `const rankError = currentRank - targetRank;`, `:859` heroes take
`strictness = 1.0` so `:911` `error === rankError`, and `:913`
`rawTarget = clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult)`.

| where he is | rankError | what the servo commands |
|---|---|---|
| **AT** his drawn rank | 0 | `1.0 + noise` — ★ **not steered** |
| **AHEAD** of it (a smaller rank number) | **negative** | ★ **BELOW 1.0 — he is BRAKED** |
| BEHIND it | positive | above 1.0 — driven |

★ **So the shipped rule is that getting ahead of his drawn place makes the servo slow him down.**
There is one exception and it is the last 3% of the race: `racePlanner.js:829-832` marks a B1-drawn
hero `released` past `_choreoReleaseProgress`, and then `targetRank = currentRank`, so `rankError` is
0 and the servo commands 1.0 — neither driving nor braking.

---

## 2 · IS HE STILL BEING STEERED WHILE IN THE LEAD? — ★ YES, AND THE STEER IS A BRAKE

**Method.** 120 races, 10 tracks × {20, 40, 60, 100} racers × 3 seeds, shipped branch, no arm. Every
frame from 0.70 to the end, the held racer's `trajectoryMult` — the servo's own output — read off the
racer object. 85 484 frames.

| frames | n | median mult | above 1.0 | at the 1.1 ceiling | ★ below 1.0 |
|---|---|---|---|---|---|
| ★ **while he is IN THE LEAD** | 24 616 | ★ **0.9771** | 21% | ★ **0.02%** | ★ **71%** |
| while he is not leading | 60 868 | 1.0474 | 65% | 32% | 32% |

★ **HE IS NOT BEING DRIVEN WHILE IN FRONT — HE IS BEING HELD BACK**, in 71% of the frames he leads,
and he essentially never reaches the ceiling there (5 frames in 24 616). The measurement agrees with
§1 exactly: in front, he is ahead of his drawn rank, so `rankError` is negative.

★ **THIS MATTERS FOR THE INSTRUCTION YOU WERE CONSIDERING.** "Release him once he is in front" would
**remove a brake, not a throttle.** On these measurements it would make him faster in the lead, not
slower.

---

## 3 · STEERING vs TRAFFIC — and the traffic difference is total

**Method.** The shared t-update is `raceStep.js:123-132`:

```
t += baseSpeed * boost * brake * rowEnvMult * trajectoryMult * areaBonusMult * governorMult * dt
```

Every factor is **read off the racer object** per frame — none is modelled — and the product is checked
against the racer's ACTUAL per-frame `Δt`, so a missed factor cannot hide inside a tidy story. The
avoidance brake is `raceCore.js:625-627`:
`const brake = r.avoidanceActive ? Math.min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor) : 1.0;`
— **exactly 1.0 when there is nobody to avoid.** 80 races, seeds 41003/41004, **20 586 frames in which
BOTH the leader and second are still racing** (finished frames are excluded: a finished racer's `Δt`
is zero and would poison the ratio).

**Each number is the LEADER's factor divided by SECOND's, geometric mean. Above 1 helps the leader
pull away; 1.000 explains nothing.**

| factor | ratio | reading |
|---|---|---|
| `brake` (traffic) | ★ **1.00796** | ★ **the only thing helping the leader: +0.80%** |
| `traj` (the servo) | ★ **0.99231** | ★ **the steering works AGAINST him: −0.77%** |
| `base` (natural speed) | 0.99508 | the leader is a slightly slower racer: −0.49% |
| `boost` (drafting) | 0.99428 | drafting helps SECOND, never the leader: −0.57% |
| `row`, `area`, `gov` | 1.00000 | explain nothing at all |
| product of the read factors | 0.98959 | |
| ★ **ACTUAL per-frame Δt ratio** | ★ **1.00048** | ★ **the leader gains 0.05% per frame — parity** |
| residual (unread + role-swap noise) | 1.01101 | stated, not hidden |

### ★ THE TRAFFIC DIFFERENCE IS TOTAL, AND IT IS STILL NOT A RUNAWAY

| | leader | second |
|---|---|---|
| braking by avoidance | ★ **0.0%** of frames | ★ **25.6%** |
| drafting | 0.0% | 14.6% |

★ **The racer in front NEVER brakes for traffic — not in one frame of 20 586.** Second brakes in a
quarter of them. That is exactly the free-road effect the question anticipated, and it is worth
**+0.80% per frame**.

★★ **BUT IT DOES NOT PRODUCE THE GAP, BECAUSE THE SERVO CANCELS IT.** The traffic advantage (+0.80%)
and the steering brake (−0.77%) are the same size and opposite in sign. The net is **1.00048** — a
twentieth of one percent per frame — which is why §5 finds the gap closing rather than opening.

★ **SO THE PREMISE IN THE QUESTION DOES NOT HOLD.** The gap is not "mostly the absence of traffic"
running away unchecked; the absence of traffic is real and is being **held in check by the brake**.

★ **AND THE PLAIN CONSEQUENCE FOR THE INSTRUCTION YOU WERE WEIGHING, MARKED AS WHAT IT IS.** If the
racer in front were RELEASED — the brake in §2 removed — the +0.80% traffic advantage would no longer
be cancelled, and he would be expected to pull away **more**, not less. ★ **THAT IS AN INFERENCE FROM
THE MEASURED COMPONENTS, NOT A MEASURED ARM.** No released arm was run, because this piece was told to
build nothing. It is stated so you can see which way the lever points before you pull it; it is not a
result.

---

## 4 · WHAT THE FIELD BEHIND HIM IS DOING

`racePlanner.js:821-824` — `if (_preOutcome && !isHero) { _setTarget(r, 1.0, elapsedMs); continue; }`.
**Before OUTCOME the pack is not steered at all**, it is pinned to 1.0; only heroes are steered. From
OUTCOME on, every racer steers toward its drawn rank.

**Measured on the same 85 484 frames — second place's own `trajectoryMult`:**

| | n | median | above 1.0 | at the ceiling | below 1.0 |
|---|---|---|---|---|---|
| **second place** | 85 484 | **0.9963** | 25% | 0.2% | ★ **60%** |

★ **SECOND PLACE IS ALSO PREDOMINANTLY BEING BRAKED**, for the same reason: a racer running second is
usually ahead of the place it was drawn for. **The gap has two ends and neither end is being driven
away from the other.** Nobody at the front is running free; the whole front of the field is under a
brake.

---

## 5 · THE RACE YOU WATCHED — ★ I CANNOT IDENTIFY IT, AND I WILL NOT SUBSTITUTE ANOTHER

★ **No screenshot reached me in this conversation**, so there is no seed, no track, no field size and
no config to reproduce from. I am not presenting a different race as yours.

★ **AND EVEN WITH THE SEED, THE BROWSER RACE IS NOT THE HARNESS RACE.** A racer's NAME is physics here
— `stablePairBit` hashes `r.name` — and Quick Test auto-fills its own roster, so the same seed through
the browser door and through the harness are **different races**. Reproducing what you saw needs the
seed **and** the roster, which means the identifier from that race rather than a picture of it.

**What I can say about the aggregate instead**, from the 120 races:

| | |
|---|---|
| the held racer reaches rank 1 at some point | 55 of 82 races with detail (67%) |
| ★ **P1–P2 gap from 0.70 to the finish** | ★ **SHRANK in 55 of 55 races** — median **−0.273%** of race distance |
| while the held racer is the one in front | grew in 15, shrank in 38; median change **−0.001%** |
| gap back to 2nd at the winner's crossing | median **0.278%**, p90 **0.728%**, max **1.310%** |
| the largest gap seen | `garden-path`, 100 racers, seed 41002 — **1.310%**, and the held racer finished **5th** |
| the largest gap where the held racer WON | `ice-track`, 20 racers, seed 41002 — **1.145%** |

★★ **SO THE PICTURE YOU DESCRIBE IS NOT WHAT THESE 120 RACES PRODUCE.** In every one of them the
front gap **closes** over the last 30% rather than opening. I could not make a runaway happen.

★ **THE GAP THE OWNER SEES CANNOT BE READ AFTER THE RACE, and an earlier version of this instrument
got it wrong** — `advanceRacerT` clamps `t` at `finishT + 0.001` (`raceStep.js:133`) and a finished
racer stops advancing, so any post-race `t` difference is overshoot, not a gap. The numbers above are
taken **at the frame the winner crosses**, with the chaser still racing.

★ **ONE CANDIDATE I DID NOT MEASURE AND THEREFORE DO NOT CLAIM.** The endgame camera zooms in near the
finish, and a 1% distance gap under a close zoom fills much more of the screen than 1% of the track.
**Whether what you saw was a small gap magnified is a question about the camera, and this piece did
not measure it.** What would settle it: the race identifier from that race, replayed with the camera
recorded — not another aggregate.

---

## 6 · CHECKS

### `npm run verify` plain — **PASS 21 · FAIL 5 · SKIP 8**

★ **NOTHING MOVED.** The five failures are **exactly the five DIRECTION-AUTHORITY-1 already left on
this branch**, and no new one appeared:

| guard | status | whose |
|---|---|---|
| `world-fingerprint` | FAIL | piece 2's shipped change, by design |
| `camera-fingerprint` | FAIL | piece 2, by design |
| `render-fingerprint` | FAIL | piece 2, by design |
| `client-suite` | FAIL | piece 2 — three RECORDED outcomes; the live `real == sim` byte-identity still passes |
| `check-runin-frame` | FAIL | piece 2's own red, luger-hill at 100 racers |
| `check-index` | ★ **PASS** | it failed during piece 2 only because that report was not yet indexed |
| the other 20 | PASS | — |

★ **The working tree differs from `HEAD` in exactly two files: this report and its index line.** No
source file, no config, no curve, no gate and no number was touched — which is what "nothing should
move" was asking for and what the tally shows.

★ **THE INSTRUMENT IS IN THE SCRATCHPAD, NOT THE REPOSITORY**, because this piece was told to change
nothing. Its method is stated above in full so it can be rebuilt: read `trajectoryMult`,
`avoidanceActive`, `brakeMatchFactor`, `draftingBoostActive`, `areaBonusMult`, `governorMult`,
`_rowEnvSm` and `baseSpeed` off each racer per frame, multiply them, and check the product against the
racer's ACTUAL per-frame `Δt` so a missed factor cannot hide.

**`git stash` was not used. `--no-verify` was not used. No product source was touched.**

---

## 7 · WHAT IS OPEN

1. ★★ **The finish-order defect above.** Until both arms are re-run with `finishRank`, the claim that
   the held comebacker gains places rather than losing them is **not established**.
2. **The race you actually watched.** With its identifier I can replay it exactly; without it I cannot.
3. **Whether the camera magnifies the finish gap.** Named, unmeasured.

**No proposal is made here.**
