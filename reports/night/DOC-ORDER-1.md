# DOC-ORDER-1 — the documentation

**Branch** `feat/doc-order-1` · **base** `master` at `b62ffc0b` · 2026-08-07
**Status** built and pushed. Docs-only; nothing merged.

**His order, in his own terms:** _"There must be documentation I can hand to a dev or an AI at any
time, even in two years, so that they know what the project is about, why some things were built the
way they were, and what the fixed points are."_ He was explicit that those are EXAMPLES, not a
definition, and asked me to decide as the expert and BUILD it.

**And the thing he said that shaped this most:** he never asked for most of the documents that exist.
**They accumulated as by-products of past work sessions.** The inventory below confirms it with
evidence — twenty of fifty-three were written as the output of one work session and never touched
again on their merits.

---

## Conformity, element by element, before any numbers

| the order asked                                          | done | note                                                                            |
| --------------------------------------------------------- | ---- | --------------------------------------------------------------------------------- |
| Stage 1 — inventory with evidence, before any edit          | yes  | §1. Evidence is git: creating commit, substantive-change date, inbound links.     |
| Stage 2 — decide the structure as the expert, say it plainly | yes  | §2, as a decided proposal. Then built.                                           |
| Stage 3 — implement, one coherent commit per move           | yes  | Five commits, each self-contained.                                               |
| Stage 3 — every surviving document says what it owns        | yes  | Twenty gained an `**Owns:**` line; eleven already had one.                        |
| Stage 3 — merging beats splitting                           | yes  | Two indexes absorbed and retired; four ownership boundaries named. §3.            |
| Stage 3 — reports NOT rewritten, one honest front page      | yes  | `reports/README.md` added; not one report edited.                                |
| Stage 4 — root README is the map, with a reading order      | yes  | §4. And it had a wrong port.                                                     |
| Stage 4 — CLAUDE.md points and duplicates nothing           | yes  | Lost its restatement of the ceremony checklist.                                  |
| Stage 5 — run the two-year test for real                    | yes  | §5. **It failed one of three questions.** Structure fixed, re-run, passes.        |
| Stage 5 — name the weakest spots bluntly                    | yes  | §6.                                                                              |
| Rule 1 — no knowledge lost                                   | held | §3.1 accounts for both retired files piece by piece.                             |
| Rule 2 — nothing invented; UNKNOWN where not recoverable      | held | One UNKNOWN recorded (the origin of "pulk").                                     |
| Rule 3 — owner verdicts sacred                               | **judgment call** | §3.3. Two German owner quotes collided with his no-German instruction. |
| Rule 4 — no config values, no fingerprints, no thresholds     | held | 0 config claims; the glossary states no number at all.                           |
| Rule 5 — docs-only, guards pass, links resolve, no fp moves    | held | §7.                                                                              |
| Rule 6 — stop at a coherent point                            | held | Stopped deliberately before merging ROADMAP/BACKLOG. §6.                          |

---

## 1. Inventory, with evidence

Fifty-three documents (`docs/**` = 50, root = 3), plus `reports/` as a whole. "Last substance" excludes
six mechanical guard sweeps that touched almost every file on 2026-08-06 without changing what any of
them said.

**The finding that decided the structure.** Twenty documents' last substantive change is
`docs: translate all German text in docs/ to English` (2026-05-26) — a bulk translation pass, not a
content edit. **Those twenty have had no substantive change in over two months and describe a system
that has since been rebuilt.** They were sitting in the same directory as the documents that describe
it now.

### Retirement list — what moved to `docs/archive/`, and why

| document                              | created by                        | last substance | overlaps / superseded by                | unique knowledge preserved |
| ------------------------------------- | --------------------------------- | -------------- | --------------------------------------- | -------------------------- |
| `diagnose/free-lane-separation-report` | one work session (PR #98)         | 2026-05-26     | the forces it studies are DELETED       | yes, in place              |
| `diagnose/free-lane-firing-summary`    | one work session (PR #98)         | 2026-05-26     | ditto                                   | yes, in place              |
| `diagnose/free-lane-force-attribution` | one work session (PR #98)         | 2026-05-26     | ditto                                   | yes, in place              |
| `diagnose/home-force-reduction-report` | one work session (PR #98)         | 2026-05-26     | home force is DELETED                   | yes, in place              |
| `diagnose/relaxed-defaults-report`     | one work session (PR #97)         | 2026-05-26     | values long superseded                  | yes, in place              |
| `diagnose/cleanup-audit-pr98`          | one work session                  | 2026-05-26     | —                                       | yes, in place              |
| `diagnose/camera-inventory-2026-05-14` | one audit commit                  | 2026-05-26     | `CAMERA_DIRECTOR.md`                    | yes, in place              |
| `diagnose/camera-framing-bug-diagnosis`| one audit commit                  | 2026-05-26     | `CAMERA_DIRECTOR.md`                    | yes, in place              |
| `diagnose/camera-pan-path-diagnosis`   | one audit commit                  | 2026-05-26     | `CAMERA_DIRECTOR.md`                    | yes, in place              |
| `diagnose/camera-pr102-bug-diagnosis`  | one audit commit                  | 2026-05-26     | `CAMERA_DIRECTOR.md`                    | yes, in place              |
| `CAMERA_TUNING_DIAGNOSIS`              | one PR (#75)                      | 2026-08-04†    | pre-corridor zoom model; self-declared HISTORICAL | yes, in place    |
| `camera-target-architecture`           | one refactor commit               | 2026-08-04†    | **self-declared SUPERSEDED**            | yes, in place              |
| `SPEED_REFACTOR_ANALYSIS`              | one diagnosis branch              | 2026-05-26     | self-declared HISTORICAL                | yes, in place              |
| `phase-2n/PHASE_2N_ALGORITHM`          | one work session                  | 2026-05-26     | `RACE-ACTION.md`                        | yes, in place              |
| `phase-2n/PHASE_2N_TUNING_LOG`         | one work session                  | 2026-05-26     | superseded values                       | yes, in place              |
| `internal/D3-5-1-diagnose`             | one feature commit (#39)          | 2026-05-26     | `RACER_DATA_MODEL.md`                   | yes, in place              |
| `audit/audit-pre-merge`                | one doc commit                    | 2026-05-26     | `AUDIT.md`                              | yes, in place              |
| `diag/render-smoothness-measurements`  | one closed PR (#80)               | 2026-07-29‡    | self-declared HISTORICAL                | yes, in place              |
| `STAGE-CLEANUP`                        | one cleanup stage                 | 2026-07-07     | self-declared HISTORICAL                | yes, in place              |
| `FORCE-PARITY`                         | one audit (INFRA 5B)              | 2026-07-25     | dated read-only audit                   | yes, in place              |

† header-only edit ‡ link-fix only

**Deleted, not archived — one file:** `docs/diagnose/README.md`. It was an index of a directory that
no longer exists. Its content is accounted for in §3.1.

**Looked archivable and is NOT — one file:** `docs/internal/README.md`. Same age, same shape, same
2026-05-26 last-substance date. But `SystemSettings.jsx` prints `docs/internal/current-config-snapshot.json`
**on screen**, so shipped UI instructs the owner to use that path. Moving it would have broken a live
instruction. It stayed, and is now listed in tier 2 with the reason attached.

**`reports/`, as a whole:** ~464 files. Owns the lab journal. Append-only by rule and therefore
guaranteed to contain stale statements. Three of its areas are indexed and guarded (`night/`,
`evolution/`, `parity/`); the rest are not. Not rewritten, per the order.

---

## 2. The structure — decided, then built

Three tiers, and the split is the point.

**Tier 1 — the project.** What a stranger needs. Orientation (3) · running and building it (5) · the
data model (4) · the race (5) · the camera (1) · limits and what is next (3).

**Tier 2 — how we work.** Ten documents that serve OUR PROCESS, not the product. Clearly marked as
such and placed below tier 1, which is his instruction that the process must not compete for a
reader's attention: verify rules, the ship ceremony, the sim, the sweep harness, seeds, tags,
lessons, the audit log, the Dev Panel inventory, the snapshot procedure.

**Tier 3 — history.** `docs/archive/` and `reports/`, both of which say in their first paragraph that
nothing in them is current.

**What I added, and why:**

- **`docs/GLOSSARY.md` — the single biggest gap, and the order named it.** This project's jargon is
  dense and nothing defined any of it. See §5 for what it caught.
- **`docs/archive/README.md`** and **`reports/README.md`** — a front page each, so neither pile can be
  mistaken for documentation.
- **A fixed-points list in `PROJECT-PRINCIPLES.md`** — added in stage 5, because the two-year test
  failed without it.

**What I judged NOT missing and did not create:** a separate DECISIONS document. `DEAD-ENDS.md`
already owns roads-not-taken with evidence, `LESSONS.md` owns the numbered learnings, and
`ARCHITECTURE.md` has a Key Design Decisions section. A fourth home would have been a fourth place to
look, and I could not have filled it without inventing rationale — which rule 2 forbids.

---

## 3. What was merged, and what it cost

### 3.1 No knowledge lost — the retired files, piece by piece

**`docs/diagnose/README.md` → `docs/archive/README.md`.** Every piece:

| piece                                                | where it went                                   |
| ---------------------------------------------------- | ------------------------------------------------- |
| Sprint 1 problem / method / result                   | archive README, "The diagnostic sprints"          |
| Sprint 2 problem / method / result                   | ditto                                             |
| Sprint 3 problem / method / result                   | ditto                                             |
| PR #97 relaxed-defaults summary                      | ditto                                             |
| PR #98 cleanup-audit summary                         | ditto                                             |
| the `.ndjson` traces were never committed            | ditto, "Raw traces are not here"                  |
| the two diag scripts recoverable at `c441e7c~1`      | ditto, verbatim                                   |
| the "Older sprints" pointer to render-smoothness     | ditto, in the Speed/phases list                   |
| _(new)_ why it is archivable at all                  | added: every force those sprints studied is now DELETED |

**`docs/internal/README.md`** — **not retired.** See §1.

### 3.2 Ownership boundaries named

Four pairs genuinely half-owned a subject. Each now states the boundary in its own first line:
ROADMAP owns the phases / BACKLOG owns the work inside them · SETUP owns running locally /
DEPLOYMENT owns hosting · SIM owns the simulator / SWEEP-HARNESS owns the stack above it ·
TRACK_LIFECYCLE owns storage / TRACK_EDITOR owns editing.

### 3.3 The one judgment call, and he can overrule it

His instruction: **no German words in the new structure.** Two living documents quote him verbatim in
German, and both quotes are the EVIDENCE for a design decision:

- `CONCEPT-COHESION.md` — _"um eine Bremse werden wir nicht weg kommen"_, the reason the bounded brake
  is kept as a fallback rather than a premise.
- `TAGS.md` — _"das ist nicht spannend"_, the reason the company guarantee exists at all.

Rule 3 says owner verdicts survive whole; his instruction says no German. **I translated both and kept
the attribution** ("in his words"), so the verdict survives and an English reader can read it. The
alternative — keeping the German alongside the translation — appeared to be exactly what he ruled out.
**If he wanted the original wording preserved, this is the line to reverse, and it is two edits.**

---

## 4. The entry point, and the thing it got wrong

Root `README.md` is now the map: what this is, how to run it, and the reading order below. `CLAUDE.md`
is the same door for an AI — it points at documents and duplicates nothing, which cost it its
restatement of the ceremony checklist.

**The reading path a newcomer follows, in order:**

1. `README.md` — what RaceArena is
2. `docs/SETUP.md` — get it running
3. **`docs/GLOSSARY.md` — the words** _(third on purpose; see §5)_
4. `docs/ARCHITECTURE.md` — how it is built
5. `docs/PROJECT-PRINCIPLES.md` — the rules, including the fixed points
6. `docs/FAIRNESS.md` — what the game is actually trying to do

Then by subject, and before changing anything: `DEAD-ENDS.md` and `SHIP-CEREMONY.md`.

**And the two-year test failed on step one.** The README told a newcomer to open
`http://localhost:3000`. `client/vite.config.js` pins the port to **5173**, and has for as long as
that file has existed. **The first instruction in the project did not work.** The same wrong port was
in `SETUP.md`, in `ARCHITECTURE.md`'s folder tree, in `internal/README.md`'s export procedure, and in
open backlog item Q-16 where it was the recommended CORS origin — five places, one of them a live
recommendation. All five corrected; SETUP.md now names the file that pins it, so the next reader can
check rather than trust.

---

## 5. The two-year test, run for real

Tier 1 only. Three questions.

**"What is the project?"** — **Answered**, from `README.md` alone: a browser-based racing-event
visualiser where an organiser picks racers and a track, and a TV-style camera director broadcasts the
race. Runs entirely client-side; a small local backend stores hand-drawn tracks.

**"Why is it built this way?"** — **Answered**, but only via a specific path. `FAIRNESS.md` is the
document that makes the design make sense: every racer is identical, so "fair" is about the DRAW being
blind to the start row, not about ability. Without that, `FORCE-MAP.md` and `PHASE-CONTRACT.md` read as
arbitrary machinery. This is why FAIRNESS is sixth in the reading order and not optional.

**"What are the fixed points?"** — **FAILED on the first run.** `ARCHITECTURE.md`'s invariants are
seven geometry rules; `PROJECT-PRINCIPLES.md` had ten principles that did not include one-fact-one-home,
never-mint-on-your-own-authority, sim-browser parity, a-racer's-name-is-physics, or the
guard-is-first-suspect rule. **Every one of those lived in tier 2 or `CLAUDE.md`** — documents a
stranger reading tier 1 has no reason to open. A stranger could break any of them without learning
they existed.

**Structure fixed, test re-run:** `PROJECT-PRINCIPLES.md` now owns a twelve-entry fixed-points list,
each one line, each pointing at its real home. Re-run: **answered.**

**What the glossary caught while being written** — three words each mean two unrelated things, and no
document warned anyone:

| word         | meaning A                                     | meaning B                                          |
| ------------ | --------------------------------------------- | -------------------------------------------------- |
| **corridor** | the camera's ZOOM UNIT (one track width)      | the race planner's OUTCOME steering WINDOW          |
| **band**     | a target-FINISHING-PLACE group (B1…B5)        | the natural SPEED range a random draw comes from    |
| **pulk**     | the middle PHASE of a race                    | the camera's battle GROUP                           |

Context is the only disambiguator. They are the first thing in the glossary, before the alphabet.

---

## 6. The weakest spots that remain — bluntly

1. **`BACKLOG.md` (1371 lines) and `ROADMAP.md` (618) still half-own "what is done and what is next".**
   I named the boundary instead of merging them, and that is the weakest thing in this delivery. A
   real merge is a day's careful work with a high chance of losing an item, and rule 6 said to stop at
   a coherent point rather than leave two documents half-owning a subject mid-move. **`BACKLOG.md`
   should eventually own both**, with ROADMAP reduced to a phase-status table.
2. **`LESSONS.md` is 3669 lines and unnavigable.** It is cited by number from everywhere, so it cannot
   be split casually. It needs an index by subject. **It should own that index itself.**
3. **`ARCHITECTURE.md` is 1175 lines and has become a catch-all** — folder structure, design decisions,
   the sprite-scaling pipeline, the speed pipeline, the race plan, the pre-OUTCOME shaping. At least
   the race-shaping half belongs to `RACE-ACTION.md` and `PHASE-CONTRACT.md`.
4. **`AUTH.md` (366 lines) documents something that does not exist.** It says so at the top. It is
   design work, not documentation of the project, and if it is not going to be built it should move to
   the archive. **His call.**
5. **`reports/` has ~464 files and four of its twelve areas have no index and no guard.** The front
   page says so honestly, which is the best that could be done without rewriting the journal.
6. **Nothing checks that a document's `**Owns:**` line is TRUE.** The tier split and the ownership
   lines are conventions a guard could enforce (every doc in `docs/` appears exactly once in the map,
   and has an Owns line) and currently nothing does. That is the natural next guard.

---

## 7. Verification

Docs-only. `npm run verify` selected the doc guards and skipped all three fingerprints, correctly —
no engine, camera or drawing file is in the diff, so **no fingerprint should move and none was run.**

- `check-doc-links`: **455 relative links across 54 living docs, 0 dangling**
- `check-config-claims`: **0 current claims**
- `check-tags`: 67 tags, 0 unregistered, 0 missing
- `check-index`: both directions clean on all three indexed report areas
- Pre-commit guards: PASS 6, FAIL 0 on every commit

---

## 8. In plain language

**How many documents were there:** 53 (50 under `docs/`, 3 at the root), plus ~463 reports.

**How many are there now:** **54** — but the shape is different, and that is the number that matters:

- **31 living documents** under `docs/`, split into **20 about the project** and **10 about how we
  work**, plus the map itself.
- **21 in `docs/archive/`**, which say in their first line that they are history.
- **2 at the root** — `README.md` and `CLAUDE.md`, the two doors. There were three; the German-named
  force map moved into `docs/` as `FORCE-MAP.md`.
- **~464 reports**, untouched, now with one honest front page.

Net: one document deleted, three written (the glossary and two front pages), twenty moved to history.

**What you can hand to a stranger:** the root `README.md`. It gives them what this is, a working
command to run it, and a six-document reading order that ends with them understanding what the game is
actually trying to do. The third document in that order is the glossary, because this project's words
are what they will fail on first — and while writing it I found three terms that each mean two
different things, which nothing had ever written down.

**What you have to decide:** whether to keep your two German quotes translated (§3.3, two edits to
reverse), whether `AUTH.md` should be archived since it documents something unbuilt (§6.4), and
whether BACKLOG should eventually absorb ROADMAP (§6.1).

## 9. What I did NOT do, and why

- **Did not merge `ROADMAP` into `BACKLOG`.** §6.1 — too large to do safely inside this block, and a
  half-done merge is worse than the boundary I named instead.
- **Did not rewrite, reorder or edit a single report.** The order forbade it.
- **Did not split `LESSONS.md`.** It is cited by L-number from across the codebase; splitting it would
  break every citation.
- **Did not archive `AUTH.md`** despite it documenting something unbuilt. That is a decision about
  intent, not about documentation, and it is his.
- **Did not build a guard for the tier split.** §6.6 — named as the next one, not built here, because
  a guard written in the same block as the convention it checks marks its own homework.
- **Did not touch port 5173 or the dev server.** Part 1's eye test still owns it.
