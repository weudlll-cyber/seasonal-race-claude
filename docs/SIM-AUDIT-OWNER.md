# SIM AUDIT — one page for the owner

I audited the simulation independently, from source, at the current code. Plain language.

## The big question first: are the traffic numbers real?

**Yes — the sim races correct-size bodies.** The scariest possibility was that the sim used the wrong
sprite sizes, which would have made "the wall is TRAFFIC" a measurement of a different game. I checked
all 20 racer types, number by number: the sim's sizes match the game exactly (0 differences), and both
use the *same shared code* to shrink the bodies for the track and to decide who blocks whom. **So the
"traffic is the wall" finding is not broken by sprite geometry.**

One honest asterisk: this holds for the **default** settings. If you have ever, in the browser, turned
off auto-scaling or hand-set a racer's size, the sim would not know about it and would race a different
size. The measurements used defaults, so they are fine — but the sim is blind to those personal tweaks.

## What you may believe

- **Multiplier facts** — "the area bonus made the pack out-drive the hero, and A2 removed it," "the hero
  spends 40% of its push just cancelling the bonus." These are arithmetic on the real game code. Solid.
- **Counts** — how many cars were passed, how many times a car was re-passed, start-row win-bias. Solid
  as counts.

## What you may NOT believe (and why)

- **"Reach-front 83%," "cast depth 50%/70%," "net places gained," "comeback."** Every one of these is
  measured in **finishing-place space**, not in **distance-behind-the-leader space**. They cannot tell a
  real comeback from a car that finished 5th, fifteen lengths back, in a strung-out field. The sim will
  happily call that a perfect comeback; your eye correctly calls it a dead race. **These numbers describe
  ranks, not the race you watch.** They must be re-measured with distance/seconds before any of them can
  claim the race was good.
- **"Band-reach is our fairness gate."** Band-reach only asks whether each car finished in the group it
  was pre-assigned. A race where the winner finishes a full lap ahead of everyone still scores a perfect
  band-reach. **It cannot see a boring race, and it is not a real test of fairness.**
- **Any conclusion tagged "comeback / lead-change / exciting" in the old reports.** Those live in rank
  space and are void as quality claims until re-done in gap space.

## Things this simulation can NEVER tell you (structural blind spots)

1. **How far behind the leader anyone is, in seconds or lengths** — no gap metric exists yet. This is the
   single most important missing thing; it is the space your eye actually judges.
2. **Whether a race is a procession or a fight** — it measures ranks, and ranks are cheap in a spread-out
   field.
3. **Whether a comeback is *visible*** — "reached rank 5" says nothing about being near the front runner.
4. **Anything you see but don't score** — the picture, the camera, how bunched the pack *looks*.
5. **Your personal browser tweaks** — turned-off auto-scale, hand-set racer sizes: invisible to the sim.

## What I did NOT finish (so you know the audit's own limits)

The executable proofs — forcing known races and asserting the metric returns the known answer, and a
frame-by-frame check that the sim matches the real game engine — are **not built yet**. Until they are, I
mark the frame-level fidelity **UNTRUSTED**: the sim uses the game's real physics *modules*, but its main
race loop is a hand-written copy with no automated proof it steps identically to the browser. That proof
is the top follow-up, alongside building the distance/seconds metrics above.

**Bottom line:** trust the multiplier facts and the counts. Do not trust any "the race was good" number —
they are all in the wrong space. The fix is to measure the gap to the leader, which the sim does not yet do.
