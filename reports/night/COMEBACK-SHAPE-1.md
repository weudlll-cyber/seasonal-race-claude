# COMEBACK-SHAPE-1 — what the plan writes, what the camera shows, side by side

**Date:** 2026-09-07
**Branch:** `night/2026-09-06`, off master `554f348e`. **Not merged.**
**Kind:** MEASUREMENT ONLY. Nothing built, no default, threshold, gate, plan or detector changed,
nothing that draws touched. **Nothing minted.**
**Key state:** `comebackUseBeats` **OFF** for every run — both columns describe today's product.
`engine-reach --check`: *none of 1 path(s) carry a change that can reach the race engine.* Golden
races **PASS**.

---

## ★ A correction to OUTCOME-WINDOW-1, found while setting this piece up

Last night's piece 5 reported that giving the shared driver the browser's `isOutcomePhase` left the
whole corpus byte-identical, and concluded the flag was **inert on that corpus**.

**That conclusion is withdrawn.** `scripts/diag/comeback-beats.mjs:170-184` already **wraps
`cd.update`** and supplies the browser's value on its default arm — the arm every one of those runs
used. My driver-level change was overridden by that wrapper and could not have made any difference.
I proved the arm "live" by counting frames where it returned `true` and never checked whether
something downstream overrode it, which is the same mistake the chain had already paid for twice.

**The comparison the flag actually exists for** (`--outcome=driver` against the default), N = 30:

| | browser's value (today's product) | `isOutcomePhase: false` |
|---|---:|---:|
| comeback shots | **7** | **1** |
| COMEBACK_ZOOM frame share | 2.60% | 0.37% |
| LEADER_ZOOM frame share | 42.63% | 44.49% |

**The outcome window is decisive, not inert.** What still stands from that report: the three
hard-coded sites, the OR at `CameraDirector.js:1717`, the 24,344-frame window difference (measured by
a standalone probe that did not use the harness), the fingerprint movement to `75aef5cd474c54e5`
(`camera-fingerprint.mjs` has no wrapper), and the 76-consumer list. What is withdrawn is §1's
conclusion and only that.

★ **It also means COMEBACK-BEATS-1, COMEBACK-WEIGHT-1 and COMEBACK-CONNECT-1 were all measured on the
browser's window** — which is the right one, because that is what the product supplies. Their numbers
are unaffected.

---

## What the numbers are measured from

**Reused, not rebuilt:** `scripts/diag/comeback-beats.mjs` — COMEBACK-BEATS-1's harness, which
already delivered the plan the browser's way and recorded beats and shots — extended with the shape
recording it lacked, and `scripts/lib/raceDriver.mjs` underneath it. Piece 4's beats path is what
exposes the plan's beats at all. No second instrument was written.

★ **One figure is not authored but measured, and the report never blurs them.** The plan's authored
rank at each beat exists — every curve point is `{progress, rank}` (`heroChoreography.js:111`) — but
`buildCameraPlan` (`heroCurveGenerator.js:511-517`) keeps only `{progress, event}`, and the
controller exposes `getCameraPlan` and `getHeroRoles` and **no getter for the curves**. Adding one
would be adding a metric to the product to make it measurable. **So every "from" position below is
the racer's ACTUAL rank when the authored progress arrived. Every "to" marked *planned* is the
plan's own `finalRank`.**

**Two stages.** N = 30 first; every figure below was already readable there (7 shots, 55 planned
climbs, the same shape), so it went to **N = 40** — the corpus COMEBACK-BEATS-1 used, 10 tracks ×
seeds 1-4.

---

## Re-established rather than assumed

- **`heroCurveGenerator.js:18`** — *"Positive OUTCOME handoff budget is a hard constraint (resolve
  into band before the checkpoint — no late rescue)."*
- **`heroCurveGenerator.js:49-50`** — *"each hero must resolve INTO its final band by its band's
  resolveProgress — deeper bands earlier … the front (B1) latest."*
- **The camera never picks a racer the plan did not name:** **0 of 11 shots**, N = 40. Re-measured,
  not carried over.

★ **And one premise needs correcting: the camera is not first allowed to look at 0.75.** 0.75 is the
*internal fallback*. The product supplies the plan's OUTCOME phase, and measured over all 40 races
that opens at **0.600** (min 0.600, median 0.6001, max 0.6003; it opened in 40 of 40).

---

## Column A — what the race plan authors (74 planned comebackers, N = 40)

| | n | min | p25 | median | p75 | max |
|---|---:|---:|---:|---:|---:|---:|
| climb STARTS | 74 | 0.150 | 0.150 | 0.150 | 0.150 | 0.150 |
| climb FINISHES | 74 | 0.780 | 0.780 | 0.780 | 0.780 | 0.914 |

The start is the handoff and is the same in every race. Median climb length **0.630 of the race**.
Median from rank **8**, median rank at resolve **2**, median positions gained **5**.

**Planned climbs that finish before 0.75: 0 of 74. Before 0.600, when the camera may first look:
0 of 74.**

## Column B — what the camera shows today (11 shots, N = 40)

| | n | min | p25 | median | p75 | max |
|---|---:|---:|---:|---:|---:|---:|
| shot STARTS | 11 | 0.609 | 0.617 | 0.646 | 0.690 | 0.771 |
| shot ENDS | 11 | 0.709 | 0.746 | 0.756 | 0.817 | 0.874 |

Shot start minus its planned resolve: median **−0.134** (min −0.260, max −0.009) — every shot begins
before the plan's climb is finished. Shot start minus its planned anchor: median **+0.496**.

## Column C — the overlay, one row per shot

*"plan: from" is the racer's measured rank when the authored climb began; "plan: to" is the plan's
own `finalRank`.*

| track | seed | racer | plan: from → to | plan: starts → finishes | camera: starts → ends | camera: rank at start → end |
|---|---:|---:|---|---|---|---|
| city-circuit | 2 | 9 | 9 → 5 | 0.150 → 0.780 | 0.771 → 0.874 | 10 → 2 |
| city-circuit | 3 | 36 | 9 → 3 | 0.150 → 0.780 | 0.647 → 0.748 | 15 → 1 |
| dirt-oval | 2 | 20 | 7 → 1 | 0.150 → 0.780 | 0.662 → 0.746 | 9 → 5 |
| garden-path | 2 | 20 | 8 → 1 | 0.150 → 0.780 | 0.646 → 0.756 | 11 → 3 |
| garden-path | 4 | 15 | 8 → 5 | 0.150 → 0.780 | 0.633 → 0.745 | 9 → 6 |
| ice-track | 3 | 36 | 13 → 3 | 0.150 → 0.780 | 0.609 → 0.709 | 20 → 17 |
| luger-hill | 3 | 36 | 19 → 3 | 0.150 → 0.803 | 0.690 → 0.817 | 16 → 3 |
| mountainstreet | 4 | 10 | 10 → 1 | 0.150 → 0.780 | 0.611 → 0.750 | 9 → 1 |
| river-run | 2 | 20 | 7 → 1 | 0.150 → 0.780 | 0.708 → 0.842 | 15 → 4 |
| seatrack | 4 | 10 | 20 → 1 | 0.150 → 0.877 | 0.617 → 0.757 | 9 → 3 |
| space-sprint | 4 | 15 | 7 → 5 | 0.150 → 0.780 | 0.621 → 0.759 | 14 → 6 |

Median shot length **0.107 of the race** against a median planned climb of **0.630** — the camera
shows about a sixth of the arc, and it is the part before the landing.

## The other direction — planned, never shown (63 of 74)

| | n | climb starts | climb finishes | length | from rank | rank at resolve | positions gained |
|---|---:|---:|---:|---:|---:|---:|---:|
| planned AND shown | 11 | 0.150 | 0.780 | 0.630 | 9 | 2 | **7** |
| planned, NEVER shown | 63 | 0.150 | 0.780 | 0.630 | 8 | 2 | **5** |
| all planned | 74 | 0.150 | 0.780 | 0.630 | 8 | 2 | 5 |

*Medians. Start, finish, length and landing rank are the same to three decimals.*

| positions gained | shown (n=11) | never shown (n=63) |
|---|---:|---:|
| lost ground or level | 2 | 2 |
| 1–4 | 1 | 26 |
| 5–9 | 5 | 25 |
| 10–14 | 1 | 4 |
| 15 or more | 2 | 6 |

Range: shown −2 to **18**, never shown −1 to **19**. Climbs of ten places or more: **3 of 11 shown,
10 of 63 never shown.** Finish before 0.75: 0 of 11 shown, 0 of 63 never shown.

### The ten deepest climbs that were never shown

| track | seed | racer | from → at resolve | gained | starts → finishes |
|---|---:|---:|---|---:|---|
| luger-hill | 3 | 16 | 21 → 2 | 19 | 0.150 → 0.914 |
| luger-hill | 4 | 10 | 21 → 2 | 19 | 0.150 → 0.914 |
| luger-hill | 1 | 13 | 20 → 3 | 17 | 0.150 → 0.803 |
| luger-hill | 4 | 36 | 20 → 4 | 16 | 0.150 → 0.840 |
| searound | 3 | 8 | 19 → 3 | 16 | 0.150 → 0.803 |
| space-sprint | 1 | 13 | 18 → 3 | 15 | 0.150 → 0.780 |
| searound | 1 | 13 | 17 → 3 | 14 | 0.150 → 0.780 |
| searound | 1 | 27 | 12 → 1 | 11 | 0.150 → 0.780 |
| searound | 2 | 18 | 13 → 2 | 11 | 0.150 → 0.780 |
| searound | 3 | 16 | 12 → 2 | 10 | 0.150 → 0.780 |

---

## Source hygiene

| file | lines before | after |
|---|---:|---:|
| `scripts/diag/comeback-beats.mjs` | 441 | 519 |

One file touched. The added recording carries a header saying what it owns and what it cannot
record; nothing temporary was left behind. The analysis script and the two probes live outside the
repository. No account or record was created.

**Noticed and deliberately left:** the harness's `--outcome` wrapper is documented in its usage block
as *"the control arm"* and prints `[arm: --outcome=browser]` in its own output — it was there to be
read, and last night I read past it. Nothing about it is changed here.
