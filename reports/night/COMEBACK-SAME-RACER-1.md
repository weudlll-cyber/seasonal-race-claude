# COMEBACK-SAME-RACER-1 — the held racer and the plan's comebacker become the same racer

2026-09-10 · branch `night/2026-09-09` · **measurement only. No config key, no default, no weight, no
gate. Every arm is temporary, removed at the end and proved inert. Nothing minted. Nothing
recommended.**

---

## 1 · ★ THE OVERLAP — WHAT THIS PIECE EXISTS TO FIX

**96 of 96.** Every race that cast a comebacker held one.

| | N = 100 races |
|---|---|
| races that cast a comebacker | **96** |
| races casting none | 4 |
| ★ **held racer IS a cast comebacker** | ★ **96 of 96** |

Against the selection it replaces — drawn place 3 — which coincided in **0 of 10**.

### It was measured, not assumed, and here is why that mattered

The mechanism was re-verified at source before anything was built:

- `comebackDetector.js:157` — `const candidates = this._cast && this._cast.size > 0 ? this._cast : this._b1;`
  The detector offers **only the plan's cast**.
- `racePlanner.js:805-807` — the pre-OUTCOME pin the arm must engage above, exactly as
  COMEBACK-QUICK-2 corrected it.
- ★ `racePlanner.js:684` — the hero generator runs **one frame after the choreo boundary**, on the
  live `postChaos` ranks and **rank-velocities**.

That last line is why the overlap is a measurement. **The cast is not known at the start line**, so the
arm cannot simply be set on a cast member — and because the arm steers *before* the boundary, it can
change the very input the casting reads. So each race runs **twice**: a DISCOVERY pass with no arm,
stopped the moment the plan is delivered, and a MEASURED pass with the arm set on one of the racers
that pass named. `heldStillCast` then asks, per race, whether the held racer is still cast **in the
run that counts**.

★ **He is, in 96 of 96.** The arm does not perturb the casting.

---

## 2 · ★ THE COLLISION — AND IT IS THE MOST USEFUL TABLE HERE

The brief asked what to do if a cast comebacker's drawn place is not in the top 5. **It almost never
is**, and the two requirements are structurally opposed rather than occasionally in tension.

**Cast comebackers by drawn place, n = 179 across 100 races:**

| drawn place | count | share |
|---|---|---|
| **1 – 5** | **2** | **1.1%** |
| 6 – 10 | 10 | 5.6% |
| 11 – 20 | 27 | 15.1% |
| 21 – 30 | **74** | **41.3%** |
| 31 – 40 | **66** | **36.9%** |

median **27** · p25 **22** · p75 **33** · min 2 · max 40

★ **The plan casts comebackers from racers who START DEEP — that is what makes a comeback a
comeback.** The owner's rule ("the held racer's drawn place is inside the top 5") and the plan's own
casting select from nearly disjoint populations. **Neither is overruled here.** The arm picks, among
the racers the plan cast, the one drawn **furthest forward** — which gives the owner's rule its best
available chance and still lands at a median drawn place well outside the top 5.

### ★ AND THIS ACCOUNTS FOR THE 42-of-100 NOBODY HAD EXPLAINED

The brief flagged that an earlier report recorded the held racer as a cast comebacker in **42 of 100**
under a different selection, against **0 of 10** at drawn place 3. With only **1.1%** of cast
comebackers drawn inside the top 5, a hold arm selecting by drawn place 3 should coincide **almost
never** — which is what 0 of 10 is. **The 42 of 100 cannot have come from a top-5 drawn-place
selection**; it must have come from one that picked deep, where the cast actually lives. The two
figures were never measuring the same arm, and no number from them is comparable across that
difference.

---

## 3 · STEP 2 — NOW THAT IT IS THE SAME RACER

N = 96 races (the 4 that cast nobody are excluded and counted).

| | |
|---|---|
| ★ **reached the top 5 after release** | ★ **95 of 96** — best rank **median 1**, min 1, max 7 |
| **comeback shots ON HIM** | **35**, in **35 of 96** races |
| all comeback shots in those races | 43 — so **35 of 43 (81%)** are on the held racer |
| when, in race progress | min 0.627 · **median 0.727** · max 0.880 |
| what he displaced | LEADER_ZOOM 17 · BATTLE_ZOOM 13 · OVERVIEW 3 · LEAD_CHANGE 2 |

★ **The 90.3% top-5 figure was NOT assumed from the other selection, and it holds: 95 of 96.** The
hold-and-release produces a real climb, and it now produces it in a racer the camera is allowed to
look at.

★ **81% of comeback shots are now on the held racer**, against COMEBACK-CAMERA-1's 14 of 30 (47%) —
but those two are **not comparable**, for exactly the reason in §2: that report held a different
racer, and this one holds a cast one.

**Shots cluster just after the release** (median 0.727 against a release of 0.70), which is what a
hold that ends at 0.70 should produce.

### The four races that cast nobody

`garden-path/41005`, `ice-track/41006`, `luger-hill/41003`, `luger-hill/41005` — each cast 2 to 5
heroes, none of them a comebacker. **COMEBACK-DEF-1 measured 0 of 200 races with no comebacker; this
is 4 of 100.** Named rather than smoothed: `comebackDetector.js:23` gives the reason in its own words
— it happens "whenever the assigned winner starts up front" — so a 4% rate is a plausible tail rather
than a contradiction, but **the two counts are not the same measurement** and the difference is not
explained here.

---

## 4 · STEP 3 — HIS PRECEDENCE QUESTION, FOUR ARMS

★ **The director already had the mechanism, confirmed at source.** `transitionDecision.js:89-95` is an
interrupt evaluated **before** the hold gate at `:97` — one precedent, the lead change. So the
precedence sits in that slot and needs nothing new.

★ **But an interrupt alone is not a precedence.** `CameraDirector.js:1794` — `_transition` calls
`_pickNextState` and commits whatever it returns, so interrupting merely **re-opens the weighted
draw**, which the comebacker wins about a quarter of the time. Arms C and D therefore **force** the
state. That is two temporary edits, both removed.

**Arm B needs no product change at all** — `maxStateDuration` is a config value, and the harness
overrides it on a **copy** for one run, the same mechanism `--comeback-weight` already uses.

### STAGE 1 — 30 races per arm, identical seeds. The differences were readable, so stage 2 ran.

| arm | shots on him | races with a shot | ★ precedence firings/race | ★ switches/min | what it displaced |
|---|---|---|---|---|---|
| **A — today** | 7 | 7 / 30 | — | **11.4** | BATTLE 3, LEADER 3, LEAD_CHANGE 1 |
| **B — shorter hold** | 25 | 24 / 30 | — | ★ **14.0** | LEADER 18, BATTLE 7 |
| **C — precedence, HARD** | ★ **39** | 28 / 30 | **1.63** | **12.0** | LEADER 14, BATTLE 13, ★ **LEAD_CHANGE 9**, OVERVIEW 3 |
| **D — precedence, MILD** | 26 | 26 / 30 | **1.13** | **11.8** | BATTLE 12, LEADER 11, OVERVIEW 3, ★ **LEAD_CHANGE 0** |

Overlap 30/30 and top-5 30/30 in every arm — the arms change the camera, not the race.

### STAGE 2 — 100 races per arm, the same seeds. Every difference held.

| arm | shots on him | races with a shot | ★ firings/race | ★ switches/min | what it displaced |
|---|---|---|---|---|---|
| **A — today** | 35 | 35 / 96 | — | **11.3** | LEADER 17, BATTLE 13, OVERVIEW 3, LEAD_CHANGE 2 |
| **B — shorter hold** | 73 | 71 / 96 | — | ★ **14.6** | LEADER 48, BATTLE 22, LEAD_CHANGE 3 |
| **C — precedence, HARD** | ★ **136** | 90 / 96 | **1.70** | **11.9** | LEADER 54, BATTLE 49, ★ **LEAD_CHANGE 30**, OVERVIEW 3 |
| **D — precedence, MILD** | 84 | 84 / 96 | **1.15** | **11.7** | LEADER 42, BATTLE 39, OVERVIEW 3, ★ **LEAD_CHANGE 0** |

Overlap 96/96 and top-5 95/96 in **every** arm — the arms change the camera, not the race, and that is
checkable rather than asserted: the race-side numbers are identical across all four.

### ★ THREE THINGS IN THAT TABLE ARE THE ANSWER

**1 · The precedence does not make the camera restless.** It fires **1.70 times per race** (C) and
**1.15** (D). The brief's own test was "one or two is nothing, often means the camera has become
restless"; this is one or two. A race carries one to two comebackers, and the arm acts about once on
each.

**2 · ★ THE SHORTER HOLD CUTS THE PICTURE FAR MORE THAN EITHER PRECEDENCE DOES.** Switches per minute:

| today | precedence MILD | precedence HARD | shorter hold |
|---|---|---|---|
| **11.3** | 11.7 (+0.4) | 11.9 (+0.6) | ★ **14.6 (+3.3)** |

**Arm B makes the picture jump five to eight times harder than either precedence arm**, and buys
FEWER shots on the comebacker than the hard precedence (73 against 136). If the worry is a camera that
cuts around — and the brief says a camera that jumps is worse than one that misses a comeback — then
**the precedence is the calmer lever and the hold length is the wild one.** That is the opposite of
what the two changes look like from their descriptions, and it is the single most useful number here.

**3 · ★ THE TRADE THE BRIEF WARNED ABOUT IS REAL, AND IT IS ARM C's ALONE.** Arm C cuts a
**LEAD_CHANGE** short **30 times in 96 races** — roughly once every three races. Arm D, by
construction, **never does: 0**. That single constraint is the whole difference between them, and it
costs D **52 of C's 136 shots**.

★ **So his question splits cleanly in two.** "Switch to the comebacker whatever is running" costs a
lead change every third race. "Switch to him, once, unless a lead change is on screen" costs none and
still more than doubles today's shots (84 against 35). **Whether a comeback shot is worth interrupting
a lead change is a picture judgement, and it is not made here.**

---

## 5 · CHECKS AND THE ARMS' REMOVAL

★ **All three product files carrying an arm are byte-identical to HEAD after removal**, and that is
stronger than a fingerprint run — there is nothing left that could move one. It was checked both ways:
`git diff HEAD` is empty for all three, and a whole-tree grep for `setHoldArm`, `_HOLD_ARM`,
`setComebackPrecedenceArm`, `_PRECEDENCE_ARM` and `comebackPrecedence` returns **0 in every file,
including the harness**.

The fingerprints were run anyway, because "byte-identical" is an argument and the piece asked for a
measurement:

| role | record | measured | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | **matches** |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | **matches** |
| camera | `75aef5cd474c54e5` | `75aef5cd474c54e5` | **matches** |
| render | `40b2de6fcc5bafd8` | `40b2de6fcc5bafd8` | **matches** |

| check | result |
|---|---|
| golden races | **PASS** — 2 races, every finishing position and time as recorded |
| the harness after removal | runs, and reproduces its own earlier output (`seatrack 41000 → #6 @0.6599`) |
| `npm run verify` plain | **PASS** (see the commit) |

```
node scripts/engine-reach.mjs --check scripts/diag/comeback-beats.mjs reports/night/COMEBACK-SAME-RACER-1.md

ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): scripts/diag/comeback-beats.mjs, reports/night/COMEBACK-SAME-RACER-1.md
```

★ **While the arms were PRESENT BUT OFF, the golden races passed** — each arm's inertness when unarmed
was checked before it was ever used, not only after it was removed.

## 6 · SOURCE HYGIENE

Temporary, all removed at the end of the piece and proved inert:

| file | arm |
|---|---|
| `client/src/modules/racePlanner.js` | the hold arm (`setHoldArm`, `_HOLD_ARM`) |
| `client/src/modules/camera/transitionDecision.js` | the precedence interrupt slot |
| `client/src/modules/camera/CameraDirector.js` | `setComebackPrecedenceArm`, the arming and the forcing |

`scripts/diag/comeback-beats.mjs` keeps the two-pass discovery, the arm flags and the switch counting.

**No record was created by hand. `git stash` was not used. `--no-verify` was not used.**
