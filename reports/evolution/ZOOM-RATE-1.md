# ZOOM-RATE-1 — `d ln(width)/dt` becomes a first-class quantity

**Date:** 2026-08-23 · **Branch:** `feat/zoom-rate-instrument` off master
**Piece 12 of NIGHT-2026-08-22.** **INSTRUMENT ONLY. WIRED INTO NOTHING. NOTHING TUNED AGAINST IT.**

---

## WHY IT EXISTS

Every camera bound this project owns is on a **position**, a **width**, or a **per-frame step**. None
of them can see how fast the picture is *opening or closing* — and CAMERA-CURVE-1's answer 2 found
that the term that moves the picture at the moments the owner describes is **the ZOOM, not the pan**.
Its P1 asked for exactly this. `scripts/zoom-rate-truth.mjs` is it.

**Logarithms, because the eye reads zoom multiplicatively.** 2 corridors → 4 and 4 → 8 look like the
same move, and only a log rate gives them the same number. 1.0 ln/s is an e-fold per second;
0.69 ln/s is a doubling per second.

**Sign convention, and it is a real choice:** the director's `zoom` is a scale factor, so a *bigger*
zoom is a *narrower* picture. This reports the **WIDTH** rate — positive is **opening**, negative is
**closing**. Reporting the zoom rate instead would invert every sign against the way a viewer
describes what they see, which is how a measurement gets read backwards a month later.

## THE DISTRIBUTION — two contrasting tracks, seed 9, 40 racers, 60 Hz

| | **dirt-oval** (closed) | **river-run** (open) |
| --- | ---: | ---: |
| frames | 5588 | 3862 |
| median over ALL frames | **0.0000** | **0.0000** |
| **median while it MOVES** | **0.1949 ln/s** | **0.0811 ln/s** |
| p90 (all frames) | 0.4775 | 0.4905 |
| p99 | **2.020** | **1.935** |
| **max** | **7.468 ln/s** | 3.185 ln/s |
| frames above the reference line | 930 (**16.6%**) | 647 (**16.8%**) |
| opening / closing / still | 951 / 786 / 3851 | 1160 / 684 / 2018 |
| peak | **closing** 7.468 at p 0.105, LEADER_ZOOM | **opening** 3.185 at p 0.941, BATTLE_ZOOM |

### Three things the numbers say

**1 · The zoom is stationary about two-thirds of the time, and the all-frames median of 0.0000 is
true but useless as a headline.** That is why the instrument reports both: the median *while it
moves* is 0.195 and 0.081 ln/s. **This reconciles with CAMERA-CURVE-1's quoted "p50 ≈ 0.1 ln/s"** —
that figure is the moving median, not the all-frames one, and the two documents do not disagree.

**2 · The two tracks agree closely on the ordinary and disagree on the extreme.** p90 within 3%
(0.478 vs 0.491), share above the reference line within 0.2 points (16.6% vs 16.8%), p99 within 4%
(2.02 vs 1.94) — **and the peak differs by 2.3×** (7.47 vs 3.19). The body of the distribution is a
property of the design; the tail is a property of the track and the moment.

**The p99 of ~2.0 also matches CAMERA-CURVE-1's recorded peak of 2.08 ln/s**, which is a useful
cross-check between an instrument built tonight and one built on a browser dump.

**3 · A RATE IS NOT A JUMP, and the instrument now says so on its own peak line.** 7.468 ln/s
sustained for one frame at 60 Hz is **×1.133 of the width in that frame** — noticeable, not
catastrophic. Printing `7.468` without that conversion is how a number gets quoted into a panic.

### Where the peaks sit

**dirt-oval clusters at 0.1–0.2** (7.468, the largest anywhere) with secondary peaks at 0.4–0.5
(3.179) and 0.9–1.0 (3.409). **river-run is flatter**, peaking at 0.6–0.7 (3.179) and 0.9–1.0
(3.185), and has one decile — **0.8–0.9 — where the zoom does not move at all**.

**Both tracks peak in their last decile**, which is the endgame schedule, and that is the one place
the design intends a large authored move.

---

## WHAT WAS DELIBERATELY NOT DONE

**It is wired into nothing.** No gate, no guard, no `verify` route, no declaration, and nothing was
tuned against it. **That is the brief's instruction and it is also the standing lesson**: an
instrument that judges before it is trusted has misled this project before — the label-names harness
returned a confident zero that took three defects to explain, and it is recorded in the CORRECTIONS
block of `reports/evolution/INDEX.md`.

**The reference line is borrowed, not invented.** `scripts/diag/endgame-spec.mjs` already carries
RUNIN-HOLD-1's own perceptibility figure as `STILL = 95 / (CW / 2)` ≈ 0.1484 ln/s. It is printed as a
line on the distribution and the output says in words that nothing passes or fails against it.

**It reuses the shared driver.** `scripts/lib/raceDriver.mjs`, as ordered. Three driver copies
already exist by deliberate argument (`docs/BACKLOG.md`); a fourth for a read-only distribution would
be a copy nobody argued for.

---

## VERIFICATION

| instrument | ran? |
| --- | --- |
| `zoom-rate-truth.mjs` itself | **RAN** on both tracks; output above |
| `npm run verify` | **RAN** — see the merge commit |
| world / camera / render fingerprints | **NOT RUN, and proved unreachable:** `engine-reach --check` puts the new file outside the hull, and no fingerprint driver imports it. It is a leaf — nothing in the repository imports it at all. |
| client suite | **NOT RUN** — nothing under `client/` changed |
| browser gate, 80-race sheet | **NOT RUN** — R15a/R15c |

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| build it as a read-only instrument in the existing measurement family | done — `scripts/*-truth.mjs`, same header shape, same CLI idiom, same `--json` |
| reuse the shared race driver rather than carrying its own | done — `scripts/lib/raceDriver.mjs` |
| report the distribution on TWO contrasting tracks, median and tail | done — one closed, one open; median (both kinds), p90, p99, max |
| and where in the race the peaks sit | done — per-decile maxima with the states |
| **do NOT wire it into any gate, guard or verify path** | **not wired anywhere.** Nothing imports it; it declares nothing |
| **tune nothing against it** | **nothing was tuned.** No default, no key, no threshold |

## SOURCE HYGIENE

| | |
| --- | --- |
| added | `scripts/zoom-rate-truth.mjs` (~190 lines, roughly half of it the reasoning) |
| removed / changed | **nothing** |
| shipped source changed | **none** |

**NOTICED BUT LEFT:**

- **The fixed 60 Hz frame clock is a real limit for a RATE**, more than for a position: on a machine
  that drops frames the same move spreads over fewer, larger steps and the measured rate changes.
  `--frame-ms=` is offered so the difference can be measured rather than argued about, **but it was
  not measured tonight** — that is a second run and a second finding.
- **One seed, one field size.** The distribution's body looks like a design property because two very
  different tracks agree on it; that is suggestive, not established. Three seeds would settle it.
- **`state` comes from `cd.state ?? cd._state`.** The public getter is preferred; the fallback exists
  because not every director version in this tree exposes one, and a null state would silently
  blank the decile column.

## PROPOSALS — for the owner, nothing done

1. **Run it at three seeds and both field sizes before anyone quotes a number from it.** Tonight's
   agreement between two tracks on p90 and on the 16.6/16.8% share is the interesting result, and it
   rests on one seed. **Cost:** about six runs of a few minutes each. **Value:** it is the difference
   between "the design produces this distribution" and "one race did".
2. **Give `camera-curve.mjs` this column, which is also PIECE 11's named next step.** That report
   found city-circuit's three deviating bends all contain a moving zoom while the whole-race median
   rate is zero — a correlation across three windows. Emitting the rate beside the per-bend deviation
   from ONE arm is what would turn it into a mechanism. **Cost:** one column on an existing
   instrument, on a dump that has to be taken anyway. **This is the single most useful thing to do
   with the quantity next**, and it is a measurement rather than a change.
