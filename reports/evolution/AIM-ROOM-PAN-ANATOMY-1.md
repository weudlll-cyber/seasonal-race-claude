# AIM-ROOM-PAN-ANATOMY-1 — they are not pans, they are a zoom; the shot STAYS, and neither candidate is the author

> **MEASURE ONLY. Nothing changed, nothing fixed, nothing proposed.** Measurement and documents, so
> **no fingerprint is in reach and the browser gate does not apply** — neither was run, and that is
> stated rather than performed. Dev server left on master.

**The headline is a correction to my own reporting.** I called these seven events *"whole-screen
single-frame pans"* in AIM-ROOM-REPAIR-1, AIM-ROOM-COMBINED-1, the `v-ship-aim-room` register entry
and the fingerprint mint text. **They are not pans.** The picture's subject moves 12–149 screen px,
not the 1,594–5,137 px the metric reports. What actually happens is a **zoom**, and the number I was
quoting measures the camera offset, which must move when the zoom does.

---

## 1. THE UNIT — screen px, and the comparison was valid as arithmetic

`camStep` is `hypot(offsetX − prevOffsetX, offsetY − prevOffsetY)`, and `projection.toScreen` is
`pt.x * camZoom * axisX + offsetX` — the offset is added to an already-scaled screen coordinate.
**`offsetX`/`offsetY` and therefore `camStep` are SCREEN PIXELS.** So 5,320 px against a 1,280 px
frame is a valid comparison *of the offset*.

**But the offset is not the picture.** The camera zooms about the world origin, so when the zoom
changes the offset must move to keep the subject framed. A large `camStep` accompanied by a zoom
change says nothing on its own about apparent motion — which is exactly the case here.

---

## 2. WHAT THE SEVEN FRAMES ACTUALLY ARE

Every one of the seven, on the merged tree (river-run, N=20, the seeds and frames taken from the rows
AIM-ROOM-SHIP-1 already collected):

| seed | frame | camStep | zoom, one frame | **leader moves** | screen-heading turn | anchor miss | binding |
|---|---|---|---|---|---|---|---|
| 34 | 1415 | 4873.0 | 1.075 → 2.082 (**×1.94**) | **81.5 px** | 1.02° | 106.2 | field → **state** |
| 38 | 1476 | 4902.8 | 1.094 → 2.073 (**×1.90**) | **120.7 px** | 0.29° | 18.1 | field → **state** |
| 87 | 1464 | 1593.7 | 1.180 → 1.498 (×1.27) | **12.5 px** | 0.27° | 67.9 | field → **state** |
| 117 | 1479 | 5136.6 | 1.090 → 2.115 (**×1.94**) | **106.6 px** | 0.30° | 12.3 | field → **state** |
| 154 | 1478 | 4718.4 | 1.099 → 2.043 (**×1.86**) | **148.8 px** | 0.29° | 19.3 | field → **state** |
| 210 | 1478 | 4672.9 | 1.147 → 2.080 (**×1.81**) | **143.2 px** | 0.32° | 34.2 | field → **state** |
| 247 | 1469 | 2333.5 | 1.087 → 1.563 (×1.44) | **54.4 px** | 0.48° | 48.7 | field → **state** |

**The subject moves between 1% and 12% of the frame width.** The offset moves 1.2 to 4.0 frame-widths.
The difference between those two numbers is the zoom change, and nothing else.

**The zoom step is the real event, and it is large**: the shot closes by up to **×1.94 in a single
frame**. That is a hard cut in scale. It is a genuine fault worth having — it is simply a different
one from the fault that was recorded.

**All seven cluster at frames 1415–1479**, within 64 frames of each other across seven independent
races. That is a race-phase event, not scattered noise.

---

## 3. THE SHAPE: **STAY**, and there is no recovery because the shot does not come back

On all seven the camera does not return. Distance from the pre-step position keeps growing — seed 34:
4873 → 4995 → 5088 → 5149 → 5177 → 5187 → 5189 — and it never approaches the old value.

**But "recovery" is the wrong frame for it.** The zoom does not overshoot and come back; it **arrives**
at `LEADER_ZOOM`'s own zoom, 2.133, and stays there for the rest of the window:

| seed | zoom before | at the step | settles at | **arrival** |
|---|---|---|---|---|
| 117 | 1.090 | 2.115 | 2.133 | **3 frames — 0.05 s** |
| 34 | 1.075 | 2.082 | 2.133 | **4 frames — 0.07 s** |
| 38 | 1.094 | 2.073 | 2.133 | **5 frames — 0.08 s** |
| 210 | 1.147 | 2.080 | 2.133 | **5 frames — 0.08 s** |
| 154 | 1.099 | 2.043 | 2.133 | **6 frames — 0.10 s** |
| 247 | 1.087 | 1.563 | 2.133 | **16 frames — 0.27 s** |
| 87 | 1.180 | 1.498 | 2.133 | **19 frames — 0.32 s** |

**So it is the second shape, with a qualification.** It is a hard cut — but to the *right* place, not
the wrong one: 2.133 is `LEADER_ZOOM`'s own setting, the framing that state is supposed to deliver.
Five of the seven get essentially all the way there in the same frame and are settled inside a tenth
of a second; two (seeds 87 and 247) take a visible **0.27–0.32 s** to close the rest of the way, and
those two are the ones a viewer would most likely read as a move rather than a cut.

---

## 4. WHICH CANDIDATE — NEITHER. The data separates them and points elsewhere

**The heading is NOT turning fast.** The screen-heading turn rate is **0.27°–0.53° per frame**
throughout every window, and at the step frame it is **0.27°–1.02°** — ordinary, and on five of the
seven *identical* to the neighbouring frames. **The perpendicular flipping in a bend is ruled out.**

**The anchor offset is not supported either.** The anchor miss at the step is 12.3, 18.1, 19.3, 34.2,
48.7, 67.9 and 106.2 px — spread across the whole ordinary range, with no spike at the step. On most
of the seven it is *falling* through the window (seed 34: 37.8 → 31.2 → 24.8 → 19.0 → **106.2**, then
101.4 → 97.0 → …; seed 117: 23.2 → 17.8 → 13.0 → **12.3** → 9.5). It is not the author.

**What IS coincident, on all seven without exception: `binding` flips `field` → `state` at exactly the
step frame.** The field guarantee stops being the widest authority, and the shot is released to the
state's own, much tighter zoom.

That matches a mechanism already written into the code. `_fieldCeiling` retires by returning
`Infinity` the moment its ceiling falls below `_overviewStateZoom`, and the retirement is **latched,
one way** — `CameraDirector.js` says so in those terms, and gives the reason: a field that re-converges
would otherwise re-impose the wide shot and the picture would breathe in and out. **The retirement has
no ease.** One frame it is holding the shot at 1.07–1.18; the next it is gone and `state` governs at
2.133.

**Stated as an association, not a proof.** This measurement establishes that the binding term changes
at the step on all seven, that the zoom roughly doubles there, and that neither offered candidate is
present. It does not instrument the retirement itself, so "the field guarantee retiring is what fires
this" is the reading the data supports, not something it demonstrates. Confirming it would mean
recording `_fieldGuaranteeActive` across the step, which was not done here.

**Why the floor is implicated at all**, since the retirement predates it: the wiring repair made every
guarantee — the field ceiling included — measure from the floored anchor, which moves *when* its
ceiling crosses the retirement threshold. Master before the floor has none of these events; the
combined tree has seven. That is consistent with the floor moving the crossing into mid-race, and it
is not established here either.

---

## 5. WHAT THIS CORRECTS

**Withdrawn: the description of these events as pans, and the "whole-screen" figure attached to them.**
It appears in `reports/evolution/AIM-ROOM-REPAIR-1.md` §4, `reports/evolution/AIM-ROOM-COMBINED-1.md`
§2, the `v-ship-aim-room` entry in `docs/TAGS.md`, and the camera/render mint text in
`docs/fingerprints.json`. Those records are otherwise accurate — the count of seven, the seeds, the
`camStep` values and the comparison against master's zero are all correct as measured. **What is wrong
is the interpretation**: `camStep` is the offset, and with the zoom changing by up to ×1.94 the offset
had to move. The picture moves 1–12% of the frame, not four frame-widths.

**Not withdrawn:** that these are real, visible events. A ×1.9 change of scale in one frame is a hard
cut, and on two of the seven the close takes a third of a second. Whether that reads as a fault on
screen is his eye's to judge, not this report's.

---

## Limits

**Seven frames on one track.** The pattern is unanimous across them and they cluster in a 64-frame
band, but this is river-run only, at N=20, with the harness's fixed camera seed.

**The mechanism is associated, not instrumented.** `binding` flipping `field → state` is recorded on
every one; the retirement itself was not observed, and no counterfactual was run.

**No new sweep was needed for the seeds and frames** — those came from the rows AIM-ROOM-SHIP-1
already collected. What the existing rows did not carry was camera position and heading, so those
seven races were re-run to record them; nothing else was measured and nothing was changed.
