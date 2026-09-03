# GARDEN-PATH-CLOSE-1 — the entry is closed, and the sweep found the claim alive in TWO more instruments and DOUBTFUL in a third

> **The entry moved to PART TWO whole, verdicts and all — including the one that was wrong**, because
> how that one went wrong is the most useful thing on it. **The sweep is the piece**: the same false
> premise was live in `CAMERA_DIRECTOR.md` twice, and a third harness still excludes the track on it.
>
> ★ **The render fingerprint's coverage matrix now reads 10/10, not 9/10.** Measured, not inferred.

---

## 1. WHAT CLOSED IT, AND WHY THE ENTRY MOVED WHOLE

`Garden Path does not finish` was opened 2026-08-23 as **CANNOT ESTABLISH why**. It collected three
verdicts, and the middle one is the reason the entry is worth keeping:

| dated | said | true? |
| --- | --- | --- |
| 2026-08-23 | it does not finish; a driven race with finish accounting would decide the why | true then |
| **2026-09-02 (BACKLOG-VERDICTS-1)** | STILL TRUE, *"and it cannot be established mechanically"* | **FALSE — and it established it anyway, from a COMMENT** |
| **2026-09-03 (CAMERA-GATE-1)** | **FALSE. GARDEN-PATH FINISHES.** 4,916 of 12,000 frames, 300 after the last crossing | true |

**Nothing was deleted.** The entry sits under PART TWO's *Instrument coverage residuals*, struck,
with all three verdicts intact and a closing line saying which one decided it. **Deleting the wrong
verdict would delete the lesson**: it declared a question un-establishable and then answered it from a
false comment, and the race it said was needed took 26 seconds when someone finally ran it.

**Open boxes 57 → 56, then → 57** — one closed and one filed (§3).

---

## 2. ★ THE SWEEP — THE CLAIM WAS LIVE IN TWO MORE PLACES, AND BOTH ARE MEASURED FALSE

`docs/CAMERA_DIRECTOR.md` carried it twice, as a statement about the **render** fingerprint, which is
a different harness from the one CAMERA-GATE-1 corrected:

> *"**`garden-path`'s ending** — that track never finishes inside the window, so the late sample
> points measure nothing there."* — `:1012`
>
> *"on 9 of 10 tracks it now samples the finish shot … (garden-path never finishes)"* — `:1787`

**The document names the command that decides it, so it was run:** `node scripts/render-fingerprint.mjs --coverage`.

```
garden-path  … 3900 LEADER_ZOOM   4300 FINISH   4520 FIN_OV/rest   …   5450 FIN_OV/rest
tracks with the finish SHOT sampled: 10/10   mid-MOVE: 8/10   AT REST: 9/10   nothing: 0/10
```

**Both claims are false and both are corrected with what the matrix actually says.** Garden-path is
at FINISH by frame 4300 and at rest from 4520; the instrument's blind spot is no longer *a track*, it
is **a mid-zoom-out MOVE frame on `garden-path` and `city-circuit`, and the RESTING frame on
`dirt-oval`** — which is a smaller and truer statement than the one it replaced.

**This is a second site in the strict sense SECOND-SITES-2 means it:** the correction landed on
`camera-fingerprint.mjs` yesterday and the copy in a living document kept speaking, one harness over.

---

## 3. ★ THE THIRD HARNESS IS FLAGGED, NOT CORRECTED — DELIBERATELY

`scripts/viewer-invariants.mjs` drops garden-path from the browser sweep's twelve scorable items
*"whose race never finishes at seed 9"*, and `SHIP-CEREMONY.md` repeats it.

**It was tempting to correct both, and that would have been the same mistake this entry is famous
for.** BACKLOG-VERDICTS-1 settled a question about garden-path from a *different instrument's*
comment; correcting a **seed-9 browser sweep** on the strength of a **headless render fingerprint**
is that move with better manners. **The two harnesses do not share a seed, a driver, or a ceiling.**

So both sites are marked **DOUBTFUL AND UN-RECHECKED** in place, with the measurement that makes them
doubtful and the reason they are not corrected, and the question is **filed as its own open entry**
with a `verify:` that is a race rather than a grep.

**It costs nothing while it stands:** the nightly sweep runs all ten tracks at forty seeds. What is at
stake is one track's *pre-merge* coverage, not its coverage.

---

## 4. WHAT WAS LEFT, AND WHY

**`scripts/camera-fingerprint.mjs:329` and `:423`** still contain the false sentence — inside
CAMERA-GATE-1's own correction, quoting what the comment used to say. **Records, not claims.**

**Every `reports/**` hit** — append-only.

**`docs/MORNING.md`** already carries the correction and is rewritten after every piece.

**`client/e2e/garden-path-finishes.spec.js`** is the next piece's subject and is untouched here.

**The 2026-09-02 verdict's own citation to `camera-fingerprint.mjs:327`** is left as written, though
the line it names no longer holds that comment. It is a dated record of what was read on a day —
CITATIONS-CONVENTION-1 counted 24 citations of that kind an hour earlier and left all 24.

---

## Limits

**Nothing here re-measured the 2026-08-25 cause.** `d73ec6a9` gave garden-path the beetle and two
laps, and that is taken from the record rather than re-derived; what was measured is that the track
finishes **now**, in two harnesses.

**The render-fingerprint coverage run is one run at that instrument's fixed seed.** It is a
reproducible instrument, not a sample of the track's behaviour in general — the same caution the
matrix's own header carries.

**The seed-9 question is open and this report did not answer it.** Running it needs a Chromium
install and 200–340 s, which is a ship's cost rather than a hygiene pass's, and no part of this piece
depended on the answer.
