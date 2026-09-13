# BREAKAWAY-FREQUENCY-1 — about seventy races in a hundred, at every action setting

**Branch** `night/2026-09-12b` · **MEASUREMENT ONLY — nothing built, nothing minted, no lever proposed.**
The instruments are in `C:/tmp`. The only repository change is the one-comment correction the brief
asked for (§7), and the world fingerprint is **unmoved** across it.

★ **READ-ONLY ON HIS DATA.** One `GET /api/races/QN3HDP`; nothing created, altered or deleted, and the
copy was deleted after the runs.

---

## ★★ THE ONE LINE

> **In about 71 races out of every 100 he would see a racer run at least as far ahead as the one he
> photographed.** At his own settings — `wild`, 40 racers — that is 71 of 100. ★ **And it is not the
> action stage that puts it there: `quiet` gives 70 of 100 and `medium` 69.** What the stage changes is
> how far the worst ones go, not whether they happen.

★ **Two figures that complete the sentence, because "how often" alone would mislead:** the gap is held
above half its peak for a median of **4.0 s**, and in **28 of every 100 breakaways the racer is never
reeled in at all** — he leads to the line and wins. **That second picture is one he has never
described, because in his own race it did not happen.**

---

## 1 · HIS RACE, AS THE REFERENCE ROW

Replayed from the store, his own world, his own camera:

| | ★ `QN3HDP` |
|---|---|
| the breakaway | **Breeze**, the cast **comebacker**, drawn 2nd |
| peak gap | ★ **0.349 canvas widths** (1.538% of the race) at progress **0.837** |
| held above half-peak | ★ **6.8 s** |
| from taking the lead to the speed turning | ★ **7.1 s** |
| reeled in? | ★ **YES** — passed at progress 0.921, finished **7th** |
| in his own race it is | ★ **1 of 35 lead spells** — nearly twice the next biggest (Bolt, 0.180 w) |

★ **ONE READING TO KEEP STRAIGHT, AND IT IS THE CAMERA.** A canvas width is a gap divided by
`visibleWorldPx`, so it is partly a property of HIS camera settings. The same race in the sweep, under
the **shipped** camera, reads **0.409 w**. Same race, same holder, same verdict — **his own camera
makes the gap look SMALLER than the default one would.** Both numbers are given throughout; the
race-distance column has no camera in it at all.

---

## 2 · HOW OFTEN A BREAKAWAY HAPPENS — `wild`, BY FIELD SIZE

**Method.** 400 races on `wild`: ten tracks at their own default racer × {40, 20, 60, 100} × 10 seeds.
A LEAD SPELL is a contiguous run at rank 1 among active racers **with nobody yet across the line** —
"first among those still running" is not the lead once racers have finished.

| field | races | ★ **≥ 0.349 w (his)** | ≥ 0.5 w | ≥ 1.0 w | ≥ 1.5 w | median race max | p90 | MAX |
|---|---|---|---|---|---|---|---|---|
| ★ **40 — his** | 100 | ★ **71.0%** | 47.0% | 14.0% | 6.0% | 0.483 | 1.342 | **2.387** |
| 20 | 100 | **57.0%** | 44.0% | 17.0% | 5.0% | 0.426 | 1.221 | **3.188** |
| 60 | 100 | **79.0%** | 65.0% | 19.0% | 4.0% | 0.571 | 1.330 | 1.948 |
| 100 | 100 | **76.0%** | 56.0% | 14.0% | 5.0% | 0.527 | 1.292 | 2.944 |

★ **THE WORST IN 400 RACES IS 3.188 CANVAS WIDTHS — NINE TIMES HIS.**

★★ **THIS RE-ESTABLISHES, AND DOES NOT CARRY, GAP-CEILING-BASELINE-1's 40%.** That figure was a
**narrower quantity**: gaps held *while the pursuer was pinned at the servo floor*. This one counts
**every** lead gap however it arose. ★ **Both are right about their own question**; the 71% is the
answer to the one he is asking now.

---

## 3 · HOW LONG IT LASTS — AND WHETHER HE IS ALWAYS PULLED BACK

Every spell at or above his 0.349 w, on `wild`:

| field | breakaways | per race | half-peak hold med / p90 / MAX | lead→turn med / p90 / MAX | reeled in | ★ **NEVER reeled in** |
|---|---|---|---|---|---|---|
| ★ **40** | 139 | 1.39 | **4.0** / 7.4 / 13.7 s | **5.6** / 10.9 / 16.7 s | 71.9% | ★ **28.1%** |
| 20 | 122 | 1.22 | 4.3 / 7.6 / 12.0 s | 5.0 / 10.1 / **28.6 s** | 73.8% | 26.2% |
| 60 | 160 | 1.60 | 4.0 / 7.3 / 12.4 s | 5.6 / 10.5 / 22.3 s | 70.0% | 30.0% |
| 100 | 143 | 1.43 | 4.4 / 7.7 / **14.8 s** | 5.6 / 10.6 / 19.3 s | 69.2% | 30.8% |

★ **HIS OWN 6.8 s AND 7.1 s SIT ABOVE THE MEDIAN ON BOTH** (4.0 s and 5.6 s) — **a longer-than-typical
breakaway, not an extreme one.** Roughly p85 on the hold.

★★ **AND HE IS NOT ALWAYS PULLED BACK: 28 of every 100 breakaways at N=40 are never closed.** ★ **The
definition is checked, not assumed** — of the 37 N=40 races whose biggest-gap holder was not reeled in,
**37 of 37 finished 1st.** He led when the first racer crossed, which is what "not reeled in" means.

> ★ **So there are two pictures, not one.** His — run far ahead, get caught, finish 7th — is the
> COMMON one at about 72%. The other, in 28 of 100, is a racer who goes clear and stays clear.

---

## 4 · ★★ WHO IT IS — NOT ALWAYS THE COMEBACKER, AND NOT RANDOM EITHER

★ **THE ROLE HOLDING THE LARGEST GAP, PER RACE** — a distribution, not a pooled share. N=40 on `wild`,
the 71 races that contain a breakaway. The denominator is measured: a cast census of the same 100
races gives **1.68 comebackers, 0.37 sovereign-leads, 2.97 attacker-b2, 0.49 fallers and 34.5 uncast**
per 40-racer field.

| role | races it holds the largest gap | share of races | share of the FIELD | ★ over-represented by |
|---|---|---|---|---|
| — **not cast** — | 31 | **43.7%** | 86.2% | ★ **0.5× — UNDER-represented** |
| ★ **comebacker** | 25 | ★ **35.2%** | 4.2% | ★ **8.4×** |
| ★ **sovereign-lead** | 15 | **21.1%** | 0.9% | ★ **22.8×** |
| **attacker-b2** | ★ **0** | ★ **0%** | 7.4% | ★ **never, despite 3 per race** |
| faller | 0 | 0% | 1.2% | never |

★★ **THE COMEBACKER'S OWN SHARE, STATED PLAINLY: he holds the largest gap in about ONE RACE IN THREE
(35%).** ★ **So the work of the last two weeks was NOT aimed at the wrong racer — but it was aimed at
one of three.** In the other two races in three it is an **uncast racer** (44%) or the
**sovereign-lead** (21%), and neither was ever the subject of that work.

★ **PER RACER, THOUGH, HE IS FAR FROM INCIDENTAL: 8.4× his share of the field**, and the
sovereign-lead **22.8×**. ★ **The uncast 86% of the field is UNDER-represented at 0.5×** — breakaways
are a cast phenomenon more often than chance would give, even though the single most likely holder is
an uncast racer simply because there are so many of them.

★★ **AND `attacker-b2` NEVER HOLDS THE LARGEST GAP IN A RACE — 0 of 71** — though attackers do make
breakaways (4.6% of all spells pooled, always reeled in, median finish 15th). ★ **That is `Blitz`'s
role**: it produces a surge and a return, never the runaway.

★ **His two earlier reports were right to be corrected, and this is the third case:** in `QN3HDP`
itself the largest gap **IS** the comebacker's. One race in three is exactly the rate at which that
happens.

---

## 5 · BY FIELD SIZE

★ **RAREST AT TWENTY, COMMONEST AT SIXTY.** 57% (N=20) · **71% (N=40)** · 79% (N=60) · 76% (N=100).
★ **It is not a large-field effect** — his forty is near the middle — **and the single worst gap of the
whole sweep, 3.188 w, is at N=20**, where breakaways are rarest but the field is thinnest behind the
leader.

---

## 6 · ★★ IS IT THE RACE, OR THE PRICE OF THE STAGE HE CHOSE?

**Method.** The same instrument, unedited, on all three stages. ★ **`quiet` and `medium` were run at
N=40 only** — 100 races each — because the full three-stage sweep across four field sizes is 1 200
races and would not have finished. **N=40 is what he races and what he judged. Stated rather than
padded out.**

| stage | boost / brake | races | ★ **≥ 0.349 w** | ≥ 0.5 | ★ **≥ 1.0** | ★ **≥ 1.5** | median max | ★ **p90** | MAX |
|---|---|---|---|---|---|---|---|---|---|
| **quiet** | 0.06 / 0.10 | 100 | ★ **70.0%** | 55.0% | **6.0%** | **2.0%** | 0.554 | **0.825** | 2.368 |
| **medium** | 0.12 / 0.10 | 100 | ★ **69.0%** | 48.0% | 10.0% | 3.0% | 0.489 | 1.076 | **3.181** |
| ★ **wild — his** | 0.12 / 0.15 | 100 | ★ **71.0%** | 47.0% | ★ **14.0%** | ★ **6.0%** | 0.483 | ★ **1.342** | 2.387 |

| stage | breakaways | half-peak med | lead→turn med | reeled in | NEVER reeled in |
|---|---|---|---|---|---|
| quiet | 136 | 3.8 s | 5.6 s | 67.6% | 32.4% |
| medium | 134 | 4.1 s | 5.5 s | 66.4% | 33.6% |
| ★ **wild** | 139 | 4.0 s | 5.6 s | **71.9%** | **28.1%** |

> ★★ **THE ANSWER: THE OCCURRENCE IS A PROPERTY OF THE RACE. THE EXTREME IS THE PRICE OF THE STAGE.**
>
> ★ **Whether a breakaway happens is the same at every setting** — 70 / 69 / 71 in a hundred — and so
> is how long it lasts (3.8–4.1 s) and how long it takes to turn (5.5–5.6 s). ★ **Switching to `quiet`
> would not stop him seeing this.**
>
> ★ **What `wild` buys is the tail.** Races reaching **1.0 width** go 6% → 10% → **14%**; reaching
> **1.5 width**, 2% → 3% → **6%**; and the p90 of the race maximum rises **63%**, 0.825 → **1.342**.
> ★ **On `wild` the worst breakaways are about a third bigger, and the 1.5-width case is three times
> as common.** ★ **He is also marginally MORE likely to see the racer caught on `wild`** (71.9% against
> 67.6%), which cuts the other way.
>
> ★ **So it is a setting AND a property of the race, in different places — and the part that is a
> setting is the part he objects to. That is his to weigh.**

### 6.1 · ★★ ONE THING FROM HIS RACE THAT DOES **NOT** GENERALISE — A CORRECTION

WILD-GAP-1 measured Breeze leading **877 frames on `wild` and 0 on `quiet`** in `QN3HDP`, and the brief
asked for that to be re-established on the sweep. ★ **IT DOES NOT HOLD AS A GENERAL PROPERTY.** Same
ten tracks, ten seeds, N=40, the comebacker cast in 97 of 100 races:

| stage | ★ races where the comebacker leads at all | median frames when he does | share of ALL lead-frames held by comebackers |
|---|---|---|---|
| **quiet** | ★ **80.4%** (78/97) | 610 | 12.7% |
| **medium** | 78.4% (76/97) | 654 | 12.6% |
| ★ **wild** | ★ **81.4%** (79/97) | 552 | 12.2% |

★★ **THE COMEBACKER REACHES THE FRONT ABOUT AS OFTEN ON `quiet` AS ON `wild` — four races in five —
and holds the same eighth of all lead-time at every stage.** ★ **The 877-versus-0 was true of THAT
RACE, not of the stages**, and this report withdraws any reading of it as a general rule. **One race
is not a distribution, which is the lesson this topic has now produced twice.**

---

## 7 · THE ONE COMMENT CORRECTED, AND THE FINGERPRINT

★ `client/src/modules/racePlanner.js:383` described the gap-reroll as **SIM-ONLY** and said *"The
BROWSER never sets these"*, while `defaults.js:1115-1116` ship `gapRerollEnabled: true` and
`gapRerollThresholdLengths: 0.5`. ★ **The comment now says the feature is SHIPPED and runs in the
browser**, cites those defaults, records that GAP-CEILING-BASELINE-1 measured it firing in his own
race, and notes that the `frontLeash*` comment two lines above is a **different case and still
accurate** — those keys appear nowhere in `defaults.js`. **Nothing else changed.**

★★ **WORLD FINGERPRINT RE-MEASURED AFTER THE EDIT: `b35cf477c09a1116` — UNMOVED**, the branch value.
A comment cannot move a race, and this is the proof rather than the assertion. The other three stand
from HARNESS-WORLD-1 (`19ccb497041a0dae`, `3df640a42e934312`, `6a84085e79535dd6`); no engine behaviour
was touched.

**`git stash` was not used. `--no-verify` was not used. Nothing was minted. No lever is proposed.**
