# PURSUER-BRAKE-1 — the brake is serving his drawn place, and there is nothing to repair

**Branch** `night/2026-09-12b` · **REPORT ONLY — nothing built, nothing changed, nothing recommended.**
The instrument is in `C:/tmp`, outside the repository.

★ **READ-ONLY ON HIS DATA.** One `GET /api/races/QN3HDP` through his own authenticated session;
nothing created, altered or deleted. The copy was deleted after the runs.

★★ **THE ANSWER: IT IS SERVING HIS DRAWN PLACE.** `Blitz` is **drawn 14th** — from the fairness draw
itself, a Fisher-Yates shuffle over ranks 1..n (`racePlanner.js:206-215`) — and he is running **1st**.
The servo pushes him down as hard as it is allowed to, he comes back, and he finishes **11th**.
★ **That is the owner's own fairness rule doing exactly what it exists to do. The gap is its price.**

★★ **AND WILD-GAP-1'S DECOMPOSITION RE-VERIFIED AT SOURCE:** over the 428 frames the gap opens, the
whole-speed ratio is **1.1814**, of which the servo is **1.1177** — Breeze **0.9503** against Blitz
**0.8502**. `minMult` is **0.85** (`racePlanner.js:100`, `DEFAULT_CONTROLLER_PARAMS`, read by this
instrument rather than typed as a literal). Traffic **1.0000**, governor **1.0000**. **Confirmed.**

---

## 1 · BLITZ — WHO HE IS, WHAT HE IS DRAWN, AND HOW LONG HE IS AT THE FLOOR

| | |
|---|---|
| ★ **his drawn place** | ★ **14th** of 40 |
| where he actually is when pinned | ★ **1st–2nd** |
| ★ **is he a cast role?** | ★ **YES — `attacker-b2`** (`ctrl.getHeroRoles()`); **not** a held hero |
| his finish | ★ **11th** — three places short of his draw, from 1st |
| ★ **time at the floor, whole race** | ★ **11.3 s — 13.5% of the race**; longest unbroken spell **10.7 s** |
| ★ **time at the floor while he is the LEADER'S pursuer** | ★ **435 frames = 7.2 s** |
| the gap over that spell | median **0.217 w**, p90 **0.341**, MAX ★ **0.349** |

★★ **THE SERVO'S TARGET FOR HIM IS 14 ON EVERY FRAME OF THE RACE.** It never moves — not during the
attack, not after it. Traced:

| progress | ms | live rank | ★ SERVO TARGET | commanded | realised | |
|---|---|---|---|---|---|---|
| 0.0453 | 3 712 | 7 | **14** | 1.0000 | 1.0000 | |
| 0.1852 | 14 816 | 15 | **14** | 1.0999 | 1.0999 | driven UP toward his place |
| 0.4262 | 33 312 | 6 | **14** | 1.0103 | 1.0919 | |
| 0.6151 | 48 112 | 14 | **14** | 0.9994 | 1.0406 | ★ **at his drawn place** |
| 0.6990 | 55 504 | 8 | **14** | 1.0006 | 1.0008 | |
| ★ 0.7389 | 59 216 | ★ **1** | **14** | ★ **0.8502** | 0.8502 | ★ **FLOOR** |
| 0.7896 | 62 912 | 2 | **14** | 0.8502 | 0.8502 | ★ FLOOR |
| 0.8369 | 66 608 | 2 | **14** | 0.8502 | 0.8502 | ★ FLOOR |
| 0.8783 | 70 304 | 6 | **14** | 0.9992 | 0.8746 | the brake lets go |
| 0.9200 | 74 016 | 12 | **14** | 1.0008 | 0.9241 | ★ back at his place |

★ **THE FLOOR IS REACHED BECAUSE THE ERROR IS TWELVE RANKS.** The servo is
`clamp(1.0 + gain · error/nActive + noise, minMult, maxMult)` with `gain 2.0`
(`racePlanner.js:439`); at N=40 it saturates at about **2 ranks** of error. Twelve is six times past
saturation, so the clamp is the only thing left. **There is no separate "maximum brake" mechanism —
the floor IS the arithmetic.**

### 1.1 · ★ ONE NUMBER THAT DOES NOT MATCH, NAMED RATHER THAN SMOOTHED OVER

His race runs `b2AttackPeakRank 5` and `b2AttackFinalRank 7` in the window `b2AttackProgress
{start: 0.4, end: 0.7}`. ★ **Blitz reached 1st at progress 0.739 — after that window had closed** —
and the servo's target for him is **14**, not the attacker curve's 7.

★ **So two different numbers describe where this racer "should" end up**: the authored fall target
(**7**, `heroCurveGenerator.js:712`) and the fairness draw (**14**, `racePlanner.js:215`). The servo
steers to the draw. He finished **11th**, between them. **This report states the discrepancy and does
not call it a defect** — the draw is what the fairness promise is written against, and steering to it
is correct. Whether the attacker's own `finalRank` should agree with the draw is an owner question,
and it is not answered here.

---

## 2 · ★ HOW OFTEN DOES THIS HAPPEN — AND IS HIS RACE TYPICAL?

**Method.** 120 races on `wild`, N=40, **ten tracks at their own default racer**, 12 seeds each, the
same driver and the same camera conversion as WILD-GAP-1. "Pinned" is `trajectoryMultTarget <=
minMult + 1e-3`, with `minMult` read from `DEFAULT_CONTROLLER_PARAMS`.

| quantity | median | p90 | MAX | ★ **his race** |
|---|---|---|---|---|
| share of leader-frames with the pursuer at the floor | **12.2%** | 26.3% | 36.5% | ★ **36.5%** |
| longest unbroken pinned spell (whoever the pursuer is) | **3.4 s** | 8.4 s | 12.8 s | 8.8 s |
| the gap while pinned — that race's median | 0.077 w | 0.229 | 0.458 | 0.217 |
| ★ the gap while pinned — that race's **MAX** | ★ **0.301 w** | ★ **0.625** | ★ **1.484** | ★ **0.349** |

★★ **HIS RACE IS NOT AN EXTREME — IT IS ORDINARY.** **48 of 120 races (40%)** produce a pinned-pursuer
gap **at least as large as the one he photographed**, and the worst is **1.484 canvas widths — more
than four times his**. On the pinned SHARE he is at the top of the sample; on the thing he can
actually see, the gap, he is just above the median.

★ **INTERNAL CHECK.** `city-circuit` seed 3 in this sweep **is** his race — same seed, same roster,
same stage — and it reports the pinned share as **36.5%**, the figure measured independently from his
stored record. ★ **The two paths agree.** (The widths differ slightly — 0.409 w here against 0.349 —
because the sweep runs the DEFAULT camera and his record carries his own tuned one. **A width is a
gap divided by the visible world, so it is a property of his camera settings as much as of the race**,
and his settings make this gap look *smaller* than the shipped camera would.)

### 2.1 · Per track

| track | pinned share (median of 12 seeds) | longest spell | worst gap while pinned |
|---|---|---|---|
| city-circuit | 15.2% | 5.4 s | 0.512 w |
| dirt-oval | 13.8% | 5.0 s | 0.736 w |
| garden-path | 11.1% | 3.2 s | 0.194 w |
| ice-track | 14.5% | 4.6 s | 0.365 w |
| luger-hill | 20.7% | 5.6 s | 0.857 w |
| mountainstreet | 8.6% | 1.8 s | 0.649 w |
| river-run | 10.3% | 2.5 s | ★ **1.266 w** |
| searound | ★ **23.9%** | ★ **6.2 s** | 0.512 w |
| seatrack | 10.6% | 1.8 s | ★ **1.484 w** |
| space-sprint | 8.2% | 2.3 s | ★ **1.342 w** |

★ **The tracks where it happens MOST are not the tracks where it looks WORST.** `searound` pins a
pursuer on 23.9% of leader-frames and tops out at 0.512 w; `seatrack` pins on 10.6% and reaches
1.484. **Duration and visibility are different questions**, which is why both columns are here.

---

## 3 · ★★ THE WHOLE FIELD — IT IS NOT A LEADER PHENOMENON AT ALL

| his race, 40 racers, 84 s | |
|---|---|
| ★ **racers who touch the floor at all** | ★ **36 of 40** |
| with a spell of **1 s** or more | 32 |
| with a spell of **3 s** or more | ★ **28** |
| with a spell of **5 s** or more | ★ **19** |
| ★ **median racer's time at the floor** | ★ **9.1 s — 10.9% of the race** |
| median racer's longest single spell | **4.7 s** |
| cast racers (6) vs uncast (34), median time at floor | **11.3 s** vs **9.1 s** |

★ **AND IT IS THE SAME IN EVERY RACE MEASURED:** across the 120-race sweep, the number of racers
touching the floor per race is **median 36 of 40, minimum 35, maximum 37.**

★★ **SO A RACER PINNED AT MAXIMUM BRAKE FOR SECONDS IS THE NORMAL CONDITION OF THIS GAME, NOT AN
EVENT.** It does not cluster behind the leader — **nine racers in ten are doing it at some point**, and
a cast role is barely more likely to than an ordinary racer (11.3 s against 9.1 s). ★ **The picture he
dislikes is therefore being produced all over every race.** What is special about the place he noticed
it is only that **the leader is the racer the camera is pointed at** — and a gap behind the leader is
the one gap with nothing in front of it to hide it.

---

## 4 · ★★ THE DECISIVE ANSWER: IT IS SERVING THE DRAWN PLACE

★ **Not an artefact.** The evidence, in one place:

- the target is **14 on every frame**, and 14 is his **drawn place** from the fairness shuffle
  (`racePlanner.js:206-215`) — not a curve parameter, not a stale value, not a camera artefact;
- the floor is reached **because the error is twelve ranks** and the servo saturates at about two
  (`racePlanner.js:439`), so the clamp is arithmetic, not a special mechanism;
- the brake **lets go the moment he is back near his place** (progress 0.878, rank 6 → commanded
  0.9992), which is what a servo serving a target does and what an artefact would not do;
- and he **finishes 11th** against a draw of 14th, from 1st. ★ **It worked.**

★★ **SO THERE IS NOTHING TO REPAIR, AND THE CHOICE IS THE OWNER'S. THE TWO COSTS, ONE LINE EACH:**

> ★ **ACCEPT THE GAP** — a racer far above his drawn place is pulled back at −15% while the man in
> front of him is pulled back at −5%, and in clear air that opens a visible gap: **0.3 canvas widths
> or more in 40% of races, up to 1.48.**
>
> ★ **ACCEPT A RACER NOT REACHING HIS DRAWN PLACE** — weaken the floor and Blitz stays near the front
> instead of returning to 14th, which is the fairness promise itself (`docs/FAIRNESS.md`), the thing
> band-reach and the drawn place are measured against, and the reason the plan exists at all.

★ **This report chooses neither and recommends nothing.** ★ **What it does establish is that three
days of work on the COMEBACKER could never have changed this picture** — he is not the racer whose
brake opens the gap.

---

## 5 · CHECKS

★ **NOTHING IN THE REPOSITORY WAS TOUCHED.** The instrument is `C:/tmp/pursuer-brake.mjs`; every
output went to the scratch directory. `git status` is clean but for this report, so the four
fingerprints cannot have moved — the values measured in HARNESS-WORLD-1 against a worktree at
`85262b1b` stand (world `b35cf477c09a1116`, world-off `19ccb497041a0dae`, camera `3df640a42e934312`,
render `6a84085e79535dd6`).

**`git stash` was not used. `--no-verify` was not used. Nothing was minted.**
