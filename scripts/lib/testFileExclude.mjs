// ============================================================
// File:        scripts/lib/testFileExclude.mjs
// Project:     RaceArena — STAMP-CLOSURE-1
//
// THE PATHSPEC THAT KEEPS TEST FILES OUT OF "WHAT CHANGED" (VERIFY-COST-3), in a module of its own.
//
// WHY IT MOVED HERE, and it is not tidiness. It lived in `check-measured-stamps.mjs`, and that
// guard's own test imported it from there — which meant the TEST FILE COULD ONLY RUN WHILE THE GUARD
// PASSED. The guard is a script: importing it executes its whole body, so the moment it legitimately
// went red on the real tree it took its own test suite down with it, and `verify` reported two
// failures where there was one finding. An instrument whose tests stop running exactly when it has
// something to say is the failure class this repository has spent a month closing.
//
// One home, imported by both ends, executed by neither.
//
// `:(exclude,glob)` rather than `:(exclude)`: with the `glob` magic `**` means what it reads as on
// every git version instead of depending on the default pathspec dialect.
//
// WHY THE EXCLUSION EXISTS AT ALL, kept with the value it governs. A measurement script imports the
// code it measures; it does not import that code's TESTS. So a `*.test.*` file cannot move a number
// a stamp protects — but it lives inside the same `depends=` directory, and the pre-commit formatter
// reformats it. Not hypothetical: it turned the stamp guard red twice in two consecutive blocks,
// both times because prettier touched `startCeremony.test.js` in a commit that changed no measured
// behaviour, and both times the answer was a re-stamp that proved nothing.
//
// WHAT IT NO LONGER COVERS, stated because a rule that does not say so is trusted for more than it
// does: a measurement script that READS a test file — as a fixture, a roster or a golden list — is
// invisible to any check using this pathspec, and its stamp will read fresh after that file changes.
// No script does that today. If one ever does, its `depends=` must name the file directly and this
// exclusion must be revisited.
// ============================================================

export const TEST_FILE_EXCLUDE = ":(exclude,glob)**/*.test.*";
