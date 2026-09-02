# SEED-117-SETTLE-1 — the race is the same; the step is there; and "not noticeable" is not what the data says

> **MEASURE ONLY. No behaviour change, no sweep.**

**(b) is ruled out.** At seed 117 with the default roster the browser-faithful arm and the harness run
**the same race** — identical finishing order and identical finish times to four decimal places.

**But (a) as posed does not hold either.** The step is not a small thing that fails to register: at
frame 1482 the **visible world halves in a single frame** and **five of twenty racers leave the
picture**. The honest third answer is that it is there, it is large, and it does not look like a
glitch — because it is a zoom-in that leaves the leader almost exactly where he was, and a zoom-in
that keeps its subject still is indistinguishable from the camera simply closing in, which is
something this camera does constantly.

---

## 1. THE OUTCOME COMPARISON — (b) is ruled out

Run against the project's own browser-faithful arm, `goldenRunner.realArm` — the one
`goldenRealArm.test.js` pins as byte-identical to the real browser arm — with the harness arm built
by `raceDriver.buildRace`, both at river-run, seed 117, 20 racers, duck, roster = the first 20 names
of the default set.

| rank | racer | harness finish | browser-faithful finish |
|---|---|---|---|
| 1 | 3 Flash | 59.664 | 59.664 |
| 2 | 16 Flare | 59.744 | 59.744 |
| 3 | 6 Nitro | 59.888 | 59.888 |
| … | … | … | … |
| 19 | 17 Surge | 61.472 | 61.472 |
| 20 | 9 Zephyr | 62.784 | 62.784 |

**Finishing order identical: true. Largest finish-time difference: 0.0000 s** across all twenty.

**So the roster was the last divergent input for the race.** With it supplied, `resolveIdentity`'s
remaining defaults — `seconds: 60`, `canvasW/H`, `cameraSeed` derived by the browser's own
`cameraSeedForRace` — all match what Quick Test produces for river-run, and nothing else
`resolveIdentity` leaves unset changes the physics at this identity. There is no second missing input
to name.

---

## 2. WHAT THE STEP ACTUALLY IS, in the delivered picture

river-run, seed 117, default roster — the delivered camera, frame by frame:

| frame | t | camStep | zoom | leader on screen | **leader moves** | **visible world** | **racers on canvas** |
|---|---|---|---|---|---|---|---|
| 1479 | 42.67 | 77.9 | 1.100 | 669.1, 378.4 | 4.9 | 776 × 437 | 20 |
| 1480 | 42.68 | 67.6 | 1.085 | 667.0, 375.1 | 3.9 | 786 × 442 | 20 |
| 1481 | 42.70 | 55.3 | 1.073 | 665.4, 372.8 | 2.7 | 795 × 447 | 20 |
| **1482** | **42.72** | **5311.0** | **2.133** | 680.7, 370.3 | **15.5** | **400 × 225** | **15** |
| 1483 | 42.73 | 7.6 | 2.133 | 680.6, 369.9 | 0.4 | 400 × 225 | 15 |
| 1484 | 42.75 | 1.1 | 2.133 | 682.1, 375.9 | 6.2 | 400 × 225 | 16 |

**One frame. 1/60 s.** The zoom goes **1.073 → 2.133, ×1.99**, and stays there — it does not overshoot
and it does not come back. The frame settles within two frames (camStep 7.6 then 1.1).

### Why a 5,311 px offset step moves the leader only 15.5 px

The camera zooms **about the world origin**, not about its subject: `toScreen` is
`pt.x · camZoom · axisX + offsetX`. Double `camZoom` and every world point's scaled coordinate
doubles, so `offsetX` must move by roughly the same amount in the opposite direction for the subject
to stay put. The leader here sits about 4,900 world-scaled px from the origin, so a ×2 zoom demands
about 4,900 px of offset to hold him — which is what the 5,311 px is.

**`camStep` therefore measures the bookkeeping, not the picture, whenever the zoom changes.** The
leader moving 15.5 px is the picture. That reconciles the two numbers, and it is why PAN-ANATOMY-1's
correction — these are not pans — was right.

---

## 3. BUT IT IS NOT INVISIBLE, AND SAYING SO WOULD BE WRONG

The reconciliation explains why the *subject* does not lurch. It does not make the event small:

- **The visible world halves in one frame** — 795 × 447 world px to 400 × 225. That is the shot going
  from wide to tight instantly.
- **Five of twenty racers leave the frame** — 20 on canvas at 1481, 15 at 1482.
- It happens at **42.7 s of a ~60 s race**, in the middle of what he would be watching.

**A ×2 zoom snap that drops a quarter of the field is a large change.** The claim "it is there and it
is simply not noticeable" is not supported by anything measured here, and closing the finding on that
basis would be closing it on a guess.

**What IS supported is a different reading of the same data.** The event has none of the signatures
that make a camera fault legible: the subject does not jump, nothing swings sideways, there is no
overshoot and no correction afterwards. It reads as the camera deciding to close in on the leader —
which is a thing it does, deliberately, many times a race. **Not invisible; unremarkable.** That is a
statement about what it looks like, and it is his eye that settles whether it is acceptable, not this
report.

---

## 4. THE ONE DIFFERENCE STILL UNTESTED, named and not swept

**The harness runs a fixed 60 Hz clock; the browser runs on wall clock.** `runRace` says so in its own
words — every instrument on this driver has run at a fixed 60 Hz, which makes them blind by
construction to frame-rate dependence — and it exposes `hooks.frameMs` for exactly that reason. It
was **not** used here.

That matters for this specific event, and the evidence is already in hand: in the nameless seed-34
run the zoom took **four frames** to arrive (2.082 → 2.103 → 2.120 → 2.130 → 2.133), while here it
arrives in **one**. The delivered zoom is reached through a dt-scaled lerp, so how abrupt this looks
depends on the frame durations the browser actually serves. **A run under a variable clock is the
measurement that would settle how it lands on his screen, and it is deliberately not run here.**

**This does not reopen (b).** The race outcome is a physics result on a fixed-step accumulator and is
identical; the frame clock moves where the *camera* samples, not who wins.

---

## Limits

**One seed, one track, one racer count.** Seed 117, river-run, 20 ducks, the default roster.

**The browser arm is `realArm`, not a browser.** It is the project's browser-faithful path and is
pinned byte-identical to the real browser arm by `goldenRealArm.test.js`, which is why it is trusted
here — but no browser was driven for this report. Nothing was read off his screen.

**"Unremarkable" is a reading, not a measurement.** What is measured is the zoom ratio, the visible
world, the racer count and the leader's displacement. Whether that reads as a fault is his.
