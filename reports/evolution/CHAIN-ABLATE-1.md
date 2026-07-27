# CHAIN-ABLATE-1 — the naked chain, then earn everything back

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC. Unattended overnight run.**
Ablation of the chain mechanism built in CHAIN-INT-1 (`chainChoreoEnabled`). Question: stripped to nothing,
what does the chain actually NEED around it, and does a minimal earned-back config beat or match ship?

All arms are CLI flag-sets on `sim-fairness.mjs` (no engine change beyond the sim-only `--speedBonusFactor`
override); the OFF world stays byte-identical (`7c70b1eae7d31e22`). Screening N=20/track/arm, paired seeds vs
ship (flagless). Runner: `scripts/exp-chain-ablate.mjs`. Smoothness rule satisfied structurally (every speed
change routes through the shipped eased `_setTarget`/`trajectoryMult` slew — unchanged; unit-checked in
`chainChoreography.test.js`: per-tick target-rank delta <1 rank incl. across a GPS-reroute seam).

## Closing line (read first)

**FALLS SHORT on action — but a real bright spot: the minimal chain is band-FAIRER than ship at a fraction of
the complexity.** The naked chain from the gun cannot reach bands (63%, 0/4); it needs one short chaos
pre-sort window (~0.15), which it earns back. The minimal earned config **B15** (chain from boundary 0.15 +
start-row bonus, chain as the SOLE action engine — no B2 attackers, gap-reroll, lead-rotation, area bonus,
extra phases, or B1 release) then **beats ship on the primary fairness gate at N=100 — 4/4 tracks ≥70% vs
ship's 3/4 (it clears luger 69%→74%), mean 73% vs 72%** — with a far simpler, one-boundary rule set. But on
ACTION it falls short: **dead-finales roughly double on 3/4 tracks** (luger 8→19%, searound 11→22%, dirt
14→27%) and **late lead-changes drop on all four**. The clarifying finding: B15 is also worse on action than
CHAIN-INT-1's full-reuse chain, so **the shipped world's action comes from the attacker/re-roll/rotation
stack, not from the choreography** — the chain is a fair, simple field-SORTER, not an action GENERATOR. It
does not meet pillar-7 adoption (matches ship) because it loses the late-race contest, which is the goal.

## M0 — the naked chain (definition)

Chain ON **from the gun** (`--pulkStart=0 --choreoOutcomeStart=0`; curves from the actual start grid to the
drawn places over the whole race), and everything else OFF: start-row bonus (`--speedBonusFactor=0`),
area/band bonus (`--bonusMult=0`), scheduled re-roll (`--reRollVariationPercent=0`), gap-reroll
(`--gapRerollEnabled=false`), lead-rotation (`--pulkLeadRotationAttackerSlots=0`), B2 attackers
(`--b2AttackHeroes=0`; also empty in chain mode), B1 release (`--choreoReleaseProgress=1.0`), strict from the
gun (`--avoidanceWarmupMs=0`). Kept as *definitions*: the fair draw, the honest envelope clamp (untouched),
the eased slew (smoothness), overlap/traffic physics, determinism, one global rule set. **The chain is the
SOLE action engine.**

### M0 (+ warmup, + row bonus) — 4×20, paired vs ship

| arm | luger | mtn | searound | dirt | mean band | ≥70% | note |
|---|---|---|---|---|---|---|---|
| ship | 69% | 71% | 75% | 73% | 72% | 3/4 | control |
| **M0** (strict from gun) | 66% | 61% | 62% | 66% | **63%** | **0/4** | back-row rowMin 48–59% |
| M0 + warmup | 66% | 62% | 62% | 67% | 64% | 0/4 | warmup barely moves it |
| M0 + row bonus | 65% | 62% | 63% | 68% | 64% | 0/4 | row bonus alone doesn't rescue |
| M0 + row + warmup | 66% | 62% | 61% | 68% | 64% | 0/4 | — |

**REVERSE finding (prominent):** the naked chain from the gun **fails band-reach on all four tracks** (~63%,
0/4 ≥70%), and *neither warmup nor the start-row bonus rescues it* (both ~64%). Dead-finales are also worse
(M0 15/30/20/35%). The "early segments ARE the sorting" hypothesis is refuted: from a dense grid under strict
rules, the chain cannot sort the field to bands within the honest envelope over the race. The chain NEEDS a
pre-sort window. (Strict overlaps stay 0 by construction — the traffic core is untouched — so the from-gun
failure is *reach*, i.e. the field can't differentiate in time, not penetration.)

## The ADD-BACK LEDGER (screening N=20; each = keep/discard + measured delta + cutoff)

| # | mechanism | verdict | measured delta | cutoff tested → winner |
|---|---|---|---|---|
| 1 | **Chaos pre-sort window** (chain anchors at boundary) | **KEEP** | band 63%→**73%** (from gun→0.15) | boundary {0, 0.10, 0.15, 0.25, 0.5} → **0.15** (0.10 ties; 0.25 −3pp; 0.5 −18pp; gun −10pp) |
| 2 | **Start-row bonus** (during the chaos window) | **KEEP** | within chaos: band 68%→70%, back-row rowMin 56%→66% | active during the chaos window (to ~0.15); full-race-from-gun it was negligible |
| 3 | Overlap warmup (chaos overlaps allowed) | keep (definition) | from-gun +1pp only; part of the chaos window | it is the chaos window's own rule, not a separate lever |
| 4 | Area/band-reach bonus | **DISCARD** | +0pp net (B25 70%→B25area 70%); marginal 3/4 vs 2/4 | + it violates the smoothness rule (instant-cut at the boundary, a step) → not earned |
| 5 | Checkpoint density (SEG_SEC) | DISCARD (keep default) | seg12/seg30 both 70% = seg20; denser worsens action | K=3 (segSec≈20) default; no cutoff benefit |
| 6 | mExtra round-trip excursions | keep default (2) | no reach effect (69–73%); mExtra=4 lowered open-track dead-finales (noisy) | 2 (4 gave a slight open-action hint, no reach change) |
| 7 | B1 release at finish (run-out) | **DISCARD** | open finale up (luger dead→0%) but closed worse (searound dead 30–35%) | open/closed split, no net gain — the L182 wall |
| 8 | PULK / phases beyond chaos | **DISCARD** | collapsing PULK/OUTCOME to the boundary works | none needed under the chain |
| 9 | gap-reroll / lead-rotation / B2 attackers | stay OFF | the chain is the sole engine; adding them = CHAIN-INT-1 (already KILLed on action) | — |

**Duration-cutoff curve (band-reach mean), the headline sweep — chaos boundary:**
gun 63% · **0.10 → 74%** · **0.15 → 73%** · 0.25 → 70% · 0.5 → 55%. A window long enough to pre-spread and
un-jam the grid, short enough to leave the chain most of the race to sort. 0.10–0.15 is the plateau.

### Explicit answers to the owner's question list
- **START-ROW BONUS — needed? until when?** Needed, but only *inside the chaos window* (it lifts back-row
  reach there, rowMin +10pp); as a full-race force from the gun it did ~nothing. Until ≈0.15 (the window).
- **CHAOS PHASE — needed at all, given a row bonus?** **YES — it is the single decisive add-back.** Warmup
  and row bonus are separable and *neither alone* rescues the from-gun failure; the pre-sort *window itself*
  (chain anchored later) is what lifts reach 63%→73%. Warmup vs bonus tested independently (M0warm, M0row):
  both individually ineffective from the gun; the window is what matters.
- **AREA/BAND-REACH BONUS — needed?** No — discarded (marginal, and its instant-cut breaks smoothness).
- **PHASES beyond chaos — needed?** No — collapsing PULK/OUTCOME onto the chaos boundary works; the chain
  needs exactly ONE boundary (~0.15), nothing after.
- **Extra dims (delegated):** checkpoint density (SEG_SEC) — no effect, keep default; mExtra — no reach
  effect, small open-track action hint at 4; re-roll-as-texture — not needed (the initial natural spread
  suffices; scheduled re-roll off is clean); B1 release — discard (open/closed split).

### NEW FORCE — considered, not built (with reason)
The owner welcomed a new force. I did not add one. The failure mode after the ledger is not *reach* (the
chaos window fixes it) but *action vs ship on the closed tracks* (dead-finales). Every lever that revives the
closed-track finale (B1 release; mExtra) re-hit the exact open/closed split that killed Evolution Act 2 (L182)
and the finale-vs-fairness coupling of Act 1 (L181). No smooth, in-envelope force in the data pointed at
closing that gap without re-opening those walls, and inventing one speculatively would burn the budget on a
known dead end. Flagged as an owner question instead (a finale force is a *design* round, not an ablation arm).

## Final minimal configuration (B15)

Chain from boundary **0.15** + start-row bonus during the chaos window, **as the SOLE action engine**:
`--chainChoreoEnabled=true --pulkStart=0.15 --choreoOutcomeStart=0.15 --speedBonusFactor=1.0
--choreoReleaseProgress=1.0 --bonusMult=0 --reRollVariationPercent=0 --gapRerollEnabled=false
--b2AttackHeroes=0 --pulkLeadRotationAttackerSlots=0` (mExtra=2, segSec=20/K=3 defaults). Dramatically
simpler than the shipped stack (no B2 attackers, gap-reroll, lead-rotation, area bonus, extra phases, or B1
release), and one global rule set.

## FINAL GATE (N=100 × 4 tracks, paired vs ship AND vs CHAIN-INT-1 full-reuse)

`node scripts/exp-chain-ablate.mjs --arms=B15,B15mx4 --races=100` (paired seeds; ship re-run at N=100).
CHAIN-INT-1 full-reuse chain read from `reports/evolution/chain-int-data/gate.json` (same seeds, N=100).

**Band-reach (primary fairness gate):**
| track | ship | B15 | B15mx4 | CHAIN-INT-1 full |
|---|---|---|---|---|
| luger-hill | 69% ✗ | **74%** ✓ | 73% ✓ | 73% ✓ |
| mountainstreet | 71% ✓ | 73% ✓ | 73% ✓ | 73% ✓ |
| searound | 74% ✓ | 74% ✓ | 75% ✓ | 76% ✓ |
| dirt-oval | 76% ✓ | 73% ✓ | 73% ✓ | 79% ✓ |
| **mean / ≥70%** | **72% / 3-4** | **73% / 4-4** | 73% / 4-4 | 75% / 4-4 |

**B15 clears the floor on all four (ship misses luger).** The minimal chain is band-fairer than ship.

**Action (dead-finale % / late lead-changes) — B15 falls short of ship:**
| track | ship dead / lc | B15 dead / lc | B15mx4 dead / lc | CHAIN-INT-1 full dead / lc |
|---|---|---|---|---|
| luger-hill | 8% / 2.58 | 19% / 1.84 | 13% / 2.02 | 14% / 2.20 |
| mountainstreet | 15% / 2.03 | 14% / 1.80 | 14% / 1.80 | 5% / 2.38 |
| searound | 11% / 1.62 | 22% / 1.51 | 26% / 1.43 | 25% / 1.45 |
| dirt-oval | 14% / 2.06 | 27% / 1.49 | 25% / 1.39 | 17% / 2.02 |

- **Dead-finales worse on 3/4** (luger, searound, dirt roughly double); mountainstreet ties. **Lead-changes
  down on all four.** The N=20 mountainstreet action "win" did not survive N=100 (dead 14≈15, lc 1.80<2.03).
- **B15 < CHAIN-INT-1-full on action too** (e.g. mtn dead 14 vs 5, dirt lc 1.49 vs 2.02): stripping the
  attacker/re-roll/rotation stack REMOVED action. So the shipped action is generated by those mechanisms, not
  by the choreography — the chain sorts fairly but does not manufacture a finale contest.

**Holm start-row:** ship UNF on luger+searound (baseline track bias, 2/4); B15/B15mx4 UNF on
luger+searound+dirt (3/4) — the minimal chain adds dirt-oval as Holm-unfair. So while band-reach *coverage*
improves (4/4), the Holm start-row test slightly worsens (one extra flagged track). Mixed on the finer
fairness axis. **Strict-phase overlaps: 0** (traffic core untouched — structural). **Envelope:** never
exceeded (reused clamp; structural). **Smoothness:** all speed changes via the shipped eased slew (unit-checked).

**Verdict under the three-tier rule:** NOT "beats ship" (loses on action); NOT a clean "matches ship at lower
complexity" adoption (it matches/beats on band-reach + is far simpler, but loses the late-race contest, the
project's goal, and adds one Holm-flagged track). → **FALLS SHORT**, with the ledger pinpointing why: the
chain earns back reach with one chaos window and is a *simpler, fairer sorter than ship*, but it is not an
action engine — action lives in the attacker/re-roll/rotation stack it replaced.

## Owner-only questions

1. **Bank the bright spot?** The minimal chain (B15) is **band-fairer than ship (4/4 vs 3/4, clears luger) at
   a fraction of the complexity** (one boundary + row bonus, sole engine). That is a real, if narrow, win: a
   simpler, fairer field-sorter. Worth keeping as a documented alternative sorter, or not (it costs the
   action)?
2. **The real lesson for the action hunt:** this run shows *action is generated by the attacker/re-roll/
   rotation stack, not by choreography* (the chain alone has deader finales than any stack config). Should the
   next round therefore target **a new finale-action force on TOP of the fair sorter** (chain-as-sorter + one
   new smooth in-envelope contest force), rather than more choreography? I did not invent one here because
   every finale-reviving lever tested (B1 release, mExtra) re-hit the L181/L182 walls; a genuine new force is
   a design round of its own.
3. **Keep the flag + ablation infra?** `chainChoreoEnabled` stays default OFF, byte-identical
   (`7c70b1eae7d31e22`), unit-tested; the `--speedBonusFactor`/ablation runner are sim-only. Keep on the
   branch as the substrate for #2, or drop?

---

**Branch:** `exp/chain-choreo`. Fingerprints: OFF `7c70b1eae7d31e22` (== baseline) / ON `d9d5507299ed1f6b`.
No master commits, no tags. Data: `reports/evolution/chain-ablate-data/` + `chain-int-data/gate.json`.
