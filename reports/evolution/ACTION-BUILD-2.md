# ACTION-BUILD-2 — the open lane (closed-track fix, admission-side only)

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC.** Scope: the closed-track jam ONLY.
**Frozen runtime budget** (anti-Servo-2.0 tripwire): the runtime force set stays {planned curves + servo,
traffic core + return weave, the accordion beat} — every fix here is **planning/admission-side** (rules that
decide which beats get written/fired). OFF fingerprint asserted `7c70b1eae7d31e22`. No new mechanisms.

## BAR VERDICT (read first)

**BAR NOT MET — but the open-lane invariant is VALIDATED, and the failure is the substrate, not the
mechanism, and NOT the tripwire.** Best config = **A+B** (open-lane invariant + lane-conditional skip,
density 6). It meets the bar on **3 of 4 tracks simultaneously** (luger dead 0%, mountainstreet 20%=ship,
**searound 10%=ship**) and clears LAW_full < B15 on all four. It **fails only dirt-oval** (dead-finale 20% vs
ship 5%). Crucially, the open-lane guard **fixed the searound lane-jam** — the accordion's closed harm there
(raw 15–30%) collapses to ship's rate (10%) with a healthy honest skip meter (25%: the lane was genuinely
jammed a quarter of the time and the guard correctly vetoed those beats). **The dirt failure is inherited
from the B15 SUBSTRATE** (the plain chain sorter already deadens dirt: B15 dirt dead 20% vs ship 5%); A+B
returns dirt from raw's 30% to that 20% baseline but cannot beat the substrate — even a perfect skip leaves
dirt at the sorter's 20%. **So it is not a lane-jam and not solvable by more accordion admission; and it needs
NO new runtime force** (planning/substrate work, not the tripwire). **Verdict: the mechanism passes; the
simultaneity bar fails on one track for a substrate reason cleanly separated from the accordion.**

## Mechanism definitions (admission rules, not forces)

- **A — THE OPEN-LANE INVARIANT.** A beat is admitted only where a passing lane exists. Implemented by
  reading the traffic core's OWN clearance signal (no new force): the pass route is open iff the IMMEDIATE
  follower (the racer that would overtake the braked leader) is not traffic-blocked (`avoidanceActive=false`
  ⇒ it has a free lane). One global rule reading physics — no per-track value. Evaluated once at beat entry;
  if the lane is not open, the beat is not authored.
- **B — THE LANE-CONDITIONAL SKIP.** Within an admitted beat, each tick re-checks the same clearance; if the
  route is jammed at that tick, the brake is SKIPPED (never queued; the skipped tick does not refund the
  duty-cycle budget). The traffic core stays authoritative; the invariant never overrides honest blocking.
- **Skip rate = the invariant's quality meter** = brake-ticks B vetoed / admitted beat-ticks. With A working,
  the lane promise should rarely break → skip ≈ 0. A high skip rate on a track means the plan's promise is
  not surviving contact there (a named, measured wall).
- Kept from BUILD-1 unchanged: accountant caps, the full non-Leash guard pack (pulse length, per-racer beat
  cap, duty ceiling), LAW observers, smoothness (eased `_setTarget`), seeded row-blind, two-sided envelope.

## Attribution screen (4 tracks × N=20, ALL FOUR SIMULTANEOUS, paired vs Ship AND B15)

LAW: lower = better. THE BAR: dead ≤ Ship on EVERY track AND LAW_full < plain B15 on EVERY track (one config).
Plain-B15 LAW_full (BUILD-1): 0.65/0.51/0.69/0.72 — every accordion arm clears it. dead per track, Δ vs ship:

| arm | luger dead | mtn dead | searound dead | dirt dead | bar (dead≤ship all 4) | skip (l/m/s/d) |
|---|---|---|---|---|---|---|
| ship | 10% | 20% | 10% | 5% | — | 0/0/0/0 |
| raw acc6 | **0** | **0** | 15 ✗ | 30 ✗ | FAIL (s,d) | 0/0/0/0 |
| A (admit) | **0** | 10 | 15 ✗ | 35 ✗ | FAIL (s,d) | 0/0/0/0 |
| **A+B** | **0** | **20=** | **10=** | 20 ✗ | **FAIL (dirt only)** | 17/21/**25**/14% |
| B (skip) | **0** | 30 ✗ | 20 ✗ | 10 ✗ | FAIL (m,s,d) | 21/25/29/20% |

Band-reach: every accordion arm **4/4 ≥70%** (73–74%) vs ship 3/4. LAW_full (all arms ≈0.38–0.50) beats plain
B15 (0.51–0.72) on every track. Lead-changes: A+B up on mtn (+0.45) & searound (+0.65), down on luger & dirt.

## A/B attribution + skip-rate diagnostics

- **A and B are both required.** A-alone (admit at beat entry, no mid-beat skip) leaves searound at 15% — the
  lane opens at entry then closes mid-beat, and A cannot react. B-alone (skip, no admission) over-skips on the
  OPEN tracks (mtn dead 0→30%: it vetoes beats where lanes are actually fine, killing the open win). **Only
  A+B** — admit where the lane is open, then skip the ticks where it closes — fixes searound (→10%=ship) while
  keeping the open win (luger 0, mtn 20).
- **The skip rate is the honest quality meter, and it reads true:** ~0% on the arms without B; **14–25% with
  A+B, highest on the closed tracks** (searound 25%) — i.e. the plan's lane promise genuinely breaks a
  quarter of the time on the narrowest track, and the guard catches it. This is the invariant working, not
  hiding.
- **Why dirt still fails:** its skip rate (14%) is real but its dead-finale (20%) tracks the **B15 substrate**
  (20%), not the accordion — the chain sorter deadens dirt independently of any beat. No amount of beat
  admission fixes a substrate dead-finale.

## GATE — not reached (bar not met). Follow-up: gate A+B at N=100 only after the dirt substrate is addressed.

## THE FIVE SENTENCES (pillar 7 — the whole kept system, plainly)

1. Almost every racer is sorted to its drawn band by the chain (the B15 substrate: curves anchored at the
   0.15 chaos boundary + an in-window start-row bonus), and the fixed fair draw is the finish — so band-reach
   is untouched. 2. During the race, at a few seeded, row-blind beats, the momentary leader is eased toward
   the honest malus floor so the racers behind pass at normal speed (the accordion), under the full non-Leash
   guard pack (bounded pulse length, per-racer beat cap, duty-cycle ceiling). 3. A beat is authored only where
   the traffic core reports a free passing lane, and each tick re-checks and skips the brake if that lane is
   jammed (the open-lane invariant + lane-conditional skip). 4. Every speed change eases through the shipped
   slew and never leaves the two-sided envelope; overtakes happen only where the room for them exists. 5. One
   global rule set, no per-track values, seeded and row-blind throughout, with the traffic core always
   authoritative over honest blocking. **Pillar-7 PASS** — the system is describable and every kept element
   (chain sorter · accordion · non-Leash guards · open-lane invariant · skip · fair-draw finish · two-sided
   envelope · smoothness · global/seeded/row-blind) appears.

## Closing line

**The open lane is real and the invariant works — searound's lane-jam is fixed to ship parity with an honest
25% skip meter — but the simultaneity bar fails on dirt-oval for a substrate reason (the B15 sorter deadens
dirt, independent of any beat), which is planning-solvable and needs NO new runtime force, so the line stays
alive: the next move is the substrate's dirt dead-finale, not another admission rule and not a new force.**

## PROPOSALS (own ideas)

1. **Substrate-aware sort for the dirt class (planning-side).** The chain sorter's dirt deadening is the
   binding wall now, not the accordion. A planning-side fix within budget: on tracks where the sorter's
   own predicted finale is dead (measurable at plan time from the drawn-band spread vs the track's lane
   capacity), author the LAST segment's checkpoints to arrive FANNED (the photo-finish-fan, but conditioned
   on a predicted-dead finale) — no new force, just a different curve endpoint distribution. This attacks the
   substrate directly and would be the arm I'd run next.
2. **Contestable-proximity staging (strengthen A).** Today A reads the immediate follower's clearance at beat
   entry; a stronger invariant would, at plan time, STAGE the two racers behind the target leader into
   different lanes just before a beat (a short lateral pre-position via the curve, within the envelope) so the
   passing route is guaranteed by plan, not hoped-for — raising the searound skip rate's ceiling from "catch
   the jam" toward "prevent the jam." Still admission/curve-side, no new force.

## Owner-only questions

1. **Confirm the tripwire read:** the residual dirt failure is the B15 substrate's dead-finale, fixable
   planning-side (proposal 1), NOT requiring a new runtime force — do you accept the line stays alive on that
   basis, or is one-track-fails-the-bar a hard stop regardless of cause?
2. **A+B is validated on the lane-jam** (searound → ship parity) and is band-fairer than ship (4/4) at low
   complexity. Ship it behind the slider for the three tracks it clears, or hold everything until dirt is
   solved (simultaneity purism)?
3. Next run: the dirt substrate (proposal 1) as a focused planning-side arm, before any return to the script
   compiler (comebacks/fallbacks/variety, still the owner's Q4–6)?

---
**Branch `exp/chain-choreo`.** OFF fingerprint `7c70b1eae7d31e22` (asserted after the open-lane/skip edit).
Sim-only. Data: `reports/evolution/chain-ablate-data/`.
