# Night block — the standings rule, the render sampler, and the loadmode timeout (2026-08-11)

Three pieces, three branches, base `master 0bb69ad9`. **Two merged, one is a diagnosis and merges
only its record.** Values are not restated here: the fingerprints live in
[fingerprints.json](../../docs/fingerprints.json), the tags in [TAGS.md](../../docs/TAGS.md), and
the standings rule in [STANDINGS-ARCHITECTURE.md](../../docs/STANDINGS-ARCHITECTURE.md).

| piece | branch | outcome |
| --- | --- | --- |
| 1 · the standings architecture becomes a rule | `feat/standings-rule` | **MERGED** `be0105f6`, branch deleted, CI green |
| 2 · the render sampler follows the ceremony | `feat/render-sampler-ceremony` | **MERGED** `9cee5875`, branch deleted, CI green, RENDER minted, tag pair cut |
| 3 · the `TrackEditor.loadmode` timeout | `diag/loadmode-timeout` | **DIAGNOSED, nothing fixed** — the cause is not what the piece suspected |

---

## Piece 1 — the two-layer standings become a rule with a guard behind it

**What was asked and what it is for.** The reasoning behind the slot-layer standings lived only in
four reports and in the tag register. A report explains; it does not prevent — a rebuild in June
undid a rejection exactly that way.

**What was built.**

- `docs/STANDINGS-ARCHITECTURE.md` — the architecture as a RULE. Two layers; **the place belongs to
  the slot, never to the racer card**; the badge column and its gold/silver/bronze are slot-bound; a
  rank change moves a card and must change no text and no structure anywhere. It states no number
  the reports already own and links to them instead.
- `scripts/check-standings-invariant.mjs` — the guard, in two halves.
  - **SOURCE**, milliseconds: the card may not import a rank helper, may not take a rank-ish prop,
    and may not be handed one.
  - **MEASURED**, ~4 s: the real components mounted in jsdom, a real ranking churn driven through
    the real positioner, and a real `MutationObserver` counting what the browser was asked to do.
- `client/src/screens/RaceScreen/standingsInvariant.test.jsx` — where that measurement is taken.
- `client/src/screens/RaceScreen/Scoreboard.jsx` — an EXTRACTION, forced by the guard.

**Why both halves, which was the finding that shaped the file.** A card that displays its place has
to RE-RENDER to say so, which means a rank prop coming down from the screen — and a mounted harness
only ever sees what it is handed. The measurement would have stayed green while the architecture was
gone. The lexical half closes that, and is declared as the approximation it is (R11).

**Why the extraction.** The guard has to mount the REAL composition. Mounting `RaceScreen` is not an
option (it builds a race, takes a canvas, starts a frame loop), so the alternative was for the guard
to re-declare the arrangement itself — a second home for the thing being guarded, and a copy cannot
notice the original changing. ~35 lines of JSX moved out of `index.jsx` unchanged in every element,
class and order; `index.jsx` goes **1726 → 1691 lines** and loses four imports.

**The apparatus was reused, not rebuilt.** jsdom, Testing Library and the components' own tests
already mount this list, and the `MutationObserver` is the same instrument SCOREBOARD-SLOT-LAYER
measured 833 mutations with — once, by hand, in a session nobody can repeat. What is new is that it
runs on every verify.

**THE SABOTAGES, both directions, both reverted.**

| sabotage | result |
| --- | --- |
| the place put back on the card — `rankLabel` + a `rank` prop, passed from `Scoreboard` | **RED**: 3 source violations, exit 1, in **5 ms** (the measured half is not even reached) |
| the positioner made to write the place as text on every move | **RED**: the measured half — **959 `childList` records on `.sb-badge-spacer`**, plus the card-text and colour cases |

`scripts/check-standings-invariant.test.mjs` proves the source half end-to-end against fixtures — 8
tests, including the near-miss that would have made the guard a nuisance: `raceNumber` is
racer-bound and must NOT fire.

**Cost.** The guard measures itself: **3.8–5.1 s alone**, 18.0 s inside a concurrent verify. It is
routed by its own declaration (`dirs: client/src/screens/RaceScreen/`, plus
`docs/STANDINGS-ARCHITECTURE.md` by name) and was discovered by `guardScripts()` without touching
`verify.mjs`.

**Verify.** PASS 11 FAIL 0 SKIP 7. No fingerprint was selected and none moved — the standings are
DOM. CI green on the branch BEFORE the merge (R8 exception 1: the change adds a guard).

---

## Piece 2 — the render sampler follows the ceremony again

**The hole.** `CD_SAMPLE_MS` was `[0, 1500, 2400, 3800, 4900]`, chosen against a ceremony whose
starters board ran 3400–4600 ms. CEREMONY-OPENING moved the board to **5000–11000** at 40 racers, so
every one of the five points landed before the board existed. The board, the settled beat and the
countdown digits — the majority of the opening — were outside the instrument, and the previous
render record said so and named this fix.

**What was built.** `scripts/lib/ceremonySamples.mjs` derives the points from
`ceremonyScheduleFor`'s own output: **one per beat, at the beat's MIDPOINT**, which is the only
choice that cannot land on a boundary however short or long a beat becomes. A beat of zero length
contributes no point. **The board gets a second point inside its fade**, because the alpha ramp is a
mechanism of its own and because the board is the beat this instrument lost for a whole ship.

At n=40, branded: `brand@1250 venue@4000 push@6500 board-fade@7610 board@10500 settled@15500
digits@19000`. **Five countdown frames per track become seven.**

**The marker carries the BEAT, not the millisecond**, so a beat that stops being sampled takes its
marker out of the stream — a moved hash rather than a silent hole.

**The brand is turned on, deliberately.** The schedule gives BRAND zero length unless somebody says
a card is opening, so without it the beat does not exist and there is nothing to sample. Both the
director and the frame arguments are told, because a disagreement there would compute the board
alpha and the digits against a schedule the camera is not using.

**WHICH BEATS ARE COVERED, AND WHICH ARE NOT.**

| beat | covered? | by what |
| --- | --- | --- |
| brand | **yes** — the canvas under the card | the venue shot, held (`ceremonyZoom` returns the venue zoom for BRAND and VENUE alike), plus the 2500 ms shift every later beat inherits |
| venue | yes | midpoint |
| push | yes | midpoint — the camera mid-travel |
| board | **yes, twice** | one on the fade-in at ~half alpha, one at full opacity |
| settled | yes | midpoint — formation held, board gone |
| countdown digits | yes | midpoint — one of the three digits |
| **the brand CARD itself** | **NO, and it never can be** | `CeremonyBrandCard.jsx` is DOM; so is the corner `BrandLogoOverlay`. No draw-call hash can see either. The owner's eye is the instrument. |
| **the other two digits** | **no** | one point per beat is the rule; a digit-glyph change would still move the sampled one |

**THE PROOF, both directions.** The board heading changed `STARTERS` → `RUNNERS`, one track:

| sampler | clean | sabotaged | verdict |
| --- | --- | --- | --- |
| the old five milliseconds | `357affd63e010d4d` | `357affd63e010d4d` | **byte-identical — blind** |
| the derived points | `d5a9ba16997365ef` | `0c6456d8cef41d18` | **the hash moves** |

The sabotage was reverted; only the two runs remain.

**The mint.** RENDER moved once, deliberately: the product did not change, the instrument did.
Measured fresh on the committed tree, **no `--cheap`**, 10 tracks, 7+16 frames each, 28.9 s — and
reproduced independently by `npm run verify` on the same tree. **CAMERA, WORLD and WORLD-OFF were
re-measured on that same tree and all three are UNCHANGED**, which is the whole claim: an instrument
that starts seeing more must not move anything it was already seeing. `check-fingerprints` reports 0
stray copies across 907 files, so `docs/fingerprints.json` was the only thing to update.

**Tag pair**: `pre/ship-render-sampler-ceremony` (`be0105f6`) and `v-ship-render-sampler-ceremony`
(`9cee5875`), both registered in TAGS.md — the return point before the ship, the ship tag after it,
so the register never names a tag that does not exist.

**Verify.** PASS 9 FAIL 0 SKIP 9; CI green on the branch before merging (R8 exception 1 again).

---

## Piece 3 — the `TrackEditor.loadmode` timeout: NOT FOUND WHERE IT WAS LOOKED FOR

**The piece's starting suspicion was that `npm run verify` constructs a hostile environment — its
spawn, its cwd, its env. It does not. Verify is exonerated, and the measurements say so.**

### What was actually measured

`scripts/verify.mjs`'s `runOne()` was reproduced exactly — same `ROOT` derivation, same
`cwd = join(ROOT, "client")`, same `execFile("npm", ["test", "--silent"], {maxBuffer: 1<<28,
shell: true})`, same piped stdio — and run four times. Then the same suite was run **bare**, from a
terminal, with no verify anywhere near it.

| how | `TrackEditor.loadmode.test.jsx` | slowest test in it | result |
| --- | --- | --- | --- |
| bare, **one file** | 1112 ms | 343 ms | 19/19 pass |
| verify's spawn, whole suite, run 1 | 4213 ms | 1198 ms | 201 files / 3962 tests pass |
| verify's spawn, whole suite, run 2 | **9839 ms** | **3136 ms** | pass |
| verify's spawn, whole suite, run 3 | 4359 ms | 1311 ms | pass |
| verify's spawn, whole suite, run 4 | 4537 ms | 1147 ms | pass |
| **bare, whole suite** | **5023 ms** | 1397 ms | pass |

**The bare whole-suite run sits inside the same band as the four verify-spawn runs.** The
discriminator is not verify: it is **one file versus the whole suite**. The comparison that produced
"it reproduces under verify and not under a bare vitest run" was comparing a whole-suite run against
a single-file run.

### The mechanism, and why it is a knife edge rather than a bug

`client/vitest.config.js` sets no `testTimeout`, so vitest's **5000 ms default** applies. In the
suite the same test is **3.3–9× slower** than alone, and the worst sample observed was **3136 ms
against a 5000 ms deadline** — a margin of 1.6×. The suite saturates the machine: cumulative
`environment` time is ~1000 s against a ~150 s wall clock, i.e. every worker is paying jsdom
construction concurrently on a OneDrive-synced disk.

**This is the same family CI-AUDIT-GREEN-1 already recorded** — two `sim-fairness` tests exceeding
the same 5 s default under coverage, on the same disk, `Test timed out in 5000ms`, no assertion
involved. That report also left "the 5 s default makes a local `test:coverage` report RED on a green
tree" as a one-line change **for its own commit**.

**So this piece STOPS here, as instructed.** The cause is a real property of the harness on this
machine, not a defect introduced by anything, and the one remedy the piece explicitly forbids —
raising the timeout — is also the only remedy inside this file. Raising it would hide the next real
slowdown, which is exactly the argument for not doing it at 3 a.m.

### What was ruled OUT, with the evidence

- **verify's spawn** — reproduced faithfully, 4/4 pass.
- **verify's cwd** — the same `join(ROOT, "client")` string was used; 4/4 pass.
- **verify's env** — the bare terminal run reproduces the slowdown identically.
- **concurrency with other guards** — `client-suite` is declared `exclusive` and `verify.mjs` runs
  every exclusive task alone, before the queue. Read in the source, not assumed.
- **an assertion failure hiding as a timeout** — 3962/3962 tests passed in all five whole-suite runs
  taken tonight. The failure was not reproduced at all.

### THE ONE THING THAT WAS FOUND, and it is reproducible

Hunting the spawn turned up an unrelated and previously unrecorded trap. Handing vitest a `cwd`
whose **drive letter is lowercase** makes it fail catastrophically and namelessly:

```
Error: Vitest failed to find the runner. One of the following is possible:
- "vitest" is imported directly without running "vitest" command
  ...
- Otherwise, it might be a Vitest bug.
```

**198 of 201 suites failed that way**, with `0 test` collected in each. Isolated one variable at a
time — the slashes are irrelevant, the CASE is everything:

| cwd | result |
| --- | --- |
| `C:/…/client` | passes |
| `c:/…/client` | **every file fails, "failed to find the runner"** |
| `C:\…\client` | passes |
| `c:\…\client` | **every file fails** |

`verify.mjs` is safe today because it derives `ROOT` from `import.meta.url`. **The trap is for the
next harness that hands vitest a path a human typed**, and the error message names nothing about
paths — it suggests a Vitest bug. Recorded here so the next person does not spend the hour this
cost.

---

## Source hygiene

| file | before | after | what happened |
| --- | --- | --- | --- |
| `client/src/screens/RaceScreen/index.jsx` | 1726 | 1691 | the standings composition extracted to `Scoreboard.jsx`; four imports removed |
| `scripts/render-fingerprint.mjs` | — | — | +67/−28: the typed sample array replaced by a derived one, the summary line and two header sections rewritten to say what is now covered |

**Noticed and deliberately left:**

- **`SHIP-CEREMONY.md`'s generated guard-cost table does not list the new guard**, and should not:
  it is the CEREMONY's cost table — three fingerprints and three doc guards — not a list of every
  guard. Regenerating it costs five minutes of guard runs and would have added nothing.
- **`scripts/scoreboard-bench.mjs` still requires a headed browser and is nobody's automated
  guard.** It prices what a mutation count cannot see — wasted re-renders that produce identical
  DOM — and that is named in both the rule document and the guard's `blind` list rather than
  quietly covered.
- **The `--coverage` timeout question** from CI-AUDIT-GREEN-1 is still open and still one line. It
  is the same 5 s default this block's piece 3 landed on, and it wants its own commit.

## Proposals

1. **Give the guard costs a floor, not just a table.** Every guard already prints
   `[ra-elapsed-ms N]`, and `gen-ceremony-costs.mjs` already reads it. A guard that gets
   **materially slower** than its last generated figure is currently invisible until somebody
   regenerates the table and reads it. A check that fails when a guard exceeds, say, 3× its recorded
   cost would turn "the inner loop got slow" from something noticed after a month into something
   noticed on the commit that caused it. It is the same shape as every instrument defect this
   project has paid for: the number existed and nothing compared it.

2. **Make the sampler idea general — an INSTRUMENT COVERAGE declaration.** Piece 2's defect was that
   an instrument silently stopped covering a beat. `render-fingerprint` can now *say* which beats it
   sampled; nothing checks that the set is COMPLETE. A `--coverage`-style assertion — "every beat
   `ceremonyAt` can return has at least one sample" — would have failed the day CEREMONY-OPENING
   shipped, instead of being found a ship later by reading a record. The pure function and its test
   already exist (`scripts/lib/ceremonySamples.mjs`); what is missing is the harness asserting it at
   run time rather than only in a test.

3. **A lesson worth numbering:** *a sample point chosen against a rhythm cannot follow the rhythm.*
   It generalises past this instrument — the same shape as the mirrored timing scalars (L207) and
   the disagreeing fallbacks. Anything derived from a schedule should be computed from the schedule,
   and anything that cannot be should be loudly stated as fixed.

4. **Split the client suite's jsdom cost from its assertion cost.** Piece 3's numbers say the suite
   spends ~1000 s of cumulative `environment` against ~150 s of wall clock. Most of that is
   component files each constructing a jsdom. If the inner loop ever needs to get faster, that —
   not coverage, and not the ten slowest files — is where the money is. Worth one measured
   experiment before anybody touches a timeout.
