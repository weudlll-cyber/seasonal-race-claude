# PARITY-CLOSE-1 — `pathLengthPx` now reaches the sim's plan, and it is provably inert; but it does NOT close the parity break, because there is a second site

Branch `feat/gap-leader-brake`. Date: 2026-09-15. **Nothing minted, nothing merged.** The owner's
store was not opened.

---

## ★ THE SHORT ANSWER

**A1 does what it was asked to do and is provably inert: 300 of 300 races byte-identical, 6 of 6
golden hashes unmoved, all four fingerprints unmoved.** Measured before anything else, as instructed.

**But it does not close the parity break, and the premise it was built on was incomplete.**
`sim-fairness.mjs:4436` is one of **two** sites that starve the brake, and it is **not the one the
parity guards use**. The guards' sim arm goes through `goldenRunner.mjs`'s own `simPlanConfig`
([goldenRunner.mjs:766](../../scripts/parity/goldenRunner.mjs#L766)), which contains **neither**
`pathLengthPx` **nor** any `gapBrake` key — `gapBrake` appears **0 times in the whole file**. With the
brake on and V1 on, the arms still produce the same disagreeing hashes as before:

| seed | real | sim | |
|---|---|---|---|
| 1 | `1ba41a20` | `836a46e0` | **STILL DIFFER** |
| 7 | `a9c70e65` | `a9c70e65` | match |
| 42 | `5ba78503` | `f4cce0cb` | **STILL DIFFER** |

**And even in `sim-fairness.mjs`, the path length was only one of two blockers.** The brake still
never fires there, because the sim's plan config carries no `gapBrakeEnabled` either — and wiring
that in was explicitly out of scope for this part.

---

## A1 — THE CHANGE

One key — `pathLengthPx,` at [sim-fairness.mjs:4503](../../scripts/sim-fairness.mjs#L4503) — added to
the config object of the `createRacePlan` call at
[sim-fairness.mjs:4436](../../scripts/sim-fairness.mjs#L4436), with the comment explaining why.
**Nothing else**: no brake key, no new key, no default moved.

**Where the value came from — it was already there.** `pathLengthPx` is resolved for the track at
[sim-fairness.mjs:4288](../../scripts/sim-fairness.mjs#L4288)
(`const pathLengthPx = track.pathLengthPx ?? shape.getTotalLength();`) and is **already passed to
`runSingleRace`** at [:4517](../../scripts/sim-fairness.mjs#L4517). The call site at 4436 is inside
that scope. **No value was
invented, computed, or plumbed through from anywhere new.**

---

## A2 — IT CHANGES NOTHING WITH THE BRAKE OFF

This came before any other measurement, as the part required.

### (i) The three golden seeds, both arms

| seed | real: before → after | sim: before → after |
|---|---|---|
| 1 | `836a46e0` → `836a46e0` **SAME** | `836a46e0` → `836a46e0` **SAME** |
| 7 | `a9c70e65` → `a9c70e65` **SAME** | `a9c70e65` → `a9c70e65` **SAME** |
| 42 | `f4cce0cb` → `f4cce0cb` **SAME** | `f4cce0cb` → `f4cce0cb` **SAME** |

**6 of 6 hashes unmoved.**

### (ii) Ten tracks × seeds 1–30, brake OFF, V1 OFF

Against a worktree at `e0dd9d64` (the commit before the change). "Identical" = finishing order **and**
all 40 finish times to the millisecond.

| track | result | track | result |
|---|---|---|---|
| city-circuit | **30/30** | mountainstreet | **30/30** |
| dirt-oval | **30/30** | river-run | **30/30** |
| garden-path | **30/30** | searound | **30/30** |
| ice-track | **30/30** | seatrack | **30/30** |
| luger-hill | **30/30** | space-sprint | **30/30** |

★ **300 of 300 byte-identical. Zero races moved.**

### (iii) All four fingerprints — unmoved

| role | before the change | after |
|---|---|---|
| world | `0c83ed775f93f21f` | **`0c83ed775f93f21f`** |
| world-off | `31339297edb48ede` | **`31339297edb48ede`** |
| camera | `5aa59d7473823afe` | **`5aa59d7473823afe`** |
| render | `caa3fee8ad7f2280` | **`caa3fee8ad7f2280`** |

★ These are the branch's **post-V1** values, not the record's — V1 moved them first, and this change
moves nothing further. **Nothing was minted.**
★★ The world fingerprint **spawns `sim-fairness.mjs`**, so it exercises the changed line directly;
its being unmoved is the strongest single piece of A2's evidence.

**The decision rule did not fire: nothing moved with the brake off.**

---

## A3 — WHAT IT UNLOCKS, AND WHAT IT DOES NOT

### Do the arms now agree with the brake on? — **No**

Measured in a probe copy carrying the A1 change with `gapBrakeEnabled` switched on: the hashes are
**bit-for-bit the same disagreement as before A1** (table at the top). **A1 changes the parity picture
not at all**, because the guards' sim arm never reaches `sim-fairness.mjs`'s plan config.

**The two sites, with addresses:**

| arm | how it builds its plan | sees the brake? |
|---|---|---|
| `realArm` | `createRaceFromIdentity` at [goldenRunner.mjs:670](../../scripts/parity/goldenRunner.mjs#L670), passing `pathLengthPx: ctx.pathLengthPx` — raceCore then hands the brake's keys and the path length to the plan ([raceCore.js:177](../../client/src/modules/raceCore.js#L177)) | **yes** |
| `simArm` | `simPlanConfig(DEFAULT_RACE_DYNAMICS_CONFIG)` at [goldenRunner.mjs:766](../../scripts/parity/goldenRunner.mjs#L766), fed to `createRacePlan` at [goldenRunner.mjs:462](../../scripts/parity/goldenRunner.mjs#L462) — **0 occurrences** of `pathLengthPx` or `gapBrake` in that builder | **no** |
| `sim-fairness.mjs` | its own `createRacePlan` at [:4436](../../scripts/sim-fairness.mjs#L4436) — **now carries `pathLengthPx`**, still carries no brake key | **path yes, switch no** |

### Can the fairness instrument exercise the brake? — **Not yet, and here is the count**

A tally was instrumented inside `_computeGapLeaderBrake` in a probe copy and printed at process exit,
from a **real `sim-fairness.mjs` run** (searound / manta / 40, `--races=2`, brake switched on in the
probe's `defaults.js`):

| | calls | had `pathLengthPx` | brake enabled | **FIRED** |
|---|---|---|---|---|
| **without A1** | 8,511 | **0** | 0 | **0** |
| **with A1** | 8,499 | **8,499** | 0 | **0** |

★ **A1 is proven to work: every one of the 8,499 calls now carries the track's path length, where
before not one did.** The brake's first guard
([racePlanner.js:886](../../client/src/modules/racePlanner.js#L886)) no longer stops it.

★ **And it still never fires**, because `plan._gapBrakeEnabled` is
`config.gapBrakeEnabled === true` and the sim's plan config carries no such key — `enabled=0` on
8,499 calls. **Adding it was explicitly out of scope for this part**, so the second blocker stands.

★ **On the call counts.** The absolute total is not stable across process runs — repeats with A1 held
constant gave **8,499 / 8,432 / 8,483** — so the 8,511-vs-8,499 difference is the sim's own
scheduling, **not an effect of A1**. The figure that matters is the ratio, and it is exact:
**100% of calls carry the path length with A1, 0% without.**

### `verify` — 20 PASS, 6 FAIL, every failure addressed

**All six are the same failures the branch already had before this change**, which is what A2
predicts. None is caused by A1.

| guard | address | class |
|---|---|---|
| `world-fingerprint` | moved by V1 (`0c83ed…`), unmoved by A1 | **(a)** |
| `camera-fingerprint` | moved by V1 (`5aa59d…`), unmoved by A1 | **(a)** |
| `render-fingerprint` | moved by V1 (`caa3fe…`), unmoved by A1 | **(a)** |
| `golden-races` | `closed-garden-path-12`, Flash −0.256 s — moved by V1 | **(a)** |
| `script-suite` | `scripts/check-golden-races.test.mjs`, the same golden race | **(a)** |
| `client-suite` | 4 of 4705: [goldenRealArm.test.js:57](../../client/src/modules/parity/goldenRealArm.test.js#L57) ×3 and [replay.test.js:87](../../client/src/modules/parity/replay.test.js#L87) — the **pinned winner**, not the hash | **(a)** |

**No (b).** Confirmed against PARITY-AGE-1's finding: the parity hash assertions pass; line 57 is the
pinned-winner assertion.

---

## WHAT THIS MEANS

**A1 is a correct, narrow, inert improvement that removes one of the two things starving the brake in
`sim-fairness.mjs`** — and it is worth keeping on that basis alone, because the fairness instrument's
blindness to the brake (BRAKE-WINDOW-1) needs both blockers gone.

**It does not close the browser/sim parity break**, and my one-sentence suggestion at the end of
PARITY-AGE-1 was therefore incomplete: I named `sim-fairness.mjs:4436` as *the* site when it is one of
two, and not the one the parity guards exercise. **Closing the break needs
`goldenRunner.mjs`'s `simPlanConfig` to carry the brake's keys and the path length too** — which would
make the sim arm model a mechanism it currently cannot see. **Nothing further was built.**

---

## WHAT THIS DOES NOT SETTLE

- Whether the sim *should* model the gap brake at all is a design question, not a measurement one.
  The alternative reading — that the sim is a fairness instrument and need not carry a camera-adjacent
  fallback brake — is not refuted by anything here; on that reading the parity guards should instead
  **assert the brake is off** rather than model it.
- The tally was taken on one track/racer combination (searound/manta/40, `--races=2`); the
  0%-vs-100% result is categorical rather than statistical, but N is one combination.
- N = 300 races for A2(ii), 3 seeds for A2(i) and A3.
