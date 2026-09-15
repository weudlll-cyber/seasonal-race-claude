# SERVO-NARROW-SHIP-1 — V1 is in the shipped source on this branch, and it breaks browser/sim parity

Branch `feat/gap-leader-brake`. Date: 2026-09-15. **Nothing minted, nothing merged.** The owner's
store was not opened.

---

## ★★ THE FIRST LINE, BECAUSE IT IS A REAL DEFECT (b)

**V1 breaks the browser/sim byte-parity guarantee on 2 of the 3 golden seeds.** This is *not* the
"moved pinned winner" the previous counterfactual produced — the two arms now genuinely disagree:

| seed | real arm | sim arm | |
|---|---|---|---|
| 1 | `1ba41a20` | `836a46e0` | **DIFFER — parity broken** |
| 7 | `a9c70e65` | `a9c70e65` | MATCH |
| 42 | `5ba78503` | `f4cce0cb` | **DIFFER — parity broken** |

First divergence located: **`physicsTs = 55000`, max &#124;Δt&#124; = 2.894 × 10⁻³ at racerIndex 38** —
small, late, and growing. That is the signature of amplified round-off, not of a structural
difference in what the two arms compute.

**Two candidate causes, and this instrument cannot separate them:**

1. **The epsilon was a quantizer.** `_setTarget` wrote the target only when it moved by more than
   0.001, which rounded away any sub-epsilon difference already existing between the arms. V1 writes
   the target *every step*, so a pre-existing 1-ULP difference now propagates into `trajectoryMult`
   on every step instead of being discarded. Under this reading the defect is **latent and older
   than V1**, and V1 only exposes it.
2. **V1 introduces a genuinely new divergence** through the extra per-step write.

Reading 1 is the more consistent with the evidence — the divergence appears at 55 s of racing rather
than at the first step, one seed of three is unaffected, and the magnitude starts at 3 × 10⁻³ — **but
it is not proven, and I am not choosing.** Both arms call the same `stepRacePhysics`
([sim-fairness.mjs:1833](../../scripts/sim-fairness.mjs#L1833)), so there is no un-mirrored mechanics
change to point at; the Sim-Browser Parity Rule has nothing to repair here.

**Either way the guarantee is violated and that is what matters**: the sim is what this project uses
to predict the browser, and on this branch it no longer does so exactly.

---

## WHAT WAS SHIPPED, AND WHERE

`_setTargetNoiseBlind` at
[racePlanner.js:741-789](../../client/src/modules/racePlanner.js#L741-L789), called from the servo
write at [racePlanner.js:1440-1451](../../client/src/modules/racePlanner.js#L1440-L1451). The restart
is decided on the deterministic part of the command — the same expression as `rawTarget` with the
noise term removed — against the deterministic part the setter last acted on. **The noise still
reaches the speed**: the target is written every step either way. No threshold moved and there is no
new number.

**It reproduces the measured ARM 1 exactly** — 5 of 5 witness races byte-identical between the
shipped source and the instrumented arm (finishing order and all 40 finish times).

---

## THE CHECKS

### engine-reach, with the changed path passed explicitly

```
node scripts/engine-reach.mjs --check client/src/modules/racePlanner.js
ENGINE REACH: 1 of 1 path(s) can change the race:
  client/src/modules/racePlanner.js
```

### All four fingerprints MOVED — measured, nothing minted

| role | record | measured on this branch |
|---|---|---|
| world | `b35cf477c09a1116` | **`0c83ed775f93f21f`** |
| world-off | `19ccb497041a0dae` | **`31339297edb48ede`** |
| camera | `3df640a42e934312` | **`5aa59d7473823afe`** |
| render | `6a84085e79535dd6` | **`caa3fee8ad7f2280`** |

**Nothing was minted.** The owner judges the picture first.

### `verify` — 19 PASS, 6 FAIL, 9 SKIP (347 s), every failure classified

| guard | address | class |
|---|---|---|
| `world-fingerprint` | the four values above | **(a)** legitimately moved input — the change moves the race by design |
| `camera-fingerprint` | as above | **(a)** |
| `render-fingerprint` | as above | **(a)** |
| `golden-races` | `closed-garden-path-12` — Flash (position 1) expected 36.592 s, **got 36.336 s (−0.256 s)** | **(a)** |
| `script-suite` | `scripts/check-golden-races.test.mjs` — "both golden races reproduce their recorded outcome". **The same golden race, surfacing twice**; the rest of the script suite passes | **(a)** |
| **`client-suite`** | `client/src/modules/parity/goldenRealArm.test.js` × 3 and `client/src/modules/parity/replay.test.js` × 1 — **4 failed of 4705** | **★ (b) REAL DEFECT** — the parity break above |

★ **Golden races were NOT re-recorded.** One race moved, by −0.256 s on the winner's finishing time.

★ **An earlier run of `verify` showed 6 client failures and a different `script-suite` reason.** Two
of those were the **uncommitted eye-test line** that had the gap brake switched on for his eye
(`gapLeaderBrake.test.js` "ships OFF" and `raceDynamicsConfig.test.js` "has expected default values").
Reverting that line — see the decision below — took the client suite to the 4 parity failures above.
**Confirmed by stashing it and re-running: 48/48 passed.**

### The test, and its sabotage proof

`client/src/modules/servoNoiseBlind.test.js` — 4 tests, all green. Both halves of the change are
asserted, because they pull in opposite directions: a "fix" that also stopped the noise reaching the
racer would pass a naive restart test and be a different mechanism.

| sabotage | the test that must go red | went red |
|---|---|---|
| remove the change — the servo write goes back to `_setTarget` | "the ease is NOT restarted while only the noise moves" | **YES** (2 of 4 red) |
| block the noise from the speed as well | "the noise MOVES the written target every step" | **YES** (1 of 4 red) |
| make the restart deaf to real movement (threshold 999) | "a rank change DOES still restart the ease" | **YES** (2 of 4 red) |

★★ **The fixture failed to separate its own sabotage on the way in, and the correction is recorded in
the file's header.** The first version selected a racer sitting at **0.8503 against a 0.85 floor** —
effectively pinned, so his command could not move down, so *neither* setter restarted and the two
behaviours were indistinguishable on him. **That is the same clamp hazard SERVO-FAULT-1 measured**
(racers 16+ ranks off their place are 100% clamped and arrive 94.6% either way). The margin is now a
fifth of a rank, which is a number with a reason rather than a round one.

### Race shape — my construction, not a project instrument

From the PICK-WINNER-1 sweep, N = 300 paired races. Lead spells count at ≥ 750 ms
(`pulkLeadRotationMinHoldMs`, an existing shipped quantity).

| | today | V1 |
|---|---|---|
| lead changes per race | 19.43 | 19.46 |
| distinct leaders per race | 15.92 | 15.83 |
| longest single hold (fraction of race) | 0.197 | 0.205 |
| **winning margin at the line** | 46.6 px | **39.3 px (−16%)** |
| **field spread at the line** | 692.1 px | **609.1 px (−12%)** |
| **races won clear (margin > 90 px)** | **39/300** | **24/300** |

★ **Neither more processional nor less lively at the front** — lead changes and distinct leaders are
unchanged. What moves is the **finish**: the winning margin falls 16%, the field is 83 px tighter at
the line, and races won clear drop from 39 to 24 in 300. **More contested at the line.**

### Fairness

The project's instrument is **`scripts/sim-fairness.mjs`** (start-row fairness via
`scripts/sim/observers/fairness-stats.mjs`). Its pinned methodology is **300 races per track,
pooled**. A run at that N does not fit the night — the instrument buffers all output and a previous
attempt burned 925 s of CPU producing nothing. A **short** run was completed on both arms:
**searound, 20 races per racer type, `--track-defaults`. That is short by a factor of 15 and must NOT
be read as the pinned gate.**

The instrument's own start-row test is a χ² on finishing position against starting row; **p > 0.05 is
its own "fair"**. Seven racer types completed on each arm before the night ended:

| racer type | today, χ² / p | V1, χ² / p | band reach (B1 top-5) today → V1 |
|---|---|---|---|
| duck | 1.2 / **0.756** | 5.2 / **0.156** | 80% → 84% |
| dragon | 2.7 / **0.850** | 4.7 / **0.589** | 91% → 86% |
| rocket | 2.5 / **0.648** | 6.5 / **0.163** | 90% → 89% |
| koi | 8.0 / **0.237** | 3.5 / **0.742** | 88% → 89% |
| turtle | 5.1 / **0.528** | 7.0 / **0.320** | 90% → 90% |
| manta | 10.7 / **0.098** | 6.4 / **0.380** | 84% → 88% |
| dolphin | 7.7 / **0.257** | 8.5 / **0.201** | 84% → 87% |

★ **The instrument's verdict is the same on both arms: fair.** All 14 rows sit at p > 0.05, so no
start-row row is flagged on either arm, and **band reach stays well above the 70% the gate asks for
on every row** (80–91% today, 84–90% under V1). The p-values move in both directions — up on four
rows, down on three — which at N = 20 is what noise looks like; **nothing here says V1 helps or harms
fairness, only that it does not break it on this evidence.**

★★ **This is one track of ten and 20 races where the methodology pins 300.** It is reported as a
short run at every mention and **must not be quoted as the fairness gate.**

★ Note it covers **the servo change only**. Had the winner included the gap brake it would cover
nothing at all: `sim-fairness.mjs` contains the string `gapBrake` **zero times** and passes no
`pathLengthPx`, so the brake returns at its guard before reading anything.

---

## PIECE 4 — THE BUILD FOR HIS EYE

| | |
|---|---|
| **production build** | **http://localhost:4173** — the arm to judge on |
| **dev server** | **http://localhost:5173** |
| **API** | **http://localhost:4000** — CORS confirmed for both client origins |

```
[ra-build] start-up: serving build 647142ee · feat/gap-leader-brake
/api/health  {"build":{"commit":"647142ee","branch":"feat/gap-leader-brake","dirty":false}}
```

★ **`dirty: false`** — unlike the last build, the tree is clean, because the eye-test line that had
the gap brake switched on was reverted (below). **Bundle actually served on 4173:
`dist/assets/index-DXtP-MIa.js`** (925.98 kB, gzip 276.51) with `dist/assets/index-ucWHj0Wl.css`,
both read out of the page the preview server returned.

### How to switch it off

**It has no key and cannot be switched off in the dev screen.** V1 is unconditional in the servo's
write path — it is a change to how a target is written, not a behaviour with a setting. To compare
against today's behaviour, check out `363543e3` (the commit before it) and rebuild. **That is a real
cost of this change and it is named here rather than discovered later.**

*(The gap brake's own keys are all still in the dev screen under "Gap leader brake", and the brake is
back at its shipped default of OFF.)*

### What to watch

| | race | why |
|---|---|---|
| **1** | **ice-track, Quick Test seed 3** — his race | in-window lead **196.6 → 113.6 px (−42%)**; the leader's servo arrival on that race goes **22.2% → 82.0%**. ★ **The winner changes: Flare → Breeze.** |
| **2** | **luger-hill seed 24** — the largest improvement in 300 races | **244.4 → 54.9 px (−189.5)**; winner Zephyr → Flash |
| **3** | **searound seed 26** — the largest regression, shown deliberately | **61.1 → 218.6 px (+157.5)**. V1 is not uniformly better and this is the worst case of it |

★★ **There is NO byte-identical control race to offer — 0 of 300.** V1 touches the servo write for
every racer on every step, so every race changes. That is itself the headline about scope: **300
races × 40 racers = 12,000 racer-slots, all of them**, and **190 of 300 races change winner.**

---

## DECISIONS TAKEN WITHOUT ASKING

- **The eye-test line was reverted.** The working tree had `gapBrakeEnabled: true` uncommitted so the
  owner could look at the brake. The winner of this chain is **ARM 1 = V1 with the brake at its
  shipped OFF**, so serving the winner means serving it with the brake off. Reverting also cleared
  three of the six `verify` failures, which were that line and not V1. **The consequence: his
  outstanding eye-test on the gap brake is no longer on the served build.**
- **A short fairness run instead of none.** The pinned N does not fit; a short run labelled short is
  worth more than an empty section, and it is labelled at every mention.

---

## WHAT THIS DOES NOT SETTLE

- **The parity break is the open question**, and it is the reason this is not a candidate to merge as
  it stands. Which of the two causes it is decides whether the fix belongs in V1 or in a
  longer-standing difference between the arms.
- **V1 did not clear the bar the chain set** (PICK-WINNER-1): its largest single-step multiplier move
  is 1.008× the shipped maximum. It is the closest of the three arms by a wide margin, and it is here
  labelled as not clearing.
- **V1 is worse than today on four tracks** at the extreme — mountainstreet by +45.8 px — while being
  better on six. The pooled figure is a poor summary and the per-track table in PICK-WINNER-1 is the
  honest one.
- Fairness is short by 15×; race shape is my construction.
