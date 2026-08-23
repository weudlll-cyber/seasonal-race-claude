# ACTION-KEYS-1 — which candidate keys actually make action

**Block:** PIECE 3 of the chain of 2026-08-23-B, plus the owner's addendum of the same day.
**Answers:** `docs/BACKLOG.md` PART TWO **D10** — the action dial's mapping is decided by measurement.

**READ-ONLY. No default moved, no key wired to anything, no dial designed, no mapping proposed.**
This is the table a later design block starts from, and nothing more.

---

## 1. The headline

**The candidates are nowhere near equal, and they split into two families by WHICH WINDOW OF THE RACE
they act in.** That split is the finding; the ranking inside each family is secondary.

- **Front-fight levers.** Four candidates move the contested front measurably on **both** tracks, in
  the **same direction** on both. All four are the PulkLeadRotation strengths plus the chaos steer.
  **`pulkLeaderBrake` is the dominant one by a factor of about two** over the next.
- **Finish levers.** The attacker keys, the tempo re-draw, the choreography keys and gap-reroll
  barely touch the front and move the ENDING instead. **Ranked by the front window alone, all of them
  read as dead.**
- **The owner's two additional candidates are WEAK.** Both were made measurable (§3). Steering **more**
  racers, or steering them **harder**, moves action far less than braking the racer currently leading.

**What this does NOT say.** Nothing here is a recommendation, a mapping, or a stage definition. It
does not say which of these belongs on a dial, and it says nothing at all about fairness — see §7.

---

## 2. Two ways this measurement could have lied, both caught, both guarded

**Recorded first because both produce a CONFIDENT FALSE ZERO — a key that reads "no effect" while
plainly changing the race — and the first version of this sweep produced nine of them.**

### 2a. THE ACTION MEASURE IS BLIND TO HALF THE RACE

`--front-action`, the project's own action measure and "the sweep's action objective", observes
**`raceProgress < BREAKAWAY_CORRIDOR_START`** (`sim-fairness.mjs`, the observer block). Gap-reroll's
transform returns unchanged **unless `phaseProgress >= corrStartFrac`** (`racePlanner.js`, the window
gate at the top of the transform).

**The same constant. The two windows are disjoint by construction.**

So all six gap-reroll arms reported their action deltas as **exactly 0.0%** — to four decimal places,
on both tracks — while their finishing orders plainly differed. A single-window table would have
recorded "gap-reroll does not affect action" as a measured result. It is not a result; it is the
instrument not looking.

**The fix, and it invents no metric:** two further EXISTING observers were switched on.
`--action-metrics` (whole-field movement over the PULK window) and `--gap-metrics` (samples at
progress 0.50/0.75/0.90 **and at the line**). Only the third can see anything after `corridorStart`.

### 2b. A MISTYPED FLAG RUNS THE SHIPPED GAME AND CALLS IT A RESULT

Three attacker arms were spelled `--b2AttackHeroes`. The harness parses **`--b2-attack-heroes`**.
`argVal` falls back to the default for an unknown key, so those three arms ran the shipped
configuration and reported "no effect" with total confidence.

**The fix:** the driver now extracts every flag name the harness actually parses, from the harness
source, and refuses to start if any arm names a flag that is not in that set. It covers both call
shapes — `argVal("k", …)` and the passthroughs' `numOrNull("k")` — because a guard that misses one
form is a guard reporting success over ground it never looked at, which this project has shipped
twice.

### 2c. AND THE CHECK THAT SEPARATES THE TWO CASES

Every row carries a **race signature** — the per-start-row win counts and mean ranks. Two arms with
the same signature ran the same races; two that differ did not. **That is what distinguishes "the
metric is blind to this key" from "this key does nothing", and take 1 had no such check.** It is the
`race changed` column in every table below, and it earns its place in §5.

---

## 3. The owner's addendum — reachability, stated per candidate

| candidate | reachable from the harness? | what was done |
| --- | --- | --- |
| **A · how many racers the director steers** | **NO, for the choreographed cast** — `nHeroes` is `round(minHeroes + (maxHeroes − minHeroes) × realizedIntensity)`, and `minHeroes`/`maxHeroes` are MODULE CONSTANTS in `heroCurveGenerator.js`'s `GENERATOR_CONFIG`. Not config keys, not in `defaults.js`; the only file outside that module naming them is its own test. **YES for the attacker half** — `b2AttackHeroes` is a real key and was already an arm. | **MADE REACHABLE.** Two inert lines in `racePlanner.js` (`_heroBudget`, and a spread of it into the generator config) plus flags in the harness. |
| **B · how the director steers them** | **NO** — `DEFAULT_CONTROLLER_PARAMS` (`gain`/`maxMult`/`minMult`/`bandStrictness`) is a module constant. `createRacePlan` has **always** accepted `config.controllerParams`; `git grep controllerParams` over the whole tree returns exactly **one** supplier, `racePlanner.test.js`. The hook existed and nothing ever used it. | **MADE REACHABLE with NO product change at all** — harness only. Independently re-confirmed; it is what D6 already recorded. |

**WHAT THE PERMISSION STANDS ON, measured rather than asserted.** With no flags given, the world
fingerprint is **unmoved** against the record in `docs/fingerprints.json`. Every flag defaults to
`null` and every null is dropped, so a flagless run hands `createRacePlan` an object unchanged
key-for-key. **Proved in both directions** — an inert hook that is also a dead hook proves nothing —
by showing the race demonstrably changes with `--controllerGain=5.0` and with `--castMinHeroes=4
--castMaxHeroes=4`.

**It is NOT a config channel:** no key in `defaults.js`, no Dev Screen control, no default moved,
nothing reachable from the product — `raceCore.js` never sets `heroBudget`, so the running game
cannot take that branch. It lives on `feat/harness-cast-and-servo` and **is not merged**; this
block's merge permission covers the report only.

**Nothing here is left unmeasured.** Both candidates were reachable-or-made-reachable, and both are
in the tables.

---

## 4. Protocol

| | |
| --- | --- |
| tracks | **dirt-oval** (closed, horse) and **river-run** (open, duck) — R4's two contrasting tracks, each at its OWN shipped default racer type |
| arms | 39 — one baseline plus 38 candidate values across eight groups |
| races | **30 per arm per track**, `--seed=1`, paired: every arm sees the identical seed sequence |
| field | 40 racers, `--dur=60` |
| measures | `--front-action` · `--action-metrics` · `--gap-metrics`. **Three existing observers; no new metric invented.** |
| runs | 78 unique arm×track. 85 executed — see §5. |

**Every number below is a percentage against the SAME TRACK's baseline from the SAME run** (R16). The
two baselines, quoted once so no cell has to carry them:

| | lead changes | rank churn | held top-5 overtakes | leader→P2 at the line |
| --- | --- | --- | --- | --- |
| dirt-oval | 8.167 | 886.833 | 27.167 | 1.1432 |
| river-run | 11.833 | 1042.033 | 36.433 | 1.2324 |

**THE RANKING STATISTIC IS THE WEAKER TRACK, NOT THE AVERAGE.** A key that moves action on one track
and not the other is not a lever, and an average hides exactly that. Each candidate is also marked
for whether the two tracks **agree in sign** — a key whose effect flips direction between topologies
is not a lever either, whatever its magnitude.

---

## 5. An unplanned determinism control, and what it cost

The sweep was widened mid-run from 2 workers to 8 after the owner asked why it was not parallel from
the start. He was right: the parallelism axis had been inherited from the experiment's shape ("two
contrasting tracks") instead of from the hardware, and **twelve of fourteen cores idled through the
first 45 arms.**

Widening it recomputed nothing — per-worker result files, a done-set unioned across every shard on
disk at start, and an atomic claim per arm. The two original workers predated the claim protocol, so
where the forward and backward fronts met, **7 arms were run twice.**

**All 7 duplicates agreed exactly** — identical race signature and identical metrics, in different
processes under different CPU contention. That is a free proof that the sweep's numbers are
reproducible and that contention affected wall clock and nothing else. **85 runs for 78 results, and
the 7 wasted runs bought a control nobody designed.**

**The per-run seconds are therefore NOT a timing** and are not reported as one. Eight contending
processes distort them; they were never a result.

---

## 6. The table

`race changed` is the race-signature check from §2c: **`NO — byte-identical`** means the arm produced
the same races as the baseline, so a zero is a real zero. Anything else with a 0% action delta is the
instrument, not the key.

| candidate | group | race changed | FRONT (weaker track) | sign | FINISH (weaker track) | sign |
| --- | --- | --- | --- | --- | --- | --- |
| `pulkLeaderBrake=0.0` | lead-rotation | yes | 62% | agree | 7% | agree |
| `pulkChallengerBoost=0.0` | lead-rotation | yes | 44% | agree | 14% | — |
| `pulkEnvelopeMaxEffect=0.04` | lead-rotation | yes | 33% | agree | 18% | agree |
| `pulkLeaderBrake=0.15` | lead-rotation | yes | 30% | agree | 15% | agree |
| `chaosSteerGain=0.0` | steer-noise | yes | 19% | agree | 15% | agree |
| `pulkChallengerBoost=0.12` | lead-rotation | yes | 19% | agree | 12% | agree |
| `controllerMaxMult=1.18` | servo | yes | 7% | — | 11% | — |
| `b2AttackHeroes=0` | attacker | yes | 6% | agree | 13% | agree |
| `reRollIntervalDivisor=20` | tempo | yes | 6% | agree | 33% | agree |
| `pulkFrontPool=3` | lead-rotation | yes | 6% | agree | 3% | agree |
| `controllerMinMult=0.80` | servo | yes | 5% | agree | 3% | — |
| `reRollVariationPercent=25` | tempo | yes | 5% | agree | 8% | agree |
| `controllerMinMult=0.92` | servo | yes | 4% | agree | 7% | agree |
| `reRollIntervalDivisor=5` | tempo | yes | 4% | — | 6% | agree |
| `controllerGain=1.0` | servo | yes | 4% | agree | 5% | agree |
| `b2AttackFinalRank=15` | attacker | yes | 3% | agree | 7% | — |
| `reRollVariationPercent=100` | tempo | yes | 3% | — | 2% | — |
| `b2AttackPeakRank=1` | attacker | yes | 3% | agree | 5% | agree |
| `cast 1..1 hero` | cast-size | yes | 3% | agree | 14% | agree |
| `controllerMaxMult=1.05` | servo | yes | 3% | agree | 17% | agree |
| `b2AttackHeroes=6` | attacker | yes | 2% | — | 3% | agree |
| `chaosSteerGain=0.15` | steer-noise | yes | 2% | — | 9% | agree |
| `choreoIntensity=0.2` | choreo | yes | 2% | — | 3% | — |
| `cast 6..6 heroes (beyond shipped)` | cast-size | yes | 2% | — | 4% | — |
| `cast 2..2 heroes (min)` | cast-size | yes | 1% | — | 2% | agree |
| `controllerGain=4.0` | servo | yes | 1% | — | 13% | agree |
| `cast 4..4 heroes (max)` | cast-size | yes | 1% | — | 0% | — |
| `choreoIntensity=1.0` | choreo | yes | 1% | — | 14% | agree |
| `gapRerollEnabled=false` | gap-reroll | yes | 0% | — | 5% | — |
| `gapRerollStrength=0.5` | gap-reroll | yes | 0% | — | 10% | — |
| `gapRerollStrength=2.0` | gap-reroll | yes | 0% | — | 3% | agree |
| `gapRerollThresholdLengths=0.25` | gap-reroll | yes | 0% | — | 2% | agree |
| `gapRerollThresholdLengths=1.5` | gap-reroll | yes | 0% | — | 4% | — |
| `gapRerollMode='down'` | gap-reroll | yes | 0% | — | 12% | agree |
| `choreoPackBandStrictness=0.1` | choreo | yes | 0% | — | 10% | agree |
| `choreoPackBandStrictness=1.0` | choreo | yes | 0% | — | 9% | agree |
| `pulkFrontPool=16` | lead-rotation | **closed: NO** | 0% | — | 0% | — |
| `pulkEnvelopeMaxEffect=0.20` | lead-rotation | **NO — byte-identical** | 0% | — | 0% | — |


**Per-track detail.** Every cell is that arm against the SAME track's baseline, from the same run — R16.

| candidate | dirt lead / churn / ovt / line | river lead / churn / ovt / line |
| --- | --- | --- |
| `pulkLeaderBrake=0.0` | -62% / -45% / -61% / +7% | -68% / -42% / -71% / +36% |
| `pulkChallengerBoost=0.0` | -27% / -50% / -23% / +30% | -18% / -44% / -17% / -14% |
| `pulkEnvelopeMaxEffect=0.04` | -4% / -36% / -7% / +18% | -7% / -33% / -7% / +23% |
| `pulkLeaderBrake=0.15` | +32% / +6% / +22% / -29% | +30% / +12% / +18% / -15% |
| `chaosSteerGain=0.0` | -13% / -26% / +2% / +15% | -4% / -19% / +7% / +28% |
| `pulkChallengerBoost=0.12` | +26% / +6% / +23% / +12% | +19% / +9% / +13% / +18% |
| `controllerMaxMult=1.18` | -3% / -7% / +1% / +24% | +7% / -0% / -4% / -11% |
| `b2AttackHeroes=0` | +10% / -0% / +1% / +69% | +6% / +1% / +3% / +13% |
| `reRollIntervalDivisor=20` | +4% / -9% / +1% / +66% | +6% / -6% / +4% / +33% |
| `pulkFrontPool=3` | -4% / +1% / -7% / -15% | -6% / -0% / -5% / -3% |
| `controllerMinMult=0.80` | -1% / +1% / -5% / +3% | +6% / +2% / -3% / -8% |
| `reRollVariationPercent=25` | +4% / -7% / +6% / -8% | +5% / -5% / +5% / -12% |
| `controllerMinMult=0.92` | -5% / -16% / +5% / -32% | +4% / -2% / +3% / -7% |
| `reRollIntervalDivisor=5` | -4% / -3% / +2% / -6% | +8% / -2% / -3% / -24% |
| `controllerGain=1.0` | +4% / -3% / +0% / -7% | +4% / -1% / +1% / -5% |
| `b2AttackFinalRank=15` | +2% / -3% / +3% / +7% | +3% / -1% / +3% / -9% |
| `reRollVariationPercent=100` | -1% / +1% / -3% / -2% | +2% / +5% / +1% / +24% |
| `b2AttackPeakRank=1` | +1% / -3% / -1% / +32% | -0% / -6% / +4% / +5% |
| `cast 1..1 hero` | +3% / +1% / +3% / +14% | +5% / +2% / +0% / +19% |
| `controllerMaxMult=1.05` | -3% / +3% / -4% / +17% | -3% / +0% / -2% / +33% |
| `b2AttackHeroes=6` | -2% / -1% / +1% / -3% | +1% / -0% / -7% / -5% |
| `chaosSteerGain=0.15` | -2% / -5% / +4% / +16% | -1% / +2% / -1% / +9% |
| `choreoIntensity=0.2` | +1% / +2% / -1% / -3% | +6% / +2% / +1% / +27% |
| `cast 6..6 heroes (beyond shipped)` | -2% / -1% / +2% / +4% | +2% / +1% / +0% / -5% |
| `cast 2..2 heroes (min)` | +1% / -0% / -1% / -2% | +4% / +2% / +1% / -7% |
| `controllerGain=4.0` | +1% / +1% / +1% / -15% | +3% / +2% / -1% / -13% |
| `cast 4..4 heroes (max)` | -2% / -1% / +2% / +0% | +1% / +0% / -1% / -15% |
| `choreoIntensity=1.0` | +0% / -1% / -1% / +14% | +1% / -1% / -1% / +16% |
| `gapRerollEnabled=false` | +0% / +0% / +0% / +5% | +0% / +0% / +0% / -18% |
| `gapRerollStrength=0.5` | +0% / +0% / +0% / +10% | +0% / +0% / +0% / -15% |
| `gapRerollStrength=2.0` | +0% / +0% / +0% / +3% | +0% / +0% / +0% / +7% |
| `gapRerollThresholdLengths=0.25` | +0% / +0% / +0% / +2% | +0% / +0% / +0% / +14% |
| `gapRerollThresholdLengths=1.5` | +0% / +0% / +0% / +6% | +0% / +0% / +0% / -4% |
| `gapRerollMode='down'` | +0% / +0% / +0% / +18% | +0% / +0% / +0% / +12% |
| `choreoPackBandStrictness=0.1` | +0% / +0% / +0% / +10% | +0% / +0% / +0% / +23% |
| `choreoPackBandStrictness=1.0` | +0% / +0% / +0% / +25% | +0% / +0% / +0% / +9% |
| `pulkFrontPool=16` | +0% / +0% / +0% / +0% | +0% / -0% / +0% / +1% |
| `pulkEnvelopeMaxEffect=0.20` | +0% / +0% / +0% / +0% | +0% / +0% / +0% / +0% |

---

## 7. What this measurement deliberately does NOT answer

**FAIRNESS.** Not one number here is a fairness number, and that is on purpose. **D11 binds the dial
to the gate — each of the three stages must pass on its own or that stage does not ship** — and a
gate run is a different, heavier instrument against the thresholds in `docs/FAIRNESS.md`. Reporting a
partial fairness figure beside an action figure would invite exactly the comparison R16 exists to
prevent. **No default moved in this block, so nothing shipped has left the gate**; whether a given
DIAL POSITION passes it is the design block's question, one stage at a time.

**THE EYE.** R5 stands: a harness answers "did something change that must not". These numbers say
which keys move a measure. They do not say which of them a host would FEEL, and the two are not the
same question — R5a applies to whatever verdict follows.

**THE MAPPING.** D10 asked for the table, not the design. No key is recommended, no stage is defined,
no range is proposed.

**A ONE-SEED BATCH.** N=30 per arm at `--seed=1`. The top four front-window results are far outside
anything else and agree in sign across both topologies. **The finish-window numbers are much noisier**
— several flip sign between tracks at magnitudes of 10–20%, which at this N cannot be distinguished
from a different-but-equivalent race. Treat the finish column as ORDER-OF-MAGNITUDE and the
sign-agreement mark as the thing to trust.

**`gmDeadRaceShare` IS NON-DISCRIMINATING HERE** and is reported rather than quietly dropped: across
all 78 rows it takes exactly two values, 0 and 0.0333. It separates nothing at this N and should not
be read as evidence either way.

---

## 8. Verification

**Read-only measurement, so no gate applies to the product** — no default moved and nothing was
minted. What DID need verifying is the measurement passthrough of §3, and it was verified on its own
branch before a single arm ran.

**`npm run verify -- --jobs=1` on `feat/harness-cast-and-servo` — every guard green.**

| instrument | result | against the record |
| --- | --- | --- |
| `world-fingerprint` | `COMBINED dc4647be0f55ebdb` · 140.5 s | **unmoved** |
| `camera-fingerprint` | `CAMERA 0434cd0385eacc7b` · 32.8 s | **unmoved** |
| `render-fingerprint` | `RENDER 57b2eb101d806b22` · 27.8 s | **unmoved** |
| `client-suite` | PASS · 162.1 s | green |
| `script-suite` | PASS · 48.3 s | green — selected because the harness changed |
| 12 further guards | PASS | — |

*(Every value in this table is from the one run — R16.)*

**The world fingerprint is the whole permission.** `racePlanner.js` is the single product file the
passthrough touches, and its hash is byte-identical with `_heroBudget` and the `controllerParams`
thread present and unused. Reachable but inert, measured rather than assumed.

**IT TOOK TWO RUNS, AND THE FIRST ONE WENT RED — recorded because the failure mode is one this
project has now paid for three times in one night.**

The first run reported `FAIL client-suite 258.5s (ran alone)`. It did not run alone. The completion
signal for the 78-arm sweep was *"all 78 unique results exist"* — but workers that had claimed
DUPLICATE arms kept running past that point, and four sim processes were still competing when verify
started. The suite died on two `[vitest-pool-runner]: Timeout waiting for worker to respond`; **no
assertion failed**, and all three fingerprints passed unmoved even then.

**The re-run, on a genuinely idle machine, passed the same suite in 162.1 s — 96 seconds faster.**
Same tree, same command, same `--jobs=1`. That difference is the evidence; "probably contention"
would not have been. The second run's log records the competing-process count at start (zero) so the
"ran alone" claim is checkable rather than repeated.

**The lesson, stated because it generalises:** *a result-count completion signal is not a
process-exit completion signal.* The correct condition is "no sweep process remains", and the sweep's
own duplicate arms are exactly what makes the two differ.

**ONE GUARD FAILED FOR A REASON THAT WAS NOT THE PASSTHROUGH, and it is worth reporting because the
guard was right.** `check-index` flagged this report file itself as an ORPHAN — a report in
`reports/night/` with no line in `INDEX.md`. It was correct twice over: the INDEX line had not been
written yet, and the file was on the wrong branch entirely. `feat/harness-cast-and-servo` branches
from `e69af154`, *before* the seed merge, and **this block's merge permission covers the report
only** — so the report cannot live on a branch that must not merge. It was moved to a branch off
current master, and `check-index` on the passthrough branch without it **exits 0**, which turns "the
only failure was the file that left" from an argument into a measurement.

**R15e — the skips.** The 80-race acceptance sheet did not run: R15a's condition is a fingerprint
MOVING, and none did. The browser gate did not run: R15c, and nothing under `client/e2e/` changed.
`verify` printed every other skip with its own reason, and this report does not paraphrase them.
