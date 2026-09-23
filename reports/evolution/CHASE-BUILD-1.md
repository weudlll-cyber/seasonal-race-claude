# CHASE-BUILD-1 — five racers, chosen from behind the gap: the first arm in four blocks to win both halves

> **In one sentence: accelerate FIVE racers, picked from the front of the chasing field rather than
> from behind the leader, and the owner's breakaway falls from 16.0% of races to 7.3% while overtakes
> in the last 30% rise 5.5% on ten tracks out of ten.**

**Branch `feat/chase-after-outcome`, off master `32afd356`. 2026-09-23. ★★ NOTHING MINTED, NOTHING
MERGED — the owner looks at this with his own eyes first.**

## THE RECOMMENDATION — one setting of three keys

```
chaseAfterOutcomeEnabled: true
chaseAfterOutcomeSelection: 'gap'
chaseAfterOutcomeSlots: 5
```

| | A0 (today) | **G5 = the recommendation** |
|---|---|---|
| **his breakaway share**, N=300 | 48/300 = **16.0%** | **22/300 = 7.3%** — Fisher **p = 0.0013** |
| **in-window overtakes** | 131 326 | **+5.5%**, up on **10 of 10 tracks**, sign test **p = 0.002** |
| in-window lead changes | 760 | +3.4% (6/10 tracks, p = 0.754 — not consistent) |
| **solo share of breakaways** | 8/48 = 17% | **3/22 = 14%** — down, and down in absolute count |
| band arrival (gate ≥ 70%) | 89.23% | 86.86% — **−2.37 pp, a real cost** |
| median in-window peak gap | 111.3 px | **98.2 px** |
| breakaways never closed by the finish | 15/48 = 31% | 5/22 = 23% |

**Total boosted is six: five attacker slots plus the single outsider slot, which is unchanged.**

★★ **AND IT HOLDS AT WILD, THE STAGE HE ACTUALLY TESTS** — breakaways **9.7% → 1.7%**
(p < 0.0001), overtakes **+12.7%** on 10 of 10 tracks, lead changes **+11.4%** on 9 of 10. The
band-arrival cost is larger there (−4.16 pp) and one track, dirt-oval, gets worse. Details in §4.

---

## 1 · WHAT WAS BUILT, AND WHAT WAS NOT

Three keys, all defaulting to today's race. The extension runs **only past `pulkEndFrac`** and
**only the boost branch** produces a non-zero director there — the braked branch is skipped
entirely and the hero branch is already zero, so **nothing this feature does can slow a racer**.

Bounded by the owner's scope of 2026-09-22 and verified: the PULK end does not move, the OUTCOME
start does not move, the leader brake is never extended, and the PULK phase keeps its own hard 1–2
attacker clamp — only the extension reads the slots key.

★★ **The default is today, measured not asserted:** `world b6cfd1daf1756f61`, `world-off
744bec11644978bb`, `camera 0102dd2eab95b71f`, `render ec817639269a8a4e` — **all four unmoved at the
shipped defaults.** That was the night's stop condition and it stayed clear throughout.

**Reused rather than rebuilt:** `directorReachable`, `governorPhaseWeight`, `signedArcLengths`,
`lenScaleFrom`, `bandOfRank`, and `BAND_EDGES[0]` for the front band — imported from `racePlanner.js`,
its one home. ★ Imported rather than threaded through the config *on purpose*: a config key can be
forgotten in a copy list, an import cannot. **Judgement call recorded:** the largest-consecutive-gap
*scan* is written in the governor rather than imported, because a product module must not depend on
a report harness; only its literal is imported.

**Fixed while there** (owner rule 2026-09-19): the `raceGovernor.js` JSDoc calling the rotation
"flag-gated; default OFF" when `raceCore.js` ties it to `racePlanEnabled` and it ships **on**; and a
`docs/FORCE-MAP.md` citation my own insertions had pushed out of its line range.

---

## 2 · STAGE 1 — nine arms at N=30, quiet

| arm | brk/30 | solo/brk | overtakes | lead chg | band | verdict |
|---|---|---|---|---|---|---|
| A0 | 6 = 20.0% | 0/6 | — | — | 88.23% | baseline |
| L2 | **2 = 6.7%** | 1/2 | +9.4% | +424% | 84.67% | **DEAD** — solo share |
| L3 | 7 = 23.3% | 1/7 | +7.2% | +733% | 85.62% | **DEAD** — solo share |
| L4 | 7 = 23.3% | 2/7 | +6.3% | +694% | 85.09% | **DEAD** — solo share |
| L5 | 5 = 16.7% | 1/5 | +12.2% | +1461% | 84.40% | **DEAD** — solo share |
| G2 | 8 = 26.7% | 3/8 | +3.7% | −16.1% | 85.07% | **DEAD** — solo share |
| G3 | 5 = 16.7% | 2/5 | +6.1% | +261% | 85.84% | **DEAD** — solo share |
| G4 | 1 = 3.3% | 0/1 | +2.5% | −3.4% | 85.93% | survives |
| G5 | 1 = 3.3% | 0/1 | +5.0% | −18.4% | 85.42% | survives |

Every arm differs from A0 on **30 of 30** races, so the keys reach the race; the harness's
all-arms-identical throw did not fire.

★★ **A DEFECT FOUND AND FIXED MID-PIECE.** Band arrival — the *first* kill rule — was **never
emitted by this harness's whole lineage** (`breakaway-count` → `cast-split` → `chase-reach`), and the
first aggregate printed `NaN` in exactly the column that rule reads. It was added from the project's
own `bandOfRank` and **stage 1 was re-run in full**. No verdict was taken from the run that lacked it.

★★ **THE SOLO RULE IS BRITTLE AT THIS N, AND IT WAS APPLIED AS WRITTEN.** A0 drew **zero** solo
breakaways of six, which makes the rule zero-tolerance: one solo kills an arm. L2 posted the grid's
best headline (2/30) and died on one solo breakaway out of two. An arm with fewer breakaways also has
fewer chances to trip it, which flatters G4 and G5. **Stage 1 cannot rank arms on the breakaway
number** — at ~16% a 30-race arm carries about five breakaways — and no such ranking was written
from it; the rule was used only to kill, which is what it is for.

★ **The `leader` arms produce enormous front churn** — lead changes +424% to +1461% — because
boosting from behind the leader puts the boosted racer *inside* the leading group. That is precisely
the failure the `gap` selection was built to avoid, and it shows up on the first grid.

---

## 3 · STAGE 2 — the survivors at N=300, quiet

Every number carries its N, and both arms are measured against the same A0 at N=300.

| arm | breakaway | Fisher p | solo/brk (absolute) | overtakes | sign test | lead chg | band |
|---|---|---|---|---|---|---|---|
| A0 | 48/300 = 16.0% | — | 8/48 = 17% (**8**) | 131 326 | — | 760 | 89.23% |
| G4 | **17/300 = 5.7%** | **0.0001** | 4/17 = **24%** (**4**) | +5.5% | 10/10 **p = 0.002** | +16.1% | 86.56% |
| **G5** | **22/300 = 7.3%** | **0.0013** | **3/22 = 14%** (**3**) | +5.5% | 10/10 **p = 0.002** | +3.4% | 86.86% |

Per track, breakaways (A0 → G5): city-circuit 6→4, dirt-oval 6→3, garden-path 0→0, ice-track 11→6,
luger-hill 6→1, mountainstreet 5→0, river-run 0→0, searound 6→5, seatrack 3→1, space-sprint 5→2.
**No track gets worse.**

### ★ Why G4 has the better headline and is NOT recommended

G4's **solo share rises** — 24% against A0's 17% — and "solo share up" is the owner's own kill rule.
Applied as written, G4 fails it.

★ **The nuance is recorded rather than used to rescue it.** In *absolute* terms G4's solo breakaways
**fall from 8 to 4**; the share rises only because the denominator collapses faster than the
numerator. That is **not** what the group brake did — that mechanism held the total at 48 → 46 while
solos went 8 → 23, a near-tripling in absolute count. So G4 is not repeating that failure. **The rule
still says what it says, and G5 passes it outright, so nothing turns on the argument.**

---

## 4 · THE WINNER AT WILD — the stage he actually watches

N=300 per arm, stage `wild`, same seeds. Wild is where the owner tests, and its boost already sits
at the `pulkEnvelopeMaxEffect` clamp — so this asks whether the win survives there.

| | A0 (wild) | **G5 (wild)** |
|---|---|---|
| **his breakaway share** | 29/300 = 9.7% | **5/300 = 1.7%** — Fisher **p < 0.0001** |
| **in-window overtakes** | 138 334 | **+12.7%**, up on **10 of 10** tracks, **p = 0.002** |
| **in-window lead changes** | 722 | **+11.4%**, up on **9 of 10** tracks, **p = 0.021** |
| solo share | 4/29 = 14% (**4** solo) | 1/5 = 20% (**1** solo) |
| band arrival | 90.17% | 86.01% — **−4.16 pp** |

Per track (A0 → G5): city-circuit 6→1, dirt-oval 1→**2**, garden-path 3→1, ice-track 5→1,
luger-hill 1→0, mountainstreet 0→0, river-run 0→0, searound 6→0, seatrack 4→0, space-sprint 3→0.

★★ **THE WIN NOT ONLY SURVIVES AT WILD, IT IS LARGER ON BOTH HALVES** — the breakaway share falls
by more than four fifths, and the action gain roughly doubles against quiet (+12.7% overtakes
against +5.5%). Lead changes become consistent here too (9/10 tracks) where at quiet they were not.

★ **TWO THINGS THAT GET WORSE AND ARE NOT BURIED.** The band-arrival cost is **larger at wild**,
−4.16 pp against quiet's −2.37 — still far above the 70% gate, but the biggest single cost this arm
carries anywhere. And **dirt-oval is the one track that gets worse** (1 → 2 breakaways), the only
regression in twenty track-arm cells across both stages.

★ **THE SOLO SHARE AT WILD IS NOMINALLY UP AND THE NUMBER IS NOT USABLE.** 1 of 5 against 4 of 29 —
one race. The absolute count falls 4 → 1. The recommendation rests on the QUIET stage, where the
solo rule was applied as written and G5 passed it outright (14% against 17%); wild is confirmation
of the headline, not a second application of the rule.

---

## 5 · ★★ A BLOCKING PREREQUISITE, FOUND BY TRYING TO SET THE DEFAULT

The last step of the night was to store the recommended arm in `defaults.js` so the owner could
watch it. **That turned the sim-vs-browser parity guards red**, and the reason is not cosmetic:

- `goldenRealArm` asserts **real browser core == sim, byte-identical**. `realArm` runs the real
  browser loop, which runs the governor; the parity `simArm` does not carry the extension.
- `scripts/sim-fairness.mjs` built its `pulkLeadRotCfg` **without the three chase keys** — the same
  BLIND-SITE class this project has hit repeatedly. **That one is fixed in this branch**: the sim now
  mirrors all three, per the standing Sim-Browser Parity Rule.
- The remaining divergence is in the parity runner's own arms, and it is **not fixed here**.

★ **So the default was RESTORED to today's race and the arm is NOT pre-set.** The branch therefore
keeps a fully green suite, all four fingerprints unmoved, and stays merge-safe — and the owner turns
the arm on from the **Dev Screen** instead, which is also what the project's UI-configurable rule
requires. Three controls were added for that: the switch, the selection, and the count.

★★ **This is a prerequisite for any future ship of this feature, and it was only found because the
default was flipped.** A mechanism the sim cannot reproduce cannot be swept, gated, or trusted by any
instrument that runs on the sim path. Naming it is not fixing it, and it is not proposed here.

---

## 6 · WHAT THIS DOES NOT ESTABLISH

- ★ **The clustering caveat, and it cuts against the winner.** The fixture replicates 30 seeds over
  ten tracks, so a Fisher test treating 300 rows as independent is **anti-conservative**. For a null
  result that makes it more null; **for G5, which looks like a winner, it means the p is
  optimistic.** The honest statistic for the action half is the sign test across the ten tracks, and
  that is **10 of 10, p = 0.002**.
- ★ **Band arrival is a GATE, not the goal.** Both arms sit ~2.4–2.7 pp below A0. They clear the 70%
  gate comfortably, but the cost is consistent across every arm in the grid and it is reported as a
  cost, not as a pass. A boost applied after the dice is exactly the force that gate exists to catch.
- The lead-change gain is **not** consistent across tracks (6/10, p = 0.754). The overtake gain is.
- Stage 1's solo rule is a ratio of very small counts; it was used to kill, never to rank.
