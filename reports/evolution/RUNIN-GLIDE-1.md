# RUNIN-GLIDE-1 — the run-in glides from wide-and-back to the ordinary shot

**Branch:** `feat/runin-state`, continuing from `f93fd25c`. **Not merged.**
Supersedes the shape of [RUNIN-MINIMAL-1](RUNIN-MINIMAL-1.md); see also
[RUNIN-OWNS-1](RUNIN-OWNS-1.md) and [RUNIN-STATE-1](RUNIN-STATE-1.md).

---

## 1. The shape

One progress measure — the leader's remaining distance to the line — drives **both** the anchor
placement and the zoom, from the endgame threshold to the crossing.

- **at engagement** the leader sits BEHIND centre, so most of the frame lies toward the finish and
  the line fits at a modest zoom;
- **as he closes** he travels back to his ordinary position while the shot tightens;
- **at the crossing** he is at `leaderForwardFrac` under the state's own zoom — the ordinary shot
  exactly, so there is no seam to hand over.

**It invents no number.** The END of the travel is the framing table's own answer for the running
state; the START is that answer MIRRORED about the centre. `leaderForwardFrac` already says how far
off centre a subject is placed, and this uses it twice. **A CENTRED state does not move at all** —
mirroring 0.5 gives 0.5 — which is not a special case, it falls out, and it is why the photo finish
keeps its own framing throughout.

**The progress measure is along the track, not across the ground**, and that is the honest choice
rather than the obvious one. `pointGuarantee` needs the straight-line distance because it is asking
what fits in a rectangle; a PROGRESS measure must be monotone, and the straight-line distance is not
— on a closed track the leader can be euclidean-near the finish and still most of a lap from it.
Along the track it is `leaderProgress`, the same quantity `endgameThreshold` is written in, so it is
0 exactly where the window opens and 1 exactly at the line, with no captured reference. It is
clamped monotone, which is the one-way latch doing real work: the travel must be a journey, and a
measure that dipped would walk the leader back across the frame in view.

## 2. Removed

The OVERVIEW-width cap and the delayed engagement are both gone. The run-in composes from the
endgame threshold again and the pull-out is whatever the line requires and no more. Kept: the
subject margin (`targetInnerFramePct`), the one helper the six call sites read, the photo-finish
bound, and the one-way latch.

**One guard had to go with them, and it was hiding.** `_applyLeaderForwardBias` ended with
`if (!(worldBias > 0)) return pos;` — reading as a degenerate-input check, and in fact a one-way
valve that silently discarded every BACKWARD displacement. That is the whole of the new placement,
so it would have made this block a no-op with no error anywhere.

## 3. The engagement had to become a glide — measured, not assumed

Without it: **93 empty frames across ten tracks**, on six of them, and **every single one at run-in
progress 0.006–0.016** — the engagement frame and nothing else. On that frame the framing changes
discontinuously in both quantities at once (the zoom opens by up to 6.5× on space-sprint, where the
finish is most of the track away at the threshold), and the ordinary tracking lerp eases pan and
zoom independently out of it.

**Which step caused it was measured, not guessed.** With the anchor travel disabled and only the
zoom step left, the count was **95 — no better**. So the zoom step is the whole of it, and the
anchor travel is free: it costs nothing in emptiness and it _improves_ the framing.

|                   | line in frame | line first in shot | empty |
| ----------------- | ------------- | ------------------ | ----- |
| anchor travel ON  | **95.3%**     | **0.2 s**          | 93    |
| anchor travel OFF | 90.1%         | 0.4 s              | 95    |

So the fix is the mechanism the project already has and already names for this. `docs/DEAD-ENDS.md`
§M states it in one line: _the glide is what makes a big zoom change safe — it moves pan and zoom on
ONE ease, so the anchor is framed consistently by construction_. The run-in is not a state, so no
transition fires to start one; the engagement starts the same glide by hand, on the same
`glideDurationMs`, once, guarded by the latch. **Empty frames: 0 on every track.**

## 4. Measured — all ten tracks, 3 seeds each

| track          | composes | line in frame OFF → ON | widest   | 1st line  | field in shot | empty | crossing Δ |
| -------------- | -------- | ---------------------- | -------- | --------- | ------------- | ----- | ---------- |
| city-circuit   | 100%     | 7.9% → **97.0%**       | 100%     | 0.4 s     | 96.1%         | 0     | 0.05%      |
| dirt-oval      | 100%     | 8.7% → **96.5%**       | 92%      | 0.4 s     | 100.0%        | 0     | 0.03%      |
| garden-path    | —        | —                      | —        | —         | —             | 0     | —          |
| ice-track      | 100%     | 7.5% → **94.4%**       | 100%     | 0.5 s     | 94.4%         | 0     | 0.22%      |
| luger-hill     | 100%     | 12.1% → **92.6%**      | 67%      | 0.4 s     | 93.0%         | 0     | 0.03%      |
| mountainstreet | 100%     | 9.7% → **90.4%**       | 27%      | 0.4 s     | 93.5%         | 0     | 0.02%      |
| river-run      | 100%     | 19.9% → **93.5%**      | 34%      | 0.4 s     | 93.3%         | 0     | 0.00%      |
| searound       | 100%     | 12.0% → **94.7%**      | 85%      | 0.4 s     | 93.4%         | 0     | 0.74%      |
| seatrack       | 100%     | 7.1% → **87.2%**       | 67%      | 0.5 s     | 92.4%         | 0     | 0.08%      |
| space-sprint   | 100%     | 5.1% → **88.4%**       | 67%      | 0.5 s     | 92.1%         | 0     | 3.58%      |
| **ALL**        | **100%** | **9.8% → 93.3%**       | **100%** | **0.4 s** | **94.6%**     | **0** | **3.58%**  |

garden-path is blank because its race never finishes, which is a known property of that track and
not of this block.

**How much earlier the line appears:** the previous build engaged 4.4 s / 4.9 s after the window
opened, so the line could not be in shot before then. It is now in shot **0.4 s** after the window
opens — about **4 s earlier**, and on every track rather than on the two that were measured.

**The anchor travel, as a curve** (luger-hill seed 9), so it is visible rather than asserted:

| run-in progress | anchor frac | zoom  | racers on screen | line |
| --------------- | ----------- | ----- | ---------------- | ---- |
| 0.002           | 0.341       | 2.133 | 5                | out  |
| 0.107           | 0.374       | 0.480 | 17               | IN   |
| 0.317           | 0.441       | 0.539 | 19               | IN   |
| 0.527           | 0.509       | 0.651 | 16               | IN   |
| 0.633           | 0.543       | 0.747 | 16               | IN   |
| 0.731           | 0.500       | 0.940 | 14               | IN   |
| 0.888           | 0.500       | 2.198 | 4                | IN   |
| 0.994           | 0.500       | 3.997 | 4                | IN   |

The frac pins at 0.500 from 0.731 because PHOTO_FINISH takes the shot there and PHOTO_FINISH is a
CENTRED state — its ordinary placement _is_ the centre, so the travel has already arrived.

## 5. The limit the brief asked me to measure, not assume — the chasing field

Pushing the anchor back does cost the field, and the numbers say how much: **the field is in shot on
94.6% of run-in frames** (≥ `minRacersVisible` racers on screen), first dropping below at run-in
progress **0.93**.

**That loss is not the anchor placement — it is the photo finish.** At s = 0.93 the shot is already
PHOTO_FINISH's, tightening on the pair, and the anchor travel has finished. The curve above shows it
directly: racers on screen rise 5 → 19 as the run-in opens, hold in the teens through the whole
travel, and only fall to 4 once the photo finish takes the zoom.

**The existing field guarantee does not fight the placement; it does not reach it.** `_fieldCeiling`
retires early in every race (it is the ceremony's promise), and `_companyCeiling` does not apply to
PAIR states — which is what PHOTO_FINISH is. So nothing was overridden and nothing was disabled.
**Both the line and the field are had**, on this measurement, for all but the last 7% of the run-in,
and that last 7% is the photo finish doing the job it exists to do.

## 6. What holds

- **Empty frames 0** on every one of the ten tracks.
- **`check-runin-frame` green on both halves, both tracks** — centre 0.15 (luger-hill) and 1.23
  (searound) against an untouched limit of 2.
- **The crossing shot is the ordinary shot**: the cam.zoom at the first crossing is within **0.03%**
  of the feature being off on six tracks, ≤ 0.74% on nine, and **3.58%** at worst on space-sprint.
- **The photo-finish slow motion is untouched** — the run-in adds no state, so `hudState` never
  changes and RaceScreen's trigger cannot see a difference.
- **`runInShot: false` returns all three fingerprints exactly to their stored values** on all ten
  tracks: world `dc4647be0f55ebdb`, camera `64432e18a7e62188`, render `096f2726c45ed853`.

## 7. Fingerprints — measured fresh, NOT minted

| role   | stored             | this branch                      |
| ------ | ------------------ | -------------------------------- |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved** |
| camera | `64432e18a7e62188` | `e9d19cda3e585c70`               |
| render | `096f2726c45ed853` | `3ab2918a88337a83`               |

## 8. The tracking lag

| state         | frames | median | p95   | vs RUNIN-MINIMAL-1      |
| ------------- | ------ | ------ | ----- | ----------------------- |
| BATTLE_ZOOM   | 9586   | 5.72   | 11.01 | p95 9.98 → 11.01        |
| COMEBACK_ZOOM | 695    | 2.01   | 15.45 | median 13.73 → **2.01** |
| LEADER_ZOOM   | 17788  | 4.05   | 9.32  | 8.62 → 9.32             |
| LEAD_CHANGE   | 7969   | 4.59   | 25.19 | p95 7.15 → **25.19**    |
| OVERVIEW      | 4303   | 2.65   | 16.00 | unchanged               |
| PHOTO_FINISH  | 1865   | 4.71   | 29.80 | p95 33.59 → **29.80**   |

**The tails are the price of composing the whole endgame again**, which is what was asked for. The
medians barely move, so these are tails and not a steady lag. PHOTO_FINISH actually **improved** —
the anchor travel means that shot no longer has to be opened as far to hold the line. COMEBACK's
median falls for the same reason with its sign reversed: a wider shot has a smaller lag as a
fraction of the frame.

**The frame counts moved and that is the glide, not the states**: this instrument samples the
TRACKING phase only, and the engagement glide spends its first half-second elsewhere. No state
decision changed — the run-in adds no state.

## 9. Source hygiene

Client suite green (778 camera tests). `engine-reach --check` on the real diff: only
`storage/defaults.js` reaches the engine (a camera-only key), so the world fingerprint ran and is
unmoved.

- **Removed**: the OVERVIEW-width engagement gate; the `worldBias > 0` one-way valve.
- **Added**: `_runInProgressOf` (the one progress measure, monotone-clamped) and `_beginRunInGlide`.
- **Changed**: `_forwardFracNow()` now returns a travelling fraction rather than a suspension;
  `_applyLeaderForwardBias` takes its fraction from that helper instead of the raw setting.
- **One test corrected rather than dodged**: a BATTLE_ZOOM pan-centering test drove 400 frames at a
  FROZEN `ts`. That converges a pixel lerp but cannot converge anything timed, so it broke the
  moment a timed ease ran in that state. The clock now advances, which is what a real caller does
  and what "after the pan converges" means.
- **Noticed and left**: the `_focusAnchorRacer` null is still a latent defect for group shots outside
  the run-in window; `PHOTO_FINISH` is still absent from `ALL_STATES`; `rAFProbe`'s `_STATE_IDX`
  lists neither.

## 10. For his eye

**Luger Hill, seed 9 — as the run-in begins the leader should sit low in the frame with the finish
ahead of him, and then ride forward to his usual place as the shot closes in; watch whether that one
motion reads as a single move rather than two.**
