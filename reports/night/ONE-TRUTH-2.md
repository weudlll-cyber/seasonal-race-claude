# ONE-TRUTH-2 — one home, references everywhere else

**Branch** `feat/one-truth-2`. **STACKED, and this needs stating first:** it is cut from
`feat/one-truth-1` (PR #130), which is itself cut from `feat/night-tools-1` (PR #129). Neither is
merged, so both appear in this branch and in PR **#131**. Review #129, then #130, then this.

---

## 0. CONFORMITY — element by element, before any numbers

| Constraint                                                                            | Result                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Never modify the engine-reach hull                                                    | **Untouched.** `scripts/engine-reach.mjs` unchanged; no file in the 19-file closure was edited in this block.                                                                                 |
| Nothing may change what the owner sees in the browser                                 | **Nothing does.** The only `client/src` edits are a comment in `CameraDirector.js`, three added tests in `zoomUnit.test.js`, and a comment block in an e2e spec. No shipped behaviour.        |
| All three fingerprints byte-identical at the end                                      | **Verified against the ENGINE, not recalled** — `check-fingerprints --mint` re-ran every role's reproduce command. All four match.                                                            |
| No exploratory race series; only stage 2's ten runs                                   | Held. The only repeated running is stage 2(d). The world fingerprint ran for the `world-off` verification and for `--mint`; those are single mints, not a series.                             |
| A change visible to his eye is a finding, not an edit                                 | Three were recorded and not acted on — see §7.                                                                                                                                                |
| Consequence test · sabotage test · capture before editing a tool whose output changes | Every guard added or changed here has both positions tested; **14 sabotages** are listed in §5.                                                                                               |
| Every guard states IN ITSELF what it does not check                                   | Done for all four guards touched. **One exception, named:** `scripts/engine-reach.mjs` has no such section and I may not modify it. Its limits are stated in `docs/SHIP-CEREMONY.md` instead. |

### The three fingerprints

Re-minted against the engine at the end of the block; all unchanged. **Their values are deliberately
not printed in this report** — that is the rule this block exists to enforce, and a report is a
document. They are in [docs/fingerprints.json](../../docs/fingerprints.json).

---

## 1. STAGE 0 — conformity audit of ONE-TRUTH-1

| Item                                                                     | Already done, where                                                                                                                              | Done now                                                                                                                                                                                                                                           | Not done, why                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1(a) verbatim BEFORE capture of the ceremony cost table                  | `reports/night/captures/B-ceremony-table-BEFORE.md` (NIGHT-TOOLS-1)                                                                              | —                                                                                                                                                                                                                                                  | —                                                                                        |
| 1(a) retry-ledger disconnection sabotage                                 | `scripts/retry-ledger-reporter.test.mjs` — "DISCONNECTION: with no reporter, a retried run is INDISTINGUISHABLE from a clean one", plus its pair | —                                                                                                                                                                                                                                                  | —                                                                                        |
| 1(a) each guard states what it does NOT check                            | `check-index`, `gen-ceremony-costs`, `gen-engine-reach-doc`, `check-fingerprints`, `verify` all carry the section                                | **The retry ledger's had gone FALSE** — it still said "It does not know WHY a test retried", which ONE-TRUTH-1 made untrue when it added the reason class. Rewritten.                                                                              | `engine-reach.mjs` — the hull, which I may not modify. Its limits live in SHIP-CEREMONY. |
| 1(b) ONE path-to-checkset table, printed on skip                         | `scripts/verify.mjs` `ROUTES` (commit `6d3099c5`); every skip names its rule                                                                     | —                                                                                                                                                                                                                                                  | —                                                                                        |
| 1(b) both-direction tests, ≥3 paths incl. a config file in no source dir | `scripts/verify.test.mjs` — config file, camera, engine, routed-nowhere                                                                          | —                                                                                                                                                                                                                                                  | —                                                                                        |
| 1(b) matcher states which paths it routes nowhere                        | The `WHICH PATHS THIS DELIBERATELY ROUTES NOWHERE` block in `verify.mjs`                                                                         | —                                                                                                                                                                                                                                                  | —                                                                                        |
| 1(c) SIM.md reachable-file list, generated, UNKNOWN where unestablished  | `gen-engine-reach-doc.mjs` → `docs/SIM.md` (commit `09727abd`); 19 files, 1 UNKNOWN                                                              | —                                                                                                                                                                                                                                                  | —                                                                                        |
| 1(c) CAMERA_DIRECTOR runnable camera check                               | Partially — commands and what each answers                                                                                                       | **Real output pasted as transcripts**, the flags that matter explained, and a new paragraph on **what the render fingerprint does not see** (rasteriser, artwork, particles/trails, anything between two of sixteen frames, garden-path's ending). | —                                                                                        |

**And a correction to my own numbers.** That section quoted ~223 s / ~224 s / ~34 s as what the
commands cost. Those were measured while a twenty-run study was saturating the CPU. Idle they are
**35.4 s, 33.4 s and 17.1 s** — 5–6× lower. A duration measured under contention and quoted as a cost
is not a cost.

---

## 2. STAGE 1 — the inventory, and what happened to each site

All 19 declared sites were **CURRENT VALUE**. **Zero** were machine-consumed literals: every tracked
file was scanned, and not one test, script or config reads a fingerprint string. `machineExceptions`
is therefore empty, and the record says that was measured rather than assumed.

| #     | Site                                                                  | Class   | Decision                                                                                                     |
| ----- | --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| 1–3   | `docs/SHIP-CEREMONY.md` — the three-fingerprint table                 | CURRENT | **Removed.** The table's argument is _which_ fingerprint you owe and _when_; the value was never part of it. |
| 4     | `docs/CAMERA_DIRECTOR.md` — "the acceptance test for any change here" | CURRENT | **Reference.** The argument needs the reader to know the check exists.                                       |
| 5     | `docs/CAMERA_DIRECTOR.md` — the render-path paragraph                 | CURRENT | **Removed.** The sentence works without it.                                                                  |
| 6–7   | `docs/ARCHITECTURE.md` ×2 — "the current world"                       | CURRENT | **Reference**, alongside the existing lineage pointer.                                                       |
| 8     | `docs/ARCHITECTURE.md` — the OFF invariant                            | CURRENT | **Reference** (folded into the same pointer).                                                                |
| 9–10  | `docs/FAIRNESS.md` — shipped world + OFF invariant                    | CURRENT | **Reference** for the world; **removed** for the OFF invariant, which the sentence did not need.             |
| 11–12 | `docs/ROADMAP.md`, `docs/BACKLOG.md` — the retired-history banner     | CURRENT | **Removed.** The banner's point is "the live baseline is REBASELINE"; the digits added nothing.              |
| 13    | `.husky/pre-commit` — the mint hint                                   | CURRENT | **Reference** — now "compare against docs/fingerprints.json".                                                |
| 14    | `client/src/modules/camera/CameraDirector.js` — header comment        | CURRENT | **Reference**, and says it carries no copy on purpose.                                                       |
| 15–16 | `docs/SIM.md` — the File-locations table                              | CURRENT | **Reference.**                                                                                               |
| 17–19 | `reports/parity/REBASELINE.md` — the live-baseline table              | CURRENT | **Removed the value column**, kept "what moved it", which is what that table is for.                         |

Plus three not in the declared set, found by the final sweep: SHIP-CEREMONY's render narrative, and
SIM.md's lineage head (table + prose), where the newest entry _was_ the current value. The lineage
now points at the record and keeps every superseded value.

**Stage 1(c) — historical values.** 89 old-value mentions across living docs; 65 inside the two
declared history homes, where being historical is the point. Of the 24 outside them, 12 already read
as history from their own sentence. **Twelve did not, and were marked** — ARCHITECTURE's COMBO15
pair, AUDIT, CONCEPT-COHESION, and seven under extended banners in ROADMAP and BACKLOG. Plus three
marked during stage 1 itself.

**Stage 1(f) — the tool shrank.** `check-fingerprints.mjs` **267 → 203 lines** (I first wrote 184 here, which was true before the shallow-clone fix was added later in the block; counted again rather than left). The site table, the
anchors, the `--fix` writer and two of three directions were deleted, not kept "in case".

**Stage 1(g) — where a reader finds the current world fingerprint, knowing nothing.** From the repo
root: open `docs/fingerprints.json`. It is the only file in the repository that contains the value,
and a guard fails if that stops being true. Every document that mentions a fingerprint links to it.
To confirm the value is still what the engine produces, run the `reproduce` command written beside
it, or `node scripts/check-fingerprints.mjs --mint`, which runs all four.

**Do I agree the discarded fourth direction becomes tractable? YES, and it is built.** It was unsound
because it had to tell "a stale current claim" from "a correct citation of an old value", which needs
the sentence read. It no longer does. Documents may cite old values freely; what they may not do is
contain a **current** one — a lexical fact about four strings.

---

## 3. STAGE 2 — retries to zero

**How many homes:** three configs can set a retry count; **one** was nonzero.

| home                          | before                   | after          |
| ----------------------------- | ------------------------ | -------------- |
| `client/vitest.config.js`     | `retry: 3`               | **`retry: 0`** |
| `client/playwright.config.js` | `retries: 0`             | unchanged      |
| `server/vitest.config.js`     | unset → vitest default 0 | unchanged      |

No CLI `--retry` anywhere, and CI runs `npm run test:coverage` against the same client config, so
that file is what wins at runtime. **They are not collapsible:** they configure two different runners
plus a second vitest project, and merging them would create a value no single runner owns.

**The ledger does not go quiet.** With retry 0 a zero line would be trivially true every run, and a
reader who has learned to skim "0 tests retried" would never notice the number can no longer be
anything else. It prints **DISABLED** and states the consequence. The count comes from vitest's
_resolved_ config via `onInit`, so a CLI flag or per-test override would be reported as what actually
applied. Three consequence tests: identical input, retry 0 → DISABLED, retry 3 → the zero line, and
an unreadable config falls back to **counting**, because claiming DISABLED when you cannot read the
setting is an invention.

### 2(e) What now happens when a test fails on its first attempt

**The suite fails.** There is no second attempt. The run exits non-zero, `npm run verify` prints
`FAIL 1` and ends with `VERIFY FAILED`, and the commit hook blocks. Previously a test could fail
twice, pass on the third attempt, and be reported as a pass indistinguishable from a clean one.

### 2(d) The ten runs

**Ten runs, retries disabled, sequential, nothing else running. TEN GREEN.**

| run | exit | files   | tests     | failures | wall  |
| --- | ---- | ------- | --------- | -------- | ----- |
| 1   | 0    | 179/179 | 3649/3649 | 0        | 551 s |
| 2   | 0    | 179/179 | 3649/3649 | 0        | 502 s |
| 3   | 0    | 179/179 | 3649/3649 | 0        | 436 s |
| 4   | 0    | 179/179 | 3649/3649 | 0        | 341 s |
| 5   | 0    | 179/179 | 3649/3649 | 0        | 188 s |
| 6   | 0    | 179/179 | 3649/3649 | 0        | 182 s |
| 7   | 0    | 179/179 | 3649/3649 | 0        | 179 s |
| 8   | 0    | 179/179 | 3649/3649 | 0        | 178 s |
| 9   | 0    | 179/179 | 3649/3649 | 0        | 180 s |
| 10  | 0    | 179/179 | 3649/3649 | 0        | 181 s |

**Zero failures, so the stop rule never engaged and no test was given a budget.** Every run printed
the DISABLED ledger line, which is the wording under test appearing in a real run rather than only in
its unit test.

Compare with what the same suite did under `retry: 3` in ONE-TRUTH-1: it FAILED 3 runs in 10 with the
machine to itself, and 10 in 10 under contention. The difference is not that retries were removed —
it is that the two measured budgets in ONE-TRUTH-1 stage 6 fixed the two tests that were consuming
them. Removing retries did not paper over anything; it removed a mechanism that no longer had work to
do, and made a first-attempt failure visible if one ever returns.

**A measurement worth recording because it changes how these numbers should be read:** wall clock
decayed monotonically from **551 s to ~180 s**, a 3× spread across identical runs, and then held flat
for the last six. The early runs paid for a cold OneDrive/anti-virus file cache. **Any single timing
of this suite taken on a cold machine is roughly 3× its warm cost** — which is the same class of
error as the ~223 s camera figure corrected in §1, from the opposite direction.

**THIS IS THE THIRD ATTEMPT AT THIS STUDY, and the first two are discarded rather than reported.**

1. Contaminated by me: I ran vitest for stage 3 while it was in flight — the exact contention the
   study exists to exclude.
2. Invalid: after stopping that run, its shell survived and kept appending to the same file, so two
   studies interleaved (run numbers came out 1, 3, 2, 4, 3, 5…). Every entry was green, and under
   _more_ load than intended — but "ten sequential runs alone" is not what happened, and reporting
   it as such would have been a claim I had not earned.
   The third script writes a file nothing else touches and REFUSES to start if a vitest process is
   already running. Both discarded files are kept in the scratchpad, not in the repository.

---

## 4. STAGES 3–6, briefly

**Stage 3 — the brief's premise was void, and I say so rather than pretending.** The three e2e tests
were to be made to "call the real function in `zoomUnit.js`". There is no such function:
`LEADER_VIEW_W`, `MIN_ZOOM` and `MAX_ZOOM` appear **nowhere** in `client/src`. That zoom model was
replaced by the corridor unit in CAMERA-REFERENCE-WIDTH-1 on 2026-08-02. They were re-implementing a
**retired** formula, after a `goto('/')` that reaches no application code.

Instead I made the _coverage_ real where it could be proven: the **clamp contract** those tests
gestured at was covered by nothing, because every existing test in `zoomUnit.test.js` injects an
identity `clampCamZoom`. Three new tests pin it against the shipped function. The e2e trio is neither
deleted (the owner's call, and the brief said not to) nor rewritten — see §7.

**Stage 3(c) scan:** 221 test/spec files, comments stripped, **four** real hits, all findings, none in
a file this block touched:

| file                                                   | line | assertion                                        |
| ------------------------------------------------------ | ---- | ------------------------------------------------ |
| `client/src/modules/camera/lapUtils.test.js`           | 19   | `expect(REFERENCE_FPS).toBe(62.5)`               |
| `client/src/modules/camera/openTrackCamera.test.js`    | 6    | `expect(OPEN_TRACK_BASE_ZOOM).toBe(1.5)`         |
| `client/src/modules/diagnostics/trackCorridor.test.js` | 61   | `expect(true).toBe(true)`                        |
| `server/utils/imageUpload.test.js`                     | 78   | `expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024)` |

My first pass reported five: it matched the old assertion quoted **inside the comment that replaced
it** — a scanner reading comments as code, which is the class of error it was hunting.

**Stage 4 — the stamp, not the generator.** `tracking-lag.mjs` takes ~7 minutes; a guard that slow is
disabled within a week, and a guard nobody runs is worse than none because it still looks like
coverage. So the figures carry a commit and a date, and `check-measured-stamps.mjs` answers the one
question a stamp makes cheap: _has the measured thing changed since?_ The figures themselves were not
re-run — the camera fingerprint has been byte-identical since they were taken, and it hashes every
director decision on every frame, so if no decision moved the lag cannot have.

**Stage 5 —** `reports/night/` and `reports/parity/` now have indexes, checked in both directions by
the _same_ guard via its existing flags. `CAMERA_DIRECTOR.md`'s duplicate section 7 is resolved: the
verdicts became §8, and all three live references were updated, including the owner-facing handoff
citation in BACKLOG, which still lands on THE STANDING GAP.

**Stage 6 —** `scripts/lib/write-verified.mjs`: write, stat, fail loudly naming the path if absent or
**zero bytes**. And `verify` now ends with `PASS n FAIL n SKIP n`, with the failure verdict as the
**last line printed**; the commit hook does the same and blocks.

---

## 5. SABOTAGES — every one, and its revert

| #   | Sabotage                                                                                    | Result                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Paste a current value into `docs/FAIRNESS.md`                                               | Containment FAILS, naming file and role. Reverted.                                                                                     |
| 2   | Blank the record's camera value, run `--mint`                                               | FAILS: "the ENGINE says … the record says 0000…". Reverted.                                                                            |
| 3   | Doc carries a stale value (fixture)                                                         | FAILS with both values named.                                                                                                          |
| 4   | An **old** value in a document (fixture)                                                    | **PASSES** — the pair that makes containment honest.                                                                                   |
| 5   | Current value in a declared history home vs outside one                                     | Passes inside, FAILS outside.                                                                                                          |
| 6   | A machine exception honoured by name                                                        | Named file silent; un-excepted sibling FAILS.                                                                                          |
| 7   | Record disagrees with the reproduce command                                                 | `--mint` FAILS; containment alone still passes — the split, proven.                                                                    |
| 8   | A broken reproduce command                                                                  | FAILS loudly rather than reading as agreement.                                                                                         |
| 9   | Zero roles / unreadable record / role with no reproduce                                     | All FAIL.                                                                                                                              |
| 10  | Flag in the label position of `fingerprint-default.mjs`                                     | REFUSED, exit 2, prints the corrected command. Pair: the same flag after a label is accepted.                                          |
| 11  | Bypass the clamp in `zoomUnit.js`                                                           | FAILS 2 of 3 new tests (+1 pre-existing). Reverted, 34/34.                                                                             |
| 12  | Stamp predating a camera change / non-existent commit / unknown `depends` / no stamp at all | All four FAIL. Reverted from a copy.                                                                                                   |
| 13  | A real `git clone --depth 1`                                                                | The stamp guard REFUSES to give a verdict. Verified end-to-end.                                                                        |
| 14  | Stray value present at commit time                                                          | Hook prints `GUARDS: PASS 1 FAIL 1` then `COMMIT BLOCKED`, exit 1. Reverted → exit 0. Same for `verify`: exit 1 with the verdict last. |

**A revert that went wrong, recorded because it nearly cost work:** sabotage 1 was first reverted with
`git checkout -- docs/FAIRNESS.md`, which also discarded that stage's _uncommitted_ edits to the same
file. Re-applied. Every sabotage after that reverts from a copy.

---

## 6. TESTS — added, deleted, and both questions

**Added 35. Deleted 13.** Counted from the files, not from memory.

Deleted, with both questions answered:

- **11 tests in `check-fingerprints.test.mjs`** (site/anchor/`--fix` behaviour).
  _What breaks if deleted?_ Nothing — the code they tested no longer exists. _What goes unnoticed?_
  Nothing: the sites they guarded were deleted, and the containment check that replaced them is
  tested by 11 new sabotages.
- **2 routing tests in `verify.test.mjs`**. One was "the record and its non-markdown sites select
  the doc guards". _What breaks if deleted?_ Nothing — `.husky/pre-commit` no longer carries a fingerprint,
  so the route it asserted is gone with the reason for it. _What goes unnoticed?_ The record's own
  routing — so it was replaced, not dropped, by two tests: the record still selects the doc guards,
  and containment selects _every_ changed file.

The second deleted routing test asserted "an empty diff runs nothing, and says so for all six". That
stopped being the invariant when containment was added, and rewriting it caught a claim of mine that
was wrong: containment matches every PATH, so an empty diff still selects nothing. It is "runs
whenever anything changed", not "always runs", and both halves are now pinned separately.

Added, by group: 11 containment/mint sabotages · 4 argv-guard · 3 ledger DISABLED wording · 3 zoom
clamp contract · 6 measured-stamp · 4 write-verified · 4 verify routing.

## 7. WHAT I DID NOT DO, and why

- **The three e2e zoom tests are neither deleted nor rewritten.** Deleting is the owner's call and the
  brief said not to. Rewriting them was not possible to _prove_: Playwright's browsers are not
  installed, and its `webServer` wants port 5173, which the owner's dev server was holding with a
  live connection throughout this block. Rewriting tests I cannot execute would swap a known-empty
  check for an unverified one. The file states all of this at the site.
- **The four literal-versus-itself assertions** are findings; the brief scoped fixes to files this
  block already touches, and none of them is.
- **`scripts/engine-reach.mjs` still has no "what it does not check" section.** It is the hull.
- **`docs/SPEED_REFACTOR_ANALYSIS.md` cites `CAMERA_DIRECTOR.md §7.4` twice and `§13.1` once.**
  Neither exists — that document references a numbering from before CAMERA-HYGIENE-2 rewrote the
  camera doc. Pre-existing, unrelated to my renumbering, and inventing a target would be worse than a
  dangling one.
- **`write-verified` was applied to the two living generators only**, not to ~40 `exp-*.mjs`
  harnesses (~100 write sites, output read by the person who ran them in the same sitting) nor to
  test fixture writes (a failed fixture write fails its own test on the next line). Both exclusions
  are written into the helper so the next person can widen them deliberately.

### Duplicates still standing

| fact                                                         | copies                                                         | status                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------- |
| the four current fingerprints                                | **1** — the record                                             | enforced by containment                                        |
| historical fingerprints                                      | many, across `SIM.md`, `TAGS.md`, `reports/` and 6 living docs | deliberate; the 12 that did not read as history are now marked |
| **15 config keys quoted with values in 2+ living documents** | up to 4 docs each, **9 disagreeing**                           | **finding only** — see below                                   |
| the zoom formula constants                                   | 1 (was 3) in the e2e spec                                      | the re-implementation itself remains, as a finding             |
| tracking-lag figures                                         | 1, stamped                                                     | freshness guarded, accuracy not                                |

**The config-key finding, because three of them contradict the shipped source:**

| key                 | `defaults.js` | documents say                                                                       |
| ------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `minRacersVisible`  | **3**         | 8 — in BACKLOG, LESSONS _and_ ROADMAP. This is the camera's company-guarantee knob. |
| `lateralDamping`    | **0.16**      | 0.25 in AUDIT and LESSONS                                                           |
| `avoidanceWarmupMs` | **3000**      | 800 in SIM.md                                                                       |

Some will be historical mentions my scan cannot distinguish from current claims — which is the point:
neither can a reader. The canonical home already exists and `CAMERA_DIRECTOR.md` already states the
principle ("every camera setting has ONE canonical home — its entry in `defaults.js` and its tooltip
on the Dev Screen"). Nothing enforces it.

## 8. PROPOSALS

**P1 — extend containment from four strings to the config keys.** The machinery built here is
value-agnostic: it reads a record and fails when a current value appears outside it. `defaults.js` is
already the record for config. A guard that fails when a document quotes `someKey: <value>` and the
value disagrees with `defaults.js` would have caught all three contradictions above, and it is the
same shape — a lexical fact about strings, no sentence-reading. Scope it to keys, not to every number.

**P2 — decide the e2e trio deliberately, with the cost stated.** Three tests assert a formula the
product retired four days ago. Either delete them (coverage lost: none, measured) or install
Playwright's browsers in CI so e2e can be run and rewritten against the corridor unit. What should not
continue is the current state, where they read as end-to-end coverage of zoom and are not.

**P3 — the `depends` path in a stamp should exclude tests.** `check-measured-stamps` trips on any
change under `client/src/modules/camera/`, including a test-only edit that cannot move a measurement.
It fails safe, which is right, but a stamp that cries wolf gets re-stamped without thought — the exact
habit the guard exists to prevent.

**Planner proposal 3 — DECLINED, and here is why.** A lint rule against literal-versus-itself
assertions would fire on `REFERENCE_FPS` and `MAX_IMAGE_BYTES`, which are contract values a project
may legitimately pin, and the suppression comment would become the norm within a week. Four hits
across 221 files does not justify a rule that teaches people to silence it. The one-time scan stands.

## 9. PLAIN LANGUAGE, for the owner

**Where the current fingerprints live now.** In exactly one file: `docs/fingerprints.json`. No
document contains one any more — not the ceremony, not the camera document, not REBASELINE, not the
commit hook. They all link to it instead. If anyone pastes a value back into a document, the commit is
blocked with a message naming the file. To check the record is still true, run
`node scripts/check-fingerprints.mjs --mint`; it re-runs all four measurements (~2 minutes) and
compares.

**What happens when a test fails on the first try.** It fails. Nothing retries it, and the run stops
being green. Before this block, a test could fail twice, pass on the third attempt, and look exactly
like one that passed immediately — which is how a suite that was red 3 runs in 10 stayed invisible.

**Which numbers in our documents are still typed by a person.** Most of them. Specifically: the
tracking-lag figures in the camera document (typed, but now stamped with a commit and a date, and a
guard fails if the camera changes afterwards); the command durations and test counts in that same
document; and every configuration value quoted anywhere in `docs/` — 15 of which appear in two or more
documents, and 9 of which disagree with each other. Three of those disagree with the code itself, and
`minRacersVisible` is the one worth your eye.
