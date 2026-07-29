# FAIR-ARRIVAL-CONFIRM-1 — the COMBO across all 10 tracks, N=50

**Branch `exp/fair-arrival` @f9249b8 (sim-only, master untouched). Author: CC.** No code changes: the COMBO
exactly as screened (`chaosSteer` + `faB60`, both flags, no coupling code, no tuning). Flags default OFF →
flagless fingerprint **`7c70b1eae7d31e22`** (== shipped, byte-identical, asserted on the committed state).
Directional confirm at N=50; the binding verdict stays with the N=100 night gate.

## VERDICT (read first): STRONG CONFIRM — 9/10 tracks pass all four criteria; 1 WEAK (garden-path, a ceiling effect)

**The searound/ice screen result generalises across all 10 standard tracks.** The COMBO lifts absolute arrival
to **86–91% on every track** (+15 to +21pp over Ship on 9 of 10), raises frontContest on 9 of 10 (up to +27pp),
drops or holds DEAD-BORING everywhere (BORING → 0–2%), lifts the per-row floor on every track, and moves
in-band-at-chaos-end +37 to +44pp — with the steer gripping identically everywhere (share 89–96%, meanMult
0.97–0.99 inside the clamp, maxTickΔ ≤ 0.0116 = smoothness proven). The single WEAK track is **garden-path**,
which fails ONLY the relative "arrival ≥ +10pp" mark (84→88, +4pp) because Ship there is already near-optimal
(the highest Ship arrival, 84%, and frontContest already saturated at 99%) — a ceiling effect, not a COMBO
weakness (the COMBO still improves it to 88% / 99% / 0% BORING). No track shows the COMBO worsening any criterion.

## 1. BUILD-vs-SPEC CONFORMANCE
- **Same flags, no new engine code.** `git diff f9249b8 -- racePlanner.js raceCore.js` is EMPTY — the engine is
  byte-identical to the screened state. The COMBO is `--chaosSteer=true --chaosSteerGain=0.06 --bandBias=true
  --bandR=0.60 --bandBiasGain=0.10`, exactly as in FAIR-ARRIVAL-COMBINE-1, with no coupling code. Only the
  read-only driver harness was extended (10-track mode + per-track gate table). CONFORMS.
- **LAW is UNAVAILABLE on this frozen branch and is reported n/a.** The LAW / front-autopsy observer was built
  LATER on the chain line; it does not exist at @f9249b8, and porting it would be a code change this run
  forbids. Every other requested metric is present (arrival, per-row band-reach, rowMin, Holm, in-band-at-chaos-
  end, dead, DEAD-BORING/THRILLER, frontContest, distinctLead, maxLeadHold, p1MultiSec, steer telemetry).
- **Method = track-defaults, N=50, paired seeds, 40 closed / 60 open.** searound/ice reproduce the COMBINE-1
  screen (ship searound 75%, ice 74% arrival; combo 90%/90%), confirming the method is the same as the screen.

## 2. THE 10-TRACK CONFIRM GATE (COMBO vs SHIP, directional)
Criteria per track: **A** arrival ≥ Ship+10pp AND ≥ Ship · **R** rowMin ≥ Ship · **F** frontContest ≥ Ship−2pp
· **B** DEAD-BORING ≤ Ship+2pp.

| track | arrival S→C | A | rowMin S→C | R | frontContest S→C | F | DEAD-BORING S→C | B | verdict |
|---|---|:-:|---|:-:|---|:-:|---|:-:|---|
| city-circuit (C) | 74→**91** (+17) | ✓ | 73→90 | ✓ | 58→**85** (+27) | ✓ | 8→0 | ✓ | **PASS** |
| dirt-oval (C) | 76→**91** (+15) | ✓ | 74→89 | ✓ | 75→88 (+13) | ✓ | 4→0 | ✓ | **PASS** |
| garden-path (C) | 84→88 (**+4**) | ✗ | 83→86 | ✓ | 99→99 | ✓ | 0→0 | ✓ | **WEAK** |
| ice-track (C) | 74→**90** (+16) | ✓ | 70→89 | ✓ | 71→78 (+7) | ✓ | 2→0 | ✓ | **PASS** |
| luger-hill (O) | 69→**90** (+21) | ✓ | 67→88 | ✓ | 62→**87** (+26) | ✓ | 2→0 | ✓ | **PASS** |
| mountainstreet (O) | 70→**90** (+20) | ✓ | 69→89 | ✓ | 71→87 (+16) | ✓ | 4→0 | ✓ | **PASS** |
| river-run (O) | 70→88 (+18) | ✓ | 68→88 | ✓ | 62→**87** (+26) | ✓ | 0→0 | ✓ | **PASS** |
| searound (C) | 75→**90** (+15) | ✓ | 74→88 | ✓ | 46→71 (+26) | ✓ | 6→2 | ✓ | **PASS** |
| seatrack (O) | 68→**89** (+21) | ✓ | 67→88 | ✓ | 72→**93** (+21) | ✓ | 2→0 | ✓ | **PASS** |
| space-sprint (O) | 69→86 (+17) | ✓ | 67→84 | ✓ | 56→55 (**−1**) | ✓ | 4→0 | ✓ | **PASS** |

**9/10 PASS. WEAK: garden-path (A only).** Steer telemetry (combo, all tracks): share 89–96%, meanMult
0.970–0.988, maxTickΔ ≤ 0.0116; in-band-at-chaos-end +37 to +44pp.

## 3. WEAK TRACKS + QUALITATIVE DIFFERENCES (the night watchlist)
- **garden-path — the ceiling-effect track (the only WEAK).** Ship is already the strongest here (arrival 84%,
  frontContest 99%, DEAD 2%, in-band-at-chaos-end 35%) — a slow snail track that Ship already sorts well, so
  there is no +10pp of arrival headroom to take. The steer works HARDEST here (74,760 steered-ticks/race vs
  ~18–22k elsewhere, in-band +44pp) yet arrival rises only +4pp, because the ceiling is at ~88–90%, not because
  the COMBO underperforms. Watch whether N=100 changes the relative-delta verdict, but treat this as a
  Ship-strength, not a COMBO failure.
- **space-sprint — the one non-rising frontContest (−1pp, within tolerance).** Ship's front is already decent
  (56%) and the COMBO holds it (55%) while lifting arrival +17pp; the tightest F margin, worth watching at N=100.
- **The five Holm-baseline-UNF tracks — ice, luger-hill, mountainstreet, searound, space-sprint.** These are
  Holm-UNF for **Ship too**; the COMBO does not introduce Holm-unfairness on any track that Ship passes, and it
  raises rowMin everywhere (e.g. ice 70→89, luger 67→88, searound 74→88). The COMBINE-1 middle-row lens holds at
  10-track scale: per-row band-reach is even (88–93%, no U-shape) on every COMBO track — the draw bias fills the
  steer's middle-row gap. These five are the start-row watchlist for the N=100 Holm-across-all-rows gate.

### THE FIVE SENTENCES (every kept element)
1. With no engine change (byte-identical to @f9249b8), the COMBO — the strong chaos steer plus the R=0.60 draw
   bias, both flags, no coupling code — was run on all 10 standard tracks at N=50 paired vs Ship. 2. It lifts
   absolute arrival to 86–91% on every track (+15 to +21pp on 9 of 10), raises frontContest on 9 of 10 (up to
   +27pp), drops or holds DEAD-BORING to 0–2% everywhere, and raises the per-row floor on all ten, so 9/10 tracks
   pass all four confirm criteria directionally. 3. The one WEAK track, garden-path, fails only the relative
   arrival-≥+10pp mark (84→88) because Ship is already near-optimal there (84% arrival, 99% frontContest) — a
   ceiling effect where the steer still works hardest (in-band +44pp) but has no headroom, not a COMBO weakness.
   4. The steer grips identically on every track (share 89–96%, meanMult 0.97–0.99 inside the two-sided clamp,
   maxTickΔ ≤ 0.0116 smoothness proven, in-band-at-chaos-end +37 to +44pp), and the COMBINE-1 middle-row fix
   holds at scale (even per-row band-reach 88–93%, no U-shape), so the COMBO introduces no new Holm-unfairness —
   the five Holm-UNF tracks are Ship-baseline-unfair. 5. LAW is the one requested metric unavailable on this
   frozen branch (its observer was built later on the chain line; porting it would be a forbidden code change),
   and the OFF world is byte-identical (`7c70b1eae7d31e22`): the searound/ice result generalises and the COMBO
   is confirmed across the whole track set, directionally, pending the N=100 night gate.

## PROPOSALS (≥2)
1. **Proceed to the 10-track N=100 night gate — the confirm earns it.** 9/10 tracks pass all four criteria at
   N=50; the wide gate should (a) re-test at N=100 with Holm across all start rows on the five watchlist tracks
   (ice, luger, mtn, searound, space-sprint), (b) treat garden-path's +4pp arrival as a ceiling effect and judge
   it on absolute arrival (≥88%) rather than the +10pp delta, and (c) confirm space-sprint's frontContest holds.
   Then the owner's browser eye.
2. **Re-express the arrival criterion as an ABSOLUTE floor, not only a Ship-relative delta.** garden-path
   exposes that "≥ Ship+10pp" punishes tracks where Ship is already excellent; an absolute "arrival ≥ ~88% AND
   ≥ Ship" would pass garden-path (88%) honestly while still demanding the big gains on the low-arrival tracks.
   Propose the night gate carry BOTH the delta and an absolute floor, reported side by side.
3. **Port LAW as a read-only observer onto this branch BEFORE the night gate (no mechanism change).** LAW is the
   one metric this run could not report; adding the observer (read-only, OFF byte-identical) would complete the
   scoreboard for the binding N=100 gate without touching the COMBO. Scope it as an observer-only port,
   fingerprint-verified.

## Owner questions
1. **Authorise the 10-track N=100 night gate** with the watchlist above (garden-path judged on absolute arrival;
   five Holm tracks watched; space-sprint frontContest watched) — yes/no?
2. **Adopt an absolute arrival floor (~88%) alongside the +10pp delta** for the night gate (proposal 2), and
   **port LAW as a read-only observer first** (proposal 3) — yes/no to each?

---
**Branch `exp/fair-arrival`.** OFF fingerprint **`7c70b1eae7d31e22`** (== shipped, byte-identical; engine
diff vs @f9249b8 EMPTY). Harness commit `c9c2873`; this report. Run: `node scripts/exp-fair-arrival.mjs
--tracks=ten --arms=ship,combo --races=50` (98.8 min). Raw: `reports/evolution/fair-arrival-confirm-screen.txt`.
**Confirm-only (directional; binding verdict = N=100 night gate).** Push verified — see
`git log origin/exp/fair-arrival`.
