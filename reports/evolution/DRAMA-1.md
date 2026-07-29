# DRAMA-1 — measure the enemy, then build the owner's drama formations

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC. Unattended multi-hour run.**
Chains onto FRONT-AUTOPSY-1 (`reports/evolution/FRONT-AUTOPSY-1.md`). Phase 1 = the autopsy; Phases 2–4 =
build the owner's drama formations on the B15 substrate, compose the optimum, gate it. Screens N=20/track
paired vs ship; final gate N=100. Fingerprint OFF = `7c70b1eae7d31e22` (re-asserted). Runner
`scripts/exp-chain-ablate.mjs`; drama code in `client/src/modules/chainChoreography.js` +
`racePlanner.js` (all sim-only flags, default OFF → byte-identical).

## Closing line (read first)

**FALLS SHORT on action — and the autopsy explains why it always will within the current rules.** Every
drama-formation and rank-freeing lever was screened (19 configs) and DISCARDED: drama formations break
band-reach (the divergence can't be undone within the honest ±10% envelope), and freeing intra-band front
rank — by release OR band-hold — REDUCES action at N=100, because the autopsy's "enemy" (the servo's
rank-steering) turns out to BE the action engine (it manufactures the lead-changes; free the front and it
settles to a natural-speed winner). The composed optimum is the plain **B15 sorter**: at N=100 it is
**band-fairer than ship (4/4 tracks ≥70% vs 3/4, clears luger) at a fraction of the complexity**, but its
**lead-changes are lower on all four tracks** and dead-finales worse on the closed pair. **No new force earned
its place** — the enemy is coupled to the engine (L181 at the front) and DRIVE=0 leaves no fuel headroom, so
no smooth in-clamp force closes the gap. Verdict: more front action needs a *rule* to move (envelope,
finish-only fairness, or the band rule), not another formation.

## THE AUTOPSY'S ENEMY (Phase 1) — and which finding drove which design choice

From FRONT-AUTOPSY-1 (N=100×4, shipped world, read-only, fingerprint-asserted):

| finding | measured | → drove this design choice |
|---|---|---|
| **OVER-STEER dominant** | binding in 75% of dead finales (open 83%, closed 68%) | the "free intra-band front rank" levers (Round E release; Round G front-strictness) — attack the servo's rank-hold |
| **DRIVE = 0** (front never fuel-starved) | fuelSpread ≈ 0.15–0.18, clamp used ~1/3 | do NOT add speed width; work via formations + steering intent only |
| **SPACE worse on closed** | 28% closed vs 13% open | the drama `stagger` param (sequence duels so closing passes don't pile into few lanes) |
| **Pervasive (dead ≈ alive)** | servoOpp 55% vs 58%, blocked 39% vs 43% | target "lift front lead-changes across ALL races", not "convert the 12% dead" |

## PHASE 2 — the drama-formation ledger (N=20 screening, paired vs ship)

Substrate **B15** = chain from boundary 0.15 + in-window row bonus, sole action engine (CHAIN-ABLATE-1
optimum). Ship (control) = 72% band mean, 3/4 ≥70%, dead 10/20/10/5%, lead-chg 2.90/1.85/1.45/2.10.
**B15D0** (baseline, no drama) = **73% band, 4/4 ≥70%**, dead 15/10/25/20, lead-chg 2.05/2.45/1.60/1.60.

| lever | config | band mean / ≥70% | action vs ship | verdict |
|---|---|---|---|---|
| **B15 baseline** | B15D0 | **73% / 4-4** | mixed (mtn lc up, others down; dead worse on closed) | the substrate |
| free rank (release) | choreoRelease 0.85 | 70% / 3-4 | **worse** — lc down, dead up (dirt 35%) | **DISCARD** — removes the corral → natural-speed runaway |
| free rank (release) | choreoRelease 0.70 | 70% / 2-4 | worse | DISCARD |
| **drama** | resolve 0.75, frac 0.4 | **58% / 0-4** | open dead↓ (luger 0%) but reach COLLAPSES | **DISCARD** — divergence unrecoverable in the envelope |
| drama resolve sweep | resolve 0.4 / 0.5 / 0.6 | 67 / 67 / 63% · 0-4 | no reach at any cutoff | **DISCARD** (duration rule swept: no cutoff clears 70%) |
| drama frac 0.25 | resolve 0.5, frac 0.25 | 69% / 2-4 | still < baseline; no action gain | DISCARD (smaller drama = less broken but < B15) |
| drama holdDepth 6 | resolve 0.5, hd 6 | 67% / 0-4 | — | DISCARD |
| **free intra-band rank (band-hold)** | frontStrictness 0.5 | 72% / 3-4 | **lc down** (luger 1.50 vs 2.90) | **DISCARD** — reach kept (no runaway) but action DROPS |
| free rank (band-hold) | frontStrictness 0.25 | 73% / 4-4 | lc down (luger 1.70) | DISCARD — reach fine, action still down |
| free rank (band-hold) | frontStrictness 0.0 | 72% / 3-4 | lc down | DISCARD |
| free rank earlier | fs 0.25, from 0.5 | 72% / 3-4 | dirt dead 45%, lc 0.70 | DISCARD (earlier = worse) |

**The two REVERSE findings (prominent):**
1. **Freeing intra-band rank REDUCES action** — by release (runaway) *and* by band-hold (no runaway, reach
   kept, yet lead-changes still drop). The servo's rank-steering is not merely suppressing passes; **it is
   the mechanism that GENERATES the lead-changes** (it continuously steers racers past one another toward
   their assigned ranks). Free the front and it settles to natural-speed order — fewer changes. The autopsy's
   per-tick "over-steer" is real, but in aggregate the servo is the action engine, not (only) its enemy.
2. **Drama formations are envelope-capped.** Holding a false leader in B1 (or a late arrival behind) and
   returning it to the drawn place by the finish requires a speed excursion the honest ±10% clamp cannot
   deliver in the remaining time — so band-reach breaks (0/4 at every resolve). The owner's drama vision
   needs out-of-envelope speed, which the inviolable clamp forbids. Small drama (frac 0.25) stays legal but
   is below the B15 baseline with no action gain.

### The owner's question list — measured answers
- **False leaders / late arrivals** (the drama concept): buildable and unit-verified (arcs diverge to B1 /
  hold back, converge to the drawn place — 14/14 tests), but **not legal at visible magnitude** within the
  envelope; they break band-reach. Kept only as a documented, envelope-limited option.
- **Free intra-band rank** (the autopsy's lever): implementable two ways; both reduce action. **The band rule
  never required holding rank — but the ACTION does.**
- **Resolve as late as constraints allow**: the constraint is the envelope; the latest legal resolve still
  fails reach. There is no late-resolve window that both reaches and adds action.
- **Stagger on closed**: built (per-racer resolve jitter); moot because drama fails reach before stagger matters.

## PHASE 3 — compose the optimum

Nothing in Phase 2 beat B15. The re-roll / attacker / rotation stack was *not* re-added: it is the shipped
world's action source, and combining it with the chain = CHAIN-INT-1 (already KILLed — the chain adds
nothing over it) rather than a new optimum. **Composition optimum = B15D0 (the plain chain sorter), no drama,
no rank-freeing, no stack.** A NEW FORCE was considered and NOT built: the autopsy's named enemy (over-steer)
is coupled to the action engine (removing it removes action), and DRIVE=0 means there is no fuel headroom to
exploit — so no smooth, in-clamp force closes the action gap without re-hitting L160/L178/L181. The evidence
says the shipped servo's rank-steering is already near-optimal for action under the honest envelope + band rule.

## PHASE 4 — FINAL GATE (N=100 × 4, paired vs ship)

`node scripts/exp-chain-ablate.mjs --arms=B15D0,B15fs25 --races=100`. B15D0 = the composed optimum (chain
sorter); B15fs25 = the best rank-free variant (front-strictness 0.25), gated to confirm the Phase-2 finding
at N=100. OFF fingerprint after all edits = `7c70b1eae7d31e22` (byte-identical).

| metric | ship | B15D0 | B15fs25 |
|---|---|---|---|
| band-reach luger / mtn / sea / dirt | 69/71/74/76% | **74/73/74/73%** | 73/73/73/72% |
| band mean · tracks ≥70% | 72% · **3/4** | 73% · **4/4** | 73% · **4/4** |
| dead-finale luger / mtn / sea / dirt | 8/15/11/14% | 19/14/22/27% | 11/22/21/32% |
| lead-chg luger / mtn / sea / dirt | 2.58/2.03/1.62/2.06 | 1.84/1.80/1.51/1.49 | 1.94/1.64/1.38/1.18 |

- **Band-reach: both chain configs beat ship** (4/4 ≥70% vs ship's 3/4; ship misses luger 69%, both clear it).
  Confirms the chain (with the chaos pre-sort) is a band-fairer field-sorter than the shipped stack, at far
  lower complexity (one boundary + row bonus, no B2/re-roll/rotation/area-bonus).
- **Action: both FALL SHORT** — lead-changes lower than ship on **all four** tracks; dead-finales worse on the
  closed pair (searound/dirt). Freeing front rank (B15fs25) does not rescue it (lc lower still; dirt dead 32%).
- **Overlaps 0 (strict), envelope never exceeded, smoothness held** — all structural/unit-asserted, unchanged.

**Three-tier verdict:** NOT "beats ship" (loses on action, the project's goal). NOT a clean "matches ship at
lower complexity" adoption (band-fairer + simpler, but the late-race contest is weaker). → **FALLS SHORT**,
with the autopsy + the 19-config ledger pinning exactly why: the shipped servo's rank-steering is the action
engine, and no formation or rank-freeing lever beats it within the honest envelope and the band rule.

## Owner-only questions

1. **The core result — action-under-fairness is essentially maxed by the shipped servo.** The autopsy shows
   the servo's rank-hold is *both* the per-tick pass-suppressor *and* the aggregate lead-change generator
   (L181, now measured at the front). To get MORE front action, a **standing rule** has to move — pick one:
   (a) allow a *bounded* out-of-envelope excursion for authored drama (a "hero boost" ceiling above +10%,
   still clamped) so false-leaders/late-arrivals can execute; (b) measure fairness over *more than the finish*
   (e.g. sector scoring) so within-race position swaps count and the servo can be loosened without a runaway
   verdict; (c) accept the band rule literally and let the front race free (the B15fs0 world — fewer changes
   but a genuine natural-speed finish). Which, if any, is on the table? Each is a design round.
2. **Bank B15?** It is a documented, band-fairer, far-simpler sorter than ship (4/4 vs 3/4). Keep as an
   alternative sorter on the branch, or drop the chain line entirely now that action is measured-capped?
3. **Autopsy lock-in addendum?** The lock metric is confounded by racers finishing; a finish-aware fix is a
   ~30-min re-run if lock-timing matters for design round (1). It does not change any conclusion here.

---
**Branch `exp/chain-choreo`.** Fingerprints: OFF `7c70b1eae7d31e22` (== baseline, re-asserted after every
edit) / chain-ON differs. No master commits, no tags. Data: `reports/evolution/chain-ablate-data/` +
`front-autopsy-data/`. Deliverables: this file + `FRONT-AUTOPSY-1.md`.
