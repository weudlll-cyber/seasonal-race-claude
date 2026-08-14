# EDGE-SLICE-1 — Nova is not a contender, and the harness has been grading the wrong set

**Branch:** `feat/contender-zoom` @ `60fa2cb1`. **DIAGNOSIS ONLY — product source untouched, nothing
minted, 4173 unchanged.** Instrument: `scripts/edge-slice-truth.mjs`.

---

## 1. The racer he is pointing at, and the answer is NO

**Ice-track seed 9, the crossing frame** (zoom 17.04, binding `state`, 3 contenders). The racer cut
at the top edge is **Nova**, 5th by track position, screen `(446, −9)`:

| | |
| --- | --- |
| gap to the leader | **1.60 body lengths** |
| nearly level? (≤ 1 body length) | **NO** |
| ahead of him on his lane | **#1 — the leader himself** |
| **contender?** | **NO — he fails BOTH conditions** |

**This is not a rule violation.** He is more than a body length back *and* sitting directly behind
the leader on the same lane, which is exactly the case the rule exists to exclude: he would have to
move aside and then still overtake, and there is no room for that in the photo finish.

**No contender is sliced anywhere in that race** — 0 of 274 photo-finish frames.

**One thing the harness cannot tell you: his colour.** Racer colour is assigned in the screen layer,
not the engine, so a headless run has none. He is identified by position instead, which is
unambiguous here — only two racers are at the top edge and only Nova's body still overlaps the frame.

## 2. How often a non-contender is sliced

| | ice-track seed 9 | ten tracks × three seeds |
| --- | --- | --- |
| photo-finish frames | 274 | 7468 |
| frames with a **non-contender** sliced | **221 (80.7%)** | **5295 (70.9%)** |
| extra width to include the sliced one whole | median **17.9%**, worst 37.4% | median **12.1%**, worst **44.4%** |

**Including Nova specifically, at that frame, costs 21.3% more width.**

So it is not a rare event — on seven frames in ten somebody who is not contesting the win is clipped
by an edge. The owner has already said their presence is not a defect; this says how often the
*half*-presence happens.

## 3. A correction to my own instrument, and it matters

**Two things were wrong with how I have been measuring this.**

**(a) The slice test required the centre to be inside the frame.** Nova's centre is 9 px *above* the
top edge while his body still hangs into it — so the first run of this instrument classified the very
racer the owner is pointing at as "outside", i.e. as not visible at all. A racer is sliced when his
drawn body **intersects the boundary**, whichever side his centre falls. Same family of error as the
centre test FRONT-GROUP-1 replaced; fixed here.

**(b) `contender-truth.mjs` grades its OWN reconstruction of the contender set, not the director's.**
It recomputes membership on the first frame it observes the photo finish; the director captured it
one frame earlier, at the transition. Measured against the **director's actual set**, contenders are
sliced on **7.6%** of photo-finish frames pooled — against the **3.4% not-whole** that
`contender-truth` reports. **The director's set is the authoritative one, so 3.4% understates.**

**That does not change §1** — ice-track seed 9 has zero contenders sliced on either set — but every
pooled contenders-whole figure I have reported should be read as measured against a reconstruction.
Correcting the harness to read `_photoFinishContenders` directly is a small change and is the first
thing I would do next.

## 4. What "never half-cut" would cost

Two policies, and they are not equally available:

**INCLUDE — widen until the sliced racer is whole.** Cost is a wider shot at the crossing: **median
12.1%, worst 44.4%** extra width; **21.3% for Nova's frame**. It cannot cost contenders-whole
anything — widening only ever adds — so the price is purely the tighter shot the owner asked for
being given back, on the 71% of frames where somebody is clipped.

**PUSH OUT — tighten until he is fully gone.** Available on **97.5%** of sliced non-contenders; on
the other 2.5% the sliced racer sits *nearer the frame centre* than a contender does, so tightening
to expel him would cut the contender instead. **So push-out cannot be a blanket rule** — it needs a
fallback to include on that 2.5%, or it trades one slice for a worse one.

**Neither is built.** The honest summary for the decision: including is always safe and costs width
on most frames; pushing out is nearly always possible and costs nothing, but has a 2.5% tail where it
conflicts with the rule he has already accepted.
