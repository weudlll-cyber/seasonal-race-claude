# BRAKE-SHIP-1 — the owner's four values are the shipped defaults, and the shipped path reproduces the measured arm exactly

Branch `feat/gap-leader-brake`. Date: 2026-09-17. **Nothing minted, nothing merged, nothing tagged.**
V1 (`servoNoiseBlindEnabled`) stays `false`. The owner's store was not opened.

---

## ★ ONE LINE

**The four values are in, the shipped default reproduces the 56/13/0.97 arm on 300 of 300 races
byte-identically, and `verify` fails on exactly the three fingerprints — every one of them category
(a), expected because the default legitimately moved. No (b).**

---

## STEP 1 — THE VALUES

All four in `client/src/modules/storage/defaults.js`, each with its evidence in the comment above it:

| key | was | **now** | line |
|---|---|---|---|
| `gapBrakeEnabled` | `false` | **`true`** | [:1154](../../client/src/modules/storage/defaults.js#L1154) |
| `gapBrakeAllowedGapPx` | `90` | **`56`** | [:1182](../../client/src/modules/storage/defaults.js#L1182) |
| `gapBrakeWindowEnd` | `0.95` | **`0.97`** | [:1195](../../client/src/modules/storage/defaults.js#L1195) |
| `gapBrakeMaxAuthority` | `0.1` | **`0.13`** | [:1211](../../client/src/modules/storage/defaults.js#L1211) |
| `servoNoiseBlindEnabled` | `false` | **`false`** — unchanged | [:1220](../../client/src/modules/storage/defaults.js#L1220) |

**The mechanism, the dev-screen controls and the validation rules are untouched.**

★ **One consequence worth naming:** a stored config written before today carries `gapBrakeEnabled:
false` and **keeps the pre-brake race until it is reset** — the store beats this file per key. That is
recorded in the comment at the switch.

### What was now false, and is fixed

| what | where | why it was false |
|---|---|---|
| `expect(…gapBrakeEnabled).toBe(false)` | `gapLeaderBrake.test.js` | asserted the old shipped state outright |
| the pinned full-object defaults | `raceDynamicsConfig.test.js:113-116` | pinned all four old values |
| *"OFF is the shipped state"* ×2 | `DynamicsTuningSection.jsx` :841, :860 | the brake now ships ON |
| *"ramps to full at twice it"* | `DynamicsTuningSection.jsx` :841 | describes the **retired size law** — false since GAP-BRAKE-RATE-1, and I fixed it while I was there |

**The `ships OFF` test was replaced rather than deleted**, by a pin on the new shipped state: all four
values **plus** `servoNoiseBlindEnabled === false`, since the brake shipping on makes that the
assertion that matters rather than a formality. ★ The numbers are written out rather than read from
the config — **a test that reads the value it is checking cannot fail**, which is the whole failure
mode a pinned default exists to catch. A second new test asserts the authority never exceeds
`1 − minMult` ([racePlanner.js:103](../../client/src/modules/racePlanner.js#L103)).

### ★ Two fixtures failed for their own reason, not the law's

Both were calibrated to the 90 px allowance. **Neither assertion was weakened; both fixtures were
fixed.**

1. **`leaderTargetAt` did not deliver the gap it claimed.** The mechanism reads
   `(leaderT − secondT) × pathPx`, and that px → t → px round trip is not exact once `packT` is large:
   at 90 px it landed a hair **under**, at 56 px it lands **5e-13 over** — turning "a gap exactly AT
   the allowance" into "a hair above it" and firing the gate the test exists to prove closed. The
   fixture now nudges the leader down until the value the mechanism will compute is no greater than
   the gap asked for, at any allowance.
2. **The growth profile stepped by an absolute `0.6` px.** The law is
   `dStrength = ceiling × dGap / allowance`, so a tighter allowance saturates the integrator sooner —
   148 rising steps against the 200 asserted. The step is now `ALLOWED_PX / 150`, which **is exactly
   0.6 at the 90 px the fixture was written against**, so the old case is reproduced and the assertion
   now tests the law rather than an absolute pixel count.

### The brake's tests still separate their own sabotage

**19/19 green, and 5 of 5 sabotages caught**, green either side of each: the gate ignoring the
allowance, the growing-gap law ignoring `dGap`, the shrinking gap never giving authority back, the
authority ceiling removed, and the brake ignoring its own window.

### What I looked for and did not find

**No document outside `docs/MORNING.md` mentions the gap brake at all** — the one-home rule has kept
config values out of `docs/`, so there was nothing to correct there. `check-doc-facts` and
`check-config-keys` both pass.

---

## ★★ STEP 2 — MEASURED ON THE SHIPPED PATH

Every earlier measurement drove the brake through a config override. This one passes **no override of
any kind**: whatever `defaults.js` carries is what runs. Ten tracks × seeds 1–30 = **300 races**,
40 racers, the owner's roster, `wild`.

### The decision rule

> **300 of 300 races byte-identical between the shipped default and the 56/13/0.97 override arm.**
> **The override and the default are the same thing.**

### What changed against the previous shipped behaviour

| | previous shipped (brake off) | **new shipped default** |
|---|---|---|
| largest lead, window start → the line | 87.9 / 162.0 / **244.4 px** | 86.3 / **127.7** / **187.5 px** |
| **races with a >124 px gap after 0.95** | **24/300** | **8/300** |
| contested finishes | 129/300 | 125/300 |
| winner changes | — | **57/300** |
| byte-identical races | — | **141/300** |

★ Every figure reproduces WINDOW-END-1's 0.97 arm exactly. ★ The worst lead falls **244.4 → 187.5 px**
(−23%); in canvas widths against the settled LEADER_ZOOM of 225 px/width, **1.086 → 0.833 widths**.
★ The p90 falls 162.0 → 127.7 px while **the median barely moves** (87.9 → 86.3) — the brake works in
the tail, not on the ordinary race.

---

## STEP 3 — THE CHECKS, AND WHAT THEY WERE EXPECTED TO DO

### `engine-reach --check`, with the changed paths passed EXPLICITLY

**8 of 44 paths can change the race:** `raceCore.js`, `raceDynamicsConfig.js`, `racePlanner.js`,
`storage/defaults.js`, `diag/acceptance-orders.mjs`, `diag/micro-divergence.mjs`,
`parity/goldenRunner.mjs`, `sim-fairness.mjs`. ★ Of those, **only `defaults.js` changed in this
block**; the other seven are the previous chains' harness work, already on the branch.

### All four fingerprints — **they moved, as expected. NOTHING WAS MINTED.**

| role | record | measured now |
|---|---|---|
| world | `b35cf477c09a1116` | **`b6cfd1daf1756f61`** |
| world-off | `19ccb497041a0dae` | **`744bec11644978bb`** |
| camera | `3df640a42e934312` | **`5d91f59b9ada16cc`** |
| render | `6a84085e79535dd6` | **`06671c1d13850cd7`** |

★ All four moving is the correct outcome of switching a race-changing default on, **not a defect**.
The record in `docs/fingerprints.json` is untouched and the mint waits for his word.

### ★ Golden races — nothing moved, and that is BY DESIGN

**`golden-races` PASSES (2.7 s).** Not luck: the guard's own description says so at
[check-golden-races.mjs:58](../../scripts/check-golden-races.mjs#L58) — *"Every input is pinned in the
fixture, so a change to `defaults.js`, to a track seed or to a racer's shipped values cannot move
these races — that is what `fingerprint-default.mjs` covers, and neither instrument replaces the
other."* **So there is nothing to re-record, and I did not.**

### `verify` — 22 PASS / 3 FAIL, every failure classified

| guard | address | class |
|---|---|---|
| `world-fingerprint` | record `b35cf477…` vs measured `b6cfd1da…` | **(a)** the default legitimately moved |
| `camera-fingerprint` | record `3df640a4…` vs measured `5d91f59b…` | **(a)** same cause |
| `render-fingerprint` | record `6a84085e…` vs measured `06671c1d…` | **(a)** same cause |

★★ **No (b). Nothing else failed.** `client-suite` (398.5 s), `golden-races`, `script-suite`
(158.1 s), `check-client-build`, `check-index`, `check-config-keys`, `check-doc-facts` and the rest
all pass — **22 of them.** The three that fail are the three that measure the race, and the race
changed on purpose.

---

## SOURCE HYGIENE

| file | before | after | what happened |
|---|---|---|---|
| `storage/defaults.js` | 1524 | 1543 | +27/−8: four values, and the evidence for each written above it |
| `gapLeaderBrake.test.js` | 467 | 506 | +49/−... : one obsolete test replaced by two, two fixtures fixed |
| `raceDynamicsConfig.test.js` | 384 | 384 | the pinned four updated, one comment line added |
| `DynamicsTuningSection.jsx` | 1669 | 1669 | three strings corrected, no structure touched |

**Nothing was removed** except the single `ships OFF` assertion, which was replaced by a stronger one.
**Reused rather than written:** the existing `makeController` / `leaderTargetAt` / `driveGapProfile`
fixtures, the existing sabotage script, and `DEFAULT_CONTROLLER_PARAMS` (already exported) for the
ceiling assertion.

**Noticed and deliberately left alone:**
- **The seven other engine-reach paths** on this branch are the previous chains' harness work; this
  block changed none of them.
- **`docs/MORNING.md` still described the build as serving the brake OFF.** That is a status document
  and I rewrote its brake section rather than patching prose in place.
- **`gapBrakeAllowedGapPx`'s comment still carries the old scale note** ("on his fixture the race-max
  lead runs a median of 132 px and a p90 of 210") — measured under the old allowance and no longer
  the current figures. I left it: it is labelled as the reasoning for the *first* build's 90 px, and
  rewriting the history in a comment is not the same as fixing a false claim about the present.

---

## WHAT THIS DOES NOT SETTLE

- N = 300 races for the shipped-path comparison. The `>124 px` count is **24 → 8**, a difference of
  sixteen races out of three hundred.
- **Fairness was not re-measured for this configuration.** FAIRNESS-SEED-1 established that the
  instrument must be given a positive seed; a seeded run at 56/13/0.97 is owed before the merge.
- The mint, the merge, the archive tag, the branch sweep and the CI check for the merge SHA are all
  still outstanding and wait for his word.
