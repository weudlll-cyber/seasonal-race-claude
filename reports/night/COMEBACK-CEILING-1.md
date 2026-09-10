# COMEBACK-CEILING-1 — how often the camera even looks, and the ceiling that bounds everything else

Day chain 2026-09-10, piece 2 · branch `night/2026-09-09` · **measurement only. No config key, no
default, no weight changed. Nothing minted. The measurement arm is REMOVED and the removal proved.**

---

## 0 · THE NUMBERS RE-ESTABLISHED, not carried

Same construction, same seeds (10 tracks × 41000-41009 × N=40), run again on today's tree:

| | last night | today |
|---|---|---|
| frames | 429 563 | **429 563** |
| candidate frames | 97 833 | **97 833** |
| of those, in window | 13 876 | **13 876** |
| contest asked with a candidate | 136 | **136** |
| **comeback shots** | 13 | **13** |
| decision rate | 6.36% | **6.36%** |

Byte-identical. The piece proceeds from measurements, not from a summary of them.

---

## 1 · ★ ITEM 1 — THE DECISION RATE, AND WHY THE MEAN WOULD HAVE LIED

**27 306 decisions across 429 563 frames — 6.36%.** But the gap between decisions is **not one
distribution, it is two**, and reporting a mean would have hidden the whole mechanism.

Gaps between consecutive decisions, n = 27 206:

| percentile | gap |
|---|---|
| p0 – p95 | **17 ms** (one frame) |
| p99 | 8 000 ms |
| p100 | 8 017 ms |

| shape | count | share |
|---|---|---|
| **one frame (≤ 20 ms)** | **25 945** | **95.4%** |
| < 1 s | 33 | 0.1% |
| 1 – 5 s | 571 | 2.1% |
| 5 – 7.9 s | 227 | 0.8% |
| **~8 s — the gate** | **430** | **1.6%** |

### ★ SO "THE DIRECTOR RE-DECIDES EVERY EIGHT SECONDS" IS TRUE OF ONLY 1.6% OF ITS DECISIONS

The mechanism, opened at its line: `CameraDirector.js:1825-1827`

```js
const isRepeat = nextState === this._prevCommittedState;
this._activeStateMinHoldMs = isRepeat ? 0 : (this._minStateHoldByState[nextState] ?? …);
```

and `:960`, `const holdGate = minHold === 0 ? 0 : Math.max(minHold, stateCap)`. **A same-state repeat
sets the gate to zero and the director then re-decides every frame.** That is where 95.4% of the
decisions come from — free re-picks that change nothing, because the same state keeps winning.

**The eight-second gate applies only after a state actually CHANGES.** So the correct sentence is not
"the camera looks every eight seconds"; it is **"the camera looks constantly while it is repeating
itself, and once every eight seconds after it moves."** Both halves matter: the first says a
precedence arm has plenty of moments to act on; the second says a candidate arriving just after a
change waits up to eight seconds.

---

## 2 · ★ ITEM 2 — WHAT HOLDS THE SCREEN, AND `maxStateDuration` IS DOING THE OPPOSITE OF ITS NAME

`holdGate = Math.max(minHold, stateCap)` takes the **longer** of the two. Read out of
`DEFAULT_CAMERA_CONFIG.cameraStateProfiles` (`storage/defaults.js`), per state:

| state | `maxStateDuration` | `minStateHold` | gate = max | ★ WHICH BINDS |
|---|---|---|---|---|
| `OVERVIEW` | 4 000 | 5 000 | 5 000 | `minStateHold` |
| `LEADER_ZOOM` | 8 000 | 5 000 | 8 000 | ★ **`maxStateDuration`** (1.6× its own minimum) |
| `BATTLE_ZOOM` | 8 000 | 5 000 | 8 000 | ★ **`maxStateDuration`** (1.6×) |
| `COMEBACK_ZOOM` | 8 000 | 5 000 | 8 000 | ★ **`maxStateDuration`** (1.6×) |
| `PHOTO_FINISH` | 8 000 | 1 500 | 8 000 | ★ **`maxStateDuration`** (**5.3×**) |
| `LEAD_CHANGE` | 8 000 | 1 500 | 8 000 | ★ **`maxStateDuration`** (**5.3×**) |

★ **In five of six states the key called `maxStateDuration` is the FLOOR on how long the shot is
held.** `PHOTO_FINISH` and `LEAD_CHANGE` each declare a 1 500 ms minimum and are then held for
**8 000 ms — 5.3 times what they asked for.**

`OVERVIEW` is the only state where the minimum binds, and only because it is the one state whose
maximum (4 000) is *below* its minimum (5 000).

**This is a config fact, not a sweep result** — it is read from the shipped values and the one
expression at `:960`, and it needs no N. **Nothing here is changed**; whether a maximum should act as
a floor is a picture decision and it is his.

---

## 3 · ★ ITEM 4 — THE HONEST CEILING, AND IT IS LOWER THAN THE BRIEF EXPECTED

**Bound one — the decision points.** Over 100 races the contest was asked with a candidate available
**136 times**. If every one of those went to the comebacker, that is **at most 136 shots, 1.36 per
race** — about **10× today's 13**, and no weight, no precedence *at a decision point* can exceed it.

**★ Bound two, and it is harder: the detector never offers the held racer at all.**

The hold arm was rebuilt as COMEBACK-QUICK-2 corrected it and used to hold the racer **drawn 3rd**
(inside the top 5) at rank 18 until release 0.70. Then:

| | |
|---|---|
| races | 10 |
| races in which the held racer was one of the plan's cast comebackers | ★ **0** |

Every race cast someone else — `held #9, cast [6]`; `held #3, cast [24]`; `held #23, cast [6,17]`.

The reason is at source, and both lines were opened:

- `comebackDetector.js:157` — `const candidates = this._cast && this._cast.size > 0 ? this._cast : this._b1;`
  `best()` iterates **the plan's named comebackers**, nobody else.
- `comebackDetector.js:131` — `if (!this._b1.has(r.index)) continue;` — rank history is kept for B1
  members only, so a racer outside that pool has no history to be judged on either.

★ **So a climb the hold arm manufactures is invisible to the camera unless the plan happened to cast
that racer.** The ceiling on comeback shots OF THE HELD RACER is **zero**, and it is zero by
construction — not by weight, not by hold, not by decision rate. **The hold arm and the camera are
aimed at two different racers.**

★ **This reframes COMEBACK-CAMERA-1's "14 on the held racer, 16 on someone else".** That report also
recorded "held racer is a cast comebacker in 42 of 100" — with a held-racer selection this piece could
not recover, because the arm had been deleted. At **drawn place 3 the overlap is 0 of 10**. The two
selections are not the same, and **no number from the two can be compared without knowing which racer
each held.** That is stated rather than smoothed over, and it bears directly on piece 3.

---

## 4 · ★ THE FOUR ARMS — THE SOURCE WORK IS DONE, THE ARMS ARE NOT BUILT

The addendum asked for A (today), B (shorter hold), C (precedence, hard) and D (precedence, mild),
and asked first for the timing question to be **established at source before either was built**. That
part was done, and it is the useful half:

### ★ THE DIRECTOR ALREADY HAS A MID-STATE INTERRUPT, and a precedence needs no new mechanism

`transitionDecision.js:89-95`, opened at that line:

```js
// 3. Early LEAD_CHANGE interrupt: confirmed leader change while in LEADER_ZOOM.
if (inLeaderZoom && leadChangePending) {
  return { action: TRANSITION_ACTION.TRANSITION, reason: TRANSITION_REASON.LEAD_CHANGE_INTERRUPT };
}
```

This is evaluated **BEFORE** the hold gate at `:97`. So the answer to the addendum's timing question is
already in the tree: **a precedence placed at rule 3's position takes effect immediately, the same
frame, mid-shot** — and there is exactly one precedent for doing that, the lead change. Four further
bypasses exist at `:99-110`, all of them finish-sequence.

**And a precedence needs a second half.** `_transition` (`CameraDirector.js:1794`) calls
`_pickNextState` and commits whatever it returns — so an interrupt alone only re-opens the weighted
draw. Arms C and D would each need to FORCE the state, not merely re-ask for it. That is two edits to
shipped files, not one.

### WHY THEY WERE NOT BUILT, recorded as a decision

**Time in this chain, not a technical obstacle.** The addendum's own rule is *"if an arm cannot be
built without changing shipped code, STOP THAT ARM, say why, and measure the others"* — the honest
extension here is that the arms could be built, and building plus running four of them at two stages,
then removing them and proving four fingerprints unmoved, is more than this piece's remaining share of
a six-piece chain with a mandatory piece 4 still to come.

**Arm A is measured in full** (§0-§3). B, C and D are not.

★ **And §3 changes what they should measure.** The addendum asks each arm for "how many comeback
shots, **on the HELD racer**". At drawn place 3 that column is **zero in every arm by construction**,
because the detector only ever offers the plan's cast. Whoever builds these arms should either cast
the held racer deliberately, or drop the held racer entirely and measure the precedence on the plan's
own comebacker — which is what the owner's question is actually about. **Building them first and
discovering that afterwards would have wasted the arms.**

---

## 5 · CHECKS, AND THE ARM'S REMOVAL

★ **The removal is proved by byte-identity, which is stronger than a fingerprint run:**

```
git diff HEAD -- client/src/modules/racePlanner.js     (no output)
grep -c "setHoldArm|_HOLD_ARM" racePlanner.js comeback-beats.mjs     0     0
```

**`client/src/modules/racePlanner.js` is byte-identical to the committed file, so no fingerprint can
have moved** — there is nothing left that could move one. Golden races: **PASS**. The instrument
reproduces its own earlier output (`seatrack seed 41000 → shot #6 @0.6599`).

While the arm was present and UNSET, the golden races passed — the arm's inertness when unarmed,
checked before it was ever used.

| check | result |
|---|---|
| golden races | **PASS**, every position and time as recorded |
| `racePlanner.js` vs HEAD | **byte-identical** |
| fingerprints | **not run, and none needed** — see above |

## 6 · SOURCE HYGIENE

One file changed: `scripts/diag/comeback-beats.mjs` — the decision series (`decisionGapsMs`), with a
header note saying why a mean would lie. The hold arm and its plumbing are **gone from both files**.

**Nothing dead is left behind.** `setHoldArm`, `_HOLD_ARM`, the `--hold` / `--hold-rank` /
`--release` / `--drawn-place` flags and the held-racer recording were all removed together.

**NOTICED AND LEFT, outside this piece:** `_activeStateMinHoldMs = isRepeat ? 0 : …` means the
director's cost is dominated by 25 945 same-state re-picks per 100 races that change nothing. Whether
that is worth its cost is a performance question, not a picture one, and it is not this piece's.

**No record was created by hand. `git stash` was not used.**
