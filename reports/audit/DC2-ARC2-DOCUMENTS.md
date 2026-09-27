# DELIVERY-CLEAN-2 · ARC 2 — THE 39 DOCUMENTS: WHO READS THIS, AND WHY

**From master `5599a26b`, branch `audit/2026-09-27-docs`.** Documents only.

The owner's question: *who is supposed to read 39 documents, is it recognisable from a document why
it exists, and does every piece of information live in exactly one place.*

★ **The short answers.** Nobody is supposed to read them all, and there is now a page that says who
reads what. Their reasons **were** already recognisable — far more so than the earlier audit
reported. And the information is in one place more reliably than expected, with two documents found
stating a subject they do not own without pointing at the owner.

---

## §2.1 / §2.2 — ★★ THE "19 WITH NO OWNS LINE" WAS A FORMAT COUNT, NOT A SUBSTANCE COUNT

`DELIVERY-CLEAN-1` §1.1 reported **19 of 39 documents carrying no OWNS line**, and C3 used that to
say the overlap check was *"capped at half the corpus"*. **That number counts the literal string
`**Owns:**`.** Measured for what the owner actually asked — *is it recognisable from the document
why it exists* — the corpus was already in far better shape:

| | count | |
| --- | ---: | --- |
| canonical `**Owns:**` | 20 | |
| **declares scope, different wording** | **8** | `**What this document is FOR:**`, `**Purpose.**`, `**What this document owns:**` |
| unmatched by either pattern | 11 | **but ten of these state their scope in prose anyway** |
| ★ **genuinely unrecognisable** | **1** | see below |

The ten that "had no line" and said it anyway, in their own first sentences: `FAIRNESS.md` *"the
canonical definition of fairness"* · `SHIP-CEREMONY.md` *"the checklist for shipping an engine
change"* · `TRACK_EDITOR.md` *"the single source of truth for the Track Editor feature"* ·
`VERIFY-RULES.md` *"**What this is FOR:**"* · `ROADMAP.md` *"THIS FILE IS A REDIRECT. It owns
nothing"* · `OPEN.md` *"THIS PAGE IS DERIVED"* · `PHASE-CONTRACT.md` *"Read-only inventory"* ·
`PROJECT-PRINCIPLES.md` *"These principles override convenience"* · `RACE-ACTION.md` *"Definitive
reference for the shipped race-action mechanism"* · `README.md` (a README's reason is conventional).

★ **So the defect was never that documents did not say what they are for. It was that no two said it
the same way, so no mechanical check could see it** — and a count of one spelling was then read as
a statement about the corpus.

### What was done

**7 variant labels converted** to `**Owns:**`, preserving each document's own words, and **11
canonical lines added**, each summarising what the document already says about itself. **39 of 40
now carry one.**

★ **`CLAUDE.md` is deliberately excluded and is the one exception.** It declares
`**What this document owns:**` and its opening is load-bearing inside its own permanent rules;
reformatting the AI door is not a formatting matter. Named rather than silently skipped.

### ★ The one genuine recognisability finding — and it is fixed

**`docs/MORNING.md` is the dated morning sheet of 2026-09-19, and is named as though it were the
current one.** A reader arriving at `MORNING.md` has no way to know from the filename that it is
history. Its new first line now says so and points at `OPEN.md` for what is open today.

---

## §2.2 — THE OVERLAP MATRIX

Fourteen subjects, scanned across all 40 documents by the vocabulary that indicates a document
*asserts* the subject rather than mentions it (≥3 occurrences). ★ **A subject in two documents is
only a drift risk if the non-owner does not defer**, so every heavy pair was checked for a pointer
to the owning document:

| pair | defers? |
| --- | --- |
| `DEPLOYMENT.md` → `ENVIRONMENT.md` | ✔ |
| `SETUP.md` → `ENVIRONMENT.md` | ✔ (3) |
| `ARCHITECTURE.md` → `API.md` | ✔ (2) |
| `TRACK_EDITOR.md` → `TRACK_LIFECYCLE.md` | ✔ (3) |
| ★ `AUTH.md` → `ENVIRONMENT.md` | **NO REFERENCE** — names **13** `RA_*` variables |
| ★ `DEPLOY-NOTES.md` → `ENVIRONMENT.md` | **NO REFERENCE** — names **7** `RA_*` variables |

**`ENVIRONMENT.md` claims to own "every environment variable RaceArena reads".** Two documents were
describing variables at length with no pointer to it — two homes for one fact, with nothing saying
which wins. **Deferrals added to both; no fact changed**, and each says which subset it describes
and that `ENVIRONMENT.md` wins on the full list.

★ **Config VALUES are a solved case and were not re-litigated:** they live in `defaults.js`, and
`check-config-claims` already fails any document that restates one. That is the one subject where
the one-home rule is machine-enforced rather than conventional.

---

## §2.3 — ACT ON IT. ★★ THE HONEST OUTCOME IS THAT NOTHING QUALIFIED.

The brief authorised merging documents covering one subject and retiring any whose reason is
"nobody living". **Two tests were applied to all 39:**

**(a) Is anything orphaned?** Inbound links counted from every tracked `.md`, `.js`, `.jsx`, `.mjs`,
`.json` and `.yml`, **excluding `reports/` and `docs/archive/`** so that a mention in the lab
journal or in history does not keep a dead document alive. ★ **Every single document has at least
one live inbound link.** The thinnest are `branding.md` (1) and `EYE-TEST-SEEDS.md` (3). **Nothing
is orphaned.**

**(b) Is the subject dead?** The two plausible candidates both survive:
`STANDINGS-ARCHITECTURE.md` covers the **live standings panel, which is built**, and its own scope
line says it exists to bind the next change rather than record the last; `ROADMAP.md` is a declared
redirect **doing exactly the job a redirect exists for** — catching links to a document whose
content moved.

**So no document was merged and none retired.** ★ A retirement count of zero, with the tests that
produced it, is a result — it is not the same as not having looked.

### One real defect found instead, and repaired

★★ **`PHASE-CONTRACT.md` contradicted itself about its own currency.** Its opening calls it *"the
CURRENT shipped race world"*; its own `:95` concedes that one of its sweeps **predates the
speed-150 re-baseline**. The world has been re-baselined since it was written (speed-150, COMBO15,
gap-reroll's flip). **Its values are now scoped to their date** with pointers to
`reports/parity/REBASELINE.md` and `defaults.js`, and **the contract it states — whoever moves a
phase boundary inherits every value calibrated against it — is marked undated and still binding.**
The rule was never the stale part, and deleting the document would have thrown the rule away with
the numbers.

---

## §2.4 — THE MAP: `docs/WHO-READS-WHAT.md`

The answer to *"who is supposed to read all this"*. **Nobody reads 40 documents.**

- **The operator reads five**, and the page says so in those words.
- **A developer's first day is four, in a fixed order** — `GLOSSARY.md` **first, not last**, because
  three of this project's terms mean two different things each.
- **A subject-to-owner table** for working on one thing.
- **What is history and what is open**, so a reader knows which documents are correct *as history*.

★ **It states no fact of its own.** Every row points at the owning document and says that document
wins on disagreement — the page cannot become a second home for anything. Linked from
`docs/README.md` Tier 1.

**Count:** the corpus is now **40**. `README.md`'s figure was corrected 39 → 40 and its five `†`
marks removed, since all five now carry a canonical line.

---

## ARC 2 — UNKNOWN

- ★ **"Recognisable reason" was judged by me, from each document's own opening. No reader was
  asked.** A developer arriving tomorrow is the only real test of `WHO-READS-WHAT.md`, and that test
  has not been run.
- **The overlap matrix is keyword-driven over 14 subjects I chose.** A subject nobody named, or one
  whose two homes share no vocabulary, would not appear. The denominator is 14 subjects, not "all
  subjects".
- **Deferral was tested as "does the non-owner mention the owner's filename"** — a weak test. A
  document could mention the owner once and still contradict it in a paragraph nobody compared. No
  two documents' *content* was diffed against each other.
- **No document's length was judged.** Several are very long (`BACKLOG.md` 5,600+, `CAMERA_DIRECTOR.md`
  2,169) and length is a real cost to a reader; arc 2 asked whether a document earns its place, not
  whether it earns its size.
- **`docs/archive/` (22) and `docs/internal/` (1) were not audited** — out of scope, and both
  declare themselves history.
