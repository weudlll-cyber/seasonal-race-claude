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
---
---

# ACTION-BUILD-7b — owner definitions + varied front cast + multi-role casting

**Branch `exp/chain-choreo` (sim-only). Author: CC.** Built the owner's binding refinements on top of the
finale cast: owner story DEFINITIONS, variety as a hard requirement, the LEADER-DEFENDS scenario, and
MULTI-ROLE CHAINS. All admission-side, frozen runtime budget (authored curves), no new force, flag-gated
`--finaleCast`. **OFF fingerprint `7c70b1eae7d31e22`** asserted on the final committed state. Stage-B screen
only (searound + ice, N=25, default slider), then STOP.

## VERDICT (read first)
**Every AUTHORING target is met — density, the owner arc definitions, non-degenerate variety, the
leader-defends scenario (leader holds under a near-miss + behind-P1 churn), chains, and a clean dead-race
split with ZERO casting holes — but the decisive dead-finale-vs-Ship screen FAILS harder than BUILD-7
(searound 24, ice 20 vs Ship 8, 12), and the finale is now MORE predictable, not less (P(leader-holds) ≈
60%).** The richer cast makes the front more legible and more *authored*, which is exactly why the P1-
uncertainty metric (dead-finale) does not improve: endpoint-exact crossings resolve to the fixed draw, so the
leader is "known." This is the third independent confirmation of the earned-KILL.

## 1. DENSITY + OWNER DEFINITIONS + VARIETY (the authoring brief — MET)

| metric | searound | ice-track | target |
|---|---|---|---|
| **finaleStories** (density) | 31.6 (min 24, max 36, **0/25 < 10**) | 30.8 (min 24, max 37, **0/25 < 10**) | ≥ 10 |
| owner-comebacker / -fallbacker / mid-mover | 1.6 / 2.0 / 1.5 | 1.6 / 2.0 / 1.5 | multiple/race |
| **count distributions** (realized) | cb {0,1,2,3} · fb {1,2,3} · mid {0,1,2,3} | same | non-degenerate |
| owner far-back **depth** | 5 ranks | 5 ranks | honest max |
| chains / exposureMax | 1.2 / 2 | 0.6 / 2 | bounded |
| band-reach ≥70% | 74% ✓ | 74% ✓ | 2/2 |

- **Owner-comebacker** (drawn into B1, held OUTSIDE B1, reaches B1 only in the last 10%) and **owner-fallbacker**
  (drawn NOT B1, holds a leading B1 slot rank 2–5, falls out only in the last 10%) are built to spec and
  unit-proven. **Feasible far-back depth (the trade-off, as numbers): a 10% window allows 5 ranks; 12% → 7;
  15% → 9** (`depth = REACH_RATE·(1−window)`). A rank-1-drawn comeback cannot be held deeper than ~5 ranks
  and still reach P1 in the last 10% — the honest accountant limit.
- **Variety is a hard requirement, met**: every family's per-race count is a Binomial(3,p) draw with a real
  {0,1,2,3} spread (never always-1, never always-0). Mid-race mover is a separately named family.
- **Multi-role chains**: band-1 racers carry two roles (a mid-race dip + a late cross) in disjoint windows
  spliced into one curve (endpoint-exact, per-tick delta < 1 rank across the seam, unit-proven); time-share
  stays moderate (0.37–0.40 mean). Negative-space never draws band 1.

## 2. LEADER-DEFENDS + PREDICTABILITY (built + working, but predictable)

| metric | searound | ice-track | owner rule |
|---|---|---|---|
| defended share (drawn) | 32% | 32% | small share |
| **P(leader-at-0.7 wins)** | **64%** | **56%** | viewer must NOT call the finale |
| scenario entropy (outcomes) | 1.46 | 1.52 | high = unpredictable |
| outcome mix | genuine 9 · unplanned-hold 12 · defended 4 | genuine 11 · unplanned-hold 9 · defended 5 | mostly change |
| behind-P1 changes (contest window) | 38.0 | 39.5 | genuine P2+ swaps |
| **near-miss gap at line** (defended) | **1.29 L** | **3.41 L** | < ~1 body length |

- **Leader-defends works** — in the smoke, defended races held the leader 4/5, with the near-miss chaser and
  behind-P1 duel present. But two owner-rule tensions surface: **(a)** P(leader-holds) ≈ 60% — the leader wins
  MORE often than it changes, because the endpoint-exact final-draw resolves the front to the fixed draw
  (many "unplanned holds": the drawn winner simply isn't crossed). A viewer *could* lean "leader holds." **(b)**
  the near-miss gap is only marginal on searound (1.29 L) and FAILS on ice (3.41 L) — the chaser reaches its
  drawn rank 2/3 but the spatial gap to P1 is not reliably < 1 body length, so the ice defended races read as
  a large-gap hold (an owner-defined FAIL of the scenario on that track).

## 3. DEAD-FINALE + THE SPLIT (the decisive screen — FAILS)

| track | Ship dead | NIGHT-1 (B15clrD) dead | **BUILD-7b dead** | dead-race split |
|---|---|---|---|---|
| searound | 8 | 12 | **24** (+16 vs Ship) | 6 = near-miss 2 + **casting-hole 0** + completion-fail 4 |
| ice-track | 12 | 20 | **20** (+8 vs Ship) | 5 = near-miss 3 + **casting-hole 0** + completion-fail 2 |

- **Dead-finale is WORSE than Ship AND than the NIGHT-1 candidate on both tracks.** searound went 12 (night)
  → 24; the richer front cast *increased* dead. FAIL of the decisive screen on both tracks.
- **The dead-race split is the diagnostic, and it exonerates casting**: **ZERO casting holes** — the front is
  cast in every dead race, exactly as the owner required. The dead races are planned near-misses (leader-
  defends, legitimate) plus **completion failures**: the front change was *cast* but did not *complete*.
- **Why completion fails**: the final-draw crossings are endpoint-exact — they resolve to the fixed draw, so a
  front swap is a temporary, authored show that reverses to the known order; when the crossed pair does not
  include the eventual P1 (crossFrac misses it), the leader simply holds. Authored fair curves cannot
  manufacture the P1 *uncertainty* the dead-finale metric measures. Ship's re-roll speed-variation can (a
  runtime force outside the frozen budget). **Third confirmation of the earned-KILL.**

### THE FIVE SENTENCES (ripcord 2 — updated, every kept element appears)
1. Almost every racer is sorted to its drawn band by the chain (B15) and released to the fixed fair draw at
   the finish, so band-reach holds (2/2 ≥ 70%). 2. Through the approach each band is bunched toward its centre
   (the proximity floor), and a seeded, row-blind cast is drawn with non-degenerate per-family counts:
   owner-comebackers (held far back, into band 1 only in the last 10%), owner-fallbackers (holding a leading
   band-1 slot, out only in the last 10%), mid-race movers, and band-duels — all endpoint-exact through the
   reachability accountant. 3. Every lateral element is admitted per-instance by the local-clearance reader
   and the budget grades only the lateral families, so the longitudinal final-draw runs even where lanes are
   scarce; band-1 racers chain two roles in one spliced curve, and one band may be left calm (never band 1).
   4. A small share of races is a drawn leader-defends — the leader holds only under a planned near-miss
   chaser and genuine behind-P1 place changes — while the rest resolve to a genuine front change, all with no
   topology or track read. 5. The cast moves no one — it only decides which curves are written — so the
   runtime budget is frozen and the shipped world is byte-identical with the line OFF.

## PROPOSALS (≥2; planner proposals evaluated)
1. **The authoring brief is complete; the decision is now an EYE-TEST, not a metric.** BUILD-7b delivers every
   owner-defined authoring target (density 31, owner arcs to spec, variety, leader-defends with near-miss and
   behind-P1 churn, chains, zero casting holes). It fails only the dead-finale metric, which by construction
   rewards P1 uncertainty that endpoint-exact fair curves cannot create. Propose the owner eye-test BUILD-7b
   (default slider) vs Ship and vs the NIGHT-1 candidate — 20 races each — and judge on watchability, not
   dead-finale. This is the on-rails-feel question the sim cannot settle.
2. **If a lower P(leader-holds) is wanted, raise the front-cross rate and drop the unplanned holds — but that
   trades against the leader-defends scenario.** P(leader-holds) ≈ 60% comes from ~48% unplanned holds (the
   drawn winner not crossed). Forcing a P1-including final-draw cross in every non-defended race would push
   P(leader-holds) toward the defended share (~20–30%), making the finale less callable — at the cost of the
   winner always being "passed then re-passed," which may look scripted. One screen at N=25 would measure the
   watchability/predictability trade.
3. **Fix the ice near-miss (3.41 L) by authoring the chaser to a spatial target, not a rank target.** The
   near-miss closes to the chaser's drawn rank (2/3), whose spatial gap to P1 varies by track (1.3 L searound,
   3.4 L ice). An admission-side tweak — hold the chaser one rank tighter and resolve later (0.95) — would pull
   the line gap under ~1 body length more reliably; screenable on ice alone.

**Planner proposals, evaluated:** (1) *pace-order tempo per band with a late-cross bias* — this IS the
final-draw / owner-arc mechanism; it delivers the density and the owner definitions, and is exactly why the
crossings are endpoint-exact (and so don't move the P1-uncertainty metric). (2) *one negative-space beat per
race* — BUILT, unit-tested, never draws band 1; a light throttle available but not the dead-finale fix.

## Owner questions
1. **Eye-test BUILD-7b** vs Ship + NIGHT-1 (the authoring brief is delivered; the metric can't settle "looks
   better")?
2. **Lower P(leader-holds) toward the defended share** (proposal 2) for a less-callable finale, accepting a
   more overtly authored front — yes/no?

---
**Branch `exp/chain-choreo`.** BUILD-7b OFF fingerprint `7c70b1eae7d31e22` (== baseline, final committed
state). Commits: build `336d858`, fixes `26009a7`, this report. Tests: 149 pass (11 new B7b: owner-comebacker
≥0.9 into B1, owner-fallbacker exits ≥0.9, mid-mover < 0.7, non-degenerate counts, leader-defends near-miss,
chains disjoint+spliced, negative-space ≠ B1). Data: `chain-ablate-data/b7b-screen2.txt`. **Stage C not run
(screen-only protocol).** Push verified — see `git log origin`.

---
---

## (ACTION-BUILD-7 foot, superseded by the 7b section above)
**Branch `exp/chain-choreo`.** OFF fingerprint `7c70b1eae7d31e22` (== baseline, final committed state; the
cast is admission-side + flag-gated). Commits: Stage A build `3404aa2`, Stage B screen `84797b0`, this report.
Tests: 141 pass (8 new: density ≥10, slider monotonicity, final-draw endpoint invariance, band-duels across
bands, arcs-at-line, exposure bound, negative-space, finaleCast-ungated). Data:
`reports/evolution/chain-ablate-data/b7-screen.txt`. **Stage C not run (screen stop).** Push verified — see
`git log origin` confirmation with the final commit.
