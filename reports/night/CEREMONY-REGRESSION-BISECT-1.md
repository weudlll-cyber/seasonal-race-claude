# CEREMONY-REGRESSION-BISECT-1 — which commit moved the camera at the gun

**2026-08-08 · measurement only, nothing built, nothing minted, nothing merged**

> **HEAD-NOTE ADDED 2026-08-09, WHEN THIS REPORT WAS LANDED (ARCHIVE-CORRIDOR-OVERLAY).**
> **Read §2's verdict as history, not as a live claim.** It pins the gun regression to `ffa68d94`
> and that was true of the trees in §1 on the day. All three of those trees are now 30+ commits
> behind: the ceremony has since gained the digits beat (CEREMONY-TRUTH-1) and the handover
> (CEREMONY-HANDOVER-1), the hold target moved, and the whole line shipped at `v-ship-the-line`.
> The camera fingerprint has been re-minted three times since this was written.
>
> **What I checked before landing it, and what I did not.** I re-ran `scripts/gun-window-truth.mjs`
> on today's master: the ceremony now runs to about **4983 ms**, so "the first second after the gun"
> is no longer the window §1 measured, and the comparison cannot be reproduced as written without
> rebuilding all three trees. At the release today the centre moves **0.0 world px in the gun frame**
> and the whole window's across/along ratio is **0.18**, against the 1.42 §1 recorded for the
> ceremony tree — but that is a different window and is offered as an orientation, **not** as a
> refutation or a confirmation of §2.
>
> **So: is the regression still there? UNKNOWN, and deliberately left so.** Answering it properly
> means re-running the three-tree comparison against today's master, which is a measurement block,
> not a line in an archive commit. What survives unconditionally is §3 — the two corrections to my
> own earlier claims — and §5's inference, which is what the corridor investigation was really for.

The owner is right, and the corridor investigation was the wrong place to look. The start grid places
racers between the boundaries, so the track's position and width are known independently of the
artwork, and the camera followed the track correctly for months. This is a regression.

---

## 1. The same measurement on three trees — river-run, first second after the gun

| | **master** `1fd0b471` | **feat/start-ceremony-camera-1** `da9a4802` | **feat/ceremony-handover-1** `b1e2f0c9` |
| --- | --- | --- | --- |
| centre → centreline, at the gun | 40.7 | 34.2 | 34.2 |
| … at 300 ms | 33.7 | **2.8** | **2.8** |
| … at 917 ms | 18.2 | 18.1 | 18.1 |
| shape of that curve | **monotonic, always approaching** | overshoots and comes back | overshoots and comes back |
| field x in frame, 100 ms | **0.26** | 0.28 | 0.28 |
| field x, 917 ms | 0.39 | 0.40 | 0.40 |
| field **y**, 100 ms | **0.50** | **0.47** | **0.47** |
| field **y**, 917 ms | **0.50** | **0.42** | **0.42** |
| centre travel ALONG the track, 1 s | **4.8 px** | **37.1 px** | **37.1 px** |
| centre travel ACROSS, 1 s | 24.8 px | 52.7 px | 52.7 px |

## 2. The commit

**`ffa68d94` — `feat(camera): the venue, then the field — the start ceremony (START-CEREMONY-CAMERA-1)`.**

**CEREMONY-HANDOVER-1 changed nothing here.** Its column is identical to the ceremony's on every row,
to the digit. Whatever is wrong at the gun on river-run arrived with the ceremony and was neither
worsened nor helped by the field guarantee.

## 3. Two corrections to what I reported before

**The x = 0.27 figure is NOT the regression, and I was wrong to present it as the defect.** master
puts the field at **x = 0.26** at 100 ms; the ceremony puts it at 0.28. The field has always been in
the left third at the gun. I compared the ceremony against *the ceremony's own preceding frame* and
called the step a discontinuity; I never compared it against master, which is the comparison that
identifies a regression.

**What actually changed is the other axis and the motion:**

- **The field is pushed UP.** master holds it at **y = 0.50 for the whole second**; the ceremony walks
  it to **0.42**. That is the "top" in "pushed into the top-left corner" — and it is new.
- **The camera now travels along the track where before it barely moved: 4.8 → 37.1 world px, 7.7×.**
- **The approach to the centreline changed shape.** master closes on it monotonically (40.7 → 18.2).
  The ceremony overshoots *through* it to 2.8 at 300 ms and comes back out to 18.1 — a transient, not
  a settle. That is the signature of the camera being handed a framing it then has to move away from.

## 4. The hypothesis is CONTRADICTED by the numbers

The hypothesis: the forward bias is a fraction of the frame, so the ceremony's much wider held frame
turns the same percentage into more world pixels.

**The ceremony's held frame is not wider — it is NARROWER.**

| | cam.zoom at the gun | visible world | |
| --- | --- | --- | --- |
| master | 1.067 (OVERVIEW's own setting) | **800 world px** | |
| ceremony | 1.165 (the field-derived hold) | **732 world px** | **8.4% narrower** |

A bias expressed as a fraction of the frame would therefore shift **less** in world pixels after the
ceremony, not more. The measurement shows **7.7× more**. The mechanism cannot be frame-fraction
scaling of the forward bias.

## 5. What the numbers point at instead — stated as inference, not measurement

The one thing the ceremony changed about this moment is **which zoom the first OVERVIEW is given**.
Before, `updateCountdown` ended at `_overviewStateZoom`, and the first OVERVIEW snapped to
`_overviewStateZoom` — **the same number**, so the state began already settled and the pan target sat
still. The ceremony hands OVERVIEW the field-derived hold (1.165) instead of its own setting (1.067),
so the first second is now a **zoom transition** where it used to be a settled state, and
`_setTrackTargets` recomputes the pan at the changing zoom every frame.

That fits all three symptoms — the 7.7× travel, the overshoot-and-return, and the drift in y — but I
have **not** isolated it, and it is inference. The falsifying test is one line: give the first
OVERVIEW `_overviewStateZoom` instead of the hold and re-run this table. If the travel returns to
~4.8 px and y returns to 0.50, that is the mechanism.

## 6. What I did not do

No fix, no unit work, no corridor overlay work. Nothing minted, nothing merged. The corridor
investigation is stopped.
