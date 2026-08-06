# ONE-TRUTH-1 — one fact, one home

**Branch** `feat/one-truth-1`, stacked on the unmerged `feat/night-tools-1` (PR #129). PR **#130**,
opened as a draft so CI ran on the branch while the later stages were still being built.
**Commits** `594ec1f8` (stage 1) · `6d3099c5` (stage 3) · `c300f0ac` (a fix to my own stage-2 work) ·
`c0c17df1` (stage 4) · `09727abd` (stage 5) · `367a2e58` (stage 6).

---

## 0. CONFORMITY — the block's own constraints, answered first

| Constraint                                                                | Result                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Never modify the engine-reach hull (`scripts/engine-reach.mjs`, 19 files) | **The script is untouched.** One hull FILE was edited — `autoSpriteScale.js` — to add `export` to an existing constant and a comment. No import added, no value changed. Closure re-run: **still 19 files**; `engine-reach.test.mjs` 6/6. |
| Nothing may change what the owner sees in the browser                     | **Nothing does.** The only shipped-source edit is the `export` keyword above. Everything else is documents, scripts, tests and CI.                                                                                                        |
| World, camera and render fingerprints byte-identical                      | **All three re-run at the end and all three unchanged.** See §1.                                                                                                                                                                          |
| A change visible to his eye is a finding, not an edit                     | Two were found and left as findings — the e2e zoom tests and the CAMERA_DIRECTOR section numbering (§6).                                                                                                                                  |

### The three fingerprints, measured — not remembered

|        | value              | when                                                                          |
| ------ | ------------------ | ----------------------------------------------------------------------------- |
| world  | `dc4647be0f55ebdb` | run twice: at `c300f0ac` (stage 4) and again after the stage-6 hull-file edit |
| camera | `00cafa2432add0f7` | run at `c300f0ac` and again at the end                                        |
| render | `1f83ecc1fcb6fa9a` | run at `c300f0ac` and again at the end                                        |

The pre-commit mint tripwire fired on the stage-6 commit and named `autoSpriteScale.js` — correctly,
and the mint had already been paid.

**Which numbers in this report are machine-produced and which are typed.** Every fingerprint, every
test count, every retry statistic in §2, the 19-file closure and the tracking-lag table were produced
by running something and are quoted from its output. The _durations_ (~223 s, ~7 min) are single
wall-clock samples on a loaded desktop and are order-of-magnitude only. Nothing in this report is
recalled from memory.

---

## 1. Stage 4 — the main one: the fingerprints get ONE home

`docs/fingerprints.json` is now the single source of record. Per role: the value, the commit it was
minted on, the block that minted it, the date, and the command that reproduces it.

**The problem, stated as measured:** the three values were typed independently in **eleven places
across seven files**, connected by nothing. They had already drifted in exactly the way that
predicts — SHIP-CEREMONY carried a stale camera baseline until a block happened to look at it, and
its render row was current only because the block that wrote it had just touched that row. A number
corrected only where somebody happens to be looking is not a record.

**Seventeen sites at stage 4, nineteen after stage 5 found two more.** All are now written by
`node scripts/check-fingerprints.mjs --fix` and checked by the same script.

### The guard has three directions, and the third one is the interesting one

- **RECORD → DOCUMENT** — every declared site must carry the record's value.
- **DOCUMENT → RECORD** — every site must still EXIST and its anchor still be unique. If prose is
  reworded around a value, the site stops being checkable, and the guard says so rather than quietly
  checking nothing. This is the direction whose absence let the verify map stay wrong three times.
- **COVERAGE** — any tracked living file carrying a current value must be a declared site or declared
  history. A new document that starts stating the fingerprint without being wired up is invisible to
  the other two directions.

**A fourth direction was built first and DISCARDED**, and the reasoning is worth keeping. A
superseded-value scan is unsound in this repository: living documents legitimately state old values
as **ablation targets** ("set to 0 → restores `ded0a126048e4cdb`") and as **narrative** ("a
camera-only diff moved this hash `b6591e74…` → `1f83ecc1…`"). Those are current, true and useful.
A guard failing on them would have to allowlist ARCHITECTURE.md and SHIP-CEREMONY.md — the two files
that matter most — which is a guard that checks nothing. Lesson 187 from the other side.

### The canonical claim, resolved

Three documents implied they owned this fact. They now divide it explicitly, stated in the record and
in the ceremony:

| home                           | owns                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `docs/fingerprints.json`       | the CURRENT VALUES. Nothing else does.                                                               |
| `docs/SIM.md`                  | the LINEAGE — which change moved which value to which. History; free to name every superseded value. |
| `reports/parity/REBASELINE.md` | the measured BASELINE STATISTICS behind the current world.                                           |
| `docs/SHIP-CEREMONY.md`        | the PROCEDURE for minting.                                                                           |

### One honest gap in the record

`world-off` (`854018ee5d3d83e1`) is in the record, but its `reproduce` field reads **UNKNOWN**: the
flag that regenerates it is written down nowhere this block could find. It is therefore a _remembered_
number, not a reproducible one. It is guarded for AGREEMENT across its two sites, which is all a
record can do for a value nobody can re-derive. Recorded as such rather than papered over — and see
proposal P1.

---

## 2. The other stages, briefly

### Stage 1 — closing NIGHT-TOOLS-1's open points, including a self-correction

**My own NIGHT-TOOLS-1 report was wrong about one thing and this block found it.** A Python `assert`
aborted before a file write, so the check-index header edit I reported as done had never landed. The
claim was corrected and the edit applied. The same trap bit again during stage 4 and was caught the
second time only because I checked the write instead of the script's exit.

### Stage 2 — the retry ledger learns to say WHY

Each attempt now carries a **reason class**: `timeout | assertion | process | error`, or the literal
`reason unavailable` — never a blank, because a blank reads as "no reason" rather than "not
recorded". Per-attempt DURATION is **not** exposed anywhere in the vitest 4 reporter API; the ledger
prints the test's total and says so rather than inventing a split. This was probed against the real
API, not assumed.

### Stage 2(c) — the evidence run, and it changed what stage 6 did

Twenty full suite runs: **10 ALONE, 10 CONTENDED** (the contended arm reproduces the _pre_-fix
profile — since VERIFY-FAST-1 the client suite runs exclusive, so today's `verify` has no contention;
the profile that ever failed is the one worth measuring).

|           | runs | suite FAILED | retried test-instances | exhausted all 4 attempts | reason classes |
| --------- | ---- | ------------ | ---------------------- | ------------------------ | -------------- |
| ALONE     | 10   | **3**        | 12                     | 4                        | timeout ×28    |
| CONTENDED | 10   | **10**       | 27                     | 17                       | timeout ×85    |

**The escalation question is answered: NO. Every one of the 113 attempt-failures across 20 runs was
class `timeout`. Not one assertion failure.** With fixed seeds, no result moved anywhere. Every
failure is a scheduling fact, not a correctness one.

The finding that mattered is the first column: **the suite was failing 3 runs in 10 even with the
machine to itself**, and nobody knew, because `retry: 3` had been absorbing it since long before this
branch and the ledger that reveals it only exists on this branch. Two tests dominated (24 and 11 of
39 instances); both are fixed in stage 6.

### Stage 3 — the verify routing is ONE table

Five scattered predicates became one exported `ROUTES` table; `plan()` is derived from it, so a guard
cannot exist without a route. Every SKIP now names the rule it came from, so the map is visible
without reading the code. The table also states which paths it routes NOWHERE.

**My own test caught my own over-broadening.** Widening `client/src/` to `client/` made an e2e spec
select the vitest suite — which excludes e2e entirely. Narrowed to `client/` minus `client/e2e/`.
Widening a matcher can overshoot as easily as it can miss.

### Stage 5 — the engine reach and the camera check stop being remembered

`docs/SIM.md` now carries a **generated** table of the 19 files that can change the race, each with a
one-line purpose taken **from the file's own header**. Three header styles exist here and all three
are read. One file — `camera/lapUtils.js` — reads **UNKNOWN**, verbatim and deliberately: a plausible
sentence written by the generator would be indistinguishable from a fact and nobody would ever fix
the file. Give the FILE a header and the table improves by itself.

`docs/CAMERA_DIRECTOR.md` gained a camera-check section of four commands, **every one of which was
actually run**, with what it answers, what it printed and what it cost. The expected fingerprint
values are deliberately NOT restated there — restating them would have made the twelfth hand-typed
copy.

**FINDING — the tracking-lag figures had drifted, and the drift reverses the reading.** The document
stated "LEADER 2.05 pp, OVERVIEW 6.78 pp, others pooled 3.78" as CURRENT. Running the command it
cites gives **LEADER_ZOOM 4.46, OVERVIEW 3.08, others pooled 4.86**. The camera moved twice since
(FINISH-MOTION-1 and FINISH-COMPANY-1 both moved the camera fingerprint), the figures did not follow,
and no guard could notice because a prose number has no home. **OVERVIEW is now the TIGHTEST state,
not the loosest** — the opposite of what the old figures supported. Replaced with today's, carrying a
date and a commit.

---

## 3. SABOTAGES — every guard shown able to fail

| #   | Sabotage                                                                  | Result                                                                 |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Move one document's fingerprint (`docs/FAIRNESS.md` → zeros)              | FAILS, naming both values. Reverted.                                   |
| 2   | Move the RECORD's camera value, documents untouched                       | FAILS at **all four** camera sites. Reverted.                          |
| 3   | Move `docs/SIM.md`'s camera value (a stage-5 site)                        | FAILS; `--fix` repaired it.                                            |
| 4   | Reword prose so an anchor is GONE                                         | FAILS with "is GONE" — does not silently check nothing.                |
| 5   | An anchor matching twice                                                  | FAILS — "matches 2 times", it no longer identifies one value.          |
| 6   | A new file stating a current value, declared nowhere                      | FAILS (coverage). Paired: it PASSES once declared as history.          |
| 7   | A record with zero sites / unreadable record / a role with no mint commit | All three FAIL loudly.                                                 |
| 8   | Hand-edit the generated SIM.md block                                      | `--check` FAILS "OUT OF DATE". Paired: re-padding a table cell PASSES. |
| 9   | Fill in the generator's `UNKNOWN` by hand                                 | `--check` FAILS.                                                       |
| 10  | `CANVAS_H_REF` 720 → 721                                                  | The cross-module guard FAILS. Reverted, passes.                        |
| 11  | Restore the old `client/src/` verify matcher                              | 13/14 — the config-file test fails. Reverted, 14/14.                   |

Sabotages 1–3, 10 and 11 were run against the **real repository** and reverted; the rest are automated
and drive the guards as real processes against throwaway trees.

---

## 4. TESTS — added, replaced, deleted

**Added: 27** (11 fingerprint-record, 10 engine-reach-doc, 6 verify routing). **Replaced: 1.
Deleted: 0.**

### The one replacement, with both questions answered

`trackLights.test.js` — `expect(LIGHT_SPACING_PX).toBe(30)`.

- **What would break if it were deleted?** Nothing. No behaviour was pinned by it.
- **What did it protect?** Only itself. The single way to fail it was to change the constant, and the
  single correct response was to edit the number here to match. A test whose failure has exactly one
  correct fix — edit the test — is a copy of the value, not a check on it.

It now asserts the **consequence**: the constant is the interval the boundary sampler is actually
driven at, and halving it doubles the lights. A second literal `30` a few lines above now reads the
constant too. Writing the expected count as `floor(d/s)+1` failed on first run — the sampler excludes
the endpoint at exact multiples. The arithmetic was mine, not the code's, and the correction sits at
the assertion.

### One test I had to fix because it was the wrong SHAPE — twice, both mine

- `retry-ledger-reporter.test.mjs` used `deepEqual` on a whole row, so stage 2's two honest new fields
  broke a test with no opinion about either. **I committed stage 3 with this failing** — the script
  suite printed 168/169 in the same command as the commit and I read the commit line, not the count.
  Rewritten as property assertions.
- `check-fingerprints.test.mjs` pinned `"17/17 sites"` as a literal and failed the moment stage 5
  declared two more sites — failing for being right. Now derived from the record.

Both are the same defect as the `trackLights` one, committed by me on the same day I removed it.

---

## 5. Stage 6 — one home where there can be one, a guard where there cannot

**The CANVAS reference height was NOT collapsed, and the reason is structural.**
`autoSpriteScale.js` states `CANVAS_H_REF = 720`; `camera/projection.js` states
`REFERENCE_CANVAS_H = 720`. Importing one from the other is the obvious fix and it is the wrong one:

1. `autoSpriteScale.js` is **inside the engine reach**. Importing from `camera/` would pull the
   projection module into the 19-file closure the mint tripwire routes on, changing what every future
   block is asked to mint for. The hull is not mine to grow.
2. It would breach the camera's one-way rule: the camera imports from the modules, never the reverse.

So the duplicate is **kept and guarded**: the constant is exported (no behaviour, no new import) and a
cross-module test asserts equality, with a type and positivity check so it cannot pass by both being
undefined. This is the block's thesis meeting a real constraint — where one home is impossible, one
guard is the honest substitute, and the reasoning lives at the constant.

**Two flaky tests fixed with MEASURED budgets.** Driven entirely by §2(c)'s evidence:

| test                                                 | what it does                                    | measured                                            | now              |
| ---------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | ---------------- |
| `buildIdentityReason.test.js`                        | spawns ~a dozen git and node processes per case | ~5 s idle, ~13 s under suite load, vs a 5 s default | file-scoped 30 s |
| `sim-fairness` "different seeds → different winners" | runs TEN full ten-racer races                   | sat just under 5 s idle, over it under load         | per-test 30 s    |

**Full client suite after: 179 files, 3646 tests, ZERO retries — the first clean-first-attempt run.**
Before: 1 failed, and 3 runs in 10 red.

---

## 6. WHAT WAS NOT DONE, and why

- **The three e2e zoom tests were not deleted.** They re-implement the zoom formula inside
  `page.evaluate` and assert their own arithmetic; they navigate to `/` and never reach the app's zoom
  code, and would still pass if `zoomUnit.js` and `projection.js` were deleted from the repository.
  That is the `trackLights` defect wearing an end-to-end test's clothes, which makes it read as
  coverage it does not provide. Their four constants were collapsed to one `ZOOM_CONSTANTS` (verified
  by `playwright test --list`: 31 tests still discovered), but **deleting three tests is the owner's
  call**, not an unattended block's.
- **`CAMERA_DIRECTOR.md` has two sections numbered 7**, and BACKLOG/LESSONS reference §6.3, §6.4 and
  §10.2, which no longer exist. Renumbering would break more references than it fixes. My new
  subsections are therefore **unnumbered**, so they collide with nothing.
- **The SIM.md lineage's newest entry is not checked.** Declaring SIM.md a site file exempts the rest
  of it from the coverage scan, which is what lets the lineage name superseded values. A guard cannot
  tell a stale "latest" row from an honest historical one.
- **`docs/BACKLOG.md` and `docs/ROADMAP.md`** state the current world in a shared banner; both are
  declared sites, but nothing checks the _rest_ of what those banners claim.
- **The tracking-lag figures are still hand-copied.** Generating them means a seven-minute measurement
  in the documentation loop, which is more than a doc guard should cost. They now carry a date and a
  commit — the minimum a remembered number owes.
- **`reports/night/NIGHT-TOOLS-1.md` is in no index**, and neither was this file until its INDEX entry
  was added. `check-index` scans `reports/evolution/` only, so the whole `reports/night/` directory is
  outside every guard.

## 7. Remaining duplicates, named

| fact                                 | copies                                 | status                                                           |
| ------------------------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| world / camera / render fingerprints | 19 sites                               | **written and checked by machine**                               |
| `world-off` fingerprint              | 2 sites                                | checked for agreement; **not reproducible** (P1)                 |
| reference canvas height 720          | 2 (`autoSpriteScale`, `projection`)    | **guarded**, cannot be collapsed (§5)                            |
| the zoom formula                     | app + 3 e2e copies → 1 shared constant | constants collapsed; the re-implementation remains, as a finding |
| tracking-lag figures                 | 1 (CAMERA_DIRECTOR)                    | dated and sourced, still typed                                   |

---

## 8. PROPOSALS

**P1 — establish how `world-off` is reproduced, or retire it.** It is the one value in the new record
that no command regenerates. Either somebody finds the flag and the record gains a `reproduce` line,
or the value should be moved into SIM.md's lineage as history and stop being presented as a current
invariant. A "current" number nobody can re-derive is the shape this whole block exists to remove,
and it is now the only one left in the record.

**P2 — give `reports/night/` the same guard as `reports/evolution/`.** Three reports and a captures
directory currently sit outside `check-index` entirely, so a night report can be orphaned or its index
link can dangle with nothing noticing. `check-index.mjs` already takes `--dir` and `--index`; the work
is a second invocation, not a new guard.

**P3 — a `--why` flag on `check-fingerprints`.** The guard knows which document states each value and
which commit minted it. Printing that map on request would answer "where is this number stated?"
without anyone grepping — the question that produced eleven copies in the first place.

**P4 — measure the suite's timeout headroom rather than waiting for the next flake.** Two tests were
sitting just under a 5 s default and both crossed it under load. A reporter pass that lists every test
within, say, 40% of its timeout would find the next one before it turns a suite red 3 runs in 10.
The ledger already has the durations; it is a threshold and a sort.

---

## 9. Verification

- `npm run verify` routing exercised via `--dry` and the 15 routing tests.
- **Script suite 191/191.** **Client suite 179 files / 3646 tests / 0 retries.**
- `check-fingerprints` 4 roles, 19/19 sites, 532 other files scanned — clean.
- `gen-engine-reach-doc --check` current. `check-doc-links` 333 links / 0 dangling.
  `check-index` 112 reports / 0 unindexed / 0 dangling. `engine-reach` 19 files, tests 6/6.
- **CI green on the branch** (run `31055468048`, PR #130) after stage 3; the stage 4–6 pushes follow.
- All three fingerprints byte-identical, quoted in §0.
