# ACTION-BUILD-5 — local-clearance admission (the owner's situational rule)

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC.** Phase 3a of the finale line. The
owner's binding rule: a prohibition is **situational, never categorical** — a maneuver is refused only WHERE
it has no room and must be allowed WHERE it is the solution. So the topology-derived scarcity constant
(`geomScarcity` 0.3/0.7) is **deleted**, and every compression element (lateral scripts fight-for-lead /
duel / photo-fan AND every accordion beat) is admitted **per-instance by planned LOCAL CLEARANCE** — track
width at the arc + planned occupancy from the compiled curves + the wandering free lane, one maneuver at a
time. Nothing reads open/closed, a track name, or any per-track/per-topology constant. **Frozen runtime
budget:** the clearance reader is admission-side only — it reads plans and moves no one. **OFF fingerprint
`7c70b1eae7d31e22`** (== baseline; asserted on the final committed state). ON (informational): `b698b506422d1015`.

---

## NUMBERS FIRST — arms A/B/C, N=20 × 4 tracks, paired vs Ship AND B15+prox

dead = dead-finale rate (lower better). LAW = longest-actionless-window (lower better). Order in each cell:
**luger · mountainstreet / searound · dirt-oval** (open first, then closed). THE BAR (simultaneity, one
config): dead ≤ Ship on EVERY track AND LAW_full < B15+prox on EVERY track.

| arm | band ·≥70% | dead (l·m/s·d) | LAW_full (l·m/s·d) | lead-chg |
|---|---|---|---|---|
| ship | 72%·3/4 | 10·20 / 10·**5** | 0.29·0.30/0.31·0.29 | 2.9·1.9/1.5·2.1 |
| B15+prox | 76%·4/4 | 15·5 / 15·15 | 0.58·0.50/0.62·0.64 | 2.3·2.1/1.8·1.5 |
| **A** script-only, acc OFF | 75%·4/4 | **0·5** / **50·30** | 0.58·0.54/0.57·0.63 | 1.8·1.6/0.7·1.4 |
| **B** clearance | 72%·4/4 | 5·15 / **40**·15 | 0.44·0.41/0.56·0.59 | 3.0·2.4/1.0·2.2 |
| **C** clearance+front-conv | 73%·4/4 | 10·**0** / **30**·15 | 0.44·0.42/0.51·0.55 | 2.6·2.9/1.9·1.5 |

**Closed-track dead-finale, highlighted (the whole question):** searound Ship **10** → A 50 → B 40 → C **30**;
dirt-oval Ship **5** → A 30 → B **15** → C **15**. B15+prox (no compiler): searound **15**, dirt 15.

### The two NEW clearance metrics (per arm B/C; proves the rule is situational)
| track | lanes read | lateral admitted / refused | accordion admit/refuse | front-conv (C) |
|---|---|---|---|---|
| luger (250px) | 10 | 4.8 / 0.0 | 6.0 / 0.0 | 0 |
| mountainstreet (300px) | 15 | 4.8 / 0.0 | 6.0 / 0.0 | 0 |
| **searound (131px)** | **5** | **2.2 / ~18** | 4.0 / 2.0 | **2.0** |
| dirt-oval (178px) | 10 | 4.8 / 0.0 | 6.0 / 0.0 | 0 |

- **Fires where room exists, refuses where it does not.** On the genuinely-narrow searound the reader admits
  ~2 laterals/race (where the old topology constant admitted **0**) and refuses ~18 — the situational rule,
  proven. On luger/mtn/**dirt** it admits all lateral (0 refused): **dirt reads as wide (10 lanes, 178px, small
  horse bodies)**, so the rule gives it the lateral action the topology ban denied it. No open/closed read.
- The mandated unit tests pass: two locally-identical width profiles → identical decisions regardless of any
  labeling; one track with a mixed profile → lateral admitted in the wide stretch, refused in the narrow one.

---

## READ (honest, ambiguity included)

**1. The situational rule works, and it re-locates the problem.** Deleting the topology constant HALVED
dirt-oval's dead (BUILD-4 35 → **15**) — dirt was never a lane problem, it reads WIDE and simply needed to be
allowed lateral. The hard case collapses onto the ONE genuinely-narrow track, **searound (5 lanes)**, where
the reader correctly refuses lateral and the finale is longitudinal-only.

**2. Attribution (ARM A) is decisive and refutes planner proposal 2.** With the accordion fully OFF, open
tracks BEAT ship (luger 0, mtn 5) but closed tracks are WORSE (searound 50, dirt 30) — so the closed dead is
**the scripts on narrow geometry, not the accordion** (the accordion was masking searound: 35 with vs 50
without). Proposal 2's premise ("if A meets the bar, treat the accordion as garnish") is false: **A does not
meet the bar.**

**3. On the narrowest track the compiler HURTS vs plain proximity — the key regression.** searound dead:
B15+prox (no compiler) **15** < ship-scripts arms (A 50, B 40, C 30). The trend is monotone in script
involvement, so directionally the longitudinal scripts *subtract* net lead changes from the plain proximity
bunch on a 5-lane field. **Ambiguity (write it, don't resolve it):** dead-finale at N=20 carries ≈±10pp
noise on the closed tracks; the monotone A>B>C>prox ordering argues the searound regression is real, but only
the N=100 gate can confirm it is not noise. Front-convergence (ARM C) is the best mitigation measured
(searound 40 → 30, lead-chg 1.0 → 1.9), but it does not reach proximity-alone's 15.

**4. THE BAR — not met by any arm.** LAW_full < B15+prox on all four for BOTH B and C (whole-race continuity
beats proximity-alone everywhere). dead ≤ ship fails on the closed tracks: B (searound 40, dirt 15 > ship 10,
5); C (searound 30, dirt 15 > ship 10, 5). One config cannot clear dead ≤ ship AND LAW < prox on all four.

**5. Three-tier verdict (parity rule).** ARM C **beats Ship** on the open tracks (mtn 0 < 20, luger 10 = 10)
and on band-fairness (4/4 vs 3/4) and variety, and **matches B15+prox on dirt** — but is **behind Ship on the
closed tracks** and, tellingly, **behind B15+prox on searound** (30 > 15). It is therefore **not an adoption
candidate on the bar**; it is an open-track + wide-track win with a narrow-track regression. The compiler is a
net win exactly where there is lateral room, and a net loss on the one track that has none.

### THE FIVE SENTENCES (ripcord 2 — every kept element appears)
1. Almost every racer is sorted to its drawn band by the chain (B15) and released to the fixed fair draw at
   the finish, so band-reach is untouched (4/4 ≥ 70%). 2. Through the approach each band is bunched toward its
   centre and fanned to the exact rank at the line (the proximity floor), while a seeded, row-blind,
   never-repeating script set (comebacker · fallbacker · pace-order convergence · fight-for-lead · duel ·
   photo-fan) is drawn from the finale pool and compiled endpoint-exact through the reachability accountant
   and the per-racer exposure cap. 3. Every lateral script and every accordion beat is admitted PER-INSTANCE
   by the local-clearance reader — planned track width at that arc plus planned occupancy — so a compression
   maneuver is written only where a free corridor exists and refused where the field fills the lanes, one
   maneuver at a time through the wandering free lane, with no topology or track read anywhere. 4. Where a
   front lateral is refused for lack of room the longitudinal front story takes the moment instead (front
   convergence), and every speed change still eases through the shipped slew inside the two-sided envelope
   with overlaps at zero. 5. The traffic core stays authoritative and the clearance reader moves no one — it
   only decides which curves get written — so the runtime budget is frozen and the shipped world is
   byte-identical with the line OFF.

---

## PROPOSALS (own ideas ≥ 2; the fixed planner proposals evaluated below)

1. **Grade the whole SCRIPT BUDGET by the same clearance read, not just the lateral gate.** searound proves
   the plain proximity bunch (15) beats every script arm (30–50) on a 5-lane field, so on very-few-lane
   geometry the compiler should thin the LONGITUDINAL scripts toward zero too — hand the narrow track back to
   the proximity-only substrate that already wins there. One global rule reading the lane count the reader
   already computes; admission-side; no new force. Expected effect: recover searound to ~15 while keeping the
   open + dirt wins intact. **This is the arm I would run next.**
2. **The tripwire has moved from dirt to searound — re-pose the earned-KILL question there.** Under proposal
   1 searound lands at proximity-only's ~15, still above ship's 10; ship's edge on searound is its re-roll
   speed-variation (a runtime force outside the frozen budget). So "beat ship on EVERY track" now hinges on
   the ONE narrowest track, and closing it may require the force — i.e. the earned-KILL clause would fire on
   searound specifically, not on the line as a whole. The open + wide-track win stands within budget.
3. **Adopt the clearance reader independent of the bar.** It is a clean, testable, topology-blind admission
   primitive that HALVED dirt and delivered the open-track wins; even if the bar is not met, the reader is a
   keepable piece (like the proximity floor) that makes the compiler behave correctly on any width profile,
   including future chicanes.

### The two fixed planner proposals, evaluated honestly
- **P1 (sequence laterals one-at-a-time through the wandering free lane): CONFIRMED as built, but not the
  cure.** On searound the corridor sequencing is exactly what refuses ~18 laterals/race and admits ~2 — it
  "matters on narrow geometry" as predicted. But searound's problem is the *absolute* lack of lanes, not
  corridor contention, so sequencing does not rescue its dead-finale.
- **P2 (if A meets the bar, accordion is garnish): REFUTED.** ARM A does not meet the bar (searound 50, dirt
  30 ≫ ship). The accordion is not the closed liability; the scripts on narrow geometry are.

## Owner questions
1. **Proceed to proposal 1 (clearance-graded script budget on the narrowest tracks)** as the last
   admission-side attempt to recover searound, before conceding the searound tripwire? — or hold here.
2. **Accept the landing?** Open-track + wide-track (dirt) win, band-fairest 4/4, best variety, LAW < prox
   everywhere, dirt halved — with searound behind both ship and proximity-alone. Is that an acceptable Phase-3
   result within the frozen budget, or is 4/4-on-dead the standard (in which case searound is where the line
   is killed)?

Do NOT start the N=100×4 gate, slider curve, or browser work — those need a fresh owner go.

---
**Branch `exp/chain-choreo`.** OFF fingerprint `7c70b1eae7d31e22` (baseline; final committed state). ON
`b698b506422d1015` (informational — the line is entirely flag-gated, nothing ships ON). Commits: ARM A `b29a9d4`,
ARM B+C build `e1a4501`, this report. Tests: 138 pass (clearanceReader 6 incl. both mandated; scriptCompiler
+ chain + racePlanner). Data: `reports/evolution/chain-ablate-data/{armA-b5,armBC-b5}.txt`.
