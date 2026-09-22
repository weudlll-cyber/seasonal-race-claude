# HERO-STRICTNESS-1 — the unmeasured middle of the range, measured. No arm survives.

**Branch `feat/hero-strictness-1` off master `74378e6b`. 2026-09-22. ★★ NOTHING MINTED, NOTHING
MERGED.** The key defaults to today's behaviour and all four fingerprints are unmoved at that
default, measured rather than asserted.

**THE QUESTION.** `racePlanner.js:1434` blends `error = strictness·rankError +
(1−strictness)·bandError`. For CAST racers `:1374` pinned strictness to the literal **1.0** — the
exact drawn place, band weighted zero. Both ends of that range were already known; nothing between
them had ever been measured for the cast. This block measured the middle.

**THE ANSWER, IN ONE SENTENCE.** The middle behaves exactly as Lesson 178 predicts: loosening the
pin **does nothing for the owner's breakaway** (15.0% against 16.0%, p = 0.82) and **costs front
action** (in-window lead changes −15.3%, sign test p = 0.0001). **No arm survives**, the services
stay on master, and the range is now measured end to end rather than known only at its two ends.

---

## ★ THE TABLE — every number carries its N

Stage 1 screened five arms at N=30; only S85 qualified for stage 2 at N=300. Arms are compared only
against the control at the same N. Shipped world otherwise: `quiet`, the gap brake ON at its shipped
values, ten tracks, 40 racers, the owner's roster, the fixed `[0.70, finish]` window, his 157.05 px
threshold.

| arm | N | **his breakaway share** | **lone-leader** | **band arrival** | peak gap med / p90 / max (px) | lead changes whole / in-window | distance from drawn place, cast / pack |
|---|---|---|---|---|---|---|---|
| **S100 = 1.0, the CONTROL** | 30 | 6/30 = **20.0%** | 0/6 = 0% | 88.23% | 115.7 / 177.9 / 203.9 | 58 / 3 | 2 / 2 |
| S85 = 0.85 | 30 | 3/30 = 10.0% (p 0.47) | 0/3 = 0% | 88.47% (+0.25) | 120.9 / 161.1 / 164.1 | 56 / 2 | 2 / 2 |
| ★ S70 = 0.70 | 30 | 3/30 = 10.0% (p 0.47) | **1/3 = 33%** | **87.44% (−0.79)** | 114.8 / 167.4 / **285.0** | 56 / 2 | 3 / 2 |
| S50 = 0.50 | 30 | 7/30 = 23.3% (p 1.00) | 0/7 = 0% | 89.92% (+1.70) | 122.3 / 165.6 / 221.8 | 56 / 2 | 2 / 2 |
| S00 = 0.00, the REFUTED anchor | 30 | 9/30 = **30.0%** (p 0.55) | 1/9 = 11% | 89.57% (+1.35) | 115.9 / 178.2 / 192.0 | 56 / 2 | 3 / 2 |
| | | | | | | | |
| **S100 = 1.0, the CONTROL** | **300** | 48/300 = **16.0%** | 8/48 = 16.7% | 89.23% | 111.3 / 167.2 / 267.9 | 54 / 2 — **760 total** | 2.610 / 2.303 |
| **S85 = 0.85** | **300** | 45/300 = **15.0%** (**p 0.82**) | 6/45 = 13.3% (p 0.78) | **90.49% (+1.26)** | 117.3 / 166.8 / 247.8 | 54 / 2 — **644 total** | 2.477 / 2.307 |

Distance from the drawn place is the median |finishRank − drawnRank| per race; at N=30 the
per-race medians are integers, at N=300 the column is their mean over 300 races.

---

## 1 · THE CONTROL VALIDATES ITSELF, FOR THE THIRD TIME

**48 of 300 = 16.0%**, which is BREAKAWAY-COUNT-2's 16.0% to the digit and the same figure
GROUP-BRAKE-SWEEP-1's control returned. Three harnesses, one number. The baseline is the owner's own.

## 2 · ★★ THE SHARE DOES NOT MOVE — S85's STAGE-1 GAIN WAS NOISE, AGAIN

At N=30 S85 gave 3 of 30 against the control's 6 of 30 and looked like a halving. At ten times the N
it is **45 against 48, Fisher two-sided p = 0.822.** Nothing.

★ **That is the second time this week the rule has paid for itself.** The group brake's stage-1 arm
also looked like a large improvement at N=30 and came back 46/300 against 48/300. An N=30 arm inside
its interval is UNDECIDED, never "better", and both blocks reported it that way rather than as a
headline.

## 3 · ★★ AND IT COSTS FRONT ACTION — LESSON 178'S PREDICTION, COMING TRUE ON SCHEDULE

**In-window lead changes fall 760 → 644, −15.3%.** Paired race by race on the same seeds: S85 has
**fewer in 134 races, more in 76**, equal in 90 — a **sign test z = 4.00, p = 0.0001.** Whole-race
lead changes fall too, 16355 → 16178, and top-5 position changes inside the window are flat to
slightly down (20.97 → 20.53 per 1000 frames, −2%).

★ **The brief asked for this to be reported as such, and it must be.** Lesson 178's rule is
*"AUTHOR scenarios, do not liberate constraints — liberation reduces the very thing it feels like it
should increase."* That lesson was built on two liberations at strictness 0 and on a universal
band-arrival that cost −6% action. **This block loosens the pin by 15% rather than removing it, on
the cast only, and the effect is the same in sign and larger in size than the universal arm's.** The
prediction did not merely survive a new test; it survived at a setting nobody had tried.

## 4 · THE ONE THING THAT IMPROVED, AND WHY IT DOES NOT RESCUE THE ARM

**Band arrival rises on all ten tracks** — pooled 89.23% → 90.49% (+1.26 pp), **0 of 10 tracks below
the control**, and the worst track is still +0.18 pp:

| track | S100 | S85 | Δ pp | | track | S100 | S85 | Δ pp |
|---|---|---|---|---|---|---|---|---|
| city-circuit | 88.58 | 89.34 | +0.77 | | mountainstreet | 89.74 | 89.92 | +0.18 |
| dirt-oval | 87.05 | 89.08 | +2.03 | | river-run | 87.87 | 89.68 | +1.80 |
| garden-path | 89.40 | 89.59 | +0.19 | | searound | 88.06 | **91.29** | **+3.22** |
| ice-track | 90.55 | 91.81 | +1.26 | | seatrack | 89.60 | 91.63 | +2.03 |
| luger-hill | 91.20 | 91.79 | +0.59 | | space-sprint | 90.27 | 90.77 | +0.50 |

This was the metric §E named as **most at risk** — loosening the pin was expected to stop racers
reaching their drawn bands. It did the opposite, and the reason is visible once stated: a racer
steered toward his *band* rather than to one exact place inside it is being steered at the thing the
gate measures. The cast also ends **closer** to its drawn place on average, not further (2.610 →
2.477), while the pack is untouched (2.303 → 2.307) — the control the key must not move, and it
did not.

★ **It does not rescue the arm.** The fairness gate is a **constraint, not the goal**: an arm must
hold it, and holding it more comfortably buys nothing when the arm does nothing for the breakaway
and costs 15% of the front's lead changes. Trading action for band arrival is the wrong direction —
it is what a scripted race looks like, and the project's whole difficulty is that the servo is
already fair and already too scripted.

## 5 · WHY THE OTHER THREE ARMS WERE DROPPED AT N=30

- **S70** failed **twice**, and either alone was enough under the decision rules: it **raised the
  lone-leader share** (0 of 6 → 1 of 3) and **dropped band arrival** (−0.79 pp, the only arm that
  did). It also owns the largest peak gap in the sweep, **285.0 px** against the control's 203.9 —
  the same direction as the 3.3× that got strictness 0 removed in 2026-09-13.
- **S50** does not beat the control on the share at all (23.3% against 20.0%), so it never qualified
  whatever its band arrival did.
- **S00**, the refuted anchor, is the **worst arm at 30.0%** — which is what an anchor is for. It
  was never a competitor; it calibrated, and the calibration agrees with
  `ARRIVAL-STEERED-AGAIN-1` and `BAND-SLACK-1`.

★ Nothing here is decided at N=30 — every Fisher p is ≥ 0.47. The rules screen on direction and on
the two hard gates, and only S85 passed the screen.

---

## 6 · ★★ THE REACHABILITY GUARD — THE PART THAT MATTERS MOST

Two mechanisms in the two days before this one were measured as five and two arms of plausible
numbers while being **unreachable**. So this block proved the key moves the race *before* any arm
was read:

1. **Two smoke races** before the sweep, strictness 1.0 against 0.5, same seed and track:
   `8f448a19023dc002` against `40058b9db190a5ca`.
2. **The harness THROWS, it does not warn.** Every race is hashed on finishing order and times; two
   arms agreeing on *every* race abort the run. Compared per race, because two arms may legitimately
   agree on one — what is forbidden is agreeing on all of them.
3. **The throw is proven, not assumed.** Sabotaging the harness so the key never reaches the world
   makes it fire in its own words: *"ARMS S100 AND S85 ARE BYTE-IDENTICAL ON ALL 1 RACES"*. A guard
   that has never fired is not a guard.
4. **Stage 1 passed it in its strongest form: all TEN arm pairs differ on all 30 of 30 races.**
   Stage 2: 300 of 300.

**THE SIX PLAN-BUILDING SITES, listed rather than assumed** — a key in `defaults.js` read in
`racePlanner.js` is still unreachable until every one of them copies it:

| site | line |
|---|---|
| `client/src/modules/raceCore.js` — **the REFERENCE the parity mirror checks** | 315 |
| `scripts/parity/goldenRunner.mjs` — `browserPlanConfig` | 359 |
| `scripts/parity/goldenRunner.mjs` — `simPlanConfig`, the arm the parity guards actually run | 438 |
| `scripts/sim-fairness.mjs` — both plan configs, plus a CLI constant at 436 | 4471, 5857 |
| `scripts/diag/acceptance-orders.mjs` | 122 |
| `scripts/diag/micro-divergence.mjs` | 173 |

BLIND-SITE-1's parity mirror is green, which is the structural proof that list is complete rather
than my word for it. The key is defined at `defaults.js:1058`, held at `racePlanner.js:336`, read at
the blend at `:1380`, and validated at `raceDynamicsConfig.js:200`.

## 7 · ★ THE SCOPING DECISION — THE KEY STOPS AT THE B2 ATTACKER

Replacing the literal would otherwise have reached the B2 attacker's **orchestrated phase** — the
authored climb to `peakRank` and steered fall to `finalRank`. That is a different, already-shipped
mechanism: Lesson 178 measured it at **+21% top-5 action**, and it is the *authoring* success that
same lesson contrasts against the liberations that failed. Loosening it would also have confounded
the sweep by moving two things at once. `racePlanner.js:1393` therefore pins the attacker to 1.0
explicitly, and two tests assert that population is byte-identical at every value of the key. It is
also the one cast role that **already** has band treatment — its spatial release, free inside the
band and re-steered outside it.

## 8 · TESTS, AND A FAILED SABOTAGE THAT WAS MY TEST'S FAULT

`client/src/modules/heroStrictness.test.js`, 8 cases, fixture reused from `arrivalShape.test.js`
rather than rebuilt, noise pinned to zero so the assertions read the blend and not the servo's
jitter. Two sabotages, each landing on its named test: **ignore the key and use the literal 1.0** →
2 red; **apply the key to the pack as well** → 1 red.

★ **Sabotage 2 failed the first time, and the test was wrong, not the sabotage.** The pack witness
was an arbitrary index whose error was large enough to **clamp against `maxMult` at every
strictness**, so two different blends produced one identical command and the test proved nothing. A
failed sabotage is not a finding. The witness is now *chosen* — racer 9, drawn 2nd and standing 4th,
inside his band with a small unclamped error, the one shape where the two halves of the blend
disagree — and the test first asserts he is actually steered, so "unchanged" cannot be vacuous.

**One guard caught my own edit:** inserting the plan key pushed `_choreoSuppressChaosBonusB1` out of
the line range `docs/FORCE-MAP.md` cites, and `check-fallback-agreement` RULE F said so. Repointed
to L336-L341. That is the guard working, and it is why the full script suite is run.

---

## THE RECOMMENDATION — a recommendation, not a decision

**No arm survives, and I recommend shipping none of them.** S85 was the only arm to pass the N=30
screen and at N=300 it leaves the owner's breakaway share untouched (15.0% against 16.0%, p = 0.82)
while costing 15.3% of the front's in-window lead changes at p = 0.0001; the band-arrival gain it
does deliver is a constraint being held more comfortably, not the goal being met.

★ **What this block bought is not a mechanism, it is a closed question.** The range was known only
at its two ends — 1.0 shipped, 0.0 refuted — and the middle is now measured at four points on the
owner's own fixture. Lesson 178's rule holds at every one of them, including a setting only 15% off
the shipped pin. **Nothing in this file proposes what to do instead; that is the owner's next
decision.**

**The services stay on master** — nothing here is worth an eye-test, so 4173, 5173 and 4000 are
untouched, on master `74378e6b`.

---

**Fingerprints re-measured at the branch tip and all four unmoved at the default** — `world
b6cfd1daf1756f61`, `world-off 744bec11644978bb`, `camera 0102dd2eab95b71f`, `render
ec817639269a8a4e`. Full client suite 264 files / 4733 tests green; script suite 598 green.
**★★ DO NOT MERGE. DO NOT MINT.**
