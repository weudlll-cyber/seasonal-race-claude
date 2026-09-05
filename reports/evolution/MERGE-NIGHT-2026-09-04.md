# MERGE-NIGHT-2026-09-04 — closing the night thread

**Date:** 2026-09-05. Branch `night/2026-09-04` (`fa8925ff`) caught up to master (`3007c4bb`) and
merged. **Ten pieces, one merge, no squash.** Nothing in the night changed the picture and nothing in
the catch-up changed behaviour.

---

## 1. The catch-up

**★ THE PIECE PREDICTED THREE COLLIDING FILES; THE TREE SAYS TWO.** `endgame-sheet.mjs`,
`viewer-invariants.mjs` and `docs/BACKLOG.md` were named. The night branch never touched
`endgame-sheet.mjs`, so master's correction to it arrives unopposed.

| file | outcome |
| --- | --- |
| `docs/BACKLOG.md` | **auto-merged.** Both sides verified present afterwards rather than assumed: D27–D30 and master's closing-phase note, alongside the night's Player Group move, the `RaceScreen` answer, the `--tracks=all` occurrence and the background-sabotage correction |
| `scripts/viewer-invariants.mjs` | **one conflict hunk** — see below |
| `scripts/endgame-sheet.mjs` | no conflict; the night never touched it |

### The one hunk, and why it was a question meeting its answer

Both sides inserted a block immediately above `const GATE_TRACKS`:

- **the night (piece K2, 2026-09-04)** — the OBSERVATION that item 2 and item 9 measure the same
  behaviour under two names, so two of the three exclusions hang on one behaviour counted twice. It
  ends on an open question: *if the acceptance reaches item 2, both exclusions lose their last
  reason.*
- **master (D27, 2026-09-05)** — the DECISION answering exactly that question: the acceptance does
  reach item 2.

**Resolved by keeping both, in that order — the observation, then the answer.** Master's D27 block is
**byte-verbatim** in the result, checked programmatically rather than by eye, as are the night's four
piece-E guards and its K2 observation.

**TWO SENTENCES OF THE NIGHT'S BLOCK WERE OVERTAKEN THE NEXT DAY. They are kept as written and
ANNOTATED, not edited** — rewriting either side to fit is what this merge may not do:

- *"names two behaviours and TWO ITEMS — 9 and 10"* → corrected by ACCEPTED-FINISH-ATTRIBUTION-1 to
  ONE behaviour and item 9. The rest of that paragraph stands and its "if" is now answered.
- *"has not been given"* → true when written; given the next day. **The refusal to change an
  exclusion is unaffected and still binding on both sides.**

**No hunk had to be resolved by dropping content**, so nothing was escalated.

---

## 2. The references master could not resolve

Searched `docs/BACKLOG.md`, `scripts/endgame-sheet.mjs` and `scripts/viewer-invariants.mjs` for each
of the **twelve files this branch adds that master lacked**. The full result:

| document | refs | what was done |
| --- | --- | --- |
| `docs/DEPLOY-NOTES.md` | 2 | **CONNECTED.** D30 said §2 should point at D30 rather than restate it once the branch merged. §2 now opens with the decision and a link; the superseded *"NEEDS HIS WORD"* paragraph is kept as a dated parenthesis rather than deleted; the "one command" checklist marks hurdle 2 **answered but NOT YET BUILT**. D30's own ⚠ note is rewritten to record that the connection is made. |
| `CLOSING-CUT-1` | 4 | **LINKED.** They were bare names precisely so no link would dangle on master. D28's *"that report is on the unmerged branch at the time of writing"* now records that it landed. |
| `RACESCREEN-MOUNT-1` | 2 | **LINKED.** |
| `IMAGE-DATE-FNS-1` | 1 | **LINKED.** |
| `ACTION-LEVERS-1`, `SILENT-ZERO-TRACKS-1`, `SIM-FAIRNESS-PIN-1`, `RENDER-CAMERA-GAP-1`, `HARNESS-CEILING-LAPS-1`, `BACKLOG-CORRECTIONS-2026-09-04`, `mount.test.jsx`, `sim-fairness.characterisation.test.mjs` | 0 | **nothing to connect.** They are reached from `reports/night/INDEX.md`, which travels with them. |

**NOT TOUCHED, deliberately:** `reports/evolution/ACCEPTED-FINISH-ATTRIBUTION-1.md` states that
`docs/DEPLOY-NOTES.md` *"is on the unmerged `night/2026-09-04` branch"*, which stops being true with
this merge. **Reports are append-only and are not edited**; it recorded what was true when written.

---

## 3. Verify and the suite, on the CAUGHT-UP branch

Both run after the catch-up and after the reference work, not on the branch as it stood before.

| | result |
| --- | --- |
| `npm run verify` | **PASS 15 · FAIL 0 · SKIP 11**, exit 0 |
| client suite (`npx vitest run`, full) | **241 files passed, 4,476 tests passed**, exit 0 |

The retry ledger reports DISABLED — `retry` is 0, so nothing could have been retried into a pass.

---

## 4. The fingerprint decision, and its reason

**The trees DIFFER**, so the "no re-run needed" branch of the piece does not apply and all four were
run.

`git diff fa8925ff HEAD` is **not empty**: six files, 371 insertions, 58 deletions — master's
attribution correction to `endgame-sheet.mjs` and `viewer-invariants.mjs`, D27–D30 and the
closing-phase note in `docs/BACKLOG.md`, master's report and index entry, and this branch's own
reference work in `docs/DEPLOY-NOTES.md`.

**All four were run on the merge result and all four are UNMOVED** against `docs/fingerprints.json`:
world, world-off, camera and render each match their recorded value. *(The values are not restated
here; that record is their one home.)*

**Nothing was minted.** The night's own measurements are untouched by this — the catch-up added
comments, decisions and documents, and **the night's sweeps were not re-run** (R18: nothing in a
catch-up can change a measurement already taken on the branch, and re-running answers nothing).

---

## 5. The sweep

The branch is deleted locally and at origin. **`git ls-remote --heads origin`, verbatim:**

```
1a8bc6e6a39c6d522b6423b0e15fa0e2aa4d4719	refs/heads/master
```

**Master is the only branch left.** *(This block was added after the sweep — the rest of the report
was written before it, so it could not carry an output that did not yet exist.)*

No annotated tag was cut: the night's evidence is its ten reports and `docs/MORNING.md`, all of which
travel in the merge, so there is nothing a tag would preserve that the history does not.
