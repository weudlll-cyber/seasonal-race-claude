# Night blocks — index

Unattended blocks: one file per block, newest first. These are lab-journal entries and are
**append-only** — a report records what was true on the day it was written and is never rewritten.

This index exists because `reports/night/` sat outside every guard until ONE-TRUTH-2 stage 5: a
report here could be orphaned, or an index link could dangle, with nothing noticing.
`node scripts/check-index.mjs --dir=reports/night --index=reports/night/INDEX.md` now checks both
directions.

- [MIRROR-CENSUS-1.md](MIRROR-CENSUS-1.md) — the mirror census finished: 29 disagreeing copied
  defaults → 21, eight stale copies now reading the one home, all four fingerprints measured either
  side and byte-identical. **One "UNFIREABLE" verdict was false** — the sim's own `createRacePlan`
  call passes `gapRerollStrength: undefined` on the world-OFF arm, so that fallback ran on every
  race of every ship and resolved to 0.5 against a shipped 1; it was inert only because the
  threshold is null there. The 21 that stay are the `?? false` / `?? 0` shapes, which are a
  convention and therefore the owner's decision, not a sweep's. Also: the guard cannot see
  object-literal fallbacks at all, and two were copying `b2AttackProgress`.
- [NIGHT-2026-08-17.md](NIGHT-2026-08-17.md) — **the red tests, the flakes, and an audit that runs
  by itself** (2026-08-17). Three pieces asked for, four merged. **The 27 hard e2e failures are
  gone — 76/27 → 103/0**, every one repaired against the source and three assertions made STRONGER
  (an old `expect(color).not.toBe('')` was true of every colour; a window bounded on both sides
  around a number the test did not own; a hard-coded lap gap now re-derived). The Base Speed cluster
  was rewritten and now **imports** the defaults instead of restating them in eight places, and the
  previous night's claim that the lap selector "needs a hook the markup does not offer" was WRONG —
  every hook was already there. **The flakes were not leaked state, and the suite's own artefact
  settles it:** `.auth/state.json` carries two entries, so no spec can reach another. The cause is
  that every server-backed loader renders a default first and swallows a failed fetch — and a
  MISSING geometry reads as a CLOSED track, so an open track quick-tested inside that window runs as
  a laps race with nothing logged. Five runs before and five after, same instrument: the two flakes
  aimed at did not recur, two different ones surfaced, **the rate did not change** — and one of the
  new ones was the same page-wide `getByText` defect its sibling had already been repaired for.
  The dependency audit now runs **daily on both trees**, reporting to a GitHub issue that opens,
  dedups and closes itself, in **its own workflow with `--report-only`** so a schedule can never
  turn master red for something nobody triaged — and both issue transitions were **proven at the
  origin** by a `drill` input, because a notification channel nobody has fired is not one.

- [NIGHT-2026-08-16.md](NIGHT-2026-08-16.md) — **six pieces, six reached** (2026-08-16). The e2e
  suite told the truth about itself for the first time: **63 → 75 passing**, repairing only the two
  clusters whose correct assertion the SOURCE could settle (a bare `canvas` selector that now matches
  two elements; `targetDurationSec`, where the closed-track case now asserts its ABSENCE because
  SetupScreen's own payload says exactly one target is meaningful per mode) — and leaving 28 failing
  with a named reason each, because a wrong green is worse than a known red. **The one candidate
  product defect was not one:** Reset-to-Default works, and its test failed because its setup PUT
  went to a HARDCODED `localhost:4000` — the owner's API, which it had been writing overrides into
  and deleting from — and because a page-wide `getByText` aborted on strict mode instead of waiting.
  **Five runs replace the flakiness guess with a number: 27 tests fail in all five, only 4 are flake
  (each 1/5).** The server tree is audited for the first time — **4 highs, exactly one reaching
  production** (ip-address via express-rate-limit), report-only with a stated end date rather than a
  false allowlist entry. The six columns arriving through `...r` are explicit, with the world
  fingerprint **byte-identical on both sides**. And `deploy.yml` — which GitHub listed as *active*
  while its own header said it could never run — is de-registered by rename, proven at the origin.

- [NIGHT-2026-08-15.md](NIGHT-2026-08-15.md) — **one ship and four night pieces, sequential**
  (2026-08-15). JOB A shipped the minimap the owner accepted that day — marks and unraced tail, one
  merge, one tag, one mint, with the fingerprint selection made by each instrument's OWN declared
  closure rather than by `engine-reach`, which has nothing to compare on a committed merge. PIECE 1:
  the hashed fingerprint row may no longer use shorthand property syntax — it PARSES, anchors on the
  call site rather than a name, and its nine shorthand keys are explicit now with both world arms
  re-checked; the `...r` spread that contributes SIX of the sixteen hashed keys is named and not
  fixed. PIECE 2: the language rule and the 2026-08-12 closed quotation exception get a guard with a
  frozen file-plus-count allowlist — **the tree is not clean and it says so: 14 real pre-existing
  violations including three German USER-FACING alerts** — plus two premise corrections (a byte
  grep's "45 German lines" in `sim-fairness.mjs` is really 0, an umlaut-continuation-byte artefact)
  and one lesson, that the guard could not see its own untracked files and CI caught the false local
  green. PIECE 3, read-only: the worktree hook bypass **demonstrated** (relative `core.hooksPath`
  into an untracked directory ⇒ a worktree commit runs no hook at all, silently), **549 commits
  audited and only 3 left prettier-dirty blobs, none of which survives on master** — a clean result
  is a real one.
- [NIGHT-2026-08-13.md](NIGHT-2026-08-13.md) — **five pieces, all five finished, and the floor turned
  out to work for a different reason than anyone thought** (2026-08-13). Piece 1: nothing is lying
  around — both trees clean, no stashes, no unpushed tags — and all four fingerprints reproduce on
  master; six stale documents corrected, five more reported. Piece 2 (`feat/front-group`, NOT merged,
  **his eye owed on 4173**): the endgame floor does not work by holding the width — **100% of the
  racers it saves leave ALONG the track and `corridorGuarantee` only constrains ACROSS** — so the
  narrower version he asked for cuts racers (0.0% -> 12.0%) and ships OFF. Piece 3 (**merged**,
  `v-ship-camera-ending-window`): the camera fingerprint's window is derived from the ending's own
  schedule, CAMERA minted, proved by an off arm that reproduces the predecessor byte-identically.
  Piece 4 (**merged**, `v-guard-stamp-complete`): the stamp guard scans all 57 living docs, proved by
  sabotage in both directions. Piece 5: the 5 s budget is fine — **`goldenRealArm.test.js` is 99% of
  the suite's wall clock**, so capping the fork pool costs 0.2 s and makes the worst TrackEditor test
  2.2x faster.
- [NIGHT-2026-08-12.md](NIGHT-2026-08-12.md) — **four pieces, four branches, and the run died on exit
  without writing its log** (2026-08-12). The work survived and the JSON result did not: exit code 4,
  a 0-byte log, and a complete report on disk. Piece 1 closed the German-quotation exception (merged);
  Piece 2 brought the ending hold forward; Piece 3 put the canvas overlays on one coordinate system —
  **left unmerged, because its own merge condition is "no overlay moved" and independent
  re-measurement showed both move at the owner's 0.81 scale** (logo −3.04 px, state pill −5.33 px);
  Piece 4 mapped the `TrackEditor.loadmode` timeout without touching it. Carries a CORRECTION section
  on the date it was first written under, and the rule it produced: **a date in a lab journal is worth
  exactly what its source is** — this one is read from `git log --date=iso` on the commit that made
  each change.
- [GATE-TRUTH-1.md](GATE-TRUTH-1.md) — **the repair of [GATE-LINES-1](GATE-LINES-1.md): the gate now
  tells the truth** (2026-08-12). **The reader is fixed and cannot go silent again.** The three
  harnesses read through `runawayRateOf()`, which now sits beside `classifyRace` in the observer that
  owns the definition, and it returns a SHAPE rather than a number so the two causes of a zero can
  never look alike: **unusable records are a FAILURE, an honest zero is a RESULT** stated in words. A
  once-per-run control prints on every run of all three and never fails a build. **The proof, one gate
  command before and after** (`--nlist=100`, same world, same seed, machine quiet): pooled **0.0% →
  2.8%** over 400 races — searound 7.0%, luger-hill 3.0%, space-sprint 1.0%, seatrack 0.0% in **both**
  columns, which is exactly how the defect survived. **The budget is written where it belongs**:
  SHIP-CEREMONY step 1a, pooled ≤ 5% and per track, with the owner's verdict quoted verbatim
  (_"3 % ist total ok…"_) and one sentence saying why it is not in FAIRNESS.md — PROJECT-PRINCIPLES §8
  already rules action quality out of the fairness gates. searound is recorded as the known outlier
  rather than averaged away. `exp-fair-arrival` **stops restating the gate** — its "preregistered,
  binding" five-criterion list becomes a SCREEN pointing at the two homes, with no criterion or
  arithmetic changed. **`rowMin` gets one home**: `rowMinOf()` in `fairness-stats.mjs`, reading the
  ENGINE's `BAND_EDGES`, replacing four copies of the expression and four of the edges; identical on
  every track **at full float precision**, not at the rounded percentage. FAIRNESS.md now owns the
  line and states that the code implements **no-regression** while the word "floor" implies an
  absolute — **the disagreement is reported and nothing is changed**, because that would be a change
  to the gate. A dated CORRECTIONS entry in `reports/evolution/INDEX.md` records that four ship
  reports carry a `0%` that was an artefact; those reports are append-only and were not edited.
- [GATE-LINES-1.md](GATE-LINES-1.md) — **`runaway 0%` has never been measured; `rowMin` is sound but
  homeless** (2026-08-12). The owner asked which document is right about the two gate lines
  SHIP-CEREMONY step 1 requires and FAIRNESS.md does not carry. **The question changes on the
  measurement.** The three harnesses that feed the ship gate read `r.runawayParade?.runaway` — a
  property the raw record **does not have** (the classifier's boolean is `runawayWinner`, and the
  file's own `meta.note` names the function to use). `?.` makes it silent, so the answer is always
  exactly `0%`. Proven on the gate's own command, `--nlist=100`, four tracks, 400 races, machine
  quiet: **the gate reads 0.0%; `classifyRace()` on the SAME records says 2.8%** (searound 7%,
  luger-hill 3%, space-sprint 1%, seatrack genuinely 0 — which is why it survived). The same broken
  line is in `exp-flapping-gate`, `exp-fairness-recheck` and `exp-roster-matrix`, while **five other
  harnesses do it correctly** — so a 23.5% and a 0% have coexisted for months in different reports.
  **Historically it could never have gone red**: the filed gate data (`motion.json` N=100,
  `combined.json` N=300) is 0% on every row, and that zero propagated into four ship reports as a
  green result — while the TRUE rate means a literal `0%` gate would have blocked every one of those
  ships. **`rowMin`** is computed correctly (87–91% today, matching the filed ships) but its
  expression and zone edges are **four identical copies in four files**, its only comparison is
  RELATIVE (`c.rowMin >= s.rowMin`) while the checklist says "floor", and it has **never** been the
  reason anything stopped. **A THIRD gate definition was found on the way**: `exp-fair-arrival.mjs`
  carries a "preregistered, binding" gate that omits runaway entirely — no two of the three
  statements list the same criteria. **Recommends**: drop `runaway` from the checklist and do NOT put
  it in FAIRNESS.md (the `corrP1`-is-not-a-fairness-gate ruling already covers this shape), fix the
  reader in its own commit regardless; give `rowMin` one home in code, then let FAIRNESS.md own the
  line and say which KIND of gate it is. Neither document edited — the decision is his.
- [ANCHOR-TRUTH-EYE-1.md](ANCHOR-TRUTH-EYE-1.md) — **is there anything for his eye to judge? Half of
  it, and the other half closes on the measurement** (2026-08-12). CAMERA-ANCHOR-TRUTH-1's eye-test
  debt, measured before spending his time. **§4a, the anchored corridor guarantee: 0.00 points of
  frame on every one of 50,407 frames, ten tracks, both field regimes** — not "too small to see",
  IDENTICAL, because CAMERA-COMPANY-ONLY-3 (the verdict he DID give) retired the corridor from the
  single-anchor states and the surviving PAIR fallback never fires. `corridor-truth.mjs` agrees from
  the other side: its whole table is byte-identical with the change in and out. **§4c, OVERVIEW's
  `trackingTC` 1.5→0.25: VISIBLE and the debt stands** — p95 **19.56 pp**, max **44.05 pp**, and
  **28.8% of OVERVIEW frames more than 10 pp apart**, while `cam.zoom` is identical to 0.00% and the
  director takes the same shots at the same times on 100.0% of frames. The regime does not decide it
  (tight 8.0% vs torn 8.3% of frames over 1 pp); the STATE does, and OVERVIEW is 16.5% of a race.
  **§1a shipped no behaviour and was never eye-testable** — the reason existed only as control flow,
  so it has no "before" to A/B. A ten-minute sitting is prepared and NOT run: ice-track (median
  13.11 pp, 58% of its OVERVIEW frames over 10 pp), seed 5601, both arms on an existing Dev Screen
  slider — checked in `CameraAdvancedSection.jsx`, not assumed. New harness
  `scripts/exp-anchor-truth-ab.mjs` drives the same race and director as `camera-fingerprint.mjs`
  and invents no unit. One temporary one-line edit, reverted and proven gone.
- [STANDINGS-SAMPLER-LOADMODE.md](STANDINGS-SAMPLER-LOADMODE.md) — **three pieces; two shipped, one
  is an honest map** (2026-08-11). **(1) The two-layer standings become a RULE with a guard behind
  it** — `docs/STANDINGS-ARCHITECTURE.md` states it, `check-standings-invariant.mjs` makes it bind,
  in two halves because neither alone is enough: a card that displays its place needs a rank PROP,
  and a mounted harness only sees what it is handed, so the measurement would stay green while the
  architecture was gone. Both sabotages went red — the place put back on the card in 5 ms, the
  positioner made to write text with **959 `childList` records**. The panel's composition was
  EXTRACTED (`index.jsx` 1726 → 1691) because a guard that re-declares the arrangement cannot notice
  the arrangement changing. **(2) The render sampler follows the ceremony again** — five typed
  milliseconds topped out at 4900 while the starters board had moved to 5000–11000, so the board,
  the settled beat and the digits were outside the instrument. The points are derived from
  `ceremonyScheduleFor` now, one per beat at its midpoint plus one in the board's fade, and the
  marker carries the BEAT so a beat that stops being sampled moves the hash. Proven both ways: the
  heading changed is **byte-identical** under the old points and **moves** under the new ones. RENDER
  minted fresh, no `--cheap`; **CAMERA, WORLD and WORLD-OFF re-measured on the same tree and all
  three unchanged**. **(3) The `TrackEditor.loadmode` timeout is NOT where it was looked for** —
  verify's spawn, cwd and env are all exonerated by a faithful 4/4 repro and by a **bare whole-suite
  run that reproduces the slowdown identically**; the discriminator is one-file (1112 ms) versus
  whole-suite (4213–9839 ms) against vitest's 5000 ms default, worst sample 3136 ms. Same family as
  CI-AUDIT-GREEN-1. **Stopped rather than fixed**, per the brief, because the only remedy inside the
  file is the one it forbids. Found on the way, reproducible and unrecorded: **a lowercase drive
  letter in `cwd` makes vitest fail 198 of 201 suites with "failed to find the runner"** — the case
  is everything, the slashes are irrelevant, and the message names nothing about paths.
- [DOC-AUDIT-2.md](DOC-AUDIT-2.md) — the living documents in one pass. **The machine-checkable half
  is already green and stays green** (config claims 0, fingerprint copies 0, dangling links 0, index
  both directions 0), so what is left is what a guard cannot see — and all six findings are the same
  defect: a number a scan could derive, typed into a sentence. `SHIP-CEREMONY.md` carried THREE of
  them in one sentence (19/103/84 → 20/106/86, stale since CONFIG-DIFF-2); `ARCHITECTURE.md`
  described a three-tier track fallback whose third tier is not in the repository. Five fixed, one
  named as needing a generator. **The routing gap that turned master red is closed** in the routing
  declarations — `gen-engine-reach-doc` now declares `reach: raceCore.js`, so its dependency set IS
  the hull and cannot drift from it; three tests, both directions, including the exact file
  CONFIG-DIFF-2 added. **`postStartHoldMs` is TWO CLOCKS wearing one name** — the camera's is a
  duration from the end of the 3 s overview, the planner's an absolute floor from t=0, differing by
  exactly START_PHASE_DURATION — and the planner's is INERT above a ~28 s race, so it can bite only
  short races. Rename not proposed: it is his call.
- [OUTCOME-PHASE-75.md](OUTCOME-PHASE-75.md) — **the owner's decision, shipped**: the decisive phase
  begins at 75 % of the leader's run, not 65 %. The COMEBACK gate opens 6–8 s later and stays open a
  quarter of the race instead of a third (measured on two tracks); COMEBACK_ZOOM is entered a third
  as often (2103 → 753 frames) and LEAD_CHANGE takes most of the freed frames. CAMERA
  `ad07c08ce5d8ae49` → `d54d6332fb8d36c6` and RENDER `752df7bc61ef0721` → `9580ff2e3626b3b9` as
  expected; WORLD `dc4647be0f55ebdb` unchanged. The three stale literals are CONVERTED, not aligned
  (42 → 38 disagreeing sites), plus a fourth copy nobody had counted — a Dev Screen tooltip reading
  "Default 65%", which no guard could ever have caught. **The HUD bug is not what the brief said and
  the record is corrected**: `getComebackDiagData` does emit the value, so the HUD was right all
  along; the diagnostic fallbacks are removed anyway, because a fallback in a panel is a second
  authority on a number the director owns.
- [PAIR-PREFILTER-1.md](PAIR-PREFILTER-1.md) — a two-axis field bound in front of the pair loop, and
  **the race now costs 20 % less to compute**: the world fingerprint, a fixed ten-track workload, runs
  128 s against master's 160 s, and every one of the six timed runs produced `dc4647be0f55ebdb`.
  `pairContact`'s share of the step falls 4.19 % → 1.37 % at n=100, which is the census's 96.6 %
  cull landing. **The brief named three safety conditions and there was a FOURTH, live:** the flat
  brake fallback is per-PAIR, not per-field, and on a long track is six times wider than the
  geometric bound — so the cull as designed would have skipped pairs gate A still brakes. Found by
  writing the test, closed before the fingerprint was run, and the literal now has one home. Seven
  tests, each sabotaged and each caught by exactly one; removing the prefilter entirely still passes
  all seven, because they assert the superset property rather than the cull's presence. The ceiling
  table is NOT re-derived and the report says why — its only instrument has a ±9–26 % noise floor.
- [PAIR-DEDUP-1.md](PAIR-DEDUP-1.md) — the pair loop's six geometry values, computed once instead of
  twice. The two sites were expression-for-expression identical (same fallback, same addition order,
  same `Math.max` order — all three checked, not assumed), so WORLD `dc4647be0f55ebdb` and all ten
  per-track hashes are unchanged. **The ≈ 7 % PAIR-REACH-ANALYSIS priced was NOT delivered, and the
  block says why:** the pair block's combined profile share moves 73.02 % → 72.36 %, inside master's
  own 1.3 pp spread — V8 was already eliminating the duplicate, because both copies are pure
  arithmetic on fields nothing writes between them. Also the first measurement of the A/B/A bench's
  own noise floor on this machine: 5–30 %, i.e. it cannot resolve a single-digit percentage at all.
- [CONFIG-DIFF-1.md](CONFIG-DIFF-1.md) — store what he chose, not what happened to be true.
- [PAIR-REACH-ANALYSIS.md](PAIR-REACH-ANALYSIS.md) — the bound exists and the Y axis is the strong one; the cheaper win is a duplicate.
- [FALLBACK-42-TRIAGE.md](FALLBACK-42-TRIAGE.md) — 41 of the 42 cannot fire; the one that can fires every render.
- [BUILD-PILL-TRUTH.md](BUILD-PILL-TRUTH.md) — the .git watch never fired once; Vite ignores .git, so it is polled now.
- [SPREAD-FIELD-SWEEP.md](SPREAD-FIELD-SWEEP.md) — the company guarantee binds in the PACK, not on a spread field; the premise was wrong, the value is not.
- [SMALL-DEBTS.md](SMALL-DEBTS.md) — a dead field that was keeping two imports alive, a constant whose name said the opposite of what it did, and a routing section pointing at a deleted table.
- [CONFIG-DIFF-2.md](CONFIG-DIFF-2.md) — the remaining six stores, and one home for the rule.
- [MIRRORS-BY-REFERENCE.md](MIRRORS-BY-REFERENCE.md) — 259 fallbacks now read the default instead of copying it; byRef 55 to 314.
  `loadCameraConfig` was already right (it walks the DEFAULT keys, so a NEW key arrives at its
  default); `saveCameraConfig` wrote the WHOLE resolved object, so one slider move FROZE every key
  and a changed default could never reach him again — which is why his board sat at 3000/80 after
  6000/120 shipped. Now only keys that DIFFER are written, state profiles are diffed per FIELD, and
  a ONE-TIME PRUNE drops every stored key equal to its current default so the fix reaches the config
  he already has. **A prune, deliberately not a reset** — he offered one, and it would have thrown
  away weeks of tuning this keeps. It runs from `loadCameraConfig`, is idempotent and writes only
  when it drops something, so it needs no marker and cannot half-run. **THE EDGE IS IN THE CODE AND
  PINNED BY A TEST**: a value he deliberately set to today's default is indistinguishable from an
  untouched one and will follow a future change of that default — telling them apart needs stored
  intent, i.e. a schema, which is what this file exists without. SIX other stores have the same
  save-everything shape and are WORSE (their loaders are spread merges, so retired keys linger too);
  named, none fixed — two of them feed the RACE and belong in their own block with their own mint.
  11 consequence tests (storage → load → default changes → load), five sabotages all red; one
  existing test's fixture had to change because `minRacersVisible: 5` BECAME the default at
  SHIP-THREE, which is the edge case demonstrating itself. WORLD `dc4647be0f55ebdb` unchanged —
  and `engine-reach` says none of the changed paths reach the engine at all, against the block's
  expectation, because the change is in the storage CRUD module and not in `defaults.js`.
- [VERIFY-ROUTING-2.md](VERIFY-ROUTING-2.md) — the routing comes from the guards. The route table
  in `verify.mjs` is GONE (`ROUTES`, `selectedBy` and `FINGERPRINT_RECORD` went with it as orphans;
  net −96 lines there); each guard DECLARES what it covers and `scripts/lib/routing.mjs` collects
  those by asking each script `--declare`. SELF is the import closure of the declaring file —
  computed, never declared, so it cannot be forgotten. **THE SHIP GAP IS CLOSED**: `doc-guards` was
  a BUNDLE of nine guards behind one route, which is how eight of them inherited "markdown changed"
  as their trigger, so a pure JS change never ran `check-config-keys` or `check-fallback-agreement`
  under verify. **AND A SIXTH MISS FOUND BY BUILDING IT**: an ENGINE change now runs the camera and
  render fingerprints, because both harnesses drive a real seeded race — it costs ~5 min on engine
  blocks, and the alternative is a fingerprint that cannot notice the thing that moved it.
  VERIFY-ROUTING-1's design survives whole; its DIFF does not, and the report says which parts
  VERIFY-COST-3 and VERIFY-BASE-1 made obsolete (argv now lives with the flags, not in the
  declaration). `blind` is required on every guard and verify prints a NOT COVERED section from
  those lists on GREEN runs. `check-measured-stamps` gains its PENDING line — and I am the reason
  it earns its place: in MIN-RACERS-5 I ran that guard pre-commit, saw green, and CI went red on the
  same stamp minutes later, because it reads git HISTORY. Neither VERIFY-BASE-1's refusal nor
  VERIFY-COST-3's flag handling was lost, and both are TESTED; the six reader-facing cases return
  identical exit codes (0,2,0,0,2,2,2). verify PASS 14/FAIL 0/SKIP 1, all three fingerprints
  UNCHANGED, hook PASS 7, CI green. `feat/verify-routing-1` is superseded — all four of its
  documented misses covered.
- [VERIFY-ROUTING-1.md](VERIFY-ROUTING-1.md) — verify stops guessing. The hand-maintained route
  table is GONE: each guard declares its own dependencies in its own file, and routing.mjs collects
  them. Self-dependency is COMPUTED (the import closure of the declaring file), so no guard can fail
  to route on a change to its own instrument — miss 3 closed for every guard at once. The runtime
  entry points a static walk cannot follow are declared but CROSS-CHECKED against the script, and
  the check caught a wrong path in the render declaration the first time it ran. The four misses are
  tests, one each, both directions, each shown false-before / true-after. Two guards that ran NOWHERE
  now run: check-writable, and check-measured-stamps for the very change that invalidates it. What
  verify cannot know about the commit being made is a PENDING line printed on green runs instead of
  a silent PASS. Skip reasons are counts, not prose; every guard states its own blind spots and
  verify prints them. All three fingerprints unchanged. **SUPERSEDED by VERIFY-ROUTING-2, which
  shipped its DESIGN against the rewritten verify.mjs; the code of THIS implementation is preserved
  at `archive/verify-routing-1` and its branch is deleted. Landed as history at SHIP-ROUTING.**
- [HARNESS-NAMES-1.md](HARNESS-NAMES-1.md) — the render harness never set `r.name`, so every label
- [FALLBACK-GUARD-1.md](FALLBACK-GUARD-1.md) — a fallback must agree with the default it mirrors.
  The gap MIN-RACERS-5 named: `check-config-keys` asks whether a key EXISTS in the defaults, never
  whether a MIRROR of it still AGREES. New `check-fallback-agreement.mjs`, wired beside it in all
  three homes (hook, verify, CI). **361 mirrored fallbacks; 52 read the default BY REFERENCE and
  cannot drift; 42 disagree** — all 42 on an explicit exception list with both values and a reason,
  so it is green today and red on any new one. **NOTHING WAS ALIGNED**, as instructed:
  `postStartHoldMs` (7000 vs 0) may be two clocks wearing one key name and wants a RENAME not an
  alignment, and nine `raceCore.js` entries are the deliberate OFF arm the world-off fingerprint
  depends on. The worklist is ordered by damage; the sharpest items are `outcomePhaseThreshold`
  0.65 vs **0.75 in three files** (resolver, the slider the owner would judge with, and the HUD he
  would read while judging) and `rowBonusPulk`, which runs the WRONG way — the fallback is the
  ACTIVE value, so a partial config gets MORE behaviour than the shipped world. THE PROOF IS NOT
  SYNTHETIC: re-applying the real MIN-RACERS-5 change makes the guard name all four sites that were
  fixed by hand. Two false positives were caught before shipping (an unbound band pattern that
  invented a finding, and a display fallback in a log template) and both are recorded in the guard.
  AND THE TEST LESSON: my first suite PASSED with `isExcepted` gutted to always-true — a guard that
  ships green over 42 exemptions needs an end-to-end fixture run, which `--src=` now provides.
- [VERIFY-BASE-1.md](VERIFY-BASE-1.md) — a run that verified NOTHING must not exit 0. Found during
  SHIP-THE-LINE: `npm run verify` on master printed `PASS 0 / FAIL 0 / SKIP 7` and exited 0 having
  checked nothing, because the routing diffs `master...HEAD` and on master that is empty by
  definition. **Seven honest skips summed to one dishonest exit code.** Verify now REFUSES when
  routing selects no guards — names the cause, prints the paste-able command, exits 2 (2 = refused,
  1 = a guard failed). **Not a cleverer default `--base`**, deliberately: on master "what changed"
  has three defensible answers that verify different things, so guessing would restore the exit code
  while keeping the real defect. Four causes get four diagnoses, `--dry` refuses too, and all six
  reader-facing cases were run rather than reasoned about. THE TEST LESSON: the first end-to-end
  test asserted "exit 2 if the tree is clean, 0 if dirty" — honest and useless, since the tree is
  always dirty in development, and two of four sabotages passed green locally. It now builds a
  throwaway repo and points verify at it via GIT_DIR, so the empty plan is empty BY CONSTRUCTION.
  `docs/VERIFY-RULES.md` R0 brought in step and R0a added with the case table.
- [MIN-RACERS-5.md](MIN-RACERS-5.md) — the owner's verdict becomes the shipped value.
  `minRacersVisible` 3 → 5, plus the two mirrors that still said 3: `DEFAULT_MIN_RACERS_VISIBLE` in
  `framingConfig.js` (the partial-config fallback — a default of 5 answered by a fallback of 3 is the
  L199 trap, and NOTHING guards that agreement) and the Dev Screen slider, which now reads the
  defaults instead of a literal so the control cannot disagree with the number being judged.
  **THE THING TO READ BEFORE THE EYE TEST: on searound and river-run — the two bench tracks — this
  changes NOTHING, zero frames.** It bites on 5 of the 10 fingerprint tracks; **city-circuit** is the
  one to look at (12.9 % of frames differ, widest single frame 1.369×). The five that do not change
  are already capped by the field ceiling or the geometric guarantee on 22–33 % of frames, so company
  never gets to speak. Zoom p5/median/p95 do NOT move on any track — the cost is in the tail, because
  zoom sits on the state profiles' discrete levels. The finish condition
  (`finishedCount >= 1 + minRacersVisible`) moves from 4 home to 6, measured at **6–10 frames** —
  the field arrives in a cluster, so it is not where the change is felt. WORLD
  `dc4647be0f55ebdb` UNCHANGED; camera and render moved and are **NOT minted** — that waits for his
  eye. The spread-field sweep is still owed and was named, not run. My first measurement was WRONG
  (post-hoc `_companyCeiling` reads a state `update()` has already advanced) and the correction is in
  the script's header.
- [SIDE-FREE-CULL-1.md](SIDE-FREE-CULL-1.md) — the same race, without the all-pairs scan. **WORLD
  fingerprint `dc4647be0f55ebdb`, UNCHANGED** — and camera/render were measured on the parent too and
  are identical, so this block moved nothing at all (they differ from `fingerprints.json` because of
  the CHAIN's camera work, and `verify` cannot settle that: its fingerprint jobs run the scripts and
  compare nothing). `isSideFree` walked every racer and discarded the ones outside `tHalfSpan` AFTER
  visiting them; it now reaches them through an index sorted by `tFrac(t)`. THE SAFETY ARGUMENT: the
  index picks WHICH racers are considered and never decides whether one blocks — every one it reaches
  still goes through the ORIGINAL predicate — so the window only has to be a SUPERSET, and it
  provably is (`min(fwd,bwd) <= s` implies `fwd <= s` or `bwd <= s`). The old inner discard therefore
  STAYED rather than being orphaned. Traps: sorted on `tFrac` not `t` (raw `t` carries the lap and
  back rows start negative, so it orders by RANK); `t` is frozen across the pair loop (verified — the
  three position writes are all in later passes) but `physicalY` is NOT, which is why the index
  stores only `tFrac`; the bound is inclusive. Neither existing neighbour structure was reusable and
  the report says why. **1.16×–1.47× faster** (pooled, 4 A/B/A sweeps against the parent commit
  live — the stored old data was NOT reused, deliberately, because the machine has 2× speed states);
  `isSideFree` 32.8 % → 6.1 % of the step; ceiling +25 %. **THE PREDICTION THAT FAILED: the exponent
  barely moved (1.86 → 1.74).** This removed a constant factor, not the quadratic — the pair loop is
  still O(n²) and is now 60 % of the step. 5 new tests, 3 sabotages all caught. Not merged, not minted.
- [PERF-WHERE-1.md](PERF-WHERE-1.md) — a perf log now says WHERE in the race it was taken. The
  defect: the owner's two recordings could not be compared because neither names its own conditions,
  and PHYS-BENCH-1 had to establish from the outside what the export could have said for free. The
  export now carries a `context` block — elapsed PHYSICS time (not wall time), the lap, leader-to-last
  spread in the engine's own `t` units over the RUNNING racers, field size, roster and the names
  toggle. **Gathered at export time, never per frame**: a diagnostic that adds a per-frame statistic
  changes the thing it measures, so it is one pass over the racers when the owner clicks, and
  `getContext` is a FUNCTION prop because the HUD re-renders every 200 ms and the race moves between
  renders. **The roster is DERIVED from the names the field actually has** (`identifyNameSet`, in
  `racerNames.js`) rather than plumbed from SetupScreen, whose key dies in local state — so `custom`
  is a first-class answer the moment a real player joins. THE 50 ms CAP: BOTH — the uncapped delta is
  recorded beside `total` AND the cap is stated in the legend, because documenting alone says the
  number is wrong without saying by how much, and the cap itself is load-bearing (`rawDt` feeds the
  physics accumulator) so it stays. `context` is ABSENT, not null, when nothing was supplied. 25
  tests green, two sabotages caught, no engine file edited, nothing minted.
- [LABEL-BENCH-1.md](LABEL-BENCH-1.md) — the drawing side of "number or name?". **The label layout is
  not a performance concern**: 0.021 ms a frame at 100 racers with numbers, 0.036–0.040 with names
  on, against a 3.47 ms physics step — about 1 % of one step and 0.24 % of a frame. **Short, long and
  mixed cost the same** (0.0398 / 0.0362 / 0.0390, a 10 % band inside a 9–18 % run spread), **and the
  reason is that long names are RATIONED, not cheap**: 3.4 of 16.5 labels carry a name against 5.5
  for short, while the characters actually drawn go UP, 91.6 against 51.4. Master's layout at 100 on
  the SAME captured frames is 0.0120 ms — so the chain costs 1.7× with names off and 3.0–3.3× with
  them on, and buys the occlusion criterion for 0.17 % of a frame; master grants every label a name
  and never asks whether it lands on a racer. THE LIMITATION IS THE MOST IMPORTANT PARAGRAPH: there
  is no canvas in node, so `ctx.measureText` and `fillText` are NOT measured and the numbers isolate
  the placement geometry — `measureCalls` and `charsDrawn` per frame are reported as the multiplicand
  a browser measurement would need. Frames are captured ONCE per field size and replayed into every
  arm, master included, so only the label text varies. Measured, nothing fixed. Raw data:
  `reports/perf/label-bench-1/`.
- [PHYS-BENCH-1.md](PHYS-BENCH-1.md) — what a physics step costs, and what moves it. **Q1: the two
  commits do not differ** — at n=100, chain / master / chain read 3.4683 / 3.4621 / 3.4649 ms, a
  0.1 % delta against a 0.1 % self-spread, so no cause is hunted. **The growth is QUADRATIC**:
  four independent fits give 1.899–1.975 at R² 0.993–0.9997. **Density is not the lever** — bunched
  vs spread is 0.93×–1.09× above n=50, and above n=50 the *spread* field costs *more*, so the
  owner's 3-vs-7.7 ms is a field 1.6× larger, not the same field at two densities. **`isSideFree`
  (`raceBehavior.js:287`) is the thing to attack**: with `applyRacerBehavior` it is 56 % of the step
  at n=30 and 79 % at n=100, and it alone moves +16.4 pp — the arithmetic signature of an all-pairs
  scan that does not cull by distance, which is exactly why density does not move it. Roster: no
  effect at n=100 (−1.2 %), +3.4/+5.3 % at n=70, and it measures the RACE a roster produces because
  a racer's name is physics. THE INSTRUMENT FAILED FIRST AND THAT IS IN THE REPORT: a naive
  three-pass A/B/A drifted 37 % at n=100 and the first roster table read long +27 % / mixed +35 %
  that were purely the clock warming up; adjacent-in-time triples and a palindrome fix both, and
  this laptop has two speed states a uniform 2× apart, so every ratio is trusted and every absolute
  is quoted with its state. Ceiling 80–150 racers depending on the drawing budget, which is NOT
  measured here. No engine file edited; nothing minted. Raw data: `reports/perf/phys-bench-1/`.
- [VERIFY-COST-2.md](VERIFY-COST-2.md) — cut the overhead, not the coverage. Measured first:
  `npm run verify` 504.9 s -> 417.8 s, the client suite 260.9 s -> 196.3 s, no fingerprint moved.
  THE FINDING: goldenEquality.test.js takes 67.6 s ALONE and 244.9 s in the suite — not slow,
  STARVED, because vitest parallelises across FILES and one file is one worker. Split into four
  (same cases, same assertions, one test added, case list in one home): 39.5 s. `it.concurrent`
  would have bought nothing — the races are synchronous and CPU-bound. CHEAP MODE on the three
  fingerprint scripts (one track): world 229 -> 17.8 s, camera 169 -> 2.5 s, render 160 -> 2.9 s,
  with a CHEAP- prefixed hash that cannot impersonate a real one and a refusal to combine with
  --quiet. The world fingerprint no longer runs for a COMMENT: a mechanical token-stream test with
  a real tokenizer, fail-safe in every direction — and its own trap test caught a false positive
  (acorn represents a regex token value as an object, so two different regexes compared equal).
  client-suite runs alone deliberately (retry:0 + timeouts under contention) and stays that way.
  The routine-subset split is argued AGAINST and not built.
- [LABEL-OCCLUSION-2.md](LABEL-OCCLUSION-2.md) — a name is earned slowly and given up instantly. The
  layout refuses to DRAW a name that is not clear in the frame being drawn, whatever the hold says,
  so `labelFormHold` governs PROMOTION only and its set is now an ENTITLEMENT, not a picture — a
  label can be entitled and drawn as a number in the same frame. THE PASS/FAIL IS MET: drawn
  name-on-racer 592/1006 → **0 on all four arms**. AND THE PREDICTION "at no cost in switches" WAS
  WRONG BY 2.6x: 2.84/2.20 → 7.48/4.30 against a 1.24–3.89 band, with the name share 20.7/12.5 →
  15.7/8.2 %. The cause is structural — the entitlement SURVIVES the cover, so the name returns the
  frame after the pack breathes and every breath is two switches; the symmetric rule absorbed them by
  leaving the name up, which was the defect. STOPPED at the measurement rather than tuning:
  `demoteHoldMs=0` is measured at 4.74/3.10 (calmer, because a lost entitlement must re-earn its two
  seconds) and a re-promotion cost and stage 3 are named unmeasured. `fits` is no longer consulted
  for the wide box — `nameClear` is strictly stronger. The sabotage is LABEL-OCCLUSION-1's own
  placement rule restored verbatim, and exactly ONE test goes red. The Dev Screen tooltip is
  knowingly stale until the owner settles the arm.
- [LABEL-OCCLUSION-1.md](LABEL-OCCLUSION-1.md) — the NAME only when it covers nothing. The owner's
  rule replaces LABEL-DEGRADE-1's "does it fit" and supersedes that report's area-budget proposal:
  a name is granted when its box overlaps neither a placed label NOR the drawn box of any OTHER
  racer, with NO tolerance. `racerScreenW` is new and is a real second number — 18.5 % anisotropy on
  a closed track. ONE THING THE SPEC DID NOT NAME AND THE RULE IS WRONG WITHOUT: a granted name must
  reserve its FULL width even on the frames the hold has not promoted it, or two neighbours are each
  judged clear against the other's NARROW box and land on top of each other two seconds later. The
  hold lives in its own module because the layout's contract is no state and no clock, and the name
  is tested EVERY frame including while the number shows — judging only the drawn form traps a label
  on the number forever. THE 400 ms WINDOW WAS WRONG AND THE MEASUREMENT MOVED IT TO 2000: at 400 the
  labels switch 9.9–11.7 times per label per race against the old rule's 1.24–3.89 baseline; the
  curve is 1000 → 5.8/5.4, 2000 → 2.84/2.20, 4000 → 1.03/0.63. THE PASS/FAIL IS CLEAN — names the
  criterion granted that overlap a racer = 0 on every arm — and the drawn count is reported beside it
  because a SYMMETRIC hold necessarily keeps a name over a racer for one window: 592/1006 held
  against 6/12 demoting immediately, which costs 40 % of the names. Name share is only 12.5–20.7 %,
  reported and NOT loosened. Four sabotages red, S1 and S2 each green under the other's mutation. The
  `[ra-build]` terminal line does not follow a branch switch — captured as a defect.
**START-BOARD-4 has no entry, and deliberately:** its spec asked for the report in the reply rather
than as a file, so there is no document here to index. Its subject — the board's own backdrop, the
number outranking the name, and the ellipsis on a cut name — is on `feat/start-board-4` at `5e1660b2`
and in that commit's message.

- [START-BOARD-3.md](START-BOARD-3.md) — the numbers read as numbers, and the alphabet is one list
  again. THE MISSING NUMBERS WERE NEVER MISSING and both named hypotheses were wrong: all 100
  `fillText` calls are emitted, `raceNumber` is present on every entry, and the 34 px gutter never
  collapsed — the portrait's visible body spans x in [35,65] and cannot reach it. What regressed is
  LEGIBILITY, and START-BOARD-2 caused it three ways at once: the number moved to the far margin,
  stayed 12 px while the name grew, and gold `ROW n` headings began recurring in the same strip. Now
  a badge — 13 px, brighter, on its own chip — and the column is pinned by an exported function that
  does not depend on the cell width, which is the failure mode that would reproduce it silently. The
  GROUPING IS WITHDRAWN, his own correction: ten alphabetical lists make you scan all ten, because
  not knowing your row is why you came. One global list, with the row as a dim right-hand `R7` kept
  apart from the number by FOUR separations, not one. The cell is 236 px again — the 200 was the
  grouping's price, 110 slots for 100 racers — so the name nets +10 px. 8/20/40/100 all at scale
  1.0, no overlap, no clipping. Render moved, camera and world did not. Named and costed, NOT built:
  sprite avoidance, where the only new input is a per-type long/narrow ratio and the real risk is
  fewer labels, not slower ones.
- [LABEL-DEGRADE-1.md](LABEL-DEGRADE-1.md) — a track label shows the NAME when it fits and the
  NUMBER when it does not. The archived overlap trigger was REUSED without re-typing, because the
  live decluttering already contains it in a stronger form (an area with a budget, not a boolean).
  Flicker is governed by that same asymmetry, extended to a SECOND tenure — a racer can hold its
  label while losing the room for its name. MEASURED on searound and river-run at 40 and 100:
  **1.24–3.89 switches per label per race**, which is calm. **DEFAULT OFF anyway, and the switching
  is not why**: the wider labels cost 3–7% of the labels and up to **32% more churn** (river-run 100:
  10.99 → 14.56/s), and the name fits **92–99%** of the time — so it is closer to "names instead of
  numbers" than to "the name when there is room", which would silently revert RACE-NUMBERS-1 in most
  frames. Cascade is impossible by construction: one decision per label per cycle in the existing
  priority order, never revisited. No fingerprint moved — with the toggle off the render path is
  byte-identical, which is the proof that "off" is the absence of the feature; flipping it moves the
  cheap render hash, which is the proof it reaches the picture. New harness
  `scripts/label-degrade-truth.mjs`. Not minted.
- [START-BOARD-2.md](START-BOARD-2.md) — the board becomes usable, after his eye test. Its own
  duration max(3000, 80 x n): 3.2 s at 40 and 8.0 s at 100 against 1.46 s for both — and THE
  COUNTDOWN NOW FOLLOWS THE BEATS instead of capping them. `countdownDurationMs` is gone, key and
  slider: `ceremonySchedule` returns `totalMs` and the proportional rescale that made every beat a
  function of every other beat is deleted. The push is NEVER stretched — a new BOARD beat holds the
  arrived camera still. Entry order NUMBER . SPRITE . NAME with nothing between the sprite and the
  name; grouped by START ROW, alphabetical within; portraits ~21 -> ~30 px, free once the number
  moved out of the middle. THE 70-OF-100 DEFECT DIAGNOSED AND THE HYPOTHESIS WAS WRONG: the board
  drops nobody and no racer is unnamed — SetupScreen fills from a 70-entry roster with
  slice(0, needed), so a Quick Test at 100 STARTS 70 racers. Not fixed: a roster change is an engine
  input and his decision. Layout 8/20/40/100 all at scale 1.0, no overlap, no clipping. Camera and
  render moved (one subsystem — the rhythm drives both), world unchanged. Not minted.
- [START-BOARD-1.md](START-BOARD-1.md) — the runners' board: every racer once, during the push, as
  name + number + its own sprite, alphabetical in columns and scannable at a glance. THE STILL POSE
  WAS FREE: `_getFrameIndex` is floor(((frame % period)/period) x frameCount), so frame 0 selects
  sheet frame 0 for any speed and any racer type — the shipped drawRacer needed no change. Layout is
  a pure function: 8 -> 2x6, 40 -> 5x8, 100 -> 5x20 all at full size, and past 100 it shrinks rather
  than clips. The countdown digits stop owning a count — derived from countdownDurationMs, so 4000
  shows 4-3-2-1 with GO! at zero instead of GO! standing for an extra second. AND THE RENDER
  FINGERPRINT HAD NEVER DRAWN A COUNTDOWN FRAME: the harness rendered its first frame AT the gun, so
  a three-second full-screen overlay could have shipped without moving the hash — window extended
  backwards, and the move is split into instrument (bc56f111) and content (ffe568e2). Camera and
  world unchanged. Measured and open: 100 names cannot be scanned in the push's 1.46 s. Not minted.
- [CEREMONY-HOLD-TARGET-1.md](CEREMONY-HOLD-TARGET-1.md) — the hold becomes a TARGET. The
  hand-over sat in `_transition`, which a race never reaches at the gun (the director is already in
  OVERVIEW), so the ceremony only set where the camera STARTED and OVERVIEW's own setting pulled it
  away from frame one. It is now read from `_stateCamZoom()` every frame and released at the first
  **view change**, not the first entry. river-run: travel ALONG over the first second **37.4 → 6.4
  world px** (master 4.8), the field's y in frame **0.427 → 0.486** (master 0.50), zoom held at
  1.1650 instead of easing to 1.0667; mountainstreet **0.389 → 0.505**. A second, unnoticed defect
  closed: the hand-over was never consumed at all, so the first MID-RACE OVERVIEW would have snapped
  to the ceremony's zoom. **The pan half of the prescription was built, measured and REJECTED** —
  it satisfies all three predicted columns and leaves 37 of 40 racers off-screen at the release,
  because the hold lasts 4983 ms and `_fieldCeiling` measures around the ANCHOR, not around the
  camera. The window trace is a committed tool now (`scripts/gun-window-truth.mjs`); the two blocks
  before it measured from patched copies in a scratch worktree that no longer exists. Camera and
  render moved, world unchanged. Not minted, not merged.
- [CEREMONY-REGRESSION-BISECT-1.md](CEREMONY-REGRESSION-BISECT-1.md) — **LANDED 2026-08-09 AS
  HISTORY, with a dated head-note: §2's verdict describes trees that are now 30+ commits behind and
  is NOT a live claim.** Originally: **the commit is `ffa68d94`
  (START-CEREMONY-CAMERA-1); CEREMONY-HANDOVER-1 changed nothing here**, its column is identical to
  the digit. Two corrections: the **x = 0.27 figure is NOT the regression** (master is 0.26 — the
  field was always in the left third), and what actually changed is the OTHER axis and the motion —
  the field is walked UP the frame (y 0.50 held on master vs 0.42 after), the centre now travels
  **4.8 -> 37.1 world px** along the track (7.7x), and its approach to the centreline changes from
  monotonic to an overshoot-and-return. **The frame-fraction hypothesis is CONTRADICTED**: the
  ceremony's held frame is 8.4% NARROWER (732 vs 800 world px), so a frame-fraction bias would shift
  less, not more. Inference named but not isolated: the first OVERVIEW is now handed the field-derived
  hold instead of its own setting, so a settled state became a zoom transition.
- [CORRIDOR-OVERLAY-1.md](CORRIDOR-OVERLAY-1.md) — **DROPPED by the owner; code archived at
  `archive/corridor-overlay-1`, findings kept (see [DEAD-ENDS.md](../../docs/DEAD-ENDS.md) §K).** A Dev Screen overlay (default OFF) drawing the
  logical corridor and a cross on the frame centre. **The deciding picture is NOT delivered** — the
  background does not blit in the capture and the red edges still do not draw, so no verdict is
  claimed. What it DID find: `EditorShape.getPosition(t, offset)` treats the offset as NORMALISED
  against `track.width`, and the same `width: 300` is a FULL width in the physics and the camera
  (racers at 0.5 -> 150 px; `_trackWidthPx / 2`) but a HALF width in the code that draws the track
  edges (`getPosition(0, 1.0)` -> 300 px). **A factor of two between what is drawn and what the
  camera guarantees** — a strong candidate for the root of the river-run dispute, deliberately not
- [CEREMONY-HOLD-CENTRE-1.md](CEREMONY-HOLD-CENTRE-1.md) — **STAGE 1 ONLY, nothing built.** First
  second after the gun, camera centre split along/across the track: river-run **along 37.1 / across
  52.7** (ratio 1.42), searound **along 73.9 / across 0.5** (ratio 0.01) — a 142x difference, which is
  the owner's distinction in numbers. **But the camera does NOT leave the track:** the centre stays
  within 18 px of the centreline against a 150 px half-width, so the ACROSS figure is the road bending,
  not the camera departing. The measurement that matches what he sees is the field's position in
  frame: **river-run puts the field centre at x=0.27 in the FIRST frame after the gun, searound at
  0.50** — a discontinuity, not a drift. Cause is a THIRD thing: the forward bias is right but arrives
  before the field is strung out, so a still-blocky pack lands with the forward-framed leader in the
  left third. The across-track guarantee applies and correctly returns zero. Stage 2's premise is
  confirmed but it was NOT built — the stop rule asks for stage 1 first and the diagnosis differs from
  the hypothesis stage 2 was written against.
  **ADDENDUM: the owner disputed the "does not leave the track" claim at the picture and was right.**
  Open tracks draw NO track surface (`renderRaceFrame.js:150`), so on river-run the visible river is
  the background ARTWORK while `width: 300` is a physics/camera number — my figure measured the
  logical corridor, his eye judges the painted one, and nothing makes them agree. §2's conclusion is
  withdrawn; §4's diagnosis is measured in image coordinates and stands. Possible second defect named
  for him: every guarantee expressed in track widths may be keeping a promise about a corridor the
  viewer cannot see.
- [CEREMONY-HANDOVER-1.md](CEREMONY-HANDOVER-1.md) — the field guarantee no longer stops at the gun,
  and the settled beat became a control instead of a remainder. The racing-time promise is the COMPANY
  guarantee with the WHOLE FIELD as its company — reuse that is correctness, not economy, because the
  ceremony's own version measures from the formation's CENTRE while the racing camera sits on the
  leader, forward-framed. Retires when its ceiling falls below OVERVIEW's zoom: the widest shot the
  design has a name for. **river-run 23/40 → 4/40 racers lost, frames losing anybody 884 → 488**;
  mountainstreet 19/40 → 4/40. **Two tracks get nothing** — ice-track and space-sprint retire on frame
  one, hashes byte-identical to the parent. (c) HOLDS and searound was not a coincidence: measuring
  from a moving anchor is what makes the centre travel with the field. Camera moved on 8 of 10, render
  moved, world unchanged. My first attempt at the settled slider re-created the very defect it was
  fixing and a test caught it. A stale measured stamp from the PREVIOUS block is re-measured here —
  verify could not have seen it, because the guard compares against committed history.
- [START-CEREMONY-CAMERA-1.md](START-CEREMONY-CAMERA-1.md) — the race opens on the whole track, held
  still, then eases in to the formation until it is as large as it can be with every racer still in
  frame, and that framing is held into the race. **Both ends of the move are GEOMETRY and neither is
  a setting** — the track's own extent and the field's own extent, the latter through a new
  `fieldGuarantee`; only the rhythm is sliders. The hold is a DESIRED zoom, not a freeze: it enters
  `Math.min` with the guarantees, so they can widen it and cannot narrow it (L192 by construction).
  COUNTDOWN did NOT become a row in FRAMING_BY_STATE — the table is read only for states the machine
  reaches during RACING, so a row would be a setting nothing reads; the value came from the GUARANTEE
  instead and both halves arrived. Measured on 10 tracks x 5 field sizes from real formations: all 50
  keep every racer in frame, target ranges 0.632 to 13.784. Camera moved on all ten, render moved,
  world unchanged. **Open question for the owner: at 100 racers the first view change is a 2.6-4.1x
  jump** — named with numbers, no mechanism added, his taste to decide.
- [LABEL-OFFSET-1.md](LABEL-OFFSET-1.md) — the label's distance from its racer was `fontPx * 2.0`, a
  property of the TEXT, so it stayed put while the racer changed size. It is now half the racer's
  DRAWN height plus a margin slider (`nameTagMarginPx`, 6 px), which needs no per-track constant
  because it falls out of the drawn size. **The measurement found a second, worse defect nobody had
  named:** the old 31.7 px offset meant any racer drawn taller than 63.4 px had the bottom of its
  label INSIDE its own sprite, and all ten tracks reach 82-160 px at close zoom — so at the tight end
  of every track the labels were sitting on the racers. Drawn racers run 27.4 px to 160.0 px; the
  VISIBLE space between sprite and label is now one constant everywhere. Declutter drops measured as
  an A/B in one run: identical on all ten tracks and op counts identical to the digit, because every
  racer in a frame is drawn at one size so the change is a pure translation. Render moved on all ten,
  world unchanged (engine-reach said it was owed, so it was run).
- [RACE-NUMBERS-1.md](RACE-NUMBERS-1.md) — the racer wears a NUMBER on the track (at most three
  characters) and the standings list carries the number before the name. The draw cannot shift the
  race and the guarantee is structural: `assignRaceNumbers` takes no rng argument, builds its own
  generator and discards it. **The trap that would have caught a careful implementation:** an unseeded
  race runs off `Math.random` directly, so a "fall back to Math.random" numbering would consume from
  the race's own stream in exactly the case it thought was safe — the fallback is a constant, and a
  test asserts `Math.random` is never called. Proved three ways (world unchanged, engine-reach clear,
  and an independent generator lands where it would have). Render moved on all ten tracks as expected;
  the op counts went UP, because shorter labels collide less so MORE labels survive decluttering.
  Caught on the way: the harness knew nothing of `raceNumber` and would have gone straight back to
  measuring empty label boxes.
- [HARNESS-NAMES-1.md](HARNESS-NAMES-1.md) — the render harness never set `r.name`, so every label
  box in it was 8px of padding: it measured a geometry the game cannot produce. Fixed with the MIXED
  roster, by index, imported from the one home; render **re-minted deliberately** to
  `f2e170d17ccf84e9` as an INSTRUMENT change (world and camera unchanged, engine-reach says the diff
  cannot reach the engine). **The block's own proof did not come out as predicted and the report
  leads with that:** attribution was never broken — a one-track change moved one hash both before and
  after. What was broken is narrower, and the second probe found something new: with MIXED at 40
  racers every track genuinely overlaps, so the instrument now SATURATES for the class of rule it was
  fixed to measure. Two further harness blind spots named, including that `verify` does not run the
  render guard when the harness itself changes.
- [CLEANUP-BEFORE-NUMBERS-1.md](CLEANUP-BEFORE-NUMBERS-1.md) — salvage what lasts, then drop the
  rest. The four label branches land as history FIRST, then the two invisible pieces are salvaged
  (the countdown gets one home and its dead-but-live Dev control is removed; the label box gets one
  home), then the branches are archived as tags and deleted. The overlap trigger was dropped
  deliberately: exact, and out of a job once race numbers make its condition unreachable. Both
  fingerprints unchanged — asked of `engine-reach` rather than assumed, which said the world one was
  owed. Master afterwards: one open branch, `feat/min-racers-visible-5`.
- [ROLL-CALL-PAIRING-1.md](ROLL-CALL-PAIRING-1.md) — **NOT SHIPPED (recorded result).** A label
  centred on its racer only POINTS at it while it is about one racer wide; with realistic names it
  spans a handful and identifies none. That finding is why the race-number design exists, and it
  applies to any label wide enough. Measured: dimming everyone else still leaves 74-100% of labels
  ambiguous, and pairing is a LONG-NAME problem, not a crowded-formation one — a one-wave formation
  at 30 racers was 100% ambiguous.
- [START-SEQUENCE-1.md](START-SEQUENCE-1.md) — **ROLL CALL NOT SHIPPED (recorded result).** Waves of
  names during the countdown: 0 overlaps, 0 names missed, 86.5% of cases needing one wave. Its stage
  0 finding IS on master — the countdown was a three-way disagreement where only `countdownDurationMs`
  governed anything. Still open and deliberately not salvaged: the overlay counts from a hard-coded 3
  while the phase lasts 4000 ms, so "GO!" stands an extra second.
- [LABEL-SHRINK-1.md](LABEL-SHRINK-1.md) — **BUILT AND REJECTED AT THE PICTURE (recorded result).**
  It cleared every overlap at every field size and the owner judged the result unacceptable to look
  at — a rule can pass every number it was given and still be wrong. Two findings outlive it: the
  render-fingerprint harness draws NAMELESS racers and cannot see this class of change, and stability
  between adjacent field sizes cannot hold while the start grid is a staircase. Its label-box
  unification IS on master.
- [LABEL-STAGGER-1.md](LABEL-STAGGER-1.md) — **NEVER SHIPPED (recorded negative result).** A stagger
  CREATES as many overlaps as it removes: start rows are not monotonic in screen y, so shifting a
  whole row walks the collision into the next one. Four variants measured, none reaching zero.
- [QUICKTEST-NAMES-1.md](QUICKTEST-NAMES-1.md) — testing with realistic name lengths, and **the
  shrink rule does not survive it**. Every overlap number this project had measured was a statement
  about a 4-8 character roster. With realistic names (mean 19.4) the picture inverts: 3 affected
  tracks become **10 of 10**, the 0.6 legibility floor is hit on **9 of 10**, and **365 field sizes
  still overlap after the shrink has done everything it can** — headroom 0.096 -> 0.000. The numbers
  point at the roll-call-in-waves proposal, not at more shrink. QUICK_TEST_NAMES is byte-identical
  (world fingerprint `dc4647be0f55ebdb` unchanged, golden parity 14/14); LONG and MIXED are additional
  and selectable, defaulting to the original BY IDENTITY. Also found: the maximum name length has
  **three different answers** — 32 at the input, 100 at the server, and no limit at all in the
  renderer, where a 100-character name draws a box over half the frame wide.
  **it works**: zero overlaps at every field size on all ten tracks, zero formations touched that did
  not need it, floor never reached. The factor is closed-form from the formation's own geometry
  (0.896 garden-path / 0.805 mountainstreet / 0.696 river-run); smallest anywhere 0.696 against a
  0.6 floor, so **headroom is 0.096** — one denser racer type from needing proposal A. Two things to
  read before minting: requirement (f) is **NOT met** (26.1% size step between 72 and 73 racers,
  because the START GRID steps there, 3x24 -> 4x19 — every way of smoothing it breaks "only where
  necessary"); and proving rule (c) exposed that **the render fingerprint harness draws NAMELESS
  racers**, so the hash moves for all ten tracks while only three change in the browser. Rule (c)
  itself is proven byte-exact: with the shrink bypassed the branch reproduces master's combined AND
  per-track hashes exactly.
  not work**. The TRIGGER shipped and is exact — across all ten tracks at every field size it fires on
  0 formations with no overlap and misses 0 that have one — but the rule as specified could not be
  implemented: comparing row separation against the label's HEIGHT fires 153 times where nothing
  overlaps, because a label is a rectangle and two of them miss on either axis. The PLACEMENT did not
  ship: four variants measured (row parity at one and two box heights, greedy by screen order at two
  and six levels) and none reaches zero — it is not vertical room, six levels is no better than two.
  A whole-row stagger walks the collision into the next row and CREATES overlaps, proved on a probe.
  Render fingerprint deliberately UNCHANGED, which is the evidence that nothing moved. Found on the
  way: mountainstreet also overlaps (33 field sizes) — the first ten-track sweep; and the rule
  toggles on and off between adjacent racer counts, 17 times on mountainstreet.
- [NAME-LIMIT-1.md](NAME-LIMIT-1.md) — one player-name limit (32), enforced where names ENTER rather
  than by an input attribute. **His data is safe: 0 of 304 stored names exceed 32, longest is 22**,
  so nothing was migrated and nothing needed to be. One home in `shared/nameLimits.mjs` — at the repo
  root because the limit must match on both sides of an HTTP boundary and neither package can import
  from the other. Three entry points wired; the real hole was the player-group editor, whose
  comma-separated field had **no length guard at all**, leaving the server's 100 as the only defence.
  Over-length names are REJECTED with a visible reason naming the offenders, never silently trimmed.
  The renderer still has no guard and would draw a 100-character name ~750px wide — proposed, not
  built. A 32-character name measures ~283px realistically, 486px worst case, against the current
  roster's 55px mean.
- [DOC-ORDER-1.md](DOC-ORDER-1.md) — documentation a stranger could actually be handed. The evidence
  for his own suspicion that most documents were never asked for: twenty of fifty-three were the
  by-product of one work session and had had no substantive change since a bulk German-to-English
  translation pass in May — they are now in `docs/archive/`, whose first line says nothing there is
  current. A three-tier map (the project · how we work · history) replaces an index that listed 15 of
  51 documents. New: `docs/GLOSSARY.md`, which caught three words that each mean two unrelated things
  (corridor, band, pulk). The two-year test was run for real and **failed one of three questions** —
  the fixed points lived only in tier 2, so `PROJECT-PRINCIPLES.md` now owns them — and it failed on
  step ONE, because the README told a newcomer the wrong dev-server port, as did four other places
  including a live backlog recommendation. Six weakest spots named; BACKLOG/ROADMAP still half-own a
  subject and that is the bluntest of them.
- [START-FORMATION-1.md](START-FORMATION-1.md) — the start formation, from his eye test. Names now
  draw LAST, after every sprite, so no racer can cover one — render fingerprint moved (expected, the
  order is what it hashes), camera unchanged, world not run and not needed; his eye PASSED, so it was minted
  (render cf716cbdf37b2077) and merged as 81f9b908; return point `pre/start-formation`. The label overlap on river-run is NOT lateral crowding: every overlapping pair,
  on every track, at every racer count, is between neighbouring START ROWS, and the row gap follows
  the racer type's `displaySize`. Swept every count from 2 to the full grid on his instruction —
  river-run fails 56 of 99, the other three fail none. Also found: the start has NO framing rule,
  COUNTDOWN is absent from the six-state table. Four routes for the overlap, none implemented.
- [MERGE-AND-GUARD-1.md](MERGE-AND-GUARD-1.md) — merge what is ready, then the next one-truth target.
  CONFIG-TRUTH-1 and the owner's backup tool merged to master (merge commits, containment proved);
  the backup tool RUN and confirmed at its documented 247 files / 12.0 MB, `--minimal` still dropping
  exactly `sessions.sqlite`. Rebase merging disabled — merge commits are now the only way in. The
  fairness threshold gets one home in `docs/FAIRNESS.md` (19 restatements → 0). **The track-count
  check was built, run and ABANDONED as unbuildable** — the evidence is in the guard's header, and
  R11 now records that abandoning a guard is a legitimate outcome. Nine config claims found that
  CONFIG-TRUTH-1's narrower shape had missed. CI still owed: the Actions outage ran all evening,
  though the new `workflow_dispatch` hand crank does now create runs.
- [CONFIG-TRUTH-1.md](CONFIG-TRUTH-1.md) — the owner's values land, and documents stop stating
  numbers. 94 current config claims across 11 living documents → 0, enforced by
  `check-config-claims.mjs` in CI, the commit hook and verify; nine archives now declare themselves
  HISTORICAL. Squash merging disabled at repo level (rebase still on — his call).
  `minRacersVisible` 3 → 5 hit its stop rule: it moves the camera fingerprint AND the render one, so
  it sits unmerged and unminted on its own branch awaiting the ceremony and his eye. The
  `choreoOutcomeStart` premise verified three ways from history. CI on master still owed — the
  GitHub Actions outage ran all evening.
- [CLEAN-STATE-1.md](CLEAN-STATE-1.md) — merge, then one green master with no loose ends. The three
  ONE-TRUTH branches merged as merge commits (a squash would have destroyed the SHA a stamp names),
  three branches deleted, tracking-lag re-measured independently and reproducing cell for cell. A
  wrapper so an ad-hoc helper can prove its edit landed — and the line-ending trap its own sabotage
  found. A test that wrote the TRACKED SIM.md fixed at the cause, not with a retry. Lessons 205 and 206. Config contradictions: seven keys stated as current and wrong, five of them in one document —
  findings only, nothing changed. CI on master unproven: GitHub Actions outage.
- [ONE-TRUTH-2.md](ONE-TRUTH-2.md) — one home, references everywhere else. The owner’s rule:
  all 19 generated fingerprint copies DELETED, documents reference the record or say nothing. The
  containment guard ONE-TRUTH-1 discarded as unsound is now sound and built. Retries to zero, ten
  clean runs. Two silent traps made loud: a swallowed CLI flag and a write that did not land.
- [ONE-TRUTH-1.md](ONE-TRUTH-1.md) — one fact, one home. The three fingerprints got a single
  machine-readable record and 19 documented copies were machine-written and machine-checked.
  Superseded by ONE-TRUTH-2, which deleted all 19 copies instead. Also: the 20-run retry study that
  found the suite failing 3 runs in 10, and the generated engine-reach list in SIM.md.
- [NIGHT-TOOLS-1.md](NIGHT-TOOLS-1.md) — instrument truth. The retry ledger, check-index's second
  direction, the generated ceremony cost column, and the pixel and documentation audits below.
- [E-doc-audit.md](E-doc-audit.md) — the documentation audit from NIGHT-TOOLS-1 stage E.
- [D-pixel-audit.md](D-pixel-audit.md) — the pixel audit from NIGHT-TOOLS-1 stage D.

**Not indexed, and deliberately:** `captures/` holds verbatim BEFORE snapshots taken so a tool's
output could be compared after it changed. They are evidence, not reports, and `check-index` does
not descend into subdirectories.
