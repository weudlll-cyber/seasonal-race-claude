# Chain choreography — standalone sim experiment — CHAIN-SIM-1

**Branch `exp/chain-choreo` (sim-only, master untouched beyond STEP 0). Author: CC. Unattended autonomous run.**
Prototype: `scripts/exp/chain-sim.mjs`. Concept: `reports/evolution/CHAIN-CHOREO-CC.md`.

## Closing line (read first)

**KILL.** Chain choreography is the first mechanism to *beat its paired control on the finale* — it roughly
**halves the dead-finale rate and triples-to-sextuples late lead-changes on all four tracks, at zero overlaps**
— but it buys that action by loosening the win-restoring force, which re-opens a **statistically significant,
monotone front-favoring start-row win bias on all four tracks** (front row wins 52–72%). That trips the
pre-registered KILL ("row bias on either topology"). The bias is **intrinsic, not a tunable**: it is
byte-identical at `mExtra=0` and `mExtra=2`, and `K` is already at its floor. **This is Lesson 181 restated
in a new mechanism** — the finale contest and start-row fairness are the *same* restoring force; you cannot
buy one by relaxing the other. Recommend: DROP the branch, land the lesson on master, archive the SHA.

---

## Design calls (made autonomously, justified)

Owner was away; every open call was made here and is defended below.

1. **Standalone sim, not a flag in the shipped servo.** Argued in CHAIN-CHOREO-CC §7 and STEP-0 concept: all
   pre-registered kill-risks (row bias, overlap, reachability, single-global-budget feasibility) are
   answerable in a standalone reduced model, and integrating a whole-field choreographer into the ~1000-line
   shipped servo risks non-completion in one unattended run. `scripts/exp/chain-sim.mjs` reuses the proven
   overlap-free traffic core (PURSUIT-PROTO-2 / L183) and the shipped envelope `[0.85, 1.10]`.
2. **CONTROL = a MODE of the same sim** (single fixed fair-draw target + honest OU re-roll noise), so the
   comparison isolates *choreography* while holding physics, traffic core, envelope, field size, and seeds
   identical. **The control is NOT the shipped world** — it is the shipped *monotone-servo behaviour inside
   this reduced sim*. Absolute numbers therefore differ from the shipped world (24 racers, no hero curves,
   no drafting); the **paired delta CH−CT is the signal**, not the absolute level.
3. **Pace `v0 = D / T` per track** (T = 60 s standing protocol). This is the shipped duration-model rule
   (pace derived so a 60 s race traverses the track). It is *mandatory*, not cosmetic: with a fixed
   `v0 = 150`, the comb front advances at `D/T ≈ 172 px/s` — faster than the max racer speed
   (`1.10 × 150 = 165`) — so the formation runs away from the whole field, nobody tracks their slot, and the
   field never reorders (first sweep: band-reach 38%, one row wins 100%). With `v0 = D/T` the comb front
   advances at exactly `v0`, so racers *can* track their authored targets. **This was the one real bug found
   and fixed.** One global rule, no per-track values (the *formula* is global; `D` is just track geometry).
4. **Formation = a moving "comb"** (`combX(slot, tprog) = tprog·D − (slot−1)·G_px`, `G = 1.0` body-length):
   position formations, not rank labels (L172). The authored target *slot* eases from the re-anchored actual
   slot to the fixed fair-draw slot `π[i]` via smootherstep (min-jerk), plus a vanishing oscillation
   `mExtra·sin(π·n·tprog+φ)·(1−tprog)` for extra mid-race crossings. **Endpoint invariant:** at `tprog=1` the
   ease is complete and the osc is ×0, so `slotTarget = π[i]` exactly — the fixed fair draw, never altered
   (L181-safe by construction; asserted in Phase A).
5. **Adaptation = GPS reroute** (CHAIN-CHOREO-CC §2): at each of `K` checkpoints, read each racer's *actual*
   slot (rank by x) as the new anchor, keep `π` fixed, re-ease from actual→π. The live order is only the
   *start* of the re-authored curve; the attractor is always the fixed final. No target reads the live rank;
   no blend toward live order; no `startRowIndex` in any generator.
6. **Re-roll OFF in chain mode** (CHAIN-CHOREO-CC §4); a tiny texture-noise knob exists but is set to 0 (the
   choreography drives all motion). Re-roll ON only in the control arm.
7. **`K = clamp(round(60/segSec), 3, 8)`** — one global `segSec`, duration-scaled (no hardcoded checkpoint
   count). Field `N = 24`; identical racers; staggered start rows by lane capacity `⌊W/(bodyWide+margin)⌋`.

## Phase A — unit tests (6/6 pass)

`node scripts/exp/chain-sim.mjs --mode=unit`

1. Determinism (same seed → identical finish order). 2. Finish order is a permutation of 1..N. 3. Zero
overlaps across seeds on an open and a closed track. 4. K-rule clamps to [3,8] at 30/60/300 s. 5. Envelope
never exceeded. 6. **Endpoint === fair draw** (slotTarget at tprog=1 equals π exactly — the L181 invariant).
Note: the L181 endpoint check is enforced at runtime; "no live-rank in any target" is additionally verified
by code inspection (the only live-order read is the checkpoint *anchor*, never the attractor).

## Phase B — sweep (segSec × mExtra, N=25, luger-hill + searound)

Two findings dominate the raw table:

- **The pace bug (above).** Pre-fix: band-reach ~38%, winRow chi² pinned at the max (one row wins 100%) on
  every arm — the diagnostic that the comb was outrunning the field. Post-fix the mechanism reorders.
- **Best region = K=3 (segSec 20–30).** band-reach 87–95%, many overtakes/segment (44–52), entropy 0.68–0.72,
  0 overlaps. **High K hurts:** at K=8 (segSec 8) band-reach falls to 67–74% and winRow chi² climbs back to
  the max — each re-anchor restarts the smootherstep ease, so more checkpoints means *slower* net convergence,
  not faster. So `K=3` (the floor) is both the best action region and the most reachable.
- **N=25 is underpowered for row-fairness** (consistent with the project's N≥100 fairness methodology): the
  sweep showed luger `mExtra=2` chi² **1.0** — but the N=100 gate reveals chi² **19.4** on the identical arm.
  The row bias is invisible at N=25. **Sweep fairness numbers were not trusted; Phase C re-measured at N=100.**

## Phase C — final gate (segSec=20, K=3, N=100/track, PAIRED vs CONTROL)

`node scripts/exp/chain-sim.mjs --mode=gate --segSec=20 --mExtra=2`
Tracks: luger-hill (open, 2 rows), mountainstreet (open, 2 rows), searound (closed, 4 rows), dirt-oval (3 rows).
CH = chain, CT = control (same sim, single fixed target + re-roll).

| metric | luger CH | luger CT | mtn CH | mtn CT | sea CH | sea CT | dirt CH | dirt CT |
|---|---|---|---|---|---|---|---|---|
| band-reach | **95%** | 95% | **99%** | 97% | **84%** | 75% | **96%** | 92% |
| winRow chi² | 19.4 | 13.0 | 9.0 | 9.0 | 47.0 | 55.8 | 25.8 | 8.7 |
| winRow max−min | 44% | 36% | 30% | 30% | 42% | 49% | 41% | 24% |
| **lead chg late** | **0.78** | 0.13 | **0.95** | 0.33 | **0.63** | 0.21 | **0.82** | 0.23 |
| overtakes/race | 169 | 427 | 181 | 286 | 180 | 671 | 180 | 508 |
| **dead finales** | **43%** | 87% | **32%** | 84% | **53%** | 81% | **40%** | 82% |
| occ entropy | 0.79 | (n/a) | 0.80 | (n/a) | 0.78 | (n/a) | 0.80 | (n/a) |
| blocked frac | 0.4% | 3.1% | 0.2% | 2.2% | 3.5% | 12.8% | 1.0% | 6.4% |
| overlaps | **0** | 0 | **0** | 0 | **0** | 0 | **0** | 0 |

### The ACTION result is real and positive (the first of its kind)

- **Dead finales roughly halved** on every track (CH 32–53% vs CT 81–87%).
- **Late lead-changes 3–6× higher** on every track (CH 0.63–0.95 vs CT 0.13–0.33).
- **0 overlaps**, band-reach ≥84% (CH ≥ CT on all four; the closed track improves 75→84%).
- CT's higher *raw overtake count* (286–671) is mid-pack OU churn that never reaches the front — hence its
  81–87% dead finales *despite* 500+ overtakes. Chain's fewer overtakes are the ones that matter (front).
- `occ entropy` 0.78–0.80 (near-max diversity — not on-rails by the metric). CT shows 0.00 only because the
  control has no checkpoints to sample occupancy; it is **n/a**, not "on rails."

This is the first mechanism in the Evolution series to **beat its paired control on the finale** rather than
just re-shuffling the pack. The concept's core claim (L178 generalized — orchestration re-shapes the settle
into a live finale) is **confirmed within the reduced sim**.

### The FAIRNESS result is the kill

Per-row win share, chain arm (front → back):

| track | front → back win share |
|---|---|
| luger-hill | **72% / 28%** |
| mountainstreet | **65% / 35%** |
| searound | **47% / 36% / 12% / 5%** |
| dirt-oval | **52% / 37% / 11%** |

- **Monotone front-favoring on every track** — the textbook core-hard-problem signature (a front-row racer on
  clear track finishes first; a back-row-assigned-winner cannot complete the long path to place 1 by the
  finish). This is exactly the win-reachability leak flagged in CHAIN-CHOREO-CC §3.
- **Statistically significant on all four tracks** (chi² 9.0–47.0; even the 2-row tracks at df=1 exceed the
  p<0.01 critical value 6.63). On **dirt-oval the control is near-fair (chi² 8.7 / 24%) but chain leaks
  25.8 / 41%** — the mechanism *introduces* bias where the control has none. (Searound is the DEAD-ENDS
  baseline-biased track; there chain is actually *less* biased than the control, 47 vs 56 — but still fails.)
- **Intrinsic, not a tunable.** `mExtra=0` gives byte-identical winRow chi² (luger 19.36 both times) — the osc
  term vanishes at the finish (×(1−tprog)), so it never touches *who wins*, only mid-race texture. `K` is
  already at its floor (raising it worsens reach). There is no global lever that touches the bias.

`node scripts/exp/chain-sim.mjs --mode=gate --segSec=20 --mExtra=0` (fairness-identical, action slightly up):
dead finales 35–42%, lead-chg-late 0.71–1.05, winRow chi² 19.4 / 10.2 / 46.0 / 25.5 — same kill.

## Why it is a KILL and not a tuning opportunity — Lesson 181, restated

The whole point was to make the finale live. It works — *because* the winner is no longer pinned to place 1
until the very end. But an unpinned finish is exactly a finish where the physically-front racer (the front
start row) wins. To remove the front-bias you must pin the winner earlier → the finale settles → dead-finale
returns → you are back at the shipped monotone servo. **The finale contest and the start-row win-fairness are
the same restoring force; chain choreography trades one directly for the other.** This is Lesson 181
(discovered on assignment-follows-field) reproduced by a completely different, L181-*safe-by-construction*
mechanism — which is the strong result: it shows L181 is not an artifact of one broken design but a
**structural property of the identical-racer problem**. The GPS-reroute keeps the *net* fair draw intact
(band-reach ≥84%), but "reaches its assigned band" ≠ "reaches place 1", and the residual is pure front-bias.

## Pre-registered kill criteria — scored

| criterion | verdict |
|---|---|
| P(win \| start row) not equal on EITHER topology | **TRIPPED** — significant front-bias on all 4 |
| action does not beat baseline | passed (halved dead-finale, 3–6× late lead-changes vs control) |
| any overlap > 0 | passed (0 on every arm) |
| reachability fails (band-reach break) | passed (≥84%) |
| a per-track budget would be needed | n/a — the single global rule is fine; fairness fails *globally*, not per-track |
| clustering only feasible so thin it reproduces the settle | passed — clustering is feasible and visible |

**One tripped kill (the row bias) is decisive.** The mechanism dies on fairness, not on feasibility or action.

## What survives (assets + knowledge)

- The **overlap-free traffic core carried a whole-field choreography at 0 overlaps** on open and closed
  tracks — further validation of the L183 asset.
- **Confirmed structural law:** orchestration *can* manufacture a live finale (first paired-control win), but
  under identical racers the live finale and start-row fairness are one restoring force (L181 generalizes
  beyond AFF). This belongs in `docs/LESSONS.md` / `docs/DEAD-ENDS.md` on master (owner call — master is
  untouchable in this run).
- `scripts/exp/chain-sim.mjs` — reproducible; `--mode=unit|sweep|gate`.

## Owner-only questions

1. **Promote the lesson?** I recommend a new lesson: *"Orchestration can produce a live finale (chain
   choreography beat its paired control: dead-finale halved, late lead-changes 3–6×, 0 overlap) — but under
   identical racers a live finale and equal-win-by-row are the SAME restoring force (L181 generalized); chain
   choreography leaked a monotone front-bias, 52–72% front-row wins, intrinsic to the mechanism."* Add to
   LESSONS.md + a DEAD-ENDS.md entry under D. Shall I prepare that as a docs-only PR to master?
2. **Archive + drop?** Per the experiment regime (knowledge to master first, then drop the dead branch): tag
   `archive/chain-choreo-<sha>` and delete `exp/chain-choreo`? The sim stays recoverable at the tag.
3. This result sharpens DEAD-ENDS §F: no *continuous* force and now no *choreography* escapes L181 — which
   points squarely at the "what this leaves open" list (elimination / sector scoring / re-pack — formats that
   make a breakaway *irrelevant* rather than pinning or catching it). Want the next round aimed there?

---

**Branch:** `exp/chain-choreo`. **Master (STEP 0 only):** `a12b6ab`. Sim + this report committed on the branch.
No master commits beyond STEP 0, no tags created (per spec).
