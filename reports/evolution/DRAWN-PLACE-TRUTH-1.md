# DRAWN-PLACE-TRUTH-1 — the 0-of-82 holds; "first place IS his drawn place" was wrong

**Report only. Nothing was built, nothing changed.** Build `72ff4e7f`.

★★ **THE CONTRADICTION RESOLVES AGAINST THE PLANNER'S SECOND CLAIM.** A cast comebacker is **never**
drawn first — 0 of 717 on the current tree — so "first place IS his drawn place, so nothing pulls him
back" is **false**. The reason a leading comebacker is not pulled back is a different mechanism
entirely, it has an address, and it is measured in §3.

---

## 1 · HIS RACE, REPRODUCED

Quick Test roster (`current`), City Circuit, seed 3, 40 racers, build `72ff4e7f`.

    comebacker: Breeze (index 38) | DRAWN PLACE 2 | finishRank 3
    winner Flare   second Raven   third Breeze

★ **THE COMEBACKER IS `Breeze`, AS HE SAID — AND HIS DRAWN PLACE IS 2, NOT 1.**

His rank and the servo's commanded multiplier, from his hand-back to the line:

| progress | rank | drawn | rank error | COMMANDED | realised | gap to the leader, widths | released? |
|---|---|---|---|---|---|---|---|
| 0.7136 | 13 | 2 | +11 | 1.1000 | 1.1000 | 0.040 | no |
| 0.7539 | 3 | 2 | +1 | 1.0325 | 1.0347 | 0.029 | no |
| 0.7739 | **2** | 2 | **0** | 0.9994 | 1.0286 | 0.050 | no |
| 0.8745 | 2 | 2 | 0 | 1.0005 | 1.0015 | 0.059 | no |
| 0.9502 | 2 | 2 | 0 | 1.0003 | 1.0000 | 0.068 | no |
| 0.9704 | 2 | 2 | 0 | 1.0002 | 1.0001 | 0.098 | ★ **YES** |
| 0.9867 | 2 | 2 | 0 | 0.9992 | 1.0001 | 0.237 | ★ YES |
| 0.9947 | 2 | 2 | 0 | 0.9996 | 1.0001 | **0.575** | ★ YES |

★ **IN THIS RACE HE IS NOT ABOVE HIS DRAWN PLACE AT ALL FOR THE ENDGAME** — he sits at rank 2, his
drawn place, with a rank error of exactly 0 from progress 0.774 onward. **There is nothing for a brake
to do**, and the servo correctly commands ~1.0000.

★★ **AND THE GROWING GAP IS HIM FALLING BEHIND, NOT PULLING AWAY.** The widths column is his distance
to the racer AHEAD. It grows 0.068 → 0.575 over the last 5% because **the leader `Flare` is pulling
away from him.** That is LEADER-GAP-1's seed-3 finding again — the same race, where the leader ran
nearly unrestrained. **If a racer is drawing away on his screen in this race, it is Flare, not Breeze.**

★ He did reach rank 1, but only for **6 frames**, and §3 says what happened in them.

---

## 2 · ★ THE DRAWN-PLACE DISTRIBUTION, RE-MEASURED ON THE CURRENT TREE

**Method.** `exp-arrival-shape.mjs`, ten tracks at their own default racer, N ∈ {20,40,60,100}, 30
races per cell — **1 200 races, 717 cast comebackers**, build `72ff4e7f`.

| N | n | drawn 1st | 2nd | 3rd | 4th | 5th | >5th | median |
|---|---|---|---|---|---|---|---|---|
| 20 | 189 | **0** | 40 | 43 | 48 | 58 | 0 | 4 |
| 40 | 207 | **0** | 62 | 40 | 49 | 56 | 0 | 4 |
| 60 | 166 | **0** | 47 | 45 | 34 | 40 | 0 | 3 |
| 100 | 155 | **0** | 50 | 33 | 29 | 43 | 0 | 3 |

★★ **0 OF 717 ARE DRAWN FIRST.** The 0-of-82 figure **holds**, now on nearly nine times the sample.
`heroCurveGenerator.js` excludes the winner from the staged-comebacker pool (`p.index !== winnerIdx`),
and that exclusion is intact.

★ **ONE QUOTED FIGURE HAS MOVED AND IS CORRECTED HERE.** COMEBACK-SAME-RACER-1 reported a median drawn
place of **2nd at N=40**. On the current tree it is **4th** at N=40 (62 of 207 drawn 2nd, but 105 drawn
4th or 5th). The distribution changed with the staging work and the old median has been quoted since
without rechecking.

---

## 3 · ★★ WHICH OF THE THREE IS TRUE: **BOTH 1 AND 2, IN DIFFERENT WINDOWS**

**Method.** The same frame-by-frame trace over **100 races** — ten tracks × ten seeds, N=40, build
`72ff4e7f`. Only frames where his live rank is BETTER than his drawn place count, because those are
the only frames a brake is owed.

| races (n=100) | |
|---|---|
| drawn first | **0** |
| ever reached rank 1 | 65 |
| ever above his drawn place | 68 |

| frames spent ABOVE his drawn place | total frames | ★ median COMMANDED multiplier |
|---|---|---|
| while **NOT** released — the brake can act | **27 497** (84.4%) | ★ **0.9498** |
| while **RELEASED** — past `choreoReleaseProgress` | **5 095** (15.6%) | ★ **1.0001** |

★★ **CANDIDATE 1 IS TRUE FOR 84% OF THOSE FRAMES: THE BRAKE IS ACTING, AND HARD** — a commanded
0.9498 is a **−5% brake**, the full depth this project has always measured on a leading comebacker.

★★ **CANDIDATE 2 IS TRUE FOR THE OTHER 16%, AND IT IS THE ENDGAME.** Past `choreoReleaseProgress`
(**0.97**, `defaults.js`), `racePlanner.js` computes

    const released = isHero && phaseProgress >= plan._choreoReleaseProgress
                     && (plan._racerTargetRank.get(r.index) ?? nActive) <= BAND_EDGES[0];
    const targetRank = released ? currentRank : ...;

so a top-5 hero is **targeted at his CURRENT rank**. The rank error becomes exactly zero and the brake
becomes exactly nothing — measured at a commanded **1.0001** across 5 095 frames. **In his own race all
6 of the frames he spent above his drawn place were in this window.**

★ **CANDIDATE 3 IS FALSE:** 0 of 717 drawn first (§2).

> ★★ **THE ANSWER IN ONE LINE.** He is drawn 2nd–5th and the brake pulls him back at −5% for the whole
> race — **until progress 0.97, where the front-contest release zeroes his error and the brake stops
> existing for the final 3%.** That final 3% is the endgame the owner watches.

---

## 4 · WHAT THIS DOES NOT ESTABLISH

- **Whether −5% is "too weak"** to close a gap the field cannot close either. That is a different
  measurement and it was not made here.
- **Whether the 0.97 release should move.** Not this report's question; nothing is recommended.
- **What the owner actually saw.** In seed 3 the racer drawing away is the LEADER, not the comebacker,
  and the comebacker sits at his drawn place throughout. If his screen showed a comebacker in first
  and pulling away, it was either a different race or the 6-frame window above — **this report cannot
  distinguish those and does not claim to.**
