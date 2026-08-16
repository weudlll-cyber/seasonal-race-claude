# DOCS-TWO-WEEKS — what these weeks owed the documentation

**Branch `docs/two-weeks`, 2026-08-18. A writing and deleting job**: no new guard, no new script, no
code change. `engine-reach --check` over all five changed documents: *"none of 5 path(s) can reach
the race engine."* **Nothing minted.**

---

## 1. The lesson canon — checked against itself first

The brief listed eight findings. **Two were already covered and were EXTENDED rather than
duplicated**, per R13; six are new.

| finding | where it landed |
| --- | --- |
| An even close and "the line stays in frame" are incompatible while the ends are fixed | **NEW — Lesson 208**, the Admissible-Set Law |
| Something can look like a check and be none — four instances | **NEW — Lesson 209**, the Inert-Enforcement Law |
| A suite can reach production data through two different doors | **NEW — Lesson 210**, the Blast-Radius Law |
| One run is not a number | **NEW — Lesson 211**, the Single-Run Law |
| Distances are along the course, never as the crow flies | **NEW — Lesson 212**, the Along-The-Course Law |
| A contradiction between derivation and measurement: doubt the measurement | **NEW — Lesson 213**, the Suspect-The-Instrument Law |
| An instrument answering "none" everywhere reports its own bug | **ALREADY THERE — Lesson 196** (the Dead-Instrument Law) and extended with the uniform-negative face |
| A downscaled screenshot is not a measurement | **ALREADY THERE — Lesson 156** (read the geometry, not the pixels) and extended with the downscaling case |

**Why 209 is separate from 196 rather than folded into it**, since that was the closest call.
Lesson 196 asks what would have to change for a READING to read differently; 209 asks what would have
to change for an ENFORCEMENT to fire. The instances are on different layers — a dead suite, an
uninstalled hook, a non-executable hook file, a de-registered workflow — and none of them is a
reading at all. **The uniform "none" IS a reading**, which is why that one went into 196 instead.

Each new lesson carries the incident in its own paragraph and the rule in one bolded sentence, in the
canon's existing form.

## 2. `DEAD-ENDS.md` §O — the even close

New section, with the six-shape table, the geometric finding, and the instruction the brief asked
for: **run `node scripts/diag/runin-line-schedule.mjs` before touching the director for this** — it
prices a proposed close in the line's own units in one run, and a required share above 1 is a shape
that cannot keep the promise. What is NOT excluded is stated too: moving an END of the close, which
is the owner's taste rather than a derivation.

## 3. `docs/CAMERA_DIRECTOR.md` — the repo truth for the run-in

**The impossibility finding is now the FIRST thing in §3a**, in a block a reader meets before any
description of the mechanism — because the failure mode this prevents is somebody designing an even
close, not somebody misreading the existing one. It states the bound, why it is a boundary rather than
an option, the 2.46× price the last shape measured, and the instrument to run first.

**The shipped shape is described where it was missing.** The document explained the run-in as
`RUNIN-OWNS-1` left it — a bound that begins closing when the window opens. It now carries the HOLD
and the single sweep, the derived release (and why the pace is measured over the run-in's own span
rather than the whole race, which was wrong by about six times), and the corridor-cap repair,
**593 overridden frames → 0**.

**One stale measurement was corrected rather than left.** The section carried "the line is in frame
on 73.4% of those frames … first in shot a median 2.5 s … the opening itself takes 2.9 s" — figures
from the 3000 ms opening, left behind when RUNIN-PACE-1 moved it to 1250 ms, and **contradicted
eleven lines above by the same document's own 86.6% / 1.1 s**. A document disagreeing with itself is
worse than one that is merely out of date, because either number can be quoted in good faith.

**And the window's own definition** now records that `endgameThreshold` moved on 2026-08-18 and
halved the window — without restating the value, per CONFIG-TRUTH-1.

## 4. The sweep for statements the last two weeks made untrue

**Method, stated honestly.** All 55–57 living documents were swept by the four fact guards
(`check-doc-facts`, `check-config-claims`, `check-measured-stamps`, `check-doc-links`) plus targeted
searches for the specific claims the brief named — husky, the deploy workflow, the workflow listing,
guard counts, fingerprint values, the e2e suite, the run-in and the minimap. **The sections those
turned up were then read in full.** This was not a cover-to-cover reading of every document, and it
is not reported as one.

**Changed:**

- **`docs/VERIFY-RULES.md` R12a** said the browser suite's "flake budget is unknown, because until
  2026-08-16 the suite had never run successfully". Both halves are now history: it is **103/103
  green** with a measured flake rate of about **two tests per five runs** from one shared mechanism.
  The two-months-dead fact is kept — it is the evidence for Lesson 209 — but as history rather than
  as the current state, and the rule itself is unchanged, because ten minutes is still ten minutes.
- **`docs/NIGHT-RUN.md`** carried the same "unknown" claim in the file that OWNS the command. Same
  correction, with the mechanism named (`client/e2e/appReady.js`) and the point that **five runs were
  what made it knowable**.
- **`docs/BACKLOG.md`** (in piece 1) stated `endgameThreshold`'s old value and two stale line
  numbers.
- **`docs/LESSONS.md`**, **`docs/DEAD-ENDS.md`**, **`docs/CAMERA_DIRECTOR.md`** as above.

**Already correct, checked and left alone — this is the more useful half of the answer:**

- **`docs/ARCHITECTURE.md`** on the workflows. It already lists `audit-schedule.yml`, already
  explains the two-workflow split and why a scheduled advisory run may never block, and already
  records the `deploy.yml.disabled` rename with all four blockers and the reason the suffix matters
  (GitHub registers only `*.yml`, so a disclaimer inside a registered workflow is invisible).
- **Husky.** `docs/ROADMAP.md` records the move to tracked `.githooks/` at HOOK-TRACKED-1 and points
  at VERIFY-RULES R12 as the one home; `docs/VERIFY-RULES.md` mentions `.husky/_` only as the
  generated directory that caused the original defect. Neither is stale.
- **Fingerprint values.** `check-fingerprints`: **952 tracked files scanned, 0 stray copies.** The
  one home holds, and no document needed touching.
- **The 70% fairness threshold.** `check-doc-facts`: restated in **0 places** outside `FAIRNESS.md`.
- **The minimap.** `docs/CAMERA_DIRECTOR.md` and `docs/TAGS.md` both describe the marks and the
  unraced tail as shipped; nothing there has gone false.
- **`docs/DEPLOYMENT.md`.** Describes a hosting model that does not exist yet and says so; nothing in
  it was made untrue by these weeks.

## 5. Believed wrong, NOT changed — it needs a decision

- **The `endgameThreshold` fallback in `cameraTimingComputation.js` is 0.85, now two ships stale.**
  It survives behind a granted "UNFIREABLE" exception in `check-fallback-agreement`. Unreachable is a
  property of today's call graph, not a guarantee, and the file carrying the wrong number is the file
  a reader consults for the right one. **Not changed here** because this piece was scoped to
  documents and the fix touches source plus the test that pins the literal. Carried as PROPOSAL 1 of
  ENDGAME-THRESHOLD-095 and repeated below.
- **`v-ship-*` tags cannot pass `check-tags` in their own tree.** A ship tag points at the merge
  commit, but its `TAGS.md` register line lands in the mint commit that follows — so CI dispatched
  against the tag fails on "1 tag at origin not registered". Verified on `v-ship-runin-hold`,
  `v-ship-minimap` and `v-ship-contender-zoom`: **none of the three contains its own register line.**
  This makes "CI green for exactly the merge SHA" unobtainable via the tag, and it is a real
  contradiction between two of this repository's own rules. **Not changed**, because the fix is a
  choice between three shapes (tag the mint commit instead; land the register line in the merge with
  a placeholder SHA; or exempt a tag from its own tree) and that is the owner's call.
- **`docs/BACKLOG.md` §"`deploy.yml.disabled` cannot run"** duplicates what `ARCHITECTURE.md` now
  states in more detail. Not merged, because deciding which of the two is the home is a
  one-canonical-home question with a real answer either way.

## 6. Fingerprints

**None can move and none was measured.** Documents lie outside every instrument's declared closure —
the five changed files are `.md` and no closure contains one. `engine-reach --check` over all five
explicit paths: *"none of 5 path(s) can reach the race engine."* **Nothing was minted.**

---

## PROPOSALS

1. **Bring the `endgameThreshold` fallback in step and delete its exception.** Three lines: the
   fallback in `cameraTimingComputation.js`, the "no config" test that pins the literal, and the
   entry in `check-fallback-agreement`. It has now survived two supersessions on the strength of
   "nobody reaches it", which is the weakest reason to keep a wrong number in the file people read.
2. **Settle the tag-versus-register contradiction, because it makes a stated rule unachievable.**
   §5 shows a ship tag can never satisfy `check-tags` in its own tree under the current convention.
   The cheapest fix is probably to **tag the MINT commit rather than the merge** — the return point
   `^1` still resolves usefully, and the tag then points at a tree that registers itself — but it
   changes what three years of `TAGS.md` entries mean by "the ship", so it is a decision and not a
   tidy-up.
3. **Give Lesson 209 a standing instrument, not just a lesson.** The four instances were all found by
   somebody looking. A one-page register — every check the project relies on, when it was last seen
   RED, and what made it red — would turn "has this ever fired?" from an investigation into a lookup.
   **Deliberately proposed as a DOCUMENT rather than a guard**: the fact a guard could check
   (a workflow exists) is not the fact that matters (it can fail), and R13 says the last resort is a
   new script.
