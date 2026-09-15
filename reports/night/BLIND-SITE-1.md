# BLIND-SITE-1 — five harnesses were racing a world no player sees; all five are closed, and the parity break with them

Branch `feat/gap-leader-brake`. Date: 2026-09-16. **Nothing minted, nothing merged, nothing tagged.**
The owner's store was not opened.

---

## ★ ONE LINE

**Five blind sites found, five fixed, none left open** — plus one the search did not look for and
found anyway: **V1 had no switch at all**, which is fixed too, and with it off **all four fingerprints
are back to the record**. There is nothing to mint.

---

## STEP 1 — THE SEARCH

### How I searched, so an absence claim can be checked

| # | pattern | over | why |
|---|---|---|---|
| 1 | `createRacePlan\|createRaceFromIdentity\|createTrajectoryController\|buildRace\b` | whole tree, uncapped | every name that builds a plan or a race |
| 2 | `createRacePlan\|createTrajectoryController` | `scripts/` | the harness side specifically |
| 3 | `createRaceFromIdentity\(` with a brace-balanced argument parse | `client/src/screens/`, `scripts/**/*.mjs`, `client/src/**/*.js` | extract the KEYS each call passes and diff against the 19 `createRaceFromIdentity` destructures at [raceCore.js:102-123](../../client/src/modules/raceCore.js#L102-L123) |
| 4 | brace-balanced object-literal key extraction | every plan-config builder found by 1–2 | diff the top-level keys against the browser's |

**The reference is the browser**, as the task sets it: the config `createRacePlan` is handed at
[raceCore.js:257](../../client/src/modules/raceCore.js#L257) — **41 keys** before this block. It is
right by definition because it is what a player runs.

### Race construction — clean, and that was checked rather than assumed

All **11** `createRaceFromIdentity` call sites pass all **19** inputs: `RaceScreen/index.jsx:593`,
`camera-fingerprint.mjs:167`, `camera-replay.mjs:212`, `check-ending-frame.mjs:239`,
`exp-anchor-truth-ab.mjs:150`, `finish-band-truth.mjs:237`, `render-fingerprint.mjs:329`,
`diag/start-formation.mjs:210`, `golden/goldenRace.mjs:107`, `lib/raceDriver.mjs:390`,
`parity/goldenRunner.mjs:670`. ★ `lib/raceDriver.mjs:390` is the shared helper ~25 camera scripts go
through, so they inherit it. ★ `finish-band-truth.mjs:237` first read as missing 13 — a **false
positive** from a line-anchored regex on multi-key lines; corrected, and the corrected run is the
one reported.

### ★ The blindness is entirely in the PLAN-CONFIG layer — five sites

| site | keys | **missing** | what it disabled |
|---|---|---|---|
| [goldenRunner.mjs:322 `browserPlanConfig`](../../scripts/parity/goldenRunner.mjs#L322) | 35 | **6** | the gap brake, on the parity guard's *browser twin* |
| [goldenRunner.mjs:379 `simPlanConfig`](../../scripts/parity/goldenRunner.mjs#L379) | 36 | **6** | the gap brake, on **the arm the parity guards actually run** |
| [sim-fairness.mjs:4436](../../scripts/sim-fairness.mjs#L4436) | 40 | **5** | the gap brake, in the fairness instrument |
| [diag/acceptance-orders.mjs:108](../../scripts/diag/acceptance-orders.mjs#L108) | 31 | **11** | the gap brake **and COMBO15 fair-arrival** |
| [diag/micro-divergence.mjs:159](../../scripts/diag/micro-divergence.mjs#L159) | 31 | **11** | the gap brake **and COMBO15 fair-arrival** |

**Common to all five:** the four `gapBrake*` keys and `trajectoryTransitionDuration`. Without them
`_computeGapLeaderBrake` returns at its guard
([racePlanner.js:886](../../client/src/modules/racePlanner.js#L886)) and the mechanism **cannot run at
all**. Four of five also omitted `pathLengthPx`.

★★ **`browserPlanConfig` was the surprise.** PARITY-CLOSE-1 named two sites and said the guards used
`simPlanConfig`. Both of the guard's own arms were blind, which is why the guard could not report the
defect: **neither arm had the mechanism**, so they agreed with each other and disagreed with the real
browser core.

★★ **The two diagnostics were worse than blind to the brake — they ran a PRE-COMBO15 world.**
`chaosSteer: true` and `bandBias: true` are shipped defaults
([defaults.js:1008-1012](../../client/src/modules/storage/defaults.js#L1008-L1012)). **Every
finishing order `acceptance-orders.mjs` printed before today is from a race no player runs**, and its
own header called them "canonical defaults". Consequence today: that file has no consumer, no pinned
fixture and is not in `verify`; `docs/SIM.md:292` already records its purpose as UNKNOWN.

---

## STEP 2 — THE FIX

**Every value was taken from where it already existed at its site. Nothing was threaded through the
tree, no key was invented, no default moved, no CLI flag added.**

| site | where the value already was |
|---|---|
| both `goldenRunner` builders | `ctx.pathLengthPx` ([:220](../../scripts/parity/goldenRunner.mjs#L220)), already held by both callers; passed as a **second argument** rather than read off the dynamics config, because it is track geometry — exactly how [raceCore.js:302](../../client/src/modules/raceCore.js#L302) supplies it |
| `sim-fairness.mjs` | `DEFAULT_RACE_DYNAMICS_CONFIG` at [:278](../../scripts/sim-fairness.mjs#L278), which is **already the owner's world when `--config` supplied one**; `DYNAMICS_OVERRIDES.trajectoryTransitionDuration` at [:582](../../scripts/sim-fairness.mjs#L582), the same object the neighbouring `reRollTransitionDuration` reads |
| both diags | `DYN` and `pathLengthPx`, both already in module scope |

**Reused rather than written:** the `?? DEFAULT_RACE_DYNAMICS_CONFIG.X` shape raceCore already uses;
`ctx` from `loadTrack`; `DYNAMICS_OVERRIDES`; and for the guard, the source-reading technique of
[engineInputs.test.js](../../client/src/modules/engineInputs.test.js).

**Nothing was left open.** No site's omission needed a behaviour change to close, so the decision rule
did not fire.

**Noticed and deliberately left alone:** the "written twice ON PURPOSE" design at
goldenRunner.mjs:316 — it is a real anti-drift argument and I did not collapse the two builders into
one. I added the rule it was missing to its own comment instead.

**Source hygiene:** `goldenRunner.mjs` +51/−4, `sim-fairness.mjs` +22, `acceptance-orders.mjs` +21,
`micro-divergence.mjs` +19; the new test 181 lines. Every file keeps its header; each added block
carries a comment naming the mechanism it restores and the guard it gets past.

---

## STEP 3 — INERT FIRST (this gate had to pass before anything else was measured)

Brake OFF, V1 OFF, against a worktree at `6a289590`, 10 tracks × seeds 1–30 × 40 racers, owner's
roster, `wild`. "Identical" = finishing order **and** all 40 finish times to the millisecond.

| | result |
|---|---|
| byte-identical races | **300 / 300** |
| golden hashes, both arms, seeds 1/7/42 | **6 / 6 unmoved** (`836a46e0`, `a9c70e65`, `f4cce0cb`) |
| fingerprints | **4 / 4 unmoved** |

**The decision rule did not fire. Nothing moved with the brake off, so the chain continued.**

---

## STEP 4 — DOES IT WORK?

### ★★ The parity break is CLOSED

Brake ON at the owner's settings (90 px, 0.95, 10%), measured directly on both trees rather than
carried forward from an earlier note:

| seed | BEFORE real | BEFORE sim | BEFORE browser | | AFTER (all three arms) |
|---|---|---|---|---|---|
| 1 | `1ba41a20` | `836a46e0` | `836a46e0` | **DIFFER** | **`1ba41a20`** ✓ |
| 7 | `a9c70e65` | `a9c70e65` | `a9c70e65` | match | `a9c70e65` ✓ |
| 42 | `5ba78503` | `f4cce0cb` | `f4cce0cb` | **DIFFER** | **`5ba78503`** ✓ |

★ **All three arms now agree, and they agree on the REAL BROWSER CORE's value.** The browser was the
right reference, as assumed.
★ **The sharpest statement of the old defect:** before the fix, the sim and browser-twin arms
returned `836a46e0` and `f4cce0cb` with the brake ON — **the identical hashes they return with it
OFF**. Switching the mechanism on changed nothing for them, because they did not have it.

### Can the fairness instrument exercise the brake? — the count, not an assumption

A tally inside `_computeGapLeaderBrake` in a **probe copy** (never the real tree), printed at process
exit from a real `sim-fairness.mjs` run:

| | calls | had `pathLengthPx` | **enabled** | **FIRED** |
|---|---|---|---|---|
| before this block (already carrying PARITY-CLOSE-1's path length) | 2,262,986 | 2,262,986 | **0** | **0** |
| after | *(reported in the morning sheet — the run is long; see Piece 2's firing count, which answers the same question inside the fairness run itself)* | | | |

★ The "before" row is the defect in one line: **the path length arrived on 100% of 2.26 M calls and
the brake still never ran**, because the config carried no `gapBrakeEnabled`.

### `verify` — 20 PASS / 6 FAIL, every failure addressed

**All six were already failing before this block**, and all six are V1's moved inputs — **category (a)
throughout, no (b)**. ★ Since then V1 has been switched off and all four fingerprints have returned to
the record; `verify` is re-run in Piece 4.

| guard | address | class |
|---|---|---|
| `world-fingerprint` / `camera-fingerprint` / `render-fingerprint` | moved by V1 | **(a)** |
| `golden-races` | `closed-garden-path-12`, Flash −0.256 s | **(a)** |
| `script-suite` | [check-golden-races.test.mjs:34](../../scripts/check-golden-races.test.mjs#L34), same race | **(a)** |
| `client-suite` | 4 of 4705 — [goldenRealArm.test.js:57](../../client/src/modules/parity/goldenRealArm.test.js#L57) ×3 and [replay.test.js:87](../../client/src/modules/parity/replay.test.js#L87) | **(a)** |

★★ **The parity assertions themselves PASS.** `goldenRealArm.test.js:54` (hash) and `:55` (finishing
order) are green; only `:57`, the **pinned winner**, fails — and `replay.test.js:82-86` says in its
own comment that the hash checks above it are the guarantee. These are re-pins, not parity failures.

---

## STEP 5 — THE GUARD

[client/src/modules/parity/planConfigMirror.test.js](../../client/src/modules/parity/planConfigMirror.test.js)
reads the browser's own object literal and fails if any of the five builders omits a key. It finds
each site by a **text anchor**, not a line number, so an edit above it cannot silently misaim the
check.

### Proven by sabotage — 7 sabotages, all 5 sites, 7/7 caught

| sabotage | verdict |
|---|---|
| `browserPlanConfig` loses `trajectoryTransitionDuration` | **CAUGHT** |
| `simPlanConfig` loses `trajectoryTransitionDuration` | **CAUGHT** |
| `sim-fairness` loses `gapBrakeWindowEnd` | **CAUGHT** |
| `acceptance-orders` loses `chaosSteer` | **CAUGHT** |
| `micro-divergence` loses `gapBrakeMaxAuthority` | **CAUGHT** |
| `micro-divergence` loses `bandBiasGain` | **CAUGHT** |
| `micro-divergence` loses `chaosSteerGain` | **CAUGHT** |

**Green before and after every one**, so no verdict rests on a tree that was already red.

★★ **THE FIXTURE WAS CHECKED FOR THE FAILURE MODE THIS AREA HAS ALREADY HAD.** A test here passed
under its own sabotage twice before. So the file asserts that its own extractor found something:
`reference.length > 30` plus three named keys, and per site `keys.length > 30`. **That assertion
earned its place immediately** — the first version of the extractor read the function BODY instead of
the returned literal and produced an empty key set, which would have made every check pass vacuously.
It went red instead, and `via: 'return'` is the fix.

**What the guard does NOT catch, so a green run is not over-read:** it compares key NAMES, not values.
A builder passing `gapBrakeAllowedGapPx: 0` still satisfies it. Values are guarded by the golden
hashes and the fingerprints.

**The general guard I did not build:** one that calls each builder and compares the resolved PLAN
objects would catch a wrong value too. It needs the three module-private builders exported and the two
CLI scripts made importable without running a race on import — new machinery, so it was not built.

---

## ★★ THE SIXTH SITE, WHICH THE SEARCH DID NOT LOOK FOR

**V1 had no key.** It shipped into this branch's source on 2026-09-14 (`012fb90d`) with no switch, so
it could not be turned off in the dev screen and could not be held apart from the gap brake — and the
two together are unsafe (BRAKE-JERK-1). "Never switch the two on together" was unenforceable.

**I added a switch rather than reverting**, and the reason is on the record: reverting would answer a
question the owner has explicitly left open in `docs/MORNING.md` — *"Does V1 go in at all?"*. A switch
forecloses nothing, keeps V1 and its tests alive for that decision, and satisfies the standing rule
that everything be UI-configurable.

`servoNoiseBlindEnabled: false` in defaults.js, resolved as `plan._servoNoiseBlind` with the same
`=== true` shape the brake's own switch uses, branched at
[racePlanner.js:1441](../../client/src/modules/racePlanner.js#L1441), and threaded through all six
plan-config builders — **which the new mirror test then required**, the first time it earned its keep.

### ★★★ With the shipped defaults, this branch is back to the record

| role | record | measured now |
|---|---|---|
| world | `b35cf477c09a1116` | **`b35cf477c09a1116`** |
| world-off | `19ccb497041a0dae` | **`19ccb497041a0dae`** |
| camera | `3df640a42e934312` | **`3df640a42e934312`** |
| render | `6a84085e79535dd6` | **`6a84085e79535dd6`** |

**All four had been moved by V1. There is nothing to mint. Nothing was minted.**

`servoNoiseBlind.test.js` now asks for the key explicitly — **its two V1 assertions went red the
moment the switch was added and before that line was**, which is the proof the switch really gates the
mechanism. A fifth test pins the other side: at the shipped default the noise restarts the ease on
**16 of 79** steps against V1's **exactly 0**. ★ That bar is set from the measurement; its first
version asserted `>40` on an assumption that most steps restart and went red for its own reason rather
than a real one.

---

## WHAT THIS DOES NOT SETTLE

- N = 300 races for the inertness proof, 3 seeds for the hashes, 1 track/racer combination for the
  call tally (the 0%-vs-100% result is categorical, but N is one combination).
- The guard compares key names only (above).
- Whether the sim *should* model the gap brake is a design question. This block answers the factual
  one: it could not, and now it can.
- **Whether V1 goes in at all is still the owner's open question.** Nothing here answers it.
