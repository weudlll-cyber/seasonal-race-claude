# AUDIT-DOCS-1 — 2,789 claims checked, 2 false, and the shape that keeps escaping

**Measured 2026-09-04 on master `96c77f6f`.** Piece 2 of THE FULL AUDIT. Every number is from a
mechanical pass over the tree, and every candidate the pass raised was judged by hand at the source.

> **VERDICT ON THIS AXIS: CLEAN.** **2,789 checkable claims, 2 false — 0.07%.** Both are two days
> old or less, both were corrected here, and both had exactly one second site apiece, both swept.
>
> **The previous passes found 97 false at a median age of 43 days, then 3 in three days. That has
> held.** The rate is now under a tenth of a percent and the residue is young, which is what a
> document estate looks like when it is being maintained rather than accumulated.
>
> ★ **Both false claims are the SAME SEARCH SHAPE** — a term used correctly elsewhere in the very
> same file and wrongly once. That is the residue the constraints predicted, and it is the only
> shape left. §3.

---

## 1. WHAT WAS CHECKED, AND HOW

**Scope: the 40 tracked living documents** — `docs/*.md` (36), `docs/internal/README.md`, `README.md`,
`CLAUDE.md`, `.github/copilot-instructions.md`. Reports are append-only by rule and out of scope;
`docs/archive/` declares itself historical.

*(`night-task.md` was in the first pass's scope and was **removed from it**: it is **gitignored and
untracked** — a scratch brief for the night-run launcher, which `CLEANUP-2026-08-24` already judged
"deliberately ignored; not mine to remove". It is not a document of this repository.)*

| claim class | checked | false | how |
| --- | ---: | ---: | --- |
| **PATH** — a backticked repo path | 735 | **1** | resolved against every tracked path and directory, with suffix matching |
| **COMMAND** — `npm run X`, `node scripts/X.mjs` | 94 | 0 | against the three `package.json` script sets and the filesystem |
| **SYMBOL** — a backticked identifier | 1,734 | 0 | against every identifier in every tracked source file |
| **LINE CITATION** — a `#L<n>` deep link | 113 | 0 | against the target file's real length |
| **COUNT** — a number about a countable thing | 113 | **1** | by counting the thing |
| **TOTAL** | **2,789** | **2** | |

**Four rules already cover a slice of this and were not re-implemented** (constraint 3): `check-doc-links`
(691 relative links, 0 dangling), `check-config-claims` (170 keys, 0 current claims),
`check-doc-facts` (the fairness threshold), and `check-fallback-agreement` **Rule F** (69 *paired*
symbol citations, 0 disagreeing). Everything measured above is the part **outside** those four.

---

## 2. THE TWO FALSE CLAIMS

### ① `docs/PROJECT-PRINCIPLES.md` — a live rule pointing at a directory that does not exist

> *"Persistent diagnose results belong in Markdown reports under `docs/diagnose/`…"*

**`docs/diagnose/` has not existed since its index was archived** — `docs/archive/README.md` records
it as *"the index that used to live at `docs/diagnose/README.md`"*. Diagnose reports go under
`reports/`, in a directory `check-index` knows about, and **every one written since has gone there.**

**Corrected**, pointing at `reports/`, with the reason inline.

**SECOND SITE, swept and found:** `.gitignore` still carried `docs/diagnose/*.ndjson` — an ignore
rule for a directory that is gone. **Removed with the reason.** The other four mentions
(`AUDIT.md` ×1, `LESSONS.md` ×3) are **dated log rows and correct as history**; `AUDIT.md`'s own
header says every row is history and not a claim about now.

### ② `docs/API.md` — a route listed as undocumented in the file that documents it

> *"Missing entirely: `/api/auth`, `/api/users`, **`/api/surface-classes`**, …"*

**`§Surface-Class API` sits two screens below and documents all five of its routes.** The "13
described" figure standing beside the list already counted them, so the block contradicted itself
and its own arithmetic.

**Age: two days.** It was written on 2026-09-02 by DOC-TRUTH-2 — a correction that introduced a
smaller error while fixing a larger one.

**All three of its counts were re-measured today and all three still hold:** the server mounts
**8** API routers registering **49** routes (counted from `app.js` and every `router.<method>(`
registration), of which **36** are undocumented. **Corrected**, and the list now reads six routers,
not seven.

---

## 3. ★ BOTH FAILURES ARE ONE SEARCH SHAPE, AND IT IS THE LAST ONE LEFT

Neither was found by reading. Both were found by **resolving every token against the tree** and then
judging what fell out.

| | why a search missed it |
| --- | --- |
| `docs/diagnose/` | the term is **correct in four places and wrong in one**. A grep for it returns five hits and four are legitimate history — the wrong one is not distinguishable without opening each |
| `/api/surface-classes` | **wrong in a list, right in a heading of the same file, 30 lines apart.** Any search for the term finds the correct use first |

**This is the residue the standing constraint predicted**, and after this pass it is all that was
left: *a word that occurs correctly thirty times and wrongly once*. The counter-measure is not a
better grep — it is **resolving the claim against the thing it claims**, which is what the passes
above do and what no amount of reading achieves.

---

## 4. ★ WHAT IS UNDOCUMENTED

### Subsystems with no document

**76 of 284 source files (27%) are never named in any living document.** By area:

| area | files | reading |
| --- | ---: | --- |
| `screens/RaceScreen` | 15 | the biggest gap, and it is the biggest screen — HUDs, overlays and drawing helpers |
| `server/src` | 10 | **the one that matters**: `staticClient.js`, `dataPaths.js`, `startupReadiness.js`, `seedNotices.js`, and the `brands` / `playerGroups` / `seedNotices` / `usersRouter` routes — **exactly the surface piece 8 has to audit, and none of it is described anywhere** |
| `screens/DevScreen` | 7 | control sections; `DEVSCREEN-INVENTORY.md` covers the race-dynamics ones only, and says so |
| `modules/track-effects` | 7 | the seven particle effects (rain, dust, stars…) — self-describing, low value |
| `screens/SetupScreen` | 5 | |
| components / services / other | 32 | UI primitives (Button, Modal, InputField) and API clients |

**The honest reading: most of the 76 do not need a document.** A `Modal` and a `bubbles.js` are
self-describing. **The exception is `server/src`** — ten files including the static-file server, the
data-path resolver and four route modules, none of which any living document describes. That is a
finding, and it is handed to piece 8 rather than repaired here.

### Documents describing things that no longer exist

**None found that does not already say so.** Three were suspected and all three turned out to be
correct:

- `TRACK_LIFECYCLE.md`'s Code-Bundle procedure — carries a **⚠ banner** saying TLH-3 is deferred and
  `defaultTracks.js` does not exist (DOC-TRUTH-1, 2026-09-02).
- `FORCE-MAP.md`'s home-force, avoidance and priority-mode sections — every one is headed
  **REMOVED**, and the absent config keys are absent *because* of that.
- `ARCHITECTURE.md`'s Code-Bundle row — reads **NOT BUILT** and names the owner document.

★ **All three fooled the automatic pass in the same way**, and it is worth recording as the
measurement's own error bar: **the document marks the removal at the SECTION level and the checker
reads a LINE.** A line-scoped negation test cannot see a banner four lines above. That is why every
candidate here was opened by hand, and why the "false" column is 2 and not 76.

### Rules that live only outside the repository

**One, and it is the class the brief warned about.** `.github/copilot-instructions.md` carries
working rules — never create `docs/handoff-notes.md`, handoff is chat-only — that appear in **no**
repository document. It is tracked, so it is not outside the tree; but it is outside the documented
set, nothing points at it from `docs/README.md`, and a reader following the reading order in
`CLAUDE.md` will never meet it. **Reported, not moved:** deciding where a rule lives is his.

*(The briefs that drive these chains are genuinely outside the tree and cannot be audited from
inside it. That is a permanent limit, not a finding.)*

---

## 5. WHAT THIS PIECE DOES NOT COVER

- **A citation pointing at the WRONG LINE INSIDE a file is invisible.** The 113 line citations were
  checked for *past end of file* and *missing target* only — both zero. `VERIFY-RULES` already
  states this is permanent for bare line citations; Rule F's paired form is the answer and it is
  opt-in at 69.
- **Prose claims are not checked.** "About seven seconds", "most of the time", "this is the only
  place" — a mechanical pass cannot resolve them, and there is no count for how many exist.
- **Reports were not audited.** 851 of them, append-only by rule; their errors belong in the INDEX
  corrections block. **None was found needing one during this pass**, but none was sought either.
- **Completeness was not judged.** A document that is true and says nothing passes every check here.
  §4 is the nearest thing to a completeness measure and it counts *mentions*, not *adequacy*.
- **The two false claims were found by two passes that between them cover five claim classes.** A
  sixth class nobody has thought of would not appear in the 0.07%.
