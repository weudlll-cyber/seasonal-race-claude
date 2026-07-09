# CC REVIEW — STAGE1-KONZEPT.md

Checked against source (`racePlanner.js`, `heroCurveGenerator.js`, `storage/defaults.js`) and the frozen
Phase A/B measurements. Verdict per assumption, then the §7 challenges, then issues the concept did not
raise. **Three things must change before build; the rest is confirmed.**

## A1–A11 verdict

| # | Verdict | Note |
|---|---|---|
| A1 | ✅ confirmed at source | `racePlanner.js:85` deltas, `:461` hero strip, pack keeps it. |
| A2 | ✅ confirmed by measurement | Quotes my Phase A arm-A2 means exactly (servo-comp 0.39→0, pack÷hero 1.018→1.003, 18.4→20.5, 83.3%, 0.6 pt). |
| A3 | ✅ confirmed | A3 reach-front 78.3%, +churn; chaos wash is load-bearing. |
| A4 | ✅ confirmed | `transitionEnd:0.75` IS an independent literal (`DEFAULT_PHASE_FRACTIONS`), not derived. Anchor the new boundary to the phase structure. **Anchor to `pulkStart`** (the chaos end / where heroes generate + are stripped, `:404,449,461`) — that is the boundary the measurement used. `pulkStart` and `directorV4OutcomeStart` are BOTH 0.25 by default but are independent constants; if `directorV4OutcomeStart` is later raised (allowed to 0.55), they diverge and only the `pulkStart`-anchored cut is measured. Pick `pulkStart` and say so. |
| **A5** | ⚠️ **partially wrong — challenge** | `bonusFadeDuration`/`_areaBonusFadeDuration` DO become functionless (only the fade ramp `:391` reads them). **But `transitionEnd` does NOT** — it survives as (1) the `corridorStart ?? transitionEnd` fallback (`:156`) and (2) the exported `transEndFrac` (`:616`). Under v4 the fallback is shadowed (corridorStart is set to v4OutcomeStart, `:144`) but it is still live for the non-v4 / unset-corridorStart path. So: report `bonusFadeDuration` as dead; report `transitionEnd` as **losing its areaBonus role but retaining a corridorStart-fallback role** — do NOT list it as fully functionless, and do not let a later cleanup delete it without fixing `:156`. |
| A6 | ⚠️ **confirmed with a scope caveat** | Numbers correct (~50%→83%, ~70%→77%), BUT measured on the deepest **B1-target PACK racer** (the observer), not a formally-cast v4 hero. Proof: at `strictness 0` reach-front collapsed to 57% — that only happens to a *pack* racer (heroes use strictness 1.0, `:494`). A properly-cast hero (strictness 1.0, authored curve to B1) should climb **≥ as reliably**, so 83% is a fair LOWER bound — but Stage 1 is the **first real test of the cast-deep-HERO path**. Change "verified by measurement" → "verified by a pack-racer proxy; hero path inferred ≥." |
| A7 | ✅ confirmed | strict 0.5 keep; 0.25 rePass 7.5→5.4; 0 breaks (reach-front 57%, band 77%). |
| A8 | ✅ confirmed | `closeFront ≈ 1.09` every arm; servo-limited. The malus is the only remaining in-envelope lever — correct. |
| A9 | ✅ confirmed at source | `b1Cluster=2`, `nextCluster=min(b1Cluster, BAND_EDGES[0])` (`:374-375`) → rank 1 never assigned. |
| A10 | ✅ confirmed at source | `clampIntensityToBudget` (`:147-156`) reduces the GLOBAL intensity from the WINNER's feasibility alone → per-hero replacement is right. |
| A11 | ✅ confirmed | `sameBandSwap` throws on cross-band (`:116-120`). Caveat below re: the front-fader. |

## §7 challenges

1. **A5 — functionless?** See above. `bonusFadeDuration` yes; `transitionEnd` no (corridorStart fallback `:156` + exported `transEndFrac` `:616`). Report both accurately; block any blind deletion.
2. **A10 — per-hero feasibility + honest minimum excursion.** Per-hero is right. The minimum visible excursion should be defined in the **eye-metric** terms of §3, not places: a hero worth casting as a deep charger must be able to (a) sit ≥30% field-depth through the establish window AND (b) finish ≤ rank 5 AND (c) clear ≥6 **held** overtakes — all feasible within `[0.85,1.10]` at this field's density. If not, recast or cast none. A "shallow but ≥ threshold" journey is only honest if it still clears (a)+(b)+(c); anything less is the one-place dip A10 forbids. Do NOT pick the threshold from net places.
3. **§2.3 — gentle lever from curves, or servo cap?** **No new cap needed.** The servo already clamps to `[0.85,1.10]` (`:514`) and a **1-rank** error yields `1 + 2·(1/40) = +5%` — F4's gentle lever falls out for free; a −1.2-rank error gives F4's −6% leader-brake. The risk is authoring curves that cross too *steeply*: a ≥2-rank instantaneous differential pins one hero at +10% and the other at −15% = the flicker F4 warned against. So the requirement is on the **generator**: bound the instantaneous cross-rate to ≈1 rank per servo-settle (`trajectoryTransitionDuration ≈ 1 s`), NOT a new servo cap (that would be redundant machinery over the existing clamp).
4. **§2.5 — anchor zones: existing primitives or new machinery?** Existing. The servo already blends `error = strictness·rankError + (1−strictness)·bandError` (`:512`) and `getAreaBounds` already yields a band `[lo,hi]`. A zone-follow = give the hero strictness < 1 and steer by bandError against a **time-varying** zone. Reuse, not new machinery — BUT it needs two small changes: the generator must emit a zone width per progress (a curve of `[lo(t),hi(t)]`, not a point), and the controller must apply bandError against that moving zone. Confirm as "reuse the strictness/bandError blend," and scope those two changes explicitly so it does not grow into a zone subsystem.
5. **§4 — v4-ON auto-disabling the reactive director: Stage 1 or separate? → MUST be Stage 1 (upgraded from optional).** This is the biggest finding. Every Phase A/B cell ran with `--governorDirectorEnabled=false`. The shipped default is `true` and independent of v4 (`defaults.js:303,318`), and it still writes `governorMult` into the t-update alongside the v4 servo. **So shipping v4 with the governor ON is an UNMEASURED configuration** — the frozen A2 numbers (band-reach, headwind, churn) do not describe it. This is not "removes a confound from later measurements"; it is **required for shipped == measured.** Fold the coupling into Stage 1 (force `governorDirectorEnabled=false` whenever `directorV4Enabled`), or every Stage-1 gate is measuring the wrong world.
6. **Anything in §2 not goal-directed?** Two small ones. (a) §2.3 "one lead change per 8–15 s" must be scoped to the **late front-contest window** (~outcomeStart→0.97), not the whole race, or it over-authors. (b) §2.4 front-fader: it finishes in a LOWER band while visiting the front, so it crosses B1 heroes mid-race — author it as a **solo curve**, never via `sameBandSwap` (which throws cross-band, `:120`). The endpoint multiset is still preserved (A11 holds), but the generator path matters.
7. **Staging — is separating the malus into Stage 2 right? → YES, strongly.** My data is the argument: traffic-frac is **flat across every arm and every strictness** (~0.5 open, 0.67–0.71 searound) — the Stage-1 levers are provably **orthogonal** to the traffic wall. So casting + curves + bonus-scope are independently testable (the narrow Stage-1 eye question survives churn), and the malus targets a wall nothing in Stage 1 touches. Clean separation of variables. Keep it.

## Issues the concept did not raise

- **I1 (build-fidelity): implement A2 as an INSTANT cut, not a fade.** The measured A2 zeroed the bonus instantly at the chaos boundary (the phase-split rescale sets `areaBonusMult=1.0` from `pulkStart`, no ramp). If the build re-anchors the existing `easeInOutCubic` fade to `pulkStart` instead, the bonus lingers ~1.5 s past 0.25 = unmeasured (and pointless). Cut it, don't fade it.
- **I2 (scale gap): the depth table is 40-racer-only.** A6/§2.2 express depth as a field fraction, but reach-front (83%/77%) was measured at **40 racers**. On a ~100-racer open track a 50%-back cast = ~50 ranks of traffic to clear (2.5× more), and the traffic wall — the dominant churn source (A8) — scales up with it. The field-fraction is position-invariant but NOT climb-difficulty-invariant. Re-measure depth feasibility at the large-field count before trusting the table there; flag ~100-racer open tracks as unverified.
- **I3 (eye-metric wiring): §3's "held overtake" already has a half-built observer.** The Phase-A/B sim already counts re-passes (a passed racer getting back ahead). The "still ahead N s later" refinement is a small extension of that, not new machinery — reuse it so the Stage-1 eye-metrics and the measurement tool share one definition.

## Bottom line

Confirm A1, A2(±scope note), A3, A4, A7, A8, A9, A10, A11. **Fix A5** (transitionEnd is not fully dead).
**Re-scope A6** (pack-proxy, not the hero path). **Three must-dos before/with build:** (1) §4 governor
coupling is mandatory in Stage 1, not optional — else shipped ≠ measured; (2) implement the bonus-off as
an instant cut anchored to `pulkStart`; (3) treat the depth table as 40-racer-only and re-measure at ~100.
The staging (malus → Stage 2) is correct and my data backs it. Nothing else in §2 blocks the build.
