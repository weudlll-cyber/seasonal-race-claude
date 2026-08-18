# START-HANDOVER-MARK-1 — the hand-over on a condition, built and measured. TWO OF FOUR.

**Branch:** `feat/start-handover-mark-1`, off master `afebc3f7`. **NOT MERGED, NOT MINTED, AND THE
DEFAULT IS UNCHANGED** — the acceptance gate missed two of its four criteria, so the switch ships
off, exactly as the gate says.

**Served on 4173 for his eye.** The build serves **today's behaviour by default**; the new one is one
tick box away. See _WHAT TO LOOK AT_ at the end — read it before opening the browser, or the start
will look the same and it will look the same for a reason.

## THE HEADLINE

**His design works, and it works better than anything built against this defect so far.** With the
switch on, the leader is **inside the frame on all ten tracks for the whole start window** — against
46, 89 and 61 out-frames on city-circuit, dirt-oval and searound today. **The zoom does not run
away**; on every track it settles on the racing shot's own setting and stays flat there. **The old
river-run defect is untouched to the digit.**

**And two criteria are missed, both on the open tracks, both by the same thing: the racing shot
arrives up to 4.5 s earlier, and a tighter shot moves the field about in frame more.** luger-hill's
field-centre drift goes 0.441 → 0.598. That is the number that stops this.

**The one design decision inside the build is worth more than the candidate.** "Hand over" had two
readings and the first one was measurably wrong; the section below traces why, because the failure
is the same coupling `archive/start-leader-visible-1` (B′) died of.

---

## WHAT WAS BUILT

**One switch, `startHandoverOnLeaderMark`, default `false`.** It changes WHEN the ceremony's hold
ends — from a clock to a condition — and nothing else.

- **Today (off):** the hold ends at the first view change. On all ten tracks that is **4983 ms**,
  because OVERVIEW's `minStateHold` is 5000. The leader can leave the picture long before it, and on
  three closed tracks he does.
- **On:** the hold ends the first frame the leader's position along his own heading reaches
  `leaderForwardFrac`. That fraction is **read, not chosen** — it is the same 0.66 the racing shot
  places him at, so the hand-over cannot come to disagree with the framing it hands over to.
- **It can only ever make the hand-over EARLIER.** If the leader never reaches the mark, nothing
  fires and the existing release happens unchanged. **The fallback is the absence of code, not a
  second condition.** _It did not fire on any of the ten: the mark is reached at 0–2900 ms
  everywhere._
- **No new fraction, no new duration, no key but the switch.**

**How "where he is" is computed.** `_leaderFrameFrac` is `anchorScreenPoint` read backwards: that
function places a subject at `frac` by displacing it `(frac − 0.5)` of the frame's chord along its
screen heading, so dividing a delivered displacement by the same chord gives the fraction back. Same
projection, same heading, same `frameExtentAlong`. A test pins the round trip to six decimals **on a
diagonal heading**, because the axis cases agree with the wrong chord formula this project already
shipped once.

---

## THE FORK THAT MATTERED — "HAND OVER" MEANT TWO THINGS, AND THE FIRST WAS WRONG

**Reading A (built first): end the hold, leave the start phase alone.** The state stays OVERVIEW for
the rest of the 5 s, so OVERVIEW's OWN setting takes the picture — a 1.5-corridor shot **no race ever
sits in there today**, because today the hold ends at the same instant the state leaves OVERVIEW.

| track            | A: out-frames | A: worst leader x | A: camera travel, first second |
| ---------------- | ------------- | ----------------- | ------------------------------ |
| **garden-path**  | 0 → **9**     | 691 → **−173**    | 1297.6 → **4815.1**            |
| **city-circuit** | 46 → 20       | −93 → **−255**    | 2153.2 → **7232.0**            |
| dirt-oval        | 89 → **0**    | 1519 → 955        | 925.4 → 925.4                  |
| searound         | 61 → **0**    | 1370 → 986        | 180.1 → 2012.1                 |

**A introduces the defect on garden-path, which is fine today** — and it is not a tuning matter. The
zoom target drops to 4.5489 on every closed track, and **widening re-resolves the pan against the
world edge**, because `resolveCamera` fits the pan inside `innerFramePct` AT THE ZOOM. That is the
exact mechanism B′ was rejected for, arrived at from the opposite direction.

**Reading C (what is built): the hand-over goes where today's hand-over goes — the ordinary racing
shot.** The forced OVERVIEW and the ceremony hold are two halves of one thing, the start being HELD;
ending one while the other stands leaves the camera in a framing that is neither the ceremony's nor
the race's. So the hand-over ends both, and the ordinary chain picks LEADER_ZOOM exactly as it does
at 4983 ms now — **through the transition grammar, which is this project's own no-jump mechanism.**

Measured on luger-hill, the whole move in one trace:

```
   ms  state        phase     hold  zoom    leader x   frac
  500  OVERVIEW     entry     Y     1.0830      876   0.655   <- short of the mark
  600  LEADER_ZOOM  glide     n     1.1124      897   0.674   <- handed over at 533 ms
  800  LEADER_ZOOM  glide     n     1.6082      948   0.694
 1100  LEADER_ZOOM  tracking  n     2.1333      961   0.682   <- the ordinary shot, flat
 2000  LEADER_ZOOM  tracking  n     2.1333      976   0.715
```

**Nothing in the hand-over writes a position** — a test asserts the camera is byte-identical across
the call. It ends a hold; the grammar does the moving.

---

## THE GATE — MEASURED, TEN TRACKS, SEED 9, 20 RACERS, GUN TO 8 s, BOTH SWITCH STATES

| track          | kind   | out-frames | worst leader x | min on screen | release ms | fieldY drift  | travel 1 s        |
| -------------- | ------ | ---------- | -------------- | ------------- | ---------- | ------------- | ----------------- |
| city-circuit   | closed | 46 → **0** | −93 → **599**  | 4 → **18**/20 | 4983 → 33  | 0.850 → 0.384 | 2153.2 → 2464.0   |
| dirt-oval      | closed | 89 → **0** | 1519 → **955** | 18 → 18/20    | 4983→1183  | 0.319 → 0.242 | 925.4 → 925.4     |
| garden-path    | closed | 0 → **0**  | 691 → 524      | 20 → 20/20    | 4983 → 33  | 0.154 → 0.071 | 1297.6 → 2340.3   |
| ice-track      | closed | 0 → **0**  | 1133 → 938     | 17 → 17/20    | 4983 → 767 | 0.442 → 0.311 | 62.4 → 1186.5     |
| searound       | closed | 61 → **0** | 1370 → **915** | 8 → 8/20      | 4983 → 0   | 0.677 → 0.558 | 180.1 → 3139.4    |
| luger-hill     | open   | 0 → 0      | 1024 → 992     | 11 → 11/20    | 4983 → 533 | **0.441 → 0.598** | 60.8 → **779.3**  |
| mountainstreet | open   | 0 → 0      | 909 → 909      | 18 → 18/20    | 4983→1983  | 0.225 → 0.225 | 86.9 → 86.9       |
| river-run      | open   | 0 → 0      | 914 → 914      | 17 → 17/20    | 4983→2900  | 0.181 → 0.181 | 36.4 → 36.4       |
| seatrack       | open   | 0 → 0      | 843 → 843      | 8 → 8/20      | 4983 → 783 | 0.667 → 0.506 | 107.2 → **1773.1** |
| space-sprint   | open   | 0 → 0      | 875 → **786**  | 5 → 5/20      | 4983 → 550 | 0.715 → 0.666 | 124.4 → **982.0**  |

**Every ON-arm release time equals that track's mark time exactly**, which is the rule doing what it
says and not something else arriving at the same moment.

### 1 · the leader is inside the frame throughout, on all ten — **MET**

**0 out-frames on every track**, from 46 / 89 / 61. On the three tracks that had the defect the
leader now parks a little past the mark and stays there: dirt-oval frac 0.715 ± 0.005 from 1.8 s
onward, city-circuit 0.717 ± 0.006 from 0.8 s onward. **city-circuit's min-on-screen goes 4/20 →
18/20** at a shot that is *tighter*, not wider — the opposite trade from B′.

### 2 · the five OPEN tracks are not made worse on any measure — **MISSED**

**river-run and mountainstreet, the two the August defect was diagnosed on, are clean.** Every
summary measure is identical on both, and river-run's frames are **bit-identical for the first
2900 ms** — the whole first second included — because that is when its mark falls.

**luger-hill is the miss, and it is unambiguous: field-centre drift 0.441 → 0.598.** Three open
tracks also move much more camera in the first second (luger-hill 60.8 → 779.3, seatrack 107.2 →
1773.1, space-sprint 124.4 → 982.0), because their marks fall inside that second and the camera
goes to the leader there instead of at 4983.

**Both are the same one thing, named rather than excused: the racing shot arrives up to 4.5 s
earlier, and it is a tighter shot, so the field moves about in frame more.** On three of the five
open tracks the drift went DOWN (seatrack 0.667 → 0.506, space-sprint 0.715 → 0.666, mountainstreet
unchanged). It is not a defect I can point at; it is the price of the design, and it is his to
accept or refuse.

### 3 · the old defect stays repaired — **MET, TO THE DIGIT**

On its own instrument and its own identity (`gun-window-truth`, river-run, n=40, seed 5601), **both
switch states**:

| number                          | recorded | switch OFF | switch ON  |
| ------------------------------- | -------- | ---------- | ---------- |
| ALONG travel, first second      | 6.4      | **6.4**    | **6.4**    |
| field centre y at 1 s           | 0.486    | **0.486**  | **0.486**  |
| zoom through the window         | 1.1650   | **1.1650** | **1.1650** |
| centre moved at the release     | 0.0      | **0.0**    | **0.0**    |

(`c3f294d1` recorded 37.4 before its fix and 6.4 after.) The release moves 4983 → 2383 ms on that
identity, and **the step is still 0.0 world px in one frame** — the hand-over is as uneventful early
as it is late.

### 4 · no positive feedback anywhere — **the zoom half MET, "no track worse" MISSED**

**No runaway, and this is the direct contrast with B′.** On every track the zoom converges on the
state's own setting and holds flat there — closed tracks 9.0978, luger-hill 2.1333 — with the framing
probe reporting `state` as the binding term. It goes **tighter**, never wider, so the widening ⇒
harder pan clamp ⇒ more widening loop cannot form: there is no widening in it.

**"No track is worse than today" fails on the same luger-hill number as criterion 2.**

### THE VERDICT THE GATE PRESCRIBES

**TWO MET, TWO MISSED ⇒ the default stays at today's behaviour, the switch stays, nothing is
tuned.** That is what is in the tree. I have not adjusted anything to make luger-hill fit, and I
would have had to invent a number to do it.

---

## HIS SECOND QUESTION — THE CAMERA DRIFTING INTO THE INFIELD ON DIRT-OVAL

**NOT ESTABLISHED as a lateral movement, and the measurement says the opposite.** Over the start
window on dirt-oval (`gun-window-truth`, n=20, gun → 5.1 s):

| what could move the aim across the track | measured over the whole window |
| ---------------------------------------- | ------------------------------ |
| camera centre travel ACROSS the track     | **7.8 world px** (ALONG: 823.9 — ratio **0.01**) |
| centre's distance from the centreline     | **0.5 – 4.0 world px**, against an **89 px** corridor half-width — max **4.5%** |
| the lateral guarantee's spend             | **0.0 – 4.2 world px** |
| the world-edge clamp's spend              | **0.0 for every frame of the window** |

**Nothing moves the aim laterally. The camera never leaves the road.**

**What DOES happen is longitudinal, and it produces the picture he described.** The field's position
in frame runs **0.507 at the gun → 0.257 at the release** — it slides into the left quarter — while
its vertical position holds at 0.45–0.50. The aim jumps forward at about 3000 ms (the tracking lag
spikes 15.2 → 78.2 world px in one sample) and the camera trails it, so on a bend the frame keeps
pointing at road the field has already left; the infield is simply the two thirds of the picture the
field has vacated. And the leader's own fraction along his heading in that window runs **0.54 → 1.18**
— past the frame's leading edge, which is exactly what "only half visible" looks like.

**I am not offering a lateral mechanism, because there is no lateral movement in the data to
explain.** With the switch ON, dirt-oval's leader stays at 0.715 and the slide does not happen.

---

## TESTS

**Ten director tests, fixtures carrying real geometry** (`client/src/modules/camera/startHandover.test.js`)
— a real `CameraDirector` with a real shape on a **diagonal** heading, so the real per-axis projection
and the real frame chord decide the answer. Each carries what breaks if it is deleted. Both
load-bearing guards are **sabotage-proven**:

| sabotage                                | result                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| fire regardless of where the leader is  | **red** — _"ON — it does NOT fire while the leader is still short of the mark"_ |
| ignore the switch                       | **red** — _"OFF — the shipped default holds even with the leader far past the mark"_ |

**What is deliberately NOT asserted: that the switch is an improvement.** It is on eight of ten
measures and is not on two. A test asserting a verdict the gate did not reach would be a test
pretending to be a decision.

---

## FINGERPRINTS — ALL FOUR MEASURED, ALL FOUR UNMOVED

**Closures established by walking each instrument's declared `reach` through `closureOf`**, not
assumed. `defaults.js` is inside all four, so "it is only a camera key" is a claim about the
CONTENTS of the diff and only a measurement can settle it:

| instrument        | closure | changed files inside it                                            | value                | verdict     |
| ----------------- | ------- | ------------------------------------------------------------------ | -------------------- | ----------- |
| WORLD             | 36      | `defaults.js`                                                      | `dc4647be0f55ebdb`   | **unmoved** |
| WORLD-OFF         | 36      | `defaults.js`                                                      | `854018ee5d3d83e1`   | **unmoved** |
| CAMERA            | 36      | `defaults.js` + `CameraDirector.js` + `cameraTimingComputation.js`  | `d9f45a4aea0e5778`   | **unmoved** |
| RENDER            | 53      | `defaults.js` + `CameraDirector.js` + `cameraTimingComputation.js`  | `1274c7e8444238e3`   | **unmoved** |

**CAMERA and RENDER were measured fresh rather than argued from the default being off** — the
director gained a method that runs on the last line of every frame, and "it returns early" is a
reading of the code, not a measurement of it. **MINT NOTHING, and nothing to mint.**

`npm run verify`: **PASS 17, FAIL 0**. Client suite: **212 files, 4134 tests, all green.**

---

## WHAT TO LOOK AT

**The build serves TODAY's start.** To see the new one: **Dev Screen → Camera (advanced) → 1 · Start
& Post-Start → "Hand over when the leader reaches his place"**, then a **Quick Test** race.

1. **dirt-oval first.** Today the leader runs off the right edge from about 2.4 s to 3.9 s. With the
   switch on he stops at about two thirds across and stays there from 1.2 s. This is the track his
   report came from.
2. **city-circuit second, and it is the one to judge hardest.** Today he is off the LEFT edge in the
   first second and the shot is at its widest with 4 of 20 racers on screen; with the switch on the
   camera goes to him at 33 ms and the shot ends up **tighter** with 18 of 20 on screen. It is the
   biggest change of the ten and it is where a wrong design would show first.
3. **luger-hill third, because it is the criterion that failed.** Nothing leaves the frame; the
   question is whether the racing shot arriving at 0.5 s instead of 5 s reads as "the race started"
   or as "the ceremony was cut off". **That judgement is the whole of the missed criterion**, and no
   number I can produce will settle it.
4. **river-run for the reassurance.** It should look **exactly** as it does today for the first
   2.9 s — that is measured, not hoped.

---

## PROPOSALS

1. **Let the mark be reached from BELOW only.** On searound, city-circuit and garden-path the leader
   is already at or past 0.66 at the gun (mark at 0, 33 and 33 ms), so the hold has nothing to hold
   and the ceremony's framing ends before the race is visibly under way. Requiring the fraction to
   have been below the mark first would make those three keep a real hold. **It is measurable in an
   afternoon and it costs no key** — and it might be what makes luger-hill's drift acceptable, since
   its mark is at 533 ms.
2. **Ask whether the start phase should be a duration at all.** `START_PHASE_DURATION` (3000 ms) and
   OVERVIEW's `minStateHold` (5000 ms) both express "hold the wide shot for a while", and this block
   found that the second is the one that actually decides — the release is 4983 ms on all ten tracks,
   the same number every time, which is the signature of a constant rather than of a picture. If the
   hand-over becomes a condition, the 3000 becomes dead weight and should be retired rather than left
   as a second authority nobody reads.
3. **Measure the field-centre drift against something other than a range.** `fieldY drift` is the
   max-minus-min over eight seconds, so one frame decides it, and it is the number that failed this
   gate. A drift RATE, or the fraction of frames the centroid sits outside a band, would say whether
   luger-hill actually looks unsteady or merely visits one extreme once.
