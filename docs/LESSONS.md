# LESSONS.md — Insights from Development

**Owns:** the numbered lessons (L-numbers), which the rest of the codebase cites by number. Append-only.

> **✅ Baseline re-measured (2026-07-26).** Absolute sim numbers in this document (band-reach, runaway, P1-contest, physics-tax, gate results) predate the plan-grid unification + speed/duration ship and are retired history. The current baseline is [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md) (speed-150, pooled band-reach 71.0%) and the CANDIDATE column of [reports/parity/GS-CONFIRM-GATE.md](../reports/parity/GS-CONFIRM-GATE.md) (band-reach 72.7%, dead finales 10.0%, runaway 6.8%).

Lessons learned in the past that are relevant for future phases.
Updated after each major phase or upon important insights.

---

## Lesson 1 — UI Drift Despite Green Tests (PR #16)

**Context:** D3.5.3 switched the code registry to 12 types. All tests passed.
But the UI (RacerManager in the Dev Screen) continued reading from the old 5-type localStorage list —
completely unnoticed until the visual smoke test.

**Insight:** Code tests do not cover whether UI components read their data from the correct
source. A component can render data from an obsolete source while all associated unit tests remain green.

**Consequence:** For large data model changes (new storage key, new API, different source of truth),
explicitly specify the UI layer and verify it visually.
CC Smoke Test Convention established as a direct result.

---

## Lesson 2 — Migration Sweep Must Cover All Fields (PR #17)

**Context:** Track configs had `defaultRacerTypeId`, `racerTypeId`, `racerId`, and `icon`
in parallel — all potentially with the old 'car' value. The original `migrateCarToBuggy()`
IIFE only patched `defaultRacerTypeId`. For City Circuit (localStorage entry with
`racerTypeId: 'car'`), the SetupScreen merge logic showed `racerTypeId: 'car'` →
`getRacerType('car')` → fallback Horse → wrong emoji. The bug only surfaced during the Playwright
smoke test, even though the migration appeared "complete".

**Insight:** Storage migrations must cover all semantically equivalent fields,
not just the obviously named one. Cosmetics (icon, emoji) derived from the same IDs
also belong to the sweep.

**Consequence:** Before every storage migration, do a code sweep over all ID fields and
derived cosmetics, not just the obviously named one.

---

## Lesson 3 — Check Sprite Perspective Before Implementation (D3.5.3 Dragon)

**Context:** The first dragon sprite generation was in 3/4-front perspective instead of top-down
(consistent with all other types in the app). The discrepancy from the app convention was only
discovered during visual comparison.

**Insight:** AI-generated or external sprites can be stylistically and perspectively
inconsistent with the app convention. This is not detectable through code tests.

**Consequence:** For AI-generated or external sprites, visually verify style/perspective
before implementing. For sprite reviews: top-down, approximately 128px size,
movement direction to the right, transparent background.

---

## Lesson 4 — Discipline the Spec Writing Style

**Context:** Early specs had too much implementation detail (concrete variable names,
loop structures, specific algorithm implementations). This unnecessarily constrained Claude Code
and led to suboptimal solutions where Claude Code would have chosen a better approach.

**Insight:** Claude Code is closer to the code stack and makes better decisions
about internal implementation. Strategic Claude knows better What and Why, Claude
Code knows better How.

**Consequence:** Spec writing style convention established — strategic Claude describes
What+Why (requirements, API signatures, storage schemas, test expectations). Implementation
(the How) is left to Claude Code by strategic Claude. Code examples in specs only when
interfaces or APIs are being defined, not as implementation guidance for internal logic.

---

## Lesson 5 — Separate Pre-existing vs. PR-caused Issues (PR #17 Quality Gate)

**Context:** The Quality Gate on PR #17 found pre-existing tech debts: TrackEditor.jsx (1006 LOC)
and RaceScreen/index.jsx (886 LOC) — both well above the 400-LOC threshold. Treating these as
merge blockers would have been wrong, since PR #17 did not introduce these problems.

**Insight:** Quality Gate findings must be separated by origin. Pre-existing
problems are valid tech debt, but not a reason to block an independent PR.

**Consequence:** Quality Gate reports separate "introduced by this PR" and "pre-existing".
Pre-existing findings tracked as their own phase (here: Phase Q-6, Q-7). Merge decision
is based primarily on PR-introduced findings.

---

## Lesson 6 — Schema Change: New Key Is Better Than Repurposing (PR #17)

**Context:** The original spec for B-7 said to repurpose the existing `racearena:racerTypes` key
(from array to override map). Claude Code instead chose a new key `racearena:racerTypeOverrides`.
That was cleaner: clear separation legacy vs. new, migration IIFE could read the old key and
directly convert, new key always only has the new semantic content.

**Insight:** When a storage key is semantically repurposed (different content, different
format), a new key is almost always cleaner. The old key becomes the clear legacy marker
for migration.

**Consequence:** For future storage schema changes, new key as default; old key becomes legacy.
Migration IIFE reads old key, writes new key, removes old key.

---

## Lesson 7 — Quality Gate Findings Can Be False Positives (PR #17 Cleanup)

**Context:** Quality Gate finding "SystemSettings JSON.parse without try/catch" was incorrect —
inspection of the code showed that try/catch was already present (lines 47-54).
The automated grep had only found the `JSON.parse` line, not the surrounding
try/catch structure.

**Insight:** Quality Gate reports are hints, not absolute truths. Grepping
at the pattern level can miss the context (surrounding try/catch block).

**Consequence:** Always check findings in context when fixing. Honestly report
when a finding turns out to be a false positive. This increases trust in future reports.

---

## Lesson 8 — Test Framework Integration Needs Exclude Patterns (PR #19)

**Context:** When Playwright was introduced in PR #19, the `e2e/` pattern was not excluded in
`vitest.config.js`. Vitest tried to import the Playwright spec —
`npm test` failed red, even though 628 unit tests and 22 e2e tests were individually green.
Only the Quality Gate revealed this.

**Insight:** Vitest matches all `*.spec.*` files by default — including Playwright specs
that expect completely different globals (`test.describe`, `page`). The errors appear
only when attempting to import the spec, not when writing it.

**Consequence:** When integrating a new test framework: explicitly add
`exclude` patterns in the other test configs. When adding
a new test directory structure (`e2e/`, `integration/`, etc.):
code sweep over all test configs, ensuring none tries to load the
wrong directory content.

---

## Lesson 9 — Constants Extraction Is Only Half-done When Not All Consumers Are Updated (PR #19)

**Context:** D9 exported constants in `lapUtils.js` (`BASE_SPEED_MIN`, `BASE_SPEED_MAX`,
`REFERENCE_FPS`) so that UI estimates and the race engine use the same values.
RaceScreen did not import them, however, and duplicated the values directly in code.
Numerically identical at the time — but if the constants were tuned,
silent drift would have occurred.

**Insight:** Constants extraction to a shared file is only complete when all
consumers — existing and new — actually import. Numerical equality at the
moment of extraction does not protect against future drift.

**Consequence:** When extracting constants to a shared file:
code sweep over all places where the same value appears, switch all consumers
to the import. Not just the "new" consumers — also the existing ones. Tests should ensure the symmetry.

---

## Lesson 10 — File Header Convention Also for Test Infrastructure (PR #19)

**Context:** `playwright.config.js` and `e2e/d9-smoke.spec.js` were initially written without the
standard project file header. Test infrastructure is also repo code
and should follow the same conventions as source files.

**Insight:** The reflex "it's just a config / a test" causes new
infrastructure files not to inherit the conventions established in the rest of the repo. This
only surfaces at the Quality Gate, not when writing.

**Consequence:** When creating new files (regardless of whether source, config, or test):
apply standard header. Quality Gate check for file headers applies to all
`.js`/`.jsx`/`.config.*` files, not just source.

---

## Lesson 11 — UX Verification as an Additional Smoke Test Layer (PR #21)

**Context:** D3.5.5 had extensive UI impact (edit modal, 6 fields, tooltips, override
indicators, validation). In addition to the normal smoke test (`d355-smoke.spec.js`, 14 tests), a
separate UX verification spec (`d3-5-5-ux-verification.spec.js`, 21 tests) was created.
It covered behavioral aspects that normal smoke tests don't check: tooltip contents,
override indicator visibility, validation recovery, modal layout consistency on different
viewports, state isolation between modal invocations. All 21/21 green.

**Insight:** Functional smoke tests (does it open the modal? does it write to localStorage?) don't cover
whether the UX is correct: whether badges appear/disappear, whether error messages are cleared after
correction, whether buttons are correctly disabled. This layer needs its own tests.

**Consequence:** For UI-heavy phases, consider a separate UX verification spec
(`*-ux-verification.spec.js`). Spec is kept permanently as regression protection.
Convention extension of the CC Smoke Test Convention (→ PROJECT-PRINCIPLES.md).

---

## Lesson 12 — CI Wait Time in the Auto-Merge Workflow (PR #21)

**Context:** When merging PR #21, `gh pr merge` initially showed the error
`Pull Request is not mergeable (mergePullRequest)`. Status via `gh pr view` was
`mergeStateStatus: UNSTABLE` because the GitHub Actions CI run for the last commit had not yet
completed. Fix: `gh run watch` to wait, then re-running `gh pr merge` — successful.

**Insight:** GitHub considers a PR "not mergeable" when CI is still pending,
even if there is no branch protection requirement for green CI. `UNSTABLE` ≠ `BLOCKED`.
Briefly waiting for CI completion resolves the problem.

**Consequence:** Auto-merge prompts should plan for `gh pr checks` or a brief CI wait time.
Workflow: after push, wait until CI is green, then `gh pr merge`. For `UNSTABLE`:
`gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')`.

---

## Lesson 13 — Pre-Sets Can Mask a Real Bug (D10)

**Context:** In D10 (track size variability), pre-set buttons
(HD/FHD/QHD/4K) for `worldWidth` and `worldHeight` were initially implemented. This worked
technically, but the user's objection "why would I even need to choose a format?" revealed:
actual image dimensions (1168×784, 1536×1024) never matched pre-set values
— the code was therefore working with fundamentally wrong worldWidth/Height values compared to the
actual images.

Only when the image-first workflow fix was applied did it become visible that dimensions are a property of the
image, not a track setting.

**Insight:** When the UI asks the user for values that could be derived from an asset
(image dimensions, file sizes, etc.), it is better to derive them automatically rather than
let the user choose. The user otherwise has no meaningful basis for the choice and will probably choose wrong.

**Consequence:** For UI designs that ask for values that can be derived from existing assets:
derive automatically. Pre-sets that "roughly fit" mask the actual bug (wrong values)
and give the user a meaningless choice.

---

## Lesson 14 — User Gut Feeling Is More Valuable Than Spec Anticipation (D10 Post-Test)

**Context:** Strategic Claude had planned pre-set buttons in the D10 spec as a pragmatic
solution, without questioning whether the values match actual images. Only the
user's objection "why choose a format at all" revealed the design problem
(→ Lesson 13).

Similarly with B-16/B-17: user test with a large track revealed two critical problems
(camera stays still, race speed feels too fast) that were not anticipated in the D10 spec.
Track size changes have effects on camera heuristics and
speed perception that only become visible through practical testing.

**Insight:** For UX designs always question from the user's perspective, even if the
implementation is functionally correct. User browser tests are a distinct verification
layer that systematic tests cannot replace: they reveal problems overlooked in
specs, because specs think logically, but users react intuitively.

**Consequence:** After every major phase, plan a user browser test — don't count only
automated tests as verification. When a user objection "why X?" comes:
first ask whether X is necessary at all, rather than justifying X.

---

## Lesson 15 — E2E Selector Drift: Tests Become Stale When UI Text Changes (PR #27)

**Context:** After B-Wave (PR #25), 7 pre-existing selector errors were discovered in b-wave-smoke and
b1617-smoke: a label had changed from German to English, a
`getByRole` hit a different DOM node, a text match was not anchored long enough.
These tests were correct when written — but every UI string change makes text-based
selectors fragile.

**Insight:** Playwright tests with hard text matches (`getByText('Select Geometry')`,
`getByRole('option', { name: 'City Circuit' })`) go stale silently when UI text is changed in
another PR. The tests fail only in the next CI run, not when writing the UI change.

**Consequence:** For UI string changes (German → English, label renames): code sweep
over all e2e specs for affected selectors. Prefer more robust selectors: `data-testid`,
ARIA roles with partial match (`{ name: /City/ }`), or `.first()` for unavoidable ambiguity.

---

## Lesson 16 — Return Gap in Storage Layer Masks Feature Bug (fix/list-tracks)

**Context:** `listTracks()` in `trackStorage.js` did not return `worldWidth` and `worldHeight`.
This had been a bug since D10, but for all existing tracks (1280×720) the consequence was
invisible: bsX=1.0 was correct for 1280px. Only when testing with an actual 6000px track
did it become visible that only ~549px of the world were rendered.

**Insight:** Storage layer gaps (missing fields in the return object) can be completely hidden by default
fallbacks (`?? 1280`) in the consumer as long as the default value matches the
real value. A new feature class (large tracks) cancels out the default and
only then makes the bug visible.

**Consequence:** After storage schema extensions (new field), explicitly test all read paths,
not just write paths. Unit test for `listTracks()` should verify all fields from the
stored object in the return object — not just the obvious ones (id, name, icon).

---

## Lesson 17 — Browser Test as Ground Truth, Even When Unit + E2E Are Green (D11)

**Context:** Before merging PR #30, 809 unit tests and 183 e2e tests were green.
Browser test by user still found 4 visual bugs: (1) black borders on small
tracks at high zoom (camera world-edge clamp was missing), (2) sprite minScale 0.4 too small
(racers became nearly invisible), (3) symmetric avoidance forces canceled each other in
evenly distributed packs (middle racers did not move), (4) auto sprite scale
on open tracks ignored camera zoom → wrong sprite size.

**Insight:** Unit and E2E tests check what the code calculates — not what the
user sees. There are at least 4 test gaps that systematically let visual
bugs through:

1. **Visual outcome tests** missing: no test checks "does the racer look
   visible on the canvas", "are there black borders"
2. **Boundary geometry tests** missing: tests with small tracks, extreme racer counts,
   high zoom levels
3. **Realistic configuration tests** missing: real track-racer combos (6000px track,
   20+ racers) as test input instead of unit minimal values
4. **Effect verification** missing: tests check whether avoidance code runs — not whether
   racers actually move noticeably

**Consequence:** For every feature with visual output: plan a browser test after
automated tests. Green tests are necessary but not sufficient for visually
correct results. For rendering, camera, scaling: explicitly use boundary configs
and realistic configs as test input.

---

## Lesson 18 — Recognizing Accumulated Complexity and Deciding to Stop-and-Refactor (D11)

**Context:** After D11, 4 multiplicative scaling factors were active:
`speedScale` (track length), `displaySizeScale` (lane-based + pixelFloor),
`cameraZoomFactor` (closed track invariant or open track formula),
`behaviorSpeedFactor` (drafting boost). Each factor was introduced correctly and in isolation,
but their interplay was identified as visually opaque through browser tests.
Tuning one factor had unexpected interactions with others.

The result (D11 + visual fixes) was merged anyway — as "functionally good enough"
for the current use case — rather than continuing to tune. At the same time, D7 was
prioritized as the next phase with the explicit mandate: vision discussion first, then
structured refactor of the scaling pipeline.

**Insight:** When multiple features are developed independently correctly but their
combinations become hard to predict, "adding another feature on top" is often the wrong
path. The pattern: bugs appear increasingly in combination scenarios, fixes for A
break B. This is the signal for Accumulated Complexity — the architecture has been
overtaken by feature density.

The right response: merge what works, then plan Stop-and-Refactor as its own phase
(D7). Not: further tuning on a fragile basis.

**Consequence:** When feature fixes increasingly occur in combination scenarios
rather than in isolation: prioritize architecture review. Merging "functionally good enough" is a
valid decision when a structured follow-up plan exists. Vision discussion
before writing code: clarifies what "good" means before the implementation determines how.

---

## Lesson 19 — Browser-Test-driven Architecture Correction (D7a)

**Context:** D7a was implemented with mathematical correctness as the primary goal: sprites
should maintain constant screen size across all camera zoom states (`cameraZoomFactor`
× `effZoom = REFERENCE_CAMERA_ZOOM`). 819 unit + 183 e2e tests confirmed correct
implementation.

**But:** User browser test showed that the sprites "feel wrong". On open track,
sprites at zoom-IN appeared smaller instead of larger: the sprite-track ratio shrank
from 27% (OVERVIEW) to 17% (LEADER) while the track backgrounds grew with the zoom.

Instead of continuing to tune: diagnostic task to Claude Code. Result: math was correct (sprites
objectively 56.8px in all states), but the sprite/track background ratio changed
perceptibly. Three options were presented (Constant, Proportional, Proportional+Floor).

User decided for Option 3: natural "closer = larger" behavior with minimum visibility
as a safety floor. Correction in the same PR:

- `cameraZoomFactor` + `REFERENCE_CAMERA_ZOOM` completely removed
- `computeRenderDisplayScale` as single source of the render pipeline
- `autoSpriteScale.js` massively simplified (19 obsolete tests removed, 10 new ones added)

**Key Insight:** The user-driven correction made the architecture **simpler**,
not more complex. Browser test revealed UX problem → diagnosis understood the math → user
decision produced clean architecture. 4 scaling factors → 1 pipeline.

**Pattern for future visual phases:**

1. Implementation with mathematical correctness
2. Browser test with honest user perception
3. On problems: diagnostic task (don't guess, don't tune)
4. Present options with trade-offs
5. User decision drives architecture
6. Correction in the same PR possible and preferred

---

## Lesson 20 — N-Force Accumulation Needs N-Scaling by Design, Not After Browser Test (D7b B3)

**Context:** The D7b avoidance accumulated lateral forces linearly over all `neighborCount`
neighbors — a racer with N=10 neighbors received 10× the per-pair force. This was known as
"force stacking at 20+ racers" in the D11 backlog and explicitly deferred.

Browser test after D7b B1+B2 immediately showed: all 20 racers clustered at the boundaries in
two groups. Home force (~0.04/frame) was overwhelmed by accumulated avoidance (~0.4/frame from 10
pairs). The diagnosis was correct — but the fix required an additional
commit sprint, even though the problem was predictable from the D11 findings.

**Insight:** Every force system where an entity collects contributions from N neighbors must
consider N-scaling from the start. `sqrt(N)` as normalization is 4 lines of code
— but they must be present at system design, not after the first scale test.

Backlog entry "defer pending browser-test" for known force balance issues is a
high-risk decision: with 2-racer tests the problem is invisible, with N=20 it is immediately
visible. That is the pattern.

**Consequence:** For force/physics systems: explicitly ask "what happens with N=20 entities
all acting on the same target?" before shipping the feature. N-scaling (÷sqrt(N) or
÷N) as the default candidate, not a later optimization.

---

## Lesson 21 — Metadata Values Are Not Measurements — Scale Calculations Need Real Geometry (D7c-fix)

**Context:** D7c used `trackWidth` (operator-declared metadata, default 140 px) as
input to `computeRowLayout`. This gave `racersPerRow = floor(140 / 80) = 1` on all
tracks — correct for 1280px reference worlds, but fatal on large worlds (e.g. 6000px):
there 140 metadata pixels corresponded to only ~30 screen pixels, and all 20 racers were placed in
single rows → a single vertical line at the race start.

The metadata was never a measurement. It was a UI choice from `[100, 140, 200, 280, 360]`
and calibrated for 1280px worlds. On other world sizes it was meaningless.

**Insight:** When a value is used for a scale calculation, it must have the
correct physical unit relative to the current world. Operator-declared metadata (which was meaningful
for a reference world) is not a measurement — it breaks silently
in other scaling ranges. The true track width lies only in the geometry (distance
between inner/outer curve in world coordinates).

**Consequence:** For layout or scale calculations that depend on track geometry:
always use `EditorShape.getActualTrackWidth()` (or equivalent) instead of metadata.
Metadata fields are for UI display and user communication — not as a measurement quantity in calculations.

**Escalation (D7c-fix-v2):** The `trackWidth` field was completely removed from the track data model after it turned out, even after the first fix iteration, that the formula was still based on a wrong unit concept (screen pixels instead of world pixels). When a metadata field cannot be meaningfully used in calculations, the correct course of action is its complete removal — not workarounds via correction factors.

---

## Lesson 22 — floor() Is Sensitive to Floating-Point Errors Near Integers (D7c-fix-v3)

**Context:** After D7c-fix-v2, browser test showed `racersPerRow=11` instead of the expected 12.
Diagnosis via diagnostic snapshot tool: `getActualTrackWidth()` returned `299.9999999999994`
instead of `300` — catmullRom-Hermite interpolation over 500 sample points accumulates ~6×10⁻¹³
rounding errors. With `spriteSize = 50` (rocket override deactivates auto-scale), this gives
`floor(2×299.9999.../50) = floor(11.9999...) = 11` instead of 12.

**Insight:** `Math.floor()` is not tolerant of floating-point underflow.
A value that is conceptually exactly 12.0, but represented as
11.9999...998 through accumulation of tiny errors, gives floor=11 — one row too many, 9 racers incorrectly placed.
This is particularly dangerous when: (1) the input value is calculated through multiple fp operations, and (2) the result is discrete (integer row count).

**Consequence:** Values that are conceptually integers (track widths in world pixels, which
the editor sets in whole numbers) should be normalized by `Math.round()`
before entering `floor()` calculations. `Math.round()` absorbs the error; `Math.floor()` amplifies it.
Fix: `getActualTrackWidth()` rounds the median value via `Math.round()` before it is cached.

---

## Lesson 23 — Think of Open Track Layout in Parallel with Closed Track, Not as a Special Case (D7c-Phase4)

**Context:** D7c implemented row start with negative t for back rows. Closed tracks:
correct — `tPos(t)` wraps negative t behind the start line. Open tracks: `_idx(t)` clamps
to idx=0 → all rows stand at the same point. Instead of finding its own solution for open tracks, the
closed track approach was adopted without comment as "no problem for open tracks".

**Insight:** Open track courses have a different topology than closed track courses:
no wrap-around, beginning and end are real boundaries. A mechanism that works for closed
tracks (negative t) breaks for open tracks in a way that looks visually like
"no problem" (all rows at the start point) but actually completely disables the row logic.

**Consequence:** For every new mechanism that manipulates t values: explicitly check whether
the behavior is separately correct for open and closed tracks. Do not generalize from one track type
to the other — the topologies are fundamentally different.

---

## Lesson 24 — Atomic Write: temp + rename Protects Against Corrupt Files (L.5)

**Context:** The L.5 write endpoints needed to update track JSON files without the risk of a half-finished file (e.g. on crash during writing or disk filling up). Standard `writeFileSync` directly to the target file is not atomic — a reader between write-start and write-end sees inconsistent content.

**Insight:** The OS guarantees that `rename()` on the same filesystem is atomic: readers see either the old or the new file, never an incomplete one. Write temporary file on the same volume (`.tmp` suffix on same partition), then `renameSync` to the final address.

**Consequence:** For all file writes that require consistent state: `writeFileSync(tmpPath, content)` then `renameSync(tmpPath, finalPath)`. Node built-ins — no extra package needed. Test safeguard: verify that `.tmp` file does not exist after a successful save.

---

## Lesson 25 — One-shot Migration: Set Marker Key Only After Complete Success (L.5)

**Context:** L.5 migration of localStorage tracks to the server: read all custom tracks, POST each to the server, delete localStorage entry. Two failure cases: setting marker too early → remaining tracks are never migrated. Never setting marker on errors → migration runs again on every mount and posts already-migrated tracks again.

**Insight:** The marker must be set exactly when all tracks have been successfully transferred. Log individual track errors and continue the migration (no early exit); at the end set the marker when `allSucceeded === true`. Versioned key name (`...-v1`) allows follow-up migrations through a new key.

**Consequence:** One-shot migration pattern: (1) Check marker → abort if set. (2) Process each entry individually, log errors, no early exit. (3) Only set marker when `allSucceeded`. (4) Version the marker key: `racearena:migration:tracks-to-server-v1`.

---

## Lesson 26 — Cache and Index Must Be Kept in Sync (L.6-Bug2)

**Context:** `cacheTrackGeometry` (trackLoader.js) stored server geometries under `racearena:trackGeometries:<id>` — exactly where `getTrack(id)` also reads. But `racearena:trackGeometries:index` was not updated. `listTracks()` reads exclusively from the index. Result: geometry data was in storage but invisible to all index readers. The modal dropdown showed "No tracks drawn yet", even though the geometry was present.

**Insight:** When two functions use the same storage schema but one of them skips the index, a silent consistency break occurs. Tests typically check "data can be written and read" — but not "is the data reachable via all intended read paths". The break only becomes visible when a UI component uses the indirect read path (via index) instead of reading directly by ID.

**Consequence:** For storage schemas with an index pointer structure: every write operation (both local saves and external cache entries) must also maintain the index. Treat index registration and data write as an inseparable pair. When deleting, analogously: first remove data, then remove index entry.

---

## Lesson 27 — Metadata UI and Asset UI Belong in Separate Surfaces (L.6-Bug2-UX)

**Context:** The edit track modal showed a read-only "Effects: none/..."-line that was read from the linked geometry. The effects are configured in the track editor and are part of the geometry — not the track metadata. Browser test showed: user looks for background image management in the modal and doesn't find it. The effects display in the modal gave no hint of where to go for asset management.

**Insight:** A UI surface that displays data from two semantically different sources (metadata + asset properties) creates confusion about where which management takes place. Read-only display of asset properties in the metadata modal gives no orientation — on the contrary: it suggests that assets can be managed here. A clear hint text ("Background image and effects are managed in the Track Editor") is more informative than displaying values without an edit option.

**Consequence:** Every UI surface should have a clearly defined domain: metadata modal for metadata, track editor for assets/geometry. Information from the other domain either leave out or point to the responsible surface through hint text. Displaying read-only properties from another domain without an edit path leads to UX confusion.

---

## Lesson 28 — Canvas Readability: Overlay and Contrast Defaults for Dark Backgrounds (L.6-VIS)

**Context:** The track editor rendered track lines directly onto the background image without an intermediate layer. On images with lighter areas (grass, sky, concrete), the colored lines (#4fc3f7 on white background) disappeared, or the cyan-filled control points were barely distinguishable from bright image regions. Only a browser test on real track material made the problem visible — unit tests and code review gave no signal.

**Insight:** Canvas overlays (globalAlpha + fillRect) are the simplest way to create a reliable contrast floor independent of the image content. A 35%-opacity layer between image and lines costs one line of code and makes all further color decisions image-agnostic. Control points with white fill and dark border (circle marker principle) are visible on any background — cyan on cyan background never is.

**Consequence:** For canvas editors that work on variable image material: always plan an overlay layer between image and interactive elements. Draw control points with complementary contrast: light fill + dark border (or vice versa), never single-colored without border. For lines: high-contrast color (magenta) that doesn't appear in any typical image content, plus a white outline behind it — this guarantees readability on any background without depending on the background type.

---

## Lesson 29 — Partial State Updates: Never Overwrite More Fields Than Necessary (L.6-BgBug)

**Context:** The image upload handler in the track editor contained a `dimChanged && hasPoints` branch that, on dimension difference between new image and current world, called `setCenterPoints([])`, `setInnerPoints([])`, `setOuterPoints([])`. Intention: avoid that drawn points are "incorrectly positioned" after a dimension change. Effect: every image upload on a new track (default size 1280×720, photo typically different resolution) destroyed the drawn track.

**Insight:** Handlers that primarily change a single resource (here: background image) must not reset other state fields as an unintended side effect. The "protection" logic was worse than nothing: it overwrote user work that the user cannot recover once they confirm the dialog. State updates should be surgical — only change what the handler is explicitly meant to change.

**Consequence:** For every handler that changes state: check which other state fields it touches and whether that is intentional. "Cleanup for the case that X" in a state update handler is a warning sign — it either belongs in a separate handler (that is explicitly triggered) or not at all.

---

## Lesson 30 — Container-First: Skeleton Before Logic (Phase L / PR #43)

**Context:** Instead of building the backend server in Phase 5 as a complete system,
in Phase L only the container skeleton was first established (Express + Dockerfile +
docker-compose, a single health check endpoint). No database, no authentication,
no business logic.

**Insight:** Container integration issues (port conflicts, build context, volume mounts,
CORS config) always occur at first setup, regardless of how much logic runs in
the container. Solving these problems early — when the code is still trivial — costs
little. When they only occur at Phase 5 (with database, auth, Socket.IO), they block
the entire feature delivery.

**Consequence:** For every new infra layer (backend, worker, queue), first establish the
container skeleton and deploy a smoke endpoint before adding real logic.
This allows the CI pipeline and local setup to become familiar with the
infrastructure before the complexity base rises.

---

## Lesson 31 — Merge Server Data with Code Defaults via Shared ID Deduplication (L.2–L.4)

**Context:** Phase L introduced server tracks (Weltall), but the same track ID still existed
in localStorage from the time before it "migrated to the server". The combined
track list (frontend) would have to show Weltall from localStorage AND from the server, leading to duplicate
entries.

**Insight:** When data migrates from one source (localStorage) to another (server),
the old copy remains in the source — until an explicit localStorage migration cleans up
the data. The cleanest solution in the meantime: define server track IDs as the authoritative
set and filter out local copies during merge (`serverIds` deduplication in
`getInitialTracks()`).

**Consequence:** For read-path integrations that combine data from multiple sources,
always explicitly check which source takes priority and filter out duplicates by ID.
Merge logic that silently favors the first copy, without explicit source prioritization,
leads to hard-to-debug UI states.

---

## Lesson 32 — `docker compose up` Without `--build` Is Not Idempotent with Respect to Code Changes (VRE-2 Browser Test)

**Context:** VRE-1 (PR #46) added the Surface Classes API routes (`server/src/routes/surfaceClasses.js`,
registered in `app.js`). VRE-2 (PR #47) built the frontend editor on top of that. During the first browser test
after VRE-2, "HTTP 404" appeared when saving a default class. Diagnosis: the Docker container was still
running from a session before VRE-1 — the image did not contain the Surface Classes routes. At the same time,
`volumes:` mounts were missing from `docker-compose.yml`, so running containers never saw updated source code.

`docker compose up -d` — the command used at session start to "start the server" —
starts existing containers without rebuild. The output `Container seasonalraceclaude-server-1 Running`
is not an indicator of code currency, just a liveness check.

**Insight:** `docker compose up` without `--build` never rebuilds the image. When no `volumes:` mount
exists, code changes to `src/` pass the container invisibly. "The container is running"
does not mean "the container has the current code." This pattern leads to phantom 404s that are hard
to debug because code and routes look correct — the error lies in the deployment gap.

**Consequence:** `docker-compose.yml` always gets `volumes:` mounts for source code directories
(`./server/src:/app/src`) and persistent data (`./server/data:/app/data`). With live mount,
`docker compose restart server` is sufficient instead of `docker compose build`. Rebuild is still needed for
`package.json` changes (new dependencies) or Dockerfile changes. Rules:

- Code change (`src/`): `docker compose restart server`
- New npm dependency: `docker compose up --build -d`
- Fresh start: `docker compose down && docker compose up -d`

---

## Lesson 33 — Server Resource Edits Need API Calls in All Mutation Flows, Not Just Delete (VRE-3 Bug)

**Context:** VRE-3 added `surfaceClasses: string[]` to server tracks. TrackManager had `handleDelete()` correctly implemented (checks `serverTrackIds.has(id)`, calls `deleteTrackFromServer()`). `handleSave()` did not do this however — it always only wrote to localStorage via `setTracks()`. User changes (e.g. assigning "air") appeared to work, but were lost on the next render: `useServerTracks()` fires in the background, fetches `surfaceClasses: []` from the server, and the SetupScreen merge unconditionally overwrites the localStorage value with the server state.

**Insight:** When a merge layer exists that prioritizes server data over localStorage, a "write to localStorage only" is not just incomplete — it is effectively a no-op. The error is also hard to discover: the UI immediately looks correct (the localStorage value is briefly rendered), and only after the background fetch or a reload does the change disappear. Tests that check localStorage directly instead of the merge result mask this bug.

**Consequence:** For every new mutation operation (save, update, clone, set-default, etc.) for server resources, explicitly check: does the handler distinguish between server track and local track? Pattern: `if (serverTrackIds.has(id)) { await apiCall(); await refresh(); } else { setLocalState(); }`. `handleDelete()` is the reference implementation. The same pattern applies analogously for surface classes, racer overrides, or other resources with a dual storage path.

---

## Lesson 34 — POST and PUT Need Different Validation Strictness (VRE-3 Bug)

**Context:** `validateTrackBody()` was a single function used equally for POST and PUT. It required `closed` as boolean and complete geometry arrays. TrackManager sends only metadata fields on PUT (name, icon, surfaceClasses, etc.) — no geometry. The PUT therefore failed with 400, even though the track object in the backend had complete geometry. The merge `{ ...existing, ...rest }` would have preserved the geometry — but validation ran on `req.body` before the merge occurred.

**Insight:** POST validation checks completeness (is the object complete enough to be created?). PUT validation checks the correctness of the sent fields (is what was sent valid?). These are two different questions. Applying strict create validation to an update forces the client to send fields it doesn't know or want to change — and hides the merge that happens afterward anyway.

**Consequence:** For CRUD APIs, write separate validation functions for POST and PUT. PUT validation iterates over present keys in the body (`'field' in body`), not over a fixed schema. Fields that are not sent are not validated — the merge with `existing` makes them idempotent. Geometry fields in PUT: only validate if at least one geometry key is present in the body; otherwise take from `existing`.

---

## Lesson 35 — Stateful Generators Need One Instance Per Racer, Not Per Race (VRE-4)

**Context:** The `line` generator (`line.js`) closes over `let lastX = null; let lastY = null;` — it remembers the last known racer position to draw continuous line segments. If a single emitter were shared across all racers (created once per race), the position values from different racers would overwrite each other: racer A writes `lastX=200`, racer B overwrites with `lastX=800`, next segment from A runs from 800 to 205 instead of 200 to 205.

**Insight:** Generator modules whose `create()` function closes over mutable state must be instantiated once per consumer (here: per racer). The `create()` API is explicitly designed this way: each call returns a fresh closure object. If this is ignored and `create()` is called only once, the `particle` or `cloud` implementation still works coincidentally — but `line` breaks immediately with more than one racer.

**Consequence:** When a function exports `create()` as a factory that returns an emitter: always call per consumer, never share the result. Documented in `trailResolver.js` in the JSDoc. Test `line-generator emitters maintain independent position state per instance` verifies this behavior explicitly.

## Lesson 37 — Shared Variable Ownership: Verify Execution Order Before Adding a Writer (Camera refactor)

**Context:** `_setTargets` and `_computePhasedPanTarget` both wrote `targetOffsetX/Y` in `CameraDirector`. The intent was for `_computePhasedPanTarget` to override `_setTargets`'s centerline value during the follow phase. In practice `_setTargets` ran first, the lerp consumed that value, then `_computePhasedPanTarget` wrote its override — which was immediately overwritten by `_setTargets` on the next frame before the lerp could consume it. Two separate fix attempts (physicalY lane offset, then direct world position override) were both silently inert for the same structural reason. The problem was only diagnosed via architectural review.

**Insight:** When two functions write the same variable, the frame-by-frame execution order determines which write the lerp actually consumes. Unit tests pass green for both writes: they test that each function _sets_ the variable, not that the _lerp reads the right frame's value_. This class of bug is invisible to unit tests and only manifests as visual drift in the browser.

**Consequence:** Before adding a second writer to any shared variable (targetOffsetX, targetZoom, any lerp input): (1) draw the per-frame execution order explicitly; (2) identify which write survives into the lerp. If two functions write the same variable, make one the authoritative owner and remove the write from the other. Architecture reviews must verify execution order of all writers to shared lerp inputs — silent overwrites are not caught by unit tests.

---

## Lesson 36 — Performance Smoke Tests Need Different Thresholds for Dev and CI (VRE-4)

**Symptom:** Performance test runs locally in ~5ms and is green. On CI (GitHub Actions) the same test runs in ~74ms and fails — even though there is no regression case.

**Cause:** CI runners (GitHub Actions Ubuntu shared runner) start V8 cold without JIT warmup. Microbenchmarks that are accelerated through JIT optimization on dev run ~10-15× slower on CI. A global threshold that is sensible on dev (e.g. 50ms = 10× above dev baseline) is too tight on CI.

**Anti-Pattern:** Raising the threshold globally (e.g. 50ms → 200ms) resolves the CI problem but loses the dev-side regression protection. At 200ms, a quadratic regression on dev would only be noticed at ~40× degradation — effectively no guard anymore.

**Consequence:** Use an environment-dependent threshold:

```js
const threshold = process.env.CI ? 200 : 50;
expect(elapsed).toBeLessThan(threshold);
```

- Dev: 50ms = sensible guard (10× above ~5ms baseline)
- CI: 200ms = sensible guard (2.7× above ~74ms measured CI baseline)
- `process.env.CI` is automatically set on GitHub Actions

---

## Lesson 37 — Explicit Field Lists in Cache/Build Functions Are a Bug Magnet (PR #52)

**Symptom:** User changes `trackLights.style` in the track editor, saves, opens the track again — style is back at the default. No error, no warning. The change looks functionally correct (server saves correctly, tests green), but is silently lost on the next load.

**Cause:** `cacheTrackGeometry` in `trackLoader.js` built a `geometry` object from an explicit field list:

```js
const geometry = {
  id: full.geometryId,
  name: full.name,
  effects: full.effects ?? [],
  // ... 10 more fields
  // ❌ trackLights missing — never added
};
```

New data model field (`trackLights`) was correctly implemented in the server, editor, and save path — but forgotten in this one cache function. `surfaceClasses` had the same problem, just wasn't noticed because it goes through a different read path.

**Consequence — Spread Pattern with Intentional Exclusions:**

```js
// Instead of whitelist: spread + explicit exclusions for fields that should NOT be cached
const { id: serverId, geometryId, backgroundImageFile, ...rest } = full;
const geometry = {
  ...rest, // all fields pass through automatically
  id: geometryId, // renaming
  backgroundImage: computedUrl, // override
};
```

New data model fields flow through automatically — no code change in the cache function needed.

**Test Pattern as Safety Net:**
Round-trip tests per field guarantee that `cacheTrackGeometry` doesn't drop any server response content:

```js
for (const field of PASSTHROUGH_FIELDS) {
  it(`preserves field "${field}" from server response`, () => {
    expect(cached[field]).toEqual(FULL_TRACK_ALL_FIELDS[field]);
  });
}
```

Catches regressions even in the spread pattern (e.g. if `backgroundImageFile` is accidentally NOT excluded anymore).

**When whitelist is legitimate:** Build functions that produce a defined output shape (e.g. `buildTrackFromEditorState` — only editor-known fields should be saved). Cache/passthrough functions, on the other hand, should be transparent — whitelist is wrong there.

---

## Lesson 38 — UI Fields That Don't Match Server Reality Lead to Data Loss

**Context:** User wanted to re-link a default track geometry via the edit modal by choosing "Geometry = none" and saving — assuming this would decouple the preset from the old geometry. Instead, the backend PUT handler completely ignored the `geometryId` field from the client (`existing.geometryId` was hardcoded). At the same time, the "Draw Geometry" button opened the track editor without preset context — in "new track" mode — and the drawn geometry was saved as a separate track instead of updating the preset. The result: the drawn geometry was irreversibly lost (as an unnamed orphan track in the system), the original preset unchanged.

**Symptom:** User performs a UI action that corresponds to the desired result (re-link geometry), receives no error message, and in doing so loses work that cannot be recovered.

**Cause:** Two independent errors, both with the same root cause:

1. The "Geometry = none" dropdown in the edit modal suggests that the preset can be decoupled from a geometry — but the backend never implemented this path.
2. The "Draw Geometry" button in the edit modal suggests that the geometry is being drawn for this preset — but the navigation path transports no preset context.

**Consequence:** UI must either exactly reflect what the server actually does, or remove/disable fields that suggest actions the server doesn't perform. A UI option that is always a no-op (or worse: triggers a different action than shown) is worse than no option.

**Key Question for UI Design:** "If the user operates this button / dropdown and saves — does the server do exactly what the UI indicates?" If not: remove the option or show a warning, never silently diverge.

**Derived Decisions (TLH):**

- "Geometry = none" option: review conceptually — if "no geometry link" is a supported state, the server must also support it; otherwise remove the option
- "Draw Geometry" button: now sends preset context (`/track-editor?load=<serverId>`) so the editor knows which preset it is working for
- Backend PUT: respects `geometryId` from client when present in body

---

## Lesson 39 — List APIs That Strip Fields Must Be in Sync with Code That Reads Those Fields

**Context:** `toSummary` in `server/src/routes/tracks.js` removes `innerPoints`/`outerPoints` from the list API response for performance. `TrackManager.jsx` checked `srv.innerPoints.length > 0` to display geometry status — a field that was no longer in the response. Result: `hasGeo` was always `false`, the modal always showed "Geometry: not yet drawn" regardless of whether geometry was saved or not.

**Symptom:** Status display always shows the same regardless of what is actually stored — no error message, no visible hint.

**Cause:** List API strips performance fields, frontend reads these stripped fields.

**Consequence:** With `toSummary` patterns, explicitly document which fields remain available. Frontend should use IDs or compact counters, not the stripped data itself. Concretely: `geometryId` for `hasGeo` check, `pointCount: { inner, outer }` for display.

**Key Question:** "Which fields are delivered by the list API? Are all frontend reads on fields that are guaranteed to be in the response?"

**Audit Pattern After toSummary Changes:** For every field that is removed from `toSummary` or replaced by a compact equivalent:

1. `grep -r "srv\.<field>\|track\.<field>\|geom\.<field>"` in `client/src/` for all read locations of the field
2. Check each location: does the object come from the list API (`serverTracks`, `tracks` array) or from a complete source (localStorage cache, GET `:id`)?
3. List API consumers must be updated to the new compact fields
4. Fixing one location is not enough — the same pattern can occur in multiple places (F2: `hasGeo` in TrackManager; follow-up bug: `autoMaxRacers` in `handleEdit`)

---

## Lesson 40 — Silent Error States Are the Most Dangerous UI Behavior

**Context:** During the TLH-2 browser test, the track editor showed no visible feedback after a failed (or seemingly successful) save. The error display (`saveBar` with `serverError`) was in the DOM above the canvas — but React Router does not reset the scroll position on navigation. The user opened the editor scrolled to canvas, didn't see the save result, and thought the save was successful.

**Symptom:** Save sounds successful, user sees no error message, geometry is lost.

**Cause:** Error display was outside the visible area (scroll bug), and `hasGeo` status read wrong fields (Lesson 39).

**Consequence:** Errors must be forced visible. `window.scrollTo(0, 0)` on mount of the track editor ensures that the save bar is visible. `scrollIntoView` when `serverError` is set is a second safeguard. Status displays must use the real source of truth.

**Key Question:** "If the save fails, does the user definitely see it? Or can the error be invisible?"

---

## Lesson 41 — Delete Buttons Must Make Clear WHAT They Are Deleting

**Context:** City Circuit bug (TLH-2 followup). User wanted to remove the wrong background image of a default track. The track editor only had a red "Delete" button — no separate "Remove background" button. User clicked "Delete", confirmed the confirmation dialog without fully understanding the exact effect, and the entire track (including geometry and background) was permanently deleted.

**Symptom:** User clicks delete button with expectation A ("remove background"), what actually happens is B ("entire track deleted"). No feedback about the extended scope of the action.

**Cause:** Generic "Delete" button without scope clarification. Confirmation dialog did not contain the complete information ("Track AND background image will be deleted"). No separate button for the actually desired action.

**Consequence:** (1) Separate buttons for separate delete actions: "Remove background" for just the image, "Delete track" for the whole track. (2) Confirmation dialog must state the complete scope: "Delete track 'X' and its background image permanently? This cannot be undone." (3) Delete actions with large scope need explicit scope naming in the button label or tooltip.

**Key Question:** "If the user clicks this button — do they see what they expected afterward? Or more?"

**Concrete Implementation:** Track editor now has a "Remove background" button that appears next to the background upload button when an image is loaded. The Delete button still deletes the whole track, but the confirmation dialog now explicitly states that the background image will also be permanently deleted.

---

## Lesson 42 — Default Records Need Server-Side Protection

**Context:** City Circuit bug (TLH-2 followup). The 5 default tracks from the TLH-1 migration had `isDefault: true` as a data flag, but no behavioral difference in the API handler. `DELETE /api/tracks/:id` deleted default tracks without checking. Additionally: `migrateDefaultTracks()` ran only once on first boot (marker-protected) — a once-deleted default track could not be automatically restored.

**Symptom:** Critical system records (defaults, templates, seed data) are accidentally deleted via API. After server restart they are still missing.

**Cause:** `isDefault` flag only as metadata field without API enforcement. Migration only as a one-time initialization rather than an idempotent startup routine.

**Consequence:** (1) DELETE handler must reject `isDefault: true` with 403. (2) Migration/seeding routines must restore missing default records on every boot (idempotent, not just on first boot). Marker files for "already migrated" make sense for one-time transformations, but not for data integrity. (3) PUT handler should never take the `isDefault` flag from the request body (already correct via `isDefault: existing.isDefault`).

**Key Question:** "Which records must never be missing? Are they protected by API guards AND startup restoration?"

**Concrete Implementation:** `DELETE /api/tracks/:id` returns 403 for default tracks. `migrateDefaultTracks()` runs on every boot and re-seeds missing default tracks.

---

## Lesson 43 — useEffect with Async Callbacks Need Cleanup

**Symptom:** State switches rapidly multiple times, old async callbacks (`onload`, `onerror`, `fetch.then`, `setTimeout`) overwrite the result of newer effects. Visible e.g. as: UI button shows "Remove background" (state truthy), canvas remains black (bgRef.current is null, because an old callback nulled it again after the successful load).

**Cause:** `useEffect` without cleanup — old callbacks remain active even when a new effect run is already running. When `backgroundImage` switches from `null` to a URL (e.g. when loading a track), callbacks from the null run survive and can null the bgRef again after a successful load.

**Consequence:** `useEffect` with async callbacks ALWAYS with `cancelled` flag or `AbortController` + `return cleanup`.

```js
useEffect(() => {
  if (!backgroundImage) {
    bgRef.current = null;
    setBgReady(true);
    return;
  }
  setBgReady(false);
  bgRef.current = null;
  const img = new Image();
  let cancelled = false;
  img.onload = () => {
    if (!cancelled) {
      bgRef.current = img;
      setBgReady(true);
    }
  };
  img.onerror = () => {
    if (!cancelled) {
      bgRef.current = null;
      setBgReady(true);
    }
  };
  img.src = backgroundImage;
  return () => {
    cancelled = true;
  };
}, [backgroundImage]);
```

Additionally: null guard at the beginning prevents `img.src = "null"` entirely when the state value is `null` or `undefined`.

**Concretely in TrackEditor:** Background image effect without cleanup led to race condition when `backgroundImage` switched from `null` to URL when loading the track (fix/track-delete-safeguards, PR #58 followup).

---

## Lesson 44 — Tendency Drift in Concept Doc Sprints

**Context:** Camera Director concept sprint (PR #60). When translating user direction guidelines into a specification, a consistent drift pattern emerged over several addendum rounds: tendency statements were gradually solidified into rigid algorithms.

**Symptom (chain that emerged in PR #60):**

1. User statement: "Leader should be on screen most often" (tendency)
2. Concept doc: "Leader must be visible in every frame — hard constraint"
3. Result: rigid priority hierarchy 1–4
4. Result: `gap01` trigger that algorithmically only allows leader-vs-second
5. Result: risk documentation describes the resulting bug as "correct per hierarchy"

**Cause:** Each individual translation step appears logically consistent. Only in the overall picture does the result contradict the original statement. CC has no feedback loop to user intention between steps.

**Consequence:** (1) In concept docs, explicitly distinguish between TENDENCY and CONSTRAINT — both types are valid but must be named. (2) Reviews need attention for solidification drift: "Was that meant as a constraint or a tendency?". (3) Architecture note anchored early in the doc: "This system is formulated as tendency logic, not as a constraint system."

**Key Question:** "Is that a tendency statement or a hard constraint? Would the user have formulated it that way too?"

**Reference:** `docs/CAMERA_DIRECTOR.md §3` architecture note blockquote, K1+K2+K5+K6 in addendum 5.

---

## Lesson 45 — Doc-wide Consistency in Variable Refactors

**Context:** Camera Director concept sprint (PR #60). Variable rename `overviewCooldown → overviewCooldownMin + overviewCooldownMax` as well as value change "fixed 20s → random jitter [15s/25s]" were not applied doc-wide. Only during the collective review were 5 locations with the old value and 2 locations with the old variable name found.

**Symptom:** Tunable definition in §8.1 correct (`overviewCooldownMin`, `overviewCooldownMax`), but §3.1, §4.2, §4.3, §8.2, and §12.2 still with old value/name. Same pattern with `hudShowCount → hudMaxStandings`.

**Cause:** Variable refactor only done at the definition location, not everywhere the value or name appears. Docs are different from code — no compiler checks consistency.

**Consequence:** For every variable rename or value change in a concept doc: grep for old name/value and replace all hits in a single batch. "Definition updated" is not the same as "consistent doc-wide".

**Key Question:** "Are there other places in the doc where the old value or name appears?"

**Reference:** K3 (5 locations "20s"), K9 (2 locations "overviewCooldown" singular), K7 (2 locations "hudShowCount") from PR #60 addendum 5.

---

## Lesson 46 — Empirical Measurement Beats Structural Assumption

**Context:** Camera Director concept sprint (PR #60). Q-25 diagnosis: Space Sprint felt too short. A structural hypothesis ("Canvas coordinates are limited to 1280×720, hence Space Sprint is short") was documented in the HANDOFF. Actual cause: `maxScale=4.0` too low.

**Symptom:** HANDOFF describes hypothesis A as "probable cause". If you believe hypothesis A, a refactor of the canvas coordinate logic follows. In fact, hypothesis A is wrong — empirical measurement refutes it immediately.

**Cause:** Structural hypotheses sound plausible and are used as the basis for solution concepts without a measurement step. Empirical verification is skipped as "obvious".

**Consequence:** For structural assumptions ("it's probably because of X"), always build a measurement task into the diagnostic sprint before developing solution concepts. The measurement task costs little; the wrong refactor costs a lot.

**Key Question:** "Is that a measurement or an assumption? Can I empirically check the assumption in 5 minutes?"

**Reference:** PR #60 Phase 1 — empirical refutation of the canvas coordinate hypothesis, `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` identified as root cause.

---

## Lesson 47 — Concept Doc Reviews Need Two Perspectives

**Context:** Camera Director concept sprint (PR #60). The final review before merge found 10 correction points (K1–K10) that had gone undetected in 5 previous commits.

**Observation:** User review and strategy Claude review found different problems:

- **User** found K1+K2+K3: wording sensitivity ("I didn't say that"), hierarchy logic, obvious numerical contradictions
- **Strategy Claude** found K4–K10: technical variable inconsistencies, algorithmic contradictions in trigger logic, follow-on effects of architecture changes in dependent sections

**Cause:** User knows their own intentions best (wording check), but doesn't have time for complete technical consistency verification. Strategy Claude checks technical consistency, but only knows user intentions from the doc text.

**Consequence:** Two-stage review pattern for concept docs: (1) User review first — wording, intention check, obvious contradictions to their own statements. (2) Strategy Claude review — complete consistency scan, variable grep, check follow-on effects. (3) Collective addendum in one commit, not individually.

**Key Question:** "Is there someone checking that it is technically consistent — and someone checking that it correctly reflects the original statement?"

---

## Lesson 48 — Symptom Fix vs. Architecture Fix (PR-A1 / PR-A2)

**Context:** Q-25 (Space Sprint too fast) was resolved in PR-A1 as a symptom fix:
`maxScale` increased from 4.0 to 10.0. The result was better, but the fundamental
defect remained: `openTrackFinishT` did not divide by `speedScaleFactor`, meaning the
duration slider had zero effect on long tracks.

**PR-A2 diagnosis** identified the architectural gap. **PR-A2** resolved it through
a different approach: instead of "divide baseSpeed by length", now "calculate baseSpeed so that
the median racer finishes in targetDuration". 3-line formula,
no configuration parameter.

**Insight:** Symptom fixes (increasing maxScale) can be useful as a stepping stone —
PR-A1 was necessary to make the problem visible. But a diagnostic sprint
before implementation (PR-A2 diagnosis) prevents maneuvering into a dead end with the next
symptom fix.

**Consequence:** For complex bugs that require UI parameter tuning: check whether
the architecture itself is causing the problem. A 3-line formula can make a
10-parameter configuration superfluous.

**Reference:** PR #60 addendum 5 — 10 K-corrections from combined user+strategy Claude review.

---

## Lesson 49 — Last-Finisher vs. Median-Racer Semantics in Duration-driven Speed

**Context:** PR-A2 implemented `computeRaceBaseSpeed(finishT, targetDuration)` so that the
median racer (spreadFactor=1.0) finishes in `targetDuration`. Browser test (2026-05-04) showed:
Dirt Oval Horse 46s → 48s (+4%, acceptable), Space Sprint Rocket 30s → 26s (-13%). Two bugs:
E1: `speedMultiplier` not normalized (Rocket sm=1.25 runs 25% faster → finishes at 24s).
E2: "Race Duration 30s" was de facto a median promise, not a last-finisher promise.

**Update PR-A2.6:** Empirical measurement in the diagnostic phase showed: only 39-63% of races actually landed
within ±5% of the target at race end. The ±5% guarantee applied implicitly to the
median racer. Race-end deviation is 1σ ≈ 4-6% depending on N — intrinsic to the
spread mechanic (minimum of N stochastic draws). The guarantee is on the _expected_ last
finisher, not on every individual run. Documented in ARCHITECTURE.md § Speed Pipeline.
Important: always explicitly assign guarantees — median racer vs. race end are different.

**Insight:** A duration-driven speed architecture needs two explicit decisions:

1. **What does the duration promise?** Median racer semantics: middle of the field finishes at T. Last-finisher semantics: last racer finishes at T. Both are valid — but a decision must be made and it must be encoded in the code.

2. **What speedMultiplier does the calibration have?** If `computeRaceBaseSpeed` is calibrated for sm=1.0, the call must multiply T by sm so that the racer's own sm cancels out.

**Correct Formula (Last-Finisher + sm-normalized):**

```
T = targetDuration × spreadMinFactor × speedMultiplier
race_baseSpeed = finishT / (REFERENCE_FPS × T)
```

The slowest racer draws BASE_SPEED_MIN → spreadFactor = BASE_SPEED_MIN/MEAN = spreadMinFactor.
Their finish: `finishT / (race_baseSpeed × sm × spreadMinFactor × FPS)` = targetDuration ✓.
The median racer finishes at `targetDuration × spreadMinFactor ≈ 87%` of targetDuration.

**Spec Error Lesson:** The spec showed `T = targetDuration × spreadMinFactor / speedMultiplier`.
That is wrong. The spec's own validation numbers (Rocket 30s → last finisher at 30s)
are only achievable with multiplication. Always check the validation numbers against the formula,
not just the formula line in the spec text.

**Consequence:** When implementing a duration-driven speed architecture:

1. Explicitly define the duration semantics and comment in the code (last-finisher vs. median).
2. `speedMultiplier` normalization at the call site, not in the pure function — the pure function stays generic.
3. Write pipeline contract tests that verify end-to-end that the slowest and median racer arrive at the right time.

**Reference:** PR-A2-fix-commit (2026-05-04), `raceBaseSpeed.test.js` describe block "pipeline contract — last-finisher semantics".

---

## Lesson 50 — T-Parameter Sampling vs. Arc-Length Sampling in Stochastic Visualizations

**Context:** PR-A2.5 — Racers moved visually at varying pixel speed (accelerating + braking) even though their `t` progress rate was constant. Root cause: `catmullRomSpline` sampled uniformly in T-parameter space; but consecutive samples had different pixel distances (2.69×–7.72× max/min ratio depending on track geometry).

**Insight:** T-parameter uniformity ≠ pixel uniformity. Spline segments in T-space can have different arc lengths — e.g. when the editor user places many points in curves (short segments) and few in straights (long segments). Every simulation that increments `t` uniformly and then maps T→pixel has this problem.

**Solution:** Arc-length reparameterization as a one-shot step during sampling:

1. Dense sampling in T-space (5× target samples, min 1000)
2. Calculate cumulative arc lengths → lookup table
3. For each output sample: target arc length = `i/N × totalLength`, binary search in LUT → T value → spline point

O(N log N) once on track load (not per frame). Closed tracks: one extra entry for the wrap segment closes the loop correctly.

**Generalization:** Every visualization that shows a simulation over a parametric curve must distinguish between T-parameter uniformity and pixel uniformity. For perceptible movement (racers), pixel uniformity (arc-length) is always the right choice. For connectivity checks or point validation, T-uniform suffices.

**Diagnostic Discipline (L46):** Before the fix, a diagnostic measurement was made with 6 synthetic track shapes. Hypothesis (max/min > 1.3×) was confirmed with values 1.36×–7.72×. Only then was implementation done.

**Sub-Caveat — Callers of `derivativeAt` Directly:** Code that calls `derivativeAt(controlPoints, t)` directly (instead of consuming the sample array) bypasses the arc-length reparameterization. `derivativeAt` expects `t` as T-parameter in control point space; after the switch to arc-length-uniform sampling, racer `t` is an arc-length fraction. This gives wrong tangents at wrong spline points — visible on asymmetric tracks as "rotation lags behind the curve". Additionally: `derivativeAt` clamps `t` to `[0,1]`, which forced all racers from round 2 onward on closed-track multi-lap races onto the constant end tangent. Fix: calculate tangents from the arc-length-sampled array via finite difference (O(1) per frame, no bug from T-space mapping). **When refactoring spline sampling, check all callers — not just sample output consumers, but also code that works on raw control points and racer-t.**

**Reference:** PR-A2.5 `catmullRom.js`, `catmullRom.diagnostic.test.js`, `EditorShape.js`.

---

## Lesson 51 — Silent Failures in Async Resource Loaders Need Observability

**Context:** PR-A2.8 — User reported that backgrounds are missing in the race, without knowing why. Root cause: `bgImageCache.js` set `record.failed = true` in the `img.onerror` handler, but gave no feedback. No `console.warn`, no UI hint, no retry. The user had uploaded background images multiple times and didn't know that the problem was the offline Docker server — not the images.

**Insight:** Async resource loaders (Image, fetch, FileReader) that load UX-visible content must output at least a console warning on failure. Silent fail is only acceptable when the caller already shows a visible error state. `img.onerror = () => { record.failed = true; }` without any output makes the cause invisible during debugging — even for the developer themselves.

**Pattern:** On the first error per cache entry (flag `record.warned`) warn once; then silent. Prevents frame spam for rAF loop callers, but still gives a clear hint in the first error case. Warning message should contain: what failed (URL), why probably (possible cause), how to fix (concrete step).

**Generalization:** Every `onerror` / `catch` handler in a module that caches resources and returns `null` should be equipped with `console.warn`, if the caller doesn't warn itself. The rule of thumb: if the absence of the resource is visible to the user (missing background, missing image), the cause must be visible to the developer (console).

**Reference:** PR-A2.8 `bgImageCache.js`.

---

## Lesson 52 — Periodic State Re-Rolls with Smooth Transition Generate Race Dynamics Without Breaking Deterministic Guarantees

**Context:** PR-A2.6 — Diagnosis showed 4.3 lead changes per 30s race, 3% of races completely without position changes. Racers maintained their initial spread order almost throughout.

**Insight:** Once-drawn random values (spreadFactor at race start) freeze the field.
The solution: periodic re-draws with (a) centering on the current value (Variant B — no
reset to the global mean) and (b) an easeInOutCubic transition animation. This produces
natural, gradual pace variations without jerky jumps.

**Critical separation: speedBonusMult vs. spreadFactor.** Only `spreadFactor` (luck draw) may
be re-rolled. `speedBonusMult = 1 + speedBonus` (position-based back-row compensation) is
spatially determined and must remain constant. Before this PR, speedBonus was incorporated into baseSpeed
— a re-roll would have deleted the back-row compensation and disadvantaged rear starting positions.
Refactor: Both scalars explicitly as separate fields (`spreadFactor`,
`speedBonusMult`) — only the first is re-rolled.

**Timing rule:** Last roll at ~80% of race duration. After that no more changes — the
home stretch should be decided by the current order, not by a random late roll. Formula: `rollCount = max(2, floor(duration/15))`, `rollInterval = 0.80 × duration / rollCount`.
For all standard durations (30–120s) this gives a consistent ~12s between rolls.

**Reference:** PR-A2.6 `RaceScreen/index.jsx`, `reRoll.test.js`, ARCHITECTURE.md § Re-Roll Mechanism.

---

## Lesson 53 — Coordinate System Documentation Is Mandatory: Pan Offset and scaledRacersForCam (Phase 4 Diagnostic Session 2026-05-06)

**Context:** CameraDirector receives **canvas-space** coordinates from RaceScreen via `scaledRacersForCam`: `r.x = worldX × bsX`, `r.y = worldY × bsY`. The render pipeline draws racers at world coordinates under `ctx.scale(cam.zoom × bsX, cam.zoom × bsY)`. Thus: `screenX = offsetX + worldX × zoom × bsX = offsetX + r.x × zoom`.

**The trivial pan formula is correct:**

```
targetOffsetX = hw - r.x × zoom
targetOffsetY = hh - r.y × zoom
```

Proof: `screenX = (hw - r.x×zoom) + worldX×zoom×bsX = hw - worldX×bsX×zoom + worldX×bsX×zoom = hw ✓`. Valid for all bsX/bsY combinations.

**Finding C (Phase 4) was an error:** Commit C introduced `_computePanScale(zoom) = zoom × bsX` with the argument that the render pipeline needs bsX in the pan. That was wrong: bsX is **already in `r.x`**. `r.x × zoom × bsX = worldX × bsX² × zoom` — a double bsX factor. For Dirt Oval (bsX=0.833, bsY=1.0) this gave:

- X error: `screenX = hw + worldX × zoom × bsX × (1-bsX) ≈ +36px`
- Y error (bsX instead of bsY): `screenY = hh + worldY × zoom × (1-bsX) ≈ +138px`

**Why the error was not immediately noticed:** The diagnostic log used `expectedScreenCenterX = offsetX + r.x × zoom × bsX`. That is a tautology — since `offsetX = hw - r.x × zoom × bsX`, the sum always gives `hw`. The X error was invisible in the log.

**Diagnosability:** Empirical `[PAN]` logs showed `expectedScreenCenterY: 498.7 ≠ 360` (Y error visible because bsY=1.0 on this track). The correct screen formula `screenY = offsetY + worldY × zoom × bsY = offsetY + r.y × zoom` was coincidentally identical to the log formula. The X error (36px) was smaller and masked by the tautology.

**Lesson:** Coordinate system (`r.x`: canvas-space or world-space?) must be explicitly documented at the system boundary `scaledRacersForCam`. Diagnostic log formulas must be **independent** of the pan formulas — otherwise they are tautologies.

**Reference:** Phase 4 diagnostic session 2026-05-06, `CameraDirector.js` `_setTargets()`, `index.jsx` L924–927 (`scaledRacersForCam`), L1022–1024 (render transform). CAMERA_DIRECTOR.md §L62 (zoom invariance remains unchanged correct).

---

## Lesson 54 — Gut Feeling as First Quality Signal (Phase 4 Diagnosis)

**Context:** Phase 4 Commit C introduced `_computePanScale(zoom) = zoom × bsX`. The formula "sounded
plausible" — bsX appears in the render pipeline, so it seemed logical to include it in the pan formula.
The feeling "something is not right here" (too many factors, bsX appears twice) was
not taken seriously. No algebraic proof was written down. Diagnostic session 2026-05-06
uncovered the error through empirical measurement.

**Insight:** The gut feeling "this formula is doing too much" is often the earliest and cheapest
signal. When code "feels odd" — formula that is suspiciously complex, factor that appears twice,
naming convention that is suspiciously similar to another value — that is a signal
for a proof task, not for "it'll probably be fine".

**Consequence:** Every camera formula that combines bsX, zoom, or coordinate transformations:
write an algebraic proof directly before committing. 2–3 lines of mathematics
(`screenX = offsetX + worldX × zoom × bsX = hw`) save hours of diagnosis.

---

## Lesson 55 — Coordinate System Boundaries Must Be Documented at the API Boundary (Phase 4 Diagnosis)

**Context:** `scaledRacersForCam` in `RaceScreen/index.jsx` delivers canvas-space coordinates to
CameraDirector: `r.x = worldX × bsX`. Neither the variable nor the CameraDirector call had
a comment making that explicit. Result: Commit C introduced `r.x × zoom × bsX` (bsX
double) without objection — because "bsX appears in the pipeline" was true, but "bsX is already
in r.x" was not documented.

**Insight:** Coordinate system conventions ("value is canvas-space" vs. "value is world-space")
must be explicitly stated at the system boundary. In a canvas system where both spaces simultaneously exist
and are converted into each other, the implicit assumption about the space of a value is the most common
error mechanism.

**Consequence:** For every function parameter that contains coordinates: comment which space is expected.
`// r.x: canvas-space (= worldX × bsX)` in the mapping where scaledRacersForCam is built. In the
CameraDirector update comment analogously. Without this comment the next developer (or
Claude) is blind to the built-in bsX factor.

**Reference:** `index.jsx` L924–927 (`scaledRacersForCam`), Lesson 53.

---

## Lesson 56 — Config Schema Versioning: Test Fixtures Must Stay in Sync (Phase 4)

**Context:** CameraDirector config was extended from v2 to v3: `battleGapThreshold` (was
`battleGapPct`), `battleMaxDurationMs` (was `battleMaxDuration`, without Ms suffix), new fields
`battleGapHysteresis`, `overviewCooldownMin/Max`. Tests that used `inverseConfig` with the old schema
ran green with fallback defaults — but without the new fields, the actual
behavior (hysteresis, max duration cap) was not tested.

**Insight:** When a config object is extended, test fixtures must be explicitly updated with the new
fields. "Runs with defaults" masks missing verification — the new features
exist in code but are never exercised through tests.

**Consequence:** Config schema extensions → immediately update all test fixtures (including `inverseConfig`,
test helpers, `beforeEach` objects) with the new fields. Ideally: a central
`TEST_CONFIG` object generated from the complete schema definition — then new fields
are automatically present in all tests.

---

## Lesson 57 — Unit Suffix Is Mandatory for Timing Parameters (Phase 4)

**Context:** `battleMaxDuration` was in milliseconds — but the name gave no unit.
Commit 9a0d803 renamed it to `battleMaxDurationMs`. The rename was not a refactor —
it was a necessary clarification, because a value `4000` without unit is ambiguous (4 seconds
or 4000 seconds?).

**Insight:** Parameters that are in milliseconds MUST have `Ms` in the name. Parameters in
seconds MUST carry `Seconds` or `s` (for very short names). `duration` or `cooldown`
alone are ambiguous — they invite the wrong unit. The problem occurs particularly
when milliseconds are mixed with second comparisons (`timestamp > cooldown` where
timestamp is ms and cooldown should be s).

**Consequence:** For every new timing parameter, name it directly with unit suffix:
`battleGapThresholdMs`, `overviewDurationMs`, `lerpFactor` (dimensionless — explicitly comment it so).
Existing parameters without suffix: rename at next touch + increment schema version.

---

## Lesson 58 — React StrictMode Double-Mount: useRef Initializations Need Cleanup (Phase 4)

**Context:** React StrictMode calls `useEffect` twice in development (mount → cleanup → mount).
When `camDirRef.current = new CameraDirector(...)` is in a useEffect without cleanup, two
instances run in parallel on the second mount until the ref is overwritten. In normal tests (no
StrictMode double-invoke) this is invisible — the bug only appears in the dev browser.

**Insight:** Every `useRef` assignment in a `useEffect` that creates an external instance (state machine,
timer, WebSocket) needs a cleanup return. Even if the object has no formal
`dispose()` call, `return () => { ref.current = null; }` is enough to prevent StrictMode double instances.

**Consequence:** `useEffect` with `useRef` assignment → always check if cleanup is needed.
Pattern: `useEffect(() => { ref.current = new Thing(config); return () => { ref.current = null; }; }, [])`.
B-1 (PlayerGroups StrictMode fix in B-Wave) had the same root cause — the pattern is systemic.

**Reference:** B-Wave PR #25, B-1. Lesson 1 (UI drift pattern with state sources).

---

## Lesson 59 — beforeEach for Stateful Test Objects: Never Share State Between Tests (Phase 4)

**Context:** CameraDirector tests that share an instance across multiple `it` blocks accumulate
state: `_lastOverviewExitTs`, `_lastBattleExitTs`, `finishMomentExpiry`, hysteresis state. A test
that activates BATTLE_ZOOM leaves the hysteresis band active for the next test. Result: tests that
are green in isolation can fail in suite order.

**Insight:** CameraDirector is a state machine — every state changed in one test affects all subsequent tests with a shared instance. This is the most common mechanism
for "flaky tests" that are sometimes green and sometimes red depending on execution order.

**Consequence:** For all stateful classes (state machines, timer managers, caches):
`let obj; beforeEach(() => { obj = new Thing(...); });` instead of shared let at module level.
No exception. Tests are fast — a new CameraDirector instance per test costs <0.5ms.

---

## Lesson 60 — Hard Refresh Before Visual Verification: Cache Is Not Trivial (Phase 4)

**Context:** After code changes in Vite, the browser cache can cache old JavaScript bundles.
Without a hard refresh (Ctrl+Shift+R / Cmd+Shift+R), the browser may continue running the old version —
which simulates an unresolved regression or hides a resolved one.

**Insight:** Browser cache has a longer lifespan than intuitively expected, particularly when
Vite's Hot-Module-Replacement fails or the dev server was restarted. The first
"visual check" after a code change can silently run on old code.

**Consequence:** Checklist before every visual smoke test:

1. Hard Refresh (Ctrl+Shift+R)
2. Vite dev server runs without errors (check terminal)
3. DevTools Network tab → enable "Disable Cache" when systematic verification is needed

After build errors or server restart always hard refresh, not a normal reload.

---

## Lesson 61 — Remote Push Before PR Creation: Push Is Part of the Merge Workflow (Meta)

**Context:** `gh pr create` requires the branch to be pushed to `origin`. The call
fails when the branch only exists locally. Trivial — but is skipped as "self-evident"
and then blocks the merge sprint.

**Insight:** Commit → Push → PR are a unit. The push step is not optional and
not automatic. It must be explicitly executed, especially when time passes between commit and PR creation
or other commits are added.

**Consequence:** Every merge sprint begins with: `git status && git push origin <branch>`.
First action, before `gh pr create`, before doc updates, before commit verification.
Pattern: Commit → Push → Verify-Push (`git log origin/<branch>`) → `gh pr create`.

---

## Lesson 62 — Render Pipeline Asymmetries: Closed vs. Open Track Explain the Pan Formula (Phase 4 Core Lesson)

**Context:** Phase 4 diagnosis revealed that the camera pan formulas are fundamentally different for
closed and open tracks — and that this asymmetry was the root cause of the double-bsX error.

**Closed Track Render Pipeline** (`RaceScreen/index.jsx` L1022–1024):

```js
ctx.translate(cam.offsetX, cam.offsetY);
ctx.scale(cam.zoom * bsX, cam.zoom * bsY);
// Racer drawn at world-coordinates (r.x_world, r.y_world)
```

→ `screenX = cam.offsetX + worldX × cam.zoom × bsX`

**Open Track Render Pipeline** (`RaceScreen/index.jsx` L1005–1006):

```js
ctx.translate(-st.camX * effZoom, -st.camY * effZoom);
ctx.scale(effZoom, effZoom);
// Racer drawn at world-coordinates (r.x_world, r.y_world)
```

→ `screenX = -camX × effZoom + worldX × effZoom`

**Key Asymmetry:** Closed track has `cam.offsetX/Y` as camera position; open track has `st.camX/Y`.
For closed tracks, `cam.offsetX = hw - worldX×zoom×bsX` must hold so that `screenX = hw` (racer centered).
Since CameraDirector receives canvas-space (`r.x = worldX × bsX`), the formula is `hw - r.x × zoom`.

**Why This Is L62:** §6.2 of CAMERA_DIRECTOR.md documents "Cross-Track Invariance (L62 resolved)" —
the inverse camera formula `cam.zoom = targetPx / (referenceSpriteSize × bsX)` is correct for closed
tracks because bsX is in the render scale. For open tracks `cam.offsetX/Y` is irrelevant; the
pan runs via `openTrackCamera.js / openTrackPanTarget()`.

**Consequence:** For every new camera logic: first ask "which render path is active — closed or
open?" and trace the corresponding pipeline path from L1005–1006 or L1022–1024 before writing formulas.
The pipelines are not interchangeable.

**Reference:** `index.jsx` L1005–1006 (open), L1022–1024 (closed), L924–927 (`scaledRacersForCam`).
CAMERA_DIRECTOR.md §6.2, §10.2. Lesson 53.

---

## Lesson 63 — Activation Chain: Implemented State That Is Never Reachable (Phase 4)

**Context:** Phase 4 implemented BATTLE_ZOOM hysteresis and max duration cap correctly.
But: the BATTLE_ZOOM trigger (`minGapInSpitzengruppe < battleGapThreshold=0.05`) assumes
that two racers of the lead group are ≤ 5% t-value apart. In races where the field
spreads out early or with few racers, this threshold may never be undershot.
"Feature implemented" ≠ "Feature actively running".

**Insight:** When a state machine is correctly implemented but its trigger thresholds are
calibrated too strictly, the state is functionally inactive. This is invisible through unit tests (tests
set the state directly, without firing the real trigger) and undetectable through code review.

**Consequence:** For every new camera state after implementation: a measurement commit that logs state transitions
in real 60s races. Format: `[CAMERA] transition: LEADER_ZOOM→BATTLE_ZOOM at t=12.4s`.
If BATTLE_ZOOM never appears in 10 races: adjust threshold. Lesson 67 describes the measurement sprint.

---

## Lesson 64 — Long Sessions and Context Compression: Plan Stop Points (Meta)

**Context:** This diagnostic session exceeded the context limit and was compressed. The
compression occurred in the middle of the doc update phase — after the code commits but before the
doc writing steps. Resuming after compression is slower (rebuilding context)
and carries the risk that open questions or intermediate decisions are lost.

**Insight:** Context compression is not an error — it is structurally unavoidable in very
long sessions. But the timing is controllable: compression in the middle of a complex
step costs more than compression between natural pauses.

**Consequence:** In long sessions, set natural stop points as mental checkpoints:

- After every commit: brief summary of what is open (in commit message or HANDOFF note)
- After diagnostic phase: commit result before fix phase begins
- Before doc update phase: ensure all code commits are done
- "I'll make a commit now" is often the right impulse even if the code is not perfect yet

**Key Question:** "If the session ends now — do I know what the next step is?"

---

## Lesson 65 — Phantom Problems Through Browser State: Verify Before Bisect (Phase 4 Diagnosis)

**Context:** In the Phase 4 diagnostic session, a sprite reduction was observed after a code change
and classified as a potential regression. A bisect sprint was started. Root cause:
browser zoom was not 100% (forgot Ctrl+0) — which scales canvas rendering and makes sprites
appear smaller. No code bug. Several bisect commits were executed on an artifact.

**Insight:** Visually presented phenomena (sprite size, canvas resolution, pan offset) can be
fully simulated by browser state. A bisect on a browser state artifact finds
no "bad commit" — because there is none. This is frustrating and wastes time.

**Consequence:** Before every visual bisect — 5-point checklist:

1. Browser zoom 100% (Ctrl+0 / Cmd+0 — confirm in address bar: "100%")
2. Hard Refresh (Ctrl+Shift+R)
3. DevTools closed
4. Canvas at normal window size (no very small or very large window)
5. Precisely document the phenomenon (screenshot or pixel measurement value) before bisect starts

If the phenomenon has disappeared after steps 1–4: abort bisect, browser state was the cause.

---

## Lesson 66 — Pixel Invariance: Write the Algebraic Proof Before Implementation (Phase 4)

**Context:** The trivial pan formula `targetOffsetX = hw - r.x × zoom` is not obviously
correct until you write out the algebra:

```
screenX = cam.offsetX + worldX × cam.zoom × bsX
        = (hw - worldX×bsX×zoom) + worldX×bsX×zoom
        = hw  ✓
```

Writing this 3-line proof takes 30 seconds and makes the formula beyond discussion.
`_computePanScale(zoom) = zoom × bsX` could have been immediately recognized as wrong with the same proof:
`(hw - r.x×zoom×bsX) + worldX×zoom×bsX×bsX ≠ hw` — bsX² instead of bsX.

**Insight:** Correctness of camera formulas that transform coordinates is not intuitive.
"Sounds plausible" is not a proof. "Tests are green" is not a proof of correctness for
coordinate formulas — tests can be incorrectly calibrated (tautology, wrong expected values).

**Consequence:** For every new camera formula that combines bsX, zoom, or coordinate spaces:
write an algebraic proof before committing. Format: 3 lines (`screenX = ... = hw ✓`).
Proof goes as a comment in the code (directly above the formula) and as a reference in the associated
lesson. If the proof doesn't work out: reconsider the formula instead of committing.

**Reference:** `CameraDirector.js` `_setTargets()`, Lesson 53. CAMERA_DIRECTOR.md §10.2.

---

## Lesson 67 — Value Roulette: Without Baseline Measurement, Tuning Is Blind (Phase 4)

**Context:** Phase 4 adopted default values from the concept doc: `battleGapThreshold=0.05`,
`battleGapHysteresis=0.02`, `battleMaxDurationMs=4000ms` (2026-05-06), `overviewCooldownMin=15s/Max=25s`
— the values as adopted that day; none of them is today's.
These values "sound sensible" but were not calibrated against real race data.
Without measurement it is unknown whether BATTLE_ZOOM is even activated in typical races
or whether OVERVIEW fires every 15–25s or every 5 minutes.

**Insight:** Default values for state machine triggers are hypotheses. "Sounds good" is not a
calibration criterion. Incorrectly calibrated defaults mean: implemented feature that
is never active in practice (too strict trigger) or feature that is permanently active and
crowds out other states (too wide a band).

**Consequence:** For every new state machine transition, plan a measurement sprint:

1. Build in temporary logs: `console.log('[CAM]', newState, Date.now(), trigger_value)`
2. Run a real race (30s Dirt Oval, 60s Space Sprint, 30s City Circuit)
3. Evaluate log: How often does each state occur? How long? At what trigger value?
4. Then adjust defaults

Only then are defaults calibrated — not from gut feeling from the concept doc.

---

## Lesson 68 — Browser State Before Bisect: The 5-Point Environment Verification (Phase 4 Diagnosis)

**Context:** The wasted bisect sprint from L65 came from missing environment verification.
The problem is not just browser zoom — it is the principle that bisect runs on a moving
target when the environment is not controlled.

**Insight:** Bisect assumes reproducibility: the same phenomenon at the same commit,
the same environment, the same measurement. Browser state (zoom, cache, DevTools, hardware acceleration,
tab isolation) is part of the "environment" that must be reproduced. Uncontrolled environment →
bisect finds no "bad commit" → frustrating false negatives.

**Consequence:** Before every bisect:

1. Precisely document the phenomenon (screenshot + measurement value, e.g. "sprite is 24px, expected 56px")
2. Stabilize environment (L65 checklist)
3. Reproduce phenomenon at HEAD → only then `git bisect start`
4. After each bisect step: repeat measurement (not "looks bad" — "sprite is X px")
5. If phenomenon "disappears" without commit explanation: repeat step 2

"No good commit found" + phenomenon gone = browser state was the cause.

---

## Lesson 69 — Models Without Measurement Are Hypotheses: Empirical First (Phase 4 Diagnosis)

**Context:** `_computePanScale(zoom) = zoom × bsX` was introduced with the argument:
"The render pipeline has bsX in the scale — so the pan formula needs bsX".
That was a conceptual argument ("it should be this way") without algebraic verification.
The empirical `[PAN]` logs refuted the model in under 5 minutes: `expectedScreenCenterY: 498.7 ≠ 360`.

**Insight:** A mental model about a coordinate system is a hypothesis until empirically
confirmed. Conceptual arguments ("bsX appears in the pipeline, so...") can sound elegant
and still be wrong. This is particularly dangerous in systems where multiple coordinate
spaces (world-space, canvas-space, screen-space) simultaneously exist and are transformed into each other.

**Consequence:** For every new camera concept that transforms coordinates:

1. Write algebraic proof (L66)
2. If proof is not clear: empirical measurement with log output (5 minutes effort)
3. Only when proof AND measurement agree: commit

"Sounds logical" is not a commit criterion for camera mathematics.
Measurements are cheaper than diagnostic sprints. Diagnostic sprints are cheaper than browser bisects.

**Reference:** Phase 4 diagnostic session 2026-05-06, `[PAN]` log analysis, Lesson 53, Lesson 66.

---

## Lesson 70 — EditorShape Double-Image Marathon: Diagnostic Discipline as Prevention Principle (Phase 1)

**Context:** The EditorShape staircase bug (double image / jagged jumps in racer positions)
occupied development over Stage 20–23. Root cause: `Math.round()` in
`EditorShape.getPosition()` mapped arc-length-t to the nearest sample index instead of
interpolating linearly. Quantitatively measured (Stage 23 trace): 26.5–27.1 px jumps at 500 samples
on a ~2000px oval at zoom 4×. Fix: 3 lines of linear interpolation + angle wrap.

**Process:** Before the root cause was identified, Python frame analysis scripts,
Playwright frame capture specs, 20 PNGs, and several bisect sprints on browser state artifacts
were executed (L65, L68). The diagnostic process stretched over several Etappen because the visual
observation ("double image", "twitching") without quantitative measurement led early into false bisects and
hypothesis roulette.

**Insight:** An algebraic proof of the `getPosition()` formula (L66: 3-line proof for
pixel invariance) would have identified the root cause in under 30 minutes. The ~14-hour
diagnosis arose through repeated omission of the "measurement before bisect" step.

**Consequence (principles extension):** This stage was the direct occasion for the extension
of PROJECT-PRINCIPLES.md by §6 (diagnose before fix) and §7 (no hotfixes) as well as the five
diagnosis-related conventions (quantitative diagnosis, data trace, output medium,
Stage 23 pattern). The principles are formulated so that a similar marathon is recognizable and
stoppable: as soon as a diagnostic session skips the quantitative measurement and starts with
visual impressions or bisect, §6 is violated.

**Reference:** PROJECT-PRINCIPLES.md §6, §7; LESSONS.md L46, L50, L65, L66, L68, L69;
`archive/render-smoothness-measurements.md`; commits `c8538e0`, `7333ec4`, `b53d7d6`.

## Lesson 71 — Symmetric Avoidance Default Was a Regression

**Context:** The `symmetricAvoidance: true` default was introduced in the force decomposition sprint and
silently replaced the original asymmetry "trailer yields, leader holds". The old
asymmetry had a real function — clear responsibility for who yields — and was a feature
of the working anti-collision logic from the early iterations.

It was replaced without an inventory. As a result, there was symmetric force cancellation in dense
packs, which cost an entire diagnostic sprint until the architecture deficiency was recognized.

**Take-away:** Behavior changes to default values are not cosmetic changes. When an
existing default fulfills a technical function (even if not explicitly documented),
its replacement is an architectural intervention and requires the Regression Awareness Convention.

---

## Lesson 72 — DevScreen Block Placement Is Semantic: Ghost Bindings From Wrong Block

**Context:** PR #98 (Free-Lane Separation) added `homeForceReductionOnOverlap` as a UI field.
The field was placed in the `formGrid` of Block 2 (Start Layout), but the associated
`resetHomeForce` handler was in Block 9 (Home Force). The "Reset" button of Block 2 did not reset
the field — a silent bug.

The unit test had found the field (`getByLabelText('Home Force Reduction On Overlap')`) and
declared it correctly rendered. `getByLabelText` searches by aria-label in the entire DOM —
it does not check which block the field is in. The test was green, the UX bug invisible.

**Take-away:** For every new DevScreen field, check three things:

1. **Block context:** Is the field in the semantically correct block (not just the nearest
   convenient formGrid)?
2. **Reset coverage:** Which reset handler covers the field? Is it in the block whose
   reset button calls that handler?
3. **Test precision:** Does the test only check "rendered somewhere" or also "rendered in the
   right block with the right reset behavior"?

A `getByLabelText()` test alone is not proof of correct block membership.

**Reference:** PR #98 cleanup audit `fbc6c48`; docs/diagnose/cleanup-audit-pr98.md §4.

---

## Lesson 73 — Regression Awareness: Inventory Before Replacement (Meta Pattern)

**Context:** This lesson closes the reference PROJECT-PRINCIPLES.md §"Regression Awareness
Convention" → LESSONS.md L73. The pattern arose from L71 (symmetric avoidance regression)
and further architecture errors where working mechanics were silently replaced.

**Pattern:** Whenever a working component is replaced by a new one — even
if the new one appears "more elegant" or "simpler" — the following applies:

1. **Inventory:** What can the old component do? Which edge cases does it cover? Which
   user requirements does it fulfill (even undocumented ones)?
2. **Requirements matching:** Can the new component fulfill every single point?
   Where are there conscious trade-offs, and have these been explicitly accepted?
3. **Rollback path:** Branch, commit SHA, or feature flag — explicitly named, not just
   implicitly present.
4. **Sanity check before merge:** Is the new component in a live race at least as good
   as the old one? If there is a recognizable regression: stop.

**Corollary:** A demonstrably non-functional component is not tuned indefinitely.
After a documented diagnosis and two to three fix attempts without measurable
improvement, an architecture change is the correct response.

**Reference:** PROJECT-PRINCIPLES.md §"Regression Awareness Convention"; LESSONS.md L71.

---

## Lesson 74 — Home Force Dominance: Force Attribution Before Visual Diagnosis

**Context:** After implementing Free-Lane Separation (PR #98), racer clusters
remained partly persistent. Visually it looked like Free-Lane was not firing or was too weak.
The obvious reaction would be: increase `lateralForce` or adjust Free-Lane thresholds.

Instead, a force attribution simulation was performed (docs/diagnose/
free-lane-force-attribution-summary.md). Result: Free-Lane fired correctly and with adequate
magnitude — but `homeForceStrength = 0.04` pulled the racers per frame more strongly back to the center
than Free-Lane could separate them. The "weak Free-Lane" was a visual illusion.

**Fix:** `homeForceReductionOnOverlap = 0.3` — home force is reduced to 30% when two
racers geometrically overlap. This allows Free-Lane to complete the separation before home force
pulls back. Correct diagnosis in ~30 minutes instead of tuning roulette.

**Take-away:** For "feature doesn't work" observations in force-based systems:
first measure force attribution, don't tune constants. The dominant force is often one
that is not on your radar. Visual observation ("racers stay together") gives no
information about the force cause.

**Reference:** docs/diagnose/free-lane-force-attribution-summary.md; PR #98 commit `7459e08`.

---

## Lesson 75 — PR Merge Routine: AUDIT.md Instead of Line Reference

**Context:** Earlier merge prompts contained the instruction "adjust L106-L108 in AUDIT.md" —
a fragile line reference that becomes obsolete after every merge.

**Insight:** Line numbers in prompts become outdated immediately. The correct formulation describes
the content task, not the location: "update AUDIT.md".

**Workflow for every squash-merge to master:**

1. Run tests on master — capture total count + number of failures.
2. Test count history in AUDIT.md: possibly correct last entry (branch count ≠ master count possible), update master HEAD SHA.
3. If branch HEAD line is present: remove or rewrite to master.
4. Commit: `docs: update AUDIT.md — PR #NNN squash-merge (schema vX, NNN tests)`.

**Consequence:** Merge prompts from now on only say "update AUDIT.md" — no more line references.

---

## Lesson 76 — Global Does Not Hit Selectively: Scope of Symptom and Hypothesis Must Match

**Context:** In the context of the Bolt avoidance diagnosis (2026-05-16), the observed phenomenon
was selective — only certain racer constellations, only under certain conditions. An
intermediate frame-timing hypothesis was considered, but immediately stopped by the user's question
"why not all racers?". Frame timing problems affect all racers globally
equally — a global system cannot produce a selective symptom.

**Insight:** When a symptom is selective (only certain racers, only certain conditions,
only certain tracks), the cause must also be selective. A global cause cannot explain a selective
symptom. When hypothesis and symptom have different scopes,
the hypothesis is wrong — regardless of how plausible it appears in isolation.

**Consequence:** Before any diagnosis: explicitly ask "Does this symptom hit globally (all racers,
all tracks) or selectively (certain constellations)?" and only check hypotheses that have the same
scope. Scope mismatch is an immediate exclusion criterion.

---

## Lesson 77 — Mathematically Correct Fix ≠ Visually Effective: Browser Test Is Mandatory, Not Optional

**Context:** PR #117 (avoidance track scaling, 2026-05-16) was conceptually correct and
all tests were green. However, the browser test showed no perceptible improvement of
the observed symptom. Later diagnosis showed: the actual cause lay in the
frame timing architecture, not in the avoidance scaling.

**Insight:** Code correctness and green test suite are necessary but not sufficient
conditions for a successful fix. A fix can be mathematically correct, pass all tests,
and still not resolve the observed visual symptom — because the diagnosis
was incomplete. "Solution feels right" + tests green + no visual effect
= warning signal that the underlying diagnosis was wrong.

**Consequence:** Browser test with real race operation is not an optional follow-up step, but
mandatory verification. If a fix shows no visual effect: reopen the diagnosis, don't
tune parameters.

---

## Lesson 78 — Step Back After Multiple Unsuccessful Iterations: Architecture Review Instead of Further Patch

**Context:** The sprite interpolation (branch feat/render-interpolation) was approached in two iterations:
first per-rAF snapshot (outside the accumulator loop), then per-step
snapshot (inside). Both variants reduced the jitter but did not eliminate it.
After these two iterations without a complete solution, the user requested an
architecture review — no further patch experiment.

**Insight:** After 2–3 unsuccessful patch attempts, the signal is for architecture review,
not for further patches. Statistically the next attempt will also fail — the
underlying model assumption is wrong. The correct reaction: step back,
rethink the overall picture, explicitly write down and check the assumptions.

In the frame timing case, the wrong assumption was: "sprite interpolation alone is enough." The correct
insight: camera and sprite must interpolate synchronously (Pattern A). That was not
an iteration on the old assumption, but a change of assumption.

**Consequence:** After two to three unsuccessful fix attempts: explicitly switch to architecture review
mode. Write down symptom, previous assumptions, and previous fixes — often the assumption
error becomes visible in doing so, without further debugging.

**Reference:** L73 (regression awareness — don't tune indefinitely on non-functional components).

---

## Lesson 79 — Second Opinion on Large Architecture Decisions: Convergence as a Strong Signal

**Context:** Before the Pattern A implementation (render state interpolation, 2026-05-16),
the same architecture question was posed to both available AI systems: Claude Code and Copilot —
independently of each other, with identical context. Both recommended Pattern A without knowledge of
the other's answer. During the subsequent spec review, Copilot also found three
HIGH-priority improvements that were incorporated into the final spec (whitelist test approach,
sin/cos comparison for lerpAngle, concrete steady-state categorization).

**Insight:** Before irreversible or expensive architecture decisions, an
independent second opinion is worthwhile. Convergence of two independent voices on the same solution
is a strong signal — different reasoning paths, same conclusion. Divergence
is not a problem, but a valuable occasion for questioning before implementation. Even the
spec itself benefits from a second review: an external voice finds precision needs
that one overlooks oneself.

**Consequence:** For decisions with high reversal cost (new architecture layer,
paradigm shift, >1 day implementation): get a second opinion before the spec is written.
The investment is small, the risk reduction potential high.

---

## Lesson 80 — Question the Actual Desire: "Minimal-Invasive" Is Not a Success Measure

**Context:** In the transition from B1 (sprite interpolation alone) to Pattern A (sprite + camera
synchronous), the user was initially offered: "Camera also interpolated?" as an optional
extension — as if it were an add-on. In fact, it was architecturally mandatory: the gap
between sprite position (interpolated) and camera position (physics-raw) was the main cause
of the remaining jitter. "Optional" was the wrong categorization.

**Insight:** "Minimal-invasive" is not automatically "right". The tendency to present solutions as
smaller than necessary can lead the user to choose a half-finished solution — not because they want it, but
because the cost of the complete path was underestimated or hidden. If a project architecture has "safe, clean, maintainable" as a core value,
the clean solution may be more important than the fast one.

**Consequence:** For architecture decisions, explicitly ask for the actual desire:
"What is the goal?" instead of "What is the minimal intervention?". If a solution is architecturally
mandatory, state it clearly — don't disguise it as an option. The user then decides consciously,
not through a distorted cost picture.

**Reference:** L78 (architecture review instead of patch iteration); L79 (second opinion).

---

## Lesson 81 — Compensation Formulas Must Match the Race Geometry, Not the Unit Measurement (Phase 1B / feat/fairness-simulation)

**Context:** The `computeSpeedBonus` formula in `rowLayout.js` had been since D7c:

```
bonus = rowIndex × rowGapPx / pathLengthPx × speedBonusFactor
      = N × tOffset × speedBonusFactor
```

This formula compensates for the spatial starting disadvantage of a back row — but only exactly at
`finishT = 1.0`. For multi-lap tracks (finishT = 2–10+), the bonus was 2–10× too large (rear bias);
for open tracks and slow racers with short target distance, it was too small (front bias).
The simulation `sim-fairness.mjs` revealed this: all 144 track×racer×duration combinations
failed, sometimes with row-0 win rates of 0% or 100%.

**Insight:** A distance compensation formula must be normalized to the _actual target distance_,
not to the track length. The correct compensation factor is:

```
bonus_N = N × tOffset / row0Distance × speedBonusFactor

row0Distance (closed) = finishT
row0Distance (open)   = finishT − totalRows × tOffset
```

At `finishT = 1.0` (closed), the old formula coincidentally works. That was the only geometry
it was extensively tested for.

**Consequence:** Derive compensation formulas from t-space and validate against multiple finishT values
— not just the unit case. Statistical simulation is the only reliable
way to make such systematic errors visible: visual tests and unit tests cannot
detect the error at finishT=1.0. New signature:

```javascript
computeSpeedBonus(
  rowIndex,
  rowGapPx,
  pathLengthPx,
  speedBonusFactor,
  finishT,
  isOpen,
  totalRows,
);
```

**Reference:** feat/fairness-simulation, Phase-1A analysis (mathematics derivation), sim-fairness.mjs.

---

## Lesson 82 — spritePx Slider Is Absolute, but referenceSpriteSize Is Racer-count-dependent

**Context:** Phase 3B diagnosis — `spritePx` slider in the Dev Screen sets an absolute pixel target value for racer sprites in LEADER/BATTLE/COMEBACK states. `_computeZoomForTargetSize(spritePx)` divides by `_referenceSpriteSize = displaySize × displaySizeScale`. `displaySizeScale` is racer-count-dependent (more racers → smaller sprites → lower displaySizeScale → higher rawZoom). An absolute spritePx value gives a different zoom with 10 racers than with 70 racers.

**Insight:** An absolute pixel target value is not a stable calibration quantity when the base (referenceSpriteSize) is dynamic. The user turns the slider to 40px and gets significantly more zoom with 10 racers than with 70 racers — even though 40px looks identical in both cases.

**Consequence:** For a stable zoom tuning parameter across different racer counts, a relative factor must be used: `spriteScale = spritePx / referenceSpriteSize`. Then the tuning parameter is racer-count-independent. Migration effort: new config key (`spriteScale`) + conversion in `_computeZoomForTargetSize`. Standalone chore: `chore/sprite-scale-relative`.

---

## Lesson 83 — `_overviewStateZoom` on Open Tracks Must Equal `overviewZoom`

**Context:** Phase 3B OVERVIEW zoom fix. `_overviewStateZoom` was calculated via `_computeZoomForTargetSize(spritePx)` — even on open tracks. This gave a zoom value higher than `overviewZoom` (since spritePx demanded a zoom > OVERVIEW base value). On state change to OVERVIEW: `this.zoom = this._overviewStateZoom` → OVERVIEW was visibly too close (sprites too large, less track visible) compared to the race-start OVERVIEW where `overviewZoom` is set directly.

**Insight:** On open tracks, `overviewZoom` is the defined "full track visible" value. Any zoom above `overviewZoom` shows only a section and contradicts the OVERVIEW concept. `_computeZoomForTargetSize` is correct for LEADER/BATTLE/COMEBACK (there a racer should occupy a certain screen size), but not for OVERVIEW.

**Consequence:** In all three paths of `_computeZoomLevels()`, for open tracks: `this._overviewStateZoom = this.overviewZoom` (direct value, no calculation). Only for closed tracks is `_computeZoomForTargetSize` called. Corresponding guard condition:

```js
this._overviewStateZoom = this._isOpenTrack
  ? this.overviewZoom
  : this._computeZoomForTargetSize(
      profiles.OVERVIEW?.spriteScale ?? 1.0,
      FALLBACK_REFERENCE_SPRITE_SIZE,
    );
```

---

## Lesson 84 — `tSpaceLerpActive` + Wrong Pan Target = Hard Snap on State Change

**Context:** Phase 3B OVERVIEW pan jump fix. When `_lerpPhase === 'entry'` and `_camT !== null` and `_shape !== null`, `tSpaceLerpActive = true`. In this mode the renderer sets `offsetX = targetOffsetX` directly (no lerp) to support T-space interpolation. OVERVIEW's `_setTargets()` in this case delivered `focusRacers[0].x/y` as pan target — the world position of the leading racer. Since `tSpaceLerpActive = true`, this value was immediately (without lerp) set as canvas offset → camera jumps directly to the leader in frame 1 of OVERVIEW entry.

**Insight:** Every camera state that calls `_setTargets()` during the entry phase must check whether T-space lerp is active and in that case use `shape.getPosition(_camT)` as pan target. LEADER/BATTLE/COMEBACK did that already; OVERVIEW did not. The result is a visually disruptive camera jump on the first frame of every OVERVIEW entry.

**Safety:** `_camT !== null` guard is essential — at race start `_camT = null` (no `_transition()` called), so the fix applies exclusively to real mid-race transitions.

**Consequence:** In `_setTargets()` OVERVIEW case: early return when `_lerpPhase === 'entry' && _camT !== null && _shape`, with `shape.getPosition(_camT)` as pan target (open/closed track-specific). Then normal OVERVIEW flow for non-entry frames.

---

## Lesson 85 — Freeze Battle Group for Camera Lock, Live Group for Visual Effects

**Context:** Phase 3B BATTLE_ZOOM implementation. The camera should stay locked on a group of racers in a duel, even if the race order within the group changes. For this the battle group is frozen on state entry (`_frozenBattleGroup`). At the same time, visual focus effects (highlight ring, comeback ring) must reflect the current duel participants — not the frozen group from state entry.

**Insight:** Two semantically different groups are needed:

- **Frozen Group** (for camera centroid calculation): Set at BATTLE_ZOOM entry and remains constant. Prevents camera drift when racers fall out of the group.
- **Live Group** (for visual highlights): Recalculated every frame from the current race position. Shows which racers are actually in a duel.

If both groups are mixed (e.g. frozen group for highlights), racer highlights can point to wrong racers or disappear even though the duel is still running.

**Consequence:** BATTLE_ZOOM and COMEBACK_ZOOM explicitly maintain two racer sets: `_frozenBattleGroup` for the camera position (set once on state entry), `_liveBattleGroup` or dynamically calculated group for highlight rendering.

---

## Lesson 86 — `ctx.filter` Disables GPU Compositing — Use `globalAlpha`

**Context:** Phase 3B COMEBACK_ZOOM green ring. The original implementation used `ctx.filter = 'opacity(0.6)'` for a semi-transparent highlight effect. `ctx.filter` is a CSS-level property of the canvas rendering context; browsers implement it through software compositing (CPU-side) instead of GPU-accelerated compositing operations. In a race loop at 60 FPS with potentially multiple filtered draws per frame, this is a measurable performance hit.

**Insight:** `ctx.filter` always forces software rendering for the affected draw call. `globalAlpha`, on the other hand, is a native canvas parameter that is composited with GPU acceleration. For pure transparency effects (opacity), `globalAlpha` is always the correct choice.

**Consequence:** Never use `ctx.filter = 'opacity(X)'` for transparency — always use `ctx.globalAlpha = X` with explicit reset to `1.0` after the draw. Other `ctx.filter` values (blur, brightness, etc.) have no `globalAlpha` alternative and should be avoided in performance-critical rAF loops or restricted to infrequent frames.

---

## Lesson 87 — Missing STATE_CONFIG Entry Mimics a Real Camera State Bug

**Context:** Phase 3C diagnosis (chore/sprite-scale-relative). In the browser it was observed: the camera status badge showed "OVERVIEW" (gray, wider text) even though the camera was visibly at a LEADER-level zoom. The transition log showed the last entry as `LDR→LC` (LEAD_CHANGE). The badge was therefore showing the wrong state — it showed OVERVIEW instead of LEAD CHANGE.

Root cause: `CameraStateHUD.STATE_CONFIG` contained no entry for `LEAD_CHANGE`. The fallback logic `STATE_CONFIG[displayState] ?? STATE_CONFIG.OVERVIEW` returned the entire OVERVIEW styling for `displayState = 'LEAD_CHANGE'` — including label "OVERVIEW", gray color, and tooltip. The CameraDirector state machine was correctly in LEAD_CHANGE; only the badge rendered incorrectly.

**Insight:** A missing configuration object with a `??` fallback produces no error message — it silently renders the fallback state. This looks to the observer like a real state machine bug (wrong state display) even though the cause lies in the rendering layer, not in the state machine.

The diagnostic path therefore initially led in the wrong direction: investigation of `this.state` assignments in CameraDirector (there are only two locations: constructor + `_transition()`), verification of `hudState` getter logic, transition log analysis. Only when the log showed `LDR→LC` without a corresponding OVERVIEW entry was it clear: the bug is in the badge rendering, not in the director.

The user observation was the decisive hint: "OVERVIEW badge at tight zoom" — zoom and state did not semantically match. The diagnostic tools (transition log panel) then quickly confirmed the cause.

**Consequence:** For components that render via `STATE_CONFIG[key] ?? fallback`: ensure that a configuration entry exists for every possible state value. Tests must cover all possible input values — not just those known at the time of implementation. One test case per state in `STATE_CASES` (label + CSS class + tooltip) prevents a newly added camera state from landing in the badge fallback.

**Reference:** `CameraStateHUD.jsx`, `CameraStateHUD.test.jsx` — LEAD_CHANGE entry added, STATE_CASES extended from 5 to 6. Phase 3C (chore/sprite-scale-relative, squash `6a9dcfc`).

---

## Lesson 88 — T-Space Lookback Is Track-dependent

**Context:** Phase 3D (FINISH_OVERVIEW). The `finishOverviewLookback` parameter was defined in T-space (0.08). On Space Sprint with a path length of ~19772px, 0.08 T-space corresponds to ~1582px — almost the entire left third of the track. On a short closed track (~3750px path length), the same 0.08 T would be only ~300px. The lookback range was not track-independent.

**Cause:** T-space parameters scale linearly with track length. An operator who sets 0.08 on Space Sprint gets a completely different visual effect on another track — the camera looks back much too far on Space Sprint and too little on short tracks.

**Fix:** a `finishOverviewLookbackPx` setting, in world pixels. Formula: `lookbackFrac = lookbackPx / pathLen`; then `lookbackT = normT − lookbackFrac`. `shape.getTotalLength()` provides the track-specific path length at runtime.

**Consequence:** Always check whether a parameter makes sense in T-space or world pixels. If the visual effect is a physical distance (e.g. "how far before the finish line"), then world pixels is the right unit — track-independent, intuitive for operator tuning.

**Reference:** `CameraDirector.js` `_finishOverviewLookbackPx`, `_transition()` + `_setTargets()`, `defaults.js` `finishOverviewLookbackPx`. Phase 3D.

---

## Lesson 89 — `_camT = target` in `_transition()` → Hard Cut, Not Smooth Pan

**Context:** Phase 3D (FINISH_OVERVIEW). In `_transition()`, `this._camT = lookbackT` was set. Since `_camT` represents the current T value for T-space lerp, this immediately set the pan start point to the target — delta = 0, no lerp step, camera jumps hard.

**Cause:** The T-lerp works as `_camT += tDelta(_camT, _transitionTargetT) × lf`. When `_camT` is already equal to `_transitionTargetT`, there is no delta and no lerp step. `_transition()` with `_camT = lookbackT` sets start = destination, causing the entry phase to immediately "converge".

**Fix:** In `_transition()`, only set `_transitionTargetT = lookbackT`, leave `_camT` at winner.t. Add a separate `else if` branch in the OVERVIEW T-lerp section that moves `_camT` step by step toward `_transitionTargetT` — in parallel with the zoom-out with the same time constant:

```js
} else if (this._inFinishMode && this._camT !== null && this._transitionTargetT !== null) {
  this._camT += this._tDelta(this._camT, this._transitionTargetT) * lf;
}
```

**Consequence:** `_transition()` is for one-time setup logic (setting states, defining targets), not for immediate position assignments that should be smoothly animated. For smooth movements: save target, add lerp branch in the update loop.

**Reference:** `CameraDirector.js` `_transition()` FINISH_OVERVIEW block, OVERVIEW T-lerp branch in `_setTargets()`. Phase 3D.

---

## Lesson 90 — Read the Import Graph Before Planning a File Split

**Context:** RaceTuningSection.jsx (1269 lines) was planned to be split into three components: `BehaviorTuningSection`, `DynamicsTuningSection`, and `PrioritySystemSection`. Reading `DevScreen.jsx` imports before writing any code revealed that `PrioritySystemSection.jsx` already existed as a standalone file — already imported directly by `DevScreen.jsx`. Only two new components were actually needed.

**Insight:** When a task says "split file X into components A, B, C", the LOC of the monolithic file gives a false picture of what remains to be done. A component that already exists and is already imported by the parent is already extracted — invisible from the line count of the file being split.

**Consequence:** Before any split task: read the import list of the surrounding module (the parent that renders all sub-components). Any standalone file already imported is already extracted. Map what exists before planning what to create.

---

## Lesson 91 — `forwardRef` + `useImperativeHandle` for Coordinator-to-Child Imperative Calls

**Context:** RaceTuningSection's "Reset All Defaults" button needed to trigger resets in two self-contained sub-components (`BehaviorTuningSection`, `DynamicsTuningSection`) without lifting all state into the coordinator. Each sub-component owned its own `useState` and was fully self-contained.

**Insight:** When a coordinator needs to call a method on a self-contained child (imperative call like `resetAll()`), `forwardRef` + `useImperativeHandle` is the clean solution: each sub-component exposes exactly the methods the coordinator needs via a ref, without leaking internal state upward. The coordinator holds refs (`dynamicsRef`, `behaviorRef`) and calls `ref.current?.resetAll()` on button click.

**Consequence:** For coordinator-to-child imperative calls (reset, focus, scroll), prefer `forwardRef` + `useImperativeHandle` over prop callbacks or state lifting. The ref API is intentionally minimal — expose only what the coordinator needs.

---

## Lesson 92 — `getCoatVariants` Cache Key Must Match the Lookup Key in `_drawBody`

**Context:** `getCoatVariants(url, coats, tintMode)` caches results under the key `url::tintMode`. When the Racer Editor introduced `tintMode='auto'`, the warm-up call passed `'auto'` as tintMode (correct), but `_drawBody`'s fast-path lookup called `getCoatVariants.cached(url, 'multiply')` — a different key — so the cache always missed on `auto` types, falling through to the slow lazy-tint path on every frame.

**Insight:** Any function that warms a cache under key K must use the same key K for the lookup. When tintMode is polymorphic (e.g. `'auto'` resolves to `'multiply'` or `'screen'` at runtime), the resolution must happen at lookup time too, not silently differ between write and read.

**Consequence:** Whenever adding a new tintMode value, check both the warm-up call site (registry/`warmUpAllRacerTypes`) and the render call site (`_drawBody`) to confirm the same string reaches `getCoatVariants.cached`. A unit test that calls warm-up then checks the cached key value would catch this class of bug mechanically.

**Reference:** `SpriteRacerType.js` `_drawBody` fast path; `spriteTinter.js` `getCoatVariants.cached`; `index.js` `warmUpAllRacerTypes`. Racer Editor Phase 2, commit `edd044c`.

---

## Lesson 93 — Lazy Tint Fallback Must Resolve `tintMode='auto'` at First Use, Not Hardcode a Default

**Context:** `_drawBody`'s lazy-tint path (fires when the warm-up cache is cold) had a ternary: `cfg.tintMode === 'auto' ? 'multiply' : (cfg.tintMode ?? 'multiply')`. For dark/line-art sprites that need `'screen'` compositing, this always produced the wrong blend mode, making the sprite render as untinted (effectively outline-only on dark pixels).

**Insight:** `tintMode='auto'` means "detect the right mode from the sprite pixels". Hardcoding `'multiply'` as a synonym for `'auto'` defeats the whole purpose of auto-detection. The correct fix is to run `detectTintMode(getImageData(...))` once on first use and cache the result on the instance so detection never runs again per-frame.

**Consequence:** When a config value means "figure it out at runtime", the code that consumes it must either (a) resolve it once at construction time if the asset is available, or (b) resolve-and-cache on first use if the asset loads asynchronously. Never silently collapse a polymorphic sentinel value into a hardcoded constant.

**Reference:** `SpriteRacerType.js` `_drawBody` lazy-tint path; `spriteTinter.js` `detectTintMode`. Racer Editor Phase 2, commit `b35e7f0`.

---

## Lesson 94 — Bounding-Box Edge-Strip Filtering Clears Leaked Background Pixels After Removal

**Context:** `computeSpriteBoundingBox` (in `backgroundRemoval.js`) scanned the alpha channel to find the tightest opaque rectangle. When the background-removal tolerance was near-threshold, semi-transparent edge pixels survived, making the bounding box 1–3 px too wide on each side. The resulting sprite had a faint-colour border that was visible when tinted.

**Insight:** Background-removal algorithms always leave a halo of semi-transparent fringe pixels at colour-transition edges. A single tolerance pass is not enough. An edge-strip filter — inspecting a 1-pixel-wide band along each side of the candidate bounding box and ignoring rows/columns where all alpha values are below a secondary alpha floor — removes the fringe without affecting the actual sprite content.

**Consequence:** For any bounding-box computation that follows an alpha-masking pass, add a secondary edge-strip check. The strip width (1 px) and alpha floor (e.g. 16/255) should be constants so they can be tuned without hunting through the algorithm.

**Reference:** `backgroundRemoval.js` `computeSpriteBoundingBox`; 4 regression tests. Racer Editor Phase 2, commit `c9faaa4`.

---

## Lesson 95 — Spritesheet Dead Space: Crop to Content Before Specifying `frameHeight`

**Context:** The luge PNG was exported as 1536×1024 (12 frames × 128 px wide, full 1024 px tall). The actual luge content occupied only rows 369–601 (~232 px). `frameHeight` was initially set to 1024, causing `SpriteRacerType._drawBody` to render each frame at natural height 1024 px — sprites were drawn vastly oversized and invisible (scaled off-canvas even at `displaySize: 40`).

**Insight:** `frameHeight` drives the canvas `drawImage` source rectangle. If the PNG has dead transparent rows (blank space above/below the content), `frameHeight = full sheet height / frameCount` includes those rows in every frame — the displayed sprite is almost entirely blank, and any `displaySize` setting compensates for the wrong base height.

**Fix:** Crop the spritesheet to the actual content bounding box (PIL `img.crop((0, 369, 1536, 601))`). Set `frameHeight` to the cropped height (232 px). The crop is permanent — the source file is the single source of truth for dimensions.

**Consequence:** Before specifying `frameHeight` for any new spritesheet, visually verify that every frame row is occupied by actual content. If there are blank rows: crop first, then measure. `frameHeight` must reflect cropped content height, not the full PNG height divided by `frameCount`.

---

## Lesson 96 — `tintMode: 'multiply'` for Dark Outline Sprites (Hardcode, Don't Auto-detect)

**Context:** The luge sprite has a dark figure (sled + rider as dark outline/shadow shapes) on a transparent background. `detectTintMode` computes the Rec.709 luminance average of all non-transparent pixels: dark pixels (near 0,0,0) pull the average below 80, so `detectTintMode` returns `'screen'`. `screen` mode: `result = 1 - (1-src)×(1-dst)` — dark source pixels become near-white. Tinting a dark sprite with `'screen'` washes it out instead of colorizing it.

**Insight:** `detectTintMode` was designed for sprites whose dominant non-transparent region is the colored body (e.g. horse coat). For sprites whose dominant non-transparent region is the dark outline or shadow, the luminance heuristic inverts: the outline is dark not because it should be composited with `screen`, but because it is intentionally dark detail that must survive tinting. `'multiply'` keeps dark pixels dark and tints the mid-tone/light pixels correctly.

**Consequence:** Hardcode `tintMode: 'multiply'` for any sprite that is dark-on-transparent (outlines, silhouettes, shadows). Only use `tintMode: 'auto'` when the sprite has a large bright body region. If the tinted sprite looks washed-out or inverted, switch from `'auto'` to `'multiply'` first before investigating anything else.

**Reference:** `LugeRacerType.js` `tintMode: 'multiply'`; `spriteTinter.js` `detectTintMode`; Lesson 93 (auto resolution at first use). Feature branch `feature/luge-type`, fix commit `3208ef4`.

---

## Lesson 97 — EditorShape Double Re-Sampling: getPosition(T, 0) Zigzags at U-Turns

**Context:** Diagnosis 4 (2026-05-28) investigated why a single racer visually drifted outside the track boundary lights on Luger Hill even though `physicalY = 0.000000` throughout the race (confirmed live by DIAG3 HUD). Root cause: `EditorShape` independently re-samples the 200-point `innerPoints` array and the 200-point `outerPoints` array each to 500 arc-length-uniform samples in the constructor. At a U-turn, the inner boundary is shorter than the outer boundary. At the same T fraction, `inner[T]` is further around the bend than `outer[T]`. `getPosition(T, 0)` computes the midpoint of these two misaligned positions — producing a lateral zigzag of up to 73.7 px at Luger Hill's tightest U-turn, far off the actual drawn centerline.

**Insight:** Two curves of different arc lengths, each parameterized by their own arc-length, will be at physically different positions at the same T fraction. This destroys the invariant that `physicalY = 0` should place a racer on the track centerline. The zigzag magnitude is proportional to the inner-to-outer arc-length ratio difference and grows with U-turn curvature. Minimum circumradius (measured for Luger Hill: ~315 px >> 125 px half-width) rules out self-intersection as a cause — the mismatch is purely a re-sampling artifact.

**Consequence (fix direction):** `getPosition(T, physicalY)` must use a single shared parameterization anchored to the centerline. Two options:

- **(a) Store and re-sample centerPoints** — use the saved 25-point `centerPoints` array (present in the track JSON) directly as the T→position source for physicalY=0, and derive lateral offsets geometrically.
- **(b) Center-arc-length parameterization** — at track save time, resample inner and outer by center arc-length so that inner[T] and outer[T] are laterally co-aligned at every T.

**How to detect:** Run a single racer on an open U-turn track. `physicalY` stays at 0.000000 (confirm via diagnostic HUD), but the racer visually wanders off the centerline at bends. Measure inner/outer midpoint lateral displacement at the tightest bend — >5 px oscillation confirms the mismatch.

**Reference:** Diagnosis session 2026-05-28, Luger Hill track `90d3020197da.json` (indices 67–68: inner oscillates to (3207.1, 1043.9), outer to (3444.8, 955.6), midpoint Y jumps 73.7 px). `EditorShape.js` constructor: `catmullRomSpline(innerPoints, 500)` and `catmullRomSpline(outerPoints, 500)` independently. `getPosition(t, offset)`. Backup tag: `backup/pre-centerline-fix`.

---

## Lesson 98 — `track.width` vs `getActualTrackWidth()` for Center-Perpendicular Displacement

**Context:** `EditorShape.getPosition(t, offset≠0)` in the center branch needs a perpendicular displacement magnitude. The initial implementation called `getActualTrackWidth()` — which returns the median inner-to-outer sample distance. This is wrong for the center-path formula.

**Insight:** `track.width` is the designer-specified track width stored as a JSON field — the authoritative source for how far a perpendicular offset should extend from the centerline. `getActualTrackWidth()` measures the physical distance between inner and outer spline samples, which is correct for row-layout capacity calculations (fitting sprites shoulder-to-shoulder) but is NOT the right number for displacing a racer laterally from the centerline. For a center-mode track, `inner = offsetCurve(center, +w/2)` and `outer = offsetCurve(center, -w/2)`, so the measured inner-to-outer distance equals `track.width` only on straight sections; it varies around curves.

**Consequence:** When using centerPoints, always read `track.width` (stored in JSON) for perpendicular displacement and cache it as `_centerWidth`. Use `getActualTrackWidth()` only for layout/capacity calculations that need the physically measured geometry.

**Reference:** `EditorShape.js` constructor (`_centerWidth` assignment); `EditorShape.test.js` STRAIGHT_CENTER fixture (width=80, measured inner-to-outer=100 — they differ). Fix session 2026-05-29.

---

## Lesson 99 — Perpendicular Sign Convention: `angle − π/2` for Positive Offset → Outer Side

**Context:** In `getPosition(t, offset≠0)` center branch, the perpendicular direction was initially computed as `angle + π/2`. This sent positive-offset racers toward the inner boundary instead of the outer — the opposite of the fallback inner/outer interpolation path.

**Insight:** Canvas y-axis points downward. For rightward travel (`angle = 0`), `angle + π/2 = π/2` = 90° CCW = `+y` direction = toward larger y values = toward the inner boundary (in real game data: `trackEditorSave` builds inner via `offsetCurve(center, +w/2)`, which for rightward dx=1 gives `ny = dx/len = +1`, so inner is at larger y). The fallback path maps positive offset to the outer boundary (smaller y). The signs are inverted.

**Fix:** Use `angle − π/2` (CW in canvas y-down = `−y` for rightward travel = toward smaller y = outer side). Numerical check: `angle=0`, `perpSin = sin(−π/2) = −1`, `offset = +0.5` → `y = center.y + 0.5 × width × (−1)` = toward smaller y = outer ✓.

**Consequence:** Any center-branch perpendicular formula must use `Math.cos(angle − π/2)` / `Math.sin(angle − π/2)`. Do not infer sign from standard math-textbook CCW convention — canvas y-down inverts the orientation. Always cross-check against the fallback path's sign to confirm positive offset → outer.

**Reference:** `EditorShape.js` `getPosition` center branch, perpendicular displacement lines. Fix session 2026-05-29. Lesson 98 (same fix session).

---

## Lesson 100 — `_precomputeAngles` Must Use Arc-Length-Uniform Center Curve Tangents, Not Inner+Outer Average

**Context:** `_precomputeAngles` originally computed `angles[i]` from the central difference of `_inner[i]` and `_outer[i]` at the same sample index. At tight U-turns on Luger Hill, this produced up to 25.6° tangent error for center-position racers.

**Root cause:** `_inner` and `_outer` are each arc-length-parameterized by their own total arc length. At a U-turn, inner and outer have substantially different arc lengths (Luger Hill: inner ≈ 600 px through the bend, outer ≈ 1400 px — factor of 2.3). At the same arc-length fraction index `i`, the inner has already rounded the apex while the outer has not yet reached it. The central-difference tangent of their positions therefore points between the two legs of the bend rather than along the track direction.

**Fix:** When `this._center` is available (tracks saved with `centerPoints`), use central differences of `_center[i]` instead. The center curve is arc-length-uniform, passes through the actual bend apex, and gives correct tangents everywhere. When `_center` is absent, the inner+outer average is unchanged (zero regression).

**Critical prerequisite:** `_center` must be arc-length-uniform — built with the same `opts` as `_inner` and `_outer`. A T-uniform center curve (like commit b4ebdb4) produces incorrect tangents near the track endpoints and breaks this fix. Verify that `catmullRomSpline` is called with identical `opts` for all three curves.

**Test strategy:** A "diagonal center" fixture — center goes diagonally at −0.46 rad while inner/outer go horizontally at 0 — directly verifies which formula `_precomputeAngles` uses: `_angles[mid] ≈ −0.46` (center tangent, new code) vs `_angles[mid] ≈ 0` (inner+outer average, old code).

**Consequence:** When `track.centerPoints` is present, `_precomputeAngles` must use `this._center` as the tangent source. Any refactor that changes `_center` parameterization (e.g. switching from arc-length to T-uniform) must update `_precomputeAngles` to match or disable the center-tangent path.

**Reference:** `EditorShape.js` `_precomputeAngles`; `EditorShape.test.js` DIAGONAL_CENTER fixture. Fix session 2026-05-29. See Lesson 97 (arc-length phase mismatch root cause), Lesson 98 (same session).

---

## Lesson 104 — Screen Blending Requires a Light or Neutral Base Sprite; Dark Bases Require Multiply

**Context:** `LugeRacerType` was shipped with `tintMode: 'multiply'`. The luge spritesheet has a red base suit. With multiply blending, the red suit dominated: applying a blue tint still produced a reddish racer because `red × blue = dark`. Visually, multiply tinting only works when the base sprite has white or light-gray regions where the tint color should appear.

**Insight:** Multiply blend: `result = base × tint`. A dark or saturated base color clamps the result toward that color regardless of the tint applied. Screen blend: `result = 1 − (1−base)×(1−tint)`. A dark base with screen tinting lets the tint color shine through because the base contributes little opacity. For sprites with a prominent dark helmet or dark sled runners, those regions should be near-black in the PNG so screen blending leaves them uncolored.

**Consequence:** Choose tintMode based on the base sprite's luminance distribution:

- `multiply` — sprite has light/white regions where tint should appear (horse body, fur, fabric).
- `screen` — sprite has dark/black regions that define the shape; tint fills the mid-tones.
- Darken any region that should NOT be colored by the tint (e.g. helmet, metal parts) to near-black in the PNG regardless of tintMode.

**Reference:** `LugeRacerType.js` (`tintMode: 'screen'`); `spriteTinter.js` (`tintSprite`). Session 2026-05-30.

---

## Lesson 105 — Coat Patterns Need Sufficient Sprite Area per Region; At Small Display Sizes They Are Indistinguishable

**Context:** The coat patterns feature (solid/stripes/dots) was implemented and technically functional — `source-atop` pattern overlay on the tinted canvas, lazy-baked per `(coatId, patternId)` pair. During visual validation the patterns were disabled: the 16×16 stripe tile and 20×20 dot tile rendered as a muddy texture on the 40 px display-size sprite, making racers harder to distinguish rather than easier.

**Root cause:** At `displaySize: 40` and `spriteHeight: 238`, the scale factor is `40/238 ≈ 0.168`. A 16 px stripe tile renders at ~2.7 px on screen — below the threshold where the human eye can resolve a repeating pattern against a background. The overlay produced a uniform darkening effect, not a visible stripe.

**Insight:** Pattern tiling only works when the tile period is ≥ ~5 px on screen. For a racer rendered at 40 px height, the entire visible sprite body is only ~20–30 px tall. There is simply not enough spatial resolution to render a distinct pattern. Patterns require either: (a) larger display sizes (≥ 80–100 px), or (b) much coarser tiles (≥ 30 px pre-scale, rendering at ≥ 5 px on screen).

**Consequence:** Before implementing visual embellishments (patterns, gradients, overlays), verify the target display size at actual screen pixels. The canvas or design tool view is not representative — use `(displaySize / frameHeight) × tileSize` to compute the on-screen tile period. If below 5 px, the pattern will not be visible. Infrastructure can be kept for later; assignment should return `'solid'` until display sizes are large enough or tile sizes are tuned.

**Reference:** `coatAssignment.js` (`assignPattern` — always returns `'solid'`); `spriteTinter.js` (`_buildStripeTile`, `_buildDotsTile`, `_applyPatternOverlay`). Session 2026-05-30.

---

## Lesson 101 — Vite HMR Does Not Invalidate In-Memory JS Module Caches for `public/` Asset Changes

**Context:** After vertically flipping `luge-slide.png` (committed to `client/public/assets/racers/`), the rotation artifact persisted in the live game. A canvas eval test using a `?timestamp` cache-busted URL showed the new sprite correctly — yet the in-game racer still rendered from the old asset.

**Root cause:** `spriteTinter.js` maintains a module-level `_variantCache` Map keyed by `${spriteUrl}::${tintMode}`. `spriteLoader.js` maintains a module-level `_cache` Map keyed by URL. Both are populated once per browser session at first `getCoatVariants()` / `loadSprite()` call and never re-checked. Vite HMR correctly hot-replaces JS modules when source files change — but `public/` binary assets (PNG, etc.) are served as static files. Changing a PNG in `public/` does not trigger any HMR event; the old `Image` object and the old offscreen canvases built from it stay alive indefinitely.

**Fix / detection:** A hard browser reload (Ctrl+Shift+R) clears both JS module-level caches and forces a fresh network fetch of all assets. The canvas eval test bypassed the caches by loading the image with a `?timestamp` query string — confirming the new asset was correct while the game still served stale. If a PNG replacement appears to have no effect in-game, hard-reload before investigating the code.

**Consequence:** Never test sprite asset changes in the same browser session without a hard reload. `loadSprite` and `getCoatVariants` have no auto-invalidation for static asset swaps; this is by design (performance), but means debugging requires fresh sessions.

**Reference:** `spriteTinter.js` (`_variantCache`, `getCoatVariants.cached()`); `spriteLoader.js` (`_cache`, `loadSprite`). Session 2026-05-29. See also Lesson 95 (sprite dead-space), Lesson 96 (multiply tinting).

---

## Lesson 102 — Sprite Frame X-Center Must Be Consistent Across All Frames to Avoid Perpendicular Oscillation

**Context:** After fixing the vertical flip and hard-reloading, a new artifact appeared: the luge body oscillated left-right as it traveled, most visibly at the loop seam (frame 11 → frame 0). Measured by Python/numpy: frame 0 had X_ctr=94.5, frame 11 had X_ctr=33.0 — a 61 px jump in the 128 px frame width.

**Why oscillation happens:** `SpriteRacerType._drawBody` draws each frame centered at `(-dw/2, -dh/2)` after `ctx.rotate(baseRotationOffset)`. With `baseRotationOffset = Math.PI/2`, the sprite's X axis maps to the screen's perpendicular-to-travel direction. A frame-to-frame X shift of Δx pixels appears as a lateral screen oscillation of `Δx × (displaySize / frameHeight)` pixels. For Δx=61, frameHeight=232, displaySize=40: `61 × (40/232) ≈ 10.5 px` of screen oscillation — easily visible.

**Fix principle:** All frames in a sprite sheet must have the figure's optical center (centroid of non-transparent pixels) at the same X coordinate within the frame. For a 128 px frame width the target is X=64. Measure with `numpy.where(alpha > 0)` on each cropped frame and shift frames that deviate by >2 px.

**Consequence:** When exporting sprite sheets (Blender, Krita, etc.), verify that frame content is spatially stable under animation — especially at extremes of squash/stretch cycles where the figure may lean toward a frame edge. If the sprite sheet tool does not guarantee X-stable export, post-process with PIL to re-center each frame.

**Reference:** `LugeRacerType.js` (`frameWidth`, `frameHeight`, `displaySize`); `SpriteRacerType.js` `_drawBody` drawImage call. Fix session 2026-05-29. Commits 57f7c55, 478ba0e. See Lesson 103 (loop seam continuity).

---

## Lesson 103 — Loop Seam (Frame N−1 → Frame 0) Must Be Seamless; Large X Jump at Seam Is Highly Visible

**Context:** Frames are played cyclically. The transition from the last frame back to frame 0 is a real animation frame, not a cut. If frame N−1 and frame 0 have different X-centers (or any other visual discontinuity), that jump fires at the animation period frequency — for a `basePeriodMs: 600` cycle, once every 600 ms — and is highly noticeable to viewers.

**Why it's the worst location:** The human visual system is especially sensitive to sudden spatial shifts. A 61 px X-center jump at the loop seam on Luger Hill (frame 11 → frame 0 in the original 12-frame sheet) produced a lateral jump of ~10.5 px on screen — perceived as a "pop" rather than smooth animation. Interior frames with smaller deviations are less noticeable even at the same magnitude because the surrounding frames provide visual continuity.

**Fix principle:** Treat frame 0 and frame N−1 as the "endpoints" of a seamless loop. They must not only both be well-centered, but their visual content should form a perceptually continuous transition (e.g. both at mid-stroke of the animation cycle, approaching from opposite sides). For a sine-curve squash/stretch animation, the natural loop point is at the neutral (upright) pose where squash and stretch are both zero.

**Consequence:** When designing a cyclic sprite animation, prototype the loop seam first. Export frame 0 and frame N−1 side-by-side, overlay them, and verify both X and Y visual centers align. Any exported sheet where the final frame and first frame differs by >2 px in optical center must be rejected.

**Reference:** `LugeRacerType.js` (`basePeriodMs: 600`, `frameCount: 16`); `SpriteRacerType.js` `_getFrameIndex`. Session 2026-05-29. See Lesson 102 (X-center consistency).

---

## Lesson 106 — Velocity-Based Lateral Physics Eliminates Zigzag at Zero Extra Overlap Cost

**Context:** feat/lateral-velocity (2026-05-31). Prior implementation applied net lateral force directly to `physicalY` each frame. With opposing forces (home force pulling left, avoidance pushing right), the sign could flip frame-to-frame, producing visible zigzag oscillation — especially in tight packs.

**Fix:** Accumulate forces into `physicalYVelocity`, then apply velocity to position with damping:

```
physicalYVelocity = physicalYVelocity * lateralDamping + netForce
physicalY += physicalYVelocity
```

As measured on 2026-05-31, a `lateralDamping` of 0.25 meant velocity decayed to 25% per frame — enough inertia to smooth over single-frame sign reversals, not enough to prevent real avoidance from working.

**Sim result:** −37% `lateralSpeedScore`, −44% `zigzagScore` at same or lower `overlapRate` (targeted sweep d=0.25, f=0.012 vs. baseline d=0.45, f=0.010). Zone success rates: +0.3pp overall — indistinguishable from noise. Smoother lateral motion is orthogonal to race-plan targeting effectiveness.

**Insight:** Physics-based smoothing (velocity + damping) is more robust than threshold-based filtering. Threshold filters require tuning per track width and racer count; velocity damping scales naturally because it operates on the unit-normalized physicalY space.

**Consequence:** For any force-accumulation system where the output oscillates between frames: add a velocity buffer with damping before applying to position. Measure both `zigzagScore` (direction reversal rate) and the target metric (overlap, success rate) separately — smoothing and accuracy are decoupled.

---

## Lesson 107 — Latin Hypercube Sampling for Multi-Parameter Sweeps: Extension Beats Uniform Coverage

**Context:** feat/lateral-velocity 8-parameter sweep. A 1000-combo Latin Hypercube sample explored the space; top-10 combos by score were extended with 200 additional nearby combos.

**Key finding:** The extension phase found substantially better scores (−5.5) than the uniform LHS phase (−2.8), even when the initial sweep had 1000 combos. The reason: LHS guarantees one sample per stratum but does not densify around promising regions. Extension around the top-10 provides local density without requiring exponentially more combos.

**Pattern:**

1. LHS Phase 1 — broad coverage (N ≥ 500 combos per track)
2. Extension condition — if top-10 mean is within 18% of any range boundary, extend
3. Extension Phase — 200 combos centered on top-10 centroid with ±20% range
4. Phase 2 — 100-race validation on top-5 by score

**Insight:** The number of "survived" combos matters more than the total sweep size. A hard cutoff (e.g. overlapRate ≤ baseline per track) reduces the search space dramatically and prevents high-score but physically invalid combos from polluting Phase 2.

**Reference:** `scripts/param-sweep-full.mjs`, `scripts/sweep-lateral.mjs`. Session 2026-05-31.

---

## Lesson 108 — Suppression (delta = 0) Beats Impulse Injection When Damping Kills Small Velocities

**Context:** feat/stuck-mode (2026-05-31). Bilateral avoidance forces cancel when a racer is sandwiched between two neighbors at equal distance. With `lateralDamping = 0.25`, velocity decays to 25% per frame — a racer with net force ≈ 0 becomes motionless in ~5 frames and stays frozen until pack geometry changes.

**Failed approach — escape impulse:** Adding a small per-frame velocity injection (0.0008–0.0020) to `delta` before the damping step produced effective velocities of only `impulse × 0.25 = 0.0002–0.0005` — far below the stuck-detection threshold of 0.0015. The stuck counter never saw improvement. On Dirt Oval the tiny positional drift pushed racers into new collisions, monotonically increasing episode counts (baseline 910 → max 1422 at 0.002).

**Fix — suppression:** When the stuck condition holds (`totalPressure > 0.008`, `imbalance < 25%`, `|physicalYVelocity| < 0.0015`), set `delta = 0` explicitly. The racer holds its exact position and waits. Normal behavior resumes the moment the bilateral symmetry breaks (a neighbor moves, the condition clears).

**Sim result:** Space Sprint −18% zigzag / −10% overlap / −25% lateralSpeedScore; Dirt Oval ±0% / ±0% / −29%. All hard cutoffs pass.

**Consequence:** Before injecting a corrective force into a damped velocity system, check whether `force × damping < detection_threshold`. If so, the force will never register and is likely harmful (tiny positional drift into unexpected configurations). The correct fix is to suppress the conflicting forces, not to overpower them.

**Reference:** `client/src/modules/raceBehavior.js` (`STUCK_P_THRESH`, `STUCK_BALANCE_RATIO`, `STUCK_VEL_THRESH`). Session 2026-05-31.

---

## Lesson 109 — Phase-Locked Zoom Floor Fails When Computed From Frontrunners Only

**Context:** feat/adaptive-zoom-rubberband (2026-05-31). Initial implementation derived the zoom floor from the bounding box of the frontrunners (top-N racers by track progress). On tight tracks or during a solo breakaway, the frontrunner bounding box collapses to a small region — the floor zoom required to show N racers within that box is already satisfied by the current zoom level, so the floor never fires and trailing racers remain off-screen.

**Fix:** Count visible racers per frame against the current viewport (world-space frustum check), not against a bounding box. Apply a slow ratchet: zoom out by a small step per frame when visible count < `minRacersVisible`, never zoom in faster than the normal lerp. This per-frame visibility count responds to actual screen coverage, not pack geometry.

**Consequence:** Zoom floors derived from positional bounding boxes are fragile — any pack configuration that clusters the reference group tightens the box and disables the floor. Derive floors from viewport coverage instead.

**Reference:** `client/src/modules/camera/CameraDirector.js` (`minRacersVisible`, `leaderMinZoom`). Session 2026-05-31.

---

## Lesson 110 — Rubber-Band Formula Normalized Over Full Track Length Makes Boost Invisible

**Context:** feat/adaptive-zoom-rubberband (2026-05-31). Initial rubber-band implementation computed a catch-up boost proportional to the gap between the trailing racer and the leader, normalized over the full track length (0–1). A typical mid-race gap of 0.05–0.15 track units produced a boost of `gap × boostFactor`, e.g. `0.10 × 0.5 = 0.05` speed multiplier. Natural lap-to-lap speed variance across racers already spans ±10–15%, so a 5% boost was statistically invisible and produced no measurable compression in sim.

**Fix:** Replace the proportional formula with a flat boost applied to all non-leaders whenever the gap exceeds a threshold (`gapThreshold=0.003`). The flat boost (`flatBoost=0.10`) is applied uniformly regardless of exact gap magnitude, avoiding formula complexity and ensuring the effect is always above the noise floor.

**Consequence:** Gap-proportional formulas normalized over long reference lengths (full track, full race distance) produce tiny per-frame deltas. When the signal must compete with natural variance, prefer a threshold gate + flat correction over a proportional one.

**Reference:** `client/src/screens/RaceScreen/index.jsx`, `client/src/modules/rubberBandConfig.js`. Session 2026-05-31.

---

## Lesson 111 — Decoupling corridorStart From bonusTransitionEnd Gives the P-Controller 12 Extra Seconds

**Context:** feat/race-plan-timing (2026-06-01). The Race Plan P-controller (OUTCOME phase) was gated to start at `corrStart = transitionEnd = 0.67`. This implicit coupling meant the controller never ran while the area bonus was still active and fading — the controller only began nudging racers toward their target zones after the bonus was already gone.

**Discovery:** A two-phase sim sweep (Phase 1: 41 combos step 0.10, 10 races/track; Phase 2: top 3 × 100 races/track; Dirt Oval 40r / Luger Hill 60r / Space Sprint 90r; all 60s, seed=42) showed that all top Phase 1 candidates shared `corridorStart=0.55` regardless of `bonusTransitionEnd`. Decoupling `corridorStart` from `bonusTransitionEnd` allows the controller to start at 55% (33s in a 60s race) while the bonus remains active until 75% (45s) — a 12-second overlap window where both the area bonus and the P-controller pull racers toward their target zones simultaneously.

**Result:** Zone success 52.4% → 64.5% (+12pp across all zones), stableOvt 9.95 → 13.20 (+33%). The longer OUTCOME window produced noticeably more visible position changes as racers actively jockeyed toward assigned zones rather than drifting passively through a bonus field.

**Minor trade-off:** `overlapRate` 12.7% → 13.0% (+0.3pp, 2.4% relative). The earlier controller activation causes additional lateral shuffling in the 33–45s window while racers sort into zones. Mechanically expected; acceptable given the zone gain.

**Consequence:** When a P-controller and an area bonus both point racers toward the same target, running them concurrently is better than sequentially. Sequencing them (bonus fades → controller starts) wastes time and weakens both effects.

**Reference:** `client/src/modules/racePlanner.js` (`DEFAULT_PHASE_FRACTIONS.corridorStart`, `DEFAULT_PHASE_FRACTIONS.transitionEnd`), `scripts/sim-sweep.mjs`. Session 2026-06-01.

---

## Lesson 112 — Side-View Sprites Rotate With Track Direction and Appear Upside Down on Curves

**Context:** feat/luge-new-sprite (2026-06-03). A snowboarder sprite drawn in side profile was added as a racer type. When tested on a curved track, the sprite rotated with the racer's heading, which is correct for top-down sprites but wrong for side-view sprites — on the descending half of a loop the sprite appeared upside down, and on the return curve it appeared mirrored.

**Consequence:** Only top-down (overhead) sprites work for racer types. Side-view sprites must be rejected at the design stage. Any sprite where the orientation of the figure conveys direction of travel will misbehave on curves.

**Reference:** `revert(snowboarder)` commit on feat/luge-new-sprite. Session 2026-06-03.

---

## Lesson 113 — Never Hardcode Track IDs or Track Counts — Always Derive From DEFAULT_TRACKS Source of Truth

**Context:** feat/luge-new-sprite (2026-06-03). Server migration code and test assertions hardcoded specific track IDs (e.g. `'mogcvuipw2y5'`) and counts (e.g. `DEFAULT_TRACK_COUNT = 5`). When tracks were added or retired, every hardcoded reference had to be hunted down manually, and several were missed causing test failures.

**Consequence:** Track IDs and counts must always be derived from `DEFAULT_TRACKS` (the source of truth) at runtime. Migration logic should iterate `DEFAULT_TRACKS` rather than name individual IDs. Test assertions for "all N default tracks" should use `DEFAULT_TRACKS.length`.

**Reference:** `refactor(tracks): replace raw track ID strings` commit, `server/src/routes/tracks.js`. Session 2026-06-03.

---

## Lesson 114 — Promoting a User-Created Track to a Default Track Requires a localStorage Migration Step

**Context:** feat/luge-new-sprite (2026-06-03). A user-created track was promoted to a built-in default track. The old localStorage entry (keyed by the user-generated hash ID) remained, causing the track to appear twice in the UI — once from the server default list and once from the stale localStorage entry.

**Fix:** A migration step (v2) was added that removes localStorage entries whose `name` field matches any default track name (case-insensitive). A v3 migration handles the case where the name comparison needs to be case-insensitive.

**Consequence:** Whenever a track is promoted from user-created to default, a one-time localStorage migration must be shipped alongside the promotion to remove the stale hash-ID entry.

**Reference:** `fix(storage): v2 migration`, `fix(storage): v3 migration` commits, `client/src/modules/storage/migrateStorage.js`. Session 2026-06-03.

---

## Lesson 115 — Sprite Elements Thinner Than ~4px at Source Resolution Will Not Survive Downscaling

**Context:** feat/luge-new-sprite (2026-06-03). Motorbike spritesheet had stray pixel clusters (1–2 px) that were invisible at source resolution but became detached floating artifacts after downscaling to the 40–52 px display size used in game. The artifacts survived multiply-mask tinting and appeared as colored dots disconnected from the sprite body.

**Consequence:** Before shipping a new sprite, verify at display size (not source resolution) that no element is thinner than ~4 px at source. Elements narrower than that threshold will either disappear entirely or appear as detached artifacts after anti-aliased downscaling. Fix at source before downscaling — the artifact cannot be removed post-scale.

**Reference:** `fix(motorbike)` commit series, `client/public/assets/racers/motorbike-walk.png`. Session 2026-06-03.

---

## Lesson 116 — OVERVIEW Zoom Normalization: Use referenceSpriteSize to Compute a Consistent Target Sprite Screen Size Across Different Racer Counts

**Context:** feat/luge-new-sprite (2026-06-03). OVERVIEW zoom was computed using `_overviewStateZoom` which was a fixed value independent of racer count. `computeRacerLayout` scales `displaySizeScale` based on racer count — 8 racers produced sprites ~2× larger on screen than 80 racers at the same camera zoom. The OVERVIEW therefore showed very different sprite densities depending on the number of racers.

**Fix:** `CameraDirector` stores `_referenceSpriteSize = displaySize × displaySizeScale` from the racer layout. At OVERVIEW entry, snap zoom is computed as `overviewTargetScreenPx / (referenceSpriteSize × BASE_ZOOM)`, clamped to `[overviewZoom, _overviewStateZoom × 0.8]`. This keeps the apparent sprite size consistent at ~18 px regardless of racer count.

**Consequence:** Any zoom level that must be "racer-count-independent" should derive its value from `referenceSpriteSize` rather than from a fixed config constant.

**Reference:** `CameraDirector._overviewSnapZoom`, `cameraTimingComputation.js (overviewTargetScreenPx)`, `defaults.js (overviewTargetScreenPx: 18)`. Session 2026-06-03.

---

## Lesson 117 — Adaptive Zoom Ratchet Should Stop at min(minRacersVisible, activeCount)

**Context:** feat/luge-new-sprite (2026-06-03). The adaptive zoom ratchet (LEADER_ZOOM / LEAD_CHANGE) decremented `_leaderPhaseZoomFloor` each frame when `visCount < minRacersVisible`. When `activeCount < minRacersVisible` (e.g. 5 non-finished racers with `minRacersVisible = 8`), the condition was always true and the ratchet zoomed all the way to `leaderMinZoom` even after all active racers were already visible.

**Fix:** Compute `activeCount = racers.filter(r => !r.finished).length` and use `visTarget = Math.min(minRacersVisible, activeCount)` as the stop condition. The ratchet halts as soon as all non-finished racers fit in the viewport.

**Consequence:** Any "zoom until N racers visible" ratchet must account for the case where fewer than N racers exist. The stop condition should be `min(target, totalActive)`, not a fixed target.

**Reference:** `CameraDirector._setTargets` ratchet block (~line 1818), `fix(camera): stop ratchet when all active racers are visible` commit. Session 2026-06-03.

---

## Lesson 118 — Closed Tracks Have No Path-Length Speed Normalization — Perceived Speed Scales Linearly With pathLengthPx

**Context:** feat/closed-track-speed (2026-06-03). Searound (closed, pathLengthPx=5147, worldW=3072) felt ~69% faster than standard closed tracks (~3000–3300 px). The root cause: for closed tracks, `race_baseSpeed = finishT / (REFERENCE_FPS × targetDuration × spreadFactor)` — completely independent of `pathLengthPx`. Physical world displacement per frame = `race_baseSpeed × pathLengthPx` scales linearly. `worldWidth` cancels exactly in the screen velocity formula (`cam.zoom = spriteScale / bsX`, so `screenVelocity = race_baseSpeed × pathLengthPx × spriteScale`), so only `pathLengthPx` determines perceived speed.

Open tracks already have an ssf correction (`ssf = pathLengthPx / REFERENCE_PATH_LENGTH`) applied to `finishT`, normalizing physical speed to a constant regardless of path length. Closed tracks had no equivalent.

**Fix:** Compute `closedSsf = pathLengthPx / REFERENCE_CLOSED_PATH_PX` (reference 3200 px, the mean of standard closed tracks). Apply as a multiplier to the `targetDuration` argument of `computeRaceBaseSpeed`. Side effect: race duration scales with path length — Searound's 2-lap race lasts ~97s with a 60s target, which is correct behavior for a longer-than-standard closed track.

**Consequence:** Any race engine where `race_baseSpeed` is derived from lap count and target duration (independent of track length) will produce faster-feeling races on tracks with longer paths. Always apply an ssf-style normalization if consistent visual speed across tracks is required.

**Reference:** `computeClosedTrackSsf` in `lapUtils.js`, `REFERENCE_CLOSED_PATH_PX = 3200`, `RaceScreen/index.jsx` (`closedSsf` computation). Session 2026-06-03.

---

## Lesson 119 — createReadStream Without an Error Listener Kills the Node.js Server

**Context:** feat/server-robustness (2026-06-03). After deleting a background image file while the server's in-memory track map still referenced it, a subsequent request triggered `createReadStream` on the missing file. Because no `.on('error', ...)` handler was attached, Node.js converted the unhandled stream error into an uncaught exception, killing the process. The `existsSync` guard before the call was insufficient: on Windows/Docker bind mounts, the file can disappear between `existsSync` returning `true` and `createReadStream` executing.

**Fix:** Always attach `.on('error', handler)` **before** `.pipe(res)` on any stream that is piped to an HTTP response. Include an `if (!res.headersSent)` guard inside the handler so late-firing errors (after headers are flushed) are silently absorbed rather than thrown.

**Consequence:** Any `createReadStream(...).pipe(res)` pattern without an error listener is a silent server-kill waiting to happen — especially on Windows/Docker where filesystem sync delays make the race condition reproducible in production. The EISDIR trick (create a directory at the expected file path) is a reliable way to test the error handler without mocking.

**Reference:** `server/src/routes/tracks.js` (`stream.on('error', ...)`), `server/src/routes/tracks.test.js` (EISDIR test). Session 2026-06-03.

---

## Lesson 120 — Tight-Cropping a Tall-Narrow Sprite Increases frameHeight, Shrinking the Rendered Body

**Context:** feat/sprite-crop (2026-06-03). Sprite crop spec added 15px padding on each side and squared the result. For types where `bodyHeight ≈ frameHeight` (horse: 120/128, snake: 125/128, rocket: 121/128, motorbike: 120/128, luge: 50/64), `cropSize = bodyHeight + 30` exceeded the original `frameHeight`. Since the drawn canvas box is always `displaySize × displaySize` and the body fills `bodyHeight / frameHeight` of it, a larger frame means the body occupies a smaller fraction — it appears smaller on screen despite the "tight crop."

**Fix:** Increase `displaySize` by the factor `cropSize / frameHeight_old` to restore the pre-crop rendered body size. Apply the same factor to `leaderEllipseRx/Ry` so the leader ring still fits.

**Consequence:** "Tight crop" only shrinks the frame when the body has padding in both dimensions. For sprites whose body already fills the frame in one axis, adding symmetric padding makes the frame larger in that axis. Check whether `cropSize > frameHeight_old` after computing the crop and compensate `displaySize` before committing the change.

**Reference:** `HorseRacerType.js`, `SnakeRacerType.js`, `RocketRacerType.js`, `MotorbikeRacerType.js`, `LugeRacerType.js` (displaySize increases). `scripts/audit-sprite-crops.mjs`. Session 2026-06-03. *(`scripts/crop-sprite-sheets.mjs` was the tool that performed the crop; it was DELETED on 2026-09-03, DROP-CROP-SCRIPT-1, and is recoverable at the annotated tag `archive/crop-sprite-sheets`. The pre-crop geometry it recorded is preserved in `client/public/assets/racers/CREDITS.md`.)*

---

## Lesson 121 — MAX_INVERSE_ZOOM Must Be High Enough for Future Large Closed Tracks

**Context:** feat/mountainstreet-zoom (2026-06-03). Diagnosis of small sprites on Mountainstreet revealed that the old `MAX_INVERSE_ZOOM = 5.0` cap in `CameraDirector.js` would clip `cam.zoom` on any closed track with `worldW > ~3500 px`. For a closed track with `worldW = 6144`, the formula requires `cam.zoom = spriteScale / bsX = 1.81 / (1280/6144) = 8.70` — capped to 5.0, resulting in `effZoom = 5.0 × 0.208 = 1.04` instead of the target 1.81 (sprites at 57.5% of correct size). Raised to 10.0, providing headroom up to `worldW ≈ 12800`.

Note: Mountainstreet itself has `"closed": false` and is an open track — the `MAX_INVERSE_ZOOM` cap does not apply to it (open tracks use `rawZoom = spriteScale / OPEN_TRACK_BASE_ZOOM`, independent of `worldW`). The fix protects any future large closed track.

**Fix:** `const MAX_INVERSE_ZOOM = 10.0` in `CameraDirector.js`. Threshold: open tracks are unaffected; closed tracks with `worldW > CANVAS_W × MAX_INVERSE_ZOOM / spriteScale` still hit the cap.

**Consequence:** When adding a new closed track with an unusually large `worldW`, verify that `spriteScale / bsX ≤ MAX_INVERSE_ZOOM`. If not, raise the constant and update the corresponding test.

**Reference:** `CameraDirector.js` (`MAX_INVERSE_ZOOM`), `CameraDirector.test.js` (`closed worldW=6144` test). Session 2026-06-03.

---

## Lesson 122 — Fixed Absolute speedBrakeTThreshold Is Not Calibrated to Sprite Size or Path Length

**Context:** feat/dynamic-speed-brake (2026-06-04). The original `speedBrakeTThreshold` was a fixed absolute value in track-parameter space. Because track-parameter distance is `pixelDistance / pathLengthPx`, the same threshold corresponds to very different pixel distances on tracks of different lengths. On Ice Track (luge sprite, displaySize=80, pathLengthPx=3037), the threshold of 0.013838 fired 13.1 px after sprite overlap had already begun — the brake was too late. On Space Sprint (pathLengthPx=19772), the same threshold fired 231 px before sprite contact — unnecessary drag on the entire field for most of the race.

**Fix:** Replace with a dimensionless `speedBrakeTMultiplier`. Dynamic threshold computed per pair as `(spriteWorldSizePx / pathLengthPx) × multiplier`. This fires at the same relative proximity — 1.5 sprite-widths before contact — on every track and racer type regardless of path length or sprite size. Sim validation (700 races across 5 multiplier values × 7 tracks) confirmed 1.5 passes all cutoffs with the cleanest lateral-motion scores (lowest mean zigzag and lat).

**Consequence:** Any physics threshold expressed in track-parameter space must account for the fact that `dT = 1 / pathLengthPx` in pixel space. Thresholds that feel like small dimensionless fractions are actually large pixel distances on short tracks and tiny pixel distances on long tracks. Use `spriteWorldSizePx / pathLengthPx` as the natural unit so the threshold scales correctly with both sprite size and path length.

**Reference:** `raceBehavior.js` (`dynamicBrakeT`), `defaults.js` (`speedBrakeTMultiplier: 1.500000`), `scripts/sweep-dyn-sbt.mjs`. Session 2026-06-04.

---

## Lesson 123 — Interdependent Physics Parameters Should Be Locked Out of the Dev Screen and Documented at the Source

**Context:** feat/dynamic-speed-brake (2026-06-04). The 8 core avoidance/braking parameters (`lateralForce`, `lateralDamping`, `homeForceStrength`, `homeForceReductionOnOverlap`, `avoidanceDistance`, `speedBrakeFactor`, `speedBrakeTMultiplier`, `speedBrakeYThreshold`) were exposed as individual sliders in the Dev Screen with an amber warning banner. The banner was ignored in practice and the sliders were a liability: any single-param change that "looks good" on one track can degrade fairness or motion quality on other tracks in ways that are not visible without running a sim sweep.

**Fix:** Remove the 8 sliders from the Dev Screen entirely. Keep the parameters in `defaults.js` with a full block comment documenting: the sweep methodology, current values with their date, why the params are interdependent, and exact steps to re-derive them. This makes the intended workflow (change defaults.js → run sweep → validate → commit) clear at the point where the change would be made.

**Consequence:** Physics parameters that were optimized as a group via simulation should be treated as a unit, not as individually tunable knobs. Exposing them in a UI that allows per-param changes without re-running the sweep creates a false sense of safety. Document them at the source (in the default config file) where a future developer is forced to see the constraint before changing a value.

**Reference:** `client/src/modules/storage/defaults.js` (PHYSICS PARAMETERS comment block), `docs/ARCHITECTURE.md` (Physics Parameters section), `client/src/screens/DevScreen/sections/BehaviorTuningSection.jsx`. Session 2026-06-04.

---

## Lesson 124 — E2E Tests That Assert Default Config Values Become Latent Failures When Defaults Change

**Context:** clean-state-audit (2026-06-04). `client/e2e/d11-ux-verification.spec.js` contained V1 tests (`'V1 — default homeForceStrength is 0.018'`, `'V1 — default avoidanceDistance is 0.35'`) that directly asserted the numeric default values shown in the Dev Screen UI. When the physics sweep updated the defaults (homeForceStrength 0.018 → 0.030, avoidanceDistance 0.35 → 0.18, lateralForce 0.015 → 0.0114, speedBrakeFactor 0.98 → 0.945), the vitest unit suite remained green but the Playwright E2E tests silently diverged from reality. The E2E suite is not run in CI vitest, so the stale assertions went undetected across multiple commits.

**Consequence:** E2E tests that hard-code config default values (rather than reading them from the app and checking relative behavior) are coupled to the values themselves, not to the behavior they test. When defaults change, these tests fail without anyone noticing until the E2E suite is explicitly run. This is a latent failure mode specific to Playwright specs that are excluded from the standard vitest CI run.

**Fix / Rule:** Either (a) have E2E tests read the current value from the UI and verify persistence/reset behavior relative to it rather than asserting a specific literal, or (b) derive expected defaults in the spec from the source (`DEFAULT_RACE_BEHAVIOR_CONFIG`) at import time so they always track the code. If option (b) is impractical in Playwright, document a **"run E2E suite after any defaults.js change"** requirement in CLAUDE.md or CI.

**Reference:** `client/e2e/d11-ux-verification.spec.js` (V1–V3 tests), `client/src/modules/storage/defaults.js`. Session 2026-06-04 clean-state audit.

---

## Lesson 125 — E2E Diagnosis from Static Code Analysis Is a Hypothesis, Not a Finding

**Context:** d11-ux-verification fix (2026-06-04). A static code reading of `BehaviorTuningSection.jsx` predicted 5 test deletions (labels `Home Force Strength`, `Avoidance Distance`, `Speed Brake Factor` gone) and 2 value updates (draftingBoost 1.1 → 1.04). The proposal looked thorough. The first live run proved most of it was wrong: ALL 17 tests failed, not 9, because the root cause was a single cascading error in the shared helper `openBehaviorSection` — it looked for `getByRole('button', { name: /Race Behavior/ })` but the Dev Screen button had been renamed to "Race Tuning." Every test that called this helper timed out, producing the same failure pattern as "element not found," making it look like all those controls were gone.

**Consequence:** A static code analysis that shows "label X not present in component Y" tells you only that the label is absent from that component. It does not tell you whether the test is failing for that reason or for a completely different reason (wrong helper, wrong route, wrong test structure). When a shared setup function is broken, all tests that use it cascade-fail, masquerading as individual feature removals. Only after the helper is fixed does genuine element-not-found separate from collateral failure. The live run also found two issues the code-reading missed: an InfoTooltip matching `getByLabel('Enabled')` (strict mode violation) and the reset button saying "Reset All Defaults" not "Reset Defaults."

**Fix / Rule:** Never delete E2E assertions based on a code reading alone. The workflow is:

1. Run the spec live against the running server.
2. Fix any cascading infrastructure failures first (wrong helper, wrong server, wrong route).
3. Re-run and read per-test error types: "element not found" authorizes deletion; "wrong value" authorizes update; "strict mode violation" authorizes selector fix.
4. Only apply the change that matches the live error type. Code-reading is a guide for step 2 prep, not a substitute for step 3 evidence.

**Reference:** `client/e2e/d11-ux-verification.spec.js`, `reports/clean-state-2026-06-04/05-d11-fix-proposal.md` (Verification section). Session 2026-06-04.

---

## Lesson 126 — A Green Metric Only Proves What It Measures

**Context:** feat/closed-track-overview-normalization body-sizing rebuild (2026-06-05). A 7-report investigation into visible racer stacking on Space Sprint × plane was triggered by user screenshots showing planes clearly crossing each other in a top-down orthographic view. The sim's `liteOverlapRate` reported 0% throughout — across all N values (9–80), both master and branch. This was interpreted as "no overlap" in early reports, leading to an incorrect "pulk makes it look dense" explanation (report 14) that was only corrected when the user pointed out that top-down is orthographic and density cannot be an illusion.

The actual mechanism (report 15): rubber-band (+10%) overcomes speed-brake (−5.5%) → dT → 0 during passes → 31.7 px longitudinal body overlap per pair at the crossing moment. The `liteOverlapRate` threshold fires only at ≤3.5 px center gap — physics never allows centers that close. The metric was measuring hard colocations, not rendered-body overlap.

The 91.3% fairness sweep optimized the 8 physics parameters around a metric that was blind to this class of overlap. The parameters are still valid for fairness (win-rate distribution) but the overlap behavior they produce was not what the metric described.

**Insight:** A simulation metric reporting "0%" proves only that the specific condition it checks did not occur, not that the phenomenon you care about is absent. When a sweep validates behavior, confirm the metric actually measures the behavior you care about — not a proxy that differs from it by an order of magnitude (3.5 px threshold vs 31.7 px actual body overlap).

**Consequence:** Before relying on a sim metric for a "no overlap" claim: trace the exact threshold calculation and compare it to the actual rendered body extents. For body overlap: the threshold must use scaled body sizes (bodyNarrow_ref × aspect_ratio), not raw `displaySize × bodyFill`. A metric based on unscaled values can silently miss all real-scale overlap while reporting green.

**Reference:** `reports/closed-track-overview/reports 11–15`, particularly `14-full-diagnosis.md §Q8` and `15-topdown-overlap.md`. Session 2026-06-05.

---

## Lesson 127 — Closed-Track t-Normalization Must Use One Lap, Not Total Race Distance

**Context:** Phase-1 metrics work (2026-06-05). The honest overlap metric was added with closed-track wrapping via `Math.min(rawDt % finishT, finishT - (rawDt % finishT))`. For closed tracks, `finishT` is the total t-distance for the entire race (e.g. 4.189 for Dirt Oval × horse × 60s — roughly 4 laps). Two racers one lap apart have `rawDt = 1.0`. With `finishT = 4.189` as modulus: `1.0 % 4.189 = 1.0` → `dT_px = 1.0 × 3245 = 3245 px` — far above any body threshold. The metric read 0% on all closed tracks despite computing non-zero pair-frame totals.

The browser's own `tPos(t) = ((t % 1) + 1) % 1` uses modulo-1 (one lap = 1.0 t-unit). The correct wrapping for the sim is the same: normalize to the position within the current lap, then take the shorter arc. With mod-1, two racers at the seam (one at t=0.02, another at t=0.98) correctly show dT_px = 0.04 × pathLengthPx instead of 0.96 × pathLengthPx.

**Fix:**

```javascript
// WRONG — finishT is multiple laps, not one
const wrapDt = Math.min(rawDt % finishT, finishT - (rawDt % finishT));

// CORRECT — one lap = 1.0 t-unit, matching the browser's tPos()
const tPosA = ((ra.t % 1) + 1) % 1;
const tPosB = ((rb.t % 1) + 1) % 1;
const dtNorm = Math.abs(tPosA - tPosB);
dT_px = Math.min(dtNorm, 1 - dtNorm) * pathLengthPx;
```

**Consequence:** Any sim operation that computes "distance on a closed track" must use modulo-1 (the physical lap unit), not modulo-finishT (the race-completion unit). These are different when finishT > 1.0. The rule of thumb: if you are asking "how far apart are these two racers on the track right now?", use `tPos`; if you are asking "has this racer finished the race?", use `finishT`.

**Reference:** `scripts/sim-fairness.mjs` (honestOverlapRate closed-track wrapping). Session 2026-06-05.

---

## Lesson 128 — A Plausible Mechanism Still Requires Direct Measurement Before Attribution

**Context:** Phase-1 metrics work (2026-06-05). After the closed-track wrapping fix, the honest overlap metric correctly registered 5–8% overlap on short closed ovals (Dirt Oval, Garden Path). The most intuitive explanation was "lapping" — faster racers completing extra laps and physically crossing slower ones from behind. The mechanism is physically possible and the new wrapping code would detect it. The explanation was stated confidently in report 02 without measuring whether lapping actually occurred.

Report 03 added direct measurement: `maxRealSpread` (maximum t-gap between leading and trailing racer, in laps) and `honestSameLapFraction`/`honestCrossLapFraction` (split of overlap events by whether |Δt| ≥ 1.0). Result across 200 races: `maxRealSpread` = 0.215–0.548 laps (never reaches 1.0), `crossLap` = 0.0% in all cases. Lapping does not occur in 60s homogeneous races. The overlap is same-lap pack crowding on short tracks.

**The error pattern:** A new metric started detecting something (overlap on closed tracks). An explanation was proposed (lapping) that (a) matched the code path that could detect it and (b) sounded plausible. But "the metric could detect lapping" ≠ "lapping is occurring." Attribution required a separate measurement. Without it, the fix that was actually correct (closed-track crowding on short perimeters) was obscured by a wrong causal story.

**Consequence:** When a metric starts registering a new signal, resist immediately attributing it to the most salient mechanism. Always add a direct measurement that can distinguish between plausible mechanisms before stating which one is active. In the sim: `maxRealSpread` takes 5 lines to add and directly answers "did lapping happen?" — far cheaper than a wrong explanation that propagates into reports and docs.

**Reference:** `reports/phase1-metrics/02-gap-close-results.md` (lapping hypothesis stated), `reports/phase1-metrics/03-n50-lapping-confirmation.md` (hypothesis falsified). Session 2026-06-05.

---

## Lesson 129 — Physics Must Measure the World That Is Drawn

**Context:** Scale cleanup, `feat/open-track-overlap`, 2026-06-07. Physics was computing avoidance forces in a 449 px world while the screen drew 300 px (Space Sprint). Body-overlap thresholds used 34 px instead of the 28.5 px actually rendered. Racer overlap stayed flat through many behavior improvements; the sim metric showed no improvement through Stages A–C, even after correct avoidance logic was added.

**The root cause:** Three separate sources of truth had each silently drifted to wrong values:

- Track width: `getActualTrackWidth()` returned 449 px (spline envelope estimate) while the true physical lane width was 300 px (stored as `track.width` by the Track Editor).
- Body width: `physicalSpriteSize × bodyFillX` used the frame-scale physics sprite size × a fill fraction, not the actual drawn body width from `computeBodyNarrowRef`.
- Lateral conversion: raw `physicalY × trackWidth` missed the factor-of-2 baked into `EditorShape.getPosition` (which uses `physicalY / 2`).

Each error was invisible alone, but together they meant the physics thought the track was 50% wider, the bodies 19% larger, and lateral distances 2× larger than reality. A racer could overlap visually before any avoidance check fired.

**Insight:** Physics that operates on different numbers than the renderer will produce behavior that looks wrong in the browser regardless of how correct the algorithm is. The invariant is: **every distance the physics uses must be the same distance the renderer draws**. Read known stored values, don't recompute them. "Measured at runtime" is not better than "stored at save time" when the measurement can drift.

**Consequence:** When a behavior metric is flat despite multiple algorithm improvements: check the foundation. Verify that trackWidth, spriteSize, and body dimensions in physics match what appears on screen. Add explicit checkpoints (A–H pattern: compute expected values from source, verify sim prints them) before concluding that algorithm changes are not working.

**Reference:** `reports/open-track-overlap/28-scale-audit.md` through `34-scale-build.md`. `docs/ARCHITECTURE.md` § Scale & Size. Session 2026-06-07.

---

## Lesson 130 — Read Known Values; Don't Recompute Them

**Context:** Scale cleanup, 2026-06-07. Three width sources diverged: `getActualTrackWidth()` (spline estimate, 449 px), `track.width` (Track Editor stored value, 300 px), `track._centerWidth` (internal). The Track Editor already knew the correct value and stored it. The physics had to call a runtime method instead of reading the stored value, because nobody added the `??` fallback to make the stored value the primary source.

**The pattern:** A computed fallback (`getActualTrackWidth()`) became the primary path because the stored value was never plumbed through. Callers kept calling the fallback even after the stored value was available.

**Insight:** When a known, stable value (track physical width, sprite display size) exists in persisted data, read it directly. A runtime estimate of a value that is already known exactly is worse, not better — it can drift, change with resampling density, and give different answers on different hardware. The right pattern: `primaryValue ?? runtimeFallback`, where the fallback is only for legacy data that predates the stored field.

**Consequence:** Before adding a runtime computation for a physical property, check whether the property is already stored in the data model. If it is, route the code to read it. If it isn't, add it to the model and write it at the authoring step, not at runtime.

---

## Lesson 131 — One Source of Truth Per Concept; Honest Names

**Context:** Scale cleanup, 2026-06-07. `honestBodyWidthPx` was actually `physicalSpriteSize × bodyFillX` — the physics sprite size (calibrated to row layout, not visual appearance) multiplied by a fill fraction. It was neither honest nor a body width. `geometricTrackWidthPx` was an overestimating spline measurement. `spriteWorldSizePx` was the full frame envelope, not the "sprite world size." `referenceSpriteSize` was actually `bodyNarrow` — the drawn body width used for camera calibration.

Each name carried the wrong mental model into every reader of that code. Copilot's initial "Copilot gaps" report identified 4 bugs — every one of them was a mismatch between what a name implied and what the code actually used.

**Insight:** A misleading name is a latent bug magnet. When a concept has one true source, give it a name that describes the source, not the computation path that used to produce it. `drawnBodyWidthPx` (what is drawn) is unambiguous; `honestBodyWidthPx` is a self-refutation (if you need "honest" in the name, the previous version was lying). The name must make violations obvious: any code doing `frameSizePx × bodyFill` for body-overlap clearance is visibly wrong because `frameSizePx` is the frame, not the body.

**Consequence:** When naming a physics quantity, ask: does the name describe the concept or the implementation path? If a reader could compute the wrong value and still think the name fits, the name is wrong. For SOT fields, include the unit (Px) and the concept (drawn, frame, track) in the name.

---

## Lesson 132 — The Entry Gate Must Be Wider Than Every Inner Check

**Context:** feat/open-track-overlap (2026-06-07). The avoidance gate was built with body-based thresholds (~37px), but the speed brake ran inside the gate and had a wider zone (~60px). Result: pairs at 37–60px never reached the speed brake. Free-lane also ran inside the gate with the same body dimensions, making gate = inner check → gate was irrelevant (never filtered anything the inner checks didn't already handle identically).

**The pattern:** A multi-stage pair loop where later stages only run if an outer condition passes — the outer gate must be wider than any stage's activation zone. If the outer gate is tighter, it silently cuts off inner stages.

**Insight:** Before adding a new pair-loop stage, explicitly check: what is the widest zone among all stages? The entry gate must be ≥ that zone. In this case the speed brake's 60px zone was the widest; the gate had to be moved outside it or eliminated as the guard.

**Consequence:** When designing pair-loop stages: (1) enumerate all zones; (2) set entry guard = max(all zones); (3) any stage whose zone is ≤ entry guard can safely live inside it; any stage with a wider zone must run before the guard.

**Reference:** `reports/open-track-overlap/39-geometric-gate-build.md` §corrections. Session 2026-06-07.

---

## Lesson 133 — Contact Distance = Sum of Half-Sizes (Not Max)

**Context:** feat/open-track-overlap (2026-06-07). The initial avoidance gate used `max(bodyWidthA, bodyWidthB)` as the lateral contact distance. For a dragon (28.5px) and a rocket (14px) pair, this gives 14.25px — but the bodies actually touch at `14.25 + 7 = 21.25px` (when the rocket's edge meets the dragon's edge). The max formula fired too late for mixed-size pairs.

**The geometric fact:** Two bodies A and B touch at a center-to-center distance equal to the sum of their half-widths (half-lengths). It is never a single body's half-size. The max formula is only correct when both bodies are the same size.

**Insight:** Any proximity or clearance threshold based on body size must use `hwA + hwB` (sum of half-widths). Using a single body's half-size (max, min, or either) gives the wrong answer for all mixed-size pairs. This is the standard physics collision distance formula — it is not a heuristic.

**Consequence:** `contactWidth = hwA + hwB`, `contactLength = hlA + hlB`. This applies to avoidance gates, free-lane overlap checks, speed-brake zones, and any other pair-proximity threshold. If you see `max(bodyA, bodyB) / 2` being used as a contact distance, it is wrong for mixed-size pairs.

**Reference:** `reports/open-track-overlap/39-geometric-gate-build.md` §pairContact helper. Session 2026-06-07.

---

## Lesson 134 — Fairness Must Be Measured with the Production Fairness Mechanism

**Context:** feat/open-track-overlap (2026-06-07). Three combos "failed" in the sim (Front-Bias), but the sim was run with Race Plan OFF (Baseline mode). In the production game, the Race Plan is always ON. Baseline mode is structurally biased: Row 0 always starts closest to the finish line and the avoidance system fires more for back rows — no mechanism compensates either effect. The "failures" were not regressions; they were measuring something the game never ships.

**The error:** "Let me check the baseline first" used the wrong baseline. Baseline mode = no fairness mechanism. Production mode = Race Plan ON, bonusMult=2.0.

**Insight:** A fairness measurement is only valid if it measures the system in the configuration the end user experiences. Any deviation from production configuration (Race Plan OFF, wrong bonusMult, wrong racer count) measures a different system. The result cannot be attributed to the feature being tested.

**Consequence:** Sim fairness sweeps must always use `--race-plan=true --bonusMult=2.0` (the stored default). Baseline mode is valid only for diagnosing whether a specific mechanism is contributing — it must never be cited as "the fairness result" for production behavior. Add `--race-plan=true` as the first flag in every sweep command template.

**Reference:** `reports/open-track-overlap/40-frontbias-diag.md`. Session 2026-06-07.

---

## Lesson 135 — Tests Must Be Re-Derived from the New Formula, Not Forced Green

**Context:** feat/open-track-overlap (2026-06-07). The speed-brake test "dynamic threshold scales with sprite size and path length" was written against the old frame-based formula (`frameSizePx × 1.5 / pathLength`). When the formula changed to body-based (`bodyContactLength × 1.5 / pathLength`), the test was updated by changing the `leader.t` values to values that made the test pass — but without re-deriving why those values were correct.

**The distinction:** "Force-green" = pick inputs that make assertions pass. "Re-derive" = compute what the correct threshold is under the new formula, then pick test inputs that bracket that threshold. Force-green produces a test that documents no invariant; re-derived produces a test that guards the exact formula.

**Insight:** When a formula changes, the test inputs must change to match the new formula's threshold — not to match the old test's pass/fail structure. Write the derivation as a comment in the test so the next maintainer understands which formula produced those specific numbers.

**Consequence:** On every physics formula change: (1) compute the new threshold from scratch in a comment; (2) pick `inside` and `outside` values that bracket the threshold; (3) never copy old values and adjust until the test passes.

**Reference:** `reports/open-track-overlap/43-speedbrake-body-fix.md` §Tests. Session 2026-06-08.

---

## Lesson 136 — Speed-Brake Lateral Is a Same-Lane Filter, Never a Brake Driver

**Context:** feat/open-track-overlap (2026-06-08, report 45). The speed-brake's lateral condition `Math.abs(dY) < speedBrakeYThreshold` was a normalized track-fraction (0.18 → 27px on a 300px track). It was too wide for slim racers (rocket body 14px → braked for racers in adjacent lanes 13px away) and too narrow for some wide-body racers on narrow tracks. An attempt to fix it with `contactWidth × 1.5` used the wrong multiplier and saturated wide-body racers on narrow tracks (luge p=0.057→0.004).

**The concept:** The lateral condition is not a "zone size" — it does not need lead time. It answers one binary question: "If neither racer changes lanes, will these bodies collide laterally?" The answer is yes iff the center-to-center lateral distance < sum of half-widths (= `contactWidth`). Lead-time expansion (`× 1.5`) is a longitudinal concept only — it gives the trailer time to slow down before a longitudinal collision.

**Insight:** There are two separate concepts in the speed-brake condition: (a) longitudinal lead-time zone (needs a multiplier > 1 so the brake fires before contact); (b) lateral same-lane filter (binary, no multiplier — either you're in the same lane or you're not). Conflating them by applying `speedBrakeTMultiplier` to both axes was the error. For (b), `contactWidth × 1.0` is geometrically exact.

**Consequence:** Speed-brake lateral threshold = `pxToPhysicalY(contactWidth, trackWidth)` (no multiplier). Speed-brake longitudinal threshold = `(contactLength / pathLength) × speedBrakeTMultiplier` (multiplier gives lead time). Never apply a lead-time multiplier to a same-lane filter.

**Reference:** `reports/open-track-overlap/44-speedbrake-lateral-concept.md`, `reports/open-track-overlap/45-speedbrake-lateral-fix.md`. Session 2026-06-08.

---

## Lesson 137 — "Loads but Doesn't Render" Is a Geometry Bug, Not a Loading Bug

**Context:** D6b (2026-06-15). A user-created server racer showed only fallback dots, then nothing, plus a "wild" jittering track. Many rounds chased the load/cache path (warm-up, blob loader, cache keys). Runtime logs proved the sprite fully loaded and 20 coat variants were cached — yet no sprite ever drew.

**The error:** Treating "no sprite on screen" as evidence the sprite hadn't loaded. The load path was instrumented repeatedly while the actual fault sat downstream in the geometry math.

**Insight:** When an asset demonstrably loads (logs/network confirm it) but still doesn't appear, the bug is in the consuming/geometry path, not the loader. The real cause here: user racers lacked `bodyFillX`/`bodyFillY` → `Math.min(undefined,undefined)=NaN` → `drawImage` ran with NaN dimensions (draws nothing) AND RaceScreen `bodyFillNarrow=NaN` propagated into `displaySizeScale`/camera/behavior (the wild track). One missing numeric field produced two unrelated-looking symptoms.

**Consequence:** For "loads but doesn't render," inspect the geometry math (scale, width/height, drawImage args) BEFORE re-investigating loading/caching. Suspect a single NaN when a blank draw and a layout/camera instability appear together — they often share one root cause.

**Reference:** Session 2026-06-15. Tag `backup/phaseD-d6b-complete` (584561f). `SpriteRacerType.js`, `RaceScreen/index.jsx`.

---

## Lesson 138 — NaN Defeats Nullish Fallbacks; Guard Numeric Geometry with Number.isFinite

**Context:** D6b (2026-06-15), same bug. Several geometry nodes used `value ?? fallback` (raceBehavior, rowLayout) expecting to catch bad data; the rowLayout fallback itself recomputed to NaN.

**The distinction:** `??` and `||` catch `null`/`undefined`/falsy — they do NOT catch `NaN` (`NaN ?? 5` → `NaN`). Once a `Math` operation has produced NaN, nullish defaults downstream are useless.

**Insight:** Numeric pipelines need finiteness guards, not nullish guards. `Number.isFinite(x)` is the only reliable check; defaulting object fields with `??=` helps only if it runs BEFORE any arithmetic, so the operation never sees `undefined`.

**Consequence:** At every numeric boundary feeding camera/physics/draw, clamp with `Number.isFinite(x) ? x : fallback` (and `> 0` where required). Default required numeric config fields at construction time. Never rely on `??` to sanitize a value that could be NaN.

**Reference:** Session 2026-06-15. `SpriteRacerType.js` (scale/bodyFillNarrow guard), `RaceScreen/index.jsx`, `rowLayout.js`, `raceBehavior.js`.

---

## Lesson 139 — A New Data Source Must Satisfy Every Invariant the Old Code Path Guaranteed

**Context:** D6b (2026-06-15). Built-in racers are code classes with measured `bodyFillX`/`bodyFillY` baked in. Migrating user racers to server-stored configs introduced a source that never carried those fields (editor didn't send, server didn't persist, constructor didn't default them). The geometry math had only ever run with built-ins, so it had never been exercised with the fields missing. 2956 green tests missed it — no fixture rendered a user racer in-race.

**Insight:** Replacing a code-defined source (which implicitly guarantees a complete shape) with a data-defined source (configs from disk/network) silently drops invariants the code path took for granted. Partial constructor defaults are not enough; the new source must explicitly produce or validate every field the old path guaranteed. (See also Lesson 1: green tests don't prove the consuming path.)

**Consequence:** When migrating code→data: (1) enumerate the fields the code path guaranteed; (2) produce them in the new path the same way the originals were derived (here: measure the body bounding box at creation, like the built-ins were measured); (3) persist them; (4) keep a finite construction-time default as a backstop for old records; (5) add a fixture that drives the new source through the FULL consuming path, not just CRUD.

**Reference:** Session 2026-06-15. `canvasUtils.measureBodyFill`, `RacerEditor.jsx`, `server/src/routes/racers.js`, `SpriteRacerType.js`.

---

## Lesson 140 — Don't Add Exports to Broadly-Mocked Modules; Isolate Shared Helpers

**Context:** D6b (2026-06-15). Duplicated warm-up logic was consolidated into one shared `ensureRacerTypeWarm` and placed in `spriteTinter.js` — a module mocked by 29 test files. Adding the export forced editing all 29 mock factories (Vitest strict-checks named imports against the mock factory), a fragile, noisy cascade; any future export there would re-break them.

**Insight:** A module's "mock blast radius" = how many test files mock it. Adding an export to a widely-mocked module multiplies maintenance cost and fragility. A dedicated, narrowly-imported module isolates that cost.

**Consequence:** Put a newly-extracted shared helper in its own small module imported only by its real consumers (here `racerWarmup.js` — blast radius 29→3). Before adding an export to an existing module, check how many tests mock it; if many, extract instead.

**Reference:** Session 2026-06-15. `racerWarmup.js`, `spriteTinter.js`, `SpriteRacerType.js`, `index.js`.

---

## Lesson 141 — CI Is More Than Tests; Reproduce the Full Pipeline Locally

**Context:** D6b (2026-06-15). Commits were pushed with local tests green, but GitHub CI went red. The CI client job runs four steps: `lint`, `format:check`, `test:coverage`, and `npm audit --audit-level=high`. The failure was a newly-published vite HIGH advisory — no code change involved.

**Insight:** "Tests pass" ≠ "CI passes." Lint, format, and the security-audit gate fail independently of tests. `npm audit` queries the live advisory database, so it can redden CI on ANY commit at any time, unrelated to the diff.

**Consequence:** Before pushing, run the exact CI steps locally: `npm run lint`, `npm run format:check`, `npm run test:coverage`, `npm audit --audit-level=high`. Treat an audit-only red as routine maintenance — a separate `chore(deps): npm audit fix` commit (verify patch-level bumps, re-run all four steps), not a code investigation.

**Reference:** Session 2026-06-15. `.github/workflows/ci.yml`. Fix commit `e4d7c1d` (vite 8.0.10→8.0.16).

---

## Lesson 142 — HEAD Inherits the GET Role Policy (Framework-Synthesized Methods Bypass Method-Listed Gates)

**Context:** D7 (2026-06-16). `requireAdmin`/`requiredRole` matched only explicitly-listed methods. Express auto-routes HEAD→GET, so an operator HEAD on an admin GET route (export-seed, `/api/users`) returned 200 instead of 403 — body suppressed by HttpOnly so no data leak, but the auth gate itself was bypassed. Systemic, not endpoint-specific.

**Insight:** A gate keyed on an explicit method list misses methods the framework synthesizes (HEAD from GET; sometimes OPTIONS). The policy lookup must resolve the synthesized method to its source method before checking the role.

**Consequence:** Resolve the policy method once at a shared lookup (`policyMethod`: HEAD→GET) used by BOTH `requiredRole` and `requireAdmin`. Test admin GET routes with HEAD, not only GET.

**Reference:** Session 2026-06-16. `guards.js`. Fix commit `e1ac1f2`.

---

## Lesson 143 — Verify "Stutter" Against the Prod Build First; CSS filter Over an Animating Canvas Forces Per-Frame Recomposite

**Context:** 2026-06-16. Reported race stutter; the per-frame compute path was unchanged since `v-camera-perf-complete`.

**Insight:** The dev build stutters structurally (unminified, React dev mode, StrictMode double-render) — not a shipping problem. Separately, a CSS `filter: drop-shadow` on a DOM layer sitting over a canvas that repaints every frame forces the compositor to re-composite that layer every frame.

**Consequence:** Always reproduce perf complaints in the prod build (`npm run build` + `npm run preview`, via `localhost`) before chasing a regression. For a static overlay over an animating canvas, add `will-change: transform` (or drop the `filter`) to isolate the layer.

**Reference:** Session 2026-06-16. `BrandLogoOverlay.css`. Fix commit `5cc2b9f`.

---

## Lesson 144 — Never Blanket `git add -A` When the Working Tree Carries Loose Data/Runtime Changes

**Context:** Tracks refactor step 2 (2026-06-16). `git add -A` swept three locally-mutated default seed files (brand/group/ice-track) into the cleanup commit — files deliberately left uncommitted. Caught by diff verification; needed a restore commit.

**Insight:** `-A` stages everything, including runtime artifacts and intentionally-uncommitted local edits — acute when app/tests write into the same tree as tracked data (no DATA_DIR separation).

**Consequence:** In commit steps, stage specific paths (`git add <path>`) or inspect `git status --porcelain` first. Use `-A` only when the tree provably holds only the intended changes.

**Reference:** Session 2026-06-16. Sweep in `d5b9d57`, restore in `55f9137`.

---

## Lesson 145 — Removing a localStorage Layer: Protect the Real Invariant; Plan the Test-Fixture Fallout

**Context:** Tracks "server-only" refactor (2026-06-16). Removed the localStorage "local track" layer (migrations, module IIFEs, `KEYS.TRACKS`, `DEFAULT_TRACKS`).

**Insight:** The risk was not the deletions but an invariant hidden in the same module — the server-track cache (eager geometry + background) IS the offline mechanism and had to stay untouched. Also a prod constant (`DEFAULT_TRACKS`) was still used by ~7 tests as a fixture; removing it without rehoming the fixture reddens CI.

**Consequence:** Before deleting a storage layer, name the invariant the old path guaranteed (here: offline race-start from cache) and protect it explicitly; inventory test-only consumers of any removed prod constant and move them to a fixture.

**Reference:** Session 2026-06-16. `trackLoader.js` cache, `sampleTracks.js` fixture. Commits `3d772bf`, `55f9137`.

---

## Lesson 146 — When Converting a Clock, Audit Every Subtraction in the Old Unit, Not Just the One You Changed

**Context:** C0 controller-on-closed, feat/race-action (commit 712f334, 2026-06-20). The phase clock was converted from elapsed-time (elapsedMs) to leader-track-progress (raceProgress = leaderT / finishT) so the Race Plan controller could run on closed tracks. The conversion at the phase-selection site was correct. But the areaBonus fade duration still anchored on a millisecond subtraction (elapsedMs - transEnd). Once the trigger was progress-based but the anchor stayed ms-based, the subtraction could go negative when the leader was ahead of the time schedule → easeInOutCubic with unclamped t < 0 evaluates 4t³ (negative, unbounded) → areaBonusMult exploded to 5×–556× or went negative → racers teleported/reversed. The phase-selection conversion looked complete; the bug was in a different ms-subtraction nobody re-examined.

**Insight:** Replacing one time base with another is not a single-site edit. Every expression that subtracts or compares in the old unit is a conversion site, including ones that look unrelated to the change (a fade duration is conceptually separate from phase selection, but both read the clock). A partial conversion leaves a mixed-unit expression that is silently wrong only in the regime where the two clocks diverge (here: leader ahead of schedule), so it passes casual testing.

**Consequence:** When converting a clock or unit, grep for every use of the old variable and classify each as "converted," "intentionally still old," or "missed." Add a guard (Math.max(0, …)) on any easing input that could go negative after the change. The bug was found by the sim (empirical 33.6× → 1.03× after fix), not by code review — PC and Copilot both missed it reading the diff, because the offending subtraction was outside the lines that changed.

**Reference:** client/src/screens/RaceScreen/index.jsx (raceProgress dual-clock, ~line 869); commits 14f3c6f (C0), 712f334 (C0-fix). Session 2026-06-20.

---

## Lesson 147 — Raw p-Values from a Multi-Combo Sweep Are Meaningless Without Correction

**Context:** C0 fairness sweep, feat/race-action (2026-06-20). A 76-combo fairness sweep (track × racer × duration) raw-flagged 3 combos at p 0.005–0.010. Read individually each looked like a real start-position bias. But at 76 independent tests with α = 0.05, the expected number of false positives is ~3.8 — so 3 flags is fewer than chance predicts. None survived Holm, Bonferroni, or Benjamini-Hochberg correction. The flags also scattered across unrelated tracks/racers and non-front rows (8/3/6), and direction flipped within the same track×racer by duration — the fingerprint of seed noise, not a structural effect.

**Insight:** A single p < 0.05 means "unlikely under the null for one test." Run 76 tests and you will see several such values even when every null is true. The raw p-value is not the probability the effect is real; without a multiple-testing correction it tells you almost nothing in a sweep. Two independent checks separate noise from signal: (1) a family-wise or FDR correction (Holm/Bonferroni/BH), and (2) a pattern check — do the flags cluster on a coherent mechanism (e.g. front rows, one track) or scatter randomly and flip direction across conditions?

**Consequence:** Any sweep that tests many combos must report corrected significance, not raw p-values, and must state the expected false-positive count (n_tests × α) alongside the observed flag count. A flag count at or below the expected false-positive rate is consistent with no real effect. Before declaring a fairness regression, require both: survives correction AND shows a consistent, mechanism-plausible pattern.

**Reference:** scripts/sim-fairness.mjs (Holm correction in fairness metrics, commit bfe5f08). Session 2026-06-20.

---

## Lesson 148 — An Aggregate Attribution Does Not Transfer to a Subset Without Separate Measurement

**Context:** Overlap-on-closed investigation, feat/race-action (2026-06-20). An earlier controller-on/off comparison measured the controller adding ~24% to total overlap (+1.15pp; Ø 4.80% with vs 3.65% without). This was used to argue the long, stuck locks were also mostly pre-existing. The owner caught the contradiction: that 24% was the aggregate over all locks, which are 68.8% short (<90fr). A length-bucketed on/off run told a different story: long locks (>300fr) are 81% pre-existing (geometry/wedging), but the "ride to the finish together" pairs are +230% controller-driven (6.1 → 20.0 per race). The aggregate number was true and the subset claim derived from it was false.

**Insight:** "The controller adds X% to the total" describes a weighted average dominated by the most common category. It says nothing about a rare subset (long locks, finish-bundling) unless that subset is measured separately. Carrying an aggregate attribution onto a specific sub-phenomenon is a category error — the same mechanism can be a minor contributor overall and the dominant contributor within one slice.

**Consequence:** When attributing a sub-phenomenon (long locks, end-of-race behavior) to a cause, measure that subset directly — do not reuse an aggregate statistic. Bucket the metric (here: by lock-length and by end-reason) before assigning cause. Related to Lesson 128, but the failure is narrower: not "plausible vs measured," but "aggregate ≠ subset."

**Reference:** Lock diagnosis scripts/diag-locks.mjs (length-bucketed, end-reason tagged); controller AN/AUS comparison, 60s default racers. Session 2026-06-20.

---

## Lesson 149 — One Shared Read-Value Prevents Divergence Better Than Capping in Two Places

**Context:** Overlap Weg 1, feat/race-action (commit f7c295f, 2026-06-20). The rule "cap controller over-drive when a racer is braking and laterally wedged" had to clamp trajectoryMult × areaBonusMult × rubberBandMult to ≤ 1.0. That product feeds two sites: the brake-match denominator (trailerDenom, raceBehavior.js) and the t-update (r.t += … × drive, index.jsx + sim). Capping each site independently would let brake-match compute its cap from the uncapped drive while the actual advance used the capped one — a silent divergence where the two systems disagree about how fast the racer is going.

**Insight:** When the same derived value is consumed at more than one site, the safe design is a single function both sites call, not the same transformation written twice. Two parallel clamps are two things that can drift apart under future edits; one shared reader cannot. The consistency is structural, not a matter of remembering to keep both copies in sync.

**Consequence:** Export one accessor (effectiveDriveMult(r)) and route every consumer through it — the brake-match denominator, the game t-update, the sim t-update, and the camera lookahead (r.vt) all read the identical capped value. Game/sim parity then follows automatically because both call the same function with the same one-frame-lag inputs. Never apply the same cap or transform at two call sites.

**Reference:** client/src/modules/raceBehavior.js:123 (effectiveDriveMult), read at raceBehavior.js:560-561 (brake-match), index.jsx t-update, sim-fairness.mjs t-update. Commit f7c295f. Session 2026-06-20.

---

## Lesson 150 — Re-Evaluate a Historical Safety Decision When Its Preconditions Have Changed

**Context:** Overlap-on-closed, feat/race-action (2026-06-20). The strict brake-match cap (leaderBrake) is deliberately weakened to 1.0 on closed tracks (raceBehavior.js ~562) because, per Report 14, the tighter cap caused chain-lock for beetle/boarder on Dirt Oval. Git history shows that weakening was committed 2026-06-05, when the controller existed (2026-05-20) but did NOT run on closed tracks — the closed controller (C0) was only introduced this session. The fairness concern that justified the weakening was decided in a world where nothing self-corrected a racer held back by the brake; today the C0 controller's P-regulator boosts a fallen-behind racer once it is free.

**Insight:** A safety mitigation encodes the conditions present when it was written. When the surrounding system changes (here: a self-correcting controller now runs on the same tracks), the original justification may no longer hold — but the mitigation stays in the code as if it were timeless. "We weakened this for safety" is not a permanent verdict; it is a decision relative to a context that can expire.

**Consequence:** When a code comment cites a past regression as the reason for a conservative setting, check whether the preconditions still hold before treating the setting as immovable. If the context has changed, the correct next step is a measured trial under today's conditions (re-enable the strict path, sweep with the original regression's canaries — here beetle/boarder × Dirt Oval — plus chain-lock metrics), not blind trust in either the old caution or the new optimism. Measure, don't assume the old reason still applies.

**Reference:** client/src/modules/raceBehavior.js ~562 (leaderBrake closed weakening + Report 14 comment); brake-match commit 1f43ee9 (2026-06-05) vs controller commit 596a1b2 (2026-05-20). Session 2026-06-20.

---

## Lesson 151 — A Stale Handoff Document Misleads More Than No Handoff At All

**Context:** feat/race-action, 2026-06-30. The handoff notes stated HEAD was `b06d946` and listed the "§4a soft-steering asymmetric fix" as an open next step. In reality `aef203a` (the §4a fix) was already committed, verified, and on `origin/feat/race-action` — `b06d946` was its parent. A session nearly re-derived a full implementation spec for an already-solved bug; it was caught only by a read-only origin-fetch sanity check before the spec was written. The same pattern recurred twice the same session: a controller-on-closed phase-timing "known issue" turned out already correct (the phase clock is leader-progress based, `14f3c6f` / tag `backup/c0-controller-closed-20jun`, so it is immune to `closedSsf`), and a long-flagged sim-determinism blocker turned out resolved.

**Insight:** A handoff doc is trusted precisely because it claims to be current — so a stale one is more dangerous than none, because it directs confident action toward work that no longer exists. The author's own recollection is not a substitute for the repository state; "what I remember being open" and "what `git log`/origin actually show" diverge silently once commits land without the doc being updated in the same breath.

**Consequence:** Update a living handoff in the **same session as the commit it describes**, never batched at session end. And any reader — including the doc's own author — must re-verify each load-bearing claim (HEAD hash, "open" status of a named fix) against `origin` before acting on it. A `git fetch` + `git log --oneline origin/<branch>` + `git tag --contains` costs seconds; re-deriving a spec for a shipped fix costs a session.

**Reference:** §4a fix `aef203a` (already on origin while the handoff claimed it open at HEAD `b06d946`); controller-on-closed `14f3c6f` + tag `backup/c0-controller-closed-20jun`. Session 2026-06-30, feat/race-action HEAD `9cfa953`.

---

## Lesson 152 — Before Spec'ing a Fix for a "Known Open Bug," Prove It Still Exists With a Read-Only Review

**Context:** feat/race-action, 2026-06-30. Three documented/suspected bugs this session — the §4a asymmetry, the controller-on-closed phase timing, and a sim-determinism blocker — were each scheduled for an implementation spec. A cheap read-only design review run first found that all three were already fixed or never real: §4a was already asymmetric in source (`aef203a`), the controller already used a `closedSsf`-immune leader-progress clock, and determinism was no longer reproducible.

**Insight:** The expensive failure mode is not writing a wrong fix; it is writing a correct fix for a bug that is no longer there. The cost asymmetry is stark — a read-only review that reads the current source and confirms the defect is minutes of work, while an unnecessary implementation spec plus its review, commit, and verification is most of a session. The review also produces the artifact (line numbers, current behavior) that a real fix would have needed anyway, so it is never wasted even when the bug _is_ real.

**Consequence:** Gate every "fix a known bug" task behind a read-only review that reproduces or re-locates the defect in the current source first. Treat a documented bug as a hypothesis to test, not a fact to act on — especially when the documentation predates recent merges.

**Reference:** Read-only reviews of §4a (`aef203a`), controller phase-timing (`14f3c6f`), and determinism, all 2026-06-30. Pattern companion to [Lesson 151]. Session 2026-06-30.

---

## Lesson 153 — One Hardcoded-Default Mismatch Is a Signal to Audit the Whole File, Not Patch the One Field

**Context:** feat/race-action, 2026-06-30. `sim-fairness.mjs` hardcoded its CLI default for `corridorEnd` at 0.95 while the shared `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanCorridorEnd` was 1.0 — found while reviewing the controller phase timing. Rather than patch only that field, a full audit of the same file's hardcoded-CLI-default pattern was run; it found a second, more consequential mismatch: `bonusMult` defaulted to 1.0 while the shared `racePlanBonusStrengthMultiplier` was 2.0 — half the area-bonus strength the browser actually uses.

**Insight:** A single instance of a copy-the-value-into-a-literal anti-pattern is rarely unique; the same hand wrote the same pattern for every neighbouring field, and the ones that happen to still match are silent today but are the next drift. Patching only the field that was caught fixes the symptom and ships the rest of the latent class — here, the single-field fix would have produced a sweep that still ran at half the real bonus strength.

**Consequence:** When you find one hardcoded value that should have come from a shared source, audit every sibling in the same file/pattern before fixing — then convert them all to read from the shared source so the whole class becomes structurally impossible, not just the one instance. Distinguish "override mechanism with a wrong baked-in default" from "currently-matching duplicate" (drift risk) and fix both.

**Reference:** `corridorEnd` (0.95 vs shared 1.0) found first; full audit found `bonusMult` (1.0 vs shared 2.0); both fixed by reading from shared config in `9cfa953`. Session 2026-06-30.

---

## Lesson 154 — When Unifying Two Formula Branches, Trace Every Factor's Apply-Site Across the Whole Chain, Not Just the Formula's Algebra

**Context:** feat/race-action, 2026-06-30. `sim-fairness.mjs` had separate open/closed `race_baseSpeed` branches; the proposal unified them into one `computeRaceBaseSpeed(finishT, targetSeconds × expectedMinSF × speedMultiplier × closedSsf)` call. The open branch had applied `speedMultiplier` only as a later post-multiply; the unified formula also placed it in the denominator. Checking that the formula reduced correctly for the open case (`closedSsf=1`) was not enough — it looked like a double-application of `speedMultiplier`.

**Insight:** A formula's correctness is not contained in the formula; it lives in the full chain of where each factor is introduced and consumed. The `speedMultiplier` in the denominator was cancelled by the existing post-multiply at the apply sites (net `M⁰`, matching the browser's own racer-type-independent closed pace) — but proving that required tracing every downstream read of `race_baseSpeed` (both `baseSpeed` apply sites plus the `vt` ratio reads), not just simplifying the expression. A factor that "appears twice" can be a cancellation or a double-count; only the call-chain trace tells you which.

**Consequence:** Before merging two branches into one expression, enumerate every site that consumes the result and confirm each factor's net exponent end-to-end. Verify against an independent reference implementation (here the browser's `index.jsx` apply sites) rather than against the algebra alone.

**Reference:** Unified `race_baseSpeed` in `8f57cba`; apply sites `sim-fairness.mjs` (baseSpeed init + re-roll) and `vt` ratio reads; cross-checked against `RaceScreen/index.jsx`. Session 2026-06-30.

---

## Lesson 155 — Two Edits That Are a Matched Pair Must Land in One Commit — Prove What Happens If Only One Ships

**Context:** feat/race-action, 2026-06-30. The closed-track parity fix was two coupled edits: closed `finishT` → `lapsFromDuration(durationSec)`, and `race_baseSpeed` → the unified `computeRaceBaseSpeed` form. They are correct only together. Applying the speed-formula change alone against the old `computeFinishT`-derived `finishT` produces a result off by a factor of `1/(expectedMinSF × closedSsf)` — no error, no crash, just a silently wrong speed.

**Insight:** Coupled correctness is invisible in a diff that shows each edit in isolation; each looks locally reasonable. A multi-part fix where the parts are only jointly correct has a failure mode that no test of either part alone will catch — and a reviewer approving them as "two small changes" can wave through a broken intermediate state if they are split across commits or landed out of order.

**Consequence:** Before splitting or sequencing a multi-part change, algebraically (or empirically) check whether each part is independently correct or only correct as a pair. If only-as-a-pair, land them in a single commit and say so in the message; never let a half-applied intermediate exist on the branch. The matched-pair fix shipped as one commit `8f57cba`.

**Reference:** `finishT` (lapsFromDuration) + `race_baseSpeed` (computeRaceBaseSpeed) unified in `8f57cba`; the single-edit-only result is wrong by `1/(E·S)`. Session 2026-06-30.

---

## Lesson 156 — To Measure an Exact Drawn Dimension, Read the Geometry Data, Not the Rendered Pixels

**Context:** feat/race-action, 2026-06-30. Verifying whether searound's configured track width matched what was actually drawn (the "searound width-bump" decision). Pixel-colour analysis of the rendered background image gave only a rough, ambiguous range (~90–150px — anti-aliasing, lighting, and overlay artefacts blur the boundary). The track's own stored geometry — the 200-entry, index-aligned `innerPoints` / `outerPoints` arrays (plus `centerPoints` and an explicit `width` field) in `server/seeds/tracks/searound.json` — gave an exact, uniform answer: the Euclidean distance between `inner[i]` and `outer[i]` was 131.0px at all 200 sampled point-pairs, matching the declared `width: 131` field exactly.

**Insight:** When a quantity exists both as structured source-of-truth data and as something inferred from a rendered/visual proxy, the proxy carries every downstream rendering distortion as measurement noise; the structured data carries none. Reaching for the screenshot when the geometry array is right there trades an exact answer for an estimate, for no benefit.

**Consequence:** Prefer the structured source of truth (the geometry arrays / config field) over an inferred or visual proxy whenever both are available. Use pixel analysis only when there is no structured source — and treat any range it yields as an estimate, not a measurement.

**Reference:** `server/seeds/tracks/searound.json` (200 index-aligned `innerPoints`/`outerPoints` pairs measured at exactly 131.0px, matching the declared `width: 131`), consumed via `EditorShape`; searound width-bump decision (distinct from the four geometry-expansion tracks). Session 2026-06-30.


**AND A DOWNSCALED SCREENSHOT IS NOT A MEASUREMENT AT ALL (added 2026-08-18).** The rule above is
about precision; this is about a picture that has stopped containing the quantity. An image scaled to
fit a viewer, a terminal, a report or a chat window has had the thing being measured destroyed by
resampling before anyone looked at it: a 2 px line survives as a grey smear, a 0.000 px² quad and a
30 px one both read as "there is something there", and a colour sampled from it is a blend of its
neighbours. **The picture still looks like evidence, which is the whole danger** — it is the only
form of evidence that degrades silently and keeps its shape. If a number is wanted, read the geometry
or record the draw calls. A screenshot is admissible for "does this look right to a person", which is
a different question and the only one it can answer.

## Lesson 157 — A Fixed Seed Does Not Guarantee Determinism If Any Randomness Runs Outside the Seeded Scope

The fairness sim replaced `Math.random` with a seeded PRNG _inside_ each race, but the start-row shuffle ran in the per-combo setup BEFORE that scope, using global `Math.random`. So `--seed=1` produced different start-row assignments every run, and two "identical" runs were never comparable — a subtle non-determinism that silently injected noise into every re-gate. Lesson: seeding one hot loop is not enough; a seed only guarantees reproducibility if EVERY randomness source is inside the seeded scope. Prove determinism empirically with a same-seed double-run (bit-identical SHA256) before trusting ANY run-to-run comparison — and never diagnose a "regression" from a single pair of unseeded runs.

## Lesson 158 — A Hard Threshold Gate on One Small Run Is a Coin-Flip Near the Threshold

A "band-reach ≥70% per track" gate on one 50-race run produced a RED that did not survive proper measurement: mid-field B3 sits right at ~70% on several tracks with ±1.5–2.5pp seed variance, so a single run flips pass/fail by luck. The apparent 3.4pp "regression" (5.7σ on a broken n=3 variance estimate) collapsed to z≈1.4 once variance was estimated from enough deterministic seeds. Lesson: near a hard threshold, one small run is noise; pool multi-seed data (~300 races) and use paired per-seed comparison to isolate a change's real effect. A regression only counts if it exceeds the run-to-run noise band.

## Lesson 159 — The Most Expensive Canvas-2D Op Is High-Quality Resampling of Rotated, Downscaled Sprites — Isolate the Real Cost by Measurement

A framerate-dependent race speed traced to `imageSmoothingQuality='high'` on 40 racer sprites drawn rotated and downscaled (128px→~40px) every frame — the single line `'high'→'low'` dropped the frame from 50ms to 17ms. Five plausible suspects (background canvas, surface/dust/racer-trail particles) were each ruled out by measurement (temporary per-piece draw toggles + the physics-ms-per-real-second HUD metric); only hiding the sprites collapsed the cost, most of which showed up as GPU-flush "other" outside the measured draw bracket. Lesson: don't guess the expensive draw — isolate it by toggling pieces and reading real numbers (in a prod/preview build, not dev). Rotated+downscaled high-quality blits are a prime suspect.

## Lesson 160 — Define the Target Experience Before Building the Mechanism; a Bounding Force Cannot Create a Contest

**Context:** feat/race-action governor arc, July 2026. Weeks of governor work went into _bounding the field_ — a median-cohesion / leader-brake tuned in racer-lengths to stop the leader running away — before anyone had written down the actual target: an exciting, unpredictable **front contest** (lead changes at P1/P2/P3) whose result you can't read early. Once the target was stated, the mechanism was obviously wrong: a limiter can hold a gap _closed_, but "field is close together" ≠ "field is contesting the lead." A tight-enough cohesion to bound the front just produces a **dead, evenly-spaced procession** — the opposite of action. The fix was a **pivot**: retire the ahead-median leader-brake (Stage C, `a0105ed`) and add a **contest-injector director** (Stage A1, `a7e4a64`) that actively features a rotating cast at the front so the re-roll trades the lead.

**Insight:** A bounding/limiting force is _subtractive_ (it removes divergence); a contest is _generative_ (it must actively create lead changes). No amount of tuning a subtractive force yields a generative outcome. **Write the target experience — in observable terms — before choosing the mechanism**, and check the mechanism's _category_ (bound vs. generate) against it before tuning a single parameter.

**Reference:** governor arc `307d6dc`…`a0105ed` (bounding, retired) → `a7e4a64` (director). ROADMAP §R.7.

## Lesson 161 — Build the Measurement of the Target Before Tuning Toward It

Every governor/director eye-test in this arc ended in "I see nothing" — because the sim could not **measure** front action: there was no lead-change / podium-shuffle metric, and the governor's own racer-length telemetry was computed but never reached the JSON (set on the per-race result _array_, emitted per-racer _element_ — silently dropped). We were tuning blind toward an outcome we hadn't instrumented. Sim-1 (`b930b1b`) added the read-only `--front-action` metric (leadChanges, podiumShuffleRate, front-reach gaps, and a targetRank-vs-front **unpredictability** counter-metric) and fixed the propagation, then **calibrated it against a known-bad case** (seed-1 Searound×Manta lone breakaway must score LOW) before trusting it. Lesson: when the goal is a subjective experience, **build and calibrate the objective metric first** — an eye-test without a metric is not repeatable, not sweepable, and cannot tell a null result from a broken observer. Calibrate the metric against a case whose answer you already know before using it to judge new ones.

## Lesson 162 — Governor Arc: Confirmed Dead-Ends (So They Aren't Re-Tried)

Three approaches were tried and empirically rejected in the governor arc; record them so a future session doesn't burn the same cycles:

- **Tight median-cohesion strong enough to bound the field = a dead field.** Cohesion stiff enough to prevent a front breakaway also flattens the natural re-roll groups/battles into an evenly-spaced procession. The resolution was the **dead zone** (middle runs free; force only past the bound) plus retiring the leader side entirely — not a stronger spring.
- **Neighbour-gap "rip-closer" relocates the rip, it doesn't remove it.** Closing the largest adjacent gap just moves the discontinuity elsewhere in the field; the **median-relative** bound was the effective lever, not the neighbour gap (`24c99b6`).
- **Length-bound / `finishT` mis-scaling under-reported closed multi-lap gaps.** Bounding a gap as a fraction of `finishT` divided out ~`maxLaps` on closed tracks, so the same physical gap read differently by duration/track. Fixed by measuring in **true racer-lengths** (arc-px ÷ mean body length) — lap-count- and track-independent (`9947892`).

---

# 2026-07-10 — What this week cost and taught (INFRA: sim-trust / gap-space / lengths)

Plain language. Each lesson is why a whole week went into measurement, not features.

- **Rank space is not gap space.** `reachedFront := rank <= 5` is satisfied by a racer finishing 5th,
  seventeen lengths behind a lone winner. Every quality metric we owned lived in rank space. The numbers
  said the comeback worked; the owner's eye said the race was dead. Both were right — they measured
  different spaces. The standing rule now: **rank-space metrics cannot see a dead race**
  (`scripts/sim/observers/gap-metrics.test.mjs` proves it: two synthetic races, identical final ranks,
  one bunched and one strung out — every rank metric identical, every gap metric different).

- **Five metrics measured something other than their name.** `physical_overtake` counted start-row
  mixing; "comeback" counted a one-place gain; the cast-depth table was measured on a pack racer, not a
  hero; `transitionEnd` was called functionless despite a second reader; `reachedFront` is a rank. A
  metric named for the thing it does not measure is worse than no metric.

- **Byte-identity proves that nothing changed. It proves nothing was ever right.** A frozen wrong
  baseline converts an error into a guarantee. Keep the two questions and two tools separate: _did this
  deletion change the race?_ → exact regression diff (byte-identity). _Is the race any good?_ →
  gap-space metrics in racer lengths + the owner's eye. Never let the first answer the second.

- **The unreadable file produced the wrong measurement.** The clean-baseline audit enumerated forces in
  `racePlanner.js` — a readable file — while the actual speed formula sat deep in a 5000-line file among
  four dormant experiments. That is why a browser-only brake zone was never found. Untangling was not
  tidiness; it was the fix. (The sim is now ~3522 lines with observers factored into
  `scripts/sim/observers/`; the physics is _imported_ from the shipped modules, not re-implemented.)

- **The sim silently assumed the owner's browser was at defaults. It was not.** That precondition was
  unstated for months. The answer was not access — it was accountability: the **world hash**
  (`raceConfigWorld.js`). Every run now stamps its world (`ASSUMED-DEFAULTS` when no `--config` is
  given, and it says so, up front).

- **A unit the observer cannot perceive is a broken metric.** One second was 5.7 lengths on
  mountainstreet and 3.1 on dirt-oval. "Seconds" was written into a spec without justification; the
  owner asked why, and a systematic error across a whole night's results fell out. All gap reasoning is
  now in **racer lengths**, via one shared conversion (`client/src/modules/raceLengths.js`).

- **Three independent concepts converged on the same mechanism** (bias the re-roll, not a per-frame
  brake) — and the fourth-best idea (the early re-draw) was found only _after_ all three were written.
  Convergence is a strong signal, not a proof. Keep challenging after agreement.

- **The one who runs the code catches what the one who writes the spec cannot.** Every challenge round
  in this project corrected the _spec_, not the implementation: the bimodal field, the actuator
  hierarchy (the servo has more speed authority than the re-roll), the withdrawal of a hero exemption
  that would have hidden the motivating failure. Read the source before trusting the claim.

- **A stale comment is a lie with authority.** A comment that claims a mechanism is active — when the
  code under it is gone — reads as truth and misleads the next reader, human or model. It has caught
  this project three times: `"Falls back to frameSizePx/2 (sim racers)"`; `"Replicates the core race
loop from RaceScreen/index.jsx"`; and an orphaned `"TIER-2 … attached ONLY when --tier2 active"`
  header with the `STRIP_METRICS` block sitting under it — which was read as a live `--tier2` path and
  written into a doc as a mechanism that does not exist. The fix each time: **verify against the code,
  not the comment; and when you delete a mechanism, delete its comment in the same breath.** Grep
  excluding comment lines before you claim a path exists.

---

# 2026-07-14 — THE GREAT PULK CLEANUP: race-dynamics lessons (from the choreo + PulkLeadRotation rebuild)

These are the durable lessons from the mechanism rebuild + the six-stage cleanup that reduced the
race to its one shipped world (choreo hero-choreography + PulkLeadRotation). The rank-vs-gap and
stale-comment/functionless-key lessons are already captured above (2026-07-10 section + L160–162);
what follows is what was not.

## Lesson 163 — The Race Is a Cast, Not a Controller

Weeks went into building a _controller_ to steer the field (bound the leader, spread the pack). The
measurement showed the existing servo + curve machinery **already** delivered the target — a deep-cast
hero reached the front 92–100% of the time on all 10 tracks and still finished fair; the front could be
made to trade the lead inside the fair envelope. The engine was never the problem; the **casting** was
(heroes drawn only from the future top-5, pulled front before the race opened, drama clamped away). The
fix was to rebuild the _caster_ — author a small cast dramatic journeys decoupled from their fixed
finish — not to add a new steering machine. Before building a mechanism, check whether the existing one
can already produce the target with better _inputs_.

## Lesson 164 — Gentle Levers Only; a Strong One Backfires

The in-envelope levers that create action are **gentle**: a ~−6% brake on the 1–2 cars directly ahead
of a charging hero halves its stuck-in-traffic time (churn → clean pass); a ~−6% brake on whichever
front hero is momentarily leading provokes a lead change. Their **strong** versions backfire — a hard
brake, or a brake+boost combo, produces flicker/yo-yo, the opposite of the intended read. Corollary for
authored curves: bound the instantaneous cross-rate to ≈1 rank per servo-settle (~1 s); a ≥2-rank
instantaneous differential pins one racer at the +cap and another at the −cap = the same flicker.

## Lesson 165 — Keep the Field at the Shipped ±8% Spread

Tighter density buys a higher band-reach number but costs the show: a "comeback" in a tight bunch is a
few car-lengths in a scrum. The shipped ±8% spread is the fairest on the native per-row-win test **and**
leaves real distance between cars, so a hero closing that distance is _visible movement_. Do not chase a
band-reach metric into a density that erases the thing the metric can't see.

## Lesson 166 — Shipped == Measured

Every governor/director sweep ran with `--governorDirectorEnabled=false`, while the shipped default was
`true` — so months of measurements described a world the game never shipped. The general rule: **measure
the exact config you ship.** A sweep that flips a shipped-on mechanism off (or a flagless sim run that
omits the shipped split flags) proves nothing about the shipped race. Make the harness stamp/echo its
world (the `raceConfigWorld.js` world-hash) so "measured == shipped" is verifiable, not assumed.

## Lesson 167 — Anchor a New Phase Boundary to a Measured Boundary, Not a Literal

When a new boundary must line up with an existing one, anchor it to that boundary's **variable**
(`pulkStart`), never to an independent literal that happens to share its value today. `pulkStart` and
`choreoOutcomeStart` were both 0.25 by default but are independent; a measurement anchored to the wrong
one silently diverges the moment the owner raises the other. Anchor to the thing you actually measured.

## Lesson 168 — A Feasibility Table Measured at 40 Racers Does Not Transfer to ~100

The reach-front / cast-depth table was measured at 40 racers and expressed as a field _fraction_. The
fraction is position-invariant but NOT climb-difficulty-invariant: a 50%-back cast on a ~100-racer open
track is ~2.5× the ranks of traffic to clear, and traffic is the dominant churn source — it scales up
with the field. Re-measure depth feasibility at the large field before trusting the table there.

## Lesson 169 — Turn a Bonus Off With an Instant Cut at the Boundary, Not a Fade

The measured world zeroed the areaBonus _instantly_ at the chaos boundary. Re-anchoring an
`easeInOutCubic` fade to the boundary instead lets the bonus linger ~1.5 s past it — an unmeasured,
pointless tail. When a phase ends a contribution, cut it at the boundary; don't fade across it.

## Lesson 170 — An Unguarded Duplicate Is a Latent Seam

The sim carried a hand-copied `RACER_CONFIGS` table with zero drift _today_ — a seam that will drift
silently the moment the shipped source changes, with no test to catch it. Either import the single
source or add a guarding parity test; "identical right now" is not a guarantee, it is a countdown.

## Lesson 171 — Hand-Mirrored Orchestration Is Untrusted Without a Per-Frame Parity Harness

The sim shares the shipped physics _modules_, but the main race-loop **orchestration** (order of forces,
re-roll timing, pass sequencing) is hand-mirrored from the browser with no automated per-frame position
comparison. Shared modules give factor-level parity (see FORCE-PARITY.md), but frame-level fidelity of
the loop that calls them stays UNTRUSTED until a per-frame harness passes at HEAD. Know which level your
parity guarantee actually covers.

## Lesson 172 — Audit Every Metric by the Space the Viewer Perceives; Separate MECHANISM from QUALITY

Generalises the rank-vs-gap lesson. A **mechanism** metric (overtake count, closing-speed ratio, a
per-frame flag) is valid even when the outcome space is wrong. A **quality** claim (comeback, "good
race", fairness) in the wrong space is void by construction — a 5th-place finish 15 lengths back scores
like a real close comeback. For every metric ask: what space does the viewer perceive this in, and does
the metric live in that space? Quality lives in gap space (racer lengths), never rank space.

## Lesson 173 — Coupled Actuators in Overlapping Windows Cannot Be Tuned in Isolation

When two mechanisms act in the same time window on the same outcome (the cohesion dice and the servo
sorting both shape gap size, overlapping temporally), there is no servo-free regime to tune the dice in.
Only ~37–45% of over-wide holes were servo-driven — the dice still have a real job (the rest are
drift/brake holes), but any tuning must account for the other actuator's interference rather than
pretend it can be isolated.

## Lesson 174 — A Hero's `peakRank` Is Not the Peak of the Story

For a comebacker the cast sets `peakRank` = its DEEP post-chaos rank (identical to its anchor rank);
`finalRank` is the front cluster. So the curve HOLDS deep until the `peak` beat and only THEN climbs to
`resolve`. The "peak" beat is the START of the comeback, not its climax. Reading the name instead of the
casting cost two confidently wrong claims in one session (first "the climb is in PULK", then an
over-correction to "the climb is all in OUTCOME"); the truth — the climb SPANS PULK→OUTCOME — only
appeared after running the generator's own `feasibleTiming` on real values. Beat semantics must be read
at the casting site, never inferred from the beat's name.

## Lesson 175 — The Camera Has One Lens: Foresight Does Not Create Screen Time

Giving the director perfect advance knowledge of a comebacker changed nothing visible, because the
resulting shot still had to win a weighted candidate contest it loses (comeback 0.6 vs battle 0.8).
Camera work is zero-sum allocation: to show something earlier, something else must be given up. Before
building any new "the camera should notice X sooner" mechanism, first ask what X would have to displace —
and whether that trade is wanted.

## Lesson 176 — Justify the Work with the Reason That Survives Measurement

The per-frame comeback scan "obviously" looked wasteful (a full array copy + sort every frame, times
three). Measured: ~0.02 ms against a ~17 ms render frame — 0.1% of budget, ~900× cheaper than rendering.
The change (plan identity instead of a b1 scan) was still right, but for a completely different reason:
it shows the RIGHT racer instead of the noisiest one. A correct change with a false rationale invites the
next person to "optimise" the wrong axis. Also: two independent concept reviews argued the plan-vs-reality
question to a standstill; a 200-race measurement settled it in one run.

## Lesson 177 — Distributed Smoothers Are Load-Bearing, Not Redundant Abstraction

Three separate smoothers exist in the per-frame speed path — `governorMult` slew (1%/frame), `trajectoryMult`
easeInOutCubic (1s), `spreadFactor` easeInOutCubic (3s). They _look_ like fragmentation begging to be unified
into one global acceleration cap. Measured: removing all three and replacing them with a single 0.5%/frame
cap on the final speed cost **−5pp B2 and −9pp B3 band-reach** (4 tracks × 100 races), with no action gain, at
every cap value tested (so it was the _removal_ that hurt, not the cap tightness). Each smoother smooths a
DIFFERENT quantity at a DIFFERENT timescale — governor reaction, servo _target_ transition, re-roll _luck_
change — and the rank servo specifically needs its target to move gradually to steer accurately; a cap on the
_final_ speed does not substitute for smoothing the _inputs_. Corollary confirmed the same session: band-reach
is **endpoint-determined** (the servo drives to the assigned target rank over the OUTCOME window), so levers
that only reshape the mid-race trajectory — band-resolve checkpoints, a speed-change cap — cannot move it
(band-checkpoint proportionalization: +0.3pp = noise). Before "unifying" or "cleaning up" apparent duplication
in a control loop, measure what each piece is load-bearing for; fragmentation that survives a removal test is
intentional. (The one genuinely-safe cosmetic smoothing from the same investigation — easing the ~1% rowEnvMult
step at the boundary — held fairness because it is a tiny, isolated input, not a load-bearing one.)

## Lesson 178 — Action Lives in Orchestration, Not Liberation

The proven principle behind the whole front-action arc: **steering racers along authored curves CREATES
top-5 churn; freeing them (releasing the servo, running strictness-0 inside a band) SETTLES the field and
REDUCES action.** Confirmed three independent ways:

- **B2-Heroes "Attack & Fall" (author) → +21% top-5 OUTCOME action.** Casting 3 extra heroes on a scripted
  climb-to-~5-then-fall-and-free-reorder curve manufactures front drama without touching fairness (B1/B2
  band-reach cleared the gate on all four tracks, Holm at the 2/4 baseline). Shipped ON.
- **Pack strictness release (liberate) → BROKE B2 fairness.** Letting the non-hero pack run strictness-0 inside
  its band leaked B2 band-reach to 67–69% on luger-hill + searound and Holm 3/4 via an endgame edge-leak
  (92% of leaks after progress 0.90 — freed racers at the band edge shuffle out with no runway). Shelved, then removed.
- **Universal band-arrival (liberate) → −6% action.** Freeing B1-heroes + pack inside their assigned band
  held fairness (immediate re-steer) but the field just settled — less churn, not more. Shelved, then removed.
  **Rule for future front-action work: AUTHOR scenarios (curves, casting, timing), do not liberate constraints
  (release the servo).** Liberation reduces the very thing it feels like it should increase. Both losing
  mechanisms were deleted on 2026-07-23 (Lesson 180) — the measurement is the reference, not the flag.

## Lesson 179 — The Runaway Gap Forms BEFORE Progress 0.90

Baseline measurement (2026-07-20, `--runaway-parade` observer, N=100 seeded races × 4 tracks): the game
produces a **runaway winner in 23.5% of races overall** (open tracks 18%, closed tracks 28–30%) and a
**parade finish in only 2%**. The decisive finding for any future "keep the leader catchable" work: **the
lead that decides a runaway is already established before progress 0.90.** Of the races where the leader was
≥3 lengths clear at 0.90 (99 across the field), **94 converted to an unchallenged win** — a ≥3L lead at 0.90
is almost never overturned. So a late-race "distance leash" that only engages after 0.90 arrives too late;
the runaway must be contested EARLIER (in PULK / at the choreo→OUTCOME boundary) or prevented from forming at
all. Closed tracks are the worst offenders (28–30% vs 18% open). Parade finishes are rare and, when they
occur, are genuinely paced (leading-group internal speed spread ≤0.10 over the final 5%) — an observe-only
phenomenon, not a problem to chase. Method + numbers: `exp-runaway-leader-results/`; see also SWEEP-HARNESS.md.

## Lesson 180 — A Control for a Shelved Mechanism Is a Loaded Gun

Three mechanisms were deleted outright on 2026-07-23 (dead-mechanisms cleanup): the B1 lead rotation with
its role-biased dice, the pack strictness release, and universal band-arrival. All three had been built,
measured, and kept as default-OFF flags "as documentation" — one of them with a live DevScreen checkbox.
Two things forced the deletion.

**Measured suppressors do not get to stay as options.** The lead rotation was built to manufacture lead
changes, and the greenfield night run measured it as the WORST arm — it suppressed the very thing it
existed to create. A mechanism that loses is evidence; a mechanism that loses AND stays wired is a trap
for the next person, who reads the flag name and assumes it is an untried idea.

**A checkbox is not documentation — it is a live path one click away.** The shelved pack release kept a
DevScreen toggle so the failure could be re-demonstrated. But settings persist in localStorage, and a
persisted `true` survives every later change: the toggle was one stray click from putting a mechanism
known to break B2 band-reach into a race nobody was auditing. Documentation belongs in LESSONS.md and
SIM.md, where it cannot be switched on. Any control whose only purpose is "so we can show why it failed"
should be a paragraph instead.

**What survives a deletion like this.** The MEASUREMENT (kept in SIM.md / LESSONS.md, with numbers), the
git history (commit `0555f9d`, a complete archive — the tag this lesson named was deleted in the
2026-07-23 collapse, CITATIONS-1 2026-09-03), and any sub-part with a live
consumer — here the spatial re-steer threshold, which the shipped B2-attacker release reads and which was
therefore kept and re-documented rather than deleted with the rest. What does NOT survive is the config
key, the UI control, and the code path. Both fingerprints stayed byte-identical through the removal,
which is itself the proof the mechanisms had never been on a live path — and the reason keeping them
would have cost nothing to measure and everything to trust.

## Lesson 181 — The Target Must Never Follow the Field (Evolution Act 1, assignment-follows-field)

Assignment-follows-field reassigned each pack racer's intra-band target rank to the LIVE order every servo
tick, on the theory that "letting targets follow the field" would make the front fight for live positions.
The SCREEN did the opposite of the theory: it broke the fairness floor (pooled band-reach 71.1%→66.8%) AND
deadened the finale (dead finales and runaway up, lead-changes down) at the same time.

**Context.** The pack servo error is `0.5·rankError + 0.5·bandError` (`rankError = currentRank − targetRank`
against the static Fisher-Yates slot; `bandError` only bites at a band edge). A live-following target makes
`targetRank ≈ currentRank`, so `rankError → 0` by construction — the restoring half of the controller goes
silent, leaving only the half-strength, edge-only `bandError`. The hysteresis threshold only interpolates
between "neutralized" (`H→0`) and "shipped" (`H→∞`); it cannot ADD a force. Cadence (per-tick vs
roll-boundary) has the same limit: no clock change restores a force the design removed.

**Insight.** In this engine, **fairness and finale contest are the SAME force — the static-slot pull.** The
servo produces band-reach (it holds racers to their assigned band) and the finale comeback/brake (it pulls
the designated winner up and reins escapees in) with one and the same `rankError` term. Anything that
weakens the pull toward the static assignment — following the field, blending the target toward live rank —
removes BOTH at once. "Following" is operationally identical to "stop correcting," which is the opposite of
contest.

**Consequence.** Contest mechanisms must ADD selective energy ON TOP of the intact restoring force (e.g.
honest dice-draw tilts on the scheduled re-roll), and must NEVER modify what the servo steers toward. Keep
`plan._racerTargetRank` a frozen endpoint contract. Evidence: `reports/evolution/AFF-SCREEN.md` +
`AFF-NEXT-CC.md`; build recoverable @`cd520e0`; both fingerprints stayed byte-identical (default OFF), which
is the proof the mechanism was never on a live path.

## Lesson 182 — No Single Track-Agnostic Finale-Dice Law Lifts Both Topologies (Evolution Act 2, finale front-compression)

Act 2 took Lesson 181's advice — leave the servo alone, add contest as a scheduled-dice overlay on the
gap-cap re-roll, front-band only, in the finale window `[0.80,0.90]`. It was built twice: with FIXED
length-gates, then with ADAPTIVE gates scaled to the live front spread `S` (`G_c = c·S`, `G_b = b·S`). The
fairness floor always held and the mechanism worked exactly as built — and it still failed the decisive bar.

**Context.** One fixed dose did OPPOSITE things by topology: on open tracks it over-calmed (lead-changes
3.00→2.32, front@line looser), on closed tracks it added contest but churned (dead 8→16%, runaway 16→24%).
The adaptive variant was the pre-registered fix — normalize the gates by the race's own front spread so
selectivity is constant on both. It held the pooled floor and even CURED the closed over-churn (runaway
16→16%, dead 8→12%), but STILL could not restore the open over-calm (lead-changes 3.00→2.32). The smoking
gun: the realized gates barely separated (open `G_c` 1.01 vs closed 1.47) because the live front spread `S`
is ~4–6 L on BOTH topologies — **no race-internal spread signal distinguishes the two regimes.**

**Insight.** The open/closed split is **structural physics, not gate selectivity.** Open tracks re-expand
in the last ~10% (a long run-out where scheduled dice are sparse and live physics carries the finish, so any
`[0.80,0.90]` compression washes out by the line); closed tracks churn in bunched lap traffic (bleeding a
leader lands it back in the pack). A scheduled-dice draw-tilt inside the finale window cannot reach either
effect — at any dose, adaptive or not.

**Consequence.** Do NOT re-attempt finale contest via a scheduled-dice overlay on the re-roll, nor any
retuning of its gates/strength/window — the mechanism class is exhausted for this goal. Late-race dynamics
need a different foundation (see the Servo-vs-Deck consultation). Per-track tuning is NOT an escape: the
owner rule "one rule set for every track" is binding, so a solution counts only if a single track-agnostic
mechanism lifts BOTH topologies at once. Evidence: `reports/evolution/FINALE-SCREEN.md` +
`FINALE-ADAPTIVE-SCREEN.md` + `FINALE-ADAPTIVE-CC.md`; builds recoverable @`8d5e9fd`/@`7404bd9`/@`197763d`;
all fingerprints byte-identical (default OFF) throughout.

## Lesson 183 — A Start-Position Handicap Is Moot for Identical Racers — and an Overlap-Free Traffic Core Is Buildable (handicap-pursuit experiment)

The blank-page "handicap pursuit" concept (stagger the grid by ability so every racer's expected arrival is
equal, then let honest motion run) was prototyped on a dropped experiment branch. PROTO-1 (longitudinal,
traffic-free) PASSED cleanly — one global handicap slope gave a class-uniform win distribution (chi²=3.3)
and a ~1.1-length bunch finish on both topologies. PROTO-2 added real lateral traffic under the hard
no-co-location rule and it collapsed. But the deeper finding is that the premise itself dissolved.

**Context.** PROTO-2 kept 0 overlap violations across seeds on both tracks, yet the win distribution swung
hard to the slow front-starters (snail 68.5% pooled, 99.5% on the narrow searound vs 37.5% on the wide
luger-hill): honest overlap-free passing means a fast back-marker can only overtake into an open lane, and a
narrow track for a mixed-ability field has none, so it is held while the slow front-runners cruise home —
and the bias scales with track width, so no single global rule can fix both. Separately and more
fundamentally, the world was then clarified: **all racers in a race are identical** — same type, same speed.

**Insight.** With identical racers there are no ability classes, so there is nothing to handicap — any
ability-equalization mechanism is a category error. Fairness in this game is about the START ROW (equal
win-chance from every row), not ability. The durable asset from the experiment is NOT the concept but the
physics it forced us to build: the PROTO-2 **overlap-free 2D traffic/blocking core** — forward-gap cap +
clearance-checked lane changes + honest holding when no lane is open, provably 0 overlaps — which shows that
honest blocking (a desired feature, not a defect) is cleanly buildable and reusable.

**Consequence.** Do not re-attempt ability handicaps or pursuit-by-ability; the identical-racer world makes
them moot. Reuse the overlap-free traffic core for the identical-racer _mixing_ experiments (the peloton /
drafting line, where the field is kept together by honest physics and the start row is washed out by
mixing, not by steering). The experiment branch was dropped, not reverted — its two reports are the lab
journal. Evidence: reports/evolution/PURSUIT-PROTO-1.md + PURSUIT-PROTO-2.md; recoverable at the archive tag
`archive/handicap-pursuit-089c7d2`.

## Lesson 184 — The Cliff Law: Correct the DRAW, Never the Motion After the Dice

Every mechanism that tried to make racers reach the band of their drawn place by ACTING ON THEIR MOTION —
a hard positional wall, a soft band spring, an authored finale curve — created a force the racer's honest
physics then had to fight, and the fairness↔action frontier came out a **cliff**, not a slope. The one
mechanism that worked did the opposite: it biased the RE-ROLL DRAW itself toward the drawn band, clamped to
the honest `[spreadMin, spreadMax]` range, so nothing was ever fought.

**Context.** The free-band line swept the corridor dial from hard wall to soft spring: hardening it lifted
arrival only to 69% (already below ship's 72–75%) while crushing frontContest to 28–36%; softening it dropped
arrival off a cliff (69→46%) _without_ the contest rising (28→29%). There was no middle cell trading a little
fairness for meaningful action. FAIR-ARRIVAL's B-vs-C comparison isolated why: ARM C (a literal band wall from
`R`) posted arrival 68/70% DOWN and frontContest crushed to 27/55 (the pin); ARM B (aim the DRAW) posted
arrival 89/89% (+14/+17pp) with frontContest within 1–2pp of ship AND the per-row floor UP 65→86.

**Insight.** A correction applied _after_ the dice have been rolled is an opponent force — it fights the
racer's spread draw, its re-roll, and the servo all at once, so it can only buy fairness by spending action
(and often loses both). A correction applied _to_ the dice — shaping the draw before it becomes motion —
changes what the racer _is_, so the honest physics that follows carries the fairness for free. Same goal,
opposite sign: load the draw, don't wall the position.

**Consequence.** Do not re-attempt band-arrival via any post-dice positional force (wall, spring, authored
curve); the class is a cliff and closed. Reach fairness by biasing the re-roll draw within the honest tempo
range (the shipped COMBO15 `bandBias`), keeping in-band racers on FREE dice (pillar 3). Evidence:
reports/evolution/ACTION-FREEBAND-1.md + ACTION-FREEBAND-2.md (the cliff) and reports/evolution/FAIR-ARRIVAL-1.md
(B-vs-C: aim the dice works, wall the position fails).

**THE SCOPE, SETTLED BY THE OWNER, 2026-08-25 — and the ambiguity that made it necessary.** This lesson's
TITLE says "Never the Motion After the Dice"; its CONSEQUENCE forbids only a post-dice **positional** force,
naming wall, spring and authored curve; and **every arm it measured was positional** — ARM C was a literal band
wall. So it proves a claim about positional forces and asserts a broader one about motion, and the two do not
agree about a correction applied to SPEED.

**His reading is the NARROW one: what is forbidden is a positional force that DRAGS a racer to a place — a
wall, a spring, an authored curve — and not a speed correction serving the drawn outcome.** The race plan's
trajectory controller is therefore not a loophole; it is a mechanism he added deliberately with the director,
to make the drawn ranks actually reachable and to keep the race exciting. `areaBonusMult` is a second term of
that kind.

**NOTHING ABOVE IS REWRITTEN and nothing about the evidence changes** — every arm this lesson measured WAS
positional, and that remains the whole of what it proved. What is added is which reading of its title is
operative.

**WHY THIS NOTE EXISTS AT ALL.** The ambiguity was not harmless: `docs/FAIRNESS.md` claimed for two months
that the shipped arrival figure was reached "not by any positional force" and by the draw bias alone, a
sentence written 70 days AFTER the controller already existed. A lesson whose title and consequence disagree
in scope is a lesson that can be honestly cited for a claim the code does not support. Evidence:
reports/evolution/FAIRNESS-PROMISE-1.md.

## Lesson 185 — The Decidedness Law: The Fight IS the Undecidedness; Sort PARTIALLY, Not FULLY

Action is not a thing you add on top of a plan — it is the plan being _not yet decided_. Every attempt to
choreograph a livelier finish onto an already-decided outcome stayed flat, because a race whose result is
fixed has nothing left to contest. The corollary is a timing law: the live re-roll is where the undecidedness
lives, so FULL pre-sorting (deciding early) empties the pulk phase, while PARTIAL sorting leaves enough
undecided to feed it.

**Context.** The choreo-release line freed each racer to the ship's re-roll once home — arrival-safe (band-hold
worked, 80/75% at AT90) but the finish stayed DEAD-BORING because the outcome was already decided; three
confirmations, including a strong steer variant, all ran the T-curve the WRONG way (more dice time →
more dead-boring). PULK-SPECTACLE then measured the mirror image from the other end: COMBO25's chaos steer
FULLY sorted the field into the drawn band by chaos-end, and the pre-sorted band-1 favourite then OWNED the
mid-race pulk (leaderIsDrawnB1_mid 0.57–0.75, distinctLeaders down); shrinking the chaos window to 0.15
(COMBO15) made the sort PARTIAL, and the pulk came alive (maxLeadHoldShare_mid 0.42→0.27, distinctLeaders →~11).

**Insight.** "Planned" and "decided" are the same thing, and a decided race is a flat race regardless of how
its motion is dressed. The knob is not _how much_ choreography but _how much stays undecided going into the
window you want lively_ — a FULL sort spends the pulk's uncertainty to buy chaos-end fairness; a PARTIAL sort
banks the fairness and leaves the pulk something to fight over.

**Consequence.** Never add action by scripting motion onto a fixed result; instead protect a live re-roll
window where the order is genuinely still open, and tune the _fraction_ sorted, not the amount of overlay.
The shipped 0.15 chaos window is this law applied. Evidence: reports/evolution/CHOREO-RELEASE-1.md +
CHOREO-RELEASE-2.md (decided = flat, three confirmations) and reports/evolution/PULK-SPECTACLE-1.md
(full sort empties the pulk, partial sort feeds it).

## Lesson 186 — The Proximity Floor Is a FAIRNESS Asset, Not Only an Action Tool

Band-centre bunching — pulling each racer toward the middle of its drawn band through the approach — was
carried as an action/closeness helper. When it was finally removed as a "stowaway" in a clean preregistered
screen, band ARRIVAL fell. The closeness mechanism was quietly delivering fairness the whole time.

**Context.** Every FREEBAND-1 arm had `--chainProximity` ON. FREEBAND-2's first act was to remove it and
re-measure: with the proximity floor gone, absolute band arrival DROPPED (the hard-wall cell fell to 69/69%,
below ship), and the per-row floor collapsed to 38–63%. The floor was not pinning racers to a wall — it was
seating them in the centre of their band, from where the honest finish lands them in-band far more often.

**Insight.** A mechanism justified by one metric (action/closeness) can be load-bearing for another
(fairness/arrival) without anyone having attributed it there. Bunching toward band-centre raises arrival
because a racer already near its band centre needs the least post-draw motion to finish in-band — the same
"correct the position early, not late" logic as the Cliff Law, expressed as a floor.

**Consequence.** Before removing a mechanism because its _stated_ purpose is served elsewhere, measure it
against the OTHER scoreboards first — a closeness tool may be a fairness tool wearing the wrong label. Evidence:
reports/evolution/ACTION-FREEBAND-2.md §2 (the stowaway was a fairness asset: removing the proximity floor
lowered arrival).

## Lesson 187 — The Whitelist Trap and the Proof-of-Live Standard for Viewing Tools

A plan flag set in `dynamicsConfig` does nothing in the browser unless it also passes `raceCore`'s explicit
plan-config WHITELIST — and a dev viewing tool that silently no-ops looks exactly like a working one. Both
together cost two evenings of blind eye-tests that were never actually running the candidate.

**Context.** EYE-SETUP's `?world=combo` injected the fair-arrival flags into `dynamicsConfig`, but
`raceCore.createRaceFromIdentity` builds its `createRacePlan` config from a hardcoded whitelist that never
listed those flags, so the browser's plan got them stripped (steer ran 0 ticks) even though the config object
carried them. The sim worked because `sim-fairness` has its own `createRacePlan`. The bug was invisible until
a proof-of-live layer — a green/red on-screen badge, a race-start console line, and a runtime assertion that
the flags are present in the LIVE config plus a chaos-end steer-tick check — flipped the badge RED instead of
letting another blind session ship.

**Insight.** The browser plan config is written twice (`raceCore` for the game, `goldenRunner.browserPlanConfig`
for the parity twin); a new plan flag must be added to BOTH plus the sim, or it is silently dead on the path
you're actually eye-testing. And any tool whose whole job is to show a variant must be able to PROVE it is
showing that variant — a viewer with no liveness assertion is indistinguishable from a no-op.

**Consequence.** To add a plan flag to the browser, thread it through `raceCore.createRaceFromIdentity`'s
`createRacePlan` whitelist AND `goldenRunner.browserPlanConfig`, never only `sim-fairness`. Any viewing/eye-test
tool ships with a proof-of-live triple: visible badge + console echo + runtime assertion that screams on a
silent no-op. Evidence: reports/evolution/EYE-SETUP-2.md (the whitelist root cause + the badge that caught it).

## Lesson 188 — Judge Fronts on the DUAL Scoreboard and Whole Races on the THREE-WINDOW Readout

The dead-finale counter sees only COMPLETED P1 passes, so it scored genuine thrillers — a P2 pinned half a
length behind for the whole finish — as "dead," and it scored the shipped game as duller than it is. The
owner's eye caught mid-race flatness that every finale-only metric had passed.

**Context.** Across the ACTION line the dead-finale count kept flagging ship's finales as dead when the front
was in fact a sustained unresolved chase (contested but no lead CHANGE). Separately, PULK-SPECTACLE only found
the real problem — a chaos breakaway that then owned the mid-race — because it read the race in THREE windows
(chaos `[0, 0.15]` / pulk `[0.15, 0.60]` / finale), where the summary finale metrics showed nothing wrong; the
LAW (longest-actionless-window) and pulk-hold means lived in the middle window the finale readout never looked at.

**Insight.** A single completed-pass counter conflates "no contest" with "contest that didn't resolve," and a
finale-only readout is blind to where a mid-race race actually goes flat. Fronts need a dual scoreboard
(lead-CHANGES _and_ sustained-proximity/hold), and whole races need the three-window split, or the metric will
disagree with the eye — and the eye is right.

**Consequence.** Score front liveliness on both axes (changes + hold), and gate whole-race liveliness on the
chaos/pulk/finale three-window observer, not a finale summary. The v2 pulk watchdog is this lesson made a
permanent gate line. Evidence: reports/evolution/ACTION-BUILD-7.md (the dual-scoreboard front reading) and
reports/evolution/PULK-SPECTACLE-1.md (the three-window readout that found what finale metrics missed).

## Lesson 189 — The Wrong-Lever Law: The Chaos P1–P2 Gap Is Set by the CHASERS, Not the Leader's Knob

To close a modest early breakaway, the obvious lever is to cap how hard the steer boosts the leader. It
backfired on every cell: capping the boost WIDENED the gap, because the boost is what lets the deep-drawn
chasers climb and CLOSE — throttle it and the pursuers fall back instead.

**Context.** STEER-CAP-1 lowered only the chaos-steer upper clamp (leader boost 1.10→1.04/1.06), aiming to
shrink space-sprint's ~3.3L chaos hole. It fired correctly, and chaos maxGap INCREASED on all three tracks at
both caps (6/6 cells): space-sprint 3.1→3.8/3.4, ice 2.5→2.8/2.7, searound 2.8→3.0/2.9 — the exact opposite of
the intent, plus a two-sided loss (frontContest and in-band both fell).

**Insight.** The chaos P1–P2 gap is the distance from the leader to the _field behind it_, and that distance
is governed by how fast the chasers are climbing, not by the leader's own speed. The boost is a chaser's knob
as much as a leader's; capping it slows the people trying to close the gap, so the gap grows. Diagnose which
side of a gap a lever actually acts on before assuming it shrinks the gap.

**Consequence.** Do not throttle the boost side to close a breakaway; if space-sprint's residual must close it
needs a CHASER-side mechanism (partial-sort / band-EDGE target) or a leader BRAKE, not a boost cap. This is
also why the v2 pulk watchdog reads chaos maxGap as a ratio to ship (≤ ship×1.5), catching disproportionate
breakaway without punishing honest chase. Evidence: reports/evolution/STEER-CAP-1.md (boost cap backfires 6/6,
the mechanism named).

## Lesson 190 — The Synchronization Law: Commitment in Mutual Avoidance Must Be Per-Agent and Geometric, Never Timed

To stop racers flip-flopping left-right in traffic (the §4a soft-steer re-picking the most-constraining
obstacle every tick between two comparable gaps), the obvious fix is to make a racer COMMIT to a chosen side
for a short window. A fixed-time commit window backfired: it fixed the one targeted racer but made the FIELD
worse.

**Context.** RACER-FLAPPING-1 shipped a 0.4 s (24-frame) side-commit. On seed 5601 it took the caught leader
(Arrow) from 17 lateral reversals/2 s to 0 — a clean single-agent win. But the whole-race dramatic-flapper
count (racers with ≥5 reversals/2 s at ≥0.18 amplitude) rose from 1 to 6 and the worst episode from 6 to 10.
Earned kill; nothing shipped.

**Insight.** A _clock_ is shared wall-time. When many racers each hold a side for the same fixed window, their
windows overlap: the field freezes its mutual avoidance together, over-approaches while frozen, then all
re-decide at the same moment — one racer's fast flap becomes several racers' synchronized larger flaps. The
timer couples agents that should be independent. Hysteresis in a mutual system must be **per-agent and
geometric** — keyed on each racer's own local state, with no shared time reference. RACER-FLAPPING-2 replaced
the clock with a **margin**: the incumbent obstacle keeps the steer unless a challenger's constraining force
exceeds it by a relative epsilon. There is no window to synchronize; each racer switches on its own geometry,
so a genuinely-dominant challenger still takes over immediately. It killed Arrow's flap (18→1 reversals) AND
held/improved the field guard (0 dramatic flappers) across seeds — the opposite of the timer.

**Consequence.** In any mutual-avoidance or multi-agent commitment problem, never gate the decision on elapsed
time; gate it on a per-agent geometric margin. And always test a subtle avoidance change with a whole-FIELD
guard across multiple seeds, not a single targeted agent on one seed — the single-agent win hid a field
regression until the field guard exposed it. Evidence: reports/evolution/RACER-FLAPPING-1.md (the timer kill)
and RACER-FLAPPING-2.md (the margin fix + the field guard that caught margin 0.30's seed-5602 regression).

## Lesson 191 — The Live-Truth Law: A Behaviour-Changing UI/Camera Fix Ships Only on the Owner's Live Console Proof

Tests measure the CODE; they cannot measure the SESSION. A camera or UI fix can pass every automated check and
still be wrong on screen, because the measurement harness and the defect can share the same mistaken assumption.

**Context.** For two days a camera-focus defect resisted every fix because the measurement harness computed
screen-Y using the X scale — the exact error the defect itself made. The harness and the bug agreed, so every
"fix" looked correct in replay while the owner's eye still saw the fault. Only the owner's live session was a
correct instrument (CAMERA-FOCUS-5, `@72fc52e` — per-axis screen mapping: Y clamp used `bsX`, render uses `bsY`).

**Insight / the law.** No behaviour-changing UI or camera fix counts as shipped without a **console proof line
from the owner's LIVE session**. The acceptance invariants must hold on a live trace, and the measurement
harness is trusted only while **live == replay, frame-exact**. When the two diverge, the live session wins and
the harness is the suspect.

**Consequence / enforcement.** A camera/UI acceptance is not "green tests" — it is a live console proof line the
owner produced, plus a live==replay frame-exact check on the harness before its numbers are believed. If a fix
"passes" but the owner's eye disagrees, audit the harness for a shared assumption before re-touching the fix.
Evidence: reports/evolution/CAMERA-FOCUS-5.md.

## Lesson 192 — Clamps Are Guardrails, Never Steering

A containment clamp keeps the camera inside bounds; it must never be the thing that AIMS the camera. If the
clamp is doing the aiming, the intended steering was never actually wired.

**Context.** The follow observer that was supposed to steer the camera was never promoted, so for months the
containment clamp was the only thing moving it — and the camera tracked the track centreline instead of the
action, because the centreline is where an un-steered clamp settles (CAMERA-FOCUS-3, `@34f87ad`).

**Insight / the law.** Steering and containment are different jobs. A clamp is a guardrail: active only at the
edges, silent in the middle. When a clamp is continuously active it is silently substituting for missing
steering, and the symptom (camera on the centreline, not the subject) looks like a tuning problem when it is a
wiring problem.

**Consequence / enforcement.** "Clamp-active near zero in steady state" is a **test, not a comment**: assert the
containment clamp fires only at the bounds, so a regression where the clamp becomes the de-facto steering trips
CI instead of shipping. Evidence: reports/evolution/CAMERA-FOCUS-3.md.

## Lesson 193 — The Living-Config Law: A Stored Config Must Never Silently Disable New Machinery

A change to a default is not live until it reaches the STORED config the running session reads. A stored config
from before the change can silently strip new keys, so the new machinery is present in code but absent at runtime.

**Context.** The bug class "the switch never reached the living config" appeared **three times in one week**: a
fix looked inert not because it was wrong but because the merged live config never carried its new key, so the
machinery ran with the key defaulted-off.

**Insight / the law.** Merging into the living config must be **deep**, and legacy config shapes are honoured
only through the bare constructor path — never by a shallow merge that lets an old stored object mask a new key.
When a fix appears to have no effect, **prove the live path first** before doubting the fix: confirm the key is
present in the config the session actually reads.

**Consequence / enforcement.** Deep-merge the stored config against the current defaults on load; route legacy
shapes through the constructor, not a shallow spread. Diagnosis order for an inert fix is fixed: live-path proof
FIRST, fix-logic doubt second. Related: the same "prove the live path" discipline is the enforcement side of
Lesson 191's live==replay trust rule.

## Lesson 194 — The Unit Law: A Number Compared Against The Frame Must Be Expressed As A Fraction Of The Frame

An absolute pixel value that lives in a coordinate space somebody will later change is a defect with a delay
fuse. It is correct on the day it is written and wrong on the day the space moves, and nothing announces it.

**Context.** Four separate defects on the camera branch were the same mistake wearing different clothes: the
sprite floor written as `32 px`; the name-tag size as `max(8, …)` px; the zoom unit measured in _this track's_
width, so one setting meant a different picture on every track; and the reference canvas declared independently
in four files that all had to agree, with nothing making them agree. Each was found separately, diagnosed
separately and fixed separately before anyone noticed they were one family.

**Insight / the law.** If a number is compared against something on screen, express it as a **fraction of the
screen** — or of the one fixed reference the screen is derived from. `minDrawnFrameFrac` (a share of frame
height) cannot rot the way `32 px` did; `visibleCorridors` against a fixed standard corridor cannot mean two
things on two tracks the way "track widths" did. The test is mechanical: say out loud which space the number
lives in. If the answer is "pixels, on whatever canvas we happen to have", it will drift.

**Consequence / enforcement.** A new camera or layout constant in absolute pixels needs a written justification
for why its space cannot move. The reference canvas has ONE home (`projection.js`); the corridor unit has ONE
home (`zoomUnit.js`); the framing defaults and their validation bands have ONE home (`framingConfig.js`).
Sibling of the bsX/bsY family: same shape, different quantity. Evidence:
reports/evolution/CAMERA-MIN-DRAW-1.md, CAMERA-TAGS-1.md, CAMERA-ZOOM-UNIT-1.md, CAMERA-REFERENCE-WIDTH-1.md.

## Lesson 195 — The Chord Law: A Formula Right On The Axes And Wrong Between Them Passes Every Axis-Aligned Test

Test fixtures gravitate to horizontal and vertical because they are easy to reason about. A geometry bug that is
exactly right at 0° and 90° and wrong at 74° will therefore never be caught.

**Context.** The leader forward-framing shift used `|cos|·W + |sin|·H` as "how far the frame reaches along this
heading" — a BLEND of the two side lengths, whose weights sum to as much as √2. On the axes it is exactly right.
At the owner's 74° heading it read 1091.4 px where the frame actually reaches 759.9 px, so a 0.66 framing
fraction displaced the leader 23.0 percentage points instead of 16.0. Every existing test used an axis-aligned
heading, so nothing failed. The correct quantity is the rectangle's actual chord through the centre.

**Insight / the law.** For any geometry that takes a DIRECTION as input, the axis cases are exactly the ones
that cannot discriminate. Test an arbitrary angle that is neither an axis nor 45°, and derive the expected value
from the geometry independently rather than from the formula under test.

**Consequence / enforcement.** Direction-taking geometry gets a non-special-angle test with an independently
derived expectation. Sibling of L194 — same family (a quantity that is right in the space it was written and
wrong in the space it is used), different axis. Evidence: reports/evolution/CAMERA-PICTURE-FIXES-1.md,
`frameGeometry.js`.

## Lesson 196 — The Dead-Instrument Law: A Reading Nobody Has Seen Move Is Indistinguishable From No Reading

A counter, a control or an assertion that has not been observed to CHANGE is not evidence of anything. It looks
like coverage on the page and provides none.

**Context.** Three shapes of one failure, all found in a single hygiene pass. `clampActiveCount` was a
diagnostic counter whose only writer had been deleted two blocks earlier: it returned a literal 0, a comment
claimed it still watched the glide, and a test asserted it stayed 0 — a test that could not fail under any
change to any file. The detour log carried three columns recording, on every frame, that the mechanism which no
longer exists did not happen. And twenty per-state timing scalars were returned and stored beside the maps
holding the same values, read by nothing but their own assertions — so a wrongly-built map would have gone
unnoticed while its tests stayed green.

**Insight / the law.** Ask of every reading: **what would have to change for this to read differently?** If the
answer is "nothing", it is not an instrument. This is Lesson 187's proof-of-live standard turned inward, onto
the codebase's own diagnostics and its test suite: a test that cannot fail is indistinguishable from no test,
and a counter that cannot move is indistinguishable from a constant.

**Consequence / enforcement.** When a mechanism is deleted, delete its instrumentation in the same commit —
counters, log columns, and the assertions that read them. Assert on the value production code CONSUMES, never on
a mirror of it. Prefer a test that can be SHOWN to fail: sabotage it once, watch it go red, restore. Evidence:
reports/evolution/CAMERA-HYGIENE-2.md.

**THE UNIFORM NEGATIVE, added 2026-08-18.** The same law has a second face, and it is the one that
costs time rather than coverage: **an instrument that answers "none" everywhere is more likely
reporting its own bug than a clean world.** A guard that found no losses on any of ten tracks, a
sweep that returned zero firings on every seed, a search that matched nothing anywhere — each is
formally a reading, and each is exactly what a broken query, an unbuilt input or a wrong path also
produces. The question is Lesson 196's, asked of a negative: **what input would make this say
something else, and has it ever said it?** If the instrument has never been seen to report a
positive, its "none" is not a result. Run it against a case known to be positive — sabotage one — and
watch it speak, before believing the zero. The cheapest version of this is to keep one deliberately
failing fixture in the harness forever.

## Lesson 197 — The Propensity Law: Making A Dial Real Turns Every Downstream Assertion Into A Coin Flip

When a setting stops being decorative and starts genuinely deciding something probabilistic, every test that
depended on the old determinism silently becomes a sampling experiment — and a suite that fails one run in ten
trains people to press re-run instead of reading.

**Context.** CAMERA-WEIGHTS-1 gave the four state weights a real meaning: a propensity, where `battleWeight` 0.8
means "take this shot about eight times in ten when it is offered". It was the right change and it was measured.
But eighteen existing tests asserted "the gate opened, therefore the state was entered" — true before, a coin
flip after. COMEBACK at weight 0.6 fails 0.4^4 = 2.6% of runs on its own even with three retries, and the union
across all eighteen is roughly one full-suite run in ten. It went unnoticed for a commit because the individual
failures looked like unrelated flakes.

**Insight / the law.** Introducing randomness into a decision path is a **suite-wide** change, not a local one.
Find every assertion downstream of the newly-random decision and make it deterministic on purpose — by pinning
the probability to its certain value, NOT by seeding: a seed pins the stream, and any later change to draw ORDER
silently unpins it again.

**Consequence / enforcement.** After making any gate probabilistic, force the generator to both extremes and run
the suite. At "always decline", every test that was really asserting the gate goes red and names itself; at
"always accept", what remains red is the set genuinely about the lottery. That two-run sweep is the whole audit
and it takes minutes. Evidence: reports/evolution/CAMERA-HYGIENE-2.md.

## Lesson 198 — The Silent-Seam Law: An Optional Call Across A Module Boundary Fails Quietly Forever

`a?.b?.()` does not throw when `b` is renamed. It evaluates to `undefined`, the caller's `?? null` turns that
into a plausible-looking answer, and the feature stops working with no error, no failing test, and no
fingerprint movement.

**Context.** The render path asks the camera who is currently in a battle, in order to darken everyone else:
`camDirRef.current?.detectBattleGroup?.(st.racers) ?? null`. Rename the method and the darkening simply stops.
Every camera test still passes, because the DIRECTOR is fine. The camera fingerprint does not see it either,
because darkening is render, not direction. This is the mint tripwire's motivating case from the other
direction — there, a value computed in a render file and consumed by the engine.

**Insight / the law.** Optional chaining across a module boundary converts a loud failure into a silent one, and
it gets used precisely where the boundary is least stable. The two ends must be pinned to each other by
something that is neither end: a test that reads the CALLER's source for the call shape and exercises the CALLEE
for a real answer.

**Consequence / enforcement.** Every optional cross-module call gets a contract test at both ends, verified by
sabotage — rename each side in turn and watch the right assertion go red. Match the call AS a call, never as a
substring: a `toContain` on the method name passes happily while the call site says `nameRenamed?.(`. Evidence:
reports/evolution/CAMERA-HYGIENE-2.md, the contract test at the foot of `CameraDirector.test.js`.

## Lesson 199 — The Overrule Law: A Guarantee That Can Silently Beat The Owner's Own Control Is Not A Guardrail, It Is Steering

**What happened.** `visibleCorridors` is the owner's control: it says how much world he wants in
shot. The CORRIDOR guarantee — "the whole road stays in frame" — was applied as a ceiling on top of
it. On six of ten tracks it won, and it won _silently_: his LEADER 1.0 asked for 300 world px and
delivered anything from 300 to 688 as the road turned (Mountainstreet, 96.2% of frames). Nothing in
the UI said his number had been overruled; the shot simply breathed, and he described the result as
restless without being able to name the cause.

Worse, a second guarantee — the COMPANY guarantee, reading his own `minRacersVisible` — was live in
that same shot the entire time and **could not be heard**, because the corridor was always stricter.
He had a control that did nothing on most of the map and did not know it.

**The law.** A guarantee may _widen_ what the owner asked for only when it protects something he
would agree matters more, and he must be able to tell that it did. A guarantee that routinely
overrules a control, on most content, with no visible trace, has stopped being a guardrail and
become the actual author of the shot. **Guardrails bind at the edges; if yours binds in the middle,
it is steering.**

**The test that would have caught it.** Not a unit test on the guarantee — that passed. The number
nobody computed: _how often does this ceiling, rather than the user's setting, decide the result?_
Any guarantee applied via `Math.min` against a user value should report its bind rate.

**See also** Lesson 192 (clamps are guardrails, never steering) — this is its config-facing twin:
192 is about a clamp steering the _camera_, 199 about a guarantee steering the _owner_.

## Lesson 200 — The Window Law: Perceived Camera Speed Comes From The Size Of The Window, Not From What The Number Means

**What happened.** The proposed fix for Lesson 199 was to redefine the unit: `1.0` would mean "this
track's own road width" instead of a fixed 300 px reference. It is a better-sounding definition — the
number would mean the same _thing_ everywhere — and the measurements supported it as far as they
went.

The owner built it, watched it on searound at the values his unit would deliver (0.62 / 1.25), and
rejected it for a reason no measurement in this project would have produced: **a smaller window means
the world moves through it faster.** Same racer speed, same physics, smaller frame — and the picture
became restless. The virtue of the fixed reference, which nobody had written down, is that a fixed
amount of world means the same _sense of camera speed_ on every track.

**The law.** How fast a camera feels is a function of world-units-per-second crossing the frame,
i.e. of the WINDOW SIZE — not of the semantics of the setting that produced it. Two definitions that
are equally principled can feel completely different, and the difference lives in perception, not in
geometry.

**Why this is a lesson and not a note.** Everything measurable pointed the other way. The
project has ten tracks, three fingerprints and a dozen harnesses, and **not one of them measures
apparent speed.** The constraint that decided the whole design arrived through the owner's eye in a
single sentence. When a design question is about how something FEELS, the eye is not a slower
substitute for a measurement — it is the only instrument that exists.

## Lesson 201 — The Half-Repair Law: One Value, Several Readers, One Fixed — And The Test Covers The Fixed One

**What happened, twice in one week.** The build identity had **three** readers: the HUD pill, the
`[RA CAMERA LIVE TRUTH]` console line, and the camera marker's `build` field, all reading a
`__RA_COMMIT__` Vite define that froze when the dev server started. BUILD-TRUTH-1 diagnosed the
freeze correctly, moved **one** reader (the pill) to a live source, and wrote tests — for the reader
it had just fixed. The other two kept printing the frozen value.

The consequence was not a cosmetic bug. The console line printed `77919708` twice, hours apart,
across two _different_ pills, and that contradiction halted a shippable, owner-approved block
(CAMERA-COMPANY-ONLY-2) on its own falsehood. **The instrument lied, the code was fine, and the
stop rule fired on the instrument.** The same shape appeared in the corridor guarantee (see 199): one
concept, two consumers, only one heard.

**The law.** When a value has several readers, repairing one and testing that one produces a system
that is _more_ confidently wrong than before — because the fixed reader now vouches for the broken
ones by association. **The unit of repair is the VALUE, not the call site.**

**The test that catches it is the RELATIONSHIP, not the artefact.** Testing any single reader passes.
What works: assert there is exactly one source (no reader may reference the old one, and the old one
must not be declarable), and assert that **the artefacts cannot disagree** — derive each the way the
app derives it and compare them to each other. That test is stronger than three separate tests of
three readers.

## Lesson 202 — The Capture Law: Refactoring A MEASUREMENT Tool Without Capturing Its Output First Is Not A Refactor, It Is A Rewrite With No Test

**What happened, three times in one week.** A change that looked clean, ran without error and produced
no warning was wrong, and each time only a BEFORE capture caught it:

- `edge-crossing` returned **230 crossings of 90102 frames** where it had returned **215 of 90237** —
  a blanket `continue` → `return` had turned a `continue` that skipped to the next SUBJECT inside a
  `for` loop into a `return` that abandoned the whole FRAME. 7% wrong, silently.
- `--owner-unit` set `referenceCorridorPx` **after** the camera director had been constructed from the
  config, so an entire measurement arm would have silently measured the unmodified default.
- The build-identity pill was repaired while two other readers of the same value were not, and the
  tests covered the repaired one (Lesson 201).

**Why a measurement tool is the special case.** Ordinary code announces a bad refactor: it throws, a
test fails, a screen looks wrong. A measurement tool's output is _numbers nobody has seen yet_ — it
cannot look wrong, because the only thing that knows what it should say is the version you just
replaced. **Its previous output IS its test, and it is the only one that exists.**

**The law.** Before changing a script whose product is numbers, capture its current output verbatim,
at its current parameters, including every flag variant. After the change each must reproduce its own
output EXACTLY — not "close", not "within rounding". A number that moved is a finding to REPORT before
it is a bug to fix: it may be the refactor that is wrong, or it may be that every figure the tool has
ever produced was.

**And compare against the CAPTURE, not against a memory.** The same week a remembered figure (0.999)
nearly produced a false alarm about a correct port; the capture said the run was exact, and the memory
was a number from a different arm. **A remembered number is not a baseline** — and this is the half a
careful person skips, precisely because they remember it confidently.

## Lesson 203 — The Late-Write Law: Configuring An Object After It Has Read Its Config Fails Silently, And Only A CONSEQUENCE Test Catches It

**What happened.** `his-shot-truth --owner-unit` set `cfg.referenceCorridorPx = trackWidth` one line
_after_ `buildRace(geo, identity, cfg)` had constructed the `CameraDirector`, which reads the config
once and computes every zoom level from it. The assignment landed on an object nobody would read
again. **That arm would have run, printed a full table, and measured the unmodified default.**

Same shape as the camera toggle that never reached a running race (`RaceScreen` reads its config once
at mount) and as the `__RA_COMMIT__` define that froze at dev-server start. **Write-after-read, where
the reader has already finished.**

**The law.** When a value is consumed at construction, writing it afterwards is a no-op that looks
exactly like configuration. Nothing throws, nothing warns, and the code reads correctly top to bottom
— the defect is in the ORDERING, which is invisible at the call site.

**Can a test catch it generally? Partly, and the honest answer matters.** No lint or type can see it:
the assignment is valid, the object is real, the field exists. What catches it is a **consequence
test** — assert that flipping the switch CHANGES SOMETHING. Not that the flag is set, not that the
config carries the value, but that the output moves:

> A switch is tested by proving its two positions differ. A test that only asserts the switch is ON
> passes just as happily when the switch is disconnected.

All three instances would have failed that test on the day they were written. It does not prevent the
write-after-read; it makes the write-after-read _fail loudly the first time_, which is all a test can
honestly promise.

## Lesson 204 — The Mute-Instrument Law: An Instrument That Can Detect Its Own Failure Must Be Able To Report It, Or The Diagnosis Costs A Day

**What happened.** The build badge went amber — `build unknown` — on a running dev server, and blocked
an eye test, because a verdict on an unidentifiable build is worthless. The badge was working exactly
as designed: BUILD-TRUTH-1 had made it refuse to print a stale value with confidence, and it refused.
But `readBuildInfo()`'s git helper discarded `stderr` (`stdio: [_, _, 'ignore']`) and its catch
returned `''`, so the instrument could detect that it had failed and could say nothing about why.

**What that cost.** The diagnosis had to work from outside. Six hypotheses were refuted by
experiment — repository state, PATH, the process environment (all 104 variables, reproduced exactly),
resource exhaustion, Defender ASR, and the file watcher — and every one came back clean, which
narrowed the answer to "something about that process" and stopped there. The evidence that would have
named it had existed for a few microseconds inside a `catch` block fifteen hours earlier and been
thrown away on purpose.

**How it ended.** Capturing the exit status took four lines. The moment the reason existed, the live
server printed it: `exit 3221225794` = `0xC0000142`, STATUS_DLL_INIT_FAILED — a Windows
process-creation failure. git never started. Six refuted hypotheses collapsed into one line, and the
one-sentence fix (restart the process; a file save is not enough) followed from it directly.

**The law.** _Detecting_ a failure and _explaining_ it are two different features, and shipping the
first without the second builds an instrument that can only ever say "no". The test is not "does it
notice when it breaks" but **"if it breaks at 3 a.m. and nobody is watching, does the artefact it
leaves behind name the cause?"** A colour is not an artefact. A status code is.

Note the shape against [Lesson 201](#lesson-201--the-half-repair-law-one-value-several-readers-one-fixed--and-the-test-covers-the-fixed-one):
the half-repair made the system confidently wrong; this makes it honestly useless. Honestly useless
is much better — and it is still not finished. The rule for anything that guards correctness here:
**the failure path carries its reason, and the reason reaches a human without being asked.**

## Lesson 205 — The Shared-File Law: A Test That Mutates A TRACKED File Cannot Coexist With A Guard That Reads It

**What happened, twice, in two different files.** A guard's test needs to prove the guard FAILS, so it
sabotages the document the guard reads. The obvious way is to edit the real file and put it back in a
`finally`. `check-measured-stamps.test.mjs` did it to `docs/CAMERA_DIRECTOR.md`; `gen-engine-reach-doc.test.mjs`
did it to `docs/SIM.md`. Both worked perfectly when run alone.

**Why alone is the wrong test.** `npm run verify` runs the doc guards and the script suite
CONCURRENTLY — that is the whole point of it. So the guard reads the document during the window its
own test has it mutated. The first instance failed verify with a `depends` path that exists in no
commit. The second failed with `UNKNOWN: -4094, open .../docs/SIM.md`: on Windows a concurrent reader
holding the file makes the write fail outright. **Measured: 0 failures in 25 runs idle, 1 in 8 under
the load verify itself creates.** With retries at zero, that is a red build, not a wobble.

**And the flake is the lesser half.** A crash between the sabotage and the `finally` leaves the
TRACKED document corrupted in the working tree, and nothing fails to say so. The damage lands on a
file the test does not own, after the test is over.

**The law.** A test owns only what it created. If proving a guard can fail requires a broken
document, the test makes a COPY and points the tool at it — which means the tool needs a way to be
pointed, and that flag (`--doc=`) is a test-visibility feature worth adding rather than a smell. The
`finally` is not the fix: it narrows the window and cannot close it, because the window is another
process's read, not this process's control flow.

**The tell, so it can be spotted in review:** a test that reads a path it did not create, writes it,
and restores it. Three lines that look responsible and are not.

## Lesson 206 — The Complete-Input Law: A Guard That Names A Cause Must First Prove Its Own Input Is Complete

**What happened.** `check-measured-stamps.mjs` asks a HISTORY question: is the commit a measured
number is stamped at an ancestor of the newest change to what it measures? It turned CI red with:

> FAIL: docs/CAMERA_DIRECTOR.md: "tracking-lag (median/p95 pp per state)" is stamped at commit
> 3e756a31, which does not exist.

Every word of that is what the guard observed, and the conclusion it points at — _the document is
wrong_ — was false. `actions/checkout@v4` clones at depth 1. The commit existed; the guard could not
see it. The document had nothing wrong with it at all.

**Why this is worse than a guard that simply breaks.** It named a party, and the named party was
innocent. The cheapest response to that message is to edit the document until the guard stops
complaining, which would have destroyed a correct stamp to appease a broken environment. A guard that
misattributes trains people to make the codebase worse.

**The law.** Before a guard reports a verdict, it must establish that it can SEE what the verdict is
about. `git rev-parse --is-shallow-repository` is one line; the guard now refuses to answer in a
shallow clone and names `fetch-depth: 0` as the fix. Refusing is the correct third state — not
passing (which would be a silent no-op, Lesson 187) and not failing against the content.

**Against [Lesson 204](#lesson-204--the-mute-instrument-law-an-instrument-that-can-detect-its-own-failure-must-be-able-to-report-it-or-the-diagnosis-costs-a-day).** L204's instrument knew it had failed
and could not say why — honestly useless. This one did not know it had failed, so it explained
confidently, and blamed the wrong thing. **Detecting a failure, explaining it, and knowing whether
you are entitled to an opinion at all are three features. L204 added the second. This is the third,
and it comes first in execution order:** an instrument with incomplete input has no verdict to
report, however well it can describe what it saw.

**Also recorded from ONE-TRUTH-2, and deliberately NOT laws — two observations, one line each:**

- The `PASS n FAIL n SKIP n` counts added in stage 6 caught a defect built in the same block, which is
  the earliest a new instrument can pay for itself.
- Stage 6 mechanised the write-proof for `scripts/`, and the very next commit lost an edit in a
  throwaway helper — mechanisation reached the named place while the error lived in the unnamed one.

## Lesson 207 — The Copied-Default Law: A Fallback That COPIES A Default Is A Second Opinion Waiting To Happen; One That READS It Cannot Disagree

**What happened.** The project wrote fallbacks as literals for years —
`config?.minRacersVisible ?? 5` — and the convention was explicit: a partial-config caller should get
the shipped value without importing anything. `check-fallback-agreement.mjs` then counted them:
**361 mirrored fallbacks, and 42 already disagreed with the default they mirror.** Not one had been
noticed by a person. MIN-RACERS-5 found one the hard way: the default moved 3 → 5 and the fallback in
`framingConfig.js` stayed at 3, so the shipped path and the fallback path would have framed
differently — and only the shipped path is covered by the fingerprints.

**Why the convention was wrong.** A copied default has to be maintained in two places by whoever
happens to remember. That is not a convention, it is a standing invitation to drift, and the 42
measure how often the invitation was accepted. Worse, the FALLBACK-42-TRIAGE block established that
almost all of the 42 are UNFIREABLE — every shipped caller resolves its config against the defaults
first — so the drift was invisible in behaviour AND wrong as documentation: a reader learns the wrong
default from a line that never runs.

**The law.** **A fallback reads the default; it does not copy it.**
`config?.k ?? DEFAULT_X_CONFIG.k` cannot disagree, because there is only one value. Where a constant
holds the fallback, define the CONSTANT from the default — the reference then covers every use of it.

**EXTENDED 2026-08-19 — the owner's ruling closed the exception, and closed the question.** This
lesson used to carry an exception: an OFF-arm switch was not a mirror and kept its literal. **It is
gone.** He rejected the question the exception rested on — *"should a missing key mean OFF or the
shipped value"* — because **no key is ever missing**: every loader walks the full key set of its
defaults, so the fallbacks exist only for callers that pass NO config, and the only such callers are
tests and harnesses. The rule is now unconditional and lives as [VERIFY-RULES R14](VERIFY-RULES.md).

**Two traps found by walking into them, both the inverse of the original defect:**

- **Deleting a mirror can CREATE a second definition.** Removing `?? false` makes an absent key
  resolve to `undefined`, which is falsy — so a config-less caller silently runs the feature OFF.
  A definition by omission is worse than a literal, because nothing names it and no guard counts it.
- **A copy that AGREES is invisible to every runtime check.** Five keys in `heroCurveGenerator.js`'s
  `GENERATOR_CONFIG` re-typed shipped values and all five matched, so `check-fallback-agreement` —
  which reports DISAGREEMENTS — could never have spoken. They were found by hand. **The rule is a
  property of the SOURCE, not of a value**, which is why the test that catches this one reads the
  source rather than comparing numbers.

**The one exception, and it must be stated at the site:** a fallback that is deliberately a DIFFERENT
value from the default — an OFF-arm switch, where an absent key means "the world before this feature"
— is not a mirror at all. It keeps its literal AND its reason. Nine of the 42 are this shape.

**The corollary for guards.** When MIRRORS-BY-REFERENCE converted the constants, the guard turned two
green entries into UNRESOLVED, because its resolver only understood literals — it would have
penalised exactly the fix it exists to encourage. **A guard that rewards the old shape and cannot
read the new one is an argument against improving the code.** It now resolves
`const X = DEFAULT_Y.k` as by-reference, and reports a constant that names a DIFFERENT key as the
defect it is.

## Lesson 208 — The Admissible-Set Law: When A Bound Is The Boundary Of What Is Possible, No Shape Inside It Can Beat It

**What happened.** The owner asked for one thing: the run-in's close should be EVEN — "zoom in
softly, at the speed necessary for that particular track, but at a UNIFORM speed". Six shapes were
built for that sentence over two days and five were reverted, each on its own measurement: pin the
line on screen (defeated by the target-versus-delivered lerp), anchor on the line (no placement value
has a solution), release on a borrowed constant rate (this camera has none — every sibling is a
duration or a time constant), walk the zoom evenly toward the line ceiling (the destination runs
away), walk toward the state's own zoom instead (the walk is invisible: the ceiling binds on a median
91% of closing frames), schedule the line's PLACE in frame so the resulting zoom is even (it needs
the line OUT of frame on 9 of 9 tracks, by up to 2.46× the room ahead of the anchor).

**Insight / the law.** Keeping the finish line in frame requires `zoom ≤ room / needed`. The distance
`needed` falls to zero at the crossing, so that bound rises hyperbolically while `room` shrinks as the
leader travels forward across the frame. **`_lineCeiling` is therefore not one option among several —
it is the BOUNDARY of the admissible set, and it is already the fastest close that keeps the
promise.** An even close is a chord between two fixed ends; the boundary is convex; they cross. So
while the ENDS of the close are fixed, "even" and "the line stays in frame" are not both obtainable,
and no seventh shape changes that.

**The general form, which is the part worth carrying.** When a requirement is expressed as a bound
and a second requirement asks for a particular SHAPE inside it, ask first whether the bound is a
CONSTRAINT the design may trade against or the EDGE of what the geometry permits. If it is the edge,
the only levers left are the endpoints — and those are usually somebody's taste rather than anything
derivable. **Six shapes is what not asking that question costs.** Each of the five failures was
correct work that measured its own wall honestly; none of them could have succeeded.

**Consequence / enforcement.** Price the ask before building it. `scripts/diag/runin-line-schedule.mjs`
answers this specific one in a single run, in the line's own units, before a line of the director is
touched. Evidence: reports/evolution/RUNIN-LINE-1.md §64; docs/DEAD-ENDS.md §O.

## Lesson 209 — The Inert-Enforcement Law: A Check That Cannot Fail Is Not A Check, And It Looks Identical To One That Can

**What happened.** Four instances in one week, all found by looking rather than by anything going
red. **(1)** The end-to-end suite had been failing for about two months and nobody knew, because
nothing ran it on a schedule and its red was not anybody's inbox. **(2)** A pre-commit hook enforced
nothing in a fresh clone: it was installed by a step that only ran locally, so the repository's rule
existed on the machines of people who already knew it. **(3)** A hook file was present, tracked and
correct — and not executable, so the shell skipped it silently and every commit passed. **(4)** A
workflow GitHub's own UI listed as live could never run: its trigger named a branch that no longer
existed, and the listing showed the file, not its reachability.

**Insight / the law.** Every one of these looked exactly like enforcement from the outside, which is
the point: **a guard, hook, suite or workflow that has never been observed to FAIL is
indistinguishable from one that cannot.** This is Lesson 196 turned outward — that lesson asks what
would have to change for a READING to read differently; this one asks what would have to change for
an ENFORCEMENT to fire, and the answer "nothing" is just as fatal and much harder to see, because the
green is real and the machinery is present.

**Consequence / enforcement.** For every check the project relies on, record the last time it was
seen RED and what made it red — a deliberate sabotage counts and is the cheapest version. Ask of a
new check: who receives its failure, on what schedule, and what breaks it. **A check nobody receives
is a check nobody has.** Evidence: reports/night/NIGHT-2026-08-17.md.

**FIFTH INSTANCE, 2026-08-19, and the sharpest — a check that CAN fail, DOES fail, and is called by
nobody.** `checkSeparation` was exported from `heroCurveGenerator.js` and referenced only by its own
test file: never a gate, never a rejection, never a retry. Measured across 120 generated plans it
**failed 98 % of bunched-field plans**, and had been doing so for as long as the B2 attackers have
been on. Nothing was red, because nothing asked. **Two specs in a row were then written on the
assumption that a `false` did something**, and the assumption was only broken by grepping for its
callers.

**The addition to the law:** "who receives its failure" has a prior question — **is anything calling
it at all?** A criterion nobody consults is indistinguishable from a passing one, and it is cheaper
to answer than any of the others: one search for the identifier. It now lives in the test file, which
is where its callers are.

**SIXTH INSTANCE, 2026-08-21 — a check that ran, printed a verdict per track, and compared against
`undefined`.** `check-runin-frame`'s rewritten line question imported `COMPANY_FRAME_PCT` from the
wrong module. The constant came back `undefined`, every margin computed to `NaN`, and **`NaN >= 0` is
false — so every track printed FINDABLE and the guard was green while measuring nothing at all.** It
was caught not by review but by a SANITY CHECK on the output: the same figure appeared on tracks the
guard passed and tracks it failed, and the number was exactly 3/201, which is not what a real
distribution looks like.

**The addition:** a check that reads a constant must ASSERT it read one. Every grader in
`scripts/` that grades against an imported threshold now throws if that threshold is absent or out of
range, with a message that says what it would otherwise be measuring — because the failure mode is
not a crash, it is a plausible green. Evidence: reports/evolution/VIEWER-INVARIANTS-1.md §5,
reports/evolution/ENDGAME-COMPLETE-1.md §5.

## Lesson 210 — The Blast-Radius Law: Ask Every Test Suite What It RUNS AGAINST, Because Two Different Doors Lead To Production Data

**What happened.** The browser suite reached the owner's real data twice, through two mechanisms
that have nothing to do with each other. **Playwright's `reuseExistingServer`** attaches to a dev
server that is already up instead of starting an isolated one — so a suite meant to run against a
throwaway instance silently ran against whatever the owner had open. And separately, **a spec
hardcoded the production API URL**, so isolating the front end changed nothing for that file.
Isolating one door leaves the other wide open, and the suite passes either way.

**Insight / the law.** A test suite's blast radius is not a property of the suite, it is a property
of every path by which it can acquire an address — the runner's config, an environment variable, a
default in a helper, and any literal in any spec. **"It runs against a test instance" is a claim about
all of them at once**, and it is only as true as the least careful file.

**Consequence / enforcement.** Ask the question explicitly of every new suite and write the answer
down: what does this run against, and what would make it point somewhere else? Pin the port and the
base URL in ONE place the specs read; forbid literals. Prefer a config that fails loudly when the
expected isolated server is absent over one that helpfully attaches to whatever is listening.

**THIRD DOOR, 2026-08-19 — the UNIT suite, through a component's own loader.** Four screen tests in
the vitest suite were making real requests to `http://localhost:4000`, and the proof was in the
output rather than in a config: the suite printed **`HTTP 401`**, which is an ANSWER — the owner's
dev server was replying to unit tests. Nothing was stubbed; mounting the component was enough,
because its hook fetches in an effect.

**Two consequences, and the second took a CI run down.** The tests were environment-dependent (with a
server up they resolved in milliseconds; with none they waited out a 3 s timeout — same assertions,
different path, decided by what else was running). And the work OUTLIVED the test: `withTimeout` never
clears its timer, so a request begun in one test logged after that test — and sometimes after the
whole file — had ended, which is
`EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending`.

**The addition to the law:** the blast-radius question is not only for end-to-end suites. **Any test
that MOUNTS a component inherits every address that component can reach.** The enforcement that
worked is a prohibition rather than a pin: `forbidNetwork()` records and throws on any `fetch`, then
asserts in `afterAll` that none happened — so a file that completes has PROVED no request was
started. Throwing alone is not enough; every loader wraps its fetch in a `catch`, so the guard's own
message went quietly into a warning and the file stayed green.

## Lesson 211 — The Single-Run Law: One Run Separates Nothing; It Is The REPEAT That Tells A Failure From A Flake

**What happened.** A browser suite showed 27 failures. One run could say that and nothing more.
**Five full runs settled it**: 27 of them failed every time and were real — the product had moved and
the specs had not — while a further 4 came and went at about two per five runs and were flakes with a
single shared cause. Repairing the 27 and hunting the 4 are completely different jobs, and no amount
of staring at the first run distinguishes them.

**Insight / the law.** A single run of a nondeterministic suite produces a SAMPLE, not a result. The
failure set of one run is the union of "broken" and "unlucky", and those two sets need opposite
treatments — one is fixed by changing assertions, the other only by finding the shared mechanism.
**The cheapest instrument for telling them apart is the same suite, run again.**

**Consequence / enforcement.** Before triaging a red suite, run it enough times to classify: a
failure that survives every run is a defect; one that comes and goes is a flake and needs its
mechanism found, never a retry. Report the count of runs alongside the counts of failures — "27 of 27
across five runs" is a finding and "27 failures" is a screenshot of one moment. And never let a retry
setting hide the distinction: a suite with retries on cannot make this measurement at all.

## Lesson 212 — The Along-The-Course Law: Distance In A Race Is Measured ALONG The Track, Never As The Crow Flies

**What happened.** More than one calculation in the camera reached for the straight-line distance
between two points because it was one `Math.hypot` away. On a closed track that number is not even
monotone as a racer approaches the finish — it falls, rises and falls again around the loop — so a
progress measure built on it walks backwards, a "remaining distance" shrinks while the racer is still
half a lap out, and a bound derived from it was wrong by roughly a factor of two in one recorded case
without ever looking wrong.

**Insight / the law.** The race's own coordinate is arc length along the shape. **Any quantity that
means "how far is he from that" must be expressed in the same coordinate the race is run in** —
`_runInProgressOf` and its kin — and a Euclidean distance between two world points is a different
quantity that happens to have the same units. The two agree on a straight, which is exactly why the
error survives testing: every straight-track fixture passes.

**Consequence / enforcement.** When a distance appears in a race calculation, name which of the two
it is at the site. Prefer the along-course measure; if a straight line is genuinely wanted (screen
fitting, for instance, where the frame really is a rectangle in space) say so and say why. Test on a
CLOSED track, because that is where the two disagree.

## Lesson 213 — The Suspect-The-Instrument Law: When A Derivation And A Measurement Disagree, Doubt The MEASUREMENT First

**What happened.** Repeatedly, and in both directions. A number that could be derived from the
geometry in two lines was contradicted by a harness reading, and the reflex each time was to accept
the reading and go looking for the mechanism that would explain it — which is expensive, because a
plausible mechanism can almost always be constructed. In the cases where somebody instead re-derived
first, the harness turned out to be measuring a different thing: grading a copy of the rule it was
grading, sampling frames that never land in the window under test, or reporting a clamped value as
though it were the raw one.

**Insight / the law.** A derivation has a short, inspectable chain: the geometry, the algebra, the
assumption. A measurement has a long one — the harness, its fixtures, the driver, the sampling, the
build it loaded, the units it printed. **When the two disagree, the long chain is where the error
almost certainly is**, and it is also the cheaper of the two to audit against a known case. This is
not "trust theory over data"; it is that a measurement is itself a piece of software and deserves the
same suspicion as the code under test.

**Consequence / enforcement.** On a contradiction, spend the first ten minutes re-deriving and the
next ten pointing the instrument at a case whose answer is known independently — never on
constructing a story that reconciles them. A story that reconciles a derivation with a broken
instrument is the most expensive artefact this project has produced more than once.

**EXTENSION (2026-08-21, START-CONTRADICTION-1) — the same suspicion is owed when the instrument
AGREES.** A contradiction at least starts an inquiry. A mislabelled readout that CONFIRMS what you
already believe ends one, silently, and nothing points at it afterwards. The camera HUD's `pan`
showed `100%` while the camera was 402 screen px from its target: `panProgress` measures travel from
the last STATE TRANSITION, and the start window contains no state change, so its reference was still
the constructor's zero and the ratio was two large numbers over each other. It read as "arrived". Two
readers — the owner and the assistant — took it as arrived, and three separate explanations of the
start were built on top of it before anyone opened the getter. **A readout's NAME is a claim about
what it measures, and it is the one part of an instrument that is never tested.** When a number
settles a question cheaply, read its definition before you spend anything on the answer.

## Lesson 214 — The Summary Law: The PROSE Of A Report Is A Claim, And It Is The Part That Travels

**What happened.** `SEPARATION-TO-TEST-1` scanned for exports used only by their own test file and
published a table with two categories, correctly labelled: one entry **"ONLY racerApi.test.js"** and
one **"referenced nowhere at all"**. Two paragraphs later its summary flattened them —
*"the two that look like genuinely unused product code"*. **That sentence is what reached the next
spec**, which was written to delete both. One of them, `deleteRacerSprite`, is imported and called
five times by its own test. The table was right for a whole day and the summary was what got acted
on.

**Insight / the law.** A report's numbers are checked; its prose is not. Nothing in this project
guards a sentence — `check-doc-facts` and `check-config-claims` read documents for stated VALUES, and
a summary that merges two categories states no value at all. **The summary is the highest-leverage
sentence in a report, because it is the only part a reader reliably finishes**, and it is the only
part with no instrument behind it. Writing "two things look unused" over a table that says one thing
is unused and one is test-only is not a rounding — it is a different claim.

**Consequence / enforcement.** When a report groups findings into categories, the summary **quotes
the categories, not the count**: "one referenced only by its test, one referenced nowhere" costs four
extra words and cannot be flattened. And when a spec arrives citing a prior report, re-establish its
premise from the tree before acting — the fifth unreachability claim in this repository to need that,
and the first false one written by the same author who then had to catch it. Evidence:
reports/evolution/DEAD-EXPORTS-1.md.

## Lesson 215 — The Exclusion-Set Law: A Count Is Defined By What It Leaves OUT, And That Belongs In The Number's Name

**What happened.** A scan for "exports used only by their own test file" reported **153**. It
excluded the defining file from the list of users — so a helper that a module uses INTERNALLY and
also exports for a unit test looked identical to one nothing uses at all. Adding a single check —
does the name appear more than once inside its own module? — took the answer to **19**. The same scan
run against object-literal defaults first reported **80 hits** that were all `min`/`max` slider
bounds colliding with real keys of `DEFAULT_BASE_SPEED_CONFIG`; excluding those two names by hand
took it to **zero**.

**Insight / the law.** Both numbers were produced by working code and both were wrong, in the same
way: **the exclusion set WAS the definition, and it was in the script rather than in the number.**
A count is not "how many X" — it is "how many X under these exclusions", and a reader who is given
only the first half will act on it. This is Lesson 213's suspicion of instruments applied to the
cheapest instrument there is: a grep is software, and its filter is its specification.

**Consequence / enforcement.** State the exclusions in the same breath as the figure, in the report
and in the script's own header — "19 exports used by nothing, **including their own module**", not
"19 unused exports". When a scan produces a number that feels large, the first hypothesis is the
filter, not the codebase: 153 and 80 both dissolved on the first look. `check-config-claims` already
carries the mature form of this — it names `min` and `max` as unscannable, by name, with the reason.
Evidence: reports/evolution/SEPARATION-TO-TEST-1.md, reports/evolution/ONE-HOME-1.md.

## Lesson 216 — The Denominator Law: Narrowing What A FRACTION Measures Is Not Automatically More Permissive

**What happened.** `checkSeparation` failed almost every shipped plan, and the diagnosis was that its
window ran past the point where heroes stop being steered. Narrowing the window looked like a purely
relaxing change — measure less, reject less — and the spec was written on that basis. It is not.
The criterion is *coincident samples ÷ total samples*, and the samples removed were the LATE ones,
where a diverging pair is far apart. For the documented `battle-collapse` archetype — two curves
together at the front, splitting at 0.6 — the numerator stayed at 7 while the denominator fell from
43 to 28, so the fraction went **0.16 → 0.25** and a passing archetype started FAILING.

**Insight / the law.** **A threshold on a ratio has two levers, and changing the window moves both.**
"Measure a smaller region" is monotone for a COUNT and undetermined for a FRACTION: it relaxes the
criterion only if the excluded region was, on average, more coincident than the region kept.
Whether that holds is a property of the data, not of the change — so it must be measured, per case,
not reasoned about from the direction of the edit.

**Consequence / enforcement.** Before narrowing what any ratio-based criterion measures, evaluate the
old and new forms on the SAME corpus and report both — for every archetype the criterion is supposed
to accept, not only the case that prompted the change. If a variant is wanted that is monotone by
construction, shrink the NUMERATOR alone and keep the denominator fixed; that form was built and
measured here too, and it is the one whose direction can be argued rather than tested. Evidence:
reports/evolution/SEPARATION-WINDOW-1.md.

## Lesson 217 — The Follower Law: A First-Order Follower Cannot Overshoot, So A Camera Ahead Of Its Aim Is Being Pushed By Something Else

**What happened.** The camera left the grid at the gun and ran up the track ahead of the field, and
four blocks in a row explained it: the entry time constant, the ceremony hold, the anchor changing at
three seconds, the world-edge clamp. Each was plausible, each was refuted by the owner's own frames.
The delivered centre was measured **138 world px AHEAD of the point the director had resolved as its
target**, while that target was moving forward. The pan is `offset += (target − offset) × lf` with
`lf ∈ (0,1)`: it approaches from behind and mathematically cannot pass. **The overshoot was proof
that something outside the follower was writing the position** — and it was: the camera zooms about
the WORLD ORIGIN, so a 15% change in zoom moved the frame's centre by 15% of its 1496 px distance
from that origin, about 225 world px per second of opening, while `CAMERA-SIDEJUMP-1`'s correction —
which exists to cancel exactly this — was skipped because `_focusAnchorRacer` returns null for the
group shots.

**Insight / the law.** **A first-order follower is a one-way mechanism: given a target, it can lag,
it can be slow, it can never arrive — but it cannot get ahead.** So "the thing is ahead of its
target" is not a symptom to be explained by tuning the follower; it is a PROOF that a second writer
exists, and the only useful question is which one. The corollary is the diagnostic: decompose the
observed motion into the follower's contribution and everything else, and the term with the wrong
sign names itself. Here `zoomPivot` read +79 world px per frame while `panTerm` read −5.

**Consequence / enforcement.** When a smoothed quantity is observed beyond its target, do not adjust
the smoothing, the duration or the target — none of them can produce the sign. Enumerate every write
to the quantity (there were eight in `CameraDirector.js`, and finding them took one grep) and
decompose per frame. And note the general shape: **a correction that is CONDITIONAL on an anchor is
absent wherever the anchor is null**, which is precisely where a group shot lives — the source had
even written that down and scoped the repair away from it. Evidence:
reports/evolution/START-OVERSHOOT-1.md (the term and its line),
reports/evolution/ZOOM-PIVOT-START-1.md (the repair and its ten-track measurement).


## Lesson 218 — The Proxy Law: A Metric That Is Not The Thing The EYE Judges Will Go Green While The Eye Says No

**What happened.** Three times in one investigation, over eight nights, a green number sat beside an
owner who was rejecting the picture in front of him. Each metric was correct, cheap and about the
right subject — and none of them measured what he was looking at.

**(1) The smoothed derivative.** Endgame smoothness was graded as `|d²ln(width)/dt²|` on a **5-frame
moving average**. It read 13.1 — comfortably green — while he reported the zoom hopping. The average
existed for a good reason (the second derivative of a 60 Hz signal is dominated by frame noise) and
it averaged away precisely the events he was seeing: **one frame changed the picture's width by 24.7%,
141 screen pixels at the frame edge.** An average can be smooth while individual frames jump.

**(2) The share.** "The line is findable in 88.0% of endgame frames" was reported as the residue of a
repair. He then pointed out that the frame he had photographed contains **no leader and no finish
line at all** — so the check had not MISSED his black frame, it had COUNTED it, as a twelfth of a
percentage. A run with one catastrophic frame is worse than a run with fifty near-misses, and no
share can say which it is looking at.

**(3) The value instead of the picture.** "Arrival: 0% error on every track" graded the **zoom
factor** at the crossing — the delivered width against the leader-view or photo-finish constant. It
was green on a frame where the winner sat in the top-left corner, half cut off, with the centre of
the frame empty. It would have stayed green with the winner off the canvas entirely, because nothing
in it asks what is IN the picture.

**Insight / the law.** Each of these is the same substitution: **the quantity that is easy to compute
stood in for the quantity that is judged.** A smoothed series stands in for a frame; a share stands
in for an event; a parameter stands in for the artefact the parameter was supposed to produce. The
substitution is invisible from inside the metric — it is correct arithmetic about a real quantity —
and it is only visible when someone LOOKS at the artefact and disagrees. **The owner's eye is not a
slower version of the metric; it is the thing the metric is a model of, and when they disagree the
metric is what is wrong.**

**Consequence / enforcement.** Three rules, each the direct inverse of one failure above.
**Grade the WORST SINGLE FRAME, never an average or a smoothed series** — publish the maximum and the
p99 of the RAW delivered series, and if a smoothed figure is also reported, say on the same line that
it is smoothed and by how much. **Report violations as EVENTS — seed, track, frame index, what broke
and by how much — never as a share alone**; a share may accompany them as context and may never be
the verdict. **Grade the ARTEFACT, not a parameter of it**: if the requirement is about what the
viewer sees, the check reads the delivered picture, and where an item genuinely cannot be graded from
the artefact the check says so in its own output rather than substituting something easier.
`scripts/endgame-sheet.mjs` is this lesson built: twelve requirements, each graded on the picture in
a real browser, printed together on every race so no single item can be optimised while another
quietly fails. Evidence: reports/evolution/ENDGAME-SCHEDULE-2.md §0 (the smoothed figure),
reports/evolution/ENDGAME-WHO-AND-HOWMUCH.md §0 (the share),
reports/evolution/WINNER-CROSSING-1.md §2 (the arrival value),
reports/evolution/ENDGAME-COMPLETE-1.md (the sheet that replaced all three).

## Lesson 219 — The Fixed-Seed Law: An Instrument Must Run The PRODUCT'S Configuration, Or It Is Measuring A Thing Nobody Ships

**What happened.** Every camera harness in this repository drove the director through
`scripts/lib/raceDriver.mjs`, whose run identity defaults the camera's random seed to the constant
`1439767152`. The browser had stopped doing that: it derives the camera seed from the race seed. So
for the whole life of those harnesses **no instrument had ever run the camera the browser runs**, and
a picture the owner reported could not be stood in by anyone, including him.

It was not a small gap. On space-sprint seed 9 — his own context, his roster, Race Plan on — the
BROWSER produces a frame with **no point of the course on the canvas** and, twenty frames later, the
leader **2806 px outside** it. The same race through `raceDriver` reports the run **clean**. Three of
forty swept seeds carry the defect at all; seed 9, the seed every table in this project uses, is one
of the clean ones on the fixed-seed harness.

**Insight / the law.** A harness has a configuration, and every default in it is a claim that the
default does not matter. **Where the product derives a value and the harness constants it, the
harness is not a faster version of the product — it is a different product**, and the difference is
invisible precisely because the harness is deterministic and repeatable, which reads as rigour. This
is the third proven divergence of the same shape in this repository: the camera's random seed
(CAMERA-SEED-AND-LINE-1), the whole draw path (RENDER-FINGERPRINT-1) and this one — and each time the
headless side was the blind one, and each time the OWNER found it and no gate did.

**Consequence / enforcement.** For every harness, list what it CONSTANTS that the product DERIVES,
and either derive it the same way or write the difference into the harness's own header as a declared
blind spot. Where the claim is about what the owner SEES, drive the real bundle in a real browser:
`scripts/viewer-invariants.mjs` does, on a fixed virtual clock so runs stay repeatable, and it is
wired into `docs/SHIP-CEREMONY.md` at step 0a so no camera change ships again without one real-browser
run. **And do not trust one seed:** the sweep exists because the defect lives on three seeds in
forty. Evidence: reports/evolution/CAMERA-SEED-AND-LINE-1.md §5 (the fingerprint that could not see
it), reports/evolution/VIEWER-INVARIANTS-1.md §0 and §3 (the divergence, measured).


## Lesson 220 — The Self-Referential-Check Law: A Verification Written From The Same Expression As The Thing It Verifies Cannot Fail

**What happened.** A 385-line function was being split into named steps under a hard rule: the
picture may not change, and the proof is byte equality of two fingerprints. The extraction carved the
last segment out with a slice that was off by one and **dropped that segment's final `return z;`**.
The script carried a check for exactly this — every line of each extracted block must survive into
the output — and the check passed, because it was built from **the same slice expression that had
made the mistake**. It compared the truncated block against itself and found it complete. The CAMERA
fingerprint, which knows nothing about the edit, caught it in twenty-five seconds.

The same script then failed its own assertions twice more, and those two failures are the control
that makes the point: a swap list that expected five call sites found a sixth, and a converter that
expected three early exits found a fourth. **Both assertions were written against something the
script did NOT derive — a count taken by reading the file — and both were right where I was wrong.**

**Insight / the law.** A check is only evidence to the extent that it could have come out
differently. **When the check and the operation share a derivation, they share the mistake, and the
green is a tautology rather than a result** — the check is not testing the operation, it is testing
that an expression equals itself. This is Lesson 209 (a check that cannot fail is indistinguishable
from one that can) sharpened to its commonest cause: not a missing caller or an unexecutable hook,
but a shared premise. It is also why "I verified the refactor by re-reading the diff" is worth so
little: a reading uses the same model of the code that produced the edit.

**Consequence / enforcement.** For any mechanical transformation of code, the verification must be
**independent of the transformation's own arithmetic**. Two shapes work and both are cheap. Take the
input from the UNTOUCHED source rather than from any intermediate the transformation computed — the
repaired check reads the whole original function body straight from the file on disk and requires all
100 of its statement lines to survive, with an explicit list of the two wrapper lines the edit is
allowed to replace. Or grade the OUTPUT with an instrument that has no idea an edit happened, which
is what a fingerprint is for. **Prefer the second: a behaviour-preserving change should be proved by
behaviour, and "algebraically the same" is not the standard when a reordered floating-point
expression can move a digit.** Evidence: reports/evolution/ENDGAME-REWRITE-1.md §4.
