# DOC-TRUTH-1 — 791 claims checked, 8 false, median age 9 days — and the worst one was hiding in a guard's declared blind spot

> **Corrections only.** Nothing was rewritten for style, tone, structure or completeness. A document
> that is true and ugly is finished. Every correction names what it was and what made it false, so
> the next reader sees the movement.

---

## THE THREE NUMBERS

| | |
| --- | --- |
| **claims checked** | **791** |
| **false** | **8** (at 10 sites, in 6 documents) |
| **age of the false ones** | **median 9 days**; range **8 days to never-true** |

**Two of the eight were never true at all** — false on the day they were written, not statements that
rotted. That distinction matters: it means proof-reading at write time would not have caught them
either, because the author was not describing something they had checked.

### What "791 claims checked" means, so the number can be audited

| class | how it was checked | count |
| --- | --- | --- |
| root-relative file paths named in living documents | existence, mechanically, over all `docs/*.md` + `CLAUDE.md` + `README.md` | **285** |
| symbol-shaped names (functions, config keys, constants) in the ten structural documents | searched across every tracked `.js/.jsx/.mjs/.cjs/.json` in `client/`, `server/`, `scripts/`, `shared/` | **466** |
| environment variables in `ENVIRONMENT.md` | both directions — documented-but-unread, and read-but-undocumented | 2 sweeps |
| endpoints in `AUTH.md` | against the registered routes | 7 |
| counts (tracks, racer types, test files, SubCards, origin tags, closure sizes) | by running the thing that produces each | ~11 |
| the specific claims the brief named | individually | 6 |

**Documents that declare themselves history were excluded from the path sweep** — `docs/AUDIT.md`
says *"Append-only; every row is history, not a claim about now"*, and `docs/LESSONS.md` is the same
shape. Judging them by present-tense standards would have manufactured false positives by the dozen.

---

## THE EIGHT

| # | where | what it said | what is true | what made it false | age |
| --- | --- | --- | --- | --- | --- |
| 1 | `reports/evolution/INDEX.md:5` | shipped world is **`dc4647be0f55ebdb`** | the record carries a different value, minted twice since | `d73ec6a9` 2026-08-25, then `a6030929` 2026-09-02 | **8 days, across 2 mints** |
| 2 | `docs/BACKLOG.md:604` | *"`corridor-truth` and `corridor-truth --company-only`"* | that script has ONE flag, `--json`; the arm is `his-shot-truth`'s | **nothing — never true** | 28 days |
| 3 | `docs/VERIFY-RULES.md:692` (R16) | the same pair | the same | **nothing — never true**; inherited from #2 | 10 days |
| 4 | `docs/NIGHT-RUN.md:113` | the browser suite is **103/103 green** | 106 tests; 105 can pass, 1 fails deterministically | two specs added 2026-08-25/26 | 8 days |
| 5 | `docs/ARCHITECTURE.md:466` | garden-path *"is"* 282.8 s at the snail's 0.3 | it runs the beetle; 70.7 s measured, 71 s by the product's own estimate | `d73ec6a9` 2026-08-25 | 8 days |
| 6 | `docs/BACKLOG.md` (action dial) | reaching the dial *"requires the Dev Screen — which is exactly what the order says is not enough"* | Race Defaults is `tier: 'operator'` and carries `raceActionStage` | `b49bf4a5` 2026-08-24 | 9 days |
| 7 | `docs/TRACK_LIFECYCLE.md:32` (+ the workflow section) | `defaultTracks.js` *"— in-code fallback snapshot, used when…"* | the file does not exist; TLH-3 is deferred | never built; **`ARCHITECTURE.md` has said "NOT BUILT" since 2026-08-10** | **23 days of self-contradiction** |
| 8 | `docs/VERIFY-RULES.md` R10, twice | *"`git worktree prune` cannot delete the stale stubs here"* | it can, in three lines | corrected earlier tonight by WORKTREE-STUBS-1 | months |

---

## ★ THE ONE WORTH READING TWICE: A GUARD'S DECLARED BLIND SPOT IS WHERE IT HID

`reports/evolution/INDEX.md` — the file that carries the CORRECTIONS block for everyone else's
numbers — opened with **`Shipped world: dc4647be0f55ebdb`**.

That stopped being true on **2026-08-25** and again on **2026-09-02**. It survived **two mints**.

**`check-fingerprints` did not miss it. It cannot see it, and it says so:**

> `blind: ["…", "superseded values, which living docs legitimately quote as history"]`

The guard scans 1,097 tracked files for stray copies of a **current** fingerprint. A **superseded**
one is exempt by design, because living documents legitimately quote old values as history. **This
sentence was shaped exactly like history and read as the present tense**, and that is the entire gap.

### The repair is NOT a newer number

Writing today's hash into the header would have been the obvious fix and the wrong one: it would rot
again at the next mint, and **restating a fingerprint anywhere but `docs/fingerprints.json` is what
the one-canonical-home rule forbids in the first place.** The header now **points at the record
instead of quoting it**. A correction is recorded in the INDEX's own CORRECTIONS block, per the
append-only rule.

**No report below it is affected**, and **no fingerprint moved tonight** — proven mechanically:
`git log 8cd76a93..HEAD -- docs/fingerprints.json` is empty across all 27 commits of this chain.

---

## ★ TWO WERE FALSE ON THE DAY THEY WERE WRITTEN

**`corridor-truth --company-only` has never existed.** Not on master, not on any branch, not at any
point in history — `git log --all -S"company-only" -- scripts/corridor-truth.mjs` returns nothing.
That script has exactly one flag, `--json`. The real instance is `his-shot-truth.mjs:47`, and it is
*worse* than the one described: **four** arms under one identity line, not two.

It entered `BACKLOG.md` on **2026-08-05** and was copied into **R16 itself** on 2026-08-23 — so the
rule written to catch two numbers that do not share an identity was illustrated with a tool that
cannot produce them. **Found by building the thing the entry asked for** (RACE-IDENTITY-HASH-1), not
by reading; nobody re-checks an example.

---

## WHAT WAS CHECKED AND FOUND TRUE — the part that is easy to leave out

A census that reports only its hits cannot be audited. These were checked and stand:

- **`SHIP-CEREMONY.md`'s racer-types claim** — the brief expected it false. It is **already correct**:
  it says `racer-types/` is inside the WORLD closure and no other, gives world 78 / camera 38 /
  render 58, and states `engine-reach --check` now answers *"is in the hull"*. The tool agrees.
  It also carries **76** for `raceCore.js`'s import closure alongside **78** for the world guard's —
  **two different closures, both right**, which is the kind of pair that looks like a contradiction
  and is not.
- **`FORCE-MAP.md`** — 158 symbol claims, 48 absent from source, **and not one is a false claim**:
  every absent name sits under a heading explicitly marked **REMOVED**. Accusing it would have been
  the easiest wrong answer of the night.
- **`ENVIRONMENT.md`** — every documented `RA_*` variable is read somewhere, and nothing the server
  reads is undocumented. **My first sweep produced three false accusations** by scanning only
  `server/`; all three are read by `scripts/`.
- **`AUTH.md`** — all seven endpoints exist. **`DEPLOYMENT.md`** — the env table is current, and it
  already states that `RA_CLIENT_ORIGIN` unset *"is the correct and safest state for same-origin"*,
  which independently corroborates the design decision PUBLISH-STEPS-1 took tonight.
- **`SETUP.md`**, **root `README.md`** — ports, commands, the licence, 10 tracks, 20 racers, and the
  404-until-you-build behaviour: all true.
- **`CLAUDE.md`'s closing quotation inventory** — all twelve named files exist.
- **`DEVSCREEN-INVENTORY.md`** — "the section renders five `SubCard`s": exactly five.
- **`GLOSSARY.md`, `STANDINGS-ARCHITECTURE.md`, `RACE-ACTION.md`, `CONCEPT-COHESION.md`,
  `SWEEP-HARNESS.md`** — zero absent symbols between them.
- **`docs/DEAD-ENDS.md`** — its tag references resolve at origin (123 tags there, matching
  `check-tags`).
- **`FAIRNESS.md:131`** quotes the superseded world `dc4647be` — **correctly**, under *"What was
  measured"*, past tense. This is the same value as finding #1 and the opposite verdict, which is
  precisely why the guard's blind spot is a judgement call and not a bug.

---

## WHAT COULD NOT BE CHECKED MECHANICALLY

Stated rather than asserted afresh, per the brief.

- **Whether a document's DESCRIPTION of a mechanism still matches its behaviour.** Existence of a
  symbol is checkable; "what it does" is not. Most of `CAMERA_DIRECTOR.md`, `PHASE-CONTRACT.md` and
  `RACE-ACTION.md` is this kind of claim, and this census establishes only that the things they name
  exist.
- **Deep links into line ranges.** `FORCE-MAP.md`'s REMOVED entries link to line ranges that now hold
  unrelated code — `raceBehavior.js:27-29` is cited for constants that no longer exist and now
  contains map declarations. The entries are honestly labelled REMOVED, so **no claim is false**, but
  a reader who follows the link lands somewhere misleading. **Not corrected**: it is not a false
  claim, and line-anchored links are a known cost this project has already accepted.
- **Completeness.** "Does this document name everything it should?" is not answerable by search.
  `AUTH.md` omits three users-router endpoints; whether that is a gap or `API.md`'s job was not
  judged.
- **Prose reasoning, principles and history** — out of scope by instruction and untouched.

---

## THE HONEST MEASURE

**8 false out of 791 is about 1 in 99.** That is a better ratio than the night's other censuses found
in code, and it is not the reassuring number it looks like:

- **The false ones cluster where nothing can check.** Two were never true. One sat in a guard's
  declared blind spot. One was a contradiction between two documents that no tool compares.
- **Median age 9 days** means these were not ancient. **They were written by people describing a tree
  that then moved under them within a fortnight** — the same shape PATTERN-CATCHABILITY-1 found six
  times in four days, arriving here for the seventh, eighth and ninth.
- **The one-in-99 rate is a lower bound**, because the checkable claims are the ones that rot
  visibly. A described mechanism that quietly stopped matching its code is invisible to every method
  used here.

---

## Limits

**A commissioned breadth pass over all 30+ documents did not return in time and is not part of this
report.** What is here was checked directly, and the 791 is what was actually verified — not an
estimate of the document set's total claim count, which is larger.

**The path sweep only judged ROOT-RELATIVE paths.** An earlier pass over all 483 path-shaped strings
produced 111 "missing" files, nearly all of them relative references like `modules/raceCore.js`
meaning `client/src/modules/raceCore.js`. **That pass was discarded rather than reported**; a check
that cannot tell a relative path from a wrong one is not evidence.

**Every null result here rests on a control.** Where a search returning nothing was the finding —
`STUCK_P_THRESH` absent, `--company-only` never in `corridor-truth` — a control that does return
something was run first. The one time I skipped that step, my regex found zero tags in `DEAD-ENDS.md`
and I nearly reported a clean sweep of an empty set.

**No fingerprint moved and nothing was minted.** The diff is documents only.
