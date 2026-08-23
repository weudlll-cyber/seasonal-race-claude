# ROADMAP-FOLD-1 — one home for what is done and what is next

**Branch:** `docs/roadmap-fold` off master `7b237a14`. **Documents only.** No source changed.
**NIGHT-2026-08-23, piece 3.** Approved by the owner as **decision D24, 2026-08-23**.

Two documents half-owned *"what is done and what is next"*: `BACKLOG.md` owned the open work with its
evidence, `ROADMAP.md` owned the phases and their completion status. **D24's landing, recorded twice
before tonight: BACKLOG owns both, with ROADMAP reduced to a phase-status table.** That is what this
piece did.

---

## 1. The counts, which are the proof

**D24's stated fear was that a real merge would silently drop an item.** So the fold is arithmetic
before it is prose: **every one of ROADMAP's 35 level-2 sections is accounted for, by name.**

| | before | after |
| --- | --- | --- |
| `docs/ROADMAP.md` | **627 lines**, 35 content sections | **73 lines**, **1** section — the status table — with **35 rows** |
| `docs/BACKLOG.md` | 2412 lines, 46 level-2 sections | **3078 lines**, **48** level-2 sections |

**Where the 35 went:**

| destination | n | what |
| --- | --- | --- |
| BACKLOG **PART ONE** → *Phases 5–7* | **3** | Phase 5 (race-integrity server), Phase 6 (public deployment), Phase 7 (multi-tenant) — the only genuinely unbuilt feature work in the file |
| BACKLOG **PART TWO** → *Phase history* | **30** | 23 completed phases + Phase Q's `[x]` record + the session log + *Planned Phase Order* + the four dated status updates |
| **SUBSUMED, deliberately not copied** | **2** | Phase V and Phase T — see below |
| | **35** | **= 35** |

**No subject appears twice: 0 duplicate level-3 headings** across the whole of BACKLOG after the move.
**No broken links: 0** across `BACKLOG.md`, `ROADMAP.md` and `README.md` (commented-out markup
excluded; the one dead `docs/screenshot.png` reference is inside an HTML comment and pre-existing on
master, so it is neither live nor mine).

---

## 2. The two sections that were NOT copied, and why that is the point

**Phase V** said *"See BACKLOG.md V-1 through V-9 for full item list."*
**Phase T** said *"See BACKLOG.md T-1 through T-4."*

**They were already pointers into the file they were being merged into.** Copying them would have
created a second home for `V-1`–`V-9` and `T-1`–`T-4` — **exactly the condition this merge exists to
end**, and it would have been invisible in a diff that was adding 30 other sections at the same time.
They are recorded as subsumed here and in the moved-history preamble, so a later reader looking for
"where did Phase V go" finds the answer rather than an absence.

---

## 3. It was a move, not an audit — and that is a constraint, not a disclaimer

**The brief forbids re-verifying and forbids changing a verdict.** Every moved section is the
roadmap's own text, unedited: **no `[x]` was re-tested, no completion claim was confirmed or
withdrawn, no PR number or master hash was checked.**

**This matters because some of those claims are known to be soft.** `AUDIT.md` records that Phase V
exists precisely to verify *"all known unverified `[x]` items from ROADMAP.md"*, and PART TWO already
carries one case (`V-4`/`B-4`) where a later "reality check" contradicted the roadmap and **the
roadmap turned out to be right.** **Moving those claims does not make them truer and this report does
not present them as verified.** The moved-history preamble states it at the top of the block, where a
reader meets it before the content: *where a record there disagrees with PART ONE, PART ONE is live.*

**Nothing went to OPEN for unclarity.** The brief's rule — an unclear item goes to OPEN and is listed
here — did not fire: every section sorted cleanly by its own `✅` marker into history, or by being
unbuilt planned work into PART ONE. **The three that went to PART ONE went there because they are
checklists of unbuilt features, not because their state was unclear.**

---

## 4. ROADMAP was kept, not deleted — and that decision repaired the links for free

**The fork:** delete `ROADMAP.md` and repair every reference, or leave a stub.

**Taken: keep it as the phase-status table**, because that is D24's own wording (*"reduced to a
phase-status table"*), and because **it makes every existing link stay valid rather than needing
repair.** `README.md`, `ARCHITECTURE.md`'s file tree and three historical `AUDIT.md` entries all point
at `docs/ROADMAP.md`; deleting it would have turned five live references into repairs, and the two in
`AUDIT.md`'s dated history **should not be rewritten at all** — they record what a document said on a
past date.

**Two links were still repaired, because they became misleading rather than broken:**

| file | was | is |
| --- | --- | --- |
| `README.md` "Also useful" | `[Roadmap]` listed beside `[Backlog]` as a peer | `[Backlog]` named as *the open work and the phase history, one home*; `[Phase status]` marked as a table whose detail is in the backlog |
| `README.md` "Status" | *"planned for Phase 5 — see the [Roadmap]"* | points at BACKLOG PART ONE *Phases 5–7*, where the checklist now lives |

**And the two `**Owns:**` lines that DOC-ORDER-1 wrote to describe the old boundary were corrected**,
since that boundary no longer exists.

---

## 5. Source hygiene

- **Lines:** `docs/BACKLOG.md` 2412 → **3078** (+677/−5); `docs/ROADMAP.md` 627 → **73** (+60/−614);
  `README.md` +4/−3. **Net across the two documents: +112 lines** (3039 → 3151) — the two new section
  preambles that say what was moved, unedited, and not re-audited. **The fold does not shrink the
  documentation and was never going to**; what it removes is a second owner, not text.
- **Removed:** nothing. **No ROADMAP section was dropped, summarised or rewritten** — the move is
  verbatim, with headings demoted one level (`##` → `###`) so they nest under their new home.
- **Extracted:** two new BACKLOG sections, each opening with a preamble stating that the content is
  moved, unedited, and not re-audited.
- **Closed in place:** the `- [ ] Merge ROADMAP into BACKLOG` item is struck **with its original
  reasoning kept below it**, because that reasoning states a general rule (why a merge is a separate
  order from an edit of the target file) and the rules in force keep such reasoning. Its section-wide
  `verify:` line is rewritten from *"still open while both files exist separately"* to a command that
  now passes.
- **Noticed but left alone:** `AUDIT.md` carries three dated references to ROADMAP.md's old contents
  (2026-05-02, 2026-05-04, and the Phase V line at `:349`). **Left deliberately: they are history
  entries recording what a document said on a date, and rewriting them would falsify the audit
  trail** — the same rule that keeps the owner's already-written quotations in place.
- **No value restated.** No `defaults.js` number appears in either file as a result of this move.
- **Absence claims re-established here, not inherited:** the duplicate-heading check and the
  link check were both run over the post-move tree, and the "no PNG" style of claim does not appear in
  this piece at all.

---

## 6. Build-vs-spec conformity

1. **The brief offered "stub or delete"; I took stub, and §4 records why.** It is D24's own wording
   and it converts five link repairs into zero.
2. **The brief said "where BACKLOG already covers a roadmap subject, MERGE into its instance keeping
   whatever the roadmap adds".** **The only two subjects that were genuinely covered were Phase V and
   Phase T — and what the roadmap "added" there was a pointer back to BACKLOG, so there was nothing to
   keep.** The 23 completed phases had no BACKLOG instance to merge into: BACKLOG's *Completed Items*
   section records phase completions by PR number, not the phase narratives. **So the fold is mostly
   "move in whole", and that is a finding about the two files rather than a shortcut.**
3. **The counts proof the brief asked for is in §1 and it is the reason to trust this piece.**
   35 = 3 + 30 + 2, 0 duplicate headings, 0 broken links.
4. **One thing this piece deliberately did NOT do: reduce BACKLOG.** It is now 3078 lines and harder
   to read than it was this morning. **That is the intended shape** — one home for a large subject is
   worth more than two small files — **but it is exactly why PIECE 4 (`docs/OPEN.md`) exists**, and
   the two pieces should be judged together.
5. **R15 — documents only, gate set is the doc guards and nothing else.** No fingerprint, client
   suite, browser gate or race can have changed its answer; no file any of them reads was touched.
   **Merged while PIECE 1's sweep ran** in its own worktree, under the night's documents-only rule.
6. **Ran alongside the sweep; nothing here was timed.** Every number is a line count or a heading
   count, so machine load cannot have affected it.

---

## 7. Proposals

**P1 — A GUARD THAT FAILS WHEN `ROADMAP.md` GROWS A SECOND SECTION.** The file now owns exactly one
thing: a table. **The failure mode is not that someone edits it — it is that someone appends a new
phase's detail to it**, which is how it accumulated 627 lines the first time. A guard asserting that
`docs/ROADMAP.md` contains **at most one `^## ` heading** is one line, cannot produce a false positive,
and encodes the decision instead of trusting everyone to remember it. **It is the cheapest way to stop
this merge being needed again in a year.**

**P2 — THE MOVED `[x]` CLAIMS ARE NOW SITTING IN THE FILE THAT OWNS TRUTH, AND THEY WERE NEVER
VERIFIED.** `AUDIT.md:349` says Phase V exists to verify *"all known unverified `[x]` items from
ROADMAP.md"* — and those items just moved into BACKLOG PART TWO, where they read as settled history.
**The preamble says they are unaudited, but a preamble is weaker than a checkbox.** Marking the moved
completion claims with a distinguishing glyph — or a single line per section naming what evidence
exists — would keep the distinction visible. **Not done tonight because it is an audit and this was a
move**, which is the same boundary D24 drew.

**P3 — `BACKLOG.md` HAS PASSED THE SIZE WHERE ONE FILE IS OBVIOUSLY RIGHT, AND THE NEXT SPLIT SHOULD
BE BY AUDIENCE, NOT BY SUBJECT.** 3078 lines in two parts. **The failed split was by subject** (roadmap
vs backlog) and it produced two documents half-owning one question. **A split by audience would not
have that failure mode**: PART TWO is a lab record read by whoever is auditing a claim; PART ONE is
work read by whoever is choosing what to do next; `OPEN.md` is the owner's page. **Those three have
genuinely different readers and no overlapping ownership** — which is precisely why the old split
failed and this one would not. Offered as the shape to reach for **if** it grows again, not as work.
