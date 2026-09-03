# SECOND-SITES-2 — the 52% has no "before" in it: every correction it measured was made after 2026-08-31, and the block it called complete held nineteen entries, not nine

> **READ-ONLY.** Nothing edited. The baseline is not withdrawn — its sixteen sites are real and its
> method is sound. What is corrected is the population it believed it had swept, and therefore what
> its number can and cannot be read as saying.

---

## THE NUMBERS

| | |
| --- | --- |
| INDEX corrections-block entries at SECOND-SITES-1's own commit | **19** — it says **9** |
| of those, entries it examined | **6** |
| **dates of those six** | **all 2026-08-31 or later** |
| entries dated before 2026-08-26 that it never mentioned | **11** |
| **of those 11, with a LIVE second site** | **4 — 36%** |
| the same measure on its own six | **0 of 6 — 0%** |
| **all 17 INDEX-block corrections, checked** | **4 of 17 — 24%** |

---

## 1. ★ THE BASELINE'S POPULATION IS NOT WHAT IT SAYS

SECOND-SITES-1 writes:

> *"the CORRECTIONS block at the top of `reports/evolution/INDEX.md` holds **9 entries**. Two are the
> DOC-TRUTH pair already in scope above and one (2026-08-23) is procedural. I took **all six
> remaining** — i.e. every entry in the block that corrects a concrete, greppable factual claim.
> **That is a complete sweep of the block, not a subsample.**"*

Counted at the tree as it stood at that commit:

```
$ git show 206620e5^:reports/evolution/INDEX.md | awk '…count top-level "- **" in the block…'
corrections block entries at SECOND-SITES-1 time: 19
```

**Nineteen.** The six it examined are the six most recent, and their dates are
**2026-09-02, 09-01, 09-01, 09-01, 08-31, 08-31**. The other thirteen run from **2026-08-12 to
2026-08-23** and are not named anywhere in that report.

**So the claim of completeness is wrong, and the consequence is bigger than the miscount.** The
report's structure was: 15 applied DOC-TRUTH corrections (11 hits) + 6 "earlier" INDEX-block
corrections (0 hits) = 11 of 21 = 52%. **Its "earlier sample" is its LATER one.** The 15 applied
corrections were made on 2026-09-02; the 6 sampled on 2026-08-31 to 09-02.

**Every correction in the 52% was made on or after 2026-08-31 — after the 2026-08-26 change the
trend question asks about. The number has no "before" in it at all.**

---

## 2. THE ELEVEN THAT WERE NEVER EXAMINED — ALL BEFORE 2026-08-26

Each checked the same way: the withdrawn claim searched uncapped over `docs/`, `client/src`,
`scripts/`, `server/`, `README.md` and `reports/evolution/INDEX.md`, with `reports/**` treated as
append-only and out of scope except that one file.

| # | correction | the withdrawn claim | live 2nd site | where |
| --- | --- | --- | --- | --- |
| 1 | 08-23 sprite-route | *"the sprite route has no callers"* | **no** | no living document asserts it; the code has all three arms |
| 2 | 08-23 BACKLOG-TRUTH-1's glob failure | a glob negative read as a tree fact | **no** | procedural |
| 3 | 08-22 SHIP-COORD-SYSTEM | *"`engine-reach --check` **reads the WORKING tree**"* | **no** | only the append-only report and the correction entry itself |
| 4 | 08-22 LABEL-OVERLAP-3 | *"**7 of 12** names collide"* → should read 3 of 11 | **YES** | **`INDEX.md:4917`** |
| 5 | 08-22 LABEL-NAMES-2 | *"**0 of 8** non-exempt names overlap"* | **YES** | **`INDEX.md:4935`** |
| 6 | 08-22 SPRITE-SIZE-OVERVIEW-1 / LABELS-AND-FLOOR-1 | *"`labelNamesWhenRoom: true` yields **ZERO names**"* → 670 | **YES** | **`INDEX.md:5030`** |
| 7 | 08-22 three recorded open items | *"`check-index` is one-directional"* | **no** | `OPEN-ITEMS-2026-08-22.md` already records it fixed |
| 8 | 08-22 STRAGGLER-TRUTH-1 | *"the ending waits for people it has stopped showing"* | **no** | `ENDING-PHASES.md` was corrected 2026-09-03; the only other hit is an append-only night report |
| 9 | 08-21 OVERVIEW-AIM-1 | *"the camera moves **0.1 world px** at the gun"* | **YES** | **`INDEX.md:3887`** |
| 10 | 08-12 RUNIN-STATE-1 | *"the run-in must be a **LEADER-family STATE**"* | **no** | `DEAD-ENDS.md` records the withdrawal correctly, photo-finish clause included |
| 11 | 08-12 `runaway 0%` | `0%` as a measurement | **no** | `SHIP-CEREMONY.md` states the true 2.8% AND names the defect explicitly |

**4 of 11 = 36%.**

---

## 3. ★ AND ALL FOUR ARE IN THE SAME FILE AS THE CORRECTION THAT WITHDRAWS THEM

This is the finding, not the rate.

`reports/evolution/INDEX.md` has two layers: a **corrections block** at the top, and **report
summaries** below it. All four live second sites are report summaries — and each states the withdrawn
claim as present-tense fact, in bold, thousands of lines below the entry that withdraws it:

| the correction says | the same file's summary says |
| --- | --- |
| `:194` — *"LABEL-OVERLAP-3's '7 of 12 names collide' **should read '3 of 11'**"* | `:4917` — *"**THE ROOM TEST IS BROKEN**: 7 of 12 names collide in his frame"* |
| `:201` — *"LABEL-NAMES-2's '0 of 8 non-exempt names overlap' **is WRONG**"* | `:4935` — *"**0 of 8 non-exempt names overlap**"* |
| `:219` — *"both say `labelNamesWhenRoom: true` yields ZERO names. **It yields 670**"* | `:5030` — *"turning it on **still yields zero names**"* |
| `:260` — *"'the camera moves 0.1 world px at the gun' **is true of the FIRST FRAME only**"* | `:3887` — *"the camera moves 0.1 world px at the gun"* |

**The corrections block exists because reports are append-only and cannot be edited. The INDEX's own
summaries are not reports — this file is edited several times a night — so nothing prevented them
from being corrected too, and nothing made anyone.**

**SECOND-SITES-1 never looked in this file**, which is the single reason its earlier-sample rate was
0 of 6: it searched living DOCUMENTS and CODE, and the second sites for these older corrections are
in the lab journal's own map.

---

## 4. ★ THE ONE THAT IS NOT JUST A STALE SUMMARY — IT IS HOLDING A BACKLOG ENTRY OPEN

`docs/BACKLOG.md` carries an OPEN entry, **"Garden Path does not finish — CANNOT ESTABLISH why"**,
re-verdicted **STILL TRUE** yesterday. The verdict's stated evidence:

> *"The premise is confirmed as recently as today — `scripts/camera-fingerprint.mjs:327` documents
> its 'at least one track' gate as existing **because** garden-path does not finish inside the
> harness's 200 s ceiling."*

**The premise was confirmed by reading a comment.** Tonight SPEC-AND-GATE-1 ran that instrument at
full weight:

```
  garden-path      a7d57478…   4916 frames  (300 after the last crossing)
  THE ENDING IS IN THIS HASH — 10 of 10 tracks contributed FINISHED frames.
```

**It finishes.** And the entry's own closing note anticipated exactly this — *"Which of the two
changed was not settled by this pass and **no race was run for it**"* — which is the most creditable
sentence in the chain, because it named the missing measurement instead of assuming.

**So this is a second site with teeth:** a dead premise, quoted as evidence, keeping an open item
open. **Not closed here** — this piece is read-only and closing a backlog entry is a verdict, not a
search. **On the morning sheet.**

---

## 5. THE TREND — WHAT IT SUPPORTS, AND WHAT IT CANNOT

| population | n | live second site | rate |
| --- | --- | --- | --- |
| INDEX-block corrections **before 2026-08-26** | 11 | 4 | **36%** |
| INDEX-block corrections **2026-08-31 and later** | 6 | 0 | **0%** |
| SECOND-SITES-1's applied DOC-TRUTH set (all 2026-09-02) | 15 | 11 | 73% |

**The rate does fall across the line.** 36% → 0% is the direction the question hoped for, and two of
the later six were **case (c)** — a living-document restatement corrected *in the same pass* — which
is the changed behaviour showing up as a mechanism rather than as a number.

**Three reasons not to bank it, and they are not hedges:**

1. **n = 6 and n = 11.** One hit in the later six would take it from 0% to 17%.
2. **Age is confounded with practice.** A correction made two days ago has had two days to acquire a
   second site or have one noticed. One made three weeks ago has had three weeks. The later group is
   younger in both directions at once, and nothing here separates the two effects.
3. **The two groups are different KINDS.** The 73% set are document corrections, where a second site
   is another document saying the same sentence. The INDEX-block entries correct a NUMBER IN A
   REPORT, and reports are append-only — so their only possible live second site is a living document
   or the INDEX's own summary. **The denominators are not comparable, and the 52% averaged them.**

**The honest statement of the baseline is therefore:** *of 32 corrections examined across both
passes, 15 had at least one live second site — 47% — and the class is not one class.*

---

## 6. SECOND-SITES-1'S OWN SIXTEEN, ONE DAY LATER

It was read-only and proposed no fix, so this is a control rather than a criticism. Re-checked
tonight:

| claim | still live? |
| --- | --- |
| `docs/TAGS.md` ×2 — *"the **current** world `dc4647be0f55ebdb`"* | **yes** — the current world is `8a1977187e9c99b4` |
| `docs/VERIFY-RULES.md:509` — *"**103/103 green**"* | **yes** — and `docs/NIGHT-RUN.md` corrects it to 106 four hundred lines away, in another file |
| `docs/TRACK_EDITOR.md:129, :135` — `defaultTracks.js` in the present tense | **yes** — `ARCHITECTURE.md` says it *"does not exist"* and `TRACK_LIFECYCLE.md` says *"neither … exists today"* |
| `scripts/lib/raceDriver.mjs` — `corridor-truth --company-only` | **yes** |
| `docs/BACKLOG.md:647` — *"cannot be removed by `git worktree prune`"* + *"Do not add prune to the ship ceremony"* | **yes** — and PRUNE-STEP-1 **added** that step on 2026-09-02 after proving the condition gone |

**Five of five still standing.** The `VERIFY-RULES` / `NIGHT-RUN` pair is the clearest picture of the
whole class: **one document carries the correction and another carries the claim**, and neither knows
about the other.

---

## Limits

**I did not re-do SECOND-SITES-1's fifteen applied corrections.** Its 11 hits there are taken as
given. If any were wrong the combined 47% moves.

**"Live second site" is a judgement about tense and framing**, not a string match. `docs/TAGS.md`'s
twenty-odd other `dc4647be0f55ebdb` hits are historical tag rows — *"the shipped world … untouched on
both sides"* at the time of that tag — and are correct. Only the two present-tense ones count.
Somebody else could draw that line differently.

**`reports/evolution/INDEX.md` is counted as living and `reports/**` as append-only.** That is a
choice. It is the choice the file itself makes — it carries a corrections block precisely because the
reports beneath it cannot be edited — but the four hits in §3 vanish under the opposite convention,
and the earlier rate falls from 36% to 0%. **The whole finding turns on that one decision, and it is
stated here rather than buried.**
