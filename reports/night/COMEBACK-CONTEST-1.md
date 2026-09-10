# COMEBACK-CONTEST-1 — he does not lose the contest. He is almost never in it.

Night chain 2026-09-09, piece 4 · branch `night/2026-09-09` · **MEASUREMENT ONLY. No weight changed,
no default touched, no product file changed at all, nothing minted, nothing recommended.**

**Instrument: `scripts/diag/comeback-beats.mjs`, reused** — it already delivers the authored plan
through the browser's own `setCameraPlan` channel and already calls `best()` as a pure read. What is
new is a **contest recorder** that wraps three of the director's own methods **on the instance**.

---

## ★ THE HEADLINE — THE BRIEF'S PREMISE IS INVERTED BY THE MEASUREMENT

The brief states: *"the candidate loses the director's weighted contest almost every time."*

**He does not.** Over 100 races, of 13,876 frames on which a comeback candidate was available inside
the window, the weighted contest was **run at all on 136 of them — 0.98%**. On 99% of his available
frames **the question is never asked.** And of the 136 times he was in the room, he was chosen 13
times — **10%, not "almost never".**

| of 13,876 candidate-in-window frames | frames | share | address |
|---|---|---|---|
| **NOT ASKED** — an earlier shot is still inside its hold gate | **6 684** | **48.2%** | `CameraDirector.js:960` |
| **SHOWN** — the comeback shot is already on screen | 3 592 | 25.9% | — |
| **NOT ASKED** — `update()` returned before the decision | 3 477 | 25.1% | `CameraDirector.js:916-975` |
| NOT IN THE POOL — outcome gate / comeback cooldown / detector | 96 | 0.7% | `CameraDirector.js:1713-1731` |
| ★ **LOST THE WEIGHTED DRAW** | **18** | **0.1%** | `CameraDirector.js:730` |
| ★ **WON THE DRAW, THEN DECLINED** by the second roll | **9** | **0.1%** | `CameraDirector.js:724` |

★ **The weighted contest — the thing the brief points at — accounts for 27 frames out of 13,876.
0.19%.** Every other loss happens before the pool is ever built.

---

## 1 · WHY: THE MECHANISM, WITH ITS ADDRESS

The contest at `CameraDirector.js:1743` is only reached if the director asks the question, and it
asks far less often than a reader would assume.

### 1a · The hold gate is `max(minStateHold, maxStateDuration)` — the LONGER of the two

**`CameraDirector.js:960`**, opened at that line before this was written:

```js
const holdGate = minHold === 0 ? 0 : Math.max(minHold, stateCap);
```

`stateCap` is `_maxStateDurationByState[state] ?? _maxStateDuration` — the state's **maximum**
duration. `decideTransition` then re-decides only when `stateAge >= holdGate`
(`transitionDecision.js:97`). With the shipped values (`minStateHold` 5 000 ms, `maxStateDuration`
8 000 ms for most states — `defaults.js:126-209`) the gate is **8 000 ms**.

★ **So a state is held for at least its own MAXIMUM duration, and the director re-decides roughly
every eight seconds.** Measured across the 100 races: **429 563 frames, 27 306 decisions — the
contest runs on 6.36% of frames.** A candidate available for thousands of frames is offered a handful
of times, and that is the whole shape COMEBACK-CAMERA-1 saw from the outside.

### 1b · And the two windows barely intersect

The contest runs on 6.36% of frames overall, but on only **0.98%** of the candidate-in-window frames
— **six times rarer than chance**. The two are anti-correlated by construction: while a comeback shot
is on screen (25.9% of those frames) no decision happens at all, and the 8-second gate holds whatever
came before it through the rest.

### 1c · The weight acts TWICE, and both are late

Re-established at source: `_weightedRandomPick` (`:730`) draws proportionally, and the winner then
faces `_acceptsOffer` (`:724`), which rolls **again** against the same weight and falls through to
`LEADER_ZOOM` on a decline. At the shipped `comebackWeight` 0.6 against battle 0.8 / lead-change 0.7 /
overview 0.3, a comeback in a full pool wins 0.6/2.4 = 25% of the draw and then passes 60% of the
second roll — about **15%**. But this only ever applies to the 0.19% of frames that reach it.

---

## 2 · WHAT WINS INSTEAD

On the 18 frames where the pool was built, the comeback was in it, and something else won:

| winner | frames | share |
|---|---|---|
| `BATTLE_ZOOM` | 9 | 50.0% |
| `LEAD_CHANGE` | 5 | 27.8% |
| `OVERVIEW` | 4 | 22.2% |

★ **This table is 18 frames and is reported with that N in front of it.** It is not evidence about
who "usually" beats him, because there is no "usually" — the contest is not where he loses.

**How big the pool was**, on the 123 frames where it was built at all:

| candidates in the pool | frames | share |
|---|---|---|
| **0** | 92 | **74.8%** |
| 1 | 7 | 5.7% |
| 2 | 22 | 17.9% |
| 3 | 2 | 1.6% |

Three quarters of the time the pool was **empty** — nothing was eligible, and the frame fell through
to the leader default.

---

## 3 · HOW MUCH OF IT IS EVEN A FAIR FIGHT

Of the 13,876 candidate-in-window frames:

- **136 (0.98%)** are a fair fight — the director asked, and he could have won.
- **3 592 (25.9%)** he had already won; the shot was on screen.
- **10 161 (73.2%)** he could not have won under any weight, because the question was never asked.
- **96 (0.7%)** he was not eligible to be in the pool.

★ **He cannot have won 73% of the frames the earlier reports counted as "available".**

---

## 4 · WHAT IT WOULD TAKE — two arms, measured, and no recommendation

`--comeback-weight` overrides the value on a **copy** of the config for one run; `defaults.js` is
never written and nothing persists. The instrument's own header states this and it was re-read.

| arm | candidate frames | in window | contest asked with a candidate | **SHOTS** | frames he was on screen |
|---|---|---|---|---|---|
| shipped, `comebackWeight` **0.6** | 97 833 | 13 876 | **136** | **13** | 25.9% |
| **1.0** (the ceiling — the second roll always accepts) | 97 833 | 13 876 | **34** | **19** | 34.9% |

**Candidate frames and in-window frames are byte-identical between the arms**, which is the
instrument's own parity check: camera configuration cannot reach the physics, so the two arms drive
the same races.

★ **Raising the weight to its ceiling — a 67% increase, and the largest move possible — buys 13 → 19
shots.** It cannot do more, because it acts only on the 0.19% of frames that reach the draw.

★ **AND IT IS SELF-LIMITING, which is worth seeing:** "contest asked with a candidate" FALLS from 136
to 34. More shots taken means more time inside `COMEBACK_ZOOM`'s own hold gate, which means fewer
decisions, which means fewer chances. The lever fights itself.

**COMEBACK-WEIGHT-1's finding — a thirteen-fold weight still left 55 of 74 unshown — is not
contradicted here; it is EXPLAINED.** A lever that only acts on 0.19% of the frames cannot clear a
backlog that lives in the other 99.8%.

★ **NOTHING IS RECOMMENDED AND NO NUMBER IS CHANGED.** The measurement says where the ceiling is; it
does not say the ceiling should move, and `holdGate` is a picture decision.

---

## 5 · ★ WHAT WAS NOT DONE, AND WHY — the held arm

**The brief asked for races "of the same construction piece 4 of the last chain used", at release
0.70, reusing the hold arm as COMEBACK-QUICK-2 corrected it. That arm is NOT in the tree and was not
rebuilt.** Established rather than assumed: `grep -rn "_holdArm\|holdArm" client/src scripts` returns
**nothing**, and `scripts/` contains no `comeback-quick*`. COMEBACK-DEF-1 §"The measurement arm was
TEMPORARY and is GONE" says so in as many words — ~20 lines in `racePlanner.js`, removed after the
sweep.

Rebuilding it from the reports' prose was judged the wrong call, and the reason is the chain's own
rule about not passing a sentence on as fact: the reports give the corrected `holdActive` guard
verbatim but **not** the `targetRank` override, the held racer's selection, or the release semantics.
A reconstruction that differed subtly would produce numbers that look comparable to
COMEBACK-CAMERA-1's **27 543 / 30** and are not — and the piece's whole point is to stop carrying
numbers that were never re-established.

**So the two numbers were NOT re-established, and no substitute is passed off as them.** What is
measured instead is the SHIPPED construction, same 10 tracks × 10 seeds × N=40, same seeds
41000-41009: **97 833 candidate frames, 13 876 in window, 13 shots.** Roughly half the held arm's
candidate frames and half its shots, which is the direction the hold arm's absence predicts — it
manufactures a deep racer who climbs.

★ **The anatomy in §1-§4 does not depend on that.** The hold gate, the asking rate and the two weight
rolls are properties of the director, not of the race it is given: a held racer arrives into the same
8-second gate.

**Recorded as a decision, not an omission.** If the owner wants the held numbers re-established, the
arm has to be rebuilt deliberately and checked against COMEBACK-QUICK-2's own traces before any
number from it is compared with COMEBACK-CAMERA-1's.

---

## 6 · THE INSTRUMENT, AND THE PROOF IT CHANGES NOTHING

★ **NO PRODUCT FILE WAS TOUCHED — not `CameraDirector.js`, not `racePlanner.js`, nothing under
`client/src/`.** `git status` shows exactly one modified file, the diagnostic itself.

Three of the director's methods are wrapped **on the one instance**, the same idiom the harness's
existing outcome-arm wrapper uses. Each records its arguments and result and then **delegates** —
same calls, same order, same random draws, same return values:

| wrapped | address | what it answers |
|---|---|---|
| `_pickNextState` | `:1548` | was the question asked at all this frame |
| `_weightedRandomPick` | `:730` | who was in the pool, and who won the draw |
| `_acceptsOffer` | `:724` | did the winner survive the second roll |

The hold gate is **reconstructed from the director's own fields** (`stateEnteredAt`,
`_minStateHoldByState`, `_maxStateDurationByState`) rather than patched in.

★ **PROVED INERT, NOT ASSERTED.** `--contest=0` skips the wrapping entirely. Ten races run both ways:
**10 of 10 byte-identical** on every camera-dependent field — `candidateFrames`,
`candidateOutcomeFrames`, the per-state frame counts, every shot, the overlap states and `raceMs`.

```
node scripts/engine-reach.mjs --check scripts/diag/comeback-beats.mjs

ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): scripts/diag/comeback-beats.mjs
```

Golden races: **PASS**, 2 races, every finishing position and time as recorded. **No fingerprint was
run and none was needed** — no file this piece touches is in the hull, and the tripwire says so.

---

## 7 · METHOD AND N

| | |
|---|---|
| construction | 10 tracks × 10 seeds (41000-41009) × N=40, track-default racer — the same as COMEBACK-CAMERA-1 |
| races | **100 per arm, 2 arms, 200 total** |
| frames | 429 563 per arm |
| outcome window | the browser arm — the race plan's own OUTCOME phase, or `leaderProgress > 0.75`, whichever comes first |
| release / hold arm | **none** — see §5 |
| what is a "candidate" | `dir._comeback.best(racers, ts, raceProgress)` returning a racer — a pure read, called once per frame with the same progress the director passes |

**Every percentage in this report is over one of two denominators, and each table names its own:**
13 876 candidate-in-window frames, or the 123 frames on which the pool was built.

---

## 8 · SOURCE HYGIENE

One file changed: `scripts/diag/comeback-beats.mjs` — the contest recorder, the `--contest` flag, and
three new row fields (`lossClass`, `beatenBy`, `poolSize`, plus `framesTotal` / `decisionsTotal` /
`decisionsWithCandidate`). It carries its own header note saying what it wraps and why no product file
is touched.

**Nothing dead is left behind.** No temporary arm was applied, so none had to be removed; the
`--contest=0` path is the control and stays.

**NOTICED AND LEFT, outside this piece:** `holdGate = Math.max(minHold, stateCap)` means the state's
**maximum** duration acts as a **floor** on how long it is held. Whether that is intended is a picture
question and the owner's; it is named here with its address and not touched.

**No record was created by hand. `git stash` was not used.**
