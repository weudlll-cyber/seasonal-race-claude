# LBB-TRACE — one encounter, frame by frame (throwaway branch trace/lbb-encounter, NEVER merged)

Seed=1, mountainstreet/boarder, race 0, 60 s. Capture was env-gated (`LBB_TRACE=1`) and read-only.

**Inertness proven (the only gate that matters here):**
- WITHOUT-(d) variant (fix branch b11230c logic) with the dump present: `node scripts/fingerprint-default.mjs` → `0259ea6c3e75efc3` ✓
- WITH-(d) variant (master logic re-added) with the dump present: → `fa4e3796e1e5f1a5` ✓
- So the dump changes no decision in either costume.

**Column legend (stated, not interpreted):** `inZone`=pair entered the brake-zone branch this frame ·
`dY`/`thr(±)`=lateral gap vs same-lane threshold (brakeSameLaneY) · `dT`/`dTStart`/`dynBrakeT`=longitudinal
· `dir`=chooseFreeLaneDir side (`n/e`=gate not evaluated) · `tfl`=takeFreeLane (DODGE/brake) · `brake`=avoidanceActive
· `latch`=passLeaderIndex/passDir AS READ at frame start · `branch`=lateral spring that ran (pass/soft) ·
`tgtUsed`=target that branch aimed at · `ssTgt`=raw §4a target · `obst`=most-constraining obstacle index ·
`Ty`/`Ly`=trailer/leader physicalY · `Tvy`=trailer physicalYVelocity.

---

## Table 1 — the (d) divergence point: pair trailer=30 / leader=33, frames 300–325

The two costumes are byte-identical everywhere before frame 310; frame 310 is the FIRST frame any decision or
position differs between them. Both tables below are the SAME pair, SAME frames, SAME race — the two costumes.

### WITHOUT (d) — fix branch b11230c
| frame | inZone | dY | thr(±) | dT | dTStart | dynBrakeT | dir | tfl | brake | latch | branch | tgtUsed | ssTgt | obst | Ty | Ly | Tvy |
|---:|:--:|---:|---:|---:|---:|---:|:--:|:--:|:--:|:--:|:--:|---:|---:|---:|---:|---:|---:|
| 308 | Y | -0.0914 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | -1 | DODGE | · | 33/-1 | pass | -0.0402 | 0.0000 | — | -0.0369 | 0.0545 | -0.00034 |
| 309 | Y | -0.0915 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | -1 | DODGE | · | 33/-1 | pass | -0.0405 | 0.0000 | — | -0.0373 | 0.0542 | -0.00034 |
| 310 | Y | -0.0915 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | DODGE | · | 33/-1 | pass | 0.1492 | 0.0000 | — | -0.0224 | 0.0539 | 0.01486 |
| 311 | Y | -0.0763 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | DODGE | · | 33/1 | pass | 0.1489 | 0.0000 | — | -0.0063 | 0.0536 | 0.01608 |
| 312 | Y | -0.0599 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | DODGE | · | 33/1 | pass | 0.1486 | 0.0000 | — | 0.0086 | 0.0533 | 0.01497 |
| 313 | Y | -0.0446 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | DODGE | · | 33/1 | pass | 0.1483 | 0.0000 | — | 0.0222 | 0.0530 | 0.01357 |
| 314 | Y | -0.0308 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | DODGE | · | 33/1 | pass | 0.1480 | 0.0000 | — | 0.0344 | 0.0527 | 0.01223 |
| … | | | | | | | | | | | | | | | | | |
| 321 | Y | 0.0351 | 0.0950 | 0.0022 | 0.0020 | 0.0025 | 1 | DODGE | · | 33/1 | pass | 0.1459 | 0.1043 | 2 | 0.0918 | 0.0506 | 0.00583 |
| 322 | Y | 0.0413 | 0.0950 | 0.0022 | 0.0020 | 0.0025 | -1 | DODGE | · | 33/1 | pass | -0.0444 | 0.1043 | 2 | 0.0819 | 0.0503 | -0.00997 |
| 323 | Y | 0.0316 | 0.0950 | 0.0022 | 0.0020 | 0.0025 | -1 | DODGE | · | 33/-1 | pass | -0.0447 | 0.0000 | — | 0.0702 | 0.0500 | -0.01172 |

### WITH (d) — master fa4e3796
| frame | inZone | dY | thr(±) | dT | dTStart | dynBrakeT | dir | tfl | brake | latch | branch | tgtUsed | ssTgt | obst | Ty | Ly | Tvy |
|---:|:--:|---:|---:|---:|---:|---:|:--:|:--:|:--:|:--:|:--:|---:|---:|---:|---:|---:|---:|
| 308 | Y | -0.0914 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | -1 | DODGE | · | 33/-1 | pass | -0.0402 | 0.0000 | — | -0.0369 | 0.0545 | -0.00034 |
| 309 | Y | -0.0915 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | -1 | DODGE | · | 33/-1 | pass | -0.0405 | 0.0000 | — | -0.0373 | 0.0542 | -0.00034 |
| 310 | Y | -0.0915 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | brake | BRAKE | 33/-1 | soft | 0.0000 | 0.0000 | — | -0.0373 | 0.0539 | -0.00007 |
| 311 | Y | -0.0912 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | brake | BRAKE | -1/0 | soft | 0.0000 | 0.0000 | — | -0.0374 | 0.0536 | -0.00002 |
| 312 | Y | -0.0910 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | brake | BRAKE | -1/0 | soft | 0.0000 | 0.0000 | — | -0.0374 | 0.0533 | -0.00001 |
| 313 | Y | -0.0907 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | brake | BRAKE | -1/0 | soft | 0.0000 | 0.0000 | — | -0.0374 | 0.0530 | 0.00001 |
| 314 | Y | -0.0903 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | DODGE | · | -1/0 | pass | 0.1480 | 0.0000 | — | -0.0225 | 0.0527 | 0.01483 |
| 315 | Y | -0.0752 | 0.0950 | 0.0023 | 0.0020 | 0.0025 | 1 | DODGE | · | 33/1 | pass | 0.1477 | 0.0000 | — | -0.0066 | 0.0524 | 0.01599 |
| … | | | | | | | | | | | | | | | | | |
| 325 | Y | 0.0355 | 0.0950 | 0.0022 | 0.0020 | 0.0025 | 1 | DODGE | · | 33/1 | pass | 0.1447 | 0.1042 | 2 | 0.0910 | 0.0494 | 0.00579 |

Full 300–325 rows: `table-diverge-nod.md`, `table-diverge-withd.md`.

**What the columns show at frame 310 (no interpretation):** `dir` was −1 for frames 300–309 and is +1 at
frame 310 (the pair is same-lane, `|dY|`≈0.0915 < thr 0.0950). `Tvy` at frame-start is negative (−0.00034).
WITHOUT (d): `tfl`=DODGE, `branch`=pass, `tgtUsed` +0.149, `Ty` −0.037→−0.022, `Tvy` +0.0149. WITH (d):
`tfl`=brake, `brake`=BRAKE, `branch`=soft, `tgtUsed`/`ssTgt`=0.0000, `latch` clears to −1/0 for frames
310–313; at frame 314 `Tvy` is positive and `tfl`=DODGE resumes. `ssTgt`/`obst` are 0.0000/— (no
constraining obstacle) for 310–313; `obst`=2 appears at 321/325 with `ssTgt`≈0.104.

---

## Table 2 — first no-(d) flicker pair (trailer=25 / leader=5), frames 49–128

Selected as the first pair to alternate brake/dodge ≥2× in the no-(d) run. **The WITH-(d) and WITHOUT-(d)
tables for this pair over this window are BYTE-IDENTICAL** (the whole window is before frame 310). Excerpt
(one costume; the other is identical — full tables: `table-nod.md`, `table-withd.md`):

| frame | inZone | dY | dir | tfl | brake | latch | branch | tgtUsed | ssTgt | obst | Ty | Ly | Tvy |
|---:|:--:|---:|:--:|:--:|:--:|:--:|:--:|---:|---:|---:|---:|---:|---:|
| 68 | Y | -0.0316 | 1 | DODGE | BRAKE | 5/1 | pass | 0.8369 | 0.8226 | — | 0.7725 | 0.7407 | 0.00603 |
| 69 | Y | -0.0313 | n/e | brake | BRAKE | 5/1 | pass | 0.7909 | 0.8226 | — | 0.7696 | 0.7411 | 0.00235 |
| 70 | Y | -0.0281 | n/e | brake | BRAKE | 38/1 | pass | 0.7901 | 0.8225 | — | 0.7669 | 0.7414 | 0.00191 |
| 77 | Y | -0.0163 | n/e | brake | BRAKE | 38/1 | pass | 0.7839 | 0.8135 | 24 | 0.7594 | 0.7439 | 0.00211 |
| 84 | Y | -0.0128 | n/e | brake | BRAKE | 38/1 | soft | 0.8100 | 0.8100 | 24 | 0.7570 | 0.7459 | 0.00051 |
| 85 | Y | -0.0116 | n/e | brake | BRAKE | -1/0 | soft | 0.8095 | 0.8095 | 24 | 0.7560 | 0.7462 | 0.00032 |
| 90 | Y | -0.0081 | n/e | brake | BRAKE | -1/0 | soft | 0.8070 | 0.8070 | 24 | 0.7540 | 0.7473 | 0.00030 |
| 91 | Y | -0.0078 | n/e | brake | BRAKE | -1/0 | pass | 0.7720 | 0.8065 | 24 | 0.7547 | 0.7475 | 0.00122 |

**What the columns show:** `latch` cycles 5→38 (frame 70) → −1/0 (frame 85) → 38 (frame 92); `branch`
goes pass (49–83) → soft (84–90) → pass (91); at frame 69 `dT`=0.0020=`dTStart` and `tfl` becomes brake
with `dir`=n/e; when `branch`=soft (84–90) `ssTgt`≈0.807–0.810 with `obst`=24 (a third racer), while `Ly`
(leader 5)≈0.746 and `Ty`≈0.754. `brake`=BRAKE throughout this window.

---

Artifacts (gitignored): `raw-nod.json`, `raw-withd.json`, `table-nod.md`, `table-withd.md`,
`table-diverge-nod.md`, `table-diverge-withd.md`. Branch `trace/lbb-encounter` deleted after this report.
