# CONCEPT-REVIEW-CC-B2HEROES — B2-Heroes "Attack & Fall"

**Reviewer:** CC (implementer review) | **Date:** 2026-07-19 | **Concept Owner:** Walter
**Scope:** code feasibility · the feasibility machinery (speedBudgetFrac / feasibleTiming / checkFeasible / checkPositiveBudget) · hole-guard · the areaBonus edge case · composability with pack-release
**File-path note:** the concept asked for `/mnt/user-data/outputs/CONCEPT-REVIEW-CC-B2HEROES.md` (a Linux/sandbox path that doesn't exist on this Windows host); written to the repo root. Did not read any Copilot file first.

---

## VERDICT (one line)

Mechanically this is **the cheapest of the three concepts to build** — the generator already authors and validates exactly this arc shape (the faller is the same shape mirrored), and fairness is **safe by construction**. But the arithmetic of the existing `feasibleTiming` says a B2 hero **cannot attack to rank 2-3 and be back in B2 by the 0.80 resolve checkpoint** — the round-trip doesn't fit. Feasible attack depth is ~**rank 4-7**, not 2-3, unless you give attackers a *later* resolve checkpoint (a real but bounded change). Recommend: build it (little new code), but calibrate the drama expectation to the feasibility, or extend the resolve.

---

## THE FIVE FINDINGS THAT MATTER MOST

### F1 — The arc already exists; this is far less new code than it looks

`soloWaypoints` (heroCurveGenerator.js:200) builds a generic **3-waypoint peak excursion** `[anchor → peak → resolve]` and *already* handles `peakRank < finalRank` (a front excursion). The existing **faller** uses exactly that: `addSolo(p.index, 'faller', deepFinal, frontPeak)` (:407) — front peak, deep final. A B2-attacker is the *same shape*, just anchored deeper: `anchor(12) → peak(front) → resolve(B2)`. And `feasibleTiming` (:170) already allocates time for **both legs** (`span1` for anchor→peak, `span2` for peak→final) and requires both to fit before the band checkpoint. So there is **no new curve archetype, no new feasibility function** in the happy path — casting a B2-attacker is a new *block in `castHeroes`* plus a couple of config knobs. That's the good news.

### F2 — But a deep attack is INFEASIBLE against the 0.80 B2 resolve (the headline)

`feasibleTiming` rejects (returns null) when `anchorProgress + span1 + span2 + 0.06 > resolveForBand(finalBand)`. For B2, `resolveForBand = bandResolve[1] = 0.80`. With `anchorProgress = 0.25` the arc has only `0.80 − 0.25 − 0.06 = 0.49` of progress to complete **both** the climb and the fall, where each leg costs `minJerkPeakFactor(1.7) × |Δrank| / maxRankRate`. Solving for the deepest feasible peak `P` on a start-rank-12 B2 hero:

> `22 − 2P ≤ 0.288 × maxRankRate`  →  `P ≥ 11 − 0.144 × maxRankRate`

| field density (maxRankRate) | deepest feasible attack peak |
|---|---|
| 40 (typical 40-racer closed) | **rank ~6** |
| 50 (very dense) | **rank ~4** |
| 62+ (needs ~47 racers inside the budget) | rank 2 |

`maxRankRate = (ahead+behind)/remaining`, capped by the field size — on a 40-racer track it can't exceed ~52 even when the whole field is inside the distance budget. **So "attack to rank 2-3" is structurally out of reach on 40-racer fields; the realistic feasible depth is rank ~4-7.** The faller escapes this because it *starts* at the front (span1 ≈ 0, it only falls); the attacker pays for the climb *and* the fall in the same early budget. This is the single most important thing to internalize before writing a sweep spec: **the concept's headline drama ("deep into B1") is at or beyond the feasibility edge under the current 0.80 checkpoint.**

The fix, if rank 2-3 is required: give attackers a **role-specific later resolve** (e.g. `attackResolveProgress ≈ 0.90`, between B2's 0.80 and B1's 0.97). That buys `0.90−0.25−0.06 = 0.59` and pushes feasible depth to ~rank 2-3 at maxRankRate≈40. Cost: it **bends the staggered-resolve invariant** (deep bands resolve early to keep the OUTCOME backstop margin), and it must be threaded through **both** `feasibleTiming` (:180, the `bc` it resolves by) **and** `checkPositiveBudget` (:287, which independently re-derives `resolveForBand(finalBand)` and would otherwise reject a hero still high at 0.80). Two call sites, one new config value, one invariant to consciously relax.

### F3 — Fairness is safe BY CONSTRUCTION — the failure mode is "no effect," not "unfair"

Unlike the pack-release concept (whose F1 trap could miss the band), the B2-attacker's endpoint is **guaranteed by the generator's own gates**:
- `feasibleTiming` won't place a peak/resolve that can't settle into B2 by the checkpoint.
- `checkPositiveBudget` (:284) independently verifies `bandOfRank(atResolve) === finalBand` and that the post-resolve drift fits the leftover budget — a curve that isn't *in B2 at the resolve* is **dropped** (generateHeroCurves:480, `continue`).
- `checkFeasible` (:270) rejects any curve whose sampled slope exceeds `maxRankRate`.

So an over-ambitious attacker is **rejected, not cast unfair**. The endpoint multiset is preserved; B2 finishers stay B2. This answers Q4/Q12 cleanly: **there is no resolve trap here** — the trap is pre-empted at generation time. The corresponding cost is **casting yield** (F4).

### F4 — Casting yield is the real risk to measure

Because deep attacks are near the feasibility edge (F2) and every cast member also runs the `checkSeparation` (sustained-coincidence) and `checkFieldContinuity` (hole-guard) gauntlet in `generateHeroCurves`, **many attempted B2-attackers will be silently rejected** (`addSolo` → false, or `continue` in the curve loop). If most are rejected, the feature ships ~no observable effect. So the sweep's first job isn't "did action rise" — it's **"how many B2-attackers actually cast, and how deep did they actually go."** Instrument: a per-race counter of `attempted vs cast attacker-b2`, and (Q16) log `sampleHeroCurve(curve, p)` at 5% intervals for each attacker to confirm the curve actually peaks front and returns — plus the hero's *live* min-rank from physics (the hero-map observer already collects `heroObs`; extend with `peakRankReached`). Without these, a null result is ambiguous (no effect vs. never cast).

### F5 — The areaBonus edge case (Q10) is a non-issue under the current choreo model

The concept worries that a rank-2 attacker might get B1's +6% reroll bonus. It won't — for two independent reasons:
1. `plan._racerAreaBonus` is keyed to the **assigned** band (set once at plan creation), not the live rank, so it never "sees" the attacker at rank 2.
2. More decisively: **under choreo (always on), `areaBonusMult` is cut to exactly 1.0 for every racer from the chaos boundary onward** (racePlanner.js update(): `if (!inChaos) r.areaBonusMult = 1.0`). The entire OUTCOME phase — where the attack happens — runs with **no band bonus at all**. The attacker climbs purely on its servo authority (`trajectoryMult`, the ~+10% that `speedBudgetFrac = 0.10` is calibrated to). So `areaBonusPost` needs **no changes**, and Q10's premise ("±6% applied the whole time") doesn't hold for the shipped model.

---

## CODE FEASIBILITY — where it lives, how much

**New code (all in `heroCurveGenerator.js` + config):**
1. **`castHeroes` — a new block after the b1Pool loop (~:424):** pick `M = config.b2AttackHeroes` racers whose `finalRanks` is in B2 and who aren't `used`, jittered like the b1Pool (`rng()` key, to avoid synchronized attacks — Q6). For each, `addSolo(index, 'attacker-b2', b2Final, attackPeakRank)`. `addSolo` already does the feasibility + timing (:361-364), so this is ~10 lines.
2. **Config:** `b2AttackHeroes` (M, default 0 → feature off/byte-identical), `attackDepthFrac` or an explicit `attackPeakRank`, and — if you want rank 2-3 — `attackResolveProgress`. Mirror into `DEFAULT_RACE_DYNAMICS_CONFIG` (UI-configurable).
3. **Slot budget (Q1):** today the total is capped by `drama.nHeroes` (2-4) and the b1Pool loop breaks at that cap. Attackers added *after* it would either be skipped (cap already hit) or need their **own** budget. Recommend a **separate `maxAttackHeroes` slot** counted independently of `nHeroes`, plus an overall `maxTotalHeroes` guard — otherwise attackers either never cast (cap hit by B1 heroes) or displace the B1 comebackers. The concept's Q1 instinct (a max-total cap) is correct and necessary.
4. **Role-aware resolve (only if pursuing deep attacks — F2):** thread an attacker checkpoint through `feasibleTiming` (:180) and `checkPositiveBudget` (:287). Without this, attackers are capped at ~rank 4-7.

**No change needed:** `soloWaypoints`, `sampleHeroCurve`, `anchorHeroCurve`, `checkFeasible`, the whole `generateHeroCurves` curve loop (it's role-agnostic), `buildCameraPlan` (already emits peak/resolve beats), and **the servo** (racePlanner.js) — B2-heroes are just `isHeroChoreographed` racers with `strictness 1.0`, never hitting the 0.97 B1-release (Line 569 gate requires `targetRank ≤ BAND_EDGES[0]`; a B2 attacker's target is >5, so it's structurally excluded — Q9 confirmed, no quirk: after the 0.80 resolve waypoint `sampleHeroCurve` holds the B2 final rank to the line).

**Hot-path cost:** zero at runtime — all the work is at generation time (once per race, at the chaos boundary). No per-frame cost.

**Hole-guard (Q3/Q14):** low risk for 1-2 attackers. `checkFieldContinuity` projects heroes-on-curves + the **pack linearly interpolated** post-chaos→final and rejects a gap > `0.55 × n` (22 ranks on n=40). A single attacker at rank 2 doesn't open a 22-rank hole — the pack projection fills ranks 3-9. The realistic hole-guard risk is **several simultaneous deep attackers thinning the mid-field at the same progress**; the per-attacker timing jitter (F1/Q6) plus `maxSimultaneousCrossings = 2` mitigate it. Expect occasional rejections (contributing to F4's yield problem), not false-positive fairness failures.

---

## COMPOSABILITY WITH PACK-RELEASE (Q20)

They compose cleanly and at **different layers**:
- B2-attackers are `isHeroChoreographed` → **excluded from pack-release** (the pack-release gate is `!isHero`). So there's **no servo-state collision** — the attacker is curve-driven (strictness 1.0, firm), the pack releases independently (strictness 0 inside band).
- They "compete for B1 space" only in the sense that ranks are a contiguous permutation: a curve-pinned attacker at rank 2 and a loosely-released pack racer can't occupy the same rank, and the firmer-controlled attacker wins the contested slot while the released pack racer drifts around it. That's desirable (authored front duel + emergent background motion), not a conflict.
- **Recommendation for the sweep:** measure three arms — pack-release alone, B2-attackers alone, and both together — because the *interesting* hypothesis is that emergent pack freedom (background) + one authored front attacker (foreground) reads as a lively race without either carrying the whole load.

---

## AUTHORSHIP vs EMERGENCE (Q11/Q18/Q19) — implementer's take

This is the owner's aesthetic call, but from the code's vantage: B2-attacks are **fully authored** (a scripted curve the servo tracks exactly) and **fairness-safe by construction**, whereas pack-release is **emergent** (dynamics, not scripts) and required a hysteresis guard to stay fair. The B2 approach trades organic-ness for control and safety. Two mitigations keep authored attacks from reading as canned: **timing jitter** (Q6/Q19 — never let two attackers peak at the same progress) and **shallow-by-default depth** (a rank-6 brush past the front reads as a plausible surge; a repeated rank-2 assault every race reads as a script). If the goal is "the front looks alive without risking fairness," this is the lowest-risk lever of the three concepts — precisely because the generator refuses to cast anything unfair.

---

## MEASUREMENT (Q15/Q16/Q17)

- **Isolate attacker action (Q15):** a rank-2 slot looks the same whoever holds it, so tag it by role. The generator already writes `_heroRoles` (`'attacker-b2'`); surface **role-tagged front-occupancy** — fraction of OUTCOME frames a top-5 slot is held by an `attacker-b2` — and **swaps involving an attacker**. This separates authored front action from B1-natural action.
- **Curve audit (Q16):** cheap and essential — for each attacker log `sampleHeroCurve(curve, p)` at `p ∈ {0.25, 0.30, … 1.0}`. Confirms the authored intent (peaks front, returns to B2). Pair with the **live** min-rank the physics actually reached (`peakRankReached` on `heroObs`) to confirm the servo followed it.
- **Casting yield (Q17) — the binding diagnostic:** count `attackersAttempted` vs `attackersCast` per race, and among cast, the distribution of `attackPeakRank`. If yield is low or depths are all ~6-7, that *is* the result (and points back to F2's resolve-checkpoint decision). Reuse the existing `--hero-map` observer; add these three fields.
- **Fairness gates unchanged:** B1/B2 band-reach ≥ 70%, Holm-unfair = 0. Given F3, I'd expect these to hold trivially (endpoints are generator-guaranteed) — which is itself the confirmation that the fairness cost is zero and the only open question is *effect size*.

---

## ANSWER INDEX

Q1 → separate attacker slot + `maxTotalHeroes` cap (necessary, not optional). Q2 → `feasibleTiming` already sums both legs; the binding limit is the 0.80 resolve, not the budget per se. Q3 → deep-fall hole-guard false-rejection unlikely for 1-2 attackers (pack fills the gap). Q4 → **no resolve trap** — `checkPositiveBudget` pre-empts it at generation time. Q5 → faller + attacker coexist (independent pools: front-start vs B2-final), both consume hero slots. Q6 → add per-attacker `rng()` timing jitter; `feasibleTiming` alone is deterministic and would cluster. Q7 → feasible depth ~rank 4-7 (F2), not 2-3, without a later resolve. Q8 → no authorship-time max-slope; `feasibleTiming` allocates by peak slope and `checkFeasible` rejects post-hoc (self-correcting → silent rejection). Q9 → no quirk; B2 target >5 structurally skips the 0.97 release; curve holds B2 after resolve. Q10 → **moot** — areaBonusMult is 1.0 for all in OUTCOME under choreo; no bonus flip, no change needed. Q11 → both credible if attacks stay shallow + jittered; else canned. Q12 → guaranteed in-band by `checkPositiveBudget` (no F1-style creep). Q13 → the pack chases its *own* targets, not the attacker (servo targets are per-racer assigned ranks); minor local contention only. Q14 → density/hole-guard fine for 1-2 attackers; watch simultaneous deep attacks. Q15 → role-tagged front-occupancy + attacker-involved swaps. Q16 → log `sampleHeroCurve` at 5% + live `peakRankReached`. Q17 → **yield is the key diagnostic** (attempted vs cast, depth distribution). Q18 → more scripted than pack-release; safest lever. Q19 → jitter timing to avoid synchronized attacks. Q20 → composes cleanly (heroes excluded from pack-release); sweep all three arms.

---

## BOTTOM LINE

Build it — it's the smallest code change and the only concept that **cannot** produce an unfair endpoint (the generator refuses). But go in eyes-open: under the shipped 0.80 B2 resolve, the feasible attack is a **rank ~4-7 brush past the front**, not a rank-2 assault. Decide up front whether that's enough drama; if you want "deep into B1," budget the extra work for a role-aware `attackResolveProgress ≈ 0.90` (two call sites + one relaxed invariant). Either way, make **casting yield + curve/live-rank audit** the primary sweep metrics — with fairness guaranteed, effect-size and yield are the only real questions. And run it as a **third arm alongside pack-release**, not instead of it: authored front attacker + emergent pack freedom is the combination most likely to make OUTCOME feel alive.
