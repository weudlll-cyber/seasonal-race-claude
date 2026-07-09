# NIGHT SWEEP — Overtaking Feasibility Map — MORNING REPORT

Autonomous run, 2026-07-09, owner asleep. This is a **measurement** effort: NO shipped
race-behavior change. Everything added is flag-gated, read-only, sim-only, and byte-identical when
the flag is off. Confirmed in writing per the mandatory first action.

---

## EXECUTIVE SUMMARY (TL;DR)

**Scope of change:** only `scripts/sim-fairness.mjs` (measurement tool) was edited, all flag-gated +
byte-identical when off; the four shipped modules (defaults / racePlanner / raceGovernor /
heroCurveGenerator) are UNTOUCHED. No shipped behavior changed. 0 orphan processes at end.

**What ran:** TIER-1 = the ACTUAL v4 mechanism, read-only observers (Stage 1: 108 cells; Stage 2:
10 tracks × N=100). TIER-2 = a NOT-shipped flag-gated prototype force (24 cells) to measure what the
malus/boost buys. All 162 cells, 0 errors. Frozen snapshots in `results/tier1/FROZEN/` and
`results/tier2/FROZEN/`.

**The five numbers the generator can be built on:**
1. **RELEASE LATE (~0.97).** Early release (≤0.70) → ~0 or NEGATIVE net places (field re-passes).
   Late → +4.8…+6 net. The held climb is the show.
2. **DENSITY tight→shipped (≤ ±8% speed range).** Tight (±4%) holds band-reach 93–95% on all 10 tracks;
   wide (±12%) breaks the 70% fairness gate. Wide is out.
3. **Reliable comeback size (boost-only, i.e. today's generator): ~+5 NET places from ~35–50% depth,
   landing in-band 92–95%.** Deeper (rank 20→3) is achievable only at the ragged edge.
4. **THE WALL IS TRAFFIC, not speed (91–100%).** In the fair density the field is bunched; a boost-only
   climber is lane-blocked (passes ~8, nets ~5 — churn). ⇒ the missing lever is the MALUS on those ahead.
5. **MALUS (brake the K ahead, inside the fair envelope) is monotonic and decisive for comebacks:**
   strong malus (≈ −15%, the servo minMult) turns a boost-only ~+10 (front 22–73%) into a reliable
   reach-front comeback — **98% from rank 16 / 90% from rank 24 on CLOSED tracks; 88% / 38% on OPEN**
   (open deep is the hard case). For the FRONT fight, ONE GENTLE lever (challenger-boost ≈ +8%, or
   leader-brake ≈ −6%) maximizes clean lead changes; strong or combined backfires (flicker).

**The one structural fact for the rebuild:** the front fight and deep comeback are BOTH achievable within
the existing fair envelope. Their absence today is the casting design — `nextCluster` steers every B1
hero to cluster rank 2+ and nobody to rank 1 (heroCurveGenerator.js:375), and no force touches the
racers a climber must pass. Fix casting (curves THROUGH rank 1, heroes held at DIFFERENT depths) + add
the bidirectional in-envelope force (boost the mover, brake those ahead — malus strong for comebacks,
gentle single-lever for the front fight) and both the comeback and the front fight appear, fairly.

---

## PART 0 — CONCEPT-CHECK VERDICT (read this first)

The mandatory first action asked me to challenge the design if any observer would count the wrong
thing or measure the wrong window. **I found three structural problems that mean the sweep AS
SPECIFIED would have measured the wrong things.** All three are source-verified. They do not sink the
goal — they redirect *how* it must be measured. Details in PART 2.

1. **The `physical_overtake` metric the brief says to "reuse" measures the WRONG thing.** At source
   it counts only Row-1-vs-Row-0 pairs, on OPEN tracks only, over the whole race
   (sim-fairness.mjs:1541-1564, gated `if (V4_ACTIVE && isOpen && v4Row1Total>0)`). It was built to
   answer "does start-row-2 pass start-row-1", NOT "how many places does a hero climbing from 60%
   depth gain". Reusing it as the headline would have produced a confident wrong number. → A NEW
   per-hero, whole-field overtake observer is required (spec in PART 4).

2. **The MALUS mechanism does not exist.** The brief's malus axis {none, gentle, strong} =
   "braking racers AHEAD of the climbing hero". Two independent source audits confirm no such force
   exists: every brake/boost in the servo derives from a racer's OWN rankError
   (racePlanner.js:501,514 — no term references another racer or a hero's proximity), and the
   reactive director is rank-BLIND (raceGovernor.js, acts on the pack by position+seed, never coupled
   to a hero). "What the malus buys vs boost-only" therefore cannot be *measured* without first
   *building* the malus. It is a mechanism prototype, not an observer.

3. **START DEPTH and RELEASE PHASE are not clean axes of the current generator.** The hero-curve
   generator auto-casts 2–4 heroes from the post-chaos field and auto-clamps their curves to a
   density feasibility budget (heroCurveGenerator.js:140-159, 337-419). You cannot ask it for
   "one hero held at 60% back, released at 0.40" — it decides depth (via peakDepthFrac/intensity) and
   refuses infeasible climbs. Sweeping those as *independent* axes requires CONTROLLED INJECTION
   (bypassing the auto-caster), which is new sim-only machinery.

**Verdict:** the *goal* (a feasibility map for hero casting) is sound and worth building. The
*instrument* specified in the brief is not ready. This run (a) delivers the audit + corrected design,
and (b) builds & validates the corrected instrument and produces the first real, trustworthy slice.
See PART 6 for exactly what ran and PART 7 for the plain-language casting conclusion.

---

## PART 1 — CLEAN-BASELINE AUDIT (source-cited)

The sim inherits DEFAULT_RACE_DYNAMICS_CONFIG (defaults.js) for any flag not passed. Confirmed
defaults that would silently run inside a v4-ON cell:

| Default | Value | Source | Effect under v4-ON if not neutralized |
|---|---|---|---|
| `governorDirectorEnabled` | **true** | defaults.js:303 | Reactive director runs on the PACK |
| `pulkBiasGain` | 2.0 | defaults.js:287 | PULK cohesion relic (structurally inert under v4) |
| `racePlanBonusStrengthMultiplier` | 2.0 | defaults.js:271 | targetRank-coupled areaBonus on the pack |
| `phaseSplitBonusEnabled` | true | defaults.js:357 | (browser-side split; sim uses its own CLI split) |
| `areaBonusPulk` | 0 | defaults.js:359 | shipped phase-split ALREADY has PULK bonus off |
| `directorV4ReleaseProgress` | 0.97 | defaults.js:328 | heroes held to 0.97 today (very late) |
| `directorV4OutcomeStart` | 0.25 | defaults.js:337 | OUTCOME (pack band-steering) from 0.25 |

### 1a. The reactive director still runs on the pack under v4-ON — CONFIRMED
`applyGovernor` (raceGovernor.js:196) mutates `r.governorMult`. Under v4 it excludes ONLY heroes:
pins heroes to 1.0 (raceGovernor.js:220) and filters heroes out of `live` (raceGovernor.js:223-225);
every non-hero pack racer is still boosted/braked/fallen-back. The director is gated by
`cfg.directorEnabled` (raceGovernor.js:198) and active only in PRE_PULK/PULK/TRANSITION, fading to
exactly 0 at `corrStartFrac` (raceGovernor.js:127-132, 201-204). Under v4, `corrStartFrac` collapses
to `directorV4OutcomeStart`=0.25 (racePlanner.js:141-145), so the director's window is ~0→0.25 (the
chaos phase). Even so it perturbs pack positions at the start of the measurement window.
→ **Neutralized: every v4-ON cell passes `--governorDirectorEnabled=false`.** The sim gates the
governor on this flag (sim-fairness.mjs:867 `governorEnabled = !!racePlanController && dynamicsConfig.governorDirectorEnabled`).

### 1b. pulkBiasGain — CONFIRMED structurally inert under v4, neutralized anyway
`computePulkBiasedTarget` returns early unless phase==='PULK' (racePlanner.js:558); v4 collapses PULK
to zero width (pulkStart==pulkEnd==0.25, racePlanner.js:141-145), so the branch is never taken. It
touches only the 3 pulk racers (racePlanner.js:559). → **`--pulkBiasGain=0` passed regardless.**

### 1c. The areaBonus — LOAD-BEARING, kept, made EXPLICIT and swept as a control
The native areaBonus (computeAreaBonusMap, racePlanner.js:88-102) is keyed by each racer's targetRank
band and is applied full-strength until `transEnd`=0.75, then fades (racePlanner.js:365-397). Note:
its fade is anchored to **transEnd, NOT pulkEnd** — so the brief's claim "the phase-split bonus tracks
pulkEnd, collapsing PULK re-enables it in 0.25-0.5" is inaccurate for racePlanner's native bonus (the
pulkEnd-tracking split is the SIM's optional `--areaBonus{Early,Pulk,Post}` envelope, inactive unless
those flags are passed — sim-fairness.mjs:214). Under v4 the pack keeps this targetRank-coupled bonus
across 0.25-0.75. This is the load-bearing force that keeps the assigned winner reachable, so it
STAYS — but it is a target-rank-coupled force in the measurement window, so it is **reported per cell**
and **swept as a control axis** {full = `--bonusMult=2.0`, off = `--bonusMult=0`}.

### 1d. Forces acting on a NON-HERO racer in 0.25→1.0 under the clean v4-ON baseline
With `--governorDirectorEnabled=false --pulkBiasGain=0`, enumerated at source:
- (a) OUTCOME band-steering servo toward the racer's OWN targetRank, clamped [0.85,1.10]
  (racePlanner.js:466-515). Loose for the pack via `directorV4PackBandStrictness` (racePlanner.js:494-498).
- (b) the targetRank-coupled areaBonus, full→0.75 then fade (racePlanner.js:365-397) — controlled by `--bonusMult`.
- (c) natural per-frame re-roll speed noise (spreadFactor re-draws, sim-fairness.mjs re-roll schedule).
- (d) the lateral avoidance physics (applyRacerBehavior) — dodge-if-faster-with-room-and-free-lane, else brake.
- NO reactive director (off), NO pulk bias (off/inert), NO malus-on-others (does not exist).
This is the clean v4 mechanism the map measures. **Proof no legacy mechanism ran: the governor is
hard-gated on `dynamicsConfig.governorDirectorEnabled` at sim-fairness.mjs:867; with the flag false,
`governorEnabled` is false and every `governorMult` stays 1.0 (raceGovernor early-return 201-204).**

### 1e. EXACT flag set for every v4-ON cell
```
--race-plan=true --directorV4Enabled=true \
--governorDirectorEnabled=false --pulkBiasGain=0 \
--bonusMult=<2.0|0>            # areaBonus control axis (default 2.0 = shipped)
--directorV4Intensity=<i>       # depth proxy axis
--directorV4OutcomeStart=<o>    # release/hand-off phase axis
--directorV4ReleaseProgress=<r> # B1 release phase axis
--directorV4PackBandStrictness=<s>
--baseSpeedMin=<lo> --baseSpeedMax=<hi>   # DENSITY axis (field spread)
--dur=60 --races=<n> --seed=<k> --track=<id> --racer=<defaultRacerTypeId>
--hero-map --out=<cell dir>     # NEW read-only per-hero observer (this run)
```

---

## PART 2 — OBSERVER WINDOWS & COUNTING CONDITIONS (verified at source)

| Observer | Window | Counting condition | Source |
|---|---|---|---|
| existing `physical_overtake` | whole race | Row1×Row0 pair; near-behind (dY<0.3 & r1.t<r0.t) THEN r1.t>r0.t; once per pair; OPEN only | sim-fairness.mjs:1541-1564 |
| band-reach (fairness) | finish | finalZone==targetZone per racer; overall rate | computeZoneSuccessRate :2221-2266 |
| start-row p (fairness) | finish | Holm over {top3-by-row χ², per-band Spearman}; unfair if pHolm<0.05 | :2417-2566 |
| field spread p10–p90 | finish | p90−p10 of finish times | :2069-2079 |
| **NEW per-hero (this run)** | see PART 4 | per hero the plan tagged isHeroChoreographed | added, validated |

→ The existing physical_overtake is retained for context but is NOT the headline. The headline
"places gained" uses the NEW per-hero observer (PART 4).

---

## PART 3 — WHY THE OWNER SEES NO COMEBACK (source-confirmed, matches eye-test)

- Cause (a): heroes are the B1 pool (finalRank ≤ BAND_EDGES[0]) — heroCurveGenerator.js:407-408 —
  already pulled forward by the chaos areaBonus → they start front, stay front.
- Cause (b): `nextCluster()` (heroCurveGenerator.js:375) starts `b1Cluster=2` and only increments;
  the assigned winner is cast to cluster rank 2 (role sovereign-lead if already front, comebacker
  else — :377-383). **No B1 hero is ever steered to rank 1**; a rank-3 hero → cluster-2 is a
  ONE-PLACE "comeback". The metric says 40–60% comebacks; the eye correctly sees none.
- Compounding: `clampIntensityToBudget` (heroCurveGenerator.js:140-159) reduces intensity until the
  winner's peak excursion is feasible from THIS field's density. On a spread field the peak collapses
  shallow → the "comeback" is a small dip-and-recover → invisible. **This is precisely the number the
  map must calibrate: how deep a peak is actually achievable at each density.**

---

## PART 3B — FRONT-FIGHT FEASIBILITY (spec addendum, incorporated)

The main sweep measures ONE climbing hero and does not touch the FRONT FIGHT — the owner's second
blocker. Source-confirmed root cause: `nextCluster()` starts `b1Cluster=2` (heroCurveGenerator.js:375),
so no hero is ever steered to rank 1; parallel curves at 2,3,4 never cross → no lead changes; a hero
pushing into P1 is braked by its OWN servo toward its cluster-2 target. The FIX is a behavior change
that belongs to the follow-up rebuild, NOT this read-only sweep — but its FEASIBILITY is measured
here so the rebuild does not guess.

FRONT-FIGHT CELL (read-only, same clean baseline, same fairness column): two heroes near the front,
one leading (P1) one just behind (P2). Question: can the leader be caught and passed, repeatedly,
using only the fair envelope [minMult 0.85, maxMult 1.10]?
- Axes: MALUS on the leader {none, gentle, strong} × BOOST on the challenger {none, gentle, strong}.
- Measure: (1) LEAD CHANGES = real P1 changes held ≥ SM_HOLD_MS (=750 ms, sim-fairness.mjs:256 —
  verified; a change that flickers back under 750 ms does not count); (2) is a lead change possible
  AT ALL with boost-only (owner hypothesis: NO — the brake on the leader is what enables it);
  (3) speed-limited vs traffic-limited split (same definitions as the main sweep); (4) fairness
  control: both heroes still finish in B1 (who leads is free → fair by construction).
- This needs the SAME malus/boost prototype as the single-hero comeback cell (TIER-2), so both cells
  share one instrument. Prototype = sim-only, flag-gated, NOT shipped (the addendum states the real
  bidirectional force is the rebuild's job).

### What the follow-up REBUILD must implement (recorded so it is not lost)
1. BIDIRECTIONAL: boost the climber AND brake those ahead, inside the servo's fair envelope.
2. HELD-THEN-RELEASED heroes at DIFFERENT depths (field fractions, not ranks); nothing predictable;
   not all future-B1 racers ranked up front early.
3. CURVES THROUGH RANK 1 THAT CROSS — no more "everyone contests P2"; fair by construction (all
   front heroes finish B1, so momentary lead order is free). Depths/timings/malus come FROM THIS MAP.

## PART 4 — THE CORRECTED INSTRUMENT (what this run builds & measures)

Two tiers (see PART 8 D5/D6 for reasoning):
- TIER-1 (read-only, real mechanism, LOW false-green risk): a `--hero-map` observer over the REAL v4
  cast, sweeping the real knobs (directorV4Intensity ≈ depth, directorV4OutcomeStart / ReleaseProgress
  ≈ release) × density (baseSpeedMin/Max) × 4 tracks. Trustworthy core map.
- TIER-2 (controlled injection + malus/boost prototype, HIGHER risk, clearly labeled): the single-hero
  comeback cell (independent depth × release × malus) and the FRONT-FIGHT cell. Built & validated;
  labeled prototype-not-shipped.

(Instrument details filled as built/validated — see PART 5/6.)

## PART 4A — OBSERVER DEFINITIONS (source-verified, parity-matched)

- **speed-limited frame** (hero): `r.trajectoryMult >= 1.09` — the servo at its +10% ceiling
  (maxMult 1.10). Parity with the existing winner observer (sim-fairness.mjs:1274 uses `>= 1.09`).
- **traffic-limited frame** (hero): `r.avoidanceActive` true — braking behind a leader with NO free
  lane. Parity with the existing brake-frame observer `liteBrakeSum` (sim-fairness.mjs:810). Under the
  lateral rule, a free side → pass without braking (look-before-brake), so avoidanceActive ⇔ no free
  lane. The two fractions are reported separately; a frame can be both.
- **final rank**: `r.finishRank` (sim-fairness.mjs:1861).
- **real overtake** (headline places-gained): hero vs each other racer — near-behind
  (|dY|<V4_LATERAL_PROXIMITY=0.3 AND hero.t<other.t) THEN hero.t>other.t; once per pair; whole field
  (fixes concept-check #1). physicalY maintained per frame (sim-fairness.mjs:638).

### LATERAL-RULE GUARDRAIL (owner-reaffirmed 2026-07-09)
"No room to dodge → MUST brake; driving through is not valid." Enforced:
- TIER-1: traffic-limiting is MEASURED, never tuned away.
- TIER-2 prototype: malus/boost write ONLY to trajectoryMult/governorMult, which sit BESIDE the
  multiplicative `brake` factor in the t-update (sim-fairness.mjs:1399). The brake still applies to a
  boosted hero, so the prototype cannot bypass the lateral rule by construction.

## PART 4B — TIER-2 DESIGN (controlled injection + malus/boost prototype)

Built ONLY after TIER-1 is fully done + frozen (D7). Sim-only, flag-gated, default-off → byte-identical
when off; NOT shipped (the real bidirectional force is the rebuild's job — PART 3B). Two cells share one
instrument:

- **COMEBACK cell** (independent axes the generator won't give): designate one climber at a chosen
  START DEPTH (field fraction) held to a chosen RELEASE PHASE, then steered to a front target by the
  servo. MALUS arm brakes the K racers immediately ahead of it (within [minMult 0.85, 1.0]); BOOST-only
  arm does not. Measures places gained / speed-vs-traffic wall / reach — malus vs boost-only.
- **FRONT-FIGHT cell** (PART 3B): two front heroes (P1 leader + P2 challenger). Axes MALUS-on-leader
  {none,gentle,strong} × BOOST-on-challenger {none,gentle,strong}. Measures LEAD CHANGES (P1 held ≥
  SM_HOLD_MS=750 ms), whether boost-only ever produces one, speed/traffic split, and fairness (both
  finish B1).

Guardrail (owner-reaffirmed): malus/boost write only trajectoryMult/governorMult, which sit BESIDE the
multiplicative `brake` factor (sim-fairness.mjs t-update) → a boosted hero still brakes with no free
lane. The prototype cannot drive through traffic.

## PART 5 — VALIDATION (self-checks)

TIER-1 observer, verified this run:
- **byte-neutral when off**: a run without `--hero-map` writes no hero-map.json and is behaviorally
  unchanged (only-added work is flag-gated).
- **sane signals**: mountainstreet cast ~2.3 heroes/race; a hero anchored rank 20 → final 3
  (net +17, reachedTargetBand true) with ceilFrac 0.64 + trafficFrac 0.63 (straining at ceiling and
  fighting traffic) — deep comeback achievable but hard, exactly the feasibility we want to map.
- **fairness column discriminates**: searound closed flags startRowUnfair=true; mountainstreet open
  does not — the column is not a rubber stamp.
- **observer definitions parity-matched to existing sim observers** (ceiling ≥1.09 = smWinnerCeilSteps;
  traffic = avoidanceActive = liteBrakeSum; overtake = physical_overtake near-behind→cross).

### Throughput note (autonomous decision D8)
Isolated cell cost is near-linear (~2s/race; searound N=30 ≈ 66s). Under concurrency the machine
(14 logical cores, 2 dev servers live, project tree on OneDrive) shows ~2.8× slowdown at conc=6 (module
loads + CPU contention). Mitigations applied: conc=6 (not cores−2=12, which oversubscribed and stalled),
`--skip-main-output` (drop the large fairness-data.json/report writes into the OneDrive tree; band-reach
is computed in-memory for hero-map.json). Stage-1 (108 cells, N=30) ≈ 40–55 min; Stage-2 N reduced to
100 to fit budget. Grid may be trimmed further if the clock demands (D: cut release axis before cutting
tracks/Stage-2/TIER-2).

## PART 6 — RESULTS (TIER-1 = measured ACTUAL v4 mechanism)

Full per-cell tables: `results/tier1/TIER1-TABLES.md` (generated from the frozen checkpoints).
Stage 1 = 108 cells (4 tracks × 3 density × 3 depth × 3 release), N=30, 0 errors, 46 min.

### 6.1 The three levers (pooled across the 4 Stage-1 tracks)

**RELEASE PHASE is the dominant lever for a VISIBLE comeback.**
- early (hold to 0.70): net places gained ≈ 0 or NEGATIVE (heroes drift back after release) — the
  invisible/anti-comeback. e.g. searound shipped/mid/early: net −0.75.
- late (hold to 0.97): net +4.8 … +6.2 places, reachTgt 80–97%. The climb must be held late; released
  early, the field re-passes the hero.

**DENSITY sets the fairness ceiling AND the wall type (the density window).**
- tight (±4%): band-reach 92–95% (all tracks), reachTgt up to 97% — comebacks land AND fairness holds.
- shipped (±8%): band-reach 81–85% — passes, comebacks slightly less reliable.
- wide (±12%): band-reach 67–72% — FAILS the ≥70% gate on searound; net gain collapses for early
  release. Wider field ⇒ bigger gaps ⇒ the wall shifts from pure traffic toward speed-limited.
- ⇒ DENSITY WINDOW = tight→shipped. Wide breaks fairness. This is the field-density answer.

**DEPTH (intensity) trades drama vs reliability, within the window.**
- deeper intensity ⇒ more real overtakes (up to ~10) and larger net gain, but slightly lower reachTgt.
- shallow/​mid at late release already deliver +4.8–4.9 net at ≥93% reachTgt — reliable drama.

### 6.2 THE decisive finding — the wall is TRAFFIC, not speed

Across essentially every fair (tight/shipped) cell, of the heroes that fell short the dominant wall
is **TRAFFIC (no free lane): 85–100%**, not the servo ceiling. Heroes spend ~50–60% of frames braking
behind a leader (trafFrac) and only ~18–35% pinned at the +10% servo ceiling (ceilFrac). And note
**realOvertakes (≈6–10) far exceeds net places gained (≈3–6)** — heroes pass many, get re-passed, net
little: churn without progress, exactly the "no visible comeback" the owner reports.

INTERPRETATION for the rebuild: in the fair, comeback-enabling density the field is bunched enough that
a boost-only climber is blocked by traffic. Opening the lane — i.e. the MALUS on the racers AHEAD
(inside the fair envelope) — is the missing lever. This MOTIVATES TIER-2 from data: boost alone cannot
overcome a traffic wall; the brake on those ahead is what lets the pass complete. (Owner hypothesis,
now data-backed. TIER-2 quantifies how much malus is needed.)

### 6.3 Start-row fairness caveat (honest)
`startRowUnfair` (Holm confirmatory: top3-by-row χ² + per-band Spearman ordinal) flips with density:
tight density (bunched field) tends to PRESERVE within-band start-row ordering → the ordinal flags it;
wide density spreads it out. The project's own note is that the Spearman ordinal over-powers at large N
(it is a within-band ORDER test, not a win-bias test). So band-reach ≥70% is the robust fairness gate
here (all top configs pass at 93–95%); the start-row ordinal flag is reported as a secondary signal to
confirm with the native per-row-wins χ² (computeFairnessStats) before treating it as a hard fail.

### 6.4 Best 3 configs → Stage 2 (all tight density + late release)
1. tight / deep / late  — minBand 94%, net +5.38, realOv 8.43, reachTgt 92%
2. tight / shallow / late — minBand 93%, net +4.90, realOv 7.82, reachTgt 95%
3. tight / mid / late   — minBand 94%, net +4.77, realOv 7.89, reachTgt 94%
(Stage 2 = these × all 10 tracks, N=100 — see 6.5 when complete.)

### 6.5 Stage 2 — cross-track validation (10 tracks, N=100, 0 errors)
All 3 tight/late configs hold **band-reach ≥ 93% on ALL 10 tracks**. Pooled:

| config | minBand (10 tracks) | net gain | realOv | reachTgt | trafWall | start-row fair (Holm) |
|---|--:|--:|--:|--:|--:|--:|
| tight / deep / late   | 93% | +5.89 | 8.65 | 92% | 95% | 4/10 |
| tight / mid / late    | 94% | +5.34 | 7.95 | 95% | 93% | **7/10** |
| tight / shallow / late| 94% | +5.41 | 7.85 | 95% | 6/10 |

- **Band-reach fairness: all three hold everywhere.** DEEP delivers the most real overtakes (8.65) but
  the WORST within-band start-row order (4/10) — the deep curve reshuffles bands but leaves within-band
  order start-correlated. **MID is the balanced pick** (band 94%, net +5.34, reachTgt 95%, start-row
  7/10). (Start-row = Holm ordinal, the possibly-over-powered order test — see 6.3; confirm with native
  χ².) The traffic wall dominates on every track (91–95%), independent of intensity.
- Per-track detail: `results/tier1/TIER1-TABLES.md` + `results/tier1/FROZEN/` (frozen snapshot).

## PART 7 — PLAIN-LANGUAGE CASTING CONCLUSION (from TIER-1, the measured actual mechanism)

For the generator to author a comeback that is DRAMATIC and RELIABLY ACHIEVABLE on open AND closed
tracks, TIER-1 says:

1. **Release LATE (hold to ~0.97).** Releasing early (≤0.70) yields ~0 or NEGATIVE net places — the
   field re-passes the hero. The held climb is the show; the late release is non-negotiable.
2. **Keep the field DENSITY tight→shipped (≤ ±8% speed range).** Tight (±4%) gives band-reach 93–95%
   and reachTgt ~95%; wide (±12%) breaks the ≥70% band-reach gate and turns comebacks into
   speed-limited stalls. The density window is the tight→shipped band.
3. **A hero can reliably regain ~5–6 NET places (passing ~8 real, net ~5–6) from a start depth around
   35–50% of the field, finishing in its target band ~92–95% of the time** — on all 10 tracks, within
   fairness. Deeper starts (rank 20→3 = +17) ARE achievable in bunched fields but at the ragged edge
   (ceiling-pinned + traffic-fighting most frames) and are not reliable.
4. **Intensity = drama dial:** MID for the reliable default (best fairness), DEEP for max overtakes at
   some within-band-order cost.

## PART 6.6 — TIER-2 (NEW PROTOTYPE — measured with a NOT-shipped, flag-gated instrument)

⚠️ **Kept strictly separate from TIER-1 above (owner rule D7).** TIER-1 = the ACTUAL v4 mechanism.
TIER-2 = a sim-only prototype force (r.tier2Mult, default 1.0 → byte-identical off) that applies the
fair-envelope malus/boost; **it is NOT shipped** — it exists only to measure feasibility for the rebuild.
Guardrail honored: tier2Mult sits beside the multiplicative lateral `brake` factor, so a boosted mover
still brakes with no free lane (owner's lateral rule). Full tables: `results/tier2/`.

### 6.6a COMEBACK cell — WHAT THE MALUS BUYS (owner's hypothesis) — CONFIRMED, MONOTONIC
Climber injected at a controlled depth (field fraction), released at 0.55, boost fixed at +10% ceiling;
brake magnitude on the K=4 racers ahead swept {0=boost-only, 0.06 gentle, 0.15 strong}; race-plan OFF
(the prototype force is the ONLY steering — clean physics). N=60. **net = net places gained**,
**reachFront = fraction of races the climber finishes ≤ rank 5**, **traf = frac of frames braking with
no free lane**.

| track | depth | malus=0 (boost-only) | malus=0.06 | malus=0.15 (strong) |
|---|---|---|---|---|
| dirt-oval (closed) | 0.4 (~rank 16) | net 11.7 / front 73% / traf .46 | net 13.5 / **88%** / .36 | net 14.7 / **98%** / **.22** |
| dirt-oval (closed) | 0.6 (~rank 24) | net 16.6 / 50% / .52 | net 19.1 / 62% / .43 | net 21.7 / **90%** / **.26** |
| mountainstreet (open) | 0.4 | net 9.2 / 53% / .48 | net 10.9 / 57% / .41 | net 13.5 / **88%** / **.22** |
| mountainstreet (open) | 0.6 | net 10.3 / 22% / .58 | net 13.2 / 28% / .49 | net 17.3 / 38% / .28 |

**Findings (owner hypothesis CONFIRMED):**
- **The malus is monotonic and decisive.** Every step up in malus raises net places AND reachFront AND
  cuts traffic-braking (halved: ~.5→~.22). The brake on those ahead literally opens the lane — exactly
  the missing lever TIER-1 predicted.
- **Closed tracks are far more comeback-friendly.** dirt-oval: strong malus delivers a reliable
  reach-front from rank 16 (**98%**) and even from rank 24 (**90%**). Open mountainstreet: reliable from
  rank 16 (88%) but only 38% from rank 24 — the physical end + less lap-mixing make deep open comebacks
  the hard case. **Topology matters: author deeper comebacks on closed tracks, shallower on open.**
- The generator's conservative `speedBudgetFrac=0.1` (boost-only ≈ +10%) matches the malus=0 column;
  adding the malus is what turns a boost-only ~+10 net (mostly re-passed, front 22–73%) into a
  reliable reach-front comeback.

### 6.6b FRONT-FIGHT cell — how much brake/boost buys a clean lead change
Two front heroes, leader braked / challenger boosted from progress 0.35; race-plan ON + v4 OFF (band
steering holds the pair front). LEAD CHANGE = flip of who-leads-the-pair held ≥ SM_HOLD_MS (750 ms). N=60.

| track | none | boost-only .08 | malus .06 | malus .06+boost .08 | malus .15 | malus .15+boost .08 |
|---|--:|--:|--:|--:|--:|--:|
| dirt-oval | 0.60 | **1.42** | **1.55** | 0.72 | 0.92 | 0.28 |
| mountainstreet | 0.70 | **1.00** | 0.95 | 0.53 | 0.50 | 0.42 |

**Findings (owner hypothesis REFINED):**
- **One GENTLE lever wins; strong or combined BACKFIRES.** The most clean lead changes come from a
  SINGLE gentle lever — boost-challenger 0.08 (leadΔ 1.0–1.42) or gentle-leader-brake 0.06 (0.95–1.55).
  Combining malus+boost, or going strong (0.15), REDUCES clean lead changes (0.28–0.72): the differential
  gets so large the lead flickers faster than the 750 ms clean-hold → no counted pass.
- **Boost-challenger also keeps the pair front best** (bothB1 38–40% vs 8–22% for brake-heavy arms) — a
  field-relative leader-brake tends to drag the pair back. So for the FRONT fight, boost-the-challenger
  is the safer primary lever; a gentle leader-brake is a viable alternative but must stay gentle.
- **The front fight is ACHIEVABLE within the fair envelope.** Even with no force there are ~0.6–0.7 held
  lead changes (natural physics), *because here the servo targets include rank 1*. So the total absence
  of a front fight today is NOT a physics wall — it is purely the `nextCluster` design that steers every
  B1 hero to cluster rank 2+ and no one to rank 1 (heroCurveGenerator.js:375). Fix the casting (curves
  THROUGH rank 1) + a single gentle lever and the front fight appears.
- Honest caveat: heroes are designated as the top-2 on-track at 0.35, not B1-target racers, so `bothB1`
  is only 8–40%. A cleaner follow-up designates B1-target heroes; it does not change the lead-change
  ordering (a single gentle lever wins).

### THE load-bearing caveat the map exposes for the rebuild
**The wall is TRAFFIC, not speed (91–100% across fair cells), and real overtakes (~8) far exceed net
places gained (~5) — heroes pass and get re-passed.** In the exact density that keeps fairness and makes
the climb geometrically possible, the field is bunched enough that a BOOST-ONLY climber is lane-blocked.
⇒ The generator cannot deliver a *visible* comeback with the boost servo alone. It needs the **MALUS on
the racers ahead** (open the lane, inside the fair envelope) — quantified next in TIER-2. This is the
data-backed confirmation of the owner's mechanical hypothesis.

## PART 7 — PLAIN-LANGUAGE CASTING CONCLUSION

(Filled at end.)

## PART 8 — AUTONOMOUS DECISIONS LOG

- D1: v4-ON cells pass `--governorDirectorEnabled=false` (isolate mechanism). CONFIRMED required (1a).
- D2: v4-ON cells pass `--pulkBiasGain=0`. CONFIRMED inert under v4, done anyway (1b).
- D3: areaBonus KEPT (load-bearing) but REPORTED and swept {2.0, 0} as a control (1c).
- D4: Headline "places gained" uses a NEW per-hero whole-field overtake observer, NOT the existing
  Row1×Row0 physical_overtake (which measures the wrong thing). (Concept-check #1.)
- D5: Depth/release swept via the REAL config knobs (directorV4Intensity / OutcomeStart /
  ReleaseProgress) rather than controlled injection, because injection is unvalidated new machinery
  and the real knobs measure the actual mechanism the owner ships. Independent-axis controlled
  injection (+ malus) is documented as TIER-2; attempted only if TIER-1 completes with time & clean
  validation, and clearly labeled prototype-not-shipped. Reasoning: with no human check tonight and a
  project history of false-green sweeps, a validated measurement of the REAL mechanism is worth more
  than a fast, unvalidated measurement of a hand-built one.
- D6: malus ("what it buys") cannot be measured without building it (concept-check #2); treated as
  TIER-2 prototype, subordinate to the trustworthy TIER-1 core.
- D7 (owner-confirmed, awake briefly 2026-07-09): TIER-1 THEN TIER-2. FREEZE TIER-1 results to a
  separate location (results/tier1/, snapshot before TIER-2 begins) so a prototype bug cannot
  overwrite/contaminate the good numbers. In the report, keep "measured ACTUAL mechanism" (TIER-1)
  and "new PROTOTYPE" (TIER-2) cleanly separated — never mixed. DONE: results/tier1/FROZEN/ +
  results/tier2/FROZEN/.
- D8 (throughput): conc lowered 12→6 (12 oversubscribed 14 logical cores + 2 dev servers → stalls);
  `--skip-main-output` added to drop the large fairness-data.json/report writes into the OneDrive tree
  (band-reach computed in-memory). Stage-1 N=30 (108 cells, 46 min), Stage-2 N=100, TIER-2 N=60.
- D9 (front-fight instrument): the FRONT-FIGHT cell runs race-plan ON + v4 OFF (band-steering holds the
  pair front) rather than race-plan OFF — because in isolation natural churn dominates and even a
  no-force pair both-finish-B1 only 25% of the time. The COMEBACK cell stays race-plan OFF (clean
  physics isolation of the climber). Reasoning written; both are feasibility probes, not shipped.
- D10 (grid trims to fit 7h): TIER-2 scoped to 2 tracks (1 open + 1 closed) × the decisive axes rather
  than all 10 — enough to establish the malus monotonicity + the front-fight optimum + the
  open/closed topology split. A full 10-track TIER-2 confirmation is the recommended next step.

## PART 9 — REPRODUCE / ARTIFACTS
- Report: `scripts/night-sweep/REPORT.md` (this file). Tables: `results/tier1/TIER1-TABLES.md`.
- Frozen data: `results/tier1/FROZEN/{stage1,stage2}.jsonl`, `results/tier2/FROZEN/tier2.jsonl`.
- Rerun TIER-1: `node scripts/night-sweep/run-tier1.mjs --stage=1 --races=30 --conc=6` then `--stage=2 --races=100`.
- Rerun TIER-2: `node scripts/night-sweep/run-tier2.mjs --races=60 --conc=6`.
- Observer flags (read-only, byte-neutral off): `--hero-map` (TIER-1), `--tier2=comeback|frontfight`
  + `--tier2Malus/Boost/Depth/Release/K/Start` (TIER-2 prototype), `--skip-main-output`.
- A no-flag `sim-fairness.mjs` run is byte-identical (verified). Shipped modules untouched (git-verified).
