# ACTION-BUILD-3 — the proximity floor (closeness is the author's job)

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC.** Scope: the contestable-proximity
principle ONLY. **Frozen runtime budget** unchanged — the floor is **admission-side** (the formation author's
pen: it shapes which curves get written), no new runtime force. OFF fingerprint asserted `7c70b1eae7d31e22`.

## BAR VERDICT (read first)

**BAR NOT MET — the proximity floor is a genuine improvement but the last gap (dirt-oval) is a tripwire.**
The floor makes the chain the **band-fairest world yet (76% mean, 4/4 ≥70%)** and pushes **LAW_full < plain B15
on ALL four tracks** — closeness is real and admission-side and reachable. But **dead-finale ≤ Ship on EVERY
track is not achievable**: proximity alone leaves dirt at 15% (ship 5%), and adding the accordion makes closed
tracks WORSE (dirt 15→**30%**), not better. The named tension is **closeness × lane × geometry on closed
tracks**: compression-based action (bunch the field, brake the leader) needs lateral lanes to convert
closeness into passes, and the closed tracks do not have them — the tighter the field, the harder the brake
jams. **Tripwire verdict: the residual dirt gap is NEW-FORCE-REQUIRED.** Ship's low dirt dead (5%) comes from
its re-roll SPEED-VARIATION (faster racers naturally catch slower — an action source that needs little lateral
room), which is a runtime force OUTSIDE the frozen budget. No admission rule creates lanes or speed variance;
so **"beat ship on dead across all four tracks within the frozen budget" is killed** — that last gap needs a
force. **The floor itself survives the kill as a keepable fairness+continuity win (proximity alone).**

## The proximity floor — definition (the one global value + derivation)

**Contestable-proximity floor:** in the formation author, through the approach each racer's target rank is
pulled toward its BAND CENTRE (the shipped `BAND_EDGES` define the bands; centre of B1=3, B2=10, B3=20,
B4=33), then released to the exact drawn rank by the finish (the pull → 0 as progress → 1, so the endpoint
invariant — the fair draw — is untouched). Pulling toward the band centre **bunches each band's racers into a
tight, contestable cluster** while **preserving band separation** (B1 stays ahead of B2 …), so fairness holds.
The pull is **within-band only**, so the fan-back to exact ranks is a small late movement → always reachable
(the accountant asserts it). One global rule reading the band structure — no per-track value. The strength
(0..1, how hard toward centre) and the resolve progress (when the fan-back begins) are the two global knobs;
scripts may vary closeness ABOVE the floor, but the floor is always on. Together with the open-lane invariant
this is the complete pair: **close enough to fight (this floor, longitudinal) · staggered enough to pass (the
open lane, lateral)**, and the open lane is never sacrificed for closeness (the lane-conditional skip stays
authoritative).

## Attribution screen (4 tracks × N=20, ALL FOUR SIMULTANEOUS, paired vs Ship AND B15)

LAW: lower = better. THE BAR: dead ≤ Ship on EVERY track AND LAW_full < plain B15 on EVERY track (one config).
Arms: (1) B15 + proximity floor ALONE, (2) B15 + proximity + accordion A+B (the full candidate). Plain-B15
LAW_full (BUILD-1): 0.65/0.51/0.69/0.72 — both arms clear it. dead / LAW_full per track, Δ vs ship:

| arm | band mean·≥70% | dead (l/m/s/d) | dead ≤ ship? | LAW_full (l/m/s/d) < B15? | skip (l/m/s/d) |
|---|---|---|---|---|---|
| ship | 72%·3/4 | 10/20/10/5% | — | 0.30/0.29/0.31/0.28 | — |
| **prox alone** | **76%·4/4** | 15/**5**/15/15 | mtn only | 0.58/0.50/0.62/0.64 ✓all | 0/0/0/0 |
| prox + acc A+B | 76%·4/4 | **5**/30/15/**30** | luger only | 0.41/0.37/0.53/0.49 ✓all | 10/19/19/10 |

- **Proximity ALONE is band-fairest (76%, 4/4) and beats plain B15 on LAW everywhere** — a clean fairness +
  whole-race-continuity improvement to the sorter. But it does not add lead-changes (it bunches, it doesn't
  overtake), so dead-finale only beats ship on mountainstreet.
- **Proximity + accordion drops dead on the OPEN tracks it can (luger 10→5) but RAISES it on the closed
  tracks (dirt 15→30, mtn 5→30)** — the negative interaction. Neither config meets "dead ≤ ship on all four".

## Gap distributions + skip-rate vs BUILD-2 — the diagnostic that tells the real story

**The skip rate FELL vs BUILD-2** (prox+acc 10/19/19/10% vs BUILD-2 A+B 17/21/25/14%; searound 25→19,
dirt 14→10). This is the hypothesis CONFIRMED: **planned closeness makes the lane promise easier to keep** —
the open lane and the proximity floor are compatible at the signal level, not fighting. **Yet the dead-finale
got WORSE on the closed tracks.** That is the precise, measured tension: closeness reduces *broken lane
promises* (skip↓) but the bunched field has *less absorption capacity* for a brake, so the compression
outcome (a jam) is worse where lanes are scarce. Closeness helps the lane SIGNAL and hurts the jam OUTCOME on
closed geometry — the two are not the same thing, and geometry wins. (Final-approach gap distributions are
implied by the LAW_full drop — the front is measurably tighter under the floor on every track; the failure is
not gap size, it is lane count.)

## GATE — not reached (bar not met).

## THE FIVE SENTENCES (pillar 7 — proximity floor inside sentence four)

1. Almost every racer is sorted to its drawn band by the chain (B15: curves anchored at the 0.15 chaos
   boundary + an in-window start-row bonus), and the fixed fair draw is the finish, so band-reach is
   untouched. 2. During the race, at a few seeded, row-blind beats, the momentary leader is eased toward the
   honest malus floor so the racers behind pass at normal speed (the accordion), under the full non-Leash
   guard pack. 3. A beat is authored only where the traffic core reports a free passing lane, and each tick
   skips the brake if that lane is jammed (the open-lane invariant + lane-conditional skip). 4. Through the
   approach every racer's target is pulled toward its band centre so each band stays a tight, contestable
   cluster, releasing to the exact drawn rank at the finish (the proximity floor — closeness guaranteed by the
   formation language, never per-track). 5. Every speed change eases through the shipped slew inside the
   two-sided envelope, overlaps stay 0, one global rule set, seeded and row-blind throughout, the traffic core
   always authoritative. **Pillar-7 PASS** — describable; every kept element appears.

## Closing line

**Closeness is now the author's job and it works — the proximity floor makes the chain the band-fairest,
most continuous world yet, and it keeps the open lane easier to hold (skip rate fell) — but it cannot buy
overtakes where there are no lanes: on the closed tracks compression-based action jams harder the tighter the
field gets, so beating ship's dirt-oval finale would need ship's own re-roll speed-variation, a runtime force
outside the frozen budget; the pre-registered tripwire therefore FIRES on that last gap (new-force-required =
line kill for beat-ship-4/4-on-admission-alone), while the proximity floor survives as a keepable fairness
win.**

## PROPOSALS (own ideas)

1. **Closed tracks want speed-variation action, not compression — and there is an admission-side way to get
   it WITHOUT re-roll-as-force.** The chain already draws each racer's natural spreadFactor once (it is the
   fair-draw's companion). Proposal: on tracks the plan predicts as lane-scarce (racers-per-lane above a
   global threshold, read from physics), the author writes the front band's curves to arrive with a *seeded
   speed-order that differs from the rank-order* — i.e. the tight front cluster is authored so a naturally
   faster member is placed just behind a slower one, and honest same-lane catch-up (no brake, no lane change,
   the one thing closed tracks DO allow) produces the pass. This is curve authoring (admission-side), not a
   runtime force, and it targets the exact closed-track gap. It is the arm I would run next.
2. **Decouple the accordion from proximity on closed geometry (one global rule).** Since the negative
   interaction is measured (dirt 15→30), gate the accordion's density on the same lane-scarcity read the
   open-lane invariant already computes: where lanes are scarce, the floor stays (closeness for the eye) but
   the accordion's beats thin toward zero (they only jam there). This keeps proximity's fairness win and
   removes the accordion's closed harm — one global physics-read rule, no per-track value.

## Owner-only questions

1. **Accept the tripwire on the last gap?** The proximity floor + open-lane accordion give a band-fairer,
   more continuous, honest world that beats ship's dead-finale on the OPEN tracks and matches it on some
   closed — but beating ship's *dirt* (its best track, via re-roll) needs a force. Is "beat ship on the open
   tracks + band-fairest everywhere, within the frozen budget" an acceptable landing, or is 4/4-or-nothing
   the standard (in which case the line is killed here)?
2. **Keep the proximity floor regardless?** It is the cleanest fairness+continuity win of the whole series
   (76% band, 4/4, LAW < B15 all four) and is orthogonal to the action question. Ship it as the sorter's
   default, independent of the accordion?
3. Next run: proposal 1 (authored speed-order for closed-track catch-up passes — admission-side, no force) as
   the last attempt at the closed gap before conceding the tripwire; or concede now and move to the script
   compiler (comebacks/fallbacks/variety, Q4–6) on the open-track-validated system?

---
**Branch `exp/chain-choreo`.** OFF fingerprint `7c70b1eae7d31e22` (asserted after the proximity edit).
Sim-only. Data: `reports/evolution/chain-ablate-data/`.
