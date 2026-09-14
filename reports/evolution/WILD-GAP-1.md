# WILD-GAP-1 — the gap is opened by the racer BEHIND him, and `wild` is what puts him in front

**Branch** `night/2026-09-12b` · **REPORT ONLY — nothing built, nothing changed, nothing recommended.**
The instruments are in `C:/tmp`, outside the repository, so the tree has nothing to move.

★ **READ-ONLY ON HIS DATA.** One `GET /api/races/QN3HDP` through his own authenticated session;
nothing created, altered or deleted. The payload was copied to a scratch file and deleted afterwards.

★★ **THE ANSWER IN ONE LINE: HE IS NOT DRIVEN AWAY — THE MAN BEHIND HIM IS HELD BACK.** While the
gap opens, the comebacker is **braked at −5%** on every frame; his pursuer is **pinned at the servo
floor of 0.85** (`racePlanner.js:103`). The gap grows at **+0.049 canvas widths per second** for
exactly as long as that pursuer is pinned and shrinks at **−0.047 w/s** the moment an unbraked racer
takes second. **His own brake is identical in both phases.**

★★ **AND WHAT `wild` CHANGES IS NOT THE GAP — IT IS WHETHER ANYONE IS IN FRONT OF HIM.** On his world
Breeze **leads the race for 877 frames (14.6 s)**; on `quiet`, the same race, same seed, same roster,
he leads for **0**. The gap he holds over the man behind is nearly the same on both (0.349 vs 0.304
widths, at nearly the same zoom). On `quiet` that reads as a fight for the lead, because somebody is
0.07 widths ahead of him. On `wild` it reads as a runaway, because nobody is.

---

## 1 · HIS RACE, FRAME BY FRAME

### 1.1 · The cast, which the store does not keep

★ **THE STORED RECORD CARRIES NO HERO CAST AND NO DRAWN RANKS** — `racePlanSeed` and
`racePlanEnabled` are there, but the cast is computed at the choreo boundary and never persisted. So
it **cannot be recovered from the store** and is established from the replay instead:

| | |
|---|---|
| ★ **cast comebacker** | **Breeze**, racer index 38 |
| ★ **his drawn place** | **2** |
| his finish | **7th of 40**, 80 832 ms |
| the winner | Bolt, 80 032 ms |

### 1.2 · ★★ THE GAP TO THE RACER BEHIND HIM — THE WHOLE RACE, 4 127 FRAMES

**Only medians have been shown to him.** All three are given here, in both units — canvas widths at
the zoom actually in force, and race distance, which has no camera in it at all.

| | median | **p90** | **MAX** |
|---|---|---|---|
| ★ **canvas widths** | **0.018** | ★ **0.172** | ★ **0.349** |
| race distance | 0.075% | 0.890% | 1.538% |

★★ **THE MEDIAN IS NOT THE PICTURE.** It is nineteen times smaller than the peak, because for most of
the race he is inside the pack. **What he watches is the tail.**

| the peak | |
|---|---|
| size | ★ **0.349 canvas widths** (1.538% of the race) |
| when | progress **0.8369**, **66 608 ms** of an 87 s race, ★ **lap 2** |
| his rank there | ★ **1st** |
| ★ **how long it lasts** | ★ **6 784 ms above half the peak** |
| the camera at that moment | `LEAD_CHANGE`, `visibleWorldPx` 270 |

★ **AND HOW LONG HE IS IN FRONT AT ALL: 877 frames — 14.6 s — in ONE unbroken spell**, from progress
0.7418 (59 472 ms) to 0.9207 (74 080 ms). Then he loses it and finishes 7th.

### 1.3 · The shape of it, and his pace

| ms | progress | rank | gap behind (w) | % of race | the man behind | HIS servo | PURSUER's servo |
|---|---|---|---|---|---|---|---|
| 58 880 | 0.7352 | 6 | 0.067 | 0.257% | Drift | **1.1000** | 0.9492 |
| 59 856 | 0.7476 | ★ **1** | 0.038 | 0.160% | **Blitz** | 1.0959 | ★ **0.8502** |
| 60 848 | 0.7622 | 1 | 0.117 | 0.507% | Blitz | 1.0103 | 0.8502 |
| 61 824 | 0.7752 | 1 | 0.163 | 0.718% | Blitz | **0.9498** | 0.8502 |
| 62 816 | 0.7883 | 1 | 0.209 | 0.919% | Blitz | 0.9498 | 0.8502 |
| 63 792 | 0.8012 | 1 | 0.254 | 1.117% | Blitz | 0.9503 | 0.8502 |
| 64 768 | 0.8141 | 1 | 0.299 | 1.315% | Blitz | 0.9503 | 0.8502 |
| 65 760 | 0.8269 | 1 | 0.338 | 1.488% | Blitz | 0.9502 | 0.8502 |
| 66 736 | 0.8383 | 1 | ★ **0.346** | 1.523% | Atlas | 0.9502 | 0.8779 |
| 67 728 | 0.8495 | 1 | 0.286 | 1.260% | ★ **Flare** | 0.9502 | ★ **1.0003** |
| 68 704 | 0.8604 | 1 | 0.204 | 1.061% | Flare | 0.9501 | 1.0001 |
| 69 696 | 0.8715 | 1 | 0.124 | 0.858% | Flare | 0.9500 | 1.0001 |
| 71 664 | 0.8936 | 1 | 0.081 | 0.457% | Flare | 0.9500 | 1.0001 |
| 73 632 | 0.9157 | 1 | 0.023 | 0.094% | Flare | 0.9502 | 1.0001 |
| 74 608 | 0.9276 | 3 | 0.058 | 0.239% | Bolt | 0.9570 | 1.0000 |

★ **HIS OWN MULTIPLIER IS 0.95 FROM THE MOMENT THE GAP STARTS GROWING UNTIL AFTER IT HAS CLOSED.** It
does not move. **The column that moves is the pursuer's.**

### 1.4 · ★★ IS THIS THE FRAME HIS SCREENSHOT SHOWS? **YES, AND THE RACE NUMBER PROVES IT**

His panel read **`1 · Breeze`** with the crown and, under it, **`2 | 27 | Blitz`** — rank, race
number, name (`ScoreboardSlots.jsx:45`, `ScoreboardCard.jsx:90`).

★ `assignRaceNumbers(40, 3)` — deterministic from the race seed (`raceNumbers.js:56`) — gives
**Breeze number 1** and ★ **Blitz number 27**. And the replay says the racer immediately behind
Breeze, for **all 428 frames** the gap is opening, is **Blitz**.

★★ **SO THE FRAME HE PHOTOGRAPHED IS INSIDE THE WINDOW MEASURED ABOVE**: lap 2, Breeze leading, Blitz
second, the field strung out behind. **It is reproduced racer for racer and number for number.**

### 1.5 · ★ WHO ELSE OPENS A GAP — AND THIS TIME IT REALLY IS HIM

He has twice reported "the comebacker" and it has twice been somebody else. Not here:

| | **the largest gap-behind in the race** | who holds it | when | camera |
|---|---|---|---|---|
| ★ **`wild` — his world** | ★ **0.349 w** (1.538%) | ★ **Breeze — THE COMEBACKER** | progress 0.837, mid-race | `LEAD_CHANGE`, vw 270 |
| `quiet` | 0.670 w (1.312%) | **Flare — the leader** | progress 0.9996, **at the line** | `PHOTO_FINISH`, vw 120 |

★★ **THE 0.670 IS A ZOOM, NOT A GAP.** In race distance `quiet`'s biggest gap is **smaller** than
`wild`'s (1.312% against 1.538%) — it only reads bigger on screen because the photo-finish shot is
**twice as close** (`visibleWorldPx` 120 against 270). ★ **A canvas-width figure quoted without the
zoom it was measured at cannot be compared with another**, and this report gives both throughout.

---

## 2 · WHY — WITH ADDRESSES, FROM THE REPLAY

### 2.1 · ★★ DRIVE OR ABSENCE OF TRAFFIC? **NEITHER. IT IS THE BRAKE ON THE OTHER RACER**

The speed a racer carries is `baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult
· governorMult` (`raceStep.js:106`). Taking the **ratio** of his speed to the man behind's cancels
everything they share, and every term is measured, not assumed. Over the 428 frames the gap opens:

| term | ratio, him ÷ the man behind | what it means |
|---|---|---|
| ★ **his whole speed** | ★ **1.1814** | he gains 18% a frame |
| the **servo** (`trajectoryMult`) | ★ **1.1177** | ★ **his 0.9503 against his pursuer's 0.8502** |
| baseSpeed (draw + row bonus) | 1.0573 | a real but small edge |
| ★ **traffic** (avoidance brake) | ★ **1.0000** | **both are completely clear** |
| ★ **the governor — where the STAGE acts** | ★ **1.0000** | **the stage is not acting here at all** |
| area bonus | 1.0000 | — |
| row envelope (residual) | 1.0000 | — |

★★ **DRIVE CONTRIBUTES NOTHING: the servo commands above 1.0 on 0.0% of the frames he leads.** He is
braked the whole way. ★★ **AND "ABSENCE OF TRAFFIC" EXPLAINS NOTHING EITHER — because his pursuer has
no traffic in front of him either.** Both are clear; the ratio is exactly 1.0000.

★ **THE PURSUER IS AT THE FLOOR.** `minMult: 0.85` (`racePlanner.js:103`) is the servo's lower clamp,
and `Blitz` sits at **0.8502** for all 428 frames — **saturated**. He is drawn **14th** and running
**2nd**, a 12-rank error, so the servo pushes him down as hard as it is allowed to.

★ **THE RATE, AND ITS SIGN, FOLLOW THE PURSUER AND NOT HIM:**

| while he leads | frames | median gap | ★ **the gap is** |
|---|---|---|---|
| pursuer **pinned** at 0.85 | 429 | 0.219 w | ★ **OPENING at +0.049 w/s** |
| pursuer **not pinned** | 448 | 0.102 w | ★ **CLOSING at −0.047 w/s** |
| **his own multiplier** | | **0.9503 / 0.9500** | ★ **identical in both** |

### 2.2 · ★ THE LEADER'S TRAFFIC TERM, RE-ESTABLISHED ON `wild`

It was 0.00% over 160 `quiet` races, and a doubled challenger boost changes who is in front of whom,
so it was re-measured rather than carried over. **On `wild` it is 0.06% of 5 048 leader-frames; on
`quiet`, in this same race, 0.08% of 5 009.** ★ **The leader is still never in traffic** — but §2.1
shows that this is not what separates the opening phase from the closing one, because **the man
chasing him is not in traffic either.**

### 2.3 · ★ IS THE 0.97 RELEASE INVOLVED? **NO**

The peak is at progress **0.8369** and he has lost the lead by **0.9207** — both well before
`choreoReleaseProgress` 0.97. Past the release he has **176 frames**, a median commanded multiplier
of **0.9998**, and a median gap behind of **0.025 widths**. ★ **The release is real and it does zero
his error — but it happens after the picture the owner is describing is already over.**

---

## 3 · ★★ THE SAME RACE ON BOTH STAGES, SIDE BY SIDE

Same seed, same forty names, same track, same build. The **only** difference is the two dynamics
values. (`quiet` here is his stored world moved to that stage through `applyRaceActionStage`, so
nothing else about his install changes.)

| | ★ **`wild` — what he races** | `quiet` — what every measurement used |
|---|---|---|
| `pulkChallengerBoost` / `pulkLeaderBrake` | **0.12 / 0.15** | 0.06 / 0.10 |
| Breeze finishes | **7th**, 80 832 ms | **3rd**, 79 744 ms |
| the winner | Bolt | Flare |
| ★ **frames he LEADS THE RACE** | ★ **877 (14.6 s)** | ★ **0** |
| his peak gap behind | **0.349 w** at **rank 1** | 0.304 w at **rank 2** |
| at his peak, who is ahead of him | ★ **nobody** | ★ **the leader, 0.072 w away** |
| the camera at his peak | `LEAD_CHANGE`, vw 270 | `LEADER_ZOOM`, vw 265 |
| his servo while the gap is open | **0.95 — braked** | **1.02–1.07 — driven** |
| his own traffic, whole race | 57.1% of frames | 70.3% |

★★ **THE GAP BEHIND HIM IS ALMOST THE SAME ON BOTH STAGES, AT ALMOST THE SAME ZOOM. WHAT `wild`
CHANGES IS HIS RANK WHILE HE HOLDS IT.** On `quiet` he is second with a racer on his shoulder — the
same 0.3 widths back to third, but the picture is a duel for the lead. On `wild` he is first and the
same gap is a runaway.

★ **AND THE SIGN OF HIS OWN SERVO FLIPS FOR THE SAME REASON.** Drawn 2nd: at rank 3 the servo drives
him (`quiet`, 1.02–1.07); at rank 1 it brakes him (`wild`, 0.95). `wild` moves him one place further
forward, and one place is the whole difference.

★ **SO: DOES THE FIELD CLOSE FASTER ON `wild`, OR DOES HE OPEN IT FASTER?** **Neither.** The doubled
challenger boost acts **earlier** — it gets him out of the pack (his traffic falls from 70.3% to
57.1% of frames) and to the front. Once there, §2 governs, and §2 has nothing to do with the stage:
the governor ratio in the opening phase is **1.0000**.

---

## 4 · ★ WHAT THIS WEEK'S WORK DOES ON `wild`

**Method.** `sim-fairness.mjs --arrival-shape`, ten tracks each at its own default racer, **N=40, 30
races per cell — 300 races per arm, 207 cast comebackers per arm.** The two arms are the same command
with one difference: `--config` pointing at a world blob whose `raceDynamicsConfig` carries the
stage's two values. ★ **No repository file was edited to do this** — the sim has taken `--config`
since Stage 0, which is the door HARNESS-WORLD-1 §6 said was already open. The reductions are
`exp-arrival-shape.mjs`'s own (`blockRate` = `finishRank <= BAND_EDGES[0]`, `arrivalMult` = the
controller's telemetry), so these numbers sit beside this week's without the definitions drifting.

| quantity | `quiet` — what every measurement used | ★ `wild` — what he races | ★ does the conclusion survive? |
|---|---|---|---|
| cast comebackers | 207 | 207 | — |
| median drawn place | 4 | 4 | — |
| ★ **arrival pace**, median | 1.0506 (**43 px/s**) | ★ **1.0400** (**34 px/s**) | ★ **YES — and it is GENTLER on his world**, not worse |
| arrival p90 / MAX | 1.0920 / 1.1000 | 1.0931 / 1.0999 | ★ **YES — unchanged**; the ceiling still fails to bind at the top end on both |
| arrives at pace (≤1.001) | 1.4% | 2.9% | ★ **YES** — still almost never, on either |
| ★ **block rate** | 86.5% | ★ **88.4%** | ★ **YES — and slightly better**, still above the 84% baseline |
| peak gap while leading, median | 0.254% of the race | 0.268% | ★ **YES** — within a hair |
| peak gap p90 | 0.751% | 0.750% | ★ **YES — identical** |
| ★ peak gap **MAX** | 1.532% | ★ **2.025%** | ★ **NO — the TAIL is 32% bigger on `wild`** |

★★ **SO THE SHAPE OF THIS WEEK'S WORK SURVIVES HIS WORLD.** Arrival pace, block rate and the typical
peak gap are the same or better on `wild`. **Nothing in the branch has to be re-decided.**

★★ **THE ONE THING THAT DOES NOT SURVIVE IS THE ONE HE COMPLAINS ABOUT: the extreme.** The worst peak
gap is **2.025% of the race against 1.532%** — and §1 is what that looks like on screen. ★ **The
medians were never the problem, and this is the third time that has turned out to be true.**

★ **ONE DEFINITION MUST NOT BE READ ACROSS THE TWO HALVES OF THIS REPORT.** The sim's "he led at all"
(202 of 207 on `wild`, 197 of 207 on `quiet`) comes from the controller's `maxLeadGapFrac`, which
counts a racer whenever he is **first among those still running** — including after other racers have
crossed. §1 and §3 deliberately exclude that, which is why they can say he led for **0 frames** on
`quiet` in the race where the controller records a lead. ★ **Both are right about their own
quantity**; only the second is about being in front of a race that is still going on.

★ **BAND-REACH WAS NOT MEASURED, AND IS NOT ESTIMATED HERE.** `--arrival-shape` does not carry band
data — `exp-arrival-shape.mjs` says so in its own header, because the fairness gates "need a different
race count and their own sweep". The gate protocol is **300 races per track pooled**, so honouring it
on `wild` is a ~1-hour run per arm. ★ **Named rather than guessed at.**

---

## 5 · CHECKS

★ **NOTHING IN THE REPOSITORY WAS TOUCHED.** Both instruments live in `C:/tmp`; every output went to
the scratch directory. `git status` is clean but for this report, so ★ **the four fingerprints cannot
have moved** — the values measured in HARNESS-WORLD-1 against a worktree at `85262b1b` stand unchanged (world `b35cf477c09a1116`, world-off `19ccb497041a0dae`, camera `3df640a42e934312`, render `6a84085e79535dd6`).

**`git stash` was not used. `--no-verify` was not used. Nothing was minted.**
