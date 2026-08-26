# OWNER-FINDINGS-2026-08-25 — the day's findings, collected into one place he can work down

**Date:** 2026-08-26 · **Branch:** `docs/owner-findings-2026-08-25` (off `master`) · **Piece 8 of
NIGHT-2026-08-25** · **Verdict:** COLLECTION ONLY. **No work is proposed and no verdict is invented.**
The deliverable is the new dated section in [docs/BACKLOG.md](../../docs/BACKLOG.md); this report says
what was gathered, what was linked rather than copied, and what was deliberately left out.

---

## 1. WHAT WAS ASKED, AND WHERE IT LANDED

He asked to have the day's findings collected so they can be tackled one by one. **They are now one
section in `docs/BACKLOG.md`** — *"The night of 2026-08-25 — everything established, in one place"* —
placed at the head of PART ONE's open items, immediately above the section that owns the track-delivery
subject.

**Thirteen items.** Each carries exactly three things, and nothing else:

1. **what it is**, in one plain sentence;
2. **what establishes it** — a report link or a source address, never a restatement of its tables;
3. **what it needs next** — one of **MEASURING**, **BUILDING**, or **ONLY HIS WORD**.

**The third field is the point of the exercise.** Six items need only his word; three need building;
one needs measuring when he wants it; three need nothing on their own and exist as context for an item
above them. **He can therefore read the section once and know which six are his to decide and which
four are ours to do.**

---

## 2. THE THIRTEEN, AND WHAT EACH NEEDS

| # | finding | needs |
| --- | --- | --- |
| 1 | the merge gate stopped gating on 2026-08-18 | **his word** |
| 2 | two files still document the flag that commit removed, and one schedules on it | building |
| 3 | a sweep cell that returns 0 still prints a number and exits clean | building |
| 4 | the canonical silent zero healed by accident and can return | context for 3 |
| 5 | the harness runs a camera the product cannot produce; 19 instruments affected | **his word** |
| 6 | the arbiter cannot see anything that ships as data | building |
| 7 | the render fingerprint is blind to the run-in | **his word** (repair) + building (guard) |
| 8 | the harness's 200 s ceiling and hardcoded lap count | measuring, when he wants it |
| 9 | the run-in's hard admit against its eased release | **his word** |
| 10 | the chance test is already in his tree, pointed backwards | context for 9 |
| 11 | at every crossing the aim is thrown out and takes ~1.5 s to come home | **his word** |
| 12 | a seed is one of nine inputs, not six | **his word** |
| 13 | a shipped track change still reaches nobody, confirmed again | **his word** |

**All eight subjects the brief named as mandatory are present**: the gate (1), the undelivered track
change with no way back to the seed (13 + 12), the arbiter and routing (6), silent harness zeros (3),
the harness camera seed (5), the render fingerprint (7), the 200 s ceiling and hardcoded lap count
**with his judgement attached** (8), and the run-in's hard admit against its eased release (9).

**Five more were established today and are in as well** (2, 4, 10, 11, 12) — the stale scheduling
comment, the accidental healing of garden-path, the contention watch pointed backwards, the crossing
excursion, and the corrected input count.

---

## 3. ONE HOME PER SUBJECT — what was linked, and what was corrected

**Two subjects already had homes and were NOT copied.**

- **The undelivered track change** already owns a section — *"A shipped track change never reaches an
  existing installation (2026-08-25)"*. Item 13 states tonight's fresh confirmation in one sentence
  and **points at that section as the owner of the subject** rather than restating its three
  source-read facts.
- **The seed identity** already owns *"A seed alone does not reproduce a race (2026-08-23)"*, which
  says the seed is **one of six inputs**. RACE-IDENTITY-1 established **nine**.

**That second one is a correction to a live document, not a new entry, so it was made in place.** A
four-line note was appended to the older entry: the count is nine, the three additions are named, two
of them are stored host preferences, and **nothing else in that entry is withdrawn**. **The backlog is
explicitly a living list — its PART ONE is "everything still open" — so correcting a number there is
maintenance, not rewriting history.** The append-only rule governs `reports/`, and no report was
touched.

**One thing deliberately not done:** the two entries were not merged. The older one owns the *general*
finding and the newer section owns *tonight's*; folding them would have destroyed the dating that makes
either legible.

---

## 4. WHAT WAS LEFT OUT, AND WHY

**No work is proposed anywhere in the section.** Every report behind these items carries proposals —
five in GATE-RED-1, four in HARNESS-LOUD-ZERO-1, four in ENGINE-REACH-DATA-1, four in
RENDER-FINGERPRINT-BLIND-1, five in RUNIN-CHANCE-SET-1 — **and not one of them is repeated in the
backlog.** The brief was explicit and the reason is sound: a proposal in a backlog reads as a decision
already taken. **The `NEEDS:` field names the KIND of next step and never the step itself.**

**No verdict was invented.** Where a report could not settle something, the backlog item says so — item
8 carries his own judgement that it is not urgent, item 4 says it needs nothing on its own, item 7
splits into the half that needs his word and the half that does not.

**Three things were deliberately excluded:**

- **Anything from the RUNIN-CHANCE-SET-1 measurement that is a NUMBER rather than a finding.** The
  30-to-18 step count, the 2.28 s warning, the fade cost — these live in the report and are linked, not
  copied. Copying a table into a backlog is how a number acquires two homes.
- **The night chain's own process observations** — that a `nohup` background job does not survive the
  tool call, that two sweep drivers competing halved throughput. Real, and about my working method
  rather than about the product.
- **The three forks named as out of scope**, which are on the morning sheet with one question each and
  are not backlog items until he answers them. Items 1, 5, 9, 11, 12 and 13 are the backlog's record
  that the *findings* exist; the *questions* live on the sheet.

---

## 5. SOURCE HYGIENE

**Every item's evidence is a link or a source address.** Where a source address is given —
`raceDriver.mjs:303`, `:185`, `render-fingerprint.mjs:445`, `CameraDirector.js:2619`,
`scripts/verify.mjs:246`, `.github/workflows/ci.yml:184`, `seedRuntime.js:36` — it was read tonight in
the piece that established it, not recalled.

**No number in the backlog section is new.** Every figure quoted (1,006 ms / 4,979 ms; 44 callers and 1
reader; 43 of 53; 30 races; 2,427 px; 3.4% and 7 a month; 0 of 1,140) appears in a merged report on
master and is attributed to it.

**The `verify:` convention was followed.** The section carries one section-wide line — *"none — nothing
in this section is a change"* — rather than a copy on each of thirteen items, which is what the file's
own header asks for: *"Where a whole section shares one reason, it is stated once at the section head
rather than copied onto every item — copying it would suggest each was considered separately, and that
would not be true."*

**Not run, and why (R15):** no fingerprints, no browser gate, no client suite, no server suite. This
piece changes one Markdown file under `docs/` and adds one report; no guard reads either.

---

## 6. CONFORMITY

| the brief asked | delivered |
| --- | --- |
| LAST, after the pieces above, so it can point at their reports | Yes — all seven merged before this branch was cut; every item links a report already on master |
| gather every defect and open question established on 2026-08-24 and 2026-08-25 into ONE place in `docs/BACKLOG.md`, dated | §1 — one dated section, thirteen items |
| each with: what it is in one plain sentence | Yes — every item opens with a bolded single sentence |
| what establishes it (a report or a source address, never a restatement of its tables) | §5 — links and addresses only; no table copied |
| whether it needs measuring, building, or only his word | §2 — an explicit `NEEDS:` on every item |
| NO WORK IS PROPOSED and no verdict is invented | §4 — 22 proposals across the source reports, none repeated |
| must include the eight named subjects | §2 — all eight present, with the 200 s ceiling carrying **his own judgement** as instructed |
| anything else established today goes in too | §2 — five further items (2, 4, 10, 11, 12) |
| where a finding is already recorded, LINK it — one home per subject | §3 — two subjects linked; the seed count **corrected in place** rather than duplicated |
| report + the backlog edit in the same piece | This branch carries both |

---

## WHAT OUTLIVES THIS REPORT

**Six of the thirteen need nothing but a decision.** That is the useful shape of the night: the work
that could be done without him was done — one build, six diagnoses — and what remains is not blocked on
effort but on judgement.

**And four of the thirteen are the same defect in four costumes.** The gate that documents a flag it no
longer has (1, 2); the arbiter that answers a narrower question than it is read as answering (6); the
render fingerprint that kept a literal the game had already replaced (7); and the harnesses that
cannot say a cell was empty (3). **In every one of them a guarantee had more than one owner, and the
copy that stopped being true was not the copy anyone read.** That is the project's own
one-canonical-home rule, failing in the tooling rather than in the config — and it is worth him seeing
the four together, which is the strongest argument for having collected them onto one page at all.
