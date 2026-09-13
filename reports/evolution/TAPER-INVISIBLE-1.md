# TAPER-INVISIBLE-1 — the clamp eats the taper's first two ranks, and 1.077 was never "at pace"

**What this owns:** why the taper cannot be seen at forty racers. Four questions, answered in order,
each with its address or its measurement. **Report only — nothing built, nothing lengthened, no
clamp touched, and no recommendation made.**

★ **FIRST, A CORRECTION TO MY OWN PRESENTATION.** ARRIVAL-TAPER-SHIP-1 reported arrival at 1.029–1.076
and called it "arriving at pace". **At forty racers that is 1.077 against 1.100 untapered — ten
percent became eight.** The owner watched it and could not see a difference; he is right, and the
phrase was wrong. This report establishes why the number is that small.

---

## 1 · ★★ THE TAPER RUNS — AND THE CLAMP EATS ITS FIRST TWO RANKS

It is **not** the one-rank case (where the span is never entered and the taper is absent). It runs:
**136 taper-active frames per race at N=40**, median over 207 comebackers.

But "active" is not "effective". The drive is `clamp(1.0 + gain·error/nActive + noise, minMult,
maxMult)` with `gain 2.0`, `maxMult 1.1`. The taper scales the ERROR; the clamp then discards
anything above the ceiling. At four ranks:

| N | e=4 | e=3 | e=2 | e=1 |
|---|---|---|---|---|
| taper factor `approachDrive(e,4)` | **1.000** | 0.741 | 0.259 | 0.000 |
| tapered error | 4.000 | 2.222 | 0.519 | 0.000 |
| **N=20** commanded | 1.100 ★sat | 1.100 ★sat | 1.052 | 1.000 |
| **N=40** commanded | 1.100 ★sat | **1.100 ★sat** | 1.026 | 1.000 |
| **N=60** commanded | 1.100 ★sat | 1.074 | 1.017 | 1.000 |
| **N=100** commanded | 1.080 | 1.044 | 1.010 | 1.000 |

★★ **A SIMILAR EDGE DOES BITE AT FOUR RANKS AND FORTY RACERS, AND IT IS THE CLAMP.**

- At **e=4** the factor is **exactly 1.000** — the span's own edge, so the taper changes nothing at
  all on the frame it starts. That is by design (full drive at the start), but it means a "four-rank"
  taper has at most three ranks of authority anywhere.
- At **e=3** the tapered error is still 2.222, and `2 × 2.222 / 40 = 0.111 > 0.1` — **still
  saturated.** The taper is computing a reduction the clamp then throws away.

★ **SO THE EFFECTIVE TAPER DISTANCE IS NOT FOUR RANKS:**

| N | nominal | ★ effective (ranks where the command is actually below the ceiling) |
|---|---|---|
| 20 | 4 | **2** |
| 40 | 4 | **2** |
| 60 | 4 | 3 |
| 100 | 4 | 4 |

**At the field size he watches, a four-rank taper is a two-rank taper.** And two ranks is the distance
the sweep had already called too short.

---

## 2 · ★★ HOW LONG IT ACTUALLY GETS — THE 2 480 ms WAS A NOMINAL FIGURE

**Method.** `exp-arrival-shape.mjs`, ten tracks at their own default racer, 30 races per cell —
**1 200 races, 717 comebackers.** NOMINAL = from the first frame `approachDrive` returns below 1 to
arrival. EFFECTIVE = from the first rank where the commanded drive is actually below `maxMult`.

| N | n | nominal window | ★ EFFECTIVE window | p10 effective | the ease needs |
|---|---|---|---|---|---|
| 20 | 189 | 2 384 ms | ★ **448 ms** | 80 ms | ~1 000 ms |
| 40 | 207 | 2 432 ms | ★ **464 ms** | 64 ms | ~1 000 ms |
| 60 | 166 | 3 056 ms | 3 056 ms | — | ~1 000 ms |
| 100 | 155 | 3 408 ms | ≥3 408 ms | — | ~1 000 ms |

★★ **THE 2 480 ms THAT JUSTIFIED FOUR RANKS WAS THE NOMINAL WINDOW.** It was not an N=20 figure read
as general — it is worse than that: **it counted every frame the taper was computing a reduction,
including the frames where the clamp discarded it.** At forty racers the taper has **464 ms of real
authority against an ease that needs about 1 000 ms**, and at the tenth percentile it has **64 ms**.

Of the 136 taper-active frames per race at N=40, only about **29** (464 ms at the 16 ms physics step)
change the commanded drive at all. **Roughly one taper frame in five does anything.**

★ At sixty and a hundred racers the effective window IS the nominal one, and that is exactly where the
arrival pace is best (1.053 and 1.029). The mechanism and the outcome agree.

---

## 3 · ★ WHAT A VIEWER CAN ACTUALLY SEE

**Method.** The camera's own `visibleWorldPx` recorded over the comebacker's approach (released, still
within five ranks of his place), city-circuit, N=40, 8 races, **1 572 approach frames**. Closing speed
against a racer at 1.0 is `(m − 1) × 150 world px/s` (`normalSpeedPxPerSec`), converted at the zoom
actually in use.

**The camera is close during the approach: `visibleWorldPx` p10 165 · median 225 · p90 284** — 225
world pixels across a 1280-pixel canvas is about **5.7× magnification**, so small speed differences
are magnified nearly six times.

| pace multiplier | closing speed, world px/s | ★ ON SCREEN, px/s | seconds to eat 100 screen px |
|---|---|---|---|
| 1.100 untapered | 15.00 | **85.3** | 1.2 s |
| ★ **1.077 — what N=40 delivers** | 11.55 | ★ **65.7** | 1.5 s |
| 1.051 (what N=20 delivers) | 7.65 | 43.5 | 2.3 s |
| 1.040 | 6.00 | 34.1 | 2.9 s |
| 1.020 | 3.00 | 17.1 | 5.9 s |
| 1.000 | 0.00 | 0.0 | — |

★★ **1.077 IS STILL THREE QUARTERS OF THE UNTAPERED RUSH.** 85 screen pixels per second becomes 66 —
a 23% reduction on a canvas 1280 wide. He is watching a racer eat 100 pixels in 1.5 s instead of
1.2 s. **There is no reason he should be able to see that**, and the report that called it "arriving
at pace" was measuring the number rather than the picture.

★ **STATED IN WHAT HE SEES:** halving the apparent rush needs about **1.05**; making him look like he
is settling rather than closing needs about **1.02**, where the gap takes six seconds to move 100
pixels. **No threshold is proposed here** — this is what the multipliers look like, and where the line
falls is his eye's to draw.

---

## 4 · ★★ CAN THE TAPER REACH IT AT ALL? NOT AT FORTY RACERS BY SHORTENING THE ERROR

The drive saturates whenever `gain × tapered_error / nActive ≥ maxMult − 1`, i.e. whenever

    tapered_error ≥ 0.05 × nActive

At N=40 that is **2.0 ranks of tapered error**. The taper's factor at the start of its span is 1.0 by
construction, so at any distance D the tapered error at `e = D` is exactly D — **and the command is
saturated for every rank from D down to wherever the tapered error falls below 2.0.**

★★ **SO THE FINDING IS NOT "CHOOSE A LONGER DISTANCE".** Lengthening the taper adds ranks at the FAR
end, where the tapered error is largest and the clamp is already discarding the reduction. At forty
racers every rank with a tapered error of 2.0 or more is saturated no matter how long the span is;
the taper only ever gains authority over the last stretch where the error is already small. **The
binding term is the clamp against `gain × error / nActive`, not the taper's length.**

★ And the last stretch is short in TIME, which is the other half of the trap: the two ranks that do
have authority pass in 464 ms median and 64 ms at p10, against an ease that needs about a second. Even
where the taper is allowed to act, the multiplier cannot follow it.

★ **WHAT IS NOT ESTABLISHED HERE, AND IS NOT CLAIMED.** This report does not measure whether any other
lever reaches a visible arrival — not the gain, not the clamp, not the ease duration, not a
time-based taper. It establishes only that **shortening the error over more ranks cannot**, at the
field size he races. No alternative is proposed.

---

## WHAT THIS MEANS FOR THE RECORD

The shape does what ARRIVAL-TAPER-SHIP-1 measured — the arrival pace numbers there are correct. What
was wrong was the language: **1.077 is not "at pace"**, and the 2 480 ms that justified four ranks was
a nominal window that the clamp had already emptied of most of its content. The owner looked at the
screen and read it correctly before any of this was measured.
