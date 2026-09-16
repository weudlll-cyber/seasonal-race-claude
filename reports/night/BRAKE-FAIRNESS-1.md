# BRAKE-FAIRNESS-1 — the fairness run the gap brake has never had: the instrument's own verdict is FAIR on both arms

Branch `feat/gap-leader-brake`. Date: 2026-09-16. **The instrument was not modified. Nothing minted,
nothing merged.** The owner's store was not opened.

---

## ★ THE SHORT ANSWER

**The project's own fairness instrument returns the same verdict on both arms: FAIR.** At the pinned
methodology — 300 races per track pooled, ten tracks, 40 racers — the gap brake at the owner's
settings changes **nothing** the instrument measures as fairness:

| | shipped (brake OFF) | **brake ON** (90 px / 0.95 / 10%) |
|---|---|---|
| races | **3,000** | **3,000** |
| band reach, mean across tracks | 89.3% | **89.2%** |
| band reach, worst track | 86.0% (river-run) | **86.1%** (river-run) |
| **the gate: band reach ≥ 70%** | **PASSES on 10/10** | **PASSES on 10/10** |
| **the gate: Holm-flagged start-row rows** | **0 of 30** | **0 of 30** |

★★ **Both arms clear the project's gate, and by the same margin.** The brake does not buy fairness and
does not cost it.

---

## THE INSTRUMENT, AND THE N

**`scripts/sim-fairness.mjs`, unmodified**, invoked per track with its own flags:
`--track=<id> --racer=<the track's own defaultRacerTypeId> --racers=40 --races=100`.

**N against the pinned methodology.** The project pins **300 races per track, pooled**. The instrument
runs each track at three distance variants (30 s / 60 s / 120 s) and `--races` is *per variant*, so
`--races=100` is **100 × 3 = 300 races per track — the pinned N exactly**. Ten tracks, two arms:
**6,000 races**. ★ **This is the full pinned gate, not a short run.**

**Each track ran its own `defaultRacerTypeId`**, read from the seeds rather than hardcoded:
city-circuit/motorbike, dirt-oval/horse, garden-path/beetle, ice-track/snowmobile, luger-hill/luge,
mountainstreet/boarder, river-run/duck, searound/manta, seatrack/dolphin, space-sprint/rocket.

**The world.** No `--config` was passed, so both arms ran the **shipped defaults** and the instrument
labels that world `ASSUMED-DEFAULTS · PROVISIONAL`. I label it the same way. **The owner's store was
not opened**, so this does not claim to describe a world he has tuned in the dev screen.

**The arms differ only in `gapBrakeEnabled`.** The brake arm is a probe copy of the same commit with
that one default flipped; **V1 is OFF in both** (`servoNoiseBlindEnabled: false`), so this measures
the brake **alone**.

---

## ★ WAS THE BRAKE ACTUALLY EXERCISED?

A verdict from a run where the mechanism never fired is worth nothing, so this was checked two ways
rather than assumed.

**1. The races differ.** Every one of the **30 of 30** track × distance combinations produced a
*different* start-row outcome on the two arms. Had the brake never acted, the arms would have been
identical — which is exactly what they were before BLIND-SITE-1, when the instrument could not see the
brake at all.

**2. The firing count, from a tally inside `_computeGapLeaderBrake`.** In a repeat of one track
(searound / manta / 40, `--races=100`, the identical settings) with the tally added to a probe copy:

| calls to the brake | carried `pathLengthPx` | **enabled** | **FIRED (issued a command)** |
|---|---|---|---|
| 1,276,286 | 1,276,286 (100%) | 1,276,286 (**100%**) | **117,597 (9.2%)** |

★★ **The brake issued a command 117,597 times inside a fairness run at these exact settings.** The
verdict above is therefore a verdict on a race the brake was actually acting in.

★ **Before BLIND-SITE-1 the same tally read `enabled=0, FIRED=0`** — the instrument could not fire the
brake once in 2.26 million opportunities, so any fairness verdict it gave about the brake was a
verdict about a mechanism that was not running (see [BLIND-SITE-1](BLIND-SITE-1.md)). **That is why
this run had never been possible before tonight.**

---

## PER TRACK

| track | shipped: band reach | smallest p | **brake ON: band reach** | smallest p |
|---|---|---|---|---|
| city-circuit | 89.4% | 0.086 | **89.9%** | 0.192 |
| dirt-oval | 89.5% | 0.439 | **89.8%** | 0.156 |
| garden-path | 89.7% | 0.746 | **90.0%** | 0.188 |
| ice-track | 89.5% | 0.260 | **89.4%** | 0.118 |
| luger-hill | 89.7% | **0.031** | **89.6%** | 0.068 |
| mountainstreet | 89.5% | 0.068 | **88.8%** | 0.556 |
| river-run | **86.0%** | 0.319 | **86.1%** | 0.228 |
| searound | 89.9% | 0.296 | **89.0%** | 0.151 |
| seatrack | 89.4% | 0.147 | **90.1%** | **0.026** |
| space-sprint | 90.0% | 0.166 | **89.7%** | **0.008** |

Band reach moves by at most **0.9 percentage points** on any track, up on five and down on five —
noise, not a direction.

---

## ★ THE START-ROW TEST, AND WHY THE RAW p-VALUES ARE NOT FINDINGS

The instrument runs a chi-squared test per combination: H0 = every start row wins equally often.
**The project's gate is Holm-corrected, not raw p** — and that distinction decides this section.

| arm | rows at raw p < 0.05 | **Holm-flagged (the gate)** | smallest p | Holm bar (α/m, m = 30) |
|---|---|---|---|---|
| shipped | 1 | **0 of 30** | 0.0312 | 0.00167 |
| brake ON | 2 | **0 of 30** | 0.0079 | 0.00167 |

The raw-only rows, named so they are not discovered later and mistaken for a finding:

| arm | row | p | chi² | rows |
|---|---|---|---|---|
| shipped | luger-hill 60 s | 0.0312 | 10.60 | 5 |
| brake ON | seatrack 120 s | 0.0260 | 7.25 | 3 |
| brake ON | space-sprint 30 s | 0.0079 | 9.71 | 3 |

★ **In 30 comparisons at α = 0.05 you expect about 1.5 by chance.** The shipped arm produced 1 and the
brake arm 2. **Neither clears the Holm bar**, and reporting "the brake has 2 unfair rows against
shipped's 1" would be inventing a stricter gate than the project's. ★ Note the shipped arm has one
too: it is a property of the shipped world, not of the brake.

---

## DOES ANY RACER TYPE, ROW OR ROLE SYSTEMATICALLY GAIN OR LOSE?

**No, on this evidence.**

- **Start row** — the start-row test above is exactly this question, per row, per combination. **0
  Holm-flagged on both arms.**
- **Racer type** — each track ran only its own default type, so type and track are confounded by the
  methodology's design. What can be said: **no track's band reach moves by more than 0.9 points**, and
  the moves go both ways. ★ **This run cannot separate racer type from track**, and saying so is
  better than implying it could.
- **Cast role (B1–B5 bands)** — band reach is the instrument's own per-band measure and is within a
  point on every track. The brake acts only on whoever is *leading* inside [0.60, 0.95], which is not
  a role the cast assigns.

---

## WHAT THIS DOES NOT SETTLE

- **The world is ASSUMED-DEFAULTS**, as the instrument itself warns. If the owner's store carries
  tuned dynamics, this does not describe his race.
- **Fairness is not the same question as whether the brake is worth having.** That is
  [BRAKE-WINDOW-2](BRAKE-WINDOW-2.md): the worst in-window race goes 244.4 → 227.6 px at 1000 ms, and
  neither abruptness measure moves at all.
- Racer type and track cannot be separated here (above).
- N = 3,000 races per arm, which is the pinned gate. It is not larger than the pinned gate.
