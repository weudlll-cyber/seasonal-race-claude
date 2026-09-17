# PARITY-AGE-1 — neither (A) nor (B): V1 alone keeps parity, and the crack is the SIM's blindness to the gap brake

Branch `feat/gap-leader-brake`. **Read-only: no shipped source changed, nothing minted, nothing
merged.** Date: 2026-09-15. The owner's store was not opened.

---

## ★★ FIRST: A CORRECTION TO MY OWN PREVIOUS REPORT

**SERVO-NARROW-SHIP-1 reported "V1 breaks browser/sim byte-parity" as a category (b) real defect.
That is WRONG, and this report retracts it.**

I measured the parity hashes **while an uncommitted line had the gap brake switched on for the
owner's eye test**, then reverted that line, saw the same four test names still failing, and carried
the conclusion forward **without re-running the hash check**. The four failures after the revert are
not a parity break at all.

**With the shipped defaults — the gap brake OFF — V1 keeps parity exactly:**

| seed | real arm | sim arm | |
|---|---|---|---|
| 1 | `836a46e0` | `836a46e0` | **MATCH** |

and the three `goldenRealArm.test.js` failures are all on **line 57** — the **pinned winner** — not on
the hash:

| seed | failing assertion | |
|---|---|---|
| 1 | `goldenRealArm.test.js:57` | `expected 38 to be 12` |
| 7 | `goldenRealArm.test.js:57` | `expected 39 to be 17` |
| 42 | `goldenRealArm.test.js:57` | `expected 7 to be 13` |

The hash assertion (`goldenRealArm.test.js:49`) and the finish-order assertion
([goldenRealArm.test.js:55](../../client/src/modules/parity/goldenRealArm.test.js#L55)) **pass on all
three seeds**. **All four client failures are category (a) — a moved pinned input**, exactly like
every other arm that moves the race.

---

## ★ THE ANSWER: NEITHER (A) NOR (B) AS PUT

| candidate | verdict |
|---|---|
| **(A)** the 0.001 epsilon was quantizing away a difference that already existed between the arms | **EXCLUDED — proven twice** |
| **(B)** V1 introduces the difference | **NOT AS PUT** — with the brake off, V1 keeps parity perfectly |
| ★ **the third cause, which the two candidates did not cover** | **The sim arm cannot see the gap brake at all. The brake's command never arrived anyway, so the asymmetry had no consequence. V1 makes the command arrive — and only then does the asymmetry become visible.** |

**So the crack is real, it is structural, it is older than V1, and V1 is not its cause — but V1 is
what makes it bite, and only when the brake is switched on too.**

---

## STEP 1 — DO THE ARMS DIFFER AT ALL WITHOUT V1?

On the **pre-V1 tree** (`363543e3`, in an instrumented copy), both arms were traced at the servo
write, recording per racer per step: the **commanded target before the epsilon** (`rawTarget`), the
written target, the held multiplier, `t`, `prev`, `transStart`, `nActive`, the blended `error`,
`ceilFor`, **and the loop index** (so the iteration order is compared too).

| seed | hashes | trace records compared | first difference in ANY quantity |
|---|---|---|---|
| 1 | `10cb5111` = `10cb5111` | **81,529** | **none — every quantity bit-identical** |
| 7 | `b5019d51` = `b5019d51` | **79,270** | **none** |
| 42 | `82a26ee4` = `82a26ee4` | **81,992** | **none** |

★★ **The decision rule is unambiguous.** It said: *if the arms differ in the COMMAND on the shipped
tree and only the epsilon suppresses the consequence, that is (A)*; *if every recorded quantity is
bit-identical, (A) is excluded.* **Every recorded quantity is bit-identical, including `rawTarget` —
the command as formed, before the epsilon ever sees it. There is no pre-existing difference for the
epsilon to have been hiding. (A) is excluded.**

---

## STEP 2 — THE EPSILON AS THE ONLY VARIABLE

Still on the pre-V1 tree, **V1 nowhere in the picture**, `TARGET_EPSILON` varied alone.

| epsilon | seed 1 real / sim | seed 7 real / sim | seed 42 real / sim |
|---|---|---|---|
| 0.001 (today) | `10cb5111` / `10cb5111` **MATCH** | `b5019d51` / `b5019d51` **MATCH** | `82a26ee4` / `82a26ee4` **MATCH** |
| 0.0005 | `3f307d03` / `3f307d03` MATCH | `cbbf4aa9` / `cbbf4aa9` MATCH | `125d6719` / `125d6719` MATCH |
| 0.0002 | `56e2fbc3` / `56e2fbc3` MATCH | `e5d8dd8c` / `e5d8dd8c` MATCH | `2c0e9a54` / `2c0e9a54` MATCH |
| 0.0001 | `f3ffc5ff` / `f3ffc5ff` MATCH | `209b801b` / `209b801b` MATCH | `07be0fc6` / `07be0fc6` MATCH |
| 1e-5 | `f8601337` / `f8601337` MATCH | `48e50a36` / `48e50a36` MATCH | `6a71eb94` / `6a71eb94` MATCH |
| 1e-7 | `1a2c58a8` / `1a2c58a8` MATCH | `8249178d` / `8249178d` MATCH | `31efc6c0` / `31efc6c0` MATCH |
| 1e-9 | `dc53310e` / `dc53310e` MATCH | `09301ae9` / `09301ae9` MATCH | `eb4a206c` / `eb4a206c` MATCH |
| 1e-12 | `dc53310e` / `dc53310e` MATCH | `09301ae9` / `09301ae9` MATCH | `eb4a206c` / `eb4a206c` MATCH |
| **0** | **`dc53310e` / `dc53310e` MATCH** | **`09301ae9` / `09301ae9` MATCH** | **`eb4a206c` / `eb4a206c` MATCH** |

★ **This is a curve, and it reads two ways at once.** The epsilon **does** change the race — the
hashes march as it shrinks, and settle once it is below the float resolution of the targets
(`1e-9` and below are the same race). But **the two arms change together, at every value, down to
zero.** At `TARGET_EPSILON = 0` there is no quantizer at all and parity is still exact.

★★ **(A) is excluded a second time, independently of V1: the quantizer was never what held parity
together.**

---

## STEP 3 — WHAT ACTUALLY CAUSES IT, AND WHICH ARM IS RIGHT

### The reproduction

Running each arm **alone in a fresh process** on the V1 tree gives `836a46e0` for **both**. The
divergence I originally recorded is reproduced exactly only with **the gap brake switched on as
well** — measured in the instrumented copy, brake and V1 each flag-gated:

| | seed 1 | seed 7 | seed 42 |
|---|---|---|---|
| brake ON, **V1 OFF** | `10cb5111` / `10cb5111` **MATCH** | `b5019d51` / `b5019d51` **MATCH** | `82a26ee4` / `82a26ee4` **MATCH** |
| brake ON, **V1 ON** | `1ba41a20` / `836a46e0` **DIFFER** | `a9c70e65` / `a9c70e65` MATCH | `5ba78503` / `f4cce0cb` **DIFFER** |

**Those are the exact hashes of the original finding.** The cause is the **combination**, not V1.

★ Note the brake-ON / V1-OFF row: the hashes are **identical to the brake-OFF race**. With the servo
as it is, **switching the brake on changes nothing at all** — its command is issued and never
arrives, which is the same non-delivery SERVO-FAULT-1 measured.

### Where the arms' code paths differ — with addresses

The two arms take their inputs from **deliberately different sources**, and the file says so itself:
`realArm()` uses *"the browser CONFIG LOADERS (loadBaseSpeedConfig / loadRaceDynamicsConfig /
loadRaceBehaviorConfig)"* while `simArm()` derives inputs *"exactly as sim-fairness.mjs's combo loop
does: the DEFAULT_* config objects"*
([goldenRunner.mjs:9-15](../../scripts/parity/goldenRunner.mjs#L9-L15)).

That difference of source is not the problem. **This is:**

- the browser path hands `pathLengthPx` to the plan alongside the brake's keys
  ([raceCore.js:177](../../client/src/modules/raceCore.js#L177));
- the sim's `createRacePlan` call at
  [sim-fairness.mjs:4436](../../scripts/sim-fairness.mjs#L4436) passes **no `pathLengthPx`** — zero
  occurrences in its argument list — and the whole file contains the string `gapBrake` **zero times**;
- so `_computeGapLeaderBrake` returns at its own guard,
  [racePlanner.js:886](../../client/src/modules/racePlanner.js#L886)
  (`if (!(allowedPx > 0) || windowEnd == null || !(pathPx > 0)) return null;`), **before it reads
  anything**.

**The gap brake is invisible to the sim by construction.**

### Which arm is right

★ **The browser arm is right, and it is not close.** `realArm` is the path a player's browser runs —
`RaceScreen` → `createRaceFromIdentity` / `stepRacePhysics`
([raceCore.js](../../client/src/modules/raceCore.js)) with the real track's `pathLengthPx`. **The sim
arm silently omits a shipped mechanism** whenever that mechanism is switched on.

**I am not treating the sim as the reference because the golden fixtures came from it.** The fixtures
are recorded from races in which the brake is OFF, so they do not discriminate; and where the two
arms disagree, the one carrying the track's own path length is the one describing the game.

---

## STEP 4 — HOW OLD IS IT, AND WHAT RESTS ON IT

**Since (A) is excluded, the epsilon's history is not load-bearing for this question**, and I have
not built a story out of it. For the record only: the `0.001` literal entered on **2026-05-20** in
`596a1b29` (*"Phase 3A: Race Plan + Bereichs-Bonus-Mechanik"*, a squash-merge of 34 commits), and
**no reason for the value is on record** — the commit message does not mention it and no document
explains it. **Not documented.** It was named `TARGET_EPSILON` much later, on this branch
(`f8d7a54d`). **Whatever it is for, it was never what held browser/sim parity together** — Step 2
proves that at epsilon 0.

**The real asymmetry is exactly as old as the gap brake**, which entered this branch on
**2026-09-14** (`f8d7a54d`). ★ **It has never reached master**: `git show origin/master:...defaults.js`
contains the string `gapBrake` **0 times**, and the branch is 36 commits ahead. **So browser/sim
parity on master is not and never has been resting on this.** The exposure is confined to this
branch, and only when the brake is switched on.

### What asserts browser/sim parity, by address

| address | what it pins |
|---|---|
| [client/src/modules/parity/goldenRealArm.test.js](../../client/src/modules/parity/goldenRealArm.test.js) | real == sim on searound/manta/40, seeds 1/7/42, **plus** the pinned winner (line 57) |
| [client/src/modules/parity/goldenEquality.test.js](../../client/src/modules/parity/goldenEquality.test.js) | the wider equality set |
| [client/src/modules/parity/goldenCoverage.test.js](../../client/src/modules/parity/goldenCoverage.test.js) | that the case union is covered |
| [client/src/modules/parity/goldenNegative.test.js](../../client/src/modules/parity/goldenNegative.test.js) | that the comparison can fail |
| [client/src/modules/parity/replay.test.js](../../client/src/modules/parity/replay.test.js) | the emit → replay round-trip |
| [scripts/parity/goldenRunner.mjs](../../scripts/parity/goldenRunner.mjs) | the two arms themselves |
| [scripts/parity/soak.mjs](../../scripts/parity/soak.mjs), [scripts/parity/replay.mjs](../../scripts/parity/replay.mjs), [scripts/diag/outcome-parity.mjs](../../scripts/diag/outcome-parity.mjs) | the soak and diagnostic paths |
| [scripts/golden/goldenRace.mjs](../../scripts/golden/goldenRace.mjs) | the golden-race fixtures |

★ **Were the golden fixtures recorded from an arm that does not match the browser?** **No** — and
this is the reassuring half. The fixtures are recorded with the brake **off**, where Steps 1 and 2
show the arms agree bit-for-bit across ~81,000 servo-write records per race and at every epsilon down
to zero. **The fixtures describe the browser correctly.** The gap would open only if a fixture were
ever recorded with the brake on.

---

## STEP 5 — WHAT IT MEANS FOR V1

**V1 is mergeable as far as parity is concerned.** With the shipped defaults — the gap brake at its
shipped `false` — V1 keeps browser/sim byte-parity exactly, and the parity guards' hash assertions
pass on all three seeds. **The (b) defect I reported against it does not exist.**

What would have to be true for each reading:

| | what it needs |
|---|---|
| **mergeable as it stands** (as far as parity goes) | the gap brake stays OFF — which is its shipped default. **This is the situation today.** The remaining blockers on V1 are the ones already reported: it does not clear the visibility bar (1.008×), it is a full re-baseline (0/300 byte-identical, 190/300 winner changes, four fingerprints, one golden race), and it is worse than today on four tracks. |
| **mergeable only after a repair** | if the gap brake is ever to be switched on **with** V1. Two independent reasons block that combination: this parity asymmetry, and the **7.6× visibility jump** PICK-WINNER-1 measured for the same pair. |
| **V1 is the cause and is not mergeable** | ruled out. Steps 1–3 exclude it. |

### The one sentence the reading points at, and then I stop

**`scripts/sim-fairness.mjs` should pass `pathLengthPx` into its `createRacePlan` call at
[sim-fairness.mjs:4436](../../scripts/sim-fairness.mjs#L4436) so the sim can see the gap brake at
all** — which would simultaneously close this parity asymmetry and make the fairness instrument able
to measure the brake, the hole reported in BRAKE-WINDOW-1. **Nothing was repaired.**

---

## WHAT THIS DOES NOT SETTLE

- **Why `TARGET_EPSILON` is 0.001** is not documented, and I did not reconstruct a motive. Step 2
  shows the value is not arbitrary in effect — it changes the race — but its *reason* is absent from
  the record.
- Seed 7 matches even in the brake-ON / V1-ON row. That is consistent with the brake simply not
  firing in that race; **I did not verify it**, so it is stated as consistent, not proven.
- The trace covers the **servo write site** and the race state (`t`) at that site. A difference that
  never touched either would not appear — though with `t` bit-identical at ~81,000 points across a
  race, and the final hashes matching, there is no room left for one to hide.
- N = 3 golden seeds on one track/racer combination (searound/manta/40), which is what the parity
  guards themselves use.
