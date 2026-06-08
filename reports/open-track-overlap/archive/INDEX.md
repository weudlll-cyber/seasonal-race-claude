# open-track-overlap — Archive Index

**What this effort was:** A months-long investigation into visible racer body-stacking on open tracks (Space Sprint × plane, River Run × dragon). Root cause: physics was computing in a different coordinate space than the renderer — mixed-unit scale errors, normalized thresholds not calibrated to body size, and a gate that rejected the very pairs that needed avoidance. Resolved with a scale cleanup, a geometric two-axis body-contact gate, and body-based speed-brake on both axes. Merged to master at commit `bc53ae1` (2026-06-08). Recovery tags: `backup/pre-merge`, `backup/y-reject-fair`.

---

## step1-avoidance/ (14 files)

Reports 01–14. The first phase of the investigation: diagnosing visible pass-through on Space Sprint (dragons/planes crossing longitudinally) and building Step 1 of the avoidance rebuild — a brake-to-match cap plus a narrower brake-activation zone. This phase diagnosed the symptom (rubber-band boost overcoming the speed-brake at dT→0) and built the first structural fix (Step 1 operationalization, implementation, activation-zone experiments, and bypass-fix for the Y-reset regression). Full N=50 verification closed out this phase before Step 2 work began.

| File | Description |
|---|---|
| 01-space-sprint-dragon-brake-scan.md | Initial brake scan: N=9 races, lateral force vs home force grid identifying the overlap conditions |
| 02-space-sprint-dragon-lf-hf-grid.md | lateralForce × homeForce 2D parameter sweep for overlap reduction |
| 03-comeback-racer-pass-through-diagnosis.md | Comeback racer pass-through root cause: rubber-band boost overcomes speed-brake at dT→0 |
| 04-overtaking-pass-through-source-fault.md | Source fault confirmed: rubber-band + brake-to-match architecture gap |
| 05-avoid-first-brake-to-match-design.md | Design spec for the avoid-first / brake-to-match architecture (Step 1) |
| 06-step1-operationalization.md | Step 1 operationalization: activation zone, Y-threshold, brake-match cap formulas |
| 07-step1-implementation-report.md | Step 1 implementation report: brake-match cap + narrower zone built |
| 08-step1-diagnostic-report.md | Step 1 diagnostic: N=10 fairness checks, Y-reset regression found |
| 09-step1-bypass-fix-report.md | Bypass fix for the LF-reset regression (parity bug in sim brake-to-match) |
| 10-activation-zone-experiment.md | Activation zone experiment: two-zone arch (avoidanceActive wide, brakeMatch narrow) |
| 11-t-only-experiment.md | T-only braking experiment: longitudinal-only speed-brake gating |
| 12-open-track-only-experiment.md | Open-track-only guard experiment for the brake-match zone |
| 13-manta-verification-and-full-sweep.md | Manta verification and full N=50 Step 1 sweep |
| 14-step1-full-verification.md | Step 1 N=50 full sweep across all 10 tracks — gate confirmed |

---

## step2-direction/ (12 files)

Reports 10-step2, 15–26. Stage A–D of the lateral direction logic rebuild: the avoid-first concept, Stage A clearance accumulators, Stage B same-lane detection with leader-relative commit direction, Stage C free-lane integration, and Stage D gap force. The central bug in this phase was force cancellation (Stage B direction + natural avoidance force opposing each other in dense fields), diagnosed in report 20 and fixed with leader-relative direction in report 21.

| File | Description |
|---|---|
| 10-step2-design.md | Step 2 design doc (initial): avoid-first architecture for lateral direction selection |
| 15-step2-design.md | Step 2 design doc (revised): full Stage A–D plan with fairness gates |
| 16-stageA-skeleton.md | Stage A skeleton: clearance accumulator population (budget-neutral) |
| 17-stageB.md | Stage B: same-lane commit + deadlock resolution (leader-relative tiebreak) |
| 18-stageB-overlap.md | Stage B overlap measurement: dragon overlap −22% on all open tracks |
| 19-stageB-fix.md | Stage B fix: both-sides-occupied deadlock + forward tiebreak regression |
| 20-avoid-first-diag.md | Avoid-first diagnosis: force cancellation root cause (Stage B vs natural avoidance) |
| 21-leader-relative-fix.md | Leader-relative direction fix: eliminates force cancellation in dense fields |
| 22-stageC.md | Stage C: two-part switch gate (adjacent + forward clearance) |
| 24-stageD-gap-diag.md | Stage D gap-force diagnosis: gap impulse design |
| 25-centering-force-diag.md | Centering force diagnosis for Stage D |
| 26-gap-force.md | Stage D gap force implementation and verification |

---

## scale-breaks/ (9 files)

Reports 27–36. Discovery and cleanup of four mixed-unit scale errors that made physics-px ≠ render-px throughout the entire codebase. Key errors: `getActualTrackWidth()` returned 449px for a 300px track, `physicalSpriteSize × bodyFillX` was not the drawn body width, and raw `physicalY × trackWidth` was off by 2× vs the EditorShape convention. Fixed by establishing three SOTs, routing all conversions through `pxToPhysicalY`/`physicalYToPx`, renaming 9 fields, and a targeted L515 fix for the free-lane lateral sensor.

| File | Description |
|---|---|
| 27-overlap-definition.md | Honest overlap metric definition: body-extent overlap (not center-proximity) |
| 28-scale-audit.md | Scale audit: three mixed-unit sources identified (trackWidth, bodyWidth, lateral helpers) |
| 29-size-width-inventory.md | Size/width inventory: per-racer bodyNarrow measurements, old vs new body widths |
| 31-scale-cleanup-final.md | Scale cleanup final plan: SOT table, 9 field renames, 6 denominator fixes |
| 32-true-body-size.md | True body size: drawnBodyWidthPx = bodyRef.bodyNarrow (not frame × fill) |
| 33-scale-cleanup-addendum.md | Scale cleanup addendum: drawnBodyLengthPx derivation, sim parity |
| 34-scale-build.md | Scale build execution report: all SOTs fixed, tests pass, sim updated |
| 35-side-separation-diag.md | Side-separation diagnostic: pxToPhysicalY helper validates clean body overlap |
| 36-l515-fix.md | L515 fix: free-lane lateralHalfSpan routed through pxToPhysicalY (off-by-2 removed) |

---

## gate-root/ (3 files)

Reports 37–39. Live diagnosis of the mixed-unit avoidance gate (the actual root cause of the stacking) and construction of the replacement geometric gate. Report 37 diagnosed the px-nearness issue in overlay tool output. Report 38 confirmed the broken gate: pairs at 29.5px apart were rejected because `0.1664 ≥ 0.165` — off by one unit. Report 39 built the two-axis body-contact gate with `contactWidth = hwA+hwB`, `bufferPct=0.20`, and the gate-wider-than-inner-check invariant.

| File | Description |
|---|---|
| 37-longitudinal-and-pair-selection.md | Longitudinal probe + pair-selection fix: screen-pixel 2D distance for overlay |
| 38-px-nearness-fix.md | Root cause confirmed: mixed-unit gate rejects touching pairs (0.1664 ≥ 0.165) |
| 39-geometric-gate-build.md | Geometric gate build: pairContact(), sum-of-half-sizes, bufferPct=0.20, gate invariant |

---

## fairness-baseline/ (3 files)

Reports 40, 41, 46. Fairness measurement and the new post-fix baseline. Report 40 diagnosed why the initial fairness sweep showed Front-Bias (Race Plan was OFF — wrong mode). Report 41 is the formal fairness baseline: N=50, Race Plan ON, 64/66 χ² pass at seed=0, overlap=0.0% on all 66 combos. Report 46 is the overnight merge-gate sweep: 61/66 pass (same framework, different seed=0 draw), all 5 seed-0 fails confirmed noise, branch merged.

| File | Description |
|---|---|
| 40-frontbias-diag.md | Front-bias diagnosis: Race Plan OFF ≠ production mode; all three combos pass with RP ON |
| 41-baseline-sweep.md | Full 66-combo fairness baseline: N=50, RP ON, seed=0. 64/66 pass, overlap=0% all combos. |
| 46-overnight-sweep.md | Overnight merge-gate sweep: 61/66 pass, 5 noise fails confirmed, branch merged bc53ae1 |

---

## rocket/ (4 files)

Reports 42–45. The Seatrack × rocket regression discovered during the overnight sweep (p=0.016 structural, 2/3 seeds failing) and its two-part fix. Report 42 diagnosed the regression as caused by the scale cleanup changing Seatrack width 395px→300px (adding a 4th row, densifying the field), not the gate fix. Reports 43–45 replaced the frame-based speed-brake zones with body-based ones: first the longitudinal axis (frame×1.5 → bodyLength×1.5), then the lateral axis (normalized 0.18 → same-lane contact-width filter, ×1.0, no lead-time multiplier).

| File | Description |
|---|---|
| 42-rocket-brake-regression-diag.md | Regression diagnosis: scale cleanup caused Seatrack width change (395→300px); gate not responsible |
| 43-speedbrake-body-fix.md | Longitudinal fix (report 43): dynamicBrakeT = bodyContactLength/pathLength × 1.5 |
| 44-speedbrake-lateral-concept.md | Lateral conceptual analysis: lateral = same-lane filter, not brake driver; ×1.5 is longitudinal-only |
| 45-speedbrake-lateral-fix.md | Lateral fix (report 45): brakeSameLaneY = pxToPhysicalY(contactWidth, trackWidth), no multiplier |

---

## misc/ (1 file)

| File | Description |
|---|---|
| DOCS-TODO.md | Incremental doc-update checklist accumulated during the investigation |
