# OPEN-ITEMS-2026-08-22 — which of our open items are still true

**Branch:** `docs/open-items-sweep-1`, off master `90d2756f`. **NOTHING IN THE PRODUCT CHANGES.** This
block corrects the RECORD. Every verdict below is against **today's source**, never against the
report that recorded the item.

## HOW THE LIST WAS ASSEMBLED, AND WHAT IT HOLDS

- **`docs/BACKLOG.md`** — mechanically: **27 unticked `- [ ]` items**, 2 ticked. The August sections
  (2026-08-05 onward) are the live ones; everything below "Completed Items (Phase Completions)" is
  dated history and was not re-verified.
- **`docs/DEAD-ENDS.md`** — 18 sections, all retrospective by construction (they record what was
  tried and abandoned); none is an open item.
- **The owner decision sheet** (`OWNER-DECISIONS-2026-08-19.md`) and the **unclosed PROPOSALS
  sections** of recent evolution reports.
- **The 14 candidates the brief named**, each re-verified rather than copied.

**Verified in full: the 14 named candidates.** The remaining backlog items were catalogued but not
individually re-verified — **that is a gap in this sweep and it is stated rather than hidden**; the
proposal at the end is about making it unnecessary next time.

**EXCLUDED, one line as instructed:** the start, the ending, rank 7, the seventeen test-only exports
and the racer artwork having no instrument — **the owner has decided all five; they are settled, not
open.**

---

## STILL TRUE — ordered by what he would see

### 1 · PHOTO_FINISH is missing from `ALL_STATES`, so three of its Dev Screen sliders do nothing
**Evidence:** `client/src/modules/camera/cameraTimingComputation.js:66` —
`const ALL_STATES = ['OVERVIEW','LEADER_ZOOM','BATTLE_ZOOM','COMEBACK_ZOOM','LEAD_CHANGE']` — while
`defaults.js:156` defines a `PHOTO_FINISH` profile. The three maps built from `ALL_STATES`
(`leadAheadEnabledByState`, `leadOutEnabledByState`, `maxEntryDurationByState`) therefore never get a
PHOTO_FINISH key, and every read falls back (`?? true`, `?? 10000`).
**When it bites:** the moment anyone sets a PHOTO_FINISH profile field expecting it to apply.
**What he would see:** a slider he moves that changes nothing — the same family as the three Dev
controls fixed last night, and FINISH-SEAM-1 already measured two more (`minStateHold`,
`maxStateDuration`) dead by the same mechanism, with the Dev Screen rendering both anyway.

### 2 · The worktree stubs — and the recorded number is wrong
**Evidence:** measured today, `.git/worktrees` holds **47 stubs and every one is STALE** (its
`gitdir` points at a directory that no longer exists). `docs/BACKLOG.md:167` says "Ten".
**When it bites:** never, functionally — they are inert metadata. It bites when somebody adds
`git worktree prune` to a ceremony, which fails here.
**What he would see:** nothing. **Corrected in place** in BACKLOG rather than left at ten.

### 3 · The overlay boxes are covered by no fingerprint
**Evidence:** `client/src/screens/RaceScreen/overlayGeometry.js` has a test at three wrapper sizes and
nothing else; no fingerprint script references it. SHIP-COORD-SYSTEM named the proposal and did not
build it.
**When it bites:** any change to what is drawn AROUND the picture — the brand logo, the state pill,
the winner card.
**What he would see:** an overlay moved across the minimap, shipping green, caught only by his eye.

### 4 · Eight `AUTH.md §N` citations point at an archived numbering
**Evidence:** **7 comment sites carrying 8 citations** — `authRouter.js:47,110,155`,
`guards.js:23,28` (`§2/§9` is two), `recoverAdmin.js:5`, `usersStore.js:174` — kept alive by a
five-entry map at `docs/AUTH.md:15-17` that AUTH-DOC-LIVE-1 called a workaround that should not
become permanent. **This is last night's dropped Piece E.**
**When it bites:** whenever someone follows a citation.
**What he would see:** nothing — it costs a reader, not a viewer.

### 5 · The sprite route has no caller
**Evidence:** `server/src/routes/racers.js:252, 272, 318` define GET/POST/DELETE `/:id/sprite`;
**zero references to `/sprite` anywhere under `client/src`.**
**When it bites:** it is reachable, authenticated surface that nothing uses.
**What he would see:** nothing.

### 6 · `sollBereich` survives in the sim scripts
**Evidence:** **43 occurrences across 7 files** — `sim-fairness.mjs` (10),
`sim/observers/release-contest.test.mjs` (12), `report.mjs` (7), `exp-runaway-leader.mjs` (7),
`release-contest.mjs` (5), `fairness-stats.mjs` (1) — plus an exemption carried in
`check-language-closed.mjs`. The project's language rule is English identifiers everywhere.
**When it bites:** on reading, and on the guard's exception list growing.
**What he would see:** nothing.

### 7 · The VPS migration is unstarted and auth-before-go-live is still owed
**Evidence:** `docs/BACKLOG.md:211-220` — the server runs only on his machine, nothing is online.
**When it bites:** at go-live.
**What he would see:** nothing today.

---

## ALREADY FIXED

- **The three Dev Screen controls could show a number the game is not running.** Fixed by
  **ONE-HOME-1** (the code — each reads `DEFAULT_RACE_DYNAMICS_CONFIG` rather than a literal) and
  closed by **DEV-CONTROLS-HONEST-1, 2026-08-21** (the test ONE-HOME-1 left unwritten).
- **`check-index` is one-directional.** Fixed: `scripts/check-index.mjs:18` states it "passes both
  directions", and its run line reports dangling links as well as unindexed reports.

## NEVER TRUE

- **`check-doc-links` does not declare that it excludes `reports/`.** It does, three times over:
  header line 6 (*"`reports/` is EXCLUDED by design"*), lines 12–13, and its machine-readable `blind`
  array at line 34. The original reading was of a guard that has declared this for some time.

## CANNOT ESTABLISH

- **The four e2e flakes.** Five consecutive full runs on 2026-08-21 came back **103/103 every time**;
  the named four did not occur. Nothing fixed them, so "already fixed" would be a guess, and they
  were genuinely observed, so "never true" would be wrong. **What stopped me: they do not reproduce.**
- **`d11:182`'s 404.** Never seen, in five full runs plus seven repetitions of that one test. The one
  failure that could be produced is a 30 s time-budget overrun under an artificial repetition load.
  **What stopped me: the 404 never appeared.**
- **The conflict-marker guard.** No such guard exists and I could not find the item that proposed one
  in BACKLOG, DEAD-ENDS or the decision sheet. **What stopped me: I could not locate the original.**
- **The garden-path surfaces question that blocks re-drawing the seeds.** Not found in BACKLOG or
  DEAD-ENDS. **What stopped me: I could not locate the original.**
- **The remaining engine items — one body size, the 285 cap, the lap-blind sites.** They are named in
  CAMERA-MERGE-1 §5's parked list, and FINISH-SEAM-1 gave the lap-blind `photoFinishCloseThresholdT`
  a reachability judgement (real aliasing, very unlikely under the shipped ±10% band, and the unit is
  defensible). **What stopped me: each needs an engine measurement, and this block may not run one
  without changing what it is.**

---

## WHAT WAS CORRECTED, AND WHERE

- **`docs/BACKLOG.md`** (living) — the `check-index` item struck as DONE with what fixed it; the
  worktree count corrected from ten to 47 measured stale.
- **`reports/`** (append-only) — the `check-doc-links` and Dev-controls verdicts recorded in the
  INDEX's CORRECTIONS block, as this week's retractions were.

**Nothing was fixed here, however small.** A one-line fix in this block would have made its own
numbers untrue by the time it shipped.

**No fingerprint can move**: the only changed files are two living documents and this report; the
closure walk puts none of them inside any of the four instruments, and all four reproduce the record.

## PROPOSALS

1. **Give every open item an expiry and a verification command.** This sweep exists because nothing
   retires items: two of last night's four pieces chased things that were already done. An item that
   carried the one-line check that decides it — `git grep -c sollBereich -- scripts`, or
   `ALL_STATES` including PHOTO_FINISH — could be re-verified in a batch in minutes rather than
   re-investigated in a night. **The cheapest version: a `verify:` line per backlog item, and a
   script that runs them all and prints which now pass.**
2. **`ALL_STATES` should be derived from `CAM_STATE`, not hand-listed.** Item 1 above, FINISH-SEAM-1's
   two dead knobs and the Dev Screen's inert PHOTO_FINISH sliders are one defect with three faces:
   a six-state enum feeding five-state maps. **Not fixed here by instruction** — and it is the single
   highest-value item on the still-true list, because it is the only one the owner could see.
3. **The backlog's live section should be separated from its history.** 27 open items sit in one file
   with hundreds of lines of dated phase completions; the sweep above could catalogue them but not
   re-verify them in the time available, which is exactly the failure mode this document was written
   about.
