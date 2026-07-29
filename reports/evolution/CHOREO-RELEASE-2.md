# CHOREO-RELEASE-2 — the archived world's fair last test: BOTH owner parts at full strength

**Branch `exp/choreo-release` @0a9e3ae (sim-only, master untouched). Author: CC.** The archived curve world
never received the STRONG Part 1 (its chaos aim was the whisper draw-bias, found ineffective: anchor-hit
13.2→13.3). This run ports the strong continuous steer (from `exp/fair-arrival` @a25e09c) onto this branch and
measures the archived architecture with BOTH owner parts at full strength. Flags default OFF → flagless
fingerprint **`7c70b1eae7d31e22`** (== shipped, byte-identical, asserted on the committed state).

## THE ANSWER (the preregistered question, side-by-side FIRST)

**Does the archived architecture with both parts at full strength close the gap to SHIP+chaosSteer and the
COMBO (arrival AND action)? → NO on action — the decided-outcome law HOLDS. Arrival closes only partway.**

| metric (searound / ice) | **archived: AT90+HOLD-DICE+strongSteer** | SHIP+chaosSteer *(cache)* | COMBO *(cache)* |
|---|---|---|---|
| **ABSOLUTE arrival** | **84% / 80%** | 78% / 79% | **90% / 90%** |
| **frontContest** (↑) | **24% / 51%** | **67% / 77%** | **67% / 78%** |
| **DEAD-BORING** (↓) | **28% / 20%** | **4% / 0%** | **4% / 0%** |
| anchor-hit @ chaos end | **6.9 / 5.0** (moved from 13.2/13.5) | n/a (ship in-band 68/70%) | n/a |

- **Arrival: the strong steer WORKS but does not reach the COMBO.** anchor-hit moves 13.2/13.5 → 6.9/5.0 (the
  old whisper's 13.2→13.3 is decisively beaten), and arrival rises to 84/80% (candidate 77/72 → +release 80/75
  → +steer 84/80). But it plateaus below the COMBO's 90/90 — on the archived world the steer alone cannot reach
  the line target that the ship-world draw-bias delivers.
- **Action: the gap is NOT closed — it WIDENS.** The archived architecture's frontContest (24/51) is far below
  SHIP+chaosSteer/COMBO (67/77–78), and DEAD-BORING (28/20) is far worse than their 4/0. Adding the strong
  steer to the release arm made searound action WORSE (AT90dice frontContest 37→24, DEAD-BORING 8→28), not
  better. **The decided-outcome law holds: the archived curve+release machinery is structurally decided, and
  pre-sorting the field into bands only deepens it.**

## 1. BUILD-vs-SPEC CONFORMANCE
- **Strong steer ported verbatim, reachable.** The same continuous, clamped, per-tick-smooth, chaos-only steer
  as `exp/fair-arrival` @a25e09c, including the pin-early-return reachability skip. Measured: steer meanMult
  0.978 (a gentle brake inside the two-sided clamp [0.85,1.10]), maxTickΔ 0.0071/0.0101 (Sanftheits-Regel
  proven). CONFORMS.
- **Steering target = the PLANNED CURVE START, which reduces to the DRAWN BAND here.** The chain + compiler
  curves anchor to the ACTUAL post-chaos rank (`anchorHeroCurve`), so there is NO distinct planned curve start
  before the boundary where the steer runs — the compiler's "anchor formation" IS the drawn-band arrangement,
  and the spec's "fall back to the drawn band where no anchor exists" applies to every racer. Documented and
  is itself a finding (the archived curves have no pre-boundary anchor to aim at). CONFORMS.
- **Smoke gate (N=8 ice): anchor-hit MOVES.** candidate 13.52 → strong steer 4.18 (3.2×) — the old 13.2→13.3
  did not repeat, so the screen ran. CONFORMS.

## 2. WHY THE ACTION GAP DOES NOT CLOSE (the mechanism)
Both levers grip, but they compose the wrong way ON THIS ARCHITECTURE:
- On the SHIP world, the steer band-sorts the field and then hands it to ship's LIVE re-roll — the whole pack
  re-rolls together and trades P1, so a tighter field = MORE contest (SHIP+chaosSteer frontContest 67/77).
- On the ARCHIVED world, the steer band-sorts the field and then hands it to the CHOREO CURVES + RELEASE — the
  curves guide each racer to its drawn place and release it to the dice WITHIN its band, which (CHOREO-RELEASE-1)
  is a decided procession with no front attractor. The pre-sort makes the curves' job easier and the finale
  MORE decided, so on the narrow 5-lane searound the dead deepens (DEAD-BORING 8→28). The action was never in
  the curves; it is in ship's live re-roll, and no amount of Part-1 sorting puts it back into a curve+release
  finale.
- Secondary: the pre-sort slightly starves the finale compiler (ice finaleStories 10.6→9.2, 13/25 races <10 —
  a sorted field gives the script pool less to cast), and the steer's start-row skew (COMBINE-1 mechanism) turns
  both tracks Holm-UNF with no draw-bias here to fill the middle-row gap.

### THE FIVE SENTENCES (every kept element)
1. The strong continuous chaos steer was ported onto the archived world and grips exactly as on fair-arrival —
   anchor-hit moves 13.2/13.5 → 6.9/5.0, steer meanMult 0.978 inside the clamp, maxTickΔ ≤ 0.010 (smoothness
   proven) — so Part 1 is finally built properly here. 2. With both owner parts at full strength the archived
   architecture raises arrival to 84/80% (the steer's early sort carries through the curves), but it plateaus
   below the COMBO's 90/90 and cannot reach the line target the ship-world draw-bias delivers. 3. On action the
   gap is not closed but WIDENED: frontContest 24/51 vs SHIP+chaosSteer's 67/77 and DEAD-BORING 28/20 vs 4/0,
   and adding the steer to the release arm made searound action worse (37→24, dead 8→28). 4. The mechanism is
   that the steer hands a band-sorted field to a curve+release finale that is structurally decided (dice within
   a band, no front attractor), so pre-sorting only deepens the deadness — the action lives in ship's LIVE
   re-roll, which the archived world replaced. 5. The decided-outcome law holds, the OFF world is byte-identical
   (`7c70b1eae7d31e22`), and the steer is confirmed a SHIP-world lever (where COMBO already cleared the gate),
   not a rescue for the archived curves.

## PROPOSALS (≥2)
1. **Close the archived (choreo-release) line; the two fair-arrival levers are the live path.** Three screens
   now agree: the curve+release architecture cannot match ship's live re-roll on front action (CHOREO-RELEASE-1
   release, CHOREO-RELEASE-2 release+strong-steer), while the SAME strong steer on the SHIP world plus the
   draw-bias (the COMBO) clears the 90%-arrival + action-positive gate. Propose retiring the archived world as
   the action vehicle and carrying the fair-arrival COMBO forward to the 10-track N=100 gate.
2. **Keep the strong steer as the shared, validated Part-1 lever — on the ship world only.** This run proves the
   steer is architecture-portable and grips wherever it runs (anchor-hit 13→5); its VALUE, though, is realised
   only where a live re-roll follows it (ship), not where a decided curve+release follows it (archived). Keep
   one steer implementation, deploy it on the ship-world FAIR-ARRIVAL candidate.
3. **If the archived curves are ever revisited for action, the missing piece is a live re-roll, not more
   sorting.** The one thing that raised frontContest anywhere is ship's whole-pack re-roll; a curve world would
   need to hand its finale to that same live force (not a within-band dice release) to contest P1 — a different
   architecture, explicitly scoped, not a Part-1 tweak.

## Owner questions
1. **Retire the archived choreo-release line as the action vehicle** and carry the fair-arrival COMBO to the
   10-track N=100 gate (proposal 1) — yes/no?
2. **Confirm the strong steer as the single shared Part-1 lever, deployed on the ship world only** (proposal 2),
   since this test shows it grips everywhere but only pays off ahead of a live re-roll?

---
**Branch `exp/choreo-release`.** OFF fingerprint **`7c70b1eae7d31e22`** (== shipped, byte-identical; new flags
default OFF). Build commit `a6d5902`; this report. Screen: `scripts/exp-chain-ablate.mjs
--arms=B15clrD,AT90dice,AT90diceSteer --tracks=searound,ice-track --races=25 --seed=1`. Cross-references SHIP+
chaosSteer / COMBO from `reports/evolution/CHAOS-STEER-1.md` / `FAIR-ARRIVAL-COMBINE-1.md` (@0ead833/@f9249b8).
Raw: `reports/evolution/choreo-release-2-screen.txt`. **Screen-only (stopped per protocol).** Push verified —
see `git log origin/exp/choreo-release`.
