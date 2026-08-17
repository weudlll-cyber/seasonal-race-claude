# CENSUS-CLOSE-2026-08-18 — where the census stands

The closing account for the night's second and third blocks, against the 16 findings
[NIGHT-2026-08-18](NIGHT-2026-08-18.md) left waiting.

---

## THE NUMBERS

| | |
| --- | --- |
| census findings **closed outright** | **8** |
| **partly closed** — the safe half done, a decision left | **2** |
| **made visible** — the hole is now declared where a reader meets it, the fix is not made | **5** |
| **untouched and listed** | **1** |
| **new findings opened tonight** | **2** |
| **still waiting for the owner** | **8** |

**Six merges, every one green for its own SHA.** `2f22e140` · `0877d523` · `213136f0` (red, see
below) · `4cd1876b` · `e04c19e1` · `cce4b03f` · `00bdf10f`.

**One went red and it is not hidden.** `213136f0` failed with all 4111 tests passing — a vitest
teardown race that QUIET-FAILURES-1's new console output had made likelier. Fixed at `4cd1876b`, and
the *cause* removed in `e04c19e1`.

**Nothing touched the race.** WORLD `dc4647be0f55ebdb`, WORLD-OFF `854018ee5d3d83e1`, CAMERA
`d9f45a4aea0e5778`, RENDER `1274c7e8444238e3` — measured at every piece that could reach them, never
moved.

---

## WHAT IS LEFT FOR HIM — the three columns

Ordered by what he would see.

| # | finding | does a SHIPPED path reach it? | could he SEE it? | what happens if left alone |
| --- | --- | --- | --- | --- |
| **A** | **The eleven remaining copied defaults.** Five `?? 0` physics keys, the B2-attacker trio, three Dev Screen controls | the code is shipped; **the branch is unreachable** — every caller passes a complete config | **only the three Dev Screen ones**, and only if the loader ever stopped resolving against the defaults: a checkbox reading *off* while the game runs *on*, and **1.0×** where the game runs **2.0×** | nothing changes. They are documentation defects until a partial-config caller appears — and one appeared once already, in the sim | 
| **B** | **`withTimeout` never clears its timer** (`client/src/utils/withTimeout.js`) — **NEW tonight** | yes — every storage loader in the browser | no | the browser holds a 3 s timer per loader call for nothing. Harmless; it is the mechanism that let test work outlive its test |
| **C** | **`verify.mjs` can run the script suite with zero tests.** `scriptTestFiles()` catches a git failure and returns `[]`, then runs `node --test` with no arguments — the Lesson-187 trap **CI explicitly guards and verify does not** | no — the verify tool | no | the one mechanism whose whole subject is "a suite that discovered nothing must not pass" keeps an exception in the tool he runs most |
| **D** | **`racer-types/` is covered by no instrument.** The document no longer claims otherwise; the gap is real | yes — every racer drawn | **yes** — a change to how a racer looks | his eye stays the only instrument. Defensible, now stated; widening the render fingerprint is his call |
| **E** | **Two guards scan repo-root `*.md` but do not route on it** | no | no | a broken link or stale stamp in `README.md`/`CLAUDE.md` is invisible to the local run. CI catches it — a late failure, not a missed one |
| **F** | **`check-index` walks 3 of 14 report directories** — 245 covered, **329 not** | no | no | an orphaned report in `proposals/` or `audit/` cannot be detected. `audit/` held the **only copy of a critical finding** until it was rescued this morning |
| **G** | **`check-fallback-agreement` cannot see object-literal fallbacks** | no | no | a `?? { … }` copy of a default drifts with nothing counting it. Two existed; both are gone, but the blind spot is not |
| **H** | **`check-measured-stamps` routes on a directory**, so a test-only edit trips a production stamp | no | no | a false positive on every camera test edit, answered by re-stamping — which is the habit that makes a stamp meaningless |

**B, E, F, G and H are now declared where a reader meets them** — in the guard's own `blind` list or
beside the code. That is the difference between a hole and a trap.

---

## WHAT WAS CLOSED

**Closed outright (8):** first-admin setup could not succeed and now can, proved through a real CORS
preflight against a running server · the contract-test gap that let it ship, closed by a seam test
proved by sabotage · a missing geometry reading as a CLOSED track — now refused rather than guessed ·
surface classes vanishing silently · a corrupt stored config reverting silently · the server's route
loaders (found already compliant, reported not changed) · 43 config values in living documents (all
dated history — no action was the right answer) · two untracked audit trees rescued into the indexed
tree, unedited.

**Partly closed (2):** the copied-default census went **29 → 21 → 14 sites**, with six boolean
mirrors *removed* rather than aligned; and `SHIP-CEREMONY.md` stopped naming an instrument that does
not cover the racer types, while the decision about widening it remains his.

**Opened tonight (2):** `withTimeout`'s uncleared timer (B above), and — the one worth reading — the
screen tests were making **real network requests to `localhost:4000`**. The suite's own `HTTP 401`
proved a live dev server was answering unit tests. That is closed now, and it is a finding rather
than a fix note: those tests were passing or failing on what else happened to be running.

---

## THE HONEST SENTENCE, UPDATED

Last night's verdict was that the game is sound and what is thin is everything around it — that it
fails quietly and defaults confidently. **Both halves survived the work.**

Four fingerprints did not move across seven merges that touched the engine's own file, the storage
layer, the setup screen and the client's request layer. The race is not where the problems are.

**What changed is the quiet.** Five failure paths now speak, a race that could not be started is
refused instead of guessed, a contract that could not work is tested at the seam, and five guards
that were describing cover they did not have now describe what they actually walk. **The remaining
eight are, without exception, things that cannot hurt him today** — unreachable branches, latent
routing gaps, and one decision about a document. That is a different list from the one this morning,
and it is a shorter one.

**The one caution.** Two of tonight's three red-adjacent moments — the teardown race, and the
warning that fired in every headless harness — were caused by *my* changes and found by *measuring*,
not by reading. Both were in the safety-improving direction and both were still wrong on first
attempt. The rule that caught them is the one worth keeping: measure the instruments, and run the
thing rather than reason about it.

---

## PROPOSALS

### Proposal A — take the eleven remaining mirrors off the list with one sentence, not eleven edits

Eight of the eleven (A above) are the same question asked eight times: **should a caller that omits a
key get the feature OFF, or the shipped value?** Today the code says OFF; a reader expects the
shipped value. Answering once settles all eight and shrinks the guard's exception list to the three
Dev Screen entries — which have their own answer, a test that renders the section with an empty
stored config.

**Why a sentence and not a sweep:** there is no caller to learn from, so this is choosing a
convention. A sweep that picks one is guessing on his behalf; a line beside L207 in `LESSONS.md` is
the whole decision.

### Proposal B — forbid the network in every screen test, then read the list that goes red

`forbidNetwork()` already exists and is one import and one call. The four files fixed tonight were
the ones that *announced* themselves, because QUIET-FAILURES-1 had given their loaders a voice — a
screen test whose loader still fails silently looks perfectly clean today.

**Adding the guard to every `screens/**/*.test.jsx` and seeing which go red is half an hour**, and it
converts an unknown number of environment-dependent tests into a list. A test that passes or fails
depending on whether his dev server happens to be running is the least reproducible thing a suite can
contain, and tonight proved the suite has more than one.

### Proposal C — make a guard's declaration checkable

Four declarations were wrong in the same direction tonight: each claimed cover it did not have, and
nothing could notice because `covers` and `blind` are prose. **A rule inside `verify.test.mjs`** —
every path in `dirs` exists, and a directory named in the prose is either in `dirs` or explicitly
marked scanned-but-not-routed — would have caught the repo-root gap in both guards the day it
appeared. R13's first question has an answer: this belongs in the test that already reads every
declaration, not in a new guard.
