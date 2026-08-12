# RUNIN-MINIMAL-1 — the pull-out is minimal, and the run-in starts when the line fits

**Branch:** `feat/runin-state`, continuing from `36a0f7ea`. **Not merged.**
Third and final shape of the run-in; see [RUNIN-STATE-1](RUNIN-STATE-1.md) and
[RUNIN-OWNS-1](RUNIN-OWNS-1.md).

---

## 1. Was it minimal? Measured before anything was changed

Per frame across the run-in, the zoom delivered against the zoom **exactly sufficient** to have the
line inside the frame. The camera scales about its anchor, so multiplying cam.zoom by `k` multiplies
the line's screen distance from the anchor by `k`; the line reaches the edge at `k = room / distance`,
both measured on the DELIVERED frame. `k` is the excess factor — 1.00 is minimal.

**Against the frame it actually delivers, the shot was already nearly minimal: k = 1.12 (Luger Hill)
/ 1.18 (Searound) at the median.** The excess is not in the zoom rule. It is in **where the camera is
pointed**, exactly where the owner said to look:

| source                    | Luger Hill | Searound  | verdict                                 |
| ------------------------- | ---------- | --------- | --------------------------------------- |
| **anchor placement**      | **3.01x**  | **2.15x** | **the whole of it**                     |
| margin (`framePct`)       | 1.11x      | 1.11x     | wanted — "well in frame"                |
| lerp easing (target/zoom) | 1.03x      | 1.03x     | negligible                              |
| world-bounds clamp        | —          | —         | a consequence of the width, not a cause |

**The anchor sat a median 0.67 of the way along the frame toward the line on Luger Hill.** That is
`leaderForwardFrac`: LEADER_ZOOM, LEAD_CHANGE and OVERVIEW are FORWARD-framed, so the leader is
pushed two thirds of the way along the frame and only a **third** of it lies ahead of him — while
the finish line is ahead. The shot therefore had to be three times wider than the leader-to-line
distance actually demands.

## 2. Removing it — the framing rule's own question, answered with the run-in's facts

`framingRule.js` states the question once: _is there anything worth seeing AHEAD of the subject? If
yes the subject is centred; if no it sits forward of centre so the frame carries the action behind._
LEADER_ZOOM answers NO — "nobody is ahead of the leader, the race is behind him" — and that is right
for the whole race **except the run-in**, where the line is ahead and is the point of the shot.

So the forward bias is suspended while the run-in composes. No new number: it is the table's own
question with the run-in's own facts. Anchor 0.67 → 0.50, i.e. **3.01x → 2.00x**.

**Six call sites read that question and now read one helper, `_forwardFracNow()` — and that is
load-bearing, not tidiness.** The first cut changed the five `anchorScreenPoint` calls and missed
the pan bias itself, so every guarantee sized the shot for a centred anchor while the pan still
pushed the leader forward. The line fell out of frame on a third of the run-in's own frames
(67.0% in frame). With both reading the same helper: **89.1%**.

**WHY NOT PUSH FURTHER**, to the trailing edge, where the frame would span anchor and line exactly
(1.00x)? The corridor, company and lateral guarantees all measure their room FROM that point, and an
anchor at the frame edge leaves them none — `roomFromPointAlong` returns 0 and they stop constraining
anything. Centred is as far as this goes without disabling the promises that keep the shot honest.

**One more correction, and it is the file's own rule.** The line was reading `COMPANY_FRAME_PCT`,
borrowed from the quarry. framingRule.js says plainly that `innerFramePct` "exists so the SUBJECT
does not cling to the edge … it keeps doing it for the subject and for both geometric guarantees.
Only the company guarantee reads [the other] instead." The line is a guaranteed SUBJECT. At the
company margin the shot was minimal to 1.05x — the line sat ON the edge, where the tracking lag
alone pushed it out on a third of frames. **That is what "WELL in frame" cost: 67% → 89% / 99%.**

## 3. Starting later — his ruling, built

**The run-in engages once the line can be framed WITHOUT opening wider than the widest shot this
camera already composes — OVERVIEW's own width.** An existing setting, not a new constant. Until
then nothing happens: the normal states run exactly as with the key off.

**The engagement latches, one way.** `room / distance` is not perfectly monotone — the room depends
on the heading, which turns — so a bare comparison lets the shot flicker between wide and tight. The
latch says the run-in is a phase, not a per-frame test; it is not a tuning number.

**The test uses the run-in's own framing**, centred per §2. Asking with the forward bias still on
would delay the start by the very factor §2 removed.

## 4. The trade, in his terms — 2 tracks x 8 seeds

|                                     | luger-hill                                                   | searound                                                                    |
| ----------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **widest frame the run-in reaches** | **18%** of the world (was 99%)                               | **21%** (was 99%)                                                           |
| line in frame, run-in's own window  | **89.1%**                                                    | **98.7%**                                                                   |
| line in frame, whole endgame window | 11.9% → **37.3%** (was 78.2%)                                | 9.9% → **35.0%** (was 93.1%)                                                |
| the run-in composes                 | **41.9%** of the endgame (was 100%)                          | **35.4%** (was 100%)                                                        |
| what runs before it                 | LEADER_ZOOM 71%, LEAD_CHANGE 19%, BATTLE 7%, PHOTO_FINISH 3% | LEADER_ZOOM 35%, BATTLE 25%, COMEBACK 17%, LEAD_CHANGE 16%, PHOTO_FINISH 8% |
| **starts later by**                 | **4.4 s**, at progress **0.973** (window opens at 0.900)     | **4.9 s**, at progress **0.974**                                            |
| minimality (excess factor)          | **1.32x**                                                    | **1.40x**                                                                   |
| **empty frames**                    | **0**                                                        | **0**                                                                       |

The excess factor of 1.32/1.40 **is the margin itself** (1/0.7 = 1.43). There is no excess left to
remove: what remains is the "well in frame" the owner asked for.

**`check-runin-frame` is GREEN on both tracks and both halves** — centre 0.40 / 0.09 TW against a
limit of 2, and **the limit was not touched**. The Searound failure resolved by itself exactly as
predicted: it came from the world-sized frame, and there is no longer a world-sized frame.

## 5. What it costs — one row, and it is what to watch

**The run-in bounds the photo finish too, and holds it a median 2.05x / 2.10x wider than its own
setting (max ~4x)** so the line stays in it. On the seeds where the run-in engages _after_ the photo
finish has begun (3.1% / 7.6% of the window), that widening happens mid-shot.

**The tracking lag was re-measured and it says the same thing in one number.** The later start gave
five states back — **BATTLE_ZOOM, COMEBACK_ZOOM, LEADER_ZOOM and LEAD_CHANGE are all back to their
pre-run-in values to two decimals**, including LEAD_CHANGE's p95 which the previous cut had tripled
(7.10 → 21.81 → **7.15**) and COMEBACK_ZOOM's median (13.73 → 3.06 → **13.73**). OVERVIEW never
moved. The entire remaining cost is **PHOTO_FINISH's p95: 16.51 → 33.59 pp**, with its median almost
still (5.68 → 5.71) — a tail, not a steady lag, and exactly where the run-in now lives.

**The zoom at the crossing is consequently not bit-identical: 1.60e-2 and 1.53e-1**, i.e. 0.4% and
0.9% of the zoom. It was 1.31e-3 / 1.02e-2 before. Same cause: the run-in is still opening the photo
finish when the crossing arrives, so the lerp has further to travel.

## 6. What holds

- **Empty frames 0** on both tracks, all sixteen races.
- **The photo-finish slow motion is untouched** — the run-in adds no state, so `hudState` is
  unchanged and RaceScreen's trigger never sees a difference.
- **`runInShot: false` returns ALL THREE fingerprints exactly to their stored values** on all ten
  tracks: world `dc4647be0f55ebdb`, camera `64432e18a7e62188`, render `096f2726c45ed853`.
- **World fingerprint unmoved** with the feature on, too.

## 7. Fingerprints — measured fresh, NOT minted

| role   | stored             | this branch                      |
| ------ | ------------------ | -------------------------------- |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved** |
| camera | `64432e18a7e62188` | `0f56ded2d786e3b0`               |
| render | `096f2726c45ed853` | `7d7af693a766c6c9`               |

## 8. Source hygiene

Client suite green (776 camera tests). `engine-reach --check` on the real diff: 1 of N paths reaches
the engine (`storage/defaults.js`, a camera-only key), so the world fingerprint ran.

- **Extracted**: `_forwardFracNow()` — six identical reads of the framing table's POSITION column
  became one, which is what let the run-in's answer reach all of them at once. The bug in §2 is the
  proof it needed extracting.
- **Split**: `_runInComposing` became `_runInWindowOpen` (the window) plus `_updateRunIn` (the
  decision, including engagement), so "is the window open" and "is it composing" stopped being one
  word for two things.
- **Corrected**: `COMPANY_FRAME_PCT` → `_innerFramePct` for the line, per framingRule.js's own rule.
- **Noticed and left**: the `_focusAnchorRacer` null is still a latent defect for group shots outside
  the run-in window; `PHOTO_FINISH` is still absent from `ALL_STATES`; `rAFProbe`'s `_STATE_IDX`
  lists neither it nor anything added since.

## 9. For his eye

**Luger Hill, seed 9 — the camera now holds the ordinary shots until the finish is close enough to
fit, then opens once, modestly, and closes on the line; watch whether the photo finish being held
about twice as wide to keep the line in it is the picture you want.**
