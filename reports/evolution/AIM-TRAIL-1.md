# AIM-TRAIL-1 — why does the camera trail its own aim?

**Branch:** `docs/aim-trail-1`, off master `48c72aee`. **INVESTIGATION ONLY.** No camera change, no
key, no fix, no revert, no candidate built. `CameraDirector.js` was read and never edited. **The
repository's code is byte-identical to master; this block adds one report and one index line.**

## THE ANSWER

**The trail is not a defect. It is the designed cost of smooth panning, and it is OLDER than the
commit blamed for it — measurably WORSE before that commit than after.**

**So B′ is the right answer, and this question should stop being paid for.**

---

## Q4 FIRST, BECAUSE IT DECIDES THE REST — IS THE TRAIL OLD?

Measured with **`gun-window-truth`'s own `lag` column** — world px between the camera and its resolved
target — run **at each commit**, dirt-oval, n=20, the tool's own identity. The tool was added by
`ca178cc5` itself, so all three commits carry it and no adaptation was needed.

| at ms | `ca178cc5` (parent) | `c3f294d1` | master `48c72aee` |
| ----- | ------------------- | ---------- | ----------------- |
| 0     | 16.1                | **2.5**    | **2.5**           |
| 1000  | **313.7**           | **15.8**   | **15.8**          |
| 2000  | 107.4               | **16.2**   | **16.2**          |
| 3000  | 104.0               | **78.2**   | **78.2**          |
| 4000  | 100.6               | **17.8**   | **17.8**          |

**The parent trails its own target MORE at every one of the five samples.** `c3f294d1` cut the
world-space lag by up to 20× and it has not moved since — the commit and master are identical to the
decimal.

**A second reading in the same table, and it is not small:** at 1000 ms the parent has **10 racers
outside the picture**; the commit and master have **0**. The 8 August commit did not introduce a
tracking problem. It reduced one.

**What it did change is the zoom** — the parent's OVERVIEW target is a flat **4.5489**, the commit's a
flat **8.4602**, **1.86× tighter**. A smaller world lag, seen through a shot that covers 1.86× less
world, lands further outside the frame in pixels.

**This is the brief's first branch:** the trail was already there, `c3f294d1` only made it visible.
There is no second defect and nothing to date.

---

## Q1 — WHAT MOVES THE AIM

The aim is composed in three recorded stages: **the subject the framing chose** (`anchorPoint`) →
**the forward bias** (`afterBias`) → **the lateral guarantee** (`afterLateral`). Projected with the
delivered camera, per frame, seed 9, 20 racers:

| track     | subject → bias           | bias → lateral | who supplies the aim                    |
| --------- | ------------------------ | -------------- | --------------------------------------- |
| dirt-oval | **0 px at every sample** | **0 px**       | the subject, entirely                   |
| searound  | **0 px**                 | **0 px**       | the subject, entirely                   |
| river-run | 0 px                     | 1–13 px        | the subject, with a small lateral shift |

**The forward bias contributes nothing in this window on any track measured** — it fires only when the
observer is in `follow`, and the observer is `idle` until the release at 4983 ms.

**The jump is a STEP IN AN INPUT, not motion of the field.** The aim's world speed sits at
**120–170 px/s** for the whole window and then spikes for a single frame at ~2.5–3.0 s:

| track     | aim speed, baseline | at the step   | aim, before → after   |
| --------- | ------------------- | ------------- | --------------------- |
| dirt-oval | 133–142 px/s        | **5555 px/s** | 1054 → 1515 screen px |
| searound  | 150–157 px/s        | **9920 px/s** | 952 → 1348            |
| river-run | 121–123 px/s        | **2692 px/s** | 760 → 848             |

**The input that steps is `anchorPoint` — the subject.** `subX` steps by exactly the same amount as
`aimX` in the same frame on all three tracks, and the two later stages contribute nothing to it. The
field does not teleport; **the framing changes who it is pointing at.**

**It happens on open tracks too** — river-run steps 2692 px/s in the same window. **The step is not
the discriminator.**

---

## Q2 — WHY THE CAMERA DOES NOT KEEP UP

**An exponential smoother, and its time constant is an explicit setting.** From
`cameraTimingComputation.js`, inverted from the shipped per-frame factors:

| phase               | per-frame factor | **time constant** | 90% convergence |
| ------------------- | ---------------- | ----------------- | --------------- |
| tracking, OVERVIEW  | 0.14230          | **0.250 s**       | 0.86 s          |
| **entry, OVERVIEW** | 0.02526          | **1.500 s**       | **5.18 s**      |
| entry, LEADER_ZOOM  | 0.04684          | 0.800 s           | 2.76 s          |

**The whole start window is the `entry` phase** — measured, not assumed: `_lerpPhase` reads `entry`
on every frame from the gun to the release at **4983 ms**, on every track. **The entry constant is six
times slower than the tracking one, and its 90% convergence time (5.18 s) is almost exactly the
window.** The camera is deliberately slow to settle at the start.

**Is the trail the smoother behaving as designed, or something else? As designed.** For an
exponential smoother of constant τ against a target moving at speed v, the steady-state lag is
**v·τ**. With v = 120–160 world px/s and τ = 1.5 s that is **180–240 world px**. The measured lag at
master is **2.5–78.2** on dirt-oval and **43.6** on river-run — **the camera never reaches even its
designed steady-state error.** Nothing is saturating, nothing is clamping (`clamp` reads 0.0 for the
whole window on dirt-oval), and no rate limit is involved.

**It is a smoother with a 1.5 s time constant doing exactly what a smoother with a 1.5 s time
constant does.**

---

## Q3 — WHY CLOSED TRACKS AND NOT OPEN ONES

Same instrument, same identity, at master, at 3000 ms:

| track     | kind   | world lag | zoom      | **screen trail = lag × zoom** |
| --------- | ------ | --------- | --------- | ----------------------------- |
| river-run | open   | 43.6      | **1.198** | **52 px**                     |
| dirt-oval | closed | 78.2      | **8.460** | **662 px**                    |
| searound  | closed | 257.4     | **6.161** | **1585 px**                   |

**Two factors compound, and both are needed to explain the difference.** The world lag is 1.8–5.9×
larger on the two closed tracks, and the zoom is **5–7× higher** — closed tracks apply `bsX` on top of
`cam.zoom` while open tracks do not. The product differs by **12–30×**, which is the gap between a
trail nobody notices and one that carries the leader out of the picture.

**Why the world lag itself is larger on a closed course is NOT ESTABLISHED.** The obvious candidate —
the target moving faster — is refuted: the aim's world speed is 133–142 px/s on dirt-oval against
121–123 on river-run, near enough the same. I have no measurement that settles it and am not offering
a mechanism the numbers do not show.

---

## IS IT A DEFECT? — NO, AND ON THIS EVIDENCE

Three independent readings, none of them a preference:

1. **It was worse before.** The commit blamed for it cut the world lag by up to 20× at every sample
   and took the racers-outside count at 1000 ms from 10 to 0.
2. **It is inside its own design envelope.** The measured lag never reaches the steady-state error the
   configured 1.5 s time constant implies (180–240 world px). A smoother that is not even at its
   designed lag is not misbehaving.
3. **The time constant is a chosen setting**, six times slower in `entry` than in `tracking`, with a
   90% convergence deliberately sized to the opening.

**What the owner is seeing is not a camera failing to keep up. It is a camera opening slowly on
purpose, at a zoom that turns its normal, designed lag into 662 or 1585 screen pixels.**

**So the smallest honest correction is not to the trail.** Shortening the entry constant would make
the opening snappier **on all ten tracks, including the five where nothing is wrong today**, to
correct something that is not a defect — and it would move the very number `c3f294d1` was written to
protect. **The lever is the picture, not the pan**, which is what B′ already is.

---

## WHAT THE OWNER WOULD SEE UNDER ANY CORRECTION TO THE TRAIL

**Not recommended, and priced only so the option is closed honestly.**

- **On a closed track** (dirt-oval, searound, city-circuit): the camera would settle onto the field
  sooner, so the leader would be recovered earlier than the ~3.9 s it takes today — but the opening
  would lose the slow, deliberate settle, because the same constant governs both.
- **On an open track** (river-run, mountainstreet and the other three): **a visible change where
  nothing is wrong today.** The trail there is 52 screen px — invisible — and the only thing a
  shorter constant would do is make the start feel more abrupt.

**That is the whole argument against touching it:** every track pays, five of them for nothing, and
the thing being corrected is within its own design envelope.

---

## FINGERPRINTS AND THE CLOSING STATE

**Nothing changed, so nothing could move.** No source file, no config, no test — the diff is this
report and its index line. The instruments were the committed `gun-window-truth` (run at three
commits, unmodified) and a scratchpad recorder that **reads** `_framingProbe`; it was not committed.

```
engine-reach --check reports/evolution/AIM-TRAIL-1.md reports/evolution/INDEX.md
  ENGINE REACH: none of 2 path(s) can reach the race engine.
```

**MINTED NOTHING.**

**One correction made mid-investigation, recorded because it nearly became the finding.** The first
version of the recorder measured the trail as _the aim's distance from the frame centre_ and reported
900–1200 world px. **That was wrong**: the anchor is designed to sit off-centre — at screen x **845**
on dirt-oval, not 640 — so measuring against the centre counts the design as error. It was caught
because it disagreed with `gun-window-truth`'s own `lag` by an order of magnitude, and the instrument
was corrected to measure against `anchorScreenPoint`'s intended position before any conclusion was
drawn from it.

---

## PROPOSALS

### Proposal A — ship B′ and close this line of enquiry

Three blocks have now been spent on the start: START-BISECT-1 dated it, START-SHAPE-1 measured it and
priced the candidates, and this one has established that the remaining suspect **is not a defect**.
**There is nothing further to learn before deciding.**

B′ — the visibility requirement read off the delivered frame, leader only — fixes the reported defect
on all three tracks that have it, **changes 0 of 2400 frames on every open track**, and does not touch
the pan, the smoother, or anything `c3f294d1` protects. **The one thing still owed is his eye on the
three closed tracks where the shot opens up to 1.70× for about 1.5 s.** That is a judgement, not a
measurement, and no further block will produce it.

### Proposal B — record that the entry time constant is 6× the tracking one, where a reader will find it

The single most useful fact in this investigation took a source read plus an inversion of a per-frame
factor to recover: **`entry` OVERVIEW runs at TC 1.5 s against `tracking`'s 0.25 s, so the camera is
90% settled only after 5.18 s** — essentially the whole start. Nothing in the documents says this, and
`lfEntryByState` is a map of per-frame factors, which is the wrong unit for a human.

**The cheap form is one line beside the map giving the time constants in seconds and what they were
chosen for.** It is not a guard and needs no enforcement; it is the difference between "the camera
trails at the start" being a mystery and being a documented setting. **Two of the last three blocks
opened with a hypothesis this line would have refuted in a minute.**

### Proposal C — the `out` column was already telling us, and nobody read it

`gun-window-truth` has printed a **racers-outside-the-picture** count in its last column since
`ca178cc5`. At the parent it reads **10** at 1000 ms on dirt-oval. That is the same class of fact the
owner reported months later, sitting in a committed tool's output, on the very commit whose successor
was blamed for it.

**The proposal is not a new instrument — it is to read the one that exists before adding another.**
This block, START-SHAPE-1 and START-BISECT-1 each began by building a recorder; in all three cases
`gun-window-truth` already held part of the answer, and in this one it held the deciding part.
**Deliberately not a guard:** a number nobody looks at does not become useful by being asserted, only
by being consulted.
