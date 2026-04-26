# RaceArena — Project Principles

Established 2026-04-26. These principles override convenience when they conflict.

---

## 1. Everything must be UI-configurable

Operators must never edit code to change settings, tracks, racers, or race behavior. All
tunable values — effect intensities, racer counts, branding, track geometry — belong in the
Dev Panel, track editor, or a config store. If a value can only be changed by touching
source code, that is a design defect.

## 2. Sprites over procedural drawing for racer visuals

Issue D ran three procedural attempts at a horse (brown blob, hidden-leg cream, narrow
stick-leg). None was recognizable at 22-26 px scale. Anatomical detail at small sizes
requires PNG assets. All new racer types use sprite sheets; no new procedural racer
bodies will be added.

## 3. One racer type per race

All players in a race share the same racer type. Coats (color variants) differentiate
players visually within the type. Mixed-type races are out of scope. This simplifies
camera, trail, and coat-assignment logic.

## 4. Single source of truth per concept

Each domain concept has exactly one field name, one storage key, and one code path.
Examples:
- `racerTypeId` — not `racerId`, `racerType`, or `type`.
- `racearena:racerTypes` — one key for racer-type cosmetics.
- `defaultRacerTypeId` on Track — one field for the default, not two dropdowns.

Duplication of intent (parallel fields, parallel trail systems, parallel cache maps for the
same purpose) is a signal that cleanup is needed before the next feature.

## 5. Three-party workflow for significant features

Strategic Claude (chat session) drafts design specs and architectural documents.
User (orchestrator) reviews specs and triggers execution.
Claude Code CLI executes self-contained specs: writes code, tests, docs, commits, opens PRs.

Specs delivered to Claude Code must be fully self-contained. No follow-up clarification
during execution. The PR body is the authoritative spec reference.

---

## Application Conventions

### Tooltip Convention

All new fields in the Dev-Screen whose meaning is not self-evident from the label get an
info-icon with a tooltip. Content: plain-language explanation of what the value controls,
sensible range / example values, and a note on extremes where relevant. Existing fields are
retrofitted in Phase T.

### CC Smoke-Test Convention

For merges with UI impact, Claude Code runs a Playwright-based visual smoke-test before push
and documents the result in the PR body. UI impact = new sprites/assets, UI refactor,
data-flow changes, race-engine changes. Pure code refactors without UI impact, doc sprints,
and storage-only migrations do not require a smoke-test. User final review remains mandatory
before every merge.

### Quality-Gate Convention

At phase completions, Claude Code runs a quality gate. Strategic Claude asks the user per PR
whether to apply the gate. Five sections: Source-Code Hygiene, File Hygiene, Security,
Architecture Consistency, Test-Coverage Plausibility. Severity: ✅ PASS / ⚠️ WARN (backlog) /
❌ FAIL (show-stopper). Strategic Claude reviews findings and presents a summary; user decides.
Pre-existing findings are separated from PR-introduced findings.

### Spec Writing Style Convention

Strategic Claude describes What + Why (requirements, API signatures, storage schemas, data
decisions, test expectations). Implementation (the How) is left to Claude Code. Code examples
in specs only when interfaces or APIs are being defined, not as implementation prescriptions
for internal function logic.
