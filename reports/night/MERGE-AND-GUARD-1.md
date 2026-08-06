# MERGE-AND-GUARD-1 — merge what is ready, then the next one-truth target

**Branch:** `feat/one-truth-fairness` · **Base:** `master` @ `748145e7` · **Date:** 2026-08-06 (unattended)
**Still parked, deliberately:** `feat/min-racers-visible-5` @ `c57e37d4`

---

## 0. CONFORMITY — element by element, before any numbers

| Element of the brief                                             | Status                                                                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **0(a)** `workflow_dispatch` on ci.yml                           | **DONE** (`fe91057f`). **It worked** — it created a run where a push created none. §1.1.                                                  |
| **0(b)** request a run and report the verdict                    | **REQUESTED, TWICE. NO VERDICT.** Both died on runner acquisition. §1.1.                                                                  |
| **1(a)** merge #133 on a green CI verdict — PREFERRED            | **NOT AVAILABLE.** Actions still in major outage.                                                                                         |
| **1(b)** the authorised FALLBACK, with all three conditions      | **USED, all three held and are shown.** §2.1.                                                                                             |
| **1(c)** delete the branch, prove containment                    | **DONE.** `fe91057f` proved an ancestor of master. §2.1.                                                                                  |
| **2(a)** merge `feat/data-export-1`, merge commit, delete branch | **DONE.** `748145e7`. §2.2.                                                                                                               |
| **2(b)** RUN the export from master and report                   | **DONE — it works.** 247 files, 14.4 MB raw, **12.0 MB compressed**; `--minimal` drops exactly one file. §2.3.                            |
| **2(c)** stop if it does not work                                | **N/A** — it worked on the first run.                                                                                                     |
| **3** rebase merging off; report before/after; squash still off  | **DONE.** §3.                                                                                                                             |
| **4** park `feat/min-racers-visible-5`, record it in BACKLOG     | **DONE.** Not merged, nothing minted. §4.                                                                                                 |
| **5(a)** the fairness threshold gets one home                    | **DONE.** 19 restatements → **0**. §5.1.                                                                                                  |
| **5(b)** the track count                                         | **NOT GUARDED — reported as unbuildable, with the evidence.** The safe part was done instead. §5.2. **This is the stage's main finding.** |
| **5(c)** extend or add a guard, and sabotage it                  | **DONE**, `check-doc-facts.mjs`, sabotaged both ways. §5.3.                                                                               |
| **5(d)** the guard must never pressure a TRUE sentence           | **RESPECTED, and it bit three times.** Every near-miss reported. §5.4.                                                                    |
| **6(a)** write the 5(d) rule where it is read                    | **DONE** — `docs/VERIFY-RULES.md` **R11**. §6.1.                                                                                          |
| **6(b)** clear HIDDEN, add a writability check, state its limits | **DONE.** `check-writable.mjs`. §6.2.                                                                                                     |
| Never modify the engine-reach hull                               | **RESPECTED.** `engine-reach.mjs` untouched.                                                                                              |
| No race series                                                   | **RESPECTED.** Only the three fingerprints, which are gates.                                                                              |
| All three fingerprints byte-identical                            | **VERIFIED.** §7.                                                                                                                         |
| CI on the branch (this block touches ci.yml and guards)          | **REQUESTED, NO VERDICT.** Said plainly, not substituted. §7.                                                                             |
| One change per commit                                            | **Five commits; ONE deviation** — stage 4's BACKLOG entry landed inside the stage-5 commit. Noted rather than rewritten. §9.              |

**Decisions made alone:** using the authorised fallback rather than waiting out the outage (§2.1);
abandoning the track-count check (§5.2); yielding the guard to two sentences by name (§5.4); keeping
`check-writable` out of CI (§6.2); widening `check-config-claims` mid-block after the survey found a
claim it had missed (§5.5).

---

## 1. STAGE 0 — the CI hand crank

### 1.1 It works, and it still could not get a verdict

`workflow_dispatch` added to `ci.yml` (`fe91057f`). **Two runs were successfully created by hand** —
`31127388871` on `feat/config-truth-1` and `31127713761` on this branch — where before, pushes to
master had produced no run at all. That is the improvement, and it is real.

**Both then failed for the same reason as everything else today:**

```
X feat/config-truth-1 CI · 31127388871
Triggered via workflow_dispatch
JOBS
X Client checks in 15m1s
X Living-doc guards + script tests in 15m1s
ANNOTATIONS
X The job was not acquired by Runner of type hosted even after multiple attempts
```

`--log-failed` is empty: no step ran. githubstatus.com at 19:43 UTC — _"Capacity remains constrained
and jobs may still be delayed or fail while it recovers gradually."_ The hand crank fixes the "no
run was created" half of the problem. It cannot conjure a runner.

---

## 2. STAGES 1 & 2 — what merged

| #   | what                   | merge commit | parents                 | containment proof                                      | branch  |
| --- | ---------------------- | ------------ | ----------------------- | ------------------------------------------------------ | ------- |
| 1   | PR #133 CONFIG-TRUTH-1 | `a37788b7`   | `08bde75e` + `fe91057f` | `git merge-base --is-ancestor fe91057f master` → **✓** | deleted |
| 2   | PR #134 DATA-EXPORT-1  | `748145e7`   | `a37788b7` + `0325fb36` | `git merge-base --is-ancestor 0325fb36 master` → **✓** | deleted |

Both by `gh pr merge --merge`. **Two parents each** is the mechanical proof it was neither a squash
nor a fast-forward. No tag touched.

### 2.1 The fallback, and the three conditions it required

No CI verdict was obtainable, so the brief's authorised fallback applied. All three conditions were
established **before** the merge:

| condition                             | evidence                                                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full local run of the **docs job**    | 8 guards PASS (`check-doc-links`, `check-index` ×3, `check-tags`, `check-fingerprints`, `check-config-claims`, `check-measured-stamps`) + **228 script tests, 0 fail** |
| Full local run of the **client job**  | ESLint clean · Prettier clean · audit gate PASS · **179 files, 3649 tests, 0 fail**                                                                                    |
| All three fingerprints byte-identical | No `client/` file on the branch at all — so they could not have moved, and it was checked rather than assumed                                                          |
| The merge result is what was tested   | `master` was an ancestor of the branch, so the merge tree **is** the branch tree                                                                                       |

**The one thing local runs cannot cover, and it is the reason CI matters here:** `ci.yml` itself. No
local run executes the workflow file, and this block edited it twice. That debt is open (§7).

### 2.2 `feat/data-export-1`

Merged conflict-free (checked with `git merge-tree` first). Two commits: `fe40a8f8` adds
`scripts/data-export.mjs` and the `data:export` npm script; `0325fb36` adds `--minimal`.

### 2.3 (b) The backup tool RUN from master — it works

`npm run data:export --list` first (writes nothing), then the real thing:

```
  247 file(s) exist ONLY on this machine — 14.4 MB.
  12 file(s) (51.7 MB) are byte-identical to server/seeds and are NOT archived.

  WROTE racearena-data-2026-08-06-20-29-39.tar.gz — 247 file(s), 12.0 MB compressed (from 14.4 MB)
```

| question                                                            | answer                                                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Does it still run from master?                                      | **Yes**, first attempt, no errors.                                                                                                      |
| How many files, what size?                                          | **247 files · 14.4 MB raw · 12.0 MB compressed.** It also correctly skips 12 files (51.7 MB) that are byte-identical to `server/seeds`. |
| Does `--minimal` still exclude `sessions.sqlite`, and nothing else? | **Yes, exactly.** 247 → **246**, and `diff` of the two archive listings is a single line: `server-data/sessions.sqlite`.                |
| Against the documented 247 / 12.0 MB (planner proposal 2)           | **Identical.** No drift to report — his data has not grown and nothing stopped being archived. Proposal 2's condition did not arise.    |

Both test archives were **deleted** afterwards: they contain his real `users.json`, sessions and
brands, and a scratch directory is no place for them.

**One small finding, not fixed.** The tool warns when the output path is inside OneDrive
(`/onedrive/i.test(outPath)`). My scratch path contained "OneDrive" only inside a _session directory
name_ derived from the project path, so the warning fired on a path that is not in OneDrive. For his
real usage this is right — the DEFAULT output is `join(ROOT, "..")`, which genuinely is inside
OneDrive — so it is a false positive only in agent/scratch use. Left alone: it is his tool, it works,
and the fix would be a change for a case he does not hit.

---

## 3. STAGE 3 — rebase merging off

| setting              | before   | after                   |
| -------------------- | -------- | ----------------------- |
| `allow_merge_commit` | **true** | **true** (unchanged)    |
| `allow_squash_merge` | false    | **false** (still off ✓) |
| `allow_rebase_merge` | **true** | **false** ← the change  |

In words: **merge commits are now the only way into master.** Squash was disabled in the previous
block; rebase is disabled now, and it had the same defect — it rewrites every commit, so the SHA
`3e756a31` that a stamp in `docs/CAMERA_DIRECTOR.md` names would not have survived it either.

---

## 4. STAGE 4 — the parked branch, recorded not merged

`feat/min-racers-visible-5` (`c57e37d4`) is **untouched**: not merged, nothing minted. It is now the
**first item of a new BACKLOG section, "The owner's camera-defaults session"**, framed around his own
words — once the camera is finished, all camera defaults get set in one sitting.

**Why it belongs there rather than in a to-do list**, and this is the argument the entry makes: it
moves **two** fingerprints, the camera one and the **render** one, because
`scripts/render-fingerprint.mjs` builds a real `CameraDirector`. **Every camera-default change has
that property.** So one sitting can pay one ceremony — one re-mint of two fingerprints, one eye test
— instead of paying it per knob. The entry also records what is already measured, so the sitting does
not re-derive it: the world fingerprint does **not** move, and the full client suite passes.

---

## 5. STAGE 5 — the fairness threshold, and the check that could not be built

### 5.1 (a) One home, and the guard has no opinion

`band-reach ≥ 70%` was restated in **12 living documents, 19 places**. Now **0** outside
`docs/FAIRNESS.md`. The split matters:

| kind                                                                                               | what was done                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Definitions** — PROJECT-PRINCIPLES §8, RACE-ACTION ×3, DEAD-ENDS, SIM, CONCEPT-COHESION, BACKLOG | name the gate, link the home, state no threshold                         |
| **Measurements** — "B1/B2 band-reach ≥70% on all four tracks" ×6                                   | became "cleared the gate" — still true, still specific, no longer a copy |

**`FAIRNESS.md` also stopped deferring.** It called itself canonical while pointing at
PROJECT-PRINCIPLES §8 for the operational gate, and §8 stated the number — a two-home loop. §8 now
binds the RULE; FAIRNESS.md owns the NUMBERS, said in both files.

**The guard reads the threshold FROM FAIRNESS.md.** It has no opinion about what the number should
be — a test asserts exactly that: change it in FAIRNESS.md and the guard follows. That is what makes
FAIRNESS.md the home rather than the guard becoming a second one.

### 5.2 (b) The track count is NOT guarded — and that is the finding

I built the check the brief asked for, ran it, and it has to be reported **unbuildable**:

- **Round 1** — a bare `(\d+) tracks` rule fired on nine lines, and every one was a _subset_ used in
  an experiment: _"Gate: 400 races/arm, 4 tracks, paired seeds"_ · _"12 frozen night-sweep cells
  (4 tracks × 3 arms)"_ · _"It WIDENED the gap on all three tracks"_. Correcting any of them to ten
  would make a true sentence **false**.
- **Round 2** — narrowing to a stated TOTAL does not help, and this settles it: **`all four tracks`
  and `all 10 tracks` are the same construction.** The only thing that distinguishes them is knowing
  the total already. So the check is quiet today and, on the day an eleventh track is added, fires on
  the genuinely stale line **and** on every honest subset line. Silent when useless, noisy exactly
  when it matters.

**What was done instead**, smaller and safe: the sentences describing what a HARNESS does _now_ were
made count-free, so they cannot go stale at all. Measurements, ratios ("three of ten tracks") and
records keep their numbers. **The honest cost, stated in the guard's header:** if a track is ever
added, `10 tracks` / `ten tracks` must be grepped and read by a human. There is no coverage there and
the file says so.

**Planner proposal 3 — taken, and the answer was "no".** It asked whether a broader scan was worth
its false alarms. It is not, and I did not have to speculate: the narrow rule alone produced three.

### 5.3 (c) The guard, and its sabotages

| sabotage                                           | expected | result                                                                                                      |
| -------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| Restate the threshold in another document          | **FAIL** | Fails, naming file and line, and points at R11                                                              |
| Name the gate WITHOUT the number                   | **PASS** | Passes — the shape the rule actually wants                                                                  |
| Change the number in FAIRNESS.md                   | follows  | The guard tracks the home; it holds no copy                                                                 |
| A dated line / a self-declared HISTORICAL document | **PASS** | Both exempt, counted separately                                                                             |
| The YIELD list                                     | **PASS** | …and a second test proves the SAME FILE still fails on a different sentence — a yield is not a blank cheque |
| No FAIRNESS.md, no threshold in it, zero documents | **FAIL** | Loud, per Lesson 187                                                                                        |

All are tests, so none can quietly stop being true. Every fixture is a temp repo removed in a
`finally`; nothing tracked is written (L205).

### 5.4 (d) Where a guard nearly made a true sentence false — all three

**This is the stage's real content**, so every near-miss is listed:

1. **Two sentences whose SUBJECT is the threshold.** `docs/SIM.md`'s "Gate methodology" paragraph and
   Lesson 158 both exist to say _a hard ≥70% gate is a coin-flip for tracks whose band sits near 70%_
   — and that second 70% is a **measured** value that happens to coincide with the gate. Rewriting
   either would destroy the point. **The guard yields**, by name, with its reason, keyed on a sentence
   fragment rather than a line number. **Every yield is PRINTED on every run**, because an exemption
   nobody can see is indistinguishable from a guard that is not working.
2. **The track count**, above — abandoned rather than shipped.
3. **My own BACKLOG entry, caught by my own guard.** I quoted his verdict — _"`minRacersVisible`
   stays at 5"_ — with the date beside it, and **prettier's reflow moved the date onto the previous
   line**, leaving the value unexempted. The temptation was to widen the date rule; the correct fix
   was to write the date beside the number. `check-config-claims.mjs` now records this in its own
   limits: _the date and the claim must share a line, and prettier decides where lines break._

### 5.5 A correction to CONFIG-TRUTH-1, found while surveying

While counting what else lives in more than one document I hit
`` `referenceCorridorPx`, shipped at 300 `` — a real current claim that
`check-config-claims.mjs` had walked past, because the **comma** between the key and the verb broke
the adjacency its shapes required. Widening the shape turned up **eight more**, including a second
`choreoOutcomeStart, default 0.5` in `ARCHITECTURE.md` — the same wrong value CONFIG-TRUTH-1 fixed in
four documents and missed here.

**So that block's "94 → 0" was true of its guard and not of the repository.** The count was honest
about what it measured, and the guard's header did say a value "in a shape not listed above" was
invisible — that sentence has now been paid for once. All nine are fixed; it is 0 → 0 again by a
shape that sees nine more forms. One of them became better than a deletion:
`ARCHITECTURE.md:629` had been quietly documenting a **source-vs-source gap** (the shipped config and
the `DEFAULT_PHASE_FRACTIONS` raw fallback disagree), so the sentence now names that gap instead of
restating both numbers.

**A lexical guard has a long tail by construction, and I am not claiming to have reached its end.**

---

## 6. STAGE 6 — two hardenings

### 6.1 (a) R11, in `docs/VERIFY-RULES.md`

> **If a guard disagrees with a sentence, the GUARD is the first suspect.**

With both incidents that paid for it, and the corollary people skip: **abandoning a guard is a
legitimate outcome.** A check that can only be satisfied by damaging the documents is not a check,
and shipping it anyway to have built something is how a suite stops being trusted. It also requires
that every exemption be printed.

### 6.2 (b) `check-writable.mjs`

The ten HIDDEN files were cleared in the previous block; this adds the check that would have caught
them. **1470 tracked files in 0.8 s, 0 blocked** — which also confirms the earlier fix held.

**It checks the CAUSE, not the symptom, and that was measured:**

```
open 'r'  OK      open 'r+' OK      open 'a' OK      open 'w' FAIL EPERM
```

There is **no non-destructive open that reproduces it** — the only failing mode is the one that
truncates. Probing with `'w'` and restoring would mean truncating every tracked file and putting it
back, which is precisely what L205 forbids. So it reads the attribute, in one PowerShell process, and
writes nothing. `--fix` clears what it finds.

**NOT in CI, deliberately.** There is no HIDDEN attribute on Linux, so in CI this can only be a
no-op, and a green tick for a check that could not run is the trap this repo has paid for twice. It
lives in the **pre-commit hook**, where the owner's Windows tree is, and on a non-Windows platform it
prints `SKIPPED` with the count it did **not** check. Its **test** still runs in CI and asserts that
message, so the code stays exercised.

---

## 7. VERIFICATION

```
VERIFY — 20 changed file(s) vs master
  WILL RUN:  doc-guards · fingerprint-containment · script-suite
  SKIPPED, and why:
    client-suite        nothing matched — covers anything under client/ EXCEPT e2e
    world-fingerprint   nothing matched — covers any file the race engine can reach
    camera-fingerprint  nothing matched — covers the camera director and its modules
    render-fingerprint  nothing matched — covers anything that can reach a ctx. call
  PASS 3   FAIL 0   SKIP 4
```

The four skips are correct: **no `client/` file was touched on this branch.** The fingerprints were
measured in full anyway:

| role       | measured           | record             | verdict            |
| ---------- | ------------------ | ------------------ | ------------------ |
| **world**  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **byte-identical** |
| **camera** | `00cafa2432add0f7` | `00cafa2432add0f7` | **byte-identical** |
| **render** | `1f83ecc1fcb6fa9a` | `1f83ecc1fcb6fa9a` | **byte-identical** |

Measured before the final documentation commit; that commit touched only `docs/*.md`, which no
fingerprint harness reads.

**Script suite: 239 tests, 0 fail.** Guards at commit time: **PASS 5 FAIL 0**.

**CI — THE DEBT, stated plainly and not substituted.** This block touches `ci.yml`, the pre-commit
hook and the guards, so R8's first exception applies and CI should have been green FIRST. It was not
available. Requested twice by hand; both runs died on runner acquisition without executing a step.
**Owed: a CI verdict on master (`748145e7`) and on this branch.** A monitor is armed. `ci.yml` is the
one thing no local run can exercise, and this block edited it — that is the sharpest part of the debt.

---

## 8. TESTS, AND DUPLICATES STILL STANDING

**Tests added: 11. Tests deleted: 0.** (7 in `check-doc-facts.test.mjs`, 4 in
`check-writable.test.mjs`.) Suite: 228 → 239.

| test                                         | what breaks if I delete it                                                       | what goes unnoticed if it is missing                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Threshold restated elsewhere → FAIL          | The guard could stop failing; every other test asserts a PASS.                   | The gate moving while a dozen documents quote the old number.              |
| Gate named without a number → PASS           | A guard that failed unconditionally would satisfy every FAIL test.               | A rule nobody can comply with, which gets deleted.                         |
| Change the number in FAIRNESS.md → follows   | The guard could hardcode 70 and become a SECOND home.                            | Moving the gate and having the guard enforce the old value everywhere.     |
| Dated line / HISTORICAL document → PASS      | A dated measurement becomes unfixable except by damaging it.                     | The guard pushing people to falsify true sentences.                        |
| The YIELD works…                             | The two essential quotations start failing the build.                            | Pressure to rewrite the two sentences that explain the threshold's hazard. |
| …and is NOT a blank cheque                   | Keying the yield on a filename would blind the guard to that whole file.         | Every future restatement in SIM.md.                                        |
| No home / no threshold / no documents → FAIL | The guard finds nothing and prints a green line.                                 | A renamed FAIRNESS.md silently disabling the check.                        |
| HIDDEN file → FAIL, `--fix` reverts          | The writability guard could detect nothing and the clean-tree test still passes. | Ten tracked files unwritable for months — what actually happened.          |
| The PREMISE (reads yes, writes no)           | The guard could drift to checking a condition that no longer breaks anything.    | A guard measuring the wrong thing while looking healthy.                   |
| Never passes quietly on another platform     | A green Linux tick stands in for a check that never ran.                         | The no-op trap, in CI, permanently.                                        |
| Zero tracked files → FAIL                    | An empty enumeration reads as a clean tree.                                      | Running it outside a repo and believing the result.                        |

### Duplicates still standing, named with counts

| duplicate                                                      | count                     | status                                                                                                                                   |
| -------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **"ten tracks"**                                               | **26 mentions / 10 docs** | **Unguardable** — §5.2. Grep is the only tool if a track is added.                                                                       |
| **`runaway`** rates                                            | 12 docs                   | Almost all MEASUREMENTS with their own numbers; no single threshold to own.                                                              |
| **`REFERENCE_FPS`**                                            | 7 docs                    | **Already correct** — used as a SYMBOL inside formulas, never as a value. The shape the one-home rule wants, arrived at without a guard. |
| **"zero Holm-unfair start rows"**                              | 5 docs                    | A criterion with **no number**, so it cannot drift numerically. Its definition (χ² + Holm) is restated; unguarded.                       |
| Values stated away from their key ("stops at 80% of the race") | unknown                   | The lexical guard's biggest hole, stated in its own header.                                                                              |
| `min`, `max`, `duration` config values                         | not scanned               | Three keys the guard cannot check, by name, with reasons.                                                                                |
| Three camera **code fallbacks** vs `defaults.js`               | 3 keys                    | Source-vs-source; `ARCHITECTURE.md:629` now names a fourth such gap rather than restating it. Guarded by nothing.                        |
| Tracking-lag figures in 3 source comments                      | 3 sites                   | Unchanged from CLEAN-STATE-1.                                                                                                            |
| Stale `CAMERA_DIRECTOR.md` section references                  | 6                         | Pre-existing, disclosed by four blocks now.                                                                                              |

**Planner proposal 1 — taken, and stopping there.** The survey above is the answer: of the facts
still living in several documents, only the track count was a genuine one-home candidate, and it is
unguardable. `REFERENCE_FPS` is already in the right shape, `Holm-unfair` has no number, and
`runaway` is measurements. **There is no next one-truth target worth his attention.** That is the
useful result, and the reason not to propose another cleanup block.

---

## 9. WHAT I DID NOT DO, AND WHY

- **I did not wait out the outage.** The fallback was authorised and its three conditions were met
  and shown. The debt is recorded rather than papered over.
- **I did not ship the track-count check.** §5.2. Abandoning it is R11's corollary in action.
- **I did not rewrite two true sentences to satisfy a guard.** The guard yields to them by name.
- **I did not merge or mint `feat/min-racers-visible-5`.**
- **I did not put `check-writable` in CI.** It cannot work there and would print a false green.
- **I did not fix the export tool's OneDrive false positive.** It is his tool, it works, and the case
  it misfires on is one he does not hit.
- **I did not keep one change per commit perfectly** — stage 4's BACKLOG entry landed inside the
  stage-5 commit because both touched `docs/BACKLOG.md` and I staged the file whole. Reported rather
  than rewritten; history is worth more than tidiness here.
- **I did not chase the lexical tail to its end.** Nine more shapes are now visible; I do not claim
  there is no tenth.

---

## 10. PROPOSALS

**P1 — the `minRacersVisible` ceremony should be a SITTING, and the BACKLOG entry now says so.**
Concretely: one re-mint of the camera AND render fingerprints, two contrasting tracks
(mountainstreet — the spread case his verdict came from — and searound), and one eye test on the
company guarantee in the two regimes he named. If he changes three knobs that day, it is still one
ceremony. **`docs/SHIP-CEREMONY.md` should say "camera implies render" out loud** — that pairing is
not obvious from either file and it caught this block by surprise.

**P2 — a `--strict` mode for `check-config-claims.mjs`, run on demand, not in CI.** This block found
nine claims the narrow shape missed, which means the shape list is the weak part. A `--strict` mode
using the BROAD rule (any number within N characters of a key name) would surface the remaining tail
for a human to read, without ever failing a build. The narrow rule stays the gate; the broad rule
becomes an inspection tool. That splits "catch it automatically" from "show me what I might be
missing", which is the distinction that made the track-count check unbuildable as a gate.

**P3 — the audit-gate allowlist has a remove-when condition nobody is checking.** The React Router
advisory is allowlisted with "REMOVE this entry once react-router ships a patched >8.2.0". That is a
stamp with no guard — exactly the shape `check-measured-stamps.mjs` exists for. One small check that
fails when an allowlisted advisory's condition has been met would close it. Cheap, and it prevents an
allowlist becoming permanent by inattention.

---

## 11. PLAIN LANGUAGE, FOR THE OWNER

**What is now on master.** Two merges, both proper merge commits: the CONFIG-TRUTH-1 documentation
work, and **your backup tool**, which had been sitting on an unmerged branch. Master also has the
fairness clean-up on a branch waiting for you (PR #135).

**Your backup tool works.** I ran it from master: **247 files, 12.0 MB compressed**, exactly the
figures it was documented with — so nothing has stopped being archived and your data has not
quietly grown. `--minimal` still leaves out `sessions.sqlite` and nothing else; I checked by
comparing the two archives file by file. I deleted the test archives afterwards, because they contain
your real user and session data and a temp folder is no place for them.

**Merging is now merge-commits only.** Squash was already off; rebase is off as of this block. Both
destroyed commit SHAs, and one of our guards depends on a SHA surviving.

**What is still parked, and why.** `minRacersVisible = 5` — your own recorded verdict — is committed,
measured and waiting on `feat/min-racers-visible-5`. It is now the first item of a new BACKLOG
section for your camera-defaults sitting, because **any camera default you change moves two
fingerprints, not one.** That is the argument for doing them all in one go: one ceremony for the
whole sitting instead of one per knob.

**Something I got wrong last time, now fixed.** The previous block reported "94 config numbers
removed, 0 left". That was true of the guard and not of the repository — the guard could not see a
value written as `` `referenceCorridorPx`, shipped at 300 ``, because of the comma. Nine more were
hiding in that shape, including one more wrong `choreoOutcomeStart`. All nine are gone now.

**Still owed: a real CI verdict.** GitHub Actions has been broken all evening. I added a manual
trigger to the workflow, which does now create runs where a push created none — but the runners
themselves are still unavailable, so both runs died without executing a step. I have not substituted
the local run for it.

**What you have to decide:**

1. **The camera-defaults sitting** — when, and which knobs. `minRacersVisible` is ready and waiting.
2. **PR #135** (this block) — merge it when you are happy, or tell me to wait for CI.
3. **Nothing else needs a one-truth block.** I surveyed the remaining repeated facts and none is
   worth your attention: the track count cannot be guarded without false alarms, `REFERENCE_FPS` is
   already in the right shape, and the rest are measurements. That is a finish line, not a pause.
