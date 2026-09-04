# Audits — index

**Read-only audits of this repository, written by an OUTSIDE author.** One line per file: who looked,
at what, and what they found.

**Why this directory is REGISTERED and not declared an archive** (AUDIT-REGISTER-1, 2026-08-22). The
choice was between giving it an index and naming it in `check-index`'s `ARCHIVED` list with a reason.
An archive is declared out of scope because *nobody adds to it and nothing links into it* — and both
halves of that are false here: two audits landed on the same day, and the whole point of an outside
audit is that its findings are meant to reach the people who can act on them. Declaring it out of
scope would have made "invisible" the official answer to the problem this exists to solve.

`reports/proposals` is the precedent, registered for exactly this reason: it is the one archive that
still RECEIVES work, and the audit that sat there untracked was the only copy of a finding that
first-admin setup could not succeed. **A directory that new work lands in needs the orphan check.**

**These files are ANOTHER AUTHOR'S RECORD and are committed unedited.** Not a word of them is
changed — not a typo, not a link, not a heading. Where a finding is acted on, the work and its
verdict live in `reports/evolution/`, and this index gains a pointer; the audit itself stays as
written. That is the same append-only rule the other indexes keep, with one addition: **we do not
edit someone else's report even to correct it.** If an audit is wrong, the answer is a reply in
`reports/evolution/`, not a silent edit here.

---

- [PROJECT-HYGIENE-2026-08-25.md](PROJECT-HYGIENE-2026-08-25.md) — read-only hygiene audit of the
  auth seam and the repository's shape. Reads the client/server setup-token and password-change
  contracts end to end and finds them aligned; flags the report archive's size and a corridor
  diagnostic test whose last assertion is a tautology.
- [DEEP-AUDIT-2026-08-25.md](DEEP-AUDIT-2026-08-25.md) — deep read of the subsystems that control
  public behaviour, security, rendering and the measurement harnesses, with per-file verdicts and a
  declared coverage statement. **No evidence-backed public-route auth bypass found in the source
  read.** Two findings: **F1 (Medium)** the report tree is 1143 files and 959327 lines, with
  `reports/perf` alone 326 files and 787228 lines, so the archive dominates navigation; **F2 (Low)**
  [client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js)
  ends in `expect(true).toBe(true)` and therefore cannot fail. It is explicit about what it did NOT
  open, which is the part that makes the rest of it usable.

- [PROJECT-STATE-2026-08-25.md](PROJECT-STATE-2026-08-25.md) — a state-of-the-repository answer
  sheet: scale, reachability, duplication, and a readability grade, answered question by question
  with the command behind each figure. **Its most useful property is how much of it says NOT
  ANSWERED** — A5, B1–B4, B6 and C1–C3 are left open with the reason, so the answered part can be
  trusted. Grades the codebase 3/5 for maintainability and says NO to "is it ready", naming the
  camera director's size, RaceScreen's mixed orchestration and the density of the auth paths.

- [OPEN-QUESTIONS-2026-08-25.md](OPEN-QUESTIONS-2026-08-25.md) — the open half of the deep audit,
  kept as its own file: dead material and redundancy, question by question. **It is almost entirely
  NOT ANSWERED and that is its value** — 1a-1e and 2a-2c are each left open with the reason (a static
  import graph cannot settle reachability where dynamic imports and entrypoint execution exist), so
  nobody re-derives a false clean bill from a partial sweep.

- [GAME-RULES-2026-08-25.md](GAME-RULES-2026-08-25.md) — an audit of the GAME's own rules: what the
  race promises, where fairness is defined, and whether the shipped gates are mechanically enforced
  or enforced by process. **It opens with what it did not do** — no fresh fairness run, so it does
  not re-confirm the shipped per-track arrival claim on the current tree, and no full CI trace, so it
  cannot prove every documented gate is enforced before release rather than by convention. Those two
  gaps are worth more than a confident summary would have been.

**AND THEY KEEP ARRIVING, WHICH IS THE ARGUMENT FOR REGISTERING THIS DIRECTORY MADE BETTER THAN ANY
REASONING COULD.** `PROJECT-STATE-2026-08-25.md` landed untracked minutes after the registration
merged; `OPEN-QUESTIONS-2026-08-25.md` landed during the block after that. Both times `check-index`
named the file immediately — "1 unindexed" — and both times it would have sat there silently before
the registration, exactly as the first two did. **Five audits in one day, three of them caught by a
guard that was installed the same afternoon** — and the fourth was later UPDATED by its author, which
this index treats the same way: their file, their edit, committed as it stands.

**F2 is this project's own Lesson 209 in someone else's words** — a check that cannot fail is
indistinguishable from one that passes. It is not fixed here: this block registers the directory and
commits the audits unedited, and acting on a finding is separate work with its own verdict.

---

## THE FULL AUDIT — 2026-09-04

A chain, not a block: each piece has its own branch, check, report and merge. The deliverable is a
verdict with numbers on each axis, not a list of work.

- [AUDIT-SCOPE-1.md](AUDIT-SCOPE-1.md) — **the denominators, and what three weeks did.** The
  repository is **2,452 tracked files**, of which **1,345 are reports**; the part that can break is
  **479 source files / 121,137 lines**, and **tests are 40% of the code by line**. 26 guards, a
  78-file engine-reach closure, 851 reports, 36 living documents. **80% of the tracked bytes are seed
  artwork and the lab journal** — neither can break the product. ★ **Against the census of three
  weeks ago the one axis that moved most is the MIRRORS: 27 disagreements to ZERO**, now guarded over
  406 mirrored facts. Tests grew 310 to 320 files and 5,583 to 5,697, with the automatic share held
  at 97%. ★ **Two comparisons are deliberately NOT made** — "40 checks" and "26 guards" are different
  grains, and the tree's size has no 09-01 counterpart — and **one figure that looks worse is flagged
  with its confound rather than concluded**: the client suite reads 286 s against the census's 170 s
  for 3% more tests, on a different day under different load.

- [AUDIT-DOCS-1.md](AUDIT-DOCS-1.md) — **2,789 claims checked, 2 false, and the shape that keeps
  escaping.** Five claim classes over the 40 tracked living documents — paths, commands, symbols,
  line citations and counts — each resolved against the tree and every candidate opened by hand.
  **0.07% false**, both under three days old, both corrected, both with one second site apiece and
  both swept. **The previous rate (97 false at a median 43 days, then 3 in three days) has held.**
  ★ **BOTH FALSE CLAIMS ARE ONE SEARCH SHAPE**: `docs/PROJECT-PRINCIPLES.md` pointed a live rule at
  `docs/diagnose/`, a directory archived long ago and still correct in four dated log rows; and
  `docs/API.md` listed `/api/surface-classes` as "missing entirely" **while documenting all five of
  its routes two screens below** — a claim wrong in a list and right in a heading of the same file,
  written two days earlier by the correction that fixed a larger error. ★ **THE AUTOMATIC PASS WAS
  FOOLED THE SAME WAY THREE TIMES AND IT IS RECORDED AS THE MEASUREMENT'S OWN ERROR BAR**: documents
  mark a removal at the SECTION level and a checker reads a LINE, so `TRACK_LIFECYCLE`, `FORCE-MAP`
  and `ARCHITECTURE` all read as false and are all correct. ★ **UNDOCUMENTED: 76 of 284 source files
  (27%) are named in no living document — and the ten that matter are `server/src`**, including the
  static-file server, the data-path resolver and four route modules, which is exactly the surface
  piece 8 must audit. Also: `.github/copilot-instructions.md` carries working rules that appear in no
  repository document and that the reading order never reaches.

- [AUDIT-REDUNDANCY-1.md](AUDIT-REDUNDANCY-1.md) — **the 27 disagreements are 0, duplicated logic is
  0.37%, and one stale copy nobody had checked.** All 16 catalogued fact-groups re-verified: eight are
  guarded and read zero, one is covered by a test, two of the four homeless groups have **left the
  tree**, and the five files that held all 27 census disagreements still exist and **none disagrees**.
  ★ **CODE-LEVEL DUPLICATION MEASURED FOR THE FIRST TIME** — 502 files, 74,569 normalised lines: 34
  clone groups at ≥25 lines, but **96% of them are DATA TABLES** (canvas-API name arrays, coat
  palettes), and quoting the 10.52% headline alone would be a lie. **Duplicated LOGIC is 279 lines,
  0.37%, in 6 groups — every one in `scripts/`, none in `client/src` or `server/src`.** The largest is
  four `diag/*-run.mjs` shard runners that are 105 lines each and **share 60% of themselves**.
  ★ **THE FINDING: `server/src/routes/tracks.js` carries a literal copy of all ten tracks — 85 values,
  24 stale (28%)** — including `garden-path → snail` where the seed says `beetle`, **the exact
  staleness repaired in the fingerprint instrument two days earlier, which had a second home the
  repair never reached**, and `city-circuit → buggy` where the seed has said `motorbike` since June.
  **PROVED INERT** (all ten seeds carry the fields, and the seed files are delivered before the map is
  built, so both startup migrations skip) — but it is a loaded gun on the race path, so it is
  **reported and not touched**. Of the twelve groups, **A3 and A4 are the only two unguarded**; A3 has
  never disagreed, A4 disagrees 24 times.

- [AUDIT-DEAD-1.md](AUDIT-DEAD-1.md) — **knip says 41 dead things; after verification the number is
  ZERO** (2026-09-04; nothing removed, because nothing was provably dead). A real tool was used —
  **`knip`, which this repository already has a config for and which is not a dependency and not
  installed**, a finding in itself. Its 2 unused files, 39 unused exports and 1 unused devDependency
  all resolve to something its scope cannot see: **9 are imported by `scripts/` (it ran with
  `cwd=client`), 1 lives on a `window` global the browser sweep reads, 3 are test-only, 1 is the
  pre-commit hook's binary, and 18 are used INSIDE THEIR OWN FILE** — an unnecessary `export`, not
  dead code, and left alone because twelve files including two in the engine hull is not an audit's
  business. ★ **This confirms `DEAD-CODE-VERIFIED-1` rather than repeating it — "no importer" is not
  "dead"**: that pass took 87 candidates to 8, this one takes 41 to 0. **ESLint: 8 warnings, 0 errors
  — and one was MINE from the day before**, fixed; the two in `CameraDirector.js` are reported and
  untouched because that file is the picture, and the unused `pairGuarantee` was **read before
  reporting** and is a leftover of a deliberate replacement, not a dropped guarantee. Config keys,
  assets, report links and lint all clean; the **14 diag scripts named nowhere** are the class
  `DEAD-OR-ALIVE-1` settled, and its discriminator was **re-verified, not trusted**. ★ Honest holes:
  **knip covered `client/` only — ~240 of 479 source files are unmeasured for dead exports** — and an
  acorn AST pass **failed on all 134 JSX files** and is reported as a failure rather than hidden.

- [AUDIT-SIZE-1.md](AUDIT-SIZE-1.md) — **RaceScreen is not the only one, and the second case is
  worse** (2026-09-04; read-only, nothing split). The known case is confirmed precisely:
  **`RaceScreen/index.jsx` is 1,917 lines with one importer and NO TEST THAT MOUNTS IT** — `App.test.jsx`
  mocks it to `() => null`, and the one test in its own folder that calls `render()` mounts a **child**
  and reads RaceScreen's source as **text**. ★ **THE CASE NOBODY HAD NAMED IS WORSE:
  `scripts/sim-fairness.mjs` is 6,195 lines — the largest file in the repository — and `runSingleRace`
  alone is 2,766 of them, 45% of the file and half again the whole of RaceScreen. Nothing tests it**,
  and it is not a screen: it is the sim half of the Sim-Browser Parity Rule, the instrument every
  fairness verdict rests on. **The two deepest nesting points in the repository (brace depth 10) are
  these same two files** — the same finding measured a second way. Everything else large is the job or
  is tested: `CameraDirector.js` at 5,351 has an **8,191-line test**, `defaults.js` is long because the
  reasoning beside each value is the point, and **seven of the eight largest UI files are mounted by a
  test** — RaceScreen is the exception and the largest. Nothing split: both headline cases change
  behaviour a person would notice, and the second changes every fairness number this project has.

- [AUDIT-TESTS-1.md](AUDIT-TESTS-1.md) — **17 sabotages, 2 got through, and three of my first five
  "holes" were my own harness** (2026-09-04; every revert proved byte-identical, tree clean after each
  batch). **320 test files, 311 wired, ZERO unwired** — the mechanical fix class this piece was
  allowed to repair is empty. **15 of 17 mutations caught; escape rate 12%.** ★ **THE HOLE THAT
  MATTERS: `routing.closureOf` — the function that decides which guards `verify` runs — can be made to
  return nothing and NOTHING FAILS.** Measured in both directions: on a docs diff the plan harmlessly
  *gains* three guards; **on a diff touching the engine hull it LOSES FIVE — all three fingerprints,
  `check-seed-versions` and `check-tags`** — so on exactly the change that most needs them, they
  silently stop being selected and `verify` prints PASS. `verify.test.mjs` tests the *inputs* to
  `closureOf` and never its output. The second miss is **`RaceScreen`**: forcing its background path to
  null blanks every track in the game and passes every test, the direct cost of nothing mounting it.
  ★ **AND THE ERROR BAR IS REPORTED, NOT HIDDEN — three of my first five misses were mine**: one
  mutation was a comment inside a parameter list (no semantic content), and two had scopes that
  omitted the very test written for the behaviour, including `sessionInvalidation.test.js`. **A MISS
  only counts once the mutation is shown to change behaviour AND the scope is shown to contain the
  test that should care**; both surviving misses were put through that. Also verified in passing:
  **disabling the session-epoch check IS caught**, which piece 8 inherits as fact rather than claim.
