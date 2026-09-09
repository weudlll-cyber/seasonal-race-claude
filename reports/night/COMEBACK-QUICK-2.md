# COMEBACK-QUICK-2 — the same ten races at 55, 60, 65 and 70 percent

**Instrument: `scripts/lib/raceDriver.mjs` → `raceCore.stepRacePhysics`** — the engine `RaceScreen`
renders through, and the same function `sim-fairness.mjs:120` imports and calls. See
[COMEBACK-QUICK-1 §0](COMEBACK-QUICK-1.md).

Day chain 2026-09-08 · branch `night/2026-09-07` · **unmerged, nothing minted, nothing built.**

---

# ★★ FIRST: THE HOLD WAS NOT HOLDING, AND THAT INVALIDATES QUICK-1 TOO

The brief asked why the hold slipped. It slipped because **it never engaged.**

**`racePlanner.js:805-808`:**

```js
// Pre-OUTCOME: only heroes steer (toward their curves); the pack stays pinned to 1.0 exactly as
// before. In OUTCOME every racer steers (heroes toward their curves).
if (_preOutcome && !isHero) {
  _setTarget(r, 1.0, elapsedMs);
  continue;
}
```

**A non-hero is pinned to 1.0 before OUTCOME**, and the hold override sat *after* that `continue`.
Under choreo OUTCOME begins at `pulkEnd` ≈ **0.50** — so at a 0.50 release the hold had **no window at
all**, and at later releases only the sliver after OUTCOME opened.

Traced on the two races QUICK-1 flagged, both held racers `(not a hero)`:

```
seed 9509  0%:r27/m1.00  10%:r8/m1.10  20%:r6/m1.00  30%:r1/m1.00  40%:r8/m1.00  50%:r1/m1.00
seed 8532  0%:r4/m1.00   10%:r2/m1.00  20%:r1/m1.00  25%:r14/m1.00 40%:r28/m1.00 50%:r35/m1.00
```

`trajectoryMult` is **1.00 across the whole window**. The servo was not acting on him. He drifted
where the race put him — which is why rank-at-release ranged 1–35.

### ★ SO QUICK-1's 0.50 COLUMN IS NOT A MEASUREMENT OF THE SHAPE EITHER

The brief said *"THE 0.50 COLUMN IS NOT RE-RUN. It is the one valid measurement."* **That premise is
false**, so 0.50 was re-run with the rest. Its earlier 10/10 and 8/10 were a racer who drew 3rd racing
normally to 3rd — no hold, no comeback. Re-running it costs ten races and gives the four new columns a
baseline taken the same way; leaving it would have put one number from a broken arm beside four from a
working one.

## The fix, and it relaxes no limit

The hold decision moved **above** the pre-OUTCOME pin, and a held racer is exempt from it:

```js
const holdActive = plan._holdArm != null && r.index === plan._holdArm.index &&
                   phaseProgress != null && phaseProgress < plan._holdArm.until;
if (_preOutcome && !isHero && !holdActive) { _setTarget(r, 1.0, elapsedMs); continue; }
```

It changes **only which rank the servo aims at**, and the result still passes the identical
`clamp(minMult, maxMult)`. It lets the servo steer him during PULK — which is what "steered from ~15%,
held until the release point" means. Traced again, same two seeds:

```
seed 9509  15%:r6/m1.06  20%:r9/m0.85  25%:r18/m0.86  30%:r17/m0.96  40%:r16/m0.90  50%:r18/m0.93
seed 8532  15%:r2/m1.00  20%:r3/m0.85  25%:r21/m1.10  30%:r17/m0.86  40%:r20/m1.10  50%:r20/m1.10
```

The servo brakes him to the floor, he settles at rank 16–20 by 25–30%, and stays there. **That is the
owner's shape, measured for the first time.**

---

# THE TABLE

Ten races per cell, N=40, held at rank 18, drawn place **3** (inside the top 5), same two tracks:
**`dirt-oval` (CLOSED)** and **`river-run` (OPEN)** — chosen in QUICK-1 because
`computeEffectiveBrakeFactor` ramps the brake over `avoidanceWarmupMs` on open tracks and applies it
flat on closed ones.

| release | track | the ten finishing places | **TOP 5, all ten** | **TOP 5, rank ≥ 15 only** |
|---|---|---|---|---|
| **0.50** | dirt-oval | 1, 2, 2, 3, 3, 3, 3, 3, 5, 7 | **9 of 10** | **9 of 10** |
| **0.50** | river-run | 1, 1, 2, 2, 2, 3, 4, 5, 6, 8 | **8 of 10** | **8 of 10** |
| **0.55** | dirt-oval | 1, 1, 2, 2, 2, 2, 3, 3, 4, 4 | **10 of 10** | **10 of 10** |
| **0.55** | river-run | 2, 2, 4, 4, 4, 4, 4, 5, 5, 7 | **9 of 10** | **9 of 10** |
| **0.60** | dirt-oval | 1, 1, 1, 2, 3, 3, 3, 4, 4, 6 | **9 of 10** | **9 of 10** |
| **0.60** | river-run | 2, 4, 4, 4, 5, 5, 5, 5, 6, 7 | **8 of 10** | **8 of 10** |
| **0.65** | dirt-oval | 1, 2, 2, 2, 2, 2, 3, 3, 3, 5 | **10 of 10** | **10 of 10** |
| **0.65** | river-run | 1, 2, 2, 2, 3, 4, 5, 6, 6, 7 | **7 of 10** | **7 of 10** |
| **0.70** | dirt-oval | 1, 1, 2, 2, 2, 3, 4, 4, 5, 6 | **9 of 10** | **8 of 9** |
| **0.70** | river-run | 1, 1, 2, 2, 3, 4, 4, 4, 4, 5 | **10 of 10** | **6 of 6** |

**The two columns are all but identical**, because with the hold working he was genuinely deep in
nearly every race — which is the difference from QUICK-1, where they would have diverged sharply.

---

# PINNED AND BLOCKED

| release | track | **PINNED at the ceiling** | **BLOCKED while asking** | overtakes completed | re-passed |
|---|---|---|---|---|---|
| 0.50 | dirt-oval | 31% | 36% | 15.2 | 0.5 |
| 0.50 | river-run | 15% | 21% | 16.6 | 1.0 |
| 0.55 | dirt-oval | 32% | 38% | 16.3 | 0.4 |
| 0.55 | river-run | 14% | 28% | 14.9 | 1.4 |
| 0.60 | dirt-oval | 36% | 31% | 15.5 | 0.3 |
| 0.60 | river-run | 20% | 25% | 14.4 | 1.5 |
| 0.65 | dirt-oval | 45% | 38% | 16.0 | 0.2 |
| 0.65 | river-run | 17% | 23% | 13.4 | 0.9 |
| 0.70 | dirt-oval | 36% | 41% | 14.7 | 0.2 |
| 0.70 | river-run | 17% | 21% | 12.5 | 0.3 |

The two tracks separate cleanly and consistently: **dirt-oval (closed) 31–45% pinned, river-run (open)
14–20%** — the flat-versus-ramped brake showing through, as the track choice was made to expose.

---

# RANK AT RELEASE

| release | dirt-oval | river-run |
|---|---|---|
| 0.50 | 15 – 22 (mean 17.9) | 16 – 22 (mean 19.0) |
| 0.55 | 16 – 22 (mean 18.3) | 15 – 21 (mean 17.6) |
| 0.60 | 16 – 20 (mean 18.0) | 16 – 19 (mean 17.6) |
| 0.65 | 15 – 21 (mean 18.3) | 15 – 20 (mean 16.3) |
| 0.70 | 13 – 20 (mean 17.5) | 13 – 19 (mean 15.2) |

Against QUICK-1's **1 – 35**. Every cell now sits inside or beside the owner's 15–20 window; only at
0.70 does a race drift to 13, which is why that row's two columns differ at all.

---

# CHECKS

| | |
|---|---|
| world fingerprint, arm removed | **UNMOVED** `8a1977187e9c99b4` |
| golden races | **PASS** — 2 races, every position and time as recorded |
| `npm run verify` | **PASS 19 · FAIL 1** — the one failure is `camera-fingerprint`, expected and deliberate (HARNESS-OUTCOME-1). No other guard failed. |

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check reports/night/COMEBACK-QUICK-2.md reports/night/INDEX.md

ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): reports/night/COMEBACK-QUICK-2.md,
  reports/night/INDEX.md
```

---

# SOURCE HYGIENE

**No source file changed.** The hold arm was re-applied to `client/src/modules/racePlanner.js` for the
run and **removed at the end**; that file is byte-identical to the branch it started on. The only
files added are this report and its index line.

**Reused, not rebuilt:** the hold arm and `comeback-quick.mjs` from COMEBACK-QUICK-1,
`scripts/lib/raceDriver.mjs`, the shipped track seeds.

**Noticed and deliberately left:**
- The attacker-b2 release block (`racePlanner.js`, the `atkParams` branch) can set `strictness = 0`,
  which would cancel a hold on a racer cast as an attacker. The arm exempted a held racer from it. It
  is named because it is the second place a hold can be silently undone, and a future measurement arm
  will meet it too.
- **No arithmetic appears in this piece**, as instructed. No reachability model, not even as a column.

**No scratch files entered the repository.** `git stash` was not used.
