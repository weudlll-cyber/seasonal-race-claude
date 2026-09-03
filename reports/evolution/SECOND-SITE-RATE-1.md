# SECOND-SITE-RATE-1 — **3 of 32. It is not zero, and that is the night's most important number**

> **THE SCOPE, stated first.** The census anchor is `3fc4c6ed` (CENSUS-TESTS-1, 2026-09-01).
> Everything audited here is `3fc4c6ed..HEAD`: **105 non-merge commits, 184 including merges, 224
> distinct files.** The old tree is not re-audited — it was counted, and re-counting would bury this.
>
> **32 corrections applied in scope. 3 had a live second site. 9.4%.**
>
> ★ **That is the different problem the brief named: the sweep IS being performed and is still
> missing things.** §3.

---

## 1. THE NUMBER, WITH ITS SAMPLE

| | |
| --- | --- |
| corrections in scope, checked | **32** |
| **with a LIVE second site** | **3** |
| **rate** | **9.4%** |
| historical rate (SECOND-SITES-2, before the constraints) | 47% |
| the figure this was measured against | 0% over 6 |

**Zero over five was not evidence and this is why.** The 0% came from six corrections, all made in
the last days of August, and it did not survive a sample five times larger.

**How the sample was drawn**, so it can be redrawn: every dated in-tree correction marker
(`(Corrected 2026-09-0X, …)` and its variants) in `docs/`, `client/src`, `scripts/`, `server/src`
and `client/e2e` — **32 of them across 16 files** — plus the corrections whose reports named their
sites. For each, the stale claim's own token was searched across every living file. `reports/**` is
excluded by project rule (append-only) and `docs/archive/` by design.

**15 of the 32 produced a surviving hit and each was read by hand.** Twelve were the correction's
own text, a withdrawal quoting what it withdraws, or a dated record of a past measurement. **Three
were the real thing.**

---

## 2. THE THREE

### ★ `docs/AUDIT.md:542` — a key that occurs nowhere

> *"Pack battle trigger — `battlePulkThresholdPx` (200 px)…"*

**The key is `battlePulkThresholdT`, a LAP FRACTION.** `battlePulkThresholdPx` appears nowhere in the
tree. `ARCHITECTURE.md` carried the same error and **was corrected on 2026-09-03 by CITATIONS-1**;
this was its second site, in a document the sweep did not open.

### ★ `docs/ARCHITECTURE.md:770` — the camera is fed `rawDt`

> *"A separate smoothed delta-time (`smoothDt`) is used for cosmetic-only updates (**camera lerp
> factor**, track effects, minimap)."*

**The camera has been fed `rawDt` since `f16ab4de`, 2026-06-08.** `CAMERA_DIRECTOR.md` was corrected
for exactly this on 2026-09-03, and **a source comment in `RaceScreen/index.jsx` states it in as many
words** — so this claim had already been contradicted twice, in two places, and stood anyway. **The
third site.**

### ★ `docs/TRACK_LIFECYCLE.md` — the file contradicts itself

Its own Code-Bundle row says **NOT BUILT; the file does not exist**, corrected 2026-09-02 by
DOC-TRUTH-1. Its **ASCII diagram, in the same file**, showed `defaultTracks.js` as *"← last resort"*
with a status banner, present tense.

**This is INDEX-SUMMARIES-1's shape exactly**: the correction and the claim in one file, and the
sweep that fixed the prose did not look at the picture.

**All three corrected**, each with a dated note saying which earlier sweep missed it.

---

## 3. ★ WHAT 3 OF 32 MEANS, AND IT IS NOT "THE RULE FAILED"

**47% → 9.4% is a real improvement and it is not zero.** The distinction the brief drew is the one
that matters:

> *"it would mean the sweep is being performed and still missing things, which is a different problem
> from forgetting to sweep."*

**It is that problem.** Every one of these three had a sweep run for it. None was forgotten. Each was
missed for a specific, repeatable reason:

| | why the sweep missed it |
| --- | --- |
| `AUDIT.md` | **the searcher did not think of that document.** It is an audit log, not a spec, and reads as history |
| `ARCHITECTURE.md` `smoothDt` | **the token is legitimate elsewhere.** `smoothDt` occurs 30+ times and still exists; only ONE of its claims is wrong, so a grep for the name drowns the finding |
| `TRACK_LIFECYCLE.md` | **it is a PICTURE.** An ASCII diagram is prose to a human and noise to a search for a sentence |

**None of the three is a discipline failure. All three are search-shape failures**, and that is a
different thing to fix — C6's territory, not a matter of trying harder.

---

## Limits

**32 is the count of corrections that LEFT A DATED MARKER.** A correction applied without one is
invisible to this method and is not in the denominator — which, if anything, flatters the rate: an
unmarked correction is more likely to have been quick, and a quick correction is more likely to have
skipped its sweep.

**"Live second site" is my judgement on 15 hand-read hits.** The filter that reduced 32 to 15 is a
regex over correction vocabulary and is stated in the script so it can be argued with; the 15 → 3
step is human and I could be wrong in either direction. **A reader who disagrees about any one of
the twelve I dismissed would get a rate between 9.4% and 46.9%.**

**reports/** is excluded and that is a real exclusion. Roughly two thirds of the words written in
scope are in reports, and a stale claim there is invisible to this number — deliberately, because
reports are append-only and the corrections block is their mechanism.

**One sweep, one night, one pair of eyes.** Every finding here is what one method found; a different
search shape would find a different set, which is exactly what §3 says about the three that were
missed.
