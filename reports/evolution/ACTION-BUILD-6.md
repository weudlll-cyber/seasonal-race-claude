# ACTION-BUILD-6 — clearance-graded script budget (quick arm)

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC.** BUILD-5 proposal 1, smallest diff:
scale the per-race script budget by the lane count the clearance reader already computes (min over the race
distance). Wide geometry → full budget; very few lanes → **all families thin toward zero** (front convergence
/ pace thinned LAST, and the accordion beats thin with them), handing the narrowest tracks back to the plain
B15 + proximity substrate. One global monotone rule reading only the lane count (LANE_FLOOR 5 .. LANE_FULL 8
lanes — a physical quantity, not a per-track constant). **No topology / track / name read; admission-side;
frozen runtime budget; no new force.** OFF byte-identity unchanged (flag `--clearanceBudget`, default off).

---

## NUMBERS FIRST — ARM D (graded budget) vs Ship, B15+prox, and BUILD-5 ARM C

N=20 × 4 standard tracks, seed 1, paired. dead = dead-finale (lower better). Order: **luger · mtn / searound ·
dirt** (open, then closed). LAW lower better.

| arm | band ·≥70% | dead (l·m/s·d) | LAW_full (l·m/s·d) |
|---|---|---|---|
| ship | 72%·3/4 | 10·20 / 10·**5** | 0.29·0.30/0.31·0.29 |
| B15+prox (substrate) | 76%·4/4 | 15·5 / **15**·15 | 0.58·0.50/**0.62**·0.64 |
| ARM C (clearance) | 73%·4/4 | 10·0 / **30**·15 | 0.44·0.42/0.51·0.55 |
| **ARM D (graded budget)** | **73%·4/4** | 10·0 / **15**·15 | 0.44·0.42/**0.62**·0.55 |

**searound dead: 30 (ARM C) → 15 (ARM D)** — target (~15 or better) **MET**, and it is exactly B15+prox's 15
*by construction* (budget 0 → 0 scripts → the substrate itself; deterministic, not noise). **luger·mtn·dirt
dead: 10·0·15 — unchanged from ARM C** (no regression). **band 4/4.**

### Realized per-track script counts (proves the thinning)
| track | min lanes | budget scale | scripts/race | accordion admitted |
|---|---|---|---|---|
| luger | 10 | 1.00 | 8.5 | 6.0 |
| mountainstreet | 15 | 1.00 | 8.5 | 6.0 |
| **searound** | **5** | **0.00** | **0.0** (was 9.9) | **0.0** (was 4.0) |
| dirt-oval | 10 | 1.00 | 8.5 | 6.0 |

The graded rule fires on exactly the one track that has too few lanes (searound, 5), thins its whole script
set + accordion to nothing, and leaves the wide tracks (10–15 lanes) at full budget. sigColl on searound is
100% (1/20) — every race is now the identical empty set, i.e. the plain substrate.

### LAW_full vs B15+prox, all four (honest)
< B15+prox on **luger (0.44<0.58), mtn (0.42<0.50), dirt (0.55<0.64)**; **EQUAL on searound (0.62 = 0.62)** —
because searound IS the B15+prox substrate now, so it inherits the substrate's LAW exactly. Not lower, not
higher: identical. (ARM C's 0.51 came from the scripts that also cost the +15pp dead we just removed.)

## READ (short)
The graded budget does precisely what proposal 1 predicted: it **removes the compiler's only regression**
(searound 30 → 15) by handing the one genuinely-narrow track back to the substrate, while the three
wide-enough tracks keep the full compiler and its wins (mtn 0, luger 10 = ship, dirt LAW halved vs ship-era).
**ARM D now dominates the B15+prox substrate everywhere** — equal on searound, equal dead + better LAW on
dirt, much better dead + LAW on the open tracks — so the compiler is safe to run on any width profile: it can
no longer hurt a track it has no room to help. **THE BAR (dead ≤ Ship on every track) is still not met** —
searound 15 > 10 and dirt 15 > 5 — but that residual is now the **substrate's own gap to Ship, not the
compiler's**: it is exactly B15+prox's closed-track dead, and Ship's edge there is its re-roll speed-variation,
a runtime force outside the frozen budget. Within the frozen budget the line has reached its clean landing:
*no worse than the proximity substrate anywhere, better wherever there is lateral room.*

### THE FIVE SENTENCES (ripcord 2 — every kept element appears)
1. Almost every racer is sorted to its drawn band by the chain (B15) and released to the fixed fair draw at
   the finish, so band-reach is untouched (4/4 ≥ 70%). 2. Through the approach each band is bunched toward its
   centre and fanned to the exact rank at the line (the proximity floor), while a seeded, row-blind,
   never-repeating script set is drawn from the finale pool and compiled endpoint-exact through the
   reachability accountant and the per-racer exposure cap. 3. Every lateral script and every accordion beat is
   admitted per-instance by the local-clearance reader — planned width at the arc + planned occupancy, one
   maneuver at a time through the wandering free lane — with no topology or track read anywhere. 4. One global
   monotone rule then grades the whole script budget by that same lane count, so on a track with too few lanes
   every family (front convergence last, the accordion with them) thins to zero and the narrow geometry is
   handed back to the plain proximity substrate, while wide tracks keep the full compiler. 5. The clearance
   reader moves no one and the traffic core stays authoritative, so the runtime budget is frozen and the
   shipped world is byte-identical with the line OFF.

## PROPOSALS (own ideas ≥ 2)
1. **Re-pose the bar as "dominates the substrate," and settle the last closed gap separately.** ARM D never
   loses to B15+prox and wins where there is room; the remaining searound/dirt gap to Ship is the SUBSTRATE's
   gap (proximity vs Ship's re-roll), independent of the compiler. Propose splitting the question: adopt the
   graded compiler as the finale layer (it is now harmless everywhere), and treat "beat Ship on the closed
   tracks" as a separate substrate experiment (proximity + a controlled speed-variation source) rather than a
   compiler task — the earned-KILL tripwire belongs to the substrate, not the script line.
2. **A gentler grade to test whether a LITTLE action beats none on 5-lane tracks.** ARM D takes searound to
   exactly zero (LANE_FLOOR 5 → budget 0). A single follow-arm with LANE_FLOOR 4 (so 5 lanes → budget 0.25,
   keeping ~1 longitudinal script + ~1 beat) would measure whether a trace of authored action improves LAW on
   searound without re-introducing the +15pp dead — i.e. find the point on the grade curve where continuity is
   bought back cheaply. One knob, same monotone rule.
3. **Confirm the searound recovery is deterministic, not lucky (cheap).** Because budget 0 makes searound
   byte-identical to B15+prox, a one-line assertion (searound ARM D rawData == B15+prox rawData at the same
   seed) would lock the "hand-back is exact" claim into the test suite.

## Owner questions
1. **Adopt the graded compiler as the finale layer** (dominates the substrate, harmless on narrow geometry)
   and move "beat Ship on the closed tracks" to a separate substrate track (proposal 1)? — or hold.
2. **Run the gentler-grade follow-arm (proposal 2)** to probe the continuity/dead trade on 5-lane tracks, or
   is exact hand-back the preferred behaviour?

No gate, grid, or browser started — those need a fresh owner go.

---
**Branch `exp/chain-choreo`.** OFF fingerprint `7c70b1eae7d31e22` (baseline; the line is entirely flag-gated).
Commit: build `21bc3c6`, this report. Tests: 40 pass (incl. the graded-budget test: narrow → near-zero
budget, wide → full, locally-identical profiles → identical). Data:
`reports/evolution/chain-ablate-data/armD-b6.txt`.
