# PURSUIT-PROTO-2 — lateral realism (carve-through passing under the no-co-location gate)

**Branch `exp/handicap-pursuit`. Sim-only. No shipped path touched, no re-tuning (inherited slope 1.0).**
Proto-1 (PASS) was longitudinal-only. Proto-2 adds a lane dimension + honest overlap-free traffic and asks:
does the pursuit still bunch **fairly** and stay **overlap-free** when passing is physical?

## Setup

- Inherited from proto-1 unchanged: the ONE global handicap slope (**1.0**), the OU honest pace drift,
  ZERO rank-reading steering after the gun. Only the lateral layer is new.
- **Lateral model.** Each racer has a lane (continuous `y`) and a body (long axis · narrow axis, real
  shipped sprite fractions). Passing is earned by open space: a racer's forward move is capped to the
  min-gap behind the nearest in-lane leader; a lane change is allowed only into a slot verified clear; and
  the committed move is bullet-proofed to overlap **no** racer's current position — else the lane change is
  cancelled, else the racer is **held** at its blocker's pace (a real physical delay, never a phase-through).
  Racers are processed leaders-first (the racer ahead has the line; the overtaker must go around),
  which is the honest right-of-way rule. Overlap-freedom is unit-tested (0 across 40 seeds × 2 tracks).
- **Field / tracks.** Same 5 ability classes × 4 replicas = 20; luger-hill (open, width 250 px → ~9 lanes)
  + searound (closed, width 131 px → ~4 lanes). 200 measurement seeds/track. Lane count follows each
  track's own width — no per-track tuning.

## Measurement (slope 1.0 inherited, seeds 1000–1199/track)

### Win share by ability class (uniform target = 20.0% each)

| class | snail | elephant | snake | horse | rocket |
|---|---|---|---|---|---|
| luger-hill (open, ~9 lanes) | 37.5% | 39.5% | 13.5% | 2.5% | 7.0% |
| searound (closed, ~4 lanes) | 99.5% | 0.0% | 0.5% | 0.0% | 0.0% |
| **pooled** | **68.5%** | **19.8%** | **7.0%** | **1.3%** | **3.5%** |

Pooled chi² = 629 (proto-1 was 3.3). The win distribution has **collapsed onto the slowest classes**, and
the collapse is **track-dependent** — mild-but-real on the wide track, near-total on the narrow one.

### Finish / action / integrity

| metric | luger-hill | searound | proto-1 / shipped |
|---|---|---|---|
| top-3 finish spread (L) | 1.05 | 1.10 | 1.10 / — |
| top-5 finish spread (L) | 1.75 | 1.93 | 1.79 / — |
| lead changes [0.8, 1.0] | 2.73 | 2.08 | 2.94 / ~2.2 |
| dead finales | 8.0% | 20.0% | 6% / 10% |
| **OVERLAP VIOLATIONS** | **0** | **0** | MUST BE 0 |
| traffic: blocked frac (field mean) | 0.6% | 2.2% | — |

## Overlap integrity — PASS

**Zero overlaps on both tracks, every seed** — the no-co-location gate holds; passing is always earned by
space, never by clipping. The collision model (forward-gap cap + clearance-checked lane changes + a
committed-move safety check with a hold fallback) is a clean, reusable overlap-free 2D traffic core. So the
"no pass-through" requirement is met decisively.

## Traffic analysis — it HURTS, and it is the killer

Traffic does **not** help the finale; it **destroys the handicap's fairness**, and does so
**track-dependently**. The mechanism is physical and unavoidable under honest passing:

- The handicap starts the fast racers at the **back** and the slow racers at the **front** (near the line).
  For the concept to be fair, the fast racers must **carve up through the entire field**. Overtaking
  requires an open lane; the racer ahead has the line and the overtaker must go around.
- On a **narrow** track the field is many-abreast (searound: 20 racers over ~4 lanes), so a fast racer
  catching a group of same-ability replicas that already fills the lanes has **nowhere to pass** — it is
  held at their pace and never gets through. Meanwhile the front-most slow racers have **clear track** to
  the line and cruise home. Result: the slowest class wins **99.5%**.
- On a **wide** track (luger, ~9 lanes) there is more room to pass, so the bias is smaller — but still
  severe (rocket 7%, horse 2.5%, vs the snail/elephant 37–40%).

The blocked-fraction (field mean 0.6%/2.2%) looks small only because it averages the never-blocked slow
front-runners with the heavily-blocked fast back-markers; the win distribution is the true signal. Crucially
**the bias is a function of track width (lane count), which the ONE global slope cannot compensate** —
searound wants a very different correction from luger, i.e. it would require a per-track value, which is
barred. The finish still *bunches* (top-3 ~1.1 L) — but it is a bunch of the *slow* racers finishing
together while the fast ones are stuck behind, not a fair multi-way contest.

## Closing line

**KILL. Overlap integrity passed perfectly (0 pass-throughs on both tracks), but honest overlap-free
passing breaks the handicap's fairness: the win distribution collapses onto the slow front-starters
(pooled 68.5% snail, chi² 629 vs proto-1's 3.3), because the fast back-markers cannot legally carve
through real traffic — and the collapse is track-width-dependent (searound 99.5% vs luger-hill 37.5%),
so no single global rule can restore fairness (kill criteria #3 and the per-track #4 both fired). The
handicap-pursuit concept survives in one dimension but not two: a pursuit that depends on the fast racer
passing the whole field cannot be fair on tracks too narrow to pass on. Recommend dropping the branch;
carry this report + the lesson back to master.**
