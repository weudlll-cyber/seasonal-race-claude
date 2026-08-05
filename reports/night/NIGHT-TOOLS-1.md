# NIGHT-TOOLS-1 — instrument truth (unattended)

**Branch** `feat/night-tools-1` off master `e3437a75` · PR #129 · **CI green: run `31053589904`**
Five commits, pushed at every stage boundary. Nothing visible to the owner's eye changed.

---

## 1. Build-vs-spec conformity, element by element

| element | asked | delivered |
|---|---|---|
| A · print which files/tests retried, attempts, exit status | yes | yes — file, test name, attempt count, final state, and vitest's own `flaky` flag |
| A · explicit zero line | yes | yes |
| A · survives into verify AND CI | yes | yes — reporter loaded by vitest, so both; `verify` also surfaces it on a GREEN run |
| A · consequence test | yes | yes, plus two sabotages |
| A · record tonight's retries, change no timeout | yes | 1 test, 1 file, 2 attempts (§4). No timeout touched |
| A · decide reporter vs wrapper, justify | yes | reporter (§3.1) |
| C · state which direction is checked TODAY, from source | yes | FILE → INDEX only (§3.2) |
| C · add missing direction, sabotage both separately | yes | yes, both exit 1, both reverted |
| C · guard states what it does not check | yes | five items in its header |
| B · capture the table verbatim first | yes | `captures/B-ceremony-table-BEFORE.md` |
| B · generate the column; no hand-typed durations remain | yes | **zero** remain, incl. the prose "About two minutes" |
| B · guards print machine-readable runtime | yes | `[ra-elapsed-ms N]` |
| B · when / which commit / which machine | yes | in the generated block |
| B · prove it is generated, then revert | yes | +3 s on check-tags → row 1 s → 4 s → reverted |
| B · staleness decision, threshold named in the artifact | yes | 40 commits, warns, names itself (§3.3) |
| B · start the guard run before D and E | yes | ran during D |
| D · findings only, per-finding fields, severity | yes | `D-pixel-audit.md`, 4 findings |
| E · evidence not impression; per-doc LAST TRUE AT; three defect kinds | yes | `E-doc-audit.md` |
| E · answer "one truth, two homes" explicitly | yes | four homes (§3.5) |
| E · correct mechanically provable stale numbers | **none existed** | §3.4 — checked, all current |
| verify, and report what it skipped | yes | §5 |
| CI on the branch | yes | run `31053589904`, success |
| one report at the end | yes | this file |

**Not done, and why:** ~20 documents were inventoried but **not read against source** (§3.4). The
brief's order put SIM.md and CAMERA_DIRECTOR.md first and the remaining time went there. This is the
largest surface the block leaves unexamined and it is stated in the findings file too.

---

## 2. Every sabotage, and its revert

| # | sabotage | result | reverted |
|---|---|---|---|
| 1 | retry ledger stops reading `retryCount` (v1) | 4 of 6 guard tests fail | yes, 6/6 |
| 2 | same, after the v4 rewrite | 5 of 7 fail | yes, 7/7 |
| 3 | check-index: an orphan report present | exit 1, names the orphan, **no** dangling error | yes, exit 0 |
| 4 | check-index: index links a missing report | exit 1, names the ghost, **no** orphan error | yes, exit 0 |
| 5 | check-tags burns +3 s, ceremony regenerated | its row moved 1 s → 4 s | yes, honest table restored |

3 and 4 were run **separately** on purpose: both directions share one exit code, so a combined
fixture would pass if only one half worked.

---

## 3. Every decision I made alone

### 3.1 A reporter, not a `verify` wrapper
Two reasons, and the second is decisive. **Only vitest has the data** — a wrapper would have to parse
the human summary, an instrument reading another instrument's prose. And **CI never goes through
`verify`**: `ci.yml` runs `npm run test:coverage` directly, so a wrapper would print nothing there,
failing the brief's own requirement. It lives in `scripts/` because this block may not touch source.

### 3.2 The API was probed, not assumed — and my first draft was wrong
I wrote the reporter against `onFinished(files)` and vitest's task tree. **Neither exists in vitest 4
and it printed nothing at all.** I probed the real shape (`onTestRunEnd(modules)`,
`children.allTests()`, `diagnostic().retryCount`) and rewrote. A reporter that silently emits nothing
is the exact failure it exists to prevent, so how the shape was established is now in its header.

### 3.3 Staleness threshold: 40 commits, warn, never fail
The inputs to the cost table only move when a guard's *work* changes — more tracks, more frames, more
sample points — which has happened every 30–50 commits here. Shorter cries wolf on doc-only days;
longer and the render row would have gone stale again unnoticed after FINISH-WINDOW-1 extended its
run. It **warns**: a stale cost misinforms, it does not break anything. The threshold names itself in
the generated block, as required.

### 3.4 Nothing in E was repaired
The brief permits correcting mechanically-provable stale numbers. **I found none** — every fingerprint
claim in every live document is current. The GONE script names would have needed prose rewriting,
which the brief forbids in D and E. So E is findings only, by both rules.

### 3.5 "One truth, two homes" — the answer is four
`SIM.md`, `SHIP-CEREMONY.md`, `REBASELINE.md` and `CAMERA_DIRECTOR.md` all carry the current
fingerprints. The pair that most directly claim the same truth are **REBASELINE.md and
SHIP-CEREMONY.md**: the ceremony says REBASELINE's top block "is the canonical current baseline" and
then carries its own copy of all three hashes. They agree today only because I have been updating all
four by hand every day this week — which is exactly what stage B just removed from the cost column.

---

## 4. Tonight's retries, for the record

One test retried, across the full suite:

```
RETRY LEDGER: 1 test(s) needed more than one attempt (1 eventually passed — vitest calls those FLAKY).
  src/modules/sim-fairness.test.js — 2 attempts, final passed (flaky):
      runSingleRace > different seeds → (usually) different winners
```

**That is the same test that failed under contention in VERIFY-FAST-1.** The BEFORE capture of the
identical run says only `3645 passed`. No timeout was changed, per the brief.

---

## 5. Verification

`npm run verify` chose, and skipped with reasons:

| guard | |
|---|---|
| doc-guards | **ran**, pass (1.0 s) |
| script-suite | **ran**, pass (1.5 s) — 161 tests |
| client-suite | skipped: "nothing under `client/src/` changed" |
| world / camera / render fingerprints | skipped: nothing in the engine hull, nothing in `modules/camera/`, cannot reach a `ctx.` call |

**A gap in my own tool, found by using it:** `client/vitest.config.js` DID change (stage A wires the
reporter), and `verify` skipped the client suite because its `isClient` matcher only looks at
`client/src/`. A config change alters how the whole suite runs. **Coverage was not lost tonight** — I
ran the full suite manually in stage A — but the routing is wrong and it is the third time this
matcher has been too narrow. Recorded, not fixed: it is a change to the verify path and this block
already touches it.

**CI on the branch: run `31053589904`, success, 3m38s.** World `dc4647be0f55ebdb` unmoved by
argument, not by running it: nothing in the 19-file engine hull was touched. The hull itself
(`scripts/engine-reach.mjs`) was not modified.

---

## 6. Tests added and deleted

**Added 11. Deleted 0.**

| test | what breaks if deleted | what goes unnoticed if missing |
|---|---|---|
| ledger: zero line (1) | the zero case could become silence, and a missing ledger would read as "all fine" | a reporter dropped from the config |
| ledger: names file/test/attempts (1) | the off-by-one (retries vs attempts) returns | a ledger that prints but says nothing useful |
| ledger: **consequence pair** (1) | a hard-coded ledger would pass every other assertion | that the ledger is not reading anything |
| ledger: failed-after-retries (1) | exhausted retries drop out of the count | the worst case, silently |
| ledger: multi-module aggregation (1) | one file's retries hide another's | a suite-wide count that is really one file's |
| ledger: unreadable module is skipped (1) | a reporter throw takes the run's exit code with it | a reporting bug masquerading as a test failure |
| ledger: malformed input (1) | crash on an unexpected shape | a vitest upgrade breaking the run, not just the ledger |
| check-index: dangling entry fails (1) | direction 2 is gone | an index link to a 404; nothing else reads INDEX.md targets |
| check-index: healthy passes both (1) | the failure above stops being attributable | a guard that fails on everything |
| check-index: directions independent (1) | one broken half hides behind the shared exit code | half the guard silently dead |
| check-index: pathed links ignored (1) | it starts duplicating check-doc-links | a second home for the docs/ link set |

---

## 7. Proposals

**P1 — the fingerprint tables should be generated, exactly as the cost column now is.** Four
documents carry the current hashes and they agree only because one person updated all four by hand
this week. The mint already produces the number; a `gen-fingerprint-refs.mjs` writing marked blocks
in SIM/SHIP-CEREMONY/REBASELINE/CAMERA_DIRECTOR would make drift structurally impossible. This is the
same defect stage B removed, one level up, and it is the highest-value thing this audit found.

**P2 — `verify`'s `isClient` matcher should be `client/` , not `client/src/`.** Tonight it skipped
the client suite while `vitest.config.js` changed. One line, but it is a change to the verify path
and therefore needs CI-green-first per R8 — which is why I did not make it at 3 a.m. inside a block
that already edits that file.

**P3 (planner proposal 3, and I am declining it as specified).** A per-document "last verified
against commit X" stamp could not be *generated* — verification is a human reading, and a generator
could only stamp *when a file was last touched*, which is not the same claim and would be worse than
nothing. The brief said to skip it if it cannot be generated cheaply. It cannot. **Declined.**

**Planner proposal 1: taken** (explicit zero line). **Planner proposal 2: no candidate** — CAMERA.md
was retired because a better document owned the subject; nothing here is in that position (§4 of the
E findings).

---

## 8. In plain language — which documents can you trust this morning

**Trust, checked against source last night:**
- **SHIP-CEREMONY.md** — and its cost column is now generated, so it cannot go stale by hand again.
- **CAMERA_DIRECTOR.md** — accurate, *but* you cannot run a camera check from it alone: it names the
  scripts and what they are blind to, and never a single flag or a line of output.
- **REBASELINE.md, SIM.md, ARCHITECTURE.md, TAGS.md** — every fingerprint they quote is correct.
- **DEAD-ENDS.md, VERIFY-RULES.md, LESSONS.md** — checked for hashes and script names only; clean
  apart from LESSONS naming five deleted scripts inside historical stories, which is arguably right.

**Trust with a caveat:**
- **SIM.md** does *not* completely describe the shipped world: it never names 8 of the 19 files the
  race core can reach, of which `raceBehaviorConfig.js`, `raceDynamicsConfig.js` and
  `autoSpriteScale.js` are real knobs, not plumbing.
- **BACKLOG.md and ARCHITECTURE.md** each point at a script that no longer exists, in a way that
  reads as a live instruction.

**Do not trust yet — not because they are wrong, but because nobody checked:**
`API.md`, `AUTH.md`, `SETUP.md`, `branding.md`, `AUDIT.md`, `DEPLOYMENT.md` and roughly fifteen
others. They were inventoried, not read. The oldest has not been touched since 9 June.

**And one correction to the brief itself:** the pixel audit's "confirmed starting point",
`_DEFAULT_OVERVIEW_OFFSET_PX = 150`, **does not exist** and has not since commit `74bf88b1`. It was
working from a remembered inventory rather than from the tree.
