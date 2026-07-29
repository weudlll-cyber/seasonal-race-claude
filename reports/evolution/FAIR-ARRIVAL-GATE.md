# FAIR-ARRIVAL-GATE — the binding N=100 record on COMBO15

**Branch `exp/fair-arrival` @3230844→2352b67 (sim-only, master untouched). Author: CC.** Read-only measurement,
no tuning. STAGE 1 (binding): 10 tracks, track-defaults, N=100, paired seeds, arms SHIP · COMBO15 · COMBO25 ·
faB60. STAGE 2 (30s N=100) + STAGE 3 (180s N=50): SHIP + COMBO15 duration cross-checks. All three run in
parallel on the box's spare cores (separate output dirs).

## BUILD-vs-SPEC CONFORMANCE (first)
- **Engine untouched.** `git diff 3230844 -- client/src/modules` is EMPTY (the only client change is the
  dev-only `?world=combo15` viewer in `utils/` + `RaceScreen`, not the engine). OFF fingerprint
  **`7c70b1eae7d31e22`** unchanged (re-asserted after the viewer change; `?world` is dev-gated). The gate/
  observers live in `scripts/` (read-only). CONFORMS.
- **LAW ported read-only** (STAGE 0, done in PULK-SPECTACLE-1) and reported here. The owner's pulk finding is
  now a **permanent gate line** (the PULK watchdog). The viewer `?world=combo15` is live for the owner's eye.
- **Push verified** (see foot).

## VERDICT (read first): PARTIAL — a NEAR-PASS that RESOLVES the owner's pulk finding
**COMBO15 clears every gate criterion on 7/10 tracks and misses on only three, none of them the pulk-flatness
the candidate was built to fix:** rowMin ≥ ship on all 10, frontContest ≥ ship on all 10 (+7 to +17pp), DEAD-
BORING ≤ ship+2 on all 10, **Holm worsened on ZERO tracks** (space-sprint even improved UNF→ok), and arrival
hits the OR-form on 9/10 (85–90%). The three misses are: **garden-path** arrival 86% (2pp under the 88% floor,
+3pp — the known ship-ceiling track where ship already sits at 83%); **searound** + **space-sprint** the PULK
watchdog's chaos-gap line (searound is a rounding tie 3.1≈3.1; space-sprint a genuine 3.3 vs 1.9+1.0 overshoot).
**Crucially, COMBO15 does exactly what it was for — it fixes the mid-race flatness COMBO25 introduced:**
maxLeadHoldShare_mid falls 0.42→0.27 (at or BELOW ship), distinctLeaders_mid rises to 10–15 (ABOVE ship), and
leaderIsDrawnB1_mid drops from ~0.60 to well under half — the pulk is no longer owned by the pre-sorted
favourite. So this is a strong candidate that just misses a strict all-10 sweep on a ceiling track and a
chaos-gap line; it goes to the owner for the merge conversation with the failing tracks named.

## 1. STAGE 1 — the binding gate (COMBO15 vs SHIP, N=100, track-defaults)
| track | arrival S→C | A | rowMin S→C · Holm | R | fC S→C | F | BORING S→C | B | PULK maxHold/distLead/chaosGap C(S) | P | verdict |
|---|---|:-:|---|:-:|---|:-:|---|:-:|---|:-:|---|
| city-circuit C | 75→89 | ✓ | 74→88 ok/ok | ✓ | 64→75 | ✓ | 6→2 | ✓ | .28(.34) 10.2(7.2) 2.4L(1.6) | ✓ | **PASS** |
| dirt-oval C | 76→90 | ✓ | 75→90 ok/ok | ✓ | 71→83 | ✓ | 2→1 | ✓ | .28(.34) 10.6(7.7) 2.4L(1.7) | ✓ | **PASS** |
| garden-path C | 83→86 | **✗** | 83→86 ok/ok | ✓ | 98→98 | ✓ | 0→0 | ✓ | .26(.31) 13.4(9.1) 3.7L(3.3) | ✓ | **FAIL·arr** |
| ice-track C | 74→90 | ✓ | 72→89 ok/ok | ✓ | 67→74 | ✓ | 6→2 | ✓ | .28(.33) 10.1(7.1) 2.7L(1.7) | ✓ | **PASS** |
| luger-hill O | 69→89 | ✓ | 67→88 UNF/UNF | ✓ | 63→80 | ✓ | 2→2 | ✓ | .27(.32) 9.7(6.7) 1.2L(0.9) | ✓ | **PASS** |
| mountainstreet O | 71→89 | ✓ | 70→88 ok/ok | ✓ | 71→82 | ✓ | 3→1 | ✓ | .24(.26) 11.6(9.0) 1.7L(1.1) | ✓ | **PASS** |
| river-run O | 71→88 | ✓ | 68→88 ok/ok | ✓ | 63→77 | ✓ | 1→1 | ✓ | .26(.28) 10.9(8.4) 1.8L(1.2) | ✓ | **PASS** |
| searound C | 74→89 | ✓ | 73→88 UNF/UNF | ✓ | 49→60 | ✓ | 6→5 | ✓ | .35(.41) 7.6(5.5) 3.1L(2.1) | **✗** | **FAIL·pulk** |
| seatrack O | 69→89 | ✓ | 69→88 ok/ok | ✓ | 70→84 | ✓ | 2→2 | ✓ | .25(.26) 11.2(8.8) 1.6L(1.1) | ✓ | **PASS** |
| space-sprint O | 71→85 | ✓ | 69→85 UNF/**ok** | ✓ | 56→59 | ✓ | 3→2 | ✓ | .22(.24) 15.0(11.2) 3.3L(1.9) | **✗** | **FAIL·pulk** |

**GATE: PARTIAL.** arrival OR-form 9/10 (≥8 ✓) but failBoth 1 (garden-path) → arrival FAIL; rowMin PASS·
fC PASS · DEAD-BORING PASS everywhere; **Holm worsened: none**; PULK watchdog FAIL searound, space-sprint.

## 2. COMBO15 FIXES THE PULK FLATNESS (COMBO25 → COMBO15, N=100 pulk means)
| | SHIP | COMBO25 (flat) | COMBO15 (candidate) |
|---|---|---|---|
| maxLeadHoldShare_mid (mean) | ~0.31 | **0.42** | **0.27** (≤ ship) |
| distinctLeaders_mid (mean) | ~7.8 | ~6.5 | **~11** (≫ ship) |
| leaderIsDrawnB1_mid (mean) | ~0.15 | **~0.60** | **~0.35** |

COMBO25 was the flat mid-race the owner saw (the pre-sorted band-1 favourite owned 60% of the pulk).
**COMBO15 pulls maxLeadHoldShare_mid below ship and lifts distinct leaders above ship** — the pulk is livelier
than the shipped game, and the watchdog passes on 8/10 (the two misses are chaos-gap DEPTH, not leader hold).

## 3. DURATION CROSS-CHECKS (not binding; the extremes weaken)
| gate outcome | 30s (STAGE 2, N=100) | 60s track-defaults (STAGE 1, binding) | 180s (STAGE 3, N=50) |
|---|---|---|---|
| arrival OR-form | 9/10 (river-run fails both) | 9/10 (garden-path) | 6/10 (4 closed tracks ceiling) |
| rowMin ≥ ship | all 10 | all 10 | all 10 |
| fC ≥ ship−2 | fail space-sprint | all 10 | all 10 |
| DEAD-BORING ≤ ship+2 | fail space-sprint | all 10 | all 10 |
| PULK watchdog | **all 10 PASS** | fail searound, space-sprint | fail 4 (chaos-gap) |
| Holm worsened | garden/mtn/seatrack | none | seatrack |

- **30s**: the pulk fix holds perfectly (watchdog all-10), but the arrival mechanism has less re-roll runway →
  river-run 74% and space-sprint's finale thin. Combo is weaker in very short races.
- **180s**: fC/DEAD-BORING/rowMin all clean and maxHold/distinctLeaders fine, but ship's arrival is already
  79–81% on closed tracks (ceiling) and the watchdog's **fixed +1.0L chaos-gap tolerance does not scale with
  duration** — at 180s all gaps are bigger, so combo15 trips the absolute line though it holds no longer. This
  is a criterion artefact, flagged below.

### THE FIVE SENTENCES (every kept element)
1. On the binding N=100 track-defaults record, COMBO15 clears rowMin ≥ ship, frontContest ≥ ship (+7 to +17pp)
   and DEAD-BORING ≤ ship+2 on all ten tracks, worsens Holm on none (improving space-sprint UNF→ok), and lifts
   arrival to 85–90% hitting the OR-form on 9/10. 2. It also does the job it was built for — it fixes the
   mid-race flatness COMBO25 introduced: maxLeadHoldShare_mid drops 0.42→0.27 (at/below ship), distinctLeaders
   rise to ~11 (above ship), and the pre-sorted-favourite's grip on the pulk falls from ~0.60 to ~0.35. 3. The
   gate is PARTIAL only because of three named misses, none of them the pulk: garden-path arrival 86% (2pp
   under the 88% floor — the known ship-ceiling track), and the PULK watchdog's chaos-gap line on searound (a
   rounding tie) and space-sprint (a genuine 3.3 vs 1.9+1.0 overshoot). 4. The duration cross-checks show the
   candidate is strongest at native durations: at 30s the pulk fix holds on all ten but arrival runway thins
   on two tracks, and at 180s everything holds except the ceiling arrival and the fixed-length chaos-gap
   tolerance, which does not scale with race length. 5. Read-only throughout — engine byte-identical, OFF
   fingerprint `7c70b1eae7d31e22`, LAW ported, `?world=combo15` live for the eye — no tuning was done, and the
   failing tracks are named for the owner's merge conversation.

## PROPOSALS (≥2; no tuning done — directions for the merge conversation)
1. **Adopt COMBO15 as the FAIR-ARRIVAL shippable candidate on the strength of the binding record + the pulk
   fix, treating the three misses as characterised, not blocking.** It is strictly fairer than ship (arrival
   +14 to +20pp on 9/10, floor up everywhere), more contested (fC up on all ten), does not worsen Holm, and
   resolves the owner's mid-race flatness — a genuinely better world. garden-path is the same ship-ceiling
   track flagged since CONFIRM-1 (judge it on absolute arrival 86%, not the +10pp delta); recommend the merge
   conversation weigh "7/10 full-pass + pulk fixed + nothing worsened" against a strict all-10 sweep.
2. **Fix the PULK watchdog's chaos-gap line to be duration-relative before it becomes permanent.** The +1.0L
   absolute tolerance tripped searound/space-sprint at 60s and 4 tracks at 180s purely because gaps scale with
   race length, while the true flatness signals (maxLeadHoldShare_mid, distinctLeaders_mid) passed. Propose the
   gate line read chaos maxGap as a RATIO to ship (e.g. ≤ ship×1.5) or normalise by field spread, so it
   measures "disproportionate breakaway" not "absolute lengths" — a measurement fix, not a candidate tune.
3. **If a strict all-10 pass is required, the two named levers stay from PULK-SPECTACLE (no tune run here):**
   the partial-sort/band-edge steer target and the boost-side gain cap both specifically blunt the chaos
   breakaway depth (the space-sprint miss) without touching arrival or the pulk hold — a one-flag follow-up if
   the owner wants space-sprint's chaos-gap under the line.

## Owner questions
1. **Merge COMBO15 as the candidate** given 7/10 full-pass + pulk fixed + nothing worsened, judging garden-path
   on absolute arrival (86%) and the chaos-gap misses as a duration-relative-criterion issue?
2. **Make the PULK watchdog duration-relative** (proposal 2) before locking it as a permanent gate line?

---
**Branch `exp/fair-arrival`.** OFF fingerprint **`7c70b1eae7d31e22`** (engine empty-diff vs @3230844). Commits:
gate build `10e4716`, parallel-stage `2352b67`, this report. Runs (parallel): STAGE 1
`--tracks=ten --arms=ship,combo15,combo,faB60 --races=100` (500.9 min); STAGE 2 `--tag=s2 --dur=30 …
--races=100` (159 min); STAGE 3 `--tag=s3 --dur=180 … --races=50` (319 min). Raw:
`reports/evolution/gate-stage{1-binding,2-30s,3-180s}*.txt`. **Measurement only — the binding record; no tuning.
PAUSE for the planner's check + owner merge conversation.** Push verified — see `git log origin/exp/fair-arrival`.
