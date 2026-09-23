# CHASE-BUILD-1 — five racers, chosen from behind the gap: the first arm in four blocks to win both halves

> **In one sentence: accelerate FIVE racers, picked from the front of the chasing field rather than
> from behind the leader, and the owner's breakaway falls from 16.0% of races to 7.3% while overtakes
> in the last 30% rise 5.5% on ten tracks out of ten.**

**Branch `feat/chase-after-outcome`, off master `32afd356`. 2026-09-23.**

★★★ **THIS SHIPPED. 2026-09-23, CHASE-SHIP-1, after the owner's own eye-test** — the three keys
below are the shipped defaults, the four fingerprints were re-minted, the golden races re-recorded
and both winner pins re-measured. The header used to read *"NOTHING MINTED, NOTHING MERGED — the
owner looks at this with his own eyes first"*, which was true of the block and is kept here so the
sequence is legible: **measure, then his eye, then ship.**

★★ **READ §3a BEFORE QUOTING ANY NUMBER IN THIS REPORT.** Everything below §3 is counted per TRACK.
The race-level recount added at the ship shows the headline 48 → 22 is a NET of **36 repairs against
10 races that GAINED a breakaway**, and that the per-track counts cannot see a breakaway doubling in
size. The trade is still strongly favourable; it is a trade rather than a filter.

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

---

## 3a · ★★★ THE SAME DATA AT RACE LEVEL — AND "NO TRACK GETS WORSE" IS NOT "NO RACE GETS WORSE"

**ADDED AT CHASE-SHIP-1, 2026-09-23, after the owner asked for the recount.** Everything above is
counted per TRACK and per ARM. The 300 races are PAIRED — arm A0 and arm G5 run the same
(track, seed) identity — so each race can be asked individually whether the chase repaired it,
created a breakaway in it, or left it alone. **The pairing changes what the headline means.**

| | quiet (stage 2) | wild (stage 3) |
|---|---|---|
| **REPAIRED** — a breakaway in A0, none in G5 | **36** | **27** |
| ★★ **CREATED** — none in A0, a breakaway in G5 | **10** | **3** |
| **STAYED** — a breakaway in both | 12 | 2 |
| neither arm | 242 | 268 |
| net (the headline) | 48 → 22 | 29 → 5 |

★★★ **TEN RACES AT QUIET GAINED A BREAKAWAY THEY DID NOT HAVE.** The headline 48 → 22 is a NET of
36 repairs against 10 new ones, and nothing above this section says so. At wild it is 27 against 3.
**The mechanism is not a filter that only removes breakaways; it is a re-roll that removes far more
than it adds.** That is a good trade and it is still a trade.

★★ **THE CLEANEST ILLUSTRATION IS SEAROUND AT QUIET.** Its track cell above reads **6 → 5**, which
the line under that table counts as "not worse". At race level the same cell is **5 repaired and 4
created**: four races on searound gained a breakaway, and the track still improved by one. A reader
who takes "no track gets worse" to mean "no race gets worse" reads searound exactly backwards.

**The ten created races at quiet**, with A0 → G5 maximum pack gap in px: searound|5 (109→244),
ice-track|17 (97→182), city-circuit|18 (140→215), searound|24 (105→172), seatrack|27 (108→174),
searound|28 (139→191), dirt-oval|4 (136→180), ice-track|10 (122→163), space-sprint|21 (148→167),
searound|10 (155→157). **The three at wild:** garden-path|13 (119→202), dirt-oval|9 (139→208),
dirt-oval|3 (149→166). ★ Two of the quiet ten (space-sprint|21 at 167 and searound|10 at 157) clear
the 157.05 px threshold by under 11 px and would fall back out of the count on a slightly different
bar; the other eight would not.

### The max-gap distribution, per race

Not a count of breakaways but the size of the biggest pack gap each race reaches, G5 minus A0:

| | quiet | wild |
|---|---|---|
| races where the gap GREW | **101 / 300 (33.7%)** | **53 / 300 (17.7%)** |
| median change | **−13.4 px** | **−34.7 px** |
| p10 / p25 | −60.5 / −37.2 | −78.0 / −58.0 |
| p75 / p90 | +8.5 / +34.1 | −9.0 / +17.7 |
| best single race | −172.0 px | −189.8 px |
| ★ **worst single race** | **+180.4 px** | **+82.9 px** |

★★ **THE WORST SINGLE RACE AT QUIET IS `city-circuit` SEED 30: 168.9 → 349.3 px — THE GAP MORE
THAN DOUBLED.** It was already a breakaway in A0 and it is still one in G5, so it appears nowhere in
the 48 → 22 headline and nowhere in the per-track table: those counts are booleans and cannot see
it. **A race that was bad got twice as bad, and every aggregate in this report is blind to it.** At
wild the worst is `garden-path` seed 13, +82.9 px, and that one DID cross (119 → 202), so it is one
of the three created.

★ **The distribution is still strongly favourable** — two thirds of quiet races and five sixths of
wild races have a smaller maximum gap, and the median race improves by 13 px at quiet and 35 at
wild. The tail is the finding, not the centre.

### Lead changes, per track

In-window lead changes per race, mean over 30 seeds. The report above gives only the pooled +3.4%
(quiet) and +11.4% (wild).

| track | quiet A0 | quiet G5 | Δ | wild A0 | wild G5 | Δ |
|---|---|---|---|---|---|---|
| city-circuit | 2.40 | 2.97 | **+0.57** | 2.93 | 2.73 | **−0.20** |
| dirt-oval | 2.77 | 2.97 | +0.20 | 2.87 | 3.20 | +0.33 |
| garden-path | 2.33 | 2.53 | +0.20 | 2.00 | 2.60 | +0.60 |
| ice-track | 2.53 | 3.03 | +0.50 | 2.23 | 3.33 | **+1.10** |
| luger-hill | 2.23 | 2.70 | +0.47 | 2.07 | 2.10 | +0.03 |
| mountainstreet | 3.33 | 2.60 | **−0.73** | 2.60 | 2.90 | +0.30 |
| river-run | 1.93 | 2.23 | +0.30 | 2.43 | 2.50 | +0.07 |
| searound | 2.50 | 2.37 | −0.13 | 1.83 | 1.97 | +0.13 |
| seatrack | 2.80 | 2.33 | −0.47 | 2.57 | 2.67 | +0.10 |
| space-sprint | 2.50 | 2.47 | −0.03 | 2.53 | 2.80 | +0.27 |

**Quiet loses lead changes on 4 of 10 tracks**, which is why the sign test on this metric fails at
quiet (6/10, p = 0.754) while the overtake sign test passes 10/10. ★ **The worst cell is
`mountainstreet` at quiet, 3.33 → 2.60 — a track that loses nearly three quarters of a lead change
per race while its breakaway count goes 5 → 0.** That is the trade this arm makes, visible in one
cell: the breakaways on that track were themselves producing lead changes as the field reeled them
back in. ★ **At wild only city-circuit loses any (−0.20)**, and ice-track gains a full +1.10.

### Band arrival, per track

The fairness gate. Pooled figures above are 89.23 → 86.86 (quiet) and 90.17 → 86.01 (wild).

| track | quiet A0 | quiet G5 | Δ pp | wild A0 | wild G5 | Δ pp |
|---|---|---|---|---|---|---|
| city-circuit | 88.6 | 87.2 | −1.4 | 91.2 | 83.7 | **−7.5** |
| dirt-oval | 87.1 | 88.1 | **+1.1** | 88.7 | 85.5 | −3.2 |
| garden-path | 89.4 | 84.5 | −4.9 | 89.4 | 86.0 | −3.5 |
| ice-track | 90.5 | 85.6 | **−5.0** | 88.6 | 85.3 | −3.2 |
| luger-hill | 91.2 | 89.2 | −2.0 | 92.7 | 89.8 | −2.9 |
| mountainstreet | 89.7 | 86.5 | −3.2 | 90.8 | 85.8 | −5.0 |
| river-run | 87.9 | 85.6 | −2.3 | 88.7 | 85.6 | −3.1 |
| searound | 88.1 | 85.6 | −2.5 | 90.2 | 82.8 | **−7.4** |
| seatrack | 89.6 | 87.2 | −2.4 | 88.7 | 87.5 | −1.2 |
| space-sprint | 90.3 | 89.2 | −1.1 | 92.8 | 88.2 | −4.7 |

★ **The worst cell is `city-circuit` at wild, 91.2 → 83.7, −7.5 pp**, with `searound` at wild a
close second (−7.4). ★★ **Every one of the twenty cells stays far above the 70% gate** — the
lowest single figure anywhere in this table is 82.8% — so the gate is not threatened on any track
in either stage, and `dirt-oval` at quiet is the one cell that IMPROVES. ★ The cost is consistent
rather than concentrated: 19 of 20 cells are negative, which is the pattern of a real force being
applied rather than noise being sampled.

★ **How to reproduce every number in this section.** The per-race rows are already committed in
`reports/evolution/chase-build-data/sweep-s2-*.json` and `sweep-s3-*.json`; pair A0 against G5 on
`(track, seed)` and read `packBreakaway`, `packMaxPx`, `winLeadChanges`, `bandArrived` and
`bandCounted`. ★★ **`packBreakaway` is the owner's definition and the one every headline in this
report uses** — `chase-sweep.mjs:452` marks it as such. The file also carries `w70Breakaway` and
`allBreakaway` at the same 157.05 px threshold over different subsets of the field; those give
8 → 3 and 68 → 58 at quiet and answer a different question. Reading the wrong one makes this
report look wrong.

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

★★ **CORRECTED AT CHASE-SHIP-1, 2026-09-23 — "the only regression in twenty track-arm cells" is
true of the CELLS and false of the RACES.** Counted per race, wild creates a breakaway in **three**
races and quiet in **ten**, spread over five tracks that the cell counts record as unchanged or
improved. The sentence above is left standing because it is accurate about what it measures; §3a is
the recount, and it is the one to read before quoting either number.

★ **THE SOLO SHARE AT WILD IS NOMINALLY UP AND THE NUMBER IS NOT USABLE.** 1 of 5 against 4 of 29 —
one race. The absolute count falls 4 → 1. The recommendation rests on the QUIET stage, where the
solo rule was applied as written and G5 passed it outright (14% against 17%); wild is confirmation
of the headline, not a second application of the rule.

---

## 5 · ★★ WHY THE DEFAULT IS NOT PRE-SET — AND A CLAIM THIS SECTION GOT WRONG

★★★ **CORRECTED 2026-09-23 (CHASE-PARITY-DIAG-1). THIS SECTION ORIGINALLY SAID THE PARITY RUNNER
DOES NOT CARRY THE GOVERNOR. THAT IS REFUTED, AND THE ORIGINAL CLAIM IS RECORDED HERE RATHER THAN
DELETED**, because it is what caused a whole block (PARITY-GOVERNOR-1) to be commissioned against a
false premise.

**What it said:** that `realArm` runs the governor while the parity `simArm` does not, so storing
the recommended arm in `defaults.js` turned the parity guards red, and that this was a blocking
prerequisite for any ship.

**What is true, measured:** the sim arm **does** reach the governor, transitively.
`goldenRunner.mjs:538` calls `runSingleRace`; `sim-fairness.mjs` builds `pulkLeadRotCfg` (`:1501`)
and a per-race `dirState` (`:1545`), passes both (`:1804-1808`), and calls **raceCore's own
`stepRacePhysics`** (`:127`, called `:1833`) — which is the function that calls the governor
(`raceCore.js:616`). Turning the governor off in the sim arm alone moves every golden hash, so the
fixtures do expose it. The header of `goldenRealArm.test.js` already said so in its own words.
**There was never a parity hole.**

**And the guards were never red on PARITY.** With the arm on, `a.hash === b.hash` passes on all
three cases. What fails is `goldenRealArm.test.js:57` — the pinned **shipped-outcome winner**
(`REAL_ARM_WINNERS = { 1: 12, 7: 17, 42: 13 }`, `goldenCases.js:46`), which becomes 27 / 38 / 7
because the chase deliberately changes the race. That is a baseline to re-record at a ship, exactly
like a fingerprint — not a defect. Full diagnosis: `reports/evolution/CHASE-PARITY-DIAG-1.md`.

★ **The default is still not pre-set in this branch**, and the reason is now the honest one: this
block is a measurement, the owner had not yet decided, and flipping a shipped default is a ship
ceremony (re-recorded winner pins and re-minted fingerprints), not a convenience for an eye-test.
The owner turns the arm on from the **Dev Screen** — three controls were added for it.

### ★★★ THE FINAL RESOLUTION, 2026-09-23 (CHASE-SHIP-1)

**The paragraph above is now history: the owner decided, and the three keys ARE the shipped default
as of this branch's ship commit.** What the parity thread ended up costing and what it ended up
proving, in one place, so nobody re-opens it:

| claim | status |
|---|---|
| "the parity runner does not carry the governor" | **REFUTED by measurement.** Disabling the governor in the sim arm alone moves every golden hash. |
| "three of four cases diverge on finishing order" | **WRONG TWICE.** They do not diverge, and the failing assertion is about the WINNER; the finishing-order assertion passes. |
| "the arms diverge with the chase on" | **FALSE.** `realArm().hash === simArm().hash` byte-identically on all three golden seeds, with the chase on. |
| what actually failed | **A PINNED SHIPPED-OUTCOME WINNER** — `REAL_ARM_WINNERS` (`goldenCases.js:46`) and a second pin in `replay.test.js`. |

**Both pins were re-measured and re-pinned at the ship**, the same procedure used at COMBO15,
RACER-FLAPPING-2 and the 2026-09-14 merge: 1 → 27, 7 → 38, 42 → 7. **There was never a parity
hole and there is nothing left to fix.** ★ The cost of not checking this before asserting it was a
commissioned block (PARITY-GOVERNOR-1, void on its premise) and a day. Full diagnosis:
`reports/evolution/CHASE-PARITY-DIAG-1.md`.

★ **Also settled at the ship, against a misreading that stopped this block once:** the `world-off`
fingerprint arm is **not** a race-plan-off arm. `off` is a LABEL naming the temp output directory and
selecting the role (`fingerprint-default.mjs:348`); the script REFUSES a flag in that position
(`:156-164`). The arm's actual difference is `--gapRerollEnabled=false`. The race plan is on in that
arm, so the governor runs and so does the chase — which is why that role moved at this ship exactly
as `world` did, and why its moving was correct rather than a leak past the chase's own gate.

## 6 · WHAT THIS DOES NOT ESTABLISH

- ★ **The clustering caveat, and it cuts against the winner.** The fixture replicates 30 seeds over
  ten tracks, so a Fisher test treating 300 rows as independent is **anti-conservative**. For a null
  result that makes it more null; **for G5, which looks like a winner, it means the p is
  optimistic.** The honest statistic for the action half is the sign test across the ten tracks, and
  that is **10 of 10, p = 0.002**.
- ★★★ **"NO TRACK GETS WORSE" IS NOT "NO RACE GETS WORSE", AND EVERY AGGREGATE HERE IS BLIND TO
  THE TAIL.** Added at CHASE-SHIP-1 after the race-level recount (§3a). The per-track counts are
  booleans summed over 30 seeds, so they cannot see a race that gained a breakaway on a track that
  improved overall (ten such races at quiet, three at wild) and they cannot see a breakaway that was
  already there getting **twice as large** (`city-circuit` seed 30, 168.9 → 349.3 px). ★ Both facts
  point the same way — the trade is still strongly favourable, 36 repairs against 10 creations at
  quiet and 27 against 3 at wild — but **anyone quoting "no track gets worse" as a safety property
  is quoting it beyond what it measures.**
- ★ **Band arrival is a GATE, not the goal.** Both arms sit ~2.4–2.7 pp below A0. They clear the 70%
  gate comfortably, but the cost is consistent across every arm in the grid and it is reported as a
  cost, not as a pass. A boost applied after the dice is exactly the force that gate exists to catch.
- The lead-change gain is **not** consistent across tracks (6/10, p = 0.754). The overtake gain is.
- Stage 1's solo rule is a ratio of very small counts; it was used to kill, never to rank.
