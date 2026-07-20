# Deep Dive: mountainstreet — N=100 races (worst track)

BASELINE_CURRENT config (choreoOutcomeStart=0.6, absolute checkpoints). mountainstreet is the open,
60-racer track and the worst B3 band-reach in the Phase-1 sweep. Two lenses: all-racer landing
(fast/slow) and the hero causal signal (speed-ceiling-limited vs traffic-blocked).

_Scope note: the spec asked for a 5-point rank progression [0.60/0.70/0.80/0.90/1.0] per racer.
That needs a new hot-loop hook and was not instrumented here. Instead the hero-map `ceilFrac`/
`trafficFrac` fields give the *causal* answer the progression was meant to infer (why a faller did
not reach target: speed-capped vs blocked), plus `anchorRank`(0.25)→`finalRank` for entry-vs-exit._

## All-racer landing by band (N=100, all 60 racers/race)

| Band | drawn | reach | TOO_FAST | fast Δ̄ | TOO_SLOW | slow Δ̄ | dominant |
|---|---|---|---|---|---|---|---|
| B1 (1–5) | 500 | 71.6% | 0 | n/a | 142 | +13.2 | **TOO_SLOW** |
| B2 (6–15) | 1000 | 67.2% | 140 | -3.5 | 188 | +15.0 | **TOO_SLOW** |
| B3 (16–25) | 1000 | 59.7% | 189 | -5.2 | 214 | +10.8 | **TOO_SLOW** |
| B4 (26–40) | 1500 | 66.5% | 240 | -8.7 | 262 | +8.8 | **TOO_SLOW** |
| B5 (41+) | 2000 | 83.5% | 329 | -16.4 | 0 | n/a | **TOO_FAST** |

## Hero causal signal — why fallers miss (ceilFrac = speed-capped, trafficFrac = blocked)

Mean over hero rows. High `ceilFrac` on a faller = the servo wanted to climb faster but hit the speed
ceiling (authority/time problem). High `trafficFrac` = blocked by traffic (positioning problem).

| Band | heroes | SLOW ceilFrac | SLOW trafficFrac | FAST ceilFrac | SUCCESS ceilFrac | SLOW anchor→final (target) |
|---|---|---|---|---|---|---|
| B1 (1–5) | 232 | 59.3% | 56.8% | n/a | 29.8% | 19.66→8.37 (t2.71) |
| B2 (6–15) | 27 | 0.0% | 35.5% | 13.7% | 29.6% | 3.00→18.00 (t15.00) |
| B3 (16–25) | 6 | n/a | n/a | 10.2% | 6.8% | n/a |

## ⚠️ Hero-coverage caveat (read before the interpretation)

Hero rows per band: B1 232, B2 27, B3 6, B4 0, B5 0.
The choreographer tags almost only **front-targeting comebackers**, so `ceilFrac`/`trafficFrac` is a signal
for **B1 heroes' climb**, NOT for B3–B5 fallers (which have ~no hero coverage). The deep-band mechanism
below is therefore inferred from the all-racer *landing direction*, not directly measured per faller.

## Interpretation

- **mountainstreet shows a field-wide UNDERSHOOT.** Bands B1, B2, B3, B4 are all
  TOO_SLOW-dominant (B5 is structurally all-fast — nothing is slower than last). This is *unlike* the 4-track
  aggregate (where B4/B5 leaked fast); on this long open 60-racer track the whole field struggles to climb
  forward to its target — a **climb-capacity deficit**, not a brake leak.
- **B3 confirms Phase 1:** 214 slow / 189 fast (46.9% fast) — undershoot-dominant, reach 59.7% (worse than the closed tracks).
- **B1 front-heroes that fall short are BOTH speed- and traffic-limited** (ceilFrac 59.3% ≈ trafficFrac
  56.8%; SUCCESS ceilFrac only 29.8%). Their anchor(0.25)→final is
  19.66→8.37 (target 2.71) — they climb a long way but stall short.
  This is the *directly measured* piece; deep bands are not hero-covered but share the same undershoot direction.

### Answer to the owner decision fork
- Walter's "B3 fallers enter OUTCOME too fast" hypothesis is **not supported** — B3 (and B1–B4) fallers on the
  worst track **undershoot**. Direction is robust (all-racer, N=100); the "too fast" story is refuted here.
- Best-supported reading: an **OUTCOME climb-capacity deficit** (servo authority/time to move racers forward),
  worst on the long open track. Directly evidenced for B1 comebackers (speed+traffic limited); inferred for
  deep bands from the shared undershoot direction — NOT yet measured per B3 faller.
- **To confirm the B3 mechanism directly, the 5-point rank-progression instrument (deferred) is the right next
  build** — it would show whether B3 fallers enter OUTCOME already behind or stall during the climb.
- **Next fix directions to measure:** add OUTCOME climb capacity for deep bands (earlier per-band steering
  onset and/or higher trajectoryMult authority for B3–B5). Checkpoint proportionalization (Phase 1) is
  confirmed irrelevant to band-reach.

_Data: 6000 racer landings, 265 hero rows, N=100 races._

