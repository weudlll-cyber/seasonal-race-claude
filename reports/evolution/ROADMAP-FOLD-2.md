# ROADMAP-FOLD-2 — the last 10% of a merge that was 90% done, and why the last 10% was the whole problem

**Documents only.** `docs/ROADMAP.md`, `docs/BACKLOG.md`, three documents that described ROADMAP, and
this report.

**WHAT WAS NOT RUN.** No browser gate, no client suite, no fingerprint run. The fingerprint roles are
computed from the engine; a change confined to `docs/` and `reports/` cannot reach them, so those
gates could not return a different answer than not running them. `check-doc-links` and `check-index`
are the gates that can, and both were run.

---

## WHAT I FOUND, WHICH IS NOT WHAT THE BRIEF EXPECTED

The brief says the merge "was approved as work and never done". **It was mostly done.**
ROADMAP-FOLD-1 (2026-08-23, under D24) moved all 35 sections into BACKLOG whole and unedited and left
the file at 74 lines. The backlog already recorded it as ✅ DONE.

**And that is exactly why it needed finishing.** The 74 lines were a phase-status table, and a
phase-status table is a thing a person reads and updates. D24's whole purpose was that **two documents
should not half-own one subject** — and a document owning "the phase status" while another owns "the
phases" is that same split, smaller. **The merge was recorded as done while the condition it existed
to remove was still live.**

**A job that is 90% done and filed as finished is worse than one filed as open**, because nothing will
look at it again. This is the second entry of that shape tonight; BACKLOG-TRUTH-2 found the first.

## WHAT MOVED

- **The phase-status table** — 38 rows — into `BACKLOG.md` PART TWO, inside the existing *Phase
  history — moved whole from ROADMAP* section where the rest of ROADMAP already lives. Moved **whole
  and unedited**, the same rule the first fold used: no verdict re-checked, no completion claim
  confirmed or withdrawn.
- **`docs/ROADMAP.md` became a 31-line redirect** that owns nothing and says where everything went.

## WHY A REDIRECT AND NOT A DELETION

**Eleven documents and reports link to `docs/ROADMAP.md`**, and several are reports — append-only by
rule, so their links cannot be rewritten. Deleting the path would break every one and turn a finished
merge into a trail of dead links. **A stub costs nine lines and keeps them all landing somewhere
true.**

## THE DESCRIPTIONS, WHICH IS WHERE THE REAL BREAKAGE WOULD HAVE BEEN

`check-doc-links` passes on a link to a file that exists — **it cannot see that the sentence around
the link has become false.** So every mention was read, and they sort into three kinds.

**CORRECTED — three live descriptions that were now wrong:**

| file | said | now says |
|---|---|---|
| `docs/README.md` | "Phases and their completion status." | a REDIRECT that owns nothing; phases are in BACKLOG PART TWO |
| `docs/AUDIT.md` | verify claims "in ROADMAP.md" | verify against the running app; the claims moved to BACKLOG |
| `docs/PROJECT-PRINCIPLES.md` | review "BACKLOG, ROADMAP, …" before a PR | review BACKLOG, which owns the phase history ROADMAP used to hold |

**Plus BACKLOG's own three claims about itself** — its ownership line, its index row (which still read
"approved as work … its own piece"), and its section-wide `verify:` line, which described the 74-line
table as the finished state.

**LEFT ALONE, deliberately** — a judgement, so it is stated rather than buried:

- `docs/ARCHITECTURE.md` lists `ROADMAP.md` in a **file tree**. The file exists. Still true.
- `docs/SIM.md` carries it in a *see also*. It resolves, and it leads somewhere that explains itself.
- `docs/LESSONS.md` cites "ROADMAP §R.7"; `docs/TRACK_LIFECYCLE.md` cites a section by name. Both are
  **historical citations of what a document said at a time** — which is what the redirect exists to
  keep honest. Rewriting them would falsify a record to tidy a link.
- `docs/AUDIT.md`'s dated log rows mention ROADMAP among files a past PR touched. **That is history
  and it is true.**

**The rule applied throughout: a link that resolves and a sentence that is true both stay; a sentence
that has become false is corrected; a historical citation is neither.**

## CONFORMITY

- `check-doc-links`: **651 links across 60 living-doc files, 0 dangling** — verified after the change,
  as the brief required.
- `check-config-claims`: 0 current claims.
- Nothing deleted; the table sits where the rest of ROADMAP already was.
- **Prettier was not run on `docs/`** — standing rule.

## PROPOSALS

**P1 — the redirect should be allowed to die eventually, but not by deletion.** When the last *living*
document stops linking to `ROADMAP.md` — reports never will, and should not be edited — the stub can
go. That is a condition, not a date, and it is written here so the next person tidying `docs/` does
not delete it on sight and break eleven links.

**P2 (mine) — `check-doc-links` proves a link RESOLVES and cannot prove it is HONEST, and tonight
demonstrated that twice.** Both BACKLOG-TRUTH-2 and this piece found false sentences whose links all
passed. There is no cheap general guard for that, but there is a cheap specific one: **a document
declaring `**Owns:** …` states the same fact as README's table row for it, and the two can be compared
mechanically.** That would have caught README's row here on the commit that made it wrong.

**P3 (mine) — D24 should be marked fully discharged, with the pattern named beside it.** Its record
still reads as satisfied by the first fold. One line saying it took two, and why, is worth having:
**the first fold moved the content and left the ownership, and ownership is what the decision was
about.** That distinction is the reusable part — a fold that leaves a table behind has not folded
anything.
