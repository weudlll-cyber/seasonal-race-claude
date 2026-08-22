# CEREMONY-SKIP-WRAPPER-1 — the last unproven line, and why the screen could not be asked

**Date:** 2026-08-22 · **Branch:** `fix/ceremony-wrapper-proof` off master `2c1122e2`
**Piece 1 of NIGHT-2026-08-22.**

---

## WHAT WAS ASKED, AND WHAT WAS DELIVERED

CEREMONY-SKIP-2 (`608ad5ba`) proved the handler's three guards against a transcription and chained
that transcription to the source. Its own commit message named what it had **not** proved:

> What remains unproven is one line — that `RaceScreen` attaches this handler to that element — and
> nothing here claims otherwise.

**That line is the whole architectural claim.** The handler sits on the WRAPPER rather than on a
canvas because during the brand beat a DOM card covers the picture; a handler on the canvas would be
dead exactly where the first skip is wanted. Test `c` in that file proves a press on the card reaches
a handler _in that position_. Nothing proved the screen _puts it there_.

**Delivered:** one test, `RaceScreen attaches onCeremonyClick to the WRAPPER — not to a canvas`, in
the existing source-reading family in `client/src/screens/RaceScreen/ceremonySkip.test.jsx`. Plus one
BACKLOG item recording why this had to be a source-reading test at all.

---

## §1 — THE TEST, AND ITS FOUR ASSERTIONS

It reads `RaceScreen/index.jsx` as text — the same instrument the neighbouring guards test already
uses — and asserts four things. **Four, and not one, because the claim has four ways of going wrong**
and three of them leave the naive check green:

| #   | assertion                                                                        | the failure it catches                                                                                                       |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | exactly ONE `className="race-canvas-wrapper"` in the file                        | a second element claiming the name makes "its opening tag" meaningless, and assertion 2 would then read whichever came first  |
| 2   | that element's OPENING TAG is a `<div` and carries `onMouseDown={onCeremonyClick}` | the handler moved off the wrapper — the obvious-looking simplification                                                       |
| 3   | `onCeremonyClick` is mentioned exactly **2×** (define + attach)                   | a SECOND attachment point, which double-skips; and the define-but-never-attach case                                          |
| 4   | no `<canvas>` in the file carries `onMouseDown`                                   | the handler landing on a canvas under a different name, which assertions 2 and 3 both pass                                    |

Assertion 2 reads the tag by slicing from the `<` before the class attribute to the `>` after it.
That is exact here because the tag carries no attribute containing a `>`; assertion 2 also requires
the slice to start `<div`, so a shape it cannot parse fails loudly rather than passing vacuously.

## §2 — PROVED ABLE TO FAIL — four sabotages against the REAL source, all red

Each sabotage was applied to `client/src/screens/RaceScreen/index.jsx` itself, not to a fixture, and
the file was restored from a byte copy afterwards (`git diff --stat` after restoring shows the test
file as the only change on the branch).

| sabotage                                                                    | assertion that fired | message                                                          |
| --------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------- |
| handler MOVED from the wrapper onto `race-canvas`                           | **2**                | `the wrapper element no longer carries onMouseDown={onCeremonyClick}` |
| handler kept on the wrapper AND also bound on the canvas                    | **3**                | `onCeremonyClick is mentioned 3× (want 2: define + attach)`       |
| a canvas given `onMouseDown={() => {}}` — a different name, so 3 cannot fire first | **4**          | `a <canvas> in RaceScreen carries onMouseDown`                    |
| a SECOND `<div className="race-canvas-wrapper" />` added                    | **1**                | `expected one className="race-canvas-wrapper", found 2`           |

**Why all four and not just the first.** Sabotage 1 is the one the brief named. Running only that one
would have proved assertion 2 and left assertions 1, 3 and 4 in exactly the condition L187 forbids —
present, plausible, and never demonstrated to be able to fail.

## §3 — WHAT THIS TEST STILL CANNOT DO, stated rather than implied

**It is a lexical approximation of behaviour.** It catches a rename, a move, a duplicate and a
deletion. It cannot catch a wrong value at runtime, a handler shadowed by a stopped propagation, or a
CSS rule that puts something over the wrapper from outside its subtree. The only instrument that
could is a mounted `RaceScreen`, and §4 is why there isn't one.

## §4 — THE BACKLOG ITEM: `RaceScreen` is not testable

Added to the live area of `docs/BACKLOG.md`, directly under the action-control section, as a finding
with evidence and **no proposal** — as ordered. Its evidence, all established at source tonight:

- **1907 lines in one component.**
- **One file imports it to use it** (`App.jsx:13`) and **no test in the tree renders it.** The two
  test files that name it name it in order to AVOID it: `App.test.jsx:18` mocks it to `() => null`,
  and `buildIdentitySource.test.js:25` opens it with `readFileSync` and asserts against its text.
- **First paint returns a placeholder** (`:1746`) because `raceData` is null until an effect reads
  `sessionStorage['activeRace']` (`:381-389`).
- **The race is built in a second effect** gated on `raceData && canvasRef.current` (`:393`) and on a
  geometry that `getTrack` reads out of `localStorage` (`:416`).
- **The draw loop is rAF-driven** (`:1684`, `:1687`) and wants a 2D context.

**One correction was made to this entry before it shipped, and it is worth the line.** The first
draft claimed the tree-wide grep "returns exactly one import and nothing else". It does not — it
returns the mock and the `readFileSync` too. Those two hits are BETTER evidence than the claim they
falsified, and the entry now leads with them. The `verify:` command was replaced for the same reason:
it now asks `git grep -n "render(<RaceScreen" -- '*.jsx'`, whose empty-and-exit-1 output today is
unambiguous, and whose emptiness is evidence because the same pattern matches in dozens of other test
files.

---

## VERIFICATION — what ran, what was skipped, and what already determined the answer

**R15 governs.** This change adds a test and edits a document. It cannot move a rendered frame, a
config value, or a race.

| instrument                   | ran?                                                                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| client suite                 | **RAN** — the change is a test file under `client/src`                                                                                                                           |
| world / camera / render fingerprints | **NOT RUN, and the answer was already determined.** `defaults.js` is untouched and no file the engine or the renderer reads is touched; the only source file this branch modifies is a `*.test.jsx`. Routing's own skip lines say the same. |
| browser gate, 80-race sheet  | **NOT RUN** — R15a and R15c. No fingerprint could have moved and nothing the eye judges changed.                                                                                  |

## BUILD VERSUS SPEC — conformity

| the spec asked                                                                                    | what happened                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| extend the EXISTING source-reading test                                                           | **DEVIATION, deliberate.** A separate `it()` in the same family rather than more assertions inside the guards test. The two ask different questions — _are these the guards_ versus _is it attached here_ — and one failure message naming both would be worse. Same file, same `readFileSync`. |
| assert the element carrying `race-canvas-wrapper` also carries `onMouseDown={onCeremonyClick}`    | done — assertion 2, with 1/3/4 added because the claim has four failure modes                                                                                                                                                                                                       |
| prove it can fail by sabotage (move the handler onto a canvas, watch red, restore)                | done, and three more; all four red, source restored and the restoration verified with `git diff --stat`                                                                                                                                                                             |
| ONE item in the live area of `docs/BACKLOG.md`, evidence recorded, **propose nothing**            | done — one item, no proposal, no rewrite implied                                                                                                                                                                                                                                    |
| client suite only                                                                                 | done — see VERIFICATION                                                                                                                                                                                                                                                             |

## SOURCE HYGIENE

|                          |                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `ceremonySkip.test.jsx`  | 160 → 204 lines (+44: one `it()` and its comment)                                  |
| `RaceScreen/index.jsx`   | 1907 → **1907** — untouched; the four sabotages were reverted from a byte copy     |
| `docs/BACKLOG.md`        | +43 lines, one new section                                                         |
| removed                  | nothing                                                                            |
| extracted                | nothing                                                                            |

**NOTICED BUT LEFT** (each is a finding, not a task taken on):

- **`data-testid="race-canvas-wrapper"` is now load-bearing in two directions** — test `c` needs it at
  runtime, and this new test does not. It is left alone; removing it would break `c`.
- **`ceremonySkip.test.jsx` now holds TWO source-reading tests and four behavioural ones.** That
  ratio is a symptom of §4, not of this file. Recorded there rather than acted on here.
- **`RaceScreen/index.jsx` has three other `onClick` handlers** (`:1734`, `:1870`, `:1898`) with no
  test of any kind. Not in scope; it is the same root cause as §4.

## PROPOSALS — for the owner, nothing done

1. **A `render(<RaceScreen/>)` smoke test behind a small fixture helper.** The two effects that gate
   everything read `sessionStorage['activeRace']` and `localStorage` — both are writable from a test
   in three lines. A helper that seeds both plus a stub 2D context would let the real component mount
   far enough to render the wrapper, which would replace assertions 2 and 4 with the real DOM. **Cost
   and risk:** the rAF loop then runs, and every unrelated failure inside it lands on the ceremony
   test as a flake. Worth doing only with fake timers and rAF stubbed, and it is a piece of its own,
   not a rider on this one.
2. **A general guard: any `onMouseDown`/`onClick` added to a canvas in `RaceScreen` must be
   justified.** Assertion 4 is written today as a fact about this one screen. As a rule inside an
   existing guard (R13) it would state the design instead: _the picture's pointer handling lives on
   the wrapper, because DOM cards cover the canvas_. **Cost:** it is a lexical rule about a design
   choice, so R11 applies in full — the day someone has a real reason for a canvas handler, the guard
   must yield by name rather than force the code to be wrong.
