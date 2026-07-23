# GREENFIELD NIGHT RUN — Morning Report

Branch `pre/greenfield-proto` (from master `5ae3b1f`). Sim-only prototype of the greenfield
architecture with three composer variants, measured against the committed baselines. This run was
unattended; every phase committed its own results before the next began, and the shipped-default
fingerprint stayed byte-identical throughout (`efd0f4ad8eca08fa`, verified after the composer wiring).

**GREENFIELD-PLAN.md was not present at the branch point.** The V-PLAN composer was therefore derived
from its description in the two available proposals (a fair hand of band values + a seed-chosen
dramaturgy over roll slots + hand-sum tiers), not from the planner's own document. This is noted where
it matters.

The three proposals were read in full and are the build input for the composers:
GREENFIELD-CC ("schedule, don't steer" — rank trajectories + field-shape + v_track + receding-horizon
re-planning), GREENFIELD-COPILOT ("seeded pace compiler" — archetype envelopes + shared race-wave +
row-neutralization credit), and the derived V-PLAN.

---

## Answers to the seven report questions

### 1. Physics tax — σ, tail loss, uniform or concentrated?

Measured with a new read-only observer (`--physics-tax`, `scripts/sim/observers/physics-tax.mjs`) on
the **shipped default engine**, N=100 × 4 tracks × 60 s, baseline seeds. It records, per racer, the
cumulative longitudinal distance lost to avoidance braking as a fraction of the distance it would
otherwise have covered, and normalises it to the natural band (b = 0.0813) to give **σ = the share of
band authority live physics already consumes**.

- **σ (pooled) = 48.1%** — mean; p50 45.6%, p90 73.9%, **p95 82.3%, max 125.7%**. Live physics already
  eats roughly **half the natural speed band on the average racer**, and more than the entire band for
  the worst-case racer in a race.
- Per track: **mountainstreet 32.9%, luger-hill 42.1%, dirt-oval 51.8%, searound 65.6%.** Closed tracks
  are far more expensive; searound's p95 is 94.2% — nearly the whole band gone.
- **Tail (last decile) loss ≈ 47% σ** (3.9% of distance) — physics keeps taxing right to the finish;
  the reserve cannot be released late.
- **Concentration ≈ 1.11 → roughly UNIFORM**, not concentrated in a few corners. The decile profile is
  flat at ~3.5–4.3% throughout. Per GREENFIELD-CC §8.3 this is the **expensive** case: a constant drag
  is harder to plan around than a few known bad places.

**Bottom line for a composer: it may spend at most `band × (1 − σ) ≈ 0.52 × b` on average, and as
little as `0.34 × b` on searound.** This single number gates everything below.

Data: `reports/greenfield/p0/`.

### 2. Inversion-budget audit — deliverable per duration; is 30 s viable; does band × (1 − σ) change the verdict?

Pure arithmetic on the existing per-race Fisher-Yates assignments (replicated and verified
byte-identical against `createRacePlan`), with field density g and speed v measured per track ×
duration. `ratio = |Δrank|·g / (T·v·b)` is the required mean speed differential as a fraction of the
band; ratio ≤ 1 means the move fits inside the band given the whole race.

The raw assignment is demanding but not impossible: inversion count averages **395 of 780**, and the
required rank movement averages **13.5 ranks (p95 = 32, max = 39)** — a racer routinely has to cross
most of the field.

- **Against the FULL band:** DELIVERABLE at 60/120/300 s on all four tracks. Only the two closed tracks
  at 30 s are MARGINAL (12–13% of racers undeliverable). So *the assignment itself is physically
  reachable by a smooth open-loop schedule when it has the whole band and ≥ 60 s.*
- **Against band × (1 − σ) — the composer's HONEST budget — the verdict flips hard:**
  - **30 s: not viable anywhere.** Every track MARGINAL; 9% (mountainstreet) to **44% (searound,
    dirt-oval) of racers are undeliverable.**
  - **60 s:** mountainstreet DELIVERABLE (3%); luger-hill MARGINAL (15%); **searound & dirt-oval
    MARGINAL (29% undeliverable).**
  - **120 s:** mostly recovers (mountainstreet DELIVERABLE; others 9–15% tail); **300 s: DELIVERABLE
    everywhere.**

**So yes — band × (1 − σ) changes the verdict on essentially every 30–60 s closed-track cell.** The
headline is that *the physics tax, not the inversion count, is the wall*: the assignment is reachable
at full band but not within the ~half-band physics leaves. **30 s is viable on no track against the
reduced band; the design needs generous runway (120 s+) to deliver within its honest budget.**

Data: `reports/greenfield/p1/`.

### 3. A8 — drop the carousel or tune it? → **DROP IT.**

Three arms, same baseline seeds, N=100 × 4 tracks, all measured at the A6 window (0.62), paired. (The
historical A5/A6 flag configs were never committed, so they are defined here per the spec and measured
fresh alongside A8; my A6-control reads 37.3% vs the spec's quoted 31.3%, a definitional difference, so
treat the *relative* ordering as the result, not the absolute A6 number.)

| arm | config | p1Contest@0.62 | runaway | parade | leadChange | distinctLeaders |
|---|---|---|---|---|---|---|
| A6-control | gap-reroll G=1.5, carousel OFF | 37.3% | 7.5% | 2.0% | 2.73 | 3.35 |
| A5-carousel | G=1.5 + carousel ON (roleBias 1.0) | 30.5% | 10.3% | 2.0% | 2.55 | 3.17 |
| **A8-gr075** | **gap-reroll G=0.75, carousel OFF** | **54.0%** | **6.5%** | **0.8%** | **3.22** | **3.63** |

- **A8 beats A5 on p1Contest by a wide margin (54.0% vs 30.5%) with MORE lead changes (3.22 vs 2.55)
  and LESS runaway (6.5% vs 10.3%) and parade (0.8% vs 2.0%).** The tighter gap-reroll threshold does
  everything the carousel was meant to do, better, with no new mechanism.
- **The carousel (A5) is the worst arm of the three** — it *lowers* contest and *raises* runaway
  versus the plain control. On these numbers it is not earning its complexity.

**Verdict: DROP the carousel. And note the free win — G=0.75 gap-reroll (A8) beats the shipped G=1.5
control on every metric here**, which is an owner-level tuning result worth having independent of the
greenfield question.

Caveat: because these arms were run at `contestWindowStart=0.62`, the primary front-battle tracker sat
at 0.62 too, so a separate 0.80-window number was not captured for P2 (the two would have coincided).
The composer sweeps below run at the default 0.80 and capture both windows correctly.

Data: `reports/greenfield/p2/`.

### 4. Per composer (N=50 × 4 tracks, 60 s, σ=0.48)

**All three build and run through the full live engine, and all three hold the hard band invariant
exactly (0 violations across every race).** But all three are dominated by the current system on both
delivery and action:

| composer | band delivery | tierExact | p1@0.80 | p1@0.62 | leadChange | distinctLeaders | runaway | parade | intraTierEntropy | re-deal / recompile / re-plan | band viol |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **V-PLAN** | **69.7%** | 0% | 0.0% | 0.0% | 0.15 | 1.15 | 5.0% | 1.0% | 1.000 | 12.6 / 0 / 0 | 0 |
| **V-COPILOT** | 67.7% | 0% | 0.0% | 0.5% | 0.12 | 1.11 | 2.5% | 0.5% | 1.000 | 0 / 0 / 0 | 0 |
| **V-CC** | 47.2% | 0% | 0.0% | 0.0% | 0.17 | 1.17 | 7.5% | 1.0% | 1.000 | 0 / 0 / 320 | 0 |
| *baseline (A6/A8, §3)* | *>70%* | *–* | *5.3%* | *31–54%* | *2.7–3.2* | *3.2–3.6* | *6.5–7.5%* | *0.8–2%* | *–* | *–* | *–* |

- **Band delivery vs the owner's > 80% mark: all three MISS** (V-CC badly). This is exactly what P1
  predicted — at 60 s against the reduced band, closed tracks deliver only ~70%, and V-CC spends more
  of its band on trajectory shape/jitter so it delivers least (47%). tier-exactness is 0% everywhere:
  no race lands *all* 40 racers in their assigned tier, because ~30–50% miss.
- **Action vs the matched baselines: catastrophic. p1Contest ≈ 0% at both windows** (vs 5.3% @0.80 and
  31–54% @0.62), leadChange ≈ 0.1 (vs 2.7–3.2), distinctLeaders ≈ 1.1 (vs 3.2–3.6). **The composers
  produce essentially no lead changes and no front battle.** This is the "elegant but dull" collapse
  that GREENFIELD-COPILOT §5 named as the biggest risk — now measured, and it is total.
- **intraTierEntropy = 1.000** for all three — placement *within* a tier is maximally free
  (unpredictable across seeds), which is the one thing the design promised and delivers. But it is cold
  comfort: with p1Contest ≈ 0 the freedom shows up as smooth reshuffling, not as a visible fight for
  position. (Caveat: at N=50 with few racers per tier-group the signature entropy saturates easily;
  treat 1.000 as "not scripted", not as a strong action signal.)
- **Band-compliance: perfect (0 violations).** The playback invariant — every authored factor inside
  the honest band — held in every frame of every race. The composers never cheat the band; they simply
  cannot buy enough position with what the band leaves after physics.
- **Delivery diagnostics behaved as designed:** V-PLAN re-dealt its arrangement ~12.6×/race (the
  dramaturgy shuffle); V-COPILOT never needed a recompile (its archetypes fit the reserve band);
  V-CC re-planned at all 8 checkpoints × 40 racers (320) and reported **minMargin = 0.0000** — i.e. it
  authored right at the reserve edge by construction, so it never predicts an *undeliverable* race,
  it just under-delivers deep inversions by clamping their mean to the reduced band (which then shows
  up as the 47% delivery, not as a margin violation).

**Why the mechanism is sound but the result is not:** the composers do exactly what the proposals
describe — a smooth, seed-authored, band-legal, physics-live open-loop schedule — and the physics
stays live and honest throughout. The failure is not a bug in the composers; it is the P0/P1 wall made
concrete. Half the band is gone to physics (σ=48%), and what remains is spent almost entirely on
*delivering the tier*, leaving nothing to author a front fight with. Locking each racer's mean speed to
its target rank is what guarantees fairness **and** what removes every lead change.

Data: `reports/greenfield/sweep/`.

### 5. Best variant + its single binding blocker + strongest seeds

**Best variant: V-PLAN** — highest band delivery (69.7%), band-compliant, lowest-complexity of the
three (a hand of band values + a seed-permuted arrangement). V-COPILOT is a close second and has the
cleanest runaway (2.5%); V-CC is clearly last (47% delivery) — its extra trajectory machinery costs
band it cannot spare.

**The single binding blocker (all variants): zero front action.** p1Contest ≈ 0% because a monotone
mean-speed → target-rank map produces a field that sorts once and never trades the lead. No amount of
zero-mean shape (dramaturgy, archetype, jitter) changes the finishing order, so none of it produces a
lead change. To get front action an open-loop composer would have to **schedule genuine proximity at
the front and let physics/jitter decide the order there** (GREENFIELD-CC §3's actual proposal), which
this skeleton does not yet do — and doing it costs band the P0/P1 budget does not have at 60 s. The
secondary blocker is delivery: 80% band-reach is unreachable at 60 s within `band × (1 − σ)`; it needs
≥ 120 s (P1, and P7 below).

**Strongest seeds for the owner's browser eye-check** (V-PLAN; picked for delivery + any lead change —
there is little action to show, so these are "cleanest delivery" exemplars, not battles):

1. **dirt-oval, seed 15** — 95% band delivery, 1 lead change (the best single race)
2. **dirt-oval, seed 4** — 90% delivery, 1 lead change
3. **mountainstreet, seed 50** — 85% delivery, 1 lead change
4. **mountainstreet, seed 13** — 80% delivery, 1 lead change
5. **dirt-oval, seed 9** — 80% delivery, 1 lead change

The eye-check will most likely confirm the metric: smooth, legible, fair-looking sorting with almost no
overtaking. That is the honest state of the prototype and the thing the owner most needs to see before
committing to or discarding the direction.

### P7 (stretch) — duration scaling on the best composer (V-PLAN, N=25)

| duration | band delivery | leadChange | runaway |
|---|---|---|---|
| 30 s | 65.5% | 0.09 | 3.0% |
| 60 s | 69.7% | 0.15 | 5.0% |
| 120 s | 72.1% | 0.08 | 8.0% |
| 300 s | **73.5%** | 0.12 | **14.0%** |

Three things, and none of them rescues the design:

- **Delivery improves with runway but PLATEAUS below the 80% mark** — 65.5% → 73.5% and flattening. It
  never reaches the ~90%+ that P1's *arithmetic* predicted for the reduced band at 300 s. The gap is
  the σ=0.48 reserve itself: holding back half the band compresses 40 racers' mean speeds into a very
  narrow spread, so adjacent-tier separation is tiny and live physics noise reshuffles racers across
  tier edges no matter how much runway there is. The limit is the *band budget*, not the *time*.
- **Action does not respond to duration at all** — leadChange stays ~0.1 at every length. This confirms
  the blocker is structural (the monotone mean→rank map), not a runway shortage. You cannot buy a lead
  change with more time when the schedule forbids one.
- **Runaway gets monotonically WORSE with duration (3% → 14%)** — a longer race lets a high-mean racer
  build an unchallengeable lead, exactly the failure the current servo exists to suppress. So "just run
  longer races" trades a little delivery for a lot more runaway and zero action.

**P7 verdict: longer races are not a way out.** The design's two failures (sub-80% delivery, zero
action) are properties of the σ-limited band budget and the mean→rank map, not of race length.

Data: `reports/greenfield/p7/`.

### 6. Hygiene — see the HYGIENE section below.

### 7. Wall-clock per phase, and what was skipped and why

| phase | wall-clock | notes |
|---|---|---|
| P0 physics-tax | **~59 min** | N=100 × 4 tracks × 60 s; closed tracks (searound/dirt-oval) dominate |
| P1 inversion audit | **~23 min** | arithmetic is instant; the cost is the density measurement (N=15 × 4 tracks × 4 durations, the 300 s runs dominate) |
| P2 A8 arm | **~43 min** | 3 arms × 4 tracks × N=100 × 60 s, paired |
| P4/P5/P6 sweeps | **~10 min total** | N=50 × 4 tracks × 60 s each, run sequentially (~3–4 min each) |
| P7 duration scaling | *pending* | V-PLAN × 30/120/300 s × N=25 |

**Nothing in P0–P6 was skipped.** The promotion rule (re-run a composer at N=100 if it meets band
delivery ≥ baseline AND action ≥ matched baselines) **never triggered** — no composer came close to the
action bar, so none was promoted to N=100; this was the rule working as intended, not a skip. P7 is the
spec's explicit stretch and is running because the night had room.

One reporting limitation, disclosed: P2's arms were run at `contestWindowStart=0.62`, so its "0.80"
column duplicates the 0.62 number rather than being an independent A1-window measurement (the composer
sweeps, at the default 0.80, capture both windows correctly).

---

## HYGIENE

**Branch:** `pre/greenfield-proto`, five commits ahead of master `5ae3b1f`:
`setup → P0+P3 → P1 → P2 → P4/P5/P6` (plus this report's final commit).

**Tags created:** none. (Per tonight's ref-collision lesson, no tag of the branch name was created.)

**Untracked files remaining:** zero at every commit boundary (verified `git status --short` clean).
All temporary sim output lives under `client/tmp/` (git-ignored) and the two scratch runner scripts
live in the session scratchpad **outside the repo** — nothing scratch survives in the working tree.

**Shipped-default fingerprint:** `efd0f4ad8eca08fa`, unchanged from master and re-verified after the
composer wiring landed. Every new capability (`--physics-tax`, `--composer`, the second front-battle
tracker) is additive and flag-gated; the OFF path is byte-identical.

**What should be collapsed / deleted at phase close (owner decision):**
- The three composer variants and the playback path are a **prototype**, not a shipped feature. If the
  greenfield direction is dropped, `client/src/modules/greenfieldComposer.js` (+ test) and the
  `--composer` sim wiring can be deleted wholesale; they touch nothing on the default path.
- **Keep `scripts/sim/observers/physics-tax.mjs`** regardless of the greenfield decision — σ and the
  field-density measurement are useful to any future mechanism work (P0's own conclusion).
- **Act on P2 independently of greenfield:** tightening gap-reroll to **G=0.75** beat the shipped G=1.5
  on every metric (more contest, less runaway/parade) and **the lead carousel should be dropped** — it
  was the worst arm. That is a shippable tuning result; the carousel code can be removed.
- `client/tmp/exp-greenfield/` and the P0/P1/P2/P7 tmp dirs are throwaway; only `reports/greenfield/`
  is committed.

---

## The one-paragraph answer for coffee

Physics already eats **~half the natural speed band** (σ = 48%, up to 94% on searound), uniformly, all
the way to the finish. The tier assignment is reachable open-loop *at the full band with ≥ 60 s*, but
**not within the half-band physics actually leaves** — so at 30–60 s on closed tracks a third to a half
of racers are undeliverable, and only 120 s+ recovers. Built faithfully, all three composers confirm
it: they deliver 47–70% band (below the 80% mark), hold the band invariant perfectly, keep intra-tier
placement genuinely free — and produce **almost no lead changes** (p1Contest ≈ 0% vs 31–54% for the
current system), because locking each racer's mean speed to its assigned tier is simultaneously what
makes it fair and what makes it static. The greenfield "schedule, don't steer" idea is *sound and
honest* but, as prototyped, **dominated by the current servo on both fairness delivery and action at
60 s** — its front-action story needs scheduled front-proximity that the P0/P1 band budget cannot
afford at race length. **The night's most immediately useful result is unrelated to greenfield: drop
the lead carousel and tighten gap-reroll to G=0.75** — that alone beats the shipped default on contest,
runaway, and parade together.
