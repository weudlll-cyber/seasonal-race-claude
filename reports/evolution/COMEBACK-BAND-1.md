# COMEBACK-BAND-1 — the casting is repaired, and it exposes that the plan cannot deliver a deep racer to the top 5

2026-09-11 · branch `night/2026-09-10` · piece 2 of the night chain · **NOT merged. NOTHING MINTED —
no minting permission was given, and the golden races are deliberately NOT re-recorded.**

★ **THE FAIRNESS GATE'S START-ROW HALF IS RED, AND THE CONTROL SAYS HALF OF IT IS NOT THIS CHANGE'S.**
That is the stop condition the brief named, it is reported in §5 rather than worked around, and it is
his to weigh.

---

## 0 · WHAT WAS WRONG, RE-VERIFIED AT SOURCE

`heroCurveGenerator.js:406`:

```js
let b1Cluster = 2;
const nextCluster = () => Math.min(b1Cluster, BAND_EDGES[0]);   // BAND_EDGES[0] === 5
```

and the two casting sites, `:412` (the assigned winner) and `:447` (the B1 pool), gave the role to
anyone whose post-chaos rank merely **exceeded** that cluster. **So "comebacker" shipped meaning
*behind the front group*, not *came from deep in the field*.**

★ **MEASURED, NOT INFERRED — 180 races on the tree before the change.** The post-chaos ranks today's
cast comebackers actually come from:

| field size | median post-chaos rank of a cast comebacker | cast in |
|---|---|---|
| 10 | **5** | 29/30 races |
| 20 | **5** | 30/30 |
| 30 | **5** | 29/30 |
| 40 | **9** | 30/30 |
| 60 | **9** | 30/30 |
| 100 | **19** | 29/30 |

★ **Rank 5 of 30 and rank 9 of 40.** That is the 6th→3rd shape he watched four times and rejected,
and it is what the plan calls a comeback in essentially every race.

---

## 1 · THE RULE, AND WHICH CELLS OF HOLD-GRID-1 IT WAS READ FROM

```js
export function comebackerMinRank(n) {
  if (!Number.isFinite(n) || n < 20) return null;   // too small to climb — cast nobody
  return Math.ceil((n >= 60 ? 0.4 : 0.5) * n);
}
```

| the rule | the cells it was read from ([HOLD-GRID-1](HOLD-GRID-1.md)) |
|---|---|
| **N < 20 → cast nobody** | the whole N=10 row: **+1 to +4 places** at every fraction, and the third band there is rank 3 — already inside the top 5. Nothing to come back from. |
| **20 ≤ N < 60 → 0.50** | N=20/0.50 **+4**, N=30/0.50 **+7**, N=40/0.50 **+12**, against −11 to +1 at every shallower fraction. 0.50 is the shallowest that buys a real climb. |
| **N ≥ 60 → 0.40** | N=60/0.40 **+9**, N=100/0.40 **+24**, while 0.33 gives only **+3** and **+6**. This is his "approaching the end of the first third", and 0.40 is as far as the numbers carry it. |

★ **NO NEW CONFIG KEY.** Three numbers in the one place the casting decision is made, beside the
cells that justify them. Not a slider.

★ **AND WHAT THE RULE DOES NOT CLAIM.** HOLD-GRID-1 measured a HOLD POSITION at the 0.70 release;
this gates the post-chaos rank a racer is cast FROM, which is earlier and is where his curve starts.
**Different points in the race** — so the grid fixes where to put the threshold and predicts nothing.
What the rule delivers is measured below, on the built thing.

### Where it is applied, and the one place it deliberately is not

| site | what changed |
|---|---|
| `:447` the B1 pool | ★ **the real repair.** Three cases now: inside the front cluster → `sovereign-lead` (unchanged); at or beyond the band → `comebacker`, steered to the front cluster, which is **inside the top 5 — a fixed number, not a fraction, and not P1**; **between the two → NOT CAST AT ALL**, so the loop moves on and a genuinely deep racer can take the slot. **This changes the race.** |
| `:412` the assigned winner | ★ **the LABEL only; his curve is untouched.** A winner who is merely behind the front is no longer announced as a comeback, but he is still steered to rank 1 exactly as before. Re-deciding how the assigned winner is driven is a different feature and is not attempted here. |

★ **THE OTHER ROLES ARE NOT TOUCHED.** `sovereign-lead`, `faller` and `attacker-b2` keep their
casting; a test asserts sovereigns are still cast from the front.

---

## 2 · ★ WHAT IT DELIVERS — AND THE HONEST ANSWER IS "NOT WHAT WAS HOPED"

180 races per arm, 10 tracks × 6 field sizes × 3 seeds, plan on, shipped defaults. **The control is
the same races on the tree before the change.**

| N | cast ≥1 (today) | cast ≥1 (**new**) | median post-chaos rank (today → **new**) | median places gained from 0.70 (today → **new**) | top 5 (today → **new**) |
|---|---|---|---|---|---|
| **10** | 29/30 | ★ **0/30** | 5 → **—** | +1 → — | 50/56 → — |
| **20** | 30/30 | **2/30** | 5 → **10** | −1 → −7 | 24/41 → 1/2 |
| **30** | 29/30 | **0/30** | 5 → **—** | −9 → — | 12/53 → — |
| **40** | 30/30 | **2/30** | 9 → **20** | −9 → −14 | 15/48 → 1/2 |
| **60** | 30/30 | **9/30** | 9 → **29** | −17 → 0 | 7/56 → 3/10 |
| **100** | 29/30 | **7/30** | 19 → **49** | −19 → −38 | 7/55 → 2/9 |

### ★ THREE THINGS THAT TABLE SAYS, AND ONE OF THEM IS A FINDING ABOUT THE OLD CODE

**1 · The band repair works exactly as specified.** When a comebacker is cast, he now comes from
post-chaos rank 10 of 20, 20 of 40, 49 of 100 — never from rank 5 again. At N=10 nobody is cast,
which is the answer rather than a gap.

**2 · ★ THE ROLE ALL BUT DISAPPEARS AT HIS COMMON FIELD SIZES.** 2/30 at N=20, **0/30 at N=30**,
2/30 at N=40. The B1 pool is the racers the plan has ASSIGNED a top-5 finish, and such a racer is
almost never also deep after the chaos phase. **The band is reachable only from about N=60 up.** This
is the case the brief said to name rather than paper over, and no second curve was invented to cover
it.

**3 · ★ THE PLAN CANNOT DELIVER A DEEP RACER TO THE TOP 5 — AND IT COULD NOT BEFORE THIS CHANGE
EITHER.** That is why the control matters. Today's comebacker LOSES places after the 0.70 mark at
every size from N=30 up (**−9, −9, −17, −19**) and reaches the top 5 in **12 of 53** at N=30 and
**7 of 55** at N=100. The new rule's deep racers do no better. **The delivery failure is
pre-existing; this change exposes it, it does not cause it.** Casting a racer from rank 49 of 100 and
steering him to the front cluster is a curve the machinery does not actually achieve.

★ **SO THE BRIEF'S THIRD REQUIREMENT — "he arrives in the TOP 5" — IS NOT MET, and it was not met
before.** The band is built as far as the numbers support; arrival is a separate, older problem.

---

## 3 · ★ THE INTERACTION WITH WHAT SHIPPED YESTERDAY, WHICH HE SHOULD KNOW BEFORE LOOKING

[COMEBACK-PRECEDENCE-1](COMEBACK-PRECEDENCE-1.md) is on master and makes the camera cut to **the
plan's CAST comebacker**. With this rule the plan casts one in **0–2 of 30 races at N=20–40**, so
**that feature would go nearly silent at his most common field sizes.**

★ **The comeback SHOT does not disappear with it**, and that is worth knowing too:
`comebackDetector.js:157` falls back to the wider `_b1` pool when the plan casts nobody. The browser
race in §6 shows exactly that — no cast comebacker, and a `COMEBACK_ZOOM` on screen anyway. **What
changes is that the shot is no longer the story's choice; it is the fallback's.**

---

## 4 · SABOTAGE — WATCHED RED

`client/src/modules/comebackBand.test.js`, 9 tests. The sabotage restores the old band
(`p.rank > cr` as the whole test):

```
× a racer just behind the front group is NEVER cast as a comebacker
  AssertionError: expected 'comebacker' not to be 'comebacker'
× ...and neither is anyone else above the band, across the whole cast
  AssertionError: expected 15 to be greater than or equal to 20
× in a field too small to climb, no comebacker is cast at all
  AssertionError: expected [ { index: 5, …(2) }, …(1) ] to deeply equal []
      Tests  3 failed | 6 passed (9)
```

★ **Three red, and the first is the defect itself** — rank 6 of 40, cast under the old band and
refused under the new. Reverted; a grep for the marker returns nothing.

---

## 5 · ★ FAIRNESS — THE GATE'S SECOND HALF IS RED, AND THE CONTROL SPLITS THE BLAME

`docs/FAIRNESS.md` is canonical. Method: each track's own `defaultRacerTypeId` **read from
`server/seeds/tracks/`, never hardcoded** (garden-path is `beetle`, not the snail an older note
recorded), 40 racers, 60 s, seeds 1–6 × 50 races = **300 races per track, 3 000 per arm**, plan on.

### PRIMARY — band-reach. ★ PASSES, comfortably

| | B1 | B2 | B3 | B4 |
|---|---|---|---|---|
| **pooled, 120 000 rows** | **87.4%** | **88.0%** | ★ **86.7%** | **94.9%** |

Tightest zone **86.7%** against the **70%** gate line. Every track individually ≥ **83.5%**.
★ **And that covers the comebacker**: a cast comebacker is by construction a B1-target racer, and
B1 band-reach is 87.4%.

### SECONDARY — start-row bias (χ², the sim's own `computeFairnessStats`, Holm across 10 tracks)

★ **The canonical method pools 300 races into ONE test per track.** My first pass ran 60 separate
50-race tests, which is a different and under-powered measurement; it was redone correctly.

| | Holm-unfair rows | luger-hill | dirt-oval |
|---|---|---|---|
| **today (control)** | ★ **1 of 10** | χ² **23.100**, p 1.56e-4 — ★ UNFAIR | χ² 6.133, p 0.104 — fair |
| **with the new casting** | ★ **2 of 10** | χ² **23.033**, p 1.61e-4 — ★ UNFAIR | χ² **12.933**, p **4.97e-3** — ★ UNFAIR |

★ **luger-hill is PRE-EXISTING.** Master already fails it, with a virtually identical χ² (23.100
against 23.033). **The gate's "0 Holm-unfair rows" line is therefore already red on master**, which
is a finding in its own right and is not this piece's doing.

★ **dirt-oval IS this change's.** χ² 6.133 → 12.933, p 0.104 → 0.005. One track moved from fair to
Holm-unfair.

★ **STOPPED AND REPORTED, as the brief requires.** Nothing was tuned to recover it, no threshold was
moved, and the branch is not merged. **Whether one more Holm-unfair track is worth the repair is his
to weigh** — and he should weigh it against §2's finding that the repair does not yet buy a top-5
arrival.

---

## 6 · THE BROWSER TEST

`client/e2e/comeback-band.spec.js` — a Quick Test race in real Chromium, planned under the new rule.
★ **The risk it covers is the shape this change creates: a plan with FEWER heroes, sometimes none.**
Nothing in the headless sim builds a scoreboard, a HUD or a camera lock out of that shape.

```
[comeback-band] field 20 · winner card: "WINNER\n11\nFlare"
[comeback-band] camera trace: OVERVIEW → LEADER_ZOOM → BATTLE_ZOOM → LEAD_CHANGE → … →
                              PHOTO_FINISH → FINISH → FINISH_OVERVIEW
```

Race ran to a winner, full camera trace, **zero page errors**.

★ **WHAT IT DELIBERATELY DOES NOT ASSERT:** that a comeback shot does or does not happen. The `_b1`
fallback makes the shot's presence a dirty signal for the casting rule, and an assertion on it would
pass or fail for the wrong reason. The cast is pinned in the unit file instead.

★ **A FAILED ASSERTION THAT WAS MINE, not the product's**, recorded because this chain keeps
producing them: the first draft read the winner from `activeRace.winners`, which is empty at that
point in the flow. **The race had finished correctly, with the card on screen.** The spec now reads
the winner off the card the viewer sees.

---

## 7 · FINGERPRINTS — ALL FOUR MOVED, AND TWO OF THEM NEED THE SEPARATE ANSWER

| role | record | measured | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | ★ **`cf73f18232d0d4e4`** | MOVED — **expected** |
| world-off | `aa09ed97a3a32689` | ★ **`924ef70c5f99f4c6`** | MOVED — **expected** |
| camera | `75aef5cd474c54e5` | ★ **`3ca6e1e92f1a50ce`** | MOVED |
| render | `40b2de6fcc5bafd8` | ★ **`b4d9e63514424de9`** | MOVED |

★ **NOTHING IS MINTED. The golden races are RED and deliberately NOT re-recorded.**

### Why camera and render moved, answered rather than asserted

The brief asked for this separately, because a move there would mean the change altered **how the
race is drawn** rather than **which race is run**. It did not:

- **No camera file and no drawing file is touched.** The whole diff is `heroCurveGenerator.js` plus
  new tests and one diagnostic: `git diff --name-only` matched nothing under `camera/`, `drawing/`
  or `render`.
- Both instruments are functions of *(the race, the drawing code)*. The drawing code is byte-identical,
  and the race moved on purpose — so **both hashes move downstream of the race**, which is exactly
  what a changed casting must do. A camera fingerprint that had NOT moved would have been the
  surprise.

---

## 8 · CHECKS

```
node scripts/engine-reach.mjs --check client/src/modules/heroCurveGenerator.js \
  client/src/modules/comebackBand.test.js client/e2e/comeback-band.spec.js scripts/diag/comeback-band.mjs

ENGINE REACH: 1 of 4 path(s) can change the race:
  client/src/modules/heroCurveGenerator.js
```

`npm run verify`, plain: **PASS 19 · FAIL 6**. ★ **Every one of the six reduces to "the race changed",
and each was opened rather than assumed:**

| red | what it actually is |
|---|---|
| `world-fingerprint` | expected — the race moved |
| `golden-races` | expected — stored outcomes, NOT re-recorded |
| `camera-fingerprint`, `render-fingerprint` | §7 — downstream of the race |
| `client-suite` | 4 tests: 3 stored **winner indices** in `goldenRealArm.test.js` and 1 stored **winner name** in `replay.test.js`. ★ **The parity GUARANTEE still holds** — `a.hash === b.hash`, `finishOrder` equality and the topology spread all PASSED; only the stored anchors failed. The drift detector passed too. |
| `script-suite` | `check-golden-races.test.mjs`'s own two tests — the same stored outcomes |

★ **4 650 of 4 654 client tests pass**, including the 9 new band tests and the repaired generator suite.

★ **ONE EXISTING TEST NEEDED ITS FIXTURE WIDENED, and it is a fixture change rather than a weakening.**
`emitted STANDARD hero curves are mutually separated` failed on its own PRECONDITION —
`expected 1 to be greater than 1` — because the shared fixture's B1 finishers all sit near the front
and none may be cast as a comebacker any more, so only one standard hero was emitted and the
separation was never reached. A deep B1 finisher is now pinned in that one test so two curves exist
to separate. **The property asserted is unchanged.**

**`git stash` was not used. `--no-verify` was not used. No record was created by hand, and the sweep
JSON stayed in the scratchpad.**

---

## 9 · WHAT IS OPEN, AND IT IS HIS

1. ★ **The role nearly disappears at N=20–40** (0–2 of 30), and with it
   COMEBACK-PRECEDENCE-1's cut. Ship the honest band and accept a rare comebacker, or keep a
   frequent one he has already called fake?
2. ★ **dirt-oval became Holm-unfair** — and **luger-hill already was, on master.**
3. ★ **Nothing delivers a deep racer to the top 5**, before or after this change. That is the next
   real problem and it is bigger than a casting rule.
