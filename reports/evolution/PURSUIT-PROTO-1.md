# PURSUIT-PROTO-1 — handicap-pursuit standalone sim (first greenfield experiment)

**Branch `exp/handicap-pursuit` (off master `e31dd18`). Sim-only, longitudinal-only. No shipped path
touched, no flags, no fingerprints.** Answers ONE question: can a single track-agnostic handicap rule
deliver provably-fair-per-race wins AND a bunch finish on BOTH topologies?

## Setup

- **Concept.** Stagger the grid by ability (`start offset = slope · D · (1 − ability/ability_max)`, `D` =
  race distance), so the fastest racer starts furthest back (offset 0) and the slowest gets the biggest
  head start. After the gun **nothing steers anyone** — each racer runs its own ability-derived speed with
  a bounded, continuous, seeded pace drift (OU process, ±8% band, τ=5 s — intrinsic honest motion, not the
  scheduled-dice machinery). The field compresses by construction and the honest drift decides the winner.
- **Field.** 5 ability classes spanning the shipped racer-speed range (snail 0.30 · elephant 0.60 · snake
  0.75 · horse 1.00 · rocket 1.25), 4 identical-ability replicas each = 20 racers. Equal class sizes ⇒
  "uniform across classes" (20% each) is the unambiguous fairness target.
- **Tracks.** luger-hill (open, D = pathLength) + searound (closed, D = pathLength × 2 laps). ONE global
  slope, same formula on both; `D` is each track's own geometry (an input, not a per-track tuning).
- **Motion model constants** (fixed, not knobs): DT 16 ms, base pace 150 px/s, band ±8%, τ 5 s, OU std
  0.04. The ONLY calibrated value is the global `slope`.
- **Determinism + no-steering** are unit-tested (`scripts/exp/pursuit-sim.test.mjs`, 5/5): the slope=1
  fairness invariant (noiseless expected arrival equal for every ability), the slope-ordering, the grid
  stagger, per-seed determinism, and identical-replica symmetry (a rank-reading controller would break it).

## Calibration (one global slope, seeds 1–100/track, disjoint from measurement)

Swept slope pooled over both tracks; picked the most uniform win distribution (lowest chi² vs 20%-each):

| slope | pooled chi² | class shares snail/eleph/snake/horse/rocket | pooled top-3 spread (L) |
|---|---|---|---|
| 0.90 | 760.8 | 0 / 0 / 0 / 2 / 98% | 4.12 |
| 0.95 | 504.8 | 0 / 0 / 0 / 18 / 82% | 3.30 |
| **1.00** | **3.3** | **21 / 24 / 20 / 16 / 21%** | **1.07** |
| 1.05 | 800.0 | 100 / 0 / 0 / 0 / 0% | 1.07 |
| 1.10 | 800.0 | 100 / 0 / 0 / 0 / 0% | 0.95 |

**Calibrated slope = 1.0** — the theoretically-exact equalizer, decisively best on both tracks at once.
(Note for round 2: the tolerance is narrow — under-handicap and the fast dominate, over-handicap and the
slow dominate — because the honest time-variance is small relative to the ability spread; more variance
would widen the window. It does not affect this prototype's verdict, since one global value works.)

## Measurement (slope = 1.0, seeds 1000–1199/track, disjoint from calibration)

### Win share by ability class (uniform target = 20.0% each)

| class | snail | elephant | snake | horse | rocket |
|---|---|---|---|---|---|
| luger-hill (open) | 21.0% | 20.5% | 20.5% | 21.5% | 16.5% |
| searound (closed) | 22.0% | 21.0% | 19.5% | 21.0% | 16.5% |
| **pooled** | **21.5%** | **20.8%** | **20.0%** | **21.3%** | **16.5%** |

Pooled chi² = 3.3 (max class share 21.5%, min 16.5%). By racer (target 5% each, 20 racers): luger-hill
3.0–6.5%, searound 3.0–7.0% — within binomial noise for 200 seeds. **The handicap equalizes honestly on
both tracks; the only residual is the fastest class sitting slightly BELOW uniform (16.5%), i.e. the exact
handicap very mildly over-helps the slow — the opposite of an unfair-to-slow failure.**

### Finish / action observers

| metric | luger-hill (open) | searound (closed) | shipped ref |
|---|---|---|---|
| top-3 finish spread (lengths) | 1.10 | 1.10 | — |
| top-5 finish spread (lengths) | 1.79 | 1.79 | — |
| lead changes in [0.8, 1.0] | 2.94 | 2.94 | ~2.2 |
| dead finales (0 late lead changes) | 6.0% | 6.5% | 10.0% |
| time-to-contention (leader-progress) | 1.00 | 1.00 | — |

The top 3 finish within **~1.1 racer lengths** and the top 5 within ~1.8 — a genuine multi-way photo
finish, and **identical on both topologies** from the one rule. Late lead changes (2.94) exceed the shipped
world's ~2.2 and dead finales (6%) undercut its 10%. Time-to-contention 1.00 means the fastest racer
(started fully at the back) closes onto the front group right at the line — the pursuit resolves at the
finish by construction, which is the point.

## Closing line

**PASS. A single track-agnostic handicap rule (slope = 1.0, exact expected-arrival equalization) delivers
a provably-uniform win distribution across all five ability classes AND a ~1.1-length multi-way photo
finish, identical on the open and closed track, with zero steering after the gun — none of the three kill
criteria fired. Proceed to round 2: lateral / overlap realism (carve-through passing under the no-co-location
gate), then browser rendering.**
