# CHASE-PARITY-DIAG-1 — the parity arms never diverged; a pinned WINNER did

> **In one sentence: with the chase on, the two parity arms still produce byte-identical races —
> what fails is a pinned shipped-outcome baseline (which racer wins), exactly as a deliberate
> behaviour change is supposed to make it fail, and it is re-recorded at a ship like a fingerprint.**

**Branch `feat/chase-after-outcome`, 2026-09-23. Diagnosis only — nothing is fixed, no default is
permanently flipped, no key is added, no guard is changed, no arm is repaired.** The three keys were
set temporarily and uncommitted for the experiments below (the same method as the night before) and
are back at their shipped values `false / 'leader' / 2`; `git status` shows `defaults.js` clean.

---

## 1 · IT REPRODUCES, EXACTLY

With `chaseAfterOutcomeEnabled: true`, `'gap'`, `5`, `goldenRealArm` fails the same three cases with
the same values and passes the same fourth:

| case | result |
|---|---|
| `searound/manta/40/seed=1` | ✗ `expected 27 to be 12` |
| `searound/manta/40/seed=7` | ✗ `expected 38 to be 17` |
| `searound/manta/40/seed=42` | ✗ `expected 7 to be 13` |
| *holds across topologies, the plan gate, D-ROWCOUNT* | ✓ passes |

Deterministic, not intermittent.

---

## 2 · ★★ THE CAUSE, LOCATED

**All three failures are at `client/src/modules/parity/goldenRealArm.test.js:57:69`** — the stack
frame is identical in all three. That line is:

```js
expect(a.results.find((r) => r.finalRank === 1).racerIndex).toBe(REAL_ARM_WINNERS[seed]);
```

`REAL_ARM_WINNERS = { 1: 12, 7: 17, 42: 13 }` ([goldenCases.js:46](../../client/src/modules/parity/goldenCases.js#L46)).
With the chase on the winners become **27, 38, 7**.

★★ **That is not a parity assertion.** The parity assertions sit *above* it and all pass:

| line | assertion | with the chase on |
|---|---|---|
| `:47-55` | `a.hash !== b.hash` → throw `REAL-ARM MISMATCH` with `firstDivergence` | **never thrown** |
| `:56` | `expect(a.hash).toBe(b.hash)` | **passes** |
| `:57` | `expect(finishOrder(a.results)).toBe(finishOrder(b.results))` | **passes** |
| **`:57:69`** | winner `=== REAL_ARM_WINNERS[seed]` | ✗ **fails** |

The test's own comment says what that last line is for: *"the winner matches the shipped-default
(150 px/s) outcome — real == sim above is the guarantee"*. It is a **shipped-outcome pin**, in the
same family as a fingerprint or a golden race, and the file even records that these winners have
already been re-recorded twice — *"These moved at the 2026-07-29 COMBO15 ship (MERGE-SHIP-1) and
again at RACER-FLAPPING-2"* (`:36-38`).

**Step 2 asked for the first divergence between the arms. There isn't one.** `firstDivergence` is
never reached because the hashes match.

### Confirmed a second way, independently of vitest

Comparing `realArm(identity).hash` against `simArm(identity).hash` directly, on the same three
identities:

| keys | seed 1 | seed 7 | seed 42 |
|---|---|---|---|
| `false / 'leader' / 2` (shipped) | OK | OK | OK |
| `true / 'leader' / 2` | OK | OK | OK |
| `true / 'gap' / 2` | OK | OK | OK |
| `true / 'leader' / 5` | OK | OK | OK |
| **`true / 'gap' / 5`** (the arm) | **OK** | **OK** | **OK** |

**Every combination is byte-identical across the arms.**

### Why the fourth case passed

`SPREAD_CASES` asserts **only** `expect(a.hash).toBe(b.hash)` (`:70-72`) — no winner pin. So it was
never going to fail, and its passing was not evidence that the other three were a parity problem.

---

## 3 · THE BISECT — it separates nothing, because nothing is broken

The bisect in §2 was designed to separate "the extension diverges" from "the gap selection
diverges" from "a slot count above the old 1–2 clamp diverges". **All five rows are green**, so
none of those three things diverges. The table is reported in full because a null result from a
designed experiment is a result.

---

## 4 · THE CONFIG QUESTION, ASKED FIRST AND ANSWERED NO

The two arms obtain their dynamics config by different routes — `realArm` via
`loadRaceDynamicsConfig()` ([goldenRunner.mjs:634](../../scripts/parity/goldenRunner.mjs#L634)),
`simArm` via `DEFAULT_RACE_DYNAMICS_CONFIG`. The hypothesis was that one route silently drops a key.
Printed at the point each arm reads them:

| key | `DEFAULT_RACE_DYNAMICS_CONFIG` (sim route) | `loadRaceDynamicsConfig()` (real route) |
|---|---|---|
| `chaseAfterOutcomeEnabled` | `true` | `true` |
| `chaseAfterOutcomeSelection` | `gap` | `gap` |
| `chaseAfterOutcomeSlots` | `5` | `5` |

**Identical on both routes.** The branch's validation rule keeps all three: `'gap'` is inside the
closed set, `5` is inside `1..10`. **The hypothesis is disproved and is recorded as disproved.**

---

## 5 · ★ TWO CLAIMS OF MINE THIS CORRECTS

- **"The parity runner does not carry the governor"** (CHASE-BUILD-1 §5, MORNING-2026-09-23) —
  **refuted** on 2026-09-22 and corrected on both documents in this commit rather than deleted. The
  sim arm reaches the governor transitively through raceCore's own `stepRacePhysics`.
- **"Three of four cases diverge on finishing order"** — **wrong twice over.** They do not diverge,
  and the assertion that fails is about the *winner*, not the finishing order; the finishing-order
  assertion at `:57` passes. I read the failure message without reading the assertion it came from.

Between them these two errors cost a commissioned block (PARITY-GOVERNOR-1, void on its premise)
and blocked CHASE-SHIP-1 for a day.

---

## 6 · WHAT THIS DOES **NOT** ESTABLISH

- **It does not say the winner pins should be re-recorded, or that the chase should ship.** Naming
  the cause was the job. What to do about a pinned baseline that a deliberate behaviour change
  moves is the owner's decision.
- **It does not survey the other golden guards.** `goldenEquality` and `goldenNegative` were not run
  with the arm on in this block; only `goldenRealArm` was, because that is where the reported
  failure was. Whether they carry shipped-outcome pins of their own is unchecked.
- **It does not establish that nothing else fails with the arm on.** The full suite with the arm on
  was not run here — the three keys were reverted as soon as the cause was located, per this
  block's read-only scope.
- The bisect covers the three keys at the values named. It does not cover other slot counts or the
  interaction with any other config.
