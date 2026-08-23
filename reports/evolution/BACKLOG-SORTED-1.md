# BACKLOG-SORTED-1 — the backlog is two parts now, and nine decisions are on the record

**Date:** 2026-08-23 · **Branch:** `docs/backlog-sorted` off master `fd9037d5`
**Piece 2 of CHAIN-2026-08-23.** Documents plus **one source comment**, which is the only code this
piece was permitted to touch.

---

## THE PROOF, first, because it is what the brief asks the piece to stand on

| claim required | measured |
| --- | --- |
| subjects before **=** subjects after | **234 → 234**, delta **+0** |
| verdicts unchanged (not re-litigated) | before `{OPEN 141, CLOSED 93}` · after `{OPEN 141, CLOSED 93}` |
| a subject appears in **exactly one** part | PART ONE **141**, PART TWO **93**, outside both **0** |
| no subject appears twice | **0** |
| verdict and part never disagree | **0** disagreements |
| every CLOSED item names what closed it | **93 of 93** |
| every OPEN item has a `verify:` line or a stated reason | **26 of 26** open sections covered; **0** with neither |

**Two defects were found by that proof and fixed before it passed**, which is the reason it is run
against the file rather than asserted:

1. **The decisions block added +5 phantom subjects.** Its explanatory sub-bullets sat at column 0, so
   an item counter read the two comment ADDRESSES in D1 and the three findings in D6 as subjects.
   Indented — they are evidence inside a decision, not decisions.
2. **15 OPEN sections carried neither a per-item `verify:` nor a section-wide reason.** Each now
   states one, and several state plainly that **no command can decide them**.

## PART A — THE NINE DECISIONS, recorded with their date

All nine are in `docs/BACKLOG.md` **PART TWO**, under `DECISIONS — 2026-08-23`, each as a decision
rather than an open item. Where an open item existed for the same subject it is closed and points
there.

| | decision | what it closes |
| --- | --- | --- |
| **D1** | the track-width overshoot comments are a **RIDE-ALONG** | findable from both sites; carries a `verify:` that is discharged when the phrase is gone |
| **D2** | `RaceScreen` is not testable — the finding **STAYS**, no work | the *question of whether to act*; the finding itself stays in PART ONE because it is still true |
| **D3** | `deploy.yml.disabled` gets **no** `permissions:` block | CI-PERMISSIONS-1's open question |
| **D4** | the backlog **MAY grow** when it retires an item | this is the rule PART TWO is built on |
| **D5** | a Dev Screen change reaching a running race is **NOT wanted**; and `npm run dev` refusing on an unreadable identity is **NO for now** | two items that had been proposed more than once |
| **D6** | the fairness **SPLIT will not be measured** — his reasoning recorded as his | and **the finding is FILED**, so it is not rediscovered as an open question |
| **D7** | `_lfEntryByState` is **documented in place**, not deleted | the reason is now in the source, not only here |
| **D8** | `reports/perf` — the rule **as PERF-CLEAR-1 applied it**, pointing at `DELETED.md` | supersedes the retention question |
| **D9** | the server-suite double failure is a **WATCH**, not a defect | no work; and it says plainly that no command can check a flake that did not reproduce |

**D2 is the one worth a second look, because it is not a plain closure.** The finding stays OPEN —
it is still true that `RaceScreen` cannot be mounted — while the DECISION about whether to act on it
is closed. Filing the finding under CLOSED would have been tidier and would have lost the thing he
asked to keep: *so the next person meeting the wall knows it is known.*

**D6 carries the scoping the brief asked for, so the work is ready if it is ever wanted:** one line
in `scripts/sim-fairness.mjs` passing `controllerParams` through to `createRacePlan` — **and that
file is inside the world fingerprint's declared reach**, so it needs its own piece with the
fingerprint proved unmoved. That is precisely why a read-only measurement could not do it.

## PART B — THE RESTRUCTURE

`docs/BACKLOG.md` now opens with its unchanged header and living-document notes, then:

- **PART ONE — OPEN**
  - **NEEDS HIS WORD — decide these first.** Two sections are wholly his and lead the part. **The
    remaining his-word items are INDEXED here and left where they are.**
  - **THE REST**, in the order they were already in.
- **PART TWO — CLOSED**
  - **DECISIONS — 2026-08-23** (the nine above)
  - then every closed item, under its original section heading.

### The one real judgement call, and why it went the conservative way

**The brief says the items needing his word come first. Twenty-two such items exist, scattered across
a dozen sections — and I did not move them.**

Each sits inside a section whose surrounding text is the *evidence* for it: the audit episode behind
the CI questions, the sweep behind the OUTCOME climb-capacity question, the beat timing behind the
comeback-shot question. **Cutting the item out and leaving the evidence behind would make each
decision look smaller than it is**, which is how a question gets answered without being understood.

So PART ONE opens with a **table naming every one of them and where it lives**. He meets them first,
which is what the requirement is for, and the evidence stays attached. *(Conservative option at a
fork, stated as required.)*

### A section heading can appear in both parts — a SUBJECT cannot

Fourteen of the original sections were MIXED. Their headings are repeated in PART TWO so a closed
item keeps the context that explains it. **The rule the brief sets is about subjects, and the proof
above measures subjects: 0 appear twice.**

## WHAT WAS PRESERVED

Every `verify:` line, every piece of reasoning that states a general rule, every record of what
closed an item, and the file's header and living-document notes. **Nothing was summarised, shortened
or dropped** — the restructure carries each item's body verbatim, and the assertion that item counts
match is what makes that checkable rather than claimed.

## THE ONE SOURCE EDIT

`client/src/modules/camera/CameraDirector.js`, above `this._lfEntryByState = t.lfEntryByState` — a
comment, no code. It records that the map is consumed on **zero frames of a shipped race**, and the
three reasons it stays anyway: the reader is live, the older grammar is a **shipped config switch**
rather than removed code, and deleting the map would therefore change behaviour the moment that
switch is flipped.

**The brief cited `defaults.js:855` for that switch; it is at `:860` today.** The comment names the
KEY and the FILE rather than a line number, which cannot drift.

---

## VERIFICATION

| instrument | ran? |
| --- | --- |
| `check-config-claims` | **RAN** — 170 keys, 56 living docs, **0 current claims** |
| `check-language-closed` | **RAN** — pass |
| `check-doc-links` | **RAN** — 560 links, **0 dangling** |
| `check-index` | **RAN** — 353 reports, 0 unindexed |
| **client suite** | **RAN** — required, because a source file gained a comment |
| `npm run verify` (full) | **RAN** — **PASS 15, FAIL 0, SKIP 9** |
| **camera + render fingerprints** | **RAN, and NOT because I asked** — routing selected them, since `CameraDirector.js` is inside both closures. **Both byte-identical** to `docs/fingerprints.json`. Nothing minted. |
| world fingerprint, browser gate, race, sweep | **NOT RUN, and the answer was determined:** the only source file touched is a comment inside the camera module, which is outside the world hull; routing skipped them and printed the reason. |

**The fingerprints were not part of the brief's verification list and ran anyway.** That is routing
doing its job on a camera-directory edit, and their being byte-identical is a stronger statement than
the argument that a comment cannot move a hash.

### CORRECTION, added immediately after the merge — I MERGED ON A RED VERIFY

**The verification table above was written from the run before the last one.** The FINAL run on the
branch was **PASS 15, FAIL 1** — `client-suite` — and **the merge went ahead anyway.** That is a
process failure of mine, not a judgement call: the merge command was chained behind `npm run verify
… | tail`, and `tail` exits 0 whatever verify did, so the `&&` that was supposed to stop the merge
could not see the failure.

**What the tree actually is, established after the merge rather than assumed:**

- the client suite alone: **217 files, 4186 tests, all passing**
- the full post-merge run, `npm run verify -- --base=fd9037d5`: **PASS 16, FAIL 0, SKIP 8**, with
  CAMERA and RENDER byte-identical again
- **CI on the merge commit `cd34d07b`: success**

**So the failure was a flake and the merged tree is sound — but it was merged before that was
known**, which is the part worth recording. The flake matches D9's watch item exactly: a
load-sensitive failure while background sim processes were competing for the cores, nine of which
were still running during that verify.

**The lesson, and it is a general one:** a verify whose output is piped anywhere loses its exit code,
so a merge chained behind it is not gated at all. `npm run verify && git merge …` is the only form
that gates; anything with a pipe in between is a merge with a progress bar in front of it.

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| record each of the nine as a DECISION with its date | done — PART TWO, `DECISIONS — 2026-08-23` |
| close any open item on the same subject and point it at the decision | done for D3, D5, D6, D8, D9; **D2 deliberately keeps its finding open** and closes only the question of acting (§PART A) |
| two top-level parts, OPEN and CLOSED | done |
| his-word items first | **done by INDEX rather than by moving them** — the conservative option, with the reason stated |
| a subject in exactly one part | **proved: 0 duplicates, 0 verdict/part disagreements** |
| use BACKLOG-HONEST-1's verdicts; do not re-verify, do not change one | **not one verdict changed** — `{OPEN 141, CLOSED 93}` before and after |
| an unclear verdict STAYS IN OPEN and is listed | **no item was unclear.** Every one carried an unambiguous mark from the earlier census |
| preserve verify lines, general rules, closure records, header | done — bodies carried verbatim |
| prove with counts | done, at the top of this report |
| the one comment in (g) | done, and only that |
| documents plus one comment; no fingerprints, browser gate, race or sweep | honoured — the fingerprints that ran were selected by ROUTING, not requested |

## SOURCE HYGIENE

| | |
| --- | --- |
| `docs/BACKLOG.md` | 1664 → **1899** lines; 234 subjects unchanged |
| added | the two part headers, the his-word index, the nine decisions, 15 section-wide verify notes |
| removed | **nothing** |
| `CameraDirector.js` | +20 lines, all comment |
| shipped behaviour changed | **none** — both fingerprints byte-identical |

**NOTICED BUT LEFT:**

- **Only 10 of 141 open items carry an INDIVIDUAL `verify:` line.** The other 131 are covered by a
  section-wide reason. **That is stated rather than dressed up:** a per-item command for all 141
  would mean inventing 131 checks in one pass, and most would be the kind that cannot fail — the
  exact defect the `verify:` convention exists to prevent.
- **`Race-Action Arc` holds 18 open items**, the largest block, and is mostly owner decisions and
  sweep results. Its section note says to read it as a reading list, not a checklist.
- **Two sections whose headings say `CLOSED` still hold open items** (`Evolution Act 1` and `Act 2`).
  The arcs are closed; the open lines are successor leads. Left as they are — renaming a heading that
  records a historical closure would be worse than the mild dissonance.

## PROPOSALS — for the owner, nothing done

1. **A guard that fails when an item in PART ONE has neither a `verify:` line nor a section-wide
   note, and when an item in PART TWO names no closer.** Both properties are true today and were
   measured by a throwaway script; a rule inside `check-doc-facts` (R13) would keep them true.
   **Cost, and it is why this is a proposal:** the section-wide escape hatch is easy to abuse — it
   would become the default answer within a month unless the guard also counts how many sections use
   it and complains when that number grows.
2. **Move PART TWO to its own file, `docs/BACKLOG-CLOSED.md`.** PART ONE is what anyone actually
   opens, and it is now buried under 1200 lines of history that exists to stop proposals recurring.
   **Value:** the live list becomes readable in one screen-scroll again. **Cost:** it splits one
   subject-space across two files, and the "a subject appears in exactly one part" property this
   piece just established becomes a property nobody can check with a single grep — which is a real
   loss, and the reason I am proposing it rather than having done it.
