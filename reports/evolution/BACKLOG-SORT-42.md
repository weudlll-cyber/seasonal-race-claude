# BACKLOG-SORT-42 — the last unknown mass in the backlog, sorted

**Branch:** `docs/backlog-sort-42` off master `2e65e756`. **Documents only.** No source changed.
**NIGHT-2026-08-23, piece 2.**

BACKLOG-HONEST-1 sorted 86 survivors into three buckets and **left 42 unsorted, saying so rather than
sweeping them into "too large"**. They are the `Q-`/`B-`/`V-`/`T-` bullets in *Planned — needs spec*
and *Order of Next Steps*. This piece reads each one against today's tree.

---

## 1. What the 42 turned out to be

**EIGHT OF THE 42 WERE NOT OPEN WORK AT ALL — and four of those were answered by things that already
happened.** The rest are genuinely open, and are now sorted.

| verdict | n | items |
| --- | --- | --- |
| **ALREADY DONE** | 1 | `B-2` |
| **SUPERSEDED** | 3 | `Q-12`, `Q-18`, `Q-27` |
| **ALREADY ANSWERED** | 3 | `V-3`, *Background cache*, `D7d` |
| **NEVER TRUE** (a claim inside an item) | 1 | *Order of Next Steps* #18 — "wiring missing" |
| **CANNOT ESTABLISH** | 1 | `Q-19` — unchanged, already recorded as such on 2026-08-23 |
| **STILL OPEN** | 33 | the remainder |

**And two structural defects were found that are worth more than any single item.**

**`Q-20` NAMED TWO DIFFERENT ITEMS.** One is a track-editor hint for a missing background; the other
is crash-resistant cleanup in a server test. **Two items under one id is a lookup that silently
returns the wrong one** — and both were live, so any reference to "Q-20" for the last fifteen months
was ambiguous. Renamed **`Q-20a`** and **`Q-20b`**, with the rename recorded at the item.

**THE SECTION-WIDE `verify:` CLAIM WAS TOO BROAD.** *Planned — needs spec* declared that **no**
`verify:` line is possible for any item in it, because the items have no spec. **That was doing
double duty**: it described items nobody had thought through *and* items nobody had checked. A dozen
of them name a file, a key or a function and are decided by a one-line command — which is exactly how
four of the eight closures above were found. The paragraph is corrected to cover only the items that
still have none, and the per-item lines take precedence.

---

## 2. The eight that were not open work

**Every one is a LEAD confirmed at source, never a report or a tag taken at its word.**

### `B-2` — ALREADY DONE

**Closed by `5bde5a94` (QUIET-FAILURES-1, 2026-08-17).** Confirmed at source:
`SetupScreen.jsx` computes `selectedGeometryReady` from `getTrack(geometryId)` — **the cache, not the
summary** — and gates `canStart` on it. A track whose geometry is missing is **refused with a reason**
rather than started.

**Why it mattered, kept as the general rule:** a missing geometry resolved to `false` = CLOSED, so an
**open track quietly ran as a laps race** — right name, right picture, wrong race, no message
anywhere. **Where there is nothing honest to guess, refuse rather than default.**

### `Q-27` — SUPERSEDED, and the number was understated

Written as *"~11.7 MB uncompressed PNGs"* with pngquant/tinypng named as the fix.
**There are ZERO PNG backgrounds.** `server/data/backgrounds/` holds **13 files, all `.jpg`**. The five
named tracks total **21.23 MB** — nearly double the recorded figure — and the directory is
**60.45 MB**.

**So the fix as written cannot be executed** — there is nothing to run pngquant over — **while the
concern it was raised for is larger than recorded.** This is the one closure that leaves *more* work
behind than it found, which is why it is SUPERSEDED and not struck.

### `Q-12` — SUPERSEDED by a removal that already happened

Its premise is *"tracks now store data-URLs (1–5 MB possible)"*. **They do not.**
`git grep -n "data:image" -- client/src/modules/storage client/src/modules/track-editor` returns
nothing, `trackCache.js` is still deleted, and backgrounds are served as server files. **The
background-cache removal of 2026-06-18 (L.4-BgCacheRemoved) — recorded two entries above Q-12 in the
same section — took the premise away**, and nobody connected the two.

### `Q-18` — SUPERSEDED by his own decision

It asks for RaceScreen integration-test infrastructure. **Decision D2 (2026-08-23)**: *"`RaceScreen`
is not testable — the finding STAYS, nothing is done."* **Q-18 asks for precisely the work D2
declines.** Recorded as superseded rather than closed, because the finding underneath is still true.

### `V-3` — ALREADY ANSWERED

*"Result screen winner count (configurable?)"* — **yes.** `winners` is a `defaults.js` key with a
DevScreen control and an InfoTooltip in `RaceDefaults.jsx`, decrement guarded at 1. **The question has
an answer at source; there is no work in it.**

**AND THE BACKLOG ALREADY KNEW.** PART TWO's Phase V block states plainly: *"V-3 was answered by the
config."* **I found that only after reaching the same verdict from source** — which is corroboration
rather than embarrassment, but it is also the second time in this piece that **an answer already
written down was sitting in a different section from the question.** See the one-home finding in §5.

### *Background cache* and `D7d` — ALREADY ANSWERED, and already said so

Both already carried their answers (the 2026-06-18 removal; his decision D18 of 2026-08-23
downgrading D7d to an observation). **They are counted here because they were inside the unsorted 42,
not because anything about them changed.** No edit was made to either.

### *Order of Next Steps* #18 — NEVER TRUE

*"Backup/export (B-5) — UI exists, wiring missing."* **The wiring exists**: `SystemSettings.jsx`
calls `exportAllStorage`, `importAllStorage` and `exportDiagnosticSnapshot`, downloads a
`racearena-backup-*.json` and re-seeds defaults on reset. **B-5 is an unperformed VERIFICATION, not
unbuilt wiring** — a much cheaper item than it has been advertised as since it was written.

---

## 3. Three items that got cheaper once they were read

**These stay open. What changed is what they cost.**

| item | was | is |
| --- | --- | --- |
| `Q-13` sprite stutter | "structural solution in PR-E" | **The code half SHIPPED** — `maxTargetScreenPx` is live in `autoSpriteScale.js` as the CEILING term. Its own closing condition was *"PR-E + browser verification"*. **PR-E is in; what is left is an EYE-TEST, not code.** |
| `V-1` PlayerSetup | "cannot start until B-1 lands" | **B-1 shipped** in the B-Wave (PR #25, `697e081`). **The blocker is gone** — it is an unperformed verification of shipped work. |
| `V-2` TrackSelector | "cannot start until B-2 lands" | **B-2 is closed** (above). Same: unperformed verification, not blocked work. |

**And one item gained a template.** `B-UX-MinMax` asks for an inline min/max warning in two sections.
**`DynamicsTuningSection.jsx` already renders one** — *"Invalid: min must be > 0 and < max."* Neither
named section has it. **The work is to apply an existing pattern twice, not to invent one.**

**Phase T is three-quarters done and nobody recorded it.** `InfoTooltip` counts: RaceDefaults **8**,
TrackManager **10**, BrandingProfiles **8**, SystemSettings **0**. **T-4 is the only one genuinely
untouched.** The other three are **left open rather than struck**, because the phase's closing
condition is *"all fields that are unclear without a label"* and **which fields are still unclear is
his judgment, not a grep's** — but the evidence is now attached so the judgment is cheap.

---

## 4. The survivors, sorted

**NEEDS HIS WORD** — a decision, a vision call or his eye; no amount of reading settles them.

| item | the one thing he decides |
| --- | --- |
| `B-UX2` dev-screen cleanup | the structure — his own finding is that values are hard to contextualize |
| `B-UX4` sprite size overhaul | three named alternatives; the item itself says "needs vision discussion" |
| `Q-27` background weight | re-spec or drop — the old plan cannot be executed |
| `Q-13` sprite stutter | **an eye-test on a 6000-track race**; the code is in |
| `T-1` / `T-2` / `T-3` | which fields are still unclear — tooltips are present |

**SMALL AND SELF-CONTAINED** — a command decides them and the change is local.
`D3.6` · `B-UX-Pause` · `B-UX-MinMax` · `B-5` (verify only) · `Q-20a` · `Q-20b` · `Q-21` · `Q-22` ·
`Q-23` · `Q-24` · `Q-29` · `T-4` · `V-1` · `V-2` · `V-5` · `V-6` · `V-7` · `V-8` · `V-9`

**TOO LARGE FOR A NIGHT** — with the reason, since BACKLOG-HONEST-1 refused to claim this without one.

| item | why |
| --- | --- |
| *Surface Zones* | a track-editor drawing tool **plus** a new engine API (`getZonesAtPosition`) |
| `D8` full racer editor | coats UI + sprite-swap UI; the partial shipped, the rest is a screen |
| `B-UX-ManualFocus` | ~150–200 LOC **and a new CameraDirector state** — the most defect-prone module in the tree |
| `B-UX3` variable documentation | a per-parameter reference for 30+ values; a sprint, not a task |
| *Dual particle consolidation* | **blocked by design** — it is gated on Surface Zones by its own text |

---

## 5. Source hygiene

**Documents only.** `docs/BACKLOG.md` is the single file changed besides this report and the INDEX.

- **Lines:** `docs/BACKLOG.md` 2323 → 2412 (**+128 / −39**). Nothing was deleted outright.
- **Struck IN PLACE with what closed them and when:** `B-2`, `Q-12`, `Q-18`, `V-3`. **Each carries the
  sha or the decision id and the date**, per the rules in force.
- **Reasoning that states a general rule KEPT:** B-2's *refuse rather than default*; Q-12's
  *localStorage is not an image store*; V-5's *"data loss risk"* note, which is the reason B-5 is worth
  doing and was already deliberately kept.
- **Renamed:** `Q-20` → `Q-20a` / `Q-20b`, with the rename and its reason recorded at `Q-20b`.
- **One home per subject:** *Order of Next Steps* #18 is marked a **status echo** pointing at the live
  `B-5` entry — the same treatment `D7d` already carries.
- **`verify:` lines added:** 14 (`B-2`, `B-5`, `Q-13`, `Q-20b`, `Q-21`, `Q-22`, `Q-24`, `Q-27`, `Q-29`,
  `V-1`, `V-2`, `V-3`, `T-1`–`T-4`, `B-UX-MinMax`, `D3.6`, *Surface Zones*, `D8`). **Every one was RUN
  before it was written and every one holds** — a `verify:` line that fails is worse than none (R11).
  Two state that no mechanical check can exist (`V-1`, `V-2` — manual UI checks) rather than inventing
  a command that cannot fail.
- **No value restated.** `winners` and `maxTargetScreenPx` appear by NAME; measured file sizes and LOC
  counts are measurements, not `defaults.js` values.
- **A CORRECTION I MADE TO MYSELF BEFORE COMMITTING, recorded because the process is the point.** I
  first wrote that `V-2`'s parenthetical names `V-4↔B-4`, "a pair that appears nowhere else in the
  file", and left it as a noticed-but-left item. **That was an absence claim I had not run**, and it
  is false: **both exist in PART TWO** — `B-4` struck at `docs/BACKLOG.md:2270`, `V-4` struck at
  `:2403`. The cross-reference is **valid** and points at closed work. **Nothing was left alone; there
  was nothing wrong.** The brief's rule — an absence claim is re-established over the whole tree,
  never asserted — caught this one, and only because it was run before the commit rather than after.
- **Noticed but left alone (the real one): PHASE V HAS TWO HOMES.** The *items* `V-1`, `V-2`, `V-3`,
  `V-5`–`V-9` live in PART ONE; the *analysis of which of them are independent work* lives in PART TWO
  under its own "Phase V (Verification Sprint)" heading, together with the struck `V-4`. **Left
  because merging them is a restructure of two large sections and this piece's job was to sort 42
  items, not to move a phase** — but it is a one-home violation and it is proposed below.
- **Absence claims re-established over the whole tree**, never inherited: `racer-configs`,
  `getZonesAtPosition`, `RangeSliderSection`, `trackEditor:draft`, `data:image` in the storage layer,
  `process.on` in the server test, and `.png` in the backgrounds directory. **All by `git grep` or
  `ls`, never a shell glob**, and each on a pattern that demonstrably matches elsewhere.

---

## 6. Build-vs-spec conformity

1. **The brief's order of questions was followed and it paid.** Asking *"does the record already say
   it was settled?"* first found `Q-18` (decision D2) and *Background cache* without touching source;
   asking *"does the source already do it?"* second found `B-2`, `V-3` and `Q-12`. **Only `Q-27`
   needed a third pass**, because its answer was neither — its premise had rotted.
2. **A LEAD WAS NEVER TAKEN AS A VERDICT.** `B-2`'s closure came from a commit subject; it is recorded
   only after reading `SetupScreen.jsx` and finding `selectedGeometryReady` gating `canStart`. The
   commit told me where to look, not what to conclude.
3. **Two items were NOT struck although the evidence would have allowed it.** `T-1`/`T-2`/`T-3` have
   the tooltips the phase asked for. **Their closing condition is a judgment about which fields remain
   unclear, and that is his.** Conservative option taken at the fork, as the brief directs.
4. **The count is 42 and it is reconstructed, not inherited.** Phase D 3 (D7d excluded — already
   settled) + Phase B 8 + Phase Q 17 + Phase V 8 + Phase T 4 = 40, plus the two live *Order of Next
   Steps* entries that are not echoes (#15 camera-phase remainder, #23 Phase 5 VPS) = **42**.
5. **R15 — documents only, so the gate set is the doc guards and nothing else.** No fingerprint, no
   client suite, no browser gate and no race can have changed its answer: no file any of them reads
   was touched. **This is why the piece could merge while PIECE 1's sweep ran** in its own worktree.
6. **Ran alongside the sweep.** Every finding here is a file read or a `git grep`; **nothing was timed**,
   so machine load cannot have affected any of it.

---

## 7. Proposals

**P1 — THE ID COLLISION WAS INVISIBLE BECAUSE NOTHING CHECKS IDS, AND THERE ARE FOUR NAMESPACES.**
`Q-`, `B-`, `V-`, `T-` are hand-assigned in a 2400-line file. `Q-20` was used twice and survived
fifteen months. **A guard that extracts every `**X-N**` bullet id and fails on a duplicate is a dozen
lines and cannot produce a false positive** — a duplicate id is never correct. It is the cheapest
guard in this report and the only one whose absence has already cost something.

**P2 — "NO SPEC" AND "NOT CHECKED" ARE DIFFERENT STATES AND THE BACKLOG CONFLATES THEM.** The
section-wide `verify:` claim was true of some items and false of a dozen, and the false half hid four
settled questions. **The distinction is worth a section split** — *needs a spec* (nobody has decided
what it is) versus *needs a check* (we know exactly what it is and nobody has looked). **Only the
first is genuinely unverifiable.** Not proposed as tonight's work; proposed as the shape the next
edit should leave behind.

**P3 — THE STALEST-LOOKING ITEMS KEEP BEING THE SETTLED ONES, AND THAT IS NOW TWICE OBSERVED.**
BACKLOG-HONEST-1 found four of eleven closures in the block that looked most abandoned; this piece
found five of eight in items dated 2026-05. **The pattern is not that old items rot — it is that old
items get FIXED IN PASSING and nobody walks back to the list.** A cheap counter-measure exists and
costs nothing at the time: when a commit closes something a backlog item describes, name the item id
in the commit subject. `B-2` would have been struck on 2026-08-17 for the price of six characters.

**P4 — PHASE V IS SPLIT ACROSS PART ONE AND PART TWO, AND THAT IS WHY V-3 WAS ANSWERED TWICE.** The
items sit in PART ONE; the paragraph saying which of them are not independent work — and that *"V-3
was answered by the config"* — sits in PART TWO beside the struck `V-4`. **So the question was open in
one section and answered in another, and both were true readings of the file.** Twice in this piece an
answer was found in a different section from its question (`Q-12` and the background-cache removal
were three entries apart in the *same* section). **The fix is not a rule, it is one edit**: move the
PART TWO analysis paragraph up to the PART ONE Phase V heading, leaving only the struck `V-4` below.
Not done here because it is a restructure and this piece was a sort.

**P5 — `Q-27` IS THE ONLY ITEM HERE THAT GOT BIGGER, AND IT DESERVES A MEASUREMENT BEFORE A DECISION.**
60 MB of backgrounds ship in the repository; the five default tracks alone are 21 MB. **Nobody has
measured what that costs** — first paint, VPS transfer on the migration this backlog is already
planning, or repository weight. **The re-spec should start from that number, not from a compression
tool**, and it is a half-hour measurement rather than a decision he has to make cold.
