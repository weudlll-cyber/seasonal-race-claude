# ACTION-FREEBAND-2 — the dial, without the stowaway (preregistered final screen)

**Branch `exp/free-band` @514610d (sim-only; master untouched). Author: CC.** The preregistered closing screen
of the free-band line: no new machinery — remove a carried-over flag (`--chainProximity`, ON in every
FREEBAND-1 arm) and sweep the one untested dial (hard wall → soft band spring). **Headline fairness number
(owner definition): ABSOLUTE band arrival** (% of racers finishing in their drawn band), per track; per-row
floor is the watchdog. Best R from FREEBAND-1 = 0.85. **OFF fingerprint `7c70b1eae7d31e22`** asserted.

## VERDICT (read first) — NO CELL CLEARS THE GATE → the line is CLOSED, CC proposal 2 ACCEPTED
Preregistered decision executes automatically: no cell reaches arrival ≥ Ship+10pp with frontContest within
10pp and DEAD-BORING ≤ Ship, so **the free-band line is closed and the web finale ships**, banking the
orthogonal admission-side wins (fairest sorter, clearance reader, graded budget, spatial near-miss, honest
scoreboard). Two findings make the closure decisive rather than marginal: **(1) the "stowaway" proximity floor
was a fairness ASSET, not a wall-pinner — removing it LOWERED arrival; (2) softening the corridor to buy
action COLLAPSES arrival without raising the contest.** The fairness↔action frontier is not just unfavorable
here — it is a cliff.

## 1. THE TRADE-OFF CURVE (N=25, searound + ice, proximity OFF, R=0.85, re-roll noise)

| arm · corridor | **arrival** s / i (Δship, gate ≥+10) | frontContest s / i (Δship) | DEAD-BORING s / i (Δship) | per-row floor s / i |
|---|---|---|---|---|
| **ship** | 75 / 72 | 42 / 68 | 8 / 0 | (UNF / ok) |
| B15clrD (night) | 77 / 72 | 40 / 38 | 4 / 20 | ok / ok |
| **fbD** hard wall | **69 / 69** (−6/−3) | 28 / 36 (−15/−32) | 20 / 20 (+12/+20) | 62 / 63 |
| **fbEm** soft·med | **50 / 53** (−25/−19) | 29 / 40 (−13/−28) | 32 / 28 | 46 / 46 |
| **fbEw** soft·weak | **46 / 48** (−29/−24) | 29 / 38 (−14/−31) | 36 / 20 | 41 / 46 |
| **fbF** soft + scatter-recovery | **47 / 49** (−28/−23) | 39 / 33 (−4/−35) | 32 / 32 | 38 / 45 |

- **Arrival gate (≥ Ship+10 = searound 85% / ice 82%): failed by every cell** — the *best* is the hard wall at
  69/69, already below Ship, and 24–29pp short of the gate.
- **The dial is a cliff, not a slope**: hardening the corridor toward the wall raises arrival only to 69% and
  crushes the contest (frontContest 28–36%); softening it drops arrival off a cliff (69→46) while the contest
  does NOT rise (28→29). There is no middle cell that trades a little fairness for meaningful action.
- **DEAD-BORING is above Ship in every cell** (20–36% vs 0–8%); frontContest is below Ship in every cell
  (28–40% vs 42–68%). Only fbF-searound comes within 10pp on frontContest (39 vs 42) — and it posts the
  *worst* per-row floor of the screen (38%).
- **Per-row watchdog: catastrophic** — 38–63%, far below 70%, on every soft cell. The corridor cannot hold the
  per-row band without the hard wall.

## 2. THE STOWAWAY WAS A FAIRNESS ASSET (the key new finding)
FREEBAND-1 hypothesised the proximity floor was *contributing to the wall-pinning* and should be removed.
**The data says the opposite:** with `--chainProximity` OFF, the hard-corridor arrival DROPPED from 72% (with
it) to **69%** — the floor's band-centre bunching was *pre-arriving* racers into their bands, a genuine
fairness contribution, at the cost of some edge-fights. Removing it did not unlock action (frontContest still
28–36%); it just removed a fairness prop. And the soft spring, without the floor's pre-compression AND without
a hard wall, lets the noise carry racers out of their bands *en masse* → arrival collapses to 46–53%. The
"close enough to fight" job the corridor+noise were supposed to own is not enough to hold the band; the floor
was doing real fairness work.

## 3. WHY (final form of the earned-KILL) — the clamp and the race are one knob
Six independent lines now agree. Ship's front action is the tempo race of an UNCLAMPED field — re-rolled to
95%, frozen to the line, spreading into a genuine catch-up (frontContest 68% on ice); the price is its 3/10
band misses. Any clamp strong enough to guarantee the band (a hard wall, or the proximity floor's
pre-compression) confines the field so it cannot spread — the noise fights the wall (edge-fights 13k–91k), the
governor over-brakes, and dead-boring rises. Weaken the clamp and the band collapses instead. **The fairness
clamp and ship's spread-out finale race are the same knob pulled in opposite directions; there is no setting
that yields both.** Within the frozen-plus-declared-runtime budget, beating Ship on front action while
provably holding the band floor is not achievable — this is now settled from the admission side (BUILD-5…7c),
the runtime-tempo side (FREEBAND-1), and the corridor-dial side (FREEBAND-2).

### THE FIVE SENTENCES (per the design, honest)
1. Racers are sorted toward their drawn band up to R, and from R every racer is freed to a band governor plus
   a bounded finale tempo noise — the endpoint is band-exact, not rank-exact. 2. The governor was swept from a
   HARD wall (saturating to the clamp at the edge) through a SOFT spring (a bounded pull capped well below the
   clamp) at two strengths, with the old proximity-bunching flag removed so the corridor alone owns the "close
   enough to fight" job. 3. A hard wall holds arrival only to 69% while crushing the contest; a soft spring
   lets the noise carry racers out of band so arrival collapses to ~46–53%, and the reachability-bounded
   scatter recovery does not rescue it. 4. No cell reaches the fairness gate (arrival ≥ Ship+10) with the
   contest within 10pp and DEAD-BORING ≤ Ship, and the per-row floor falls to 38–63% on every soft cell. 5.
   With the line OFF the shipped world is byte-identical, and with it ON the clamp that holds the band and the
   tempo race that makes the action are one knob pulled two ways — so, preregistered, the line closes.

## PROPOSALS (≥2 — the landing, since the decision is made)
1. **Ship the web finale for front action; bank the admission-side wins as the line's product.** The
   web version's re-roll finale is the front-action engine and it is already live. Keep and ship, as
   orthogonal fairness/continuity improvements decoupled from the finale: the **B15 chain sorter** (fairest
   band-reach measured, 10/10 vs Ship 7/10 at N=100), the **local-clearance reader**, the **graded budget**,
   the **proximity floor** (now shown to be a fairness asset), the **spatial near-miss** authoring, and the
   **honest DEAD-BORING / frontContest scoreboard** (which corrected the record — Ship's "dead" is mostly
   thrillers). These are real, measured, byte-identical-OFF, and independent of the killed action goal.
2. **If front action beyond Ship is ever re-chartered, the only lever left is Ship's own fairness debt —
   a SOFT per-row nudge (proposal 3 from FREEBAND-1), owner-only.** Keep Ship's uncorralled tempo race and add
   a gentle governor that nudges ONLY the worst-off start rows toward band — trading Ship's 3/10 miss down
   toward 1–2/10 while preserving the contest. It renegotiates the hard ≥70% floor into "measurably fairer
   than Ship, action intact," and is the single remaining point on the frontier that was not a cliff. It
   should be a fresh, explicitly-scoped charter, not a free-band arm.
3. **Retire the raw dead-finale metric in favour of the honest scoreboard, whatever ships.** DEAD-BORING vs
   DEFENDED-THRILLER + frontContest is the metric that told the truth (it vindicated Ship and killed the
   density mirage); adopt it as the standing finale scoreboard so future work is judged on watchability, not
   a P1-count proxy.

## Owner note
The gate decision was **preregistered and is executed here without a new question**: no cell cleared, so the
free-band line is closed and CC proposal 2 is accepted. The owner's remaining choices are forward-looking
(proposals 2–3), not a re-open of this screen.

---
**Branch `exp/free-band`.** OFF fingerprint `7c70b1eae7d31e22` (== baseline, final committed state; flag-gated).
Commits: build `514610d`, this report. Data: `chain-ablate-data/freeband2-screen.txt`. **4-track battery NOT
run (no cell cleared — preregistered).** Push verified — see `git log origin/exp/free-band`.
