# ENDING-PICTURE-1 — the ending gets a picture worth holding

**2026-08-12.** Two blocks shipped together, because the second is what makes the first mean
anything: the HOLD after the last crossing (`finishHoldAfterLastMs`), and the PICTURE that hold was
supposed to be holding.

**The owner, 2026-08-12, on a production build:** he asked for the zoom-out to keep starting when
the first racers are home, and for the picture to stand still a little longer once the last one
crosses. He then reported that the race view disappeared at the last crossing instead. After the
repair he judged it on production and accepted it.

_(Recorded in English, attributed and dated. The German-quotation exception is CLOSED — see
CLAUDE.md.)_

---

## 1. The hold, and why its default is not zero

`finishHoldAfterLastMs` shipped at 0 because the measurement said there was no WAIT to restore: the
zoom-out already begins about 2 s after the FIRST crossing and the field is complete moments later.
That reading was right and beside the point. He was not asking to watch arrivals; he was asking for
a beat on the finished picture, and a key defaulting to 0 does not give him one.

**Default 0 → 1500**, and the number is HIS: `podiumRevealBeatMs` is 1500 because he moved that
slider himself, so the ending keeps one rhythm instead of gaining a second. It is also the value that
makes the change legible — the winner card is capped at `min(winnerCardMs, finishPauseMs)` and does
not inherit the hold, so what actually grows is the CARD-FREE tail: **500 ms → 2000 ms** at shipped
values.

**The zoom-out trigger was NOT changed.** Gating it on `finishedCount >= nRacers` was proposed and
**rejected by the owner**: it would move the pull-back behind the last arrival and make its start a
property of the slowest racer.

Measured end to end at 20 racers, from the last crossing to a settled result screen: **11 370 ms**
against 9 870 with the hold off. Unchanged by a far-behind straggler (Searound seed 9) — the key
follows the last crossing, it cannot move it.

## 2. What the hold was actually holding

`index.jsx` replaced the director's transform with `{ zoom: 1, offsetX: 0, offsetY: 0 }` on the frame
the phase flipped to FINISHED, and `renderRaceFrame` drew a full-canvas `rgba(0,0,0,0.48)` scrim over
the result with "RACE FINISHED!" and "Loading results…". Both predate the hold by months — the
camera reset by `fdafe78d` (2026-04-22), the splash by `e180a6be` (2026-05-25).

**The identity transform is not a shot.** Measured on his values:

| track | before | after |
| --- | --- | --- |
| searound (closed) | zoom 1.0000 — shows the whole 3072×2048 world, **23.5 track widths** | zoom 4.5511 — 675×450, **5.2 track widths**, 7 of 20 racers in frame |
| luger-hill (open) | zoom 1.0000 — an 853×480 window at world (0,0), **0 of 20 racers in frame** | zoom 1.0667 — 800×450 at world (2389,1778), **20 of 20 in frame** |

The open track is the pure case: the old behaviour showed a corner of the map with nobody in it.

**Why the director is consulted rather than the last transform frozen.** Freezing was the other
candidate and it fails on timing: the zoom-out can still be IN FLIGHT at the last crossing — on
Searound seed 2814 it ends 50 ms after it — so freezing would stop the pull-back dead mid-move and
hold a half-finished one. Consulting lets the move finish and come to rest, which is what "settled"
means. Safe by construction: physics no longer steps in that phase, so the director sees a static
field, and `_inFinishMode` is absolute, so no new shot can be chosen.

**Why the splash goes entirely rather than moving to the last moments.** Both halves of it are false
now. Nothing is loading — `raceResults` is written to sessionStorage on the SAME FRAME the splash
first appeared. And the last moments are already covered by the screen transition, which fades rather
than snaps; a second cover-up there would be redundant with something better.

### The ending on his values, after

| from | to | on screen | picture covered? |
| --- | --- | --- | --- |
| 0 | 4000 | settled finish shot + winner card | no |
| 4000 | 5500 | settled finish shot, card gone | no |
| 5500 | 5870 | fade to black, navigate | yes — deliberately, by the transition |
| 5870 | 11870 | result screen, podium build-up | different screen |

## 3. The guard, and the matrix that made it honest

`scripts/check-ending-frame.mjs` renders one real FINISHED frame through `renderRaceFrame` with a
recording context and refuses any fill covering the canvas **at the identity transform** — screen
space, after the world is drawn.

**Tracking the transform is the load-bearing part.** The first version ignored it and immediately
flagged `fillRect(0, 0, 3072, 2047)`: the track's own background, drawn inside the world transform,
which is not a cover-up at all. A guard that cannot tell world space from screen space would have
been retired within a week.

Proven to fail by sabotage — `--sabotage` restores the splash and the guard goes red on
`fillRect(0, 0, 1280, 720) style="rgba(0,0,0,0.48)"`. **Cost 1.1 s.** No wiring was needed: it
declares its own routing and `check-*.mjs` is auto-discovered.

## 4. The fingerprints, and one that must not be misread

| role | before | after |
| --- | --- | --- |
| WORLD | `dc4647be0f55ebdb` | **unchanged** |
| CAMERA | `64432e18a7e62188` | **unchanged** |
| RENDER | `c0fd1e8eda539867` | **`096f2726c45ed853`** |

**RENDER moved because the product's drawing changed, not the instrument.**
`render-fingerprint.mjs:553` sets `st.phase = FINISHED` once the field is home, and
RENDER-SAMPLER-CEREMONY's sample points reach into that window, so those frames legitimately lose the
scrim. The move was ISOLATED rather than assumed: a detached worktree at the predecessor tip
reproduced `c0fd1e8eda539867`, and copying ONLY `renderRaceFrame.js` into it reproduced the new
value.

**⚠ CAMERA's unchanged hash is NOT evidence about this block.** `camera-fingerprint.mjs` runs
`while (st.finishedCount < N)` — it stops on the last crossing and renders no FINISHED frame, so the
one thing part A changes is outside it entirely. What covered that change instead: the RENDER
fingerprint, `check-ending-frame.mjs`, `endingPicture.test.js`, and his eye on production. This is
recorded in `fingerprints.json` beside the value so a later reader cannot mistake it.

## 5. Noticed, and deliberately left

- **`camera-fingerprint.mjs` cannot reach the ending.** Widening it is the obvious follow-up and is
  deliberately NOT in this block: an instrument must not change in the commit it is meant to
  validate. It is named as a proposal instead.
- **`SCREEN_TRANSITION_MS` (370) is still a hidden constant** that no control reaches;
  `ENDING-PHASES.md` already records it as phase #10.
- **The Dev Screen's first ending control was labelled "Finish pause (ms)" while writing
  `finishDramaDurationMs`** — colliding with the control that really is the pause. Relabelled here,
  and the five ending controls are now numbered in phase order with a read-only total computed by
  the same function the race screen's timers use.
