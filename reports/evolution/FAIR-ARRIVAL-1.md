# FAIR-ARRIVAL-1 — steer the chaos, aim the dice (the owner's two-part proposal)

**Branch `exp/fair-arrival` (cut from master @58b9b8f — the SHIPPED world; sim-only; master untouched).
Author: CC.** The banked next chapter: keep Ship's re-roll action, raise band arrival. Declared inventory:
{chaos-phase anchor steering (A) · Ship's existing re-roll engine · ONE band-aware draw bias (B) or hard band
walls (C) · traffic core}. **HEADLINE = ABSOLUTE band arrival** (% finishing in the drawn band); dual
scoreboard always; per-row floor + Holm as watchdog. **OFF fingerprint `7c70b1eae7d31e22`** asserted.

## VERDICT (read first) — the FIRST non-cliff win of the whole program; the strict gate is missed by 1pp
**Aiming the re-roll dice toward the band (ARM B) is the first mechanism in ten builds to RAISE band arrival
(72→89%) WITHOUT killing front action (frontContest stays within 1–2pp of Ship) — and it *improves* the
per-row floor (65→86%).** The owner's core distinction is vindicated on the dual scoreboard: **aiming the
dice (B) works; walling the position (C) is the free-band pin and fails** (arrival *down*, action crushed).
The one shortfall: B lands at **89% / 89%** arrival — 1pp under the strict ≥90% gate — so per protocol the
4-track follow-up is NOT triggered. ARM A (chaos steering) alone does nothing.

## 1. ARRIVAL (the headline) + the dual scoreboard — N=25, searound + ice, track-defaults

| arm | ARRIVAL s / i | rowMin s / i · Holm | frontContest s / i | DEAD-BORING s / i |
|---|---|---|---|---|
| **ship** | 75 / 72 | 66 / 65 · UNF/ok | 42 / 68 | 8 / 0 |
| A (chaos anchor) | 75 / 72 (=) | 66 / 65 · UNF/ok | 42 / 68 (=) | 8 / 0 |
| B-weak (R.80, g.03) | **82 / 84** (+7/+12) | 72 / 78 · ok/ok | 44 / 69 (+2/+1) | 8 / 4 |
| B-med (R.80, g.06) | **83 / 84** (+8/+12) | 79 / 82 · UNF/ok | 44 / 68 (+2/=) | 16 / 4 |
| **B60 (R.60, g.10)** | **89 / 89** (+14/+17) | **86 / 86** · UNF/UNF | **42 / 67** (=/−1) | 8 / 8 |
| AB60 (A + B60) | 89 / 89 (+14/+17) | 86 / 86 · UNF/UNF | 42 / 67 (=/−1) | 8 / 8 |
| **C (hard walls R.80)** | **68 / 70** (−7/−2) | 59 / 62 · UNF/ok | **27 / 55** (−15/−13) | 24 / 4 |

- **ARM B is the win**: band arrival **+14/+17pp** (75→89, 72→89) at frontContest **within 1–2pp of Ship**
  and DEAD-BORING at-or-near Ship (searound 8=8; ice 8 vs 0). Crucially the **per-row floor RISES** from
  65–66% to **86%** — the aimed dice make the field *fairer per row*, not just on average. This is the
  non-cliff behaviour free-band could never reach.
- **The gate is missed by 1pp**: 89/89 < 90. The residual ~11% miss is racers the honest-range dice cannot
  catch to band even from R=0.60 — a ceiling of "aiming within the honest tempo band + finite runway," not a
  cliff. Bumping past 90 is a tuning question, not a wall (see proposals).
- **ARM A (chaos steering) is inert**: identical to Ship (75/72), and AB60 == B60 — the chaos pre-position
  washes out before the finale; all the arrival lift comes from Part 2 (aiming the dice), none from Part 1.

## 2. B vs C SIDE BY SIDE — the owner's proof (aim the dice, don't wall them)
Same precondition, opposite mechanism, opposite result:

| | ARM B (aim the DRAW) | ARM C (wall the POSITION) |
|---|---|---|
| arrival s / i | **89 / 89** | 68 / 70 |
| frontContest s / i | **42 / 67** (≈ Ship) | 27 / 55 (crushed) |
| DEAD-BORING s / i | 8 / 8 | 24 / 4 |
| per-row floor | **86 / 86** | 59 / 62 |
| mechanism | dice loaded toward band, clamped to honest range — nothing fought; in-band racers keep free dice | a positional force fighting the dice → edge-pinning (the FREEBAND wall) |

C *lowers* arrival below Ship and crushes the front (frontContest 27% on searound) — the exact FREEBAND
pin, reproduced on master. B, changing only whether we aim the draw or force the position, lifts arrival and
keeps the contest. **This is the empirical heart of the line: fairness must be bought by loading the dice
within the honest range, never by a positional clamp.**

### THE FIVE SENTENCES (per arm, honest)
1. Every racer is drawn a fair band and Ship's re-roll re-randomises tempo to 95% and freezes to the line,
   the shipped action engine, untouched. 2. ARM A gently steers a racer OUT of its drawn band toward it
   during the chaos phase only, within the two-sided clamp — but this washes out by the finale and moves band
   arrival not at all. 3. ARM B, from the release point, AIMS each racer's re-roll DRAW toward its drawn band,
   clamped to the honest [min,max] tempo range: an out-of-band racer draws toward the near edge, an in-band
   racer keeps the free dice, so nothing is fought and the within-band order is still decided by chance. 4.
   ARM C instead holds the position to the band with a hard wall while the dice run — a fight that pins racers
   at the edge, lowers arrival below Ship, and crushes the front contest. 5. With the line OFF the shipped
   world is byte-identical, and with ARM B ON band arrival rises +14–17pp to 89% while front action stays
   within 1–2pp of Ship and the per-row floor rises to 86% — a genuine, non-cliff fairness gain that lands
   1pp under the strict 90% gate.

## PROPOSALS (≥2)
1. **Push ARM B past 90% by making Part 1 actually do its job — orchestrate the field rank-exact by R, THEN
   aim the dice.** ARM A as built (a gentle chaos nudge) is inert. The owner's Part 1 intent — "orchestrate
   toward final rank by R" — means the field should be IN-BAND at R so the aimed dice only have to *hold*, not
   *catch up*. A stronger pre-R sort (extend the orchestration/servo to steer the whole field toward its drawn
   band through the corridor, not just heroes) would put more racers in-band at R; the aimed dice then hold
   them → arrival should clear 90%. One screen (searound+ice N=25) tests it. This is the single change most
   likely to convert the 89% near-miss into a pass, and it keeps the action (the dice still decide within band).
2. **Adopt ARM B now as a shippable fairness improvement even at 89%, decoupled from the strict gate.** It is
   a measured, byte-identical-OFF, +14–17pp arrival gain that *raises* the per-row floor (65→86%) and holds
   Ship's action (frontContest within 2pp) — strictly fairer than the shipped game with no action cost. If the
   90% line is a hard product bar, keep iterating (proposal 1); if "clearly fairer than Ship, action intact"
   is acceptable, B is ready to ship behind the flag.
3. **Watch the Holm flag as B strengthens.** B60 flips both tracks to Holm-UNF (start-row skew) even as the
   per-row *floor* rises — the aimed dice help some rows more than others. Any adopted setting should Holm-check
   per row and, if needed, make the bias gain row-uniform (it currently keys only on band error, which is
   already row-blind, so the skew is likely a rowMin-vs-Holm artifact at N=25 — confirm at the gate N).

## Owner questions
1. **Run proposal 1** (rank-exact pre-R sort, then aim the dice) to try to clear 90%, or **adopt B at 89%** as
   a shippable fairness win (proposal 2)?
2. **Is "clearly fairer than Ship (89% vs 72–75%, per-row floor 65→86%) with action intact" acceptable**, or
   is the strict ≥90% both-tracks bar the standard?

---
**Branch `exp/fair-arrival`.** OFF fingerprint `7c70b1eae7d31e22` (== baseline, final committed state;
flag-gated). Commits: build `d00d105`, runner+report. Data: `chain-ablate-data/fair-arrival-screen.txt`.
**Gate missed by 1pp (89/89 < 90) → 4-track follow-up NOT run (per protocol).** Push verified — see
`git log origin/exp/fair-arrival`.
