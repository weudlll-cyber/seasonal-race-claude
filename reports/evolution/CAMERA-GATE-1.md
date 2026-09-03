# CAMERA-GATE-1 — the sentence is gone, the gate is tightened on a measurement, and exactly ONE of ninety-nine verdicts rested on a claim

> **The owner's condition was binding and it was measured BEFORE the change.** Replayed over the
> daily tip of the last twelve days: **five days red, and ZERO of them without cause.** All four
> fingerprints run against the record and all four match.

---

## THE THREE NUMBERS

| | |
| --- | --- |
| days in twelve the tighter gate would have gone red | **5** — every one garden-path, every one before 2026-08-25 |
| **of those, red WITHOUT CAUSE** | **0** |
| BACKLOG-VERDICTS-1 verdicts resting on a claim rather than the tree | **1 of 99** |

---

## 1. THE SENTENCE, AND WHAT THE NUMBERS ACTUALLY SHOW

`camera-fingerprint.mjs` printed this on every non-quiet run:

```
  THE ENDING IS IN THIS HASH — 10 of 10 tracks contributed FINISHED frames.
  The window is endingOnRaceScreenMs(), the same arithmetic RaceScreen navigates away on.
  garden-path does not finish inside the 200 s ceiling, so it has no ending to sample.
```

The first line is computed. The third was a hardcoded string, **printed two lines under the number
that refutes it and three under `garden-path … (300 after the last crossing)`.**

**What the numbers show, stated in the instrument's own output now:** every track's race finishes
inside the ceiling, so every track's ending is covered. The replacement line is **derived from the
same rows** — it names the tracks that contributed nothing when there are any, and says so plainly
when there are none. It cannot go stale, because there is nothing left in it to go stale.

**When it became false: 2026-08-25**, `d73ec6a9` (GARDEN-PATH-DEFAULTS-1), which gave that track the
beetle and two laps.

---

## 2. ★ THE OWNER'S CONDITION, MEASURED BEFORE THE GATE MOVED

> *"FIRST measure how often the tighter gate would have gone red WITHOUT CAUSE over the recent
> history. If that number is high, do NOT tighten it."*

**Method:** a `--shared` clone in scratch, `node scripts/camera-fingerprint.mjs` run at the **daily
tip of each of the last twelve days**, counting tracks with zero ending frames. Twelve full runs.

| daily tip | tracks with ZERO ending frames |
| --- | --- |
| 2026-09-03, 09-02, 09-01, 08-31, 08-27, 08-26, **08-25** | **0** — seven days green |
| 2026-08-24, 08-23, 08-22, 08-19, 08-18 | **1 — garden-path**, every day |

**Five of twelve red. Zero of them WITHOUT CAUSE.**

That distinction is the whole answer. On each of those five days garden-path genuinely contributed
nothing and the hash genuinely did not cover its ending — **the gate would have been stating a true
thing about a real gap, not crying wolf.** It could not have been satisfied then; but the reason was
the gap, not the gate, and the gap closed on 2026-08-25.

**The margin today, so "green" is not read as "just barely":** the ceiling allows **12,000 frames**
(200 s at 1000/60 ms). The slowest track uses **5,888** — 49%. garden-path uses **4,916** — 41%, with
**102 seconds of headroom**. A track would have to take **twice as long as the slowest one does now**
to trip the tightened gate.

**So it was tightened**, and what that costs is written into the guard rather than left to be
discovered: a track whose race legitimately cannot finish in 200 s WILL block this instrument. That
is the intended reading — a fingerprint that silently omits one track's ending is the blindness
CAMERA-ENDING-WINDOW-1 removed — and the failure message says **fix the track or the ceiling, not
this gate**, naming the loosening as how the old justification came to survive its own falsification.

**Proven to fire.** With `dirt-oval`'s ceiling temporarily cut to 20 s: `FAIL: 1 of 10 track(s)
contributed NO FINISHED frames`, exit 1. Restored: exit 0. **`--cheap` runs one track, so "every
track" is not a question it can answer, and the gate stays off there** — as does `--ending-off`,
where zero is the expected answer.

---

## 3. ★ THE PART THAT MATTERS MORE — HOW MANY VERDICTS RESTED ON A CLAIM?

**One. Out of ninety-nine.** And it is the one already known.

`docs/BACKLOG.md`'s *"Garden Path does not finish"* was re-verdicted **STILL TRUE** on 2026-09-02, and
its evidence was:

> *"The premise is confirmed as recently as today — `scripts/camera-fingerprint.mjs:327` **documents**
> its 'at least one track' gate as existing **because** garden-path does not finish…"*

**A comment, cited as evidence of a fact about the world — and that comment had been false for eight
days.** The verdict said in the same breath that the question *"cannot be established mechanically"*,
and then established it anyway from the nearest thing to hand.

**Its own closing note named the missing step exactly:** *"Which of the two changed was not settled by
this pass and no race was run for it."* **The race takes 26 seconds.**

### The audit, over all 99 verdicts of that pass

Every `VERDICT 2026-09-02 (BACKLOG-VERDICTS-1)` line was extracted and classified by what its
evidence IS:

| evidence | count |
| --- | --- |
| the tree — a file read, a command run, a count taken (*"verified at source"*, `git grep`, `ls … returns`, *"re-counted today"*) | **64** by pattern, and more of the remainder on inspection |
| **not a tree question at all** — NEEDS HIS WORD (5), *"waiting on a spec / a decision / somebody performing it"* | most of the other 35 |
| **a DOCUMENT, COMMENT or REPORT cited as evidence of a fact** | **1** — `:578`, the garden-path entry |

A second, narrower pass searching the verdict text for *documents / comment / the report / records
that / as recently as* returned **four** rows, and three of them are clean: two say *"Verified at
source:"* and name files and line numbers (the word "comment" is what they verified, not what they
relied on), and one is a scope verdict (*"NEEDS HIS WORD: the entry says so itself"*), which is a
statement about whose decision it is, not about the world.

**So the contamination was real and it was isolated.** One verdict in ninety-nine, in the one place
where the pass had already admitted it could not answer mechanically and reached for a comment
instead of stopping. **The entry is re-verdicted in place** — the old verdict left standing above the
new one, so the movement is visible — and CAMERA-GATE-1's removal of the comment and of the printed
line closes both copies of the claim it rested on.

**The doc-truth passes were checked for the same shape and did not have it.** CORRECTIONS-1 states
that every one of its 34 was re-checked against the code, the command or the config module before
being applied, and I re-verified that population myself; DOC-TRUTH-2's table carries a *"what is
true"* column with a source for each row.

---

## 4. WHAT MOVED, AND WHAT ELSE POINTED AT IT (constraint 2)

| what moved | what pointed at it | outcome |
| --- | --- | --- |
| the printed sentence | nothing cited it — it was output, not source | **removed**, replaced by a derived line |
| the gate comment's justification | `docs/BACKLOG.md:578`'s verdict **cited it as evidence** | **both corrected** — this is the second site, and it is the whole story of the piece |
| the gate itself | `reports/evolution/SPEC-AND-GATE-1.md`, `CENSUS-CHECKS-1.md` | **append-only, left**; the change is recorded in the INDEX corrections block |
| *"at least one track"* / *"no ending to sample"* elsewhere in the tree | swept uncapped | **no other live site** — the only remaining hits are this guard's own quotations of the old text and `docs/MORNING.md`, which is rewritten |

---

## 5. NOTHING CHANGED THE GAME

| role | verdict |
| --- | --- |
| camera | `check: CAMERA matches the record for role "camera" (152cf295c4c9ff54)` |
| world | `check: WORLD matches the record for role "world" (8a1977187e9c99b4)` |
| world-off | `check: WORLD matches the record for role "world-off" (aa09ed97a3a32689)` |
| render | `check: RENDER matches the record for role "render" (485b73d527602a0e)` |

**All four run, all four match. Nothing minted.** Only the instrument changed — a printed string, a
comment, and one added refusal — none of which the director or the engine reads.

---

## Limits

**Twelve daily tips, not every commit.** The boundary is unambiguous — seven green days after
`d73ec6a9` and five red before it, with the cause identified — but a commit between two tips could
have been red for a different reason and this would not see it.

**The replay ran TODAY'S engine at each old tree, because that is what checking out a commit does.**
It is a faithful replay of what the instrument would have printed then, which is the question asked.
It is not a claim about what any other tool would have done.

**"Zero without cause" is a judgement about the word "cause".** Every red the replay found was a true
statement about a real gap. Somebody who counts "the build was blocked and nobody could unblock it
that day" as crying wolf would read the same five days the other way — and would leave the gate
loose. **The number is given both ways so the reading is not hidden inside it.**

**The 1-of-99 audit classifies verdict TEXT, not the work behind it.** A verdict that says
*"verified at source"* is counted as tree evidence; whether the person actually ran it is not
something this can see. What it does establish is that only one verdict openly rests on a document.
