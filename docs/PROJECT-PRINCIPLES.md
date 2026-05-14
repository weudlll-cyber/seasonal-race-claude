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

## 6. Diagnose before fix

For any non-trivial bug or behavioral anomaly, work begins with a diagnose sprint, not a
fix spec. A fix spec may only be written once the root cause is established by data or
algebraic proof — "sounds plausible" and "I think it's this" are not diagnose results.

Symptom-fixes may serve as a deliberately marked stepping stone when the diagnose sprint
shows clearly why the clean solution must follow. Stepping stones must be labeled as such
in the PR body with a forward reference to the clean-fix spec.

Siehe LESSONS.md L46, L48, L69.

## 7. No hotfixes

Quick workarounds that suppress a symptom without understanding the root cause are
forbidden — including under time pressure. When a bug is blocking, the correct response
is a prioritized diagnose sprint, not "bump maxScale" or "add a bypass flag".

The only exception is a deliberately marked stepping stone (see §6). Unauthorized hotfixes
are a design defect of the same severity as a failing test.

Siehe LESSONS.md L48; SPEED_REFACTOR_ANALYSIS.md.

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

Reports must distinguish between implementation-level confidence (code + tests) and visual
confirmation (observed in a running browser). Claims about UI elements "rendering" or
"appearing" should be phrased to make the verification source clear — e.g. "Component tests
confirm render output" rather than "Section renders in the modal". The user's browser test
remains the final visual check.

A separate visual smoke test in a real browser by Claude Code is not required
by default. The user performs the visual check, which is typically faster than
spinning up Playwright. Unit and component tests remain mandatory for UI-affecting
changes; Playwright e2e tests remain required when selectors or user flows change
(regression protection). Claude Code may run a visual check voluntarily when an
issue is hard to assess from code alone, or when the user explicitly requests it
in the prompt (e.g. "please verify visually before reporting").

### UX-Verifikations-Convention (Erweiterung der CC-Smoke-Test-Convention)

Bei UI-schweren Phasen kann zusätzlich zur normalen Smoke-Test-Spec eine separate
UX-Verifikations-Spec (`*-ux-verification.spec.js`) erstellt werden. Diese deckt
Verhaltens-Aspekte ab die funktionale Smoke-Tests nicht prüfen: Tooltip-Inhalte,
Indikator-Sichtbarkeit, Validation-Recovery, disabled-State von Buttons, Modal-Layout-
Konsistenz auf verschiedenen Viewports, State-Isolation zwischen aufeinanderfolgenden
Modal-Aufrufen. Die Spec wird permanent behalten als Regressions-Schutz.

Wann angebracht: neue Modals, komplexe Validierungsflüsse, Indikator-Systeme (Badges,
Markierungen), Formular-Felder mit Recovery-Verhalten, viewport-abhängige Layouts.
Einfache List-Views oder reine Daten-Anzeigen brauchen keine separate UX-Spec.

### Quality-Gate Convention

At phase completions, Claude Code runs a quality gate. Strategic Claude asks the user per PR
whether to apply the gate. Five sections: Source-Code Hygiene, File Hygiene, Security,
Architecture Consistency, Test-Coverage Plausibility. Severity: ✅ PASS / ⚠️ WARN (backlog) /
❌ FAIL (show-stopper). Strategic Claude reviews findings and presents a summary; user decides.
Pre-existing findings are separated from PR-introduced findings.

### App Language Convention

The application UI language is **English**. All UI strings — labels, tooltips, confirm dialogs,
error messages, button text, placeholder text, default track/category names — are written in
English. Code comments and documentation files may be German or English but must be consistent
within a single file. Existing German strings in the UI are tracked as B-15 and will be swept
in the B-Wave.

### Spec Writing Style Convention

Strategic Claude describes What + Why (requirements, API signatures, storage schemas, data
decisions, test expectations). Implementation (the How) is left to Claude Code. Code examples
in specs only when interfaces or APIs are being defined, not as implementation prescriptions
for internal function logic.

### Inline Doc-Maintenance Convention

Documentation updates ship in the same PR as the code that changes them — not in
separate doc-sprint PRs. Before creating a PR, Claude Code reviews BACKLOG, ROADMAP,
ARCHITECTURE, RACER_DATA_MODEL, TRACK_EDITOR, PROJECT-PRINCIPLES, and LESSONS for
relevance and updates whatever applies. The PR body includes a "Doc-Updates" section
listing touched files and one-line change summaries. Pure bugfixes without conceptual
change may explicitly skip doc updates by stating "Doc-Updates: none — bugfix only".
LESSONS.md is updated only when there is a genuine pattern to capture, not as a forced
ritual. Strategic Claude's chat report after each PR includes the same Doc-Updates
section so the next session has visibility without diffing files.

### CC Work-Update Convention

During implementation, Claude Code keeps progress updates to one sentence per step.
Detailed technical explanations, reasoning, and diagnostic findings belong in the
final report at the end of the task — not in intermediate chat messages. Rationale:
the user needs visible progress signals but not running technical commentary; shorter
intermediate updates also reduce context consumption.

### Quantitative Diagnose Convention

Diagnose sprints deliver numbers, not impressions. Before any fix of a behavioral anomaly,
the magnitude of the problem is measured or algebraically derived. For coordinate or
geometry bugs, a 3-line algebraic proof is written before any code change is committed.
For stochastic or dynamic bugs, a trace run is evaluated against concrete thresholds
(e.g. "94.1% of frame-pairs are below X px").

Siehe LESSONS.md L46, L50, L66, L69.

### Daten-Trace Convention

Visual observation ("I see it flicker", "the camera looks the wrong way") is a valid bug
signal but not a diagnose result. Before a hypothesis counts as confirmed, it must be
validated by instrumented trace, frame log, or empirical measurement. Browser bisect and
code changes are not initiated on the basis of visual impression — measure first, then bisect.

Siehe LESSONS.md L53, L65, L67, L68, L69.

### Output-Medium Convention

Persistent diagnose results belong in Markdown reports under `docs/diagnose/` or in the
in-screen diagnose HUD — not in `console.log`. Console output is permitted for one-shot
trace tools during active diagnosis (Etappe-23-Pattern: temporary, isolated commit, removed
together with the fix). Diagnose reports are committed to the repo so that Strategic Claude
and future sessions can read the data without running the code.

Praxis: `docs/diag/render-smoothness-measurements.md`, Phase-4 Diagnose-HUD Deliverable.

### Tests-grün Convention

Before every commit that touches logic, the test count is reported as baseline
("Baseline: 1728/1728 green"). After the commit, the new count is reported. Any deviation
is explained in the PR body: which tests removed, which added, which adjusted, which newly
failing and why that is intentional. A PR with failing tests may only be merged when the
failures are documented as deliberate with a reference to the follow-up fix.

Siehe LESSONS.md L1, L8, L17; docs/audit/audit-pre-merge.md.

### Regression Awareness Convention

Vor dem Ersetzen einer existierenden, funktionierenden Komponente wird explizit geprüft was
die alte Komponente konnte und was die neue können muss. Bei jedem Architektur-Ersatz oder
größeren Refactor:

1. **Inventur der alten Komponente** — welche Funktionen, welche Edge-Cases, welche
   User-Anforderungen werden aktuell erfüllt?
2. **Anforderungs-Matching** — kann die neue Komponente jeden Punkt erfüllen? Welche bewussten
   Trade-offs werden eingegangen?
3. **Rollback-Pfad** — wie kommen wir zurück falls die neue Komponente versagt? Branch,
   Commit-SHA oder Feature-Flag, explizit benannt in der Spec.
4. **Sanity-Check vor Merge** — User testet visuell ob die neue Komponente nicht schlechter ist
   als die alte. Bei erkennbarer Regression: Stopp, kein Merge.

Zugleich gilt: an einer nachweislich nicht funktionierenden Komponente wird nicht beliebig
lange weitergetuned. Wenn nach belegter Diagnose und zwei bis drei Fix-Versuchen keine spürbare
Verbesserung erreicht wird, ist Architektur-Wechsel die korrekte Reaktion — nicht ein vierter
Versuch am selben Mechanismus.

Die Regel ist ein Gleichgewicht: nicht voreilig wegwerfen, aber auch nicht ewig am toten Pferd
reiten. Entscheidung pro Fall, mit Belegen.

Siehe LESSONS.md L73.

### Test-Anpassungs Convention

Existing tests may be adjusted or removed when a deliberate refactor intentionally changes
the tested behavior. In that case the PR body explains: (a) what behavior changed, (b) why
the old test is obsolete, (c) which new test covers the new behavior. Tests that guard
correct behavior must not be silently deleted to make a PR green.

Siehe LESSONS.md L19; docs/internal/D3-5-1-diagnose.md §5.

### Diagnose-Tool-Lifecycle Convention (Etappe-23-Pattern)

Diagnose instrumentation (trace code, frame loggers, measurement scripts, HUD extensions)
is added in an isolated `diag:` commit — separate from the fix commit. Once the diagnosed
bug is fixed, the instrumentation is removed in the same merge or the immediately following
commit. This keeps the repo free of diagnostic dead weight and makes the `diag:` commit a
clean revert point if a refactor fails.

Beispiel: Commits `7333ec4` + `b53d7d6` (EditorShape staircase, Etappe 23).
Bestätigt in: docs/audit/audit-pre-merge.md §5.3.

### DevScreen Block-Placement Convention

When adding a new config field to the DevScreen (RaceTuningSection or any other section):

1. Place the field in the block whose **Reset handler** covers it — not in the nearest
   convenient `formGrid`.
2. After adding the field, verify: does the block's reset button actually reset this field?
   If not, either add the field to the correct handler or move the field to the right block.
3. A test that only checks `getByLabelText('...')` is not a block-placement test — it finds
   the element anywhere in the DOM. Write a block-level assertion if block membership matters.

Rationale: Silent reset-coverage gaps — where a field appears in block A but is reset by
block B's handler — are invisible to standard render tests and create confusing UX.

Siehe LESSONS.md L72.

### localStorage Staleness Convention

When a PR changes a **default value** in `DEFAULT_*_CONFIG` or `DEFAULT_*`, the PR body
must include a "localStorage Note" section stating:

- Which default values changed (old → new)
- That existing installations will retain the old value until the user clicks
  "Reset All Defaults" in the DevScreen or clears localStorage
- Whether the change is safe to ignore (cosmetic) or should be actively applied
  (behavioral, regression risk)

Rationale: localStorage overrides take precedence over code defaults. Silent default
changes appear to have no effect on machines with stored values, leading to confusion
in QA and support.

Siehe docs/diagnose/relaxed-defaults-report.md; docs/diagnose/cleanup-audit-pr98.md.

### Commit-Naming Convention

Commit subjects begin with a prefix followed by a colon and a brief summary. Permitted
prefixes:

- `feat:` — new behavior, new component, new module
- `fix:` — bug fix without behavior extension
- `refactor:` — restructuring without behavior change
- `docs:` — documentation updates (Markdown files)
- `chore:` — housekeeping (lint, dependency bumps, file moves without logic)
- `diag:` — diagnose instrumentation (subject to Etappe-23-Pattern above)
- `test:` — test changes without code change to the subject under test

Optional scope in parentheses, e.g. `fix(camera): …`. Any other prefix requires a
justification in the PR body.
