# LESSONS.md — Insights from Development

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
`getInitialTracks()`/`loadAllTracks()`).

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

**Insight:** When two functions write the same variable, the frame-by-frame execution order determines which write the lerp actually consumes. Unit tests pass green for both writes: they test that each function *sets* the variable, not that the *lerp reads the right frame's value*. This class of bug is invisible to unit tests and only manifests as visual drift in the browser.

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
  ...rest,                         // all fields pass through automatically
  id: geometryId,                  // renaming
  backgroundImage: computedUrl,   // override
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
  img.onload = () => { if (!cancelled) { bgRef.current = img; setBgReady(true); } };
  img.onerror = () => { if (!cancelled) { bgRef.current = null; setBgReady(true); } };
  img.src = backgroundImage;
  return () => { cancelled = true; };
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
spread mechanic (minimum of N stochastic draws). The guarantee is on the *expected* last
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
`battleGapHysteresis=0.02`, `battleMaxDurationMs=4000ms`, `overviewCooldownMin=15s/Max=25s`.
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
occupied development over Etappe 20–23. Root cause: `Math.round()` in
`EditorShape.getPosition()` mapped arc-length-t to the nearest sample index instead of
interpolating linearly. Quantitatively measured (Etappe 23 trace): 26.5–27.1 px jumps at 500 samples
on a ~2000px oval at zoom 4×. Fix: 3 lines of linear interpolation + angle wrap.

**Process:** Before the root cause was identified, Python frame analysis scripts,
Playwright frame capture specs, 20 PNGs, and several bisect sprints on browser state artifacts
were executed (L65, L68). The diagnostic process stretched over several Etappen because the visual
observation ("double image", "twitching") without quantitative measurement led early into false bisects and
hypothesis roulette.

**Insight:** An algebraic proof of the `getPosition()` formula (L66: 3-line proof for
pixel invariance) would have identified the root cause in under 30 minutes. The ~14-hour
diagnosis arose through repeated omission of the "measurement before bisect" step.

**Consequence (principles extension):** This Etappe was the direct occasion for the extension
of PROJECT-PRINCIPLES.md by §6 (diagnose before fix) and §7 (no hotfixes) as well as the five
diagnosis-related conventions (quantitative diagnosis, data trace, output medium,
Etappe 23 pattern). The principles are formulated so that a similar marathon is recognizable and
stoppable: as soon as a diagnostic session skips the quantitative measurement and starts with
visual impressions or bisect, §6 is violated.

**Reference:** PROJECT-PRINCIPLES.md §6, §7; LESSONS.md L46, L50, L65, L66, L68, L69;
`docs/diag/render-smoothness-measurements.md`; commits `c8538e0`, `7333ec4`, `b53d7d6`.

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

**Insight:** A distance compensation formula must be normalized to the *actual target distance*,
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
computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, speedBonusFactor, finishT, isOpen, totalRows)
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
  : this._computeZoomForTargetSize(profiles.OVERVIEW?.spriteScale ?? 1.0, FALLBACK_REFERENCE_SPRITE_SIZE);
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

**Fix:** `finishOverviewLookbackPx: 300` (world pixels). Formula: `lookbackFrac = lookbackPx / pathLen`; then `lookbackT = normT − lookbackFrac`. `shape.getTotalLength()` provides the track-specific path length at runtime.

**Consequence:** Always check whether a parameter makes sense in T-space or world pixels. If the visual effect is a physical distance (e.g. "how far before the finish line"), then world pixels is the right unit — track-independent, intuitive for operator tuning.

**Reference:** `CameraDirector.js` `_finishOverviewLookbackPx`, `_transition()` + `_setTargets()`, `defaults.js` `finishOverviewLookbackPx: 300`. Phase 3D.

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
`lateralDamping = 0.25` means velocity decays to 25% per frame — enough inertia to smooth over single-frame sign reversals, not enough to prevent real avoidance from working.

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

**Reference:** `HorseRacerType.js`, `SnakeRacerType.js`, `RocketRacerType.js`, `MotorbikeRacerType.js`, `LugeRacerType.js` (displaySize increases). `scripts/audit-sprite-crops.mjs`, `scripts/crop-sprite-sheets.mjs`. Session 2026-06-03.

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

**Fix:** Replace with a dimensionless `speedBrakeTMultiplier` (default 1.5). Dynamic threshold computed per pair as `(spriteWorldSizePx / pathLengthPx) × multiplier`. This fires at the same relative proximity — 1.5 sprite-widths before contact — on every track and racer type regardless of path length or sprite size. Sim validation (700 races across 5 multiplier values × 7 tracks) confirmed 1.5 passes all cutoffs with the cleanest lateral-motion scores (lowest mean zigzag and lat).

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
const wrapDt = Math.min(rawDt % finishT, finishT - rawDt % finishT);

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
