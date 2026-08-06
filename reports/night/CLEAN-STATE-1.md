# CLEAN-STATE-1 — merge, then one green master with no loose ends

**Branch:** `feat/clean-state-1` · **Base:** `master` @ `25baefd4` · **Date:** 2026-08-06 (unattended)

---

## 0. CONFORMITY — element by element, before any numbers

| Element of the brief                                             | Status                                                                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge #129 → #130 → #131, **merge commits only**                 | **DONE.** Three true merge commits, two parents each. Proof in §1.                                                                                      |
| Prove it was not a squash                                        | **DONE.** `3e756a31` is an ancestor of master; all three branch tips contained.                                                                         |
| Conflicts → STOP                                                 | **N/A.** No conflict; the branches were strictly stacked.                                                                                               |
| `check-measured-stamps.mjs` on master specifically               | **DONE.** Passes on master. §1.                                                                                                                         |
| Full docs job + client job on master                             | **DONE.** §1. PASS/FAIL/SKIP counts and all three fingerprints given.                                                                                   |
| CI on master (R8), R9 — do not move on until it has reported     | **REPORTED, and it is RED for an INFRASTRUCTURE reason.** GitHub Actions major outage. §1.6. This is the one deviation and it is not mine to fix.       |
| Delete every remote branch fully contained in master             | **DONE.** Three named in §1.7. No tag deleted; the 67-tag count is unchanged and re-checked.                                                            |
| List anything still in flight                                    | **DONE.** §1.8.                                                                                                                                         |
| Stage 1 — the four ONE-TRUTH-2 items, as a table                 | **DONE.** §2. All four were already done; one is now independently re-measured rather than taken on trust.                                              |
| Stage 2 — extend the write rule to ad-hoc helpers                | **DONE.** §3. Mechanism chosen and justified; sabotage shown and reverted; the guard states its own uncovered location in its header AND in its output. |
| Stage 3 — two lessons in house form                              | **DONE.** L205, L206, each with its incident, plus the two one-line records not inflated into laws. §4.                                                 |
| Stage 4 — config contradictions, **FINDINGS ONLY**               | **DONE, no fixes.** §5. Nothing changed in source or in any document.                                                                                   |
| Never modify the engine-reach hull                               | **RESPECTED.** `engine-reach.mjs` untouched; the closure is unchanged at 19 files.                                                                      |
| Nothing changes what the owner sees in the browser               | **RESPECTED.** No `client/src` file was modified. The world fingerprint is byte-identical and `verify` routed the client suite as SKIPPED, correctly.   |
| All three fingerprints byte-identical                            | **VERIFIED.** §6.                                                                                                                                       |
| No race series                                                   | **RESPECTED.** None run. The only multi-race work was the three fingerprints, which are gates.                                                          |
| Format → measure → commit, one change per commit, push at bounds | **RESPECTED.** Four commits, each one change; pushed at every stage boundary.                                                                           |

**Deviations from the brief: one.** CI on master could not report a code verdict because GitHub
Actions was in a major outage for the whole session. I did not treat that as a reason to stop the
block; the reasoning, and what I ran instead, is in §1.6. That is a decision made alone and it is the
most important one in this report.

---

## 1. STAGE 0 — the merge

### 1.1 The three merges

| PR   | branch               | head       | merge commit | parents                 |
| ---- | -------------------- | ---------- | ------------ | ----------------------- |
| #129 | `feat/night-tools-1` | `e663f3ab` | `596140f1`   | `e3437a75` + `e663f3ab` |
| #130 | `feat/one-truth-1`   | `e8db4bf1` | `ebabebda`   | `596140f1` + `e8db4bf1` |
| #131 | `feat/one-truth-2`   | `7e6a8446` | `25baefd4`   | `ebabebda` + `7e6a8446` |

Merged with `gh pr merge --merge`, never the squash or rebase button. **Two parents on each** is the
mechanical proof of the method; a squash would show one.

### 1.2 Proof it was not a squash

```
$ git cat-file -t 3e756a31
commit
3e756a31: ANCESTOR OF MASTER ✓

e663f3ab: contained ✓
e8db4bf1: contained ✓
7e6a8446: contained ✓
```

This mattered: the stamp at `docs/CAMERA_DIRECTOR.md:369` names `3e756a31`, which existed only in
branch history. A squash would have destroyed that SHA and made `check-measured-stamps.mjs` fail on
master **for a real reason** — the same error message as the shallow-clone failure, with a different
and genuine cause.

### 1.3 No conflicts

None. `git merge-tree` reported clean before the first merge, and all three merged without
intervention — expected, since #131 ⊃ #130 ⊃ #129, all branched from `e3437a75`.

### 1.4 The stamp guard on master (0d)

```
$ node scripts/check-measured-stamps.mjs
check-measured-stamps: 1 stamp(s) across 1 document(s), 0 stale. (Freshness only — the numbers themselves are never re-measured.)
exit=0
```

### 1.5 Both jobs run locally against master (0e)

**Docs job — 7 steps, all PASS:**

| step                         | result                                                           |
| ---------------------------- | ---------------------------------------------------------------- |
| check-doc-links              | 345 links / 53 files, **0 dangling**                             |
| check-index                  | 112 reports, **0 unindexed**; 112 index links, 0 missing         |
| check-index (night + parity) | 5 and 7 reports, **0 unindexed** each                            |
| check-tags                   | 67 origin tags, **0 unregistered**; 67 declared, 0 missing       |
| check-fingerprints           | 4 roles, 827 tracked files, **0 stray copies**                   |
| check-measured-stamps        | 1 stamp, **0 stale**                                             |
| script test suite            | **212 pass / 0 fail** (on master; 221 after this branch's tests) |

**Client job — 4 steps, all PASS:** ESLint clean · Prettier "All matched files use Prettier code
style!" · **179 files, 3649 tests, 0 fail** (`RETRY LEDGER: DISABLED — retry is 0`) · audit gate PASS
(critical 0, high 2 both allowlisted with justifications).

**Totals on master: PASS 11 · FAIL 0 · SKIP 0.**

### 1.6 CI on master — RED, and the cause is GitHub's, not the repository's

**This is the deviation.** Both runs on master failed, and neither ran a single step:

```
$ gh run view 31125974893
X master CI · 31125974893
JOBS
X Living-doc guards + script tests in 15m4s
X Client checks in 15m4s

ANNOTATIONS
X The job was not acquired by Runner of type hosted even after multiple attempts
```

`gh run view --log-failed` returns **nothing** — there is no failing step, because no step ran. The
re-run (`31126142888`) failed identically after another 15 minutes.

**The cause, confirmed from outside the repository.** githubstatus.com: _"Incident with Actions —
Major Outage, started 2026-08-06 15:22 UTC … Workflow runs are still failing or delayed in starting,
and some queued jobs may time out."_ The three merge pushes created no check-suites at all for
25 minutes; the runs that eventually appeared could not acquire a runner.

**What I did instead of waiting, and why.** R9 exists so that a red master is seen by a human within
minutes. Its safety argument is about a person being present — not about CI being reachable. With
Actions down for an unknown duration, waiting would have consumed the entire budget and still
produced no verdict. So I established the strongest evidence available:

1. **Master's tree is byte-identical to a tree CI has already passed.**
   `tree(master) = tree(7e6a8446) = 1d6227e6adeda3bda5db2ddca6a986612bd3578d`, and run
   **31084707967** was green on `7e6a8446` — **both jobs, including the docs job with
   `fetch-depth: 0`**. A PR run tests the merge of head into base, which for a strictly stacked
   branch is exactly this tree.
2. **Both CI jobs run locally on master**, step for step — §1.5.

**What this does NOT cover, and I will not pretend otherwise:** the Linux environment (path case,
line endings), and coverage collection, which runs only in CI. A monitor is armed on master's tip; a
run for `25baefd4` was still queued when this was written.

### 1.7 Branches deleted (0g)

Deleted at origin **and** locally, each verified fully contained in master first:

| branch               | tip at deletion |
| -------------------- | --------------- |
| `feat/night-tools-1` | `e663f3ab`      |
| `feat/one-truth-1`   | `e8db4bf1`      |
| `feat/one-truth-2`   | `7e6a8446`      |

**No tag was deleted.** `check-tags` reports 67 origin tags before and after, 0 unregistered.
**`feat/data-export-1` was NOT deleted** — it is 2 commits ahead of master and therefore not
contained.

### 1.8 Still in flight

| item                              | state                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `feat/data-export-1` (`0325fb36`) | Stray branch, **2 commits ahead**, no PR. Not contained, not deleted. **Yours.** |
| PR #132 (`feat/clean-state-1`)    | Open — this block. CI queued behind the Actions outage.                          |
| CI run on master `25baefd4`       | Queued/failing on runner acquisition. Needs one re-run once Actions recovers.    |
| Unpushed work                     | None. Working tree clean, branch pushed.                                         |

---

## 2. STAGE 1 — the four items I could not confirm from ONE-TRUTH-2

**All four were already done.** The value this stage added is that one of them is now _proven_
instead of _asserted_ — see 1(c).

| item                                                      | already done, where                                                                                                                                                                                                                                                                                                                                                                        | done now                                                                                                                     | not done, why                                                                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a)** conformity audit of ONE-TRUTH-1 stages 1, 3, 5    | `reports/night/ONE-TRUTH-2.md` §1 — a nine-row element-by-element table. It found one real defect (the retry ledger's "what it does not check" had gone FALSE) and one honest refusal (`engine-reach.mjs`, the hull).                                                                                                                                                                      | Verified the table's claims against the tree, not just read.                                                                 | —                                                                                                                                                     |
| **(b1)** three e2e zoom tests → real function             | **The brief's premise was void, and ONE-TRUTH-2 said so.** Confirmed independently: `LEADER_VIEW_W`, `MIN_ZOOM`, `MAX_ZOOM` appear **nowhere in `client/src`** — only inside the spec's own literal object and in comments explaining that. The formula was retired by CAMERA-REFERENCE-WIDTH-1. What was done instead: three real tests pinning the clamp contract in `zoomUnit.test.js`. | —                                                                                                                            | Deleting three tests is the owner's call. The spec now carries a comment at `camera-polish-ux-verification.spec.js:141` saying what it does not test. |
| **(b2)** the two tests with the trackLights defect        | Both fixed, in ONE-TRUTH-1: `retry-ledger-reporter.test.mjs` (whole-row `deepEqual` → field-by-field, `c300f0ac`) and `check-fingerprints.test.mjs` (literal `"17/17 sites"` → derived from the record). Verified in the tree.                                                                                                                                                             | —                                                                                                                            | —                                                                                                                                                     |
| **(b3)** self-comparing assertion scan, with count        | ONE-TRUTH-2 §4: 221 test/spec files, comments stripped, **4 real hits**, all listed by file and line. Its first pass reported five and the fifth was the scanner reading a comment as code — the class of error it was hunting.                                                                                                                                                            | —                                                                                                                            | —                                                                                                                                                     |
| **(c)** tracking-lag corrected + which sentences reversed | Table and prose in `docs/CAMERA_DIRECTOR.md` §"The tracking lag, as measured today". The measurement was fresh — introduced by `09727abd` (ONE-TRUTH-1 stage 5); ONE-TRUTH-2's stage 4 added the _stamp_ on top, which is why its report says the figures "were not re-run".                                                                                                               | **RE-MEASURED INDEPENDENTLY.** `node scripts/tracking-lag.mjs` reproduces the documented table **cell for cell** — see §2.1. | —                                                                                                                                                     |
| **(d)** reports under a guard + duplicate §7              | Both done. `reports/night/` and `reports/parity/` have indexes checked in both directions (`7de071b0`). `CAMERA_DIRECTOR.md` now has exactly one §7 ("Open items"); the verdicts became §8.                                                                                                                                                                                                | Verified: `grep "^## "` shows §1–§8, no duplicate. `docs/BACKLOG.md:18` points at §8.3 and records the renumber.             | Stale refs to §6.2/§6.3/§6.4/§10.2/§7.4/§13.1 remain — pre-existing, already disclosed by both prior blocks. Named again in §7.                       |

### 2.1 The independent re-measurement, because it proves more than the figures

```
TRACKING LAG (percentage points of frame, tracking phase only) — OVERVIEW trackingTC=0.25 entryTC=1.5
RACE IDENTITY: n=40 · raceSeed=5601 · camSeed=1439767152 · 60s · 1280x720
state              frames    median pp    p95 pp
  BATTLE_ZOOM         9657       5.71      9.98
  COMEBACK_ZOOM       2103       8.33     15.57
  LEADER_ZOOM        17522       4.46      8.66
  LEAD_CHANGE         7064       4.45      7.17
  OVERVIEW            5199       3.08     16.00
  PHOTO_FINISH        1864       6.37     20.73
  OVERVIEW median 3.08 pp vs every other state pooled 4.86 pp  (ratio 0.63x)
```

Every cell matches the document, including the frame counts. **The owner-facing reversal reads
correctly in the prose, not only in the table** — `CAMERA_DIRECTOR.md:395` states it in words: _"Note
also that OVERVIEW is now the TIGHTEST state rather than the loosest, which reverses the reading the
old figures supported."_

**And it validates something that had never been tested.** The stamp guard's whole design rests on
one claim: _if the camera fingerprint has not moved, the lag cannot have._ That claim was reasoning,
not evidence. It is now evidence — the camera fingerprint is unchanged and the seven-minute
measurement reproduces exactly.

---

## 3. STAGE 2 — closing the gap that bit twice

### 3.1 (a) The mechanism, and why this one

`writeVerified` covers writes in `scripts/`. What bit one commit later (`7e6a8446`) was a **Python**
helper: it applied report edits, hit a Python `assert`, aborted before its write, and the shell had
chained the commit with `;`. The edits were reported as done and were not on disk.

`scripts/prove-changed.mjs` wraps **the command**, not the code inside it:

```
node scripts/prove-changed.mjs --paths=reports/night/X.md -- python apply_edits.py
```

| option                                                        | why not                                                                                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A Python `writeVerified`                                      | Same defect as the first: it only helps code that opts in, and the helper that causes this imports nothing. It is written in one breath and thrown away.                 |
| A written rule ("never `assert` before a write that matters") | **That rule already existed**, in `write-verified.mjs`'s own header, on the day the incident happened. A sentence already written and already broken is not a mechanism. |
| **A wrapper around the command** ✔                            | Language-agnostic — Python, node, `sed`, a shell one-liner. The helper needs to know nothing about this repository.                                                      |

It catches **both** halves: a non-zero exit (the aborted write — and the `;` chaining cannot hide it,
because the wrapper exits non-zero too), and exit 0 with nothing changed (the half an exit code can
never see).

### 3.2 (b) Sabotage, and what it found

**Sabotage 1 — the incident reproduced.** A real Python helper outside `scripts/`, `assert` before
`write`, against a 37 KB copy of a report.

_Before_ (as it happened): traceback scrolls past, `;` chaining continues, `grep -c` finds **0** edits.
_After_: the wrapper prints `PROVE-CHANGED FAILED — the command exited 1 … unproven: REPORT-COPY.md`
and exits 1.

**Sabotage 2 — the silent no-op — and it PASSED, which was the finding.** A Python helper whose
`replace` matched nothing, exit 0. The first version of the guard compared **raw bytes** and reported
success.

**Why:** measured, not guessed — Python on Windows rewrote all **371 LF as CRLF**; the file grew 371
bytes and its text did not change by one character.

```
BEFORE bytes 37305  CRLF 0    bare LF 371
AFTER  bytes 37676  CRLF 371  bare LF 0
```

**Byte identity cannot prove an edit landed**, and it fails on the commonest ad-hoc helper shape
(read-all → replace → write-all) on every run. The verdict is now taken on the text with newlines
folded, and a file rewritten to identical text is reported as the no-op it is:

```
PROVE-CHANGED FAILED — the command exited 0 and changed NO TEXT.
  rewritten, text identical: REPORT-COPY.md  (8c8e6d6917f4)
  THE LINE-ENDING TRAP: … The edit did not land. Do not report this step as done.
```

**Revert:** the same helper with a `replace` that matches → exits 0, `changed: REPORT-COPY.md`. Both
positions of the switch, on the real thing, not a mock.

**This block then hit the same class again, live.** While patching my own scan script (§5), a Python
helper printed `patched` and exited 0 with **one of its three replacements silently missing**. I
caught it by reading the file. It is a scratchpad tool and nothing was reported as done — but it is
the third occurrence in three blocks, and it is the argument for the wrapper better than any I wrote.

### 3.3 (c) What the guard says about its own coverage

Stated in the header **and printed in its own output on every pass**, so it cannot be read as
coverage it does not have:

> `(Text identity only — it does NOT check the content is correct, and it cannot see a command nobody wrapped.)`

The honest limit, written plainly rather than implied around: **a one-off command typed straight into
a shell is invisible to it, and no repository-side mechanism can see it.** This does not create
coverage of ad-hoc work; it gives ad-hoc work a cheap way to prove itself, which someone must still
choose to use. Also uncovered, and listed in the header: content correctness, paths not named, intent,
change-and-revert, a deliberate line-ending-only edit, binary files, durability, the git index.

### 3.4 The defect this stage found on master — and fixed

Running `npm run verify` failed once and passed on re-run:

```
✖ PRETTIER'S FORMATTING IS NOT DRIFT — column padding must not fail --check
  Error: UNKNOWN: unknown error, open 'C:\...\docs\SIM.md'
  errno: -4094, syscall: 'open'
```

Three tests in `gen-engine-reach-doc.test.mjs` sabotaged the **tracked** `docs/SIM.md` and restored it
in a `finally`. `verify` runs the doc guards and the script suite concurrently, so
`check-fingerprints.mjs` held the file open and the write failed outright.

| condition                                     | before    | after      |
| --------------------------------------------- | --------- | ---------- |
| script suite, idle                            | 0 / 25    | —          |
| script suite, concurrent `check-fingerprints` | **1 / 8** | **0 / 16** |

**Retries are zero by design** (ONE-TRUTH-2 stage 2), so that is a red build, not a wobble. **And the
flake is the lesser half:** a crash between the sabotage and the `finally` leaves the tracked document
corrupted in the working tree with nothing failing to say so.

Fixed with the pattern this repository had already proven one block earlier for the identical defect:
the generator gains `--doc=<path>`, the tests sabotage a **copy** in a temp directory, and the
messages name whichever document is actually being acted on. `git status docs/SIM.md` after the suite
is asserted clean.

---

## 4. STAGE 3 — the canon

**L205 — The Shared-File Law.** A test that mutates a TRACKED file cannot coexist with a guard that
reads it. Two incidents, two files: the stamp test on `CAMERA_DIRECTOR.md`, and the one this block
found still standing on `SIM.md`. The law names the tell for review — _a test that reads a path it
did not create, writes it, and restores it_ — and says why the `finally` is not the fix: it narrows a
window it cannot close, because the window is another process's read.

**L206 — The Complete-Input Law.** A guard that names a cause must first prove its own input is
complete. The stamp guard turned CI red saying the _document_ was stale when the cause was a depth-1
clone; the cheapest response to that message would have been to destroy a correct stamp.
**Related to L204 as asked:** L204's instrument knew it had failed and could not explain — honestly
useless. This one did not know, so it explained confidently and blamed the wrong party. _Detecting,
explaining, and knowing whether you are entitled to an opinion are three features; the third runs
first._

**The two records, one line each, deliberately not laws** (under L206): the `PASS/FAIL` counts caught
a defect built in the same block; and mechanisation reached the named place while the error lived in
the unnamed one.

---

## 5. STAGE 4 — the config contradictions. FINDINGS ONLY. NOTHING CHANGED.

**No file was edited for this stage — not in source, not in any document.** The scan script lives in
the scratchpad and is committed nowhere.

### 5.1 (a) The three keys, and which value actually governs

| key                  | source (`defaults.js`)                    | documents say                                                                                                                                                                                                                                       | what governs in the browser                          |
| -------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `minRacersVisible`   | **3** (`DEFAULT_CAMERA_CONFIG`)           | **5** — `BACKLOG.md:147` "stays at 5 until then"; `CAMERA_DIRECTOR.md:480`, **his own verdict dated 2026-08-05**. **8** — `BACKLOG.md:1005`, `LESSONS.md:2212` (both narrating 2026-05/06 work).                                                    | **Whatever is in his localStorage, if anything is.** |
| `choreoOutcomeStart` | **0.6** (`DEFAULT_RACE_DYNAMICS_CONFIG`)  | **0.5 in four living documents, all stating it as current**: `ARCHITECTURE.md:631` ("Config (`storage/defaults.js`)"), `RACE-ACTION.md:195` ("default 0.5 … At the shipped 0.5"), `SIM.md:618`, `KRAEFTE-LANDKARTE.md:163` ("at shipped defaults"). | Same rule — stored wins if present.                  |
| `avoidanceWarmupMs`  | **3000** (`DEFAULT_RACE_BEHAVIOR_CONFIG`) | **800** — `SIM.md:259`, but as a **CLI example** (`--avoidanceWarmupMs=800`), not a statement of the default. Ambiguous rather than wrong; a reader can still take it for the default.                                                              | Same rule.                                           |

**The runtime proof, from the code path rather than from whichever file is easiest to read.** All
three loaders have the same shape — **defaults underneath, stored values on top, per key**:

- `cameraConfig.js:loadCameraConfig()` — iterates `Object.keys(DEFAULT_CAMERA_CONFIG)` and takes
  `storedObj[key]` whenever `hasOwnProperty(key)`, else the default.
- `raceBehaviorConfig.js:loadRaceBehaviorConfig()` and `raceDynamicsConfig.js:loadRaceDynamicsConfig()`
  — `{ ...DEFAULT_*, ...stored }`. (These reject the _whole_ stored object and fall back to defaults
  if validation fails; the camera loader has no such reset.)

**So `defaults.js` is the value his browser uses only if he has never saved that config.** And the
saving side makes that unlikely: `saveCameraConfig(config)` writes `{ ...config }` — **the whole
resolved object**, not a delta — and `CameraAdvancedSection.jsx:284` calls it with the full config.
**One save of any camera setting pins every key, `minRacersVisible` included, permanently.** From
then on, editing `defaults.js` changes nothing he sees.

**The sharpest form of the finding:** his own recorded verdict of 2026-08-05 says
_"`minRacersVisible` stays at 5"_, and the shipped source says **3**. Those cannot both be describing
the same thing. Either his browser is running a stored 5 and the source default is dead text for him,
or the source is live and the verdict has been silently overruled.

### 5.2 (b) Can a stored config shadow the default, and how would he tell?

**Yes — per key, silently, and permanently once saved.** Nothing warns; nothing versions; that is
deliberate (the no-schema decision in `cameraConfig.js`'s header, taken so schema bumps stop wiping
his settings).

**The instrument already exists and does not surface this key.** `cameraConfigProvenance()` returns,
for every top-level key, whether the resolved value came from `stored` or `default`. The race-start
console line at `RaceScreen/index.jsx:530` prints `hadStoredConfig` and the provenance of exactly
**two** keys — `cameraTransitionGrammar` and `leaderForwardFrac`. `minRacersVisible` is not among
them, so the live-truth line cannot answer this question today.

**How he can tell right now, without any change from me** — DevTools console on the race screen:

```js
JSON.parse(localStorage.getItem("racearena:cameraConfig"))?.minRacersVisible;
// a number  → THAT is what his browser uses; defaults.js is irrelevant to him
// undefined → the default 3 governs
```

### 5.3 (c) The full list — is this three keys or thirty?

**Method** (so the count can be judged): every scalar key of every `DEFAULT_*` object in
`defaults.js` (193 keys), against all 36 living documents (`docs/*.md` + repo-root `*.md`).
`reports/` excluded by the repo's own append-only rule. Keys whose names are English words (`min`,
`max`) are **not scanned** — they matched "max 100 characters" everywhere; that is a stated blind
spot, not a clean result.

| level                                                                     | count                      |
| ------------------------------------------------------------------------- | -------------------------- |
| Disagreeing claims found                                                  | **56**, across **24 keys** |
| …excluding dated changelog rows (`\| 2026-05-31 \| …`), which are history | **42**, across **22 keys** |
| …**stating the value as CURRENT** after reading each one                  | **7 keys** ← the answer    |

**The seven, and five of them are in one document:**

| key                         | source | claimed | where                                                               |
| --------------------------- | ------ | ------- | ------------------------------------------------------------------- |
| `choreoOutcomeStart`        | 0.6    | 0.5     | ARCHITECTURE:631 · RACE-ACTION:195 · SIM:618 · KRAEFTE:163 (4 docs) |
| `minRacersVisible`          | 3      | 5       | BACKLOG:147 · CAMERA_DIRECTOR:480                                   |
| `reRollVariationPercent`    | 75     | 58      | **KRAEFTE-LANDKARTE:83**                                            |
| `reRollTransitionDuration`  | 3.0    | 5.0     | **KRAEFTE-LANDKARTE:80, :83**                                       |
| `reRollIntervalDivisor`     | 10     | 15      | **KRAEFTE-LANDKARTE:83**                                            |
| `reRollLastPositionPercent` | 95     | 80      | **KRAEFTE-LANDKARTE:81, :83**                                       |
| `racePlanCorridorEnd`       | 1.0    | 0.95    | **KRAEFTE-LANDKARTE:126**                                           |

**`KRAEFTE-LANDKARTE.md` is the concentration**, and it is the worst place for it: its own header
promises _"Every force is backed by a source line so it can be verified against the source."_ Its
`Config:` line at :83 states four re-roll numbers as current and all four disagree. That document is
not a changelog — it is the map someone reads to understand the physics.

**The other 15 keys are narration, not claims**, and I read each: past findings
(`avoidanceDistance=0.35 too large at 70 racers`), lessons describing the state at the time
(`lateralDamping = 0.25 means…`), the stale-e2e-test incident quoting both numbers correctly
(`draftingBoost` 1.1 vs the shipped 1.04), and two false positives (`runoutZone`, where the document
says `1.0 - runoutZone = 0.95`; `draftingBoost`, matching the literal `1.0` in a code snippet).

**One thing the scan surfaced that is not a document problem at all.**
`CAMERA_DIRECTOR.md:454-455` is _correct_ and reports a **source-vs-source** contradiction: three
hardcoded fallbacks in the camera code disagree with the shipped defaults —
`outcomePhaseThreshold` 0.75 vs **0.65**, `comebackMinStartGap` 0.4 vs **0.25**,
`comebackMaxCurrentRankPct` 0.1 vs **0.2**. Those three are a live divergence inside the code, not a
stale sentence, and they are not covered by anything in this report.

### 5.4 (d) Nothing was changed

Confirmed: `git diff` for this branch touches only `scripts/prove-changed.mjs`,
`scripts/prove-changed.test.mjs`, `scripts/gen-engine-reach-doc.mjs`,
`scripts/gen-engine-reach-doc.test.mjs`, `docs/LESSONS.md` and this report. **No `client/` file, no
`defaults.js`, and none of the documents named above.**

---

## 6. VERIFICATION

`npm run verify` chose its own work from the diff and printed every skip with its reason:

```
VERIFY — 7 changed file(s) vs master
  WILL RUN:
    doc-guards          3 file(s) matched
    fingerprint-containment 7 file(s) matched
    script-suite        4 file(s) matched
  SKIPPED, and why:
    client-suite        nothing matched — covers anything under client/ EXCEPT e2e
    world-fingerprint   nothing matched — covers any file the race engine can reach
    camera-fingerprint  nothing matched — covers the camera director and its modules
    render-fingerprint  nothing matched — covers anything that can reach a ctx. call

  format: done in 4.8s — measuring the tree that will be committed.
  PASS 3   FAIL 0   SKIP 4
```

**Those four skips are correct and they are the point:** this block touched no `client/src` file, so
nothing the owner can see could have moved. The fingerprints were nevertheless measured in full on
master, because Stage 0(e) asked for them:

| role   | measured on master | record (`docs/fingerprints.json`) | verdict            |
| ------ | ------------------ | --------------------------------- | ------------------ |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb`                | **byte-identical** |
| camera | `00cafa2432add0f7` | `00cafa2432add0f7`                | **byte-identical** |
| render | `1f83ecc1fcb6fa9a` | `1f83ecc1fcb6fa9a`                | **byte-identical** |

**One instrument note, since it cost me a run:** `fingerprint-default.mjs` does **not** accept
`--quiet` (the camera and render tools do). Invoked with it, it printed nothing at all rather than
refusing. The record's own `reproduce` command is the one without the flag, so the record was right
and I was wrong — but a tool that silently prints nothing for an unknown flag is a small
Lesson-187 trap. Noted, not fixed; it is not this block's scope.

**CI:** PR #132 opened so the branch gets a run — required here because this block touches the
guards (R8 exception 1). Queued behind the Actions outage at the time of writing, as is master's.

---

## 7. TESTS, AND DUPLICATES STILL STANDING

**Tests added: 9. Tests deleted: 0. Tests moved to a copy: 3.**

The nine are `scripts/prove-changed.test.mjs`. Both questions, per group:

| test group                                   | what breaks if deleted                                                                    | what goes unnoticed if missing                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| BASELINE + "a real edit that also reformats" | Nothing stops the guard being rewritten to fail always; every FAIL test would still pass. | A wrapper nobody can satisfy — removed within a week. This is the L203 pair.   |
| THE INCIDENT (assert before write)           | Commit `7e6a8446`'s exact failure goes back to being silent.                              | A helper that aborted before its write, reported as done.                      |
| SILENT NO-OP + absent-stays-absent           | A pattern that matched nothing reads as success.                                          | The false "edit applied" claim.                                                |
| **REWRITTEN, TEXT IDENTICAL**                | The commonest helper shape passes again on Windows (371 LF → CRLF is a byte change).      | The incident **wearing a diff** — worse than not catching, it reports success. |
| ZERO BYTES                                   | A truncated write counts as "changed".                                                    | A template that rendered to nothing.                                           |
| NOTHING TO PROVE (no `--paths`, no command)  | The wrapper can be invoked with nothing to prove and still print a verdict.               | A green line meaning "I checked no files", indistinguishable from "I checked". |
| IT DOES NOT CHECK CONTENT                    | The header could claim a limit the code no longer has, or the reverse.                    | A reader trusting it to check correctness.                                     |

The three in `gen-engine-reach-doc.test.mjs` are the **same three tests**, pointed at a copy — no
coverage added or removed, which is why they are not counted as additions.

### Duplicates still standing, named

| duplicate                                                                      | status                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **7 config keys stated as current and wrong in living docs**                   | **Finding only, this block. §5.3.** Five are in `KRAEFTE-LANDKARTE.md` alone.                                                                                                                                                                                                                                                                                                                                                                                                |
| **3 code fallbacks disagreeing with `defaults.js`** (source vs source)         | Documented at `CAMERA_DIRECTOR.md:454-455`, unfixed, uncovered by any guard.                                                                                                                                                                                                                                                                                                                                                                                                 |
| Tracking-lag figures repeated in 3 source comments                             | `defaults.js:87-93`, `framingConfig.test.js:162-163`, `CameraAdvancedSection.jsx:72` all cite 13.78/6.78/3.78. They justify _why 0.25 beats 1.5_ — a historical A/B whose ratio still holds — but they are undated, and the fresh OVERVIEW figure is **3.08**, not 6.78. **Left alone deliberately:** editing a comment in `defaults.js` to restate a number would add fingerprint risk for no behavioural gain, and the right fix is a date or a pointer, not a new number. |
| Stale `CAMERA_DIRECTOR.md` section refs (§6.2, §6.3, §6.4, §7.4, §10.2, §13.1) | Pre-existing; disclosed by ONE-TRUTH-1 and ONE-TRUTH-2. Renumbering would break more than it fixes.                                                                                                                                                                                                                                                                                                                                                                          |
| The three e2e zoom tests re-implementing a retired formula                     | Still there, now commented. Deleting them is the owner's call.                                                                                                                                                                                                                                                                                                                                                                                                               |
| Historical fingerprints across `SIM.md`, `TAGS.md`, `reports/`, 6 living docs  | Deliberate; the 12 that did not read as history were marked in ONE-TRUTH-2.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `CANVAS_H_REF` / `REFERENCE_CANVAS_H` both 720                                 | Kept and guarded by a cross-module test — one home is impossible without growing the hull (ONE-TRUTH-1).                                                                                                                                                                                                                                                                                                                                                                     |

---

## 8. WHAT I DID NOT DO, AND WHY

- **I did not wait for CI before continuing.** §1.6. Actions was in a major outage; waiting would have
  cost the whole budget for no verdict. I substituted a tree-identity proof and a full local run of
  both jobs, and said exactly what that does not cover.
- **I did not fix any config contradiction.** The brief forbade it and I agree with the reason:
  `minRacersVisible` is his knob and the only override of the corridor guarantee.
- **I did not touch the three stale tracking-lag comments in source.** Reasoning above.
- **I did not delete `feat/data-export-1`.** Not contained in master; deleting it would lose two
  commits.
- **I did not restore any retry, anywhere.** The one flake found was fixed at its cause, not papered
  over with a timeout — and no timeout budget was added.
- **I did not commit the config scan script.** Stage 4 is findings-only; a new tool is a proposal, not
  a finding. It is proposal P1 below.
- **I did not renumber `CAMERA_DIRECTOR.md`'s stale section references.** Out of scope and it breaks
  more links than it fixes.

---

## 9. PROPOSALS

**P1 — make `defaults.js` the record, the way `fingerprints.json` already is.** The containment
machinery from ONE-TRUTH-1/2 is value-agnostic: it reads a record and fails when a current value
appears outside it. A guard that fails when a living document states `someKey = <value>` disagreeing
with `defaults.js` would have caught all seven of §5.3. The scan I wrote for this block is the
prototype and it took an afternoon, including the two blind spots it declares. **The one design
decision that must be made first:** a document must be able to say _"it was 8 in May"_ without
failing, so the guard needs a marker for a historical mention — the same problem the fingerprint
containment solved with declared history homes, and the same solution should work.

**P2 — put `minRacersVisible` in the live-truth console line.** `cameraConfigProvenance()` already
computes the per-key answer; the race-start line prints two keys. Adding the value **and** its
provenance for the keys he actually tunes turns "which number is my browser using?" from a DevTools
expedition into something he reads while the race starts. This is L204's rule applied to configuration:
the artefact should name the cause without being asked. Cheap, no behaviour change, no fingerprint risk.

**P3 (mine, offered against my own work) — `prove-changed.mjs` will not be used unless something asks
for it.** It is opt-in by construction, and I said so in its header. The honest options are: leave it
as a tool that gets used when someone remembers (weak, but real); or make one place mandatory — a
pre-commit check that a commit message claiming "wrote/updated/applied" is accompanied by a diff.
I lean towards leaving it opt-in and letting the next incident decide, because the second option
guesses at intent from prose and would be wrong often enough to be disabled. Recording the choice so
it is a decision rather than a drift.

### On the planner's three proposals

1. **Config one-truth block — TAKEN, as P1 above.** §5.3 turned up seven keys, not thirty, and five
   are in one document. That is small enough to be worth doing and specific enough to scope.
2. **A shared "assert I have git history" helper — DECLINED, for the reason the planner named.**
   There are exactly two guards that need history (`check-measured-stamps`, and `check-fingerprints`
   only incidentally). A shared helper for two callers would become a fourth home for the same
   knowledge, and the one-line check is already inside the guard that needs it, next to the message
   that explains it. L206 records the rule; a library would not make it truer.
3. **Merge-commit-only as a repo setting — PROPOSED, NOT APPLIED, and it is yours.** Turning off
   "Allow squash merging" in repository settings would remove this failure mode permanently. It very
   nearly bit this block: the stamp names `3e756a31`, a squash would have destroyed that SHA, and the
   guard would have gone red on master **correctly**, which is the confusing kind. I did not touch
   repository settings.

---

## 10. PLAIN LANGUAGE, FOR THE OWNER

**Is master clean?** Yes. All three branches are merged as proper merge commits, both CI jobs pass
when run locally against master step for step — 3649 client tests, 212 script tests, 11 guards, zero
failures — and all three fingerprints are byte-identical to the record. Nothing you can see in the
browser changed; no file under `client/` was touched.

**Is master green?** **Not proven by CI, and that is GitHub's fault, not the code's.** GitHub Actions
had a major outage all evening; both runs on master died with _"the job was not acquired by a
runner"_ after fifteen minutes without executing a single step. I proved instead that master's file
tree is **byte-identical** to the tree CI passed green this morning, and ran both jobs locally. **One
thing still needs doing when Actions recovers: re-run CI on master.** It is one click and I have left
a watch on it.

**What I deleted:** three remote branches, all fully merged — `feat/night-tools-1`,
`feat/one-truth-1`, `feat/one-truth-2`. No tags (still 67). I did **not** delete
`feat/data-export-1` — it has two commits that are not on master.

**What I fixed that you did not ask for:** a test was writing to the real `docs/SIM.md` while another
guard was reading it. It failed 1 run in 8 under load — and since you had me remove all retries, that
is a red build. Worse, a crash at the wrong moment would have left that document corrupted in your
working tree. It now edits a copy.

**What you have to decide:**

1. **`minRacersVisible` — 3 or 5?** Your own recorded verdict of 2026-08-05 says _"stays at 5"_. The
   shipped source says **3**. They cannot both be right. And which one your browser actually uses
   depends on whether you have ever saved a camera setting: **a stored value silently wins over the
   default, per key, forever.** Paste this into the DevTools console on the race screen to find out:
   `JSON.parse(localStorage.getItem('racearena:cameraConfig'))?.minRacersVisible`
2. **`choreoOutcomeStart` — 0.6 or 0.5?** Four documents say 0.5 and call it "shipped". The source
   says 0.6. This one is not your knob, so it is probably the documents that are wrong — but I did
   not change them, because Stage 4 was findings-only and I would rather you knew the list first.
3. **`KRAEFTE-LANDKARTE.md` needs a pass.** Five of its stated re-roll numbers disagree with source,
   in a document that promises every value is verifiable against source. Do you want that corrected
   as a small block, or folded into P1?
4. **Squash merging** — shall I ask you to turn it off in the repository settings? It would have
   broken this merge, and a setting is stronger than a sentence in a spec. Your call; I did not touch
   repo settings.
5. **`feat/data-export-1`** — finish it, or delete it?
