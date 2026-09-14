# BREAKAWAY-RECOUNT-2 — the third reading: 20 in 100, and the stage effect was the CAMERA

Branch `feat/gap-leader-brake`. **Read-only: no source changed, nothing minted, nothing merged.**
Date: 2026-09-15. The owner's store was not opened.

---

## ★ THE DIVISOR, STATED FIRST, BECAUSE IT IS THE WHOLE POINT

**Every canvas-width figure in this report is taken against ONE fixed value: 225.0 world px per
canvas width — the SETTLED value of `LEADER_ZOOM`** (ZOOM-PER-STATE-1 measured that state at exactly
225.0 when settled, and it is the reference shot the owner judged against). **No figure here uses a
per-frame zoom.**

That matters because the per-frame `visibleWorldPx` is not one number. Per ZOOM-PER-STATE-1 the
camera's settled states are **120 / 165 / 225 / 450** px per width, so the same 0.698-width threshold
is **84 / 115 / 157 / 314 world px** depending on which state held that frame — a **3.75× spread**.
The previous recount divided by that moving number.

**His photographed lead: 0.698 canvas widths = 157.05 world px.**

---

## ★★ THE ONE SENTENCE

> **Rarer again — and the stage effect he was told about is not there.**
>
> He has now been given three values for "how often a racer runs at least as far ahead as the one he
> photographed": **71 in 100**, then **44 in 100**, now **20 in 100**.
>
> ★★ **And BREAKAWAY-RECOUNT-1's headline reversal does not survive.** It said the action stage
> *causes* breakaways — quiet 32, medium 37, wild 44 — and that his own setting was the worst. On a
> fixed divisor the three are **quiet 21, medium 19, wild 20: flat.** The apparent stage effect was
> the **camera zooming in more on a wilder race**, which shrinks the divisor and inflates the width.

---

## THE THREE READINGS SIDE BY SIDE

Fixture, unchanged across all three: ten tracks at their own default racer, `wild`, **N = 40 racers,
seeds 1–10, N = 100 races**. The originals are left exactly as they are; nothing is rewritten.

| | reading 1 — **published** | reading 2 — **BREAKAWAY-RECOUNT-1** (2026-09-14) | ★ reading 3 — **this one** (2026-09-15) |
|---|---|---|---|
| gap expression | `(dt / finishT) × pathPx / vw` | `dt × pathPx / vw` | `dt × pathPx` |
| divisor for widths | per-frame `visibleWorldPx` | per-frame `visibleWorldPx` | ★ **fixed 225 px** |
| threshold compared against | 0.349 widths | 0.698 widths | 0.698 widths = **157.05 px** |
| **share reaching his lead** | **71.0%** | **44.0%** | ★★ **20.0%** |
| race-max, median | 0.483 w | 0.593 w | ★ **0.454 w** (102.2 px) |
| race-max, p90 | 1.342 w | 1.199 w | ★ **0.806 w** (181.4 px) |
| race-max, MAX | 2.387 w | 1.472 w | ★ **1.080 w** (242.9 px) |

### ★ The reproduction check — reading 3 is the same races as reading 2

BREAKAWAY-RECOUNT-1 published a **world-px** column, and world px is divisor-free. Mine must match
it, and it does:

| | reading 2, world px | ★ reading 3, world px |
|---|---|---|
| median | 102.2 | ★ **102.2 — identical** |
| MAX | 242.9 | ★ **242.9 — identical** |
| p90 | 188.5 | 181.4 — differs, see below |

★ **The median and the maximum reproduce to the digit**, which is what confirms the fixture and the
seeds. **The p90 differs by 7.1 px and the reason is a scoping choice of mine, named here:** this
recount takes the whole-race maximum **only while the whole field is still racing**
(`finishedCount === 0`), so a gap between two stragglers after the leaders have finished cannot
masquerade as a lead. That choice removes a handful of late-race pairs from the upper tail. It is
mine and it is conservative — it can only lower the figures, never raise them.

---

## THE CORRECTED TABLE

### How often a breakaway happens — `wild`, N = 100 races, fixed divisor

| threshold | in world px | ★ share of races |
|---|---|---|
| **his lead, 0.698 widths** | **157.0 px** | ★★ **20.0%** |
| 0.5 widths | 112.5 px | 46.0% |
| 1.0 widths | 225.0 px | **4.0%** |
| 1.5 widths | 337.5 px | **0.0%** |

### ★★ The action stage — the reversal that does not survive

N = 100 races per row, same fixture, same fixed divisor.

| stage | reading 1 (published) | reading 2 (BREAKAWAY-RECOUNT-1) | ★ reading 3 (fixed divisor) |
|---|---|---|---|
| quiet | 70.0% | 32.0% | ★ **21.0%** |
| medium | 69.0% | 37.0% | ★ **19.0%** |
| **wild** (his setting) | 71.0% | **44.0%** | ★ **20.0%** |
| **shape** | flat | **rising with the stage** | ★★ **flat** |

★★ **Reading 2's headline — "the stage DOES cause them, and his own setting is the worst of the
three" — is not supported once the divisor is fixed.** The three stages sit within 2 points of each
other, which is inside the noise of N = 100.

**Why reading 2 saw a rise.** A wilder race gives the camera more to react to, so it spends more time
in the zoomed-in states (`BATTLE_ZOOM` and `COMEBACK_ZOOM` settle at 165 px per width, `PHOTO_FINISH`
at 120) and less in the wide ones (`OVERVIEW` at 450). A smaller divisor makes the same world-px gap
read as a **bigger** canvas-width gap. **The stage was moving the camera, and the camera was moving
the metric.** The underlying gaps barely move: median race-max is **93.6 px quiet, 92.5 medium,
102.2 wild** — a 10 px spread across the whole axis.

### Closed against open, and per track

| | N | median px | p90 px | MAX px | ≥ his lead |
|---|---|---|---|---|---|
| closed (5 tracks) | 50 | 121.4 | 199.5 | 242.9 | **28.0%** |
| open (5 tracks) | 50 | 85.3 | 160.2 | 207.1 | **12.0%** |

| track | topology | median px | p90 px | MAX px | ≥ his lead |
|---|---|---|---|---|---|
| city-circuit | closed | 123.7 | 190.1 | 242.9 | **40.0%** |
| dirt-oval | closed | 125.0 | 209.9 | 242.9 | **40.0%** |
| space-sprint | open | 137.6 | 170.3 | 172.2 | 30.0% |
| garden-path | closed | 100.8 | 159.7 | 169.3 | 20.0% |
| ice-track | closed | 115.9 | 196.6 | 240.1 | 20.0% |
| searound | closed | 110.2 | 199.5 | 231.9 | 20.0% |
| luger-hill | open | 127.4 | 139.2 | 162.0 | 10.0% |
| mountainstreet | open | 66.2 | 133.0 | 160.2 | 10.0% |
| seatrack | open | 60.7 | 93.0 | 207.1 | 10.0% |
| river-run | open | 56.8 | 83.9 | 122.3 | **0.0%** |

★ **His own race's track, city-circuit, is the joint worst** at 40% — so what he photographed is not
rare *on that track*, even though it is rare across the game.

---

## ★ WHICH READING STANDS

**This one — reading 3.** Not because it is the newest, but because it is the only one whose
denominator is a constant:

- **Reading 1** carried a real arithmetic error (`finishT` applied twice), corrected by reading 2, and
  that correction is not disputed here.
- **Reading 2** fixed the arithmetic but kept dividing by a number that moves **3.75×** with the
  camera state — so its widths mix a gap measurement with a camera measurement. Its **world-px column
  is sound and is reproduced here exactly**; only its width column and everything derived from it
  (the shares, the stage comparison) inherit the moving divisor.
- **Reading 3** changes nothing about the arithmetic and only fixes the divisor.

**So: breakaways are LESS common than he has been told, on both previous tellings — 20 in 100, not 71
and not 44 — and the action stage does not change how often they happen.**

---

## WHAT THIS DOES NOT SETTLE

- **N = 100 races per stage.** A 2-point spread between stages is inside that noise; this report says
  the stage effect is **not demonstrated**, not that it is proven absent.
- The **field-size rows** (20 / 60 / 100 racers) of the original table were **not** recomputed — only
  the N = 40 row he races. The budget went to the stage comparison instead, because that is where
  reading 2 made a claim that reversed.
- 225 px is the **settled** `LEADER_ZOOM` value. A race is not always in that state; the point is
  that a fixed yardstick measures the gap while a moving one measures the gap and the camera
  together. Which fixed value to use is a separate question and this report does not reopen it.
- The whole-race maximum is scoped to `finishedCount === 0` — mine, named above, conservative.
