# ACTION-BUILD-7 — the owner's finale cast (final-draw for all)

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC.** Built the owner's original design
density: **final-draw for all** (the ship's finale engine — the last-reroll tempo differences that persist to
the line — AUTHORED as per-band late crossings for every uncast racer), **finale-resolving arc variants**
(multiple/race), **band-duels as a real family across bands**, the **low/default/high density curve**, and
**negative-space** (one calm band). Frozen runtime budget (ripcord 1) held: everything added is authored
curves, admission-side — **no new runtime force**. Situational rule held (no topology/name reads). Flag-gated
`--finaleCast` (default off). **OFF fingerprint `7c70b1eae7d31e22`** (asserted on the final committed state).

## VERDICT (read first): density DELIVERED; screen STOPPED per protocol
The finale cast **meets the owner's density brief spectacularly** (~3× the target) and is band-fair and
endpoint-exact — **but the decisive Stage-B dead-finale-vs-Ship screen FAILS on BOTH weak tracks**, so per
the SPEC ("if the screen fails both tracks, stop and report") the run **stopped before Stage C**. The honest
finding: **story density is not the same thing as dead-finale reduction** — 32 authored finale stories per
race did not lower the P1 dead-finale, and on ice-track they raised it.

---

## 1. STORY DENSITY (target 1 + 5) — the number the owner asked for, MET

**Per-race finale-story density** (racers with a ≥1-place authored move in the last 30%), field 40:

| slider | finaleStories (mean) | final-draw racers | band-duels | storied racers | target |
|---|---|---|---|---|---|
| **low** | **23.1** | 13.1 | 6.5 | 24.5 | ≥10 |
| **default** | **32.4** | 20.6 | 10.3 | 34.1 | ≥10 |
| **high** | **35.5** | 17.6 | 8.8 | 37.9 | ≥10 |

- **Target 1 (≥10 story racers at default): MET ~3×** — and met at *every* slider stage. On the two screen
  tracks the per-race distribution was **searound 32.3 (min 26, max 39, 0/25 races < 10)** and **ice 32.1
  (min 24, max 38, 0/25 < 10)** — not one race fell below 10.
- **Target 5 (density monotone with slider): MET** — finaleStories rises low→default→high (23→32→36). (The
  `final-draw` component dips at `high` because more racers are consumed by the raised arc quotas first — but
  total story density still rises, since arcs are stories too.)
- **Exposure stays per-racer-bounded: exposureMax = 1** on every track/stage — each racer carries at most one
  authored story, so no racer is a puppet all race (the owner's constraint).
- **Band-duels are a real family** (10.3/race at default, across multiple bands — not the old 0.8/race), and
  the **final-draw is ungated**: on searound (5 lanes, lateral budget 0) it still produced **23.6 final-draw
  racers / 11.8 band-duels** — the narrow-track finale engine runs where lateral cannot (target 2 + 4).

## 2. STAGE B SCREEN (the decisive numbers) — searound + ice-track, N=25 @60s

| track | ship dead | NIGHT-1 (B15clrD) dead | **BUILD-7 (finale cast) dead** | band | density |
|---|---|---|---|---|---|
| searound | 8 | 12 | **12** (+4 vs ship, = NIGHT-1) | 75% | 32.3 |
| ice-track | 12 | 24 | **32** (+20 vs ship, +8 vs NIGHT-1) | 72% | 32.1 |

- **searound: the final-draw did NOT carry it.** Dead stayed **12** — identical to the NIGHT-1
  substrate-handback (which runs *zero* scripts there). 32 authored finale stories bought no dead-finale
  reduction, and lead-changes were slightly *lower* than the bare substrate (1.72 vs 2.00). FAIL.
- **ice-track: the finale cast made it WORSE** — dead **32** vs NIGHT-1's 24 and ship's 12. ice reads 10 lanes
  (full budget), so it runs the lateral scripts AND the final-draw for all; the extra authored crossings
  over-saturate the 10-lane closed finale. FAIL.
- **Both fail ⇒ STOP** (Stage C — the 4-track × 3-slider dead/LAW/band curve — was not run).

**Why density ≠ dead-finale (the mechanism):** dead-finale measures *P1 uncertainty* — a leader genuinely in
doubt near the line. The final-draw authors an *endpoint-exact, deterministic* crossing (the leader is
"known" — it resolves to the fixed draw), so a front-band swap is one clean authored lead change, not the
noisy P1 flutter Ship's re-roll produces. More visible mid-field action (density), same-or-fewer P1 dead
finales. This RE-CONFIRMS the NIGHT-1 earned-KILL: reducing dead-finale on the weak tracks needs Ship's
re-roll speed-variation — a runtime force outside the frozen budget — which the admission-side cast cannot add.

### THE FIVE SENTENCES (ripcord 2 — every kept element appears)
1. Almost every racer is sorted to its drawn band by the chain (B15) and released to the fixed fair draw at
   the finish, so band-reach is untouched (2/2 ≥ 70% on the screen tracks). 2. Through the approach each band
   is bunched toward its centre and fanned to the exact rank (the proximity floor), and a seeded, row-blind
   script set — lateral families clearance-gated, longitudinal arcs (comebacker/fallbacker, now with
   finale-resolving variants) ungated — is compiled endpoint-exact through the reachability accountant and the
   one-story-per-racer exposure cap. 3. The finale cast then gives EVERY otherwise-uncast racer an authored
   finish-stretch tempo: within its band, a late crossing where the planned-slower is held slightly ahead at
   finale entry and the planned-faster passes it to the exact drawn place by the line — the ship's finale
   engine, authored, longitudinal, needing no side room, so it runs even where lanes are scarce. 4. One
   monotone slider scales how many band-duels are drawn, one band may be left calm as negative space, and the
   graded budget gates only the lateral families — all with no topology or track read. 5. The clearance reader
   and the cast move no one — they only decide which curves are written — so the runtime budget is frozen and
   the shipped world is byte-identical with the line OFF.

## PROPOSALS (own ideas ≥ 2; planner proposals evaluated)
1. **The owner's brief and the dead-finale metric have diverged — resolve it with an EYE-TEST, not more sim.**
   The finale cast delivers exactly what the owner asked for (≥10 → 32 visible stories, band-duels across
   bands, arcs that end at the line) yet the dead-finale metric is flat-or-worse, because that metric rewards
   P1 *uncertainty* which authored curves deliberately do not create. The numbers cannot decide whether 32
   endpoint-fair finale stories "watch better" than the sparse NIGHT-1 finish — this is the on-rails-feel
   question the sim structurally cannot settle. Propose an owner eye-test of the finale cast (default slider)
   vs the NIGHT-1 candidate before any further metric chase.
2. **ice-track is the over-saturation case — measure the negative-space arm there.** ice got worse because a
   10-lane closed track runs lateral + final-draw + arcs all at once. The negative-space beat (one band left
   calm, built + unit-tested this run) is the natural throttle; a one-arm N=25 screen of `--negativeSpace`
   on ice would test whether calm-as-texture recovers it, admission-side, no force.
3. **If the density is kept, the dead-finale metric should be retired for this line in favour of a
   density+variety+band-fairness triple.** dead-finale has driven the line toward Ship's re-roll (a force);
   with density now solved, the honest scoreboard is (stories ≥ 10) × (band-reach 4/4) × (H_script high) —
   all of which the cast passes — plus an eye-test, not the P1-uncertainty proxy.

**Planner proposals, evaluated honestly:** (1) *final-draw tempo per band with a late-cross bias
(pace-order generalized to all bands)* — **BUILT; it IS the final-draw mechanism**, and it delivers the
density + band-duels, but the crossings being endpoint-exact is exactly why they don't move the P1-uncertainty
dead-finale metric. (2) *one negative-space beat per race* — **BUILT + unit-tested** (`--negativeSpace`, one
seeded band kept calm), but not measured in the dead screen (proposal 2 above is the test).

## Owner questions
1. **Eye-test the finale cast vs NIGHT-1** (density is delivered; the metric can't settle "looks better")?
2. **Or run Stage C anyway** (4 tracks × 3 sliders, the full density/action/fairness curve) despite the
   screen stop — to see the curve on the wide tracks where the cast is not fighting scarce lanes?

---
**Branch `exp/chain-choreo`.** OFF fingerprint `7c70b1eae7d31e22` (== baseline, final committed state; the
cast is admission-side + flag-gated). Commits: Stage A build `3404aa2`, Stage B screen `84797b0`, this report.
Tests: 141 pass (8 new: density ≥10, slider monotonicity, final-draw endpoint invariance, band-duels across
bands, arcs-at-line, exposure bound, negative-space, finaleCast-ungated). Data:
`reports/evolution/chain-ablate-data/b7-screen.txt`. **Stage C not run (screen stop).** Push verified — see
`git log origin` confirmation with the final commit.
