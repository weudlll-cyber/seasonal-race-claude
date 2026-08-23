# CITY-CIRCUIT-BENDS-1 — the three deviating bends are the track's GENTLEST curves

**Date:** 2026-08-23 · **Piece 11 of NIGHT-2026-08-22.**
**DIAGNOSE ONLY — nothing was repaired, and nothing here proposes a repair.** Nothing is fixed that
has not been explained, and this pass explains part of it and says which part it does not.

---

## THE HEADLINE

**It is not geometry, and it is not the projection. Both are refuted with numbers, and the geometry
refutation is decisive because it runs the wrong way.**

CAMERA-CURVE-1 found three of city-circuit's fourteen bends deviating **6.5–17.5% of the frame
width** while the other eleven deviate 1–6 px. **Measured tonight, those three are the GENTLEST
curves on the track and the sharpest curves are among the eleven that behave.**

| bend | window | deviation | peak curvature | **radius** | percentile of \|curvature\| |
| ---: | --- | ---: | ---: | ---: | ---: |
| 3 | 0.054–0.062 | 6.5% | 2.24e-4 | **4463 px** | **26th** |
| 4 | 0.082–0.089 | 7.3% | 3.10e-4 | **3221 px** | **30th** |
| 23 | 0.876–0.893 | **17.5%** | 1.26e-3 | **796 px** | 53rd |

**Against the track's actual corners** — the sharpest sixth of it, none of which deviates:

| progress | 0.68 | 0.12 | 0.28 | 0.80 | 0.60 | 0.76 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| radius | **359 px** | 387 | 428 | 431 | 441 | 442 |

**Corner-cutting scales WITH curvature. This anti-correlates with it.** The camera deviates most
where the road is straightest and least where it actually turns. Whatever the three share, it is not
that they are corners.

## §1 — WHAT THE DEVIATION IS MEASURED AGAINST, established first

From CAMERA-CURVE-1 §1, and it matters because it rules out an obvious wrong reading:
**the perpendicular distance from the delivered camera centre to the TARGET's own trajectory** — the
nearest point of the path, not the distance to the target point.

**So a camera that is LATE but round scores 0, correctly.** The number is not lag; it is
off-the-path displacement. That is why "the smoother is behind" cannot be the explanation and why
that report's answer 2 already said *"Not the pan smoother… the smoother is late along it, not off
it."*

## §2 — PROJECTION IS REFUTED, by the control track

| | city-circuit | space-sprint |
| --- | --- | --- |
| world | 3072 × 2047 | 6000 × 4000 |
| world aspect | 1.5007 | 1.5000 |
| canvas aspect | 1.7778 | 1.7778 |
| **stretch (canvasAR / worldAR)** | **1.1846** | **1.1852** |
| centreline length | 6143 px | 19267 px |
| **sharpest curve** | radius **359 px** | radius **199 px** |
| deviating bends | **3 of 14** | **0** |

**The two tracks have the same projection stretch to four significant figures, and the one with the
SHARPER curves shows no effect at all.** A projection property that produced this would produce it on
both.

*(A note so a later reader does not think two documents disagree: CAMERA-CURVE-1 records this as
"effY/effX 0.8442" and I compute 1.1846. **They are reciprocals of the same fact** — 1/1.1846 =
0.8442 — and which one is called `effY/effX` depends on the projection's own convention, which I did
not re-derive. Nothing turns on it here: the point is that the two tracks agree, whichever way it is
written.)*

## §3 — WHAT THE THREE SHARE: the zoom is MOVING inside all of them

Driven headless on city-circuit, seed 9, 40 racers, shipped config, sampling `d|ln zoom|/dt` per
frame. **The whole-race median is exactly 0.0000 ln/s** — the zoom is stationary most of the time,
which is what makes any non-zero window stand out.

| bend | deviation | **median d\|ln z\|/dt inside** | max | zoom across the window | state(s) |
| ---: | ---: | ---: | ---: | --- | --- |
| 3 | 6.5% | **0.0877 ln/s** | 0.100 | 6.991 → 7.329 | LEADER_ZOOM |
| 4 | 7.3% | **0.2195 ln/s** | 0.249 | 5.889 → 6.461 | LEADER_ZOOM |
| 23 | **17.5%** | 0.0000 | **0.935** | **9.098 → 12.406** (+36%) | **LEAD_CHANGE → BATTLE_ZOOM** |
| — | *whole race* | **0.0000** | 7.567 | | |

**Two shapes, not one, and the deviation ranking follows the zoom:**

- **Bends 3 and 4 sit inside a SUSTAINED zoom** — a median rate of 0.088 and 0.220 ln/s against a
  whole-race median of zero. Bend 4 has the higher rate and the higher deviation of the two.
- **Bend 23 contains a STATE TRANSITION and the largest zoom excursion of the three** — a 36%
  widening and a transition from LEAD_CHANGE into BATTLE_ZOOM. It also has by far the largest
  deviation, and it is the one CAMERA-CURVE-1 noted peaks at 100% through the bend rather than in
  the middle — i.e. at the end of the window, which is where an event sits, not where a corner is.

**This is consistent with CAMERA-CURVE-1's own answer 2** — *"Where the picture moves fastest the
term is the ZOOM"* — and it extends it: the same term appears to be what separates the three from
the eleven.

## §4 — WHAT THIS PASS DOES **NOT** ESTABLISH, stated plainly

**I did not reproduce CAMERA-CURVE-1's deviation measurement itself.** I measured the track's
geometry (which is arm-independent — it is a property of the committed file) and what the camera does
inside those progress windows. **The link between "the zoom is moving here" and "the perpendicular
deviation is large here" is a CORRELATION across three windows, not a demonstrated mechanism.**

**And the two runs are not the same arm**, which is the sharpest limitation:

- CAMERA-CURVE-1 measured **his config** from a **browser dump**; this pass ran the **shipped config**
  in the **headless driver**.
- **The states disagree**: that report records bend 23 in **OVERVIEW**; my run has it in
  **LEAD_CHANGE → BATTLE_ZOOM**. That is exactly the browser-versus-headless divergence already on
  record, and it means the state column is arm-dependent even though the geometry is not.

**So the geometry and projection refutations stand on their own; §3 is a lead, and a strong one.**

---

## THE NAMED NEXT STEP

**Re-run `scripts/diag/camera-curve.mjs` on a `viewer-invariants --dump` of city-circuit, and emit
`d ln(width)/dt` alongside the per-bend deviation it already computes.** That puts both quantities in
one file from one arm, which is the one thing that would turn §3 from a correlation into a mechanism
— and it is the same instrument, one column wider, on a dump that has to be taken anyway.

**Do that before anything is changed.** The deviation ranking (17.5% / 7.3% / 6.5%) and the zoom
ranking (state change + 36% / 0.220 / 0.088) agree across all three, which is encouraging and is also
exactly the kind of agreement that three points can produce by chance.

---

## VERIFICATION

| instrument | ran? |
| --- | --- |
| curvature over the committed geometry, 2000 samples, two tracks | **RAN** |
| headless driven race, per-frame zoom rate, two tracks | **RAN** |
| fingerprints, suites, gates | **NOT RUN, determined by construction: this piece changed no file** other than adding this report. Both probes live in the scratchpad. |

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| establish what the deviation is measured against | done — §1: perpendicular distance to the target's own path, so lag scores 0 |
| geometry, projection or camera? | **geometry REFUTED** (§, and it runs the wrong way), **projection REFUTED** (§2, via the control track), **camera indicated** (§3) |
| do the three share something the other eleven do not? | **yes — the zoom is moving in all three while the whole-race median rate is exactly zero.** Two shapes: a sustained zoom in the two early ones, a state change plus a 36% widening in the third |
| does a second contrasting track show the same family? | **no — space-sprint shows none, and its curves are SHARPER** (min radius 199 px against 359). That is what makes the geometry refutation a control rather than an assertion |
| deliverable: an explanation with numbers and a named next step | done, with §4 saying which part is a correlation rather than a mechanism |
| **diagnose, do not repair** | **nothing was repaired and nothing is proposed to be** |

## PROPOSALS — for the owner, nothing done

1. **Take the dump the next step needs while a camera dump is being taken anyway.** `viewer-invariants
   --dump` on city-circuit at his config is the input `camera-curve.mjs` wants, and the marginal cost
   of adding one track to a dump run is small compared with taking one for this alone.
2. **Treat the state disagreement as its own finding.** Bend 23 is OVERVIEW in the browser arm and
   LEAD_CHANGE → BATTLE_ZOOM in the headless one, at the same progress on the same track and seed.
   **That is a fourth proven browser-versus-headless divergence** if it holds, and the existing three
   are already recorded. **Cost:** confirming it needs the browser arm run once with the state logged
   — cheap, but it is a measurement and so not something this piece started.
